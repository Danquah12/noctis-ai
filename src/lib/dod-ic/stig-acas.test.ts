import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateDodi8530IncidentReporting,
  evaluateDodi8531VulnerabilityCompliance,
  extractNistControlIdFromCciIndex,
  getDisaCciManifest,
  listCcisForNistControl,
  lookupDisaCci,
  parseAndEvaluateAcasNessus,
  parseAndEvaluateStigXccdfOrCkl,
} from "./stig-acas-engine.ts";
import {
  executeDodIcReasoning,
  isDodIcQuery,
  verifyDodIcResponse,
} from "./dod-ic-reasoning.server.ts";
import { handleDodIcV2Request } from "./api-handler.server.ts";

test("DISA CCI compiler manifest, lookups, enhancement normalization & reverse crosswalk", () => {
  const manifest = getDisaCciManifest();
  assert.equal(manifest.version, "2025-01-23");
  assert.equal(manifest.counts.totalCcis, 5137);
  assert.ok(manifest.counts.rev5MappedCcis > 3500);

  // Normalization invariant: sub-item letters NEVER become enhancements, numeric parens DO
  assert.equal(extractNistControlIdFromCciIndex("AC-1 a 1 (a)"), "AC-1");
  assert.equal(extractNistControlIdFromCciIndex("IA-2 (1) (a)"), "IA-2(1)");
  assert.equal(extractNistControlIdFromCciIndex("CM-6 b"), "CM-6");

  const cci000002 = lookupDisaCci("CCI-000002");
  assert.ok(cci000002);
  assert.deepEqual(cci000002.nistRev5Controls, ["AC-1"]);

  const cci000015 = lookupDisaCci("CCI-000015");
  assert.ok(cci000015);
  assert.deepEqual(cci000015.nistRev5Controls, ["AC-2(1)"]);

  const cci000765 = lookupDisaCci("765");
  assert.ok(cci000765);
  assert.equal(cci000765.cciId, "CCI-000765");
  assert.deepEqual(cci000765.nistRev5Controls, ["IA-2(1)"]);

  const cci000366 = lookupDisaCci("CCI-000366");
  assert.ok(cci000366);
  assert.deepEqual(cci000366.nistRev5Controls, ["CM-6"]);

  const ia21List = listCcisForNistControl("IA-2(1)");
  assert.ok(ia21List.some((x) => x.cciId === "CCI-000765"));

  const ac2List = listCcisForNistControl("AC-2");
  assert.ok(ac2List.length > 5);
});

test("ACAS / Nessus (.nessus XML): multi-host dedup, live/seed CISA KEV match, credentialed-scan failure & epistemic separation", async () => {
  const sampleNessusXml = `<?xml version="1.0" ?>
<NessusClientData_v2>
  <Report name="DODIN-Enclave-Scan">
    <ReportHost name="web-01.dod.local">
      <HostProperties>
        <tag name="host-ip">10.10.1.10</tag>
        <tag name="operating-system">Red Hat Enterprise Linux 8.9</tag>
        <tag name="Credentialed_Scan">true</tag>
      </HostProperties>
      <ReportItem port="443" svc_name="https" protocol="tcp" severity="4" pluginID="193123" pluginName="PAN-OS GlobalProtect Command Injection" pluginFamily="Firewalls">
        <cve>CVE-2024-3400</cve>
        <cvss3_base_score>10.0</cvss3_base_score>
        <solution>Apply PAN-OS hotfix and verify.</solution>
        <plugin_output>days_open: 20</plugin_output>
      </ReportItem>
      <ReportItem port="0" svc_name="general" protocol="tcp" severity="0" pluginID="19506" pluginName="Nessus Scan Information" pluginFamily="Settings">
        <plugin_output>Credentialed checks : yes</plugin_output>
      </ReportItem>
    </ReportHost>
    <ReportHost name="web-02.dod.local">
      <HostProperties>
        <tag name="host-ip">10.10.1.11</tag>
        <tag name="Credentialed_Scan">true</tag>
      </HostProperties>
      <ReportItem port="443" svc_name="https" protocol="tcp" severity="4" pluginID="193123" pluginName="PAN-OS GlobalProtect Command Injection" pluginFamily="Firewalls">
        <cve>CVE-2024-3400</cve>
        <cvss3_base_score>10.0</cvss3_base_score>
        <solution>Apply PAN-OS hotfix and verify.</solution>
        <plugin_output>days_open: 22</plugin_output>
      </ReportItem>
    </ReportHost>
    <ReportHost name="app-03.dod.local">
      <HostProperties>
        <tag name="host-ip">10.10.1.12</tag>
        <tag name="Credentialed_Scan">false</tag>
      </HostProperties>
      <ReportItem port="0" svc_name="general" protocol="tcp" severity="0" pluginID="19506" pluginName="Nessus Scan Information" pluginFamily="Settings">
        <plugin_output>Credentialed checks : no</plugin_output>
      </ReportItem>
      <ReportItem port="22" svc_name="ssh" protocol="tcp" severity="0" pluginID="21745" pluginName="Authentication Failure - Local Checks Not Run" pluginFamily="Settings">
        <plugin_output>SSH key rejected for svc_acas</plugin_output>
      </ReportItem>
      <ReportItem port="22" svc_name="ssh" protocol="tcp" severity="0" pluginID="110385" pluginName="Insufficient Privilege" pluginFamily="Settings">
        <plugin_output>sudo privilege absent</plugin_output>
      </ReportItem>
    </ReportHost>
  </Report>
</NessusClientData_v2>`;

  const res = await parseAndEvaluateAcasNessus({
    nessusXml: sampleNessusXml,
    forceOfflineKev: true,
  });

  assert.equal(res.sourceFormat, "NESSUS_XML");
  assert.equal(res.credentialedScanDiagnostics.totalHosts, 3);
  assert.equal(res.credentialedScanDiagnostics.credentialedHosts, 2);
  assert.equal(res.credentialedScanDiagnostics.uncredentialedHosts, 1);
  assert.deepEqual(res.credentialedScanDiagnostics.failedCredentialHosts, ["app-03.dod.local"]);
  assert.ok(res.credentialedScanDiagnostics.hostIssues[0]!.pluginIds.includes("19506"));
  assert.ok(res.credentialedScanDiagnostics.hostIssues[0]!.pluginIds.includes("21745"));
  assert.ok(res.credentialedScanDiagnostics.hostIssues[0]!.pluginIds.includes("110385"));

  assert.equal(res.summary.deduplicatedActiveFindings, 1);
  const kevFinding = res.findings[0]!;
  assert.equal(kevFinding.assetCount, 2);
  assert.deepEqual(kevFinding.affectedHosts, ["web-01.dod.local", "web-02.dod.local"]);
  assert.equal(kevFinding.isCisaKev, true);
  assert.equal(kevFinding.priority, "P0_KEV_IMMEDIATE");
  assert.equal(kevFinding.slaDays, 15);
  assert.equal(kevFinding.validationStatus, "SCANNER_REPORTED_UNVALIDATED");
  assert.equal(kevFinding.independentExploitValidation, "NOT_VALIDATED_BY_SCANNER");
  assert.equal(kevFinding.remediationVerification, "UNVERIFIED_REQUIRES_CREDENTIALED_RESCAN");
  assert.ok(res.draftPoamItems.length > 0);
  assert.equal(res.ruleResult.ruleId, "DOD-ACAS-001");
  assert.equal(res.ruleResult.verdict, "FAIL");
  assert.equal(res.ruleResult.aiCanIssueAto, false);
});

test("DISA STIG Viewer (.ckl) & SCAP XCCDF: CCI->NIST Rev 5 mapping, CAT I ATO veto & unsubstantiated Not_Applicable flagging", () => {
  const cklXml = `<?xml version="1.0" encoding="UTF-8"?>
<CHECKLIST>
  <STIG_INFO>
    <SI_DATA><SID_NAME>title</SID_NAME><SID_DATA>Red Hat Enterprise Linux 8 STIG</SID_DATA></SI_DATA>
    <SI_DATA><SID_NAME>version</SID_NAME><SID_DATA>V1R13</SID_DATA></SI_DATA>
  </STIG_INFO>
  <VULN>
    <STIG_DATA><VULN_ATTRIBUTE>Vuln_Num</VULN_ATTRIBUTE><ATTRIBUTE_DATA>V-230221</ATTRIBUTE_DATA></STIG_DATA>
    <STIG_DATA><VULN_ATTRIBUTE>Rule_ID</VULN_ATTRIBUTE><ATTRIBUTE_DATA>SV-230221r627750_rule</ATTRIBUTE_DATA></STIG_DATA>
    <STIG_DATA><VULN_ATTRIBUTE>Severity</VULN_ATTRIBUTE><ATTRIBUTE_DATA>high</ATTRIBUTE_DATA></STIG_DATA>
    <STIG_DATA><VULN_ATTRIBUTE>Rule_Title</VULN_ATTRIBUTE><ATTRIBUTE_DATA>RHEL 8 must implement multifactor authentication for privileged accounts.</ATTRIBUTE_DATA></STIG_DATA>
    <STIG_DATA><VULN_ATTRIBUTE>CCI_REF</VULN_ATTRIBUTE><ATTRIBUTE_DATA>CCI-000765</ATTRIBUTE_DATA></STIG_DATA>
    <STIG_DATA><VULN_ATTRIBUTE>CCI_REF</VULN_ATTRIBUTE><ATTRIBUTE_DATA>CCI-000366</ATTRIBUTE_DATA></STIG_DATA>
    <STATUS>Open</STATUS>
    <FINDING_DETAILS>PAM smartcard module disabled</FINDING_DETAILS>
    <COMMENTS></COMMENTS>
  </VULN>
  <VULN>
    <STIG_DATA><VULN_ATTRIBUTE>Vuln_Num</VULN_ATTRIBUTE><ATTRIBUTE_DATA>V-230222</ATTRIBUTE_DATA></STIG_DATA>
    <STIG_DATA><VULN_ATTRIBUTE>Rule_ID</VULN_ATTRIBUTE><ATTRIBUTE_DATA>SV-230222r627750_rule</ATTRIBUTE_DATA></STIG_DATA>
    <STIG_DATA><VULN_ATTRIBUTE>Severity</VULN_ATTRIBUTE><ATTRIBUTE_DATA>medium</ATTRIBUTE_DATA></STIG_DATA>
    <STIG_DATA><VULN_ATTRIBUTE>CCI_REF</VULN_ATTRIBUTE><ATTRIBUTE_DATA>CCI-000015</ATTRIBUTE_DATA></STIG_DATA>
    <STATUS>Not_Applicable</STATUS>
    <FINDING_DETAILS></FINDING_DETAILS>
    <COMMENTS></COMMENTS>
  </VULN>
</CHECKLIST>`;

  const cklRes = parseAndEvaluateStigXccdfOrCkl({ cklXml });
  assert.equal(cklRes.sourceFormat, "CKL");
  assert.equal(cklRes.summary.cat1Open, 1);
  assert.equal(cklRes.summary.atoVetoTriggered, true);
  assert.equal(cklRes.summary.unsubstantiatedNonOpenCount, 1);
  assert.ok(cklRes.summary.impactedNistRev5Controls.includes("IA-2(1)"));
  assert.ok(cklRes.summary.impactedNistRev5Controls.includes("CM-6"));
  assert.equal(cklRes.draftPoamItems.length, 1);
  assert.equal(cklRes.draftPoamItems[0]!.remediationVerified, false);
  assert.equal(cklRes.ruleResult.verdict, "FAIL");

  const xccdfXml = `<?xml version="1.0"?>
<xccdf:Benchmark xmlns:xccdf="http://checklists.nist.gov/xccdf/1.2" id="RHEL8">
  <xccdf:title>RHEL 8 SCAP Profile</xccdf:title>
  <xccdf:Rule id="xccdf_mil.disa.stig_rule_SV-230221" severity="high">
    <xccdf:title>MFA Required</xccdf:title>
    <xccdf:ident system="http://cyber.mil/cci">CCI-000765</xccdf:ident>
  </xccdf:Rule>
  <xccdf:TestResult id="res1">
    <xccdf:rule-result idref="xccdf_mil.disa.stig_rule_SV-230221" severity="high">
      <xccdf:result>pass</xccdf:result>
    </xccdf:rule-result>
  </xccdf:TestResult>
</xccdf:Benchmark>`;

  const xccdfRes = parseAndEvaluateStigXccdfOrCkl({ xccdfXml });
  assert.equal(xccdfRes.sourceFormat, "XCCDF");
  assert.equal(xccdfRes.summary.compliancePercent, 100);
  assert.equal(xccdfRes.summary.unsubstantiatedNonOpenCount, 0);
  assert.equal(xccdfRes.ruleResult.verdict, "PASS");
});

test("DoDI 8531.01 KEV overdue SLA & DoDI 8530.03 CSSP incident escalation rules", () => {
  const vuln = evaluateDodi8531VulnerabilityCompliance({
    cveId: "CVE-2024-3400",
    severityCategory: "CRITICAL",
    isCisaKev: true,
    daysOpen: 22,
    credentialedScanPassed: false,
    remediationRescanVerified: false,
  });
  assert.equal(vuln.ruleId, "DOD-VULN-8531-001");
  assert.equal(vuln.verdict, "FAIL");
  assert.equal(vuln.observedFacts.governingSlaDays, 15);
  assert.equal(vuln.observedFacts.overdueDays, 7);

  const cir = evaluateDodi8530IncidentReporting({
    incidentCategory: "ROOT_COMPROMISE",
    hoursSinceDiscovery: 3,
    csspNotified: false,
    forensicEvidencePreserved: false,
  });
  assert.equal(cir.ruleId, "DOD-CIR-8530-001");
  assert.equal(cir.verdict, "FAIL");
  assert.match(cir.summary, /exceeds 1h benchmark by 2\.0h/i);
});

test("Chat routing separation, Stage 3 anti-fabrication guard & API endpoints", async () => {
  // Positive DoD STIG / CCI / ACAS / DoDI 8531 / 8530 routing
  assert.equal(
    isDodIcQuery("Evaluate ACAS finding CVE-2024-3400 open 22 days under DoDI 8531.01 with plugin 21745 credentialed scan failure"),
    true,
  );
  assert.equal(isDodIcQuery("What NIST SP 800-53 Rev. 5 control does CCI-000765 map to?"), true);
  assert.equal(isDodIcQuery("Under DoDI 8530.03 evaluate a root compromise discovered 3 hours ago without CSSP notification"), true);

  // Critical non-regression: standard FedRAMP High & standalone CVE lookup MUST stay false
  assert.equal(
    isDodIcQuery("Evaluate FedRAMP High AC-2 and IA-2 for a terminated employee account active 38 hours using static SSH keys"),
    false,
  );
  assert.equal(isDodIcQuery("Explain CVE-2024-3400"), false);

  // Stage 3 anti-fabrication blocks premature closure claim
  const vulnRule = evaluateDodi8531VulnerabilityCompliance({
    cveId: "CVE-2024-3400",
    isCisaKev: true,
    daysOpen: 22,
    credentialedScanPassed: true,
    remediationRescanVerified: false,
  });
  const badAudit = verifyDodIcResponse(
    "Check ACAS",
    "This CVE-2024-3400 vulnerability is confirmed remediated and closed based on FAIL override.",
    [vulnRule],
  );
  assert.equal(badAudit.passed, false);
  assert.ok(badAudit.violations.some((v) => v.includes("FABRICATED_REMEDIATION_OR_EXPLOIT_CLAIM")));

  // Full offline neuro-symbolic chat execution resolves CCI + DoDI 8531 + EXPL trace
  const chatOut = await executeDodIcReasoning(
    "Map CCI-000765 to NIST SP 800-53 Rev. 5 and evaluate ACAS CVE-2024-3400 open 22 days under DoDI 8531.01 with plugin 21745 failure.",
    {
      persistTrace: false,
      modelChatFn: async () => ({ error: "offline test" }),
    },
  );
  assert.match(chatOut, /CCI-000765/);
  assert.match(chatOut, /IA-2\(1\)/);
  assert.match(chatOut, /DOD-VULN-8531-001/);
  assert.match(chatOut, /2020-09-15/);
  assert.match(chatOut, /EXPL-[A-Z0-9]+/);

  // REST API dispatcher smoke check
  const cciResp = await handleDodIcV2Request(new Request("http://localhost/api/v2/dod-ic/cci/CCI-000765"));
  assert.equal(cciResp.status, 200);
  const cciJson = (await cciResp.json()) as { found: boolean; cci: { cciId: string; nistRev5Controls: string[] } };
  assert.equal(cciJson.found, true);
  assert.equal(cciJson.cci.cciId, "CCI-000765");
  assert.deepEqual(cciJson.cci.nistRev5Controls, ["IA-2(1)"]);
});
