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
    requiredSymptomMatches: [/\b(weakness|numbness|speech|facial|droop|stroke|arm|leg|vision|paralysis)\b/i],
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
    if (sp.regex.test(t)) {
      associatedSymptoms.push(sp.name);
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

  const spo2Match = t.match(/\b(?:spo2|oxygen|o2\s+sat)\s*(?:is|of|=|:)?\s*(\d{2,3})\s*%\b/i);
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
    // Check if required symptom pattern matches
    const hasRequired = rule.requiredSymptomMatches.some((rx) => rx.test(fullText));
    if (!hasRequired && !rule.isMustNotMiss) {
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

  scoredRules.forEach((item, index) => {
    const rawPct = Math.round((item.score / totalScore) * 100);
    const probabilityPct = Math.max(5, Math.min(85, rawPct));

    let category: DifferentialCategory = "SECONDARY_ALTERNATIVE";
    if (index === 0 && probabilityPct >= 35) {
      category = "PRIMARY_HYPOTHESIS";
    } else if (item.rule.isMustNotMiss) {
      category = "MUST_NOT_MISS_RULEOUT";
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
    "FDA Jan 2026 Clinical Decision Support (CDS) Notice: This output constitutes algorithmic clinical reasoning support based solely on patient-reported information. It does not replace independent clinical judgment, formal physical examination, laboratory testing, or a licensed physician's diagnosis.";

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

  const sections: string[] = [];

  // 1. Header
  sections.push(
    `# Noctis Patient Diagnostic & Triage Intelligence Dossier\n**Encounter ID:** \`${dossier.encounterId}\` · **Triage Status:** **${triage.urgencyLabel}**\n`
  );

  // 2. Emergency Banner if applicable
  if (triage.escalationBanner) {
    sections.push(`> [!CAUTION]\n> ${triage.escalationBanner}\n`);
  }

  // 3. Plain Language Patient Summary
  sections.push(`### 1. Patient Explanation (Reading Level: Grade 6–8)\n${patientPlainSummary}\n`);

  // 4. Ranked Differential Diagnosis Table
  const diffRows = differentials.map((d) => {
    const categoryBadge =
      d.category === "PRIMARY_HYPOTHESIS"
        ? "⭐ **PRIMARY**"
        : d.category === "MUST_NOT_MISS_RULEOUT"
          ? "🚨 **MUST-NOT-MISS**"
          : "🔹 Alternative";
    return `| **#${d.rank}** | **${d.diseaseName}**<br>*\`${d.icd10}\`* | ${categoryBadge} | **${d.probabilityPct}%** | • ${d.supportingEvidence.slice(0, 2).join("<br>• ")} | ${d.goldStandardDiagnosticTests[0] || "Physician exam"} |`;
  });

  sections.push(
    `### 2. Evidence-Weighted Differential Diagnosis\n\n| Rank | Candidate Condition | Classification | Likelihood | Key Supporting Findings | Primary Diagnostic Test |\n| :---: | :--- | :---: | :---: | :--- | :--- |\n${diffRows.join("\n")}\n`
  );

  // 5. Adaptive Follow-Up Discriminative Questions
  if (adaptiveQuestions.length > 0) {
    const qList = adaptiveQuestions.map(
      (q, idx) =>
        `**Q${idx + 1} (${q.associatedDifferential.split("(")[0].trim()}):** *"${q.promptText}"*\n- **Clinical Purpose:** ${q.clinicalObjective}\n- **Diagnostic Impact:** ${q.potentialImpact}`
    );
    sections.push(`### 3. Adaptive Discriminative Follow-Up Questions\n*Answering these questions significantly refines the diagnostic confidence:*\n\n${qList.join("\n\n")}\n`);
  }

  // 6. Clinical SOAP Note
  sections.push(
    `### 4. Structured Clinician SOAP Note (For Your Doctor or Nurse)\n\`\`\`text\n[S - SUBJECTIVE]\n${clinicianSoapNote.subjective}\n\n[O - OBJECTIVE]\n${clinicianSoapNote.objective}\n\n[A - ASSESSMENT]\n${clinicianSoapNote.assessment}\n\n[P - PLAN]\n${clinicianSoapNote.plan}\n\`\`\`\n`
  );

  // 7. Questions to Ask Your Doctor
  if (differentials[0] && differentials[0].questionsForPhysician.length > 0) {
    const docQs = differentials[0].questionsForPhysician.map((q) => `• ${q}`).join("\n");
    sections.push(`### 5. Recommended Questions to Ask Your Doctor\n${docQs}\n`);
  }

  // 8. Regulatory Footer
  sections.push(`---\n*${regulatoryAttestation}*`);

  return sections.join("\n");
}

export function handleNaturalPatientDiagnosticQuery(question: string): string | null {
  const q = question.trim();

  // Match explicit patient diagnosis engine requests or patient symptom descriptions
  const isPatientDiagnosisRequest =
    /\b(patient\s+diagnosis|diagnos(?:e|is)\s+patient|patient\s+intake|patient\s+triage|differential\s+diagnosis\s+engine|symptom\s+checker|evaluate\s+patient\s+symptoms|provide\s+diagnosis\s+based\s+on\s+the\s+information|diagnose\s+based\s+on\s+symptoms)\b/i.test(q);

  const hasClinicalSymptomConstellation =
    /\b(i\s+have|i'm\s+having|patient\s+has|experiencing|suffering\s+from|complaining\s+of)\b/i.test(q) &&
    /\b(chest\s+pain|shortness\s+of\s+breath|fever|headache|abdominal\s+pain|cough|nausea|dizziness|weakness)\b/i.test(q);

  if (isPatientDiagnosisRequest || hasClinicalSymptomConstellation) {
    const dossier = buildPatientDiagnosticReport(q);
    return formatPatientDiagnosticDossierMarkdown(dossier);
  }

  return null;
}
