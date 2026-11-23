/**
 * Noctis Classification-Aware Security & Retrieval Gateway (NDIMP)
 *
 * Enforces hard security domain and classification boundaries:
 *  1. Fail-closed refusal when classified/compartmented payloads or markings enter
 *     an unclassified/commercial boundary — NEVER forwarded to commercial cloud LLMs.
 *  2. User security clearance NEVER authorizes cross-boundary processing on an
 *     unaccredited system.
 *  3. Strict classification filtering of NDKRS retrieval results so classified/SCI
 *     records can never be retrieved into a lower-authorized enclave.
 *  4. Deterministic Cross-Domain Solution (DoDI 8540.01 / ICD 501 / CNSSI 1253) checks.
 */

import { sha256Sync } from "../universal-crypto.ts";
import { DOD_IC_POLICY_REGISTRY, type DodIcPolicyRecord } from "./policy-registry.ts";

export type SecurityClassification = "UNCLASSIFIED" | "CUI" | "SECRET" | "TOP_SECRET" | "TS_SCI";

export const CLASSIFICATION_RANK: Record<SecurityClassification, number> = {
  UNCLASSIFIED: 0,
  CUI: 1,
  SECRET: 2,
  TOP_SECRET: 3,
  TS_SCI: 4,
};

export type DeploymentBoundary =
  | "COMMERCIAL_UNCLASSIFIED"
  | "FEDRAMP_MODERATE"
  | "FEDRAMP_HIGH"
  | "DOD_IL4_CUI"
  | "DOD_IL5_NSS"
  | "DOD_IL6_SECRET"
  | "IC_C2S_TS_SCI"
  | "AIRGAPPED_SCIF";

export interface BoundarySpec {
  id: DeploymentBoundary;
  label: string;
  maxClassification: SecurityClassification;
  allowsCommercialLlm: boolean;
  requiresSccaOrCds: boolean;
  governingStandard: string;
}

export const BOUNDARY_SPECS: Record<DeploymentBoundary, BoundarySpec> = {
  COMMERCIAL_UNCLASSIFIED: {
    id: "COMMERCIAL_UNCLASSIFIED",
    label: "Commercial Unclassified Cloud / SaaS Enclave",
    maxClassification: "UNCLASSIFIED",
    allowsCommercialLlm: true,
    requiresSccaOrCds: false,
    governingStandard: "EO 13526 / DoDM 5200.01 / NIST SP 800-53 (Unclassified Public Commercial Boundary)",
  },
  FEDRAMP_MODERATE: {
    id: "FEDRAMP_MODERATE",
    label: "FedRAMP Rev. 5 Moderate Boundary",
    maxClassification: "CUI",
    allowsCommercialLlm: false,
    requiresSccaOrCds: false,
    governingStandard: "FedRAMP Rev. 5 Moderate / 32 CFR Part 2002 (Civilian CUI)",
  },
  FEDRAMP_HIGH: {
    id: "FEDRAMP_HIGH",
    label: "FedRAMP Rev. 5 High Boundary",
    maxClassification: "CUI",
    allowsCommercialLlm: false,
    requiresSccaOrCds: false,
    governingStandard: "FedRAMP Rev. 5 High / NIST SP 800-171 (Non-DoD Federal High / CUI)",
  },
  DOD_IL4_CUI: {
    id: "DOD_IL4_CUI",
    label: "DoD CC SRG Impact Level 4 (CUI / Non-NSS)",
    maxClassification: "CUI",
    allowsCommercialLlm: false,
    requiresSccaOrCds: true,
    governingStandard: "DoDI 8510.01 / DoD CC SRG IL4 / SCCA",
  },
  DOD_IL5_NSS: {
    id: "DOD_IL5_NSS",
    label: "DoD CC SRG Impact Level 5 (High CUI / Unclassified NSS)",
    maxClassification: "CUI",
    allowsCommercialLlm: false,
    requiresSccaOrCds: true,
    governingStandard: "DoDI 8510.01 / DoD CC SRG IL5 / CNSSI 1253 / SCCA",
  },
  DOD_IL6_SECRET: {
    id: "DOD_IL6_SECRET",
    label: "DoD CC SRG Impact Level 6 (SIPRNet / SECRET)",
    maxClassification: "SECRET",
    allowsCommercialLlm: false,
    requiresSccaOrCds: true,
    governingStandard: "DoDI 8510.01 / DoD CC SRG IL6 / CNSSI 1253 SECRET Overlay",
  },
  IC_C2S_TS_SCI: {
    id: "IC_C2S_TS_SCI",
    label: "Accredited IC TS/SCI Cloud Enclave (ICD 503)",
    maxClassification: "TS_SCI",
    allowsCommercialLlm: false,
    requiresSccaOrCds: true,
    governingStandard: "ODNI ICD 503 (2024-10-25) / ICD 502 / ICD 501 / CNSSI 1253 Intelligence Overlay",
  },
  AIRGAPPED_SCIF: {
    id: "AIRGAPPED_SCIF",
    label: "Air-Gapped Accredited SCIF Environment (ICD 705)",
    maxClassification: "TS_SCI",
    allowsCommercialLlm: false,
    requiresSccaOrCds: true,
    governingStandard: "ICD 705 / ICD 503 / CNSSI 1253 / Physical & TEMPEST Accreditation",
  },
};

export interface ClassifiedMarkingDetection {
  containsMarkedClassifiedMaterial: boolean;
  detectedClassification: SecurityClassification;
  detectedMarkings: string[];
  reason: string;
}

const BANNER_OR_PORTION_PATTERNS: { re: RegExp; level: SecurityClassification; tag: string }[] = [
  { re: /\bTOP\s+SECRET\s*\/\/[^\s,;]{1,40}/gi, level: "TS_SCI", tag: "TS_SCI_BANNER_CAVEAT" },
  { re: /\(\s*TS\s*\/\/\s*(?:SI|TK|HCS|G|SCI|NOFORN|NF|ORCON|OC)[^)]*\)/gi, level: "TS_SCI", tag: "TS_PORTION_MARKING" },
  { re: /\(\s*U\/\/FOUO\s*\)/gi, level: "CUI", tag: "LEGACY_FOUO_PORTION_MARKING" },
  { re: /\bSECRET\s*\/\/\s*(?:NOFORN|REL\s+TO|ORCON|SI|TK|HCS|SAR)[^\s,;]*/gi, level: "SECRET", tag: "SECRET_BANNER_CAVEAT" },
  { re: /\(\s*S\s*\/\/\s*(?:NF|NOFORN|REL|OC|SI|TK)[^)]*\)/gi, level: "SECRET", tag: "SECRET_PORTION_MARKING" },
  { re: /^\s*CLASSIFICATION\s*:\s*(TOP\s+SECRET|SECRET|TS\/?SCI)\b/gim, level: "TS_SCI", tag: "EXPLICIT_CLASSIFICATION_HEADER" },
  { re: /\b(?:CLASSIFIED\s+BY|DERIVED\s+FROM|DECLASSIFY\s+ON)\s*:/gi, level: "SECRET", tag: "CLASSIFICATION_AUTHORITY_BLOCK" },
  { re: /\bCONFIDENTIAL\s*\/\/\s*(?:NOFORN|REL\s+TO|ORCON)\b/gi, level: "SECRET", tag: "CONFIDENTIAL_BANNER_CAVEAT" },
  { re: /\b(?:CUI\/\/SP-[A-Z0-9-]+|CONTROLLED\s+BY\s*:)\b/gi, level: "CUI", tag: "CUI_BANNER_BLOCK" },
];

const CLASSIFIED_INGESTION_INTENT_RE =
  /\b(?:analy[sz]e|summari[sz]e|process|translate|decode|paste|upload|ingest|review|read|evaluate|extract)\b[^.\n]{0,80}\b(?:this|my|our|the\s+following|attached|raw)\s+(?:[\w-]+\s+){0,2}(?:classified|top\s*secret|ts\/?sci|sci\b|secret\s+cable|intelligence\s+cable|intel\s+report|sipr|jwics|cui\s+document)\b/i;

export function detectClassifiedPayloadMarkings(text: string): ClassifiedMarkingDetection {
  const input = (text || "").trim();
  if (!input) {
    return {
      containsMarkedClassifiedMaterial: false,
      detectedClassification: "UNCLASSIFIED",
      detectedMarkings: [],
      reason: "Empty input.",
    };
  }

  let highest: SecurityClassification = "UNCLASSIFIED";
  const tags = new Set<string>();

  for (const pat of BANNER_OR_PORTION_PATTERNS) {
    const matches = input.match(pat.re);
    if (matches && matches.length > 0) {
      tags.add(pat.tag);
      let matchedLevel = pat.level;
      if (pat.tag === "EXPLICIT_CLASSIFICATION_HEADER") {
        matchedLevel = /TOP\s+SECRET|TS/i.test(matches[0] || "") ? "TS_SCI" : "SECRET";
      }
      if (CLASSIFICATION_RANK[matchedLevel] > CLASSIFICATION_RANK[highest]) {
        highest = matchedLevel;
      }
    }
  }

  // Detect explicit user request asking Noctis to process classified data on a commercial model (even without a banner)
  if (CLASSIFIED_INGESTION_INTENT_RE.test(input)) {
    tags.add("CLASSIFIED_PAYLOAD_PROCESSING_INTENT");
    const inferred = /\b(top\s*secret|ts\/?sci|\bsci\b|jwics)\b/i.test(input)
      ? "TS_SCI"
      : /\b(secret|sipr)\b/i.test(input)
      ? "SECRET"
      : "CUI";
    if (CLASSIFICATION_RANK[inferred] > CLASSIFICATION_RANK[highest]) {
      highest = inferred;
    }
  }

  // Standalone leading banner line like "TOP SECRET // SI" or "SECRET" alone at top of message
  const firstLine = input.split(/\r?\n/)[0]?.trim() || "";
  if (/^(?:TOP\s+SECRET(?:\s*\/\s*SCI)?|SECRET|CONFIDENTIAL)\s*(?:\(|—|--|$)/i.test(firstLine) && input.length > firstLine.length + 12) {
    const lineLevel: SecurityClassification = /TOP\s+SECRET|SCI/i.test(firstLine) ? "TS_SCI" : "SECRET";
    tags.add("LEADING_CLASSIFICATION_LINE");
    if (CLASSIFICATION_RANK[lineLevel] > CLASSIFICATION_RANK[highest]) {
      highest = lineLevel;
    }
  }

  const containsMarkedClassifiedMaterial = tags.size > 0 && highest !== "UNCLASSIFIED";
  return {
    containsMarkedClassifiedMaterial,
    detectedClassification: highest,
    detectedMarkings: [...tags],
    reason: containsMarkedClassifiedMaterial
      ? `Detected classified/controlled markings or processing intent (${highest}: ${[...tags].join(", ")}).`
      : "No classified document markings or classified payload processing attempt detected (unclassified policy/architecture discussion permitted).",
  };
}

export interface ClassificationGateResult {
  allowed: boolean;
  action: "ALLOW" | "FAIL_CLOSED_BLOCK";
  errorCode: "CLASSIFICATION_BOUNDARY_VIOLATION" | null;
  blockExternalLlm: boolean;
  targetBoundary: DeploymentBoundary;
  boundaryMaxClassification: SecurityClassification;
  detectedClassification: SecurityClassification;
  detectedMarkings: string[];
  claimedUserClearance: SecurityClassification | null;
  inputSha256: string;
  auditHash: string;
  authorityCitations: DodIcPolicyRecord[];
  refusalMarkdown: string | null;
  reason: string;
}

export function evaluateClassificationGate(input: {
  text: string;
  targetBoundary?: DeploymentBoundary;
  claimedPayloadClassification?: SecurityClassification | null;
  claimedUserClearance?: SecurityClassification | null;
  requestedModelTarget?: "COMMERCIAL_CLOUD_LLM" | "ACCREDITED_GOVCLOUD_ENCLAVE" | "AIRGAPPED_SCIF_MODEL";
}): ClassificationGateResult {
  const boundaryId = input.targetBoundary || "COMMERCIAL_UNCLASSIFIED";
  const spec = BOUNDARY_SPECS[boundaryId];
  const detection = detectClassifiedPayloadMarkings(input.text);
  const effectiveDetected =
    input.claimedPayloadClassification &&
    CLASSIFICATION_RANK[input.claimedPayloadClassification] > CLASSIFICATION_RANK[detection.detectedClassification]
      ? input.claimedPayloadClassification
      : detection.detectedClassification;

  const modelTarget = input.requestedModelTarget || "COMMERCIAL_CLOUD_LLM";
  const exceedsBoundary = CLASSIFICATION_RANK[effectiveDetected] > CLASSIFICATION_RANK[spec.maxClassification];
  const violatesCommercialGuard =
    effectiveDetected !== "UNCLASSIFIED" &&
    (modelTarget === "COMMERCIAL_CLOUD_LLM" || spec.allowsCommercialLlm);

  const shouldBlock =
    (detection.containsMarkedClassifiedMaterial || Boolean(input.claimedPayloadClassification)) &&
    (exceedsBoundary || violatesCommercialGuard);

  // Never hash or store raw classified text in return payload; store SHA-256 + structural metadata only
  const inputSha256 = sha256Sync(input.text || "");
  const auditHash = sha256Sync(
    JSON.stringify({
      action: shouldBlock ? "FAIL_CLOSED_BLOCK" : "ALLOW",
      boundaryId,
      modelTarget,
      effectiveDetected,
      markings: detection.detectedMarkings,
      inputSha256,
    }),
  );

  const authorities = [DOD_IC_POLICY_REGISTRY["EO-13526-DODM-5200.01"]!, DOD_IC_POLICY_REGISTRY["ICD-503"]!];

  if (shouldBlock) {
    const refusalMarkdown = [
      `## ⛔ CLASSIFICATION & AUTHORIZATION BOUNDARY BLOCK (\`FAIL_CLOSED_BLOCK\`)`,
      "",
      `- **Error Code:** \`CLASSIFICATION_BOUNDARY_VIOLATION\``,
      `- **Detected Material Tier:** **${effectiveDetected}** (Signals: \`${detection.detectedMarkings.join(", ") || "EXPLICIT_PAYLOAD_CLASSIFICATION"}\`)`,
      `- **Active System Boundary:** \`${spec.id}\` (Max Permitted Classification: **${spec.maxClassification}** · External Commercial LLM Blocked: **true**)`,
      `- **Sanitized Input SHA-256:** \`${inputSha256}\` *(raw input withheld from external model dispatch and persistent text storage)*`,
      "",
      "### Mandatory Governance Rule (EO 13526 / DoDM 5200.01 / ODNI ICD 503)",
      "1. **Clearance != System Accreditation:** Holding a personal security clearance (even TS/SCI) and need-to-know **does NOT authorize** processing, summarizing, or transmitting classified or compartmented material into a commercial cloud model or lower-classification enclave.",
      "2. **Zero External LLM Dispatch:** Noctis terminated processing before external model routing (`blockExternalLlm = true`).",
      "3. **Required Action:**",
      "   - Process classified material **exclusively inside an accredited system boundary** (e.g., `DOD_IL6_SECRET` SIPRNet, `IC_C2S_TS_SCI` JWICS/IC Cloud, or an `ICD 705` `AIRGAPPED_SCIF` enclave).",
      "   - If real classified content was pasted onto an unclassified workstation or commercial network, follow your organization's **classified spillage SOP** immediately (isolate endpoint, preserve timestamps, do not forward or delete unilaterally, and notify your ISSO/FSO).",
      "",
      `---`,
      `**Classification Boundary Gate** · Authorities: \`EO 13526 / DoDM 5200.01\`, \`ICD 503 (2024-10-25)\`, \`ICD 501 (2009-01-21)\` · Audit SHA-256: \`${auditHash.slice(0, 12)}\``,
    ].join("\n");

    return {
      allowed: false,
      action: "FAIL_CLOSED_BLOCK",
      errorCode: "CLASSIFICATION_BOUNDARY_VIOLATION",
      blockExternalLlm: true,
      targetBoundary: boundaryId,
      boundaryMaxClassification: spec.maxClassification,
      detectedClassification: effectiveDetected,
      detectedMarkings: detection.detectedMarkings,
      claimedUserClearance: input.claimedUserClearance ?? null,
      inputSha256,
      auditHash,
      authorityCitations: authorities,
      refusalMarkdown,
      reason: `Blocked ${effectiveDetected} material from ${spec.id} / ${modelTarget}: personal clearance does not override system accreditation boundaries.`,
    };
  }

  return {
    allowed: true,
    action: "ALLOW",
    errorCode: null,
    blockExternalLlm: false,
    targetBoundary: boundaryId,
    boundaryMaxClassification: spec.maxClassification,
    detectedClassification: effectiveDetected,
    detectedMarkings: detection.detectedMarkings,
    claimedUserClearance: input.claimedUserClearance ?? null,
    inputSha256,
    auditHash,
    authorityCitations: authorities,
    refusalMarkdown: null,
    reason: detection.reason,
  };
}

export function filterRecordsByClassificationBoundary<
  T extends { classification?: SecurityClassification; compartments?: string[] },
>(
  records: T[],
  maxBoundaryClassification: SecurityClassification = "UNCLASSIFIED",
  authorizedCompartments: string[] = [],
): {
  allowedRecords: T[];
  blockedCount: number;
  boundaryViolationPrevented: boolean;
} {
  const maxRank = CLASSIFICATION_RANK[maxBoundaryClassification] ?? 0;
  const authSet = new Set(authorizedCompartments.map((c) => c.toUpperCase()));
  const allowedRecords: T[] = [];
  let blockedCount = 0;

  for (const rec of records) {
    const recLevel: SecurityClassification = rec.classification || "UNCLASSIFIED";
    const recRank = CLASSIFICATION_RANK[recLevel] ?? 4;
    const reqComps = Array.isArray(rec.compartments) ? rec.compartments : [];
    const hasUnauthComp = reqComps.some((c) => !authSet.has(c.toUpperCase()));

    if (recRank <= maxRank && !hasUnauthComp) {
      allowedRecords.push(rec);
    } else {
      blockedCount += 1;
    }
  }

  return {
    allowedRecords,
    blockedCount,
    boundaryViolationPrevented: blockedCount > 0,
  };
}

export interface CrossDomainEvaluationResult {
  ruleId: "DOD-CDS-001";
  ruleVersion: "1.0.0";
  verdict: "PASS" | "FAIL" | "INSUFFICIENT_EVIDENCE" | "MANUAL_REVIEW_REQUIRED";
  assessmentMode: "SCENARIO_ASSUMPTION" | "FORMAL_EVIDENCE_AUDIT";
  formalDetermination: "PASS" | "FAIL" | "PENDING_EVIDENCE" | "INSUFFICIENT_EVIDENCE" | "MANUAL_REVIEW_REQUIRED";
  summary: string;
  direction: "HIGH_TO_LOW" | "LOW_TO_HIGH" | "PEER_BOUNDARY";
  sourceClassification: SecurityClassification;
  targetClassification: SecurityClassification;
  missingControls: string[];
  requiredEvidence: string[];
  authorityCitations: DodIcPolicyRecord[];
  auditHash: string;
}

export function evaluateCrossDomainTransfer(input: {
  sourceClassification: SecurityClassification;
  targetClassification: SecurityClassification;
  accreditedCdsPresent?: boolean | null;
  ncdsmoRaiseTheBarCompliant?: boolean | null;
  securityLabelingVerified?: boolean | null;
  releaseAuthorityApproved?: boolean | null;
  immutableAuditLogging?: boolean | null;
  assessmentMode?: "SCENARIO_ASSUMPTION" | "FORMAL_EVIDENCE_AUDIT";
  evidenceVerified?: boolean;
}): CrossDomainEvaluationResult {
  const srcRank = CLASSIFICATION_RANK[input.sourceClassification];
  const dstRank = CLASSIFICATION_RANK[input.targetClassification];
  const direction: CrossDomainEvaluationResult["direction"] =
    srcRank > dstRank ? "HIGH_TO_LOW" : srcRank < dstRank ? "LOW_TO_HIGH" : "PEER_BOUNDARY";
  const isScenario = input.assessmentMode === "SCENARIO_ASSUMPTION" && input.evidenceVerified !== true;

  const missing: string[] = [];
  if (input.accreditedCdsPresent === false) missing.push("No accredited Cross Domain Solution (CDS) between domains");
  if (input.ncdsmoRaiseTheBarCompliant === false) missing.push("CDS does not meet NCDSMO Raise-the-Bar filters/signatures");
  if (input.securityLabelingVerified === false) missing.push("Mandatory security label & cryptographic binding validation missing");
  if (direction === "HIGH_TO_LOW" && input.releaseAuthorityApproved === false) {
    missing.push("Authorized human/policy release & sanitization approval missing for High-to-Low transfer");
  }
  if (input.immutableAuditLogging === false) missing.push("Immutable cross-domain transfer audit logging disabled");

  const hasUnknowns =
    input.accreditedCdsPresent == null ||
    input.securityLabelingVerified == null ||
    (direction === "HIGH_TO_LOW" && input.releaseAuthorityApproved == null);

  const verdict: CrossDomainEvaluationResult["verdict"] =
    missing.length > 0
      ? "FAIL"
      : hasUnknowns
      ? "INSUFFICIENT_EVIDENCE"
      : direction === "HIGH_TO_LOW" && input.ncdsmoRaiseTheBarCompliant == null
      ? "MANUAL_REVIEW_REQUIRED"
      : "PASS";

  const requiredEvidence = [
    "NCDSMO CDS Baseline List entry / accredited Cross Domain Appendix & Raise-the-Bar test report",
    "Signed Security Policy Routing & Schema Filter rules (XML/JSON dirty-word & covert-channel checks)",
    "Cross-Domain Authorization Agreement signed by BOTH Source and Target Authorizing Officials",
    "Immutable transfer audit logs correlated with SIEM",
  ];

  const auditHash = sha256Sync(JSON.stringify({ ruleId: "DOD-CDS-001", direction, verdict, input }));
  const summary =
    verdict === "FAIL"
      ? `${isScenario ? "SCENARIO FAIL" : "FAIL"}: ${direction} cross-domain flow (${input.sourceClassification} -> ${input.targetClassification}) violates DoDI 8540.01 / CNSSI 1253 CDS requirements: ${missing.join("; ")}.`
      : verdict === "INSUFFICIENT_EVIDENCE"
      ? "INSUFFICIENT_EVIDENCE: Missing CDS accreditation, label verification, or High-to-Low release approval artifacts."
      : verdict === "MANUAL_REVIEW_REQUIRED"
      ? `MANUAL_REVIEW_REQUIRED: Verify NCDSMO Raise-the-Bar compliance and bilateral AO sign-off for ${direction} transfer.`
      : `${isScenario ? "SCENARIO PASS" : "PASS"}: ${direction} flow (${input.sourceClassification} -> ${input.targetClassification}) satisfies accredited CDS, labeling, release, and audit gates.`;

  return {
    ruleId: "DOD-CDS-001",
    ruleVersion: "1.0.0",
    verdict,
    assessmentMode: input.assessmentMode ?? "FORMAL_EVIDENCE_AUDIT",
    formalDetermination: isScenario ? "PENDING_EVIDENCE" : verdict,
    summary,
    direction,
    sourceClassification: input.sourceClassification,
    targetClassification: input.targetClassification,
    missingControls: missing,
    requiredEvidence,
    authorityCitations: [DOD_IC_POLICY_REGISTRY["DODI-8540.01"]!, DOD_IC_POLICY_REGISTRY["CNSSI-1253"]!, DOD_IC_POLICY_REGISTRY["ICD-501"]!],
    auditHash,
  };
}
