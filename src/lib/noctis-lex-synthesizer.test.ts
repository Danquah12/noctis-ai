import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  CANONICAL_LEGAL_COLLISIONS,
  CANONICAL_REGULATORY_STATUTES,
  synthesizeRegulatoryHarmonization,
  formatLexSynthesisMarkdown,
  handleNaturalLexQuery,
} from "./noctis-lex-synthesizer.ts";

describe("Noctis Cross-Border Conflict-of-Laws Regulatory Synthesizer (NOCTIS-LEX-001)", () => {
  test("provides complete canonical statutes across US and EU jurisdictions", () => {
    const statutes = Object.values(CANONICAL_REGULATORY_STATUTES);
    assert.equal(statutes.length >= 6, true);

    const jurisdictions = new Set(statutes.map((s) => s.jurisdiction));
    assert.equal(jurisdictions.has("UNITED_STATES"), true);
    assert.equal(jurisdictions.has("EUROPEAN_UNION"), true);
  });

  test("synthesizes harmonized safe harbor for US CLOUD Act vs GDPR collision", () => {
    const state = synthesizeRegulatoryHarmonization("collision-cloud-gdpr");

    assert.equal(state.scenario.primaryStatute.code, "US CLOUD Act (18 U.S.C. § 2713)");
    assert.equal(state.scenario.conflictingStatute.code, "GDPR Article 48");
    assert.equal(state.scenario.projectedExposureEur, 20000000);
    assert.equal(state.recommendedLegalAction.includes("MLAT"), true);
    assert.equal(state.cryptographicSeal.length, 64);
  });

  test("resolves SEC 4-day disclosure vs GDPR 72-hour breach collision", () => {
    const state = synthesizeRegulatoryHarmonization("collision-sec-gdpr-breach");

    assert.equal(state.scenario.primaryStatute.code, "SEC Item 1.05 Form 8-K");
    assert.equal(state.scenario.conflictingStatute.code, "GDPR Article 33");
    assert.equal(state.recommendedLegalAction.includes("Dual-Track Staggered Handoff"), true);
  });

  test("formats audited Markdown dossier with collision table and citations", () => {
    const state = synthesizeRegulatoryHarmonization("collision-ai-act-trade-secrets");
    const md = formatLexSynthesisMarkdown(state);

    assert.equal(md.includes("# Noctis Cross-Border Conflict-of-Laws Regulatory Synthesizer"), true);
    assert.equal(md.includes("Jurisdictional Statutory Collision"), true);
    assert.equal(md.includes("Harmonized Safe-Harbor Enterprise Action Plan"), true);
    assert.equal(md.includes(state.cryptographicSeal), true);
  });

  test("accurately routes natural language regulatory collision queries", () => {
    const cloudQuery = "Analyze conflict of laws between US CLOUD Act warrant and GDPR Article 48";
    const resCloud = handleNaturalLexQuery(cloudQuery);
    assert.notEqual(resCloud, null);
    assert.equal(resCloud?.includes("US CLOUD Act Extraterritorial Warrant"), true);

    const secQuery = "Harmonize SEC 4-day cyber incident disclosure with GDPR 72-hour notification";
    const resSec = handleNaturalLexQuery(secQuery);
    assert.notEqual(resSec, null);
    assert.equal(resSec?.includes("SEC 4-Day Materiality Disclosure"), true);

    // Negative case
    const unrelated = "How many moons does Jupiter have?";
    assert.equal(handleNaturalLexQuery(unrelated), null);
  });
});
