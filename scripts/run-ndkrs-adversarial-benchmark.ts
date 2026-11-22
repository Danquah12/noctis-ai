#!/usr/bin/env npx tsx
/**
 * NDKRS 100-Case Adversarial & Deterministic Production Benchmark
 *
 * Categories:
 *   Cat A (20): Clinical ICU, KDIGO AKI, Anion Gap Guard, Winter's, MAP, Katz Na, AES-GCM Enclave
 *   Cat B (20): RMF / FedRAMP / DoD IL2-IL6 / CMMC SPRS / POA&M Closure / ATO Readiness
 *   Cat C (20): Engineering, Physical Sciences, & Legal/Statutory Determinism
 *   Cat D (15): Cross-Domain Hybrid RAG Recall & Grounding Citation Integrity
 *   Cat E (15): Anti-Poisoning Quarantine, Contradictions, Document Parsers, Allowlist, & Expiry
 *   Cat F (10): Chat Bridge Routing, Explicit Rules, Fail-Closed Fact-Lock & HMAC Verification
 *
 * Exits 0 ONLY on 100/100 PASS.
 */

import { seedNdkrsAuthoritativeCorpus } from "../src/lib/ndkrs/corpus-seed.ts";
import { extractDocumentText } from "../src/lib/ndkrs/document-parser.server.ts";
import { decryptClinicalPayload, encryptClinicalPayload } from "../src/lib/ndkrs/enclave-crypto.server.ts";
import { validateCrossDomainFactLock, verifyCertificateSignature } from "../src/lib/ndkrs/fact-lock-validator.server.ts";
import { decideReviewItem, enforceExpiredKnowledgeRecords } from "../src/lib/ndkrs/governance.server.ts";
import { hybridSearchNdkrs } from "../src/lib/ndkrs/hybrid-retrieval.server.ts";
import { ingestKnowledgeDocument, isAllowlistedSourceUri } from "../src/lib/ndkrs/ingestion.server.ts";
import { evaluateDeterministicRule } from "../src/lib/ndkrs/rules-engine.server.ts";
import {
  fetchNdkrsChatGrounding,
  tryExecuteNdkrsDeterministicRuleFromChat,
  tryHandlePlatformStatusOrLedgerQuery,
} from "../src/lib/ndkrs/chat-bridge.server.ts";
import { buildClinicalScratchpad } from "../src/lib/noctis-clinical-scratchpad.ts";
import { auditAndEnforceClinicalDossier } from "../src/lib/noctis-clinical-preflight-auditor.ts";
import { evaluateFips199SecurityCategorization } from "../src/lib/noctis-rmf-engine.ts";
import {
  evaluateAc2AccountManagementRule,
  evaluateCmmcSprsScore,
  evaluateDodImpactLevelOverlay,
  evaluateIa2AuthRule,
  extractAndEvaluateRmfRulesFromText,
} from "../src/lib/noctis-rmf-rules.ts";
import { rememberAnswer, trainPair } from "../src/lib/noctis-train.server.ts";
import { evaluateAtoReadiness, evaluatePoamClosure } from "../src/lib/rmf-v2/governance.ts";
import { evaluateControlFromObjectives, verifyEvidenceRecord } from "../src/lib/rmf-v2/evidence.ts";

interface BenchCaseResult {
  id: string;
  category: "A" | "B" | "C" | "D" | "E" | "F";
  name: string;
  passed: boolean;
  detail: string;
}

const results: BenchCaseResult[] = [];

async function check(
  id: string,
  category: "A" | "B" | "C" | "D" | "E" | "F",
  name: string,
  fn: () => Promise<boolean | string> | boolean | string,
): Promise<void> {
  try {
    const out = await fn();
    if (out === true) {
      results.push({ id, category, name, passed: true, detail: "PASS" });
    } else if (typeof out === "string" && out === "OK") {
      results.push({ id, category, name, passed: true, detail: "PASS" });
    } else {
      results.push({
        id,
        category,
        name,
        passed: false,
        detail: typeof out === "string" ? out : "Assertion returned false",
      });
    }
  } catch (err) {
    results.push({
      id,
      category,
      name,
      passed: false,
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}

async function main() {
  const seedOut = await seedNdkrsAuthoritativeCorpus({ preVerifiedBy: "benchmark-governance-board" });
  if (seedOut.recordsSeeded < 40 || seedOut.rulesSeeded < 12) {
    throw new Error(`Expected >= 40 records and >= 12 rules, got ${JSON.stringify(seedOut)}`);
  }

  // =========================================================================
  // CATEGORY A (20): Clinical ICU, KDIGO AKI, Anion Gap, Winter's, MAP, Enclave
  // =========================================================================
  await check("CatA-01", "A", "KDIGO Stage 3 dual-pathway Cr 5.1 vs 1.8 (6d)", () => {
    const r = evaluateDeterministicRule("CLIN-KDIGO-AKI", {
      currentCrMgDl: 5.1,
      baselineCrMgDl: 1.8,
      timeframeText: "six days earlier",
    });
    return r.ok && r.verdict === "KDIGO_STAGE_3" && Number(r.outputs.crFoldRatio) >= 2.8;
  });

  await check("CatA-02", "A", "KDIGO Stage 3 acute threshold >= 4.0 + 0.5 rise", () => {
    const r = evaluateDeterministicRule("CLIN-KDIGO-AKI", {
      currentCrMgDl: 4.4,
      baselineCrMgDl: 2.0,
      timeframeText: "48 hours",
    });
    return r.ok && r.verdict === "KDIGO_STAGE_3";
  });

  await check("CatA-03", "A", "KDIGO Stage 2 fold ratio 2.0x..2.9x", () => {
    const r = evaluateDeterministicRule("CLIN-KDIGO-AKI", {
      currentCrMgDl: 2.2,
      baselineCrMgDl: 1.1,
      timeframeText: "72 hours",
    });
    return r.ok && r.verdict === "KDIGO_STAGE_2";
  });

  await check("CatA-04", "A", "KDIGO Stage 1 >= 0.3 mg/dL 48h rise", () => {
    const r = evaluateDeterministicRule("CLIN-KDIGO-AKI", {
      currentCrMgDl: 1.4,
      baselineCrMgDl: 1.0,
      timeframeText: "within 48 hours",
    });
    return r.ok && r.verdict === "KDIGO_STAGE_1";
  });

  await check("CatA-05", "A", "Reversed sentence order Cr 1.8 baseline vs Cr 5.1 current", () => {
    const sp = buildClinicalScratchpad(
      "Six days ago patient baseline serum creatinine was 1.8 mg/dL; current serum creatinine today is 5.1 mg/dL.",
      "ADV-REV-01",
    );
    return sp.derivedCalculations.kdigoAki.finalHighestSupportedStage === 3;
  });

  await check("CatA-06", "A", "Scratchpad refuses assumed 70kg body weight fabrication", () => {
    const raw = "68-year-old septic male with anuria, weight not provided, urine output 0 mL.";
    const res = auditAndEnforceClinicalDossier("Patient weighs 70 kg adult giving 0.18 mL/kg/h", raw, "ADV-WT-01");
    return res.auditedDossier.includes("UNMEASURED") || res.violations.some((v) => v.ruleId.includes("WEIGHT"));
  });

  await check("CatA-07", "A", "CLIN-ANION-GAP strictly refuses when serum Cl- is null", () => {
    const r = evaluateDeterministicRule("CLIN-ANION-GAP", { sodiumMeqL: 140, chlorideMeqL: null, bicarbonateMeqL: 14 });
    return !r.ok && r.verdict === "CANNOT_CALCULATE_CHLORIDE_MISSING";
  });

  await check("CatA-08", "A", "CLIN-ANION-GAP computes HAGMA accurately (140 - (100+14) = 26)", () => {
    const r = evaluateDeterministicRule("CLIN-ANION-GAP", { sodiumMeqL: 140, chlorideMeqL: 100, bicarbonateMeqL: 14 });
    return r.ok && r.outputs.anionGapMeqL === 26 && r.verdict === "ELEVATED_HAGMA";
  });

  await check("CatA-09", "A", "CLIN-ANION-GAP computes normal anion gap accurately (140 - (106+24) = 10)", () => {
    const r = evaluateDeterministicRule("CLIN-ANION-GAP", { sodiumMeqL: 140, chlorideMeqL: 106, bicarbonateMeqL: 24 });
    return r.ok && r.outputs.anionGapMeqL === 10 && r.verdict === "NORMAL_ANION_GAP";
  });

  await check("CatA-10", "A", "CLIN-CORRECTED-NA computes Katz correction Na=132 Glu=400 -> 136.8", () => {
    const r = evaluateDeterministicRule("CLIN-CORRECTED-NA", { sodiumMeqL: 132, glucoseMgDl: 400 });
    return r.ok && r.outputs.katzCorrectedSodiumMeqL === 136.8 && r.verdict === "NORMOCORRECTED_SODIUM";
  });

  await check("CatA-11", "A", "CLIN-CORRECTED-NA persistent true hyponatremia Na=122 Glu=300 -> 125.2", () => {
    const r = evaluateDeterministicRule("CLIN-CORRECTED-NA", { sodiumMeqL: 122, glucoseMgDl: 300 });
    return r.ok && r.outputs.katzCorrectedSodiumMeqL === 125.2 && r.verdict === "HYPONATREMIA_PERSISTS";
  });

  await check("CatA-12", "A", "CLIN-MAP identifies Surviving Sepsis deficit (80/50 -> 60 < 65)", () => {
    const r = evaluateDeterministicRule("CLIN-MAP", { sbpMmHg: 80, dbpMmHg: 50 });
    return r.ok && r.outputs.mapMmHg === 60 && r.verdict === "HYPOTENSIVE_BELOW_65_MMHG";
  });

  await check("CatA-13", "A", "CLIN-MAP confirms perfusion target met (110/70 -> 83.3 >= 65)", () => {
    const r = evaluateDeterministicRule("CLIN-MAP", { sbpMmHg: 110, dbpMmHg: 70 });
    return r.ok && Number(r.outputs.mapMmHg) >= 83 && r.verdict === "ADEQUATE_PERFUSION_TARGET_MET";
  });

  await check("CatA-14", "A", "CLIN-WINTERS matches appropriate compensation HCO3=12 PaCO2=26", () => {
    const r = evaluateDeterministicRule("CLIN-WINTERS", { hco3MeqL: 12, measuredPaco2MmHg: 26 });
    return r.ok && r.outputs.expectedPaco2Center === 26 && r.verdict === "APPROPRIATE_COMPENSATION";
  });

  await check("CatA-15", "A", "CLIN-WINTERS detects concomitant respiratory acidosis HCO3=12 PaCO2=42", () => {
    const r = evaluateDeterministicRule("CLIN-WINTERS", { hco3MeqL: 12, measuredPaco2MmHg: 42 });
    return r.ok && r.verdict === "INADEQUATE_COMPENSATION_OR_RESPIRATORY_ACIDOSIS";
  });

  await check("CatA-16", "A", "CLIN-WINTERS detects concomitant respiratory alkalosis HCO3=12 PaCO2=18", () => {
    const r = evaluateDeterministicRule("CLIN-WINTERS", { hco3MeqL: 12, measuredPaco2MmHg: 18 });
    return r.ok && r.verdict === "CONCOMITANT_RESPIRATORY_ALKALOSIS";
  });

  await check("CatA-17", "A", "Fact-Lock rejects altered creatinine claim (claims 1.8 instead of 5.1)", async () => {
    const res = await validateCrossDomainFactLock({
      domain: "clinical",
      requestId: "BENCH-FL-CLIN-01",
      rawPrompt: "Cr 5.1 baseline 1.8",
      candidateText: "Current Creatinine is 1.8 mg/dL.",
      lockedClaims: [{ label: "Current Creatinine", expectedValue: 5.1, tolerance: 0.05, mustAppear: true }],
      persist: false,
    });
    return !res.passed && res.violations.some((v) => v.ruleId === "NDKRS-FACT-NUMERIC-MISMATCH");
  });

  await check("CatA-18", "A", "Fact-Lock blocks AKI denial when KDIGO_STAGE_3 is expected", async () => {
    const res = await validateCrossDomainFactLock({
      domain: "clinical",
      requestId: "BENCH-FL-CLIN-02",
      rawPrompt: "Cr 5.1",
      candidateText: "There is no acute kidney injury.",
      expectedVerdict: "KDIGO_STAGE_3",
      persist: false,
    });
    return !res.passed && res.violations.some((v) => v.ruleId === "NDKRS-VERDICT-CONTRADICTION");
  });

  await check("CatA-19", "A", "AES-256-GCM Clinical Enclave rejects cross-tenant AAD mismatch", () => {
    const env = encryptClinicalPayload({ cr: 5.1, na: 132 }, "tenantA::ENC-900");
    let threw = false;
    try {
      decryptClinicalPayload(env, "tenantB::ENC-900");
    } catch {
      threw = true;
    }
    return threw && decryptClinicalPayload(env, "tenantA::ENC-900").cr === 5.1;
  });

  await check("CatA-20", "A", "Regulated clinical training override is blocked in trainPair", async () => {
    const out = await trainPair("Patient creatinine 5.1 mg/dL AKI Stage 3", "Actually Stage 1 creatinine 0.6", "user-taught");
    rememberAnswer("KDIGO Stage 3 acute creatinine threshold", "fake 1.2 mg/dL", "user-taught");
    return out.ok === false;
  });

  // =========================================================================
  // CATEGORY B (20): RMF / FedRAMP / DoD IL2-IL6 / CMMC SPRS / POA&M / ATO
  // =========================================================================
  await check("CatB-01", "B", "RMF-FIPS-199 high-water-mark H/L/L -> HIGH", () => {
    const r = evaluateDeterministicRule("RMF-FIPS-199", {
      confidentialityImpact: "HIGH",
      integrityImpact: "LOW",
      availabilityImpact: "LOW",
    });
    return r.ok && r.verdict === "HIGH";
  });

  await check("CatB-02", "B", "RMF-FIPS-199 ITAR / Export Control floor blocks LOW confidentiality", () => {
    const res = evaluateFips199SecurityCategorization({
      confidentialityImpact: "LOW",
      integrityImpact: "LOW",
      availabilityImpact: "LOW",
      informationTypes: ["ITAR Controlled Technical Data"],
      isNationalSecuritySystem: false,
    });
    return !res.passed && res.safetyVetoes.some((v) => v.includes("ITAR"));
  });

  await check("CatB-03", "B", "RMF-POAM-SLA HIGH finding open 45 days is SLA_OVERDUE", () => {
    const r = evaluateDeterministicRule("RMF-POAM-SLA", { severity: "HIGH", openDays: 45 });
    return r.ok && r.verdict === "SLA_OVERDUE" && r.outputs.maxSlaDays === 30;
  });

  await check("CatB-04", "B", "RMF-POAM-SLA HIGH finding open 15 days is WITHIN_SLA", () => {
    const r = evaluateDeterministicRule("RMF-POAM-SLA", { severity: "HIGH", openDays: 15 });
    return r.ok && r.verdict === "WITHIN_SLA";
  });

  await check("CatB-05", "B", "RMF-POAM-SLA MODERATE finding open 95 days is SLA_OVERDUE", () => {
    const r = evaluateDeterministicRule("RMF-POAM-SLA", { severity: "MODERATE", openDays: 95 });
    return r.ok && r.verdict === "SLA_OVERDUE" && r.outputs.maxSlaDays === 90;
  });

  await check("CatB-06", "B", "AC-2 termination elapsed 38h > 24h FedRAMP High returns FAIL", () => {
    const res = evaluateAc2AccountManagementRule({
      baseline: "FedRAMP Rev. 5 High",
      policyThresholdHours: 24,
      elapsedHours: 38,
    });
    return res.verdict === "FAIL" && Boolean(res.draftPoam);
  });

  await check("CatB-07", "B", "IA-2 static SSH keys without MFA returns FAIL", () => {
    const res = evaluateIa2AuthRule({
      baseline: "FedRAMP Rev. 5 High",
      mfaEnforcedPrivileged: false,
      staticSshKeysInUse: true,
    });
    return res.verdict === "FAIL";
  });

  await check("CatB-08", "B", "Natural-language CM-6 STIG 72% compliance extraction returns FAIL", () => {
    const evals = extractAndEvaluateRmfRulesFromText(
      "Evaluate CM-6 configuration settings with STIG hardening compliance 72% in FedRAMP High",
    );
    return evals.some((e) => e.controlId === "CM-6" && e.verdict === "FAIL");
  });

  await check("CatB-09", "B", "DoD IL5 rejects commercial multi-tenant hosting & missing SCCA", () => {
    const res = evaluateDodImpactLevelOverlay({
      impactLevel: "IL5",
      hostingEnvironment: "Commercial",
      sccaCompliant: false,
      usCitizenAdminsOnly: true,
      cnssi1253Overlay: true,
    });
    return res.verdict === "FAIL" && res.violations.length >= 2;
  });

  await check("CatB-10", "B", "DoD IL5 passes compliant GovCloud dedicated SCCA configuration", () => {
    const res = evaluateDodImpactLevelOverlay({
      impactLevel: "IL5",
      hostingEnvironment: "Dedicated_GovCloud",
      sccaCompliant: true,
      usCitizenAdminsOnly: true,
      cnssi1253Overlay: true,
    });
    return res.verdict === "PASS" && res.requiredOverlays.includes("CNSSI 1253");
  });

  await check("CatB-11", "B", "DoD IL6 fails without SIPRNet_Classified enclave", () => {
    const res = evaluateDodImpactLevelOverlay({
      impactLevel: "IL6",
      hostingEnvironment: "Dedicated_GovCloud",
      usCitizenAdminsOnly: true,
      fips140Level: 3,
    });
    return res.verdict === "FAIL";
  });

  await check("CatB-12", "B", "CMMC SPRS calculator deducts weighted penalties & blocks 5pt conditional", () => {
    const res = evaluateCmmcSprsScore({
      failedControls: [
        { controlId: "3.5.3", weight: 5, onPoam: true },
        { controlId: "3.1.1", weight: 3, onPoam: true },
      ],
    });
    return res.sprsScore === 102 && res.conditionalCertificationEligible === false;
  });

  await check("CatB-13", "B", "POA&M closure strictly blocks paper attestations without verified evidence", () => {
    const res = evaluatePoamClosure({
      poamId: "POAM-001",
      controlId: "AC-2",
      owner: "ISSO",
      remediationSummary: "Verbal confirmation",
      evidenceVerification: null,
    });
    return !res.closed && res.status === "OPEN";
  });

  await check("CatB-14", "B", "ATO Readiness enforces authorization_decision = NOT_MADE invariant", () => {
    const res = evaluateAtoReadiness({
      system_id: "SYS-001",
      package_id: "PKG-001",
      missingEvidenceItems: [{ controlId: "IA-2" }],
    });
    return res.status === "NOT_READY" && res.authorization_decision === "NOT_MADE" && res.human_authorization_required === true;
  });

  await check("CatB-15", "B", "RMF v2 evidence gate quarantines SHA-256 mismatch & blocks SATISFIED", () => {
    const ev = verifyEvidenceRecord({
      evidenceId: "EV-TAMPER",
      tenantId: "bench-tenant",
      controlId: "AU-2",
      origin: "splunk-connector",
      collectedAt: new Date().toISOString(),
      claimedSha256: "0".repeat(64),
      payload: "audit log payload",
      maxAgeDays: 30,
    });
    const ctrl = evaluateControlFromObjectives("AU-2", [
      { objectiveId: "AU-02a.[01]", outcome: "INSUFFICIENT_EVIDENCE", evidenceVerified: ev.verified },
    ]);
    return !ev.verified && ev.status === "QUARANTINED" && ctrl.overallStatus !== "SATISFIED";
  });

  await check("CatB-16", "B", "Fact-Lock blocks claiming control is satisfied when verdict is NOT_SATISFIED", async () => {
    const res = await validateCrossDomainFactLock({
      domain: "rmf",
      requestId: "BENCH-FL-RMF-01",
      rawPrompt: "IA-2 MFA check",
      candidateText: "The control is satisfied across all accounts.",
      expectedVerdict: "NOT_SATISFIED",
      persist: false,
    });
    return !res.passed && res.violations.some((v) => v.ruleId === "NDKRS-VERDICT-CONTRADICTION");
  });

  await check("CatB-17", "B", "NDKRS search recalls AC-2 account management in top-3", async () => {
    const hits = await hybridSearchNdkrs("AC-2 account disablement 24 hours FedRAMP High", { domain: "rmf", limit: 3 });
    return hits.some((h) => h.canonicalKey === "AC-2");
  });

  await check("CatB-18", "B", "NDKRS search recalls IA-2 phishing-resistant MFA in top-3", async () => {
    const hits = await hybridSearchNdkrs("IA-2 phishing-resistant MFA FIDO2 WebAuthn", { domain: "rmf", limit: 3 });
    return hits.some((h) => h.canonicalKey === "IA-2");
  });

  await check("CatB-19", "B", "NDKRS search recalls RA-5 vulnerability scanning SLAs", async () => {
    const hits = await hybridSearchNdkrs("RA-5 monthly vulnerability scanning FedRAMP remediation window", { domain: "rmf", limit: 3 });
    return hits.some((h) => h.canonicalKey === "RA-5");
  });

  await check("CatB-20", "B", "NDKRS search recalls CISA BOD 22-01 KEV mandate", async () => {
    const hits = await hybridSearchNdkrs("CISA BOD 22-01 Known Exploited Vulnerabilities remediation", { domain: "cybersecurity", limit: 3 });
    return hits.some((h) => h.canonicalKey === "CISA-BOD-22-01-KEV");
  });

  // =========================================================================
  // CATEGORY C (20): Engineering, Science & Legal Determinism
  // =========================================================================
  await check("CatC-01", "C", "ENG-OHMS-POWER solves V & P from I=3.5A and R=12ohm (42V, 147W)", () => {
    const r = evaluateDeterministicRule("ENG-OHMS-POWER", { currentA: 3.5, resistanceOhm: 12 });
    return r.ok && r.outputs.voltageV === 42 && r.outputs.powerW === 147;
  });

  await check("CatC-02", "C", "ENG-OHMS-POWER solves I & P from V=24V and R=8ohm (3A, 72W)", () => {
    const r = evaluateDeterministicRule("ENG-OHMS-POWER", { voltageV: 24, resistanceOhm: 8 });
    return r.ok && r.outputs.currentA === 3 && r.outputs.powerW === 72;
  });

  await check("CatC-03", "C", "ENG-OHMS-POWER rejects division by R=0", () => {
    const r = evaluateDeterministicRule("ENG-OHMS-POWER", { voltageV: 24, resistanceOhm: 0 });
    return !r.ok && r.verdict === "MISSING_INPUTS";
  });

  await check("CatC-04", "C", "ENG-OHMS-POWER rejects insufficient single parameter", () => {
    const r = evaluateDeterministicRule("ENG-OHMS-POWER", { voltageV: 24 });
    return !r.ok && r.verdict === "MISSING_INPUTS";
  });

  await check("CatC-05", "C", "Fact-Lock catches tampered Voltage output (claims 99V vs 42V)", async () => {
    const res = await validateCrossDomainFactLock({
      domain: "engineering",
      requestId: "BENCH-FL-ENG-01",
      rawPrompt: "3.5 A 12 ohm",
      candidateText: "Voltage: 99 V",
      lockedClaims: [{ label: "Voltage", expectedValue: 42, unit: "V", tolerance: 0.05, mustAppear: true }],
      persist: false,
    });
    return !res.passed;
  });

  await check("CatC-06", "C", "ENG-REYNOLDS classifies laminar pipe flow Re < 2300", () => {
    const r = evaluateDeterministicRule("ENG-REYNOLDS", {
      densityKgM3: 1000,
      velocityMS: 0.1,
      diameterM: 0.01,
      dynamicViscosityPaS: 0.001,
    });
    return r.ok && r.outputs.reynoldsNumber === 1000 && r.verdict === "LAMINAR";
  });

  await check("CatC-07", "C", "ENG-REYNOLDS classifies transitional flow 2300 <= Re <= 4000", () => {
    const r = evaluateDeterministicRule("ENG-REYNOLDS", {
      densityKgM3: 1000,
      velocityMS: 0.3,
      diameterM: 0.01,
      dynamicViscosityPaS: 0.001,
    });
    return r.ok && r.outputs.reynoldsNumber === 3000 && r.verdict === "TRANSITIONAL";
  });

  await check("CatC-08", "C", "ENG-REYNOLDS classifies turbulent pipe flow Re > 4000", () => {
    const r = evaluateDeterministicRule("ENG-REYNOLDS", {
      densityKgM3: 1000,
      velocityMS: 2.5,
      diameterM: 0.05,
      dynamicViscosityPaS: 0.001,
    });
    return r.ok && r.outputs.reynoldsNumber === 125000 && r.verdict === "TURBULENT";
  });

  await check("CatC-09", "C", "ENG-REYNOLDS guards against viscosity <= 0", () => {
    const r = evaluateDeterministicRule("ENG-REYNOLDS", {
      densityKgM3: 1000,
      velocityMS: 2.5,
      diameterM: 0.05,
      dynamicViscosityPaS: 0,
    });
    return !r.ok && r.verdict === "MISSING_INPUTS";
  });

  await check("CatC-10", "C", "SCI-IDEAL-GAS solves pressure from V=10L, n=2mol, T=300K", () => {
    const r = evaluateDeterministicRule("SCI-IDEAL-GAS", { volumeL: 10, molesN: 2, tempK: 300 });
    return r.ok && r.verdict === "SOLVED_PRESSURE_ATM" && Math.abs(Number(r.outputs.pressureAtm) - 4.9234) < 0.01;
  });

  await check("CatC-11", "C", "SCI-IDEAL-GAS solves volume from P=2atm, n=1mol, T=273.15K", () => {
    const r = evaluateDeterministicRule("SCI-IDEAL-GAS", { pressureAtm: 2, molesN: 1, tempK: 273.15 });
    return r.ok && r.verdict === "SOLVED_VOLUME_L" && Math.abs(Number(r.outputs.volumeL) - 11.2069) < 0.01;
  });

  await check("CatC-12", "C", "SCI-IDEAL-GAS rejects zero volume denominator", () => {
    const r = evaluateDeterministicRule("SCI-IDEAL-GAS", { volumeL: 0, molesN: 2, tempK: 300 });
    return !r.ok && r.verdict === "MISSING_INPUTS";
  });

  await check("CatC-13", "C", "SCI-HENDERSON-HASSELBALCH computes acidic buffer pH = 5.061", () => {
    const r = evaluateDeterministicRule("SCI-HENDERSON-HASSELBALCH", { pKa: 4.76, conjugateBaseMolar: 0.2, weakAcidMolar: 0.1 });
    return r.ok && r.outputs.pH === 5.061 && r.verdict === "ACIDIC_BUFFER";
  });

  await check("CatC-14", "C", "SCI-HENDERSON-HASSELBALCH computes basic Tris buffer pH = 8.07", () => {
    const r = evaluateDeterministicRule("SCI-HENDERSON-HASSELBALCH", { pKa: 8.07, conjugateBaseMolar: 0.5, weakAcidMolar: 0.5 });
    return r.ok && r.outputs.pH === 8.07 && r.verdict === "BASIC_BUFFER";
  });

  await check("CatC-15", "C", "SCI-HENDERSON-HASSELBALCH guards non-positive molarity", () => {
    const r = evaluateDeterministicRule("SCI-HENDERSON-HASSELBALCH", { pKa: 4.76, conjugateBaseMolar: 0, weakAcidMolar: 0.1 });
    return !r.ok && r.verdict === "MISSING_INPUTS";
  });

  await check("CatC-16", "C", "LEGAL-CDS-21USC360J classifies valid Non-Device CDS", () => {
    const r = evaluateDeterministicRule("LEGAL-CDS-21USC360J", {
      analyzesImagesSignals: false,
      displaysMedicalInfo: true,
      supportsClinicianRecommendation: true,
      enablesIndependentReview: true,
    });
    return r.ok && r.verdict === "NON_DEVICE_CDS";
  });

  await check("CatC-17", "C", "LEGAL-CDS-21USC360J flags medical image/signal acquisition as SaMD", () => {
    const r = evaluateDeterministicRule("LEGAL-CDS-21USC360J", {
      analyzesImagesSignals: true,
      displaysMedicalInfo: true,
      supportsClinicianRecommendation: true,
      enablesIndependentReview: true,
    });
    return r.ok && r.verdict === "DEVICE_REGULATED_SAMD_REVIEW_REQUIRED";
  });

  await check("CatC-18", "C", "LEGAL-CDS-21USC360J flags black-box UI lacking independent review as SaMD", () => {
    const r = evaluateDeterministicRule("LEGAL-CDS-21USC360J", {
      analyzesImagesSignals: false,
      displaysMedicalInfo: true,
      supportsClinicianRecommendation: true,
      enablesIndependentReview: false,
    });
    return r.ok && r.verdict === "DEVICE_REGULATED_SAMD_REVIEW_REQUIRED";
  });

  await check("CatC-19", "C", "Legal HIPAA 45 CFR 164.312 technical safeguards indexed", async () => {
    const hits = await hybridSearchNdkrs("HIPAA 45 CFR 164.312 encryption audit controls ePHI", { domain: "legal", limit: 3 });
    return hits.some((h) => h.canonicalKey === "HIPAA-45CFR-164-312");
  });

  await check("CatC-20", "C", "Legal 32 CFR Part 2002 CUI regulatory record indexed", async () => {
    const hits = await hybridSearchNdkrs("32 CFR Part 2002 CUI Controlled Unclassified Information", { domain: "legal", limit: 3 });
    return hits.some((h) => h.canonicalKey === "CUI-32CFR-PART-2002");
  });

  // =========================================================================
  // CATEGORY D (15): Cross-Domain Hybrid RAG Recall & Grounding Citations
  // =========================================================================
  const ragQueries: Array<{ id: string; query: string; domain?: Parameters<typeof hybridSearchNdkrs>[1]["domain"]; key: string }> = [
    { id: "CatD-01", query: "KDIGO 2012 AKI Stage 3 creatinine ratio >= 4.0", domain: "clinical", key: "KDIGO-2012-AKI" },
    { id: "CatD-02", query: "Surviving Sepsis Campaign MAP >= 65 mmHg lactate", domain: "clinical", key: "SSC-2021-SEPSIS" },
    { id: "CatD-03", query: "DKA HHS insulin potassium corrected sodium", domain: "clinical", key: "CLIN-DKA-HHS" },
    { id: "CatD-04", query: "Acute ischemic stroke alteplase tenecteplase thrombolysis BP < 185/110", domain: "clinical", key: "CLIN-STROKE-THROMBOLYSIS" },
    { id: "CatD-05", query: "Digoxin toxicity DigiFab Empiric vials renal excretion", domain: "clinical", key: "CLIN-DIGOXIN-DIGIFAB" },
    { id: "CatD-06", query: "Hyperkalemia IV calcium gluconate insulin dextrose ECG changes", domain: "clinical", key: "CLIN-HYPERKALEMIA" },
    { id: "CatD-07", query: "NIST SP 800-37 Rev 2 Prepare Categorize Select Implement Assess Authorize Monitor", domain: "rmf", key: "NIST-800-37-RMF-STEPS" },
    { id: "CatD-08", query: "FedRAMP baselines Low Moderate High POA&M SLA 30 days 90 days", domain: "rmf", key: "FEDRAMP-BASELINES-LMH" },
    { id: "CatD-09", query: "NIST SP 800-207 Zero Trust microsegmentation PEP PDP", domain: "cybersecurity", key: "NIST-800-207-ZERO-TRUST" },
    { id: "CatD-10", query: "OWASP Top 10 Broken Object Level Authorization SQL injection", domain: "cybersecurity", key: "OWASP-TOP10-2025" },
    { id: "CatD-11", query: "ISO 14971 medical device risk management ALARP FMEA", domain: "engineering", key: "ISO-14971-RISK" },
    { id: "CatD-12", query: "IEC 62304 medical device software lifecycle Class A B C", domain: "engineering", key: "IEC-62304-SOFTWARE" },
    { id: "CatD-13", query: "Shannon Hartley channel capacity bandwidth SNR bits per second", domain: "engineering", key: "ENG-SHANNON-HARTLEY" },
    { id: "CatD-14", query: "Reynolds number laminar transitional turbulent fluid dynamics", domain: "engineering", key: "ENG-REYNOLDS-FLUID" },
  ];

  for (const rq of ragQueries) {
    await check(rq.id, "D", `Hybrid RAG top-3 recall for ${rq.key}`, async () => {
      const hits = await hybridSearchNdkrs(rq.query, { domain: rq.domain, limit: 3 });
      const found = hits.find((h) => h.canonicalKey === rq.key);
      return Boolean(found && found.sha256.length === 64 && found.citationLabel.length > 2);
    });
  }

  await check("CatD-15", "D", "fetchNdkrsChatGrounding builds formatted citations & SHA-256 footer", async () => {
    const g = await fetchNdkrsChatGrounding("Henderson Hasselbalch pKa buffer pH conjugate base");
    return g.hits.some((h) => h.canonicalKey === "SCI-HENDERSON-HASSELBALCH") && g.footer.includes("SHA-256:");
  });

  // =========================================================================
  // CATEGORY E (15): Anti-Poisoning, Contradictions, File Parsers, Allowlist, Expiry
  // =========================================================================
  let poisonedReviewId = "";
  let cleanReviewId = "";

  await check("CatE-01", "E", "Untrusted ingest enters PENDING_REVIEW quarantine immediately", async () => {
    const out = await ingestKnowledgeDocument({
      domain: "clinical",
      canonicalKey: "KDIGO-2012-AKI",
      title: "Poisoned KDIGO Draft 9.9 mg/dL",
      summary: "Altered Stage 3 creatinine to 9.9 mg/dL.",
      content: "Serum creatinine threshold modified to 9.9 mg/dL across 90 days.",
      sourceUri: "https://untrusted-poison.example.invalid/bad.md",
      proposedBy: "adversary-bot",
      proposedByType: "AGENT",
    });
    poisonedReviewId = out.reviewQueueItem?.id || "";
    return out.status === "PENDING_REVIEW" && out.allowlistVerified === false;
  });

  await check("CatE-02", "E", "Contradiction detector flags numeric conflict (9.9 vs 4.0) in KDIGO draft", async () => {
    const out = await ingestKnowledgeDocument({
      domain: "clinical",
      canonicalKey: "KDIGO-2012-AKI",
      title: "Poisoned KDIGO Contradiction Re-check",
      summary: "Threshold altered to 9.9 mg/dL.",
      content: "Threshold altered to 9.9 mg/dL instead of 4.0 mg/dL.",
      sourceUri: "https://untrusted-poison.example.invalid/bad2.md",
      proposedBy: "adversary-bot-2",
    });
    if (out.reviewQueueItem?.id) {
      await decideReviewItem({ queueId: out.reviewQueueItem.id, decision: "REJECT", reviewerId: "bench-reviewer", reviewerRole: "Lead", notes: "Reject test poison" });
    }
    return out.contradictionFlags.length > 0;
  });

  await check("CatE-03", "E", "Quarantined poisoned record never appears in hybridSearchNdkrs", async () => {
    const hits = await hybridSearchNdkrs("Poisoned KDIGO Draft 9.9 mg/dL");
    return !hits.some((h) => h.title.includes("Poisoned KDIGO Draft"));
  });

  await check("CatE-04", "E", "Dual-control strictly rejects self-approval by proposer", async () => {
    if (!poisonedReviewId) return false;
    let rejectedSelf = false;
    try {
      await decideReviewItem({ queueId: poisonedReviewId, decision: "APPROVE", reviewerId: "adversary-bot", reviewerRole: "Self", notes: "Self approve attempt" });
    } catch {
      rejectedSelf = true;
    }
    return rejectedSelf;
  });

  await check("CatE-05", "E", "Human REJECT cleanly closes poisoned draft without leaking to search", async () => {
    if (!poisonedReviewId) return false;
    const dec = await decideReviewItem({ queueId: poisonedReviewId, decision: "REJECT", reviewerId: "clinical-safety-officer", reviewerRole: "Safety Officer", notes: "Rejected poisoned draft" });
    const hits = await hybridSearchNdkrs("Poisoned KDIGO Draft 9.9 mg/dL");
    return dec.status === "REJECTED" && !hits.some((h) => h.title.includes("Poisoned KDIGO Draft"));
  });

  await check("CatE-06", "E", "Clean allowlisted ingest stays PENDING_REVIEW until second-person APPROVE", async () => {
    const out = await ingestKnowledgeDocument({
      domain: "engineering",
      canonicalKey: "ADV-APPROVED-ASME-01",
      title: "ASME Pressure Vessel Benchmark Note",
      summary: "Verified ASME Boiler and Pressure Vessel Code Section VIII hydrostatic pressure ratio.",
      content: "ASME Section VIII hydrostatic test pressure factor is 1.3 times maximum allowable working pressure.",
      sourceUri: "https://www.nist.gov/asme-bpvc-reference",
      proposedBy: "engineer-author",
    });
    cleanReviewId = out.reviewQueueItem?.id || "";
    const preHits = await hybridSearchNdkrs("ASME Section VIII hydrostatic test pressure factor");
    return out.status === "PENDING_REVIEW" && out.allowlistVerified === true && !preHits.some((h) => h.canonicalKey === "ADV-APPROVED-ASME-01");
  });

  await check("CatE-07", "E", "Second-person APPROVE promotes record & makes it searchable", async () => {
    if (!cleanReviewId) return false;
    const dec = await decideReviewItem({ queueId: cleanReviewId, decision: "APPROVE", reviewerId: "chief-engineer-reviewer", reviewerRole: "Principal Engineer", notes: "Approved benchmark fixture" });
    const postHits = await hybridSearchNdkrs("ASME Section VIII hydrostatic test pressure factor");
    return dec.status === "APPROVED" && postHits.some((h) => h.canonicalKey === "ADV-APPROVED-ASME-01");
  });

  await check("CatE-08", "E", "isAllowlistedSourceUri allows official .gov & rejects arbitrary domains", () => {
    return (
      isAllowlistedSourceUri("https://csrc.nist.gov/publications/sp800-53") === true &&
      isAllowlistedSourceUri("https://kdigo.org/guidelines/aki/") === true &&
      isAllowlistedSourceUri("https://evil-spoof-site.com/kdigo.pdf") === false
    );
  });

  await check("CatE-09", "E", "extractDocumentText parses .txt / .md cleanly", () => {
    const out = extractDocumentText({
      filename: "notes.md",
      mimeType: "text/markdown",
      bytes: new TextEncoder().encode("# Clinical Guide\nSurviving Sepsis target MAP >= 65 mmHg."),
    });
    return out.format === "text" && out.text.includes("MAP >= 65 mmHg");
  });

  await check("CatE-10", "E", "extractDocumentText strips script/style tags from HTML", () => {
    const out = extractDocumentText({
      filename: "page.html",
      mimeType: "text/html",
      bytes: new TextEncoder().encode("<html><head><style>body{}</style></head><script>stealCookies()</script><body><p>HIPAA 164.312 technical safeguards.</p></body></html>"),
    });
    return out.format === "html" && out.text.includes("HIPAA 164.312") && !out.text.includes("stealCookies");
  });

  await check("CatE-11", "E", "extractDocumentText extracts structured JSON documents", () => {
    const out = extractDocumentText({
      filename: "control.json",
      mimeType: "application/json",
      bytes: new TextEncoder().encode(JSON.stringify({ control: "IA-2", mfa: true })),
    });
    return out.format === "text" && out.text.includes('"control":"IA-2"');
  });

  await check("CatE-12", "E", "extractDocumentText handles CSV tabular records", () => {
    const out = extractDocumentText({
      filename: "rules.csv",
      mimeType: "text/csv",
      bytes: new TextEncoder().encode("control,sla_days\nAC-2,1\nRA-5,30"),
    });
    return out.format === "text" && out.text.includes("RA-5,30");
  });

  await check("CatE-13", "E", "extractDocumentText extracts text streams from raw PDF", () => {
    const pdf = "%PDF-1.4\n1 0 obj << /Length 38 >> stream\nBT (NIST SP 800-53 Rev 5 AC-2 Account Management) Tj ET\nendstream\nendobj";
    const out = extractDocumentText({
      filename: "sp800-53.pdf",
      mimeType: "application/pdf",
      bytes: new TextEncoder().encode(pdf),
    });
    return out.format === "pdf" && out.text.includes("NIST SP 800-53 Rev 5 AC-2");
  });

  await check("CatE-14", "E", "extractDocumentText extracts XML text from stored DOCX ZIP archive", () => {
    const xml = '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Reynolds turbulent threshold > 4000</w:t></w:r></w:p></w:body></w:document>';
    const xmlBytes = new TextEncoder().encode(xml);
    const nameBytes = new TextEncoder().encode("word/document.xml");
    const lfh = Buffer.alloc(30);
    lfh.writeUInt32LE(0x04034b50, 0);
    lfh.writeUInt16LE(20, 4);
    lfh.writeUInt16LE(0, 8);
    lfh.writeUInt32LE(xmlBytes.length, 18);
    lfh.writeUInt32LE(xmlBytes.length, 22);
    lfh.writeUInt16LE(nameBytes.length, 26);
    const docx = Buffer.concat([lfh, nameBytes, xmlBytes]);
    const out = extractDocumentText({
      filename: "fluid.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      bytes: docx,
    });
    return out.format === "docx" && out.text.includes("Reynolds turbulent threshold > 4000");
  });

  await check("CatE-15", "E", "Temporal expiry marks expired record EXPIRED, logs gap, and excludes search", async () => {
    await ingestKnowledgeDocument({
      domain: "general",
      canonicalKey: "ADV-EXPIRED-TEMP-99",
      title: "Benchmark Expired Legacy Policy 2019",
      summary: "Superseded legacy guidance from 2019.",
      content: "Old temporary guidance expired in 2019 for token checks.",
      sourceUri: "https://csrc.nist.gov/legacy-2019-bench",
      version: "2019.0",
      expiresAt: "2019-12-31T00:00:00Z",
      proposedBy: "bench-seeder",
      preVerifiedBy: "bench-board",
    });
    const enforced = await enforceExpiredKnowledgeRecords(30);
    const hits = await hybridSearchNdkrs("Benchmark Expired Legacy Policy 2019");
    return enforced.expiredTransitioned >= 1 && !hits.some((h) => h.canonicalKey === "ADV-EXPIRED-TEMP-99");
  });

  // =========================================================================
  // CATEGORY F (10): Chat Bridge Routing, Explicit Rules & HMAC Integrity
  // =========================================================================
  await check("CatF-01", "F", "Chat Bridge handles NDKRS status + validation certificates query", async () => {
    const out = await tryHandlePlatformStatusOrLedgerQuery("Show NDKRS status, open knowledge gaps, and validation certificates");
    return Boolean(out && out.includes("NDKRS Live Platform Status") && out.includes("Verified Authoritative Sources"));
  });

  await check("CatF-02", "F", "Chat Bridge handles RMF v2.0 SQL artifact & audit ledger status query", async () => {
    const out = await tryHandlePlatformStatusOrLedgerQuery("Inspect RMF v2.0 artifacts and hash-chained audit ledger");
    return Boolean(out && out.includes("RMF v2.0 SQL Artifact Store"));
  });

  await check("CatF-03", "F", "Chat Bridge handles Universal Ingestion telemetry stream stats query", async () => {
    const out = await tryHandlePlatformStatusOrLedgerQuery("Check ingestion telemetry stream stats");
    return Boolean(out && out.includes("Universal Telemetry Ingestion Stream"));
  });

  await check("CatF-04", "F", "Chat Bridge returns null for ordinary clinical/domain prompts", async () => {
    const out = await tryHandlePlatformStatusOrLedgerQuery("What is the KDIGO Stage 3 creatinine threshold?");
    return out === null;
  });

  await check("CatF-05", "F", "Chat Bridge executes natural-language Reynolds calculation & signs cert", async () => {
    const out = await tryExecuteNdkrsDeterministicRuleFromChat(
      "Calculate Reynolds number with density 1000 velocity 2.5 diameter 0.05 viscosity 0.001",
    );
    return Boolean(out && out.includes("125000") && out.includes("TURBULENT") && out.includes("Fact-Lock Certificate"));
  });

  await check("CatF-06", "F", "Chat Bridge executes natural-language Ohm's Law calculation", async () => {
    const out = await tryExecuteNdkrsDeterministicRuleFromChat(
      "Compute Ohm's law voltage and power for 3.5 A and 12 ohms",
    );
    return Boolean(out && out.includes("42") && out.includes("147") && out.includes("SOLVED_OHMS_POWER"));
  });

  await check("CatF-07", "F", "Chat Bridge executes natural-language Ideal Gas calculation (solves P)", async () => {
    const out = await tryExecuteNdkrsDeterministicRuleFromChat(
      "Solve Ideal Gas pressure for 2 mol at 300 K in 10 L",
    );
    return Boolean(out && out.includes("SOLVED_PRESSURE_ATM") && out.includes("4.9234"));
  });

  await check("CatF-08", "F", "Chat Bridge enforces explicit CLIN-ANION-GAP missing chloride refusal", async () => {
    const out = await tryExecuteNdkrsDeterministicRuleFromChat(
      "Evaluate CLIN-ANION-GAP sodium 140 chloride null bicarbonate 14",
      { explicitRuleIdOnly: true },
    );
    return Boolean(out && out.includes("CANNOT_CALCULATE_CHLORIDE_MISSING"));
  });

  let mintedCert: Awaited<ReturnType<typeof validateCrossDomainFactLock>>["certificate"] | null = null;
  await check("CatF-09", "F", "Cross-Domain Fact-Lock mints valid HMAC-SHA256 certificate", async () => {
    const fl = await validateCrossDomainFactLock({
      domain: "science",
      requestId: "BENCH-CERT-09",
      rawPrompt: "Henderson Hasselbalch pKa 4.76",
      candidateText: "Buffer pH: 5.061. IUPAC Analytical Nomenclature",
      lockedClaims: [{ label: "Buffer pH", expectedValue: 5.061, tolerance: 0.05, mustAppear: true }],
      verifiedCitations: ["IUPAC Analytical Nomenclature"],
      persist: true,
    });
    mintedCert = fl.certificate;
    return fl.passed && Boolean(mintedCert && verifyCertificateSignature(mintedCert));
  });

  await check("CatF-10", "F", "Certificate HMAC signature fails immediately if outputHash is tampered", () => {
    if (!mintedCert) return false;
    const tampered = { ...mintedCert, outputHash: "0".repeat(64) };
    return verifyCertificateSignature(tampered) === false;
  });

  // =========================================================================
  // Summary Report & Strict Exit Code
  // =========================================================================
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed);
  const byCategory: Record<string, { passed: number; total: number }> = {};
  for (const r of results) {
    byCategory[r.category] ||= { passed: 0, total: 0 };
    byCategory[r.category].total += 1;
    if (r.passed) byCategory[r.category].passed += 1;
  }

  console.log(
    JSON.stringify(
      {
        benchmark: "NDKRS 100-Case Adversarial & Deterministic Production Benchmark",
        total,
        passed,
        failedCount: failed.length,
        byCategory,
        failures: failed,
      },
      null,
      2,
    ),
  );

  if (total !== 100 || passed !== 100 || failed.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[run-ndkrs-adversarial-benchmark] Fatal error:", err);
  process.exit(1);
});
