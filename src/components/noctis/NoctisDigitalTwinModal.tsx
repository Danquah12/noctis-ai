import { useState, useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Copy,
  DollarSign,
  FileText,
  Lock,
  Network,
  RefreshCw,
  Shield,
  ShieldAlert,
  Sliders,
  TrendingDown,
  X,
  Zap,
} from "lucide-react";
import {
  TWIN_PRESETS,
  getCanonicalDigitalTwinTopology,
  simulateDigitalTwin,
  formatDigitalTwinDossierMarkdown,
  type DigitalTwinNode,
  type SimulationControls,
} from "@/lib/noctis-digital-twin";

interface NoctisDigitalTwinModalProps {
  open: boolean;
  onClose: () => void;
  onOpenInCanvas?: (markdown: string, title: string) => void;
  onInsertToChat?: (text: string) => void;
}

export function NoctisDigitalTwinModal({
  open,
  onClose,
  onOpenInCanvas,
  onInsertToChat,
}: NoctisDigitalTwinModalProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<string>("preset-enterprise-ransomware");
  const [threatDetonated, setThreatDetonated] = useState<boolean>(true);
  const [isolatedChokePoints, setIsolatedChokePoints] = useState<string[]>([]);
  const [macroRateShiftBps, setMacroRateShiftBps] = useState<number>(0);
  const [airGapBackups, setAirGapBackups] = useState<boolean>(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string>("node-edge-vpn");
  const [copied, setCopied] = useState(false);

  // Apply preset controls when clicked
  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = TWIN_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setThreatDetonated(preset.defaultControls.threatDetonated);
      setIsolatedChokePoints([...preset.defaultControls.isolatedChokePointIds]);
      setMacroRateShiftBps(preset.defaultControls.macroRateShiftBps);
      setAirGapBackups(preset.defaultControls.airGapBackupsEnforced);
    }
  };

  const controls: SimulationControls = useMemo(
    () => ({
      threatDetonated,
      isolatedChokePointIds: isolatedChokePoints,
      macroRateShiftBps,
      airGapBackupsEnforced: airGapBackups,
      activePresetId: selectedPresetId,
    }),
    [threatDetonated, isolatedChokePoints, macroRateShiftBps, airGapBackups, selectedPresetId]
  );

  const simulation = useMemo(() => simulateDigitalTwin(controls), [controls]);

  const selectedNode = useMemo(
    () => simulation.nodes.find((n) => n.id === selectedNodeId) || simulation.nodes[0],
    [simulation.nodes, selectedNodeId]
  );

  const toggleChokePoint = (id: string) => {
    setIsolatedChokePoints((prev) =>
      prev.includes(id) ? prev.filter((cp) => cp !== id) : [...prev, id]
    );
  };

  const handleCopyMarkdown = () => {
    const md = formatDigitalTwinDossierMarkdown(simulation);
    void navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportCanvas = () => {
    const md = formatDigitalTwinDossierMarkdown(simulation);
    if (onOpenInCanvas) {
      onOpenInCanvas(md, simulation.scenarioTitle);
    }
    onClose();
  };

  const handleInsertChat = () => {
    const md = formatDigitalTwinDossierMarkdown(simulation);
    if (onInsertToChat) {
      onInsertToChat(md);
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-6 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex h-full max-h-[92vh] w-full max-w-6xl flex-col rounded-2xl border border-zinc-800 bg-[#121214] shadow-2xl overflow-hidden text-zinc-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-6 py-4 bg-[#18181b]">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-tr from-cyan-600 via-teal-600 to-emerald-600 text-white shadow-lg shadow-cyan-900/30">
              <Network className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight text-white">
                  Noctis Digital Twin & Attack-Graph Simulator
                </h2>
                <span className="rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-400 border border-cyan-500/30">
                  NOCTIS-TWIN-001
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Interactive topological resilience simulation · Real-time lateral blast radius · Macro financial shock solver
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Preset Selector Bar */}
        <div className="flex items-center gap-2 px-6 py-2.5 bg-[#141416] border-b border-zinc-800/60 overflow-x-auto text-xs">
          <span className="text-zinc-500 font-medium shrink-0">Simulations:</span>
          {TWIN_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset.id)}
              className={`shrink-0 rounded-lg px-3 py-1.5 transition font-medium border ${
                selectedPresetId === preset.id
                  ? "bg-cyan-950/60 text-cyan-300 border-cyan-700/60 shadow-sm"
                  : "bg-zinc-800/40 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:bg-zinc-800"
              }`}
            >
              {preset.title}
            </button>
          ))}
        </div>

        {/* Live Simulation Content Body */}
        <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
          {/* Main Interactive Canvas Pane */}
          <div className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-zinc-800/80 bg-[#0f0f11] relative overflow-hidden">
            {/* KPI Metric Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 border-b border-zinc-800/60 bg-[#141417]">
              <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-2.5">
                <span className="text-[11px] font-medium text-zinc-400">Blast Radius</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span
                    className={`text-xl font-bold ${
                      simulation.kpis.blastRadiusPercent >= 50
                        ? "text-rose-400"
                        : simulation.kpis.blastRadiusPercent > 0
                        ? "text-amber-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {simulation.kpis.blastRadiusPercent}%
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    ({simulation.kpis.compromisedNodeCount}/{simulation.kpis.totalNodeCount} nodes)
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-2.5">
                <span className="text-[11px] font-medium text-zinc-400">Runway Impact</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span
                    className={`text-xl font-bold ${
                      simulation.kpis.financialRunwayMonths < 9.0
                        ? "text-rose-400"
                        : simulation.kpis.financialRunwayMonths < 12.0
                        ? "text-amber-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {simulation.kpis.financialRunwayMonths} mo
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    (${simulation.kpis.hourlyDowntimeLoss.toLocaleString()}/hr loss)
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-2.5">
                <span className="text-[11px] font-medium text-zinc-400">Resilience Score</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-xl font-bold text-cyan-400">
                    {simulation.kpis.resilienceScorePercent}%
                  </span>
                  <span className="text-[11px] text-zinc-500">structural margin</span>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-2.5">
                <span className="text-[11px] font-medium text-zinc-400">Containment</span>
                <div className="mt-0.5">
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${
                      simulation.kpis.containmentStatus === "BASELINE_SECURE"
                        ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800"
                        : simulation.kpis.containmentStatus === "MITIGATED_CHOKEPOINT"
                        ? "bg-cyan-950/60 text-cyan-300 border border-cyan-800"
                        : "bg-rose-950/60 text-rose-300 border border-rose-800"
                    }`}
                  >
                    {simulation.kpis.containmentStatus === "MITIGATED_CHOKEPOINT" ? "🛡️ MITIGATED" : simulation.kpis.containmentStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* SVG Visual Graph Canvas */}
            <div className="flex-1 relative overflow-auto p-4 flex items-center justify-center min-h-[340px]">
              <svg
                viewBox="0 0 780 430"
                className="w-full h-full max-h-[440px] select-none"
              >
                <defs>
                  {/* Glowing Filters */}
                  <filter id="glow-rose" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <marker
                    id="arrowhead-red"
                    markerWidth="8"
                    markerHeight="8"
                    refX="22"
                    refY="4"
                    orient="auto"
                  >
                    <polygon points="0 0, 8 4, 0 8" fill="#f43f5e" />
                  </marker>
                  <marker
                    id="arrowhead-gray"
                    markerWidth="8"
                    markerHeight="8"
                    refX="22"
                    refY="4"
                    orient="auto"
                  >
                    <polygon points="0 0, 8 4, 0 8" fill="#52525b" />
                  </marker>
                </defs>

                {/* Edges */}
                {simulation.edges.map((edge) => {
                  const srcNode = simulation.nodes.find((n) => n.id === edge.source);
                  const tgtNode = simulation.nodes.find((n) => n.id === edge.target);
                  if (!srcNode || !tgtNode) return null;

                  const isTraversed = edge.status === "compromised_traversal";
                  const isSevered = edge.status === "severed_quarantined";

                  return (
                    <g key={edge.id}>
                      <line
                        x1={srcNode.x}
                        y1={srcNode.y}
                        x2={tgtNode.x}
                        y2={tgtNode.y}
                        stroke={isTraversed ? "#f43f5e" : isSevered ? "#38bdf8" : "#3f3f46"}
                        strokeWidth={isTraversed ? 3.5 : isSevered ? 2.5 : 1.5}
                        strokeDasharray={isTraversed ? "6 4" : isSevered ? "4 4" : undefined}
                        className={isTraversed ? "animate-pulse" : ""}
                        markerEnd={isTraversed ? "url(#arrowhead-red)" : "url(#arrowhead-gray)"}
                      />
                      {/* Port Label Pill */}
                      <rect
                        x={(srcNode.x + tgtNode.x) / 2 - 34}
                        y={(srcNode.y + tgtNode.y) / 2 - 10}
                        width="68"
                        height="20"
                        rx="4"
                        fill="#18181b"
                        stroke={isTraversed ? "#f43f5e" : isSevered ? "#38bdf8" : "#27272a"}
                        strokeWidth="1"
                      />
                      <text
                        x={(srcNode.x + tgtNode.x) / 2}
                        y={(srcNode.y + tgtNode.y) / 2 + 4}
                        fill={isTraversed ? "#fda4af" : isSevered ? "#7dd3fc" : "#a1a1aa"}
                        fontSize="9"
                        fontWeight="600"
                        textAnchor="middle"
                      >
                        {isSevered ? "QUARANTINE" : `Port ${edge.port}`}
                      </text>
                    </g>
                  );
                })}

                {/* Nodes */}
                {simulation.nodes.map((node) => {
                  const isSelected = node.id === selectedNodeId;
                  const isBreached = node.status === "breached";
                  const isLateral = node.status === "compromised_lateral";
                  const isChoke = node.status === "choke_point_blocked";
                  const isStressed = node.status === "stressed";

                  let strokeColor = "#3f3f46";
                  let fillColor = "#18181b";
                  if (isBreached) {
                    strokeColor = "#f43f5e";
                    fillColor = "#4c0519";
                  } else if (isLateral) {
                    strokeColor = "#fb7185";
                    fillColor = "#881337";
                  } else if (isChoke) {
                    strokeColor = "#38bdf8";
                    fillColor = "#082f49";
                  } else if (isStressed) {
                    strokeColor = "#f59e0b";
                    fillColor = "#451a03";
                  } else {
                    strokeColor = "#10b981";
                    fillColor = "#064e3b";
                  }

                  return (
                    <g
                      key={node.id}
                      onClick={() => setSelectedNodeId(node.id)}
                      className="cursor-pointer transition-transform duration-150 hover:scale-105"
                    >
                      {/* Pulse Ring if Compromised */}
                      {(isBreached || isLateral) && (
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r="34"
                          fill="none"
                          stroke="#f43f5e"
                          strokeWidth="2"
                          opacity="0.5"
                          className="animate-ping"
                        />
                      )}

                      {/* Main Node Circle */}
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r="25"
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth={isSelected ? 3.5 : 2}
                        filter={isSelected ? "url(#glow-cyan)" : undefined}
                      />

                      {/* Status Emoji inside */}
                      <text
                        x={node.x}
                        y={node.y + 4}
                        fontSize="14"
                        textAnchor="middle"
                        className="select-none pointer-events-none"
                      >
                        {node.type === "perimeter_gateway"
                          ? "🛡️"
                          : node.type === "identity_directory"
                          ? "🔑"
                          : node.type === "database_storage"
                          ? "🗄️"
                          : node.type === "backup_vault"
                          ? "💾"
                          : node.type === "financial_runway"
                          ? "💰"
                          : "💻"}
                      </text>

                      {/* Text Label */}
                      <text
                        x={node.x}
                        y={node.y + 39}
                        fill={isSelected ? "#38bdf8" : "#e4e4e7"}
                        fontSize="11"
                        fontWeight={isSelected ? "bold" : "600"}
                        textAnchor="middle"
                        className="select-none pointer-events-none"
                      >
                        {node.name.split(" ")[0]}
                      </text>
                      <text
                        x={node.x}
                        y={node.y + 51}
                        fill="#71717a"
                        fontSize="9"
                        textAnchor="middle"
                        className="select-none pointer-events-none"
                      >
                        {node.ipOrCidr}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Shock Injector Toolbar */}
            <div className="p-4 border-t border-zinc-800/80 bg-[#131316] space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
                <span className="flex items-center gap-1.5">
                  <Sliders className="size-4 text-cyan-400" />
                  Live Stress Controls & Threat Injection
                </span>
                <span className="text-zinc-500 font-normal">Toggle shock variables to observe live blast radius shift</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Detonate Threat Toggle */}
                <button
                  type="button"
                  onClick={() => setThreatDetonated(!threatDetonated)}
                  className={`flex items-center justify-between rounded-xl p-3 border transition text-left ${
                    threatDetonated
                      ? "bg-rose-950/40 border-rose-700/60 text-rose-200"
                      : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <div>
                    <div className="text-xs font-semibold">🚨 Detonate Threat (CVE-2024-3400)</div>
                    <div className="text-[11px] text-zinc-500">Unauthenticated GlobalProtect exploit</div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${threatDetonated ? "bg-rose-600 text-white" : "bg-zinc-800 text-zinc-400"}`}>
                    {threatDetonated ? "DETONATED" : "INACTIVE"}
                  </span>
                </button>

                {/* East-West SMB Choke Point Toggle */}
                <button
                  type="button"
                  onClick={() => toggleChokePoint("edge-smb-choke")}
                  className={`flex items-center justify-between rounded-xl p-3 border transition text-left ${
                    isolatedChokePoints.includes("edge-smb-choke")
                      ? "bg-cyan-950/40 border-cyan-600/70 text-cyan-200"
                      : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <div>
                    <div className="text-xs font-semibold">🛡️ Drop SMB Port 445 (Choke Point)</div>
                    <div className="text-[11px] text-zinc-500">Halts DCSync to Domain Controller</div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${isolatedChokePoints.includes("edge-smb-choke") ? "bg-cyan-600 text-white" : "bg-zinc-800 text-zinc-400"}`}>
                    {isolatedChokePoints.includes("edge-smb-choke") ? "QUARANTINED" : "OPEN"}
                  </span>
                </button>

                {/* Air-Gap Backup Toggle */}
                <button
                  type="button"
                  onClick={() => setAirGapBackups(!airGapBackups)}
                  className={`flex items-center justify-between rounded-xl p-3 border transition text-left ${
                    airGapBackups
                      ? "bg-emerald-950/40 border-emerald-700/60 text-emerald-200"
                      : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <div>
                    <div className="text-xs font-semibold">🔒 Air-Gap Immutable Vault</div>
                    <div className="text-[11px] text-zinc-500">WORM protection against vssadmin</div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${airGapBackups ? "bg-emerald-600 text-white" : "bg-zinc-800 text-zinc-400"}`}>
                    {airGapBackups ? "ENFORCED" : "ONLINE"}
                  </span>
                </button>
              </div>

              {/* Macro Benchmark Yield Shock Slider */}
              <div className="flex items-center gap-4 bg-zinc-900/50 rounded-xl p-3 border border-zinc-800">
                <span className="text-xs font-medium text-zinc-300 shrink-0 flex items-center gap-1.5">
                  <TrendingDown className="size-3.5 text-amber-400" />
                  Macro Yield Shock (Treasury/SOFR):
                </span>
                <input
                  type="range"
                  min="0"
                  max="300"
                  step="25"
                  value={macroRateShiftBps}
                  onChange={(e) => setMacroRateShiftBps(Number(e.target.value))}
                  className="flex-1 accent-cyan-400 h-1.5 bg-zinc-700 rounded-lg cursor-pointer"
                />
                <span className="text-xs font-bold text-cyan-300 min-w-[70px] text-right font-mono">
                  +{macroRateShiftBps} bps
                </span>
              </div>
            </div>
          </div>

          {/* Right Inspector & Mitigation Playbook Pane */}
          <div className="w-full lg:w-96 flex flex-col bg-[#141416] p-4 overflow-y-auto space-y-4">
            {/* Selected Node Details Card */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Inspected Node
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    selectedNode.status === "healthy"
                      ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                      : selectedNode.status === "breached"
                      ? "bg-rose-950 text-rose-300 border border-rose-800"
                      : selectedNode.status === "choke_point_blocked"
                      ? "bg-cyan-950 text-cyan-300 border border-cyan-800"
                      : "bg-amber-950 text-amber-300 border border-amber-800"
                  }`}
                >
                  {selectedNode.status.toUpperCase()}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white">{selectedNode.name}</h3>
                <p className="text-xs text-zinc-400 mt-0.5">{selectedNode.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-zinc-800">
                <div>
                  <span className="text-zinc-500 block text-[10px]">IP / Address</span>
                  <span className="font-mono text-zinc-300 font-semibold">{selectedNode.ipOrCidr}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px]">Criticality Tier</span>
                  <span className="text-zinc-300 font-semibold">{selectedNode.metrics.criticality}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px]">Asset Value</span>
                  <span className="text-zinc-300 font-semibold">{selectedNode.metrics.assetValue}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px]">Downtime Cost</span>
                  <span className="text-rose-400 font-semibold font-mono">
                    ${selectedNode.metrics.downtimeCostPerHour.toLocaleString()}/hr
                  </span>
                </div>
              </div>

              {selectedNode.vulnerabilities.length > 0 && (
                <div className="pt-2 border-t border-zinc-800">
                  <span className="text-zinc-500 block text-[10px] mb-1">Active Vulnerabilities</span>
                  {selectedNode.vulnerabilities.map((v, i) => (
                    <span
                      key={i}
                      className="inline-block rounded bg-rose-950/70 border border-rose-900/60 px-2 py-0.5 text-[10px] text-rose-300 mr-1 mb-1 font-mono"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Attack Path Timeline */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-2.5">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="size-3.5 text-amber-400" />
                Attack-Graph Traversal Path
              </span>
              <div className="space-y-1.5 text-xs">
                {simulation.attackPathSequence.length > 0 ? (
                  simulation.attackPathSequence.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2 bg-zinc-950/50 p-2 rounded border border-zinc-800/80">
                      <span className="text-rose-400 shrink-0 font-bold font-mono">#{idx + 1}</span>
                      <span className="text-zinc-300 text-[11px] leading-relaxed">{step}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-zinc-500 py-2">
                    Steady-state: No active traversal across perimeter edges.
                  </p>
                )}
              </div>
            </div>

            {/* Mitigation Playbook */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-2.5">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-400" />
                Deterministic Mitigation Playbook
              </span>
              <div className="space-y-1.5 text-[11px]">
                {simulation.mitigationPlaybook.map((play, idx) => (
                  <div key={idx} className="flex items-start gap-2 bg-zinc-950/50 p-2 rounded border border-zinc-800/80">
                    <span className="text-emerald-400 font-bold font-mono shrink-0">P{idx}</span>
                    <span className="text-zinc-300 leading-relaxed">{play}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-zinc-800/80 px-6 py-3 bg-[#18181b]">
          <div className="text-xs text-zinc-400 flex items-center gap-2">
            <Shield className="size-4 text-cyan-400" />
            <span>Deterministic System-Dynamic Proof Engine</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 hover:text-white transition"
            >
              <Copy className="size-3.5" />
              {copied ? "Copied!" : "Copy Report"}
            </button>
            <button
              type="button"
              onClick={handleExportCanvas}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 hover:text-white transition"
            >
              <FileText className="size-3.5 text-cyan-400" />
              Open in Canvas
            </button>
            <button
              type="button"
              onClick={handleInsertChat}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-teal-600 px-4 py-1.5 text-xs font-semibold text-white shadow hover:opacity-90 transition"
            >
              Insert into Chat
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
