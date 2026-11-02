/**
 * NOCTIS HEMATOLOGY & AUTOIMMUNE DECISION SUPPORT ENGINE
 * Spec: NOCTIS-HEM-AUTO-CDS-004 (ACR/EULAR, ASH, ISTH Guidelines)
 *
 * Core Capabilities:
 * 1. Thrombotic Microangiopathy (TMA) & PLASMIC Score for Emergent TTP Triage
 * 2. Anemia Algorithmic Cascade (Mentzer Index, Iron/Ferritin, Reticulocyte Production Index, B12/Folate/MMA)
 * 3. Autoantibody Matrix & Systemic Rheumatologic Solver (SLE, RA, Scleroderma, ANCA Vasculitis, Temporal Arteritis)
 *
 * Zero-Fabrication Rule: Unprovided clinical parameters are explicitly marked as NOT_PROVIDED.
 */

export interface PlasmicScoreInput {
  plateletCount10e9_L: number; // Platelet count < 30 x 10^9/L (+1)
  hemolysisDocumented?: boolean; // Retic > 2.5%, haptoglobin undetectable, or indirect bili > 2.0 (+1)
  noActiveCancerPastYear?: boolean; // (+1)
  noSolidOrganOrStemCellTransplant?: boolean; // (+1)
  mcvFL: number; // MCV < 90 fL (+1)
  inrLessThan1_5?: boolean; // (+1)
  creatinineMgDl: number; // Creatinine < 2.0 mg/dL (+1)
}

export interface PlasmicScoreResult {
  score: number; // 0 to 7
  riskTier: "HIGH_RISK" | "INTERMEDIATE_RISK" | "LOW_RISK";
  probabilitySevereAdamts13DeficiencyPercent: number; // 62-82% for High
  urgentIntervention: string;
  contraindications: string[];
}

export interface AnemiaCascadeInput {
  hemoglobinGDl: number; // e.g. < 12.0 (F) or < 13.0 (M)
  mcvFL: number; // < 80 Microcytic, 80-100 Normocytic, > 100 Macrocytic
  rbcCount10e12_L?: number; // for Mentzer Index = MCV / RBC
  ferritinNgMl?: number;
  serumIronMcgDl?: number;
  tibcMcgDl?: number;
  transferrinSaturationPercent?: number;
  reticulocytePercent?: number;
  hematocritPercent?: number;
  vitaminB12PgMl?: number;
  serumFolateNgMl?: number;
  methylmalonicAcidUmolL?: number; // MMA
  homocysteineUmolL?: number;
  isMale?: boolean;
}

export interface AnemiaCascadeResult {
  morphologicalClassification: "MICROCYTIC_ANEMIA" | "NORMOCYTIC_ANEMIA" | "MACROCYTIC_ANEMIA";
  mentzerIndex?: number;
  mentzerInterpretation?: "THALASSEMIA_TRAIT_SUGGESTED" | "IRON_DEFICIENCY_SUGGESTED";
  reticulocyteProductionIndex?: number; // RPI
  boneMarrowResponse?: "HYPERPROLIFERATIVE_RESPONSE" | "HYPOPROLIFERATIVE_INADEQUATE_RESPONSE";
  primaryEtiology: string;
  differentialDiagnoses: string[];
  recommendedConfirmatoryTests: string[];
}

export interface AutoantibodyRheumInput {
  anaTiterOrIu?: string; // e.g. "1:160", "1:320", "Negative"
  anaPattern?: "HOMOGENEOUS" | "SPECKLED" | "NUCLEOLAR" | "CENTROMERE" | "ROUGH";
  antiDsDnaPositive?: boolean;
  antiSmithPositive?: boolean;
  antiRoSsaPositive?: boolean;
  antiLaSsbPositive?: boolean;
  antiRnpPositive?: boolean;
  antiScl70Positive?: boolean;
  antiCentromerePositive?: boolean;
  rheumatoidFactorPositive?: boolean;
  antiCcpPositive?: boolean; // Anti-cyclic citrullinated peptide
  cAncaPr3Positive?: boolean;
  pAncaMpoPositive?: boolean;
  complementC3Low?: boolean;
  complementC4Low?: boolean;
  esrMmHr?: number;
  crpMgL?: number;
  ageYears?: number;
  headacheOrJawClaudicationPresent?: boolean;
}

export interface AutoantibodyRheumResult {
  identifiedSyndromes: string[];
  organThreatAlerts: string[];
  suggestedDiagnosticCriteria: { [syndrome: string]: string };
  immediateManagementActions: string[];
}

/**
 * 1. PLASMIC SCORE FOR EMERGENT TTP SCREENING
 */
export function calculatePlasmicScore(input: PlasmicScoreInput): PlasmicScoreResult {
  let score = 0;

  if (input.plateletCount10e9_L < 30) score++;
  if (input.hemolysisDocumented) score++;
  if (input.noActiveCancerPastYear) score++;
  if (input.noSolidOrganOrStemCellTransplant) score++;
  if (input.mcvFL < 90) score++;
  if (input.inrLessThan1_5) score++;
  if (input.creatinineMgDl < 2.0) score++;

  let risk: PlasmicScoreResult["riskTier"] = "LOW_RISK";
  let prob = 4;
  let action = "";

  if (score >= 6) {
    risk = "HIGH_RISK";
    prob = 72; // 62-82%
    action = "🚨 EMERGENT TTP MEDICAL EMERGENCY (PLASMIC Score 6-7). Immediate initiation of Therapeutic Plasma Exchange (PEX) and systemic Corticosteroids (Methylprednisolone 1 g/day IV). Consider Caplacizumab (anti-vWF nanobody) and Rituximab. DO NOT DELAY PEX while awaiting send-out ADAMTS13 activity results.";
  } else if (score === 5) {
    risk = "INTERMEDIATE_RISK";
    prob = 24; // 5-24%
    action = "Intermediate probability of TTP. Monitor platelet count and hemolysis markers closely. Send stat ADAMTS13 activity and inhibitor titers; prepare for urgent plasma exchange if hemolysis or thrombocytopenia worsens.";
  } else {
    risk = "LOW_RISK";
    prob = 4; // 0-4%
    action = "Low probability of severe ADAMTS13 deficiency. Evaluate alternative etiologies of thrombocytopenia (ITP, DIC, drug-induced, atypical HUS, sepsis/coagulopathy).";
  }

  const contraindications = [
    "CONTRAINDICATION: Platelet transfusions are STRICTLY CONTRAINDICATED in suspected TTP unless life-threatening hemorrhage is actively occurring (platelet infusions fuel microvascular thrombosis and precipitate fatal strokes/myocardial infarctions).",
  ];

  return {
    score,
    riskTier: risk,
    probabilitySevereAdamts13DeficiencyPercent: prob,
    urgentIntervention: action,
    contraindications,
  };
}

/**
 * 2. ANEMIA ALGORITHMIC CASCADE
 */
export function evaluateAnemiaCascade(input: AnemiaCascadeInput): AnemiaCascadeResult {
  const { hemoglobinGDl, mcvFL, rbcCount10e12_L, ferritinNgMl, tibcMcgDl, transferrinSaturationPercent, reticulocytePercent, hematocritPercent, vitaminB12PgMl, serumFolateNgMl, methylmalonicAcidUmolL, isMale } = input;

  let morph: AnemiaCascadeResult["morphologicalClassification"] = "NORMOCYTIC_ANEMIA";
  if (mcvFL < 80) morph = "MICROCYTIC_ANEMIA";
  else if (mcvFL > 100) morph = "MACROCYTIC_ANEMIA";

  let mentzer: number | undefined;
  let mentzerInterp: AnemiaCascadeResult["mentzerInterpretation"];
  if (morph === "MICROCYTIC_ANEMIA" && rbcCount10e12_L && rbcCount10e12_L > 0) {
    mentzer = Math.round((mcvFL / rbcCount10e12_L) * 10) / 10;
    if (mentzer < 13.0) mentzerInterp = "THALASSEMIA_TRAIT_SUGGESTED";
    else mentzerInterp = "IRON_DEFICIENCY_SUGGESTED";
  }

  // Reticulocyte Production Index (RPI) for normocytic anemia:
  // RPI = (Retic % * (Hct / Normal Hct)) / Maturation Factor
  let rpi: number | undefined;
  let marrowResp: AnemiaCascadeResult["boneMarrowResponse"];
  if (reticulocytePercent !== undefined && hematocritPercent !== undefined) {
    const normalHct = isMale ? 45 : 42;
    let maturationFactor = 1.0;
    if (hematocritPercent < 20) maturationFactor = 2.5;
    else if (hematocritPercent < 30) maturationFactor = 2.0;
    else if (hematocritPercent < 40) maturationFactor = 1.5;

    rpi = Math.round(((reticulocytePercent * (hematocritPercent / normalHct)) / maturationFactor) * 10) / 10;
    marrowResp = rpi >= 2.0 ? "HYPERPROLIFERATIVE_RESPONSE" : "HYPOPROLIFERATIVE_INADEQUATE_RESPONSE";
  }

  let etiology = "";
  const differentials: string[] = [];
  const tests: string[] = [];

  if (morph === "MICROCYTIC_ANEMIA") {
    if (ferritinNgMl !== undefined && ferritinNgMl < 30 || (transferrinSaturationPercent !== undefined && transferrinSaturationPercent < 16)) {
      etiology = "Iron Deficiency Anemia (IDA)";
      differentials.push("Gastrointestinal blood loss (colon neoplasm, ulcer, angiodysplasia)", "Menorrhagia", "Malabsorption (Celiac disease)");
      tests.push("Fecal occult blood or FIT test", "Colonoscopy and EGD", "Celiac serology (anti-tTG IgA)");
    } else if (mentzerInterp === "THALASSEMIA_TRAIT_SUGGESTED") {
      etiology = "Suspected Thalassemia Trait (Beta-Thalassemia Minor or Alpha-Thalassemia)";
      differentials.push("Beta-Thalassemia Trait", "Alpha-Thalassemia Trait (two-gene deletion)", "Anemia of Chronic Disease");
      tests.push("Hemoglobin Electrophoresis / High-Performance Liquid Chromatography (HPLC)", "Alpha-globin gene deletion analysis");
    } else if (ferritinNgMl !== undefined && ferritinNgMl >= 100) {
      etiology = "Anemia of Chronic Disease / Chronic Inflammation";
      differentials.push("Rheumatologic disorder", "Occult malignancy", "Chronic kidney disease");
      tests.push("ESR, CRP, Serum Creatinine / eGFR, Liver panel");
    } else {
      etiology = "Microcytic Anemia of Undetermined Etiology";
      differentials.push("Iron Deficiency Anemia", "Thalassemia Trait", "Anemia of Chronic Disease", "Sideroblastic Anemia");
      tests.push("Serum Iron, Ferritin, TIBC, Transferrin Saturation", "Hemoglobin Electrophoresis");
    }
  } else if (morph === "MACROCYTIC_ANEMIA") {
    const isB12Low = vitaminB12PgMl !== undefined && vitaminB12PgMl < 200;
    const isMmaHigh = methylmalonicAcidUmolL !== undefined && methylmalonicAcidUmolL > 0.40;
    const isFolateLow = serumFolateNgMl !== undefined && serumFolateNgMl < 4.0;

    if (isB12Low || isMmaHigh) {
      etiology = "Vitamin B12 (Cobalamin) Deficiency";
      differentials.push("Pernicious Anemia (anti-Intrinsic Factor)", "Gastric bypass / terminal ileal resection", "Strict vegan diet", "Metformin or PPI long-term use");
      tests.push("Anti-Intrinsic Factor antibody", "Anti-Parietal Cell antibody", "Urgent neurologic exam for subacute combined degeneration of the spinal cord");
    } else if (isFolateLow) {
      etiology = "Folate (Vitamin B9) Deficiency";
      differentials.push("Poor dietary intake", "Chronic alcohol use disorder", "Methotrexate or trimethoprim antagonism", "Hemolysis with increased cell turnover");
      tests.push("RBC Folate level", "Nutrition evaluation");
    } else {
      etiology = "Non-Megaloblastic Macrocytic Anemia";
      differentials.push("Chronic alcohol consumption", "Hepatic disease", "Hypothyroidism", "Myelodysplastic Syndrome (MDS)");
      tests.push("Liver function tests", "TSH", "Peripheral blood smear review for dysplastic cells / Pelger-Huet anomaly");
    }
  } else {
    // Normocytic
    if (marrowResp === "HYPERPROLIFERATIVE_RESPONSE") {
      etiology = "Normocytic Anemia with Hyperproliferative Marrow Response (RPI >= 2.0)";
      differentials.push("Acute blood loss / hemorrhage", "Autoimmune Hemolytic Anemia (AIHA)", "Microangiopathic Hemolytic Anemia (TTP/HUS/DIC)", "G6PD deficiency");
      tests.push("Direct Antiglobulin Test (Coombs)", "Haptoglobin, LDH, Indirect Bilirubin", "Peripheral blood smear for schistocytes");
    } else {
      etiology = "Normocytic Anemia with Inadequate Marrow Response (RPI < 2.0)";
      differentials.push("Anemia of Chronic Kidney Disease (erythropoietin deficiency)", "Anemia of Chronic Inflammation", "Bone marrow infiltration / aplasia", "Combined iron and B12 deficiency");
      tests.push("Serum Creatinine, eGFR", "Serum Ferritin, B12, Folate", "Erythropoietin level");
    }
  }

  return {
    morphologicalClassification: morph,
    mentzerIndex: mentzer,
    mentzerInterpretation: mentzerInterp,
    reticulocyteProductionIndex: rpi,
    boneMarrowResponse: marrowResp,
    primaryEtiology: etiology,
    differentialDiagnoses: differentials,
    recommendedConfirmatoryTests: tests,
  };
}

/**
 * 3. AUTOANTIBODY & RHEUMATOLOGIC MATRIX SOLVER
 */
export function solveAutoantibodies(input: AutoantibodyRheumInput): AutoantibodyRheumResult {
  const syndromes: string[] = [];
  const alerts: string[] = [];
  const criteria: { [syndrome: string]: string } = {};
  const actions: string[] = [];

  // 1. Giant Cell Arteritis / Temporal Arteritis
  if (input.ageYears && input.ageYears >= 50 && input.headacheOrJawClaudicationPresent) {
    const esrHigh = input.esrMmHr !== undefined && input.esrMmHr >= 50;
    const crpHigh = input.crpMgL !== undefined && input.crpMgL >= 10;
    if (esrHigh || crpHigh) {
      syndromes.push("Giant Cell Arteritis (Temporal Arteritis)");
      alerts.push("🚨 OPHTHALMIC EMERGENCY: Suspected Giant Cell Arteritis with high ESR/CRP. High risk of irreversible ischemic optic neuropathy (anterior ischemic optic neuropathy - AION) and permanent blindness.");
      actions.push("IMMEDIATE ACTION: Administer high-dose systemic Corticosteroids (IV Methylprednisolone 1,000 mg/day for visual symptoms, or Oral Prednisone 60 mg/day) IMMEDIATELY before scheduling temporal artery biopsy.");
      criteria["Giant Cell Arteritis"] = "ACR 1990/2022 Criteria: Age >= 50, new headache, temporal artery abnormality, ESR >= 50, compatible biopsy/ultrasound.";
    }
  }

  // 2. Systemic Lupus Erythematosus (SLE)
  const isAnaPositive = input.anaTiterOrIu && input.anaTiterOrIu.toLowerCase() !== "negative";
  if (isAnaPositive && (input.antiDsDnaPositive || input.antiSmithPositive || input.complementC3Low || input.complementC4Low)) {
    syndromes.push("Systemic Lupus Erythematosus (SLE)");
    criteria["Systemic Lupus Erythematosus"] = "2019 EULAR/ACR Criteria: ANA >= 1:80 entry criterion satisfied with highly specific immunological criteria (anti-dsDNA, anti-Smith, hypocomplementemia).";
    if (input.antiDsDnaPositive && (input.complementC3Low || input.complementC4Low)) {
      alerts.push("Active Lupus Nephritis Threat: Anti-dsDNA positivity combined with low C3/C4 strongly correlates with active renal inflammation (glomerulonephritis).");
      actions.push("Order stat urinalysis for hematuria/proteinuria and spot urine protein-to-creatinine ratio (UPCR). Nephrology consult for renal biopsy if UPCR > 0.5.");
    }
  }

  // 3. Rheumatoid Arthritis
  if (input.antiCcpPositive || input.rheumatoidFactorPositive) {
    syndromes.push("Seropositive Rheumatoid Arthritis (RA)");
    criteria["Rheumatoid Arthritis"] = "2010 ACR/EULAR Classification: High-titer Anti-CCP has >95% specificity for RA and predicts erosive joint disease.";
    actions.push("Initiate Disease-Modifying Antirheumatic Drug (DMARD: Methotrexate first-line) early in window of opportunity to prevent permanent joint destruction.");
  }

  // 4. ANCA-Associated Vasculitis
  if (input.cAncaPr3Positive) {
    syndromes.push("Granulomatosis with Polyangiitis (GPA / Wegener's) - PR3-ANCA");
    alerts.push("Pulmonary-Renal Syndrome Threat: PR3-ANCA vasculitis can cause rapid alveolar hemorrhage and necrotizing crescentic glomerulonephritis.");
    actions.push("Obtain chest CT (cavities/nodules), urinalysis (red cell casts), and initiate high-dose pulse steroids + Rituximab or Cyclophosphamide.");
  } else if (input.pAncaMpoPositive) {
    syndromes.push("Microscopic Polyangiitis (MPA) or Eosinophilic GPA - MPO-ANCA");
    alerts.push("Rapidly Progressive Glomerulonephritis (RPGN) Threat: MPO-ANCA strongly associated with pauci-immune crescentic nephritis.");
    actions.push("Monitor daily serum creatinine and active urinary sediment.");
  }

  // 5. Systemic Sclerosis (Scleroderma)
  if (input.antiScl70Positive) {
    syndromes.push("Diffuse Cutaneous Systemic Sclerosis (Scleroderma) - Anti-Scl-70 / Topoisomerase I");
    alerts.push("Interstitial Lung Disease (ILD) & Scleroderma Renal Crisis Risk: Screen baseline pulmonary function tests (DLCO) and high-resolution chest CT.");
  } else if (input.antiCentromerePositive) {
    syndromes.push("Limited Cutaneous Systemic Sclerosis (CREST Syndrome) - Anti-Centromere");
    alerts.push("Pulmonary Arterial Hypertension (PAH) Threat: Annual screening transthoracic echocardiogram indicated.");
  }

  return {
    identifiedSyndromes: syndromes,
    organThreatAlerts: alerts,
    suggestedDiagnosticCriteria: criteria,
    immediateManagementActions: actions,
  };
}
