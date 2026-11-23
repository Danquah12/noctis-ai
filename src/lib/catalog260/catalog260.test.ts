import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  CATALOG_260_ITEMS,
  filterCatalog260,
  getCatalog260Summary,
  renderCatalog260GapAuditMarkdown,
} from "./catalog-260-registry.ts";
import {
  analyzeTemporalSequence,
  auditSourceFreshness,
  calibrateEpistemicConfidence,
  deduplicateAndVerifyTrainingDataset,
  detectCrossSourceContradictions,
  enforcePrivacyPolicy,
  generateRegressionFromDefect,
  runDynamicRegressionFactory,
  runUnifiedDependabilityAudit,
} from "./dependability-suite.server.ts";
import {
  analyzeMultiIntGeopoliticalRisk,
  auditMobileOrMalware,
  auditWcagContrastAndA11y,
  convertUnitsAndCheckDimensions,
  detectFraudBenfordAndStructuring,
  evaluateEmploymentLaborLaw,
  solveAccountingTaxAndBusinessOps,
  solveBuildingHvacAshrae,
  solveCatalog260GapQuery,
  solveLegalProceduralDeadlines,
  solveProjectEvm,
  solveWaterWastewaterEngineering,
} from "./gap-closure-solvers.ts";
import {
  deleteUserMemory,
  evaluateCanaryRollbackGate,
  getCatalog260SqlStats,
  listModelRegistry,
  listUserMemory,
  registerModelVersion,
  saveUserMemory,
  syncCatalog260ToSql,
} from "./persistence.server.ts";
import { handleCatalog260V2Request } from "./api-handler.server.ts";
import { isCatalog260ChatQuery, tryHandleCatalog260ChatQuery } from "./chat-bridge.server.ts";

test("Catalog 260 contains exact #1-#260 across 14 divisions with verified module files on disk", () => {
  assert.equal(CATALOG_260_ITEMS.length, 260);
  const sum = getCatalog260Summary();
  assert.equal(sum.totalCapabilities, 260);
  assert.equal(Object.keys(sum.byDivision).length, 14);
  assert.equal(sum.countsByStatus.alreadyImplemented, 214);
  assert.equal(sum.countsByStatus.gapClosedNow, 41);
  assert.equal(sum.countsByStatus.externalBoundary, 5);
  assert.equal(sum.countsByStatus.totalActiveInSoftware, 255);

  const seenNumbers = new Set<number>();
  const baseDir = fs.existsSync(path.join(process.cwd(), "src"))
    ? process.cwd()
    : path.join(process.cwd(), "noctis-ai");

  const missing: string[] = [];
  for (let expected = 1; expected <= 260; expected++) {
    const item = CATALOG_260_ITEMS[expected - 1];
    assert.ok(item, `Missing capability #${expected}`);
    assert.equal(item.itemNumber, expected);
    assert.ok(!seenNumbers.has(item.itemNumber), `Duplicate itemNumber #${item.itemNumber}`);
    seenNumbers.add(item.itemNumber);
    assert.ok(item.modules.length >= 1, `#${item.itemNumber} has empty modules`);
    for (const mod of item.modules) {
      if (!fs.existsSync(path.join(baseDir, mod))) {
        missing.push(`#${item.itemNumber} -> ${mod}`);
      }
    }
  }
  assert.deepEqual(missing, [], `Referenced module paths not found: ${missing.join(", ")}`);

  const closedOnly = filterCatalog260({ status: "GAP_CLOSED_NOW" });
  assert.equal(closedOnly.length, 41);
  const md = renderCatalog260GapAuditMarkdown();
  assert.match(md, /260-Capability Gap Audit/i);
  assert.match(md, /#251/);
  assert.match(md, /#257/);
});

test("Dependability Suite (#251-#257, #12, #26-27, #30, #35, #38-39) enforces accuracy, privacy, contradictions & canary gates", async () => {
  const temporal = analyzeTemporalSequence(
    "2026-05-01 baseline creatinine 1.1 mg/dL 6 months ago; today creatinine 2.6 mg/dL at admission.",
  );
  assert.equal(temporal.hasHistoricalVsCurrentSplit, true);
  assert.ok(temporal.isoDatesOrdered.includes("2026-05-01"));
  assert.ok(temporal.extractedMeasurements.length >= 2);

  const contradictions = detectCrossSourceContradictions([
    "System FedRAMP High AC-2 always mandatory MFA hardware token authentication.",
    "System FedRAMP High AC-2 exempt from mandatory MFA token authentication.",
    "Maximum chlorine concentration limit 4.0 mg/dL measured today.",
    "Maximum chlorine concentration limit 8.5 mg/dL measured today.",
  ]);
  assert.equal(contradictions.status, "CONTRADICTIONS_DETECTED");
  assert.ok(contradictions.contradictionCount >= 1);

  const conf = calibrateEpistemicConfidence(
    "EVM CPI is 0.85, indicating cost overrun. Remaining recovery is uncertain / unknown for vendor delays.",
    3,
  );
  assert.ok(conf.calibratedConfidence > 0 && conf.calibratedConfidence <= 0.99);
  assert.ok(["LOW", "MODERATE", "ELEVATED"].includes(conf.hallucinationRisk));

  const rejectedConsent = enforcePrivacyPolicy({
    text: "SSN 123-45-6789 user@example.com",
    purpose: "memory",
    consentGranted: false,
  });
  assert.equal(rejectedConsent.compliant, false);
  assert.match(rejectedConsent.redactedText, /\[REDACTED-SSN\]/);
  assert.match(rejectedConsent.redactedText, /\[REDACTED-EMAIL\]/);

  const dedup = deduplicateAndVerifyTrainingDataset([
    { prompt: "Contact test@example.com 555-123-4567", completion: "Ok" },
    { prompt: "Contact test@example.com 555-123-4567", completion: "Ok" },
    { prompt: "Second sample", completion: "Validated response" },
  ]);
  assert.equal(dedup.inputCount, 3);
  assert.equal(dedup.uniqueRetainedCount, 2);
  assert.equal(dedup.duplicatesRemoved, 1);
  assert.equal(dedup.piiScrubbedCount, 1);
  assert.equal(dedup.licenseVerified, true);

  // SQL persistence & lifecycle checks
  const synced = await syncCatalog260ToSql();
  assert.equal(synced, 260);

  const memBlocked = await saveUserMemory({
    userId: "u-test",
    purpose: "test",
    contentRedacted: "no consent",
    consentGranted: false,
  });
  assert.equal(memBlocked.saved, false);

  const memSaved = await saveUserMemory({
    id: "MEM-TEST-260",
    userId: "u-test",
    purpose: "test_pref",
    contentRedacted: "Prefers metric units [REDACTED_EMAIL]",
    consentGranted: true,
    retentionDays: 30,
  });
  assert.equal(memSaved.saved, true);
  const memRows = await listUserMemory("u-test", 10);
  assert.ok(memRows.some((r) => r.id === "MEM-TEST-260"));
  await deleteUserMemory("MEM-TEST-260");

  await registerModelVersion({
    modelId: "canary-test-model",
    version: "0.9.1",
    evalAccuracyPct: 92.0,
    canaryTrafficPct: 10,
    status: "CANARY",
    rollbackTarget: "noctis-core-v1",
  });
  const rollback = await evaluateCanaryRollbackGate({
    modelId: "canary-test-model",
    observedAccuracyPct: 91.5,
    criticalSafetyFailures: 1,
  });
  assert.equal(rollback.decision, "AUTO_ROLLBACK_TRIGGERED");
  assert.equal(rollback.canaryTrafficPctAfter, 0);
  const models = await listModelRegistry();
  assert.ok(models.some((m) => m.model_id === "canary-test-model" && m.status === "ROLLED_BACK"));

  await generateRegressionFromDefect({
    id: "REG-TEST-TEMP",
    defectSource: "unit-test",
    domain: "clinical",
    promptSample: "Patient A baseline creatinine 1.0 mg/dL 3 months ago; Patient A today creatinine 2.4 mg/dL.",
    mustInclude: ["2.4"],
    mustNotInclude: ["1.0 current"],
  });
  const factoryRun = await runDynamicRegressionFactory();
  assert.ok(factoryRun.totalDynamicTests >= 1);
  assert.equal(factoryRun.failedCount, 0);

  const freshness = await auditSourceFreshness();
  assert.ok(freshness.dodIcDirectivesCount >= 30);
  assert.ok(freshness.disaCciCount >= 5000);

  const stats = await getCatalog260SqlStats();
  assert.equal(stats.catalog260Rows, 260);
});

test("All 11 deterministic gap-closure solvers produce exact quantitative outputs", () => {
  // 1. FRCP Rule 6: 2026-11-06 + 21d -> Fri Nov 27, 2026; or 2026-11-07 + 21d -> Sat Nov 28 -> rolls to Mon 2026-11-30
  const frcp = solveLegalProceduralDeadlines("Calculate FRCP Rule 6 deadline 21 days from 2026-11-07");
  assert.equal(frcp.solverId, "GAP-LEGAL-FRCP6");
  assert.equal(frcp.metrics.unadjustedDate, "2026-11-28");
  assert.equal(frcp.metrics.finalDeadlineIso, "2026-11-30");
  assert.equal(frcp.metrics.aiCanFileOrSignBrief, false);

  // 2. FLSA & WARN
  const labor = evaluateEmploymentLaborLaw("Evaluate FLSA overtime $40/hr for 50 hours, 150 employees and 60 laid off");
  assert.equal(labor.metrics.totalWeeklyPayUsd, 2200); // 40*40 + 10*60
  assert.equal(labor.metrics.warn60DayNoticeRequired, true);

  // 3. Mobile MASVS & Malware Shannon entropy
  const mob = auditMobileOrMalware("Inspect android:debuggable=\"true\" with cleartext http and packed binary entropy 7.6");
  assert.equal(mob.status, "CRITICAL");
  assert.ok(Number(mob.metrics.shannonEntropyBitsPerByte) >= 7.2);

  // 4. NIST SP 811 Unit Conversion
  const unit = convertUnitsAndCheckDimensions("Convert 100 psi to kPa");
  assert.equal(unit.metrics.inputPsi, 100);
  assert.ok(Math.abs(Number(unit.metrics.kPa) - 689.476) < 0.05);

  // 5. Water CT & Hazen-Williams
  const water = solveWaterWastewaterEngineering("chlorine CT at 2.5 mg/L for 30 min required CT of 80 12 in pipe 2.5 cfs C=120");
  assert.equal(water.metrics.achievedCtMgMinL, 75);
  assert.equal(water.metrics.ctDisinfectionCompliant, false);
  assert.ok(Number(water.metrics.hazenWilliamsHeadlossFtPer1000ft) > 0);

  // 6. HVAC ASHRAE 62.1 / 170
  const hvac = solveBuildingHvacAshrae("ASHRAE 170 4000 CFM, delta T 20 F, volume 24000 cu ft");
  assert.equal(hvac.metrics.coolingTons, 7.2); // 1.08 * 4000 * 20 / 12000
  assert.equal(hvac.metrics.airChangesPerHour, 10); // 60 * 4000 / 24000

  // 7. Benford & BSA Structuring
  const fraud = detectFraudBenfordAndStructuring("BSA structuring ledger $9500, $9400, $9800, $9200");
  assert.equal(fraud.metrics.near10kStructuringCount, 4);
  assert.equal(fraud.status, "CRITICAL");

  // 8. Project EVM
  const evm = solveProjectEvm("EVM for BAC=$500000, PV=$250000, EV=$200000, AC=$250000");
  assert.equal(evm.metrics.cpi, 0.8);
  assert.equal(evm.metrics.spi, 0.8);
  assert.equal(evm.metrics.eacUsd, 625000);

  // 9. Accounting & Personal Debt Avalanche
  const acct = solveAccountingTaxAndBusinessOps("Compute GAAP current assets $120000 current liabilities $60000 inventory $20000 revenue $500000 net income $50000");
  assert.equal(acct.metrics.currentRatio, 2);
  assert.equal(acct.metrics.quickRatio, 1.67);
  const debt = solveAccountingTaxAndBusinessOps("Debt avalanche emergency fund cash $18000 monthly expenses $4500");
  assert.equal(debt.metrics.emergencyRunwayMonths, 4);

  // 10. WCAG 2.2 Contrast
  const wcag = auditWcagContrastAndA11y("Check contrast ratio #FFFFFF on #0F172A");
  assert.ok(Number(wcag.metrics.contrastRatio) >= 15);
  assert.equal(wcag.metrics.passesWcagAaaNormal, true);

  // 11. Multi-INT GEOINT/OSINT
  const intel = analyzeMultiIntGeopoliticalRisk("OSINT GEOINT baseline 10% current 40% across 3 sources");
  assert.equal(intel.metrics.imageryChangeDeltaPct, 30);
  assert.equal(intel.status, "PASS");

  // Router check
  const dispatched = solveCatalog260GapQuery("Calculate PMI EVM BAC=$100000 PV=$50000 EV=$45000 AC=$50000");
  assert.equal(dispatched.solverId, "GAP-PM-EVM");
});

test("REST /api/v2/catalog/* endpoints and Chat bridge enforce routing & clinical/DoD/NUPS isolation", async () => {
  const statusRes = await handleCatalog260V2Request(new Request("https://www.dstrike.app/api/v2/catalog/status"));
  assert.equal(statusRes.status, 200);
  const statusJson = (await statusRes.json()) as any;
  assert.equal(statusJson.summary.totalCapabilities, 260);

  const itemsRes = await handleCatalog260V2Request(new Request("https://www.dstrike.app/api/v2/catalog/items?division=XIV"));
  assert.equal(itemsRes.status, 200);
  const itemsJson = (await itemsRes.json()) as any;
  assert.equal(itemsJson.count, 10);

  const solveRes = await handleCatalog260V2Request(
    new Request("https://www.dstrike.app/api/v2/catalog/solve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "Audit WCAG 2.2 contrast ratio #FFFFFF on #000000" }),
    }),
  );
  assert.equal(solveRes.status, 200);
  const solveJson = (await solveRes.json()) as any;
  assert.equal(solveJson.solverResult.metrics.contrastRatio, 21);

  const depRes = await handleCatalog260V2Request(
    new Request("https://www.dstrike.app/api/v2/catalog/dependability/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text: "Patient A baseline creatinine 1.1 mg/dL 6 months ago; Patient A today creatinine 2.6 mg/dL.",
      }),
    }),
  );
  assert.equal(depRes.status, 200);
  const depJson = (await depRes.json()) as any;
  assert.equal(depJson.temporalIntelligence.hasHistoricalVsCurrentSplit, true);

  // Positive Chat routes
  assert.equal(isCatalog260ChatQuery("Run 260-capability master capability catalog audit"), true);
  assert.equal(isCatalog260ChatQuery("Calculate FRCP Rule 6 deadline 21 days from 2026-11-07"), true);
  assert.equal(isCatalog260ChatQuery("Calculate EVM for BAC=$500000, PV=$250000, EV=$220000, AC=$260000"), true);

  const chatAudit = await tryHandleCatalog260ChatQuery("Run 260-capability master capability catalog audit");
  assert.ok(chatAudit && chatAudit.includes("260-Capability Gap Audit"));

  // Strict non-regression exclusions (clinical, DoD/IC, RMF, Enterprise, NUPS)
  assert.equal(
    isCatalog260ChatQuery("68-year-old male CRIT-046 Patient A baseline creatinine 1.1 mg/dL today creatinine 2.6 mg/dL"),
    false,
  );
  assert.equal(isCatalog260ChatQuery("Evaluate RHEL 9 STIG V-257777 DoDI 8510.01 ICD 503"), false);
  assert.equal(isCatalog260ChatQuery("Check FedRAMP High system uses AC-2 under NIST 800-53 RMF"), false);
  assert.equal(
    isCatalog260ChatQuery(
      "A hospital experiences a power outage affecting backup electrical generators, 24 ICU ventilator operations, and HIPAA compliance",
    ),
    false,
  );
  assert.equal(isCatalog260ChatQuery("Show me the 40-engine matrix for Noctis Universal Problem Solver (NUPS)"), false);
});
