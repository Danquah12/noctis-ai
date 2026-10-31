/**
 * Unit Test Suite for Noctis Autonomous "Red vs. Blue" War Room Sandbox (NOCTIS-WAR-ROOM-001)
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  PREDEFINED_WAR_ROOM_SCENARIOS,
  runWarRoomSimulation,
  formatWarRoomDossierMarkdown,
  handleNaturalWarRoomQuery,
} from "./noctis-war-room.ts";
import { runFollowUpIntelligence } from "./noctis-response-intelligence.ts";

describe("Noctis Autonomous 'Red vs. Blue' War Room Sandbox", () => {
  test("provides 4 canonical enterprise threat scenarios across critical domains", () => {
    const keys = Object.keys(PREDEFINED_WAR_ROOM_SCENARIOS);
    assert.equal(keys.length, 4);
    assert.ok(PREDEFINED_WAR_ROOM_SCENARIOS["scenario-edge-rce"]);
    assert.ok(PREDEFINED_WAR_ROOM_SCENARIOS["scenario-ad-ransomware"]);
    assert.ok(PREDEFINED_WAR_ROOM_SCENARIOS["scenario-cloud-oauth-hijack"]);
    assert.ok(PREDEFINED_WAR_ROOM_SCENARIOS["scenario-supply-chain-ci"]);
  });

  test("enforces Zero-Payload Boundary on all Red Team canaries", () => {
    for (const scenario of Object.values(PREDEFINED_WAR_ROOM_SCENARIOS)) {
      assert.ok(scenario.redTeamCanary.zeroPayloadGuarantee.includes("ZERO-PAYLOAD"));
      assert.ok(scenario.redTeamCanary.safeVerificationProbe.length > 0);
      assert.ok(scenario.redTeamCanary.techniqueId.startsWith("T"));
      assert.ok(scenario.redTeamCanary.prerequisites.length > 0);
    }
  });

  test("generates syntactically complete Sigma YAML detection rules for Blue Team", () => {
    for (const scenario of Object.values(PREDEFINED_WAR_ROOM_SCENARIOS)) {
      const yaml = scenario.blueTeamDefense.sigmaRuleYaml;
      assert.ok(yaml.includes("title:"));
      assert.ok(yaml.includes("logsource:"));
      assert.ok(yaml.includes("detection:"));
      assert.ok(yaml.includes("level:"));
      assert.ok(yaml.includes("tags:"));
    }
  });

  test("generates valid KQL hunting queries for Microsoft Sentinel / Defender", () => {
    for (const scenario of Object.values(PREDEFINED_WAR_ROOM_SCENARIOS)) {
      const kql = scenario.blueTeamDefense.kqlHuntingQuery;
      assert.ok(kql.includes("//") || kql.includes("|"));
      assert.ok(
        kql.includes("DeviceProcessEvents") ||
          kql.includes("SigninLogs") ||
          kql.includes("ContainerLogEvents")
      );
      assert.ok(kql.includes("| project") || kql.includes("| summarize") || kql.includes("| where"));
    }
  });

  test("evaluates unmitigated attack state with HIGH_RESIDUAL_RISK and confirmed canary access", () => {
    const result = runWarRoomSimulation("scenario-edge-rce", false);
    assert.equal(result.mitigationsApplied, false);
    assert.equal(result.redTeamEngagement.canaryStatus, "ACCESS_CONFIRMED");
    assert.equal(result.certificate.verdict, "HIGH_RESIDUAL_RISK");
    assert.equal(result.certificate.exploitabilityReductionPercent, 0);
    assert.ok(result.certificate.baselineExposureScore >= 80);
    assert.equal(result.certificate.residualRiskScore, result.certificate.baselineExposureScore);
  });

  test("evaluates mitigated state with CERTIFIED_HARDENED verdict, perimeter block, and >85% risk reduction", () => {
    const result = runWarRoomSimulation("scenario-ad-ransomware", true);
    assert.equal(result.mitigationsApplied, true);
    assert.equal(result.redTeamEngagement.canaryStatus, "BLOCKED_AT_PERIMETER");
    assert.equal(result.certificate.verdict, "CERTIFIED_HARDENED");
    assert.ok(result.certificate.exploitabilityReductionPercent >= 85);
    assert.ok(result.certificate.residualRiskScore <= 15);
    assert.equal(result.certificate.verificationHash.length, 64); // SHA-256 hex string
  });

  test("formats an audited Markdown Dossier with complete sections, Sigma rule, KQL query, and certificate", () => {
    const result = runWarRoomSimulation("scenario-supply-chain-ci", true);
    const markdown = formatWarRoomDossierMarkdown(result);

    assert.ok(markdown.includes("# Noctis Autonomous \"Red vs. Blue\" War Room Sandbox"));
    assert.ok(markdown.includes("### 1. Adversarial Scenario & Threat Actor Profile"));
    assert.ok(markdown.includes("### 2. 🛡️ Red Team Offensive Analysis"));
    assert.ok(markdown.includes("### 3. 🛡️ Blue Team CSIRT & Detection Engineering"));
    assert.ok(markdown.includes("### 4. 🔏 Audited Cryptographic Security Assurance Certificate"));
    assert.ok(markdown.includes("```yaml"));
    assert.ok(markdown.includes("```kql"));
    assert.ok(markdown.includes("SHA-256 Audit Fingerprint"));
  });

  test("routes natural language war room queries to the appropriate threat scenario", () => {
    const rce = handleNaturalWarRoomQuery("Can you run the Red vs Blue war room on an edge appliance?");
    assert.ok(rce);
    assert.ok(rce.includes("CVE-2024-3400"));

    const rsw = handleNaturalWarRoomQuery("Simulate adversarial attack with vssadmin shadow copy deletion in the war room");
    assert.ok(rsw);
    assert.ok(rsw.includes("Active Directory Shadow Copy"));

    const oauth = handleNaturalWarRoomQuery("Run war room sandbox on cloud oauth token hijacking");
    assert.ok(oauth);
    assert.ok(oauth.includes("Cloud Identity OAuth"));

    const unrelated = handleNaturalWarRoomQuery("What is the weather in Accra today?");
    assert.equal(unrelated, null);
  });

  test("integrates smoothly with runFollowUpIntelligence router", () => {
    const response = runFollowUpIntelligence([], "Simulate red vs blue war room for ransomware attack on domain controller");
    assert.ok(response);
    assert.ok(response.includes("NOCTIS-WAR-ROOM-001") || response.includes("War Room Sandbox"));
    assert.ok(response.includes("Active Directory Shadow Copy"));
    assert.ok(response.includes("Sigma Detection Rule"));
  });
});
