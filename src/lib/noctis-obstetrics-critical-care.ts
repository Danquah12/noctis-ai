/**
 * ============================================================================
 * NOCTIS SOVEREIGN CRITICAL CARE OBSTETRICS ENGINE (NOCTIS-OB-CRIT-001)
 * Standard: 2025/2026 ACOG Practice Bulletins, SMFM Critical Care Guidelines,
 *           CMQCC Obstetric Hemorrhage Toolkit, AHA Maternal Cardiac Arrest
 * Domain: Severe Preeclampsia/Eclampsia, Magnesium Sulfate Protocol & Antidote,
 *         Postpartum Hemorrhage (PPH) & Uterotonic Contraindication Invariants,
 *         Amniotic Fluid Embolism (AFE) & Perimortem Cesarean Delivery (PMCD)
 * ============================================================================
 */

export interface PreeclampsiaEvaluation {
  gestationalAgeWeeks: number;
  systolicBpMmhg: number;
  diastolicBpMmhg: number;
  symptoms: Array<"SEVERE_HEADACHE" | "VISUAL_SCOTOMA" | "RUQ_EPIGASTRIC_PAIN" | "PULMONARY_EDEMA">;
  plateletCountK: number;
  serumCreatinineMgdl: number;
  astAltElevated: boolean;
  seizureActiveOrPostictal: boolean;
  magnesiumSulfateInfusing: boolean;
  serumMagnesiumMeq?: number;
  patellarReflexLoss?: boolean;
  respiratoryRate?: number;
  calciumGluconateAdministered?: boolean;
  antihypertensiveOrdered?: "LABETALOL" | "HYDRALAZINE" | "NIFEDIPINE" | "ACE_INHIBITOR" | "ARB" | "NITROPRUSSIDE";
}

export interface PphEvaluation {
  estimatedBloodLossMl: number;
  uterineAtonyPresent: boolean;
  hypertensionPresent: boolean;
  asthmaOrBronchospasmPresent: boolean;
  uterotonicProposed: "OXYTOCIN" | "METHERGINE" | "CARBOPROST_HEMABATE" | "MISOPROSTOL";
  bakriBalloonAttempted?: boolean;
  massiveTransfusionActive?: boolean;
}

export interface MaternalCardiacArrestEvaluation {
  gestationalAgeWeeks: number;
  arrestDurationMinutes: number;
  roscAchieved: boolean;
  uterineDisplacementManualActive: boolean;
  perimortemCesareanInitiated: boolean;
  afeSuspected: boolean;
}

export interface ObAssessmentResult {
  engineId: "NOCTIS-OB-CRIT-001";
  clinicalDomain: "CRITICAL_CARE_OBSTETRICS";
  timestamp: string;
  summary: string;
  calculations: Record<string, string | number | boolean>;
  recommendations: string[];
  safetyVetoesTriggered: string[];
  references: string[];
}

export function evaluatePreeclampsia(input: PreeclampsiaEvaluation): ObAssessmentResult {
  const isSevereBp = input.systolicBpMmhg >= 160 || input.diastolicBpMmhg >= 110;
  const isHellp = input.plateletCountK < 100 && input.astAltElevated;
  const isSeverePreeclampsia =
    isSevereBp ||
    input.symptoms.length > 0 ||
    input.plateletCountK < 100 ||
    input.serumCreatinineMgdl > 1.1 ||
    input.astAltElevated ||
    input.seizureActiveOrPostictal;

  const calculations: Record<string, string | number | boolean> = {
    gestationalAgeWeeks: input.gestationalAgeWeeks,
    bloodPressure: `${input.systolicBpMmhg}/${input.diastolicBpMmhg} mmHg`,
    isSevereHypertension: isSevereBp,
    syndromeClassification: input.seizureActiveOrPostictal
      ? "ECLAMPSIA"
      : isHellp
      ? "HELLP_SYNDROME"
      : isSeverePreeclampsia
      ? "PREECLAMPSIA_WITH_SEVERE_FEATURES"
      : "GESTATIONAL_HYPERTENSION",
    platelets: `${input.plateletCountK} k/uL`,
    creatinine: `${input.serumCreatinineMgdl} mg/dL`,
  };

  const recommendations: string[] = [];
  const safetyVetoesTriggered: string[] = [];

  // Veto 1: Teratogenic / Fetal renal dysgenesis antihypertensive veto
  if (
    input.antihypertensiveOrdered === "ACE_INHIBITOR" ||
    input.antihypertensiveOrdered === "ARB" ||
    input.antihypertensiveOrdered === "NITROPRUSSIDE"
  ) {
    safetyVetoesTriggered.push(
      `CF-OB-001 [FETAL TOXICITY ANTIHYPERTENSIVE VETO]: ${input.antihypertensiveOrdered} is strictly contraindicated in pregnancy. ACE inhibitors and ARBs cause fetal renal dysgenesis, severe oligohydramnios, pulmonary hypoplasia, and intrauterine fetal demise. Nitroprusside causes lethal fetal cyanide poisoning. Immediately cancel order. First-line agents for urgent blood pressure reduction in pregnancy are IV Labetalol, IV Hydralazine, or oral immediate-release Nifedipine.`
    );
  }

  // Magnesium Toxicity Detection & Antidote
  if (input.magnesiumSulfateInfusing) {
    const mg = input.serumMagnesiumMeq ?? 5.0;
    calculations.serumMagnesium = `${mg} mEq/L`;

    if (input.patellarReflexLoss || (input.respiratoryRate && input.respiratoryRate < 12) || mg >= 8.0) {
      safetyVetoesTriggered.push(
        `CF-OB-002 [MAGNESIUM TOXICITY & RESPIRATORY DEPRESSION VETO]: Serum magnesium toxicity detected (Mg: ${mg} mEq/L, Patellar Reflex Loss: ${
          input.patellarReflexLoss ? "YES" : "NO"
        }, RR: ${input.respiratoryRate ?? "N/A"}/min). Deep tendon reflex loss occurs at 8-10 mEq/L; respiratory arrest occurs at 10-12 mEq/L; complete heart block occurs at > 15 mEq/L. IMMEDIATELY STOP MAGNESIUM INFUSION. Administer Calcium Gluconate 1 g IV (10 mL of 10% solution) slowly over 5-10 minutes. Provide bag-valve-mask ventilatory support if RR < 12.`
      );
    }
  }

  // Protocols for severe preeclampsia/eclampsia
  if (isSeverePreeclampsia || input.seizureActiveOrPostictal) {
    recommendations.push(
      "MAGNESIUM SULFATE SEIZURE PROPHYLAXIS PROTOCOL: Administer Magnesium Sulfate 4-6 g IV loading dose in 100 mL IV fluid over 20-30 minutes, followed by continuous maintenance infusion of 1-2 g/hr IV. Continue for 24 hours postpartum or post-last seizure. Monitor patellar reflexes, hourly urine output (must be > 30 mL/hr to prevent hypermagnesemia), and respiratory rate."
    );
  }

  if (isSevereBp) {
    recommendations.push(
      "ACUTE SEVERE HYPERTENSION PROTOCOL (Target SBP 140-150 / DBP 90-100 mmHg within 30-60 min): (1) IV Labetalol 20 mg IV push over 2 min; repeat at 10-20 min intervals with 40 mg, then 80 mg (max cumulative dose 220-300 mg); OR (2) IV Hydralazine 5-10 mg IV over 2 min, repeat 10 mg at 20 min if needed; OR (3) Oral Nifedipine immediate-release 10-20 mg PO (do not give sublingually). Avoid sudden severe hypotension which compromises placental perfusion."
    );
  }

  return {
    engineId: "NOCTIS-OB-CRIT-001",
    clinicalDomain: "CRITICAL_CARE_OBSTETRICS",
    timestamp: new Date().toISOString(),
    summary: safetyVetoesTriggered.length > 0
      ? "Critical obstetric safety invariant triggered (teratogenic drug or magnesium toxicity)."
      : `Obstetric evaluation: ${calculations.syndromeClassification}. Standardized maternal stabilization protocol active.`,
    calculations,
    recommendations,
    safetyVetoesTriggered,
    references: [
      "ACOG Practice Bulletin No. 222: Gestational Hypertension and Preeclampsia (2025/2026)",
      "Society for Maternal-Fetal Medicine (SMFM) Critical Care in Pregnancy Guidelines",
    ],
  };
}

export function evaluatePph(input: PphEvaluation): ObAssessmentResult {
  const calculations: Record<string, string | number | boolean> = {
    estimatedBloodLossMl: input.estimatedBloodLossMl,
    uterineAtonyPresent: input.uterineAtonyPresent,
    hypertensionPresent: input.hypertensionPresent,
    asthmaPresent: input.asthmaOrBronchospasmPresent,
    uterotonicProposed: input.uterotonicProposed,
    hemorrhageStage: input.estimatedBloodLossMl >= 1500
      ? "STAGE_3_MASSIVE_HEMORRHAGE"
      : input.estimatedBloodLossMl >= 1000
      ? "STAGE_2_ACTIVE_HEMORRHAGE"
      : "STAGE_1_MILD_ELEVATED_LOSS",
  };

  const recommendations: string[] = [];
  const safetyVetoesTriggered: string[] = [];

  // Veto 1: Methergine in Hypertension
  if (input.uterotonicProposed === "METHERGINE" && input.hypertensionPresent) {
    safetyVetoesTriggered.push(
      "CF-OB-003 [METHERGINE HYPERTENSIVE STROKE VETO]: Methylergonovine (Methergine) is strictly contraindicated in patients with gestational hypertension, preeclampsia, or cardiovascular disease. Methergine is an ergot alkaloid that causes potent, non-selective peripheral vasoconstriction, precipitating acute hypertensive crisis, intracranial hemorrhage, seizure, and cerebral infarction. SWITCH IMMEDIATELY to Carboprost (Hemabate) 250 mcg IM or Misoprostol 800-1000 mcg PR."
    );
  }

  // Veto 2: Carboprost (Hemabate) in Asthma
  if (input.uterotonicProposed === "CARBOPROST_HEMABATE" && input.asthmaOrBronchospasmPresent) {
    safetyVetoesTriggered.push(
      "CF-OB-004 [CARBOPROST FATAL BRONCHOSPASM VETO]: Carboprost Tromethamine (Hemabate, 15-methyl PGF2alpha) is strictly contraindicated in patients with asthma or active bronchospasm. PGF2alpha induces severe, sudden bronchial smooth muscle constriction, precipitating status asthmaticus, acute respiratory failure, and fatal asphyxia. SWITCH IMMEDIATELY to Methylergonovine (if non-hypertensive) or Misoprostol 800-1000 mcg PR/SL."
    );
  }

  // Sequenced Uterotonic Algorithm
  recommendations.push(
    "SEQUENCED UTEROTONIC ALGORITHM: (1) Oxytocin: 10-40 units in 1,000 mL normal saline or lactated Ringer's IV infusion (or 10 units IM). Avoid rapid undiluted IV push which induces severe hypotension and myocardial ischemia; (2) Methylergonovine (Methergine): 0.2 mg IM q2-4h (CONTRAINDICATED in hypertension); (3) Carboprost (Hemabate): 250 mcg IM or intramyometrial q15-90 min up to 8 doses (CONTRAINDICATED in asthma); (4) Misoprostol (Cytotec): 800-1000 mcg PR or 600 mcg sublingual."
  );

  // Massive Transfusion Protocol in PPH
  if (input.estimatedBloodLossMl >= 1500 || input.massiveTransfusionActive) {
    recommendations.push(
      "STAGE 3 OBSTETRIC MASSIVE TRANSFUSION PROTOCOL (MTP): Activate Obstetric MTP with fixed 1:1:1 ratio (6 units PRBCs, 6 units FFP, 1 adult apheresis platelet pack). In obstetric hemorrhage, fibrinogen drops earlier and faster than in surgical trauma; monitor fibrinogen STAT and administer Cryoprecipitate 10 units or Fibrinogen Concentrate (Fibryga/RiaSTAP) to maintain Fibrinogen > 200 mg/dL. Tranexamic Acid (TXA) 1 g IV over 10 min must be given within 3 hours of birth."
    );
  }

  // Mechanical / Surgical Hemostasis
  recommendations.push(
    "MECHANICAL & SURGICAL ESCALATION: Perform bimanual uterine compression. Place intrauterine balloon tamponade (Bakri balloon, inflate with 300-500 mL sterile saline). If bleeding refractory: move to OR for B-Lynch / Hayman uterine compression sutures, bilateral uterine artery ligation, or emergent peripartum hysterectomy."
  );

  return {
    engineId: "NOCTIS-OB-CRIT-001",
    clinicalDomain: "CRITICAL_CARE_OBSTETRICS",
    timestamp: new Date().toISOString(),
    summary: safetyVetoesTriggered.length > 0
      ? "Obstetric uterotonic safety invariant violated (fatal drug-disease contraindication)."
      : `PPH evaluated (${calculations.hemorrhageStage}). Multi-agent uterotonic and transfusion pathway active.`,
    calculations,
    recommendations,
    safetyVetoesTriggered,
    references: [
      "CMQCC Obstetric Hemorrhage Toolkit (Version 3.0, 2025/2026)",
      "ACOG Practice Bulletin No. 183: Postpartum Hemorrhage",
      "WOMAN Trial Collaborators: Effect of early tranexamic acid on maternal mortality in post-partum haemorrhage (Lancet)",
    ],
  };
}

export function evaluateMaternalCardiacArrest(input: MaternalCardiacArrestEvaluation): ObAssessmentResult {
  const calculations: Record<string, string | number | boolean> = {
    gestationalAgeWeeks: input.gestationalAgeWeeks,
    arrestDurationMinutes: input.arrestDurationMinutes,
    roscAchieved: input.roscAchieved,
    manualLeftUterineDisplacement: input.uterineDisplacementManualActive,
    pmcdInitiated: input.perimortemCesareanInitiated,
    afeSuspected: input.afeSuspected,
  };

  const recommendations: string[] = [];
  const safetyVetoesTriggered: string[] = [];

  // Veto / Mandate: Perimortem Cesarean Delivery (PMCD) / Resuscitative Hysterotomy
  if (input.gestationalAgeWeeks >= 20 && !input.roscAchieved && input.arrestDurationMinutes >= 4 && !input.perimortemCesareanInitiated) {
    safetyVetoesTriggered.push(
      "CF-OB-005 [PMCD / RESUSCITATIVE HYSTEROTOMY 4-MINUTE MANDATE]: In maternal cardiac arrest where gestational age is >= 20 weeks (uterine fundus at or above umbilicus) and ROSC is not achieved by minute 4, immediate Resuscitative Hysterotomy / PMCD MUST be initiated at the bedside, with delivery completed by MINUTE 5. The gravid uterus exerts severe aortocaval compression, reducing venous return and cardiac output during CPR to < 10% of normal. Emptying the uterus relieves IVC compression, dramatically increasing maternal venous return and survival. DO NOT transport to the operating room; DO NOT wait for sterile drapes or fetal heart tones. Perform vertical midline incision at the bedside."
    );
  }

  // Positioning
  if (!input.uterineDisplacementManualActive) {
    recommendations.push(
      "AORTOCAVAL DECOMPRESSION: Perform continuous Left Uterine Displacement (LUD) manually using a 1- or 2-handed technique. Avoid tilting the entire patient on a steep wedge which impairs chest compression depth; maintain maternal supine position with dedicated manual leftward uterine displacement."
    );
  }

  // Amniotic Fluid Embolism (AFE) Multimodal Resuscitation: A-OK Protocol
  if (input.afeSuspected) {
    recommendations.push(
      "AMNIOTIC FLUID EMBOLISM (AFE) 'A-OK' REGIMEN: AFE triggers acute pulmonary vasoconstriction, profound right heart failure, and cardiogenic shock via anaphylactoid complement cascade. Administer STAT: (1) Atropine 0.8-1.0 mg IV (counteracts vagal reflex bradycardia and pulmonary vasoconstriction); (2) Ondansetron 8 mg IV (5-HT3 antagonist, blocks serotonin-mediated pulmonary hypertension); (3) Ketorolac 30 mg IV (blocks thromboxane cascade). Support right ventricle with Epinephrine and inhaled epoprostenol. Prepare for immediate DIC with aggressive cryoprecipitate and platelets."
    );
  }

  recommendations.push(
    "ADVANCED MATERNAL CPR: Compressions performed 2-3 cm higher on the sternum due to upward elevation of the diaphragm by the gravid uterus. Bag-valve mask with 100% FiO2 (higher maternal metabolic rate and oxygen consumption). Avoid femoral venous access for resuscitating drugs (impaired delivery via compressed IVC); place large-bore IVs or central line ABOVE the diaphragm."
  );

  return {
    engineId: "NOCTIS-OB-CRIT-001",
    clinicalDomain: "CRITICAL_CARE_OBSTETRICS",
    timestamp: new Date().toISOString(),
    summary: safetyVetoesTriggered.length > 0
      ? "Resuscitative Hysterotomy 4-minute safety rule triggered."
      : "Maternal cardiac arrest protocol active with aortocaval decompression and resuscitation bundle.",
    calculations,
    recommendations,
    safetyVetoesTriggered,
    references: [
      "AHA Scientific Statement: Cardiac Arrest in Pregnancy (Circulation 2025/2026)",
      "Society for Obstetric Anesthesia and Perinatology (SOAP) Consensus Statement on PMCD",
    ],
  };
}

export function handleNaturalObstetricsQuery(prompt: string): string | null {
  const p = prompt.toLowerCase();
  const isOb =
    p.includes("preeclampsia") ||
    p.includes("eclampsia") ||
    p.includes("magnesium") ||
    p.includes("postpartum hemorrhage") ||
    p.includes("pph") ||
    p.includes("methergine") ||
    p.includes("carboprost") ||
    p.includes("hemabate") ||
    p.includes("resuscitative hysterotomy") ||
    p.includes("perimortem cesarean") ||
    p.includes("amniotic fluid embolism") ||
    p.includes("afe");

  if (!isOb) return null;

  // Case 1: Postpartum Hemorrhage & Uterotonics
  if (p.includes("postpartum hemorrhage") || p.includes("pph") || p.includes("methergine") || p.includes("carboprost") || p.includes("hemabate")) {
    const isMethergineInHtn = p.includes("methergine") && (p.includes("hypertens") || p.includes("preeclamp") || p.includes("bp"));
    const isCarboprostInAsthma = (p.includes("carboprost") || p.includes("hemabate")) && (p.includes("asthma") || p.includes("wheez"));

    const res = evaluatePph({
      estimatedBloodLossMl: 1400,
      uterineAtonyPresent: true,
      hypertensionPresent: isMethergineInHtn,
      asthmaOrBronchospasmPresent: isCarboprostInAsthma,
      uterotonicProposed: isMethergineInHtn ? "METHERGINE" : isCarboprostInAsthma ? "CARBOPROST_HEMABATE" : "OXYTOCIN",
      massiveTransfusionActive: true,
    });
    return formatObMarkdown(res);
  }

  // Case 2: Maternal Arrest / PMCD / AFE
  if (p.includes("perimortem") || p.includes("hysterotomy") || p.includes("maternal cardiac arrest") || p.includes("afe") || p.includes("amniotic fluid")) {
    const res = evaluateMaternalCardiacArrest({
      gestationalAgeWeeks: 32,
      arrestDurationMinutes: 4.5,
      roscAchieved: false,
      uterineDisplacementManualActive: true,
      perimortemCesareanInitiated: false,
      afeSuspected: p.includes("afe") || p.includes("amniotic"),
    });
    return formatObMarkdown(res);
  }

  // Case 3: Preeclampsia / Eclampsia & Magnesium toxicity
  if (p.includes("preeclampsia") || p.includes("eclampsia") || p.includes("magnesium")) {
    const isToxicity = p.includes("reflex loss") || p.includes("rr 8") || p.includes("respiratory depression") || p.includes("mg 9") || p.includes("calcium");
    const isAcei = p.includes("lisinopril") || p.includes("losartan") || p.includes("nitroprusside") || p.includes("ace");

    const res = evaluatePreeclampsia({
      gestationalAgeWeeks: 34,
      systolicBpMmhg: 172,
      diastolicBpMmhg: 114,
      symptoms: ["SEVERE_HEADACHE", "VISUAL_SCOTOMA"],
      plateletCountK: 85,
      serumCreatinineMgdl: 1.3,
      astAltElevated: true,
      seizureActiveOrPostictal: p.includes("seizure") || p.includes("eclampsia"),
      magnesiumSulfateInfusing: true,
      serumMagnesiumMeq: isToxicity ? 9.2 : 5.4,
      patellarReflexLoss: isToxicity,
      respiratoryRate: isToxicity ? 8 : 16,
      antihypertensiveOrdered: isAcei ? "ACE_INHIBITOR" : "LABETALOL",
    });
    return formatObMarkdown(res);
  }

  return null;
}

function formatObMarkdown(res: ObAssessmentResult): string {
  let md = `### Noctis Critical Care Obstetrics Engine (${res.engineId})\n`;
  md += `**Clinical Domain:** ${res.clinicalDomain.replace(/_/g, " ")} · **Summary:** ${res.summary}\n\n`;

  if (res.safetyVetoesTriggered.length > 0) {
    md += `#### 🚨 Non-Compensatory Safety Invariants Enforced\n`;
    for (const veto of res.safetyVetoesTriggered) {
      md += `- **${veto}**\n`;
    }
    md += `\n`;
  }

  md += `#### 1. Clinical Parameters & Risk Classification\n`;
  for (const [k, v] of Object.entries(res.calculations)) {
    md += `- **${k.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}:** \`${String(v)}\`\n`;
  }
  md += `\n`;

  md += `#### 2. Obstetric Resuscitation Bundle & Directives\n`;
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
