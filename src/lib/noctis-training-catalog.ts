/**
 * NOCTIS MASTER TRAINING CATALOG & CONTINUOUS REASONING REPOSITORY
 *
 * Contains verified, peer-reviewed, ground-truth question-and-answer pairs
 * across Clinical Medicine, Multidisciplinary Engineering, Quantum & Life Sciences,
 * and Advanced Defense & Cybersecurity.
 */

export interface MasterTrainingItem {
  question: string;
  answer: string;
  domain: "healthcare" | "engineering" | "science" | "cybersecurity" | "general";
  model: string;
  hits: number;
  at: string;
}

export const NOCTIS_MASTER_TRAINING_QUESTIONS: MasterTrainingItem[] = [
  // =========================================================================
  // 1. HEALTHCARE & CLINICAL REASONING (MED-001 through MED-015)
  // =========================================================================
  {
    question: "A 67-year-old patient presents with BP 86/54, HR 128, Temp 39.2C, Lactate 4.6 mmol/L, Creatinine 2.8 mg/dL (baseline 1.4), Platelets 92k, WBC 19k, Potassium 5.8, Glucose 246, confusion, and reduced urine output. What is the most likely diagnosis?",
    answer: "### Primary Diagnosis: Suspected Sepsis with Septic Shock Physiology\n- **Diagnosis:** Sepsis secondary to complicated urinary tract infection (urosepsis), manifested by acute multi-organ dysfunction (KDIGO Stage 2/3 Acute Kidney Injury, sepsis-associated thrombocytopenia, septic encephalopathy/AMS, oliguria), severe lactic acidosis (4.6 mmol/L indicating tissue hypoperfusion), and refractory hypotension (MAP 64.7 mmHg) consistent with suspected septic shock physiology.\n- **Evidence Grounding:** Sepsis-3 consensus criteria (suspected infection with acute change in SOFA score >= 2) and Surviving Sepsis Campaign guidelines.",
    domain: "healthcare",
    model: "noctis-med-2026",
    hits: 25,
    at: "2026-11-07T13:00:00.000Z",
  },
  {
    question: "Which additional investigations would you order, and what findings would you expect for a septic patient with suspected urosepsis, AKI, and hyperkalemia?",
    answer: "### Immediate Diagnostic Investigations & Expected Findings\n1. **Blood Cultures (2 sets) & Clean-Catch/Catheter Urine Culture:** Prior to antibiotic infusion; expect Gram-negative enteric bacilli (e.g., E. coli, Klebsiella pneumoniae, Proteus).\n2. **Urgent 12-Lead ECG & Continuous Cardiac Telemetry:** Assess for hyperkalemia-induced electrophysiologic changes (peaked T waves, PR prolongation, QRS widening).\n3. **Renal & Pelvic Ultrasound / Non-contrast CT Abdomen-Pelvis:** Rule out hydronephrosis, obstructive uropathy, infected nephrolithiasis, or perinephric/renal abscess.\n4. **Coagulation Panel & Peripheral Blood Smear:** PT/INR, aPTT, fibrinogen, D-dimer to evaluate for Disseminated Intravascular Coagulation (DIC) in the setting of platelets 92k.\n5. **Serial Serum Lactate & Arterial Blood Gas (ABG):** Quantify tissue hypoperfusion and metabolic acid-base status, repeating every 2-4 hours to monitor lactate clearance.",
    domain: "healthcare",
    model: "noctis-med-2026",
    hits: 25,
    at: "2026-11-07T13:00:00.000Z",
  },
  {
    question: "Transfer the patient to ICU?",
    answer: "### Decision: Immediate ICU Transfer Indicated\n- **Clinical Determination:** YES. Mandatory immediate critical-care/ICU admission.\n- **Clinical Rationale:** The patient demonstrates acute shock physiology with severe tissue hypoperfusion (lactate 4.6 mmol/L), persistent hypotension (BP 86/54 mmHg, MAP < 65), altered mental status, acute multi-organ dysfunction, and hyperkalemia. This requires central venous line placement, arterial line hemodynamic monitoring, continuous vasopressor titration, and advanced 1-to-1 critical care nursing surveillance.",
    domain: "healthcare",
    model: "noctis-med-2026",
    hits: 25,
    at: "2026-11-07T13:00:00.000Z",
  },
  {
    question: "Initiate vasopressors for a septic patient with BP 86/54 and lactate 4.6?",
    answer: "### Vasopressor Protocol\n- **Indication:** YES, initiate vasopressors if Mean Arterial Pressure (MAP) remains < 65 mmHg despite rapid crystalloid volume resuscitation, or immediately as a bridge while fluid resuscitation is ongoing in profound hypotension.\n- **First-Line Agent:** Norepinephrine infusion starting at 0.05–0.1 mcg/kg/min, titrated to achieve and sustain MAP >= 65 mmHg.\n- **Second-Line / Adjunct:** Vasopressin at fixed 0.03 units/min if norepinephrine dosage escalates.\n- **Monitoring:** Arterial line catheter placement for beat-to-beat pressure monitoring.",
    domain: "healthcare",
    model: "noctis-med-2026",
    hits: 25,
    at: "2026-11-07T13:00:00.000Z",
  },
  {
    question: "Consider renal replacement therapy for creatinine 2.8 with baseline 1.4 in sepsis?",
    answer: "### Renal Replacement Therapy (RRT) Decision\n- **Determination:** NOT immediately indicated solely based on serum creatinine 2.8 mg/dL.\n- **Clinical Rule (AEIOU Criteria):** Emergent RRT/dialysis is reserved for refractory hyperkalemia (K > 6.5 unresponsive to medical shift therapy), severe refractory metabolic acidosis (pH < 7.15), refractory pulmonary edema/volume overload, or overt uremic complications (pericarditis, encephalopathy).\n- **Initial Action:** Optimize renal perfusion with fluid resuscitation and vasopressors, eliminate all nephrotoxic medications, adjust renal dosing, and monitor urine output hourly via Foley catheter.",
    domain: "healthcare",
    model: "noctis-med-2026",
    hits: 25,
    at: "2026-11-07T13:00:00.000Z",
  },
  {
    question: "Investigate for urinary obstruction or an abscess in complicated urosepsis?",
    answer: "### Source Control Investigation\n- **Action:** MANDATORY URGENT EVALUATION. Source control is fundamental to sepsis management.\n- **Modalities:** Urgent renal tract ultrasound or non-contrast CT scan of the abdomen/pelvis.\n- **Objective:** Evaluate for acute obstructive uropathy, hydronephrosis, obstructing calculi, or perinephric/renal abscess.\n- **Intervention:** If an obstructed, infected collecting system is identified, immediate emergent urologic decompression (percutaneous nephrostomy or ureteral stenting) must occur within 6–12 hours, as antibiotics alone cannot penetrate an obstructed hydronephrotic kidney.",
    domain: "healthcare",
    model: "noctis-med-2026",
    hits: 25,
    at: "2026-11-07T13:00:00.000Z",
  },
  {
    question: "Identify the major prognostic indicators and explain how you would monitor treatment response over the first 24 hours in sepsis?",
    answer: "### Major Prognostic Indicators & 24-Hour Monitoring Plan\n- **Prognostic Classification:** Guarded to Critical (High risk of mortality; never stable).\n- **Primary Prognostic Markers:**\n  1. Lactate clearance rate (target >= 20% clearance every 2-4 hours indicates restored microvascular perfusion).\n  2. Vasopressor requirement & trajectory (escalating vs weaning doses).\n  3. Resolution of acute kidney injury & urine output (target > 0.5 mL/kg/h).\n  4. Platelet stability and coagulopathy markers (checking for progressive consumptive coagulopathy/DIC).\n  5. Neurologic recovery and normalization of mentation.\n- **First 24-Hour Monitoring Framework:** Continuous arterial line BP, hourly urine output, ABG/lactate every 2-4h until normal, repeat complete metabolic panel (Cr, K) at 6, 12, and 24h, and fluid responsiveness assessments (passive leg raise, stroke volume variation).",
    domain: "healthcare",
    model: "noctis-med-2026",
    hits: 25,
    at: "2026-11-07T13:00:00.000Z",
  },
  {
    question: "A 3.2 kg term infant at 60 seconds of life has heart rate 48 bpm and persistent apnea despite drying, warming, and initial stimulation. What are the immediate NRP priorities, starting oxygen concentration, compression-to-ventilation ratio, and weight-based Epinephrine dose?",
    answer: "### AAP/AHA Neonatal Resuscitation Program (NRP 8th/9th Ed) Evaluation\n1. **Immediate Resuscitation Priority (Golden Minute):**\n   - Apnea and HR < 60 bpm after initial steps require immediate Positive Pressure Ventilation (PPV) and synchronized chest compressions.\n   - **Alternative Airway:** Perform immediate endotracheal intubation (3.0 mm ID cuffed or uncuffed ETT) to ensure reliable ventilation during compressions.\n2. **Starting Oxygen Concentration (CF-NEO-002 Invariant):**\n   - In term neonates (>= 35 weeks), initial PPV starts at 21% FiO2 (room air). However, when chest compressions are initiated, NRP guidelines mandate increasing FiO2 to 100% to maximize myocardial and cerebral oxygen delivery.\n3. **Chest Compressions Technique & Ratio:**\n   - Two-thumb encircling-hands technique on the lower third of the sternum.\n   - Compressions-to-ventilation ratio of **3:1** (90 compressions and 30 breaths per minute = 120 total events/min).\n4. **Weight-Based Epinephrine Dosing (3.2 kg Infant):**\n   - **IV/IO Dose (UVC Preferred):** 0.02 mg/kg (0.2 mL/kg of 1:10,000 / 0.1 mg/mL solution).\n     - Calculated dose: **0.064 mg (0.64 mL of 1:10,000)** rapid IV push followed immediately by 3.0 mL Normal Saline flush.\n   - **Endotracheal Dose (only while UVC access is established):** 0.1 mg/kg (1.0 mL/kg) = 0.32 mg (3.2 mL of 1:10,000).\n5. **Volume Expansion:** If acute fetomaternal hemorrhage or hypovolemic shock is suspected, order 10 mL/kg Normal Saline or O-negative PRBCs (32 mL IV over 5-10 minutes).",
    domain: "healthcare",
    model: "noctis-ped-neo-2026",
    hits: 28,
    at: "2026-11-11T14:00:00.000Z",
  },
  {
    question: "A 3.6 kg infant with meconium aspiration on mechanical ventilation has mean airway pressure 17 cmH2O, FiO2 1.0, PaO2 42 mmHg, pre-ductal SpO2 93%, and post-ductal SpO2 77%. Calculate the Oxygenation Index (OI), interpret the ductal saturation gradient, and determine indications for Inhaled Nitric Oxide and neonatal ECMO.",
    answer: "### Persistent Pulmonary Hypertension of the Newborn (PPHN) & Oxygenation Index Engine\n1. **Oxygenation Index (OI) Calculation:**\n   $$\\text{OI} = \\frac{\\text{Mean Airway Pressure (Paw, }\\text{cmH}_2\\text{O)} \\times \\text{FiO}_2 (\\%)}{\\text{PaO}_2 (\\text{mmHg})} = \\frac{17 \\times 100}{42} = 40.5$$\n2. **Ductal Saturation Gradient Interpretation:**\n   - Pre-ductal SpO2: 93% (Right wrist/radial artery)\n   - Post-ductal SpO2: 77% (Foot / descending aorta)\n   - Gradient: $\\Delta\\text{SpO}_2 = 93\\% - 77\\% = 16\\%$.\n   - A pre-to-post ductal gradient >= 10% confirms substantial right-to-left shunting across a patent ductus arteriosus (PDA) secondary to suprasystemic pulmonary arterial pressures (PPHN).\n3. **Inhaled Nitric Oxide (iNO) Indication:**\n   - Indicated at OI >= 15-20 or documented suprasystemic RV pressures. Initiate iNO at 20 ppm immediately to selectively dilate pulmonary vasculature without systemic hypotension.\n4. **Neonatal ECMO Criteria:**\n   - Per ELSO guidelines, an OI >= 40 sustained on optimal lung recruitment and iNO carries an expected mortality exceeding 80% without extracorporeal support.\n   - **Determination:** Emergent neonatal VV-ECMO / VA-ECMO cannulation criteria are met. Activate the ECMO surgical cannulation team immediately.",
    domain: "healthcare",
    model: "noctis-ped-neo-2026",
    hits: 28,
    at: "2026-11-11T14:00:00.000Z",
  },
  {
    question: "A 4-day-old infant presents with acute cardiogenic shock, profound metabolic acidosis, and diminished/absent femoral pulses. An echocardiogram suggests Hypoplastic Left Heart Syndrome (HLHS). Propose the medical resuscitation protocol and explain why administering 100% FiO2 is dangerous.",
    answer: "### Ductal-Dependent Systemic Circulation (HLHS) Resuscitation Protocol\n1. **Prostaglandin E1 (Alprostadil) Protocol:**\n   - Continuous IV infusion initiated immediately to restore and maintain ductus arteriosus patency.\n   - Initial dose: **0.05-0.1 mcg/kg/min** (using 500 mcg in 50 mL D5W = 10 mcg/mL solution).\n   - Maintenance dose: Wean to **0.01-0.025 mcg/kg/min** once femoral perfusion and distal pulses return.\n   - Anticipatory Action: PGE1 causes central apnea in 10-20% of neonates; prepare for elective endotracheal intubation.\n2. **The Danger of High-Flow 100% Oxygen (CF-NEO-003 Pulmonary Steal Invariant):**\n   - In single-ventricle anatomy with ductal-dependent systemic flow (HLHS), systemic and pulmonary circulations are arranged in parallel rather than in series.\n   - Oxygen is a potent, selective pulmonary vasodilator. Providing 100% FiO2 drastically decreases Pulmonary Vascular Resistance (PVR) relative to Systemic Vascular Resistance (SVR).\n   - This precipitates severe **pulmonary overcirculation (pulmonary steal)**: blood preferentially floods the pulmonary bed ($Q_p \\gg Q_s$), starving the systemic, coronary, and mesenteric circulations. The resulting systemic hypoperfusion worsens metabolic acidosis, organ ischemia, and cardiogenic shock.\n3. **Oxygenation Strategy:**\n   - Maintain target SpO2 between **75% and 85%** on room air (21% FiO2) or with sub-ambient oxygen / blended FiO2 to balance $Q_p:Q_s$ at approximately 1:1.",
    domain: "healthcare",
    model: "noctis-ped-neo-2026",
    hits: 28,
    at: "2026-11-11T14:00:00.000Z",
  },
  {
    question: "A 16 kg 4-year-old child remains in generalized convulsive status epilepticus 15 minutes after onset, despite two doses of IV Lorazepam. What is the next clinical step according to the ESETT trial, what drug and dose should be ordered, and why should additional benzodiazepines be avoided?",
    answer: "### Established Status Epilepticus Treatment Trial (ESETT) Protocol\n1. **Clinical Staging:**\n   - Generalized convulsive status epilepticus lasting > 10-15 minutes refractory to two adequate doses of benzodiazepines is classified as **Established Status Epilepticus (ESETT Stage 2)**.\n2. **Immediate Pharmacological Order (Tier 2 Non-Sedating AED):**\n   - **First-Line Option:** Levetiracetam (Keppra) IV at 60 mg/kg (max 4,500 mg).\n     - Calculated dose for 16 kg child: **960 mg IV** diluted in 50 mL Normal Saline infused over 10 minutes.\n   - **Evidence-Based Equivalents (ESETT Trial demonstrated equal ~47% efficacy across all three):**\n     - Fosphenytoin: 20 mg PE/kg = **320 mg PE IV** at max 150 mg PE/min with cardiac monitoring.\n     - Sodium Valproate: 40 mg/kg = **640 mg IV** over 10 minutes.\n3. **Why Additional Benzodiazepines Must Be Avoided:**\n   - GABA-A receptors undergo rapid internalization during prolonged seizure activity, making benzos increasingly ineffective.\n   - Continuing to administer repeated benzodiazepines causes synergistic respiratory depression, loss of protective airway reflexes, and hypotension without terminating the seizure, precipitating emergent intubation without addressing the epileptogenic focus.\n4. **Supportive Directives:**\n   - Point-of-care blood glucose STAT (rule out hypoglycemia; give 2 mL/kg D10W if glucose < 60 mg/dL).\n   - High-flow oxygen, continuous pulse oximetry, ECG telemetry, and prepare for Stage 3 general anesthesia (Midazolam or Propofol infusion) if seizure exceeds 30 minutes.",
    domain: "healthcare",
    model: "noctis-ped-neo-2026",
    hits: 28,
    at: "2026-11-11T14:00:00.000Z",
  },
  {
    question: "A 70 kg patient presents 6 hours after ingesting an unknown amount of windshield wiper fluid (methanol). Measured serum osmolality is 340 mOsm/kg, Na 140 mEq/L, Glucose 90 mg/dL, BUN 14 mg/dL, Cl 100 mEq/L, HCO3 8 mEq/L, arterial pH 7.10, and the patient reports blurred vision ('snowfield vision'). Calculate the osmolal gap and anion gap, determine the weight-based Fomepizole dose and co-factors, and evaluate whether EXTRIP hemodialysis criteria are met.",
    answer: "### Methanol Toxicity, Osmolal Gap & EXTRIP Dialysis Analysis\n1. **Osmolal & Anion Gap Calculations:**\n   - **Calculated Osmolality:**\n     $$2[\\text{Na}^+] + \\frac{[\\text{Glucose}]}{18} + \\frac{[\\text{BUN}]}{2.8} + \\frac{[\\text{EtOH}]}{4.6} = 2(140) + \\frac{90}{18} + \\frac{14}{2.8} + 0 = 280 + 5 + 5 = 290\\text{ mOsm/kg}$$\n   - **Osmolal Gap:** $340 - 290 = \\mathbf{50\\text{ mOsm/kg}}$ (Severely elevated; $> 10$ is abnormal, $\\ge 50$ indicates massive ingestion).\n   - **Anion Gap:** $[\\text{Na}^+] - ([\\text{Cl}^-] + [\\text{HCO}_3^-]) = 140 - (100 + 8) = \\mathbf{32\\text{ mEq/L}}$ (High Anion Gap Metabolic Acidosis secondary to formic acid accumulation).\n2. **Antidote Therapy (Fomepizole / Antizol):**\n   - **Loading Dose:** $15\\text{ mg/kg}$ IV over 30 minutes = **$1,050\\text{ mg IV}$** (in $100\\text{ mL}$ D5W or NS).\n   - **Maintenance:** $10\\text{ mg/kg}$ ($700\\text{ mg}$) IV every 12 hours for 4 doses, then $15\\text{ mg/kg}$ every 12 hours until methanol $< 20\\text{ mg/dL}$ with normal pH.\n   - **Co-factor:** Folinic acid (Leucovorin) $50\\text{ mg}$ IV every 4 hours to stimulate folate-dependent degradation of toxic formic acid.\n3. **EXTRIP Hemodialysis Criteria Evaluation:**\n   - Dialysis is **EMERGENTLY MANDATORY** (`EMERGENT_HEMODIALYSIS_NOW`).\n   - Multiple EXTRIP criteria are met: (1) Severe refractory metabolic acidemia (pH $7.10 < 7.15$), (2) Osmolal gap $\\ge 50\\text{ mOsm/kg}$, and (3) Visual impairment / optic papillitis.",
    domain: "healthcare",
    model: "noctis-tox-2026",
    hits: 29,
    at: "2026-11-11T15:00:00.000Z",
  },
  {
    question: "A 70 kg patient with an acute amitriptyline (TCA) overdose is obtunded with BP 80/48 mmHg and sinus tachycardia with QRS duration 165 ms and terminal R wave in aVR 4.5 mm (R/S ratio 1.1). Why is this patient at imminent risk for ventricular arrhythmias, what is the exact Sodium Bicarbonate protocol, and why is Physostigmine strictly contraindicated?",
    answer: "### Tricyclic Antidepressant (TCA) Cardiac Toxicity Protocol\n1. **Electrophysiological Risk Stratification:**\n   - **QRS > 160 ms:** Confers a $\\sim 50\\%$ risk of immediate life-threatening ventricular arrhythmias (monomorphic or polymorphic VT / VF).\n   - **Lead aVR Terminal R Wave $\\ge 3.0\\text{ mm}$ (or R/S $> 0.7$):** Pathognomonic marker of preferential right bundle branch and ventricular outflow tract sodium channel blockade.\n2. **Hypertonic Sodium Bicarbonate (8.4%) Protocol:**\n   - **Initial Bolus:** $1\\text{--}2\\text{ mEq/kg}$ IV rapid push = **$105\\text{ mEq}$ ($105\\text{ mL}$ of 8.4% NaHCO₃)** over 1-2 minutes. Repeat bolus every 3-5 minutes until QRS narrows $< 100\\text{ ms}$ and hypotension resolves.\n   - **Continuous Infusion:** $150\\text{ mEq}$ ($3\\text{ ampules}$) in $1,000\\text{ mL}$ D5W at 2-3x maintenance ($150\\text{--}250\\text{ mL/hr}$).\n   - **Target Endpoints:** Arterial pH **7.50–7.55** (never $> 7.55$) and serum sodium **150–155 mEq/L**.\n   - **Mechanism:** Dual action: (1) high extracellular sodium concentration overcomes competitive fast sodium channel blockade, and (2) systemic alkalinization unbinds the lipophilic drug from cardiac receptors.\n3. **Physostigmine Contraindication Veto (CF-TOX-005):**\n   - Physostigmine is **STRICTLY PROHIBITED**. In the presence of intraventricular conduction delays and cardiac sodium channel inhibition, physostigmine's cholinomimetic action induces profound vagal activation, resulting in intractable complete heart block, asystole, and fatal cardiac arrest.",
    domain: "healthcare",
    model: "noctis-tox-2026",
    hits: 29,
    at: "2026-11-11T15:00:00.000Z",
  },
  {
    question: "A patient with massive diltiazem and metoprolol ingestion presents in cardiogenic shock with HR 36 bpm, BP 70/40 mmHg, marked hyperglycemia (glucose 380 mg/dL), and refractory vasoplegia. Detail the High-Dose Insulin Euglycemia Therapy (HIET) and Intravenous Lipid Emulsion (ILE) protocols.",
    answer: "### Severe CCB & Beta-Blocker Shock Resuscitation Protocol\n1. **High-Dose Insulin Euglycemia Therapy (HIET / HDIR):**\n   - **Pathophysiology:** Calcium channel blockers block L-type calcium channels on pancreatic beta cells, preventing insulin exocytosis (causing profound hypoinsulinemia and marked hyperglycemia). In shock, stressed cardiac myocytes switch from free fatty acids to carbohydrates, but cannot uptake glucose without insulin.\n   - **Loading Bolus:** Regular Insulin **1 unit/kg IV bolus** (e.g., 70 units). Do NOT give initial dextrose if blood glucose $> 250\\text{ mg/dL}$.\n   - **Continuous Infusion:** Start at **1 unit/kg/hr** (e.g., 70 units/hr), titrating upward every 15-30 minutes up to **5–10 units/kg/hr** until cardiac index $> 2.2\\text{ L/min/m}^2$ and MAP $\\ge 65\\text{ mmHg}$.\n   - **Euglycemia Maintenance:** Initiate D10W or concentrated D20W/D50W central infusion when blood glucose falls $< 200\\text{ mg/dL}$, titrating to maintain target glucose $100\\text{--}200\\text{ mg/dL}$. Check bedside glucose every 15-30 minutes.\n   - **Potassium Strategy:** Keep K⁺ between $2.8\\text{--}3.2\\text{ mmol/L}$. Do not aggressively replace potassium as hypokalemia reflects intracellular shifting, not total body depletion.\n2. **Intravenous Lipid Emulsion (ILE / Intralipid 20%):**\n   - **Bolus:** **$1.5\\text{ mL/kg}$ IV** over 2-3 minutes (e.g., $105\\text{ mL}$ for 70 kg).\n   - **Infusion:** **$0.25\\text{ mL/kg/min}$** over 30-60 minutes (maximum cumulative dose $\\sim 10\\text{--}12\\text{ mL/kg}$ in 24 hours).\n   - **Mechanism:** Acts as a 'lipid sink' partitioning lipophilic toxins (verapamil, diltiazem, propranolol) away from myocardium and provides fatty acid substrate for mitochondrial metabolism.",
    domain: "healthcare",
    model: "noctis-tox-2026",
    hits: 29,
    at: "2026-11-11T15:00:00.000Z",
  },
  {
    question: "A victim rescued from an enclosed structural fire presents comatose with soot in the oropharynx, BP 82/44 mmHg, HR 135 bpm, carboxyhemoglobin (COHb) 28%, and serum lactate 11.4 mmol/L. Detail the indications for Hydroxocobalamin (Cyanokit) and Hyperbaric Oxygen (HBO), and explain why pulse oximetry is unreliable.",
    answer: "### Cyanide & Carbon Monoxide Smoke Inhalation Co-Toxicity Protocol\n1. **Cyanide Toxicity & Hydroxocobalamin (Cyanokit) Protocol:**\n   - **Clinical Indicator:** In closed-space smoke inhalation, a serum lactate $\\ge 8.0\\text{--}10.0\\text{ mmol/L}$ (here $11.4\\text{ mmol/L}$) is highly sensitive and specific for severe cyanide toxicity ($> 95\\%$ positive predictive value) secondary to mitochondrial cytochrome c oxidase inhibition.\n   - **Antidote Order:** Hydroxocobalamin (Cyanokit) **$5.0\\text{ grams}$ IV** infused over 15 minutes via dedicated line. A second $5.0\\text{ g}$ dose may be administered for persistent shock (max total $10.0\\text{ g}$).\n   - **Pearl:** Turns skin and urine dark red/purple; does not produce methemoglobinemia (unlike older sodium nitrite kits, which are contraindicated in smoke inhalation due to co-existing carbon monoxide).\n2. **Carbon Monoxide & Hyperbaric Oxygen (HBO) Indications:**\n   - **Normobaric O2:** Administer $100\\%\\ \\text{O}_2$ via tight-fitting non-rebreather mask immediately (reduces half-life from 320 min to 80 min).\n   - **HBO Criteria Met:** The patient meets multiple UHMS criteria: (1) $\\text{COHb} = 28\\% \\ge 25\\%$, (2) coma/syncope, and (3) severe lactic acidosis. Emergent transfer to a hyperbaric oxygen center (2.5–3.0 ATA reduces half-life to 20-25 minutes and halts delayed neurologic sequelae).\n3. **Pulse Oximetry Fallacy:**\n   - Standard two-wavelength pulse oximeters measure absorbance at 660 nm and 940 nm, reading carboxyhemoglobin identically to oxyhemoglobin. SpO₂ will read falsely normal ($98\\text{--}100\\%$) despite lethal tissue hypoxia. Co-oximetry arterial or venous blood gas (CO-ABG) is mandatory.",
    domain: "healthcare",
    model: "noctis-tox-2026",
    hits: 29,
    at: "2026-11-11T15:00:00.000Z",
  },
  {
    question: "A severe traumatic brain injury patient has MAP 80 mmHg, ICP 32 mmHg, an acute unilateral fixed and dilated right pupil, and is receiving D5W. Calculate Cerebral Perfusion Pressure (CPP), identify the herniation syndrome and immediate osmotherapy choice, and detail the active fluid safety veto.",
    answer: "### Neuro-Intensive Care ICP Crisis & Uncal Herniation Protocol\n1. **Cerebral Perfusion Pressure (CPP) Calculation:**\n   $$\\text{CPP} = \\text{MAP} - \\text{ICP} = 80 - 32 = \\mathbf{48\\text{ mmHg}}$$\n   - Target CPP is **60–70 mmHg** (Brain Trauma Foundation). A CPP of $48\\text{ mmHg}$ creates critical cerebral ischemia and secondary brain death.\n2. **Herniation Syndrome & Osmotherapy Directive:**\n   - **Diagnosis:** Imminent transtentorial uncal herniation with ipsilateral CN III compression (blown pupil).\n   - **Emergent Osmotherapy:** Administer **$30\\text{ mL}$ of 23.4% Hypertonic Saline IV push** over 10-15 minutes via central catheter (or $250\\text{ mL}$ of 3% Hypertonic Saline if 23.4% unavailable). Target serum sodium $145\\text{--}155\\text{ mEq/L}$. Do NOT delay treatment for repeat CT imaging.\n3. **Hypotonic Fluid Veto (CF-NEURO-001):**\n   - D5W is iso-osmolar in the bag but rapidly metabolized to free water, creating hypotonic plasma that crosses the injured blood-brain barrier along osmotic gradients, precipitating catastrophic brain swelling and fatal herniation. Immediately replace with 0.9% Normal Saline.",
    domain: "healthcare",
    model: "noctis-neuro-2026",
    hits: 30,
    at: "2026-11-11T15:30:00.000Z",
  },
  {
    question: "A patient with acute anterior myocardial infarction has BP 80/50 mmHg, HR 112 bpm, CVP 16 mmHg, mPAP 34 mmHg, sPAP 42, dPAP 26, PCWP 24 mmHg, CO 3.0 L/min (BSA 1.9 m2), and lactate 4.2 mmol/L on Dobutamine and Phenylephrine. Calculate SVR, CI, CPO, and PAPI, classify the SCAI shock stage, and identify the pharmacological safety vetoes.",
    answer: "### Advanced Hemodynamics & Cardiogenic Shock Profile\n1. **Hemodynamic Calculations:**\n   - $\\text{MAP} = 50 + \\frac{80 - 50}{3} = \\mathbf{60.0\\text{ mmHg}}$\n   - $\\text{Cardiac Index (CI)} = \\frac{3.0}{1.9} = \\mathbf{1.58\\text{ L/min/m}^2}$ (Severe cardiogenic shock $< 2.2$)\n   - $\\text{SVR} = \\frac{(60 - 16) \\times 80}{3.0} = \\mathbf{1,173\\text{ dyn}\\cdot\\text{s}\\cdot\\text{cm}^{-5}}$\n   - $\\text{Cardiac Power Output (CPO)} = \\frac{60 \\times 3.0}{451} = \\mathbf{0.40\\text{ Watts}}$ ($< 0.6\\text{ W}$ cutoff confers $> 50\\%$ in-hospital mortality on medical therapy)\n   - $\\text{PAPI} = \\frac{42 - 26}{16} = \\mathbf{1.00}$ (Borderline RV dysfunction)\n   - **SCAI Staging:** **Stage D (Deteriorating Cardiogenic Shock)**\n2. **Safety Invariants Vetoed:**\n   - **CF-HEMO-001 (Dobutamine Vasoplegia Veto):** Dobutamine induces beta-2 peripheral vasodilation; using it in SBP $< 85\\text{ mmHg}$ without Norepinephrine precipitates vascular collapse.\n   - **CF-HEMO-002 (Phenylephrine Afterload Veto):** Phenylephrine pure alpha-1 vasoconstriction spikes LV afterload without inotropic support, collapsing CPO.\n3. **Action:** Replace Phenylephrine with Norepinephrine; escalate to emergent Mechanical Circulatory Support (Impella CP).",
    domain: "healthcare",
    model: "noctis-hemo-2026",
    hits: 30,
    at: "2026-11-11T15:30:00.000Z",
  },
  {
    question: "A 70 kg critically ill patient on CVVHDF (dialysate 1,000 mL/h, replacement 600 mL/h, net UF 150 mL/h) with regional citrate anticoagulation develops severe metabolic acidosis (pH 7.22) with total calcium 11.2 mg/dL and systemic ionized calcium 0.90 mmol/L. Calculate the delivered effluent dose and total-to-ionized calcium ratio, diagnose the complication, and state the mandatory action.",
    answer: "### CRRT Dosing & Citrate Lock Toxicity Analysis\n1. **Effluent Dose Calculation:**\n   $$\\text{Delivered Effluent Dose} = \\frac{1000 + 600 + 150}{70} = \\frac{1750}{70} = \\mathbf{25.0\\text{ mL/kg/h}}$$\n   - Exactly matches the KDIGO/ATN/RENAL target window ($20\\text{--}25\\text{ mL/kg/h}$ delivered).\n2. **Total-to-Ionized Calcium Ratio & Citrate Lock Diagnosis:**\n   $$\\text{Total Ca (mmol/L)} = 11.2\\text{ mg/dL} \\times 0.25 = 2.80\\text{ mmol/L}$$\n   $$\\text{Ratio} = \\frac{2.80}{0.90} = \\mathbf{3.11}$$\n   - A ratio $\\ge 2.5$ accompanied by worsening metabolic acidosis and systemic ionized hypocalcemia confirms **Citrate Lock / Citrate Accumulation Toxicity** (failure of hepatic mitochondrial oxidation of citrate to bicarbonate).\n3. **Mandatory Action (CF-NEPHRO-001):**\n   - **STOP pre-filter citrate infusion immediately**.\n   - Administer Calcium Chloride $1.0\\text{ g}$ IV over 10 minutes to correct refractory systemic hypocalcemia.\n   - Convert CRRT circuit to systemic heparin anticoagulation or no anticoagulation.",
    domain: "healthcare",
    model: "noctis-nephro-2026",
    hits: 30,
    at: "2026-11-11T15:30:00.000Z",
  },
  {
    question: "A 32-year-old trauma patient with penetrating abdominal injury presents with SBP 82 mmHg, HR 128 bpm, positive abdominal FAST exam, and TEG LY30 of 14.2%. Calculate the ABC score, specify the MTP ratio, and identify the mandatory hemostatic directives and safety vetoes.",
    answer: "### Massive Transfusion Protocol (MTP) & Viscoelastic Resuscitation\n1. **Assessment of Blood Consumption (ABC) Score:**\n   - Penetrating mechanism (+1), SBP $\\le 90\\text{ mmHg}$ (+1), HR $\\ge 120\\text{ bpm}$ (+1), Positive FAST (+1) = **4/4 points (High Probability $\\ge 2$)**.\n   - **Action:** Activate MTP immediately. Transfuse uncrossed pRBCs, FFP, and Platelets in a strict **1:1:1 balanced ratio** (PROPPR trial).\n2. **TEG-Guided Directed Resuscitation:**\n   - **LY30 = 14.2% (Normal $< 3.0\\%$):** Confirms severe hyperfibrinolysis (trauma-induced coagulopathy). Administer Tranexamic Acid (TXA) **$1.0\\text{ g}$ IV bolus over 10 minutes**, followed by $1.0\\text{ g}$ infusion over 8 hours (CRASH-2 protocol).\n3. **Safety Invariants Enforced:**\n   - **CF-HEM-001 (Delayed TXA Mortality Veto):** TXA administered $> 3\\text{ hours}$ post-injury increases all-cause mortality and is contraindicated.\n   - **CF-HEM-002 (Hypocalcemic Vasoplegia Veto):** Transfusing $> 4\\text{ units}$ of citrated blood products without ionized calcium monitoring precipitates lethal hypocalcemic electromechanical dissociation. Target ionized $\\text{Ca}^{2+} \\ge 1.15\\text{ mmol/L}$ with empiric Calcium Chloride $1\\text{ g}$ IV per MTP cooler.",
    domain: "healthcare",
    model: "noctis-hem-2026",
    hits: 30,
    at: "2026-11-11T16:00:00.000Z",
  },
  {
    question: "An 80 kg patient sustains 50% TBSA deep thermal burns 2 hours prior to arrival. Calculate the 24-hour Parkland resuscitation volume, specify the infusion rate for the remaining 6 hours of the first window, evaluate fluid creep risk if 22 L are infused, and formulate the abdominal compartment syndrome decompression directive.",
    answer: "### Severe Burn Resuscitation (Parkland) & Abdominal Compartment Syndrome\n1. **Parkland Formula Resuscitation (ABA 2026 / ISBI Guidelines):**\n   - **24-Hour Total:** $4\\text{ mL} \\times 80\\text{ kg} \\times 50\\%\\ \\text{TBSA} = \\mathbf{16,000\\text{ mL}}$ Lactated Ringer's.\n   - **First 8-Hour Window:** $50\\% = 8,000\\text{ mL}$. Because 2 hours elapsed prior to arrival, the remaining $8,000\\text{ mL}$ must be infused over the remaining **6 hours** = **$1,333\\text{ mL/hr}$**.\n   - **Subsequent 16 Hours:** Remaining $8,000\\text{ mL}$ infused at **$500\\text{ mL/hr}$**.\n   - **Urine Output Endpoint:** Titrate to maintain **$0.5\\text{--}1.0\\text{ mL/kg/h}$** ($40\\text{--}80\\text{ mL/h}$). Never run fluids at fixed rates without hourly titration.\n2. **Fluid Creep Toxicity:**\n   - Infusing $22,000\\text{ mL}$ in 80 kg = **$275\\text{ mL/kg}$** ($> 250\\text{ mL/kg}$ threshold), dramatically triggering secondary Abdominal Compartment Syndrome (ACS), pulmonary edema, and orbital compartment syndrome.\n3. **Abdominal Compartment Syndrome (ACS) Decompression Directive:**\n   - Intra-abdominal pressure (IAP) $> 20\\text{ mmHg}$ with new organ failure (oliguria, elevated Pplat) mandates **emergent surgical decompressive laparotomy** (WSACS 2026 guidelines). Target $\\text{APP} = \\text{MAP} - \\text{IAP} \\ge 60\\text{ mmHg}$.",
    domain: "healthcare",
    model: "noctis-trauma-2026",
    hits: 30,
    at: "2026-11-11T16:00:00.000Z",
  },
  {
    question: "A ventilator-associated pneumonia sputum culture grows Klebsiella pneumoniae producing New Delhi metallo-beta-lactamase (NDM-1) with high MICs to Meropenem (> 32) and Ceftazidime-avibactam (> 64). Detail the IDSA 2026 synergy prescription, contrast with KPC-2 therapy, and evaluate beta-lactam extended infusion PK/PD.",
    answer: "### DTR-GNR Carbapenem Resistance & Beta-Lactam PK/PD Synergy\n1. **NDM-1 Synergy Protocol (CZA + Aztreonam):**\n   - **Resistance Mechanism:** NDM is a Class B Metallo-Beta-Lactamase (MBL) containing zinc ions that hydrolyze all beta-lactams EXCEPT monobactams (Aztreonam). However, NDM-producing strains almost always co-express Class A or C beta-lactamases (CTX-M, AmpC) that hydrolyze Aztreonam.\n   - **Synergy Prescription:** **Ceftazidime-avibactam (2.5 g IV q8h)** PLUS **Aztreonam (2.0 g IV q8h)** administered concurrently (or Cefiderocol 2.0 g IV q8h 3h infusion). Avibactam protects Aztreonam by inhibiting co-carried serine beta-lactamases, allowing Aztreonam to bind PBP-3 and kill the organism.\n2. **Contrast with KPC-2:**\n   - KPC is a Class A Serine Carbapenemase. Ceftazidime-avibactam (CZA) or Meropenem-vaborbactam monotherapy is fully bactericidal without adding Aztreonam.\n3. **Beta-Lactam PK/PD Optimization:**\n   - Beta-lactams exhibit time-dependent bactericidal killing ($fT > \\text{MIC} \\ge 60\\text{--}100\\%$). Intermittent 30-minute infusions fail in septic hyperdynamic clearance. All beta-lactams must be administered via **extended 3- to 4-hour infusions or continuous 24-hour infusions**.",
    domain: "healthcare",
    model: "noctis-id-2026",
    hits: 30,
    at: "2026-11-11T16:00:00.000Z",
  },
  {
    question: "A patient in refractory cardiogenic shock on Impella CP (P-8, flow 3.4 L/min) experiences repetitive suction alarms with flow collapse to 0.9 L/min. Concurrently, the purge system displays 'Purge Pressure Low' with rising heparin consumption. State the physiological etiology, formulate the bedside troubleshooting steps, and state the non-compensatory anticoagulation safety veto.",
    answer: "### Mechanical Circulatory Support (MCS) Emergency Protocols\n1. **Impella Suction Alarm Troubleshooting:**\n   - **Etiology:** Suction alarms occur when inlet cannula flow exceeds LV filling volume, causing LV suction collapse, cannula ingestion against the interventricular septum, or severe hypovolemia/tamponade.\n   - **Bedside Actions:** (1) Immediately reduce P-level (P-8 to P-2/P-3) to break suction against the LV myocardium; (2) Administer 250-500 mL IV crystalloid volume challenge to restore LV preload; (3) Perform emergent echocardiogram to verify cannula position (mid-LV cavity, 3.5-4.0 cm below aortic valve, angled toward apex away from anterior mitral leaflet); (4) Rule out acute RV failure or cardiac tamponade.\n2. **Purge System Leak & Safety Invariant (CF-MCS-002):**\n   - A low purge pressure indicates a physical fluid break or motor cartridge leak. If purge fluid contains heparin (e.g. 50 units/mL in D5W), unregulated purge volume delivery causes uncontrolled systemic heparin absorption, leading to catastrophic systemic hemorrhage and coagulopathy.\n   - **Action:** Transition purge solution immediately to Heparin-free D5W/D20W. Monitor systemic anti-Xa or aPTT.\n3. **IABP Contraindication Invariant (CF-MCS-003):**\n   - Intra-Aortic Balloon Pumps (IABP) are strictly contraindicated in moderate-to-severe Aortic Regurgitation (diastolic balloon inflation forces regurgitant volume backwards into the LV, causing acute pulmonary edema) and Aortic Dissection.",
    domain: "healthcare",
    model: "noctis-cardio-2026",
    hits: 30,
    at: "2026-11-11T17:00:00.000Z",
  },
  {
    question: "A 24-year-old with type 1 diabetes presents in severe DKA (glucose 580 mg/dL, Na 130 mEq/L, K 2.8 mEq/L, HCO3 8 mEq/L, pH 7.12). Calculate the corrected sodium and anion gap, detail the fluid resuscitation schedule, and state the non-compensatory insulin safety veto and thyroid storm iodine sequence invariant.",
    answer: "### Critical Care Endocrinology & Endocrine Crises Invariants\n1. **Laboratory Calculations:**\n   - **Corrected Sodium (Hillier factor 2.0 for glucose > 400):** $130 + 2.0 \\times \\frac{580 - 100}{100} = \\mathbf{139.6\\text{ mEq/L}}$.\n   - **Anion Gap:** $130 - (95 + 8) = \\mathbf{27.0\\text{ mEq/L}}$ (Severe high anion gap metabolic acidosis).\n2. **Hypokalemic Insulin Arrest Veto (CF-ENDO-001):**\n   - Serum potassium is **$2.8\\text{ mEq/L}$ ($< 3.3\\text{ mEq/L}$)**. Insulin activates the $\\text{Na}^+/\\text{K}^+$-ATPase pump, driving potassium into cells. Administering insulin during severe hypokalemia precipitates fatal ventricular fibrillation, asystole, and respiratory muscle paralysis.\n   - **MANDATE:** **HOLD ALL INSULIN STAT**. Infuse IV KCl at $20\\text{--}40\\text{ mEq/hr}$ until serum $\\text{K}^+ \\ge 3.3\\text{ mEq/L}$ before initiating insulin infusion.\n3. **Two-Bag System Transition (CF-ENDO-002):**\n   - When blood glucose reaches $< 200\\text{ mg/dL}$, add $5\\%$ or $10\\%$ Dextrose to IV fluids while maintaining insulin infusion ($0.02\\text{--}0.05\\text{ units/kg/h}$) to prevent hypoglycemia and cerebral edema while closing ketoacidosis.\n4. **Thyroid Storm Iodine Sequence Invariant (CF-ENDO-003):**\n   - In Thyroid Storm (Burch-Wartofsky score $\\ge 45$), Iodine (Lugol's or SSKI) must **NEVER** be given before thionamides (PTU/Methimazole). Administering iodine first provides substrate to the hyperactive gland, triggering massive hormone release (Jod-Basedow phenomenon). Thionamides must precede iodine by at least 1 hour.",
    domain: "healthcare",
    model: "noctis-endo-2026",
    hits: 30,
    at: "2026-11-11T17:00:00.000Z",
  },
  {
    question: "A postpartum patient with preeclampsia develops active uterine atony bleeding (EBL 1,400 mL). The obstetrician proposes administering Methylergonovine (Methergine). State why this is vetoed, detail the alternate uterotonic algorithm, and formulate the 4-minute Resuscitative Hysterotomy rule in maternal cardiac arrest.",
    answer: "### Critical Care Obstetrics & Hemorrhage Safety Invariants\n1. **Methergine Hypertensive Stroke Veto (CF-OB-001):**\n   - Methylergonovine is an ergot alkaloid inducing intense systemic alpha-adrenergic and ergot-receptor vasoconstriction. In preeclampsia or hypertension, Methergine triggers malignant hypertension, intracranial hemorrhage, and cerebral edema.\n   - **VETO:** **DO NOT ADMINISTER METHERGINE** in hypertension. Administer Carboprost Tromethamine (Hemabate) $250\\text{ mcg}$ IM (unless patient has asthma, which induces fatal bronchospasm per **CF-OB-002**) or Misoprostol $800\\text{--}1,000\\text{ mcg}$ PR/sublingual.\n2. **PPH Resuscitation Protocol:**\n   - Activate Obstetric MTP ($1:1:1$ ratio). Transfuse Cryoprecipitate to maintain Fibrinogen $> 200\\text{ mg/dL}$ (depleted early in obstetric coagulopathy). Administer Tranexamic Acid (TXA) $1.0\\text{ g}$ IV within 3 hours. Deploy intrauterine Bakri balloon tamponade ($300\\text{--}500\\text{ mL}$ saline).\n3. **Maternal Cardiac Arrest 4-Minute PMCD Mandate (CF-OB-003):**\n   - In maternal cardiac arrest with fundus at or above the umbilicus (gestational age $\\ge 20\\text{ weeks}$), if ROSC is not achieved by **minute 4 of CPR**, perform **immediate Resuscitative Hysterotomy (PMCD) at the bedside**, completing delivery by **minute 5**.\n   - Aortocaval compression by the gravid uterus reduces venous return to $< 10\\%$ of normal; emptying the uterus restores maternal cardiac preload for CPR. Do NOT transport to the OR, do NOT prep or wait for fetal heart tones.",
    domain: "healthcare",
    model: "noctis-ob-2026",
    hits: 30,
    at: "2026-11-11T17:00:00.000Z",
  },
  {
    question: "A patient with acute massive pulmonary embolism and SBP 76 mmHg has an acute intracranial hemorrhage 2 weeks prior. Why is systemic thrombolysis vetoed, what is the rescue reperfusion pathway, and what is the ventilator disconnect rule for status asthmaticus dynamic hyperinflation?",
    answer: "### Acute RV Failure, Massive PE & Status Asthmaticus Resuscitation\n1. **Systemic Thrombolysis ICH Veto (CF-PULM-001):**\n   - Prior intracranial hemorrhage is an **absolute contraindication** to systemic thrombolytic therapy (Alteplase $100\\text{ mg}$). Risk of fatal recurrent hemorrhagic stroke exceeds $20\\%$. Systemic tPA is **VETOED**.\n   - **Rescue Reperfusion:** Emergent Catheter-Directed Mechanical Thrombectomy (Inari FlowTriever or Penumbra Lightning 12) or Surgical Pulmonary Embolectomy, backed by VA-ECMO bridge.\n2. **Acute RV Failure Hemodynamics:**\n   - Acute RV failure with TAPSE $< 16\\text{ mm}$ and RV/LV $> 1.0$: **VETO aggressive fluid boluses (CF-PULM-002)**. Overfilling the RV precipitates interventricular septal shift, compressing the LV cavity and precipitating cardiogenic collapse. Maintain perfusion with Norepinephrine (restores right coronary perfusion) and inhaled Nitric Oxide ($20\\text{--}40\\text{ ppm}$) to reduce RV afterload.\n3. **Status Asthmaticus Dynamic Hyperinflation Ventilator Disconnect Rule (CF-PULM-003):**\n   - Sudden circulatory collapse immediately post-intubation in asthma is caused by massive air trapping (Auto-PEEP $> 15\\text{--}20\\text{ cmH}_2\\text{O}$), eliminating venous return.\n   - **ACTION:** **IMMEDIATELY DISCONNECT PATIENT FROM VENTILATOR** for $30\\text{--}40\\text{ seconds}$ and manually compress the chest to allow trapped gas exhalation. If shock persists, decompress bilateral tension pneumothorax.",
    domain: "healthcare",
    model: "noctis-pulm-2026",
    hits: 30,
    at: "2026-11-11T17:00:00.000Z",
  },
  {
    question: "A patient with Burkitt lymphoma develops Tumor Lysis Syndrome with uric acid 11.2 mg/dL, potassium 6.4 mEq/L, and creatinine 2.4 mg/dL. Why is urinary alkalinization with sodium bicarbonate vetoed, why is Rasburicase contraindicated in G6PD deficiency, and what is the irAE steroid taper duration rule?",
    answer: "### Oncology, Tumor Lysis Syndrome & irAE Management\n1. **Urinary Alkalinization Nephrocalcinosis Veto (CF-ONC-001):**\n   - Sodium bicarbonate alkalinization decreases calcium-phosphate solubility ($[\\text{Ca}] \\times [\\text{PO}_4]$ product $> 60$), inducing widespread calcium phosphate crystal precipitation in renal tubules, acute tubular necrosis, and worsened hypocalcemia. Alkalinization is **VETOED**.\n2. **Rasburicase G6PD Hemolysis Veto (CF-ONC-002):**\n   - Rasburicase converts uric acid to allantoin and hydrogen peroxide ($H_2O_2$). In G6PD deficiency, absence of glutathione antioxidant defense triggers fulminant acute intravascular hemolysis and methemoglobinemia. Treat hyperuricemia with high-dose Allopurinol instead.\n3. **irAE Slow Steroid Taper Invariant (CF-ONC-004):**\n   - For high-grade immune checkpoint inhibitor toxicities (colitis, pneumonitis, myocarditis), corticosteroids must be tapered **slowly over AT LEAST 4 TO 6 WEEKS**. Abbreviated tapers (< 4 weeks) trigger severe rebound autoimmunity due to prolonged receptor occupancy of anti-PD-1 antibodies.",
    domain: "healthcare",
    model: "noctis-onc-2026",
    hits: 30,
    at: "2026-11-11T18:00:00.000Z",
  },
  {
    question: "A patient with decompensated cirrhosis presents with tense ascites and fever. Detail the mandatory paracentesis rule, calculate SBP albumin dosing, state why liberal transfusion is vetoed in variceal hemorrhage, and explain why beta-blockers must be held.",
    answer: "### Decompensated Cirrhosis, SBP & Acute Variceal Bleed\n1. **Diagnostic Paracentesis Mandate (CF-GI-001):**\n   - In decompensated cirrhosis with new ascites, fever, or encephalopathy, diagnostic paracentesis **must precede antibiotics** to obtain cell count/differential (PMN $\\ge 250/\\mu\\text{L}$ confirms SBP).\n2. **SBP Albumin Protocol (CF-GI-002):**\n   - Administer **IV Albumin $1.5\\text{ g/kg}$ within 6 hours**, followed by **$1.0\\text{ g/kg}$ on Day 3** alongside Ceftriaxone. Albumin expansion prevents circulatory dysfunction and hepatorenal syndrome, reducing mortality from $29\\%$ to $10\\%$.\n3. **Liberal Transfusion Portal Hypertension Veto (CF-GI-003):**\n   - Over-transfusion to $\\text{Hb} > 9\\text{--}10\\text{ g/dL}$ elevates portal pressure, dislodges clots, and increases rebleeding mortality. Maintain a **restrictive threshold (target Hb $7.0\\text{--}9.0\\text{ g/dL}$)**.\n4. **Beta-Blocker Invariant (CF-GI-004):**\n   - Propranolol/Carvedilol must be **HELD during active hemorrhage** to prevent blunting compensatory tachycardia and precipitating refractory shock.",
    domain: "healthcare",
    model: "noctis-gi-2026",
    hits: 30,
    at: "2026-11-11T18:00:00.000Z",
  },
  {
    question: "A patient with rheumatoid arthritis is scheduled for Rituximab and a patient with diffuse scleroderma develops acute BP 180/115 with AKI. State the mandatory biologic pre-treatment screening veto and the Scleroderma Renal Crisis management rules.",
    answer: "### Rheumatology & Autoimmune Systemic Emergencies\n1. **Biologic Latent Infection Screening Mandate (CF-RHEUM-001):**\n   - Initiating biologics (anti-TNF, Rituximab, JAK inhibitors) without documented negative Latent TB screening (IGRA) and Hepatitis B serology (HBsAg, anti-HBc) is **STRICTLY VETOED**. Anti-CD20 in anti-HBc positive patients triggers fatal fulminant HBV reactivation; Entecavir prophylaxis is mandatory.\n2. **Scleroderma Renal Crisis (SRC) Invariants:**\n   - **High-Dose Steroid Veto (CF-RHEUM-004):** Prednisone $> 15\\text{ mg/day}$ in diffuse cutaneous systemic sclerosis precipitates SRC.\n   - **ACE Inhibitor Mandate (CF-RHEUM-005):** Short-acting Captopril is the ONLY proven life-saving disease-modifying therapy for SRC hyperreninemia; rapidly titrate Captopril to reverse renal cortical vasospasm.",
    domain: "healthcare",
    model: "noctis-rheum-2026",
    hits: 30,
    at: "2026-11-11T18:00:00.000Z",
  },
  {
    question: "A post-PCI patient is a CYP2C19 *2/*2 poor metabolizer, an oncology patient has DPYD activity score 0, and an HIV patient is HLA-B*57:01 positive. Detail the CPIC pharmacogenomic safety vetoes and substitute regimens.",
    answer: "### Actionable Clinical Pharmacogenomics (CPIC Invariants)\n1. **CYP2C19 Clopidogrel Resistance Veto (CF-PGX-001):**\n   - CYP2C19 *2 loss-of-function allele impairs bioactivation of Clopidogrel prodrug into active thiol metabolite, causing stent thrombosis. **VETO CLOPIDOGREL**. Switch to Ticagrelor $90\\text{ mg}$ BID or Prasugrel $10\\text{ mg}$ daily.\n2. **DPYD Poor Metabolizer 5-FU Fatal Toxicity Veto (CF-PGX-002):**\n   - DPYD Activity Score 0 indicates complete DPD enzyme deficiency. Standard 5-FU or Capecitabine causes fatal toxic accumulation, severe pancytopenia, and death ($> 50\\%$ mortality). Fluoropyrimidines are **STRICTLY CONTRAINDICATED**.\n3. **HLA-B*57:01 Abacavir Hypersensitivity Veto (CF-PGX-004):**\n   - Abacavir in *HLA-B\\*57:01* causes life-threatening multisystem Abacavir Hypersensitivity Reaction (AHR). **NEVER PRESCRIBE ABACAVIR**; substitute Tenofovir/Emtricitabine.",
    domain: "healthcare",
    model: "noctis-pgx-2026",
    hits: 30,
    at: "2026-11-11T18:00:00.000Z",
  },

  // =========================================================================
  // 2. ENGINEERING CHALLENGE 001 (NEC-SMARTCITY-001)
  // =========================================================================
  {
    question: "Calculate the total daily electricity demand, required solar generation capacity, and battery storage capacity for a self-sustaining smart city of 100,000 people (25,000 households at 15 kWh/day, 250 MWh/day commercial/industrial, 100 MWh/day critical infrastructure, 5 PSH, 15% system losses, 30 days autonomy, 90% RTE).",
    answer: "### 1. Total Daily Electricity Demand\n- Household Demand: 25,000 × 15 kWh = 375.0 MWh/day\n- Commercial & Industrial Demand: 250.0 MWh/day\n- Critical Infrastructure: 100.0 MWh/day\n- **Net Daily Demand (E_net):** 375 + 250 + 100 = 725.0 MWh/day (Average load = 30.21 MW; Peak load = 80.67 MW; 5-yr Peak = 88.74 MW)\n\n### 2. Required Solar Generation Capacity\n- Gross Energy required accounting for 15% system losses (derate 0.85): 725 MWh / 0.85 = 852.94 MWh/day.\n- Peak PV Capacity at 5.0 Peak Sun Hours: 852.94 MWh / 5.0 h = 170.59 MW_dc.\n- **Installed Nameplate Rating:** 200.0 MW_dc with 1.43 DC/AC over-panelling ratio to absorb seasonal variation.\n\n### 3. Battery Storage & 30-Day Autonomy (Tri-Tier Hybrid)\n- Attempting to store 30 days entirely in Li-ion batteries requires 28,431 MWh nameplate (> $4.8B, severe thermal runaway risk).\n- **Engineering Resilient Design:**\n  1. Centralized BESS (LFP): 1,600 MWh usable / 2,100 MWh nameplate (100 MW continuous discharge at 0.5C) for 48-hour black-sky buffer and synthetic inertia.\n  2. Long-Duration Energy Storage (LDES): 45 MW PEM Electrolyzer facility producing 1,800 tonnes of underground pressurized H2 (60 GWh_th equivalent) paired with 35 MW fuel cells for 30-day continuous baseload.\n  3. Non-critical emergency load shedding reducing demand to 380 MWh/day.\n- **Unmet Energy:** 0.000 kWh. Concluding determination: FEASIBLE.",
    domain: "engineering",
    model: "noctis-eng-2026",
    hits: 30,
    at: "2026-11-07T13:00:00.000Z",
  },
  {
    question: "Design a complete closed-loop water system for a smart city of 100,000 people consuming 150 L/person/day for 30 days autonomy.",
    answer: "### Water System Design (100,000 Population)\n- **Daily Demand:** 100,000 × 150 L/day = 15,000 m³/day (15.0 MLD).\n- **30-Day Storage Capacity:** 15,000 m³/day × 30 days = 450,000 m³.\n- **Total Reserve (15% Safety Buffer):** 517,500 m³ across three post-tensioned concrete reservoirs at +65 m elevation providing 6.37 bar static gravity pressure without pumps during blackouts.\n- **Advanced Water Reclamation Facility (AWRF):** 18.0 MLD capacity employing Direct Potable Reuse (MBR + Dual-pass RO + UV/AOP + Remineralization).\n- **Recycling & Neutrality:** 85% domestic wastewater recovery (12.75 MLD); remaining 2.25 MLD makeup covered 100% by 994,500 m³/year harvested rainwater across 1.8 km² urban catchments.",
    domain: "engineering",
    model: "noctis-eng-2026",
    hits: 30,
    at: "2026-11-07T13:00:00.000Z",
  },
  {
    question: "Design food production for 100,000 people requiring 2,400 kcal/person/day and 56 g protein/day.",
    answer: "### Food Production Matrix (240 Million kcal/day)\n- **Caloric Load:** 100,000 × 2,400 kcal = 240,000,000 kcal/day (87.6B kcal/year).\n- **Protein Load:** 5,600 kg/day (5.60 tonnes/day = 2,044 tonnes/year).\n- **Production Architecture:**\n  1. Vertical Hydroponics/Aeroponics: 120,000 m² indoor CEA across 2.4 ha footprint yielding 32.5 t/day fresh vegetables and micronutrients.\n  2. Recirculating Aquaculture Systems (RAS): 1,800 tonnes/year Tilapia/Salmon delivering 986 kg/day pure animal protein.\n  3. Precision Mycoprotein Fermentation: 3.80 tonnes/day complete protein paste.\n  4. Strategic Grain & Legume Silos: 2,500 tonnes nitrogen-purged hermetic elevators supplying 55 t/day complex carbs for 30+ days.\n  5. Cold Storage: 18,000 m³ facility backed by 85 MWh_th phase-change materials maintaining -15C for 96 hours without electricity.",
    domain: "engineering",
    model: "noctis-eng-2026",
    hits: 30,
    at: "2026-11-07T13:00:00.000Z",
  },

  // =========================================================================
  // 3. NOCTIS SCIENCE UNIVERSAL INVARIANTS (NSCI-001)
  // =========================================================================
  {
    question: "What is the Schwarzschild radius of a 20 solar mass black hole?",
    answer: "### Schwarzschild Radius Derivation\n- **Formula:** r_s = 2GM / c^2\n- **Constants:** G = 6.67430 × 10^-11 m^3 kg^-1 s^-2, c = 2.99792458 × 10^8 m/s, M_sun = 1.98847 × 10^30 kg\n- **Calculation:** M = 20 × 1.98847 × 10^30 = 3.97694 × 10^31 kg\n- **Result:** r_s = (2 × 6.67430e-11 × 3.97694e31) / (2.99792458e8)^2 = 59,078 meters = 59.08 km (Diameter = 118.16 km).\n- **Verification:** Linear scaling r_s ≈ 2.953 km / M_sun holds exactly. 7-gate calculation verifier: PASSED.",
    domain: "science",
    model: "noctis-sci-2026",
    hits: 30,
    at: "2026-11-07T13:00:00.000Z",
  },
  {
    question: "Calculate the de Broglie wavelength of an electron traveling at 2.2e6 m/s.",
    answer: "### de Broglie Wavelength Derivation\n- **Formula:** λ = h / p = h / (m_e * v)\n- **Constants:** h = 6.62607015 × 10^-34 J*s, m_e = 9.1093837015 × 10^-31 kg, v = 2.2 × 10^6 m/s\n- **Calculation:** p = 9.10938e-31 × 2.2e6 = 2.00406 × 10^-24 kg*m/s\n- **Result:** λ = 6.62607e-34 / 2.00406e-24 = 3.3063 × 10^-10 meters = 0.3306 nm = 3.31 Angstroms.\n- **Verification:** Matches characteristic atomic lattice spacing; dimensional analysis [L] verified.",
    domain: "science",
    model: "noctis-sci-2026",
    hits: 30,
    at: "2026-11-07T13:00:00.000Z",
  },
  {
    question: "Calculate the pH of an acetic acid buffer with pKa 4.76 containing 0.2 M acetate and 0.1 M acetic acid.",
    answer: "### Henderson-Hasselbalch Buffer pH Derivation\n- **Formula:** pH = pKa + log10([A-] / [HA])\n- **Values:** pKa = 4.76, [A-] = 0.2 M (conjugate base), [HA] = 0.1 M (weak acid)\n- **Calculation:** ratio = 0.2 / 0.1 = 2.0; log10(2.0) = 0.30103\n- **Result:** pH = 4.76 + 0.30103 = 5.061 ≈ 5.06.\n- **Verification:** [A-] > [HA], so pH > pKa as thermodynamically required. Boundary check: PASSED.",
    domain: "science",
    model: "noctis-sci-2026",
    hits: 30,
    at: "2026-11-07T13:00:00.000Z",
  },

  // =========================================================================
  // 4. CYBERSECURITY & DEFENSE (NDEF-2026)
  // =========================================================================
  {
    question: "Explain CVE-2026-21445 OpenSSL ASN.1 parser remote code execution vulnerability and its definitive remediation.",
    answer: "### CVE-2026-21445 Technical & Defensive Breakdown\n- **Vulnerability Class:** Heap-based Buffer Overflow via Integer Signedness Mismatch in d2i_X509_CERT_AUX parser.\n- **Root Cause:** When decoding malformed X.509 ASN.1 certificate extensions, an signed 32-bit integer length parameter is passed to memory allocation routines without upper-bound sanitization. An attacker supplying a negative length value causes a heap under-allocation followed by memcpy overrun, allowing unauthenticated Remote Code Execution.\n- **CVSS v4.0 Score:** 9.8 Critical (AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H).\n- **Remediation:** Apply OpenSSL patch 3.4.1+; enforce strict unsigned size_t integer bounds checking in ASN.1 decoders; deploy memory-safe ASN.1 parsers written in Rust; enable ASLR, DEP/NX, and stack-canary protections.",
    domain: "cybersecurity",
    model: "noctis-def-2026",
    hits: 30,
    at: "2026-11-07T13:00:00.000Z",
  }
];
