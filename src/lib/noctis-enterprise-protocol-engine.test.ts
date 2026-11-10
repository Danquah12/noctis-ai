import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ENTERPRISE_PROTOCOL_REGISTRY,
  detectEnterpriseProtocol,
  parseEnterprisePayload,
  getEnterpriseProtocolsList,
} from "./noctis-enterprise-protocol-engine.ts";

test("Enterprise Protocol Registry covers all 5 core categories", () => {
  const list = getEnterpriseProtocolsList();
  assert.ok(list.length >= 15);

  const categories = new Set(list.map((p) => p.category));
  assert.ok(categories.has("Healthcare & Clinical"));
  assert.ok(categories.has("Cybersecurity & SIEM"));
  assert.ok(categories.has("DevOps & Cloud"));
  assert.ok(categories.has("Fintech & Regulatory"));
  assert.ok(categories.has("Creative & Workplace"));

  for (const item of list) {
    assert.ok(item.pluginId);
    assert.ok(item.name);
    assert.ok(item.defaultProtocol);
    assert.ok(item.targetSovereignSuite);
    assert.ok(item.sqdecPillar);
  }
});

test("Automatic protocol detection identifies Epic FHIR Bundle", () => {
  const fhirPayload = {
    resourceType: "Bundle",
    entry: [
      { resource: { resourceType: "Patient", id: "P-9841" } },
      { resource: { resourceType: "Observation", code: "883-9", valueQuantity: { value: 7.2 } } },
    ],
  };
  const detected = detectEnterpriseProtocol(fhirPayload);
  assert.ok(detected);
  assert.equal(detected?.pluginId, "epic_fhir");
  assert.equal(detected?.targetSovereignSuite, "noctis-health");
  assert.equal(detected?.sqdecPillar, "Safety");
});

test("Automatic protocol detection identifies CrowdStrike Falcon alert", () => {
  const csPayload = {
    detection_id: "ldt:abc1234567:998877",
    behaviors: [{ tactic: "TA0008 Lateral Movement", technique: "T1021 Remote Services" }],
    device: { hostname: "CORP-DC-01" },
  };
  const detected = detectEnterpriseProtocol(csPayload);
  assert.ok(detected);
  assert.equal(detected?.pluginId, "crowdstrike_falcon");
  assert.equal(detected?.targetSovereignSuite, "noctis-cyber");
  assert.equal(detected?.sqdecPillar, "Safety");
});

test("Automatic protocol detection identifies CISA KEV Radar", () => {
  const kevPayload = {
    cveID: "CVE-2024-3400",
    vendorProject: "Palo Alto Networks",
    vulnerabilityName: "PAN-OS Command Injection",
    knownRansomwareCampaignUse: "Known",
  };
  const detected = detectEnterpriseProtocol(kevPayload);
  assert.ok(detected);
  assert.equal(detected?.pluginId, "cisa_kev_radar");
  assert.equal(detected?.targetSovereignSuite, "noctis-cyber");
});

test("Clinical panic values trigger CRITICAL severity and CDSTRIAGE directive", () => {
  const criticalEhr = {
    resourceType: "Observation",
    patientId: "PATIENT-CARDIAC-ICU",
    criticalAlarm: true,
    value: "Severe hypotension with MAP < 55 mmHg and PEA arrest",
  };
  const event = parseEnterprisePayload("epic_fhir", criticalEhr);
  assert.equal(event.severity, "CRITICAL");
  assert.equal(event.sqdecPillar, "Safety");
  assert.equal(event.targetSovereignSuite, "noctis-health");
  assert.ok(event.actionDirective.includes("CDSTRIAGE"));
  assert.ok(event.auditSha256.length === 64);
});

test("Cyber ransomware alert triggers CRITICAL severity and SHIELD Circuit Breaker", () => {
  const ransomwarePayload = {
    detection_id: "FALCON-RANSOM-091",
    knownRansomwareCampaignUse: "Active",
    tactic: "TA0040 Impact",
    Severity: "Critical",
  };
  const event = parseEnterprisePayload("crowdstrike_falcon", ransomwarePayload);
  assert.equal(event.severity, "CRITICAL");
  assert.equal(event.sqdecPillar, "Safety");
  assert.equal(event.targetSovereignSuite, "noctis-cyber");
  assert.ok(event.actionDirective.includes("SHIELD Circuit Breaker"));
  assert.ok(event.auditSha256.length === 64);
});

test("SEC EDGAR disclosure parsing normalizes financial risk", () => {
  const secPayload = {
    cik: "0001018724",
    companyName: "Major Healthcare Holding Corp",
    formType: "10-K",
    filingDate: "2026-11-01",
  };
  const event = parseEnterprisePayload("sec_edgar", secPayload);
  assert.equal(event.targetSovereignSuite, "noctis-finance");
  assert.equal(event.sqdecPillar, "Control");
  assert.ok(event.summary.includes("Major Healthcare Holding Corp"));
});
