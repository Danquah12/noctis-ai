/**
 * ============================================================================
 * NOCTIS SOVEREIGN ACUTE RV FAILURE, MASSIVE PE & STATUS ASTHMATICUS ENGINE (NOCTIS-PULM-RV-001)
 * Standard: 2025/2026 ESC Guidelines on Pulmonary Embolism,
 *           AHA Scientific Statement on Acute Right Ventricular Failure,
 *           ATS/ERS Guidelines on Severe Asthma & Mechanical Ventilation
 * Domain: RV-PA Uncoupling, McConnell's Sign, Fluid Restriction Invariant,
 *         Massive PE Thrombolysis vs Mechanical Thrombectomy & Bleeding Veto,
 *         Status Asthmaticus Auto-PEEP, Permissive Hypercapnia & Ventilator Disconnect Rule
 * ============================================================================
 */

export interface RvFailureEvaluation {
  systolicBpMmhg: number;
  meanArterialPressureMmhg: number;
  centralVenousPressureMmhg: number;
  tapseMm: number; // Tricuspid Annular Plane Systolic Excursion (< 16 mm is abnormal)
  rvLvDiameterRatio: number; // > 1.0 is severe dilation
  dShapedSeptumPresent: boolean;
  fluidBolusProposedMl?: number;
  norepinephrineOrdered: boolean;
  inhaledVasodilatorActive?: "INHALED_NITRIC_OXIDE" | "INHALED_EPOPROSTENOL" | "NONE";
  inodilatorActive?: "MILRINONE" | "DOBUTAMINE" | "NONE";
}

export interface PulmonaryEmbolismEvaluation {
  systolicBpMmhg: number;
  hypotensionDurationMinutes: number;
  cardiacArrestActive: boolean;
  rvDysfunctionPresent: boolean; // Echo RV/LV > 0.9 or McConnell's sign
  cardiacBiomarkersElevated: boolean; // Troponin or BNP
  systemicThrombolysisProposed: boolean;
  hasAbsoluteBleedingContraindication: boolean; // Prior ICH, stroke within 3mo, vascular malformation
  candidateForCatheterThrombectomy: boolean;
}

export interface StatusAsthmaticusEvaluation {
  intubated: boolean;
  arterialPh: number;
  arterialPaco2Mmhg: number;
  autoPeepCmh2o: number; // Intrinsic PEEP
  plateauPressureCmh2o: number; // Target < 30
  respiratoryRatePerMin: number;
  inspiratoryToExpiratoryRatio: string; // e.g. "1:2", "1:4", "1:5"
  suddenPostIntubationHypotension: boolean;
  ventilatorDisconnectedForExhalation: boolean;
}

export interface PulmRvAssessmentResult {
  engineId: "NOCTIS-PULM-RV-001";
  clinicalDomain: "CRITICAL_CARE_PULMONOLOGY_RV";
  timestamp: string;
  summary: string;
  calculations: Record<string, string | number | boolean>;
  recommendations: string[];
  safetyVetoesTriggered: string[];
  references: string[];
}

export function evaluateRvFailure(input: RvFailureEvaluation): PulmRvAssessmentResult {
  const isRvFailure = input.tapseMm < 16 || input.rvLvDiameterRatio > 1.0 || input.dShapedSeptumPresent;

  const calculations: Record<string, string | number | boolean> = {
    systolicBp: `${input.systolicBpMmhg} mmHg`,
    meanArterialPressure: `${input.meanArterialPressureMmhg} mmHg`,
    centralVenousPressure: `${input.centralVenousPressureMmhg} mmHg`,
    tapse: `${input.tapseMm} mm (Threshold < 16 mm)`,
    rvLvRatio: `${input.rvLvDiameterRatio} (Threshold > 1.0)`,
    dShapedSeptum: input.dShapedSeptumPresent,
    rvFailureStage: isRvFailure
      ? input.systolicBpMmhg < 90
        ? "DECOMPENSATED_RV_CARDIOGENIC_SHOCK"
        : "ACUTE_RV_PRESSURE_OVERLOAD"
      : "NORMAL_RV_FUNCTION",
  };

  const recommendations: string[] = [];
  const safetyVetoesTriggered: string[] = [];

  // Veto 1: Fluid Overload Veto in Acute RV Failure
  if ((input.fluidBolusProposedMl ?? 0) > 250 && (input.centralVenousPressureMmhg >= 12 || input.rvLvDiameterRatio > 0.9)) {
    safetyVetoesTriggered.push(
      `CF-PULM-001 [ACUTE RV FAILURE FLUID RESTRICTION VETO]: Proposed IV fluid bolus of ${input.fluidBolusProposedMl} mL is strictly contraindicated. The right ventricle is already dilated (RV/LV ratio ${input.rvLvDiameterRatio}, CVP ${input.centralVenousPressureMmhg} mmHg). In acute RV failure, volume loading shifts the interventricular septum leftward, compresses the LV cavity, impairs LV preload, increases tricuspid regurgitation, and precipitates fatal cardiogenic shock. IMMEDIATELY CANCEL FLUID BOLUS. If CVP > 15 mmHg, initiate loop diuresis or ultrafiltration.`
    );
  }

  // Hemodynamic Management Bundle
  if (input.meanArterialPressureMmhg < 65 || input.systolicBpMmhg < 90) {
    recommendations.push(
      "RESTORE RIGHT CORONARY ARTERY PERFUSION: Initiate Norepinephrine infusion STAT (target MAP >= 65 mmHg). Increasing aortic root pressure restores right ventricular perfusion pressure without significantly increasing pulmonary vascular resistance (PVR)."
    );
  }

  // Selective Pulmonary Vasodilators
  recommendations.push(
    "SELECTIVE PULMONARY VASODILATION: Administer Inhaled Nitric Oxide (iNO 20-40 ppm) or Inhaled Epoprostenol (Flolan 10-50 ng/kg/min). Inhaled route selectively dilates pulmonary vasculature in ventilated lung units, lowering RV afterload WITHOUT causing systemic hypotension."
  );

  // Inotropy
  if (input.meanArterialPressureMmhg >= 65) {
    recommendations.push(
      "RV INOTROPIC AUGMENTATION: Initiate Dobutamine (2.5-10 mcg/kg/min) or Milrinone (0.25-0.75 mcg/kg/min) to augment RV contractility. Exercise extreme caution with Milrinone as systemic vasodilation can cause arterial hypotension."
    );
  }

  return {
    engineId: "NOCTIS-PULM-RV-001",
    clinicalDomain: "CRITICAL_CARE_PULMONOLOGY_RV",
    timestamp: new Date().toISOString(),
    summary: safetyVetoesTriggered.length > 0
      ? "Acute RV failure safety invariant violated (hazardous fluid expansion)."
      : `Acute RV evaluation: ${calculations.rvFailureStage}. Triple-target hemodynamic bundle active.`,
    calculations,
    recommendations,
    safetyVetoesTriggered,
    references: [
      "AHA Scientific Statement: Evaluation and Management of Right-Sided Heart Failure (Circulation)",
      "European Society of Cardiology (ESC) Guidelines on Acute Heart Failure (2025/2026)",
    ],
  };
}

export function evaluatePulmonaryEmbolism(input: PulmonaryEmbolismEvaluation): PulmRvAssessmentResult {
  const isMassive = input.systolicBpMmhg < 90 || input.cardiacArrestActive || input.hypotensionDurationMinutes >= 15;
  const isSubmassive = !isMassive && input.rvDysfunctionPresent && input.cardiacBiomarkersElevated;

  const peRisk = isMassive ? "HIGH_RISK_MASSIVE_PE" : isSubmassive ? "INTERMEDIATE_HIGH_SUBMASSIVE_PE" : "LOW_RISK_PE";

  const calculations: Record<string, string | number | boolean> = {
    systolicBp: `${input.systolicBpMmhg} mmHg`,
    riskClassification: peRisk,
    rvDysfunction: input.rvDysfunctionPresent,
    biomarkersElevated: input.cardiacBiomarkersElevated,
    thrombolysisCandidate: input.systemicThrombolysisProposed,
    absoluteBleedingContraindication: input.hasAbsoluteBleedingContraindication,
  };

  const recommendations: string[] = [];
  const safetyVetoesTriggered: string[] = [];

  // Veto 2: Systemic Thrombolysis with Absolute Bleeding Contraindication
  if (input.systemicThrombolysisProposed && input.hasAbsoluteBleedingContraindication) {
    safetyVetoesTriggered.push(
      "CF-PULM-002 [SYSTEMIC THROMBOLYSIS ABSOLUTE BLEEDING CONTRAINDICATION VETO]: Systemic thrombolysis (Alteplase/tPA) ordered despite absolute contraindications (prior intracranial hemorrhage, recent ischemic stroke, active bleeding, or intracranial neoplasm). Risk of fatal intracerebral hemorrhage is > 20%. IMMEDIATELY CANCEL SYSTEMIC TPA. Direct patient emergently to Catheter-Directed Mechanical Thrombectomy (FlowTriever / Lightning 12) or Surgical Pulmonary Embolectomy, or initiate VA-ECMO bridge."
    );
  }

  // Treatment recommendations based on PE Risk
  if (isMassive && !input.hasAbsoluteBleedingContraindication) {
    recommendations.push(
      "MASSIVE PE SYSTEMIC REPERFUSION: (1) In cardiac arrest: Alteplase (tPA) 50 mg IV bolus over 2 minutes, continue CPR for at least 30 minutes; (2) In sustained shock: Alteplase 100 mg IV infusion over 2 hours; (3) Unfractionated Heparin: 80 units/kg IV bolus followed by 18 units/kg/hr, titrating to anti-Xa 0.3-0.7 IU/mL."
    );
  } else if (isMassive && input.hasAbsoluteBleedingContraindication) {
    recommendations.push(
      "ADVANCED PERCUTANEOUS REPERFUSION: Perform urgent Catheter-Directed Mechanical Thrombectomy (FlowTriever / Inari Medical or Penumbra Lightning) without fibrinolytic agents. Alert cardiothoracic surgery for emergent surgical pulmonary embolectomy if catheter intervention unavailable."
    );
  } else if (isSubmassive) {
    recommendations.push(
      "INTERMEDIATE-HIGH RISK SUBMASSIVE PE STRATEGY: Initiate therapeutic Unfractionated Heparin infusion. Monitor in ICU. Prepare for rescue reperfusion if clinical deterioration occurs. Consider Ultrasound-Facilitated Catheter-Directed Thrombolysis (EKOS, 8-12 mg tPA per catheter over 6-12 hours) or Catheter Aspiration Thrombectomy to accelerate RV recovery."
    );
  }

  return {
    engineId: "NOCTIS-PULM-RV-001",
    clinicalDomain: "CRITICAL_CARE_PULMONOLOGY_RV",
    timestamp: new Date().toISOString(),
    summary: safetyVetoesTriggered.length > 0
      ? "Thrombolysis absolute contraindication veto triggered."
      : `Pulmonary embolism evaluated: ${peRisk}. Standardized reperfusion algorithm active.`,
    calculations,
    recommendations,
    safetyVetoesTriggered,
    references: [
      "ESC Guidelines for the Diagnosis and Management of Acute Pulmonary Embolism (2025/2026)",
      "CHEST Guidelines and Expert Panel Report on Antithrombotic Therapy for VTE Disease",
    ],
  };
}

export function evaluateStatusAsthmaticus(input: StatusAsthmaticusEvaluation): PulmRvAssessmentResult {
  const calculations: Record<string, string | number | boolean> = {
    intubated: input.intubated,
    arterialPh: input.arterialPh,
    paco2: `${input.arterialPaco2Mmhg} mmHg`,
    autoPeep: `${input.autoPeepCmh2o} cmH2O (Target < 10)`,
    plateauPressure: `${input.plateauPressureCmh2o} cmH2O (Target < 30)`,
    respiratoryRate: `${input.respiratoryRatePerMin} /min`,
    ieRatio: input.inspiratoryToExpiratoryRatio,
    postIntubationHypotension: input.suddenPostIntubationHypotension,
  };

  const recommendations: string[] = [];
  const safetyVetoesTriggered: string[] = [];

  // Veto 3: Post-Intubation Hypotension Ventilator Disconnect Rule
  if (input.suddenPostIntubationHypotension && !input.ventilatorDisconnectedForExhalation) {
    safetyVetoesTriggered.push(
      "CF-PULM-003 [ASTHMA DYNAMIC HYPERINFLATION / AUTO-PEEP COLLAPSE VETO]: Sudden cardiovascular collapse immediately following endotracheal intubation in severe status asthmaticus is driven by severe dynamic hyperinflation (Auto-PEEP > 15 cmH2O) and/or tension pneumothorax. Massive positive intrathoracic pressure halts venous return, causing PEA arrest. ACTION MANDATED: (1) IMMEDIATELY DISCONNECT THE PATIENT FROM THE VENTILATOR; (2) Manually compress the lower chest bilaterally to allow complete passive expiration of trapped gas (apnea trial for 30-40 seconds); (3) If hypotension does not resolve instantly, perform immediate bilateral needle thoracostomy or finger thoracostomy to decompress suspected tension pneumothorax."
    );
  }

  // Ventilator Strategy in Severe Obstructive Airway Disease
  recommendations.push(
    "LUNG-PROTECTIVE VENTILATION FOR SEVERE OBSTRUCTIVE DISEASE: (1) Tidal Volume: 6-8 mL/kg predicted body weight; (2) Respiratory Rate: Low rate (10-12 breaths/min) to allow prolonged expiratory time; (3) Inspiratory Flow Rate: High (80-100 L/min) with square wave to shorten inspiratory time and maximize I:E ratio (target 1:4 to 1:5); (4) Plateau Pressure: Maintain Pplat < 30 cmH2O to prevent barotrauma; (5) Permissive Hypercapnia: Tolerate PaCO2 60-90 mmHg as long as arterial pH remains >= 7.20."
  );

  // Adjunctive Therapies
  recommendations.push(
    "ADJUNCTIVE RESUSCITATION THERAPIES: (1) Inhaled Bronchodilators: Continuous Albuterol 10-15 mg/hr + Ipratropium 0.5 mg q4h; (2) Systemic Corticosteroids: Methylprednisolone 60-125 mg IV q6h; (3) Intravenous Magnesium: Magnesium Sulfate 2 g IV over 20 min; (4) Subcutaneous / IV Epinephrine: 0.3-0.5 mg IM or low-dose infusion (1-4 mcg/min) for refractory bronchospasm; (5) Ketamine: 1-2 mg/kg IV bolus followed by 0.5-2 mg/kg/hr infusion (NMDA antagonism with potent bronchodilation)."
  );

  return {
    engineId: "NOCTIS-PULM-RV-001",
    clinicalDomain: "CRITICAL_CARE_PULMONOLOGY_RV",
    timestamp: new Date().toISOString(),
    summary: safetyVetoesTriggered.length > 0
      ? "Status asthmaticus dynamic hyperinflation safety veto triggered."
      : "Severe obstructive airway disease evaluated. Protective ventilation and bronchodilator protocol active.",
    calculations,
    recommendations,
    safetyVetoesTriggered,
    references: [
      "Global Initiative for Asthma (GINA) Report: Global Strategy for Asthma Management and Prevention (2025/2026)",
      "ATS/ERS Guidelines on Severe Asthma Management",
    ],
  };
}

export function handleNaturalPulmRvQuery(prompt: string): string | null {
  const p = prompt.toLowerCase();
  const isMatch =
    p.includes("rv failure") ||
    p.includes("right ventricular") ||
    p.includes("tapse") ||
    p.includes("pulmonary embolism") ||
    p.includes("massive pe") ||
    p.includes("submassive pe") ||
    p.includes("thrombolysis") ||
    p.includes("status asthmaticus") ||
    p.includes("auto-peep") ||
    p.includes("dynamic hyperinflation") ||
    p.includes("mcconnell");

  if (!isMatch) return null;

  // Case 1: Status Asthmaticus & Auto-PEEP
  if (p.includes("status asthmaticus") || p.includes("auto-peep") || p.includes("hyperinflation") || (p.includes("asthma") && p.includes("ventilator"))) {
    const isCollapse = p.includes("hypotension") || p.includes("collapsed") || p.includes("post-intubation");
    const res = evaluateStatusAsthmaticus({
      intubated: true,
      arterialPh: 7.15,
      arterialPaco2Mmhg: 72,
      autoPeepCmh2o: 18,
      plateauPressureCmh2o: 34,
      respiratoryRatePerMin: 22,
      inspiratoryToExpiratoryRatio: "1:2",
      suddenPostIntubationHypotension: isCollapse,
      ventilatorDisconnectedForExhalation: false,
    });
    return formatPulmRvMarkdown(res);
  }

  // Case 2: Pulmonary Embolism
  if (p.includes("pulmonary embolism") || p.includes("massive pe") || p.includes("submassive pe") || p.includes("thrombolysis")) {
    const hasBleed = p.includes("contraindication") || p.includes("stroke") || p.includes("bleeding") || p.includes("ich");
    const res = evaluatePulmonaryEmbolism({
      systolicBpMmhg: 78,
      hypotensionDurationMinutes: 20,
      cardiacArrestActive: false,
      rvDysfunctionPresent: true,
      cardiacBiomarkersElevated: true,
      systemicThrombolysisProposed: true,
      hasAbsoluteBleedingContraindication: hasBleed,
      candidateForCatheterThrombectomy: true,
    });
    return formatPulmRvMarkdown(res);
  }

  // Case 3: Acute RV Failure
  if (p.includes("rv failure") || p.includes("right ventricular") || p.includes("tapse") || p.includes("mcconnell")) {
    const isFluid = p.includes("fluid") || p.includes("bolus") || p.includes("saline");
    const res = evaluateRvFailure({
      systolicBpMmhg: 82,
      meanArterialPressureMmhg: 54,
      centralVenousPressureMmhg: 18,
      tapseMm: 11,
      rvLvDiameterRatio: 1.4,
      dShapedSeptumPresent: true,
      fluidBolusProposedMl: isFluid ? 1000 : 0,
      norepinephrineOrdered: true,
      inhaledVasodilatorActive: "INHALED_NITRIC_OXIDE",
      inodilatorActive: "DOBUTAMINE",
    });
    return formatPulmRvMarkdown(res);
  }

  return null;
}

function formatPulmRvMarkdown(res: PulmRvAssessmentResult): string {
  let md = `### Noctis Critical Care Pulmonology & RV Failure Engine (${res.engineId})\n`;
  md += `**Clinical Domain:** ${res.clinicalDomain.replace(/_/g, " ")} · **Summary:** ${res.summary}\n\n`;

  if (res.safetyVetoesTriggered.length > 0) {
    md += `#### 🚨 Non-Compensatory Safety Invariants Enforced\n`;
    for (const veto of res.safetyVetoesTriggered) {
      md += `- **${veto}**\n`;
    }
    md += `\n`;
  }

  md += `#### 1. Hemodynamic & Ventilatory Measurements\n`;
  for (const [k, v] of Object.entries(res.calculations)) {
    md += `- **${k.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}:** \`${String(v)}\`\n`;
  }
  md += `\n`;

  md += `#### 2. Advanced Resuscitation & Interventional Directives\n`;
  for (const rec of res.recommendations) {
    md += `- ${rec}\n`;
  }
  md += `\n`;

  md += `#### 3. Clinical References & Statutory Guidelines\n`;
  for (const ref of res.references) {
    md += `- ${ref}\n`;
  }

  return md;
}
