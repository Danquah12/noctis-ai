/**
 * NOCTIS HEALTH MULTI-HOSPITAL MESH SYNC TEST SUITE
 * Spec: NH500-MESH-PGLITE-010
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  createClinicalDelta,
  reconcileClinicalDeltas,
  formatMeshTopologySpokenSummary,
  INITIAL_FEDERATION_NODES,
  type ClinicalDeltaOperation,
} from "./noctis-hospital-mesh.ts";
import { cleanVoiceText } from "./noctis-voice.ts";

describe("Noctis Multi-Hospital Sovereign Federation & Mesh Sync Engine", () => {
  it("initializes federation topology across 5 sovereign medical enclaves", () => {
    assert.equal(INITIAL_FEDERATION_NODES.length, 5);

    const mayo = INITIAL_FEDERATION_NODES.find((n) => n.nodeId === "NODE-MAYO-01");
    assert.ok(mayo);
    assert.equal(mayo.enclaveType, "TERTIARY_ACADEMIC");
    assert.equal(mayo.casesSyncedCount, 500);

    const local = INITIAL_FEDERATION_NODES.find((n) => n.nodeId === "NODE-LOCAL-00");
    assert.ok(local);
    assert.equal(local.enclaveType, "TACTICAL_AIR_GAPPED");
  });

  it("creates compliant Clinical Delta Operations with incremented Lamport clocks and Ed25519 seals", () => {
    const delta = createClinicalDelta(
      "NODE-LOCAL-00",
      "NH-EM-003",
      "CASE_PUBLISH",
      { diagnosis: "DKA", glucose: 540 },
      106
    );

    assert.equal(delta.lamportClock, 107);
    assert.equal(delta.sourceNodeId, "NODE-LOCAL-00");
    assert.equal(delta.caseId, "NH-EM-003");
    assert.ok(delta.signature.startsWith("ed25519:"));
    assert.equal(delta.payload.glucose, 540);
  });

  it("guarantees that Invariant Vetoes always triumph over conflicting edits in CRDT reconciliation", () => {
    const normalEdit: ClinicalDeltaOperation = {
      opId: "OP-01",
      lamportClock: 200, // higher clock
      sourceNodeId: "NODE-MAYO-01",
      caseId: "NH-EM-003",
      operationType: "VITALS_INGEST",
      timestampIso: new Date().toISOString(),
      payload: { insulinDose: "10 units IV STAT" },
      signature: "ed25519:test1",
    };

    const safetyVeto: ClinicalDeltaOperation = {
      opId: "OP-02",
      lamportClock: 150, // lower clock
      sourceNodeId: "NODE-LOCAL-00",
      caseId: "NH-EM-003",
      operationType: "INVARIANT_VETO_ASSERTED",
      timestampIso: new Date().toISOString(),
      payload: { failureCode: "CF-DKA-001", reason: "Potassium < 3.3 mEq/L" },
      signature: "ed25519:test2",
    };

    const winningOp = reconcileClinicalDeltas(normalEdit, safetyVeto);
    // Invariant veto must strictly win regardless of clock
    assert.equal(winningOp.opId, "OP-02");
    assert.equal(winningOp.operationType, "INVARIANT_VETO_ASSERTED");
  });

  it("formats zero-truncation spoken audio summaries for both online mesh and air-gapped states", () => {
    // 1. Online Mesh State
    const onlineSpoken = formatMeshTopologySpokenSummary(INITIAL_FEDERATION_NODES, false, 3);
    const cleanedOnline = cleanVoiceText(onlineSpoken);
    assert.ok(cleanedOnline.includes("Multi-Hospital Sovereign Federation Mesh Status"));
    assert.ok(cleanedOnline.includes("Mayo Clinic Sovereign Enclave"));
    assert.ok(cleanedOnline.includes("PGLite WebAssembly PostgreSQL"));

    // 2. Air-Gapped State
    const airgapSpoken = formatMeshTopologySpokenSummary(INITIAL_FEDERATION_NODES, true, 3);
    const cleanedAirgap = cleanVoiceText(airgapSpoken);
    assert.ok(cleanedAirgap.includes("Tactical Air-Gap Isolation Mode is currently active"));
    assert.ok(cleanedAirgap.includes("Zero protected health information packets are crossing hospital network boundaries"));
  });
});
