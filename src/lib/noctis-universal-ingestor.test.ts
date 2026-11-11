import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseSyslogRfc5424,
  ingestUniversalTelemetry,
  getRecentIngestedStream,
  getIngestStatistics,
  resetIngestBufferForTests,
} from "./noctis-universal-ingestor.ts";

test("Syslog RFC 5424 parser extracts structured fields", () => {
  const line = "<134>1 2026-11-10T18:30:00Z firewall.sec.corp PAN-OS 1244 threat - Threat alert on GlobalProtect";
  const parsed = parseSyslogRfc5424(line);
  assert.equal(parsed.facility, 16); // 134 / 8 = 16
  assert.equal(parsed.severity, 6); // 134 % 8 = 6
  assert.equal(parsed.hostname, "firewall.sec.corp");
  assert.equal(parsed.appName, "PAN-OS");
  assert.ok(parsed.message.includes("Threat alert on GlobalProtect"));
});

test("Ingest single enterprise event normalizes into buffer", () => {
  resetIngestBufferForTests();

  const singleEvent = {
    resourceType: "Bundle",
    entry: [{ resource: { resourceType: "Patient", id: "P-4401" } }],
  };

  const res = ingestUniversalTelemetry(singleEvent);
  assert.equal(res.totalEventsAccepted, 1);
  assert.equal(res.events[0].pluginId, "epic_fhir");
  assert.equal(res.events[0].targetSovereignSuite, "noctis-health");
  assert.ok(res.streamDigestSha256.length === 64);

  const stream = getRecentIngestedStream(5);
  assert.equal(stream.length, 1);
  assert.equal(stream[0].pluginId, "epic_fhir");
});

test("Ingest batch array with heterogeneous multi-domain telemetry", () => {
  resetIngestBufferForTests();

  const batch = [
    // Clinical
    { resourceType: "Observation", patientId: "P-900", criticalAlarm: true, value: "SpO2 65% on room air" },
    // Cyber
    { detection_id: "CS-FALCON-001", Severity: "Critical", knownRansomwareCampaignUse: "True" },
    // DevOps
    { repository: "Danquah12/noctis-ai", action: "workflow_run.completed", plan_status: "success" },
    // Financial
    { cik: "0001018724", companyName: "Amazon.com Inc", formType: "10-Q" },
  ];

  const res = ingestUniversalTelemetry(batch);
  assert.equal(res.totalEventsAccepted, 4);
  assert.equal(res.criticalAlertCount, 2); // Clinical SpO2 + Cyber Ransomware

  const stats = getIngestStatistics();
  assert.equal(stats.totalIngestedCount, 4);
  assert.equal(stats.criticalAlertsTotal, 2);
  assert.ok(stats.pillarBreakdown.Safety >= 2);
  assert.ok(stats.suiteBreakdown["noctis-health"] >= 1);
  assert.ok(stats.suiteBreakdown["noctis-cyber"] >= 1);
});

test("Ingest raw syslog string text streams", () => {
  resetIngestBufferForTests();

  const rawSyslog = [
    "<134>1 2026-11-10T18:30:00Z fw01.datacenter PAN-OS 901 threat - Lateral movement SMB connection blocked",
    "<131>1 2026-11-10T18:31:00Z app02.datacenter NodeJs 414 error - Out of memory heap allocation failed",
  ].join("\n");

  const res = ingestUniversalTelemetry(rawSyslog);
  assert.equal(res.totalEventsAccepted, 2);
  assert.equal(res.events.length, 2);

  const stream = getRecentIngestedStream(10);
  assert.equal(stream.length, 2);
});

test("Buffer maintains sequential order and enforces capacity ceiling", () => {
  resetIngestBufferForTests();

  // Ingest 250 items (exceeding 200 capacity)
  const items = Array.from({ length: 250 }, (_, i) => ({
    event: `Telemetry item #${i}`,
    index: "syslog-feed",
    sourcetype: "custom-metric",
  }));

  const res = ingestUniversalTelemetry(items);
  assert.equal(res.totalEventsAccepted, 250);

  const stream = getRecentIngestedStream(250);
  assert.equal(stream.length, 200); // Capped at MAX_RING_BUFFER_CAPACITY (200)

  const stats = getIngestStatistics();
  assert.equal(stats.totalIngestedCount, 250);
});
