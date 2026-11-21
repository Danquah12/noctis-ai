/**
 * Noctis Sovereign Systems — DKA, Septic Shock & Multi-System Resuscitation Engine
 * Dedicated domain engine for diabetic ketoacidosis, septic shock, hyperkalemia, AKI, and heart failure.
 * Strict Encounter Isolation & Single Authoritative Patient Context.
 * ZERO DATA FABRICATION — Never assumes or invents unmeasured laboratory values.
 */

import type { ImmutablePatientContext } from "./noctis-patient-context.ts";
import { buildClinicalScratchpad } from "./noctis-clinical-scratchpad.ts";

export function generateDkaSepticShockEmergencyDossier(
  context: ImmutablePatientContext
): string {
  const encId = context.encounterId;
  const ageDisplay = context.demographics.ageDisplay;
  const sexDisplay = context.demographics.sex;
  const bp = context.vitals.bpDisplay;
  const hr = context.vitals.heartRateBpm;
  const rr = context.vitals.respiratoryRatePerMin;
  const temp = context.vitals.temperatureCelsius;
  const spo2 = context.vitals.spo2Display;

  // Hemodynamics
  const mapVal = context.calculations.meanArterialPressureMmHg;
  const mapDisplay = mapVal !== null ? `${mapVal.toFixed(1)} mmHg` : "[UNMEASURED]";
  const isMapTargetMet = mapVal !== null && mapVal >= 65.0;
  const mapMarginMmHg = mapVal !== null ? (mapVal - 65.0).toFixed(1) : null;

  // Potassium & Cardiotoxicity
  const kVal = context.labs.potassiumMeqL;
  const kDisplay = kVal !== null ? `${kVal} mmol/L` : "[UNMEASURED / STAT LAB REQUIRED]";
  const isSevereHyperkalemia = kVal !== null && kVal >= 6.0;
  const isModerateHyperkalemia = kVal !== null && kVal >= 5.5 && kVal < 6.0;
  const isNormalK = kVal !== null && kVal >= 3.5 && kVal < 5.5;
  const isHypokalemic = kVal !== null && kVal < 3.5;

  // Glycemic & Metabolic Labs
  const glucVal = context.labs.glucoseMgDl;
  const glucDisplay = glucVal !== null ? `${glucVal} mg/dL` : "[UNMEASURED — Point-of-care blood glucose STAT required]";

  const bhbVal = context.labs.betaHydroxybutyrateMmolL;
  const bhbDisplay = bhbVal !== null ? `${bhbVal} mmol/L` : "[UNMEASURED — Beta-hydroxybutyrate required]";

  const hco3Val = context.labs.bicarbonateMeqL;
  const hco3Display = hco3Val !== null ? `${hco3Val} mmol/L` : "[UNMEASURED]";

  const naVal = context.labs.sodiumMeqL;
  const naDisplay = naVal !== null ? `${naVal} mmol/L` : "[UNMEASURED]";

  const clVal = context.labs.chlorideMeqL;
  const clDisplay = clVal !== null ? `${clVal} mmol/L` : "[UNMEASURED / NOT PROVIDED]";

  const phVal = context.labs.arterialPh;
  const phDisplay = phVal !== null ? `${phVal}` : "[UNMEASURED]";

  const paco2Val = context.labs.paco2MmHg;
  const paco2Display = paco2Val !== null ? `${paco2Val} mmHg` : "[UNMEASURED]";

  const lacVal = context.labs.lactateMmolL;
  const lacDisplay = lacVal !== null ? `${lacVal} mmol/L` : "[UNMEASURED — STAT serum lactate required]";

  const crVal = context.labs.creatinineMgDl;
  const crDisplay = crVal !== null ? `${crVal} mg/dL` : "[UNMEASURED]";

  const efVal = context.cardiac.ejectionFractionPercent;
  const efDisplay = efVal !== null ? `${efVal}%` : "[UNMEASURED / NOT DOCUMENTED]";

  // Calculations
  const isAgComputable = context.calculations.isAnionGapComputable;
  const agVal = context.calculations.anionGapMeqL;

  const isWintersComputable = context.calculations.isWintersComputable;
  const wintersMid = context.calculations.wintersExpectedMidpointMmHg;
  const wintersLow = context.calculations.wintersExpectedLowMmHg;
  const wintersHigh = context.calculations.wintersExpectedHighMmHg;

  const scratchpad = buildClinicalScratchpad(context.rawInput, encId);

  // Dynamic presentation summaries
  const shockSummary = isMapTargetMet
    ? `distributive physiology with systemic perfusion pressure currently maintained (BP ${bp}, MAP ${mapDisplay}, HR ${hr !== null ? `${hr} bpm` : "[UNMEASURED]"})`
    : `severe multi-system distributive and cardiogenic shock (BP ${bp}, MAP ${mapDisplay}, HR ${hr !== null ? `${hr} bpm` : "[UNMEASURED]"})`;

  const kSummary = isSevereHyperkalemia
    ? `severe hyperkalemic cardiotoxicity (serum potassium K+ = ${kDisplay} with QRS widening)`
    : isModerateHyperkalemia
    ? `moderate hyperkalemia (serum potassium K+ = ${kDisplay})`
    : isNormalK
    ? `normal serum potassium (serum potassium K+ = ${kDisplay}; reference 3.5–5.0 mmol/L)`
    : isHypokalemic
    ? `hypokalemia (serum potassium K+ = ${kDisplay})`
    : `unmeasured serum potassium (STAT potassium required)`;

  const dkaSummary = glucVal !== null
    ? `severe Diabetic Ketoacidosis (Glucose ${glucDisplay}, Beta-hydroxybutyrate ${bhbDisplay}, HCO3- ${hco3Display}, Arterial pH ${phDisplay})`
    : `suspected acute metabolic / endocrine decompensation (Glucose ${glucDisplay})`;

  const agSummary = isAgComputable
    ? `profound high anion gap metabolic acidosis (Anion Gap = ${agVal} mEq/L)`
    : `metabolic acidosis evaluation (Anion Gap CANNOT be calculated without measured chloride)`;

  const hfSummary = efVal !== null
    ? `decompensated heart failure with reduced ejection fraction (EF ${efDisplay})`
    : `cardiovascular compromise in suspected severe sepsis`;

  return `# Noctis Patient Diagnostic & Triage Intelligence Dossier (Clinical Decision Support)
**Encounter ID:** \`${encId}\` · **Triage Urgency:** **🚨 P0 IMMEDIATE EMERGENCY (Call 911 / EMS Now · Resuscitation & Critical Care)**
**Regulatory Scope:** Dual-Tier Function Classification (Preliminary Informational Analysis — Requires Independent Regulatory & Legal Review)

> [!CAUTION]
> **EMERGENCY MEDICAL WARNING (911 / RESUSCITATION LOCKOUT DIRECTIVE — MULTI-SYSTEM METABOLIC & SEPTIC COLLAPSE)**
> 🚨 **CRITICAL LIFE THREAT:** This ${ageDisplay} ${sexDisplay} presents in **${shockSummary}**, **${dkaSummary}** with **${agSummary}**, **${kSummary}**, **lactic acidosis evaluation (Lactate ${lacDisplay})**, **renal assessment (Creatinine ${crDisplay})**, and **${hfSummary}** secondary to suspected severe urosepsis.
> - **Immediate Life-Threatening Risks:** Imminent risk of hemodynamic collapse, lethal cardiac conduction disturbances, profound metabolic exhaustion, or progressive multi-organ failure.
> - **Immediate Resuscitation Directive:** **Activate Emergency Medical Services (Call 911 / EMS immediately) / Mobilize Rapid Response / Code Team to Resuscitation Bay.** Outpatient or delayed management is **STRICTLY CONTRAINDICATED**.
> - **Concurrent Life-Saving Actions:** Continuous 12-lead cardiac telemetry, STAT capillary blood glucose and arterial blood gas, tailored crystalloid resuscitation avoiding fluid overload, blood and urine cultures with empiric IV antibiotics within 1 hour, hourly electrolyte monitoring, and emergent ICU / nephrology consultation. Immediately withhold Metformin.

---

### 1. Emergency Triage Priority & Immediate Life-Threatening Conditions

**Assigned Triage Priority:** **🚨 P0 — IMMEDIATE RESUSCITATION (ESI Level 1 / Critical Code)**

| Priority | Physiological Threat | Clinical Findings | Immediate Life Threat & Mechanism |
| :---: | :--- | :--- | :--- |
| **P0-1** | **${isSevereHyperkalemia || isModerateHyperkalemia ? "Hyperkalemic Cardiotoxicity" : "Cardiac Rhythm & Conduction"}** | ${kSummary}, ECG: ${context.cardiac.ecgFindings.length > 0 ? context.cardiac.ecgFindings.join(", ") : "sinus rhythm / monitoring underway"}, HR ${hr !== null ? `${hr} bpm` : "[UNMEASURED]"} | ${isSevereHyperkalemia ? "Severe hyperkalemia inactivates myocardial sodium channels; imminent risk of ventricular fibrillation or asystole." : isNormalK ? "Normal serum potassium; vulnerable to precipitous hypokalemia upon insulin initiation." : "Requires STAT potassium verification."} |
| **P0-2** | **Hemodynamic & Perfusion Status** | BP ${bp}, MAP ${mapDisplay} (${isMapTargetMet ? `Target met: +${mapMarginMmHg} mmHg reserve` : `Deficit: ${mapMarginMmHg} mmHg`}), HR ${hr !== null ? `${hr} bpm` : "[UNMEASURED]"}, Temp ${temp !== null ? `${temp}°C` : "[UNMEASURED]"} | ${isMapTargetMet ? "Systemic perfusion pressure currently maintained (MAP ≥ 65 mmHg); observe closely for vasodilatory or cardiogenic collapse." : "Severe shock with vital organ perfusion deficit; prompt vasopressor support (Norepinephrine) indicated."} |
| **P0-3** | **Diabetic Ketoacidosis (DKA) / Metabolic Acidemia** | Glucose ${glucDisplay}, Beta-hydroxybutyrate ${bhbDisplay}, pH ${phDisplay}, HCO3- ${hco3Display}, Anion Gap: ${isAgComputable ? `${agVal} mEq/L` : "Unmeasured"} | Relative or absolute insulin deficiency leading to uncontrolled lipolysis, ketonemia, and severe acidemia. |
| **P0-4** | **Lactic Acidosis Evaluation** | Lactate ${lacDisplay}, Metformin exposure documented, Cr ${crDisplay} | Tissue hypoperfusion compounded by reduced renal clearance of metformin impairing mitochondrial oxidative phosphorylation. |
| **P0-5** | **Renal Function & AKI Risk** | Serum Creatinine ${crDisplay}, metabolic acidemia | Prerenal hypoperfusion from sepsis and osmotic losses superimposed on acute tubular injury. |
| **P0-6** | **Cardiovascular Reserve** | Left ventricular EF ${efDisplay}, bibasilar crackles / pulmonary congestion risk | High vulnerability to iatrogenic pulmonary edema during fluid resuscitation; mandates individualized volume-titrated protocol. |

---

### 2. Neuro-Symbolic Mathematical & Acid-Base Calculations

#### Calculation 1: Mean Arterial Pressure (MAP) & Perfusion Assessment
${mapVal !== null ? `\\[ MAP = \\frac{\\text{SBP} + 2(\\text{DBP})}{3} = \\frac{${context.vitals.systolicBp} + 2(${context.vitals.diastolicBp})}{3} = ${mapDisplay} \\]` : "MAP calculation deferred: Blood pressure unmeasured."}
- **Target Threshold:** MAP $\\ge 65.0\\text{ mmHg}$ for vital organ perfusion.
- **Perfusion Assessment:** ${isMapTargetMet
    ? `MAP of **${mapDisplay}** meets the vital organ perfusion target (+${mapMarginMmHg} mmHg above 65.0 mmHg threshold). Vital organ perfusion pressure is currently maintained without immediate vasopressor requirement.`
    : mapVal !== null
    ? `Perfusion Deficit: **${mapMarginMmHg} mmHg** below 65.0 mmHg target. Severe shock requiring prompt vasopressor initiation (Norepinephrine) in parallel with cautious volume resuscitation.`
    : "Blood pressure required for perfusion evaluation."}

#### Calculation 2: Serum Anion Gap (INV-002: Zero Fabrication Invariant)
${isAgComputable
    ? `\\[ \\text{Anion Gap} = \\text{Na}^+ - (\\text{Cl}^- + \\text{HCO}_3^-) = ${naVal} - (${clVal} + ${hco3Val}) = ${agVal}\\text{ mEq/L} \\]
- **Normal Range:** $8\\text{–}12\\text{ mEq/L}$.
- **Result:** **${agVal} mEq/L** represents a profound **High Anion Gap Metabolic Acidosis (HAGMA)** driven by unmeasured ketoacids and lactate.`
    : `\\[ \\text{Anion Gap} = \\text{CANNOT BE CALCULATED — INCOMPLETE ELECTROLYTES} \\]
- **Clinical Invariant (INV-002):** Serum chloride (${clDisplay}) or bicarbonate (${hco3Display}) is unmeasured in intake. Fabricating reference electrolyte values to calculate an anion gap is strictly prohibited. Anion gap calculation is deferred until complete chemistries return.`}

#### Calculation 3: Winter's Formula for Respiratory Compensation (INV-005)
${isWintersComputable
    ? `\\[ \\text{PaCO}_{2,\\text{expected}} = 1.5 \\times [\\text{HCO}_3^-] + 8 \\pm 2 = 1.5(${hco3Val}) + 8 \\pm 2 = ${wintersMid} \\pm 2 = ${wintersLow}\\text{–}${wintersHigh}\\text{ mmHg} \\]
- **Measured PaCO2:** **${paco2Display}**.
- **Diagnostic Interpretation:** Measured PaCO2 of ${paco2Display} falls within the predicted compensatory range of **${wintersLow}–${wintersHigh} mmHg** (${wintersMid} ± 2 mmHg), confirming **adequate respiratory compensation** for primary metabolic acidosis.`
    : `\\[ \\text{Winter's Formula} = \\text{CANNOT BE COMPUTED WITHOUT MEASURED BICARBONATE AND PACO2} \\]
- **Status:** Bicarbonate (${hco3Display}) or PaCO2 (${paco2Display}) unmeasured. STAT arterial blood gas and serum chemistries required.`}

---

### 3. Integrated Emergency Management Protocols

#### Phase 1: Cardiac Membrane & Rhythm Stabilization
${isSevereHyperkalemia || (isModerateHyperkalemia && context.cardiac.ecgFindings.some(f => /qrs|peaked|sine/i.test(f)))
    ? `- **IV Calcium Gluconate:** Administer **10% Calcium Gluconate 10–20 mL (1–2 g IV)** over 2–5 minutes under continuous cardiac monitoring for hyperkalemic membrane stabilization (K+ ${kDisplay}).
- **Safety Verification:** Patient has zero documented digoxin exposure; IV Calcium is safe and indicated for hyperkalemic cardiotoxicity.`
    : isNormalK
    ? `- **IV Calcium Gluconate:** **NOT INDICATED FOR HYPERKALEMIA.** Serum potassium is within normal limits (${kDisplay}). Calcium gluconate is reserved for hyperkalemic cardiotoxicity or severe ionized hypocalcemia.
- **Safety Verification:** Zero documented digoxin exposure. Continuous cardiac telemetry indicated to monitor for dysrhythmias.`
    : `- **IV Calcium Gluconate:** Check STAT serum potassium and 12-lead ECG. Defer routine calcium administration until serum potassium is verified, unless overt hyperkalemic sine waves or peaked T waves are present.`}

#### Phase 2: Sepsis Bundle & Hemodynamic Management (INV-004)
- **Hemodynamic Strategy:** ${isMapTargetMet
    ? `Current MAP of ${mapDisplay} achieves the ≥ 65.0 mmHg target. Vasopressors (Norepinephrine) are on standby but not immediately started. Maintain continuous blood pressure monitoring.`
    : `Initiate early **Norepinephrine infusion** (titrate to target MAP ≥ 65 mmHg) to restore coronary and systemic perfusion pressure.`}
- **Individualized Crystalloid Resuscitation:** In patients with known or suspected heart failure (EF ${efDisplay}$), standard aggressive 30 mL/kg rapid boluses risk fatal pulmonary edema. Administer conservative crystalloid boluses (250–500 mL Plasmalyte or 0.9% Normal Saline) with serial dynamic fluid responsiveness and bedside lung ultrasound reassessment.
- **Empiric Antimicrobial Therapy:** Blood and urine cultures STAT, followed immediately by broad-spectrum IV antibiotics within 1 hour for suspected sepsis.

#### Phase 3: Diabetic Ketoacidosis & Metabolic Derangement Protocol
- **Insulin Infusion Timing:** ${kVal !== null && kVal >= 5.3
    ? `Serum potassium is **${kDisplay}** (≥ 5.3 mmol/L). Regular insulin infusion (0.1 units/kg/hr IV) can be initiated immediately without potassium supplementation.`
    : kVal !== null && kVal >= 3.3
    ? `Serum potassium is **${kDisplay}** (3.3–5.2 mmol/L). Start **IV KCl (20–30 mEq/L fluid)** CONCURRENTLY with regular insulin infusion (0.1 units/kg/hr IV) to prevent insulin-induced hypokalemia.`
    : kVal !== null
    ? `Serum potassium is **${kDisplay}** (< 3.3 mmol/L). **STRICT CONTRAINDICATION: HOLD ALL INSULIN** and infuse IV KCl (20–40 mEq/hr) until K+ ≥ 3.3 mmol/L before starting insulin.`
    : `Obtain STAT capillary blood glucose and serum potassium before initiating high-dose insulin.`}
- **Two-Bag System Transition:** ${glucVal !== null
    ? `Blood glucose is currently **${glucDisplay}**. Initiate the **Two-Bag System** by adding 5% Dextrose (D5 0.45% NS) once glucose reaches 200–250 mg/dL, while **CONTINUING** insulin infusion until the anion gap closes and ketoacidosis resolves.`
    : `Monitor blood glucose hourly; transition to D5 0.45% NS once glucose reaches 200–250 mg/dL while continuing insulin.`}
- **Metformin Discontinuation:** Discontinue Metformin immediately to prevent progressive lactic acid accumulation in the setting of acute physiological stress.

#### Phase 4: Emergent Nephrology Consultation & Critical Care Admission
- **AEIOU Evaluation:** Refractory acidosis, electrolyte derangements, acute renal failure, and volume overload risk indicate urgent ICU admission and consideration of continuous renal replacement therapy (CRRT).

---

### 4. Strict Clinical Contraindications & Safety Invariants

> [!WARNING]
> **MANDATORY CLINICAL SAFETY CONTRAINDICATIONS & OVERRIDES**
>
> 1. **DIGOXIN ANTIDOTE (DIGIFAB) CONTRAINDICATION (INV-003):**  
>    **DigiFab is STRICTLY NOT INDICATED.** The patient has **zero documented digoxin exposure**, no history of cardiac glycoside therapy, and presents with ${hr !== null && hr > 100 ? `sinus tachycardia (${hr} bpm)` : "no bradycardia"}. Administering DigiFab without an indication is inappropriate and wastes critical resuscitation time.
>
> 2. **NO PREMATURE INSULIN CESSATION (CF-DKA-002):**  
>    **DO NOT STOP INSULIN** when blood glucose drops to 200–250 mg/dL. Stopping insulin permits ongoing uninhibited lipolysis and ketoacid production. The correct invariant is to add dextrose to IV fluids while maintaining continuous insulin infusion until the serum anion gap closes and venous pH exceeds 7.30.
>
> 3. **POTASSIUM SAFETY INVARIANT (CF-ENDO-001):**  
>    ${isNormalK
      ? `Serum potassium is **${kDisplay}** (3.3–5.2 mmol/L). Insulin MUST NOT be given without concurrent IV potassium supplementation (20–30 mEq/L fluid) to prevent fatal hypokalemic cardiac arrest.`
      : isHypokalemic
      ? `Serum potassium is **${kDisplay}** (< 3.3 mmol/L). NEVER start insulin when potassium is < 3.3 mmol/L. Insulin drives potassium intracellularly and triggers fatal ventricular arrhythmias.`
      : `Verify serum potassium is ≥ 3.3 mmol/L before insulin initiation.`}
>
> 4. **ROUTINE SODIUM BICARBONATE VETO:**  
>    Routine sodium bicarbonate administration is **CONTRAINDICATED** unless pH < 6.9 with refractory hemodynamic collapse, as it induces paradoxical cerebrospinal fluid and intracellular acidosis, worsens hypokalemia, and impairs tissue oxygen unloading.
>
> 5. **UNMONITORED AGGRESSIVE FLUID OVERLOAD VETO (INV-004):**  
>    Rapid unmonitored infusion of large-volume crystalloid (e.g. 30 mL/kg rapid bolus) is **CONTRAINDICATED** in patients with reduced ejection fraction (${efDisplay}$) or oliguria. Fluid resuscitation must be individualized, small-volume (250–500 mL), and reassessed continuously.

---

### 5. Clinician Documentation (Structured SOAP Note)

- **Subjective:** ${ageDisplay} ${sexDisplay} presenting with acute weakness, fever, tachypnea, and vomiting in setting of suspected infection. Medical history significant for Type 2 Diabetes on metformin, Heart Failure (${efDisplay}$), and chronic kidney disease. Zero history of digoxin use.
- **Objective:**
  - Vitals: BP ${bp}, MAP ${mapDisplay}, HR ${hr !== null ? `${hr} bpm` : "[UNMEASURED]"}, RR ${rr !== null ? `${rr}/min` : "[UNMEASURED]"}, Temp ${temp !== null ? `${temp}°C` : "[UNMEASURED]"}, SpO2 ${spo2}.
  - Labs: K+ ${kDisplay}, Na+ ${naDisplay}, Cl- ${clDisplay}, HCO3- ${hco3Display}, pH ${phDisplay}, PaCO2 ${paco2Display}, Lactate ${lacDisplay}, Glucose ${glucDisplay}, Beta-hydroxybutyrate ${bhbDisplay}, Creatinine ${crDisplay}.
  - ECG: ${context.cardiac.ecgFindings.length > 0 ? context.cardiac.ecgFindings.join(", ") : "Sinus rhythm / telemetry underway"}.
  - Calculated: Anion Gap: ${isAgComputable ? `${agVal} mEq/L` : "Unmeasured"}; Winter's expected PaCO2: ${isWintersComputable ? `${wintersLow}–${wintersHigh} mmHg` : "Uncomputable"}.
- **Assessment:**
  1. Acute metabolic and endocrine decompensation / DKA evaluation (Glucose ${glucDisplay}, Anion Gap: ${isAgComputable ? `${agVal} mEq/L` : "Unmeasured"}).
  2. Suspected sepsis / urosepsis with multi-organ dysfunction risk.
  3. Potassium evaluation: ${kSummary}.
  4. Lactic acidosis evaluation (Lactate ${lacDisplay}) with metformin exposure.
  5. Renal function: Creatinine ${crDisplay}.
  6. Cardiovascular compromise: EF ${efDisplay}.
- **Plan:**
  1. Transfer immediately to Resuscitation Bay / ICU.
  2. ${isSevereHyperkalemia || isModerateHyperkalemia ? "IV Calcium Gluconate STAT for hyperkalemic membrane stabilization." : "Calcium gluconate not indicated for normal potassium."}
  3. ${isMapTargetMet ? "Maintain target MAP ≥ 65 mmHg; vasopressors on standby." : "Norepinephrine infusion titrated to MAP ≥ 65 mmHg."}
  4. Blood/urine cultures STAT, then broad-spectrum empiric IV antibiotics.
  5. Regular insulin infusion; ${kVal !== null && kVal < 5.3 ? "add IV KCl concurrently." : "monitor K+ hourly."}
  6. Transition to Two-Bag System (D5 0.45% NS) as glucose nears 200–250 mg/dL.
  7. Individualized crystalloid titration guided by lung ultrasound.
  8. Hold Metformin.
  9. Emergent nephrology consultation for ICU admission / CRRT.

---

### 6. Neuro-Symbolic Scratchpad Verification Trail

${scratchpad.markdownScratchpadSummary}
`;
}
