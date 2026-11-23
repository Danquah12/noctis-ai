/**
 * Noctis Classified Systems Security Engine (NDIMP Wave 2 — Step 1)
 *
 * Implements strictly UNCLASSIFIED public governance rules:
 *  - DOD-SCIF-705-001: ODNI ICD 705 / ICS 705-1 / IC Tech Spec v1.5.1 SCIF Physical & PED Readiness
 *  - DOD-COMSEC-CSFC-001: DoDI 8523.01 / CNSSI 4005 COMSEC + CNSSP 15 CNSA 2.0 + NSA CSfC Dual-Layer Architecture
 *  - DOD-TEMPEST-RB-001: CNSSAM TEMPEST/01-13 RED/BLACK Separation & CTTA Authority (never fabricates classified specs)
 *  - DOD-SANITIZE-88-001: NIST SP 800-88 Rev. 2 Media Sanitization & DoDM 5200.01 Classified Spillage Governance
 */

import { sha256Sync } from "../universal-crypto.ts";
import type { SecurityClassification } from "./classification-gateway.ts";
import type { AssessmentMode, DodIcRuleResult, DodVerdict } from "./dod-rmf-engine.ts";
import { DOD_IC_POLICY_REGISTRY, type DodIcPolicyRecord } from "./policy-registry.ts";

function finalizeClassifiedRule(params: {
  ruleId: string;
  ruleVersion: string;
  jurisdiction: DodIcRuleResult["jurisdiction"];
  title: string;
  blockers: string[];
  hasAnySignal: boolean;
  hasMissingRequired: boolean;
  summaryPass: string;
  threshold: string;
  variancePass: string;
  observedFacts: Record<string, string | number | boolean | null>;
  missingEvidence: string[];
  authorityCitations: DodIcPolicyRecord[];
  assessmentMode?: AssessmentMode;
  evidenceVerified?: boolean;
}): DodIcRuleResult {
  const mode: AssessmentMode = params.assessmentMode ?? "SCENARIO_ASSUMPTION";
  const isScenario = mode === "SCENARIO_ASSUMPTION" && params.evidenceVerified !== true;
  const verdict: DodVerdict = !params.hasAnySignal
    ? "INSUFFICIENT_EVIDENCE"
    : params.blockers.length > 0
    ? "FAIL"
    : params.hasMissingRequired
    ? "MANUAL_REVIEW_REQUIRED"
    : "PASS";
  const formalDetermination: DodIcRuleResult["formalDetermination"] = isScenario ? "PENDING_EVIDENCE" : verdict;
  const variance =
    params.blockers.length > 0
      ? params.blockers.join("; ")
      : verdict === "PASS"
      ? params.variancePass
      : "Incomplete verification signals require CSA/AO/CTTA inspection.";
  const summary =
    params.blockers.length > 0
      ? `FAIL [${params.ruleId}]: ${params.blockers.join("; ")}.`
      : verdict === "PASS"
      ? params.summaryPass
      : `${verdict} [${params.ruleId}]: Partial signals supplied; ${params.missingEvidence[0] || "formal evidence required"}.`;

  return {
    ruleId: params.ruleId,
    ruleVersion: params.ruleVersion,
    jurisdiction: params.jurisdiction,
    title: params.title,
    verdict,
    assessmentMode: mode,
    formalDetermination,
    summary,
    observedFacts: params.observedFacts,
    threshold: params.threshold,
    variance,
    missingEvidence: params.missingEvidence,
    authorityCitations: params.authorityCitations,
    aiCanIssueAto: false,
    auditHash: sha256Sync(JSON.stringify({ ruleId: params.ruleId, verdict, observedFacts: params.observedFacts, blockers: params.blockers })),
  };
}

export interface ScifAssessmentResult {
  ruleResult: DodIcRuleResult;
  accreditingAuthority: "COGNIZANT_SECURITY_AUTHORITY_AO";
  pedViolationDetected: boolean;
}

/** Evaluates ICD 705 / ICS 705-1 SCIF physical, IDS, access-control, and PED governance. */
export function evaluateScifIcd705Compliance(input: {
  aoAccreditationActive?: boolean | null;
  fixedFacilityChecklistCurrent?: boolean | null;
  idsUl2050Monitored?: boolean | null;
  accessControlAndVisitorEscortEnforced?: boolean | null;
  pedProhibitionEnforced?: boolean | null;
  acousticAndRfInspectionComplete?: boolean | null;
  coUtilizationAgreementIfShared?: boolean | null;
  assessmentMode?: AssessmentMode;
  evidenceVerified?: boolean;
}): ScifAssessmentResult {
  const blockers: string[] = [];
  if (input.aoAccreditationActive === false) blockers.push("Missing active written SCIF accreditation from Cognizant Security Authority / AO");
  if (input.fixedFacilityChecklistCurrent === false) blockers.push("Fixed Facility Checklist (FFC) is missing or stale");
  if (input.idsUl2050Monitored === false) blockers.push("Continuous UL 2050 IDS alarm monitoring not enforced");
  if (input.accessControlAndVisitorEscortEnforced === false) blockers.push("Positive access control / cleared escorting violated");
  if (input.pedProhibitionEnforced === false) blockers.push("Unauthorized Portable Electronic Devices (PEDs / smartphones / Bluetooth / smartwatches) inside SCIF violate ICD 705");
  if (input.acousticAndRfInspectionComplete === false) blockers.push("Acoustic and RF shielding verification incomplete");
  if (input.coUtilizationAgreementIfShared === false) blockers.push("Shared SCIF lacks approved formal co-utilization agreement");

  const hasAnySignal =
    input.aoAccreditationActive != null ||
    input.fixedFacilityChecklistCurrent != null ||
    input.idsUl2050Monitored != null ||
    input.accessControlAndVisitorEscortEnforced != null ||
    input.pedProhibitionEnforced != null ||
    input.acousticAndRfInspectionComplete != null ||
    input.coUtilizationAgreementIfShared != null;

  const missingEvidence = [
    "Signed CSA/AO SCIF Accreditation Letter and current Fixed Facility Checklist (FFC)",
    "UL 2050 Intrusion Detection System test log & PED inspection signage/screening roster",
  ];

  const ruleResult = finalizeClassifiedRule({
    ruleId: "DOD-SCIF-705-001",
    ruleVersion: "2021.07",
    jurisdiction: "IC",
    title: "SCIF Physical & PED Readiness (ICD 705 / ICS 705-1 / IC Tech Spec v1.5.1)",
    blockers,
    hasAnySignal,
    hasMissingRequired:
      input.aoAccreditationActive == null || input.fixedFacilityChecklistCurrent == null || input.pedProhibitionEnforced == null,
    summaryPass: "PASS [DOD-SCIF-705-001]: Scenario SCIF physical, IDS, FFC, and PED controls align with ICD 705 / ICS 705-1 (CSA/AO accreditation remains strictly authoritative).",
    threshold: "Active CSA/AO accreditation, current FFC, UL 2050 IDS, positive access control, zero unauthorized PEDs inside SCIF",
    variancePass: "Zero ICD 705 physical or PED compliance variances detected in scenario inputs",
    observedFacts: {
      aoAccreditationActive: input.aoAccreditationActive ?? null,
      fixedFacilityChecklistCurrent: input.fixedFacilityChecklistCurrent ?? null,
      idsUl2050Monitored: input.idsUl2050Monitored ?? null,
      accessControlAndVisitorEscortEnforced: input.accessControlAndVisitorEscortEnforced ?? null,
      pedProhibitionEnforced: input.pedProhibitionEnforced ?? null,
      acousticAndRfInspectionComplete: input.acousticAndRfInspectionComplete ?? null,
      coUtilizationAgreementIfShared: input.coUtilizationAgreementIfShared ?? null,
    },
    missingEvidence,
    authorityCitations: [DOD_IC_POLICY_REGISTRY["ICD-705-SCIF"]!, DOD_IC_POLICY_REGISTRY["ICD-503"]!],
    assessmentMode: input.assessmentMode,
    evidenceVerified: input.evidenceVerified,
  });

  return {
    ruleResult,
    accreditingAuthority: "COGNIZANT_SECURITY_AUTHORITY_AO",
    pedViolationDetected: input.pedProhibitionEnforced === false,
  };
}

export interface ComsecCsfcResult {
  ruleResult: DodIcRuleResult;
  cnsa2Compliant: boolean;
  csfcDualLayerCompliant: boolean;
}

/** Evaluates DoDI 8523.01 / CNSSI 4005 COMSEC, CNSSP 15 CNSA 2.0 (March 4, 2025), and NSA CSfC dual-layer encryption. */
export function evaluateComsecAndCsfcArchitecture(input: {
  architectureMode?: "TYPE_1" | "CSFC_DUAL_LAYER" | "SINGLE_LAYER_COMMERCIAL" | null;
  twoIndependentEncryptionLayers?: boolean | null;
  distinctVendorsAcrossLayers?: boolean | null;
  csfcCapabilityPackageRegistered?: boolean | null;
  symmetricAlgorithm?: string | null;
  asymmetricKeyExchange?: string | null;
  signatureAlgorithm?: string | null;
  targetAcquisitionYear?: number | null;
  twoPersonIntegrityEnforced?: boolean | null;
  comsecCustodianAppointed?: boolean | null;
  zeroizationCapabilityVerified?: boolean | null;
  assessmentMode?: AssessmentMode;
  evidenceVerified?: boolean;
}): ComsecCsfcResult {
  const blockers: string[] = [];
  const mode = input.architectureMode ?? null;
  const sym = (input.symmetricAlgorithm || "").toUpperCase();
  const kex = (input.asymmetricKeyExchange || "").toUpperCase();
  const sig = (input.signatureAlgorithm || "").toUpperCase();
  const acqYear = input.targetAcquisitionYear ?? null;

  if (mode === "SINGLE_LAYER_COMMERCIAL") {
    blockers.push("Single-layer commercial VPN/TLS NEVER satisfies NSA CSfC or Type 1 COMSEC for classified transit");
  }
  if (mode === "CSFC_DUAL_LAYER") {
    if (input.twoIndependentEncryptionLayers === false) blockers.push("NSA CSfC requires two independent nested encryption layers");
    if (input.distinctVendorsAcrossLayers === false) blockers.push("NSA CSfC inner and outer encryption layers must use distinct independent vendors/implementations");
    if (input.csfcCapabilityPackageRegistered === false) blockers.push("NSA CSfC Capability Package lacks formal NSA registration and AO approval");
  }
  if (input.twoPersonIntegrityEnforced === false) blockers.push("Two-Person Integrity (TPI) required by DoDI 8523.01 / CNSSI 4005 is not enforced");
  if (input.comsecCustodianAppointed === false) blockers.push("No formally appointed COMSEC Custodian for KMI/EKMS accounting");
  if (input.zeroizationCapabilityVerified === false) blockers.push("Emergency COMSEC cryptographic zeroization capability unverified");

  const usesWeakSym = Boolean(sym) && /\b(DES|3DES|RC4|AES-?128)\b/i.test(sym);
  if (usesWeakSym) blockers.push(`Symmetric algorithm '${sym}' fails CNSA 2.0 AES-256 (FIPS 197) requirement`);

  const usesClassicalKex = Boolean(kex) && /\b(RSA|ECDH|DH|DIFFIE|X25519|P-?256|P-?384)\b/i.test(kex) && !/ML-?KEM/i.test(kex);
  const usesClassicalSig = Boolean(sig) && /\b(RSA|ECDSA|ED25519)\b/i.test(sig) && !/(ML-?DSA|LMS|XMSS)/i.test(sig);
  const post2027Cutoff = (acqYear ?? 2027) >= 2027;
  if (usesClassicalKex && post2027Cutoff) {
    blockers.push(`Classical key exchange '${kex}' fails CNSSP 15 CNSA 2.0 Jan 1, 2027 new-NSS milestone (requires ML-KEM-1024 FIPS 203)`);
  }
  if (usesClassicalSig && post2027Cutoff) {
    blockers.push(`Classical signature '${sig}' fails CNSSP 15 CNSA 2.0 milestone (requires ML-DSA-87 FIPS 204 or LMS/XMSS)`);
  }

  const hasAnySignal =
    mode !== null ||
    input.twoIndependentEncryptionLayers != null ||
    input.distinctVendorsAcrossLayers != null ||
    input.twoPersonIntegrityEnforced != null ||
    Boolean(sym) ||
    Boolean(kex) ||
    Boolean(sig);

  const cnsa2Ok =
    !usesWeakSym &&
    !usesClassicalKex &&
    !usesClassicalSig &&
    (!kex || /ML-?KEM-?1024/i.test(kex)) &&
    (!sig || /ML-?DSA-?87|LMS|XMSS/i.test(sig));
  const csfcOk =
    mode === "TYPE_1" ||
    (mode === "CSFC_DUAL_LAYER" &&
      input.twoIndependentEncryptionLayers !== false &&
      input.distinctVendorsAcrossLayers !== false &&
      input.csfcCapabilityPackageRegistered !== false);

  const needsManualTransition = !post2027Cutoff && (usesClassicalKex || usesClassicalSig);

  const ruleResult = finalizeClassifiedRule({
    ruleId: "DOD-COMSEC-CSFC-001",
    ruleVersion: "2025.03.04",
    jurisdiction: "CNSS",
    title: "COMSEC, NSA CSfC Dual-Layer & CNSSP 15 CNSA 2.0 Cryptographic Readiness",
    blockers,
    hasAnySignal,
    hasMissingRequired: needsManualTransition || mode === null,
    summaryPass: "PASS [DOD-COMSEC-CSFC-001]: Classified transit cryptography and CNSA 2.0 readiness align with DoDI 8523.01, CNSSI 4005, CNSSP 15, and NSA CSfC.",
    threshold: "NSA Type 1 or dual-vendor CSfC Capability Package; TPI; CNSSP 15 CNSA 2.0 (AES-256, ML-KEM-1024, ML-DSA-87/LMS) by Jan 1 2027 / Dec 31 2030 / Dec 31 2031",
    variancePass: "Aligned with Type 1 / dual-layer CSfC & CNSA 2.0 cryptographic requirements",
    observedFacts: {
      architectureMode: mode,
      twoIndependentEncryptionLayers: input.twoIndependentEncryptionLayers ?? null,
      distinctVendorsAcrossLayers: input.distinctVendorsAcrossLayers ?? null,
      csfcCapabilityPackageRegistered: input.csfcCapabilityPackageRegistered ?? null,
      symmetricAlgorithm: sym || null,
      asymmetricKeyExchange: kex || null,
      signatureAlgorithm: sig || null,
      targetAcquisitionYear: acqYear,
      twoPersonIntegrityEnforced: input.twoPersonIntegrityEnforced ?? null,
      cnsa2Compliant: cnsa2Ok,
      csfcDualLayerCompliant: csfcOk,
    },
    missingEvidence: [
      "NSA Type 1 COMSEC KMI account verification or AO-signed CSfC Capability Package registration",
      "CNSA 2.0 algorithm attestation (AES-256, ML-KEM-1024, ML-DSA-87 / LMS / XMSS)",
    ],
    authorityCitations: [DOD_IC_POLICY_REGISTRY["CNSSP-15-CNSA-2.0-CSFC"]!, DOD_IC_POLICY_REGISTRY["DODI-8523.01-CNSSI-4005"]!],
    assessmentMode: input.assessmentMode,
    evidenceVerified: input.evidenceVerified,
  });

  return { ruleResult, cnsa2Compliant: cnsa2Ok, csfcDualLayerCompliant: csfcOk };
}

export interface TempestAssessmentResult {
  ruleResult: DodIcRuleResult;
  classifiedSpecsWithheld: true;
  cttaAuthorityRequired: true;
}

/** Evaluates CNSSAM TEMPEST/01-13 RED/BLACK separation while strictly prohibiting fabrication of classified attenuation values. */
export function evaluateTempestRedBlackCompliance(input: {
  redBlackCablingSeparated?: boolean | null;
  cttaAssessmentCompleted?: boolean | null;
  protectedDistributionSystemIfOutsideScif?: boolean | null;
  unshieldedRfTransmitterNearRedEquipment?: boolean | null;
  powerLineFilteringVerified?: boolean | null;
  assessmentMode?: AssessmentMode;
  evidenceVerified?: boolean;
}): TempestAssessmentResult {
  const blockers: string[] = [];
  if (input.redBlackCablingSeparated === false) blockers.push("RED (unencrypted classified) and BLACK cabling/grounding lack CNSSAM TEMPEST/01-13 separation");
  if (input.cttaAssessmentCompleted === false) blockers.push("Mandatory Certified TEMPEST Technical Authority (CTTA) site assessment missing");
  if (input.protectedDistributionSystemIfOutsideScif === false) blockers.push("Unencrypted classified lines outside SCIF lack an accredited Protected Distribution System (PDS)");
  if (input.unshieldedRfTransmitterNearRedEquipment === true) blockers.push("Unshielded RF transmitters (Wi-Fi/Bluetooth/cellular) near RED processing equipment fail TEMPEST/EMSEC safeguards");
  if (input.powerLineFilteringVerified === false) blockers.push("TEMPEST power-line filtering/ground isolation unverified");

  const hasAnySignal =
    input.redBlackCablingSeparated != null ||
    input.cttaAssessmentCompleted != null ||
    input.protectedDistributionSystemIfOutsideScif != null ||
    input.unshieldedRfTransmitterNearRedEquipment != null ||
    input.powerLineFilteringVerified != null;

  const ruleResult = finalizeClassifiedRule({
    ruleId: "DOD-TEMPEST-RB-001",
    ruleVersion: "2014.01.01",
    jurisdiction: "CNSS",
    title: "TEMPEST / EMSEC RED-BLACK Separation & CTTA Governance (CNSSAM TEMPEST/01-13)",
    blockers,
    hasAnySignal,
    hasMissingRequired: input.cttaAssessmentCompleted == null || input.redBlackCablingSeparated == null,
    summaryPass: "PASS [DOD-TEMPEST-RB-001]: Scenario RED/BLACK separation, PDS, and RF exclusion satisfy unclassified TEMPEST governance (exact separation specs remain CTTA site determinations).",
    threshold: "Physical/electrical RED-BLACK separation, accredited PDS outside SCIFs, zero unshielded RF transmitters near RED equipment, signed CTTA review",
    variancePass: "Zero unclassified TEMPEST governance violations; CTTA retains classified zoning authority",
    observedFacts: {
      redBlackCablingSeparated: input.redBlackCablingSeparated ?? null,
      cttaAssessmentCompleted: input.cttaAssessmentCompleted ?? null,
      protectedDistributionSystemIfOutsideScif: input.protectedDistributionSystemIfOutsideScif ?? null,
      unshieldedRfTransmitterNearRedEquipment: input.unshieldedRfTransmitterNearRedEquipment ?? null,
      powerLineFilteringVerified: input.powerLineFilteringVerified ?? null,
      classifiedSpecsWithheld: true,
    },
    missingEvidence: [
      "Signed Certified TEMPEST Technical Authority (CTTA) Countermeasures Review / PDS approval (classified metrics retained inside accredited enclave)",
    ],
    authorityCitations: [DOD_IC_POLICY_REGISTRY["CNSSAM-TEMPEST-01-13"]!, DOD_IC_POLICY_REGISTRY["ICD-705-SCIF"]!],
    assessmentMode: input.assessmentMode,
    evidenceVerified: input.evidenceVerified,
  });

  return { ruleResult, classifiedSpecsWithheld: true, cttaAuthorityRequired: true };
}

export interface MediaSanitizationResult {
  ruleResult: DodIcRuleResult;
  sanitizationSufficient: boolean;
}

/** Evaluates NIST SP 800-88 Rev. 2 (Sept 2025) & DoDM 5200.01 classified media sanitization and spillage response. */
export function evaluateClassifiedMediaSanitizationAndSpillage(input: {
  mediaType?: "SSD_FLASH" | "HDD_MAGNETIC" | "VOLATILE_RAM" | "OPTICAL" | "PAPER" | "MULTI_FUNCTION_PRINTER" | null;
  highestClassification?: SecurityClassification | null;
  proposedMethod?: "CLEAR_FORMAT" | "PURGE_CRYPTO_ERASE" | "DEGAUSS_NSA_EPL" | "DESTROY_NSA_EPL_SHRED_DISINTEGRATE" | null;
  destinationBoundary?: "SAME_ACCREDITED_ENCLAVE" | "LOWER_OR_UNCLASSIFIED_RELEASE" | "EXCESS_DISPOSAL" | null;
  spillageEvent?: boolean | null;
  spillageContainedAndIsolated?: boolean | null;
  securityOfficerNotified?: boolean | null;
  deviceWipedWithoutForensicApproval?: boolean | null;
  assessmentMode?: AssessmentMode;
  evidenceVerified?: boolean;
}): MediaSanitizationResult {
  const blockers: string[] = [];
  const media = input.mediaType ?? null;
  const cls = input.highestClassification ?? null;
  const method = input.proposedMethod ?? null;
  const dest = input.destinationBoundary ?? null;

  const isClassified = cls === "SECRET" || cls === "TOP_SECRET" || cls === "TS_SCI";
  const leavingAccredited = dest === "LOWER_OR_UNCLASSIFIED_RELEASE" || dest === "EXCESS_DISPOSAL" || dest === null;

  if (media === "SSD_FLASH" && method === "DEGAUSS_NSA_EPL") {
    blockers.push("Magnetic degaussing does NOT erase SSD / NAND flash storage under NIST SP 800-88 Rev. 2");
  }
  if (method === "CLEAR_FORMAT" && isClassified && leavingAccredited) {
    blockers.push(`NIST SP 800-88 Rev. 2 Clear/formatting NEVER sanitizes ${cls} media leaving an accredited boundary`);
  }
  if ((cls === "TOP_SECRET" || cls === "TS_SCI") && leavingAccredited && method && method !== "DESTROY_NSA_EPL_SHRED_DISINTEGRATE") {
    blockers.push(`${cls} media leaving accredited custody requires NSA/CSS EPL physical destruction (Destroy), not ${method}`);
  }
  if (input.spillageEvent === true) {
    if (input.spillageContainedAndIsolated === false) blockers.push("DoDM 5200.01 classified spillage lacks immediate network isolation/containment");
    if (input.securityOfficerNotified === false) blockers.push("Security Officer / Information System Security Manager not notified of classified spillage");
    if (input.deviceWipedWithoutForensicApproval === true) blockers.push("Wiping device without forensic/security-officer authorization destroys spillage lineage under DoDM 5200.01 / NIST SP 800-86");
  }

  const hasAnySignal =
    media !== null || cls !== null || method !== null || dest !== null || input.spillageEvent != null || input.deviceWipedWithoutForensicApproval != null;

  const sufficient = blockers.length === 0 && hasAnySignal && method !== null;

  const ruleResult = finalizeClassifiedRule({
    ruleId: "DOD-SANITIZE-88-001",
    ruleVersion: "2025.09.01",
    jurisdiction: "DOD",
    title: "Classified Media Sanitization & Spillage Response (NIST SP 800-88 Rev. 2 / DoDM 5200.01)",
    blockers,
    hasAnySignal,
    hasMissingRequired: media === null || method === null,
    summaryPass: "PASS [DOD-SANITIZE-88-001]: Media sanitization and/or spillage controls conform to NIST SP 800-88 Rev. 2 (Sept 2025) and DoDM 5200.01.",
    threshold: "No Clear/degauss misuse on classified SSD/flash; TS/SCI external disposal requires NSA/CSS EPL physical destruction + Certificate of Destruction",
    variancePass: "Zero media sanitization or spillage handling defects in scenario inputs",
    observedFacts: {
      mediaType: media,
      highestClassification: cls,
      proposedMethod: method,
      destinationBoundary: dest,
      spillageEvent: input.spillageEvent ?? null,
      deviceWipedWithoutForensicApproval: input.deviceWipedWithoutForensicApproval ?? null,
      sanitizationSufficient: sufficient,
    },
    missingEvidence: ["Signed NIST SP 800-88 Rev. 2 Certificate of Sanitization / NSA-CSS EPL Destruction Verification Log"],
    authorityCitations: [DOD_IC_POLICY_REGISTRY["NIST-SP-800-88-R2"]!, DOD_IC_POLICY_REGISTRY["EO-13526-DODM-5200.01"]!],
    assessmentMode: input.assessmentMode,
    evidenceVerified: input.evidenceVerified,
  });

  return { ruleResult, sanitizationSufficient: sufficient };
}
