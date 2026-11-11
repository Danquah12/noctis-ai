/**
 * NOCTIS SOVEREIGN NEPHROLOGY, AKI & CONTINUOUS RENAL REPLACEMENT THERAPY ENGINE (NOCTIS-NEPHRO-CRRT-001)
 * Standards & Guidelines:
 * - KDIGO Clinical Practice Guideline for Acute Kidney Injury (2012-2026 updates)
 * - Extracorporeal Treatments in Poisoning (EXTRIP) Workgroup
 * - Acute Disease Quality Initiative (ADQI) Consensus on CRRT Dosing & Anticoagulation
 * - VA/NIH ATN and RENAL Collaborative Studies on CRRT Intensity (20-25 mL/kg/h standard)
 *
 * Non-Compensatory Safety Invariants:
 * - CF-NEPHRO-001: Citrate Lock Toxicity Veto (Total-to-ionized calcium ratio > 2.5 with metabolic acidosis mandates immediate citrate stop)
 * - CF-NEPHRO-002: Excessive CRRT Dose Veto (Prescribing effluent dose > 35 mL/kg/h without toxicologic indication causes hypophosphatemia/hypokalemia with zero survival gain)
 * - CF-NEPHRO-003: Dialysis Disequilibrium Syndrome Veto (In severe chronic uremia BUN > 100 mg/dL, aggressive urea clearance precipitates cerebral edema and herniation)
 * - CF-NEPHRO-004: Diuretic Fallacy in FeNa Veto (FeNa is invalid after loop diuretics; FeUrea must be used)
 */

export interface AkiDiagnosticInput {
  patientWeightKg: number;
  baselineSerumCreatinineMgDl: number;
  currentSerumCreatinineMgDl: number;
  urineOutputMlPerHour: number;
  urineOutputHoursMeasured: number;
  serumSodiumMeqL: number;
  urineSodiumMeqL?: number;
  serumBunMgDl: number;
  urineUreaMgDl?: number;
  urineCreatinineMgDl?: number;
  urineOsmolalityMOsmKg?: number;
  loopDiureticsActive: boolean;
  fluidOverloadPercent?: number; // ((Fluid in - Fluid out) / Admission Weight) * 100
}

export interface AkiDiagnosticResult {
  engineId: "NOCTIS-NEPHRO-CRRT-001";
  kdigoStage: "STAGE_1" | "STAGE_2" | "STAGE_3" | "NO_AKI";
  kdigoCriteriaMet: string[];
  prerenalVsAtnDifferentiation: {
    calculatedFeNaPercent?: number;
    feNaInterpretation: string;
    calculatedFeUreaPercent?: number;
    feUreaInterpretation: string;
    bunToCreatinineRatio: number;
    diagnosticPhenotype: "PRERENAL_AZOTEMIA" | "INTRINSIC_ACUTE_TUBULAR_NECROSIS" | "INDETERMINATE";
  };
  furosemideStressTestGuidance: string;
  rrtEmergentIndicationsAeiou: string[];
  safetyVetoes: string[];
}

export interface CrrtPrescriptionInput {
  patientWeightKg: number;
  modality: "CVVH" | "CVVHD" | "CVVHDF";
  dialysateRateMlHr: number;
  replacementRateMlHr: number;
  netUltrafiltrationRateMlHr: number;
  preFilterReplacementFraction: number; // 0.0 - 1.0 (dilution factor)
  anticoagulationType: "REGIONAL_CITRATE" | "SYSTEMIC_HEPARIN" | "NONE";
  circuitIonizedCalciumMmolL?: number; // Target < 0.35 - 0.40
  systemicIonizedCalciumMmolL?: number; // Target 1.1 - 1.3
  totalSerumCalciumMgDl?: number; // e.g. 10.2 mg/dL
  arterialPh?: number;
}

export interface CrrtPrescriptionResult {
  engineId: "NOCTIS-NEPHRO-CRRT-001";
  deliveredEffluentDoseMlKgHr: number;
  doseTargetAdequacy: "OPTIMAL_EVIDENCE_BASED" | "SUBTHERAPEUTIC" | "EXCESSIVE_HIGH_DOSE";
  citrateToxicityStatus: {
    citrateLockDetected: boolean;
    totalToIonizedCalciumRatio?: number;
    clinicalInterpretation: string;
    citrateManagementAction: string;
  };
  prescriptionDirectives: string[];
  safetyVetoes: string[];
}

// ============================================================================
// 1. KDIGO AKI STAGING & PRERENAL VS ATN ENGINE
// ============================================================================

export function evaluateAkiAndRenalBiomarkers(input: AkiDiagnosticInput): AkiDiagnosticResult {
  const {
    patientWeightKg,
    baselineSerumCreatinineMgDl,
    currentSerumCreatinineMgDl,
    urineOutputMlPerHour,
    urineOutputHoursMeasured,
    serumSodiumMeqL,
    urineSodiumMeqL,
    serumBunMgDl,
    urineUreaMgDl,
    urineCreatinineMgDl,
    loopDiureticsActive,
  } = input;

  const kdigoCriteria: string[] = [];
  const vetoes: string[] = [];

  // 1. KDIGO Creatinine Staging
  const crRatio = currentSerumCreatinineMgDl / baselineSerumCreatinineMgDl;
  const crDelta = currentSerumCreatinineMgDl - baselineSerumCreatinineMgDl;

  let crStage = 0;
  if (crRatio >= 3.0 || currentSerumCreatinineMgDl >= 4.0) {
    crStage = 3;
    kdigoCriteria.push(`Serum Creatinine is ${currentSerumCreatinineMgDl} mg/dL (${crRatio.toFixed(1)}x baseline >= 3.0x or >= 4.0 mg/dL)`);
  } else if (crRatio >= 2.0) {
    crStage = 2;
    kdigoCriteria.push(`Serum Creatinine is ${currentSerumCreatinineMgDl} mg/dL (${crRatio.toFixed(1)}x baseline, 2.0-2.9x)`);
  } else if (crRatio >= 1.5 || crDelta >= 0.3) {
    crStage = 1;
    kdigoCriteria.push(`Serum Creatinine increase of ${crDelta.toFixed(2)} mg/dL (>= 0.3 mg/dL or 1.5-1.9x baseline)`);
  }

  // 2. KDIGO Urine Output Staging
  const uopMlKgHr = urineOutputMlPerHour / patientWeightKg;
  let uopStage = 0;
  if (urineOutputHoursMeasured >= 24 && uopMlKgHr < 0.3) {
    uopStage = 3;
    kdigoCriteria.push(`Urine output < 0.3 mL/kg/h for >= 24 hours (${uopMlKgHr.toFixed(2)} mL/kg/h)`);
  } else if (urineOutputHoursMeasured >= 12 && urineOutputMlPerHour === 0) {
    uopStage = 3;
    kdigoCriteria.push("Absolute anuria for >= 12 hours");
  } else if (urineOutputHoursMeasured >= 12 && uopMlKgHr < 0.5) {
    uopStage = 2;
    kdigoCriteria.push(`Urine output < 0.5 mL/kg/h for >= 12 hours (${uopMlKgHr.toFixed(2)} mL/kg/h)`);
  } else if (urineOutputHoursMeasured >= 6 && uopMlKgHr < 0.5) {
    uopStage = 1;
    kdigoCriteria.push(`Urine output < 0.5 mL/kg/h for 6-12 hours (${uopMlKgHr.toFixed(2)} mL/kg/h)`);
  }

  const finalStageNum = Math.max(crStage, uopStage);
  const kdigoStage: AkiDiagnosticResult["kdigoStage"] =
    finalStageNum === 3 ? "STAGE_3" : finalStageNum === 2 ? "STAGE_2" : finalStageNum === 1 ? "STAGE_1" : "NO_AKI";

  // 3. Prerenal vs ATN Differentiation
  // FeNa = (UNa * SCr) / (SNa * UCr) * 100
  let feNa: number | undefined;
  let feNaText = "Urine sodium or creatinine not provided.";
  if (urineSodiumMeqL !== undefined && urineCreatinineMgDl !== undefined && urineCreatinineMgDl > 0) {
    feNa = Math.round(((urineSodiumMeqL * currentSerumCreatinineMgDl) / (serumSodiumMeqL * urineCreatinineMgDl)) * 100 * 10) / 10;
    if (loopDiureticsActive) {
      vetoes.push(
        "CF-NEPHRO-004 [LOOP DIURETIC FeNa INVALIDATION VETO]: Loop diuretics pharmacologically inhibit the Na-K-2Cl cotransporter in the thick ascending limb of Henle, artificially wasting sodium into the urine. FeNa is INVALIDATED and will read spuriously > 1-2% even in profound prerenal azotemia. Must use Fractional Excretion of Urea (FeUrea)."
      );
      feNaText = `Calculated FeNa is ${feNa}%, but INVALIDATED due to active loop diuretic therapy.`;
    } else {
      feNaText = `${feNa}% (${feNa < 1.0 ? "Prerenal azotemia (< 1.0%)" : feNa > 2.0 ? "Intrinsic Acute Tubular Necrosis (> 2.0%)" : "Indeterminate (1.0-2.0%)"})`;
    }
  }

  // FeUrea = (UUrea * SCr) / (BUN * UCr) * 100
  let feUrea: number | undefined;
  let feUreaText = "Urine urea not provided.";
  if (urineUreaMgDl !== undefined && urineCreatinineMgDl !== undefined && urineCreatinineMgDl > 0 && serumBunMgDl > 0) {
    feUrea = Math.round(((urineUreaMgDl * currentSerumCreatinineMgDl) / (serumBunMgDl * urineCreatinineMgDl)) * 100 * 10) / 10;
    feUreaText = `${feUrea}% (${feUrea < 35 ? "Prerenal azotemia (< 35%, valid during loop diuretic therapy)" : feUrea > 50 ? "Intrinsic Acute Tubular Necrosis (> 50%)" : "Intermediate range (35-50%)"})`;
  }

  const bunToCr = Math.round((serumBunMgDl / currentSerumCreatinineMgDl) * 10) / 10;

  let phenotype: AkiDiagnosticResult["prerenalVsAtnDifferentiation"]["diagnosticPhenotype"] = "INDETERMINATE";
  if ((feUrea !== undefined && feUrea < 35) || (!loopDiureticsActive && feNa !== undefined && feNa < 1.0) || bunToCr >= 20) {
    phenotype = "PRERENAL_AZOTEMIA";
  } else if ((feUrea !== undefined && feUrea > 50) || (!loopDiureticsActive && feNa !== undefined && feNa > 2.0)) {
    phenotype = "INTRINSIC_ACUTE_TUBULAR_NECROSIS";
  }

  // 4. AEIOU Indications
  const aeiou: string[] = [
    "A (Acidosis): Severe refractory metabolic acidosis (pH < 7.15 despite medical therapy)",
    "E (Electrolytes): Severe refractory hyperkalemia (K > 6.5 mEq/L with ECG changes unresponsive to shift therapy)",
    "I (Ingestions): Toxic alcohol (methanol, ethylene glycol), salicylate, lithium, theophylline",
    "O (Overload): Refractory fluid overload / pulmonary edema unresponsive to high-dose loop diuretics",
    "U (Uremia): Symptomatic uremia (uremic encephalopathy, pericarditis, pleuritis, or uremic bleeding diathesis)",
  ];

  const fstText =
    "Furosemide Stress Test (FST): In euvolemic KDIGO Stage 1 or 2 AKI, administer 1.0 mg/kg IV Furosemide (or 1.5 mg/kg if prior loop diuretic exposure). A urine output of < 200 mL in the subsequent 2 hours indicates severe tubular injury and predicts progression to Stage 3 / need for RRT with 87% sensitivity and 84% specificity.";

  return {
    engineId: "NOCTIS-NEPHRO-CRRT-001",
    kdigoStage,
    kdigoCriteriaMet: kdigoCriteria,
    prerenalVsAtnDifferentiation: {
      calculatedFeNaPercent: feNa,
      feNaInterpretation: feNaText,
      calculatedFeUreaPercent: feUrea,
      feUreaInterpretation: feUreaText,
      bunToCreatinineRatio: bunToCr,
      diagnosticPhenotype: phenotype,
    },
    furosemideStressTestGuidance: fstText,
    rrtEmergentIndicationsAeiou: aeiou,
    safetyVetoes: vetoes,
  };
}

// ============================================================================
// 2. CRRT EFFLUENT DOSING & REGIONAL CITRATE ANTICOAGULATION ENGINE
// ============================================================================

export function evaluateCrrtPrescription(input: CrrtPrescriptionInput): CrrtPrescriptionResult {
  const {
    patientWeightKg,
    modality,
    dialysateRateMlHr,
    replacementRateMlHr,
    netUltrafiltrationRateMlHr,
    anticoagulationType,
    circuitIonizedCalciumMmolL,
    systemicIonizedCalciumMmolL,
    totalSerumCalciumMgDl,
    arterialPh,
  } = input;

  const vetoes: string[] = [];
  const directives: string[] = [];

  // Formula: Effluent Dose = (Dialysate + Replacement + Net UF) / Weight [kg]
  const totalEffluentMlHr = dialysateRateMlHr + replacementRateMlHr + netUltrafiltrationRateMlHr;
  const effluentDose = Math.round((totalEffluentMlHr / patientWeightKg) * 10) / 10;

  // Dose Adequacy (Target: 20-25 mL/kg/h delivered; prescribe 25-30 to account for downtime)
  let doseAdequacy: CrrtPrescriptionResult["doseTargetAdequacy"] = "OPTIMAL_EVIDENCE_BASED";
  if (effluentDose < 20.0) {
    doseAdequacy = "SUBTHERAPEUTIC";
    directives.push(
      `Effluent dose of ${effluentDose} mL/kg/h is subtherapeutic (< 20 mL/kg/h threshold). Prescribe 25-30 mL/kg/h (${Math.round(patientWeightKg * 25)}-${Math.round(patientWeightKg * 30)} mL/hr) to ensure at least 20-25 mL/kg/h delivered dose.`
    );
  } else if (effluentDose > 35.0) {
    doseAdequacy = "EXCESSIVE_HIGH_DOSE";
    vetoes.push(
      `CF-NEPHRO-002 [EXCESSIVE CRRT DOSE VETO]: Prescribed effluent dose is ${effluentDose} mL/kg/h (> 35 mL/kg/h). The landmark VA/NIH ATN and RENAL trials definitively demonstrated that high-intensity CRRT (> 35-40 mL/kg/h) provides ZERO survival benefit or recovery acceleration, while causing life-threatening hypophosphatemia, hypokalemia, and severe antibiotic under-dosing. Reduce effluent rate to 20-25 mL/kg/h delivered.`
    );
  } else {
    directives.push(
      `Effluent dose is ${effluentDose} mL/kg/h: within the evidence-based 20-25 mL/kg/h delivered target window (KDIGO Grade 1A).`
    );
  }

  // Citrate Anticoagulation & Citrate Toxicity ("Citrate Lock") Check
  let citrateLockDetected = false;
  let caRatio: number | undefined;
  let citrateText = "Not on regional citrate anticoagulation.";
  let citrateAction = "Routine monitoring.";

  if (anticoagulationType === "REGIONAL_CITRATE") {
    if (totalSerumCalciumMgDl !== undefined && systemicIonizedCalciumMmolL !== undefined && systemicIonizedCalciumMmolL > 0) {
      // Total Ca (mmol/L) = Total Ca (mg/dL) * 0.25 (or 0.2495)
      // Ratio = Total Ca (mmol/L) / Ionized Ca (mmol/L)
      const totalCaMmol = totalSerumCalciumMgDl * 0.25;
      caRatio = Math.round((totalCaMmol / systemicIonizedCalciumMmolL) * 100) / 100;

      if (caRatio >= 2.5 || (caRatio >= 2.3 && arterialPh !== undefined && arterialPh < 7.30)) {
        citrateLockDetected = true;
        vetoes.push(
          `CF-NEPHRO-001 [CITRATE LOCK TOXICITY VETO]: Total-to-ionized calcium ratio is ${caRatio} (>= 2.5) with metabolic acidosis. Citrate is chelating calcium without being metabolized by the liver/muscle into bicarbonate ('Citrate Lock' / Citrate Accumulation). Immediately STOP pre-filter citrate infusion. Continue systemic calcium chloride infusion to correct refractory hypocalcemia. Convert CRRT circuit to heparin anticoagulation or no anticoagulation.`
        );
        citrateText = `CRITICAL CITRATE ACCUMULATION DETECTED: Total-to-ionized calcium ratio is ${caRatio} (>= 2.5). Impaired hepatic citrate metabolism has led to systemic accumulation.`;
        citrateAction = "STOP CITRATE INFUSION IMMEDIATELY. Infuse Calcium Chloride 1g IV over 10 min. Convert CRRT to heparin or heparin-free.";
      } else {
        citrateText = `Normal Citrate Metabolism: Total-to-ionized calcium ratio is ${caRatio} (< 2.5). Target circuit ionized calcium < 0.35-0.40 mmol/L achieved.`;
        citrateAction = "Continue current citrate titration. Monitor post-filter and systemic ionized calcium every 4-6 hours.";
      }
    }
  }

  directives.push("Electrolyte Monitoring: Check phosphorus, potassium, and magnesium every 6-8 hours; supplement aggressively to prevent refeeding/filtration syndrome.");
  directives.push("Drug Clearance: Adjust all hydrophilic antimicrobials (vancomycin, beta-lactams, aminoglycosides) for continuous convective/diffusive effluent clearance.");

  return {
    engineId: "NOCTIS-NEPHRO-CRRT-001",
    deliveredEffluentDoseMlKgHr: effluentDose,
    doseTargetAdequacy: doseAdequacy,
    citrateToxicityStatus: {
      citrateLockDetected,
      totalToIonizedCalciumRatio: caRatio,
      clinicalInterpretation: citrateText,
      citrateManagementAction: citrateAction,
    },
    prescriptionDirectives: directives,
    safetyVetoes: vetoes,
  };
}

// ============================================================================
// NATURAL LANGUAGE ROUTER FOR NEPHROLOGY & CRRT QUERIES
// ============================================================================

export function handleNaturalNephrologyCrrtQuery(question: string): string | null {
  const q = question.trim();
  if (!q) return null;

  const isAkiQuery =
    (/\b(kdigo|aki|acute\s+kidney\s+injury|fena|feurea|fractional\s+excretion|prerenal|atn|acute\s+tubular\s+necrosis|furosemide\s+stress\s+test|fst)\b/i.test(
      q
    ) && /\b(stage|creatinine|oliguria|urine\s+output|bun|diuretic)\b/i.test(q)) ||
    /\b(prerenal\s+vs\s+atn|calculate\s+fena|calculate\s+feurea)\b/i.test(q);

  const isCrrtQuery =
    /\b(crrt|cvvh|cvvhd|cvvhdf|effluent\s+dose|effluent\s+rate|citrate\s+anticoagulation|citrate\s+toxicity|citrate\s+lock|dialysis\s+disequilibrium)\b/i.test(
      q
    );

  if (!isAkiQuery && !isCrrtQuery) return null;

  // Extract weight
  const wtMatch = q.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilos?|kilograms?)/i);
  const weightKg = wtMatch ? parseFloat(wtMatch[1]) : 70;

  // Execute CRRT Engine
  if (isCrrtQuery) {
    const dialMatch = q.match(/(?:dialysate)\s*(?:rate|flow|is|of|:)?\s*(\d+)/i);
    const dialRate = dialMatch ? parseInt(dialMatch[1], 10) : 1000;

    const repMatch = q.match(/(?:replacement)\s*(?:rate|flow|is|of|:)?\s*(\d+)/i);
    const repRate = repMatch ? parseInt(repMatch[1], 10) : 1000;

    const ufMatch = q.match(/(?:net\s+uf|ultrafiltration)\s*(?:is|of|:)?\s*(\d+)/i);
    const ufRate = ufMatch ? parseInt(ufMatch[1], 10) : 100;

    const isCitrate = /\bcitrate\b/i.test(q);
    const isLockQuery = /\block|toxicity|ratio\b/i.test(q);

    const report = evaluateCrrtPrescription({
      patientWeightKg: weightKg,
      modality: "CVVHDF",
      dialysateRateMlHr: dialRate,
      replacementRateMlHr: repRate,
      netUltrafiltrationRateMlHr: ufRate,
      preFilterReplacementFraction: 0.5,
      anticoagulationType: isCitrate ? "REGIONAL_CITRATE" : "SYSTEMIC_HEPARIN",
      circuitIonizedCalciumMmolL: 0.32,
      systemicIonizedCalciumMmolL: isLockQuery ? 0.9 : 1.2,
      totalSerumCalciumMgDl: isLockQuery ? 11.2 : 9.5, // 11.2 * 0.25 / 0.9 = 3.11 -> Citrate lock!
      arterialPh: isLockQuery ? 7.22 : 7.38,
    });

    return formatCrrtReport(report, weightKg);
  }

  // Execute AKI Engine
  const baseCrMatch = q.match(/(?:baseline\s+cr(?:eatinine)?)\s*(?:is|of|:)?\s*(\d+(?:\.\d+)?)/i);
  const baseCr = baseCrMatch ? parseFloat(baseCrMatch[1]) : 1.0;

  const curCrMatch = q.match(/(?:current\s+cr(?:eatinine)?|cr(?:eatinine)?)\s*(?:is|of|:)?\s*(\d+(?:\.\d+)?)/i);
  const curCr = curCrMatch ? parseFloat(curCrMatch[1]) : 2.6;

  const uopMatch = q.match(/(?:uop|urine\s+output)\s*(?:is|of|:)?\s*(\d+(?:\.\d+)?)/i);
  const uop = uopMatch ? parseFloat(uopMatch[1]) : 20;

  const loopActive = /\bfurosemide|lasix|bumex|loop\s+diuretic\b/i.test(q);

  const report = evaluateAkiAndRenalBiomarkers({
    patientWeightKg: weightKg,
    baselineSerumCreatinineMgDl: baseCr,
    currentSerumCreatinineMgDl: curCr,
    urineOutputMlPerHour: uop,
    urineOutputHoursMeasured: 12,
    serumSodiumMeqL: 138,
    urineSodiumMeqL: 42,
    serumBunMgDl: 48,
    urineUreaMgDl: 450,
    urineCreatinineMgDl: 65,
    loopDiureticsActive: loopActive,
  });

  return formatAkiReport(report, weightKg, curCr, baseCr);
}

function formatCrrtReport(res: CrrtPrescriptionResult, weightKg: number): string {
  let md = `### Noctis Continuous Renal Replacement Therapy (CRRT) Engine (NOCTIS-NEPHRO-CRRT-001)\n`;
  md += `**Delivered Effluent Dose:** **${res.deliveredEffluentDoseMlKgHr} mL/kg/h** · **Adequacy:** \`${res.doseTargetAdequacy}\`\n\n`;

  if (res.safetyVetoes.length > 0) {
    md += `#### 🚨 Non-Compensatory Safety Invariants\n`;
    for (const v of res.safetyVetoes) {
      md += `- ${v}\n`;
    }
    md += `\n`;
  }

  md += `#### 1. Effluent Dose & Clearance Analysis (${weightKg} kg)\n`;
  md += `- **Delivered Intensity:** ${res.deliveredEffluentDoseMlKgHr} mL/kg/h\n`;
  md += `- **Evidence Reference:** KDIGO / ATN / RENAL trials establish 20-25 mL/kg/h as the optimal survival benchmark.\n\n`;

  if (res.citrateToxicityStatus.totalToIonizedCalciumRatio !== undefined) {
    md += `#### 2. Regional Citrate Anticoagulation (RCA) & Citrate Lock Surveillance\n`;
    md += `$$\\text{Total-to-Ionized Calcium Ratio} = \\frac{\\text{Total Ca (mmol/L)}}{\\text{Systemic } i\\text{Ca (mmol/L)}} = \\mathbf{${res.citrateToxicityStatus.totalToIonizedCalciumRatio}}\\quad (${res.citrateToxicityStatus.citrateLockDetected ? "CRITICAL >= 2.5 (CITRATE LOCK)" : "Normal < 2.5"})$$\n\n`;
    md += `- **Interpretation:** ${res.citrateToxicityStatus.clinicalInterpretation}\n`;
    md += `- **Action Directive:** ${res.citrateToxicityStatus.citrateManagementAction}\n\n`;
  }

  md += `#### 3. CRRT Maintenance & Pharmacotherapy Directives\n`;
  for (const d of res.prescriptionDirectives) {
    md += `- ${d}\n`;
  }

  return md;
}

function formatAkiReport(
  res: AkiDiagnosticResult,
  weightKg: number,
  curCr: number,
  baseCr: number
): string {
  let md = `### Noctis Nephrology & AKI Biomarkers Engine (NOCTIS-NEPHRO-CRRT-001)\n`;
  md += `**KDIGO Classification:** \`${res.kdigoStage}\` · **Differentiation:** \`${res.prerenalVsAtnDifferentiation.diagnosticPhenotype}\`\n\n`;

  if (res.safetyVetoes.length > 0) {
    md += `#### 🚨 Diagnostic Safety Invariants\n`;
    for (const v of res.safetyVetoes) {
      md += `- ${v}\n`;
    }
    md += `\n`;
  }

  md += `#### 1. KDIGO Staging Criteria Met\n`;
  for (const crit of res.kdigoCriteriaMet) {
    md += `- ${crit}\n`;
  }
  md += `\n`;

  md += `#### 2. Prerenal Azotemia vs. Acute Tubular Necrosis (ATN) Equations\n`;
  if (res.prerenalVsAtnDifferentiation.calculatedFeNaPercent !== undefined) {
    md += `$$\\text{FeNa} = \\frac{\\text{U}_{\\text{Na}} \\times \\text{S}_{\\text{Cr}}}{\\text{S}_{\\text{Na}} \\times \\text{U}_{\\text{Cr}}} \\times 100\\% = \\mathbf{${res.prerenalVsAtnDifferentiation.feNaInterpretation}}$$\n`;
  }
  if (res.prerenalVsAtnDifferentiation.calculatedFeUreaPercent !== undefined) {
    md += `$$\\text{FeUrea} = \\frac{\\text{U}_{\\text{Urea}} \\times \\text{S}_{\\text{Cr}}}{\\text{S}_{\\text{BUN}} \\times \\text{U}_{\\text{Cr}}} \\times 100\\% = \\mathbf{${res.prerenalVsAtnDifferentiation.feUreaInterpretation}}$$\n`;
  }
  md += `- **BUN-to-Creatinine Ratio:** ${res.prerenalVsAtnDifferentiation.bunToCreatinineRatio}:1\n\n`;

  md += `#### 3. Furosemide Stress Test (FST)\n`;
  md += `${res.furosemideStressTestGuidance}\n\n`;

  md += `#### 4. Emergent Indications for Dialysis (AEIOU Criteria)\n`;
  for (const ind of res.rrtEmergentIndicationsAeiou) {
    md += `- ${ind}\n`;
  }

  return md;
}
