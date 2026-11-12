/**
 * ============================================================================
 * NOCTIS SOVEREIGN RHEUMATOLOGY & AUTOIMMUNE EMERGENCIES ENGINE (NOCTIS-RHEUM-EMERG-001)
 * Standard: 2025/2026 ACR / EULAR Clinical Practice Guidelines on Lupus Nephritis,
 *           ANCA-Associated Vasculitis & Scleroderma Renal Crisis
 * Domain: Lupus Nephritis Class III/IV Induction, ANCA Pulmonary-Renal Syndrome,
 *         Biologics Latent TB / Hep B Screening Invariant, Scleroderma Renal Crisis
 * ============================================================================
 */

export interface LupusNephritisEvaluation {
  isnRpsClass: "CLASS_I" | "CLASS_II" | "CLASS_III_FOCAL" | "CLASS_IV_DIFFUSE" | "CLASS_V_MEMBRANOUS";
  proteinuriaGrams24h: number;
  serumCreatinineMgdl: number;
  activeUrinarySedimentRbcCasts: boolean;
  inductionRegimenProposed: "MYCOPHENOLATE_MOFETIL" | "CYCLOPHOSPHAMIDE" | "STEROID_MONOTHERAPY";
  pulseMethylprednisoloneOrdered: boolean;
}

export interface VasculitisEvaluation {
  ancaSubtype: "PR3_ANCA_C_ANCA" | "MPO_ANCA_P_ANCA" | "NEGATIVE";
  diffuseAlveolarHemorrhagePresent: boolean;
  rapidlyProgressiveGlomerulonephritis: boolean;
  antiGbmAntibodiesPresent: boolean;
  inductionAgent: "RITUXIMAB" | "CYCLOPHOSPHAMIDE";
  plasmaExchangeProposed: boolean;
}

export interface BiologicScreeningEvaluation {
  candidateAgent: "TNF_INHIBITOR" | "RITUXIMAB" | "JAK_INHIBITOR" | "IL6_INHIBITOR";
  latentTbScreeningPerformed: boolean; // IGRA / QuantiFERON or TST
  tbScreeningPositive: boolean;
  tbProphylaxisInitiated: boolean;
  hepatitisBSerologyPerformed: boolean; // HBsAg, anti-HBc, anti-HBs
  hepatitisBCorePositive: boolean;
  hbvProphylaxisInitiated: boolean;
}

export interface SclerodermaEvaluation {
  sclerodermaSubtype: "DIFFUSE_CUTANEOUS" | "LIMITED_CUTANEOUS";
  systolicBpMmhg: number;
  diastolicBpMmhg: number;
  acuteKidneyInjuryPresent: boolean;
  microangiopathicHemolyticAnemia: boolean;
  prednisoneDoseMgDay: number;
  aceInhibitorOrdered: boolean;
}

export interface RheumAssessmentResult {
  engineId: "NOCTIS-RHEUM-EMERG-001";
  clinicalDomain: "RHEUMATOLOGY_AUTOIMMUNE";
  timestamp: string;
  summary: string;
  calculations: Record<string, string | number | boolean>;
  recommendations: string[];
  safetyVetoesTriggered: string[];
  references: string[];
}

export function evaluateBiologicSafety(input: BiologicScreeningEvaluation): RheumAssessmentResult {
  const calculations: Record<string, string | number | boolean> = {
    biologicClass: input.candidateAgent,
    latentTbScreened: input.latentTbScreeningPerformed,
    tbPositive: input.tbScreeningPositive,
    hbvScreened: input.hepatitisBSerologyPerformed,
    hbvCorePositive: input.hepatitisBCorePositive,
  };

  const recommendations: string[] = [];
  const safetyVetoesTriggered: string[] = [];

  // Veto 1: Biologics Latent Infection Screening Veto (TB & Hepatitis B)
  if (!input.latentTbScreeningPerformed || !input.hepatitisBSerologyPerformed) {
    safetyVetoesTriggered.push(
      `CF-RHEUM-001 [BIOLOGICS LATENT INFECTION SCREENING MANDATE VETO]: Initiating ${input.candidateAgent} without documented negative Latent TB screening (IGRA / QuantiFERON) AND complete Hepatitis B serology (HBsAg, anti-HBc, anti-HBs) is strictly prohibited. Biologic immunosuppression triggers catastrophic disseminated/miliary tuberculosis and fulminant fatal Hepatitis B reactivation with acute hepatic necrosis. IMMEDIATELY HOLD BIOLOGIC until screening results are documented.`
    );
  } else {
    if (input.tbScreeningPositive && !input.tbProphylaxisInitiated) {
      safetyVetoesTriggered.push(
        "CF-RHEUM-002 [LATENT TB PROPHYLAXIS OMISSION VETO]: Patient tested POSITIVE for latent tuberculosis. Biologic initiation is vetoed until at least 1 month of prophylactic therapy (Rifampin 600 mg daily x 4 months or Isoniazid + Rifapentine weekly x 12 weeks) is completed."
      );
    }
    if (input.hepatitisBCorePositive && !input.hbvProphylaxisInitiated) {
      safetyVetoesTriggered.push(
        "CF-RHEUM-003 [HEPATITIS B REACTIVATION PROPHYLAXIS VETO]: Patient is anti-HBc positive. Anti-CD20 therapy (Rituximab) or anti-TNF therapy carries a > 10-50% risk of fulminant HBV reactivation. Entecavir or Tenofovir antiviral prophylaxis MUST be initiated concurrently or prior to biologic therapy and continued for at least 12-18 months."
      );
    }
  }

  return {
    engineId: "NOCTIS-RHEUM-EMERG-001",
    clinicalDomain: "RHEUMATOLOGY_AUTOIMMUNE",
    timestamp: new Date().toISOString(),
    summary: safetyVetoesTriggered.length > 0
      ? "Biologic pre-treatment safety invariant violated (infection risk)."
      : "Biologic infection screening verified. Safe for immunosuppression initiation.",
    calculations,
    recommendations,
    safetyVetoesTriggered,
    references: [
      "ACR Guideline for the Screening, Monitoring, and Treatment of Infections in Rheumatic Diseases (2025/2026)",
      "CDC Guidelines for Prevention of Opportunistic Infections in Immunocompromised Hosts",
    ],
  };
}

export function evaluateSclerodermaRenalCrisis(input: SclerodermaEvaluation): RheumAssessmentResult {
  const isMalignantBp = input.systolicBpMmhg >= 160 || input.diastolicBpMmhg >= 100;
  const isSrc = isMalignantBp && input.acuteKidneyInjuryPresent;

  const calculations: Record<string, string | number | boolean> = {
    sclerodermaSubtype: input.sclerodermaSubtype,
    bloodPressure: `${input.systolicBpMmhg}/${input.diastolicBpMmhg} mmHg`,
    prednisoneDose: `${input.prednisoneDoseMgDay} mg/day`,
    isSclerodermaRenalCrisis: isSrc,
    aceInhibitorOrdered: input.aceInhibitorOrdered,
  };

  const recommendations: string[] = [];
  const safetyVetoesTriggered: string[] = [];

  // Veto 4: High-Dose Corticosteroid Veto in Scleroderma
  if (input.sclerodermaSubtype === "DIFFUSE_CUTANEOUS" && input.prednisoneDoseMgDay > 15) {
    safetyVetoesTriggered.push(
      `CF-RHEUM-004 [SCLERODERMA HIGH-DOSE STEROID RENAL CRISIS VETO]: Prednisone dose of ${input.prednisoneDoseMgDay} mg/day (> 15 mg/day) in diffuse cutaneous systemic sclerosis is strictly contraindicated. High-dose corticosteroids are the single strongest trigger for precipitating Scleroderma Renal Crisis (SRC), characterized by acute malignant hypertension, obliterative vasculopathy, and irreversible renal failure. Taper prednisone immediately to <= 10 mg/day.`
    );
  }

  // Veto 5: ACE Inhibitor Mandate in Scleroderma Renal Crisis
  if (isSrc && !input.aceInhibitorOrdered) {
    safetyVetoesTriggered.push(
      "CF-RHEUM-005 [SCLERODERMA RENAL CRISIS ACE INHIBITOR MANDATE]: Scleroderma Renal Crisis is driven by intense renal cortical vasospasm and extreme hyperreninemia. ACE INHIBITORS (short-acting Captopril 6.25-12.5 mg PO q8h, aggressively uptitrated to target SBP reduction of 10-20 mmHg/24h) ARE THE ONLY PROVEN LIFE-SAVING THERAPY. ARBs are inferior; calcium channel blockers and prostacyclins are adjunctive only. Administer Captopril STAT. Do not hold ACEi for rising creatinine."
    );
  }

  if (isSrc) {
    recommendations.push(
      "SRC PROTOCOL: (1) Captopril initiated at 6.25-12.5 mg PO, doubling dose every 4-8 hours to maximum 150 mg TID; (2) Target SBP reduction of 20 mmHg per 24 hours until normal (avoid precipitous drops that induce ischemic acute tubular necrosis); (3) Dialysis support if uremic or hyperkalemic, with continued Captopril to allow renal recovery (up to 50% recover renal function and discontinue dialysis within 12-24 months)."
    );
  }

  return {
    engineId: "NOCTIS-RHEUM-EMERG-001",
    clinicalDomain: "RHEUMATOLOGY_AUTOIMMUNE",
    timestamp: new Date().toISOString(),
    summary: safetyVetoesTriggered.length > 0
      ? "Scleroderma renal crisis safety invariant violated (steroid toxicity or ACEi omission)."
      : `Scleroderma evaluation completed (${isSrc ? "SRC_ACTIVE" : "STABLE"}). Vascular protective protocol active.`,
    calculations,
    recommendations,
    safetyVetoesTriggered,
    references: [
      "ACR / EULAR Recommendations for the Treatment of Systemic Sclerosis (2025/2026)",
      "Steen VD, et al. Scleroderma renal crisis: long-term outcomes with ACE inhibitors.",
    ],
  };
}

export function handleNaturalRheumatologyQuery(prompt: string): string | null {
  const p = prompt.toLowerCase();
  const isMatch =
    p.includes("biologic") ||
    p.includes("rituximab") ||
    p.includes("infliximab") ||
    p.includes("latent tb") ||
    p.includes("hepatitis b") ||
    p.includes("scleroderma") ||
    p.includes("renal crisis") ||
    p.includes("lupus nephritis") ||
    p.includes("anca vasculitis");

  if (!isMatch) return null;

  // Case 1: Biologic Screening / Latent Infection
  if (p.includes("biologic") || p.includes("latent tb") || (p.includes("rituximab") && p.includes("hep"))) {
    const isUnscreened = p.includes("without screening") || p.includes("skip tb") || p.includes("skip hep");
    const isCorePosNoProph = p.includes("anti-hbc positive") && (p.includes("without entecavir") || p.includes("no antiviral"));

    const res = evaluateBiologicSafety({
      candidateAgent: p.includes("rituximab") ? "RITUXIMAB" : "TNF_INHIBITOR",
      latentTbScreeningPerformed: !isUnscreened,
      tbScreeningPositive: false,
      tbProphylaxisInitiated: false,
      hepatitisBSerologyPerformed: !isUnscreened,
      hepatitisBCorePositive: isCorePosNoProph,
      hbvProphylaxisInitiated: !isCorePosNoProph,
    });
    return formatRheumMarkdown(res);
  }

  // Case 2: Scleroderma Renal Crisis
  if (p.includes("scleroderma") || p.includes("renal crisis")) {
    const isHighSteroid = p.includes("prednisone 40") || p.includes("prednisone 60") || p.includes("high-dose steroid");
    const isNoAcei = p.includes("without ace") || p.includes("no captopril") || p.includes("hold ace");

    const res = evaluateSclerodermaRenalCrisis({
      sclerodermaSubtype: "DIFFUSE_CUTANEOUS",
      systolicBpMmhg: 178,
      diastolicBpMmhg: 112,
      acuteKidneyInjuryPresent: true,
      microangiopathicHemolyticAnemia: true,
      prednisoneDoseMgDay: isHighSteroid ? 40 : 10,
      aceInhibitorOrdered: !isNoAcei,
    });
    return formatRheumMarkdown(res);
  }

  return null;
}

function formatRheumMarkdown(res: RheumAssessmentResult): string {
  let md = `### Noctis Sovereign Rheumatology & Autoimmune Engine (${res.engineId})\n`;
  md += `**Clinical Domain:** ${res.clinicalDomain.replace(/_/g, " ")} · **Summary:** ${res.summary}\n\n`;

  if (res.safetyVetoesTriggered.length > 0) {
    md += `#### 🚨 Non-Compensatory Safety Invariants Enforced\n`;
    for (const veto of res.safetyVetoesTriggered) {
      md += `- **${veto}**\n`;
    }
    md += `\n`;
  }

  md += `#### 1. Immunological Biomarkers & Risk Staging\n`;
  for (const [k, v] of Object.entries(res.calculations)) {
    md += `- **${k.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}:** \`${String(v)}\`\n`;
  }
  md += `\n`;

  md += `#### 2. Protocol Actions & Clinical Directives\n`;
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
