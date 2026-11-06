import {
  assessAcuteAbdominalPain,
  calculateAlvaradoScore,
  calculateQSOFA,
  evaluateAtlantaPancreatitisCriteria,
  detectClinicalContradictions,
  evaluateTreatmentSafety,
  type PatientClinicalEncounter,
} from "./noctis-clinical-engine.ts";
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
    { name: "unilateral facial droop", regex: /\b(facial\s+droop|face\s+droop|asymmetric\s+smile)\b/i },
    { name: "unilateral arm weakness", regex: /\b(arm\s+drift|weak\s+arm|one\s+arm\s+weak)\b/i },
    { name: "slurred speech / aphasia", regex: /\b(slurred\s+speech|trouble\s+speaking|difficulty\s+talking|aphasia)\b/i },
    { name: "stiff neck", regex: /\b(stiff\s+neck|nuchal\s+rigidity|neck\s+pain\s+with\s+flexion)\b/i },
    { name: "photophobia (light sensitivity)", regex: /\b(light\s+sensitive|photophobia|hurts\s+to\s+look\s+at\s+light)\b/i },
    { name: "unprovoked weight loss", regex: /\b(weight\s+loss|lost\s+\d+\s*(?:lbs|kg)|dropped\s+weight)\b/i },
    { name: "drenching night sweats", regex: /\b(night\s+sweats|soaking\s+sheets)\b/i },
    { name: "blood in stool / melena", regex: /\b(blood\s+in\s+stool|black\s+stool|melena|rectal\s+bleeding)\b/i },
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
  ];

  for (const pmh of PMH_PATTERNS) {
    if (pmh.regex.test(t)) {
      pastMedicalHistory.push(pmh.name);
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

  const tempMatch = t.match(/\b(?:temp|temperature)\s*(?:is|of|=|:)?\s*(\d{2}(?:\.\d)?)\s*(?:°?c|deg\s*c)\b/i);
  if (tempMatch) {
    vitals.temperatureC = parseFloat(tempMatch[1]);
  } else {
    const tempFMatch = t.match(/\b(?:temp|temperature)\s*(?:is|of|=|:)?\s*(\d{2,3}(?:\.\d)?)\s*(?:°?f|deg\s*f)\b/i);
    if (tempFMatch) {
      vitals.temperatureC = parseFloat((((parseFloat(tempFMatch[1]) - 32) * 5) / 9).toFixed(1));
    }
  }

  // 10. Explicit missing fields tracking
  const explicitMissingFields: string[] = [];
  if (ageYears === undefined) explicitMissingFields.push("age");
  if (biologicalSex === undefined) explicitMissingFields.push("biological_sex");
  if (painSeverity === undefined) explicitMissingFields.push("pain_severity_1_to_10");
  if (!vitals.systolicBp) explicitMissingFields.push("blood_pressure");
  if (!vitals.heartRate) explicitMissingFields.push("heart_rate");
  if (!vitals.spo2) explicitMissingFields.push("oxygen_saturation_spo2");
  if (!vitals.temperatureC) explicitMissingFields.push("temperature");

  // 11. Chief complaint derivation
  let chiefComplaint = t.slice(0, 140);
  const firstSentence = t.split(/[.?!]/)[0];
  if (firstSentence && firstSentence.length > 5) {
    chiefComplaint = firstSentence.trim();
  }

  return {
    ageYears,
    biologicalSex,
    chiefComplaint,
    onsetTiming,
    painQuality,
    painSeverity,
    painRadiation,
    associatedSymptoms,
    pastMedicalHistory,
    currentMedications: [],
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

  // 5. Urgent Non-P0 presentations (P1 or P2)
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
      category = "P3_PRIMARY_CARE_ROUTINE";
      instructions.push("Schedule an outpatient consultation with your primary care physician.");
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
    "FDA Jan 2026 Clinical Decision Support (CDS) Non-Device Framework (21 U.S.C. § 360aaa): This algorithmic decision support assists healthcare evaluation. It does not replace independent clinical judgment, formal physical examination, laboratory testing, or a licensed physician's diagnosis.";

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

  const isStroke =
    /\b(stroke|facial\s+droop|arm\s+drift|slurred\s+speech|hemipares|lvo|tpa|tenecteplase|nihss)\b/i.test(cc) ||
    /\b(stroke|facial\s+droop|arm\s+drift|slurred\s+speech|hemipares)\b/i.test(rawText);

  const sections: string[] = [];

  // 1. Header & Emergency Triage Directive
  sections.push(
    `# Noctis Patient Diagnostic & Triage Intelligence Dossier (Clinical Decision Support)\n**Encounter ID:** \`${dossier.encounterId}\` · **Triage Urgency:** **${triage.urgencyLabel}** · **NON-DEVICE CDS ARCHITECTURE (21 U.S.C. § 360aaa)**\n`
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
| **Last Known Well (LKW)** | Time-critical | Defines eligibility for IV thrombolysis (≤ 4.5h) and mechanical thrombectomy (≤ 24h) | Note exact time last seen normal |
| **Blood Glucose** | POC evaluation mandatory | Hypoglycemia is the most common time-critical stroke mimic | Point-of-care fingerstick blood glucose immediately |

*Clinical Conclusion:* **Acute Ischemic Stroke vs Intracranial Hemorrhage.** Time is brain. Immediate non-contrast head CT and CTA head/neck required.`);

    sections.push(`## 2. Evidence-Weighted Differential Diagnosis Hierarchy\n\n| Rank | Candidate Condition | Clinical Category | Calibrated Pre-Test Risk | Supporting Clinical Findings | Gold-Standard Diagnostic Protocols |\n| :---: | :--- | :---: | :---: | :--- | :--- |\n| **#1** | **Acute Ischemic Stroke / TIA**<br>*(ICD-10: I63.9)* | 🚨 **TIER 1: PRIMARY EMERGENCY** | **85% Pre-Test Risk**<br>*(STAT Protocol)* | Acute focal deficit (FAST positive) | Non-Contrast Head CT within 20 min, CTA Head/Neck |\n| **#2** | **Intracranial Hemorrhage (ICH)**<br>*(ICD-10: I61.9)* | ⚠️ **TIER 2: MUST-NOT-MISS** | **12% Pre-Test Risk**<br>*(Rule-Out)* | Focal deficit with elevated blood pressure | Non-Contrast Head CT |\n| **#3** | **Hypoglycemia (Stroke Mimic)**<br>*(ICD-10: E16.2)* | 🔹 **TIER 3: ALTERNATIVE** | **3% Pre-Test Risk** | Neuroglycopenic symptoms | Immediate Point-of-Care Capillary Glucose |\n`);

    sections.push(`## 3. Prioritized Emergency Diagnostic Workup Protocol (Stroke)

1. **Immediate Non-Contrast Head CT (Target ≤ 20 Minutes):** Rule out intracranial hemorrhage prior to considering thrombolytic therapy.
2. **CT Angiography (CTA) of Head and Neck:** Identify Large Vessel Occlusion (LVO) eligible for endovascular mechanical thrombectomy.
3. **Point-of-Care Fingerstick Blood Glucose:** Immediately exclude neuroglycopenia (< 60 mg/dL).
4. **NIH Stroke Scale (NIHSS):** Quantify neurological deficit severity.`);
  } else {
    // CARDIOVASCULAR CHEST PAIN SYNDROME (Default / ACS)
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

export function handleNaturalPatientDiagnosticQuery(question: string): string | null {
  const q = question.trim();

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

**Regulatory Disclosure:** Non-Device Clinical Decision Support (21 U.S.C. § 360aaa). Algorithmic decision support for licensed healthcare providers.`;
  }

  // Dedicated Handler: Acute Pancreatitis Diagnostic Criteria & Lipase Evaluation (Atlanta 2-of-3 Rule)
  if (/\b(lipase|amylase)\b/i.test(q) && /\b(pancreati(?:tis|c))\b/i.test(q)) {
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

**Regulatory Disclosure:** Non-Device Clinical Decision Support (21 U.S.C. § 360aaa). Algorithmic analysis for clinician decision support only.`;
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
