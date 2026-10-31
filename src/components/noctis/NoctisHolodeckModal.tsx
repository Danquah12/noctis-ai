import { useState, useMemo, useRef, useEffect } from "react";
import {
  Boxes,
  Compass,
  RotateCcw,
  Zap,
  Shield,
  ShieldAlert,
  Flame,
  FileCode,
  MessageSquare,
  X,
  Maximize2,
  Lock,
  Layers,
  Activity,
  DollarSign,
  AlertTriangle,
  Radio,
} from "lucide-react";
import {
  simulateHolodeck3D,
  formatHolodeckMarkdown,
  project3Dto2D,
  CANONICAL_HOLODECK_NODES_3D,
  CANONICAL_HOLODECK_EDGES_3D,
  type HolodeckSimulationState3D,
  type Vector3D,
} from "@/lib/noctis-holodeck-3d";

interface NoctisHolodeckModalProps {
  open: boolean;
  onClose: () => void;
  onOpenInCanvas?: (markdown: string, title: string) => void;
  onInsertToChat?: (text: string) => void;
}

export function NoctisHolodeckModal({
  open,
  onClose,
  onOpenInCanvas,
  onInsertToChat,
}: NoctisHolodeckModalProps) {
  const [cameraYaw, setCameraYaw] = useState<number>(35);
  const [cameraPitch, setCameraPitch] = useState<number>(20);
  const [cameraZoom, setCameraZoom] = useState<number>(520);
  const [detonateShockwave, setDetonateShockwave] = useState<boolean>(true);
  const [isolatedChokePointIds, setIsolatedChokePointIds] = useState<string[]>(["edge-3d-1"]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const simulation: HolodeckSimulationState3D = useMemo(() => {
    return simulateHolodeck3D({
      detonateShockwave,
      isolatedChokePointIds,
      cameraYaw,
      cameraPitch,
      cameraZoom,
    });
  }, [detonateShockwave, isolatedChokePointIds, cameraYaw, cameraPitch, cameraZoom]);

  const dossierMarkdown = useMemo(() => {
    return formatHolodeckMarkdown(simulation);
  }, [simulation]);

  const selectedNode = useMemo(() => {
    return simulation.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [simulation, selectedNodeId]);

  // Canvas 3D Projective Renderer Loop
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let tick = 0;

    const render = () => {
      tick++;
      const width = canvas.width;
      const height = canvas.height;

      // Dark futuristic spatial background
      ctx.fillStyle = "#07090e";
      ctx.fillRect(0, 0, width, height);

      // 1. Draw subtle 3D coordinate floor grid lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
      ctx.lineWidth = 1;
      const gridZLevels = [-150, -50, 50, 150];

      for (const gz of gridZLevels) {
        const p1 = project3Dto2D({ x: -280, y: 120, z: gz }, { yawDeg: cameraYaw, pitchDeg: cameraPitch, zoomDistance: cameraZoom, fov: 480 }, width, height);
        const p2 = project3Dto2D({ x: 300, y: 120, z: gz }, { yawDeg: cameraYaw, pitchDeg: cameraPitch, zoomDistance: cameraZoom, fov: 480 }, width, height);
        if (p1.visible && p2.visible) {
          ctx.beginPath();
          ctx.moveTo(p1.sx, p1.sy);
          ctx.lineTo(p2.sx, p2.sy);
          ctx.stroke();
        }
      }

      // 2. Render 3D Edges
      for (const edge of simulation.edges) {
        const srcNode = simulation.nodes.find((n) => n.id === edge.source);
        const tgtNode = simulation.nodes.find((n) => n.id === edge.target);
        if (!srcNode || !tgtNode) continue;

        const pSrc = project3Dto2D(srcNode.position, { yawDeg: cameraYaw, pitchDeg: cameraPitch, zoomDistance: cameraZoom, fov: 480 }, width, height);
        const pTgt = project3Dto2D(tgtNode.position, { yawDeg: cameraYaw, pitchDeg: cameraPitch, zoomDistance: cameraZoom, fov: 480 }, width, height);

        if (!pSrc.visible || !pTgt.visible) continue;

        ctx.beginPath();
        ctx.moveTo(pSrc.sx, pSrc.sy);
        ctx.lineTo(pTgt.sx, pTgt.sy);

        if (edge.status === "CHOKE_SEVERED") {
          ctx.strokeStyle = "rgba(245, 158, 11, 0.4)";
          ctx.setLineDash([4, 4]);
          ctx.lineWidth = 1.5;
        } else if (edge.status === "ATTACK_TRAVERSING") {
          ctx.strokeStyle = "rgba(239, 68, 68, 0.8)";
          ctx.setLineDash([]);
          ctx.lineWidth = 2.5;
        } else {
          ctx.strokeStyle = "rgba(56, 189, 248, 0.45)";
          ctx.setLineDash([]);
          ctx.lineWidth = 1.5;
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Animated pulse packet moving along edge
        if (edge.status === "ACTIVE_TRANSIT") {
          const t = ((tick * 1.5) % 100) / 100;
          const px = pSrc.sx + (pTgt.sx - pSrc.sx) * t;
          const py = pSrc.sy + (pTgt.sy - pSrc.sy) * t;
          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = "#38bdf8";
          ctx.fill();
        }
      }

      // 3. Render 3D Shockwave Sphere (if detonated)
      if (simulation.activeShockwave) {
        const originNode = simulation.nodes.find((n) => n.id === simulation.activeShockwave?.originNodeId) || simulation.nodes[0];
        const pOrigin = project3Dto2D(originNode.position, { yawDeg: cameraYaw, pitchDeg: cameraPitch, zoomDistance: cameraZoom, fov: 480 }, width, height);

        if (pOrigin.visible) {
          const waveRadius2D = simulation.activeShockwave.currentRadius * pOrigin.scale;
          const pulseOffset = Math.sin(tick * 0.1) * 4;

          const grad = ctx.createRadialGradient(
            pOrigin.sx,
            pOrigin.sy,
            Math.max(0, waveRadius2D * 0.2),
            pOrigin.sx,
            pOrigin.sy,
            Math.max(10, waveRadius2D + pulseOffset)
          );
          grad.addColorStop(0, "rgba(239, 68, 68, 0.02)");
          grad.addColorStop(0.7, "rgba(239, 68, 68, 0.12)");
          grad.addColorStop(1, "rgba(239, 68, 68, 0.35)");

          ctx.beginPath();
          ctx.arc(pOrigin.sx, pOrigin.sy, Math.max(10, waveRadius2D + pulseOffset), 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
          ctx.strokeStyle = "rgba(239, 68, 68, 0.6)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      // 4. Render Nodes with Depth Sorting (Furthest Z first)
      const sortedNodes = [...simulation.nodes].map((node) => {
        const proj = project3Dto2D(node.position, { yawDeg: cameraYaw, pitchDeg: cameraPitch, zoomDistance: cameraZoom, fov: 480 }, width, height);
        return { node, proj };
      }).filter((item) => item.proj.visible);

      // Sort by scale ascending (smaller scale = further away)
      sortedNodes.sort((a, b) => a.proj.scale - b.proj.scale);

      for (const { node, proj } of sortedNodes) {
        const nodeRadius = Math.max(8, Math.min(26, 14 * proj.scale));
        const isSelected = node.id === selectedNodeId;

        // Outer glow
        ctx.beginPath();
        ctx.arc(proj.sx, proj.sy, nodeRadius + (isSelected ? 6 : 3), 0, Math.PI * 2);
        if (node.status === "COMPROMISED") {
          ctx.fillStyle = "rgba(239, 68, 68, 0.3)";
        } else if (node.status === "QUARANTINED") {
          ctx.fillStyle = "rgba(245, 158, 11, 0.3)";
        } else if (node.status === "STRESSED") {
          ctx.fillStyle = "rgba(234, 179, 8, 0.25)";
        } else {
          ctx.fillStyle = "rgba(16, 185, 129, 0.25)";
        }
        ctx.fill();

        // Node core
        ctx.beginPath();
        ctx.arc(proj.sx, proj.sy, nodeRadius, 0, Math.PI * 2);
        if (node.status === "COMPROMISED") {
          ctx.fillStyle = "#ef4444";
        } else if (node.status === "QUARANTINED") {
          ctx.fillStyle = "#f59e0b";
        } else if (node.status === "STRESSED") {
          ctx.fillStyle = "#eab308";
        } else {
          ctx.fillStyle = "#10b981";
        }
        ctx.fill();
        ctx.strokeStyle = isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.6)";
        ctx.lineWidth = isSelected ? 2.5 : 1;
        ctx.stroke();

        // Node Label
        ctx.fillStyle = "#e2e8f0";
        ctx.font = `${Math.max(10, Math.min(13, Math.round(11 * proj.scale)))}px Inter, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(node.name, proj.sx, proj.sy + nodeRadius + 14);

        // Tier tag
        ctx.fillStyle = "#94a3b8";
        ctx.font = `${Math.max(8, Math.min(10, Math.round(9 * proj.scale)))}px monospace`;
        ctx.fillText(node.tier.split(" ")[0], proj.sx, proj.sy + nodeRadius + 25);
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [open, simulation, cameraYaw, cameraPitch, cameraZoom, selectedNodeId]);

  // Mouse interaction on Canvas for 3D Camera Orbit
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    setCameraYaw((prev) => (prev + dx * 0.5) % 360);
    setCameraPitch((prev) => Math.max(-60, Math.min(60, prev + dy * 0.4)));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Check hit test against nodes
    for (const node of simulation.nodes) {
      const proj = project3Dto2D(node.position, { yawDeg: cameraYaw, pitchDeg: cameraPitch, zoomDistance: cameraZoom, fov: 480 }, canvas.width, canvas.height);
      if (!proj.visible) continue;
      const dist = Math.hypot(clickX - proj.sx, clickY - proj.sy);
      if (dist <= 20) {
        setSelectedNodeId(node.id);
        return;
      }
    }
    setSelectedNodeId(null);
  };

  const toggleChokePoint = (edgeId: string) => {
    setIsolatedChokePointIds((prev) =>
      prev.includes(edgeId) ? prev.filter((id) => id !== edgeId) : [...prev, edgeId]
    );
  };

  const handleExportCanvas = () => {
    if (onOpenInCanvas) {
      onOpenInCanvas(dossierMarkdown, `Holodeck 3D: ${simulation.simulationId}`);
      onClose();
    }
  };

  const handleInsertChat = () => {
    if (onInsertToChat) {
      onInsertToChat(dossierMarkdown);
      onClose();
    }
  };

  const handleCopySeal = () => {
    navigator.clipboard.writeText(simulation.cryptographicSeal);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="relative flex flex-col w-full max-w-6xl max-h-[92vh] rounded-2xl border border-sky-500/30 bg-[#070b14] text-zinc-100 shadow-2xl overflow-hidden">
        {/* Top Header Banner */}
        <div className="flex items-center justify-between border-b border-sky-900/40 bg-gradient-to-r from-sky-950/40 via-zinc-900/60 to-black px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Boxes className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">
                  Noctis Interactive 3D Spatial Systems Holodeck
                </h2>
                <span className="rounded-full bg-sky-500/20 border border-sky-500/40 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider text-sky-300 uppercase">
                  WebGL Force-Directed Topology
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Multi-tier depth coordinate projection ($Z$-axis) with spherical shockwave propagation & choke point severance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800/80 hover:text-white transition"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Real-time KPI Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-sky-950/40 bg-zinc-950/60 p-4 text-xs">
          <div className="flex items-center gap-3 rounded-xl border border-sky-900/30 bg-sky-950/20 p-2.5">
            <Flame className="size-5 text-red-400" />
            <div>
              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">3D Blast Radius</div>
              <div className="text-sm font-bold text-red-300">{simulation.metrics.blastRadiusVolumePercent}%</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-sky-900/30 bg-sky-950/20 p-2.5">
            <Lock className="size-5 text-amber-400" />
            <div>
              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Choke Points Severed</div>
              <div className="text-sm font-bold text-amber-300">{simulation.metrics.activeChokePointsSevered} Isolated</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-sky-900/30 bg-sky-950/20 p-2.5">
            <DollarSign className="size-5 text-emerald-400" />
            <div>
              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">24-Hr Drawdown Exposure</div>
              <div className="text-sm font-bold text-emerald-300">${simulation.metrics.projectedFinancialDrawdownUsd.toLocaleString()}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-sky-900/30 bg-sky-950/20 p-2.5">
            <Layers className="size-5 text-sky-400" />
            <div>
              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Spatial Camera Orbit</div>
              <div className="text-sm font-bold text-sky-300">Yaw: {Math.round(cameraYaw)}° | Pitch: {Math.round(cameraPitch)}°</div>
            </div>
          </div>
        </div>

        {/* Main Content Body */}
        <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
          {/* 3D Canvas Viewport */}
          <div className="relative flex-1 bg-black flex flex-col items-center justify-center overflow-hidden border-b lg:border-b-0 lg:border-r border-sky-950/40 min-h-[350px]">
            <canvas
              ref={canvasRef}
              width={750}
              height={440}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onClick={handleCanvasClick}
              className="w-full h-full cursor-grab active:cursor-grabbing select-none"
            />

            {/* Orbit Helper Overlay */}
            <div className="absolute top-3 left-3 flex items-center gap-2 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10 px-2.5 py-1 text-[11px] text-zinc-400 pointer-events-none">
              <Compass className="size-3.5 text-sky-400 animate-spin" style={{ animationDuration: "12s" }} />
              <span>Drag to Orbit (Yaw/Pitch) | Click nodes to inspect</span>
            </div>

            {/* Orbit Controls Toolbar */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-xl bg-black/75 backdrop-blur-md border border-sky-900/40 px-4 py-2 text-xs">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase text-zinc-400">Yaw</span>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={cameraYaw}
                    onChange={(e) => setCameraYaw(Number(e.target.value))}
                    className="w-16 accent-sky-400 h-1 bg-zinc-700 rounded"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase text-zinc-400">Pitch</span>
                  <input
                    type="range"
                    min="-60"
                    max="60"
                    value={cameraPitch}
                    onChange={(e) => setCameraPitch(Number(e.target.value))}
                    className="w-16 accent-sky-400 h-1 bg-zinc-700 rounded"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase text-zinc-400">Zoom</span>
                  <input
                    type="range"
                    min="350"
                    max="800"
                    value={cameraZoom}
                    onChange={(e) => setCameraZoom(Number(e.target.value))}
                    className="w-16 accent-sky-400 h-1 bg-zinc-700 rounded"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setCameraYaw(35);
                    setCameraPitch(20);
                    setCameraZoom(520);
                  }}
                  className="flex items-center gap-1 rounded px-2 py-1 text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                  title="Reset Camera"
                >
                  <RotateCcw className="size-3" />
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Side Controls & Topology Inspector */}
          <div className="w-full lg:w-96 flex flex-col p-4 bg-[#0a0f1d] overflow-y-auto space-y-4">
            {/* Detonation & Defense Mode */}
            <div className="rounded-xl border border-sky-900/30 bg-zinc-900/50 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-200">Spherical Shockwave</span>
                <button
                  onClick={() => setDetonateShockwave((prev) => !prev)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium transition ${
                    detonateShockwave
                      ? "bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30"
                      : "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30"
                  }`}
                >
                  <Zap className="size-3" />
                  {detonateShockwave ? "Shockwave Active" : "Steady-State"}
                </button>
              </div>

              <p className="text-[11px] text-zinc-400">
                {detonateShockwave
                  ? "Spherical attack wavefront is propagating from Perimeter VPN across internal network tiers."
                  : "Normal baseline operations: all inter-node channels transmitting in equilibrium."}
              </p>
            </div>

            {/* Choke Point Severance Controls */}
            <div className="rounded-xl border border-sky-900/30 bg-zinc-900/50 p-3 space-y-2.5">
              <span className="text-xs font-semibold text-zinc-200">Critical Choke Point Interceptors</span>
              <p className="text-[11px] text-zinc-400">
                Severing choke points halts attack traversal before critical database or treasury tiers are breached:
              </p>

              <div className="space-y-1.5">
                {simulation.edges.map((edge) => {
                  const isSevered = isolatedChokePointIds.includes(edge.id);
                  return (
                    <button
                      key={edge.id}
                      onClick={() => toggleChokePoint(edge.id)}
                      className={`w-full flex items-center justify-between rounded-lg p-2 text-left text-xs transition border ${
                        isSevered
                          ? "bg-amber-950/30 border-amber-500/40 text-amber-200"
                          : "bg-zinc-800/40 border-zinc-700/30 text-zinc-300 hover:border-zinc-600"
                      }`}
                    >
                      <div className="truncate mr-2">
                        <div className="font-semibold truncate">{edge.protocol}</div>
                        <div className="text-[10px] text-zinc-400 truncate">
                          {edge.source} &rarr; {edge.target}
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        isSevered ? "bg-amber-500/20 text-amber-300" : "bg-sky-500/20 text-sky-300"
                      }`}>
                        {isSevered ? "SEVERED" : "CONNECTED"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Node Inspector */}
            {selectedNode && (
              <div className="rounded-xl border border-sky-500/30 bg-sky-950/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-sky-200">{selectedNode.name}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    selectedNode.status === "COMPROMISED"
                      ? "bg-red-500/20 text-red-300"
                      : selectedNode.status === "QUARANTINED"
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-emerald-500/20 text-emerald-300"
                  }`}>
                    {selectedNode.status}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400 space-y-1">
                  <div>Tier: <span className="text-zinc-200">{selectedNode.tier}</span></div>
                  <div>3D Position: <span className="text-zinc-200 font-mono">({selectedNode.position.x}, {selectedNode.position.y}, {selectedNode.position.z})</span></div>
                  <div>Asset Value: <span className="text-zinc-200">${selectedNode.assetValueUsd.toLocaleString()}</span></div>
                  <div>Downtime Rate: <span className="text-zinc-200">${selectedNode.downtimeCostPerHour.toLocaleString()}/hr</span></div>
                </div>
              </div>
            )}

            {/* SHA-256 Verification Seal */}
            <div className="rounded-xl border border-sky-900/30 bg-zinc-900/50 p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Spatial Hash Seal</span>
                <button
                  onClick={handleCopySeal}
                  className="text-[10px] text-sky-400 hover:text-sky-300 underline"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="font-mono text-[10px] text-zinc-400 truncate bg-black/40 rounded p-1.5 border border-white/5">
                {simulation.cryptographicSeal}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleExportCanvas}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium py-2.5 text-xs transition shadow-lg shadow-sky-600/25"
              >
                <FileCode className="size-3.5" />
                Export to Canvas
              </button>
              <button
                onClick={handleInsertChat}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium py-2.5 text-xs transition border border-zinc-700"
              >
                <MessageSquare className="size-3.5" />
                Insert into Chat
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
