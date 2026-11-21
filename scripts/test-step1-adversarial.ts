import { arbitrateClinicalConsensus } from "../src/lib/noctis-clinical-consensus.ts";
import { buildClinicalScratchpad } from "../src/lib/noctis-clinical-scratchpad.ts";

const prompt = `A 67-year-old female with CKD stage 3b (baseline creatinine 1.8 mg/dL), heart failure with reduced ejection fraction (EF 35%), and type 2 diabetes mellitus presents with acute confusion, severe vomiting, and rigors.

Current medications:
- Lisinopril 20 mg daily
- Spironolactone 25 mg daily
- Dapagliflozin 10 mg daily
- Metformin 850 mg twice daily
- Trimethoprim-sulfamethoxazole 160/800 mg twice daily (started 2 days ago for UTI)

Emergency Department Findings:
Blood pressure: 74/42 mmHg
Heart rate: 38 bpm
Respiratory rate: 30/min
Temperature: 39.2°C
Oxygen saturation: 90% on room air
Potassium: 6.9 mmol/L
Sodium: 131 mmol/L
Creatinine: 3.9 mg/dL
Bicarbonate: 10 mmol/L
Arterial pH: 7.15
PaCO2: 24 mmHg
Lactate: 5.4 mmol/L
Blood glucose: 138 mg/dL
Urine output: 40 mL over 6 hours
ECG: Sinus bradycardia with first-degree AV block, PR 240 ms, QRS 128 ms, peaked T waves in V2-V5.

Perform an immediate clinical safety audit. Calculate MAP, creatinine fold ratio, KDIGO AKI stage, Anion Gap, and Winter's formula expected PaCO2. Evaluate euglycemic DKA, BRASH syndrome, and metformin-associated lactic acidosis risk.`;

const scratchpad = buildClinicalScratchpad(prompt);
console.log("=== STEP 1: SCRATCHPAD AUDIT ===");
console.log("MAP:", scratchpad.derivedCalculations.meanArterialPressureMmHg, "mmHg");
console.log("Creatinine Absolute Rise: +", scratchpad.derivedCalculations.kdigoAki.crAbsoluteRiseMgDl, "mg/dL");
console.log("Creatinine Fold Ratio:", scratchpad.derivedCalculations.kdigoAki.crFoldRatio, "x");
console.log("KDIGO AKI Stage:", scratchpad.derivedCalculations.kdigoAki.establishedStage, `(${scratchpad.derivedCalculations.kdigoAki.stageRationale})`);
console.log("Chloride Missing Sentinel:", scratchpad.sentinels.isChlorideMissing);
console.log("Anion Gap Computable:", scratchpad.derivedCalculations.anionGap.isComputable);
console.log("Anion Gap Refusal Reason:", scratchpad.derivedCalculations.anionGap.refusalReason);
console.log("Winter's Formula Expected PaCO2:", `${scratchpad.derivedCalculations.wintersFormula.expectedPaco2RangeLowMmHg}–${scratchpad.derivedCalculations.wintersFormula.expectedPaco2RangeHighMmHg} mmHg (Midpoint: ${scratchpad.derivedCalculations.wintersFormula.expectedPaco2MidpointMmHg})`);
console.log("Winter's Formula Measured PaCO2:", scratchpad.derivedCalculations.wintersFormula.measuredPaco2MmHg, "mmHg");
console.log("Winter's Interpretation:", scratchpad.derivedCalculations.wintersFormula.calibratedClinicalInterpretation);
console.log("Weight Missing Sentinel:", scratchpad.sentinels.isWeightMissing);
console.log("Fluid Safety Approach:", scratchpad.derivedCalculations.fluidSafety.recommendedResuscitationApproach);

const consensus = arbitrateClinicalConsensus(prompt);
console.log("\n=== STEP 1: TRI-SPECIALIST CONSENSUS ARBITRATION ===");
console.log("Consensus Tier:", consensus.consensusTriageTier);
console.log("Specialist Opinions Count:", consensus.triSpecialistOpinions.length);
consensus.triSpecialistOpinions.forEach((op) => {
  console.log(`\nSpecialist: ${op.agentName} (${op.specialtyDomain})`);
  console.log(`Primary Priority: ${op.primaryPriority}`);
  console.log("Key Directives:");
  op.keyDirectives.forEach((d) => console.log("  -", d));
  console.log("Contraindicated Actions:");
  op.contraindicatedActions.forEach((c) => console.log("  [X]", c));
});
console.log("\nUnified Consensus Directives:");
consensus.unifiedConsensusDirectives.forEach((d) => console.log("  *", d));
console.log("\nCryptographic Provenance Hash:", consensus.consensusArbitrationHash);
