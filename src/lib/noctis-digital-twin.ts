/**
 * Noctis Digital Twin & Topological Attack-Graph Simulator (NOCTIS-TWIN-001)
 *
 * Implements deterministic system-dynamic graph simulation across interconnected
 * enterprise topologies: network perimeter, identity, compute, storage, and financial balance sheets.
 * Solves lateral blast radius, identifies zero-trust choke points, and evaluates macro shocks in real-time.
 */

export type TwinNodeType =
  | "perimeter_gateway"
  | "identity_directory"
  | "compute_workload"
  | "database_storage"
  | "backup_vault"
  | "financial_runway";

export type TwinNodeStatus =
  | "healthy"
  | "breached"
  | "compromised_lateral"
  | "choke_point_blocked"
  | "stressed";

export interface DigitalTwinNode {
  id: string;
  name: string;
  type: TwinNodeType;
  domain: "security" | "infrastructure" | "finance";
  status: TwinNodeStatus;
  label: string;
  description: string;
  ipOrCidr: string;
  vulnerabilities: string[];
  metrics: {
    criticality: "Tier-0" | "Tier-1" | "Tier-2";
    assetValue: string;
    downtimeCostPerHour: number;
    recoveryTimeObjectiveHours: number;
  };
  x: number;
  y: number;
}

export interface DigitalTwinEdge {
  id: string;
  source: string;
  target: string;
  protocol: string;
  port: number;
  direction: "directed" | "bidirectional";
  status: "active" | "compromised_traversal" | "severed_quarantined";
  canChokePoint: boolean;
  chokePointName?: string;
}

export interface SimulationControls {
  threatDetonated: boolean;
  isolatedChokePointIds: string[];
  macroRateShiftBps: number; // e.g. +100 bps
  airGapBackupsEnforced: boolean;
  activePresetId: string;
}

export interface DigitalTwinSimulationResult {
  scenarioId: string;
  scenarioTitle: string;
  nodes: DigitalTwinNode[];
  edges: DigitalTwinEdge[];
  kpis: {
    blastRadiusPercent: number;
    compromisedNodeCount: number;
    totalNodeCount: number;
    resilienceScorePercent: number;
    financialRunwayMonths: number;
    hourlyDowntimeLoss: number;
    containmentStatus: "UNCONTAINED_BREACH" | "MITIGATED_CHOKEPOINT" | "BASELINE_SECURE";
  };
  attackPathSequence: string[];
  chokePointsAvailable: {
    id: string;
    name: string;
    description: string;
    isActive: boolean;
    blastReductionPercent: number;
  }[];
  mitigationPlaybook: string[];
}

export interface DigitalTwinPreset {
  id: string;
  title: string;
  description: string;
  defaultControls: SimulationControls;
}

export const TWIN_PRESETS: DigitalTwinPreset[] = [
  {
    id: "preset-enterprise-ransomware",
    title: "Enterprise Ransomware & Active Directory Detonation",
    description: "Simulates edge GlobalProtect VPN traversal (CVE-2024-3400) expanding into LSASS dumping, Domain Controller takeover, and backup deletion.",
    defaultControls: {
      threatDetonated: true,
      isolatedChokePointIds: [],
      macroRateShiftBps: 0,
      airGapBackupsEnforced: false,
      activePresetId: "preset-enterprise-ransomware",
    },
  },
  {
    id: "preset-macro-runway-shock",
    title: "FRED Macro Benchmark Yield Shock & Tech Runway Stress",
    description: "Evaluates enterprise debt service, working capital shrinkage, and venture runway under a +200 bps Treasury/SOFR interest rate hike.",
    defaultControls: {
      threatDetonated: false,
      isolatedChokePointIds: [],
      macroRateShiftBps: 200,
      airGapBackupsEnforced: true,
      activePresetId: "preset-macro-runway-shock",
    },
  },
  {
    id: "preset-zero-trust-hardened",
    title: "Zero-Trust Micro-Segmented Defense-in-Depth",
    description: "Demonstrates full edge containment where isolated administrative choke points prevent perimeter exploits from reaching core database and financial tiers.",
    defaultControls: {
      threatDetonated: true,
      isolatedChokePointIds: ["edge-smb-choke", "edge-vpn-choke"],
      macroRateShiftBps: 0,
      airGapBackupsEnforced: true,
      activePresetId: "preset-zero-trust-hardened",
    },
  },
];

/**
 * Returns the canonical enterprise topology graph G = (V, E)
 */
export function getCanonicalDigitalTwinTopology(): {
  nodes: DigitalTwinNode[];
  edges: DigitalTwinEdge[];
} {
  const nodes: DigitalTwinNode[] = [
    {
      id: "node-edge-vpn",
      name: "FW-EDGE-01 (GlobalProtect Gateway)",
      type: "perimeter_gateway",
      domain: "security",
      status: "healthy",
      label: "Edge Perimeter Gateway",
      description: "External ingress VPN portal and firewall perimeter terminating public corporate traffic.",
      ipOrCidr: "198.51.100.1",
      vulnerabilities: ["CVE-2024-3400 (CVSS 10.0, KEV Listed)"],
      metrics: {
        criticality: "Tier-1",
        assetValue: "$450,000",
        downtimeCostPerHour: 18500,
        recoveryTimeObjectiveHours: 2,
      },
      x: 80,
      y: 190,
    },
    {
      id: "node-wkstn-fin",
      name: "WKSTN-FIN-042 (Finance Desktop)",
      type: "compute_workload",
      domain: "infrastructure",
      status: "healthy",
      label: "Internal Workstation Subnet",
      description: "Finance department operational endpoint executing enterprise accounting and billing scripts.",
      ipOrCidr: "10.24.18.42",
      vulnerabilities: ["Local Admin Credential Reuse (CWE-262)"],
      metrics: {
        criticality: "Tier-2",
        assetValue: "$120,000",
        downtimeCostPerHour: 4200,
        recoveryTimeObjectiveHours: 4,
      },
      x: 270,
      y: 110,
    },
    {
      id: "node-dc-corp",
      name: "DC-CORP-01 (Primary Domain Controller)",
      type: "identity_directory",
      domain: "security",
      status: "healthy",
      label: "Identity & Kerberos KDC",
      description: "Tier-0 Active Directory Domain Controller managing enterprise authentication, Kerberos krbtgt, and GPO policies.",
      ipOrCidr: "10.24.1.10",
      vulnerabilities: ["DCSync Replication Vulnerability (T1003.006)"],
      metrics: {
        criticality: "Tier-0",
        assetValue: "$2,800,000",
        downtimeCostPerHour: 85000,
        recoveryTimeObjectiveHours: 1,
      },
      x: 470,
      y: 90,
    },
    {
      id: "node-db-fin",
      name: "FILESRV-PROD-02 / SQL-FIN-01",
      type: "database_storage",
      domain: "infrastructure",
      status: "healthy",
      label: "Core Transactional Database",
      description: "Production SQL cluster storing customer transaction records, accounts receivable, and recurring subscription databases.",
      ipOrCidr: "10.24.5.88",
      vulnerabilities: ["Insecure Volume Shadow Copy Permissions (T1490)"],
      metrics: {
        criticality: "Tier-0",
        assetValue: "$5,400,000",
        downtimeCostPerHour: 120000,
        recoveryTimeObjectiveHours: 2,
      },
      x: 470,
      y: 290,
    },
    {
      id: "node-backup-vault",
      name: "VAULT-SEC-01 (Backup Repository)",
      type: "backup_vault",
      domain: "infrastructure",
      status: "healthy",
      label: "Disaster Recovery Vault",
      description: "Secondary disaster recovery repository intended for immutable snapshot storage and bare-metal server recovery.",
      ipOrCidr: "10.24.99.5",
      vulnerabilities: ["Online Management Plane Exposure (CWE-284)"],
      metrics: {
        criticality: "Tier-0",
        assetValue: "$3,200,000",
        downtimeCostPerHour: 60000,
        recoveryTimeObjectiveHours: 6,
      },
      x: 680,
      y: 190,
    },
    {
      id: "node-fin-runway",
      name: "Cash Runway & Balance Sheet Engine",
      type: "financial_runway",
      domain: "finance",
      status: "healthy",
      label: "Enterprise Liquidity & Runway",
      description: "Treasury reserve model tracking $1.45M cash reserves against $110K monthly burn rate and debt service hurdle rates.",
      ipOrCidr: "FIN-METRIC-USD",
      vulnerabilities: ["Floating-Rate Debt Sensitivity (WACC Expansion)"],
      metrics: {
        criticality: "Tier-1",
        assetValue: "$1,450,000 Reserves",
        downtimeCostPerHour: 0,
        recoveryTimeObjectiveHours: 0,
      },
      x: 680,
      y: 350,
    },
  ];

  const edges: DigitalTwinEdge[] = [
    {
      id: "edge-vpn-wkstn",
      source: "node-edge-vpn",
      target: "node-wkstn-fin",
      protocol: "Internal VPN Tunnel (SSL-VPN)",
      port: 443,
      direction: "directed",
      status: "active",
      canChokePoint: true,
      chokePointName: "VPN Ingress Quarantine",
    },
    {
      id: "edge-wkstn-dc",
      source: "node-wkstn-fin",
      target: "node-dc-corp",
      protocol: "SMB / Admin$ / RPC",
      port: 445,
      direction: "directed",
      status: "active",
      canChokePoint: true,
      chokePointName: "East-West SMB Micro-Segmentation",
    },
    {
      id: "edge-dc-db",
      source: "node-dc-corp",
      target: "node-db-fin",
      protocol: "Kerberos Auth & GPO Deployment",
      port: 88,
      direction: "directed",
      status: "active",
      canChokePoint: true,
      chokePointName: "Domain Admin Privilege Boundary",
    },
    {
      id: "edge-db-vault",
      source: "node-db-fin",
      target: "node-backup-vault",
      protocol: "Automated Snapshot Replication",
      port: 8443,
      direction: "directed",
      status: "active",
      canChokePoint: true,
      chokePointName: "Immutable Air-Gap Storage Barrier",
    },
    {
      id: "edge-db-finops",
      source: "node-db-fin",
      target: "node-fin-runway",
      protocol: "Revenue & Billing Pipeline",
      port: 443,
      direction: "directed",
      status: "active",
      canChokePoint: false,
    },
  ];

  return { nodes, edges };
}

/**
 * Deterministically simulates the Digital Twin under specified shock events and defensive choke points.
 */
export function simulateDigitalTwin(
  controls: SimulationControls,
  baseTopology = getCanonicalDigitalTwinTopology()
): DigitalTwinSimulationResult {
  // Deep clone topology
  const nodes: DigitalTwinNode[] = JSON.parse(JSON.stringify(baseTopology.nodes));
  const edges: DigitalTwinEdge[] = JSON.parse(JSON.stringify(baseTopology.edges));

  const isolatedChokePoints = new Set(controls.isolatedChokePointIds);
  const isVpnIsolated = isolatedChokePoints.has("edge-vpn-choke") || isolatedChokePoints.has("edge-vpn-wkstn");
  const isSmbIsolated = isolatedChokePoints.has("edge-smb-choke") || isolatedChokePoints.has("edge-wkstn-dc");
  const isAirGapActive = controls.airGapBackupsEnforced || isolatedChokePoints.has("edge-db-vault");

  const attackPathSequence: string[] = [];

  // 1. Process Threat Detonation & Lateral Graph Traversal
  if (controls.threatDetonated) {
    const edgeNode = nodes.find((n) => n.id === "node-edge-vpn")!;
    edgeNode.status = "breached";
    attackPathSequence.push("Stage 1: Unauthenticated CVE-2024-3400 directory traversal exploited on FW-EDGE-01 (UID 0 root shell)");

    const edgeVpnWkstn = edges.find((e) => e.id === "edge-vpn-wkstn")!;
    if (isVpnIsolated) {
      edgeVpnWkstn.status = "severed_quarantined";
      const wkstn = nodes.find((n) => n.id === "node-wkstn-fin")!;
      wkstn.status = "choke_point_blocked";
    } else {
      edgeVpnWkstn.status = "compromised_traversal";
      const wkstn = nodes.find((n) => n.id === "node-wkstn-fin")!;
      wkstn.status = "compromised_lateral";
      attackPathSequence.push("Stage 2: Encoded PowerShell spawns comsvcs.dll MiniDump targeting lsass.exe on WKSTN-FIN-042");

      const edgeWkstnDc = edges.find((e) => e.id === "edge-wkstn-dc")!;
      if (isSmbIsolated) {
        edgeWkstnDc.status = "severed_quarantined";
        const dc = nodes.find((n) => n.id === "node-dc-corp")!;
        dc.status = "choke_point_blocked";
      } else {
        edgeWkstnDc.status = "compromised_traversal";
        const dc = nodes.find((n) => n.id === "node-dc-corp")!;
        dc.status = "compromised_lateral";
        attackPathSequence.push("Stage 3: svc_backup_admin SMB lateral movement to primary Domain Controller DC-CORP-01 (DCSync dominance)");

        const edgeDcDb = edges.find((e) => e.id === "edge-dc-db")!;
        edgeDcDb.status = "compromised_traversal";
        const db = nodes.find((n) => n.id === "node-db-fin")!;
        db.status = "compromised_lateral";
        attackPathSequence.push("Stage 4: Execution of vssadmin delete shadows /all /quiet and ransomware pre-detonation on FILESRV-PROD-02");

        const edgeDbVault = edges.find((e) => e.id === "edge-db-vault")!;
        const vault = nodes.find((n) => n.id === "node-backup-vault")!;
        if (isAirGapActive) {
          edgeDbVault.status = "severed_quarantined";
          vault.status = "healthy";
          attackPathSequence.push("Stage 4b: Lateral propagation to VAULT-SEC-01 HALTED by immutable air-gap storage barrier");
        } else {
          edgeDbVault.status = "compromised_traversal";
          vault.status = "compromised_lateral";
          attackPathSequence.push("Stage 5: Management plane credentials purged backups on VAULT-SEC-01 (Total data loss risk)");
        }
      }
    }
  }

  // 2. Process Macro Financial Stress Shock (Interest Rates & Runway)
  const baseCash = 1450000; // $1.45M
  const baseBurnRate = 110000; // $110K/mo
  const baseRunway = baseCash / baseBurnRate; // 13.18 months

  // Rate hike increases floating debt service: each +100 bps increases monthly burn by $8,500
  const monthlyDebtSurcharge = (controls.macroRateShiftBps / 100) * 8500;
  const operationalDowntimeSurcharge = nodes.filter((n) => n.status === "compromised_lateral" || n.status === "breached")
    .length * 6000;

  const adjustedMonthlyBurn = baseBurnRate + monthlyDebtSurcharge + operationalDowntimeSurcharge;
  const adjustedRunwayMonths = Math.max(1.2, parseFloat((baseCash / adjustedMonthlyBurn).toFixed(2)));

  const finNode = nodes.find((n) => n.id === "node-fin-runway")!;
  if (controls.macroRateShiftBps >= 150 || adjustedRunwayMonths < 9.0) {
    finNode.status = "stressed";
  } else {
    finNode.status = "healthy";
  }

  // 3. Compute Quantitative Graph KPIs
  const totalNodes = nodes.length;
  const compromisedCount = nodes.filter((n) => n.status === "breached" || n.status === "compromised_lateral").length;
  const blastRadiusPercent = Math.round((compromisedCount / totalNodes) * 100);
  const resilienceScorePercent = Math.max(0, 100 - blastRadiusPercent - (controls.macroRateShiftBps > 0 ? 15 : 0));

  let hourlyDowntimeLoss = 0;
  for (const node of nodes) {
    if (node.status === "breached" || node.status === "compromised_lateral") {
      hourlyDowntimeLoss += node.metrics.downtimeCostPerHour;
    }
  }

  const containmentStatus: DigitalTwinSimulationResult["kpis"]["containmentStatus"] =
    compromisedCount === 0
      ? "BASELINE_SECURE"
      : isSmbIsolated || isVpnIsolated
      ? "MITIGATED_CHOKEPOINT"
      : "UNCONTAINED_BREACH";

  // 4. Formulate Actionable Mitigation Playbook
  const mitigationPlaybook: string[] = [];
  if (controls.threatDetonated) {
    if (!isVpnIsolated) {
      mitigationPlaybook.push("P0 Action: Enforce network boundary isolation on FW-EDGE-01 to cut public C2 beaconing to 185.220.101.45.");
    }
    if (!isSmbIsolated) {
      mitigationPlaybook.push("P0 Action: Sever internal east-west SMB (TCP 445) from WKSTN-FIN-042 to Domain Controller DC-CORP-01 to stop DCSync.");
    }
    if (!isAirGapActive) {
      mitigationPlaybook.push("P1 Action: Air-gap secondary backup plane on VAULT-SEC-01 and enforce WORM (Write Once Read Many) retention locks.");
    }
  }
  if (controls.macroRateShiftBps > 0) {
    mitigationPlaybook.push(
      `Financial Resilience: Benchmark rates shifted by +${controls.macroRateShiftBps} bps. Reduce non-essential discretionary burn by $${monthlyDebtSurcharge.toLocaleString()}/mo to restore runway to >12.0 months.`
    );
  }
  if (mitigationPlaybook.length === 0) {
    mitigationPlaybook.push("All zero-trust choke points and financial buffers are currently operating within acceptable safety margins.");
  }

  const chokePointsAvailable = [
    {
      id: "edge-vpn-choke",
      name: "Perimeter Gateway Micro-Isolation",
      description: "Isolate FW-EDGE-01 ingress at the perimeter switch layer while keeping internal host memory intact.",
      isActive: isVpnIsolated,
      blastReductionPercent: 67,
    },
    {
      id: "edge-smb-choke",
      name: "East-West SMB (Port 445) Containment",
      description: "Drop all SMB/RPC traffic between workstation subnets and Tier-0 Domain Controllers.",
      isActive: isSmbIsolated,
      blastReductionPercent: 50,
    },
    {
      id: "edge-db-vault",
      name: "Immutable Backup Air-Gap Lock",
      description: "Disconnect management plane access to VAULT-SEC-01 to guarantee 100% ransomware immutability.",
      isActive: isAirGapActive,
      blastReductionPercent: 33,
    },
  ];

  return {
    scenarioId: `sim-${Date.now()}`,
    scenarioTitle: controls.activePresetId === "preset-macro-runway-shock"
      ? "FRED Macro Benchmark Yield Shock & Runway Stress"
      : controls.activePresetId === "preset-zero-trust-hardened"
      ? "Zero-Trust Micro-Segmented Defense-in-Depth Simulation"
      : "Enterprise Ransomware & Active Directory Detonation Simulation",
    nodes,
    edges,
    kpis: {
      blastRadiusPercent,
      compromisedNodeCount: compromisedCount,
      totalNodeCount: totalNodes,
      resilienceScorePercent,
      financialRunwayMonths: adjustedRunwayMonths,
      hourlyDowntimeLoss,
      containmentStatus,
    },
    attackPathSequence,
    chokePointsAvailable,
    mitigationPlaybook,
  };
}

/**
 * Formats a Digital Twin simulation into an audited Markdown Dossier.
 */
export function formatDigitalTwinDossierMarkdown(sim: DigitalTwinSimulationResult): string {
  const lines: string[] = [
    `# Noctis Digital Twin & Topological Attack-Graph Dossier (\`NOCTIS-TWIN-001\`)`,
    ``,
    `> [!IMPORTANT]`,
    `> **Simulation Scenario:** ${sim.scenarioTitle} | **Scenario ID:** \`${sim.scenarioId}\``,
    `> **Containment Disposition:** **${sim.kpis.containmentStatus}** | **System Resilience Score:** **${sim.kpis.resilienceScorePercent}%**`,
    `> **Blast Radius:** **${sim.kpis.blastRadiusPercent}%** (${sim.kpis.compromisedNodeCount} of ${sim.kpis.totalNodeCount} Nodes Compromised) | **Active Runway:** **${sim.kpis.financialRunwayMonths} months**`,
    ``,
    `────────────────────────────────────────`,
    ``,
    `### 1. Quantitative System Topology & Node State Matrix`,
    ``,
    `| Node Asset Identifier | Tier & Domain | IP Address | Status | Active Vulnerability / Stress Vector | Hourly Downtime Impact |`,
    `|---|---|---|---|---|---|`,
  ];

  for (const node of sim.nodes) {
    const statusEmoji =
      node.status === "healthy"
        ? "🟢 Healthy"
        : node.status === "breached"
        ? "🔴 Initial Breach (UID 0)"
        : node.status === "compromised_lateral"
        ? "🚨 Lateral Compromise"
        : node.status === "choke_point_blocked"
        ? "🛡️ Choke Point Contained"
        : "⚠️ Macro Stressed";

    lines.push(
      `| **${node.name}** | ${node.metrics.criticality} (${node.domain}) | \`${node.ipOrCidr}\` | ${statusEmoji} | ${node.vulnerabilities.join("; ")} | $${node.metrics.downtimeCostPerHour.toLocaleString()}/hr |`
    );
  }

  lines.push(
    ``,
    `────────────────────────────────────────`,
    ``,
    `### 2. Attack-Graph Traversal & Lateral Propagation Timeline`,
    ``
  );

  if (sim.attackPathSequence.length > 0) {
    for (const step of sim.attackPathSequence) {
      lines.push(`* **${step}**`);
    }
  } else {
    lines.push(`* **Baseline Steady-State:** No active adversarial traversal observed across perimeter or internal subnets.`);
  }

  lines.push(
    ``,
    `────────────────────────────────────────`,
    ``,
    `### 3. Financial Runway & System Resilience Impact`,
    ``,
    `* **Baseline Runway:** 13.18 months (\$1.45M Reserves / \$110,000 Monthly Burn)`,
    `* **Adjusted Runway Under Simulation:** **${sim.kpis.financialRunwayMonths} months** (Hourly Downtime Loss Rate: **\$${sim.kpis.hourlyDowntimeLoss.toLocaleString()}/hr**)`,
    `* **Zero-Trust Choke Points Evaluated:**`,
    ...sim.chokePointsAvailable.map(
      (cp) => `  * **${cp.name}** [${cp.isActive ? "✅ ENFORCED" : "❌ OPEN"}]: ${cp.description} (Reduces blast radius by **${cp.blastReductionPercent}%**)`
    ),
    ``,
    `────────────────────────────────────────`,
    ``,
    `### 4. Deterministic Engineering Mitigation Playbook`,
    ``,
    ...sim.mitigationPlaybook.map((act, idx) => `${idx + 1}. ${act}`)
  );

  return lines.join("\n");
}

/**
 * Handles natural language queries invoking the Digital Twin & Attack Graph Simulator.
 */
export function handleNaturalDigitalTwinQuery(question: string): string | null {
  const q = (question || "").trim();
  if (!q) return null;

  const isTwinProbe =
    /\b(?:digital\s+twin|attack[-_\s]*graph|topology\s+simulat\w*|simulate\s+topology|stress\s+test\s+topology|blast\s+radius\s+simulat\w*|twin\s+scenario)\b/i.test(
      q
    );

  if (!isTwinProbe) return null;

  let presetId = "preset-enterprise-ransomware";
  let controls: SimulationControls = {
    threatDetonated: true,
    isolatedChokePointIds: [],
    macroRateShiftBps: 0,
    airGapBackupsEnforced: false,
    activePresetId: presetId,
  };

  if (/macro|interest\s+rate|yield|treasury|runway|burn\s+rate/i.test(q)) {
    presetId = "preset-macro-runway-shock";
    controls = {
      threatDetonated: false,
      isolatedChokePointIds: [],
      macroRateShiftBps: 200,
      airGapBackupsEnforced: true,
      activePresetId: presetId,
    };
  } else if (/zero[-_\s]*trust|hardened|mitigate|contain|choke[-_\s]*point/i.test(q)) {
    presetId = "preset-zero-trust-hardened";
    controls = {
      threatDetonated: true,
      isolatedChokePointIds: ["edge-smb-choke", "edge-vpn-choke"],
      macroRateShiftBps: 0,
      airGapBackupsEnforced: true,
      activePresetId: presetId,
    };
  }

  const result = simulateDigitalTwin(controls);
  return formatDigitalTwinDossierMarkdown(result);
}
