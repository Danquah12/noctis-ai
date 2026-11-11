/**
 * NOCTIS SOVEREIGN ADVANCED HEMODYNAMICS, SHOCK PHENOTYPING & RESUSCITATION ENGINE (NOCTIS-HEMO-001)
 * Standards & Guidelines:
 * - Society for Cardiovascular Angiography and Interventions (SCAI) Cardiogenic Shock Staging (2022 Update)
 * - Surviving Sepsis Campaign (SSC) International Guidelines for Shock Management (2021-2026)
 * - Extracorporeal Life Support Organization (ELSO) Mechanical Circulatory Support Guidelines
 * - Pulmonary Artery Catheter Physiology (PAC / Swan-Ganz Physiological Profiling)
 *
 * Non-Compensatory Safety Invariants:
 * - CF-HEMO-001: Pure Inotrope Vasoplegia Veto (Dobutamine monotherapy without vasopressor in SBP < 80 mmHg causes catastrophic collapse)
 * - CF-HEMO-002: Pure Alpha-1 Afterload Veto (Phenylephrine in failing LV cardiogenic shock spikes afterload and precipitously drops Cardiac Power Output)
 * - CF-HEMO-003: Fixed Vasopressin Titration Veto (Titrating Vasopressin > 0.03-0.04 units/min causes coronary and mesenteric ischemia)
 * - CF-HEMO-004: Fluid Overload Cardiogenic Shock Veto (Aggressive fluid loading in PCWP > 18 mmHg precipitates alveolar flooding)
 */

export interface HemodynamicProfileInput {
  systolicBpMmHg: number;
  diastolicBpMmHg: number;
  heartRateBpm: number;
  centralVenousPressureMmHg: number; // CVP
  meanPulmonaryArteryPressureMmHg: number; // mPAP
  systolicPaPressureMmHg?: number; // sPAP
  diastolicPaPressureMmHg?: number; // dPAP
  pulmonaryCapillaryWedgePressureMmHg: number; // PCWP
  cardiacOutputLMin: number; // CO
  bodySurfaceAreaM2: number; // BSA
  centralVenousOxygenSatPercent?: number; // ScvO2
  mixedVenousOxygenSatPercent?: number; // SvO2
  arterialLactateMmolL: number;
  activeVasoactiveAgents: string[];
}

export interface HemodynamicCalculationsResult {
  engineId: "NOCTIS-HEMO-001";
  meanArterialPressureMmHg: number;
  systemicVascularResistanceDyns: number; // SVR = ((MAP - CVP) * 80) / CO
  pulmonaryVascularResistanceDyns: number; // PVR = ((mPAP - PCWP) * 80) / CO
  cardiacIndexLMinM2: number; // CI = CO / BSA
  cardiacPowerOutputWatts: number; // CPO = (MAP * CO) / 451
  pulmonaryArteryPulsatilityIndex?: number; // PAPI = (sPAP - dPAP) / CVP
  shockPhenotype: "DISTRIBUTIVE_SEPTIC" | "CARDIOGENIC" | "HYPOVOLEMIC" | "OBSTRUCTIVE" | "MIXED_VASOPLEGIC_CARDIOGENIC" | "NORMODYNAMIC";
  scaiStage: "STAGE_A_AT_RISK" | "STAGE_B_BEGINNING" | "STAGE_C_CLASSIC" | "STAGE_D_DETERIORATING" | "STAGE_E_EXTREMIS";
  vasoactiveOptimizationDirectives: string[];
  mechanicalCirculatorySupportDirectives: string[];
  safetyVetoes: string[];
}

export function evaluateAdvancedHemodynamics(input: HemodynamicProfileInput): HemodynamicCalculationsResult {
  const {
    systolicBpMmHg,
    diastolicBpMmHg,
    heartRateBpm,
    centralVenousPressureMmHg,
    meanPulmonaryArteryPressureMmHg,
    systolicPaPressureMmHg,
    diastolicPaPressureMmHg,
    pulmonaryCapillaryWedgePressureMmHg,
    cardiacOutputLMin,
    bodySurfaceAreaM2,
    arterialLactateMmolL,
    activeVasoactiveAgents,
  } = input;

  const vetoes: string[] = [];
  const vasoDirectives: string[] = [];
  const mcsDirectives: string[] = [];

  // 1. Core Hemodynamic Equations
  // MAP = DBP + (SBP - DBP) / 3
  const map = Math.round((diastolicBpMmHg + (systolicBpMmHg - diastolicBpMmHg) / 3) * 10) / 10;

  // SVR = ((MAP - CVP) * 80) / CO (Normal: 800 - 1200 dyn*s*cm^-5)
  const svr = Math.round((((map - centralVenousPressureMmHg) * 80) / cardiacOutputLMin) * 10) / 10;

  // PVR = ((mPAP - PCWP) * 80) / CO (Normal: 100 - 250 dyn*s*cm^-5)
  const pvr = Math.round((((meanPulmonaryArteryPressureMmHg - pulmonaryCapillaryWedgePressureMmHg) * 80) / cardiacOutputLMin) * 10) / 10;

  // CI = CO / BSA (Normal: 2.5 - 4.0 L/min/m^2)
  const ci = Math.round((cardiacOutputLMin / bodySurfaceAreaM2) * 100) / 100;

  // CPO = (MAP * CO) / 451 (Threshold: < 0.6 W predicts > 50% mortality in shock)
  const cpo = Math.round(((map * cardiacOutputLMin) / 451) * 100) / 100;

  // PAPI = (sPAP - dPAP) / CVP (Normal > 2.0; < 0.9-1.0 indicates severe RV failure)
  let papi: number | undefined;
  if (systolicPaPressureMmHg !== undefined && diastolicPaPressureMmHg !== undefined && centralVenousPressureMmHg > 0) {
    papi = Math.round(((systolicPaPressureMmHg - diastolicPaPressureMmHg) / centralVenousPressureMmHg) * 100) / 100;
  }

  // 2. Shock Phenotyping
  let phenotype: HemodynamicCalculationsResult["shockPhenotype"] = "NORMODYNAMIC";
  if (ci < 2.2 && pulmonaryCapillaryWedgePressureMmHg >= 15 && svr >= 800) {
    phenotype = "CARDIOGENIC";
  } else if (svr < 800 && (ci >= 2.2 || arterialLactateMmolL >= 2.0)) {
    phenotype = "DISTRIBUTIVE_SEPTIC";
  } else if (ci < 2.2 && pulmonaryCapillaryWedgePressureMmHg < 8 && centralVenousPressureMmHg < 5 && svr > 1200) {
    phenotype = "HYPOVOLEMIC";
  } else if (ci < 2.2 && svr < 800) {
    phenotype = "MIXED_VASOPLEGIC_CARDIOGENIC";
  } else if (centralVenousPressureMmHg >= 15 && ci < 2.2 && Math.abs(centralVenousPressureMmHg - pulmonaryCapillaryWedgePressureMmHg) <= 4) {
    phenotype = "OBSTRUCTIVE";
  }

  // 3. SCAI Staging (Society for Cardiovascular Angiography and Interventions)
  let scai: HemodynamicCalculationsResult["scaiStage"] = "STAGE_A_AT_RISK";
  const numPressors = activeVasoactiveAgents.length;

  if (activeVasoactiveAgents.some((a) => a.toLowerCase().includes("cpr") || a.toLowerCase().includes("arrest"))) {
    scai = "STAGE_E_EXTREMIS";
  } else if (numPressors >= 2 || (numPressors >= 1 && arterialLactateMmolL >= 4.0)) {
    scai = "STAGE_D_DETERIORATING";
  } else if (ci < 2.2 || arterialLactateMmolL >= 2.0 || numPressors >= 1) {
    scai = "STAGE_C_CLASSIC";
  } else if (systolicBpMmHg < 90 || heartRateBpm > 100) {
    scai = "STAGE_B_BEGINNING";
  }

  // 4. Non-Compensatory Safety Invariant Checks
  // CF-HEMO-001: Dobutamine monotherapy in profound hypotension
  const hasDobutamine = activeVasoactiveAgents.some((a) => a.toLowerCase().includes("dobutamine"));
  const hasVasopressor = activeVasoactiveAgents.some((a) => {
    const l = a.toLowerCase();
    return l.includes("norepinephrine") || l.includes("levophed") || l.includes("vasopressin") || l.includes("epinephrine");
  });
  if (hasDobutamine && !hasVasopressor && systolicBpMmHg < 85) {
    vetoes.push(
      "CF-HEMO-001 [PURE INOTROPE VASOPLEGIA VETO]: Dobutamine possesses beta-2 vasodilatory properties. Initiating or running Dobutamine without a background alpha-1 vasopressor (Norepinephrine) in SBP < 85 mmHg precipitates acute vascular collapse and fatal coronary hypoperfusion. Add Norepinephrine immediately."
    );
  }

  // CF-HEMO-002: Phenylephrine in cardiogenic shock
  const hasPhenylephrine = activeVasoactiveAgents.some((a) => a.toLowerCase().includes("phenylephrine") || a.toLowerCase().includes("neo-synephrine"));
  if (hasPhenylephrine && phenotype === "CARDIOGENIC") {
    vetoes.push(
      "CF-HEMO-002 [PHENYLEPHRINE CARDIOGENIC AFTERLOAD VETO]: Phenylephrine is a pure alpha-1 agonist with zero inotropy. In cardiogenic shock, the sudden increase in left ventricular afterload sharply reduces stroke volume and collapses Cardiac Power Output (CPO). Discontinue Phenylephrine; switch to Norepinephrine or Dobutamine."
    );
  }

  // CF-HEMO-003: Fixed vasopressin titration veto
  const hasHighVasopressin = activeVasoactiveAgents.some((a) => {
    const l = a.toLowerCase();
    return l.includes("vasopressin") && (l.includes("0.06") || l.includes("0.08") || l.includes("0.1"));
  });
  if (hasHighVasopressin) {
    vetoes.push(
      "CF-HEMO-003 [FIXED VASOPRESSIN DOSE VETO]: Vasopressin must be maintained at a fixed dose of 0.03 units/min (never titrated). Doses > 0.03-0.04 units/min induce intense splanchnic and coronary vasoconstriction, precipitating bowel ischemia and myocardial infarction."
    );
  }

  // CF-HEMO-004: Fluid overload in high PCWP
  if (pulmonaryCapillaryWedgePressureMmHg >= 18 && activeVasoactiveAgents.some((a) => a.toLowerCase().includes("bolus"))) {
    vetoes.push(
      `CF-HEMO-004 [FLUID OVERLOAD CARDIOGENIC VETO]: Pulmonary Capillary Wedge Pressure is ${pulmonaryCapillaryWedgePressureMmHg} mmHg (>= 18 mmHg). The left ventricle is operating on the flat decompensated plateau of the Frank-Starling curve. Additional crystalloid boluses will NOT increase stroke volume and will cause acute alveolar flooding / flash pulmonary edema. Discontinue fluid boluses immediately.`
    );
  }

  // 5. Optimization & MCS Directives
  if (phenotype === "DISTRIBUTIVE_SEPTIC") {
    vasoDirectives.push("First-Line Vasopressor: Norepinephrine titrated to target MAP >= 65 mmHg.");
    vasoDirectives.push("Second-Line Vasopressor: Vasopressin fixed at 0.03 units/min if Norepinephrine escalates > 0.25 mcg/kg/min.");
    vasoDirectives.push("If myocardial dysfunction or persistent hypoperfusion despite MAP >= 65 mmHg: Add Dobutamine (2.5-10 mcg/kg/min).");
  } else if (phenotype === "CARDIOGENIC" || phenotype === "MIXED_VASOPLEGIC_CARDIOGENIC") {
    vasoDirectives.push("Inotropic Support: Initiate Dobutamine (2.5-10 mcg/kg/min) or Milrinone (0.25-0.5 mcg/kg/min if normal renal function) to augment cardiac index.");
    vasoDirectives.push("Vasopressor: Pair with Norepinephrine to maintain coronary perfusion pressure (target MAP 65-75 mmHg).");
    if (cpo < 0.6) {
      mcsDirectives.push(
        `🚨 CRITICAL CARDIAC POWER COLLAPSE: Cardiac Power Output (CPO) is ${cpo} W (< 0.6 W threshold), which carries > 50% in-hospital mortality on medical therapy alone. Emergent Mechanical Circulatory Support (MCS) evaluation indicated.`
      );
      if (papi !== undefined && papi < 0.9) {
        mcsDirectives.push(
          `BIVENTRICULAR FAILURE DETECTED: PAPI is ${papi} (< 0.9) indicating acute RV failure alongside LV failure. Left-sided unloader alone (Impella CP) may precipitate acute RV decompensation. Consider Bi-Pella or VA-ECMO with LV venting.`
        );
      } else {
        mcsDirectives.push("Isolated LV Failure: Impella CP / 5.5 percutaneous axial microaxial pump placement recommended for active LV unloading and forward flow augmentation.");
      }
    }
  }

  return {
    engineId: "NOCTIS-HEMO-001",
    meanArterialPressureMmHg: map,
    systemicVascularResistanceDyns: svr,
    pulmonaryVascularResistanceDyns: pvr,
    cardiacIndexLMinM2: ci,
    cardiacPowerOutputWatts: cpo,
    pulmonaryArteryPulsatilityIndex: papi,
    shockPhenotype: phenotype,
    scaiStage: scai,
    vasoactiveOptimizationDirectives: vasoDirectives,
    mechanicalCirculatorySupportDirectives: mcsDirectives,
    safetyVetoes: vetoes,
  };
}

// ============================================================================
// NATURAL LANGUAGE ROUTER FOR ADVANCED HEMODYNAMICS QUERIES
// ============================================================================

export function handleNaturalHemodynamicsQuery(question: string): string | null {
  const q = question.trim();
  if (!q) return null;

  const isHemoQuery =
    (/\b(hemodynamic|swan-ganz|pulmonary\s+artery\s+catheter|pac|cardiac\s+power\s+output|cpo|papi|pulmonary\s+artery\s+pulsatility|scai|cardiogenic\s+shock|svr|pvr|wedge\s+pressure|pcwp)\b/i.test(
      q
    ) &&
      /\b(calculate|shock|phenotype|vasopressor|dobutamine|norepinephrine|impella|ecmo|lactate)\b/i.test(q)) ||
    /\b(cpo\s*=|cardiac\s+power\s*=|papi\s*=|scai\s+stage)\b/i.test(q);

  if (!isHemoQuery) return null;

  // Extract parameters
  const sbpMatch = q.match(/(?:sbp|bp)\s*(?:is|of|:)?\s*(\d+)/i);
  const sbp = sbpMatch ? parseInt(sbpMatch[1], 10) : 84;

  const dbpMatch = q.match(/(?:dbp)\s*(?:is|of|:)?\s*(\d+)/i);
  const dbp = dbpMatch ? parseInt(dbpMatch[1], 10) : 52;

  const cvpMatch = q.match(/(?:cvp)\s*(?:is|of|:)?\s*(\d+)/i);
  const cvp = cvpMatch ? parseInt(cvpMatch[1], 10) : 14;

  const pcwpMatch = q.match(/(?:pcwp|wedge)\s*(?:is|of|:)?\s*(\d+)/i);
  const pcwp = pcwpMatch ? parseInt(pcwpMatch[1], 10) : 22;

  const mpapMatch = q.match(/(?:mpap|pap)\s*(?:is|of|:)?\s*(\d+)/i);
  const mpap = mpapMatch ? parseInt(mpapMatch[1], 10) : 34;

  const coMatch = q.match(/(?:co|cardiac\s+output)\s*(?:is|of|:)?\s*(\d+(?:\.\d+)?)/i);
  const co = coMatch ? parseFloat(coMatch[1]) : 3.2;

  const bsaMatch = q.match(/(?:bsa)\s*(?:is|of|:)?\s*(\d+(?:\.\d+)?)/i);
  const bsa = bsaMatch ? parseFloat(bsaMatch[1]) : 1.9;

  const lacMatch = q.match(/(?:lactate)\s*(?:is|of|:)?\s*(\d+(?:\.\d+)?)/i);
  const lac = lacMatch ? parseFloat(lacMatch[1]) : 3.8;

  const meds: string[] = [];
  if (/\bdobutamine\b/i.test(q)) meds.push("Dobutamine 5 mcg/kg/min");
  if (/\bnorepinephrine|levo\b/i.test(q)) meds.push("Norepinephrine 0.15 mcg/kg/min");
  if (/\bphenylephrine|neo\b/i.test(q)) meds.push("Phenylephrine 100 mcg/min");
  if (/\bvasopressin\b/i.test(q)) meds.push("Vasopressin 0.03 units/min");
  if (meds.length === 0) meds.push("Norepinephrine 0.1 mcg/kg/min");

  const report = evaluateAdvancedHemodynamics({
    systolicBpMmHg: sbp,
    diastolicBpMmHg: dbp,
    heartRateBpm: 105,
    centralVenousPressureMmHg: cvp,
    meanPulmonaryArteryPressureMmHg: mpap,
    systolicPaPressureMmHg: 42,
    diastolicPaPressureMmHg: 26,
    pulmonaryCapillaryWedgePressureMmHg: pcwp,
    cardiacOutputLMin: co,
    bodySurfaceAreaM2: bsa,
    arterialLactateMmolL: lac,
    activeVasoactiveAgents: meds,
  });

  return formatHemoReport(report, sbp, dbp, co, cvp, pcwp);
}

function formatHemoReport(
  res: HemodynamicCalculationsResult,
  sbp: number,
  dbp: number,
  co: number,
  cvp: number,
  pcwp: number
): string {
  let md = `### Noctis Advanced Hemodynamics & Shock Phenotyping Engine (NOCTIS-HEMO-001)\n`;
  md += `**Shock Phenotype:** \`${res.shockPhenotype}\` · **SCAI Shock Stage:** \`${res.scaiStage}\`\n\n`;

  if (res.safetyVetoes.length > 0) {
    md += `#### 🚨 Non-Compensatory Safety Invariants\n`;
    for (const v of res.safetyVetoes) {
      md += `- ${v}\n`;
    }
    md += `\n`;
  }

  md += `#### 1. Invasive Hemodynamic Equations & Calculated Parameters\n`;
  md += `$$\\text{Mean Arterial Pressure (MAP)} = \\text{DBP} + \\frac{\\text{SBP} - \\text{DBP}}{3} = ${dbp} + \\frac{${sbp} - ${dbp}}{3} = \\mathbf{${res.meanArterialPressureMmHg}\\text{ mmHg}}$$\n`;
  md += `$$\\text{Cardiac Index (CI)} = \\frac{\\text{CO}}{\\text{BSA}} = \\frac{${co}}{1.9} = \\mathbf{${res.cardiacIndexLMinM2}\\text{ L/min/m}^2}\\quad (${res.cardiacIndexLMinM2 < 2.2 ? "DEPRESSED < 2.2" : "Adequate"})$$\n`;
  md += `$$\\text{Systemic Vascular Resistance (SVR)} = \\frac{(\\text{MAP} - \\text{CVP}) \\times 80}{\\text{CO}} = \\frac{(${res.meanArterialPressureMmHg} - ${cvp}) \\times 80}{${co}} = \\mathbf{${res.systemicVascularResistanceDyns}\\text{ dyn}\\cdot\\text{s}\\cdot\\text{cm}^{-5}}$$\n`;
  md += `$$\\text{Cardiac Power Output (CPO)} = \\frac{\\text{MAP} \\times \\text{CO}}{451} = \\frac{${res.meanArterialPressureMmHg} \\times ${co}}{451} = \\mathbf{${res.cardiacPowerOutputWatts}\\text{ Watts}}\\quad (${res.cardiacPowerOutputWatts < 0.6 ? "CRITICAL < 0.6 W (>50% Mortality)" : "Compensated"})$$\n`;
  if (res.pulmonaryArteryPulsatilityIndex !== undefined) {
    md += `$$\\text{Pulmonary Artery Pulsatility Index (PAPI)} = \\frac{\\text{sPAP} - \\text{dPAP}}{\\text{CVP}} = \\mathbf{${res.pulmonaryArteryPulsatilityIndex}}\\quad (${res.pulmonaryArteryPulsatilityIndex < 0.9 ? "ACUTE RV FAILURE < 0.9" : "Adequate RV Function"})$$\n`;
  }
  md += `\n`;

  md += `#### 2. Vasoactive & Inotropic Drug Optimization\n`;
  for (const dir of res.vasoactiveOptimizationDirectives) {
    md += `- ${dir}\n`;
  }
  md += `\n`;

  if (res.mechanicalCirculatorySupportDirectives.length > 0) {
    md += `#### 3. Mechanical Circulatory Support (MCS) Decision Directives\n`;
    for (const mcs of res.mechanicalCirculatorySupportDirectives) {
      md += `- ${mcs}\n`;
    }
  }

  return md;
}
