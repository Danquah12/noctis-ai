import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  NoctisAirgapEnforcer,
  executeAirgapClinicalEvaluation,
} from "./noctis-sovereign-airgap-engine.ts";

describe("Noctis Sovereign In-Browser Air-Gap Engine (Frontier 1)", () => {
  test("intercepts external WAN egress attempts and maintains 0 egress packets", () => {
    const enforcer = new NoctisAirgapEnforcer();
    enforcer.activateAirgap();

    // Outbound cloud API call must be blocked
    const allowedCloud = enforcer.interceptOutboundRequest(
      "https://api.anthropic.com/v1/messages",
      "HTTPS",
      2048
    );
    assert.strictEqual(allowedCloud, false);

    // Outbound analytics beacon must be blocked
    const allowedBeacon = enforcer.interceptOutboundRequest(
      "https://analytics.google.com/g/collect",
      "BEACON",
      512
    );
    assert.strictEqual(allowedBeacon, false);

    // In-memory blob is permitted
    const allowedBlob = enforcer.interceptOutboundRequest("blob:http://localhost/worker-uuid", "HTTP", 128);
    assert.strictEqual(allowedBlob, true);

    const status = enforcer.getStatus();
    assert.strictEqual(status.active, true);
    assert.strictEqual(status.interceptedCount, 3);
    assert.strictEqual(status.egressPackets, 0);
  });

  test("generates SHA-256 cryptographic provenance seal for offline execution", () => {
    const enforcer = new NoctisAirgapEnforcer();
    enforcer.activateAirgap();

    const seal = enforcer.generateIntegritySeal(
      "ENC-OFFLINE-001",
      "Targeted Temperature Management",
      "Rebound Hyperthermia Veto Tripped"
    );

    assert.ok(seal.sealId.startsWith("SEAL-AIRGAP-"));
    assert.strictEqual(seal.zeroEgressVerified, true);
    assert.strictEqual(seal.sha256BundleDigest.length, 64);
    assert.ok(seal.provenanceStatement.includes("Zero bytes of Protected Health Information"));
  });

  test("executes end-to-end air-gapped clinical CDS evaluation with audit log trail", () => {
    const result = executeAirgapClinicalEvaluation(
      "ENC-AIRGAP-99",
      27,
      "Targeted Temperature Management",
      { coreTempC: 38.8, hoursPostRosc: 18 },
      [
        {
          code: "CF-TTM-001",
          tripped: true,
          directive: "Active cooling clamp to <= 37.0 C mandated.",
        },
      ]
    );

    assert.strictEqual(result.isAirgapped, true);
    assert.strictEqual(result.egressPacketsSent, 0);
    assert.strictEqual(result.totalTrippedInvariants, 1);
    assert.ok(result.trippedInvariantCodes.includes("CF-TTM-001"));
    assert.strictEqual(result.auditTrail.length, 2);
    assert.strictEqual(result.auditTrail[0].actionTaken, "BLOCKED_AIRGAP_ENFORCED");
  });
});
