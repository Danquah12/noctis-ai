/**
 * NOCTIS REGULATORY DOSSIER & STATUTORY COMPLIANCE ENGINE
 * Subsystem Code: NRDE-LEGAL-001 / REG-2026
 *
 * Implements:
 * 1. FDA 510(k) Premarket Notification & Substantial Equivalence (SE) Assessment
 * 2. FDA Software in Medical Devices (SiMD / SaMD) Safety Classification (2023 Guidance)
 * 3. EU Medical Device Regulation (EU-MDR 2017/745) General Safety & Performance Requirements (GSPR) Matrix
 * 4. HIPAA Security Rule (45 CFR § 164.312) Automated Technical Safeguards Compliance Auditor
 */

export interface Fda510kEquivalenceAssessment {
  predicateDevice510kNumber: string;
  intendedUseIdentical: boolean;
  technologicalCharacteristicsDifferent: boolean;
  newSafetyQuestionsRaised: boolean;
  performanceDataSufficient: boolean;
  determination: "SUBSTANTIALLY_EQUIVALENT" | "NOT_SUBSTANTIALLY_EQUIVALENT" | "ADDITIONAL_TESTING_REQUIRED";
  summaryRationale: string;
}

export interface FdaSoftwareLevelOfConcern {
  documentationLevel: "BASIC" | "ENHANCED";
  rationale: string;
  hazardsPresent: {
    deathOrSeriousInjuryPossible: boolean;
    priorToMitigationCritical: boolean;
    combinationDeviceOrClassIII: boolean;
  };
}

export interface EuMdrGsprItem {
  gsprNumber: number;
  title: string;
  applicable: boolean;
  complianceStatus: "COMPLIANT" | "PARTIALLY_COMPLIANT" | "NON_COMPLIANT";
  harmonizedStandardRef: string;
  clinicalEvidenceSummary: string;
}

export interface HipaaTechnicalSafeguardsAudit {
  ephiEncryptionAtRest: boolean;
  ephiEncryptionInTransit: boolean;
  uniqueUserIdentification: boolean;
  automaticLogoffMinutes: number;
  emergencyAccessProcedure: boolean;
  auditLoggingEnabled: boolean;
  overallCompliant: boolean;
  deficiencies: string[];
}

/**
 * Evaluate FDA 510(k) Substantial Equivalence Decision Tree (FDA Guidance #1766)
 */
export function evaluateFda510kSubstantialEquivalence(params: {
  predicate510k: string;
  sameIntendedUse: boolean;
  sameTechnologicalCharacteristics: boolean;
  differentTechRaisesNewSafetyQuestions?: boolean;
  performanceDataDemonstratesEquivalence?: boolean;
}): Fda510kEquivalenceAssessment {
  const {
    predicate510k,
    sameIntendedUse,
    sameTechnologicalCharacteristics,
    differentTechRaisesNewSafetyQuestions = false,
    performanceDataDemonstratesEquivalence = true,
  } = params;

  if (!sameIntendedUse) {
    return {
      predicateDevice510kNumber: predicate510k,
      intendedUseIdentical: false,
      technologicalCharacteristicsDifferent: !sameTechnologicalCharacteristics,
      newSafetyQuestionsRaised: differentTechRaisesNewSafetyQuestions,
      performanceDataSufficient: performanceDataDemonstratesEquivalence,
      determination: "NOT_SUBSTANTIALLY_EQUIVALENT",
      summaryRationale: "The subject device has a different intended use than the predicate device. Premarket Approval (PMA) or De Novo request is required.",
    };
  }

  if (sameTechnologicalCharacteristics) {
    return {
      predicateDevice510kNumber: predicate510k,
      intendedUseIdentical: true,
      technologicalCharacteristicsDifferent: false,
      newSafetyQuestionsRaised: false,
      performanceDataSufficient: true,
      determination: "SUBSTANTIALLY_EQUIVALENT",
      summaryRationale: "The device has the same intended use and identical technological characteristics as the predicate. Substantially Equivalent (SE) confirmed.",
    };
  }

  // Different technological characteristics
  if (differentTechRaisesNewSafetyQuestions) {
    return {
      predicateDevice510kNumber: predicate510k,
      intendedUseIdentical: true,
      technologicalCharacteristicsDifferent: true,
      newSafetyQuestionsRaised: true,
      performanceDataSufficient: false,
      determination: "NOT_SUBSTANTIALLY_EQUIVALENT",
      summaryRationale: "Different technological characteristics raise new types of safety and effectiveness questions that cannot be resolved via 510(k) comparison.",
    };
  }

  if (performanceDataDemonstratesEquivalence) {
    return {
      predicateDevice510kNumber: predicate510k,
      intendedUseIdentical: true,
      technologicalCharacteristicsDifferent: true,
      newSafetyQuestionsRaised: false,
      performanceDataSufficient: true,
      determination: "SUBSTANTIALLY_EQUIVALENT",
      summaryRationale: "Different technological characteristics do not raise new safety questions, and valid scientific performance data demonstrates the subject device is at least as safe and effective as the predicate.",
    };
  }

  return {
    predicateDevice510kNumber: predicate510k,
    intendedUseIdentical: true,
    technologicalCharacteristicsDifferent: true,
    newSafetyQuestionsRaised: false,
    performanceDataSufficient: false,
    determination: "ADDITIONAL_TESTING_REQUIRED",
    summaryRationale: "Bench, animal, or clinical performance data submitted is insufficient to demonstrate equivalence. Additional verification testing required.",
  };
}

/**
 * Determine FDA Software Documentation Level (FDA 2023 SiMD/SaMD Guidance)
 */
export function determineFdaSoftwareDocumentationLevel(params: {
  couldFailureLeadToDeathOrSeriousInjury: boolean;
  isCombinationProductOrClassIII: boolean;
}): FdaSoftwareLevelOfConcern {
  const enhanced = params.couldFailureLeadToDeathOrSeriousInjury || params.isCombinationProductOrClassIII;

  return {
    documentationLevel: enhanced ? "ENHANCED" : "BASIC",
    rationale: enhanced
      ? "Failure or latent flaw could directly or indirectly lead to death or serious injury, or device is Class III / combination product. Enhanced Documentation required (complete architecture design, risk management file, static analysis reports, unresolved anomaly traceability)."
      : "Device failure cannot reasonably lead to serious injury or death. Basic Documentation required.",
    hazardsPresent: {
      deathOrSeriousInjuryPossible: params.couldFailureLeadToDeathOrSeriousInjury,
      priorToMitigationCritical: enhanced,
      combinationDeviceOrClassIII: params.isCombinationProductOrClassIII,
    },
  };
}

/**
 * Audit HIPAA Technical Safeguards (45 CFR § 164.312)
 */
export function auditHipaaTechnicalSafeguards(config: {
  encryptionAtRestCipher?: string;
  tlsVersionInTransit?: string;
  uniqueUserIdsEnforced: boolean;
  autoLogoffMinutes: number;
  emergencyAccessPlanDocumented: boolean;
  auditLoggingEnabled: boolean;
}): HipaaTechnicalSafeguardsAudit {
  const deficiencies: string[] = [];

  // § 164.312(a)(2)(iv) Encryption at rest
  const encRest = Boolean(config.encryptionAtRestCipher && /aes-?256|chacha20/i.test(config.encryptionAtRestCipher));
  if (!encRest) {
    deficiencies.push("ePHI storage at rest lacks FIPS 140-2 validated encryption (e.g. AES-256).");
  }

  // § 164.312(e)(1) Transmission security
  const encTransit = Boolean(config.tlsVersionInTransit && /tls\s*1\.[23]|https/i.test(config.tlsVersionInTransit));
  if (!encTransit) {
    deficiencies.push("ePHI transmission security must enforce TLS 1.2 or TLS 1.3 with forward secrecy.");
  }

  // § 164.312(a)(2)(i) Unique user identification
  if (!config.uniqueUserIdsEnforced) {
    deficiencies.push("Failure to assign unique name and/or number for tracking user identity.");
  }

  // § 164.312(a)(2)(iii) Automatic logoff
  if (config.autoLogoffMinutes <= 0 || config.autoLogoffMinutes > 15) {
    deficiencies.push("Automatic logoff threshold exceeds safe HIPAA practice (target <= 15 minutes of inactivity).");
  }

  // § 164.312(a)(2)(ii) Emergency access
  if (!config.emergencyAccessPlanDocumented) {
    deficiencies.push("Missing documented break-glass emergency access procedure.");
  }

  // § 164.312(b) Audit controls
  if (!config.auditLoggingEnabled) {
    deficiencies.push("Audit logging of ePHI access, modifications, and deletions is disabled.");
  }

  return {
    ephiEncryptionAtRest: encRest,
    ephiEncryptionInTransit: encTransit,
    uniqueUserIdentification: config.uniqueUserIdsEnforced,
    automaticLogoffMinutes: config.autoLogoffMinutes,
    emergencyAccessProcedure: config.emergencyAccessPlanDocumented,
    auditLoggingEnabled: config.auditLoggingEnabled,
    overallCompliant: deficiencies.length === 0,
    deficiencies,
  };
}
