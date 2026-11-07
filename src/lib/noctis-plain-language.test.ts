import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { translateToPlainLanguage } from "./noctis-plain-language.ts";

describe("NOCTIS ULTRA-SIMPLE PLAIN LANGUAGE EXPLAINER (Ages 18 & Under)", () => {
  it("translates complex cybersecurity CVE buffer overflow into punchy 10-year-old terms", () => {
    const raw = `CVE-2026-21445 is an unauthenticated Remote Code Execution vulnerability in OpenSSL ASN.1 parser via heap-based buffer overflow in d2i_X509_CERT_AUX caused by integer signedness mismatch in length calculation.`;
    const res = translateToPlainLanguage(raw, { audience: "youth_under_18" });

    assert.ok(res.spokenNarrative.length > 20);
    assert.ok(res.headline.includes("juice") || res.headline.includes("cup") || res.headline.includes("weak spot") || res.headline.includes("cookies"));
    assert.ok(!res.spokenNarrative.includes("d2i_X509_CERT_AUX"));
    assert.ok(!res.spokenNarrative.includes("signedness mismatch"));
    assert.equal(res.domain, "Cybersecurity & Defense");
  });

  it("translates astrophysics Schwarzschild radius into simple everyday terms", () => {
    const raw = `The Schwarzschild radius of a 20 solar mass black hole is r_s = \\frac{2GM}{c^2} \\approx 59.08\\text{ km}. Spacetime curvature invariants diverge at the singularity.`;
    const res = translateToPlainLanguage(raw, { audience: "youth_under_18" });

    assert.ok(res.spokenNarrative.includes("black hole") || res.spokenNarrative.includes("suns"));
    assert.ok(!res.spokenNarrative.includes("\\frac"));
    assert.ok(!res.spokenNarrative.includes("invariants diverge"));
    assert.equal(res.domain, "Astrophysics & Space Science");
  });

  it("translates CRISPR gene editing into clear scissors and recipe book analogy", () => {
    const raw = `CRISPR Cas9 endonuclease off-target cleavage with PAM sequence NGG and guide RNA binding affinity Kd = 1.2 nM.`;
    const res = translateToPlainLanguage(raw, { audience: "youth_under_18" });

    assert.ok(res.spokenNarrative.includes("scissors") || res.spokenNarrative.includes("recipe") || res.spokenNarrative.includes("typo"));
    assert.equal(res.domain, "Biology & Medicine");
  });

  it("translates software deadlocks into simple sharing toys/crayons analogy", () => {
    const raw = `Deadlock detected in pthread_mutex_lock acquisition hierarchy where Thread 1 holds mutex_A awaiting mutex_B while Thread 2 holds mutex_B awaiting mutex_A.`;
    const res = translateToPlainLanguage(raw, { audience: "youth_under_18" });

    assert.ok(res.spokenNarrative.includes("freeze") || res.spokenNarrative.includes("crayon") || res.spokenNarrative.includes("turns"));
    assert.equal(res.domain, "Software & Systems");
  });
});
