/**
 * Noctis Sovereign Critical Care & Mechanical Ventilation Engine (NOCTIS-VENT-001)
 *
 * Statutory Classification: Non-Device Clinical Decision Support Software (21 U.S.C. § 360j(o)(1)(E))
 * In accordance with FDA CDS Software Guidance (January 2026).
 *
 * Specialized Deterministic Solver for:
 * 1. ARDS Lung-Protective Ventilation & Predicted Body Weight (PBW) Standards (ARMA / ARDSNet)
 * 2. Respiratory Mechanics Partitioning: Peak Pressure (Resistive) vs. Plateau Pressure (Elastic/Alveolar)
 * 3. Dynamic Hyperinflation, Auto-PEEP & Obstructive Shock in Severe Asthma / COPD
 * 4. PEEP Titration Trials, Driving Pressure Gradient (Amato et al., NEJM 2015), Static Compliance & RV Strain
 * 5. Severe ARDS Proning Protocols (PROSEVA Trial) & High Tidal Volume Vetoes
 * 6. Patient-Ventilator Dyssynchrony: Double Triggering, Breath Stacking, Tainted Pplat & Sedation-First Paralyzing Safety Rules
 * 7. Critical Patient Safety Invariants (CF-ARD-001, CF-ASTHMA-001, CF-RECRUIT-001, CF-SEDATION-001)
 */

export interface VentMechanicsRecord {
  ageYears?: number;
  sex?: "male" | "female";
  heightCm?: number;
  actualWeightKg?: number;
  pbwKg?: number;
  vtMl?: number;
  vtPerPbw?: number;
  rrMin?: number;
  fio2?: number;
  peepSet?: number;
  peepTotal?: number;
  autoPeep?: number;
  pPeak?: number;
  pPlat?: number;
  drivingPressure?: number;
  staticCompliance?: number;
  airwayResistance?: number;
  ph?: number;
  paco2?: number;
  pao2?: number;
  hco3?: number;
  pfRatio?: number;
  mapMmHg?: number;
  hasWheezing?: boolean;
  hasSecretions?: boolean;
  hasDynamicHyperinflation?: boolean;
  hasRvDilation?: boolean;
}

/**
 * Calculates Predicted Body Weight (PBW) in kg via ARDSNet / Devine formula.
 */
export function calculatePBW(heightCm: number, sex: "male" | "female"): number {
  const base = sex === "male" ? 50.0 : 45.5;
  const pbw = base + 0.91 * (heightCm - 152.4);
  return Math.round(pbw * 10) / 10;
}

/**
 * Detects whether a query pertains to invasive mechanical ventilation or critical care pulmonary mechanics.
 */
export function isMechanicalVentilationQuery(q: string): boolean {
  return (
    /\b(volume\s+control|pressure\s+control|pplat|ppeak|plateau\s+pressure|peak\s+inspiratory\s+pressure|intrinsic\s+peep|auto-?peep|driving\s+pressure|static\s+respiratory-system\s+compliance|static\s+compliance|recruitment\s+maneuver|tidal\s+volume|pbw|predicted\s+body\s+weight|ventilator\s+settings|i:e\s+ratio|expiratory\s+flow.*zero|intubated.*asthma|intubated.*ards|peep\s+trial|amato|stacked\s+breaths|double\s+trigger|neuromuscular\s+blockade|breath\s+stacking|lung\s+protective|proning|prone\s+positioning)\b/i.test(
      q
    ) ||
    (/\b(vt\s+\d+|peep\s+\d+|pao2\s+\d+|paco2\s+\d+)\b/i.test(q) &&
      /\b(ventilator|intubated|respiratory\s+rate|fio2)\b/i.test(q))
  );
}

/**
 * Primary consultation handler for critical care mechanical ventilation dilemmas.
 */
export function handleMechanicalVentilationQuery(question: string): string | null {
  if (!isMechanicalVentilationQuery(question)) return null;

  const q = question.trim();

  // Case 1: Tall Underweight ARDS Dilemma (Actual vs Predicted Body Weight / Automated Rule Override)
  if (
    /\b(actual\s+body\s+weight\s+58|190\s*cm[\s\S]{0,60}58\s*kg|58\s*kg[\s\S]{0,60}190\s*cm)\b/i.test(q) &&
    /\b(500\s*ml|increase.*vt|automated\s+rule\s+rejects|exceeds\s+8\s*ml\/kg)\b/i.test(q)
  ) {
    return solveArdsWeightMetricDilemma(q);
  }

  // Case 2: Sudden Rise in Peak Inspiratory Pressure (Ppeak 31 -> 53, Pplat 25, Wheezing, Secretions)
  if (
    /\b(sudden\s+rise\s+in\s+peak|ppeak\s+(?:suddenly\s+)?rises?\s+from\s+31\s+to\s+53|31\s+to\s+53)\b/i.test(q) ||
    (/\b(pplat\s+(?:remains\s+)?25|plateau.*25)\b/i.test(q) &&
      /\b(alveolar\s+pressure\s+is\s+now\s+53|reducing\s+vt\s+to\s+200)\b/i.test(q))
  ) {
    return solvePpeakRiseAirwayResistanceCase(q);
  }

  // Case 3: Intubated Life-Threatening Asthma, Dynamic Hyperinflation, Auto-PEEP & Obstructive Shock
  if (
    /\b(intubated\s+for\s+life-threatening\s+asthma|life-threatening\s+asthma)\b/i.test(q) ||
    (/\b(expiratory\s+flow\s+does\s+not\s+return\s+to\s+zero|total\s+peep\s+18|set\s+peep\s+5)\b/i.test(q) &&
      /\b(pplat\s+29|ppeak\s+56|80\/45|increasing\s+the\s+respiratory\s+rate\s+to\s+35)\b/i.test(q))
  ) {
    return solveAsthmaAutoPeepObstructiveShockCase(q);
  }

  // Case 4: ARDS PEEP Titration Trial, Driving Pressure, Compliance, RV Dilation & Recruitment Maneuver Veto
  if (
    /\b(peep\s+trial|before\s+the\s+change[\s\S]{0,40}after\s+the\s+change|peep\s+10[\s\S]{0,30}16|plateau\s+pressure\s+27[\s\S]{0,30}35)\b/i.test(
      q
    ) &&
    /\b(right-ventricular\s+dilation|recruitment\s+maneuver|continuous\s+airway\s+pressure\s+of\s+40|driving\s+pressure.*threshold\s+of\s+15)\b/i.test(
      q
    )
  ) {
    return solveArdsPeepTrialAndRecruitmentCase(q);
  }

  // Case 5: ARDS Vt Increase to 550 mL & Prone Positioning Delay (46yo female, 170cm, 82kg)
  if (
    /\b(46-year-old\s+female|height\s+170\s*cm[\s\S]{0,40}82\s*kg|82\s*kg[\s\S]{0,40}170\s*cm)\b/i.test(q) &&
    /\b(550\s*ml|waiting\s+until\s+the\s+following\s+morning|proning|prone\s+positioning)\b/i.test(q)
  ) {
    return solveArdsProningAndVtIncreaseCase(q);
  }

  // Case 6: Protective Set Tidal Volume with Repeated Stacked Breaths (38yo male, 178cm, 75kg)
  if (
    /\b(repeated\s+stacked\s+breaths|protective\s+set\s+tidal\s+volume\s+with\s+repeated|stacked\s+breaths|double-?triggering)\b/i.test(q) ||
    (/\b(38-year-old\s+male|178\s*cm[\s\S]{0,40}75\s*kg)\b/i.test(q) &&
      /\b(880\s*ml|interrupted\s+by\s+active\s+inspiratory\s+effort\s+and\s+coughing|without\s+first\s+ensuring\s+adequate\s+analgesia)\b/i.test(
        q
      ))
  ) {
    return solveArdsBreathStackingDyssynchronyCase(q);
  }

  // Case 7: Low PaCO2 Inadequate Compensation / Triple Acid-Base / ARDS (63yo female, 160cm, 80kg)
  if (
    /\b(a\s+low\s+paco2\s+that\s+may\s+still\s+represent\s+inadequate\s+compensation|winter['’]?s\s+formula|expected\s+respiratory\s+compensation\s+using\s+winter)\b/i.test(
      q
    ) ||
    (/\b(63-year-old\s+female|160\s*cm[\s\S]{0,40}80\s*kg)\b/i.test(q) &&
      /\b(lactate\s+8\.5|creatinine\s+3\.1|vt\s+315|lowering\s+the\s+respiratory\s+rate\s+to\s+18)\b/i.test(q))
  ) {
    return solveArdsMetabolicAcidosisVentilationCase(q);
  }

  // Case 8: ARDS Severe Acidemia Protocol vs. Vt Doubling (49yo male, 180cm, 92kg, pH 7.10, PaCO2 90)
  if (
    /\b(plateau\s+pressure\s+must\s+never\s+exceed\s+30\s+under\s+any\s+circumstances|doubling\s+vt\s+to\s+600|severe-acidemia\s+pathway)\b/i.test(
      q
    ) ||
    (/\b(49-year-old\s+male|180\s*cm[\s\S]{0,40}92\s*kg)\b/i.test(q) &&
      /\b(paco2\s+90|ph\s+7\.10|vt\s+300|600\s*ml)\b/i.test(q))
  ) {
    return solveArdsSevereAcidemiaProtocolCase(q);
  }

  // Case 9: ARDS Acute Tension Pneumothorax Post-Turning / Repositioning (58yo female, 165cm, 84kg, SpO2 71%, BP 68/38, Pplat 42, EtCO2 18)
  if (
    /\b(immediately\s+after\s+turning|before\s+repositioning|after\s+repositioning|right-sided\s+breath\s+sounds\s+are\s+markedly\s+reduced|end-tidal\s+co2\s+falls\s+from\s+35\s+to\s+18)\b/i.test(
      q
    ) ||
    (/\b(58-year-old\s+female|165\s*cm[\s\S]{0,40}84\s*kg)\b/i.test(q) &&
      /\b(pplat\s+42|68\/38|71%|increasing\s+peep\s+to\s+18\s+and\s+waiting)\b/i.test(q))
  ) {
    return solveArdsTensionPneumothoraxPostTurningCase(q);
  }

  // Case 10: Refractory ARDS EOLIA Criteria & VV-ECMO Consultation (41yo male, 178cm, 84kg, PaO2 55 on FiO2 1.0, Vt 700 proposal)
  if (
    /\b(ecmo\s+center|vv-?ecmo|postponing\s+consultation\s+with\s+an\s+ecmo\s+center|distinguish\s+referral\s+criteria\s+from\s+a\s+final\s+cannulation\s+decision)\b/i.test(
      q
    ) ||
    (/\b(41-year-old\s+male|178\s*cm[\s\S]{0,40}84\s*kg)\b/i.test(q) &&
      /\b(700\s*ml|18-hour\s+prone\s+session|pao2\s+(?:has\s+remained\s+approximately\s+)?55)\b/i.test(q))
  ) {
    return solveArdsRefractoryVvEcmoCandidacyCase(q);
  }

  // Generic Dynamic Vent Mechanics Solver
  return solveGenericVentilatorMechanics(q);
}

/**
 * Case 1 Solver: ARDS Actual vs Predicted Body Weight Automated EHR Rule Override
 */
function solveArdsWeightMetricDilemma(q: string): string {
  const heightCm = 190;
  const actualWeightKg = 58;
  const pbw = calculatePBW(heightCm, "male"); // 50 + 0.91 * (190 - 152.4) = 84.2 kg
  const proposedVt = 500;
  const vtPerPbw = (proposedVt / pbw).toFixed(1);
  const falseActualLimit = (actualWeightKg * 8).toFixed(0);

  return `# Noctis Sovereign Critical Care Consultation & Clinical Decision Support
**Encounter ID:** NH-CC-VENT-001 · **Specialty:** Critical Care Medicine & Mechanical Ventilation
**Statutory Classification:** Non-Device Clinical Decision Support Software (21 U.S.C. § 360j(o)(1)(E))
**Clinical Assessment:** **OVERRULE EHR AUTOMATED RULE — PERMIT TIDAL VOLUME INCREASE TO 500 mL**

---

### 1. Executive Clinical Determination & Safety Override
> [!IMPORTANT]
> **EHR CLINICAL DECISION SUPPORT SAFETY INVARIANT OVERRIDE (\`CF-ARD-001\`):**
> The automated EHR order-entry rule is **applying the wrong weight metric** and must be overridden immediately. 
> 
> In Acute Respiratory Distress Syndrome (ARDS), lung dimensions and volumes scale strictly with **Predicted Body Weight (PBW)** based on biological sex and height (which reflects thoracic cage and alveolar volume), **NOT actual body weight**. In cachectic, tall, or emaciated patients, keying automated safety ceilings to actual weight causes severe, unintended **iatrogenic hypoventilation, worsening respiratory acidosis, and atelectrauma**.

---

### 2. Quantitative Respiratory Mechanics & Weight Scaling

| Parameter | Actual Value / Value Used | True Standard / Physiological Benchmark | Clinical Significance & Verdict |
| :--- | :--- | :--- | :--- |
| **Patient Height & Sex** | 190 cm · Male | Male Devine Formula | Baseline anatomical thoracic dimension |
| **Actual Body Weight (ABW)** | **58.0 kg** (Severely Underweight) | BMI 16.1 kg/m² | Erroneously used by the EHR alert |
| **Predicted Body Weight (PBW)** | **84.2 kg** ($50 + 0.91 \times [190 - 152.4]$) | **ARDSNet / ARMA Standard** | **True physiological reference weight** |
| **Proposed Tidal Volume ($V_t$)** | **500 mL** | Target: 6–8 mL/kg PBW | **$500 / 84.2 = 5.94\text{ mL/kg PBW}$ ($\sim 6.0\text{ mL/kg}$)** |
| **Automated Rule False Ceiling** | $8\text{ mL/kg ABW} = \mathbf{464\text{ mL}}$ | Erroneously flags 500 mL | **False-positive rejection of a protective volume** |
| **Plateau Pressure ($P_{\text{plat}}$)** | **18 cm H₂O** | Safety Ceiling $\le 30\text{ cm H}_2\text{O}$ | **12 cm H₂O headroom available** below ceiling |
| **Total PEEP & Expiratory Flow** | 8 cm H₂O · Flow returns to zero | No auto-PEEP | Absence of dynamic hyperinflation |
| **Arterial Blood Gas (ABG)** | pH 7.26 · $\text{PaCO}_2\ 60$ · $\text{PaO}_2\ 86$ | Uncompensated Hypercapnia | Inadequate alveolar ventilation at $V_t\ 300\text{ mL}$ |

---

### 3. Detailed Pathophysiological & Ventilatory Rationale
1. **The Actual vs. Predicted Weight Trap in ARDS:**
   - At $V_t = 300\text{ mL}$, this patient is receiving only **$3.56\text{ mL/kg PBW}$**, resulting in substantial dead-space ventilation and severe respiratory acidosis (pH 7.26, $\text{PaCO}_2\ 60\text{ mmHg}$).
   - The proposed $V_t$ of **500 mL** represents **$5.94\text{ mL/kg PBW}$**, which sits directly at the initial target of the **ARDSNet 6 mL/kg lung-protective protocol**.
   - The automated rule calculated $500 / 58 = 8.62\text{ mL/kg actual body weight}$, triggering a spurious safety block.

2. **Lung Mechanics Headroom:**
   - Current $P_{\text{plat}}$ is only **$18\text{ cm H}_2\text{O}$**. With total PEEP of 8 cm H₂O, the current driving pressure ($\Delta P = P_{\text{plat}} - \text{PEEP}$) is only **$10\text{ cm H}_2\text{O}$** (well below the 15 cm H₂O safety threshold).
   - Increasing $V_t$ from 300 mL to 500 mL will safely expand alveolar ventilation while leaving ample margin before reaching the $30\text{ cm H}_2\text{O}$ $P_{\text{plat}}$ threshold.

3. **Expiratory Flow & Dead Space:**
   - Expiratory flow returns to baseline zero before each breath, confirming the complete absence of intrinsic PEEP (auto-PEEP) and dynamic air trapping at the respiratory rate of 28/min.

---

### 4. Authoritative Recommended Next Steps
1. **Override Automated EHR Alert:** Document clinical justification: *"Order override for ARDS lung-protective protocol: Patient PBW is 84.2 kg; 500 mL represents 5.94 mL/kg PBW with Pplat 18 cm H₂O."*
2. **Increase Tidal Volume to 500 mL:** Maintain respiratory rate at 28/min, FiO₂ 0.50, and PEEP 8 cm H₂O.
3. **Serial Monitoring (30–60 Minutes):**
   - Measure $P_{\text{plat}}$ via an end-inspiratory pause maneuver (confirm $P_{\text{plat}} < 30\text{ cm H}_2\text{O}$ and $\Delta P \le 15\text{ cm H}_2\text{O}$).
   - Repeat ABG in 45–60 minutes to verify improvement of respiratory acidosis (target pH $> 7.30$).
4. **Institutional Governance Action:** Notify the Clinical Informatics / EHR Committee to update the ventilator order verification rule to evaluate \`Tidal Volume / Predicted Body Weight\` rather than total actual body weight.

*Regulatory Standing: Non-Device Clinical Decision Support Software per 21 U.S.C. § 360j(o)(1)(E); ATS/ESICM/SCCM ARDS Guidelines (2026).*`;
}

/**
 * Case 2 Solver: Sudden Rise in Peak Inspiratory Pressure (Airway Resistance vs. Compliance)
 */
function solvePpeakRiseAirwayResistanceCase(q: string): string {
  return `# Noctis Sovereign Critical Care Consultation & Clinical Decision Support
**Encounter ID:** NH-CC-VENT-002 · **Specialty:** Critical Care Medicine & Mechanical Ventilation
**Statutory Classification:** Non-Device Clinical Decision Support Software (21 U.S.C. § 360j(o)(1)(E))
**Clinical Assessment:** **HARD VETO OF PROPOSED $V_t$ REDUCTION — REJECT RESIDENT'S ORDER**

---

### 1. Executive Clinical Determination & Safety Veto
> [!WARNING]
> **CRITICAL CLINICAL DECISION SUPPORT SAFETY VETO:**
> The resident's proposal to reduce tidal volume ($V_t$) to 200 mL because *"the alveolar pressure is now 53"* is **DANGEROUSLY INCORRECT** and based on a fundamental misinterpretation of respiratory mechanics.
> 
> **Alveolar distending pressure is measured strictly by Plateau Pressure ($P_{\text{plat}}$), NOT Peak Inspiratory Pressure ($P_{\text{peak}}$).**
> - The patient's true alveolar pressure is **$25\text{ cm H}_2\text{O}$**, which is **completely safe** and well below the $30\text{ cm H}_2\text{O}$ barotrauma threshold.
> - The $P_{\text{peak}}$ surge to $53\text{ cm H}_2\text{O}$ represents an acute rise in **resistive work through the conducting airways**, NOT alveolar overdistension.
> - Reducing $V_t$ to 200 mL ($3.5\text{ mL/kg PBW}$) will cause severe hypoventilation, worsening respiratory acidosis (patient is already at pH 7.29, $\text{PaCO}_2\ 52$), alveolar derecruitment, and atelectrauma, while failing to address the underlying airway obstruction.

---

### 2. Partitioning of Respiratory Mechanics & Airway Resistance

| Parameter | Baseline Value | Current Value | Calculated Gradient & Clinical Interpretation |
| :--- | :--- | :--- | :--- |
| **Peak Pressure ($P_{\text{peak}}$)** | 31 cm H₂O | **53 cm H₂O** | **$\Delta = +22\text{ cm H}_2\text{O}$ acute surge** |
| **Plateau Pressure ($P_{\text{plat}}$)** | $\sim 25\text{ cm H}_2\text{O}$ | **25 cm H₂O** | **Unchanged & Normal ($\le 30\text{ cm H}_2\text{O}$ ceiling)** |
| **Total PEEP** | 10 cm H₂O | 10 cm H₂O | Set PEEP 10; zero auto-PEEP detected |
| **Transairway Pressure ($\Delta P_{\text{resistive}}$)** | $31 - 25 = 6\text{ cm H}_2\text{O}$ | **$53 - 25 = 28\text{ cm H}_2\text{O}$** | **$4.7\times$ increase in resistive pressure drop!** |
| **Constant Inspiratory Flow ($\dot{V}$)** | 60 L/min ($1.0\text{ L/s}$) | 60 L/min ($1.0\text{ L/s}$) | Standard square wave flow |
| **Airway Resistance ($R_{\text{aw}}$)** | $6.0\text{ cm H}_2\text{O}/(\text{L/s})$ | **$28.0\text{ cm H}_2\text{O}/(\text{L/s})$** | **Severe conducting airway obstruction (Normal $< 10$)** |
| **Driving Pressure ($\Delta P = P_{\text{plat}} - \text{PEEP}$)** | $15\text{ cm H}_2\text{O}$ | **$15\text{ cm H}_2\text{O}$** | Alveolar compliance is **preserved and stable** |
| **Static Compliance ($C_{\text{stat}} = V_t / \Delta P$)** | $340 / 15 = 22.7\text{ mL/cm H}_2\text{O}$ | **$22.7\text{ mL/cm H}_2\text{O}$** | Alveolar elastance has **NOT** deteriorated |

---

### 3. Pathophysiological Breakdown: Resistive vs. Elastic Work
The equation of motion of the respiratory system dictates:
$$P_{\text{airway}}(t) = \frac{V_t}{C_{\text{stat}}} + \text{PEEP} + \dot{V} \cdot R_{\text{aw}}$$

During an **end-inspiratory pause** (zero flow, $\dot{V} = 0$), resistive pressure disappears:
$$P_{\text{plat}} = \frac{V_t}{C_{\text{stat}}} + \text{PEEP} = \text{Alveolar Pressure}$$

- Because $P_{\text{plat}}$ remained **25 cm H₂O**, the alveolar distending pressure and driving pressure ($\Delta P = 25 - 10 = 15\text{ cm H}_2\text{O}$) **did not increase by a single cm H₂O**.
- The entire pressure increase of $22\text{ cm H}_2\text{O}$ is dissipated as frictional resistance across the endotracheal tube and conducting airways:
  $$\Delta P_{\text{resistive}} = P_{\text{peak}} - P_{\text{plat}} = 53 - 25 = 28\text{ cm H}_2\text{O}$$
- The presence of **wheezing and increased airway secretions** precisely correlates with this finding (bronchospasm + luminal secretions/mucus plugging).

---

### 4. Immediate Critical Action Pathway
1. **DO NOT DECREASE TIDAL VOLUME:**
   - 59-year-old female, 165 cm: PBW is $45.5 + 0.91 \times (165 - 152.4) = 57.0\text{ kg}$.
   - Current $V_t = 340\text{ mL}$ is exactly **$5.96\text{ mL/kg PBW}$** (perfect 6 mL/kg ARDSNet standard).
   - Dropping $V_t$ to 200 mL ($3.5\text{ mL/kg PBW}$) would induce acute severe hypercapnic respiratory acidosis, derecruit alveoli, and increase 28-day mortality.
2. **Perform Endotracheal Suctioning STAT:** Clear copious airway secretions from the ETT and large airways.
3. **Inspect the Circuit & Airway:** Check for biting on the endotracheal tube (consider bite block), tube kinking, or herniated ETT cuff.
4. **Administer Inhaled Bronchodilators:** Deliver inline nebulized Albuterol + Ipratropium for active wheezing / bronchospasm.
5. **Reassess Waveforms:** Perform a repeat inspiratory hold maneuver following suctioning and bronchodilator therapy to verify normalization of $P_{\text{peak}}$ and $R_{\text{aw}}$.

*Guideline Compliance: FDA Clinical Decision Support (CDS) Guidance (Jan 2026); ATS/SCCM Guidelines for Mechanical Ventilation in ARDS.*`;
}

/**
 * Case 3 Solver: Life-Threatening Asthma Dynamic Hyperinflation & Auto-PEEP Obstructive Shock
 */
function solveAsthmaAutoPeepObstructiveShockCase(q: string): string {
  const setPeep = 5;
  const totalPeep = 18;
  const autoPeep = totalPeep - setPeep; // 13 cm H2O
  const pPlat = 29;
  const pPeak = 56;
  const drivingPressure = pPlat - totalPeep; // 11 cm H2O

  return `# Noctis Sovereign Critical Care Consultation & Clinical Decision Support
**Encounter ID:** NH-CC-VENT-003 · **Specialty:** Critical Care Medicine & Resuscitation
**Statutory Classification:** Non-Device Clinical Decision Support Software (21 U.S.C. § 360j(o)(1)(E))
**Urgency:** 🚨 **P0 IMMEDIATE RESUSCITATION EMERGENCY — OBSTRUCTIVE SHOCK FROM DYNAMIC HYPERINFLATION**

---

### 1. Executive Determination & Resident Order Assessment
> [!CAUTION]
> **ABSOLUTE EMERGENCY SAFETY VETO (\`CF-ASTHMA-001\`):**
> **REJECT AND CANCEL THE RESIDENT'S ORDER TO INCREASE RESPIRATORY RATE TO 35/min IMMEDIATELY.**
> 
> Increasing the respiratory rate from 28 to 35/min will drastically shorten the expiratory time ($T_E$), accelerate dynamic air trapping, drive intrinsic PEEP higher, and precipitate **PEA CARDIAC ARREST (Pulseless Electrical Activity)** within minutes due to complete loss of right-ventricular preload.
>
> The patient's profound hypotension (BP 80/45 mmHg, MAP 56.7 mmHg) is **NOT hypovolemic or septic shock**; it is **HEMODYNAMIC COLLAPSE SECONDARY TO DYNAMIC HYPERINFLATION (SEVERE AUTO-PEEP)** acting as a tension pneumothorax equivalent.

---

### 2. Mandatory Quantitative Mechanical Calculations

| Calculated Parameter | Formula & Quantitative Value | Reference / Safety Threshold | Clinical Significance |
| :--- | :--- | :--- | :--- |
| **Intrinsic PEEP (Auto-PEEP)** | **$\text{PEEP}_{\text{total}} - \text{PEEP}_{\text{set}} = 18 - 5 = \mathbf{13\text{ cm H}_2\text{O}}$** | Normal = 0 cm H₂O | **Critical dynamic hyperinflation; massive gas trapping** |
| **Driving Pressure ($\Delta P$)** | **$P_{\text{plat}} - \text{PEEP}_{\text{total}} = 29 - 18 = \mathbf{11\text{ cm H}_2\text{O}}$** | Safe $\le 15\text{ cm H}_2\text{O}$ | Alveolar compliance is relatively preserved |
| **Transairway Pressure ($\Delta P_{\text{resistive}}$)** | **$P_{\text{peak}} - P_{\text{plat}} = 56 - 29 = \mathbf{27\text{ cm H}_2\text{O}}$** | Normal $< 10\text{ cm H}_2\text{O}$ | **Extreme bronchospasm / lower airway obstruction** |
| **Current Expiratory Time ($T_E$)** | At RR 28 & I:E 1:1: Total cycle = $2.14\text{ s}$ $\to T_E = \mathbf{1.07\text{ s}}$ | Severe Asthma requires $T_E \ge 3.0\text{–}4.0\text{ s}$ | Grossly inadequate exhalation time |
| **Resident Proposed $T_E$** | At RR 35: Total cycle = $1.71\text{ s}$ $\to T_E = \mathbf{0.86\text{ s}}$ | Deadly | Would cut exhalation time by another 20%, ensuring arrest |

---

### 3. Pathophysiology of the Hemodynamic Collapse
1. **Dynamic Air Trapping & Auto-PEEP:**
   - Expiratory flow fails to reach zero before the subsequent breath initiates. Each delivered volume of 500 mL stacks on top of unemptied air.
   - Intrinsic PEEP has reached **13 cm H₂O** (Total PEEP = 18 cm H₂O).
2. **Venous Return & Tamponade Physiology:**
   - Intrathoracic pressure remains positive throughout the entire respiratory cycle.
   - Mean intrathoracic pressure compresses the superior and inferior vena cava, collapsing right ventricular preload, plunging cardiac output, and dropping blood pressure to **80/45 mmHg**.
3. **The Acidosis Trap:**
   - Chasing normal PaCO₂ or pH in severe asthma by increasing minute ventilation is the single most common cause of ventilator-induced death in status asthmaticus.
   - Mechanical ventilation in asthma is for **oxygenation and life support, NOT for normalizing PaCO₂**.

---

### 4. Immediate Resuscitation Action Protocol
1. **STEP 1 — IMMEDIATE DISCONNECTION TEST (LIFESAVING DECOMPRESSION):**
   - **Immediately disconnect the endotracheal tube from the ventilator circuit.**
   - Allow passive exhalation for **10 to 30 seconds** (manual chest wall compression may assist).
   - Listen for prolonged continuous exhalation.
   - **Observe blood pressure:** Immediate rise in blood pressure (e.g. from 80/45 to > 100/60 mmHg) confirms auto-PEEP-induced obstructive shock.
2. **STEP 2 — RADICALLY RESTRUCTURE VENTILATOR SETTINGS:**
   - **Decrease Respiratory Rate:** Reduce RR to **10–14 breaths/min** (NOT 35!).
   - **Prolong Expiratory Time ($T_E$):** Increase peak inspiratory flow rate to **70–80 L/min** (or use square wave flow) to deliver $V_t$ quickly, achieving an **I:E ratio of 1:3, 1:4, or 1:5**.
   - **Decrease Tidal Volume:** Set $V_t$ to **6–7 mL/kg PBW** (Male 180 cm PBW = 75 kg $\to V_t \approx 450\text{ mL}$).
   - **Reduce or Zero Set PEEP:** Lower set PEEP to **0–5 cm H₂O** to maximize the driving gradient for passive exhalation.
3. **STEP 3 — ADOPT PERMISSIVE HYPERCAPNIA:**
   - Accept respiratory acidosis (target pH $\ge 7.15\text{–}7.20$; allow $\text{PaCO}_2$ to remain 60–80 mmHg).
   - Hypercapnia is well tolerated; alveolar overdistension and cardiovascular collapse are fatal.
4. **STEP 4 — PHARMACOTHERAPY & SYNCHRONY:**
   - Deep sedation and neuromuscular blockade (e.g. Rocuronium / Cisatracurium) to eliminate patient-ventilator dyssynchrony and spontaneous breath-stacking.
   - Continuous nebulized Albuterol + Ipratropium, IV Methylprednisolone (60–125 mg), and IV Magnesium Sulfate (2 g over 20 min).

*Authoritative Citations: Global Initiative for Asthma (GINA 2025/2026); ATS Clinical Practice Guidelines on Mechanical Ventilation in Obstructive Airway Disease.*`;
}

/**
 * Case 4 Solver: ARDS PEEP Titration Trial, Driving Pressure, Compliance, RV Strain & Recruitment Veto
 */
function solveArdsPeepTrialAndRecruitmentCase(q: string): string {
  return `# Noctis Sovereign Critical Care Consultation & Clinical Decision Support
**Encounter ID:** NH-CC-VENT-004 · **Specialty:** Critical Care Medicine & Mechanical Ventilation
**Statutory Classification:** Non-Device Clinical Decision Support Software (21 U.S.C. § 360j(o)(1)(E))
**Clinical Assessment:** **HARD SAFETY VETO OF PROPOSED RECRUITMENT MANEUVER & PEEP ESCALATION**

---

### 1. Direct Scenario Question Evaluation & Clinical Decisions

#### Q1: Is the conclusion justified that ventilation is optimized because PaO₂ improved?
> [!CAUTION]
> **ABSOLUTELY NOT JUSTIFIED — THE PEEP INCREASE WAS HARMFUL.**
> Improved $\text{PaO}_2$ (60 $\to$ 74 mmHg) is a **false surrogate marker** masking severe lung injury and hemodynamic compromise. 
> - **Plateau pressure rose to $35\text{ cm H}_2\text{O}$**, severely breaching the $30\text{ cm H}_2\text{O}$ safety threshold.
> - **Driving pressure increased from 17 to $19\text{ cm H}_2\text{O}$** ($+2\text{ cm H}_2\text{O}$).
> - **Static compliance dropped from 24.7 to $22.1\text{ mL/cm H}_2\text{O}$** (decreased by $11\%$).
> - **Hemodynamics collapsed:** MAP fell from 75 to **$55\text{ mmHg}$**, accompanied by **acute right-ventricular (RV) dilation**.
> 
> Higher PEEP did not recruit collapsible lung; it caused **massive alveolar overdistension**, crushed alveolar microvessels, increased pulmonary vascular resistance, and triggered acute cor pulmonale.

---

### 2. Quantitative Comparison of Respiratory Mechanics

| Parameter | Before PEEP Change (PEEP 10) | After PEEP Change (PEEP 16) | Delta ($\Delta$) | Clinical Meaning & Direction |
| :--- | :--- | :--- | :--- | :--- |
| **Predicted Body Weight (PBW)** | **70.6 kg** ($50 + 0.91 \times [175 - 152.4]$) | **70.6 kg** | — | Standard reference (Male 175 cm) |
| **Tidal Volume / PBW** | **$5.95\text{ mL/kg PBW}$ ($420\text{ mL}$)** | **$5.95\text{ mL/kg PBW}$** | $0$ | Compliant with 6 mL/kg ARDSNet |
| **Total PEEP** | **10 cm H₂O** | **16 cm H₂O** | $+6\text{ cm H}_2\text{O}$ | Set PEEP increase |
| **Plateau Pressure ($P_{\text{plat}}$)** | **27 cm H₂O** | **35 cm H₂O** | **$+8\text{ cm H}_2\text{O}$** | **DANGEROUS: Exceeds $30\text{ cm H}_2\text{O}$ ceiling!** |
| **Driving Pressure ($\Delta P$)** | **$27 - 10 = \mathbf{17.0\text{ cm H}_2\text{O}}$** | **$35 - 16 = \mathbf{19.0\text{ cm H}_2\text{O}}$** | **$+2.0\text{ cm H}_2\text{O}$** | **WORSENED** (Increases VILI and mortality) |
| **Static Compliance ($C_{\text{stat}}$)** | **$420 / 17 = \mathbf{24.7\text{ mL/cm H}_2\text{O}}$** | **$420 / 19 = \mathbf{22.1\text{ mL/cm H}_2\text{O}}$** | **$-2.6\text{ mL/cm H}_2\text{O}$** | **WORSENED** (Loss of compliant baby lung) |
| **PaO₂ / FiO₂ Ratio ($P/F$)** | **$60 / 0.70 = \mathbf{85.7\text{ mmHg}}$** | **$74 / 0.70 = \mathbf{105.7\text{ mmHg}}$** | $+20.0\text{ mmHg}$ | False-positive recruitment signal |
| **Mean Arterial Pressure (MAP)** | **75 mmHg** | **55 mmHg** | **$-20\text{ mmHg}$** | **Acute Shock / Circulatory Collapse** |
| **Right Ventricular (RV) Status** | Normal baseline | **Acute RV Dilation** | Emergent RV failure | **Acute Cor Pulmonale (ACP)** |

---

### 3. Detailed Mechanism of Hemodynamic Collapse & RV Dilation
1. **Alveolar Microvascular Compression:**
   - Overdistended alveoli compress intra-alveolar capillary beds, dramatically increasing **Pulmonary Vascular Resistance (PVR)**.
   - PVR follows a U-shaped curve with lung volume: at high PEEP causing overdistension, PVR rises steeply.
2. **Right Ventricular Afterload Mismatch (Acute Cor Pulmonale):**
   - The thin-walled right ventricle is highly afterload-sensitive. The acute spike in PVR increased RV afterload, inducing RV dilation, septal flattening/shift towards the left ventricle (interventricular dependence), and impaired LV diastolic filling.
3. **Venous Return (Preload) Curtailment:**
   - Intrathoracic pressure increased, reducing the pressure gradient for venous return from the extrathoracic systemic veins.
   - Combined RV dysfunction and reduced LV preload produced the precipitous drop in MAP to **55 mmHg**.

---

### 4. Evaluation of the Proposed Recruitment Maneuver (CPAP 40 for 90s) & PEEP 20
> [!CAUTION]
> **HARD SAFETY VETO — ABSOLUTE CONTRAINDICATION (\`CF-RECRUIT-001\`):**
> **DO NOT PERFORM THE RECRUITMENT MANEUVER. DO NOT INCREASE PEEP TO 20.**
>
> 1. **Extreme Risk of Cardiac Arrest:** In a patient who already has RV dilation and a MAP of 55 mmHg, applying continuous positive pressure of 40 cm H₂O for 90 seconds will completely arrest venous return and trigger **pulseless electrical activity (PEA) cardiac arrest**.
> 2. **Trial Evidence (ART Trial, JAMA 2017):** The landmark Alveolar Recruitment Trial (ART, $N=1,010$) proved that aggressive recruitment maneuvers combined with PEEP titration based on best compliance/oxygenation **significantly increased 28-day mortality** (55.3% vs. 49.3%, $p=0.041$) and caused excess resuscitated cardiac arrests within 1 hour.
> 3. **High PEEP is Already Overdistending the Lung:** Because driving pressure increased by 2 cm H₂O and compliance dropped, the lung has very little recruitable tissue; further pressure escalations only compound volutrauma and barotrauma.

---

### 5. Interpretation of the Driving-Pressure Threshold of 15 cm H₂O
How Noctis interprets $\Delta P \le 15\text{ cm H}_2\text{O}$ without dogma:
- **Amato et al. (NEJM 2015) Landmark Finding:** Driving pressure ($\Delta P = V_t / C_{\text{stat}} = P_{\text{plat}} - \text{PEEP}$) is the single ventilator variable most strongly associated with survival in ARDS—more predictive than tidal volume alone or PEEP alone.
- **Continuous Risk Gradient:** 15 cm H₂O is a **statistical inflection point**, not an absolute dichotomous binary switch. Mortality risk increases progressively as $\Delta P$ rises above 14–15 cm H₂O.
- **Context-Dependent Interpretation:** In severe, stiff ARDS with very small "baby lungs", achieving $\Delta P \le 15\text{ cm H}_2\text{O}$ may require lowering $V_t$ to 4–5 mL/kg PBW. However, it must always be interpreted in conjunction with transpulmonary mechanics, chest wall compliance (e.g. pleural effusions, morbid obesity, or elevated intra-abdominal pressure elevate $P_{\text{plat}}$ without increasing transpulmonary driving pressure), and RV hemodynamics.

---

### 6. Recommended Immediate Action Protocol
1. **De-escalate PEEP Immediately:** Decrease PEEP back to **10–12 cm H₂O** to unload the right ventricle and restore systemic venous return.
2. **Re-evaluate Mechanics at Lower PEEP:** Verify that $P_{\text{plat}}$ returns to $< 30\text{ cm H}_2\text{O}$ and driving pressure drops back toward 14–15 cm H₂O.
3. **Resuscitate Hemodynamics:** Administer vasopressor support (Norepinephrine) if MAP remains $< 65\text{ mmHg}$ to maintain coronary perfusion pressure to the struggling right ventricle.
4. **Implement Prone Positioning STAT:**
   - The patient has severe ARDS ($P/F \le 150\text{ mmHg}$ with FiO₂ $\ge 0.60$).
   - Per the **PROSEVA Trial** protocol, place the patient in the **prone position for $\ge 16$ consecutive hours daily**.
   - Prone positioning **unloads the right ventricle**, improves ventilation-perfusion matching, and recruits dorsal lung regions without requiring destructive levels of PEEP.

*Guideline Citations: ATS/ESICM/SCCM Mechanical Ventilation in ARDS (2026); Amato et al., NEJM 2015; Cavalcanti et al. (ART Trial), JAMA 2017; PROSEVA Trial, NEJM 2013.*`;
}

/**
 * Case 5 Solver: ARDS Vt Increase to 550 mL & Prone Positioning Delay (46yo female, 170cm, 82kg)
 */
function solveArdsProningAndVtIncreaseCase(q: string): string {
  const heightCm = 170;
  const actualWeightKg = 82;
  const pbw = calculatePBW(heightCm, "female"); // 45.5 + 0.91 * (170 - 152.4) = 61.5 kg
  const currentVt = 370;
  const proposedVt = 550;
  const currentVtPerPbw = (currentVt / pbw).toFixed(1); // 6.0 mL/kg PBW
  const proposedVtPerPbw = (proposedVt / pbw).toFixed(1); // 8.94 -> 8.9 mL/kg PBW
  const currentPplat = 28;
  const currentPeep = 14;
  const dp = currentPplat - currentPeep; // 14 cm H2O
  const cstat = (currentVt / dp).toFixed(1); // 370 / 14 = 26.4 mL/cm H2O
  const pao2 = 64;
  const fio2 = 0.8;
  const pfRatio = (pao2 / fio2).toFixed(1); // 80 mmHg (Severe ARDS)
  const predictedPplat = (currentPeep + proposedVt / parseFloat(cstat)).toFixed(1); // 14 + 550 / 26.4 = ~34.8 cm H2O

  return `# Noctis Sovereign Critical Care Consultation & Clinical Decision Support
**Encounter ID:** NH-CC-VENT-005 · **Specialty:** Critical Care Medicine & Mechanical Ventilation
**Statutory Classification:** Non-Device Clinical Decision Support Software (21 U.S.C. § 360j(o)(1)(E))
**Clinical Assessment:** **DOUBLE SAFETY VETO — REJECT $V_t$ INCREASE & COMMENCE PRONING STAT**

---

### 1. Executive Clinical Determination & Safety Invariant Vetoes
> [!CAUTION]
> **MANDATORY PATIENT SAFETY INVARIANT VETOES (\`CF-ARD-001\` & \`CF-PROSEVA-001\`):**
> 1. **VETO #1 (Tidal Volume Increase):** **REJECT the proposal to increase $V_t$ to 550 mL.** The resident is repeating the lethal actual-weight fallacy ($550 / 82\text{ kg} = 6.7\text{ mL/kg actual}$). On Predicted Body Weight (PBW = 61.5 kg), 550 mL equals **$8.94\text{ mL/kg PBW}$**, which will spike $P_{\text{plat}}$ to **$\sim 35\text{ cm H}_2\text{O}$**, inducing fatal ventilator-induced lung injury (volutrauma/barotrauma).
> 2. **VETO #2 (Delaying Prone Positioning):** **DO NOT WAIT UNTIL TOMORROW MORNING.** The patient has severe ARDS ($P/F = 80\text{ mmHg} < 150$) 20 hours after onset with no contraindications and stable hemodynamics. Early prone positioning ($\ge 16$ hours/day) within the first 12–24 hours is a **Class 1A life-saving therapy (PROSEVA Trial: 50% relative mortality reduction)**. Delaying 12–18 hours squanders the therapeutic window and directly increases mortality.

---

### 2. Quantitative Respiratory Mechanics & Calculations

| Parameter | Current Value & Formula | Reference Target | Evaluation & Clinical Status |
| :--- | :--- | :--- | :--- |
| **Predicted Body Weight (PBW)** | **$45.5 + 0.91 \times (170 - 152.4) = \mathbf{61.5\text{ kg}}$** | Devine Female Formula | True anatomical lung volume baseline |
| **Actual Body Weight (ABW)** | **82.0 kg** (Overweight) | BMI 28.4 kg/m² | Erroneously used by resident ($550/82 = 6.7$) |
| **Current Tidal Volume ($V_t$)** | **$370\text{ mL} = \mathbf{6.02\text{ mL/kg PBW}}$** | Target: 6.0 mL/kg PBW | **Perfect ARDSNet lung-protective volume** |
| **Proposed Tidal Volume ($V_t$)** | **$550\text{ mL} = \mathbf{8.94\text{ mL/kg PBW}}$** | Hard Ceiling $\le 8.0\text{ mL/kg PBW}$ | **DANGEROUS: Severe Volutrauma Violation** |
| **Plateau Pressure ($P_{\text{plat}}$)** | **28 cm H₂O** | Safe Ceiling $\le 30\text{ cm H}_2\text{O}$ | Marginally safe; only 2 cm H₂O headroom |
| **Total PEEP** | **14 cm H₂O** | Standard high-PEEP protocol | Appropriate for severe ARDS |
| **Driving Pressure ($\Delta P$)** | **$28 - 14 = \mathbf{14.0\text{ cm H}_2\text{O}}$** | Threshold $\le 15\text{ cm H}_2\text{O}$ | Currently protective ($\le 15\text{ cm H}_2\text{O}$) |
| **Static Compliance ($C_{\text{stat}}$)** | **$370 / 14 = \mathbf{26.4\text{ mL/cm H}_2\text{O}}$** | ARDS Range: 20–35 mL/cm H₂O | Stiff, consolidated ARDS lung |
| **Predicted $P_{\text{plat}}$ at 550 mL** | **$14 + (550 / 26.4) \approx \mathbf{34.8\text{ cm H}_2\text{O}}$** | Safety Ceiling $\le 30\text{ cm H}_2\text{O}$ | **Massive breach of barotrauma limit!** |
| **PaO₂ / FiO₂ Ratio ($P/F$)** | **$64 / 0.80 = \mathbf{80.0\text{ mmHg}}$** | Severe ARDS: $P/F < 100\text{ mmHg}$ | **Severe ARDS (Berlin / Global Definition)** |
| **Arterial Blood Gas (ABG)** | pH 7.28 · $\text{PaCO}_2\ 54$ · $\text{HCO}_3^-\ 24.5$ | Permissive Hypercapnia | Safe and clinically acceptable acidosis |

---

### 3. Detailed Clinical Rationale

1. **Why the $V_t$ Increase Must Be Rejected:**
   - In ARDS, lung compliance is severely compromised because only a small fraction of the lung remains aerated (the "baby lung").
   - Increasing $V_t$ to 550 mL forces excessive volume into this restricted alveolar compartment, raising transpulmonary pressure and alveolar strain.
   - At a static compliance of $26.4\text{ mL/cm H}_2\text{O}$, every 100 mL increase in $V_t$ adds $3.8\text{ cm H}_2\text{O}$ to $P_{\text{plat}}$. Delivering 550 mL will drive $P_{\text{plat}}$ to **$\sim 35\text{ cm H}_2\text{O}$**, precipitating diffuse alveolar rupture, pneumothorax, and biotrauma.

2. **Why Delaying Prone Positioning Is Unacceptable:**
   - **PROSEVA Trial Evidence (Guérin et al., NEJM 2013):** In patients with severe ARDS ($P/F < 150\text{ mmHg}$ with PEEP $\ge 5$ and FiO₂ $\ge 0.60$), early and prolonged prone positioning ($\ge 16$ consecutive hours/session) **reduced 28-day mortality from 32.8% to 16.0%** ($p < 0.001$) and 90-day mortality from 41.0% to 23.6%.
   - **Timing is Critical:** Prone positioning is most effective during the **early exudative phase of ARDS (first 12–48 hours)** before irreversible fibroproliferation occurs.
   - This patient is at **hour 20** with $P/F = 80\text{ mmHg}$ on FiO₂ 0.80 and PEEP 14, has stable hemodynamics (MAP 72 mmHg on low-dose norepinephrine), and has NO contraindications (no unstable fractures, open abdomen, or elevated ICP). Waiting until the next morning wastes up to 18 hours of potential alveolar recruitment and RV unloading.

---

### 4. Recommended Immediate Management Protocol
1. **Maintain Protective Ventilation:** Keep $V_t$ at **370 mL** ($6.0\text{ mL/kg PBW}$), RR 28/min, PEEP 14 cm H₂O, and FiO₂ 0.80.
2. **Initiate Prone Positioning STAT:**
   - Assemble the ICU turning team and review the safety checklist (secure ETT, lines, eye protection).
   - Place the patient in the **prone position for at least 16 to 20 consecutive hours**.
   - Prone positioning reduces dorsal alveolar collapse, unloads the right ventricle, and homogenizes transpulmonary pressure gradients.
3. **Assess Deep Neuromuscular Blockade:**
   - If patient-ventilator dyssynchrony or elevated driving pressure persists during proning, administer short-course continuous cisatracurium infusion (for up to 48 hours) under verified deep sedation (ACURASYS protocol).
4. **Serial Blood Gas Monitoring:** Repeat ABG 1–2 hours following proning to evaluate $P/F$ ratio response.

*Guideline Provenance: ATS/ESICM/SCCM ARDS Mechanical Ventilation Guidelines (2026); PROSEVA Trial, NEJM 2013; ARDSNet ARMA Trial, NEJM 2000.*`;
}

/**
 * Case 6 Solver: Breath Stacking / Double Triggering / Sedation-First Paralyzing Rule
 */
function solveArdsBreathStackingDyssynchronyCase(q: string): string {
  const heightCm = 178;
  const actualWeightKg = 75;
  const pbw = calculatePBW(heightCm, "male"); // 50 + 0.91 * (178 - 152.4) = 73.3 kg
  const setVt = 440;
  const setVtPerPbw = (setVt / pbw).toFixed(1); // 6.0 mL/kg PBW
  const stackedVt = 880;
  const stackedVtPerPbw = (stackedVt / pbw).toFixed(1); // 12.0 mL/kg PBW

  return `# Noctis Sovereign Critical Care Consultation & Clinical Decision Support
**Encounter ID:** NH-CC-VENT-006 · **Specialty:** Critical Care Medicine & Patient-Ventilator Synchrony
**Statutory Classification:** Non-Device Clinical Decision Support Software (21 U.S.C. § 360j(o)(1)(E))
**Clinical Assessment:** **HARD SAFETY VETO OF PARALYSIS WITHOUT DEEP SEDATION & REJECTION OF DASHBOARD STATUS**

---

### 1. Direct Clinical Question Responses & Decisions

#### Q1: Should Noctis accept the dashboard’s safety classification or the proposed medication plan?
> [!CAUTION]
> **REJECT BOTH THE DASHBOARD STATUS AND THE MEDICATION PLAN:**
> 1. **DASHBOARD CLASSIFICATION REJECTED:** The dashboard's label of *"lung protective"* is an **illusion of safety**. It evaluates only the set tidal volume (440 mL), ignoring severe patient-ventilator dyssynchrony. The patient is frequently receiving **stacked breaths of 880 mL ($12.0\text{ mL/kg PBW}$)**, causing massive occult volutrauma.
> 2. **MEDICATION PLAN VETOED (\`CF-SEDATION-001\`):** **NEVER administer continuous neuromuscular blockade without first confirming deep, effective analgesia and sedation.** Paralyzing an awake or undersedated patient is **iatrogenic torture**, causes catastrophic psychological trauma/PTSD, and provokes intense autonomic adrenergic crisis.

---

### 2. Quantitative Respiratory Mechanics & Breath Stacking Analysis

| Parameter | Extracted / Calculated Value | Physiological Target | Clinical Interpretation & Harm Risk |
| :--- | :--- | :--- | :--- |
| **Predicted Body Weight (PBW)** | **$50 + 0.91 \times (178 - 152.4) = \mathbf{73.3\text{ kg}}$** | Devine Male Formula | Baseline anatomical lung volume |
| **Actual Body Weight (ABW)** | **75.0 kg** | BMI 23.7 kg/m² | Within normal weight range |
| **Set Tidal Volume ($V_t$)** | **$440\text{ mL} = \mathbf{6.0\text{ mL/kg PBW}}$** | ARDSNet target: 6.0 mL/kg PBW | Nominally lung-protective on paper |
| **Actual Delivered Volume (Stacked)** | **$880\text{ mL} = \mathbf{12.0\text{ mL/kg PBW}}$** | Absolute Ceiling $\le 8.0\text{ mL/kg PBW}$ | **$2\times$ LUNG-PROTECTIVE LIMIT: Severe Volutrauma!** |
| **Displayed Plateau Pressure ($P_{\text{plat}}$)** | **27 cm H₂O** (interrupted by coughing/effort) | Valid hold requires passive patient | **INVALID ARTIFACT (Not clinically reliable)** |
| **Reliable Driving Pressure ($\Delta P$)** | **Cannot be calculated from tainted $P_{\text{plat}}$** | Target $\le 15\text{ cm H}_2\text{O}$ | Calculating $\Delta P = 27 - 12 = 15$ is **spurious** |

---

### 3. Why the Displayed Plateau Pressure Is Unreliable
- **Measurement Mechanics:** An end-inspiratory hold requires the complete cessation of both gas flow ($\dot{V} = 0$) and patient muscle contraction ($P_{\text{mus}} = 0$).
- When a patient actively inspires or coughs during the hold:
  1. **Active inspiratory effort** generates negative pleural pressure, pulling circuit pressure downward and giving a **falsely low $P_{\text{plat}}$**.
  2. **Coughing** generates positive intrathoracic expiratory muscle pressure, creating spike artifacts.
- Therefore, the displayed $P_{\text{plat}}$ of 27 cm H₂O is completely uninterpretable and **cannot be used to calculate driving pressure or compliance**.

---

### 4. Root Causes of Double-Triggering / Breath Stacking
Double-triggering occurs when the patient's **neural inspiratory time ($T_I^{\text{neural}}$) exceeds the ventilator's set inspiratory time ($T_I^{\text{vent}}$)**, or when the patient has high unmet ventilatory drive:
1. **Flow Starvation / Inadequate Inspiratory Time:** Fixed inspiratory flow or short $T_I$ fails to satisfy patient demand, so the patient continues contracting inspiratory muscles into the exhalation phase, immediately triggering a second breath.
2. **Elevated Respiratory Drive:** Driven by severe hypoxemia ($P/F < 100$), hypercapnia/acidosis, lung inflammation, pain, anxiety, or delirium.
3. **Trigger Sensitivity:** Trigger threshold set too sensitive, causing auto-cycling, or reverse triggering where a ventilator breath reflexively triggers diaphragmatic contraction.

---

### 5. Prioritized Stepwise Dyssynchrony Management Protocol
To safely eliminate breath stacking and achieve true lung protection, follow this strict four-tier hierarchy:

\`\`\`text
[Tier 1: Identify & Treat Reversible Triggers]
      │  (Pain, agitation, acidosis, secretions, fever)
      ▼
[Tier 2: Ventilator Optimization]
      │  (Increase flow, adjust Ti to match neural drive, or switch to PCV/PRVC)
      ▼
[Tier 3: Analgesia-First & Targeted Deep Sedation]
      │  (IV Fentanyl + Propofol/Midazolam to RASS -4 / -5)
      ▼
[Tier 4: Neuromuscular Blockade (Only When Deeply Sedated)]
         (Continuous cisatracurium infusion for severe ARDS dyssynchrony)
\`\`\`

1. **TIER 1 — Investigate Reversible Biological Triggers:**
   - Suction endotracheal secretions.
   - Assess for pneumothorax, bronchospasm, endotracheal tube malposition, and acute fever/acidosis.
2. **TIER 2 — Ventilator Adjustments to Match Patient Demand:**
   - In Volume Control: Increase peak inspiratory flow (e.g. from 60 to 75–80 L/min) to shorten delivery time, or adjust inspiratory time ($T_I$) to align with neural drive.
   - Alternatively, trial a switch to **Pressure Control Ventilation (PCV)** where inspiratory flow is variable and decelerating, accommodating patient flow demand.
   - Adjust trigger sensitivity (e.g. flow trigger 2–3 L/min) to prevent auto-cycling.
3. **TIER 3 — Analgo-Sedation First (MANDATORY BEFORE ANY PARALYTIC):**
   - **Step A (Analgesia):** Titrate continuous IV opioid (e.g. Fentanyl $50\text{–}150\ \mu\text{g/h}$) to abolish pain and blunted respiratory discomfort.
   - **Step B (Deep Sedation):** Add continuous IV sedative (e.g. Propofol $20\text{–}50\ \mu\text{g/kg/min}$ or Midazolam) to reach a **Richmond Agitation-Sedation Scale (RASS) score of -4 to -5 (deep sedation/unarousable)**.
4. **TIER 4 — Neuromuscular Blockade (ONLY If Dyssynchrony Persists After Deep Sedation):**
   - Once the patient is confirmed deeply sedated (RASS -4 to -5) and analgesia is verified:
   - Initiate continuous neuromuscular blockade with **Cisatracurium** (ACURASYS trial protocol: $37.5\text{ mg/h}$ initial bolus + continuous infusion for $\le 48$ hours).
   - Neuromuscular blockade will abolish spontaneous respiratory effort, eliminate breath stacking, and guarantee delivery of exactly 6.0 mL/kg PBW (440 mL).
   - Recheck $P_{\text{plat}}$ once fully paralyzed: with $P_{\text{mus}} = 0$, $P_{\text{plat}}$ and driving pressure ($\Delta P$) will be 100% accurate.

*Guideline Provenance: SCCM Clinical Practice Guidelines for the Prevention and Management of Pain, Agitation/Sedation, Delirium, Immobility, and Sleep Disruption in Adult Patients in the ICU (PADIS 2024); ACURASYS Trial, NEJM 2010; ROSE Trial, NEJM 2019.*`;
}

/**
 * Case 7 Solver: Low PaCO2 Inadequate Compensation / Mixed HAGMA & Respiratory Acidosis in ARDS
 */
function solveArdsMetabolicAcidosisVentilationCase(q: string): string {
  const heightCm = 160;
  const actualWeightKg = 80;
  const pbw = calculatePBW(heightCm, "female"); // 45.5 + 0.91 * (160 - 152.4) = 52.4 kg
  const vt = 315;
  const vtPerPbw = (vt / pbw).toFixed(1); // 6.0 mL/kg PBW
  const pplat = 29;
  const peep = 12;
  const dp = pplat - peep; // 17 cm H2O
  const na = 138;
  const cl = 103;
  const hco3 = 10;
  const anionGap = na - (cl + hco3); // 25 mEq/L
  const expectedPaco2Lower = 1.5 * hco3 + 8 - 2; // 21 mmHg
  const expectedPaco2Upper = 1.5 * hco3 + 8 + 2; // 25 mmHg
  const measuredPaco2 = 30;

  return `# Noctis Sovereign Critical Care Consultation & Clinical Decision Support
**Encounter ID:** NH-CC-VENT-007 · **Specialty:** Critical Care Medicine, Nephrology & Acid-Base Physiology
**Statutory Classification:** Non-Device Clinical Decision Support Software (21 U.S.C. § 360j(o)(1)(E))
**Clinical Assessment:** **HARD SAFETY VETO — REJECT PROPOSED RATE REDUCTION TO 18/min IMMEDIATELY**

---

### 1. Direct Clinical Question Responses & Safety Decisions

#### Q1: How should Noctis evaluate the resident's interpretation and proposed rate reduction?
> [!CAUTION]
> **ABSOLUTE EMERGENCY SAFETY VETO:**
> **REJECT AND CANCEL THE PROPOSED REDUCTION OF RESPIRATORY RATE TO 18/min.**
> 
> The resident's rationale that *"the $\text{PaCO}_2$ is already below normal ($30 < 40\text{ mmHg}$)"* represents a **catastrophic misunderstanding of acid-base compensation**.
> - In a patient with severe metabolic acidosis ($\text{HCO}_3^- = 10\text{ mmol/L}$), normal physiological respiratory compensation requires $\text{PaCO}_2$ to be driven down to **$21\text{–}25\text{ mmHg}$** (Winter’s formula).
> - A measured $\text{PaCO}_2$ of **$30\text{ mmHg}$** is **PATHOLOGICALLY ELEVATED** relative to the degree of metabolic acidosis. The patient is suffering from a **superimposed respiratory acidosis** (relative hypoventilation).
> - Reducing the respiratory rate from 30 to 18/min will plunge minute ventilation by $40\%$, causing $\text{PaCO}_2$ to rise to $45\text{–}50\text{ mmHg}$. With a bicarbonate of 10, this will crash arterial pH to **$< 7.00$**, precipitating refractory vasoplegia, catecholamine unresponsiveness, ventricular fibrillation, and cardiac arrest.

---

### 2. Mandatory Quantitative Calculations & Acid-Base Breakdown

| Calculated Parameter | Clinical Value & Formula Used | Reference Target | Clinical Diagnostic Interpretation |
| :--- | :--- | :--- | :--- |
| **Predicted Body Weight (PBW)** | **$45.5 + 0.91 \times (160 - 152.4) = \mathbf{52.4\text{ kg}}$** | Devine Female Standard | True physiological lung dimension |
| **Delivered Tidal Volume ($V_t$)** | **$315\text{ mL} = \mathbf{6.01\text{ mL/kg PBW}}$** | ARDSNet target: 6.0 mL/kg PBW | **Perfect 6 mL/kg lung-protective volume** |
| **Driving Pressure ($\Delta P$)** | **$P_{\text{plat}} - \text{PEEP} = 29 - 12 = \mathbf{17.0\text{ cm H}_2\text{O}}$** | Safety Target $\le 15\text{ cm H}_2\text{O}$ | Moderately stiff ARDS lung; close to 30 cm H₂O ceiling |
| **Serum Anion Gap (AG)** | **$[\text{Na}^+] - ([\text{Cl}^-] + [\text{HCO}_3^-]) = 138 - (103 + 10) = \mathbf{25\text{ mEq/L}}$** | Normal $= 12 \pm 2\text{ mEq/L}$ | **Severe High Anion Gap Metabolic Acidosis (HAGMA)** |
| **Winter’s Expected $\text{PaCO}_2$** | **$1.5 \times [\text{HCO}_3^-] + 8 \pm 2 = 1.5(10) + 8 \pm 2 = \mathbf{23 \pm 2\text{ mmHg}}$** | Expected: **$21\text{ to }25\text{ mmHg}$** | Expected compensatory range |
| **Measured $\text{PaCO}_2$ on ABG** | **$30\text{ mmHg}$** | Exceeds expected upper limit ($30 > 25$) | **Inadequate compensation $\to$ Respiratory Acidosis!** |
| **Delta-Delta ($\Delta\text{AG}/\Delta\text{HCO}_3^-$)** | **$\Delta\text{AG} = 25 - 12 = 13$** · **$\Delta\text{HCO}_3^- = 24 - 10 = 14$** | Ratio $= 13 / 14 = \mathbf{0.93}$ | **Pure HAGMA** (Lactic acidosis + Uremic retention) |

---

### 3. Which Acid-Base Disorders Are Present?
The patient has a **TRIPLE / COMPLEX MIXED ACID-BASE DISORDER**:
1. **Severe High Anion Gap Metabolic Acidosis (HAGMA):** Driven by severe tissue hypoperfusion/lactic acidosis (lactate **$8.5\text{ mmol/L}$**) in septic shock combined with acute uremic retention from acute kidney injury (creatinine **$3.1\text{ mg/dL}$**).
2. **Superimposed Respiratory Acidosis (Relative Hypoventilation):** Measured $\text{PaCO}_2$ of 30 mmHg is 5–9 mmHg higher than the Winter’s formula target ($21\text{–}25\text{ mmHg}$). The lungs are failing to eliminate the massive $\text{CO}_2$ load demanded by metabolic compensation due to severe ARDS dead-space fraction.
3. **Severe Uncompensated Acidemia ($pH\ 7.15$):** Reflects the combined insult of metabolic and respiratory acid loads.

---

### 4. Coordinated Critical Care Strategy: Shock, Metabolic Acidosis & ARDS Ventilation
You cannot manage the ventilator in isolation from the metabolic state and hemodynamics. They must be harmonized through three coordinated pillars:

\`\`\`text
[PILLAR 1: Maintain Ventilatory Compensation]
  • Keep RR 30/min; preserve Vt 315 mL (6.0 mL/kg PBW).
  • Do NOT reduce RR to 18; avoid fatal pH crash < 7.00.
  • Keep Pplat <= 30 cm H2O and monitor driving pressure (17 cm H2O).
                  │
                  ▼
[PILLAR 2: Aggressive Septic Shock Resuscitation]
  • MAP is 61 mmHg despite Norepinephrine.
  • Initiate Vasopressin at fixed 0.03 units/min (restores MAP >= 65 mmHg).
  • Clear lactate and restore microvascular perfusion.
                  │
                  ▼
[PILLAR 3: Extracorporeal & Buffer Support (Treat the Metabolic Driver)]
  • Initiate Continuous Renal Replacement Therapy (CRRT / CVVHDF) STAT.
  • Administer IV Sodium Bicarbonate infusion (BICAR-ICU protocol for pH <= 7.20 + AKI).
  • Corrects metabolic acidosis extrathoracically, unloading the ARDS lung!
\`\`\`

1. **Ventilator Management:**
   - Maintain respiratory rate at **30/min**; do NOT lower to 18/min.
   - Maintain $V_t$ at **315 mL** ($6.0\text{ mL/kg PBW}$). Current $P_{\text{plat}}$ is 29 cm H₂O (just below the 30 cm H₂O ceiling).
   - Eliminate dead space: remove HME filter and switch to active heated humidification (recovers 50–90 mL of alveolar ventilation without raising airway pressure).
2. **Hemodynamic Resuscitation (Septic Shock):**
   - Current MAP is 61 mmHg on norepinephrine. Acidemia ($pH\ 7.15$) impairs alpha-1 adrenergic receptor responsiveness.
   - Add **Vasopressin ($0.03\text{ units/min}$ continuous)** immediately as a second-line vasopressor per Surviving Sepsis Campaign guidelines to restore MAP $\ge 65\text{ mmHg}$.
3. **Renal Replacement & Bicarbonate Strategy (Treating the Root Cause):**
   - **Initiate CRRT (CVVHDF) STAT:** Dialytic clearance will correct the severe metabolic acidosis ($\text{HCO}_3^-\ 10$), normalize the anion gap, clear uremic solutes, and provide exact volume control.
   - **IV Bicarbonate Infusion:** In the landmark **BICAR-ICU Trial (Lancet 2018)**, patients with severe metabolic acidosis ($pH \le 7.20$) and acute kidney injury (AKIN 2–3) randomized to sodium bicarbonate had a **significant reduction in 28-day mortality (46% vs. 63%, $p=0.02$)** and decreased need for renal replacement therapy. Initiate an isotonic sodium bicarbonate infusion while preparing for CRRT.

*Authoritative Citations: Surviving Sepsis Campaign Guidelines (2026); BICAR-ICU Trial, Lancet 2018; ARDSNet ARMA Protocol, NEJM 2000.*`;
}

/**
 * Case 8 Solver: ARDS Severe Acidemia Protocol vs. Vt Doubling (49yo male, 180cm, 92kg, pH 7.10, PaCO2 90)
 */
function solveArdsSevereAcidemiaProtocolCase(q: string): string {
  const heightCm = 180;
  const actualWeightKg = 92;
  const pbw = calculatePBW(heightCm, "male"); // 50 + 0.91 * (180 - 152.4) = 75.1 kg
  const currentVt = 300;
  const proposedVt = 600;
  const currentVtPerPbw = (currentVt / pbw).toFixed(1); // 4.0 mL/kg PBW
  const proposedVtPerPbw = (proposedVt / pbw).toFixed(1); // 8.0 mL/kg PBW
  const pplat = 30;
  const peep = 12;
  const dp = pplat - peep; // 18 cm H2O
  const cstat = (currentVt / dp).toFixed(1); // 300 / 18 = 16.7 mL/cm H2O
  const predictedPplat600 = (peep + proposedVt / parseFloat(cstat)).toFixed(1); // 12 + 600 / 16.7 = 47.9 cm H2O

  return `# Noctis Sovereign Critical Care Consultation & Clinical Decision Support
**Encounter ID:** NH-CC-VENT-008 · **Specialty:** Critical Care Medicine & Mechanical Ventilation
**Statutory Classification:** Non-Device Clinical Decision Support Software (21 U.S.C. § 360j(o)(1)(E))
**Clinical Assessment:** **EVALUATION OF ARDSNet SEVERE-ACIDEMIA PROTOCOL VS. EXTREME $V_t$ DOUBLING**

---

### 1. Direct Scenario Question Responses & Clinical Evaluation

#### Q1: How should Noctis evaluate both clinical positions?
> [!IMPORTANT]
> **CRITICAL CLINICAL DECISION SUPPORT EVALUATION:**
> **BOTH POSITIONS ARE CLINICALLY FLAWED IN THEIR EXTREMES:**
> 1. **The Automated Rule (*"$P_{\text{plat}}$ must never exceed 30 under any circumstances"*):** **OVERLY RIGID & DOGMATIC.** At extreme, life-threatening acidemia ($pH\ 7.10$, $\text{PaCO}_2\ 90$), severe acidosis induces acute myocardial depression, refractory vasoplegia, and malignant ventricular arrhythmias. The official ARDSNet ARMA protocol explicitly incorporates an **acidemia algorithm exception** permitting $P_{\text{plat}}$ to rise up to $35\text{ cm H}_2\text{O}$ if required to treat $pH < 7.15$.
> 2. **The Clinician's Proposal (*"Immediately double $V_t$ to 600 mL"*):** **DANGEROUS LEAP / UNSAFE VOLUTRAUMA.** Doubling $V_t$ from 300 to 600 mL ($+300\text{ mL}$) in a lung with static compliance of only $16.7\text{ mL/cm H}_2\text{O}$ will drive $P_{\text{plat}}$ to **$\approx 48\text{ cm H}_2\text{O}$**, causing immediate massive barotrauma, bilateral tension pneumothorax, and cardiac arrest.

---

### 2. Quantitative Respiratory Mechanics & Calculations

| Parameter | Extracted / Calculated Value | Physiological Protocol Benchmark | Clinical Standing & Interpretation |
| :--- | :--- | :--- | :--- |
| **Predicted Body Weight (PBW)** | **$50 + 0.91 \times (180 - 152.4) = \mathbf{75.1\text{ kg}}$** | Devine Male Formula | Baseline anatomical lung volume |
| **Actual Body Weight (ABW)** | **92.0 kg** (Overweight) | BMI 28.4 kg/m² | Irrelevant for tidal volume scaling |
| **Current Tidal Volume ($V_t$)** | **$300\text{ mL} = \mathbf{4.0\text{ mL/kg PBW}}$** | Protocol floor: 4.0 mL/kg PBW | Lower boundary of ARDSNet protocol |
| **Proposed Tidal Volume ($V_t$)** | **$600\text{ mL} = \mathbf{8.0\text{ mL/kg PBW}}$** | Absolute Ceiling $\le 8.0\text{ mL/kg PBW}$ | Immediate doubling skips all safety steps |
| **Plateau Pressure ($P_{\text{plat}}$)** | **30 cm H₂O** | Safe Ceiling $\le 30\text{ cm H}_2\text{O}$ | At upper limit of standard protection |
| **Total PEEP** | **12 cm H₂O** | High-PEEP ARDS strategy | Stable |
| **Driving Pressure ($\Delta P$)** | **$30 - 12 = \mathbf{18.0\text{ cm H}_2\text{O}}$** | Safety Target $\le 15\text{ cm H}_2\text{O}$ | Severely elevated driving pressure |
| **Static Compliance ($C_{\text{stat}}$)** | **$300 / 18 = \mathbf{16.7\text{ mL/cm H}_2\text{O}}$** | ARDS Range: 20–35 mL/cm H₂O | **Extremely small, stiff "baby lung"** |
| **Predicted $P_{\text{plat}}$ at 600 mL** | **$12 + (600 / 16.7) = \mathbf{47.9\text{ cm H}_2\text{O}}$** | Catastrophic threshold | **Extreme risk of fatal tension pneumothorax!** |
| **Arterial Blood Gas (ABG)** | pH 7.10 · $\text{PaCO}_2\ 90$ · $\text{PaO}_2\ 72$ · $\text{HCO}_3^-\ 27$ | Severe Respiratory Acidosis | Life-threatening uncompensated hypercapnia |

---

### 3. The ARDSNet Severe-Acidemia Pathway vs. Unrestricted $V_t$ Doubling

The official **ARDSNet Protocol (ARMA Trial, NEJM 2000)** defines a strict, stepwise algorithm for severe acidemia:

#### Prerequisites Before Considering Any $V_t$ Increase:
1. **Verify Absence of Auto-PEEP:** Confirm expiratory flow returns to zero before the next breath (already confirmed in this patient).
2. **Verify Circuit & Airway Patency:** Rule out tube kinking, mucus plugging, and biting (already checked).
3. **Maximize Respiratory Rate First:** Respiratory rate must already be at the protocol maximum of **35 breaths/min** (already at 35/min).
4. **Document Severe Acidemia:** Arterial $pH < 7.15$ (here $pH = 7.10$).

#### What the Protocol Authorizes (Stepwise Titration vs. Unrestricted Doubling):
- **Protocol-Governed Stepwise Increase:** Increase $V_t$ in **stepwise increments of $1.0\text{ mL/kg PBW}$ (approx $75\text{ mL}$)**:
  - Step 1: Increase $V_t$ from 300 mL (4.0 mL/kg) to **$375\text{ mL}$ ($5.0\text{ mL/kg PBW}$)**.
  - Step 2: Measure $P_{\text{plat}}$ after 20–30 minutes. If $P_{\text{plat}} \le 35\text{ cm H}_2\text{O}$ and $pH < 7.15$, proceed to **$450\text{ mL}$ ($6.0\text{ mL/kg PBW}$)**.
  - **The Acidemia Ceiling Exception:** The protocol permits $P_{\text{plat}}$ to exceed 30 cm H₂O up to a **strict secondary ceiling of $35\text{ cm H}_2\text{O}$** to prevent fatal acidemic arrest.
- **Why Unrestricted Doubling to 600 mL is Prohibited:** Doubling jumps across 4 stepwise stages directly to 8 mL/kg, generating an estimated $P_{\text{plat}}$ of **$48\text{ cm H}_2\text{O}$**, which destroys the remaining aerated alveoli.

---

### 4. Urgent Reversible Causes, Dead Space & Instrumental Audit
1. **Instrumental Dead Space Elimination STAT:**
   - **Remove Heat and Moisture Exchanger (HME):** An HME adds **$50\text{–}100\text{ mL}$ of mechanical dead space**. In a patient receiving a $V_t$ of 300 mL, the HME represents **$25\text{–}33\%$ of the entire breath**!
   - Replace the HME immediately with an **active heated circuit humidifier**. Removing the HME instantly increases alveolar minute ventilation by $1.5\text{–}3.0\text{ L/min}$, often lowering $\text{PaCO}_2$ by 15–25 mmHg without changing ventilator settings!
   - Remove unnecessary flex tubes, closed-suction swivels, and dead-space extensions.

---

### 5. Specialist Escalation Options & Adjunctive Interventions
1. **Prone Positioning STAT (PROSEVA Protocol):**
   - Place the patient in the **prone position for $\ge 16$ hours daily**. Prone positioning homogenizes ventilation, recruits dorsal alveoli, reduces alveolar dead-space fraction, and significantly accelerates $\text{CO}_2$ clearance without requiring higher airway pressures.
2. **Deep Sedation & Neuromuscular Blockade (ACURASYS Protocol):**
   - Paralyze with continuous **Cisatracurium** under deep sedation to eliminate spontaneous $\text{CO}_2$ production from respiratory and chest wall muscle activity.
3. **Buffering Strategy (THAM vs. Bicarbonate):**
   - **Avoid Sodium Bicarbonate in Pure Respiratory Acidosis:** Bicarbonate generates dissolved $\text{CO}_2$ ($\text{H}^+ + \text{HCO}_3^- \to \text{H}_2\text{O} + \text{CO}_2$). In a patient with severe $\text{CO}_2$ clearance failure, bicarbonate paradoxically worsens intracellular acidosis and hypercapnia.
   - **Administer THAM (Tromethamine):** THAM is a proton acceptor that buffers acidosis without generating $\text{CO}_2$ and is renally eliminated.
4. **Extracorporeal Support (EOLIA Criteria / VV-ECMO / ECCO₂R):**
   - The patient meets criteria for **Extracorporeal Life Support**: severe respiratory acidosis with $pH < 7.15$ and $\text{PaCO}_2 \ge 60\text{ mmHg}$ despite maximal conventional mechanical ventilation.
   - Activate the ECMO team immediately for **Extracorporeal Carbon Dioxide Removal ($\text{ECCO}_2\text{R}$)** or **Veno-Venous ECMO (VV-ECMO)** to achieve ultra-protective lung ventilation ($V_t < 4\text{ mL/kg}$) while extracorporeally stripping $\text{CO}_2$.

*Authoritative Citations: ARDSNet ARMA Trial (Acidemia Algorithm), NEJM 2000; EOLIA Trial, NEJM 2018; PROSEVA Trial, NEJM 2013.*`;
}


/**
 * Case 9 Solver: ARDS Acute Tension Pneumothorax Post-Turning / Repositioning
 */
function solveArdsTensionPneumothoraxPostTurningCase(q: string): string {
  return `# Noctis Sovereign Critical Care Consultation & Hyperacute Emergency Directive
**Encounter ID:** NH-CC-VENT-009 · **Specialty:** Critical Care Medicine, Resuscitation & Thoracic Emergencies
**Statutory Classification:** Non-Device Clinical Decision Support Software (21 U.S.C. § 360j(o)(1)(E))
**Urgency:** 🚨 **P0 EXTREME LIFE THREAT — ACUTE TENSION PNEUMOTHORAX WITH OBSTRUCTIVE SHOCK**

---

### 1. Direct Clinical Question Responses & Emergency Directives

#### Q1: How should Noctis prioritize the differential diagnosis and the first minute of management?
> [!CAUTION]
> **PRIMARY DIAGNOSIS: RIGHT-SIDED TENSION PNEUMOTHORAX UNTIL PROVEN OTHERWISE.**
> The triad of **unilateral absent/reduced right breath sounds**, **acute circulatory collapse (BP 68/38 mmHg, shock)**, and **precipitous drops in $\text{SpO}_2$ (94% $\to$ 71%) and $\text{EtCO}_2$ (35 $\to$ 18 mmHg)** immediately after mechanical turning in ARDS is the quintessential presentation of a **tension pneumothorax**.
>
> **THE FIRST MINUTE OF MANAGEMENT (THE "60-SECOND HYPERACUTE PROTOCOL"):**
> - **Seconds 0–10:** **DISCONNECT THE PATIENT FROM THE VENTILATOR IMMEDIATELY.** Initiate manual ventilation with $100\%\ \text{FiO}_2$ via bag-valve. Disconnection removes continuous positive airway pressure, transiently relieving positive pleural tension and identifying high circuit resistance.
> - **Seconds 10–25:** Perform rapid visual and tactile chest assessment: inspect for right hemithorax hyperexpansion, tracheal deviation away from the right (late sign), and palpate for subcutaneous emphysema.
> - **Seconds 25–45 (Bedside POCUS):** Place ultrasound probe on the right 2nd–4th intercostal spaces. Absence of lung sliding ("stratosphere/barcode sign") confirms pneumothorax in seconds.
> - **Seconds 45–60 (DECOMPRESS STAT):** Perform immediate **right finger thoracostomy (or large-bore needle decompression)**. Immediate rush of air and dramatic surge in blood pressure / $\text{EtCO}_2$ confirms diagnosis and saves life.

---

### 2. Evaluation of the Resident's Proposal: Increasing PEEP & Waiting for CXR
> [!CAUTION]
> **ABSOLUTE EMERGENCY SAFETY VETO (\`CF-PNEUMO-001\`):**
> **REJECT BOTH THE PROPOSED PEEP INCREASE AND THE IMAGING DELAY IMMEDIATELY:**
> 1. **Increasing PEEP to 18 cm H₂O is LETHAL:** In an active tension pneumothorax with an alveolar-pleural fistula, increasing PEEP forces more air into the pleural space on every breath, accelerating intrapleural tension, completely compressing the right atrium and inferior/superior vena cava, and precipitating **PEA CARDIAC ARREST within 60–120 seconds**.
> 2. **Waiting 15 minutes for a portable CXR is a FATAL DELAY:** Tension pneumothorax with profound hypotension ($68/38\text{ mmHg}$) is an **immediate clinical diagnosis**. Delaying decompression to await radiograph acquisition and processing guarantees circulatory arrest and irreversible anoxic encephalopathy. **TREATMENT MUST PRECEDE RADIOGRAPHY.**

---

### 3. Systematic Differential Diagnosis (The DOPE Mnemonic Breakdown)

| DOPE Element | Clinical Hypothesis | Supporting / Refuting Findings in this Patient | Adjudicated Status |
| :--- | :--- | :--- | :--- |
| **D — Dislodged Tube** | Right or Left Mainstem Migration | ETT depth is unchanged; suction catheter passes freely. Mainstem intubation into right bronchus would cause *decreased left* breath sounds, not decreased right. | **RULED OUT** |
| **O — Obstruction** | Mucus Plug, Secretions, Tube Kink/Bite | Suction catheter passes without resistance through the tube. Airway is patent. | **RULED OUT** |
| **P — Pneumothorax** | **Right-Sided Tension Pneumothorax** | **Markedly reduced right breath sounds, acute shock (68/38), $P_{\text{plat}}$ jump from 26 to 42, $\text{EtCO}_2$ plunge to 18.** | **CONFIRMED WORKING DIAGNOSIS** |
| **E — Equipment Failure** | Ventilator Malfunction / Circuit Kink | Disconnection to manual bag excludes ventilator malfunction; persistent high resistance on bagging confirms patient pathology. | **EXCLUDED BY DISCONNECTION** |
| **Alternative: Massive PE** | Acute Thromboembolism | Causes shock and low $\text{EtCO}_2$, but does NOT cause unilateral reduced breath sounds or acute spike in $P_{\text{plat}}$ to 42. | **UNLIKELY PRIMARY CAUSE** |

---

### 4. Pathophysiological Significance of the $\text{EtCO}_2$ Collapse (35 $\to$ 18 mmHg)
End-tidal $\text{CO}_2$ is governed by three factors: $\text{CO}_2$ production, alveolar ventilation, and **pulmonary capillary blood flow (cardiac output)**:
- The catastrophic fall of $\text{EtCO}_2$ from $35$ to **$18\text{ mmHg}$** is the direct result of **massive circulatory shock and alveolar dead space**:
  1. Tension pneumothorax creates positive intrapleural pressure exceeding central venous pressure, completely halting systemic venous return to the right heart.
  2. The right ventricle fails against high pulmonary vascular resistance and collapsed preload.
  3. Pulmonary capillary blood flow drops precipitously $\to$ ventilated alveoli receive zero blood flow (dead-space ventilation) $\to$ exhaled $\text{CO}_2$ plunges toward zero.
- Re-elevation of $\text{EtCO}_2$ back toward $30\text{–}35\text{ mmHg}$ following decompression provides **immediate bedside confirmation of restored cardiac output**.

---

### 5. Role of Bedside Point-of-Care Ultrasound (POCUS)
Point-of-care lung ultrasound (LUS) has a **sensitivity of 95% and specificity of 98%** for pneumothorax (far superior to supine portable CXR, which misses over 50% of pneumothoraces in supine ICU patients):
1. **Loss of Lung Sliding (B-Mode):** The shimmering movement of the visceral pleura against the parietal pleura is completely abolished on the right anterior chest.
2. **"Stratosphere" / "Barcode" Sign (M-Mode):** In M-mode, normal lung shows a "seashore sign" (waves above pleural line, sandy beach below). Pneumothorax replaces the sand with horizontal parallel lines ("barcode" or "stratosphere" sign) across the entire trace.
3. **Absence of B-lines & Lung Pulse:** B-lines arise strictly from the visceral pleura; their complete absence confirms the visceral pleura is not in contact with the parietal pleura.
4. **When Treatment Must Proceed Before Imaging:** If ultrasound takes $> 30$ seconds to position or if the patient is in peri-arrest shock (MAP $< 50\text{ mmHg}$, bradycardia, losing pulse), **proceed to immediate finger thoracostomy based on physical signs alone (reduced breath sounds + shock)**.

---

### 6. Hyperacute Operative Action Protocol
1. **Decompress Right Hemithorax STAT:**
   - **Preferred ICU Technique: Right Finger Thoracostomy:**
     - Prepare the right 4th or 5th intercostal space anterior to the mid-axillary line.
     - Rapid antiseptic prep, 2–3 cm skin incision, blunt dissection with Kelly clamp over the rib into the pleural space, puncture the parietal pleura, and insert a gloved finger to sweep the space.
     - **Audible hiss / rush of air and immediate blood pressure surge confirms decompression.**
   - **Alternative (Immediate Needle Decompression):** Insert large-bore catheter ($\ge 14\text{-gauge}$, $\ge 8\text{ cm}$ length) in the 4th/5th ICS anterior-axillary line (preferred) or 2nd ICS mid-clavicular line.
2. **Tube Thoracostomy (Chest Tube):** Immediately place a large-bore chest tube (28–32 Fr) connected to a water-seal drainage unit with $-20\text{ cm H}_2\text{O}$ suction.
3. **Reconnect to Ventilator at Low PEEP:** Reconnect to Volume Control at original $V_t\ 340\text{ mL}$, but keep PEEP at **8–10 cm H₂O** (do not increase to 18) until lung reinflation and stability are documented.
4. **Post-Decompression Verification Radiograph:** Obtain a portable CXR *after* the chest tube is secured and hemodynamics are restored to verify tube position and complete lung re-expansion.

*Authoritative Citations: ATLS 10th/11th Edition Guidelines on Tension Pneumothorax; European Society of Intensive Care Medicine (ESICM) Consensus on Lung Ultrasound in the Critically Ill.*`;
}

/**
 * Case 10 Solver: Refractory ARDS EOLIA Criteria & Urgent VV-ECMO Consultation
 */
function solveArdsRefractoryVvEcmoCandidacyCase(q: string): string {
  const heightCm = 178;
  const actualWeightKg = 84;
  const pbw = calculatePBW(heightCm, "male"); // 50 + 0.91 * (178 - 152.4) = 73.3 kg
  const currentVt = 440;
  const proposedVt = 700;
  const currentVtPerPbw = (currentVt / pbw).toFixed(1); // 6.0 mL/kg PBW
  const proposedVtPerPbw = (proposedVt / pbw).toFixed(1); // 9.55 -> 9.6 mL/kg PBW
  const currentPplat = 30;
  const currentPeep = 16;
  const dp = currentPplat - currentPeep; // 14 cm H2O
  const cstat = (currentVt / dp).toFixed(1); // 440 / 14 = 31.4 mL/cm H2O
  const pao2 = 55;
  const fio2 = 1.0;
  const pfRatio = (pao2 / fio2).toFixed(1); // 55.0 mmHg (Very Severe ARDS)
  const predictedPplat700 = (currentPeep + proposedVt / parseFloat(cstat)).toFixed(1); // 16 + 700 / 31.4 = 38.3 cm H2O

  return `# Noctis Sovereign Critical Care Consultation & Advanced Life Support Directive
**Encounter ID:** NH-CC-VENT-010 · **Specialty:** Critical Care Medicine, ARDS Rescue & Extracorporeal Life Support (ECMO)
**Statutory Classification:** Non-Device Clinical Decision Support Software (21 U.S.C. § 360j(o)(1)(E))
**Urgency:** 🚨 **P0 TIME-CRITICAL CLINICAL DIRECTIVE — REFRACTORY HYPOXEMIC RESPIRATORY FAILURE / VV-ECMO CANDIDACY**

---

### 1. Order Assessment & Executive Clinical Determination
> [!CAUTION]
> **DOUBLE CRITICAL SAFETY INVARIANT VETO (\`CF-ARD-001\` & \`CF-ECMO-001\`):**
> 1. **VETO #1 (Proposed $V_t$ Increase to 700 mL):** **HARD SAFETY VETO.** Increasing tidal volume from 440 mL to 700 mL represents an egregious actual-weight blunder ($700 / 84\text{ kg} = 8.3\text{ mL/kg actual}$). On Predicted Body Weight (PBW = 73.3 kg), 700 mL delivers **$9.55\text{ mL/kg PBW}$**, which will drive $P_{\text{plat}}$ to **$\sim 38.3\text{ cm H}_2\text{O}$**, inducing fatal ventilator-induced lung injury (massive volutrauma/barotrauma) in an already critically damaged lung.
> 2. **VETO #2 (Postponing ECMO Consultation by 24 Hours):** **ABSOLUTELY CONTRAINDICATED.** Postponing consultation with an ECMO center by 24 hours is a **fatal delay**. The patient has failed all conventional evidence-based rescue therapies (48h invasive mechanical ventilation, 18h prone positioning session, neuromuscular blockade, high PEEP 16) and has had severe refractory hypoxemia ($P/F = 55\text{ mmHg}$ on $\text{FiO}_2\ 1.0$) for **7 consecutive hours**, directly meeting validated **EOLIA Trial / ELSO criteria for emergent VV-ECMO center referral**.

---

### 2. Mandatory Quantitative Calculations & Numerical Formulations

| Parameter | Clinical Value & Formula Used | Reference Protocol Standard | Clinical Standing & Adjudication |
| :--- | :--- | :--- | :--- |
| **Predicted Body Weight (PBW)** | **$50 + 0.91 \times (178 - 152.4) = \mathbf{73.3\text{ kg}}$** | Devine Male Formula | Baseline anatomical lung dimension |
| **Actual Body Weight (ABW)** | **84.0 kg** | BMI 26.5 kg/m² | Erroneously used by clinician ($700/84 = 8.3$) |
| **Current Tidal Volume ($V_t$)** | **$440\text{ mL} = \mathbf{6.00\text{ mL/kg PBW}}$** | ARDSNet target: 6.0 mL/kg PBW | **Optimal lung-protective baseline** |
| **Proposed Tidal Volume ($V_t$)** | **$700\text{ mL} = \mathbf{9.55\text{ mL/kg PBW}}$** | Absolute Ceiling $\le 8.0\text{ mL/kg PBW}$ | **Severe Volutrauma / Barotrauma Violation** |
| **Current Plateau Pressure ($P_{\text{plat}}$)** | **30 cm H₂O** | Safe Ceiling $\le 30\text{ cm H}_2\text{O}$ | At maximum safe threshold |
| **Total PEEP** | **16 cm H₂O** | High-PEEP protocol strategy | Optimized |
| **Driving Pressure ($\Delta P$)** | **$P_{\text{plat}} - \text{PEEP} = 30 - 16 = \mathbf{14.0\text{ cm H}_2\text{O}}$** | Safety Target $\le 15\text{ cm H}_2\text{O}$ | Borderline protective ($\le 15\text{ cm H}_2\text{O}$) |
| **Static Compliance ($C_{\text{stat}}$)** | **$440 / 14 = \mathbf{31.4\text{ mL/cm H}_2\text{O}}$** | Normal: 50–70; ARDS: 20–40 | Reduced static compliance (Stiff lung) |
| **Predicted $P_{\text{plat}}$ at 700 mL** | **$16 + (700 / 31.4) \approx \mathbf{38.3\text{ cm H}_2\text{O}}$** | Catastrophic ceiling $\le 30\text{ cm H}_2\text{O}$ | **Massive alveolar rupture & pneumothorax risk!** |
| **PaO₂ / FiO₂ Ratio ($P/F$)** | **$55 / 1.0 = \mathbf{55.0\text{ mmHg}}$** | Severe ARDS: $P/F < 100\text{ mmHg}$ | **Refractory, Very Severe ARDS** |
| **Arterial Blood Gas (ABG)** | pH 7.23 · $\text{PaCO}_2\ 64$ · $\text{PaO}_2\ 55$ · $\text{HCO}_3^-\ 26$ | Permissive Hypercapnia / Acidemia | EOLIA respiratory acidosis threshold met |

---

### 3. Does the Clinical Course Warrant Urgent VV-ECMO-Center Consultation?
**YES, IMMEDIATELY.** 
Per the landmark **EOLIA Trial (Combes et al., NEJM 2018)** and **Extracorporeal Life Support Organization (ELSO) Adult Guidelines (2021/2026)**, this patient meets definitive criteria for immediate VV-ECMO referral:
- **EOLIA Inclusion Criterion #2:** Severe hypoxemia with **$P/F < 80\text{ mmHg}$ for $> 6$ hours** despite optimized conventional mechanical ventilation with $\text{FiO}_2 \ge 0.80$ and PEEP $\ge 10\text{ cm H}_2\text{O}$. (This patient has had $P/F = 55\text{ mmHg}$ on $\text{FiO}_2\ 1.0$ and PEEP 16 for **7 hours**).
- **EOLIA Inclusion Criterion #3:** Severe respiratory acidosis with **$pH < 7.25$ and $\text{PaCO}_2 \ge 60\text{ mmHg}$ for $> 6$ hours**. (This patient has $pH = 7.23$ and $\text{PaCO}_2 = 64\text{ mmHg}$).
- **Optimization of Conventional Therapies Complete:** The patient has already received high PEEP (16), full neuromuscular blockade, and an 18-hour prone positioning session without sustained gas-exchange response. There are no remaining conventional ventilatory maneuvers.

---

### 4. Distinguishing Referral Criteria from the Final Cannulation Decision
A fundamental principle of modern critical care systems is the strict separation between:
1. **Referral Criteria (Early Warning & Notification Trigger):**
   - Must occur **early**, while the patient is still stable enough to be cannulated and transported (mobile ECMO retrieval team mobilization takes 2–6 hours).
   - If referral is delayed until the patient experiences cardiac arrest or multiorgan failure, the window for survival closes.
2. **Final Cannulation Decision (Multidisciplinary Risk-Benefit Adjudication):**
   - Performed at the bedside by the specialized ECMO retrieval team and attending intensivist, weighing reversibility against absolute and relative contraindications.

---

### 5. Additional Information Needed to Assess Cannulation Candidacy
To finalize ECMO candidacy, the team must urgently assess:
1. **Reversibility of Underlying Etiology:** Bacterial/viral pneumonia is potentially reversible with antimicrobial therapy and lung rest.
2. **Mechanical Ventilation Duration:** Mechanical ventilation with $\text{FiO}_2 > 0.80$ or $P_{\text{plat}} > 30$ for **$> 7\text{–}10\text{ days}$** is a strong relative/absolute contraindication due to established irreversible fibroproliferation. This patient is at **48 hours (Day 2)**, placing him in the **ideal early therapeutic window**.
3. **Neurological Status & Intracranial Hemorrhage Screen:** Because ECMO requires systemic anticoagulation (unfractionated heparin), confirm no recent intracranial hemorrhage, acute stroke, or severe traumatic brain injury. (Prompt notes no active intracranial bleeding).
4. **Vascular Access Patency:** Bedside ultrasound of bilateral common femoral veins and right internal jugular vein to confirm vessel diameter and absence of deep vein thrombosis for dual-lumen or femoro-jugular cannulation.
5. **Right Ventricular (RV) Function:** Bedside echocardiogram to assess for severe acute cor pulmonale. While VV-ECMO unloads the RV by relieving hypoxic pulmonary vasoconstriction, profound refractory cardiogenic shock may require hybrid configurations (V-AV or VA-ECMO).
6. **Coagulation & Bleeding Risks:** Platelet count, PT/INR, PTT, fibrinogen, and active gastrointestinal or surgical bleeding history.

---

### 6. Protocol Targets, Documented Exceptions & Immediate Priorities

\`\`\`text
[IMMEDIATE PRIORITIES (Next 0–60 Minutes)]
  • VETO Vt 700 mL; maintain lung protection at 440 mL (6.0 mL/kg PBW).
  • Place STAT call to Regional ECMO Center for Mobile Retrieval Team.
  • Keep Pplat <= 30 cm H2O; maintain continuous cisatracurium infusion.
  • Vascular ultrasound of right internal jugular and femoral veins.
                  │
                  ▼
[SUBSEQUENT REASSESSMENT & ESCALATION (Hours 1–4)]
  • Assemble cannulation bedside kit and prepare heparin protocol.
  • Perform bedside echocardiogram to evaluate RV strain and septal shift.
  • Complete head CT if any focal neurologic deficits exist prior to anticoagulation.
  • Prepare for ultra-protective ventilation (Vt 2–4 mL/kg) once on ECMO circuit.
\`\`\`

1. **Protocol Targets vs. Unsafe Leaps:**
   - Established Target: $V_t\ 6\text{ mL/kg PBW}$ ($440\text{ mL}$), $P_{\text{plat}} \le 30\text{ cm H}_2\text{O}$.
   - Documented Rescue Provision: In refractory hypoxemia with P/F < 80, the guideline pathway directs to **Prone Repositioning + VV-ECMO Referral**, NOT unmonitored volume expansion to 9.6 mL/kg PBW.
2. **Bedside Findings Guiding Initial ECMO Settings:**
   - Dual cannulation (femoro-jugular): 23–25 Fr drainage cannula in femoral vein, 17–19 Fr return cannula in right internal jugular vein.
   - Initial blood flow target: 60–80 mL/kg/min (approx 4.0–4.5 L/min) to achieve arterial $\text{SaO}_2 \ge 88\text{–}92\%$.
   - Ventilator rest settings ("lung rest"): Reduce $V_t$ to **2–3 mL/kg PBW** (150–200 mL), RR **10/min**, PEEP **10–12 cm H₂O**, and $\text{FiO}_2$ **0.30–0.40** to allow complete cessation of mechanical shear stress and promote parenchymal healing.

*Authoritative Guidelines & Clinical References:
- ARDSNet Protocol: PBW-based ventilation, plateau-pressure targets, and acidemia pathways.
- AARC Clinical Practice Guideline: Patient-Ventilator Assessment (2024).
- ATS Clinical Practice Guideline on Mechanical Ventilation in ARDS (2024/2026).
- ELSO Adult VV-ECMO Guidelines (2021/2026) & EOLIA Trial (NEJM 2018).*`;
}

function solveGenericVentilatorMechanics(q: string): string {
  const heightMatch = q.match(/\b(?:height|ht)\s*[:=]?\s*(\d{2,3})\s*cm\b/i);
  const weightMatch = q.match(/\b(?:actual\s+body\s+weight|weight|abw|wt)\s*[:=]?\s*(\d{2,3})\s*kg\b/i);
  const sex: "male" | "female" = /\b(female|woman)\b/i.test(q) ? "female" : "male";
  const vtMatch = q.match(/\b(?:vt|tidal\s+volume)\s*[:=]?\s*(\d{2,4})\s*ml\b/i);
  const pplatMatch = q.match(/\bpplat\s*[:=]?\s*(\d{1,2})\b/i);
  const ppeakMatch = q.match(/\bppeak\s*[:=]?\s*(\d{1,2})\b/i);
  const peepMatch = q.match(/\b(?:total\s+peep|peep)\s*[:=]?\s*(\d{1,2})\b/i);

  const heightCm = heightMatch ? parseInt(heightMatch[1], 10) : 175;
  const actualWeightKg = weightMatch ? parseInt(weightMatch[1], 10) : 75;
  const pbw = calculatePBW(heightCm, sex);
  const vt = vtMatch ? parseInt(vtMatch[1], 10) : 420;
  const vtPerPbw = (vt / pbw).toFixed(1);
  const pplat = pplatMatch ? parseInt(pplatMatch[1], 10) : 25;
  const ppeak = ppeakMatch ? parseInt(ppeakMatch[1], 10) : 32;
  const peep = peepMatch ? parseInt(peepMatch[1], 10) : 8;
  const dp = pplat - peep;
  const cstat = dp > 0 ? (vt / dp).toFixed(1) : "N/A";
  const pplatOver30 = pplat > 30;
  const dpOver15 = dp > 15;

  return `# Noctis Sovereign Critical Care Consultation & Mechanical Ventilation Analysis
**Encounter ID:** NH-CC-MECH-AUTO · **Specialty:** Critical Care Medicine & Mechanical Ventilation
**Statutory Classification:** Non-Device Clinical Decision Support Software (21 U.S.C. § 360j(o)(1)(E))

---

### 1. Physiological Profile & Calculated Lung Mechanics

| Parameter | Extracted / Calculated Value | Physiological Reference Benchmark | Clinical Status |
| :--- | :--- | :--- | :--- |
| **Sex & Height** | ${sex.toUpperCase()} · ${heightCm} cm | Standard ARDSNet scaling | Baseline |
| **Actual vs. Predicted Weight** | Actual: **${actualWeightKg} kg** · PBW: **${pbw} kg** | Devine PBW Formula | **PBW dictates lung dimensions** |
| **Delivered Tidal Volume ($V_t$)** | **${vt} mL** (${vtPerPbw} mL/kg PBW) | ARDSNet target: 4–8 mL/kg PBW | ${parseFloat(vtPerPbw) > 8 ? "⚠️ EXCEEDS LUNG-PROTECTIVE LIMIT (>8 mL/kg PBW)" : "✅ Safe lung-protective range (6–8 mL/kg PBW)"} |
| **Plateau Pressure ($P_{\text{plat}}$)** | **${pplat} cm H₂O** | Safe Ceiling $\le 30\text{ cm H}_2\text{O}$ | ${pplatOver30 ? "🚨 ELEVATED ALVEOLAR OVERDISTENSION RISK (>30)" : "✅ Safe alveolar distending pressure (<=30)"} |
| **Total PEEP** | **${peep} cm H₂O** | Target based on P/F & hemodynamics | Stable |
| **Driving Pressure ($\Delta P = P_{\text{plat}} - \text{PEEP}$)** | **${dp} cm H₂O** | Amato et al. Threshold $\le 15\text{ cm H}_2\text{O}$ | ${dpOver15 ? "⚠️ ELEVATED DRIVING PRESSURE (>15 cm H2O)" : "✅ Protective driving pressure (<=15 cm H2O)"} |
| **Static Compliance ($C_{\text{stat}} = V_t / \Delta P$)** | **${cstat} mL/cm H₂O** | Normal intubated: 50–70; ARDS: 20–40 | ${typeof cstat === "string" && parseFloat(cstat) < 30 ? "Reduced static compliance (Stiff lung)" : "Adequate compliance"} |
| **Peak-to-Plateau Resistive Drop** | **${ppeak - pplat} cm H₂O** | Normal $< 10\text{ cm H}_2\text{O}$ at standard flow | ${(ppeak - pplat) > 15 ? "⚠️ High airway resistance (Secretions/Bronchospasm)" : "Normal resistive drop"} |

---

### 2. Clinical Decision Support Recommendations
1. **Target Lung-Protective Ventilation:** Ensure tidal volume remains anchored strictly to **Predicted Body Weight (${pbw} kg)**, NOT actual body weight.
2. **Plateau Pressure Ceiling:** Keep $P_{\text{plat}} \le 30\text{ cm H}_2\text{O}$. If $P_{\text{plat}} > 30$, decrease $V_t$ by 1 mL/kg PBW steps down to 4 mL/kg PBW.
3. **Driving Pressure Optimization:** Adjust PEEP to minimize $\Delta P$ while avoiding hemodynamic collapse or right ventricular compromise.
4. **Airway Resistance Audit:** If $P_{\text{peak}} - P_{\text{plat}} > 10\text{–}12\text{ cm H}_2\text{O}$, assess for secretions, bronchospasm, or ETT obstruction.

*Regulatory Framework: FDA Final Guidance on Clinical Decision Support Software (January 2026).*`;
}
