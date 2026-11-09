import React, { useState, useEffect, useMemo } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  Square,
  Sparkles,
  ShieldAlert,
  FileSpreadsheet,
  FileCode,
  Printer,
  Send,
  Check,
  Copy,
  Activity,
  AlertTriangle,
  Stethoscope,
  Heart,
  RotateCcw,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  extractClinicalEntitiesFromTranscript,
  synthesizeAmbientToDossier,
  CURATED_AMBIENT_PRESETS,
  type ExtractedClinicalEntities,
} from "@/lib/noctis-ambient-dictation.ts";
import {
  exportReferenceTableCsv,
  exportFhirR4DocumentBundle,
  downloadBlob,
  printDossier,
} from "@/lib/noctis-clinical-export.ts";
import {
  listenBrowserSpeech,
  isSpeechRecognitionSupported,
  speakNoctisVoice,
  stopCurrentVoicePlayback,
} from "@/lib/noctis-voice.ts";
import type { BenchmarkFlagshipSummary } from "@/lib/noctis-health-500-chat.ts";

interface NoctisAmbientDictationSectionProps {
  onSendToChat?: (promptText: string) => void;
}

export function NoctisAmbientDictationSection({ onSendToChat }: NoctisAmbientDictationSectionProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<string>("neuro-stroke-lvo");
  const [transcript, setTranscript] = useState<string>(() => CURATED_AMBIENT_PRESETS[0]?.rawTranscript || "");
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Synthesized dossier state
  const [synthesizedDossier, setSynthesizedDossier] = useState<string | null>(null);
  const [flagshipSummary, setFlagshipSummary] = useState<BenchmarkFlagshipSummary | null>(null);

  // Live extracted clinical entities from transcript
  const entities = useMemo<ExtractedClinicalEntities>(() => {
    return extractClinicalEntitiesFromTranscript(transcript);
  }, [transcript]);

  // Handle Preset Selection
  const handleSelectPreset = (id: string) => {
    const preset = CURATED_AMBIENT_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setSelectedPresetId(id);
    setTranscript(preset.rawTranscript);
    setSynthesizedDossier(null);
    setFlagshipSummary(null);
    setSpeechError(null);
    stopCurrentVoicePlayback();
    setIsSpeaking(false);
  };

  // Toggle ambient microphone dictation
  const handleToggleListening = async () => {
    if (isListening) {
      stopCurrentVoicePlayback();
      setIsListening(false);
      return;
    }

    if (!isSpeechRecognitionSupported()) {
      setSpeechError("Speech recognition is not natively supported in this browser. Please use Chrome, Edge, or Safari, or click one of the curated presets above.");
      return;
    }

    setSpeechError(null);
    setIsListening(true);

    try {
      const result = await listenBrowserSpeech({
        onInterim: (interimText) => {
          setTranscript((prev) => {
            const trimmed = prev.trim();
            return trimmed ? `${trimmed} ${interimText}` : interimText;
          });
        },
        timeoutMs: 30000,
      });

      setIsListening(false);
      if (result.error && !result.error.includes("no-speech")) {
        setSpeechError(result.error);
      }
    } catch (err: any) {
      setIsListening(false);
      setSpeechError(err?.message || "Microphone capture interrupted.");
    }
  };

  // Synthesize to Gold-Standard Dossier
  const handleSynthesize = () => {
    if (!transcript.trim()) return;
    const { flagshipSummary: summary, goldDossier } = synthesizeAmbientToDossier(transcript);
    setFlagshipSummary(summary);
    setSynthesizedDossier(goldDossier);
  };

  // Spoken voice read aloud (Full un-truncated enunciation of tables & invariants)
  const handleToggleRead = () => {
    if (isSpeaking) {
      stopCurrentVoicePlayback();
      setIsSpeaking(false);
      return;
    }

    const textToSpeak = synthesizedDossier || transcript;
    if (!textToSpeak.trim()) return;

    setIsSpeaking(true);
    void speakNoctisVoice(textToSpeak, "maple", {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
    }).then((ok) => {
      if (!ok) {
        setIsSpeaking(false);
      }
    });
  };

  // Copy dossier or transcript
  const handleCopy = () => {
    const text = synthesizedDossier || transcript;
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Send to Sovereign Chat
  const handleSendChat = () => {
    if (!onSendToChat) return;
    const activeCase = flagshipSummary || synthesizeAmbientToDossier(transcript).flagshipSummary;
    const prompt = `[Noctis Ambient Clinical Consultation — ${activeCase.specialty}] Evaluate patient case: ${activeCase.ageYears}yo ${activeCase.biologicalSex.toLowerCase()} presenting with "${activeCase.chiefComplaint}". Onset: ${activeCase.onsetAndTimeline}. Vitals: BP ${activeCase.vitals.bloodPressure || "120/80"} mmHg, HR ${activeCase.vitals.heartRateBpm || 80} bpm, SpO2 ${activeCase.vitals.spo2Percent || 98}%, Glucose ${activeCase.vitals.bloodGlucoseMgDl || 110} mg/dL. Primary candidate: ${activeCase.primaryDiagnosis} (${activeCase.icd10}). Raw ambient dictation: "${transcript.trim().slice(0, 300)}..."`;
    onSendToChat(prompt);
  };

  // Ensure playback stops when unmounting
  useEffect(() => {
    return () => {
      stopCurrentVoicePlayback();
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-rose-500/30 bg-rose-950/20 p-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-300">
              <Mic className="size-3 animate-pulse text-rose-400" /> Ambient Voice
            </span>
            <span className="rounded bg-violet-600/30 border border-violet-500/40 px-2 py-0.5 text-[10px] font-bold text-violet-300">
              21 U.S.C. § 360j(o)(1)(E)
            </span>
          </div>
          <h2 className="text-base font-bold text-white mt-1">
            Real-Time Ambient Clinical Dictation & Speech-to-Dossier Engine
          </h2>
          <p className="text-xs text-white/60">
            Acoustic bedside listening, real-time vital sign & symptom entity extraction, automated clinical specialty detection, and instant synthesis of 7-section CDS dossiers.
          </p>
        </div>

        {/* Ambient Dictation Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleListening}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition shadow-md",
              isListening
                ? "bg-rose-600 hover:bg-rose-700 text-white animate-pulse ring-2 ring-rose-400"
                : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
            )}
          >
            {isListening ? (
              <>
                <Square className="size-3.5 fill-current" /> Stop Listening
              </>
            ) : (
              <>
                <Mic className="size-3.5 text-rose-400" /> Start Dictation
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSynthesize}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-500 px-4 py-2 text-xs font-bold text-white transition shadow-md"
          >
            <Sparkles className="size-3.5" /> Synthesize Dossier
          </button>
        </div>
      </div>

      {speechError && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-950/30 p-3 text-xs text-amber-200 flex items-center gap-2">
          <AlertTriangle className="size-4 shrink-0 text-amber-400" />
          <span>{speechError}</span>
        </div>
      )}

      {/* Preset Dictation Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-white/60 flex items-center gap-1">
          <Zap className="size-3 text-amber-400" /> Load Handoff Preset:
        </span>
        {CURATED_AMBIENT_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => handleSelectPreset(preset.id)}
            className={cn(
              "rounded-lg px-2.5 py-1 text-[11px] font-medium transition border",
              selectedPresetId === preset.id
                ? "bg-violet-600/30 border-violet-500/60 text-violet-200"
                : "bg-black/20 border-white/10 text-white/70 hover:bg-white/5"
            )}
            title={preset.description}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Main 2-Column Workstation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Ambient Transcript & Live Entity Extraction HUD */}
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-violet-400 flex items-center gap-1.5">
                <Mic className="size-3.5 text-violet-400" /> Unstructured Ambient Dictation Stream
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-white/40 font-mono">
                  {transcript.split(/\s+/).filter(Boolean).length} words
                </span>
                <button
                  type="button"
                  onClick={() => setTranscript("")}
                  className="text-[11px] text-white/40 hover:text-white transition flex items-center gap-1"
                  title="Clear transcript"
                >
                  <RotateCcw className="size-3" /> Clear
                </button>
              </div>
            </div>

            <textarea
              value={transcript}
              onChange={(e) => {
                setTranscript(e.target.value);
                setSynthesizedDossier(null);
              }}
              rows={8}
              placeholder="Speak naturally or paste bedside clinician notes, nursing triage, or ER handoff..."
              className="w-full rounded-lg border border-white/15 bg-black/40 p-3 text-xs leading-relaxed text-zinc-100 placeholder-zinc-500 focus:border-violet-500/60 focus:outline-none focus:ring-1 focus:ring-violet-500/50 resize-y"
            />
          </div>

          {/* Real-Time Clinical Entity Extraction HUD */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-violet-400 flex items-center gap-1.5">
                <Activity className="size-3.5 text-emerald-400" /> Real-Time Extracted Clinical Entities
              </h3>
              <span className="rounded bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                {entities.detectedSpecialty}
              </span>
            </div>

            {/* Demographics & Chronology */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="rounded-lg bg-black/30 p-2 border border-white/5">
                <div className="text-[10px] text-white/40 uppercase font-semibold">Age / Sex</div>
                <div className="font-bold text-white mt-0.5">
                  {entities.patientAge}yo {entities.biologicalSex}
                </div>
              </div>
              <div className="rounded-lg bg-black/30 p-2 border border-white/5">
                <div className="text-[10px] text-white/40 uppercase font-semibold">Candidate ICD-10</div>
                <div className="font-bold text-violet-300 font-mono mt-0.5">
                  {entities.icd10Candidate}
                </div>
              </div>
              <div className="rounded-lg bg-black/30 p-2 border border-white/5 col-span-2">
                <div className="text-[10px] text-white/40 uppercase font-semibold">Chief Complaint</div>
                <div className="font-medium text-white/90 truncate mt-0.5" title={entities.chiefComplaint}>
                  "{entities.chiefComplaint}"
                </div>
              </div>
            </div>

            {/* Extracted Vitals Grid */}
            <div className="rounded-lg bg-black/40 border border-white/10 p-3">
              <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider mb-2 flex items-center gap-1">
                <Heart className="size-3 text-rose-400" /> Bedside Vitals Panel
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs font-mono">
                <div className="rounded bg-white/[0.03] p-1.5 border border-white/5">
                  <div className="text-[9px] text-white/40">BP</div>
                  <div className="font-bold text-white">{entities.vitals.bloodPressure || "—"}</div>
                </div>
                <div className="rounded bg-white/[0.03] p-1.5 border border-white/5">
                  <div className="text-[9px] text-white/40">HR</div>
                  <div className="font-bold text-white">{entities.vitals.heartRateBpm ? `${entities.vitals.heartRateBpm} bpm` : "—"}</div>
                </div>
                <div className="rounded bg-white/[0.03] p-1.5 border border-white/5">
                  <div className="text-[9px] text-white/40">RR</div>
                  <div className="font-bold text-white">{entities.vitals.respiratoryRatePerMin ? `${entities.vitals.respiratoryRatePerMin} /min` : "—"}</div>
                </div>
                <div className="rounded bg-white/[0.03] p-1.5 border border-white/5">
                  <div className="text-[9px] text-white/40">Temp</div>
                  <div className="font-bold text-white">{entities.vitals.temperatureCelsius ? `${entities.vitals.temperatureCelsius} °C` : "—"}</div>
                </div>
                <div className="rounded bg-white/[0.03] p-1.5 border border-white/5">
                  <div className="text-[9px] text-white/40">SpO2</div>
                  <div className="font-bold text-white">{entities.vitals.spo2Percent ? `${entities.vitals.spo2Percent}%` : "—"}</div>
                </div>
                <div className="rounded bg-white/[0.03] p-1.5 border border-white/5">
                  <div className="text-[9px] text-white/40">Glucose</div>
                  <div className={cn(
                    "font-bold",
                    entities.vitals.bloodGlucoseMgDl && entities.vitals.bloodGlucoseMgDl > 200
                      ? "text-amber-300 font-bold"
                      : "text-white"
                  )}>
                    {entities.vitals.bloodGlucoseMgDl ? `${entities.vitals.bloodGlucoseMgDl} mg/dL` : "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* Extracted Symptoms Tags */}
            <div>
              <div className="text-[10px] text-white/40 uppercase font-semibold mb-1">
                Extracted Symptoms & Exam Findings ({entities.symptoms.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {entities.symptoms.map((sym, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-zinc-300 border border-white/10"
                  >
                    {sym}
                  </span>
                ))}
              </div>
            </div>

            {/* Safety Invariant Alert Banner (if tripped) */}
            {entities.criticalTrippedInvariants.length > 0 && (
              <div className="rounded-lg border border-rose-500/40 bg-rose-950/30 p-3 space-y-1.5">
                <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
                  <ShieldAlert className="size-4 text-rose-400" />
                  <span>Mandatory Safety Invariant Gate Tripped!</span>
                </div>
                {entities.criticalTrippedInvariants.map((inv, i) => (
                  <div key={i} className="text-[11px] text-rose-200/90 pl-6 space-y-0.5">
                    <div className="font-semibold text-rose-300">[{inv.code}] {inv.title}</div>
                    <div className="text-white/70 italic text-[10px]">Risk: {inv.risk}</div>
                    <div className="text-emerald-300 font-medium text-[10px]">Guideline Action: {inv.remedy}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Synthesized Gold-Standard Dossier & Action Bar */}
        <div className="space-y-4 flex flex-col">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex-1 flex flex-col space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Stethoscope className="size-4 text-[#e4b86a]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Gold-Standard Consultation Dossier
                </h3>
              </div>

              {/* Action Ribbon */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleToggleRead}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition border",
                    isSpeaking
                      ? "bg-amber-500/30 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/20"
                      : "bg-white/5 hover:bg-white/10 text-white/80 border-white/10"
                  )}
                  title="Read aloud full dossier with complete table rows, vitals, units, and safety invariants"
                >
                  {isSpeaking ? (
                    <>
                      <Square className="size-3 fill-current text-amber-300" /> Stop
                    </>
                  ) : (
                    <>
                      <Volume2 className="size-3.5 text-amber-400" /> Read
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 rounded-md bg-white/5 hover:bg-white/10 px-2 py-1 text-[11px] text-white/80 border border-white/10 transition"
                  title="Copy markdown dossier"
                >
                  {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                  {copied ? "Copied" : "Copy"}
                </button>

                {onSendToChat && (
                  <button
                    type="button"
                    onClick={handleSendChat}
                    className="inline-flex items-center gap-1.5 rounded-md bg-violet-600/30 hover:bg-violet-600/50 px-2.5 py-1 text-[11px] font-semibold text-violet-200 border border-violet-500/40 transition"
                    title="Send case to Sovereign Chat for interactive specialist consult"
                  >
                    <Send className="size-3" /> Send to Chat
                  </button>
                )}
              </div>
            </div>

            {/* Dossier Content or Empty State */}
            <div className="flex-1 min-h-[350px] max-h-[500px] overflow-y-auto rounded-lg bg-black/40 border border-white/5 p-3.5 text-xs text-zinc-200 font-sans leading-relaxed select-text space-y-3">
              {synthesizedDossier ? (
                <div className="space-y-3 whitespace-pre-wrap font-mono text-[11px]">
                  {synthesizedDossier}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3 text-white/40">
                  <Stethoscope className="size-8 text-white/20" />
                  <div>
                    <div className="font-semibold text-white/60">No Dossier Synthesized Yet</div>
                    <div className="text-[11px] mt-1 max-w-sm">
                      Speak your clinical observations, select a preset handoff, or click{" "}
                      <span className="text-violet-300 font-semibold">"Synthesize Dossier"</span> to generate the full 7-section CDS consultation.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* EHR Interoperability & Dossier Export Actions */}
            {synthesizedDossier && flagshipSummary && (
              <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const csv = exportReferenceTableCsv(flagshipSummary);
                      downloadBlob(`${flagshipSummary.caseId}_Reference_Table.csv`, csv, "text/csv;charset=utf-8;");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 text-[11px] font-semibold text-amber-300 border border-amber-500/30 transition shadow-sm"
                    title="Export 3-column reference table CSV matching Image 1"
                  >
                    <FileSpreadsheet className="size-3.5" /> Export CSV (.csv)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const fhir = exportFhirR4DocumentBundle(flagshipSummary);
                      downloadBlob(`${flagshipSummary.caseId}_FHIR_R4_Bundle.json`, JSON.stringify(fhir, null, 2), "application/json");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-md bg-violet-500/10 hover:bg-violet-500/20 px-2.5 py-1 text-[11px] font-semibold text-violet-300 border border-violet-500/30 transition shadow-sm"
                    title="Export US Core v9.0.0 / HL7 FHIR R4 Document Bundle JSON"
                  >
                    <FileCode className="size-3.5" /> Export FHIR R4 (.json)
                  </button>
                  <button
                    type="button"
                    onClick={() => printDossier(flagshipSummary)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 border border-emerald-500/30 transition shadow-sm"
                    title="Print or Save PDF Clinical Decision Support Dossier"
                  >
                    <Printer className="size-3.5" /> Print / Save PDF
                  </button>
                </div>
                <span className="text-[10px] text-white/40 font-mono">
                  FDA Jan 2026 CDS Compliant
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
