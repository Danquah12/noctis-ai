import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateDtrGnrInfection,
  evaluateBetaLactamPkPd,
  evaluateInvasiveFungalInfection,
  handleNaturalIdSepsisQuery,
} from "./noctis-infectious-disease-sepsis.ts";

test("NOCTIS-ID-SEPSIS-001: DTR-GNR engine detects MBL resistance and mandates CZA-ATM synergy", () => {
  // NDM producer with Ceftazidime-avibactam proposed alone -> trips CF-ID-002
  const res = evaluateDtrGnrInfection({
    pathogenIdentified: "CARBAPENEM_RESISTANT_ENTERIC_CRE",
    resistanceMechanismOrEnzyme: "NDM_METALLO",
    infectionSite: "VENTILATOR_ASSOCIATED_PNEUMONIA",
    patientWeightKg: 70,
    estimatedGfrMlMin: 60,
    proposedAntibioticRegimen: ["Ceftazidime-avibactam 2.5g IV q8h monotherapy"],
  });

  assert.ok(res.optimalAntibioticRegimen.primaryDrug.includes("Aztreonam"));
  assert.ok(res.safetyVetoes.some((v) => v.includes("CF-ID-002") && v.includes("METALLO-BETA-LACTAMASE")));
  assert.ok(res.optimalAntibioticRegimen.rationale.includes("Aztreonam is stable against metallo-beta-lactamases"));
});

test("NOCTIS-ID-SEPSIS-001: PK/PD engine detects intermittent subtherapeutic infusion and trips Cefepime neurotoxicity", () => {
  const res = evaluateBetaLactamPkPd({
    drugName: "CEFEPIME",
    currentDosingSchedule: "Cefepime 2g IV q8h over 30 min",
    infusionType: "STANDARD_INTERMITTENT_30_MIN",
    estimatedGfrMlMin: 30, // GFR < 50
    isInSepticShock: true,
    hasAlteredMentalStatusOrMyoclonus: true,
  });

  assert.strictEqual(res.timeAboveMicTargetMet, false);
  assert.ok(res.safetyVetoes.some((v) => v.includes("CF-ID-003") && v.includes("CEFEPIME NEUROTOXICITY")));
  assert.ok(res.recommendedOptimizedPrescription.includes("Extended Infusion"));
});

test("NOCTIS-ID-SEPSIS-001: Invasive fungal engine mandates Echinocandin for candidemia and trips Fluconazole veto", () => {
  const res = evaluateInvasiveFungalInfection({
    fungalSuspectedOrConfirmed: "CANDIDEMIA_SEPSIS",
    bloodCulturesPositiveForYeast: true,
    centralLinePresent: true,
    ophthalmologyDilatedExamPerformed: false,
    proposedAntifungal: "Fluconazole 400 mg IV daily",
  });

  assert.strictEqual(res.antifungalRecommendation.firstLineDrug, "Caspofungin");
  assert.ok(res.safetyVetoes.some((v) => v.includes("CF-ID-004") && v.includes("FLUCONAZOLE EMPIRIC")));
  assert.ok(res.sourceControlAndConsultDirectives.some((d) => d.includes("Remove all indwelling central venous catheters")));
  assert.ok(res.sourceControlAndConsultDirectives.some((d) => d.includes("OPHTHALMOLOGY")));
});

test("NOCTIS-ID-SEPSIS-001: Natural language routing tests", () => {
  const dtrQuery = "Patient with NDM metallo-beta-lactamase Klebsiella pneumoniae pneumonia, what is the CZA-ATM synergy regimen?";
  const dtrRes = handleNaturalIdSepsisQuery(dtrQuery);
  assert.ok(dtrRes);
  assert.ok(dtrRes.includes("NOCTIS-ID-SEPSIS-001"));
  assert.ok(dtrRes.includes("Aztreonam"));

  const pkQuery = "Evaluate piperacillin-tazobactam zosyn extended infusion vs standard infusion in septic shock time above MIC.";
  const pkRes = handleNaturalIdSepsisQuery(pkQuery);
  assert.ok(pkRes);
  assert.ok(pkRes.includes("Piperacillin-tazobactam: Loading dose"));
  assert.ok(pkRes.includes("Time-dependent killing"));

  const candQuery = "Patient in septic shock with blood cultures positive for yeast candidemia on fluconazole and central line.";
  const candRes = handleNaturalIdSepsisQuery(candQuery);
  assert.ok(candRes);
  assert.ok(candRes.includes("Caspofungin"));
  assert.ok(candRes.includes("FLUCONAZOLE EMPIRIC CANDIDEMIA VETO"));
});
