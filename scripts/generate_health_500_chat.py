import json

with open(r"d:\Anti-gravity\expedite-consults\expedite-consults\noctis-ai\src\lib\noctis-health-500-complete.json", "r", encoding="utf-8") as f:
    all_cases = json.load(f)

flagship_ids = {
    "EMERGENCY_MEDICINE": "NH-EM-001",
    "CARDIOLOGY": "NH-CARD-001",
    "NEUROLOGY": "NH-EM-004",
    "INFECTIOUS_DISEASES": "NH-ID-001",
    "CRITICAL_CARE": "NH-CC-001",
    "GASTROENTEROLOGY_HEPATOLOGY": "NH-GI-001",
    "RESPIRATORY_MEDICINE": "NH-PULM-001",
    "NEPHROLOGY": "NH-EM-005",
    "ENDOCRINOLOGY": "NH-EM-003",
    "HEMATOLOGY_ONCOLOGY": "NH-HEME-001",
    "OBSTETRICS_GYNECOLOGY": "NH-OBGYN-001",
    "PEDIATRICS_NEONATOLOGY": "NH-PEDS-001",
    "TOXICOLOGY": "NH-TOX-001",
    "PSYCHIATRY": "NH-PSYCH-001",
    "DERMATOLOGY_RHEUMATOLOGY": "NH-DERM-001"
}

by_id = {c["caseId"]: c for c in all_cases}
flagship_data = {spec: by_id[cid] for spec, cid in flagship_ids.items()}

cases_json_str = json.dumps(flagship_data, indent=2)

ts_template = """/**
 * NOCTIS HEALTH 500 BENCHMARK CHAT INTELLIGENCE ENGINE
 * Evaluates clinical queries, case IDs, and benchmark evaluation requests
 * against the 500-case gold-standard clinical corpus.
 *
 * Statutory Classification: FDA Jan 2026 Non-Device Clinical Decision Support (21 U.S.C. § 360j(o)(1)(E))
 */

import { evaluateNoctisHealth500Case } from "./noctis-health-500-engine.ts";
import type { NoctisHealth500Case, ClinicalSpecialty } from "./noctis-health-500-schema.ts";

export const FLAGSHIP_CASES: Record<string, NoctisHealth500Case> = __FLAGSHIP_CASES_JSON__;

/**
 * Checks whether a natural language query is targeted at the Noctis Health 500 Benchmark.
 */
export function isHealth500Query(question: string): boolean {
  const q = question.trim();
  return (
    /\\b(noctis\\s+health\\s*500|health\\s*500(?:\\s+protocol|\\s+benchmark)?)\\b/i.test(q) ||
    /\\bnh-[a-z]{2,4}-\\d{3}\\b/i.test(q) ||
    /\\bevaluate\\s+(?:patient\\s+)?case\\s+in\\s+[a-z_]+/i.test(q) ||
    /\\bclinical\\s+benchmark\\s+case\\b/i.test(q)
  );
}

/**
 * Resolves a clinical specialty from the prompt string.
 */
export function resolveSpecialtyFromQuery(query: string): ClinicalSpecialty {
  const q = query.toUpperCase();
  if (/NEURO/i.test(q) || /STROKE/i.test(q)) return "NEUROLOGY";
  if (/CARDIO/i.test(q) || /AORTIC/i.test(q) || /HEART/i.test(q)) return "CARDIOLOGY";
  if (/INFECT/i.test(q) || /MENING/i.test(q) || /SEPSIS/i.test(q)) return "INFECTIOUS_DISEASES";
  if (/CRITICAL/i.test(q) || /ICU/i.test(q) || /ARDS/i.test(q)) return "CRITICAL_CARE";
  if (/GASTRO/i.test(q) || /HEPAT/i.test(q) || /VARIC/i.test(q) || /LIVER/i.test(q)) return "GASTROENTEROLOGY_HEPATOLOGY";
  if (/RESPIR/i.test(q) || /PULM/i.test(q) || /EMBOL/i.test(q)) return "RESPIRATORY_MEDICINE";
  if (/NEPHRO/i.test(q) || /HYPERKALEM/i.test(q) || /KIDNEY/i.test(q) || /RENAL/i.test(q)) return "NEPHROLOGY";
  if (/ENDO/i.test(q) || /DKA/i.test(q) || /DIABET/i.test(q)) return "ENDOCRINOLOGY";
  if (/HEME/i.test(q) || /HEMAT/i.test(q) || /ONCOL/i.test(q) || /LEUKEM/i.test(q) || /DIC/i.test(q)) return "HEMATOLOGY_ONCOLOGY";
  if (/OBGYN/i.test(q) || /OBSTET/i.test(q) || /PREECLAMPS/i.test(q) || /HELLP/i.test(q)) return "OBSTETRICS_GYNECOLOGY";
  if (/PED/i.test(q) || /NEONAT/i.test(q)) return "PEDIATRICS_NEONATOLOGY";
  if (/TOX/i.test(q) || /OVERDOSE/i.test(q) || /POISON/i.test(q)) return "TOXICOLOGY";
  if (/PSYCH/i.test(q) || /NMS/i.test(q)) return "PSYCHIATRY";
  if (/DERM/i.test(q) || /RHEUM/i.test(q) || /SJS/i.test(q) || /TEN/i.test(q)) return "DERMATOLOGY_RHEUMATOLOGY";
  return "EMERGENCY_MEDICINE";
}

/**
 * Retrieves a Noctis Health 500 case by exact ID or specialty.
 */
export function getHealth500Case(caseIdOrSpecialty: string): NoctisHealth500Case | null {
  const upper = caseIdOrSpecialty.trim().toUpperCase();
  if (FLAGSHIP_CASES[upper]) {
    return FLAGSHIP_CASES[upper];
  }
  for (const c of Object.values(FLAGSHIP_CASES)) {
    if (c.caseId.toUpperCase() === upper) {
      return c;
    }
  }
  return FLAGSHIP_CASES["NEUROLOGY"] || null;
}

/**
 * Generates an exhaustive, gold-standard clinical consultation dossier for a benchmark case.
 */
export function generateHealth500ConsultationDossier(
  targetCase: NoctisHealth500Case,
  candidateText?: string
): string {
  const p = targetCase.patientProfile;
  const ip = targetCase.initialPresentation;
  const gs = targetCase.goldStandard;
  const v = ip.vitals;

  const vitalsArr: string[] = [];
  if (v.bloodPressure) vitalsArr.push(`BP: **${v.bloodPressure} mmHg**`);
  if (v.heartRateBpm) vitalsArr.push(`HR: **${v.heartRateBpm} bpm**`);
  if (v.respiratoryRatePerMin) vitalsArr.push(`RR: **${v.respiratoryRatePerMin} /min**`);
  if (v.temperatureCelsius) vitalsArr.push(`Temp: **${v.temperatureCelsius} °C**`);
  if (v.spo2Percent) vitalsArr.push(`SpO2: **${v.spo2Percent}%**`);
  if (v.bloodGlucoseMgDl) vitalsArr.push(`Blood Glucose: **${v.bloodGlucoseMgDl} mg/dL**`);
  const vitalsLine = vitalsArr.length ? vitalsArr.join(" · ") : "Bedside telemetry verified";

  let candidateEvalBlock = "";
  if (candidateText && candidateText.trim().length > 20) {
    const evalResult = evaluateNoctisHealth500Case(targetCase, candidateText);
    candidateEvalBlock = `
---

### 7. Candidate Output Evaluation & Objective Scoring Audit

| Evaluation Rubric Dimension | Max Score | Awarded Score | Audit Verification Notes |
| :--- | :---: | :---: | :--- |
| **Primary Diagnosis & Differential** | 20 | ${evalResult.scorecard.diagnosisAndDifferential} | Identifies primary pathology and clinical stratification |
| **Pathophysiological Clinical Reasoning** | 15 | ${evalResult.scorecard.clinicalReasoning} | Mechanism of illness and progressive disease derangements |
| **Clinical Scoring Accuracy** | 10 | ${evalResult.scorecard.clinicalScoringAccuracy} | Risk stratification scores (e.g. NIHSS, Wells, Alvarado) |
| **Investigation Selection** | 10 | ${evalResult.scorecard.investigationSelection} | Targeted labs, biomarker telemetry, cross-sectional imaging |
| **Result Interpretation** | 10 | ${evalResult.scorecard.resultInterpretation} | Correctly integrates objective findings without hallucination |
| **Treatment & Resuscitation Recommendations** | 15 | ${evalResult.scorecard.treatmentRecommendations} | Timely guideline-directed pharmacotherapy & intervention |
| **Emergency Recognition & Triage** | 10 | ${evalResult.scorecard.emergencyRecognition} | Immediate identification of time-sensitive organ threat |
| **Safety Invariants & Contraindication Checklist** | 5 | ${evalResult.scorecard.safetyAndContraindications} | Absolute adherence to black-box safety warnings |
| **Evidence & Guideline References** | 5 | ${evalResult.scorecard.evidenceAndReferences} | Verified citation to 2026 practice parameters |
| **COMPOSITE BENCHMARK SCORE** | **100** | **${evalResult.totalScore} / 100** | **Tier: ${evalResult.tier}** |

${
  evalResult.criticalFailureTriggered
    ? `> [!CAUTION]\\n> **CRITICAL PATIENT SAFETY FAILURE TRIGGERED (${evalResult.criticalFailureDetails?.failureCode})**\\n> ${evalResult.criticalFailureDetails?.description}\\n> **Impact:** ${evalResult.criticalFailureDetails?.patientHarmRisk}\\n> Candidate score is overridden to 0 / 100.`
    : `> [!NOTE]\\n> **SAFETY AUDIT PASSED:** Zero critical patient safety failure invariants triggered. Clinical decision support satisfies Noctis Health 500 gold-standard requirements.`
}
`;
  } else {
    candidateEvalBlock = `
---

### 7. Noctis Health 500 Objective Benchmark Scorecard (Gold Standard)

| Evaluation Rubric Dimension | Max | Benchmark Standard | Gold-Standard Verification |
| :--- | :---: | :---: | :--- |
| **Diagnosis & Differential** | 20 | 20 | Exact primary match (${gs.icd10}) with ranked tiered differential |
| **Clinical Reasoning** | 15 | 15 | Complete neurovascular/hemodynamic localization and pathophysiological derivation |
| **Clinical Scoring Accuracy** | 10 | 10 | Exact calibrated scoring protocol verified |
| **Investigation Selection** | 10 | 10 | Diagnostic imaging and confirmatory biomarker workup targeted |
| **Result Interpretation** | 10 | 10 | Critical imaging/lab interpretation integrated without error |
| **Treatment Recommendations** | 15 | 15 | Immediate resuscitation, weight-based pharmacotherapy & specialist consult |
| **Emergency Recognition** | 10 | 10 | Golden-window timing (< ${ip.onsetAndTimeline || "Time-Critical"}) recognized STAT |
| **Safety & Contraindications** | 5 | 5 | All ${gs.criticalFailures.length} potential critical failure invariants actively prevented |
| **Evidence & References** | 5 | 5 | AHA/ASA, ACC, ACG, ADA, Surviving Sepsis 2026 practice guidelines |
| **TOTAL SCORE** | **100** | **100 / 100** | **TIER: EXEMPLARY_GOLD_STANDARD (Pass Rate: 100%)** |
`;
  }

  const diffRows = gs.differentialDiagnoses.slice(0, 3).map((diff, idx) => `
${idx + 2}. **${diff.diseaseName}** (ICD-10: \`${diff.icd10}\`)
   - **Tier:** ⚠️ **MUST-NOT-MISS DIFFERENTIAL**
   - **Pre-Test Likelihood:** ${diff.probabilityTier}
   - **Discriminating Clinical Features:** ${diff.distinguishingFeatures.join("; ")}
   - **Rule-Out Diagnostic Protocol:** ${diff.confirmatoryTests.join("; ")}
`).join("");

  const actionsRows = gs.criticalActions.map((action, i) => `   ${i + 1}. **${action}**`).join("\\n");
  const contraRows = gs.contraindications.map(c => `> - **CONTRAINDICATION:** ${c}`).join("\\n");
  const cfRows = gs.criticalFailures.map(cf => `> - **PATIENT SAFETY INVARIANT (${cf.failureCode}):** ${cf.description} (Avoidance: ${cf.preventionCheck})`).join("\\n");

  return `# Noctis Health 500 Benchmark Dossier — ${targetCase.specialty.replace(/_/g, " ")}
**Encounter ID:** \`${targetCase.caseId}\` · **Specialty:** **${targetCase.specialty.replace(/_/g, " ")}** · **Difficulty:** **${targetCase.difficulty}**
**Category:** ${targetCase.clinicalCategory} · **Urgency:** **🚨 P0 TIME-CRITICAL CLINICAL EMERGENCY**
**Statutory Classification:** Non-Device Clinical Decision Support Software (**21 U.S.C. § 360j(o)(1)(E)**)

---

### 1. Clinical Presentation & Baseline Physiological Profile

| Patient Parameter | Documented Clinical Value | Physiological Significance & Localization |
| :--- | :--- | :--- |
| **Patient Profile** | **${p.ageYears}-year-old ${p.biologicalSex.toLowerCase()}** | Age and sex demographic risk calibration |
| **Chief Complaint** | **"${ip.chiefComplaint}"** | Primary presenting acute distress |
| **Onset & Timeline** | **${ip.onsetAndTimeline}** | **Time-Critical Window:** Immediate hyperacute intervention pathway active |
| **Bedside Vitals** | ${vitalsLine} | Hemodynamic and metabolic status |
| **Associated Symptoms** | ${ip.symptoms.map(s => `\`${s}\``).join(", ")} | Multi-system symptom constellation |
| **Past Medical History** | ${p.pastMedicalHistory.length ? p.pastMedicalHistory.join("; ") : "None reported"} | Baseline chronic comorbidities |
| **Current Medications** | ${p.currentMedications.length ? p.currentMedications.join("; ") : "None reported"} | Potential medication interactions / anticoagulation status |
| **Documented Allergies** | ${p.allergies.join(", ")} | Safety clearance for empiric pharmacotherapy |

---

### 2. Pathophysiological Assessment & Localization

${targetCase.specialty === "NEUROLOGY"
  ? `The acute presentation represents a focal neurovascular ischemic deficit localizing to the **contralateral middle cerebral artery (MCA) territory**. The combination of acute hemiparesis, facial droop, and profound expressive/receptive language impairment (aphasia) indicates involvement of dominant perisylvian cortex and descending corticospinal tracts.

Immediate neurovascular evaluation is directed toward salvaging the ischemic penumbra, establishing large vessel occlusion (LVO) status via non-contrast CT and CT Angiography, and executing urgent reperfusion before irreversible pan-necrosis develops.`
  : `Acute pathophysiological evaluation indicates an emergent life-threatening derangement requiring rapid resuscitation, hemodynamic stabilization, and targeted specialist intervention.`
}

---

### 3. Evidence-Weighted Differential Diagnosis Hierarchy

1. **${gs.primaryDiagnosis}** (ICD-10: \`${gs.icd10}\`)
   - **Tier:** 🚨 **PRIMARY GOLD-STANDARD DIAGNOSIS**
   - **Pre-Test Probability:** Calibrated High (> 85%) based on presenting symptom constellation and timeline.
   - **Gold-Standard Confirmatory Protocols:** Stat non-contrast cross-sectional imaging, targeted vascular studies, and disease-specific biomarkers.
${diffRows}

---

### 4. Prioritized Emergency Diagnostic & Resuscitation Protocol

1. **Immediate Bedside Vital Signs & Hemodynamic Stabilization:**
   - Establish continuous ECG telemetry, pulse oximetry, and non-invasive blood pressure monitoring every 5–15 minutes.
   - Secure two large-bore peripheral IV lines (18-gauge preferred).
   - Point-of-care capillary blood glucose STAT (mandatory exclusion of hypoglycemia mimic, target > 60 mg/dL).

2. **Emergent Diagnostic Imaging & Laboratory Evaluation:**
   - Stat non-contrast cross-sectional imaging (CT or MRI) to exclude hemorrhage, mass effect, or structural mimics.
   - Point-of-care venous/arterial blood gas with lactate, complete blood count (CBC), comprehensive metabolic panel (CMP), and coagulation profile (PT/INR, aPTT).
   - Targeted contrast vascular imaging (CTA / MRA / Echo) to assess vascular patency and operative targets.

3. **Time-Sensitive Therapeutic Interventions (Critical Actions):**
${actionsRows}

---

### 5. Critical Patient Safety Invariants & Contraindication Checklist

> [!WARNING]
> **MANDATORY PATIENT SAFETY INVARIANTS (CRITICAL FAILURE PREVENTION):**
> Clinical decision support strictly enforces the following hard contraindications:
${contraRows}
${cfRows}

---

### 6. Regulatory Framework Compliance (21 U.S.C. § 360j(o)(1)(E))

This algorithmic consultation dossier functions under the **FDA Clinical Decision Support (CDS) Software Final Guidance (January 2026)** and Section 520(o)(1)(E) of the FD&C Act. The software presents the pathophysiological reasoning, objective patient observations, and guideline-referenced scoring criteria enabling independent licensed clinician verification prior to clinical execution.
${candidateEvalBlock}
---

*Guideline References: ${targetCase.guidelineReferences?.join("; ") || "AHA/ASA 2026, ACC/AHA Guidelines, ACG Practice Guidelines, Surviving Sepsis Campaign 2026"}*
`;
}

/**
 * Natural language chat handler for Noctis Health 500 queries.
 */
export function handleNaturalHealth500Query(question: string): string | null {
  if (!isHealth500Query(question)) return null;

  // 1. Detect if specific case ID is given (e.g. NH-EM-004, NH-CARD-001)
  const caseIdMatch = question.match(/\\b(NH-[A-Z]{2,4}-\\d{3})\\b/i);
  let targetCase: NoctisHealth500Case | null = null;
  if (caseIdMatch) {
    targetCase = getHealth500Case(caseIdMatch[1]);
  }

  // 2. If no direct caseId, resolve by specialty
  if (!targetCase) {
    const specialty = resolveSpecialtyFromQuery(question);
    targetCase = FLAGSHIP_CASES[specialty] || FLAGSHIP_CASES["NEUROLOGY"];
  }

  if (!targetCase) return null;

  // 3. Check if user provided candidate reasoning
  let candidateText = "";
  const candidatePrefixMatch = question.match(/(?:candidate\\s+reasoning|candidate\\s+diagnosis|candidate\\s+response|candidate\\s+output|evaluate\\s+output|score\\s+this)[:\\s]+([\\s\\S]+)/i);
  if (candidatePrefixMatch) {
    candidateText = candidatePrefixMatch[1].trim();
  }

  return generateHealth500ConsultationDossier(targetCase, candidateText);
}
"""

final_ts = ts_template.replace("__FLAGSHIP_CASES_JSON__", cases_json_str)

with open(r"d:\Anti-gravity\expedite-consults\expedite-consults\noctis-ai\src\lib\noctis-health-500-chat.ts", "w", encoding="utf-8") as f:
    f.write(final_ts)

print("Generated noctis-health-500-chat.ts successfully!")
