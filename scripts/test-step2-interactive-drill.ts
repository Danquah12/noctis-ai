import {
  initializeBrashResuscitationSim,
  advanceResuscitationTurn,
} from "../src/lib/noctis-code-blue-sim.ts";

console.log("============================================================================");
console.log("STEP 2: LIVE INTERACTIVE BEDSIDE CODE BLUE RESUSCITATION DRILL");
console.log("Patient: 78yo Male with EF 30%, CKD 4, BRASH Syndrome, K+ 7.3, Digoxin 3.6");
console.log("============================================================================\n");

const sim = initializeBrashResuscitationSim();
console.log(`[T=00:00] INITIAL PRESENTATION IN RESUSCITATION BAY:`);
console.log(`  Vitals: BP ${sim.vitals.sbp}/${sim.vitals.dbp} mmHg (MAP ${sim.vitals.map} mmHg), HR ${sim.vitals.hr} bpm, RR ${sim.vitals.rr}/min, SpO2 ${sim.vitals.spo2}%, Temp ${sim.vitals.tempC}°C`);
console.log(`  Labs:   Potassium ${sim.vitals.potassium} mmol/L, Lactate ${sim.vitals.lactate} mmol/L, QRS Duration ${sim.vitals.qrsDurationMs} ms`);
console.log(`  ECG:    ${sim.vitals.rhythm}\n`);

const orders = [
  "Administer 30 mL/kg normal saline rapid bolus (2000 mL) to bring up the blood pressure",
  "Give Atropine 1 mg IV push for profound bradycardia",
  "Administer Calcium Gluconate 10% 20 mL IV over 5 minutes under continuous telemetry",
  "Give Regular Insulin 10 units IV with D50W 50 mL and start nebulized Albuterol",
  "Start Norepinephrine infusion at 8 mcg/min and titrate to maintain MAP >= 65 mmHg",
  "Administer empiric DigiFab 10 vials IV over 30 minutes",
  "Page Nephrology for emergent bedside CRRT to definitively clear potassium",
];

for (let i = 0; i < orders.length; i++) {
  const order = orders[i];
  console.log(`----------------------------------------------------------------------------`);
  console.log(`[TURN ${i + 1}] CLINICIAN ORDER: "${order}"`);
  const result = advanceResuscitationTurn(sim, order);

  if (result.vetoIssued) {
    console.log(`  🚨 NOCTIS SAFETY VETO: ${result.aiDirective}`);
    console.log(`  Physiological Effect:  ${sim.auditHistory[sim.auditHistory.length - 1].physiologicalResponse}`);
  } else {
    console.log(`  ✅ NOCTIS DIRECTIVE:   ${result.aiDirective}`);
    console.log(`  Physiological Shift:   ${sim.auditHistory[sim.auditHistory.length - 1].physiologicalResponse}`);
    console.log(`  Updated Vitals:        BP ${sim.vitals.sbp}/${sim.vitals.dbp} mmHg (MAP ${sim.vitals.map} mmHg), HR ${sim.vitals.hr} bpm, K+ ${sim.vitals.potassium} mmol/L, QRS ${sim.vitals.qrsDurationMs} ms`);
    console.log(`  Rhythm Status:         ${sim.vitals.rhythm}`);
  }
  console.log(`  Resuscitation Score:   ${sim.score} / 100 | Phase: ${sim.currentPhase}`);
}

console.log("\n============================================================================");
console.log(`DRILL COMPLETED: Patient Status: ${sim.isStabilized ? "STABILIZED & RESUSCITATED" : "CRITICAL"}`);
console.log(`Total Interventions Completed: ${sim.completedInterventions.length}`);
console.log(`Lethal Safety Vetoes Enforced: ${sim.safetyVetoesTriggered.join(", ")}`);
console.log(`Final Resuscitation Mastery Score: ${sim.score} / 100`);
console.log("============================================================================");
