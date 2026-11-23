import test from "node:test";
import assert from "node:assert/strict";
import { exportEmassXlsxWorkbook, generateComplianceBinderMarkdown } from "./emass-export-engine.ts";
import { listStigBenchmarks, lookupStigRuleById, searchStigLibrary } from "./stig-library.ts";
import { buildAttackNavigatorLayer, parseSigmaYamlRule, parseYaraRule } from "./sigma-attack-engine.ts";
import { executeDodIcReasoning, isDodIcQuery } from "./dod-ic-reasoning.server.ts";
import { handleDodIcV2Request } from "./api-handler.server.ts";

test("eMASS OOXML .xlsx generator builds valid ZIP binary & SSP/SAR/POA&M compliance binder", () => {
  const xlsx = exportEmassXlsxWorkbook({
    systemName: "JADC2 Enclave Alpha",
    emassSystemId: "EMASS-77100",
    impactLevel: "IL5",
  });
  assert.equal(xlsx.buffer[0], 0x50); // 'P'
  assert.equal(xlsx.buffer[1], 0x4b); // 'K'
  assert.equal(xlsx.buffer[2], 0x03);
  assert.equal(xlsx.buffer[3], 0x04);
  assert.deepEqual(xlsx.sheetNames, ["Control_Implementation", "POAM_Items", "Test_Results_Summary"]);
  assert.ok(xlsx.buffer.includes("xl/worksheets/sheet1.xml"));
  assert.equal(xlsx.aiCanIssueAto, false);

  const binder = generateComplianceBinderMarkdown({
    systemName: "JADC2 Enclave Alpha",
    emassSystemId: "EMASS-77100",
    impactLevel: "IL5",
  });
  assert.match(binder.markdown, /EMASS-77100/);
  assert.match(binder.markdown, /aiCanIssueAto: false/);
  assert.equal(binder.sha256.length, 64);
});

test("Pre-indexed DISA STIG benchmark library hydrates official CCIs -> NIST SP 800-53 Rev. 5 & routes through Chat", async () => {
  const bms = listStigBenchmarks();
  assert.equal(bms.length, 5);

  const rhelFips = lookupStigRuleById("V-257777");
  assert.ok(rhelFips);
  assert.equal(rhelFips.severity, "CAT_I");
  assert.ok(rhelFips.nistRev5Controls.length > 0);
  assert.ok(rhelFips.nistRev5Controls.includes("SC-13"));

  const k8sRules = searchStigLibrary({ benchmarkId: "K8S_STIG" });
  assert.ok(k8sRules.length >= 5);

  assert.equal(isDodIcQuery("Explain RHEL 9 STIG V-257777 and its NIST Rev 5 control mapping"), true);
  const ans = await executeDodIcReasoning("Explain RHEL 9 STIG V-257777 and check steps", {
    modelChatFn: async () => ({ error: "offline test" }),
    persistTrace: false,
  });
  assert.match(ans, /V-257777/);
  assert.match(ans, /SC-13/);
  assert.match(ans, /fips-mode-setup/i);
});

test("Sigma YAML / YARA parser and MITRE ATT&CK Navigator v4.5 JSON exporter", () => {
  const sigma = parseSigmaYamlRule(`title: LSASS Memory Access
id: 11111111-2222-3333-4444-555555555555
status: stable
level: high
logsource:
  category: process_access
  product: windows
detection:
  selection:
    TargetImage|endswith: '\\lsass.exe'
  condition: selection
tags:
  - attack.credential_access
  - attack.t1003.001`);
  assert.equal(sigma.valid, true);
  assert.deepEqual(sigma.attackTechniques, ["T1003.001"]);
  assert.equal(sigma.warnings.length, 0);

  const yara = parseYaraRule(`rule Detect_Bad_Implant {
  meta:
    author = "DCO"
  strings:
    $a = "T1059.001"
  condition:
    $a
}`);
  assert.equal(yara.valid, true);
  assert.equal(yara.stringsCount, 1);

  const nav = buildAttackNavigatorLayer({
    techniques: [
      { techniqueId: "T1003.001", coverageStatus: "DETECTED" },
      { techniqueId: "T1078", coverageStatus: "BLIND_SPOT" },
    ],
  });
  assert.equal(nav.layer.versions.layer, "4.5");
  assert.equal(nav.layer.techniques[0]!.color, "#10b981");
  assert.equal(nav.layer.techniques[1]!.color, "#ef4444");
});

test("New /api/v2/dod-ic/* endpoints: /auth/me, /stig/library, /cron/drift-check, /export/emass-xlsx, /export/binder, /dco/sigma-navigator", async () => {
  const authRes = await handleDodIcV2Request(new Request("http://localhost/api/v2/dod-ic/auth/me"));
  assert.equal(authRes.status, 200);
  const authJson = (await authRes.json()) as { tenantId: string; rbacRole: string };
  assert.equal(authJson.tenantId, "tenant:public-sandbox");

  const libRes = await handleDodIcV2Request(new Request("http://localhost/api/v2/dod-ic/stig/library?benchmark=K8S_STIG"));
  assert.equal(libRes.status, 200);
  const libJson = (await libRes.json()) as { count: number; rules: { groupId: string }[] };
  assert.ok(libJson.count >= 5);

  const cronRes = await handleDodIcV2Request(new Request("http://localhost/api/v2/dod-ic/cron/drift-check?live=false"));
  assert.equal(cronRes.status, 200);
  const cronJson = (await cronRes.json()) as { ok: boolean; autoApplyToProduction: boolean; snapshotId: string };
  assert.equal(cronJson.ok, true);
  assert.equal(cronJson.autoApplyToProduction, false);
  assert.match(cronJson.snapshotId, /^DRIFT-/);

  const xlsxRes = await handleDodIcV2Request(
    new Request("http://localhost/api/v2/dod-ic/export/emass-xlsx?format=json", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ system_name: "Test Enclave", emass_system_id: "EMASS-101" }),
    }),
  );
  assert.equal(xlsxRes.status, 200);
  const xlsxJson = (await xlsxRes.json()) as { base64: string; sheetNames: string[] };
  assert.equal(Buffer.from(xlsxJson.base64, "base64").subarray(0, 2).toString("utf8"), "PK");

  const navRes = await handleDodIcV2Request(
    new Request("http://localhost/api/v2/dod-ic/dco/sigma-navigator", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sigma_yaml: "title: Test Rule\nlogsource:\n  product: windows\ndetection:\n  sel:\n    Image: cmd.exe\n  condition: sel\ntags:\n  - attack.t1059",
      }),
    }),
  );
  assert.equal(navRes.status, 200);
  const navJson = (await navRes.json()) as { sigma: { valid: boolean }; navigator: { layer: { versions: { layer: string } } } };
  assert.equal(navJson.sigma.valid, true);
  assert.equal(navJson.navigator.layer.versions.layer, "4.5");
});
