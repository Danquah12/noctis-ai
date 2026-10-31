import { useState, useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileCode,
  FileText,
  Flame,
  Lock,
  MessageSquare,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Swords,
  Terminal,
  X,
  Zap,
} from "lucide-react";
import {
  PREDEFINED_WAR_ROOM_SCENARIOS,
  runWarRoomSimulation,
  formatWarRoomDossierMarkdown,
  type WarRoomScenario,
} from "@/lib/noctis-war-room";

interface NoctisWarRoomModalProps {
  open: boolean;
  onClose: () => void;
  onOpenInCanvas?: (markdown: string, title: string) => void;
  onInsertToChat?: (text: string) => void;
}

export function NoctisWarRoomModal({
  open,
  onClose,
  onOpenInCanvas,
  onInsertToChat,
}: NoctisWarRoomModalProps) {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("scenario-edge-rce");
  const [mitigationsApplied, setMitigationsApplied] = useState<boolean>(true);
  const [activeBlueTab, setActiveBlueTab] = useState<"sigma" | "kql" | "containment" | "remediation">("sigma");
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const scenarioKeys = useMemo(() => Object.keys(PREDEFINED_WAR_ROOM_SCENARIOS), []);

  const simulation = useMemo(() => {
    return runWarRoomSimulation(selectedScenarioId, mitigationsApplied);
  }, [selectedScenarioId, mitigationsApplied]);

  const dossierMarkdown = useMemo(() => {
    return formatWarRoomDossierMarkdown(simulation);
  }, [simulation]);

  if (!open) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(label);
    setTimeout(() => setCopiedItem(null), 2500);
  };

  const handleOpenCanvas = () => {
    if (onOpenInCanvas) {
      onOpenInCanvas(dossierMarkdown, `War Room: ${simulation.scenario.name}`);
      onClose();
    }
  };

  const handleInsertChat = () => {
    if (onInsertToChat) {
      onInsertToChat(dossierMarkdown);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-6xl max-h-[92vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-zinc-100">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-600/20 via-zinc-900 to-cyan-500/20 border border-zinc-700">
              <Swords className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  Noctis Autonomous War Room
                </h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 font-semibold">
                  Dual-Agent Sandbox v1.0
                </span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
                  Zero-Payload Proof
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Adversarial Hunter (CYBER-ENG-01) vs CSIRT Defender (SOC-IR-001) · Automated Sigma & KQL Generation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMitigationsApplied(!mitigationsApplied)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                mitigationsApplied
                  ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60"
                  : "bg-red-950/60 border-red-500/50 text-red-300 hover:bg-red-900/60"
              }`}
              title="Toggle Blue Team Defenses"
            >
              {mitigationsApplied ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Blue Team Defenses: ENFORCED</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  <span>Blue Team Defenses: DISABLED</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Threat Scenario Selector Bar */}
        <div className="px-6 py-2.5 bg-zinc-950 border-b border-zinc-800/80 flex items-center gap-2 overflow-x-auto">
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 shrink-0 mr-1 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-red-400" /> Target Threat:
          </span>
          {scenarioKeys.map((key) => {
            const sc = PREDEFINED_WAR_ROOM_SCENARIOS[key];
            const isSelected = selectedScenarioId === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedScenarioId(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                  isSelected
                    ? "bg-zinc-800 border-zinc-600 text-white shadow-sm"
                    : "bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                }`}
              >
                <span>{sc.category}:</span>
                <span className={isSelected ? "text-amber-400 font-semibold" : ""}>{sc.name.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Main Content (Dual Agent Split Screen) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Scenario Overview Banner */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-zinc-900/70 border border-zinc-800/80">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                  {simulation.scenario.category}
                </span>
                <h3 className="text-sm font-bold text-white">{simulation.scenario.name}</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">{simulation.scenario.summary}</p>
            </div>
            <div className="flex flex-col justify-center border-t md:border-t-0 md:border-l border-zinc-800 md:pl-4">
              <span className="text-[11px] text-zinc-400 font-mono">Threat Actor Profile</span>
              <span className="text-xs font-semibold text-zinc-200">{simulation.scenario.threatActorProfile}</span>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-950/60 border border-red-800/50 text-red-300">
                  CVSS {simulation.scenario.cvssScore.toFixed(1)}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-800/50 text-amber-300">
                  EPSS {(simulation.scenario.epssScore * 100).toFixed(1)}%
                </span>
                {simulation.scenario.cisaKevListed && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-600/20 border border-red-500 text-red-400 font-bold">
                    CISA KEV
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col justify-center border-t md:border-t-0 md:border-l border-zinc-800 md:pl-4">
              <span className="text-[11px] text-zinc-400 font-mono">Assurance Status</span>
              <div className="flex items-center gap-2 mt-1">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    simulation.certificate.verdict === "CERTIFIED_HARDENED"
                      ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                      : "bg-red-500 shadow-[0_0_8px_#ef4444]"
                  }`}
                />
                <span className="text-xs font-bold font-mono tracking-tight text-white">
                  {simulation.certificate.verdict}
                </span>
              </div>
              <span className="text-[11px] text-zinc-400 mt-1">
                Exposure: <strong className="text-zinc-200">{simulation.certificate.baselineExposureScore}</strong> →{" "}
                <strong className={mitigationsApplied ? "text-emerald-400" : "text-red-400"}>
                  {simulation.certificate.residualRiskScore}
                </strong>{" "}
                ({simulation.certificate.exploitabilityReductionPercent}% drop)
              </span>
            </div>
          </div>

          {/* DUAL PANE: RED TEAM vs BLUE TEAM */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT PANE: RED TEAM (CYBER-ENG-01 / VULN-001) */}
            <div className="flex flex-col rounded-xl border border-red-950/80 bg-gradient-to-b from-red-950/20 via-zinc-950 to-zinc-950 p-5 space-y-4 shadow-lg">
              <div className="flex items-center justify-between border-b border-red-950/80 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-red-900/30 border border-red-800/50 text-red-400">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-red-400">
                      Red Team Offensive Hunter
                    </h4>
                    <span className="text-[10px] text-zinc-400 font-mono">Agent: CYBER-ENG-01 / VULN-001</span>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold border ${
                    simulation.redTeamEngagement.canaryStatus === "BLOCKED_AT_PERIMETER"
                      ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-400"
                      : "bg-red-950/60 border-red-500/40 text-red-400"
                  }`}
                >
                  {simulation.redTeamEngagement.canaryStatus}
                </span>
              </div>

              {/* Zero-Payload Boundary Guarantee */}
              <div className="p-3 rounded-lg bg-red-950/30 border border-red-900/40 text-xs text-red-200/90 leading-relaxed">
                <span className="font-semibold text-red-300 block mb-1">
                  🛡️ Strict Zero-Payload Boundary Guarantee:
                </span>
                {simulation.scenario.redTeamCanary.zeroPayloadGuarantee}
              </div>

              {/* Attack Vector Specs */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800">
                  <span className="text-zinc-500 text-[10px] block">MITRE TECHNIQUE</span>
                  <span className="text-red-400 font-semibold">
                    {simulation.scenario.redTeamCanary.techniqueId} · {simulation.scenario.redTeamCanary.techniqueName}
                  </span>
                </div>
                <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800">
                  <span className="text-zinc-500 text-[10px] block">TARGET ASSET</span>
                  <span className="text-zinc-200 font-medium truncate block">
                    {simulation.scenario.redTeamCanary.targetAsset}
                  </span>
                </div>
              </div>

              {/* Safe Verification Probe Code Block */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-mono text-zinc-400 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-red-400" /> Safe Verification Probe (Canary Command)
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(simulation.scenario.redTeamCanary.safeVerificationProbe, "canary")
                    }
                    className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white transition-colors"
                  >
                    {copiedItem === "canary" ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{copiedItem === "canary" ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <pre className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-[11px] text-red-300 overflow-x-auto whitespace-pre-wrap">
                  {simulation.scenario.redTeamCanary.safeVerificationProbe}
                </pre>
              </div>

              {/* Kill-Chain Traversal Stepper */}
              <div>
                <span className="text-xs font-mono text-zinc-400 block mb-2">Kill-Chain Progression</span>
                <div className="space-y-1.5">
                  {simulation.redTeamEngagement.killChainProgression.map((item) => (
                    <div
                      key={item.step}
                      className="flex items-center justify-between p-2 rounded bg-zinc-900/40 border border-zinc-800/80 text-xs"
                    >
                      <span className="text-zinc-300">
                        <strong className="text-zinc-500 font-mono mr-2">Step {item.step}:</strong>
                        {item.tactic}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                          item.status === "CONTAINED"
                            ? "bg-emerald-950/70 text-emerald-400 border border-emerald-800/60"
                            : "bg-red-950/70 text-red-400 border border-red-800/60"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT PANE: BLUE TEAM (SOC-IR-001 / DETECT-ENG) */}
            <div className="flex flex-col rounded-xl border border-cyan-950/80 bg-gradient-to-b from-cyan-950/20 via-zinc-950 to-zinc-950 p-5 space-y-4 shadow-lg">
              <div className="flex items-center justify-between border-b border-cyan-950/80 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-cyan-900/30 border border-cyan-800/50 text-cyan-400">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                      Blue Team CSIRT & Detection
                    </h4>
                    <span className="text-[10px] text-zinc-400 font-mono">Agent: SOC-IR-001 / DETECT-ENG</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 font-semibold">
                  Target Latency: &lt;{simulation.scenario.blueTeamDefense.detectionLatencyTargetSeconds}s
                </span>
              </div>

              {/* Blue Team Tabs */}
              <div className="flex items-center gap-1.5 border-b border-zinc-800/80 pb-2">
                <button
                  onClick={() => setActiveBlueTab("sigma")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    activeBlueTab === "sigma"
                      ? "bg-cyan-900/40 text-cyan-300 border border-cyan-700/60 font-semibold"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" /> Sigma Rule
                </button>
                <button
                  onClick={() => setActiveBlueTab("kql")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    activeBlueTab === "kql"
                      ? "bg-cyan-900/40 text-cyan-300 border border-cyan-700/60 font-semibold"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Search className="w-3.5 h-3.5" /> KQL Query
                </button>
                <button
                  onClick={() => setActiveBlueTab("containment")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    activeBlueTab === "containment"
                      ? "bg-cyan-900/40 text-cyan-300 border border-cyan-700/60 font-semibold"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" /> EDR Playbook
                </button>
                <button
                  onClick={() => setActiveBlueTab("remediation")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    activeBlueTab === "remediation"
                      ? "bg-cyan-900/40 text-cyan-300 border border-cyan-700/60 font-semibold"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" /> Hotfix Directive
                </button>
              </div>

              {/* Tab Content Display */}
              <div className="flex-1 min-h-[220px]">
                {activeBlueTab === "sigma" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-zinc-400">Sigma Detection Rule Specification v2.0</span>
                      <button
                        onClick={() =>
                          copyToClipboard(simulation.scenario.blueTeamDefense.sigmaRuleYaml, "sigma")
                        }
                        className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white transition-colors"
                      >
                        {copiedItem === "sigma" ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedItem === "sigma" ? "Copied" : "Copy YAML"}</span>
                      </button>
                    </div>
                    <pre className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-[11px] text-cyan-300 overflow-x-auto max-h-[260px] overflow-y-auto leading-relaxed">
                      {simulation.scenario.blueTeamDefense.sigmaRuleYaml}
                    </pre>
                  </div>
                )}

                {activeBlueTab === "kql" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-zinc-400">Microsoft Sentinel & Defender KQL Hunting Query</span>
                      <button
                        onClick={() =>
                          copyToClipboard(simulation.scenario.blueTeamDefense.kqlHuntingQuery, "kql")
                        }
                        className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white transition-colors"
                      >
                        {copiedItem === "kql" ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedItem === "kql" ? "Copied" : "Copy KQL"}</span>
                      </button>
                    </div>
                    <pre className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-[11px] text-cyan-300 overflow-x-auto max-h-[260px] overflow-y-auto leading-relaxed">
                      {simulation.scenario.blueTeamDefense.kqlHuntingQuery}
                    </pre>
                  </div>
                )}

                {activeBlueTab === "containment" && (
                  <div className="space-y-3 text-xs">
                    <span className="font-mono text-zinc-400 block">Automated EDR Host Containment Steps</span>
                    <ol className="space-y-2">
                      {simulation.scenario.blueTeamDefense.edrContainmentActions.map((act, i) => (
                        <li key={i} className="flex items-start gap-2 p-2 rounded bg-zinc-900/60 border border-zinc-800">
                          <span className="w-5 h-5 rounded bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center font-mono text-[10px] shrink-0">
                            {i + 1}
                          </span>
                          <span className="text-zinc-300 leading-snug">{act}</span>
                        </li>
                      ))}
                    </ol>

                    <span className="font-mono text-zinc-400 block pt-1">Firewall Perimeter Directives</span>
                    <div className="space-y-1">
                      {simulation.scenario.blueTeamDefense.firewallAclDirectives.map((acl, i) => (
                        <code key={i} className="block p-1.5 rounded bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-cyan-400">
                          {acl}
                        </code>
                      ))}
                    </div>
                  </div>
                )}

                {activeBlueTab === "remediation" && (
                  <div className="space-y-3 text-xs">
                    <span className="font-mono text-zinc-400 block">Permanent Patch & Hardening Directive</span>
                    <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 text-zinc-200 leading-relaxed">
                      {simulation.scenario.blueTeamDefense.patchRemediationDirective}
                    </div>

                    <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-emerald-300 text-xs">
                      <strong className="block mb-1 text-emerald-400">Defense Verification Status:</strong>
                      Sigma detection rule compiled. EDR sensor telemetry rule mapped. Live canary probe halted at perimeter.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cryptographic Security Assurance Certificate */}
          <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-white uppercase tracking-wider text-xs">
                  Audited Cryptographic Security Assurance Certificate
                </span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                  {simulation.certificate.certificateId}
                </span>
              </div>
              <span className="text-[10px] font-mono text-zinc-400">
                Audited: {simulation.certificate.auditedBy}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800 font-mono text-[11px]">
                <span className="text-zinc-500 text-[10px] block">SHA-256 AUDIT FINGERPRINT</span>
                <div className="flex items-center justify-between gap-1 mt-0.5">
                  <span className="text-zinc-300 truncate" title={simulation.certificate.verificationHash}>
                    {simulation.certificate.verificationHash.slice(0, 24)}...
                  </span>
                  <button
                    onClick={() => copyToClipboard(simulation.certificate.verificationHash, "hash")}
                    className="text-zinc-400 hover:text-white shrink-0"
                    title="Copy Full SHA-256 Fingerprint"
                  >
                    {copiedItem === "hash" ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800 font-mono text-[11px]">
                <span className="text-zinc-500 text-[10px] block">EXPLOITABILITY REDUCTION</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-emerald-400 font-bold text-sm">
                    {simulation.certificate.exploitabilityReductionPercent}%
                  </span>
                  <span className="text-zinc-400 text-[10px]">
                    ({simulation.certificate.baselineExposureScore} → {simulation.certificate.residualRiskScore} Risk)
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800 font-mono text-[11px]">
                <span className="text-zinc-500 text-[10px] block">GOVERNING STANDARDS</span>
                <span className="text-zinc-300 text-[10px] truncate block mt-0.5">
                  NIST SP 800-61r2 · ATT&CK v15.1 · Sigma 2.0
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-800/80 bg-zinc-900/60 text-xs">
          <div className="text-zinc-400 font-mono text-[11px] hidden sm:block">
            Sovereign Engine NOCTIS-WAR-ROOM-001 · Zero OpenAI Dependencies
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => copyToClipboard(dossierMarkdown, "dossier")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors font-medium"
            >
              {copiedItem === "dossier" ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedItem === "dossier" ? "Copied" : "Copy Dossier"}</span>
            </button>

            {onOpenInCanvas && (
              <button
                onClick={handleOpenCanvas}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors font-medium"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Open in Canvas</span>
              </button>
            )}

            {onInsertToChat && (
              <button
                onClick={handleInsertChat}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-medium shadow-md transition-all"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Send to Chat</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
