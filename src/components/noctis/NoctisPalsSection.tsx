import React, { useState, useMemo } from "react";
import {
  Baby,
  ShieldAlert,
  AlertTriangle,
  Volume2,
  Square,
  Sparkles,
  Send,
  Check,
  RotateCcw,
  Activity,
  Heart,
  Droplets,
  Zap,
  Wind,
  Sliders,
  ArrowRight,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import {
  getBroselowZoneFromWeight,
  calculatePediatricNormalVitals,
  calculateAirwaySizing,
  calculatePalsMedications,
  evaluatePalsResuscitation,
  formatPalsSpokenSummary,
  BROSELOW_ZONES,
  PALS_PRESET_TODDLER_SEPSIS,
  PALS_PRESET_PRESCHOOL_ARREST,
  PALS_PRESET_INFANT_CARDIOGENIC,
  type BroselowColor,
  type PalsEvaluationReport,
} from "@/lib/noctis-pals-resuscitation.ts";
import { speakNoctisVoice, stopCurrentVoicePlayback } from "@/lib/noctis-voice.ts";

interface NoctisPalsSectionProps {
  onSendToChat?: (promptText: string) => void;
}

export function NoctisPalsSection({ onSendToChat }: NoctisPalsSectionProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>("sepsis");

  // Patient parameters
  const [patientId, setPatientId] = useState<string>("PALS-PURPLE-001");
  const [patientName, setPatientName] = useState<string>("Noah Bennett (18mo M - Septic Shock)");
  const [ageYears, setAgeYears] = useState<number>(1);
  const [ageMonths, setAgeMonths] = useState<number>(6);
  const [weightKg, setWeightKg] = useState<number>(11);
  const [isCardiogenicShock, setIsCardiogenicShock] = useState<boolean>(false);

  // Safety probe states
  const [testEpiOneToOneThousand, setTestEpiOneToOneThousand] = useState<boolean>(false);
  const [testNeonatalBicarb, setTestNeonatalBicarb] = useState<boolean>(false);

  // Voice state
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Live PALS Evaluation Report
  const report = useMemo<PalsEvaluationReport>(() => {
    return evaluatePalsResuscitation({
      patientId,
      patientName,
      ageYears,
      ageMonths,
      weightKg,
      isCardiogenicShock,
      attemptedEpiConcentration: testEpiOneToOneThousand ? "1:1,000" : "1:10,000",
      attemptedBicarbNeonatal: testNeonatalBicarb ? "8.4%_UNDILUTED" : "4.2%_DILUTED",
    });
  }, [
    patientId,
    patientName,
    ageYears,
    ageMonths,
    weightKg,
    isCardiogenicShock,
    testEpiOneToOneThousand,
    testNeonatalBicarb,
  ]);

  // Handle Preset Load
  const handleLoadPreset = (key: string) => {
    setSelectedPreset(key);
    stopCurrentVoicePlayback();
    setIsSpeaking(false);
    setTestEpiOneToOneThousand(false);
    setTestNeonatalBicarb(false);

    if (key === "sepsis") {
      const p = PALS_PRESET_TODDLER_SEPSIS;
      setPatientId(p.patientId);
      setPatientName(p.patientName);
      setAgeYears(p.ageYears);
      setAgeMonths(p.ageMonths);
      setWeightKg(p.weightKg);
      setIsCardiogenicShock(p.isCardiogenicShock);
    } else if (key === "arrest") {
      const p = PALS_PRESET_PRESCHOOL_ARREST;
      setPatientId(p.patientId);
      setPatientName(p.patientName);
      setAgeYears(p.ageYears);
      setAgeMonths(p.ageMonths);
      setWeightKg(p.weightKg);
      setIsCardiogenicShock(p.isCardiogenicShock);
    } else if (key === "myocarditis") {
      const p = PALS_PRESET_INFANT_CARDIOGENIC;
      setPatientId(p.patientId);
      setPatientName(p.patientName);
      setAgeYears(p.ageYears);
      setAgeMonths(p.ageMonths);
      setWeightKg(p.weightKg);
      setIsCardiogenicShock(p.isCardiogenicShock);
    }
  };

  // Voice Readout
  const handleToggleVoice = async () => {
    if (isSpeaking) {
      stopCurrentVoicePlayback();
      setIsSpeaking(false);
      return;
    }

    const script = formatPalsSpokenSummary(report);
    setIsSpeaking(true);
    const ok = await speakNoctisVoice(script, "alloy", {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
    });
    if (!ok) {
      setIsSpeaking(false);
    }
  };

  // Send to Sovereign Chat
  const handleSendChat = () => {
    if (!onSendToChat) return;
    const epi = report.resuscitationMedications.find((m) => m.drugName.includes("Epinephrine"));
    const prompt = `[Noctis PALS Resuscitation Assessment - ${report.patientName}] Weight: ${report.weightKg} kg (Broselow Zone: ${report.broselowZone.color}). Age: ${report.ageYears}y ${report.ageMonths}m. Airway: Cuffed ETT ${report.airwayEquipment.cuffedEttSizeMm} mm at ${report.airwayEquipment.depthAtLipCm} cm lip, Blade ${report.airwayEquipment.laryngoscopeBlade}. First-line Epinephrine 1:10,000 dose: ${epi?.totalDoseMg} mg (${epi?.volumeToAdministerMl} mL IV/IO). Fluid Bolus: ${report.fluidResuscitation.bolusVolumeMl} mL. Defibrillation: Initial ${report.electricalTherapy.defibrillationInitialJoules} J, Second ${report.electricalTherapy.defibrillationSecondJoules} J. Tripped Invariants: ${report.trippedInvariants.join(", ") || "None"}.`;
    onSendToChat(prompt);
  };

  return (
    <div className="space-y-6">
      {/* Executive Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-pink-500/30 bg-gradient-to-r from-pink-950/40 via-purple-950/20 to-black/60 p-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded bg-pink-500/20 border border-pink-500/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-pink-300">
              <Baby className="size-3 text-pink-400" /> PALS Resuscitation
            </span>
            <span className="rounded bg-violet-600/30 border border-violet-500/40 px-2 py-0.5 text-[10px] font-bold text-violet-300">
              21 U.S.C. § 360j(o)(1)(E)
            </span>
            <span className="rounded bg-pink-600/20 border border-pink-500/40 px-2 py-0.5 text-[10px] font-bold text-pink-300">
              AHA / AAP PALS 2020-2025
            </span>
          </div>
          <h2 className="text-lg font-bold tracking-tight text-white mt-1">
            Pediatric Advanced Life Support (PALS) &amp; Broselow Resuscitation Engine
          </h2>
          <p className="text-xs text-white/60">
            Broselow color zones (Grey to Adolescent), age-stratified physiological vitals, weight-based mL volume dosing, cuffed ETT formulas &amp; 10-fold Epinephrine overdose veto.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleVoice}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition shadow-sm border",
              isSpeaking
                ? "bg-amber-500/25 text-amber-300 border-amber-500/50 ring-1 ring-amber-500/50"
                : "bg-pink-600/30 hover:bg-pink-600/50 text-pink-200 border-pink-500/40"
            )}
          >
            {isSpeaking ? (
              <>
                <Square className="size-3.5 fill-current text-amber-300" /> Stop Readout
              </>
            ) : (
              <>
                <Volume2 className="size-3.5 text-pink-300" /> Read Aloud (Full PALS Dosing)
              </>
            )}
          </button>
          {onSendToChat && (
            <button
              type="button"
              onClick={handleSendChat}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold hover:bg-violet-500 transition text-white shadow-md"
            >
              <Send className="size-3.5" /> Consult Noctis
            </button>
          )}
        </div>
      </div>

      {/* Preset Selector Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-white/50 uppercase tracking-wider mr-1">
          PALS Scenarios:
        </span>
        <button
          type="button"
          onClick={() => handleLoadPreset("sepsis")}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-semibold transition border",
            selectedPreset === "sepsis"
              ? "bg-purple-950/60 border-purple-500/60 text-purple-200 shadow-sm"
              : "bg-black/30 border-white/10 text-white/70 hover:bg-white/5"
          )}
        >
          <span className="text-purple-400 font-bold mr-1">&bull;</span> 18mo Toddler Sepsis (11 kg, PURPLE, 220 mL NS)
        </button>
        <button
          type="button"
          onClick={() => handleLoadPreset("arrest")}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-semibold transition border",
            selectedPreset === "arrest"
              ? "bg-slate-800/80 border-slate-400 text-white shadow-sm"
              : "bg-black/30 border-white/10 text-white/70 hover:bg-white/5"
          )}
        >
          <span className="text-slate-200 font-bold mr-1">&bull;</span> 4yo Cardiac Arrest (16 kg, WHITE, Epi 1.6 mL, Defib 34 J)
        </button>
        <button
          type="button"
          onClick={() => handleLoadPreset("myocarditis")}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-semibold transition border",
            selectedPreset === "myocarditis"
              ? "bg-rose-950/60 border-rose-500/60 text-rose-200 shadow-sm"
              : "bg-black/30 border-white/10 text-white/70 hover:bg-white/5"
          )}
        >
          <span className="text-rose-400 font-bold mr-1">&bull;</span> 8mo Cardiogenic Shock (8.5 kg, RED, Fluid Restricted)
        </button>
      </div>

      {/* Broselow Color Ribbon */}
      <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-pink-400 flex items-center gap-2">
            <Sliders className="size-4" /> Broselow Color Zone Continuum
          </span>
          <span className="text-xs font-mono font-bold text-white">
            Current Weight: <span className="text-pink-300">{weightKg} kg</span> &bull; Zone:{" "}
            <span
              className="px-2 py-0.5 rounded text-[11px] font-bold uppercase"
              style={{
                backgroundColor: `${report.broselowZone.hexColor}33`,
                borderColor: report.broselowZone.hexColor,
                color: report.broselowZone.hexColor === "#f3f4f6" ? "#ffffff" : report.broselowZone.hexColor,
                borderWidth: "1px",
              }}
            >
              {report.broselowZone.color} ({report.broselowZone.weightMinKg}–{report.broselowZone.weightMaxKg} kg)
            </span>
          </span>
        </div>

        {/* Weight Range Slider */}
        <input
          type="range"
          min={3}
          max={50}
          step={0.5}
          value={weightKg}
          onChange={(e) => setWeightKg(Number(e.target.value))}
          className="w-full accent-pink-500"
        />

        {/* Visual Broselow Zone Blocks */}
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 pt-1">
          {Object.values(BROSELOW_ZONES).map((z) => {
            const isCurrent = z.color === report.broselowZone.color;
            return (
              <div
                key={z.color}
                className={cn(
                  "rounded p-1.5 text-center text-[10px] font-mono border transition cursor-pointer",
                  isCurrent ? "ring-2 ring-white scale-105 shadow-lg" : "opacity-60 hover:opacity-100"
                )}
                style={{
                  backgroundColor: `${z.hexColor}25`,
                  borderColor: z.hexColor,
                }}
                onClick={() => setWeightKg((z.weightMinKg + z.weightMaxKg) / 2)}
              >
                <div className="font-bold text-white">{z.color}</div>
                <div className="text-[9px] text-white/70">
                  {z.weightMinKg}-{z.weightMaxKg}kg
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tripped Invariants Banner */}
      {report.trippedInvariants.length > 0 && (
        <div className="rounded-xl border border-rose-500/50 bg-rose-950/30 p-4 space-y-2">
          <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
            <ShieldAlert className="size-4 text-rose-400 animate-pulse" />
            CRITICAL PEDIATRIC SAFETY INVARIANT VETO TRIPPED ({report.trippedInvariants.join(", ")})
          </div>
          <div className="space-y-1.5 text-xs text-rose-200/90">
            {report.mandatoryActions.map((action, i) => (
              <div key={i} className="flex items-start gap-2 bg-black/40 rounded p-2 border border-rose-500/30">
                <span className="text-rose-400 font-bold shrink-0">&bull;</span>
                <span>{action}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Airway & Physiological Parameters */}
        <div className="lg:col-span-5 space-y-4">
          {/* Airway Equipment Card */}
          <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-pink-400 flex items-center gap-2">
              <Wind className="size-4" /> Airway Equipment Sizing (APLS)
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-pink-950/20 border border-pink-500/30 p-3">
                <div className="text-[10px] uppercase font-bold text-pink-300">Cuffed ETT Size</div>
                <div className="text-xl font-bold font-mono text-white mt-0.5">
                  {report.airwayEquipment.cuffedEttSizeMm} <span className="text-xs text-white/60">mm ID</span>
                </div>
                <div className="text-[10px] text-white/50 mt-1">Formula: (Age/4) + 3.5</div>
              </div>

              <div className="rounded-lg bg-black/60 border border-white/10 p-3">
                <div className="text-[10px] uppercase font-bold text-white/60">Uncuffed ETT Size</div>
                <div className="text-xl font-bold font-mono text-white mt-0.5">
                  {report.airwayEquipment.uncuffedEttSizeMm} <span className="text-xs text-white/60">mm ID</span>
                </div>
                <div className="text-[10px] text-white/50 mt-1">Formula: (Age/4) + 4.0</div>
              </div>

              <div className="rounded-lg bg-black/60 border border-white/10 p-3">
                <div className="text-[10px] uppercase font-bold text-white/60">Depth at Lip</div>
                <div className="text-xl font-bold font-mono text-white mt-0.5">
                  {report.airwayEquipment.depthAtLipCm} <span className="text-xs text-white/60">cm</span>
                </div>
                <div className="text-[10px] text-white/50 mt-1">Formula: ETT ID &times; 3</div>
              </div>

              <div className="rounded-lg bg-black/60 border border-white/10 p-3">
                <div className="text-[10px] uppercase font-bold text-white/60">Laryngoscope Blade</div>
                <div className="text-xs font-bold font-mono text-pink-200 mt-1">
                  {report.airwayEquipment.laryngoscopeBlade}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-white/70 pt-2 border-t border-white/10">
              <div>Suction Catheter: <strong className="text-white">{report.airwayEquipment.suctionCatheterFr} Fr</strong></div>
              <div>Chest Tube: <strong className="text-white">{report.airwayEquipment.chestTubeFr} Fr</strong></div>
            </div>
          </div>

          {/* Age-Stratified Physiological Normals */}
          <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-pink-400 flex items-center gap-2">
              <Activity className="size-4" /> Age-Stratified Vitals &amp; Hypotension
            </h3>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded bg-black/60 border border-white/10 p-2">
                <div className="text-[9px] text-white/50 uppercase font-bold">Normal HR</div>
                <div className="font-mono font-bold text-white mt-0.5">
                  {report.normalVitals.hrNormalMin}–{report.normalVitals.hrNormalMax}
                </div>
                <div className="text-[9px] text-white/40">bpm</div>
              </div>

              <div className="rounded bg-black/60 border border-white/10 p-2">
                <div className="text-[9px] text-white/50 uppercase font-bold">Normal RR</div>
                <div className="font-mono font-bold text-white mt-0.5">
                  {report.normalVitals.rrNormalMin}–{report.normalVitals.rrNormalMax}
                </div>
                <div className="text-[9px] text-white/40">/min</div>
              </div>

              <div className="rounded bg-rose-950/20 border border-rose-500/30 p-2">
                <div className="text-[9px] text-rose-300 uppercase font-bold">Min SBP Threshold</div>
                <div className="font-mono font-bold text-rose-200 mt-0.5">
                  &lt; {report.normalVitals.sbpMinimumHypotensionThreshold}
                </div>
                <div className="text-[9px] text-rose-300/60">mmHg (Hypotension)</div>
              </div>
            </div>
          </div>

          {/* Safety Probe Controls */}
          <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
              Safety Invariant Probes
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTestEpiOneToOneThousand(!testEpiOneToOneThousand)}
                className={cn(
                  "rounded px-2.5 py-1 text-[11px] font-semibold border transition",
                  testEpiOneToOneThousand
                    ? "bg-rose-600/30 border-rose-500/50 text-rose-300"
                    : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                )}
              >
                {testEpiOneToOneThousand ? "Reset Epinephrine Probe" : "Probe CF-PALS-001 (Epi 1:1,000 Veto)"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setAgeYears(0);
                  setAgeMonths(0);
                  setWeightKg(3.2);
                  setTestNeonatalBicarb(!testNeonatalBicarb);
                }}
                className={cn(
                  "rounded px-2.5 py-1 text-[11px] font-semibold border transition",
                  testNeonatalBicarb
                    ? "bg-rose-600/30 border-rose-500/50 text-rose-300"
                    : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                )}
              >
                {testNeonatalBicarb ? "Reset Neonate Bicarb" : "Probe CF-PALS-003 (Neonate Bicarb Veto)"}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Weight-Based Resuscitation Medications & Electrical Therapy */}
        <div className="lg:col-span-7 space-y-4">
          {/* Medications Card */}
          <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-pink-400 flex items-center gap-2">
                <Droplets className="size-4" /> Weight-Based PALS Resuscitation Medications ({weightKg} kg)
              </h3>
              <span className="text-[10px] text-emerald-400 font-mono font-bold">Exact mL Volumes</span>
            </div>

            <div className="space-y-2">
              {report.resuscitationMedications.map((med, i) => (
                <div key={i} className="rounded-lg bg-black/60 border border-white/10 p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-pink-400" />
                      {med.drugName}
                    </span>
                    <span className="rounded bg-pink-500/20 text-pink-300 border border-pink-500/30 px-2 py-0.5 text-xs font-mono font-bold">
                      {med.volumeToAdministerMl} mL ({med.totalDoseMg} mg)
                    </span>
                  </div>
                  <div className="text-[11px] text-white/70">
                    <span className="text-white/40">Indication:</span> {med.indication}
                  </div>
                  <div className="text-[10px] text-white/50 font-mono">
                    Dose: {med.dosePerKg} &bull; Route: {med.route} &bull; {med.administrationInstructions}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fluid & Electrical Therapy Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Fluid Resuscitation */}
            <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-2">
              <div className="flex items-center gap-2 text-pink-300 font-bold text-xs">
                <Droplets className="size-4 text-pink-400" />
                FLUID RESUSCITATION
              </div>
              <div className="text-xl font-bold font-mono text-white">
                {report.fluidResuscitation.bolusVolumeMl} <span className="text-xs text-white/60">mL bolus</span>
              </div>
              <div className="text-xs text-white/70">
                Infuse over {report.fluidResuscitation.bolusRateMinutes} minutes ({report.fluidResuscitation.crystalloidType})
              </div>
              <div className="text-[10px] font-mono text-white/50 pt-1">
                Type: {report.fluidResuscitation.shockType.replace(/_/g, " ")}
              </div>
            </div>

            {/* Electrical Defibrillation */}
            <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                <Zap className="size-4 text-amber-400" />
                ELECTRICAL THERAPY
              </div>
              <div className="text-xl font-bold font-mono text-white">
                {report.electricalTherapy.defibrillationInitialJoules} J <span className="text-xs text-white/60">(Initial)</span> /{" "}
                {report.electricalTherapy.defibrillationSecondJoules} J <span className="text-xs text-white/60">(2nd)</span>
              </div>
              <div className="text-xs text-white/70">
                Defibrillation: 2 J/kg initial, 4 J/kg subsequent (Max 200 J)
              </div>
              <div className="text-[10px] font-mono text-amber-300/80 pt-1">
                Sync Cardioversion: {report.electricalTherapy.synchronizedCardioversionInitialJoules} J (0.5 J/kg)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
