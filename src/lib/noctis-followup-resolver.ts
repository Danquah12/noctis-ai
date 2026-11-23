export type FollowUpRelation =
  | "standalone"
  | "new_clinical_encounter"
  | "same_patient_followup"
  | "coreference"
  | "point_expansion"
  | "depth_or_format_shift"
  | "what_if_parameter_shift"
  | "verification_or_challenge"
  | "continuation"
  | "document_followup";

export type FollowUpDomainTag =
  | "clinical"
  | "rmf_grc"
  | "dod_ic"
  | "cve_cyber"
  | "coding"
  | "legal"
  | "finance"
  | "scripture"
  | "science"
  | "general";

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
  images?: string[];
}

export interface ReferencedPoint {
  index: number;
  title: string;
  detail: string;
}

export interface CarriedAttachment {
  filename: string;
  content: string;
}

export interface FollowUpResolution {
  isFollowUp: boolean;
  relation: FollowUpRelation;
  topicShiftDetected: boolean;
  shouldIsolateEncounter: boolean;
  activeSubject: string;
  activeDomain: FollowUpDomainTag;
  resolvedEntities: string[];
  referencedPoint: ReferencedPoint | null;
  carriedAttachment: CarriedAttachment | null;
  standaloneQuery: string;
  systemContinuityDirective: string;
}

const ORDINAL_INDEX: Record<string, number> = {
  "1": 1,
  "1st": 1,
  one: 1,
  first: 1,
  "2": 2,
  "2nd": 2,
  two: 2,
  second: 2,
  "3": 3,
  "3rd": 3,
  three: 3,
  third: 3,
  "4": 4,
  "4th": 4,
  four: 4,
  fourth: 4,
  "5": 5,
  "5th": 5,
  five: 5,
  fifth: 5,
  "6": 6,
  "6th": 6,
  six: 6,
  sixth: 6,
  "7": 7,
  "7th": 7,
  seven: 7,
  seventh: 7,
  "8": 8,
  "8th": 8,
  eight: 8,
  eighth: 8,
  "9": 9,
  "9th": 9,
  nine: 9,
  ninth: 9,
  "10": 10,
  "10th": 10,
  ten: 10,
  tenth: 10,
};

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into", "what", "how", "why",
  "when", "where", "who", "does", "did", "can", "could", "would", "should", "will",
  "about", "more", "some", "have", "has", "had", "been", "being", "are", "was",
  "were", "its", "their", "they", "them", "these", "those", "your", "please", "explain",
  "tell", "make", "give", "show", "write", "compare", "create", "build", "using",
]);

function stripAttachmentBlock(raw: string): string {
  return (raw || "")
    .replace(/\n+---\s+[^\n]+?\s+---\n[\s\S]*$/g, "")
    .replace(/\[Image:[^\]]*\]/gi, "")
    .trim();
}

/**
 * Removes hidden reasoning envelopes (<think>) and noisy verification footers
 * so multi-turn LLM message history stays clean, dense, and unpolluted.
 */
export function cleanAssistantTurnForHistory(raw: string, maxChars = 6000): string {
  if (!raw || typeof raw !== "string") return "";
  const withoutThink = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<think>[\s\S]*$/gi, "");

  const withoutFooter = withoutThink
    .split(
      /\n\s*(?:---\s*\n\s*\*{0,2}(?:Deterministic RMF Verification|NDKRS Verified Knowledge Grounding|NDIMP Verification|Enterprise Verification)\b|\*{0,2}(?:Deterministic RMF Verification|NDKRS Verified Knowledge Grounding)\b|Claim standing:|Evidence status:|Evidence strength:|Pre-Delivery Check:)/i,
    )[0]!;

  const collapsed = withoutFooter
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (collapsed.length <= maxChars) return collapsed;
  return `${collapsed.slice(0, Math.max(0, maxChars - 16)).trimEnd()}\n[...truncated]`;
}

/**
 * Cleans conversation turns before passing them to multi-turn engines or LLMs.
 * User turns preserve exact inputs, numbers, images, and attachments; assistant turns
 * strip <think> traces and repetitive grounding footers.
 */
export function cleanTurnsForHistory<T extends ConversationTurn>(turns: T[], maxTurns = 24): T[] {
  const sliced = turns.slice(-maxTurns);
  let lastAssistantIdx = -1;
  for (let i = sliced.length - 1; i >= 0; i--) {
    if (sliced[i]?.role === "assistant") {
      lastAssistantIdx = i;
      break;
    }
  }
  return sliced.map((turn, idx) => {
    if (turn.role !== "assistant") return turn;
    const limit = idx === lastAssistantIdx ? 10000 : 4500;
    return {
      ...turn,
      content: cleanAssistantTurnForHistory(turn.content, limit),
    };
  });
}

/**
 * Extracts structured numbered/bulleted points from an assistant turn strictly
 * after removing <think> envelopes and verification footers.
 */
export function extractAssistantPoints(rawAssistantText: string): ReferencedPoint[] {
  const cleaned = cleanAssistantTurnForHistory(rawAssistantText, 16000)
    .replace(/```[\s\S]*?```/g, "\n");
  if (!cleaned) return [];

  const points: ReferencedPoint[] = [];
  const seenIdx = new Set<number>();
  const lines = cleaned.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const boldNum = trimmed.match(/^(\d{1,2})[.)]\s+\*\*([^*]+)\*\*[:\s—-]*(.*)$/);
    const headingNum = !boldNum ? trimmed.match(/^#{2,4}\s*(?:Step\s+|Phase\s+|Stage\s+|Layer\s+)?(\d{1,2})[.):]?\s+(.+)$/i) : null;
    const stepBoldNum = !boldNum && !headingNum ? trimmed.match(/^(?:Step|Phase|Stage|Layer)\s+(\d{1,2})[:.)]\s+\*\*([^*]+)\*\*[:\s—-]*(.*)$/i) : null;
    const colonNum = !boldNum && !headingNum && !stepBoldNum ? trimmed.match(/^(\d{1,2})[.)]\s+([^:\n]{2,72}):\s*(.*)$/) : null;
    const plainNum = !boldNum && !headingNum && !stepBoldNum && !colonNum ? trimmed.match(/^(\d{1,2})[.)]\s+(.{4,180})$/) : null;

    let idx = 0;
    let title = "";
    let detail = "";

    if (boldNum) {
      idx = Number(boldNum[1]);
      title = boldNum[2]!.replace(/[:.\s—-]+$/, "").trim();
      detail = boldNum[3]!.trim();
    } else if (headingNum) {
      idx = Number(headingNum[1]);
      title = headingNum[2]!.replace(/\*\*/g, "").replace(/[:.\s—-]+$/, "").trim();
    } else if (stepBoldNum) {
      idx = Number(stepBoldNum[1]);
      title = stepBoldNum[2]!.replace(/[:.\s—-]+$/, "").trim();
      detail = stepBoldNum[3]!.trim();
    } else if (colonNum) {
      idx = Number(colonNum[1]);
      title = colonNum[2]!.replace(/\*\*/g, "").replace(/[:.\s—-]+$/, "").trim();
      detail = colonNum[3]!.trim();
    } else if (plainNum) {
      idx = Number(plainNum[1]);
      const full = plainNum[2]!.replace(/\*\*/g, "").trim();
      const splitIdx = full.search(/[.:]\s+/);
      if (splitIdx > 2 && splitIdx < 68) {
        title = full.slice(0, splitIdx).trim();
        detail = full.slice(splitIdx + 1).trim();
      } else {
        title = full.slice(0, 72).trim();
        detail = full;
      }
    }

    if (idx >= 1 && idx <= 50 && title && !seenIdx.has(idx)) {
      seenIdx.add(idx);
      points.push({ index: idx, title, detail: detail.slice(0, 260) });
    }
  }

  if (points.length === 0) {
    let bulletIdx = 1;
    for (const line of lines) {
      const m = line.trim().match(/^[-*•]\s+\*\*([^*]{3,72})\*\*[:\s—-]*(.*)$/);
      if (m) {
        points.push({
          index: bulletIdx++,
          title: m[1]!.trim(),
          detail: (m[2] || "").trim().slice(0, 260),
        });
      }
    }
  }

  return points.sort((a, b) => a.index - b.index);
}

/**
 * Walks prior user turns newest-first for uploaded document blocks (`--- filename ---`).
 */
export function extractCarriedAttachment(priorTurns: ConversationTurn[]): CarriedAttachment | null {
  for (let i = priorTurns.length - 1; i >= 0; i--) {
    const turn = priorTurns[i];
    if (!turn || turn.role !== "user" || !turn.content) continue;
    const match = turn.content.match(/\n+---\s+([^\n]+?)\s+---\n([\s\S]+)$/);
    if (match && match[2] && match[2].trim().length > 20) {
      return {
        filename: match[1]!.trim().slice(0, 120),
        content: match[2].trim().slice(0, 12000),
      };
    }
  }
  return null;
}

function detectDomainTag(text: string): FollowUpDomainTag {
  const sample = (text || "").slice(0, 6000);
  if (
    /\b(?:DoDI\s*85\d{2}\.\d{2}|DoD\s+85\d{2}|ICD\s*50[123]|CNSSI\s*1253|DISA\s+STIG|STIG\s+V-\d+|V-\d{6}|CCI-\d{6}|SCAP|XCCDF|ACAS|\.nessus|eMASS|SIPR|JWICS|SCIF|NSM-8|ZTMM|DoD\s+7-Pillar|Top\s+Secret)\b/i.test(
      sample,
    )
  ) {
    return "dod_ic";
  }
  if (
    /\b(?:NIST\s+(?:SP\s*)?800-(?:53|37|30|171)|FedRAMP|CMMC|FIPS\s*(?:199|200)|OSCAL|POA&M|POAM|\bRMF\b|Authorizing\s+Official|3PAO|SSP|SAR|\bATO\b)\b/i.test(
      sample,
    ) ||
    /\b(?:AC|AT|AU|CA|CM|CP|IA|IR|MA|MP|PE|PL|PM|PS|PT|RA|SA|SC|SI|SR)-\d{1,2}(?:\(\d{1,2}\))?(?![A-Za-z0-9_])/.test(sample)
  ) {
    return "rmf_grc";
  }
  if (
    /\[Patient Diagnostic Intake Encounter\]|\bEncounter(?:\s+ID)?:\s*NPDE-[A-Z0-9-]+|\bNOCTIS-ICU-CRIT-\d+/i.test(sample) ||
    (/\b(?:patient|female|male|years?-old|yo|y\/o|potassium|hyperkalemia|creatinine|troponin|sepsis|septic\s+shock|tachycardia|bradycardia|hypotension|ecg|ekg|lisinopril|norepinephrine|vasopressor|AKI|resuscitation|triage)\b|\b\d{1,3}\s*[MF]\b(?![A-Za-z])/i.test(
      sample,
    ) &&
      (/\b(?:bp|blood\s+pressure|hr|rr|spo2|mmhg|mmol\/l|meq\/l|mg\/dl|creatinine|cr|t\s*waves|peaked|dose|hold)\b/i.test(sample) ||
        /\bK\+(?!\w)/i.test(sample)))
  ) {
    return "clinical";
  }
  if (
    /\bCVE-\d{4}-\d{4,7}\b/i.test(sample) ||
    /\b(?:mTLS|mutual\s+TLS|TLS\s+1\.[23]|Zero[- ]Trust|OCSP|CRL|ransomware|exploit|vulnerabilit\w*|MITRE\s+ATT&CK|SSRF|SQLi|XSS|CSRF|OAuth\s*2\.0|JWT|PKI|certificate\s+authority|CWE-\d+|SOC\s+triage|SIEM|EDR)\b/i.test(
      sample,
    )
  ) {
    return "cve_cyber";
  }
  if (
    /```[a-z0-9+#_-]+/i.test(sample) ||
    /\b(?:TypeScript|JavaScript|Python|React|Golang|Rust|SQL\s+query|microservice|Kubernetes|Docker|PostgreSQL|unit\s+test|refactor|async|interface\s+[A-Z]|function\s+[a-zA-Z0-9_]+)\b/i.test(
      sample,
    )
  ) {
    return "coding";
  }
  if (/\b(?:NDA|non-compete|indemnif\w*|liability\s+cap|arbitration|governing\s+law|jurisdiction|statute|plaintiff|defendant|fiduciary|contract\s+clause|termination\s+clause)\b/i.test(sample)) {
    return "legal";
  }
  if (/\b(?:WACC|DCF|discounted\s+cash\s+flow|EBITDA|10-K|10-Q|free\s+cash\s+flow|NPV|ASC\s*606|working\s+capital|valuation)\b/i.test(sample)) {
    return "finance";
  }
  if (/\b(?:Genesis|Exodus|Psalms?|Proverbs|Isaiah|Matthew|Mark|Luke|John|Romans|Corinthians|Revelation)\s+\d+:\d+|\b(?:scripture|gospel|theology|exegesis)\b/i.test(sample)) {
    return "scripture";
  }
  if (/\b(?:CRISPR|Cas9|Schwarzschild|de\s+Broglie|Henderson-?Hasselbalch|Lorentz\s+factor|Reynolds\s+number|Ohm'?s\s+law|thermodynamic|quantum)\b/i.test(sample)) {
    return "science";
  }
  return "general";
}

function extractEntitiesFromText(text: string): string[] {
  const sample = (text || "").slice(0, 4000);
  const found: string[] = [];
  const seen = new Set<string>();
  const add = (raw: string) => {
    const val = raw.replace(/\s+/g, " ").trim();
    if (!val || val.length < 2 || val.length > 64) return;
    const key = val.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    found.push(val);
  };

  const patterns: RegExp[] = [
    /\bCVE-\d{4}-\d{4,7}\b/gi,
    /\b(?:NIST\s+(?:SP\s*)?800-\d+[A-Z]?|DoDI\s*85\d{2}\.\d{2}|ICD\s*50[123]|CNSSI\s*1253|FIPS\s*(?:199|200)|CWE-\d+|V-\d{6}|CCI-\d{6})\b/gi,
    /\b(?:AC|AT|AU|CA|CM|CP|IA|IR|MA|MP|PE|PL|PM|PS|PT|RA|SA|SC|SI|SR)-\d{1,2}(?:\(\d{1,2}\))?(?![A-Za-z0-9_])/g,
    /\b(?:mutual\s+TLS(?:\s*\(mTLS\))?|mTLS|OAuth\s*2\.0|TLS\s*1\.[23]|Zero[- ]Trust|OCSP|CRL|PKI|FedRAMP|CMMC|OSCAL|POA&M|PostgreSQL|Redis|Kubernetes|TypeScript|Python|React|JavaScript|CRISPR)(?![A-Za-z0-9_])/gi,
  ];

  for (const pat of patterns) {
    for (const m of sample.match(pat) || []) {
      add(m);
      if (found.length >= 10) return found;
    }
  }
  return found;
}

function extractCleanSubject(question: string, entities: string[]): string {
  if (entities[0] && /^CVE-\d{4}-\d{4,7}$/i.test(entities[0])) {
    return entities[0].toUpperCase();
  }

  let q = stripAttachmentBlock(question)
    .replace(/^(?:in\s+(?:\d+|one|two|three|four|five)\s+(?:concise\s+|short\s+|brief\s+)?(?:sentences?|paragraphs?|bullets?|bullet\s+points?|lines?|words?|steps?)\s*[,:-]?\s*)/i, "")
    .replace(/^(?:(?:briefly|concisely|simply|step\s+by\s+step)\s*[,:-]?\s*)/i, "")
    .replace(/^(?:please\s+|can\s+you\s+|could\s+you\s+|would\s+you\s+)/i, "")
    .replace(
      /^(?:tell\s+me(?:\s+more)?\s+about|explain(?:\s+to\s+me)?(?:\s+(?:how|why|what))?|describe|summarize|summarise|analyze|analyse|compare|interpret|elaborate\s+on|walk\s+me\s+through|break\s+down|investigate|audit|assess|what(?:\s+(?:is|are|was|were))?|who(?:\s+(?:is|are|was|were))?|how(?:\s+(?:does|do|did|can|to))?|why(?:\s+(?:does|do|did|is|are))?|write(?:\s+(?:a|an|the))?|create(?:\s+(?:a|an|the))?|design(?:\s+(?:a|an|the))?|build(?:\s+(?:a|an|the))?|review)\s+/i,
      "",
    )
    .replace(/\s+(?:in\s+\d+\s+(?:numbered\s+|concise\s+)?(?:steps?|bullets?|sentences?|paragraphs?))$/i, "")
    .replace(/[?!.]+$/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (q.length > 76) {
    const firstClause = q.split(/\s+(?:authenticates?|works?|works\b|protects?|and\s+how|and\s+why|while)\s+/i)[0]?.trim();
    if (firstClause && firstClause.length >= 6 && firstClause.length <= 76) {
      q = firstClause;
    } else {
      q = q.slice(0, 72).replace(/\s+\S*$/, "").trim();
    }
  }

  if (entities[0] && entities[0].length >= 3) {
    if (!q || q.length < 4) return entities[0];
    if (q.toLowerCase().includes(entities[0].toLowerCase()) && entities[0].length <= 36 && q.split(/\s+/).length > 5) {
      return entities[0];
    }
  }

  return q || entities[0] || "previous topic";
}

function hasExplicitClinicalIntakeSignals(text: string): boolean {
  if (/\[Patient Diagnostic Intake Encounter\]|\bEncounter(?:\s+ID)?:\s*NPDE-[A-Z0-9-]+|\bNOCTIS-ICU-CRIT-\d+/i.test(text)) {
    return true;
  }
  const hasDemographics =
    /\b\d{1,3}[-\s]?(?:year-old|years?-old|yo|y\/o|mo|month-old)\b/i.test(text) ||
    /\b\d{1,3}\s*[MF]\b(?![A-Za-z])/.test(text) ||
    /\bPatient\s+[B-Z2-9]\b/i.test(text) ||
    (/\bPatient\s+A\b/i.test(text) && /\b(?:bp|blood\s+pressure|potassium|creatinine|hr|rr|spo2|fever)\b/i.test(text));
  const hasVitalsOrLabs =
    /\b(?:bp|blood\s+pressure)\s*[:=]?\s*\d{2,3}\s*\/\s*\d{2,3}\b/i.test(text) ||
    ((/\b(?:hr|heart\s+rate|rr|spo2|temp|temperature|fever|potassium|creatinine|cr|sodium|troponin|lactate)\b/i.test(text) ||
      /\bK\+(?!\w)/i.test(text)) &&
      /\d/.test(text));
  return hasDemographics && hasVitalsOrLabs;
}

function hasDistinctPatientDemographics(priorText: string, currentText: string): boolean {
  if (/\[Patient Diagnostic Intake Encounter\]|\bEncounter(?:\s+ID)?:\s*NPDE-[A-Z0-9-]+|\bNOCTIS-ICU-CRIT-\d+/i.test(currentText)) {
    return true;
  }
  if (!hasExplicitClinicalIntakeSignals(currentText)) {
    return false;
  }
  const priorAgeMatch = priorText.match(/\b(\d{1,3})(?:[-\s]?(?:year-old|yo|y\/o)|(?=[MF]\b))/i);
  const curAgeMatch = currentText.match(/\b(\d{1,3})(?:[-\s]?(?:year-old|yo|y\/o)|(?=[MF]\b))/i);
  if (priorAgeMatch && curAgeMatch && priorAgeMatch[1] !== curAgeMatch[1]) {
    return true;
  }
  if (/\bPatient\s+([B-Z2-9])\b/i.test(currentText) && /\bPatient\s+A\b/i.test(priorText)) {
    return true;
  }
  // Any fresh full vignette (age/sex + vitals/BP) in a new message indicates a new patient case
  return true;
}

function hasAnaphoricPronoun(question: string): boolean {
  const withoutDummyIt = question
    .replace(
      /\bit\s+(?:is|was|would\s+be|may\s+be|might\s+be|can\s+be|seems|appears|takes|costs|helps)\s+(?:important|better|best|possible|necessary|essential|hard|easy|common|safe|unsafe|good|bad|true|false|worth|useful)\b/gi,
      " ",
    )
    // Intrasentential possessive after an explicitly introduced subject ("What is AC-2 and its FedRAMP requirements?")
    .replace(
      /\b[A-Za-z0-9][A-Za-z0-9().\-/]{2,}(?:\s+[A-Za-z0-9().\-/]{2,}){0,5}\s+(?:and|with|for)\s+(?:its|their)\b/gi,
      " ",
    );

  if (/\b(it|its|them|they|their|these|those|the\s+above|the\s+previous|the\s+former|the\s+latter|same\s+thing|both)\b/i.test(withoutDummyIt)) {
    return true;
  }

  // Demonstrative "that" / "this" (not relative clause "function that ..." or "this error: ...")
  if (
    /\b(?:about|explain|compare|verify|check|fix|patch|refactor|summarize|summarise|expand|revise|audit|apply|convert|turn|put|format|translate|in|on|for|with|from|to|is|was|does|can|will|why\s+is|how\s+does|what\s+does|what\s+if)\s+(?:that|this)\b(?![\s\w]{0,20}:)/i.test(
      withoutDummyIt,
    ) ||
    /\b(?:that|this)\s+(?:approach|method|option|design|architecture|control|rule|mechanism|protocol|code|function|script|implementation|case|value|result|one)\b/i.test(
      withoutDummyIt,
    ) ||
    /\b(?:that|this)[.?!]*$/i.test(withoutDummyIt.trim())
  ) {
    return true;
  }

  return false;
}

function hasSubstantiveUnrelatedTopic(
  question: string,
  priorText: string,
  currentEntities: string[],
  priorEntities: string[],
  currentDomain: FollowUpDomainTag,
  priorDomain: FollowUpDomainTag,
): boolean {
  // Different explicit CVE/NIST control or explicit domain switch with no follow-up/anaphoric cues
  const priorEntityLowers = new Set(priorEntities.map((e) => e.toLowerCase()));
  const priorLower = priorText.toLowerCase();

  for (const ent of currentEntities) {
    if (/^CVE-\d{4}-\d{4,7}$/i.test(ent) && !priorEntityLowers.has(ent.toLowerCase())) {
      return true;
    }
  }

  if (currentDomain !== "general" && priorDomain !== "general" && currentDomain !== priorDomain) {
    if (!/\b(it|its|that|this|they|them|based\s+on\s+that|for\s+this|in\s+that\s+case)\b/i.test(question)) {
      return true;
    }
  }

  const contentWords = question
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));

  if (contentWords.length >= 4) {
    const overlapCount = contentWords.filter((w) => priorLower.includes(w)).length;
    if (overlapCount === 0) {
      return true;
    }
  }

  return false;
}

function buildStandaloneQuery(
  question: string,
  subject: string,
  referencedPoint: ReferencedPoint | null,
  priorEntities: string[],
): string {
  const cleanQ = stripAttachmentBlock(question).trim();
  const cleanSubject = subject.trim();
  if (!cleanSubject || cleanSubject === "previous topic") return cleanQ;

  const subjectCore = cleanSubject.replace(/\s*\([^)]+\)$/, "").trim() || cleanSubject;
  const pointSuffix = referencedPoint && !cleanQ.toLowerCase().includes(referencedPoint.title.toLowerCase())
    ? ` [${referencedPoint.title}]`
    : "";

  const parenAcronym = cleanSubject.match(/\(([A-Za-z0-9-]{2,16})\)$/)?.[1] || "";
  const primaryId = priorEntities.find((e) => /^CVE-\d{4}-\d{4,7}$/i.test(e)) || "";

  const alreadyMentionsSubject =
    cleanQ.toLowerCase().includes(subjectCore.toLowerCase()) ||
    (parenAcronym.length >= 2 && cleanQ.toLowerCase().includes(parenAcronym.toLowerCase())) ||
    (primaryId.length >= 3 && cleanQ.toLowerCase().includes(primaryId.toLowerCase()));

  if (!alreadyMentionsSubject) {
    let rewritten = cleanQ;
    let replaced = false;

    // Replace non-possessive anaphoric "it" / "them" / "that" when grammatical
    const safeDummyMask = rewritten.replace(
      /\bit\s+(?:is|was|would\s+be|may\s+be|might\s+be|can\s+be|seems|appears|takes|costs|helps)\s+(?:important|better|best|possible|necessary|essential|hard|easy|common|safe|unsafe|good|bad|true|false|worth|useful)\b/gi,
      (m) => `__DUMMY_${m.replace(/\s+/g, "_")}__`,
    );

    const substituted = safeDummyMask
      .replace(
        /\b(?:about|for|with|from|to|patch|fix|compare|explain|use|using|deploy|test|audit|verify|check|into|than|of)\s+(it|them)\b/gi,
        (full, pron) => {
          replaced = true;
          return full.slice(0, full.length - pron.length) + subjectCore;
        },
      )
      .replace(
        /\b(?:does|do|did|is|are|was|were|can|could|would|will|should)\s+(it|they)\b/gi,
        (full, pron) => {
          replaced = true;
          return full.slice(0, full.length - pron.length) + subjectCore;
        },
      );

    rewritten = substituted.replace(/__DUMMY_([^_]+(?:_[^_]+)*)__/g, (m) =>
      m.slice(8, -2).replace(/_/g, " "),
    );

    if (replaced) {
      const combined = `${rewritten}${pointSuffix}`.trim();
      return combined.slice(0, 240);
    }

    const prefix = referencedPoint ? `${subjectCore} — ${referencedPoint.title}` : subjectCore;
    return `${prefix}: ${cleanQ}`.slice(0, 240);
  }

  return `${cleanQ}${pointSuffix}`.slice(0, 240);
}

function buildContinuityDirective(opts: {
  relation: FollowUpRelation;
  activeSubject: string;
  activeDomain: FollowUpDomainTag;
  resolvedEntities: string[];
  referencedPoint: ReferencedPoint | null;
  carriedAttachment: CarriedAttachment | null;
}): string {
  if (
    opts.relation === "standalone" ||
    opts.relation === "new_clinical_encounter"
  ) {
    return "";
  }

  const lines: string[] = [
    `FOLLOW-UP CONVERSATION CONTINUITY (${opts.relation.toUpperCase()}):`,
    `- Active Subject: ${opts.activeSubject}`,
  ];

  if (opts.resolvedEntities.length > 0) {
    lines.push(`- Active Conversation Entities: ${opts.resolvedEntities.slice(0, 6).join(", ")}`);
  }

  if (opts.referencedPoint) {
    lines.push(
      `- Referenced Item (#${opts.referencedPoint.index}): "${opts.referencedPoint.title}"${opts.referencedPoint.detail ? ` — ${opts.referencedPoint.detail}` : ""}`,
    );
  }

  if (opts.carriedAttachment) {
    lines.push(`- Active Uploaded Document: "${opts.carriedAttachment.filename}" (carried forward from earlier turn)`);
  }

  switch (opts.relation) {
    case "same_patient_followup":
      lines.push(
        "- Clinical Continuity Rule: Answer strictly for THIS SAME active patient from the immediately preceding encounter turns. Preserve their documented vitals, labs, medications, and allergies. Do NOT invent new vitals/labs not stated in the follow-up or prior turns; explicitly flag any missing diagnostic data needed to confirm the updated scenario.",
      );
      break;
    case "point_expansion":
      lines.push(
        "- Task Instruction: Focus directly on expanding and explaining ONLY the referenced point/step above in technical depth, addressing any specific sub-question asked (e.g., failure modes, revocation, edge cases). Do not repeat the other points from the prior response.",
      );
      break;
    case "document_followup":
      lines.push(
        "- Document Continuity Rule: Answer strictly from the carried uploaded document text in conversation context. Quote or cite exact clauses/sections where applicable, and state clearly if something requested is not present in the document.",
      );
      break;
    case "what_if_parameter_shift":
      lines.push(
        "- Parameter Shift Rule: Re-evaluate the active scenario with the newly modified constraint/parameter while preserving all unchanged parameters and assumptions from earlier turns. Clearly show how the conclusion, sizing, or calculations change.",
      );
      break;
    case "depth_or_format_shift":
      lines.push(
        "- Format / Depth Transform Rule: Transform or re-present the active conversation topic directly in the exact requested format, table structure, code language, or comprehension level while keeping factual continuity with the earlier turns.",
      );
      break;
    case "verification_or_challenge":
      lines.push(
        "- Critical Audit Rule: Re-verify the prior answer critically and objectively rather than blindly defending it. Surface assumptions, unverified claims, failure modes, edge cases, or omitted considerations.",
      );
      break;
    case "continuation":
      lines.push(
        "- Continuation Rule: Pick up seamlessly from where the previous assistant message left off without repeating content already covered.",
      );
      break;
    case "coreference":
      lines.push(
        "- Coreference Continuity Rule: Resolve pronouns and demonstratives (it/its/that/this/they/them) against the Active Subject and prior assistant turn, and answer directly without re-explaining background already established.",
      );
      break;
  }

  lines.push("- Anti-Repetition Rule: Build on the existing thread naturally; do not repeat the entire previous response verbatim.");
  return lines.join("\n");
}

/**
 * Deterministic multi-turn follow-up analyzer and query rewriter.
 * Runs before specialist routing, retrieval/search, and LLM prompt assembly.
 */
export function resolveFollowUpContext(
  turns: ConversationTurn[],
  currentQuestion: string,
): FollowUpResolution {
  const cleanCurrent = stripAttachmentBlock(currentQuestion).trim();
  const baseDomain = detectDomainTag(cleanCurrent);
  const baseEntities = extractEntitiesFromText(cleanCurrent);

  const priorTurns = turns.slice(0, -1);
  const lastTurn = turns[turns.length - 1];
  const effectivePrior =
    lastTurn && lastTurn.role === "user" && stripAttachmentBlock(lastTurn.content) === cleanCurrent
      ? priorTurns
      : turns.filter((t) => stripAttachmentBlock(t.content) !== cleanCurrent);

  const priorUserTurns = effectivePrior.filter((t) => t.role === "user");
  const priorAssistantTurns = effectivePrior.filter((t) => t.role === "assistant");

  if (priorUserTurns.length === 0 && priorAssistantTurns.length === 0) {
    return {
      isFollowUp: false,
      relation: "standalone",
      topicShiftDetected: false,
      shouldIsolateEncounter: false,
      activeSubject: extractCleanSubject(cleanCurrent, baseEntities),
      activeDomain: baseDomain,
      resolvedEntities: baseEntities,
      referencedPoint: null,
      carriedAttachment: extractCarriedAttachment(turns),
      standaloneQuery: cleanCurrent,
      systemContinuityDirective: "",
    };
  }

  const latestUserText = priorUserTurns[priorUserTurns.length - 1]?.content || "";
  const anchorUserText = (() => {
    for (let i = priorUserTurns.length - 1; i >= 0; i--) {
      const candidate = stripAttachmentBlock(priorUserTurns[i]!.content);
      if (candidate.length >= 16 && !hasAnaphoricPronoun(candidate)) {
        return candidate;
      }
    }
    return stripAttachmentBlock(latestUserText);
  })();

  const lastAssistantRaw = priorAssistantTurns[priorAssistantTurns.length - 1]?.content || "";
  const lastAssistantClean = cleanAssistantTurnForHistory(lastAssistantRaw, 6000);
  const priorContextSample = `${anchorUserText}\n${lastAssistantClean.slice(0, 2000)}`;
  const priorEntities = extractEntitiesFromText(priorContextSample);
  const priorDomain = detectDomainTag(priorContextSample);
  const priorSubject = extractCleanSubject(anchorUserText || lastAssistantClean.split(/\n/)[0] || "", priorEntities);
  const priorPoints = extractAssistantPoints(lastAssistantRaw);
  const carriedAttachment = extractCarriedAttachment(effectivePrior);

  // 1. Clinical safety gate FIRST: distinguish new patient encounter vs same-patient follow-up
  const isPriorClinical = priorDomain === "clinical" || hasExplicitClinicalIntakeSignals(priorContextSample);
  const isNewPatient = hasDistinctPatientDemographics(priorContextSample, cleanCurrent);

  if (isNewPatient) {
    const newSubject = extractCleanSubject(cleanCurrent, baseEntities);
    return {
      isFollowUp: false,
      relation: "new_clinical_encounter",
      topicShiftDetected: true,
      shouldIsolateEncounter: true,
      activeSubject: newSubject,
      activeDomain: "clinical",
      resolvedEntities: baseEntities,
      referencedPoint: null,
      carriedAttachment: null,
      standaloneQuery: cleanCurrent,
      systemContinuityDirective: "",
    };
  }

  if (
    isPriorClinical &&
    (/\b(his|her|their|this\s+patient|the\s+patient|same\s+patient|if\s+(?:potassium|k\+|creatinine|bp|hr|rr|spo2|lactate|troponin|sodium)|should\s+we\s+(?:hold|give|start|stop|continue|intubate|dialyze)|next\s+step|differential|what\s+if)\b/i.test(
      cleanCurrent,
    ) ||
      hasAnaphoricPronoun(cleanCurrent))
  ) {
    const mergedEntities = [...new Set([...priorEntities, ...baseEntities])].slice(0, 8);
    return {
      isFollowUp: true,
      relation: "same_patient_followup",
      topicShiftDetected: false,
      shouldIsolateEncounter: false,
      activeSubject: priorSubject,
      activeDomain: "clinical",
      resolvedEntities: mergedEntities,
      referencedPoint: null,
      carriedAttachment: null,
      standaloneQuery: buildStandaloneQuery(cleanCurrent, priorSubject, null, priorEntities),
      systemContinuityDirective: buildContinuityDirective({
        relation: "same_patient_followup",
        activeSubject: priorSubject,
        activeDomain: "clinical",
        resolvedEntities: mergedEntities,
        referencedPoint: null,
        carriedAttachment: null,
      }),
    };
  }

  // 2. Point / Step / Item / Row expansion detection
  let referencedPoint: ReferencedPoint | null = null;
  const lastPointMatch = cleanCurrent.match(
    /\b(?:the\s+)?last\s+(?:one|point|step|item|section|option|phase|bullet|recommendation)\b/i,
  );
  const explicitPointMatch = cleanCurrent.match(
    /\b(?:point|step|item|option|row|section|layer|phase|stage|bullet|recommendation|#)\s*(?:number\s*)?(one|two|three|four|five|six|seven|eight|nine|ten|1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th|10|[1-9])\b/i,
  ) || cleanCurrent.match(
    /\b(?:the\s+)(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\s+(?:one|point|step|item|option|section|part)\b/i,
  );

  if (lastPointMatch && priorPoints.length > 0) {
    referencedPoint = priorPoints[priorPoints.length - 1]!;
  } else if (explicitPointMatch) {
    const rawNum = explicitPointMatch[1]!.toLowerCase();
    const targetIdx = ORDINAL_INDEX[rawNum] || Number(rawNum) || 1;
    referencedPoint =
      priorPoints.find((p) => p.index === targetIdx) ||
      priorPoints[targetIdx - 1] || {
        index: targetIdx,
        title: `Point #${targetIdx}`,
        detail: "",
      };
  }

  let relation: FollowUpRelation | null = null;

  if (referencedPoint) {
    relation = "point_expansion";
  } else if (
    carriedAttachment &&
    (/\b(?:the\s+(?:document|file|pdf|contract|report|attachment|paper|clause|policy|text)|in\s+(?:the\s+)?section|what\s+does\s+(?:it|the\s+document|the\s+file|the\s+pdf|the\s+contract)\s+say|quiz\s+me|find\s+contradictions|flashcards|summarize\s+(?:it|this\s+document|that\s+file)|extract\s+[\s\S]{1,40}\s+from\s+(?:it|that|the\s+(?:file|document|pdf|contract)))\b/i.test(
      cleanCurrent,
    ) ||
      cleanCurrent.toLowerCase().includes(carriedAttachment.filename.toLowerCase()))
  ) {
    relation = "document_followup";
  } else if (
    /^(?:now\s+)?(?:what\s+if|suppose|assuming|assume|instead\s+of|change\s+[\s\S]{1,35}\s+to|scale\s+(?:it\s+|this\s+|that\s+)?to|double\s+the|halve\s+the|recalculate)\b/i.test(
      cleanCurrent,
    ) ||
    /\b(?:what\s+if\s+we\s+(?:have|had|use|used|scale|change|increase|decrease|double|halve)|(?:for|with)\s+\d[\d,.]*(?:k|m|b)?\s+\w+\s+instead)\b/i.test(
      cleanCurrent,
    )
  ) {
    relation = "what_if_parameter_shift";
  } else if (
    /^(?:now\s+)?(?:make\s+(?:it|that|this)\s+|explain\s+(?:it|that|this)\s+|turn\s+(?:it|that|this)\s+into|put\s+(?:it|that|this)\s+(?:in|into)|convert\s+(?:it|that|this)\s+(?:to|into)|format\s+(?:it|that|this)\s+as|rewrite\s+(?:it|that|this)|summarize\s+(?:it|that|this)|simplify\s+(?:it|that|this)|write\s+(?:a|an)\s+[a-z0-9+#.-]+\s+(?:example|implementation|script|test|function)\s+for\s+(?:it|that|this)|give\s+me\s+(?:a\s+|an\s+)?(?:example|checklist|table|diagram)\s+(?:for|of)\s+(?:it|that|this))/i.test(
      cleanCurrent,
    ) ||
    (/\b(?:simpler|plain\s+language|eli5|more\s+concise|shorter|go\s+deeper|more\s+technical|step\s+by\s+step|(?:in|into|as)\s+(?:a|an)\s+(?:[a-z0-9-]+\s+){0,3}(?:markdown\s+)?table|bullet\s+points?|checklist|mermaid\s+diagram)\b/i.test(
      cleanCurrent,
    ) && (cleanCurrent.split(/\s+/).length <= 16 || hasAnaphoricPronoun(cleanCurrent) || baseDomain === "general"))
  ) {
    relation = "depth_or_format_shift";
  } else if (
    /\b(?:are\s+you\s+sure|double[- ]check|verify\s+(?:that|this|it)|prove\s+(?:it|that)|what(?:'s| is)\s+the\s+source|cite\s+your\s+sources|what\s+did\s+(?:we|you)\s+miss|what\s+else\s+is\s+missing|is\s+that\s+really\s+true|why\s+did\s+you\s+say|what\s+are\s+the\s+(?:risks|trade-?offs|limitations|downsides)\s+of\s+(?:that|this|it)|challenge\s+that)\b/i.test(
      cleanCurrent,
    )
  ) {
    relation = "verification_or_challenge";
  } else if (
    /^(?:please\s+|and\s+)?(?:continue|go\s+on|keep\s+going|next|what\s+else|anything\s+else|tell\s+me\s+more(?:\s+about\s+(?:it|that|this))?|and\s+then|go\s+ahead|more\s+details?)[.?!]*$/i.test(
      cleanCurrent,
    )
  ) {
    relation = "continuation";
  } else if (
    hasAnaphoricPronoun(cleanCurrent) ||
    (/^(?:and|but|so|also|what\s+about|how\s+about|why|how|when|where|can\s+it|does\s+it|will\s+it|compare\s+with)\b/i.test(
      cleanCurrent,
    ) &&
      cleanCurrent.split(/\s+/).length <= 14 &&
      !hasSubstantiveUnrelatedTopic(cleanCurrent, priorContextSample, baseEntities, priorEntities, baseDomain, priorDomain))
  ) {
    relation = "coreference";
  }

  // 3. Check for genuine topic shift when no explicit follow-up cue matched
  if (!relation) {
    const cleanSubject = extractCleanSubject(cleanCurrent, baseEntities);
    return {
      isFollowUp: false,
      relation: "standalone",
      topicShiftDetected: true,
      shouldIsolateEncounter: false,
      activeSubject: cleanSubject,
      activeDomain: baseDomain,
      resolvedEntities: baseEntities,
      referencedPoint: null,
      carriedAttachment: null,
      standaloneQuery: cleanCurrent,
      systemContinuityDirective: "",
    };
  }

  // Inherit active domain from prior turns unless follow-up itself introduces an explicit new domain (e.g., "Write a Python example for it")
  const resolvedDomain: FollowUpDomainTag =
    baseDomain !== "general" ? baseDomain : priorDomain;

  const finalDomain: FollowUpDomainTag =
    (priorDomain === "dod_ic" || priorDomain === "rmf_grc") && baseDomain === "general"
      ? priorDomain
      : priorDomain === "coding" &&
          /\b(test|unit\s*test|refactor|fix|bug|edge\s*case|optimiz|convert|rewrite|add|handle|type|error|null|async|python|typescript|javascript|react|go|rust|java|sql|code|function|method|class|line)\b/i.test(
            cleanCurrent,
          )
        ? "coding"
        : resolvedDomain;

  const mergedEntities = [...new Set([...priorEntities, ...baseEntities])].slice(0, 8);
  const activeAttachment = relation === "document_followup" ? carriedAttachment : null;
  const standaloneQuery = buildStandaloneQuery(cleanCurrent, priorSubject, referencedPoint, priorEntities);

  return {
    isFollowUp: true,
    relation,
    topicShiftDetected: false,
    shouldIsolateEncounter: false,
    activeSubject: priorSubject,
    activeDomain: finalDomain,
    resolvedEntities: mergedEntities,
    referencedPoint,
    carriedAttachment: activeAttachment,
    standaloneQuery,
    systemContinuityDirective: buildContinuityDirective({
      relation,
      activeSubject: priorSubject,
      activeDomain: finalDomain,
      resolvedEntities: mergedEntities,
      referencedPoint,
      carriedAttachment: activeAttachment,
    }),
  };
}
