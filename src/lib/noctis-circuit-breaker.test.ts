import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateCircuitBreaker,
  formatCircuitBreakerMarkdown,
  handleNaturalCircuitBreakerQuery,
} from "./noctis-circuit-breaker.ts";

describe("Noctis Epistemic Circuit Breaker & Kill-Switch (NOCTIS-CIRCUIT-001)", () => {
  test("passes clean, verified input across all 5 invariants", () => {
    const cleanText =
      "Company reports total assets of $500M with total liabilities of $300M and stockholders' equity of $200M. Potassium is 4.2 mmol/L. CVSS base score of 7.5. Probabilities summing to 60% and 40%.";
    const state = evaluateCircuitBreaker(cleanText);

    assert.equal(state.tripped, false);
    assert.equal(state.trippedCount, 0);
    assert.equal(state.totalInvariantsChecked, 5);
    assert.equal(state.actionTaken, "VERIFIED_PASSED");
    assert.equal(state.cryptographicSeal.length, 64);
  });

  test("trips financial balance invariant when Assets != Liabilities + Equity", () => {
    const brokenBalance =
      "Company reports total assets of $1000M with total liabilities of $800M and stockholders' equity of $500M.";
    const state = evaluateCircuitBreaker(brokenBalance);

    assert.equal(state.tripped, true);
    assert.equal(state.trippedCount >= 1, true);
    const finInv = state.evaluations.find((e) => e.type === "FINANCIAL_BALANCE");
    assert.equal(finInv?.passed, false);
    assert.equal(state.actionTaken, "CIRCUIT_BREAKER_TRIPPED_AUTO_CORRECTED");
    assert.notEqual(state.correctedText, null);
  });

  test("trips clinical safety invariant on critical hyperkalemia with non-urgent discharge", () => {
    const dangerousAdvice =
      "Patient potassium is 6.5 mmol/L. Safe to go home with routine follow-up next month.";
    const state = evaluateCircuitBreaker(dangerousAdvice);

    assert.equal(state.tripped, true);
    const medInv = state.evaluations.find((e) => e.type === "CLINICAL_SAFETY");
    assert.equal(medInv?.passed, false);
    assert.equal(state.correctedText?.includes("CIRCUIT BREAKER INTERCEPT"), true);
  });

  test("trips cyber vulnerability invariant on impossible CVSS > 10.0", () => {
    const invalidCvss = "The vulnerability has a CVSS v3.1 score of 12.8.";
    const state = evaluateCircuitBreaker(invalidCvss);

    assert.equal(state.tripped, true);
    const secInv = state.evaluations.find((e) => e.type === "CYBER_VULNERABILITY");
    assert.equal(secInv?.passed, false);
  });

  test("formats audited Markdown dossier with verification matrix and seal", () => {
    const sampleText = "Assets of $1000M with liabilities of $800M and equity of $500M.";
    const state = evaluateCircuitBreaker(sampleText);
    const md = formatCircuitBreakerMarkdown(state);

    assert.equal(md.includes("# Noctis Epistemic Circuit Breaker & Kill-Switch Audit"), true);
    assert.equal(md.includes("Invariant Verification Matrix"), true);
    assert.equal(md.includes("INV-FIN-01"), true);
    assert.equal(md.includes(state.cryptographicSeal), true);
  });

  test("routes natural language queries to Circuit Breaker engine", () => {
    const query = "Run the epistemic circuit breaker audit to test for hallucinations";
    const res = handleNaturalCircuitBreakerQuery(query);

    assert.notEqual(res, null);
    assert.equal(res?.includes("# Noctis Epistemic Circuit Breaker"), true);

    const unrelated = "How is the weather today?";
    assert.equal(handleNaturalCircuitBreakerQuery(unrelated), null);
  });
});
