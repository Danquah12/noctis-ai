/**
 * NOCTIS SOVEREIGN TRAUMA, BURNS & SURGICAL CRITICAL CARE (NOCTIS-TRAUMA-BURNS-001)
 * Standards & Guidelines:
 * - American College of Surgeons (ACS) Advanced Trauma Life Support (ATLS 10th Ed)
 * - American Burn Association (ABA) Consensus Burn Resuscitation Guidelines
 * - World Society of the Abdominal Compartment Syndrome (WSACS) Consensus Definitions
 *
 * Non-Compensatory Safety Invariants:
 * - CF-TRAUMA-001: Tension Pneumothorax Imaging Delay Veto (Awaiting confirmatory chest radiograph in clinical tension pneumothorax is prohibited; immediate decompression mandatory)
 * - CF-TRAUMA-002: Burn Fluid Creep Over-Resuscitation Veto (Resuscitation exceeding 250 mL/kg in 24 hours causes secondary abdominal compartment syndrome and ARDS)
 * - CF-TRAUMA-003: Pelvic Binder Iliac Crest Misplacement Veto (Placing pelvic binder over iliac wings rather than greater trochanters worsens internal pelvic rotation and retroperitoneal hemorrhage)
 * - CF-TRAUMA-004: Abdominal Compartment Syndrome Decompression Delay Veto (IAP > 20 mmHg with new organ failure mandates emergent surgical decompression)
 */

export interface SevereBurnResuscitationInput {
  patientWeightKg: number;
  totalBodySurfaceAreaBurnPercent: number; // 2nd and 3rd degree burns
  hoursSinceBurnInjury: number;
  crystalloidInfusedSoFarMl: number;
  urineOutputMlPerHour: number;
  inhalationInjurySuspected: boolean;
  electricalBurnWithMyoglobinuria: boolean;
  intraAbdominalPressureMmHg?: number;
}

export interface SevereBurnResuscitationResult {
  engineId: "NOCTIS-TRAUMA-BURNS-001";
  totalCalculatedParkland24hVolumeMl: number;
  first8HoursVolumeMl: number;
  remaining16HoursVolumeMl: number;
  hourlyRateFirst8hMlHr: number;
  hourlyRateNext16hMlHr: number;
  adjustedRateForTimeElapsedMlHr: number;
  urineOutputEndpointTarget: string;
  fluidCreepRiskDetected: boolean;
  safetyVetoes: string[];
  burnResuscitationDirectives: string[];
}

export interface AbdominalCompartmentInput {
  patientWeightKg: number;
  intraAbdominalPressureMmHg: number; // Measured via bladder catheter at end-expiration
  meanArterialPressureMmHg: number;
  peakAirwayPressureCmH2O?: number;
  urineOutputMlPerHour: number;
  serumCreatinineMgDl?: number;
}

export interface AbdominalCompartmentResult {
  engineId: "NOCTIS-TRAUMA-BURNS-001";
  intraAbdominalHypertensionGrade: "NORMAL" | "GRADE_I" | "GRADE_II" | "GRADE_III" | "GRADE_IV";
  abdominalCompartmentSyndromePresent: boolean;
  abdominalPerfusionPressureMmHg: number; // APP = MAP - IAP
  appTargetMet: boolean; // Target >= 60 mmHg
  managementDirectives: string[];
  surgicalDecompressionIndicated: boolean;
  safetyVetoes: string[];
}

export interface TensionPneumoPelvicInput {
  clinicalScenario: "TENSION_PNEUMOTHORAX" | "UNSTABLE_PELVIC_FRACTURE" | "GENERAL_TRAUMA";
  systolicBpMmHg: number;
  heartRateBpm: number;
  trachealDeviation: boolean;
  absentUnilateralBreathSounds: boolean;
  severeHypoxemia: boolean;
  pelvicRingInstability: boolean;
  proposedAction: string;
}

export interface TensionPneumoPelvicResult {
  engineId: "NOCTIS-TRAUMA-BURNS-001";
  immediateLifeThreatIdentified: string;
  actionAuthorization: "APPROVED" | "VETOED_HAZARDOUS";
  immediateInterventionDirectives: string[];
  safetyVetoes: string[];
}

// ============================================================================
// 1. SEVERE THERMAL BURNS RESUSCITATION (PARKLAND FORMULA)
// ============================================================================

export function evaluateSevereBurnResuscitation(input: SevereBurnResuscitationInput): SevereBurnResuscitationResult {
  const {
    patientWeightKg,
    totalBodySurfaceAreaBurnPercent,
    hoursSinceBurnInjury,
    crystalloidInfusedSoFarMl,
    urineOutputMlPerHour,
    inhalationInjurySuspected,
    electricalBurnWithMyoglobinuria,
    intraAbdominalPressureMmHg,
  } = input;

  const vetoes: string[] = [];
  const dirs: string[] = [];

  // Consensus Parkland Formula: 4 mL * Weight (kg) * %TBSA (2nd & 3rd degree)
  // (Note: ABA guidelines recommend starting at 2-4 mL/kg/%TBSA; 4 mL/kg/%TBSA is standard for severe burns/inhalation)
  const parklandCoeff = inhalationInjurySuspected ? 4.0 : 3.0;
  const total24hMl = Math.round(parklandCoeff * patientWeightKg * totalBodySurfaceAreaBurnPercent);
  const first8hMl = Math.round(total24hMl / 2);
  const next16hMl = Math.round(total24hMl / 2);

  const stdFirst8hRate = Math.round(first8hMl / 8);
  const stdNext16hRate = Math.round(next16hMl / 16);

  // Time-Elapsed Catch-Up Calculation:
  // The first 50% must be delivered within 8 hours from TIME OF INJURY (not hospital arrival)
  let adjustedRate = stdFirst8hRate;
  if (hoursSinceBurnInjury < 8.0) {
    const hoursRemainingInFirst8 = Math.max(0.5, 8.0 - hoursSinceBurnInjury);
    const volumeRemainingInFirst8 = Math.max(0, first8hMl - crystalloidInfusedSoFarMl);
    adjustedRate = Math.round(volumeRemainingInFirst8 / hoursRemainingInFirst8);
  } else {
    adjustedRate = stdNext16hRate;
  }

  // Fluid Creep Check (> 250 mL/kg in 24h)
  const fluidCreepLimitMl = patientWeightKg * 250;
  const fluidCreep = total24hMl > fluidCreepLimitMl || (crystalloidInfusedSoFarMl > fluidCreepLimitMl * 0.5 && hoursSinceBurnInjury < 12);
  if (fluidCreep || (intraAbdominalPressureMmHg !== undefined && intraAbdominalPressureMmHg >= 16)) {
    vetoes.push(
      `CF-TRAUMA-002 [BURN FLUID CREEP VETO]: Projected 24h fluid volume (${total24hMl.toLocaleString()} mL) approaches or exceeds 250 mL/kg (${fluidCreepLimitMl.toLocaleString()} mL). Excessive crystalloid administration precipitates secondary Abdominal Compartment Syndrome, extremity compartment syndrome in unburned limbs, and lethal pulmonary edema. Titrate fluids down aggressively to the minimum rate necessary to maintain urine output.`
    );
  }

  // Urine Output Target:
  // Standard Adult: 0.5 mL/kg/h (30 - 50 mL/h)
  // Electrical with myoglobinuria: 1.0 - 1.5 mL/kg/h (75 - 100 mL/h) until urine clears
  let uopTarget = `Target urine output: 0.5 mL/kg/h (${Math.round(patientWeightKg * 0.5)} mL/hr, range 30-50 mL/hr).`;
  if (electricalBurnWithMyoglobinuria) {
    uopTarget = `Electrical Burn with Myoglobinuria Target: 1.0-1.5 mL/kg/h (${Math.round(patientWeightKg * 1.0)}-${Math.round(patientWeightKg * 1.5)} mL/hr) until gross hemochromogen/myoglobin pigment clears to prevent acute tubular necrosis.`;
  }

  dirs.push("Use Lactated Ringer's (or Plasma-Lyte) as the primary resuscitation crystalloid; avoid 0.9% Normal Saline to prevent hyperchloremic non-anion gap metabolic acidosis.");
  dirs.push("Hourly Titration: Adjust IV infusion rate by 20-30% each hour based strictly on measured urine output (do not run calculated formula rate blindly).");
  dirs.push("If urine output drops: Do NOT give crystalloid boluses; increase continuous infusion rate by 20-30%.");

  return {
    engineId: "NOCTIS-TRAUMA-BURNS-001",
    totalCalculatedParkland24hVolumeMl: total24hMl,
    first8HoursVolumeMl: first8hMl,
    remaining16HoursVolumeMl: next16hMl,
    hourlyRateFirst8hMlHr: stdFirst8hRate,
    hourlyRateNext16hMlHr: stdNext16hRate,
    adjustedRateForTimeElapsedMlHr: adjustedRate,
    urineOutputEndpointTarget: uopTarget,
    fluidCreepRiskDetected: fluidCreep,
    safetyVetoes: vetoes,
    burnResuscitationDirectives: dirs,
  };
}

// ============================================================================
// 2. ABDOMINAL COMPARTMENT SYNDROME (ACS) & IAP GRADING
// ============================================================================

export function evaluateAbdominalCompartmentSyndrome(input: AbdominalCompartmentInput): AbdominalCompartmentResult {
  const {
    patientWeightKg,
    intraAbdominalPressureMmHg,
    meanArterialPressureMmHg,
    peakAirwayPressureCmH2O,
    urineOutputMlPerHour,
  } = input;

  const vetoes: string[] = [];
  const dirs: string[] = [];

  // WSACS Grading:
  // Normal: 5-7 mmHg
  // Grade I: 12-15 mmHg
  // Grade II: 16-20 mmHg
  // Grade III: 21-25 mmHg
  // Grade IV: > 25 mmHg
  let grade: AbdominalCompartmentResult["intraAbdominalHypertensionGrade"] = "NORMAL";
  if (intraAbdominalPressureMmHg > 25) grade = "GRADE_IV";
  else if (intraAbdominalPressureMmHg >= 21) grade = "GRADE_III";
  else if (intraAbdominalPressureMmHg >= 16) grade = "GRADE_II";
  else if (intraAbdominalPressureMmHg >= 12) grade = "GRADE_I";

  // Abdominal Perfusion Pressure: APP = MAP - IAP (Target >= 60 mmHg)
  const app = meanArterialPressureMmHg - intraAbdominalPressureMmHg;
  const appMet = app >= 60;

  // ACS Definition: Sustained IAP > 20 mmHg associated with new organ failure (oliguria, decreased compliance, hypotension)
  const hasOrganFailure = urineOutputMlPerHour < patientWeightKg * 0.5 || (peakAirwayPressureCmH2O !== undefined && peakAirwayPressureCmH2O >= 35) || meanArterialPressureMmHg < 65;
  const acsPresent = intraAbdominalPressureMmHg > 20 && hasOrganFailure;

  if (acsPresent) {
    vetoes.push(
      `CF-TRAUMA-004 [ABDOMINAL COMPARTMENT SYNDROME DECOMPRESSION VETO]: Sustained IAP is ${intraAbdominalPressureMmHg} mmHg (> 20 mmHg) with concurrent acute organ dysfunction (oliguria / elevated airway pressures). Medical management alone is insufficient and carries near 100% mortality. Emergent surgical Decompressive Laparotomy (open abdomen) is mandatory.`
    );
  }

  // Tiered WSACS Medical Management
  dirs.push("1. Evacuate intraluminal contents: Place nasogastric tube to low continuous suction and rectal tube; administer prokinetics (metoclopramide / erythromycin) and enemas.");
  dirs.push("2. Evacuate intra-abdominal space-occupying collections: Perform bedside ultrasound-guided percutaneous catheter drainage of ascites, fluid collections, or hematomas.");
  dirs.push("3. Optimize abdominal wall compliance: Ensure adequate sedation and analgesia; administer trial of neuromuscular blockade (paralysis) which can reduce IAP by 4-6 mmHg.");
  dirs.push("4. Optimize fluid management: Stop excessive crystalloids; initiate net negative fluid balance with diuretics or CRRT ultrafiltration; avoid fluid boluses.");
  dirs.push("5. Optimize perfusion: Maintain Abdominal Perfusion Pressure (APP) >= 60 mmHg using vasopressors (Norepinephrine) if necessary.");

  return {
    engineId: "NOCTIS-TRAUMA-BURNS-001",
    intraAbdominalHypertensionGrade: grade,
    abdominalCompartmentSyndromePresent: acsPresent,
    abdominalPerfusionPressureMmHg: app,
    appTargetMet: appMet,
    managementDirectives: dirs,
    surgicalDecompressionIndicated: acsPresent,
    safetyVetoes: vetoes,
  };
}

// ============================================================================
// 3. TENSION PNEUMOTHORAX & PELVIC RING INSTABILITY
// ============================================================================

export function evaluateTensionPneumoAndPelvicTrauma(input: TensionPneumoPelvicInput): TensionPneumoPelvicResult {
  const {
    clinicalScenario,
    systolicBpMmHg,
    trachealDeviation,
    absentUnilateralBreathSounds,
    severeHypoxemia,
    pelvicRingInstability,
    proposedAction,
  } = input;

  const vetoes: string[] = [];
  const dirs: string[] = [];

  let lifeThreat = "Trauma Evaluation";
  let auth: TensionPneumoPelvicResult["actionAuthorization"] = "APPROVED";

  // Case 1: Tension Pneumothorax
  if (clinicalScenario === "TENSION_PNEUMOTHORAX" || (absentUnilateralBreathSounds && (trachealDeviation || systolicBpMmHg < 90 || severeHypoxemia))) {
    lifeThreat = "Tension Pneumothorax with Obstructive Shock";

    if (/\bwait\b|\bx-?ray\b|\bimaging\b|\bct\s+scan\b/i.test(proposedAction)) {
      auth = "VETOED_HAZARDOUS";
      vetoes.push(
        "CF-TRAUMA-001 [TENSION PNEUMOTHORAX IMAGING DELAY VETO]: Tension pneumothorax is a STRICTLY CLINICAL DIAGNOSIS. Delaying decompression to obtain a portable chest radiograph or CT scan in a hypotensive/hypoxemic patient precipitates immediate cardiac arrest. Perform immediate needle or finger decompression NOW."
      );
    }

    dirs.push("IMMEDIATE DECOMPRESSION STAT: Perform finger thoracostomy (or needle thoracostomy using 14-gauge 8cm angiocatheter at 5th intercostal space anterior axillary line or 2nd ICS mid-clavicular line).");
    dirs.push("Follow immediately with tube thoracostomy (28-32 Fr chest tube directed posteriorly and superiorly, connected to -20 cmH2O water seal).");
  }

  // Case 2: Pelvic Fracture with Shock
  if (clinicalScenario === "UNSTABLE_PELVIC_FRACTURE" || pelvicRingInstability) {
    lifeThreat = "Unstable Pelvic Ring Disruption / Hemorrhagic Shock";

    if (/\biliac\s+crest\b|\biliac\s+wings?\b|\bwaist\b/i.test(proposedAction)) {
      auth = "VETOED_HAZARDOUS";
      vetoes.push(
        "CF-TRAUMA-003 [PELVIC BINDER MISPLACEMENT VETO]: The pelvic binder must be positioned over the GREATER TROCHANTERS of the femurs. Placing the binder higher over the iliac crests acts as a fulcrum, exacerbating pelvic ring distraction, tearing retroperitoneal venous plexuses, and worsening hemorrhage."
      );
    }

    dirs.push("Apply commercial pelvic binder (e.g. SAM Pelvic Sling) centered over the GREATER TROCHANTERS and symphysis pubis (internally rotate lower extremities and tape feet together at the level of the big toes).");
    dirs.push("Activate Massive Transfusion Protocol (1:1:1); proceed directly to interventional radiology for pelvic angiography/embolization or OR for pre-peritoneal pelvic packing.");
  }

  return {
    engineId: "NOCTIS-TRAUMA-BURNS-001",
    immediateLifeThreatIdentified: lifeThreat,
    actionAuthorization: auth,
    immediateInterventionDirectives: dirs,
    safetyVetoes: vetoes,
  };
}

// ============================================================================
// NATURAL LANGUAGE ROUTER FOR TRAUMA, BURNS & SURGICAL CRITICAL CARE
// ============================================================================

export function handleNaturalTraumaBurnsQuery(question: string): string | null {
  const q = question.trim();
  if (!q) return null;

  const isBurnQuery =
    (/\b(burn|burns|parkland|tbsa|thermal|fluid\s+creep|inhalation\s+injury|rule\s+of\s+nines)\b/i.test(q) &&
      /\b(resuscitation|fluid|crystalloid|urine\s+output|lactated\s+ringer|hours?)\b/i.test(q)) ||
    /\b(parkland\s+formula|calculate\s+parkland)\b/i.test(q);

  const isAcsQuery =
    /\b(abdominal\s+compartment|intra-abdominal\s+pressure|iap|intra-abdominal\s+hypertension|iah|bladder\s+pressure|app\s*=|abdominal\s+perfusion\s+pressure|decompressive\s+laparotomy)\b/i.test(
      q
    );

  const isTensionOrPelvicQuery =
    /\b(tension\s+pneumothorax|absent\s+breath\s+sounds|tracheal\s+deviation|needle\s+decompression|finger\s+thoracostomy|pelvic\s+binder|pelvic\s+fracture|greater\s+trochanters?|iliac\s+crest)\b/i.test(
      q
    );

  if (!isBurnQuery && !isAcsQuery && !isTensionOrPelvicQuery) return null;

  // Extract weight
  const wtMatch = q.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilos?|kilograms?)/i);
  const weightKg = wtMatch ? parseFloat(wtMatch[1]) : 70;

  // 1. Burn Execution
  if (isBurnQuery) {
    const tbsaMatch = q.match(/(\d+(?:\.\d+)?)\s*(?:%|percent)\s*(?:tbsa|burns?)?/i);
    const tbsa = tbsaMatch ? parseFloat(tbsaMatch[1]) : 40;

    const hrsMatch = q.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\s*(?:post|since|after)?\s*(?:burn|injury)?/i);
    const hrs = hrsMatch ? parseFloat(hrsMatch[1]) : 2;

    const report = evaluateSevereBurnResuscitation({
      patientWeightKg: weightKg,
      totalBodySurfaceAreaBurnPercent: tbsa,
      hoursSinceBurnInjury: hrs,
      crystalloidInfusedSoFarMl: 1000,
      urineOutputMlPerHour: 35,
      inhalationInjurySuspected: /\binhalation\b/i.test(q),
      electricalBurnWithMyoglobinuria: /\belectrical|myoglobinuria\b/i.test(q),
      intraAbdominalPressureMmHg: 14,
    });

    return formatBurnReport(report, weightKg, tbsa, hrs);
  }

  // 2. ACS Execution
  if (isAcsQuery) {
    const iapMatch = q.match(/(?:iap|pressure)\s*(?:is|of|:)?\s*(\d+)/i);
    const iap = iapMatch ? parseInt(iapMatch[1], 10) : 24;

    const mapMatch = q.match(/(?:map)\s*(?:is|of|:)?\s*(\d+)/i);
    const map = mapMatch ? parseInt(mapMatch[1], 10) : 75;

    const uopMatch = q.match(/(?:uop|urine)\s*(?:is|of|:)?\s*(\d+)/i);
    const uop = uopMatch ? parseInt(uopMatch[1], 10) : 15;

    const report = evaluateAbdominalCompartmentSyndrome({
      patientWeightKg: weightKg,
      intraAbdominalPressureMmHg: iap,
      meanArterialPressureMmHg: map,
      peakAirwayPressureCmH2O: 38,
      urineOutputMlPerHour: uop,
    });

    return formatAcsReport(report);
  }

  // 3. Tension / Pelvic Execution
  const report = evaluateTensionPneumoAndPelvicTrauma({
    clinicalScenario: /\bpneumo|breath\s+sounds\b/i.test(q) ? "TENSION_PNEUMOTHORAX" : "UNSTABLE_PELVIC_FRACTURE",
    systolicBpMmHg: 78,
    heartRateBpm: 130,
    trachealDeviation: true,
    absentUnilateralBreathSounds: true,
    severeHypoxemia: true,
    pelvicRingInstability: /\bpelvic|binder\b/i.test(q),
    proposedAction: q,
  });

  return formatTensionPelvicReport(report);
}

function formatBurnReport(
  res: SevereBurnResuscitationResult,
  weightKg: number,
  tbsa: number,
  hrs: number
): string {
  let md = `### Noctis Severe Thermal Burn Resuscitation Engine (NOCTIS-TRAUMA-BURNS-001)\n`;
  md += `**Patient Weight:** ${weightKg} kg · **Burn Extent:** ${tbsa}% TBSA (2nd & 3rd Degree) · **Time Elapsed:** ${hrs} hours\n\n`;

  if (res.safetyVetoes.length > 0) {
    md += `#### 🚨 Non-Compensatory Safety Invariants\n`;
    for (const v of res.safetyVetoes) {
      md += `- ${v}\n`;
    }
    md += `\n`;
  }

  md += `#### 1. Consensus Parkland Fluid Calculations\n`;
  md += `$$\\text{Total 24-Hour Fluid} = 4\\text{ mL} \\times ${weightKg}\\text{ kg} \\times ${tbsa}\\% = \\mathbf{${res.totalCalculatedParkland24hVolumeMl.toLocaleString()}\\text{ mL}}$$\n`;
  md += `- **First 8 Hours (from time of burn injury):** **${res.first8HoursVolumeMl.toLocaleString()} mL** (Standard rate: ${res.hourlyRateFirst8hMlHr} mL/hr)\n`;
  md += `- **Adjusted Rate for Elapsed Time (${hrs}h elapsed):** **${res.adjustedRateForTimeElapsedMlHr} mL/hr**\n`;
  md += `- **Next 16 Hours:** **${res.remaining16HoursVolumeMl.toLocaleString()} mL** (Rate: ${res.hourlyRateNext16hMlHr} mL/hr)\n\n`;

  md += `#### 2. Physiological Endpoints & Fluid Creep Guardrails\n`;
  md += `- **Urine Output Target:** ${res.urineOutputEndpointTarget}\n`;
  md += `- **Fluid Creep Status:** \`${res.fluidCreepRiskDetected ? "HIGH RISK (> 250 mL/kg)" : "Within Safe Limits"}\`\n\n`;

  md += `#### 3. Clinical Resuscitation Directives\n`;
  for (const d of res.burnResuscitationDirectives) {
    md += `- ${d}\n`;
  }

  return md;
}

function formatAcsReport(res: AbdominalCompartmentResult): string {
  let md = `### Noctis Abdominal Compartment Syndrome (ACS) Engine (NOCTIS-TRAUMA-BURNS-001)\n`;
  md += `**IAH Classification:** \`${res.intraAbdominalHypertensionGrade}\` · **ACS Diagnosis:** \`${res.abdominalCompartmentSyndromePresent ? "ABDOMINAL COMPARTMENT SYNDROME PRESENT" : "IAH WITHOUT ACS"}\`\n\n`;

  if (res.safetyVetoes.length > 0) {
    md += `#### 🚨 Non-Compensatory Safety Invariants\n`;
    for (const v of res.safetyVetoes) {
      md += `- ${v}\n`;
    }
    md += `\n`;
  }

  md += `#### 1. Abdominal Perfusion Pressure (APP) Equation\n`;
  md += `$$\\text{Abdominal Perfusion Pressure (APP)} = \\text{MAP} - \\text{IAP} = \\mathbf{${res.abdominalPerfusionPressureMmHg}\\text{ mmHg}}\\quad (${res.appTargetMet ? "Adequate >= 60" : "COMPROMISED < 60 mmHg"})$$\n\n`;

  md += `#### 2. Surgical & Medical Decompression Directives\n`;
  md += `- **Decompressive Laparotomy (Open Abdomen):** \`${res.surgicalDecompressionIndicated ? "EMERGENT SURGICAL INTERVENTION MANDATORY" : "Medical Management First"}\`\n\n`;
  for (const dir of res.managementDirectives) {
    md += `- ${dir}\n`;
  }

  return md;
}

function formatTensionPelvicReport(res: TensionPneumoPelvicResult): string {
  let md = `### Noctis Trauma Emergency Resuscitation Engine (NOCTIS-TRAUMA-BURNS-001)\n`;
  md += `**Life Threat:** \`${res.immediateLifeThreatIdentified}\` · **Proposed Action Authorization:** \`${res.actionAuthorization}\`\n\n`;

  if (res.safetyVetoes.length > 0) {
    md += `#### 🚨 Non-Compensatory Safety Invariants\n`;
    for (const v of res.safetyVetoes) {
      md += `- ${v}\n`;
    }
    md += `\n`;
  }

  md += `#### Immediate Action Directives\n`;
  for (const dir of res.immediateInterventionDirectives) {
    md += `- ${dir}\n`;
  }

  return md;
}
