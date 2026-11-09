import test from "node:test";
import assert from "node:assert/strict";
import {
  auditPlcStructuredText,
  inspectModbusTcpFrame,
  calculate2LinkForwardKinematics,
  calculate2LinkInverseKinematics,
} from "./noctis-robotics-scada.ts";

test("NOCTIS INDUSTRIAL ROBOTICS & SCADA CYBER-PHYSICAL ENGINE (NRSE-ROBOT-001)", async (t) => {
  await t.test("auditPlcStructuredText detects fail-safe E-stop and interlocks", () => {
    const safePlc = `
PROGRAM SafetyController
  VAR
    E_STOP_ACTIVE : BOOL;
    DOOR_CLOSED_INTERLOCK : BOOL;
    MOTOR_RUN : BOOL;
  END_VAR

  IF E_STOP_ACTIVE AND DOOR_CLOSED_INTERLOCK THEN
    MOTOR_RUN := TRUE;
  ELSE
    MOTOR_RUN := FALSE;
  END_IF;
END_PROGRAM
    `;

    const audit = auditPlcStructuredText(safePlc);
    assert.equal(audit.validSyntax, true);
    assert.equal(audit.emergencyStopImplemented, true);
    assert.equal(audit.interlocksVerified, true);
    assert.equal(audit.safetyCategory, "CAT_4_FAIL_SAFE");
    assert.equal(audit.identifiedVulnerabilities.length, 0);
  });

  await t.test("inspectModbusTcpFrame flags unauthorized coil write attack outside maintenance", () => {
    const maliciousFrame = inspectModbusTcpFrame({
      transactionId: 1042,
      protocolId: 0,
      unitId: 1,
      functionCode: 5, // Write Single Coil
      registerOrCoilAddress: 0x0010, // Trip generator breaker
      registerCountOrValue: 0xff00,
      isMaintenanceWindowActive: false,
    });

    assert.equal(maliciousFrame.isWriteOperation, true);
    assert.equal(maliciousFrame.isAnomaly, true);
    assert.equal(maliciousFrame.severity, "CRITICAL_ATTACK");
    assert.ok(maliciousFrame.mitigationAdvice?.includes("Block unauthorized write"));
  });

  await t.test("Forward and Inverse Kinematics resolve 2-link robotic arm geometry consistently", () => {
    // Links: l1 = 2.0 m, l2 = 1.5 m
    // Joint angles: theta1 = 0.5 rad (~28.6 deg), theta2 = 0.8 rad (~45.8 deg)
    const fk = calculate2LinkForwardKinematics(2.0, 1.5, 0.5, 0.8);
    assert.ok(fk.reachable);
    assert.ok(fk.endEffectorX > 0 && fk.endEffectorY > 0);

    // Inverse kinematics should recover reachable angles for the same target
    const ik = calculate2LinkInverseKinematics(2.0, 1.5, fk.endEffectorX, fk.endEffectorY);
    assert.ok(ik.reachable);
    assert.equal(ik.theta1Rad, 0.5);
    assert.equal(ik.theta2Rad, 0.8);

    // Out of reach target: dist = 10.0 m (max reach = 3.5 m)
    const outOfReach = calculate2LinkInverseKinematics(2.0, 1.5, 8.0, 8.0);
    assert.equal(outOfReach.reachable, false);
  });
});
