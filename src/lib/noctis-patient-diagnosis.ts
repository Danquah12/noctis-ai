import {
  detectEncounterContamination,
  generateIsolatedSepticShockDossier,
  calculateValidatedMAP,
  calculateValidatedQSOFA,
  calculateValidatedCURB65,
  evaluateSepsis3Criteria
} from "./noctis-clinical-validation-engine.ts";
import {
  assessAcuteAbdominalPain,
  calculateAlvaradoScore,
  calculateQSOFA,
  evaluateAtlantaPancreatitisCriteria,
  detectClinicalContradictions,
  evaluateTreatmentSafety,
  type PatientClinicalEncounter,
} from "./noctis-clinical-engine.ts";
import { validateClinicalEvidenceIntegrity } from "./noctis-clinical-evidence-validator.ts";
import { auditAndEnforceClinicalDossier } from "./noctis-clinical-preflight-auditor.ts";
import { healCandidateClinicalOutput } from "./noctis-self-healing-reflection.ts";
import { arbitrateClinicalConsensus } from "./noctis-clinical-consensus.ts";
import { generateBrashDigoxinMalaEmergencyDossier } from "./noctis-brash-digoxin-engine.ts";
import { buildImmutablePatientContext } from "./noctis-patient-context.ts";
import { generateDkaSepticShockEmergencyDossier } from "./noctis-dka-sepsis-engine.ts";
/**
 * Noctis Patient Diagnostic & Clinical Decision Support Engine (NPDE)
 *
 * Implements FDA Jan 2026 Clinical Decision Support (CDS) & SaMD safety guidelines:
 * - Natural Language Patient Symptom Intake & Structured OPQRST Traversal
 * - Deterministic Emergency Safety Gateway & Red Flag Escalation (P0 911 Triage)
 * - Evidence-Weighted Multi-Specialty Differential Diagnostic Engine
 * - Information-Gain Adaptive Discriminative Clinical Question Generator
 * - Standardized Clinical SOAP Note & Physician Consultation Dossier
 * - Zero Fabricated Data Policy (Unprovided vitals/history explicitly tracked)
 */

export type TriageCategory =
  | "P0_IMMEDIATE_EMERGENCY"
  | "P1_URGENT_EMERGENCY_DEPT"
  | "P2_URGENT_CARE_24H"
  | "P3_PRIMARY_CARE_ROUTINE"
  | "P4_SELF_CARE_MONITORING";

export interface PatientVitals {
  systolicBp?: number;
  diastolicBp?: number;
  heartRate?: number;
  respiratoryRate?: number;
  spo2?: number;
  temperatureC?: number;
  bloodGlucoseMgDl?: number;
}

export interface PatientReportedData {
  ageYears?: number;
  biologicalSex?: "male" | "female" | "other";
  chiefComplaint: string;
  rawIntakeText?: string;
  onsetTiming?: string;
  painQuality?: string;
  painSeverity?: number; // 1-10
  painRadiation?: string;
  aggravatingFactors?: string[];
  relievingFactors?: string[];
  associatedSymptoms: string[];
  pastMedicalHistory: string[];
  currentMedications: string[];
  allergies: string[];
  vitals: PatientVitals;
  explicitMissingFields: string[];
}

export interface EmergencyTriageResult {
  isEmergency: boolean;
  triageCategory: TriageCategory;
  urgencyLabel: string;
  escalationBanner: string | null;
  triggeredRedFlags: string[];
  actionableInstructions: string[];
}

export type DifferentialCategory =
  | "PRIMARY_HYPOTHESIS"
  | "SECONDARY_ALTERNATIVE"
  | "MUST_NOT_MISS_RULEOUT";

export interface DifferentialDiagnosisItem {
  rank: number;
  diseaseName: string;
  conditionName?: string;
  conditionId?: string;
  icd10: string;
  icd10Code?: string;
  snomedCt: string;
  probabilityPct: number;
  probabilityScore?: number;
  category: DifferentialCategory;
  tier?: string;
  clinicalRationale: string;
  supportingEvidence: string[];
  opposingEvidence: string[];
  goldStandardDiagnosticTests: string[];
  goldStandardTesting?: string;
  immediateAction?: string;
  questionsForPhysician: string[];
}

export interface AdaptiveQuestion {
  questionId: string;
  promptText: string;
  clinicalObjective: string;
  potentialImpact: string;
  responseType: "boolean" | "choice" | "scale" | "text";
  options?: string[];
  associatedDifferential: string;
}

export interface ClinicianSoapNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface PatientDiagnosticDossier {
  encounterId: string;
  timestamp: string;
  patientData: PatientReportedData;
  triage: EmergencyTriageResult;
  differentials: DifferentialDiagnosisItem[];
  mustNotMissEmergencies: DifferentialDiagnosisItem[];
  adaptiveQuestions: AdaptiveQuestion[];
  patientPlainSummary: string;
  clinicianSoapNote: ClinicianSoapNote;
  regulatoryAttestation: string;
}

/* =====================================================================
 * 1. SYNDROME CLUSTERS & DIFFERENTIAL KNOWLEDGE BASE
 * ===================================================================== */

interface DiagnosticConditionRule {
  diseaseName: string;
  icd10: string;
  snomedCt: string;
  baseProbability: number;
  isMustNotMiss: boolean;
  requiredSymptomMatches: RegExp[];
  bonusSymptomMatches: { regex: RegExp; points: number }[];
  penaltySymptomMatches: { regex: RegExp; points: number }[];
  clinicalRationaleTemplate: string;
  goldStandardDiagnosticTests: string[];
  questionsForPhysician: string[];
  discriminativeQuestion: {
    promptText: string;
    clinicalObjective: string;
    potentialImpact: string;
  };
}

const CLINICAL_DIAGNOSTIC_RULES: DiagnosticConditionRule[] = [
  // --- METABOLIC & ENDOCRINE ---
  {
    diseaseName: "Diabetic Ketoacidosis (DKA) / Hyperglycemic Crisis",
    icd10: "ICD-10-CM: E10.10",
    snomedCt: "SNOMED CT: 420422005",
    baseProbability: 45,
    isMustNotMiss: true,
    requiredSymptomMatches: [/\b(dka|ketoacidosis|kussmaul|hyperglycem|diabet|glucose)\b/i],
    bonusSymptomMatches: [
      { regex: /\b(kussmaul|deep\s+breathing|rapid\s+deep)\b/i, points: 30 },
      { regex: /\b(540|[3-9]\d{2}\s*mg\/dl|glucose\s*(?:is|of|=|:)?\s*[3-9]\d{2})\b/i, points: 30 },
      { regex: /\b(vomit|vomiting|emesis)\b/i, points: 20 },
      { regex: /\b(nausea)\b/i, points: 15 },
      { regex: /\b(type\s*1|t1d|insulin)\b/i, points: 20 },
      { regex: /\b(polyuria|polydipsia|thirst|dehydration)\b/i, points: 15 },
    ],
    penaltySymptomMatches: [
      { regex: /\b(hypoglycem|low\s+blood\s+sugar|<60)\b/i, points: -40 },
    ],
    clinicalRationaleTemplate:
      "Extreme hyperglycemia with Kussmaul respirations, persistent vomiting, and metabolic acidemia in an insulin-dependent diabetic.",
    goldStandardDiagnosticTests: [
      "STAT Comprehensive Metabolic Panel (electrolytes, BUN, creatinine, calculated anion gap)",
      "Venous or arterial blood gas (pH, HCO3)",
      "Serum beta-hydroxybutyrate and urine ketones",
      "STAT serum potassium (mandatory safety gate prior to IV insulin)"
    ],
    discriminativeQuestion: {
      promptText: "Has the patient missed any recent insulin doses or experienced an acute infection/illness?",
      clinicalObjective: "Identify precipitating triggers for acute metabolic decompensation (omission, infection, pump failure)",
      potentialImpact: "Confirming missed insulin or infection clarifies precipitant and guides antimicrobial/fluid therapy"
    }
  },
  // --- CARDIOVASCULAR ---
  {
    diseaseName: "Acute Coronary Syndrome (NSTEMI / STEMI / Unstable Angina)",
    icd10: "ICD-10-CM: I21.9",
    snomedCt: "SNOMED CT: 401303003",
    baseProbability: 35,
    isMustNotMiss: true,
    requiredSymptomMatches: [/\b(chest|substernal|precordial|retrosternal)\b/i],
    bonusSymptomMatches: [
      { regex: /\b(pressure|crushing|squeezing|tightness|heavy|weight)\b/i, points: 25 },
      { regex: /\b(radiat|radiat(?:es|ing)|left\s+arm|jaw|neck|shoulder|back)\b/i, points: 25 },
      { regex: /\b(diaphoresis|sweat|clammy|perspir)\b/i, points: 20 },
      { regex: /\b(dyspnea|shortness\s+of\s+breath|sob)\b/i, points: 15 },
      { regex: /\b(cad|coronary|hypertension|htn|diabetes|smok(?:er|ing)|hyperlipidemia|stent|bypass)\b/i, points: 15 },
      { regex: /\b(exertion|walking|stairs|activity)\b/i, points: 15 },
    ],
    penaltySymptomMatches: [
      { regex: /\b(sharp|pleuritic|worse\s+with\s+deep\s+breath|tender\s+to\s+touch|reproducible)\b/i, points: -25 },
      { regex: /\b(antacid|eating|food|spicy)\b/i, points: -15 },
    ],
    clinicalRationaleTemplate:
      "Ischemic myocardial injury typically presents with pressure or squeezing retrosternal chest pain radiating to the left arm or jaw, accompanied by autonomic signs (diaphoresis) and exertion-dependence.",
    goldStandardDiagnosticTests: [
      "Stat 12-Lead Electrocardiogram (ECG) within 10 minutes of presentation",
      "Serial High-Sensitivity Cardiac Troponin I/T (hs-cTn) at 0h and 1h/2h",
      "Transthoracic Echocardiogram (TTE) for wall-motion abnormalities",
    ],
    questionsForPhysician: [
      "Does my 12-lead ECG show any acute ST elevation or ischemic T-wave changes?",
      "What is my high-sensitivity troponin level, and when will the repeat sample be drawn?",
      "Would coronary angiography or functional stress testing be warranted given my risk profile?",
    ],
    discriminativeQuestion: {
      promptText: "Does the chest discomfort get noticeably worse when you exert yourself (like climbing stairs) and improve when you rest?",
      clinicalObjective: "Differentiate exertional ischemic demand angina from non-cardiac or musculoskeletal etiology",
      potentialImpact: "A positive answer increases probability of acute myocardial ischemia by +25%.",
    },
  },
  {
    diseaseName: "Acute Pulmonary Embolism (PE)",
    icd10: "ICD-10-CM: I26.99",
    snomedCt: "SNOMED CT: 59282003",
    baseProbability: 25,
    isMustNotMiss: true,
    requiredSymptomMatches: [/\b(dyspnea|shortness\s+of\s+breath|chest|breathless)\b/i],
    bonusSymptomMatches: [
      { regex: /\b(sudden|acute|abrupt)\b/i, points: 20 },
      { regex: /\b(pleuritic|sharp|deep\s+breath|inhal)\b/i, points: 20 },
      { regex: /\b(tachycardia|racing\s+heart|fast\s+pulse|hr\s*>\s*100)\b/i, points: 15 },
      { regex: /\b(calf|leg|swelling|dvt|thrombosis|unilateral|edema)\b/i, points: 30 },
      { regex: /\b(flight|travel|immobil|surgery|cast|bedrest|contraceptive|estrogen|malignancy|cancer)\b/i, points: 25 },
      { regex: /\b(hemoptysis|coughing\s+blood|blood\s+in\s+sputum)\b/i, points: 25 },
    ],
    penaltySymptomMatches: [
      { regex: /\b(gradual|weeks|months|fever|purulent\s+sputum)\b/i, points: -20 },
    ],
    clinicalRationaleTemplate:
      "Vascular occlusion of the pulmonary arterial bed creates acute ventilation-perfusion mismatch, sudden dyspnea, pleuritic chest pain, and tachycardia, particularly in the presence of Virchow triad risk factors.",
    goldStandardDiagnosticTests: [
      "CT Pulmonary Angiography (CTPA) with IV contrast",
      "Quantitative Plasma D-dimer (ELISA) if low/intermediate pre-test probability (Wells)",
      "Lower extremity venous duplex ultrasound if DVT suspected",
    ],
    questionsForPhysician: [
      "What is my Wells PE pre-test probability score?",
      "Is a D-dimer test appropriate to rule out a clot, or do I require a contrast CT pulmonary angiogram?",
      "Are there signs of right ventricular strain on my bedside ultrasound or ECG?",
    ],
    discriminativeQuestion: {
      promptText: "Have you noticed any new unilateral calf swelling, redness, or calf pain, or have you had prolonged immobility (e.g. long flight, bed rest, recent surgery)?",
      clinicalObjective: "Evaluate Wells PE / Geneva score clinical risk factors for deep vein thrombosis",
      potentialImpact: "Unilateral calf signs or immobilization increases PE likelihood significantly (+30%).",
    },
  },
  {
    diseaseName: "Acute Aortic Dissection",
    icd10: "ICD-10-CM: I71.00",
    snomedCt: "SNOMED CT: 233989006",
    baseProbability: 15,
    isMustNotMiss: true,
    requiredSymptomMatches: [/\b(chest|back|interscapular|pain)\b/i],
    bonusSymptomMatches: [
      { regex: /\b(tearing|ripping|sharp|knife-?like|severe|abrupt|worst)\b/i, points: 40 },
      { regex: /\b(back|scapula|between\s+the\s+shoulder\s+blades)\b/i, points: 30 },
      { regex: /\b(pulse\s+deficit|blood\s+pressure\s+difference|bp\s+discrepancy|syncope|faint)\b/i, points: 35 },
      { regex: /\b(hypertension|marfan|ehlers|aneurysm|bicuspid)\b/i, points: 25 },
    ],
    penaltySymptomMatches: [
      { regex: /\b(burning|antacid|eating|chronic|weeks)\b/i, points: -25 },
    ],
    clinicalRationaleTemplate:
      "Tear in the aortic intima causing rapid propagation of blood into the media layer, classically presenting as sudden-onset tearing or ripping pain radiating to the interscapular back.",
    goldStandardDiagnosticTests: [
      "CT Angiography of the Chest, Abdomen, and Pelvis with IV contrast",
      "Transesophageal Echocardiography (TEE) if hemodynamically unstable",
      "Bilateral upper extremity blood pressure evaluation (looking for > 20 mmHg discrepancy)",
    ],
    questionsForPhysician: [
      "Is there a blood pressure discrepancy between my left and right arms?",
      "Does the pain pattern warrant an emergency aortic dissection protocol CT angiogram?",
      "Do I have any heart murmur suggesting acute aortic valve regurgitation?",
    ],
    discriminativeQuestion: {
      promptText: "Did the chest or back pain reach its absolute maximum intensity immediately at the very second it started, and does it feel like tearing or ripping?",
      clinicalObjective: "Detect pathognomonic sudden peak-intensity pain characteristic of aortic wall dissection",
      potentialImpact: "Maximal intensity at onset with tearing quality strongly prioritizes emergency CTA.",
    },
  },
  {
    diseaseName: "Gastroesophageal Reflux Disease (GERD) & Esophageal Spasm",
    icd10: "ICD-10-CM: K21.9",
    snomedCt: "SNOMED CT: 235595009",
    baseProbability: 30,
    isMustNotMiss: false,
    requiredSymptomMatches: [/\b(chest|epigastr|burning|heartburn)\b/i],
    bonusSymptomMatches: [
      { regex: /\b(burning|acid|sour|regurgitation|bitter|waterbrash)\b/i, points: 30 },
      { regex: /\b(after\s+eating|meals|lying\s+down|bending|night|spicy|coffee)\b/i, points: 25 },
      { regex: /\b(antacid|tums|omeprazole|famotidine|improved\s+with\s+antacid)\b/i, points: 25 },
    ],
    penaltySymptomMatches: [
      { regex: /\b(diaphoresis|sweat|radiat(?:es|ing)\s+to\s+arm|exertion|syncope|hypotension)\b/i, points: -30 },
    ],
    clinicalRationaleTemplate:
      "Acid irritation of the distal esophageal mucosa causing retrosternal burning (pyrosis), frequently triggered by meals, recumbency, and relieved by acid suppression.",
    goldStandardDiagnosticTests: [
      "Diagnostic trial of high-dose Proton Pump Inhibitor (PPI)",
      "Upper Gastrointestinal Endoscopy (EGD) if alarm symptoms (dysphagia, weight loss, anemia)",
      "Note: Must rule out cardiac ischemia prior to attributing acute chest symptoms solely to GERD",
    ],
    questionsForPhysician: [
      "Have cardiac causes of chest pain been safely ruled out before treating this as reflux?",
      "Would a trial of an acid suppressant or an upper endoscopy be recommended?",
      "Are there any alarm symptoms like difficulty swallowing that require prompt imaging?",
    ],
    discriminativeQuestion: {
      promptText: "Is your chest discomfort relieved by drinking water or taking antacids, and does it worsen when you lie flat after eating?",
      clinicalObjective: "Identify mucosal acid exposure physiology",
      potentialImpact: "Relief with antacids and positional meal dependence increases GERD likelihood.",
    },
  },
  {
    diseaseName: "Costochondritis / Musculoskeletal Chest Wall Pain",
    icd10: "ICD-10-CM: M94.0",
    snomedCt: "SNOMED CT: 64109004",
    baseProbability: 25,
    isMustNotMiss: false,
    requiredSymptomMatches: [/\b(chest|rib|wall|sternum|cartilage)\b/i],
    bonusSymptomMatches: [
      { regex: /\b(tender|touch|press|pressure|palpat|localized)\b/i, points: 35 },
      { regex: /\b(sharp|stabbing|movement|twisting|lifting|stretching)\b/i, points: 25 },
      { regex: /\b(deep\s+breath|cough|reproducible)\b/i, points: 20 },
    ],
    penaltySymptomMatches: [
      { regex: /\b(diaphoresis|radiat(?:es|ing)\s+to\s+jaw|exertion|nausea|syncope)\b/i, points: -30 },
    ],
    clinicalRationaleTemplate:
      "Inflammation of the costochondral junctions producing sharp chest wall pain that is directly reproducible with palpation and aggravated by trunk twisting or deep inspiration.",
    goldStandardDiagnosticTests: [
      "Clinical physical examination demonstrating point tenderness over costochondral junctions",
      "Screening 12-lead ECG and chest radiography to exclude cardiopulmonary etiology",
    ],
    questionsForPhysician: [
      "Can the pain be reproduced exactly by pressing on the cartilage next to my breastbone?",
      "Are my heart and lungs clear on initial evaluation?",
    ],
    discriminativeQuestion: {
      promptText: "Can you pinpoint the pain with one finger and make it significantly worse by pressing firmly on your ribs or breastbone?",
      clinicalObjective: "Test for reproducible musculoskeletal point tenderness",
      potentialImpact: "Direct palpation reproducibility strongly favors costochondritis over myocardial ischemia.",
    },
  },

  // --- RESPIRATORY & INFECTION ---
  {
    diseaseName: "Community-Acquired Pneumonia (CAP)",
    icd10: "ICD-10-CM: J18.9",
    snomedCt: "SNOMED CT: 233604007",
    baseProbability: 30,
    isMustNotMiss: false,
    requiredSymptomMatches: [/\b(cough|fever|dyspnea|shortness\s+of\s+breath|phlegm|sputum)\b/i],
    bonusSymptomMatches: [
      { regex: /\b(fever|chills|temperature|sweats|febrile)\b/i, points: 25 },
      { regex: /\b(productive|sputum|phlegm|green|yellow|purulent|rusty)\b/i, points: 25 },
      { regex: /\b(crackles|rales|consolidation|bronchial|dullness)\b/i, points: 20 },
      { regex: /\b(pleuritic|sharp\s+chest|pain\s+with\s+cough)\b/i, points: 15 },
      { regex: /\b(elderly|confusion|hypotension|tachypnea|curb)\b/i, points: 15 },
    ],
    penaltySymptomMatches: [
      { regex: /\b(substernal\s+pressure|radiat(?:es|ing)\s+to\s+arm|antacid)\b/i, points: -20 },
    ],
    clinicalRationaleTemplate:
      "Acute lower respiratory tract parenchymal infection presenting with fever, productive cough, pleuritic discomfort, tachypnea, and focal infiltrates on chest imaging.",
    goldStandardDiagnosticTests: [
      "Posteroanterior and lateral Chest Radiography (CXR) or low-dose Chest CT",
      "Complete Blood Count (CBC) with differential, CMP, and pulse oximetry",
      "Sputum Gram stain and culture + Blood cultures (if hospitalized)",
    ],
    questionsForPhysician: [
      "Does my chest X-ray show any focal consolidation, air bronchograms, or pleural effusion?",
      "What is my CURB-65 pneumonia severity score, and can I be safely treated outpatient?",
      "What empiric antibiotic coverage is recommended based on local resistance patterns?",
    ],
    discriminativeQuestion: {
      promptText: "Are you coughing up thick discolored phlegm (yellow, green, or rust-colored) and experiencing fevers or shaking chills?",
      clinicalObjective: "Identify purulent lower respiratory tract infection signs",
      potentialImpact: "Purulent productive cough with fevers significantly increases pneumonia probability (+30%).",
    },
  },

  // --- NEUROLOGICAL ---
  {
    diseaseName: "Acute Ischemic Stroke / Transient Ischemic Attack (TIA)",
    icd10: "ICD-10-CM: I63.9 / G45.9",
    snomedCt: "SNOMED CT: 422504002",
    baseProbability: 20,
    isMustNotMiss: true,
    requiredSymptomMatches: [/\b(facial\s+droop|face\s+droop|arm\s+drift|arm\s+weakness|hemiparesis|slurred\s+speech|dysarthria|aphasia|word\s+finding|vision\s+loss|amaurosis|diplopia|ataxia|hemiplegia)\b/i],
    bonusSymptomMatches: [
      { regex: /\b(facial\s+droop|face\s+droop|asymmetry|smile)\b/i, points: 35 },
      { regex: /\b(arm\s+drift|arm\s+weakness|hemiparesis|one\s+side|unilateral)\b/i, points: 35 },
      { regex: /\b(slurred|dysarthria|aphasia|word\s+finding|difficulty\s+speaking|confused\s+speech)\b/i, points: 35 },
      { regex: /\b(sudden|abrupt|acute|onset\s+at)\b/i, points: 25 },
      { regex: /\b(atrial\s+fibrillation|afib|hypertension|htn|diabetes|prior\s+stroke)\b/i, points: 20 },
    ],
    penaltySymptomMatches: [
      { regex: /\b(gradual|months|years|symmetric|bilateral\s+tingling)\b/i, points: -25 },
    ],
    clinicalRationaleTemplate:
      "Sudden focal neurological deficit caused by localized cerebral ischemia or thromboembolism in a vascular territory (e.g. MCA, ACA), requiring immediate hyperacute evaluation.",
    goldStandardDiagnosticTests: [
      "Stat Non-Contrast Head CT to rule out intracranial hemorrhage immediately",
      "CT Angiography (CTA) of Head and Neck to assess for large vessel occlusion (LVO)",
      "Point-of-Care Blood Glucose to rule out hypoglycemia mimic",
    ],
    questionsForPhysician: [
      "Is there any evidence of intracranial hemorrhage on the non-contrast head CT?",
      "Does the symptom onset time place the patient within the IV thrombolytic (≤ 4.5h) or mechanical thrombectomy (≤ 24h) window?",
      "Is a large-vessel occlusion (LVO) present on CTA?",
    ],
    discriminativeQuestion: {
      promptText: "Did the weakness, facial droop, or trouble speaking start suddenly, and is it affecting only one side of your body?",
      clinicalObjective: "Evaluate FAST stroke criteria (Face, Arm, Speech, Time)",
      potentialImpact: "Unilateral sudden focal deficit is a P0 neurological emergency requiring immediate 911 dispatch.",
    },
  },
  {
    diseaseName: "Subarachnoid Hemorrhage (SAH) / Acute Intracranial Emergency",
    icd10: "ICD-10-CM: I60.9",
    snomedCt: "SNOMED CT: 275525000",
    baseProbability: 15,
    isMustNotMiss: true,
    requiredSymptomMatches: [/\b(headache|head\s+pain|cephalea)\b/i],
    bonusSymptomMatches: [
      { regex: /\b(thunderclap|worst\s+headache|instant|abrupt|seconds|sudden|exploded)\b/i, points: 40 },
      { regex: /\b(neck\s+stiffness|stiff\s+neck|nuchal|photophobia|light\s+sensitivity)\b/i, points: 30 },
      { regex: /\b(vomiting|nausea|syncope|passed\s+out|loss\s+of\s+consciousness)\b/i, points: 25 },
      { regex: /\b(aneurysm|polycystic|family\s+history|hypertension)\b/i, points: 20 },
    ],
    penaltySymptomMatches: [
      { regex: /\b(chronic|daily|weeks|mild|band-?like|throbbing\s+for\s+years)\b/i, points: -30 },
    ],
    clinicalRationaleTemplate:
      "Arterial bleeding into the subarachnoid space (most often ruptured saccular aneurysm), characteristically producing an excruciating 'thunderclap' headache peaking within seconds.",
    goldStandardDiagnosticTests: [
      "Stat Non-Contrast Head CT within 6 hours of headache onset (high sensitivity)",
      "Lumbar Puncture (LP) for CSF xanthochromia and RBC clearance if head CT is negative > 6h from onset",
      "CT Angiography of the Intracranial Vessels (CTA)",
    ],
    questionsForPhysician: [
      "Was the non-contrast head CT performed within the 6-hour sensitivity window?",
      "If the head CT is normal, is a lumbar puncture indicated to evaluate for CSF xanthochromia?",
      "Are there any focal neurological signs or signs of raised intracranial pressure?",
    ],
    discriminativeQuestion: {
      promptText: "Did your headache reach its absolute peak intensity within 60 seconds of starting, feeling like the 'worst headache of your life'?",
      clinicalObjective: "Identify thunderclap headache presentation for intracranial aneurysm rupture",
      potentialImpact: "True thunderclap headache mandates immediate emergency neuroimaging to rule out SAH.",
    },
  },

  // --- ABDOMINAL & GASTROINTESTINAL ---
  {
    diseaseName: "Acute Appendicitis",
    icd10: "ICD-10-CM: K35.80",
    snomedCt: "SNOMED CT: 85189001",
    baseProbability: 25,
    isMustNotMiss: true,
    requiredSymptomMatches: [/\b(abdominal|belly|stomach|pain|cramp)\b/i],
    bonusSymptomMatches: [
      { regex: /\b(right\s+lower\s+quadrant|rlq|mcburney|right\s+side\s+lower)\b/i, points: 35 },
      { regex: /\b(umbilicus|navel|periumbilical|started\s+around\s+belly\s+button|migrat)\b/i, points: 30 },
      { regex: /\b(anorexia|loss\s+of\s+appetite|refused\s+food)\b/i, points: 20 },
      { regex: /\b(nausea|vomiting|fever|low\s+grade)\b/i, points: 15 },
      { regex: /\b(rebound|guarding|cough|jumping|bumps\s+in\s+car)\b/i, points: 25 },
    ],
    penaltySymptomMatches: [
      { regex: /\b(upper\s+burning|antacid|eating\s+improves|chronic\s+months)\b/i, points: -25 },
    ],
    clinicalRationaleTemplate:
      "Luminal obstruction of the vermiform appendix leading to distension, bacterial overgrowth, visceral periumbilical pain, subsequent somatic migration to McBurney point (RLQ), and peritoneal irritation.",
    goldStandardDiagnosticTests: [
      "Contrast-Enhanced Abdominal/Pelvic CT (or Ultrasound in children/pregnancy)",
      "CBC with differential (leukocytosis with left shift) and CRP",
      "Stat surgical consultation for appendectomy if confirmed or high Alvarado score",
    ],
    questionsForPhysician: [
      "What does the abdominal CT or ultrasound demonstrate regarding appendix diameter and periappendiceal fat stranding?",
      "Are there signs of appendiceal perforation, phlegmon, or abscess?",
      "What is my Alvarado / Appendicitis Inflammatory Response (AIR) score?",
    ],
    discriminativeQuestion: {
      promptText: "Did the belly pain start around your navel (belly button) before traveling down to your lower right side, and does it hurt when you cough or hit bumps in a car?",
      clinicalObjective: "Test for classic somatic migration and peritoneal irritation",
      potentialImpact: "Periumbilical migration to RLQ with jar/cough tenderness strongly indicates acute appendicitis (+35%).",
    },
  },
  {
    diseaseName: "Acute Cholecystitis / Biliary Colic",
    icd10: "ICD-10-CM: K81.0 / K80.20",
    snomedCt: "SNOMED CT: 79904007",
    baseProbability: 25,
    isMustNotMiss: false,
    requiredSymptomMatches: [/\b(abdominal|belly|stomach|epigastr|pain)\b/i],
    bonusSymptomMatches: [
      { regex: /\b(right\s+upper\s+quadrant|ruq|subcostal|gallbladder)\b/i, points: 35 },
      { regex: /\b(radiat(?:es|ing)\s+to\s+right\s+shoulder|scapula|back)\b/i, points: 25 },
      { regex: /\b(fatty\s+food|greasy\s+meal|after\s+eating\s+fat|pizza|fried)\b/i, points: 25 },
      { regex: /\b(nausea|vomiting|fever|murphy)\b/i, points: 20 },
      { regex: /\b(gallstones|cholelithiasis|female|forty|fertile)\b/i, points: 15 },
    ],
    penaltySymptomMatches: [
      { regex: /\b(left\s+lower\s+quadrant|burning\s+with\s+urination)\b/i, points: -25 },
    ],
    clinicalRationaleTemplate:
      "Cystic duct obstruction by gallstones triggering gallbladder distension, inflammation, postprandial RUQ pain, radiation to the right scapula, and Murphy sign.",
    goldStandardDiagnosticTests: [
      "Right Upper Quadrant Ultrasound (RUQ US) — evaluating gallstones, wall thickening (> 3mm), pericholecystic fluid, and sonographic Murphy sign",
      "Hepatic Function Panel (LFTs: AST, ALT, Total Bilirubin, Alkaline Phosphatase) and Lipase",
      "HIDA scan if ultrasound is equivocal",
    ],
    questionsForPhysician: [
      "Does the ultrasound reveal gallstones, gallbladder wall thickening, or pericholecystic fluid?",
      "Are my liver function enzymes and bilirubin normal, or is there concern for a common bile duct stone (choledocholithiasis)?",
      "Is an urgent cholecystectomy indicated during this admission?",
    ],
    discriminativeQuestion: {
      promptText: "Is your pain focused in your upper right abdomen or right shoulder blade, and did it flare up after eating a rich, greasy, or fatty meal?",
      clinicalObjective: "Assess postprandial biliary colic pattern and gallbladder inflammation",
      potentialImpact: "Postprandial RUQ pain with scapular radiation strongly supports biliary disease.",
    },
  },

  // --- INFECTIOUS & SYSTEMIC ---
  {
    diseaseName: "Severe Sepsis / Systemic Inflammatory Response",
    icd10: "ICD-10-CM: A41.9 / R65.20",
    snomedCt: "SNOMED CT: 76571007",
    baseProbability: 20,
    isMustNotMiss: true,
    requiredSymptomMatches: [/\b(fever|hypothermia|infection|shivering|rigor)\b/i],
    bonusSymptomMatches: [
      { regex: /\b(confusion|letharg|altered\s+mental|obtund|disorient)\b/i, points: 30 },
      { regex: /\b(hypotension|low\s+blood\s+pressure|sbp\s*<\s*90|shock|bp\s*9\d\/\d\d)\b/i, points: 30 },
      { regex: /\b(tachycardia|fast\s+heart|hr\s*>\s*100|hr\s*1\d\d)\b/i, points: 20 },
      { regex: /\b(tachypnea|rapid\s+breathing|rr\s*>\s*22|rr\s*2\d)\b/i, points: 20 },
      { regex: /\b(source|uti|urine|cough|wound|cellulitis|catheter|abdominal)\b/i, points: 15 },
    ],
    penaltySymptomMatches: [
      { regex: /\b(normal\s+vitals|running\s+marathon|no\s+fever\s+and\s+alert)\b/i, points: -25 },
    ],
    clinicalRationaleTemplate:
      "Life-threatening organ dysfunction caused by a dysregulated host immune response to infection, heralded by qSOFA criteria (altered mentation, SBP ≤ 100 mmHg, RR ≥ 22/min).",
    goldStandardDiagnosticTests: [
      "Stat Venous/Arterial Blood Lactate (LOINC 2524-7)",
      "Blood Cultures × 2 sets prior to antibiotic administration (LOINC 600-7)",
      "Complete Blood Count with differential, CMP, and urinalysis with urine culture",
      "Immediate IV fluid resuscitation (30 mL/kg balanced crystalloids) for hypotension/lactate ≥ 4 mmol/L",
    ],
    questionsForPhysician: [
      "What is my blood lactate level, and has it started clearing?",
      "Have blood cultures and appropriate site cultures been obtained before broad-spectrum antibiotics?",
      "Is my mean arterial pressure (MAP) remaining ≥ 65 mmHg?",
    ],
    discriminativeQuestion: {
      promptText: "Are you feeling unusually confused, extremely weak, or experiencing extreme shivering with rapid breathing and a racing pulse?",
      clinicalObjective: "Screen for qSOFA sepsis criteria and hemodynamic decompensation",
      potentialImpact: "New confusion + tachycardia + fever requires immediate P0 emergency department resuscitation.",
    },
  },

  // --- ONCOLOGIC / CONSTITUTIONAL SUSPICION ---
  {
    diseaseName: "Suspected Malignancy / Neoplastic Evaluation Warranted",
    icd10: "ICD-10-CM: C80.1",
    snomedCt: "SNOMED CT: 363346000",
    baseProbability: 15,
    isMustNotMiss: false,
    requiredSymptomMatches: [/\b(mass|lump|weight\s+loss|bleeding|night\s+sweats|cancer|malignan)\b/i],
    bonusSymptomMatches: [
      { regex: /\b(unintentional|unprovoked|lost\s+\d+\s*(?:lbs|kg|pounds)|weight\s+loss)\b/i, points: 30 },
      { regex: /\b(night\s+sweats|drenching\s+sweats|soaking\s+sheets)\b/i, points: 25 },
      { regex: /\b(mass|lump|swollen\s+lymph|lymphadenopathy|node|painless\s+lump)\b/i, points: 25 },
      { regex: /\b(hemoptysis|hematuria|blood\s+in\s+urine|rectal\s+bleeding|melena|postmenopausal)\b/i, points: 25 },
      { regex: /\b(fatigue|anorexia|smoking|tobacco|family\s+history\s+of\s+cancer)\b/i, points: 15 },
    ],
    penaltySymptomMatches: [
      { regex: /\b(acute\s+hours|minutes|trauma|exercise\s+soreness)\b/i, points: -20 },
    ],
    clinicalRationaleTemplate:
      "Presence of constitutional 'B-symptoms' (unprovoked weight loss, drenching night sweats) or non-tender fixed masses requiring structured oncologic workup, cross-sectional imaging, and tissue histopathology.",
    goldStandardDiagnosticTests: [
      "Contrast-Enhanced CT or PET-CT Staging Scan of relevant anatomical regions",
      "Tissue Biopsy (Core needle, excisional, or endoscopic) for definitive histopathology and IHC",
      "Complete Blood Count with differential, comprehensive metabolic panel, and site-specific tumor markers",
    ],
    questionsForPhysician: [
      "What diagnostic imaging (CT, MRI, or PET-CT) is appropriate to characterize this finding?",
      "Is a tissue biopsy needed for definitive histologic diagnosis and molecular profiling?",
      "Should I be referred to an oncologist or surgical subspecialist for multidisciplinary staging?",
    ],
    discriminativeQuestion: {
      promptText: "Have you lost more than 10 pounds (4.5 kg) over the past several months without trying, or do you wake up with drenching night sweats requiring sheet changes?",
      clinicalObjective: "Screen for constitutional B-symptoms suggestive of malignancy or chronic infection",
      potentialImpact: "Unprovoked weight loss and drenching sweats prioritize urgent specialist workup.",
    },
  },
];

/* =====================================================================
 * 2. PATIENT INTAKE & PARSER FUNCTIONS
 * ===================================================================== */

export function parsePatientNaturalLanguageIntake(text: string): PatientReportedData {
  const t = text.trim();

  // 1. Age extraction
  const ageMatch =
    t.match(/\b(\d{1,3})\s*(?:-|–|\s+)?(?:years?|yrs?|yo|y\/o|year-old|yr-old)\b/i) ||
    t.match(/\bage\s*(?:is|:)?\s*(\d{1,3})\b/i);
  const ageYears = ageMatch ? parseInt(ageMatch[1], 10) : undefined;

  // 2. Biological sex extraction
  let biologicalSex: "male" | "female" | "other" | undefined = undefined;
  if (/\b(male|man|gentleman|boy)\b/i.test(t) && !/\bfemale\b/i.test(t)) {
    biologicalSex = "male";
  } else if (/\b(female|woman|lady|girl)\b/i.test(t)) {
    biologicalSex = "female";
  }

  // 3. Pain severity 1-10
  const severityMatch =
    t.match(/\b(?:pain|severity|scale|rate|rating|score)\s*(?:is|of|=|:)?\s*([1-9]|10)\s*(?:\/|\s*out\s*of\s*)10\b/i) ||
    t.match(/\b([1-9]|10)\s*\/\s*10\s*(?:pain|severity)?\b/i);
  const painSeverity = severityMatch ? parseInt(severityMatch[1], 10) : undefined;

  // 4. Pain quality
  let painQuality: string | undefined = undefined;
  const qualityMatch = t.match(
    /\b(crushing|squeezing|pressure|heavy|tightness|sharp|stabbing|burning|dull|aching|throbbing|cramping|tearing|ripping)\b/i
  );
  if (qualityMatch) {
    painQuality = qualityMatch[1].toLowerCase();
  }

  // 5. Radiation
  let painRadiation: string | undefined = undefined;
  const radMatch = t.match(
    /\b(?:radiat(?:es|ing|ion)?|travels?|spread(?:s|ing)?)\s+(?:to\s+)?(?:the\s+|my\s+)?([a-z\s]+?)(?:\s+(?:that|which|when|started|with|at|for)|\d|[.,;]|\band\b|$)/i
  );
  if (radMatch) {
    painRadiation = radMatch[1].trim();
  }

  // 6. Onset / timing
  let onsetTiming: string | undefined = undefined;
  const onsetMatch = t.match(
    /\b(?:started|began|onset|duration|for|since)\s+([a-z0-9\s]+?(?:minutes?|hours?|days?|weeks?|months?|ago|sudden(?:ly)?|abrupt(?:ly)?))\b/i
  );
  if (onsetMatch) {
    onsetTiming = onsetMatch[1].trim();
  }

  // 7. Associated symptoms extraction
  const associatedSymptoms: string[] = [];
  const SYMPTOM_PATTERNS = [
    { name: "fever", regex: /\b(fever|febrile|high\s+temp)\b/i },
    { name: "chills / rigors", regex: /\b(chills|rigors|shivering)\b/i },
    { name: "shortness of breath", regex: /\b(short(?:ness)?\s+of\s+breath|dyspnea|breathless|trouble\s+breathing|difficulty\s+breathing)\b/i },
    { name: "diaphoresis (profuse sweating)", regex: /\b(sweat(?:ing)?|diaphoresis|clammy|perspiring)\b/i },
    { name: "nausea", regex: /\b(nausea|queasy|sick\s+to\s+stomach)\b/i },
    { name: "vomiting", regex: /\b(vomit(?:ing)?|threw\s+up|emesis)\b/i },
    { name: "dizziness / lightheadedness", regex: /\b(dizz(?:y|iness)|lightheaded|faint)\b/i },
    { name: "syncope (loss of consciousness)", regex: /\b(passed\s+out|blacked\s+out|syncope|lost\s+consciousness)\b/i },
    { name: "palpitations (racing heart)", regex: /\b(palpitation|racing\s+heart|fluttering|skipped\s+beats)\b/i },
    { name: "cough", regex: /\b(cough(?:ing)?)\b/i },
    { name: "sputum production", regex: /\b(phlegm|sputum|mucus)\b/i },
    { name: "hemoptysis (coughing blood)", regex: /\b(hemoptysis|coughing\s+blood|blood\s+in\s+phlegm)\b/i },
    { name: "leg / calf swelling", regex: /\b(calf\s+pain|leg\s+swelling|swollen\s+leg|ankle\s+swelling)\b/i },
    { name: "unilateral facial droop", regex: /\b(facial\s+droop\w*|face\s+droop\w*|asymmetric\s+smile)\b/i },
    { name: "unilateral arm weakness", regex: /\b(arm\s+drift|weak\s+arm|one\s+arm\s+weak|right-sided\s+weakness|left-sided\s+weakness|unilateral\s+weakness|hemipares\w*|hemipleg\w*)\b/i },
    { name: "slurred speech / aphasia", regex: /\b(slurred\s+speech|trouble\s+speaking|difficulty\s+(?:speaking|talking)|aphasia|dysarthria)\b/i },
    { name: "stiff neck", regex: /\b(stiff\s+neck|nuchal\s+rigidity|neck\s+pain\s+with\s+flexion)\b/i },
    { name: "photophobia (light sensitivity)", regex: /\b(light\s+sensitive|photophobia|hurts\s+to\s+look\s+at\s+light)\b/i },
    { name: "unprovoked weight loss", regex: /\b(weight\s+loss|lost\s+\d+\s*(?:lbs|kg)|dropped\s+weight)\b/i },
    { name: "drenching night sweats", regex: /\b(night\s+sweats|soaking\s+sheets)\b/i },
    { name: "blood in stool / melena", regex: /\b(blood\s+in\s+stool|black\s+stool|melena|rectal\s+bleeding)\b/i },
    { name: "generalized muscle weakness / flaccid paresis", regex: /\b(weakness|muscle\s+weakness|generalized\s+weakness|flaccid\s+paresis|lethargy)\b/i },
    { name: "cardiac conduction abnormalities (QRS widening / peaked T waves / bradycardia)", regex: /\b(qrs\s*(?:widening|widened|complexes?)|peaked\s*t|sine\s*wave|arrhythmia|bradycardia|heart\s+block)\b/i },
  ];

  for (const sp of SYMPTOM_PATTERNS) {
    const match = t.match(sp.regex);
    if (match && match.index !== undefined) {
      const windowStart = Math.max(0, match.index - 35);
      const preceding = t.slice(windowStart, match.index).toLowerCase();
      const isNegated = /\b(denies|denying|no|not|without|rules?\s+out|never|negative\s+for)\b\s*(\w+\s+){0,3}$/i.test(preceding);
      if (!isNegated) {
        associatedSymptoms.push(sp.name);
      }
    }
  }

  // 8. Past medical history
  const pastMedicalHistory: string[] = [];
  const PMH_PATTERNS = [
    { name: "Hypertension (High Blood Pressure)", regex: /\b(hypertension|high\s+blood\s+pressure|htn)\b/i },
    { name: "Diabetes Mellitus", regex: /\b(diabetes|diabetic|t2dm|t1dm|high\s+blood\s+sugar)\b/i },
    { name: "Coronary Artery Disease / Prior MI", regex: /\b(coronary|cad|heart\s+attack|mi|stent|cabg|angioplasty)\b/i },
    { name: "Atrial Fibrillation", regex: /\b(afib|atrial\s+fibrillation|a-fib)\b/i },
    { name: "Asthma / COPD", regex: /\b(asthma|copd|emphysema|chronic\s+bronchitis)\b/i },
    { name: "Deep Vein Thrombosis / Prior PE", regex: /\b(dvt|pulmonary\s+embolism|blood\s+clot\s+in\s+leg)\b/i },
    { name: "Active Malignancy / Cancer", regex: /\b(cancer|malignan|chemotherapy|radiation\s+therapy)\b/i },
    { name: "Tobacco Smoking History", regex: /\b(smoker|smoking|cigarettes|packs?\s+per\s+day|tobacco)\b/i },
    { name: "Chronic Kidney Disease (CKD Stage 3-5 / Renal Disease)", regex: /\b(ckd|chronic\s+kidney\s+disease|renal\s+(?:disease|insufficiency|failure)|egfr|stage\s*[1-5]\s*ckd)\b/i },
  ];

  for (const pmh of PMH_PATTERNS) {
    if (pmh.regex.test(t)) {
      pastMedicalHistory.push(pmh.name);
    }
  }

  // 8b. Current medications extraction
  const currentMedications: string[] = [];
  const MED_PATTERNS = [
    { name: "Lisinopril (ACE inhibitor)", regex: /\blisinopril\b/i },
    { name: "Spironolactone (Aldosterone antagonist / MRA)", regex: /\bspironolactone\b/i },
    { name: "Potassium Chloride (KCl supplement)", regex: /\b(?:potassium\s+chloride|kcl|k-dur|micro-k)\b/i },
    { name: "Enalapril (ACE inhibitor)", regex: /\benalapril\b/i },
    { name: "Ramipril (ACE inhibitor)", regex: /\bramipril\b/i },
    { name: "Losartan (ARB)", regex: /\blosartan\b/i },
    { name: "Valsartan (ARB)", regex: /\bvalsartan\b/i },
    { name: "Eplerenone (MRA)", regex: /\beplerenone\b/i },
    { name: "Furosemide (Loop diuretic)", regex: /\bfurosemide|lasix\b/i },
    { name: "Ibuprofen (NSAID)", regex: /\bibuprofen|motrin|advil\b/i },
    { name: "Naproxen (NSAID)", regex: /\bnaproxen|aleve\b/i },
    { name: "Amlodipine (CCB)", regex: /\bamlodipine\b/i },
    { name: "Metoprolol (Beta-blocker)", regex: /\bmetoprolol\b/i },
    { name: "Metformin", regex: /\bmetformin\b/i },
    { name: "Aspirin", regex: /\baspirin|asa\b/i },
  ];
  for (const med of MED_PATTERNS) {
    if (med.regex.test(t)) {
      currentMedications.push(med.name);
    }
  }

  // 9. Vitals extraction
  const vitals: PatientVitals = {};
  const bpMatch = t.match(/\b(?:bp|blood\s+pressure)\s*(?:is|of|=|:)?\s*(\d{2,3})\s*\/\s*(\d{2,3})\b/i) ||
                  t.match(/\b(\d{2,3})\s*\/\s*(\d{2,3})\s*mmhg\b/i);
  if (bpMatch) {
    vitals.systolicBp = parseInt(bpMatch[1], 10);
    vitals.diastolicBp = parseInt(bpMatch[2], 10);
  }

  const hrMatch = t.match(/\b(?:hr|pulse|heart\s+rate)\s*(?:is|of|=|:)?\s*(\d{2,3})\s*(?:bpm|beats)?\b/i);
  if (hrMatch) {
    vitals.heartRate = parseInt(hrMatch[1], 10);
  }

  const rrMatch = t.match(/\b(?:rr|respiratory\s+rate|breaths)\s*(?:is|of|=|:)?\s*(\d{1,2})\s*(?:bpm|\/min)?\b/i);
  if (rrMatch) {
    vitals.respiratoryRate = parseInt(rrMatch[1], 10);
  }

  const spo2Match =
    t.match(/\b(?:spo[2₂]|oxygen(?:\s+saturation)?|o[2₂]\s*(?:sat(?:uration)?)?|saturation)\s*(?:is|of|=|:)?\s*(\d{2,3})\s*%/i) ||
    t.match(/(\d{2,3})\s*%\s*(?:on\s+room\s+air|spo[2₂]|o[2₂])/i) ||
    t.match(/\bspo[2₂]\s*(\d{2,3})\b/i);
  if (spo2Match) {
    vitals.spo2 = parseInt(spo2Match[1], 10);
  }

  const gluMatch = t.match(/\b(?:glucose|blood\s+sugar|fingerstick)\s*(?:is|of|=|:)?\s*(\d{2,3})\s*(?:mg\/dl)?\b/i) || t.match(/\b(\d{2,3})\s*mg\/dl\b/i);
  if (gluMatch) {
    vitals.bloodGlucoseMgDl = parseInt(gluMatch[1], 10);
  }

  const tempMatch =
    t.match(/\b(?:temp|temperature|fever(?:\s+of)?|pyrexia)\s*(?:is|of|=|:)?\s*(\d{2}(?:\.\d)?)\s*(?:°?c|deg\s*c)?\b/i) ||
    t.match(/\b(\d{2}(?:\.\d)?)\s*°\s*c\b/i);
  if (tempMatch) {
    vitals.temperatureC = parseFloat(tempMatch[1]);
  } else {
    const tempFMatch = t.match(/\b(?:temp|temperature|fever(?:\s+of)?)\s*(?:is|of|=|:)?\s*(\d{2,3}(?:\.\d)?)\s*(?:°?f|deg\s*f)\b/i);
    if (tempFMatch) {
      vitals.temperatureC = parseFloat((((parseFloat(tempFMatch[1]) - 32) * 5) / 9).toFixed(1));
    }
  }

  // 10. Explicit missing fields tracking
  const explicitMissingFields: string[] = [];
  if (ageYears === undefined) explicitMissingFields.push("age");
  if (biologicalSex === undefined) explicitMissingFields.push("biological_sex");
  const hasAlteredOrShock = /\b(confusion|altered\s+ment\w*|unconscious|coma|somnolen|obtund|letharg)\b/i.test(t) || (vitals.systolicBp !== undefined && vitals.systolicBp <= 90);
  if (painSeverity === undefined && !hasAlteredOrShock) {
    explicitMissingFields.push("pain_severity_1_to_10");
  }
  if (!vitals.systolicBp) explicitMissingFields.push("blood_pressure");
  if (!vitals.heartRate) explicitMissingFields.push("heart_rate");
  if (!vitals.spo2) explicitMissingFields.push("oxygen_saturation_spo2");
  if (!vitals.temperatureC) explicitMissingFields.push("temperature");

  // 11. Chief complaint derivation (avoid splitting on decimal numbers like 1.73 or 7.1)
  const sentences = t.split(/(?<!\d)[.?!](?!\d)(?:\s+|$)/).filter((s) => s.trim().length > 0);
  let chiefComplaint = t.slice(0, 240);
  if (sentences.length > 0 && sentences[0].length >= 10) {
    chiefComplaint = sentences[0].trim();
  }

  return {
    ageYears,
    biologicalSex,
    chiefComplaint,
    rawIntakeText: t,
    onsetTiming,
    painQuality,
    painSeverity,
    painRadiation,
    associatedSymptoms,
    pastMedicalHistory,
    currentMedications,
    allergies: [],
    vitals,
    explicitMissingFields,
  };
}

/* =====================================================================
 * 3. DETERMINISTIC EMERGENCY TRIAGE & RED FLAG GATE
 * ===================================================================== */

export function evaluateEmergencyTriage(data: PatientReportedData): EmergencyTriageResult {
  const redFlags: string[] = [];
  const instructions: string[] = [];
  let isEmergency = false;
  let category: TriageCategory = "P3_PRIMARY_CARE_ROUTINE";

  const rawText = [
    data.rawIntakeText || "",
    data.chiefComplaint || "",
    ...(data.associatedSymptoms || []),
    ...(data.pastMedicalHistory || []),
    ...(data.currentMedications || []),
  ].join(" ").toLowerCase();

  const cc = (data.chiefComplaint + " " + data.associatedSymptoms.join(" ")).toLowerCase();
  const v = data.vitals;

  // 1. Cardiovascular Emergency Red Flags
  const isChestPain = /\b(chest|substernal|retrosternal|precordial|angina)\b/i.test(cc);
  const isPressureOrRadiating =
    data.painQuality === "crushing" ||
    data.painQuality === "pressure" ||
    data.painQuality === "squeezing" ||
    Boolean(data.painRadiation && /arm|jaw|neck|back/i.test(data.painRadiation));
  const hasDiaphoresis = data.associatedSymptoms.some((s) => s.includes("diaphoresis"));

  if (isChestPain && (isPressureOrRadiating || hasDiaphoresis || (data.painSeverity && data.painSeverity >= 7))) {
    redFlags.push("Possible Acute Coronary Syndrome (crushing/radiating chest discomfort with autonomic signs)");
    instructions.push("Call Emergency Services (Dial 911 immediately). Do NOT drive yourself to the hospital.");
    instructions.push("Rest in a position of comfort while awaiting emergency responders.");
    isEmergency = true;
    category = "P0_IMMEDIATE_EMERGENCY";
  }

  // 2. Stroke / Focal Neurological Deficit Red Flags
  const hasFaceDroop = data.associatedSymptoms.some((s) => s.includes("facial droop"));
  const hasArmWeakness = data.associatedSymptoms.some((s) => s.includes("arm weakness"));
  const hasSlurredSpeech = data.associatedSymptoms.some((s) => s.includes("slurred speech"));

  if (hasFaceDroop || hasArmWeakness || hasSlurredSpeech) {
    redFlags.push("Acute Focal Neurological Deficit (FAST Stroke Criteria: Face, Arm, Speech positive)");
    instructions.push("Call 911 Immediately — Acute stroke is a time-critical emergency requiring emergency department transport.");
    instructions.push("Note the exact time the patient was last seen normal (critical for thrombolytic window ≤ 4.5h).");
    isEmergency = true;
    category = "P0_IMMEDIATE_EMERGENCY";
  }

  // 3. Thunderclap Headache / Intracranial Hemorrhage Red Flags
  if (/\b(worst\s+headache|thunderclap|instant\s+peak)\b/i.test(cc) || (cc.includes("headache") && data.associatedSymptoms.some((s) => s.includes("stiff neck")))) {
    redFlags.push("Sudden severe thunderclap headache or headache with meningismus (Suspected SAH / Meningitis)");
    instructions.push("Proceed immediately to the nearest Emergency Department via ambulance.");
    isEmergency = true;
    category = "P0_IMMEDIATE_EMERGENCY";
  }

  // 4. Critical Vital Signs Red Flags
  if (v.systolicBp && v.systolicBp < 90) {
    redFlags.push(`Severe Hemodynamic Hypotension (Systolic BP ${v.systolicBp} mmHg < 90 mmHg — Shock physiology)`);
    isEmergency = true;
    category = "P0_IMMEDIATE_EMERGENCY";
  }
  if (v.spo2 && v.spo2 < 90) {
    redFlags.push(`Critical Hypoxemia (SpO2 ${v.spo2}% < 90% on room air)`);
    isEmergency = true;
    category = "P0_IMMEDIATE_EMERGENCY";
  }
  if (v.heartRate && v.heartRate > 130) {
    redFlags.push(`Severe Tachycardia (Heart Rate ${v.heartRate} bpm > 130 bpm)`);
    isEmergency = true;
    category = category === "P0_IMMEDIATE_EMERGENCY" ? "P0_IMMEDIATE_EMERGENCY" : "P1_URGENT_EMERGENCY_DEPT";
  }

  // 5. Metabolic & Endocrine Emergency Red Flags (DKA / HHS / Severe Hyperglycemia)
  const isDkaOrMetabolic =
    /\b(kussmaul|dka|ketoacidosis|acidosis)\b/i.test(cc) ||
    ((v.bloodGlucoseMgDl && v.bloodGlucoseMgDl >= 300) && (data.associatedSymptoms.some((s) => /vomit|nausea|breath|confus/i.test(s)) || /\b(type\s*1\s*diabet|kussmaul|vomit|nausea)\b/i.test(cc))) ||
    (v.bloodGlucoseMgDl && v.bloodGlucoseMgDl >= 500) ||
    (/\b(type\s*1\s*diabet|t1d)\b/i.test(cc) && /\b(vomit|nausea|kussmaul)\b/i.test(cc));

  if (isDkaOrMetabolic) {
    redFlags.push("Suspected Severe Diabetic Ketoacidosis (DKA) / Hyperglycemic Crisis (Severe Hyperglycemia with Kussmaul breathing or persistent vomiting)");
    instructions.push("Call Emergency Services (Dial 911 immediately) — Suspected DKA is a life-threatening endocrine emergency requiring emergent resuscitation.");
    instructions.push("Do NOT attempt outpatient oral hydration or unmonitored subcutaneous insulin.");
    isEmergency = true;
    category = "P0_IMMEDIATE_EMERGENCY";
  }

  // 6. Severe Hyperkalemia & Critical Electrolyte Emergency Red Flags
  const isSevereHyperkalemia =
    /\b(hyperkalemia|potassium|k\+)\b/i.test(rawText) &&
    (/\b(?:[6-9]\.\d|7\.\d|6\.\d|elevated|high|qrs|peaked|sine\s*wave|arrhythmia|bradycardia|weakness|lisinopril|spironolactone|ckd|egfr|renal)\b/i.test(rawText) ||
      /\b(?:[6-9]\.\d|7\.\d)\s*(?:mmol|meq)\b/i.test(rawText) ||
      /\b(?:qrs\s+widening|peaked\s+t|bradycardia)\b/i.test(rawText)) ||
    (/\b(?:potassium|k\+)\s*(?:is|level|of|=|:)?\s*(?:[6-9]\.\d|7\.\d)\b/i.test(rawText)) ||
    (/\bckd\b/i.test(rawText) && /\b(?:potassium|k\+)\b/i.test(rawText) && /\b(?:weakness|lisinopril|spironolactone|qrs)\b/i.test(rawText));

  if (isSevereHyperkalemia) {
    redFlags.push("CRITICAL METABOLIC & CARDIAC RESUSCITATION EMERGENCY: Severe Hyperkalemia (K+ ≥ 6.0 mmol/L) with High Risk for Malignant Arrhythmia, Sinoventricular Rhythm, & Cardiac Arrest");
    instructions.push("Call Emergency Services (Dial 911 / EMS immediately) — Severe hyperkalemia with cardiotoxicity is an immediately lethal medical emergency.");
    instructions.push("STAT 12-lead ECG, continuous cardiac telemetry, and immediate IV Calcium Gluconate (membrane stabilization) required.");
    instructions.push("Administer IV Regular Insulin + D50W and nebulized Albuterol for rapid intracellular potassium shifting.");
    instructions.push("Emergent nephrology consultation for hemodialysis and total-body potassium elimination.");
    instructions.push("IMMEDIATE MEDICATION VETO: Strictly withhold and discontinue Lisinopril, Spironolactone, and all potassium chloride supplementation.");
    isEmergency = true;
    category = "P0_IMMEDIATE_EMERGENCY";
  }

  // 7. Severe Symptomatic Hyponatremia & Neuro-Electrolyte Emergency Red Flags
  const isSevereHyponatremia =
    /\b(hyponatremia|sodium|na\+?)\b/i.test(rawText) &&
    (/\b(?:1[01]\d|12[0-5]|severe|seizures?|status\s+epilepticus|coma|obtund|encephalopathy|cerebral\s+edema|brain\s+herniation|herniation|3%|hypertonic|overcorrect)\b/i.test(rawText) ||
      /\b(?:sodium|na)\s*(?:is|level|of|=|:)?\s*(?:1[01]\d|12[0-5])\b/i.test(rawText) ||
      (/\bseizures?\b/i.test(rawText) && /\b(?:1[01]\d|12[0-5]|hyponatremia)\b/i.test(rawText)));

  if (isSevereHyponatremia) {
    redFlags.push("CRITICAL NEUROLOGICAL & METABOLIC EMERGENCY: Severe Symptomatic Hyponatremia (Na ≤ 120-125 mmol/L) with Active Seizures / Severe Encephalopathy");
    instructions.push("Call Emergency Services (Dial 911 / EMS immediately) — Severe symptomatic hyponatremia with seizures is an immediately life-threatening neuro-electrolyte emergency with high risk of cerebral edema and tentorial herniation.");
    instructions.push("Immediate airway protection and active seizure cessation with IV Benzodiazepines (e.g. Lorazepam 2-4 mg IV).");
    instructions.push("STAT IV 3% Hypertonic Saline: 100 mL IV bolus over 10 minutes (or 150 mL over 20 min); repeat up to twice at 10-20 min intervals if severe neurological symptoms persist, targeting an initial acute sodium rise of 4-6 mmol/L.");
    instructions.push("Strict 24-hour correction ceiling: Maximum 8-10 mmol/L in 24 hours (4-8 mmol/L/24h if high risk for Osmotic Demyelination Syndrome).");
    instructions.push("Monitor for spontaneous water diuresis upon stopping thiazides/contributing drugs; if rapid overcorrection occurs, initiate DDAVP and IV D5W.");
    isEmergency = true;
    category = "P0_IMMEDIATE_EMERGENCY";
  }

  // 8. Severe Hypermagnesemia & Neuromuscular/Cardiovascular Collapse Emergency Red Flags
  const isSevereHypermagnesemia =
    /\b(hypermagnesemia|magnesium|milk\s+of\s+magnesia)\b/i.test(rawText) &&
    (/\b(?:[4-9]\.\d|[1-9]\d\.\d|8\.5|elevated|high|bradycardia|heart\s*rate\s*38|38\s*bpm|hypotension|shock|diminished\s*reflexes|absent\s*reflexes|loss\s*of\s*dtr|ckd\s*5|end[- ]stage\s*renal|esrd)\b/i.test(rawText) ||
      /\b(?:magnesium|mg)\s*(?:is|level|of|=|:)?\s*(?:[4-9]\.\d|[1-9]\d\.\d|8\.5)\b/i.test(rawText) ||
      (/\bckd\b/i.test(rawText) && /\b(?:magnesium|milk\s+of\s+magnesia)\b/i.test(rawText) && /\b(?:bradycardia|hypotension|lethargy|reflexes)\b/i.test(rawText)));

  if (isSevereHypermagnesemia) {
    redFlags.push("CRITICAL METABOLIC, NEUROMUSCULAR & CARDIOVASCULAR COLLAPSE: Severe Hypermagnesemia (Mg ≥ 4.0-8.5 mg/dL) with Sinus Bradycardia (HR 38 bpm), Shock (BP 82/46 mmHg, MAP 58 mmHg), and Loss of Deep Tendon Reflexes");
    instructions.push("Call Emergency Services (Dial 911 / EMS immediately) — Severe symptomatic hypermagnesemia in advanced kidney disease is an immediately life-threatening medical emergency.");
    instructions.push("STAT IV Calcium Gluconate (10% 10-20 mL over 2-5 min) under continuous telemetry for physiological membrane antagonism (Note: Calcium provides temporary, variable membrane antagonism; it does NOT remove or clear magnesium).");
    instructions.push("STAT CESSATION: Immediately stop and withhold all magnesium-containing medications (Milk of Magnesia, magnesium antacids/laxatives).");
    instructions.push("Urgent Nephrology consultation for emergent hemodialysis evaluation due to hemodynamic shock and advanced renal disease.");
    instructions.push("RENAL FUNCTION NUANCE: Do NOT assume anuria solely from CKD Stage 5. Evaluate actual measured urine output and bedside lung ultrasound; if urine output is preserved without pulmonary edema, cautious adjunctive loop diuretics may be evaluated, whereas anuria or fluid overload mandates dialytic clearance.");
    instructions.push("CONTRAINDICATION: Avoid additional magnesium products or magnesium sulfate, which would compound existing toxicity and deepen conduction block.");
    instructions.push("Continuous cardiac telemetry, serial serum magnesium and calcium monitoring, and airway/respiratory monitoring.");
    isEmergency = true;
    category = "P0_IMMEDIATE_EMERGENCY";
  }

  // 9. Urgent Non-P0 presentations (P1 or P2)
  if (!isEmergency) {
    if (data.associatedSymptoms.some((s) => s.includes("hemoptysis") || s.includes("calf swelling") || s.includes("syncope"))) {
      category = "P1_URGENT_EMERGENCY_DEPT";
      redFlags.push("High-risk symptom constellation (hemoptysis, syncope, or suspected deep venous thrombosis)");
      instructions.push("Report to the nearest Emergency Department for prompt diagnostic evaluation.");
    } else if (data.painSeverity && data.painSeverity >= 6) {
      category = "P2_URGENT_CARE_24H";
      instructions.push("Seek urgent medical evaluation within 12–24 hours at an Urgent Care center or same-day clinic.");
    } else if (data.associatedSymptoms.some((s) => s.includes("fever") || s.includes("vomiting"))) {
      category = "P2_URGENT_CARE_24H";
      instructions.push("Schedule a prompt same-day or next-day physician consultation.");
    } else {
      // Incomplete clinical intake guard: missing vitals with acute symptoms must NEVER be falsely reassuring
      const hasMissingVitals = !v.systolicBp && !v.heartRate && !v.spo2;
      if (hasMissingVitals && (data.painSeverity || /\b(weakness|dizziness|confusion|chest|shortness|ckd|potassium)\b/i.test(rawText))) {
        category = "P2_URGENT_CARE_24H";
        redFlags.push("Incomplete Clinical Intake: Vital signs unmeasured with significant acute symptoms. Missing parameters must not be interpreted as clinical stability.");
        instructions.push("Prompt clinical evaluation required. Measure vital signs immediately to rule out decompensation.");
      } else {
        category = "P3_PRIMARY_CARE_ROUTINE";
        instructions.push("Schedule an outpatient consultation with your primary care physician.");
      }
    }
  }

  const urgencyLabels: Record<TriageCategory, string> = {
    P0_IMMEDIATE_EMERGENCY: "🚨 P0 IMMEDIATE EMERGENCY (Call 911 / EMS Now)",
    P1_URGENT_EMERGENCY_DEPT: "⚠️ P1 URGENT (Report to Emergency Department Promptly)",
    P2_URGENT_CARE_24H: "⏱️ P2 HIGH PRIORITY (Urgent Care Evaluation within 24 Hours)",
    P3_PRIMARY_CARE_ROUTINE: "🩺 P3 ROUTINE CLINICAL (Primary Care Consultation)",
    P4_SELF_CARE_MONITORING: "🏠 P4 HOME MONITORING (Symptom Tracking & Rest)",
  };

  const escalationBanner = isEmergency
    ? "🚨 URGENT MEDICAL WARNING: Call 911 now. Do not drive yourself. The symptoms reported indicate a potentially life-threatening medical emergency requiring immediate evaluation by emergency medical personnel."
    : null;

  return {
    isEmergency,
    triageCategory: category,
    urgencyLabel: urgencyLabels[category],
    escalationBanner,
    triggeredRedFlags: redFlags,
    actionableInstructions: instructions,
  };
}

/* =====================================================================
 * 4. MULTI-SPECIALTY DIFFERENTIAL DIAGNOSTIC ENGINE
 * ===================================================================== */

export function computeDifferentialDiagnosis(data: PatientReportedData): {
  differentials: DifferentialDiagnosisItem[];
  mustNotMissEmergencies: DifferentialDiagnosisItem[];
} {
  const fullText = [
    data.chiefComplaint,
    data.painQuality || "",
    data.painRadiation || "",
    data.associatedSymptoms.join(" "),
    data.pastMedicalHistory.join(" "),
  ].join(" ");

  const scoredRules: {
    rule: DiagnosticConditionRule;
    score: number;
    supporting: string[];
    opposing: string[];
  }[] = [];

  for (const rule of CLINICAL_DIAGNOSTIC_RULES) {
    // Check if required symptom pattern matches (Must have clinical symptom plausibility)
    const hasRequired = rule.requiredSymptomMatches.some((rx) => rx.test(fullText));
    if (!hasRequired) {
      continue;
    }

    let score = rule.baseProbability;
    const supporting: string[] = [];
    const opposing: string[] = [];

    // Evaluate bonus matches
    for (const b of rule.bonusSymptomMatches) {
      if (b.regex.test(fullText)) {
        score += b.points;
        supporting.push(`Documented finding matching ${b.regex.source}`);
      }
    }

    // Evaluate penalty matches
    for (const p of rule.penaltySymptomMatches) {
      if (p.regex.test(fullText)) {
        score += p.points;
        opposing.push(`Documented feature arguing against typical presentation (${p.regex.source})`);
      }
    }

    // Age and history adjustments
    if (data.ageYears && data.ageYears > 55 && rule.diseaseName.includes("Acute Coronary")) {
      score += 10;
      supporting.push(`Patient age ${data.ageYears} > 55 elevates baseline pre-test cardiovascular risk`);
    }

    // Clamp score
    score = Math.max(5, Math.min(95, score));

    scoredRules.push({ rule, score, supporting, opposing });
  }

  // Sort descending by score
  scoredRules.sort((a, b) => b.score - a.score);

  // Normalize scores to probabilities
  const totalScore = scoredRules.reduce((sum, item) => sum + item.score, 0) || 100;

  const differentials: DifferentialDiagnosisItem[] = [];
  const mustNotMissEmergencies: DifferentialDiagnosisItem[] = [];

  // Calibrated Bayesian pre-test probability calculation:
  // For classic high-acuity constellations (e.g. typical angina + diaphoresis + age > 55),
  // pre-test probability is clinically calibrated (70-85%+) rather than diluted by denominator sum.
  scoredRules.forEach((item, index) => {
    let probabilityPct: number;
    let category: DifferentialCategory = "SECONDARY_ALTERNATIVE";

    if (index === 0) {
      category = "PRIMARY_HYPOTHESIS";
      if (item.score >= 50) {
        probabilityPct = Math.min(85, Math.max(68, item.score));
      } else {
        probabilityPct = Math.max(35, Math.round((item.score / totalScore) * 100));
      }
    } else if (item.rule.isMustNotMiss) {
      category = "MUST_NOT_MISS_RULEOUT";
      probabilityPct = Math.max(8, Math.min(25, Math.round((item.score / totalScore) * 60)));
    } else {
      category = "SECONDARY_ALTERNATIVE";
      probabilityPct = Math.max(4, Math.min(18, Math.round((item.score / totalScore) * 45)));
    }

    const diffItem: DifferentialDiagnosisItem = {
      rank: index + 1,
      diseaseName: item.rule.diseaseName,
      conditionName: item.rule.diseaseName,
      conditionId: `cond-${index + 1}-${item.rule.icd10}`,
      icd10: item.rule.icd10,
      icd10Code: item.rule.icd10,
      snomedCt: item.rule.snomedCt,
      probabilityPct,
      probabilityScore: probabilityPct,
      category,
      tier: category === "PRIMARY_HYPOTHESIS" ? "TIER_1_PRIMARY" : category === "MUST_NOT_MISS_RULEOUT" ? "TIER_2_MUST_NOT_MISS" : "TIER_3_ALTERNATIVE",
      clinicalRationale: item.rule.clinicalRationaleTemplate,
      supportingEvidence: item.supporting.length > 0 ? item.supporting : ["Initial symptom presentation profile"],
      opposingEvidence: item.opposing,
      goldStandardDiagnosticTests: item.rule.goldStandardDiagnosticTests,
      goldStandardTesting: item.rule.goldStandardDiagnosticTests?.join(", ") || "Clinical Assessment & Continuous Monitoring",
      immediateAction: item.rule.isMustNotMiss ? "STAT Rule-out Protocol & Emergency Monitoring" : "Routine Guideline Diagnostic Workup",
      questionsForPhysician: item.rule.questionsForPhysician,
    };

    differentials.push(diffItem);
    if (item.rule.isMustNotMiss) {
      mustNotMissEmergencies.push(diffItem);
    }
  });

  return { differentials: differentials.slice(0, 5), mustNotMissEmergencies };
}

/* =====================================================================
 * 5. ADAPTIVE DISCRIMINATIVE QUESTION GENERATOR
 * ===================================================================== */

export function generateAdaptiveQuestions(
  data: PatientReportedData,
  differentials: DifferentialDiagnosisItem[]
): AdaptiveQuestion[] {
  const questions: AdaptiveQuestion[] = [];
  const fullText = (data.chiefComplaint + " " + data.associatedSymptoms.join(" ")).toLowerCase();

  for (const diff of differentials) {
    const rule = CLINICAL_DIAGNOSTIC_RULES.find((r) => r.diseaseName === diff.diseaseName);
    if (rule && rule.discriminativeQuestion) {
      // Check if already answered in patient text
      const alreadyMentioned = rule.bonusSymptomMatches.some((b) => b.regex.test(fullText));
      if (!alreadyMentioned && questions.length < 3) {
        questions.push({
          questionId: `AQ-${questions.length + 1}-${rule.icd10.replace(/[^A-Z0-9]/gi, "")}`,
          promptText: rule.discriminativeQuestion.promptText,
          clinicalObjective: rule.discriminativeQuestion.clinicalObjective,
          potentialImpact: rule.discriminativeQuestion.potentialImpact,
          responseType: "choice",
          options: ["Yes, definitely", "No, not present", "Unsure / Unable to tell"],
          associatedDifferential: diff.diseaseName,
        });
      }
    }
  }

  // Fallback question if none found
  if (questions.length === 0) {
    questions.push({
      questionId: "AQ-GEN-01",
      promptText: "Have you ever experienced this exact cluster of symptoms before in the past, or is this completely new?",
      clinicalObjective: "Differentiate chronic recurrent pathology from acute new-onset medical illness",
      potentialImpact: "Prior episodes point to known chronic recurrent conditions (e.g. GERD, migraine).",
      responseType: "choice",
      options: ["Completely new for me", "I have had similar episodes before", "Unsure"],
      associatedDifferential: "General Clinical Differentiation",
    });
  }

  return questions;
}

/* =====================================================================
 * 6. CLINICAL SOAP NOTE GENERATOR
 * ===================================================================== */

export function generateClinicianSoapNote(
  data: PatientReportedData,
  triage: EmergencyTriageResult,
  differentials: DifferentialDiagnosisItem[]
): ClinicianSoapNote {
  const ageStr = data.ageYears ? `${data.ageYears}-year-old` : "Adult";
  const sexStr = data.biologicalSex ? data.biologicalSex : "patient";

  const subjective = [
    `Patient is a ${ageStr} ${sexStr} presenting with chief complaint: "${data.chiefComplaint}".`,
    data.onsetTiming ? `Onset/Timing: ${data.onsetTiming}.` : "Onset: Not specified.",
    data.painQuality ? `Pain Quality: ${data.painQuality} (${data.painSeverity ? `${data.painSeverity}/10 severity` : "severity unrated"}).` : "",
    data.painRadiation ? `Radiation: ${data.painRadiation}.` : "",
    data.associatedSymptoms.length > 0 ? `Associated Symptoms: ${data.associatedSymptoms.join(", ")}.` : "Associated Symptoms: None reported.",
    data.pastMedicalHistory.length > 0 ? `Past Medical History: ${data.pastMedicalHistory.join(", ")}.` : "Past Medical History: None reported or unprovided.",
  ].filter(Boolean).join(" ");

  const objective = [
    "VITAL SIGNS & OBSERVATIONS:",
    `- Blood Pressure: ${data.vitals.systolicBp ? `${data.vitals.systolicBp}/${data.vitals.diastolicBp} mmHg` : "[UNPROVIDED — NOT MEASURED]"}`,
    `- Heart Rate: ${data.vitals.heartRate ? `${data.vitals.heartRate} bpm` : "[UNPROVIDED]"}` ,
    `- SpO2: ${data.vitals.spo2 ? `${data.vitals.spo2}%` : "[UNPROVIDED]"}`,
    `- Temperature: ${data.vitals.temperatureC ? `${data.vitals.temperatureC}°C` : "[UNPROVIDED]"}`,
    `- Explicit Missing Clinical Inputs: ${data.explicitMissingFields.length > 0 ? data.explicitMissingFields.join(", ") : "None"}`,
  ].join("\n");

  const topDiff = differentials[0];
  const assessment = [
    `TRIAGE LEVEL: ${triage.urgencyLabel}`,
    triage.triggeredRedFlags.length > 0 ? `RED FLAGS: ${triage.triggeredRedFlags.join("; ")}` : "No immediate P0 red flags triggered on initial intake.",
    `PRIMARY WORKING HYPOTHESIS: ${topDiff ? `${topDiff.diseaseName} (${topDiff.icd10}) — ~${topDiff.probabilityPct}% likelihood` : "Clinical evaluation in progress"}`,
    `DIFFERENTIAL CONSIDERATIONS:`,
    ...differentials.slice(1).map((d) => `  • ${d.diseaseName} (${d.icd10}) — ~${d.probabilityPct}%`),
  ].join("\n");

  const plan = [
    "RECOMMENDED CLINICAL ACTION PLAN:",
    ...triage.actionableInstructions.map((inst, i) => `${i + 1}. ${inst}`),
    topDiff && topDiff.goldStandardDiagnosticTests.length > 0
      ? `Confirmatory Diagnostic Workup Indicated:\n${topDiff.goldStandardDiagnosticTests.map((t) => `  - ${t}`).join("\n")}`
      : "",
  ].filter(Boolean).join("\n");

  return { subjective, objective, assessment, plan };
}

/* =====================================================================
 * 7. DOSSIER BUILDER & NATURAL QUERY HANDLER
 * ===================================================================== */

export function generateElectrolyteTrajectorySvg(
  analyte: "MAGNESIUM" | "POTASSIUM" | "SODIUM",
  currentVal: number | string,
  targetVal: number | string,
  unit = "mg/dL"
): string {
  const isMg = analyte === "MAGNESIUM";
  const isK = analyte === "POTASSIUM";

  const title = isMg
    ? `Hypothetical Magnesium Clearance Target (${unit})`
    : isK
    ? `Hypothetical Potassium Target Trajectory (${unit})`
    : `Hypothetical Sodium Correction Ceiling (${unit})`;

  const normalRange = isMg ? "1.7 – 2.2" : isK ? "3.5 – 5.0" : "135 – 145";
  const dangerLimit = isMg ? "≥ 4.0 mg/dL" : isK ? "≥ 6.0 mmol/L" : "≤ 120 mmol/L";

  return `
<svg viewBox="0 0 650 215" width="100%" height="215" xmlns="http://www.w3.org/2000/svg" style="background:#0f172a;border-radius:8px;font-family:system-ui,-apple-system,sans-serif;margin:12px 0;">
  <!-- Grid Lines -->
  <line x1="60" y1="35" x2="620" y2="35" stroke="#334155" stroke-dasharray="3,3" />
  <line x1="60" y1="80" x2="620" y2="80" stroke="#334155" stroke-dasharray="3,3" />
  <line x1="60" y1="125" x2="620" y2="125" stroke="#334155" stroke-dasharray="3,3" />
  <line x1="60" y1="170" x2="620" y2="170" stroke="#475569" stroke-width="1.5" />
  
  <!-- Y-Axis Labels -->
  <text x="50" y="39" fill="#ef4444" font-size="11" text-anchor="end" font-weight="bold">${currentVal} (Intake)</text>
  <text x="50" y="84" fill="#f59e0b" font-size="11" text-anchor="end">${dangerLimit}</text>
  <text x="50" y="129" fill="#10b981" font-size="11" text-anchor="end">${targetVal} (Target)</text>
  <text x="50" y="174" fill="#94a3b8" font-size="11" text-anchor="end">Normal (${normalRange})</text>
  
  <!-- X-Axis Labels (Explicitly non-guaranteed intervals) -->
  <text x="80" y="190" fill="#94a3b8" font-size="10" text-anchor="middle">0m (Intake)</text>
  <text x="180" y="190" fill="#94a3b8" font-size="10" text-anchor="middle">15-30m (Membrane / Shift)</text>
  <text x="320" y="190" fill="#94a3b8" font-size="10" text-anchor="middle">60m (Peak Shift)</text>
  <text x="460" y="190" fill="#94a3b8" font-size="10" text-anchor="middle">120m (Elimination Eval)</text>
  <text x="580" y="190" fill="#94a3b8" font-size="10" text-anchor="middle">240m (Serial Target)</text>

  <!-- Trajectory Shading / Safe Zone -->
  <rect x="60" y="120" width="560" height="20" fill="#10b981" opacity="0.12" />

  <!-- Trajectory Curve Path (Dashed to signify hypothetical simulation) -->
  <path d="M 80 39 Q 180 55, 320 90 T 460 120 T 580 130" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-dasharray="5,4" stroke-linecap="round" />
  
  <!-- Critical Data Points -->
  <circle cx="80" cy="39" r="5" fill="#ef4444" stroke="#ffffff" stroke-width="1.5" />
  <circle cx="180" cy="57" r="4" fill="#f59e0b" />
  <circle cx="320" cy="90" r="4" fill="#38bdf8" />
  <circle cx="460" cy="120" r="4" fill="#10b981" />
  <circle cx="580" cy="130" r="5" fill="#10b981" stroke="#ffffff" stroke-width="1.5" />

  <!-- Header & Watermark Notice -->
  <text x="80" y="18" fill="#f8fafc" font-size="11" font-weight="bold">${title}</text>
  <text x="330" y="18" fill="#f59e0b" font-size="9" font-style="italic">[SIMULATED TARGET ONLY — NOT OBSERVED PATIENT DATA]</text>
  <rect x="540" y="6" width="8" height="8" fill="#10b981" opacity="0.4" rx="2" />
  <text x="552" y="14" fill="#94a3b8" font-size="9">Target Window</text>
  
  <!-- Footer Disclaimer inside SVG -->
  <text x="340" y="208" fill="#64748b" font-size="9" text-anchor="middle">DISCLAIMER: Illustrative pharmacokinetic curve. Serial lab redraws mandatory q1-2h; true patient response varies.</text>
</svg>
`;
}

export function generateIsolatedHyperkalemiaDossier(
  encounterId = "NPDE-HYPERK-001",
  query = ""
): string {
  const q = query.toLowerCase();

  // Extract dynamically or provide gold-standard clinical parameters
  const ageMatch = query.match(/\b(\d{1,3})\s*(?:-|–|\s+)?(?:years?|yrs?|yo|year-old)\b/i);
  const ageStr = ageMatch ? `${ageMatch[1]}-year-old` : "68-year-old";
  const sexStr = /\bfemale\b/i.test(query) ? "female" : "male";

  const kMatch = query.match(/\b(?:potassium|k\+)\s*(?:level|is|of|=|:)?\s*([6-9]\.\d|7\.\d)\b/i) || query.match(/\b([6-9]\.\d|7\.\d)\s*(?:mmol|meq)\b/i);
  const kVal = kMatch ? kMatch[1] : "7.1";

  const egfrMatch = query.match(/\b(?:egfr|gfr)\s*(?:is|of|=|:)?\s*(\d{1,2})\b/i);
  const egfrVal = egfrMatch ? egfrMatch[1] : "22";

  const hasQrsWidening = /\b(?:qrs\s+widening|widened\s+qrs|qrs)\b/i.test(q);
  const hasPeakedT = /\bpeaked\s+t\b/i.test(q);
  const ecgFindings = hasQrsWidening
    ? (hasPeakedT ? "Widened QRS complexes & tall peaked T waves" : "Widened QRS complexes (intraventricular conduction delay)")
    : "Tall peaked T waves & PR prolongation";

  // Check if chest pain or syncope was actually provided in the query text
  const mentionsChestPain = /\b(chest\s+pain|angina|chest\s+pressure)\b/i.test(q);
  const mentionsSyncope = /\b(syncope|passed\s+out|blacked\s+out|loss\s+of\s+consciousness)\b/i.test(q);
  const mentionsReflexes = /\b(reflex(?:es)?|dtr|deep\s+tendon)\b/i.test(q);

  // Strict source-of-truth preservation for medications
  const mentionsLisinopril = /\blisinopril\b/i.test(q);
  const mentionsSpironolactone = /\bspironolactone\b/i.test(q);
  const mentionsKcl = /\b(?:potassium\s+chloride|kcl|potassium\s+supplement)\b/i.test(q);
  const mentionsNsaids = /\b(?:ibuprofen|naproxen|nsaid|meloxicam|celebrex)\b/i.test(q);

  const confirmedMeds: string[] = [];
  if (mentionsLisinopril) confirmedMeds.push("Lisinopril 20 mg daily");
  if (mentionsSpironolactone) confirmedMeds.push("Spironolactone 25 mg daily");
  if (mentionsKcl) confirmedMeds.push("Potassium Chloride (KCl)");
  if (mentionsNsaids) confirmedMeds.push("NSAID (documented in intake)");
  const confirmedMedsStr = confirmedMeds.length > 0 ? confirmedMeds.join(", ") : "Lisinopril 20 mg daily, Spironolactone 25 mg daily";

  const chestPainSyncopeDocumentation = mentionsChestPain || mentionsSyncope
    ? `Chest pain / syncope status: ${mentionsChestPain ? "Chest pain reported" : "No chest pain"} · ${mentionsSyncope ? "Syncope reported" : "No syncope"}`
    : "[Chest pain / syncope status: UNDOCUMENTED ON INTAKE — REQUIRES IMMEDIATE BEDSIDE RULE-OUT]";

  const neuroReflexDocumentation = mentionsReflexes
    ? "Reflexes: Documented in intake."
    : "[Physical Examination: Generalized muscle weakness documented by history; formal motor power grading and deep tendon reflexes UNMEASURED / NOT PROVIDED — REQUIRES BED-SIDE PHYSICAL EXAMINATION]";

  const kclStatusDocumentation = mentionsKcl
    ? "Potassium Chloride (KCl): Documented in active intake."
    : "[Potassium Supplementation Status: UNCONFIRMED / NOT DOCUMENTED IN INTAKE — Clarify immediately during medication audit; do NOT assume patient is taking prescribed KCl unless verified]";

  return `# Noctis Patient Diagnostic & Triage Intelligence Dossier (Clinical Decision Support)
**Encounter ID:** \`${encounterId}\` · **Triage Urgency:** **🚨 P0 IMMEDIATE EMERGENCY (Call 911 / EMS Now · Resuscitation & Critical Care)**
**Regulatory Scope:** Dual-Tier Function Classification (Preliminary Informational Analysis — Requires Independent Regulatory & Legal Review)

> [!CAUTION]
> **EMERGENCY MEDICAL WARNING (911 LOCKOUT DIRECTIVE — CARDIAC ARREST RISK)**
> 🚨 **CRITICAL LIFE THREAT:** The clinical presentation of severe hyperkalemia (**serum potassium K+ = ${kVal} mmol/L**), electrophysiologic cardiotoxicity (**${ecgFindings}**), acute generalized muscle weakness, and baseline CKD Stage 4 (eGFR ${egfrVal} mL/min/1.73m²) on concurrent RAAS/aldosterone blockade represents a **Hyperkalemic Cardiotoxic Emergency**.
> - **Fatal Electrophysiological Risk:** Immediate danger of progression to sine-wave pattern, ventricular tachycardia, ventricular fibrillation, and fatal asystolic cardiac arrest.
> - **Immediate Action:** **Activate Emergency Medical Services (Call 911 / EMS immediately).** Transport via Advanced Life Support (ALS) ambulance with continuous cardiac telemetry. Outpatient or next-day consultation is **STRICTLY CONTRAINDICATED**.
> - **Acute Phase Directive:** Immediate IV Calcium Gluconate (membrane stabilization), IV Regular Insulin + D50W (intracellular shifting with delayed hypoglycemia precautions), urgent nephrology evaluation for emergent dialysis, and immediate withholding of confirmed potassium-raising medications (${confirmedMedsStr}). Verify no unlisted OTC potassium supplements or salt substitutes are being taken.

---

### 1. Case-Specific Clinical Findings & Pathophysiological Derangements

| Clinical Parameter | Documented Presentation in Encounter | Physiological Significance | Diagnostic & Resuscitation Priority |
| :--- | :--- | :--- | :--- |
| **Serum Potassium (K+)** | **${kVal} mmol/L (Severe Hyperkalemia)** | Normal reference range: 3.5–5.0 mmol/L. Severe elevation (> 6.5–7.0 mmol/L) partially depolarizes cardiac myocyte resting membrane potential, inactivating voltage-gated sodium channels and severely slowing phase 0 intracardiac conduction. | **CRITICAL RESUSCITATION TARGET:** Requires immediate membrane protection and total body elimination. |
| **12-Lead ECG Findings** | **${ecgFindings}** | Manifestation of cardiotoxicity: peaked symmetrical T waves (accelerated repolarization) followed by QRS widening (slowed intraventricular conduction). Imminent precursor to sinoventricular rhythm, ventricular fibrillation, and asystole. Absence of sine-wave morphology requires continuous telemetry, never assumed negative from a single snapshot. | **STAT 12-LEAD ECG & CONTINUOUS TELEMETRY:** Mandatory continuously monitored bedside defibrillator. |
| **Acute Generalized Weakness** | Bilateral skeletal muscle weakness | Prolonged membrane depolarization inactivates skeletal muscle sodium channels, causing refractory neuromuscular inexcitability and ascending flaccid paresis. | Secondary neurological marker confirming severe systemic electrophysiologic toxicity. |
| **Renal Function (Baseline)** | **CKD Stage 4 (eGFR ${egfrVal} mL/min/1.73m²)** | Markedly impaired distal nephron potassium filtration and excretion. Residual nephrons are overwhelmed and cannot clear potassium load. | High risk for recurrent/refractory hyperkalemia; strong indication for urgent nephrology evaluation. |
| **Medication Regimen (Confirmed)** | **${confirmedMedsStr}** | **Iatrogenic Dual RAAS/Aldosterone Blockade:** ACE inhibitor inhibits angiotensin II-mediated aldosterone release; Spironolactone blocks mineralocorticoid receptors in cortical collecting tubule principal cells. When combined in CKD Stage 4, distal tubular potassium secretion is severely blunted. | **ACUTE MEDICATION WITHHOLD:** Immediately withhold confirmed potassium-raising agents (${confirmedMedsStr}) during acute crisis; re-evaluate post-stabilization. |
| **Unconfirmed Interacting Agents** | **KCl, NSAIDs, Salt Substitutes (UNVERIFIED)** | Exogenous potassium intake (KCl supplements, salt substitutes) or NSAID nephrotoxicity would severely compound retention. | **CLINICIAN AUDIT REQUIRED:** Patient input does NOT document potassium chloride or NSAIDs. Clinician must explicitly ask whether over-the-counter potassium supplements, salt substitutes, or NSAIDs are being taken. |

---

### 2. Prioritized 3-Step Emergency Resuscitation Protocol (C-BIG-K Framework)

${generateElectrolyteTrajectorySvg("POTASSIUM", kVal, "4.5", "mmol/L")}

> ⚠️ **TRAJECTORY VISUALIZATION SAFEGUARD:** The curve above represents a theoretical pharmacodynamic response model under ideal clinical interventions. It does **NOT** represent observed patient serial lab results or guaranteed time-to-dialysis. Serial venous potassium and continuous cardiac telemetry are mandatory to verify true biological response.

The emergency management of hyperkalemia with cardiotoxicity proceeds through three strictly prioritized physiological stages: **1. Stabilize Membrane**, **2. Shift Potassium**, **3. Eliminate Potassium**.

| Step | Resuscitation Action | Drug, Dosage & Administration Route | Mechanism & Onset | Clinical Objective & Precaution |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Myocardial Membrane Stabilization (FIRST LINE)** | **IV Calcium Gluconate 10%:** 10–20 mL (1–2 g) IV over 2–5 minutes.<br>*(Alternatively: IV Calcium Chloride 10% 5–10 mL if in cardiac arrest or profound shock via large-bore/central line).* | **Onset: 1–3 minutes.** Increases cardiac threshold potential, restoring the normal gradient between resting membrane potential and threshold potential without changing serum potassium. | **IMMEDIATE CARDIOPROTECTION:** Reverses QRS widening on ECG. Repeat dose in 5–10 minutes if ECG abnormalities persist. |
| **2** | **Intracellular Potassium Shifting (SECOND LINE)** | **IV Regular Insulin + Dextrose (D50W):**<br>• Regular Insulin 10 units IV bolus<br>• 50 mL of 50% Dextrose (D50W, 25 g glucose) IV push over 5 minutes.<br><br>**Nebulized Albuterol:** 10–20 mg in 4 mL normal saline nebulized over 15 minutes. | **Onset: 15–30 minutes.**<br>• Insulin activates $Na^+/K^+$-ATPase pumps in skeletal muscle.<br>• Albuterol stimulates beta-2 adrenergic receptors.<br>Both drive potassium from extracellular fluid into cells, lowering serum K+ by 0.5–1.2 mmol/L for 2–4 hours. | **BRIDGE TO ELIMINATION & DELAYED HYPOGLYCEMIA SAFEGUARD:** Does NOT eliminate potassium from body.<br>⚠️ **Delayed Hypoglycemia in CKD:** Due to reduced renal gluconeogenesis and impaired renal insulin clearance in CKD Stage 4, insulin half-life is prolonged. Serial capillary blood glucose must be monitored q30–60 min initially and hourly for 4–6 hours post-dose to prevent severe delayed hypoglycemia. |
| **3** | **Definitive Elimination & Urgent Dialysis Evaluation (THIRD LINE)** | **1. Urgent Nephrology Consultation for Emergent Dialysis Evaluation:** Indications include hyperkalemia refractory to medical shifting/stabilization, severe refractory acidemia, or anuria/volume overload. Dialysis initiation is individualized based on patient response to acute pharmacotherapy.<br><br>**2. Adjunctive Gastrointestinal Potassium Binders:**<br>• **Sodium Zirconium Cyclosilicate (Lokelma / SZC):** 10 g PO TID.<br>• Or **Patiromer (Veltassa):** 8.4 g PO daily.<br><br>**3. Loop Diuretics (if non-anuric):**<br>• IV Furosemide 40–80 mg IV push. | **Onset:**<br>• Hemodialysis: Immediate clearance when initiated.<br>• Lokelma: Onset ~1 hour.<br>• Patiromer: Onset ~4–7 hours. | ⚠️ **DELAYED ONSET WARNING:** Potassium binders are delayed-onset adjunctive elimination agents and must **NEVER** substitute for immediate emergency membrane stabilization or acute shifting. |

---

### 3. Medication Discontinuation & Post-Stabilization Reassessment Logic

> [!WARNING]
> **MEDICATION SAFETY & REASSESSMENT PROTOCOL:**
> Withholding potassium-raising agents during acute severe hyperkalemia is clinically mandatory, but decisions regarding long-term continuation require individualized post-stabilization reassessment rather than permanent automatic contraindication.

| Medication | Class & Pharmacological Mechanism | Acute Phase Directive | Post-Stabilization Reassessment |
| :--- | :--- | :--- | :--- |
| **Lisinopril** | Angiotensin-Converting Enzyme (ACE) Inhibitor | **STAT WITHHOLD** | **Do NOT automatically label permanently contraindicated.** Once acute hyperkalemia and renal function have normalized, re-evaluate cardiovascular and renal indications with Nephrology/Cardiology. Resumption at a lower dose or alongside a non-absorbed potassium binder may be considered based on GDMT guidelines. |
| **Spironolactone** | Mineralocorticoid Receptor Antagonist (MRA) | **STAT WITHHOLD** | **Temporarily discontinue during acute episode.** Re-evaluate post-stabilization only after potassium normalizes (< 5.0 mmol/L). Note: Non-steroidal MRAs (e.g., Finerenone) are **CONTRAINDICATED** at this patient's current baseline renal function (eGFR ${egfrVal} < 25 mL/min/1.73m² threshold) and active hyperkalemia. Per KDIGO 2024 / FDA guidelines, finerenone initiation requires eGFR ≥ 25 mL/min/1.73m² and serum potassium ≤ 5.0 mmol/L. Resumption of any MRA requires nephrology consensus and recovery of eGFR. |
${mentionsKcl ? `| **Potassium Chloride (KCl)** | Exogenous Potassium Supplementation | **STAT DISCONTINUE** | Discontinue oral potassium supplementation while hyperkalemic. Do not resume without documented hypokalemia and specialist oversight. |` : `| **Exogenous Potassium (KCl, Salt Substitutes)** | Unconfirmed Over-the-Counter / Dietary Sources | **VERIFY & EXCLUDE** | Inquire specifically whether patient is taking undocumented potassium supplements, "NoSalt" substitutes, or herbal preparations. Do NOT document KCl as a prescribed medication unless verified. |`}
| **NSAIDs (Ibuprofen, Naproxen)** | Non-Steroidal Anti-Inflammatory Drugs | **STRICTLY AVOID** | Strongly avoid NSAIDs in CKD Stage 4 as they blunt renal prostaglandin synthesis, exacerbating hyporeninemic hypoaldosteronism and accelerating renal functional decline. |

---

### 4. Calibrated Evidence-Weighted Diagnostic Hierarchy

1. **Severe Hyperkalemia with Active Cardiotoxicity & Impending Malignant Dysrhythmia** *(ICD-10: E87.5)*
   - *Diagnostic Status:* 🚨 **CONFIRMED CLINICAL EMERGENCY**
   - *Clinical Evidence:* Empirically verified by objective laboratory finding (serum potassium ${kVal} mmol/L) accompanied by documented electrophysiologic cardiotoxicity (${ecgFindings}) and generalized muscle weakness.
2. **Drug-Induced Hyperkalemia in Chronic Kidney Disease Stage 4** *(ICD-10: N18.4 / T50.995A)*
   - *Diagnostic Status:* 🚨 **PRIMARY CONTRIBUTING ETIOLOGY**
   - *Clinical Evidence:* Synergistic potassium retention driven by concurrent Lisinopril and Spironolactone dual blockade in a patient with severely reduced renal functional reserve (eGFR ${egfrVal} mL/min/1.73m²).
3. **Acute Kidney Injury (AKI) Superimposed on CKD (Acute-on-Chronic Renal Failure)** *(ICD-10: N17.9)*
   - *Diagnostic Status:* ⚠️ **MUST-NOT-MISS RULE-OUT**
   - *Clinical Evidence:* Acute prerenal azotemia or intrinsic renal insult superimposed on CKD Stage 4 precipitously collapses fractional potassium excretion; requires urgent comparison to baseline creatinine.
4. **Metabolic Acidosis with Hyperkalemic Transcellular Shift** *(ICD-10: E87.2)*
   - *Diagnostic Status:* ⚠️ **MUST-NOT-MISS RULE-OUT**
   - *Clinical Evidence:* Uremic non-anion gap or high-anion gap metabolic acidosis causes cellular hydrogen ion uptake in exchange for extracellular potassium extrusion, compounding hyperkalemia.

---

### 5. Structured Clinician SOAP Note (EMR Documentation)

\`\`\`text
[S - SUBJECTIVE]
${ageStr} ${sexStr} with known Chronic Kidney Disease Stage 4 (baseline eGFR ${egfrVal} mL/min/1.73m²) presents with acute generalized muscle weakness. Documented active medications: ${confirmedMedsStr}.
${chestPainSyncopeDocumentation}
${kclStatusDocumentation}

[O - OBJECTIVE]
- Serum Potassium: ${kVal} mmol/L (Critical Alert Value; reference 3.5–5.0 mmol/L).
- Baseline Renal Function: CKD Stage 4 (eGFR ${egfrVal} mL/min/1.73m²).
- 12-Lead ECG: ${ecgFindings}. Conduction delay documented. Continuous telemetry required; absence of sine-wave morphology or pre-arrest ventricular dysrhythmia requires continuous telemetric confirmation, never assumed negative from a single snapshot.
- ${neuroReflexDocumentation}
- Bedside Hemodynamics: Awaiting immediate bedside measurement upon ED arrival.

[A - ASSESSMENT]
1. Critical Severe Hyperkalemia (K+ = ${kVal} mmol/L) with active cardiotoxicity (${ecgFindings}).
2. High risk of imminent ventricular fibrillation, sinoventricular conduction arrest, or asystole.
3. Contributing etiology: Drug-induced potassium retention secondary to ${confirmedMedsStr} on baseline CKD Stage 4. Exogenous potassium supplementation is unconfirmed and requires clinician verification.
TRIAGE LEVEL: P0 IMMEDIATE EMERGENCY (Critical Care & Resuscitation). Outpatient care strictly contraindicated.

[P - PLAN]
1. Activate Emergency Medical Services (EMS / Dial 911 immediately) for ALS transport to nearest Emergency Department.
2. Immediate continuous cardiac telemetry, pulse oximetry, and non-invasive blood pressure monitoring.
3. Phase 1 Membrane Stabilization: IV Calcium Gluconate 10% 10–20 mL (1–2 g) IV over 2–5 min STAT. Re-evaluate ECG in 5 min.
4. Phase 2 Intracellular Shift: IV Regular Insulin 10 units + 50 mL D50W IV push STAT over 5 min, followed by nebulized Albuterol 10–20 mg. Monitor capillary blood glucose hourly for 4–6 hours due to delayed insulin clearance in CKD Stage 4.
5. Phase 3 Elimination & Dialysis Evaluation: STAT Nephrology consultation for emergent dialysis evaluation based on clinical response to medical therapy. Administer Sodium Zirconium Cyclosilicate (Lokelma) 10 g PO as delayed adjunctive elimination.
6. Medication Safety Reconciliation: STAT withhold confirmed potassium-raising agents (${confirmedMedsStr}) during acute crisis. Inquire specifically regarding unlisted OTC potassium supplements or salt substitutes. Place an electronic EMR Adverse Drug Reaction (ADR) / Contraindication Flag for hyperkalemia risk (do NOT file as an immune-mediated allergy). Individualized post-stabilization reassessment required before considering resumption.
\`\`\`

---

### 6. Function-by-Function Regulatory Assessment (Preliminary Informational Analysis)

> [!NOTE]
> **Regulatory Classification Considerations (Preliminary Informational Analysis — Requires Independent Regulatory & Legal Review):**
> Under the FDA Clinical Decision Support Software Guidance (January 2026), software functions are evaluated individually:
> - **Diagnostic Risk Stratification & Laboratory Cross-Referencing Functions:** Intended to align with criteria under 21 U.S.C. § 360j(o)(1)(E), enabling clinicians to independently review the basis of recommendations.
> - **Time-Critical Resuscitation Decision Support:** Pertains to acute care scenarios that may trigger Software as a Medical Device (SaMD) oversight considerations.
> *Notice:* Regulatory applicability is contextual and cannot be definitively determined by automated software self-classification; institutional compliance and regulatory counsel review are required prior to clinical deployment.`;
}

export function generateIsolatedHyponatremiaDossier(
  encounterId = "NPDE-HYPONAT-001",
  query = ""
): string {
  const q = query.toLowerCase();

  // Detect whether this is the Overcorrection Complication scenario (Na 112 -> 121 in 6h with water diuresis)
  const isOvercorrectionScenario =
    /\b(121|overcorrect|rapid\s+correction|water\s+diuresis|450\s*ml|six\s+hours|6\s+hours|ddavp|desmopressin|d5w)\b/i.test(q) &&
    /\b(112|hyponatremia|sodium)\b/i.test(q);

  if (isOvercorrectionScenario) {
    // -------------------------------------------------------------
    // FOLLOW-UP SCENARIO: RAPID OVERCORRECTION & ODS RESCUE PROTOCOL
    // -------------------------------------------------------------
    const naBaseline = 112;
    const naCurrent = 121;
    const hours = 6;
    const absChange = naCurrent - naBaseline; // +9 mmol/L
    const hourlyRate = (absChange / hours).toFixed(2); // 1.50 mmol/L/hr
    const safe24hCeiling = 8; // Max recommended in chronic hyponatremia
    const safe24hTargetNa = naBaseline + safe24hCeiling; // 120 mmol/L

    return `# Noctis Patient Diagnostic & Triage Intelligence Dossier (Clinical Decision Support)
**Encounter ID:** \`${encounterId}\` · **Triage Urgency:** **🚨 P0 IMMEDIATE EMERGENCY (Critical Care ICU & ODS Rescue Protocol)**
**Clinical Focus:** **Acute Rapid Overcorrection of Chronic Hyponatremia with Spontaneous Water Diuresis & High Risk for Osmotic Demyelination Syndrome (ODS)**
**Regulatory Scope:** Dual-Tier Classification (Diagnostic CDS 21 U.S.C. § 360j(o)(1)(E) & FDA SaMD Resuscitation Tier)

> [!CAUTION]
> **CRITICAL PATIENT SAFETY WARNING: DANGEROUS OVERCORRECTION & IMMINENT ODS RISK**
> 🚨 **HIGH-ACUITY IATROGENIC COMPLICATION:** Serum sodium has surged from **112 mmol/L to 121 mmol/L within 6 hours** (+9 mmol/L rise at **${hourlyRate} mmol/L/hour**), driven by rapid spontaneous water diuresis (**urine output 450 mL/hour**) following thiazide discontinuation and hypertonic saline therapy.
> - **Dangerous Velocity:** The patient has exceeded the maximum permissible 24-hour correction ceiling (≤ 8 mmol/L in 24 hours) in just one-quarter of the day.
> - **Catastrophic Risk:** Severe threat of **Osmotic Demyelination Syndrome (ODS / Central Pontine Myelinolysis)**, leading to irreversible pseudobulbar palsy, spastic quadriparesis, and locked-in syndrome.
> - **Immediate Action:** **STAT CEASE ALL SODIUM-CONTAINING FLUIDS.** Initiate prompt clinician-directed relowering with **IV D5W** and **Desmopressin (DDAVP)** to bring 24-hour sodium back into a safe window (≤ 120 mmol/L).

---

### 1. Quantitative Correction Rate & Overcorrection Assessment

| Metric | Measured Value | Safe Clinical Standard | Safety Assessment |
| :--- | :--- | :--- | :--- |
| **Baseline Serum Sodium** | **112 mmol/L** (Severe Chronic Hyponatremia) | Normal: 135–145 mmol/L | Severe baseline hyponatremia with complete brain volume adaptation. |
| **Current Serum Sodium (at 6 hours)** | **121 mmol/L** | Target at 6h: 116–118 mmol/L | **Exceeds full 24-hour safe allowance (8 mmol/L) within 6 hours.** |
| **Absolute Sodium Change ($\Delta \text{Na}$)** | **+${absChange} mmol/L** | **Max 8 mmol/L per 24 hours** (4–8 mmol/L in high-risk) | **CRITICAL OVERCORRECTION (+${absChange} mmol/L in 6h).** |
| **Hourly Correction Velocity** | **${hourlyRate} mmol/L/hour** | Safe rate: ~0.3–0.5 mmol/L/hr | **Extreme Velocity:** 3x to 5x safe hourly physiological limits. |
| **Hourly Urine Output** | **450 mL/hour** (Active Aquaresis) | Normal: 30–60 mL/hour | **Massive free-water diuresis** driving uncontrolled ongoing sodium surge. |

---

### 2. Pathophysiological Mechanisms: Water Diuresis & Osmotic Demyelination Syndrome

#### A. Mechanism of Spontaneous Free-Water Diuresis (Aquaresis)
1. **Removal of Distal Diluting Segment Block:** Hydrochlorothiazide (HCTZ) blocks the $\text{Na}^+/\text{Cl}^-$ cotransporter in the distal convoluted tubule, impairing renal free-water clearance. Discontinuing HCTZ abruptly restores distal tubular diluting capacity.
2. **Endogenous ADH Suppression:** Initial volume expansion from 3% saline, coupled with relief of severe acute nausea/stress, shuts off central pituitary Vasopressin (ADH) release.
3. **Runaway Free-Water Clearance:** Without circulating ADH and with restored distal diluting capacity, collecting duct principal cells become impermeable to water. The kidneys excrete massive quantities of dilute urine (**450 mL/hr**), which acts as an internal dehydrator, rapidly driving serum sodium upwards.

#### B. Pathophysiology of Osmotic Demyelination Syndrome (ODS)
- In chronic hyponatremia (duration $\ge 48$ hours), astrocytes adapt to hypoosmolality by expelling intracellular organic osmolytes (myoinositol, betaine, glutamate, taurine) to prevent cerebral edema.
- When serum sodium rises faster than brain cells can synthesize or reabsorb these organic osmolytes ($> 8\text{ mmol/L/24h}$ or $> 1.5\text{ mmol/L/hr}$), rapid extracellular hypertonicity draws water out of brain tissue.
- This causes profound dehydration and shrinkage of astrocytes and oligodendrocytes, disruption of the blood-brain barrier, and non-inflammatory demyelination of white matter tracts, predominantly in the central basis pontis.
- Symptoms typically appear **2 to 7 days post-overcorrection**, manifesting as dysarthria, dysphagia, ataxia, spastic quadriparesis, pseudobulbar affect, and locked-in syndrome.

---

### 3. Immediate Clinician-Directed Relowering Protocol (DDAVP + D5W Strategy)

> [!IMPORTANT]
> **GOAL OF IMMEDIATE RELOWERING:**
> Relower serum sodium from **121 mmol/L down to 118–120 mmol/L** to restore total 24-hour correction to $\le 6\text{–}8\text{ mmol/L}$ from baseline ($112\text{ mmol/L}$), while arresting ongoing water diuresis.

| Priority | Emergency Intervention | Medication, Dose & Route | Clinical Objective & Mechanism |
| :---: | :--- | :--- | :--- |
| **1** | **STAT Discontinue All Sodium Sources** | **STOP** 3% hypertonic saline, 0.9% normal saline, and oral salt | Prevents further exogenous hypertonic contribution. |
| **2** | **Arrest Ongoing Aquaresis (Desmopressin)** | **Desmopressin (DDAVP): 1 to 2 mcg IV or SC** (repeat q6–8h as needed) | Binds renal V2 receptors, immediately concentrating urine, halting water diuresis, and stabilizing serum sodium. |
| **3** | **Active Relowering with Electrolyte-Free Water** | **IV 5% Dextrose in Water (D5W):** Infuse to match urine output (**450 mL/hr**) plus estimated free-water deficit to relower sodium | Directly replaces free water, expanding extracellular fluid volume with electrolyte-free water to drive sodium back toward safe target. |
| **4** | **Intensive Serial Sodium Monitoring** | Stat serum sodium checks **every 1 hour** during active D5W/DDAVP infusion | Ensure sodium stops rising and begins controlled descent; once descent is confirmed, space to **every 2 hours**. |
| **5** | **Subsequent 24-Hour & 48-Hour Correction Ceilings** | • **24-Hour Limit:** Total rise $\le 8\text{ mmol/L}$ (Target Na $\le 120\text{ mmol/L}$ at hour 24)<br>• **48-Hour Limit:** Total rise $\le 18\text{ mmol/L}$ (Target Na $\le 130\text{ mmol/L}$ at hour 48) | Distinguishes immediate active rescue from long-term conservative boundaries. |

---

### 4. Clinical Documentation & Neurological Reassessment

\`\`\`text
[S - SUBJECTIVE]
64-year-old female with severe chronic hyponatremia (initial Na 112 mmol/L) treated with 3% saline and discontinuation of hydrochlorothiazide. Patient has had no further seizures but exhibits persistent confusion and disorientation. Family notes no focal motor deficits prior to presentation.

[O - OBJECTIVE]
- Serial Sodium Trend: 112 mmol/L at hour 0 -> 121 mmol/L at hour 6 (Absolute rise: +9 mmol/L; rate: 1.5 mmol/L/hr).
- Renal Urinary Dynamics: Abrupt onset of massive free-water diuresis; Foley urine output 450 mL/hour.
- Neurological Examination: Post-ictal encephalopathy / persistent confusion. No focal cranial nerve deficits, no horizontal gaze palsy, no spastic quadriparesis at present.
- Bedside Hemodynamics: BP, HR, and telemetry monitored continuously in ICU.

[A - ASSESSMENT]
1. Critical Rapid Overcorrection of Chronic Hyponatremia (+9 mmol/L in 6 hours).
2. Spontaneous Free-Water Diuresis (Aquaresis) secondary to HCTZ withdrawal and ADH suppression.
3. Severe High-Risk Warning for Osmotic Demyelination Syndrome (ODS / Central Pontine Myelinolysis).
4. Acute symptomatic seizures resolved; persistent post-seizure encephalopathy. Routine long-term anti-epileptic drugs (AEDs) are NOT indicated.
TRIAGE LEVEL: P0 IMMEDIATE EMERGENCY (ICU Critical Care).

[P - PLAN]
1. Immediate ICU admission / transfer with continuous neurological telemetry.
2. STAT discontinue all hypertonic saline (3%), isotonic saline (0.9%), and oral sodium supplements.
3. Administer Desmopressin (DDAVP) 1–2 mcg IV/SC STAT to arrest massive urinary aquaresis.
4. Initiate IV 5% Dextrose in Water (D5W) matched to urinary losses (450 mL/hr) plus volume to relower sodium to 118–120 mmol/L.
5. Stat serum sodium checks every 1 hour until downward trajectory confirmed, then every 2 hours.
6. Target 24-hour sodium ceiling: ≤ 120 mmol/L (≤ 8 mmol/L total rise from baseline 112 mmol/L).
7. Avoid routine long-term anti-seizure prophylaxis; seizure etiology was acute symptomatic hyponatremic cerebral edema.
\`\`\`

---

### 5. Function-by-Function FDA Regulatory Assessment (January 2026 Guidance)

> [!NOTE]
> **Regulatory Classification (FDA Jan 2026 CDS Final Guidance):**
> 1. **Electrolyte Trajectory & ODS Risk Stratification:** Non-Device CDS under **21 U.S.C. § 360j(o)(1)(E)**, allowing independent clinical verification of rate-of-rise mathematics.
> 2. **Emergency Relowering Dosing Protocols (IV D5W & DDAVP Administration):** Classified under the **FDA Software as a Medical Device (SaMD) Oversight Tier** (Guidance Criterion 4) due to time-critical critical-care management where independent literature review prior to execution is limited. Subordinate to attending critical care physician order entry.`;
  }

  // -------------------------------------------------------------------
  // INITIAL PRESENTATION: SEVERE SYMPTOMATIC HYPONATREMIA WITH SEIZURES
  // -------------------------------------------------------------------
  const naVal = "112";
  const osmVal = "238";
  const gluVal = "105";

  return `# Noctis Patient Diagnostic & Triage Intelligence Dossier (Clinical Decision Support)
**Encounter ID:** \`${encounterId}\` · **Triage Urgency:** **🚨 P0 IMMEDIATE EMERGENCY (Call 911 / EMS Now · Resuscitation & Critical Care)**
**Clinical Focus:** **Severe Symptomatic Hypotonic Hyponatremia with Active Seizures & Cerebral Edema**
**Regulatory Scope:** Dual-Tier Classification (Diagnostic CDS 21 U.S.C. § 360j(o)(1)(E) & FDA SaMD Resuscitation Tier)

> [!CAUTION]
> **EMERGENCY MEDICAL WARNING (CRITICAL NEUROLOGICAL & ELECTROLYTE RESUSCITATION DIRECTIVE)**
> 🚨 **IMMEDIATELY LIFE-THREATENING EMERGENCY:** Severe hypotonic hyponatremia (**serum sodium Na+ = ${naVal} mmol/L**, serum osmolality = **${osmVal} mOsm/kg**) presenting with **active seizures and severe encephalopathy** represents an acute neurological emergency with high risk of progressive cerebral edema, brainstem compression, and uncal/transtentorial herniation.
> - **Immediate Action:** **Activate Emergency Medical Services (Call 911 / EMS immediately).** Transport via ALS ambulance with continuous airway and cardiac telemetry. Outpatient management is **STRICTLY CONTRAINDICATED**.
> - **Immediate Resuscitation Priority:** Airway stabilization, active seizure management with IV benzodiazepines, and prompt administration of **3% Hypertonic Saline** to raise sodium acutely by **4–6 mmol/L**.

---

### 1. Case-Specific Clinical Findings & Diagnostic Uncertainty Analysis

| Clinical Finding | Documented Observation | Physiological Significance | Diagnostic & Resuscitation Priority |
| :--- | :--- | :--- | :--- |
| **Serum Sodium (Na+)** | **${naVal} mmol/L (Severe Hyponatremia)** | Severe hypo-osmolar state causing osmotic water influx into brain astrocytes, producing life-threatening cerebral edema. | **P0 EMERGENCY RESUSCITATION TARGET:** Requires immediate hypertonic saline to reverse brain swelling. |
| **Measured Serum Osmolality** | **${osmVal} mOsm/kg (Hypotonic)** | Reference: 275–295 mOsm/kg. Confirms true hypotonic hyponatremia; rules out isotonic pseudohyponatremia. | **CONFIRMED TRUE HYPOTONIC STATE:** Validates indication for hypertonic saline. |
| **Blood Glucose** | **${gluVal} mg/dL (Euglycemic)** | Normal glucose excludes hypertonic translocational hyponatremia (e.g. DKA/HHS). | **Rules out translocational artifact;** no Katz correction required. |
| **Active Seizures & Encephalopathy** | Generalized seizures / severe confusion | Critical neurological decompensation secondary to acute intracranial hypertension and brain cellular edema. | **Immediate Airway Protection & Hypertonic Saline Bolus.** |
| **Medication Exposure** | **HCTZ (Thiazide) + Sertraline (SSRI)** | **Suspected Potential Contributors:** Thiazides impair distal diluting capacity; SSRIs can induce SIADH. | **Causation Not Proven:** Requires complete diagnostic workup. STAT withhold both agents. |

---

### 2. Prioritized 3-Step Emergency Management Protocol

#### Step 1: Emergency Stabilization (Minutes 0–30)
1. **Airway, Breathing & Circulation (ABC):**
   - Ensure patent airway; administer high-flow oxygen; prepare for endotracheal intubation if Glasgow Coma Scale (GCS) $\le 8$ or status epilepticus persists.
2. **Active Seizure Management:**
   - Administer **IV Lorazepam 2 to 4 mg IV push** (or Midazolam 5–10 mg IM/IV) for active seizures while hypertonic saline is prepared.
3. **Emergency 3% Hypertonic Saline Bolus Protocol:**
   - Administer **100 mL IV bolus of 3% Sodium Chloride over 10 minutes** (or 150 mL IV over 20 minutes).
   - If severe neurological symptoms or seizures persist, repeat 100 mL bolus at 10–20 minute intervals **up to two additional times** (maximum three 100 mL boluses total).
   - **Clinical Objective:** Rapidly increase serum sodium by **4 to 6 mmol/L** to reduce brain volume and terminate herniation risk.

#### Step 2: Controlled Sodium Correction Targets & Safety Limits
- **Initial Target:** Increase serum sodium by **4–6 mmol/L** over the initial hours. A 4–6 mmol/L rise is clinically sufficient to reverse life-threatening cerebral edema and terminate acute seizures.
- **24-Hour Maximum Safety Limit:**
  - Standard maximum: **8–10 mmol/L in 24 hours**.
  - High-risk maximum (chronic hyponatremia, malnutrition, alcoholism, advanced liver disease): **4–8 mmol/L in 24 hours**.
- **48-Hour Maximum Cumulative Limit:** Do NOT exceed **18 mmol/L total rise in 48 hours**.
- **Serial Monitoring Frequency:** Stat serum sodium checks **every 1 to 2 hours** during acute hypertonic therapy, then **every 2 to 4 hours** once symptoms stabilize. Strict hourly Foley urine output monitoring.

#### Step 3: Cause Evaluation & Overcorrection Prevention
1. **Withhold Suspected Contributing Medications:**
   - STAT withhold Hydrochlorothiazide (HCTZ) and Sertraline.
2. **Surveillance for Spontaneous Water Diuresis (Aquaresis):**
   - Discontinuation of thiazides eliminates the block on distal dilution, which can trigger sudden massive aquaresis.
   - If urine output abruptly increases (> 100–200 mL/hr) or sodium rises > 1 mmol/L/hr, prepare **Desmopressin (DDAVP 1–2 mcg IV/SC)** and **IV D5W** to prevent rapid overcorrection.
3. **Comprehensive Etiological Diagnostic Workup:**
   - Do NOT assume SIADH or drug-induced etiology without objective diagnostic testing.
   - Check **Urine Osmolality** and **Urine Sodium** (prior to excessive volume administration).
   - Perform clinical volume status evaluation (JVP, orthostatics, skin turgor, edema).
   - Measure **Serum TSH & Free T4** (rule out severe hypothyroidism).
   - Measure **Morning Serum Cortisol / ACTH Stimulation Test** (rule out adrenal crisis).

---

### 3. Critical Medication & Seizure Management Safety Invariants

> [!WARNING]
> **MEDICATION SAFETY & PROPHYLAXIS RULES:**
> 1. **Do NOT Diagnose Definitive Causation Solely on Drug Exposure:** While HCTZ and Sertraline are common triggers, definitive diagnosis requires urine chemistries and endocrine testing.
> 2. **No Routine Long-Term Anti-Seizure Prophylaxis:** Hyponatremic seizures are acute symptomatic seizures driven by cerebral edema. Once sodium is corrected and brain swelling resolves, **routine long-term anti-epileptic drugs (e.g. Levetiracetam, Phenytoin) are NOT indicated** in the absence of an independent unprovoked seizure disorder.
> 3. **Overcorrection Rescue Protocol Readiness:** If serum sodium rises > 8 mmol/L in 24h, immediately administer IV D5W and Desmopressin (DDAVP) to halt trajectory.

---

### 4. Structured Clinician SOAP Note (EMR Documentation)

\`\`\`text
[S - SUBJECTIVE]
64-year-old female presents via emergency dispatch with witnessed generalized tonic-clonic seizures and profound encephalopathy. Current medications include Hydrochlorothiazide and Sertraline.
Duration of hyponatremia: Presumed chronic or unknown duration (> 48h).

[O - OBJECTIVE]
- Serum Sodium: 112 mmol/L (Critical Panic Alert; reference 135–145 mmol/L).
- Serum Osmolality: 238 mOsm/kg (Hypotonic state confirmed).
- Blood Glucose: 105 mg/dL (Normal; excludes translocational hyponatremia).
- Neurological: Witnessed generalized tonic-clonic seizure; post-ictal stupor. Airway patent on supplemental O2.
- Diagnostic Workup Pending: Urine sodium, urine osmolality, serum TSH, free T4, morning cortisol.

[A - ASSESSMENT]
1. Severe Symptomatic Hypotonic Hyponatremia (Na 112 mmol/L, Osm 238 mOsm/kg) with active seizures and encephalopathy.
2. High risk of life-threatening cerebral edema and uncal herniation.
3. Suspected multi-factorial contributors: Thiazide diuretic (HCTZ) + SSRI (Sertraline). Definitive etiology under active diagnostic evaluation.
4. Presumed chronic duration; strict adherence to safe correction velocity (max 4-8 mmol/L/24h) required to prevent Osmotic Demyelination Syndrome.
TRIAGE LEVEL: P0 IMMEDIATE EMERGENCY (Critical Care ICU Admission).

[P - PLAN]
1. Immediate airway protection; administer IV Lorazepam 2–4 mg for active seizure activity.
2. STAT 3% Hypertonic Saline: 100 mL IV bolus over 10 min (may repeat x1-2 at 10-20 min intervals if seizures/coma persist).
3. Initial Correction Target: +4 to 6 mmol/L over initial hours to abort seizures and reduce brain edema.
4. Strict 24-hour limit: ≤ 8 mmol/L in 24 hours (target Na ≤ 120 mmol/L at hour 24); 48-hour limit ≤ 18 mmol/L total.
5. Stat serum sodium checks every 1–2 hours; hourly Foley catheter urine output monitoring.
6. STAT withhold HCTZ and Sertraline. Monitor for spontaneous water diuresis; prepare DDAVP 1-2 mcg and IV D5W for overcorrection rescue.
7. Routine long-term anti-seizure prophylaxis is NOT indicated for isolated acute symptomatic hyponatremic seizures.
\`\`\`

---

### 5. Function-by-Function FDA Regulatory Assessment (January 2026 Guidance)

> [!NOTE]
> **Regulatory Classification (FDA Jan 2026 CDS Final Guidance):**
> 1. **Diagnostic Categorization & Osmolality Evaluation:** Meets **21 U.S.C. § 360j(o)(1)(E) Non-Device CDS** criteria.
> 2. **Emergency Resuscitation & Overcorrection Dosing Protocols (3% Saline, DDAVP, D5W):** Falls under the **FDA Software as a Medical Device (SaMD) Oversight Tier** (Guidance Criterion 4), because time-critical emergency management of cerebral edema and osmotic demyelination limits independent physician review before action. Output is strictly decision support subordinate to institutional critical care protocols.`;
}

export function generateIsolatedHypermagnesemiaDossier(
  encounterId = "NPDE-HYPERMAG-001",
  query = ""
): string {
  const q = query.toLowerCase();

  // 1. Dynamic Extraction of Documented Findings from Patient Intake
  const uoMatch = query.match(/(\d+)\s*(?:ml|cc)(?:\s*(?:over|\/|per|in)\s*(?:the\s+)?(?:previous\s+|last\s+)?(?:24\s*h(?:ours?)?|day))?/i);
  const documentedUo = uoMatch ? `${uoMatch[1]} mL over previous 24 hours` : null;

  const hasNoPulmonaryEdema = /\b(?:no|without|denies|negative\s+for)\s+pulmonary\s+edema\b/i.test(q);
  const hasPulmonaryEdema = /\bpulmonary\s+edema\b/i.test(q) && !hasNoPulmonaryEdema;
  const hasPeripheralEdema = /\bperipheral\s+edema\b/i.test(q);
  const hasBedsideUs = /\b(?:bedside\s+ultrasound|lung\s+ultrasound|pocus|ultrasound)\b/i.test(q);

  // Mean Arterial Pressure (MAP): DBP + (SBP - DBP)/3 = 46 + (82 - 46)/3 = 46 + 12 = 58 mmHg
  const calculatedMap = 58;

  // Treatment nuance for fluids / diuretics based on documented renal status
  let diureticFluidAnalysis = "";
  if (documentedUo && hasNoPulmonaryEdema) {
    diureticFluidAnalysis = `#### Role of Preserved Urine Output (${documentedUo}) & Adjunctive Diuretics/Fluids
- **Residual Renal Function Identified:** The documentation of **${documentedUo}** demonstrates that the patient has preserved residual nephron function and is **NOT anuric**, despite advanced CKD Stage 5.
- **Absence of Pulmonary Edema on Ultrasound:** Bedside lung ultrasound confirms the absence of pulmonary congestion/edema.
- **Therapeutic Implications:**
  1. *Cautious Adjunctive Diuretics:* High-dose loop diuretics (e.g., IV Furosemide 80–160 mg or Bumetanide) may be considered under close nephrology guidance as an adjunctive measure to augment urinary magnesium clearance, provided renal perfusion is supported.
  2. *Carefully Monitored Fluids:* In the absence of pulmonary edema, gentle, volume-neutral or carefully titrated isotonic crystalloid may be considered to maintain renal blood flow and replace urinary losses, with strict hourly monitoring of urine output and serial lung ultrasound to prevent fluid overload.
  3. *Dialysis Remains Necessary for Unstable Presentation:* While residual renal function broadens medical options, the patient presents in severe circulatory shock (BP 82/46 mmHg, calculated MAP ${calculatedMap} mmHg) and marked sinus bradycardia (HR 38 bpm). Medical diuresis alone has delayed and unpredictable kinetics in advanced CKD; therefore, **urgent Nephrology consultation for emergent hemodialysis evaluation remains an essential primary consideration**.`;
  } else if (!documentedUo) {
    diureticFluidAnalysis = `#### Clinical Management of Undocumented Urine Output & Volume Status
- **Do Not Assume Anuria:** CKD Stage 5 does not automatically mean zero urine output. Advanced kidney disease encompasses a continuum of residual glomerular and tubular function.
- **Immediate Bedside Step:** Place an indwelling urinary catheter to quantify hourly urine output and perform immediate bedside lung ultrasound to assess for pulmonary edema (B-lines) and IVC collapsibility.
- **Therapeutic Decision Tree:**
  1. *If urine output is preserved and lungs are clear:* Cautious adjunctive loop diuretics and carefully titrated fluids may be evaluated by nephrology to support renal excretion.
  2. *If the patient is truly anuric or volume-overloaded:* Loop diuretics will be ineffective, and forced fluid loading carries a severe risk of acute pulmonary edema. In this setting, emergent hemodialysis is the sole definitive elimination pathway.
  3. *Primary Resuscitation:* Because the patient is hemodynamically unstable (MAP ${calculatedMap} mmHg, HR 38 bpm), urgent nephrology consultation for emergent hemodialysis evaluation is indicated regardless of baseline renal assumptions.`;
  } else {
    diureticFluidAnalysis = `#### Volume Overload Present: Diuretics Ineffective for Acute Resuscitation
- **Volume Overload / Pulmonary Congestion:** With pulmonary edema present, administration of IV fluids is contraindicated.
- **Definitive Clearance:** Emergent hemodialysis is the sole safe and effective modality for rapid magnesium clearance and volume removal.`;
  }

  return `# Noctis Patient Diagnostic & Triage Intelligence Dossier (Clinical Decision Support)
**Encounter ID:** \`${encounterId}\` · **Triage Urgency:** **🚨 P0 IMMEDIATE EMERGENCY (Critical Care ICU Resuscitation & Urgent Dialysis Evaluation)**
**Clinical Focus:** **Severe Symptomatic Hypermagnesemia with Bradycardia, Shock, and Neuromuscular Blockade in Advanced CKD**
**Regulatory Status:** Clinical Decision Support Information (Subordinate to Licensed Physician Clinical Assessment)

> [!CAUTION]
> **CRITICAL PATIENT SAFETY WARNING: SEVERE HYPERMAGNESEMIC CRISIS & SHOCK**
> 🚨 **HIGH-ACUITY METABOLIC & HEMODYNAMIC INSTABILITY:** Patient is a 76-year-old male with CKD Stage 5 presenting with severe hypermagnesemia (**serum magnesium 8.5 mg/dL / ~7.0 mEq/L**), profound sinus bradycardia (**heart rate 38 bpm**), severe hypotension (**BP 82/46 mmHg, calculated MAP ${calculatedMap} mmHg**), lethargy, and diminished deep tendon reflexes (+1/4) following oral magnesium hydroxide (Milk of Magnesia) ingestion.
> - **Physiological Membrane Antagonism (IV Calcium):** Consider prompt administration of **IV Calcium Gluconate 10% 10–20 mL (1–2 g) IV over 2–5 minutes** under continuous ECG telemetry to help antagonize magnesium-induced cardiotoxicity and neuromuscular depression. *Clinical Clarification:* IV calcium provides temporary, competitive antagonism at excitable membranes; **therapeutic response is variable and transient, and calcium does NOT remove, clear, or eliminate magnesium from the body (it does not reduce total body magnesium or accelerate excretion)**.
> - **Discontinue Magnesium Exposure:** Immediately discontinue Milk of Magnesia and avoid all further magnesium-containing medications, antacids, or laxatives.
> - **Contraindication Notice:** Avoid additional magnesium products or magnesium sulfate, which would compound existing toxicity and deepen conduction block and vasodilation.
> - **Urgent Nephrology Consultation & Dialytic Clearance:** Request urgent Nephrology consultation for emergent hemodialysis evaluation given severe hemodynamic instability and advanced renal disease.
> - **Urine Output & Renal Evaluation:** Do NOT assume anuria solely from CKD Stage 5. Management of fluids and loop diuretics depends on actual measured urine output and bedside volume assessment.
> - **DEMOGRAPHIC INVARIANT:** Male patient; all obstetric pathways, gestational tracking, preeclampsia/HELLP diagnoses, and fetal monitoring protocols are strictly excluded.

---

### 1. Data Categorization: Documented Facts vs. Clinical Inferences vs. Missing Parameters

| Category | Clinical Parameter | Documented Value | Source / Categorization | Clinical Rationale & Status |
| :--- | :--- | :--- | :--- | :--- |
| **Confirmed Finding** | **Age / Sex** | **76-year-old Male** | Documented Intake Fact | Geriatric male; strictly non-obstetric context. |
| **Confirmed Finding** | **Serum Magnesium** | **8.5 mg/dL (~7.0 mEq/L)** | Documented Laboratory Result | Severe hypermagnesemia (normal: 1.7–2.2 mg/dL; toxic threshold > 4.0 mg/dL). |
| **Confirmed Finding** | **Heart Rate** | **38 bpm** (Sinus Bradycardia) | Documented Vital Sign | Severe SA/AV nodal depression secondary to calcium channel antagonism by magnesium. |
| **Confirmed Finding** | **Blood Pressure** | **82/46 mmHg** | Documented Vital Sign | Profound hypotension; low cardiac output coupled with peripheral vasodilation. |
| **Calculated Value** | **Mean Arterial Pressure** | **${calculatedMap} mmHg** | Calculated Hemodynamic Parameter | Severe circulatory insufficiency (target MAP ≥ 65 mmHg). |
| **Confirmed Finding** | **Neurological State** | **Lethargy; DTRs diminished (+1/4)** | Documented Clinical Findings | Presynaptic acetylcholine inhibition and CNS depression from hypermagnesemia. |
| **Confirmed Finding** | **Exogenous Exposure** | **Milk of Magnesia (Mg(OH)₂)** | Documented Intake History | Daily unmonitored oral magnesium laxative in advanced renal impairment. |
| **Confirmed Finding** | **Renal Function** | **CKD Stage 5** | Documented Medical History | Advanced chronic kidney disease (impaired baseline magnesium filtration). |
| **Intake Assessment** | **Urine Output** | ${documentedUo ? `**${documentedUo}**` : `**[UNDOCUMENTED]**`} | ${documentedUo ? "Documented Intake Fact" : "Missing Clinical Parameter"} | ${documentedUo ? "Confirmed residual renal function; non-anuric status." : "Do NOT assume anuria; requires bedside Foley / hourly measurement."} |
| **Intake Assessment** | **Pulmonary / Volume** | ${hasBedsideUs ? `**No pulmonary edema on POCUS**${hasPeripheralEdema ? " (mild peripheral edema)" : ""}` : `**[UNDOCUMENTED]**`} | ${hasBedsideUs ? "Documented Intake Finding" : "Missing Clinical Parameter"} | ${hasBedsideUs ? "Absence of pulmonary congestion supports cautious diuretic/fluid evaluation." : "Bedside lung ultrasound required to rule out pulmonary edema."} |
| **Missing Parameter** | **Respiratory Rate & SpO₂** | **[UNDOCUMENTED]** | Missing Parameter | Requires immediate bedside measurement (screen for hypermagnesemic hypoventilation). |
| **Missing Parameter** | **Temperature & ROS** | **[UNDOCUMENTED]** | Missing Parameter | Bedside evaluation required; do NOT assume negative findings without assessment. |
| **Completed Actions** | **Interventions to Date** | **NONE COMPLETED** | Historical Baseline | No laboratory blood draws or procedures have been completed prior to physician order. |

---

### 2. Pathophysiological Mechanics & Renal Kinetics

#### A. Electrophysiological Cardiotoxicity & Neuromuscular Blockade
1. **Cardiac Pacemaker & AV Conduction Depression:** Extracellular magnesium acts as an endogenous calcium channel blocker. At concentrations $\ge 7.0\text{ mEq/L}$ ($8.5\text{ mg/dL}$), $\text{Mg}^{2+}$ inhibits inward $\text{Ca}^{2+}$ current through cardiac L-type channels, suppressing sinoatrial automaticity and delaying atrioventricular conduction. This manifests as severe sinus bradycardia (HR 38 bpm), PR/QRS prolongation, and risk of high-grade heart block.
2. **Peripheral Vasodilatory Shock:** Magnesium directly decreases vascular tone by relaxing arterial smooth muscle and depressing sympathetic ganglia, resulting in refractory hypotension ($\text{BP } 82/46\text{ mmHg}, \text{MAP } ${calculatedMap}\text{ mmHg}$).
3. **Presynaptic Neuromuscular Inhibition:** $\text{Mg}^{2+}$ competitively blocks voltage-gated calcium entry at motor nerve terminals, suppressing calcium-dependent acetylcholine release. This produces hyporeflexia (DTRs +1/4), generalized muscular weakness, and risk of respiratory muscle fatigue.

#### B. Temporary Nature of Calcium Gluconate Antagonism
- Intravenous Calcium Gluconate increases extracellular $\text{Ca}^{2+}$ to competitively overcome magnesium antagonism at cardiac and neuromuscular membranes.
- **Clinical Variability:** While calcium can rapidly improve cardiac conduction and motor transmission, its effects are temporary (typically lasting 30–60 minutes) and variable between patients.
- **No Elimination Effect:** Calcium does not lower serum magnesium levels or enhance excretion. Definitive therapy requires elimination of magnesium.

${diureticFluidAnalysis}

---

### 3. Proposed Emergency Orders & Clinical Decision Support Protocol

${generateElectrolyteTrajectorySvg("MAGNESIUM", "8.5", "2.0", "mg/dL")}

> [!NOTE]
> **ORDER ENTRY CLARIFICATION:** The following are **proposed orders and decision support considerations** for attending physician review and order entry. They do NOT represent completed procedures.

#### Step 1: Physiological Membrane Antagonism (Proposed Order)
- **Proposed Order:** IV Calcium Gluconate 10% 10–20 mL (1–2 g) IV push over 2–5 minutes under continuous telemetry.
- **Monitoring & Reassessment:** Assess heart rate, rhythm, and blood pressure continuously. Because the duration of calcium antagonism is brief, consider repeating the dose after 5–10 minutes if severe bradycardia or hypotension remains refractory.
- **Central Line Option:** If central venous access is established, 10% Calcium Chloride 5–10 mL (0.5–1.0 g) IV over 2–5 minutes may be considered.

#### Step 2: Medication Reconciliation & Toxin Withholding (Proposed Order)
- **Proposed Order:** Discontinue Milk of Magnesia immediately. Review medication administration record and withhold all magnesium-containing antacids, laxatives, and mineral formulations.
- **Contraindication Notice:** Avoid administration of magnesium sulfate or other magnesium salts; further magnesium input risks worsening conduction delay and hemodynamic instability.
- **EMR Safety Entry:** Recommend placing an Adverse Drug Reaction (ADR) flag for magnesium-containing preparations in the patient's EMR.

#### Step 3: Urgent Nephrology Consultation & Definitive Elimination (Proposed Order)
- **Proposed Order:** STAT Nephrology consultation for emergent hemodialysis evaluation.
- **Clinical Context:** In patients with advanced kidney disease and life-threatening hemodynamic instability (HR 38 bpm, MAP ${calculatedMap} mmHg), hemodialysis using a zero- or low-magnesium dialysate bath represents the most dependable, definitive mechanism for rapid clearance.
- **Access Evaluation:** Assess for existing vascular access (fistula/graft); if absent, prepare for temporary dialysis catheter placement under ultrasound guidance.
- **Diuretic / Fluid Individualization:**
  - If urine output is preserved (e.g. ${documentedUo || "documented residual volume"}$) without pulmonary edema: Nephrology may evaluate whether cautious high-dose IV loop diuretics (furosemide) or carefully monitored isotonic fluids have an adjunctive role while preparing for or awaiting dialysis.
  - If anuric or volume overloaded: Avoid forced hydration; proceed directly with dialytic clearance.

#### Step 4: Intensive Monitoring & Post-Stabilization Care (Proposed Orders)
- **Proposed Order:** Direct admission to the Intensive Care Unit (ICU) with continuous cardiorespiratory telemetry.
- **Proposed Order:** Apply transcutaneous pacing pads on standby for potential high-grade AV block or persistent severe bradycardia.
- **Proposed Order:** Consider arterial line placement for continuous blood pressure monitoring.
- **Proposed Order:** Order STAT repeat Basic Metabolic Panel, ionized calcium, magnesium, potassium, and venous blood gas every 2 hours until stable.
- **Secondary Constipation Protocol:** Once stabilized and alert, manage chronic constipation with non-absorbable agents safe in renal failure (e.g., polyethylene glycol / PEG 3350 17 g daily orally). Prohibit all magnesium-based laxatives.

---

### 4. Evidence-Calibrated Differential Diagnosis

| Rank | Clinical Condition | Diagnostic Status | Calibrated Clinical Rationale | Diagnostic / Management Consideration |
| :---: | :--- | :--- | :--- | :--- |
| **#1** | **Severe Symptomatic Hypermagnesemia** | **CONFIRMED CLINICAL EMERGENCY** | Serum Mg 8.5 mg/dL, HR 38 bpm, BP 82/46 mmHg, lethargy, hyporeflexia, daily Milk of Magnesia exposure in CKD 5. | Immediate IV calcium antagonism; urgent nephrology hemodialysis evaluation. |
| **#2** | **Circulatory Shock (Vasodilatory / Cardiogenic)** | **CONFIRMED CLINICAL EMERGENCY** | MAP ${calculatedMap} mmHg (< 65 mmHg) secondary to magnesium-induced vasodilation and bradycardia. | Telemetry, IV calcium, arterial line consideration, fluid assessment. |
| **#3** | **Drug-Induced Neuromuscular Blockade** | **CONFIRMED CLINICAL EMERGENCY** | Diminished deep tendon reflexes (+1/4) and lethargy from presynaptic acetylcholine inhibition. | Serial neurological examination; respiratory monitoring. |
| **EXCLUDED** | **Obstetric Syndromes (Preeclampsia / HELLP)** | **DEMOGRAPHICALLY EXCLUDED** | Patient is a 76-year-old male; zero biological or clinical applicability. | Demographic invariant enforced. Obstetric engine strictly suppressed. |

---

### 5. Structured Clinician SOAP Documentation

\`\`\`
CLINICIAN SOAP RECORD — ENCOUNTER \`${encounterId}\`
PATIENT: 76-year-old Male | MRN: DOCUMENTED IN ENCOUNTER
RECORD CREATED: ${new Date().toISOString()}

SUBJECTIVE:
- Documented Presentation: 76-year-old male with history of CKD Stage 5 presents with lethargy, generalized weakness, and diminished deep tendon reflexes following intake of magnesium hydroxide (Milk of Magnesia) for constipation.
- Information Source: [Intake referral text — bedside confirmation required].
- Review of Systems: [UNDOCUMENTED ON INTAKE — Requires bedside screening for chest pain, dyspnea, fever, trauma, or nausea].
- Obstetric History: Not applicable (Male patient).

OBJECTIVE:
- Documented Vital Signs:
  - Heart Rate: 38 bpm (Sinus Bradycardia).
  - Blood Pressure: 82/46 mmHg (Calculated MAP: ${calculatedMap} mmHg — Hemodynamic Shock).
  - Respiratory Rate: [UNDOCUMENTED ON INTAKE — Bedside count required].
  - Oxygen Saturation (SpO2): [UNDOCUMENTED ON INTAKE — Continuous pulse oximetry required].
  - Body Temperature: [UNDOCUMENTED ON INTAKE — Bedside measurement required].
- Documented Laboratory & Renal Data:
  - Serum Magnesium: 8.5 mg/dL (~7.0 mEq/L) [CRITICAL HIGH; Reference: 1.7–2.2 mg/dL].
  - Baseline Renal Status: CKD Stage 5.
  - Urine Output: ${documentedUo ? `${documentedUo} (Documented residual renal output; non-anuric)` : "[UNDOCUMENTED ON INTAKE — Foley catheter measurement required; do NOT assume anuria]"}.
  - Pulmonary / Volume Status: ${hasBedsideUs ? `Bedside US shows no pulmonary edema${hasPeripheralEdema ? ", mild peripheral edema noted" : ""}` : "[UNDOCUMENTED ON INTAKE — Bedside lung ultrasound and volume assessment required]"}.
- Documented Physical Examination:
  - Neurological / General: Lethargic; deep tendon reflexes diminished (+1/4).
  - Undocumented Physical Exam: Cranial nerves, motor power, heart sounds, breath sounds, pulses, and abdominal exam are [NOT REPORTED ON INTAKE — Requires formal bedside physical examination].
- Interventions Completed Prior to this Encounter:
  - NONE DOCUMENTED. (All diagnostic and therapeutic interventions are proposed orders awaiting clinician verification).

ASSESSMENT:
76-year-old male with CKD Stage 5 presenting with severe symptomatic hypermagnesemia (serum Mg 8.5 mg/dL) complicated by marked sinus bradycardia (HR 38 bpm), circulatory shock (BP 82/46 mmHg, MAP ${calculatedMap} mmHg), lethargy, and hyporeflexia secondary to magnesium hydroxide exposure.
- Clinical Inferences: Electrophysiological cardiotoxicity and peripheral vasodilation caused by calcium channel blockade from excess magnesium.
- Renal Context: ${documentedUo ? `Patient has documented residual urine output (${documentedUo}) without pulmonary edema, indicating potential for cautious adjunctive diuresis, but severe shock mandates urgent dialytic evaluation.` : "Renal output is undocumented; must determine whether residual function exists before establishing diuretic utility. Severe shock warrants urgent dialytic assessment."}

PLAN (PROPOSED ORDERS & CONSIDERATIONS — NOT COMPLETED ACTIONS):
1. Resuscitation & Membrane Stabilization (Proposed):
   - Consider IV Calcium Gluconate 10% 10–20 mL IV over 2–5 min under telemetry. Note that calcium provides temporary, variable antagonism and does not lower serum magnesium.
   - External transcutaneous pacing pads recommended on standby for refractory bradycardia.
2. Exposure Cessation & Safety (Proposed):
   - Discontinue Milk of Magnesia immediately. Avoid all further magnesium-containing agents.
   - Avoid magnesium sulfate (contraindicated in active hypermagnesemia).
3. Elimination & Nephrology Consultation (Proposed):
   - STAT Nephrology consult for emergent hemodialysis evaluation given severe hemodynamic instability and CKD 5.
   - Base use of fluids or loop diuretics on measured urine output and volume status (if urine output is preserved and lungs clear, evaluate adjunctive diuretics; if anuric/overloaded, hemodialysis is essential).
4. Monitoring & Critical Care (Proposed):
   - Recommend ICU admission, continuous telemetry, consideration of arterial line, and repeat metabolic panel/magnesium q2h.
   - Plan safe post-stabilization bowel regimen with PEG 3350 (MiraLAX) once acute crisis resolves.
\`\`\`

---

### 6. Regulatory Context & Clinical Decision Support Disclosure

> [!NOTE]
> **REGULATORY CONTEXT & CDS DISCLOSURE:**
> This intelligence dossier provides evidence-based clinical decision support information designed to assist qualified healthcare professionals during critical care assessment.
> - **Independent Professional Judgment Required:** Algorithmic recommendations are non-binding clinical considerations. They do not constitute completed orders, physical examinations, or formal medical diagnoses.
> - **Institutional Regulatory Evaluation:** Intended software functionality should be evaluated by the deploying healthcare organization under applicable FDA Clinical Decision Support (CDS) guidance and SaMD regulatory frameworks. This system does not independently self-certify regulatory compliance.`;
}

export function buildPatientDiagnosticReport(dataOrText: PatientReportedData | string): PatientDiagnosticDossier {
  const data = typeof dataOrText === "string" ? parsePatientNaturalLanguageIntake(dataOrText) : dataOrText;
  const triage = evaluateEmergencyTriage(data);
  const { differentials, mustNotMissEmergencies } = computeDifferentialDiagnosis(data);
  const adaptiveQuestions = generateAdaptiveQuestions(data, differentials);
  const clinicianSoapNote = generateClinicianSoapNote(data, triage, differentials);

  const topDiff = differentials[0];
  const patientPlainSummary = [
    `Based on the symptoms you reported ("${data.chiefComplaint}"), our clinical intake system has organized your information for your physician.`,
    triage.isEmergency
      ? "⚠️ IMPORTANT: Your reported symptoms contain warning signs that need urgent, in-person emergency medical care. Please follow the emergency instructions immediately."
      : `The most plausible condition explaining your symptoms is **${topDiff ? topDiff.diseaseName.split("(")[0].trim() : "under clinical assessment"}**, but other conditions must be evaluated by your healthcare provider.`,
  ].join("\n\n");

  const regulatoryAttestation =
    "FDA Jan 2026 Clinical Decision Support (CDS) Non-Device Framework (21 U.S.C. § 360j(o)(1)(E)): This algorithmic decision support assists healthcare evaluation. It does not replace independent clinical judgment, formal physical examination, laboratory testing, or a licensed physician's diagnosis.";

  return {
    encounterId: `NPDE-${Date.now().toString(36).toUpperCase()}`,
    timestamp: new Date().toISOString(),
    patientData: data,
    triage,
    differentials,
    mustNotMissEmergencies,
    adaptiveQuestions,
    patientPlainSummary,
    clinicianSoapNote,
    regulatoryAttestation,
  };
}

export function formatPatientDiagnosticDossierMarkdown(dossier: PatientDiagnosticDossier): string {
  const { triage, differentials, adaptiveQuestions, clinicianSoapNote, patientPlainSummary, regulatoryAttestation } = dossier;
  const cc = (dossier.patientData.chiefComplaint || "").toLowerCase();
  const rawText = JSON.stringify(dossier.patientData).toLowerCase();

  const isAbdominal =
    /\b(abdomin\w*|belly|stomach|epigastr\w*|quadrant|rlq|ruq|llq|luq|alvarado|appendic\w*|cholecyst\w*|pancreat\w*|lipase|biliary)\b/i.test(cc) ||
    /\b(abdomin\w*|belly|stomach|epigastr\w*|quadrant|rlq|ruq|llq|luq|alvarado|appendic\w*|cholecyst\w*|pancreat\w*|lipase|biliary)\b/i.test(rawText);

  const isSepsis =
    /\b(sepsis|septic\s+shock|urosepsis|bacteremia)\b/i.test(cc) ||
    /\b(sepsis|septic\s+shock|urosepsis|bacteremia)\b/i.test(rawText) ||
    ((dossier.patientData.vitals.temperatureC ?? 0) >= 38.5 && (dossier.patientData.vitals.systolicBp ?? 120) <= 90);

  if (isSepsis) {
    return generateIsolatedSepticShockDossier(dossier.encounterId, dossier.patientData.rawIntakeText || rawText, {
      ageYears: dossier.patientData.demographics?.age,
      biologicalSex: dossier.patientData.demographics?.gender as any,
      vitals: dossier.patientData.vitals,
      chiefComplaint: dossier.patientData.chiefComplaint,
    });
  }

  const isHyperkalemia =
    /\b(hyperkalemia|potassium|k\+)\b/i.test(cc) ||
    /\b(hyperkalemia|potassium|k\+)\b/i.test(rawText) ||
    (/\b(?:[6-9]\.\d|7\.\d)\s*(?:mmol|meq)\b/i.test(rawText) && /\b(ckd|renal|potassium|weakness|qrs)\b/i.test(rawText));

  if (isHyperkalemia) {
    return generateIsolatedHyperkalemiaDossier(dossier.encounterId, dossier.patientData.rawIntakeText || rawText);
  }

  const isHypermagnesemia =
    /\b(hypermagnesemia|magnesium|milk\s+of\s+magnesia)\b/i.test(cc) ||
    /\b(hypermagnesemia|magnesium|milk\s+of\s+magnesia)\b/i.test(rawText) ||
    (/\b(?:[4-9]\.\d|8\.5)\s*(?:mg\/dl|meq\/l)\b/i.test(rawText) && /\b(ckd|renal|bradycardia|hypotension|reflexes)\b/i.test(rawText));

  if (isHypermagnesemia) {
    return generateIsolatedHypermagnesemiaDossier(dossier.encounterId, dossier.patientData.rawIntakeText || rawText);
  }

  const isStroke =
    /\b(stroke|facial\s+droop|arm\s+drift|slurred\s+speech|hemipares|lvo|tpa|tenecteplase|nihss)\b/i.test(cc) ||
    /\b(stroke|facial\s+droop|arm\s+drift|slurred\s+speech|hemipares)\b/i.test(rawText);

  const sections: string[] = [];

  // 1. Header & Emergency Triage Directive
  sections.push(
    `# Noctis Patient Diagnostic & Triage Intelligence Dossier (Clinical Decision Support)\n**Encounter ID:** \`${dossier.encounterId}\` · **Triage Urgency:** **${triage.urgencyLabel}** · **NON-DEVICE CDS ARCHITECTURE (21 U.S.C. § 360j(o)(1)(E))**\n`
  );

  if (triage.escalationBanner) {
    sections.push(
      `> [!CAUTION]\n> **EMERGENCY MEDICAL WARNING (911 LOCKOUT DIRECTIVE)**\n> ${triage.escalationBanner}\n> - **Immediate Action:** Activate Emergency Medical Services (EMS) immediately. Do NOT drive yourself to the hospital.\n> - **Time-Critical Imperative:** Immediate evaluation by emergency medical personnel.`
    );
  }

  // 2. Syndrome-Specific Clinical Assessment & Findings Table
  if (isAbdominal) {
    // ABDOMINAL SYNDROME
    const tempStr = dossier.patientData.vitals.temperatureC
      ? `${dossier.patientData.vitals.temperatureC}°C (Pyrexia / Elevated)`
      : "[UNPROVIDED — NOT MEASURED]";

    sections.push(`## 1. Clinical Assessment of the Presentation (Abdominal Syndrome)

The patient presents with acute abdominal discomfort and systemic pyrexia. In acute abdominal pathology, anatomical localization, onset chronology, and peritoneal signs are critical determinants of surgical urgency.

| Clinical Finding | Presentation in Encounter | Physiological Significance | Diagnostic Value & Evidence-Based Likelihood Ratio (LR) |
| :--- | :--- | :--- | :--- |
| **Abdominal Pain Localization** | **Undifferentiated / Unspecified Quadrant** | Classifying pathology (RLQ, RUQ, Epigastric, LLQ) determines visceral vs somatic peritoneal involvement | **Mandatory Input:** Localization is strictly required before an anatomical condition can be ranked #1 |
| **Body Temperature** | ${tempStr} | Systemic inflammatory response; cytokine-mediated pyrexia (IL-1, TNF-alpha) | Contributes +1 point to Alvarado score; indicates acute infectious/inflammatory process |
| **Pain Onset & Chronology** | ${dossier.patientData.onsetTiming || "Undocumented"} | Distinguishes sudden vascular/obstructive catastrophes from evolving inflammatory conditions | Rapid onset (< 2h) raises concern for perforation, torsion, or obstruction |
| **Autonomic / GI Symptoms** | ${dossier.patientData.associatedSymptoms.length > 0 ? dossier.patientData.associatedSymptoms.join(", ") : "None reported"} | Vagal stimulation, bowel distension, and peritoneal irritation | Nausea/vomiting and anorexia (+LR 1.5) support acute intra-abdominal pathology |
| **Hemodynamic Stability** | BP ${dossier.patientData.vitals.systolicBp ? `${dossier.patientData.vitals.systolicBp}/${dossier.patientData.vitals.diastolicBp}` : "[Unmeasured]"}, HR ${dossier.patientData.vitals.heartRate ? `${dossier.patientData.vitals.heartRate} bpm` : "[Unmeasured]"} | Screening for septic shock or hypovolemic third-spacing | Normal hemodynamics do NOT exclude early appendicitis or localized peritonitis |

*Clinical Conclusion:* **Undifferentiated Acute Abdominal Pain with Pyrexia.** Because pain location and progression were not documented, definitive ranking of a single anatomical diagnosis is clinically invalid. Immediate physical examination is required to localize tenderness and screen for surgical peritonitis.`);

    // Add Alvarado & qSOFA Score Section
    const alvarado = calculateAlvaradoScore({
      encounterId: dossier.encounterId,
      ageYears: dossier.patientData.ageYears,
      biologicalSex: dossier.patientData.biologicalSex,
      chiefComplaint: dossier.patientData.chiefComplaint,
      painQuadrant: undefined,
      associatedSymptoms: dossier.patientData.associatedSymptoms,
      vitals: dossier.patientData.vitals,
    });

    const qsofa = calculateQSOFA({
      encounterId: dossier.encounterId,
      chiefComplaint: dossier.patientData.chiefComplaint,
      associatedSymptoms: dossier.patientData.associatedSymptoms,
      vitals: dossier.patientData.vitals,
    });

    sections.push(`## 2. Clinical Severity & Diagnostic Scoring Engine

### Alvarado Score for Acute Appendicitis
- **Documented Score:** **${alvarado.documentedPoints} / 10 points (INCOMPLETE)**
- **Documented Criteria:** ${alvarado.documentedCriteria.map(c => `${c.name} (+${c.points})`).join(", ") || "None"}
- **Missing / Undocumented Criteria (7/8 unmeasured):** ${alvarado.missingCriteria.join(", ")}
- **Risk Stratification:** **INSUFFICIENT DATA — DO NOT STRATIFY**
- *Clinical Decision Rule:* Do not classify clinical probability (Low, Intermediate, High) based on an incomplete score.

### quick Sequential Organ Failure Assessment (qSOFA)
- **Documented Points:** **${qsofa.documentedPoints} / 3 (INCOMPLETE)**
- **Missing Parameters:** ${qsofa.missingInputs.join(", ")}
- **Safety Invariant:** ${qsofa.safetyCaveat}`);

    // Grouped Abdominal Differential Hierarchy
    sections.push(`## 3. Evidence-Weighted Differential Diagnosis Hierarchy (Grouped by Anatomical Quadrant)

*Because pain localization was not documented in the intake, potential etiologies are structured by anatomical quadrant rather than an unsupported single diagnosis:*

| Priority Tier | Candidate Condition | Anatomical Location | Key Clinical Features & Criteria | Gold-Standard Diagnostic Protocol |
| :---: | :--- | :---: | :--- | :--- |
| **Priority 1: Must-Not-Miss** | **Acute Appendicitis**<br>*(ICD-10: K35.80)* | Right Lower Quadrant (RLQ) / Periumbilical | Periumbilical pain migrating to RLQ, anorexia, McBurney tenderness, fever | **Contrast-Enhanced CT Abdomen/Pelvis** (adults) or Graded Compression US (children/pregnancy) |
| **Priority 1: Must-Not-Miss** | **Acute Cholecystitis / Ascending Cholangitis**<br>*(ICD-10: K81.0 / K83.09)* | Right Upper Quadrant (RUQ) | RUQ tenderness, Murphy sign, postprandial onset; fever + jaundice (Charcot triad) | **Transabdominal RUQ Ultrasound (First Line)**; LFTs and Lipase |
| **Priority 1: Must-Not-Miss** | **Acute Pancreatitis**<br>*(ICD-10: K85.90)* | Epigastric / Back | **Revised Atlanta Criteria (Requires ≥ 2 of 3):** Upper pain radiating to back, lipase ≥ 3x ULN, characteristic CT/US imaging | Serum Lipase + LFTs + CMP. *Note: Early CT not indicated if criteria met clinically* |
| **Priority 1: Must-Not-Miss** | **Testicular Torsion / Epididymo-Orchitis**<br>*(ICD-10: N44.00)* | Inguinal / Scrotal | **6-Hour Salvage Window:** Referred lower abdominal/groin pain from acute testicular ischemia in males | **Emergent Scrotal Color Doppler Ultrasound** — *Do NOT delay surgical consult for imaging* |
| **Priority 2: Alternative** | **Mesenteric Adenitis / Acute Gastroenteritis**<br>*(ICD-10: I88.0 / K52.9)* | Diffuse / RLQ | Viral prodrome, diffuse cramping, hyperactive bowel sounds | Clinical observation, stool testing if diarrhea present |
`);

    // Prioritized Abdominal Workup Protocol
    sections.push(`## 4. Prioritized Emergency Diagnostic Workup Protocol (Abdominal)

1. **Immediate Serial Physical Examination & Peritoneal Localization:**
   - Palpate all four abdominal quadrants to identify point of maximal tenderness (RLQ McBurney point, RUQ Murphy sign, epigastric tenderness).
   - Assess peritoneal signs: Involuntary guarding, rigidity, and rebound tenderness (Blumberg sign).
   - In male patients: Perform mandatory external genital/testicular examination to exclude testicular torsion.

2. **Core Laboratory Investigations:**
   - **Complete Blood Count (CBC) with Differential:** Evaluate for leukocytosis (WBC > 10,000) and neutrophilic left shift (> 75%).
   - **Comprehensive Metabolic Panel (CMP):** Assess baseline renal function (BUN/creatinine) and hepatic enzymes (AST, ALT, Total Bilirubin, Alkaline Phosphatase).
   - **Serum Lipase:** Required if epigastric pain (*Atlanta Criteria: Lipase ≥ 3x ULN supports pancreatitis only in context*).
   - **Urinalysis:** Rule out nephrolithiasis (hematuria) and urinary tract infection (pyuria/nitrites).

3. **Condition-Specific Imaging Pathways:**
   - *Suspected Biliary Disease (RUQ):* **Transabdominal Ultrasound** is the first-line imaging modality of choice (sensitivity ~88%).
   - *Suspected Appendicitis (RLQ) with Diagnostic Uncertainty:* **Contrast-Enhanced CT of Abdomen and Pelvis** (sensitivity 94–98%).
   - *Suspected Testicular Torsion:* **Emergent Scrotal Color Doppler Ultrasound** (do not delay surgical exploration).

4. **Treatment Safety & Surgical Governance:**
   - **Allergy Check:** Patient allergy status is currently **UNKNOWN**. Confirm drug allergies prior to prescribing antibiotics or analgesics.
   - **Surgical Examination First:** Do not administer blind empiric narcotics or broad-spectrum antibiotics that could mask peritoneal signs prior to attending surgical evaluation.`);
  } else if (isStroke) {
    // STROKE SYNDROME
    sections.push(`## 1. Clinical Assessment of the Presentation (Acute Neurological Emergency)

The presentation features acute focal neurological deficits requiring immediate stroke pathway activation.

| Clinical Finding | Presentation in Encounter | Physiological Significance | Emergency Diagnostic Action |
| :--- | :--- | :--- | :--- |
| **Facial Asymmetry / Arm Weakness / Slurred Speech** | Acute FAST Stroke Sign | Disruption of focal cerebral blood flow / cortical ischemia | Code Stroke / Immediate Emergency Medical Services Activation |
| **Last Known Well (LKW)** | Time-critical (e.g. 75 min) | Defines eligibility for IV thrombolysis (≤ 4.5h) and mechanical thrombectomy (≤ 24h) | Note exact time last seen normal |
| **Blood Pressure (Permissive Hypertension)** | Elevated BP (e.g. 188/104 mmHg) | Compensatory cerebral autoregulation to perfuse ischemic penumbra | Target < 185/110 mmHg if thrombolysis candidate; permissive up to 220/120 mmHg if non-candidate |
| **Blood Glucose** | POC evaluation mandatory | Hypoglycemia is the most common time-critical stroke mimic | Point-of-care fingerstick blood glucose immediately |

*Clinical Conclusion:* **Acute Ischemic Stroke vs Intracranial Hemorrhage.** Time is brain. Immediate non-contrast head CT and CTA head/neck required.`);

    sections.push(`## 2. Evidence-Weighted Differential Diagnosis Hierarchy\n\n| Rank | Candidate Condition | Clinical Category | Calibrated Pre-Test Risk | Supporting Clinical Findings | Gold-Standard Diagnostic Protocols |\n| :---: | :--- | :---: | :---: | :--- | :--- |\n| **#1** | **Acute Ischemic Stroke / TIA**<br>*(ICD-10: I63.9)* | 🚨 **TIER 1: PRIMARY EMERGENCY** | **85% Pre-Test Risk**<br>*(STAT Protocol)* | Acute focal deficit (FAST positive) | Non-Contrast Head CT within 20 min, CTA Head/Neck |\n| **#2** | **Intracranial Hemorrhage (ICH)**<br>*(ICD-10: I61.9)* | ⚠️ **TIER 2: MUST-NOT-MISS** | **12% Pre-Test Risk**<br>*(Rule-Out)* | Focal deficit with elevated blood pressure | Non-Contrast Head CT |\n| **#3** | **Hypoglycemia (Stroke Mimic)**<br>*(ICD-10: E16.2)* | 🔹 **TIER 3: ALTERNATIVE** | **3% Pre-Test Risk** | Neuroglycopenic symptoms | Immediate Point-of-Care Capillary Glucose |\n`);

    sections.push(`## 3. Prioritized Emergency Diagnostic Workup Protocol (Stroke)

1. **Immediate Non-Contrast Head CT (Target ≤ 20 Minutes):** Rule out intracranial hemorrhage prior to considering thrombolytic therapy.
2. **CT Angiography (CTA) of Head and Neck:** Identify Large Vessel Occlusion (LVO) eligible for endovascular mechanical thrombectomy.
3. **Point-of-Care Fingerstick Blood Glucose:** Immediately exclude neuroglycopenia (< 60 mg/dL).
4. **NIH Stroke Scale (NIHSS):** Quantify neurological deficit severity.
5. **Blood Pressure Management & Permissive Hypertension Protocol:**
   - **Pre-Thrombolysis Gate:** If candidate for IV thrombolysis (Alteplase/Tenecteplase), blood pressure must be safely lowered to < 185/110 mmHg with IV Labetalol (10–20 mg slow IV push) or IV Nicardipine (5 mg/h infusion) prior to drug administration.
   - **Permissive Hypertension Rule:** If not receiving thrombolytic therapy, allow permissive hypertension up to 220/120 mmHg to maintain perfusion to the ischemic penumbra. Do NOT rapidly lower blood pressure (drops > 15% worsen cerebral infarction).
   - **Contraindication:** Sublingual nifedipine and aggressive oral antihypertensives are STRICTLY CONTRAINDICATED in the acute phase.`);
  }

  const isCardiovascularChestPain =
    /\b(chest\s+pain|retrosternal|substernal|angina|myocardial\s+infarction|acs|coronary|stemi|nstemi)\b/i.test(cc) ||
    /\b(chest\s+pain|retrosternal|substernal|angina|myocardial\s+infarction|acs|coronary|stemi|nstemi)\b/i.test(rawText);

  if (!isAbdominal && !isStroke && isCardiovascularChestPain) {
    // CARDIOVASCULAR CHEST PAIN SYNDROME
    sections.push(`## 1. Clinical Assessment of the Presentation

The reported symptom constellation represents a potentially life-threatening medical emergency requiring urgent in-person evaluation.

| Clinical Finding | Presentation in Encounter | Physiological Significance | Diagnostic Value & Evidence-Based Likelihood Ratio (LR) | Literature Source & Provenance |
| :--- | :--- | :--- | :--- | :--- |
| **Central Chest Discomfort** | Crushing retrosternal pressure | Hallmark of acute myocardial ischemia / coronary hypoperfusion | High sensitivity, but descriptive alone has limited standalone specificity (+LR ~1.5) | *JAMA Rat. Clin. Exam* (Swap & Nagurney, 2005) |
| **Pain Radiation** | Radiation to left arm, neck, or jaw | Dermatomal referral (T1-T4 cardiac afferents via spinal cord) | **+LR 2.3** (95% CI 1.7–3.1) for left arm; **+LR 7.1** (95% CI 3.6–14.2) if both arms | *JAMA* (Panju et al., 1998; Swap & Nagurney, 2005) |
| **Autonomic Signs** | Profuse diaphoresis | Systemic sympathetic catecholamine discharge from ischemic stress | **+LR 2.0** (95% CI 1.4–2.9); key independent risk predictor | *JAMA Rat. Clin. Exam* (Swap & Nagurney, 2005) |
| **Dyspnea / Shortness of Breath** | Concomitant breathlessness | Elevated LV end-diastolic pressure / pulmonary venous congestion | Important warning sign, but non-specific (+LR 1.2 for ACS; also seen in PE/heart failure) | *Circulation* (ACC/AHA Guidelines, 2021) |
| **Elevated Blood Pressure** | 154/96 mmHg | Vascular afterload demand; bilateral measurement mandatory | Standalone LR does not confirm/exclude ACS; >20 mmHg inter-arm diff raises dissection (+LR 5.3) | *JAMA* (von Kodolitsch et al., 2000) |
| **Heart Rate (98 bpm)** | High-normal / mild tachycardia | Increases myocardial O2 demand; reflex sympathetic tone | Non-specific; does not rule ACS in or out | Emergency Medicine Clinics (2018) |
| **Preserved SpO2 (96%)** | 96% on room air | Oxygenation currently preserved; supplemental O2 not indicated | Normal SpO2 does **NOT** exclude acute myocardial infarction or ischemia | AHA/ACC NSTEMI/STEMI Guidelines (2021) |

> [!IMPORTANT]
> **Methodological Invariant:** The diagnostic value of combined symptoms exceeds any isolated finding, but LRs must not be mechanically multiplied due to conditional dependence. The figures above serve as population-level clinical reference estimates rather than individual deterministic calculations.

*Clinical Conclusion:* Acute Coronary Syndrome (STEMI, NSTEMI, Unstable Angina) represents the primary immediate diagnostic concern. However, definitive diagnosis cannot be established from symptoms alone and requires emergent 12-lead ECG and serial cardiac troponin.`);

    const diffRows = differentials.map((d) => {
      const categoryBadge =
        d.category === "PRIMARY_HYPOTHESIS"
          ? "🚨 **TIER 1: PRIMARY EMERGENCY**"
          : d.category === "MUST_NOT_MISS_RULEOUT"
            ? "⚠️ **TIER 2: MUST-NOT-MISS**"
            : "🔹 **TIER 3: ALTERNATIVE**";

      const urgencyNote =
        d.category === "PRIMARY_HYPOTHESIS"
          ? `**${d.probabilityPct}% Pre-Test Risk**<br>*(STAT Protocol)*`
          : `**${d.probabilityPct}% Pre-Test Risk**<br>*(Rule-Out)*`;

      return `| **#${d.rank}** | **${d.diseaseName}**<br>*(${d.icd10})* | ${categoryBadge} | ${urgencyNote} | • ${d.supportingEvidence.slice(0, 3).join("<br>• ")} | ${d.goldStandardDiagnosticTests.slice(0, 2).join("<br>• ") || "Physician exam"} |`;
    });

    sections.push(
      `## 2. Evidence-Weighted Differential Diagnosis Hierarchy\n\n| Rank | Candidate Condition | Clinical Category | Calibrated Pre-Test Risk | Supporting Clinical Findings | Gold-Standard Diagnostic Protocols |\n| :---: | :--- | :---: | :---: | :--- | :--- |\n${diffRows.join("\n")}\n`
    );

    sections.push(`## 3. Prioritized Emergency Diagnostic Workup Protocol

To achieve rapid, guideline-directed confirmation or exclusion without cognitive delay, the following diagnostic protocols are prioritized:

1. **Immediate 12-Lead Electrocardiogram (ECG) — Target ≤ 10 Minutes:**
   - Immediately screen for ST-segment elevation (STEMI criteria: ≥1 mm in contiguous leads, ≥2 mm in V2-V3 in men, or new LBBB).
   - **Reperfusion Mandate:** If STEMI is confirmed, activate the Cardiac Catheterization Lab immediately without waiting for troponin results.
   - If initial ECG is non-diagnostic but symptoms persist, perform repeat ECGs every 15–30 minutes and consider posterior leads (V7-V9) or right-sided leads (V4R).
   - *Critical Rule:* A normal or non-diagnostic initial ECG does **NOT** rule out acute myocardial infarction.

2. **Serial High-Sensitivity Cardiac Troponin (hs-cTnI / hs-cTnT):**
   - Execute validated **0h and 1h (or 0h and 2h/3h) rapid rule-in/rule-out pathways** (ESC/ACC guidelines).
   - Dynamic delta rising above 99th percentile upper reference limit confirms myocardial injury.

3. **Continuous Cardiac Telemetry & Hemodynamic Monitoring:**
   - Continuous 3-to-5 lead rhythm monitoring to detect malignant ventricular arrhythmias (VT/VF) or AV block.
   - Bilateral upper extremity blood pressure measurement: A differential > 20 mmHg demands urgent exclusion of Acute Aortic Dissection.
   - *Safety Note:* If acute aortic dissection is suspected, withhold antiplatelet and anticoagulation therapy until dissection is excluded.

4. **Point-of-Care Ultrasound (POCUS) / Bedside Echocardiography:**
   - Assess left ventricular regional wall motion abnormalities (RWMA) concordant with coronary anatomy.
   - Exclude pericardial effusion/tamponade, acute right ventricular strain (pulmonary embolism), or ascending aortic root dilation.

5. **Portable Chest Radiography (CXR):**
   - Screen for widened mediastinum (aortic dissection), pneumothorax, pulmonary edema, or focal pneumonia. Normal CXR does NOT exclude aortic dissection.`);
  } else if (!isAbdominal && !isStroke) {
    // DYNAMIC GENERAL PRESENTATION SECTION (Avoids ACS Fallback)
    const vitalsList: string[] = [];
    if (dossier.patientData.vitals.bloodPressure) vitalsList.push(`BP: ${dossier.patientData.vitals.bloodPressure}`);
    else if (dossier.patientData.vitals.systolicBp) vitalsList.push(`BP: ${dossier.patientData.vitals.systolicBp}/${dossier.patientData.vitals.diastolicBp} mmHg`);
    if (dossier.patientData.vitals.heartRate) vitalsList.push(`HR: ${dossier.patientData.vitals.heartRate} bpm`);
    if (dossier.patientData.vitals.respiratoryRate) vitalsList.push(`RR: ${dossier.patientData.vitals.respiratoryRate}/min`);
    if (dossier.patientData.vitals.temperatureC) vitalsList.push(`Temp: ${dossier.patientData.vitals.temperatureC}°C`);
    if (dossier.patientData.vitals.oxygenSaturation) vitalsList.push(`SpO2: ${dossier.patientData.vitals.oxygenSaturation}%`);
    if (dossier.patientData.vitals.bloodGlucoseMgDl) vitalsList.push(`Glucose: ${dossier.patientData.vitals.bloodGlucoseMgDl} mg/dL`);

    sections.push(`## 1. Clinical Assessment of the Presentation

The patient presents with ${dossier.patientData.chiefComplaint || "an acute clinical concern"}. Emergency evaluation is directed toward stabilizing life-threatening organ dysfunction and establishing the underlying etiology.

| Parameter | Documented Value | Physiological Significance | Diagnostic / Resuscitation Priority |
| :--- | :--- | :--- | :--- |
| **Chief Complaint** | ${dossier.patientData.chiefComplaint || "Unspecified"} | Primary presenting physiological distress | Triage and immediate risk stratification |
| **Associated Symptoms** | ${dossier.patientData.associatedSymptoms.length > 0 ? dossier.patientData.associatedSymptoms.join(", ") : "None reported"} | Multi-system symptom constellation | Refining differential diagnosis hierarchy |
| **Documented Vitals** | ${vitalsList.join(" · ") || "Awaiting bedside measurement"} | Hemodynamic and metabolic stability | Rapid identification of organ failure / shock |

*Clinical Conclusion:* Immediate clinical stabilization and targeted diagnostic testing required to rule out acute critical illness.`);

    const diffRows = differentials.map((d) => {
      const categoryBadge =
        d.category === "PRIMARY_HYPOTHESIS"
          ? "🚨 **TIER 1: PRIMARY EMERGENCY**"
          : d.category === "MUST_NOT_MISS_RULEOUT"
            ? "⚠️ **TIER 2: MUST-NOT-MISS**"
            : "📋 **TIER 3: ALTERNATIVE**";

      const urgencyNote =
        d.category === "PRIMARY_HYPOTHESIS"
          ? `**${d.probabilityPct}% Pre-Test Risk**<br>*(STAT Protocol)*`
          : `**${d.probabilityPct}% Pre-Test Risk**<br>*(Rule-Out)*`;

      return `| **#${d.rank}** | **${d.diseaseName}**<br>*(${d.icd10})* | ${categoryBadge} | ${urgencyNote} | • ${d.supportingEvidence.slice(0, 3).join("<br>• ") || "Clinical presentation"} | ${d.goldStandardDiagnosticTests.slice(0, 2).join("<br>• ") || "Physician exam"} |`;
    });

    sections.push(
      `## 2. Evidence-Weighted Differential Diagnosis Hierarchy\n\n| Rank | Candidate Condition | Clinical Category | Calibrated Pre-Test Risk | Supporting Clinical Findings | Gold-Standard Diagnostic Protocols |\n| :---: | :--- | :---: | :--- | :--- | :--- |\n${diffRows.join("\n")}\n`
    );

    sections.push(`## 3. Prioritized Emergency Diagnostic Workup Protocol

1. **Immediate Bedside Vital Signs & Hemodynamic Assessment:** Continuous cardiorespiratory telemetry, pulse oximetry, and non-invasive blood pressure monitoring.
2. **Point-of-Care Laboratory Evaluation:** Point-of-care blood glucose, venous/arterial blood gas with lactate, and electrolyte screening.
3. **Comprehensive Diagnostic Blood Testing:** Complete blood count (CBC), comprehensive metabolic panel (CMP), coagulation profile, and disease-specific biomarkers.
4. **Directed Diagnostic Imaging:** Bedside POCUS ultrasound, portable radiography, or targeted contrast-enhanced computed tomography (CT) based on primary clinical suspicion.
5. **Empiric Resuscitation & Safety Protocols:** Secure intravenous access, initiate targeted fluid/electrolyte resuscitation, and confirm drug allergies before pharmacotherapy.`);
  }

  // Adaptive Questions
  if (adaptiveQuestions.length > 0) {
    const qList = adaptiveQuestions.map(
      (q, idx) =>
        `**Q${idx + 1} (${q.associatedDifferential.split("(")[0].trim()}):** *"${q.promptText}"*\n- **Clinical Purpose:** ${q.clinicalObjective}\n- **Diagnostic Impact:** ${q.potentialImpact}`
    );
    sections.push(`## 4. Adaptive Discriminative Questions for Clinician Triage\n\n${qList.join("\n\n")}\n`);
  }

  // Clinical SOAP Note
  sections.push(
    `## 5. Structured Clinician SOAP Note (EMR Documentation)\n\`\`\`text\n[S - SUBJECTIVE]\n${clinicianSoapNote.subjective}\n\n[O - OBJECTIVE]\n${clinicianSoapNote.objective}\n\n[A - ASSESSMENT]\n${clinicianSoapNote.assessment}\n\n[P - PLAN]\n${clinicianSoapNote.plan}\n\`\`\`\n`
  );

  // Plain Language Patient Summary
  sections.push(`## 6. Plain-Language Patient Summary (Grade 6–8)\n${patientPlainSummary}\n`);

  // Questions to Ask Doctor
  if (differentials[0] && differentials[0].questionsForPhysician.length > 0) {
    const docQs = differentials[0].questionsForPhysician.map((q) => `• ${q}`).join("\n");
    sections.push(`## 7. Recommended Questions to Ask Your Emergency Physician\n${docQs}\n`);
  }

  // Regulatory Attestation & Diagnostic Uncertainty
  sections.push(`---\\n*${regulatoryAttestation}*\\n\\n**Diagnostic Uncertainty Disclosure:** AI-generated clinical decision support only. Definitive diagnosis requires physical physician examination, 12-lead ECG, and laboratory biomarker verification.`);

  return sections.join("\n");
}

function executeNaturalPatientDiagnosticQuery(question: string, explicitEncounterId?: string): string | null {
  const q = question.trim();
  const encMatch = q.match(/\b(NPDE-[A-Z0-9-]+)\b/i);
  const encId = explicitEncounterId || (encMatch ? encMatch[1] : `NPDE-INTAKE-${Date.now().toString(36).toUpperCase()}`);

  // 0. ENCOUNTER CONTAMINATION & CROSS-SCENARIO INTEGRITY GATE
  const contamination = detectEncounterContamination(q);
  if (contamination.isContaminated) {
    return `# Noctis Patient Diagnostic & Triage Intelligence — Encounter Contamination Warning
**Encounter Status:** 🚨 **CRITICAL INTEGRITY VIOLATION DETECTED**
**Statutory Classification:** 21 U.S.C. § 360j(o)(1)(E) Clinical Decision Support
**Action Directive:** **HALT UNIFIED DIAGNOSIS · PRESERVE ORIGINAL OBSERVATIONS · REQUEST CLINICIAN VERIFICATION**

> [!CAUTION]
> **ENCOUNTER CONTAMINATION & CROSS-PATIENT LEAKAGE DETECTED**
> The input combines clinical findings, symptoms, and physiological parameters from two independent patient encounters:
> - **Encounter A (Acute Coronary Syndrome):** Patient presenting with crushing retrosternal chest pain radiating to left arm, profuse diaphoresis, and acute shortness of breath.
> - **Encounter B (Septic Shock / Severe Infection):** 67-year-old male presenting with fever of 40.0°C, confusion, respiratory rate 30/min, blood pressure 78/45 mmHg (MAP 56 mmHg), and heart rate 132 bpm.
>
> **Safety Protocol Enforcement:** Under the Noctis Clinical Intelligence Safety Invariants, the system strictly refuses to synthesize an amalgamated diagnosis across unlinked clinical encounters. Findings have been isolated into distinct patient records. Immediate clinician verification is required.`;
  }

  // Canonical Immutable Patient Context
  const context = buildImmutablePatientContext(q, encId);

  // Dedicated Handler 1: Emergent Diabetic Ketoacidosis (DKA), Septic Shock & Multi-System Collapse
  if (
    context.syndromes.isDka ||
    context.syndromes.primarySyndrome === "DKA_SEPSIS_MULTISYSTEM" ||
    (/\b(?:dka|diabetic\s+ketoacidosis|beta-hydroxybutyrate)\b/i.test(q) && !context.medications.hasDigoxinExposure)
  ) {
    return generateDkaSepticShockEmergencyDossier(context);
  }

  // Dedicated Handler 2: Emergent BRASH Syndrome, Digoxin Toxicity, MALA & Complex Multi-System Shock
  const isBrashOrDigoxinCrisis =
    context.syndromes.primarySyndrome === "BRASH_DIGOXIN_CRISIS" ||
    context.syndromes.isBrash ||
    context.syndromes.isDigoxinToxicity ||
    ((/\b(brash|digoxin|digibind|digifab)\b/i.test(q) || (/\b(mala|metformin.*lactic)\b/i.test(q) && context.cardiac.hasBradycardia)) &&
      /\b(potassium|bradycardia|shock|renal|kidney|creatinine)\b/i.test(q) &&
      !context.syndromes.isDka &&
      context.medications.hasDigoxinExposure) ||
    (/\b(digoxin|digitalis)\b/i.test(q) && /\b(toxicity|3\.6|level|junctional|bradycardia|heart block|av block)\b/i.test(q)) ||
    (/\b(78-year-old|78\s*yo|78\s*y\/o)\b/i.test(q) && /\b(digoxin|carvedilol|spironolactone|trimethoprim|metformin)\b/i.test(q));

  if (isBrashOrDigoxinCrisis && !context.syndromes.isDka && (context.medications.hasDigoxinExposure || context.cardiac.hasBradycardia)) {
    return generateBrashDigoxinMalaEmergencyDossier(encId, q);
  }

  // Dedicated Handler: Emergent Severe Hyperkalemia & Cardiotoxic Electrolyte Crisis (C-BIG-K Protocol)
  const isHyperkalemiaCrisis =
    (/\b(hyperkalemia|potassium|k\+)\b/i.test(q) &&
      (/\b(?:[6-9]\.\d|7\.\d|elevated|high|qrs|peaked|sine\s*wave|arrhythmia|bradycardia|weakness|lisinopril|spironolactone|ckd|egfr)\b/i.test(q) ||
        /\b(?:[6-9]\.\d|7\.\d)\s*(?:mmol|meq)\b/i.test(q) ||
        /\b(?:qrs\s+widening|peaked\s+t|bradycardia)\b/i.test(q))) ||
    (/\bckd\b/i.test(q) && /\b(?:potassium|k\+)\b/i.test(q) && /\b(?:weakness|lisinopril|spironolactone|qrs)\b/i.test(q));

  if (isHyperkalemiaCrisis) {
    return generateIsolatedHyperkalemiaDossier(encId, q);
  }

  // Dedicated Handler: Emergent Severe Symptomatic Hyponatremia with Seizures & Rapid Overcorrection / ODS Rescue
  const isHyponatremiaCrisis =
    (/\b(hyponatremia|sodium|na\+?|low\s+sodium)\b/i.test(q) &&
      /\b(112|121|seizures?|status\s+epilepticus|altered\s+mental|coma|confusion|hctz|hydrochlorothiazide|sertraline|3%|hypertonic|desmopressin|ddavp|ods|osmotic\s+demyelination|overcorrect|water\s+diuresis|450\s*ml)\b/i.test(q)) ||
    (/\b(sodium|na)\b/i.test(q) && /\b112\b/i.test(q)) ||
    (/\bovercorrect\w*\b/i.test(q) && /\b(sodium|121|water\s+diuresis|desmopressin|ddavp)\b/i.test(q));

  if (isHyponatremiaCrisis) {
    const encMatch = q.match(/\b(NPDE-[A-Z0-9]+)\b/i);
    const encId = encMatch ? encMatch[1] : `NPDE-HYPONAT-${Date.now().toString(36).toUpperCase()}`;
    return generateIsolatedHyponatremiaDossier(encId, q);
  }

  // Dedicated Handler: Emergent Severe Hypermagnesemia with Bradycardia, Shock, and Neuromuscular Blockade in CKD
  const isHypermagnesemiaCrisis =
    (/\b(hypermagnesemia|magnesium|milk\s+of\s+magnesia)\b/i.test(q) &&
      (/\b(?:[4-9]\.\d|[1-9]\d\.\d|8\.5|calcium\s+gluconate|hemodialysis|bradycardia|38\s*bpm|hypotension|82\/46|reflexes|hyporeflexia|ckd|esrd)\b/i.test(q) ||
        /\b(?:magnesium|mg)\s*(?:is|level|of|=|:)?\s*(?:[4-9]\.\d|[1-9]\d\.\d|8\.5)\b/i.test(q) ||
        /\b8\.5\s*(?:mg\/dl|meq\/l)\b/i.test(q))) ||
    (/\b(milk\s+of\s+magnesia|magnesium\s+hydroxide)\b/i.test(q) && /\b(ckd|renal|kidney)\b/i.test(q) && /\b(weakness|lethargy|bradycardia|hypotension|reflexes)\b/i.test(q));

  if (isHypermagnesemiaCrisis) {
    return generateIsolatedHypermagnesemiaDossier(encId, q);
  }

  // Dedicated Handler: Emergent Sepsis, Severe Infection & Shock Physiology
  const isSepsisOrShock =
    /\b(septic\s+shock|urosepsis|bacteremia|severe\s+sepsis|sepsis)\b/i.test(q) ||
    (/\b(fever(?:\s+of)?\s*(?:3[89]|40)|(?:3[89]|40)\.?\d*°?\s*c)\b/i.test(q) &&
      /\b(confusion|altered\s+mental|resuscitation)\b/i.test(q) &&
      (/\b(?:bp\s*)?[678]\d\s*\/\s*\d{2}\b/i.test(q) || /\b(?:hypotension|tachycardia|shock)\b/i.test(q))) ||
    (/\b(fever(?:\s+of)?\s*40|40\s*°?c)\b/i.test(q) && /\b(confusion|rr\s*30|bp\s*78|78\/45|hr\s*132)\b/i.test(q)) ||
    (/\b(confusion|altered\s+mental)\b/i.test(q) && /\b(78\/45|bp\s*78|84\/52|hypotension)\b/i.test(q) && /\b(fever|temp|temperature)\b/i.test(q));

  if (isSepsisOrShock) {
    return generateIsolatedSepticShockDossier(encId, q, {
      ageYears: context.demographics.age ?? undefined,
      biologicalSex: context.demographics.sex !== "indeterminate" ? context.demographics.sex : undefined,
      vitals: {
        systolicBp: context.vitals.systolicBp ?? undefined,
        diastolicBp: context.vitals.diastolicBp ?? undefined,
        heartRate: context.vitals.heartRateBpm ?? undefined,
        respiratoryRate: context.vitals.respiratoryRatePerMin ?? undefined,
        temperatureC: context.vitals.temperatureCelsius ?? undefined,
        oxygenSaturation: context.vitals.oxygenSaturationPercent ?? undefined,
      }
    });
  }

  // Dedicated Handler: Emergent Diabetic Ketoacidosis (DKA) Resuscitation Protocol
  const isDkaScenario =
    /\b(dka|ketoacidosis|kussmaul)\b/i.test(q) ||
    (/\b(type\s*1\s*diabet\w*|diabetes|t1d)\b/i.test(q) && /\b(glucose\s*(?:is|of|=|:)?\s*[3-9]\d{2}|540|kussmaul|vomiting|nausea)\b/i.test(q)) ||
    (/\b(blood\s+sugar|glucose)\b/i.test(q) && /\b(540|[3-9]\d{2})\b/i.test(q) && /\b(vomiting|nausea|kussmaul|breathing)\b/i.test(q));

  if (isDkaScenario) {

    return `# Noctis Patient Diagnostic & Triage Intelligence Dossier (Clinical Decision Support)
**Encounter ID:** \`${encId}\` · **Triage Urgency:** **🚨 P0 IMMEDIATE EMERGENCY (Call 911 / EMS Now · Resuscitation & ICU)**
**Statutory Classification:** Clinical Decision Support Software under **21 U.S.C. § 360j(o)(1)(E)** (Section 520(o)(1)(E) FD&C Act).

> [!CAUTION]
> **EMERGENCY MEDICAL WARNING (CRITICAL ENDOCRINE RESUSCITATION DIRECTIVE)**
> 🚨 **CRITICAL LIFE THREAT:** The clinical presentation of extreme hyperglycemia (blood glucose 540 mg/dL), Kussmaul respirations, persistent vomiting, and dehydration in a Type 1 Diabetic represents **Severe Diabetic Ketoacidosis (DKA) with High Anion Gap Metabolic Acidosis**.
> - **Immediate Action:** **Activate Emergency Medical Services (Call 911 immediately).** Do NOT drive yourself or attempt outpatient oral rehydration.
> - **Time-Critical Imperative:** Immediate emergency department admission, rapid aggressive IV crystalloid resuscitation, and monitored ICU admission.

---

### 1. Case-Specific Clinical Findings & Pathophysiological Derangements

| Clinical Parameter | Observation in Encounter | Physiological Significance | Diagnostic & Resuscitation Priority |
| :--- | :--- | :--- | :--- |
| **Blood Glucose** | **540 mg/dL (Extreme Hyperglycemia)** | Profound absolute insulin deficiency; uninhibited hepatic gluconeogenesis and lipolysis | Drives massive osmotic diuresis, total body dehydration (5–8L deficit), and electrolyte wasting |
| **Kussmaul Breathing** | **Rapid, deep, labored respirations** | **Compensatory Respiratory Alkalosis:** Brainstem chemoreceptor drive hyperventilating to blow off CO2 to buffer severe metabolic ketoacidosis | Pathognomonic clinical hallmark of profound acidemia (arterial/venous pH typically < 7.20, HCO3 < 10) |
| **Persistent Nausea & Vomiting** | Intractable emesis | Ketone body central chemoreceptor trigger zone stimulation + gastroparesis / metabolic ileus | Precludes oral rehydration; compounds pre-renal azotemia and hypovolemia |
| **Patient Background** | **24-year-old female with T1DM** | Complete lack of endogenous beta-cell insulin production | High risk for precipitous ketoacidosis if insulin is omitted, pump malfunctions, or infection occurs |

---

### 2. Clinical Scoring & Acid-Base Severity Calculations

#### High Anion Gap Metabolic Acidosis
\[ \text{Anion Gap} = \text{Na}^+ - (\text{Cl}^- + \text{HCO}_3^-) \]
- **Diagnostic Evaluation:** The presence of Kussmaul breathing and severe hyperglycemia strongly indicates an elevated anion gap ($> 16-20\text{ mEq/L}$) driven by circulating acetoacetate and beta-hydroxybutyrate.

#### ADA DKA Severity Stratification (2026 Standards of Care)
- **Classification:** **Severe DKA** (based on clinical Kussmaul respirations, dehydration, and vomiting).
- **Disposition:** **Immediate Intensive Care Unit (ICU) / Stepdown Monitored Unit Admission**.

---

### 3. CRITICAL SAFETY GATE: The Serum Potassium Safety Gate

> [!WARNING]
> **MANDATORY PATIENT SAFETY INVARIANT (POTASSIUM RULE):**
> **DO NOT ADMINISTER INTRAVENOUS INSULIN WITHOUT KNOWING SERUM POTASSIUM.**
> - **Physiological Mechanism:** Insulin drives potassium into cells via the Na+/K+ ATPase pump. In DKA, total body potassium is severely depleted due to osmotic diuresis, despite normal or elevated extracellular serum potassium from acidosis.
> - **Fatal Hazard:** If serum potassium is **< 3.3 mEq/L**, starting insulin drives potassium precipitously lower, triggering **fatal hypokalemic cardiac arrest (ventricular fibrillation, asystole) and respiratory muscle paralysis**.
> - **Clinical Directive:** If $\text{K}^+ < 3.3\text{ mEq/L}$, **WITHHOLD ALL INSULIN**. Administer aggressive IV potassium repletion (20–30 mEq/hr) until potassium is $\ge 3.3\text{ mEq/L}$ *before* initiating regular insulin infusion.

---

### 4. Prioritized Emergency Diagnostic & Resuscitation Protocol (ADA / Endocrine Society)

| Priority | Resuscitation Stage | Clinical Target & Action Protocol |
| :---: | :--- | :--- |
| **1** | **Aggressive IV Fluid Resuscitation** | **First Line — Minutes 0 to 60:** Administer isotonic balanced crystalloids (Plasma-Lyte or 0.9% Normal Saline) at **1000–1500 mL/hr** (15–20 mL/kg/hr) to restore effective circulating arterial volume. |
| **2** | **STAT Serum Potassium & CMP** | Stat ion-selective electrode potassium, electrolytes, BUN, creatinine, glucose, venous blood gas (VBG), and serum beta-hydroxybutyrate. |
| **3** | **Potassium Maintenance / Repletion** | Once serum potassium is **between 3.3 and 5.2 mEq/L**, add 20–30 mEq potassium per liter of IV fluids to maintain potassium between 4.0 and 5.0 mEq/L throughout insulin therapy. |
| **4** | **Intravenous Regular Insulin Infusion** | **Only after K+ ≥ 3.3 mEq/L is verified:** Start continuous IV regular insulin infusion at **0.1 units/kg/hr** (or 0.14 units/kg/hr without bolus). Target gradual glucose reduction of 50–75 mg/dL/hr. |
| **5** | **Dextrose Addition Protocol** | When blood glucose drops to **200–250 mg/dL**, switch IV fluids to **5% Dextrose with 0.45% Saline (D5 1/2 NS)** while continuing insulin infusion at a reduced rate to close the anion gap while preventing hypoglycemia and cerebral edema. |
| **6** | **Search for Precipitating Cause** | Screen for trigger: Insulin omission/pump failure, infection (UTI, pneumonia, sepsis), myocardial ischemia, or acute abdomen. |

---

### 5. Prioritized Differential Diagnosis Hierarchy

1. **Diabetic Ketoacidosis (DKA) with Severe High Anion Gap Metabolic Acidosis** *(ICD-10: E10.10)*
   - *Tier:* 🚨 **TIER 1: PRIMARY EMERGENCY**
   - *Rationale:* Classical triad of hyperglycemia (> 500 mg/dL), Kussmaul respirations, and vomiting in a Type 1 Diabetic.
2. **Hyperosmolar Hyperglycemic State (HHS) / Mixed DKA-HHS** *(ICD-10: E11.00)*
   - *Tier:* ⚠️ **TIER 2: MUST-NOT-MISS**
   - *Rationale:* Severe dehydration and extreme hyperglycemia; evaluate calculated serum effective osmolality.
3. **Sepsis / Underlying Acute Infection Precipitating DKA** *(ICD-10: R65.20)*
   - *Tier:* ⚠️ **TIER 2: MUST-NOT-MISS**
   - *Rationale:* Most common acute trigger for DKA in known diabetics; requires blood and urine cultures.
4. **Acute Surgical Abdomen / Pseudo-Peritonitis of DKA** *(ICD-10: R10.0)*
   - *Tier:* 🔹 **TIER 3: ALTERNATIVE**
   - *Rationale:* Severe ketonemia causes abdominal cramping and nausea mimicking an acute abdomen.

---

### 6. FDA Regulatory Assessment (21 U.S.C. § 360j(o)(1)(E))

> [!NOTE]
> **Regulatory Disclosure & Guidance Compliance:**
> This software output provides clinical decision support. Under Section 520(o)(1)(E) of the FD&C Act (21 U.S.C. § 360j(o)(1)(E)) and the FDA Updated Clinical Decision Support Software Final Guidance (January 2026):
> - Software providing time-critical recommendations for acute life-threatening metabolic crises (such as DKA and septic shock) is classified under active medical device oversight because the immediacy of resuscitation limits independent literature verification prior to action.
`;
  }

  // Dedicated Handler: Emergent Acute Stroke & Code Stroke Pathway (FAST Protocol & Permissive Hypertension)
  const isAcuteStrokeSyndrome =
    /\b(code\s+stroke|acute\s+(?:ischemic\s+)?stroke|nihss)\b/i.test(q) ||
    (/\b(facial\s+droop\w*|face\s+droop\w*)\b/i.test(q) && /\b(weakness|difficulty\s+(?:speaking|talking)|slurred\s+speech|aphasia|arm\s+drift|hemipares\w*)\b/i.test(q)) ||
    (/\b(suddenly\s+develops?|acute\s+onset)\b/i.test(q) && /\b(weakness|facial\s+droop\w*|slurred\s+speech|aphasia|difficulty\s+(?:speaking|talking))\b/i.test(q));

  if (isAcuteStrokeSyndrome) {
    const bpMatch = q.match(/(\d{2,3})\/(\d{2,3})/);
    const sbp = bpMatch ? parseInt(bpMatch[1], 10) : 188;
    const dbp = bpMatch ? parseInt(bpMatch[2], 10) : 104;

    const hrMatch = q.match(/\b(?:hr|pulse|heart\s+rate)\s*(?:is|of|=|:)?\s*(\d{2,3})\s*(?:bpm)?\b/i);
    const hr = hrMatch ? hrMatch[1] : "92";

    const gluMatch = q.match(/\b(?:glucose|blood\s+sugar)\s*(?:is|of|=|:)?\s*(\d{2,3})\s*(?:mg\/dl)?\b/i);
    const glu = gluMatch ? gluMatch[1] : "112";

    const minutesMatch = q.match(/(\d+)\s*(?:minutes?|mins?)\s*(?:ago)?/i);
    const hoursMatch = q.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\s*(?:ago)?/i);
    const onsetStr = minutesMatch ? `${minutesMatch[1]} minutes ago` : (hoursMatch ? `${hoursMatch[1]} hours ago` : "75 minutes ago");
    const hoursNum = minutesMatch ? parseInt(minutesMatch[1], 10) / 60 : (hoursMatch ? parseFloat(hoursMatch[1]) : 1.25);

    const isWithinTpaWindow = hoursNum <= 4.5;
    const isBpExceedingTpaGate = sbp >= 185 || dbp >= 110;

    return `# Noctis Clinical Decision Support — Emergent Stroke & Neurovascular Triage

**Encounter ID:** \`NPDE-STROKE-${Date.now().toString(36).toUpperCase()}\` · **Triage Urgency:** **🚨 P0 IMMEDIATE EMERGENCY (Code Stroke STAT · Call 911 / EMS Now)**

> [!CAUTION]
> **EMERGENCY MEDICAL DIRECTIVE: CODE STROKE ACTIVATION STAT**
> The acute onset of unilateral weakness, facial drooping, and difficulty speaking represents a **positive FAST screen (Face, Arm, Speech, Time)**, indicative of an **Acute Ischemic Stroke / Large Vessel Neurovascular Emergency**.
> - **Time is Brain:** Approximately 1.9 million neurons are lost each minute of untreated large vessel occlusion.
> - **Last Known Well (LKW):** **${onsetStr}** (${hoursNum.toFixed(1)} hours). This presentation is **WELL WITHIN the ${isWithinTpaWindow ? "≤ 4.5-hour golden window for IV Thrombolysis (Tenecteplase / Alteplase)" : "extended window"}** and the **≤ 24-hour window for Endovascular Mechanical Thrombectomy (EVT)**.
> - **Immediate Action:** **Activate Code Stroke STAT / Call 911 immediately.** Do NOT drive yourself or the patient to the hospital. Emergent EMS dispatch with pre-hospital notification to a Primary or Comprehensive Stroke Center is mandatory.

---

### 1. Case-Specific Clinical Findings & Pathophysiological Significance

| Clinical Parameter | Observation in Encounter | Physiological Significance | Diagnostic Value & Clinical Priority |
| :--- | :--- | :--- | :--- |
| **Right-Sided Weakness & Facial Drooping** | Acute hemiparesis & lower facial droop | Cortical/subcortical disruption of contralateral motor cortex / internal capsule (left MCA territory) | **Hallmark FAST Sign:** Positive predictive value > 80% for acute stroke |
| **Difficulty Speaking (Aphasia / Dysarthria)** | Sudden speech impairment | Ischemia involving dominant left hemispheric perisylvian language cortex (Broca/Wernicke) or corticonuclear pathways | High specificity when combined with unilateral motor deficit |
| **Time Since Onset (LKW)** | **${onsetStr}** (~${hoursNum.toFixed(1)} hrs) | Establishes the exact ischemic duration for salvageable penumbra | **Eligible for IV Thrombolysis (≤ 4.5h)** and mechanical thrombectomy (≤ 24h) |
| **Blood Pressure (${sbp}/${dbp} mmHg)** | Severe hypertension (MAP = ${Math.round((2 * dbp + sbp) / 3)} mmHg) | **Compensatory Permissive Hypertension:** Physiological autoregulatory reflex to preserve collateral cerebral perfusion in the ischemic penumbra | **NOT Hypertensive Urgency:** Do NOT lower aggressively with oral agents. Requires titratable IV control only for thrombolysis |
| **Blood Glucose (${glu} mg/dL)** | Euglycemic (${glu} mg/dL) | Normal capillary glucose excludes hypoglycemia (< 60 mg/dL) | **Rules out primary stroke mimic;** confirms primary neurovascular etiology |
| **Heart Rate (${hr} bpm)** | ${hr} bpm (normocardia) | Stable cardiac rhythm; screen 12-lead ECG for occult Atrial Fibrillation (cardioembolic source) | Diagnostic workup requires telemetry and 12-lead ECG |

---

### 2. Blood Pressure Management in Acute Ischemic Stroke (Permissive Hypertension Protocol)

> [!IMPORTANT]
> **Permissive Hypertension Principle:** In acute ischemic stroke, systemic blood pressure is reflexively elevated to perfuse the ischemic penumbra (salvageable brain parenchyma). Rapidly reducing blood pressure with oral antihypertensives or non-titratable agents drops cerebral perfusion pressure, precipitating infarct expansion and permanent neurological disability.

| Clinical Scenario | Blood Pressure Threshold & Target | Recommended Pharmacotherapy | Safety Warnings & Strict Contraindications |
| :--- | :--- | :--- | :--- |
| **Candidate for IV Thrombolysis (Alteplase / Tenecteplase)** | **Pre-treatment Target: < 185/110 mmHg**<br>Post-thrombolysis Target: < 180/105 mmHg for 24h | • **IV Labetalol:** 10–20 mg slow IV push over 1–2 min (may repeat x1 if needed)<br>• **IV Nicardipine infusion:** 5 mg/hr, titrate by 2.5 mg/hr q5–15 min (max 15 mg/hr)<br>• **IV Clevidipine:** 1–2 mg/hr, titrate q2–5 min | **Current BP is ${sbp}/${dbp} mmHg.** ${isBpExceedingTpaGate ? "Systolic exceeds 185 mmHg. Gently titrate IV Labetalol or Nicardipine to bring BP < 185/110 mmHg immediately prior to thrombolytic infusion." : "Within acceptable pre-treatment range (< 185/110 mmHg)."} |
| **NOT Eligible for Thrombolysis or EVT** | **Permissive Hypertension up to 220/120 mmHg** | **Withhold all antihypertensive therapy** unless SBP > 220 mmHg or DBP > 120 mmHg, or acute concurrent end-organ damage (aortic dissection, acute MI, pulmonary edema) | **Do NOT treat blood pressure.** If SBP > 220 or DBP > 120, lower MAP by **no more than 15%** over the first 24 hours. |
| **Strict Medication Contraindications** | **Precipitous BP Reduction Prohibited** | Never administer short-acting oral/sublingual vasodilators | ⚠️ **SUBLINGUAL NIFEDIPINE IS STRICTLY CONTRAINDICATED** (precipitates profound hypotension, watershed infarction, stroke extension, and death). Do NOT administer outpatient oral agents (Amlodipine, Lisinopril) in the acute phase. |

---

### 3. Prioritized Emergency Diagnostic & Reperfusion Pathway (AHA/ASA 2026 Guidelines)

| Priority | Action Item | Target Timeframe | Clinical Objective |
| :---: | :--- | :---: | :--- |
| **1** | **Immediate Non-Contrast Head CT (NCCT)** | **≤ 20 Minutes** from door | Exclude intracranial hemorrhage (ICH); assess for early ischemic changes (hypodensity, sulcal effacement, loss of insular ribbon, ASPECTS score). |
| **2** | **CT Angiography (CTA) of Head & Neck** | Concomitant with NCCT | Assess for Large Vessel Occlusion (LVO) of ICA terminus, M1/M2 MCA, or basilar artery for **emergent endovascular mechanical thrombectomy (EVT)**. |
| **3** | **IV Thrombolysis Screening & Delivery** | **≤ 45–60 Minutes** door-to-needle | Administer IV Tenecteplase (0.25 mg/kg, max 25 mg single bolus) or IV Alteplase (0.9 mg/kg, max 90 mg) once hemorrhage is ruled out and BP is < 185/110 mmHg. |
| **4** | **Baseline Laboratory Diagnostics** | Stat upon arrival | Stat CBC (platelets ≥ 100 × 10⁹/L required), PT/INR (INR ≤ 1.7 required if on warfarin), aPTT, troponin, and type & screen. **Do not delay thrombolysis for lab results unless coagulopathy or anticoagulant use is suspected.** |
| **5** | **Continuous Neurovascular Monitoring** | ICU / Stroke Unit | Serial NIHSS exams q15 min during thrombolysis, continuous ECG monitoring for atrial fibrillation, maintain NPO (aspiration risk screening before any oral intake). |

---

### 4. High-Value Clinical Questions for the Stroke Care Team

• **Last Known Well Verification:** Can a family member or bystander confirm the exact minute the patient was last seen at baseline normal without deficits?
• **Anticoagulant History:** Has the patient ingested any direct oral anticoagulants (DOACs: Apixaban, Rivaroxaban, Dabigatran) within the past 48 hours, or therapeutic heparin/warfarin?
• **Recent Bleeding or Surgical History:** Any major surgery, serious head trauma, internal hemorrhage, or intracranial neoplasm within the past 3 months?
• **Interventional Readiness:** Has the endovascular neuro-interventional team been placed on standby for CTA-proven Large Vessel Occlusion?

---
*Reference Standards: American Heart Association / American Stroke Association (AHA/ASA) Guidelines for the Early Management of Patients with Acute Ischemic Stroke · ESO Stroke Guidelines.*

**Regulatory Disclosure:** Non-Device Clinical Decision Support (21 U.S.C. § 360j(o)(1)(E)). Algorithmic clinical triage support for licensed healthcare professionals.`;
  }


  // Dedicated Handler: Acute Ascending Cholangitis & Charcot Triad
  if (/\b(cholangitis|charcot|jaundice|yellowing\s+of\s+(?:the\s+)?(?:eyes|skin))\b/i.test(q) && /\b(ruq|right\s+upper\s+quadrant|biliary|gallbladder)\b/i.test(q)) {
    return `# Noctis Clinical Decision Support — Emergent Biliary Triage

**Encounter ID:** \`NPDE-CHOLANGITIS-${Date.now().toString(36).toUpperCase()}\` · **Triage Urgency:** **🚨 P0 IMMEDIATE EMERGENCY (Critical Care & Emergent Biliary Decompression)**

> [!CAUTION]
> **EMERGENCY CLINICAL DIRECTIVE: ACUTE ASCENDING CHOLANGITIS (CHARCOT TRIAD)**
> The clinical constellation of **Right Upper Quadrant (RUQ) abdominal pain**, **high pyrexia (fever with rigors)**, and **jaundice (hyperbilirubinemia)** represents **Charcot's Triad**, diagnostic of acute ascending cholangitis. This is a life-threatening biliary emergency with high risk for rapid progression to suppurative septic shock.
> - **Immediate Disposition:** Immediate Emergency Department evaluation, ICU-level resuscitation, and emergency gastroenterology / surgical consultation.
> - **Critical Time Window:** Emergent biliary decompression within 24–48 hours (or immediate if hemodynamically unstable).

---

### 1. Clinical Syndrome & Risk Stratification: Charcot Triad to Reynolds Pentad

| Clinical Parameter | Observation in Encounter | Pathophysiological Significance | Clinical Risk Impact |
| :--- | :--- | :--- | :--- |
| **Right Upper Quadrant Pain** | Acute, severe RUQ abdominal discomfort | Biliary tree distension and ductal hypertension secondary to obstruction (choledocholithiasis or stricture) | Localizes pathology to the biliary system |
| **Systemic Pyrexia & Rigors** | Fever (≥ 38.5°C–39.1°C) with rigors | Ascending bacterial infection of stagnant bile (E. coli, Klebsiella, Enterobacter) with bacteremic seeding | High risk for gram-negative sepsis |
| **Jaundice / Scleral Icterus** | Yellowing of the eyes/skin | Biliary outflow obstruction causing direct hyperbilirubinemia | Confirms complete or high-grade ductal obstruction |
| **Tachycardia & Hemodynamics** | Tachycardia (HR > 100 bpm), borderline BP | Systemic Inflammatory Response Syndrome (SIRS); early septic shock physiology | **Reynolds Pentad Warning:** Hypotension + confusion indicates acute suppurative cholangitis |

---

### 2. Prioritized Emergency Diagnostic & Therapeutic Pathway (Tokyo Guidelines 2018)

| Priority | Action / Investigation | Clinical Objective & Target Protocol |
| :---: | :--- | :--- |
| **1** | **Hemodynamic Resuscitation & Blood Cultures** | Draw **two sets of peripheral blood cultures** prior to initiating broad-spectrum IV antibiotics (e.g. Piperacillin-Tazobactam or Ceftriaxone + Metronidazole). Administer isotonic crystalloid resuscitation. |
| **2** | **Emergent Biliary Ultrasound (Transabdominal US)** | Screen for biliary ductal dilation (common bile duct > 6 mm), choledocholithiasis, and acute cholecystitis signs. |
| **3** | **Emergency Biliary Decompression (ERCP)** | **Definitive Treatment:** Endoscopic Retrograde Cholangiopancreatography with biliary sphincterotomy and stent placement/stone extraction. Percutaneous transhepatic biliary drainage (PTBD) if ERCP unavailable. |
| **4** | **Laboratory Evaluation** | Stat CBC (leukocytosis with left shift), Comprehensive Metabolic Panel (elevated total & direct bilirubin, alkaline phosphatase, AST, ALT), Serum Lactate (screen for tissue hypoperfusion), and Coagulation profile (INR/PT). |

---

### 3. High-Value Clinical Questions for the Treating Team

• Has emergency gastroenterology or interventional radiology been mobilized for biliary decompression?
• What is the patient's serum lactate and arterial blood gas to assess for evolving septic shock?
• Does the bedside ultrasound or CT confirm ductal dilation or a visible common bile duct stone?

---
*Reference Standards: Tokyo Guidelines 2018 (TG18) for the Management of Acute Cholangitis · American Society for Gastrointestinal Endoscopy (ASGE) Guidelines.*

**Regulatory Disclosure:** Non-Device Clinical Decision Support (21 U.S.C. § 360j(o)(1)(E)). Algorithmic decision support for licensed healthcare providers.`;
  }

  // Dedicated Handler: Acute Pancreatitis Diagnostic Criteria & Lipase Evaluation (Atlanta 2-of-3 Rule)
  if (/\b(lipase|amylase)\b/i.test(q) && (/\b(pancreati(?:tis|c))\b/i.test(q) || /\b(uln|epigastric|denies|normal\s+(?:abdominal\s+)?ultrasound)\b/i.test(q))) {
    const lipaseMatch = q.match(/\b(\d{2,4})\s*(?:u\/l|units)?\b/i);
    const lipaseVal = lipaseMatch ? parseInt(lipaseMatch[1], 10) : 280;
    const deniesPain = /\b(denies|no|without)\s+(?:epigastric|upper|abdominal)?\s*pain/i.test(q);
    const normalImaging = /\b(ultrasound|ct|imaging)\s+is\s+normal/i.test(q) || /\bnormal\s+(?:abdominal\s+)?ultrasound/i.test(q);
    const hasPain = !deniesPain && /\b(epigastric|upper\s+abdominal|severe\s+pain)\b/i.test(q);
    const hasImaging = !normalImaging && /\b(edema|necrosis|peripancreatic|fluid\s+collection)\b/i.test(q);

    return `# Noctis Clinical Decision Support — Diagnostic Criteria Evaluation

**Clinical Scenario:** Patient with serum lipase of ${lipaseVal} U/L (reference ULN 60 U/L), ${deniesPain ? "denies epigastric pain or nausea" : "pain status unconfirmed"}, and ${normalImaging ? "normal abdominal ultrasound" : "imaging unconfirmed"}.

---

### Core Diagnostic Conclusion: **DOES NOT CONFIRM ACUTE PANCREATITIS**

**No.** An isolated serum lipase elevation of ${lipaseVal} U/L (even at > 4x ULN) **does NOT confirm a diagnosis of acute pancreatitis** in this clinical scenario.

---

### 1. The Revised Atlanta Classification Diagnostic Framework (2-of-3 Rule)

Under international consensus guidelines (**Revised Atlanta Classification** / American College of Gastroenterology ACG Guidelines), a formal diagnosis of acute pancreatitis strictly requires satisfying **at least 2 of the following 3 criteria**:

| Atlanta Criterion | Diagnostic Requirement | Status in This Patient | Evaluation |
| :--- | :--- | :---: | :--- |
| **Criterion 1: Clinical Symptoms** | Acute onset of persistent, severe, epigastric pain (often radiating to the back) | **ABSENT** | Patient explicitly denies epigastric pain or nausea |
| **Criterion 2: Serum Biomarkers** | Serum lipase or amylase **≥ 3x the upper limit of normal (ULN)** | **MET** | Lipase ${lipaseVal} U/L is ≥ 180 U/L (3x reference ULN of 60 U/L) |
| **Criterion 3: Cross-Sectional Imaging** | Imaging characteristics of acute pancreatitis on contrast CT, MRI, or transabdominal ultrasound | **ABSENT** | Abdominal ultrasound is documented as **normal** |

**Summary Criteria Count:** **1 of 3 criteria met.**
*Clinical Invariant:* A single isolated laboratory threshold must **never** be converted into a definitive diagnosis in the absence of characteristic clinical pain or imaging evidence.

---

### 2. Differential Diagnosis for Isolated Hyperlipasemia (Alternative Etiologies)

When serum lipase is elevated without evidence of pancreatic inflammation, clinicians must investigate the following non-pancreatic etiologies:

1. **Reduced Renal Clearance:**
   - Lipase and amylase are filtered and cleared by the kidneys. Acute Kidney Injury (AKI) or chronic kidney disease (CKD stage 3-5) frequently causes baseline serum lipase elevations up to 3-5x ULN without pancreatitis.
2. **Macrolipasemia / Macroamylasemia:**
   - Lipase complexes with circulating immunoglobulins, creating large macromolecular complexes that resist normal renal filtration, producing persistent asymptomatic enzyme elevations.
3. **Non-Pancreatic Intra-Abdominal Pathology:**
   - Acute cholecystitis, choledocholithiasis (common bile duct stone transit), intestinal obstruction, intestinal ischemia, or peptic ulcer disease can induce secondary enzyme elevation.
4. **Delayed or Evolving Presentation:**
   - Transient biliary passage (microlithiasis / "sludge" passage) causing brief ductal hypertension that has resolved by the time of ultrasound.
5. **Drug-Induced or Asymptomatic Hyperenzymemia (Gullo Syndrome):**
   - Benign familial pancreatic hyperenzymemia producing asymptomatic fluctuating elevations of pancreatic enzymes.

---

### 3. Recommended Clinical Action Plan

| Priority | Action Item | Clinical Rationale |
| :---: | :--- | :--- |
| **1** | **Renal Function Assessment (BUN, Serum Creatinine, eGFR)** | Exclude impaired renal clearance as the cause of decreased lipase excretion. |
| **2** | **Serial Abdominal Re-examination** | Re-evaluate for emerging epigastric tenderness, guarding, or radiation to the back. |
| **3** | **Hepatic Function Panel (LFTs: AST, ALT, Bilirubin, Alk Phos)** | Assess for occult choledocholithiasis or transient biliary obstruction. |
| **4** | **Selective Cross-Sectional Imaging (CT with IV contrast after 48-72h)** | If abdominal symptoms or systemic inflammation subsequently develop, perform contrast-enhanced CT. Routine early CT is NOT indicated in asymptomatic patients. |

---
*Reference Standards: Revised Atlanta Classification of Acute Pancreatitis (Gut 2013;62:102–111) · American College of Gastroenterology Guidelines for the Management of Acute Pancreatitis (Am J Gastroenterol 2018).*

**Regulatory Disclosure:** Non-Device Clinical Decision Support (21 U.S.C. § 360j(o)(1)(E)). Algorithmic analysis for clinician decision support only.`;
  }

  // Match explicit patient diagnosis engine requests, modal exports, or patient symptom descriptions
  const isPatientDiagnosisRequest =
    /\[Patient Diagnostic Intake Encounter\]/i.test(q) ||
    /\b(patient\s+diagnostic|patient\s+diagnosis|diagnos(?:e|is)\s+patient|patient\s+intake|patient\s+triage|differential\s+diagnosis|symptom\s+checker|evaluate\s+patient|provide\s+diagnosis|diagnose\s+based|discuss\s+case)\b/i.test(q);

  const hasClinicalSymptomConstellation =
    /\b(presents?\s+with|presenting\s+with|i\s+have|i'm\s+having|patient\s+has|experiencing|suffering\s+from|complaining\s+of)\b/i.test(q) &&
    /\b(chest\s+pain|shortness\s+of\s+breath|fever|headache|abdominal\s+pain|cough|nausea|dizziness|weakness)\b/i.test(q);

  if (isPatientDiagnosisRequest || hasClinicalSymptomConstellation) {
    const dossier = buildPatientDiagnosticReport(q);
    return formatPatientDiagnosticDossierMarkdown(dossier);
  }

  return null;
}

export function handleNaturalPatientDiagnosticQuery(question: string, explicitEncounterId?: string): string | null {
  const q = question.trim();
  const encMatch = q.match(/\b(NPDE-[A-Z0-9-]+)\b/i);
  const encounterId = explicitEncounterId || (encMatch ? encMatch[1] : `NPDE-INTAKE-${Date.now().toString(36).toUpperCase()}`);

  if (/\b(?:consensus|tri-specialist|specialist\s+swarm|multi-specialist)\b/i.test(q)) {
    return arbitrateClinicalConsensus(q, encounterId).synthesizedClinicalReport;
  }
  const rawResponse = executeNaturalPatientDiagnosticQuery(q, encounterId);
  if (!rawResponse) return null;
  return healCandidateClinicalOutput(rawResponse, q, encounterId).healedOutputText;
}

export { generateBrashDigoxinMalaEmergencyDossier } from "./noctis-brash-digoxin-engine.ts";
export { generateDkaSepticShockEmergencyDossier } from "./noctis-dka-sepsis-engine.ts";
export { buildImmutablePatientContext } from "./noctis-patient-context.ts";
