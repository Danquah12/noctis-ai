import test from "node:test";
import assert from "node:assert/strict";
import {
  formulateDailyChallengeQuestion,
  runChallengeInChat,
  DAILY_CHALLENGE_CATALOG
} from "./noctis-daily-challenge-engine";

test("NOCTIS-CHALLENGE-ALERT-001: Daily Challenge Engine", async (t) => {
  await t.test("formulates challenge questions across all three suites", () => {
    const q1 = formulateDailyChallengeQuestion(0);
    assert.equal(q1.sourceSuite, "FRONTIER_ENGINEERING");
    assert.ok(q1.question.length > 20);

    const q5 = formulateDailyChallengeQuestion(4);
    assert.equal(q5.sourceSuite, "BENCHMARK_SUITES");
    assert.ok(q5.question.includes("pesticide") || q5.question.includes("burn"));

    const q8 = formulateDailyChallengeQuestion(7);
    assert.equal(q8.sourceSuite, "CONTINUOUS_DAEMON");
    assert.ok(q8.domain.startsWith("CLOUD") || q8.domain.startsWith("ENTERPRISE") || q8.domain.startsWith("DATABASES") || q8.domain.startsWith("DEVOPS"));
  });

  await t.test("executes formulated challenge in Noctis chat engine with invariant verification", async () => {
    // Challenge: Organophosphate cholinergic toxidrome
    const toxChallenge = DAILY_CHALLENGE_CATALOG.find(c => c.id === "CHALLENGE-BENCH-TOX-01")!;
    const result = await runChallengeInChat(toxChallenge);

    assert.equal(result.invariantStatus, "PASS");
    assert.ok(result.fullResponseText.toLowerCase().includes("atropine") || result.fullResponseText.toLowerCase().includes("pralidoxime") || result.fullResponseText.toLowerCase().includes("cholinergic"));
    assert.ok(result.executionDurationMs > 0);
  });

  await t.test("executes SMR prompt excursion challenge in Noctis chat engine", async () => {
    const smrChallenge = DAILY_CHALLENGE_CATALOG.find(c => c.id === "CHALLENGE-FRONTIER-SMR-01")!;
    const result = await runChallengeInChat(smrChallenge);

    assert.equal(result.invariantStatus, "PASS");
    assert.ok(result.fullResponseText.includes("SCRAM") || result.fullResponseText.includes("1.8"));
  });

  await t.test("executes Raft consensus quorum challenge in Noctis chat engine", async () => {
    const raftChallenge = DAILY_CHALLENGE_CATALOG.find(c => c.id === "CHALLENGE-DAEMON-RAFT-01")!;
    const result = await runChallengeInChat(raftChallenge);

    assert.equal(result.invariantStatus, "PASS");
    assert.ok(result.fullResponseText.includes("3") || result.fullResponseText.includes("Quorum") || result.fullResponseText.includes("Raft"));
  });
});
