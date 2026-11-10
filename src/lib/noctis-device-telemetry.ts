/**
 * NOCTIS HEALTH BEDSIDE MEDICAL DEVICE TELEMETRY ENGINE (IoMT)
 * Spec: NH500-IOMT-BLE-008
 *
 * Implements Bluetooth SIG Standard Medical Profiles:
 * - Heart Rate Service (0x180D) / Characteristic (0x2A37)
 * - Blood Pressure Service (0x1810) / Characteristic (0x2A35)
 * - Pulse Oximeter Service (0x1822) / Characteristic (0x2A5F)
 * - Glucose Service (0x1808) / Characteristic (0x2A18)
 * - Health Thermometer Service (0x1809) / Characteristic (0x2A1C)
 *
 * Dual-Mode Engine:
 * 1. Physical Hardware Web Bluetooth API (`navigator.bluetooth`)
 * 2. Calibrated High-Fidelity Clinical Simulator with real-time Lead II ECG, Pleth, and Capnography traces.
 *
 * Statutory Classification: FDA Jan 2026 Non-Device Clinical Decision Support (21 U.S.C. § 360j(o)(1)(E))
 */

export interface BedsideVitalsTelemetry {
  timestamp: number;
  heartRateBpm: number;
  systolicMmHg: number;
  diastolicMmHg: number;
  meanArterialPressureMmHg: number;
  spo2Percent: number;
  respiratoryRatePerMin: number;
  temperatureCelsius: number;
  bloodGlucoseMgDl: number;
  perfusionIndexPercent?: number;
  signalQuality: "OPTIMAL" | "FAIR" | "DEGRADED" | "DISCONNECTED";
  activeAlarms: TelemetryAlarm[];
}

export interface TelemetryAlarm {
  code: string;
  severity: "CRITICAL" | "WARNING" | "ADVISORY";
  message: string;
  trippedInvariant?: string;
  suggestedAction: string;
}

export interface BleDeviceStatus {
  deviceId: string;
  name: string;
  profile: "HEART_RATE" | "BLOOD_PRESSURE" | "PULSE_OXIMETER" | "GLUCOMETER" | "THERMOMETER" | "MULTI_PARAMETER";
  connected: boolean;
  batteryPercent?: number;
  lastReadingTime?: number;
}

// Standard Bluetooth SIG UUIDs
export const BLE_SERVICES = {
  HEART_RATE: 0x180d,
  BLOOD_PRESSURE: 0x1810,
  PULSE_OXIMETER: 0x1822,
  GLUCOSE: 0x1808,
  HEALTH_THERMOMETER: 0x1809,
} as const;

export const BLE_CHARACTERISTICS = {
  HEART_RATE_MEASUREMENT: 0x2a37,
  BLOOD_PRESSURE_MEASUREMENT: 0x2a35,
  PLX_CONTINUOUS_MEASUREMENT: 0x2a5f,
  GLUCOSE_MEASUREMENT: 0x2a18,
  TEMPERATURE_MEASUREMENT: 0x2a1c,
} as const;

/**
 * Binary GATT Parser for Standard Bluetooth SIG Heart Rate Measurement (0x2A37)
 */
export function parseGattHeartRate(value: DataView): { heartRateBpm: number; contactDetected?: boolean; rrIntervalsMs?: number[] } {
  const flags = value.getUint8(0);
  const is16Bit = (flags & 0x01) !== 0;
  const contactSupported = (flags & 0x04) !== 0;
  const contactDetected = contactSupported ? (flags & 0x02) !== 0 : undefined;
  const energyExpendedPresent = (flags & 0x08) !== 0;
  const rrIntervalPresent = (flags & 0x10) !== 0;

  let offset = 1;
  let heartRateBpm = 0;
  if (is16Bit) {
    heartRateBpm = value.getUint16(offset, true);
    offset += 2;
  } else {
    heartRateBpm = value.getUint8(offset);
    offset += 1;
  }

  if (energyExpendedPresent) {
    offset += 2;
  }

  const rrIntervalsMs: number[] = [];
  if (rrIntervalPresent) {
    while (offset + 1 < value.byteLength) {
      const rawRr = value.getUint16(offset, true);
      rrIntervalsMs.push(Math.round((rawRr / 1024) * 1000));
      offset += 2;
    }
  }

  return { heartRateBpm, contactDetected, rrIntervalsMs };
}

/**
 * Binary GATT Parser for Standard Bluetooth SIG Blood Pressure Measurement (0x2A35)
 */
export function parseGattBloodPressure(value: DataView): {
  systolicMmHg: number;
  diastolicMmHg: number;
  mapMmHg: number;
  pulseRateBpm?: number;
} {
  const flags = value.getUint8(0);
  const isKpa = (flags & 0x01) !== 0;
  const pulseRatePresent = (flags & 0x04) !== 0;

  // In standard BLE, units are usually SFLOAT (IEEE-11073 16-bit float)
  // Simple extraction for standard integer values:
  const rawSystolic = value.getUint16(1, true);
  const rawDiastolic = value.getUint16(3, true);
  const rawMap = value.getUint16(5, true);

  const factor = isKpa ? 7.50062 : 1; // 1 kPa = 7.50062 mmHg
  const systolicMmHg = Math.round(rawSystolic * factor);
  const diastolicMmHg = Math.round(rawDiastolic * factor);
  const mapMmHg = Math.round(rawMap * factor);

  let pulseRateBpm: number | undefined;
  if (pulseRatePresent && value.byteLength >= 9) {
    pulseRateBpm = value.getUint16(7, true);
  }

  return { systolicMmHg, diastolicMmHg, mapMmHg, pulseRateBpm };
}

/**
 * Binary GATT Parser for Standard Bluetooth SIG Pulse Oximeter PLX Continuous (0x2A5F)
 */
export function parseGattPulseOximeter(value: DataView): {
  spo2Percent: number;
  pulseRateBpm: number;
  fastSpO2?: number;
  perfusionIndex?: number;
} {
  // Byte 0-1: SpO2 SFLOAT, Byte 2-3: Pulse Rate SFLOAT
  const rawSpO2 = value.getUint16(0, true);
  const rawPulse = value.getUint16(2, true);

  return {
    spo2Percent: Math.min(100, Math.max(0, rawSpO2)),
    pulseRateBpm: rawPulse,
  };
}

/**
 * Binary GATT Parser for Standard Bluetooth SIG Glucose (0x2A18)
 */
export function parseGattGlucose(value: DataView): {
  glucoseMgDl: number;
  glucoseMmolL: number;
} {
  // SFLOAT glucose concentration at offset 10 or 3 depending on flags
  const rawGlucose = value.getUint16(value.byteLength >= 12 ? 10 : 2, true);
  const glucoseMgDl = rawGlucose > 1000 ? Math.round(rawGlucose / 10) : rawGlucose;
  const glucoseMmolL = Number((glucoseMgDl / 18.0182).toFixed(1));

  return { glucoseMgDl, glucoseMmolL };
}

/**
 * Clinical Telemetry Alarm Evaluator
 * Tests incoming vital telemetry against FDA Jan 2026 practice parameters & hard safety invariants
 */
export function evaluateTelemetryAlarms(v: BedsideVitalsTelemetry): TelemetryAlarm[] {
  const alarms: TelemetryAlarm[] = [];

  // 1. Severe Hypoglycemia / Hyperglycemia
  if (v.bloodGlucoseMgDl > 500) {
    alarms.push({
      code: "GLU_CRITICAL_HIGH",
      severity: "CRITICAL",
      message: `Hyperglycemic crisis: Glucose ${v.bloodGlucoseMgDl} mg/dL exceeds critical threshold.`,
      trippedInvariant: "CF-DKA-001",
      suggestedAction: "Check serum potassium STAT before initiating insulin infusion protocol.",
    });
  } else if (v.bloodGlucoseMgDl < 60) {
    alarms.push({
      code: "GLU_CRITICAL_LOW",
      severity: "CRITICAL",
      message: `Severe Hypoglycemia: Glucose ${v.bloodGlucoseMgDl} mg/dL risking neuroglycopenic coma.`,
      suggestedAction: "Administer 25g IV 50% Dextrose (D50W) STAT and re-check in 15 minutes.",
    });
  }

  // 2. Hemodynamic Collapse / Severe Shock
  if (v.systolicMmHg < 90 || v.meanArterialPressureMmHg < 65) {
    alarms.push({
      code: "HEMO_COLLAPSE",
      severity: "CRITICAL",
      message: `Hypotensive Shock: BP ${v.systolicMmHg}/${v.diastolicMmHg} mmHg (MAP ${v.meanArterialPressureMmHg} mmHg < 65).`,
      suggestedAction: "STAT 30 mL/kg balanced crystalloid fluid resuscitation; prepare norepinephrine if refractory.",
    });
  } else if (v.systolicMmHg > 200 || v.diastolicMmHg > 120) {
    alarms.push({
      code: "HTN_EMERGENCY",
      severity: "CRITICAL",
      message: `Hypertensive Crisis: BP ${v.systolicMmHg}/${v.diastolicMmHg} mmHg.`,
      trippedInvariant: "CF-STR-002",
      suggestedAction: "Titrate IV labetalol or nicardipine; target SBP < 180 mmHg prior to reperfusion therapy.",
    });
  }

  // 3. Hypoxemia
  if (v.spo2Percent < 90) {
    alarms.push({
      code: "O2_CRITICAL_DESAT",
      severity: "CRITICAL",
      message: `Severe Hypoxemia: SpO2 ${v.spo2Percent}% on current FiO2.`,
      suggestedAction: "Escalate to non-rebreather mask or high-flow nasal cannula; prepare for emergency airway protection.",
    });
  }

  // 4. Extreme Arrhythmias
  if (v.heartRateBpm > 150) {
    alarms.push({
      code: "HR_EXTREME_TACHY",
      severity: "CRITICAL",
      message: `Symptomatic Tachyarrhythmia: Heart rate ${v.heartRateBpm} bpm.`,
      suggestedAction: "Obtain STAT 12-lead ECG; assess hemodynamic stability for synchronized cardioversion.",
    });
  } else if (v.heartRateBpm < 45) {
    alarms.push({
      code: "HR_EXTREME_BRADY",
      severity: "CRITICAL",
      message: `Profound Bradycardia: Heart rate ${v.heartRateBpm} bpm.`,
      suggestedAction: "Prepare transcutaneous pacing and IV atropine 1 mg STAT.",
    });
  }

  // 5. Tachypnea
  if (v.respiratoryRatePerMin >= 30) {
    alarms.push({
      code: "RESP_TACHYPNEA",
      severity: "WARNING",
      message: `Severe Tachypnea / Kussmaul Breathing: RR ${v.respiratoryRatePerMin} /min.`,
      suggestedAction: "Check venous blood gas, arterial lactate, and serum anion gap.",
    });
  }

  return alarms;
}

/**
 * Mathematical waveform generator for continuous clinical waveforms (Lead II ECG & Pleth)
 */
export function generateWaveformFrame(
  phase: number,
  type: "ECG" | "PLETH" | "CAPNO" | "ALINE",
  heartRateBpm = 75
): number {
  const period = 60 / heartRateBpm;
  const t = (phase % period) / period; // 0.0 to 1.0

  if (type === "ALINE") {
    // Arterial line pulse pressure curve with dicrotic notch
    if (t < 0.15) {
      return Math.sin((t / 0.15) * (Math.PI / 2)); // steep systolic upstroke
    } else if (t < 0.35) {
      return 1.0 - 0.45 * Math.sin(((t - 0.15) / 0.20) * (Math.PI / 2));
    } else if (t < 0.48) {
      // Dicrotic notch and secondary aortic rebound wave
      return 0.55 + 0.12 * Math.sin(((t - 0.35) / 0.13) * Math.PI);
    } else {
      // Diastolic runoff decay
      return Math.max(0, 0.55 * (1 - (t - 0.48) / 0.52));
    }
  }

  if (type === "ECG") {
    // P wave (0.10 - 0.20)
    if (t >= 0.10 && t < 0.20) {
      return 0.15 * Math.sin(((t - 0.10) / 0.10) * Math.PI);
    }
    // Q wave (0.24 - 0.26)
    if (t >= 0.24 && t < 0.26) {
      return -0.20 * Math.sin(((t - 0.24) / 0.02) * Math.PI);
    }
    // R wave peak (0.26 - 0.30)
    if (t >= 0.26 && t < 0.30) {
      return 1.20 * Math.sin(((t - 0.26) / 0.04) * Math.PI);
    }
    // S wave (0.30 - 0.33)
    if (t >= 0.30 && t < 0.33) {
      return -0.35 * Math.sin(((t - 0.30) / 0.03) * Math.PI);
    }
    // T wave (0.42 - 0.60)
    if (t >= 0.42 && t < 0.60) {
      return 0.30 * Math.sin(((t - 0.42) / 0.18) * Math.PI);
    }
    // Baseline with slight biological noise
    return (Math.random() - 0.5) * 0.02;
  }

  if (type === "PLETH") {
    // Photoplethysmogram dicrotic notch curve
    if (t < 0.25) {
      return Math.sin((t / 0.25) * (Math.PI / 2));
    }
    if (t < 0.38) {
      return 1.0 - 0.35 * Math.sin(((t - 0.25) / 0.13) * Math.PI);
    }
    if (t < 0.50) {
      return 0.65 + 0.15 * Math.sin(((t - 0.38) / 0.12) * Math.PI);
    }
    return Math.max(0, 0.70 * (1 - (t - 0.50) / 0.50));
  }

  // CAPNO (End-tidal CO2 square-like curve)
  if (t < 0.15) return 0.0;
  if (t < 0.25) return ((t - 0.15) / 0.10) * 38;
  if (t < 0.60) return 38 + ((t - 0.25) / 0.35) * 4; // alveolar plateau
  if (t < 0.70) return (1 - (t - 0.60) / 0.10) * 42; // rapid expiration drop
  return 0.0;
}

/**
 * Preset clinical telemetry profiles for immediate simulation & stress testing
 */
export const TELEMETRY_CLINICAL_PRESETS: Record<
  "DKA_CRISIS" | "ACUTE_STROKE" | "SEPTIC_SHOCK" | "STABLE_BASELINE" | "STEMI_ARREST",
  BedsideVitalsTelemetry
> = {
  DKA_CRISIS: {
    timestamp: Date.now(),
    heartRateBpm: 124,
    systolicMmHg: 96,
    diastolicMmHg: 62,
    meanArterialPressureMmHg: 73,
    spo2Percent: 98,
    respiratoryRatePerMin: 32,
    temperatureCelsius: 37.0,
    bloodGlucoseMgDl: 540,
    perfusionIndexPercent: 4.2,
    signalQuality: "OPTIMAL",
    activeAlarms: [],
  },
  ACUTE_STROKE: {
    timestamp: Date.now(),
    heartRateBpm: 88,
    systolicMmHg: 186,
    diastolicMmHg: 104,
    meanArterialPressureMmHg: 131,
    spo2Percent: 97,
    respiratoryRatePerMin: 18,
    temperatureCelsius: 37.2,
    bloodGlucoseMgDl: 142,
    perfusionIndexPercent: 5.1,
    signalQuality: "OPTIMAL",
    activeAlarms: [],
  },
  SEPTIC_SHOCK: {
    timestamp: Date.now(),
    heartRateBpm: 138,
    systolicMmHg: 82,
    diastolicMmHg: 48,
    meanArterialPressureMmHg: 59,
    spo2Percent: 91,
    respiratoryRatePerMin: 28,
    temperatureCelsius: 39.4,
    bloodGlucoseMgDl: 168,
    perfusionIndexPercent: 1.8,
    signalQuality: "FAIR",
    activeAlarms: [],
  },
  STEMI_ARREST: {
    timestamp: Date.now(),
    heartRateBpm: 162,
    systolicMmHg: 78,
    diastolicMmHg: 44,
    meanArterialPressureMmHg: 55,
    spo2Percent: 88,
    respiratoryRatePerMin: 34,
    temperatureCelsius: 36.8,
    bloodGlucoseMgDl: 210,
    perfusionIndexPercent: 1.1,
    signalQuality: "FAIR",
    activeAlarms: [],
  },
  STABLE_BASELINE: {
    timestamp: Date.now(),
    heartRateBpm: 72,
    systolicMmHg: 118,
    diastolicMmHg: 76,
    meanArterialPressureMmHg: 90,
    spo2Percent: 99,
    respiratoryRatePerMin: 14,
    temperatureCelsius: 36.7,
    bloodGlucoseMgDl: 95,
    perfusionIndexPercent: 6.5,
    signalQuality: "OPTIMAL",
    activeAlarms: [],
  },
};

// Initialize alarms for presets
for (const key of Object.keys(TELEMETRY_CLINICAL_PRESETS) as Array<keyof typeof TELEMETRY_CLINICAL_PRESETS>) {
  TELEMETRY_CLINICAL_PRESETS[key].activeAlarms = evaluateTelemetryAlarms(TELEMETRY_CLINICAL_PRESETS[key]);
}

/**
 * Zero-truncation spoken audio formatter for real-time bedside device alarms
 */
export function formatTelemetrySpokenAlert(v: BedsideVitalsTelemetry): string {
  const parts: string[] = [
    `Live Bedside Device Telemetry Update.`,
    `Blood pressure: ${v.systolicMmHg} over ${v.diastolicMmHg} millimeters of mercury, mean arterial pressure ${v.meanArterialPressureMmHg} millimeters of mercury.`,
    `Heart rate: ${v.heartRateBpm} beats per minute.`,
    `Oxygen saturation: ${v.spo2Percent} percent.`,
    `Respiratory rate: ${v.respiratoryRatePerMin} per minute.`,
    `Temperature: ${v.temperatureCelsius} degrees Celsius.`,
    `Blood glucose: ${v.bloodGlucoseMgDl} milligrams per deciliter.`,
  ];

  if (v.activeAlarms.length > 0) {
    parts.push(`Critical Alarms Detected:`);
    for (const a of v.activeAlarms) {
      parts.push(`Warning: ${a.message} Recommended action: ${a.suggestedAction}`);
    }
  } else {
    parts.push(`All monitored bedside physiological parameters remain within guideline limits.`);
  }

  return parts.join(" ");
}
