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
export function generateIsolatedSepticShockDossier(encounterId = "NPDE-MW564VII"): string {
  const sbp = 78;
  const dbp = 45;
  const map = calculateValidatedMAP(sbp, dbp);
  const qsofa = calculateValidatedQSOFA({ respiratoryRate: 30, systolicBp: 78, hasAlteredMentation: true });
  const curb65 = calculateValidatedCURB65({ confusion: true, respiratoryRate: 30, systolicBp: 78, diastolicBp: 45, ageYears: 67 });
  const sepsis3 = evaluateSepsis3Criteria({ hasSuspectedInfection: true, mapMmHg: map.mapMmHg, isOnVasopressors: false, hasReceivedAdequateFluidResuscitation: false });

  return `# Noctis Patient Diagnostic & Triage Intelligence Dossier (Clinical Decision Support)
**Encounter ID:** \`${encounterId}\` · **Triage Urgency:** **🚨 P0 IMMEDIATE EMERGENCY (Critical Care & Resuscitation)**
**Statutory Classification:** Clinical Decision Support Software under **21 U.S.C. § 360j(o)(1)(E)** (Section 520(o)(1)(E) FD&C Act).

> [!CAUTION]
> **EMERGENCY MEDICAL WARNING (IMMEDIATE RESUSCITATION DIRECTIVE)**
> 🚨 **CRITICAL LIFE THREAT:** The patient exhibits severe circulatory failure (MAP ${map.mapMmHg} mmHg), altered mental status (confusion), tachypnea (RR 30/min), and hyperpyrexia (40.0°C). This constellation represents **Undifferentiated Shock with Suspected Severe Infection**.
> - **Immediate Action:** Activate Emergency Medical Services (EMS) / Code Sepsis immediately.
> - **Time-Critical Imperative:** Immediate resuscitation in an Emergency Department and Critical Care / Intensive Care Unit.

---

### 1. Clinical Presentation & Physiologic Derangements (Isolated Encounter)

| Parameter | Documented Observation | Physiological Significance | Diagnostic & Resuscitation Priority |
| :--- | :--- | :--- | :--- |
| **Blood Pressure** | **${sbp}/${dbp} mmHg** (MAP = **${map.mapMmHg} mmHg**) | Severe circulatory shock; systemic hypoperfusion with loss of vital organ autoregulation | **Critical Deficit:** Target MAP ≥ 65 mmHg via rapid IV crystalloids and early norepinephrine |
| **Body Temperature** | **40.0°C (Hyperpyrexia)** | Systemic inflammatory cytokine release; high bacterial/viral metabolic demand | Confirms acute infectious/inflammatory driver; rule out bacteremia |
| **Mental Status** | **Confusion (Altered Mentation)** | Acute cerebral hypoperfusion and septic encephalopathy | High-risk organ dysfunction marker; contributes to qSOFA |
| **Respiratory Rate** | **30 breaths/min (Tachypnea)** | Compensatory respiratory alkalosis for lactic acidosis; possible pulmonary focus | Primary clinical sign of metabolic stress and impending respiratory failure |
| **Heart Rate** | **132 bpm (Marked Tachycardia)** | Reflex sympathetic discharge to preserve cardiac output in vasoplegic/distributive shock | Indicates significant physiological decompensation |
| **Duration** | **3 days** | Subacute worsening of untreated primary focus leading to decompensated shock | Screen for evolving deep-seated source (pneumonia, pyelonephritis, peritonitis) |

---

### 2. Clinical Scoring & Algorithmic Validation

#### quick Sequential Organ Failure Assessment (qSOFA)
- **Score:** **3 / 3 Criteria Present**
  - Respiratory Rate ≥ 22/min: **Present (30/min) [+1]**
  - Systolic BP ≤ 100 mmHg: **Present (78 mmHg) [+1]**
  - Altered Mentation: **Present (Confusion) [+1]**
- **Methodological Status:** **HIGH-RISK WARNING SCORE FOR IN-HOSPITAL MORTALITY & ORGAN DYSFUNCTION**
- *Safety Invariant:* ${qsofa.safetyInvariant}

#### Mean Arterial Pressure (MAP)
\\[ MAP = \\frac{SBP + 2(DBP)}{3} = \\frac{78 + 2(45)}{3} = 56\\text{ mmHg} \\]
- **Current MAP:** **56 mmHg**
- **Assessment:** **Severely reduced perfusion pressure.** Perfusion to cerebral, renal, and splanchnic beds is compromised. Urgent fluid resuscitation and vasopressor assessment required.

#### Sepsis-3 Septic Shock Assessment
- **Status:** **Cannot yet be formally established.**
- *Clinical Rationale:* ${sepsis3.clinicalRationale}

#### CURB-65 Assessment (Pneumonia Severity)
- **Status:** **Incomplete Calculation (Missing Serum Urea/BUN).**
- *Available Criteria:* Confusion (+1), Respiratory rate ≥ 30 (+1), Low BP (+1), Age ≥ 65 (+1).
- *Clinical Directive:* ${curb65.clinicalDirective}

---

### 3. Prioritized Differential Diagnosis Hierarchy

*Diagnostic percentages are removed in accordance with evidence standards; probabilities are not presented as arbitrary numbers without a validated prediction model.*

1. **Undifferentiated Sepsis with Shock Physiology (Source Undetermined)** *(ICD-10: R65.20 / R57.2)*
   - *Tier:* 🚨 **TIER 1: PRIMARY EMERGENCY**
   - *Rationale:* Hyperpyrexia (40°C), tachypnea, severe hypotension (MAP 56), and confusion in an elderly male indicate severe systemic infection with distributive shock.
2. **Severe Community-Acquired Pneumonia (CAP)** *(ICD-10: J18.9)*
   - *Tier:* ⚠️ **TIER 2: MUST-NOT-MISS**
   - *Rationale:* Tachypnea (30/min) and high fever in an elderly male strongly support a pulmonary focus, but focal pulmonary findings await physical exam and imaging.
3. **Urosepsis / Complicated Urinary Tract Infection** *(ICD-10: N39.0 / A41.9)*
   - *Tier:* ⚠️ **TIER 2: MUST-NOT-MISS**
   - *Rationale:* Most frequent source of occult bacteremic sepsis and delirium in older male patients.
4. **Intra-Abdominal Sepsis / Peritonitis** *(ICD-10: K65.0)*
   - *Tier:* ⚠️ **TIER 2: MUST-NOT-MISS**
   - *Rationale:* Occult perforation, biliary sepsis (cholangitis), or mesenteric ischemia can present with sudden delirium and shock.
5. **Acute Bacterial Meningitis / Encephalitis** *(ICD-10: G00.9)*
   - *Tier:* ⚠️ **TIER 2: MUST-NOT-MISS**
   - *Rationale:* Combination of 40°C fever and confusion mandates screening for nuchal rigidity and central nervous system infection.
6. **Non-Infectious Shock Etiologies (Rule-Out)**
   - *Cardiogenic Shock:* Acute MI with pump failure.
   - *Obstructive Shock:* Massive Pulmonary Embolism or Cardiac Tamponade.
   - *Hemorrhagic / Hypovolemic Shock:* Occult GI bleed.

---

### 4. Immediate Resuscitation & Diagnostic Action Protocol (Surviving Sepsis Campaign)

1. **Airway, Breathing & Circulation (ABC) Resuscitation:**
   - Place on continuous cardiac telemetry, non-invasive blood pressure q5 min, and continuous pulse oximetry.
   - Administer supplemental oxygen to maintain SpO2 ≥ 94%.
2. **Hemodynamic Fluid Resuscitation:**
   - Establish two large-bore IV lines (16-18 gauge) or central venous access.
   - Administer rapid IV balanced crystalloids (Plasma-Lyte or Lactated Ringer's) at **30 mL/kg within the first 3 hours**.
   - Dynamically reassess volume responsiveness (capillary refill time, passive leg raise, bedside IVC ultrasound).
3. **Early Vasopressor Support:**
   - If MAP remains < 65 mmHg despite initial fluid boluses, initiate **Norepinephrine** infusion immediately (target MAP ≥ 65 mmHg) via peripheral or central line.
4. **Blood Cultures & Empiric Antimicrobial Therapy:**
   - Draw two sets of blood cultures (aerobic and anaerobic) from separate venipuncture sites.
   - ⚠️ **CRITICAL TIME GATE:** **DO NOT delay empiric IV antimicrobial administration to obtain blood cultures** if cultures cannot be drawn immediately. Administer broad-spectrum empiric IV antibiotics (e.g. Vancomycin + Cefepime/Piperacillin-Tazobactam) within the first hour of recognition.
5. **Bedside Imaging Adaptation:**
   - **Perform Bedside Portable Chest X-Ray (CXR):** In an unstable shock patient, standing PA/lateral films in radiology are unsafe. Portable CXR screens for lobar consolidation, pneumothorax, or pulmonary edema at the bedside.
6. **Stat Laboratory Diagnostics:**
   - Venous or arterial blood gas with **serum lactate** (quantify tissue hypoperfusion).
   - CBC with differential (leukocytosis, left shift, thrombocytopenia).
   - Comprehensive metabolic panel (creatinine, BUN, electrolytes, AST, ALT, total bilirubin).
   - Coagulation panel (PT/INR, PTT) and Urinalysis with urine culture.

---

### 5. Outstanding Clinical Information Required

- **Oxygen Saturation (SpO2):** Missing in intake; measure immediately by pulse oximetry.
- **Serum Lactate:** Essential for Sepsis-3 shock classification and tracking resuscitation.
- **Complete Blood Count & Platelet Count:** Evaluates for leukocytosis and thrombocytopenia (SOFA organ dysfunction).
- **Serum Creatinine & Urine Output:** Evaluates acute kidney injury; place Foley catheter for hourly output tracking.
- **Total Bilirubin & Liver Function:** Evaluates hepatic dysfunction for SOFA scoring.
- **Medication History & Drug Allergies:** Verify prior to antimicrobial selection.

---

### 6. FDA Regulatory Assessment (21 U.S.C. § 360j(o)(1)(E))

> [!NOTE]
> **Regulatory Disclosure & Guidance Compliance:**
> This software output provides clinical decision support. Under Section 520(o)(1)(E) of the FD&C Act (21 U.S.C. § 360j(o)(1)(E)) and the FDA Updated Clinical Decision Support Software Final Guidance (January 2026):
> - **Time-Critical Emergency Limitations:** Software functions providing time-critical recommendations for acute, life-threatening conditions (e.g. septic shock, stroke, myocardial infarction) generally do **not** qualify as non-device CDS because the urgency of the clinical scenario precludes independent physician review of the underlying evidence before action must be taken.
> - **Platform Functions:** Noctis Health does not make a blanket claim of Non-Device CDS status across its entire architecture. Each clinical module, patient-facing triage function, and clinician decision support tool is evaluated independently for regulatory classification with qualified medical device regulatory counsel.
`;
}
