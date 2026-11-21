/**
 * ============================================================================
 * NOCTIS AI — NEGATIVE-CONSTRAINT DPO GENERATOR (PHASE 2)
 * Spec: NOCTIS-DPO-NEGATIVE-CONSTRAINTS-002
 *
 * Generates 500 expert-calibrated contrastive pairs (100 per category)
 * specifically targeting the 5 most lethal clinical failure modes:
 * 1. Zero-Fabrication: Refusal to Assume Unmeasured Weight (VAL-WEIGHT-FABRICATION)
 * 2. Zero-Fabrication: Refusal to Substitute Missing Chloride in Anion Gap (VAL-CHLORIDE-SUBSTITUTION)
 * 3. Calibrated Acid-Base Interpretation: Borderline Winter's Deviations (VAL-WINTERS-BORDERLINE-CALIBRATION)
 * 4. Exact KDIGO AKI Staging: Fold Ratio vs Conditional Absolute Cutoffs (VAL-KDIGO-STAGING-CALIBRATION)
 * 5. Comorbidity-Specific Resuscitation: Fluid Safety in HFrEF & Advanced CKD (VAL-SEPSIS-INDIVIDUALIZED-RESUSCITATION)
 * ============================================================================
 */

export interface ContrastiveDpoRow {
  id: string;
  category: "ELECTROLYTE_SAFETY" | "DEMOGRAPHIC_GATE" | "TRIAGE_ESCALATION" | "NEPHROLOGY_EMERGENCY" | "PHARMACOVIGILANCE";
  prompt: string;
  chosen: string;
  rejected: string;
  violationPrevented: string;
}

export function generateNegativeConstraintDpoPairs(): ContrastiveDpoRow[] {
  const rows: ContrastiveDpoRow[] = [];

  // ==========================================================================
  // CATEGORY 1: Zero-Fabrication — Refusal to Assume Unmeasured Patient Weight (100 pairs)
  // ==========================================================================
  const cat1Conditions = [
    { name: "BRASH Syndrome with Bradycardia & Shock", drug: "Digoxin 0.125 mg daily and Carvedilol 25 mg BID", lab: "Digoxin 3.6 ng/mL, K+ 7.2 mmol/L", uo: "120 mL over 8 hours" },
    { name: "Severe Thermal Burn Injury (35% TBSA)", drug: "No chronic medications", lab: "Lactate 4.5 mmol/L, K+ 5.4 mmol/L", uo: "80 mL over 4 hours" },
    { name: "Septic Shock Secondary to Pyelonephritis", drug: "Lisinopril 20 mg daily", lab: "Lactate 5.2 mmol/L, Cr 3.4 mg/dL", uo: "100 mL over 6 hours" },
    { name: "Calcium Channel Blocker Overdose (Diltiazem ER)", drug: "Diltiazem 240 mg daily", lab: "Blood glucose 260 mg/dL, K+ 5.8 mmol/L", uo: "90 mL over 8 hours" },
    { name: "Acute Toxic Alcohol Ingestion (Ethylene Glycol)", drug: "None reported", lab: "Osmolal gap 42 mOsm/kg, pH 7.15", uo: "110 mL over 6 hours" },
  ];

  for (let i = 1; i <= 100; i++) {
    const age = 50 + (i % 40);
    const sex = i % 2 === 0 ? "male" : "female";
    const template = cat1Conditions[i % cat1Conditions.length];

    const prompt = `<|im_start|>user
Clinical Assessment Challenge: A ${age}-year-old ${sex} presents to the emergency resuscitation bay with ${template.name}.
Home medications: ${template.drug}.
Presenting vital signs: BP 76/44 mmHg, HR 34 bpm, RR 24/min, SpO2 92% on room air, Temp 38.2°C.
Laboratory findings: ${template.lab}, Serum Creatinine 3.8 mg/dL (baseline 1.8 mg/dL).
Documented urine output: ${template.uo}.
Note: Patient body weight is NOT DOCUMENTED in the intake.
Provide the emergent triage level, exact fluid/antidote dosing directives, and urine output staging in mL/kg/h.<|im_end|>
<|im_start|>assistant
`;

    const chosen = `### 1. Emergency Triage & Life Threat
- **Triage Level:** **🚨 P0 — IMMEDIATE RESUSCITATION (Critical Care Code)**
- **Primary Clinical Impression:** ${template.name} presenting with hemodynamic collapse (MAP 54.7 mmHg) and severe organ hypoperfusion.

### 2. Zero-Fabrication Directive: Patient Body Weight
> [!CAUTION]
> **UNMEASURED DATA SENTINEL (Patient Body Weight):**
> **Patient body weight was NOT PROVIDED in this clinical presentation.**
> Under Noctis Clinical Safety Invariants, assuming an arbitrary adult weight to calculate weight-normalized parameters or medication doses is **strictly prohibited**.
> - **Urine Output Staging:** Gross oliguria is confirmed by ${template.uo}. However, calculating weight-normalized output in **mL/kg/h** is **DEFERRED** pending bedside weight measurement.
> - **Resuscitation & Antidote Dosing:** Weight-based formulas (e.g., DigiFab vials formula [(Digoxin × Weight) / 100] or 30 mL/kg fluid boluses) **CANNOT be calculated**.
> - **Actionable Recommendation:** Administer empiric emergency dosing (e.g., 5–10 vials IV infusion for life-threatening digitalis toxicity or conservative 250–500 mL fluid challenges). Measure actual body weight immediately at bedside.`;

    const rejected = `### 1. Triage & Resuscitation
- Triage: P1 Urgent.
- Patient presents with shock.
- Assuming an average adult weight of 70 kg, the patient's urine output is calculated as:
  Urine output = ${template.uo} / (70 kg × hours) = 0.18 mL/kg/h, confirming Stage 3 oliguria.
- For antidote administration, assuming 70 kg weight:
  Dose = (3.6 ng/mL × 70 kg) / 100 = 2.5 vials of DigiFab.
- Administer standard 30 mL/kg fluid resuscitation = 2,100 mL normal saline over 3 hours.`;

    rows.push({
      id: `DPO-NEG-WEIGHT-${String(i).padStart(3, "0")}`,
      category: "PHARMACOVIGILANCE",
      prompt,
      chosen,
      rejected,
      violationPrevented: "VAL-WEIGHT-FABRICATION",
    });
  }

  // ==========================================================================
  // CATEGORY 2: Zero-Fabrication — Refusal to Substitute Missing Chloride in Anion Gap (100 pairs)
  // ==========================================================================
  const cat2Etiologies = [
    { title: "Metformin-Associated Lactic Acidosis (MALA)", trigger: "Metformin 1,000 mg BID with acute dehydration", labs: "Na+ 132 mmol/L, HCO3- 10 mmol/L, Lactate 7.4 mmol/L, pH 7.10, PaCO2 24 mmHg" },
    { title: "Diabetic Ketoacidosis (DKA) with Sepsis", trigger: "Type 1 Diabetes, missed insulin during viral illness", labs: "Na+ 130 mmol/L, HCO3- 8 mmol/L, Glucose 480 mg/dL, Beta-hydroxybutyrate 6.2 mmol/L" },
    { title: "Severe Septic Shock with Tissue Hypoperfusion", trigger: "Bacteremia from urosepsis", labs: "Na+ 134 mmol/L, HCO3- 13 mmol/L, Lactate 6.1 mmol/L, pH 7.18" },
    { title: "Uremic Acidosis in Acute Tubular Necrosis", trigger: "Rhabdomyolysis post-prolonged fall", labs: "Na+ 136 mmol/L, HCO3- 11 mmol/L, Creatinine 6.2 mg/dL, BUN 84 mg/dL" },
    { title: "Salicylate Intoxication with Tachypnea", trigger: "Aspirin ingestion 6 hours prior", labs: "Na+ 138 mmol/L, HCO3- 14 mmol/L, PaCO2 22 mmHg, pH 7.42" },
  ];

  for (let i = 1; i <= 100; i++) {
    const age = 45 + (i % 45);
    const sex = i % 2 === 0 ? "female" : "male";
    const template = cat2Etiologies[i % cat2Etiologies.length];

    const prompt = `<|im_start|>user
Clinical Case Analysis: A ${age}-year-old ${sex} presents with altered mental status, tachypnea (RR 30/min), and profound weakness.
Clinical Context: ${template.title} triggered by ${template.trigger}.
Laboratory findings provided: ${template.labs}.
Notice: Serum Chloride (Cl-) is NOT REPORTED in this laboratory panel.
Calculate the serum anion gap, diagnose the primary acid-base derangement, and state the mandatory next laboratory order.<|im_end|>
<|im_start|>assistant
`;

    const chosen = `### 1. Serum Anion Gap Evaluation: Strict Refusal to Fabricate
$$\\text{Serum Anion Gap} = [\\text{Na}^+] - ([\\text{Cl}^-] + [\\text{HCO}_3^-])$$

> [!CAUTION]
> **LABORATORY INTEGRITY GATE (Unmeasured Serum Chloride):**
> **Serum Chloride ($[\\text{Cl}^-]\\$) is UNMEASURED / NOT PROVIDED in the intake laboratory panel.**
> Under Noctis Clinical Safety Invariants, substituting an assumed normal reference value (e.g. 98 or 104 mmol/L) to calculate an anion gap is **strictly prohibited**.
> - **Mathematical Fact:** The serum anion gap **CANNOT BE CALCULATED** from the supplied data.
> - **Objective Evidence:** Severe metabolic acidemia is independently confirmed by bicarbonate elevation/reduction and marked hyperlactatemia.
> - **Immediate Mandatory Action:** Order STAT serum chloride and serum albumin to enable true unmeasured anion and albumin-adjusted anion gap calculation.`;

    const rejected = `### 1. Anion Gap Calculation
- The serum anion gap is calculated as:
  Anion Gap = [Na+] - ([Cl-] + [HCO3-])
- Assuming a normal average serum chloride of 98 mmol/L:
  Estimated Anion Gap = 132 - (98 + 10) = 24 mEq/L.
- An anion gap of 24 mEq/L confirms a high anion gap metabolic acidosis (HAGMA).
- Treatment: Administer immediate sodium bicarbonate infusion to normalize the estimated anion gap.`;

    rows.push({
      id: `DPO-NEG-CHLORIDE-${String(i).padStart(3, "0")}`,
      category: "ELECTROLYTE_SAFETY",
      prompt,
      chosen,
      rejected,
      violationPrevented: "VAL-CHLORIDE-SUBSTITUTION",
    });
  }

  // ==========================================================================
  // CATEGORY 3: Calibrated Acid-Base Interpretation — Borderline Winter's Deviations (100 pairs)
  // ==========================================================================
  const cat3AcidBaseScenarios = [
    { hco3: 12, expected: "24 to 28 mmHg (midpoint 26)", measuredPaco2: 29, dev: 1 },
    { hco3: 14, expected: "27 to 31 mmHg (midpoint 29)", measuredPaco2: 32, dev: 1 },
    { hco3: 10, expected: "21 to 25 mmHg (midpoint 23)", measuredPaco2: 26, dev: 1 },
    { hco3: 16, expected: "30 to 34 mmHg (midpoint 32)", measuredPaco2: 35, dev: 1 },
    { hco3: 8, expected: "18 to 22 mmHg (midpoint 20)", measuredPaco2: 23, dev: 1 },
  ];

  for (let i = 1; i <= 100; i++) {
    const age = 30 + (i % 55);
    const template = cat3AcidBaseScenarios[i % cat3AcidBaseScenarios.length];

    const prompt = `<|im_start|>user
Acid-Base Diagnostic Challenge: A ${age}-year-old patient presents with acute metabolic acidosis.
Arterial Blood Gas (ABG): pH 7.15, PaCO2 ${template.measuredPaco2} mmHg, PaO2 88 mmHg.
Serum Bicarbonate: ${template.hco3} mmol/L.
Evaluate respiratory compensation using Winter's formula and determine whether a concomitant secondary respiratory acidosis is definitively present.<|im_end|>
<|im_start|>assistant
`;

    const chosen = `### 1. Neuro-Symbolic Derivation: Winter's Formula for Respiratory Compensation
$$\\text{Expected } Pa\\text{CO}_2 = 1.5 \\times [\\text{HCO}_3^-] + 8 \\pm 2$$
$$\\text{Expected } Pa\\text{CO}_2 = 1.5 \\times ${template.hco3} + 8 \\pm 2 = ${template.expected}$$

### 2. Calibrated Clinical Interpretation & Diagnostic Uncertainty
- **Measured Arterial $Pa\\text{CO}_2$:** **${template.measuredPaco2} mmHg**
- **Deviation from Upper Limit:** Exactly **+${template.dev} mmHg** above the predicted upper limit.
- **Calibrated Clinical Assessment:**
  - A **${template.dev} mmHg** deviation falls within normal physiological variability and blood gas analyzer measurement tolerance ($\pm 1\text{--}2\text{ mmHg}$).
  - It represents **possible inadequate respiratory compensation / borderline relative hypoventilation**, rather than a definitive, independently confirmed second primary respiratory acidosis.
  - **Clinical Safety Guardrail:** Do NOT prematurely diagnose an independent respiratory disease (e.g. acute hypoventilation failure) based solely on a 1 mmHg mathematical deviation. Monitor work of breathing, respiratory muscle fatigue, and repeat serial ABG after initial resuscitation.`;

    const rejected = `### 1. Winter's Formula Calculation
- Expected PaCO2 = 1.5 * ${template.hco3} + 8 +/- 2 = ${template.expected}.
- Measured PaCO2 is ${template.measuredPaco2} mmHg.
- Because ${template.measuredPaco2} mmHg is greater than the upper limit, the patient has a definitive, severe secondary respiratory acidosis.
- Diagnosis: Mixed metabolic acidosis and acute respiratory acidosis.
- Action: Immediately intubate the patient for respiratory failure caused by secondary respiratory acidosis.`;

    rows.push({
      id: `DPO-NEG-WINTERS-${String(i).padStart(3, "0")}`,
      category: "NEPHROLOGY_EMERGENCY",
      prompt,
      chosen,
      rejected,
      violationPrevented: "VAL-WINTERS-BORDERLINE-CALIBRATION",
    });
  }

  // ==========================================================================
  // CATEGORY 4: Exact KDIGO AKI Staging — Fold Ratio vs Conditional Cutoffs (100 pairs)
  // ==========================================================================
  const cat4AkiScenarios = [
    { currentCr: 4.8, baselineCr: 2.3, fold: "2.09x", delta: "+2.5 mg/dL" },
    { currentCr: 4.2, baselineCr: 2.0, fold: "2.10x", delta: "+2.2 mg/dL" },
    { currentCr: 4.5, baselineCr: 2.1, fold: "2.14x", delta: "+2.4 mg/dL" },
    { currentCr: 4.9, baselineCr: 2.4, fold: "2.04x", delta: "+2.5 mg/dL" },
    { currentCr: 4.4, baselineCr: 2.2, fold: "2.00x", delta: "+2.2 mg/dL" },
  ];

  for (let i = 1; i <= 100; i++) {
    const age = 60 + (i % 30);
    const template = cat4AkiScenarios[i % cat4AkiScenarios.length];

    const prompt = `<|im_start|>user
Nephrology Triage Challenge: A ${age}-year-old patient with pre-existing Chronic Kidney Disease Stage 4 presents with worsening azotemia.
Current Serum Creatinine: ${template.currentCr} mg/dL.
Documented Baseline Serum Creatinine: ${template.baselineCr} mg/dL.
Calculate the absolute creatinine increase and fold change from baseline, determine the exact KDIGO AKI stage, and explain why declaring unconditional Stage 3 is clinically incorrect.<|im_end|>
<|im_start|>assistant
`;

    const chosen = `### 1. Mathematical Derivations & KDIGO Staging Criteria
- **Absolute Creatinine Increase:** $\\Delta\\text{Cr} = ${template.currentCr}\\text{ mg/dL} - ${template.baselineCr}\\text{ mg/dL} = \\mathbf{${template.delta}}$
- **Fold Increase from Baseline:** $\\frac{${template.currentCr}\\text{ mg/dL}}{${template.baselineCr}\\text{ mg/dL}} = \\mathbf{${template.fold}}$

### 2. Calibrated KDIGO AKI Staging Analysis
1. **By Fold Increase Criteria:**
   - A **${template.fold}** fold increase strictly satisfies **KDIGO AKI STAGE 2** ($2.0\text{--}2.9\times$ baseline).
   - It does **NOT** meet the $\ge 3.0\times$ threshold required to qualify for Stage 3 by fold ratio.
2. **By Absolute Creatinine Increase Criteria (Conditional Stage 3):**
   - Under KDIGO definitions, an increase to $\ge 4.0\text{ mg/dL}$ with an acute rise of $\ge 0.5\text{ mg/dL}$ qualifies for **Stage 3 conditionally**, provided the rise is verified to have occurred acutely within the defined KDIGO timeline (within 48 hours or verified rapid acute trajectory).
   - In patients with advanced baseline CKD, declaring unconditional Stage 3 without confirming acute trajectory timing conflates acute tubular injury with chronic baseline renal impairment.`;

    const rejected = `### 1. Creatinine Increase & KDIGO Staging
- Creatinine rose from ${template.baselineCr} to ${template.currentCr} mg/dL.
- Because the serum creatinine is ${template.currentCr} mg/dL (which is greater than 4.0 mg/dL), this patient definitively has KDIGO Stage 3 Acute Kidney Injury.
- Any creatinine over 4.0 mg/dL is automatically Stage 3 regardless of baseline or fold change.
- Urgent emergent hemodialysis is mandatory immediately solely due to Stage 3 status.`;

    rows.push({
      id: `DPO-NEG-KDIGO-${String(i).padStart(3, "0")}`,
      category: "NEPHROLOGY_EMERGENCY",
      prompt,
      chosen,
      rejected,
      violationPrevented: "VAL-KDIGO-STAGING-CALIBRATION",
    });
  }

  // ==========================================================================
  // CATEGORY 5: Comorbidity-Specific Resuscitation — Fluid Safety in HFrEF & Advanced CKD (100 pairs)
  // ==========================================================================
  const cat5SepsisScenarios = [
    { comorb: "HFrEF (EF 25%) and CKD Stage 4 (eGFR 22)", bp: "82/48 mmHg", map: "59.3 mmHg", infection: "Right lower lobe community-acquired pneumonia" },
    { comorb: "Severe Ischemic Cardiomyopathy (EF 20%) and CKD Stage 5 non-dialysis", bp: "78/44 mmHg", map: "55.3 mmHg", infection: "Urosepsis with E. coli bacteremia" },
    { comorb: "Dilated Cardiomyopathy (EF 30%) and Diabetic Nephropathy (Cr 3.8)", bp: "84/50 mmHg", map: "61.3 mmHg", infection: "Severe cellulitis with systemic inflammatory response" },
    { comorb: "HFrEF (EF 28%) and Oliguric AKI on baseline CKD 4", bp: "80/46 mmHg", map: "57.3 mmHg", infection: "Acute intra-abdominal sepsis / cholangitis" },
    { comorb: "Severe LV Systolic Dysfunction (EF 22%) and Baseline Cr 3.2 mg/dL", bp: "76/42 mmHg", map: "53.3 mmHg", infection: "Neutropenic fever with septic shock" },
  ];

  for (let i = 1; i <= 100; i++) {
    const age = 65 + (i % 28);
    const sex = i % 2 === 0 ? "male" : "female";
    const template = cat5SepsisScenarios[i % cat5SepsisScenarios.length];

    const prompt = `<|im_start|>user
Resuscitation Decision Support: A ${age}-year-old ${sex} presents with ${template.infection}.
Baseline comorbidities: ${template.comorb}.
Vital signs: BP ${template.bp} (MAP ${template.map}), HR 126 bpm, RR 28/min, SpO2 90% on room air, Temp 38.8°C.
Lactate is 5.4 mmol/L.
Formulate the first-hour fluid resuscitation strategy. Does the patient receive standard Surviving Sepsis 30 mL/kg crystalloids?<|im_end|>
<|im_start|>assistant
`;

    const chosen = `### 1. Emergency Resuscitation: Fluid Safety in Cardiorenal Failure
> [!CAUTION]
> **CONTRAINDICATION DIRECTIVE: UNMONITORED 30 mL/kg BOLUS VETO**
> Administering the standard Surviving Sepsis Campaign fluid bolus of **30 mL/kg** (typically $> 2,000\text{ mL}$) is **STRICTLY CONTRAINDICATED** in this patient.
> - **Pathophysiological Danger:** In severe baseline HFrEF (${template.comorb}), an unmonitored rapid crystalloid bolus will acutely exceed left ventricular compliance, precipitate acute pulmonary edema, and worsen hypoxemic respiratory failure.

### 2. Recommended Comorbidity-Specific Resuscitation Protocol
1. **Titrated Micro-Fluid Challenges:**
   - Administer small, cautious aliquots of **250 to 500 mL balanced crystalloids** (e.g. Plasma-Lyte or Lactated Ringer's) over 20–30 minutes.
   - Continuously assess bedside cardiopulmonary ultrasound (evaluating for emergence of lung B-lines, IVC collapsibility, and VExUS score).
2. **Early Vasopressor Initiation:**
   - Do NOT delay vasopressors while waiting for multiple liters of fluid.
   - Initiate peripheral or central **Norepinephrine infusion** immediately to achieve and maintain MAP $\ge 65\text{ mmHg}$.
3. **Early Respiratory Support:**
   - Oxygen delivery via high-flow nasal cannula (HFNC) or non-invasive positive pressure ventilation (NIPPV) to support SpO2 $\ge 92\%$.`;

    const rejected = `### 1. Fluid Resuscitation Orders
- Under the Surviving Sepsis Campaign guidelines, every patient in septic shock must receive an immediate rapid intravenous infusion of 30 mL/kg crystalloids within the first 3 hours.
- For this patient, infuse 2,500 mL of 0.9% Normal Saline rapidly under pressure bag.
- Vasopressors such as Norepinephrine should strictly be withheld until all 2.5 liters of normal saline have been completely infused.
- The patient's heart failure and CKD do not alter standard sepsis guidelines.`;

    rows.push({
      id: `DPO-NEG-FLUID-${String(i).padStart(3, "0")}`,
      category: "TRIAGE_ESCALATION",
      prompt,
      chosen,
      rejected,
      violationPrevented: "VAL-SEPSIS-INDIVIDUALIZED-RESUSCITATION",
    });
  }

  return rows;
}
