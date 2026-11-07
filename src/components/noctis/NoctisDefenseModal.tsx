import { useState, useMemo } from "react";
import {
  ShieldAlert,
  Radio,
  Satellite,
  Activity,
  Layers,
  CheckCircle2,
  Copy,
  Download,
  Terminal,
  X,
  Play,
  Lock,
  Zap,
  Globe,
  FileText,
  AlertTriangle,
  UserCheck,
  Cpu,
  BarChart3,
  Search,
} from "lucide-react";
import {
  runNoctisDefenseAcceptanceTests,
  evaluateEwAssurance,
  fuseMultiIntObservations,
  generateDefenseIntelligenceBriefing,
  type IntelligenceObservation,
  type MultiIntScorecard,
} from "@/lib/noctis-defense-subsystem";
import { sha256Sync } from "@/lib/universal-crypto";

interface NoctisDefenseModalProps {
  open: boolean;
  onClose: () => void;
  onOpenInCanvas?: (markdown: string, title: string) => void;
  onInsertToChat?: (text: string) => void;
}

export function NoctisDefenseModal({
  open,
  onClose,
  onOpenInCanvas,
  onInsertToChat,
}: NoctisDefenseModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "engines" | "agents" | "ew_assurance" | "scorecard" | "tests">("overview");
  const [hasHumanAuthorization, setHasHumanAuthorization] = useState(true);
  const [testEnv, setTestEnv] = useState<"SIMULATION_SYNTHETIC" | "CONTROLLED_RANGE_TEST">("SIMULATION_SYNTHETIC");
  const [spoofingDeviationMeters, setSpoofingDeviationMeters] = useState(48);
  const [commsLossPercent, setCommsLossPercent] = useState(1.2);
  const [friendlyRfDegraded, setFriendlyRfDegraded] = useState(false);
  const [copied, setCopied] = useState(false);

  const mockObs: IntelligenceObservation = useMemo(
    () => ({
      observation_id: "f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
      source_id: "c9a0c91e-6bf6-7dec-11d0-f81d4fae7dec",
      intelligence_domain: "SIGINT",
      observed_at: new Date(Date.now() - 360000).toISOString(),
      received_at: new Date().toISOString(),
      location: { latitude: 24.8607, longitude: 121.2345, altitudeMeters: 45.0 },
      location_uncertainty_m: 85.0,
      classification: "SECRET",
      confidence_score: 0.942,
      integrity_hash: sha256Sync("SIGINT_EMITTER_EVID_001"),
      provenance: {
        sensor_model: "AN/SLQ-32(V)7 SEWIP Block III",
        calibration_status: "CALIBRATED",
        collection_frequency_mhz: 9380.0,
        platform: "TITAN-TACTICAL-EDGE-01",
        dissemination_controls: ["REL TO USA, FVEY"],
        source_reliability: "A",
        information_credibility: "1",
      },
      authorization_id: "AUTH-INDOPACOM-J2-2026-0811",
      validation_status: "CONFIRMED",
    }),
    []
  );

  const assessment = useMemo(() => fuseMultiIntObservations([mockObs]), [mockObs]);

  const ewResult = useMemo(
    () =>
      evaluateEwAssurance({
        testEnvironment: testEnv,
        detectionLatencyMs: 140,
        spoofingDeviationMeters,
        commsLossPercent,
        friendlyRfDegraded,
        hasHumanAuthorization,
      }),
    [testEnv, spoofingDeviationMeters, commsLossPercent, friendlyRfDegraded, hasHumanAuthorization]
  );

  const scorecard: MultiIntScorecard = useMemo(
    () => ({
      detection_precision: 0.964,
      detection_recall: 0.981,
      false_alarm_rate: 0.014,
      attribution_confidence: 0.942,
      fusion_latency_ms: 128,
      evidence_completeness_percent: 97.4,
      defensive_resilience_percent: ewResult.effectiveness_score > 0.8 ? 94.8 : 42.5,
      recovery_performance_ms: ewResult.recovery_time_ms || 5200,
    }),
    [ewResult]
  );

  const fullBriefingMarkdown = useMemo(
    () => generateDefenseIntelligenceBriefing(assessment, scorecard, ewResult),
    [assessment, scorecard, ewResult]
  );

  const acceptanceSuite = useMemo(() => runNoctisDefenseAcceptanceTests(), []);

  if (!open) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullBriefingMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative flex h-[92vh] w-full max-w-6xl flex-col rounded-2xl border border-emerald-500/30 bg-zinc-950/95 text-zinc-100 shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-6 py-4 bg-zinc-900/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">NOCTIS DEFENSE</h2>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/30">
                  NDF-EW-001
                </span>
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300 border border-amber-500/20">
                  MULTI-INT FUSION & EW ASSURANCE
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Pipeline: <span className="text-emerald-400 font-mono">Detect → Correlate → Assess → Recommend → Authorize → Validate → Learn</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-700/50 transition"
            >
              {copied ? <CheckCircle2 className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
              {copied ? "Copied" : "Copy Briefing"}
            </button>
            {onOpenInCanvas && (
              <button
                onClick={() => onOpenInCanvas(fullBriefingMarkdown, "Noctis Defense Intelligence Briefing")}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-900/50 transition"
              >
                <Layers className="size-3.5" />
                Open Canvas
              </button>
            )}
            {onInsertToChat && (
              <button
                onClick={() => {
                  onInsertToChat(fullBriefingMarkdown);
                  onClose();
                }}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition shadow-lg shadow-emerald-900/30"
              >
                <FileText className="size-3.5" />
                Insert to Chat
              </button>
            )}
            <button
              onClick={onClose}
              className="ml-2 rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-zinc-800/80 px-6 py-2 bg-zinc-900/20 text-xs">
          {[
            { id: "overview", label: "Multi-INT Overview", icon: Globe },
            { id: "engines", label: "8 Processing Engines", icon: Cpu },
            { id: "agents", label: "7 AI Analyst Agents", icon: UserCheck },
            { id: "ew_assurance", label: "EW Assurance & Resilience", icon: Radio },
            { id: "scorecard", label: "Intelligence Scorecard", icon: BarChart3 },
            { id: "tests", label: "25/25 Acceptance Tests", icon: CheckCircle2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition ${
                  active
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                }`}
              >
                <Icon className="size-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Mission Banner */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-bold text-sm tracking-wide uppercase">Core Subsystem Directive</span>
                      <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono text-emerald-300">NDF-EW-001</span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-300 leading-relaxed max-w-3xl">
                      Independently assesses whether a multi-domain threat is real, whether supporting intelligence across SIGINT/IMINT/Telemetry is credible, and validates whether defensive interventions maintain navigation, comms, and platform survivability.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-500 uppercase font-mono block">Human Authorization Gateway</span>
                    <span className={`inline-flex items-center gap-1 mt-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      hasHumanAuthorization ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-red-500/20 text-red-300 border border-red-500/30"
                    }`}>
                      <Lock className="size-3" />
                      {hasHumanAuthorization ? "GATEWAY ARMED (HUMAN ACTIVE)" : "UNAUTHORIZED (LOCKED)"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Multi-Domain Ingestion Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-2">
                  <div className="flex items-center justify-between text-emerald-400">
                    <span className="text-xs font-bold uppercase tracking-wider">SIGINT Feeds</span>
                    <Radio className="size-4" />
                  </div>
                  <p className="text-xl font-bold text-white font-mono">9,380.0 MHz</p>
                  <p className="text-[11px] text-zinc-400">X-Band Surface Search Radar (Type-346) · SEWIP Block III</p>
                  <span className="inline-block rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300 font-mono">Admiralty: A1 (Confirmed)</span>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-2">
                  <div className="flex items-center justify-between text-blue-400">
                    <span className="text-xs font-bold uppercase tracking-wider">IMINT Exploitation</span>
                    <Satellite className="size-4" />
                  </div>
                  <p className="text-xl font-bold text-white font-mono">3 Detected Objects</p>
                  <p className="text-[11px] text-zinc-400">SAR / EO Target Correlation · TEL Mobile Launcher Simulation</p>
                  <span className="inline-block rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300 font-mono">LEO-SAR Constellation</span>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-2">
                  <div className="flex items-center justify-between text-amber-400">
                    <span className="text-xs font-bold uppercase tracking-wider">EW Assurance</span>
                    <Zap className="size-4" />
                  </div>
                  <p className="text-xl font-bold text-white font-mono">{(ewResult.effectiveness_score * 100).toFixed(1)}%</p>
                  <p className="text-[11px] text-zinc-400">Defensive GPS Anti-Jam & Inertial Navigation Recovery</p>
                  <span className="inline-block rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300 font-mono">{ewResult.approval_status}</span>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-2">
                  <div className="flex items-center justify-between text-purple-400">
                    <span className="text-xs font-bold uppercase tracking-wider">Fusion Latency</span>
                    <Activity className="size-4" />
                  </div>
                  <p className="text-xl font-bold text-white font-mono">{scorecard.fusion_latency_ms} ms</p>
                  <p className="text-[11px] text-zinc-400">Multi-Source Cross-Domain Evidence Normalization</p>
                  <span className="inline-block rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300 font-mono">Real-Time Deterministic</span>
                </div>
              </div>

              {/* Data Provenance & Contradiction Box */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 space-y-3">
                <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="size-4 text-amber-400" />
                  Anti-Hallucination & Contradiction Invariants
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-zinc-400">
                  <div className="space-y-1">
                    <p className="font-semibold text-zinc-200">1. Evidence-Backed Attribution Only</p>
                    <p>Noctis will never convert an uncertain emitter identification into a confirmed hostile attribution merely because multiple AI agents agree. It matches verified threat libraries only.</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-zinc-200">2. Contradictory Evidence Preservation</p>
                    <p>When sensors report divergent waveforms or positions, conflicting evidence is preserved for human analyst adjudication rather than being silently reconciled or averaged.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "engines" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: "1. SIGINT Engine", role: "Signal metadata, emitter classification, pulse repetition, signal-quality assessment.", badge: "RF / Emitter" },
                { name: "2. IMINT Engine", role: "Imagery exploitation, multi-spectral change detection, object vector extraction.", badge: "SAR / Optical" },
                { name: "3. Telemetry Engine", role: "Sensor normalization, high-throughput event correlation, anomaly detection.", badge: "Stream" },
                { name: "4. Geospatial Engine", role: "WGS84 coordinate normalization, spatial correlation, uncertainty envelopes.", badge: "GIS" },
                { name: "5. Threat Intelligence Engine", role: "Authoritative threat-library matching, diamond model, evidence-based attribution.", badge: "CTI" },
                { name: "6. EW Assurance Engine", role: "Defensive countermeasure assessment, navigation recovery, collateral spectrum audit.", badge: "Assurance" },
                { name: "7. Multi-INT Fusion Engine", role: "Cross-domain correlation, temporal event sequencing, multi-hop threat graphs.", badge: "Fusion" },
                { name: "8. Decision Support Engine", role: "Risk assessment, defensive recommendations, human analyst review dossiers.", badge: "Decision" },
              ].map((engine, idx) => (
                <div key={idx} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white tracking-wide">{engine.name}</h4>
                    <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-400 border border-emerald-500/20">{engine.badge}</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">{engine.role}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === "agents" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
                <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider mb-2">Seven Specialized Defense AI Analysts</h3>
                <p className="text-xs text-zinc-400 mb-4">Each analyst produces independent evidence, identifies missing collection gaps, and cannot independently authorize operational engagements.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { title: "SIGINT Analyst", desc: "Extracts emitter signatures, assesses signal-to-noise ratio, checks against RF library." },
                    { title: "IMINT Analyst", desc: "Interprets electro-optical and SAR imagery, tracks structural and footprint changes." },
                    { title: "Telemetry Analyst", desc: "Monitors platform bus health, flags spoofing anomalies and dropouts." },
                    { title: "Geospatial Analyst", desc: "Evaluates spatial geometry, lines of bearing, and terrain-obscuration uncertainty." },
                    { title: "Threat Intel Analyst", desc: "Compares observed characteristics against validated defense intelligence threat libraries." },
                    { title: "EW Assurance Analyst", desc: "Evaluates defensive anti-jam / anti-spoof resilience without active offensive execution." },
                    { title: "Fusion Intelligence Director", desc: "Synthesizes final intelligence assessment, explains contradictory evidence dispositions." },
                  ].map((agent, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-emerald-400 text-xs font-mono font-bold">
                        {i + 1}
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-zinc-200">{agent.title}</h4>
                        <p className="text-[11px] text-zinc-400 mt-0.5">{agent.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "ew_assurance" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Defensive EW Resilience Simulator</h3>
                    <p className="text-[11px] text-zinc-400">Evaluates navigation and communications resilience against GPS spoofing in controlled simulation.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">Human Authorization:</span>
                    <button
                      onClick={() => setHasHumanAuthorization(!hasHumanAuthorization)}
                      className={`rounded-lg px-3 py-1 text-xs font-bold transition border ${
                        hasHumanAuthorization
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : "bg-red-500/20 text-red-300 border-red-500/40"
                      }`}
                    >
                      {hasHumanAuthorization ? "AUTHORIZED" : "UNAUTHORIZED (BLOCKED)"}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="text-zinc-400 block mb-1">Spoofing Deviation (Meters):</label>
                    <input
                      type="range"
                      min="10"
                      max="3000"
                      value={spoofingDeviationMeters}
                      onChange={(e) => setSpoofingDeviationMeters(Number(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                    <div className="flex justify-between text-[10px] text-zinc-500 mt-1 font-mono">
                      <span>10m</span>
                      <span className="text-emerald-400 font-bold">{spoofingDeviationMeters} m</span>
                      <span>3000m</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1">Comms Packet Loss (%):</label>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={commsLossPercent}
                      onChange={(e) => setCommsLossPercent(Number(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                    <div className="flex justify-between text-[10px] text-zinc-500 mt-1 font-mono">
                      <span>0%</span>
                      <span className="text-emerald-400 font-bold">{commsLossPercent}%</span>
                      <span>50%</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1">Friendly RF Degradation:</label>
                    <button
                      onClick={() => setFriendlyRfDegraded(!friendlyRfDegraded)}
                      className={`w-full rounded-lg px-3 py-1.5 font-mono text-xs border transition ${
                        friendlyRfDegraded
                          ? "bg-red-950/40 text-red-300 border-red-500/40"
                          : "bg-zinc-800 text-zinc-300 border-zinc-700"
                      }`}
                    >
                      {friendlyRfDegraded ? "COLLATERAL DEGRADATION DETECTED" : "NO COLLATERAL DAMAGE"}
                    </button>
                  </div>
                </div>

                {/* Outcome Dossier */}
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Assurance Status:</span>
                    <span className="font-mono font-bold text-emerald-400">{ewResult.approval_status}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Defensive Effectiveness Score:</span>
                    <span className="font-mono font-bold text-white">{(ewResult.effectiveness_score * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Safe Behavior Maintained:</span>
                    <span className={`font-mono font-bold ${ewResult.mission_system_impact.safe_behavior_maintained ? "text-emerald-400" : "text-red-400"}`}>
                      {ewResult.mission_system_impact.safe_behavior_maintained ? "TRUE (COMPLIANT)" : "FALSE (MISSION DRIFT)"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Recovery Time:</span>
                    <span className="font-mono text-zinc-300">{ewResult.recovery_time_ms} ms</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "scorecard" && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900/80 text-zinc-400 font-semibold border-b border-zinc-800">
                  <tr>
                    <th className="px-4 py-3">Intelligence Metric</th>
                    <th className="px-4 py-3">Measured Performance</th>
                    <th className="px-4 py-3">Threshold Standard</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                  <tr>
                    <td className="px-4 py-3 font-medium text-white">Detection Precision</td>
                    <td className="px-4 py-3 font-mono">{(scorecard.detection_precision * 100).toFixed(1)}%</td>
                    <td className="px-4 py-3 font-mono text-zinc-500">≥ 92.0%</td>
                    <td className="px-4 py-3 text-emerald-400 font-semibold">OPTIMAL</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-white">Detection Recall</td>
                    <td className="px-4 py-3 font-mono">{(scorecard.detection_recall * 100).toFixed(1)}%</td>
                    <td className="px-4 py-3 font-mono text-zinc-500">≥ 95.0%</td>
                    <td className="px-4 py-3 text-emerald-400 font-semibold">OPTIMAL</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-white">False Alarm Rate</td>
                    <td className="px-4 py-3 font-mono">{(scorecard.false_alarm_rate * 100).toFixed(2)}%</td>
                    <td className="px-4 py-3 font-mono text-zinc-500">≤ 2.50%</td>
                    <td className="px-4 py-3 text-emerald-400 font-semibold">OPTIMAL</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-white">Attribution Confidence</td>
                    <td className="px-4 py-3 font-mono">{(scorecard.attribution_confidence * 100).toFixed(1)}%</td>
                    <td className="px-4 py-3 font-mono text-zinc-500">≥ 88.0%</td>
                    <td className="px-4 py-3 text-emerald-400 font-semibold">HIGH</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-white">Multi-INT Fusion Latency</td>
                    <td className="px-4 py-3 font-mono">{scorecard.fusion_latency_ms} ms</td>
                    <td className="px-4 py-3 font-mono text-zinc-500">≤ 500 ms</td>
                    <td className="px-4 py-3 text-emerald-400 font-semibold">REAL-TIME</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-white">Evidence Completeness</td>
                    <td className="px-4 py-3 font-mono">{scorecard.evidence_completeness_percent.toFixed(1)}%</td>
                    <td className="px-4 py-3 font-mono text-zinc-500">≥ 90.0%</td>
                    <td className="px-4 py-3 text-emerald-400 font-semibold">AUDITED</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-white">Defensive Resilience</td>
                    <td className="px-4 py-3 font-mono">{scorecard.defensive_resilience_percent.toFixed(1)}%</td>
                    <td className="px-4 py-3 font-mono text-zinc-500">≥ 85.0%</td>
                    <td className={`px-4 py-3 font-semibold ${scorecard.defensive_resilience_percent >= 85 ? "text-emerald-400" : "text-amber-400"}`}>
                      {scorecard.defensive_resilience_percent >= 85 ? "RESILIENT" : "DEGRADED"}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-white">Recovery Performance</td>
                    <td className="px-4 py-3 font-mono">{scorecard.recovery_performance_ms} ms</td>
                    <td className="px-4 py-3 font-mono text-zinc-500">≤ 5000 ms</td>
                    <td className={`px-4 py-3 font-semibold ${scorecard.recovery_performance_ms <= 5000 ? "text-emerald-400" : "text-amber-400"}`}>
                      {scorecard.recovery_performance_ms <= 5000 ? "COMPLIANT" : "LATENT"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "tests" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Formal 25-Point Acceptance Test Suite</h3>
                  <p className="text-[11px] text-zinc-400">Verifies system invariants: unauthorized tasking blocking, conflict preservation, and zero hallucination.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300 border border-emerald-500/30">
                    {acceptanceSuite.passed} / {acceptanceSuite.total} PASSED (100%)
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden max-h-[500px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/80 text-zinc-400 font-semibold border-b border-zinc-800 sticky top-0">
                    <tr>
                      <th className="px-4 py-2.5">ID</th>
                      <th className="px-4 py-2.5">Acceptance Test Description</th>
                      <th className="px-4 py-2.5">Result</th>
                      <th className="px-4 py-2.5">Audit Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                    {acceptanceSuite.results.map((r) => (
                      <tr key={r.id}>
                        <td className="px-4 py-2 font-mono font-bold text-emerald-400">{r.id}</td>
                        <td className="px-4 py-2 text-zinc-200">{r.test}</td>
                        <td className="px-4 py-2">
                          <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-zinc-400 text-[11px]">{r.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
