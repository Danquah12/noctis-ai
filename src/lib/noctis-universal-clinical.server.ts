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
  type NeuroSymbolicClinicalScratchpad,
} from "./noctis-clinical-scratchpad.ts";
import { auditAndEnforceClinicalDossier } from "./noctis-clinical-preflight-auditor.ts";
import { sha256Sync } from "./universal-crypto.ts";

export interface UniversalBrainOptions {
  provider?: string;
  apiKey?: string;
  model?: string;
  endpoint?: string;
}

export type UniversalClinicalModelChatFn = (
  messages: { role: string; content: string }[],
  opts?: { maxTokens?: number; temperature?: number; brain?: UniversalBrainOptions },
) => Promise<{ text: string } | { error: string }>;

export interface UniversalClinicalOptions {
  brain?: UniversalBrainOptions;
  modelChatFn?: UniversalClinicalModelChatFn;
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
    "STRICT ENCOUNTER ISOLATION & ZERO-FABRICATION SAFETY RULES (MANDATORY):",
    "1. Use ONLY demographics, vitals, labs, medications, imaging, and history documented in the current user prompt and the deterministic Neuro-Symbolic Scratchpad provided below. Never reference any other patient or encounter ID.",
    "2. ZERO FABRICATION: Never invent unmeasured values. Specifically:",
    "   - If Patient Weight is UNMEASURED/missing: DO NOT assume 70 kg or any weight, DO NOT calculate weight-based mL/kg fluid totals, mL/kg/hr urine output, or weight-based antidotes (use non-weight clinical aliquots/empiric emergency dosing).",
    "   - If Serum Chloride is UNMEASURED/missing: State 'Anion Gap: Cannot calculate — chloride unavailable' (do not substitute reference chloride 98 mmol/L unless an explicit serum anion gap number is directly written in the intake prompt).",
    "   - If Baseline Creatinine, Arterial Blood Gas (pH/PaCO2), Glucose, or prior history are missing: mark them [UNMEASURED / NOT PROVIDED — REQUIRES IMMEDIATE ACQUISITION].",
    "   - NEVER invent unstated home medications (e.g., do not add Lisinopril, Metoprolol, Digoxin, or Metformin unless documented in input), HPI events (watery diarrhea, UTI), imaging findings (dense alveolar consolidation), comorbidities (HFrEF, CKD), or negative physical exam findings (e.g., 'patient denies chest pain', 'deep tendon reflexes preserved'). Label unasked negatives as [UNDOCUMENTED ON INTAKE].",
    "3. EXACT QUANTITATIVE & SCRATCHPAD FIDELITY:",
    "   - Reproduce documented patient Age, Sex, BP, MAP, HR, Temp, SpO2, K+, Cr, pH, HCO3-, PaCO2, Lactate, Digoxin, and home medications verbatim across every section (including the SOAP Note).",
    "   - When writing therapeutic goals, explicitly label them as targets (e.g., 'target MAP >= 65 mmHg', 'goal serum potassium < 5.5 mmol/L') so targets are never confused with measured values.",
    "   - Respect the Scratchpad's Winter's formula calibrated interpretation (if borderline compensation, say 'possible inadequate respiratory compensation / borderline relative hypoventilation', never 'definitive respiratory acidosis') and KDIGO AKI stage + timeline caveats.",
    "   - Never contradict the Scratchpad fluid safety guidance. In acute shock with no documented systolic heart failure or pulmonary edema, individualized balanced crystalloids are permissible; in massive PE / RV dilation / cor pulmonale / HFrEF, enforce cautious small aliquots (250-500 mL) and early vasopressor support.",
    "   - Never declare ACE inhibitors / ARBs / MRAs 'permanently contraindicated' during acute hyperkalemia/AKI; state 'acute withholding with individualized post-stabilization reassessment once potassium and renal function recover'.",
    "4. SPECIALTY-AGNOSTIC TRIAGE CALIBRATION:",
    "   - Dynamically calibrate disposition: P0 IMMEDIATE EMERGENCY / ICU / Resuscitation for shock, respiratory failure, severe electrolyte toxicity, aortic dissection, anaphylaxis, eclampsia, thyroid storm, DKA, or critical poisoning; urgent ED evaluation for acute unstable/undifferentiated presentations; evidence-based outpatient/clinic management ONLY when hemodynamically stable without acute red flags.",
    "   - Reconcile EVERY outpatient medication listed in the prompt explicitly (HOLD/STOP/MODIFY/CONTINUE and rationale).",
    "   - Preserve every documented symptom, lab, and imaging phrase accurately in both assessment and Objective SOAP sections.",
    "5. REQUIRED OUTPUT STRUCTURE:",
    "   - Header (`Noctis Patient Diagnostic & Triage Intelligence Dossier (Clinical Decision Support)`, `Encounter ID`, `Triage Urgency`, `Statutory Classification: 21 U.S.C. § 360j(o)(1)(E)`)",
    "   - `[!CAUTION]` Emergency / Disposition Callout",
    "   - Executive Clinical Synthesis & Primary Working Diagnoses",
    "   - Quantitative Physiologic & Organ-System Integration (integrating Scratchpad calculations cleanly)",
    "   - Specialty Pharmacotherapy, Resuscitation & Medication Reconciliation",
    "   - Immediate Diagnostic Workup, Monitoring & Contingency Plan",
    "   - Complete Structured SOAP Note (Subjective, Objective, Assessment, Plan — internally consistent with every section above)",
    "6. DO NOT append a Neuro-Symbolic Scratchpad section or a 'NOCTIS INDEPENDENT CLINICAL RELEASE CERTIFICATE' block; the independent validator appends those after verification.",
  ].join("\n");
}

function buildUserPrompt(rawPrompt: string, scratchpad: NeuroSymbolicClinicalScratchpad): string {
  return [
    "RAW CLINICAL ENCOUNTER INPUT (AUTHORITATIVE PRIMARY SOURCE):",
    "<<<ENCOUNTER_INPUT_START>>>",
    rawPrompt.trim(),
    "<<<ENCOUNTER_INPUT_END>>>",
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
    "Generate the complete clinical decision support dossier strictly adhering to the documented input and scratchpad values above.",
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

function buildVerifiedCertificate(encounterId: string, sourceInputHash: string): string {
  return (
    `\n\n────────────────────────────────────────\n` +
    `🛡️ **NOCTIS INDEPENDENT CLINICAL RELEASE CERTIFICATE**\n` +
    `- **Encounter ID:** \`${encounterId}\`\n` +
    `- **Reasoning Engine:** Universal Neuro-Symbolic Clinical LLM Pipeline (Isolated Encounter)\n` +
    `- **Validation Status:** VERIFIED (All Invariant Safety Gates Passed)\n` +
    `- **Source Input Hash (SHA-256):** \`${sourceInputHash}\`\n` +
    `- **Independent Validator:** NOCTIS-VAL-v2.4-CLINICAL (ISO 14971 / IEC 62304 Compliant)\n` +
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
    `- **Timestamp:** ${new Date().toISOString()}\n` +
    `────────────────────────────────────────\n`
  );
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

  // Resolve live model chat function lazily so unit tests can inject a mock cleanly
  let chatFn = opts.modelChatFn;
  if (!chatFn) {
    const mod = await import("./video-mind.server.ts");
    chatFn = mod.modelChat as unknown as UniversalClinicalModelChatFn;
  }

  const systemPrompt = buildSystemPrompt(encounterId);
  const userPrompt = buildUserPrompt(trimmed, scratchpad);

  // Stage 2: Isolated Live LLM Reasoning (Strict zero-history context)
  const firstResponse = await chatFn(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    {
      temperature: 0.1,
      maxTokens: 4096,
      brain: opts.brain,
    },
  );

  if (!("text" in firstResponse) || !firstResponse.text.trim()) {
    return null;
  }

  let candidateBody = stripPrematureCertificatesAndScratchpad(firstResponse.text);
  let assembledCandidate = `${candidateBody}\n\n### Neuro-Symbolic Scratchpad Verification Trail\n${scratchpad.markdownScratchpadSummary}`;

  // Stage 3: Independent Deterministic Validation Gate + 1-Shot Repair
  let audit = auditAndEnforceClinicalDossier(assembledCandidate, trimmed, encounterId);

  if (!audit.isApproved || !audit.mandatoryReleasePassed) {
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
        maxTokens: 4096,
        brain: opts.brain,
      },
    );

    if ("text" in repairResponse && repairResponse.text.trim()) {
      candidateBody = stripPrematureCertificatesAndScratchpad(repairResponse.text);
      assembledCandidate = `${candidateBody}\n\n### Neuro-Symbolic Scratchpad Verification Trail\n${scratchpad.markdownScratchpadSummary}`;
      audit = auditAndEnforceClinicalDossier(assembledCandidate, trimmed, encounterId);
    }
  }

  if (audit.isApproved && audit.mandatoryReleasePassed) {
    return `${audit.auditedDossier.trim()}${buildVerifiedCertificate(encounterId, sourceInputHash)}`;
  }

  return buildFailClosedLockout(encounterId, sourceInputHash, audit);
}
