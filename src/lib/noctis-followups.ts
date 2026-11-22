export interface ContextualFollowUp {
  label: string;
  ask: string;
}

export interface FollowUpOptions {
  desk?: string;
  priorQuestion?: string;
  engineId?: string;
  maxItems?: number;
}

export type FollowUpDomain =
  | "cve_cyber"
  | "clinical"
  | "software_arch"
  | "finance"
  | "legal"
  | "music_media"
  | "scripture"
  | "history_bio"
  | "science_math"
  | "general";

interface TableComparison {
  left: string;
  right: string;
  rows: string[];
}

interface NumberedPoint {
  num: string;
  title: string;
}

const GENERIC_HEADINGS = new Set([
  "summary",
  "executive summary",
  "overview",
  "introduction",
  "conclusion",
  "key takeaways",
  "takeaways",
  "background",
  "references",
  "sources",
  "evidence",
  "notes",
  "next steps",
  "related documents",
  "verification",
  "confidence",
  "claim standing",
  "audit",
  "structured reference table",
  "direct answer",
  "answer",
  "final answer",
  "response",
  "tldr",
  "tl;dr",
  "details",
  "explanation",
  "comparison",
]);

const ENTITY_STOP_WORDS = new Set([
  "the",
  "this",
  "that",
  "these",
  "those",
  "although",
  "however",
  "for",
  "when",
  "while",
  "because",
  "since",
  "also",
  "here",
  "there",
  "after",
  "before",
  "during",
  "therefore",
  "finally",
  "first",
  "second",
  "third",
  "example",
  "note",
  "table",
  "feature",
  "initial",
  "actual",
  "release",
  "summary",
  "overview",
  "noctis",
  "study",
  "board",
  "answer",
  "question",
  "claim",
  "evidence",
  "sources",
  "confidence",
  "structured",
  "reference",
  "album",
  "background",
  "production",
  "timeline",
  "catalyst",
  "standard",
  "plan",
  "execution",
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
  "how",
  "what",
  "who",
  "why",
  "where",
  "using",
  "mutual",
]);

const CODE_LANG_DISPLAY: Record<string, string> = {
  python: "Python",
  py: "Python",
  typescript: "TypeScript",
  ts: "TypeScript",
  javascript: "JavaScript",
  js: "JavaScript",
  tsx: "TypeScript",
  jsx: "React",
  sql: "SQL",
  bash: "Bash",
  sh: "Bash",
  zsh: "Bash",
  shell: "Shell",
  go: "Go",
  golang: "Go",
  rust: "Rust",
  java: "Java",
  cpp: "C++",
  "c++": "C++",
  csharp: "C#",
  "c#": "C#",
  yaml: "YAML",
  yml: "YAML",
  dockerfile: "Docker",
  docker: "Docker",
  terraform: "Terraform",
  hcl: "Terraform",
  html: "HTML",
  css: "CSS",
};

const TRIVIAL_QUOTES = new Set(["yes", "no", "true", "false", "example", "note", "none", "ok", "n/a", "high", "low"]);

const ERROR_ANSWER_RE =
  /^(?:noctis did not get an answer|the document was read, but no answer came back|write a question first|could not finish that answer|that recording could not be read|your learning record was not attached)/i;

const DEICTIC_QUESTION_RE =
  /^(?:please\s+|can you\s+|could you\s+)?(?:explain|summarize|summarise|analyze|analyse|describe|interpret|tell me more(?: about)?|continue|go on|why|how|elaborate(?: on)?|simplify|rewrite|translate|review|check|look at|what does this mean|what is this)\s*(?:this|that|it|above|the text|the passage|this to me|this text|this document|this article|this file|what i uploaded)?[.?!]*$/i;

const VERSE_RE =
  /\b(?:Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1\s+Samuel|2\s+Samuel|1\s+Kings|2\s+Kings|Psalms?|Proverbs|Ecclesiastes|Isaiah|Jeremiah|Ezekiel|Daniel|Matthew|Mark|Luke|John|Acts|Romans|1\s+Corinthians|2\s+Corinthians|Galatians|Ephesians|Philippians|Colossians|1\s+Thessalonians|2\s+Thessalonians|1\s+Timothy|2\s+Timothy|Titus|Hebrews|James|1\s+Peter|2\s+Peter|1\s+John|Revelation)\s+\d+:\d+(?:-\d+)?\b/gi;

const DOMAIN_PATTERNS: Record<Exclude<FollowUpDomain, "general">, RegExp[]> = {
  cve_cyber: [
    /\bCVE-\d{4}-\d{4,7}\b/i,
    /\b(?:mTLS|TLS\s+1\.[23]|Zero[- ]Trust|ransomware|exploit\w*|vulnerabilit\w*|patch\w*|remediat\w*)\b/i,
    /\b(?:MITRE|ATT&CK|SIEM|EDR|IOCs?|firewall|SSRF|SQLi|XSS|CSRF|OAuth|JWT|RBAC)\b/i,
    /\b(?:PKI|certificate\s+authority|malware|phishing|incident\s+response|lateral\s+movement|privilege\s+escalation|threat\s+actor)\b/i,
  ],
  clinical: [
    /\b(?:patient|diagnos\w*|differential|sepsis|septic\s+shock|AKI|acute\s+kidney|creatinine)\b/i,
    /\b(?:norepinephrine|vasopressor\w*|ICU|ventilation|intubat\w*|dosage|dosing|contraindication\w*)\b/i,
    /\b(?:pathology|biopsy|ECG|EKG|troponin|antibiotic\w*|empiric|prognosis|symptoms|vital\s+signs|hemoglobin|platelet\w*|lactate|mg\/dL|mmHg|mcg\/min)\b/i,
  ],
  software_arch: [
    /\b(?:microservice\w*|kubernetes|docker|container\w*|service\s+mesh|Envoy|Istio|load\s+balancer)\b/i,
    /\b(?:API|endpoint\w*|database|PostgreSQL|Postgres|Redis|Kafka|latency|throughput|caching|schema)\b/i,
    /\b(?:TypeScript|JavaScript|Python|React|Rust|Golang|CI\/CD|deployment|unit\s+test\w*|refactor\w*|async|function|class)\b/i,
  ],
  finance: [
    /\b(?:WACC|DCF|discounted\s+cash\s+flow|free\s+cash\s+flow|FCF|EBITDA|valuation)\b/i,
    /\b(?:revenue|margin\w*|balance\s+sheet|income\s+statement|10-K|10-Q|enterprise\s+value|multiple\w*|EPS)\b/i,
    /\b(?:dividend\w*|capex|working\s+capital|terminal\s+value|portfolio|yield|bond\w*|equity|shareholder\w*)\b/i,
  ],
  legal: [
    /\b(?:NDA|non-compete|noncompete|non-disclosure|indemnif\w*|liability\s+cap|clause|contract\w*)\b/i,
    /\b(?:jurisdiction\w*|enforceab\w*|statute|regulation|compliance|arbitration|breach|tort|fiduciary)\b/i,
    /\b(?:plaintiff|defendant|court|ruling|precedent|attorney|counsel|governing\s+law|covenant)\b/i,
  ],
  music_media: [
    /\b(?:album|lead\s+single|single|track\w*|song\w*|lyrics|discography|Billboard|Grammy|record\s+label)\b/i,
    /\b(?:Sony\s+Music|Epic\s+Records|music\s+video|soundtrack|singer|vocalist|rapper|studio\s+album)\b/i,
    /\b(?:film|movie|actor|actress|director|box\s+office|premiere|cinema|screenplay)\b/i,
  ],
  scripture: [
    VERSE_RE,
    /\b(?:scripture|gospel|testament|apostle|verse|theolog\w*|biblical|parable|covenant|epistle|psalm)\b/i,
  ],
  history_bio: [
    /\b(?:century|empire|republic|dynasty|treaty|war|revolution|battle|historical|historian\w*|era)\b/i,
    /\b(?:biography|born|died|reign|president|monarch|founded|constitution|independence|civil\s+war)\b/i,
  ],
  science_math: [
    /\b(?:CRISPR|Cas9|gene\s+editing|DNA|RNA|protein|enzyme|cell\w*|molecule|quantum|thermodynamic\w*)\b/i,
    /\b(?:equation|theorem|proof|derivative|integral|matrix|probability|isotope|photosynthesis|neuron)\b/i,
  ],
};

function cleanQuestion(raw: string): string {
  return (raw || "")
    .replace(/\n?\s*---\s+[^\n]+---\s*\n[\s\S]*$/g, "")
    .replace(/\s*---[\s\S]*$/g, "")
    .replace(/\[Image:[^\]]*\]/gi, " ")
    .replace(/(?:Official vendor:|Free resources:|How to pass:|Answer in study-board form)[\s\S]*$/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanAnswer(raw: string): string {
  return (raw || "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<think>[\s\S]*$/gi, "")
    .split(/\n\s*(?:Claim standing:|Evidence status:|Evidence strength:|Pre-Delivery Check:|Sources\s*\n|Last verified\s*\n|Confidence\s*\n)/i)[0]!
    .trim();
}

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\((?:https?:\/\/|mailto:|\/)[^)]+\)/g, "$1")
    .replace(/[`*_~>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateWords(text: string, maxLen: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLen) return clean;
  const sliced = clean.slice(0, maxLen);
  const lastSpace = sliced.lastIndexOf(" ");
  let cut =
    lastSpace >= Math.floor(maxLen * 0.55)
      ? sliced.slice(0, lastSpace)
      : sliced;
  cut = cut.replace(/(?:['’]s|['’])$/, "").replace(/[,:;.\-–—]+$/, "").trim();
  return cut || clean.slice(0, maxLen).trim();
}

function clampPillLabel(label: string, maxLen = 42): string {
  const clean = label.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLen) return clean;
  const quoteMatch = clean.match(/^(More on\s+["“])([^"”]+)(["”])$/i);
  if (quoteMatch) {
    const innerBudget = maxLen - quoteMatch[1]!.length - quoteMatch[3]!.length;
    if (innerBudget >= 8) {
      return `${quoteMatch[1]}${truncateWords(quoteMatch[2]!, innerBudget)}${quoteMatch[3]}`;
    }
  }
  return truncateWords(clean, maxLen);
}

function extractCodeLangs(cleaned: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  const re = /```([a-zA-Z0-9+#_-]+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(cleaned)) !== null) {
    const key = (match[1] || "").toLowerCase();
    const display = CODE_LANG_DISPLAY[key];
    if (display && !seen.has(display)) {
      seen.add(display);
      found.push(display);
    }
  }
  return found;
}

function extractQuotedTerms(answerNoCode: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  const re = /"([^"\n]{3,55})"|“([^”\n]{3,55})”/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(answerNoCode)) !== null) {
    const candidate = (match[1] || match[2] || "").replace(/[.,;:!?]+$/, "").replace(/\s+/g, " ").trim();
    if (candidate.length < 3 || candidate.length > 45) continue;
    if (candidate.split(/\s+/).length > 7) continue;
    const norm = candidate.toLowerCase();
    if (TRIVIAL_QUOTES.has(norm) || seen.has(norm)) continue;
    seen.add(norm);
    found.push(candidate);
  }
  return found;
}

function parseTableCells(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => stripInlineMarkdown(cell));
}

function extractTableComparisons(answerNoCode: string): TableComparison[] {
  const lines = answerNoCode.split(/\r?\n/);
  const comparisons: TableComparison[] = [];
  const attrColRe = /^(?:feature|aspect|metric|factor|dimension|criteria|category|component|item|stage|parameter|attribute|area|property|topic|element)s?$/i;
  const metaTableRe = /^(?:check|status|pass|score|standing|metric check|pre-delivery|audit|verification|result)$/i;

  for (let i = 0; i < lines.length - 2; i++) {
    const headerLine = lines[i]!;
    const sepLine = lines[i + 1]!;
    if (!headerLine.includes("|")) continue;
    if (!/^\s*\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(sepLine)) continue;

    const headers = parseTableCells(headerLine);
    if (headers.length < 2) continue;

    const metaHits = headers.filter((h) => metaTableRe.test(h)).length;
    if (metaHits >= 2 || /^check$/i.test(headers[0] || "")) continue;

    const dataRows: string[][] = [];
    let j = i + 2;
    while (j < lines.length && lines[j]!.includes("|")) {
      const cells = parseTableCells(lines[j]!);
      if (cells.length >= 2 && cells.some((c) => c.length > 0)) {
        dataRows.push(cells);
      }
      j++;
    }
    i = j - 1;
    if (dataRows.length === 0) continue;

    const col0 = headers[0] || "";
    const col1 = headers[1] || "";
    const col2 = headers[2] || "";
    if (
      headers.length >= 3 &&
      attrColRe.test(col0) &&
      col1.length >= 2 &&
      col2.length >= 2 &&
      col1.length <= 32 &&
      col2.length <= 32 &&
      col1.toLowerCase() !== col2.toLowerCase()
    ) {
      const rows = dataRows
        .map((r) => r[0] || "")
        .filter((val) => val.length >= 3 && val.length <= 36)
        .slice(0, 2);
      comparisons.push({ left: col1, right: col2, rows });
    } else if (dataRows.length >= 2) {
      const left = dataRows[0]![0] || "";
      const right = dataRows[1]![0] || "";
      if (
        left.length >= 3 &&
        left.length <= 28 &&
        right.length >= 3 &&
        right.length <= 28 &&
        left.toLowerCase() !== right.toLowerCase()
      ) {
        comparisons.push({ left, right, rows: [] });
      }
    }
  }
  return comparisons;
}

function cleanHeadingText(raw: string): string {
  return stripInlineMarkdown(raw)
    .replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s•\-–—]+/gu, "")
    .replace(/^(?:step\s+\d+[:.)]?|\d+[.)])\s*/i, "")
    .replace(/[:.\s]+$/, "")
    .trim();
}

function extractHeadings(answerNoCode: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  for (const line of answerNoCode.split(/\r?\n/)) {
    const trimmed = line.trim();
    const mdMatch = trimmed.match(/^#{1,4}\s+(.+)$/);
    const boldMatch = !mdMatch ? trimmed.match(/^\*\*([^*\n]{4,68})\*\*:?\s*$/) : null;
    const raw = mdMatch?.[1] || boldMatch?.[1] || "";
    if (!raw) continue;
    const clean = cleanHeadingText(raw);
    if (clean.length < 4 || clean.length > 68) continue;
    const norm = clean.toLowerCase();
    if (GENERIC_HEADINGS.has(norm) || /^(?:structured reference table|comparison table)/i.test(norm)) continue;
    if (seen.has(norm)) continue;
    seen.add(norm);
    found.push(clean);
  }
  return found;
}

function extractNumberedPoints(answerNoCode: string): NumberedPoint[] {
  const points: NumberedPoint[] = [];
  const seen = new Set<string>();
  for (const line of answerNoCode.split(/\r?\n/)) {
    const match = line.match(/^\s*(\d+)\.\s+(?:\*\*([^*\n]{3,48})\*\*|([A-Z][^:\n]{2,40}):)/);
    if (!match) continue;
    const num = match[1]!;
    const rawTitle = (match[2] || match[3] || "").replace(/[:.\s]+$/, "").trim();
    const cleanTitle = stripInlineMarkdown(rawTitle);
    if (cleanTitle.length < 3 || cleanTitle.length > 48) continue;
    const norm = cleanTitle.toLowerCase();
    if (GENERIC_HEADINGS.has(norm) || seen.has(norm)) continue;
    seen.add(norm);
    points.push({ num, title: cleanTitle });
  }
  return points;
}

function extractDates(text: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  const fullRe = /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+(?:1[4-9]\d{2}|20[0-3]\d)\b/g;
  const yearRe = /\b(?:1[4-9]\d{2}|20[0-3]\d)\b/g;
  for (const m of text.match(fullRe) || []) {
    const norm = m.toLowerCase();
    if (!seen.has(norm)) {
      seen.add(norm);
      found.push(m);
    }
  }
  for (const y of text.match(yearRe) || []) {
    if (!seen.has(y)) {
      seen.add(y);
      found.push(y);
    }
  }
  return found;
}

function stripLeadingStopWords(phrase: string): string {
  const words = phrase.split(/\s+/).filter(Boolean);
  while (words.length > 0 && ENTITY_STOP_WORDS.has(words[0]!.toLowerCase().replace(/[.,:;!?]+$/, ""))) {
    if (words[0]!.toLowerCase() === "this" && words[1]?.toLowerCase() === "is") break;
    words.shift();
  }
  while (words.length > 0 && ENTITY_STOP_WORDS.has(words[words.length - 1]!.toLowerCase().replace(/[.,:;!?]+$/, ""))) {
    words.pop();
  }
  return words.join(" ").trim();
}

function extractEntities(
  plainBody: string,
  cleanedQuestion: string,
  headings: string[],
  tableComparisons: TableComparison[],
): string[] {
  const headingNorms = new Set(headings.map((h) => h.toLowerCase()));
  const tableNorms = new Set<string>();
  for (const tc of tableComparisons) {
    tableNorms.add(tc.left.toLowerCase());
    tableNorms.add(tc.right.toLowerCase());
    for (const r of tc.rows) tableNorms.add(r.toLowerCase());
  }

  const combined = `${cleanedQuestion}\n${plainBody}`;
  const opening = plainBody.slice(0, 320);
  const counts = new Map<string, { display: string; count: number; firstIndex: number }>();

  const recordCandidate = (raw: string, idx: number, isAcronym = false) => {
    const trimmed = raw.replace(/^[,.:;()\s]+|[,.:;()\s]+$/g, "").replace(/\s+/g, " ");
    const cleaned = isAcronym ? trimmed : stripLeadingStopWords(trimmed);
    if (!cleaned || cleaned.length < 3 || cleaned.length > 44) return;
    if (!isAcronym && cleaned.split(/\s+/).length < 2) return;
    if (/^(?:is|was|are|were|to|and|or)\b/i.test(cleaned) || cleaned.includes("...")) return;
    const norm = cleaned.toLowerCase();
    if (ENTITY_STOP_WORDS.has(norm) || headingNorms.has(norm) || tableNorms.has(norm)) return;
    const prev = counts.get(norm);
    if (prev) {
      prev.count += 1;
    } else {
      counts.set(norm, { display: cleaned, count: 1, firstIndex: idx });
    }
  };

  const multiRe = /\b[A-Z][a-zA-Z0-9'-]+(?:\s+(?:(?:of|the|and|for|from|&)\s+)?[A-Z][a-zA-Z0-9'-]+){1,3}\b/g;
  let m: RegExpExecArray | null;
  while ((m = multiRe.exec(combined)) !== null) {
    recordCandidate(m[0]!, m.index, false);
  }

  const acronymRe =
    /\b(?:HIPAA|GDPR|EBITDA|WACC|CRISPR|Cas9|OWASP|MITRE|ATT&CK|OAuth|mTLS|Kubernetes|PostgreSQL|PAN-OS|GlobalProtect|SQLi|XSS|CSRF|SOC\s*2|NIST|ISO\s*27001|NDA|AKI|ICU|SOFA)\b/g;
  while ((m = acronymRe.exec(combined)) !== null) {
    recordCandidate(m[0]!, m.index, true);
  }

  const ranked = [...counts.values()].sort((a, b) => {
    const scoreA =
      a.count * 3 +
      (opening.toLowerCase().includes(a.display.toLowerCase()) ? 2 : 0) +
      (cleanedQuestion.toLowerCase().includes(a.display.toLowerCase()) ? 3 : 0);
    const scoreB =
      b.count * 3 +
      (opening.toLowerCase().includes(b.display.toLowerCase()) ? 2 : 0) +
      (cleanedQuestion.toLowerCase().includes(b.display.toLowerCase()) ? 3 : 0);
    if (scoreB !== scoreA) return scoreB - scoreA;
    return a.firstIndex - b.firstIndex;
  });

  const finalEntities: string[] = [];
  for (const item of ranked) {
    const lower = item.display.toLowerCase();
    if (finalEntities.some((existing) => existing.toLowerCase().includes(lower) || lower.includes(existing.toLowerCase()))) {
      continue;
    }
    finalEntities.push(item.display);
    if (finalEntities.length >= 6) break;
  }
  return finalEntities;
}

function stripQuestionVerbPrefix(question: string): string {
  let q = question
    .replace(/^(?:please\s+|can\s+you\s+|could\s+you\s+|would\s+you\s+)/i, "")
    .replace(
      /^(?:tell\s+me(?:\s+more)?\s+about|explain(?:\s+to\s+me)?(?:\s+(?:how|why|what))?|describe|summarize|summarise|analyze|analyse|compare|interpret|elaborate\s+on|walk\s+me\s+through|break\s+down|what(?:\s+(?:is|are|was|were))?|who(?:\s+(?:is|are|was|were))?|how(?:\s+(?:does|do|did|can|to))?|why(?:\s+(?:does|do|did|is|are))?|write(?:\s+(?:a|an|the))?|create(?:\s+(?:a|an|the))?|design(?:\s+(?:a|an|the))?|build(?:\s+(?:a|an|the))?|investigate|look\s+up|review)\s+/i,
      "",
    )
    .replace(/^(?:the|a|an)\s+(?=(?:\d{4}\s+)?(?:[A-Z]|album|song|film|cve|protocol|concept|process))/i, "")
    .replace(/[?!.]+$/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (q.length > 48) {
    const clause = q.split(/\s+(?:and\s+how|and\s+why|while\s+preserving|in\s+depth|step\s+by\s+step|including)\s+/i)[0]?.trim() || q;
    const beforeTitleMatch = clause.match(/^(.+?\b(?:album|film|movie|book|novel|single))\s+[A-Z]/);
    const verbSplitMatch = clause.match(/^([A-Za-z0-9-]{2,24})\s+(?:protects|secures|prevents|enables|works|handles|helps)\b/i);
    q = truncateWords(beforeTitleMatch?.[1]?.trim() || verbSplitMatch?.[1]?.trim() || clause, 48);
  }
  return q;
}

function isDeicticQuestion(cleanedQuestion: string, cves: string[], verses: string[]): boolean {
  if (!cleanedQuestion) return true;
  if (DEICTIC_QUESTION_RE.test(cleanedQuestion)) return true;
  if (cleanedQuestion.length < 10 && cves.length === 0 && verses.length === 0) return true;
  return false;
}

function resolveSubject(
  cleanedQuestion: string,
  plainBody: string,
  priorQuestion: string | undefined,
  cves: string[],
  verses: string[],
  entities: string[],
  headings: string[],
  quotedTerms: string[],
): string {
  if (cves[0]) return cves[0];
  if (verses[0]) return verses[0];

  if (!isDeicticQuestion(cleanedQuestion, cves, verses)) {
    const stripped = stripQuestionVerbPrefix(cleanedQuestion);
    if (stripped.length >= 3 && !DEICTIC_QUESTION_RE.test(stripped)) {
      return stripped;
    }
  }

  if (priorQuestion) {
    const cleanedPrior = cleanQuestion(priorQuestion);
    if (!isDeicticQuestion(cleanedPrior, [], [])) {
      const candidate = stripQuestionVerbPrefix(cleanedPrior);
      const keywords = candidate
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length >= 4 && !ENTITY_STOP_WORDS.has(w));
      const bodyLower = plainBody.toLowerCase();
      if (candidate.length >= 3 && keywords.some((kw) => bodyLower.includes(kw))) {
        return candidate;
      }
    }
  }

  const opening = plainBody.slice(0, 320);
  if (entities[0]) {
    const escapedEntity = entities[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const possessiveRe = new RegExp(
      `${escapedEntity}\\b[^.!?]{0,40}?\\b((?:19|20)\\d{2})?\\s*(album|record|film|movie|book|novel|song|single|treaty|law|bill|policy|protocol|syndrome)\\b`,
      "i",
    );
    const pm = opening.match(possessiveRe);
    if (pm) {
      const year = pm[1] ? `${pm[1]} ` : "";
      const noun = pm[2]!.toLowerCase();
      const built = `${entities[0]}'s ${year}${noun}`;
      if (built.length <= 48) return built;
    }
  }

  if (entities[0]) return entities[0];
  if (headings[0] && headings[0].length <= 48) return headings[0];
  if (quotedTerms[0]) return quotedTerms[0];
  return "this topic";
}

function detectDomain(question: string, plainBody: string, codeLangs: string[], cves: string[], verses: string[]): FollowUpDomain {
  if (cves.length > 0) return "cve_cyber";
  if (verses.length > 0) return "scripture";

  const combined = `${question}\n${plainBody}`;
  const scores: Record<Exclude<FollowUpDomain, "general">, number> = {
    cve_cyber: 0,
    clinical: 0,
    software_arch: codeLangs.length > 0 ? 2 : 0,
    finance: 0,
    legal: 0,
    music_media: 0,
    scripture: 0,
    history_bio: 0,
    science_math: 0,
  };

  for (const [domain, patterns] of Object.entries(DOMAIN_PATTERNS) as [Exclude<FollowUpDomain, "general">, RegExp[]][]) {
    for (const pat of patterns) {
      const globalPat = new RegExp(pat.source, pat.flags.includes("g") ? pat.flags : `${pat.flags}g`);
      const matches = combined.match(globalPat);
      if (matches && matches.length > 0) {
        const distinctTerms = new Set(matches.map((m) => m.toLowerCase()));
        scores[domain] += Math.min(3, distinctTerms.size);
      }
    }
  }

  let bestDomain: FollowUpDomain = "general";
  let bestScore = 0;
  for (const [domain, score] of Object.entries(scores) as [Exclude<FollowUpDomain, "general">, number][]) {
    if (score >= 2 && score > bestScore) {
      bestScore = score;
      bestDomain = domain;
    }
  }
  return bestDomain;
}

function isEchoOfQuestion(pill: ContextualFollowUp, cleanedQuestion: string): boolean {
  const qLower = cleanedQuestion.toLowerCase();
  const labelLower = pill.label.toLowerCase();
  if (!qLower) return false;
  if (/summarize|summary|tl;?dr/.test(qLower) && labelLower.startsWith("summarize")) return true;
  if (/simpl|eli5|plain language/.test(qLower) && (/simply\b/.test(labelLower) || /plain-language/.test(labelLower))) return true;
  if (/architecture|diagram/.test(qLower) && labelLower.startsWith("diagram ")) return true;
  if (qLower.length >= 8 && (labelLower === qLower || pill.ask.toLowerCase() === qLower)) return true;
  return false;
}

export function buildContextualFollowUps(
  question: string,
  answer: string,
  options?: FollowUpOptions,
): ContextualFollowUp[] {
  const maxItems = Math.max(1, Math.min(6, options?.maxItems ?? 5));
  const cleanedQ = cleanQuestion(question);
  const cleanedA = cleanAnswer(answer);

  if (!cleanedA || cleanedA.length < 20 || ERROR_ANSWER_RE.test(cleanedA)) {
    return [];
  }

  const codeLangs = extractCodeLangs(cleanedA);
  const answerNoCode = cleanedA.replace(/```[\s\S]*?```/g, "\n").trim();
  const plainBody = stripInlineMarkdown(answerNoCode.replace(/\|/g, " "));
  if (plainBody.length < 20 && codeLangs.length === 0) {
    return [];
  }

  const quotedTerms = extractQuotedTerms(answerNoCode);
  const tableComparisons = extractTableComparisons(answerNoCode);
  const headings = extractHeadings(answerNoCode);
  const numberedPoints = extractNumberedPoints(answerNoCode);
  const cves = [...new Set((`${cleanedQ} ${plainBody}`.match(/\bCVE-\d{4}-\d{4,7}\b/gi) || []).map((c) => c.toUpperCase()))];
  const verses = [...new Set(`${cleanedQ} ${plainBody}`.match(VERSE_RE) || [])];
  const dates = extractDates(plainBody);
  const entities = extractEntities(plainBody, cleanedQ, headings, tableComparisons);

  const subject = resolveSubject(cleanedQ, plainBody, options?.priorQuestion, cves, verses, entities, headings, quotedTerms);
  const shortSubject = truncateWords(subject, 28);
  const domain = detectDomain(cleanedQ, plainBody, codeLangs, cves, verses);

  const candidates: ContextualFollowUp[] = [];
  const subjectLower = subject.toLowerCase();

  // Priority 1 — Direct answer anchors (up to 3)
  let anchorCount = 0;

  if (quotedTerms[0] && !subjectLower.includes(quotedTerms[0].toLowerCase())) {
    const term = quotedTerms[0];
    candidates.push({
      label: clampPillLabel(`More on "${term}"`),
      ask: `Tell me more about "${term}" in the context of ${subject}.`,
    });
    anchorCount++;
  }

  if (tableComparisons[0] && anchorCount < 3) {
    const tc = tableComparisons[0];
    const rowDetail = tc.rows.length > 0 ? ` across ${tc.rows.join(" and ")}` : "";
    candidates.push({
      label: clampPillLabel(`${tc.left} vs ${tc.right}`),
      ask: `Compare ${tc.left} vs ${tc.right}${rowDetail} for ${subject} in more detail.`,
    });
    anchorCount++;
  }

  if (codeLangs.length > 0 && anchorCount < 3) {
    const lang = codeLangs[0]!;
    candidates.push({
      label: clampPillLabel(`Add ${lang} tests & edge cases`),
      ask: `Write ${lang} unit tests and cover edge cases for this ${subject} implementation.`,
    });
    anchorCount++;
    if (anchorCount < 3) {
      candidates.push({
        label: "Security & error handling review",
        ask: `Review the ${lang} code for ${subject} for security vulnerabilities, input validation, and error handling gaps.`,
      });
      anchorCount++;
    }
  }

  if (anchorCount < 3) {
    const distinctEntities = entities.filter((e) => {
      const eLow = e.toLowerCase();
      return !subjectLower.includes(eLow) && !eLow.includes(subjectLower) && !candidates.some((c) => c.label.toLowerCase().includes(eLow));
    });
    if (distinctEntities.length >= 2 && `${distinctEntities[0]} & ${distinctEntities[1]}`.length <= 36) {
      candidates.push({
        label: clampPillLabel(`${distinctEntities[0]} & ${distinctEntities[1]}`),
        ask: `Explain the role and impact of ${distinctEntities[0]} and ${distinctEntities[1]} regarding ${subject}.`,
      });
      anchorCount++;
    } else if (distinctEntities[0]) {
      candidates.push({
        label: clampPillLabel(`Role of ${distinctEntities[0]}`),
        ask: `Explain the role of ${distinctEntities[0]} in relation to ${subject}.`,
      });
      anchorCount++;
    }
  }

  if (anchorCount < 3) {
    const point = numberedPoints[0];
    const heading = headings.find((h) => {
      const hLow = h.toLowerCase();
      return hLow !== subjectLower && !subjectLower.includes(hLow) && !candidates.some((c) => c.label.toLowerCase().includes(hLow));
    });
    if (point) {
      candidates.push({
        label: clampPillLabel(`Expand: ${point.title}`),
        ask: `Expand in detail on "${point.title}" (point ${point.num}) regarding ${subject}.`,
      });
    } else if (heading) {
      candidates.push({
        label: clampPillLabel(`Deep dive: ${heading}`),
        ask: `Go deeper into "${heading}" for ${subject}.`,
      });
    }
  }

  // Priority 2 — Domain-tailored follow-ups grounded in resolved subject
  switch (domain) {
    case "music_media":
      candidates.push(
        {
          label: "Reception & cultural impact",
          ask: `What were the commercial reception, chart performance, and cultural impact of ${subject}?`,
        },
        ...(dates.length > 0
          ? [
              {
                label: clampPillLabel(`Timeline of ${shortSubject}`),
                ask: `Give a clear chronological timeline of the key events around ${subject}.`,
              },
            ]
          : []),
        {
          label: /\b(album|song|single|track|record)\b/i.test(`${cleanedQ} ${plainBody}`)
            ? "Behind the scenes & tracklist"
            : "Themes & creative style",
          ask: `Break down the production story, key tracks or scenes, and creative themes behind ${subject}.`,
        },
      );
      break;

    case "cve_cyber": {
      const isVulnOrIncident =
        cves.length > 0 ||
        /\b(?:vulnerability|vulnerabilities|exploit\w*|ransomware|malware|breach|incident|compromise|iocs?|hunting|sigma|attack\s+path|remediat\w*)\b/i.test(
          `${cleanedQ} ${plainBody}`,
        );
      if (cves[0]) {
        candidates.push({
          label: clampPillLabel(`Detection rules for ${cves[0]}`),
          ask: `Provide Sigma/SIEM detection rules and hunting queries for ${cves[0]}.`,
        });
      }
      if (isVulnOrIncident) {
        candidates.push(
          {
            label: "Patching & containment steps",
            ask: `Detail prioritized patching, hardening, and immediate containment steps for ${subject}.`,
          },
          {
            label: "MITRE ATT&CK & blast radius",
            ask: `Map the MITRE ATT&CK techniques, lateral movement paths, and potential blast radius for ${subject}.`,
          },
        );
      } else {
        candidates.push(
          {
            label: "Cert rotation & PKI setup",
            ask: `Explain certificate rotation, trust stores, and PKI lifecycle management for ${subject}.`,
          },
          {
            label: "Threat model & failure modes",
            ask: `Analyze common misconfigurations, failure modes, and security edge cases for ${subject}.`,
          },
        );
      }
      if (/\b(?:architecture|network|zero[- ]trust|mtls|tls|mesh|flow|microservice)\b/i.test(`${cleanedQ} ${plainBody}`)) {
        const flowSubject =
          /\bmTLS\b/i.test(subject)
            ? "mTLS"
            : entities[0] && entities[0].length <= 20
            ? entities[0]
            : shortSubject;
        candidates.push({
          label: clampPillLabel(`Diagram ${flowSubject} flow`),
          ask: `Draw a clear technical architecture and handshake flow diagram for ${subject}.`,
        });
      }
      break;
    }

    case "clinical":
      candidates.push(
        {
          label: "Differentials & key workup",
          ask: `List the top differential diagnoses and prioritized diagnostic workup for ${subject}.`,
        },
        {
          label: "Red flags & monitoring plan",
          ask: `What critical red flags, hemodynamic targets, and monitoring parameters apply to ${subject}?`,
        },
        {
          label: "Dosing & contraindications",
          ask: `Detail first-line dosing adjustments, renal/hepatic precautions, and contraindications for ${subject}.`,
        },
        {
          label: "Plain-language patient guide",
          ask: `Explain ${subject} in clear, compassionate plain language for a patient or family.`,
        },
      );
      break;

    case "software_arch": {
      const archSubject = truncateWords(subject, 20);
      candidates.push(
        {
          label: clampPillLabel(`Diagram ${archSubject} architecture`),
          ask: `Create an architecture and data-flow diagram for ${subject}.`,
        },
        {
          label: "Failure modes & scaling limits",
          ask: `Analyze failure modes, bottlenecks, and scaling limits for ${subject}.`,
        },
        {
          label: "Compare technical alternatives",
          ask: `Compare the primary technical alternatives and trade-offs for ${subject}.`,
        },
        {
          label: "Estimate infra & cost",
          ask: `Estimate infrastructure requirements, latency budget, and operational cost drivers for ${subject}.`,
        },
      );
      break;
    }

    case "finance":
      candidates.push(
        {
          label: "Bull, base & bear scenarios",
          ask: `Model bull, base, and bear sensitivity scenarios and key assumptions for ${subject}.`,
        },
        {
          label: "Peer & benchmark comparison",
          ask: `Compare ${subject} against relevant industry benchmarks and peer multiples.`,
        },
        {
          label: "Tax & liquidity considerations",
          ask: `Outline key risk, liquidity, and tax considerations for ${subject}.`,
        },
      );
      break;

    case "legal":
      candidates.push(
        {
          label: "Key risks & redline options",
          ask: `Identify the highest-risk terms and practical redline alternatives for ${subject}.`,
        },
        {
          label: "Exceptions & jurisdiction rules",
          ask: `Explain major carve-outs, statutory exceptions, and jurisdictional variations affecting ${subject}.`,
        },
        {
          label: "Actionable compliance checklist",
          ask: `Turn ${subject} into a concrete, step-by-step legal and compliance checklist.`,
        },
      );
      break;

    case "scripture":
      candidates.push(
        {
          label: "Historical & chapter context",
          ask: `Explain the surrounding chapter flow and historical context of ${subject}.`,
        },
        {
          label: "Original-language word study",
          ask: `Do a Hebrew/Greek word study on the key terms in ${subject}.`,
        },
        {
          label: "Cross-references & parallels",
          ask: `List key biblical cross-references and parallel passages for ${subject}.`,
        },
      );
      break;

    case "history_bio":
      candidates.push(
        {
          label: clampPillLabel(`Timeline of ${shortSubject}`),
          ask: `Provide a chronological timeline of the defining milestones in ${subject}.`,
        },
        {
          label: "Causes & lasting consequences",
          ask: `Analyze the root causes and long-term consequences of ${subject}.`,
        },
        {
          label: "Key figures & perspectives",
          ask: `Highlight the central figures and differing historical perspectives around ${subject}.`,
        },
      );
      break;

    case "science_math":
      candidates.push(
        {
          label: "Step-by-step mechanism",
          ask: `Walk step by step through the underlying mechanism and governing principles of ${subject}.`,
        },
        {
          label: "Real-world applications",
          ask: `Give concrete real-world applications and current limitations of ${subject}.`,
        },
        {
          label: "Common misconceptions",
          ask: `Clarify the most common misconceptions and edge cases in ${subject}.`,
        },
      );
      break;

    case "general":
    default:
      if (dates.length > 0) {
        candidates.push({
          label: clampPillLabel(`Timeline of ${shortSubject}`),
          ask: `Lay out the chronological timeline and key turning points of ${subject}.`,
        });
      }
      if (/\b(?:rushed|forced|leaked|changed|next|afterward|led\s+to|shifted|triggered)\b/i.test(plainBody)) {
        candidates.push({
          label: "What happened next?",
          ask: `What happened afterward and what were the broader outcomes of ${subject}?`,
        });
      }
      candidates.push(
        {
          label: clampPillLabel(`Examples of ${shortSubject}`),
          ask: `Give concrete, memorable examples illustrating ${subject}.`,
        },
        {
          label: "Compare key perspectives",
          ask: `Compare the main perspectives, trade-offs, or viewpoints on ${subject}.`,
        },
      );
      break;
  }

  // Priority 3 — Closing utility pill
  if (options?.desk === "study") {
    candidates.push({
      label: clampPillLabel(`Quiz me on ${shortSubject}`),
      ask: `Give me a 5-question practice quiz on ${subject} with detailed rationales.`,
    });
  } else if (plainBody.length > 480) {
    candidates.push({
      label: "Summarize key takeaways",
      ask: `Summarize the most important takeaways about ${subject} in concise bullet points.`,
    });
  } else {
    candidates.push({
      label: clampPillLabel(`Explain ${shortSubject} simply`),
      ask: `Explain ${subject} in simpler, everyday terms with one clear analogy.`,
    });
  }

  const out: ContextualFollowUp[] = [];
  const seenKeys = new Set<string>();
  for (const item of candidates) {
    const label = clampPillLabel(item.label);
    const key = label.toLowerCase().replace(/[^a-z0-9]+/g, "");
    if (!label || !key || seenKeys.has(key)) continue;
    if (isEchoOfQuestion({ label, ask: item.ask }, cleanedQ)) continue;
    seenKeys.add(key);
    out.push({ label, ask: item.ask.trim() });
    if (out.length >= maxItems) break;
  }

  return out;
}
