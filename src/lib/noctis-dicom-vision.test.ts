import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyHounsfieldUnit,
  calculateHematomaVolumeAbc2,
  analyzeHeadCtHemorrhage,
  calculateAspectsScore,
  analyzeChestRadiograph,
} from "./noctis-dicom-vision.ts";

test("NOCTIS MULTI-MODAL MEDICAL IMAGING & DICOM VISION (NMIE-VISION-001)", async (t) => {
  await t.test("classifyHounsfieldUnit accurately maps radiological tissues across full scale", () => {
    assert.equal(classifyHounsfieldUnit(-1000), "AIR");
    assert.equal(classifyHounsfieldUnit(-500), "LUNG_PARENCHYMA");
    assert.equal(classifyHounsfieldUnit(-50), "FAT");
    assert.equal(classifyHounsfieldUnit(0), "WATER_CSF");
    assert.equal(classifyHounsfieldUnit(35), "SOFT_TISSUE");
    assert.equal(classifyHounsfieldUnit(75), "ACUTE_HEMATOMA");
    assert.equal(classifyHounsfieldUnit(350), "CANCELLOUS_BONE");
    assert.equal(classifyHounsfieldUnit(1200), "CORTICAL_BONE");
    assert.equal(classifyHounsfieldUnit(3100), "METALLIC_FOREIGN_BODY");
  });

  await t.test("calculateHematomaVolumeAbc2 calculates exact volume and mortality threshold", () => {
    // A = 5.0 cm, B = 4.0 cm, 10 slices of 5mm (50mm = 5.0 cm)
    // ABC / 2 = (5.0 * 4.0 * 5.0) / 2 = 50.0 cm3
    const res = calculateHematomaVolumeAbc2(5.0, 4.0, 10, 5.0);
    assert.equal(res.volumeCm3, 50.0);
    assert.equal(res.mortalityRiskCategory, "INTERMEDIATE");

    // Critical volume >= 60 cm3
    const critical = calculateHematomaVolumeAbc2(6.0, 5.0, 10, 5.0); // (6*5*5)/2 = 75 cm3
    assert.equal(critical.volumeCm3, 75.0);
    assert.equal(critical.mortalityRiskCategory, "HIGH_CRITICAL");
  });

  await t.test("analyzeHeadCtHemorrhage detects epidural hematoma with critical midline shift", () => {
    const analysis = analyzeHeadCtHemorrhage({
      observedFindingsText: "Hyperdense lentiform biconvex extra-axial collection along right temporal squama, midline shift of 7.2 mm",
      maxDiameterCm: 5.5,
      perpendicularDiameterCm: 3.5,
      sliceCount: 8,
      sliceThicknessMm: 5.0,
      midlineShiftMm: 7.2,
    });

    assert.equal(analysis.hemorrhageDetected, true);
    assert.ok(analysis.subtypes.includes("EPIDURAL"));
    assert.equal(analysis.neurosurgicalEmergency, true);
    assert.equal(analysis.herniationRisk, "CRITICAL_EMERGENCY");
    assert.ok(analysis.boundingRegions.length >= 2);
  });

  await t.test("calculateAspectsScore scores MCA ischemia and thrombectomy eligibility", () => {
    // 3 hypodense regions involved (Caudate, Lentiform, Insular Ribbon) -> Score = 10 - 3 = 7
    const result = calculateAspectsScore(["Caudate", "Lentiform", "Insular Ribbon"]);
    assert.equal(result.score, 7);
    assert.equal(result.eligibleForThrombectomy, true);
    assert.equal(result.prognosticCategory, "MODERATE_PENUMBRA");

    // Severe core: 6 regions lost -> Score = 4
    const severe = calculateAspectsScore(["Caudate", "Lentiform", "Insular Ribbon", "M1", "M2", "M3"]);
    assert.equal(severe.score, 4);
    assert.equal(severe.eligibleForThrombectomy, false);
    assert.equal(severe.prognosticCategory, "POOR_EXTENSIVE_CORE");
  });

  await t.test("analyzeChestRadiograph detects tension pneumothorax and malpositioned ETT", () => {
    const cxr = analyzeChestRadiograph(
      "Right-sided hyperlucency with absent vascular markings and tension pneumothorax with mediastinal shift to contralateral left side.",
      1.5 // 1.5 cm from carina -> Too low / right mainstem risk
    );

    assert.equal(cxr.pneumothoraxDetected, true);
    assert.equal(cxr.pneumothoraxTension, true);
    assert.equal(cxr.ettPositionAdequate, false);
    assert.ok(cxr.clinicalImpression.includes("EMERGENT TENSION PNEUMOTHORAX"));
    assert.ok(cxr.clinicalImpression.includes("MALPOSITIONED ETT"));
  });
});
