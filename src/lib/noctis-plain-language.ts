/**
 * Converts technical / cybersecurity / zero-day reports into clear everyday language
 * for non-technical executives, clinicians, and general users.
 */

export function buildPlainLanguagePrompt(rawAnswer: string): string {
  const clipped = String(rawAnswer ?? "").trim().slice(0, 10_000);
  return [
    "Rewrite the report below in clear, simple, everyday English for someone with ZERO cybersecurity or technical background.",
    "Avoid acronyms and unexplained jargon (if a code like a CVE ID appears, explain what it means in brackets). Do NOT invent facts outside the text.",
    "Use these exact 4 short sections:",
    "1. What this is (in everyday words) — include a simple real-world analogy (for example, an unlocked door, a copied master key, or a flaw before the maker knew).",
    "2. What could go wrong if ignored — explain the real-world impact on people, data, or operations.",
    "3. How urgent it is — state clearly whether this requires immediate action today, routine patching, or monitoring, and why.",
    "4. What to do next — give 2 to 4 concrete, easy-to-follow steps.",
    "",
    "ORIGINAL REPORT:",
    clipped,
  ].join("\n");
}

function cleanInput(raw: string): string {
  return String(raw ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#*_>`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildDeterministicPlainLanguage(rawAnswer: string): string {
  const plain = cleanInput(rawAnswer);
  const lower = plain.toLowerCase();

  const cves = Array.from(new Set(plain.match(/CVE-\d{4}-\d{4,7}/gi) ?? [])).slice(0, 4);
  const isZeroDay = /\bzero[- ]?day\b|\b0[- ]?day\b/i.test(plain);
  const isKev = /\bkev\b|actively exploited|active exploitation|in the wild|cisa/i.test(plain);
  const cvssMatch = plain.match(/\bCVSS(?:\s*v?\d(?:\.\d)?)?[:\s]+(\d{1,2}(?:\.\d)?)/i);
  const cvssScore = cvssMatch ? Number(cvssMatch[1]) : null;
  const epssMatch = plain.match(/\bEPSS[:\s]+(\d{1,3}(?:\.\d+)?%?)/i);

  // Identify everyday analogy & attack meaning
  let whatIsIt = "This report describes a technical issue or software weakness found in a digital system.";
  let risk = "If left unfixed, someone with bad intentions could misuse the system or access information they should not see.";

  if (isZeroDay) {
    whatIsIt =
      "A \"zero-day\" security flaw means attackers discovered a hidden mistake in a software program before the company that made it had time to build and send out a fix — like a brand-new lock defect found before the locksmith knows about it.";
  } else if (cves.length > 0) {
    whatIsIt = `This notice tracks a known software safety defect (${cves.join(", ")}), which works like a safety recall notice for software telling owners to install a manufacturer fix.`;
  }

  if (/remote code execution|\brce\b|arbitrary code|command injection/i.test(lower)) {
    risk =
      "An outsider over the internet could send a specially crafted message that forces the computer or server to run their own commands — almost like someone sneaking past the front desk and taking over the building controls.";
  } else if (/authentication bypass|auth bypass|unauthenticated|session hijacking|credential/i.test(lower)) {
    risk =
      "Someone could walk past the login screen without knowing a real password or act as an authorized staff member.";
  } else if (/privilege escalation|admin access|root access/i.test(lower)) {
    risk =
      "A regular user or minor foothold could be turned into full administrator control, letting an attacker change settings or read protected files.";
  } else if (/sql injection|data exfiltration|information disclosure|sensitive data|leak/i.test(lower)) {
    risk =
      "Private records (such as customer details, passwords, or internal documents) could be copied or read without permission.";
  } else if (/denial of service|\bdos\b|\bddos\b|crash|outage/i.test(lower)) {
    risk =
      "The system could be overwhelmed or forced to shut down so legitimate users and staff cannot reach it.";
  } else if (/phishing|social engineering|impersonat/i.test(lower)) {
    risk =
      "Users could be tricked by fake screens or messages into handing over logins or sensitive details.";
  }

  const vendorMatches = Array.from(
    new Set(
      plain.match(
        /\b(?:Juniper Networks|Session Smart Conductor|Mitel|MiCollab|Microsoft|Cisco|Ivanti|Fortinet|Palo Alto|Apple|Google|Chrome|Linux|Apache|VMware|Citrix|Oracle)\b/gi,
      ) ?? [],
    ),
  ).slice(0, 4);

  const subjectLine = vendorMatches.length
    ? `Affected product${vendorMatches.length > 1 ? "s" : ""}: ${vendorMatches.join(", ")}.`
    : cves.length
      ? `Tracked issue${cves.length > 1 ? "s" : ""}: ${cves.join(", ")}.`
      : "";

  let urgency = "Medium priority — review during your next scheduled maintenance check.";
  if (isZeroDay || isKev || (cvssScore !== null && cvssScore >= 9)) {
    urgency = `URGENT (Fix Right Away) — ${
      isKev
        ? "attackers are already actively exploiting this flaw in real-world incidents."
        : isZeroDay
          ? "zero-day flaws have active attack exposure until updated."
          : `severity is rated ${cvssScore}/10 (Critical).`
    }${epssMatch ? ` Estimated attack likelihood: ${epssMatch[1]}.` : ""}`;
  } else if ((cvssScore !== null && cvssScore >= 7) || /\bhigh\b|\bcritical\b/i.test(lower)) {
    urgency = `High priority — apply the official update promptly before routine work piles up.${
      cvssScore !== null ? ` (Severity score: ${cvssScore}/10).` : ""
    }`;
  }

  const hasPatchStep = /patch|update|upgrade|vendor|hotfix|mitigat/i.test(lower);
  const steps = [
    hasPatchStep
      ? "Ask your IT or system team to download and install the official manufacturer security update right away."
      : "Check with your software vendor or IT team for the latest official fix or safe workaround.",
    "Until updated, limit outside internet access to the affected tool to only trusted staff or VPN connections.",
    "Have IT check recent sign-in logs and admin accounts to confirm nobody unauthorized got in before the update.",
    "Restart or verify the software version afterward so you know the fix is actually active.",
  ];

  return [
    "1. What this means (in everyday words)",
    `${whatIsIt}${subjectLine ? ` ${subjectLine}` : ""}`,
    "",
    "2. What could go wrong if ignored",
    risk,
    "",
    "3. How urgent it is",
    urgency,
    "",
    "4. Simple next steps",
    ...steps.map((s, idx) => `${idx + 1}. ${s}`),
  ].join("\n");
}
