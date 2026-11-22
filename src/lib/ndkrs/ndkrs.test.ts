/**
 * Noctis Deterministic Knowledge and Reasoning System (NDKRS) — Full End-to-End Test Suite
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hmacSha256Sync } from "../universal-crypto.ts";
import { executeUniversalClinicalReasoning } from "../noctis-universal-clinical.server.ts";
import { rememberAnswer, trainPair } from "../noctis-train.server.ts";
import {
  tryExecuteNdkrsDeterministicRuleFromChat,
  tryHandlePlatformStatusOrLedgerQuery,
  fetchNdkrsChatGrounding,
} from "./chat-bridge.server.ts";
import { handleNdkrsV2Request } from "./api-handler.server.ts";
import { seedNdkrsAuthoritativeCorpus } from "./corpus-seed.ts";
import { extractDocumentText } from "./document-parser.server.ts";
import { decryptClinicalPayload, encryptClinicalPayload } from "./enclave-crypto.server.ts";
import { validateCrossDomainFactLock, verifyCertificateSignature } from "./fact-lock-validator.server.ts";
import {
  decideReviewItem,
  enforceExpiredKnowledgeRecords,
  listReviewQueue,
  scanStaleKnowledgeRecords,
} from "./governance.server.ts";
import { hybridSearchNdkrs } from "./hybrid-retrieval.server.ts";
import { ingestKnowledgeDocument } from "./ingestion.server.ts";
import {
  checkDistributedRateLimit,
  listKnowledgeGaps,
  listValidationCertificates,
} from "./persistence.server.ts";
import { routeNdkrsQuery } from "./router.server.ts";
import { evaluateDeterministicRule } from "./rules-engine.server.ts";

describe("NDKRS Full Deterministic Knowledge & Reasoning System", () => {
  it("1. Seeds authoritative corpus & retrieves multi-domain verified records via BM25 + Vector RRF", async () => {
    const seeded = await seedNdkrsAuthoritativeCorpus({ preVerifiedBy: "test-governance-board" });
    assert.ok(seeded.recordsSeeded >= 40);
    assert.ok(seeded.rulesSeeded >= 12);

    const kdigoHits = await hybridSearchNdkrs("KDIGO AKI staging creatinine 5.1 baseline 1.8");
    assert.ok(kdigoHits.length > 0);
    assert.equal(kdigoHits[0].canonicalKey, "KDIGO-2012-AKI");
    assert.ok(kdigoHits[0].rrfScore > 0);
    assert.ok(kdigoHits[0].sha256.length === 64);

    const rmfHits = await hybridSearchNdkrs("NIST SP 800-53 AC-2 FedRAMP Moderate", { domain: "rmf" });
    assert.ok(rmfHits.some((h) => h.canonicalKey === "AC-2"));

    const legalHits = await hybridSearchNdkrs("21 U.S.C. 360j Non-Device Clinical Decision Support", {
      domain: "legal",
    });
    assert.ok(legalHits.some((h) => h.canonicalKey === "21-USC-360J-O-1-E"));

    const hipaaHits = await hybridSearchNdkrs("HIPAA technical safeguards 164.312 encryption audit", {
      domain: "legal",
    });
    assert.ok(hipaaHits.some((h) => h.canonicalKey === "HIPAA-45CFR-164-312"));
  });

  it("2. Enforces anti-poisoning quarantine, contradiction detection, and dual-control review", async () => {
    // Contradiction check against verified KDIGO-2012-AKI record (changes 4.0 mg/dL to 9.9 mg/dL)
    const poisoned = await ingestKnowledgeDocument({
      domain: "clinical",
      canonicalKey: "KDIGO-2012-AKI",
      title: "Unverified KDIGO Alteration Draft",
      summary: "Threshold altered to 9.9 mg/dL instead of 4.0 mg/dL.",
      content: "Serum creatinine threshold modified to 9.9 mg/dL and 45 days.",
      sourceUri: "https://untrusted.example.invalid/custom.pdf",
      version: "9.9.9-draft",
      proposedBy: "llm-worker-1",
      proposedByType: "AGENT",
    });

    assert.equal(poisoned.status, "PENDING_REVIEW");
    assert.equal(poisoned.allowlistVerified, false);
    assert.ok(poisoned.contradictionFlags.length > 0, "Numeric shift contradiction must be flagged");
    assert.ok(poisoned.reviewQueueItem);

    // Confirm unapproved draft is strictly excluded from VERIFIED hybrid search
    const searchBefore = await hybridSearchNdkrs("threshold altered to 9.9 mg/dL", { domain: "clinical" });
    assert.equal(
      searchBefore.some((h) => h.recordId === poisoned.recordId),
      false,
      "PENDING_REVIEW records must NEVER be returned as authoritative",
    );

    // Agent self-approval MUST be blocked
    await assert.rejects(
      decideReviewItem({
        queueId: poisoned.reviewQueueItem!.id,
        decision: "APPROVE",
        reviewerId: "automated-agent-9",
        reviewerRole: "AGENT",
      }),
      /AGENT_APPROVAL_FORBIDDEN/,
    );

    // Self-approval by proposer MUST be blocked
    await assert.rejects(
      decideReviewItem({
        queueId: poisoned.reviewQueueItem!.id,
        decision: "APPROVE",
        reviewerId: "llm-worker-1",
        reviewerRole: "HUMAN_REVIEWER",
      }),
      /SELF_APPROVAL_FORBIDDEN/,
    );

    // Rejecting poisoned record keeps it out of search permanently
    const rejected = await decideReviewItem({
      queueId: poisoned.reviewQueueItem!.id,
      decision: "REJECT",
      reviewerId: "senior-clinical-sme",
      reviewerRole: "HUMAN_REVIEWER",
      notes: "Contradicts verified KDIGO-2012-AKI 4.0 mg/dL threshold and non-allowlisted URI.",
    });
    assert.equal(rejected.status, "REJECTED");

    // Clean submission promoted by distinct human becomes searchable
    const validSub = await ingestKnowledgeDocument({
      domain: "engineering",
      canonicalKey: "ENG-NYQUIST-RATE",
      title: "Nyquist Sampling Theorem Verification",
      summary: "Sample rate fs must exceed 2 * f_max to prevent aliasing.",
      content: "# Nyquist Theorem\nDiscrete sampling rate fs >= 2 * B preserves bandlimited signals.",
      sourceUri: "https://en.wikipedia.org/wiki/Nyquist%E2%80%93Shannon_sampling_theorem",
      version: "1.0.0",
      proposedBy: "engineer-alice",
      proposedByType: "HUMAN",
    });
    assert.equal(validSub.status, "PENDING_REVIEW");
    assert.equal(validSub.allowlistVerified, true);

    const approved = await decideReviewItem({
      queueId: validSub.reviewQueueItem!.id,
      decision: "APPROVE",
      reviewerId: "principal-eng-bob",
      reviewerRole: "HUMAN_REVIEWER",
    });
    assert.equal(approved.status, "APPROVED");

    const afterApprove = await hybridSearchNdkrs("Nyquist sampling theorem aliasing", {
      domain: "engineering",
    });
    assert.ok(afterApprove.some((h) => h.canonicalKey === "ENG-NYQUIST-RATE"));
  });

  it("3. Scans expired knowledge and excludes expired records from retrieval", async () => {
    const expIngest = await ingestKnowledgeDocument({
      domain: "science",
      canonicalKey: "SCI-EXPIRED-SAMPLE",
      title: "Outdated Reference Constant",
      summary: "Deprecated 1998 provisional constant.",
      content: "Expired scientific draft from 1998 for staleness testing.",
      sourceUri: "https://www.nist.gov/expired-sample",
      version: "1998.1",
      expiresAt: "2020-01-01T00:00:00Z",
      proposedBy: "curator-a",
      proposedByType: "HUMAN",
      preVerifiedBy: "curator-b",
    });
    assert.equal(expIngest.status, "VERIFIED");

    const hits = await hybridSearchNdkrs("Outdated Reference Constant deprecated 1998", { domain: "science" });
    assert.equal(
      hits.some((h) => h.recordId === expIngest.recordId),
      false,
      "Expired verified records must not be retrieved",
    );

    const staleReport = await scanStaleKnowledgeRecords(30);
    assert.ok(staleReport.expired.some((r) => r.canonicalKey === "SCI-EXPIRED-SAMPLE"));
  });

  it("4. Routes domains accurately & executes deterministic rules + Cross-Domain Fact-Lock + HMAC verification", async () => {
    assert.equal(
      routeNdkrsQuery("Current creatinine 5.1 mg/dL, baseline 1.8 mg/dL KDIGO AKI").primaryDomain,
      "clinical",
    );
    assert.equal(
      routeNdkrsQuery("NIST SP 800-53 AC-2 FedRAMP Moderate SSP & POA&M").primaryDomain,
      "rmf",
    );
    assert.equal(
      routeNdkrsQuery("Does 21 U.S.C. 360j Non-Device CDS exempt our tool?").primaryDomain,
      "legal",
    );

    const kdigo = evaluateDeterministicRule("CLIN-KDIGO-AKI", {
      currentCrMgDl: 5.1,
      baselineCrMgDl: 1.8,
      timeframeText: "six days earlier",
    });
    assert.equal(kdigo.ok, true);
    assert.equal(kdigo.verdict, "KDIGO_STAGE_3");
    assert.equal(kdigo.outputs.crFoldRatio, 2.83);

    const poam = evaluateDeterministicRule("RMF-POAM-SLA", { severity: "HIGH", openDays: 45 });
    assert.equal(poam.verdict, "SLA_OVERDUE");

    const ohms = evaluateDeterministicRule("ENG-OHMS-POWER", { currentA: 2.5, resistanceOhm: 12 });
    assert.equal(ohms.outputs.voltageV, 30);
    assert.equal(ohms.outputs.powerW, 75);

    const gas = evaluateDeterministicRule("SCI-IDEAL-GAS", { pressureAtm: null, volumeL: 22.414, molesN: 1, tempK: 273.15 });
    assert.ok(Math.abs(Number(gas.outputs.pressureAtm) - 1.0) < 0.01);

    const cds = evaluateDeterministicRule("LEGAL-CDS-21USC360J", {
      analyzesImagesSignals: false,
      displaysMedicalInfo: true,
      supportsClinicianRecommendation: true,
      enablesIndependentReview: true,
    });
    assert.equal(cds.verdict, "NON_DEVICE_CDS");

    // Fact-Lock Validator rejects numeric tamper & logs gap + HMAC FAIL_CLOSED cert
    const badLock = await validateCrossDomainFactLock({
      domain: "engineering",
      requestId: "REQ-OHMS-BAD",
      rawPrompt: "2.5A through 12 Ohm",
      candidateText: "Voltage is 19.0 V and Power is 20 W.",
      lockedClaims: ohms.lockedClaims,
    });
    assert.equal(badLock.passed, false);
    assert.equal(badLock.verdict, "FAIL_CLOSED");
    assert.equal(verifyCertificateSignature(badLock.certificate), true);

    // Tampered certificate HMAC signature fails verification
    const tamperedCert = { ...badLock.certificate, outputHash: "0".repeat(64) };
    assert.equal(verifyCertificateSignature(tamperedCert), false);
    assert.equal(
      hmacSha256Sync("Jefe", "what do ya want for nothing?"),
      "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843",
    );
  });

  it("5. Persists clinical FAIL_CLOSED cert & gap on persistent swap + enforces AES-256-GCM enclave + hard cache block", async () => {
    const prompt =
      "A patient has a current creatinine of 5.1 mg/dL. Their historical baseline creatinine was 1.8 mg/dL, measured six days earlier. What is the creatinine ratio, and how should KDIGO AKI staging be evaluated?";

    const lockedOut = await executeUniversalClinicalReasoning(prompt, {
      persistCertificate: true,
      modelChatFn: async () => ({
        text: "Current creatinine is 1.8 mg/dL and baseline creatinine was 5.1 mg/dL (ratio 0.35x). No acute kidney injury is present.",
      }),
    });
    assert.ok(lockedOut?.includes("CLINICAL_VALIDATION_FAILED"));

    const certs = await listValidationCertificates(20);
    const clinicalFailCert = certs.find((c) => c.domain === "clinical" && c.verdict === "FAIL_CLOSED");
    assert.ok(clinicalFailCert);
    assert.equal(verifyCertificateSignature(clinicalFailCert), true, "Persisted DB cert MUST verify HMAC after SQL round-trip");

    const gaps = await listKnowledgeGaps(20);
    assert.ok(gaps.some((g) => g.domain === "clinical"));

    // AES-256-GCM Clinical Enclave encryption + AAD & AuthTag tamper check
    const env = encryptClinicalPayload({ encounterId: "ENC-77", creatinine: 5.1 }, "tenantA::ENC-77");
    const decrypted = decryptClinicalPayload(env, "tenantA::ENC-77");
    assert.equal(decrypted.creatinine, 5.1);
    assert.throws(() => decryptClinicalPayload(env, "tenantB::ENC-77"));

    // Regulated queries blocked in legacy rememberAnswer & trainPair
    const blockedTrain = await trainPair(prompt, "Swapped false answer 1.8", "user-taught");
    assert.equal(blockedTrain.ok, false);
    rememberAnswer("NIST SP 800-53 AC-2 compliance", "Fake satisfied", "user-taught");

    // Distributed rate-limit bucket persistence
    const rl1 = await checkDistributedRateLimit("test-ndkrs-bucket", 2, 30_000);
    const rl2 = await checkDistributedRateLimit("test-ndkrs-bucket", 2, 30_000);
    const rl3 = await checkDistributedRateLimit("test-ndkrs-bucket", 2, 30_000);
    assert.equal(rl1.allowed, true);
    assert.equal(rl2.allowed, true);
    assert.equal(rl3.allowed, false);
  });

  it("6. Handles /api/v2/ndkrs/* HTTP API endpoints cleanly", async () => {
    const stRes = await handleNdkrsV2Request(new Request("https://local.test/api/v2/ndkrs/status"));
    assert.equal(stRes.status, 200);
    const stJson = await stRes.json();
    assert.ok(stJson.counts.verifiedRecords >= 20);

    const searchRes = await handleNdkrsV2Request(
      new Request("https://local.test/api/v2/ndkrs/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "HIPAA 45 CFR 164.312 encryption" }),
      }),
    );
    assert.equal(searchRes.status, 200);
    const searchJson = await searchRes.json();
    assert.ok(searchJson.hits.some((h: { canonicalKey: string }) => h.canonicalKey === "HIPAA-45CFR-164-312"));

    const ruleRes = await handleNdkrsV2Request(
      new Request("https://local.test/api/v2/ndkrs/rules/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ruleId: "CLIN-KDIGO-AKI",
          inputs: { currentCrMgDl: 5.1, baselineCrMgDl: 1.8, timeframeText: "six days earlier" },
        }),
      }),
    );
    assert.equal(ruleRes.status, 200);
    const ruleJson = await ruleRes.json();
    assert.equal(ruleJson.verdict, "KDIGO_STAGE_3");

    const qList = await listReviewQueue();
    assert.ok(Array.isArray(qList));
  });

  it("7. Parses TXT/MD/HTML/JSON/PDF/DOCX uploads & enforces quarantine via POST /api/v2/ndkrs/ingest-file", async () => {
    const htmlParsed = extractDocumentText({
      filename: "brief.html",
      mimeType: "text/html",
      bytes: new TextEncoder().encode("<html><head><style>.x{}</style></head><body><h1>Sepsis Target</h1><script>alert(1)</script><p>MAP >= 65 mmHg per SSC 2021.</p></body></html>"),
    });
    assert.equal(htmlParsed.format, "html");
    assert.ok(htmlParsed.text.includes("MAP >= 65 mmHg") && !htmlParsed.text.includes("alert(1)"));

    // Build a valid single-entry STORE (method=0) DOCX zip buffer containing word/document.xml
    const xmlStr = '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>FedRAMP AC-2 inactivity limit is 35 days.</w:t></w:r></w:p></w:body></w:document>';
    const xmlBytes = new TextEncoder().encode(xmlStr);
    const nameBytes = new TextEncoder().encode("word/document.xml");
    const lfh = Buffer.alloc(30);
    lfh.writeUInt32LE(0x04034b50, 0);
    lfh.writeUInt16LE(20, 4);
    lfh.writeUInt16LE(0, 8); // stored (method=0)
    lfh.writeUInt32LE(xmlBytes.length, 18);
    lfh.writeUInt32LE(xmlBytes.length, 22);
    lfh.writeUInt16LE(nameBytes.length, 26);
    const docxBuf = Buffer.concat([lfh, nameBytes, xmlBytes]);
    const docxParsed = extractDocumentText({
      filename: "policy.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      bytes: docxBuf,
    });
    assert.equal(docxParsed.format, "docx");
    assert.ok(docxParsed.text.includes("FedRAMP AC-2 inactivity limit is 35 days."));

    // Minimal valid uncompressed PDF stream check
    const pdfStr = "%PDF-1.4\n1 0 obj << /Length 44 >> stream\nBT /F1 12 Tf 72 712 Td (KDIGO Stage 3 Creatinine >= 4.0 mg/dL) Tj ET\nendstream\nendobj\n%%EOF";
    const pdfParsed = extractDocumentText({
      filename: "kdigo-extract.pdf",
      mimeType: "application/pdf",
      bytes: new TextEncoder().encode(pdfStr),
    });
    assert.equal(pdfParsed.format, "pdf");
    assert.ok(pdfParsed.text.includes("KDIGO Stage 3 Creatinine"));

    const uploadRes = await handleNdkrsV2Request(
      new Request("https://local.test/api/v2/ndkrs/ingest-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: "test-upload.md",
          mimeType: "text/markdown",
          contentBase64: Buffer.from("# Test Guideline\nFedRAMP High POA&M SLA for High findings is 30 days.", "utf8").toString("base64"),
          domain: "rmf",
          canonicalKey: "TEST-UPLOAD-SLA",
          title: "Test Upload SLA Policy",
          sourceUri: "https://untrusted.example.invalid/upload.md",
          proposedBy: "upload-tester",
        }),
      }),
    );
    assert.equal(uploadRes.status, 201);
    const uploadJson = await uploadRes.json();
    assert.equal(uploadJson.status, "PENDING_REVIEW");
    assert.ok(uploadJson.reviewQueueItem?.id);

    // Clean up test upload queue item via rejection
    const rej = await decideReviewItem({
      queueId: uploadJson.reviewQueueItem.id,
      decision: "REJECT",
      reviewerId: "test-reviewer-2",
      reviewerRole: "Governance Lead",
      notes: "Cleanup test fixture",
    });
    assert.equal(rej.status, "REJECTED");
  });

  it("8. Executes all 4 newly added deterministic rules (Anion Gap, Corrected Na, Reynolds, Henderson-Hasselbalch) + Enclave API", async () => {
    const agMissingCl = evaluateDeterministicRule("CLIN-ANION-GAP", { sodiumMeqL: 140, chlorideMeqL: null, bicarbonateMeqL: 14 });
    assert.equal(agMissingCl.ok, false);
    assert.equal(agMissingCl.verdict, "CANNOT_CALCULATE_CHLORIDE_MISSING");

    const agOk = evaluateDeterministicRule("CLIN-ANION-GAP", { sodiumMeqL: 140, chlorideMeqL: 100, bicarbonateMeqL: 14 });
    assert.equal(agOk.ok, true);
    assert.equal(agOk.outputs.anionGapMeqL, 26);
    assert.equal(agOk.verdict, "ELEVATED_HAGMA");

    const corrNa = evaluateDeterministicRule("CLIN-CORRECTED-NA", { sodiumMeqL: 132, glucoseMgDl: 400 });
    assert.equal(corrNa.ok, true);
    assert.equal(corrNa.outputs.katzCorrectedSodiumMeqL, 136.8);

    const re = evaluateDeterministicRule("ENG-REYNOLDS", { densityKgM3: 1000, velocityMS: 2.5, diameterM: 0.05, dynamicViscosityPaS: 0.001 });
    assert.equal(re.ok, true);
    assert.equal(re.outputs.reynoldsNumber, 125000);
    assert.equal(re.verdict, "TURBULENT");

    const hh = evaluateDeterministicRule("SCI-HENDERSON-HASSELBALCH", { pKa: 4.76, conjugateBaseMolar: 0.2, weakAcidMolar: 0.1 });
    assert.equal(hh.ok, true);
    assert.equal(hh.outputs.pH, 5.061);

    const flRes = await handleNdkrsV2Request(
      new Request("https://local.test/api/v2/ndkrs/fact-lock/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: "engineering",
          requestId: "API-FL-TEST",
          rawPrompt: "Verify Reynolds number 125000",
          candidateText: "Calculated Reynolds Number: 125000 (TURBULENT flow). ASME Fluid Meters",
          lockedClaims: [{ label: "Reynolds Number", expectedValue: 125000, tolerance: 1, mustAppear: true }],
          verifiedCitations: ["ASME Fluid Meters"],
        }),
      }),
    );
    assert.equal(flRes.status, 200);
    const flJson = await flRes.json();
    assert.equal(flJson.passed, true);
    assert.equal(flJson.certificate.verdict, "APPROVED");

    const encRes = await handleNdkrsV2Request(
      new Request("https://local.test/api/v2/ndkrs/enclave/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          encounterId: "ENC-API-TEST",
          patientAlias: "TEST-PT-01",
          payload: { creatinine: 5.1, baseline: 1.8 },
        }),
      }),
    );
    assert.equal(encRes.status, 201);
    const encJson = await encRes.json();
    assert.equal(encJson.ok, true);
    assert.ok(encJson.keyVersion);
  });

  it("9. Enforces temporal expiry via enforceExpiredKnowledgeRecords & /api/v2/ndkrs/cron/revalidate", async () => {
    const expDoc = await ingestKnowledgeDocument({
      domain: "general",
      canonicalKey: "EXPIRED-TEMP-TEST-01",
      title: "Temporary Standard Expired 2020",
      summary: "Expired benchmark guidance from 2020.",
      content: "Legacy guidance superseded in 2020 regarding temporary endpoint token lifetime.",
      sourceUri: "https://csrc.nist.gov/publications/temp-expired-2020",
      trustTier: "TIER_2_PEER_REVIEWED",
      version: "2020.1",
      expiresAt: "2020-01-01T00:00:00Z",
      proposedBy: "test-seeder",
      preVerifiedBy: "test-governance-board",
    });
    assert.equal(expDoc.status, "VERIFIED");

    const cronRes = await handleNdkrsV2Request(new Request("https://local.test/api/v2/ndkrs/cron/revalidate"));
    assert.equal(cronRes.status, 200);
    const cronJson = await cronRes.json();
    assert.ok(cronJson.expiredTransitioned >= 1);
    assert.ok(Array.isArray(cronJson.transitionedIds));

    // Confirm second invocation cleanly finds 0 remaining active expired transitions for same record
    const followScan = await enforceExpiredKnowledgeRecords(30);
    assert.equal(followScan.expiredTransitioned, 0);

    // Expired records are excluded from hybrid retrieval
    const hitsAfterExpiry = await hybridSearchNdkrs("Temporary Standard Expired 2020");
    assert.equal(hitsAfterExpiry.some((h) => h.canonicalKey === "EXPIRED-TEMP-TEST-01"), false);

    // Runtime re-embed endpoint cleanly reports active model / fallback without failing locally
    const reembedRes = await handleNdkrsV2Request(
      new Request("https://local.test/api/v2/ndkrs/cron/reembed", { method: "POST" }),
    );
    assert.equal(reembedRes.status, 200);
    const reembedJson = await reembedRes.json();
    assert.equal(reembedJson.ok, true);
    assert.ok(typeof reembedJson.activeModel === "string" && reembedJson.activeModel.length > 0);
  });

  it("10. Routes Chat Bridge introspection, NDKRS rules, and hybrid RAG grounding cleanly", async () => {
    const statusMd = await tryHandlePlatformStatusOrLedgerQuery("Show NDKRS status, validation certificates, and RMF v2 artifacts");
    assert.ok(statusMd && statusMd.includes("NDKRS Live Platform Status") && statusMd.includes("RMF v2.0 SQL Artifact Store"));

    const ruleOut = await tryExecuteNdkrsDeterministicRuleFromChat(
      "Calculate Reynolds number with density 1000 velocity 2.5 diameter 0.05 viscosity 0.001",
    );
    assert.ok(ruleOut && ruleOut.includes("125000") && ruleOut.includes("TURBULENT") && ruleOut.includes("Fact-Lock Certificate"));

    const anionRefusal = await tryExecuteNdkrsDeterministicRuleFromChat(
      "Run CLIN-ANION-GAP sodium 140 chloride null bicarbonate 14",
      { explicitRuleIdOnly: true },
    );
    assert.ok(anionRefusal && anionRefusal.includes("CANNOT_CALCULATE_CHLORIDE_MISSING"));

    const grounding = await fetchNdkrsChatGrounding("KDIGO 2012 AKI Stage 3 creatinine 4.0");
    assert.ok(grounding.hits.length > 0 && grounding.footer.includes("NDKRS Verified Knowledge Grounding"));
  });
});
