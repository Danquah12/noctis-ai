// ============================================================================
// NOCTIS TASK 3 UNIT TEST: ACLS & RESUSCITATION PROTOCOL COACH
// Standards: AHA / ILCOR 2025-2026 ACLS Guidelines, ACS ATLS 10th Edition
// ============================================================================

import test, { describe } from "node:test";
import assert from "node:assert/strict";

import {
  initializeAclsSession,
  processAclsRhythmCheck,
  HS_AND_TS_LIST,
} from "./noctis-resuscitation-coach.ts";

describe("TASK 3: NOCTIS HANDS-FREE ACLS RESUSCITATION COACH SUITE", () => {
  test("Task 3.1: manages shockable VF arrest with biphasic defibrillation and drug timing", () => {
    let state = initializeAclsSession("PT-CODE-101");
    assert.equal(state.currentCycle, 1);
    assert.equal(state.totalShocksDelivered, 0);

    // Cycle 1: 1st shock delivered
    state = processAclsRhythmCheck(state, "VF_PULSELESS_VT", 16);
    assert.equal(state.totalShocksDelivered, 1);
    assert.equal(state.totalEpiDoses, 0, "No epi on 1st shock per AHA algorithm");
    assert.ok(state.criticalAlertCue.includes("200 Joules"));

    // Cycle 2: 2nd shock delivered, Epinephrine administered
    state = processAclsRhythmCheck(state, "VF_PULSELESS_VT", 18);
    assert.equal(state.totalShocksDelivered, 2);
    assert.equal(state.totalEpiDoses, 1, "Epinephrine 1mg due after 2nd shock");
    assert.ok(state.criticalAlertCue.includes("Epinephrine 1 mg"));

    // Cycle 3: 3rd shock delivered, Amiodarone 300mg administered
    state = processAclsRhythmCheck(state, "VF_PULSELESS_VT", 19);
    assert.equal(state.totalShocksDelivered, 3);
    assert.equal(state.totalAmiodaroneMg, 300, "Amiodarone 300mg due after 3rd shock");
    assert.ok(state.criticalAlertCue.includes("Amiodarone 300 mg"));
  });

  test("Task 3.2: detects abrupt EtCO2 rise >= 40 mmHg and announces immediate ROSC", () => {
    let state = initializeAclsSession("PT-CODE-102");
    state = processAclsRhythmCheck(state, "VF_PULSELESS_VT", 15);
    assert.equal(state.roscAchieved, false);

    // ROSC trigger: EtCO2 jumps to 44 mmHg
    state = processAclsRhythmCheck(state, "ROSC_ORGANIZED", 44);
    assert.equal(state.roscAchieved, true);
    assert.equal(state.activeRhythm, "ROSC_ORGANIZED");
    assert.ok(state.criticalAlertCue.includes("ROSC CONFIRMED"));
    assert.ok(state.criticalAlertCue.includes("44 mmHg"));
  });

  test("Task 3.3: verifies all 10 reversible H's and T's are registered in checklist", () => {
    const state = initializeAclsSession("PT-CODE-103");
    assert.equal(Object.keys(state.reversibleCausesChecked).length, 10);
    assert.ok(state.reversibleCausesChecked["TENSION_PNEUMOTHORAX"] !== undefined);
    assert.ok(state.reversibleCausesChecked["HYPO_HYPERKALEMIA"] !== undefined);
    assert.ok(state.reversibleCausesChecked["THROMBOSIS_PE"] !== undefined);
  });
});
