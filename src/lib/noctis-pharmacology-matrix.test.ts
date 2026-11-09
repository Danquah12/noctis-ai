import { test, describe } from "node:test";
import assert from "node:assert";
import {
  calculateTisdaleScore,
  evaluatePharmacologyMatrix,
  formatPharmacologySpokenSummary,
  PHARM_PRESET_TORSADES,
  PHARM_PRESET_SEROTONIN,
  PHARM_PRESET_TRANSPLANT_INDUCTION,
  type PatientPharmacologyProfile,
} from "./noctis-pharmacology-matrix.ts";

describe("Noctis Clinical Pharmacology Drug-Drug Interaction Matrix & QTc Engine (Track 23)", () => {
  test("calculates Tisdale score accurately and stratifies Walter White into HIGH RISK", () => {
    const tisdale = calculateTisdaleScore(PHARM_PRESET_TORSADES);
    // Age >= 68 (1), Loop (1), K <= 3.5 (2), QTc >= 450 (2), >=2 QTc drugs (3), Sepsis (1), HF (1) = 11 pts
    assert.strictEqual(tisdale.totalScore, 11);
    assert.strictEqual(tisdale.riskTier, "HIGH_RISK");
  });

  test("trips CF-PHARM-001 (Extreme QTc Prolongation & TdP Veto) on Amiodarone + Haloperidol with QTc 515ms", () => {
    const report = evaluatePharmacologyMatrix(PHARM_PRESET_TORSADES);

    assert.ok(report.trippedInvariants.includes("CF-PHARM-001"));
    assert.ok(
      report.mandatoryActions.some((a) =>
        a.includes("EXTREME QTC PROLONGATION & TORSADES DE POINTES") && a.includes("Amiodarone + Haloperidol")
      )
    );
  });

  test("trips CF-PHARM-002 (Lethal Serotonin Syndrome Veto) on Linezolid + Sertraline combination", () => {
    const report = evaluatePharmacologyMatrix(PHARM_PRESET_SEROTONIN);

    assert.ok(report.trippedInvariants.includes("CF-PHARM-002"));
    assert.ok(
      report.mandatoryActions.some((a) =>
        a.includes("LETHAL SEROTONIN SYNDROME CONTRAINDICATION VETO") && a.includes("Linezolid")
      )
    );
    assert.strictEqual(report.detectedInteractions[0].severity, "CRITICAL_CONTRAINDICATED");
  });

  test("trips CF-PHARM-003 (Catastrophic CYP3A4 Induction Veto) on Rifampin + Tacrolimus/Apixaban", () => {
    const report = evaluatePharmacologyMatrix(PHARM_PRESET_TRANSPLANT_INDUCTION);

    assert.ok(report.trippedInvariants.includes("CF-PHARM-003"));
    assert.ok(
      report.mandatoryActions.some((a) =>
        a.includes("CATASTROPHIC CYP3A4/P-GP INDUCTION VETO") && a.includes("Tacrolimus")
      )
    );
  });

  test("trips CF-PHARM-004 (Triple Antithrombotic Hemorrhage Veto) on DAPT + DOAC without acute stenting", () => {
    const triplePatient: PatientPharmacologyProfile = {
      patientId: "PHARM-TRIPLE-004",
      patientName: "James Carter (65yo M - Triple Therapy)",
      ageYears: 65,
      biologicalSex: "MALE",
      baselineQtcMs: 410,
      serumPotassiumMeqPerL: 4.2,
      hasAcuteMi: false,
      hasHeartFailure: false,
      hasSepsis: false,
      takingLoopDiuretic: false,
      activeMedications: [
        { drugName: "Aspirin", doseMg: 81, cypRole: "ANTIPLATELET" },
        { drugName: "Clopidogrel", doseMg: 75, cypRole: "ANTIPLATELET" },
        { drugName: "Apixaban", doseMg: 5, cypRole: "ANTICOAGULANT" },
      ],
    };

    const report = evaluatePharmacologyMatrix(triplePatient);
    assert.ok(report.trippedInvariants.includes("CF-PHARM-004"));
    assert.ok(
      report.mandatoryActions.some((a) =>
        a.includes("TRIPLE ANTITHROMBOTIC BLEEDING HAZARD VETO") && a.includes("Drop Aspirin")
      )
    );
  });

  test("formats zero-truncation spoken audio summary with clinical precision", () => {
    const report = evaluatePharmacologyMatrix(PHARM_PRESET_TORSADES);
    const spoken = formatPharmacologySpokenSummary(report);

    assert.ok(spoken.includes("Walter White"));
    assert.ok(spoken.includes("Tisdale QTc risk score is 11 points"));
    assert.ok(spoken.includes("high risk"));
    assert.ok(spoken.includes("Amiodarone, Haloperidol"));
    assert.ok(spoken.includes("CF-PHARM-001"));
  });
});
