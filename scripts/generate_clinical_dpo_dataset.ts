/**
 * NOCTIS AI — CLINICAL SAFETY DPO DATASET FORGE (PHASE 3)
 * Spec: NOCTIS-DPO-CLINICAL-001
 *
 * Generates contrastive (Prompt, Chosen, Rejected) preference pairs designed specifically
 * to align LLM weights against clinical hallucinations:
 * 1. Electrolyte Conflation (Magnesium vs. Potassium vs. Sodium)
 * 2. Inappropriate Drug Administration (Magnesium Sulfate in Hypermagnesemia, KCl in CKD 5)
 * 3. Undertriage (P3 routine on P0 lethal arrhythmias)
 * 4. Demographic Misrouting (Male patients assigned obstetric protocols)
 * 5. Osmotic Demyelination Syndrome (Unsafe sodium overcorrection)
 * 6. Clinical Fabrication (Invented sternal rub, caregiver statements, normal lungs)
 */

import fs from "node:fs";
import path from "node:path";
import { generatePreferenceDataset } from "../src/lib/noctis-qlora-pipeline.ts";
import { generateNegativeConstraintDpoPairs } from "./negative_constraint_generator.ts";

export interface ContrastiveDpoRow {
  id: string;
  category: "ELECTROLYTE_SAFETY" | "DEMOGRAPHIC_GATE" | "TRIAGE_ESCALATION" | "NEPHROLOGY_EMERGENCY" | "PHARMACOVIGILANCE";
  prompt: string;
  chosen: string;
  rejected: string;
  violationPrevented: string;
}

const HIGH_YIELD_AUDIT_CASES: ContrastiveDpoRow[] = [
  {
    id: "DPO-HYPERMAG-001",
    category: "ELECTROLYTE_SAFETY",
    prompt: `<|im_start|>user
Evaluate clinical case: 76-year-old male with CKD Stage 5 presents with serum magnesium 8.5 mg/dL, heart rate 38 bpm, and blood pressure 82/46 mmHg. Intake notes 900 mL urine over past 24 hours, and bedside lung ultrasound shows no pulmonary edema. Patient has been consuming magnesium hydroxide daily. Formulate primary diagnosis, emergent resuscitation, medication contraindications, and clearance strategy.<|im_end|>
<|im_start|>assistant
`,
    chosen: `### 1. Emergency Triage & Primary Diagnosis
- **Triage Tier:** **P0 — IMMEDIATE EMERGENCY RESUSCITATION**
- **Primary Diagnosis:** **Severe Symptomatic Hypermagnesemia** (ICD-10: **E83.42**) with High-Grade Bradyarrhythmia and Hemodynamic Shock.
- **Demographic & Diagnostic Isolation:** Male biological sex; all obstetric etiologies and protocols (preeclampsia, HELLP syndrome) are demographically excluded.

### 2. Immediate Emergent Intervention (Membrane Antagonism)
1. **STAT IV Calcium Gluconate:**
   - **Dose:** 1000–2000 mg (10–20 mL of 10% solution) IV over 2–5 minutes under continuous cardiac monitoring.
   - **Mechanism:** Provides direct, competitive physiological antagonism at cardiac conduction membranes, reversing AV block and restoring vascular tone.
   - **Pharmacodynamic Reality:** Response is variable and transient (typically 30–60 minutes). Calcium does **NOT** reduce total body magnesium or accelerate excretion; repeated doses may be required pending definitive clearance.

### 3. Strict Medication Contraindications
- **ABSOLUTE CONTRAINDICATION:** Avoid all magnesium-containing compounds (antacids, laxatives, and parenteral **Magnesium Sulfate**), which compound cardiovascular toxicity and precipitate fatal asystole.
- **ABSOLUTE CONTRAINDICATION:** Avoid potassium chloride (KCl); serum magnesium must never be conflated with potassium.

### 4. Definitive Clearance & Renal Reserve Consideration
- **Primary Clearance Modality:** **Emergent Hemodialysis** with a zero-magnesium or low-magnesium dialysate bath is the definitive treatment of choice for severe hypermagnesemia complicated by shock and bradycardia in CKD Stage 5.
- **Residual Renal Reserve Nuance:** Documented urine output of **900 mL/24h** confirms that CKD Stage 5 has not produced complete anuria. In conjunction with clear lung fields on bedside ultrasound, cautious volume expansion and loop diuretics (e.g., IV Furosemide) may serve as an adjunctive temporizing measure while dialysis access is established.

### 5. Documentation Integrity
- Prior interventions: None documented prior to intake. All proposed monitoring (central access, transcutaneous pacing pads on standby, hourly urine output via Foley) are active orders requiring execution.`,
    rejected: `### 1. Primary Diagnosis
Severe Hypokalemia with Cardiac Manifestations: Serum potassium < 3.0 mEq/L is considered severe and life-threatening; potassium 8.5 mg/dL is an error in units, but the clinical presentation of bradycardia and hypotension in a patient with renal failure supports severe potassium depletion.

### 2. Emergent Intervention
- Electrolyte Repletion: Administer IV potassium chloride (KCl) 20-30 mEq over 100-200 mL normal saline via central line.
- Alternatively, for severe preeclampsia/HELLP syndrome in pregnancy, initiate Magnesium Sulfate 4g IV loading dose over 20 minutes followed by 1g/hr maintenance.
- Note: Patient is in CKD Stage 5 and completely anuric; diuretics are strictly prohibited.
- Caregiver reports patient has been lethargic; patient denies trauma or fever; distant heart sounds noted on sternal rub.`,
    violationPrevented: "VAL-ELECTROLYTE-CONFUSION, VAL-HYPERMAG-VETO, VAL-MALE-OB-EXCLUSION, VAL-CKD-ANURIA, VAL-NO-FAB-SOAP",
  },
  {
    id: "DPO-HYPERK-001",
    category: "TRIAGE_ESCALATION",
    prompt: `<|im_start|>user
Clinical intake: 68-year-old male with CKD Stage 4 (eGFR 22 mL/min/1.73m²) presents with fatigue, generalized muscle weakness, serum potassium 7.1 mmol/L, and ECG demonstrating marked QRS widening with peaked T waves. Current medications include Lisinopril 20 mg daily, Spironolactone 25 mg daily, and Ibuprofen 600 mg TID. Provide triage tier, emergency resuscitation order, and medication management.<|im_end|>
<|im_start|>assistant
`,
    chosen: `### 1. Triage Classification
- **Triage Level:** **P0 — IMMEDIATE RESUSCITATION (CRITICAL PRIORITY)**
- **Clinical Rationale:** Serum potassium $7.1\\,\\text{mmol/L}$ accompanied by ECG cardiotoxicity (QRS widening, peaked T waves) represents an imminent risk of ventricular fibrillation, sine-wave transformation, and cardiac arrest.

### 2. Three-Stage Emergency Resuscitation (C-BIG-K Protocol)
1. **Stage 1 — Cardiac Membrane Stabilization (Immediate):**
   - **IV Calcium Gluconate (10%):** 10–20 mL (1–2 g) IV over 2–5 minutes. Re-evaluate ECG within 5 minutes; repeat dose if QRS widening persists.
   - *Note:* Calcium stabilizes the threshold potential without altering serum potassium concentration.
2. **Stage 2 — Intracellular Potassium Shifting (Rapid Acting):**
   - **Regular Insulin (10 Units IV) + Dextrose 50% (50 mL / 25 g IV):** Administer as IV bolus to drive potassium into cells via Na+/K+-ATPase stimulation. Monitor capillary blood glucose at baseline, 30, and 60 minutes.
   - **Nebulized Albuterol:** 10–20 mg in 4 mL normal saline over 15 minutes as adjunctive intracellular shift.
3. **Stage 3 — Potassium Elimination / Removal (Definitive):**
   - **Emergent Hemodialysis Consultation:** Stat nephrology evaluation for hemodialysis if refractory to shifting agents or in oliguric renal failure.
   - **Gastrointestinal Cation Exchange:** Sodium zirconium cyclosilicate (SZC) 10 g oral suspension or Patiromer 8.4 g for delayed elimination. Note: Oral binders are non-emergent and must not delay membrane stabilization or dialysis.

### 3. Medication Reconciliation & Safety
- **Immediate Action:** **Temporarily hold** Lisinopril, Spironolactone, and permanently discontinue Ibuprofen (NSAID nephrotoxicity).
- **Allergy Classification Safeguard:** Do **NOT** document Lisinopril or Spironolactone as drug allergies. Elevated potassium is an expected on-target pharmacologic effect in reduced eGFR, not an immune-mediated hypersensitivity. Reassess GDMT after stabilization.`,
    rejected: `### 1. Triage Assessment
- Triage: P3 Routine Clinical. The patient is stable and can be managed via outpatient primary care consultation.
- Recommend scheduled repeat potassium check in 48-72 hours.

### 2. Treatment Plan
- Administer oral sodium polystyrene sulfonate (Kayexalate) 15 g once daily as primary emergency intervention.
- Immediate IV Calcium is unnecessary as T waves are peaked but patient is awake.
- File permanent allergy alerts in electronic health record for Lisinopril and Spironolactone, labeling them as severe life-threatening allergies.`,
    violationPrevented: "VAL-TRIAGE-P0, VAL-MED-DISCONT, VAL-ALLERGY-ADR, VAL-BINDER-TIMING",
  },
  {
    id: "DPO-HYPONAT-001",
    category: "ELECTROLYTE_SAFETY",
    prompt: `<|im_start|>user
Emergency case: 54-year-old female taking Hydrochlorothiazide 25 mg daily and Sertraline 100 mg daily presents following two witnessed generalized tonic-clonic seizures. Point-of-care serum sodium is 112 mmol/L, serum osmolality 238 mOsm/kg, blood glucose 105 mg/dL. Formulate emergency stabilization, sodium correction limits, and rescue strategy for rapid overcorrection.<|im_end|>
<|im_start|>assistant
`,
    chosen: `### 1. Emergency Triage & Diagnosis
- **Triage Priority:** **P0 — IMMEDIATE EMERGENCY**
- **Primary Diagnosis:** **Severe Symptomatic Hypotonic Hyponatremia with Status Seizures / Acute Encephalopathy** (ICD-10: **E87.1**).
- **Etiology:** Likely multifactorial thiazide-induced hyponatremia compounded by SSRI-associated SIADH.

### 2. Immediate Emergency Neuro-Stabilization
1. **Hypertonic Saline (3% NaCl) Bolus Protocol:**
   - Administer **3% NaCl 100 mL IV bolus over 10 minutes**.
   - If seizures or severe neuro-deficits persist, repeat 100 mL IV bolus at 10-minute intervals (maximum three 100 mL boluses total).
   - **Target:** Prompt elevation of serum sodium by **4–6 mmol/L** to reverse cerebral edema, reduce intracranial pressure, and terminate seizure activity.

### 3. Strict 24-Hour Sodium Correction Limits
- **Absolute 24-Hour Ceilings:**
  - Standard limit: **≤ 8 mmol/L in 24 hours** (and ≤ 16 mmol/L in 48 hours).
  - High-risk limit (hypokalemic, malnourished, advanced liver disease): **≤ 4–6 mmol/L in 24 hours**.
- **Pathophysiological Danger:** Exceeding these limits risks irreversible **Osmotic Demyelination Syndrome (ODS / Central Pontine Myelinolysis)**, leading to spastic quadriparesis, pseudobulbar palsy, and locked-in syndrome.

### 4. Overcorrection Rescue Protocol
- If spontaneous water diuresis occurs and sodium rises $> 8\\,\\text{mmol/L}$ in 24 hours:
  1. Immediately discontinue active hypertonic and isotonic sodium infusions.
  2. Administer **Desmopressin (DDAVP) 1–2 mcg IV/SC** to arrest urinary free water loss.
  3. Initiate **Dextrose 5% in Water (D5W)** IV infusion titrated to lower sodium back within the safe 24-hour target threshold.`,
    rejected: `### 1. Management
- Infuse Normal Saline (0.9% NaCl) 1000 mL bolus over 1 hour.
- Push sodium correction aggressively to reach normal sodium (135 mmol/L) within the first 12 hours to completely cure seizures.
- The hyponatremia is 100% caused by Sertraline; Hydrochlorothiazide played zero role.
- Patient has fully recovered from all seizures and is neurologically intact without deficits.`,
    violationPrevented: "VAL-SODIUM-CORRECTION, VAL-ODS-RESCUE, VAL-DRUG-CAUSALITY, VAL-SIMULATED-FACTS",
  },
  {
    id: "DPO-OBSTETRIC-001",
    category: "DEMOGRAPHIC_GATE",
    prompt: `<|im_start|>user
Intake: 22-year-old male presents with sudden-onset severe right lower quadrant abdominal pain, nausea, and low-grade temperature 37.8°C. Ultrasound of the appendix is equivocal. Provide diagnostic priorities, specialty routing, and next investigative step.<|im_end|>
<|im_start|>assistant
`,
    chosen: `### 1. Clinical Diagnostic Prioritization
- **Primary Consideration:** **Acute Appendicitis** (ICD-10: **K35.80**) or Acute Mesenteric Lymphadenitis.
- **Critical Must-Not-Miss Consideration:** **Testicular Torsion / Epididymitis** referred to lower abdomen (evaluate genitourinary exam immediately; 6-hour salvage golden window).
- **Demographic Isolation:** Patient is a 22-year-old biological male. Obstetric and gynecologic differentials (ruptured ectopic pregnancy, ovarian torsion, pelvic inflammatory disease, preeclampsia) are **strictly suppressed and demographically excluded**.

### 2. Next-Step Diagnostic Investigation
- Because bedside ultrasound was equivocal and right lower quadrant pain persists:
  1. Urgent cross-sectional imaging: **Abdominopelvic CT with IV contrast** to definitive visualize the appendix, inflammatory stranding, and cecal wall thickening.
  2. Complete bedside male genitourinary examination to rule out scrotal pathology.
  3. Urgent General Surgery consultation for clinical re-evaluation.`,
    rejected: `### 1. Clinical Differential
- Primary Differential: Ruptured Ectopic Pregnancy or Ovarian Torsion.
- Secondary Differential: Severe Preeclampsia with atypical RUQ/RLQ pain.
- Recommended orders: Obtain STAT serum beta-hCG (pregnancy test) and emergent transvaginal pelvic ultrasound to visualize gestational sac and ovaries.`,
    violationPrevented: "VAL-MALE-OB-EXCLUSION, CF-OB-001",
  },
];

export function buildCompleteDpoDataset(): ContrastiveDpoRow[] {
  const dataset: ContrastiveDpoRow[] = [...HIGH_YIELD_AUDIT_CASES];

  // 1. Synthesize 500 expert negative-constraint pairs targeting omission and gate violations
  try {
    const negConstraints = generateNegativeConstraintDpoPairs();
    dataset.push(...negConstraints);
  } catch (err) {
    console.warn("[!] Warning: Could not generate negative-constraint pairs:", err);
  }

  // 2. Synthesize cases from Noctis Health 500 gold standards
  try {
    const health500 = generatePreferenceDataset();
    for (const item of health500) {
      dataset.push({
        id: `DPO-H500-${item.metadata.caseId}`,
        category: "PHARMACOVIGILANCE",
        prompt: `<|im_start|>user\n${item.prompt}<|im_end|>\n<|im_start|>assistant\n`,
        chosen: item.chosen,
        rejected: item.rejected,
        violationPrevented: item.metadata.trippedSafetyInvariant || "CF-MED-001",
      });
    }
  } catch (err) {
    console.warn("[!] Warning: Could not auto-load Health 500 cases, using core high-yield set:", err);
  }

  return dataset;
}

export function exportDpoJsonl(outputFilePath: string): { count: number; path: string } {
  const rows = buildCompleteDpoDataset();
  const dir = path.dirname(outputFilePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const stream = fs.createWriteStream(outputFilePath, { encoding: "utf-8" });
  for (const row of rows) {
    const record = {
      id: row.id,
      category: row.category,
      prompt: row.prompt,
      chosen: row.chosen,
      rejected: row.rejected,
      violation_prevented: row.violationPrevented,
    };
    stream.write(JSON.stringify(record) + "\n");
  }
  stream.end();

  return { count: rows.length, path: outputFilePath };
}

// Direct CLI Execution
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes("generate_clinical_dpo_dataset")) {
  const outPath = path.resolve(process.cwd(), "data/noctis-dpo-clinical-safety.jsonl");
  const res = exportDpoJsonl(outPath);
  console.log(`[✓] Generated ${res.count} DPO clinical safety alignment pairs at: ${res.path}`);
}
