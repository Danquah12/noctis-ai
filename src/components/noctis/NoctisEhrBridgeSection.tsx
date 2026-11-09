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
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  executeFhirWriteBack,
  type SmartLaunchContext,
  type FhirWriteBackResult,
} from "@/lib/noctis-ehr-bridge";

interface NoctisEhrBridgeSectionProps {
  onSendToChat?: (promptText: string) => void;
}

export function NoctisEhrBridgeSection({ onSendToChat }: NoctisEhrBridgeSectionProps) {
  const [ehrVendor, setEhrVendor] = useState<"EPIC_SYSTEMS" | "ORACLE_CERNER">("EPIC_SYSTEMS");
  const [patientMrn, setPatientMrn] = useState<string>("MRN-883921");
  const [patientName, setPatientName] = useState<string>("Eleanor Vance (68yo F)");
  const [encounterId, setEncounterId] = useState<string>("ENC-EPIC-77291");
  const [isTransmitting, setIsTransmitting] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<FhirWriteBackResult | null>(null);

  const sampleDossierMarkdown = `# Acute Ischemic Stroke Gold-Standard Consultation Dossier\n\nPatient: Eleanor Vance (68yo F)\nEncounter: ENC-EPIC-77291\nOnset: 75 minutes ago at 08:30.\nNIHSS: 16.\nPrimary Diagnosis: Acute Ischemic Cerebral Infarction (ICD-10: I63.9).\nCritical Actions: IV Tenecteplase 0.25 mg/kg bolus administered; Stat transfer to Neuro-Interventional Cath Lab for Endovascular Mechanical Thrombectomy.\nSafety Invariants: Blood pressure maintained < 185/110 mmHg via IV Nicardipine titration. Anticoagulants locked out for 24h.\nStatutory Justification: 21 U.S.C. § 360j(o)(1)(E) Non-Device CDS.`;

  const handleTransmit = () => {
    setIsTransmitting(true);
    setTimeout(() => {
      const context: SmartLaunchContext = {
        iss: ehrVendor === "EPIC_SYSTEMS"
          ? "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4"
          : "https://fhir-ehr-code.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d",
        launch: "launch_oauth2_verified_token",
        patientId: patientMrn,
        encounterId,
        userRole: "PHYSICIAN",
        ehrVendor,
      };
      const res = executeFhirWriteBack(context, sampleDossierMarkdown);
      setLastResult(res);
      setIsTransmitting(false);
    }, 600);
  };

  const handleSendChat = () => {
    if (!onSendToChat) return;
    const prompt = `[Noctis SMART-on-FHIR EHR Bridge] Encounter ${encounterId} (${ehrVendor}). Transmitted DocumentReference ID: ${lastResult?.createdResourceId || "DOC-EPIC-884912"}. LOINC: 11488-4. Status: HTTP 201 Created.`;
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
                  Bi-Directional EHR Bridge (SMART-on-FHIR / Epic & Cerner)
                </h2>
                <span className="rounded bg-sky-500/10 border border-sky-500/30 px-1.5 py-0.5 text-[10px] font-mono text-sky-300">
                  HL7 FHIR R4 / US Core v9.0.0
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Ingest real-time EHR patient charts and execute automated write-back of signed 7-section CDS consultation dossiers
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
        {/* Left Column: Launch Context & Patient Profile */}
        <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 border-b border-white/10 pb-2">
            <Building2 className="size-4 text-sky-400" /> SMART-on-FHIR Ingestion Pipeline
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-[11px] font-semibold text-neutral-300 block mb-1">Target EHR Ecosystem</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEhrVendor("EPIC_SYSTEMS")}
                  className={cn(
                    "p-2.5 rounded-lg border text-left transition font-semibold",
                    ehrVendor === "EPIC_SYSTEMS"
                      ? "bg-sky-600/30 border-sky-400 text-sky-200"
                      : "bg-white/5 border-white/10 text-neutral-400 hover:bg-white/10"
                  )}
                >
                  Epic Systems (App Orchard)
                </button>
                <button
                  type="button"
                  onClick={() => setEhrVendor("ORACLE_CERNER")}
                  className={cn(
                    "p-2.5 rounded-lg border text-left transition font-semibold",
                    ehrVendor === "ORACLE_CERNER"
                      ? "bg-sky-600/30 border-sky-400 text-sky-200"
                      : "bg-white/5 border-white/10 text-neutral-400 hover:bg-white/10"
                  )}
                >
                  Oracle Cerner (Millennium)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[10px] text-neutral-400">Patient MRN</label>
                <input
                  type="text"
                  value={patientMrn}
                  onChange={(e) => setPatientMrn(e.target.value)}
                  className="w-full rounded bg-neutral-900 border border-white/10 px-2 py-1.5 text-white text-[11px] font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-neutral-400">Encounter ID</label>
                <input
                  type="text"
                  value={encounterId}
                  onChange={(e) => setEncounterId(e.target.value)}
                  className="w-full rounded bg-neutral-900 border border-white/10 px-2 py-1.5 text-white text-[11px] font-mono"
                />
              </div>
            </div>

            <div className="rounded bg-neutral-900/60 p-3 border border-white/5 space-y-1.5">
              <div className="text-[10px] text-neutral-400 font-mono">Simulated Ingested Patient</div>
              <div className="text-xs font-bold text-white">{patientName}</div>
              <div className="text-[10px] text-neutral-300">
                Active Problem List: Acute Ischemic Infarction (I63.9), Hypertension (I10)
              </div>
              <div className="text-[9px] text-neutral-400">
                Vitals: BP 182/104 mmHg · HR 88 bpm · RR 16 /min · SpO2 98% · Glucose 118 mg/dL
              </div>
            </div>

            <button
              type="button"
              onClick={handleTransmit}
              disabled={isTransmitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 py-2.5 text-xs font-bold text-white shadow-md transition"
            >
              {isTransmitting ? (
                <>
                  <ArrowRightLeft className="size-4 animate-spin text-white" /> Transmitting to {ehrVendor}...
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
          <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 border-b border-white/10 pb-2">
            <FileCheck2 className="size-4 text-emerald-400" /> EHR Write-Back Transaction Ledger
          </h3>

          <div className="space-y-3 text-xs">
            {lastResult ? (
              <div className="rounded-lg bg-emerald-950/30 border border-emerald-500/40 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold">
                    <CheckCircle2 className="size-4 text-emerald-400" />
                    <span>HTTP 201 Created</span>
                  </div>
                  <span className="font-mono text-[10px] text-neutral-400">{lastResult.ehrVendor}</span>
                </div>

                <div className="text-[11px] font-mono text-white bg-black/40 p-2 rounded border border-white/5 space-y-1">
                  <div>Resource ID: <strong>{lastResult.createdResourceId}</strong></div>
                  <div>Document Type: {lastResult.documentType} (LOINC: {lastResult.loincCode})</div>
                  <div>Endpoint: {lastResult.targetEndpoint}</div>
                  <div className="text-[10px] text-neutral-400 break-all">Digest: {lastResult.transmissionHash}</div>
                </div>

                <div className="text-[10px] text-neutral-300">
                  Signed consultation record successfully stored in patient chart under US Core DocumentReference profile.
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-neutral-900/60 border border-white/5 p-8 text-center text-neutral-400 space-y-2">
                <Database className="size-8 mx-auto text-neutral-600" />
                <div className="font-semibold text-white">No Write-Back Transaction Executed Yet</div>
                <div className="text-[11px] max-w-sm mx-auto">
                  Click "Execute Bi-Directional Write-Back to EHR" to transmit the signed CDS consultation dossier directly into Epic or Cerner.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
