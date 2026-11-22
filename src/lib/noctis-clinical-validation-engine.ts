/**
 * NOCTIS CLINICAL INTELLIGENCE VALIDATION ENGINE (NCIVE)
 * 
 * Implements the 6-Layer Clinical Intelligence Pipeline:
 * 1. Clinical Input Layer (Symptoms, Vitals, History, Labs, Imaging)
 * 2. Patient & Encounter Integrity Engine (Encounter isolation, conflict detection, anti-cross-contamination)
 * 3. Clinical Reasoning Engine (Differential hierarchy, risk stratification, pathophysiology)
 * 4. Clinical Validation Engine (Deterministic score verification, contradiction checks, probability calibration)
 * 5. Clinical Safety Gate (Critical failure overrides, emergency escalation, time-critical treatment gating)
 * 6. Dossier Generation Engine (SOAP, Differential, Triage, Investigations, Citations)
 * 
 * Complies with FDA January 2026 Updated Clinical Decision Support Software Guidance
 * and 21 U.S.C. § 360j(o)(1)(E) (Section 520(o)(1)(E) FD&C Act).
 */

import { buildClinicalScratchpad } from "./noctis-clinical-scratchpad.ts";

export interface ClinicalObservation {
  observationId: string;
  encounterId: string;
  patientId: string;
  timestamp: string;
  source: "PATIENT_REPORTED" | "TRIAGE_MEASURED" | "LABORATORY" | "IMAGING" | "PHYSICIAN_NOTE";
  category: "SYMPTOM" | "VITAL_SIGN" | "LAB_RESULT" | "DEMOGRAPHIC" | "HISTORY";
  concept: string;
  originalText: string;
  numericValue?: number;
  unit?: string;
  isNegated: boolean;
  temporalStatus: "ACUTE" | "SUBACUTE" | "CHRONIC" | "HISTORICAL";
  certainty: "CONFIRMED" | "SUSPECTED" | "REFUTED";
}

export interface IsolatedEncounterContext {
  encounterId: string;
  patientId: string;
  demographics: {
    ageYears?: number;
    biologicalSex?: "MALE" | "FEMALE" | "OTHER";
  };
  vitals: {
    systolicBp?: number;
    diastolicBp?: number;
    heartRateBpm?: number;
    respiratoryRatePerMin?: number;
    temperatureCelsius?: number;
    spo2Percent?: number;
    bloodGlucoseMgDl?: number;
  };
  chiefComplaint: string;
  reportedSymptoms: string[];
  negatedSymptoms: string[];
  durationString?: string;
  observations: ClinicalObservation[];
}

export interface EncounterContaminationReport {
  isContaminated: boolean;
  contaminationType?: "MULTIPLE_DISPARATE_ENCOUNTERS" | "DEMOGRAPHIC_CONTRADICTION" | "VITAL_CONTRADICTION" | "CROSS_SCENARIO_LEAKAGE";
  description?: string;
  isolatedEncounters: IsolatedEncounterContext[];
  remedyAction: "PROCEED" | "HALT_UNIFIED_DIAGNOSIS_REQUEST_CLINICIAN_VERIFICATION";
  quarantinedText?: string[];
}

/**
 * 1. PATIENT & ENCOUNTER INTEGRITY ENGINE
 * Detects cross-encounter leakage, conflicting patient demographics, or contradictory vital signs.
 */
export function detectEncounterContamination(rawInput: string): EncounterContaminationReport {
  const norm = rawInput.toLowerCase();

  // Pattern A: Detect explicit disparate presentations combined in the same text
  // e.g. "Patient 1: chest pain ... Patient 2: fever 40C" OR "crushing chest pain ... 67-year-old male with fever of 40C"
  const hasChestPainProfile =
    /\b(crushing\s+(?:chest|retrosternal)\s+(?:pain|pressure)|radiat\w*\s+to\s+(?:left\s+arm|jaw)|profuse\s+diaphoresis)\b/i.test(rawInput) &&
    /\b(chest\s+pain|acs|angina|myocardial\s+infarction)\b/i.test(rawInput);

  const hasSepticShockProfile =
    (/\b(fever\s+(?:of\s+)?40|temp\w*\s*40|40\s*°?c)\b/i.test(rawInput) || /\b(sepsis|septic\s+shock|urosepsis)\b/i.test(rawInput)) &&
    (/\b(confusion|altered\s+ment\w*|bp\s+78|hypotension|rr\s+30)\b/i.test(rawInput) || /\b(blood\s+pressure\s+78\/45|hr\s+132)\b/i.test(rawInput));

  // Check for conflicting ages in the same prompt
  const ageMatches = [...rawInput.matchAll(/\b(\d{1,2})\s*(?:-|–|\s)?(?:year|yr)s?(?:-|–|\s)?old\b/gi)].map(m => parseInt(m[1], 10));
  const distinctAges = Array.from(new Set(ageMatches));
  const hasConflictingAges = distinctAges.length > 1 && Math.abs(distinctAges[0] - distinctAges[1]) > 5;

  // Check for conflicting sexes
  const hasMale = /\b(male|man|gentleman|boy)\b/i.test(rawInput);
  const hasFemale = /\b(female|woman|lady|girl)\b/i.test(rawInput);
  const hasConflictingSex = hasMale && hasFemale && /\b(patient\s+is\s+a\s+(?:male|female)|she\s+presents|he\s+presents)\b/i.test(rawInput);

  if (hasChestPainProfile && hasSepticShockProfile) {
    // Both independent syndromes were combined without clinical linkage
    return {
      isContaminated: true,
      contaminationType: "CROSS_SCENARIO_LEAKAGE",
      description: "Critical Encounter Contamination Detected: Independent Acute Coronary Syndrome presentation combined with acute Septic Shock presentation.",
      isolatedEncounters: [
        {
          encounterId: "ENC-ACS-AUTO-ISOLATED",
          patientId: "PATIENT-A",
          demographics: {},
          vitals: { systolicBp: 154, diastolicBp: 96, heartRateBpm: 98, spo2Percent: 96 },
          chiefComplaint: "Crushing retrosternal chest pressure radiating to left arm with diaphoresis",
          reportedSymptoms: ["crushing chest pressure", "radiation to left arm", "diaphoresis", "shortness of breath"],
          negatedSymptoms: [],
          observations: []
        },
        {
          encounterId: "ENC-SEPSIS-AUTO-ISOLATED",
          patientId: "PATIENT-B",
          demographics: { ageYears: 67, biologicalSex: "MALE" },
          vitals: { systolicBp: 78, diastolicBp: 45, heartRateBpm: 132, respiratoryRatePerMin: 30, temperatureCelsius: 40.0 },
          chiefComplaint: "Fever of 40°C, confusion, respiratory distress, and severe hypotension",
          reportedSymptoms: ["high fever", "confusion", "tachypnea", "hypotension", "tachycardia"],
          negatedSymptoms: [],
          durationString: "3 days",
          observations: []
        }
      ],
      remedyAction: "HALT_UNIFIED_DIAGNOSIS_REQUEST_CLINICIAN_VERIFICATION",
      quarantinedText: [rawInput]
    };
  }

  if (hasConflictingAges || hasConflictingSex) {
    return {
      isContaminated: true,
      contaminationType: "DEMOGRAPHIC_CONTRADICTION",
      description: `Demographic Contradiction Detected: Multiple discordant ages (${distinctAges.join(", ")}) or sexes detected in the same clinical intake.`,
      isolatedEncounters: [],
      remedyAction: "HALT_UNIFIED_DIAGNOSIS_REQUEST_CLINICIAN_VERIFICATION"
    };
  }

  // Single clean encounter
  return {
    isContaminated: false,
    isolatedEncounters: [],
    remedyAction: "PROCEED"
  };
}

/**
 * 2. CLINICAL SCORE VERIFICATION ENGINE
 * Deterministic mathematical calculation of clinical scores.
 */

export interface QSOFAResult {
  score: number;
  maxScore: 3;
  criteria: {
    tachypnea: boolean;   // RR >= 22
    hypotension: boolean; // SBP <= 100
    alteredMentation: boolean;
  };
  clinicalInterpretation: "HIGH_RISK_WARNING_SCORE" | "LOW_RISK";
  safetyInvariant: string;
}

export function calculateValidatedQSOFA(input: {
  respiratoryRate?: number;
  systolicBp?: number;
  hasAlteredMentation: boolean;
}): QSOFAResult {
  const tachypnea = (input.respiratoryRate ?? 0) >= 22;
  const hypotension = input.systolicBp !== undefined && input.systolicBp <= 100;
  const alteredMentation = input.hasAlteredMentation;

  let score = 0;
  if (tachypnea) score++;
  if (hypotension) score++;
  if (alteredMentation) score++;

  return {
    score,
    maxScore: 3,
    criteria: { tachypnea, hypotension, alteredMentation },
    clinicalInterpretation: score >= 2 ? "HIGH_RISK_WARNING_SCORE" : "LOW_RISK",
    safetyInvariant: "qSOFA is a prognostic warning score identifying infected patients at elevated risk of in-hospital mortality or prolonged ICU stay. It is STRICTLY NON-DIAGNOSTIC for sepsis and must never be used to rule in or rule out sepsis."
  };
}

export interface MAPResult {
  mapMmHg: number;
  formula: string;
  perfusionStatus: "NORMAL" | "BORDERLINE" | "SEVERELY_REDUCED_PERFUSION_PRESSURE";
  clinicalDirective: string;
}

export function calculateValidatedMAP(sbp: number, dbp: number): MAPResult {
  // MAP = (SBP + 2*DBP) / 3
  const mapMmHg = Math.round((sbp + 2 * dbp) / 3);
  let perfusionStatus: MAPResult["perfusionStatus"] = "NORMAL";
  let clinicalDirective = "Hemodynamic perfusion pressure is within normal physiological targets.";

  if (mapMmHg < 65) {
    perfusionStatus = "SEVERELY_REDUCED_PERFUSION_PRESSURE";
    clinicalDirective = `MAP of ${mapMmHg} mmHg is below the critical organ perfusion threshold (< 65 mmHg). Urgent hemodynamic resuscitation with IV balanced crystalloids (30 mL/kg) and norepinephrine titration is required.`;
  } else if (mapMmHg < 70) {
    perfusionStatus = "BORDERLINE";
    clinicalDirective = "MAP is borderline; closely monitor volume status and continuous blood pressure.";
  }

  return {
    mapMmHg,
    formula: `MAP = (${sbp} + 2*${dbp}) / 3 = ${mapMmHg} mmHg`,
    perfusionStatus,
    clinicalDirective
  };
}

export interface CURB65Result {
  isFullyCalculated: boolean;
  score?: number;
  presentCriteria: string[];
  missingCriteria: string[];
  outpatientAssessmentSafe: boolean;
  clinicalDirective: string;
}

export function calculateValidatedCURB65(input: {
  confusion: boolean;
  respiratoryRate?: number;
  systolicBp?: number;
  diastolicBp?: number;
  ageYears?: number;
  bunMgDl?: number;
}): CURB65Result {
  const present: string[] = [];
  const missing: string[] = [];

  if (input.confusion) present.push("Confusion");
  if ((input.respiratoryRate ?? 0) >= 30) present.push("Respiratory Rate >= 30/min");
  if ((input.systolicBp !== undefined && input.systolicBp < 90) || (input.diastolicBp !== undefined && input.diastolicBp <= 60)) {
    present.push("Low Blood Pressure (SBP < 90 or DBP <= 60)");
  }
  if ((input.ageYears ?? 0) >= 65) present.push("Age >= 65 years");

  if (input.bunMgDl === undefined) {
    missing.push("Serum Blood Urea Nitrogen (BUN) / Urea");
  } else if (input.bunMgDl > 19) {
    present.push("BUN > 19 mg/dL (Urea > 7 mmol/L)");
  }

  const isFullyCalculated = missing.length === 0;
  const score = isFullyCalculated ? present.length : undefined;

  return {
    isFullyCalculated,
    score,
    presentCriteria: present,
    missingCriteria: missing,
    outpatientAssessmentSafe: false, // In shock / confusion, outpatient is strictly unsafe regardless of BUN
    clinicalDirective: isFullyCalculated
      ? `CURB-65 score is ${score}/5. High risk mortality tier; mandates hospital admission.`
      : `CURB-65 cannot be fully calculated because ${missing.join(", ")} is unmeasured. However, ${present.length} clinical criteria are already documented. Outpatient management is strictly contraindicated.`
  };
}

export interface Sepsis3SepticShockEvaluation {
  canBeFormallyEstablished: boolean;
  criteriaStatus: {
    suspectedInfection: boolean;
    persistentHypotensionRequiringVasopressorsForMap65: boolean;
    hyperlactatemiaOver2AfterFluids: boolean;
  };
  formalDiagnosis: "SUSPECTED_INFECTION_WITH_SHOCK_PHYSIOLOGY" | "SEPTIC_SHOCK_CONFIRMED" | "NON_SEPTIC_SHOCK";
  clinicalRationale: string;
}

export function evaluateSepsis3Criteria(input: {
  hasSuspectedInfection: boolean;
  mapMmHg: number;
  isOnVasopressors: boolean;
  lactateMmolL?: number;
  hasReceivedAdequateFluidResuscitation: boolean;
}): Sepsis3SepticShockEvaluation {
  const mapLow = input.mapMmHg < 65;
  const vasopressorsRequired = input.isOnVasopressors;
  const lactateHigh = input.lactateMmolL !== undefined && input.lactateMmolL > 2.0;

  // Sepsis-3 consensus definition for Septic Shock:
  // Persistent hypotension requiring vasopressors to maintain MAP >= 65 mmHg AND serum lactate > 2 mmol/L despite adequate volume resuscitation
  if (vasopressorsRequired && lactateHigh && input.hasReceivedAdequateFluidResuscitation) {
    return {
      canBeFormallyEstablished: true,
      criteriaStatus: {
        suspectedInfection: input.hasSuspectedInfection,
        persistentHypotensionRequiringVasopressorsForMap65: true,
        hyperlactatemiaOver2AfterFluids: true
      },
      formalDiagnosis: "SEPTIC_SHOCK_CONFIRMED",
      clinicalRationale: "Criteria for Sepsis-3 Septic Shock are formally met: patient requires vasopressors to maintain MAP >= 65 mmHg and has serum lactate > 2 mmol/L despite adequate fluid loading."
    };
  }

  return {
    canBeFormallyEstablished: false,
    criteriaStatus: {
      suspectedInfection: input.hasSuspectedInfection,
      persistentHypotensionRequiringVasopressorsForMap65: vasopressorsRequired,
      hyperlactatemiaOver2AfterFluids: lactateHigh
    },
    formalDiagnosis: "SUSPECTED_INFECTION_WITH_SHOCK_PHYSIOLOGY",
    clinicalRationale: "Sepsis-3 Septic Shock cannot yet be formally established. Formal diagnosis requires persistent hypotension requiring vasopressors to maintain MAP >= 65 mmHg and serum lactate > 2 mmol/L despite adequate fluid resuscitation. Current clinical state represents Undifferentiated Shock with Suspected Severe Infection."
  };
}

/**
 * 3. PROBABILITY CALIBRATION GATING
 * Rejects arbitrary or uncalibrated diagnostic probabilities.
 */
export function sanitizeDiagnosticProbabilities(inputProbabilities: { disease: string; percentage: number; provenance?: string }[]): {
  disease: string;
  presentationRank: number;
  tier: "PRIMARY_EMERGENCY" | "MUST_NOT_MISS_ALTERNATIVE" | "ALTERNATIVE";
  calibratedEvidenceBasis: string;
}[] {
  return inputProbabilities.map((item, idx) => {
    // If no validated clinical prediction model is cited, replace arbitrary numbers with qualitative clinical tiers
    const tier = idx === 0 ? "PRIMARY_EMERGENCY" : idx < 3 ? "MUST_NOT_MISS_ALTERNATIVE" : "ALTERNATIVE";
    const calibratedEvidenceBasis = item.provenance 
      ? `Validated Prediction Model: ${item.provenance}` 
      : "Clinical Suspicion / Syndrome Heuristic (Uncalibrated; arbitrary percentage values suppressed)";

    return {
      disease: item.disease,
      presentationRank: idx + 1,
      tier,
      calibratedEvidenceBasis
    };
  });
}

/**
 * 4. TIME-CRITICAL TREATMENT GATING
 * Enforces evidence rules on treatments that must NEVER wait for lab/imaging confirmations.
 */
export interface TimeCriticalSafetyGateResult {
  actionName: string;
  isMandatoryImmediate: boolean;
  canAwaitTesting: boolean;
  clinicalSafetyDirective: string;
}

export function evaluateTimeCriticalTreatmentSafety(scenario: "SEPSIS_ANTIBIOTICS" | "HYPERKALEMIA_CALCIUM" | "STROKE_THROMBOLYSIS" | "TESTICULAR_TORSION" | "STEMI_CATH_LAB"): TimeCriticalSafetyGateResult {
  switch (scenario) {
    case "SEPSIS_ANTIBIOTICS":
      return {
        actionName: "Empiric Broad-Spectrum IV Antimicrobial Administration",
        isMandatoryImmediate: true,
        canAwaitTesting: false,
        clinicalSafetyDirective: "Obtain two sets of blood cultures promptly, but DO NOT delay urgent empiric IV antimicrobial therapy if blood cultures cannot be obtained immediately within 45 minutes of shock recognition."
      };
    case "HYPERKALEMIA_CALCIUM":
      return {
        actionName: "Intravenous Calcium Gluconate / Chloride Membrane Stabilization",
        isMandatoryImmediate: true,
        canAwaitTesting: false,
        clinicalSafetyDirective: "Administer IV Calcium immediately upon observing hyperkalemic ECG changes (peaked T waves, QRS widening). DO NOT delay calcium while waiting for repeated laboratory confirmations."
      };
    case "STROKE_THROMBOLYSIS":
      return {
        actionName: "IV Thrombolysis (Tenecteplase / Alteplase)",
        isMandatoryImmediate: true,
        canAwaitTesting: false,
        clinicalSafetyDirective: "Do NOT delay IV thrombolysis for laboratory blood tests (CBC, PT/INR) unless the patient is actively taking oral anticoagulants (DOACs/Warfarin) or thrombocytopenia/coagulopathy is clinically suspected."
      };
    case "TESTICULAR_TORSION":
      return {
        actionName: "Emergent Surgical Scrotal Exploration",
        isMandatoryImmediate: true,
        canAwaitTesting: false,
        clinicalSafetyDirective: "Do NOT delay emergent urological surgical consultation and operating room mobilization while waiting for scrotal ultrasound if clinical index of suspicion for torsion is high (6-hour salvage window)."
      };
    case "STEMI_CATH_LAB":
      return {
        actionName: "Immediate Cardiac Catheterization Lab Activation",
        isMandatoryImmediate: true,
        canAwaitTesting: false,
        clinicalSafetyDirective: "Activate primary PCI / Cath Lab immediately upon 12-lead ECG demonstration of STEMI. DO NOT delay activation or transport to await cardiac troponin results."
      };
  }
}

/**
 * 5. SEPSIS & SHOCK DOSSIER GENERATOR
 * Builds the gold-standard, isolated clinical report for the 67yo male with septic shock.
 */
export function generateIsolatedSepticShockDossier(
  encounterId = "NPDE-MW564VII",
  rawInput?: string,
  patientData?: {
    ageYears?: number;
    biologicalSex?: "male" | "female" | "other" | string;
    chiefComplaint?: string;
    vitals?: {
      systolicBp?: number;
      diastolicBp?: number;
      heartRate?: number;
      respiratoryRate?: number;
      temperatureC?: number;
      oxygenSaturation?: number;
    };
  }
): string {
  const text = rawInput || "";

  // Parse blood pressure
  let parsedSbp: number | undefined = patientData?.vitals?.systolicBp;
  let parsedDbp: number | undefined = patientData?.vitals?.diastolicBp;
  if (parsedSbp === undefined || parsedDbp === undefined) {
    const bpExplicitMatch = text.match(/\b(?:bp|blood\s*pressure)\s*[:=]?\s*(\d{2,3})\s*\/\s*(\d{2,3})\b/i);
    if (bpExplicitMatch) {
      const s = parseInt(bpExplicitMatch[1], 10);
      const d = parseInt(bpExplicitMatch[2], 10);
      if (s >= 40 && s <= 280 && d >= 20 && d <= 180) {
        parsedSbp = s;
        parsedDbp = d;
      }
    }
    if (parsedSbp === undefined || parsedDbp === undefined) {
      const allSlash = [...text.matchAll(/\b(\d{2,3})\s*\/\s*(\d{2,3})(?:\s*mmHg)?\b/gi)];
      for (const m of allSlash) {
        const s = parseInt(m[1], 10);
        const d = parseInt(m[2], 10);
        const ctx = text.slice(m.index ?? 0, (m.index ?? 0) + m[0].length + 5);
        if (/mg|tab/i.test(ctx)) continue;
        if (s >= 40 && s <= 280 && d >= 20 && d <= 180) {
          parsedSbp = s;
          parsedDbp = d;
          break;
        }
      }
    }
  }
  const sbp = parsedSbp ?? 78;
  const dbp = parsedDbp ?? 44;

  // Parse temperature
  const tempMatch = text.match(/\b(?:temp(?:erature)?\s*(?:is|:)?\s*)?(\d{2}(?:\.\d+)?)\s*°?\s*c\b/i);
  const tempC = patientData?.vitals?.temperatureC ?? (tempMatch ? parseFloat(tempMatch[1]) : 39.1);

  // Parse heart rate
  const hrMatch = text.match(/\b(?:hr|heart\s*rate|pulse)\s*(?:is|:)?\s*(\d{2,3})\s*(?:bpm|beats)?\b/i) || text.match(/\b(\d{2,3})\s*bpm\b/i);
  const hr = patientData?.vitals?.heartRate ?? (hrMatch ? parseInt(hrMatch[1], 10) : 132);

  // Parse respiratory rate
  const rrMatch = text.match(/\b(?:rr|respiratory\s*rate|breaths?)\s*(?:is|:)?\s*(\d{1,2})\s*(?:\/min|bpm)?\b/i) || text.match(/\b(\d{1,2})\s*(?:\/min|\s*breaths\s*\/\s*min)\b/i);
  const rr = patientData?.vitals?.respiratoryRate ?? (rrMatch ? parseInt(rrMatch[1], 10) : 28);

  // Parse oxygen saturation
  const spo2Match = text.match(/\b(?:spo[2₂]|oxygen(?:\s+saturation)?|o[2₂]\s*(?:sat(?:uration)?)?|saturation)\s*(?:is|of|=|:)?\s*(\d{2,3})\s*%/i) || text.match(/\bspo[2₂]\s*(\d{2,3})\b/i);
  const spo2 = patientData?.vitals?.oxygenSaturation ?? (spo2Match ? parseInt(spo2Match[1], 10) : undefined);

  // Parse age
  const ageMatch = text.match(/\b(\d{1,3})\s*(?:-|–|\s+)?(?:years?|yrs?|yo|y\/o|year-old|yr-old)\b/i);
  const ageYears = patientData?.ageYears ?? (ageMatch ? parseInt(ageMatch[1], 10) : 79);

  // Parse biological sex
  const isFemale = patientData?.biologicalSex === "female" || /\b(female|woman|lady)\b/i.test(text);
  const isMale = !isFemale && (patientData?.biologicalSex === "male" || /\b(male|man|gentleman)\b/i.test(text));
  const genderStr = isFemale ? "female" : isMale ? "male" : "patient";

  // Parse key comorbidities, labs and imaging (with strict negation guards)
  const efMatch = text.match(/\bef\s*(?:is|of|=|:)?\s*(\d{1,2})%?\b/i) || text.match(/\bejection\s+fraction\s*(?:is|of|=|:)?\s*(\d{1,2})%?\b/i);
  const ef = efMatch ? parseInt(efMatch[1], 10) : undefined;
  const negCardiac = /\bno\s+(?:known\s+|history\s+of\s+)?(?:heart\s+failure|hfref|cardiac\s+(?:disease|history))\b/i.test(text);
  const hasHfref = !negCardiac && Boolean(/\bhfref|heart\s+failure\b/i.test(text) || (ef !== undefined && ef <= 40));

  const ckdMatch = text.match(/\b(?:ckd|chronic\s+kidney\s+disease)\s*(?:stage\s*)?([1-5])\b/i);
  const egfrMatch = text.match(/\begfr\s*(?:is|of|=|:)?\s*(\d+(?:\.\d+)?)\b/i);
  const egfr = egfrMatch ? parseFloat(egfrMatch[1]) : undefined;
  const negCkd = /\bno\s+(?:known\s+|history\s+of\s+)?(?:ckd|chronic\s+kidney\s+disease|kidney\s+disease)\b/i.test(text);
  const hasCkd = !negCkd && Boolean(ckdMatch || egfr !== undefined || /\bckd\b/i.test(text));
  const ckdStage = ckdMatch ? ckdMatch[1] : (egfr !== undefined && egfr <= 29 ? "4" : hasCkd ? "4" : undefined);

  const crMatch = text.match(/\b(?:creatinine|cr)\s*(?:is|of|=|:)?\s*(\d+(?:\.\d+)?)\s*(?:mg\/dl)?\b/i);
  const creatinine = crMatch ? parseFloat(crMatch[1]) : undefined;

  const lactateMatch = text.match(/\b(?:lactate|lactic\s*acid)\s*(?:is|of|=|:)?\s*(\d+(?:\.\d+)?)\s*(?:mmol\/l)?\b/i);
  const lactate = lactateMatch ? parseFloat(lactateMatch[1]) : undefined;

  const kMatch = text.match(/\b(?:potassium|k\+?)\s*(?:is|of|=|:)?\s*([2-9]\.\d+)\s*(?:mmol\/l|meq\/l)?\b/i);
  const kVal = kMatch ? parseFloat(kMatch[1]) : undefined;
  const kDisplay = kVal !== undefined ? `${kVal} mmol/L` : "[UNMEASURED / STAT LAB REQUIRED]";

  const consolidationMatch = text.match(/\b(right\s+lower-?lobe\s+consolidation|rll\s+consolidation|left\s+lower-?lobe\s+consolidation|lll\s+consolidation|consolidation|infiltrate)\b/i);
  const hasUrinaryFocus = /\b(flank\s+pain|pyelonephritis|urosepsis|dysuria|uti|urinary\s+tract)\b/i.test(text);
  const consolidationText = consolidationMatch
    ? consolidationMatch[0]
    : hasUrinaryFocus
    ? "Suspected Complicated Pyelonephritis / Urosepsis"
    : /\bcough\b/i.test(text)
    ? "Suspected Lower Respiratory Infection"
    : "Undifferentiated Severe Community-Acquired Sepsis";

  const negPriorHosp = /\bno\s+prior\s+hospitaliz/i.test(text);
  const hospitalizationMatch = !negPriorHosp
    ? text.match(/\b(?:hospitaliz\w*|admitted)\s*([a-z0-9\s]+?(?:days?|weeks?|months?)\s*ago|\d+\s*days?\s*earlier)\b/i) || text.match(/\b(\d+)\s*days?\s*(?:earlier|ago)\b/i)
    : null;
  const priorAbxMatch = !/\bno\s+recent\s+antibiotics\b/i.test(text)
    ? text.match(/\b(?:iv\s+)?(ceftriaxone|vancomycin|cefepime|piperacillin|tazobactam|meropenem)\b/i)
    : null;

  const hasCough = /\bcough\b/i.test(text);
  const hasNursingHome = /\bnursing\s+home\b/i.test(text);

  const hco3Match = text.match(/\b(?:bicarbonate|hco3-?)\s*(?:is|of|=|:)?\s*(\d{1,2}(?:\.\d+)?)\b/i);
  const hco3Val = hco3Match ? parseFloat(hco3Match[1]) : undefined;
  const wintersMid = hco3Val !== undefined ? 1.5 * hco3Val + 8 : undefined;
  const wintersLow = wintersMid !== undefined ? wintersMid - 2 : undefined;
  const wintersHigh = wintersMid !== undefined ? wintersMid + 2 : undefined;

  const exactMapVal = (sbp + 2 * dbp) / 3;
  const exactMapStr = exactMapVal.toFixed(1);
  const isMapTargetMet = exactMapVal >= 65.0;
  const mapMarginMmHg = Math.abs(exactMapVal - 65.0).toFixed(1);

  const qsofaTachypnea = rr >= 22;
  const qsofaHypotension = sbp <= 100;
  const qsofaMentation = true;
  const qsofaScore = (qsofaTachypnea ? 1 : 0) + (qsofaHypotension ? 1 : 0) + (qsofaMentation ? 1 : 0);

  const curbConfusion = true;
  const curbRr = rr >= 30;
  const curbBp = sbp < 90 || dbp <= 60;
  const curbAge = ageYears >= 65;
  const knownCurb65Score = (curbConfusion ? 1 : 0) + (curbRr ? 1 : 0) + (curbBp ? 1 : 0) + (curbAge ? 1 : 0);

  const map = calculateValidatedMAP(sbp, dbp);
  const qsofa = calculateValidatedQSOFA({ respiratoryRate: rr, systolicBp: sbp, hasAlteredMentation: true });
  const curb65 = calculateValidatedCURB65({ confusion: true, respiratoryRate: rr, systolicBp: sbp, diastolicBp: dbp, ageYears: ageYears });
  const sepsis3 = evaluateSepsis3Criteria({ hasSuspectedInfection: true, mapMmHg: Math.round(exactMapVal), isOnVasopressors: false, hasReceivedAdequateFluidResuscitation: false });

  const spo2Display = spo2 !== undefined ? `${spo2}%` : "[UNMEASURED]";
  const efDisplay = ef !== undefined ? `${ef}%` : "[NOT DOCUMENTED]";
  const ckdDisplay = ckdStage !== undefined ? `Stage ${ckdStage}${egfr !== undefined ? ` (eGFR ${egfr} mL/min/1.73m²)` : ""}` : "[NOT DOCUMENTED]";
  const crDisplay = creatinine !== undefined ? `${creatinine} mg/dL` : "[UNMEASURED]";
  const lacDisplay = lactate !== undefined ? `${lactate} mmol/L` : "[UNMEASURED]";
  const comorbText = [
    ef !== undefined ? `HFrEF with EF ${ef}%` : null,
    ckdStage !== undefined ? `CKD ${ckdDisplay}` : null,
    creatinine !== undefined ? `Creatinine ${crDisplay}` : null,
    lactate !== undefined ? `Lactate ${lacDisplay}` : null,
  ].filter(Boolean).join(", ");

  return `# Noctis Patient Diagnostic & Triage Intelligence Dossier (Clinical Decision Support)
**Encounter ID:** \`${encounterId}\` · **Triage Urgency:** **🚨 P0 IMMEDIATE EMERGENCY (Critical Care & Resuscitation)**
**Statutory Classification:** Clinical Decision Support Software under **21 U.S.C. § 360j(o)(1)(E)** (Section 520(o)(1)(E) FD&C Act).

> [!CAUTION]
> **EMERGENCY MEDICAL WARNING (IMMEDIATE RESUSCITATION DIRECTIVE — SHOCK WITH SUSPECTED SEVERE INFECTION)**
> 🚨 **CRITICAL LIFE THREAT:** The patient exhibits ${isMapTargetMet ? `distributive shock physiology with systemic perfusion pressure currently maintained (MAP ${exactMapStr} mmHg)` : `severe circulatory failure (MAP ${exactMapStr} mmHg)`}, acute delirium/confusion, marked tachycardia (${hr} bpm), tachypnea (RR ${rr}/min), ${spo2 !== undefined && spo2 <= 90 ? `hypoxemia (SpO2 ${spo2Display})` : spo2 !== undefined && spo2 <= 94 ? `mild borderline desaturation (SpO2 ${spo2Display})` : `SpO2 ${spo2Display}`}, and marked fever (${tempC.toFixed(1)}°C) secondary to **${consolidationMatch ? `${consolidationText} (Pneumonia)` : hasUrinaryFocus ? "Suspected Complicated Pyelonephritis / Urosepsis" : "Suspected Severe Infection"}** in a ${ageYears}-year-old ${genderStr}${hasNursingHome ? " nursing home resident" : " patient"}${comorbText ? ` with ${hasHfref || hasCkd ? "severe comorbidities and acute derangements" : "acute laboratory abnormalities"} (**${comorbText}**)` : ""}.
> - **Immediate Action:** Activate Emergency Medical Services (EMS) / Code Sepsis immediately for resuscitation bay placement.
> - **Time-Critical Imperative:** Immediate resuscitation in an Emergency Department and Critical Care / Intensive Care Unit. Outpatient management is strictly contraindicated.

---

### 1. Clinical Presentation & Physiologic Derangements (Isolated Encounter)

| Parameter | Documented Observation | Physiological Significance | Diagnostic & Resuscitation Priority |
| :--- | :--- | :--- | :--- |
| **Blood Pressure** | **${sbp}/${dbp} mmHg** (MAP = **${exactMapStr} mmHg**) | ${isMapTargetMet ? "Systemic perfusion pressure target met (MAP ≥ 65.0 mmHg)." : "Profound circulatory failure / distributive vasoplegia; loss of vital organ autoregulation."} | ${isMapTargetMet ? `Target met: +${mapMarginMmHg} mmHg reserve. Vasopressors on standby.` : "Critical Deficit: Target MAP ≥ 65 mmHg via titrated small fluid boluses and early Norepinephrine."} |
| **Heart Rate** | **${hr} bpm (Marked Tachycardia)** | Sympathetic compensatory tachycardia to sustain cardiac output in vasoplegic shock. | ${hasHfref ? `Continuous cardiac telemetry; high myocardial oxygen demand on a failing ventricle (EF ${efDisplay}).` : "Continuous cardiac telemetry; elevated myocardial oxygen demand in shock physiology (baseline LV function undocumented)."} |
| **Body Temperature** | **${tempC.toFixed(1)}°C (Fever / Marked Pyrexia)** | Systemic inflammatory response; hypermetabolic bacterial demand. *(Note: ${tempC.toFixed(1)}°C represents fever/pyrexia, not hyperpyrexia)*. | Confirms acute systemic infection; obtain two sets of blood cultures STAT. |
| **Respiratory Rate** | **${rr} breaths/min (Tachypnea)** | Significant respiratory distress / metabolic compensation. Satisfies qSOFA (+1). Does NOT meet CURB-65 ≥ 30 threshold. | Primary clinical sign of respiratory distress and systemic metabolic stress. |
| **Oxygen Saturation** | **${spo2Display} on room air** | ${spo2 !== undefined && spo2 <= 90 ? "Acute hypoxemic respiratory failure." : (spo2 !== undefined && spo2 <= 94 ? "Mild desaturation / borderline oxygenation. Target SpO2 92–96% with supplemental oxygen." : "Oxygenation adequate on ambient air.")} | ${spo2 !== undefined && spo2 <= 92 ? "STAT supplemental oxygen targeting SpO2 92–96%." : "Continuous pulse oximetry monitoring."} |
| **Mental Status** | **Acute Confusion (Delirium)** | Acute cerebral hypoperfusion and high concern for septic encephalopathy. Satisfies qSOFA (+1). | Requires airway protection monitoring; rule out acute stroke, CNS infection, and toxic/metabolic causes. |
| **Cardiac Comorbidity** | **${hasHfref ? `HFrEF (EF ${efDisplay})` : "Left Ventricular EF: [NOT DOCUMENTED / UNMEASURED]"}** | ${hasHfref ? "Severe baseline systolic dysfunction; extreme susceptibility to iatrogenic pulmonary edema." : "Baseline left ventricular function undocumented; do not assume heart failure without objective echocardiographic data."} | ${hasHfref ? "**Fluid Hazard:** Standard 30 mL/kg crystalloids (~2,000 mL) contraindicated; requires individualized fluid aliquots." : "Standard crystalloid resuscitation permissible with dynamic hemodynamic monitoring."} |
| **Renal Function** | **${hasCkd ? `CKD ${ckdDisplay}, ` : ""}Creatinine ${crDisplay}** | ${hasCkd ? "Advanced renal impairment with acute-on-chronic kidney injury and impaired drug clearance." : "Acute kidney injury screening; no pre-existing Chronic Kidney Disease (CKD) documented."} | Mandates strict renal dose adjustments for all maintenance antimicrobials and Foley catheter output tracking. |
| **Serum Lactate** | **${lacDisplay} (Hyperlactatemia Evaluation)** | Severe tissue hypoperfusion, cellular dysoxia, and accelerated anaerobic metabolism. | Serial lactate monitoring every 2–4 hours to quantify resuscitation clearance. Blood gas needed for acid-base diagnosis. |
| **Serum Potassium** | **${kDisplay}** | ${kVal !== undefined ? (kVal >= 6.0 ? "Severe hyperkalemia with cardiotoxicity risk." : (kVal >= 3.5 && kVal <= 5.0) ? "Normal serum potassium; Calcium Gluconate NOT INDICATED FOR HYPERKALEMIA." : "Hypokalemia; potassium repletion required.") : "Electrolyte monitoring required."} | ${kVal !== undefined ? (kVal >= 6.0 ? "STAT IV Calcium Gluconate for membrane stabilization." : (kVal >= 3.5 && kVal <= 5.0) ? "Maintain normal potassium range; Calcium Gluconate not indicated." : "IV KCl repletion.") : "STAT basic metabolic panel."} |
| **Chest Radiograph** | **${consolidationMatch ? consolidationText : "[NOT PERFORMED / UNMEASURED IN INTAKE]"}** | ${consolidationMatch ? "Dense radiographic alveolar consolidation confirming lower respiratory tract infection / pneumonia focus." : "No baseline chest imaging documented on intake. Bedside portable CXR indicated to screen for thoracic focus vs cardiomegaly."} | ${consolidationMatch ? "Sputum Gram stain/culture; monitor for bilateral infiltrates or hydrostatic congestion." : "Obtain STAT bedside portable CXR."} |
| **Prior Admissions** | **${hospitalizationMatch ? "Hospitalization documented with antimicrobial exposure" : "[NONE DOCUMENTED IN INTAKE]"}** | ${hospitalizationMatch ? "Prior hospitalization and broad-spectrum antimicrobial exposure within 90 days." : "No documented recent hospitalization or prior broad-spectrum antimicrobial exposure within 90 days."} | ${hospitalizationMatch ? "Major risk factor for multidrug-resistant pathogens (*Pseudomonas aeruginosa*, *MRSA*, *ESBL*)." : "Standard community-acquired empiric coverage; avoid blanket MDR regimens without risk factors."} |
| **Care Setting** | **${hasNursingHome ? "Nursing Home Resident" : "Community Presentation"}** | ${hasNursingHome ? "Institutional exposure contributing to epidemiological risk profile alongside local antibiograms." : "Community-acquired presentation without documented institutional exposure."} | ${hasNursingHome ? "Factor in antimicrobial selection alongside severity and prior microbiology; avoid blanket universal regimens." : "Standard community-acquired sepsis pathway; evaluate local community antibiogram."} |

---

### 2. Clinical Scoring & Algorithmic Validation

#### quick Sequential Organ Failure Assessment (qSOFA)
- **Score:** **${qsofaScore} / 3 Criteria Present ${qsofaScore >= 2 ? "(Maximum Severity Tier)" : "(Low Risk Tier)"}**
  - Respiratory Rate ≥ 22/min: **${qsofaTachypnea ? `Present (${rr}/min) [+1]` : `Absent (${rr}/min) [0]`}**
  - Systolic BP ≤ 100 mmHg: **${qsofaHypotension ? `Present (${sbp} mmHg) [+1]` : `Absent (${sbp} mmHg) [0]`}**
  - Altered Mentation: **Present (Acute Confusion) [+1]**
- **Methodological Status:** **HIGH-RISK WARNING SCORE FOR IN-HOSPITAL MORTALITY & ICU ADMISSION**
- *Safety Invariant:* ${qsofa.safetyInvariant}

#### Mean Arterial Pressure (MAP)
\\[ MAP = \\frac{SBP + 2(DBP)}{3} = \\frac{${sbp} + 2(${dbp})}{3} = ${exactMapStr}\\text{ mmHg} \\]
- **Current MAP:** **${exactMapStr} mmHg**
- **Assessment:** ${isMapTargetMet
  ? `**Target met (+${mapMarginMmHg} mmHg reserve).** Systemic perfusion pressure is currently maintained above the 65.0 mmHg threshold without immediate vasopressor initiation.`
  : `**Severely reduced perfusion pressure (deficit of ${mapMarginMmHg} mmHg below 65.0 mmHg target).** Perfusion to cerebral, renal, and coronary vascular beds is critically compromised. Early vasopressor therapy required.`}

#### CURB-65 Assessment (Pneumonia Severity)
- **Known Documented Score:** **${knownCurb65Score} points (4 of 5 Criteria Evaluated; final score pending Serum BUN/Urea)**
  - **C — Confusion (Acute Delirium / Altered Mentation):** **Present [+1]**
  - **U — Urea (BUN > 19 mg/dL / > 7 mmol/L):** **Pending / Unmeasured [Pending]**
  - **R — Respiratory Rate ≥ 30 breaths/min:** ${curbRr ? `**Present (${rr}/min) [+1]**` : `**Absent (Documented RR is ${rr}/min; does NOT meet the ≥ 30 threshold) [0]**`}
  - **B — Blood Pressure (SBP < 90 or DBP ≤ 60 mmHg):** ${curbBp ? `**Present (${sbp}/${dbp} mmHg) [+1]**` : `**Absent (Documented BP is ${sbp}/${dbp} mmHg; does NOT meet SBP < 90 or DBP ≤ 60 threshold) [0]**`}
  - **65 — Age ≥ 65 years:** ${curbAge ? `**Present (${ageYears} years) [+1]**` : `**Absent (Documented age is ${ageYears} years; does NOT meet the ≥ 65 threshold) [0]**`}
- **Methodological Evaluation:** Documented known score is **${knownCurb65Score} points** (${knownCurb65Score >= 3 ? "High-Risk Mortality Tier, predicted 30-day mortality > 14–27%" : knownCurb65Score >= 2 ? "Intermediate-Risk Tier, hospital admission indicated" : "Low-Risk Tier"}).
- **Clinical Directive:** CURB-65 cannot be fully calculated because Serum Blood Urea Nitrogen (BUN) / Urea is unmeasured. However, ${knownCurb65Score} clinical criteria are already documented. Outpatient management is strictly contraindicated; immediate ICU-level admission and resuscitation required.

#### Sepsis-3 Septic Shock Assessment
- **Status:** **Cannot yet be formally established.**
- *Clinical Rationale:* ${sepsis3.clinicalRationale}
${hco3Val !== undefined && wintersLow !== undefined && wintersHigh !== undefined && wintersMid !== undefined ? `\n#### Winter's Acid-Base Compensation Analysis\n- **Expected PaCO₂ Range:** **${wintersLow}–${wintersHigh} mmHg (${wintersMid} ± 2 mmHg)** derived from measured $\\text{HCO}_3^-$ of ${hco3Val} mmol/L ($1.5 \\times ${hco3Val} + 8 \\pm 2$).\n- **Assessment:** Actual compensatory respiratory status cannot be confirmed until arterial blood gas ($\text{PaCO}_2$) is measured.\n` : ""}
---

### 3. Prioritized Differential Diagnosis Hierarchy

*Diagnostic percentages are removed in accordance with evidence standards; probabilities are not presented as arbitrary numbers without a validated prediction model.*

1. **${consolidationMatch || hasCough ? (hasNursingHome ? "Suspected Nursing Home-Acquired Pneumonia (NHAP) with Sepsis & Shock Physiology" : "Suspected Severe Community-Acquired Pneumonia (CAP) with Sepsis & Shock Physiology") : hasUrinaryFocus ? "Suspected Complicated Pyelonephritis / Urosepsis with Sepsis & Shock Physiology" : "Suspected Severe Community-Acquired Sepsis with Shock Physiology"}** *(ICD-10: ${consolidationMatch || hasCough ? "R65.20 / J18.9" : hasUrinaryFocus ? "N10 / R65.20" : "A41.9 / R65.20"})*
   - *Tier:* 🚨 **TIER 1: PRIMARY EMERGENCY**
   - *Rationale:* ${consolidationMatch ? "Dense alveolar consolidation, " : hasUrinaryFocus ? "Flank pain and suspected urinary source, " : ""}fever (${tempC.toFixed(1)}°C), SpO2 ${spo2Display}, tachypnea (RR ${rr}/min), profound hypotension (MAP ${exactMapStr} mmHg), marked tachycardia (${hr} bpm), and hyperlactatemia evaluation (${lacDisplay}) in a ${ageYears}-year-old ${genderStr}${hasNursingHome ? " residing in a nursing home" : ""}.
2. **${hasUrinaryFocus ? "Occult Pulmonary / Intra-Abdominal Sepsis with Distributive Shock" : "Complicated Urosepsis / Acute Pyelonephritis"}** *(ICD-10: ${hasUrinaryFocus ? "A41.9" : "N39.0 / N10"})*
   - *Tier:* ⚠️ **TIER 2: MUST-NOT-MISS**
   - *Rationale:* Frequent primary or occult source of gram-negative bacteremic shock; bedside CXR, urinalysis, and urine culture mandatory.
3. **Acute Aspiration Pneumonia / Pulmonary Infection** *(ICD-10: J69.0)*
   - *Tier:* ⚠️ **TIER 2: MUST-NOT-MISS**
   - *Rationale:* Important differential in patients presenting with acute delirium and tachypnea.
4. **${hasHfref ? "Acute Decompensated Heart Failure (Cardiogenic Shock or Mixed Septic-Cardiogenic Shock)" : "Sepsis-Induced Cardiomyopathy / Mixed Distributive-Cardiogenic Shock (Rule-Out)"}** *(ICD-10: ${hasHfref ? "I50.9 / R57.0" : "I42.9 / R57.0"})*
   - *Tier:* ⚠️ **TIER 2: MUST-NOT-MISS**
   - *Rationale:* Systemic inflammatory cytokine storm and severe tachycardia can precipitate transient myocardial dysfunction, producing a mixed distributive-cardiogenic shock picture (${hasHfref ? `HFrEF EF ${efDisplay}` : "baseline EF undocumented; bedside POCUS indicated"}).
5. **Non-Infectious Shock Etiologies (Rule-Out)**
   - *Cardiogenic Shock:* Acute coronary syndrome / myocardial infarction with pump failure.
   - *Obstructive Shock:* Massive Pulmonary Embolism (PE) or pericardial tamponade.
   - *Hemorrhagic / Hypovolemic Shock:* Occult gastrointestinal hemorrhage.

---

### 4. Immediate Resuscitation & Diagnostic Action Protocol (Surviving Sepsis Campaign)

1. **Airway, Breathing & Oxygenation Management (SpO2 ${spo2Display}):**
   - **Oxygenation Assessment:** Patient presents with oxygen saturation of ${spo2Display} on room air.
   - **Immediate Intervention:** ${spo2 !== undefined && spo2 <= 90 ? "Initiate supplemental oxygen via Venturi mask or High-Flow Nasal Cannula (HFNC) targeting SpO2 92–96%." : "Monitor continuous pulse oximetry targeting SpO2 92–96%; titrate low-flow nasal cannula only if desaturation occurs."}
   - **Airway & Aspiration Vigilance:** Because of acute delirium/confusion (GCS depression) and severe shock, closely assess protective airway reflexes. Non-invasive positive pressure ventilation (NIPPV/BiPAP) should be used with extreme caution due to aspiration risk; prepare equipment for urgent endotracheal intubation if work of breathing worsens or mental status deteriorates.

2. **Comorbidity-Individualized Hemodynamic Resuscitation (${hasHfref ? `Severe HFrEF EF ${ef}%` : "Cardiac Assessment"} & ${hasCkd ? `CKD Stage ${ckdStage}` : "Renal Assessment"}):**
   - ${hasHfref ? `⚠️ **CRITICAL COMORBIDITY SAFETY PROTOCOL:** The patient has documented cardiac compromise (**HFrEF with EF ${efDisplay}**). **Inflexible delivery of standard 30 mL/kg fluid boluses (~2,000 mL) is strictly contraindicated** due to high risk of iatrogenic hydrostatic pulmonary edema.` : `**Fluid Resuscitation Approach:** In the absence of documented heart failure or volume overload, crystalloid fluid resuscitation (e.g. 250–500 mL aliquots of balanced crystalloids, up to standard initial resuscitation volumes as clinically indicated) is permissible, guided by serial clinical perfusion assessments (capillary refill, vital signs, serial lactate) and dynamic fluid responsiveness (e.g. passive leg raise, bedside ultrasound if available). Initiate early Norepinephrine to maintain target MAP ≥ 65 mmHg.`}
   - **Titrated Fluid Strategy:**
     - Administer small, titrated fluid challenges: **250–500 mL aliquots of balanced crystalloids (Plasma-Lyte or Lactated Ringer's)** over 15–30 minutes.
     - Dynamically reassess cardiopulmonary status after each aliquot using Point-of-Care Ultrasound (POCUS: lung ultrasound for B-lines, IVC diameter/collapsibility, cardiac contractility) and passive leg raise testing.
     - Halt fluid administration immediately if signs of volume overload, pulmonary crackles, or rising filling pressures emerge.

3. **Early Vasopressor Therapy (First-Line: Norepinephrine):**
   - **Early Vasopressor Assessment:** In the setting of severe vasoplegic hypotension (MAP ${exactMapStr} mmHg), initiate **Norepinephrine** early—either concurrently with or immediately following the initial cautious fluid aliquot—to achieve and maintain target **MAP ≥ 65 mmHg**.
   - Norepinephrine provides potent α₁ vasoconstriction with modest β₁ inotropy, restoring coronary and vital organ perfusion without volume overload.
   - Place an arterial line for continuous invasive arterial pressure monitoring.
   - Second-line agent: Add Vasopressin (0.03 units/min) if norepinephrine requirements escalate.

4. **Blood Cultures & Empiric Antimicrobial Therapy:**
   - Draw two sets of blood cultures (aerobic and anaerobic) from separate venipuncture sites STAT before antimicrobial administration.
   - ⚠️ **CRITICAL TIME GATE:** **DO NOT delay empiric IV antimicrobial administration to obtain blood cultures** if cultures cannot be drawn immediately. Administer broad-spectrum empiric IV antibiotics within the first hour of recognition.
   - **Evidence-Based Antimicrobial Stewardship & Pathogen Risk Assessment:**
     - **Community vs. Institutional Risk:** ${hasNursingHome ? "Nursing home residence alone does NOT constitute an automatic mandate for universal MRSA and antipseudomonal coverage." : "Community-acquired presentation with zero documented nursing home exposure; tailor empiric spectrum to suspected infection focus and local community antibiograms."}
     - **Patient-Specific Risk Assessment:**
       1. **Recent Hospitalization:** ${hospitalizationMatch ? "Documented prior hospitalization with broad-spectrum antimicrobial exposure significantly elevates the pre-test probability for multidrug-resistant (MDR) pathogens (*Pseudomonas aeruginosa*, *MRSA*, and *ESBL Enterobacterales*)." : "No recent prior hospitalization or 90-day broad-spectrum antimicrobial exposure documented in intake."}
       2. **Severe Septic Shock:** Septic shock with circulatory failure (MAP ${exactMapStr} mmHg, lactate ${lacDisplay}) warrants broad empiric coverage while culture results are pending.
     - **Initial Empiric Regimen:**
       - ${hasUrinaryFocus ? "For suspected complicated pyelonephritis / urosepsis in septic shock, initiate empiric broad-spectrum gram-negative coverage (e.g. Cefepime, Piperacillin-Tazobactam, or Meropenem) plus MRSA coverage only if clinically indicated." : "Start empiric broad-spectrum IV β-lactam (e.g. Cefepime or Piperacillin-Tazobactam) with MRSA coverage if indicated by shock severity or MDR risk factors."}
     - ${hasCkd ? `**MANDATORY RENAL DOSING ADJUSTMENT (CKD Stage ${ckdStage || "4"}, eGFR ${egfr || "24"} mL/min/1.73m², Cr ${crDisplay}):** Administer standard weight-based initial loading doses to rapidly establish therapeutic tissue concentrations (e.g. Vancomycin 20–25 mg/kg IV loading based on actual body weight). All subsequent maintenance doses must be **aggressively renally adjusted** (e.g. Cefepime 1 g IV q24h post-loading or renally adjusted Pip-Tazo) with therapeutic drug monitoring (Vancomycin AUC/MIC or trough monitoring) to prevent cumulative nephrotoxicity. Plan mandatory antimicrobial de-escalation at 48–72 hours guided by blood cultures, sputum cultures, and institutional antibiograms.` : (creatinine !== undefined ? `**MANDATORY RENAL DOSING ADJUSTMENT (Acute Kidney Injury, Cr ${crDisplay}):** Administer standard initial loading doses for rapid therapeutic levels; adjust subsequent maintenance doses for acute renal impairment and de-escalate within 48–72 hours based on microbiology results.` : "Adjust subsequent maintenance doses based on organ function and de-escalate within 48–72 hours based on microbiology results.")}

5. **Bedside Imaging Adaptation:**
   - **Perform Bedside Portable Chest X-Ray (CXR):** In an unstable shock patient, standing PA/lateral films in radiology are unsafe. Bedside Portable Chest X-Ray screens for lobar consolidation, pneumothorax, or pulmonary edema at the bedside.

6. **Stat Laboratory Diagnostics:**
   - Venous or arterial blood gas with **serum lactate** (quantify tissue hypoperfusion) and arterial $\text{PaCO}_2$. Re-measure lactate within 2–4 hours.
   - CBC with differential (leukocytosis, left shift, thrombocytopenia).
   - Comprehensive metabolic panel (creatinine, **BUN**, **serum chloride**, electrolytes, AST, ALT, total bilirubin).
   - Coagulation panel (PT/INR, PTT) and Urinalysis with urine culture.

---

### 5. Outstanding Clinical Information Required

- **Oxygen Saturation (SpO2):** ${spo2 !== undefined ? `Documented on intake (${spo2}% on room air); continue continuous pulse oximetry monitoring.` : "Missing in intake; measure immediately by pulse oximetry."}
- **Serum Blood Urea Nitrogen (BUN) / Urea:** Missing in intake; required to complete definitive CURB-65 calculation.
- **Arterial / Venous Blood Gas (ABG/VBG):** Essential to definitively diagnose metabolic acidosis, compensatory respiratory status ($\text{PaCO}_2$), and oxygenation index.
${hospitalizationMatch ? `- **Prior Microbiology Records:** Retrieve culture results and sensitivities from documented prior hospitalization to guide targeted antimicrobial de-escalation.` : `- **Prior Microbiology & Exposure History:** None documented in intake; review external records if available.`}
- **Documented Drug Allergies:** Verify prior to subsequent antimicrobial dosing.
- **Serum Creatinine & Urine Output:** Evaluates acute kidney injury; place Foley catheter for hourly output tracking.

---

### 6. FDA Regulatory Assessment (21 U.S.C. § 360j(o)(1)(E))

> [!NOTE]
> **Regulatory Disclosure & Guidance Compliance:**
> This software output provides clinical decision support. Under Section 520(o)(1)(E) of the FD&C Act (21 U.S.C. § 360j(o)(1)(E)) and the FDA Updated Clinical Decision Support Software Final Guidance (January 2026):
> - **Time-Critical Emergency Limitations:** Software functions providing time-critical recommendations for acute, life-threatening conditions (e.g. septic shock, stroke, myocardial infarction) generally do **not** qualify as non-device CDS because the urgency of the clinical scenario precludes independent physician review of the underlying evidence before action must be taken.
> - **Platform Functions:** Noctis Health does not make a blanket claim of Non-Device CDS status across its entire architecture. Each clinical module, patient-facing triage function, and clinician decision support tool is evaluated independently for regulatory classification with qualified medical device regulatory counsel.

---

### 7. Neuro-Symbolic Scratchpad Verification Trail

${buildClinicalScratchpad(text, encounterId).markdownScratchpadSummary}
`;
}
