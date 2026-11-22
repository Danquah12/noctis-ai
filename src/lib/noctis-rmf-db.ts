/**
 * Noctis Deterministic RMF Knowledge Database & Independent Verifier (Option B)
 *
 * Server-side only module backed by compiled official NIST / MITRE OSCAL JSON
 * (`src/data/rmf-deterministic-db.json`). Performs canonical ID normalization,
 * hybrid control/crosswalk retrieval, FIPS 199 + 10-control rule execution, and
 * independent post-generation citation/verdict verification.
 */

import rmfDbJson from "../data/rmf-deterministic-db.json" with { type: "json" };
import {
  evaluateFips199SecurityCategorization,
  type Fips199Result,
  type ImpactLevel,
} from "./noctis-rmf-engine.ts";
import {
  extractAndEvaluateRmfRulesFromText,
  evaluateDodImpactLevelOverlay,
  evaluateCmmcSprsScore,
  type RmfRuleEvaluationResult,
} from "./noctis-rmf-rules.ts";
import {
  computePolicyImpactDiff,
  evaluateAtoReadiness,
  resolveControlInheritance,
} from "./rmf-v2/governance.ts";
import {
  createExplanationBundle,
  type ExplanationBundle,
} from "./rmf-v2/graph-and-trace.ts";

export interface NormalizedRmfControl {
  id: string;
  parentId: string | null;
  family: string;
  familyTitle: string;
  title: string;
  statement: string;
  guidance: string;
  params: { id: string; label: string }[];
  withdrawn: boolean;
  withdrawnInto: string[];
  related: string[];
  baselines: ("LOW" | "MODERATE" | "HIGH" | "PRIVACY")[];
  objectives: string[];
  methods: { examine: string; interview: string; test: string };
  fedrampOdp?: { low: string; moderate: string; high: string; sla: string };
}

export interface Normalized800171Req {
  id: string;
  shortId: string;
  family: string;
  familyTitle: string;
  title: string;
  statement: string;
}

export interface NormalizedCsf2Item {
  id: string;
  level: "function" | "category" | "subcategory";
  title: string;
  statement: string;
}

export interface AttackTechniqueRef {
  id: string;
  name: string;
}

export interface RmfGroundingPacket {
  question: string;
  targetBaseline: string;
  manifest: {
    nistVersion: string;
    dbSha256: string;
    counts: Record<string, number>;
  };
  rmfStepsReferenced: { step: number; title: string; pub: string; deliverables: string[]; summary: string }[];
  controls: NormalizedRmfControl[];
  cuiRequirements: Normalized800171Req[];
  csfItems: NormalizedCsf2Item[];
  attackByControl: Record<string, AttackTechniqueRef[]>;
  relatedAttackHints: Record<string, { viaControl: string; id: string; name: string }[]>;
  attackReverseHits: { techniqueId: string; name: string; controls: string[] }[];
  ruleEvaluations: RmfRuleEvaluationResult[];
  fips199: Fips199Result | null;
  explanationBundle: ExplanationBundle | null;
  markdownContext: string;
}

export interface RmfVerificationReport {
  passed: boolean;
  violations: string[];
  verifiedControls: string[];
  withdrawnNotices: string[];
  invalidIds: string[];
}

interface RawRmfDb {
  manifest: {
    schemaVersion: string;
    nistVersion: string;
    generatedAt: string;
    dbSha256: string;
    counts: Record<string, number>;
    sources: { id: string; title: string; url: string; sha256: string; bytes: number }[];
  };
  rmfSteps: { step: number; code: string; title: string; pub: string; roles: string[]; deliverables: string[]; summary: string }[];
  fips199Types: { code: string; name: string; c: string; i: string; a: string; notes: string }[];
  fedrampOdps: Record<string, { low: string; moderate: string; high: string; sla: string }>;
  controls: Record<string, NormalizedRmfControl>;
  cui800171: Record<string, Normalized800171Req>;
  cuiAliasMap: Record<string, string>;
  csf2: Record<string, NormalizedCsf2Item>;
  attackByControl: Record<string, AttackTechniqueRef[]>;
  controlsByAttack: Record<string, { name: string; controls: string[] }>;
}

const DB = rmfDbJson as unknown as RawRmfDb;

const NIST_FAMILIES = new Set([
  "AC", "AT", "AU", "CA", "CM", "CP", "IA", "IR", "MA", "MP",
  "PE", "PL", "PM", "PS", "PT", "RA", "SA", "SC", "SI", "SR",
]);

const CONTROL_FAMILY_KEYWORDS: Record<string, string[]> = {
  AC: ["account", "termination", "terminated", "disable", "privileged", "rbac", "access", "mfa", "session", "lock", "ssh"],
  AU: ["audit", "log", "logging", "siem", "review", "retention", "cloudtrail", "auditd", "record"],
  CA: ["assessment", "3pao", "ato", "conmon", "continuous monitoring", "poa&m", "poam", "penetration", "authorization"],
  CM: ["configuration", "baseline", "stig", "cis", "drift", "change", "firewall", "security group", "inventory", "terraform"],
  IA: ["identity", "authentication", "mfa", "fido2", "piv", "cac", "password", "ssh key", "authenticator"],
  RA: ["risk", "vulnerability", "scan", "scanner", "nessus", "cve", "kev", "remediation", "sla"],
  SI: ["flaw", "patch", "malware", "integrity", "intrusion", "monitoring", "alert"],
  SC: ["encryption", "fips", "tls", "mtls", "boundary", "segmentation", "network"],
  CP: ["contingency", "backup", "disaster recovery", "failover", "rpo", "rto"],
  IR: ["incident", "breach", "containment", "handling", "response"],
};

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "what", "when", "where", "how", "which",
  "are", "was", "were", "have", "has", "does", "should", "must", "need", "nist", "rmf", "control",
  "controls", "fedramp", "policy", "system", "our", "their", "your", "give", "approved", "requires",
]);

export function normalize80053Id(raw: string): string | null {
  const s = (raw || "").trim().replace(/\s+/g, "");
  const paren = s.match(/^([a-z]{2})-?0*(\d{1,2})\(0*(\d{1,2})\)$/i);
  if (paren && NIST_FAMILIES.has(paren[1]!.toUpperCase())) {
    return `${paren[1]!.toUpperCase()}-${Number(paren[2])}(${Number(paren[3])})`;
  }
  const dot = s.match(/^([a-z]{2})-?0*(\d{1,2})\.0*(\d{1,2})$/i);
  if (dot && NIST_FAMILIES.has(dot[1]!.toUpperCase())) {
    return `${dot[1]!.toUpperCase()}-${Number(dot[2])}(${Number(dot[3])})`;
  }
  const base = s.match(/^([a-z]{2})-?0*(\d{1,2})$/i);
  if (base && NIST_FAMILIES.has(base[1]!.toUpperCase())) {
    return `${base[1]!.toUpperCase()}-${Number(base[2])}`;
  }
  return null;
}

export function normalize800171Id(raw: string): string | null {
  const s = (raw || "").trim().replace(/^SP_800_171_/i, "");
  const m = s.match(/^0*(\d{1,2})\.0*(\d{1,2})\.0*(\d{1,2})$/);
  if (!m) return null;
  const canon = `${String(Number(m[1])).padStart(2, "0")}.${String(Number(m[2])).padStart(2, "0")}.${String(Number(m[3])).padStart(2, "0")}`;
  return DB.cui800171[canon] ? canon : null;
}

export function getRmfDbManifest() {
  return DB.manifest;
}

export function listBaselineControls(baseline: "LOW" | "MODERATE" | "HIGH" | "PRIVACY"): string[] {
  return Object.values(DB.controls)
    .filter((c) => !c.withdrawn && Array.isArray(c.baselines) && c.baselines.includes(baseline))
    .map((c) => c.id);
}

export function lookupRmfControl(id: string): NormalizedRmfControl | null {
  const norm = normalize80053Id(id);
  return norm ? DB.controls[norm] ?? null : null;
}

export function isValid80053ControlId(id: string): boolean {
  const norm = normalize80053Id(id);
  return Boolean(norm && DB.controls[norm]);
}

export function lookup800171Requirement(id: string): Normalized800171Req | null {
  const norm = normalize800171Id(id);
  if (norm && DB.cui800171[norm]) return DB.cui800171[norm]!;
  const aliased = DB.cuiAliasMap[id.trim()];
  return aliased ? DB.cui800171[aliased] ?? null : null;
}

export function lookupCsf2Item(id: string): NormalizedCsf2Item | null {
  return DB.csf2[id.trim().toUpperCase()] ?? null;
}

export function lookupAttackControls(techniqueId: string): { id: string; name: string; controls: string[] } | null {
  const tid = techniqueId.trim().toUpperCase();
  const hit = DB.controlsByAttack[tid];
  return hit ? { id: tid, ...hit } : null;
}

function extract80053IdsFromText(text: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  // Match canonical forms like AC-2, AC-02(03), IA-2(6), even at end of a sentence (AC-2.), while ignoring objective labels like AC-02a.[01]
  const re = /\b(AC|AT|AU|CA|CM|CP|IA|IR|MA|MP|PE|PL|PM|PS|PT|RA|SA|SC|SI|SR)-0*(\d{1,2})(?:\(\s*0*(\d{1,2})\s*\))?(?![A-Za-z0-9]|\.\d)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const id = `${m[1]!.toUpperCase()}-${Number(m[2])}${m[3] ? `(${Number(m[3])})` : ""}`;
    if (!seen.has(id)) {
      seen.add(id);
      found.push(id);
    }
  }
  return found;
}

function parseFips199FromQuestion(question: string): Fips199Result | null {
  const q = (question || "").trim();
  if (!/\b(?:fips\s*199|high[- ]water\s*mark|security\s+categorization|categoriz\w*)\b/i.test(q) &&
      !(/\bconfidentiality\b/i.test(q) && /\bintegrity\b/i.test(q))) {
    return null;
  }
  const cMatch = q.match(/\bconfidentiality\s*(?:impact|=|:|\bis\b)?\s*(low|moderate|high)\b/i);
  const iMatch = q.match(/\bintegrity\s*(?:impact|=|:|\bis\b)?\s*(low|moderate|high)\b/i);
  const aMatch = q.match(/\bavailability\s*(?:impact|=|:|\bis\b)?\s*(low|moderate|high)\b/i);
  const hasSensitiveType = /\b(itar|cui|phi|hipaa)\b/i.test(q);
  if (!cMatch && !iMatch && !aMatch && !hasSensitiveType) return null;

  const toImpact = (v?: string): ImpactLevel => {
    const low = (v || "").toLowerCase();
    if (low === "high") return "HIGH";
    if (low === "moderate") return "MODERATE";
    return "LOW";
  };

  const infoTypes: string[] = [];
  if (/\bitar\b/i.test(q)) infoTypes.push("ITAR_TECHNICAL_DATA");
  if (/\bcui\b/i.test(q)) infoTypes.push("CUI_SPECIFIED");
  if (/\b(?:phi|hipaa)\b/i.test(q)) infoTypes.push("PHI");

  return evaluateFips199SecurityCategorization({
    systemName: "Target System",
    confidentialityImpact: toImpact(cMatch?.[1]),
    integrityImpact: toImpact(iMatch?.[1]),
    availabilityImpact: toImpact(aMatch?.[1]),
    informationTypes: infoTypes,
    isNationalSecuritySystem: /\b(nss|cnssi\s*1253|itar|classified)\b/i.test(q),
  });
}

function searchRelevantControls(question: string, alreadyIncluded: Set<string>, limit: number): NormalizedRmfControl[] {
  const qLow = question.toLowerCase();
  const tokens = qLow
    .split(/[^a-z0-9.-]+/)
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t));
  if (tokens.length === 0) return [];

  const hintedFamilies = new Set<string>();
  for (const [fam, kws] of Object.entries(CONTROL_FAMILY_KEYWORDS)) {
    if (kws.some((kw) => qLow.includes(kw))) hintedFamilies.add(fam);
  }

  const scored: { ctrl: NormalizedRmfControl; score: number }[] = [];
  for (const ctrl of Object.values(DB.controls)) {
    if (alreadyIncluded.has(ctrl.id) || ctrl.withdrawn) continue;
    let score = 0;
    const titleLow = ctrl.title.toLowerCase();
    const smtLow = ctrl.statement.toLowerCase();
    if (!ctrl.parentId) score += 1.5;
    if (hintedFamilies.has(ctrl.family)) score += 2;
    if (ctrl.fedrampOdp) score += 1.5;

    for (const tok of tokens) {
      if (titleLow.includes(tok)) score += 4;
      else if (smtLow.includes(tok)) score += 1.5;
      else if (ctrl.guidance.toLowerCase().includes(tok)) score += 0.8;
    }
    if (score >= 4.5) scored.push({ ctrl, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.ctrl);
}

function searchCsf2ForControls(question: string, controls: NormalizedRmfControl[]): NormalizedCsf2Item[] {
  const qLow = question.toLowerCase();
  const matches: NormalizedCsf2Item[] = [];
  const seen = new Set<string>();

  // Explicit CSF 2.0 IDs mentioned in question
  for (const m of question.match(/\b(?:GV|ID|PR|DE|RS|RC)(?:\.[A-Z]{2}(?:-\d{2})?)?\b/g) || []) {
    const item = DB.csf2[m.toUpperCase()];
    if (item && !seen.has(item.id)) {
      seen.add(item.id);
      matches.push(item);
    }
  }

  // Infer relevant CSF 2.0 categories from active NIST 800-53 families
  const familyToCsf: Record<string, string[]> = {
    AC: ["PR.AA", "GV.OC"],
    IA: ["PR.AA"],
    AU: ["DE.CM", "DE.AE", "RS.AN"],
    CA: ["GV.OV", "DE.CM", "ID.IM"],
    CM: ["PR.PS", "DE.CM"],
    RA: ["ID.RA", "DE.CM"],
    SI: ["PR.PS", "DE.CM", "RS.MI"],
    SC: ["PR.DS", "PR.IR"],
    CP: ["RC.RP", "PR.IR"],
    IR: ["RS.MA", "RS.AN", "RS.MI"],
    PM: ["GV.RM", "GV.RR", "GV.SC"],
  };

  for (const c of controls) {
    for (const csfCat of familyToCsf[c.family] || []) {
      const catItem = DB.csf2[csfCat];
      if (catItem && !seen.has(catItem.id)) {
        seen.add(catItem.id);
        matches.push(catItem);
      }
    }
  }

  // Also keyword-match subcategories if explicitly asking about CSF
  if (/\bcsf\b|\bcybersecurity\s+framework\b|\bau-6\b/i.test(qLow)) {
    const kwList = qLow
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));
    for (const item of Object.values(DB.csf2)) {
      if (seen.has(item.id) || item.level !== "subcategory") continue;
      const text = `${item.title} ${item.statement}`.toLowerCase();
      const hits = kwList.filter((w) => text.includes(w)).length;
      if (hits >= 2 || (/\bau-6\b/i.test(qLow) && /^DE\.(?:AE|CM)-0[126]/i.test(item.id))) {
        seen.add(item.id);
        matches.push(item);
        if (matches.length >= 8) break;
      }
    }
  }

  return matches.slice(0, 8);
}

export function buildRmfGroundingPacket(question: string): RmfGroundingPacket {
  const q = (question || "").trim();
  const targetBaseline = /\bfedramp\s+moderate\b/i.test(q)
    ? "FedRAMP Rev. 5 Moderate Baseline"
    : /\bfedramp\s+low\b/i.test(q)
    ? "FedRAMP Rev. 5 Low Baseline"
    : /\bprivacy\b/i.test(q)
    ? "NIST SP 800-53B Privacy + FedRAMP High"
    : /\b800-171\b|\bcui\b/i.test(q)
    ? "NIST SP 800-171 Rev. 3 (CUI) & Federal RMF"
    : "Federal RMF (NIST SP 800-37 Rev. 2) + FedRAMP Rev. 5 High Baseline";

  const explicit80053 = extract80053IdsFromText(q);
  const controls: NormalizedRmfControl[] = [];
  const includedIds = new Set<string>();

  for (const cid of explicit80053) {
    const ctrl = DB.controls[cid];
    if (!ctrl || includedIds.has(ctrl.id)) continue;
    includedIds.add(ctrl.id);
    controls.push(ctrl);

    // If explicitly requested control is withdrawn, also pull its replacement controls!
    if (ctrl.withdrawn && ctrl.withdrawnInto.length > 0) {
      for (const replId of ctrl.withdrawnInto) {
        const repl = DB.controls[replId];
        if (repl && !includedIds.has(repl.id)) {
          includedIds.add(repl.id);
          controls.push(repl);
        }
      }
    }
  }

  // Add top keyword-matched controls up to 8 total
  const needed = Math.max(0, 8 - controls.length);
  if (needed > 0) {
    for (const hit of searchRelevantControls(q, includedIds, needed)) {
      includedIds.add(hit.id);
      controls.push(hit);
    }
  }

  // SP 800-171 lookups
  const cuiRequirements: Normalized800171Req[] = [];
  const cuiSeen = new Set<string>();
  for (const m of q.match(/\b(?:0?3)\.\d{1,2}\.\d{1,2}\b/g) || []) {
    const req = lookup800171Requirement(m);
    if (req && !cuiSeen.has(req.id)) {
      cuiSeen.add(req.id);
      cuiRequirements.push(req);
    }
  }

  // MITRE ATT&CK v16.1 crosswalks
  const attackByControl: Record<string, AttackTechniqueRef[]> = {};
  const relatedAttackHints: Record<string, { viaControl: string; id: string; name: string }[]> = {};
  for (const ctrl of controls) {
    const direct = DB.attackByControl[ctrl.id];
    if (direct && direct.length > 0) {
      attackByControl[ctrl.id] = direct;
    } else if (ctrl.related.length > 0) {
      const hints: { viaControl: string; id: string; name: string }[] = [];
      for (const relId of ctrl.related) {
        const relAttack = DB.attackByControl[relId] || [];
        for (const tech of relAttack.slice(0, 2)) {
          if (!hints.some((h) => h.id === tech.id)) {
            hints.push({ viaControl: relId, id: tech.id, name: tech.name });
          }
          if (hints.length >= 5) break;
        }
        if (hints.length >= 5) break;
      }
      if (hints.length > 0) relatedAttackHints[ctrl.id] = hints;
    }
  }

  const attackReverseHits: { techniqueId: string; name: string; controls: string[] }[] = [];
  for (const tMatch of q.match(/\bT\d{4}(?:\.\d{3})?\b/gi) || []) {
    const hit = lookupAttackControls(tMatch);
    if (hit) attackReverseHits.push({ techniqueId: hit.id, name: hit.name, controls: hit.controls });
  }

  // Match relevant RMF lifecycle steps (0-6)
  const rmfStepsReferenced = DB.rmfSteps
    .filter((s) => {
      if (/\b(?:prepare|categorize|select|implement|assess|authorize|monitor|800-37|lifecycle|steps?)\b/i.test(q)) {
        if (new RegExp(`\\b(?:step\\s*${s.step}|${s.code})\\b`, "i").test(q)) return true;
        if (/\b(?:all\s+7|seven\s+steps|lifecycle|rmf\s+process)\b/i.test(q)) return true;
      }
      return false;
    })
    .map((s) => ({
      step: s.step,
      title: s.title,
      pub: s.pub,
      deliverables: s.deliverables,
      summary: s.summary,
    }));

  const csfItems = searchCsf2ForControls(q, controls);
  const fips199 = parseFips199FromQuestion(q);
  const ruleEvaluations = extractAndEvaluateRmfRulesFromText(q);

  // Format immutable Knowledge Packet
  const lines: string[] = [];
  lines.push(`### Authoritative RMF Knowledge Packet (NIST SP 800-53 Rev. ${DB.manifest.nistVersion} · Option B Federal + FedRAMP + ConMon)`);
  lines.push(`- **Target Scope:** ${targetBaseline}`);
  lines.push(`- **Catalog Totals:** ${DB.manifest.counts.totalControlsAndEnhancements} SP 800-53 controls/enhancements, ${DB.manifest.counts.cui800171Requirements} SP 800-171 Rev. 3 requirements, ${DB.manifest.counts.csf2Items} CSF 2.0 items, ${DB.manifest.counts.mitreAttackEdges} MITRE ATT&CK v16.1 edges.`);
  lines.push(`- **DB Provenance SHA-256:** \`${DB.manifest.dbSha256}\`\n`);

  if (ruleEvaluations.length > 0) {
    lines.push("### 1. IMMUTABLE DETERMINISTIC RULE ENGINE VERDICTS (DO NOT CONTRADICT)");
    for (const r of ruleEvaluations) {
      lines.push(`- **Rule ${r.ruleId} (v${r.ruleVersion}) [${r.controlId} — ${r.controlTitle}]: VERDICT = \`${r.verdict}\`**`);
      lines.push(`  - Summary: ${r.summary}`);
      lines.push(`  - Threshold: ${r.threshold}`);
      lines.push(`  - Variance: ${r.variance}`);
      lines.push(`  - Audit Hash: \`${r.auditHash}\``);
      if (r.missingEvidence.length > 0) {
        lines.push(`  - Missing Evidence Required: ${r.missingEvidence.join("; ")}`);
      }
      if (r.draftFinding) {
        lines.push(`  - Draft Finding [${r.draftFinding.severity}, ${r.draftFinding.objectiveId}]: ${r.draftFinding.title} — ${r.draftFinding.impactSummary}`);
      }
      if (r.draftPoam) {
        lines.push(`  - Draft POA&M (${r.draftPoam.poamId}, SLA: ${r.draftPoam.slaDays} days): ${r.draftPoam.weaknessName}. Plan: ${r.draftPoam.remediationPlan}. Required Proof: ${r.draftPoam.requiredTechnicalProof}`);
      }
    }
    lines.push("");
  }

  if (fips199) {
    lines.push("### 2. IMMUTABLE FIPS 199 / SP 800-60 HIGH-WATER MARK CALCULATION");
    lines.push(`- **Categorization Expression:** \`${fips199.securityCategorizationExpression}\``);
    lines.push(`- **Computed High-Water Mark Overall Impact:** **${fips199.overallImpact}** (Standard: ${fips199.governingStandard})`);
    if (fips199.mandatoryOverlays.length > 0) {
      lines.push(`- **Mandatory Overlays:** ${fips199.mandatoryOverlays.join(", ")}`);
    }
    if (fips199.safetyVetoes.length > 0) {
      lines.push(`- **Safety / Policy Vetoes:** ${fips199.safetyVetoes.join(" | ")}`);
    }
    lines.push("");
  }

  if (controls.length > 0) {
    lines.push("### 3. AUTHORITATIVE NIST SP 800-53 REV. 5.2.0 + SP 800-53A + FEDRAMP ODPs");
    for (const c of controls) {
      if (c.withdrawn) {
        lines.push(
          `- **${c.id} — ${c.title} [STATUS: WITHDRAWN]** → Incorporated/Moved into: ${c.withdrawnInto.length > 0 ? c.withdrawnInto.join(", ") : "None specified"}. *(Never cite ${c.id} as an active Rev. 5 requirement; redirect to replacement controls below.)*`,
        );
        continue;
      }
      lines.push(`- **${c.id} — ${c.title}** (Family: ${c.familyTitle}; Baselines: ${c.baselines.length > 0 ? c.baselines.join(", ") : "Optional / Tailored Enhancement"})`);
      if (c.statement) lines.push(`  - Requirement: ${c.statement}`);
      if (c.guidance) lines.push(`  - Guidance: ${c.guidance}`);
      if (c.fedrampOdp) {
        lines.push(`  - FedRAMP High ODP: ${c.fedrampOdp.high} (POA&M SLA: ${c.fedrampOdp.sla})`);
      }
      if (c.objectives.length > 0) {
        lines.push(`  - SP 800-53A Determination Objectives: ${c.objectives.join(" | ")}`);
      }
      if (c.methods.examine || c.methods.interview || c.methods.test) {
        lines.push(`  - SP 800-53A Methods: EXAMINE=[${c.methods.examine || "Policy & configuration artifacts"}] | INTERVIEW=[${c.methods.interview || "System owner & operators"}] | TEST=[${c.methods.test || "Automated & manual verification"}]`);
      }
      if (attackByControl[c.id]?.length) {
        lines.push(`  - Direct MITRE ATT&CK v16.1 Mitigations: ${attackByControl[c.id]!.map((t) => `${t.id} (${t.name})`).join(", ")}`);
      } else if (relatedAttackHints[c.id]?.length) {
        lines.push(`  - ATT&CK Note: No direct CTID v16.1 mitigation edge on ${c.id}; related controls (${[...new Set(relatedAttackHints[c.id]!.map((h) => h.viaControl))].join(", ")}) mitigate: ${relatedAttackHints[c.id]!.map((h) => `${h.viaControl} -> ${h.id} (${h.name})`).join(", ")}`);
      }
    }
    lines.push("");
  }

  if (csfItems.length > 0) {
    lines.push("### 4. NIST CSF 2.0 ALIGNMENT (FROM OFFICIAL CSF 2.0 CATALOG)");
    for (const item of csfItems) {
      lines.push(`- **${item.id} (${item.level}) — ${item.title}:** ${item.statement}`);
    }
    lines.push("");
  }

  if (cuiRequirements.length > 0) {
    lines.push("### 5. NIST SP 800-171 REV. 3 CUI REQUIREMENTS");
    for (const r of cuiRequirements) {
      lines.push(`- **${r.id} (alias ${r.shortId}) — ${r.title}:** ${r.statement}`);
    }
    lines.push("");
  }

  if (attackReverseHits.length > 0) {
    lines.push("### 6. MITRE ATT&CK TECHNIQUE -> NIST SP 800-53 REV. 5 REVERSE MAPPINGS");
    for (const hit of attackReverseHits) {
      lines.push(`- **${hit.techniqueId} (${hit.name}):** Mitigated by ${hit.controls.join(", ")}`);
    }
    lines.push("");
  }

  if (rmfStepsReferenced.length > 0) {
    lines.push("### 7. NIST SP 800-37 REV. 2 LIFECYCLE STEPS");
    for (const st of rmfStepsReferenced) {
      lines.push(`- **${st.title}** (${st.pub}): ${st.summary} Deliverables: ${st.deliverables.join(", ")}.`);
    }
    lines.push("");
  }

  // Optional Unified DoD / CNSSI 1253 / SCCA / CMMC Overlay Reference (Option D bridge)
  if (/\b(?:dod|il[2456]|scca|bcap|vdss|vdms|tccm|cnssi\s*1253|cmmc|sprs|stig|cato|dodi\s*8510)\b/i.test(q)) {
    lines.push("### 8. UNIFIED DEFENSE & CMMC OVERLAY CONTEXT (DoD CC SRG / CNSSI 1253 / SCCA / CMMC)");
    lines.push("- **DoD Impact Levels:** IL2 (public/non-CUI), IL4 (CUI / Moderate+ with US Persons/CONUS controls), IL5 (mission-critical CUI / NSS with dedicated isolation, vetted U.S. Persons, CONUS-only, CNSSI 1253), IL6 (Classified SECRET).");
    lines.push("- **SCCA Boundary Architecture:** BCAP (DISN/NIPRNet gateway), VDSS (TLS break-and-inspect / NGFW/WAF DMZ), VDMS (PAW jumpboxes, ACAS/HBSS, CSSP telemetry), TCCM (PKI/FIPS 140-3 Level 3 HSM KMS), VDC (no direct public internet egress).");
    lines.push("- **DISA STIG & cATO Gates:** Zero unwaived CAT I findings allowed for ATO; DoD cATO requires DevSecOps pipeline verification, continuous monitoring, and CSSP SLA integration.");
    lines.push("- **CMMC 2.0 Levels 1–3:** Rooted in NIST SP 800-171 Rev. 2/Rev. 3 (CUI protection) and SP 800-172 enhanced protections for APT resistance.");

    const ilMatch = q.match(/\b(IL2|IL4|IL5|IL6)\b/i);
    if (ilMatch) {
      const ilResult = evaluateDodImpactLevelOverlay({
        impactLevel: ilMatch[1]!.toUpperCase() as "IL2" | "IL4" | "IL5" | "IL6",
        hostingEnvironment: /\bcommercial\b/i.test(q) ? "Commercial" : ilMatch[1]!.toUpperCase() === "IL6" ? "SIPRNet_Classified" : "GovCloud_Dedicated",
        sccaCompliant: /\bno\s+scca|without\s+scca\b/i.test(q) ? false : true,
        usCitizenAdminsOnly: /\bforeign|non[- ]us\b/i.test(q) ? false : true,
        cnssi1253Overlay: true,
      });
      lines.push(`- **Deterministic ${ilResult.impactLevel} Overlay Verdict:** \`${ilResult.verdict}\` · Required Overlays: ${ilResult.requiredOverlays.join(", ")}${ilResult.violations.length > 0 ? ` · Violations: ${ilResult.violations.join(" | ")}` : ""}`);
    }

    if (/\bsprs\b|\bcmmc\b/i.test(q)) {
      const failedMatch = q.match(/(\d+)\s+(?:unmet|failed|open)/i);
      const fivePtMatch = q.match(/(\d+)\s+(?:5[- ]?pt|five[- ]?point)/i);
      const failedCount = failedMatch ? Math.min(110, Number(failedMatch[1])) : fivePtMatch ? Number(fivePtMatch[1]) : 0;
      const fiveCount = fivePtMatch ? Math.min(failedCount, Number(fivePtMatch[1])) : 0;
      const syntheticFails = Array.from({ length: failedCount }, (_, i) => ({
        controlId: `REQ-${i + 1}`,
        weight: (i < fiveCount ? 5 : 3) as 1 | 3 | 5,
        onPoam: true,
      }));
      const sprs = evaluateCmmcSprsScore({ failedControls: syntheticFails });
      lines.push(`- **Deterministic CMMC SPRS Calculation:** Score = **${sprs.sprsScore}** / 110 (${sprs.metCount}/110 Met, ${sprs.percentImplemented}%) · Conditional Eligible: **${sprs.conditionalCertificationEligible}** · POA&M Closeout Window: ${sprs.poamCloseoutDeadlineDays} days${sprs.ineligibilityReasons.length > 0 ? ` · Blockers: ${sprs.ineligibilityReasons.join(" | ")}` : ""}`);
    }
    lines.push("");
  }

  // RMF-003 Control Inheritance & CRM Context
  if (/\b(?:inherit\w*|shared\s+responsibility|\bcrm\b|common\s+controls?|provider\s+boundary)\b/i.test(q)) {
    const bArg = /\bmoderate\b/i.test(q) ? "MODERATE" : /\blow\b/i.test(q) ? "LOW" : "HIGH";
    const inh = resolveControlInheritance({
      systemId: "active-chat-system",
      baseline: bArg,
      providerName: "CSP Infrastructure Boundary",
      inheritedControlIds: ["PE-1", "PE-2", "PE-3", "PE-6", "PE-8", "MA-2"],
      hybridControlIds: ["IA-2", "AU-6", "CM-2", "SC-7"],
    });
    lines.push("### 9. RMF-003 CONTROL INHERITANCE & CUSTOMER RESPONSIBILITY MATRIX (CRM)");
    lines.push(`- **Baseline:** ${inh.baseline} (${inh.totalBaselineControls} controls)`);
    lines.push(`- **Partitioning Example:** Inherited = ${inh.inheritedCount} | Hybrid = ${inh.hybridCount} | Customer-Specific = ${inh.systemSpecificCount}`);
    lines.push(`- **Invariant (\`cspPaGrantsSystemAto: ${inh.cspPaGrantsSystemAto}\`):** ${inh.note}\n`);
  }

  // AI-023 Policy Impact & Baseline Diff Context
  if (/\b(?:low\s+to\s+(?:mod|moderate|high)|(?:mod|moderate)\s+to\s+high|tailoring\s+diff|policy\s+impact|baseline\s+diff|compare\s+baselines?)\b/i.test(q)) {
    const fromB = /\blow\b/i.test(q) ? "LOW" : "MODERATE";
    const toB = /\bmod\b|\bmoderate\b/i.test(q) && !/\bhigh\b/i.test(q) ? "MODERATE" : "HIGH";
    const diff = computePolicyImpactDiff(fromB, toB);
    lines.push("### 10. AI-023 POLICY IMPACT & BASELINE DIFF (NIST SP 800-53B)");
    lines.push(`- **Diff:** ${diff.fromBaseline} (${diff.fromCount} controls) -> ${diff.toBaseline} (${diff.toCount} controls)`);
    lines.push(`- **Delta:** +${diff.addedCount} added, -${diff.removedCount} removed, ${diff.unchangedCount} unchanged`);
    lines.push(`- **Sample Added Controls:** ${diff.addedControlsSample.slice(0, 12).join(", ")}\n`);
  }

  // RMF-007 ATO Readiness Gate Reminder
  if (/\b(?:ato\s+readiness|ready\s+for\s+ato|authorization\s+package|authorization\s+readiness)\b/i.test(q)) {
    const readiness = evaluateAtoReadiness({
      system_id: "chat-system",
      package_id: "chat-pkg",
      missingPackageArtifacts: [],
    });
    lines.push("### 11. RMF-007 ATO READINESS INVARIANT");
    lines.push(`- \`authorization_decision\`: **${readiness.authorization_decision}** | \`human_authorization_required\`: **${readiness.human_authorization_required}**`);
    lines.push(`- ${readiness.disclaimer}\n`);
  }

  // AI-025 Reproducible Explanation Trace Bundle whenever deterministic rules evaluated
  let explanationBundle: ExplanationBundle | null = null;
  if (ruleEvaluations.length > 0) {
    const primaryRule = ruleEvaluations[0]!;
    explanationBundle = createExplanationBundle({
      tenantId: "chat-session",
      evaluationRef: primaryRule.controlId,
      nistVersion: DB.manifest.nistVersion,
      dbSha256: DB.manifest.dbSha256,
      ruleId: primaryRule.ruleId,
      ruleVersion: primaryRule.ruleVersion,
      evidenceSha256: primaryRule.auditHash,
      observedFacts: primaryRule.observedFacts,
      deterministicClassifications: ruleEvaluations.map((r) => `${r.controlId} (${r.ruleId}): ${r.verdict} — ${r.variance}`),
      analyticalEstimates: [],
      verdict: primaryRule.verdict,
    });
    lines.push("### 12. AI-025 EXPLAINABLE DECISION TRACE (SEPARATE FACTS / DETERMINISTIC VERDICTS / ESTIMATES)");
    lines.push(`- **Bundle ID:** \`${explanationBundle.bundleId}\` | **Canonical Trace SHA-256:** \`${explanationBundle.canonicalTraceHash}\``);
    lines.push(`- **Observed Facts:** ${JSON.stringify(explanationBundle.observedFacts)}`);
    lines.push(`- **Deterministic Classifications:** ${explanationBundle.deterministicClassifications.join(" ; ")}`);
    lines.push("- **Analytical Estimates:** Any forward-looking risk or remediation effort commentary must explicitly state assumptions and uncertainty rather than claiming verified fact.\n");
  }

  return {
    question: q,
    targetBaseline,
    manifest: {
      nistVersion: DB.manifest.nistVersion,
      dbSha256: DB.manifest.dbSha256,
      counts: DB.manifest.counts,
    },
    rmfStepsReferenced,
    controls,
    cuiRequirements,
    csfItems,
    attackByControl,
    relatedAttackHints,
    attackReverseHits,
    ruleEvaluations,
    fips199,
    explanationBundle,
    markdownContext: lines.join("\n"),
  };
}

// ----------------------------------------------------------------------------
// Stage 3: Independent Deterministic Post-Generation Verifier
// ----------------------------------------------------------------------------
export function verifyRmfResponseAgainstDb(
  question: string,
  draftBody: string,
  packet: RmfGroundingPacket,
): RmfVerificationReport {
  const violations: string[] = [];
  const verifiedControls: string[] = [];
  const withdrawnNotices: string[] = [];
  const invalidIds: string[] = [];

  const citedIds = extract80053IdsFromText(draftBody);
  const bodyLower = draftBody.toLowerCase();

  for (const cid of citedIds) {
    const ctrl = DB.controls[cid];
    if (!ctrl) {
      invalidIds.push(cid);
      violations.push(`FABRICATED_CONTROL_ID: Cited control ID "${cid}" does not exist in NIST SP 800-53 Rev. ${DB.manifest.nistVersion}. Remove it or replace with a valid Rev. 5 control.`);
      continue;
    }
    verifiedControls.push(cid);

    if (ctrl.withdrawn) {
      const mentionsWithdrawn = /\b(?:withdrawn|incorporated|moved\s+into|superseded|retired)\b/i.test(draftBody);
      const mentionsReplacement =
        ctrl.withdrawnInto.length === 0 ||
        ctrl.withdrawnInto.some((repl) => citedIds.includes(repl) || draftBody.toUpperCase().includes(repl));
      if (!mentionsWithdrawn || !mentionsReplacement) {
        violations.push(
          `UNFLAGGED_WITHDRAWN_CONTROL: Cited withdrawn control "${cid}". Must explicitly state that ${cid} is WITHDRAWN in Rev. 5 and cite replacement(s): ${ctrl.withdrawnInto.join(", ") || "N/A"}.`,
        );
      } else {
        withdrawnNotices.push(`${cid} -> ${ctrl.withdrawnInto.join(", ")}`);
      }
    }
  }

  // Enforce deterministic rule verdict fidelity
  for (const r of packet.ruleEvaluations) {
    if (r.verdict === "FAIL") {
      const falselyPassed = /\b(?:verdict|rule\s+result|compliance\s+status|determination)\s*[:\-*]?\s*\*{0,2}\s*(?:PASS|PASSED|COMPLIANT)\b/i.test(
        draftBody,
      );
      const acknowledgesFail = /\b(?:FAIL|FAILED|NON-COMPLIANT|VIOLATION|EXCEEDED|DEFICIENCY|BREACH)\b/i.test(draftBody);
      if (falselyPassed || !acknowledgesFail) {
        violations.push(
          `RULE_VERDICT_CONTRADICTION: Deterministic rule ${r.ruleId} [${r.controlId}] evaluated to FAIL (${r.summary}). Response must clearly state FAIL and must not report PASS/Compliant.`,
        );
      }
    } else if (r.verdict === "INSUFFICIENT_EVIDENCE") {
      const fabricatedPassOrFail = /\b(?:verdict|rule\s+result|determination)\s*[:\-*]?\s*\*{0,2}\s*(?:PASS|PASSED|COMPLIANT|FAIL|FAILED)\b/i.test(
        draftBody,
      );
      const notesInsufficient = /\b(?:INSUFFICIENT_EVIDENCE|insufficient\s+evidence|missing\s+evidence|cannot\s+verify|not\s+provided)\b/i.test(
        draftBody,
      );
      if (fabricatedPassOrFail || !notesInsufficient) {
        violations.push(
          `EVIDENCE_SUFFICIENCY_CONTRADICTION: Deterministic rule ${r.ruleId} [${r.controlId}] returned INSUFFICIENT_EVIDENCE. Response must explicitly report INSUFFICIENT_EVIDENCE and list missing artifacts.`,
        );
      }
    }
  }

  // Enforce FIPS 199 High-Water Mark fidelity
  if (packet.fips199) {
    const expected = packet.fips199.overallImpact;
    if (
      (expected === "HIGH" &&
        /\b(?:high[- ]water\s*mark|overall(?:\s+system)?\s+impact)\s*(?:is|=|:)?\s*\*{0,2}(?:LOW|MODERATE)\b/i.test(draftBody)) ||
      (expected === "HIGH" && !bodyLower.includes("high"))
    ) {
      violations.push(
        `FIPS_199_MATH_CONTRADICTION: Computed FIPS 199 High-Water Mark is ${expected} (${packet.fips199.securityCategorizationExpression}). Response contradicted or omitted the ${expected} overall impact.`,
      );
    }
  }

  // Enforce SP 800-53A Examine / Interview / Test completeness when requested
  if (/\b(?:800-53a|assessment\s+procedure|test\s+procedure|3pao|examine.*interview.*test)\b/i.test(question)) {
    const missingMethods: string[] = [];
    if (!/\bexamine\b/i.test(draftBody)) missingMethods.push("Examine");
    if (!/\binterview\b/i.test(draftBody)) missingMethods.push("Interview");
    if (!/\btest\b/i.test(draftBody)) missingMethods.push("Test");
    if (missingMethods.length > 0) {
      violations.push(
        `ASSESSMENT_PROCEDURE_INCOMPLETE: Prompt requested NIST SP 800-53A assessment procedures, but response omitted method(s): ${missingMethods.join(", ")}.`,
      );
    }
  }

  return {
    passed: violations.length === 0,
    violations,
    verifiedControls,
    withdrawnNotices,
    invalidIds,
  };
}
