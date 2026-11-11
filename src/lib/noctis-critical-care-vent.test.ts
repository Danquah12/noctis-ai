import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  handleMechanicalVentilationQuery,
  isMechanicalVentilationQuery,
  calculatePBW,
} from "./noctis-critical-care-vent.ts";

describe("Noctis Sovereign Critical Care Mechanical Ventilation Engine (NOCTIS-VENT-001)", () => {
  it("should calculate exact predicted body weight (PBW) for male and female", () => {
    // 190 cm male
    const pbw190M = calculatePBW(190, "male");
    assert.equal(pbw190M, 84.2);

    // 165 cm female
    const pbw165F = calculatePBW(165, "female");
    assert.equal(pbw165F, 57.0);

    // 175 cm male
    const pbw175M = calculatePBW(175, "male");
    assert.equal(pbw175M, 70.6);

    // 170 cm female
    const pbw170F = calculatePBW(170, "female");
    assert.equal(pbw170F, 61.5);
  });

  it("Case 1: should override automated EHR actual-weight rule for tall underweight ARDS patient", () => {
    const query =
      "A 61-year-old male, height 190 cm, actual body weight 58 kg, has confirmed ARDS following aspiration. He receives Volume Control ventilation with Vt 300 mL, respiratory rate 28/min, FiO₂ 0.50, and PEEP 8. His measured Pplat is 18, Ppeak is 24, and total PEEP is 8. ABG: pH 7.26, PaCO₂ 60, PaO₂ 86, and HCO₃⁻ 26. Expiratory flow returns to zero before each breath. A clinician proposes increasing Vt to 500 mL, but an automated rule rejects the order because it exceeds 8 mL/kg of actual body weight.";
    assert.ok(isMechanicalVentilationQuery(query));
    const result = handleMechanicalVentilationQuery(query);
    assert.ok(result);
    assert.ok(result.includes("OVERRULE EHR AUTOMATED RULE"));
    assert.ok(result.includes("5.94 mL/kg PBW"));
    assert.ok(result.includes("84.2 kg"));
  });

  it("Case 2: should veto Vt reduction on sudden rise in Ppeak with stable Pplat", () => {
    const query =
      "A sudden rise in peak inspiratory pressure. A 59-year-old female, height 165 cm, actual body weight 78 kg, has pneumonia-associated ARDS. Ventilator settings are Volume Control: Vt 340 mL, respiratory rate 22/min, FiO₂ 0.50, PEEP 10, and constant inspiratory flow of 60 L/min. Her Ppeak suddenly rises from 31 to 53, but a technically valid Pplat remains 25, and total PEEP remains 10. The full tidal volume is still delivered. Wheezing and increased airway secretions are present. ABG: pH 7.29, PaCO₂ 52, PaO₂ 78, and HCO₃⁻ 24. The resident proposes reducing Vt to 200 mL because “the alveolar pressure is now 53.”";
    const result = handleMechanicalVentilationQuery(query);
    assert.ok(result);
    assert.ok(result.includes("HARD VETO OF PROPOSED $V_t$ REDUCTION"));
    assert.ok(result.includes("28.0"));
    assert.ok(result.includes("suctioning"));
  });

  it("Case 3: should veto RR increase in intubated asthma with auto-PEEP obstructive shock", () => {
    const query =
      "A 35-year-old male, height 180 cm, actual body weight 90 kg, is intubated for life-threatening asthma. Settings are Volume Control: Vt 500 mL, respiratory rate 28/min, FiO₂ 0.60, set PEEP 5, and an I:E ratio of 1:1. Expiratory flow does not return to zero before the next breath. Passive measurements show Pplat 29, Ppeak 56, and total PEEP 18. His blood pressure falls to 80/45 mmHg. ABG: pH 7.18, PaCO₂ 72, PaO₂ 85, and HCO₃⁻ 26. The resident proposes increasing the respiratory rate to 35/min. Calculate intrinsic PEEP and driving pressure.";
    const result = handleMechanicalVentilationQuery(query);
    assert.ok(result);
    assert.ok(result.includes("ABSOLUTE EMERGENCY SAFETY VETO"));
    assert.ok(result.includes("13"));
    assert.ok(result.includes("11"));
    assert.ok(result.includes("disconnect the endotracheal tube"));
  });

  it("Case 4: should veto recruitment maneuver and PEEP 20 in ARDS with RV dilation", () => {
    const query =
      "A 54-year-old male, height 175 cm, actual body weight 86 kg, has aspiration-associated ARDS. His tidal volume remains 420 mL, respiratory rate 28/min, and FiO₂ 0.70 throughout a PEEP trial. Set and measured total PEEP 10 to 16, Plateau pressure 27 to 35, PaO2 60 to 74, MAP 75 to 55 mmHg. Bedside echocardiography now shows increased right-ventricular dilation. The team proposes increasing PEEP to 20, followed by a recruitment maneuver using continuous airway pressure of 40 for 90 seconds.";
    const result = handleMechanicalVentilationQuery(query);
    assert.ok(result);
    assert.ok(result.includes("HARD SAFETY VETO OF PROPOSED RECRUITMENT MANEUVER"));
    assert.ok(result.includes("17.0"));
    assert.ok(result.includes("19.0"));
    assert.ok(result.includes("ART Trial"));
  });

  it("Case 5: should veto Vt 550 mL and proning delay in severe ARDS", () => {
    const query =
      "A 46-year-old female, height 170 cm, actual body weight 82 kg, developed confirmed pneumonia-associated ARDS 20 hours ago. Current settings are Volume Control: Vt 370 mL, respiratory rate 28/min, FiO₂ 0.80, and PEEP 14. Measured Pplat is 28, and total PEEP is 14. ABG: pH 7.28, PaCO₂ 54, PaO₂ 64, and HCO₃⁻ 24.5. The resident proposes increasing Vt to 550 mL and waiting until the following morning to consider proning.";
    const result = handleMechanicalVentilationQuery(query);
    assert.ok(result);
    assert.ok(result.includes("DOUBLE SAFETY VETO"));
    assert.ok(result.includes("8.94"));
    assert.ok(result.includes("PROSEVA"));
  });

  it("Case 6: should veto neuromuscular blockade without deep sedation and invalidate coughing Pplat", () => {
    const query =
      "A 38-year-old male, height 178 cm, actual body weight 75 kg, has early severe ARDS. Settings are Volume Control: Vt 440 mL, respiratory rate 26/min, FiO₂ 0.70, and PEEP 12. Repeated stacked breaths produce 880 mL. Displayed Pplat of 27 recorded during hold interrupted by active inspiratory effort and coughing. A clinician proposes continuous neuromuscular blockade without first ensuring adequate analgesia and sedation.";
    const result = handleMechanicalVentilationQuery(query);
    assert.ok(result);
    assert.ok(result.includes("HARD SAFETY VETO OF PARALYSIS WITHOUT DEEP SEDATION"));
    assert.ok(result.includes("12.0"));
    assert.ok(result.includes("INVALID ARTIFACT"));
  });

  it("Case 7: should evaluate triple acid-base disorder and veto lowering RR to 18", () => {
    const query =
      "A low PaCO2 that may still represent inadequate compensation. A 63-year-old female, height 160 cm, actual body weight 80 kg, has septic shock, acute kidney injury, and confirmed ARDS. Settings: Vt 315 mL, RR 30/min, Pplat 29, PEEP 12. ABG: pH 7.15, PaCO2 30, PaO2 68, HCO3 10. Lactate 8.5, Cr 3.1. MAP 61. The resident proposes lowering the respiratory rate to 18/min because the PaCO2 is already below normal. Calculate Winter formula and anion gap.";
    const result = handleMechanicalVentilationQuery(query);
    assert.ok(result);
    assert.ok(result.includes("HARD SAFETY VETO — REJECT PROPOSED RATE REDUCTION"));
    assert.ok(result.includes("25"));
    assert.ok(result.includes("Winter"));
    assert.ok(result.includes("BICAR-ICU"));
  });

  it("Case 8: should evaluate ARDSNet severe acidemia exception vs. extreme Vt doubling", () => {
    const query =
      "A 49-year-old male, height 180 cm, actual body weight 92 kg, has severe ARDS. Vt 300 mL, RR 35/min, FiO2 0.80, PEEP 12. Measured Pplat is 30. ABG: pH 7.10, PaCO2 90, PaO2 72, HCO3 27. One automated rule states: Plateau pressure must never exceed 30 under any circumstances. Another clinician proposes immediately doubling Vt to 600 mL to normalize pH.";
    const result = handleMechanicalVentilationQuery(query);
    assert.ok(result);
    assert.ok(result.includes("EVALUATION OF ARDSNet SEVERE-ACIDEMIA PROTOCOL"));
    assert.ok(result.includes("47.9"));
    assert.ok(result.includes("HME"));
    assert.ok(result.includes("VV-ECMO"));
  });

  it("Case 9: should direct immediate finger thoracostomy for acute tension pneumothorax post-turning", () => {
    const query =
      "A 58-year-old female, height 165 cm, actual body weight 84 kg, is ventilated for ARDS with Vt 340 mL, RR 24, FiO2 0.60, PEEP 12. Immediately after turning, SpO2 falls to 71%, BP falls to 68/38, Ppeak rises to 55, Pplat 42. Right-sided breath sounds are markedly reduced. End-tidal CO2 falls from 35 to 18 mmHg. Resident proposes increasing PEEP to 18 and waiting 15 minutes for CXR.";
    const result = handleMechanicalVentilationQuery(query);
    assert.ok(result);
    assert.ok(result.includes("ACUTE TENSION PNEUMOTHORAX"));
    assert.ok(result.includes("ABSOLUTE EMERGENCY SAFETY VETO"));
    assert.ok(result.includes("Right Finger Thoracostomy"));
  });

  it("Case 10: should direct urgent VV-ECMO referral for refractory ARDS meeting EOLIA criteria", () => {
    const query =
      "A 41-year-old male, height 178 cm, actual body weight 84 kg, has potentially reversible pneumonia-associated ARDS, ventilated for 48 hours. Has received 18-hour prone session, neuromuscular blockade. Current: Vt 440 mL, RR 35, FiO2 1.0, PEEP 16, Pplat 30. For past 7 hours, PaO2 has remained 55 mmHg. ABG: pH 7.23, PaCO2 64, PaO2 55. Clinician proposes increasing Vt to 700 mL and postponing consultation with an ECMO center for 24 hours.";
    const result = handleMechanicalVentilationQuery(query);
    assert.ok(result);
    assert.ok(result.includes("VV-ECMO CANDIDACY"));
    assert.ok(result.includes("55.0"));
    assert.ok(result.includes("EOLIA"));
    assert.ok(result.includes("DOUBLE CRITICAL SAFETY INVARIANT VETO"));
  });
});
