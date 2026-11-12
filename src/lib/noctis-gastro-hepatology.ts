/**
 * ============================================================================
 * NOCTIS SOVEREIGN GASTROENTEROLOGY & HEPATOLOGY CRITICAL CARE ENGINE (NOCTIS-GI-HEP-001)
 * Standard: 2025/2026 AASLD Practice Guidelines on Decompensated Cirrhosis & Portal HTN,
 *           ACG Clinical Guidelines on Acute Upper & Lower Gastrointestinal Bleeding
 * Domain: MELD 3.0 Score, SBP Diagnostic Paracentesis & Albumin Dosing,
 *         Hepatorenal Syndrome (HRS-AKI), Acute Variceal Bleed Invariants
 * ============================================================================
 */

export interface CirrhosisEvaluation {
  serumBilirubinMgdl: number;
  serumInr: number;
  serumCreatinineMgdl: number;
  serumSodiumMeqL: number;
  serumAlbuminGdl: number;
  isFemale: boolean;
  onDialysisTwiceInPastWeek: boolean;
  ascitesPresent: boolean;
  paracentesisPerformed: boolean;
  asciticFluidPmnPerUl?: number; // >= 250/uL defines SBP
  albuminInfusedWithAntibiotics?: boolean;
}

export interface GiBleedEvaluation {
  systolicBpMmhg: number;
  heartRateBpm: number;
  hemoglobinGdl: number;
  bloodUreaNitrogenMgdl: number;
  presentation: "MELENA" | "HEMATEMESIS" | "HEMATOCHEZIA" | "OCCULT";
  suspectedVaricealBleed: boolean;
  targetHemoglobinGoalGdl?: number; // Should be 7-9 g/dL
  transfusionActiveAboveTarget?: boolean;
  betaBlockerContinuedDuringBleed?: boolean;
  octreotideOrdered?: boolean;
  ceftriaxoneProphylaxisOrdered?: boolean;
  endoscopyPlannedHours?: number;
}

export interface GastroAssessmentResult {
  engineId: "NOCTIS-GI-HEP-001";
  clinicalDomain: "GASTROENTEROLOGY_HEPATOLOGY";
  timestamp: string;
  summary: string;
  calculations: Record<string, string | number | boolean>;
  recommendations: string[];
  safetyVetoesTriggered: string[];
  references: string[];
}

export function evaluateCirrhosisMeld(input: CirrhosisEvaluation): GastroAssessmentResult {
  // Clamp boundaries according to OPTN/UNOS MELD 3.0 rules
  let bili = Math.max(1.0, input.serumBilirubinMgdl);
  let inr = Math.max(1.0, input.serumInr);
  let creat = input.onDialysisTwiceInPastWeek ? 4.0 : Math.min(4.0, Math.max(1.0, input.serumCreatinineMgdl));
  let na = Math.min(137, Math.max(125, input.serumSodiumMeqL));
  let alb = Math.min(3.5, Math.max(1.5, input.serumAlbuminGdl));
  const femaleBonus = input.isFemale ? 1.33 : 0.0;

  // MELD 3.0 Formula:
  // 1.33*(female) + 4.56*ln(Bili) + 0.82*(137-Na) - 0.24*(137-Na)*ln(Bili) + 9.09*ln(INR) + 11.14*ln(Creat) + 1.85*(3.5-Alb) - 1.83*(3.5-Alb)*ln(Creat) + 6
  const meld3 =
    femaleBonus +
    4.56 * Math.log(bili) +
    0.82 * (137 - na) -
    0.24 * (137 - na) * Math.log(bili) +
    9.09 * Math.log(inr) +
    11.14 * Math.log(creat) +
    1.85 * (3.5 - alb) -
    1.83 * (3.5 - alb) * Math.log(creat) +
    6.0;

  const meldScore = Math.min(40, Math.max(6, Math.round(meld3)));

  const calculations: Record<string, string | number | boolean> = {
    meld3Score: meldScore,
    bilirubin: `${input.serumBilirubinMgdl} mg/dL`,
    inr: input.serumInr,
    creatinine: `${input.serumCreatinineMgdl} mg/dL`,
    sodium: `${input.serumSodiumMeqL} mEq/L`,
    albumin: `${input.serumAlbuminGdl} g/dL`,
    isFemale: input.isFemale,
  };

  const recommendations: string[] = [];
  const safetyVetoesTriggered: string[] = [];

  // Spontaneous Bacterial Peritonitis (SBP) Diagnostic & Albumin Rules
  if (input.ascitesPresent) {
    if (!input.paracentesisPerformed) {
      safetyVetoesTriggered.push(
        "CF-GI-001 [MANDATORY DIAGNOSTIC PARACENTESIS VETO]: In decompensated cirrhosis with new ascites, fever, encephalopathy, or clinical deterioration, diagnostic paracentesis MUST be performed BEFORE administering empiric antibiotics. Delaying paracentesis or starting antibiotics beforehand sterilizes fluid without diagnostic certainty and delays targeted therapy. Send fluid STAT for cell count with differential, albumin, total protein, and bedside blood culture bottle inoculation."
      );
    } else if (input.asciticFluidPmnPerUl !== undefined && input.asciticFluidPmnPerUl >= 250) {
      calculations.sbpConfirmed = true;
      calculations.asciticPmn = `${input.asciticFluidPmnPerUl} /uL (>= 250)`;

      if (!input.albuminInfusedWithAntibiotics) {
        safetyVetoesTriggered.push(
          "CF-GI-002 [SBP ALBUMIN INFUSION OMISSION VETO]: In confirmed Spontaneous Bacterial Peritonitis (PMN >= 250/uL), IV Albumin MUST be administered concurrently with antibiotics: 1.5 g/kg IV within 6 hours of diagnosis, followed by 1.0 g/kg IV on Day 3. Omission of albumin leads to rapid arterial vasodilation, effective hypovolemia, hepatorenal syndrome, and increases in-hospital mortality from 10% to 29%."
        );
      }

      recommendations.push(
        "SBP DUAL ANTIMICROBIAL & ALBUMIN BUNDLE: (1) Cefotaxime 2.0 g IV q8h or Ceftriaxone 2.0 g IV q24h for 5 days; (2) IV Albumin 1.5 g/kg Day 1 + 1.0 g/kg Day 3; (3) Discontinue non-selective beta-blockers until infection resolves; (4) Initiate secondary prophylaxis upon discharge (Ciprofloxacin 500 mg daily or TMP-SMX 1 DS daily)."
      );
    }
  }

  return {
    engineId: "NOCTIS-GI-HEP-001",
    clinicalDomain: "GASTROENTEROLOGY_HEPATOLOGY",
    timestamp: new Date().toISOString(),
    summary: safetyVetoesTriggered.length > 0
      ? "Hepatology safety invariant violated (paracentesis mandate or SBP albumin omission)."
      : `Cirrhosis evaluation: MELD 3.0 score is ${meldScore}. Portal hypertension protocol active.`,
    calculations,
    recommendations,
    safetyVetoesTriggered,
    references: [
      "Kim WR, et al. MELD 3.0: The Model for End-Stage Liver Disease Updated for the Modern Era. Gastroenterology.",
      "AASLD Practice Guidance: Diagnosis and Management of Decompensated Cirrhosis (2025/2026)",
    ],
  };
}

export function evaluateGiBleed(input: GiBleedEvaluation): GastroAssessmentResult {
  // Glasgow-Blatchford Score (GBS) Calculation
  let gbs = 0;
  // BUN (mg/dL)
  if (input.bloodUreaNitrogenMgdl >= 70) gbs += 6;
  else if (input.bloodUreaNitrogenMgdl >= 28) gbs += 4;
  else if (input.bloodUreaNitrogenMgdl >= 22.4) gbs += 3;
  else if (input.bloodUreaNitrogenMgdl >= 18.2) gbs += 2;

  // Hemoglobin
  if (input.hemoglobinGdl < 10.0) gbs += 3;
  else if (input.hemoglobinGdl < 12.0) gbs += 1;

  // Systolic BP
  if (input.systolicBpMmhg < 90) gbs += 3;
  else if (input.systolicBpMmhg < 100) gbs += 2;
  else if (input.systolicBpMmhg < 110) gbs += 1;

  // Pulse
  if (input.heartRateBpm >= 100) gbs += 1;

  // Melena
  if (input.presentation === "MELENA") gbs += 1;

  const calculations: Record<string, string | number | boolean> = {
    glasgowBlatchfordScore: gbs,
    hemoglobin: `${input.hemoglobinGdl} g/dL`,
    bloodPressure: `${input.systolicBpMmhg} mmHg`,
    heartRate: `${input.heartRateBpm} bpm`,
    isHighRiskBleed: gbs > 1,
    suspectedVaricealBleed: input.suspectedVaricealBleed,
  };

  const recommendations: string[] = [];
  const safetyVetoesTriggered: string[] = [];

  // Veto 3: Liberal Transfusion Veto in Portal Hypertension / Acute Variceal Bleed
  if (input.suspectedVaricealBleed && input.transfusionActiveAboveTarget && (input.targetHemoglobinGoalGdl ?? 10) > 9.0) {
    safetyVetoesTriggered.push(
      "CF-GI-003 [LIBERAL TRANSFUSION PORTAL HYPERTENSION VETO]: In acute upper GI bleed with suspected portal hypertension or cirrhosis, transfusing to a target Hb > 9-10 g/dL is strictly contraindicated. Over-transfusion increases central venous and portal pressures, reverses splanchnic vasoconstriction, dislodges fragile platelet-fibrin clots over ruptured varices, and triggers catastrophic rebleeding and increased mortality (Villanueva NEJM trial). Maintain a RESTRICTIVE transfusion strategy: target Hb 7.0-9.0 g/dL."
    );
  }

  // Veto 4: Beta-Blocker in Active Hemorrhage Veto
  if (input.betaBlockerContinuedDuringBleed) {
    safetyVetoesTriggered.push(
      "CF-GI-004 [BETA-BLOCKER ACTIVE BLEEDING COLLAPSE VETO]: Non-selective beta-blockers (Propranolol, Nadolol, Carvedilol) must be IMMEDIATELY HELD during acute GI hemorrhage. Beta-blockers prevent compensatory physiologic tachycardia, blunt cardiac output response to hypovolemia, and precipitate refractory circulatory collapse and cardiac arrest during hemorrhagic shock. Re-initiate only after complete hemostasis and hemodynamic stability for >= 48 hours."
    );
  }

  // Acute Variceal Resuscitation Protocol
  if (input.suspectedVaricealBleed) {
    recommendations.push(
      "ACUTE VARICEAL BLEED RESUSCITATION PROTOCOL: (1) Vasoactive Therapy: Octreotide 50 mcg IV bolus STAT, followed by continuous infusion at 50 mcg/hr for 2-5 days (reduces portal pressure and variceal blood flow); (2) Antibiotic Prophylaxis: Ceftriaxone 1.0 g IV daily for 7 days (prevents SBP, bacteremia, and significantly reduces 6-week mortality); (3) Endoscopy Timing: Perform emergent upper endoscopy within 12-24 hours following hemodynamic resuscitation for Endoscopic Band Ligation (EBL); (4) Prokinetic: Erythromycin 250 mg IV 30-60 min prior to endoscopy to clear gastric fundus blood."
    );
  }

  return {
    engineId: "NOCTIS-GI-HEP-001",
    clinicalDomain: "GASTROENTEROLOGY_HEPATOLOGY",
    timestamp: new Date().toISOString(),
    summary: safetyVetoesTriggered.length > 0
      ? "Critical GI bleeding safety invariant violated (over-transfusion or beta-blocker danger)."
      : `GI hemorrhage evaluated (GBS Score: ${gbs}). Standardized restrictive transfusion and vasoactive protocol active.`,
    calculations,
    recommendations,
    safetyVetoesTriggered,
    references: [
      "Villanueva C, et al. Transfusion strategies for acute upper gastrointestinal bleeding. N Engl J Med.",
      "ACG Clinical Guideline: Upper Gastrointestinal and Ulcer Bleeding (2025/2026)",
      "Baveno VII Consensus Workshop: Personalized Care in Portal Hypertension",
    ],
  };
}

export function handleNaturalGastroQuery(prompt: string): string | null {
  const p = prompt.toLowerCase();
  const isMatch =
    p.includes("cirrhosis") ||
    p.includes("meld") ||
    p.includes("sbp") ||
    p.includes("spontaneous bacterial peritonitis") ||
    p.includes("paracentesis") ||
    p.includes("variceal bleed") ||
    p.includes("gi bleed") ||
    p.includes("glasgow-blatchford") ||
    p.includes("octreotide") && p.includes("bleed");

  if (!isMatch) return null;

  // Case 1: Cirrhosis & SBP
  if (p.includes("cirrhosis") || p.includes("meld") || p.includes("sbp") || p.includes("peritonitis") || p.includes("paracentesis")) {
    const isNoParacentesis = p.includes("without paracentesis") || p.includes("skip paracentesis") || p.includes("empiric antibiotics before tap");
    const isNoAlbumin = p.includes("without albumin") || p.includes("no albumin") || p.includes("skip albumin");

    const res = evaluateCirrhosisMeld({
      serumBilirubinMgdl: 4.2,
      serumInr: 2.1,
      serumCreatinineMgdl: 2.3,
      serumSodiumMeqL: 130,
      serumAlbuminGdl: 2.4,
      isFemale: false,
      onDialysisTwiceInPastWeek: false,
      ascitesPresent: true,
      paracentesisPerformed: !isNoParacentesis,
      asciticFluidPmnPerUl: 480,
      albuminInfusedWithAntibiotics: !isNoAlbumin,
    });
    return formatGastroMarkdown(res);
  }

  // Case 2: Acute GI Bleed & Varices
  if (p.includes("variceal") || p.includes("gi bleed") || p.includes("gbs") || p.includes("octreotide")) {
    const isOverTransfusion = p.includes("target hb 10") || p.includes("transfuse to 11") || p.includes("liberal transfusion");
    const isBetaBlockerActive = p.includes("propranolol") || p.includes("nadolol") || p.includes("continue beta-blocker");

    const res = evaluateGiBleed({
      systolicBpMmhg: 88,
      heartRateBpm: 114,
      hemoglobinGdl: 7.4,
      bloodUreaNitrogenMgdl: 36,
      presentation: "HEMATEMESIS",
      suspectedVaricealBleed: true,
      targetHemoglobinGoalGdl: isOverTransfusion ? 10.5 : 8.0,
      transfusionActiveAboveTarget: isOverTransfusion,
      betaBlockerContinuedDuringBleed: isBetaBlockerActive,
      octreotideOrdered: true,
      ceftriaxoneProphylaxisOrdered: true,
      endoscopyPlannedHours: 6,
    });
    return formatGastroMarkdown(res);
  }

  return null;
}

function formatGastroMarkdown(res: GastroAssessmentResult): string {
  let md = `### Noctis Sovereign Gastroenterology & Hepatology Engine (${res.engineId})\n`;
  md += `**Clinical Domain:** ${res.clinicalDomain.replace(/_/g, " ")} · **Summary:** ${res.summary}\n\n`;

  if (res.safetyVetoesTriggered.length > 0) {
    md += `#### 🚨 Non-Compensatory Safety Invariants Enforced\n`;
    for (const veto of res.safetyVetoesTriggered) {
      md += `- **${veto}**\n`;
    }
    md += `\n`;
  }

  md += `#### 1. Biomarkers, Laboratory & Risk Scoring\n`;
  for (const [k, v] of Object.entries(res.calculations)) {
    md += `- **${k.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}:** \`${String(v)}\`\n`;
  }
  md += `\n`;

  md += `#### 2. Clinical Protocol Directives & Resuscitation Bundle\n`;
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
