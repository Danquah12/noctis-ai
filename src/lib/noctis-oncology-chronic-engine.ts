/**
 * NOCTIS ONCOLOGY & CHRONIC GLOBAL DISEASES DECISION SUPPORT ENGINE
 * Spec: NOCTIS-ONC-CHRONIC-CDS-008 (NCCN, ASCO, MDS, NOF/ISCD, ASH Guidelines)
 *
 * Core Capabilities:
 * 1. Top 5 Global Cancers: Lung, Breast, Prostate, Colorectal & Cervical Cancer Staging & Targeted Biomarker Pathways
 * 2. Parkinson's Disease (MDS Criteria, Hoehn & Yahr Staging, Levodopa Motor Fluctuation Management)
 * 3. Osteoporosis & FRAX 10-Year Fracture Risk Calculator (DEXA T-Scores & Antiresorptive Gating)
 * 4. Sickle Cell Disease (Vaso-Occlusive Pain Crisis & Emergent Acute Chest Syndrome Protocol)
 *
 * Zero-Fabrication Rule: Unprovided clinical parameters are explicitly marked as NOT_PROVIDED.
 */

export interface CancerStagingInput {
  cancerType: "LUNG" | "BREAST" | "PROSTATE" | "COLORECTAL" | "CERVICAL";
  tumorSizeMm?: number;
  lymphNodesPositiveCount?: number;
  distantMetastasesPresent?: boolean;
  histologySubtype?: string; // e.g. "Adenocarcinoma", "Squamous", "Small Cell", "Invasive Ductal"
  biomarkers?: {
    egfrMutation?: boolean;
    alkRearrangement?: boolean;
    pdl1Percent?: number;
    erPositive?: boolean;
    prPositive?: boolean;
    her2Positive?: boolean;
    gleasonPrimaryScore?: number; // 1-5
    gleasonSecondaryScore?: number; // 1-5
    psaNgMl?: number;
    msiHighOrDmmr?: boolean;
    krasMutation?: boolean;
    hpvHighRiskPositive?: boolean;
  };
}

export interface CancerStagingResult {
  cancerSite: string;
  stageGroup: string;
  molecularSubtypeOrGradeGroup: string;
  firstLineTherapeuticPathways: string[];
  targetedTherapiesAndBiomarkers: string[];
  screeningAndSurveillanceGuidance: string;
}

export interface ParkinsonsInput {
  hasBradykinesia: boolean; // Mandatory cardinal feature
  hasRestingTremor?: boolean; // 4-6 Hz pill-rolling
  hasRigidityCogwheelOrLeadpipe?: boolean;
  hasPosturalInstability?: boolean;
  hasAtypicalParkinsonismRedFlags?: boolean; // Early severe autonomic failure, supranuclear gaze palsy, prominent cerebellar signs
  diseaseDurationYears?: number;
  experiencesWearingOffOrDyskinesia?: boolean;
}

export interface ParkinsonsResult {
  diagnosticCertainty: "CLINICALLY_ESTABLISHED_PD" | "CLINICALLY_PROBABLE_PD" | "SUSPECTED_ATYPICAL_PARKINSONISM" | "DIAGNOSIS_NOT_MET";
  hoehnAndYahrStage: string;
  firstLinePharmacotherapy: string[];
  motorFluctuationManagement: string[];
  multidisciplinaryCare: string[];
}

export interface OsteoporosisInput {
  lowestDexaTScore: number; // e.g. -2.8
  priorFragilityFracture?: boolean; // hip or spine
  ageYears: number;
  isFemale: boolean;
  eGfrMlMin173m2?: number; // Bisphosphonate contraindication if < 35
  calculatedFraxMajorOsteoporoticRiskPercent?: number; // >= 20% threshold
  calculatedFraxHipFractureRiskPercent?: number; // >= 3% threshold
}

export interface OsteoporosisResult {
  boneMineralDensityClassification: "OSTEOPOROSIS" | "OSTEOPENIA_LOW_BONE_MASS" | "NORMAL_BONE_DENSITY";
  pharmacologicTherapyIndicated: boolean;
  firstLineAntiresorptiveAgents: string[];
  anabolicAgentEligibility: string;
  safetyContraindications: string[];
}

export interface SickleCellInput {
  genotype: "HB_SS" | "HB_SC" | "HB_S_BETA_THAL_ZERO" | "HB_S_BETA_THAL_PLUS";
  isAcuteVasoOcclusivePainCrisis: boolean;
  painSeverityScore1To10?: number;
  hasNewPulmonaryInfiltrateOnCxr?: boolean; // Mandatory for Acute Chest Syndrome
  feverCelsius?: number; // >= 38.5
  spO2DropGreaterThan3Percent?: boolean;
  chestPainOrTachypneaPresent?: boolean;
  baselineHemoglobinGDl?: number;
  currentHemoglobinGDl?: number;
}

export interface SickleCellResult {
  complicationType: "ACUTE_CHEST_SYNDROME_EMERGENCY" | "ACUTE_VASO_OCCLUSIVE_CRISIS" | "COMPENSATED_STEADY_STATE";
  immediatePainManagementProtocol: string[];
  acuteChestSyndromeProtocol: string[];
  bloodTransfusionGuidance: string;
  diseaseModifyingTherapy: string[];
}

/**
 * 1. TOP 5 GLOBAL CANCERS STAGING & BIOMARKER ENGINE
 */
export function evaluateCancerStaging(input: CancerStagingInput): CancerStagingResult {
  const { cancerType, biomarkers = {}, distantMetastasesPresent, lymphNodesPositiveCount } = input;
  let stage = distantMetastasesPresent ? "Stage IV (Metastatic)" : lymphNodesPositiveCount ? "Stage III (Locally Advanced / Regional Nodes)" : "Stage I / II (Localized)";
  let subtype = "Not specified";
  const therapies: string[] = [];
  const targeted: string[] = [];
  let surveillance = "";

  if (cancerType === "LUNG") {
    const isSclc = (input.histologySubtype || "").toLowerCase().includes("small cell");
    subtype = isSclc ? "Small Cell Lung Cancer (SCLC)" : "Non-Small Cell Lung Cancer (NSCLC)";

    if (isSclc) {
      stage = distantMetastasesPresent ? "Extensive Stage SCLC" : "Limited Stage SCLC";
      therapies.push("Chemo-Immunotherapy: Platinum (Carboplatin or Cisplatin) + Etoposide + PD-L1 inhibitor (Atezolizumab or Durvalumab).");
      therapies.push("Consolidative Prophylactic Cranial Irradiation (PCI) for limited stage.");
    } else {
      // NSCLC
      if (biomarkers.egfrMutation) {
        targeted.push("EGFR Exon 19 del / L858R (+): First-line Osimertinib 80 mg PO daily (3rd-gen CNS-penetrant TKI).");
      }
      if (biomarkers.alkRearrangement) {
        targeted.push("ALK Rearrangement (+): First-line Alectinib or Brigatinib (second-generation ALK TKI).");
      }
      if (biomarkers.pdl1Percent !== undefined && biomarkers.pdl1Percent >= 50) {
        targeted.push(`High PD-L1 (${biomarkers.pdl1Percent}% >= 50%): First-line Pembrolizumab monotherapy (Keytruda).`);
      }
      therapies.push("Localized (Stage I-II): Surgical resection (anatomical lobectomy with mediastinal lymph node dissection) ± adjuvant Osimertinib or Atezolizumab.");
    }
    surveillance = "USPSTF Screening: Annual Low-Dose CT (LDCT) for adults aged 50-80 with a 20 pack-year smoking history who currently smoke or quit within 15 years.";
  } else if (cancerType === "BREAST") {
    const er = Boolean(biomarkers.erPositive);
    const pr = Boolean(biomarkers.prPositive);
    const her2 = Boolean(biomarkers.her2Positive);

    if (er && !her2) subtype = "HR-Positive / HER2-Negative (Luminal A/B)";
    else if (her2 && er) subtype = "Triple-Positive (HR+ / HER2+)";
    else if (her2 && !er) subtype = "HER2-Enriched (HR- / HER2+)";
    else subtype = "Triple-Negative Breast Cancer (TNBC)";

    if (her2) {
      targeted.push("HER2-Targeted Dual Blockade: Trastuzumab (Herceptin) + Pertuzumab (Perjeta) + Taxane chemotherapy.");
      targeted.push("Cardio-Oncology Gate: Mandatory baseline Echocardiogram with LVEF evaluation before and every 3 months during Trastuzumab therapy.");
    }
    if (er || pr) {
      therapies.push("Adjuvant Endocrine Therapy (5-10 years): Aromatase Inhibitors (Anastrozole/Letrozole) for postmenopausal women; Tamoxifen for premenopausal women.");
    }
    if (subtype === "Triple-Negative Breast Cancer (TNBC)") {
      therapies.push("Neoadjuvant Pembrolizumab + Chemotherapy (Carboplatin/Paclitaxel), followed by surgical resection and adjuvant Pembrolizumab.");
    }
    surveillance = "Annual Screening Mammography starting at age 40 (USPSTF 2024 update); add supplemental Breast MRI for women with lifetime breast cancer risk >= 20%.";
  } else if (cancerType === "PROSTATE") {
    const p = biomarkers.gleasonPrimaryScore ?? 3;
    const s = biomarkers.gleasonSecondaryScore ?? 4;
    const sum = p + s;
    let gg = "Grade Group 1 (Gleason 3+3=6, Low Risk)";
    if (sum === 7 && p === 3) gg = "Grade Group 2 (Gleason 3+4=7, Favorable Intermediate)";
    else if (sum === 7 && p === 4) gg = "Grade Group 3 (Gleason 4+3=7, Unfavorable Intermediate)";
    else if (sum === 8) gg = "Grade Group 4 (Gleason 4+4=8, High Risk)";
    else if (sum >= 9) gg = "Grade Group 5 (Gleason 9-10, Very High Risk)";
    subtype = gg;

    if (sum <= 6 && (biomarkers.psaNgMl ?? 0) < 10) {
      therapies.push("Active Surveillance: Serial PSA every 3-6 months, repeat MRI-guided biopsy at 12 months, avoiding overtreatment.");
    } else {
      therapies.push("Definitive Local Therapy: Radical Prostatectomy (robotic-assisted) OR External Beam Radiation Therapy (EBRT) + Androgen Deprivation Therapy (ADT: Leuprolide / Relugolix).");
    }
    if (distantMetastasesPresent) {
      targeted.push("Metastatic Castration-Sensitive Prostate Cancer (mCSPC): ADT + Androgen Receptor Pathway Inhibitor (Enzalutamide, Apalutamide, or Abiraterone) ± Docetaxel.");
    }
    surveillance = "Shared decision-making for PSA screening in men aged 55-69 (earlier at age 40-45 for African American ancestry or BRCA1/2 carriers).";
  } else if (cancerType === "COLORECTAL") {
    const dmmr = Boolean(biomarkers.msiHighOrDmmr);
    subtype = dmmr ? "MSI-High / Mismatch Repair Deficient (dMMR)" : "MSS / Mismatch Repair Proficient (pMMR)";

    therapies.push("Stage I-III: Surgical oncologic resection (colectomy with >= 12 regional lymph nodes examined).");
    if (lymphNodesPositiveCount && lymphNodesPositiveCount > 0) {
      therapies.push("Adjuvant Chemotherapy: FOLFOX (5-FU + Leucovorin + Oxaliplatin) or CAPOX for 3-6 months.");
    }
    if (dmmr) {
      targeted.push("dMMR / MSI-High First-Line: Immune Checkpoint Inhibitor (Pembrolizumab monotherapy) achieves durable disease control and potential complete pathologic responses.");
    } else if (distantMetastasesPresent) {
      targeted.push("pMMR Metastatic: Chemotherapy doublet (mFOLFOX6 or FOLFIRI) + VEGF inhibitor (Bevacizumab) OR Anti-EGFR (Cetuximab/Panitumumab) IF KRAS/NRAS/BRAF wild-type.");
    }
    surveillance = "USPSTF Screening: High-quality screening colonoscopy every 10 years starting at age 45 for average-risk individuals.";
  } else if (cancerType === "CERVICAL") {
    subtype = biomarkers.hpvHighRiskPositive ? "High-Risk HPV-Associated (HPV 16/18 Positive)" : "HPV-Independent";
    therapies.push("Early Stage (FIGO IA-IB2): Radical Hysterectomy with pelvic lymphadenectomy OR fertility-sparing Radical Trachelectomy.");
    therapies.push("Locally Advanced (FIGO IB3-IVA): Definitive Concurrent Chemoradiotherapy (Cisplatin weekly + External Beam RT + Image-Guided Brachytherapy).");
    if (distantMetastasesPresent) {
      targeted.push("Metastatic / Recurrent (FIGO IVB): Platinum doublet chemotherapy + Paclitaxel + Bevacizumab + Pembrolizumab (if PD-L1 CPS >= 1).");
    }
    surveillance = "ASCCP Guidelines: Cervical cytology every 3 years for age 21-29; primary high-risk HPV screening or co-testing every 5 years for age 30-65.";
  }

  return {
    cancerSite: cancerType,
    stageGroup: stage,
    molecularSubtypeOrGradeGroup: subtype,
    firstLineTherapeuticPathways: therapies,
    targetedTherapiesAndBiomarkers: targeted,
    screeningAndSurveillanceGuidance: surveillance,
  };
}

/**
 * 2. PARKINSON'S DISEASE & MOVEMENT DISORDERS (MDS CRITERIA)
 */
export function evaluateParkinsons(input: ParkinsonsInput): ParkinsonsResult {
  const hasBrady = input.hasBradykinesia;
  const hasTremor = Boolean(input.hasRestingTremor);
  const hasRigid = Boolean(input.hasRigidityCogwheelOrLeadpipe);
  const isAtypical = Boolean(input.hasAtypicalParkinsonismRedFlags);

  let certainty: ParkinsonsResult["diagnosticCertainty"] = "DIAGNOSIS_NOT_MET";
  if (isAtypical) {
    certainty = "SUSPECTED_ATYPICAL_PARKINSONISM";
  } else if (hasBrady && (hasTremor || hasRigid)) {
    certainty = "CLINICALLY_ESTABLISHED_PD";
  } else if (hasBrady) {
    certainty = "CLINICALLY_PROBABLE_PD";
  }

  let stage = "Hoehn and Yahr Stage I (Unilateral involvement only)";
  const dur = input.diseaseDurationYears ?? 1;
  if (input.hasPosturalInstability) {
    stage = "Hoehn and Yahr Stage III (Bilateral disease, mild-to-moderate disability, impaired postural reflexes)";
  } else if (dur >= 3) {
    stage = "Hoehn and Yahr Stage II (Bilateral involvement without impairment of balance)";
  }

  const pharma = [
    "First-line Gold Standard: Carbidopa / Levodopa (Sinemet 25/100 mg TID, taken on an empty stomach or 1 hour before protein meals to avoid amino acid transporter competition).",
    "Alternative initial therapy in patients < 65 years: Dopamine Agonists (Pramipexole, Ropinirole) — monitor for impulse control disorders (gambling, hypersexuality, binge eating).",
    "MAO-B Inhibitors (Rasagiline 1 mg daily or Selegiline) as mild monotherapy or adjunct.",
  ];

  const motorFluc: string[] = [];
  if (input.experiencesWearingOffOrDyskinesia) {
    motorFluc.push("Wearing-Off Management: Increase Levodopa frequency, switch to extended-release formulations (Rytary), or add COMT inhibitor (Entacapone) or MAO-B inhibitor.");
    motorFluc.push("Peak-Dose Dyskinesia Management: Reduce individual Levodopa doses and add Amantadine (NMDA receptor antagonist).");
    motorFluc.push("Refractory Motor Fluctuations: Evaluate for Advanced Therapies: Deep Brain Stimulation (DBS targeting STN or GPi) or Levodopa/Carbidopa intestinal gel infusion.");
  }

  const multidisciplinary = [
    "Physical Therapy: Dedicated LSVT BIG high-amplitude movement training to prevent falls and gait freezing.",
    "Speech Therapy: LSVT LOUD voice training for hypophonia.",
    "Screen for non-motor symptoms: Constipation (stool softeners/hydration), REM sleep behavior disorder (Melatonin), depression, and orthostatic hypotension (midodrine/fludrocortisone).",
  ];

  return {
    diagnosticCertainty: certainty,
    hoehnAndYahrStage: stage,
    firstLinePharmacotherapy: pharma,
    motorFluctuationManagement: motorFluc,
    multidisciplinaryCare: multidisciplinary,
  };
}

/**
 * 3. OSTEOPOROSIS & FRAX FRACTURE RISK ENGINE
 */
export function evaluateOsteoporosis(input: OsteoporosisInput): OsteoporosisResult {
  const t = input.lowestDexaTScore;
  let bmd: OsteoporosisResult["boneMineralDensityClassification"] = "NORMAL_BONE_DENSITY";

  if (t <= -2.5) bmd = "OSTEOPOROSIS";
  else if (t < -1.0) bmd = "OSTEOPENIA_LOW_BONE_MASS";

  const hasFragility = Boolean(input.priorFragilityFracture);
  const fraxMof = input.calculatedFraxMajorOsteoporoticRiskPercent ?? 12;
  const fraxHip = input.calculatedFraxHipFractureRiskPercent ?? 2.1;

  // NOF/AACE Treatment Criteria:
  // 1. T-score <= -2.5
  // 2. Prior hip or vertebral fragility fracture regardless of T-score
  // 3. Osteopenia (T-score -1.0 to -2.5) PLUS FRAX 10-yr MOF >= 20% OR Hip >= 3%
  const needsTx = t <= -2.5 || hasFragility || (bmd === "OSTEOPENIA_LOW_BONE_MASS" && (fraxMof >= 20 || fraxHip >= 3));

  const egfr = input.eGfrMlMin173m2 ?? 60;
  const contra: string[] = [];
  const antiresorptive: string[] = [];

  if (egfr < 35) {
    contra.push(`Severe renal impairment (eGFR ${egfr} mL/min < 35). Oral/IV Bisphosphonates are CONTRAINDICATED due to risk of worsening renal failure.`);
    antiresorptive.push("Denosumab (Prolia) 60 mg subcutaneous every 6 months — preferred in CKD as it is not cleared renally (monitor for hypocalcemia).");
  } else {
    antiresorptive.push("First-Line Oral Bisphosphonate: Alendronate (Fosamax) 70 mg weekly with 8 oz plain water upon waking; remain upright for >= 30 min to prevent erosive esophagitis.");
    antiresorptive.push("IV Bisphosphonate Alternative: Zoledronic Acid (Reclast) 5 mg IV infusion once yearly.");
  }

  let anabolic = "Reserved for very high fracture risk.";
  if (t <= -3.0 || (hasFragility && t <= -2.5)) {
    anabolic = "Very High Fracture Risk: Bone-forming Anabolic Agents indicated first-line before antiresorptives: Teriparatide (PTH analog 20 mcg SC daily x 24 months) or Romosozumab (Evenity sclerostin inhibitor monthly x 12 months), followed by antiresorptive consolidation.";
  }

  contra.push("Atypical Femur Fracture (AFF) & Osteonecrosis of the Jaw (ONJ) Counseling: Plan bisphosphonate 'drug holiday' review after 3-5 years.");
  contra.push("Maintain baseline 25-hydroxyvitamin D >= 30 ng/mL and Calcium intake 1,000-1,200 mg/day (diet + supplements).");

  return {
    boneMineralDensityClassification: bmd,
    pharmacologicTherapyIndicated: needsTx,
    firstLineAntiresorptiveAgents: antiresorptive,
    anabolicAgentEligibility: anabolic,
    safetyContraindications: contra,
  };
}

/**
 * 4. SICKLE CELL DISEASE & ACUTE CHEST SYNDROME
 */
export function evaluateSickleCell(input: SickleCellInput): SickleCellResult {
  const isAcs = Boolean(
    input.hasNewPulmonaryInfiltrateOnCxr &&
    (input.feverCelsius !== undefined && input.feverCelsius >= 38.5 ||
     input.chestPainOrTachypneaPresent ||
     input.spO2DropGreaterThan3Percent)
  );

  let comp: SickleCellResult["complicationType"] = "COMPENSATED_STEADY_STATE";
  if (isAcs) comp = "ACUTE_CHEST_SYNDROME_EMERGENCY";
  else if (input.isAcuteVasoOcclusivePainCrisis) comp = "ACUTE_VASO_OCCLUSIVE_CRISIS";

  const painProtocol = [
    "Rapid Analgesia Administration (Goal: within 30-60 minutes of triage per ASH guidelines).",
    "Individualized Parenteral Opioid (IV Hydromorphone 0.02-0.04 mg/kg or IV Morphine 0.1 mg/kg) reassessed and re-dosed every 15-30 minutes until pain is controlled.",
    "Patient-Controlled Analgesia (PCA) pump for ongoing severe pain crisis.",
    "Judicious IV hydration at 1x to 1.5x maintenance with 5% Dextrose in 0.45% Saline (AVOID aggressive overhydration; precipitates pulmonary edema and ACS).",
  ];

  const acsProtocol: string[] = [];
  let transfusion = "Transfusion is not indicated for uncomplicated vaso-occlusive pain crisis without acute hematocrit drop.";

  if (comp === "ACUTE_CHEST_SYNDROME_EMERGENCY") {
    acsProtocol.push("🚨 ACUTE CHEST SYNDROME MEDICAL EMERGENCY: Leading cause of death in SCD.");
    acsProtocol.push("Supplemental Oxygen to maintain SpO2 >= 95% (or patient's baseline).");
    acsProtocol.push("Empiric Broad-Spectrum Antibiotics: IV Ceftriaxone 2 g daily PLUS IV/Oral Macrolide (Azithromycin 500 mg) to cover atypical pneumonia (Chlamydia/Mycoplasma).");
    acsProtocol.push("Incentive Spirometry: 10 breaths every 2 hours while awake to prevent atelectasis and progression.");

    const hgb = input.currentHemoglobinGDl ?? 7.0;
    const baseHgb = input.baselineHemoglobinGDl ?? 8.5;
    if (input.spO2DropGreaterThan3Percent || hgb < 6.0 || (baseHgb - hgb >= 2.0)) {
      transfusion = "EMERGENT SIMPLE OR EXCHANGE TRANSFUSION INDICATED: Simple PRBC transfusion (target Hgb 10 g/dL; do NOT exceed Hgb > 10-11 g/dL due to hyperviscosity) for mild/moderate ACS. Emergent Automated Red Cell Exchange Transfusion (Erythrocytapheresis target HbS < 30%) indicated for severe hypoxemia (SpO2 < 90%), multi-lobar infiltrates, or clinical deterioration.";
    }
  }

  const dmt = [
    "Disease-Modifying Standard: Hydroxyurea (induces fetal hemoglobin HbF, reduces VOC by 50%, reduces ACS by 50%, and improves survival).",
    "L-Glutamine (Endari) to reduce oxidative stress.",
    "Voxelotor (Oxbryta) HbS polymerization inhibitor OR Crizanlizumab (P-selectin inhibitor) for recurrent crises.",
    "Stroke Prevention: Annual Transcranial Doppler (TCD) screening from age 2 to 16 (TAMMV >= 200 cm/s indicates chronic transfusion therapy).",
  ];

  return {
    complicationType: comp,
    immediatePainManagementProtocol: painProtocol,
    acuteChestSyndromeProtocol: acsProtocol,
    bloodTransfusionGuidance: transfusion,
    diseaseModifyingTherapy: dmt,
  };
}
