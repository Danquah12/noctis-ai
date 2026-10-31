import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getCanonicalDigitalTwinTopology,
  simulateDigitalTwin,
  formatDigitalTwinDossierMarkdown,
  handleNaturalDigitalTwinQuery,
  TWIN_PRESETS,
} from "./noctis-digital-twin.ts";

describe("Noctis Digital Twin & Topological Attack-Graph Simulator", () => {
  it("provides canonical enterprise topology with 6 nodes and 5 interconnected edges", () => {
    const topo = getCanonicalDigitalTwinTopology();
    assert.equal(topo.nodes.length, 6);
    assert.equal(topo.edges.length, 5);
    assert.ok(topo.nodes.some((n) => n.id === "node-edge-vpn"));
    assert.ok(topo.nodes.some((n) => n.id === "node-dc-corp"));
    assert.ok(topo.nodes.some((n) => n.id === "node-fin-runway"));
  });

  it("simulates steady-state with 0% blast radius and baseline secure disposition", () => {
    const sim = simulateDigitalTwin({
      threatDetonated: false,
      isolatedChokePointIds: [],
      macroRateShiftBps: 0,
      airGapBackupsEnforced: true,
      activePresetId: "preset-steady-state",
    });

    assert.equal(sim.kpis.blastRadiusPercent, 0);
    assert.equal(sim.kpis.compromisedNodeCount, 0);
    assert.equal(sim.kpis.containmentStatus, "BASELINE_SECURE");
    assert.equal(sim.kpis.financialRunwayMonths, 13.18);
  });

  it("simulates ransomware detonation traversing all tiers when choke points are open", () => {
    const sim = simulateDigitalTwin({
      threatDetonated: true,
      isolatedChokePointIds: [],
      macroRateShiftBps: 0,
      airGapBackupsEnforced: false,
      activePresetId: "preset-enterprise-ransomware",
    });

    assert.equal(sim.kpis.containmentStatus, "UNCONTAINED_BREACH");
    assert.ok(sim.kpis.blastRadiusPercent >= 80);
    assert.ok(sim.kpis.hourlyDowntimeLoss > 200000);
    assert.ok(sim.attackPathSequence.length >= 4);
    assert.ok(sim.nodes.find((n) => n.id === "node-db-fin")?.status === "compromised_lateral");
  });

  it("halts lateral movement at the edge when zero-trust choke point is enforced", () => {
    const sim = simulateDigitalTwin({
      threatDetonated: true,
      isolatedChokePointIds: ["edge-vpn-choke"],
      macroRateShiftBps: 0,
      airGapBackupsEnforced: true,
      activePresetId: "preset-zero-trust-hardened",
    });

    assert.equal(sim.kpis.containmentStatus, "MITIGATED_CHOKEPOINT");
    assert.equal(sim.kpis.compromisedNodeCount, 1); // Only edge is breached
    assert.ok(sim.kpis.blastRadiusPercent <= 20);
    assert.equal(sim.nodes.find((n) => n.id === "node-dc-corp")?.status, "healthy");
    assert.equal(sim.nodes.find((n) => n.id === "node-backup-vault")?.status, "healthy");
  });

  it("compresses financial runway under macro +200 bps benchmark interest rate shock", () => {
    const sim = simulateDigitalTwin({
      threatDetonated: false,
      isolatedChokePointIds: [],
      macroRateShiftBps: 200,
      airGapBackupsEnforced: true,
      activePresetId: "preset-macro-runway-shock",
    });

    assert.ok(sim.kpis.financialRunwayMonths < 13.18);
    assert.ok(sim.kpis.financialRunwayMonths > 5.0);
    assert.equal(sim.nodes.find((n) => n.id === "node-fin-runway")?.status, "stressed");
  });

  it("formats an audited Markdown Dossier with topology table, attack path, and mitigation playbook", () => {
    const sim = simulateDigitalTwin(TWIN_PRESETS[0].defaultControls);
    const md = formatDigitalTwinDossierMarkdown(sim);

    assert.match(md, /Noctis Digital Twin & Topological Attack-Graph Dossier/);
    assert.match(md, /\| Node Asset Identifier \|/);
    assert.match(md, /Attack-Graph Traversal & Lateral Propagation Timeline/);
    assert.match(md, /Financial Runway & System Resilience Impact/);
  });

  it("routes natural language digital twin queries directly to the simulator", () => {
    const query = "Simulate digital twin and evaluate ransomware blast radius across topology";
    const res = handleNaturalDigitalTwinQuery(query);
    assert.ok(res);
    assert.match(res, /NOCTIS-TWIN-001/);
    assert.match(res, /Blast Radius/);
  });
});
