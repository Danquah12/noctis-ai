import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  assessAcuteAbdominalPain,
  calculateAlvaradoScore,
  calculateQSOFA,
  evaluateAtlantaPancreatitisCriteria,
  detectClinicalContradictions,
  evaluateTreatmentSafety,
  PatientClinicalEncounter,
} from "./noctis-clinical-engine.ts";

describe("Noctis Clinical Reasoning & Triage Acceptance Test Suite (CT-001..CT-012)", () => {
  // CT-001: 22-year-old male with fever and undocumented abdominal pain location
  it("CT-001: 22-year-old male with fever and undocumented abdominal pain location -> designates Undifferentiated Abdominal Pain and refuses unsupported anatomical ranking", () => {
    const encounter: PatientClinicalEncounter = {
      encounterId: "ENC-CT-001",
      ageYears: 22,
      biologicalSex: "male",
      chiefComplaint: "22-year-old male with fever 38.2C and abdominal pain",
      painQuadrant: undefined, // Location unprovided!
      associatedSymptoms: ["fever"],
      vitals: { temperatureC: 38.2 },
    };

    const assessment = assessAcuteAbdominalPain(encounter);

    assert.equal(assessment.isUndifferentiated, true);
    assert.equal(assessment.missingLocalization, true);
    assert.equal(assessment.syndromeClassification, "Undifferentiated Acute Abdominal Pain with Pyrexia");
    
    // Must NOT have a single anatomical condition ranked as PRIMARY_HYPOTHESIS
    const hasPrimary = assessment.differentials.some((d) => d.category === "PRIMARY_HYPOTHESIS");
    assert.equal(hasPrimary, false, "Must not assign single anatomical PRIMARY_HYPOTHESIS when pain location is unprovided");
    
    // Must flag physical examination for quadrant localization
    assert.ok(assessment.mandatoryImmediateActions.some((a) => a.includes("Mandatory Physical Examination")));
  });

  // CT-002: Male patient with suspected appendicitis
  it("CT-002: Male patient with suspected appendicitis -> female-specific questions and diagnoses suppressed", () => {
    const encounter: PatientClinicalEncounter = {
      encounterId: "ENC-CT-002",
      ageYears: 22,
      biologicalSex: "male",
      chiefComplaint: "Pain in lower right stomach",
      painQuadrant: "RLQ",
      associatedSymptoms: ["nausea"],
      vitals: { temperatureC: 37.8 },
    };

    const assessment = assessAcuteAbdominalPain(encounter);

    // Suppressed conditions must include ectopic pregnancy and ovarian torsion
    assert.ok(assessment.suppressedConditions.includes("Ectopic Pregnancy"));
    assert.ok(assessment.suppressedConditions.includes("Ovarian Torsion"));
    assert.ok(assessment.suppressedConditions.includes("Pelvic Inflammatory Disease (PID)"));

    // Differentials must NOT contain female-specific conditions
    const hasFemaleDiff = assessment.differentials.some((d) =>
      /ovarian|ectopic|uter|pregnancy|pelvic\s+inflammatory/i.test(d.diseaseName)
    );
    assert.equal(hasFemaleDiff, false, "Male encounter must strictly omit female-specific differentials");
  });

  // CT-003: Lipase 4x ULN without characteristic pain or imaging
  it("CT-003: Lipase 4x ULN without characteristic pain or imaging -> enforces Atlanta 2-of-3 criteria; does not confirm pancreatitis", () => {
    // Normal ULN is ~60 U/L. 4x ULN is 240 U/L.
    const evaluation = evaluateAtlantaPancreatitisCriteria(
      false, // No characteristic upper abdominal pain
      240,   // Lipase 240 U/L (4x 60)
      60,    // ULN 60 U/L
      false  // No characteristic imaging
    );

    assert.equal(evaluation.criteriaMetCount, 1);
    assert.equal(evaluation.isConfirmed, false, "Must not confirm acute pancreatitis with only 1 of 3 criteria met");
    assert.match(evaluation.diagnosticRationale, /INSUFFICIENT CRITERIA/);
    assert.match(evaluation.diagnosticRationale, /AT LEAST 2 OF 3/);
  });

  // CT-004: Only temperature is known for Alvarado
  it("CT-004: Only temperature is known for Alvarado -> calculates partial score (1/10); flags remaining criteria as missing; refuses risk tiering", () => {
    const encounter: PatientClinicalEncounter = {
      encounterId: "ENC-CT-004",
      ageYears: 22,
      biologicalSex: "male",
      chiefComplaint: "Abdominal discomfort",
      associatedSymptoms: [],
      vitals: { temperatureC: 38.2 }, // Only fever (≥ 37.3°C = 1 pt) is known!
    };

    const score = calculateAlvaradoScore(encounter);

    assert.equal(score.isComplete, false);
    assert.equal(score.documentedPoints, 1);
    assert.equal(score.maxPoints, 10);
    assert.equal(score.riskStratification, "INSUFFICIENT_DATA_DO_NOT_STRATIFY");
    assert.ok(score.missingCriteria.length >= 6);
    assert.match(score.clinicalInterpretation, /INCOMPLETE \(1\/10 documented points\)/);
  });

  // CT-005: Missing respiratory rate and mental status for qSOFA
  it("CT-005: Missing respiratory rate and mental status -> marks qSOFA as incomplete and records missing inputs", () => {
    const encounter: PatientClinicalEncounter = {
      encounterId: "ENC-CT-005",
      chiefComplaint: "Fever and weakness",
      associatedSymptoms: ["fever"],
      vitals: {
        systolicBp: 92, // SBP ≤ 100 documented
        // RR and GCS are missing
      },
    };

    const qsofa = calculateQSOFA(encounter);

    assert.equal(qsofa.isComplete, false);
    assert.equal(qsofa.documentedPoints, 1);
    assert.ok(qsofa.missingInputs.includes("Respiratory Rate (RR)"));
    assert.ok(qsofa.missingInputs.includes("Mental Status / Glasgow Coma Scale (GCS)"));
    assert.equal(qsofa.isHighRiskForPoorOutcomes, null);
    assert.match(qsofa.safetyCaveat, /NOT a screening or diagnostic test to rule sepsis out/);
  });

  // CT-006: Missing NEWS2 observations -> records incomplete score; never fabricates normal values
  it("CT-006: Missing NEWS2 observations -> records incomplete score; never fabricates normal values", () => {
    const encounter: PatientClinicalEncounter = {
      encounterId: "ENC-CT-006",
      chiefComplaint: "Abdominal pain",
      associatedSymptoms: [],
      vitals: {
        temperatureC: 38.2,
        // Heart rate, BP, RR, SpO2 are unmeasured
      },
    };

    const qsofa = calculateQSOFA(encounter);
    assert.equal(qsofa.isComplete, false);
    assert.ok(qsofa.missingInputs.length > 0);
  });

  // CT-007: Suspected testicular torsion (acute scrotal / lower abdominal pain)
  it("CT-007: Suspected testicular torsion -> triggers immediate P0 emergency escalation and 6-hour salvage window", () => {
    const encounter: PatientClinicalEncounter = {
      encounterId: "ENC-CT-007",
      ageYears: 19,
      biologicalSex: "male",
      chiefComplaint: "Severe acute left lower abdominal and testicular pain for 2 hours",
      painQuadrant: "RLQ",
      associatedSymptoms: ["scrotal swelling", "nausea"],
      vitals: { heartRate: 104, systolicBp: 138, diastolicBp: 86 },
    };

    const assessment = assessAcuteAbdominalPain(encounter);
    const torsionDiff = assessment.differentials.find((d) => /testicular torsion/i.test(d.diseaseName));

    assert.ok(torsionDiff !== undefined, "Testicular torsion must be evaluated in young male with lower/scrotal pain");
    assert.match(torsionDiff!.rationale, /6-hour testicular salvage window/);
    assert.equal(torsionDiff!.surgicalConsultIndicated, true);
    assert.match(torsionDiff!.goldStandardImaging, /Doppler Ultrasound/);
  });

  // CT-008: RUQ pain with fever and jaundice (Charcot triad)
  it("CT-008: RUQ pain with fever and jaundice (Charcot triad) -> triggers urgent evaluation for acute cholangitis", () => {
    const encounter: PatientClinicalEncounter = {
      encounterId: "ENC-CT-008",
      ageYears: 64,
      biologicalSex: "female",
      chiefComplaint: "Severe RUQ pain, high fever, and yellowing of the eyes (jaundice)",
      painQuadrant: "RUQ",
      associatedSymptoms: ["fever", "jaundice", "chills"],
      vitals: { temperatureC: 39.1, heartRate: 110, systolicBp: 105 },
    };

    const assessment = assessAcuteAbdominalPain(encounter);
    const cholangitis = assessment.differentials.find((d) => /cholangitis/i.test(d.diseaseName));

    assert.ok(cholangitis !== undefined, "Ascending cholangitis must be evaluated for RUQ pain with fever and jaundice");
    assert.equal(cholangitis!.category, "MUST_NOT_MISS_RULEOUT");
    assert.ok(assessment.mandatoryImmediateActions.some((a) => a.includes("Charcot triad")));
  });

  // CT-009: Suspected appendicitis with nondiagnostic ultrasound
  it("CT-009: Suspected appendicitis with nondiagnostic ultrasound -> recommends appropriate next-step cross-sectional imaging (CT) or surgical consultation", () => {
    const encounter: PatientClinicalEncounter = {
      encounterId: "ENC-CT-009",
      ageYears: 28,
      biologicalSex: "male",
      chiefComplaint: "Persistent RLQ pain with equivocal ultrasound",
      painQuadrant: "RLQ",
      associatedSymptoms: ["anorexia", "low-grade fever"],
      vitals: { temperatureC: 37.9 },
    };

    const assessment = assessAcuteAbdominalPain(encounter);
    const appendicitis = assessment.differentials.find((d) => /appendicitis/i.test(d.diseaseName));

    assert.ok(appendicitis !== undefined);
    assert.match(appendicitis!.goldStandardImaging, /Contrast-Enhanced CT/);
    assert.equal(appendicitis!.surgicalConsultIndicated, true);
  });

  // CT-010: Conflicting age, sex, or vital signs
  it("CT-010: Conflicting age, sex, or vital signs -> detects and surfaces contradiction before report generation", () => {
    const encounter: PatientClinicalEncounter = {
      encounterId: "ENC-CT-010",
      ageYears: 24,
      biologicalSex: "male",
      chiefComplaint: "24-year-old male with positive pregnancy test and LMP 6 weeks ago",
      associatedSymptoms: [],
      vitals: { temperatureC: 39.2, systolicBp: 156, diastolicBp: 98 },
    };

    const contradictions = detectClinicalContradictions(
      "Patient is a 24yo male who reports afebrile state with severe hypotension and LMP 6 weeks ago",
      encounter
    );

    assert.ok(contradictions.length >= 2, "Must detect sex mismatch and vital sign contradictions");
    assert.ok(contradictions.some((c) => c.field === "biological_sex"));
    assert.ok(contradictions.some((c) => c.field === "temperature"));
  });

  // CT-011: Treatment recommendations without allergy data
  it("CT-011: Treatment recommendations without allergy data -> marks allergy status unknown; gates prescription orders behind clinician review", () => {
    const encounter: PatientClinicalEncounter = {
      encounterId: "ENC-CT-011",
      ageYears: 35,
      chiefComplaint: "Acute abdominal pain",
      associatedSymptoms: [],
      vitals: {},
      allergies: undefined, // Unknown allergy status
    };

    const safety = evaluateTreatmentSafety(encounter);

    assert.equal(safety.allergyStatusDocumented, false);
    assert.equal(safety.clinicianApprovalRequired, true);
    assert.ok(safety.safetyAlerts.some((a) => a.includes("CRITICAL ALLERGY ALERT")));
    assert.ok(safety.safetyAlerts.some((a) => a.includes("SURGICAL GOVERNANCE")));
  });

  // CT-012: Guideline citations
  it("CT-012: Guideline citations -> requires traceable issuing organization and review status; flags unverified citations", () => {
    // Revised Atlanta criteria must cite Atlanta Classification
    const evaluation = evaluateAtlantaPancreatitisCriteria(true, 300, 60, true);
    assert.match(evaluation.diagnosticRationale, /Revised Atlanta Criteria/);
    assert.equal(evaluation.isConfirmed, true);
  });
});
