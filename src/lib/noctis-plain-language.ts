/**
 * Converts technical answers (cybersecurity advisories OR general/architectural/engineering answers)
 * into clear everyday language for non-technical readers.
 */

const CYBER_SIGNAL_RE =
  /\b(?:CVE-\d{4}-\d{4,7}|zero[-\s]?day|0[-\s]?day|CVSS|EPSS|CISA\s+KEV|KEV\s+catalog|ransomware|malware|phishing|botnet|trojan|backdoor|spyware|rootkit|keylogger|remote code execution|RCE|authentication bypass|privilege escalation|sql injection|cross-site scripting|buffer overflow|heap overflow|use-after-free|command injection|path traversal|memory corruption|vulnerability|vulnerabilities|vulnerable|exploit(?:ed|ation|able)?|threat actor|threat campaign|compromise assessment|patch acquisition|security advisory|affected target|remediation steps)\b/i;

export function isCyberSecurityReport(raw: string): boolean {
  const txt = String(raw ?? "").replace(/<!--[\s\S]*?-->/g, " ");
  return CYBER_SIGNAL_RE.test(txt);
}

export function buildPlainLanguagePrompt(rawAnswer: string): string {
  const cleaned = String(rawAnswer ?? "")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/(?:^|\n)\s*---+\s*\n*\*{0,2}NDKRS Verified Knowledge Grounding[\s\S]*$/i, "")
    .replace(/^\s*(?:Routed to:.*|Switch|Thought for .*|View steps|\(Chain of Thought.*|NDKRS Verified Knowledge Grounding.*)\s*$/gim, "")
    .trim()
    .slice(0, 10_000);

  if (isCyberSecurityReport(cleaned)) {
    return [
      "Rewrite the report below in clear, simple, everyday English for someone with ZERO cybersecurity or technical background.",
      "Avoid acronyms and unexplained jargon (explain codes in everyday words). Do NOT invent facts outside the text.",
      "Use these exact 4 short sections:",
      "1. What this is (in everyday words) — include a simple real-world analogy (for example, an unlocked door, a copied master key, or a flaw before the maker knew).",
      "2. What could go wrong if ignored — explain the real-world impact on people, data, or operations.",
      "3. How urgent it is — state clearly whether this requires immediate action today, routine patching, or monitoring, and why.",
      "4. What to do next — give 2 to 4 concrete, easy-to-follow steps.",
      "",
      "ORIGINAL REPORT:",
      cleaned,
    ].join("\n");
  }

  return [
    "Rewrite the explanation below in clear, simple, everyday English for someone with ZERO technical background.",
    "Stay strictly focused on the actual subject matter of the text. Explain any jargon or standards in plain words, and do NOT invent facts outside the text.",
    "Do NOT add unrelated cybersecurity warnings unless the original text is actually about a cyber threat.",
    "Use these exact 3 short sections:",
    "1. In simple words — explain what this is all about in 1 to 2 short everyday sentences (with a simple real-life comparison if helpful).",
    "2. Key ideas in plain English — break down the main parts, terms, or steps into 3 to 5 short, easy-to-read bullet points.",
    "3. Real-world example & takeaway — share a concrete everyday example from the text (or a brief practical takeaway).",
    "",
    "ORIGINAL TEXT:",
    cleaned,
  ].join("\n");
}

function normalizeForComparison(text: string): string {
  return String(text ?? "")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/[#>*`|_~]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function isValidPlainLanguageOutput(candidate: string, originalRaw?: string): boolean {
  const txt = String(candidate ?? "").trim();
  if (txt.length < 60) return false;
  if (
    /<!--\s*noctis-route:|Sovereign Vulnerability Intelligence|Official Vulnerability Name:|Non-Destructive Interactive Verification Harness|\[!IMPORTANT\]|^###\s|NDKRS Verified Knowledge Grounding|NDKRS Live Platform Status|Verified Authoritative Sources \/ Records \/ Chunks|Executable Deterministic Rules|Recent Signed Validation Certificates|Structured Reference Table|Export CSV|\(Chain of Thought & Domain Reasoning\)/im.test(
      txt,
    )
  ) {
    return false;
  }
  if (/^(?:i (?:am )?sorry|error:|unable to|cannot complete|noctis could not finish|write a question|service unavailable)/i.test(txt)) {
    return false;
  }
  if (originalRaw) {
    const normCand = normalizeForComparison(txt);
    const normOrig = normalizeForComparison(originalRaw);
    if (normOrig.length >= 80 && normCand.slice(0, 80) === normOrig.slice(0, 80)) {
      return false;
    }
  }
  return true;
}

function cleanInput(raw: string): string {
  return String(raw ?? "")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[!IMPORTANT\]|\[!NOTE\]|\[!WARNING\]/gi, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

function cleanGeneralProse(raw: string): string {
  const withoutChrome = cleanInput(raw)
    .replace(/^\s*(?:Noctis|Routed to:.*|Switch|Thought for .*|View steps|\(Chain of Thought.*|Structured Reference Table.*|Export CSV.*|NDKRS Verified Knowledge Grounding.*)\s*$/gim, "")
    .replace(/\r\n/g, "\n")
    .trim();

  return withoutChrome.replace(/\n{3,}/g, "\n\n");
}

function isTableHeaderRow(cells: string[]): boolean {
  const joined = cells.join(" ").toLowerCase();
  return (
    cells.length >= 2 &&
    /\b(?:component|term|name|definition|purpose|role|description|item|phase|step)\b/.test(joined) &&
    cells.every((c) => c.length < 40)
  );
}

function buildGeneralPlainLanguage(rawAnswer: string): string {
  const cleaned = cleanGeneralProse(rawAnswer);
  if (!cleaned) {
    return [
      "1. In simple words",
      "This response explains a concept step by step so it is easier to follow.",
      "",
      "2. Key ideas in plain English",
      "- Start with the main goal, review the key parts, and check how they fit together.",
    ].join("\n");
  }

  const lines = cleaned.split("\n").map((l) => l.trim()).filter(Boolean);
  const proseParagraphs: string[] = [];
  const extractedBullets: string[] = [];
  const exampleLines: string[] = [];
  let inExampleSection = false;

  for (const line of lines) {
    if (/^[-|: ]+$/.test(line)) continue;

    if (/^(?:Concrete Example|Real-World Example|Example)\b/i.test(line)) {
      inExampleSection = true;
      continue;
    }

    if (/^(?:How to |What happens next:)/i.test(line)) {
      inExampleSection = false;
      if (/^What happens next:/i.test(line)) {
        exampleLines.push(line.replace(/^What happens next:\s*/i, "What happens afterward: "));
      }
      continue;
    }

    if (inExampleSection || /^For example[,:\s]/i.test(line)) {
      exampleLines.push(line);
      continue;
    }

    // Parse tab-separated or markdown pipe table rows into everyday bullets
    if (line.includes("\t")) {
      const cells = line.split("\t").map((c) => c.trim()).filter(Boolean);
      if (cells.length >= 2 && !isTableHeaderRow(cells)) {
        const rest = cells.slice(1).join(" — ");
        extractedBullets.push(`- **${cells[0]}**: ${rest}`);
      }
      continue;
    }

    if (line.startsWith("|") && line.endsWith("|")) {
      const cells = line
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean);
      if (cells.length >= 2 && !isTableHeaderRow(cells)) {
        extractedBullets.push(`- **${cells[0]}**: ${cells.slice(1).join(" — ")}`);
      }
      continue;
    }

    if (/^(?:[-*]|\d+\.)\s+/.test(line)) {
      const item = line.replace(/^(?:[-*]|\d+\.)\s+/, "").trim();
      if (item.length > 8 && !/^Core Components of/i.test(item)) {
        extractedBullets.push(`- ${item}`);
      }
      continue;
    }

    // Skip standalone short section subheadings that carry no explanation
    if (line.length < 55 && !/[.!?]$/.test(line)) {
      continue;
    }

    proseParagraphs.push(line);
  }

  const allSentences = proseParagraphs
    .join(" ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 18);

  const summary =
    allSentences.slice(0, 2).join(" ") ||
    lines.find((l) => l.length > 30) ||
    "Here is a straightforward breakdown of the topic in everyday words.";

  const bullets: string[] = [];
  for (const b of extractedBullets) {
    if (bullets.length >= 6) break;
    if (!bullets.includes(b)) bullets.push(b);
  }
  if (bullets.length < 3) {
    for (const sentence of allSentences.slice(2)) {
      if (bullets.length >= 5) break;
      const formatted = `- ${sentence}`;
      if (!bullets.includes(formatted)) bullets.push(formatted);
    }
  }
  if (bullets.length === 0) {
    bullets.push(`- ${summary}`);
  }

  const takeaway =
    exampleLines.join(" ").trim() ||
    (allSentences.length > 3 ? allSentences[allSentences.length - 1] : "");

  const sections = [
    "1. In simple words",
    summary,
    "",
    "2. Key ideas in plain English",
    ...bullets,
  ];

  if (takeaway) {
    sections.push("", "3. Real-world example & takeaway", takeaway);
  }

  return sections.join("\n");
}

function buildCyberPlainLanguage(cleaned: string): string {
  const cveMatch = cleaned.match(/\bCVE-\d{4}-\d{4,7}\b/i);
  const cve = cveMatch ? cveMatch[0].toUpperCase() : "";

  const nameMatch =
    cleaned.match(/Official Vulnerability Name:\s*([^\n]+)/i) ||
    cleaned.match(/Affected Target:\s*([^\n]+)/i) ||
    cleaned.match(/affecting\s+([A-Z][^\n(.]{4,60})/i);
  const target = nameMatch ? nameMatch[1].replace(/\s*[—–-]\s*$/, "").trim() : "";

  const isZeroDay = /zero[-\s]?day|0[-\s]?day/i.test(cleaned);
  const isKev = /CISA KEV|actively exploited|known exploited|ACTIVE EXPLOITATION/i.test(cleaned);
  const hasRansomware = /ransomware|extortion|threat actor/i.test(cleaned);
  const cvssMatch = cleaned.match(/CVSS[^0-9]*([0-9]+(?:\.[0-9])?)/i);
  const cvss = cvssMatch ? Number(cvssMatch[1]) : null;
  const epssMatch = cleaned.match(/EPSS[^0-9]*([0-9]+(?:\.[0-9]+)?)\s*%/i);
  const epss = epssMatch ? `${Number(epssMatch[1]).toFixed(1)}%` : "";

  const isRce = /remote code execution|RCE|arbitrary code/i.test(cleaned);
  const isAuthBypass = /auth(?:entication)? bypass|privilege escalation|unauthorized admin|token check/i.test(cleaned);
  const isDataExposure = /exfiltrat|data leak|sensitive data|credential|read arbitrary/i.test(cleaned);

  const subject = target
    ? `${target}${cve ? ` (${cve})` : ""}`
    : cve || "this software system";

  const whatIsIt = isZeroDay
    ? `Someone found a brand-new security flaw ("zero-day") in ${subject} that attackers started using before a fix was ready — like discovering a lock defect on a building before the locksmith can replace it.`
    : `There is a known security weakness in ${subject} — similar to leaving a back door slightly unlatched so an intruder could sneak past normal login checks.`;

  const harms: string[] = [];
  if (isRce) {
    harms.push("An outsider could remotely run their own commands on affected computers without permission.");
  }
  if (isAuthBypass) {
    harms.push("An attacker could slip past password screens or gain full administrator control.");
  }
  if (isDataExposure || hasRansomware) {
    harms.push("Private files could be stolen, locked up for ransom, or business operations could be disrupted.");
  }
  if (harms.length === 0) {
    harms.push("If left unfixed, someone with bad intentions could misuse the system or access information they should not see.");
  }
  if (epss) {
    harms.push(`Security monitors estimate roughly a ${epss} chance this flaw gets targeted soon if systems stay unpatched.`);
  }

  let urgency = "Medium priority — review during your next scheduled maintenance check.";
  if (isZeroDay || isKev || (cvss !== null && cvss >= 9.0)) {
    urgency = "URGENT (Fix Right Away) — attackers are actively exploiting weaknesses like this right now, so apply the official update immediately.";
  } else if (cvss !== null && cvss >= 7.0) {
    urgency = "High priority — schedule the software update within the next few days before attackers target it widely.";
  }

  const steps = [
    target
      ? `Ask your IT team or software administrator to install the official manufacturer security update for ${target}.`
      : "Check with your software vendor or IT team for the latest official fix or safe workaround.",
    "Until updated, limit outside internet access to the affected tool to only trusted staff or VPN connections.",
    "Have IT check recent sign-in logs and admin accounts to confirm nobody unauthorized got in before the update.",
    "Restart or verify the software version afterward so you know the fix is actually active.",
  ];

  return [
    "1. What this means (in everyday words)",
    whatIsIt,
    "",
    "2. What could go wrong if ignored",
    harms.join(" "),
    "",
    "3. How urgent it is",
    urgency,
    "",
    "4. Simple next steps",
    ...steps.map((s, i) => `${i + 1}. ${s}`),
  ].join("\n");
}

export function buildDeterministicPlainLanguage(rawAnswer: string): string {
  const cleaned = cleanInput(rawAnswer);
  if (isCyberSecurityReport(cleaned)) {
    return buildCyberPlainLanguage(cleaned);
  }
  return buildGeneralPlainLanguage(rawAnswer);
}
