import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scheduleNoctisReadyTasks } from "./noctis-workflow-scheduler.ts";
import { createNoctisWorkflowTask, attachNoctisTaskEvidence, transitionNoctisTask, type NoctisWorkflowTask } from "./noctis-workflow-contract.ts";

const T0 = "2026-11-07T14:00:00Z";
const T1 = "2026-11-07T14:01:00Z";

function task(id: string, overrides: Partial<Parameters<typeof createNoctisWorkflowTask>[0]> = {}): NoctisWorkflowTask {
  const result = createNoctisWorkflowTask({
    taskId: id, engineId: "engine-a", capability: "run", at: T0, ...overrides,
  });
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(result.message);
  return result.value;
}

function ready(value: NoctisWorkflowTask, states: Record<string, "succeeded"> = {}): NoctisWorkflowTask {
  const result = transitionNoctisTask(value, { type: "make_ready", at: T1, dependencyStates: states });
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(result.message);
  return result.value;
}

describe("Noctis deterministic workflow scheduler", () => {
  it("selects ready dependency-free tasks in stable creation order", () => {
    const a = ready(task("a"));
    const b = ready(task("b"));
    const result = scheduleNoctisReadyTasks([b, a], { maxConcurrent: 2 });
    assert.deepEqual(result.dispatchCandidates, ["a", "b"]);
    assert.equal(result.capacity.availableSlots, 2);
  });

  it("never dispatches pending tasks before the state machine marks them ready", () => {
    const pending = task("pending");
    const result = scheduleNoctisReadyTasks([pending], { maxConcurrent: 1 });
    assert.deepEqual(result.dispatchCandidates, []);
    assert.ok(result.deferred.some((item) => item.taskId === "pending" && item.reason === "TASK_NOT_READY"));
  });

  it("waits for dependencies to succeed", () => {
    const upstream = ready(task("upstream"));
    const downstream = task("downstream", { dependsOn: ["upstream"] });
    const result = scheduleNoctisReadyTasks([upstream, downstream], { maxConcurrent: 2 });
    assert.deepEqual(result.dispatchCandidates, ["upstream"]);
    assert.ok(result.deferred.some((item) => item.taskId === "downstream" && item.reason === "DEPENDENCIES_INCOMPLETE"));
  });

  it("defers work whose dependency failed", () => {
    const upstream = { ...task("upstream"), state: "failed" as const };
    const downstream = task("downstream", { dependsOn: ["upstream"] });
    const result = scheduleNoctisReadyTasks([upstream, downstream], { maxConcurrent: 2 });
    assert.ok(result.deferred.some((item) => item.taskId === "downstream" && item.reason === "DEPENDENCY_FAILED"));
  });

  it("does not dispatch evidence-gated tasks without evidence", () => {
    const gated = ready(task("gated", { evidenceRequired: true }));
    const result = scheduleNoctisReadyTasks([gated], { maxConcurrent: 1 });
    assert.deepEqual(result.dispatchCandidates, []);
    assert.ok(result.deferred.some((item) => item.reason === "EVIDENCE_REQUIRED"));
  });

  it("does not dispatch approval-gated tasks without approval", () => {
    const gated = ready(task("gated", { approvalRequired: true }));
    const result = scheduleNoctisReadyTasks([gated], { maxConcurrent: 1 });
    assert.deepEqual(result.approvalCandidates, ["gated"]);
    assert.ok(result.deferred.some((item) => item.reason === "APPROVAL_REQUIRED"));
  });

  it("dispatches approval-gated tasks after an approval reference is attached", () => {
    let gated = ready(task("gated", { approvalRequired: true }));
    const waiting = transitionNoctisTask(gated, { type: "request_approval", at: "2026-11-07T14:02:00Z" });
    assert.equal(waiting.ok, true);
    if (!waiting.ok) return;
    const approved = transitionNoctisTask(waiting.value, { type: "approve", at: "2026-11-07T14:03:00Z", approvalRef: "approval-1" });
    assert.equal(approved.ok, true);
    if (!approved.ok) return;
    gated = approved.value;
    assert.deepEqual(scheduleNoctisReadyTasks([gated], { maxConcurrent: 1 }).dispatchCandidates, ["gated"]);
  });

  it("respects global and per-engine concurrency limits", () => {
    const running = { ...task("running"), state: "running" as const };
    const sameEngine = ready(task("same-engine"));
    const otherEngine = ready(task("other-engine", { engineId: "engine-b" }));
    const result = scheduleNoctisReadyTasks([running, sameEngine, otherEngine], {
      maxConcurrent: 2, maxPerEngine: 1,
    });
    assert.deepEqual(result.dispatchCandidates, ["other-engine"]);
    assert.ok(result.deferred.some((item) => item.taskId === "same-engine" && item.reason === "ENGINE_CAPACITY"));
    assert.equal(result.capacity.currentlyRunning, 1);
  });

  it("respects the maximum dispatch batch size", () => {
    const tasks = [ready(task("a")), ready(task("b")), ready(task("c"))];
    const result = scheduleNoctisReadyTasks(tasks, { maxConcurrent: 5, maxDispatch: 2 });
    assert.equal(result.dispatchCandidates.length, 2);
    assert.ok(result.deferred.some((item) => item.reason === "WORKFLOW_CAPACITY"));
  });

  it("does not mutate the supplied task records", () => {
    const original = ready(task("a"));
    const before = JSON.stringify(original);
    scheduleNoctisReadyTasks([original], { maxConcurrent: 1 });
    assert.equal(JSON.stringify(original), before);
  });

  it("rejects dependency cycles", () => {
    const a = task("a", { dependsOn: ["b"] });
    const b = task("b", { dependsOn: ["a"] });
    assert.throws(() => scheduleNoctisReadyTasks([a, b], { maxConcurrent: 2 }), /cycle/i);
  });

  it("rejects duplicate IDs, unknown dependencies, and invalid limits", () => {
    const a = task("a");
    assert.throws(() => scheduleNoctisReadyTasks([a, a], { maxConcurrent: 1 }));
    assert.throws(() => scheduleNoctisReadyTasks([task("b", { dependsOn: ["missing"] })], { maxConcurrent: 1 }));
    assert.throws(() => scheduleNoctisReadyTasks([a], { maxConcurrent: 0 }));
  });

  it("keeps evidence-attached tasks eligible when dependencies are complete", () => {
    const base = ready(task("a", { evidenceRequired: true }));
    const attached = attachNoctisTaskEvidence(base, ["ev-1"], "2026-11-07T14:02:00Z");
    assert.equal(attached.ok, true);
    if (!attached.ok) return;
    assert.deepEqual(scheduleNoctisReadyTasks([attached.value], { maxConcurrent: 1 }).dispatchCandidates, ["a"]);
  });
});
