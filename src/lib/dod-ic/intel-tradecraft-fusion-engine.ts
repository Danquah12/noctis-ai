/**
 * Noctis Intelligence Analysis & UNCLASSIFIED / Synthetic Multi-INT Fusion Engine (NDIMP Wave 3)
 *
 * Implements:
 *  - IC-ICD203-ACH-001: ODNI ICD 203 Analytic Standards, ICD 206 Sourcing, NATO/Admiralty 6x6 & ACH Falsification Matrix
 *  - IC-MULTIINT-FUSION-001: UNCLASSIFIED / Synthetic OSINT / GEOINT (Haversine) / SIGINT (ITU Bands) / CI Fusion
 */

import { sha256Sync } from "../universal-crypto.ts";
import { evaluateClassificationGate } from "./classification-gateway.ts";
import type { AssessmentMode, DodIcRuleResult, DodVerdict } from "./dod-rmf-engine.ts";
import { DOD_IC_POLICY_REGISTRY } from "./policy-registry.ts";

export type AnalyticConfidence = "LOW" | "MODERATE" | "HIGH";
export type AchRating = "CONSISTENT" | "INCONSISTENT" | "NEUTRAL";

export interface AdmiraltyDecoding {
  code: string;
  reliabilityLetter: string;
  reliabilityLabel: string;
  credibilityDigit: string;
  credibilityLabel: string;
  weight: number;
  unreliableOrUnjudged: boolean;
}

const RELIABILITY_MAP: Record<string, { label: string; score: number }> = {
  A: { label: "Completely Reliable", score: 1.0 },
  B: { label: "Usually Reliable", score: 0.85 },
  C: { label: "Fairly Reliable", score: 0.65 },
  D: { label: "Not Usually Reliable", score: 0.4 },
  E: { label: "Unreliable", score: 0.2 },
  F: { label: "Reliability Cannot Be Judged", score: 0.25 },
};

const CREDIBILITY_MAP: Record<string, { label: string; score: number }> = {
  "1": { label: "Confirmed by Other Sources", score: 1.0 },
  "2": { label: "Probably True", score: 0.85 },
  "3": { label: "Possibly True", score: 0.65 },
  "4": { label: "Doubtful", score: 0.4 },
  "5": { label: "Improbable", score: 0.2 },
  "6": { label: "Truth Cannot Be Judged", score: 0.25 },
};

/** Decodes NATO / Admiralty 6x6 source reliability and information credibility code (e.g., B2, F6). */
export function decodeAdmiraltyCode(rawCode: string): AdmiraltyDecoding {
  const clean = (rawCode || "").trim().toUpperCase().replace(/[^A-F1-6]/g, "");
  const r = clean[0] && RELIABILITY_MAP[clean[0]] ? clean[0] : "F";
  const c = clean[1] && CREDIBILITY_MAP[clean[1]] ? clean[1] : "6";
  const rInfo = RELIABILITY_MAP[r]!;
  const cInfo = CREDIBILITY_MAP[c]!;
  return {
    code: `${r}${c}`,
    reliabilityLetter: r,
    reliabilityLabel: rInfo.label,
    credibilityDigit: c,
    credibilityLabel: cInfo.label,
    weight: Number(((rInfo.score + cInfo.score) / 2).toFixed(2)),
    unreliableOrUnjudged: r === "E" || r === "F" || c === "5" || c === "6",
  };
}

export interface AchHypothesisRanking {
  id: string;
  label: string;
  inconsistentCount: number;
  weightedInconsistency: number;
  consistentCount: number;
  rank: number;
  status: "STRONGEST_SURVIVING" | "VIABLE_ALTERNATIVE" | "REFUTED_MOST_INCONSISTENT";
}

export interface Icd203AchResult {
  ruleResult: DodIcRuleResult;
  rankings: AchHypothesisRanking[];
  admiraltySummaries: AdmiraltyDecoding[];
}

/** Runs Analysis of Competing Hypotheses (ACH) falsification solver + ODNI ICD 203 / ICD 206 confidence verification. */
export function evaluateIcd203AndAchAnalysis(input: {
  hypotheses?: { id: string; label: string }[];
  evidence?: {
    id: string;
    description: string;
    admiraltyCode: string;
    ratingsByHypothesis: Record<string, AchRating>;
  }[];
  admiraltyCodes?: string[];
  sourceCount?: number | null;
  claimedConfidence?: AnalyticConfidence | null;
  claimedLikelihood?: string | null;
  alternativesConsidered?: boolean | null;
  keyAssumptionsExplicit?: boolean | null;
  sourcesDocumentedPerIcd206?: boolean | null;
  assessmentMode?: AssessmentMode;
  evidenceVerified?: boolean;
}): Icd203AchResult {
  const mode: AssessmentMode = input.assessmentMode ?? "SCENARIO_ASSUMPTION";
  const isScenario = mode === "SCENARIO_ASSUMPTION" && input.evidenceVerified !== true;
  const hyps = input.hypotheses ?? [];
  const evList = input.evidence ?? [];

  const codes = [...(input.admiraltyCodes ?? []), ...evList.map((e) => e.admiraltyCode)].filter(Boolean);
  const decodedList = codes.map(decodeAdmiraltyCode);

  const rankings: AchHypothesisRanking[] = hyps
    .map((h) => {
      let inc = 0;
      let weightedInc = 0;
      let cons = 0;
      for (const ev of evList) {
        const w = decodeAdmiraltyCode(ev.admiraltyCode).weight;
        const rating = ev.ratingsByHypothesis[h.id] || "NEUTRAL";
        if (rating === "INCONSISTENT") {
          inc += 1;
          weightedInc += w;
        } else if (rating === "CONSISTENT") {
          cons += 1;
        }
      }
      return {
        id: h.id,
        label: h.label,
        inconsistentCount: inc,
        weightedInconsistency: Number(weightedInc.toFixed(2)),
        consistentCount: cons,
        rank: 0,
        status: "VIABLE_ALTERNATIVE" as AchHypothesisRanking["status"],
      };
    })
    .sort((a, b) => a.inconsistentCount - b.inconsistentCount || a.weightedInconsistency - b.weightedInconsistency || b.consistentCount - a.consistentCount);

  rankings.forEach((r, idx) => {
    r.rank = idx + 1;
    r.status = idx === 0 ? "STRONGEST_SURVIVING" : idx === rankings.length - 1 && r.inconsistentCount > rankings[0]!.inconsistentCount ? "REFUTED_MOST_INCONSISTENT" : "VIABLE_ALTERNATIVE";
  });

  const blockers: string[] = [];
  const sourceCount = input.sourceCount ?? (evList.length > 0 ? evList.length : null);
  const allUnreliableOrSingleF6 =
    decodedList.length > 0 &&
    decodedList.every((d) => d.unreliableOrUnjudged) &&
    (sourceCount === null || sourceCount <= 1);

  if (input.claimedConfidence === "HIGH" && (allUnreliableOrSingleF6 || decodedList.some((d) => d.code === "F6") && (sourceCount ?? 1) <= 1)) {
    blockers.push("ICD 203/206 Violation: Single-source uncorroborated reporting graded E/F or 5/6 (e.g., F6) CANNOT justify a HIGH Confidence judgment");
  }
  if (input.alternativesConsidered === false) {
    blockers.push("ICD 203 Standard E violated: plausible alternative hypotheses were not evaluated");
  }
  if (input.keyAssumptionsExplicit === false) {
    blockers.push("ICD 203 Standard violated: key analytic assumptions left implicit");
  }
  if (input.sourcesDocumentedPerIcd206 === false) {
    blockers.push("ICD 206 sourcing requirements violated: source characterization missing");
  }

  const hasAnySignal =
    hyps.length > 0 ||
    decodedList.length > 0 ||
    input.claimedConfidence != null ||
    input.alternativesConsidered != null ||
    input.keyAssumptionsExplicit != null;

  const verdict: DodVerdict = !hasAnySignal
    ? "INSUFFICIENT_EVIDENCE"
    : blockers.length > 0
    ? "FAIL"
    : input.alternativesConsidered == null && hyps.length === 0
    ? "MANUAL_REVIEW_REQUIRED"
    : "PASS";

  const observedFacts: Record<string, string | number | boolean | null> = {
    hypothesisCount: hyps.length,
    evidenceItemCount: evList.length,
    strongestHypothesis: rankings[0]?.id ?? null,
    strongestInconsistentCount: rankings[0]?.inconsistentCount ?? null,
    admiraltyCodes: decodedList.map((d) => d.code).join(",") || null,
    claimedConfidence: input.claimedConfidence ?? null,
    sourceCount,
    alternativesConsidered: input.alternativesConsidered ?? null,
  };

  const ruleResult: DodIcRuleResult = {
    ruleId: "IC-ICD203-ACH-001",
    ruleVersion: "2023.06",
    jurisdiction: "IC",
    title: "ODNI ICD 203/206 Analytic Tradecraft, NATO 6x6 Grading & ACH Falsification",
    verdict,
    assessmentMode: mode,
    formalDetermination: isScenario ? "PENDING_EVIDENCE" : verdict,
    summary:
      blockers.length > 0
        ? `FAIL [IC-ICD203-ACH-001]: ${blockers.join("; ")}.`
        : rankings.length > 0
        ? `PASS [IC-ICD203-ACH-001]: ACH ranked ${rankings[0]!.id} ("${rankings[0]!.label}") strongest with ${rankings[0]!.inconsistentCount} disconfirming item(s); ICD 203/206 standards met.`
        : "PASS [IC-ICD203-ACH-001]: Confidence calibration and ICD 203/206 sourcing standards satisfied.",
    observedFacts,
    threshold: "ICD 203 alternative analysis + ICD 206 sourcing + NATO 6x6 grading; F6/single-source cannot justify HIGH confidence",
    variance: blockers.length > 0 ? blockers.join("; ") : "Analytic tradecraft & confidence calibration aligned with ICD 203/206",
    missingEvidence: ["ICD 206 Source Summary Matrix & independent peer/tradecraft review sheet"],
    authorityCitations: [DOD_IC_POLICY_REGISTRY["ICD-203-206-ANALYTIC"]!],
    aiCanIssueAto: false,
    auditHash: sha256Sync(JSON.stringify({ ruleId: "IC-ICD203-ACH-001", verdict, observedFacts, rankings })),
  };

  return { ruleResult, rankings, admiraltySummaries: decodedList };
}

export function computeHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371.0;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Number((2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(3));
}

export function classifyItuRadioBand(frequencyMhz: number): string {
  if (frequencyMhz >= 30000) return "EHF (30–300 GHz / Ka-band & mmWave)";
  if (frequencyMhz >= 3000) return "SHF (3–30 GHz / X, Ku, K-band)";
  if (frequencyMhz >= 300) return "UHF (300–3000 MHz / L & S-band)";
  if (frequencyMhz >= 30) return "VHF (30–300 MHz)";
  if (frequencyMhz >= 3) return "HF (3–30 MHz)";
  return "Sub-HF (<3 MHz)";
}

export interface MultiIntFusionResult {
  ruleResult: DodIcRuleResult;
  haversineDistanceKm: number | null;
  ituRfBand: string | null;
  corroboratedDisciplines: string[];
}

/** Evaluates UNCLASSIFIED / synthetic Multi-INT fusion (OSINT, GEOINT Haversine, SIGINT ITU band, CI). */
export function evaluateMultiIntSyntheticFusion(input: {
  summaryText?: string | null;
  disciplinesPresent?: ("OSINT" | "GEOINT" | "SIGINT" | "MASINT" | "CI")[];
  osintProvenanceVerified?: boolean | null;
  geointCoordinatesA?: { lat: number; lon: number } | null;
  geointCoordinatesB?: { lat: number; lon: number } | null;
  geospatialToleranceKm?: number;
  sigintFrequencyMhz?: number | null;
  ciDeceptionIndicatorsPresent?: boolean | null;
  claimsMultiIntVerifiedGroundTruth?: boolean | null;
  assessmentMode?: AssessmentMode;
  evidenceVerified?: boolean;
}): MultiIntFusionResult {
  const mode: AssessmentMode = input.assessmentMode ?? "SCENARIO_ASSUMPTION";
  const isScenario = mode === "SCENARIO_ASSUMPTION" && input.evidenceVerified !== true;
  const blockers: string[] = [];

  if (input.summaryText) {
    const clsGate = evaluateClassificationGate({ text: input.summaryText });
    if (clsGate.action === "FAIL_CLOSED_BLOCK") {
      blockers.push(`Classification Gate violation (${clsGate.detectedClassification}): Multi-INT fusion engine here handles strictly UNCLASSIFIED/synthetic inputs`);
    }
  }

  const disciplines = [...new Set(input.disciplinesPresent ?? [])];
  let distKm: number | null = null;
  if (input.geointCoordinatesA && input.geointCoordinatesB) {
    distKm = computeHaversineKm(
      input.geointCoordinatesA.lat,
      input.geointCoordinatesA.lon,
      input.geointCoordinatesB.lat,
      input.geointCoordinatesB.lon,
    );
    const tol = input.geospatialToleranceKm ?? 5;
    if (distKm > tol) {
      blockers.push(`GEOINT coordinate divergence ${distKm} km exceeds ${tol} km correlation threshold`);
    }
  }

  const band = typeof input.sigintFrequencyMhz === "number" && input.sigintFrequencyMhz > 0 ? classifyItuRadioBand(input.sigintFrequencyMhz) : null;

  if (input.claimsMultiIntVerifiedGroundTruth === true && disciplines.length < 2) {
    blockers.push(`Uncorroborated single-INT (${disciplines[0] || "NONE"}) CANNOT be asserted as Multi-INT verified ground truth`);
  }
  if (input.osintProvenanceVerified === false) {
    blockers.push("OSINT source provenance unverified / potential synthetic manipulation detected");
  }
  if (input.ciDeceptionIndicatorsPresent === true) {
    blockers.push("Counterintelligence deception / denial-and-deception (D&D) indicators require human analyst review");
  }

  const hasAnySignal =
    disciplines.length > 0 || distKm !== null || band !== null || input.claimsMultiIntVerifiedGroundTruth != null || input.osintProvenanceVerified != null;

  const verdict: DodVerdict = !hasAnySignal ? "INSUFFICIENT_EVIDENCE" : blockers.length > 0 ? "FAIL" : "PASS";

  const observedFacts: Record<string, string | number | boolean | null> = {
    disciplinesPresent: disciplines.join(",") || null,
    disciplineCount: disciplines.length,
    haversineDistanceKm: distKm,
    ituRfBand: band,
    osintProvenanceVerified: input.osintProvenanceVerified ?? null,
    ciDeceptionIndicatorsPresent: input.ciDeceptionIndicatorsPresent ?? null,
    claimsMultiIntVerifiedGroundTruth: input.claimsMultiIntVerifiedGroundTruth ?? null,
  };

  const ruleResult: DodIcRuleResult = {
    ruleId: "IC-MULTIINT-FUSION-001",
    ruleVersion: "2023.01.01",
    jurisdiction: "IC",
    title: "UNCLASSIFIED / Synthetic Multi-INT Fusion (OSINT/GEOINT/SIGINT/CI)",
    verdict,
    assessmentMode: mode,
    formalDetermination: isScenario ? "PENDING_EVIDENCE" : verdict,
    summary:
      blockers.length > 0
        ? `FAIL [IC-MULTIINT-FUSION-001]: ${blockers.join("; ")}.`
        : `PASS [IC-MULTIINT-FUSION-001]: Correlated ${disciplines.length} INT discipline(s)${distKm !== null ? ` (GEOINT Haversine delta: ${distKm} km)` : ""}${band ? ` · RF Band: ${band}` : ""}.`,
    observedFacts,
    threshold: ">=2 corroborated INTs for ground truth, strictly UNCLASSIFIED/synthetic inputs, GEOINT Haversine delta within tolerance",
    variance: blockers.length > 0 ? blockers.join("; ") : "Multi-INT synthetic correlation verified",
    missingEvidence: ["Synthetic/unclassified sensor metadata & independent corroborating INT artifact"],
    authorityCitations: [DOD_IC_POLICY_REGISTRY["MULTI-INT-FUSION-GOV"]!, DOD_IC_POLICY_REGISTRY["ICD-203-206-ANALYTIC"]!],
    aiCanIssueAto: false,
    auditHash: sha256Sync(JSON.stringify({ ruleId: "IC-MULTIINT-FUSION-001", verdict, observedFacts })),
  };

  return { ruleResult, haversineDistanceKm: distKm, ituRfBand: band, corroboratedDisciplines: disciplines };
}
