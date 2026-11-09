// ============================================================================
// NOCTIS CRRT & ACUTE KIDNEY INJURY (KDIGO / FST / RCA) COCKPIT
// Standard: KDIGO AKI 2012/2026, Chawla FST 2013, Regional Citrate Protocol
// Regulatory: 21 U.S.C. § 360j(o)(1)(E) FDA Non-Device Clinical Decision Support
// ============================================================================

import React, { useState, useMemo } from "react";
import {
  Activity,
  ShieldAlert,
  Droplets,
  Volume2,
  Square,
  Sparkles,
  Send,
  AlertOctagon,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  evaluateCrrtKdigoProtocol,
  type CrrtPatientProfile,
} from "@/lib/noctis-crrt-kdigo";
import { speakNoctisVoice, stopCurrentVoicePlayback } from "@/lib/noctis-voice";

interface NoctisCrrtSectionProps {
  onSendToChat?: (promptText: string) => void;
}

export function NoctisCrrtSection({ onSendToChat }: NoctisCrrtSectionProps) {
  const [baselineCr, setBaselineCr] = useState<number>(1.0);
  const [currentCr, setCurrentCr] = useState<number>(3.4);
  const [uoMl6h, setUoMl6h] = useState<number>(90);
  const [weightKg, setWeightKg] = useState<number>(70);
  const [bloodPh, setBloodPh] = useState<number>(7.24);
  const [serumPotassium, setSerumPotassium] = useState<number>(5.6);
  const [serumBicarb, setSerumBicarb] = useState<number>(16);
  const [bun, setBun] = useState<number>(68);
  const [pulmonaryEdema, setPulmonaryEdema] = useState<boolean>(false);
  const [toxicIngestion, setToxicIngestion] = useState<
    "NONE" | "ETHYLENE_GLYCOL" | "METHANOL" | "LITHIUM" | "SALICYLATE" | "METFORMIN"
  >("NONE");
  const [fstUrineOutput, setFstUrineOutput] = useState<number>(110);
  const [rcaActive, setRcaActive] = useState<boolean>(false);
  const [circuitPostFilterIca, setCircuitPostFilterIca] = useState<number>(0.28);
  const [systemicIca, setSystemicIca] = useState<number>(1.18);
  const [totalCalcium, setTotalCalcium] = useState<number>(8.9);

  // Invariant simulation triggers
  const [simulateDdsHazard, setSimulateDdsHazard] = useState<boolean>(false);
  const [simulateCitrateLock, setSimulateCitrateLock] = useState<boolean>(false);
  const [simulateSevereHyperk, setSimulateSevereHyperk] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  const profile = useMemo<CrrtPatientProfile>(() => {
    const proposed: string[] = [];
    if (simulateDdsHazard) proposed.push("MAX_CLEARANCE_ACUTE_HD");

    return {
      encounterId: "ENC-CRRT-8841",
      patientAge: 64,
      baselineCreatinineMgDl: baselineCr,
      currentCreatinineMgDl: currentCr,
      urineOutputMlLast6Hours: uoMl6h,
      patientWeightKg: weightKg,
      bloodPh,
      serumPotassium: simulateSevereHyperk ? 6.9 : serumPotassium,
      serumBicarbonateMeqL: serumBicarb,
      bloodUreaNitrogenMgDl: simulateDdsHazard ? 138 : bun,
      pulmonaryEdemaRefractory: pulmonaryEdema,
      toxicIngestion,
      fstUrineOutput2HoursMl: fstUrineOutput,
      rcaActive,
      circuitPostFilterIonizedCalciumMmolL: circuitPostFilterIca,
      systemicIonizedCalciumMmolL: simulateCitrateLock ? 0.82 : systemicIca,
      totalSerumCalciumMgDl: simulateCitrateLock ? 11.5 : totalCalcium,
      proposedOrders: proposed,
    };
  }, [
    baselineCr,
    currentCr,
    uoMl6h,
    weightKg,
    bloodPh,
    serumPotassium,
    serumBicarb,
    bun,
    pulmonaryEdema,
    toxicIngestion,
    fstUrineOutput,
    rcaActive,
    circuitPostFilterIca,
    systemicIca,
    totalCalcium,
    simulateDdsHazard,
    simulateCitrateLock,
    simulateSevereHyperk,
  ]);

  const report = useMemo(() => evaluateCrrtKdigoProtocol(profile), [profile]);

  const handleToggleVoice = () => {
    if (isSpeaking) {
      stopCurrentVoicePlayback();
      setIsSpeaking(false);
      return;
    }
    setIsSpeaking(true);
    void speakNoctisVoice(report.spokenGuidance, "maple", {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
    }).then((ok) => {
      if (!ok) setIsSpeaking(false);
    });
  };

  const handleSendChat = () => {
    if (!onSendToChat) return;
    const prompt = `[Noctis CRRT & KDIGO Consult] Patient ${profile.encounterId}. ${report.kdigoStaging.stageDescription}. Cr: ${profile.baselineCreatinineMgDl} -> ${profile.currentCreatinineMgDl} mg/dL. UO: ${report.kdigoStaging.urineRateMlKgHr} mL/kg/h. pH: ${profile.bloodPh}, K+: ${profile.serumPotassium} mEq/L, BUN: ${profile.bloodUreaNitrogenMgDl} mg/dL. Modality: ${report.recommendedModality}. Invariants tripped: ${report.trippedInvariants.join(", ") || "None"}.`;
    onSendToChat(prompt);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-xl border border-teal-500/20 bg-gradient-to-r from-teal-950/40 via-neutral-900/60 to-emerald-950/40 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-teal-500/10 p-2.5 border border-teal-500/20 text-teal-400">
              <Droplets className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  CRRT & Acute Kidney Injury (KDIGO / FST / RCA) Cockpit
                </h2>
                <span className="rounded bg-teal-500/10 border border-teal-500/30 px-1.5 py-0.5 text-[10px] font-mono text-teal-300">
                  KDIGO 2026 / AEIOU
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Staged nephrology risk matrix, Furosemide Stress Test progression prediction, and Regional Citrate circuit monitoring
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleToggleVoice}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition shadow-sm",
                isSpeaking
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  : "bg-white/5 hover:bg-white/10 text-white/80 border-white/10"
              )}
            >
              {isSpeaking ? <Square className="size-3.5 fill-current" /> : <Volume2 className="size-3.5 text-amber-400" />}
              {isSpeaking ? "Stop Voice" : "Read Full Guidance"}
            </button>

            {onSendToChat && (
              <button
                type="button"
                onClick={handleSendChat}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600/30 hover:bg-teal-600/50 px-3 py-1.5 text-xs font-semibold text-teal-200 border border-teal-500/40 transition"
              >
                <Send className="size-3.5" /> Send to Sovereign Chat
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Safety Invariant Banners */}
      {report.trippedInvariants.length > 0 && (
        <div className="space-y-2">
          {report.safetyDirectives.map((directive, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-red-500/40 bg-red-950/40 p-3.5 text-xs text-red-200 flex items-start gap-2.5 shadow-md shadow-red-950/30 animate-pulse"
            >
              <ShieldAlert className="size-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white font-mono uppercase tracking-wide mr-1">
                  Non-Compensatory Safety Invariant Triggered:
                </strong>
                {directive}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grid Layout: 3 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Column 1: KDIGO Staging & Renal Parameters */}
        <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 border-b border-white/10 pb-2">
            <Activity className="size-4 text-teal-400" /> KDIGO AKI Staging Matrix
          </h3>

          <div className="space-y-3">
            <div className="rounded-lg bg-teal-950/30 border border-teal-500/30 p-2.5">
              <div className="text-xs font-bold text-teal-300">{report.kdigoStaging.stageDescription}</div>
              <div className="text-[10px] text-neutral-400 mt-0.5">
                Urine Output: <strong>{report.kdigoStaging.urineRateMlKgHr} mL/kg/h</strong> (Target &ge; 0.5 mL/kg/h)
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[10px] text-neutral-400">Baseline Cr (mg/dL)</label>
                <input
                  type="number"
                  step="0.1"
                  value={baselineCr}
                  onChange={(e) => setBaselineCr(parseFloat(e.target.value) || 0.1)}
                  className="w-full rounded bg-neutral-900 border border-white/10 px-2 py-1.5 text-white text-[11px]"
                />
              </div>

              <div>
                <label className="text-[10px] text-neutral-400">Current Cr (mg/dL)</label>
                <input
                  type="number"
                  step="0.1"
                  value={currentCr}
                  onChange={(e) => setCurrentCr(parseFloat(e.target.value) || 0.1)}
                  className="w-full rounded bg-neutral-900 border border-white/10 px-2 py-1.5 text-white text-[11px]"
                />
              </div>

              <div>
                <label className="text-[10px] text-neutral-400">UO Last 6h (mL)</label>
                <input
                  type="number"
                  value={uoMl6h}
                  onChange={(e) => setUoMl6h(parseInt(e.target.value, 10) || 0)}
                  className="w-full rounded bg-neutral-900 border border-white/10 px-2 py-1.5 text-white text-[11px]"
                />
              </div>

              <div>
                <label className="text-[10px] text-neutral-400">Weight (kg)</label>
                <input
                  type="number"
                  value={weightKg}
                  onChange={(e) => setWeightKg(parseFloat(e.target.value) || 70)}
                  className="w-full rounded bg-neutral-900 border border-white/10 px-2 py-1.5 text-white text-[11px]"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 space-y-2">
              <div className="text-[11px] font-semibold text-neutral-300">Furosemide Stress Test (FST)</div>
              <div>
                <label className="text-[10px] text-neutral-400">2-Hour Urine Output (mL)</label>
                <input
                  type="number"
                  value={fstUrineOutput}
                  onChange={(e) => setFstUrineOutput(parseInt(e.target.value, 10) || 0)}
                  className="w-full rounded bg-neutral-900 border border-white/10 px-2 py-1 text-white text-[11px]"
                />
                <span className="text-[10px] text-neutral-400 block mt-1">{report.fstAssessment.predictiveValue}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: AEIOU Dialysis Triggers & Modality */}
        <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 border-b border-white/10 pb-2">
            <AlertOctagon className="size-4 text-amber-400" /> AEIOU Emergent Dialysis Triggers
          </h3>

          <div className="space-y-3">
            <div className={cn(
              "rounded-lg p-2.5 border text-xs font-semibold",
              report.aeiouTriggers.urgentIndicationPresent
                ? "bg-red-950/30 border-red-500/40 text-red-300"
                : "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
            )}>
              {report.aeiouTriggers.urgentIndicationPresent ? (
                <div>URGENT DIALYSIS INDICATED: {report.recommendedModality.replace(/_/g, " ")}</div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-emerald-400" /> No Emergent Dialysis Triggers Active
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] text-neutral-400">Arterial pH</label>
                <input
                  type="number"
                  step="0.01"
                  value={bloodPh}
                  onChange={(e) => setBloodPh(parseFloat(e.target.value) || 7.35)}
                  className="w-full rounded bg-neutral-900 border border-white/10 px-2 py-1 text-white text-[11px]"
                />
              </div>

              <div>
                <label className="text-[10px] text-neutral-400">Potassium (mEq/L)</label>
                <input
                  type="number"
                  step="0.1"
                  value={serumPotassium}
                  onChange={(e) => setSerumPotassium(parseFloat(e.target.value) || 4.0)}
                  className="w-full rounded bg-neutral-900 border border-white/10 px-2 py-1 text-white text-[11px]"
                />
              </div>

              <div>
                <label className="text-[10px] text-neutral-400">BUN (mg/dL)</label>
                <input
                  type="number"
                  value={bun}
                  onChange={(e) => setBun(parseInt(e.target.value, 10) || 20)}
                  className="w-full rounded bg-neutral-900 border border-white/10 px-2 py-1 text-white text-[11px]"
                />
              </div>

              <div>
                <label className="text-[10px] text-neutral-400">Toxic Ingestion</label>
                <select
                  value={toxicIngestion}
                  onChange={(e) => setToxicIngestion(e.target.value as any)}
                  className="w-full rounded bg-neutral-900 border border-white/10 px-2 py-1 text-white text-[10px]"
                >
                  <option value="NONE">None</option>
                  <option value="ETHYLENE_GLYCOL">Ethylene Glycol</option>
                  <option value="METHANOL">Methanol</option>
                  <option value="LITHIUM">Lithium</option>
                  <option value="SALICYLATE">Salicylate</option>
                  <option value="METFORMIN">Metformin (MALA)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-neutral-300">Refractory Pulmonary Edema</span>
              <input
                type="checkbox"
                checked={pulmonaryEdema}
                onChange={(e) => setPulmonaryEdema(e.target.checked)}
                className="size-4 rounded accent-teal-500"
              />
            </div>

            {report.aeiouTriggers.criteriaDescriptions.length > 0 && (
              <div className="bg-neutral-900/80 p-2 rounded text-[10px] text-amber-200 border border-amber-500/20 space-y-1">
                {report.aeiouTriggers.criteriaDescriptions.map((desc, i) => (
                  <div key={i}>• {desc}</div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Regional Citrate Anticoagulation (RCA) Protocol */}
        <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 border-b border-white/10 pb-2">
            <Sparkles className="size-4 text-purple-400" /> Regional Citrate (RCA) Circuit
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">Enable Regional Citrate Protocol</span>
              <input
                type="checkbox"
                checked={rcaActive}
                onChange={(e) => setRcaActive(e.target.checked)}
                className="size-4 rounded accent-teal-500"
              />
            </div>

            {rcaActive && (
              <div className="space-y-2 pt-2 border-t border-white/10 text-xs">
                <div>
                  <label className="text-[10px] text-neutral-400">Post-Filter Circuit iCa (mmol/L)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={circuitPostFilterIca}
                    onChange={(e) => setCircuitPostFilterIca(parseFloat(e.target.value) || 0.3)}
                    className="w-full rounded bg-neutral-900 border border-white/10 px-2 py-1 text-white text-[11px]"
                  />
                  <span className="text-[9px] text-neutral-400">Target: 0.25 - 0.35 mmol/L</span>
                </div>

                <div>
                  <label className="text-[10px] text-neutral-400">Systemic iCa (mmol/L)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={systemicIca}
                    onChange={(e) => setSystemicIca(parseFloat(e.target.value) || 1.15)}
                    className="w-full rounded bg-neutral-900 border border-white/10 px-2 py-1 text-white text-[11px]"
                  />
                  <span className="text-[9px] text-neutral-400">Target: 1.10 - 1.30 mmol/L</span>
                </div>

                <div>
                  <label className="text-[10px] text-neutral-400">Total Serum Calcium (mg/dL)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={totalCalcium}
                    onChange={(e) => setTotalCalcium(parseFloat(e.target.value) || 9.0)}
                    className="w-full rounded bg-neutral-900 border border-white/10 px-2 py-1 text-white text-[11px]"
                  />
                </div>

                <div className="rounded bg-neutral-900/60 p-2 text-[10px] text-neutral-300 border border-white/5 space-y-1">
                  <div>Circuit Status: {report.rcaStatus.circuitPostFilterIcaStatus}</div>
                  <div>Systemic Status: {report.rcaStatus.systemicIcaStatus}</div>
                  {report.rcaStatus.totalToIonizedRatio && (
                    <div>
                      Total/iCa Ratio: <strong>{report.rcaStatus.totalToIonizedRatio}</strong> (Toxicity if &gt; 2.5)
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Safety Stress Gates */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
          Interactive Invariant Stress Probes (21 U.S.C. § 360j(o)(1)(E))
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setSimulateDdsHazard((prev) => !prev)}
            className={cn(
              "p-2.5 rounded-lg border text-left transition text-xs",
              simulateDdsHazard
                ? "bg-red-950/50 border-red-500/60 text-red-200"
                : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
            )}
          >
            <div className="font-semibold flex items-center justify-between">
              <span>CF-CRRT-001 DDS Hazard</span>
              <span className="font-mono text-[10px]">{simulateDdsHazard ? "ACTIVE" : "OFF"}</span>
            </div>
            <div className="text-[10px] text-neutral-400 mt-1">Aggressive clearance order with BUN 138 mg/dL</div>
          </button>

          <button
            type="button"
            onClick={() => setSimulateCitrateLock((prev) => !prev)}
            className={cn(
              "p-2.5 rounded-lg border text-left transition text-xs",
              simulateCitrateLock
                ? "bg-red-950/50 border-red-500/60 text-red-200"
                : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
            )}
          >
            <div className="font-semibold flex items-center justify-between">
              <span>CF-CRRT-002 Citrate Lock</span>
              <span className="font-mono text-[10px]">{simulateCitrateLock ? "ACTIVE" : "OFF"}</span>
            </div>
            <div className="text-[10px] text-neutral-400 mt-1">Total-to-ionized calcium ratio &gt; 2.5 toxicity</div>
          </button>

          <button
            type="button"
            onClick={() => setSimulateSevereHyperk((prev) => !prev)}
            className={cn(
              "p-2.5 rounded-lg border text-left transition text-xs",
              simulateSevereHyperk
                ? "bg-red-950/50 border-red-500/60 text-red-200"
                : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
            )}
          >
            <div className="font-semibold flex items-center justify-between">
              <span>CF-CRRT-003 Severe Hyper-K</span>
              <span className="font-mono text-[10px]">{simulateSevereHyperk ? "ACTIVE" : "OFF"}</span>
            </div>
            <div className="text-[10px] text-neutral-400 mt-1">Potassium 6.9 mEq/L with delayed nephrology alert</div>
          </button>
        </div>
      </div>
    </div>
  );
}
