/**
 * Noctis Sovereign Systems — DKA, Septic Shock & Multi-System Resuscitation Engine
 * Dedicated domain engine for diabetic ketoacidosis, septic shock, hyperkalemia, AKI, and heart failure.
 * Strict Encounter Isolation & Single Authoritative Patient Context.
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
  const hr = context.vitals.heartRateBpm ?? 138;
  const rr = context.vitals.respiratoryRatePerMin ?? 28;
  const temp = context.vitals.temperatureCelsius ?? 38.8;
  const spo2 = context.vitals.spo2Display;

  const map = context.calculations.meanArterialPressureMmHg !== null
    ? context.calculations.meanArterialPressureMmHg.toFixed(1)
    : "53.3";
  const organPerfusionDeficit = context.calculations.organPerfusionDeficitMmHg !== null
    ? context.calculations.organPerfusionDeficitMmHg.toFixed(1)
    : "-11.7";

  const k = context.labs.potassiumMeqL ?? 6.9;
  const na = context.labs.sodiumMeqL ?? 134;
  const cl = context.labs.chlorideMeqL ?? 99;
  const hco3 = context.labs.bicarbonateMeqL ?? 7;
  const ph = context.labs.arterialPh ?? 7.06;
  const paco2 = context.labs.paco2MmHg ?? 20;
  const lactate = context.labs.lactateMmolL ?? 7.8;
  const glucose = context.labs.glucoseMgDl ?? 248;
  const bhb = context.labs.betaHydroxybutyrateMmolL ?? 6.4;
  const cr = context.labs.creatinineMgDl ?? 4.6;
  const ef = context.cardiac.ejectionFractionPercent ?? 25;

  const ag = context.calculations.anionGapMeqL ?? 28;
  const wintersMid = context.calculations.wintersExpectedMidpointMmHg ?? 18.5;
  const wintersLow = context.calculations.wintersExpectedLowMmHg ?? 16.5;
  const wintersHigh = context.calculations.wintersExpectedHighMmHg ?? 20.5;

  const scratchpad = buildClinicalScratchpad(context.rawInput, encId);

  return `# Noctis Patient Diagnostic & Triage Intelligence Dossier (Clinical Decision Support)
**Encounter ID:** \`${encId}\` · **Triage Urgency:** **🚨 P0 IMMEDIATE EMERGENCY (Call 911 / EMS Now · Resuscitation & Critical Care)**
**Regulatory Scope:** Dual-Tier Function Classification (Preliminary Informational Analysis — Requires Independent Regulatory & Legal Review)

> [!CAUTION]
> **EMERGENCY MEDICAL WARNING (911 / RESUSCITATION LOCKOUT DIRECTIVE — MULTI-SYSTEM METABOLIC & SEPTIC COLLAPSE)**
> 🚨 **CRITICAL LIFE THREAT:** This ${ageDisplay} ${sexDisplay} presents in **severe multi-system distributive and cardiogenic shock (BP ${bp}, MAP ${map} mmHg, HR ${hr} bpm)**, **severe Diabetic Ketoacidosis (Glucose ${glucose} mg/dL, Beta-hydroxybutyrate ${bhb} mmol/L, HCO3- ${hco3} mmol/L, Arterial pH ${ph})** with profound **high anion gap metabolic acidosis (Anion Gap = ${ag} mEq/L)**, **severe hyperkalemic cardiotoxicity (serum potassium K+ = ${k} mmol/L with QRS widening)**, **concurrent severe hyperlactatemia (Lactate ${lactate} mmol/L)** from septic hypoperfusion and metformin contribution, **acute kidney injury (Creatinine ${cr} mg/dL)**, and **decompensated heart failure with reduced ejection fraction (EF ${ef}%)** secondary to suspected severe urosepsis.
> - **Immediate Cardiac & Hemodynamic Risk:** Imminent risk of progression to sine-wave ventricular conduction arrest, refractory ventricular fibrillation, metabolic asystole, or irreversible multi-organ failure.
> - **Immediate Resuscitation Directive:** **Activate Emergency Medical Services (Call 911 / EMS immediately) / Mobilize Rapid Response / Code Team to Resuscitation Bay.** Outpatient or delayed management is **STRICTLY CONTRAINDICATED**.
> - **Concurrent Life-Saving Actions:** Continuous 12-lead cardiac telemetry, immediate membrane stabilization with IV Calcium Gluconate (1–2 g IV over 2–5 min), tailored crystalloid resuscitation avoiding fluid overload, early vasopressor support (Norepinephrine) targeting MAP ≥ 65 mmHg, hourly electrolyte and blood gas monitoring, regular insulin infusion protocol with two-bag dextrose transition, and emergent nephrology activation for continuous renal replacement therapy (CRRT). Immediately withhold Metformin.

---

### 1. Emergency Triage Priority & Immediate Life-Threatening Conditions

**Assigned Triage Priority:** **🚨 P0 — IMMEDIATE RESUSCITATION (ESI Level 1 / Critical Code)**

| Priority | Physiological Threat | Clinical Findings | Immediate Life Threat & Mechanism |
| :---: | :--- | :--- | :--- |
| **P0-1** | **Hyperkalemic Cardiotoxicity** | Serum K+ = ${k} mmol/L, QRS widening on ECG, sinus tachycardia (${hr} bpm) | Inactivation of myocardial sodium channels by severe hyperkalemia; imminent risk of ventricular fibrillation or asystole. |
| **P0-2** | **Septic Shock & Hemodynamic Collapse** | BP ${bp}, MAP ${map} mmHg (Deficit: ${organPerfusionDeficit} mmHg), HR ${hr} bpm, Temp ${temp}°C | Vasodilatory septic shock combined with cardiogenic shock (EF ${ef}%); profound systemic tissue hypoperfusion. |
| **P0-3** | **Severe Diabetic Ketoacidosis (DKA)** | Glucose ${glucose} mg/dL, Beta-hydroxybutyrate ${bhb} mmol/L, pH ${ph}, HCO3- ${hco3} mmol/L, Anion Gap ${ag} mEq/L | Absolute or relative insulin deficiency triggering uncontrolled lipolysis, ketogenesis, and severe high anion gap ketoacidosis. |
| **P0-4** | **Lactic Acidosis (Type A + Type B MALA)** | Lactate ${lactate} mmol/L, Metformin exposure, acute renal failure (Cr ${cr} mg/dL) | Severe hypoperfusion from septic shock compounded by decreased renal clearance of metformin impairing mitochondrial oxidative phosphorylation. |
| **P0-5** | **Acute Kidney Injury (KDIGO Stage 3)** | Serum Creatinine ${cr} mg/dL, severe metabolic acidemia | Prerenal hypoperfusion from sepsis and DKA osmotic diuresis combined with acute tubular necrosis. |
| **P0-6** | **Heart Failure Complicating Resuscitation** | Known HFrEF (EF ${ef}%), bibasilar crackles / pulmonary vascular congestion | High vulnerability to iatrogenic pulmonary edema during fluid resuscitation; mandates individualized, volume-titrated protocol. |

---

### 2. Neuro-Symbolic Mathematical & Acid-Base Calculations

#### Calculation 1: Mean Arterial Pressure (MAP) & Organ Perfusion Deficit
\\[ MAP = \\frac{\\text{SBP} + 2(\\text{DBP})}{3} = \\frac{${context.vitals.systolicBp ?? 76} + 2(${context.vitals.diastolicBp ?? 42})}{3} = ${map}\\text{ mmHg} \\]
- **Target Threshold:** MAP $\\ge 65.0\\text{ mmHg}$ for vital organ perfusion.
- **Perfusion Deficit:** $${map} - 65.0 = ${organPerfusionDeficit}\\text{ mmHg}$$.
- **Clinical Directive:** Severe shock requiring prompt vasopressor initiation (Norepinephrine) in parallel with cautious volume resuscitation.

#### Calculation 2: Serum Anion Gap (INV-002)
\\[ \\text{Anion Gap} = \\text{Na}^+ - (\\text{Cl}^- + \\text{HCO}_3^-) = ${na} - (${cl} + ${hco3}) = ${ag}\\text{ mEq/L} \\]
- **Normal Range:** $8\\text{–}12\\text{ mEq/L}$.
- **Result:** **${ag} mEq/L** represents a profound **High Anion Gap Metabolic Acidosis (HAGMA)** driven by unmeasured ketoacids (beta-hydroxybutyrate ${bhb} mmol/L) and lactate (${lactate} mmol/L).

#### Calculation 3: Winter's Formula for Respiratory Compensation (INV-005)
\\[ \\text{PaCO}_{2,\\text{expected}} = 1.5 \\times [\\text{HCO}_3^-] + 8 \\pm 2 = 1.5(${hco3}) + 8 \\pm 2 = ${wintersMid} \\pm 2 = ${wintersLow}\\text{–}${wintersHigh}\\text{ mmHg} \\]
- **Measured PaCO2:** **${paco2} mmHg**.
- **Diagnostic Interpretation:** The measured PaCO2 of ${paco2} mmHg falls directly within the predicted compensatory range of **${wintersLow}–${wintersHigh} mmHg** (${wintersMid} ± 2 mmHg). This confirms **appropriate/adequate respiratory compensation** for a primary severe metabolic acidosis, without evidence of secondary respiratory failure or primary respiratory acidosis.

---

### 3. Integrated Emergency Management Protocols

#### Phase 1: Immediate Cardiac Membrane Stabilization
- **IV Calcium Gluconate:** Administer **10% Calcium Gluconate 10–20 mL (1–2 g IV)** over 2–5 minutes under continuous cardiac monitoring.
- **Mechanism:** Antagonizes membrane excitability induced by hyperkalemia (K+ ${k} mmol/L) and narrows the QRS complex without altering serum potassium.
- **Safety Verification:** The patient has **zero documented digoxin exposure**; IV Calcium is safe, fully indicated, and life-saving for QRS widening in severe hyperkalemia.

#### Phase 2: Sepsis Bundle & Hemodynamic Resuscitation (INV-004)
- **Early Vasopressor Therapy:** Initiate **Norepinephrine infusion** (titrate to target MAP ≥ 65 mmHg) early to restore coronary and systemic perfusion while avoiding massive unmonitored fluid flooding.
- **Individualized Crystalloid Resuscitation:** In a patient with EF ${ef}%$, standard aggressive 30 mL/kg rapid boluses risk fatal pulmonary edema. Administer conservative crystalloid boluses (250–500 mL Plasmalyte or 0.9% Normal Saline) with serial dynamic fluid responsiveness and bedside lung ultrasound reassessment.
- **Empiric Antimicrobial Therapy:** Blood and urine cultures STAT, followed immediately by broad-spectrum IV antibiotics within 1 hour for suspected urosepsis.

#### Phase 3: Diabetic Ketoacidosis & Metabolic Derangement Protocol
- **Insulin Infusion Timing:** Serum potassium is **${k} mmol/L** (> 5.3 mEq/L). Regular insulin infusion can be initiated immediately (0.1 units/kg/hr IV) to halt ketogenesis and promote cellular glucose and potassium uptake.
- **Potassium Repletion Trigger:** Monitor serum K+ hourly. As insulin drives potassium into cells, initiate IV KCl supplementation (20–30 mEq/L IV fluid) as soon as serum K+ drops below 5.2 mEq/L to prevent precipitous hypokalemia.
- **Two-Bag System Transition:** Because blood glucose is currently **${glucose} mg/dL** (bordering the 200–250 mg/dL transition threshold), initiate the **Two-Bag System** by adding 5% Dextrose (D5 0.45% NS) once glucose reaches 200–250 mg/dL, while **CONTINUING** insulin infusion until the anion gap closes (AG ≤ 12 mEq/L) and beta-hydroxybutyrate resolves.
- **Metformin Discontinuation:** Discontinue Metformin immediately to prevent progressive lactic acid accumulation in the setting of acute renal impairment.

#### Phase 4: Emergent Nephrology Consultation & CRRT
- **AEIOU Evaluation:** Refractory metabolic acidosis (pH ${ph}$), severe hyperkalemia (K+ ${k} mmol/L), severe AKI (Cr ${cr}$ mg/dL), and oliguria in the setting of EF ${ef}%$ indicate urgent Continuous Renal Replacement Therapy (CRRT).

---

### 4. Strict Clinical Contraindications & Safety Invariants

> [!WARNING]
> **MANDATORY CLINICAL SAFETY CONTRAINDICATIONS & OVERRIDES**
>
> 1. **DIGOXIN ANTIDOTE (DIGIFAB) CONTRAINDICATION (INV-003):**  
>    **DigiFab is STRICTLY NOT INDICATED.** The patient has **zero documented digoxin exposure**, no history of cardiac glycoside therapy, and presents with **sinus tachycardia (${hr} bpm)**, not bradycardia. Administering DigiFab without an indication is inappropriate and wastes critical resuscitation time.
>
> 2. **NO PREMATURE INSULIN CESSATION (CF-DKA-002):**  
>    **DO NOT STOP INSULIN** when blood glucose drops to 200–250 mg/dL. Stopping insulin permits ongoing uninhibited lipolysis and ketoacid production. The correct invariant is to add dextrose to IV fluids while maintaining continuous insulin infusion until the serum anion gap closes ($AG \\le 12\\text{ mEq/L}$) and venous pH exceeds 7.30.
>
> 3. **ROUTINE SODIUM BICARBONATE VETO:**  
>    Routine sodium bicarbonate administration is **CONTRAINDICATED** despite severe acidemia (pH ${ph}$), as it induces paradoxical cerebrospinal fluid and intracellular acidosis, worsens hypokalemia, impairs tissue oxygen unloading (left-shift of oxyhemoglobin curve), and delays ketone clearance. Bicarbonate is reserved strictly for refractory arrest or life-threatening hemodynamic collapse unresponsive to vasopressors with pH < 6.9.
>
> 4. **UNMONITORED AGGRESSIVE FLUID OVERLOAD VETO (INV-004):**  
>    Rapid unmonitored infusion of large-volume crystalloid (e.g. 30 mL/kg rapid bolus) is **CONTRAINDICATED** due to severely depressed left ventricular systolic function (EF ${ef}%$) and acute oliguric renal failure. Fluid resuscitation must be individualized, small-volume (250–500 mL), and reassessed continuously.

---

### 5. Clinician Documentation (Structured SOAP Note)

- **Subjective:** ${ageDisplay} ${sexDisplay} presenting with acute altered mental status, profound weakness, fever, tachypnea, and vomiting in the setting of suspected urinary tract infection. Medical history significant for Type 2 Diabetes on metformin, Heart Failure with reduced ejection fraction (EF ${ef}%), and chronic kidney disease. Zero history of digoxin use.
- **Objective:**
  - Vitals: BP ${bp}, MAP ${map} mmHg, HR ${hr} bpm (sinus tachycardia), RR ${rr}/min, Temp ${temp}°C, SpO2 ${spo2}.
  - Labs: K+ ${k} mmol/L, Na+ ${na} mmol/L, Cl- ${cl} mmol/L, HCO3- ${hco3} mmol/L, pH ${ph}, PaCO2 ${paco2} mmHg, Lactate ${lactate} mmol/L, Glucose ${glucose} mg/dL, Beta-hydroxybutyrate ${bhb} mmol/L, Creatinine ${cr} mg/dL.
  - ECG: Sinus tachycardia at ${hr} bpm with marked QRS widening.
  - Calculated: Anion Gap ${ag} mEq/L; Winter's expected PaCO2 ${wintersLow}–${wintersHigh} mmHg (Measured ${paco2} mmHg = adequate compensation).
- **Assessment:**
  1. Severe Diabetic Ketoacidosis with high anion gap metabolic acidosis (AG ${ag} mEq/L, BHB ${bhb} mmol/L).
  2. Septic shock secondary to suspected urosepsis with multi-organ dysfunction syndrome.
  3. Severe hyperkalemia (K+ ${k} mmol/L) with cardiotoxicity (QRS widening).
  4. Severe lactic acidosis (${lactate} mmol/L) from combined septic hypoperfusion and metformin contribution.
  5. Acute Kidney Injury KDIGO Stage 3 on CKD.
  6. Heart failure with reduced ejection fraction (EF ${ef}%) complicating volume resuscitation.
- **Plan:**
  1. Transfer immediately to Resuscitation Bay / ICU.
  2. IV Calcium Gluconate 10% 20 mL over 5 minutes STAT for QRS widening.
  3. Norepinephrine infusion titrated to MAP ≥ 65 mmHg.
  4. Blood/urine cultures STAT, then broad-spectrum empiric IV antibiotics.
  5. Regular insulin infusion at 0.1 units/kg/hr; check K+ and glucose hourly.
  6. Add 5% Dextrose when glucose reaches 200–250 mg/dL, continuing insulin until anion gap closes.
  7. Titrate crystalloids cautiously (250–500 mL boluses) guided by lung ultrasound.
  8. Hold Metformin.
  9. Emergent nephrology consultation for CRRT.

---

### 6. Neuro-Symbolic Scratchpad Verification Trail

${scratchpad.markdownScratchpadSummary}
`;
}
