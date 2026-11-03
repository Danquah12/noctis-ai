import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CVE_2024_3400_ADVISORY,
  getCanonicalDigitalTwinTopology,
  simulateDigitalTwin,
  formatDigitalTwinDossierMarkdown,
  generateNoctisTwinPrincipalArchitectSelfAudit,
  handleNaturalDigitalTwinQuery,
  TWIN_PRESETS,
} from "./noctis-digital-twin.ts";

describe("NOCTIS-TWIN-001 v2.0 — 15 Enterprise Acceptance Tests (AT-01 through AT-15)", () => {
  it("AT-01: validates asset identity and uniqueness (FILESRV-PROD-02 and SQL-FIN-01 are separate assets + 1,420 fleet total)", () => {
    const topo = getCanonicalDigitalTwinTopology();
    assert.equal(topo.nodes.length, 7);
    const assetIds = new Set(topo.nodes.map((n) => n.assetId));
    assert.equal(assetIds.size, 7);
    assert.ok(assetIds.has("ASSET-FILESRV-PROD-02"));
    assert.ok(assetIds.has("ASSET-SQL-FIN-01"));
    const totalFleet = topo.nodes
      .filter((n) => n.domain !== "finance")
      .reduce((acc, n) => acc + n.fleetAssetCount, 0);
    assert.equal(totalFleet, 1420); // 1,200 wkstn + 150 win srv + 65 sql/linux/cloud + 3 DCs + 1 fw + 1 vault
  });

  it("AT-02: correctly classifies and separates CVE, CWE, and MITRE ATT&CK records (DCSync T1003.006 & T1490 are ATT&CK techniques, NOT CVEs)", () => {
    const topo = getCanonicalDigitalTwinTopology();
    const dc = topo.nodes.find((n) => n.id === "node-dc-corp")!;
    assert.equal(dc.structuredClassification.cves.length, 0);
    assert.equal(dc.structuredClassification.attackTechniques[0].techniqueId, "T1003.006");
    assert.equal(dc.structuredClassification.attackTechniques[0].isSoftwareVulnerability, false);
    assert.equal(dc.structuredClassification.cwes[0].cweId, "CWE-269");

    const fs = topo.nodes.find((n) => n.id === "node-filesrv-prod")!;
    assert.equal(fs.structuredClassification.cves.length, 0);
    assert.equal(fs.structuredClassification.attackTechniques[0].techniqueId, "T1490");
    assert.equal(fs.structuredClassification.attackTechniques[0].isSoftwareVulnerability, false);
  });

  it("AT-03: validates CVE-2024-3400 against Palo Alto vendor advisory (OS command injection via arbitrary file creation, CWE-78/CWE-73)", () => {
    assert.equal(CVE_2024_3400_ADVISORY.cveId, "CVE-2024-3400");
    assert.match(CVE_2024_3400_ADVISORY.vulnerabilityType, /OS Command Injection through Arbitrary File Creation/i);
    assert.ok(CVE_2024_3400_ADVISORY.cweIds.includes("CWE-78"));
    assert.ok(CVE_2024_3400_ADVISORY.cweIds.includes("CWE-73"));
    assert.equal(CVE_2024_3400_ADVISORY.cvssScore, 10.0);
    assert.equal(CVE_2024_3400_ADVISORY.inCisaKev, true);
  });

  it("AT-04: generates directed property graph relationships with privileges, reachability, auth dependencies, and confidence", () => {
    const topo = getCanonicalDigitalTwinTopology();
    assert.equal(topo.edges.length, 6);
    for (const edge of topo.edges) {
      assert.ok(edge.source && edge.target);
      assert.ok(edge.relationshipType);
      assert.ok(edge.requiredPrivileges.length > 0);
      assert.ok(edge.networkReachability.length > 0);
      assert.ok(edge.edgeConfidence > 0 && edge.edgeConfidence <= 1.0);
      assert.ok(edge.evidenceReference.startsWith("EVID-"));
    }
  });

  it("AT-05: distinguishes hypothetical simulated attack paths from telemetry-validated attack paths", () => {
    const simHyp = simulateDigitalTwin({
      ...TWIN_PRESETS[0].defaultControls,
      telemetryValidated: false,
    });
    assert.equal(simHyp.pathValidationState, "HYPOTHETICAL_SIMULATED_PATH");
    assert.ok(simHyp.edges.every((e) => e.validationState === "HYPOTHETICAL_SIMULATED_EDGE"));

    const simVal = simulateDigitalTwin({
      ...TWIN_PRESETS[0].defaultControls,
      telemetryValidated: true,
    });
    assert.equal(simVal.pathValidationState, "EVIDENCE_VALIDATED_PATH");
    assert.ok(simVal.edges.every((e) => e.validationState === "EVIDENCE_VALIDATED_EDGE"));
  });

  it("AT-06: calculates blast radius using both reachable archetype nodes (1/6 = 16.67%) and 1,420 enterprise fleet assets (1/1420 = 0.07%)", () => {
    const simEdgeContained = simulateDigitalTwin(TWIN_PRESETS[2].defaultControls);
    assert.equal(simEdgeContained.blastRadiusAnalysis.compromisedArchetypeNodes, 1);
    assert.equal(simEdgeContained.blastRadiusAnalysis.totalInfrastructureArchetypeNodes, 6);
    assert.equal(simEdgeContained.blastRadiusAnalysis.archetypeNodeBlastRadiusPercent, 16.67);
    assert.equal(simEdgeContained.blastRadiusAnalysis.compromisedEnterpriseFleetAssets, 1);
    assert.equal(simEdgeContained.blastRadiusAnalysis.totalEnterpriseFleetAssets, 1420);
    assert.equal(simEdgeContained.blastRadiusAnalysis.enterpriseFleetBlastRadiusPercent, 0.07);
  });

  it("AT-07: calculates criticality-weighted business impact separately from asset-count blast radius", () => {
    const simEdgeContained = simulateDigitalTwin(TWIN_PRESETS[2].defaultControls);
    assert.notEqual(
      simEdgeContained.blastRadiusAnalysis.weightedBusinessImpactPercent,
      simEdgeContained.blastRadiusAnalysis.archetypeNodeBlastRadiusPercent
    );
    assert.ok(simEdgeContained.blastRadiusAnalysis.weightedBusinessImpactPercent > 0);
    assert.ok(simEdgeContained.blastRadiusAnalysis.totalWeightedValueUsd > 20000000);
  });

  it("AT-08: reproduces the exact 13.18 -> 12.50 months financial runway calculation for a 4.04-hour perimeter outage ($74,800 loss)", () => {
    const simHardened = simulateDigitalTwin(TWIN_PRESETS[2].defaultControls);
    assert.equal(simHardened.financialAnalysis.baselineRunwayMonths, 13.18);
    assert.equal(simHardened.financialAnalysis.simulationDurationHours, 4.04);
    assert.equal(simHardened.financialAnalysis.hourlyDowntimeLossUsd, 18500);
    assert.equal(simHardened.financialAnalysis.directOutageLossUsd, 74800);
    assert.equal(simHardened.financialAnalysis.effectiveRemainingReservesUsd, 1375200);
    assert.equal(simHardened.financialAnalysis.postIncidentRunwayMonths, 12.5);
    assert.equal(simHardened.financialAnalysis.runwayReductionMonths, 0.68);
  });

  it("AT-09: derives mitigation blast-radius reduction percentages dynamically from baseline-vs-mitigated runs", () => {
    const sim = simulateDigitalTwin(TWIN_PRESETS[0].defaultControls);
    const vpnCp = sim.chokePointsAvailable.find((c) => c.id === "edge-vpn-choke")!;
    const smbCp = sim.chokePointsAvailable.find((c) => c.id === "edge-smb-choke")!;
    const vaultCp = sim.chokePointsAvailable.find((c) => c.id === "edge-db-vault")!;

    assert.equal(vpnCp.baselineCompromisedNodes, 6);
    assert.equal(vpnCp.mitigatedCompromisedNodes, 1);
    assert.equal(vpnCp.blastReductionPercent, 83); // (6 - 1) / 6 = 83%

    assert.equal(smbCp.baselineCompromisedNodes, 6);
    assert.equal(smbCp.mitigatedCompromisedNodes, 2);
    assert.equal(smbCp.blastReductionPercent, 67); // (6 - 2) / 6 = 67%

    assert.equal(vaultCp.baselineCompromisedNodes, 6);
    assert.equal(vaultCp.mitigatedCompromisedNodes, 5);
    assert.equal(vaultCp.blastReductionPercent, 17); // (6 - 5) / 6 = 17%
  });

  it("AT-10: rejects unsupported 100% backup immutability claims and models 6-factor backup recoverability", () => {
    const sim = simulateDigitalTwin(TWIN_PRESETS[2].defaultControls);
    assert.equal(sim.backupGovernance.claimsAbsolute100PercentImmutability, false);
    assert.ok(sim.backupGovernance.modeledRiskReductionPercent < 100);
    assert.equal(sim.backupGovernance.modeledRiskReductionPercent, 92);
  });

  it("AT-11: validates network segmentation against required Active Directory service dependencies (SYSVOL, Kerberos, DNS, LDAP)", () => {
    const sim = simulateDigitalTwin(TWIN_PRESETS[2].defaultControls);
    const smbCp = sim.chokePointsAvailable.find((c) => c.id === "edge-smb-choke")!;
    assert.match(smbCp.scopedServiceAllowlistNote, /SYSVOL\/NETLOGON/);
    assert.match(smbCp.scopedServiceAllowlistNote, /Kerberos/);
    assert.match(smbCp.scopedServiceAllowlistNote, /DNS/);
    assert.match(smbCp.scopedServiceAllowlistNote, /LDAP/);
  });

  it("AT-12: produces reproducible resilience scores with explicit 6-component weighted formula", () => {
    const sim = simulateDigitalTwin(TWIN_PRESETS[2].defaultControls);
    const rb = sim.resilienceBreakdown;
    const expected = Math.round(
      rb.survivingAssetsScore * rb.weights.survivingAssets +
        rb.networkSegmentationScore * rb.weights.networkSegmentation +
        rb.attackPathResistanceScore * rb.weights.attackPathResistance +
        rb.backupRecoverabilityScore * rb.weights.backupRecoverability +
        rb.rtoContinuityScore * rb.weights.rtoContinuity +
        rb.financialRunwayScore * rb.weights.financialRunway
    );
    assert.equal(rb.compositeResiliencePercent, expected);
    assert.equal(sim.kpis.resilienceScorePercent, expected);
  });

  it("AT-13: compares baseline uncontained detonation vs. mitigated zero-trust simulation outcomes", () => {
    const baseline = simulateDigitalTwin(TWIN_PRESETS[0].defaultControls);
    const mitigated = simulateDigitalTwin(TWIN_PRESETS[2].defaultControls);
    assert.equal(baseline.kpis.containmentStatus, "UNCONTAINED_BREACH");
    assert.equal(mitigated.kpis.containmentStatus, "MITIGATED_CHOKEPOINT");
    assert.ok(mitigated.kpis.compromisedNodeCount < baseline.kpis.compromisedNodeCount);
    assert.ok(mitigated.kpis.resilienceScorePercent > baseline.kpis.resilienceScorePercent);
    assert.ok(mitigated.kpis.financialRunwayMonths > baseline.kpis.financialRunwayMonths);
  });

  it("AT-14: preserves evidence references and SHA-256 provenance for every node and graph edge", () => {
    const topo = getCanonicalDigitalTwinTopology();
    for (const n of topo.nodes) {
      assert.ok(n.structuredClassification.evidence.length >= 1);
      assert.equal(n.structuredClassification.evidence[0].sha256.length, 64);
    }
  });

  it("AT-15: generates complete executive & technical Markdown dossier and Principal Architect Self-Audit", () => {
    const sim = simulateDigitalTwin(TWIN_PRESETS[2].defaultControls);
    const md = formatDigitalTwinDossierMarkdown(sim);
    assert.match(md, /NOCTIS-TWIN-001 v2\.0/);
    assert.match(md, /Directed Topological Property Graph Edges/);
    assert.match(md, /12\.5 months/);

    const audit = generateNoctisTwinPrincipalArchitectSelfAudit();
    assert.match(audit, /Independent Principal Cybersecurity Architect Self-Audit/);
    assert.match(audit, /OS command injection resulting from arbitrary file creation/i);

    const routedAudit = handleNaturalDigitalTwinQuery(
      "Review your own NOCTIS-TWIN-001 Digital Twin dossier as an independent principal cybersecurity architect."
    );
    assert.ok(routedAudit);
    assert.match(routedAudit, /Conditional Fail \(4\.5\/10\)/);
    assert.match(routedAudit, /9\.4 \/ 10/);
  });
});
