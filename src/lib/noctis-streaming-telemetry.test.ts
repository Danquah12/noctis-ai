import { test } from "node:test";
import assert from "node:assert/strict";
import {
  processTelemetryPacket,
  generateResuscitationTimeline,
  calculateTelemetryMap,
} from "./noctis-streaming-telemetry.ts";

test("Noctis Streaming Telemetry accurately calculates MAP and dynamic resuscitation transitions", () => {
  // Test MAP calculation
  const map0 = calculateTelemetryMap(68, 38);
  assert.equal(map0, 48.0);

  const map60 = calculateTelemetryMap(104, 62);
  assert.equal(map60, 76.0);

  // Test full 60-minute resuscitation trajectory
  const trajectory = generateResuscitationTimeline("TEST-RESUS-001");
  assert.equal(trajectory.length, 4);

  // Minute 0: Profound collapse
  assert.equal(trajectory[0].hemodynamicState, "PROFOUND_COLLAPSE");
  assert.equal(trajectory[0].calculatedMapMmHg, 48.0);
  assert.equal(trajectory[0].kdigoAkiCurrentStage, 3); // acute 48h rise documented
  assert.equal(trajectory[0].cardiacRhythmState, "MALIGNANT_BRADYCARDIA_JUNCTIONAL");

  // Minute 60: Goal achieved
  assert.equal(trajectory[3].hemodynamicState, "EUVOLEMIC_GOAL_ACHIEVED");
  assert.equal(trajectory[3].calculatedMapMmHg, 76.0);
  assert.equal(trajectory[3].cardiacRhythmState, "NORMAL_SINUS_RHYTHM");
  assert.equal(trajectory[3].lactateClearanceRatePctPerHour !== null, true);
  assert.equal(trajectory[3].streamAttestationSeal.length, 64);
});
