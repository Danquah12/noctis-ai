/**
 * NOCTIS HEALTH 500 MULTI-SPECIALIST SWARM COUNCIL TESTS
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import {
  SPECIALIST_COUNCIL,
  runSpecialistSwarmDeliberation,
} from "./noctis-specialist-swarm.ts";
import { FLAGSHIP_BENCHMARK_CASES } from "./noctis-health-500-chat.ts";

describe("Noctis Multi-Specialist Agent Swarm Council", () => {
  it("defines the 4 key interprofessional specialists with distinct clinical domains", () => {
    assert.strictEqual(SPECIALIST_COUNCIL.length, 4);
    const roles = SPECIALIST_COUNCIL.map((s) => s.id);
    assert.ok(roles.includes("attending"));
    assert.ok(roles.includes("intensivist"));
    assert.ok(roles.includes("radiologist"));
    assert.ok(roles.includes("pharmacologist"));
  });

  it("runs a unanimous 3-round deliberation on a flagship case", () => {
    const strokeCase = FLAGSHIP_BENCHMARK_CASES.NEUROLOGY;
    const result = runSpecialistSwarmDeliberation(strokeCase);

    assert.strictEqual(result.caseId, strokeCase.caseId);
    assert.strictEqual(result.specialty, "NEUROLOGY");
    assert.strictEqual(result.round1Opinions.length, 4);
    assert.strictEqual(result.round2PeerCritiques.length, 4);
    assert.strictEqual(result.safetyVeto, null);
    assert.strictEqual(result.round3ConsensusPlan.unanimousVote, true);
    assert.strictEqual(result.round3ConsensusPlan.agreementIndexPercent, 100);
    assert.ok(result.consensusDossier.includes("Noctis Health 500 Multi-Specialist Swarm Consensus Dossier"));
    assert.ok(result.consensusDossier.includes("Dr. Aris Thorne"));
    assert.ok(result.consensusDossier.includes("Dr. Elena Rostova"));
  });

  it("trips and remediates a binding Safety Invariant Veto when an unsafe order is proposed", () => {
    const dkaCase = FLAGSHIP_BENCHMARK_CASES.ENDOCRINOLOGY;
    const result = runSpecialistSwarmDeliberation(dkaCase, { injectFlawedOrder: true });

    assert.ok(result.safetyVeto !== null);
    assert.strictEqual(result.safetyVeto.vetoTriggered, true);
    assert.strictEqual(result.safetyVeto.agentId, "pharmacologist");
    assert.ok(result.safetyVeto.title.includes("Binding Safety Invariant Veto"));
    assert.strictEqual(result.round3ConsensusPlan.unanimousVote, false);
    assert.strictEqual(result.round3ConsensusPlan.agreementIndexPercent, 92);
    assert.ok(result.consensusDossier.includes("BINDING SAFETY INVARIANT VETO ISSUED"));
  });
});
