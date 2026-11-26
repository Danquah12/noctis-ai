import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDeterministicPlainLanguage,
  buildPlainLanguagePrompt,
  isCyberSecurityReport,
  isValidPlainLanguageOutput,
} from "./noctis-plain-language.ts";

test("isValidPlainLanguageOutput rejects echoed CVE intelligence reports and accepts plain explanations", () => {
  const echoed =
    "Noctis Sovereign Vulnerability Intelligence: CVE-2026-123158\n[!IMPORTANT]\n### OpenBSD OpenSSH Security Advisory\n<!-- noctis-route:test -->";
  assert.equal(isValidPlainLanguageOutput(echoed), false);

  const plain = buildDeterministicPlainLanguage(
    "Official Vulnerability Name: OpenBSD OpenSSH Security Advisory\nAffected Target: OpenBSD — OpenSSH\nCISA KEV Status: CONFIRMED IN CISA KEV CATALOG\nCVSS 3.1 Base Score: 8.1 / 10.0\nEPSS Exploit Probability: 97.2419999%\nRansomware / Threat Campaigns: Enterprise Extortion",
  );
  assert.equal(isValidPlainLanguageOutput(plain), true);
  assert.match(plain, /OpenBSD OpenSSH/);
  assert.match(plain, /97\.2%/);
  assert.match(plain, /URGENT \(Fix Right Away\)/);
});

test("isValidPlainLanguageOutput accepts genuine general plain-English rewrites and rejects verbatim opening echoes", () => {
  const orig =
    "An architect designs systems by creating formal architecture descriptions that link stakeholder concerns to governing viewpoints and ensure cross-boundary consistency according to ISO/IEC/IEEE 42010.";
  assert.equal(isValidPlainLanguageOutput(orig, orig), false);

  const aiRewrite =
    "1. In simple words\nDesigning complex software is like drawing building blueprints so everyone from the owner to the plumber agrees on how things connect.\n\n2. Key ideas in plain English\n- Stakeholders are the people who care about the system.\n- Views are tailored maps drawn for each group.";
  assert.equal(isValidPlainLanguageOutput(aiRewrite, orig), true);
});

test("buildPlainLanguagePrompt tailors instructions for cyber reports vs general topics", () => {
  const cyberPrompt = buildPlainLanguagePrompt("CVE-2026-103406 RCE in Juniper Session Smart Conductor");
  assert.match(cyberPrompt, /ZERO cybersecurity or technical background/i);
  assert.match(cyberPrompt, /What this is/i);
  assert.match(cyberPrompt, /CVE-2026-103406/);

  const generalPrompt = buildPlainLanguagePrompt(
    "An architect designs systems by creating formal architecture descriptions according to ISO/IEC/IEEE 42010.\n\n---\n**NDKRS Verified Knowledge Grounding** · Citations: `IEEE-42010` · SHA-256: `50d969071561`",
  );
  assert.match(generalPrompt, /In simple words/i);
  assert.match(generalPrompt, /Do NOT add unrelated cybersecurity warnings/i);
  assert.doesNotMatch(generalPrompt, /NDKRS Verified Knowledge Grounding/i);
  assert.equal(
    isValidPlainLanguageOutput("NDKRS Live Platform Status\n- Database Backend: neon\n- Verified Authoritative Sources / Records / Chunks: 145"),
    false,
  );
});

test("buildDeterministicPlainLanguage translates zero-day & CVE jargon clearly for non-cyber readers", () => {
  const raw =
    "Zero-day critical vulnerability CVE-2026-103406 affecting Juniper Networks Session Smart Conductor (CVSS 9.8, CISA KEV actively exploited, EPSS: 94%). Allows remote code execution and unauthorized persistence. Step 2: Patch acquisition and SHA-256 verification.";

  assert.equal(isCyberSecurityReport(raw), true);
  const plain = buildDeterministicPlainLanguage(raw);
  assert.match(plain, /1\. What this means \(in everyday words\)/);
  assert.match(plain, /lock defect/i);
  assert.match(plain, /Juniper Networks|Session Smart Conductor/);
  assert.match(plain, /2\. What could go wrong if ignored/);
  assert.match(plain, /run their own commands/i);
  assert.match(plain, /3\. How urgent it is/);
  assert.match(plain, /URGENT \(Fix Right Away\)/);
  assert.match(plain, /4\. Simple next steps/);
  assert.match(plain, /official manufacturer security update/i);
});

test("buildDeterministicPlainLanguage handles general non-CVE cyber advisories", () => {
  const plain = buildDeterministicPlainLanguage("Privilege escalation risk in admin portal due to weak token checks.");
  assert.match(plain, /full administrator control/i);
  assert.match(plain, /Simple next steps/);
});

test("buildDeterministicPlainLanguage explains ISO/IEC/IEEE 42010 architecture in plain words without cyber boilerplate", () => {
  const archRaw = [
    "Routed to:Core · General Reasoning",
    "Thought for 8 seconds· Noctis Ultra",
    "(Chain of Thought & Domain Reasoning)",
    "An architect designs systems by creating formal architecture descriptions that link stakeholder concerns to governing viewpoints and ensure cross-boundary consistency according to ISO/IEC/IEEE 42010.",
    "",
    "Core Components of an Architecture Description",
    "An architecture description organizes how a system is understood, built, and evaluated. Every view in this description must trace back to real stakeholder concerns.",
    "",
    "Structured Reference Table (3 Columns)",
    "Export CSV (.csv)",
    "Component\tDefinition\tPurpose",
    "Stakeholder\tAn individual or organization with interests in the system.\tDefines what concerns must be addressed.",
    "Viewpoint\tSpecifications, conventions, and rules for creating a view.\tProvides a template for addressing concerns.",
    "View\tA work product expressing the architecture from a viewpoint.\tShows how the system satisfies specific concerns.",
    "Correspondence Rule\tRules checking consistency across system boundaries.\tEnsures functional, security, and deployment alignment.",
    "",
    "Concrete Example",
    "For example, when designing an online banking platform, the Chief Information Security Officer (a stakeholder) has a primary concern regarding data privacy. The architect creates a security viewpoint, generates a security view showing encrypted data pipelines, and applies correspondence rules to verify that the deployment view never exposes unencrypted storage endpoints.",
    "",
    "NDKRS Verified Knowledge Grounding · Citations: IEEE-42010 · SHA-256: 50d969071561",
  ].join("\n");

  assert.equal(isCyberSecurityReport(archRaw), false);
  const plain = buildDeterministicPlainLanguage(archRaw);
  assert.match(plain, /1\. In simple words/);
  assert.match(plain, /architect/i);
  assert.match(plain, /Stakeholder/i);
  assert.match(plain, /Viewpoint/i);
  assert.match(plain, /Chief Information Security Officer/i);
  assert.doesNotMatch(plain, /software weakness|sign-in logs|IT team|official manufacturer security update/i);
  assert.equal(isValidPlainLanguageOutput(plain, archRaw), true);
});
