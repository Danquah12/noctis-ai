import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDeterministicPlainLanguage,
  buildPlainLanguagePrompt,
} from "./noctis-plain-language.ts";

test("buildPlainLanguagePrompt asks for jargon-free 4-section non-cyber explanation", () => {
  const prompt = buildPlainLanguagePrompt("CVE-2026-103406 RCE in Juniper Session Smart Conductor");
  assert.match(prompt, /ZERO cybersecurity or technical background/i);
  assert.match(prompt, /What this is/i);
  assert.match(prompt, /CVE-2026-103406/);
});

test("buildDeterministicPlainLanguage translates zero-day & CVE jargon clearly for non-cyber readers", () => {
  const raw =
    "Zero-day critical vulnerability CVE-2026-103406 affecting Juniper Networks Session Smart Conductor (CVSS 9.8, CISA KEV actively exploited, EPSS: 94%). Allows remote code execution and unauthorized persistence. Step 2: Patch acquisition and SHA-256 verification.";

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

test("buildDeterministicPlainLanguage handles general non-CVE technical text gracefully", () => {
  const plain = buildDeterministicPlainLanguage("Privilege escalation risk in admin portal due to weak token checks.");
  assert.match(plain, /full administrator control/i);
  assert.match(plain, /Simple next steps/);
});
