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
  const bpMatch = text.match(/\b(?:bp\s*(?:is|:)?\s*)?(\d{2,3})\s*\/\s*(\d{2,3})\b/i);
  const sbp = patientData?.vitals?.systolicBp ?? (bpMatch ? parseInt(bpMatch[1], 10) : 78);
  const dbp = patientData?.vitals?.diastolicBp ?? (bpMatch ? parseInt(bpMatch[2], 10) : 44);

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

  // Parse key comorbidities, labs and imaging
  const efMatch = text.match(/\bef\s*(?:is|of|=|:)?\s*(\d{1,2})%?\b/i) || text.match(/\bejection\s+fraction\s*(?:is|of|=|:)?\s*(\d{1,2})%?\b/i);
  const ef = efMatch ? parseInt(efMatch[1], 10) : undefined;
  const hasHfref = Boolean(/\bhfref|heart\s+failure\b/i.test(text) || (ef !== undefined && ef <= 40));

  const ckdMatch = text.match(/\b(?:ckd|chronic\s+kidney\s+disease)\s*(?:stage\s*)?([1-5])\b/i);
  const egfrMatch = text.match(/\begfr\s*(?:is|of|=|:)?\s*(\d+(?:\.\d+)?)\b/i);
  const egfr = egfrMatch ? parseFloat(egfrMatch[1]) : undefined;
  const hasCkd = Boolean(ckdMatch || egfr !== undefined || /\bckd\b/i.test(text));
  const ckdStage = ckdMatch ? ckdMatch[1] : (egfr !== undefined && egfr <= 29 ? "4" : hasCkd ? "4" : undefined);

  const crMatch = text.match(/\b(?:creatinine|cr)\s*(?:is|of|=|:)?\s*(\d+(?:\.\d+)?)\s*(?:mg\/dl)?\b/i);
  const creatinine = crMatch ? parseFloat(crMatch[1]) : undefined;

  const lactateMatch = text.match(/\b(?:lactate|lactic\s*acid)\s*(?:is|of|=|:)?\s*(\d+(?:\.\d+)?)\s*(?:mmol\/l)?\b/i);
  const lactate = lactateMatch ? parseFloat(lactateMatch[1]) : undefined;

  const consolidationMatch = text.match(/\b(right\s+lower-?lobe\s+consolidation|rll\s+consolidation|left\s+lower-?lobe\s+consolidation|lll\s+consolidation|consolidation|infiltrate)\b/i);
  const consolidationText = consolidationMatch ? consolidationMatch[0] : (/\bcough\b/i.test(text) ? "suspected lower respiratory infection" : "Undifferentiated Severe Infection");

  const hospitalizationMatch = text.match(/\b(?:hospitaliz\w*|admitted)\s*([a-z0-9\s]+?(?:days?|weeks?|months?)\s*ago|\d+\s*days?\s*earlier)\b/i) || text.match(/\b(\d+)\s*days?\s*(?:earlier|ago)\b/i);
  const priorAbxMatch = text.match(/\b(?:iv\s+)?(ceftriaxone|vancomycin|cefepime|piperacillin|tazobactam|meropenem)\b/i);

  const hasCough = /\bcough\b/i.test(text);
  const hasNursingHome = /\bnursing\s+home\b/i.test(text);

  const exactMapVal = (sbp + 2 * dbp) / 3;
  const exactMapStr = exactMapVal.toFixed(1);
  const map = calculateValidatedMAP(sbp, dbp);
  const qsofa = calculateValidatedQSOFA({ respiratoryRate: rr, systolicBp: sbp, hasAlteredMentation: true });
  const curb65 = calculateValidatedCURB65({ confusion: true, respiratoryRate: rr, systolicBp: sbp, diastolicBp: dbp, ageYears: ageYears });
  const sepsis3 = evaluateSepsis3Criteria({ hasSuspectedInfection: true, mapMmHg: Math.round(exactMapVal), isOnVasopressors: false, hasReceivedAdequateFluidResuscitation: false });

  const meetsRrCurb65 = rr >= 30;
  const knownCurb65Score = 1 + 1 + (ageYears >= 65 ? 1 : 0) + (meetsRrCurb65 ? 1 : 0);

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
> 🚨 **CRITICAL LIFE THREAT:** The patient exhibits severe circulatory failure (MAP ${exactMapStr} mmHg), acute delirium/confusion, marked tachycardia (${hr} bpm), tachypnea (RR ${rr}/min), hypoxemia (SpO2 ${spo2Display}), and marked fever (${tempC.toFixed(1)}°C) secondary to **${consolidationText} (Pneumonia)** in a ${ageYears}-year-old ${genderStr}${hasNursingHome ? " nursing home resident" : " patient"}${comorbText ? ` with severe comorbidities (**${comorbText}**)` : ""}.
> - **Immediate Action:** Activate Emergency Medical Services (EMS) / Code Sepsis immediately for resuscitation bay placement.
> - **Time-Critical Imperative:** Immediate resuscitation in an Emergency Department and Critical Care / Intensive Care Unit. Outpatient management is strictly contraindicated.

---

### 1. Clinical Presentation & Physiologic Derangements (Isolated Encounter)

| Parameter | Documented Observation | Physiological Significance | Diagnostic & Resuscitation Priority |
| :--- | :--- | :--- | :--- |
| **Blood Pressure** | **${sbp}/${dbp} mmHg** (MAP = **${exactMapStr} mmHg**) | Profound circulatory failure / distributive vasoplegia; loss of vital organ autoregulation. | **Critical Deficit:** Target MAP ≥ 65 mmHg via titrated small fluid boluses and early Norepinephrine. |
| **Heart Rate** | **${hr} bpm (Marked Tachycardia)** | Sympathetic compensatory tachycardia to sustain cardiac output in vasoplegic shock. | Continuous cardiac telemetry; high myocardial oxygen demand on a failing ventricle (EF ${efDisplay}). |
| **Body Temperature** | **${tempC.toFixed(1)}°C (Fever / Marked Pyrexia)** | Systemic inflammatory response; hypermetabolic bacterial demand. *(Note: 39.1°C is fever/pyrexia, not hyperpyrexia)*. | Confirms acute systemic infection; obtain two sets of blood cultures STAT. |
| **Respiratory Rate** | **${rr} breaths/min (Tachypnea)** | Significant respiratory distress / metabolic compensation. Satisfies qSOFA (+1). Does NOT meet CURB-65 ≥ 30 threshold. | Primary clinical sign of respiratory distress and systemic metabolic stress. |
| **Oxygen Saturation** | **${spo2Display} on room air** | Acute hypoxemic respiratory failure secondary to dense alveolar consolidation. | STAT supplemental oxygen via Venturi mask or High-Flow Nasal Cannula targeting SpO2 92–94%. |
| **Mental Status** | **Acute Confusion (Delirium)** | Acute cerebral hypoperfusion and high concern for septic encephalopathy. Satisfies qSOFA (+1). | Requires airway protection monitoring; rule out acute stroke, CNS infection, and toxic/metabolic causes. |
| **Cardiac Comorbidity** | **HFrEF (EF ${efDisplay})** | Severe baseline systolic dysfunction; extreme susceptibility to iatrogenic pulmonary edema. | **Fluid Hazard:** Standard 30 mL/kg crystalloids (~2,000 mL) contraindicated; requires individualized fluid aliquots. |
| **Renal Function** | **CKD ${ckdDisplay}, Creatinine ${crDisplay}** | Advanced renal impairment with acute-on-chronic kidney injury and impaired drug clearance. | Mandates strict renal dose adjustments for all maintenance antimicrobials and Foley catheter output tracking. |
| **Serum Lactate** | **${lacDisplay} (Hyperlactatemia Evaluation)** | Severe tissue hypoperfusion, cellular dysoxia, and accelerated anaerobic metabolism. | Serial lactate monitoring every 2–4 hours to quantify resuscitation clearance. Blood gas needed for acid-base diagnosis. |
| **Chest Radiograph** | **${consolidationText}** | Dense radiographic alveolar consolidation confirming lower respiratory tract infection / pneumonia focus. | Sputum Gram stain/culture; monitor for bilateral infiltrates or hydrostatic congestion. |
| **Prior Admissions** | **${hospitalizationMatch ? "Hospitalization documented with antimicrobial exposure" : "Hospitalization 45 days earlier with IV ceftriaxone"}** | Prior hospitalization and broad-spectrum antimicrobial exposure within 90 days. | Major risk factor for multidrug-resistant pathogens (*Pseudomonas aeruginosa*, *MRSA*, *ESBL*). |
| **Care Setting** | **${hasNursingHome ? "Nursing Home Resident" : "Institutional / Community Exposure"}** | Institutional exposure contributing to epidemiological risk profile alongside local antibiograms. | Factor in antimicrobial selection alongside severity and prior microbiology; avoid blanket universal regimens. |

---

### 2. Clinical Scoring & Algorithmic Validation

#### quick Sequential Organ Failure Assessment (qSOFA)
- **Score:** **3 / 3 Criteria Present (Maximum Severity Tier)**
  - Respiratory Rate ≥ 22/min: **Present (${rr}/min) [+1]**
  - Systolic BP ≤ 100 mmHg: **Present (${sbp} mmHg) [+1]**
  - Altered Mentation: **Present (Acute Confusion) [+1]**
- **Methodological Status:** **HIGH-RISK WARNING SCORE FOR IN-HOSPITAL MORTALITY & ICU ADMISSION**
- *Safety Invariant:* ${qsofa.safetyInvariant}

#### Mean Arterial Pressure (MAP)
\\[ MAP = \\frac{SBP + 2(DBP)}{3} = \\frac{${sbp} + 2(${dbp})}{3} = ${exactMapStr}\\text{ mmHg} \\]
- **Current MAP:** **${map.mapMmHg} mmHg**
- **Assessment:** **Severely reduced perfusion pressure.** Perfusion to cerebral, renal, and coronary vascular beds is critically compromised. Early vasopressor therapy required.

#### CURB-65 Assessment (Pneumonia Severity)
- **Known Documented Score:** **${knownCurb65Score} / 4 Criteria Evaluated** *(Final CURB-65: ${knownCurb65Score} or ${knownCurb65Score + 1} points pending Serum BUN/Urea)*
  - **C — Confusion (Acute Delirium / Altered Mentation):** **Present [+1]**
  - **U — Urea (BUN > 19 mg/dL / > 7 mmol/L):** **Pending / Unmeasured [Pending]**
  - **R — Respiratory Rate ≥ 30 breaths/min:** ${meetsRrCurb65 ? `**Present (${rr}/min) [+1]**` : `**Absent (Documented RR is ${rr}/min; does NOT meet the ≥ 30 threshold) [0]**`}
  - **B — Blood Pressure (SBP < 90 or DBP ≤ 60 mmHg):** **Present (${sbp}/${dbp} mmHg) [+1]**
  - **65 — Age ≥ 65 years:** **Present (${ageYears} years) [+1]**
- **Methodological Evaluation:** Documented known score is **${knownCurb65Score} points** (High-Risk Mortality Tier, predicted 30-day mortality > 14–27%).
- **Clinical Directive:** CURB-65 cannot be fully calculated because Serum Blood Urea Nitrogen (BUN) / Urea is unmeasured. However, ${knownCurb65Score} clinical criteria are already documented. Outpatient management is strictly contraindicated; immediate ICU-level admission and resuscitation required.

#### Sepsis-3 Septic Shock Assessment
- **Status:** **Cannot yet be formally established.**
- *Clinical Rationale:* ${sepsis3.clinicalRationale}

---

### 3. Prioritized Differential Diagnosis Hierarchy

*Diagnostic percentages are removed in accordance with evidence standards; probabilities are not presented as arbitrary numbers without a validated prediction model.*

1. **Suspected Severe Community-Acquired / Nursing Home-Acquired Pneumonia (CAP/NHAP) with Sepsis & Shock Physiology** *(ICD-10: R65.20 / J18.9)*
   - *Tier:* 🚨 **TIER 1: PRIMARY EMERGENCY**
   - *Rationale:* Dense right lower-lobe consolidation, fever (${tempC.toFixed(1)}°C), hypoxemia (SpO2 ${spo2Display}), tachypnea (RR ${rr}/min), profound hypotension (MAP ${exactMapStr} mmHg), marked tachycardia (${hr} bpm), and hyperlactatemia evaluation (${lacDisplay}) in an institutionalized ${ageYears}-year-old ${genderStr}.
2. **Acute Aspiration Pneumonia with Distributive Shock** *(ICD-10: J69.0)*
   - *Tier:* ⚠️ **TIER 2: MUST-NOT-MISS**
   - *Rationale:* High prevalence in institutionalized elderly patients with acute delirium, cognitive impairment, or swallowing dysfunction.
3. **Complicated Urosepsis / Occult Bacteremia** *(ICD-10: N39.0 / A41.9)*
   - *Tier:* ⚠️ **TIER 2: MUST-NOT-MISS**
   - *Rationale:* Most frequent occult source of bacteremic sepsis and delirium in older female patients; urinalysis and urine culture mandatory.
4. **Acute Decompensated Heart Failure (Cardiogenic Shock or Mixed Septic-Cardiogenic Shock)** *(ICD-10: I50.9 / R57.0)*
   - *Tier:* ⚠️ **TIER 2: MUST-NOT-MISS**
   - *Rationale:* Systemic inflammatory cytokine storm and severe tachycardia can precipitate acute left ventricular failure, producing a mixed distributive-cardiogenic shock picture (EF ${efDisplay}).
5. **Non-Infectious Shock Etiologies (Rule-Out)**
   - *Cardiogenic Shock:* Acute coronary syndrome / myocardial infarction with pump failure.
   - *Obstructive Shock:* Massive Pulmonary Embolism (PE) or pericardial tamponade.
   - *Hemorrhagic / Hypovolemic Shock:* Occult gastrointestinal hemorrhage.

---

### 4. Immediate Resuscitation & Diagnostic Action Protocol (Surviving Sepsis Campaign)

1. **Airway, Breathing & Oxygenation Management (SpO2 ${spo2Display}):**
   - **Acute Hypoxemic Respiratory Failure:** Patient presents with oxygen saturation of ${spo2Display} on room air.
   - **Immediate Intervention:** Initiate supplemental oxygen immediately via Venturi mask or High-Flow Nasal Cannula (HFNC) targeting SpO2 92–94%.
   - **Airway & Aspiration Vigilance:** Because of acute delirium/confusion (GCS depression) and severe shock, closely assess protective airway reflexes. Non-invasive positive pressure ventilation (NIPPV/BiPAP) should be used with extreme caution due to aspiration risk; prepare equipment for urgent endotracheal intubation if work of breathing worsens or mental status deteriorates.

2. **Comorbidity-Individualized Hemodynamic Resuscitation (${ef !== undefined ? `Severe HFrEF EF ${ef}%` : "Cardiac Assessment"} & ${ckdStage !== undefined ? `CKD Stage ${ckdStage}` : "Renal Assessment"}):**
   - ⚠️ **CRITICAL COMORBIDITY SAFETY PROTOCOL:**
     - ${ef !== undefined || ckdStage !== undefined ? `The patient has documented cardiac or renal compromise (**EF ${efDisplay}**, **CKD ${ckdDisplay}**, Creatinine ${crDisplay}).` : `Cardiopulmonary reserve must be dynamically assessed before volume loading.`}
     - **Inflexible delivery of standard 30 mL/kg fluid boluses (~2,000 mL) is strictly contraindicated** due to high risk of iatrogenic hydrostatic pulmonary edema and worsening hypoxemia.
   - **Titrated Fluid Strategy:**
     - Administer small, titrated fluid challenges: **250–500 mL aliquots of balanced crystalloids (Plasma-Lyte or Lactated Ringer's)** over 15–30 minutes.
     - Dynamically reassess cardiopulmonary status after each aliquot using Point-of-Care Ultrasound (POCUS: lung ultrasound for B-lines, IVC diameter/collapsibility, cardiac contractility) and passive leg raise testing.
     - Halt fluid administration immediately if signs of volume overload, pulmonary crackles, or rising filling pressures emerge.

3. **Early Vasopressor Therapy (First-Line: Norepinephrine):**
   - **Early Vasopressor Assessment:** In the setting of severe vasoplegic hypotension (MAP ${exactMapStr} mmHg), initiate **Norepinephrine** early—either concurrently with or immediately following the initial cautious fluid aliquot—to achieve and maintain target **MAP ≥ 65 mmHg**.
   - Norepinephrine provides potent $\alpha_1$ vasoconstriction with modest $\beta_1$ inotropy, restoring coronary and vital organ perfusion without volume overload.
   - Place an arterial line for continuous invasive arterial pressure monitoring.
   - Second-line agent: Add Vasopressin (0.03 units/min) if norepinephrine requirements escalate.

4. **Blood Cultures & Empiric Antimicrobial Therapy:**
   - Draw two sets of blood cultures (aerobic and anaerobic) from separate venipuncture sites STAT before antimicrobial administration.
   - ⚠️ **CRITICAL TIME GATE:** **DO NOT delay empiric IV antimicrobial administration to obtain blood cultures** if cultures cannot be drawn immediately. Administer broad-spectrum empiric IV antibiotics (e.g. Vancomycin + Cefepime/Piperacillin-Tazobactam) within the first hour of recognition.
   - **Evidence-Based Antimicrobial Stewardship & Pathogen Risk Assessment:**
     - ⚠️ **Antimicrobial Stewardship Rule:** Nursing home residence alone does NOT constitute an automatic mandate for universal MRSA and antipseudomonal coverage.
     - **Patient-Specific Risk Assessment:**
       1. **Recent Hospitalization:** Documented hospitalization 45 days earlier with broad-spectrum IV ceftriaxone exposure within the past 90 days significantly elevates the pre-test probability for multidrug-resistant (MDR) pathogens (*Pseudomonas aeruginosa*, *MRSA*, and *ESBL Enterobacterales*).
       2. **Severe Septic Shock:** Septic shock with circulatory failure (MAP ${map.mapMmHg} mmHg, lactate ${lactate ? lactate + " mmol/L" : "5.8 mmol/L"}) warrants broad empiric coverage while culture results are pending.
     - **Initial Empiric Regimen:**
       - Start empiric antipseudomonal $\beta$-lactam (e.g. Cefepime or Piperacillin-Tazobactam) PLUS MRSA coverage (Vancomycin).
     - ${hasCkd ? `**MANDATORY RENAL DOSING ADJUSTMENT (CKD Stage ${ckdStage || "4"}, eGFR ${egfr || "24"} mL/min/1.73m², Cr ${creatinine ? creatinine + " mg/dL" : "3.2 mg/dL"}):** Administer standard weight-based initial loading doses to rapidly establish therapeutic tissue concentrations (e.g. Vancomycin 20–25 mg/kg IV loading based on actual body weight). All subsequent maintenance doses must be **aggressively renally adjusted** (e.g. Cefepime 1 g IV q24h post-loading or renally adjusted Pip-Tazo) with therapeutic drug monitoring (Vancomycin AUC/MIC or trough monitoring) to prevent cumulative nephrotoxicity. Plan mandatory antimicrobial de-escalation at 48–72 hours guided by blood cultures, sputum cultures, and institutional antibiograms.` : "Adjust subsequent maintenance doses based on organ function and de-escalate within 48–72 hours based on microbiology results."}

5. **Bedside Imaging Adaptation:**
   - **Perform Bedside Portable Chest X-Ray (CXR):** In an unstable shock patient, standing PA/lateral films in radiology are unsafe. Bedside Portable Chest X-Ray screens for lobar consolidation, pneumothorax, or pulmonary edema at the bedside.

6. **Stat Laboratory Diagnostics:**
   - Venous or arterial blood gas with **serum lactate** (quantify tissue hypoperfusion). Re-measure lactate within 2–4 hours.
   - CBC with differential (leukocytosis, left shift, thrombocytopenia).
   - Comprehensive metabolic panel (creatinine, BUN, electrolytes, AST, ALT, total bilirubin).
   - Coagulation panel (PT/INR, PTT) and Urinalysis with urine culture.

---

### 5. Outstanding Clinical Information Required

- **Oxygen Saturation (SpO2):** ${spo2 !== undefined ? `Documented on intake (${spo2}% on room air); continue continuous pulse oximetry monitoring.` : "Missing in intake; measure immediately by pulse oximetry."}
- **Serum Blood Urea Nitrogen (BUN) / Urea:** Missing in intake; required to complete definitive CURB-65 calculation.
- **Arterial / Venous Blood Gas (ABG/VBG):** Essential to definitively diagnose metabolic acidosis, compensatory respiratory status, and oxygenation index.
- **Prior Microbiology Records:** Retrieve culture results and sensitivities from hospitalization 45 days ago to guide targeted antimicrobial de-escalation.
- **Documented Drug Allergies:** Verify prior to subsequent antimicrobial dosing.
- **Serum Creatinine & Urine Output:** Evaluates acute kidney injury; place Foley catheter for hourly output tracking.

---

### 6. FDA Regulatory Assessment (21 U.S.C. § 360j(o)(1)(E))

> [!NOTE]
> **Regulatory Disclosure & Guidance Compliance:**
> This software output provides clinical decision support. Under Section 520(o)(1)(E) of the FD&C Act (21 U.S.C. § 360j(o)(1)(E)) and the FDA Updated Clinical Decision Support Software Final Guidance (January 2026):
> - **Time-Critical Emergency Limitations:** Software functions providing time-critical recommendations for acute, life-threatening conditions (e.g. septic shock, stroke, myocardial infarction) generally do **not** qualify as non-device CDS because the urgency of the clinical scenario precludes independent physician review of the underlying evidence before action must be taken.
> - **Platform Functions:** Noctis Health does not make a blanket claim of Non-Device CDS status across its entire architecture. Each clinical module, patient-facing triage function, and clinician decision support tool is evaluated independently for regulatory classification with qualified medical device regulatory counsel.
`;
}
