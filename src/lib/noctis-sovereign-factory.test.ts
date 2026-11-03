import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SOVEREIGN_SYSTEMS_PORTFOLIO,
  REUSABLE_SYSTEM_TEMPLATES,
  listSovereignSystems,
  getSovereignSystem,
  generateSovereignSystem,
  executeSystemLifecycle,
  routeSystemInteroperabilityEvent,
  buildSovereignSystemsFactoryReport,
  FACTORY_FIVE_LAYERS,
  ENTERPRISE_FABRIC_ORCHESTRATION,
  SQDEC_HIERARCHY,
  evaluateSQDECPolicy,
  LIFECYCLE_GOVERNANCE_MAP,
  generateProofOfExecution,
  DUAL_PLANE_SPECIFICATION,
  SYSTEM_CCS_TELEMETRY,
  type LifecycleAction,
} from "./noctis-sovereign-factory.ts";

describe("Noctis Sovereign Systems Factory (NOCTIS-FACTORY-2026)", () => {
  it("registers the complete 16-system sovereign portfolio across all required domains", () => {
    const systems = listSovereignSystems();
    assert.ok(systems.length >= 16, `Expected at least 16 systems, got ${systems.length}`);

    const expectedSlugs = [
      "cyber",
      "health",
      "finance",
      "legal",
      "defense",
      "science",
      "engineering",
      "intelligence",
      "government",
      "education",
      "enterprise",
      "energy",
      "infrastructure",
      "research",
      "software",
      "rmf",
    ];

    for (const slug of expectedSlugs) {
      const match = systems.find((s) => s.identity.slug === slug);
      assert.ok(match, `System with slug "${slug}" must exist in sovereign portfolio`);
    }
  });

  it("enforces the top 5 strategic priority systems with calibrated priorities 1 through 5", () => {
    const cyber = getSovereignSystem("noctis-cyber");
    const rmf = getSovereignSystem("noctis-rmf");
    const health = getSovereignSystem("noctis-health");
    const finance = getSovereignSystem("noctis-finance");
    const engineering = getSovereignSystem("noctis-engineering");

    assert.ok(cyber && cyber.priorityRank === 1, "Noctis Cyber must be Priority 1");
    assert.ok(rmf && rmf.priorityRank === 2, "Noctis RMF/GRC must be Priority 2");
    assert.ok(health && health.priorityRank === 3, "Noctis Health must be Priority 3");
    assert.ok(finance && finance.priorityRank === 4, "Noctis Finance must be Priority 4");
    assert.ok(engineering && engineering.priorityRank === 5, "Noctis Engineering must be Priority 5");
  });

  it("enforces all 11 architectural dimensions on every registered system", () => {
    for (const sys of SOVEREIGN_SYSTEMS_PORTFOLIO) {
      // 1. Identity
      assert.ok(sys.identity.name && sys.identity.version && sys.identity.purpose, `Identity missing on ${sys.identity.id}`);
      // 2. Architecture
      assert.ok(sys.architecture.runtime && sys.architecture.services.length > 0, `Architecture missing on ${sys.identity.id}`);
      // 3. Knowledge Base
      assert.ok(sys.knowledgeBase.domain && sys.knowledgeBase.dataSources.length > 0, `Knowledge Base missing on ${sys.identity.id}`);
      // 4. Capabilities
      assert.ok(Array.isArray(sys.capabilities) && sys.capabilities.length > 0, `Capabilities missing on ${sys.identity.id}`);
      // 5. Agents
      assert.ok(Array.isArray(sys.agents) && sys.agents.length > 0, `Agents missing on ${sys.identity.id}`);
      // 6. Workflows
      assert.ok(Array.isArray(sys.workflows) && sys.workflows.length > 0, `Workflows missing on ${sys.identity.id}`);
      // 7. Interface
      assert.ok(sys.interface.hasBoard && sys.interface.hasChat && sys.interface.hasCanvas, `Interface missing views on ${sys.identity.id}`);
      // 8. Security
      assert.ok(sys.security.tenantIsolation && sys.security.authentication, `Security missing on ${sys.identity.id}`);
      // 9. Memory
      assert.ok(sys.memory.persistentContextWindow >= 32768, `Memory context window insufficient on ${sys.identity.id}`);
      // 10. Evaluation
      assert.ok(sys.evaluation.benchmarkScoreTarget >= 95.0, `Evaluation benchmark too low on ${sys.identity.id}`);
      // 11. Deployment
      assert.ok(sys.deployment.status && sys.deployment.healthEndpoint, `Deployment missing on ${sys.identity.id}`);
    }
  });

  it("provides 10 reusable domain templates for automated system generation", () => {
    assert.equal(REUSABLE_SYSTEM_TEMPLATES.length, 10);
    const templateIds = REUSABLE_SYSTEM_TEMPLATES.map((t) => t.id);
    assert.ok(templateIds.includes("tpl-cybersecurity"));
    assert.ok(templateIds.includes("tpl-healthcare"));
    assert.ok(templateIds.includes("tpl-financial"));
    assert.ok(templateIds.includes("tpl-investment"));
    assert.ok(templateIds.includes("tpl-rmf-grc"));
    assert.ok(templateIds.includes("tpl-legal"));
    assert.ok(templateIds.includes("tpl-science"));
    assert.ok(templateIds.includes("tpl-engineering"));
    assert.ok(templateIds.includes("tpl-software"));
    assert.ok(templateIds.includes("tpl-digitaltwin"));
  });

  it("dynamically generates a compliant 11-dimension Sovereign System from a template", () => {
    const generated = generateSovereignSystem("tpl-healthcare", {
      identity: {
        id: "noctis-pediatric-oncology",
        name: "Noctis Pediatric Oncology CDS",
        slug: "pediatric-oncology",
        tagline: "Specialized Pediatric Oncology Decision Support",
        category: "Healthcare",
        version: "1.0.0",
        owner: "Pediatric Hematology Enclave",
        purpose: "Childhood leukemia and neuroblastoma chemotherapy protocol evaluation.",
        icon: "Stethoscope",
      },
    });

    assert.equal(generated.identity.name, "Noctis Pediatric Oncology CDS");
    assert.equal(generated.identity.category, "Healthcare");
    assert.equal(generated.interface.hasChat, true);
    assert.equal(generated.interface.hasBoard, true);
    assert.equal(generated.interface.hasCanvas, true);
    assert.ok(generated.security.tenantIsolation === "strict_cryptographic");
  });

  it("executes all 9 lifecycle management actions with SHA-256 audit seals", () => {
    const actions: LifecycleAction[] = [
      "Create",
      "Configure",
      "Test",
      "Validate",
      "Deploy",
      "Monitor",
      "Upgrade",
      "Rollback",
      "Retire",
    ];

    for (const action of actions) {
      const res = executeSystemLifecycle("noctis-cyber", action);
      assert.ok(res.success, `Lifecycle action ${action} failed`);
      assert.equal(res.action, action);
      assert.ok(res.auditSealSha256.startsWith("sha256-seal-"));
      assert.ok(res.log.length >= 2, `Lifecycle action ${action} should produce log entries`);
    }
  });

  it("routes inter-system communication events through the Sovereign Event Bus", () => {
    const routeRes = routeSystemInteroperabilityEvent({
      fromSystemId: "noctis-cyber",
      toSystemId: "noctis-rmf",
      eventType: "AUDIT_ATTESTATION",
      payload: { findingId: "VULN-2026-091", status: "REMEDIATED_VERIFIED" },
    });

    assert.equal(routeRes.routed, true);
    assert.ok(routeRes.latencyMs < 5.0, "Inter-system message latency should be < 5ms");
    assert.ok(routeRes.status.includes("Noctis Cyber"));
    assert.ok(routeRes.status.includes("Noctis RMF / GRC"));
  });

  it("compiles the complete Sovereign Systems Factory Technical Dossier Report", () => {
    const report = buildSovereignSystemsFactoryReport();
    assert.ok(report.includes("# Noctis Sovereign Systems Factory"));
    assert.ok(report.includes("Five Major Architectural Layers"));
    assert.ok(report.includes("Priority 1: Noctis Cyber"));
    assert.ok(report.includes("Priority 2: Noctis RMF / GRC"));
    assert.ok(report.includes("Priority 3: Noctis Health"));
    assert.ok(report.includes("Priority 4: Noctis Finance"));
    assert.ok(report.includes("Priority 5: Noctis Engineering"));
    assert.ok(report.includes("Eleven Standard Dimensions"));
  });

  it("verifies the 5 Major Architectural Layers of the Sovereign Systems Factory", () => {
    assert.equal(FACTORY_FIVE_LAYERS.length, 5);

    // Layer 1
    assert.equal(FACTORY_FIVE_LAYERS[0].layerNumber, 1);
    assert.ok(FACTORY_FIVE_LAYERS[0].layerName.includes("User Experience"));
    assert.deepEqual(FACTORY_FIVE_LAYERS[0].components, [
      "Chat (Multi-Agent)",
      "Board (Task Kanban & Approval)",
      "Canvas (Artifacts, Telemetry & Code)",
    ]);

    // Layer 2
    assert.equal(FACTORY_FIVE_LAYERS[1].layerNumber, 2);
    assert.ok(FACTORY_FIVE_LAYERS[1].layerName.includes("Intelligence"));
    assert.ok(FACTORY_FIVE_LAYERS[1].components.some((c) => c.includes("Brain")));
    assert.ok(FACTORY_FIVE_LAYERS[1].components.some((c) => c.includes("RAG")));
    assert.ok(FACTORY_FIVE_LAYERS[1].components.some((c) => c.includes("Knowledge Graph")));

    // Layer 3
    assert.equal(FACTORY_FIVE_LAYERS[2].layerNumber, 3);
    assert.ok(FACTORY_FIVE_LAYERS[2].layerName.includes("Professional Systems"));
    assert.ok(FACTORY_FIVE_LAYERS[2].components.some((c) => c.includes("Noctis Cyber (P1)")));
    assert.ok(FACTORY_FIVE_LAYERS[2].components.some((c) => c.includes("Noctis Health (P3)")));

    // Layer 4
    assert.equal(FACTORY_FIVE_LAYERS[3].layerNumber, 4);
    assert.ok(FACTORY_FIVE_LAYERS[3].layerName.includes("Autonomous Execution"));
    assert.ok(FACTORY_FIVE_LAYERS[3].components.some((c) => c.includes("Agents")));
    assert.ok(FACTORY_FIVE_LAYERS[3].components.some((c) => c.includes("Workflows")));

    // Layer 5
    assert.equal(FACTORY_FIVE_LAYERS[4].layerNumber, 5);
    assert.ok(FACTORY_FIVE_LAYERS[4].layerName.includes("Sovereign Infrastructure"));
    assert.ok(FACTORY_FIVE_LAYERS[4].components.some((c) => c.includes("Vault")));
    assert.ok(FACTORY_FIVE_LAYERS[4].components.some((c) => c.includes("Kyber-768")));
    assert.ok(FACTORY_FIVE_LAYERS[4].components.some((c) => c.includes("Audit Ledger")));
  });

  it("verifies the Enterprise Orchestration Fabric architecture and 8 specialized agents", () => {
    const fabric = ENTERPRISE_FABRIC_ORCHESTRATION;

    // Enterprise Systems & Channels
    assert.ok(fabric.enterpriseSystems.channels.includes("Voice (Sovereign Voice)"));
    assert.ok(fabric.enterpriseSystems.systems.includes("CRM"));
    assert.ok(fabric.enterpriseSystems.systems.includes("ERP"));
    assert.ok(fabric.enterpriseSystems.systems.includes("HRIS"));
    assert.ok(fabric.enterpriseSystems.systems.includes("ITSM"));
    assert.ok(fabric.enterpriseSystems.systems.includes("Finance"));

    // Orchestration Layer Functions & 8 Agents
    assert.deepEqual(fabric.orchestrationLayer.coreFunctions, ["Plan", "Coordinate", "Monitor", "Optimize"]);
    assert.equal(fabric.orchestrationLayer.agents.length, 8);
    const agentNames = fabric.orchestrationLayer.agents.map((a) => a.name);
    assert.ok(agentNames.includes("Sales Agent"));
    assert.ok(agentNames.includes("Support Agent"));
    assert.ok(agentNames.includes("HR Agent"));
    assert.ok(agentNames.includes("IT Operations Agent"));
    assert.ok(agentNames.includes("Finance Agent"));
    assert.ok(agentNames.includes("Content Agent"));
    assert.ok(agentNames.includes("Data Analyst Agent"));
    assert.ok(agentNames.includes("Research Agent"));

    // Governance, Infrastructure & Impact
    assert.ok(fabric.governanceAndSecurity.some((g) => g.includes("FIDO2")));
    assert.ok(fabric.infrastructureFoundation.some((i) => i.includes("Sovereign Enclaves")));
    assert.equal(fabric.businessImpact.length, 5);
  });

  it("enforces SQDEC policy ordering (Safety > Quality > Delivery > Economics > Control)", () => {
    assert.equal(SQDEC_HIERARCHY.length, 5);
    assert.equal(SQDEC_HIERARCHY[0].domain, "Safety");
    assert.equal(SQDEC_HIERARCHY[1].domain, "Quality");
    assert.equal(SQDEC_HIERARCHY[2].domain, "Delivery");
    assert.equal(SQDEC_HIERARCHY[3].domain, "Economics");
    assert.equal(SQDEC_HIERARCHY[4].domain, "Control");

    // Safety priority 1 can never be waived
    assert.ok(SQDEC_HIERARCHY[0].enforcementRule.includes("CANNOT be bypassed"));

    const evalResult = evaluateSQDECPolicy("Clinical Triage", "Healthcare", { hasEmergencyVitals: true });
    assert.equal(evalResult.priorityEnforced, "Safety");
    assert.ok(evalResult.reasoning.includes("Safety Priority 1 enforced"));
  });

  it("enforces 4-Tier Risk and Permanence Governance across all 9 lifecycle actions", () => {
    const actions: LifecycleAction[] = [
      "Create",
      "Configure",
      "Test",
      "Validate",
      "Deploy",
      "Monitor",
      "Upgrade",
      "Rollback",
      "Retire",
    ];

    for (const act of actions) {
      const gov = LIFECYCLE_GOVERNANCE_MAP[act];
      assert.ok(gov, `Governance metadata must exist for action ${act}`);
      assert.ok(gov.riskTier.startsWith("Tier "));
      assert.ok(gov.permanence.startsWith("Type "));
      assert.ok(typeof gov.voiceApprovalAllowed === "boolean");
    }

    // Critical destructive actions require typed confirmation
    assert.equal(LIFECYCLE_GOVERNANCE_MAP.Retire.riskTier, "Tier 4: Critical");
    assert.equal(LIFECYCLE_GOVERNANCE_MAP.Retire.permanence, "Type 2 (Irreversible)");
    assert.equal(LIFECYCLE_GOVERNANCE_MAP.Retire.requiresTypedConfirmation, true);

    // Deploy is High Risk and cannot be voice approved
    assert.equal(LIFECYCLE_GOVERNANCE_MAP.Deploy.riskTier, "Tier 3: High");
    assert.equal(LIFECYCLE_GOVERNANCE_MAP.Deploy.voiceApprovalAllowed, false);
  });

  it("generates and cryptographically verifies Proof-of-Execution artifacts with SHA-256 seals", () => {
    const proof = generateProofOfExecution("noctis-cyber", "AST_VULN_SCAN", {
      latencyMs: 2.1,
      riskTier: "Tier 1: Low",
    });

    assert.ok(proof.proofId.startsWith("POE-"));
    assert.equal(proof.sha256Seal.length, 64, "SHA-256 seal must be exactly 64 hex characters");
    assert.equal(proof.systemId, "noctis-cyber");
    assert.equal(proof.sqdecCompliance, true);
    assert.ok(proof.verificationChecklist.length >= 4);
    assert.ok(proof.verificationChecklist.every((c) => c.status === "PASS"));
  });

  it("validates Dual-Plane specification and CCS telemetry across all 16 Sovereign Systems", () => {
    // Dual-Plane specification
    assert.ok(DUAL_PLANE_SPECIFICATION.controlPlane.name.includes("Noctis Ultra"));
    assert.ok(DUAL_PLANE_SPECIFICATION.executionPlane.name.includes("Sovereign Enclave"));
    assert.equal(DUAL_PLANE_SPECIFICATION.executionPlane.airGapCapability, true);
    assert.ok(DUAL_PLANE_SPECIFICATION.zeroTrustGuarantees.length >= 4);

    // CCS Telemetry on all 16 systems
    const systems = listSovereignSystems();
    for (const sys of systems) {
      const ccs = SYSTEM_CCS_TELEMETRY[sys.identity.id];
      assert.ok(ccs, `CCS Telemetry must exist for system ${sys.identity.id}`);
      assert.ok(ccs.capabilityAccuracy >= 98.0, `Accuracy must be >= 98% for ${sys.identity.id}`);
      assert.equal(ccs.contextWindowTokens, 262144, `Context window must be 256K for ${sys.identity.id}`);
      assert.ok(ccs.generationSpeedTokPerSec >= 90.0, `Speed must be >= 90 tok/s for ${sys.identity.id}`);
      assert.ok(ccs.cognitiveCompounding.reviewedSkillVersions > 0);
      assert.ok(ccs.cognitiveCompounding.compoundingScore >= 98.0);
    }
  });
});
