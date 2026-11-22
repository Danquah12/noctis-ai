/**
 * NDKRS Unified Chat Bridge (Server-Side)
 *
 * Connects Noctis Chat (`composeVibeReply` + Clinical Pipeline) to:
 *  1. NDKRS Hybrid RAG (`hybridSearchNdkrs` using BM25 + pgvector cosine + RRF)
 *  2. All 12 Executable Deterministic Rules + Cross-Domain Fact-Lock HMAC Certificates
 *  3. Live Platform Introspection (NDKRS counts/certs/gaps/review-queue/enclave,
 *     RMF v2.0 SQL artifacts & hash-chained audit ledger, Universal Ingestion Telemetry)
 */

import { evaluateDeterministicRule, NDKRS_RULE_CATALOG } from "./rules-engine.server.ts";
import { validateCrossDomainFactLock, verifyCertificateSignature } from "./fact-lock-validator.server.ts";
import { listReviewQueue } from "./governance.server.ts";
import { hybridSearchNdkrs } from "./hybrid-retrieval.server.ts";
import {
  getNdkrsStatusSummary,
  listKnowledgeGaps,
  listValidationCertificates,
} from "./persistence.server.ts";
import type { HybridSearchHit, NdkrsDomain } from "./types.ts";
import { getIngestStatistics, getRecentIngestedStream } from "../noctis-universal-ingestor.ts";
import { getRmfStorageStatus, listRmfArtifacts } from "../rmf-v2/persistence.server.ts";
import { sha256Sync } from "../universal-crypto.ts";

export interface NdkrsChatGroundingResult {
  hits: HybridSearchHit[];
  systemBlock: string;
  footer: string;
}

const KNOWN_RULE_IDS = new Set(NDKRS_RULE_CATALOG.map((r) => r.ruleId.toUpperCase()));

function filterRelevantNdkrsHits(query: string, candidates: HybridSearchHit[]): HybridSearchHit[] {
  const qLower = query.toLowerCase();
  return candidates.filter(
    (h) =>
      (h.rrfScore >= 0.015 && (h.matchedTerms >= 2 || qLower.includes(h.canonicalKey.toLowerCase()))) ||
      h.vectorScore >= 0.42,
  );
}

/**
 * Queries NDKRS verified knowledge (`VERIFIED` records & chunks) using hybrid
 * BM25 + semantic vector RRF search and formats grounded context + citations.
 */
export async function fetchNdkrsChatGrounding(
  question: string,
  options?: { domain?: NdkrsDomain; limit?: number },
): Promise<NdkrsChatGroundingResult> {
  const cleanQ = question.trim();
  if (!cleanQ) {
    return { hits: [], systemBlock: "", footer: "" };
  }
  try {
    const candidates = await hybridSearchNdkrs(cleanQ, {
      domain: options?.domain,
      limit: options?.limit ?? 3,
    });
    const hits = filterRelevantNdkrsHits(cleanQ, candidates);
    if (hits.length === 0) {
      return { hits: [], systemBlock: "", footer: "" };
    }
    const systemBlock =
      `[NDKRS Verified Authoritative Knowledge Grounding — Cite these verified facts & versions accurately]\n` +
      hits
        .map(
          (h, idx) =>
            `${idx + 1}. [${h.citationLabel} | v${h.version} | SHA-256:${h.sha256.slice(0, 12)}] ${h.title} (${h.sourceUri})\n${h.excerpt}`,
        )
        .join("\n\n");
    const footer = `\n\n---\n**NDKRS Verified Knowledge Grounding** · Citations: ${hits
      .map((h) => `\`${h.citationLabel}\``)
      .join(", ")} · SHA-256: \`${hits[0].sha256.slice(0, 12)}\``;
    return { hits, systemBlock, footer };
  } catch {
    return { hits: [], systemBlock: "", footer: "" };
  }
}

/**
 * Handles live Chat queries inspecting NDKRS database status, validation certificates,
 * knowledge gaps, review queue, clinical enclave status, RMF v2.0 artifacts/ledger,
 * or Universal Ingestion telemetry ring buffer.
 */
export async function tryHandlePlatformStatusOrLedgerQuery(question: string): Promise<string | null> {
  const q = question.trim();
  if (!q) return null;

  const isStatusAction = /\b(show|list|get|check|inspect|report|display|status|what\s+is|what's|how\s+many|summarize|audit)\b/i.test(
    q,
  );
  if (!isStatusAction) return null;

  const asksNdkrs =
    /\bndkrs\b/i.test(q) &&
    /\b(status|stats|metrics|count|summary|overview|health|cert(?:ificate)?s?|gaps?|queue|enclave|rules?|records?|embedding|pgvector)\b/i.test(
      q,
    );
  const asksCertsOrGapsOrQueue =
    /\b(validation\s+certificates?|knowledge\s+gaps?|human\s+review\s+queue|ndkrs\s+review\s+queue|clinical\s+enclave\s+status|enclave\s+records?)\b/i.test(
      q,
    );
  const asksRmfStorage =
    /\b(?:rmf\s*v?2(?:\.0)?\s+(?:artifacts?|ledger|storage|database|records?)|stored\s+rmf\s+(?:artifacts?|ssp|poam)|v2_artifacts|v2_audit_ledger|rmf\s+audit\s+ledger)\b/i.test(
      q,
    );
  const asksIngestStream =
    /\b(?:ingest(?:ion|ed)?\s+(?:stream|stats|statistics|telemetry|ring\s+buffer|buffer)|universal\s+ingestor\s+(?:status|stats))\b/i.test(
      q,
    );

  if (!asksNdkrs && !asksCertsOrGapsOrQueue && !asksRmfStorage && !asksIngestStream) {
    return null;
  }

  const sections: string[] = [];

  if (asksNdkrs || asksCertsOrGapsOrQueue) {
    const [status, certs, gaps, pendingQueue] = await Promise.all([
      getNdkrsStatusSummary(),
      listValidationCertificates(8),
      listKnowledgeGaps(8),
      listReviewQueue("PENDING_REVIEW"),
    ]);

    sections.push(
      `## NDKRS Live Platform Status\n` +
        `- **Database Backend:** \`${status.dbSource}\` (pgvector enabled: \`${status.pgvectorEnabled}\`, active chunk embedding model: \`${status.dominantEmbeddingModel}\`)\n` +
        `- **Verified Authoritative Sources / Records / Chunks:** ${status.counts.sources} sources · ${status.counts.verifiedRecords} VERIFIED records (${status.counts.pendingRecords} PENDING_REVIEW) · ${status.counts.chunks} indexed chunks\n` +
        `- **Executable Deterministic Rules:** ${status.counts.deterministicRules} verified rules\n` +
        `- **Pending Human Review Queue:** ${status.counts.pendingReviewQueue} item(s)\n` +
        `- **Signed Validation Certificates:** ${status.counts.validationCertificates} total\n` +
        `- **Open Knowledge Gaps:** ${status.counts.openKnowledgeGaps} open gap(s)\n` +
        `- **AES-256-GCM Clinical Enclave Records:** ${status.counts.encryptedClinicalEnclaveRecords} encrypted payload(s) (mode: \`${process.env.NOCTIS_ENCLAVE_KEY ? "prod-enclave-v1" : "dev-enclave-fallback-v1"}\`)`,
    );

    if (certs.length > 0) {
      const certLines = certs.slice(0, 6).map((c) => {
        const sigOk = verifyCertificateSignature(c);
        return `- \`${c.id}\` | domain: \`${c.domain}\` | verdict: **${c.verdict}** | keyMode: \`${c.keyMode}\` | HMAC: ${sigOk ? "VALID" : "INVALID"} | ${c.createdAt}`;
      });
      sections.push(`### Recent Signed Validation Certificates (${certs.length})\n${certLines.join("\n")}`);
    } else {
      sections.push(`### Recent Signed Validation Certificates\nNo validation certificates persisted yet.`);
    }

    if (gaps.length > 0) {
      const gapLines = gaps
        .slice(0, 6)
        .map(
          (g) =>
            `- \`${g.id}\` | domain: \`${g.domain}\` | status: \`${g.status}\` | hits: ${g.occurrences} | topic: ${g.sanitizedTopic}`,
        );
      sections.push(`### Open / Logged Knowledge Gaps (${gaps.length})\n${gapLines.join("\n")}`);
    } else {
      sections.push(`### Open / Logged Knowledge Gaps\nZero knowledge gaps logged.`);
    }

    if (pendingQueue.length > 0) {
      const qLines = pendingQueue
        .slice(0, 5)
        .map((item) => `- \`${item.id}\` | domain: \`${item.domain}\` | ${item.title} (proposed by ${item.proposedBy})`);
      sections.push(`### Human Review Queue (${pendingQueue.length} pending)\n${qLines.join("\n")}`);
    }
  }

  if (asksRmfStorage) {
    const [rmfStatus, artifacts] = await Promise.all([
      getRmfStorageStatus("tenant:public-sandbox"),
      listRmfArtifacts("tenant:public-sandbox", undefined, 8),
    ]);
    const artLines = artifacts.length
      ? artifacts
          .slice(0, 6)
          .map(
            (a) =>
              `- \`${a.id}\` | type: \`${a.artifactType}\` | system: \`${a.systemId}\` | status: \`${a.status}\` | SHA-256: \`${a.payloadSha256.slice(0, 12)}\``,
          )
          .join("\n")
      : "- No persisted RMF v2.0 artifacts found under `tenant:public-sandbox`.";
    const eventLines = rmfStatus.latestEvents.length
      ? rmfStatus.latestEvents
          .slice(0, 5)
          .map(
            (ev) =>
              `- seq #${ev.seq} | \`${ev.eventType}\` | actor: \`${ev.actorId}\` | hash: \`${ev.eventHash.slice(0, 12)}\``,
          )
          .join("\n")
      : "- No ledger events recorded yet.";

    sections.push(
      `## RMF v2.0 SQL Artifact Store & Audit Ledger\n` +
        `- **Storage Backend:** \`${rmfStatus.dbSource}\` · Total Artifacts: **${rmfStatus.totalArtifacts}** · Audit Ledger Entries: **${rmfStatus.auditLedgerCount}**\n` +
        `- **Latest Ledger Hash:** \`${rmfStatus.latestLedgerHash}\`\n` +
        `### Persisted Artifacts\n${artLines}\n` +
        `### Hash-Chained Audit Ledger\n${eventLines}`,
    );
  }

  if (asksIngestStream) {
    const stats = getIngestStatistics();
    const recent = getRecentIngestedStream(5);
    const recentLines = recent.length
      ? recent.map((e) => `- \`${e.eventId}\` | suite: \`${e.suite}\` | pillar: \`${e.sqdecPillar}\` | sev: ${e.severity} | ${e.title}`).join("\n")
      : "- Ring buffer empty since last serverless worker cold start.";
    sections.push(
      `## Universal Telemetry Ingestion Stream\n` +
        `- **Total Ingested:** ${stats.totalIngestedCount} events · Critical Alerts: ${stats.criticalAlertsTotal} · Last Ingest: ${stats.lastIngestedTimestamp ?? "none"}\n` +
        `- **Active Protocols:** ${stats.activeProtocols.length ? stats.activeProtocols.join(", ") : "none active"}\n` +
        `### Recent Buffered Events\n${recentLines}`,
    );
  }

  return sections.join("\n\n");
}

function extractNumberAfter(text: string, patterns: RegExp[]): number | null {
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[1] !== undefined) {
      const val = Number(m[1].replace(/,/g, ""));
      if (Number.isFinite(val)) return val;
    }
  }
  return null;
}

function extractBoolAfter(text: string, keyRegex: RegExp, fallback?: boolean): boolean | undefined {
  const m = text.match(keyRegex);
  if (!m) return fallback;
  const token = (m[1] || "").toLowerCase();
  if (token === "true" || token === "yes" || token === "1") return true;
  if (token === "false" || token === "no" || token === "0") return false;
  return fallback;
}

function parseRuleInputsFromText(ruleId: string, q: string): { inputs: Record<string, unknown>; hasParams: boolean } {
  const lower = q.toLowerCase();
  switch (ruleId) {
    case "ENG-REYNOLDS": {
      const rho = extractNumberAfter(q, [/\b(?:density|rho)\s*(?:is|=|:|of)?\s*(-?\d+(?:\.\d+)?)/i]);
      const vel = extractNumberAfter(q, [/\b(?:velocity|speed|v)\s*(?:is|=|:|of)?\s*(-?\d+(?:\.\d+)?)/i]);
      const diam = extractNumberAfter(q, [/\b(?:diameter|diam|d)\s*(?:is|=|:|of)?\s*(-?\d+(?:\.\d+)?)/i]);
      const mu = extractNumberAfter(q, [/\b(?:dynamic\s*viscosity|viscosity|mu)\s*(?:is|=|:|of)?\s*(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)/i]);
      const hasParams = rho !== null || vel !== null || diam !== null || mu !== null;
      return {
        hasParams,
        inputs: {
          ...(rho !== null ? { densityKgM3: rho } : {}),
          ...(vel !== null ? { velocityMS: vel } : {}),
          ...(diam !== null ? { diameterM: diam } : {}),
          ...(mu !== null ? { dynamicViscosityPaS: mu } : {}),
        },
      };
    }

    case "ENG-OHMS-POWER": {
      const v = extractNumberAfter(q, [
        /\b(?:voltage|v)\s*(?:is|=|:|of)?\s*(-?\d+(?:\.\d+)?)/i,
        /(-?\d+(?:\.\d+)?)\s*(?:volts?|v)\b/i,
      ]);
      const i = extractNumberAfter(q, [
        /\b(?:current|i)\s*(?:is|=|:|of)?\s*(-?\d+(?:\.\d+)?)/i,
        /(-?\d+(?:\.\d+)?)\s*(?:amps?|amperes?|a)\b/i,
      ]);
      const r = extractNumberAfter(q, [
        /\b(?:resistance|r)\s*(?:is|=|:|of)?\s*(-?\d+(?:\.\d+)?)/i,
        /(-?\d+(?:\.\d+)?)\s*(?:ohms?|Ω)\b/i,
      ]);
      const count = [v, i, r].filter((x) => x !== null).length;
      return {
        hasParams: count >= 2,
        inputs: {
          ...(v !== null ? { voltageV: v } : {}),
          ...(i !== null ? { currentA: i } : {}),
          ...(r !== null ? { resistanceOhm: r } : {}),
        },
      };
    }

    case "SCI-IDEAL-GAS": {
      const p = extractNumberAfter(q, [
        /\b(?:pressure|p)\s*(?:is|=|:|of)?\s*(-?\d+(?:\.\d+)?)/i,
        /(-?\d+(?:\.\d+)?)\s*atm\b/i,
      ]);
      const v = extractNumberAfter(q, [
        /\b(?:volume|v)\s*(?:is|=|:|of)?\s*(-?\d+(?:\.\d+)?)/i,
        /(-?\d+(?:\.\d+)?)\s*(?:liters?|l)\b/i,
      ]);
      const n = extractNumberAfter(q, [
        /\b(?:moles?|n)\s*(?:is|=|:|of)?\s*(-?\d+(?:\.\d+)?)/i,
        /(-?\d+(?:\.\d+)?)\s*mol(?:es?|s)?\b/i,
      ]);
      const t = extractNumberAfter(q, [
        /\b(?:temperature|temp|t)\s*(?:is|=|:|of)?\s*(-?\d+(?:\.\d+)?)/i,
        /(-?\d+(?:\.\d+)?)\s*(?:kelvin|k)\b/i,
      ]);
      const count = [p, v, n, t].filter((x) => x !== null).length;
      return {
        hasParams: count >= 2,
        inputs: {
          ...(p !== null ? { pressureAtm: p } : {}),
          ...(v !== null ? { volumeL: v } : {}),
          ...(n !== null ? { molesN: n } : {}),
          ...(t !== null ? { tempK: t } : {}),
        },
      };
    }

    case "SCI-HENDERSON-HASSELBALCH": {
      const pKa = extractNumberAfter(q, [/\bpka\s*(?:is|=|:|of)?\s*(-?\d+(?:\.\d+)?)/i]);
      const base = extractNumberAfter(q, [
        /\b(?:conjugate\s*base|conjugatebasemolar|acetate|base)\s*(?:is|=|:|of)?\s*(-?\d+(?:\.\d+)?)/i,
        /\[A-\]\s*(?:is|=|:|of)?\s*(-?\d+(?:\.\d+)?)/i,
      ]);
      const acid = extractNumberAfter(q, [
        /\b(?:weak\s*acid|weakacidmolar|acetic\s*acid|acid)\s*(?:is|=|:|of)?\s*(-?\d+(?:\.\d+)?)/i,
        /\[HA\]\s*(?:is|=|:|of)?\s*(-?\d+(?:\.\d+)?)/i,
      ]);
      return {
        hasParams: pKa !== null || base !== null || acid !== null,
        inputs: {
          ...(pKa !== null ? { pKa } : {}),
          ...(base !== null ? { conjugateBaseMolar: base } : {}),
          ...(acid !== null ? { weakAcidMolar: acid } : {}),
        },
      };
    }

    case "CLIN-ANION-GAP": {
      const na = extractNumberAfter(q, [/\b(?:sodium|na\+?)\s*(?:is|=|:|of)?\s*(-?\d+(?:\.\d+)?)/i]);
      const clExplicitNull = /\b(?:chloride|cl-?)\s*(?:is|=|:)?\s*(?:null|none|missing|unavailable|unmeasured|omitted|not\s+available|n\/a)\b/i.test(
        lower,
      ) || /\b(?:without|no|omits?|missing)\s+(?:measured\s+)?(?:serum\s+)?chloride\b/i.test(lower);
      const cl = clExplicitNull
        ? null
        : extractNumberAfter(q, [/\b(?:chloride|cl-?)\s*(?:is|=|:|of)?\s*(-?\d+(?:\.\d+)?)/i]);
      const hco3 = extractNumberAfter(q, [/\b(?:bicarbonate|hco3-?)\s*(?:is|=|:|of)?\s*(-?\d+(?:\.\d+)?)/i]);
      return {
        hasParams: na !== null || cl !== null || hco3 !== null || clExplicitNull,
        inputs: {
          ...(na !== null ? { sodiumMeqL: na } : {}),
          chlorideMeqL: cl,
          ...(hco3 !== null ? { bicarbonateMeqL: hco3 } : {}),
        },
      };
    }

    case "CLIN-CORRECTED-NA": {
      const na = extractNumberAfter(q, [/\b(?:sodium|na\+?)\s*(?:is|=|:|of)?\s*(-?\d+(?:\.\d+)?)/i]);
      const glu = extractNumberAfter(q, [/\b(?:glucose|bg)\s*(?:is|=|:|of)?\s*(-?\d+(?:\.\d+)?)/i]);
      return {
        hasParams: na !== null && glu !== null,
        inputs: {
          ...(na !== null ? { sodiumMeqL: na } : {}),
          ...(glu !== null ? { glucoseMgDl: glu } : {}),
        },
      };
    }

    case "CLIN-MAP": {
      let sbp = extractNumberAfter(q, [/\b(?:sbp|systolic)\s*(?:is|=|:|of)?\s*(\d+(?:\.\d+)?)/i]);
      let dbp = extractNumberAfter(q, [/\b(?:dbp|diastolic)\s*(?:is|=|:|of)?\s*(\d+(?:\.\d+)?)/i]);
      if (sbp === null || dbp === null) {
        const bp = q.match(/\b(\d{2,3})\s*\/\s*(\d{2,3})\b/);
        if (bp) {
          sbp = Number(bp[1]);
          dbp = Number(bp[2]);
        }
      }
      return {
        hasParams: sbp !== null && dbp !== null,
        inputs: { ...(sbp !== null ? { sbpMmHg: sbp } : {}), ...(dbp !== null ? { dbpMmHg: dbp } : {}) },
      };
    }

    case "CLIN-WINTERS": {
      const hco3 = extractNumberAfter(q, [/\b(?:bicarbonate|hco3-?)\s*(?:is|=|:|of)?\s*(\d+(?:\.\d+)?)/i]);
      const paco2 = extractNumberAfter(q, [/\b(?:paco2|pco2)\s*(?:is|=|:|of)?\s*(\d+(?:\.\d+)?)/i]);
      return {
        hasParams: hco3 !== null,
        inputs: { ...(hco3 !== null ? { hco3MeqL: hco3 } : {}), ...(paco2 !== null ? { measuredPaco2MmHg: paco2 } : {}) },
      };
    }

    case "CLIN-KDIGO-AKI": {
      const current = extractNumberAfter(q, [/\b(?:current(?:cr|creatinine)?|now|cr)\s*(?:is|=|:|of)?\s*(\d+(?:\.\d+)?)/i]);
      const base = extractNumberAfter(q, [/\b(?:baseline(?:cr|creatinine)?|base|prior)\s*(?:is|=|:|of)?\s*(\d+(?:\.\d+)?)/i]);
      return {
        hasParams: current !== null && base !== null,
        inputs: {
          ...(current !== null ? { currentCrMgDl: current } : {}),
          ...(base !== null ? { baselineCrMgDl: base } : {}),
          timeframeText: lower,
        },
      };
    }

    case "RMF-POAM-SLA": {
      const sevMatch = q.match(/\b(CRITICAL|HIGH|MODERATE|LOW)\b/i);
      const openDays = extractNumberAfter(q, [
        /(?:open\s*days?|opendays|open\s+for|days?\s*open)\s*(?:is|=|:|of)?\s*(\d+)/i,
        /(\d+)\s*days?\b/i,
      ]);
      return {
        hasParams: Boolean(sevMatch) || openDays !== null,
        inputs: {
          ...(sevMatch ? { severity: sevMatch[1].toUpperCase() } : {}),
          ...(openDays !== null ? { openDays } : {}),
        },
      };
    }

    case "RMF-FIPS-199": {
      const c = q.match(/\bconfidentiality\s*(?:impact)?\s*(?:is|=|:)?\s*(LOW|MODERATE|HIGH)\b/i)?.[1];
      const i = q.match(/\bintegrity\s*(?:impact)?\s*(?:is|=|:)?\s*(LOW|MODERATE|HIGH)\b/i)?.[1];
      const a = q.match(/\bavailability\s*(?:impact)?\s*(?:is|=|:)?\s*(LOW|MODERATE|HIGH)\b/i)?.[1];
      return {
        hasParams: Boolean(c || i || a),
        inputs: {
          confidentialityImpact: c || "MODERATE",
          integrityImpact: i || "MODERATE",
          availabilityImpact: a || "MODERATE",
        },
      };
    }

    case "LEGAL-CDS-21USC360J": {
      const a1 = extractBoolAfter(q, /analyzes?ImagesSignals\s*(?:=|:|is)?\s*(true|false|yes|no)/i);
      const a2 = extractBoolAfter(q, /displays?MedicalInfo\s*(?:=|:|is)?\s*(true|false|yes|no)/i);
      const a3 = extractBoolAfter(q, /supports?ClinicianRecommendation\s*(?:=|:|is)?\s*(true|false|yes|no)/i);
      const a4 = extractBoolAfter(q, /enables?IndependentReview\s*(?:=|:|is)?\s*(true|false|yes|no)/i);
      const hasBoolFlags = a1 !== undefined || a2 !== undefined || a3 !== undefined || a4 !== undefined;
      return {
        hasParams: hasBoolFlags,
        inputs: {
          analyzesImagesSignals: a1 ?? false,
          displaysMedicalInfo: a2 ?? false,
          supportsClinicianRecommendation: a3 ?? false,
          enablesIndependentReview: a4 ?? false,
        },
      };
    }

    default:
      return { inputs: {}, hasParams: false };
  }
}

function detectRuleIdFromQuestion(q: string, explicitRuleIdOnly: boolean): string | null {
  for (const id of KNOWN_RULE_IDS) {
    if (new RegExp(`\\b${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(q)) {
      return id;
    }
  }
  if (explicitRuleIdOnly) return null;

  if (/\breynolds\s*(?:number|flow|regime)?\b/i.test(q)) return "ENG-REYNOLDS";
  if (/\bohm(?:'?s)?\s*law\b/i.test(q)) return "ENG-OHMS-POWER";
  if (/\bideal\s*gas\b|\bpv\s*=\s*nrt\b/i.test(q)) return "SCI-IDEAL-GAS";
  if (/\bhenderson[\s-]*hasselbalch\b/i.test(q)) return "SCI-HENDERSON-HASSELBALCH";
  if (/\bpoa&?m\s*(?:remediation\s*)?sla\b/i.test(q)) return "RMF-POAM-SLA";
  if (/\bkatz\s*(?:corrected\s*)?(?:serum\s*)?sodium\b/i.test(q)) return "CLIN-CORRECTED-NA";
  if (/\b21\s*u\.?s\.?c\.?\s*(?:§|sec(?:tion)?)?\s*360j\b|\bnon[\s-]*device\s*cds\s*criteria\b/i.test(q)) return "LEGAL-CDS-21USC360J";
  return null;
}

/**
 * Executes matching NDKRS deterministic rules directly inside Noctis Chat and signs a
 * persistent Validation Certificate via `validateCrossDomainFactLock`.
 */
export async function tryExecuteNdkrsDeterministicRuleFromChat(
  question: string,
  options?: { explicitRuleIdOnly?: boolean },
): Promise<string | null> {
  const q = question.trim();
  if (!q) return null;

  const ruleId = detectRuleIdFromQuestion(q, Boolean(options?.explicitRuleIdOnly));
  if (!ruleId) return null;

  const { inputs, hasParams } = parseRuleInputsFromText(ruleId, q);
  if (!hasParams) return null;

  const exec = evaluateDeterministicRule(ruleId, inputs);
  if (!exec.ok && exec.verdict === "NOT_IMPLEMENTED") return null;

  const outputsMd = Object.entries(exec.outputs)
    .map(([k, v]) => `- **${k}:** \`${typeof v === "object" ? JSON.stringify(v) : String(v)}\``)
    .join("\n");

  const claimLockLines = exec.lockedClaims
    .map((c) => `- ${c.label}: ${c.expectedValue}${c.unit ? ` ${c.unit}` : ""}`)
    .join("\n");

  const summaryBody =
    `## NDKRS Deterministic Rule Execution — \`${exec.ruleId}\`\n\n` +
    `- **Domain:** \`${exec.domain}\`\n` +
    `- **Verdict:** \`${exec.verdict}\` (${exec.ok ? "VERIFIED COMPUTATION" : "SAFETY GUARD / INPUT CHECK"})\n` +
    `- **Authority:** ${exec.authorityCitation}\n\n` +
    `### Computed Outputs\n${outputsMd || "- None"}\n` +
    (claimLockLines ? `\n### Verified Claim Lock\n${claimLockLines}\n` : "");

  let certLine = "";
  if (exec.ok && exec.lockedClaims.length > 0) {
    try {
      const domainTyped = exec.domain as NdkrsDomain;
      const reqId = `CHAT-RULE-${sha256Sync(`${ruleId}::${q}`).slice(0, 10).toUpperCase()}`;
      const factLock = await validateCrossDomainFactLock({
        domain: domainTyped,
        requestId: reqId,
        rawPrompt: q,
        candidateText: summaryBody,
        lockedClaims: exec.lockedClaims,
        verifiedCitations: [exec.authorityCitation],
        expectedVerdict: exec.verdict,
        persist: true,
      });
      if (factLock.certificate) {
        certLine =
          `\n---\n**NDKRS Cross-Domain Fact-Lock Certificate:** \`${factLock.certificate.id}\` · ` +
          `Verdict: \`${factLock.certificate.verdict}\` · KeyMode: \`${factLock.certificate.keyMode}\` · ` +
          `HMAC: \`${factLock.certificate.hmacSignature.slice(0, 16)}...\``;
      }
    } catch {
      // Preserve deterministic output cleanly if certificate table is unavailable
    }
  }

  return `${summaryBody}${certLine}`;
}
