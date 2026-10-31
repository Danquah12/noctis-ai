import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  PREDEFINED_REMEDIATION_PLAYBOOKS,
  dispatchAutoRemediation,
  formatRemediationMarkdown,
  handleNaturalRemediationQuery,
} from "./noctis-auto-remediation.ts";

describe("Noctis Pre-Signed Auto-Remediation & Rollback Dispatcher (NOCTIS-REMED-001)", () => {
  test("provides complete canonical remediation playbooks with paired forward and rollback scripts", () => {
    const playbooks = Object.values(PREDEFINED_REMEDIATION_PLAYBOOKS);
    assert.equal(playbooks.length >= 3, true);

    for (const p of playbooks) {
      assert.equal(typeof p.id, "string");
      assert.equal(typeof p.name, "string");
      assert.equal(p.forwardScript.length > 50, true);
      assert.equal(p.rollbackScript.length > 50, true);
      assert.equal(p.preFlightChecks.length >= 2, true);
      assert.equal(p.safetyGuards.length >= 2, true);
    }
  });

  test("evaluates dry-run pre-flight check and generates valid SHA-256 digests", () => {
    const res = dispatchAutoRemediation("remed-ad-kerberos", { dryRun: true });

    assert.equal(res.dryRun, true);
    assert.equal(res.status, "DRY_RUN_PASSED");
    assert.equal(res.preFlightPassed, true);
    assert.equal(res.forwardScriptHash.length, 64);
    assert.equal(res.rollbackScriptHash.length, 64);
    assert.equal(res.cryptographicSeal.length, 64);
    assert.equal(/^[a-f0-9]{64}$/.test(res.cryptographicSeal), true);
  });

  test("dispatches live remediation with DISPATCHED status and SLA metrics", () => {
    const res = dispatchAutoRemediation("remed-k8s-pod-quarantine", { dryRun: false });

    assert.equal(res.dryRun, false);
    assert.equal(res.status, "DISPATCHED");
    assert.equal(res.executionMetrics.reversible, true);
    assert.equal(res.executionMetrics.estimatedExecutionMs > 0, true);
  });

  test("formats audited Markdown dossier with forward script, rollback script, and seal", () => {
    const res = dispatchAutoRemediation("remed-cloud-iam-revocation", { dryRun: true });
    const md = formatRemediationMarkdown(res);

    assert.equal(md.includes("# Noctis Pre-Signed Auto-Remediation & Rollback Dispatcher"), true);
    assert.equal(md.includes("Mandatory Pre-Flight Environment Verification"), true);
    assert.equal(md.includes("Forward Remediation Script"), true);
    assert.equal(md.includes("Paired 1-Click Rollback / Undo Script"), true);
    assert.equal(md.includes(res.forwardScriptHash), true);
    assert.equal(md.includes(res.rollbackScriptHash), true);
    assert.equal(md.includes(res.cryptographicSeal), true);
  });

  test("handles natural language queries routing to target incident playbooks", () => {
    const k8sQuery = "Generate pre-signed auto-remediation and rollback script for Kubernetes ingress pod escape";
    const resK8s = handleNaturalRemediationQuery(k8sQuery);
    assert.notEqual(resK8s, null);
    assert.equal(resK8s?.includes("Kubernetes Exploit Ingress Pod Eviction"), true);

    const iamQuery = "Dispatch auto-remediation dry-run for compromised AWS cloud IAM access keys";
    const resIam = handleNaturalRemediationQuery(iamQuery);
    assert.notEqual(resIam, null);
    assert.equal(resIam?.includes("Cloud IAM Compromised Key Revocation"), true);

    // Negative case
    const unrelated = "Tell me a joke about robots";
    assert.equal(handleNaturalRemediationQuery(unrelated), null);
  });
});
