import test from "node:test";
import assert from "node:assert/strict";
import {
  initializeBrashResuscitationSim,
  advanceResuscitationTurn,
} from "./noctis-code-blue-sim.ts";

test("Noctis Code Blue Simulation: Baseline Initialization", () => {
  const sim = initializeBrashResuscitationSim();
  assert.equal(sim.currentPhase, "INITIAL_PRESENTATION");
  assert.equal(sim.vitals.hr, 29);
  assert.equal(sim.vitals.sbp, 68);
  assert.equal(sim.vitals.dbp, 38);
  assert.equal(sim.vitals.map, 48);
  assert.equal(sim.vitals.potassium, 7.3);
  assert.equal(sim.vitals.qrsDurationMs, 154);
  assert.equal(sim.isPatientAlive, true);
  assert.equal(sim.isStabilized, false);
});

test("Noctis Code Blue Simulation: Dangerous Fluid Overload Veto", () => {
  const sim = initializeBrashResuscitationSim();
  const res = advanceResuscitationTurn(sim, "Administer 30 mL/kg normal saline rapid bolus (2000 mL)");

  assert.equal(res.vetoIssued, true);
  assert.match(res.aiDirective, /LETHAL VETO/i);
  assert.match(res.aiDirective, /30 mL\/kg strictly contraindicated in EF 30%/i);
  assert.ok(sim.safetyVetoesTriggered.includes("VAL-RESUS-FLUID-OVERLOAD-VETO"));
});

test("Noctis Code Blue Simulation: Atropine Monotherapy Futility Warning", () => {
  const sim = initializeBrashResuscitationSim();
  const res = advanceResuscitationTurn(sim, "Give Atropine 1 mg IV push for bradycardia");

  assert.equal(res.vetoIssued, true);
  assert.match(res.aiDirective, /ineffective for infranodal junctional bradycardia/i);
  assert.ok(sim.safetyVetoesTriggered.includes("WARN-ATROPINE-FUTILITY"));
  assert.equal(sim.vitals.hr, 29); // Heart rate unchanged
});

test("Noctis Code Blue Simulation: Complete Resuscitation Triad to Stabilization", () => {
  const sim = initializeBrashResuscitationSim();

  // Step 1: IV Calcium for membrane stabilization
  const turn1 = advanceResuscitationTurn(sim, "Administer Calcium Gluconate 10% 20 mL IV over 3 minutes");
  assert.equal(turn1.vetoIssued, false);
  assert.equal(sim.currentPhase, "PHASE_1_MEMBRANE_STABILIZATION");
  assert.equal(sim.vitals.qrsDurationMs, 118); // QRS narrowed
  assert.match(turn1.aiDirective, /Myocardial resting potential stabilized/i);

  // Step 2: Regular Insulin + D50W for potassium shifting
  const turn2 = advanceResuscitationTurn(sim, "Give Regular Insulin 10 units IV with D50W 50 mL");
  assert.equal(turn2.vetoIssued, false);
  assert.equal(sim.currentPhase, "PHASE_2_POTASSIUM_SHIFT");
  assert.equal(sim.vitals.potassium, 6.4); // Potassium shifted into cells

  // Step 3: Norepinephrine infusion for vasoplegic cardiogenic shock
  const turn3 = advanceResuscitationTurn(sim, "Start Norepinephrine infusion at 5 mcg/min and titrate to MAP >= 65");
  assert.equal(turn3.vetoIssued, false);
  assert.equal(sim.vitals.map, 68); // Perfusion pressure restored!
  assert.equal(sim.vitals.sbp, 92);

  // Step 4: Digoxin immune Fab (DigiFab) for digitalis intoxication
  const turn4 = advanceResuscitationTurn(sim, "Administer empiric DigiFab 10 vials IV over 30 minutes");
  assert.equal(turn4.vetoIssued, false);
  assert.equal(sim.vitals.hr, 64); // Sinus rhythm restored!
  assert.match(sim.vitals.rhythm, /Normal sinus rhythm/i);

  // Step 5: Emergent Hemodialysis for definitive potassium elimination
  const turn5 = advanceResuscitationTurn(sim, "Initiate emergent CRRT with Nephrology for definitive potassium removal");
  assert.equal(turn5.vetoIssued, false);
  assert.equal(sim.currentPhase, "RESUSCITATED_STABILIZED");
  assert.equal(sim.isStabilized, true);
  assert.equal(sim.vitals.potassium, 4.8);
  assert.equal(sim.score, 100);

  // Verify full audit log
  assert.equal(sim.auditHistory.length, 5);
  assert.equal(sim.completedInterventions.length, 5);
});
