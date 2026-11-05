import test from "node:test";
import assert from "node:assert/strict";
import {
  extractCveIdentifiers,
  classifySourceTier,
  queryCisaKevCatalog,
  fetchLiveEpss,
  fetchLiveCveRecord,
  noctisLiveSearch,
} from "./noctis-live-search.server.ts";

test("NOCTIS REAL-TIME LIVE INTELLIGENCE (GROK PILLAR) — TEST SUITE", async (t) => {
  await t.test("Pillar 3.1: Normalizes and extracts single and multiple CVE IDs", () => {
    const text = "Investigate CVE-2024-3400 along with cve-2023-46805 and some benign text about CVE-2024-21762.";
    const ids = extractCveIdentifiers(text);
    assert.deepEqual(ids, ["CVE-2024-3400", "CVE-2023-46805", "CVE-2024-21762"]);

    const none = extractCveIdentifiers("No vulnerability IDs here, just a normal system message.");
    assert.equal(none.length, 0);
  });

  await t.test("Pillar 3.2: Classifies source authority tiers according to zero-trust hierarchy", () => {
    assert.equal(classifySourceTier("https://nvd.nist.gov/vuln/detail/CVE-2024-3400"), "Tier-1-Authoritative");
    assert.equal(classifySourceTier("https://www.cisa.gov/known-exploited-vulnerabilities-catalog"), "Tier-1-Authoritative");
    assert.equal(classifySourceTier("https://msrc.microsoft.com/update-guide"), "Tier-2-Vendor-Primary");
    assert.equal(classifySourceTier("https://security.paloaltonetworks.com/CVE-2024-3400"), "Tier-2-Vendor-Primary");
    assert.equal(classifySourceTier("https://bleepingcomputer.com/news/security/article"), "Tier-3-Specialist-Media");
  });

  await t.test("Pillar 3.3: Ingests CISA KEV active weaponization & ransomware flags", async () => {
    const cve = await queryCisaKevCatalog("CVE-2024-3400");
    assert.ok(cve, "Must return KEV record for active PAN-OS exploit");
    assert.equal(cve.cveId, "CVE-2024-3400");
    assert.equal(cve.inCisaKev, true);
    assert.equal(cve.knownRansomwareUse, true);
    assert.ok(cve.requiredAction?.length, "Must include mandated mitigation action");
  });

  await t.test("Pillar 3.4: Retrieves or models EPSS exploit probability scores", async () => {
    const epss = await fetchLiveEpss("CVE-2024-3400");
    assert.ok(typeof epss.epssScore === "number");
    assert.ok(epss.epssScore >= 0 && epss.epssScore <= 1.0, "EPSS score must be bounded between 0 and 1");
    assert.ok(typeof epss.epssPercentile === "number");
  });

  await t.test("Pillar 3.5: Comprehensive Live Search synthesis with grounded LLM context", async () => {
    const result = await noctisLiveSearch("Assess zero-day exposure for CVE-2024-3400 and FortiOS CVE-2024-21762");

    assert.equal(result.cveRecords.length, 2);
    assert.ok(result.sources.length >= 2, "Must aggregate both CVE records and web sources");
    assert.ok(result.summary.includes("authoritative CVE threat records"), "Summary must reflect detected CVEs");
    assert.ok(result.groundedContextText.includes("NOCTIS REAL-TIME LIVE INTELLIGENCE"));
    assert.ok(result.groundedContextText.includes("CVE-2024-3400"));
    assert.ok(result.groundedContextText.includes("CVE-2024-21762"));
    assert.ok(result.groundedContextText.includes("CISA KEV Listed: YES"));
  });
});
