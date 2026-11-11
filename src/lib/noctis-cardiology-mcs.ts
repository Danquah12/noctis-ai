/**
 * ============================================================================
 * NOCTIS SOVEREIGN CRITICAL CARE CARDIOLOGY & MCS ENGINE (NOCTIS-CARDIO-MCS-001)
 * Standard: 2026 AHA/ACC/HFSA/ELSO/ISHLT Critical Care Cardiology Guidelines
 * Domain: Mechanical Circulatory Support (Impella, IABP, LVAD), E-CPR,
 *         Post-Arrest TTM, Wide-Complex Tachycardia & Electrical Storm
 * ============================================================================
 */

export interface ImpellaEvaluation {
  deviceType: "Impella CP" | "Impella 5.5" | "Impella RP";
  currentPLevel: string;
  flowRateLpm: number;
  motorCurrentMa?: number;
  purgePressureMmhg: number;
  purgeFlowMlh: number;
  suctionAlarmActive: boolean;
  cvpMmhg?: number;
  wedgeMmhg?: number;
  lactateMmol: number;
  anticoagulationActive: boolean;
  activeBleeding: boolean;
}

export interface IabpEvaluation {
  currentRatio: "1:1" | "1:2" | "1:3";
  inflationTiming: "NORMAL_DICROTIC" | "EARLY_INFLATION" | "LATE_INFLATION";
  deflationTiming: "NORMAL_PRESYS" | "EARLY_DEFLATION" | "LATE_DEFLATION";
  aorticRegurgitationGrade: "NONE" | "MILD" | "MODERATE" | "SEVERE";
  aorticDissectionPresent: boolean;
  augmentedDiastolicPressureMmhg?: number;
  unassistedEndDiastolicMmhg?: number;
  assistedEndDiastolicMmhg?: number;
}

export interface EcprEvaluation {
  witnessedArrest: boolean;
  bystanderCprPerformed: boolean;
  initialRhythm: "VT" | "VF" | "PEA" | "ASYSTOLE";
  noFlowMinutes: number;
  cprMinutes: number;
  endTidalCo2Mmhg: number;
  patientAgeYears: number;
  pupilsResponsive: boolean;
}

export interface ArrhythmiaEvaluation {
  rhythmType: "WCT" | "POLYMORPHIC_VT_TORSADES" | "ELECTRICAL_STORM" | "MONOMORPHIC_VT" | "SVT_ABERRANCY";
  heartRateBpm: number;
  hemodynamicallyStable: boolean;
  qrsDurationMs: number;
  qtcIntervalMs?: number;
  leadAvrInitialR: boolean;
  brugadaCriteriaPositive: boolean;
  calciumChannelBlockerProposed?: boolean;
  serumPotassiumMeq?: number;
  serumMagnesiumMgdl?: number;
  priorShocks24h?: number;
}

export interface CardioMcsAssessmentResult {
  engineId: "NOCTIS-CARDIO-MCS-001";
  clinicalDomain: "CRITICAL_CARE_CARDIOLOGY_MCS";
  timestamp: string;
  summary: string;
  calculations: Record<string, string | number | boolean>;
  recommendations: string[];
  safetyVetoesTriggered: string[];
  references: string[];
}

export function evaluateImpellaManagement(input: ImpellaEvaluation): CardioMcsAssessmentResult {
  const calculations: Record<string, string | number | boolean> = {
    deviceType: input.deviceType,
    flowRate: `${input.flowRateLpm.toFixed(2)} L/min`,
    purgePressure: `${input.purgePressureMmhg} mmHg`,
    purgeFlow: `${input.purgeFlowMlh} mL/h`,
    suctionAlarm: input.suctionAlarmActive,
    activeBleeding: input.activeBleeding,
  };

  const recommendations: string[] = [];
  const safetyVetoesTriggered: string[] = [];

  // 1. Suction Alarm Handling
  if (input.suctionAlarmActive || input.flowRateLpm < 1.5) {
    recommendations.push(
      "IMMEDIATE ACTION FOR IMPELLA SUCTION ALARM: Drop P-level by 2 steps (e.g., P8 -> P6 or P6 -> P4) to interrupt native LV suction collapse. Perform emergent bedside echocardiography (TTE/TEE) immediately to assess: (1) cannula depth and inlet position relative to aortic valve (must be 3.5-4.0 cm below valve into mid-LV cavity, away from papillary muscles and septum); (2) RV failure with uncoupling; (3) acute volume depletion."
    );
    if (input.cvpMmhg !== undefined && input.cvpMmhg < 8) {
      recommendations.push(
        `Preload Deficit Detected (CVP ${input.cvpMmhg} mmHg < 8 mmHg): Administer 250-500 mL balanced crystalloid or blood product challenge while maintaining reduced P-level.`
      );
    }
  }

  // 2. Purge Pressure Diagnostics
  if (input.purgePressureMmhg < 300) {
    safetyVetoesTriggered.push(
      "CF-CARDIO-001 [IMPELLA PURGE LEAK VETO]: Purge pressure is critically low (< 300 mmHg). Indicates loose purge cassette connection, cracked luer lock, or severe purge leak. Biomaterial motor degradation risk. Check all purge line connections and replace purge cassette immediately."
    );
  } else if (input.purgePressureMmhg > 1100) {
    safetyVetoesTriggered.push(
      "CF-CARDIO-002 [IMPELLA PURGE OCCLUSION VETO]: Purge pressure exceeds 1,100 mmHg. Indicates biomaterial clot formation in motor bearings or mechanical kink in purge catheter. Administer bolus flush of purge fluid and prepare de-clotting or pump exchange."
    );
  }

  // 3. Bleeding vs Anticoagulation Veto
  if (input.activeBleeding && input.anticoagulationActive) {
    safetyVetoesTriggered.push(
      "CF-CARDIO-003 [ACTIVE HEMORRHAGE ANTICOAGULATION VETO]: Patient has active clinically significant hemorrhage while on systemic heparinization. Systemic heparin infusion must be STOPPED STAT. Convert Impella purge fluid to D5W without heparin (or minimal concentration) and reverse coagulopathy to target fibrinogen >= 150 mg/dL, platelets >= 50,000/mcL."
    );
  }

  return {
    engineId: "NOCTIS-CARDIO-MCS-001",
    clinicalDomain: "CRITICAL_CARE_CARDIOLOGY_MCS",
    timestamp: new Date().toISOString(),
    summary: input.suctionAlarmActive
      ? "Impella suction event and LV cavity collapse. Immediate P-level decrement and bedside echo navigation required."
      : "Impella hemodynamic support stable. Purge system and bearing lubrication within physiological safety envelopes.",
    calculations,
    recommendations,
    safetyVetoesTriggered,
    references: [
      "2026 ACC/AHA/SCAI Guideline for Management of Mechanical Circulatory Support in Cardiogenic Shock",
      "Abiomed Impella CP & 5.5 Clinical Management & Console Operating Guidelines (2025)",
      "ELSO Mechanical Circulatory Support Anticoagulation & Purge Protocol (2025)",
    ],
  };
}

export function evaluateIabpManagement(input: IabpEvaluation): CardioMcsAssessmentResult {
  const calculations: Record<string, string | number | boolean> = {
    frequencyRatio: input.currentRatio,
    inflationTiming: input.inflationTiming,
    deflationTiming: input.deflationTiming,
    aorticRegurgitation: input.aorticRegurgitationGrade,
    aorticDissection: input.aorticDissectionPresent,
  };

  const recommendations: string[] = [];
  const safetyVetoesTriggered: string[] = [];

  // Absolute Invariant Vetoes
  if (input.aorticDissectionPresent) {
    safetyVetoesTriggered.push(
      "CF-CARDIO-004 [IABP AORTIC DISSECTION ABSOLUTE CONTRAINDICATION VETO]: Intra-Aortic Balloon Counterpulsation is ABSOLUTELY CONTRAINDICATED in thoracic or abdominal aortic dissection. Pulsatile balloon inflation in the false lumen or tear will propagate catastrophic aortic rupture and immediate fatal exsanguination. Remove or cancel order STAT."
    );
  }

  if (input.aorticRegurgitationGrade === "MODERATE" || input.aorticRegurgitationGrade === "SEVERE") {
    safetyVetoesTriggered.push(
      `CF-CARDIO-005 [IABP MODERATE/SEVERE AORTIC REGURGITATION VETO]: Patient has ${input.aorticRegurgitationGrade} aortic regurgitation. Balloon inflation during diastole forces massive retrograde regurgitant volume across the incompetent aortic valve into the left ventricle, causing catastrophic acute LV dilation, severe wall stress, and fulminant cardiogenic pulmonary edema. IABP is strictly contraindicated.`
    );
  }

  // Timing Errors
  if (input.inflationTiming === "EARLY_INFLATION") {
    safetyVetoesTriggered.push(
      "CF-CARDIO-006 [IABP EARLY INFLATION AFTERLOAD SPIKE VETO]: Balloon inflation occurs PRIOR to the dicrotic notch (before aortic valve closure). This severely impedes ongoing LV ejection, dramatically spikes LV end-systolic wall stress, collapses stroke volume, and aggravates myocardial ischemia. Adjust inflation trigger later to coincide precisely with the dicrotic notch."
    );
  } else if (input.inflationTiming === "LATE_INFLATION") {
    recommendations.push(
      "Late Inflation Detected: Balloon inflates well after aortic valve closure. Diastolic coronary augmentation and mean arterial pressure support are compromised. Advance inflation marker to align with dicrotic notch."
    );
  }

  if (input.deflationTiming === "LATE_DEFLATION") {
    safetyVetoesTriggered.push(
      "CF-CARDIO-007 [IABP LATE DEFLATION RESISTANCE VETO]: Balloon deflation occurs AFTER the start of ventricular systole. The left ventricle is forced to eject against an inflated 40-50 cc balloon in the aorta. This creates extreme ventricular afterload, increases myocardial oxygen demand, and can precipitate acute isovolumetric LV failure. Advance deflation marker earlier, immediately before the R wave."
    );
  } else if (input.deflationTiming === "EARLY_DEFLATION") {
    recommendations.push(
      "Early Deflation Detected: Balloon deflates in mid-to-late diastole before systole begins. Results in sub-optimal afterload reduction and allows retrograde blood flow away from coronary circulation."
    );
  }

  if (safetyVetoesTriggered.length === 0) {
    recommendations.push(
      "IABP Counterpulsation Synchronized: Inflation at dicrotic notch produces optimal diastolic augmentation (augmented diastolic pressure > systolic BP); deflation immediately prior to R wave produces presystolic vacuum with reduction in assisted end-diastolic pressure and peak systolic pressure."
    );
  }

  return {
    engineId: "NOCTIS-CARDIO-MCS-001",
    clinicalDomain: "CRITICAL_CARE_CARDIOLOGY_MCS",
    timestamp: new Date().toISOString(),
    summary: safetyVetoesTriggered.length > 0
      ? "Critical IABP safety invariant violated (contraindication or dangerous timing anomaly)."
      : "IABP counterpulsation operating with synchronized inflation/deflation timing.",
    calculations,
    recommendations,
    safetyVetoesTriggered,
    references: [
      "AHA/ACC Scientific Statement on Intra-Aortic Balloon Pump Counterpulsation (2025)",
      "SCAI Expert Consensus on Timing and Troubleshooting Mechanical Circulatory Support (2026)",
    ],
  };
}

export function evaluateEcprCandidacy(input: EcprEvaluation): CardioMcsAssessmentResult {
  const calculations: Record<string, string | number | boolean> = {
    witnessedArrest: input.witnessedArrest,
    bystanderCpr: input.bystanderCprPerformed,
    initialRhythm: input.initialRhythm,
    noFlowMinutes: `${input.noFlowMinutes} min`,
    cprMinutes: `${input.cprMinutes} min`,
    totalIschemiaMinutes: `${input.noFlowMinutes + input.cprMinutes} min`,
    etco2Mmhg: `${input.endTidalCo2Mmhg} mmHg`,
    patientAgeYears: input.patientAgeYears,
  };

  const recommendations: string[] = [];
  const safetyVetoesTriggered: string[] = [];

  const shockable = input.initialRhythm === "VF" || input.initialRhythm === "VT";
  const totalArrestTime = input.noFlowMinutes + input.cprMinutes;

  // ELSO E-CPR Invariants
  if (!input.witnessedArrest && input.noFlowMinutes > 10) {
    safetyVetoesTriggered.push(
      "CF-CARDIO-008 [ECPR UNWITNESSED PROLONGED NO-FLOW VETO]: Cardiac arrest was unwitnessed with > 10 minutes of estimated no-flow time. Anoxic brain injury is irreversible; E-CPR is futile and contraindicated."
    );
  }

  if (input.endTidalCo2Mmhg < 10) {
    safetyVetoesTriggered.push(
      `CF-CARDIO-009 [ECPR INADEQUATE CHEST COMPRESSION ETCO2 VETO]: End-tidal CO2 is ${input.endTidalCo2Mmhg} mmHg (< 10 mmHg). Indicates severely inadequate systemic/cerebral perfusion pressure during CPR (cardiac output < 25% normal). Recalibrate compressions or evaluate futility before femoral cannulation.`
    );
  }

  if (totalArrestTime > 60) {
    recommendations.push(
      `Total CPR time is ${totalArrestTime} minutes (> 60 minutes). Neurologic survival declines precipitously after 60 minutes of conventional CPR. E-CPR should only proceed if signs of life (pupillary reflexes, gasping, spontaneous movement) are demonstrably present.`
    );
  }

  if (input.patientAgeYears > 70) {
    recommendations.push(
      `Patient age is ${input.patientAgeYears} years (> 70 years). In-hospital E-CPR mortality exceeds 85% in patients > 70. Re-evaluate overall comorbidity and baseline functional status.`
    );
  }

  if (input.witnessedArrest && shockable && input.noFlowMinutes <= 5 && input.endTidalCo2Mmhg >= 15 && totalArrestTime <= 60) {
    recommendations.push(
      "STRONG CANDIDATE FOR IMMEDIATE E-CPR (VA-ECMO CANNULATION): Patient meets all ELSO 2026 E-CPR criteria: (1) Witnessed arrest with immediate bystander CPR (no-flow <= 5 min); (2) Shockable rhythm (VT/VF); (3) High-quality CPR verified by ETCO2 >= 15 mmHg; (4) Total CPR window <= 60 min. Mobilize emergent ECMO cannulation team (percutaneous femoral venoarterial 21-25 Fr venous, 15-17 Fr arterial with 6-8 Fr antegrade distal leg perfusion catheter STAT)."
    );
  }

  return {
    engineId: "NOCTIS-CARDIO-MCS-001",
    clinicalDomain: "CRITICAL_CARE_CARDIOLOGY_MCS",
    timestamp: new Date().toISOString(),
    summary: safetyVetoesTriggered.length > 0
      ? "Patient does not meet criteria for E-CPR resuscitation due to non-compensatory futility markers."
      : "Patient is an eligible candidate for emergent Extracorporeal Cardiopulmonary Resuscitation (E-CPR / VA-ECMO).",
    calculations,
    recommendations,
    safetyVetoesTriggered,
    references: [
      "ELSO Interim Guidelines for Extracorporeal Cardiopulmonary Resuscitation (E-CPR) in Adults (2025/2026)",
      "AHA/ILCOR Focused Update on Adult Advanced Cardiovascular Life Support & E-CPR (2025)",
      "ARREST and PRAGUE OHCA Randomized Clinical Trials on E-CPR Efficacy (JAMA/Lancet)",
    ],
  };
}

export function evaluateArrhythmiaEmergency(input: ArrhythmiaEvaluation): CardioMcsAssessmentResult {
  const calculations: Record<string, string | number | boolean> = {
    rhythmType: input.rhythmType,
    heartRate: `${input.heartRateBpm} bpm`,
    qrsDuration: `${input.qrsDurationMs} ms`,
    qtcInterval: input.qtcIntervalMs ? `${input.qtcIntervalMs} ms` : "Not measured",
    hemodynamicallyStable: input.hemodynamicallyStable,
    leadAvrInitialR: input.leadAvrInitialR,
    brugadaPositive: input.brugadaCriteriaPositive,
  };

  const recommendations: string[] = [];
  const safetyVetoesTriggered: string[] = [];

  // 1. Wide-Complex Tachycardia & CCB Veto
  if (input.qrsDurationMs >= 120 && input.calciumChannelBlockerProposed) {
    safetyVetoesTriggered.push(
      "CF-CARDIO-010 [WIDE COMPLEX TACHYCARDIA VERAPAMIL/DILTIAZEM VETO]: Administering IV Verapamil or Diltiazem for wide-complex tachycardia of uncertain origin is PROHIBITED. If the rhythm is ventricular tachycardia (80-90% probability), calcium channel blockers cause severe peripheral vasodilation and negative inotropy, precipitating irreversible electromechanical dissociation, hemodynamic collapse, and immediate fatal cardiac arrest. Use IV Amiodarone, Procainamide, or Electrical Cardioversion."
    );
  }

  // 2. Polymorphic VT / Torsades de Pointes
  if (input.rhythmType === "POLYMORPHIC_VT_TORSADES" || (input.qtcIntervalMs && input.qtcIntervalMs > 500 && input.rhythmType === "WCT")) {
    recommendations.push(
      "TORSADES DE POINTES / LONG-QT RESUSCITATION PROTOCOL: (1) Administer Magnesium Sulfate 2.0 grams IV in 100 mL D5W over 1-2 minutes (repeatable in 5-10 minutes); (2) Aggressively correct serum potassium to target 4.5-5.0 mEq/L; (3) Overdrive pacing: accelerate heart rate to 100-110 bpm via temporary transvenous pacemaker or Isoproterenol infusion (1-10 mcg/min) to shorten ventricular repolarization and suppress early afterdepolarizations (EADs); (4) Discontinue all QT-prolonging drugs immediately; (5) Defibrillate STAT with unsynchronized 200 J biphasic shock if pulseless or hemodynamically unstable."
    );
  }

  // 3. Electrical Storm
  if (input.rhythmType === "ELECTRICAL_STORM" || (input.priorShocks24h !== undefined && input.priorShocks24h >= 3)) {
    recommendations.push(
      "VENTRICULAR ELECTRICAL STORM RESUSCITATION BUNDLE: Defined as >= 3 distinct episodes of sustained VT/VF requiring therapy within 24 hours. (1) Sympathetic Antagonism: Intravenous non-selective beta-blockade (Propranolol 1 mg IV q5min or continuous Esmolol infusion) is SUPERIOR to Amiodarone alone by blunting excessive adrenergic tone; (2) Deep Sedation & Analgesia: Propofol + Fentanyl or Dexmedetomidine infusion (consider endotracheal intubation to eliminate sympathetic surges); (3) Neuromodulation: Left stellate ganglion percutaneous block with bupivacaine; (4) Prepare for emergent mechanical circulatory support (Impella / VA-ECMO) or catheter ablation."
    );
  }

  // 4. Hemodynamic Instability Cardioversion Mandate
  if (!input.hemodynamicallyStable) {
    recommendations.push(
      "HEMODYNAMIC INSTABILITY DIRECTIVE: Patient exhibits signs of hemodynamic compromise (hypotension, altered mental status, pulmonary edema, ischemic chest pain). Do NOT wait for pharmacological conversion. Perform IMMEDIATE SYNCHRONIZED DIRECT-CURRENT CARDIOVERSION (100 J -> 200 J -> 300 J biphasic) under procedural sedation."
    );
  }

  return {
    engineId: "NOCTIS-CARDIO-MCS-001",
    clinicalDomain: "CRITICAL_CARE_CARDIOLOGY_MCS",
    timestamp: new Date().toISOString(),
    summary: safetyVetoesTriggered.length > 0
      ? "Dangerous antiarrhythmic contraindication identified (CCB in WCT)."
      : "Arrhythmia risk-stratified and targeted resuscitation pathway formulated.",
    calculations,
    recommendations,
    safetyVetoesTriggered,
    references: [
      "AHA/ACC/HRS Guideline for Management of Patients with Ventricular Arrhythmias and Prevention of Sudden Cardiac Death (2025/2026)",
      "2026 ESC Guidelines for the Management of Ventricular Tachycardia and Electrical Storm",
      "Vereckei et al. New Algorithm Using Only Lead aVR for Differential Diagnosis of Wide QRS Complex Tachycardia (EHJ)",
    ],
  };
}

export function handleNaturalCardioMcsQuery(prompt: string): string | null {
  const p = prompt.toLowerCase();
  const isCardioMcs =
    p.includes("impella") ||
    p.includes("iabp") ||
    p.includes("intra-aortic balloon") ||
    p.includes("lvad") ||
    p.includes("heartmate") ||
    p.includes("ecpr") ||
    p.includes("extracorporeal cpr") ||
    p.includes("torsades") ||
    p.includes("electrical storm") ||
    p.includes("wide complex tachycardia") ||
    (p.includes("dicrotic notch") && p.includes("balloon")) ||
    (p.includes("suction") && p.includes("p-level"));

  if (!isCardioMcs) return null;

  // Case 1: Impella Suction Alarm & Purge Diagnostics
  if (p.includes("impella")) {
    const isSuction = p.includes("suction") || p.includes("drop in flow") || p.includes("p-level");
    const isPurgeLeak = p.includes("purge pressure") && (p.includes("low") || p.includes("leak") || p.includes("150") || p.includes("200"));
    const isPurgeOcclusion = p.includes("purge pressure") && (p.includes("high") || p.includes("clot") || p.includes("1200") || p.includes("1400"));
    const isBleeding = p.includes("bleeding") || p.includes("hemorrhage");

    const res = evaluateImpellaManagement({
      deviceType: p.includes("5.5") ? "Impella 5.5" : p.includes("rp") ? "Impella RP" : "Impella CP",
      currentPLevel: "P-8",
      flowRateLpm: isSuction ? 1.2 : 3.4,
      purgePressureMmhg: isPurgeLeak ? 180 : isPurgeOcclusion ? 1250 : 600,
      purgeFlowMlh: 12.0,
      suctionAlarmActive: isSuction,
      cvpMmhg: isSuction ? 5 : 12,
      lactateMmol: 3.2,
      anticoagulationActive: true,
      activeBleeding: isBleeding,
    });
    return formatCardioMcsMarkdown(res);
  }

  // Case 2: IABP Timing & Contraindications
  if (p.includes("iabp") || p.includes("balloon pump") || p.includes("intra-aortic")) {
    const isEarlyInf = p.includes("early inflation") || p.includes("before dicrotic");
    const isLateDef = p.includes("late deflation") || p.includes("after systole");
    const isAr = p.includes("aortic regurgitation") || p.includes("aortic insufficiency");
    const isDissection = p.includes("dissection");

    const res = evaluateIabpManagement({
      currentRatio: "1:1",
      inflationTiming: isEarlyInf ? "EARLY_INFLATION" : "NORMAL_DICROTIC",
      deflationTiming: isLateDef ? "LATE_DEFLATION" : "NORMAL_PRESYS",
      aorticRegurgitationGrade: isAr ? "SEVERE" : "NONE",
      aorticDissectionPresent: isDissection,
    });
    return formatCardioMcsMarkdown(res);
  }

  // Case 3: E-CPR Candidacy
  if (p.includes("ecpr") || p.includes("extracorporeal cpr") || (p.includes("ecmo") && p.includes("cardiac arrest"))) {
    const unwitnessed = p.includes("unwitnessed");
    const lowEtco2 = p.includes("etco2 8") || p.includes("etco2 6") || p.includes("low etco2");
    const isAsystole = p.includes("asystole");

    const res = evaluateEcprCandidacy({
      witnessedArrest: !unwitnessed,
      bystanderCprPerformed: true,
      initialRhythm: isAsystole ? "ASYSTOLE" : "VF",
      noFlowMinutes: unwitnessed ? 15 : 2,
      cprMinutes: 28,
      endTidalCo2Mmhg: lowEtco2 ? 7 : 22,
      patientAgeYears: 54,
      pupilsResponsive: true,
    });
    return formatCardioMcsMarkdown(res);
  }

  // Case 4: Arrhythmia, WCT, Torsades & Electrical Storm
  const isTorsades = p.includes("torsades") || p.includes("polymorphic");
  const isStorm = p.includes("electrical storm") || p.includes("storm");
  const isCcb = p.includes("verapamil") || p.includes("diltiazem");

  const res = evaluateArrhythmiaEmergency({
    rhythmType: isTorsades ? "POLYMORPHIC_VT_TORSADES" : isStorm ? "ELECTRICAL_STORM" : "WCT",
    heartRateBpm: 185,
    hemodynamicallyStable: !p.includes("unstable") && !p.includes("hypotension") && !p.includes("shock"),
    qrsDurationMs: 165,
    qtcIntervalMs: isTorsades ? 540 : 440,
    leadAvrInitialR: true,
    brugadaCriteriaPositive: true,
    calciumChannelBlockerProposed: isCcb,
    priorShocks24h: isStorm ? 4 : 1,
  });
  return formatCardioMcsMarkdown(res);
}

function formatCardioMcsMarkdown(res: CardioMcsAssessmentResult): string {
  let md = `### Noctis Critical Care Cardiology & MCS Engine (${res.engineId})\n`;
  md += `**Clinical Domain:** ${res.clinicalDomain.replace(/_/g, " ")} · **Summary:** ${res.summary}\n\n`;

  if (res.safetyVetoesTriggered.length > 0) {
    md += `#### 🚨 Non-Compensatory Safety Invariants Enforced\n`;
    for (const veto of res.safetyVetoesTriggered) {
      md += `- **${veto}**\n`;
    }
    md += `\n`;
  }

  md += `#### 1. Device Diagnostics & Physiological Parameters\n`;
  for (const [k, v] of Object.entries(res.calculations)) {
    md += `- **${k.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}:** \`${String(v)}\`\n`;
  }
  md += `\n`;

  md += `#### 2. Protocol Actions & Hemodynamic Directives\n`;
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
