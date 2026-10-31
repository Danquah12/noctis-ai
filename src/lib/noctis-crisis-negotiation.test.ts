import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  PREDEFINED_THREAT_SYNDICATES,
  solveCrisisNegotiationGame,
  formatCrisisNegotiationMarkdown,
  handleNaturalCrisisNegotiationQuery,
} from "./noctis-crisis-negotiation.ts";

describe("Noctis Game-Theoretic Ransomware & Crisis Negotiation Engine (NOCTIS-NASH-001)", () => {
  test("provides complete canonical threat syndicates with empirical rates", () => {
    const syndicates = Object.values(PREDEFINED_THREAT_SYNDICATES);
    assert.equal(syndicates.length >= 3, true);

    for (const s of syndicates) {
      assert.equal(typeof s.id, "string");
      assert.equal(typeof s.name, "string");
      assert.equal(s.initialDemandUsd > 0, true);
      assert.equal(s.keyDeliveryReliabilityPct >= 0 && s.keyDeliveryReliabilityPct <= 100, true);
    }
  });

  test("calculates Nash Equilibrium counter-offer discount for commercial syndicate", () => {
    const state = solveCrisisNegotiationGame({
      syndicateId: "syndicate-lockbit",
      hoursElapsed: 18,
      hourlyDowntimeBurnUsd: 50000,
    });

    assert.equal(state.recommendedStrategy, "COUNTER_OFFER_DISCOUNT");
    assert.equal(state.recommendedCounterOfferUsd > 0, true);
    assert.equal(state.recommendedCounterOfferUsd < state.profile.initialDemandUsd, true);
    assert.equal(state.ofacViolationRisk, "LOW_COMPLIANT");
    assert.equal(state.cryptographicSeal.length, 64);
  });

  test("strictly enforces OFAC legal veto on state-sponsored designated syndicates", () => {
    const state = solveCrisisNegotiationGame({
      syndicateId: "syndicate-ofac-flagged",
    });

    assert.equal(state.recommendedStrategy, "OFAC_LEGAL_VETO");
    assert.equal(state.recommendedCounterOfferUsd, 0);
    assert.equal(state.ofacViolationRisk, "CRITICAL_BLOCKED");
    assert.equal(state.strategicRationale.includes("CRITICAL OFAC VETO"), true);
  });

  test("formats audited Markdown dossier with payoff matrix and seal", () => {
    const state = solveCrisisNegotiationGame({ syndicateId: "syndicate-alphv" });
    const md = formatCrisisNegotiationMarkdown(state);

    assert.equal(md.includes("# Noctis Game-Theoretic Ransomware & Crisis Negotiation Engine"), true);
    assert.equal(md.includes("Repeated-Game Payoff Matrix"), true);
    assert.equal(md.includes("Strategic Rationale & Game-Theoretic Proof"), true);
    assert.equal(md.includes(state.cryptographicSeal), true);
  });

  test("accurately routes natural language crisis queries", () => {
    const lockbitQuery = "Run game theory negotiation simulation for ransomware counter-offer discount";
    const resLockbit = handleNaturalCrisisNegotiationQuery(lockbitQuery);
    assert.notEqual(resLockbit, null);
    assert.equal(resLockbit?.includes("LockBit 3.0 Syndicate"), true);

    const ofacQuery = "Check OFAC veto risk for Lazarus APT38 extortion demand";
    const resOfac = handleNaturalCrisisNegotiationQuery(ofacQuery);
    assert.notEqual(resOfac, null);
    assert.equal(resOfac?.includes("CRITICAL_BLOCKED"), true);

    // Negative case
    const unrelated = "What is the boiling point of water?";
    assert.equal(handleNaturalCrisisNegotiationQuery(unrelated), null);
  });
});
