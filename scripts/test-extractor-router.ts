import assert from "node:assert";
import { extractStructuredClinicalFacts, routeClinicalEncounter } from "../src/lib/noctis-clinical-extractor-router.ts";

const PROMPT_56F_HEMATOLOGY = `
[Patient Diagnostic Intake Encounter]
Encounter ID: NPDE-INTAKE-MWQTY5OT
Patient: 56-year-old female.
Presentation: Acute fever, tachycardia, altered mental status / delirium, tachypnea in setting of suspected infection and bleeding diathesis.
Vitals: BP 92/58 mmHg, HR 124 bpm, RR 26/min, Temp 39.2°C, SpO2 93% on room air.
Medications: Trimethoprim-sulfamethoxazole (Bactrim) 160/800 mg PO daily, Warfarin (Coumadin). Zero history of digoxin use.
Labs:
- Platelets: 18,000/µL
- Hemoglobin: 7.2 g/dL
- Peripheral Smear: Schistocytes present (> 2% fragmented red cells)
- LDH: Markedly elevated (980 U/L)
- Coagulation: INR 3.8, Fibrinogen low (110 mg/dL)
- Renal / Electrolytes: Creatinine 3.6 mg/dL (baseline 1.6 mg/dL), Serum Potassium 4.9 mmol/L, Lactate 4.9 mmol/L.
Please extract clinical facts and route to appropriate specialty pathway.
`.trim();

console.log("============================================================================");
console.log("TESTING STRUCTURED CLINICAL FACT EXTRACTOR & SPECIALTY ROUTER (AUDIT V9)");
console.log("============================================================================\n");

// 1. Run Extractor
const facts = extractStructuredClinicalFacts(PROMPT_56F_HEMATOLOGY, "NPDE-INTAKE-MWQTY5OT");

console.log("[1/2] Verifying Structured Fact Extraction...");
console.log("  Demographics:", facts.demographics);
console.log("  Vitals:", facts.vitals);
console.log("  Hematology:", facts.hematology);
console.log("  Coagulation:", facts.coagulation);
console.log("  Renal/Metabolic:", facts.renalMetabolic);
console.log("  Medications:", facts.medications);
console.log("  Scores:", facts.scores);

// Demographics assertions
assert.strictEqual(facts.demographics.ageYears, 56, "Age must be 56");
assert.strictEqual(facts.demographics.sex, "female", "Sex must be female");
assert.strictEqual(facts.demographics.weightKg, null, "Weight must be null (unmeasured)");
assert.strictEqual(facts.demographics.isWeightMissing, true, "Weight missing sentinel must be true");

// Vitals assertions
assert.strictEqual(facts.vitals.systolicBp, 92, "Systolic BP must be 92 mmHg");
assert.strictEqual(facts.vitals.diastolicBp, 58, "Diastolic BP must be 58 mmHg");
assert.strictEqual(facts.vitals.meanArterialPressureMmHg, 69.3, "Exact MAP must be 69.3 mmHg");
assert.strictEqual(facts.vitals.heartRateBpm, 124, "HR must be 124 bpm");
assert.strictEqual(facts.vitals.respiratoryRatePerMin, 26, "RR must be 26/min");
assert.strictEqual(facts.vitals.temperatureCelsius, 39.2, "Temp must be 39.2 C");
assert.strictEqual(facts.vitals.alteredMentalStatus, true, "Altered mental status / delirium must be true");

// Hematology assertions
assert.strictEqual(facts.hematology.plateletCountPerUl, 18000, "Platelets must be 18,000 /µL");
assert.strictEqual(facts.hematology.severeThrombocytopenia, true, "Severe thrombocytopenia must be true (< 30k)");
assert.strictEqual(facts.hematology.hemoglobinGDl, 7.2, "Hemoglobin must be 7.2 g/dL");
assert.strictEqual(facts.hematology.severeAnemia, true, "Severe anemia must be true (< 8.0 g/dL)");
assert.strictEqual(facts.hematology.schistocytesPresent, true, "Schistocytes must be present");
assert.strictEqual(facts.hematology.ldhElevated, true, "LDH must be marked as elevated");
assert.strictEqual(facts.hematology.microangiopathicHemolysis, true, "MAHA must be confirmed");

// Coagulation assertions
assert.strictEqual(facts.coagulation.inr, 3.8, "INR must be 3.8");
assert.strictEqual(facts.coagulation.fibrinogenLow, true, "Fibrinogen low must be true");
assert.strictEqual(facts.coagulation.consumptiveCoagulopathyOrDicSuspected, true, "Consumptive coagulopathy/DIC suspected must be true");

// Renal & Metabolic assertions
assert.strictEqual(facts.renalMetabolic.creatinineMgDl, 3.6, "Creatinine must be 3.6 mg/dL");
assert.strictEqual(facts.renalMetabolic.baselineCreatinineMgDl, 1.6, "Baseline Cr must be 1.6 mg/dL");
assert.strictEqual(facts.renalMetabolic.creatinineFoldRatio, 2.25, "Creatinine fold ratio must be 2.25x (3.6 / 1.6)");
assert.strictEqual(facts.renalMetabolic.kdigoAkiStage, 2, "KDIGO Stage must be Stage 2 by fold ratio");
assert.strictEqual(facts.renalMetabolic.isStage3ConditionalOnTimeline, false, "Stage 3 CANNOT be suggested when Cr 3.6 < 4.0 mg/dL");
assert.strictEqual(facts.renalMetabolic.potassiumMeqL, 4.9, "Potassium must be 4.9 mmol/L");
assert.strictEqual(facts.renalMetabolic.calciumGluconateIndicatedForPotassium, false, "Calcium gluconate NOT indicated for K 4.9");
assert.strictEqual(facts.renalMetabolic.lactateMmolL, 4.9, "Lactate must be 4.9 mmol/L");
assert.strictEqual(facts.renalMetabolic.perfusionAssessment.macrovascularTargetAchieved, true, "Macrovascular MAP >= 65 is met");
assert.strictEqual(facts.renalMetabolic.perfusionAssessment.cellularHypoperfusionPresent, true, "Cellular hypoperfusion present due to lactate 4.9 and AMS");

// Medications assertions
assert.strictEqual(facts.medications.bactrimTmpSmxPresent, true, "Bactrim / TMP-SMX must be present");
assert.strictEqual(facts.medications.warfarinPresent, true, "Warfarin must be present");
assert.strictEqual(facts.medications.digoxinExposure, false, "Digoxin exposure must be false");
assert.ok(facts.medications.pharmacovigilanceInteractions.length >= 2, "Must detect CYP2C9 interaction and DITMA risk");

// Scores assertions
assert.strictEqual(facts.scores.qsofaScore, 3, "qSOFA must be 3/3 (Hypotension <= 100, RR >= 22, AMS)");
assert.strictEqual(facts.scores.curb65AgeGe65, false, "CURB-65 age >= 65 must be FALSE (patient is 56)");
assert.strictEqual(facts.scores.ttpPentadScore, 5, "TTP Pentad score must be 5/5 (MAHA, Thrombocytopenia, AMS, Fever, Renal)");

console.log("  [PASS] Structured clinical facts extraction verified (100%).\n");

// 2. Run Router
console.log("[2/2] Verifying Clinical Specialty Routing Decision...");
const route = routeClinicalEncounter(facts);
console.log("  Priority Pathway:", route.priorityPathway);
console.log("  Primary Diagnosis:", route.primaryDiagnosis);
console.log("  Routing Justification:", route.routingJustification);
console.log("  Critical Contraindications:", route.criticalContraindications);
console.log("  Prohibited Injections:", route.prohibitedClinicalInjections);

assert.strictEqual(route.priorityPathway, "HEMATOLOGY_TMA_EMERGENCY", "Must route to HEMATOLOGY_TMA_EMERGENCY");
assert.ok(route.primaryDiagnosis.includes("Thrombotic Microangiopathy") || route.primaryDiagnosis.includes("TTP"), "Must diagnose TMA / TTP");
assert.ok(route.criticalContraindications.some(c => c.includes("Platelet transfusions are CONTRAINDICATED")), "Must flag platelet transfusion contraindication in TTP");
assert.ok(route.criticalContraindications.some(c => c.includes("DigiFab is STRICTLY NOT INDICATED")), "Must flag DigiFab not indicated");
assert.ok(route.mandatoryImmediateActions.some(a => a.includes("Therapeutic Plasma Exchange")), "Must mandate Therapeutic Plasma Exchange (PEX)");
assert.ok(route.mandatoryImmediateActions.some(a => a.includes("ADAMTS13")), "Must mandate stat ADAMTS13 draw prior to plasma");
assert.ok(route.prohibitedClinicalInjections.some(p => p.includes("Pneumonia")), "Must prohibit invented pneumonia");
assert.ok(route.prohibitedClinicalInjections.some(p => p.includes("Heart Failure")), "Must prohibit invented heart failure");

console.log("  [PASS] Specialty routing decision verified (100%).\n");

console.log("============================================================================");
console.log("ALL EXTRACTOR & ROUTER ACCEPTANCE CRITERIA PASSED (100%)");
console.log("============================================================================");
