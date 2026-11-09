import React, { useState, useEffect, useRef } from "react";
import {
  Activity,
  Heart,
  Droplet,
  Thermometer,
  Wind,
  AlertTriangle,
  Bluetooth,
  RefreshCw,
  Volume2,
  Square,
  Sparkles,
  Send,
  Zap,
  Radio,
  Sliders,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type BedsideVitalsTelemetry,
  type BleDeviceStatus,
  TELEMETRY_CLINICAL_PRESETS,
  evaluateTelemetryAlarms,
  generateWaveformFrame,
  formatTelemetrySpokenAlert,
  BLE_SERVICES,
  BLE_CHARACTERISTICS,
  parseGattHeartRate,
  parseGattBloodPressure,
  parseGattPulseOximeter,
  parseGattGlucose,
} from "@/lib/noctis-device-telemetry";
import { speakNoctisVoice, stopCurrentVoicePlayback } from "@/lib/noctis-voice";

interface NoctisBedsideTelemetrySectionProps {
  onSendToChat?: (text: string) => void;
  onInjectVitalsToCase?: (vitals: {
    bloodPressure: string;
    heartRateBpm: number;
    respiratoryRatePerMin: number;
    temperatureCelsius: number;
    spo2Percent: number;
    bloodGlucoseMgDl: number;
  }) => void;
}

export function NoctisBedsideTelemetrySection({
  onSendToChat,
  onInjectVitalsToCase,
}: NoctisBedsideTelemetrySectionProps) {
  const [activePresetKey, setActivePresetKey] = useState<keyof typeof TELEMETRY_CLINICAL_PRESETS>("DKA_CRISIS");
  const [telemetry, setTelemetry] = useState<BedsideVitalsTelemetry>(TELEMETRY_CLINICAL_PRESETS.DKA_CRISIS);
  const [isReadingVoice, setIsReadingVoice] = useState(false);
  const [isBleScanning, setIsBleScanning] = useState(false);
  const [connectedDevices, setConnectedDevices] = useState<BleDeviceStatus[]>([
    {
      deviceId: "ble-spo2-901",
      name: "Nonin Onyx II 9560 BLE",
      profile: "PULSE_OXIMETER",
      connected: true,
      batteryPercent: 88,
    },
    {
      deviceId: "ble-nibp-404",
      name: "Omron HEM-907XL BLE",
      profile: "BLOOD_PRESSURE",
      connected: true,
      batteryPercent: 74,
    },
    {
      deviceId: "ble-glu-720",
      name: "Contour Next ONE Glucometer",
      profile: "GLUCOMETER",
      connected: true,
      batteryPercent: 92,
    },
  ]);
  const [injectedNotification, setInjectedNotification] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);

  // Sync alarms on telemetry change
  useEffect(() => {
    const alarms = evaluateTelemetryAlarms(telemetry);
    setTelemetry((prev) => ({ ...prev, activeAlarms: alarms }));
  }, [
    telemetry.heartRateBpm,
    telemetry.systolicMmHg,
    telemetry.diastolicMmHg,
    telemetry.spo2Percent,
    telemetry.respiratoryRatePerMin,
    telemetry.bloodGlucoseMgDl,
  ]);

  // Real-time Canvas Waveform Animation (Lead II ECG & Pleth)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let running = true;
    const width = canvas.width;
    const height = canvas.height;

    // Buffer of waveform points
    const ecgHistory: number[] = new Array(width).fill(0);
    const plethHistory: number[] = new Array(width).fill(0);
    let sweepX = 0;

    const render = () => {
      if (!running) return;

      phaseRef.current += 0.016; // ~60fps
      const ecgVal = generateWaveformFrame(phaseRef.current, "ECG", telemetry.heartRateBpm);
      const plethVal = generateWaveformFrame(phaseRef.current, "PLETH", telemetry.heartRateBpm);

      ecgHistory[sweepX] = ecgVal;
      plethHistory[sweepX] = plethVal;

      // Dark ICU CRT Monitor Background
      ctx.fillStyle = "#05080c";
      ctx.fillRect(0, 0, width, height);

      // Grid lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 25) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Channel 1: Lead II ECG (Green)
      const ecgMidY = height * 0.28;
      const ecgScale = height * 0.22;
      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 1.8;
      ctx.shadowColor = "#22c55e";
      ctx.shadowBlur = 4;
      ctx.beginPath();
      for (let x = 0; x < width; x++) {
        if (x === sweepX || x === sweepX + 1 || x === sweepX + 2) continue; // sweep erase bar
        const y = ecgMidY - ecgHistory[x] * ecgScale;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Channel 2: Plethysmogram (Cyan)
      const plethMidY = height * 0.72;
      const plethScale = height * 0.20;
      ctx.strokeStyle = "#06b6d4";
      ctx.lineWidth = 1.8;
      ctx.shadowColor = "#06b6d4";
      ctx.shadowBlur = 4;
      ctx.beginPath();
      for (let x = 0; x < width; x++) {
        if (x === sweepX || x === sweepX + 1 || x === sweepX + 2) continue;
        const y = plethMidY - plethHistory[x] * plethScale;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Sweep bar (erases ahead)
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(5, 8, 12, 0.9)";
      ctx.fillRect((sweepX + 3) % width, 0, 16, height);
      ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
      ctx.fillRect(sweepX, 0, 2, height);

      // Channel Labels
      ctx.fillStyle = "#22c55e";
      ctx.font = "bold 10px monospace";
      ctx.fillText(`LEAD II · HR ${telemetry.heartRateBpm} BPM · 25 mm/s`, 12, 18);

      ctx.fillStyle = "#06b6d4";
      ctx.fillText(`PLETH · SpO2 ${telemetry.spo2Percent}% · PI ${telemetry.perfusionIndexPercent || 4.2}%`, 12, height * 0.52);

      sweepX = (sweepX + 2) % width;
      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      running = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [telemetry.heartRateBpm, telemetry.spo2Percent, telemetry.perfusionIndexPercent]);

  // Handle Preset Switching
  const handleSelectPreset = (key: keyof typeof TELEMETRY_CLINICAL_PRESETS) => {
    setActivePresetKey(key);
    const p = TELEMETRY_CLINICAL_PRESETS[key];
    setTelemetry({ ...p, timestamp: Date.now() });
  };

  // Zero-Truncation Voice Enunciation
  const handleToggleReadTelemetry = async () => {
    if (isReadingVoice) {
      stopCurrentVoicePlayback();
      setIsReadingVoice(false);
      return;
    }

    setIsReadingVoice(true);
    const textToSpeak = formatTelemetrySpokenAlert(telemetry);
    const ok = await speakNoctisVoice(textToSpeak, "alloy", {
      onStart: () => setIsReadingVoice(true),
      onEnd: () => setIsReadingVoice(false),
    });
    if (!ok) {
      setIsReadingVoice(false);
    }
  };

  // Web Bluetooth Device Request
  const handleConnectBleDevice = async () => {
    if (typeof navigator === "undefined" || !("bluetooth" in navigator)) {
      alert("Web Bluetooth API is not supported in this browser. Running high-fidelity IoMT clinical simulator.");
      return;
    }

    setIsBleScanning(true);
    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [
          { services: [BLE_SERVICES.HEART_RATE] },
          { services: [BLE_SERVICES.BLOOD_PRESSURE] },
          { services: [BLE_SERVICES.PULSE_OXIMETER] },
          { services: [BLE_SERVICES.GLUCOSE] },
        ],
        optionalServices: [BLE_SERVICES.HEALTH_THERMOMETER],
      });

      if (device) {
        setConnectedDevices((prev) => [
          ...prev,
          {
            deviceId: device.id,
            name: device.name || "Bluetooth Medical Peripheral",
            profile: "MULTI_PARAMETER",
            connected: true,
            batteryPercent: 95,
          },
        ]);
      }
    } catch {
      // User cancelled or pairing failed
    } finally {
      setIsBleScanning(false);
    }
  };

  // Inject Telemetry into Active Case
  const handleInjectTelemetry = () => {
    if (onInjectVitalsToCase) {
      onInjectVitalsToCase({
        bloodPressure: `${telemetry.systolicMmHg}/${telemetry.diastolicMmHg}`,
        heartRateBpm: telemetry.heartRateBpm,
        respiratoryRatePerMin: telemetry.respiratoryRatePerMin,
        temperatureCelsius: telemetry.temperatureCelsius,
        spo2Percent: telemetry.spo2Percent,
        bloodGlucoseMgDl: telemetry.bloodGlucoseMgDl,
      });
      setInjectedNotification("Vitals injected into Section 1 Structured Reference Table!");
      setTimeout(() => setInjectedNotification(null), 3500);
    }
  };

  // Send to Chat
  const handleSendToChat = () => {
    if (onSendToChat) {
      const summary = `[BEDSIDE IoMT TELEMETRY STREAM]
BP: ${telemetry.systolicMmHg}/${telemetry.diastolicMmHg} mmHg (MAP ${telemetry.meanArterialPressureMmHg} mmHg)
HR: ${telemetry.heartRateBpm} bpm
SpO2: ${telemetry.spo2Percent}%
RR: ${telemetry.respiratoryRatePerMin} /min
Temp: ${telemetry.temperatureCelsius} °C
Glucose: ${telemetry.bloodGlucoseMgDl} mg/dL
Active Alarms: ${telemetry.activeAlarms.length > 0 ? telemetry.activeAlarms.map((a) => `${a.message} [${a.suggestedAction}]`).join("; ") : "None. Guideline stable."}`;
      onSendToChat(summary);
    }
  };

  return (
    <div className="rounded-xl border border-cyan-500/30 bg-[#060a10] p-4 text-xs space-y-4 shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-cyan-500/20 p-2 border border-cyan-500/40 text-cyan-300">
            <Radio className="size-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white/95">
                Bedside Medical Device Telemetry & Web Bluetooth IoMT Engine
              </h3>
              <span className="rounded bg-cyan-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-cyan-300 border border-cyan-500/30">
                GATT-IoMT-008
              </span>
            </div>
            <p className="text-[11px] text-white/50">
              Real-time Bluetooth SIG medical profile ingestion (0x180D HR, 0x1810 BP, 0x1822 SpO2, 0x1808 Glucose).
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleConnectBleDevice}
            disabled={isBleScanning}
            className="inline-flex items-center gap-1.5 rounded-md bg-cyan-600/20 hover:bg-cyan-600/30 px-2.5 py-1 text-[11px] font-semibold text-cyan-200 border border-cyan-500/30 transition shadow-sm"
            title="Scan for physical Bluetooth SIG medical peripherals"
          >
            <Bluetooth className={cn("size-3.5", isBleScanning && "animate-spin text-cyan-400")} />
            {isBleScanning ? "Scanning..." : "Pair BLE Peripheral"}
          </button>
          <button
            type="button"
            onClick={handleToggleReadTelemetry}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition border shadow-sm",
              isReadingVoice
                ? "bg-amber-500/25 text-amber-300 border-amber-500/50 ring-1 ring-amber-500/50"
                : "bg-white/5 hover:bg-white/10 text-white/80 border-white/10"
            )}
            title="Read live bedside telemetry aloud with zero truncation"
          >
            {isReadingVoice ? (
              <>
                <Square className="size-3.5 fill-current text-amber-300" /> Stop Audio
              </>
            ) : (
              <>
                <Volume2 className="size-3.5 text-amber-300" /> Read Vitals Aloud
              </>
            )}
          </button>
        </div>
      </div>

      {/* Clinical Scenario Selector */}
      <div className="space-y-1.5">
        <div className="text-[10px] uppercase font-bold text-white/40 tracking-wider">
          Calibrated Clinical Simulation Scenarios
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
          {(
            [
              ["DKA_CRISIS", "Severe DKA Crisis (Image 1/2)"],
              ["ACUTE_STROKE", "Acute Stroke (LVO / HTN)"],
              ["SEPTIC_SHOCK", "Septic Shock (Hypotensive)"],
              ["STEMI_ARREST", "STEMI / Tachyarrhythmia"],
              ["STABLE_BASELINE", "Stable Baseline Telemetry"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleSelectPreset(key)}
              className={cn(
                "rounded-lg p-2 text-left transition border text-[11px] font-medium leading-tight",
                activePresetKey === key
                  ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-200 ring-1 ring-cyan-500/30"
                  : "bg-white/[0.02] border-white/5 text-white/70 hover:bg-white/[0.05]"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Live Waveform CRT Monitor & Real-Time Numerics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Canvas Display */}
        <div className="lg:col-span-2 rounded-xl border border-cyan-500/30 bg-[#05080c] p-2 relative overflow-hidden shadow-inner">
          <canvas
            ref={canvasRef}
            width={640}
            height={220}
            className="w-full h-[220px] rounded block"
          />
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <span className="flex items-center gap-1 rounded bg-black/60 px-2 py-0.5 font-mono text-[10px] text-emerald-400 border border-emerald-500/30">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" /> SWEEP 25mm/s
            </span>
          </div>
        </div>

        {/* Digital Numerics HUD */}
        <div className="grid grid-cols-2 gap-2">
          {/* Heart Rate */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-2.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] text-emerald-400 font-semibold">
              <span className="flex items-center gap-1">
                <Heart className="size-3.5 fill-emerald-400 text-emerald-400 animate-pulse" /> HR (ECG)
              </span>
              <span className="text-[10px] text-emerald-400/60 font-mono">bpm</span>
            </div>
            <div className="font-mono text-3xl font-extrabold text-emerald-300">
              {telemetry.heartRateBpm}
            </div>
            <div className="text-[10px] text-emerald-400/70 font-mono">Lead II Telemetry</div>
          </div>

          {/* Blood Pressure */}
          <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-2.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] text-rose-400 font-semibold">
              <span className="flex items-center gap-1">
                <Activity className="size-3.5 text-rose-400" /> NIBP
              </span>
              <span className="text-[10px] text-rose-400/60 font-mono">mmHg</span>
            </div>
            <div className="font-mono text-2xl font-extrabold text-rose-300">
              {telemetry.systolicMmHg}/{telemetry.diastolicMmHg}
            </div>
            <div className="text-[10px] text-rose-400/70 font-mono">MAP: {telemetry.meanArterialPressureMmHg} mmHg</div>
          </div>

          {/* SpO2 */}
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-2.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] text-cyan-400 font-semibold">
              <span className="flex items-center gap-1">
                <Droplet className="size-3.5 text-cyan-400" /> SpO2
              </span>
              <span className="text-[10px] text-cyan-400/60 font-mono">%</span>
            </div>
            <div className="font-mono text-3xl font-extrabold text-cyan-300">
              {telemetry.spo2Percent}
            </div>
            <div className="text-[10px] text-cyan-400/70 font-mono">PI: {telemetry.perfusionIndexPercent}%</div>
          </div>

          {/* Blood Glucose */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-2.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] text-amber-400 font-semibold">
              <span className="flex items-center gap-1">
                <Droplet className="size-3.5 fill-amber-400 text-amber-400" /> Glucose
              </span>
              <span className="text-[10px] text-amber-400/60 font-mono">mg/dL</span>
            </div>
            <div className="font-mono text-3xl font-extrabold text-amber-300">
              {telemetry.bloodGlucoseMgDl}
            </div>
            <div className="text-[10px] text-amber-400/70 font-mono">
              {(telemetry.bloodGlucoseMgDl / 18.0182).toFixed(1)} mmol/L
            </div>
          </div>
        </div>
      </div>

      {/* Alarms and Invariants Banner */}
      {telemetry.activeAlarms.length > 0 && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/20 p-3 space-y-2 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-500/30 uppercase">
              <AlertTriangle className="size-3 text-rose-400" /> TELEMETRY SAFETY INVARIANT ALARM
            </span>
            <span className="text-[11px] text-rose-300/80 font-mono">
              {telemetry.activeAlarms.length} active alarm(s) detected
            </span>
          </div>

          <div className="space-y-1.5 font-sans">
            {telemetry.activeAlarms.map((a, i) => (
              <div key={i} className="rounded bg-black/40 border border-rose-500/20 p-2 text-xs flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="font-semibold text-rose-200">{a.message}</div>
                  <div className="text-white/60 text-[11px]">
                    <strong className="text-amber-400">Action:</strong> {a.suggestedAction}
                  </div>
                </div>
                {a.trippedInvariant && (
                  <span className="shrink-0 rounded bg-rose-600/30 px-2 py-0.5 font-mono text-[10px] font-bold text-rose-300 border border-rose-500/40">
                    {a.trippedInvariant}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connected Peripherals Strip & Injection Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase font-bold text-white/40 mr-1">Active BLE Hub:</span>
          {connectedDevices.map((d) => (
            <span
              key={d.deviceId}
              className="inline-flex items-center gap-1 rounded bg-cyan-950/30 border border-cyan-500/20 px-2 py-0.5 font-mono text-[10px] text-cyan-300"
            >
              <Bluetooth className="size-2.5 text-cyan-400" /> {d.name} ({d.batteryPercent}%)
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {injectedNotification && (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
              <CheckCircle2 className="size-3.5" /> {injectedNotification}
            </span>
          )}
          <button
            type="button"
            onClick={handleInjectTelemetry}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600/20 hover:bg-emerald-600/30 px-3 py-1 text-[11px] font-semibold text-emerald-300 border border-emerald-500/30 transition shadow-sm"
            title="Inject real-time telemetry straight into Section 1 Structured Reference Table"
          >
            <Zap className="size-3.5" /> Inject Telemetry to Active Case
          </button>
          <button
            type="button"
            onClick={handleSendToChat}
            className="inline-flex items-center gap-1.5 rounded-md bg-violet-600/20 hover:bg-violet-600/30 px-3 py-1 text-[11px] font-semibold text-violet-300 border border-violet-500/30 transition shadow-sm"
            title="Send live IoMT telemetry snapshot to assistant chat"
          >
            <Send className="size-3.5" /> Send to Chat
          </button>
        </div>
      </div>
    </div>
  );
}
