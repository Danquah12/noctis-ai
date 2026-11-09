import React, { useState, useMemo } from "react";
import {
  Link2,
  Server,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Download,
  Send,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Check,
  Copy,
  Volume2,
  Square,
  Activity,
  Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SMART_ENDPOINTS,
  CURATED_SANDBOX_PATIENTS,
  type SmartEhrEndpoint,
  type SmartSandboxPatient,
  buildSmartAuthorizeUrl,
  mapFhirPatientToClinicalCase,
  generateFhirDocumentReferencePayload,
} from "@/lib/noctis-smart-fhir.ts";
import { downloadBlob } from "@/lib/noctis-clinical-export.ts";
import { speakNoctisVoice, stopCurrentVoicePlayback } from "@/lib/noctis-voice.ts";

interface NoctisSmartFhirSectionProps {
  onSendToChat?: (promptText: string) => void;
}

export function NoctisSmartFhirSection({ onSendToChat }: NoctisSmartFhirSectionProps) {
  const [selectedEndpointKey, setSelectedEndpointKey] = useState<"epic" | "cerner" | "custom">("epic");
  const [selectedPatientId, setSelectedPatientId] = useState<string>("epic-pat-stroke-01");
  const [activeCodeTab, setActiveCodeTab] = useState<"docref" | "vitals_bundle" | "note">("docref");
  const [writeBackSuccess, setWriteBackSuccess] = useState<boolean>(false);
  const [isWritingBack, setIsWritingBack] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  const endpoint: SmartEhrEndpoint = SMART_ENDPOINTS[selectedEndpointKey];

  const activePatient: SmartSandboxPatient = useMemo(() => {
    return (
      CURATED_SANDBOX_PATIENTS.find((p) => p.id === selectedPatientId) ||
      CURATED_SANDBOX_PATIENTS[0]
    );
  }, [selectedPatientId]);

  const clinicalCase = useMemo(() => {
    return mapFhirPatientToClinicalCase(activePatient);
  }, [activePatient]);

  const docRefPayload = useMemo(() => {
    return generateFhirDocumentReferencePayload({
      patient: activePatient,
      consultationNoteMarkdown: clinicalCase.sampleModelResponse,
      practitionerName: "Noctis Sovereign CDS Assistant, MD",
    });
  }, [activePatient, clinicalCase]);

  const sampleVitalsBundle = useMemo(() => {
    return {
      resourceType: "Bundle",
      type: "searchset",
      total: 6,
      entry: [
        {
          resource: {
            resourceType: "Observation",
            id: "obs-bp",
            status: "final",
            code: {
              coding: [{ system: "http://loinc.org", code: "85354-9", display: "Blood pressure panel" }],
            },
            subject: { reference: `Patient/${activePatient.id}` },
            component: [
              {
                code: { coding: [{ system: "http://loinc.org", code: "8480-6", display: "Systolic blood pressure" }] },
                valueQuantity: { value: parseInt(activePatient.vitals.bloodPressure.split("/")[0], 10), unit: "mmHg" },
              },
              {
                code: { coding: [{ system: "http://loinc.org", code: "8462-4", display: "Diastolic blood pressure" }] },
                valueQuantity: { value: parseInt(activePatient.vitals.bloodPressure.split("/")[1], 10), unit: "mmHg" },
              },
            ],
          },
        },
        {
          resource: {
            resourceType: "Observation",
            id: "obs-hr",
            status: "final",
            code: { coding: [{ system: "http://loinc.org", code: "8867-4", display: "Heart rate" }] },
            valueQuantity: { value: activePatient.vitals.heartRateBpm, unit: "beats/minute" },
          },
        },
        {
          resource: {
            resourceType: "Observation",
            id: "obs-glu",
            status: "final",
            code: { coding: [{ system: "http://loinc.org", code: "2339-0", display: "Glucose [Mass/volume] in Blood" }] },
            valueQuantity: { value: activePatient.vitals.bloodGlucoseMgDl, unit: "mg/dL" },
          },
        },
      ],
    };
  }, [activePatient]);

  const activeCodeContent = useMemo(() => {
    switch (activeCodeTab) {
      case "docref":
        return JSON.stringify(docRefPayload, null, 2);
      case "vitals_bundle":
        return JSON.stringify(sampleVitalsBundle, null, 2);
      case "note":
        return clinicalCase.sampleModelResponse;
    }
  }, [activeCodeTab, docRefPayload, sampleVitalsBundle, clinicalCase]);

  // Simulate writing signed consultation back to EHR
  const handleWriteBackToEhr = () => {
    setIsWritingBack(true);
    setTimeout(() => {
      setIsWritingBack(false);
      setWriteBackSuccess(true);
      setTimeout(() => setWriteBackSuccess(false), 5000);
    }, 900);
  };

  const handleCopyCode = () => {
    void navigator.clipboard.writeText(activeCodeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleVoice = () => {
    if (isSpeaking) {
      stopCurrentVoicePlayback();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    void speakNoctisVoice(clinicalCase.sampleModelResponse, "maple", {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
    }).then((ok) => {
      if (!ok) setIsSpeaking(false);
    });
  };

  const handleSendChat = () => {
    if (!onSendToChat) return;
    const prompt = `[SMART on FHIR Patient Consultation — ${activePatient.vendor} EHR] Ingested MRN ${activePatient.mrn}: ${activePatient.name}, ${activePatient.ageYears}yo ${activePatient.gender}. CC: "${activePatient.chiefComplaint}". Bedside Vitals: BP ${activePatient.vitals.bloodPressure}, HR ${activePatient.vitals.heartRateBpm} bpm, Glucose ${activePatient.vitals.bloodGlucoseMgDl} mg/dL. Active Problems: ${activePatient.activeConditions.map((c) => c.display).join("; ")}. Please execute full Noctis specialist CDS consultation.`;
    onSendToChat(prompt);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-blue-500/30 bg-blue-950/20 p-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-blue-500/20 border border-blue-500/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-300">
              <Link2 className="size-3 text-blue-400" /> SMART on FHIR R4
            </span>
            <span className="rounded bg-violet-600/30 border border-violet-500/40 px-2 py-0.5 text-[10px] font-bold text-violet-300">
              US Core v9.0.0
            </span>
            <span className="rounded bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
              OAuth 2.0 PKCE Active
            </span>
          </div>
          <h2 className="text-base font-bold text-white mt-1">
            Epic & Cerner SMART on FHIR Live Sandbox Connector
          </h2>
          <p className="text-xs text-white/60">
            Bidirectional electronic health record integration conforming to ONC 2026 § 170.315(g)(10). Ingest live LOINC vitals and export signed CDS consultation notes as FHIR DocumentReferences.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleToggleVoice}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition shadow-sm border",
              isSpeaking
                ? "bg-amber-500/30 text-amber-300 border-amber-500/50"
                : "bg-white/10 hover:bg-white/20 text-white border-white/20"
            )}
          >
            {isSpeaking ? (
              <>
                <Square className="size-3.5 fill-current text-amber-300" /> Stop
              </>
            ) : (
              <>
                <Volume2 className="size-3.5 text-amber-400" /> Read Dossier
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleWriteBackToEhr}
            disabled={isWritingBack}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs font-bold text-white transition shadow-sm"
          >
            <ShieldCheck className="size-3.5" />
            {isWritingBack ? "Transmitting..." : "Write-Back to EHR (FHIR)"}
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {writeBackSuccess && (
        <div className="rounded-xl border border-emerald-500/50 bg-emerald-950/40 p-3 text-xs text-emerald-200 flex items-center justify-between shadow-lg animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Success:</strong> Signed CDS Consultation Note committed to{" "}
              <strong>{endpoint.name}</strong> as <code className="text-emerald-300 font-mono">DocumentReference/{docRefPayload.id}</code> (HTTP 201 Created).
            </span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400">
            {new Date().toLocaleTimeString()}
          </span>
        </div>
      )}

      {/* EHR Server Endpoint Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-white/10 bg-white/[0.02]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-white/60 flex items-center gap-1">
            <Server className="size-3.5 text-blue-400" /> EHR Endpoint:
          </span>
          {(["epic", "cerner", "custom"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedEndpointKey(key)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-[11px] font-semibold transition border",
                selectedEndpointKey === key
                  ? "bg-blue-600/30 border-blue-500/60 text-blue-200"
                  : "bg-black/20 border-white/10 text-white/70 hover:bg-white/5"
              )}
            >
              {SMART_ENDPOINTS[key].name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono text-white/60">
          <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{endpoint.fhirBaseUrl}</span>
        </div>
      </div>

      {/* Patient Selector Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {CURATED_SANDBOX_PATIENTS.map((p) => {
          const isSelected = p.id === selectedPatientId;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedPatientId(p.id)}
              className={cn(
                "rounded-xl border p-3 text-left transition space-y-1.5",
                isSelected
                  ? "border-blue-500/60 bg-blue-950/30 ring-1 ring-blue-500/40"
                  : "border-white/10 bg-white/[0.02] hover:bg-white/5"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white truncate mr-2">{p.name}</span>
                <span className="rounded bg-blue-500/20 border border-blue-500/40 px-1.5 py-0.2 text-[9px] font-mono font-bold text-blue-300">
                  {p.vendor}
                </span>
              </div>
              <div className="text-[11px] text-white/60">
                {p.ageYears}yo {p.gender} · <span className="font-mono text-[10px] text-white/40">{p.mrn}</span>
              </div>
              <div className="text-[11px] text-zinc-300 truncate" title={p.chiefComplaint}>
                "{p.chiefComplaint}"
              </div>
              <div className="text-[10px] font-mono text-emerald-400">
                BP {p.vitals.bloodPressure} · Glu {p.vitals.bloodGlucoseMgDl}
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Workstation 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Ingested EHR Patient Profile (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <UserCheck className="size-3.5 text-blue-400" /> Ingested EHR Patient Chart
              </h3>
              <span className="text-[10px] font-mono text-white/40">{activePatient.mrn}</span>
            </div>

            {/* Demographics Card */}
            <div className="rounded-lg bg-black/40 p-3 border border-white/5 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-white/50">Full Name:</span>
                <span className="font-bold text-white">{activePatient.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Age / Biological Sex:</span>
                <span className="text-white font-medium">{activePatient.ageYears} years · {activePatient.gender}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">EHR System:</span>
                <span className="font-mono text-blue-300 font-semibold">{activePatient.vendor} on FHIR</span>
              </div>
              <div className="pt-1.5 border-t border-white/10 text-[11px] text-white/90">
                <span className="text-white/50 block mb-0.5">Presenting Chief Complaint:</span>
                "{activePatient.chiefComplaint}"
              </div>
            </div>

            {/* Vitals Panel with LOINC Codes */}
            <div className="rounded-lg bg-black/40 p-3 border border-white/5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/40 uppercase font-bold flex items-center gap-1">
                  <Heart className="size-3 text-rose-400" /> LOINC-Codified Vitals Panel
                </span>
                <span className="text-[9px] font-mono text-white/40">LOINC 85354-9</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center font-mono text-[11px]">
                <div className="rounded bg-white/[0.03] p-1.5 border border-white/5">
                  <div className="text-[9px] text-white/40">BP (8480-6)</div>
                  <div className="font-bold text-white">{activePatient.vitals.bloodPressure}</div>
                </div>
                <div className="rounded bg-white/[0.03] p-1.5 border border-white/5">
                  <div className="text-[9px] text-white/40">HR (8867-4)</div>
                  <div className="font-bold text-white">{activePatient.vitals.heartRateBpm} bpm</div>
                </div>
                <div className="rounded bg-white/[0.03] p-1.5 border border-white/5">
                  <div className="text-[9px] text-white/40">Glucose (2339-0)</div>
                  <div className="font-bold text-amber-300">{activePatient.vitals.bloodGlucoseMgDl} mg/dL</div>
                </div>
              </div>
            </div>

            {/* Active Problems / Conditions */}
            <div>
              <div className="text-[10px] text-white/40 uppercase font-bold mb-1.5">
                Active Problems & Comorbidities (FHIR Condition)
              </div>
              <div className="space-y-1">
                {activePatient.activeConditions.map((cond, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded bg-black/30 p-2 text-[11px] border border-white/5">
                    <span className="text-white/90 truncate mr-2">{cond.display}</span>
                    <span className="shrink-0 rounded bg-violet-500/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-violet-300">
                      {cond.code}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Medications */}
            <div>
              <div className="text-[10px] text-white/40 uppercase font-bold mb-1.5">
                Current Medications (FHIR MedicationRequest)
              </div>
              <div className="space-y-1">
                {activePatient.medications.map((med, idx) => (
                  <div key={idx} className="rounded bg-black/30 p-1.5 text-[11px] text-zinc-300 border border-white/5">
                    {med}
                  </div>
                ))}
              </div>
            </div>

            {onSendToChat && (
              <button
                type="button"
                onClick={handleSendChat}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 p-2 text-xs font-semibold text-blue-200 transition"
              >
                <Send className="size-3" /> Transmit Chart to Sovereign Chat for Specialist Consult
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Code & FHIR Resource Inspector (7 Cols) */}
        <div className="lg:col-span-7 rounded-xl border border-white/10 bg-white/[0.02] p-4 flex flex-col space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
            {/* Tabs */}
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveCodeTab("docref")}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-semibold transition",
                  activeCodeTab === "docref" ? "bg-blue-600 text-white" : "bg-white/5 text-white/60 hover:bg-white/10"
                )}
              >
                <FileCode className="size-3 inline mr-1" /> FHIR DocumentReference (Write-Back)
              </button>
              <button
                type="button"
                onClick={() => setActiveCodeTab("vitals_bundle")}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-semibold transition",
                  activeCodeTab === "vitals_bundle" ? "bg-blue-600 text-white" : "bg-white/5 text-white/60 hover:bg-white/10"
                )}
              >
                <Activity className="size-3 inline mr-1" /> FHIR Observations Bundle (Ingest)
              </button>
              <button
                type="button"
                onClick={() => setActiveCodeTab("note")}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-semibold transition",
                  activeCodeTab === "note" ? "bg-blue-600 text-white" : "bg-white/5 text-white/60 hover:bg-white/10"
                )}
              >
                <Sparkles className="size-3 inline mr-1" /> CDS Consultation Dossier
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1 rounded bg-white/5 hover:bg-white/10 px-2 py-1 text-[11px] text-white/80 border border-white/10 transition"
              >
                {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                {copied ? "Copied" : "Copy"}
              </button>

              <button
                type="button"
                onClick={() => {
                  const filename = activeCodeTab === "note" ? `${activePatient.id}_Dossier.md` : `${activePatient.id}_FHIR.json`;
                  const mime = activeCodeTab === "note" ? "text/markdown" : "application/json";
                  downloadBlob(filename, activeCodeContent, mime);
                }}
                className="inline-flex items-center gap-1 rounded bg-white/5 hover:bg-white/10 px-2 py-1 text-[11px] text-white/80 border border-white/10 transition"
              >
                <Download className="size-3" /> Export
              </button>
            </div>
          </div>

          {/* Code Body */}
          <div className="flex-1 min-h-[420px] max-h-[550px] overflow-auto rounded-lg bg-black/60 border border-white/5 p-3.5 font-mono text-[11px] text-zinc-300 leading-relaxed">
            <pre className="whitespace-pre">{activeCodeContent}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
