/**
 * Noctis Optical & Multi-Modal Document Intake Engine (NOMI)
 * ============================================================================
 * Zero-cloud client/server OCR text sanitizer and multi-modal entity extractor.
 * Handles smartphone photos of paper lab slips, printed pathology sheets,
 * hospital discharge summaries, and prescription receipts.
 *
 * Normalizes OCR artifacts (e.g. 'O' -> '0', 'dI' -> 'dL', 'K+' -> 'Potassium'),
 * extracts tabular analytes and vital signs, and auto-populates clinical forms.
 * ============================================================================
 */

import { extractLaboratoryValues } from "./noctis-medical-record-interpreter.ts";

export interface ExtractedOcrIntake {
  dossierId: string;
  documentType: "LAB_SLIP" | "PATHOLOGY_REPORT" | "RADIOLOGY_REPORT" | "PRESCRIPTION" | "CLINICAL_DISCHARGE" | "UNKNOWN_MEDICAL";
  rawText: string;
  normalizedText: string;
  confidenceScore: number;
  detectedVitals: {
    bloodPressure?: string;
    heartRate?: number;
    respiratoryRate?: number;
    temperatureCelsius?: number;
    oxygenSaturation?: number;
  };
  detectedLabs: {
    analyte: string;
    value: number;
    unit: string;
    flag?: string;
  }[];
  detectedMedications: string[];
  suggestedChiefComplaint?: string;
}

/**
 * Normalizes common OCR artifacts in printed medical reports.
 */
export function sanitizeOcrMedicalText(rawText: string): string {
  let text = rawText;

  // 1. Fix common numeric OCR substitutions: e.g. "O.7 mg" -> "0.7 mg", "14.O" -> "14.0"
  text = text.replace(/([0-9])\.[oO]\b/g, "$1.0");
  text = text.replace(/\b[oO]\.([0-9]+)/g, "0.$1");

  // 2. Fix unit OCR errors: "mg/dI" or "mg/dl" with capital I -> "mg/dL"
  text = text.replace(/mg\/[dD][iIl|]/g, "mg/dL");
  text = text.replace(/mmol\/[lL|]/gi, "mmol/L");
  text = text.replace(/x1[oO]\^?3/gi, "x10^3");
  text = text.replace(/u[lL|]/g, "uL");

  // 3. Fix symbol / biomarker abbreviations
  text = text.replace(/(?:^|[\s,;])K\+\s*[:=]?/gi, " Potassium: ");
  text = text.replace(/(?:^|[\s,;])Na\+\s*[:=]?/gi, " Sodium: ");
  text = text.replace(/(?:^|[\s,;])Ca\+\+?\s*[:=]?/gi, " Calcium: ");

  // 4. Normalize blood pressure slashes
  text = text.replace(/(\d{2,3})\s*[\/\\]\s*(\d{2,3})\s*(?:mmHg)?/i, "$1/$2 mmHg");

  return text;
}

/**
 * Parses OCR-extracted or raw pasted slip text into a structured clinical intake.
 */
export function parseOcrMedicalIntake(rawText: string): ExtractedOcrIntake {
  const dossierId = `NOMI-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  const normalizedText = sanitizeOcrMedicalText(rawText);

  // Classify Document Type
  let docType: ExtractedOcrIntake["documentType"] = "UNKNOWN_MEDICAL";
  if (/\b(pathology|biopsy|carcinoma|adenocarcinoma|histologic|specimen)\b/i.test(normalizedText)) {
    docType = "PATHOLOGY_REPORT";
  } else if (/\b(computed\s+tomography|ct\s+scan|x-ray|ultrasound|mri|radiology|findings\s+&\s+impression)\b/i.test(normalizedText)) {
    docType = "RADIOLOGY_REPORT";
  } else if (/\b(prescription|rx\b|sig:|refills?|pharmacy|dispense)\b/i.test(normalizedText)) {
    docType = "PRESCRIPTION";
  } else if (/\b(discharge\s+summary|hospital\s+course|admission\s+date|discharge\s+date)\b/i.test(normalizedText)) {
    docType = "CLINICAL_DISCHARGE";
  } else if (/\b(metabolic\s+panel|cbc|hematology|creatinine|potassium|wbc|hemoglobin|platelets|glucose)\b/i.test(normalizedText)) {
    docType = "LAB_SLIP";
  }

  // Extract Vitals
  const detectedVitals: ExtractedOcrIntake["detectedVitals"] = {};

  const bpMatch = normalizedText.match(/\b(?:bp|blood\s+pressure)\s*[:=]?\s*(\d{2,3}\/\d{2,3})/i) ||
                  normalizedText.match(/\b(\d{2,3}\/\d{2,3})\s*mmHg\b/i);
  if (bpMatch) detectedVitals.bloodPressure = bpMatch[1];

  const hrMatch = normalizedText.match(/\b(?:hr|heart\s+rate|pulse)\s*[:=]?\s*(\d{2,3})\s*(?:bpm)?/i);
  if (hrMatch) detectedVitals.heartRate = parseInt(hrMatch[1], 10);

  const rrMatch = normalizedText.match(/\b(?:rr|resp(?:iratory)?\s+rate)\s*[:=]?\s*(\d{1,2})\s*(?:\/min|bpm)?/i);
  if (rrMatch) detectedVitals.respiratoryRate = parseInt(rrMatch[1], 10);

  const tempMatch = normalizedText.match(/\b(?:temp|temperature)\s*[:=]?\s*(\d{2,3}(?:\.\d+)?)\s*(?:°?[cf])?/i);
  if (tempMatch) {
    let tVal = parseFloat(tempMatch[1]);
    if (tVal > 90) { // Fahrenheit to Celsius
      tVal = Number((((tVal - 32) * 5) / 9).toFixed(1));
    }
    detectedVitals.temperatureCelsius = tVal;
  }

  const spo2Match = normalizedText.match(/\b(?:spo2|o2\s+sat|pulse\s+ox)\s*[:=]?\s*(\d{2,3})\s*%?/i);
  if (spo2Match) detectedVitals.oxygenSaturation = parseInt(spo2Match[1], 10);

  // Extract Labs using our robust clinical parser
  const parsedLabs = extractLaboratoryValues(normalizedText);
  const detectedLabs = parsedLabs.map((l) => ({
    analyte: l.analyteName,
    value: l.value,
    unit: l.unit,
    flag: l.status,
  }));

  // Extract Medications
  const detectedMedications: string[] = [];
  const medRegexes = [
    /\b(lisinopril|enalapril|ramipril|losartan|valsartan)\b/i,
    /\b(spironolactone|eplerenone|furosemide|lasix|hydrochlorothiazide|hctz)\b/i,
    /\b(metformin|glipizide|empagliflozin|jardiance|ozempic|semaglutide)\b/i,
    /\b(atorvastatin|rosuvastatin|simvastatin)\b/i,
    /\b(ibuprofen|advil|motrin|naproxen|aleve|meloxicam|celecoxib)\b/i,
    /\b(tamoxifen|anastrozole|letrozole|trastuzumab|folfox)\b/i,
    /\b(aspirin|plavix|clopidogrel|eliquis|apixaban|xarelto|rivaroxaban|warfarin)\b/i,
  ];

  for (const rx of medRegexes) {
    const m = normalizedText.match(rx);
    if (m && !detectedMedications.some((ex) => ex.toLowerCase() === m[1].toLowerCase())) {
      detectedMedications.push(m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase());
    }
  }

  // Chief Complaint extraction heuristic
  let suggestedChiefComplaint: string | undefined;
  const ccMatch = normalizedText.match(/\b(?:chief\s+complaint|cc|reason\s+for\s+visit|presenting\s+with)\s*[:=]?\s*([^\n.;]+)/i);
  if (ccMatch) {
    suggestedChiefComplaint = ccMatch[1].trim();
  }

  // Confidence Score calculation
  let confidence = 75;
  if (detectedLabs.length > 3) confidence += 15;
  if (detectedVitals.bloodPressure || detectedVitals.heartRate) confidence += 10;
  if (docType !== "UNKNOWN_MEDICAL") confidence += 5;
  confidence = Math.min(confidence, 99);

  return {
    dossierId,
    documentType: docType,
    rawText,
    normalizedText,
    confidenceScore: confidence,
    detectedVitals,
    detectedLabs,
    detectedMedications,
    suggestedChiefComplaint,
  };
}
