/**
 * Noctis Enterprise Intelligence — Live Chat Bridge (`POST /api/noctis`)
 *
 * Connects Noctis Chat directly to all 10 Enterprise Capabilities, 3 Immediate Priorities,
 * the 6-Panel Noctis Intelligence Command Center, Tests 046/047 Creatinine Failure & Regression
 * Investigation, 9 Government-Readiness Controls (with SBOM), and the Master Development Plan.
 *
 * Strictly preserves Clinical patient encounter handling, DoD/IC Wave 1–4 queries, RMF,
 * and NDKRS queries without hijacking existing routing.
 */

import { evaluatePolicyPack, listPolicyAsCodePacks } from "./policy-as-code-engine.ts";
import { getDefaultAuthorizationTwin, evaluateAuthorizationTwin, simulateInheritanceChange } from "./authorization-digital-twin.ts";
import { analyzeEvidencePortfolio, runContinuousControlValidation } from "./evidence-and-ccv-engine.ts";
import { queryComplianceKnowledgeGraph, assessMissionRiskIntelligence } from "./graph-and-mission-risk.ts";
import { listGovernedAgents } from "./ai-agent-governance.ts";
import { routeSecureModelRequest } from "./secure-model-gateway.ts";
import { verifyCustodyEventsList } from "./evidence-chain-of-custody.ts";
import { listCustodyEvents } from "./persistence.server.ts";
import { verifySubstantiveOutput } from "./independent-verification-engine.ts";
import { runAiEvaluationLabSuite, investigateEvaluationCase } from "./ai-evaluation-lab.ts";
import { getGovernmentReadinessAssessment } from "./government-readiness.ts";
import { getMasterDevelopmentPlan } from "./master-plan-audit.ts";
import { buildEnterpriseCommandCenterSnapshot } from "./api-handler.server.ts";

const ENTERPRISE_PATTERNS = {
  commandCenter:
    /\b(?:noctis\s+intelligence\s+command\s+center|enterprise\s+command\s+center|6-?panel\s+command\s+center|enterprise\s+(?:health|dashboard|status)|database\s+health\s+and\s+(?:safety|ai\s+model))\b/i,
  test046047:
    /\b(?:tests?\s*0?46(?:\s*(?:and|&|,|\/)\s*0?47)?|tests?\s*0?47|crit-?0?46|crit-?0?47|investigate\s+(?:the\s+)?creatinine\s+extraction)\b/i,
  evalLab:
    /\b(?:ai\s+evaluation\s+lab(?:oratory)?|eval\s+lab|run\s+enterprise\s+eval(?:uation)?s?)\b/i,
  policyAsCode: /\bpolicy[- ]as[- ]code\b/i,
  digitalTwin: /\b(?:authorization\s+digital\s+twin|accreditation\s+digital\s+twin|simulate\s+(?:csp\s+)?inheritance\s+change)\b/i,
  evidenceIntel: /\bnoctis\s+evidence\s+intelligence\b|\bevidence\s+intelligence\s+coverage\b/i,
  ccv: /\b(?:continuous\s+control\s+validation|paper\s+compliance\s+drift)\b/i,
  knowledgeGraph: /\b(?:compliance\s+knowledge\s+graph|policy-to-mission\s+graph|enterprise\s+knowledge\s+graph)\b/i,
  missionRisk: /\b(?:noctis\s+mission\s+risk\s+intelligence|translate\s+vulnerabilities\s+(?:and\s+control\s+failures\s+)?into\s+(?:operational\s+and\s+)?mission\s+impact)\b/i,
  agentGov: /\b(?:noctis\s+ai\s+agent\s+governance|controlled\s+autonomous\s+agent\s+platform|autonomous\s+agent\s+permissions?)\b/i,
  modelGateway: /\b(?:noctis\s+secure\s+model\s+gateway|secure\s+model\s+gateway)\b/i,
  custody: /\b(?:digital\s+evidence\s+chain\s+of\s+custody|custody\s+hash\s+chain|evidence\s+chain\s+of\s+custody)\b/i,
  independentVerif: /\b(?:independent\s+verification\s+engine|high-risk\s+answers\s+fail\s+closed)\b/i,
  govReadiness: /\b(?:government[- ]readiness(?:\s+requirements?)?|cyclonedx\s+sbom|noctis\s+sbom)\b/i,
  masterPlan: /\b(?:master\s+development\s+plan|evidence-?based\s+gap\s+analysis|enterprise\s+roadmap)\b/i,
};

function looksLikeRawPatientEncounter(q: string): boolean {
  const hasExplicitTestLookup = ENTERPRISE_PATTERNS.test046047.test(q);
  if (hasExplicitTestLookup) return false;
  return (
    /^\s*(?:patient\s+[ab]|\d{1,3}-year-old\s+(?:male|female))/i.test(q) ||
    /\b(?:bp\s+\d{2,3}\/\d{2,3}\s*mmhg|chief\s+complaint|present(?:s|ed)\s+(?:with|to\s+the\s+ed)|serum\s+lipase\s+of)\b/i.test(q)
  );
}

export function isEnterpriseChatQuery(question: string): boolean {
  const q = (question || "").trim();
  if (!q || looksLikeRawPatientEncounter(q)) return false;
  return Object.values(ENTERPRISE_PATTERNS).some((re) => re.test(q));
}

export async function tryHandleEnterpriseChatQuery(question: string): Promise<string | null> {
  const q = (question || "").trim();
  if (!isEnterpriseChatQuery(q)) return null;

  const sections: string[] = [];

  // 1. Live Tests 046 & 047 Failure & Regression Investigation
  if (ENTERPRISE_PATTERNS.test046047.test(q)) {
    const wants46 = /46/.test(q);
    const wants47 = /47/.test(q);
    const targets = wants46 && wants47 ? ["CRIT-046", "CRIT-047"] : wants47 ? ["CRIT-047"] : wants46 ? ["CRIT-046"] : ["CRIT-046", "CRIT-047"];
    for (const id of targets) {
      const inv = await investigateEvaluationCase(id);
      if (inv.found) sections.push(inv.investigativeReportMarkdown);
    }
  }

  // 2. 6-Panel Noctis Intelligence Command Center Live Snapshot
  if (ENTERPRISE_PATTERNS.commandCenter.test(q)) {
    const snap = await buildEnterpriseCommandCenterSnapshot({
      actorId: "noctis-chat",
      tenantId: "tenant:public-sandbox",
      rbacRole: "ISSM_HUMAN",
      authMethod: "CHAT_SESSION",
    });
    sections.push(
      [
        "# Noctis Intelligence Command Center — Live 6-Panel Telemetry",
        `- **Generated:** \`${snap.generatedAt}\` · **Backend:** \`${snap.databaseHealth.dbSource}\` · **Schema 0018:** \`READY\``,
        "",
        "| Command Center Panel | Live Observed State & Key Metrics |",
        "| :--- | :--- |",
        `| **1. Database Health** | Backend: \`${snap.databaseHealth.dbSource}\` · Verified Sources: **${snap.databaseHealth.verifiedSourcesCount}** · Verified Records: **${snap.databaseHealth.verifiedRecordsCount}** · Chunks: **${snap.databaseHealth.vectorChunksCount}** · Model: \`${snap.databaseHealth.embeddingModel}\` |`,
        `| **2. AI Model Performance** | Eval Suite: \`${snap.aiModelPerformance.suiteName}\` · Accuracy: **${snap.aiModelPerformance.accuracyPct}%** (**${snap.aiModelPerformance.passedCases}/${snap.aiModelPerformance.totalCases}** PASS) · Avg Latency: \`${snap.aiModelPerformance.avgLatencyMs}ms\` · CRIT-046: **${snap.aiModelPerformance.crit046Status}** · CRIT-047: **${snap.aiModelPerformance.crit047Status}** |`,
        `| **3. Safety Validation** | Checked: **${snap.safetyValidation.totalChecked}** · Passed: **${snap.safetyValidation.passedCount}** · Repaired: **${snap.safetyValidation.repairedCount}** · Fail-Closed Blocked: **${snap.safetyValidation.blockedCount}** · Failed: **${snap.safetyValidation.failedCount}** |`,
        `| **4. Knowledge Coverage** | NDKRS Domains Active: **${snap.knowledgeCoverage.ndkrsDomainsCovered}/7** · Open Gaps: **${snap.knowledgeCoverage.openKnowledgeGaps}** · DoD/IC Directives: **${snap.knowledgeCoverage.dodIcPoliciesCount}** · DISA CCIs: **${snap.knowledgeCoverage.disaCciCount.toLocaleString()}** · STIG Rules: **${snap.knowledgeCoverage.indexedStigRulesCount}** |`,
        `| **5. Agent Activity** | Governed Agents: **${snap.agentActivity.governedAgentsCount}** · Pending Human Auth: **${snap.agentActivity.pendingProposalsCount}** · Hash-Chained Events: **${snap.agentActivity.totalActivityEvents}** (Chain Intact: **${snap.agentActivity.activityChainIntact}**) |`,
        `| **6. Security Operations** | Gate 0 Fail-Closed: **${snap.securityOperations.gate0FailClosedActive}** · Custody Artifacts: **${snap.securityOperations.custodyArtifactsTracked}** (${snap.securityOperations.custodyEventsCount} events) · Gov Readiness: **${snap.securityOperations.govReadinessControlsImplemented}/${snap.securityOperations.govReadinessTotalControls}** |`,
        "",
        `> **Accreditation Boundary:** ${snap.securityOperations.accreditationNotice}`,
      ].join("\n"),
    );
  }

  // 3. AI Evaluation Laboratory Suite Run
  if (ENTERPRISE_PATTERNS.evalLab.test(q) && !ENTERPRISE_PATTERNS.test046047.test(q)) {
    const run = await runAiEvaluationLabSuite("noctis-chat");
    sections.push(
      [
        `# Noctis AI Evaluation Laboratory — Live Run \`${run.id}\``,
        `- **Pass Rate:** **${run.passedCases}/${run.totalCases}** (**${run.accuracyPct}%**) · **Duration:** ${run.durationMs}ms · **SHA-256:** \`${run.runSha256.slice(0, 16)}\``,
        "| Case ID | Category | Status | Observed Result |",
        "| :--- | :--- | :---: | :--- |",
        ...run.results.map((r) => `| \`${r.caseId}\` | \`${r.category}\` | **${r.status}** | ${r.observedSummary} |`),
      ].join("\n"),
    );
  }

  // 4. Policy-as-Code
  if (ENTERPRISE_PATTERNS.policyAsCode.test(q)) {
    const packs = listPolicyAsCodePacks();
    const demoEval = evaluatePolicyPack("DOD-IL5-CORE", {
      phishing_resistant_mfa: true,
      fips_140_enabled: true,
      open_cat1_or_overdue_kev: 0,
      scca_isolation_enforced: true,
      ai_issued_ato_claimed: false,
    });
    sections.push(
      [
        "# Capability #1 — Noctis Policy-as-Code",
        `- **Compiled Policy Bundles (${packs.length}):** ${packs.map((p) => `\`${p.packId}\` (${p.rules.length} rules)`).join(", ")}`,
        `- **Live Bundle Evaluation (\`${demoEval.packId}\`):** Verdict **${demoEval.overallVerdict}** (${demoEval.passedCount}/${demoEval.rules.length} PASS, ${demoEval.compliancePercent}%) · Hash \`${demoEval.evalSha256.slice(0, 16)}\` · \`aiCanIssueAto: false\``,
      ].join("\n"),
    );
  }

  // 5. Authorization Digital Twin
  if (ENTERPRISE_PATTERNS.digitalTwin.test(q)) {
    const twin = getDefaultAuthorizationTwin();
    const evalNow = evaluateAuthorizationTwin(twin);
    const sim = simulateInheritanceChange(twin, { providerId: "PROV-CSP-IL5", newPaStatus: "REVOKED" });
    sections.push(
      [
        `# Capability #2 — Noctis Authorization Digital Twin (\`${twin.systemId}\`)`,
        `- **Current Boundary Posture:** **${evalNow.effectivePosture}** · Inherited Controls: **${evalNow.inheritedControlCount}** · System-Specific Controls: **${evalNow.systemSpecificControlCount}** · Interconnections Evaluated: **${evalNow.interconnectionsEvaluated}** · \`aiCanIssueAto: false\``,
        `- **CSP Inheritance Revocation Simulation (\`PROV-CSP-IL5 -> REVOKED\`):** Degrades posture from **${sim.before.effectivePosture}** to **${sim.after.effectivePosture}**, impacting ${sim.affectedControls.length} controls (\`${sim.affectedControls.join(", ")}\`).`,
      ].join("\n"),
    );
  }

  // 6. Evidence Intelligence & Continuous Control Validation
  if (ENTERPRISE_PATTERNS.evidenceIntel.test(q) || ENTERPRISE_PATTERNS.ccv.test(q)) {
    const ccv = runContinuousControlValidation(
      {
        phishingResistantMfaEnforced: true,
        maxTerminationDisablementHours: 38,
        fips140KernelModeEnabled: true,
        ocspFailClosedEnabled: true,
        siemTlsForwardingActive: true,
        privilegedContainersPresent: false,
        lastBackupRestoreDrillDaysAgo: 21,
        defaultDenyNetworkPoliciesActive: true,
      },
      { "AC-2(3)": "Implemented" },
    );
    const ev = analyzeEvidencePortfolio([
      {
        evidenceId: "EV-FIPS-LIVE",
        controlId: "SC-13",
        title: "RHEL 9 Kernel FIPS Telemetry",
        origin: "SCAP/STIG Scanner",
        collectedAt: new Date().toISOString(),
        payload: { fipsEnabled: 1 },
      },
    ]);
    sections.push(
      [
        "# Capabilities #3 & #4 — Evidence Intelligence & Continuous Control Validation",
        `- **Evidence Intelligence Sample:** Verified Fresh: **${ev.verifiedFreshCount}** · Missing Controls: \`${ev.missingControls.join(", ")}\``,
        `- **Continuous Control Validation (CCV):** Effectiveness **${ccv.effectivenessScorePercent}%** · **Paper Compliance Drift Count:** **${ccv.driftDetectedCount}** (e.g., \`AC-2(3)\` SSP="Implemented" vs runtime 38h lag)`,
      ].join("\n"),
    );
  }

  // 7. Compliance Knowledge Graph & Mission Risk Intelligence
  if (ENTERPRISE_PATTERNS.knowledgeGraph.test(q) || ENTERPRISE_PATTERNS.missionRisk.test(q)) {
    const g = queryComplianceKnowledgeGraph({ tenantId: "tenant:public-sandbox", maxClassification: "CUI" });
    const mr = assessMissionRiskIntelligence({
      kevExposedCriticalAssets: 1,
      openCatIStigFindings: 2,
      failedCriticalControls: ["IA-2(1)"],
      cdsDegraded: false,
    });
    sections.push(
      [
        "# Capabilities #5 & #8 — Compliance Knowledge Graph & Mission Risk Intelligence",
        `- **Compliance Graph (\`CUI\` boundary):** **${g.nodes.length} nodes**, **${g.edges.length} edges** (${g.filteredHigherClassCount} higher-classification nodes filtered out cleanly).`,
        `- **Mission Risk Stress Test (1 KEV + 2 CAT I + IA-2(1) fail):** Readiness Score **${mr.operationalReadinessScore}/100** (**${mr.readinessPosture}**, tier \`${mr.operationalRiskTier}\`).`,
      ].join("\n"),
    );
  }

  // 8. Controlled Autonomous Agent Platform & AI Agent Governance
  if (ENTERPRISE_PATTERNS.agentGov.test(q)) {
    const agents = listGovernedAgents();
    sections.push(
      [
        "# Capability #6 & Priority #3 — Noctis Controlled Autonomous Agent Platform",
        `- **Governed Agents (${agents.length}):** ${agents.map((a) => `\`${a.agentId}\` (max \`${a.maxClassification}\`, \`canApproveConsequential=false\`, \`canIssueAto=false\`)`).join(", ")}`,
        "- **Hard Invariants:** Agents may research, draft, run sandboxed checks, and stage SHA-256 proposals (`enterprise.agent_proposals`), while self-approval, non-human approval (`AGENT`/`BOT`), direct rule mutation, and ATO issuance return HTTP **403**.",
      ].join("\n"),
    );
  }

  // 9. Secure Model Gateway
  if (ENTERPRISE_PATTERNS.modelGateway.test(q)) {
    const blocked = routeSecureModelRequest({
      prompt: "SECRET//NOFORN intel package routed to public SaaS",
      requestedTier: "COMMERCIAL_CLOUD",
    });
    const allowed = routeSecureModelRequest({
      prompt: "Summarize UNCLASSIFIED NIST SP 800-53 SC-13 guidance",
      requestedTier: "COMMERCIAL_CLOUD",
    });
    sections.push(
      [
        "# Capability #7 — Noctis Secure Model Gateway",
        `- **Unclassified Route:** \`${allowed.decision}\` (External egress permitted: **${allowed.externalCloudEgressPermitted}**)`,
        `- **Classified Boundary Probe (\`SECRET//NOFORN\` on \`COMMERCIAL_CLOUD\`):** \`${blocked.decision}\` (Recommended tier: \`${blocked.recommendedAccreditedTier}\`, External egress: **${blocked.externalCloudEgressPermitted}**)`,
      ].join("\n"),
    );
  }

  // 10. Digital Evidence Chain of Custody
  if (ENTERPRISE_PATTERNS.custody.test(q)) {
    const events = await listCustodyEvents(undefined, 15);
    const sampleId = events[0]?.artifactId;
    const verified = sampleId ? verifyCustodyEventsList(events.filter((e) => e.artifactId === sampleId).reverse()) : null;
    sections.push(
      [
        "# Capability #9 — Noctis Digital Evidence Chain of Custody (NIST SP 800-86 / FRE 901)",
        `- **Tracked Custody Ledger Events:** **${events.length}** recent event(s)`,
        verified
          ? `- **Latest Chain Verification (\`${verified.artifactId}\`):** \`chainIntact=${verified.chainIntact}\` · ${verified.reason}`
          : "- Seal any forensic/assessment payload via `/api/v2/enterprise/custody/seal` or the Command Center **Evidence & Chain of Custody** tab to generate a cryptographic hash chain.",
      ].join("\n"),
    );
  }

  // 11. Independent Verification Engine
  if (ENTERPRISE_PATTERNS.independentVerif.test(q)) {
    const v = await verifySubstantiveOutput({
      domain: "enterprise",
      rawPrompt: "Verify clean enterprise status output",
      candidateOutput: "Only a Human Authorizing Official (AO) can render an ATO decision.",
      persistTelemetry: false,
    });
    sections.push(
      [
        "# Priority #1 — Noctis Independent Verification Engine",
        `- **Gate Architecture:** Inspects Classification Boundaries (Gate 0), OWASP LLM01 injections, Clinical Encounter Contamination & Scratchpad Invariants, DoD/IC vs FedRAMP separation, and NDKRS HMAC Fact-Locks prior to presentation.`,
        `- **Live Probe Verdict:** **${v.status}** (${v.rulesChecked} gates checked in ${v.latencyMs}ms, Hash \`${v.outputSha256.slice(0, 12)}\`).`,
      ].join("\n"),
    );
  }

  // 12. 9 Government-Readiness Controls + SBOM
  if (ENTERPRISE_PATTERNS.govReadiness.test(q)) {
    const gov = getGovernmentReadinessAssessment();
    sections.push(
      [
        `# Noctis Government-Readiness Controls (${gov.implementedCount}/${gov.totalControls}) & CycloneDX SBOM`,
        "| ID | Requirement | Objective | Verified Codebase Modules |",
        "| :--- | :--- | :--- | :--- |",
        ...gov.controls.map(
          (c) => `| \`${c.id}\` | **${c.requirement}** | ${c.implementationObjective} | \`${c.verifiedModules.slice(0, 2).join("`, `")}\` |`,
        ),
        `- **CycloneDX v${gov.sbomSummary.specVersion} SBOM:** **${gov.sbomSummary.productionComponentsCount}** production npm packages · SHA-256 \`${gov.sbomSummary.sbomSha256.slice(0, 16)}\``,
        `> **Governance Notice:** ${gov.accreditationNotice}`,
      ].join("\n"),
    );
  }

  // 13. Evidence-Based Gap Analysis & Master Development Plan
  if (ENTERPRISE_PATTERNS.masterPlan.test(q)) {
    const plan = getMasterDevelopmentPlan();
    sections.push(plan.markdown);
  }

  return sections.length > 0 ? sections.join("\n\n---\n\n") : null;
}
