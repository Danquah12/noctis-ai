import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateNeonatalResuscitationProtocol,
  evaluatePersistentPulmonaryHypertension,
  evaluateDuctalDependentChd,
  evaluatePediatricStatusEpilepticus,
  handlePediatricNeonatalEmergencyQuery,
} from "./noctis-pediatric-neonatal-critical-care.ts";

test("NOCTIS-PED-NEO-001: Golden minute and term hyperoxia invariant vetoes", () => {
  // Term infant >= 35w initiated on 100% O2 -> trips CF-NEO-002 and requires MR. SOPA if HR remains < 100 on PPV
  const res1 = evaluateNeonatalResuscitationProtocol({
    gestationalAgeWeeks: 39,
    birthWeightGrams: 3400,
    secondsSinceBirth: 45,
    heartRateBpm: 75,
    isBreathingOrCrying: false,
    muscleTone: "SOME_FLEXION",
    currentFiO2Percent: 100,
    ppvActive: true,
    chestCompressionsActive: false,
    vascularAccess: "NONE",
  });

  assert.equal(res1.clinicalPhase, "MR_SOPA_CORRECTIVE_STEPS");
  assert.equal(res1.recommendedFiO2Percent, 21); // Term must be 21%
  assert.ok(res1.safetyVetoes.some((v) => v.includes("CF-NEO-002")));

  // Apneic infant within first 60s without prior PPV -> POSITIVE_PRESSURE_VENTILATION
  const resInit = evaluateNeonatalResuscitationProtocol({
    gestationalAgeWeeks: 39,
    birthWeightGrams: 3400,
    secondsSinceBirth: 45,
    heartRateBpm: 85,
    isBreathingOrCrying: false,
    muscleTone: "SOME_FLEXION",
    currentFiO2Percent: 21,
    ppvActive: false,
    chestCompressionsActive: false,
    vascularAccess: "NONE",
  });
  assert.equal(resInit.clinicalPhase, "POSITIVE_PRESSURE_VENTILATION");

  // Apneic infant past 60s without PPV -> trips CF-NEO-001
  const res2 = evaluateNeonatalResuscitationProtocol({
    gestationalAgeWeeks: 38,
    birthWeightGrams: 3200,
    secondsSinceBirth: 75,
    heartRateBpm: 80,
    isBreathingOrCrying: false,
    muscleTone: "FLACCID",
    currentFiO2Percent: 21,
    ppvActive: false, // NOT ACTIVE
    chestCompressionsActive: false,
    vascularAccess: "NONE",
  });

  assert.ok(res2.safetyVetoes.some((v) => v.includes("CF-NEO-001")));
});

test("NOCTIS-PED-NEO-001: Severe bradycardia HR < 60 bpm triggers 3:1 compressions and epinephrine", () => {
  const res = evaluateNeonatalResuscitationProtocol({
    gestationalAgeWeeks: 38,
    birthWeightGrams: 3000, // 3.0 kg
    secondsSinceBirth: 120,
    heartRateBpm: 45, // < 60 bpm
    isBreathingOrCrying: false,
    muscleTone: "FLACCID",
    currentFiO2Percent: 100,
    ppvActive: true,
    chestCompressionsActive: true,
    vascularAccess: "UVC",
  });

  assert.equal(res.clinicalPhase, "EPINEPHRINE_AND_VOLUME_EXPANSION");
  assert.equal(res.recommendedFiO2Percent, 100);
  assert.ok(res.compressionsDirective?.includes("3:1"));
  // 3.0 kg * 0.02 mg/kg = 0.06 mg Epinephrine
  assert.ok(res.medicationOrders.some((o) => o.includes("0.06 mg") && o.includes("0.6 mL")));
  // 10 mL/kg volume bolus = 30 mL
  assert.ok(res.medicationOrders.some((o) => o.includes("30 mL")));
});

test("NOCTIS-PED-NEO-001: Persistent Pulmonary Hypertension (PPHN) calculates exact OI and ECMO criteria", () => {
  // Case: Paw 18 cmH2O, FiO2 1.0 (100%), PaO2 40 mmHg
  // OI = (18 * 100) / 40 = 45.0 (>= 40 -> Emergent ECMO criteria met)
  const res = evaluatePersistentPulmonaryHypertension({
    meanAirwayPressureCmH2O: 18,
    fiO2Fraction: 1.0,
    paO2MmHg: 40,
    preDuctalSpO2Percent: 92,
    postDuctalSpO2Percent: 78, // Gradient = 14% (>= 10% -> Right-to-Left shunt)
  });

  assert.equal(res.oxygenationIndex, 45);
  assert.equal(res.prePostDuctalGradientPercent, 14);
  assert.equal(res.rightToLeftShuntDetected, true);
  assert.equal(res.iNoIndication, true);
  assert.equal(res.iNoStartingDosePpm, 20);
  assert.equal(res.ecmoCandidacyTier, "EMERGENT_ECMO_CANNULATION_CRITERIA_MET");
});

test("NOCTIS-PED-NEO-001: Ductal-Dependent CHD detects HLHS systemic steal and starts Alprostadil", () => {
  const res = evaluateDuctalDependentChd({
    ageDaysOrHours: "Day 2",
    weightKg: 3.2,
    presentationType: "DUCTAL_DEPENDENT_SYSTEMIC",
    preDuctalSpO2Percent: 82,
    postDuctalSpO2Percent: 72,
    systolicBpMmHg: 48,
    femoralPulses: "DIMINISHED",
    currentFiO2Fraction: 0.21,
  });

  assert.ok(res.suspectedLesionCategory.includes("Systemic"));
  assert.equal(res.alprostadilPge1Dosing.initialInfusionRateMcgKgMin, 0.05);
  assert.equal(res.targetSpO2Range, "75-85%");
  assert.ok(res.oxygenStrategyWarning.includes("PULMONARY OVERCIRCULATION (STEAL)"));
});

test("NOCTIS-PED-NEO-001: Pediatric Status Epilepticus executes ESETT 2nd line AED escalation", () => {
  const res = evaluatePediatricStatusEpilepticus({
    childWeightKg: 20,
    seizureDurationMinutes: 15,
    vascularAccess: "IV",
    priorBenzodiazepinesGivenCount: 2,
  });

  assert.equal(res.statusStage, "ESTABLISHED_STATUS_BENZO_REFRACTORY");
  assert.equal(res.immediateMedicationTier.tierNumber, 2);
  // 20 kg * 60 mg/kg = 1200 mg Keppra
  assert.ok(res.immediateMedicationTier.calculatedDose.includes("1200 mg IV"));
});

test("NOCTIS-PED-NEO-001: Natural language emergency queries route accurately", () => {
  const nrpQuery = "A 3.5 kg term neonate at 90 seconds has HR 45, flaccid tone, and is apneic despite PPV. What are the NRP directives?";
  const nrpRes = handlePediatricNeonatalEmergencyQuery(nrpQuery);
  assert.ok(nrpRes);
  assert.ok(nrpRes.includes("NOCTIS-PED-NEO-001"));
  assert.ok(nrpRes.includes("Epinephrine IV/IO"));
  assert.ok(nrpRes.includes("3:1"));

  const pphnQuery = "Calculate Oxygenation Index OI for neonate with mean airway pressure 16, FiO2 1.0, PaO2 42, and ductal gradient.";
  const pphnRes = handlePediatricNeonatalEmergencyQuery(pphnQuery);
  assert.ok(pphnRes);
  assert.ok(pphnRes.includes("Oxygenation Index (OI)"));
  assert.ok(pphnRes.includes("Inhaled Nitric Oxide"));

  const chdQuery = "Newborn day 3 with suspected coarctation / HLHS and diminished femoral pulses, start Alprostadil PGE1.";
  const chdRes = handlePediatricNeonatalEmergencyQuery(chdQuery);
  assert.ok(chdRes);
  assert.ok(chdRes.includes("Alprostadil"));
  assert.ok(chdRes.includes("PULMONARY OVERCIRCULATION (STEAL) WARNING"));
});
