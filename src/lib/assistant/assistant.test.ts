import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  NOCTIS_100_CAPABILITY_PARITY_MATRIX,
  filterParityMatrix,
  getParityMatrixSummary,
  renderParityMatrixMarkdown,
} from "./parity-matrix.ts";
import {
  buildDocxDocumentBuffer,
  buildPdfDocumentBuffer,
  buildPptxPresentationBuffer,
  buildXlsxWorkbookBuffer,
  compareTwoDocuments,
  editDocumentSectionPreservingFormat,
  parseUploadedTabularFile,
} from "./document-studio.server.ts";
import {
  analyzeTabularDataset,
  buildInteractiveChartSpec,
  planGeographicMapAndRoute,
} from "./data-analysis-studio.server.ts";
import {
  analyzeWorkspaceRepository,
  diagnoseFailureTrace,
  executeSafeCodeSandbox,
  generateCodingAgentProposal,
  generateOrAuditCiCdPipeline,
  generateSafeSqlMigration,
  generateUnitTestScaffold,
  profileCodeOrQuery,
} from "./coding-agent.server.ts";
import {
  analyzeAcademicPaper,
  analyzePublicPatent,
  buildManagedContextWindow,
  compareRegulatoryStandards,
  fetchWebPageVerified,
  isUrlSafeFromSsrf,
  runDeepResearchAgent,
} from "./research-agent.server.ts";
import {
  createCalendarEventAndIcs,
  draftOrSendEmail,
  generateOrEditImage,
  listConnectedAppsStatus,
  proposeComputerUsePlan,
  runAutonomousWorkflow,
  translateText,
} from "./connectors-and-workflows.server.ts";
import {
  analyzeCausalityVsCorrelation,
  checkStalePassportsAgainstFreshness,
  classifyReasoningBudget,
  convertFailureToFixTicket,
  evaluateDomainCertificationGate,
  evaluatePlanTradeoffs,
  getModelQualityObservatory,
  issueAnswerPassport,
  issueExecutionPassport,
  replayAnswerPassport,
  resolveSourceConflictByJurisdiction,
  runCounterfactualAnalysis,
} from "./distinctive-moat.server.ts";
import {
  approveWorkflowRun,
  createScheduledTask,
  createWorkspace,
  listCustomAssistants,
  listWorkspaces,
  saveWorkspaceDocumentRevision,
  syncParityMatrixToSql,
  upsertCustomAssistant,
} from "./persistence.server.ts";
import { run100TaskBenchmark } from "./benchmark-100.server.ts";
import { handleAssistantV2Request } from "./api-handler.server.ts";
import { isAssistantChatQuery, tryHandleAssistantChatQuery } from "./chat-bridge.server.ts";
import { decodeSharedThread, encodeSharedThread } from "../share-link.ts";

test("100-Capability Parity Matrix validates sequential #1-#100 and fs.existsSync on all referenced source modules", () => {
  assert.equal(NOCTIS_100_CAPABILITY_PARITY_MATRIX.length, 100);
  const sum = getParityMatrixSummary();
  assert.equal(sum.totalCapabilities, 100);
  assert.equal(sum.countsByStatus.VERIFIED_OPERATIONAL, 98);
  assert.equal(sum.countsByStatus.PARTIALLY_IMPLEMENTED, 2);

  const baseDir = fs.existsSync(path.join(process.cwd(), "src"))
    ? process.cwd()
    : path.join(process.cwd(), "noctis-ai");
  const missing: string[] = [];

  for (let i = 1; i <= 100; i++) {
    const item = NOCTIS_100_CAPABILITY_PARITY_MATRIX[i - 1];
    assert.ok(item, `Missing parity capability #${i}`);
    assert.equal(item.capabilityNumber, i);
    for (const mod of item.sourceModules) {
      if (!fs.existsSync(path.join(baseDir, mod))) {
        missing.push(`#${i} -> ${mod}`);
      }
    }
  }
  assert.deepEqual(missing, [], `Missing modules in parity matrix: ${missing.join(", ")}`);
  assert.equal(filterParityMatrix({ status: "PARTIALLY_IMPLEMENTED" }).length, 2);
  assert.match(renderParityMatrixMarkdown(), /100-Capability Feature Parity Matrix/i);
});

test("Document Studio builds real binary .xlsx/.docx/.pptx/.pdf, parses uploads, edits sections & compares docs", () => {
  const xlsx = buildXlsxWorkbookBuffer([{ name: "Revenue", headers: ["Month", "USD"], rows: [["Jan", 10000]] }]);
  assert.ok(xlsx.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])));

  const roundTrip = parseUploadedTabularFile("rev.xlsx", xlsx.toString("base64"));
  assert.equal(roundTrip.headers[0], "Month");
  assert.equal(roundTrip.rows[0]?.[0], "Jan");

  const docx = buildDocxDocumentBuffer({
    title: "Test Report",
    sections: [{ heading: "Overview", paragraphs: ["Verified content."] }],
    tables: [{ headers: ["Key", "Value"], rows: [["Status", "PASS"]] }],
  });
  assert.ok(docx.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])));

  const pptx = buildPptxPresentationBuffer({
    title: "Keynote",
    slides: [{ title: "Slide 1", bullets: ["Item A"] }],
  });
  assert.ok(pptx.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])));

  const pdf = buildPdfDocumentBuffer({
    title: "Audit PDF",
    sections: [{ heading: "Finding", paragraphs: ["Deterministic output."] }],
  });
  const pdfStr = pdf.toString("latin1");
  assert.ok(pdfStr.startsWith("%PDF-1.4"));
  assert.ok(pdfStr.includes("xref") && pdfStr.includes("%%EOF"));

  const edited = editDocumentSectionPreservingFormat({
    markdown: "# Report\n## Scope\nOld text\n## Footer\nKeep intact",
    targetHeading: "Scope",
    replacementBody: "Updated verified scope.",
  });
  assert.equal(edited.replacedExistingSection, true);
  assert.match(edited.updatedMarkdown, /Keep intact/);

  const cmp = compareTwoDocuments({
    titleA: "v1",
    textA: "AC-2 always mandatory hardware MFA.",
    titleB: "v2",
    textB: "AC-2 exempt from hardware MFA.",
  });
  assert.ok(cmp.contradictionAnalysis.contradictionCount >= 1);
});

test("Data Analysis, Charts, Maps, Coding Sandbox, Research SSRF Guard & Moat (#91-#100) operate deterministically", async () => {
  const ds = analyzeTabularDataset({ rawText: "Grp,X,Y\nA,1,10\nA,2,20\nB,3,30\nB,100,999" });
  assert.ok(ds.anomalyCount >= 1);
  assert.ok(ds.correlationsAndRegression.length === 1);
  assert.ok(ds.chartSpec.labels.length >= 2);

  const chart = buildInteractiveChartSpec({ title: "Trend", chartType: "line", labels: ["1", "2"], series: [{ name: "S", data: [5, 15] }] });
  assert.equal(chart.yDomain[1], 15);

  const map = planGeographicMapAndRoute({ locations: ["New York", "London"], mode: "flight" });
  assert.ok(map.totalDistanceKm > 5400 && map.totalDistanceKm < 5700);
  assert.equal(map.geoJson.features.length, 3);

  const vmOk = await executeSafeCodeSandbox({ code: "const x = 6 * 7; console.log(x); x;" });
  assert.equal(vmOk.status, "SUCCESS");
  assert.equal(vmOk.stdout[0], "42");
  assert.equal(vmOk.returnValue, 42);

  const vmBlk = await executeSafeCodeSandbox({ code: "console.log(process.env)" });
  assert.equal(vmBlk.status, "BLOCKED");

  const repoOk = analyzeWorkspaceRepository({ subdir: "src/lib/assistant" });
  assert.equal(repoOk.ok, true);
  const repoBlk = analyzeWorkspaceRepository({ subdir: "../../.env" });
  assert.equal(repoBlk.ok, false);

  const pr = generateCodingAgentProposal({ title: "Safe fix", filePath: "src/a.ts", originalCode: "a()", patchedCode: "b()" });
  assert.equal(pr.canAutoMergeOrDeploy, false);
  const mig = generateSafeSqlMigration({ tableName: "enterprise.notes", columns: [{ name: "body", sqlType: "TEXT" }] });
  assert.equal(mig.blocked, false);
  assert.equal(generateUnitTestScaffold({ moduleName: "x", exportNames: ["fn"] }).generatedTestsCount, 1);
  assert.ok(diagnoseFailureTrace("TS2353 error\n at x.ts:1:1").framesCount === 1);
  assert.ok(profileCodeOrQuery("for(let i=0;i<9;i++){await sql.query('SELECT * FROM x');}").bottleneckCount >= 1);
  assert.match(generateOrAuditCiCdPipeline().yaml || "", /npm test/);

  assert.equal(isUrlSafeFromSsrf("http://169.254.169.254/latest").safe, false);
  const fetchBlocked = await fetchWebPageVerified("http://127.0.0.1:3000/secret");
  assert.equal(fetchBlocked.ssrfBlocked, true);

  const dr = await runDeepResearchAgent({ query: "NIST 800-53 control validation", includeLiveWeb: false });
  assert.ok(dr.researchPlan.length === 4);
  assert.ok(analyzeAcademicPaper("Objective: x. Method: randomized. Result: significant. Limitation: bias.").methods.length >= 1);
  assert.equal(analyzePublicPatent("1. System.\n2. Of claim 1.").claimsExtracted.length, 2);
  assert.ok(compareRegulatoryStandards("NIST", "ISO").comparisonAxes.length >= 2);
  assert.equal(buildManagedContextWindow({ turns: Array.from({ length: 10 }, (_, i) => ({ role: "user", content: `t${i}` })) }).olderTurnsCondensed, 4);

  assert.equal(classifyReasoningBudget("ICU hyperkalemia and STIG V-257777").tier, "FORENSIC_VERIFIED");
  assert.equal(analyzeCausalityVsCorrelation("X correlates r=0.8 and causes Y").causalInflationWarning, true);
  assert.ok(runCounterfactualAnalysis({ scenarioName: "Surge", baselineDemand: 95, baselineCapacity: 100, demandGrowthPct: 20, efficiencyGainPct: 0 }).counterfactual.overloadRisk === "HIGH");
  assert.equal(evaluatePlanTradeoffs([{ name: "Safe", safetyScore: 95, speedScore: 80, costEfficiencyScore: 80 }, { name: "Fast", safetyScore: 20, speedScore: 99, costEfficiencyScore: 99 }]).recommendedOption, "Safe");
});

test("SQL CRUD, Connectors, Distinctive Moat (#91-#100), 100-Task Benchmark, API & Chat Isolation verify end to end", async () => {
  await syncParityMatrixToSql();
  await upsertCustomAssistant({ name: "Test Bot", tagline: "Test", specialistEngine: "NOCTIS-CORE-001", systemInstructions: "Verify", enabledTools: ["verify"] });
  assert.ok((await listCustomAssistants()).length >= 1);

  const ws = await createWorkspace({ name: "Test Hub", description: "Hub" });
  await saveWorkspaceDocumentRevision({ workspaceId: ws.id, title: "Draft 1", contentMarkdown: "# Draft" });
  assert.ok((await listWorkspaces()).length >= 1);
  await createScheduledTask({ title: "Watch", taskType: "RESEARCH_WATCH", cronOrIso: "0 9 * * 1" });

  assert.ok(listConnectedAppsStatus().connectors.length >= 6);
  assert.equal(draftOrSendEmail({ to: "a@b.com", subject: "Hi", body: "Text", action: "SEND_REQUEST", humanApproved: false }).sendStatus, "AWAITING_HUMAN_APPROVAL");
  const cal = await createCalendarEventAndIcs({ title: "Review", startIso: "2026-12-10T10:00:00Z", persistToSchedule: false });
  assert.match(cal.icsPreview, /BEGIN:VCALENDAR/);
  assert.ok(generateOrEditImage({ mode: "GENERATE", prompt: "Cloud" }).dataUri.startsWith("data:image/svg+xml;base64,"));
  assert.ok((await translateText({ text: "hello security report", targetLang: "es" })).translatedText.length > 0);
  assert.equal(proposeComputerUsePlan("open app").proposedSteps.length, 3);

  const wf = await runAutonomousWorkflow({ workflowName: "Release", objective: "NIST audit", externalWriteRequested: true });
  assert.equal(wf.status, "AWAITING_APPROVAL");
  const aiApp = await approveWorkflowRun(wf.runId, "ai-agent");
  assert.equal(aiApp.approved, false);
  const huApp = await approveWorkflowRun(wf.runId, "human-approver");
  assert.equal(huApp.approved, true);

  // Moat #91-#100
  const pp = await issueAnswerPassport({
    domain: "legal",
    promptText: "FRCP 6 test",
    inputs: { d: 21 },
    answerSummary: "Rolled date verified.",
    sourceVersions: [{ sourceId: "FRCP", version: "2025" }],
    calculationTrace: [{ step: "1", formula: "d+21", result: "2026-11-30" }],
  });
  const replay = await replayAnswerPassport(pp.passportId);
  assert.equal(replay.found, true);
  assert.equal(replay.deterministicMatch, true);

  await convertFailureToFixTicket({ defectId: "DEF-94", domain: "legal", promptSample: "Sample", filePath: "src/a.ts", originalCode: "1", patchedCode: "2", summary: "Fix" });
  assert.equal(resolveSourceConflictByJurisdiction({ context: "DOD_SECRET", authorityA: { name: "DoDI 8510.01", level: "STATUTE_REGULATION", position: "AO" }, authorityB: { name: "Blog", level: "BLOG", position: "None" } }).governingAuthority, "DoDI 8510.01");
  assert.equal((await evaluateDomainCertificationGate("assistant")).certifiedForProduction, true);
  assert.equal((await issueExecutionPassport(wf.runId)).found, true);
  assert.ok((await checkStalePassportsAgainstFreshness()).activePassportsChecked >= 1);
  assert.ok((await getModelQualityObservatory()).sealedPassportsCount >= 1);

  // 100-Task Real Benchmark
  const b100 = await run100TaskBenchmark({ persist: true, executedBy: "assistant.test.ts" });
  assert.equal(b100.totalTasks, 100);
  assert.equal(b100.failedTasks, 0);
  assert.ok(b100.passRatePct >= 95);

  // REST /api/v2/assistant/*
  const parityRes = await handleAssistantV2Request(new Request("https://www.dstrike.app/api/v2/assistant/parity"));
  assert.equal(parityRes.status, 200);
  const docRes = await handleAssistantV2Request(
    new Request("https://www.dstrike.app/api/v2/assistant/documents/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ format: "docx", title: "Live API Doc", download: true }),
    }),
  );
  assert.equal(docRes.status, 200);
  const docBuf = Buffer.from(await docRes.arrayBuffer());
  assert.ok(docBuf.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])));

  // Chat Bridge & Non-Regression Guards
  assert.equal(isAssistantChatQuery("Generate ChatGPT vs Noctis feature parity matrix"), true);
  assert.equal(isAssistantChatQuery("Run 100-task benchmark"), true);
  assert.equal(isAssistantChatQuery("68-year-old male CRIT-046 Patient A creatinine 2.6 mg/dL"), false);
  assert.equal(isAssistantChatQuery("Evaluate RHEL 9 STIG V-257777 DoDI 8510.01 ICD 503"), false);
  assert.equal(isAssistantChatQuery("Run 260-capability master capability catalog audit"), false);
  const chatRes = await tryHandleAssistantChatQuery("Generate ChatGPT vs Noctis feature parity matrix");
  assert.ok(chatRes && chatRes.includes("100-Capability Feature Parity Matrix"));

  // Personalization (Memory ON/OFF + Custom Instructions), Scheduled Cron Runner, Live Image Gen/Inpaint, Connectors, & Full Thread Share
  const persSave = await handleAssistantV2Request(
    new Request("https://www.dstrike.app/api/v2/assistant/personalization", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        memoryEnabled: false,
        aboutUser: "Staff Security Architect",
        responseStyle: "Use Markdown tables first",
        personaPreset: "cyber",
      }),
    }),
  );
  assert.equal(persSave.status, 200);
  const persRead = (await (await handleAssistantV2Request(new Request("https://www.dstrike.app/api/v2/assistant/personalization"))).json()) as {
    memoryEnabled: boolean;
    aboutUser: string;
    personaPreset: string;
  };
  assert.equal(persRead.memoryEnabled, false);
  assert.equal(persRead.aboutUser, "Staff Security Architect");
  assert.equal(persRead.personaPreset, "cyber");

  const schedCreate = (await (
    await handleAssistantV2Request(
      new Request("https://www.dstrike.app/api/v2/assistant/schedules", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "Daily KEV Briefing", taskType: "RESEARCH_WATCH", cronOrIso: "0 8 * * *" }),
      }),
    )
  ).json()) as { id: string };
  const cronRes = (await (
    await handleAssistantV2Request(
      new Request("https://www.dstrike.app/api/v2/assistant/cron/run-tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ forceAll: true, taskId: schedCreate.id }),
      }),
    )
  ).json()) as { ok: boolean; executedCount: number };
  assert.equal(cronRes.ok, true);
  assert.equal(cronRes.executedCount, 1);

  const pauseRes = await handleAssistantV2Request(
    new Request("https://www.dstrike.app/api/v2/assistant/schedules", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: schedCreate.id, status: "PAUSED" }),
    }),
  );
  assert.equal(pauseRes.status, 200);
  const delRes = await handleAssistantV2Request(
    new Request(`https://www.dstrike.app/api/v2/assistant/schedules?id=${encodeURIComponent(schedCreate.id)}`, { method: "DELETE" }),
  );
  assert.equal(delRes.status, 200);

  const imgEdit = (await (
    await handleAssistantV2Request(
      new Request("https://www.dstrike.app/api/v2/assistant/images/edit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt: "Highlight boundary gateway",
          useLiveProvider: false,
          maskImageBase64: "data:image/png;base64,iVBORw0KGgo=",
        }),
      }),
    )
  ).json()) as { mode: string; dataUri: string };
  assert.equal(imgEdit.mode, "EDIT");
  assert.ok(imgEdit.dataUri.startsWith("data:image/"));

  const connSave = await handleAssistantV2Request(
    new Request("https://www.dstrike.app/api/v2/assistant/connectors/connect", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider: "google-drive", accountLabel: "test-drive@dstrike.app", token: "tok-test" }),
    }),
  );
  assert.equal(connSave.status, 200);
  const connList = (await (await handleAssistantV2Request(new Request("https://www.dstrike.app/api/v2/assistant/connectors"))).json()) as {
    connectors: Array<{ id: string; status: string }>;
  };
  assert.equal(connList.connectors.find((c) => c.id === "google-drive")?.status, "CONNECTED");
  const oauthStart = (await (
    await handleAssistantV2Request(new Request("https://www.dstrike.app/api/v2/assistant/connectors/oauth/start?provider=slack"))
  ).json()) as { provider: string; requiredEnvVars?: string[] };
  assert.equal(oauthStart.provider, "slack");

  const encoded = encodeSharedThread({
    title: "Security Review",
    sharedAt: "2026-11-27T00:00:00Z",
    turns: [
      { role: "user", content: "Check AC-2(3)" },
      { role: "assistant", content: "Disable separated user accounts within 24h." },
    ],
  });
  const decoded = decodeSharedThread(encoded);
  assert.ok(decoded && decoded.title === "Security Review" && decoded.turns.length === 2);
});
