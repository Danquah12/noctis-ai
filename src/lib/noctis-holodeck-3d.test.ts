import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  CANONICAL_HOLODECK_NODES_3D,
  CANONICAL_HOLODECK_EDGES_3D,
  project3Dto2D,
  simulateHolodeck3D,
  formatHolodeckMarkdown,
  handleNaturalHolodeckQuery,
} from "./noctis-holodeck-3d.ts";

describe("Noctis 3D Spatial Systems Holodeck (NOCTIS-HOLO-001)", () => {
  test("provides complete canonical 3D topology with 4 depth tiers", () => {
    assert.equal(CANONICAL_HOLODECK_NODES_3D.length >= 7, true);
    assert.equal(CANONICAL_HOLODECK_EDGES_3D.length >= 7, true);

    const tiers = new Set(CANONICAL_HOLODECK_NODES_3D.map((n) => n.tier));
    assert.equal(tiers.has("Perimeter (Z-1)"), true);
    assert.equal(tiers.has("Identity (Z-2)"), true);
    assert.equal(tiers.has("Compute & Data (Z-3)"), true);
    assert.equal(tiers.has("Treasury Vault (Z-4)"), true);

    // Verify all nodes have finite 3D coordinates
    for (const node of CANONICAL_HOLODECK_NODES_3D) {
      assert.equal(Number.isFinite(node.position.x), true);
      assert.equal(Number.isFinite(node.position.y), true);
      assert.equal(Number.isFinite(node.position.z), true);
    }
  });

  test("project3Dto2D correctly projects 3D coordinates with perspective scale and depth", () => {
    const centerPoint = { x: 0, y: 0, z: 0 };
    const projectedCenter = project3Dto2D(centerPoint, 0, 0, 500, 450);

    assert.equal(typeof projectedCenter.x, "number");
    assert.equal(typeof projectedCenter.y, "number");
    assert.equal(typeof projectedCenter.scale, "number");
    assert.equal(projectedCenter.scale > 0, true);

    // Front point (closer to camera) should have larger scale than back point
    const frontPoint = { x: 0, y: 0, z: -100 };
    const backPoint = { x: 0, y: 0, z: 100 };
    const projFront = project3Dto2D(frontPoint, 0, 0, 500, 450);
    const projBack = project3Dto2D(backPoint, 0, 0, 500, 450);

    assert.equal(projFront.scale > projBack.scale, true);
  });

  test("simulateHolodeck3D runs steady-state simulation without active shockwave", () => {
    const sim = simulateHolodeck3D({ detonateShockwave: false });

    assert.equal(sim.activeShockwave, null);
    assert.equal(sim.nodes.length, CANONICAL_HOLODECK_NODES_3D.length);
    assert.equal(sim.cryptographicSeal.length, 64);
    assert.equal(/^[a-f0-9]{64}$/.test(sim.cryptographicSeal), true);
    assert.equal(sim.metrics.blastRadiusVolumePercent, 0);
  });

  test("simulateHolodeck3D detonates physical shockwave and severs choke points", () => {
    const sim = simulateHolodeck3D({
      detonateShockwave: true,
      shockwaveOriginNodeId: "node-3d-vpn",
      shockRadius: 220,
      isolatedChokePointIds: ["edge-3d-1"],
    });

    assert.notEqual(sim.activeShockwave, null);
    assert.equal(sim.activeShockwave?.originNodeId, "node-3d-vpn");
    assert.equal(sim.activeShockwave?.currentRadius, 220);
    assert.equal(sim.metrics.activeChokePointsSevered, 1);
    assert.equal(sim.metrics.blastRadiusVolumePercent > 0, true);
    assert.equal(sim.metrics.projectedFinancialDrawdownUsd > 0, true);

    // The severed edge should be CHOKE_SEVERED
    const severed = sim.edges.find((e) => e.id === "edge-3d-1");
    assert.equal(severed?.status, "CHOKE_SEVERED");
  });

  test("formatHolodeckMarkdown generates complete formatted markdown dossier", () => {
    const sim = simulateHolodeck3D({ detonateShockwave: true });
    const md = formatHolodeckMarkdown(sim);

    assert.equal(md.includes("# Noctis Interactive 3D Spatial Systems Holodeck"), true);
    assert.equal(md.includes("Spatial Topology Nodes & Multi-Tier Layering"), true);
    assert.equal(md.includes("3D Interconnect Edges & Transmission Vector Status"), true);
    assert.equal(md.includes("Dynamic 3D Spherical Shockwave Propagation"), true);
    assert.equal(md.includes("Cryptographic Spatial Verification Seal"), true);
    assert.equal(md.includes(sim.cryptographicSeal), true);
  });

  test("handleNaturalHolodeckQuery accurately routes holodeck and 3d spatial queries", () => {
    const query = "Launch the 3D holodeck spatial topology simulation to see the shockwave cascade";
    const res = handleNaturalHolodeckQuery(query);

    assert.notEqual(res, null);
    assert.equal(res?.includes("# Noctis Interactive 3D Spatial Systems Holodeck"), true);
    assert.equal(res?.includes("Perimeter (Z-1)"), true);

    // Negative case
    const unrelated = "What is the capital of France?";
    assert.equal(handleNaturalHolodeckQuery(unrelated), null);
  });
});
