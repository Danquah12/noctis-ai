import { test } from "node:test";
import assert from "node:assert/strict";
import {
  NOCTIS_16_SOVEREIGN_SUITES,
  SQDEC_GOVERNANCE_MODEL,
  DUAL_PLANE_SPECIFICATION,
  ENTERPRISE_PLUGINS_PORTFOLIO,
  isSovereignInquiry,
  resolveSovereignResponse,
  buildSovereignSystemPromptContext,
} from "./noctis-sovereign-grounding.ts";

test("Noctis Sovereign Portfolio contains 16 verified suites", () => {
  assert.equal(NOCTIS_16_SOVEREIGN_SUITES.length, 16);
  const badges = NOCTIS_16_SOVEREIGN_SUITES.map((s) => s.badge);
  assert.ok(badges.includes("SHIELD"));
  assert.ok(badges.includes("GRCP2"));
  assert.ok(badges.includes("CDSTRIAGE"));
  assert.ok(badges.includes("InvestP4"));
  assert.ok(badges.includes("EngineeringP5"));
  assert.ok(badges.includes("SoftwareBUILD"));

  // Check that every suite has an SQDEC anchor
  for (const suite of NOCTIS_16_SOVEREIGN_SUITES) {
    assert.ok(suite.sqdecPillar);
    assert.ok(suite.keyCapabilities.length >= 2);
    assert.ok(suite.keyAgents.length >= 1);
  }
});

test("SQDEC Governance hierarchy is strictly enforced", () => {
  assert.equal(SQDEC_GOVERNANCE_MODEL.hierarchy.length, 5);
  assert.equal(SQDEC_GOVERNANCE_MODEL.hierarchy[0].pillar, "Safety");
  assert.equal(SQDEC_GOVERNANCE_MODEL.hierarchy[1].pillar, "Quality");
  assert.equal(SQDEC_GOVERNANCE_MODEL.hierarchy[2].pillar, "Delivery");
  assert.equal(SQDEC_GOVERNANCE_MODEL.hierarchy[3].pillar, "Economics");
  assert.equal(SQDEC_GOVERNANCE_MODEL.hierarchy[4].pillar, "Control");
});

test("Dual-Plane architecture defines cloud and air-gapped runtimes", () => {
  assert.equal(DUAL_PLANE_SPECIFICATION.cloudControlPlane.name, "Noctis Ultra Control Plane");
  assert.ok(DUAL_PLANE_SPECIFICATION.cloudControlPlane.url.includes("dstrike.app"));
  assert.ok(DUAL_PLANE_SPECIFICATION.sovereignEnclavePlane.runtime.includes("Apple Silicon"));
  assert.ok(DUAL_PLANE_SPECIFICATION.sovereignEnclavePlane.loopback.includes("127.0.0.1"));
});

test("Sovereign inquiry detector captures core queries", () => {
  assert.ok(isSovereignInquiry("What is Noctis Sovereign Systems?"));
  assert.ok(isSovereignInquiry("Explain SQDEC governance"));
  assert.ok(isSovereignInquiry("List the 16 sovereign suites"));
  assert.ok(isSovereignInquiry("What are the 50+ plugins and systems?"));
  assert.ok(isSovereignInquiry("What is the master training schedule for Noctis?"));
  assert.ok(!isSovereignInquiry("How do I make chocolate chip cookies?"));
});

test("Authoritative sovereign responses resolve accurately", () => {
  const sqdecRes = resolveSovereignResponse("Explain SQDEC model");
  assert.ok(sqdecRes && sqdecRes.includes("SQDEC Hierarchy"));
  assert.ok(sqdecRes && sqdecRes.includes("Safety"));

  const suitesRes = resolveSovereignResponse("Show me the 16 sovereign suites");
  assert.ok(suitesRes && suitesRes.includes("Noctis Cyber (Cyber P1)"));
  assert.ok(suitesRes && suitesRes.includes("CDSTRIAGE"));

  const pluginsRes = resolveSovereignResponse("Tell me about the 50+ plugins");
  assert.ok(pluginsRes && pluginsRes.includes("50+ Enterprise Plugins"));

  const scheduleRes = resolveSovereignResponse("What is the training schedule for Noctis?");
  assert.ok(scheduleRes && scheduleRes.includes("Phase 1: Hours 0-2"));
  assert.ok(scheduleRes && scheduleRes.includes("Phase 4: Hours 12-24"));
});

test("Sovereign system prompt grounding context is generated", () => {
  const context = buildSovereignSystemPromptContext();
  assert.ok(context.includes("You are NOCTIS, the Sovereign Dual-Plane Intelligence Engine"));
  assert.ok(context.includes("SQDEC Governance Model"));
  assert.ok(context.includes("Noctis Cyber"));
});
