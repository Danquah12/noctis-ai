/**
 * NOCTIS INDUSTRIAL ROBOTICS & SCADA CYBER-PHYSICAL ENGINE
 * Subsystem Code: NRSE-ROBOT-001 / SCADA-2026
 *
 * Implements:
 * 1. IEC 61131-3 PLC logic safety analyzer (Emergency Stop, Dead-Man switch, Safety Interlocks)
 * 2. Modbus TCP & DNP3 industrial protocol anomaly detection & unauthorized coil write gating
 * 3. 2-Link / Multi-Link Robotic Arm Forward and Inverse Kinematics analytical solvers
 */

export interface IecPlcSafetyAudit {
  validSyntax: boolean;
  emergencyStopImplemented: boolean;
  interlocksVerified: boolean;
  unboundedLoopsDetected: boolean;
  safetyCategory: "CAT_1" | "CAT_2" | "CAT_3" | "CAT_4_FAIL_SAFE";
  identifiedVulnerabilities: string[];
}

export interface ModbusPacketAudit {
  transactionId: number;
  unitId: number;
  functionCode: number;
  functionName: string;
  isWriteOperation: boolean;
  isAnomaly: boolean;
  severity: "INFORMATIONAL" | "SUSPICIOUS" | "CRITICAL_ATTACK";
  mitigationAdvice?: string;
}

export interface Planar2LinkKinematicsResult {
  l1: number;
  l2: number;
  theta1Rad: number;
  theta2Rad: number;
  endEffectorX: number;
  endEffectorY: number;
  reachable: boolean;
}

/**
 * Audit IEC 61131-3 Structured Text PLC Code for Critical Safety Invariants
 */
export function auditPlcStructuredText(stCode: string): IecPlcSafetyAudit {
  const code = stCode.toLowerCase();
  const vulnerabilities: string[] = [];

  const hasEstop = /e_stop|emergencystop|estop|safety_relay/i.test(code);
  if (!hasEstop) {
    vulnerabilities.push("Missing hardware/software Emergency Stop (E-Stop) disconnection loop.");
  }

  const hasInterlock = /interlock|door_closed|guard_switch|light_curtain/i.test(code);
  if (!hasInterlock) {
    vulnerabilities.push("Missing physical safety enclosure interlock or light curtain verification.");
  }

  // Detect unbounded WHILE or REPEAT loops without PLC watchdog tick
  const hasUnboundedLoop = /(?:while\s+true|while\s+1\b|repeat(?![^;]*until))/i.test(code);
  if (hasUnboundedLoop) {
    vulnerabilities.push("Unbounded loop construct detected without watchdog refresh, risking PLC scan-cycle starvation.");
  }

  const validSyntax = !/syntax\s+error/i.test(code) && code.includes("program") && code.includes("end_program");

  let safetyCategory: IecPlcSafetyAudit["safetyCategory"] = "CAT_1";
  if (hasEstop && hasInterlock && !hasUnboundedLoop) {
    safetyCategory = "CAT_4_FAIL_SAFE";
  } else if (hasEstop) {
    safetyCategory = "CAT_3";
  }

  return {
    validSyntax,
    emergencyStopImplemented: hasEstop,
    interlocksVerified: hasInterlock,
    unboundedLoopsDetected: hasUnboundedLoop,
    safetyCategory,
    identifiedVulnerabilities: vulnerabilities,
  };
}

/**
 * Inspect Modbus TCP Application Data Unit (ADU) for unauthorized control or reconnaissance
 */
export function inspectModbusTcpFrame(params: {
  transactionId: number;
  protocolId: number; // 0 for Modbus TCP
  unitId: number;
  functionCode: number;
  registerOrCoilAddress: number;
  registerCountOrValue: number;
  isMaintenanceWindowActive?: boolean;
}): ModbusPacketAudit {
  const { transactionId, protocolId, unitId, functionCode, registerOrCoilAddress, isMaintenanceWindowActive = false } = params;

  const MODBUS_FUNCTIONS: Record<number, string> = {
    1: "Read Coils",
    2: "Read Discrete Inputs",
    3: "Read Holding Registers",
    4: "Read Input Registers",
    5: "Write Single Coil",
    6: "Write Single Register",
    15: "Write Multiple Coils",
    16: "Write Multiple Registers",
    43: "Read Device Identification",
  };

  const functionName = MODBUS_FUNCTIONS[functionCode] || `Unknown Function (0x${functionCode.toString(16)})`;
  const isWrite = [5, 6, 15, 16].includes(functionCode);

  let isAnomaly = false;
  let severity: ModbusPacketAudit["severity"] = "INFORMATIONAL";
  let mitigationAdvice: string | undefined = undefined;

  if (protocolId !== 0) {
    isAnomaly = true;
    severity = "CRITICAL_ATTACK";
    mitigationAdvice = "Drop frame: Invalid Modbus Protocol Identifier (expected 0x0000).";
  } else if (isWrite && !isMaintenanceWindowActive) {
    // Unauthorized write outside maintenance window (Stuxnet/Triton pattern)
    isAnomaly = true;
    severity = "CRITICAL_ATTACK";
    mitigationAdvice = `Block unauthorized write function 0x${functionCode.toString(16)} to address ${registerOrCoilAddress}. Enforce SCADA read-only ACLs during operational mode.`;
  } else if (!MODBUS_FUNCTIONS[functionCode]) {
    isAnomaly = true;
    severity = "SUSPICIOUS";
    mitigationAdvice = "Investigate undocumented Modbus function code probing.";
  }

  return {
    transactionId,
    unitId,
    functionCode,
    functionName,
    isWriteOperation: isWrite,
    isAnomaly,
    severity,
    mitigationAdvice,
  };
}

/**
 * 2-Link Planar Robotic Arm Forward Kinematics
 */
export function calculate2LinkForwardKinematics(
  l1: number,
  l2: number,
  theta1Rad: number,
  theta2Rad: number
): Planar2LinkKinematicsResult {
  // End effector coordinates
  const x = l1 * Math.cos(theta1Rad) + l2 * Math.cos(theta1Rad + theta2Rad);
  const y = l1 * Math.sin(theta1Rad) + l2 * Math.sin(theta1Rad + theta2Rad);

  return {
    l1,
    l2,
    theta1Rad,
    theta2Rad,
    endEffectorX: Number(x.toFixed(4)),
    endEffectorY: Number(y.toFixed(4)),
    reachable: true,
  };
}

/**
 * 2-Link Planar Robotic Arm Analytical Inverse Kinematics (Elbow-Up)
 */
export function calculate2LinkInverseKinematics(
  l1: number,
  l2: number,
  targetX: number,
  targetY: number
): { theta1Rad: number; theta2Rad: number; reachable: boolean } {
  const distSq = targetX * targetX + targetY * targetY;
  const maxReach = l1 + l2;
  const minReach = Math.abs(l1 - l2);

  if (distSq > maxReach * maxReach || distSq < minReach * minReach) {
    return { theta1Rad: 0, theta2Rad: 0, reachable: false };
  }

  // Law of Cosines for elbow angle theta2
  // cos(theta2) = (x^2 + y^2 - l1^2 - l2^2) / (2 * l1 * l2)
  const cosTheta2 = (distSq - l1 * l1 - l2 * l2) / (2 * l1 * l2);
  const sinTheta2 = Math.sqrt(Math.max(0, 1.0 - cosTheta2 * cosTheta2)); // Elbow-up solution
  const theta2 = Math.atan2(sinTheta2, cosTheta2);

  // Base angle theta1
  const k1 = l1 + l2 * cosTheta2;
  const k2 = l2 * sinTheta2;
  const theta1 = Math.atan2(targetY, targetX) - Math.atan2(k2, k1);

  return {
    theta1Rad: Number(theta1.toFixed(4)),
    theta2Rad: Number(theta2.toFixed(4)),
    reachable: true,
  };
}
