import React, { useState, useMemo } from "react";
import {
  Layers,
  Search,
  ShieldAlert,
  AlertTriangle,
  Volume2,
  Square,
  Sparkles,
  Send,
  Check,
  FileCode,
  Tag,
  Stethoscope,
  Activity,
  ArrowRight,
  Database,
  Building2,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import {
  searchClinicalCrosswalk,
  auditMedicalDecisionMaking,
  formatOntologySpokenSummary,
  CURATED_CROSSWALK_CATALOG,
  type ClinicalCrosswalkRecord,
  type MdmLevel,
} from "@/lib/noctis-clinical-ontology.ts";
import { speakNoctisVoice, stopCurrentVoicePlayback } from "@/lib/noctis-voice.ts";

interface NoctisOntologySectionProps {
  onSendToChat?: (promptText: string) => void;
}

export function NoctisOntologySection({ onSendToChat }: NoctisOntologySectionProps) {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedRecordKey, setSelectedRecordKey] = useState<string>("acute-stemi");

  // 2023 AMA E/M MDM Auditor Inputs
  const [problemsComplexity, setProblemsComplexity] = useState<MdmLevel>("HIGH");
  const [dataComplexity, setDataComplexity] = useState<MdmLevel>("MODERATE");
  const [riskOfComplications, setRiskOfComplications] = useState<MdmLevel>("HIGH");
  const [claimedCptCode, setClaimedCptCode] = useState<string>("99285");
  const [testHighAlertMedMissing, setTestHighAlertMedMissing] = useState<boolean>(false);

  // Voice state
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Selected crosswalk record
  const selectedRecord = useMemo<ClinicalCrosswalkRecord>(() => {
    return CURATED_CROSSWALK_CATALOG[selectedRecordKey] || CURATED_CROSSWALK_CATALOG["acute-stemi"];
  }, [selectedRecordKey]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return searchClinicalCrosswalk(searchQuery);
  }, [searchQuery]);

  // Compute live MDM Audit
  const mdmAudit = useMemo(() => {
    const meds = testHighAlertMedMissing
      ? [{ name: "Insulin Regular IV Infusion", rxcui: undefined, doseUnit: undefined }]
      : selectedRecord.rxnorm
      ? [{ name: selectedRecord.rxnorm.name, rxcui: selectedRecord.rxnorm.rxcui, doseUnit: "Standard" }]
      : [];

    return auditMedicalDecisionMaking({
      problemsComplexity,
      problemsRationale: `${selectedRecord.clinicalTerm} presenting acutely`,
      dataComplexity,
      dataRationale: `Reviewed ${selectedRecord.loinc?.component || "diagnostic tests"} and diagnostic telemetry`,
      riskOfComplications,
      riskRationale: `Parenteral therapy, intervention, or critical monitoring`,
      claimedCptCode,
      medicationsOrdered: meds,
    });
  }, [
    problemsComplexity,
    dataComplexity,
    riskOfComplications,
    claimedCptCode,
    selectedRecord,
    testHighAlertMedMissing,
  ]);

  // Voice Read Aloud
  const handleToggleVoice = async () => {
    if (isSpeaking) {
      stopCurrentVoicePlayback();
      setIsSpeaking(false);
      return;
    }

    const script = formatOntologySpokenSummary(selectedRecord, mdmAudit);
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
    const prompt = `[Noctis Clinical Ontology & MDM Auditor - ${selectedRecord.clinicalTerm}] Validate multi-standard crosswalk: SNOMED-CT ${selectedRecord.snomed.conceptId} (${selectedRecord.snomed.term}), ICD-10-CM ${selectedRecord.icd10.code} (${selectedRecord.icd10.description}), RxNorm RxCUI ${selectedRecord.rxnorm?.rxcui || "N/A"} (${selectedRecord.rxnorm?.name || "N/A"}), LOINC ${selectedRecord.loinc?.code || "N/A"} (${selectedRecord.loinc?.component || "N/A"}). 2023 AMA MDM Audit: Problems=${problemsComplexity}, Data=${dataComplexity}, Risk=${riskOfComplications} -> Overall MDM ${mdmAudit.overallMdmLevel} (Supported CPT ${mdmAudit.supportedEmCode}, Claimed CPT ${claimedCptCode}). Invariants Tripped: ${mdmAudit.trippedInvariants.join(", ") || "None"}.`;
    onSendToChat(prompt);
  };

  return (
    <div className="space-y-6">
      {/* Executive Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-teal-500/30 bg-gradient-to-r from-teal-950/40 via-emerald-950/20 to-black/60 p-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded bg-teal-500/20 border border-teal-500/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-teal-300">
              <Layers className="size-3 text-teal-400" /> Semantic Ontology
            </span>
            <span className="rounded bg-violet-600/30 border border-violet-500/40 px-2 py-0.5 text-[10px] font-bold text-violet-300">
              USCDI v4
            </span>
            <span className="rounded bg-emerald-600/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
              2023 AMA CPT E/M Guidelines
            </span>
          </div>
          <h2 className="text-lg font-bold tracking-tight text-white mt-1">
            Clinical Ontologies & Semantic Terminology Crosswalk
          </h2>
          <p className="text-xs text-white/60">
            Bi-directional semantic mapping across SNOMED-CT, RxNorm (RxCUI), LOINC, ICD-10-CM & 2023 AMA CPT E/M MDM Auditor.
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
                : "bg-teal-600/30 hover:bg-teal-600/50 text-teal-200 border-teal-500/40"
            )}
          >
            {isSpeaking ? (
              <>
                <Square className="size-3.5 fill-current text-amber-300" /> Stop Readout
              </>
            ) : (
              <>
                <Volume2 className="size-3.5 text-teal-300" /> Read Aloud (Full Codes)
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
          Clinical Conditions:
        </span>
        {Object.entries(CURATED_CROSSWALK_CATALOG).map(([key, item]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setSelectedRecordKey(key);
              stopCurrentVoicePlayback();
              setIsSpeaking(false);
            }}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition border",
              selectedRecordKey === key
                ? "bg-teal-950/60 border-teal-500/60 text-teal-200 shadow-sm"
                : "bg-black/30 border-white/10 text-white/70 hover:bg-white/5"
            )}
          >
            {item.clinicalTerm}
          </button>
        ))}
      </div>

      {/* Tripped Invariants Banner */}
      {mdmAudit.trippedInvariants.length > 0 && (
        <div className="rounded-xl border border-rose-500/50 bg-rose-950/30 p-4 space-y-2">
          <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
            <ShieldAlert className="size-4 text-rose-400 animate-pulse" />
            CRITICAL ONTOLOGY & CODING INTEGRITY VETO TRIPPED ({mdmAudit.trippedInvariants.join(", ")})
          </div>
          <div className="space-y-1.5 text-xs text-rose-200/90">
            {mdmAudit.mandatoryActions.map((action, i) => (
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
        {/* Left Column: Multi-Standard Crosswalk Card */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-2">
                <Database className="size-4" /> Multi-Standard Ontological Crosswalk
              </h3>
              <span className="text-[10px] text-white/50 font-mono">USCDI v4 Terminology</span>
            </div>

            {/* Condition Header */}
            <div className="rounded-lg bg-teal-950/30 border border-teal-500/30 p-3">
              <div className="text-[10px] uppercase font-bold text-teal-300">Clinical Presentation Concept</div>
              <div className="text-sm font-bold text-white mt-0.5">{selectedRecord.clinicalTerm}</div>
            </div>

            {/* 4 Multi-Terminology Standard Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* SNOMED-CT */}
              <div className="rounded-lg bg-black/60 border border-emerald-500/30 p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">SNOMED-CT</span>
                  <span className="rounded bg-emerald-500/20 text-[9px] font-bold text-emerald-300 px-1.5 py-0.2">
                    {selectedRecord.snomed.semanticTag}
                  </span>
                </div>
                <div className="text-xs font-mono font-bold text-white">ID: {selectedRecord.snomed.conceptId}</div>
                <div className="text-[11px] text-white/70 leading-snug">{selectedRecord.snomed.term}</div>
              </div>

              {/* ICD-10-CM */}
              <div className="rounded-lg bg-black/60 border border-cyan-500/30 p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">ICD-10-CM</span>
                  <span className="rounded bg-cyan-500/20 text-[9px] font-bold text-cyan-300 px-1.5 py-0.2">
                    {selectedRecord.icd10.billable ? "BILLABLE" : "NON-BILLABLE"}
                  </span>
                </div>
                <div className="text-xs font-mono font-bold text-white">Code: {selectedRecord.icd10.code}</div>
                <div className="text-[11px] text-white/70 leading-snug">{selectedRecord.icd10.description}</div>
                {selectedRecord.icd10.hccCategory && (
                  <div className="text-[9px] text-amber-300/80 font-mono pt-1">
                    {selectedRecord.icd10.hccCategory}
                  </div>
                )}
              </div>

              {/* RxNorm */}
              {selectedRecord.rxnorm && (
                <div className="rounded-lg bg-black/60 border border-violet-500/30 p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">RxNorm</span>
                    {selectedRecord.rxnorm.highAlert && (
                      <span className="rounded bg-rose-500/20 text-[9px] font-bold text-rose-300 px-1.5 py-0.2">
                        HIGH ALERT
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-mono font-bold text-white">RxCUI: {selectedRecord.rxnorm.rxcui}</div>
                  <div className="text-[11px] text-white/70 leading-snug">{selectedRecord.rxnorm.name}</div>
                </div>
              )}

              {/* LOINC */}
              {selectedRecord.loinc && (
                <div className="rounded-lg bg-black/60 border border-amber-500/30 p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">LOINC Lab Code</span>
                    <span className="rounded bg-amber-500/20 text-[9px] font-bold text-amber-300 px-1.5 py-0.2">
                      {selectedRecord.loinc.scaleType}
                    </span>
                  </div>
                  <div className="text-xs font-mono font-bold text-white">Code: {selectedRecord.loinc.code}</div>
                  <div className="text-[11px] text-white/70 leading-snug">{selectedRecord.loinc.component} ({selectedRecord.loinc.system})</div>
                </div>
              )}
            </div>

            {/* Test Safety Override Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setTestHighAlertMedMissing(!testHighAlertMedMissing)}
                className={cn(
                  "rounded px-2.5 py-1 text-[11px] font-semibold border transition",
                  testHighAlertMedMissing
                    ? "bg-rose-600/30 border-rose-500/50 text-rose-300"
                    : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                )}
              >
                {testHighAlertMedMissing ? "Reset Medication Test" : "Probe CF-ONTO-001 (Missing RxCUI)"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setProblemsComplexity("LOW");
                  setDataComplexity("STRAIGHTFORWARD");
                  setRiskOfComplications("LOW");
                  setClaimedCptCode("99285"); // Deliberate upcode
                }}
                className="rounded bg-amber-600/20 border border-amber-500/40 px-2.5 py-1 text-[11px] font-semibold text-amber-300 hover:bg-amber-600/30 transition"
              >
                Probe CF-ONTO-003 (Upcoding Violation)
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: 2023 AMA E/M MDM Auditor */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-2">
                <Stethoscope className="size-4" /> 2023 AMA E/M MDM Auditor
              </h3>
              <span className="text-[10px] text-emerald-400 font-mono">2 of 3 Rule</span>
            </div>

            {/* 3 Categories Selectors */}
            <div className="space-y-3">
              {/* Category 1: Number & Complexity of Problems */}
              <div>
                <label className="text-[10px] font-bold text-white/60 uppercase">1. Problems Addressed</label>
                <div className="grid grid-cols-4 gap-1 mt-1">
                  {(["STRAIGHTFORWARD", "LOW", "MODERATE", "HIGH"] as MdmLevel[]).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setProblemsComplexity(lvl)}
                      className={cn(
                        "py-1 text-[10px] font-semibold rounded border transition",
                        problemsComplexity === lvl
                          ? "bg-teal-600 text-white border-teal-500"
                          : "bg-white/5 text-white/60 border-white/10"
                      )}
                    >
                      {lvl.slice(0, 4)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category 2: Data Complexity */}
              <div>
                <label className="text-[10px] font-bold text-white/60 uppercase">2. Amount / Complexity of Data</label>
                <div className="grid grid-cols-4 gap-1 mt-1">
                  {(["STRAIGHTFORWARD", "LOW", "MODERATE", "HIGH"] as MdmLevel[]).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setDataComplexity(lvl)}
                      className={cn(
                        "py-1 text-[10px] font-semibold rounded border transition",
                        dataComplexity === lvl
                          ? "bg-teal-600 text-white border-teal-500"
                          : "bg-white/5 text-white/60 border-white/10"
                      )}
                    >
                      {lvl.slice(0, 4)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category 3: Risk of Complications */}
              <div>
                <label className="text-[10px] font-bold text-white/60 uppercase">3. Risk of Complications / Morbidity</label>
                <div className="grid grid-cols-4 gap-1 mt-1">
                  {(["STRAIGHTFORWARD", "LOW", "MODERATE", "HIGH"] as MdmLevel[]).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setRiskOfComplications(lvl)}
                      className={cn(
                        "py-1 text-[10px] font-semibold rounded border transition",
                        riskOfComplications === lvl
                          ? "bg-teal-600 text-white border-teal-500"
                          : "bg-white/5 text-white/60 border-white/10"
                      )}
                    >
                      {lvl.slice(0, 4)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Claimed CPT Code */}
              <div className="pt-2 border-t border-white/10">
                <div className="flex justify-between items-center text-[10px] font-bold text-white/60 uppercase">
                  <span>Claimed Emergency Department CPT</span>
                  <span className="text-teal-300 font-mono">CPT {claimedCptCode}</span>
                </div>
                <div className="grid grid-cols-4 gap-1 mt-1">
                  {["99282", "99283", "99284", "99285"].map((cpt) => (
                    <button
                      key={cpt}
                      type="button"
                      onClick={() => setClaimedCptCode(cpt)}
                      className={cn(
                        "py-1 text-xs font-semibold font-mono rounded border transition",
                        claimedCptCode === cpt
                          ? "bg-violet-600 text-white border-violet-500"
                          : "bg-white/5 text-white/60 border-white/10"
                      )}
                    >
                      {cpt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Audit Results HUD */}
            <div className={cn(
              "rounded-xl border p-3.5 space-y-2",
              mdmAudit.upcodingDetected
                ? "bg-rose-950/40 border-rose-500/50"
                : "bg-teal-950/30 border-teal-500/40"
            )}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-white/80">Audit Finding</span>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-bold font-mono",
                  mdmAudit.upcodingDetected
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                )}>
                  {mdmAudit.upcodingDetected ? "UPCODING REJECTED" : "COMPLIANT"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                <div>
                  <div className="text-[9px] text-white/50">Overall MDM Level</div>
                  <div className="font-bold text-white">{mdmAudit.overallMdmLevel}</div>
                </div>
                <div>
                  <div className="text-[9px] text-white/50">Supported CPT Code</div>
                  <div className="font-bold text-emerald-300">{mdmAudit.supportedEmCode}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
