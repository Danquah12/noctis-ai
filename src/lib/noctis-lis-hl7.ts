/**
 * NOCTIS HEALTH 500 - CLINICAL LABORATORY LIS DIRECT INGESTION ENGINE
 * Standard: HL7 v2.5.1 / v3 ORU-R01 (Unsolicited Observation Message)
 * Conformance: CLIA / CAP / FDA 21 CFR Part 862/864 / Sepsis-3 / ESC hs-cTn Protocols
 * 
 * Ingests, parses, and harmonizes hospital Laboratory Information Systems (LIS)
 * feeds (CBC, CMP, Cardiac Biomarkers hs-cTn, Arterial/Venous Blood Gases)
 * into the Noctis Sovereign Clinical Architecture with zero-truncation audio enunciation.
 */

export type AbnormalFlag = "N" | "L" | "H" | "LL" | "HH" | "A" | "C" | "AA";

export type LabStatus = "NORMAL" | "BORDERLINE" | "CRITICAL_LOW" | "CRITICAL_HIGH" | "ABNORMAL";

export interface Hl7Observation {
  identifier: string;
  testName: string;
  value: string;
  numericValue?: number;
  units: string;
  referenceRange: string;
  refLow?: number;
  refHigh?: number;
  abnormalFlag: AbnormalFlag;
  status: LabStatus;
  clinicalSignificance: string;
  safetyInvariantId?: string;
  isPanic: boolean;
}

export interface Hl7ObservationOrder {
  orderNumber: string;
  panelName: string;
  universalServiceId: string;
  specimenSource: string;
  collectionTime: string;
  observations: Hl7Observation[];
}

export interface Hl7PatientInfo {
  mrn: string;
  patientName: string;
  dob: string;
  sex: "M" | "F" | "O";
  location: string;
  attendingPhysician: string;
}

export interface Hl7LisBatch {
  messageControlId: string;
  sendingFacility: string;
  timestamp: string;
  patient: Hl7PatientInfo;
  orders: Hl7ObservationOrder[];
  criticalPanics: Hl7Observation[];
  anionGap?: number;
  deltaTroponin?: {
    baseline: number;
    current: number;
    deltaHours: number;
    ruleIn: boolean;
    protocol: string;
  };
  trippedInvariants: string[];
}

// -------------------------------------------------------------------------
// CLINICAL THRESHOLDS & INVARIANTS MATRIX
// -------------------------------------------------------------------------
interface LabRuleDefinition {
  name: string;
  units: string;
  refLow: number;
  refHigh: number;
  criticalLow?: number;
  criticalHigh?: number;
  invariantLow?: string;
  invariantHigh?: string;
  descLow?: string;
  descHigh?: string;
}

const CLINICAL_LAB_RULES: Record<string, LabRuleDefinition> = {
  // Complete Blood Count (CBC)
  WBC: {
    name: "White Blood Cell Count",
    units: "x10^3/uL",
    refLow: 4.5,
    refHigh: 11.0,
    criticalLow: 1.5,
    criticalHigh: 25.0,
    invariantLow: "CF-HEM-001",
    invariantHigh: "CF-SEP-002",
    descLow: "Severe neutropenia / agranulocytosis - extreme risk of opportunistic bacteremia",
    descHigh: "Severe leukocytosis / leukemoid reaction - indicative of overwhelming sepsis or hematologic malignancy",
  },
  HGB: {
    name: "Hemoglobin",
    units: "g/dL",
    refLow: 12.0,
    refHigh: 17.5,
    criticalLow: 7.0,
    criticalHigh: 20.0,
    invariantLow: "CF-HEM-002",
    invariantHigh: "CF-HEM-003",
    descLow: "Severe symptomatic anemia requiring emergent packed RBC crossmatch and transfusion",
    descHigh: "Severe polycythemia with hyperviscosity stroke / thrombosis risk",
  },
  PLT: {
    name: "Platelet Count",
    units: "x10^3/uL",
    refLow: 150,
    refHigh: 450,
    criticalLow: 20,
    criticalHigh: 1000,
    invariantLow: "CF-PLT-001",
    invariantHigh: "CF-PLT-002",
    descLow: "Critical thrombocytopenia (< 20 x10^3/uL) - fatal spontaneous intracranial / GI bleeding hazard. Anticoagulants absolutely contraindicated.",
    descHigh: "Extreme thrombocytosis - paradoxical arterial/venous microvascular thrombosis",
  },

  // Comprehensive Metabolic Panel (CMP)
  K: {
    name: "Potassium, Serum",
    units: "mmol/L",
    refLow: 3.5,
    refHigh: 5.1,
    criticalLow: 2.5,
    criticalHigh: 6.0,
    invariantLow: "CF-HYPOK-001",
    invariantHigh: "CF-HYPERK-001",
    descLow: "Critical hypokalemia (< 2.5 mmol/L) - high risk of Torsades de Pointes, ventricular fibrillation, and paralytic ileus",
    descHigh: "Critical hyperkalemia (>= 6.0 mmol/L) - imminent lethal cardiac arrest / sine wave PEA. Emergent IV Calcium Gluconate + Insulin/D50 mandatory.",
  },
  NA: {
    name: "Sodium, Serum",
    units: "mmol/L",
    refLow: 135,
    refHigh: 145,
    criticalLow: 120,
    criticalHigh: 160,
    invariantLow: "CF-HYPON-001",
    invariantHigh: "CF-HYPERN-001",
    descLow: "Severe acute hyponatremia - cerebral edema and herniation risk; avoid overcorrection rate > 8 mmol/L/24h to prevent osmotic demyelination",
    descHigh: "Severe hypernatremia - severe dehydration, central pontine dehydration, altered mental status",
  },
  CREAT: {
    name: "Creatinine, Serum",
    units: "mg/dL",
    refLow: 0.6,
    refHigh: 1.2,
    criticalHigh: 4.0,
    invariantHigh: "CF-AKI-001",
    descHigh: "KDIGO Stage 3 Acute Kidney Injury - stop all nephrotoxic agents (NSAIDs, ACEi/ARBs, Aminoglycosides). Renal replacement therapy evaluation.",
  },
  GLU: {
    name: "Glucose, Serum/Plasma",
    units: "mg/dL",
    refLow: 70,
    refHigh: 140,
    criticalLow: 50,
    criticalHigh: 400,
    invariantLow: "CF-HYPOG-001",
    invariantHigh: "CF-DKA-001",
    descLow: "Neuroglycopenic hypoglycemia - immediate IV 50% Dextrose (D50W) push mandatory to prevent irreversible brain death",
    descHigh: "Severe hyperglycemia indicative of Diabetic Ketoacidosis (DKA) or Hyperosmolar Hyperglycemic State (HHS). Check K+ before insulin!",
  },
  HCO3: {
    name: "Bicarbonate (CO2), Serum",
    units: "mmol/L",
    refLow: 22,
    refHigh: 29,
    criticalLow: 10,
    criticalHigh: 40,
    invariantLow: "CF-ACID-001",
    descLow: "Severe metabolic acidosis with profound base deficit",
    descHigh: "Severe metabolic alkalosis",
  },
  CL: {
    name: "Chloride, Serum",
    units: "mmol/L",
    refLow: 96,
    refHigh: 106,
  },

  // Cardiac Biomarkers
  TROP_I: {
    name: "High-Sensitivity Troponin I (hs-cTnI)",
    units: "ng/L",
    refLow: 0,
    refHigh: 14,
    criticalHigh: 52,
    invariantHigh: "CF-ACS-001",
    descHigh: "Marked myocardial injury exceeding ESC 99th percentile rule-in threshold. Urgent Cardiology consultation, telemetry monitoring, dual antiplatelet protocol.",
  },
  TROP_T: {
    name: "High-Sensitivity Troponin T (hs-cTnT)",
    units: "ng/L",
    refLow: 0,
    refHigh: 14,
    criticalHigh: 52,
    invariantHigh: "CF-ACS-001",
    descHigh: "Acute myocardial necrosis. ESC rule-in threshold exceeded.",
  },

  // Arterial / Venous Blood Gas (ABG/VBG)
  PH: {
    name: "Blood Gas pH",
    units: "pH units",
    refLow: 7.35,
    refHigh: 7.45,
    criticalLow: 7.20,
    criticalHigh: 7.60,
    invariantLow: "CF-PH-001",
    invariantHigh: "CF-PH-002",
    descLow: "Life-threatening acidemia (pH < 7.20) - myocardial depression and catecholamine refractoriness",
    descHigh: "Life-threatening alkalemia (pH > 7.60) - cerebral vasoconstriction and refractory hypokalemia",
  },
  PCO2: {
    name: "pCO2, Blood Gas",
    units: "mmHg",
    refLow: 35,
    refHigh: 45,
    criticalLow: 20,
    criticalHigh: 65,
    descLow: "Severe hyperventilation / respiratory alkalosis",
    descHigh: "Severe acute hypercapnic respiratory acidosis requiring non-invasive or invasive mechanical ventilation",
  },
  PO2: {
    name: "pO2, Blood Gas",
    units: "mmHg",
    refLow: 80,
    refHigh: 100,
    criticalLow: 55,
    descLow: "Severe arterial hypoxemia - emergent high-flow oxygen or intubation indicated",
  },
  LACTATE: {
    name: "Lactate, Blood",
    units: "mmol/L",
    refLow: 0.5,
    refHigh: 2.0,
    criticalHigh: 4.0,
    invariantHigh: "CF-SEP-001",
    descHigh: "Severe tissue hypoperfusion & anaerobic metabolism (Lactate >= 4.0 mmol/L). Sepsis-3 1-Hour resuscitation bundle: 30 mL/kg crystalloid bolus, blood cultures, broad-spectrum IV antimicrobials.",
  },
};

// -------------------------------------------------------------------------
// HL7 v2.5.1 PARSER IMPLEMENTATION
// -------------------------------------------------------------------------
export function parseHl7OruR01(rawHl7: string): Hl7LisBatch {
  const lines = rawHl7.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

  const patient: Hl7PatientInfo = {
    mrn: "UNKNOWN-MRN",
    patientName: "Anonymous Patient",
    dob: "1970-01-01",
    sex: "O",
    location: "ED-TRIAGE",
    attendingPhysician: "Staff Attending, MD",
  };

  let messageControlId = "MSG-" + Math.floor(Math.random() * 1000000);
  let sendingFacility = "CENTRAL-HOSPITAL-LIS";
  let timestamp = new Date().toISOString();

  const orders: Hl7ObservationOrder[] = [];
  let currentOrder: Hl7ObservationOrder | null = null;
  const criticalPanics: Hl7Observation[] = [];
  const trippedInvariants: string[] = [];

  let naVal: number | undefined;
  let kVal: number | undefined;
  let clVal: number | undefined;
  let hco3Val: number | undefined;
  let tropBaseline: number | undefined;
  let tropCurrent: number | undefined;

  for (const line of lines) {
    const fields = line.split("|");
    const segmentType = fields[0];

    if (segmentType === "MSH") {
      sendingFacility = fields[3] || sendingFacility;
      timestamp = fields[6] || timestamp;
      messageControlId = fields[9] || messageControlId;
    } else if (segmentType === "PID") {
      patient.mrn = (fields[3] || patient.mrn).split("^")[0];
      // PID-5: Last^First^Middle
      if (fields[5]) {
        const nameParts = fields[5].split("^");
        patient.patientName = `${nameParts[1] || ""} ${nameParts[0] || ""}`.trim() || patient.patientName;
      }
      patient.dob = fields[7] || patient.dob;
      patient.sex = (fields[8] as "M" | "F" | "O") || "O";
    } else if (segmentType === "PV1") {
      patient.location = (fields[3] || patient.location).replace(/\^/g, " ");
      patient.attendingPhysician = fields[7]?.replace(/\^/g, " ") || patient.attendingPhysician;
    } else if (segmentType === "OBR") {
      if (currentOrder) {
        orders.push(currentOrder);
      }
      // OBR-4: Code^Name^System
      const universalId = fields[4] || "PANEL^Laboratory Panel";
      const uParts = universalId.split("^");
      currentOrder = {
        orderNumber: fields[2] || fields[3] || "ORD-" + (orders.length + 1),
        panelName: uParts[1] || uParts[0] || "Laboratory Panel",
        universalServiceId: uParts[0] || "LAB",
        specimenSource: fields[15] || "Blood",
        collectionTime: fields[7] || new Date().toISOString(),
        observations: [],
      };
    } else if (segmentType === "OBX") {
      if (!currentOrder) {
        currentOrder = {
          orderNumber: "ORD-DEFAULT",
          panelName: "Diagnostic Panel",
          universalServiceId: "DIAG",
          specimenSource: "Whole Blood",
          collectionTime: new Date().toISOString(),
          observations: [],
        };
      }

      // OBX-3: Identifier^Name^CodingSystem
      const testCodeParts = (fields[3] || "").split("^");
      const rawCode = testCodeParts[0].toUpperCase();
      const rawName = testCodeParts[1] || rawCode;

      const rawVal = fields[5] || "";
      const units = fields[6] || "";
      const refRange = fields[7] || "";
      const rawFlag = (fields[8] || "N").toUpperCase() as AbnormalFlag;

      // Normalize identifier to standard key
      let stdKey = rawCode;
      if (rawCode.includes("WBC") || rawCode.includes("LEUK")) stdKey = "WBC";
      else if (rawCode.includes("HGB") || rawCode.includes("HB")) stdKey = "HGB";
      else if (rawCode.includes("PLT") || rawCode.includes("PLATE")) stdKey = "PLT";
      else if (rawCode === "K" || rawCode.includes("POTASS")) stdKey = "K";
      else if (rawCode === "NA" || rawCode.includes("SODIUM")) stdKey = "NA";
      else if (rawCode.includes("CREAT") || rawCode === "CR") stdKey = "CREAT";
      else if (rawCode.includes("GLU") || rawCode.includes("DEXTROSE")) stdKey = "GLU";
      else if (rawCode.includes("PCO2") || rawCode.includes("CO2A")) stdKey = "PCO2";
      else if (rawCode.includes("PO2") || rawCode.includes("O2A")) stdKey = "PO2";
      else if (rawCode.includes("HCO3") || rawCode.includes("CO2") || rawCode.includes("BICARB")) stdKey = "HCO3";
      else if (rawCode.includes("CL") || rawCode.includes("CHLOR")) stdKey = "CL";
      else if (rawCode.includes("TROP") && (rawCode.includes("I") || rawName.includes("I"))) stdKey = "TROP_I";
      else if (rawCode.includes("TROP") && (rawCode.includes("T") || rawName.includes("T"))) stdKey = "TROP_T";
      else if (rawCode === "PH" || rawName.toLowerCase() === "ph") stdKey = "PH";
      else if (rawCode.includes("LACT") || rawCode.includes("LAC")) stdKey = "LACTATE";

      const numVal = parseFloat(rawVal);
      const rule = CLINICAL_LAB_RULES[stdKey];

      let status: LabStatus = "NORMAL";
      let isPanic = false;
      let significance = "Within established physiological limits.";
      let invariantId: string | undefined;

      if (!isNaN(numVal) && rule) {
        if (rule.criticalLow !== undefined && numVal <= rule.criticalLow) {
          status = "CRITICAL_LOW";
          isPanic = true;
          significance = rule.descLow || `Critically low value: ${numVal} ${rule.units}`;
          invariantId = rule.invariantLow;
        } else if (rule.criticalHigh !== undefined && numVal >= rule.criticalHigh) {
          status = "CRITICAL_HIGH";
          isPanic = true;
          significance = rule.descHigh || `Critically high panic value: ${numVal} ${rule.units}`;
          invariantId = rule.invariantHigh;
        } else if (rule.refLow !== undefined && numVal < rule.refLow) {
          status = "BORDERLINE";
          significance = `Below normal interval (${rule.refLow}-${rule.refHigh} ${rule.units})`;
        } else if (rule.refHigh !== undefined && numVal > rule.refHigh) {
          status = "BORDERLINE";
          significance = `Above normal interval (${rule.refLow}-${rule.refHigh} ${rule.units})`;
        }
      } else if (rawFlag === "HH" || rawFlag === "LL" || rawFlag === "AA") {
        isPanic = true;
        status = rawFlag === "LL" ? "CRITICAL_LOW" : "CRITICAL_HIGH";
        significance = `Severe laboratory alert flag: ${rawFlag}`;
      } else if (rawFlag === "H" || rawFlag === "L" || rawFlag === "A") {
        status = "BORDERLINE";
        significance = `Abnormal flag reported by LIS analyzer: ${rawFlag}`;
      }

      if (invariantId && !trippedInvariants.includes(invariantId)) {
        trippedInvariants.push(invariantId);
      }

      // Track electrolytes for Anion Gap
      if (stdKey === "NA" && !isNaN(numVal)) naVal = numVal;
      if (stdKey === "K" && !isNaN(numVal)) kVal = numVal;
      if (stdKey === "CL" && !isNaN(numVal)) clVal = numVal;
      if (stdKey === "HCO3" && !isNaN(numVal)) hco3Val = numVal;

      // Track troponin delta
      if ((stdKey === "TROP_I" || stdKey === "TROP_T") && !isNaN(numVal)) {
        if (tropBaseline === undefined) {
          tropBaseline = numVal;
        } else {
          tropCurrent = numVal;
        }
      }

      const observation: Hl7Observation = {
        identifier: stdKey,
        testName: rule?.name || rawName,
        value: rawVal,
        numericValue: isNaN(numVal) ? undefined : numVal,
        units: rule?.units || units,
        referenceRange: rule ? `${rule.refLow} - ${rule.refHigh}` : refRange,
        refLow: rule?.refLow,
        refHigh: rule?.refHigh,
        abnormalFlag: rawFlag,
        status,
        clinicalSignificance: significance,
        safetyInvariantId: invariantId,
        isPanic,
      };

      currentOrder.observations.push(observation);
      if (isPanic) {
        criticalPanics.push(observation);
      }
    }
  }

  if (currentOrder) {
    orders.push(currentOrder);
  }

  // Calculate Anion Gap if Na, Cl, and HCO3 are present: Na - (Cl + HCO3)
  let anionGap: number | undefined;
  if (naVal !== undefined && clVal !== undefined && hco3Val !== undefined) {
    anionGap = Math.round((naVal - (clVal + hco3Val)) * 10) / 10;
    if (anionGap > 12 && !trippedInvariants.includes("CF-AGAP-001")) {
      trippedInvariants.push("CF-AGAP-001");
    }
  }

  // Calculate Delta Troponin if serial measurements exist
  let deltaTroponin: Hl7LisBatch["deltaTroponin"] | undefined;
  if (tropBaseline !== undefined && tropCurrent !== undefined) {
    const diff = Math.round((tropCurrent - tropBaseline) * 10) / 10;
    const ruleIn = tropCurrent >= 52 || diff >= 5.0;
    deltaTroponin = {
      baseline: tropBaseline,
      current: tropCurrent,
      deltaHours: 1,
      ruleIn,
      protocol: "ESC 0/1-hour high-sensitivity troponin rapid rule-in/rule-out protocol",
    };
    if (ruleIn && !trippedInvariants.includes("CF-ACS-001")) {
      trippedInvariants.push("CF-ACS-001");
    }
  }

  return {
    messageControlId,
    sendingFacility,
    timestamp,
    patient,
    orders,
    criticalPanics,
    anionGap,
    deltaTroponin,
    trippedInvariants,
  };
}

// -------------------------------------------------------------------------
// ZERO-TRUNCATION SPOKEN AUDIO SUMMARY BUILDER
// -------------------------------------------------------------------------
export function formatLisSpokenSummary(batch: Hl7LisBatch): string {
  const parts: string[] = [];

  parts.push(
    `Laboratory Information Systems Direct Ingestion Report for patient ${batch.patient.patientName}, medical record number ${batch.patient.mrn}, located at ${batch.patient.location}.`
  );

  if (batch.criticalPanics.length === 0) {
    parts.push(
      "All reported laboratory panels are within acceptable physiological limits with zero critical panic thresholds tripped."
    );
  } else {
    parts.push(
      `ATTENTION. ${batch.criticalPanics.length} critical panic laboratory values require immediate clinical physician intervention.`
    );
    batch.criticalPanics.forEach((p, idx) => {
      const invariantText = p.safetyInvariantId ? `tripping safety invariant ${p.safetyInvariantId},` : "";
      parts.push(
        `Critical value number ${idx + 1}: ${p.testName} is ${p.value} ${p.units}, normal reference interval is ${p.referenceRange} ${p.units}. ${invariantText} Clinical impact: ${p.clinicalSignificance}.`
      );
    });
  }

  if (batch.anionGap !== undefined) {
    const gapDesc = batch.anionGap > 12 ? "elevated, indicative of high anion gap metabolic acidosis" : "normal";
    parts.push(`Calculated serum anion gap is ${batch.anionGap} millimoles per liter, which is ${gapDesc}.`);
  }

  if (batch.deltaTroponin) {
    const escStatus = batch.deltaTroponin.ruleIn ? "CRITICAL RULE-IN for acute myocardial necrosis" : "negative for acute rise";
    parts.push(
      `Serial high-sensitivity cardiac troponin delta demonstrates baseline ${batch.deltaTroponin.baseline} nanograms per liter rising to ${batch.deltaTroponin.current} nanograms per liter at ${batch.deltaTroponin.deltaHours} hour, qualifying as ${escStatus} under ${batch.deltaTroponin.protocol}.`
    );
  }

  return parts.join(" ");
}

// -------------------------------------------------------------------------
// STRUCTURED REFERENCE TABLE MAPPER (Compatible with Section 1)
// -------------------------------------------------------------------------
export function convertLisBatchToStructuredTable(
  batch: Hl7LisBatch
): Array<{ parameter: string; value: string; referenceRange: string; status: string }> {
  const tableRows: Array<{ parameter: string; value: string; referenceRange: string; status: string }> = [];

  for (const order of batch.orders) {
    for (const obs of order.observations) {
      tableRows.push({
        parameter: obs.testName,
        value: `${obs.value} ${obs.units}`,
        referenceRange: `${obs.referenceRange} ${obs.units}`,
        status: obs.isPanic ? `CRITICAL PANIC (${obs.abnormalFlag})` : obs.status,
      });
    }
  }

  if (batch.anionGap !== undefined) {
    tableRows.push({
      parameter: "Calculated Serum Anion Gap",
      value: `${batch.anionGap} mmol/L`,
      referenceRange: "8.0 - 12.0 mmol/L",
      status: batch.anionGap > 12 ? "HIGH ANION GAP" : "NORMAL",
    });
  }

  return tableRows;
}

// -------------------------------------------------------------------------
// CURATED CLINICAL EMERGENCY PRESETS (HL7 v2.5.1 ORU^R01)
// -------------------------------------------------------------------------
export const HL7_PRESET_SEPSIS_DKA = `MSH|^~\\&|EPIC_LIS|MAYO_ROCHESTER|NOCTIS_AI|ED_DEPT|20261109143000||ORU^R01|MSG20261109-001|P|2.5.1
PID|1||MRN-789021^^^MAYO^MR||CHEVALLIER^MARCUS^E||19720415|M|||123 HEALING WAY^^ROCHESTER^MN^55905||5075550199
PV1|1|E|ED^BAY_04^BED_A||||ATT0987^ADAMS^SARAH^MD
OBR|1|ORD-2026-SEP-01|LAB-9812|CMP^Comprehensive Metabolic Panel^L|||20261109141500|||||||Whole Blood
OBX|1|NM|GLU^Glucose, Serum^L||485|mg/dL|70 - 140|HH|||F
OBX|2|NM|K^Potassium, Serum^L||6.4|mmol/L|3.5 - 5.1|HH|||F
OBX|3|NM|NA^Sodium, Serum^L||131|mmol/L|135 - 145|L|||F
OBX|4|NM|CL^Chloride, Serum^L||94|mmol/L|96 - 106|L|||F
OBX|5|NM|HCO3^Bicarbonate (CO2)^L||8|mmol/L|22 - 29|LL|||F
OBX|6|NM|CREAT^Creatinine, Serum^L||4.2|mg/dL|0.6 - 1.2|HH|||F
OBR|2|ORD-2026-SEP-02|LAB-9813|ABG^Arterial Blood Gas^L|||20261109142000|||||||Arterial Blood
OBX|1|NM|PH^Blood Gas pH^L||7.12|pH units|7.35 - 7.45|LL|||F
OBX|2|NM|LACTATE^Lactate, Blood^L||4.8|mmol/L|0.5 - 2.0|HH|||F
OBX|3|NM|PCO2^pCO2, Arterial^L||24|mmHg|35 - 45|L|||F
OBX|4|NM|PO2^pO2, Arterial^L||88|mmHg|80 - 100|N|||F
OBR|3|ORD-2026-SEP-03|LAB-9814|CBC^Complete Blood Count^L|||20261109141500|||||||Whole Blood
OBX|1|NM|WBC^White Blood Cell Count^L||26.8|x10^3/uL|4.5 - 11.0|HH|||F
OBX|2|NM|HGB^Hemoglobin^L||13.4|g/dL|12.0 - 17.5|N|||F
OBX|3|NM|PLT^Platelet Count^L||185|x10^3/uL|150 - 450|N|||F`;

export const HL7_PRESET_STEMI_TROPONIN = `MSH|^~\\&|ABBOTT_ARCHITECT|JOHNS_HOPKINS|NOCTIS_AI|CARDIAC_CCU|20261109151500||ORU^R01|MSG20261109-002|P|2.5.1
PID|1||MRN-445892^^^JHH^MR||THOMPSON^ELEANOR^M||19610822|F|||45 BROADWAY^^BALTIMORE^MD^21287||4105550182
PV1|1|E|CCU^BED_02||||ATT1122^CHEN^DAVID^MD
OBR|1|ORD-2026-CARD-01|LAB-1102|TROP^High-Sensitivity Troponin I Serial^L|||20261109140000|||||||Serum
OBX|1|NM|TROP_I^High-Sensitivity Troponin I (0h Baseline)^L||12|ng/L|0 - 14|N|||F
OBR|2|ORD-2026-CARD-02|LAB-1103|TROP^High-Sensitivity Troponin I Serial (1h Delta)^L|||20261109150000|||||||Serum
OBX|1|NM|TROP_I^High-Sensitivity Troponin I (1h Repeat)^L||148|ng/L|0 - 14|HH|||F
OBR|3|ORD-2026-CARD-03|LAB-1104|CMP^Basic Metabolic Panel^L|||20261109140500|||||||Serum
OBX|1|NM|K^Potassium, Serum^L||4.1|mmol/L|3.5 - 5.1|N|||F
OBX|2|NM|CREAT^Creatinine, Serum^L||1.0|mg/dL|0.6 - 1.2|N|||F
OBX|3|NM|GLU^Glucose, Serum^L||115|mg/dL|70 - 140|N|||F`;

export const HL7_PRESET_CRITICAL_THROMBOCYTOPENIA = `MSH|^~\\&|ROCHE_COBAS|CLEVELAND_CLINIC|NOCTIS_AI|HEME_ONC|20261109160000||ORU^R01|MSG20261109-003|P|2.5.1
PID|1||MRN-909182^^^CCF^MR||VAZQUEZ^ROBERTO^J||19851104|M|||9500 EUCLID AVE^^CLEVELAND^OH^44195||2165550144
PV1|1|I|ONC^ROOM_812||||ATT3344^GARCIA^ELENA^MD
OBR|1|ORD-2026-HEM-01|LAB-7761|CBC^Complete Blood Count with Diff^L|||20261109154500|||||||Whole Blood
OBX|1|NM|PLT^Platelet Count^L||12|x10^3/uL|150 - 450|LL|||F
OBX|2|NM|HGB^Hemoglobin^L||6.8|g/dL|12.0 - 17.5|LL|||F
OBX|3|NM|WBC^White Blood Cell Count^L||1.2|x10^3/uL|4.5 - 11.0|LL|||F
OBR|2|ORD-2026-HEM-02|LAB-7762|COAG^Coagulation Panel^L|||20261109154500|||||||Plasma
OBX|1|NM|INR^Prothrombin Time INR^L||1.1|ratio|0.8 - 1.2|N|||F`;

export const HL7_PRESET_NORMAL_BASELINE = `MSH|^~\\&|EPIC_LIS|MASS_GENERAL|NOCTIS_AI|AMBULATORY|20261109090000||ORU^R01|MSG20261109-004|P|2.5.1
PID|1||MRN-123456^^^MGB^MR||WILLIAMS^KATHERINE^A||19900312|F|||55 FRUIT ST^^BOSTON^MA^02114||6175550100
PV1|1|O|CLINIC^ROOM_04||||ATT5566^PATEL^ANAND^MD
OBR|1|ORD-2026-NORM-01|LAB-3301|CMP^Comprehensive Metabolic Panel^L|||20261109083000|||||||Serum
OBX|1|NM|NA^Sodium, Serum^L||140|mmol/L|135 - 145|N|||F
OBX|2|NM|K^Potassium, Serum^L||4.2|mmol/L|3.5 - 5.1|N|||F
OBX|3|NM|CL^Chloride, Serum^L||104|mmol/L|96 - 106|N|||F
OBX|4|NM|HCO3^Bicarbonate (CO2)^L||26|mmol/L|22 - 29|N|||F
OBX|5|NM|CREAT^Creatinine, Serum^L||0.9|mg/dL|0.6 - 1.2|N|||F
OBX|6|NM|GLU^Glucose, Serum^L||92|mg/dL|70 - 140|N|||F
OBR|2|ORD-2026-NORM-02|LAB-3302|CBC^Complete Blood Count^L|||20261109083000|||||||Whole Blood
OBX|1|NM|WBC^White Blood Cell Count^L||6.5|x10^3/uL|4.5 - 11.0|N|||F
OBX|2|NM|HGB^Hemoglobin^L||14.1|g/dL|12.0 - 17.5|N|||F
OBX|3|NM|PLT^Platelet Count^L||240|x10^3/uL|150 - 450|N|||F`;
