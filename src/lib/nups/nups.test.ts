import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  filterCapabilityMatrix,
  getMasterCapabilityMatrixSummary,
  NOCTIS_10_CROSS_PLATFORM_CAPABILITIES,
  NOCTIS_10_SCIENTIFIC_ENGINES,
  NOCTIS_20_INDUSTRY_ENGINES,
  NOCTIS_MASTER_CAPABILITY_MATRIX,
  NUPS_EXPANSION_PHASES,
  renderMasterCapabilityMatrixMarkdown,
} from "./master-capability-matrix.ts";
import {
  solveAerospaceMaritimeAndSupplyChain,
  solveCriticalPowerOutage,
  solveEnvironmentalMetrics,
  solveGovernmentProcurementAndGrants,
  solveInsuranceUnderwritingAndClaims,
  solveManufacturingOeeAndSpc,
  solveRadiationProtection,
  solveRealEstateAndProperty,
  solveTelecomLinkBudget,
} from "./deterministic-domain-solvers.ts";
import { classifyNupsQuery, solveUniversalProblem } from "./orchestrator.server.ts";
import { handleNupsV2Request } from "./api-handler.server.ts";
import { isNupsChatQuery, tryHandleNupsChatQuery } from "./chat-bridge.server.ts";
import { syncNupsCatalogToSql, listNupsRuns, getNupsTelemetryStats } from "./persistence.server.ts";

test("Master Capability Matrix covers 41 engines (1 NUPS + 20 Industries + 10 Scientific + 10 Cross-Platform) with valid repo file paths", () => {
  assert.equal(NOCTIS_20_INDUSTRY_ENGINES.length, 20);
  assert.equal(NOCTIS_10_SCIENTIFIC_ENGINES.length, 10);
  assert.equal(NOCTIS_10_CROSS_PLATFORM_CAPABILITIES.length, 10);
  assert.equal(NOCTIS_MASTER_CAPABILITY_MATRIX.length, 41);
  assert.equal(NUPS_EXPANSION_PHASES.length, 5);

  const sum = getMasterCapabilityMatrixSummary();
  assert.equal(sum.totalCataloged, 41);
  assert.equal(sum.byStatus.NEWLY_BUILT_GAP_CLOSED, 3);

  const repoRoot = process.cwd();
  for (const entry of NOCTIS_MASTER_CAPABILITY_MATRIX) {
    assert.ok(entry.existingModules.length >= 1, `${entry.id} missing modules`);
    assert.ok(entry.authoritativeSources.length >= 1, `${entry.id} missing authoritative sources`);
    assert.ok(entry.deterministicRules.length >= 1, `${entry.id} missing rules`);
    for (const relPath of entry.existingModules) {
      const abs = path.join(repoRoot, relPath);
      assert.equal(fs.existsSync(abs), true, `Expected existing module path for ${entry.id}: ${abs}`);
    }
  }

  assert.equal(filterCapabilityMatrix({ category: "INDUSTRY" }).length, 20);
  assert.match(renderMasterCapabilityMatrixMarkdown(), /Noctis Insurance Intelligence/);
});

test("Deterministic Domain Solvers execute exact calculations across new and expanded industries", () => {
  const power = solveCriticalPowerOutage("transfer time 8.5s, 2400 gal at 50 gph, UPS 300 kWh, critical load 400 kW");
  assert.equal(power.computations.atsWithin10sLimit, true);
  assert.equal(power.computations.generatorRuntimeHours, 48);

  const ins = solveInsuranceUnderwritingAndClaims("earned premium $1000000, incurred losses $680000, expenses $270000, 120 claims across 2000 exposures");
  assert.equal(ins.computations.lossRatioPct, 68);
  assert.equal(ins.computations.expenseRatioPct, 27);
  assert.equal(ins.computations.combinedRatioPct, 95);
  assert.equal(ins.computations.underwritingProfitable, true);

  const cre = solveRealEstateAndProperty("EGI $600000, operating expenses $210000, property value $5200000, loan amount $3640000, annual debt service $295000");
  assert.equal(cre.computations.noiUsd, 390000);
  assert.equal(cre.computations.capRatePct, 7.5);
  assert.equal(cre.computations.dscr, 1.32);
  assert.equal(cre.computations.dscrMeets125xFloor, true);

  const gov = solveGovernmentProcurementAndGrants("Federal grant expenditure $1,250,000 under FAR and 2 CFR 200");
  assert.equal(gov.computations.singleAuditTriggered, true);
  assert.equal(gov.computations.aiCanAwardContract, false);

  const rad = solveRadiationProtection("dose rate 40 mSv/hr at d1=1m moved to d2=4m with shield thickness 3 cm lead HVL 1.2 cm");
  assert.equal(rad.computations.unshieldedAtD2MsvHr, 2.5);
  assert.ok(Number(rad.computations.shieldedDoseRateMsvHr) < 0.5);

  const rf = solveTelecomLinkBudget("10 km at 3500 MHz, tx power 43 dBm, gain 18 dB, sensitivity -95 dBm");
  assert.ok(Number(rf.computations.fsplDb) > 120);

  const mfg = solveManufacturingOeeAndSpc("availability 90%, performance 90%, quality 95%");
  assert.equal(mfg.computations.oeePct, 76.95);

  const env = solveEnvironmentalMetrics("PM2.5 14.5 ug/m3");
  assert.ok(String(env.computations.aqiCategory).includes("Moderate"));

  const maritime = solveAerospaceMaritimeAndSupplyChain("maritime vessel KB=3.2 BM=5.1 KG=7.4");
  assert.equal(maritime.computations.metacentricHeightGmMeters, 0.9);
  assert.equal(maritime.computations.intactStable, true);
});

test("5-Stage NUPS Orchestrator solves multi-domain Hospital Power Outage, persists SQL, and serves /api/v2/nups/*", async () => {
  const catCount = await syncNupsCatalogToSql();
  assert.equal(catCount, 41);

  const outageQuery =
    "A hospital experiences a power outage affecting backup electrical generators (transfer time 8.5s, 2400 gal at 50 gph, UPS 300 kWh, 400 kW critical load), 24 ICU beds, cybersecurity, emergency management, and HIPAA regulatory compliance";

  const cls = classifyNupsQuery(outageQuery);
  assert.equal(cls.isMultiDomainProblem, true);
  assert.ok(cls.distinctDomains.length >= 3);

  const solved = await solveUniversalProblem({ query: outageQuery, actorId: "nups-test", persist: true });
  assert.equal(solved.safetyValidation.status, "PASS");
  assert.equal(solved.persistedToSql, true);
  assert.ok(solved.expertOutputs.length >= 3);
  assert.ok(solved.crossDomainConflicts.length >= 1);
  assert.equal(solved.crossDomainConflicts[0]!.governingSqdecPillar, "Safety");
  assert.match(solved.synthesizedMarkdown, /Independent Safety Validator/);
  assert.doesNotMatch(solved.synthesizedMarkdown, /\bundefined\b|\bNaN\b/);

  const stats = await getNupsTelemetryStats();
  assert.equal(stats.catalogedEngines, 41);
  assert.ok(stats.runsTotal >= 1);
  const runs = await listNupsRuns(5);
  assert.ok(runs.length >= 1);

  // REST Endpoints
  const matrixRes = await handleNupsV2Request(new Request("http://localhost/api/v2/nups/matrix?category=INDUSTRY"));
  assert.equal(matrixRes.status, 200);
  const matrixJson = (await matrixRes.json()) as { count: number; summary: { totalCataloged: number } };
  assert.equal(matrixJson.count, 20);
  assert.equal(matrixJson.summary.totalCataloged, 41);

  const solveRes = await handleNupsV2Request(
    new Request("http://localhost/api/v2/nups/solve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "Compute commercial property NOI $600000 EGI, OpEx $210000, property value $5200000, debt service $295000" }),
    }),
  );
  assert.equal(solveRes.status, 200);
  const solveJson = (await solveRes.json()) as { safetyValidation: { status: string }; persistedToSql: boolean };
  assert.equal(solveJson.safetyValidation.status, "PASS");
  assert.equal(solveJson.persistedToSql, true);
});

test("NUPS Chat Bridge handles multi-domain & matrix queries while NEVER hijacking clinical, DoD/IC, RMF, or Command Center prompts", async () => {
  assert.equal(
    isNupsChatQuery("A hospital experiences a power outage affecting backup generators, ICU operations, cybersecurity, and regulatory compliance"),
    true,
  );
  assert.equal(isNupsChatQuery("Show the Noctis Master Capability Matrix for all 20 industries and 10 scientific engines"), true);
  assert.equal(isNupsChatQuery("Calculate insurance combined ratio for premium $1000000 losses $680000 expenses $270000"), true);

  // Strict Non-Regression Exclusions
  assert.equal(isNupsChatQuery("Patient A has chest pain. Patient B has septic shock."), false);
  assert.equal(isNupsChatQuery("67-year-old male with fever 40C, RR 30/min, BP 78/45 mmHg and creatinine of 3.6 mg/dL"), false);
  assert.equal(isNupsChatQuery("Explain RHEL 9 STIG V-257777 and DoDI 8510.01 vs ICD 503"), false);
  assert.equal(isNupsChatQuery("Show Noctis Intelligence Command Center status"), false);

  const chatMatrix = await tryHandleNupsChatQuery("Show the Noctis Master Capability Matrix");
  assert.ok(chatMatrix);
  assert.match(chatMatrix, /41 Engines/);
  assert.match(chatMatrix, /IND-12/);
  assert.match(chatMatrix, /IND-18/);
  assert.match(chatMatrix, /IND-19/);
});
