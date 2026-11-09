/**
 * NOCTIS HEALTH BEDSIDE MEDICAL DEVICE TELEMETRY TEST SUITE
 * Spec: NH500-IOMT-BLE-008
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  parseGattHeartRate,
  parseGattBloodPressure,
  parseGattPulseOximeter,
  parseGattGlucose,
  evaluateTelemetryAlarms,
  generateWaveformFrame,
  formatTelemetrySpokenAlert,
  TELEMETRY_CLINICAL_PRESETS,
} from "./noctis-device-telemetry.ts";
import { cleanVoiceText } from "./noctis-voice.ts";

describe("Noctis Bedside Medical Device Telemetry & IoMT Engine", () => {
  it("parses Bluetooth SIG Heart Rate Measurement (0x2A37) standard binary packet", () => {
    // 8-bit Heart Rate (Flags: 0x00, Heart Rate: 78 bpm)
    const buffer8 = new Uint8Array([0x00, 78]);
    const parsed8 = parseGattHeartRate(new DataView(buffer8.buffer));
    assert.equal(parsed8.heartRateBpm, 78);

    // 16-bit Heart Rate with RR Interval (Flags: 0x11, HR: 124 bpm, RR: 512 / 1024 s = 500 ms)
    const buffer16 = new Uint8Array([0x11, 124, 0x00, 0x00, 0x02]);
    const parsed16 = parseGattHeartRate(new DataView(buffer16.buffer));
    assert.equal(parsed16.heartRateBpm, 124);
    assert.equal(parsed16.rrIntervalsMs?.length, 1);
    assert.equal(parsed16.rrIntervalsMs?.[0], 500);
  });

  it("parses Bluetooth SIG Blood Pressure Measurement (0x2A35) standard binary packet", () => {
    // Flags: 0x04 (mmHg, pulse present), Systolic: 120, Diastolic: 80, MAP: 93, Pulse: 72
    const buffer = new Uint8Array([
      0x04,
      120, 0x00, // Systolic
      80, 0x00,  // Diastolic
      93, 0x00,  // MAP
      72, 0x00   // Pulse
    ]);
    const parsed = parseGattBloodPressure(new DataView(buffer.buffer));
    assert.equal(parsed.systolicMmHg, 120);
    assert.equal(parsed.diastolicMmHg, 80);
    assert.equal(parsed.mapMmHg, 93);
    assert.equal(parsed.pulseRateBpm, 72);
  });

  it("parses Bluetooth SIG Pulse Oximeter Continuous (0x2A5F) packet", () => {
    // SpO2: 98%, Pulse: 110 bpm
    const buffer = new Uint8Array([98, 0x00, 110, 0x00]);
    const parsed = parseGattPulseOximeter(new DataView(buffer.buffer));
    assert.equal(parsed.spo2Percent, 98);
    assert.equal(parsed.pulseRateBpm, 110);
  });

  it("parses Bluetooth SIG Glucose Measurement (0x2A18) packet", () => {
    // Glucose: 540 mg/dL
    const buffer = new Uint8Array([0x00, 0x00, 0x1c, 0x02]); // 540 in 16-bit
    const parsed = parseGattGlucose(new DataView(buffer.buffer));
    assert.equal(parsed.glucoseMgDl, 540);
    assert.equal(parsed.glucoseMmolL, 30.0);
  });

  it("accurately trips critical safety alarms for severe physiological derangements", () => {
    const dka = TELEMETRY_CLINICAL_PRESETS.DKA_CRISIS;
    const alarms = evaluateTelemetryAlarms(dka);
    assert.ok(alarms.length >= 2);
    
    // Hyperglycemic crisis with CF-DKA-001 invariant link
    const gluAlarm = alarms.find((a) => a.code === "GLU_CRITICAL_HIGH");
    assert.ok(gluAlarm);
    assert.equal(gluAlarm.trippedInvariant, "CF-DKA-001");
    assert.ok(gluAlarm.suggestedAction.includes("potassium"));

    // Shock detection in Septic Shock preset
    const shock = TELEMETRY_CLINICAL_PRESETS.SEPTIC_SHOCK;
    const shockAlarms = evaluateTelemetryAlarms(shock);
    const hemoAlarm = shockAlarms.find((a) => a.code === "HEMO_COLLAPSE");
    assert.ok(hemoAlarm);
    assert.equal(hemoAlarm.severity, "CRITICAL");
  });

  it("generates continuous mathematical physiological waveforms without NaN", () => {
    for (let phase = 0; phase < 2.0; phase += 0.05) {
      const ecg = generateWaveformFrame(phase, "ECG", 75);
      const pleth = generateWaveformFrame(phase, "PLETH", 75);
      const capno = generateWaveformFrame(phase, "CAPNO", 16);

      assert.ok(!Number.isNaN(ecg));
      assert.ok(!Number.isNaN(pleth));
      assert.ok(!Number.isNaN(capno));
    }
  });

  it("formats zero-truncation spoken audio alerts containing all units and contraindications", () => {
    const dka = TELEMETRY_CLINICAL_PRESETS.DKA_CRISIS;
    const alertRaw = formatTelemetrySpokenAlert(dka);
    const spoken = cleanVoiceText(alertRaw);

    assert.ok(spoken.includes("96 over 62 millimeters of mercury"));
    assert.ok(spoken.includes("124 beats per minute"));
    assert.ok(spoken.includes("98 percent"));
    assert.ok(spoken.includes("540 milligrams per deciliter"));
    assert.ok(spoken.includes("potassium"));
  });
});
