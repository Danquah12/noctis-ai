import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  attachNoctisTaskEvidence,
  createNoctisWorkflowTask,
  deriveNoctisWorkflowState,
  transitionNoctisTask,
  type NoctisWorkflowTask,
} from "./noctis-workflow-contract.ts";

const T0 = "2026-11-07T12:00:00Z";
const T1 = "2026-11-07T12:01:00Z";
const T2 = "2026-11-07T12:02:00Z";
const T3 = "2026-11-07T12:03:00Z";

function makeTask(overrides: Partial<Parameters<typeof createNoctisWorkflowTask>[0]> = {}): NoctisWorkflowTask {
  const result = createNoctisWorkflowTask({
    taskId: "task-a", engineId: "noctis.cyber.sast", capability: "cyber.sast.analyze", at: T0,
    ...overrides,
  });
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("Unexpected task contract failure.");
  return result.value;
}

function apply(task: NoctisWorkflowTask, event: Parameters<typeof transitionNoctisTask>[1]): NoctisWorkflowTask {
  const result = transitionNoctisTask(task, event);
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("Unexpected task contract failure.");
  return result.value;
}

describe("Noctis workflow task contract", () => {
  it("creates a deterministic pending task with defaults", () => {
    const task = makeTask();
    assert.equal(task.state, "pending");
    assert.equal(task.maxAttempts, 1);
    assert.deepEqual(task.attempts, []);
    assert.equal(task.createdAt, T0);
  });

  it("rejects missing identifiers and malformed timestamps", () => {
    assert.equal(createNoctisWorkflowTask({ taskId: "", engineId: "e", capability: "c", at: T0 }).ok, false);
    assert.equal(createNoctisWorkflowTask({ taskId: "t", engineId: "e", capability: "c", at: "yesterday" }).ok, false);
  });

  it("rejects self-dependencies, empty dependencies and duplicate dependency collapse", () => {
    assert.equal(createNoctisWorkflowTask({ taskId: "t", engineId: "e", capability: "c", dependsOn: ["t"], at: T0 }).ok, false);
    assert.equal(createNoctisWorkflowTask({ taskId: "t", engineId: "e", capability: "c", dependsOn: [" "], at: T0 }).ok, false);
    const task = makeTask({ dependsOn: ["upstream", "upstream"] });
    assert.deepEqual(task.dependsOn, ["upstream"]);
  });

  it("bounds retry configuration to one through five attempts", () => {
    assert.equal(makeTask({ maxAttempts: 5 }).maxAttempts, 5);
    assert.equal(createNoctisWorkflowTask({ taskId: "t", engineId: "e", capability: "c", maxAttempts: 6, at: T0 }).ok, false);
  });

  it("does not make a task ready before every dependency succeeds", () => {
    const result = transitionNoctisTask(makeTask({ dependsOn: ["upstream"] }), {
      type: "make_ready", at: T1, dependencyStates: { upstream: "running" },
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "DEPENDENCIES_INCOMPLETE");
  });

  it("allows readiness once all dependencies succeeded", () => {
    const task = apply(makeTask({ dependsOn: ["upstream"] }), {
      type: "make_ready", at: T1, dependencyStates: { upstream: "succeeded" },
    });
    assert.equal(task.state, "ready");
  });

  it("requires evidence before starting evidence-gated tasks", () => {
    const ready = apply(makeTask({ evidenceRequired: true }), {
      type: "make_ready", at: T1, dependencyStates: {},
    });
    const result = transitionNoctisTask(ready, { type: "start", at: T2 });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "EVIDENCE_REQUIRED");
  });

  it("requires approval workflow before starting approval-gated tasks", () => {
    const ready = apply(makeTask({ approvalRequired: true }), {
      type: "make_ready", at: T1, dependencyStates: {},
    });
    const waiting = apply(ready, { type: "request_approval", at: T2 });
    const approved = apply(waiting, { type: "approve", at: T3, approvalRef: "approval-123" });
    assert.equal(approved.state, "ready");
    assert.equal(approved.approvalRef, "approval-123");
    const started = apply(approved, { type: "start", at: "2026-11-07T12:04:00Z" });
    assert.equal(started.state, "running");
  });

  it("records immutable attempt history and successful completion", () => {
    const ready = apply(makeTask(), { type: "make_ready", at: T1, dependencyStates: {} });
    const running = apply(ready, { type: "start", at: T2 });
    const succeeded = apply(running, { type: "succeed", at: T3 });
    assert.equal(succeeded.state, "succeeded");
    assert.equal(succeeded.attempts[0].outcome, "succeeded");
    assert.equal(ready.attempts.length, 0);
  });

  it("supports bounded retry after a recorded failure", () => {
    const ready = apply(makeTask({ maxAttempts: 2 }), { type: "make_ready", at: T1, dependencyStates: {} });
    const running = apply(ready, { type: "start", at: T2 });
    const failed = apply(running, { type: "fail", at: T3, code: "TIMEOUT", reason: "Adapter timed out." });
    const retry = apply(failed, { type: "retry", at: "2026-11-07T12:04:00Z", dependencyStates: {} });
    assert.equal(retry.state, "ready");
    const secondRun = apply(retry, { type: "start", at: "2026-11-07T12:05:00Z" });
    assert.equal(secondRun.attempts.length, 2);
    const secondFailure = apply(secondRun, { type: "fail", at: "2026-11-07T12:06:00Z", code: "FAILED", reason: "Still unavailable." });
    const exhausted = transitionNoctisTask(secondFailure, {
      type: "retry", at: "2026-11-07T12:07:00Z", dependencyStates: {},
    });
    assert.equal(exhausted.ok, false);
    if (!exhausted.ok) assert.equal(exhausted.code, "RETRY_LIMIT_REACHED");
  });

  it("rejects illegal transitions and terminal-state mutation", () => {
    const pending = makeTask();
    assert.equal(transitionNoctisTask(pending, { type: "succeed", at: T1 }).ok, false);
    const ready = apply(pending, { type: "make_ready", at: T1, dependencyStates: {} });
    const running = apply(ready, { type: "start", at: T2 });
    const done = apply(running, { type: "succeed", at: T3 });
    const afterTerminal = transitionNoctisTask(done, { type: "cancel", at: "2026-11-07T12:04:00Z" });
    assert.equal(afterTerminal.ok, false);
  });

  it("rejects stale timestamps and requires a reason to block", () => {
    const ready = apply(makeTask(), { type: "make_ready", at: T1, dependencyStates: {} });
    assert.equal(transitionNoctisTask(ready, { type: "start", at: T0 }).ok, false);
    assert.equal(transitionNoctisTask(ready, { type: "block", at: T2, reason: " " }).ok, false);
  });

  it("attaches deduplicated evidence only before execution", () => {
    const ready = apply(makeTask({ evidenceRequired: true }), { type: "make_ready", at: T1, dependencyStates: {} });
    const attached = attachNoctisTaskEvidence(ready, ["evidence-1", "evidence-1"], T2);
    assert.equal(attached.ok, true);
    if (attached.ok) assert.deepEqual(attached.value.evidenceRefs, ["evidence-1"]);
    const running = apply(attached.ok ? attached.value : ready, { type: "start", at: T3 });
    assert.equal(attachNoctisTaskEvidence(running, ["evidence-2"], "2026-11-07T12:04:00Z").ok, false);
  });

  it("derives aggregate workflow states deterministically", () => {
    assert.equal(deriveNoctisWorkflowState([]), "planned");
    assert.equal(deriveNoctisWorkflowState(["ready", "pending"]), "ready");
    assert.equal(deriveNoctisWorkflowState(["running", "ready"]), "running");
    assert.equal(deriveNoctisWorkflowState(["waiting_approval", "ready"]), "waiting_approval");
    assert.equal(deriveNoctisWorkflowState(["succeeded", "skipped"]), "succeeded");
    assert.equal(deriveNoctisWorkflowState(["failed"]), "failed");
    assert.equal(deriveNoctisWorkflowState(["cancelled"]), "cancelled");
    assert.equal(deriveNoctisWorkflowState(["blocked", "pending"]), "blocked");
  });
});
