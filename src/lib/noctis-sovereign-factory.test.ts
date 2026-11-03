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
});
