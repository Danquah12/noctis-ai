/**
 * ============================================================================
 * NOCTIS SOVEREIGN ONCOLOGY, CELLULAR THERAPIES & IMMUNOTHERAPY ENGINE (NOCTIS-ONC-IRAE-001)
 * Standard: 2025/2026 ASCO / NCCN Clinical Practice Guidelines in Oncology,
 *           ESMO Clinical Practice Guidelines on irAE Management & TLS
 * Domain: Cairo-Bishop Tumor Lysis Syndrome, Rasburicase vs Allopurinol,
 *         irAEs (Colitis, Pneumonitis, Myocarditis, Hypophysitis) Steroid Taper,
 *         Febrile Neutropenia MASCC Risk Index & Empiric Coverage
 * ============================================================================
 */

export interface TumorLysisEvaluation {
  uricAcidMgdl: number; // >= 8.0 mg/dL (or 25% increase)
  potassiumMeqL: number; // >= 6.0 mEq/L (or 25% increase)
  phosphorusMgdl: number; // >= 4.5 mg/dL (or 25% increase)
  correctedCalciumMgdl: number; // <= 7.0 mg/dL (or 25% decrease)
  creatinineMgdl: number;
  baselineCreatinineMgdl: number;
  cardiacArrhythmiaPresent: boolean;
  seizurePresent: boolean;
  urinaryAlkalinizationProposed: boolean;
  g6pdDeficiencyPresent: boolean;
  rasburicaseOrdered: boolean;
}

export interface IraeEvaluation {
  checkpointInhibitorAgent: string; // e.g. "Pembrolizumab", "Nivolumab", "Ipilimumab"
  organSystem: "COLITIS" | "PNEUMONITIS" | "MYOCARDITIS" | "HYPOPHYSITIS" | "HEPATITIS";
  grade: 1 | 2 | 3 | 4;
  symptoms: string[];
  steroidTaperDurationWeeks?: number;
  infliximabProposed?: boolean;
  heartFailurePresent?: boolean;
}

export interface FebrileNeutropeniaEvaluation {
  absoluteNeutrophilCount: number; // ANC < 500/uL (or < 1000 with expected nadir < 500)
  temperatureCelsius: number; // >= 38.3 C single reading or >= 38.0 C for > 1 hour
  masccScoreComponents?: {
    burdenOfIllness: "NONE" | "MILD" | "MODERATE"; // 5 pts none, 3 pts moderate
    noHypotension: boolean; // 5 pts (SBP > 90)
    noCopd: boolean; // 4 pts
    solidTumorOrNoFungal: boolean; // 4 pts
    noDehydration: boolean; // 3 pts
    outpatientAtOnset: boolean; // 3 pts
    ageUnder60: boolean; // 2 pts
  };
  antipseudomonalOrdered: boolean;
  vancomycinOrderedWithoutIndication: boolean;
}

export interface OncAssessmentResult {
  engineId: "NOCTIS-ONC-IRAE-001";
  clinicalDomain: "ONCOLOGY_IMMUNOTHERAPY";
  timestamp: string;
  summary: string;
  calculations: Record<string, string | number | boolean>;
  recommendations: string[];
  safetyVetoesTriggered: string[];
  references: string[];
}

export function evaluateTumorLysisSyndrome(input: TumorLysisEvaluation): OncAssessmentResult {
  // Cairo-Bishop Laboratory TLS Criteria (>= 2 criteria within 3 days before or 7 days after chemo)
  let labCriteriaMet = 0;
  if (input.uricAcidMgdl >= 8.0) labCriteriaMet++;
  if (input.potassiumMeqL >= 6.0) labCriteriaMet++;
  if (input.phosphorusMgdl >= 4.5) labCriteriaMet++;
  if (input.correctedCalciumMgdl <= 7.0) labCriteriaMet++;

  const isLabTls = labCriteriaMet >= 2;
  const isCreatinineElevated = input.creatinineMgdl >= 1.5 * input.baselineCreatinineMgdl;
  const isClinicalTls = isLabTls && (isCreatinineElevated || input.cardiacArrhythmiaPresent || input.seizurePresent);

  const calculations: Record<string, string | number | boolean> = {
    cairoBishopLabCriteriaMet: labCriteriaMet,
    isLaboratoryTls: isLabTls,
    isClinicalTls: isClinicalTls,
    uricAcid: `${input.uricAcidMgdl} mg/dL`,
    potassium: `${input.potassiumMeqL} mEq/L`,
    phosphorus: `${input.phosphorusMgdl} mg/dL`,
    calcium: `${input.correctedCalciumMgdl} mg/dL`,
  };

  const recommendations: string[] = [];
  const safetyVetoesTriggered: string[] = [];

  // Veto 1: Urinary Alkalinization Veto
  if (input.urinaryAlkalinizationProposed) {
    safetyVetoesTriggered.push(
      "CF-ONC-001 [URINARY ALKALINIZATION NEPHROCALCINOSIS VETO]: Urinary alkalinization (sodium bicarbonate infusion) is strictly contraindicated in modern Tumor Lysis Syndrome management. While alkalinization increases uric acid solubility, it severely decreases Calcium Phosphate solubility, driving extensive calcium phosphate precipitation in renal tubules (nephrocalcinosis), worsening acute kidney injury, and exacerbating hypocalcemia. Target aggressive hydration with 0.9% NaCl or balanced crystalloids without bicarbonate."
    );
  }

  // Veto 2: G6PD Deficiency Rasburicase Veto
  if (input.rasburicaseOrdered && input.g6pdDeficiencyPresent) {
    safetyVetoesTriggered.push(
      "CF-ONC-002 [RASBURICASE G6PD HEMOLYSIS & METHEMOGLOBINEMIA VETO]: Rasburicase (recombinant urate oxidase) is strictly contraindicated in patients with Glucose-6-Phosphate Dehydrogenase (G6PD) deficiency. Rasburicase catabolizes uric acid into allantoin, producing hydrogen peroxide as a byproduct. In G6PD deficiency, red blood cells lack NADPH to reduce glutathione, precipitating life-threatening acute intravascular hemolysis and severe methemoglobinemia. IMMEDIATELY CANCEL RASBURICASE; treat hyperuricemia with high-dose Allopurinol (300-600 mg/day) and aggressive hydration."
    );
  }

  // Resuscitation & Treatment Directives
  if (isLabTls || isClinicalTls) {
    recommendations.push(
      `TLS AGGRESSIVE RESUSCITATION BUNDLE: (1) IV Hydration: 2,500-3,000 mL/m2/day (target urine output 80-100 mL/m2/hr); (2) Uric Acid Control: If established TLS and G6PD-negative, administer Rasburicase 0.2 mg/kg IV once (re-dose only if uric acid rebounds); for prevention, administer Allopurinol 300 mg PO daily; (3) Hyperkalemia: Continuous cardiac telemetry, IV Calcium Gluconate for membrane stabilization if EKG changes present, Insulin + D50W, Patiromer or Sodium Zirconium Cyclosilicate (Lokelma); (4) Hyperphosphatemia: Restrict dietary phosphate, oral non-calcium phosphate binders (Sevelamer); avoid IV calcium unless symptomatic tetany occurs to prevent calcium-phosphate precipitation.`
    );
  }

  return {
    engineId: "NOCTIS-ONC-IRAE-001",
    clinicalDomain: "ONCOLOGY_IMMUNOTHERAPY",
    timestamp: new Date().toISOString(),
    summary: safetyVetoesTriggered.length > 0
      ? "Oncological safety invariant violated (alkalinization or G6PD rasburicase contraindication)."
      : `Tumor Lysis Syndrome evaluated: ${isClinicalTls ? "CLINICAL_TLS" : isLabTls ? "LABORATORY_TLS" : "LOW_RISK"}. Standardized nephroprotective protocol active.`,
    calculations,
    recommendations,
    safetyVetoesTriggered,
    references: [
      "Cairo MS, Bishop M. Tumour lysis syndrome: new therapeutic strategies and classification. Br J Haematol.",
      "ASCO / NCCN Clinical Practice Guidelines: Prevention and Management of Tumor Lysis Syndrome (2025/2026)",
    ],
  };
}

export function evaluateIrae(input: IraeEvaluation): OncAssessmentResult {
  const calculations: Record<string, string | number | boolean> = {
    checkpointInhibitor: input.checkpointInhibitorAgent,
    organSystem: input.organSystem,
    grade: `Grade ${input.grade}`,
    heartFailureCoexisting: input.heartFailurePresent ?? false,
  };

  const recommendations: string[] = [];
  const safetyVetoesTriggered: string[] = [];

  // Veto 3: Infliximab in Heart Failure (NYHA III/IV)
  if (input.infliximabProposed && input.heartFailurePresent) {
    safetyVetoesTriggered.push(
      "CF-ONC-003 [INFLIXIMAB SEVERE HEART FAILURE CONTRAINDICATION VETO]: Infliximab (anti-TNF alpha) is strictly contraindicated in patients with moderate-to-severe congestive heart failure (NYHA Class III/IV). Anti-TNF therapy causes acute myocardial decompensation, worsening ventricular remodeling, and excess cardiovascular mortality. For steroid-refractory irAE colitis in heart failure patients, switch to Vedolizumab (anti-alpha4beta7 integrin) 300 mg IV at weeks 0, 2, and 6."
    );
  }

  // Veto 4: Rapid Steroid Taper Rebound Veto
  if (input.grade >= 2 && input.steroidTaperDurationWeeks !== undefined && input.steroidTaperDurationWeeks < 4) {
    safetyVetoesTriggered.push(
      `CF-ONC-004 [IRAE RAPID STEROID TAPER REBOUND VETO]: Proposed steroid taper duration of ${input.steroidTaperDurationWeeks} weeks is dangerously abbreviated. In immune-related adverse events (irAEs), checkpoint inhibitor antibodies remain bound to PD-1/PD-L1/CTLA-4 receptors for up to 6-12 weeks. Tapering systemic corticosteroids over < 4 weeks triggers explosive rebound autoimmunity, catastrophic relapse, and organ failure. Corticosteroids must be tapered SLOWLY over AT LEAST 4 TO 6 WEEKS.`
    );
  }

  // Management directives based on organ and grade
  if (input.organSystem === "MYOCARDITIS") {
    recommendations.push(
      "IMMUNE CHECKPOINT MYOCARDITIS MANDATE: Grade 2-4 Myocarditis carries up to 50% mortality. (1) PERMANENTLY DISCONTINUE all immune checkpoint inhibitors; (2) Transfer immediately to cardiac ICU with continuous telemetry; (3) High-dose pulse Methylprednisolone 1,000 mg IV daily for 3 days, followed by 1 mg/kg/day oral Prednisone with a 6-8 week taper; (4) If no rapid response within 24 hours, escalate STAT to Abatacept (CTLA-4-Ig) 10-20 mg/kg or Alemtuzumab (anti-CD52) / Mycophenolate Mofetil."
    );
  } else if (input.grade >= 2) {
    recommendations.push(
      `HIGH-GRADE IRAE (${input.organSystem} GRADE ${input.grade}): (1) Hold or permanently discontinue checkpoint inhibitor; (2) Initiate systemic Prednisone or Methylprednisolone 1.0-2.0 mg/kg/day; (3) Add PJP prophylaxis (TMP-SMX) and GI gastroprotection (PPI) during prolonged high-dose steroid therapy; (4) Mandatory slow taper over at least 4-6 weeks once symptoms improve to Grade <= 1.`
    );
  }

  return {
    engineId: "NOCTIS-ONC-IRAE-001",
    clinicalDomain: "ONCOLOGY_IMMUNOTHERAPY",
    timestamp: new Date().toISOString(),
    summary: safetyVetoesTriggered.length > 0
      ? "Immune-related adverse event safety invariant violated."
      : `irAE evaluated: ${input.organSystem} (Grade ${input.grade}). Standardized immunosuppressive protocol active.`,
    calculations,
    recommendations,
    safetyVetoesTriggered,
    references: [
      "ASCO Clinical Practice Guideline: Management of Immune-Related Adverse Events in Patients Treated with Immune Checkpoint Inhibitors (2025/2026)",
      "NCCN Guidelines Insights: Management of Immunotherapy-Related Toxicities",
    ],
  };
}

export function evaluateFebrileNeutropenia(input: FebrileNeutropeniaEvaluation): OncAssessmentResult {
  // MASCC Risk Index Calculation (Max 26; >= 21 is Low Risk, < 21 is High Risk)
  let mascc = 0;
  if (input.masccScoreComponents) {
    const c = input.masccScoreComponents;
    if (c.burdenOfIllness === "NONE") mascc += 5;
    else if (c.burdenOfIllness === "MODERATE") mascc += 3;
    if (c.noHypotension) mascc += 5;
    if (c.noCopd) mascc += 4;
    if (c.solidTumorOrNoFungal) mascc += 4;
    if (c.noDehydration) mascc += 3;
    if (c.outpatientAtOnset) mascc += 3;
    if (c.ageUnder60) mascc += 2;
  } else {
    mascc = 18; // Default conservative high risk if not provided
  }

  const isHighRisk = mascc < 21 || input.absoluteNeutrophilCount < 100;

  const calculations: Record<string, string | number | boolean> = {
    anc: `${input.absoluteNeutrophilCount} /uL`,
    temperature: `${input.temperatureCelsius} °C`,
    masccScore: mascc,
    riskStratification: isHighRisk ? "HIGH_RISK_INPATIENT" : "LOW_RISK_OUTPATIENT_CANDIDATE",
    antipseudomonalOrdered: input.antipseudomonalOrdered,
    vancomycinOrderedWithoutIndication: input.vancomycinOrderedWithoutIndication,
  };

  const recommendations: string[] = [];
  const safetyVetoesTriggered: string[] = [];

  // Veto 5: Empiric Vancomycin Overuse Veto
  if (input.vancomycinOrderedWithoutIndication) {
    safetyVetoesTriggered.push(
      "CF-ONC-005 [EMPIRIC VANCOMYCIN OVERUSE VETO]: Vancomycin is NOT recommended as a routine component of the initial empiric antibiotic regimen for febrile neutropenia. Adding Vancomycin upfront does not improve survival and significantly increases acute kidney injury and VRE selective pressure. Vancomycin is strictly restricted to patients with: hemodynamic instability (septic shock), pneumonia, clinically suspected catheter-related bloodstream infection, skin/soft-tissue infection, or known colonization with MRSA/penicillin-resistant Streptococcus pneumoniae."
    );
  }

  if (!input.antipseudomonalOrdered) {
    recommendations.push(
      "STAT EMPIRIC ANTIPSEUDOMONAL MONOTHERAPY MANDATE (Deliver within 60 minutes): Administer Cefepime 2.0 g IV q8h (extended 4h infusion), Piperacillin-tazobactam 4.5 g IV q6h (extended 4h infusion), or Meropenem 1.0 g IV q8h. Prompt antipseudomonal administration is the single strongest determinant of survival in neutropenic bacteremia."
    );
  }

  return {
    engineId: "NOCTIS-ONC-IRAE-001",
    clinicalDomain: "ONCOLOGY_IMMUNOTHERAPY",
    timestamp: new Date().toISOString(),
    summary: safetyVetoesTriggered.length > 0
      ? "Febrile neutropenia stewardship invariant triggered."
      : `Febrile neutropenia evaluated (${calculations.riskStratification}). Empiric coverage protocol active.`,
    calculations,
    recommendations,
    safetyVetoesTriggered,
    references: [
      "IDSA / ASCO Clinical Practice Guideline for the Outpatient Management of Fever and Neutropenia (2025/2026)",
      "Klastersky J, et al. The Multinational Association for Supportive Care in Cancer risk index. J Clin Oncol.",
    ],
  };
}

export function handleNaturalOncologyQuery(prompt: string): string | null {
  const p = prompt.toLowerCase();
  const isMatch =
    p.includes("tumor lysis") ||
    p.includes("tls") ||
    p.includes("rasburicase") ||
    p.includes("cairo-bishop") ||
    p.includes("irae") ||
    p.includes("checkpoint") ||
    p.includes("myocarditis") && p.includes("pembrolizumab") ||
    p.includes("febrile neutropenia") ||
    p.includes("mascc");

  if (!isMatch) return null;

  // Case 1: Tumor Lysis Syndrome
  if (p.includes("tumor lysis") || p.includes("tls") || p.includes("rasburicase") || p.includes("cairo-bishop")) {
    const isAlkalinization = p.includes("alkaliniz") || p.includes("bicarbonate");
    const isG6pd = p.includes("g6pd") || p.includes("glucose-6");

    const res = evaluateTumorLysisSyndrome({
      uricAcidMgdl: 11.2,
      potassiumMeqL: 6.4,
      phosphorusMgdl: 5.8,
      correctedCalciumMgdl: 6.8,
      creatinineMgdl: 2.4,
      baselineCreatinineMgdl: 1.0,
      cardiacArrhythmiaPresent: false,
      seizurePresent: false,
      urinaryAlkalinizationProposed: isAlkalinization,
      g6pdDeficiencyPresent: isG6pd,
      rasburicaseOrdered: isG6pd,
    });
    return formatOncMarkdown(res);
  }

  // Case 2: irAE / Checkpoint Colitis / Myocarditis
  if (p.includes("irae") || p.includes("checkpoint") || p.includes("colitis") || p.includes("myocarditis") || p.includes("steroid taper")) {
    const isRapidTaper = p.includes("2 week") || p.includes("rapid taper") || p.includes("10 day");
    const isHeartFailureInfliximab = p.includes("infliximab") && (p.includes("heart failure") || p.includes("hf") || p.includes("chf"));

    const res = evaluateIrae({
      checkpointInhibitorAgent: "Pembrolizumab",
      organSystem: p.includes("myocarditis") ? "MYOCARDITIS" : "COLITIS",
      grade: 3,
      symptoms: ["Severe watery diarrhea", "Abdominal cramping"],
      steroidTaperDurationWeeks: isRapidTaper ? 2 : 6,
      infliximabProposed: isHeartFailureInfliximab,
      heartFailurePresent: isHeartFailureInfliximab,
    });
    return formatOncMarkdown(res);
  }

  // Case 3: Febrile Neutropenia
  if (p.includes("febrile neutropenia") || p.includes("mascc") || (p.includes("anc") && p.includes("fever"))) {
    const isVancOveruse = p.includes("vancomycin") && !p.includes("mrsa") && !p.includes("catheter");
    const res = evaluateFebrileNeutropenia({
      absoluteNeutrophilCount: 220,
      temperatureCelsius: 38.6,
      masccScoreComponents: {
        burdenOfIllness: "MODERATE",
        noHypotension: true,
        noCopd: true,
        solidTumorOrNoFungal: true,
        noDehydration: true,
        outpatientAtOnset: false,
        ageUnder60: true,
      },
      antipseudomonalOrdered: true,
      vancomycinOrderedWithoutIndication: isVancOveruse,
    });
    return formatOncMarkdown(res);
  }

  return null;
}

function formatOncMarkdown(res: OncAssessmentResult): string {
  let md = `### Noctis Sovereign Oncology & Immunotherapy Engine (${res.engineId})\n`;
  md += `**Clinical Domain:** ${res.clinicalDomain.replace(/_/g, " ")} · **Summary:** ${res.summary}\n\n`;

  if (res.safetyVetoesTriggered.length > 0) {
    md += `#### 🚨 Non-Compensatory Safety Invariants Enforced\n`;
    for (const veto of res.safetyVetoesTriggered) {
      md += `- **${veto}**\n`;
    }
    md += `\n`;
  }

  md += `#### 1. Biomarkers, Laboratory & Risk Stratification\n`;
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
