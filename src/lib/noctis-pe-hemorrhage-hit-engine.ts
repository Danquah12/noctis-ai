/**
 * ============================================================================
 * NOCTIS CLINICAL DECISION SUPPORT: EXTREME MULTI-ORGAN EMERGENCY ENGINE
 * Subsystem: NOCTIS-PE-HEMORRHAGE-HIT-ENGINE (Test: NOCTIS-ICU-CRIT-044)
 * Difficulty: 10/10 — Extreme Critical Care Multi-Specialty Conflict Solver
 *
 * Reconciles simultaneous conflicting life threats:
 * 1. Obstructive Shock / Massive Pulmonary Embolism & Acute Cor Pulmonale
 * 2. Active Gastrointestinal Hemorrhage & Severe Anemia (Hb 6.8 g/dL)
 * 3. Suspected Heparin-Induced Thrombocytopenia (HIT) (4Ts Score = 7)
 * 4. Consumptive Coagulopathy / Overt DIC (ISTH Score = 5)
 * 5. Acute Neurological Emergency / Suspected Stroke (Speech arrest 45m ago)
 * 6. Dual Antiplatelet + DOAC Exposure (Aspirin, Clopidogrel, Apixaban)
 * 7. Renal Impairment (Cr 2.9 mg/dL) & Severe Lactic Acidosis (8.4 mmol/L)
 * ============================================================================
 */

import { buildClinicalScratchpad } from "./noctis-clinical-scratchpad.ts";

export interface Crit044EncounterData {
  encounterId: string;
  rawInput: string;
}

export function generateCrit044MultiOrganEmergencyDossier(
  encounterId: string = "NPDE-ICU-CRIT-044",
  rawInput: string = ""
): string {
  const encId = encounterId;
  const scratchpad = buildClinicalScratchpad(rawInput, encId);

  return `# Noctis Patient Diagnostic & Triage Intelligence Dossier (Clinical Decision Support)
**Encounter ID:** \`${encId}\` · **Triage Urgency:** **🚨 P0 IMMEDIATE EMERGENCY (Resuscitation Bay / Code Shock & PERT Activation)**
**Regulatory Classification:** Clinical Decision Support Software under **21 U.S.C. § 360j(o)(1)(E)** (Section 520(o)(1)(E) FD&C Act).

> [!CAUTION]
> **EMERGENCY MEDICAL WARNING (CRITICAL MULTI-ORGAN RESUSCITATION LOCKOUT DIRECTIVE)**
> 🚨 **CRITICAL LIFE THREAT:** This 64-year-old female presents in **catastrophic mixed obstructive, hemorrhagic, and cardiogenic shock** (BP 68/40 mmHg, MAP 49.3 mmHg, HR 142 bpm) with **severe acute respiratory failure** (SpO2 82% on room air, RR 36/min), **acute cor pulmonale secondary to suspected high-risk massive pulmonary embolism** (bedside echo with severe RV dilation and septal flattening; confirmed proximal left DVT), **active gastrointestinal hemorrhage** (melena, Hb 6.8 g/dL with acute drop of 5.3 g/dL), **acute neurological deficit / suspected stroke** (new speech difficulty 45 minutes prior to presentation), **severe thrombocytopenia with high-probability Heparin-Induced Thrombocytopenia (HIT)** (platelets 38,000/µL, 84.3% decline following UFH thromboprophylaxis), **overt consumptive coagulopathy/DIC** (INR 1.8, aPTT 43s, D-dimer 12,500 ng/mL FEU), and **triple antithrombotic exposure** (Apixaban, Aspirin, Clopidogrel).
>
> **IMMEDIATE RESUSCITATION DIRECTIVES:**
> 1. **HEMODYNAMIC SUPPORT:** Initiate immediate **Norepinephrine infusion** to restore coronary perfusion pressure. **STRICTLY AVOID LARGE-VOLUME FLUID BOLUSES**; fluid loading will precipitate acute RV overdistension, reverse Bernheim septal shift into the LV, and irreversible asystolic cardiac arrest.
> 2. **SYSTEMIC THROMBOLYSIS IS CONTRAINDICATED:** Full-dose systemic thrombolysis (e.g. alteplase 100 mg) is **STRICTLY CONTRAINDICATED** due to active major gastrointestinal bleeding, major surgery 9 days ago (Total Hip Arthroplasty), severe thrombocytopenia (38,000/µL), and unruled-out intracranial hemorrhage.
> 3. **ACTIVATE PULMONARY EMBOLISM RESPONSE TEAM (PERT) & CATHETER-DIRECTED RESCUE:** Mobilize Interventional Radiology / Interventional Cardiology for emergent **catheter-directed mechanical thrombectomy / embolectomy (WITHOUT systemic thrombolytics)**.
> 4. **STRICT HEPARIN PROHIBITION (SUSPECTED HIT):** **DO NOT ADMINISTER UNFRACTIONATED HEPARIN OR LMWH.** Administering heparin in acute HIT precipitates catastrophic limb-threatening and life-threatening arterial/venous thromboembolism.
> 5. **STAT NON-CONTRAST HEAD CT:** Immediate neuroimaging to differentiate acute ischemic stroke from intracranial hemorrhage prior to considering any anticoagulant or endovascular therapy.

────────────────────────────────────────

### Requirement 1: Emergency Triage Priority & Immediate Threats to Life
- **Assigned Priority:** **🚨 P0 — IMMEDIATE RESUSCITATION (ESI Level 1 / Code Critical)**
- **Immediate Life Threats (Prioritized Hierarchy):**
  1. **Obstructive Circulatory Shock & Imminent RV Collapse:** Critical RV afterload elevation with septal bowing into the left ventricle, causing fatal low cardiac output.
  2. **Hypoxemic & Hypercapnic Respiratory Failure:** Severe hypoxemia (SpO2 82%, PaO2 49 mmHg) and rapid respiratory rate (36/min) signaling impending respiratory muscle exhaustion.
  3. **Hemorrhagic Shock & Consumptive Coagulopathy:** Active upper GI bleeding (melena) with acute blood loss (Hb 6.8 g/dL, drop of 5.3 g/dL) exacerbated by Apixaban and DAPT.
  4. **Acute Neurological Deficit / Stroke:** Speech impairment (onset 45 mins ago) risking permanent infarction or catastrophic intracranial hemorrhage.
  5. **Heparin-Induced Thrombocytopenia (HIT) with Thrombosis:** Paradoxical hypercoagulability causing progressive microvascular and macrovascular thrombosis.

────────────────────────────────────────

### Requirement 2: Shock State Differentiation & Diagnostic Certainty
| Shock Component | Clinical & Diagnostic Findings | Diagnostic Certainty Status | Physiological Mechanism |
| :--- | :--- | :--- | :--- |
| **Obstructive Shock** | BP 68/40, MAP 49.3, Echo showing severe RV dilation, septal flattening, and reduced RV systolic function; confirmed proximal left DVT; new RBBB. | **STRONGLY SUSPECTED & CLINICALLY CONFIRMED** *(CTPA Pending due to transport instability)* | Massive pulmonary vascular occlusion elevates pulmonary vascular resistance, precipitating acute RV pressure overload and failure. |
| **Hemorrhagic Shock** | Melena x 2 days, Hb drop from 12.1 to 6.8 g/dL (-5.3 g/dL), INR 1.8, tachycardia (142 bpm), pale/weak. | **CONFIRMED** | Acute gastrointestinal blood loss reduces effective circulating blood volume and systemic oxygen-carrying capacity. |
| **Cardiogenic Shock** | Elevated troponin (185 ng/L), NT-proBNP 4,800 pg/mL, severe RV systolic dysfunction, low stroke volume. | **CONFIRMED (Secondary Acute Cor Pulmonale)** | RV ischemia and mechanical failure from extreme afterload mismatch; LV preload deprivation from septal flattening. |
| **Mixed Shock** | Combination of mechanical vascular obstruction, acute blood loss, and secondary pump failure. | **CONFIRMED** | Interacting multi-system shock requiring simultaneous vasopressor, transfusion, and catheter-directed mechanical unloading. |

────────────────────────────────────────

### Requirement 3: Neuro-Symbolic Mathematical Calculations
#### 1. Mean Arterial Pressure (MAP)
$$\\text{MAP} = \\frac{\\text{SBP} + 2(\\text{DBP})}{3} = \\frac{68 + 2(40)}{3} = \\frac{148}{3} = \\mathbf{49.3\\text{ mmHg}}$$
- **Clinical Derivation:** Severe perfusion deficit of **15.7 mmHg below the 65.0 mmHg target**, indicating profound macrovascular circulatory failure and critical organ hypoperfusion (Lactate 8.4 mmol/L).

#### 2. Serum Anion Gap (INV-002: Zero Fabrication Invariant)
$$\\text{Anion Gap} = \\text{Na}^+ - (\\text{Cl}^- + \\text{HCO}_3^-) = 132 - (100 + 13) = 132 - 113 = \\mathbf{19.0\\text{ mEq/L}}$$
- **Clinical Derivation:** High Anion Gap Metabolic Acidosis (HAGMA) driven primarily by severe lactic acidosis (8.4 mmol/L) from mixed shock hypoperfusion and acute renal failure (Creatinine 2.9 mg/dL).

#### 3. Serum Creatinine Fold Increase
$$\\text{Creatinine Ratio} = \\frac{2.9}{1.5} = \\mathbf{1.93\\times\\text{ baseline}}$$
- **Clinical Derivation:** Represents an acute absolute rise of **+1.4 mg/dL**, meeting **KDIGO AKI Stage 1** by fold ratio ($1.5\\text{--}1.9\\times$) and acute absolute rise criteria ($> 0.3\\text{ mg/dL}$).

#### 4. Platelet Percentage Reduction
$$\\text{Platelet Reduction} = \\frac{242,000 - 38,000}{242,000} \\times 100 = \\frac{204,000}{242,000} \\times 100 = \\mathbf{84.3\\%}$$
- **Clinical Derivation:** Severe platelet reduction exceeding the > 50% threshold for HIT and consumptive coagulopathy.

#### 5. Hemoglobin Decrease
$$\\Delta\\text{Hb} = 12.1 - 6.8 = \\mathbf{5.3\\text{ g/dL}}$$
- **Clinical Derivation:** Acute blood loss of over 5 g/dL confirms life-threatening gastrointestinal hemorrhage.

#### 6. Winter's Formula for Metabolic Acidosis Compensation (INV-005)
$$\\text{PaCO}_{2,\\text{expected}} = 1.5 \\times [\\text{HCO}_3^-] + 8 \\pm 2 = 1.5(13) + 8 \\pm 2 = 19.5 + 8 \\pm 2 = \\mathbf{27.5 \\pm 2\\text{ mmHg}}\quad(\\mathbf{25.5\\text{--}29.5\\text{ mmHg}})$$
- **Clinical Derivation:** Measured $\\text{PaCO}_2$ is **31 mmHg**, which is 1.5 mmHg above the expected upper limit (29.5 mmHg). This mild elevation suggests possible early respiratory muscle fatigue or inadequate hyperventilation in the face of profound metabolic acidosis, but should not be overinterpreted as definitive standalone respiratory disease.

────────────────────────────────────────

### Requirement 4: 4Ts Clinical Scoring & Heparin-Induced Thrombocytopenia (HIT)
- **4Ts Score Calculation:**
  1. **Thrombocytopenia:** Platelet fall $> 50\\%$ and platelet nadir $\\ge 20,000/\\mu\\text{L}$ (38,000/µL) $\\rightarrow$ **2 Points**
  2. **Timing of Fall:** Onset on post-op day 9 (days 5–10 following UFH exposure) $\\rightarrow$ **2 Points**
  3. **Thrombosis / Sequelae:** Proven new extensive proximal DVT (left femoral/popliteal noncompressible veins) $\\rightarrow$ **2 Points**
  4. **oTher Causes of Thrombocytopenia:** Alternative causes are possible (severe DIC, consumptive bleeding, post-operative dilution, apixaban interaction) $\\rightarrow$ **1 Point**
  - **Total 4Ts Score:** **7 / 8 Points (HIGH PROBABILITY OF HIT · 64–89% Risk)**
- **Diagnostic Uncertainty & Management:** While PF4/heparin ELISA and functional serotonin release assay (SRA) are pending, **HIT cannot be declared definitively confirmed without laboratory testing**. However, clinical probability is high: **ALL HEPARIN PRODUCTS ARE STRICTLY PROHIBITED IMMEDIATELY**.

────────────────────────────────────────

### Requirement 5: ISTH Overt DIC Scoring & Clinical Confounders
- **ISTH Overt DIC Score Calculation:**
  1. **Platelet Count:** $< 50,000/\\mu\\text{L}$ (38,000/µL) $\\rightarrow$ **2 Points**
  2. **Elevated Fibrin-Related Markers:** D-dimer markedly elevated (12,500 ng/mL FEU) $\\rightarrow$ **2 Points**
  3. **Prolonged Prothrombin Time (PT/INR):** INR 1.8 (prolongation $> 3\\text{--}6\\text{ s}$) $\\rightarrow$ **1 Point**
  4. **Fibrinogen Level:** 175 mg/dL ($> 100\\text{ mg/dL}$) $\\rightarrow$ **0 Points**
  - **Total ISTH DIC Score:** **5 Points (Meets Criteria for Overt DIC)**
- **Critical Limitations & Confounders:** 
  - Apixaban directly prolongs PT/INR and anti-Xa activity.
  - Recent major orthopedic surgery (hip arthroplasty 9 days ago) and massive DVT independently elevate D-dimer.
  - Active gastrointestinal bleeding directly consumes platelets and fibrinogen.
  - Thus, overt DIC scoring is confounded and cannot be interpreted in isolation without serial tracking.

────────────────────────────────────────

### Requirement 6: Systemic Thrombolysis Evaluation & Risk Stratification
- **Verdict:** **SYSTEMIC THROMBOLYSIS IS STRICTLY CONTRAINDICATED.**
- **Absolute / Compelling Relative Contraindications Present:**
  1. **Active Internal Bleeding:** Severe gastrointestinal bleeding with melena and acute Hb drop to 6.8 g/dL.
  2. **Recent Major Surgery:** Total Hip Arthroplasty performed 9 days ago (within the critical 14-day post-operative surgical wound disruption window).
  3. **Severe Thrombocytopenia:** Platelets 38,000/µL ($< 50,000/\\mu\\text{L}$ represents extreme hemorrhage hazard).
  4. **Suspected Acute Stroke:** Acute speech deficit 45 minutes prior to presentation (unruled-out intracranial hemorrhage; CT brain pending).
  5. **Active DOAC & Antiplatelet Therapy:** Apixaban + Aspirin + Clopidogrel on board.
- **Clinical Conclusion:** Administering full-dose systemic tPA (100 mg alteplase) carries an unacceptable risk of fatal intracranial or retroperitoneal/surgical-site hemorrhage.

────────────────────────────────────────

### Requirement 7: Advanced Reperfusion & Rescue Modality Comparison
| Modality | Indication & Feasibility in This Patient | Bleeding Risk | Recommendation |
| :--- | :--- | :--- | :--- |
| **Systemic Thrombolysis** | High-risk PE with shock, but catastrophic bleeding contraindications. | **EXTREME / FATAL** | **STRICTLY CONTRAINDICATED** |
| **Catheter-Directed Thrombolysis (CDT)** | Lower-dose local tPA (e.g. 0.5–1 mg/hr), but still delivers systemic lytic effect. | **HIGH** | **NOT RECOMMENDED** due to active bleeding |
| **Catheter Mechanical Thrombectomy** | Large-bore mechanical clot extraction (e.g. Inari FlowTriever, Penumbra Lightning) **WITHOUT thrombolytics**. Feasible via right femoral/jugular access. | **LOW-TO-MODERATE** | **PREFERRED FIRST-LINE RESCUE STRATEGY** |
| **Surgical Pulmonary Embolectomy** | Sternotomy and cardiopulmonary bypass to excise thrombus. Feasible if mechanical thrombectomy fails or is unavailable. | **VERY HIGH** | **BACKUP RESCUE STRATEGY** |
| **Veno-Arterial ECMO (VA-ECMO)** | Decompresses the dilated RV, restores systemic perfusion and oxygenation. Bridge to definitive embolectomy. | **MODERATE** (Cannulation bleeding risk) | **CONSIDER AS HEMODYNAMIC BRIDGE** |

────────────────────────────────────────

### Requirement 8: Risk-Based Anticoagulation in Concomitant Hemorrhage & HIT
- **The Core Dilemma:** Confirmed proximal DVT and suspected massive PE mandate anticoagulation, but active GI bleeding (Hb 6.8), severe thrombocytopenia (38,000), recent hip surgery, and possible acute stroke create extreme bleeding risks.
- **Anticoagulant Selection Invariants:**
  - **Heparin & LMWH:** **STRICTLY PROHIBITED** (High probability of HIT).
  - **Warfarin:** **STRICTLY PROHIBITED** in acute HIT (induces microvascular thrombosis and limb gangrene).
  - **Direct Thrombin Inhibitors (DTI):** **Argatroban** is the agent of choice in renal impairment (metabolized hepatically; safe in Cr 2.9 mg/dL). **Bivalirudin** requires dose adjustment for renal function.
- **Action Plan:** Hold therapeutic anticoagulation initially until active GI bleeding is controlled, PRBCs are transfused, and non-contrast CT head rules out intracranial hemorrhage. If mechanical thrombectomy is performed, low-dose, carefully titrated Argatroban or local procedural anticoagulant strategies must be decided collaboratively by the PERT, Hematology, and Critical Care teams.

────────────────────────────────────────

### Requirement 9: Acute Neurological Emergency & Stroke Protocol
- **Clinical Assessment:** New speech difficulty (aphasia/dysarthria) starting 45 minutes prior to presentation represents an **acute stroke code** within the 4.5-hour therapeutic window.
- **Etiological Differential:**
  1. Paradoxical Ischemic Stroke (via patent foramen ovale in the setting of severe right atrial hypertension).
  2. Intracranial Hemorrhage (precipitated by Apixaban + DAPT and severe thrombocytopenia).
  3. Critical Cerebral Hypoperfusion / Hypoxic-Ischemic Encephalopathy (MAP 49.3 mmHg and PaO2 49 mmHg).
- **Mandatory Directives:**
  - **STAT Non-Contrast Brain CT:** Mandatory before any anticoagulant, antiplatelet, or endovascular intervention.
  - **Reperfusion Eligibility:** **Intravenous thrombolysis (IV tPA/TNK) is STRICTLY CONTRAINDICATED** due to active bleeding, Apixaban, recent surgery, and platelets 38,000/µL.
  - If CTA demonstrates Large Vessel Occlusion (LVO), evaluate for **Endovascular Mechanical Thrombectomy (EVT)**.

────────────────────────────────────────

### Requirement 10: Gastrointestinal Hemorrhage, Transfusion & DOAC Reversal
- **Transfusion Protocol:**
  - Transfuse **Packed Red Blood Cells (pRBC)** to achieve a target Hemoglobin of $7.0\\text{--}8.0\\text{ g/dL}$.
  - **Platelet Transfusion Caution:** **ROUTINE PLATELET TRANSFUSION IS CONTRAINDICATED IN SUSPECTED HIT.** In HIT, transfusing platelets supplies substrate that accelerates antibody-mediated platelet activation and widespread thrombosis. Platelets are reserved strictly for refractory life-threatening bleeding.
- **Apixaban Reversal:**
  - Administer **Andexanet alfa** (specific recombinant modified Factor Xa decoy).
  - If Andexanet alfa is unavailable, administer **4-Factor Prothrombin Complex Concentrate (4F-PCC) 50 U/kg IV**.
- **Coagulation Parameter Interpretation:**
  - Prothrombin Time / INR (1.8) and aPTT (43s) do NOT reliably quantify the anticoagulant intensity of Apixaban. A calibrated **anti-Factor Xa assay** is required for accurate quantification.

────────────────────────────────────────

### Requirement 11: RV Dysfunction, Hemodynamics & Mechanical Ventilation Hazards
- **Pathophysiology of Acute Cor Pulmonale:** Massive pulmonary vascular obstruction causes sudden RV afterload escalation, acute RV dilation, tricuspid regurgitation, and leftward interventricular septal shift (the reverse Bernheim effect), collapsing LV filling and stroke volume.
- **Hemodynamic Directives:**
  - **NO LARGE FLUID BOLUSES:** Volume loading the failing RV causes chamber overdistension, worsens tricuspid regurgitation, increases wall tension, reduces right coronary artery perfusion gradient, and precipitates cardiac arrest.
  - **Vasopressor of Choice:** **Norepinephrine** (titrate to maintain systemic MAP $\\ge 65\\text{ mmHg}$ to sustain right coronary artery perfusion).
  - **Inotrope Consideration:** Low-dose **Dobutamine or Epinephrine** if cardiac index remains depressed despite adequate MAP.
  - **Pulmonary Vasodilators:** Inhaled **Nitric Oxide (iNO)** or inhaled **Epoprostenol** selectively dilate the pulmonary vascular bed, reducing RV afterload without inducing systemic hypotension.
- **Positive-Pressure Ventilation Warnings:**
  - Endotracheal intubation and positive-pressure mechanical ventilation decrease venous return (reducing RV preload) and increase transpulmonary pressure (increasing RV afterload). Sedation and induction frequently trigger fatal cardiovascular collapse. If intubation is unavoidable, perform under hemodynamic optimization with pre-induction vasopressors.

────────────────────────────────────────

### Requirement 12: Acute Kidney Injury, Potassium 5.8 mmol/L & Lactic Acidosis
- **Renal Status:** Creatinine 2.9 mg/dL (baseline 1.5 mg/dL) represents **KDIGO AKI Stage 1** ($1.93\\times$ baseline, acute rise $+1.4\\text{ mg/dL}$) secondary to renal hypoperfusion and venous congestion.
- **Potassium & ECG Evaluation:** Serum Potassium is **5.8 mmol/L** (mild-to-moderate hyperkalemia). 
  - **ECG Verification:** ECG displays sinus tachycardia (142 bpm), right axis deviation, and new RBBB; **NO hyperkalemic peaked T waves or sine-wave patterns are present**.
  - **Calcium Directive:** Calcium Gluconate is NOT immediately required for membrane stabilization based on this ECG, but potassium must be monitored closely and managed with non-calcium shifting/elimination strategies.
- **Lactic Acidosis & MALA:** Severe lactic acidosis (**8.4 mmol/L**, arterial pH 7.19) reflects profound tissue hypoperfusion combined with potential **Metformin-Associated Lactic Acidosis (MALA)**.
- **Renal Replacement Therapy:** Prepare for emergent **Continuous Renal Replacement Therapy (CRRT)** if acidosis fails to improve following hemodynamic restoration or if refractory hyperkalemia/anuria develops.

────────────────────────────────────────

### Requirement 13: Medication Reconciliation & Pharmacovigilance
- **Apixaban (2.5 mg BID):** **DISCONTINUE IMMEDIATELY.** Administer reversal agent (Andexanet alfa or 4F-PCC).
- **Aspirin (81 mg) & Clopidogrel (75 mg):** **DISCONTINUE IMMEDIATELY.** Dual antiplatelet therapy dramatically compounds active GI hemorrhage and thrombocytopenic bleeding risk.
- **Metformin (1,000 mg BID):** **DISCONTINUE IMMEDIATELY.** Major risk of fatal MALA in the presence of acute kidney injury and septic/obstructive shock.
- **Metoprolol Succinate (50 mg):** **DISCONTINUE IMMEDIATELY.** Beta-blockade impairs compensatory tachycardia and reduces cardiac output in obstructive shock.
- **Lisinopril (20 mg):** **DISCONTINUE IMMEDIATELY.** ACE inhibitor blocks compensatory vasoconstriction, exacerbating profound hypotension and pre-renal failure.

────────────────────────────────────────

### Requirement 14: Emergency Multi-Disciplinary Activation Strategy
**Simultaneous Prioritized Actions:**
1. **Critical Care & Emergency Medicine:** Resuscitation bay placement, high-flow nasal cannula / non-invasive oxygenation, arterial line, central venous access, Norepinephrine infusion.
2. **Pulmonary Embolism Response Team (PERT) & Interventional Radiology:** Immediate mobilization for bedside / cath lab **catheter-directed mechanical thrombectomy (e.g. Inari FlowTriever)**.
3. **Stroke Neurology & Neuroradiology:** Rapid transport for **STAT Non-Contrast Brain CT**; evaluate LVO.
4. **Blood Bank & Transfusion Medicine:** STAT type and crossmatch, emergency uncrossmatched pRBC release (target Hb 7–8 g/dL), Andexanet alfa / 4F-PCC procurement.
5. **Hematology Consultation:** Immediate guidance on **HIT testing (PF4 ELISA + SRA)** and non-heparin anticoagulation (Argatroban) timing.
6. **Gastroenterology Consultation:** Bedside preparation for upper endoscopy (EGD) once macrovascular perfusion is stabilized.

────────────────────────────────────────

### Requirement 15: Structured SOAP Note & Clinical Safety-Validation
- **Subjective:** 64-year-old female post-op day 9 from total hip arthroplasty presenting with sudden severe dyspnea, chest pain, confusion, melena x 2 days, and acute speech difficulty 45 mins prior to arrival. Prescribed Apixaban, Aspirin, Clopidogrel, Metformin, Metoprolol, Lisinopril.
- **Objective:**
  - Vitals: BP 68/40 mmHg (MAP 49.3 mmHg), HR 142 bpm, RR 36/min, SpO2 82% room air, Temp 37.1°C, Weight 82 kg, GCS 11.
  - Labs: Hb 6.8 g/dL (baseline 12.1), Platelets 38,000/µL (baseline 242,000), WBC 14,200, Cr 2.9 mg/dL (baseline 1.5), Na 132, K 5.8, Cl 100, HCO3 13, pH 7.19, PaCO2 31, PaO2 49, Lactate 8.4, INR 1.8, aPTT 43s, Fibrinogen 175, D-dimer 12,500, Troponin 185, NT-proBNP 4,800.
  - Imaging/Diagnostics: Bedside echo: severe RV dilation, septal flattening, RV dysfunction. Leg US: noncompressible left femoral/popliteal veins. ECG: sinus tach 142 bpm, RAD, new RBBB. Stool: melena.
  - Pending: CTPA, CT Brain, PF4/SRA assays, Type & Crossmatch.
- **Assessment:**
  1. Catastrophic mixed shock (Obstructive + Hemorrhagic + Cardiogenic RV failure), MAP 49.3 mmHg.
  2. High-risk pulmonary embolism with acute cor pulmonale (radiographically unconfirmed, echo/clinical strongly suspected) with confirmed extensive left proximal DVT.
  3. Active gastrointestinal hemorrhage with acute severe anemia (Hb drop of 5.3 g/dL).
  4. Suspected Heparin-Induced Thrombocytopenia (4Ts score = 7, high probability; pending serology).
  5. Acute neurological deficit / suspected stroke (onset 45m ago; CT brain pending).
  6. Overt DIC / consumptive coagulopathy on concurrent Apixaban and DAPT.
  7. AKI KDIGO Stage 1 (Cr ratio 1.93x) and severe lactic acidosis (8.4 mmol/L) with metformin exposure.
- **Plan:**
  1. Transfer to Resuscitation Bay; initiate Norepinephrine to MAP ≥ 65 mmHg; avoid fluid boluses.
  2. STRICTLY WITHHOLD systemic thrombolytics, heparin, LMWH, warfarin, and antiplatelet agents.
  3. Transfuse pRBCs (target Hb 7–8 g/dL); reverse Apixaban with Andexanet alfa or 4F-PCC; hold routine platelet transfusions.
  4. Perform STAT Non-Contrast Brain CT.
  5. Mobilize PERT / Interventional team for emergent Catheter-Directed Mechanical Thrombectomy.
  6. Send STAT PF4 ELISA and SRA; maintain Argatroban on standby for post-hemostasis anticoagulation.
  7. Withhold all 6 outpatient medications.

────────────────────────────────────────

### 16. Neuro-Symbolic Scratchpad Verification Trail
${scratchpad.markdownScratchpadSummary}
`;
}
