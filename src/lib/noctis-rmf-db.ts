/**
 * Noctis Deterministic RMF Knowledge Database & Independent Verifier (Option B)
 *
 * Server-side only module backed by compiled official NIST / MITRE OSCAL JSON
 * (`src/data/rmf-deterministic-db.json`). Performs canonical ID normalization,
 * hybrid control/crosswalk retrieval, FIPS 199 + 10-control rule execution, and
 * independent post-generation citation/verdict verification.
 */

import rmfDbJson from "../data/rmf-deterministic-db.json" with { type: "json" };
import { sha256Sync } from "./universal-crypto.ts";
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
import {
  listRmfTasksByStep,
  lookupNistPublication,
  lookupRmfTask,
  lookupSp80060InfoType,
  NIST_SP_800_37_TASKS,
  NIST_SP_800_60_INFO_TYPES,
  NIST_SP_PUBLICATIONS,
  searchNistSpCatalog,
  type NistRmfTask,
  type NistSpPublication,
  type Sp80060InfoType,
} from "./noctis-nist-sp-catalog.ts";

export {
  listRmfTasksByStep,
  lookupNistPublication,
  lookupRmfTask,
  lookupSp80060InfoType,
  searchNistSpCatalog,
  type NistRmfTask,
  type NistSpPublication,
  type Sp80060InfoType,
};

export interface FedrampProfileMeta {
  id: string;
  title: string;
  version: string;
  published: string;
  lastModified?: string;
  oscalVersion: string;
  url: string;
  sha256: string;
  bytes: number;
  includedControlsCount: number;
  setParametersCount: number;
}

export interface FedrampControlBaselineData {
  params: { id: string; value: string }[];
  additionalRequirements: string[];
  additionalGuidance: string[];
}

export interface AuthorityPolicyRecord {
  id: string;
  title: string;
  authorityType: string;
  statutory: boolean;
  document: string;
  version: string;
  section: string;
  url: string;
  effectiveDate: string;
  scope: string;
  exceptions: string;
}

export interface AuthoritativeControlRecord {
  control_id: string;
  enhancement: string | null;
  baseline: string;
  baseline_version: string;
  requirement_text: string;
  organization_defined_parameters: { param_id: string; label: string; value: string }[];
  additional_fedramp_requirements: string[];
  additional_fedramp_guidance: string[];
  authority: {
    document: string;
    version: string;
    section: string;
    url: string;
    effective_date: string;
    scope: string;
    exceptions: string;
    sha256: string;
  };
  assessment_methods: ("EXAMINE" | "INTERVIEW" | "TEST")[];
  evidence_status: "NOT_VERIFIED" | "SCENARIO_STIPULATED" | "VERIFIED";
  determination: "PENDING" | "PASS" | "FAIL" | "INSUFFICIENT_EVIDENCE" | "NOT_APPLICABLE" | "MANUAL_REVIEW_REQUIRED";
}

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
    fedrampVersion?: string;
    fedrampPublished?: string;
    dbSha256: string;
    counts: Record<string, number>;
  };
  rmfStepsReferenced: { step: number; title: string; pub: string; deliverables: string[]; summary: string }[];
  rmfTasksReferenced: NistRmfTask[];
  nistPublicationsReferenced: NistSpPublication[];
  sp80060InfoTypesReferenced: Sp80060InfoType[];
  controls: NormalizedRmfControl[];
  authoritativeRecords: AuthoritativeControlRecord[];
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
    fedrampVersion?: string;
    fedrampPublished?: string;
    generatedAt: string;
    dbSha256: string;
    counts: Record<string, number>;
    sources: { id: string; title: string; url: string; sha256: string; bytes: number }[];
  };
  rmfSteps: { step: number; code: string; title: string; pub: string; roles: string[]; deliverables: string[]; summary: string }[];
  fips199Types: { code: string; name: string; c: string; i: string; a: string; notes: string }[];
  fedrampOdps: Record<string, { low: string; moderate: string; high: string; sla: string }>;
  fedrampProfiles?: { low: FedrampProfileMeta; moderate: FedrampProfileMeta; high: FedrampProfileMeta };
  fedrampControlRegistry?: Record<string, { low?: FedrampControlBaselineData; moderate?: FedrampControlBaselineData; high?: FedrampControlBaselineData }>;
  authorityPolicies?: Record<string, AuthorityPolicyRecord>;
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

export function getAuthorityPolicy(policyKey: string): AuthorityPolicyRecord | null {
  return DB.authorityPolicies?.[policyKey] ?? null;
}

export function getAuthoritativeControlRecord(
  controlId: string,
  baseline: "LOW" | "MODERATE" | "HIGH" = "HIGH",
  opts: {
    evidenceStatus?: AuthoritativeControlRecord["evidence_status"];
    determination?: AuthoritativeControlRecord["determination"];
  } = {},
): AuthoritativeControlRecord | null {
  const ctrl = lookupRmfControl(controlId);
  if (!ctrl) return null;

  const baseKey = baseline.toLowerCase() as "low" | "moderate" | "high";
  const profileMeta = DB.fedrampProfiles?.[baseKey];
  const frBaseline = DB.fedrampControlRegistry?.[ctrl.id]?.[baseKey];

  const paramLabelById = new Map<string, string>();
  for (const p of ctrl.params || []) {
    paramLabelById.set(p.id.toLowerCase(), p.label);
  }

  const odps: { param_id: string; label: string; value: string }[] = [];
  for (const p of frBaseline?.params || []) {
    odps.push({
      param_id: p.id,
      label: paramLabelById.get(p.id.toLowerCase()) || ctrl.title,
      value: p.value,
    });
  }

  const methods: ("EXAMINE" | "INTERVIEW" | "TEST")[] = [];
  if (ctrl.methods?.examine) methods.push("EXAMINE");
  if (ctrl.methods?.interview) methods.push("INTERVIEW");
  if (ctrl.methods?.test) methods.push("TEST");
  if (methods.length === 0) methods.push("EXAMINE", "INTERVIEW", "TEST");

  return {
    control_id: ctrl.parentId || ctrl.id,
    enhancement: ctrl.parentId ? ctrl.id : null,
    baseline: `FedRAMP Rev 5 ${baseline[0]}${baseline.slice(1).toLowerCase()}`,
    baseline_version: profileMeta?.version || DB.manifest.fedrampVersion || "fedramp2.1.0-oscal1.0.4",
    requirement_text: ctrl.statement,
    organization_defined_parameters: odps,
    additional_fedramp_requirements: frBaseline?.additionalRequirements || [],
    additional_fedramp_guidance: frBaseline?.additionalGuidance || [],
    authority: {
      document: profileMeta?.title || `FedRAMP Rev 5 ${baseline} Baseline (OSCAL Profile)`,
      version: profileMeta?.version || DB.manifest.fedrampVersion || "fedramp2.1.0-oscal1.0.4",
      section: `${ctrl.id} (${ctrl.title})${odps.length > 0 ? ` — Params: ${odps.map((o) => o.param_id).join(", ")}` : ""}`,
      url: profileMeta?.url || "https://www.fedramp.gov/baselines/",
      effective_date: (profileMeta?.published || DB.manifest.fedrampPublished || "2024-09-24").slice(0, 10),
      scope: `${ctrl.familyTitle} — Applicable to FedRAMP ${baseline} baseline authorizations; NIST SP 800-53 Rev. ${DB.manifest.nistVersion}.`,
      exceptions:
        frBaseline?.additionalGuidance?.[0] ||
        "Subject to Authorizing Official (Agency AO / JAB) tailoring, approved Deviation Requests, and applicable overlays (e.g., DoD CC SRG).",
      sha256: profileMeta?.sha256 || DB.manifest.dbSha256,
    },
    assessment_methods: methods,
    evidence_status: opts.evidenceStatus || "NOT_VERIFIED",
    determination: opts.determination || "PENDING",
  };
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

  const inferredFloor: ImpactLevel =
    /\b(?:fedramp\s+high|itar|classified|high[- ]impact)\b/i.test(q)
      ? "HIGH"
      : /\b(?:fedramp\s+moderate|phi|hipaa|cui)\b/i.test(q)
      ? "MODERATE"
      : "LOW";

  const toImpact = (v: string | undefined, fallback: ImpactLevel = "LOW"): ImpactLevel => {
    const low = (v || "").toLowerCase();
    if (low === "high") return "HIGH";
    if (low === "moderate") return "MODERATE";
    if (low === "low") return "LOW";
    return fallback;
  };

  const infoTypes: string[] = [];
  if (/\bitar\b/i.test(q)) infoTypes.push("ITAR_TECHNICAL_DATA");
  if (/\bcui\b/i.test(q)) infoTypes.push("CUI_SPECIFIED");
  if (/\b(?:phi|hipaa)\b/i.test(q)) infoTypes.push("PHI");

  return evaluateFips199SecurityCategorization({
    systemName: "Target System",
    confidentialityImpact: toImpact(cMatch?.[1], inferredFloor),
    integrityImpact: toImpact(iMatch?.[1], inferredFloor),
    availabilityImpact: toImpact(aMatch?.[1], /\bfedramp\s+high\b/i.test(q) ? "HIGH" : /\b(?:phi|hipaa)\b/i.test(q) ? "MODERATE" : "LOW"),
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

  // Pull directly governing FedRAMP sub-controls/enhancements for core multi-part controls
  const ensureControl = (id: string) => {
    const c = DB.controls[id];
    if (c && !includedIds.has(c.id)) {
      includedIds.add(c.id);
      controls.push(c);
    }
  };
  if (
    includedIds.has("AC-2") ||
    /\b(?:(?:terminat\w*|fired|offboard\w*|separated)(?:\s+[\w'’-]+){0,3}\s+(?:accounts?|sysadmin|admin|employee|user)|(?:remained|stayed|kept|left)\s+(?:[\w'’-]+\s+){0,3}(?:active|enabled|open)\s+for\s+\d+)\b/i.test(
      q,
    )
  ) {
    ensureControl("AC-2");
    if (/\b(?:fedramp|terminat\w*|fired|offboard\w*|disabl\w*|inactiv\w*|deprovision\w*|active\s+for)\b/i.test(q)) {
      ensureControl("AC-2(3)");
    }
  }
  if (
    includedIds.has("IA-2") ||
    /\b(?:static\s+(?:[\w/-]+\s+){0,2}(?:ssh\s+)?keys?|fido2|aal3)\b/i.test(q)
  ) {
    ensureControl("IA-2");
    if (/\b(?:fedramp|mfa|ssh|bastion|privileged|hardware|phishing|key|fido2|piv|aal3)\b/i.test(q)) {
      ensureControl("IA-2(1)");
      ensureControl("IA-2(6)");
    }
  }
  if (/\b(?:800-88|sanitiz\w*|nvme|ssd|media\s+(?:clear|purge|destroy|disposal))\b/i.test(q)) {
    ensureControl("MP-6");
  }
  if (/\b(?:fips\s*20[345]|ml-?kem|ml-?dsa|post[- ]?quantum|cryptograph\w*)\b/i.test(q)) {
    ensureControl("SC-13");
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
  const baselineKey: "LOW" | "MODERATE" | "HIGH" = /\bmoderate\b/i.test(targetBaseline)
    ? "MODERATE"
    : /\blow\b/i.test(targetBaseline)
    ? "LOW"
    : "HIGH";
  const ruleByControl = new Map<string, RmfRuleEvaluationResult>();
  for (const r of ruleEvaluations) {
    ruleByControl.set(r.controlId, r);
  }

  const authoritativeRecords: AuthoritativeControlRecord[] = [];
  for (const c of controls) {
    if (c.withdrawn) continue;
    const matchedRule = ruleByControl.get(c.id) || (c.parentId ? ruleByControl.get(c.parentId) : undefined);
    const rec = getAuthoritativeControlRecord(c.id, baselineKey, {
      evidenceStatus: matchedRule
        ? matchedRule.formalEvidenceStatus === "VERIFIED_ARTIFACTS_PROVIDED"
          ? "VERIFIED"
          : matchedRule.assessmentMode === "SCENARIO_ASSUMPTION"
          ? "SCENARIO_STIPULATED"
          : "NOT_VERIFIED"
        : "NOT_VERIFIED",
      determination: matchedRule ? matchedRule.verdict : "PENDING",
    });
    if (rec) authoritativeRecords.push(rec);
  }

  // Format immutable Knowledge Packet
  const lines: string[] = [];
  lines.push(
    `### Authoritative RMF Knowledge Packet (NIST SP 800-53 Rev. ${DB.manifest.nistVersion} · Official FedRAMP Rev. 5 OSCAL ${DB.manifest.fedrampVersion || "fedramp2.1.0-oscal1.0.4"})`,
  );
  lines.push(`- **Target Scope:** ${targetBaseline}`);
  lines.push(
    `- **Catalog Totals:** ${DB.manifest.counts.totalControlsAndEnhancements} SP 800-53 controls/enhancements, ${DB.manifest.counts.fedrampControlRegistryCount || 0} FedRAMP OSCAL ODP/altered controls, ${DB.manifest.counts.cui800171Requirements} SP 800-171 Rev. 3 requirements, ${DB.manifest.counts.csf2Items} CSF 2.0 items, ${DB.manifest.counts.mitreAttackEdges} MITRE ATT&CK v16.1 edges.`,
  );
  lines.push(`- **DB Provenance SHA-256:** \`${DB.manifest.dbSha256}\`\n`);

  if (ruleEvaluations.length > 0) {
    lines.push("### 1. IMMUTABLE DETERMINISTIC RULE ENGINE VERDICTS (DO NOT CONTRADICT)");
    for (const r of ruleEvaluations) {
      lines.push(
        `- **Rule ${r.ruleId} (v${r.ruleVersion}) [${r.controlId} — ${r.controlTitle}]: SCENARIO VERDICT = \`${r.verdict}\` | ASSESSMENT MODE = \`${r.assessmentMode || "FORMAL_EVIDENCE_AUDIT"}\` | FORMAL AUDIT DETERMINATION = \`${r.formalDetermination || r.verdict}\`**`,
      );
      lines.push(`  - Summary: ${r.summary}`);
      lines.push(`  - Threshold: ${r.threshold}`);
      lines.push(`  - Variance: ${r.variance}`);
      lines.push(`  - Audit Hash: \`${r.auditHash}\``);
      if (r.authorityCitations?.length) {
        lines.push(
          `  - Authoritative Basis: ${r.authorityCitations
            .map((a) => `${a.document} (${a.version}, effective ${a.effectiveDate}) ${a.section}${a.parameterId ? ` [${a.parameterId}: ${a.parameterValue || ""}]` : ""} — Exceptions: ${a.exceptions}`)
            .join(" || ")}`,
        );
      }
      if (r.authPathAssessment) {
        lines.push(
          `  - End-to-End Authentication Path (${r.authPathAssessment.evaluatedPath}): Same-Domain Exempt Applies=${r.authPathAssessment.sameDomainGuidanceApplies}; Direct Bypass Risk=${r.authPathAssessment.directBypassRisk}; Architectural Checks=[${r.authPathAssessment.architecturalVerificationRequired.join(" | ")}]`,
        );
      }
      if (r.missingEvidence.length > 0) {
        lines.push(`  - Evidence Required for Formal Assessor Determination: ${r.missingEvidence.join("; ")}`);
      }
      if (r.draftFinding) {
        lines.push(`  - Draft Finding [${r.draftFinding.severity}, ${r.draftFinding.objectiveId}]: ${r.draftFinding.title} — ${r.draftFinding.impactSummary}`);
      }
      if (r.draftPoam) {
        lines.push(
          `  - Draft POA&M (${r.draftPoam.poamId}, Target Timeline: ${r.draftPoam.slaDays} days — Program Guidance, NOT Statutory): ${r.draftPoam.weaknessName}. Plan: ${r.draftPoam.remediationPlan}. Required Proof: ${r.draftPoam.requiredTechnicalProof}`,
        );
      }
      if (r.poamAuthorityNote) {
        lines.push(`  - POA&M Authority Note: ${r.poamAuthorityNote}`);
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
    lines.push("### 3. AUTHORITATIVE NIST SP 800-53 REV. 5.2.0 + SP 800-53A + OFFICIAL FEDRAMP REV. 5 OSCAL REGISTRY");
    const authRecMap = new Map(authoritativeRecords.map((rec) => [rec.enhancement || rec.control_id, rec]));
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
      const authRec = authRecMap.get(c.id);
      if (authRec) {
        lines.push(
          `  - Official Authority Metadata: Document=\`${authRec.authority.document}\` | Version=\`${authRec.authority.version}\` | Effective=\`${authRec.authority.effective_date}\` | SHA-256=\`${authRec.authority.sha256.slice(0, 12)}\` | URL=${authRec.authority.url}`,
        );
        if (authRec.organization_defined_parameters.length > 0) {
          lines.push(
            `  - Official FedRAMP ${baselineKey} OSCAL ODPs: ${authRec.organization_defined_parameters.map((p) => `\`${p.param_id}\` (${p.label}) = "${p.value}"`).join(" ; ")}`,
          );
        }
        if (authRec.additional_fedramp_requirements.length > 0) {
          lines.push(`  - Additional FedRAMP Requirements: ${authRec.additional_fedramp_requirements.join(" | ")}`);
        }
        if (authRec.additional_fedramp_guidance.length > 0) {
          lines.push(`  - Additional FedRAMP Guidance / Exceptions: ${authRec.additional_fedramp_guidance.join(" | ")}`);
        }
      } else if (c.fedrampOdp) {
        lines.push(`  - FedRAMP ${baselineKey} ODP Summary: ${c.fedrampOdp[baselineKey.toLowerCase() as "low" | "moderate" | "high"]} (Timeline Scope: ${c.fedrampOdp.sla})`);
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
    const poamPol = DB.authorityPolicies?.FEDRAMP_POAM_TIMELINES;
    const kevPol = DB.authorityPolicies?.CISA_BOD_22_01;
    if (poamPol) {
      lines.push(
        `- **Authority Policy [FEDRAMP_POAM_TIMELINES]:** ${poamPol.document} (version \`${poamPol.version}\`, effective \`${poamPol.effectiveDate}\`). Scope: ${poamPol.scope} Exceptions: ${poamPol.exceptions}`,
      );
    }
    if (kevPol) {
      lines.push(
        `- **Authority Policy [CISA_BOD_22_01]:** ${kevPol.document} (effective \`${kevPol.effectiveDate}\`). Scope: ${kevPol.scope} Exceptions: ${kevPol.exceptions}`,
      );
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

  // SP 800-37 Tasks, Supporting NIST SP Publications & SP 800-60 Information Types
  const catalogHits = searchNistSpCatalog(q, 18);
  const rmfTasksReferenced: NistRmfTask[] = [];
  const seenTasks = new Set<string>();
  const addTask = (t: NistRmfTask) => {
    if (!seenTasks.has(t.taskId) && rmfTasksReferenced.length < 12) {
      seenTasks.add(t.taskId);
      rmfTasksReferenced.push(t);
    }
  };
  for (const m of q.match(/\b(?:P-(?:1[0-8]|[1-9])|C-[1-3]|S-[1-6]|I-[1-2]|A-[1-6]|R-[1-5]|M-[1-7])\b/gi) || []) {
    const exactTask = lookupRmfTask(m);
    if (exactTask) addTask(exactTask);
  }
  for (const hit of catalogHits) {
    if (hit.kind === "rmf_task" && hit.task) addTask(hit.task);
  }
  for (const st of rmfStepsReferenced) {
    if (/\btasks?\b/i.test(q)) {
      for (const t of listRmfTasksByStep(st.step)) addTask(t);
    }
  }

  const nistPublicationsReferenced: NistSpPublication[] = [];
  const seenPubs = new Set<string>();
  const addPub = (pub: NistSpPublication | null | undefined) => {
    if (pub && !seenPubs.has(pub.sourceId) && nistPublicationsReferenced.length < 8) {
      seenPubs.add(pub.sourceId);
      nistPublicationsReferenced.push(pub);
    }
  };
  const pubPatterns: [RegExp, string][] = [
    [/\bfips\s*199\b/i, "FIPS-199"],
    [/\bfips\s*200\b/i, "FIPS-200"],
    [/\b800-60\b/i, "SP-800-60v1v2"],
    [/\b800-37\b/i, "SP-800-37r2"],
    [/\b800-53a\b/i, "SP-800-53Ar5"],
    [/\b800-53b\b/i, "SP-800-53B"],
    [/\b800-53\b/i, "SP-800-53r5"],
    [/\b800-88\b|\bsanitiz\w*\b|\bnvme\b/i, "SP-800-88r1"],
    [/\bfips\s*20[345]\b|\bml-?kem\b|\bml-?dsa\b/i, "FIPS-203-204-205"],
    [/\b800-171\b/i, "SP-800-171r3"],
    [/\b800-63\b|\baal[123]\b|\bfido2\b/i, "SP-800-63-4"],
    [/\b800-30\b/i, "SP-800-30r1"],
    [/\b800-137\b/i, "SP-800-137"],
    [/\b800-207\b/i, "SP-800-207"],
  ];
  for (const [re, id] of pubPatterns) {
    if (re.test(q)) addPub(lookupNistPublication(id));
  }
  for (const hit of catalogHits) {
    if (hit.kind === "publication" && hit.publication) addPub(hit.publication);
  }

  const sp80060InfoTypesReferenced: Sp80060InfoType[] = catalogHits
    .filter((h): h is typeof h & { infoType: Sp80060InfoType } => h.kind === "sp800_60_info_type" && Boolean(h.infoType))
    .slice(0, 6)
    .map((h) => h.infoType);

  if (rmfTasksReferenced.length > 0) {
    lines.push("### 7B. NIST SP 800-37 REV. 2 OFFICIAL TASKS REFERENCED");
    for (const t of rmfTasksReferenced) {
      lines.push(`- **Task ${t.taskId} (${t.title}, Step ${t.stepNumber} ${t.stepCode}, ${t.level})** — Roles: ${t.primaryRoles.join(", ")} | Outputs: ${t.expectedOutputs.join("; ")} | ${t.description}`);
    }
    lines.push("");
  }

  if (nistPublicationsReferenced.length > 0) {
    lines.push("### 7C. SUPPORTING NIST SP / FIPS PUBLICATIONS GROUNDING");
    for (const pub of nistPublicationsReferenced) {
      lines.push(`- **${pub.docNumber}: ${pub.title}** (${pub.version}) — ${pub.summary} Key Concepts: ${pub.keyConcepts.slice(0, 4).join(", ")}. Invariant: ${pub.invariants[0] || ""}`);
    }
    lines.push("");
  }

  if (sp80060InfoTypesReferenced.length > 0) {
    lines.push("### 7D. NIST SP 800-60 VOL. 2 INFORMATION TYPES");
    for (const it of sp80060InfoTypesReferenced) {
      lines.push(`- **${it.code} (${it.name})**: Provisional C=${it.confidentiality}, I=${it.integrity}, A=${it.availability} -> High-Watermark **${it.highWatermark}**. ${it.tailoringNotes}`);
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
  if (
    /\b(?:ato\s+readiness|ready\s+for\s+ato|authorization\s+package|authorization\s+readiness|(?:issue|grant|approve|sign)\s+(?:our\s+|an?\s+|the\s+)?ato)\b/i.test(
      q,
    )
  ) {
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
    const combinedAuditSha =
      ruleEvaluations.length === 1
        ? primaryRule.auditHash
        : sha256Sync(ruleEvaluations.map((r) => `${r.ruleId}:${r.auditHash}`).join("|"));
    const traceRuleItems = ruleEvaluations.map((r) => ({
      ruleId: r.ruleId,
      ruleVersion: r.ruleVersion,
      controlId: r.controlId,
      assessmentMode: r.assessmentMode || "FORMAL_EVIDENCE_AUDIT",
      verdict: r.verdict,
      formalDetermination: String(r.formalDetermination || r.verdict),
      variance: r.variance,
      auditHash: r.auditHash,
      observedFacts: r.observedFacts,
      authorityDocs: (r.authorityCitations || []).map(
        (a) => `${a.document} (${a.version}) ${a.section}${a.parameterId ? ` [${a.parameterId}]` : ""}`,
      ),
    }));
    explanationBundle = createExplanationBundle({
      tenantId: "chat-session",
      evaluationRef: ruleEvaluations.map((r) => r.controlId).join("+"),
      nistVersion: DB.manifest.nistVersion,
      dbSha256: DB.manifest.dbSha256,
      ruleId: ruleEvaluations.map((r) => r.ruleId).join("+"),
      ruleVersion: ruleEvaluations.map((r) => r.ruleVersion).join("+"),
      evidenceSha256: combinedAuditSha,
      observedFacts:
        ruleEvaluations.length === 1
          ? primaryRule.observedFacts
          : {
              ruleCount: ruleEvaluations.length,
              controls: ruleEvaluations.map((r) => r.controlId).join(", "),
              verdicts: ruleEvaluations.map((r) => `${r.controlId}:${r.verdict}`).join(", "),
              assessmentMode: primaryRule.assessmentMode || "SCENARIO_ASSUMPTION",
            },
      deterministicClassifications: ruleEvaluations.map(
        (r) =>
          `${r.controlId} (${r.ruleId}): Scenario=${r.verdict} | Formal=${r.formalDetermination || r.verdict} — ${r.variance}`,
      ),
      analyticalEstimates: [],
      verdict:
        ruleEvaluations.length === 1
          ? primaryRule.verdict
          : ruleEvaluations.map((r) => `${r.controlId}:${r.verdict}`).join("|"),
      ruleEvaluations: traceRuleItems,
    });
    lines.push("### 12. AI-025 EXPLAINABLE DECISION TRACE (SEPARATE FACTS / DETERMINISTIC VERDICTS / ESTIMATES)");
    lines.push(`- **Bundle ID:** \`${explanationBundle.bundleId}\` | **Canonical Trace SHA-256:** \`${explanationBundle.canonicalTraceHash}\``);
    lines.push(`- **Rules Traced (${traceRuleItems.length}):** ${traceRuleItems.map((t) => `${t.controlId}=${t.verdict} (Formal: ${t.formalDetermination})`).join(" ; ")}`);
    lines.push("- **Analytical Estimates:** Any forward-looking risk or remediation effort commentary must explicitly state assumptions and uncertainty rather than claiming verified fact.\n");
  }

  return {
    question: q,
    targetBaseline,
    manifest: {
      nistVersion: DB.manifest.nistVersion,
      fedrampVersion: DB.manifest.fedrampVersion,
      fedrampPublished: DB.manifest.fedrampPublished,
      dbSha256: DB.manifest.dbSha256,
      counts: {
        ...DB.manifest.counts,
        sp80037Tasks: NIST_SP_800_37_TASKS.length,
        nistSpPublications: NIST_SP_PUBLICATIONS.length,
        sp80060InfoTypes: NIST_SP_800_60_INFO_TYPES.length,
      },
    },
    rmfStepsReferenced,
    rmfTasksReferenced,
    nistPublicationsReferenced,
    sp80060InfoTypesReferenced,
    controls,
    authoritativeRecords,
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

function controlMatchesBase(controlId: string, textBlock: string): boolean {
  const esc = controlId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (new RegExp(`\\b${esc}(?![\\w(])`, "i").test(textBlock)) return true;
  // Match child enhancement of a base control (e.g., AC-2(3) inside AC-2 section, IA-2(1)/(6) inside IA-2 section)
  if (!controlId.includes("(")) {
    const baseEsc = controlId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${baseEsc}\\(\\d+\\)`, "i").test(textBlock)) return true;
  }
  return false;
}

export function extractControlScopedText(
  draftBody: string,
  targetControlId: string,
  allEvaluatedControlIds: string[],
): string {
  if (allEvaluatedControlIds.length <= 1) return draftBody;

  const others = allEvaluatedControlIds.filter((id) => id !== targetControlId);
  const lines = draftBody.split(/\r?\n/);

  // 1. Try markdown heading / bold section segmentation
  type Section = { owner: string | null; lines: string[] };
  const sections: Section[] = [];
  let current: Section = { owner: null, lines: [] };

  for (const line of lines) {
    const isHeaderLike =
      /^#{1,6}\s+/.test(line) ||
      /^\*\*[^*]{2,100}\*\*\s*(?:[:—–-]|$)/.test(line.trim()) ||
      /^[-*]\s+\*\*(?:Rule\s+RMF-)?[A-Z]{2}-\d+/.test(line.trim());

    if (isHeaderLike) {
      const mentionsTarget = controlMatchesBase(targetControlId, line);
      const mentionsOther = others.some((o) => controlMatchesBase(o, line));
      if (mentionsTarget && !mentionsOther) {
        sections.push(current);
        current = { owner: targetControlId, lines: [line] };
        continue;
      }
      if (mentionsOther && !mentionsTarget) {
        sections.push(current);
        current = { owner: "OTHER", lines: [line] };
        continue;
      }
      if (/^#{1,2}\s+/.test(line) && current.owner !== null) {
        sections.push(current);
        current = { owner: null, lines: [line] };
        continue;
      }
    }
    current.lines.push(line);
  }
  sections.push(current);

  const ownedBlocks = sections.filter((s) => s.owner === targetControlId);
  if (ownedBlocks.length > 0) {
    return ownedBlocks.map((b) => b.lines.join("\n")).join("\n");
  }

  // 2. Fallback: extract lines / table rows / sentences mentioning targetControlId and NOT others
  const matchedLines = lines.filter((line) => {
    const hasTarget = controlMatchesBase(targetControlId, line);
    const hasOther = others.some((o) => controlMatchesBase(o, line));
    return hasTarget && !hasOther;
  });
  if (matchedLines.length > 0) {
    return matchedLines.join("\n");
  }

  const sentences = draftBody.split(/(?<=[.!?])\s+|\n+/);
  const matchedSentences = sentences.filter((s) => {
    const hasTarget = controlMatchesBase(targetControlId, s);
    const hasOther = others.some((o) => controlMatchesBase(o, s));
    return hasTarget && !hasOther;
  });
  return matchedSentences.join(" ");
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
      const upperBody = draftBody.toUpperCase();
      const mentionsReplacement =
        ctrl.withdrawnInto.length === 0 ||
        (ctrl.withdrawnInto.length <= 3
          ? ctrl.withdrawnInto.every((repl) => citedIds.includes(repl) || upperBody.includes(repl))
          : ctrl.withdrawnInto.some((repl) => citedIds.includes(repl) || upperBody.includes(repl)));

      // Catch direct conflation like "MP-6 (replaces withdrawn AC-13)"
      let conflatedReplacement: string | null = null;
      if (ctrl.withdrawnInto.length > 0) {
        const cidEsc = cid.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        for (const sent of draftBody.split(/\r?\n|(?<=[.!?])\s+/)) {
          if (!new RegExp(`\\b${cidEsc}\\b`, "i").test(sent)) continue;
          if (!/\breplac(?:es|ed|ing)\b|\bsupersed(?:es|ed)\b/i.test(sent)) continue;
          if (/\b(?:not|never)\s+replac/i.test(sent)) continue;
          const sentIds = extract80053IdsFromText(sent).filter((id) => id !== cid);
          const hasValidReplInSent = ctrl.withdrawnInto.some((repl) => sentIds.includes(repl));
          const wrongRepl = sentIds.find((id) => !ctrl.withdrawnInto.includes(id));
          if (wrongRepl && !hasValidReplInSent) {
            conflatedReplacement = wrongRepl;
            break;
          }
        }
      }

      if (conflatedReplacement) {
        violations.push(
          `WITHDRAWN_REPLACEMENT_CONFLATION: Draft implied ${conflatedReplacement} replaces withdrawn control ${cid}. In Rev. 5, ${cid} was incorporated strictly into ${ctrl.withdrawnInto.join(" and ")}, NOT ${conflatedReplacement}.`,
        );
      }
      if (!mentionsWithdrawn || !mentionsReplacement) {
        violations.push(
          `UNFLAGGED_WITHDRAWN_CONTROL: Cited withdrawn control "${cid}". Must explicitly state that ${cid} is WITHDRAWN in Rev. 5 and cite ALL replacement control(s): ${ctrl.withdrawnInto.join(", ") || "N/A"}.`,
        );
      } else if (!conflatedReplacement) {
        withdrawnNotices.push(`${cid} -> ${ctrl.withdrawnInto.join(", ")}`);
      }
    }
  }

  // Enforce coverage of any withdrawn control explicitly requested in the prompt (e.g. AC-13)
  for (const reqWithdrawn of packet.controls.filter((c) => c.withdrawn)) {
    if (!citedIds.includes(reqWithdrawn.id)) {
      violations.push(
        `MISSING_REQUESTED_WITHDRAWN_CONTROL: Prompt explicitly referenced withdrawn control "${reqWithdrawn.id}". Must explicitly state that ${reqWithdrawn.id} is WITHDRAWN in Rev. 5 and cite ALL official replacement control(s): ${reqWithdrawn.withdrawnInto.join(", ") || "N/A"}.`,
      );
    }
  }

  // Enforce deterministic rule verdict fidelity PER CONTROL (no global multi-control regex collision)
  const evaluatedControlIds = [...new Set(packet.ruleEvaluations.map((r) => r.controlId))];
  for (const r of packet.ruleEvaluations) {
    const scopedText = extractControlScopedText(draftBody, r.controlId, evaluatedControlIds);
    const statusPattern =
      /(?:scenario(?:\s+based)?\s+verdict|primary\s+verdict|verdict|rule\s+result|compliance\s+status|scenario\s+determination|determination)(?:\*{0,2}\s*[:\-—]\s*|\s+)\*{0,2}\s*(PASS|PASSED|COMPLIANT|FAIL|FAILED|NON[- ]COMPLIANT|INSUFFICIENT_EVIDENCE|INSUFFICIENT\s+EVIDENCE|MANUAL_REVIEW_REQUIRED)\b/gi;
    const declaredStatuses = [...scopedText.matchAll(statusPattern)]
      .filter((m) => {
        const before = scopedText.slice(Math.max(0, (m.index ?? 0) - 24), m.index ?? 0);
        return !/\bformal(?:\s+audit)?\s*$/i.test(before);
      })
      .map((m) => m[1]!.toUpperCase().replace(/\s+/g, "_").replace("-", "_"));

    if (r.verdict === "FAIL") {
      const hasFalsePassOrDowngrade = declaredStatuses.some((s) =>
        s === "PASS" || s === "PASSED" || s === "COMPLIANT" || s === "INSUFFICIENT_EVIDENCE",
      );
      const acknowledgesFail = /\b(?:FAIL|FAILED|NON[- ]COMPLIANT)\b/i.test(scopedText);
      if (hasFalsePassOrDowngrade || !acknowledgesFail) {
        violations.push(
          `RULE_VERDICT_CONTRADICTION: Deterministic rule ${r.ruleId} [${r.controlId}] evaluated to FAIL (${r.summary}). Its ${r.controlId} section must explicitly state FAIL and must not report PASS or INSUFFICIENT_EVIDENCE as the scenario verdict.`,
        );
      }
    } else if (r.verdict === "INSUFFICIENT_EVIDENCE") {
      const fabricatedPassOrFail = declaredStatuses.some(
        (s) => s === "PASS" || s === "PASSED" || s === "COMPLIANT" || s === "FAIL" || s === "FAILED" || s === "NON_COMPLIANT",
      );
      const notesInsufficient = /\b(?:INSUFFICIENT_EVIDENCE|insufficient\s+evidence|missing\s+evidence|cannot\s+verify|not\s+provided|pending\s+verified\s+evidence)\b/i.test(
        scopedText,
      );
      if (fabricatedPassOrFail || !notesInsufficient) {
        violations.push(
          `EVIDENCE_SUFFICIENCY_CONTRADICTION: Deterministic rule ${r.ruleId} [${r.controlId}] returned INSUFFICIENT_EVIDENCE. Its ${r.controlId} section must explicitly report INSUFFICIENT_EVIDENCE and list missing artifacts.`,
        );
      }
    } else if (r.verdict === "PASS") {
      const falselyFailed = declaredStatuses.some((s) => s === "FAIL" || s === "FAILED" || s === "NON_COMPLIANT");
      if (falselyFailed) {
        violations.push(
          `RULE_VERDICT_CONTRADICTION: Deterministic rule ${r.ruleId} [${r.controlId}] evaluated to PASS, but the ${r.controlId} section reported FAIL.`,
        );
      }
    } else if (r.verdict === "MANUAL_REVIEW_REQUIRED") {
      const notesReview = /\b(?:MANUAL_REVIEW_REQUIRED|manual\s+review|architectural\s+verification|verify\s+(?:the\s+)?(?:upstream|end-to-end|full))\b/i.test(
        scopedText,
      );
      if (!notesReview) {
        violations.push(
          `RULE_VERDICT_CONTRADICTION: Deterministic rule ${r.ruleId} [${r.controlId}] evaluated to MANUAL_REVIEW_REQUIRED. Its ${r.controlId} section must note required architectural verification.`,
        );
      }
    }
  }

  // Enforce Authority Accuracy: prevent affirmative labeling of POA&M timelines as "statutory"
  for (const sentence of draftBody.split(/(?<=[.!?])\s+|\n+/)) {
    const claimsStatutory =
      /\bstatutory\b[^.\n]{0,70}\b(?:30[- ]?day|poa&m|poam|remediation\s+(?:deadline|sla|timeline))\b|\b(?:30[- ]?day|poa&m|poam)\b[^.\n]{0,70}\bstatutory\b/i.test(
        sentence,
      );
    const negatedStatutory =
      /\b(?:not|never|no|non)\s+(?:a\s+|universal\s+|federal\s+){0,3}statutory\b|\bnon-statutory\b|\b(?:not|never)\b[^.\n]{0,35}\bstatut(?:ory|e)\b/i.test(
        sentence,
      );
    if (claimsStatutory && !negatedStatutory) {
      violations.push(
        "AUTHORITY_MISREPRESENTATION: FedRAMP 30-day POA&M timelines are program guidance / RA-5(d) vulnerability ODPs (subject to AO tailoring), not a universal statutory requirement.",
      );
      break;
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

  // Enforce explicit FIPS 203 / ML-KEM coverage when explicitly requested
  if (/\bfips\s*203\b|\bml-?kem\b/i.test(question) && !/\bfips\s*203\b|\bml-?kem\b/i.test(draftBody)) {
    violations.push(
      "MISSING_REQUESTED_STANDARD: Prompt explicitly asked about FIPS 203 (ML-KEM), but response omitted FIPS 203 / ML-KEM.",
    );
  }

  // Enforce explicit MP-6 + Purge / Cryptographic Erase / Destroy coverage when SP 800-88 NVMe/SSD sanitization fails
  if (
    /\b800-88\b/i.test(question) &&
    packet.ruleEvaluations.some((r) => r.controlId === "MP-6" && r.verdict === "FAIL") &&
    !/\bMP-6\b[\s\S]*(?:Purge|Cryptographic\s+Erase|Destroy)/i.test(draftBody)
  ) {
    violations.push(
      "MISSING_MP6_PURGE_DESTROY: Prompt evaluated SP 800-88 NVMe/SSD sanitization failure under MP-6, but draft omitted MP-6 followed by Purge, Cryptographic Erase, or Destroy.",
    );
  }

  // Enforce Markdown table deliverable when explicitly requested
  if (
    /\b(?:markdown\s+table|on\s+a\s+table|in\s+a\s+table|as\s+a\s+table)\b/i.test(question) &&
    !/\|[^\n]+\|\r?\n\|[\s:|-]+\|/m.test(draftBody)
  ) {
    violations.push(
      "MISSING_REQUESTED_TABLE: Prompt explicitly requested a Markdown table, but response did not include a properly formatted Markdown table.",
    );
  }

  return {
    passed: violations.length === 0,
    violations,
    verifiedControls,
    withdrawnNotices,
    invalidIds,
  };
}
