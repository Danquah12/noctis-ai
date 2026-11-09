// ============================================================================
// NOCTIS COMPREHENSIVE STROKE CODE & NEUROVASCULAR REPERFUSION ENGINE
// Standards: AHA/ASA 2019/2026 Stroke Guidelines, DAWN / DEFUSE 3 Extended Window EVT,
//            ASPECTS Score & Tan Collateral Circulation Grading
// Regulatory: 21 U.S.C. § 360j(o)(1)(E) FDA Non-Device Clinical Decision Support
// ============================================================================

export type LargeVesselOcclusionSite = "ICA_TERMINUS" | "MCA_M1" | "MCA_M2" | "BASILAR_ARTERY" | "NONE";

export interface StrokePatientProfile {
  encounterId: string;
  patientAge: number;
  nihssScore: number; // 0 to 42
  symptomOnsetHours: number; // Golden 4.5h vs Extended 6-24h
  aspectsScore: number; // Alberta Stroke Program Early CT Score: 0 to 10 (>= 6 generally required)
  lvoSite: LargeVesselOcclusionSite;
  ischemicCoreVolumeMl?: number; // CTP rCBF < 30% volume in mL (DAWN/DEFUSE-3)
  hypoperfusedVolumeMl?: number; // CTP Tmax > 6s volume in mL
  tanCollateralScore?: 0 | 1 | 2 | 3; // 0=None, 1=<=50%, 2=>50%, 3=100%
  systolicBpMmHg: number;
  diastolicBpMmHg: number;
  bloodGlucoseMgDl: number;
  plateletsPerUl: number; // Normal >= 100,000 for tPA
  inrValue: number; // Normal <= 1.7 for tPA
  recentAnticoagulantUse: boolean;
  proposedOrders?: string[];
  recanalizationStatus?: "PENDING" | "TICI_2B_3_SUCCESSFUL" | "UNSUCCESSFUL";
}

export interface EvtEligibilityAssessment {
  eligibleForEvt: boolean;
  windowClassification: "STANDARD_0_TO_6H" | "EXTENDED_6_TO_24H" | "OUTSIDE_WINDOW";
  criteriaMet: string[];
  mismatchRatio?: number;
  mismatchVolumeMl?: number;
  clinicalAdvisory: string;
}

export interface StrokeReperfusionReport {
  thrombolysisEligibility: {
    eligible: boolean;
    recommendedAgent: string;
    dosingRegimen: string;
    bloodPressureTarget: string;
    contraindicationsFound: string[];
  };
  evtEligibility: EvtEligibilityAssessment;
  neurovascularHemodynamics: {
    currentBpStatus: string;
    targetBpPostReperfusion: string;
    recommendedAntihypertensiveDrip: string;
  };
  trippedInvariants: string[];
  safetyDirectives: string[];
  spokenGuidance: string;
}

/**
 * Evaluates DAWN and DEFUSE-3 extended window endovascular thrombectomy criteria
 * DAWN Criteria (6-24 hours):
 * Group A: Age >= 80, NIHSS >= 10, Core < 21 mL
 * Group B: Age < 80, NIHSS >= 10, Core < 31 mL
 * Group C: Age < 80, NIHSS >= 20, Core 31-51 mL
 *
 * DEFUSE 3 Criteria (6-16 hours):
 * ICA or M1 occlusion, Core < 70 mL, Mismatch ratio >= 1.8, Mismatch volume >= 15 mL
 */
export function evaluateEvtEligibility(profile: StrokePatientProfile): EvtEligibilityAssessment {
  const criteriaMet: string[] = [];
  const hours = profile.symptomOnsetHours;
  const isLvo = profile.lvoSite === "ICA_TERMINUS" || profile.lvoSite === "MCA_M1" || profile.lvoSite === "BASILAR_ARTERY" || profile.lvoSite === "MCA_M2";

  if (!isLvo || profile.lvoSite === "NONE") {
    return {
      eligibleForEvt: false,
      windowClassification: hours <= 6 ? "STANDARD_0_TO_6H" : hours <= 24 ? "EXTENDED_6_TO_24H" : "OUTSIDE_WINDOW",
      criteriaMet: ["No Large Vessel Occlusion identified on CTA/MRA."],
      clinicalAdvisory: "Endovascular thrombectomy not indicated in the absence of target intracranial large vessel occlusion.",
    };
  }

  // 0 to 6 Hours: Standard AHA/ASA guidelines
  if (hours <= 6.0) {
    if (profile.aspectsScore >= 6) {
      criteriaMet.push("Standard 0-6h Window: ASPECTS score >= 6 on non-contrast CT");
      criteriaMet.push(`Documented Large Vessel Occlusion: ${profile.lvoSite}`);
      return {
        eligibleForEvt: true,
        windowClassification: "STANDARD_0_TO_6H",
        criteriaMet,
        clinicalAdvisory: "Stat Catheterization Lab Activation for Endovascular Mechanical Thrombectomy (Target Door-to-Puncture < 60 min).",
      };
    } else {
      criteriaMet.push(`Low ASPECTS score (${profile.aspectsScore} < 6) indicating large completed core infarct`);
      return {
        eligibleForEvt: false,
        windowClassification: "STANDARD_0_TO_6H",
        criteriaMet,
        clinicalAdvisory: "High risk of catastrophic hemorrhagic transformation; EVT generally restricted to prospective clinical trials for ASPECTS < 6.",
      };
    }
  }

  // Extended Window 6 to 24 Hours
  if (hours <= 24.0) {
    const core = profile.ischemicCoreVolumeMl ?? 0;
    const hypoperfused = profile.hypoperfusedVolumeMl ?? 0;
    const mismatchVolume = Math.max(0, hypoperfused - core);
    const mismatchRatio = core > 0 ? Number((hypoperfused / core).toFixed(2)) : 10.0;

    let dawnEligible = false;
    if (profile.patientAge >= 80 && profile.nihssScore >= 10 && core < 21) {
      dawnEligible = true;
      criteriaMet.push("DAWN Group A Criteria Met (Age >= 80, NIHSS >= 10, Core < 21 mL)");
    } else if (profile.patientAge < 80 && profile.nihssScore >= 10 && core < 31) {
      dawnEligible = true;
      criteriaMet.push("DAWN Group B Criteria Met (Age < 80, NIHSS >= 10, Core < 31 mL)");
    } else if (profile.patientAge < 80 && profile.nihssScore >= 20 && core >= 31 && core < 51) {
      dawnEligible = true;
      criteriaMet.push("DAWN Group C Criteria Met (Age < 80, NIHSS >= 20, Core 31-51 mL)");
    }

    let defuse3Eligible = false;
    if (hours <= 16.0 && core < 70 && mismatchRatio >= 1.8 && mismatchVolume >= 15) {
      defuse3Eligible = true;
      criteriaMet.push("DEFUSE 3 Criteria Met (6-16h, Core < 70 mL, Mismatch >= 1.8 and >= 15 mL)");
    }

    const eligible = dawnEligible || defuse3Eligible;
    return {
      eligibleForEvt: eligible,
      windowClassification: "EXTENDED_6_TO_24H",
      criteriaMet,
      mismatchRatio,
      mismatchVolumeMl: mismatchVolume,
      clinicalAdvisory: eligible
        ? "Extended Window EVT Criteria Satisfied: Emergent neuro-interventional suite activation."
        : "Extended Window CTP/MRI mismatch criteria not met. Penumbral tissue insufficient to justify groin puncture.",
    };
  }

  return {
    eligibleForEvt: false,
    windowClassification: "OUTSIDE_WINDOW",
    criteriaMet: ["Symptom onset > 24 hours"],
    clinicalAdvisory: "Outside validated 24-hour EVT window; pursue supportive neuro-intensive care.",
  };
}

/**
 * Evaluates Comprehensive Stroke Code Reperfusion Protocol
 */
export function evaluateStrokeReperfusion(profile: StrokePatientProfile): StrokeReperfusionReport {
  const trippedInvariants: string[] = [];
  const safetyDirectives: string[] = [];
  const contraindicationsFound: string[] = [];

  // 1. Thrombolysis Assessment
  let thrombolysisEligible = true;

  if (profile.symptomOnsetHours > 4.5) {
    thrombolysisEligible = false;
    contraindicationsFound.push(`Onset ${profile.symptomOnsetHours}h exceeds 4.5-hour standard intravenous thrombolysis window`);
  }

  if (profile.systolicBpMmHg >= 185 || profile.diastolicBpMmHg >= 110) {
    thrombolysisEligible = false;
    contraindicationsFound.push(`Severe Hypertension: BP ${profile.systolicBpMmHg}/${profile.diastolicBpMmHg} mmHg exceeds 185/110 mmHg threshold`);
  }

  if (profile.plateletsPerUl < 100000) {
    thrombolysisEligible = false;
    contraindicationsFound.push(`Thrombocytopenia: Platelets ${profile.plateletsPerUl}/uL (< 100,000/uL)`);
  }

  if (profile.inrValue > 1.7) {
    thrombolysisEligible = false;
    contraindicationsFound.push(`Coagulopathy: INR ${profile.inrValue} (> 1.7)`);
  }

  if (profile.recentAnticoagulantUse) {
    thrombolysisEligible = false;
    contraindicationsFound.push("Recent therapeutic anticoagulant exposure within past 48 hours");
  }

  if (profile.bloodGlucoseMgDl < 50) {
    thrombolysisEligible = false;
    contraindicationsFound.push(`Hypoglycemia: Glucose ${profile.bloodGlucoseMgDl} mg/dL (< 50 mg/dL stroke mimic)`);
  }

  // 2. Endovascular Mechanical Thrombectomy Assessment
  const evt = evaluateEvtEligibility(profile);

  // 3. Post-Reperfusion Hemodynamics
  let targetBp = "Maintain BP < 185/110 mmHg pre-thrombolysis; < 180/105 mmHg for 24h post-tPA.";
  if (profile.recanalizationStatus === "TICI_2B_3_SUCCESSFUL") {
    targetBp = "Target SBP < 140 mmHg (or < 130 mmHg) post-successful recanalization to eliminate reperfusion hemorrhage risk.";
  }

  const bpStatus = `BP ${profile.systolicBpMmHg}/${profile.diastolicBpMmHg} mmHg`;
  const antihypertensiveDrip = "IV Nicardipine infusion (start 5 mg/hr, titrate by 2.5 mg/hr Q5-15min, max 15 mg/hr) or Clevidipine (1-2 mg/hr).";

  // =========================================================================
  // NON-COMPENSATORY SAFETY INVARIANTS (21 U.S.C. § 360j(o)(1)(E))
  // =========================================================================

  // Invariant CF-STROKE-001: Post-Thrombolytic Anticoagulation Hemorrhage Lockout
  if (
    profile.proposedOrders?.includes("THERAPEUTIC_ANTICOAGULATION_HEPARIN") ||
    profile.proposedOrders?.includes("START_DAPT_ASPIRIN_CLOPIDOGREL")
  ) {
    trippedInvariants.push("CF-STROKE-001");
    safetyDirectives.push(
      "SAFETY VETO [CF-STROKE-001]: Post-Thrombolytic Anticoagulant/Antiplatelet Absolute Lockout. Administration of therapeutic heparin, LMWH, DOACs, or dual antiplatelets within 24 hours of IV thrombolytic administration is strictly prohibited prior to 24-hour follow-up head CT confirming absence of intracranial hemorrhage."
    );
  }

  // Invariant CF-STROKE-002: SBP Permissive Hypertension Overshoot Veto
  if (profile.systolicBpMmHg >= 185 || profile.diastolicBpMmHg >= 110) {
    trippedInvariants.push("CF-STROKE-002");
    safetyDirectives.push(
      "SAFETY VETO [CF-STROKE-002]: Blood Pressure Threshold Exceeded for Thrombolysis/EVT (" +
        profile.systolicBpMmHg +
        "/" +
        profile.diastolicBpMmHg +
        " mmHg >= 185/110 mmHg). Do NOT administer IV tenecteplase/alteplase. Immediately initiate continuous IV Nicardipine or Clevidipine to lower blood pressure below 185/110 mmHg before thrombolysis."
    );
  }

  // Invariant CF-STROKE-003: Extended Window EVT Without CTP Perfusion Mismatch Veto
  if (profile.symptomOnsetHours > 6.0 && !evt.eligibleForEvt && profile.proposedOrders?.includes("PROCEED_TO_CATH_LAB_GROIN_PUNCTURE")) {
    trippedInvariants.push("CF-STROKE-003");
    safetyDirectives.push(
      "SAFETY VETO [CF-STROKE-003]: Extended Window Groin Puncture Without Verified Penumbra. Proceeding with mechanical thrombectomy past 6 hours without satisfying DAWN or DEFUSE 3 perfusion mismatch criteria is strictly contraindicated due to high procedural futility and intracranial hemorrhage mortality."
    );
  }

  // Invariant CF-STROKE-004: Symptomatic ICH Acute Reversal Directive
  if (profile.proposedOrders?.includes("ACUTE_NEUROLOGIC_DETERIORATION_POST_TPA")) {
    trippedInvariants.push("CF-STROKE-004");
    safetyDirectives.push(
      "SAFETY DIRECTIVE [CF-STROKE-004]: Suspected Post-Thrombolysis Symptomatic Intracranial Hemorrhage. Stop thrombolytic infusion immediately. Mobilize STAT non-contrast head CT, order 10 units Cryoprecipitate (to restore fibrinogen > 150 mg/dL), and administer Tranexamic Acid 1000 mg IV over 10 minutes."
    );
  }

  // Zero-Truncation Spoken Script
  const spokenParts = [
    `Comprehensive Stroke Code and Neurovascular Reperfusion Assessment for encounter ${profile.encounterId}.`,
    `Patient presents at ${profile.symptomOnsetHours} hours post-symptom onset with calculated NIHSS score of ${profile.nihssScore}.`,
    `Alberta Stroke Program Early CT Score is ${profile.aspectsScore} out of 10. Large vessel occlusion: ${profile.lvoSite.replace(/_/g, " ")}.`,
    `Current blood pressure is ${profile.systolicBpMmHg} over ${profile.diastolicBpMmHg} mmHg.`,
  ];

  if (thrombolysisEligible) {
    spokenParts.push(
      "Patient is eligible for intravenous thrombolysis with Tenecteplase 0.25 milligrams per kilogram single bolus, maximum 25 milligrams."
    );
  } else {
    spokenParts.push(
      `Intravenous thrombolysis contraindicated due to: ${contraindicationsFound.join("; ")}.`
    );
  }

  spokenParts.push(evt.clinicalAdvisory);

  if (trippedInvariants.length > 0) {
    spokenParts.push(
      `Warning: ${trippedInvariants.length} critical safety invariant alerts tripped: ${trippedInvariants.join(", ")}.`
    );
    spokenParts.push(safetyDirectives.join(" "));
  }

  return {
    thrombolysisEligibility: {
      eligible: thrombolysisEligible,
      recommendedAgent: "Tenecteplase (TNK-tPA)",
      dosingRegimen: "0.25 mg/kg IV single bolus over 5-10 seconds (maximum dose 25 mg)",
      bloodPressureTarget: "Maintain BP < 180/105 mmHg for 24 hours post-infusion.",
      contraindicationsFound,
    },
    evtEligibility: evt,
    neurovascularHemodynamics: {
      currentBpStatus: bpStatus,
      targetBpPostReperfusion: targetBp,
      recommendedAntihypertensiveDrip: antihypertensiveDrip,
    },
    trippedInvariants,
    safetyDirectives,
    spokenGuidance: spokenParts.join(" "),
  };
}
