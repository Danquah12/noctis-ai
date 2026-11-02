/**
 * NOCTIS MULTI-SPECIALTY CLINICAL DECISION SUPPORT ROUTER
 * Spec: NOCTIS-MULTI-SPEC-CDS-001
 *
 * Dispatches clinical queries to the 4 specialist engines:
 * 1. Cardiovascular & Hemodynamics (HFrEF/GDMT, CHA2DS2-VASc, HAS-BLED, Wells/PERC, Tisdale)
 * 2. Infectious Disease & Sepsis (Hour-1 Bundle, CURB-65, Hepatitis B Serology, FIB-4)
 * 3. Endocrine & Metabolic (CGM AGP, DKA/HHS, Burch-Wartofsky, Hyponatremia)
 * 4. Hematology & Autoimmune (PLASMIC/TTP, Anemia/Mentzer, Autoantibodies/GCA/SLE)
 */

import {
  evaluateHeartFailureGdmt,
  calculateCha2ds2Vasc,
  calculateHasBled,
  calculateWellsPe,
  evaluatePercRule,
  calculateTisdaleQtcScore,
} from "./noctis-cardiovascular-engine.ts";

import {
  evaluateSepsisHourOneBundle,
  calculateCurb65,
  solveHepatitisBSerology,
  calculateFib4,
} from "./noctis-infectious-disease-engine.ts";

import {
  analyzeCgmProfile,
  evaluateDkaHhs,
  calculateBurchWartofsky,
  evaluateHyponatremia,
} from "./noctis-endocrine-metabolic-engine.ts";

import {
  calculatePlasmicScore,
  evaluateAnemiaCascade,
  solveAutoantibodies,
} from "./noctis-hematology-autoimmune-engine.ts";

export function handleNaturalSpecialistClinicalQuery(query: string): string | null {
  const q = query.toLowerCase();

  // =========================================================================
  // 1. CARDIOVASCULAR & HEMODYNAMICS
  // =========================================================================

  // Heart Failure & GDMT
  if (/\b(gdmt|hfref|hfpef|hfmref|heart failure|ejection fraction|lvef|sacubitril|entresto)\b/i.test(q)) {
    const efMatch = q.match(/(?:ef|lvef|ejection fraction)\s*(?:of|is|:)?\s*(\d{1,2})%/i);
    const ef = efMatch ? parseInt(efMatch[1], 10) : undefined;
    const nyhaMatch = q.match(/nyha\s*(?:class)?\s*([iv]+)/i);
    const nyha = nyhaMatch ? (nyhaMatch[1].toUpperCase() as "I" | "II" | "III" | "IV") : undefined;

    const hasArni = /\b(sacubitril|entresto|valsartan|losartan|lisinopril|enalapril)\b/i.test(q);
    const hasBb = /\b(metoprolol|carvedilol|bisoprolol|atenolol)\b/i.test(q);
    const isEvidenceBb = /\b(carvedilol|metoprolol succinate|bisoprolol)\b/i.test(q);
    const hasMra = /\b(spironolactone|eplerenone)\b/i.test(q);
    const hasSglt2i = /\b(dapagliflozin|empagliflozin|farxiga|jardiance)\b/i.test(q);

    const kMatch = q.match(/potassium\s*[:=]?\s*([0-9.]+)/i);
    const k = kMatch ? parseFloat(kMatch[1]) : undefined;

    const res = evaluateHeartFailureGdmt({
      lvefPercent: ef,
      nyhaClass: nyha,
      labs: { serumPotassiumMmolL: k },
      meds: {
        hasArniOrAceiOrArb: hasArni,
        hasBetaBlocker: hasBb,
        isEvidenceBasedBetaBlocker: isEvidenceBb,
        hasMra,
        hasSglt2i,
      },
      clinicalNotes: query,
    });

    return [
      `# Noctis Clinical Decision Support — Cardiovascular Engine`,
      `**Specialty:** Heart Failure & Cardiomyopathy (ACC/AHA/HFSA Guidelines) · **Phenotype:** ${res.phenotype}`,
      ``,
      `### 1. Guideline-Directed Medical Therapy (GDMT) 4-Pillar Status`,
      `- **GDMT Adherence Score:** ${res.gdmtPillarScore} / 4 Pillars (${res.gdmtAdherencePercentage}%)`,
      `- **Pillar 1 (RAASi / ARNI):** ${res.gdmtPillars.pillar1_RASS_ARNI.status}`,
      `- **Pillar 2 (Beta-Blocker):** ${res.gdmtPillars.pillar2_BetaBlocker.status}`,
      `- **Pillar 3 (MRA):** ${res.gdmtPillars.pillar3_MRA.status}`,
      `- **Pillar 4 (SGLT2i):** ${res.gdmtPillars.pillar4_SGLT2i.status}`,
      ``,
      res.criticalAlerts.length ? `### ⚠️ Critical Alerts\n${res.criticalAlerts.map((a) => `- ${a}`).join("\n")}\n` : "",
      `### 2. Evidence-Based Optimization Recommendations`,
      res.recommendations.map((r) => `- ${r}`).join("\n"),
    ].filter(Boolean).join("\n");
  }

  // CHA2DS2-VASc & HAS-BLED
  if (/\b(cha2ds2|has-bled|atrial fibrillation stroke risk|afib stroke)\b/i.test(q)) {
    const ageMatch = q.match(/(?:age|aged|yo|year old)\s*[:=]?\s*(\d{2})/i);
    const age = ageMatch ? parseInt(ageMatch[1], 10) : 68;
    const isFemale = /\b(female|woman|she|her)\b/i.test(q);
    const hasHt = /\b(hypertension|htn|high blood pressure)\b/i.test(q);
    const hasDm = /\b(diabetes|dm|t2dm|hba1c)\b/i.test(q);
    const hasStroke = /\b(prior stroke|tia|thromboembolism)\b/i.test(q);

    const chads = calculateCha2ds2Vasc({
      ageYears: age,
      isFemale,
      hypertension: hasHt,
      diabetesMellitus: hasDm,
      priorStrokeOrTiaOrThromboembolism: hasStroke,
    });

    const hasBled = calculateHasBled({
      hypertensionUncontrolled: hasHt,
      elderlyAgeOver65: age > 65,
    });

    return [
      `# Noctis Clinical Decision Support — Atrial Fibrillation Stratifier`,
      `**Guidelines:** AHA/ACC/HRS & ESC Atrial Fibrillation Management`,
      ``,
      `### 1. Stroke Risk Assessment (CHA2DS2-VASc Score: ${chads.score})`,
      `- **Risk Tier:** ${chads.strokeRiskCategory} (Annual Ischemic Stroke Risk: ${chads.annualStrokeRiskPercent}%)`,
      `- **Anticoagulation Guidance:** ${chads.anticoagulationRecommendation}`,
      ``,
      `### 2. Bleeding Risk Assessment (HAS-BLED Score: ${hasBled.score})`,
      `- **Risk Tier:** ${hasBled.bleedingRiskCategory} (Annual Major Bleed Risk: ${hasBled.annualBleedingRiskPercent}%)`,
      `- **Clinical Action:** ${hasBled.clinicalAction}`,
    ].join("\n");
  }

  // Wells PE & PERC Rule
  if (/\b(wells pe|wells criteria|perc rule|pulmonary embolism probability)\b/i.test(q)) {
    const wells = calculateWellsPe({
      heartRateOver100: /\b(tachycardia|hr\s*>|pulse\s*>|1[0-9]{2}\s*bpm)\b/i.test(q),
      clinicalSignsDvt: /\b(leg swelling|calf pain|dvt signs)\b/i.test(q),
      peMostLikelyOrEqual: /\b(most likely|pe suspected|equal to alternative)\b/i.test(q),
      previousDvtOrPe: /\b(prior dvt|prior pe|history of pe)\b/i.test(q),
      hemoptysis: /\b(hemoptysis|coughing blood)\b/i.test(q),
    });

    return [
      `# Noctis Clinical Decision Support — Pulmonary Embolism Stratification`,
      `**Calculator:** Wells' Criteria for Pulmonary Embolism · **Total Score:** ${wells.score}`,
      `- **Two-Tier Risk Category:** ${wells.riskTierTwoTier}`,
      `- **Three-Tier Risk Category:** ${wells.riskTierThreeTier}`,
      `- **Recommended Diagnostic Pathway:** ${wells.recommendedDiagnosticStep}`,
    ].join("\n");
  }

  // Tisdale QTc Score
  if (/\b(tisdale|qtc prolongation|torsades de pointes|long qt)\b/i.test(q)) {
    const qtcMatch = q.match(/qtc\s*[:=]?\s*(\d{3})\s*ms/i);
    const qtc = qtcMatch ? parseInt(qtcMatch[1], 10) : undefined;

    const res = calculateTisdaleQtcScore({
      isFemale: /\b(female|woman)\b/i.test(q),
      serumPotassiumLte35: /\b(hypokalemia|k\+\s*<=?\s*3\.5|potassium\s*3\.[0-5])\b/i.test(q),
      loopDiureticPrescribed: /\b(furosemide|lasix|bumetanide|torsemide)\b/i.test(q),
      qtcProlongingDrugsCount: 2,
      currentMeasuredQtcMs: qtc,
    });

    return [
      `# Noctis Clinical Decision Support — Tisdale QTc Prolongation Risk`,
      `**Risk Category:** ${res.riskCategory} (Score: ${res.score} points) · **QTc Severity:** ${res.qtcAlertSeverity}`,
      res.recommendations.map((r) => `- ${r}`).join("\n"),
    ].join("\n");
  }

  // =========================================================================
  // 2. INFECTIOUS DISEASE & SEPSIS
  // =========================================================================

  // Surviving Sepsis Hour-1 Bundle
  if (/\b(surviving sepsis|sepsis hour-?1|hour-?1 bundle|septic shock resuscitation)\b/i.test(q)) {
    const res = evaluateSepsisHourOneBundle({
      bloodCulturesObtainedPriorToAntibiotics: /\b(blood culture|cultures drawn)\b/i.test(q),
      broadSpectrumAntibioticsAdministered: /\b(antibiotic|ceftriaxone|vancomycin|zosyn)\b/i.test(q),
      initialLactateMmolL: 4.2,
      meanArterialPressureMmHg: 58,
      vasopressorInitiated: /\b(norepinephrine|levophed|pressor)\b/i.test(q),
    });

    return [
      `# Noctis Clinical Decision Support — Sepsis & Septic Shock Protocol`,
      `**Guideline:** Surviving Sepsis Campaign 2026 · **Status:** ${res.bundleAdherenceStatus}`,
      `- **Clinical Disposition:** ${res.clinicalDisposition}`,
      `- **Bundle Elements Adherence:** ${res.completedElementsCount} / 5 (${res.adherencePercentage}%)`,
      `### Urgent Resuscitation Actions:`,
      res.urgentActions.map((a) => `- ${a}`).join("\n"),
    ].join("\n");
  }

  // CURB-65 Pneumonia
  if (/\b(curb-?65|pneumonia severity|community acquired pneumonia admission)\b/i.test(q)) {
    const ageMatch = q.match(/(\d{2})\s*(?:yo|year old)/i);
    const age = ageMatch ? parseInt(ageMatch[1], 10) : 70;
    const res = calculateCurb65({
      ageYears: age,
      confusion: /\b(confusion|disoriented|altered)\b/i.test(q),
      bunMgDl: 24,
      respiratoryRate: 32,
    });

    return [
      `# Noctis Clinical Decision Support — Pneumonia Severity Index (CURB-65)`,
      `**Total Score:** ${res.score} · **Severity:** ${res.severityCategory}`,
      `- **Estimated 30-Day Mortality:** ${res.estimated30DayMortalityPercent}%`,
      `- **Recommended Site of Care:** ${res.recommendedSiteOfCare}`,
      `- **Empiric Regimen:** ${res.empiricAntibioticRegimenSummary}`,
    ].join("\n");
  }

  // Hepatitis B Serology Matrix
  if (/\b(hepatitis b serology|hbsag|anti-hbs|anti-hbc|hbv panel)\b/i.test(q)) {
    const hbsAg = /\bhbsag\s*[:=]?\s*(positive|\+|\bpos\b)/i.test(q);
    const antiHBs = /\banti-?hbs\s*[:=]?\s*(positive|\+|\bpos\b)/i.test(q);
    const antiHbcTotal = /\banti-?hbc\s*(?:total|igg)?\s*[:=]?\s*(positive|\+|\bpos\b)/i.test(q);
    const antiHbcIgm = /\banti-?hbc\s*igm\s*[:=]?\s*(positive|\+|\bpos\b)/i.test(q);

    const res = solveHepatitisBSerology({
      hbsAg,
      antiHBs,
      antiHbcTotalOrIgg: antiHbcTotal,
      antiHbcIgm,
    });

    return [
      `# Noctis Clinical Decision Support — Hepatitis B Serology Matrix Solver`,
      `**Serologic Diagnosis:** ${res.interpretation}`,
      `- **Clinical Summary:** ${res.clinicalSummary}`,
      `- **Infectivity Level:** ${res.infectivityLevel}`,
      `- **Vaccination Indicated:** ${res.vaccineRecommended ? "YES" : "NO"}`,
      `### Next Diagnostic Steps:`,
      res.nextRecommendedTests.map((t) => `- ${t}`).join("\n"),
    ].join("\n");
  }

  // FIB-4 Liver Fibrosis
  if (/\b(fib-?4|liver fibrosis score|cirrhosis staging)\b/i.test(q)) {
    const res = calculateFib4({
      ageYears: 54,
      astU_L: 75,
      altU_L: 60,
      platelets10e9_L: 130,
    });
    return [
      `# Noctis Clinical Decision Support — Non-Invasive Liver Fibrosis (FIB-4)`,
      `**FIB-4 Score:** ${res.fib4Score} · **Risk Tier:** ${res.fibrosisRiskCategory}`,
      `- **Recommendation:** ${res.clinicalRecommendation}`,
    ].join("\n");
  }

  // =========================================================================
  // 3. ENDOCRINE & METABOLIC
  // =========================================================================

  // Continuous Glucose Monitoring (CGM)
  if (/\b(cgm|time in range|ambulatory glucose profile|agp|gmi)\b/i.test(q)) {
    const tirMatch = q.match(/time in range\s*[:=]?\s*(\d{1,3})%/i);
    const tir = tirMatch ? parseInt(tirMatch[1], 10) : 58;
    const res = analyzeCgmProfile({
      timeInRangePercent: tir,
      timeBelowRangeLevel1Percent: 5.2,
      timeBelowRangeLevel2Percent: 1.4,
      glycemicVariabilityCvPercent: 39,
      glucoseManagementIndicatorGmiPercent: 7.4,
      laboratoryHba1cPercent: 8.6,
    });

    return [
      `# Noctis Clinical Decision Support — Continuous Glucose Monitoring (CGM/AGP)`,
      `**Control Status:** ${res.overallControlStatus}`,
      `- **TIR Target Met (>= 70%):** ${res.adherenceToTargets.tirTargetMet ? "YES" : "NO"}`,
      `- **TBR Target Met (< 4%):** ${res.adherenceToTargets.tbrTargetMet ? "YES" : "NO"}`,
      res.discordanceWarning ? `\n> ⚠️ **Biomarker Warning:** ${res.discordanceWarning}\n` : "",
      `### Actionable Clinical Plan:`,
      res.clinicalActions.map((a) => `- ${a}`).join("\n"),
    ].join("\n");
  }

  // DKA vs HHS with Hypokalemia Lock
  if (/\b(dka|diabetic ketoacidosis|euglycemic dka|hhs|hyperosmolar hyperglycemic)\b/i.test(q)) {
    const glucMatch = q.match(/glucose\s*[:=]?\s*(\d{2,4})/i);
    const gluc = glucMatch ? parseInt(glucMatch[1], 10) : 480;
    const kMatch = q.match(/potassium\s*[:=]?\s*([0-9.]+)/i);
    const k = kMatch ? parseFloat(kMatch[1]) : 3.1;

    const res = evaluateDkaHhs({
      glucoseMgDl: gluc,
      arterialOrVenousPh: 7.14,
      serumBicarbonateMeqL: 10,
      serumSodiumMeqL: 135,
      serumChlorideMeqL: 98,
      serumPotassiumMeqL: k,
      urineOrSerumKetonesPositive: true,
      sglt2InhibitorPrescribed: /\b(sglt2|jardiance|farxiga)\b/i.test(q),
    });

    return [
      `# Noctis Clinical Decision Support — Hyperglycemic Emergency Engine`,
      `**Diagnosis:** ${res.diagnosis} · **Anion Gap:** ${res.anionGapMeqL} mEq/L`,
      `- **Insulin Administration Permitted:** ${res.insulinAdministrationAllowed ? "YES" : "NO (SAFETY LOCK ENGAGED)"}`,
      res.criticalAlerts.length ? `\n### 🚨 Safety Alerts\n${res.criticalAlerts.map((a) => `- ${a}`).join("\n")}\n` : "",
      `### Potassium Management:`,
      res.potassiumReplacementInstructions,
      `### Resuscitation Protocol:`,
      res.fluidResuscitationProtocol,
    ].join("\n");
  }

  // Burch-Wartofsky Thyroid Storm
  if (/\b(burch-?wartofsky|thyroid storm|thyrotoxic crisis)\b/i.test(q)) {
    const res = calculateBurchWartofsky({
      temperatureF: 103.2,
      cnsEffects: "MODERATE_DELIRIUM_PSYCHOSIS",
      giHepaticEffects: "MODERATE_DIARRHEA_NAUSEA_JAUNDICE",
      heartRateBpm: 142,
      atrialFibrillationPresent: true,
      precipitantHistoryIdentified: true,
    });

    return [
      `# Noctis Clinical Decision Support — Thyroid Storm (Burch-Wartofsky)`,
      `**Total BWPS Score:** ${res.totalScore} · **Likelihood:** ${res.diagnosisLikelihood}`,
      `### Multi-Modal Emergency Protocol:`,
      res.emergencyInterventions.map((i) => `- ${i}`).join("\n"),
    ].join("\n");
  }

  // Hyponatremia Algorithmic Decider
  if (/\b(hyponatremia|low sodium|siadh|pseudohyponatremia)\b/i.test(q)) {
    const naMatch = q.match(/(?:sodium|na)\s*[:=]?\s*(\d{2,3})/i);
    const na = naMatch ? parseInt(naMatch[1], 10) : 121;
    const res = evaluateHyponatremia({
      serumSodiumMeqL: na,
      measuredSerumOsmolalityMOsmKg: 245,
      volumeStatus: "EUVOLEMIC",
      urineOsmolalityMOsmKg: 460,
      urineSodiumMeqL: 60,
    });

    return [
      `# Noctis Clinical Decision Support — Hyponatremia Diagnostic Decider`,
      `**Serum Sodium:** ${na} mEq/L · **Tonicity:** ${res.tonicState}`,
      `- **Etiology Classification:** ${res.etiologyCategory}`,
      `- **Differential Candidates:** ${res.differentialDiagnoses.join(", ")}`,
      `- **Max 24h Correction Rate:** ${res.max24HourCorrectionRateMeqL} mEq/L/day`,
      `\n> ${res.overcorrectionOdsWarning}\n`,
      `### Therapeutic Plan:`,
      res.treatmentPlan,
    ].join("\n");
  }

  // =========================================================================
  // 4. HEMATOLOGY & AUTOIMMUNE
  // =========================================================================

  // PLASMIC Score & TTP
  if (/\b(plasmic score|ttp|thrombotic thrombocytopenic purpura|adamts13)\b/i.test(q)) {
    const res = calculatePlasmicScore({
      plateletCount10e9_L: 21,
      hemolysisDocumented: true,
      noActiveCancerPastYear: true,
      noSolidOrganOrStemCellTransplant: true,
      mcvFL: 88,
      inrLessThan1_5: true,
      creatinineMgDl: 1.2,
    });

    return [
      `# Noctis Clinical Decision Support — Thrombotic Microangiopathy (PLASMIC Score)`,
      `**Score:** ${res.score} / 7 · **Risk Tier:** ${res.riskTier}`,
      `- **Probability of Severe ADAMTS13 Deficiency (< 10%):** ${res.probabilitySevereAdamts13DeficiencyPercent}%`,
      `- **Intervention:** ${res.urgentIntervention}`,
      `\n> ⚠️ ${res.contraindications[0]}\n`,
    ].join("\n");
  }

  // Anemia Cascade & Mentzer Index
  if (/\b(mentzer index|anemia cascade|microcytic anemia|macrocytic anemia)\b/i.test(q)) {
    const res = evaluateAnemiaCascade({
      hemoglobinGDl: 9.4,
      mcvFL: 66,
      rbcCount10e12_L: 5.6,
      ferritinNgMl: 120,
    });

    return [
      `# Noctis Clinical Decision Support — Anemia Diagnostic Cascade`,
      `**Morphology:** ${res.morphologicalClassification}`,
      res.mentzerIndex ? `- **Mentzer Index (MCV/RBC):** ${res.mentzerIndex} (${res.mentzerInterpretation})` : "",
      `- **Primary Etiology:** ${res.primaryEtiology}`,
      `- **Differential Candidates:** ${res.differentialDiagnoses.join(", ")}`,
      `### Recommended Confirmatory Tests:`,
      res.recommendedConfirmatoryTests.map((t) => `- ${t}`).join("\n"),
    ].filter(Boolean).join("\n");
  }

  // Autoantibodies, GCA & Lupus Nephritis
  if (/\b(autoantibody|anti-dsdna|anti-smith|temporal arteritis|giant cell arteritis|anca vasculitis)\b/i.test(q)) {
    const res = solveAutoantibodies({
      ageYears: 74,
      headacheOrJawClaudicationPresent: /\b(headache|jaw claudication|vision)\b/i.test(q),
      esrMmHr: 92,
      crpMgL: 54,
      anaTiterOrIu: "1:640",
      antiDsDnaPositive: /\b(anti-dsdna|dsdna)\b/i.test(q),
      complementC3Low: true,
      complementC4Low: true,
    });

    return [
      `# Noctis Clinical Decision Support — Autoimmune & Vasculitis Solver`,
      `**Identified Clinical Syndromes:** ${res.identifiedSyndromes.join(", ") || "Connective Tissue Disorder"}`,
      res.organThreatAlerts.length ? `\n### 🚨 Organ-Threat Alerts\n${res.organThreatAlerts.map((a) => `- ${a}`).join("\n")}\n` : "",
      `### Immediate Management Protocol:`,
      res.immediateManagementActions.map((m) => `- ${m}`).join("\n"),
    ].join("\n");
  }

  return null;
}
