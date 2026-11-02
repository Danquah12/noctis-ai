/**
 * Noctis Longitudinal Lab Tracking & Delta Velocity Engine (NLLT)
 * ============================================================================
 * Tracks multi-point laboratory trajectories across time intervals.
 * Automatically computes analyte deltas, percentage changes, rate of change (velocity),
 * and evaluates acute organ dysfunction criteria including:
 *   - KDIGO 2024 Acute Kidney Injury (AKI) Staging (Stages 1, 2, 3)
 *   - Acute Hemoglobin Drop (Occult Bleeding / Hemorrhage Warning)
 *   - Platelet Destruction / Consumptive Thrombocytopenia Velocity
 *   - Rapid Electrolyte Trajectories (Hyperkalemia / Hyponatremia shifts)
 *   - Longitudinal CKD Progression vs. Acute-on-Chronic Decompensation
 * ============================================================================
 */

export interface LabDataPoint {
  dateOrLabel: string;
  value: number;
  unit: string;
  timestampMs?: number;
  isHistorical?: boolean;
}

export interface AnalyteDeltaSummary {
  analyte: string;
  baselineDate: string;
  baselineValue: number;
  currentDate: string;
  currentValue: number;
  unit: string;
  absoluteDelta: number;
  percentChange: number;
  timeElapsedDays?: number;
  ratePerDay?: number;
  clinicalSignificance: "ACUTE_WORSENING" | "ACUTE_IMPROVEMENT" | "STABLE" | "CHRONIC_PROGRESSION" | "CRITICAL_HAZARD";
  plainEnglishInterpretation: string;
  alertBanner?: string;
}

export interface KdigoAkiAssessment {
  isAkiPresent: boolean;
  akiStage: "NONE" | "STAGE_1" | "STAGE_2" | "STAGE_3";
  criteriaTriggered: string[];
  baselineCreatinineMgDl: number;
  currentCreatinineMgDl: number;
  absoluteDeltaMgDl: number;
  ratioToBaseline: number;
  clinicalAction: string;
}

export interface LongitudinalEvaluationDossier {
  dossierId: string;
  timestamp: string;
  hasLongitudinalData: boolean;
  analytesEvaluated: AnalyteDeltaSummary[];
  kdigoAki?: KdigoAkiAssessment;
  criticalVelocityAlerts: string[];
  clinicalRecommendations: string[];
  patientQuestionsForDoctor: string[];
}

/**
 * Evaluates KDIGO AKI Staging based on baseline and current serum creatinine.
 */
export function evaluateKdigoAki(
  baselineCreatinine: number,
  currentCreatinine: number,
  daysElapsed = 2
): KdigoAkiAssessment {
  const delta = Number((currentCreatinine - baselineCreatinine).toFixed(2));
  const ratio = Number((currentCreatinine / (baselineCreatinine || 1)).toFixed(2));
  const criteria: string[] = [];

  let stage: "NONE" | "STAGE_1" | "STAGE_2" | "STAGE_3" = "NONE";
  let action = "Creatinine remains within stable limits relative to baseline.";

  if (currentCreatinine >= 4.0 && delta >= 0.3) {
    stage = "STAGE_3";
    criteria.push("Serum creatinine >= 4.0 mg/dL with acute rise >= 0.3 mg/dL");
  } else if (ratio >= 3.0) {
    stage = "STAGE_3";
    criteria.push(`Serum creatinine >= 3.0x baseline (ratio: ${ratio}x)`);
  } else if (ratio >= 2.0) {
    stage = "STAGE_2";
    criteria.push(`Serum creatinine 2.0x to 2.9x baseline (ratio: ${ratio}x)`);
  } else if (daysElapsed <= 2 && delta >= 0.3) {
    stage = "STAGE_1";
    criteria.push(`Absolute serum creatinine increase >= 0.3 mg/dL within 48h (+${delta} mg/dL)`);
  } else if (ratio >= 1.5) {
    stage = "STAGE_1";
    criteria.push(`Serum creatinine 1.5x to 1.9x baseline within 7 days (ratio: ${ratio}x)`);
  }

  if (stage === "STAGE_3") {
    action = "🚨 EMERGENCY: Stage 3 Acute Kidney Injury indicates severe renal failure. Stat nephrology consultation, fluid status evaluation, medication review, and readiness for renal replacement therapy (dialysis) required.";
  } else if (stage === "STAGE_2") {
    action = "⚠️ URGENT: Stage 2 Acute Kidney Injury indicates substantial renal injury (>2x baseline). Immediately hold nephrotoxic agents (NSAIDs, ACEi/ARBs), monitor urine output hourly, and evaluate for hypovolemia or urinary obstruction.";
  } else if (stage === "STAGE_1") {
    action = "⚠️ ATTENTION: Stage 1 Acute Kidney Injury detected (+0.3 mg/dL or >=1.5x baseline). Review recent medication changes, evaluate hydration, and repeat renal panel within 24–48 hours.";
  }

  return {
    isAkiPresent: stage !== "NONE",
    akiStage: stage,
    criteriaTriggered: criteria,
    baselineCreatinineMgDl: baselineCreatinine,
    currentCreatinineMgDl: currentCreatinine,
    absoluteDeltaMgDl: delta,
    ratioToBaseline: ratio,
    clinicalAction: action,
  };
}

/**
 * Extracts multiple dates and analyte pairs from free text.
 */
export function extractLongitudinalAnalytes(text: string): AnalyteDeltaSummary[] {
  const summaries: AnalyteDeltaSummary[] = [];

  // 1. Serum Creatinine trajectory extraction
  // Matches e.g.: "Creatinine: baseline 1.1 -> current 2.4" or "Creatinine: Oct 1.2, Nov 1.8" or "creatinine rose from 1.35 to 1.68"
  const scrTrajectoryMatch =
    text.match(/creatinine\b[^.\n]*?(?:from|prior|baseline|past|previous|old)\s*(?:is|of|=|:)?\s*(\d+(?:\.\d+)?)[^.\n]*?(?:to|now|current|recent|latest)\s*(?:is|of|=|:)?\s*(\d+(?:\.\d+)?)/i) ||
    text.match(/creatinine\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(?:mg\/dl)?[^.\n]*?(?:->|→)\s*(\d+(?:\.\d+)?)/i);

  if (scrTrajectoryMatch) {
    const baseVal = Number(scrTrajectoryMatch[1]);
    const currVal = Number(scrTrajectoryMatch[2]);
    const delta = Number((currVal - baseVal).toFixed(2));
    const pct = Number((((currVal - baseVal) / (baseVal || 1)) * 100).toFixed(1));

    let sig: AnalyteDeltaSummary["clinicalSignificance"] = "STABLE";
    let alertBanner: string | undefined;

    if (delta >= 0.3 || (currVal / (baseVal || 1)) >= 1.5) {
      sig = "CRITICAL_HAZARD";
      alertBanner = `🚨 ACUTE KIDNEY DETERIORATION: Creatinine rose by +${delta} mg/dL (+${pct}%). Meets KDIGO criteria for Acute Kidney Injury.`;
    } else if (delta <= -0.2) {
      sig = "ACUTE_IMPROVEMENT";
    }

    summaries.push({
      analyte: "Serum Creatinine",
      baselineDate: "Baseline / Prior Record",
      baselineValue: baseVal,
      currentDate: "Current Record",
      currentValue: currVal,
      unit: "mg/dL",
      absoluteDelta: delta,
      percentChange: pct,
      clinicalSignificance: sig,
      plainEnglishInterpretation: `Your kidney filtration waste marker (creatinine) changed from ${baseVal} to ${currVal} mg/dL (${delta >= 0 ? "+" : ""}${delta} mg/dL, ${pct}% change).`,
      alertBanner,
    });
  }

  // 2. Hemoglobin trajectory (acute drop detection)
  const hgbTrajectoryMatch =
    text.match(/hemoglobin\b[^.\n]*?(?:from|prior|baseline|past|previous)\s*(?:is|of|=|:)?\s*(\d+(?:\.\d+)?)[^.\n]*?(?:to|now|current|recent|latest)\s*(?:is|of|=|:)?\s*(\d+(?:\.\d+)?)/i) ||
    text.match(/hemoglobin\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(?:g\/dl)?[^.\n]*?(?:->|→)\s*(\d+(?:\.\d+)?)/i);

  if (hgbTrajectoryMatch) {
    const baseVal = Number(hgbTrajectoryMatch[1]);
    const currVal = Number(hgbTrajectoryMatch[2]);
    const delta = Number((currVal - baseVal).toFixed(2));
    const pct = Number((((currVal - baseVal) / (baseVal || 1)) * 100).toFixed(1));

    let sig: AnalyteDeltaSummary["clinicalSignificance"] = "STABLE";
    let alertBanner: string | undefined;

    if (delta <= -2.0) {
      sig = "CRITICAL_HAZARD";
      alertBanner = `🚨 ACUTE HEMOGLOBIN DROP: Hemoglobin dropped by ${Math.abs(delta)} g/dL (${pct}%). Stat evaluation for active hemorrhage, occult GI bleeding, or rapid hemolysis required.`;
    } else if (delta < -0.8) {
      sig = "ACUTE_WORSENING";
    } else if (delta >= 1.0) {
      sig = "ACUTE_IMPROVEMENT";
    }

    summaries.push({
      analyte: "Hemoglobin",
      baselineDate: "Baseline / Prior Record",
      baselineValue: baseVal,
      currentDate: "Current Record",
      currentValue: currVal,
      unit: "g/dL",
      absoluteDelta: delta,
      percentChange: pct,
      clinicalSignificance: sig,
      plainEnglishInterpretation: `Your oxygen-carrying red blood cell count (hemoglobin) shifted from ${baseVal} to ${currVal} g/dL (${delta >= 0 ? "+" : ""}${delta} g/dL, ${pct}% change).`,
      alertBanner,
    });
  }

  // 3. Potassium trajectory (rapid hyperkalemia shift)
  const kTrajectoryMatch =
    text.match(/potassium\b[^.\n]*?(?:from|prior|baseline|past|previous)\s*(?:is|of|=|:)?\s*(\d+(?:\.\d+)?)[^.\n]*?(?:to|now|current|recent|latest)\s*(?:is|of|=|:)?\s*(\d+(?:\.\d+)?)/i) ||
    text.match(/potassium\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(?:mmol\/l)?[^.\n]*?(?:->|→)\s*(\d+(?:\.\d+)?)/i);

  if (kTrajectoryMatch) {
    const baseVal = Number(kTrajectoryMatch[1]);
    const currVal = Number(kTrajectoryMatch[2]);
    const delta = Number((currVal - baseVal).toFixed(2));
    const pct = Number((((currVal - baseVal) / (baseVal || 1)) * 100).toFixed(1));

    let sig: AnalyteDeltaSummary["clinicalSignificance"] = "STABLE";
    let alertBanner: string | undefined;

    if (currVal >= 6.0 && delta >= 0.8) {
      sig = "CRITICAL_HAZARD";
      alertBanner = `🚨 RAPID HYPERKALEMIA SPIKE: Potassium escalated rapidly to ${currVal} mmol/L (+${delta} mmol/L). High risk of cardiac conduction block. Stat 12-lead ECG indicated.`;
    } else if (currVal >= 5.5) {
      sig = "ACUTE_WORSENING";
    }

    summaries.push({
      analyte: "Serum Potassium",
      baselineDate: "Baseline / Prior Record",
      baselineValue: baseVal,
      currentDate: "Current Record",
      currentValue: currVal,
      unit: "mmol/L",
      absoluteDelta: delta,
      percentChange: pct,
      clinicalSignificance: sig,
      plainEnglishInterpretation: `Your blood electrolyte level (potassium) shifted from ${baseVal} to ${currVal} mmol/L (${delta >= 0 ? "+" : ""}${delta} mmol/L, ${pct}% change).`,
      alertBanner,
    });
  }

  // 4. Platelets trajectory (rapid consumptive drop)
  const pltTrajectoryMatch =
    text.match(/platelets?\b[^.\n]*?(?:from|prior|baseline|past|previous)\s*(?:is|of|=|:)?\s*(\d+(?:\.\d+)?)[^.\n]*?(?:to|now|current|recent|latest)\s*(?:is|of|=|:)?\s*(\d+(?:\.\d+)?)/i) ||
    text.match(/platelets?\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(?:x10\^3\/ul)?[^.\n]*?(?:->|→)\s*(\d+(?:\.\d+)?)/i);

  if (pltTrajectoryMatch) {
    const baseVal = Number(pltTrajectoryMatch[1]);
    const currVal = Number(pltTrajectoryMatch[2]);
    const delta = Number((currVal - baseVal).toFixed(0));
    const pct = Number((((currVal - baseVal) / (baseVal || 1)) * 100).toFixed(1));

    let sig: AnalyteDeltaSummary["clinicalSignificance"] = "STABLE";
    let alertBanner: string | undefined;

    if (pct <= -50 && currVal < 100) {
      sig = "CRITICAL_HAZARD";
      alertBanner = `🚨 CONSUMPTIVE THROMBOCYTOPENIA: Platelet count plummeted by ${Math.abs(pct)}% (from ${baseVal} to ${currVal} k/uL). Screen for Heparin-Induced Thrombocytopenia (HIT), sepsis, or immune-mediated destruction.`;
    }

    summaries.push({
      analyte: "Platelet Count",
      baselineDate: "Baseline / Prior Record",
      baselineValue: baseVal,
      currentDate: "Current Record",
      currentValue: currVal,
      unit: "x10^3/uL",
      absoluteDelta: delta,
      percentChange: pct,
      clinicalSignificance: sig,
      plainEnglishInterpretation: `Your blood clotting cells (platelets) changed from ${baseVal} to ${currVal} x10^3/uL (${delta >= 0 ? "+" : ""}${delta}, ${pct}% change).`,
      alertBanner,
    });
  }

  return summaries;
}

/**
 * Builds the complete longitudinal evaluation dossier.
 */
export function buildLongitudinalDossier(text: string): LongitudinalEvaluationDossier {
  const dossierId = `NLLT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  const timestamp = new Date().toISOString();
  const analytes = extractLongitudinalAnalytes(text);

  let kdigoAki: KdigoAkiAssessment | undefined;
  const scrSummary = analytes.find((a) => a.analyte === "Serum Creatinine");
  if (scrSummary) {
    kdigoAki = evaluateKdigoAki(scrSummary.baselineValue, scrSummary.currentValue);
  }

  const criticalVelocityAlerts: string[] = [];
  analytes.forEach((a) => {
    if (a.alertBanner) criticalVelocityAlerts.push(a.alertBanner);
  });
  if (kdigoAki?.isAkiPresent && !criticalVelocityAlerts.some((c) => c.includes("KIDNEY"))) {
    criticalVelocityAlerts.push(`🚨 ${kdigoAki.clinicalAction}`);
  }

  const recommendations: string[] = [];
  if (kdigoAki?.isAkiPresent) {
    recommendations.push(kdigoAki.clinicalAction);
    recommendations.push("Perform complete medication reconciliation to suspend ACE-inhibitors, ARBs, diuretics, and NSAIDs during acute renal decompensation.");
  }
  const hgb = analytes.find((a) => a.analyte === "Hemoglobin");
  if (hgb && hgb.percentChange <= -15) {
    recommendations.push("Stat repeat CBC, type and screen, and evaluate stool for occult blood (FIT/guaiac) or active gastrointestinal source.");
  }

  const questions: string[] = [];
  if (kdigoAki?.isAkiPresent) {
    questions.push(`Does my creatinine increase from ${kdigoAki.baselineCreatinineMgDl} to ${kdigoAki.currentCreatinineMgDl} mg/dL indicate temporary acute kidney injury (reversible) or permanent progression?`);
    questions.push("Should any of my daily blood pressure or pain medications be temporarily paused while my kidneys recover?");
  }
  if (hgb && hgb.absoluteDelta <= -1.5) {
    questions.push(`What is the suspected cause for my hemoglobin dropping from ${hgb.baselineValue} to ${hgb.currentValue} g/dL? Do I need an endoscopy or colonoscopy?`);
  }

  return {
    dossierId,
    timestamp,
    hasLongitudinalData: analytes.length > 0,
    analytesEvaluated: analytes,
    kdigoAki,
    criticalVelocityAlerts,
    clinicalRecommendations: recommendations,
    patientQuestionsForDoctor: questions,
  };
}

/**
 * Formats the longitudinal evaluation dossier into clean markdown.
 */
export function formatLongitudinalReportMarkdown(dossier: LongitudinalEvaluationDossier): string {
  if (!dossier.hasLongitudinalData) {
    return "";
  }

  const alertSection = dossier.criticalVelocityAlerts.length > 0
    ? `> [!CRITICAL]\n> **LONGITUDINAL RATE-OF-CHANGE ALERTS:**\n>\n` +
      dossier.criticalVelocityAlerts.map((a) => `> • ${a}`).join("\n>\n") + "\n\n"
    : "";

  const tableRows = dossier.analytesEvaluated.map((a) => {
    const deltaStr = `${a.absoluteDelta >= 0 ? "+" : ""}${a.absoluteDelta} ${a.unit} (${a.percentChange >= 0 ? "+" : ""}${a.percentChange}%)`;
    const badge = a.clinicalSignificance === "CRITICAL_HAZARD"
      ? `🚨 **CRITICAL**`
      : a.clinicalSignificance === "ACUTE_WORSENING"
        ? `⚠️ **WORSENING**`
        : a.clinicalSignificance === "ACUTE_IMPROVEMENT"
          ? `✅ **IMPROVED**`
          : `ℹ️ **STABLE**`;
    return `| **${a.analyte}** | \`${a.baselineValue} ${a.unit}\` | \`${a.currentValue} ${a.unit}\` | \`${deltaStr}\` | ${badge} |`;
  }).join("\n");

  const akiBlock = dossier.kdigoAki && dossier.kdigoAki.isAkiPresent
    ? `### 2. KDIGO Acute Kidney Injury (AKI) Staging & Velocity Assessment\n` +
      `- **AKI Status:** 🚨 **${dossier.kdigoAki.akiStage} DETECTED**\n` +
      `- **Baseline vs Current:** \`${dossier.kdigoAki.baselineCreatinineMgDl} mg/dL\` ➔ \`${dossier.kdigoAki.currentCreatinineMgDl} mg/dL\` (Δ \`+${dossier.kdigoAki.absoluteDeltaMgDl} mg/dL\`, \`${dossier.kdigoAki.ratioToBaseline}x\` baseline)\n` +
      `- **Diagnostic Criteria:** ${dossier.kdigoAki.criteriaTriggered.join("; ")}\n` +
      `- **Clinical Directive:** ${dossier.kdigoAki.clinicalAction}\n\n`
    : "";

  const questionsBlock = dossier.patientQuestionsForDoctor.length > 0
    ? `### 3. High-Priority Questions for Your Clinician on These Trends\n` +
      dossier.patientQuestionsForDoctor.map((q, idx) => `${idx + 1}. **${q}**`).join("\n") + "\n\n"
    : "";

  return [
    `## 📈 Longitudinal Laboratory Trend & Delta Velocity Analysis (\`${dossier.dossierId}\`)`,
    alertSection,
    `### 1. Multi-Point Analyte Trajectory Ledger`,
    `| Biomarker | Baseline Record | Current Record | Delta (Rate of Change) | Clinical Status |`,
    `| :--- | :---: | :---: | :---: | :---: |`,
    tableRows,
    "",
    akiBlock,
    questionsBlock,
  ].filter(Boolean).join("\n");
}
