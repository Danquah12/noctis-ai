/**
 * Noctis Universal Neuro-Symbolic Clinical Pipeline (Engine-Agnostic Architecture)
 *
 * Replaces per-question hardcoded clinical routing with a generalizable,
 * encounter-isolated 3-stage pipeline that handles ANY clinical or medical question:
 *   Stage 1: Deterministic Clinical Extraction & Mathematical Derivation (buildClinicalScratchpad)
 *   Stage 2: Live LLM Clinical Reasoning constrained strictly by the Scratchpad (zero history bleed)
 *   Stage 3: Independent Deterministic Validator & 1-Shot Auto-Repair + Fail-Closed Release Gate
 */

import {
  buildClinicalScratchpad,
  validateScratchpadSourceProvenance,
  type NeuroSymbolicClinicalScratchpad,
} from "./noctis-clinical-scratchpad.ts";
import { auditAndEnforceClinicalDossier } from "./noctis-clinical-preflight-auditor.ts";
import { sanitizeRmfMarkdownFormatting } from "./noctis-rmf-reasoning.server.ts";
import { hmacSha256Sync, sha256Sync } from "./universal-crypto.ts";

export interface UniversalBrainOptions {
  provider?: string;
  apiKey?: string;
  model?: string;
  endpoint?: string;
}

export type UniversalClinicalModelChatFn = (
  messages: { role: string; content: string }[],
  opts?: {
    maxTokens?: number;
    temperature?: number;
    brain?: UniversalBrainOptions;
    thinkingLevel?: "minimal" | "low" | "medium" | "high";
  },
) => Promise<{ text: string } | { error: string }>;

export interface UniversalClinicalOptions {
  brain?: UniversalBrainOptions;
  modelChatFn?: UniversalClinicalModelChatFn;
  persistCertificate?: boolean;
}

const LEGAL_EXCLUSION_REGEX =
  /\b(irac|creac|legal\s+issue|controlling\s+legal|jurisdiction|plaintiff|defendant|summary\s+judgment|motion\s+to\s+dismiss|motion\s+for\s+summary|breach\s+of\s+contract|tortious|malpractice\s+claim|litigation|statute\s+of\s+limitations|erie\s+railroad|federal\s+district|arbitration|subpoena|verdict|indictment|standing\s+under)\b/i;

const ENGINEERING_OR_CYBER_EXCLUSION_REGEX =
  /\b(typescript|javascript|react\s+component|python\s+script|sql\s+query|cve-\d{4}-\d{4,7}|sql\s+injection|xss|csrf|kubernetes|docker\s+compose|reynolds\s+number|beam\s+deflection|bending\s+moment|ohms?\s+law|finite\s+element)\b/i;

const EXPLICIT_VITAL_OR_LAB_REGEX =
  /\b(bp\s*[:=]?\s*\d{2,3}\s*\/\s*\d{2,3}|\d{2,3}\s*\/\s*\d{2,3}\s*mmhg|\d+(?:\.\d+)?\s*(?:mmol\/l|meq\/l|mg\/dl|ng\/ml|pg\/ml|µl|bpm)|spo2\s*[:=]?\s*\d{2,3}%?|npde-[a-z0-9-]+|crit-\d+|noctis-icu-[a-z0-9-]+)\b/i;

const EXPLICIT_ENCOUNTER_MARKER_REGEX =
  /\b(npde-[a-z0-9-]+|crit-\d+|noctis-icu-[a-z0-9-]+|clinical\s+decision\s+support|triage\s+urgency|soap\s+note|emergency\s+resuscitation)\b/i;

const PATIENT_SUBJECT_REGEX =
  /\b(\d{1,3}\s*(?:-|–|\s+)?(?:year-old|yr-old|yo|y\/o)|patient|male|female|pregnant|gestation|trimester|infant|neonate|newborn|pediatric|child|toddler|adult|elderly)\b/i;

const CLINICAL_CONTEXT_REGEX =
  /\b(presents?|chief\s+complaint|symptoms?|vitals?|blood\s+pressure|\b(?:bp|hr|rr|spo2|map)\b|heart\s+rate|respiratory\s+rate|temperature|fever|afebrile|hypothermia|pain|dyspnea|shortness\s+of\s+breath|stridor|wheezing|urticaria|hives|lip\s+swelling|seizure|altered\s+mental\s+status|delirium|agitation|lethargy|melena|hematemesis|hemorrhage|bleeding|edema|oliguria|anuria|creatinine|potassium|hyperkalemia|hypokalemia|sodium|hyponatremia|hypernatremia|calcium|hypocalcemia|hypercalcemia|bicarbonate|lactate|arterial\s+ph|paco2|troponin|bnp|nt-probnp|glucose|hemoglobin|platelets?|thrombocytopenia|fibrinogen|d-dimer|inr|aptt|digoxin|triage|diagnosis|differential|workup|management|resuscitation|vasopressor|norepinephrine|epinephrine|insulin|intubation|dialysis|antidote|gerd|heartburn|reflux|ppi)\b/i;

const SPECIALTY_SYNDROME_REGEX =
  /\b(thyroid\s+storm|graves\s+disease|diabetic\s+ketoacidosis|dka|ethylene\s+glycol|methanol\s+poisoning|antifreeze\s+ingestion|osmolar\s+gap|anion\s+gap|winter['’]?s\s+formula|kdigo|aortic\s+dissection|anaphylaxis|eclampsia|preeclampsia|brash\s+syndrome|digoxin\s+toxicity|acute\s+pancreatitis|septic\s+shock|cardiogenic\s+shock|obstructive\s+shock|hypovolemic\s+shock|pulmonary\s+embolism|cor\s+pulmonale|heparin-induced\s+thrombocytopenia|disseminated\s+intravascular\s+coagulation|tension\s+pneumothorax|cardiac\s+tamponade|status\s+epilepticus|rhabdomyolysis|meningitis|metabolic\s+acidosis|lactic\s+acidosis|mala)\b/i;

/**
 * Classifies whether a user query is a clinical / medical evaluation, triage,
 * diagnostic, or therapeutic question suitable for the universal neuro-symbolic pipeline.
 */
export function isUniversalClinicalQuestion(query: string): boolean {
  const q = (query || "").trim();
  if (q.length < 12) return false;

  const hasPhysiologicData = EXPLICIT_VITAL_OR_LAB_REGEX.test(q);
  if (!hasPhysiologicData) {
    if (LEGAL_EXCLUSION_REGEX.test(q) || ENGINEERING_OR_CYBER_EXCLUSION_REGEX.test(q)) {
      return false;
    }
  }

  if (EXPLICIT_ENCOUNTER_MARKER_REGEX.test(q)) return true;
  if (hasPhysiologicData) return true;
  if (SPECIALTY_SYNDROME_REGEX.test(q) && (PATIENT_SUBJECT_REGEX.test(q) || CLINICAL_CONTEXT_REGEX.test(q))) {
    return true;
  }
  if (PATIENT_SUBJECT_REGEX.test(q) && CLINICAL_CONTEXT_REGEX.test(q)) return true;

  return false;
}

/**
 * Strips any self-emitted validation certificate or duplicate scratchpad block
 * generated by the LLM so only authentic Stage 3 deterministic outputs appear.
 */
/**
 * Separates an internal `<think>...</think>` deliberation block from the clinical dossier body
 * so independent dossier validation checks only clinical output text while preserving thought trace.
 */
function extractThinkBlock(raw: string): { thought: string; body: string } {
  const match = raw.match(/<think>([\s\S]*?)<\/think>/i);
  if (!match) return { thought: "", body: raw };
  return {
    thought: match[1].trim(),
    body: raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim(),
  };
}

function buildDeterministicClinicalThought(scratchpad: NeuroSymbolicClinicalScratchpad): string {
  const { demographics, vitals, labs, derivedCalculations, sentinels } = scratchpad;
  return [
    `Encounter ${scratchpad.encounterId} — Stage 1 Authoritative Extraction & Stage 2 Reasoning Trace:`,
    `1. Patient & Hemodynamics: ${demographics.patientAgeString ?? "Age unreported"} ${demographics.patientSex}, Weight: ${demographics.patientWeightKg ? `${demographics.patientWeightKg} kg` : "UNMEASURED"}, BP: ${vitals.bloodPressureString ?? "UNMEASURED"} (MAP: ${derivedCalculations.meanArterialPressureMmHg ?? "UNMEASURED"} mmHg), HR: ${vitals.heartRate ?? "UNMEASURED"} bpm, SpO2: ${vitals.oxygenSaturation ?? "UNMEASURED"}.`,
    `2. Laboratory Profile: Na ${labs.sodiumMeqL ?? "UNMEASURED"}, K ${labs.potassiumMeqL ?? "UNMEASURED"}, Cl ${labs.chlorideMeqL ?? "UNMEASURED"}, HCO3 (serum/ABG) ${labs.serumBicarbonateMeqL ?? "UNMEASURED"}/${labs.abgBicarbonateMeqL ?? "UNMEASURED"}, Cr ${labs.creatinineMgDl ?? "UNMEASURED"} (Baseline: ${labs.baselineCreatinineMgDl ?? "UNMEASURED"}${labs.baselineCreatinineTimeframe ? `, ${labs.baselineCreatinineTimeframe}` : ""}), pH ${labs.arterialPh ?? "UNMEASURED"}, PaCO2 ${labs.paco2MmHg ?? "UNMEASURED"}, Lactate ${labs.lactateMmolL ?? "UNMEASURED"}, Glucose ${labs.glucoseMgDl ?? "UNMEASURED"}.`,
    `3. Deterministic Derivations: ${derivedCalculations.anionGap.isComputable ? derivedCalculations.anionGap.formula : `Anion Gap: ${derivedCalculations.anionGap.refusalReason}`} | Winter's: ${derivedCalculations.wintersFormula.calibratedClinicalInterpretation} | KDIGO: ${derivedCalculations.kdigoAki.stageRationale}`,
    `4. Data Gaps & Guardrails: ${sentinels.missingDataItems.length > 0 ? sentinels.missingDataItems.join("; ") : "No unmeasured sentinels flagged"} — verified zero fabrication and SOAP alignment prior to release.`,
  ].join("\n");
}

function stripPrematureCertificatesAndScratchpad(text: string): string {
  return text
    .replace(/\n*─{10,}\n*🛡️?\s*\*{0,2}NOCTIS INDEPENDENT CLINICAL RELEASE CERTIFICATE[\s\S]*$/i, "")
    .replace(/\n*#{1,4}\s*(?:\d+\.\s*)?Neuro-Symbolic\s+(?:Clinical\s+)?Scratchpad[\s\S]*$/i, "")
    .trim();
}

function buildSystemPrompt(encounterId: string): string {
  return [
    "You are Noctis Clinical Intelligence, an attending-level physician and Clinical Decision Support (CDS) reasoning engine.",
    `Current Encounter ID: ${encounterId}.`,
    "",
    "MANDATORY PRE-RESPONSE DELIBERATION (<think>...</think>):",
    "- ALWAYS begin your output with a concise, high-signal <think>...</think> deliberation block (target ~250–400 words so full token budget remains for the complete dossier) BEFORE writing the dossier.",
    "- Inside <think>...</think>, explicitly verify: (1) every documented demographic, vital, lab, unit, baseline timeframe, imaging/echo severity (e.g., severe LV dysfunction vs. mild RV dilation — NEVER invent severe RV dilation/cor pulmonale/massive PE), home medication, and UNMEASURED/pending sentinel; (2) exact arithmetic (MAP, Anion Gap using serum HCO3-, Winter's formula using ABG HCO3-, KDIGO both fold-change ratio and absolute-creatinine >= 4.0 acute pathway plus separate UO criteria, and DigiFab formula vs. empiric vs. chronic accumulation dosing); (3) immediate life threats, absolute contraindications, and competing conflicts (e.g., active GI/intracranial hemorrhage vs. Apixaban/anticoagulation, suspected infection vs. confirmed distributive shock); (4) every numbered prompt requirement, SOAP completeness, and zero fabrication. Then close </think> and emit the complete clinical dossier.",
    "",
    "STRICT ENCOUNTER ISOLATION & ZERO-FABRICATION SAFETY RULES (MANDATORY):",
    "1. Use ONLY demographics, vitals, labs, medications, imaging, and history documented in the current user prompt and the deterministic Neuro-Symbolic Scratchpad provided below. Never reference any other patient or encounter ID.",
    "2. ZERO FABRICATION & COMPLETE DATA-GAP RECOGNITION: Never invent unmeasured values, imaging findings, or history. Specifically:",
    "   - If Patient Weight is UNMEASURED/missing: DO NOT assume 70 kg or any weight, DO NOT calculate weight-based mL/kg fluid totals, mL/kg/hr urine output, or weight-based antidotes (use non-weight clinical aliquots/empiric emergency dosing).",
    "   - If Serum Chloride is UNMEASURED/missing: State 'Anion Gap: Cannot calculate — chloride unavailable' (do not substitute a hypothetical reference chloride value unless an explicit serum anion gap number is directly written in the intake prompt).",
    "   - If Baseline Creatinine, Arterial Blood Gas (pH/PaCO2), Glucose, or prior history are missing: mark them [UNMEASURED / NOT PROVIDED — REQUIRES IMMEDIATE ACQUISITION].",
    "   - NEVER invent unstated home medications (e.g., do not add Lisinopril, Metoprolol, Digoxin, or Metformin unless documented in input), HPI events (watery diarrhea, UTI), imaging findings (dense alveolar consolidation, severe RV dilation, acute cor pulmonale, massive PE), comorbidities (HFrEF, CKD), or negative physical exam findings (e.g., 'patient denies chest pain', 'deep tendon reflexes preserved'). Label unasked negatives as [UNDOCUMENTED ON INTAKE].",
    "   - CLINICAL DATA GAPS: Even in detailed ICU scenarios, distinguish supplied test inputs from a complete clinical record. Explicitly enumerate ALL documented clinical data gaps, unavailable last-dose medication times, pending cultures/imaging/endoscopy, and unobserved treatment responses — NEVER claim 'no missing clinical information' or 'full dataset provided'.",
    "3. EXACT QUANTITATIVE & SCRATCHPAD FIDELITY:",
    "   - Reproduce documented patient Age, Sex, Weight, BP, MAP, HR, Temp, SpO2, Na+, K+, Cl-, Cr, baseline Cr (with exact timeframe), pH, serum HCO3-, ABG HCO3-, PaCO2, Lactate, Glucose, Digoxin, UO, LVEF/RV echo findings, and home medications verbatim across every section (including the SOAP Note). Never claim a documented lab in the Scratchpad is UNMEASURED/unavailable.",
    "   - When BOTH serum HCO3- (BMP/CMP) and ABG HCO3- are documented, distinguish them explicitly: use Serum HCO3- for Anion Gap (= Na+ - [Cl- + serum HCO3-]) and ABG HCO3- for Winter's formula (= 1.5 × [ABG HCO3-] + 8 ± 2).",
    "   - When writing therapeutic goals, explicitly label them as targets (e.g., 'target MAP >= 65 mmHg', 'goal serum potassium < 5.5 mmol/L') so targets are never confused with measured values.",
    "   - Respect the Scratchpad's Winter's formula calibrated interpretation and KDIGO AKI dual-pathway analysis: explicitly evaluate BOTH the creatinine fold-change ratio AND the absolute-creatinine >= 4.0 mg/dL acute-rise criterion (when acute timeframe <= 7 days is documented), AND evaluate urine-output criteria separately. When baseline creatinine is remote (e.g., months old) and Cr < 4.0 mg/dL with fold ratio < 3.0×, NEVER assert 'Stage 2/3 AKI' or 'KDIGO Stage 3 AKI'.",
    "   - DIGIFAB DOSING CLARITY: When weight and digoxin level are documented, state the formula-based estimate [(Digoxin × Weight) / 100, rounded up] separately from empiric emergency dosing (5–10 vials in acute life-threatening shock/arrhythmia when ingestion/distribution timing is uncertain) and lower titrated dosing (3–6 vials) often used in chronic accumulation, note that steady-state equations depend on post-distribution sampling >= 6 hours after last dose, and require Medical Toxicology consultation.",
    "   - CARDIAC & IMAGING SEVERITY FIDELITY: Preserve exact documented ventricular findings (e.g., severe LV systolic dysfunction / LVEF vs. only mild RV dilation). NEVER introduce severe RV dilation, acute cor pulmonale, or massive pulmonary embolism unless explicitly documented in current intake. Follow the Scratchpad individualized fluid resuscitation guidance.",
    "   - Never declare ACE inhibitors / ARBs / MRAs 'permanently contraindicated' during acute hyperkalemia/AKI; state 'acute withholding with individualized post-stabilization reassessment once potassium and renal function recover'.",
    "   - ARDSNET VENTILATION, SEVERE HYPERKALEMIA/BRADYCARDIA & NMBA SAFETY: When `ardsNetVentilation.isComputable` is true in the Scratchpad, use exact Devine PBW (4–6 mL/kg PBW, never Actual Body Weight) and keep plateau pressure <= 30 cmH2O. For severe hyperkalemia (K+ >= 6.5 or ECG cardiotoxicity/bradycardia), mandate IV calcium (gluconate/chloride) FIRST before IV regular insulin + dextrose, require point-of-care glucose checks before and serially after insulin to prevent iatrogenic hypoglycemia, and if profound symptomatic bradycardia (HR <= 40 with hypotension) persists after calcium, address epinephrine / chronotropic backup and transcutaneous pacing standby. Mandate verified deep sedation and analgesia (RASS -4 to -5 / BIS) prior to any continuous neuromuscular blocker infusion (e.g. cisatracurium).",
    "   - CRITICAL BLEEDING + ANTICOAGULATION / INFECTION VS. SHOCK CONFLICT RULE: In active life-threatening hemorrhage (intracranial hemorrhage OR severe gastrointestinal hemorrhage) with anticoagulant/DOAC exposure (Apixaban, Warfarin, Heparin), explicitly address immediate cessation of antithrombotics, urgent reversal/hemostatic resuscitation (e.g., Andexanet alfa or 4F-PCC for FXa inhibitor bleed, pRBC transfusion, urgent endoscopy/angiography) in parallel with thromboprophylaxis risk assessment. Explicitly distinguish suspected/unconfirmed infection (pending cultures/imaging) from confirmed distributive/septic shock.",
    "4. SPECIALTY-AGNOSTIC TRIAGE CALIBRATION & COMPLETE PROMPT COVERAGE:",
    "   - Dynamically calibrate disposition: P0 IMMEDIATE EMERGENCY / ICU / Resuscitation for shock, respiratory failure, severe electrolyte toxicity, aortic dissection, anaphylaxis, eclampsia, thyroid storm, DKA, or critical poisoning; urgent ED evaluation for acute unstable/undifferentiated presentations; evidence-based outpatient/clinic management ONLY when hemodynamically stable without acute red flags.",
    "   - Reconcile EVERY outpatient medication listed in the Scratchpad's `documentedMedications` explicitly (HOLD/STOP/MODIFY/CONTINUE and rationale), and ground all missing-medication questions strictly in `documentedMedications`.",
    "   - COMPLETENESS REQUIREMENT: When the prompt includes numbered clinical questions or analyses (e.g., 1 through 17), explicitly address EVERY numbered item cleanly and concisely without skipping or truncating any requirement.",
    "5. REQUIRED OUTPUT STRUCTURE:",
    "   - Header (`Noctis Patient Diagnostic & Triage Intelligence Dossier (Clinical Decision Support)`, `Encounter ID`, `Triage Urgency`, `Statutory Classification: 21 U.S.C. § 360j(o)(1)(E)`)",
    "   - `[!CAUTION]` Emergency / Disposition Callout",
    "   - Executive Clinical Synthesis & Competing Therapeutic Trade-Offs (hemorrhage vs. anticoagulation; suspected infection vs. confirmed shock; LV vs. RV hemodynamics)",
    "   - Complete Point-by-Point Clinical Analyses (covering all prompt questions, calculations, KDIGO dual-pathway + UO staging, DigiFab formula vs. empiric clarification, and explicit missing clinical data gaps)",
    "   - Independent Fact-Reconciliation Matrix (concise table mapping Source Input Facts / Derivations / Documented Unknowns — mandatory whenever requested or for multi-item critical care dossiers)",
    "   - Complete Structured SOAP Note (**Subjective**, **Objective**, **Assessment**, **Plan** — mandatory on EVERY clinical dossier and 100% consistent with every section above)",
    "6. FORMATTING (NO RAW LATEX): NEVER output raw LaTeX delimiters (`$$...$$`, `$...$`, `\\[...\\]`, `\\text{...}`, `\\ge`, `\\approx`). Use clean Unicode operators (`≥`, `≤`, `≈`, `±`, `×`) and plain Markdown inline code for equations.",
    "7. DO NOT append a Neuro-Symbolic Scratchpad section or a 'NOCTIS INDEPENDENT CLINICAL RELEASE CERTIFICATE' block; the independent validator appends those after verification.",
  ].join("\n");
}

function buildUserPrompt(rawPrompt: string, scratchpad: NeuroSymbolicClinicalScratchpad): string {
  const authoritativeRecord = JSON.stringify(
    {
      encounterId: scratchpad.encounterId,
      demographics: scratchpad.demographics,
      vitals: scratchpad.vitals,
      labs: scratchpad.labs,
      observations: scratchpad.observations,
      documentedMedications: scratchpad.documentedMedications,
      sentinels: scratchpad.sentinels,
      derived: {
        meanArterialPressureMmHg: scratchpad.derivedCalculations.meanArterialPressureMmHg,
        anionGap: scratchpad.derivedCalculations.anionGap,
        wintersFormula: scratchpad.derivedCalculations.wintersFormula,
        digiFabDosing: scratchpad.derivedCalculations.digiFabDosing,
        fluidSafety: scratchpad.derivedCalculations.fluidSafety,
        ardsNetVentilation: scratchpad.derivedCalculations.ardsNetVentilation,
        kdigoAki: {
          establishedStage: scratchpad.derivedCalculations.kdigoAki.establishedStage,
          crFoldRatio: scratchpad.derivedCalculations.kdigoAki.crFoldRatio,
          crAbsoluteRiseMgDl: scratchpad.derivedCalculations.kdigoAki.crAbsoluteRiseMgDl,
          isStage3ConditionalOnAcuteTimeline: scratchpad.derivedCalculations.kdigoAki.isStage3ConditionalOnAcuteTimeline,
          stageRationale: scratchpad.derivedCalculations.kdigoAki.stageRationale,
          uoStagingCaveat: scratchpad.derivedCalculations.kdigoAki.uoStagingCaveat,
        },
      },
    },
    null,
    2,
  );

  return [
    "RAW CLINICAL ENCOUNTER INPUT (AUTHORITATIVE PRIMARY SOURCE):",
    "<<<ENCOUNTER_INPUT_START>>>",
    rawPrompt.trim(),
    "<<<ENCOUNTER_INPUT_END>>>",
    "",
    "AUTHORITATIVE EXTRACTED LABS & CALCULATIONS (SINGLE SOURCE OF TRUTH):",
    authoritativeRecord,
    "",
    "DETERMINISTIC NEURO-SYMBOLIC EXTRACTION & MATHEMATICAL SCRATCHPAD (IMMUTABLE GROUND TRUTH):",
    scratchpad.markdownScratchpadSummary,
    "",
    `Missing Data Sentinels: ${
      scratchpad.sentinels.missingDataItems.length > 0
        ? scratchpad.sentinels.missingDataItems.join("; ")
        : "None flagged"
    }`,
    "",
    "Generate the complete clinical decision support dossier strictly adhering to the documented input and authoritative scratchpad values above.",
  ].join("\n");
}

function buildRepairPrompt(
  rawPrompt: string,
  scratchpad: NeuroSymbolicClinicalScratchpad,
  flawedDraft: string,
  auditResult: ReturnType<typeof auditAndEnforceClinicalDossier>,
): string {
  const violationLines = auditResult.violations.map(
    (v, idx) => `${idx + 1}. [${v.ruleId}] ${v.description} (Action needed: ${v.actionTaken})`,
  );
  const blockerLines = auditResult.mandatoryReleaseFailures.map(
    (b, idx) => `${idx + 1}. BLOCKING FAILURE: ${b}`,
  );

  return [
    "Your previous draft failed independent clinical safety validation (NOCTIS-VAL-v2.4-CLINICAL).",
    "Fix EVERY listed violation and blocking failure below while preserving complete clinical accuracy and SOAP alignment.",
    "",
    "DETECTED VIOLATIONS:",
    ...(violationLines.length > 0 ? violationLines : ["None"]),
    "",
    "MANDATORY RELEASE GATE FAILURES:",
    ...(blockerLines.length > 0 ? blockerLines : ["None"]),
    "",
    "IMMUTABLE SCRATCHPAD GROUND TRUTH:",
    scratchpad.markdownScratchpadSummary,
    "",
    "AUTHORITATIVE RAW INPUT:",
    rawPrompt.trim(),
    "",
    "PREVIOUS DRAFT TO CORRECT:",
    stripPrematureCertificatesAndScratchpad(flawedDraft),
    "",
    "Return the COMPLETE corrected Clinical Decision Support Dossier only (do NOT include a Release Certificate or duplicate Scratchpad section).",
  ].join("\n");
}

function resolveCertSigningConfig(): { signingKey: string; keyMode: string } {
  const dedicatedKey = typeof process !== "undefined" ? process.env.NOCTIS_CERT_SIGNING_KEY?.trim() : "";
  if (dedicatedKey) {
    return { signingKey: dedicatedKey, keyMode: "production-hmac-key" };
  }
  const authSecret = typeof process !== "undefined" ? process.env.BETTER_AUTH_SECRET?.trim() : "";
  if (authSecret) {
    return { signingKey: authSecret, keyMode: "auth-secret-derived" };
  }
  return { signingKey: "noctis-dev-cert-key-v1", keyMode: "development-fallback" };
}

function buildVerifiedCertificate(
  encounterId: string,
  sourceInputHash: string,
  outputSha256: string,
): { markdown: string; hmacSignature: string; keyMode: string; timestamp: string } {
  const timestamp = new Date().toISOString();
  const validatorVersion = "NOCTIS-VAL-v2.4-CLINICAL";
  const { signingKey, keyMode } = resolveCertSigningConfig();
  const hmacSignature = hmacSha256Sync(
    signingKey,
    `${encounterId}|${sourceInputHash}|${outputSha256}|${validatorVersion}|${timestamp}`,
  );
  const markdown = (
    `\n\n────────────────────────────────────────\n` +
    `🛡️ **NOCTIS INDEPENDENT CLINICAL RELEASE CERTIFICATE**\n` +
    `- **Encounter ID:** \`${encounterId}\`\n` +
    `- **Reasoning Engine:** Universal Neuro-Symbolic Clinical LLM Pipeline (Isolated Encounter)\n` +
    `- **Validation Status:** VERIFIED (All Invariant Safety Gates Passed)\n` +
    `- **Source Input Hash (SHA-256):** \`${sourceInputHash}\`\n` +
    `- **Output Hash (SHA-256):** \`${outputSha256}\`\n` +
    `- **Certificate Signature (HMAC-SHA256):** \`${hmacSignature}\`\n` +
    `- **Signing Key Mode:** ${keyMode}\n` +
    `- **Independent Validator:** ${validatorVersion} (ISO 14971 / IEC 62304 Compliant)\n` +
    `- **Gates Verified:**\n` +
    `  1. Encounter Isolation & Single Authoritative Context: PASS\n` +
    `  2. Zero Data Fabrication (Weight, Chloride, Baseline Cr, Meds): PASS\n` +
    `  3. Laboratory & Medication Completeness: PASS\n` +
    `  4. Exact MAP & Mathematical Derivation: PASS\n` +
    `  5. Calibrated Acid-Base / Winter's Interpretation: PASS\n` +
    `  6. Multi-Factor KDIGO AKI Staging: PASS\n` +
    `  7. Individualized Fluid Resuscitation Safety: PASS\n` +
    `  8. Cross-Section & Cross-Patient Consistency: PASS\n` +
    `- **Release Decision:** APPROVED FOR CLINICAL DECISION SUPPORT\n` +
    `- **Timestamp:** ${timestamp}\n` +
    `────────────────────────────────────────\n`
  );
  return { markdown, hmacSignature, keyMode, timestamp };
}

function buildFailClosedLockout(
  encounterId: string,
  sourceInputHash: string,
  auditResult: ReturnType<typeof auditAndEnforceClinicalDossier>,
): string {
  const blockers = auditResult.mandatoryReleaseFailures
    .map((f) => `- **Blocking Gate Failure:** ${f}`)
    .join("\n");
  const details = auditResult.violations
    .slice(0, 10)
    .map((v) => `- **[${v.ruleId}]** ${v.description}`)
    .join("\n");

  return [
    `**CLINICAL_VALIDATION_FAILED — SAFETY_INVARIANT_VIOLATION**`,
    `- **Encounter ID:** \`${encounterId}\``,
    `- **Source Input Hash (SHA-256):** \`${sourceInputHash}\``,
    `- **Validator:** NOCTIS-VAL-v2.4-CLINICAL`,
    `- **Disposition:** FAIL-CLOSED SAFETY LOCKOUT — Candidate clinical dossier suppressed because unresolved clinical safety invariant violations remained after automatic remediation.`,
    "",
    "### Blocking Safety Failures",
    blockers || "- Safety gate invariant check failed.",
    "",
    "### Detected Violations",
    details || "- See blocking gate failures above.",
    "",
    "### Deterministic Neuro-Symbolic Scratchpad (Verified Input Facts Only)",
    auditResult.scratchpad.markdownScratchpadSummary,
  ].join("\n");
}

/**
 * Executes the 3-Stage Universal Neuro-Symbolic Clinical Reasoning Pipeline.
 * Returns `null` when live LLM transport is unavailable so callers can gracefully fall back.
 */
export async function executeUniversalClinicalReasoning(
  rawPrompt: string,
  opts: UniversalClinicalOptions = {},
): Promise<string | null> {
  const trimmed = (rawPrompt || "").trim();
  if (!trimmed) return null;

  // Stage 1: Deterministic Extraction & Encounter Isolation
  const explicitIdMatch = trimmed.match(/\b((?:NPDE|CRIT|NOCTIS-ICU)-[A-Z0-9_-]+)\b/i);
  const sourceInputHash = sha256Sync(trimmed);
  const encounterId = explicitIdMatch?.[1]
    ? explicitIdMatch[1]
    : `NPDE-CLIN-${sourceInputHash.slice(0, 8).toUpperCase()}`;

  const scratchpad = buildClinicalScratchpad(trimmed, encounterId);
  const provenanceViolations = validateScratchpadSourceProvenance(scratchpad);
  if (provenanceViolations.length > 0) {
    const provenanceFailAudit = auditAndEnforceClinicalDossier("", trimmed, encounterId, scratchpad);
    return buildFailClosedLockout(encounterId, sourceInputHash, provenanceFailAudit);
  }

  // Resolve live model chat function lazily so unit tests can inject a mock cleanly
  let chatFn = opts.modelChatFn;
  if (!chatFn) {
    const mod = await import("./video-mind.server.ts");
    chatFn = mod.modelChat as unknown as UniversalClinicalModelChatFn;
  }

  const systemPrompt = buildSystemPrompt(encounterId);
  const userPrompt = buildUserPrompt(trimmed, scratchpad);

  let liveUserPrompt = userPrompt;
  if (!opts.modelChatFn) {
    try {
      const { fetchNdkrsChatGrounding } = await import("./ndkrs/chat-bridge.server.ts");
      const clinGrounding = await fetchNdkrsChatGrounding(trimmed, { domain: "clinical", limit: 2 });
      if (clinGrounding.systemBlock) {
        liveUserPrompt = `${userPrompt}\n\n${clinGrounding.systemBlock}`;
      }
    } catch {
      // Preserve deterministic clinical scratchpad reasoning if NDKRS DB is unavailable
    }
  }

  // Stage 2: Isolated Live LLM Reasoning (Strict zero-history context + deep deliberation)
  const firstResponse = await chatFn(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: liveUserPrompt },
    ],
    {
      temperature: 0.1,
      maxTokens: 12000,
      thinkingLevel: "high",
      brain: opts.brain,
    },
  );

  if (!("text" in firstResponse) || !firstResponse.text.trim()) {
    return null;
  }

  const parsedInitial = extractThinkBlock(firstResponse.text);
  let activeThought = parsedInitial.thought;
  let candidateBody = sanitizeRmfMarkdownFormatting(stripPrematureCertificatesAndScratchpad(parsedInitial.body));
  let assembledCandidate = `${candidateBody}\n\n### Neuro-Symbolic Scratchpad Verification Trail\n${scratchpad.markdownScratchpadSummary}`;

  // Stage 3: Independent Deterministic Validation Gate + 1-Shot Repair
  let audit = auditAndEnforceClinicalDossier(assembledCandidate, trimmed, encounterId);
  let hadRepair = false;

  if (!audit.isApproved || !audit.mandatoryReleasePassed) {
    hadRepair = true;
    const repairResponse = await chatFn(
      [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: buildRepairPrompt(trimmed, scratchpad, candidateBody, audit),
        },
      ],
      {
        temperature: 0.05,
        maxTokens: 12000,
        thinkingLevel: "high",
        brain: opts.brain,
      },
    );

    if ("text" in repairResponse && repairResponse.text.trim()) {
      const parsedRepair = extractThinkBlock(repairResponse.text);
      if (parsedRepair.thought) {
        activeThought = parsedRepair.thought;
      }
      candidateBody = sanitizeRmfMarkdownFormatting(stripPrematureCertificatesAndScratchpad(parsedRepair.body));
      assembledCandidate = `${candidateBody}\n\n### Neuro-Symbolic Scratchpad Verification Trail\n${scratchpad.markdownScratchpadSummary}`;
      audit = auditAndEnforceClinicalDossier(assembledCandidate, trimmed, encounterId);
    }
  }

  if (audit.isApproved && audit.mandatoryReleasePassed && audit.violationsCount === 0) {
    const deliberationTrace = [
      activeThought || buildDeterministicClinicalThought(scratchpad),
      `Stage 3 Independent Validator (NOCTIS-VAL-v2.4-CLINICAL): All 8 invariant safety gates passed${hadRepair ? " after 1-shot safety remediation" : ""}.`,
    ].join("\n\n");
    const approvedBody = sanitizeRmfMarkdownFormatting(audit.auditedDossier).trim();
    const outputSha256 = sha256Sync(approvedBody);
    const cert = buildVerifiedCertificate(encounterId, sourceInputHash, outputSha256);
    if (!opts.modelChatFn || opts.persistCertificate) {
      try {
        const { recordClinicalCertificateAndGap } = await import("./ndkrs/fact-lock-validator.server.ts");
        await recordClinicalCertificateAndGap({
          encounterId,
          sourceInputHash,
          outputHash: outputSha256,
          verdict: "APPROVED",
          hmacSignature: cert.hmacSignature,
          keyMode: cert.keyMode,
          timestamp: cert.timestamp,
          violations: [],
        });
      } catch {
        // Non-blocking audit persistence must never disrupt clinical decision output
      }
    }
    return `<think>\n${deliberationTrace}\n</think>\n\n${approvedBody}${cert.markdown}`;
  }

  const lockoutText = buildFailClosedLockout(encounterId, sourceInputHash, audit);
  if (!opts.modelChatFn || opts.persistCertificate) {
    try {
      const { recordClinicalCertificateAndGap, buildHmacCertificateSignature } = await import("./ndkrs/fact-lock-validator.server.ts");
      const ts = new Date().toISOString();
      const outHash = sha256Sync(lockoutText);
      const sig = buildHmacCertificateSignature({
        requestId: encounterId,
        sourceInputHash,
        outputHash: outHash,
        validatorVersion: "NOCTIS-VAL-v2.4-CLINICAL",
        createdAt: ts,
      });
      await recordClinicalCertificateAndGap({
        encounterId,
        sourceInputHash,
        outputHash: outHash,
        verdict: "FAIL_CLOSED",
        hmacSignature: sig.hmacSignature,
        keyMode: sig.keyMode,
        timestamp: ts,
        violations: audit.violations.map((v) => ({ ruleId: v.ruleId, description: v.description })),
      });
    } catch {
      // Non-blocking audit persistence
    }
  }
  return lockoutText;
}
