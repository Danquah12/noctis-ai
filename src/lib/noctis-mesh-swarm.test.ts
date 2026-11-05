import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { executeMeshSwarm } from "./noctis-mesh-swarm.ts";

describe("NOCTIS MESH SWARM — MULTI-AGENT CONSENSUS COUNCIL", () => {
  test("Achieves unanimous consensus on fully mitigated, structured code", () => {
    const code = `
      // Mission Critical Fuel Dispatcher
      await redis.set(lockKey, token, 'PX', 5000, 'NX');
      // Paired Rollback Available
    `;
    const round = executeMeshSwarm(code, "Emergency Fuel Dispatch");

    assert.equal(round.votes.length, 4);
    assert.equal(round.consensusStatus, "UNANIMOUS_CONSENSUS");
    assert.equal(round.consensusScore, 100);
    assert.match(round.consensusSeal, /^SIG_SWARM_CONSENSUS_/);
    assert.equal(round.votes[0].role, "ARCHITECT");
    assert.equal(round.votes[1].role, "ADVERSARY");
    assert.equal(round.votes[2].role, "AUDITOR");
    assert.equal(round.votes[3].role, "RECONCILER");
  });

  test("Applies compensatory mitigations and reaches supermajority on vulnerable input", () => {
    const rawInput = "function naiveHandler(data) { eval(data); }";
    const round = executeMeshSwarm(rawInput, "Untrusted Script Audit");

    assert.ok(round.mitigationsApplied.length > 0);
    assert.match(round.reconciledVerdict, /CONDITIONALLY APPROVED|REJECTED/);
  });
});
