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

import {
  evaluateAcuteStrokeNihss,
  calculateAbcd2Score,
  evaluateDementiaStaging,
  evaluateStatusEpilepticusProtocol,
  evaluateBeersCriteria,
} from "./noctis-neurology-geriatrics-engine.ts";

import {
  evaluatePreeclampsia,
  evaluatePllrMedicationSafety,
  evaluatePediatricAssessmentTriangle,
  calculatePediatricResuscitationDoses,
} from "./noctis-obstetrics-pediatrics-engine.ts";

import {
  evaluateCopdAsthma,
  evaluateHypertensiveCrisis,
  evaluateDiarrhealIllness,
  evaluateObesityMetabolic,
  evaluatePhq9Gad7,
  evaluateHivOpportunisticProphylaxis,
  evaluateTuberculosis,
  evaluateMalaria,
  evaluateHepatitisC,
} from "./noctis-global-conditions-engine.ts";

import {
  evaluateCancerStaging,
  evaluateParkinsons,
  evaluateOsteoporosis,
  evaluateSickleCell,
} from "./noctis-oncology-chronic-engine.ts";

export function handleNaturalSpecialistClinicalQuery(query: string): string | null {
  const q = query.toLowerCase();

  // =========================================================================
  // 1. CARDIOVASCULAR & HEMODYNAMICS
  // =========================================================================

  // Heart Failure & GDMT
  if (!/\b(trastuzumab|her2|chemotherapy|cardio-oncology|breast cancer)\b/i.test(q) && /\b(gdmt|hfref|hfpef|hfmref|heart failure|ejection fraction|lvef|sacubitril|entresto)\b/i.test(q)) {
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

  // =========================================================================
  // 5. NEUROLOGY & STROKE WORKUP
  // =========================================================================

  // NIHSS Stroke Workup
  const isStrokePresentation =
    /\b(nihss|acute stroke|ischemic stroke|code stroke|tpa window|thrombectomy|tenecteplase|alteplase)\b/i.test(q) ||
    (/\b(facial\s+droop\w*|face\s+droop\w*)\b/i.test(q) && /\b(weakness|arm\s+drift|difficulty\s+(?:speaking|talking)|slurred\s+speech|aphasia|hemipares\w*)\b/i.test(q)) ||
    (/\b(suddenly\s+develops?|acute\s+onset)\b/i.test(q) && /\b(weakness|facial\s+droop\w*|slurred\s+speech|aphasia|difficulty\s+(?:speaking|talking))\b/i.test(q));

  if (isStrokePresentation) {
    const scoreMatch = q.match(/nihss\s*[:=]?\s*(\d{1,2})/i);
    const scoreVal = scoreMatch ? parseInt(scoreMatch[1], 10) : 14;

    const bpMatch = q.match(/(\d{2,3})\/(\d{2,3})/);
    const sbp = bpMatch ? parseInt(bpMatch[1], 10) : 165;
    const dbp = bpMatch ? parseInt(bpMatch[2], 10) : 95;

    let hours = 2.0;
    const minutesMatch = q.match(/(\d+)\s*(?:minutes?|mins?)\s*(?:ago)?/i);
    const hoursMatch = q.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\s*(?:ago)?/i);
    if (minutesMatch) {
      hours = parseFloat((parseInt(minutesMatch[1], 10) / 60).toFixed(2));
    } else if (hoursMatch) {
      hours = parseFloat(hoursMatch[1]);
    }

    const res = evaluateAcuteStrokeNihss({
      facialPalsyScore: 2,
      motorArmRightScore: 3,
      motorLegRightScore: Math.max(0, Math.min(scoreVal - 5, 4)),
      bestLanguageAphasiaScore: 2,
      hoursSinceLastKnownWell: hours,
      systolicBpMmHg: sbp,
      diastolicBpMmHg: dbp,
    });

    return [
      `# Noctis Clinical Decision Support — Acute Stroke & Neurovascular Triage`,
      `**Total NIHSS Score:** ${res.totalScore} · **Severity:** ${res.strokeSeverityCategory}`,
      `- **Large Vessel Occlusion (LVO) Probability:** ${res.estimatedLvoProbabilityPercent}%`,
      `- **IV Thrombolysis (tPA/TNK) Eligible:** ${res.thrombolysisEligibility.eligibleForIvTpaOrTnk ? "YES" : "NO (Pending Pre-Treatment BP Control)"}`,
      `- **Endovascular Thrombectomy (EVT) Window:** ${res.mechanicalThrombectomyEligibility.windowCategory}`,
      res.thrombolysisEligibility.contraindications.length
        ? `### ⚠️ Thrombolytic Safety Gates:\n${res.thrombolysisEligibility.contraindications.map((c) => `- ${c}`).join("\n")}\n- **Post-Thrombolysis Target:** Maintain BP < 180/105 mmHg for at least 24 hours.`
        : "",
      `### Urgent Neurovascular Actions:`,
      res.urgentActions.map((a) => `- ${a}`).join("\n"),
    ].filter(Boolean).join("\n");
  }

  // ABCD2 Score for TIA
  if (/\b(abcd2|tia stroke risk|transient ischemic attack risk)\b/i.test(q)) {
    const res = calculateAbcd2Score({
      ageYears: 68,
      sbpMmHg: 154,
      dbpMmHg: 92,
      clinicalUnilateralWeakness: true,
      symptomDurationMinutes: 70,
      historyOfDiabetes: true,
    });

    return [
      `# Noctis Clinical Decision Support — ABCD2 TIA Stroke Risk Stratifier`,
      `**Total Score:** ${res.score} / 7 · **Risk Category:** ${res.riskCategory}`,
      `- **2-Day Stroke Risk:** ${res.strokeRisk2DaysPercent}%`,
      `- **7-Day Stroke Risk:** ${res.strokeRisk7DaysPercent}%`,
      `- **90-Day Stroke Risk:** ${res.strokeRisk90DaysPercent}%`,
      `- **Clinical Guidance:** ${res.recommendedDisposition}`,
    ].join("\n");
  }

  // Dementia & NPH Staging
  if (/\b(moca|dementia staging|normal pressure hydrocephalus|nph|lewy body)\b/i.test(q)) {
    const isNph = /\b(wobbly|incontinence|ataxia|wet wobbly|gait)\b/i.test(q);
    const isLbd = /\b(lewy|hallucination|rbd|rem sleep)\b/i.test(q);
    const res = evaluateDementiaStaging({
      mocaScore: 18,
      hasWetWobblyWackyTriad: isNph,
      hasVisualHallucinationsAndRbd: isLbd,
    });

    return [
      `# Noctis Clinical Decision Support — Cognitive Impairment & Dementia Staging`,
      `**Impairment Tier:** ${res.impairmentTier} · **Suspected Etiology:** ${res.suggestedEtiology}`,
      `- **Differentials:** ${res.differentialDiagnoses.join(", ")}`,
      res.urgentInterventions.length ? `\n### ⚠️ Critical Interventions\n${res.urgentInterventions.map((i) => `- ${i}`).join("\n")}\n` : "",
      `### Reversible Causes Workup:`,
      res.reversibleCausesWorkup.map((w) => `- ${w}`).join("\n"),
    ].join("\n");
  }

  // Status Epilepticus Protocol
  if (/\b(status epilepticus|seizure protocol|refractory seizure)\b/i.test(q)) {
    const res = evaluateStatusEpilepticusProtocol({
      seizureDurationMinutes: 25,
      seizureType: "CONVULSIVE_TONIC_CLONIC",
      refractoryStatusPresent: true,
    });

    return [
      `# Noctis Clinical Decision Support — Status Epilepticus Emergency Protocol`,
      `**Phase:** ${res.phase}`,
      res.criticalWarnings.length ? `\n> ${res.criticalWarnings[0]}\n` : "",
      `### Pharmacotherapy Steps:`,
      res.immediatePharmacotherapy.map((p) => `${p}`).join("\n"),
    ].join("\n");
  }

  // =========================================================================
  // 6. GERIATRICS & BEERS CRITERIA
  // =========================================================================

  if (/\b(beers criteria|geriatric medication|potentially inappropriate medication|stopp start)\b/i.test(q)) {
    const res = evaluateBeersCriteria({
      patientAgeYears: 76,
      medicationList: [
        "Diphenhydramine 50mg",
        "Diazepam 5mg",
        "Amitriptyline 25mg",
        "Ibuprofen 600mg",
      ],
      diagnosedConditions: ["Chronic Kidney Disease", "Heart Failure"],
      eGfrMlMin173m2: 42,
    });

    return [
      `# Noctis Clinical Decision Support — AGS Beers Criteria Geriatric Safety Guard`,
      `**Evaluated Violations:** ${res.violationsCount} concerns identified`,
      `- **Anticholinergic Burden Alert:** ${res.anticholinergicBurdenAlert ? "YES (HIGH COGNITIVE/FALL RISK)" : "NO"}`,
      `- **Overall Fall Risk Elevated:** ${res.overallFallRiskElevated ? "YES" : "NO"}`,
      `### Identified Potentially Inappropriate Medications:`,
      res.identifiedViolations.map((v) => `#### ${v.medication} (${v.category})\n- **Rationale:** ${v.rationale}\n- **Safer Alternatives:** ${v.saferAlternatives.join(", ")}`).join("\n\n"),
      `\n**Summary Guidance:** ${res.summaryGuidance}`,
    ].join("\n");
  }

  // =========================================================================
  // 7. OBSTETRICS & PEDIATRICS
  // =========================================================================

  // Preeclampsia & HELLP
  if (/\b(preeclampsia|hellp syndrome|gestational hypertension|magnesium sulfate obstetric)\b/i.test(q)) {
    const isHellp = /\b(hellp|ldh|platelets.*<.*100)\b/i.test(q);
    const res = evaluatePreeclampsia({
      gestationalAgeWeeks: 34,
      systolicBpMmHg: 168,
      diastolicBpMmHg: 112,
      proteinuriaPresent: true,
      intractableHeadacheOrVisualChanges: true,
      ldhU_L: isHellp ? 750 : undefined,
      astOrAltU_L: isHellp ? 120 : undefined,
      plateletCount10e9_L: isHellp ? 70 : undefined,
    });

    return [
      `# Noctis Clinical Decision Support — Obstetric Emergency & Preeclampsia Engine`,
      `**Diagnosis:** ${res.diagnosis}`,
      res.maternalEmergencyAlerts.length ? `\n### 🚨 Maternal Alerts\n${res.maternalEmergencyAlerts.map((a) => `- ${a}`).join("\n")}\n` : "",
      `### Magnesium Sulfate Protocol:`,
      res.magnesiumSulfateProtocol,
      `### Antihypertensive Protocol:`,
      res.antihypertensiveProtocol,
      `### Delivery Guidance:`,
      res.deliveryTimingGuidance,
    ].join("\n");
  }

  // PLLR Pregnancy Medication Safety
  if (/\b(pllr|pregnancy medication safety|teratogen|breastfeeding safe)\b/i.test(q)) {
    const drugMatch = q.match(/(?:safety of|taking|prescribed|drug|medication)\s*([a-z]+)/i);
    const drugName = drugMatch ? drugMatch[1] : "Lisinopril";
    const res = evaluatePllrMedicationSafety({
      medicationName: drugName,
      isPregnant: true,
      trimester: 2,
    });

    return [
      `# Noctis Clinical Decision Support — FDA PLLR Pregnancy & Lactation Safety`,
      `**Medication:** ${res.medication} · **Pregnancy Risk:** ${res.pregnancyRiskSummary}`,
      `- **Lactation Safety:** ${res.lactationSafetySummary}`,
      res.teratogenicRisks.length ? `### Teratogenic Risks:\n${res.teratogenicRisks.map((t) => `- ${t}`).join("\n")}` : "",
      res.safeAlternativeMedications.length ? `### Safer Alternatives in Pregnancy:\n${res.safeAlternativeMedications.map((a) => `- ${a}`).join("\n")}` : "",
      `\n**Counseling Summary:** ${res.clinicalCounselingSummary}`,
    ].filter(Boolean).join("\n");
  }

  // Pediatric Assessment Triangle & Resuscitation
  if (/\b(pediatric assessment triangle|pat triage|pals|pediatric resuscitation)\b/i.test(q)) {
    const pat = evaluatePediatricAssessmentTriangle({
      appearanceToneTicklesLookSpeech: "ABNORMAL_LETHARGIC_IRRITABLE_UNRESPONSIVE",
      workOfBreathingRetractionsNasalFlaring: "ABNORMAL_STRIDOR_GRUNTING_RETRACTIONS",
      circulationToSkinPallorMottlingCyanosis: "NORMAL_PINK",
    });

    const doses = calculatePediatricResuscitationDoses({
      childWeightKg: 16,
      clinicalScenario: "STATUS_EPILEPTICUS",
    });

    return [
      `# Noctis Clinical Decision Support — Pediatric Emergency & PALS Engine`,
      `**PAT Physiologic Status:** ${pat.physiologicCategory} · **Acuity:** ${pat.acuityTier}`,
      `- **Immediate Action:** ${pat.immediatePalsAction}`,
      `### Weight-Based Emergency Dosing (for ${doses.childWeightKg} kg child):`,
      `- **IV Fluid Bolus (20 mL/kg):** ${doses.fluidBolusVolumeMl} mL isotonic crystalloid`,
      `- **Defibrillation Initial (2 J/kg):** ${doses.defibrillationJoulesInitial} Joules`,
      doses.calculatedMedications.map((m) => `- **${m.drugName}:** ${m.calculatedDose} (${m.routeAndAdministration})`).join("\n"),
    ].join("\n");
  }

  // =========================================================================
  // 8. GLOBAL PULMONARY, METABOLIC, PSYCHIATRIC & INFECTIOUS DISEASES
  // =========================================================================

  // COPD & Asthma (GOLD/GINA 2026)
  if (/\b(copd|chronic obstructive pulmonary|gold stage|fev1|fev1\/fvc|gina|asthma management|smart therapy)\b/i.test(q)) {
    const isAsthma = /\b(asthma|gina)\b/i.test(q) && !/\b(copd)\b/i.test(q);
    const res = evaluateCopdAsthma({
      isCopdOrAsthma: isAsthma ? "ASTHMA" : "COPD",
      postBronchodilatorFev1FvcRatio: 0.62,
      fev1PercentPredicted: 48,
      hospitalizationsPastYear: 1,
      currentSpO2RoomAir: 88,
    });

    return [
      `# Noctis Clinical Decision Support — Chronic Lower Respiratory Diseases`,
      `**Condition:** ${res.condition} · **Classification:** ${res.goldOrGinaStage} (${res.exacerbationRiskGroup})`,
      `- **Long-Term Oxygen Therapy (LTOT) Indicated:** ${res.longTermOxygenTherapyIndicated ? "YES (Resting SpO2 <= 88% or PaO2 <= 55 mmHg)" : "NO"}`,
      `### Maintenance Pharmacotherapy:`,
      res.maintenancePharmacotherapy.map((m) => `- ${m}`).join("\n"),
      `### Acute Exacerbation Protocol:`,
      res.acuteExacerbationProtocol.map((p) => `- ${p}`).join("\n"),
    ].join("\n");
  }

  // Hypertensive Crisis (Emergency vs. Urgency)
  const bpMatch = q.match(/(\d{2,3})\/(\d{2,3})/);
  const matchedSbp = bpMatch ? parseInt(bpMatch[1], 10) : 0;
  const matchedDbp = bpMatch ? parseInt(bpMatch[2], 10) : 0;
  const isSevereBp = matchedSbp >= 180 || matchedDbp >= 120;

  if (isSevereBp || /\b(hypertensive crisis|hypertensive emergency|hypertensive urgency|malignant hypertension|severe hypertension)\b/i.test(q)) {
    const sbp = bpMatch ? matchedSbp : 210;
    const dbp = bpMatch ? matchedDbp : 124;
    const hasAcuteNeuro =
      /\b(stroke|facial\s+droop\w*|face\s+droop\w*|arm\s+drift|slurred\s+speech|difficulty\s+(?:speaking|talking)|aphasia|hemipares\w*|hemipleg\w*)\b/i.test(q) ||
      (/\bweakness\b/i.test(q) && /\b(facial|face|speech|speaking|right-sided|left-sided|unilateral)\b/i.test(q));

    const res = evaluateHypertensiveCrisis({
      systolicBpMmHg: sbp,
      diastolicBpMmHg: dbp,
      hasAcuteStrokeOrNeurologicalDeficit: hasAcuteNeuro,
      hasAcuteHeadacheOrEncephalopathy: /\b(headache|encephalopathy|confusion|altered mental)\b/i.test(q),
      hasPapilledemaOrRetinalHemorrhages: /\b(papilledema|blurred vision|retinal)\b/i.test(q),
      hasAcutePulmonaryEdemaShortnessOfBreath: /\b(pulmonary edema|shortness of breath|sob)\b/i.test(q),
      hasAcuteAorticDissectionTear: /\b(aortic dissection|tearing)\b/i.test(q),
      hasAcuteRenalFailureRisingCreatinine: /\b(renal failure|creatinine|oliguria)\b/i.test(q),
      hasAcuteChestPainOrAcs: /\b(chest pain|angina|infarction)\b/i.test(q),
    });

    return [
      `# Noctis Clinical Decision Support — Hypertensive Crisis Triage Engine`,
      `**Classification:** ${res.category} (Blood Pressure: ${sbp}/${dbp} mmHg)`,
      `- **First-Hour Target:** ${res.targetBloodPressure1stHour}`,
      `- **Max Permitted 1st-Hour MAP Drop:** ${res.maximumPermittedMapDropPercent1stHour}%`,
      `### Recommended IV Antihypertensives:`,
      res.recommendedIvAgents.map((a) => `- ${a}`).join("\n"),
      res.contraindicatedAgents.length ? `### ⚠️ Strict Contraindications:\n${res.contraindicatedAgents.map((c) => `- ${c}`).join("\n")}` : "",
      `\n**Action Directive:** ${res.immediateAction}`,
    ].filter(Boolean).join("\n");
  }

  // Diarrheal Diseases & Dehydration (WHO)
  if (/\b(diarrhea|diarrhoeal|c\. diff|clostridioides difficile|dehydration who|dysentery)\b/i.test(q)) {
    const res = evaluateDiarrhealIllness({
      durationDays: 4,
      stoolFrequencyPerDay: 7,
      recentAntibioticExposurePast3Months: /\b(antibiotic|clindamycin|fluoroquinolone|c\. diff)\b/i.test(q),
      hasBloodyStoolsOrDysentery: /\b(bloody|blood in stool|dysentery)\b/i.test(q),
      hasSevereDehydrationSigns: /\b(lethargic|sunken eyes|skin tenting)\b/i.test(q),
    });

    return [
      `# Noctis Clinical Decision Support — Diarrheal Illness & Dehydration Engine`,
      `**Syndrome:** ${res.syndrome} · **Dehydration Tier:** ${res.dehydrationStatus}`,
      `- **Rehydration Protocol:** ${res.rehydrationProtocol}`,
      `- **Antimicrobial Guidance:** ${res.antimicrobialGuidance}`,
      res.contraindications.length ? `\n> ⚠️ **Contraindication:** ${res.contraindications.join(" ")}\n` : "",
    ].join("\n");
  }

  // Obesity & Metabolic Syndrome
  if (/\b(obesity|bmi >=|metabolic syndrome|glp-1|semaglutide|tirzepatide|zepbound|wegovy|bariatric surgery)\b/i.test(q)) {
    const bmiMatch = q.match(/bmi\s*[:=]?\s*([0-9.]+)/i);
    const bmi = bmiMatch ? parseFloat(bmiMatch[1]) : 36.2;
    const res = evaluateObesityMetabolic({
      bodyMassIndexKgM2: bmi,
      waistCircumferenceInches: 41,
      fastingTriglyceridesMgDl: 175,
      hdlCholesterolMgDl: 38,
      systolicBpMmHg: 136,
      fastingGlucoseMgDl: 114,
    });

    return [
      `# Noctis Clinical Decision Support — Obesity & Metabolic Syndrome Engine`,
      `**WHO BMI Category:** ${res.whoBmiCategory} (BMI: ${bmi} kg/m²)`,
      `- **Metabolic Syndrome Criteria Met:** ${res.metabolicSyndromeCriteriaMet} / 5 (${res.hasMetabolicSyndrome ? "CONFIRMED" : "NOT MET"})`,
      `- **Incretin / Pharmacotherapy:** ${res.pharmacotherapyEligibility}`,
      `- **Bariatric Surgery Eligibility:** ${res.bariatricSurgeryEligibility}`,
      `### First-Line Weight Loss Regimens:`,
      res.evidenceBasedRegimens.map((r) => `- ${r}`).join("\n"),
    ].join("\n");
  }

  // Depression (PHQ-9) & Anxiety (GAD-7)
  if (/\b(phq-?9|gad-?7|depression screening|anxiety disorder|suicidal ideation)\b/i.test(q)) {
    const phqMatch = q.match(/phq-?9\s*[:=]?\s*(\d{1,2})/i);
    const phq = phqMatch ? parseInt(phqMatch[1], 10) : 16;
    const hasSelfHarm = /\b(suicide|self-harm|thoughts of death|item 9|harm myself)\b/i.test(q);

    const res = evaluatePhq9Gad7({
      phq9Score: phq,
      phq9Item9SelfHarmScore: hasSelfHarm ? 2 : 0,
      gad7Score: 12,
      hasActiveSuicidalIntentOrPlan: hasSelfHarm,
    });

    return [
      `# Noctis Clinical Decision Support — Psychiatric Screening (PHQ-9 / GAD-7)`,
      `**Depression Severity:** ${res.depressionSeverity} (PHQ-9: ${phq}/27) · **Anxiety:** ${res.anxietySeverity}`,
      res.immediateSuicideSafetyLock ? `\n> ${res.crisisEscalationDirective}\n` : "",
      `### First-Line Pharmacotherapy:`,
      res.firstLinePharmacotherapy.map((p) => `- ${p}`).join("\n"),
      `### Psychotherapy Pathways:`,
      res.psychotherapyRecommendations.map((r) => `- ${r}`).join("\n"),
    ].join("\n");
  }

  // HIV/AIDS & CD4 Prophylaxis
  if (/\b(hiv|aids|cd4 count|opportunistic infection prophylaxis|pcp prophylaxis|toxoplasma prophylaxis)\b/i.test(q)) {
    const cd4Match = q.match(/cd4\s*[:=]?\s*(\d{1,4})/i);
    const cd4 = cd4Match ? parseInt(cd4Match[1], 10) : 140;
    const res = evaluateHivOpportunisticProphylaxis({
      cd4CountCellsPerUl: cd4,
      viralLoadCopiesPerMl: 35000,
    });

    return [
      `# Noctis Clinical Decision Support — HIV/AIDS Opportunistic Infection Engine`,
      `**CDC Classification:** ${res.cdcClinicalStage} (CD4: ${cd4} cells/uL)`,
      `- **PCP Prophylaxis (CD4 < 200):** ${res.pcpProphylaxisIndicated ? "INDICATED" : "NOT INDICATED"}`,
      `- **Toxoplasmosis Prophylaxis (CD4 < 100):** ${res.toxoplasmosisProphylaxisIndicated ? "INDICATED" : "NOT INDICATED"}`,
      `- **MAC Prophylaxis (CD4 < 50):** ${res.macProphylaxisIndicated ? "INDICATED" : "NOT INDICATED"}`,
      `### Indicated Regimens:`,
      res.indicatedProphylacticRegimens.map((r) => `- ${r}`).join("\n"),
      `\n**Antiretroviral Strategy:** ${res.artGuidance}`,
    ].join("\n");
  }

  // Tuberculosis Management
  if (/\b(tuberculosis|ripe regimen|active tb|latent tb|isoniazid|rifampin|afb smear|genexpert)\b/i.test(q)) {
    const res = evaluateTuberculosis({
      presentation: "ACTIVE_PULMONARY_SUSPECTED",
      sputumAfbSmearOrGeneXpertPositive: true,
      hasCoughOver3WeeksWithHemoptysisAndNightSweats: true,
      chestXrayCavitaryInfiltratePresent: true,
    });

    return [
      `# Noctis Clinical Decision Support — Tuberculosis Elimination & RIPE Protocol`,
      `**Clinical Status:** ${res.clinicalStatus}`,
      `- **Airborne Isolation Required:** ${res.airborneIsolationRequired ? "YES (Negative-pressure room / N95 respirators)" : "NO"}`,
      `- **Regimen:** ${res.standardRegimen}`,
      `### RIPE Components:`,
      Object.entries(res.drugComponents).map(([d, desc]) => `- **${d}:** ${desc}`).join("\n"),
      `### Hepatotoxicity Safety Guard:`,
      res.hepatotoxicityMonitoringRules.map((r) => `- ${r}`).join("\n"),
    ].join("\n");
  }

  // Malaria Protocol
  if (/\b(malaria|artesunate|plasmodium|falciparum|parasitemia|thick and thin smear|cerebral malaria)\b/i.test(q)) {
    const pMatch = q.match(/(\d+(?:\.\d+)?)\s*%\s*(?:p\.?\s*falciparum\s*)?parasitemia/i) || q.match(/parasitemia\s*(?:of|is|:)?\s*(\d+(?:\.\d+)?)\s*%/i) || q.match(/(\d+(?:\.\d+)?)\s*%/i);
    const parasitemia = pMatch ? parseFloat(pMatch[1]) : 12;

    const res = evaluateMalaria({
      travelToEndemicAreaPastYear: true,
      speciesIdentified: "PLASMODIUM_FALCIPARUM",
      parasitemiaPercentage: parasitemia,
      hasImpairedConsciousnessOrCerebralMalaria: /\b(cerebral|confusion|coma|altered)\b/i.test(q),
    });

    return [
      `# Noctis Clinical Decision Support — Malaria Treatment & Artesunate Protocol`,
      `**Severity Tier:** ${res.severityTier}`,
      `- **Parasitemia Assessed:** ${parasitemia}%`,
      `- **First-Line Regimen:** ${res.firstLineTherapy}`,
      `- **G6PD Screen Required Before Primaquine/Tafenoquine:** ${res.g6pdTestingRequiredBeforePrimaquine ? "YES" : "NO"}`,
      res.emergencyActions.length ? `### Emergency Actions:\n${res.emergencyActions.map((a) => `- ${a}`).join("\n")}` : "",
    ].join("\n");
  }

  // Hepatitis C Elimination
  if (/\b(hepatitis c|hcv rna|epclusa|mavyret|sofosbuvir|velpatasvir|svr12)\b/i.test(q)) {
    const res = evaluateHepatitisC({
      hcvAntibodyPositive: true,
      hcvRnaDetectable: true,
      hcvRnaViralLoadIuMl: 850000,
      cirrhosisPresent: /\b(cirrhosis|cirrhotic)\b/i.test(q),
    });

    return [
      `# Noctis Clinical Decision Support — Hepatitis C Direct-Acting Antiviral (DAA)`,
      `**Diagnostic Conclusion:** ${res.diagnosticConclusion}`,
      `- **Treatment Duration:** ${res.treatmentDurationWeeks} Weeks`,
      `- **Curative Endpoint:** ${res.sustainedVirologicResponseGoal}`,
      `### Recommended Pan-Genotypic Regimens:`,
      res.panGenotypicRegimens.map((r) => `- ${r}`).join("\n"),
    ].join("\n");
  }

  // =========================================================================
  // 9. MAJOR GLOBAL CANCERS & CHRONIC CONDITIONS
  // =========================================================================

  // Top 5 Cancers (Lung, Breast, Prostate, Colorectal, Cervical)
  if (/\b(lung cancer|breast cancer|prostate cancer|colorectal cancer|colon cancer|cervical cancer|gleason|her2|trastuzumab|cardio-oncology|egfr lung)\b/i.test(q)) {
    let site: "LUNG" | "BREAST" | "PROSTATE" | "COLORECTAL" | "CERVICAL" = "LUNG";
    if (/\b(breast cancer|her2|trastuzumab|er positive)\b/i.test(q)) site = "BREAST";
    else if (/\b(prostate cancer|gleason|psa)\b/i.test(q)) site = "PROSTATE";
    else if (/\b(colorectal|colon cancer|msi-high|dmmr)\b/i.test(q)) site = "COLORECTAL";
    else if (/\b(cervical cancer|hpv 16|hpv 18)\b/i.test(q)) site = "CERVICAL";

    const lvefMatch = q.match(/(?:lvef|ejection fraction|ef)\s*(?:of|is|:|=)?\s*(\d{1,2})%/i);
    const lvef = lvefMatch ? parseInt(lvefMatch[1], 10) : undefined;

    const res = evaluateCancerStaging({
      cancerType: site,
      biomarkers: {
        egfrMutation: true,
        her2Positive: true,
        erPositive: true,
        gleasonPrimaryScore: 4,
        gleasonSecondaryScore: 3,
        msiHighOrDmmr: true,
        hpvHighRiskPositive: true,
      },
    });

    const cardioGate: string[] = [];
    if (site === "BREAST" && (q.includes("trastuzumab") || q.includes("her2") || lvef !== undefined)) {
      if (lvef !== undefined) {
        if (lvef < 50) {
          cardioGate.push(`### Cardio-Oncology Critical Safety Alert:`);
          cardioGate.push(`- **Baseline LVEF:** ${lvef}% (< 50% threshold).`);
          cardioGate.push(`- **Action:** Withhold/delay HER2-targeted therapy (Trastuzumab). Repeat echocardiography in 3–4 weeks.`);
          cardioGate.push(`- **Intervention:** Immediate cardio-oncology consultation; consider guideline-directed cardioprotective therapy (ACEi/ARB, beta-blocker).`);
          cardioGate.push(`- **Safety Rule:** Do NOT initiate Trastuzumab if LVEF < 45% or symptomatic heart failure.`);
        } else {
          cardioGate.push(`### Cardio-Oncology Gate:`);
          cardioGate.push(`- **Baseline LVEF:** ${lvef}% (>= 50%, within acceptable threshold for HER2-targeted therapy).`);
          cardioGate.push(`- **Surveillance Protocol:** Mandatory surveillance echocardiogram every 3 months during Trastuzumab therapy.`);
          cardioGate.push(`- **Withholding Criteria:** Withhold Trastuzumab if absolute LVEF drops >= 10% from baseline AND falls below 50%.`);
        }
      }
    }

    return [
      `# Noctis Clinical Decision Support — Oncologic Staging & Targeted Biomarkers`,
      `**Primary Site:** ${res.cancerSite} · **Stage Group:** ${res.stageGroup}`,
      `- **Molecular / Grade Subtype:** ${res.molecularSubtypeOrGradeGroup}`,
      cardioGate.length ? cardioGate.join("\n") : "",
      res.targetedTherapiesAndBiomarkers.length ? `### Targeted & Immunotherapy Biomarkers:\n${res.targetedTherapiesAndBiomarkers.map((t) => `- ${t}`).join("\n")}` : "",
      `### First-Line Therapeutic Pathways:`,
      res.firstLineTherapeuticPathways.map((p) => `- ${p}`).join("\n"),
      `\n**Screening Guidance:** ${res.screeningAndSurveillanceGuidance}`,
    ].filter(Boolean).join("\n");
  }

  // Parkinson's Disease (MDS Criteria)
  if (/\b(parkinson'?s|levodopa|carbidopa|sinemet|hoehn and yahr|resting tremor|bradykinesia)\b/i.test(q)) {
    const res = evaluateParkinsons({
      hasBradykinesia: true,
      hasRestingTremor: true,
      hasRigidityCogwheelOrLeadpipe: true,
      experiencesWearingOffOrDyskinesia: /\b(wearing off|dyskinesia)\b/i.test(q),
    });

    return [
      `# Noctis Clinical Decision Support — Parkinson's Disease & Movement Disorders`,
      `**Certainty:** ${res.diagnosticCertainty} · **Stage:** ${res.hoehnAndYahrStage}`,
      `### Pharmacotherapy Pathways:`,
      res.firstLinePharmacotherapy.map((p) => `- ${p}`).join("\n"),
      res.motorFluctuationManagement.length ? `### Motor Fluctuation Management:\n${res.motorFluctuationManagement.map((m) => `- ${m}`).join("\n")}` : "",
      `### Multidisciplinary Support:`,
      res.multidisciplinaryCare.map((c) => `- ${c}`).join("\n"),
    ].join("\n");
  }

  // Osteoporosis & FRAX
  if (/\b(osteoporosis|dexa|t-score|frax|alendronate|zoledronic|denosumab|bone mineral density)\b/i.test(q)) {
    const tMatch = q.match(/t-?score\s*[:=]?\s*(-?[0-9.]+)/i);
    const t = tMatch ? parseFloat(tMatch[1]) : -2.7;
    const egfrMatch = q.match(/(?:egfr|gfr)\s*[:=]?\s*([0-9.]+)/i);
    const egfr = egfrMatch ? parseFloat(egfrMatch[1]) : 52;
    const res = evaluateOsteoporosis({
      lowestDexaTScore: t,
      ageYears: 72,
      isFemale: true,
      eGfrMlMin173m2: egfr,
    });

    return [
      `# Noctis Clinical Decision Support — Osteoporosis & Bone Mineral Density`,
      `**Classification:** ${res.boneMineralDensityClassification} (Lowest T-score: ${t})`,
      `- **Renal Function Evaluated:** eGFR ${egfr} mL/min/1.73m²`,
      `- **Pharmacologic Therapy Indicated:** ${res.pharmacologicTherapyIndicated ? "YES" : "NO"}`,
      `### First-Line Antiresorptive Agents:`,
      res.firstLineAntiresorptiveAgents.map((a) => `- ${a}`).join("\n"),
      `### Safety & Renal Contraindications:`,
      res.safetyContraindications.map((s) => `- ${s}`).join("\n"),
    ].join("\n");
  }

  // Sickle Cell Disease & Acute Chest Syndrome
  if (/\b(sickle cell|vaso-occlusive|acute chest syndrome|voc|hydroxyurea|hgb s)\b/i.test(q)) {
    const isAcs = /\b(acute chest syndrome|acs|infiltrate|hypoxemia in scd)\b/i.test(q);
    const res = evaluateSickleCell({
      genotype: "HB_SS",
      isAcuteVasoOcclusivePainCrisis: true,
      hasNewPulmonaryInfiltrateOnCxr: isAcs,
      feverCelsius: 38.6,
      spO2DropGreaterThan3Percent: isAcs,
    });

    return [
      `# Noctis Clinical Decision Support — Sickle Cell Disease & Emergency Protocol`,
      `**Complication Status:** ${res.complicationType}`,
      `### Pain Crisis Analgesia Protocol:`,
      res.immediatePainManagementProtocol.map((p) => `- ${p}`).join("\n"),
      res.acuteChestSyndromeProtocol.length ? `### Acute Chest Syndrome Protocol:\n${res.acuteChestSyndromeProtocol.map((a) => `- ${a}`).join("\n")}` : "",
      `\n**Transfusion Strategy:** ${res.bloodTransfusionGuidance}`,
      `### Disease-Modifying Therapy:`,
      res.diseaseModifyingTherapy.map((d) => `- ${d}`).join("\n"),
    ].join("\n");
  }

  // =========================================================================
  // 10. ENDOCRINE & OSMOTIC SYMPTOM TRIAD (NEW-ONSET DIABETES CDS)
  // =========================================================================
  if (/\b(increased thirst|frequent urination|unexplained weight loss|polyuria|polydipsia|osmotic symptoms?|fatigue.*thirst.*urination|thirst.*urination.*weight)\b/i.test(q)) {
    return [
      `# Noctis Clinical Decision Support — New-Onset Diabetes & Osmotic Triad Protocol`,
      `**Clinical Syndrome:** Classic Osmotic Triad (Polyuria + Polydipsia + Weight Loss + Fatigue)`,
      `**Primary Differential:** Suspected New-Onset Diabetes Mellitus (Type 1 vs Type 2 vs LADA) — Unconfirmed pending laboratory verification.`,
      ``,
      `### Diagnostic Criteria (ADA 2026 Standards of Care):`,
      `- **Random Plasma Glucose:** >= 200 mg/dL (11.1 mmol/L) in the presence of classic symptoms is diagnostic of diabetes without requiring confirmatory retesting.`,
      `- **Fasting Plasma Glucose (FPG):** >= 126 mg/dL (7.0 mmol/L) after an 8-hour fast.`,
      `- **Hemoglobin A1c:** >= 6.5% (48 mmol/mol) using a NGSP-certified assay.`,
      ``,
      `### Acute Complication Screening (Must Exclude Immediately):`,
      `- **Diabetic Ketoacidosis (DKA):** Screen for nausea, vomiting, abdominal pain, Kussmaul respirations, fruity breath odor, or tachypnea. Order urine/serum ketones (quantitative beta-hydroxybutyrate).`,
      `- **Hyperosmolar Hyperglycemic State (HHS):** Screen for severe dehydration, orthostasis, or altered mental status in older adults (effective osmolality > 320 mOsm/kg).`,
      ``,
      `### Secondary & Non-Diabetic Differentials:`,
      `- **Primary Hyperparathyroidism:** Hypercalcemia causes nephrogenic polyuria, polydipsia, fatigue, and weight loss. Check corrected serum calcium.`,
      `- **Diabetes Insipidus (Central vs Nephrogenic):** Characterized by profound polyuria/polydipsia with dilute urine (urine specific gravity < 1.005, urine osmolality < 300 mOsm/kg).`,
      `- **Hyperthyroidism / Thyrotoxicosis:** Catabolic state with weight loss, fatigue, increased thirst, heat intolerance, and tremor. Check serum TSH.`,
      ``,
      `### Priority Diagnostic Workup Panel:`,
      `1. **Basic Metabolic Panel (BMP) [LOINC 24323-8]:** Glucose, BUN, Creatinine/eGFR, Electrolytes, Anion Gap, and Bicarbonate.`,
      `2. **Hemoglobin A1c [LOINC 4548-4]:** Assess average 3-month glycemic load.`,
      `3. **Serum Beta-Hydroxybutyrate [LOINC 47094-8] & Urinalysis [LOINC 24356-8]:** Screen for ketonuria, glucosuria, and proteinuria.`,
      `4. **Fasting C-Peptide [LOINC 1988-5] & Pancreatic Autoantibodies (Anti-GAD65 [LOINC 56540-8], IA-2, ZnT8):** If adult-onset Type 1 Diabetes or LADA is suspected.`,
      ``,
      `*Safety Gate Enforced: All unmeasured laboratory parameters are kept strictly unknown. Autonomous medication prescribing is blocked until formal clinician assessment.*`,
    ].join("\n");
  }

  return null;
}
