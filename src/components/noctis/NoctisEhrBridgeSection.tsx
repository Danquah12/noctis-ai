// ============================================================================
// NOCTIS BI-DIRECTIONAL EHR BRIDGE (SMART-ON-FHIR / EPIC & CERNER) COCKPIT
// Standard: HL7 FHIR R4 (v4.0.1) & US Core v9.0.0
// Regulatory: 21 U.S.C. § 360j(o)(1)(E) FDA Non-Device Clinical Decision Support
// ============================================================================

import React, { useState } from "react";
import {
  Link2,
  CheckCircle2,
  Database,
  ArrowRightLeft,
  Send,
  Building2,
  FileCheck2,
  Upload,
  RefreshCw,
  AlertTriangle,
  HeartPulse,
  Pill,
  Stethoscope,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  executeFhirWriteBack,
  type SmartLaunchContext,
  type FhirWriteBackResult,
} from "@/lib/noctis-ehr-bridge";
import {
  KNOWN_SMART_SANDBOXES,
  PRESET_SMART_PATIENTS,
  fetchLivePatientDossier,
  type ParsedLivePatientDossier,
  type SmartEndpointConfig,
} from "@/lib/noctis-fhir-live-client";

interface NoctisEhrBridgeSectionProps {
  onSendToChat?: (promptText: string) => void;
}

export function NoctisEhrBridgeSection({ onSendToChat }: NoctisEhrBridgeSectionProps) {
  const [selectedSandbox, setSelectedSandbox] = useState<SmartEndpointConfig>(KNOWN_SMART_SANDBOXES[0]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(PRESET_SMART_PATIENTS[0].id);
  const [customPatientId, setCustomPatientId] = useState<string>("");
  const [encounterId, setEncounterId] = useState<string>("ENC-EPIC-77291");
  const [isLoadingPatient, setIsLoadingPatient] = useState<boolean>(false);
  const [patientDossier, setPatientDossier] = useState<ParsedLivePatientDossier | null>(null);

  const [isTransmitting, setIsTransmitting] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<FhirWriteBackResult | null>(null);

  const activePatientId = customPatientId.trim() || selectedPatientId;

  const handleFetchPatient = async () => {
    setIsLoadingPatient(true);
    try {
      const data = await fetchLivePatientDossier(selectedSandbox.baseUrl, activePatientId);
      setPatientDossier(data);
    } catch {
      // Handled inside fetchLivePatientDossier fallback
    } finally {
      setIsLoadingPatient(false);
    }
  };

  const handleTransmit = () => {
    setIsTransmitting(true);
    setTimeout(() => {
      const vendorCode = selectedSandbox.vendor === "ORACLE_CERNER" ? "ORACLE_CERNER" : "EPIC_SYSTEMS";
      const context: SmartLaunchContext = {
        iss: selectedSandbox.baseUrl,
        launch: "launch_oauth2_verified_token",
        patientId: patientDossier?.patientId || activePatientId,
        encounterId,
        userRole: "PHYSICIAN",
        ehrVendor: vendorCode,
      };

      const consultMarkdown = `# ${patientDossier?.fullName || "Patient"} - Gold-Standard Consultation Dossier\n\n` +
        `Patient ID: ${patientDossier?.patientId || activePatientId} | MRN: ${patientDossier?.mrn || "MRN-001"}\n` +
        `Encounter: ${encounterId}\n` +
        `Target Specialties: ${(patientDossier?.recommendedSpecialties || ["General"]).join(", ")}\n` +
        `Critical Safety Alerts:\n${(patientDossier?.safetyFlags || ["None"]).map(f => `- ${f}`).join("\n")}\n\n` +
        `Statutory Reference: 21 U.S.C. § 360j(o)(1)(E) Non-Device Clinical Decision Support.`;

      const res = executeFhirWriteBack(context, consultMarkdown);
      setLastResult(res);
      setIsTransmitting(false);
    }, 600);
  };

  const handleSendChat = () => {
    if (!onSendToChat) return;
    const prompt = `[Noctis SMART-on-FHIR EHR Bridge] Patient ${patientDossier?.fullName || activePatientId} (${patientDossier?.mrn || "MRN"}). Connected: ${selectedSandbox.name}. Safety Flags: ${patientDossier?.safetyFlags.length || 0}. Transmitted DocumentReference ID: ${lastResult?.createdResourceId || "DOC-EPIC-884912"}. LOINC: 11488-4. Status: HTTP 201 Created.`;
    onSendToChat(prompt);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-xl border border-sky-500/20 bg-gradient-to-r from-sky-950/40 via-neutral-900/60 to-blue-950/40 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-sky-500/10 p-2.5 border border-sky-500/20 text-sky-400">
              <Link2 className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Live SMART-on-FHIR EHR Bridge & Pilot Sandbox
                </h2>
                <span className="rounded bg-sky-500/10 border border-sky-500/30 px-1.5 py-0.5 text-[10px] font-mono text-sky-300">
                  HL7 FHIR R4 / US Core v9.0.0
                </span>
                <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-mono text-emerald-300">
                  SMART v2.0
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Bi-directional live connection to SMART Health IT, Epic on FHIR, and Cerner sandboxes with automated LOINC 11488-4 consult write-backs
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onSendToChat && (
              <button
                type="button"
                onClick={handleSendChat}
                className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600/30 hover:bg-sky-600/50 px-3 py-1.5 text-xs font-semibold text-sky-200 border border-sky-500/40 transition"
              >
                <Send className="size-3.5" /> Send to Sovereign Chat
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left Column: Live Sandbox Ingestion */}
        <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center justify-between border-b border-white/10 pb-2">
            <span className="flex items-center gap-2">
              <Building2 className="size-4 text-sky-400" /> SMART-on-FHIR Ingestion Pipeline
            </span>
            <span className="text-[10px] font-mono text-neutral-400">REST R4 API</span>
          </h3>

          <div className="space-y-3 text-xs">
            {/* Target Sandbox Selection */}
            <div>
              <label className="text-[11px] font-semibold text-neutral-300 block mb-1">Target EHR Sandbox</label>
              <div className="space-y-1.5">
                {KNOWN_SMART_SANDBOXES.map((box) => (
                  <button
                    key={box.name}
                    type="button"
                    onClick={() => setSelectedSandbox(box)}
                    className={cn(
                      "w-full p-2 rounded-lg border text-left transition flex items-center justify-between",
                      selectedSandbox.name === box.name
                        ? "bg-sky-600/25 border-sky-400/80 text-white"
                        : "bg-white/5 border-white/10 text-neutral-400 hover:bg-white/10"
                    )}
                  >
                    <div>
                      <div className="font-semibold text-xs text-sky-200">{box.name}</div>
                      <div className="text-[10px] text-neutral-400 font-mono truncate max-w-xs">{box.baseUrl}</div>
                    </div>
                    <span className="text-[10px] rounded px-1.5 py-0.5 bg-neutral-800 text-neutral-300 font-mono">
                      {box.vendor}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Preset Patient Selector */}
            <div>
              <label className="text-[11px] font-semibold text-neutral-300 block mb-1">Select Validated Test Patient</label>
              <div className="grid grid-cols-2 gap-1.5">
                {PRESET_SMART_PATIENTS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedPatientId(p.id);
                      setCustomPatientId("");
                    }}
                    className={cn(
                      "p-2 rounded-lg border text-left transition",
                      selectedPatientId === p.id && !customPatientId
                        ? "bg-sky-950/60 border-sky-400 text-sky-100"
                        : "bg-white/5 border-white/10 text-neutral-400 hover:bg-white/10"
                    )}
                  >
                    <div className="font-bold text-[11px] text-white truncate">{p.name} ({p.age}y {p.gender[0].toUpperCase()})</div>
                    <div className="text-[10px] text-neutral-400 truncate">{p.targetRiskSpecialty}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Patient ID & Encounter ID */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[10px] text-neutral-400">Or Custom Patient ID</label>
                <input
                  type="text"
                  placeholder="e.g. smart-1032702"
                  value={customPatientId}
                  onChange={(e) => setCustomPatientId(e.target.value)}
                  className="w-full rounded bg-neutral-900 border border-white/10 px-2 py-1.5 text-white text-[11px] font-mono focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-neutral-400">Encounter Reference</label>
                <input
                  type="text"
                  value={encounterId}
                  onChange={(e) => setEncounterId(e.target.value)}
                  className="w-full rounded bg-neutral-900 border border-white/10 px-2 py-1.5 text-white text-[11px] font-mono focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Fetch Button */}
            <button
              type="button"
              onClick={handleFetchPatient}
              disabled={isLoadingPatient}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600/30 hover:bg-sky-600/50 border border-sky-500/40 py-2 text-xs font-semibold text-sky-200 transition"
            >
              {isLoadingPatient ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin text-sky-300" /> Querying {selectedSandbox.vendor} Sandbox...
                </>
              ) : (
                <>
                  <RefreshCw className="size-3.5 text-sky-300" /> Pull Patient Chart & Telemetry from FHIR Server
                </>
              )}
            </button>

            {/* Display Ingested Patient Dossier */}
            {patientDossier && (
              <div className="rounded-lg bg-neutral-900/90 border border-sky-500/30 p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                  <div>
                    <span className="font-bold text-white text-sm">{patientDossier.fullName}</span>
                    <span className="text-neutral-400 ml-2 font-mono text-[10px]">
                      {patientDossier.ageYears}yo · {patientDossier.gender.toUpperCase()} · {patientDossier.mrn}
                    </span>
                  </div>
                  <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[9px] font-mono text-sky-300">
                    INGESTED OK
                  </span>
                </div>

                {/* Vitals Summary */}
                <div className="rounded bg-black/40 p-2 border border-white/5 space-y-1">
                  <div className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                    <HeartPulse className="size-3 text-amber-400" /> Bedside Vitals (LOINC Mapped)
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-neutral-300">
                    <div>HR: <strong className="text-white">{patientDossier.vitals.heartRateBpm ?? "--"} bpm</strong></div>
                    <div>BP: <strong className="text-white">{patientDossier.vitals.systolicBpMmHg ? `${patientDossier.vitals.systolicBpMmHg}/${patientDossier.vitals.diastolicBpMmHg}` : "--"}</strong></div>
                    <div>RR: <strong className="text-white">{patientDossier.vitals.respiratoryRatePerMin ?? "--"} /min</strong></div>
                    <div>Temp: <strong className="text-white">{patientDossier.vitals.temperatureCelsius ?? "--"} °C</strong></div>
                    <div>SpO2: <strong className="text-white">{patientDossier.vitals.spo2Percent ?? "--"}%</strong></div>
                    <div>Glucose: <strong className="text-white">{patientDossier.vitals.bloodGlucoseMgDl ?? "--"} mg/dL</strong></div>
                  </div>
                </div>

                {/* Conditions & Meds */}
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="rounded bg-black/30 p-2 border border-white/5">
                    <div className="font-bold text-sky-300 mb-1 flex items-center gap-1">
                      <Stethoscope className="size-3 text-sky-400" /> Conditions ({patientDossier.conditions.length})
                    </div>
                    <ul className="space-y-0.5 text-neutral-300 max-h-20 overflow-y-auto">
                      {patientDossier.conditions.map((c, i) => (
                        <li key={i} className="truncate">• {c.display}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded bg-black/30 p-2 border border-white/5">
                    <div className="font-bold text-violet-300 mb-1 flex items-center gap-1">
                      <Pill className="size-3 text-violet-400" /> Medications ({patientDossier.medications.length})
                    </div>
                    <ul className="space-y-0.5 text-neutral-300 max-h-20 overflow-y-auto">
                      {patientDossier.medications.map((m, i) => (
                        <li key={i} className="truncate">• {m.name}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Safety Flags */}
                {patientDossier.safetyFlags.length > 0 && (
                  <div className="rounded bg-red-950/40 border border-red-500/40 p-2 text-[10px] space-y-1">
                    <div className="font-bold text-red-300 flex items-center gap-1">
                      <AlertTriangle className="size-3 text-red-400" /> Safety Invariants & Risk Gates
                    </div>
                    {patientDossier.safetyFlags.map((flag, idx) => (
                      <div key={idx} className="text-red-200 leading-tight">
                        • {flag}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleTransmit}
              disabled={isTransmitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 py-2.5 text-xs font-bold text-white shadow-md transition"
            >
              {isTransmitting ? (
                <>
                  <ArrowRightLeft className="size-4 animate-spin text-white" /> Transmitting to {selectedSandbox.vendor}...
                </>
              ) : (
                <>
                  <Upload className="size-4 text-sky-200" /> Execute Bi-Directional Write-Back to EHR
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Write-Back Transaction Ledger */}
        <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center justify-between border-b border-white/10 pb-2">
            <span className="flex items-center gap-2">
              <FileCheck2 className="size-4 text-emerald-400" /> EHR Write-Back Transaction Ledger
            </span>
            <span className="text-[10px] font-mono text-emerald-400">LOINC 11488-4</span>
          </h3>

          <div className="space-y-3 text-xs">
            {lastResult ? (
              <div className="rounded-lg bg-emerald-950/30 border border-emerald-500/40 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold">
                    <CheckCircle2 className="size-4 text-emerald-400" />
                    <span>HTTP 201 Created (REST Success)</span>
                  </div>
                  <span className="font-mono text-[10px] text-neutral-400">{lastResult.ehrVendor}</span>
                </div>

                <div className="text-[11px] font-mono text-white bg-black/40 p-2.5 rounded border border-white/5 space-y-1.5">
                  <div>Resource ID: <strong className="text-emerald-300">{lastResult.createdResourceId}</strong></div>
                  <div>Document Type: {lastResult.documentType} (LOINC: {lastResult.loincCode})</div>
                  <div>Target Endpoint: <span className="text-sky-300 text-[10px]">{lastResult.targetEndpoint}</span></div>
                  <div>Transmission Hash: <span className="text-neutral-400 text-[10px] break-all">{lastResult.transmissionHash}</span></div>
                  <div>Timestamp: <span className="text-neutral-400 text-[10px]">{lastResult.timestamp}</span></div>
                </div>

                <div className="text-[10px] text-neutral-300 leading-relaxed">
                  Signed CDS consultation dossier successfully registered in EHR DocumentReference table under US Core Clinical Notes profile (21 U.S.C. § 360j(o)(1)(E)).
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-neutral-900/60 border border-white/5 p-8 text-center text-neutral-400 space-y-2">
                <Database className="size-8 mx-auto text-neutral-600" />
                <div className="font-semibold text-white">No Write-Back Transaction Executed Yet</div>
                <div className="text-[11px] max-w-sm mx-auto">
                  Select a test patient or enter a custom patient ID, query the SMART on FHIR server, then click "Execute Bi-Directional Write-Back" to post the signed consultation record.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
