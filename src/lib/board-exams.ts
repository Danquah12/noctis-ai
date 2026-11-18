export type ExamCategory =
  | "health_doctor"
  | "health_nurse"
  | "health_pharmacy"
  | "health_allied"
  | "law"
  | "cloud"
  | "cyber"
  | "network"
  | "data_ai"
  | "dev_software"
  | "mgmt_business"
  | "finance"
  | "trades";

export type FreeResource = {
  name: string;
  url: string;
  type: "official_free" | "textbook" | "open_textbook" | "video_course" | "practice_bank" | "community";
  description: string;
};

export type HowToPassTTP = {
  tactics: string;
  techniques: string;
  procedures: string;
};

export type NextStep = {
  name: string;
  provider: string;
  role: string;
  why: string;
};

export type RoadmapPhase = {
  phase: string;
  timeframe: string;
  objective: string;
  weeklyTarget: string;
  benchmark: string;
};

export type BoardExam = {
  id: string;
  name: string;
  provider: string;
  category: ExamCategory;
  categoryLabel: string;
  role: string;
  examCount: number;
  description: string;
  vendorUrl: string;
  examTopicsUrl?: string;
  popularExams?: string[];
  freeResources?: FreeResource[];
  howToPassTTP?: HowToPassTTP;
  nextThree?: NextStep[];
  roadmap?: RoadmapPhase[];
  samplePrompts: Array<{ label: string; prompt: string }>;
};

export const EXAM_CATEGORIES: Array<{
  id: string;
  label: string;
  icon: string;
  description: string;
}> = [
  { id: "all", label: "All Exams", icon: "🎓", description: "All 250+ Professional & Healthcare Certifications" },
  { id: "health_all", label: "⚕️ Health & Medicine (All)", icon: "⚕️", description: "Doctors, Nurses, Pharmacists, Allied Health" },
  { id: "health_doctor", label: "🩺 Doctors & Medical", icon: "🩺", description: "USMLE, COMLEX, ABIM, Surgery, Pediatrics, Royal Colleges" },
  { id: "health_nurse", label: "💉 Nurses & NPs", icon: "💉", description: "NCLEX-RN, NCLEX-PN, CCRN, FNP, PMHNP, CRNA" },
  { id: "health_pharmacy", label: "💊 Pharmacists & Techs", icon: "💊", description: "NAPLEX, MPJE, BPS Specialties, PTCB" },
  { id: "health_allied", label: "🩻 Allied Health & Diagnostics", icon: "🩻", description: "ARDMS Sonography, ARRT Radiology, ASCP Lab, EMT, AAPC Coding" },
  { id: "law", label: "⚖️ Law & Legal Practice", icon: "⚖️", description: "Bar Exams, UBE, MBE, MPRE, Patent Bar, SQE, NALA Paralegal, Compliance" },
  { id: "cloud", label: "☁️ Cloud & Infrastructure", icon: "☁️", description: "AWS, Azure, GCP, VMware, Nutanix, HashiCorp" },
  { id: "cyber", label: "🛡️ Cybersecurity", icon: "🛡️", description: "CompTIA, CrowdStrike, CISSP, CEH, Palo Alto, Fortinet, GIAC" },
  { id: "network", label: "🌐 Networking & Telco", icon: "🌐", description: "Cisco, Juniper, Aruba, Nokia, Checkpoint, Arista" },
  { id: "data_ai", label: "🧠 Data, AI & Analytics", icon: "🧠", description: "Databricks, Snowflake, NVIDIA, Anthropic, Elastic" },
  { id: "mgmt_business", label: "💼 Project & Management", icon: "💼", description: "PMI PMP, Scrum, ITIL, Six Sigma, SHRM, Salesforce" },
  { id: "finance", label: "📈 Finance, Banking & Law", icon: "📈", description: "FINRA, CFA, ACAMS, GARP, AICPA, IIA" },
];

export const BOARD_EXAMS: BoardExam[] = [
  // ==========================================
  // HEALTHCARE: DOCTORS & PHYSICIANS
  // ==========================================
  {
    id: "usmle",
    name: "USMLE (Step 1, Step 2 CK, Step 3)",
    provider: "FSMB & NBME",
    category: "health_doctor",
    categoryLabel: "Doctors & Physicians",
    role: "Physician / Medical Doctor (MD)",
    examCount: 3,
    description: "United States Medical Licensing Examination assessing medical knowledge, clinical science, and patient safety for medical licensure.",
    vendorUrl: "https://www.usmle.org/",
    popularExams: ["Step 1 (Basic Sciences)", "Step 2 CK (Clinical Knowledge)", "Step 3 (Independent Practice)"],
    samplePrompts: [
      { label: "High-Yield Blueprint", prompt: "Provide a comprehensive high-yield study blueprint for the USMLE Step 2 CK: core clinical clerkships, scoring targets, question distribution, and key diagnostic algorithms." },
      { label: "10-Q Board Simulation", prompt: "Simulate 10 difficult USMLE Step 2 CK clinical vignette multiple-choice questions with 5 options each. Provide exhaustive explanations, next best steps in management, and rule-outs." },
      { label: "Diagnostic Pathways", prompt: "Explain the highest-yield diagnostic and therapeutic workups for acute coronary syndrome, pulmonary embolism, and acute mesenteric ischemia for USMLE Step 2 CK." },
      { label: "Vendor Portal", prompt: "What are the official registration windows, eligibility requirements, and scoring policies on usmle.org for US and international medical graduates (IMGs)?" },
    ],
  },
  {
    id: "comlex-usa",
    name: "COMLEX-USA (Level 1, Level 2-CE, Level 3)",
    provider: "NBOME",
    category: "health_doctor",
    categoryLabel: "Doctors & Physicians",
    role: "Osteopathic Physician (DO)",
    examCount: 3,
    description: "National Board of Osteopathic Medical Examiners licensure examination series incorporating osteopathic principles and practice (OMM/OMT).",
    vendorUrl: "https://www.nbome.org/assessments/comlex-usa/",
    popularExams: ["Level 1 (Foundational Biomedical Sciences)", "Level 2-CE (Cognitive Evaluation)", "Level 3 (Practice Management)"],
    samplePrompts: [
      { label: "OMM High-Yield Review", prompt: "Summarize high-yield Osteopathic Manipulative Medicine (OMM/OMT) concepts for COMLEX Level 2-CE: Chapman points, viscerosomatic reflexes, cranial sacral, and sacral diagnosis rules." },
      { label: "COMLEX Practice Vignettes", prompt: "Generate 5 high-yield COMLEX-style clinical vignettes with osteopathic findings included in the physical exam and step-by-step diagnostic reasoning." },
    ],
  },
  {
    id: "abim",
    name: "ABIM Internal Medicine Certification",
    provider: "American Board of Internal Medicine",
    category: "health_doctor",
    categoryLabel: "Doctors & Physicians",
    role: "Internal Medicine Specialist",
    examCount: 1,
    description: "Initial certification examination evaluating diagnostic acumen and comprehensive clinical management across inpatient and ambulatory adult medicine.",
    vendorUrl: "https://www.abim.org/certification/",
    popularExams: ["Internal Medicine Board Certification", "Cardiology Specialty", "Gastroenterology Specialty", "Nephrology Specialty"],
    samplePrompts: [
      { label: "ABIM Blueprint Breakdown", prompt: "Break down the official ABIM Internal Medicine blueprint: percentage weights for cardiology, pulmonology, gastroenterology, nephrology, and infectious disease." },
      { label: "Complex Medical Cases", prompt: "Present 5 complex multi-system ABIM board-style cases involving acute kidney injury, shock differentiation, and sepsis management with rationale." },
    ],
  },
  {
    id: "abfm",
    name: "ABFM Family Medicine Board Examination",
    provider: "American Board of Family Medicine",
    category: "health_doctor",
    categoryLabel: "Doctors & Physicians",
    role: "Family Physician",
    examCount: 1,
    description: "Certification examination assessing whole-person care across pediatrics, adult medicine, obstetrics, geriatrics, and preventative health.",
    vendorUrl: "https://www.theabfm.org/",
    samplePrompts: [
      { label: "Preventative Screening Rules", prompt: "Review the USPSTF Grade A and B screening recommendations high-yield for the ABFM Family Medicine Board exam." },
      { label: "Chronic Disease Management", prompt: "Outline outpatient management guidelines for Type 2 Diabetes, Hypertension, and CKD according to current ADA and KDIGO guidelines for ABFM." },
    ],
  },
  {
    id: "abs-surgery",
    name: "General Surgery Qualifying & Certifying Exams",
    provider: "American Board of Surgery (ABS)",
    category: "health_doctor",
    categoryLabel: "Doctors & Physicians",
    role: "General Surgeon",
    examCount: 2,
    description: "Qualifying (QE written) and Certifying (CE oral) examinations for board certification in general surgery, surgical oncology, and acute care.",
    vendorUrl: "https://www.absurgery.org/",
    popularExams: ["General Surgery QE (Written)", "General Surgery CE (Oral Boards)", "Surgical Critical Care"],
    samplePrompts: [
      { label: "Trauma & Acute Abdomen", prompt: "Review acute trauma resuscitation and acute abdomen surgical decision trees high-yield for the ABS General Surgery Qualifying Exam." },
      { label: "Oral Board Scenario", prompt: "Simulate a mock ABS Oral Board clinical scenario: 45-year-old presenting with right upper quadrant pain, high fever, and hypotension. Walk through operative decisions." },
    ],
  },
  {
    id: "abp-pediatrics",
    name: "General Pediatrics Certification Examination",
    provider: "American Board of Pediatrics (ABP)",
    category: "health_doctor",
    categoryLabel: "Doctors & Physicians",
    role: "Pediatrician",
    examCount: 1,
    description: "Certification examination evaluating clinical diagnostic and management competencies in infants, children, adolescents, and young adults.",
    vendorUrl: "https://www.abp.org/",
    samplePrompts: [
      { label: "Pediatric Milestones & Vaccines", prompt: "Review developmental milestones and CDC pediatric immunization catch-up schedules tested heavily on the ABP Pediatrics Board Exam." },
      { label: "Neonatal Emergencies", prompt: "Outline neonatal resuscitation (NRP) algorithms, neonatal jaundice workup, and febrile infant protocols for pediatric board prep." },
    ],
  },
  {
    id: "plab-ukmla",
    name: "PLAB / UKMLA (GMC Licensing)",
    provider: "General Medical Council (UK)",
    category: "health_doctor",
    categoryLabel: "Doctors & Physicians",
    role: "UK Licensed Doctor (NHS)",
    examCount: 2,
    description: "Professional and Linguistic Assessments Board / UK Medical Licensing Assessment for doctors qualifying abroad to practise medicine in the United Kingdom.",
    vendorUrl: "https://www.gmc-uk.org/registration-and-licensing/join-the-register/plab",
    popularExams: ["PLAB 1 / UKMLA Applied Knowledge Test (AKT)", "PLAB 2 Clinical Practical Examination (CPSA/OSCE)"],
    samplePrompts: [
      { label: "PLAB 1 High-Yield Practice", prompt: "Give 10 high-yield PLAB 1 clinical questions aligned with UK NICE clinical guidelines and British National Formulary (BNF) drug choices." },
      { label: "PLAB 2 Station Strategy", prompt: "Walk through communication and clinical management stations for PLAB 2 OSCE: breaking bad news, obtaining consent, and managing patient conflict in the NHS." },
    ],
  },
  {
    id: "mrcp",
    name: "MRCP(UK) Examination",
    provider: "Royal Colleges of Physicians of the UK",
    category: "health_doctor",
    categoryLabel: "Doctors & Physicians",
    role: "Physician / Medical Specialist",
    examCount: 3,
    description: "Postgraduate medical diploma consisting of Part 1, Part 2 Written, and PACES (Practical Assessment of Clinical Examination Skills).",
    vendorUrl: "https://www.mrcpuk.org/",
    popularExams: ["MRCP Part 1", "MRCP Part 2 Written", "MRCP PACES (Clinical)"],
    samplePrompts: [
      { label: "MRCP Part 1 Clinical Sciences", prompt: "Provide 5 high-yield MRCP Part 1 questions in clinical pharmacology, statistics, genetics, and immunology with thorough explanations." },
      { label: "PACES Exam Technique", prompt: "Explain the 5 stations of MRCP PACES, common physical findings in Cardiology and Respiratory stations, and presentation phrases for examiners." },
    ],
  },
  {
    id: "mccqe",
    name: "MCCQE (Part I & II)",
    provider: "Medical Council of Canada",
    category: "health_doctor",
    categoryLabel: "Doctors & Physicians",
    role: "Canadian Licensed Physician",
    examCount: 2,
    description: "Qualifying examination assessing medical knowledge, clinical skills, and Canadian healthcare ethical and legal principles for licensure in Canada.",
    vendorUrl: "https://mcc.ca/examinations/mccqe-part-i/",
    samplePrompts: [
      { label: "Canadian Healthcare Ethics", prompt: "Explain the Canadian Medical Association (CMA) Code of Ethics, CMPA legal principles, and consent laws high-yield for MCCQE Part I." },
      { label: "Clinical Decision Making (CDM)", prompt: "Explain the Clinical Decision Making (CDM) question format on MCCQE Part I: write-in vs menu items and how to avoid over-ordering." },
    ],
  },
  {
    id: "haad",
    name: "HAAD / DOH Abu Dhabi Healthcare Licensure",
    provider: "Department of Health Abu Dhabi",
    category: "health_doctor",
    categoryLabel: "Doctors & Physicians",
    role: "Physician / Dentist / Allied Health",
    examCount: 1,
    description: "Licensure examination required for healthcare professionals seeking to practise in Abu Dhabi, United Arab Emirates.",
    vendorUrl: "https://www.doh.gov.ae/en/programs-initiatives/health-professionals-licensing",
    examTopicsUrl: "https://www.examtopics.com/exams/haad/",
    samplePrompts: [
      { label: "HAAD Exam Pattern", prompt: "What is the examination blueprint, passing score, and computer-based testing format for the HAAD General Practitioner / Physician examination?" },
      { label: "High-Yield Practice Qs", prompt: "Provide 10 high-yield clinical practice questions for the HAAD / DOH Abu Dhabi medical licensing examination." },
    ],
  },
  {
    id: "omsb",
    name: "OMSB Oman Medical Specialty Board Exam",
    provider: "Oman Medical Specialty Board",
    category: "health_doctor",
    categoryLabel: "Doctors & Physicians",
    role: "Medical Specialist & Resident",
    examCount: 1,
    description: "Comprehensive qualification exam for physicians and specialists entering postgraduate residency and fellowship training in the Sultanate of Oman.",
    vendorUrl: "https://omsb.gov.om/",
    examTopicsUrl: "https://www.examtopics.com/exams/omsb/",
    samplePrompts: [
      { label: "OMSB Blueprint & Syllabus", prompt: "Outline the OMSB medical qualification exam syllabus, passing thresholds, and eligibility for international medical graduates." },
    ],
  },

  // ==========================================
  // HEALTHCARE: PHARMACISTS & PHARMACY TECHS
  // ==========================================
  {
    id: "naplex",
    name: "NAPLEX (North American Pharmacist Licensure)",
    provider: "NABP (National Association of Boards of Pharmacy)",
    category: "health_pharmacy",
    categoryLabel: "Pharmacists & Pharmacy Techs",
    role: "Licensed Pharmacist (PharmD / RPh)",
    examCount: 1,
    description: "Computer-adaptive assessment evaluating prospective pharmacists' competency to evaluate therapy, calculate doses, safely dispense, and counsel patients.",
    vendorUrl: "https://nabp.pharmacy/programs/examinations/naplex/",
    popularExams: ["NAPLEX 225-Question Computer-Adaptive Exam"],
    samplePrompts: [
      { label: "Pharmacy Calculations", prompt: "Present 5 high-yield NAPLEX pharmaceutical calculation problems: alligation alternate, milliequivalents, flow rates, and osmolarity with step-by-step math." },
      { label: "Drug Interactions & Regimens", prompt: "Review high-risk CYP3A4 inhibitors/inducers, anticoagulation dosing protocols, and guideline-directed medical therapy for heart failure for NAPLEX." },
      { label: "Infectious Disease & Antibiogram", prompt: "Break down empiric antibiotic regimens for community-acquired pneumonia, hospital-acquired pneumonia, and pyelonephritis tested on NAPLEX." },
    ],
  },
  {
    id: "mpje",
    name: "MPJE (Multistate Pharmacy Jurisprudence Exam)",
    provider: "NABP (National Association of Boards of Pharmacy)",
    category: "health_pharmacy",
    categoryLabel: "Pharmacists & Pharmacy Techs",
    role: "Pharmacist Jurisprudence",
    examCount: 1,
    description: "Federal and state-specific pharmacy law examination covering DEA controlled substance schedules, prescription validity, compounding, and dispensing statutes.",
    vendorUrl: "https://nabp.pharmacy/programs/examinations/mpje/",
    samplePrompts: [
      { label: "Controlled Substances Act Rules", prompt: "Summarize DEA Form 222 rules, CSOS digital ordering, inventory requirements, and emergency Schedule II prescription filling rules for MPJE." },
      { label: "Federal vs State Law Principles", prompt: "Explain the fundamental MPJE doctrine: when state law is more stringent than federal law, which law must the pharmacist obey?" },
    ],
  },
  {
    id: "bps-bcps",
    name: "BPS Board Certified Pharmacotherapy Specialist (BCPS)",
    provider: "Board of Pharmacy Specialties (BPS)",
    category: "health_pharmacy",
    categoryLabel: "Pharmacists & Pharmacy Techs",
    role: "Clinical Pharmacotherapy Specialist",
    examCount: 1,
    description: "Post-licensure clinical specialty certification assessing advanced patient-centered pharmacotherapy, evidence-based medicine, and biostatistics.",
    vendorUrl: "https://www.bpsweb.org/bps-specialties/pharmacotherapy/",
    popularExams: ["BCPS (Pharmacotherapy)", "BCOP (Oncology)", "BCCP (Cardiology)", "BCACP (Ambulatory Care)", "BCIDP (Infectious Diseases)"],
    samplePrompts: [
      { label: "Biostatistics for BPS", prompt: "Review relative risk reduction (RRR), absolute risk reduction (ARR), number needed to treat (NNT), hazard ratios, and survival curves for BCPS exam." },
      { label: "Critical Care Pharmacotherapy", prompt: "Detail vasoactive agent selection in septic vs cardiogenic shock, and glycemic control protocols in the ICU for BCPS prep." },
    ],
  },
  {
    id: "ptcb-ptce",
    name: "PTCB Pharmacy Technician Certification (PTCE)",
    provider: "Pharmacy Technician Certification Board",
    category: "health_pharmacy",
    categoryLabel: "Pharmacists & Pharmacy Techs",
    role: "Certified Pharmacy Technician (CPhT)",
    examCount: 1,
    description: "Nationally recognized credential assessing medication knowledge, pharmacy law, sterile/non-sterile compounding, and inventory management.",
    vendorUrl: "https://www.ptcb.org/credentials/certified-pharmacy-technician",
    samplePrompts: [
      { label: "Top 200 Medications Quiz", prompt: "Quiz me on 10 medications from the Top 200 drugs: brand vs generic names, drug class, and primary indication for PTCE." },
      { label: "Sterile Compounding (USP 797)", prompt: "Explain ISO class air quality standards, laminar flow hoods, and garbing order according to USP <797> for PTCE." },
    ],
  },
  {
    id: "pebc",
    name: "PEBC Qualifying Examination",
    provider: "Pharmacy Examining Board of Canada",
    category: "health_pharmacy",
    categoryLabel: "Pharmacists & Pharmacy Techs",
    role: "Canadian Pharmacist (RPh)",
    examCount: 2,
    description: "Two-part qualifying examination (Part I MCQ and Part II OSCE) assessing competence to practise pharmacy safely in Canada.",
    vendorUrl: "https://www.pebc.ca/",
    samplePrompts: [
      { label: "PEBC OSCE Station Prep", prompt: "How do you structure a 7-minute PEBC OSCE station for patient counseling on a new inhaler device and symptom red flags?" },
    ],
  },

  // ==========================================
  // HEALTHCARE: NURSES & NURSE PRACTITIONERS
  // ==========================================
  {
    id: "nclex-rn",
    name: "NCLEX-RN (Next Generation NCLEX)",
    provider: "NCSBN (National Council of State Boards of Nursing)",
    category: "health_nurse",
    categoryLabel: "Nurses & Nurse Practitioners",
    role: "Registered Nurse (RN)",
    examCount: 1,
    description: "NextGen computer-adaptive licensure exam assessing clinical judgment, prioritization, pharmacology, and patient safety for Registered Nurses.",
    vendorUrl: "https://www.ncsbn.org/exams/nclex.page",
    popularExams: ["Next Generation NCLEX-RN (NGN)", "Next Generation NCLEX-PN (Practical Nurse)"],
    samplePrompts: [
      { label: "NGN Case Study Simulation", prompt: "Simulate an unfolding Next Generation NCLEX (NGN) clinical judgment case study with 6 sequential questions: recognize cues, analyze cues, prioritize hypotheses, generate solutions, take action, and evaluate outcomes." },
      { label: "Prioritization & Delegation", prompt: "Provide 5 tricky NCLEX prioritization questions using the ABCs, Maslow, and acute vs chronic rules. Explain who to see first and what can be delegated to UAP/LPN." },
      { label: "Emergency Pharmacology", prompt: "Review high-alert medications frequently tested on NCLEX: Digoxin, Heparin/Warfarin, Insulin, Lithium, and Potassium administration rules." },
      { label: "NCSBN Portal & Pass Rates", prompt: "What are the official registration steps via Pearson VUE, ATT validity, and passing standard metrics published on ncsbn.org?" },
    ],
  },
  {
    id: "aacn-ccrn",
    name: "AACN Critical Care Registered Nurse (CCRN)",
    provider: "American Association of Critical-Care Nurses (AACN)",
    category: "health_nurse",
    categoryLabel: "Nurses & Nurse Practitioners",
    role: "Critical Care Nurse (CCRN)",
    examCount: 2,
    description: "Specialty credential validating advanced bedside clinical care and synergy model competencies for adult, pediatric, or neonatal intensive care.",
    vendorUrl: "https://www.aacn.org/certification/preparation-tools-and-resources/ccrn-exam-handbook",
    examTopicsUrl: "https://www.examtopics.com/exams/aacn/",
    popularExams: ["CCRN (Adult)", "CCRN (Pediatric)", "CCRN (Neonatal)", "PCCN (Progressive Care)"],
    samplePrompts: [
      { label: "Hemodynamics & Waveforms", prompt: "Explain arterial line damping, pulmonary artery catheter waveforms, central venous pressure (CVP) analysis, and cardiac output calculations for CCRN." },
      { label: "Ventilator Modes & ABGs", prompt: "Interpret 3 complex arterial blood gas (ABG) scenarios with mixed acid-base disorders and explain ventilator management in ARDS for CCRN." },
      { label: "AACN Synergy Model", prompt: "Summarize the AACN Synergy Model for Patient Care and how patient characteristics match nurse competencies on the CCRN exam." },
    ],
  },
  {
    id: "ancc-fnp",
    name: "ANCC Family Nurse Practitioner (FNP-BC)",
    provider: "American Nurses Credentialing Center",
    category: "health_nurse",
    categoryLabel: "Nurses & Nurse Practitioners",
    role: "Family Nurse Practitioner (APRN / FNP)",
    examCount: 1,
    description: "Board certification validating advanced practice clinical assessment, diagnostic reasoning, pharmacotherapeutics, and holistic health promotion across the lifespan.",
    vendorUrl: "https://www.nursingworld.org/our-certifications/family-nurse-practitioner/",
    popularExams: ["FNP-BC (Family Nurse Practitioner)", "PMHNP-BC (Psychiatric-Mental Health)", "AGACNP-BC (Adult-Gerontology Acute Care)"],
    samplePrompts: [
      { label: "Primary Care Diagnostics", prompt: "Walk through outpatient diagnostic algorithms for secondary hypertension, thyroid nodule evaluation, and atypical chest pain for FNP board prep." },
      { label: "APRN Pharmacology & Prescribing", prompt: "Review black box warnings, contraindicated drug combinations, and first-line agents in pediatric and geriatric primary care for ANCC FNP-BC." },
    ],
  },
  {
    id: "nbcrna-crna",
    name: "National Certification Examination for Nurse Anesthetists",
    provider: "NBCRNA",
    category: "health_nurse",
    categoryLabel: "Nurses & Nurse Practitioners",
    role: "Certified Registered Nurse Anesthetist (CRNA)",
    examCount: 1,
    description: "Comprehensive national certification examination assessing anesthetic sciences, equipment, patient assessment, and perioperative management.",
    vendorUrl: "https://www.nbcrna.com/initial-certification/national-certification-exam-(nce)",
    samplePrompts: [
      { label: "Inhalation & IV Anesthetics", prompt: "Compare minimum alveolar concentration (MAC), blood-gas partition coefficients, and hemodynamics of Sevoflurane, Desflurane, Propofol, and Ketamine for CRNA exam." },
      { label: "Difficult Airway Algorithm", prompt: "Outline the ASA difficult airway algorithm and emergency surgical airway decision points tested on the NBCRNA NCE." },
    ],
  },
  {
    id: "bcen-cen",
    name: "Certified Emergency Nurse (CEN)",
    provider: "Board of Certification for Emergency Nursing (BCEN)",
    category: "health_nurse",
    categoryLabel: "Nurses & Nurse Practitioners",
    role: "Emergency Nurse (CEN)",
    examCount: 1,
    description: "Credential assessing triage, resuscitation, trauma nursing, medical-surgical emergencies, and toxicology in acute emergency environments.",
    vendorUrl: "https://bcen.org/cen/",
    samplePrompts: [
      { label: "Emergency Triage (ESI)", prompt: "Explain the Emergency Severity Index (ESI) levels 1 through 5 with 5 practice triage scenarios for the CEN examination." },
      { label: "Trauma Primary & Secondary Survey", prompt: "Detail the trauma primary survey (ABCDE) and secondary survey (FGHI) prioritization tested on BCEN CEN." },
    ],
  },

  // ==========================================
  // HEALTHCARE: ALLIED HEALTH, DIAGNOSTICS & CODING
  // ==========================================
  {
    id: "aapc-cpc",
    name: "AAPC Certified Professional Coder (CPC)",
    provider: "AAPC (American Academy of Professional Coders)",
    category: "health_allied",
    categoryLabel: "Allied Health, Diagnostics & Coding",
    role: "Medical Coder & Auditor",
    examCount: 2,
    description: "Industry gold-standard credential for physician practice coding across CPT, ICD-10-CM, and HCPCS Level II code sets.",
    vendorUrl: "https://www.aapc.com/certifications/cpc",
    examTopicsUrl: "https://www.examtopics.com/exams/aapc/",
    popularExams: ["CPC (Physician Coder)", "COC (Outpatient Hospital)", "CIC (Inpatient Hospital)", "CPMA (Medical Auditor)"],
    samplePrompts: [
      { label: "E/M Coding Guidelines (2025/2026)", prompt: "Explain Evaluation and Management (E/M) coding by medical decision making (MDM) vs total time for outpatient visits according to AAPC guidelines." },
      { label: "ICD-10-CM Coding Rules", prompt: "Review coding sequencing rules, 'Code first', 'Code also', and Excludes1 vs Excludes2 rules tested on the AAPC CPC exam." },
      { label: "CPT Modifier Usage", prompt: "When do you use modifiers 25, 59, 26, and TC? Give concrete clinical scenarios tested on the CPC examination." },
    ],
  },
  {
    id: "ahima",
    name: "AHIMA RHIA & RHIT Health Information Management",
    provider: "AHIMA (American Health Information Management Association)",
    category: "health_allied",
    categoryLabel: "Allied Health, Diagnostics & Coding",
    role: "Health Information Manager / Specialist",
    examCount: 2,
    description: "Credentials evaluating healthcare data analytics, revenue cycle management, HIPAA compliance, electronic health record governance, and clinical documentation integrity.",
    vendorUrl: "https://www.ahima.org/certification-careers/certifications-overview/",
    examTopicsUrl: "https://www.examtopics.com/exams/ahima/",
    popularExams: ["RHIA (Registered Health Information Administrator)", "RHIT (Registered Health Information Technician)", "CCS (Certified Coding Specialist)"],
    samplePrompts: [
      { label: "HIPAA & Information Governance", prompt: "Review HIPAA Privacy and Security Rule compliance, legal medical record standards, and disclosure accounting for AHIMA exams." },
      { label: "Revenue Cycle & CDI", prompt: "Explain the Clinical Documentation Improvement (CDI) query process, DRG assignment, and Case Mix Index (CMI) calculation for RHIA/CCS." },
    ],
  },
  {
    id: "ardms",
    name: "ARDMS Diagnostic Medical Sonography (SPI & Specialties)",
    provider: "ARDMS (American Registry for Diagnostic Medical Sonography)",
    category: "health_allied",
    categoryLabel: "Allied Health, Diagnostics & Coding",
    role: "Diagnostic Medical Sonographer (RDMS / RVT / RDCS)",
    examCount: 1,
    description: "Certification assessing Sonography Principles & Instrumentation (SPI) plus specialty examinations in Abdomen, Obstetrics/Gynecology, Echocardiography, and Vascular.",
    vendorUrl: "https://www.ardms.org/get-certified/",
    examTopicsUrl: "https://www.examtopics.com/exams/ardms/",
    popularExams: ["Sonography Principles & Instrumentation (SPI)", "Abdomen (AB)", "Obstetrics and Gynecology (OB/GYN)", "Vascular Technology (VT)"],
    samplePrompts: [
      { label: "SPI Physics & Doppler", prompt: "Explain Doppler equation, aliasing, Nyquist limit, axial vs lateral resolution, and attenuation coefficients for the ARDMS SPI physics exam." },
      { label: "Sonographic Artifacts", prompt: "Review acoustic shadowing, reverberation, comet tail, side lobe artifacts, and mirror image artifacts tested on ARDMS." },
    ],
  },
  {
    id: "nremt",
    name: "NREMT (National Registry of Emergency Medical Technicians)",
    provider: "NREMT",
    category: "health_allied",
    categoryLabel: "Allied Health, Diagnostics & Coding",
    role: "Paramedic / EMT",
    examCount: 2,
    description: "National cognitive and psychomotor examination assessing pre-hospital emergency medical care, patient stabilization, airway management, and trauma life support.",
    vendorUrl: "https://www.nremt.org/",
    popularExams: ["NREMT Paramedic (NRP)", "NREMT Emergency Medical Technician (EMT)"],
    samplePrompts: [
      { label: "ACLS & PALS Rhythms", prompt: "Review cardiac arrest algorithms, PEA/Asystole management, and synchronized cardioversion vs defibrillation for the NREMT Paramedic exam." },
      { label: "Pre-Hospital Trauma Care", prompt: "Explain tension pneumothorax needle decompression, mass casualty triage (START method), and pediatric airway differences for NREMT." },
    ],
  },
  {
    id: "arrt",
    name: "ARRT Radiologic Technology & Imaging",
    provider: "American Registry of Radiologic Technologists",
    category: "health_allied",
    categoryLabel: "Allied Health, Diagnostics & Coding",
    role: "Radiologic Technologist (R.T.)",
    examCount: 1,
    description: "Certification exam covering radiation protection, equipment operation, image production and evaluation, and patient care procedures.",
    vendorUrl: "https://www.arrt.org/",
    popularExams: ["Radiography", "Computed Tomography (CT)", "Magnetic Resonance Imaging (MRI)", "Mammography"],
    samplePrompts: [
      { label: "Radiation Protection & Physics", prompt: "Explain ALARA principles, inverse square law calculations, photoelectric absorption vs Compton scatter for the ARRT Radiography exam." },
    ],
  },
  {
    id: "ascp-boc",
    name: "ASCP Board of Certification (MLS & MLT)",
    provider: "American Society for Clinical Pathology",
    category: "health_allied",
    categoryLabel: "Allied Health, Diagnostics & Coding",
    role: "Medical Laboratory Scientist / Technician",
    examCount: 1,
    description: "Certification examination covering clinical chemistry, hematology, immunohematology (blood bank), microbiology, and molecular diagnostics.",
    vendorUrl: "https://www.ascp.org/content/board-of-certification",
    samplePrompts: [
      { label: "Blood Banking & Antibody ID", prompt: "Walk through antibody panel identification, ruling out unexpected antibodies, and crossmatch discrepancies for the ASCP MLS exam." },
      { label: "Clinical Microbiology", prompt: "Explain Gram-positive vs Gram-negative identification flowcharts, biochemical reactions, and antibiotic sensitivity testing for ASCP BOC." },
    ],
  },
  {
    id: "bacb",
    name: "BACB Board Certified Behavior Analyst (BCBA / BCaBA)",
    provider: "Behavior Analyst Certification Board",
    category: "health_allied",
    categoryLabel: "Allied Health, Diagnostics & Coding",
    role: "Behavior Analyst",
    examCount: 2,
    description: "Professional credential in applied behavior analysis (ABA) covering measurement, assessment, behavior-change procedures, and ethical practice.",
    vendorUrl: "https://www.bacb.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/bacb/",
    samplePrompts: [
      { label: "ABA Measurement & Schedules", prompt: "Explain continuous vs discontinuous measurement, fixed vs variable ratio/interval reinforcement schedules for the BCBA exam." },
    ],
  },
  {
    id: "acsm",
    name: "ACSM Clinical Exercise Physiologist & Fitness",
    provider: "American College of Sports Medicine",
    category: "health_allied",
    categoryLabel: "Allied Health, Diagnostics & Coding",
    role: "Clinical Exercise Physiologist",
    examCount: 2,
    description: "Certification in exercise testing, cardiovascular rehabilitation, exercise prescription for chronic diseases, and sports medicine.",
    vendorUrl: "https://www.acsm.org/certification",
    examTopicsUrl: "https://www.examtopics.com/exams/acsm/",
    samplePrompts: [
      { label: "Cardiopulmonary Exercise Testing", prompt: "Explain VO2 max testing, MET calculations, ECG monitoring, and exercise contraindications for the ACSM exam." },
    ],
  },
  {
    id: "ahip",
    name: "AHIP Health Insurance & Medicare Certification",
    provider: "AHIP",
    category: "health_allied",
    categoryLabel: "Allied Health, Diagnostics & Coding",
    role: "Health Insurance & Managed Care Specialist",
    examCount: 4,
    description: "National standard certification for Medicare Advantage, Part D prescription plans, CMS compliance, and marketing guidelines.",
    vendorUrl: "https://www.ahipmedicaretraining.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/ahip/",
    samplePrompts: [
      { label: "Medicare Advantage & Part D Rules", prompt: "Summarize CMS marketing guidelines, scope of appointment rules, and Part D coverage gap rules tested on AHIP." },
    ],
  },
  {
    id: "fsmtb",
    name: "FSMTB Massage & Bodywork Licensing Exam (MBLEx)",
    provider: "Federation of State Massage Therapy Boards",
    category: "health_allied",
    categoryLabel: "Allied Health, Diagnostics & Coding",
    role: "Licensed Massage Therapist (LMT)",
    examCount: 1,
    description: "Standardized licensing exam across US states covering anatomy, physiology, kinesiology, pathology, ethics, and massage techniques.",
    vendorUrl: "https://www.fsmtb.org/mblex/",
    examTopicsUrl: "https://www.examtopics.com/exams/fsmtb/",
    samplePrompts: [
      { label: "Kinesiology & Contraindications", prompt: "Review muscle origins, insertions, actions, and absolute vs local contraindications for the MBLEx exam." },
    ],
  },

  // ==========================================
  // CLOUD & INFRASTRUCTURE
  // ==========================================
  {
    id: "amazon-aws",
    name: "Amazon Web Services (AWS Certifications)",
    provider: "Amazon",
    category: "cloud",
    categoryLabel: "Cloud & Infrastructure",
    role: "Cloud Architect & Engineer",
    examCount: 28,
    description: "Comprehensive cloud certification tracks spanning Foundational, Associate, Professional, and Specialty credentials.",
    vendorUrl: "https://aws.amazon.com/certification/",
    examTopicsUrl: "https://www.examtopics.com/exams/amazon/",
    popularExams: ["AWS Certified Solutions Architect Associate (SAA-C03)", "Solutions Architect Professional (SAP-C02)", "Developer Associate (DVA-C02)", "Security Specialty (SCS-C02)"],
    samplePrompts: [
      { label: "Architect Associate Blueprint", prompt: "Break down AWS Solutions Architect Associate (SAA-C03) blueprint: multi-tier architectures, VPC peering, DynamoDB scaling, and S3 lifecycle policies." },
      { label: "10-Q AWS Practice Exam", prompt: "Provide 10 difficult scenario-based questions for AWS SAA-C03 with detailed architecture analysis and reasons why distractors are suboptimal." },
    ],
  },
  {
    id: "microsoft-azure",
    name: "Microsoft (Azure & Enterprise Cloud)",
    provider: "Microsoft",
    category: "cloud",
    categoryLabel: "Cloud & Infrastructure",
    role: "Azure Administrator & Architect",
    examCount: 236,
    description: "Microsoft Certified exams spanning Azure Cloud, Microsoft 365, Power Platform, Security Operations, and Data Engineering.",
    vendorUrl: "https://learn.microsoft.com/credentials/",
    examTopicsUrl: "https://www.examtopics.com/exams/microsoft/",
    popularExams: ["AZ-104 (Azure Administrator)", "AZ-305 (Azure Solutions Architect)", "AZ-900 (Azure Fundamentals)", "SC-200 (Security Operations Analyst)", "DP-203 (Data Engineering)"],
    samplePrompts: [
      { label: "AZ-104 High-Yield Prep", prompt: "Review key AZ-104 exam topics: Microsoft Entra ID governance, RBAC role definitions, Azure Virtual Networks, NSGs, and ARM/Bicep templates." },
      { label: "AZ-305 Architect Scenarios", prompt: "Give 5 real-world architectural design scenarios tested on Microsoft AZ-305: disaster recovery, SQL Managed Instance vs Azure SQL, and hub-spoke topology." },
    ],
  },
  {
    id: "google-cloud",
    name: "Google Cloud Platform (GCP Certifications)",
    provider: "Google",
    category: "cloud",
    categoryLabel: "Cloud & Infrastructure",
    role: "Cloud Engineer & Architect",
    examCount: 29,
    description: "Google Cloud certifications covering Cloud Architect, Data Engineer, Cloud DevOps, and Cloud Security Engineer.",
    vendorUrl: "https://cloud.google.com/learn/certification",
    examTopicsUrl: "https://www.examtopics.com/exams/google/",
    popularExams: ["Associate Cloud Engineer (ACE)", "Professional Cloud Architect (PCA)", "Professional Data Engineer", "Professional Cloud Security Engineer"],
    samplePrompts: [
      { label: "PCA Case Studies Breakdown", prompt: "Analyze Google Professional Cloud Architect (PCA) case studies: Mountkirk Games, TerramEarth, and EHR Healthcare with best-practice GCP solutions." },
    ],
  },
  {
    id: "hashicorp",
    name: "HashiCorp (Terraform, Vault, Consul)",
    provider: "HashiCorp",
    category: "cloud",
    categoryLabel: "Cloud & Infrastructure",
    role: "DevOps & Infrastructure Engineer",
    examCount: 4,
    description: "Infrastructure as Code and multi-cloud security credentials including Terraform Associate and Vault Associate.",
    vendorUrl: "https://www.hashicorp.com/certification",
    examTopicsUrl: "https://www.examtopics.com/exams/hashicorp/",
    popularExams: ["Terraform Associate (003)", "Vault Associate (002)", "Consul Associate"],
    samplePrompts: [
      { label: "Terraform State & Modules", prompt: "Explain Terraform state locking, remote backends, module composition, dynamic blocks, and lifecycle rules tested on the Terraform Associate exam." },
    ],
  },
  {
    id: "vmware",
    name: "VMware / Broadcom Enterprise Virtualization",
    provider: "VMware",
    category: "cloud",
    categoryLabel: "Cloud & Infrastructure",
    role: "Virtualization & Cloud Administrator",
    examCount: 95,
    description: "Virtualization, vSphere, VMware Cloud Foundation, and NSX software-defined data center credentials.",
    vendorUrl: "https://www.vmware.com/learning/certification.html",
    examTopicsUrl: "https://www.examtopics.com/exams/vmware/",
    popularExams: ["VCP-DCV (Data Center Virtualization)", "VCP-NV (Network Virtualization)", "VCAP Design & Deploy"],
    samplePrompts: [
      { label: "vSphere 8 HA & DRS", prompt: "Explain vSphere High Availability admission control, DRS rules, vMotion requirements, and vSAN architecture for VCP-DCV." },
    ],
  },
  {
    id: "nutanix",
    name: "Nutanix Hyperconverged Infrastructure",
    provider: "Nutanix",
    category: "cloud",
    categoryLabel: "Cloud & Infrastructure",
    role: "HCI & Cloud Specialist",
    examCount: 17,
    description: "Hyperconverged infrastructure, enterprise private cloud, and Prism central management certifications.",
    vendorUrl: "https://www.nutanix.com/support-services/training-certification",
    examTopicsUrl: "https://www.examtopics.com/exams/nutanix/",
    samplePrompts: [
      { label: "Nutanix Cluster Architecture", prompt: "Explain Acropolis OS (AOS), Acropolis Hypervisor (AHV), Controller VM (CVM) storage fabric, and data locality principles for NCP-MCI." },
    ],
  },

  // ==========================================
  // CYBERSECURITY
  // ==========================================
  {
    id: "comptia",
    name: "CompTIA (Security+, CySA+, PenTest+, CASP+)",
    provider: "CompTIA",
    category: "cyber",
    categoryLabel: "Cybersecurity",
    role: "Cybersecurity Analyst & Engineer",
    examCount: 55,
    description: "Foundational and advanced DoD-approved cybersecurity, networking, and IT infrastructure certifications.",
    vendorUrl: "https://www.comptia.org/certifications",
    examTopicsUrl: "https://www.examtopics.com/exams/comptia/",
    popularExams: ["Security+ (SY0-701)", "Network+ (N10-009)", "CySA+ (CS0-003)", "PenTest+ (PT0-002)", "CASP+ / SecurityX"],
    samplePrompts: [
      { label: "Security+ SY0-701 Blueprint", prompt: "Provide a complete syllabus review of CompTIA Security+ SY0-701: threat vectors, cryptographic protocols, identity management, and incident response." },
      { label: "PBQ Scenario Practice", prompt: "Simulate 3 CompTIA Performance-Based Questions (PBQs): configuring firewall access control lists, analyzing terminal logs, and remediating vulnerable ports." },
    ],
  },
  {
    id: "isc2",
    name: "(ISC)2 (CISSP, CCSP, SSCP, CC)",
    provider: "ISC",
    category: "cyber",
    categoryLabel: "Cybersecurity",
    role: "Information Security Manager / CISO",
    examCount: 8,
    description: "Internationally accredited cybersecurity governance, risk management, and architectural security credentials.",
    vendorUrl: "https://www.isc2.org/certifications",
    examTopicsUrl: "https://www.examtopics.com/exams/isc/",
    popularExams: ["CISSP (Certified Information Systems Security Professional)", "CCSP (Certified Cloud Security Professional)", "CC (Certified in Cybersecurity)"],
    samplePrompts: [
      { label: "CISSP 8 Domains Review", prompt: "Break down the 8 CISSP domains from a manager's perspective: security risk management, asset security, security architecture, and identity management." },
      { label: "CISSP Think-Like-A-Manager", prompt: "Give 5 tricky CISSP scenario questions requiring the 'think like a manager' mindset, explaining why technical quick-fixes are incorrect." },
    ],
  },
  {
    id: "crowdstrike",
    name: "CrowdStrike Falcon Endpoint Security",
    provider: "CrowdStrike",
    category: "cyber",
    categoryLabel: "Cybersecurity",
    role: "SOC Analyst & Incident Responder",
    examCount: 8,
    description: "Industry-leading Endpoint Detection and Response (EDR), Threat Hunting, and Falcon Administrator credentials.",
    vendorUrl: "https://www.crowdstrike.com/services/training/",
    examTopicsUrl: "https://www.examtopics.com/exams/crowdstrike/",
    popularExams: ["CCFA (Falcon Administrator)", "CCFR (Falcon Responder)", "CCFH (Falcon Hunter)"],
    samplePrompts: [
      { label: "Falcon EDR & Hunting", prompt: "Explain Falcon Sensor architecture, IOAs vs IOCs, Real-Time Response (RTR), and Falcon Query Language (FQL) searches for CCFA/CCFR." },
    ],
  },
  {
    id: "palo-alto",
    name: "Palo Alto Networks (PCNSE, PCCET, PCDRA)",
    provider: "Palo Alto Networks",
    category: "cyber",
    categoryLabel: "Cybersecurity",
    role: "Network Security Engineer",
    examCount: 29,
    description: "Next-Generation Firewall (NGFW), Prisma Cloud, and Cortex XDR security engineering credentials.",
    vendorUrl: "https://www.paloaltonetworks.com/services/education",
    examTopicsUrl: "https://www.examtopics.com/exams/palo-alto-networks/",
    popularExams: ["PCNSE (Network Security Engineer)", "PCCET (Entry Cybersecurity)", "PCDRA (Cortex XDR Analyst)"],
    samplePrompts: [
      { label: "PAN-OS Security Policies", prompt: "Explain App-ID, User-ID, SSL Decryption, Security Profiles, and High Availability (Active/Passive) rules for the PCNSE exam." },
    ],
  },
  {
    id: "fortinet",
    name: "Fortinet (NSE 4 to NSE 8, FCP, FCSS)",
    provider: "Fortinet",
    category: "cyber",
    categoryLabel: "Cybersecurity",
    role: "Security Fabric Architect",
    examCount: 103,
    description: "FortiGate firewall administration, SD-WAN, FortiAnalyzer, and FortiManager security fabric certifications.",
    vendorUrl: "https://www.fortinet.com/training-certification",
    examTopicsUrl: "https://www.examtopics.com/exams/fortinet/",
    popularExams: ["FCP - FortiGate Administrator", "FCSS - Enterprise Firewall", "FortiAnalyzer & FortiManager"],
    samplePrompts: [
      { label: "FortiGate Administration", prompt: "Explain FortiGate routing, IPsec VPN tunnels, explicit web proxy, inspection modes (flow-based vs proxy-based), and NAT rules for Fortinet exams." },
    ],
  },
  {
    id: "checkpoint",
    name: "Checkpoint (CCSA, CCSE, CCSM)",
    provider: "Checkpoint",
    category: "cyber",
    categoryLabel: "Cybersecurity",
    role: "Check Point Security Administrator",
    examCount: 22,
    description: "Check Point Security Administration, Engineering, and Master certifications on Quantum Security Gateways.",
    vendorUrl: "https://www.checkpoint.com/mind/certifications/",
    examTopicsUrl: "https://www.examtopics.com/exams/checkpoint/",
    popularExams: ["CCSA (Security Administrator)", "CCSE (Security Expert)", "CCSM (Security Master)"],
    samplePrompts: [
      { label: "Gaia OS & ClusterXL", prompt: "Explain Gaia OS command line, SmartConsole policy installation, ClusterXL High Availability vs Load Sharing, and fw monitor packet inspection for CCSA/CCSE." },
    ],
  },
  {
    id: "eccouncil",
    name: "EC-Council (CEH, CHFI, CND)",
    provider: "ECCouncil",
    category: "cyber",
    categoryLabel: "Cybersecurity",
    role: "Ethical Hacker & Forensic Investigator",
    examCount: 32,
    description: "Certified Ethical Hacker (CEH v12), Computer Hacking Forensic Investigator (CHFI), and Network Defender credentials.",
    vendorUrl: "https://www.eccouncil.org/train-certify/",
    examTopicsUrl: "https://www.examtopics.com/exams/eccouncil/",
    popularExams: ["CEH v12 (Certified Ethical Hacker)", "CHFI (Forensic Investigator)", "CND (Certified Network Defender)"],
    samplePrompts: [
      { label: "CEH Attack Vectors", prompt: "Review Nmap scan switches, SQL injection payloads, wireless WPA3 attacks, and privilege escalation techniques tested on the CEH exam." },
    ],
  },
  {
    id: "giac",
    name: "GIAC / SANS Information Security Certifications",
    provider: "GIAC",
    category: "cyber",
    categoryLabel: "Cybersecurity",
    role: "Cyber Defense & Forensic Specialist",
    examCount: 17,
    description: "Hands-on, rigorous cybersecurity certifications aligned with SANS Institute curricula.",
    vendorUrl: "https://www.giac.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/giac/",
    popularExams: ["GSEC (Security Essentials)", "GCIH (Incident Handler)", "GCIA (Intrusion Analyst)", "GPEN (Penetration Tester)"],
    samplePrompts: [
      { label: "GCIH Incident Handling", prompt: "Explain the 6-step PICERL incident response methodology (Preparation, Identification, Containment, Eradication, Recovery, Lessons Learned) for GCIH." },
    ],
  },
  {
    id: "cyberark",
    name: "CyberArk Privileged Access Management",
    provider: "CyberArk",
    category: "cyber",
    categoryLabel: "Cybersecurity",
    role: "PAM Security Engineer",
    examCount: 11,
    description: "Privileged Access Management (PAM), Enterprise Password Vault, Privileged Session Manager (PSM), and CyberArk Defender.",
    vendorUrl: "https://www.cyberark.com/services/certification/",
    examTopicsUrl: "https://www.examtopics.com/exams/cyberark/",
    popularExams: ["CyberArk Defender", "CyberArk Sentry", "CyberArk Guardian"],
    samplePrompts: [
      { label: "CyberArk Vault Architecture", prompt: "Detail CyberArk Digital Vault components: Central Policy Manager (CPM), Password Vault Web Access (PVWA), and Privileged Session Manager (PSM) for Defender exam." },
    ],
  },

  // ==========================================
  // NETWORKING & INFRASTRUCTURE
  // ==========================================
  {
    id: "cisco",
    name: "Cisco Systems (CCNA, CCNP, CCIE)",
    provider: "Cisco",
    category: "network",
    categoryLabel: "Networking & Infrastructure",
    role: "Network Architect & Engineer",
    examCount: 212,
    description: "Worldwide standard in enterprise routing, switching, data center, service provider, and cybersecurity networking.",
    vendorUrl: "https://www.cisco.com/site/us/en/learn/training-certifications/certifications/index.html",
    examTopicsUrl: "https://www.examtopics.com/exams/cisco/",
    popularExams: ["CCNA (200-301)", "CCNP Enterprise (350-401 ENCOR)", "CCNP Security (350-701 SCOR)", "CCIE Enterprise Infrastructure"],
    samplePrompts: [
      { label: "CCNA 200-301 High-Yield", prompt: "Review OSPFv2 configuration, VLAN trunking (802.1Q), Spanning Tree (RSTP), wireless architectures, and REST APIs for Cisco CCNA." },
      { label: "ENCOR 350-401 Architecture", prompt: "Explain Cisco SD-Access (LISP, VXLAN, Cisco DNA Center), BGP path selection, and wireless QoS for CCNP Enterprise ENCOR." },
    ],
  },
  {
    id: "juniper",
    name: "Juniper Networks (JNCIA, JNCIS, JNCIP)",
    provider: "Juniper",
    category: "network",
    categoryLabel: "Networking & Infrastructure",
    role: "Network Routing & Automation Engineer",
    examCount: 71,
    description: "Junos OS routing, switching, data center fabric, and Mist AI enterprise networking credentials.",
    vendorUrl: "https://www.juniper.net/us/en/training/certification/",
    examTopicsUrl: "https://www.examtopics.com/exams/juniper/",
    popularExams: ["JNCIA-Junos (JN0-104/105)", "JNCIS-ENT", "JNCIP-SP"],
    samplePrompts: [
      { label: "Junos CLI & Architecture", prompt: "Explain Junos OS operational vs configuration modes, commit confirmed, routing policies, and firewall filters for JNCIA-Junos." },
    ],
  },
  {
    id: "aruba",
    name: "Aruba / HPE Networking",
    provider: "Aruba",
    category: "network",
    categoryLabel: "Networking & Infrastructure",
    role: "Wireless & Mobility Engineer",
    examCount: 2,
    description: "Aruba Certified Mobility Associate (ACMA), Switching, and ClearPass network access control credentials.",
    vendorUrl: "https://www.arubanetworks.com/support-services/training-services/certifications/",
    examTopicsUrl: "https://www.examtopics.com/exams/aruba/",
    samplePrompts: [
      { label: "Aruba ClearPass & Mobility", prompt: "Explain 802.1X authentication, ClearPass Policy Manager rules, and Aruba Central wireless cluster management." },
    ],
  },
  {
    id: "nokia",
    name: "Nokia Service Routing & Optical Networks",
    provider: "Nokia",
    category: "network",
    categoryLabel: "Networking & Infrastructure",
    role: "Telecom & Service Provider Engineer",
    examCount: 13,
    description: "Service Routing Certification (SRC) program including NRS I, NRS II, and SRA for carrier-grade IP networks.",
    vendorUrl: "https://www.nokia.com/networks/training/src/",
    examTopicsUrl: "https://www.examtopics.com/exams/nokia/",
    samplePrompts: [
      { label: "Nokia SR-OS & MPLS", prompt: "Explain Nokia 7750 SR architecture, SR-OS CLI, MPLS LDP/RSVP-TE signaling, and VPLS service creation for Nokia NRS." },
    ],
  },

  // ==========================================
  // DATA, AI & ANALYTICS
  // ==========================================
  {
    id: "databricks",
    name: "Databricks (Lakehouse, Apache Spark)",
    provider: "Databricks",
    category: "data_ai",
    categoryLabel: "Data, AI & Analytics",
    role: "Data Engineer & ML Engineer",
    examCount: 8,
    description: "Lakehouse Platform certifications covering Apache Spark, Delta Lake, Databricks Data Engineer, and Generative AI Engineer.",
    vendorUrl: "https://www.databricks.com/learn/certification",
    examTopicsUrl: "https://www.examtopics.com/exams/databricks/",
    popularExams: ["Certified Data Engineer Associate", "Data Engineer Professional", "Generative AI Engineer Associate", "Spark Developer"],
    samplePrompts: [
      { label: "Delta Lake & Spark Optimization", prompt: "Explain Delta Lake ACID transactions, time travel, Z-Ordering, Auto-Loader, and broadcast joins for Databricks Data Engineer." },
    ],
  },
  {
    id: "snowflake",
    name: "Snowflake (SnowPro Core & Advanced)",
    provider: "Snowflake",
    category: "data_ai",
    categoryLabel: "Data, AI & Analytics",
    role: "Cloud Data Warehouse Architect",
    examCount: 11,
    description: "Snowflake data platform architecture, virtual warehouses, data sharing, zero-copy cloning, and security governance.",
    vendorUrl: "https://www.snowflake.com/en/data-cloud/certifications/",
    examTopicsUrl: "https://www.examtopics.com/exams/snowflake/",
    popularExams: ["SnowPro Core (COF-C02)", "SnowPro Advanced: Architect", "SnowPro Advanced: Data Engineer"],
    samplePrompts: [
      { label: "SnowPro Core Architecture", prompt: "Explain Snowflake 3-tier architecture (Database Storage, Query Processing, Cloud Services), micro-partitions, clustering keys, and caching layers." },
    ],
  },
  {
    id: "nvidia",
    name: "NVIDIA (AI & Accelerated Computing)",
    provider: "NVIDIA",
    category: "data_ai",
    categoryLabel: "Data, AI & Analytics",
    role: "AI / Deep Learning Specialist",
    examCount: 8,
    description: "Accelerated computing, Generative AI LLM deployment, CUDA, and NVIDIA AI Enterprise certifications.",
    vendorUrl: "https://www.nvidia.com/en-us/training/certification/",
    examTopicsUrl: "https://www.examtopics.com/exams/nvidia/",
    samplePrompts: [
      { label: "NVIDIA TensorRT & CUDA", prompt: "Explain TensorRT model quantization (FP16/INT8), CUDA streams, Triton Inference Server deployment, and GPU memory hierarchies." },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic (Claude & LLM Systems)",
    provider: "Anthropic",
    category: "data_ai",
    categoryLabel: "Data, AI & Analytics",
    role: "AI Engineer & Prompt Architect",
    examCount: 4,
    description: "LLM engineering, Constitutional AI safety evaluation, tool use, and Claude API architecture.",
    vendorUrl: "https://www.anthropic.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/anthropic/",
    samplePrompts: [
      { label: "Claude Tool Use & Safety", prompt: "Explain structured tool calling, prompt caching, system prompt engineering, and Constitutional AI alignment for Claude applications." },
    ],
  },

  // ==========================================
  // MANAGEMENT, BUSINESS & ENTERPRISE
  // ==========================================
  {
    id: "pmi",
    name: "Project Management Institute (PMP, CAPM, PMI-ACP)",
    provider: "PMI",
    category: "mgmt_business",
    categoryLabel: "Management & Enterprise",
    role: "Project Manager / Scrum Master",
    examCount: 13,
    description: "Global benchmark in predictive, agile, and hybrid project management (PMBOK Guide 7th Edition).",
    vendorUrl: "https://www.pmi.org/certifications",
    examTopicsUrl: "https://www.examtopics.com/exams/pmi/",
    popularExams: ["PMP (Project Management Professional)", "CAPM (Certified Associate)", "PMI-ACP (Agile Certified Practitioner)"],
    samplePrompts: [
      { label: "PMP People & Process Domains", prompt: "Review PMP agile mindset rules: servant leadership, conflict resolution, earned value management (EVM), and change control processes." },
      { label: "EVM Formulas & Calculations", prompt: "Explain Earned Value Management formulas: CPI, SPI, EAC, ETC, and VAC with 3 practice calculation questions for PMP." },
    ],
  },
  {
    id: "scrum-org",
    name: "Scrum.org & Scrum Alliance (PSM, CSM)",
    provider: "Scrum",
    category: "mgmt_business",
    categoryLabel: "Management & Enterprise",
    role: "Scrum Master & Product Owner",
    examCount: 5,
    description: "Professional Scrum Master (PSM I, II) and Professional Scrum Product Owner (PSPO) assessments.",
    vendorUrl: "https://www.scrum.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/scrum/",
    popularExams: ["PSM I (Professional Scrum Master)", "PSPO I (Product Owner)", "CSM (Certified ScrumMaster)"],
    samplePrompts: [
      { label: "Scrum Guide 2020 Rules", prompt: "Review the Scrum Guide 2020: 3 accountabilities, 3 artifacts, and 5 events. Detail common misunderstandings on sprint commitments and definition of done." },
    ],
  },
  {
    id: "itil",
    name: "ITIL 4 (Foundation & Managing Professional)",
    provider: "ITIL",
    category: "mgmt_business",
    categoryLabel: "Management & Enterprise",
    role: "IT Service Management Professional",
    examCount: 24,
    description: "IT Service Management framework (ITIL 4) focusing on Service Value System (SVS), Four Dimensions, and 34 Management Practices.",
    vendorUrl: "https://www.axelos.com/certifications/itil-service-management",
    examTopicsUrl: "https://www.examtopics.com/exams/itil/",
    popularExams: ["ITIL 4 Foundation", "Create, Deliver and Support (CDS)", "Drive Stakeholder Value (DSV)"],
    samplePrompts: [
      { label: "ITIL 4 Foundation Concepts", prompt: "Explain the 7 Guiding Principles of ITIL 4, Service Value Chain activities, and Incident vs Problem Management practices." },
    ],
  },
  {
    id: "salesforce",
    name: "Salesforce (Admin, Architect, Developer)",
    provider: "Salesforce",
    category: "mgmt_business",
    categoryLabel: "Management & Enterprise",
    role: "Salesforce Administrator & Architect",
    examCount: 74,
    description: "Enterprise CRM administration, Flow automation, Apex development, and Application/System Architect credentials.",
    vendorUrl: "https://trailhead.salesforce.com/credentials",
    examTopicsUrl: "https://www.examtopics.com/exams/salesforce/",
    popularExams: ["Salesforce Certified Administrator", "Platform App Builder", "Platform Developer I", "Data Cloud Consultant"],
    samplePrompts: [
      { label: "Salesforce Admin Exam Guide", prompt: "Review security models in Salesforce: Organization-Wide Defaults (OWD), Role Hierarchy, Permission Sets, and Flow trigger priorities." },
    ],
  },
  {
    id: "servicenow",
    name: "ServiceNow (CSA, CAD, CIS)",
    provider: "ServiceNow",
    category: "mgmt_business",
    categoryLabel: "Management & Enterprise",
    role: "ServiceNow Administrator & Developer",
    examCount: 22,
    description: "Enterprise workflow automation across IT Service Management (ITSM), HR Service Delivery, and custom App Engine development.",
    vendorUrl: "https://www.servicenow.com/services/training-and-certification.html",
    examTopicsUrl: "https://www.examtopics.com/exams/servicenow/",
    popularExams: ["Certified System Administrator (CSA)", "Certified Application Developer (CAD)", "CIS-ITSM"],
    samplePrompts: [
      { label: "ServiceNow CSA Blueprint", prompt: "Explain ServiceNow tables, Business Rules vs Client Scripts, Flow Designer, Update Sets, and Access Control Lists (ACLs) for CSA." },
    ],
  },
  {
    id: "shrm",
    name: "SHRM (SHRM-CP & SHRM-SCP)",
    provider: "SHRM",
    category: "mgmt_business",
    categoryLabel: "Management & Enterprise",
    role: "Human Resources Professional",
    examCount: 1,
    description: "Premier HR credentials based on the SHRM BASK model covering People, Organization, Workplace, and HR Strategy.",
    vendorUrl: "https://www.shrm.org/credentials",
    examTopicsUrl: "https://www.examtopics.com/exams/shrm/",
    popularExams: ["SHRM-CP (Certified Professional)", "SHRM-SCP (Senior Certified Professional)"],
    samplePrompts: [
      { label: "SHRM Situational Judgement", prompt: "Explain how to solve SHRM Situational Judgement Items (SJIs): balancing business strategy, employee relations, and federal employment laws." },
    ],
  },

  // ==========================================
  // FINANCE, RISK & GOVERNANCE
  // ==========================================
  {
    id: "finra",
    name: "FINRA (Series 7, SIE, Series 66)",
    provider: "FINRA",
    category: "finance",
    categoryLabel: "Finance & Securities",
    role: "Securities Representative & Financial Advisor",
    examCount: 4,
    description: "United States securities industry qualification examinations administered by the Financial Industry Regulatory Authority.",
    vendorUrl: "https://www.finra.org/registration-exams-ce/qualification-exams",
    examTopicsUrl: "https://www.examtopics.com/exams/finra/",
    popularExams: ["Securities Industry Essentials (SIE)", "Series 7 (General Securities Representative)", "Series 66 (Combined Uniform State Law)"],
    samplePrompts: [
      { label: "Series 7 Options & Debt", prompt: "Explain options strategies (spreads, straddles, collars), municipal bond taxation, and margin accounts for the FINRA Series 7 exam." },
      { label: "SIE Exam High-Yield Rules", prompt: "Summarize SEC rules, insider trading penalties, FINRA anti-money laundering requirements, and customer account types for the SIE exam." },
    ],
  },
  {
    id: "acams",
    name: "ACAMS (CAMS Certified Anti-Money Laundering)",
    provider: "ACAMS",
    category: "finance",
    categoryLabel: "Finance & Securities",
    role: "AML & Financial Crime Specialist",
    examCount: 5,
    description: "Global benchmark for anti-money laundering, counter-terrorist financing (CTF), sanctions compliance, and financial crime detection.",
    vendorUrl: "https://www.acams.org/en/certifications/cams-certification",
    examTopicsUrl: "https://www.examtopics.com/exams/acams/",
    popularExams: ["CAMS (Certified Anti-Money Laundering Specialist)", "CGSS (Global Sanctions Specialist)"],
    samplePrompts: [
      { label: "FATF 40 Recommendations", prompt: "Explain the FATF 40 Recommendations, customer due diligence (CDD/EDD), PEP handling, and suspicious transaction reporting for CAMS." },
    ],
  },
  {
    id: "isaca",
    name: "ISACA (CISA, CISM, CRISC, CGEIT)",
    provider: "Isaca",
    category: "finance",
    categoryLabel: "Finance & Governance",
    role: "IT Auditor & Risk Manager",
    examCount: 16,
    description: "Industry standard in Information Systems Audit, Information Security Management, and Enterprise Risk Governance.",
    vendorUrl: "https://www.isaca.org/credentialing",
    examTopicsUrl: "https://www.examtopics.com/exams/isaca/",
    popularExams: ["CISA (Certified Information Systems Auditor)", "CISM (Certified Information Security Manager)", "CRISC (Risk & Information Systems Control)"],
    samplePrompts: [
      { label: "CISA Auditing Standards", prompt: "Explain IT audit planning, risk-based auditing, sampling methodologies, and continuous audit techniques for the ISACA CISA exam." },
    ],
  },
  // ==========================================
  // GLOBAL & ENTERPRISE CERTIFICATION BOARDS
  // ==========================================
  {
    id: "a10-networks",
    name: "A10 Networks (Load Balancing & DDoS)",
    provider: "A10 Networks",
    category: "network",
    categoryLabel: "Networking & Telco",
    role: "Network & Application Delivery Engineer",
    examCount: 1,
    description: "Application delivery controllers, DDoS mitigation, and carrier-grade NAT certifications.",
    vendorUrl: "https://www.a10networks.com/support/training/",
    examTopicsUrl: "https://www.examtopics.com/exams/a10-networks/",
    freeResources: [
      {
            "name": "Official A10 Networks Documentation & Blueprint",
            "url": "https://www.a10networks.com/support/training/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from A10 Networks"
      },
      {
            "name": "A10 Networks (Load Balancing & DDoS) Community Reference & Guides",
            "url": "https://www.a10networks.com/support/training/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for A10 Networks (Load Balancing & DDoS)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official A10 Networks blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for A10 Networks (Load Balancing & DDoS) from A10 Networks: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for A10 Networks (Load Balancing & DDoS) with official vendor A10 Networks, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for A10 Networks (Load Balancing & DDoS)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass A10 Networks (Load Balancing & DDoS) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for A10 Networks (Load Balancing & DDoS) by A10 Networks with detailed answer rationales." }
    ]
  },
  {
    id: "aafm-india",
    name: "AAFM India (Chartered Wealth Manager)",
    provider: "AAFM India",
    category: "finance",
    categoryLabel: "Finance & Banking",
    role: "Chartered Wealth Manager & Financial Analyst",
    examCount: 2,
    description: "American Academy of Financial Management certifications including Chartered Wealth Manager (CWM).",
    vendorUrl: "https://aafmindia.co.in/",
    examTopicsUrl: "https://www.examtopics.com/exams/aafm-india/",
    freeResources: [
      {
            "name": "Official AAFM India Documentation & Blueprint",
            "url": "https://aafmindia.co.in/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from AAFM India"
      },
      {
            "name": "AAFM India (Chartered Wealth Manager) Community Reference & Guides",
            "url": "https://aafmindia.co.in/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for AAFM India (Chartered Wealth Manager)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official AAFM India blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for AAFM India (Chartered Wealth Manager) from AAFM India: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for AAFM India (Chartered Wealth Manager) with official vendor AAFM India, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for AAFM India (Chartered Wealth Manager)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass AAFM India (Chartered Wealth Manager) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for AAFM India (Chartered Wealth Manager) by AAFM India with detailed answer rationales." }
    ]
  },
  {
    id: "acfe",
    name: "ACFE (Certified Fraud Examiner CFE)",
    provider: "ACFE",
    category: "finance",
    categoryLabel: "Finance & Banking",
    role: "Certified Fraud Examiner (CFE)",
    examCount: 6,
    description: "Financial transactions & fraud schemes, investigation methodology, law, and fraud prevention & deterrence.",
    vendorUrl: "https://www.acfe.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/acfe/",
    freeResources: [
      {
            "name": "Official ACFE Documentation & Blueprint",
            "url": "https://www.acfe.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from ACFE"
      },
      {
            "name": "ACFE (Certified Fraud Examiner CFE) Community Reference & Guides",
            "url": "https://www.acfe.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for ACFE (Certified Fraud Examiner CFE)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official ACFE blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for ACFE (Certified Fraud Examiner CFE) from ACFE: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for ACFE (Certified Fraud Examiner CFE) with official vendor ACFE, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for ACFE (Certified Fraud Examiner CFE)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass ACFE (Certified Fraud Examiner CFE) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for ACFE (Certified Fraud Examiner CFE) by ACFE with detailed answer rationales." }
    ]
  },
  {
    id: "acmp",
    name: "ACMP (Change Management CCMP)",
    provider: "ACMP",
    category: "mgmt_business",
    categoryLabel: "Project & Management",
    role: "Certified Change Management Professional (CCMP)",
    examCount: 1,
    description: "Standard for change management covering organizational transformation and stakeholder readiness.",
    vendorUrl: "https://www.acmpglobal.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/acmp/",
    freeResources: [
      {
            "name": "Official ACMP Documentation & Blueprint",
            "url": "https://www.acmpglobal.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from ACMP"
      },
      {
            "name": "ACMP (Change Management CCMP) Community Reference & Guides",
            "url": "https://www.acmpglobal.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for ACMP (Change Management CCMP)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official ACMP blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for ACMP (Change Management CCMP) from ACMP: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for ACMP (Change Management CCMP) with official vendor ACMP, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for ACMP (Change Management CCMP)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass ACMP (Change Management CCMP) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for ACMP (Change Management CCMP) by ACMP with detailed answer rationales." }
    ]
  },
  {
    id: "ahlei",
    name: "AHLEI (Hospitality Leadership)",
    provider: "AHLEI",
    category: "mgmt_business",
    categoryLabel: "Project & Management",
    role: "Certified Hotel Administrator (CHA)",
    examCount: 1,
    description: "American Hotel & Lodging Educational Institute executive hospitality and lodging management.",
    vendorUrl: "https://www.ahlei.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/ahlei/",
    freeResources: [
      {
            "name": "Official AHLEI Documentation & Blueprint",
            "url": "https://www.ahlei.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from AHLEI"
      },
      {
            "name": "AHLEI (Hospitality Leadership) Community Reference & Guides",
            "url": "https://www.ahlei.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for AHLEI (Hospitality Leadership)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official AHLEI blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for AHLEI (Hospitality Leadership) from AHLEI: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for AHLEI (Hospitality Leadership) with official vendor AHLEI, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for AHLEI (Hospitality Leadership)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass AHLEI (Hospitality Leadership) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for AHLEI (Hospitality Leadership) by AHLEI with detailed answer rationales." }
    ]
  },
  {
    id: "aicpa",
    name: "AICPA (Uniform CPA Examination)",
    provider: "AICPA",
    category: "finance",
    categoryLabel: "Finance & Banking",
    role: "Certified Public Accountant (CPA)",
    examCount: 1,
    description: "Core accounting, auditing, taxation, and business environment disciplines for licensed CPAs.",
    vendorUrl: "https://www.aicpa-cima.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/aicpa/",
    freeResources: [
      {
            "name": "Official AICPA Documentation & Blueprint",
            "url": "https://www.aicpa-cima.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from AICPA"
      },
      {
            "name": "AICPA (Uniform CPA Examination) Community Reference & Guides",
            "url": "https://www.aicpa-cima.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for AICPA (Uniform CPA Examination)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official AICPA blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for AICPA (Uniform CPA Examination) from AICPA: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for AICPA (Uniform CPA Examination) with official vendor AICPA, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for AICPA (Uniform CPA Examination)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass AICPA (Uniform CPA Examination) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for AICPA (Uniform CPA Examination) by AICPA with detailed answer rationales." }
    ]
  },
  {
    id: "aiwmi",
    name: "AIWMI (Wealth Management)",
    provider: "AIWMI",
    category: "finance",
    categoryLabel: "Finance & Banking",
    role: "Alternative Investment & Wealth Manager",
    examCount: 1,
    description: "Certifications in alternative investment, family office advisory, and multi-asset wealth management.",
    vendorUrl: "https://aiwmi.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/aiwmi/",
    freeResources: [
      {
            "name": "Official AIWMI Documentation & Blueprint",
            "url": "https://aiwmi.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from AIWMI"
      },
      {
            "name": "AIWMI (Wealth Management) Community Reference & Guides",
            "url": "https://aiwmi.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for AIWMI (Wealth Management)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official AIWMI blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for AIWMI (Wealth Management) from AIWMI: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for AIWMI (Wealth Management) with official vendor AIWMI, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for AIWMI (Wealth Management)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass AIWMI (Wealth Management) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for AIWMI (Wealth Management) by AIWMI with detailed answer rationales." }
    ]
  },
  {
    id: "alcatel-lucent",
    name: "Alcatel-Lucent Enterprise",
    provider: "Alcatel-Lucent",
    category: "network",
    categoryLabel: "Networking & Telco",
    role: "Enterprise Network & VoIP Engineer",
    examCount: 8,
    description: "OmniSwitch, OmniAccess Stellar WLAN, and enterprise IP communications certifications.",
    vendorUrl: "https://www.al-enterprise.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/alcatel-lucent/",
    freeResources: [
      {
            "name": "Official Alcatel-Lucent Documentation & Blueprint",
            "url": "https://www.al-enterprise.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Alcatel-Lucent"
      },
      {
            "name": "Alcatel-Lucent Enterprise Community Reference & Guides",
            "url": "https://www.al-enterprise.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Alcatel-Lucent Enterprise"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Alcatel-Lucent blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Alcatel-Lucent Enterprise from Alcatel-Lucent: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Alcatel-Lucent Enterprise with official vendor Alcatel-Lucent, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Alcatel-Lucent Enterprise?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Alcatel-Lucent Enterprise on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Alcatel-Lucent Enterprise by Alcatel-Lucent with detailed answer rationales." }
    ]
  },
  {
    id: "alibaba",
    name: "Alibaba Cloud (ACA, ACP, ACE)",
    provider: "Alibaba Cloud",
    category: "cloud",
    categoryLabel: "Cloud & Infrastructure",
    role: "Alibaba Cloud Solutions Architect",
    examCount: 3,
    description: "Cloud computing, Big Data, and security certifications on the Alibaba Cloud platform.",
    vendorUrl: "https://www.alibabacloud.com/academy",
    examTopicsUrl: "https://www.examtopics.com/exams/alibaba/",
    freeResources: [
      {
            "name": "Official Alibaba Cloud Documentation & Blueprint",
            "url": "https://www.alibabacloud.com/academy",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Alibaba Cloud"
      },
      {
            "name": "Alibaba Cloud (ACA, ACP, ACE) Community Reference & Guides",
            "url": "https://www.alibabacloud.com/academy",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Alibaba Cloud (ACA, ACP, ACE)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Alibaba Cloud blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Alibaba Cloud (ACA, ACP, ACE) from Alibaba Cloud: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Alibaba Cloud (ACA, ACP, ACE) with official vendor Alibaba Cloud, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Alibaba Cloud (ACA, ACP, ACE)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Alibaba Cloud (ACA, ACP, ACE) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Alibaba Cloud (ACA, ACP, ACE) by Alibaba Cloud with detailed answer rationales." }
    ]
  },
  {
    id: "androidatc",
    name: "AndroidATC (Android Developer)",
    provider: "AndroidATC",
    category: "dev_software",
    categoryLabel: "Software & Development",
    role: "Android Certified Application Developer",
    examCount: 3,
    description: "Kotlin, Android UI architecture, security, and SQLite mobile application engineering.",
    vendorUrl: "https://androidatc.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/androidatc/",
    freeResources: [
      {
            "name": "Official AndroidATC Documentation & Blueprint",
            "url": "https://androidatc.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from AndroidATC"
      },
      {
            "name": "AndroidATC (Android Developer) Community Reference & Guides",
            "url": "https://androidatc.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for AndroidATC (Android Developer)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official AndroidATC blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for AndroidATC (Android Developer) from AndroidATC: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for AndroidATC (Android Developer) with official vendor AndroidATC, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for AndroidATC (Android Developer)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass AndroidATC (Android Developer) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for AndroidATC (Android Developer) by AndroidATC with detailed answer rationales." }
    ]
  },
  {
    id: "api",
    name: "API (American Petroleum Institute)",
    provider: "American Petroleum Institute",
    category: "trades",
    categoryLabel: "Skilled Trades & Engineering",
    role: "Petroleum Inspector & Piping Specialist",
    examCount: 2,
    description: "API 510 Pressure Vessel, API 570 Piping, and API 653 Aboveground Storage Tank Inspector.",
    vendorUrl: "https://www.api.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/api/",
    freeResources: [
      {
            "name": "Official American Petroleum Institute Documentation & Blueprint",
            "url": "https://www.api.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from American Petroleum Institute"
      },
      {
            "name": "API (American Petroleum Institute) Community Reference & Guides",
            "url": "https://www.api.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for API (American Petroleum Institute)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official American Petroleum Institute blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for API (American Petroleum Institute) from American Petroleum Institute: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for API (American Petroleum Institute) with official vendor American Petroleum Institute, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for API (American Petroleum Institute)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass API (American Petroleum Institute) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for API (American Petroleum Institute) by American Petroleum Institute with detailed answer rationales." }
    ]
  },
  {
    id: "apics",
    name: "APICS (ASCM Supply Chain CSCP)",
    provider: "APICS / ASCM",
    category: "mgmt_business",
    categoryLabel: "Project & Management",
    role: "Certified Supply Chain Professional (CSCP)",
    examCount: 4,
    description: "CPIM Production & Inventory, CSCP Supply Chain, and CLTD Logistics certifications.",
    vendorUrl: "https://www.ascm.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/apics/",
    freeResources: [
      {
            "name": "Official APICS / ASCM Documentation & Blueprint",
            "url": "https://www.ascm.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from APICS / ASCM"
      },
      {
            "name": "APICS (ASCM Supply Chain CSCP) Community Reference & Guides",
            "url": "https://www.ascm.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for APICS (ASCM Supply Chain CSCP)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official APICS / ASCM blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for APICS (ASCM Supply Chain CSCP) from APICS / ASCM: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for APICS (ASCM Supply Chain CSCP) with official vendor APICS / ASCM, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for APICS (ASCM Supply Chain CSCP)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass APICS (ASCM Supply Chain CSCP) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for APICS (ASCM Supply Chain CSCP) by APICS / ASCM with detailed answer rationales." }
    ]
  },
  {
    id: "appian",
    name: "Appian (Lead & Senior Developer)",
    provider: "Appian",
    category: "dev_software",
    categoryLabel: "Software & Development",
    role: "Appian Low-Code Architect",
    examCount: 5,
    description: "Process modeling, enterprise data fabric integrations, and low-code solution engineering.",
    vendorUrl: "https://community.appian.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/appian/",
    freeResources: [
      {
            "name": "Official Appian Documentation & Blueprint",
            "url": "https://community.appian.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Appian"
      },
      {
            "name": "Appian (Lead & Senior Developer) Community Reference & Guides",
            "url": "https://community.appian.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Appian (Lead & Senior Developer)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Appian blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Appian (Lead & Senior Developer) from Appian: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Appian (Lead & Senior Developer) with official vendor Appian, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Appian (Lead & Senior Developer)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Appian (Lead & Senior Developer) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Appian (Lead & Senior Developer) by Appian with detailed answer rationales." }
    ]
  },
  {
    id: "apple",
    name: "Apple Certified IT & Developer",
    provider: "Apple",
    category: "dev_software",
    categoryLabel: "Software & Development",
    role: "Apple Certified Support Professional",
    examCount: 7,
    description: "macOS, iOS mobile device management (MDM), and Apple Device Support credentials.",
    vendorUrl: "https://training.apple.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/apple/",
    freeResources: [
      {
            "name": "Official Apple Documentation & Blueprint",
            "url": "https://training.apple.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Apple"
      },
      {
            "name": "Apple Certified IT & Developer Community Reference & Guides",
            "url": "https://training.apple.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Apple Certified IT & Developer"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Apple blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Apple Certified IT & Developer from Apple: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Apple Certified IT & Developer with official vendor Apple, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Apple Certified IT & Developer?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Apple Certified IT & Developer on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Apple Certified IT & Developer by Apple with detailed answer rationales." }
    ]
  },
  {
    id: "apse",
    name: "APSE (Employment Support CESP)",
    provider: "APSE",
    category: "mgmt_business",
    categoryLabel: "Project & Management",
    role: "Certified Employment Support Professional (CESP)",
    examCount: 1,
    description: "National credential for professionals supporting individuals with disabilities in employment.",
    vendorUrl: "https://apse.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/apse/",
    freeResources: [
      {
            "name": "Official APSE Documentation & Blueprint",
            "url": "https://apse.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from APSE"
      },
      {
            "name": "APSE (Employment Support CESP) Community Reference & Guides",
            "url": "https://apse.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for APSE (Employment Support CESP)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official APSE blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for APSE (Employment Support CESP) from APSE: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for APSE (Employment Support CESP) with official vendor APSE, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for APSE (Employment Support CESP)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass APSE (Employment Support CESP) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for APSE (Employment Support CESP) by APSE with detailed answer rationales." }
    ]
  },
  {
    id: "arista",
    name: "Arista Networks (Cloud Engineer ACE)",
    provider: "Arista Networks",
    category: "network",
    categoryLabel: "Networking & Telco",
    role: "Arista Cloud Engineer (ACE)",
    examCount: 1,
    description: "EOS configuration, CloudVision, BGP EVPN data center fabric design, and VXLAN routing.",
    vendorUrl: "https://www.arista.com/en/support/training",
    examTopicsUrl: "https://www.examtopics.com/exams/arista/",
    freeResources: [
      {
            "name": "Official Arista Networks Documentation & Blueprint",
            "url": "https://www.arista.com/en/support/training",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Arista Networks"
      },
      {
            "name": "Arista Networks (Cloud Engineer ACE) Community Reference & Guides",
            "url": "https://www.arista.com/en/support/training",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Arista Networks (Cloud Engineer ACE)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Arista Networks blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Arista Networks (Cloud Engineer ACE) from Arista Networks: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Arista Networks (Cloud Engineer ACE) with official vendor Arista Networks, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Arista Networks (Cloud Engineer ACE)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Arista Networks (Cloud Engineer ACE) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Arista Networks (Cloud Engineer ACE) by Arista Networks with detailed answer rationales." }
    ]
  },
  {
    id: "aruba",
    name: "Aruba Networks (ClearPass & WLAN)",
    provider: "Aruba / HPE",
    category: "network",
    categoryLabel: "Networking & Telco",
    role: "Aruba Certified Mobility Associate (ACMA)",
    examCount: 2,
    description: "Enterprise wireless LANs, ClearPass Policy Manager, and ArubaOS switching fabric.",
    vendorUrl: "https://www.arubanetworks.com/support-services/training-services/certifications/",
    examTopicsUrl: "https://www.examtopics.com/exams/aruba/",
    freeResources: [
      {
            "name": "Official Aruba / HPE Documentation & Blueprint",
            "url": "https://www.arubanetworks.com/support-services/training-services/certifications/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Aruba / HPE"
      },
      {
            "name": "Aruba Networks (ClearPass & WLAN) Community Reference & Guides",
            "url": "https://www.arubanetworks.com/support-services/training-services/certifications/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Aruba Networks (ClearPass & WLAN)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Aruba / HPE blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Aruba Networks (ClearPass & WLAN) from Aruba / HPE: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Aruba Networks (ClearPass & WLAN) with official vendor Aruba / HPE, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Aruba Networks (ClearPass & WLAN)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Aruba Networks (ClearPass & WLAN) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Aruba Networks (ClearPass & WLAN) by Aruba / HPE with detailed answer rationales." }
    ]
  },
  {
    id: "asis",
    name: "ASIS International (CPP, PSP, PCI)",
    provider: "ASIS International",
    category: "cyber",
    categoryLabel: "Cybersecurity",
    role: "Certified Protection Professional (CPP)",
    examCount: 4,
    description: "Physical security, risk assessment, investigations, and security management credentials.",
    vendorUrl: "https://www.asisonline.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/asis/",
    freeResources: [
      {
            "name": "Official ASIS International Documentation & Blueprint",
            "url": "https://www.asisonline.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from ASIS International"
      },
      {
            "name": "ASIS International (CPP, PSP, PCI) Community Reference & Guides",
            "url": "https://www.asisonline.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for ASIS International (CPP, PSP, PCI)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official ASIS International blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for ASIS International (CPP, PSP, PCI) from ASIS International: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for ASIS International (CPP, PSP, PCI) with official vendor ASIS International, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for ASIS International (CPP, PSP, PCI)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass ASIS International (CPP, PSP, PCI) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for ASIS International (CPP, PSP, PCI) by ASIS International with detailed answer rationales." }
    ]
  },
  {
    id: "asq",
    name: "ASQ (Quality Engineer & Black Belt)",
    provider: "ASQ",
    category: "mgmt_business",
    categoryLabel: "Project & Management",
    role: "Certified Quality Engineer (CQE) / CSSBB",
    examCount: 8,
    description: "Six Sigma Black Belt, Quality Auditor, Reliability Engineer, and Quality Manager.",
    vendorUrl: "https://asq.org/cert",
    examTopicsUrl: "https://www.examtopics.com/exams/asq/",
    freeResources: [
      {
            "name": "Official ASQ Documentation & Blueprint",
            "url": "https://asq.org/cert",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from ASQ"
      },
      {
            "name": "ASQ (Quality Engineer & Black Belt) Community Reference & Guides",
            "url": "https://asq.org/cert",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for ASQ (Quality Engineer & Black Belt)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official ASQ blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for ASQ (Quality Engineer & Black Belt) from ASQ: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for ASQ (Quality Engineer & Black Belt) with official vendor ASQ, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for ASQ (Quality Engineer & Black Belt)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass ASQ (Quality Engineer & Black Belt) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for ASQ (Quality Engineer & Black Belt) by ASQ with detailed answer rationales." }
    ]
  },
  {
    id: "atlassian",
    name: "Atlassian (Jira & Confluence ACP)",
    provider: "Atlassian",
    category: "dev_software",
    categoryLabel: "Software & Development",
    role: "Atlassian Certified Professional (ACP)",
    examCount: 4,
    description: "Jira Project Administration, Confluence Space Management, and Jira Service Management.",
    vendorUrl: "https://university.atlassian.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/atlassian/",
    freeResources: [
      {
            "name": "Official Atlassian Documentation & Blueprint",
            "url": "https://university.atlassian.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Atlassian"
      },
      {
            "name": "Atlassian (Jira & Confluence ACP) Community Reference & Guides",
            "url": "https://university.atlassian.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Atlassian (Jira & Confluence ACP)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Atlassian blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Atlassian (Jira & Confluence ACP) from Atlassian: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Atlassian (Jira & Confluence ACP) with official vendor Atlassian, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Atlassian (Jira & Confluence ACP)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Atlassian (Jira & Confluence ACP) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Atlassian (Jira & Confluence ACP) by Atlassian with detailed answer rationales." }
    ]
  },
  {
    id: "autodesk",
    name: "Autodesk (AutoCAD & Revit BIM)",
    provider: "Autodesk",
    category: "trades",
    categoryLabel: "Skilled Trades & Engineering",
    role: "Autodesk Certified Professional (BIM / CAD)",
    examCount: 1,
    description: "Architectural drafting, structural engineering, and MEP modeling in Revit and AutoCAD.",
    vendorUrl: "https://www.autodesk.com/certification",
    examTopicsUrl: "https://www.examtopics.com/exams/autodesk/",
    freeResources: [
      {
            "name": "Official Autodesk Documentation & Blueprint",
            "url": "https://www.autodesk.com/certification",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Autodesk"
      },
      {
            "name": "Autodesk (AutoCAD & Revit BIM) Community Reference & Guides",
            "url": "https://www.autodesk.com/certification",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Autodesk (AutoCAD & Revit BIM)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Autodesk blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Autodesk (AutoCAD & Revit BIM) from Autodesk: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Autodesk (AutoCAD & Revit BIM) with official vendor Autodesk, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Autodesk (AutoCAD & Revit BIM)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Autodesk (AutoCAD & Revit BIM) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Autodesk (AutoCAD & Revit BIM) by Autodesk with detailed answer rationales." }
    ]
  },
  {
    id: "avaya",
    name: "Avaya (Aura & IP Office)",
    provider: "Avaya",
    category: "network",
    categoryLabel: "Networking & Telco",
    role: "Avaya Certified Implementation Specialist",
    examCount: 49,
    description: "Avaya Aura Communication Manager, Session Border Controller, and Contact Center systems.",
    vendorUrl: "https://www.avaya.com/en/services/learning/",
    examTopicsUrl: "https://www.examtopics.com/exams/avaya/",
    freeResources: [
      {
            "name": "Official Avaya Documentation & Blueprint",
            "url": "https://www.avaya.com/en/services/learning/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Avaya"
      },
      {
            "name": "Avaya (Aura & IP Office) Community Reference & Guides",
            "url": "https://www.avaya.com/en/services/learning/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Avaya (Aura & IP Office)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Avaya blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Avaya (Aura & IP Office) from Avaya: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Avaya (Aura & IP Office) with official vendor Avaya, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Avaya (Aura & IP Office)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Avaya (Aura & IP Office) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Avaya (Aura & IP Office) by Avaya with detailed answer rationales." }
    ]
  },
  {
    id: "avixa",
    name: "AVIXA (Certified Technology Specialist CTS)",
    provider: "AVIXA",
    category: "trades",
    categoryLabel: "Skilled Trades & Engineering",
    role: "CTS / CTS-D Audiovisual Specialist",
    examCount: 1,
    description: "Commercial audio, video, acoustics, and IP streaming audiovisual engineering.",
    vendorUrl: "https://www.avixa.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/avixa/",
    freeResources: [
      {
            "name": "Official AVIXA Documentation & Blueprint",
            "url": "https://www.avixa.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from AVIXA"
      },
      {
            "name": "AVIXA (Certified Technology Specialist CTS) Community Reference & Guides",
            "url": "https://www.avixa.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for AVIXA (Certified Technology Specialist CTS)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official AVIXA blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for AVIXA (Certified Technology Specialist CTS) from AVIXA: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for AVIXA (Certified Technology Specialist CTS) with official vendor AVIXA, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for AVIXA (Certified Technology Specialist CTS)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass AVIXA (Certified Technology Specialist CTS) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for AVIXA (Certified Technology Specialist CTS) by AVIXA with detailed answer rationales." }
    ]
  },
  {
    id: "axis-communications",
    name: "Axis Communications Video Surveillance",
    provider: "Axis Communications",
    category: "cyber",
    categoryLabel: "Cybersecurity",
    role: "Axis Certified Professional",
    examCount: 2,
    description: "Network video surveillance, IP camera optics, cybersecurity hardening, and video analytics.",
    vendorUrl: "https://www.axis.com/academy",
    examTopicsUrl: "https://www.examtopics.com/exams/axis-communications/",
    freeResources: [
      {
            "name": "Official Axis Communications Documentation & Blueprint",
            "url": "https://www.axis.com/academy",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Axis Communications"
      },
      {
            "name": "Axis Communications Video Surveillance Community Reference & Guides",
            "url": "https://www.axis.com/academy",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Axis Communications Video Surveillance"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Axis Communications blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Axis Communications Video Surveillance from Axis Communications: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Axis Communications Video Surveillance with official vendor Axis Communications, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Axis Communications Video Surveillance?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Axis Communications Video Surveillance on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Axis Communications Video Surveillance by Axis Communications with detailed answer rationales." }
    ]
  },
  {
    id: "bcs",
    name: "BCS (Chartered Institute for IT)",
    provider: "BCS",
    category: "mgmt_business",
    categoryLabel: "Project & Management",
    role: "BCS Certified Business Analyst",
    examCount: 7,
    description: "Business analysis, solution architecture, software testing, and IT governance diplomas.",
    vendorUrl: "https://www.bcs.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/bcs/",
    freeResources: [
      {
            "name": "Official BCS Documentation & Blueprint",
            "url": "https://www.bcs.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from BCS"
      },
      {
            "name": "BCS (Chartered Institute for IT) Community Reference & Guides",
            "url": "https://www.bcs.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for BCS (Chartered Institute for IT)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official BCS blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for BCS (Chartered Institute for IT) from BCS: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for BCS (Chartered Institute for IT) with official vendor BCS, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for BCS (Chartered Institute for IT)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass BCS (Chartered Institute for IT) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for BCS (Chartered Institute for IT) by BCS with detailed answer rationales." }
    ]
  },
  {
    id: "bicsi",
    name: "BICSI (RCDD Cabling Designer)",
    provider: "BICSI",
    category: "network",
    categoryLabel: "Networking & Telco",
    role: "Registered Communications Distribution Designer",
    examCount: 2,
    description: "Telecommunications structured cabling, data center design, and outside plant engineering.",
    vendorUrl: "https://www.bicsi.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/bicsi/",
    freeResources: [
      {
            "name": "Official BICSI Documentation & Blueprint",
            "url": "https://www.bicsi.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from BICSI"
      },
      {
            "name": "BICSI (RCDD Cabling Designer) Community Reference & Guides",
            "url": "https://www.bicsi.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for BICSI (RCDD Cabling Designer)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official BICSI blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for BICSI (RCDD Cabling Designer) from BICSI: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for BICSI (RCDD Cabling Designer) with official vendor BICSI, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for BICSI (RCDD Cabling Designer)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass BICSI (RCDD Cabling Designer) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for BICSI (RCDD Cabling Designer) by BICSI with detailed answer rationales." }
    ]
  },
  {
    id: "blockchain",
    name: "Blockchain Council Certified Architect",
    provider: "Blockchain Council",
    category: "dev_software",
    categoryLabel: "Software & Development",
    role: "Certified Blockchain Developer / Architect",
    examCount: 4,
    description: "Smart contracts, Ethereum, Hyperledger, DeFi protocols, and Web3 consensus architectures.",
    vendorUrl: "https://www.blockchain-council.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/blockchain/",
    freeResources: [
      {
            "name": "Official Blockchain Council Documentation & Blueprint",
            "url": "https://www.blockchain-council.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Blockchain Council"
      },
      {
            "name": "Blockchain Council Certified Architect Community Reference & Guides",
            "url": "https://www.blockchain-council.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Blockchain Council Certified Architect"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Blockchain Council blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Blockchain Council Certified Architect from Blockchain Council: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Blockchain Council Certified Architect with official vendor Blockchain Council, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Blockchain Council Certified Architect?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Blockchain Council Certified Architect on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Blockchain Council Certified Architect by Blockchain Council with detailed answer rationales." }
    ]
  },
  {
    id: "blue-coat",
    name: "Blue Coat / Symantec ProxySG",
    provider: "Broadcom / Blue Coat",
    category: "cyber",
    categoryLabel: "Cybersecurity",
    role: "ProxySG Network Security Administrator",
    examCount: 2,
    description: "Secure web gateway (SWG), SSL interception, content filtering, and reverse proxy routing.",
    vendorUrl: "https://www.broadcom.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/blue-coat/",
    freeResources: [
      {
            "name": "Official Broadcom / Blue Coat Documentation & Blueprint",
            "url": "https://www.broadcom.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Broadcom / Blue Coat"
      },
      {
            "name": "Blue Coat / Symantec ProxySG Community Reference & Guides",
            "url": "https://www.broadcom.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Blue Coat / Symantec ProxySG"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Broadcom / Blue Coat blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Blue Coat / Symantec ProxySG from Broadcom / Blue Coat: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Blue Coat / Symantec ProxySG with official vendor Broadcom / Blue Coat, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Blue Coat / Symantec ProxySG?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Blue Coat / Symantec ProxySG on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Blue Coat / Symantec ProxySG by Broadcom / Blue Coat with detailed answer rationales." }
    ]
  },
  {
    id: "blue-prism",
    name: "Blue Prism (RPA Developer & Designer)",
    provider: "Blue Prism",
    category: "dev_software",
    categoryLabel: "Software & Development",
    role: "Blue Prism Certified Developer",
    examCount: 7,
    description: "Robotic Process Automation (RPA), object modeling, work queues, and process studio.",
    vendorUrl: "https://www.blueprism.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/blue-prism/",
    freeResources: [
      {
            "name": "Official Blue Prism Documentation & Blueprint",
            "url": "https://www.blueprism.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Blue Prism"
      },
      {
            "name": "Blue Prism (RPA Developer & Designer) Community Reference & Guides",
            "url": "https://www.blueprism.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Blue Prism (RPA Developer & Designer)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Blue Prism blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Blue Prism (RPA Developer & Designer) from Blue Prism: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Blue Prism (RPA Developer & Designer) with official vendor Blue Prism, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Blue Prism (RPA Developer & Designer)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Blue Prism (RPA Developer & Designer) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Blue Prism (RPA Developer & Designer) by Blue Prism with detailed answer rationales." }
    ]
  },
  {
    id: "brightest",
    name: "Brightest Certification",
    provider: "Brightest",
    category: "dev_software",
    categoryLabel: "Software & Development",
    role: "Brightest Certified Software Tester",
    examCount: 1,
    description: "Agile testing, cloud testing, and automated software validation frameworks.",
    vendorUrl: "https://brightest.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/brightest/",
    freeResources: [
      {
            "name": "Official Brightest Documentation & Blueprint",
            "url": "https://brightest.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Brightest"
      },
      {
            "name": "Brightest Certification Community Reference & Guides",
            "url": "https://brightest.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Brightest Certification"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Brightest blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Brightest Certification from Brightest: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Brightest Certification with official vendor Brightest, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Brightest Certification?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Brightest Certification on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Brightest Certification by Brightest with detailed answer rationales." }
    ]
  },
  {
    id: "canadian-securities-institute",
    name: "Canadian Securities Institute (CSC)",
    provider: "CSI",
    category: "finance",
    categoryLabel: "Finance & Banking",
    role: "Canadian Securities Course (CSC) Graduate",
    examCount: 2,
    description: "Canadian capital markets, investment analysis, portfolio management, and securities regulations.",
    vendorUrl: "https://www.csi.ca/",
    examTopicsUrl: "https://www.examtopics.com/exams/canadian-securities-institute/",
    freeResources: [
      {
            "name": "Official CSI Documentation & Blueprint",
            "url": "https://www.csi.ca/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from CSI"
      },
      {
            "name": "Canadian Securities Institute (CSC) Community Reference & Guides",
            "url": "https://www.csi.ca/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Canadian Securities Institute (CSC)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official CSI blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Canadian Securities Institute (CSC) from CSI: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Canadian Securities Institute (CSC) with official vendor CSI, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Canadian Securities Institute (CSC)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Canadian Securities Institute (CSC) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Canadian Securities Institute (CSC) by CSI with detailed answer rationales." }
    ]
  },
  {
    id: "ca-technologies",
    name: "CA Technologies / Broadcom Enterprise",
    provider: "Broadcom / CA",
    category: "dev_software",
    categoryLabel: "Software & Development",
    role: "CA Enterprise Software Administrator",
    examCount: 1,
    description: "Mainframe operations, enterprise workload automation, and CA API gateway management.",
    vendorUrl: "https://www.broadcom.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/ca-technologies/",
    freeResources: [
      {
            "name": "Official Broadcom / CA Documentation & Blueprint",
            "url": "https://www.broadcom.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Broadcom / CA"
      },
      {
            "name": "CA Technologies / Broadcom Enterprise Community Reference & Guides",
            "url": "https://www.broadcom.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for CA Technologies / Broadcom Enterprise"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Broadcom / CA blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for CA Technologies / Broadcom Enterprise from Broadcom / CA: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for CA Technologies / Broadcom Enterprise with official vendor Broadcom / CA, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for CA Technologies / Broadcom Enterprise?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass CA Technologies / Broadcom Enterprise on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for CA Technologies / Broadcom Enterprise by Broadcom / CA with detailed answer rationales." }
    ]
  },
  {
    id: "cdmp",
    name: "CDMP (DAMA Data Management)",
    provider: "DAMA International",
    category: "data_ai",
    categoryLabel: "Data, AI & Analytics",
    role: "Certified Data Management Professional",
    examCount: 3,
    description: "DAMA-DMBOK data governance, data modeling, metadata, data quality, and warehousing.",
    vendorUrl: "https://cdmp.info/",
    examTopicsUrl: "https://www.examtopics.com/exams/cdmp/",
    freeResources: [
      {
            "name": "Official DAMA International Documentation & Blueprint",
            "url": "https://cdmp.info/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from DAMA International"
      },
      {
            "name": "CDMP (DAMA Data Management) Community Reference & Guides",
            "url": "https://cdmp.info/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for CDMP (DAMA Data Management)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official DAMA International blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for CDMP (DAMA Data Management) from DAMA International: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for CDMP (DAMA Data Management) with official vendor DAMA International, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for CDMP (DAMA Data Management)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass CDMP (DAMA Data Management) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for CDMP (DAMA Data Management) by DAMA International with detailed answer rationales." }
    ]
  },
  {
    id: "certinia",
    name: "Certinia (PSA & ERP on Salesforce)",
    provider: "Certinia",
    category: "mgmt_business",
    categoryLabel: "Project & Management",
    role: "Certinia PSA & ERP Consultant",
    examCount: 1,
    description: "Professional Services Automation (PSA), billing, and ERP built natively on Salesforce.",
    vendorUrl: "https://certinia.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/certinia/",
    freeResources: [
      {
            "name": "Official Certinia Documentation & Blueprint",
            "url": "https://certinia.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Certinia"
      },
      {
            "name": "Certinia (PSA & ERP on Salesforce) Community Reference & Guides",
            "url": "https://certinia.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Certinia (PSA & ERP on Salesforce)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Certinia blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Certinia (PSA & ERP on Salesforce) from Certinia: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Certinia (PSA & ERP on Salesforce) with official vendor Certinia, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Certinia (PSA & ERP on Salesforce)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Certinia (PSA & ERP on Salesforce) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Certinia (PSA & ERP on Salesforce) by Certinia with detailed answer rationales." }
    ]
  },
  {
    id: "certiport",
    name: "Certiport (IC3 Digital Literacy)",
    provider: "Certiport / Pearson",
    category: "mgmt_business",
    categoryLabel: "Project & Management",
    role: "IC3 Digital Literacy Specialist",
    examCount: 1,
    description: "Computing fundamentals, key applications, and living online foundational certifications.",
    vendorUrl: "https://certiport.pearsonvue.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/certiport/",
    freeResources: [
      {
            "name": "Official Certiport / Pearson Documentation & Blueprint",
            "url": "https://certiport.pearsonvue.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Certiport / Pearson"
      },
      {
            "name": "Certiport (IC3 Digital Literacy) Community Reference & Guides",
            "url": "https://certiport.pearsonvue.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Certiport (IC3 Digital Literacy)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Certiport / Pearson blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Certiport (IC3 Digital Literacy) from Certiport / Pearson: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Certiport (IC3 Digital Literacy) with official vendor Certiport / Pearson, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Certiport (IC3 Digital Literacy)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Certiport (IC3 Digital Literacy) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Certiport (IC3 Digital Literacy) by Certiport / Pearson with detailed answer rationales." }
    ]
  },
  {
    id: "certnexus",
    name: "CertNexus (AIBIZ, CEET, IoT Security)",
    provider: "CertNexus",
    category: "data_ai",
    categoryLabel: "Data, AI & Analytics",
    role: "Certified Ethical Emerging Technologist (CEET)",
    examCount: 3,
    description: "Artificial intelligence ethics, IoT security, and data science for business leaders.",
    vendorUrl: "https://certnexus.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/certnexus/",
    freeResources: [
      {
            "name": "Official CertNexus Documentation & Blueprint",
            "url": "https://certnexus.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from CertNexus"
      },
      {
            "name": "CertNexus (AIBIZ, CEET, IoT Security) Community Reference & Guides",
            "url": "https://certnexus.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for CertNexus (AIBIZ, CEET, IoT Security)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official CertNexus blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for CertNexus (AIBIZ, CEET, IoT Security) from CertNexus: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for CertNexus (AIBIZ, CEET, IoT Security) with official vendor CertNexus, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for CertNexus (AIBIZ, CEET, IoT Security)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass CertNexus (AIBIZ, CEET, IoT Security) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for CertNexus (AIBIZ, CEET, IoT Security) by CertNexus with detailed answer rationales." }
    ]
  },
  {
    id: "c-plus-plus-institute",
    name: "C++ Institute (CPA & CPP Certified)",
    provider: "C++ Institute",
    category: "dev_software",
    categoryLabel: "Software & Development",
    role: "Certified Professional C++ Programmer",
    examCount: 2,
    description: "Object-oriented programming, STL template libraries, memory management, and C++ idioms.",
    vendorUrl: "https://cppinstitute.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/c-plus-plus-institute/",
    freeResources: [
      {
            "name": "Official C++ Institute Documentation & Blueprint",
            "url": "https://cppinstitute.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from C++ Institute"
      },
      {
            "name": "C++ Institute (CPA & CPP Certified) Community Reference & Guides",
            "url": "https://cppinstitute.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for C++ Institute (CPA & CPP Certified)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official C++ Institute blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for C++ Institute (CPA & CPP Certified) from C++ Institute: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for C++ Institute (CPA & CPP Certified) with official vendor C++ Institute, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for C++ Institute (CPA & CPP Certified)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass C++ Institute (CPA & CPP Certified) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for C++ Institute (CPA & CPP Certified) by C++ Institute with detailed answer rationales." }
    ]
  },
  {
    id: "cips",
    name: "CIPS (Chartered Procurement & Supply)",
    provider: "CIPS",
    category: "mgmt_business",
    categoryLabel: "Project & Management",
    role: "MCIPS Chartered Procurement Professional",
    examCount: 5,
    description: "Strategic sourcing, supplier contract negotiation, supply chain risk, and ethical procurement.",
    vendorUrl: "https://www.cips.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/cips/",
    freeResources: [
      {
            "name": "Official CIPS Documentation & Blueprint",
            "url": "https://www.cips.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from CIPS"
      },
      {
            "name": "CIPS (Chartered Procurement & Supply) Community Reference & Guides",
            "url": "https://www.cips.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for CIPS (Chartered Procurement & Supply)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official CIPS blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for CIPS (Chartered Procurement & Supply) from CIPS: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for CIPS (Chartered Procurement & Supply) with official vendor CIPS, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for CIPS (Chartered Procurement & Supply)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass CIPS (Chartered Procurement & Supply) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for CIPS (Chartered Procurement & Supply) by CIPS with detailed answer rationales." }
    ]
  },
  {
    id: "cisi",
    name: "CISI (Securities & Wealth Management)",
    provider: "CISI",
    category: "finance",
    categoryLabel: "Finance & Banking",
    role: "CISI Chartered Wealth Manager",
    examCount: 1,
    description: "Chartered Institute for Securities & Investment global financial wealth advisory diplomas.",
    vendorUrl: "https://www.cisi.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/cisi/",
    freeResources: [
      {
            "name": "Official CISI Documentation & Blueprint",
            "url": "https://www.cisi.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from CISI"
      },
      {
            "name": "CISI (Securities & Wealth Management) Community Reference & Guides",
            "url": "https://www.cisi.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for CISI (Securities & Wealth Management)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official CISI blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for CISI (Securities & Wealth Management) from CISI: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for CISI (Securities & Wealth Management) with official vendor CISI, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for CISI (Securities & Wealth Management)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass CISI (Securities & Wealth Management) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for CISI (Securities & Wealth Management) by CISI with detailed answer rationales." }
    ]
  },
  {
    id: "citrix",
    name: "Citrix (CCA-V, CCP-V, CCE-V)",
    provider: "Citrix / Cloud Software Group",
    category: "cloud",
    categoryLabel: "Cloud & Infrastructure",
    role: "Citrix Virtual Apps & Desktops Architect",
    examCount: 18,
    description: "Virtualization, NetScaler ADC load balancing, Provisioning Services (PVS), and StoreFront.",
    vendorUrl: "https://www.citrix.com/training-and-certifications/",
    examTopicsUrl: "https://www.examtopics.com/exams/citrix/",
    freeResources: [
      {
            "name": "Official Citrix / Cloud Software Group Documentation & Blueprint",
            "url": "https://www.citrix.com/training-and-certifications/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Citrix / Cloud Software Group"
      },
      {
            "name": "Citrix (CCA-V, CCP-V, CCE-V) Community Reference & Guides",
            "url": "https://www.citrix.com/training-and-certifications/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Citrix (CCA-V, CCP-V, CCE-V)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Citrix / Cloud Software Group blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Citrix (CCA-V, CCP-V, CCE-V) from Citrix / Cloud Software Group: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Citrix (CCA-V, CCP-V, CCE-V) with official vendor Citrix / Cloud Software Group, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Citrix (CCA-V, CCP-V, CCE-V)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Citrix (CCA-V, CCP-V, CCE-V) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Citrix (CCA-V, CCP-V, CCE-V) by Citrix / Cloud Software Group with detailed answer rationales." }
    ]
  },
  {
    id: "ciw",
    name: "CIW (Web Foundations & Web Security)",
    provider: "CIW",
    category: "dev_software",
    categoryLabel: "Software & Development",
    role: "CIW Certified Web Developer",
    examCount: 6,
    description: "HTML5, CSS3, JavaScript, web design fundamentals, and web security essentials.",
    vendorUrl: "https://www.ciwcertified.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/ciw/",
    freeResources: [
      {
            "name": "Official CIW Documentation & Blueprint",
            "url": "https://www.ciwcertified.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from CIW"
      },
      {
            "name": "CIW (Web Foundations & Web Security) Community Reference & Guides",
            "url": "https://www.ciwcertified.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for CIW (Web Foundations & Web Security)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official CIW blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for CIW (Web Foundations & Web Security) from CIW: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for CIW (Web Foundations & Web Security) with official vendor CIW, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for CIW (Web Foundations & Web Security)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass CIW (Web Foundations & Web Security) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for CIW (Web Foundations & Web Security) by CIW with detailed answer rationales." }
    ]
  },
  {
    id: "cloudera",
    name: "Cloudera (CCA & CCP Big Data Platform)",
    provider: "Cloudera",
    category: "data_ai",
    categoryLabel: "Data, AI & Analytics",
    role: "Cloudera Certified Data Platform Administrator",
    examCount: 1,
    description: "Hadoop, Apache Spark, HDFS, Cloudera Manager, and enterprise data cloud architecture.",
    vendorUrl: "https://www.cloudera.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/cloudera/",
    freeResources: [
      {
            "name": "Official Cloudera Documentation & Blueprint",
            "url": "https://www.cloudera.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Cloudera"
      },
      {
            "name": "Cloudera (CCA & CCP Big Data Platform) Community Reference & Guides",
            "url": "https://www.cloudera.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Cloudera (CCA & CCP Big Data Platform)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Cloudera blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Cloudera (CCA & CCP Big Data Platform) from Cloudera: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Cloudera (CCA & CCP Big Data Platform) with official vendor Cloudera, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Cloudera (CCA & CCP Big Data Platform)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Cloudera (CCA & CCP Big Data Platform) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Cloudera (CCA & CCP Big Data Platform) by Cloudera with detailed answer rationales." }
    ]
  },
  {
    id: "cmaa",
    name: "CMAA (Certified Construction Manager CCM)",
    provider: "CMAA",
    category: "trades",
    categoryLabel: "Skilled Trades & Engineering",
    role: "Certified Construction Manager (CCM)",
    examCount: 1,
    description: "Construction project management, safety, cost estimation, contract administration, and QA.",
    vendorUrl: "https://www.cmaanet.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/cmaa/",
    freeResources: [
      {
            "name": "Official CMAA Documentation & Blueprint",
            "url": "https://www.cmaanet.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from CMAA"
      },
      {
            "name": "CMAA (Certified Construction Manager CCM) Community Reference & Guides",
            "url": "https://www.cmaanet.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for CMAA (Certified Construction Manager CCM)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official CMAA blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for CMAA (Certified Construction Manager CCM) from CMAA: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for CMAA (Certified Construction Manager CCM) with official vendor CMAA, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for CMAA (Certified Construction Manager CCM)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass CMAA (Certified Construction Manager CCM) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for CMAA (Certified Construction Manager CCM) by CMAA with detailed answer rationales." }
    ]
  },
  {
    id: "cncf",
    name: "CNCF (CKA, CKAD, CKS Kubernetes)",
    provider: "Cloud Native Computing Foundation",
    category: "cloud",
    categoryLabel: "Cloud & Infrastructure",
    role: "Certified Kubernetes Administrator (CKA)",
    examCount: 2,
    description: "Linux Foundation / Cloud Native Computing Foundation container orchestration and security.",
    vendorUrl: "https://www.cncf.io/certification/",
    examTopicsUrl: "https://www.examtopics.com/exams/cncf/",
    freeResources: [
      {
            "name": "Official Cloud Native Computing Foundation Documentation & Blueprint",
            "url": "https://www.cncf.io/certification/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Cloud Native Computing Foundation"
      },
      {
            "name": "CNCF (CKA, CKAD, CKS Kubernetes) Community Reference & Guides",
            "url": "https://www.cncf.io/certification/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for CNCF (CKA, CKAD, CKS Kubernetes)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Cloud Native Computing Foundation blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for CNCF (CKA, CKAD, CKS Kubernetes) from Cloud Native Computing Foundation: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for CNCF (CKA, CKAD, CKS Kubernetes) with official vendor Cloud Native Computing Foundation, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for CNCF (CKA, CKAD, CKS Kubernetes)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass CNCF (CKA, CKAD, CKS Kubernetes) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for CNCF (CKA, CKAD, CKS Kubernetes) by Cloud Native Computing Foundation with detailed answer rationales." }
    ]
  },
  {
    id: "cohesity",
    name: "Cohesity Data Cloud Specialist",
    provider: "Cohesity",
    category: "cloud",
    categoryLabel: "Cloud & Infrastructure",
    role: "Cohesity Certified Associate / Professional",
    examCount: 3,
    description: "Next-generation data management, ransomware protection, and hybrid cloud backup fabric.",
    vendorUrl: "https://www.cohesity.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/cohesity/",
    freeResources: [
      {
            "name": "Official Cohesity Documentation & Blueprint",
            "url": "https://www.cohesity.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Cohesity"
      },
      {
            "name": "Cohesity Data Cloud Specialist Community Reference & Guides",
            "url": "https://www.cohesity.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Cohesity Data Cloud Specialist"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Cohesity blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Cohesity Data Cloud Specialist from Cohesity: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Cohesity Data Cloud Specialist with official vendor Cohesity, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Cohesity Data Cloud Specialist?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Cohesity Data Cloud Specialist on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Cohesity Data Cloud Specialist by Cohesity with detailed answer rationales." }
    ]
  },
  {
    id: "confluent",
    name: "Confluent (Apache Kafka Developer)",
    provider: "Confluent",
    category: "data_ai",
    categoryLabel: "Data, AI & Analytics",
    role: "Confluent Certified Developer for Apache Kafka",
    examCount: 2,
    description: "Event streaming architecture, Kafka Connect, KSQL, schema registry, and stream processing.",
    vendorUrl: "https://www.confluent.io/certification/",
    examTopicsUrl: "https://www.examtopics.com/exams/confluent/",
    freeResources: [
      {
            "name": "Official Confluent Documentation & Blueprint",
            "url": "https://www.confluent.io/certification/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Confluent"
      },
      {
            "name": "Confluent (Apache Kafka Developer) Community Reference & Guides",
            "url": "https://www.confluent.io/certification/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Confluent (Apache Kafka Developer)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Confluent blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Confluent (Apache Kafka Developer) from Confluent: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Confluent (Apache Kafka Developer) with official vendor Confluent, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Confluent (Apache Kafka Developer)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Confluent (Apache Kafka Developer) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Confluent (Apache Kafka Developer) by Confluent with detailed answer rationales." }
    ]
  },
  {
    id: "csa",
    name: "Cloud Security Alliance (CCSK)",
    provider: "Cloud Security Alliance",
    category: "cyber",
    categoryLabel: "Cybersecurity",
    role: "Certificate of Cloud Security Knowledge (CCSK)",
    examCount: 3,
    description: "Cloud architecture security, Cloud Controls Matrix (CCM), and shared responsibility models.",
    vendorUrl: "https://cloudsecurityalliance.org/education/",
    examTopicsUrl: "https://www.examtopics.com/exams/csa/",
    freeResources: [
      {
            "name": "Official Cloud Security Alliance Documentation & Blueprint",
            "url": "https://cloudsecurityalliance.org/education/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Cloud Security Alliance"
      },
      {
            "name": "Cloud Security Alliance (CCSK) Community Reference & Guides",
            "url": "https://cloudsecurityalliance.org/education/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Cloud Security Alliance (CCSK)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Cloud Security Alliance blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Cloud Security Alliance (CCSK) from Cloud Security Alliance: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Cloud Security Alliance (CCSK) with official vendor Cloud Security Alliance, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Cloud Security Alliance (CCSK)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Cloud Security Alliance (CCSK) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Cloud Security Alliance (CCSK) by Cloud Security Alliance with detailed answer rationales." }
    ]
  },
  {
    id: "cwnp",
    name: "CWNP (CWNA, CWSP, CWNE Wireless)",
    provider: "CWNP",
    category: "network",
    categoryLabel: "Networking & Telco",
    role: "Certified Wireless Network Administrator",
    examCount: 15,
    description: "Vendor-neutral enterprise Wi-Fi (802.11ax/be), RF spectrum analysis, and wireless security.",
    vendorUrl: "https://www.cwnp.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/cwnp/",
    freeResources: [
      {
            "name": "Official CWNP Documentation & Blueprint",
            "url": "https://www.cwnp.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from CWNP"
      },
      {
            "name": "CWNP (CWNA, CWSP, CWNE Wireless) Community Reference & Guides",
            "url": "https://www.cwnp.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for CWNP (CWNA, CWSP, CWNE Wireless)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official CWNP blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for CWNP (CWNA, CWSP, CWNE Wireless) from CWNP: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for CWNP (CWNA, CWSP, CWNE Wireless) with official vendor CWNP, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for CWNP (CWNA, CWSP, CWNE Wireless)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass CWNP (CWNA, CWSP, CWNE Wireless) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for CWNP (CWNA, CWSP, CWNE Wireless) by CWNP with detailed answer rationales." }
    ]
  },
  {
    id: "cyber-ab",
    name: "Cyber AB (CMMC Assessor & CCP)",
    provider: "The Cyber AB",
    category: "cyber",
    categoryLabel: "Cybersecurity",
    role: "Certified CMMC Professional (CCP)",
    examCount: 2,
    description: "DoD Cybersecurity Maturity Model Certification (CMMC 2.0) defense industrial base compliance.",
    vendorUrl: "https://cyberab.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/cyber-ab/",
    freeResources: [
      {
            "name": "Official The Cyber AB Documentation & Blueprint",
            "url": "https://cyberab.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from The Cyber AB"
      },
      {
            "name": "Cyber AB (CMMC Assessor & CCP) Community Reference & Guides",
            "url": "https://cyberab.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Cyber AB (CMMC Assessor & CCP)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official The Cyber AB blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Cyber AB (CMMC Assessor & CCP) from The Cyber AB: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Cyber AB (CMMC Assessor & CCP) with official vendor The Cyber AB, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Cyber AB (CMMC Assessor & CCP)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Cyber AB (CMMC Assessor & CCP) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Cyber AB (CMMC Assessor & CCP) by The Cyber AB with detailed answer rationales." }
    ]
  },
  {
    id: "datadog",
    name: "Datadog (Fundamentals & APM)",
    provider: "Datadog",
    category: "cloud",
    categoryLabel: "Cloud & Infrastructure",
    role: "Observability & Monitoring Engineer",
    examCount: 1,
    description: "Application performance monitoring (APM), metric dashboards, synthetics, and log management.",
    vendorUrl: "https://www.datadoghq.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/datadog/",
    freeResources: [
      {
            "name": "Official Datadog Documentation & Blueprint",
            "url": "https://www.datadoghq.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Datadog"
      },
      {
            "name": "Datadog (Fundamentals & APM) Community Reference & Guides",
            "url": "https://www.datadoghq.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Datadog (Fundamentals & APM)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Datadog blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Datadog (Fundamentals & APM) from Datadog: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Datadog (Fundamentals & APM) with official vendor Datadog, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Datadog (Fundamentals & APM)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Datadog (Fundamentals & APM) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Datadog (Fundamentals & APM) by Datadog with detailed answer rationales." }
    ]
  },
  {
    id: "dell",
    name: "Dell Technologies (PowerEdge & Storage)",
    provider: "Dell Technologies",
    category: "network",
    categoryLabel: "Networking & Telco",
    role: "Dell Proven Professional Specialist",
    examCount: 86,
    description: "PowerEdge servers, PowerStore/PowerMax storage, VxRail hyperconverged, and data protection.",
    vendorUrl: "https://education.dellemc.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/dell/",
    freeResources: [
      {
            "name": "Official Dell Technologies Documentation & Blueprint",
            "url": "https://education.dellemc.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Dell Technologies"
      },
      {
            "name": "Dell Technologies (PowerEdge & Storage) Community Reference & Guides",
            "url": "https://education.dellemc.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Dell Technologies (PowerEdge & Storage)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Dell Technologies blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Dell Technologies (PowerEdge & Storage) from Dell Technologies: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Dell Technologies (PowerEdge & Storage) with official vendor Dell Technologies, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Dell Technologies (PowerEdge & Storage)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Dell Technologies (PowerEdge & Storage) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Dell Technologies (PowerEdge & Storage) by Dell Technologies with detailed answer rationales." }
    ]
  },
  {
    id: "dmi",
    name: "DMI (Digital Marketing Institute)",
    provider: "Digital Marketing Institute",
    category: "mgmt_business",
    categoryLabel: "Project & Management",
    role: "Certified Digital Marketing Professional",
    examCount: 1,
    description: "SEO, SEM, social media strategy, content marketing, and Google Analytics certifications.",
    vendorUrl: "https://digitalmarketinginstitute.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/dmi/",
    freeResources: [
      {
            "name": "Official Digital Marketing Institute Documentation & Blueprint",
            "url": "https://digitalmarketinginstitute.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Digital Marketing Institute"
      },
      {
            "name": "DMI (Digital Marketing Institute) Community Reference & Guides",
            "url": "https://digitalmarketinginstitute.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for DMI (Digital Marketing Institute)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Digital Marketing Institute blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for DMI (Digital Marketing Institute) from Digital Marketing Institute: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for DMI (Digital Marketing Institute) with official vendor Digital Marketing Institute, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for DMI (Digital Marketing Institute)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass DMI (Digital Marketing Institute) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for DMI (Digital Marketing Institute) by Digital Marketing Institute with detailed answer rationales." }
    ]
  },
  {
    id: "dsci",
    name: "DSCI (Data Privacy Practitioner DCPP)",
    provider: "DSCI",
    category: "cyber",
    categoryLabel: "Cybersecurity",
    role: "Data Privacy & Protection Officer",
    examCount: 2,
    description: "Data Security Council of India privacy framework, GDPR alignment, and information privacy.",
    vendorUrl: "https://www.dsci.in/",
    examTopicsUrl: "https://www.examtopics.com/exams/dsci/",
    freeResources: [
      {
            "name": "Official DSCI Documentation & Blueprint",
            "url": "https://www.dsci.in/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from DSCI"
      },
      {
            "name": "DSCI (Data Privacy Practitioner DCPP) Community Reference & Guides",
            "url": "https://www.dsci.in/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for DSCI (Data Privacy Practitioner DCPP)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official DSCI blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for DSCI (Data Privacy Practitioner DCPP) from DSCI: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for DSCI (Data Privacy Practitioner DCPP) with official vendor DSCI, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for DSCI (Data Privacy Practitioner DCPP)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass DSCI (Data Privacy Practitioner DCPP) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for DSCI (Data Privacy Practitioner DCPP) by DSCI with detailed answer rationales." }
    ]
  },
  {
    id: "elastic",
    name: "Elastic (Elasticsearch Engineer & Analyst)",
    provider: "Elastic",
    category: "data_ai",
    categoryLabel: "Data, AI & Analytics",
    role: "Elastic Certified Engineer & Analyst",
    examCount: 2,
    description: "Elasticsearch cluster management, Kibana visualization, data indexing, and Logstash pipelines.",
    vendorUrl: "https://www.elastic.co/training/certification",
    examTopicsUrl: "https://www.examtopics.com/exams/elastic/",
    freeResources: [
      {
            "name": "Official Elastic Documentation & Blueprint",
            "url": "https://www.elastic.co/training/certification",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Elastic"
      },
      {
            "name": "Elastic (Elasticsearch Engineer & Analyst) Community Reference & Guides",
            "url": "https://www.elastic.co/training/certification",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Elastic (Elasticsearch Engineer & Analyst)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Elastic blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Elastic (Elasticsearch Engineer & Analyst) from Elastic: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Elastic (Elasticsearch Engineer & Analyst) with official vendor Elastic, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Elastic (Elasticsearch Engineer & Analyst)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Elastic (Elasticsearch Engineer & Analyst) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Elastic (Elasticsearch Engineer & Analyst) by Elastic with detailed answer rationales." }
    ]
  },
  {
    id: "english-test-preparation",
    name: "English Test Preparation (IELTS / TOEFL)",
    provider: "ETS / British Council",
    category: "mgmt_business",
    categoryLabel: "Project & Management",
    role: "English Academic & Professional Candidate",
    examCount: 4,
    description: "IELTS Academic, TOEFL iBT, PTE Academic, and Cambridge C1/C2 Advanced language credentials.",
    vendorUrl: "https://www.ielts.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/english-test-preparation/",
    freeResources: [
      {
            "name": "Official ETS / British Council Documentation & Blueprint",
            "url": "https://www.ielts.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from ETS / British Council"
      },
      {
            "name": "English Test Preparation (IELTS / TOEFL) Community Reference & Guides",
            "url": "https://www.ielts.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for English Test Preparation (IELTS / TOEFL)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official ETS / British Council blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for English Test Preparation (IELTS / TOEFL) from ETS / British Council: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for English Test Preparation (IELTS / TOEFL) with official vendor ETS / British Council, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for English Test Preparation (IELTS / TOEFL)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass English Test Preparation (IELTS / TOEFL) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for English Test Preparation (IELTS / TOEFL) by ETS / British Council with detailed answer rationales." }
    ]
  },
  {
    id: "exin",
    name: "EXIN (IT Service & Privacy)",
    provider: "EXIN",
    category: "mgmt_business",
    categoryLabel: "Project & Management",
    role: "EXIN Certified Privacy & Agile Practitioner",
    examCount: 20,
    description: "Privacy & Data Protection Foundation, Agile Scrum Master, and Cloud Computing credentials.",
    vendorUrl: "https://www.exin.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/exin/",
    freeResources: [
      {
            "name": "Official EXIN Documentation & Blueprint",
            "url": "https://www.exin.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from EXIN"
      },
      {
            "name": "EXIN (IT Service & Privacy) Community Reference & Guides",
            "url": "https://www.exin.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for EXIN (IT Service & Privacy)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official EXIN blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for EXIN (IT Service & Privacy) from EXIN: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for EXIN (IT Service & Privacy) with official vendor EXIN, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for EXIN (IT Service & Privacy)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass EXIN (IT Service & Privacy) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for EXIN (IT Service & Privacy) by EXIN with detailed answer rationales." }
    ]
  },
  {
    id: "f5",
    name: "F5 Networks (BIG-IP Administrator)",
    provider: "F5 Networks",
    category: "network",
    categoryLabel: "Networking & Telco",
    role: "F5 Certified Technical Specialist",
    examCount: 8,
    description: "BIG-IP Local Traffic Manager (LTM), DNS, Advanced WAF, and Access Policy Manager (APM).",
    vendorUrl: "https://www.f5.com/services/certification",
    examTopicsUrl: "https://www.examtopics.com/exams/f5/",
    freeResources: [
      {
            "name": "Official F5 Networks Documentation & Blueprint",
            "url": "https://www.f5.com/services/certification",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from F5 Networks"
      },
      {
            "name": "F5 Networks (BIG-IP Administrator) Community Reference & Guides",
            "url": "https://www.f5.com/services/certification",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for F5 Networks (BIG-IP Administrator)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official F5 Networks blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for F5 Networks (BIG-IP Administrator) from F5 Networks: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for F5 Networks (BIG-IP Administrator) with official vendor F5 Networks, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for F5 Networks (BIG-IP Administrator)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass F5 Networks (BIG-IP Administrator) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for F5 Networks (BIG-IP Administrator) by F5 Networks with detailed answer rationales." }
    ]
  },
  {
    id: "filemaker",
    name: "FileMaker / Claris Pro",
    provider: "Claris / Apple",
    category: "dev_software",
    categoryLabel: "Software & Development",
    role: "Claris Certified FileMaker Pro Specialist",
    examCount: 1,
    description: "Rapid database application design, script workplace, layouts, and API integrations.",
    vendorUrl: "https://www.claris.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/filemaker/",
    freeResources: [
      {
            "name": "Official Claris / Apple Documentation & Blueprint",
            "url": "https://www.claris.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Claris / Apple"
      },
      {
            "name": "FileMaker / Claris Pro Community Reference & Guides",
            "url": "https://www.claris.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for FileMaker / Claris Pro"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Claris / Apple blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for FileMaker / Claris Pro from Claris / Apple: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for FileMaker / Claris Pro with official vendor Claris / Apple, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for FileMaker / Claris Pro?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass FileMaker / Claris Pro on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for FileMaker / Claris Pro by Claris / Apple with detailed answer rationales." }
    ]
  },
  {
    id: "gaqm",
    name: "GAQM (Agile & Project Management)",
    provider: "GAQM",
    category: "mgmt_business",
    categoryLabel: "Project & Management",
    role: "Certified Project Manager (CPM)",
    examCount: 9,
    description: "Global Association for Quality Management certifications in Agile, Scrum, and Six Sigma.",
    vendorUrl: "https://gaqm.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/gaqm/",
    freeResources: [
      {
            "name": "Official GAQM Documentation & Blueprint",
            "url": "https://gaqm.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from GAQM"
      },
      {
            "name": "GAQM (Agile & Project Management) Community Reference & Guides",
            "url": "https://gaqm.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for GAQM (Agile & Project Management)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official GAQM blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for GAQM (Agile & Project Management) from GAQM: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for GAQM (Agile & Project Management) with official vendor GAQM, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for GAQM (Agile & Project Management)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass GAQM (Agile & Project Management) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for GAQM (Agile & Project Management) by GAQM with detailed answer rationales." }
    ]
  },
  {
    id: "garp",
    name: "GARP (Financial Risk Manager FRM)",
    provider: "GARP",
    category: "finance",
    categoryLabel: "Finance & Banking",
    role: "Financial Risk Manager (FRM)",
    examCount: 2,
    description: "Market risk, credit risk, operational risk, liquidity, and Basel capital regulations.",
    vendorUrl: "https://www.garp.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/garp/",
    freeResources: [
      {
            "name": "Official GARP Documentation & Blueprint",
            "url": "https://www.garp.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from GARP"
      },
      {
            "name": "GARP (Financial Risk Manager FRM) Community Reference & Guides",
            "url": "https://www.garp.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for GARP (Financial Risk Manager FRM)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official GARP blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for GARP (Financial Risk Manager FRM) from GARP: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for GARP (Financial Risk Manager FRM) with official vendor GARP, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for GARP (Financial Risk Manager FRM)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass GARP (Financial Risk Manager FRM) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for GARP (Financial Risk Manager FRM) by GARP with detailed answer rationales." }
    ]
  },
  {
    id: "genesys",
    name: "Genesys Cloud CX Specialist",
    provider: "Genesys",
    category: "network",
    categoryLabel: "Networking & Telco",
    role: "Genesys Cloud CX Certified Professional",
    examCount: 14,
    description: "Cloud contact center routing, telephony architecture, workforce engagement, and IVR flows.",
    vendorUrl: "https://www.genesys.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/genesys/",
    freeResources: [
      {
            "name": "Official Genesys Documentation & Blueprint",
            "url": "https://www.genesys.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Genesys"
      },
      {
            "name": "Genesys Cloud CX Specialist Community Reference & Guides",
            "url": "https://www.genesys.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Genesys Cloud CX Specialist"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Genesys blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Genesys Cloud CX Specialist from Genesys: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Genesys Cloud CX Specialist with official vendor Genesys, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Genesys Cloud CX Specialist?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Genesys Cloud CX Specialist on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Genesys Cloud CX Specialist by Genesys with detailed answer rationales." }
    ]
  },
  {
    id: "github",
    name: "GitHub (Foundations & Actions)",
    provider: "GitHub / Microsoft",
    category: "dev_software",
    categoryLabel: "Software & Development",
    role: "GitHub Actions & Security Specialist",
    examCount: 2,
    description: "GitHub Foundations, Actions CI/CD workflows, Advanced Security, and Administration.",
    vendorUrl: "https://skills.github.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/github/",
    freeResources: [
      {
            "name": "Official GitHub / Microsoft Documentation & Blueprint",
            "url": "https://skills.github.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from GitHub / Microsoft"
      },
      {
            "name": "GitHub (Foundations & Actions) Community Reference & Guides",
            "url": "https://skills.github.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for GitHub (Foundations & Actions)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official GitHub / Microsoft blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for GitHub (Foundations & Actions) from GitHub / Microsoft: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for GitHub (Foundations & Actions) with official vendor GitHub / Microsoft, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for GitHub (Foundations & Actions)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass GitHub (Foundations & Actions) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for GitHub (Foundations & Actions) by GitHub / Microsoft with detailed answer rationales." }
    ]
  },
  {
    id: "gmac",
    name: "GMAC (GMAT Exam)",
    provider: "GMAC",
    category: "mgmt_business",
    categoryLabel: "Project & Management",
    role: "MBA / Business School Candidate",
    examCount: 1,
    description: "Graduate Management Admission Test evaluating Quantitative, Verbal, and Data Insights.",
    vendorUrl: "https://www.mba.com/exams/gmat",
    examTopicsUrl: "https://www.examtopics.com/exams/gmac/",
    freeResources: [
      {
            "name": "Official GMAC Documentation & Blueprint",
            "url": "https://www.mba.com/exams/gmat",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from GMAC"
      },
      {
            "name": "GMAC (GMAT Exam) Community Reference & Guides",
            "url": "https://www.mba.com/exams/gmat",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for GMAC (GMAT Exam)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official GMAC blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for GMAC (GMAT Exam) from GMAC: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for GMAC (GMAT Exam) with official vendor GMAC, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for GMAC (GMAT Exam)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass GMAC (GMAT Exam) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for GMAC (GMAT Exam) by GMAC with detailed answer rationales." }
    ]
  },
  {
    id: "guidance-software",
    name: "Guidance Software / OpenText EnCase",
    provider: "OpenText",
    category: "cyber",
    categoryLabel: "Cybersecurity",
    role: "EnCase Certified Examiner (EnCE)",
    examCount: 2,
    description: "Digital forensics investigations, disk imaging, evidence handling, and artifact recovery.",
    vendorUrl: "https://www.opentext.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/guidance-software/",
    freeResources: [
      {
            "name": "Official OpenText Documentation & Blueprint",
            "url": "https://www.opentext.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from OpenText"
      },
      {
            "name": "Guidance Software / OpenText EnCase Community Reference & Guides",
            "url": "https://www.opentext.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Guidance Software / OpenText EnCase"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official OpenText blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Guidance Software / OpenText EnCase from OpenText: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Guidance Software / OpenText EnCase with official vendor OpenText, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Guidance Software / OpenText EnCase?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Guidance Software / OpenText EnCase on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Guidance Software / OpenText EnCase by OpenText with detailed answer rationales." }
    ]
  },
  {
    id: "guidewire",
    name: "Guidewire InsuranceSuite",
    provider: "Guidewire",
    category: "dev_software",
    categoryLabel: "Software & Development",
    role: "Guidewire PolicyCenter & ClaimCenter Specialist",
    examCount: 2,
    description: "Core property and casualty insurance platform integration and configuration.",
    vendorUrl: "https://www.guidewire.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/guidewire/",
    freeResources: [
      {
            "name": "Official Guidewire Documentation & Blueprint",
            "url": "https://www.guidewire.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Guidewire"
      },
      {
            "name": "Guidewire InsuranceSuite Community Reference & Guides",
            "url": "https://www.guidewire.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Guidewire InsuranceSuite"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Guidewire blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Guidewire InsuranceSuite from Guidewire: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Guidewire InsuranceSuite with official vendor Guidewire, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Guidewire InsuranceSuite?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Guidewire InsuranceSuite on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Guidewire InsuranceSuite by Guidewire with detailed answer rationales." }
    ]
  },
  {
    id: "hcl-software-academy",
    name: "HCL Software Academy",
    provider: "HCLSoftware",
    category: "dev_software",
    categoryLabel: "Software & Development",
    role: "HCL Certified Solutions Architect",
    examCount: 3,
    description: "Enterprise DevOps, AppScan application security, BigFix endpoint management, and Commerce.",
    vendorUrl: "https://hclsoftwareacademy.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/hcl-software-academy/",
    freeResources: [
      {
            "name": "Official HCLSoftware Documentation & Blueprint",
            "url": "https://hclsoftwareacademy.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from HCLSoftware"
      },
      {
            "name": "HCL Software Academy Community Reference & Guides",
            "url": "https://hclsoftwareacademy.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for HCL Software Academy"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official HCLSoftware blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for HCL Software Academy from HCLSoftware: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for HCL Software Academy with official vendor HCLSoftware, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for HCL Software Academy?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass HCL Software Academy on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for HCL Software Academy by HCLSoftware with detailed answer rationales." }
    ]
  },
  {
    id: "hitachi",
    name: "Hitachi Vantara Enterprise Storage",
    provider: "Hitachi Vantara",
    category: "cloud",
    categoryLabel: "Cloud & Infrastructure",
    role: "Hitachi Vantara Certified Specialist",
    examCount: 4,
    description: "VSP enterprise storage arrays, Ops Center administration, and hybrid cloud storage fabric.",
    vendorUrl: "https://www.hitachivantara.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/hitachi/",
    freeResources: [
      {
            "name": "Official Hitachi Vantara Documentation & Blueprint",
            "url": "https://www.hitachivantara.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Hitachi Vantara"
      },
      {
            "name": "Hitachi Vantara Enterprise Storage Community Reference & Guides",
            "url": "https://www.hitachivantara.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Hitachi Vantara Enterprise Storage"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Hitachi Vantara blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Hitachi Vantara Enterprise Storage from Hitachi Vantara: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Hitachi Vantara Enterprise Storage with official vendor Hitachi Vantara, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Hitachi Vantara Enterprise Storage?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Hitachi Vantara Enterprise Storage on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Hitachi Vantara Enterprise Storage by Hitachi Vantara with detailed answer rationales." }
    ]
  },
  {
    id: "hp",
    name: "HPE (Enterprise Servers & Storage)",
    provider: "Hewlett Packard Enterprise",
    category: "network",
    categoryLabel: "Networking & Telco",
    role: "HPE Master ASE Solutions Architect",
    examCount: 82,
    description: "ProLiant servers, HPE GreenLake cloud services, Alletra storage, and compute solutions.",
    vendorUrl: "https://certification-learning.hpe.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/hp/",
    freeResources: [
      {
            "name": "Official Hewlett Packard Enterprise Documentation & Blueprint",
            "url": "https://certification-learning.hpe.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Hewlett Packard Enterprise"
      },
      {
            "name": "HPE (Enterprise Servers & Storage) Community Reference & Guides",
            "url": "https://certification-learning.hpe.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for HPE (Enterprise Servers & Storage)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Hewlett Packard Enterprise blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for HPE (Enterprise Servers & Storage) from Hewlett Packard Enterprise: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for HPE (Enterprise Servers & Storage) with official vendor Hewlett Packard Enterprise, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for HPE (Enterprise Servers & Storage)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass HPE (Enterprise Servers & Storage) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for HPE (Enterprise Servers & Storage) by Hewlett Packard Enterprise with detailed answer rationales." }
    ]
  },
  {
    id: "hrci",
    name: "HRCI (PHR, SPHR, GPHR)",
    provider: "HRCI",
    category: "mgmt_business",
    categoryLabel: "Project & Management",
    role: "Senior Professional in Human Resources (SPHR)",
    examCount: 5,
    description: "Talent planning, employee relations, total rewards, labor law, and global HR governance.",
    vendorUrl: "https://www.hrci.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/hrci/",
    freeResources: [
      {
            "name": "Official HRCI Documentation & Blueprint",
            "url": "https://www.hrci.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from HRCI"
      },
      {
            "name": "HRCI (PHR, SPHR, GPHR) Community Reference & Guides",
            "url": "https://www.hrci.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for HRCI (PHR, SPHR, GPHR)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official HRCI blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for HRCI (PHR, SPHR, GPHR) from HRCI: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for HRCI (PHR, SPHR, GPHR) with official vendor HRCI, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for HRCI (PHR, SPHR, GPHR)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass HRCI (PHR, SPHR, GPHR) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for HRCI (PHR, SPHR, GPHR) by HRCI with detailed answer rationales." }
    ]
  },
  {
    id: "huawei",
    name: "Huawei (HCIA, HCIP, HCIE)",
    provider: "Huawei",
    category: "network",
    categoryLabel: "Networking & Telco",
    role: "Huawei Certified ICT Expert (HCIE)",
    examCount: 62,
    description: "Carrier-grade routing & switching, 5G wireless transmission, cloud service, and optical networks.",
    vendorUrl: "https://e.huawei.com/en/talent/cert/",
    examTopicsUrl: "https://www.examtopics.com/exams/huawei/",
    freeResources: [
      {
            "name": "Official Huawei Documentation & Blueprint",
            "url": "https://e.huawei.com/en/talent/cert/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Huawei"
      },
      {
            "name": "Huawei (HCIA, HCIP, HCIE) Community Reference & Guides",
            "url": "https://e.huawei.com/en/talent/cert/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Huawei (HCIA, HCIP, HCIE)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Huawei blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Huawei (HCIA, HCIP, HCIE) from Huawei: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Huawei (HCIA, HCIP, HCIE) with official vendor Huawei, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Huawei (HCIA, HCIP, HCIE)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Huawei (HCIA, HCIP, HCIE) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Huawei (HCIA, HCIP, HCIE) by Huawei with detailed answer rationales." }
    ]
  },
  {
    id: "iaap",
    name: "IAAP (Administrative Professional CAP)",
    provider: "IAAP",
    category: "mgmt_business",
    categoryLabel: "Project & Management",
    role: "Certified Administrative Professional (CAP)",
    examCount: 1,
    description: "Organizational management, business communication, record governance, and executive support.",
    vendorUrl: "https://www.iaap-hq.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/iaap/",
    freeResources: [
      {
            "name": "Official IAAP Documentation & Blueprint",
            "url": "https://www.iaap-hq.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from IAAP"
      },
      {
            "name": "IAAP (Administrative Professional CAP) Community Reference & Guides",
            "url": "https://www.iaap-hq.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for IAAP (Administrative Professional CAP)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official IAAP blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for IAAP (Administrative Professional CAP) from IAAP: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for IAAP (Administrative Professional CAP) with official vendor IAAP, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for IAAP (Administrative Professional CAP)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass IAAP (Administrative Professional CAP) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for IAAP (Administrative Professional CAP) by IAAP with detailed answer rationales." }
    ]
  },
  {
    id: "iapp",
    name: "IAPP (CIPP/US, CIPP/E, CIPM, CIPT)",
    provider: "IAPP",
    category: "cyber",
    categoryLabel: "Cybersecurity",
    role: "Certified Information Privacy Professional (CIPP)",
    examCount: 7,
    description: "Global benchmark for privacy laws (GDPR, CCPA), privacy program management, and privacy engineering.",
    vendorUrl: "https://iapp.org/certify/",
    examTopicsUrl: "https://www.examtopics.com/exams/iapp/",
    freeResources: [
      {
            "name": "Official IAPP Documentation & Blueprint",
            "url": "https://iapp.org/certify/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from IAPP"
      },
      {
            "name": "IAPP (CIPP/US, CIPP/E, CIPM, CIPT) Community Reference & Guides",
            "url": "https://iapp.org/certify/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for IAPP (CIPP/US, CIPP/E, CIPM, CIPT)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official IAPP blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for IAPP (CIPP/US, CIPP/E, CIPM, CIPT) from IAPP: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for IAPP (CIPP/US, CIPP/E, CIPM, CIPT) with official vendor IAPP, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for IAPP (CIPP/US, CIPP/E, CIPM, CIPT)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass IAPP (CIPP/US, CIPP/E, CIPM, CIPT) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for IAPP (CIPP/US, CIPP/E, CIPM, CIPT) by IAPP with detailed answer rationales." }
    ]
  },
  {
    id: "ibm",
    name: "IBM (Cloud, Data, Security, Mainframe)",
    provider: "IBM",
    category: "cloud",
    categoryLabel: "Cloud & Infrastructure",
    role: "IBM Certified Solution Architect",
    examCount: 112,
    description: "IBM Cloud, Watson AI, QRadar SIEM, z/OS Mainframe systems, and Db2 database administration.",
    vendorUrl: "https://www.ibm.com/training/certification",
    examTopicsUrl: "https://www.examtopics.com/exams/ibm/",
    freeResources: [
      {
            "name": "Official IBM Documentation & Blueprint",
            "url": "https://www.ibm.com/training/certification",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from IBM"
      },
      {
            "name": "IBM (Cloud, Data, Security, Mainframe) Community Reference & Guides",
            "url": "https://www.ibm.com/training/certification",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for IBM (Cloud, Data, Security, Mainframe)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official IBM blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for IBM (Cloud, Data, Security, Mainframe) from IBM: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for IBM (Cloud, Data, Security, Mainframe) with official vendor IBM, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for IBM (Cloud, Data, Security, Mainframe)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass IBM (Cloud, Data, Security, Mainframe) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for IBM (Cloud, Data, Security, Mainframe) by IBM with detailed answer rationales." }
    ]
  },
  {
    id: "icf",
    name: "ICF (International Coaching Federation)",
    provider: "ICF",
    category: "mgmt_business",
    categoryLabel: "Project & Management",
    role: "Professional Certified Coach (PCC)",
    examCount: 1,
    description: "Professional executive coaching competencies, ethics, active listening, and evocative questioning.",
    vendorUrl: "https://coachingfederation.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/icf/",
    freeResources: [
      {
            "name": "Official ICF Documentation & Blueprint",
            "url": "https://coachingfederation.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from ICF"
      },
      {
            "name": "ICF (International Coaching Federation) Community Reference & Guides",
            "url": "https://coachingfederation.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for ICF (International Coaching Federation)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official ICF blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for ICF (International Coaching Federation) from ICF: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for ICF (International Coaching Federation) with official vendor ICF, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for ICF (International Coaching Federation)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass ICF (International Coaching Federation) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for ICF (International Coaching Federation) by ICF with detailed answer rationales." }
    ]
  },
  {
    id: "ifpug",
    name: "IFPUG (Function Point Specialist CFPS)",
    provider: "IFPUG",
    category: "dev_software",
    categoryLabel: "Software & Development",
    role: "Certified Function Point Specialist (CFPS)",
    examCount: 1,
    description: "Software sizing, metrics measurement, function point analysis, and project estimation.",
    vendorUrl: "https://www.ifpug.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/ifpug/",
    freeResources: [
      {
            "name": "Official IFPUG Documentation & Blueprint",
            "url": "https://www.ifpug.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from IFPUG"
      },
      {
            "name": "IFPUG (Function Point Specialist CFPS) Community Reference & Guides",
            "url": "https://www.ifpug.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for IFPUG (Function Point Specialist CFPS)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official IFPUG blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for IFPUG (Function Point Specialist CFPS) from IFPUG: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for IFPUG (Function Point Specialist CFPS) with official vendor IFPUG, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for IFPUG (Function Point Specialist CFPS)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass IFPUG (Function Point Specialist CFPS) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for IFPUG (Function Point Specialist CFPS) by IFPUG with detailed answer rationales." }
    ]
  },
  {
    id: "iia",
    name: "IIA (Certified Internal Auditor CIA)",
    provider: "The IIA",
    category: "finance",
    categoryLabel: "Finance & Banking",
    role: "Certified Internal Auditor (CIA)",
    examCount: 7,
    description: "Internal audit fundamentals, practice of internal auditing, and business knowledge for audit.",
    vendorUrl: "https://www.theiia.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/iia/",
    freeResources: [
      {
            "name": "Official The IIA Documentation & Blueprint",
            "url": "https://www.theiia.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from The IIA"
      },
      {
            "name": "IIA (Certified Internal Auditor CIA) Community Reference & Guides",
            "url": "https://www.theiia.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for IIA (Certified Internal Auditor CIA)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official The IIA blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for IIA (Certified Internal Auditor CIA) from The IIA: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for IIA (Certified Internal Auditor CIA) with official vendor The IIA, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for IIA (Certified Internal Auditor CIA)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass IIA (Certified Internal Auditor CIA) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for IIA (Certified Internal Auditor CIA) by The IIA with detailed answer rationales." }
    ]
  },
  {
    id: "iiba",
    name: "IIBA (CBAP, CCBA, ECBA)",
    provider: "IIBA",
    category: "mgmt_business",
    categoryLabel: "Project & Management",
    role: "Certified Business Analysis Professional (CBAP)",
    examCount: 6,
    description: "BABOK Guide requirements analysis, strategy analysis, elicitation, and solution evaluation.",
    vendorUrl: "https://www.iiba.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/iiba/",
    freeResources: [
      {
            "name": "Official IIBA Documentation & Blueprint",
            "url": "https://www.iiba.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from IIBA"
      },
      {
            "name": "IIBA (CBAP, CCBA, ECBA) Community Reference & Guides",
            "url": "https://www.iiba.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for IIBA (CBAP, CCBA, ECBA)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official IIBA blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for IIBA (CBAP, CCBA, ECBA) from IIBA: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for IIBA (CBAP, CCBA, ECBA) with official vendor IIBA, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for IIBA (CBAP, CCBA, ECBA)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass IIBA (CBAP, CCBA, ECBA) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for IIBA (CBAP, CCBA, ECBA) by IIBA with detailed answer rationales." }
    ]
  },
  {
    id: "iica",
    name: "IICA (Indian Institute Corporate Affairs)",
    provider: "IICA",
    category: "finance",
    categoryLabel: "Finance & Banking",
    role: "Insolvency & Corporate Affairs Specialist",
    examCount: 1,
    description: "Insolvency and Bankruptcy Code (IBC), corporate governance, and independent director credentials.",
    vendorUrl: "https://iica.nic.in/",
    examTopicsUrl: "https://www.examtopics.com/exams/iica/",
    freeResources: [
      {
            "name": "Official IICA Documentation & Blueprint",
            "url": "https://iica.nic.in/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from IICA"
      },
      {
            "name": "IICA (Indian Institute Corporate Affairs) Community Reference & Guides",
            "url": "https://iica.nic.in/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for IICA (Indian Institute Corporate Affairs)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official IICA blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for IICA (Indian Institute Corporate Affairs) from IICA: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for IICA (Indian Institute Corporate Affairs) with official vendor IICA, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for IICA (Indian Institute Corporate Affairs)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass IICA (Indian Institute Corporate Affairs) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for IICA (Indian Institute Corporate Affairs) by IICA with detailed answer rationales." }
    ]
  },
  {
    id: "infor",
    name: "Infor CloudSuite ERP",
    provider: "Infor",
    category: "mgmt_business",
    categoryLabel: "Project & Management",
    role: "Infor Certified Business Consultant",
    examCount: 2,
    description: "Infor CloudSuite Industrial, distribution, supply chain management, and enterprise finance.",
    vendorUrl: "https://www.infor.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/infor/",
    freeResources: [
      {
            "name": "Official Infor Documentation & Blueprint",
            "url": "https://www.infor.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Infor"
      },
      {
            "name": "Infor CloudSuite ERP Community Reference & Guides",
            "url": "https://www.infor.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Infor CloudSuite ERP"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Infor blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Infor CloudSuite ERP from Infor: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Infor CloudSuite ERP with official vendor Infor, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Infor CloudSuite ERP?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Infor CloudSuite ERP on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Infor CloudSuite ERP by Infor with detailed answer rationales." }
    ]
  },
  {
    id: "isa",
    name: "ISA (Automation & Control CAP/CCST)",
    provider: "International Society of Automation",
    category: "trades",
    categoryLabel: "Skilled Trades & Engineering",
    role: "Certified Automation Professional (CAP)",
    examCount: 4,
    description: "Industrial automation, SCADA, programmable logic controllers (PLCs), and process safety systems.",
    vendorUrl: "https://www.isa.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/isa/",
    freeResources: [
      {
            "name": "Official International Society of Automation Documentation & Blueprint",
            "url": "https://www.isa.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from International Society of Automation"
      },
      {
            "name": "ISA (Automation & Control CAP/CCST) Community Reference & Guides",
            "url": "https://www.isa.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for ISA (Automation & Control CAP/CCST)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official International Society of Automation blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for ISA (Automation & Control CAP/CCST) from International Society of Automation: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for ISA (Automation & Control CAP/CCST) with official vendor International Society of Automation, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for ISA (Automation & Control CAP/CCST)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass ISA (Automation & Control CAP/CCST) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for ISA (Automation & Control CAP/CCST) by International Society of Automation with detailed answer rationales." }
    ]
  },
  {
    id: "isaqb",
    name: "iSAQB (Software Architecture CPSA)",
    provider: "iSAQB",
    category: "dev_software",
    categoryLabel: "Software & Development",
    role: "Certified Professional for Software Architecture",
    examCount: 1,
    description: "Software architecture design patterns, quality attributes, microservices, and documentation.",
    vendorUrl: "https://www.isaqb.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/isaqb/",
    freeResources: [
      {
            "name": "Official iSAQB Documentation & Blueprint",
            "url": "https://www.isaqb.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from iSAQB"
      },
      {
            "name": "iSAQB (Software Architecture CPSA) Community Reference & Guides",
            "url": "https://www.isaqb.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for iSAQB (Software Architecture CPSA)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official iSAQB blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for iSAQB (Software Architecture CPSA) from iSAQB: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for iSAQB (Software Architecture CPSA) with official vendor iSAQB, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for iSAQB (Software Architecture CPSA)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass iSAQB (Software Architecture CPSA) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for iSAQB (Software Architecture CPSA) by iSAQB with detailed answer rationales." }
    ]
  },
  {
    id: "ism",
    name: "ISM (Supply Management CPSM)",
    provider: "Institute for Supply Management",
    category: "mgmt_business",
    categoryLabel: "Project & Management",
    role: "Certified Professional in Supply Management",
    examCount: 1,
    description: "Supply management integration, procurement sourcing, logistics, and supply leadership.",
    vendorUrl: "https://www.ismworld.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/ism/",
    freeResources: [
      {
            "name": "Official Institute for Supply Management Documentation & Blueprint",
            "url": "https://www.ismworld.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Institute for Supply Management"
      },
      {
            "name": "ISM (Supply Management CPSM) Community Reference & Guides",
            "url": "https://www.ismworld.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for ISM (Supply Management CPSM)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Institute for Supply Management blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for ISM (Supply Management CPSM) from Institute for Supply Management: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for ISM (Supply Management CPSM) with official vendor Institute for Supply Management, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for ISM (Supply Management CPSM)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass ISM (Supply Management CPSM) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for ISM (Supply Management CPSM) by Institute for Supply Management with detailed answer rationales." }
    ]
  },
  {
    id: "isqi",
    name: "iSQI (International Software Quality)",
    provider: "iSQI",
    category: "dev_software",
    categoryLabel: "Software & Development",
    role: "Certified Agile Software Tester",
    examCount: 3,
    description: "Software quality assurance, acceptance test-driven development (ATDD), and test automation.",
    vendorUrl: "https://isqi.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/isqi/",
    freeResources: [
      {
            "name": "Official iSQI Documentation & Blueprint",
            "url": "https://isqi.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from iSQI"
      },
      {
            "name": "iSQI (International Software Quality) Community Reference & Guides",
            "url": "https://isqi.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for iSQI (International Software Quality)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official iSQI blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for iSQI (International Software Quality) from iSQI: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for iSQI (International Software Quality) with official vendor iSQI, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for iSQI (International Software Quality)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass iSQI (International Software Quality) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for iSQI (International Software Quality) by iSQI with detailed answer rationales." }
    ]
  },
  {
    id: "istqb",
    name: "ISTQB (Software Testing Board)",
    provider: "ISTQB",
    category: "dev_software",
    categoryLabel: "Software & Development",
    role: "ISTQB Certified Tester (Foundation & Advanced)",
    examCount: 22,
    description: "International software testing standard covering test management, test automation, and test analysis.",
    vendorUrl: "https://www.istqb.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/istqb/",
    freeResources: [
      {
            "name": "Official ISTQB Documentation & Blueprint",
            "url": "https://www.istqb.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from ISTQB"
      },
      {
            "name": "ISTQB (Software Testing Board) Community Reference & Guides",
            "url": "https://www.istqb.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for ISTQB (Software Testing Board)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official ISTQB blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for ISTQB (Software Testing Board) from ISTQB: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for ISTQB (Software Testing Board) with official vendor ISTQB, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for ISTQB (Software Testing Board)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass ISTQB (Software Testing Board) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for ISTQB (Software Testing Board) by ISTQB with detailed answer rationales." }
    ]
  },
  {
    id: "lenovo",
    name: "Lenovo Data Center Technical",
    provider: "Lenovo",
    category: "network",
    categoryLabel: "Networking & Telco",
    role: "Lenovo Certified Data Center Specialist",
    examCount: 1,
    description: "ThinkSystem servers, ThinkSystem storage, hyperconverged appliances, and XClarity management.",
    vendorUrl: "https://www.lenovo.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/lenovo/",
    freeResources: [
      {
            "name": "Official Lenovo Documentation & Blueprint",
            "url": "https://www.lenovo.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Lenovo"
      },
      {
            "name": "Lenovo Data Center Technical Community Reference & Guides",
            "url": "https://www.lenovo.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Lenovo Data Center Technical"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Lenovo blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Lenovo Data Center Technical from Lenovo: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Lenovo Data Center Technical with official vendor Lenovo, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Lenovo Data Center Technical?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Lenovo Data Center Technical on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Lenovo Data Center Technical by Lenovo with detailed answer rationales." }
    ]
  },
  {
    id: "linux-foundation",
    name: "Linux Foundation (LFCS, LFCE, CKA)",
    provider: "Linux Foundation",
    category: "dev_software",
    categoryLabel: "Software & Development",
    role: "Linux Foundation Certified Engineer",
    examCount: 6,
    description: "Enterprise Linux administration, container operations, Kubernetes, and open-source DevOps.",
    vendorUrl: "https://training.linuxfoundation.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/linux-foundation/",
    freeResources: [
      {
            "name": "Official Linux Foundation Documentation & Blueprint",
            "url": "https://training.linuxfoundation.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Linux Foundation"
      },
      {
            "name": "Linux Foundation (LFCS, LFCE, CKA) Community Reference & Guides",
            "url": "https://training.linuxfoundation.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Linux Foundation (LFCS, LFCE, CKA)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Linux Foundation blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Linux Foundation (LFCS, LFCE, CKA) from Linux Foundation: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Linux Foundation (LFCS, LFCE, CKA) with official vendor Linux Foundation, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Linux Foundation (LFCS, LFCE, CKA)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Linux Foundation (LFCS, LFCE, CKA) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Linux Foundation (LFCS, LFCE, CKA) by Linux Foundation with detailed answer rationales." }
    ]
  },
  {
    id: "lpi",
    name: "LPI (Linux Professional Institute LPIC)",
    provider: "Linux Professional Institute",
    category: "dev_software",
    categoryLabel: "Software & Development",
    role: "LPIC-1, LPIC-2, LPIC-3 Certified Linux Engineer",
    examCount: 17,
    description: "Linux architecture, kernel modules, package management, shell scripting, and security hardening.",
    vendorUrl: "https://www.lpi.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/lpi/",
    freeResources: [
      {
            "name": "Official Linux Professional Institute Documentation & Blueprint",
            "url": "https://www.lpi.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Linux Professional Institute"
      },
      {
            "name": "LPI (Linux Professional Institute LPIC) Community Reference & Guides",
            "url": "https://www.lpi.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for LPI (Linux Professional Institute LPIC)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Linux Professional Institute blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for LPI (Linux Professional Institute LPIC) from Linux Professional Institute: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for LPI (Linux Professional Institute LPIC) with official vendor Linux Professional Institute, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for LPI (Linux Professional Institute LPIC)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass LPI (Linux Professional Institute LPIC) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for LPI (Linux Professional Institute LPIC) by Linux Professional Institute with detailed answer rationales." }
    ]
  },
  {
    id: "magento",
    name: "Magento / Adobe Commerce Developer",
    provider: "Adobe",
    category: "dev_software",
    categoryLabel: "Software & Development",
    role: "Adobe Certified Expert - Adobe Commerce",
    examCount: 5,
    description: "E-commerce architecture, layout XML, checkout customization, and Magento cloud deployments.",
    vendorUrl: "https://business.adobe.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/magento/",
    freeResources: [
      {
            "name": "Official Adobe Documentation & Blueprint",
            "url": "https://business.adobe.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Adobe"
      },
      {
            "name": "Magento / Adobe Commerce Developer Community Reference & Guides",
            "url": "https://business.adobe.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Magento / Adobe Commerce Developer"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Adobe blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Magento / Adobe Commerce Developer from Adobe: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Magento / Adobe Commerce Developer with official vendor Adobe, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Magento / Adobe Commerce Developer?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Magento / Adobe Commerce Developer on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Magento / Adobe Commerce Developer by Adobe with detailed answer rationales." }
    ]
  },
  {
    id: "mcafee",
    name: "McAfee / Trellix Endpoint Security",
    provider: "Trellix",
    category: "cyber",
    categoryLabel: "Cybersecurity",
    role: "Trellix Endpoint Security Specialist",
    examCount: 3,
    description: "ePO centralized console, endpoint protection, threat prevention, and adaptive threat detection.",
    vendorUrl: "https://www.trellix.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/mcafee/",
    freeResources: [
      {
            "name": "Official Trellix Documentation & Blueprint",
            "url": "https://www.trellix.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Trellix"
      },
      {
            "name": "McAfee / Trellix Endpoint Security Community Reference & Guides",
            "url": "https://www.trellix.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for McAfee / Trellix Endpoint Security"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Trellix blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for McAfee / Trellix Endpoint Security from Trellix: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for McAfee / Trellix Endpoint Security with official vendor Trellix, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for McAfee / Trellix Endpoint Security?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass McAfee / Trellix Endpoint Security on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for McAfee / Trellix Endpoint Security by Trellix with detailed answer rationales." }
    ]
  },
  {
    id: "mirantis",
    name: "Mirantis Kubernetes & Docker",
    provider: "Mirantis",
    category: "cloud",
    categoryLabel: "Cloud & Infrastructure",
    role: "Mirantis Kubernetes Engine Administrator",
    examCount: 1,
    description: "Mirantis Container Runtime, Swarm/Kubernetes orchestration, and cluster lifecycle management.",
    vendorUrl: "https://www.mirantis.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/mirantis/",
    freeResources: [
      {
            "name": "Official Mirantis Documentation & Blueprint",
            "url": "https://www.mirantis.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Mirantis"
      },
      {
            "name": "Mirantis Kubernetes & Docker Community Reference & Guides",
            "url": "https://www.mirantis.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Mirantis Kubernetes & Docker"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Mirantis blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Mirantis Kubernetes & Docker from Mirantis: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Mirantis Kubernetes & Docker with official vendor Mirantis, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Mirantis Kubernetes & Docker?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Mirantis Kubernetes & Docker on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Mirantis Kubernetes & Docker by Mirantis with detailed answer rationales." }
    ]
  },
  {
    id: "mongodb",
    name: "MongoDB (Certified DBA & Developer)",
    provider: "MongoDB",
    category: "data_ai",
    categoryLabel: "Data, AI & Analytics",
    role: "MongoDB Certified DBA Associate",
    examCount: 2,
    description: "NoSQL document schema design, aggregation pipelines, sharding, replica sets, and Atlas cloud.",
    vendorUrl: "https://learn.mongodb.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/mongodb/",
    freeResources: [
      {
            "name": "Official MongoDB Documentation & Blueprint",
            "url": "https://learn.mongodb.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from MongoDB"
      },
      {
            "name": "MongoDB (Certified DBA & Developer) Community Reference & Guides",
            "url": "https://learn.mongodb.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for MongoDB (Certified DBA & Developer)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official MongoDB blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for MongoDB (Certified DBA & Developer) from MongoDB: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for MongoDB (Certified DBA & Developer) with official vendor MongoDB, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for MongoDB (Certified DBA & Developer)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass MongoDB (Certified DBA & Developer) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for MongoDB (Certified DBA & Developer) by MongoDB with detailed answer rationales." }
    ]
  },
  {
    id: "mulesoft",
    name: "MuleSoft (MCD Developer & Architect)",
    provider: "MuleSoft / Salesforce",
    category: "dev_software",
    categoryLabel: "Software & Development",
    role: "MuleSoft Certified Developer (MCD)",
    examCount: 5,
    description: "API-led connectivity, Anypoint Platform, DataWeave transformations, and Mule runtime.",
    vendorUrl: "https://training.mulesoft.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/mulesoft/",
    freeResources: [
      {
            "name": "Official MuleSoft / Salesforce Documentation & Blueprint",
            "url": "https://training.mulesoft.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from MuleSoft / Salesforce"
      },
      {
            "name": "MuleSoft (MCD Developer & Architect) Community Reference & Guides",
            "url": "https://training.mulesoft.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for MuleSoft (MCD Developer & Architect)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official MuleSoft / Salesforce blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for MuleSoft (MCD Developer & Architect) from MuleSoft / Salesforce: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for MuleSoft (MCD Developer & Architect) with official vendor MuleSoft / Salesforce, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for MuleSoft (MCD Developer & Architect)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass MuleSoft (MCD Developer & Architect) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for MuleSoft (MCD Developer & Architect) by MuleSoft / Salesforce with detailed answer rationales." }
    ]
  },
  {
    id: "nacva",
    name: "NACVA (Valuation Analyst CVA)",
    provider: "NACVA",
    category: "finance",
    categoryLabel: "Finance & Banking",
    role: "Certified Valuation Analyst (CVA)",
    examCount: 1,
    description: "Business valuation theory, financial statement analysis, capitalization rates, and cost of capital.",
    vendorUrl: "https://www.nacva.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/nacva/",
    freeResources: [
      {
            "name": "Official NACVA Documentation & Blueprint",
            "url": "https://www.nacva.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from NACVA"
      },
      {
            "name": "NACVA (Valuation Analyst CVA) Community Reference & Guides",
            "url": "https://www.nacva.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for NACVA (Valuation Analyst CVA)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official NACVA blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for NACVA (Valuation Analyst CVA) from NACVA: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for NACVA (Valuation Analyst CVA) with official vendor NACVA, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for NACVA (Valuation Analyst CVA)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass NACVA (Valuation Analyst CVA) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for NACVA (Valuation Analyst CVA) by NACVA with detailed answer rationales." }
    ]
  },
  {
    id: "nadca",
    name: "NADCA (Air Systems Cleaning ASCS)",
    provider: "NADCA",
    category: "trades",
    categoryLabel: "Skilled Trades & Engineering",
    role: "Air Systems Cleaning Specialist (ASCS)",
    examCount: 1,
    description: "HVAC system hygiene, indoor air quality assessment, duct cleaning standards, and biocides.",
    vendorUrl: "https://nadca.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/nadca/",
    freeResources: [
      {
            "name": "Official NADCA Documentation & Blueprint",
            "url": "https://nadca.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from NADCA"
      },
      {
            "name": "NADCA (Air Systems Cleaning ASCS) Community Reference & Guides",
            "url": "https://nadca.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for NADCA (Air Systems Cleaning ASCS)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official NADCA blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for NADCA (Air Systems Cleaning ASCS) from NADCA: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for NADCA (Air Systems Cleaning ASCS) with official vendor NADCA, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for NADCA (Air Systems Cleaning ASCS)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass NADCA (Air Systems Cleaning ASCS) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for NADCA (Air Systems Cleaning ASCS) by NADCA with detailed answer rationales." }
    ]
  },
  {
    id: "nasm",
    name: "NASM (Certified Personal Trainer CPT)",
    provider: "NASM",
    category: "health_allied",
    categoryLabel: "Allied Health & Diagnostics",
    role: "NASM Certified Personal Trainer",
    examCount: 1,
    description: "Optimum Performance Training (OPT) model, kinetic chain assessment, and corrective exercise.",
    vendorUrl: "https://www.nasm.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/nasm/",
    freeResources: [
      {
            "name": "Official NASM Documentation & Blueprint",
            "url": "https://www.nasm.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from NASM"
      },
      {
            "name": "NASM (Certified Personal Trainer CPT) Community Reference & Guides",
            "url": "https://www.nasm.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for NASM (Certified Personal Trainer CPT)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official NASM blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for NASM (Certified Personal Trainer CPT) from NASM: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for NASM (Certified Personal Trainer CPT) with official vendor NASM, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for NASM (Certified Personal Trainer CPT)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass NASM (Certified Personal Trainer CPT) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for NASM (Certified Personal Trainer CPT) by NASM with detailed answer rationales." }
    ]
  },
  {
    id: "ncino",
    name: "nCino (Commercial Banking Cloud)",
    provider: "nCino",
    category: "finance",
    categoryLabel: "Finance & Banking",
    role: "nCino Certified Commercial Banking Administrator",
    examCount: 1,
    description: "Cloud banking platform, loan origination workflow, credit memo underwriting, and compliance.",
    vendorUrl: "https://www.ncino.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/ncino/",
    freeResources: [
      {
            "name": "Official nCino Documentation & Blueprint",
            "url": "https://www.ncino.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from nCino"
      },
      {
            "name": "nCino (Commercial Banking Cloud) Community Reference & Guides",
            "url": "https://www.ncino.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for nCino (Commercial Banking Cloud)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official nCino blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for nCino (Commercial Banking Cloud) from nCino: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for nCino (Commercial Banking Cloud) with official vendor nCino, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for nCino (Commercial Banking Cloud)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass nCino (Commercial Banking Cloud) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for nCino (Commercial Banking Cloud) by nCino with detailed answer rationales." }
    ]
  },
  {
    id: "ncma",
    name: "NCMA (Contract Management CPCM)",
    provider: "NCMA",
    category: "mgmt_business",
    categoryLabel: "Project & Management",
    role: "Certified Professional Contract Manager",
    examCount: 1,
    description: "Contract Management Body of Knowledge (CMBOK), federal acquisition regulations (FAR), and ethics.",
    vendorUrl: "https://www.ncmahq.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/ncma/",
    freeResources: [
      {
            "name": "Official NCMA Documentation & Blueprint",
            "url": "https://www.ncmahq.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from NCMA"
      },
      {
            "name": "NCMA (Contract Management CPCM) Community Reference & Guides",
            "url": "https://www.ncmahq.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for NCMA (Contract Management CPCM)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official NCMA blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for NCMA (Contract Management CPCM) from NCMA: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for NCMA (Contract Management CPCM) with official vendor NCMA, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for NCMA (Contract Management CPCM)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass NCMA (Contract Management CPCM) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for NCMA (Contract Management CPCM) by NCMA with detailed answer rationales." }
    ]
  },
  {
    id: "netapp",
    name: "NetApp (NCDA, NCIE Storage)",
    provider: "NetApp",
    category: "cloud",
    categoryLabel: "Cloud & Infrastructure",
    role: "NetApp Certified Data Administrator (NCDA)",
    examCount: 33,
    description: "ONTAP data storage management, SAN/NAS protocols (NFS, iSCSI, FC), SnapMirror, and MetroCluster.",
    vendorUrl: "https://www.netapp.com/services/certifications/",
    examTopicsUrl: "https://www.examtopics.com/exams/netapp/",
    freeResources: [
      {
            "name": "Official NetApp Documentation & Blueprint",
            "url": "https://www.netapp.com/services/certifications/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from NetApp"
      },
      {
            "name": "NetApp (NCDA, NCIE Storage) Community Reference & Guides",
            "url": "https://www.netapp.com/services/certifications/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for NetApp (NCDA, NCIE Storage)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official NetApp blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for NetApp (NCDA, NCIE Storage) from NetApp: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for NetApp (NCDA, NCIE Storage) with official vendor NetApp, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for NetApp (NCDA, NCIE Storage)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass NetApp (NCDA, NCIE Storage) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for NetApp (NCDA, NCIE Storage) by NetApp with detailed answer rationales." }
    ]
  },
  {
    id: "netskope",
    name: "Netskope (Cloud Security & SASE)",
    provider: "Netskope",
    category: "cyber",
    categoryLabel: "Cybersecurity",
    role: "Netskope Certified Cloud Security Admin",
    examCount: 3,
    description: "Security Service Edge (SSE), Cloud Access Security Broker (CASB), and Zero Trust Network Access.",
    vendorUrl: "https://www.netskope.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/netskope/",
    freeResources: [
      {
            "name": "Official Netskope Documentation & Blueprint",
            "url": "https://www.netskope.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Netskope"
      },
      {
            "name": "Netskope (Cloud Security & SASE) Community Reference & Guides",
            "url": "https://www.netskope.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Netskope (Cloud Security & SASE)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Netskope blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Netskope (Cloud Security & SASE) from Netskope: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Netskope (Cloud Security & SASE) with official vendor Netskope, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Netskope (Cloud Security & SASE)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Netskope (Cloud Security & SASE) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Netskope (Cloud Security & SASE) by Netskope with detailed answer rationales." }
    ]
  },
  {
    id: "nfpa",
    name: "NFPA (Fire Protection Specialist CFPS)",
    provider: "NFPA",
    category: "trades",
    categoryLabel: "Skilled Trades & Engineering",
    role: "Certified Fire Protection Specialist (CFPS)",
    examCount: 1,
    description: "Fire prevention codes, life safety systems, sprinkler hydraulics, and hazard mitigation.",
    vendorUrl: "https://www.nfpa.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/nfpa/",
    freeResources: [
      {
            "name": "Official NFPA Documentation & Blueprint",
            "url": "https://www.nfpa.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from NFPA"
      },
      {
            "name": "NFPA (Fire Protection Specialist CFPS) Community Reference & Guides",
            "url": "https://www.nfpa.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for NFPA (Fire Protection Specialist CFPS)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official NFPA blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for NFPA (Fire Protection Specialist CFPS) from NFPA: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for NFPA (Fire Protection Specialist CFPS) with official vendor NFPA, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for NFPA (Fire Protection Specialist CFPS)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass NFPA (Fire Protection Specialist CFPS) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for NFPA (Fire Protection Specialist CFPS) by NFPA with detailed answer rationales." }
    ]
  },
  {
    id: "ni",
    name: "NI (LabVIEW Associate / Developer)",
    provider: "NI",
    category: "trades",
    categoryLabel: "Skilled Trades & Engineering",
    role: "Certified LabVIEW Associate Developer",
    examCount: 1,
    description: "National Instruments graphical programming, data acquisition (DAQ), and automated test design.",
    vendorUrl: "https://www.ni.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/ni/",
    freeResources: [
      {
            "name": "Official NI Documentation & Blueprint",
            "url": "https://www.ni.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from NI"
      },
      {
            "name": "NI (LabVIEW Associate / Developer) Community Reference & Guides",
            "url": "https://www.ni.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for NI (LabVIEW Associate / Developer)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official NI blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for NI (LabVIEW Associate / Developer) from NI: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for NI (LabVIEW Associate / Developer) with official vendor NI, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for NI (LabVIEW Associate / Developer)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass NI (LabVIEW Associate / Developer) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for NI (LabVIEW Associate / Developer) by NI with detailed answer rationales." }
    ]
  },
  {
    id: "nmims",
    name: "NMIMS (NMAT Management Aptitude)",
    provider: "GMAC / NMIMS",
    category: "mgmt_business",
    categoryLabel: "Project & Management",
    role: "Management Candidate",
    examCount: 1,
    description: "Aptitude assessment across Language Skills, Quantitative Skills, and Logical Reasoning.",
    vendorUrl: "https://www.nmims.edu/",
    examTopicsUrl: "https://www.examtopics.com/exams/nmims/",
    freeResources: [
      {
            "name": "Official GMAC / NMIMS Documentation & Blueprint",
            "url": "https://www.nmims.edu/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from GMAC / NMIMS"
      },
      {
            "name": "NMIMS (NMAT Management Aptitude) Community Reference & Guides",
            "url": "https://www.nmims.edu/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for NMIMS (NMAT Management Aptitude)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official GMAC / NMIMS blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for NMIMS (NMAT Management Aptitude) from GMAC / NMIMS: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for NMIMS (NMAT Management Aptitude) with official vendor GMAC / NMIMS, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for NMIMS (NMAT Management Aptitude)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass NMIMS (NMAT Management Aptitude) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for NMIMS (NMAT Management Aptitude) by GMAC / NMIMS with detailed answer rationales." }
    ]
  },
  {
    id: "nmls",
    name: "NMLS (SAFE Mortgage Loan Originator)",
    provider: "NMLS",
    category: "finance",
    categoryLabel: "Finance & Banking",
    role: "Licensed Mortgage Loan Originator (MLO)",
    examCount: 1,
    description: "Federal mortgage law (RESPA, TILA, TRID), ethics, and general mortgage loan origination.",
    vendorUrl: "https://mortgage.nationwidelicensingsystem.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/nmls/",
    freeResources: [
      {
            "name": "Official NMLS Documentation & Blueprint",
            "url": "https://mortgage.nationwidelicensingsystem.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from NMLS"
      },
      {
            "name": "NMLS (SAFE Mortgage Loan Originator) Community Reference & Guides",
            "url": "https://mortgage.nationwidelicensingsystem.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for NMLS (SAFE Mortgage Loan Originator)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official NMLS blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for NMLS (SAFE Mortgage Loan Originator) from NMLS: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for NMLS (SAFE Mortgage Loan Originator) with official vendor NMLS, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for NMLS (SAFE Mortgage Loan Originator)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass NMLS (SAFE Mortgage Loan Originator) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for NMLS (SAFE Mortgage Loan Originator) by NMLS with detailed answer rationales." }
    ]
  },
  {
    id: "nokia",
    name: "Nokia (Service Routing Architect SRA)",
    provider: "Nokia",
    category: "network",
    categoryLabel: "Networking & Telco",
    role: "Nokia Service Routing Architect (SRA)",
    examCount: 13,
    description: "7750 Service Router, SR-OS CLI, MPLS VPNs (VPRN, VPLS, EVPN), and segment routing.",
    vendorUrl: "https://www.nokia.com/networks/training/src/",
    examTopicsUrl: "https://www.examtopics.com/exams/nokia/",
    freeResources: [
      {
            "name": "Official Nokia Documentation & Blueprint",
            "url": "https://www.nokia.com/networks/training/src/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Nokia"
      },
      {
            "name": "Nokia (Service Routing Architect SRA) Community Reference & Guides",
            "url": "https://www.nokia.com/networks/training/src/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Nokia (Service Routing Architect SRA)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Nokia blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Nokia (Service Routing Architect SRA) from Nokia: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Nokia (Service Routing Architect SRA) with official vendor Nokia, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Nokia (Service Routing Architect SRA)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Nokia (Service Routing Architect SRA) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Nokia (Service Routing Architect SRA) by Nokia with detailed answer rationales." }
    ]
  },
  {
    id: "novell",
    name: "Novell / Micro Focus (Certified Engineer)",
    provider: "OpenText / Novell",
    category: "network",
    categoryLabel: "Networking & Telco",
    role: "Certified Novell Engineer (CNE)",
    examCount: 2,
    description: "Enterprise directory services, eDirectory, and Open Enterprise Server management.",
    vendorUrl: "https://www.opentext.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/novell/",
    freeResources: [
      {
            "name": "Official OpenText / Novell Documentation & Blueprint",
            "url": "https://www.opentext.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from OpenText / Novell"
      },
      {
            "name": "Novell / Micro Focus (Certified Engineer) Community Reference & Guides",
            "url": "https://www.opentext.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Novell / Micro Focus (Certified Engineer)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official OpenText / Novell blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Novell / Micro Focus (Certified Engineer) from OpenText / Novell: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Novell / Micro Focus (Certified Engineer) with official vendor OpenText / Novell, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Novell / Micro Focus (Certified Engineer)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Novell / Micro Focus (Certified Engineer) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Novell / Micro Focus (Certified Engineer) by OpenText / Novell with detailed answer rationales." }
    ]
  },
  {
    id: "nutanix",
    name: "Nutanix (NCP, NCM Cloud Platform)",
    provider: "Nutanix",
    category: "cloud",
    categoryLabel: "Cloud & Infrastructure",
    role: "Nutanix Certified Professional (NCP)",
    examCount: 17,
    description: "Hyperconverged infrastructure (HCI), Acropolis OS (AOS), AHV virtualization, and Prism Central.",
    vendorUrl: "https://www.nutanix.com/support-services/training-certification",
    examTopicsUrl: "https://www.examtopics.com/exams/nutanix/",
    freeResources: [
      {
            "name": "Official Nutanix Documentation & Blueprint",
            "url": "https://www.nutanix.com/support-services/training-certification",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Nutanix"
      },
      {
            "name": "Nutanix (NCP, NCM Cloud Platform) Community Reference & Guides",
            "url": "https://www.nutanix.com/support-services/training-certification",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Nutanix (NCP, NCM Cloud Platform)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Nutanix blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Nutanix (NCP, NCM Cloud Platform) from Nutanix: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Nutanix (NCP, NCM Cloud Platform) with official vendor Nutanix, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Nutanix (NCP, NCM Cloud Platform)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Nutanix (NCP, NCM Cloud Platform) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Nutanix (NCP, NCM Cloud Platform) by Nutanix with detailed answer rationales." }
    ]
  },
  {
    id: "nvidia",
    name: "NVIDIA (Deep Learning & Generative AI)",
    provider: "NVIDIA",
    category: "data_ai",
    categoryLabel: "Data, AI & Analytics",
    role: "NVIDIA Certified Generative AI Engineer",
    examCount: 8,
    description: "Accelerated computing, TensorRT, Triton inference server, CUDA, and LLM fine-tuning.",
    vendorUrl: "https://www.nvidia.com/en-us/training/certification/",
    examTopicsUrl: "https://www.examtopics.com/exams/nvidia/",
    freeResources: [
      {
            "name": "Official NVIDIA Documentation & Blueprint",
            "url": "https://www.nvidia.com/en-us/training/certification/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from NVIDIA"
      },
      {
            "name": "NVIDIA (Deep Learning & Generative AI) Community Reference & Guides",
            "url": "https://www.nvidia.com/en-us/training/certification/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for NVIDIA (Deep Learning & Generative AI)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official NVIDIA blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for NVIDIA (Deep Learning & Generative AI) from NVIDIA: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for NVIDIA (Deep Learning & Generative AI) with official vendor NVIDIA, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for NVIDIA (Deep Learning & Generative AI)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass NVIDIA (Deep Learning & Generative AI) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for NVIDIA (Deep Learning & Generative AI) by NVIDIA with detailed answer rationales." }
    ]
  },
  {
    id: "oceg",
    name: "OCEG (GRC Professional & Auditor)",
    provider: "OCEG",
    category: "finance",
    categoryLabel: "Finance & Banking",
    role: "GRC Professional (GRCP) & GRC Auditor",
    examCount: 2,
    description: "Open Compliance and Ethics Group capability model integrating Governance, Risk, and Compliance.",
    vendorUrl: "https://www.oceg.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/oceg/",
    freeResources: [
      {
            "name": "Official OCEG Documentation & Blueprint",
            "url": "https://www.oceg.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from OCEG"
      },
      {
            "name": "OCEG (GRC Professional & Auditor) Community Reference & Guides",
            "url": "https://www.oceg.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for OCEG (GRC Professional & Auditor)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official OCEG blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for OCEG (GRC Professional & Auditor) from OCEG: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for OCEG (GRC Professional & Auditor) with official vendor OCEG, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for OCEG (GRC Professional & Auditor)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass OCEG (GRC Professional & Auditor) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for OCEG (GRC Professional & Auditor) by OCEG with detailed answer rationales." }
    ]
  },
  {
    id: "omnissa",
    name: "Omnissa (formerly VMware Horizon)",
    provider: "Omnissa",
    category: "cloud",
    categoryLabel: "Cloud & Infrastructure",
    role: "Omnissa Certified Workspace Specialist",
    examCount: 2,
    description: "Horizon virtual desktop infrastructure (VDI) and Workspace ONE unified endpoint management.",
    vendorUrl: "https://www.omnissa.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/omnissa/",
    freeResources: [
      {
            "name": "Official Omnissa Documentation & Blueprint",
            "url": "https://www.omnissa.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Omnissa"
      },
      {
            "name": "Omnissa (formerly VMware Horizon) Community Reference & Guides",
            "url": "https://www.omnissa.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Omnissa (formerly VMware Horizon)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Omnissa blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Omnissa (formerly VMware Horizon) from Omnissa: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Omnissa (formerly VMware Horizon) with official vendor Omnissa, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Omnissa (formerly VMware Horizon)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Omnissa (formerly VMware Horizon) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Omnissa (formerly VMware Horizon) by Omnissa with detailed answer rationales." }
    ]
  },
  {
    id: "payroll",
    name: "PayrollOrg (Certified Payroll Prof CPP)",
    provider: "PayrollOrg",
    category: "finance",
    categoryLabel: "Finance & Banking",
    role: "Certified Payroll Professional (CPP)",
    examCount: 1,
    description: "Payroll calculations, federal tax withholding, FLSA wage and hour compliance, and fringe benefits.",
    vendorUrl: "https://www.payroll.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/payroll/",
    freeResources: [
      {
            "name": "Official PayrollOrg Documentation & Blueprint",
            "url": "https://www.payroll.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from PayrollOrg"
      },
      {
            "name": "PayrollOrg (Certified Payroll Prof CPP) Community Reference & Guides",
            "url": "https://www.payroll.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for PayrollOrg (Certified Payroll Prof CPP)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official PayrollOrg blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for PayrollOrg (Certified Payroll Prof CPP) from PayrollOrg: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for PayrollOrg (Certified Payroll Prof CPP) with official vendor PayrollOrg, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for PayrollOrg (Certified Payroll Prof CPP)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass PayrollOrg (Certified Payroll Prof CPP) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for PayrollOrg (Certified Payroll Prof CPP) by PayrollOrg with detailed answer rationales." }
    ]
  },
  {
    id: "pecb",
    name: "PECB (ISO 27001, 22301, 9001)",
    provider: "PECB",
    category: "cyber",
    categoryLabel: "Cybersecurity",
    role: "ISO/IEC 27001 Lead Auditor",
    examCount: 13,
    description: "Information security management systems (ISMS), business continuity, and quality audit credentials.",
    vendorUrl: "https://pecb.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/pecb/",
    freeResources: [
      {
            "name": "Official PECB Documentation & Blueprint",
            "url": "https://pecb.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from PECB"
      },
      {
            "name": "PECB (ISO 27001, 22301, 9001) Community Reference & Guides",
            "url": "https://pecb.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for PECB (ISO 27001, 22301, 9001)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official PECB blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for PECB (ISO 27001, 22301, 9001) from PECB: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for PECB (ISO 27001, 22301, 9001) with official vendor PECB, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for PECB (ISO 27001, 22301, 9001)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass PECB (ISO 27001, 22301, 9001) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for PECB (ISO 27001, 22301, 9001) by PECB with detailed answer rationales." }
    ]
  },
  {
    id: "pegasystems",
    name: "Pegasystems (System Architect CSA/CSSA)",
    provider: "Pegasystems",
    category: "dev_software",
    categoryLabel: "Software & Development",
    role: "Certified System Architect (CSA / CSSA)",
    examCount: 22,
    description: "Pega Infinity platform, case management, decisioning rules, integration, and UI architecture.",
    vendorUrl: "https://www.pega.com/services/pega-academy",
    examTopicsUrl: "https://www.examtopics.com/exams/pegasystems/",
    freeResources: [
      {
            "name": "Official Pegasystems Documentation & Blueprint",
            "url": "https://www.pega.com/services/pega-academy",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Pegasystems"
      },
      {
            "name": "Pegasystems (System Architect CSA/CSSA) Community Reference & Guides",
            "url": "https://www.pega.com/services/pega-academy",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Pegasystems (System Architect CSA/CSSA)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Pegasystems blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Pegasystems (System Architect CSA/CSSA) from Pegasystems: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Pegasystems (System Architect CSA/CSSA) with official vendor Pegasystems, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Pegasystems (System Architect CSA/CSSA)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Pegasystems (System Architect CSA/CSSA) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Pegasystems (System Architect CSA/CSSA) by Pegasystems with detailed answer rationales." }
    ]
  },
  {
    id: "peoplecert",
    name: "PEOPLECERT (ITIL, DevOps, PRINCE2)",
    provider: "PeopleCert",
    category: "mgmt_business",
    categoryLabel: "Project & Management",
    role: "PeopleCert Certified ITIL / DevOps Specialist",
    examCount: 5,
    description: "Accreditation body for global ITIL, PRINCE2, and Agile/DevOps professional frameworks.",
    vendorUrl: "https://www.peoplecert.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/peoplecert/",
    freeResources: [
      {
            "name": "Official PeopleCert Documentation & Blueprint",
            "url": "https://www.peoplecert.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from PeopleCert"
      },
      {
            "name": "PEOPLECERT (ITIL, DevOps, PRINCE2) Community Reference & Guides",
            "url": "https://www.peoplecert.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for PEOPLECERT (ITIL, DevOps, PRINCE2)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official PeopleCert blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for PEOPLECERT (ITIL, DevOps, PRINCE2) from PeopleCert: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for PEOPLECERT (ITIL, DevOps, PRINCE2) with official vendor PeopleCert, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for PEOPLECERT (ITIL, DevOps, PRINCE2)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass PEOPLECERT (ITIL, DevOps, PRINCE2) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for PEOPLECERT (ITIL, DevOps, PRINCE2) by PeopleCert with detailed answer rationales." }
    ]
  },
  {
    id: "prince2",
    name: "PRINCE2 (Foundation & Practitioner)",
    provider: "PeopleCert / Axelos",
    category: "mgmt_business",
    categoryLabel: "Project & Management",
    role: "PRINCE2 Practitioner",
    examCount: 8,
    description: "Process-driven project management method structured around 7 principles, themes, and processes.",
    vendorUrl: "https://www.peoplecert.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/prince2/",
    freeResources: [
      {
            "name": "Official PeopleCert / Axelos Documentation & Blueprint",
            "url": "https://www.peoplecert.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from PeopleCert / Axelos"
      },
      {
            "name": "PRINCE2 (Foundation & Practitioner) Community Reference & Guides",
            "url": "https://www.peoplecert.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for PRINCE2 (Foundation & Practitioner)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official PeopleCert / Axelos blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for PRINCE2 (Foundation & Practitioner) from PeopleCert / Axelos: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for PRINCE2 (Foundation & Practitioner) with official vendor PeopleCert / Axelos, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for PRINCE2 (Foundation & Practitioner)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass PRINCE2 (Foundation & Practitioner) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for PRINCE2 (Foundation & Practitioner) by PeopleCert / Axelos with detailed answer rationales." }
    ]
  },
  {
    id: "prmia",
    name: "PRMIA (Professional Risk Manager PRM)",
    provider: "PRMIA",
    category: "finance",
    categoryLabel: "Finance & Banking",
    role: "Professional Risk Manager (PRM)",
    examCount: 1,
    description: "Quantitative finance, financial market theory, risk management practices, and case studies.",
    vendorUrl: "https://prmia.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/prmia/",
    freeResources: [
      {
            "name": "Official PRMIA Documentation & Blueprint",
            "url": "https://prmia.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from PRMIA"
      },
      {
            "name": "PRMIA (Professional Risk Manager PRM) Community Reference & Guides",
            "url": "https://prmia.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for PRMIA (Professional Risk Manager PRM)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official PRMIA blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for PRMIA (Professional Risk Manager PRM) from PRMIA: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for PRMIA (Professional Risk Manager PRM) with official vendor PRMIA, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for PRMIA (Professional Risk Manager PRM)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass PRMIA (Professional Risk Manager PRM) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for PRMIA (Professional Risk Manager PRM) by PRMIA with detailed answer rationales." }
    ]
  },
  {
    id: "proofpoint",
    name: "Proofpoint (Email Security & Protection)",
    provider: "Proofpoint",
    category: "cyber",
    categoryLabel: "Cybersecurity",
    role: "Proofpoint Certified Security Specialist",
    examCount: 2,
    description: "Targeted attack protection (TAP), email fraud defense (DMARC), and enterprise DLP.",
    vendorUrl: "https://www.proofpoint.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/proofpoint/",
    freeResources: [
      {
            "name": "Official Proofpoint Documentation & Blueprint",
            "url": "https://www.proofpoint.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Proofpoint"
      },
      {
            "name": "Proofpoint (Email Security & Protection) Community Reference & Guides",
            "url": "https://www.proofpoint.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Proofpoint (Email Security & Protection)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Proofpoint blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Proofpoint (Email Security & Protection) from Proofpoint: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Proofpoint (Email Security & Protection) with official vendor Proofpoint, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Proofpoint (Email Security & Protection)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Proofpoint (Email Security & Protection) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Proofpoint (Email Security & Protection) by Proofpoint with detailed answer rationales." }
    ]
  },
  {
    id: "pure-storage",
    name: "Pure Storage (FlashArray Implementation)",
    provider: "Pure Storage",
    category: "cloud",
    categoryLabel: "Cloud & Infrastructure",
    role: "Pure Storage FlashArray Architect",
    examCount: 2,
    description: "All-flash NVMe storage architectures, Purity OS, snapshots, active-active replication, and APIs.",
    vendorUrl: "https://www.purestorage.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/pure-storage/",
    freeResources: [
      {
            "name": "Official Pure Storage Documentation & Blueprint",
            "url": "https://www.purestorage.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Pure Storage"
      },
      {
            "name": "Pure Storage (FlashArray Implementation) Community Reference & Guides",
            "url": "https://www.purestorage.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Pure Storage (FlashArray Implementation)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Pure Storage blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Pure Storage (FlashArray Implementation) from Pure Storage: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Pure Storage (FlashArray Implementation) with official vendor Pure Storage, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Pure Storage (FlashArray Implementation)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Pure Storage (FlashArray Implementation) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Pure Storage (FlashArray Implementation) by Pure Storage with detailed answer rationales." }
    ]
  },
  {
    id: "python-institute",
    name: "Python Institute (PCEP, PCAP, PCPP)",
    provider: "Python Institute",
    category: "dev_software",
    categoryLabel: "Software & Development",
    role: "Certified Associate / Professional in Python",
    examCount: 5,
    description: "Object-oriented Python programming, algorithms, GUI frameworks, network programming, and REST.",
    vendorUrl: "https://pythoninstitute.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/python-institute/",
    freeResources: [
      {
            "name": "Official Python Institute Documentation & Blueprint",
            "url": "https://pythoninstitute.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Python Institute"
      },
      {
            "name": "Python Institute (PCEP, PCAP, PCPP) Community Reference & Guides",
            "url": "https://pythoninstitute.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Python Institute (PCEP, PCAP, PCPP)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Python Institute blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Python Institute (PCEP, PCAP, PCPP) from Python Institute: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Python Institute (PCEP, PCAP, PCPP) with official vendor Python Institute, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Python Institute (PCEP, PCAP, PCPP)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Python Institute (PCEP, PCAP, PCPP) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Python Institute (PCEP, PCAP, PCPP) by Python Institute with detailed answer rationales." }
    ]
  },
  {
    id: "qlikview",
    name: "QlikView & Qlik Sense",
    provider: "Qlik",
    category: "data_ai",
    categoryLabel: "Data, AI & Analytics",
    role: "Qlik Sense Data Architect",
    examCount: 6,
    description: "Associative data indexing, data modeling, script syntax, and interactive BI dashboards.",
    vendorUrl: "https://www.qlik.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/qlikview/",
    freeResources: [
      {
            "name": "Official Qlik Documentation & Blueprint",
            "url": "https://www.qlik.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Qlik"
      },
      {
            "name": "QlikView & Qlik Sense Community Reference & Guides",
            "url": "https://www.qlik.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for QlikView & Qlik Sense"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Qlik blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for QlikView & Qlik Sense from Qlik: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for QlikView & Qlik Sense with official vendor Qlik, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for QlikView & Qlik Sense?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass QlikView & Qlik Sense on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for QlikView & Qlik Sense by Qlik with detailed answer rationales." }
    ]
  },
  {
    id: "redhat",
    name: "Red Hat (RHCSA, RHCE, OpenShift)",
    provider: "Red Hat",
    category: "dev_software",
    categoryLabel: "Software & Development",
    role: "Red Hat Certified Engineer (RHCE)",
    examCount: 3,
    description: "Enterprise Linux performance-based exams, Ansible automation, and OpenShift container platform.",
    vendorUrl: "https://www.redhat.com/en/services/certification",
    examTopicsUrl: "https://www.examtopics.com/exams/redhat/",
    freeResources: [
      {
            "name": "Official Red Hat Documentation & Blueprint",
            "url": "https://www.redhat.com/en/services/certification",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Red Hat"
      },
      {
            "name": "Red Hat (RHCSA, RHCE, OpenShift) Community Reference & Guides",
            "url": "https://www.redhat.com/en/services/certification",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Red Hat (RHCSA, RHCE, OpenShift)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Red Hat blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Red Hat (RHCSA, RHCE, OpenShift) from Red Hat: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Red Hat (RHCSA, RHCE, OpenShift) with official vendor Red Hat, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Red Hat (RHCSA, RHCE, OpenShift)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Red Hat (RHCSA, RHCE, OpenShift) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Red Hat (RHCSA, RHCE, OpenShift) by Red Hat with detailed answer rationales." }
    ]
  },
  {
    id: "riverbed",
    name: "Riverbed (SteelHead WAN Optimization)",
    provider: "Riverbed",
    category: "network",
    categoryLabel: "Networking & Telco",
    role: "Riverbed Certified Solutions Professional",
    examCount: 6,
    description: "WAN optimization, SteelHead appliance configuration, traffic shaping, and NPM performance.",
    vendorUrl: "https://www.riverbed.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/riverbed/",
    freeResources: [
      {
            "name": "Official Riverbed Documentation & Blueprint",
            "url": "https://www.riverbed.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Riverbed"
      },
      {
            "name": "Riverbed (SteelHead WAN Optimization) Community Reference & Guides",
            "url": "https://www.riverbed.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Riverbed (SteelHead WAN Optimization)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Riverbed blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Riverbed (SteelHead WAN Optimization) from Riverbed: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Riverbed (SteelHead WAN Optimization) with official vendor Riverbed, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Riverbed (SteelHead WAN Optimization)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Riverbed (SteelHead WAN Optimization) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Riverbed (SteelHead WAN Optimization) by Riverbed with detailed answer rationales." }
    ]
  },
  {
    id: "ruckus-networks",
    name: "RUCKUS Networks (CommScope Wi-Fi)",
    provider: "CommScope / RUCKUS",
    category: "network",
    categoryLabel: "Networking & Telco",
    role: "RUCKUS Certified Wi-Fi Associate",
    examCount: 2,
    description: "BeamFlex adaptive antenna technology, SmartZone controllers, and ICX campus switching.",
    vendorUrl: "https://www.commscope.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/ruckus-networks/",
    freeResources: [
      {
            "name": "Official CommScope / RUCKUS Documentation & Blueprint",
            "url": "https://www.commscope.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from CommScope / RUCKUS"
      },
      {
            "name": "RUCKUS Networks (CommScope Wi-Fi) Community Reference & Guides",
            "url": "https://www.commscope.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for RUCKUS Networks (CommScope Wi-Fi)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official CommScope / RUCKUS blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for RUCKUS Networks (CommScope Wi-Fi) from CommScope / RUCKUS: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for RUCKUS Networks (CommScope Wi-Fi) with official vendor CommScope / RUCKUS, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for RUCKUS Networks (CommScope Wi-Fi)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass RUCKUS Networks (CommScope Wi-Fi) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for RUCKUS Networks (CommScope Wi-Fi) by CommScope / RUCKUS with detailed answer rationales." }
    ]
  },
  {
    id: "sailpoint",
    name: "SailPoint (IdentityIQ & IdentityNow)",
    provider: "SailPoint",
    category: "cyber",
    categoryLabel: "Cybersecurity",
    role: "SailPoint Certified Identity Engineer",
    examCount: 1,
    description: "Identity governance and administration (IGA), access certifications, provisioning rules, and connectors.",
    vendorUrl: "https://www.sailpoint.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/sailpoint/",
    freeResources: [
      {
            "name": "Official SailPoint Documentation & Blueprint",
            "url": "https://www.sailpoint.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from SailPoint"
      },
      {
            "name": "SailPoint (IdentityIQ & IdentityNow) Community Reference & Guides",
            "url": "https://www.sailpoint.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for SailPoint (IdentityIQ & IdentityNow)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official SailPoint blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for SailPoint (IdentityIQ & IdentityNow) from SailPoint: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for SailPoint (IdentityIQ & IdentityNow) with official vendor SailPoint, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for SailPoint (IdentityIQ & IdentityNow)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass SailPoint (IdentityIQ & IdentityNow) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for SailPoint (IdentityIQ & IdentityNow) by SailPoint with detailed answer rationales." }
    ]
  },
  {
    id: "sans",
    name: "SANS Institute Information Security",
    provider: "SANS Institute",
    category: "cyber",
    categoryLabel: "Cybersecurity",
    role: "SANS Cyber Defense Specialist",
    examCount: 1,
    description: "Intensive immersion cybersecurity training and GIAC certification preparation programs.",
    vendorUrl: "https://www.sans.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/sans/",
    freeResources: [
      {
            "name": "Official SANS Institute Documentation & Blueprint",
            "url": "https://www.sans.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from SANS Institute"
      },
      {
            "name": "SANS Institute Information Security Community Reference & Guides",
            "url": "https://www.sans.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for SANS Institute Information Security"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official SANS Institute blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for SANS Institute Information Security from SANS Institute: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for SANS Institute Information Security with official vendor SANS Institute, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for SANS Institute Information Security?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass SANS Institute Information Security on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for SANS Institute Information Security by SANS Institute with detailed answer rationales." }
    ]
  },
  {
    id: "sap",
    name: "SAP (S/4HANA, ABAP, FICO, MM)",
    provider: "SAP",
    category: "mgmt_business",
    categoryLabel: "Project & Management",
    role: "SAP Certified Application Associate",
    examCount: 62,
    description: "Enterprise Resource Planning (ERP), S/4HANA Finance, Supply Chain, and Business Technology Platform.",
    vendorUrl: "https://learning.sap.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/sap/",
    freeResources: [
      {
            "name": "Official SAP Documentation & Blueprint",
            "url": "https://learning.sap.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from SAP"
      },
      {
            "name": "SAP (S/4HANA, ABAP, FICO, MM) Community Reference & Guides",
            "url": "https://learning.sap.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for SAP (S/4HANA, ABAP, FICO, MM)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official SAP blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for SAP (S/4HANA, ABAP, FICO, MM) from SAP: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for SAP (S/4HANA, ABAP, FICO, MM) with official vendor SAP, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for SAP (S/4HANA, ABAP, FICO, MM)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass SAP (S/4HANA, ABAP, FICO, MM) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for SAP (S/4HANA, ABAP, FICO, MM) by SAP with detailed answer rationales." }
    ]
  },
  {
    id: "sas-institute",
    name: "SAS Institute (Statistical Business Analyst)",
    provider: "SAS Institute",
    category: "data_ai",
    categoryLabel: "Data, AI & Analytics",
    role: "SAS Certified Advanced Programmer",
    examCount: 5,
    description: "Base SAS data step, SQL processing, macro language, predictive modeling, and analytics.",
    vendorUrl: "https://www.sas.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/sas-institute/",
    freeResources: [
      {
            "name": "Official SAS Institute Documentation & Blueprint",
            "url": "https://www.sas.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from SAS Institute"
      },
      {
            "name": "SAS Institute (Statistical Business Analyst) Community Reference & Guides",
            "url": "https://www.sas.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for SAS Institute (Statistical Business Analyst)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official SAS Institute blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for SAS Institute (Statistical Business Analyst) from SAS Institute: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for SAS Institute (Statistical Business Analyst) with official vendor SAS Institute, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for SAS Institute (Statistical Business Analyst)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass SAS Institute (Statistical Business Analyst) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for SAS Institute (Statistical Business Analyst) by SAS Institute with detailed answer rationales." }
    ]
  },
  {
    id: "scaled-agile",
    name: "Scaled Agile (SAFe Agilist & SSM)",
    provider: "Scaled Agile",
    category: "mgmt_business",
    categoryLabel: "Project & Management",
    role: "Certified SAFe Agilist (Leading SAFe)",
    examCount: 5,
    description: "Scaling Agile frameworks, Agile Release Trains (ARTs), PI Planning, and Lean Portfolio Management.",
    vendorUrl: "https://scaledagile.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/scaled-agile/",
    freeResources: [
      {
            "name": "Official Scaled Agile Documentation & Blueprint",
            "url": "https://scaledagile.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Scaled Agile"
      },
      {
            "name": "Scaled Agile (SAFe Agilist & SSM) Community Reference & Guides",
            "url": "https://scaledagile.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Scaled Agile (SAFe Agilist & SSM)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Scaled Agile blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Scaled Agile (SAFe Agilist & SSM) from Scaled Agile: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Scaled Agile (SAFe Agilist & SSM) with official vendor Scaled Agile, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Scaled Agile (SAFe Agilist & SSM)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Scaled Agile (SAFe Agilist & SSM) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Scaled Agile (SAFe Agilist & SSM) by Scaled Agile with detailed answer rationales." }
    ]
  },
  {
    id: "scrum-alliance",
    name: "Scrum Alliance (CSM & CSPO)",
    provider: "Scrum Alliance",
    category: "mgmt_business",
    categoryLabel: "Project & Management",
    role: "Certified ScrumMaster (CSM)",
    examCount: 1,
    description: "Global foundational agile and scrum certification for servant leaders and product owners.",
    vendorUrl: "https://www.scrumalliance.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/scrum-alliance/",
    freeResources: [
      {
            "name": "Official Scrum Alliance Documentation & Blueprint",
            "url": "https://www.scrumalliance.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Scrum Alliance"
      },
      {
            "name": "Scrum Alliance (CSM & CSPO) Community Reference & Guides",
            "url": "https://www.scrumalliance.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Scrum Alliance (CSM & CSPO)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Scrum Alliance blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Scrum Alliance (CSM & CSPO) from Scrum Alliance: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Scrum Alliance (CSM & CSPO) with official vendor Scrum Alliance, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Scrum Alliance (CSM & CSPO)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Scrum Alliance (CSM & CSPO) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Scrum Alliance (CSM & CSPO) by Scrum Alliance with detailed answer rationales." }
    ]
  },
  {
    id: "sdfm",
    name: "SDFM (Defense Financial Manager CDFM)",
    provider: "SDFM",
    category: "finance",
    categoryLabel: "Finance & Banking",
    role: "Certified Defense Financial Manager (CDFM)",
    examCount: 3,
    description: "DoD resource management environment, budgeting, fiscal law, accounting, and internal controls.",
    vendorUrl: "https://www.sdfm.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/sdfm/",
    freeResources: [
      {
            "name": "Official SDFM Documentation & Blueprint",
            "url": "https://www.sdfm.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from SDFM"
      },
      {
            "name": "SDFM (Defense Financial Manager CDFM) Community Reference & Guides",
            "url": "https://www.sdfm.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for SDFM (Defense Financial Manager CDFM)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official SDFM blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for SDFM (Defense Financial Manager CDFM) from SDFM: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for SDFM (Defense Financial Manager CDFM) with official vendor SDFM, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for SDFM (Defense Financial Manager CDFM)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass SDFM (Defense Financial Manager CDFM) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for SDFM (Defense Financial Manager CDFM) by SDFM with detailed answer rationales." }
    ]
  },
  {
    id: "sdi",
    name: "SDI (Service Desk Institute)",
    provider: "SDI",
    category: "mgmt_business",
    categoryLabel: "Project & Management",
    role: "Service Desk Manager (SDM)",
    examCount: 1,
    description: "IT support service desk strategy, KPI metrics, customer satisfaction, and team leadership.",
    vendorUrl: "https://www.servicedeskinstitute.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/sdi/",
    freeResources: [
      {
            "name": "Official SDI Documentation & Blueprint",
            "url": "https://www.servicedeskinstitute.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from SDI"
      },
      {
            "name": "SDI (Service Desk Institute) Community Reference & Guides",
            "url": "https://www.servicedeskinstitute.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for SDI (Service Desk Institute)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official SDI blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for SDI (Service Desk Institute) from SDI: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for SDI (Service Desk Institute) with official vendor SDI, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for SDI (Service Desk Institute)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass SDI (Service Desk Institute) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for SDI (Service Desk Institute) by SDI with detailed answer rationales." }
    ]
  },
  {
    id: "secops-group",
    name: "SecOps Group (Certified AppSec)",
    provider: "SecOps Group",
    category: "cyber",
    categoryLabel: "Cybersecurity",
    role: "Certified AppSec Practitioner (CAP)",
    examCount: 1,
    description: "Web application security testing, OWASP Top 10 exploitation, and secure code review.",
    vendorUrl: "https://secops.group/",
    examTopicsUrl: "https://www.examtopics.com/exams/secops-group/",
    freeResources: [
      {
            "name": "Official SecOps Group Documentation & Blueprint",
            "url": "https://secops.group/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from SecOps Group"
      },
      {
            "name": "SecOps Group (Certified AppSec) Community Reference & Guides",
            "url": "https://secops.group/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for SecOps Group (Certified AppSec)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official SecOps Group blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for SecOps Group (Certified AppSec) from SecOps Group: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for SecOps Group (Certified AppSec) with official vendor SecOps Group, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for SecOps Group (Certified AppSec)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass SecOps Group (Certified AppSec) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for SecOps Group (Certified AppSec) by SecOps Group with detailed answer rationales." }
    ]
  },
  {
    id: "sitecore",
    name: "Sitecore Experience Platform Developer",
    provider: "Sitecore",
    category: "dev_software",
    categoryLabel: "Software & Development",
    role: "Sitecore Certified Solution Developer",
    examCount: 1,
    description: "Digital experience platform, .NET MVC item templates, rendering architecture, and analytics.",
    vendorUrl: "https://www.sitecore.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/sitecore/",
    freeResources: [
      {
            "name": "Official Sitecore Documentation & Blueprint",
            "url": "https://www.sitecore.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Sitecore"
      },
      {
            "name": "Sitecore Experience Platform Developer Community Reference & Guides",
            "url": "https://www.sitecore.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Sitecore Experience Platform Developer"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Sitecore blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Sitecore Experience Platform Developer from Sitecore: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Sitecore Experience Platform Developer with official vendor Sitecore, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Sitecore Experience Platform Developer?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Sitecore Experience Platform Developer on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Sitecore Experience Platform Developer by Sitecore with detailed answer rationales." }
    ]
  },
  {
    id: "six-sigma",
    name: "Six Sigma (Lean Six Sigma Green/Black Belt)",
    provider: "IASSC / ASQ",
    category: "mgmt_business",
    categoryLabel: "Project & Management",
    role: "Lean Six Sigma Black Belt",
    examCount: 8,
    description: "DMAIC methodology, statistical process control, root cause analysis, and process optimization.",
    vendorUrl: "https://www.iassc.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/six-sigma/",
    freeResources: [
      {
            "name": "Official IASSC / ASQ Documentation & Blueprint",
            "url": "https://www.iassc.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from IASSC / ASQ"
      },
      {
            "name": "Six Sigma (Lean Six Sigma Green/Black Belt) Community Reference & Guides",
            "url": "https://www.iassc.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Six Sigma (Lean Six Sigma Green/Black Belt)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official IASSC / ASQ blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Six Sigma (Lean Six Sigma Green/Black Belt) from IASSC / ASQ: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Six Sigma (Lean Six Sigma Green/Black Belt) with official vendor IASSC / ASQ, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Six Sigma (Lean Six Sigma Green/Black Belt)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Six Sigma (Lean Six Sigma Green/Black Belt) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Six Sigma (Lean Six Sigma Green/Black Belt) by IASSC / ASQ with detailed answer rationales." }
    ]
  },
  {
    id: "slack",
    name: "Slack (Certified Developer & Admin)",
    provider: "Slack / Salesforce",
    category: "dev_software",
    categoryLabel: "Software & Development",
    role: "Slack Certified Developer",
    examCount: 1,
    description: "Bolt framework, Block Kit UI, Slack APIs, workflow builder, and enterprise administration.",
    vendorUrl: "https://slackcertified.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/slack/",
    freeResources: [
      {
            "name": "Official Slack / Salesforce Documentation & Blueprint",
            "url": "https://slackcertified.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Slack / Salesforce"
      },
      {
            "name": "Slack (Certified Developer & Admin) Community Reference & Guides",
            "url": "https://slackcertified.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Slack (Certified Developer & Admin)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Slack / Salesforce blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Slack (Certified Developer & Admin) from Slack / Salesforce: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Slack (Certified Developer & Admin) with official vendor Slack / Salesforce, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Slack (Certified Developer & Admin)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Slack (Certified Developer & Admin) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Slack (Certified Developer & Admin) by Slack / Salesforce with detailed answer rationales." }
    ]
  },
  {
    id: "snia",
    name: "SNIA (Storage Networking Specialist)",
    provider: "SNIA",
    category: "cloud",
    categoryLabel: "Cloud & Infrastructure",
    role: "Storage Networking Industry Specialist",
    examCount: 2,
    description: "Fibre Channel, NVMe-oF, iSCSI, storage virtualization, and disaster recovery architectures.",
    vendorUrl: "https://www.snia.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/snia/",
    freeResources: [
      {
            "name": "Official SNIA Documentation & Blueprint",
            "url": "https://www.snia.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from SNIA"
      },
      {
            "name": "SNIA (Storage Networking Specialist) Community Reference & Guides",
            "url": "https://www.snia.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for SNIA (Storage Networking Specialist)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official SNIA blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for SNIA (Storage Networking Specialist) from SNIA: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for SNIA (Storage Networking Specialist) with official vendor SNIA, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for SNIA (Storage Networking Specialist)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass SNIA (Storage Networking Specialist) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for SNIA (Storage Networking Specialist) by SNIA with detailed answer rationales." }
    ]
  },
  {
    id: "soa",
    name: "Society of Actuaries (SOA / ASA / FSA)",
    provider: "Society of Actuaries",
    category: "finance",
    categoryLabel: "Finance & Banking",
    role: "Associate of the Society of Actuaries (ASA)",
    examCount: 5,
    description: "Probability, financial mathematics, investment risk modeling, and actuarial statistics.",
    vendorUrl: "https://www.soa.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/soa/",
    freeResources: [
      {
            "name": "Official Society of Actuaries Documentation & Blueprint",
            "url": "https://www.soa.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Society of Actuaries"
      },
      {
            "name": "Society of Actuaries (SOA / ASA / FSA) Community Reference & Guides",
            "url": "https://www.soa.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Society of Actuaries (SOA / ASA / FSA)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Society of Actuaries blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Society of Actuaries (SOA / ASA / FSA) from Society of Actuaries: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Society of Actuaries (SOA / ASA / FSA) with official vendor Society of Actuaries, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Society of Actuaries (SOA / ASA / FSA)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Society of Actuaries (SOA / ASA / FSA) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Society of Actuaries (SOA / ASA / FSA) by Society of Actuaries with detailed answer rationales." }
    ]
  },
  {
    id: "solarwinds",
    name: "SolarWinds (SCP Professional)",
    provider: "SolarWinds",
    category: "network",
    categoryLabel: "Networking & Telco",
    role: "SolarWinds Certified Professional (SCP)",
    examCount: 5,
    description: "Network Performance Monitor (NPM), Server & Application Monitor (SAM), and IPAM administration.",
    vendorUrl: "https://www.solarwinds.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/solarwinds/",
    freeResources: [
      {
            "name": "Official SolarWinds Documentation & Blueprint",
            "url": "https://www.solarwinds.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from SolarWinds"
      },
      {
            "name": "SolarWinds (SCP Professional) Community Reference & Guides",
            "url": "https://www.solarwinds.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for SolarWinds (SCP Professional)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official SolarWinds blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for SolarWinds (SCP Professional) from SolarWinds: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for SolarWinds (SCP Professional) with official vendor SolarWinds, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for SolarWinds (SCP Professional)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass SolarWinds (SCP Professional) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for SolarWinds (SCP Professional) by SolarWinds with detailed answer rationales." }
    ]
  },
  {
    id: "symantec",
    name: "Symantec (Endpoint Protection)",
    provider: "Broadcom / Symantec",
    category: "cyber",
    categoryLabel: "Cybersecurity",
    role: "Symantec Certified Technical Specialist",
    examCount: 11,
    description: "Symantec Endpoint Protection (SEP), email security.cloud, and data loss prevention (DLP).",
    vendorUrl: "https://www.broadcom.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/symantec/",
    freeResources: [
      {
            "name": "Official Broadcom / Symantec Documentation & Blueprint",
            "url": "https://www.broadcom.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Broadcom / Symantec"
      },
      {
            "name": "Symantec (Endpoint Protection) Community Reference & Guides",
            "url": "https://www.broadcom.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Symantec (Endpoint Protection)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Broadcom / Symantec blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Symantec (Endpoint Protection) from Broadcom / Symantec: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Symantec (Endpoint Protection) with official vendor Broadcom / Symantec, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Symantec (Endpoint Protection)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Symantec (Endpoint Protection) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Symantec (Endpoint Protection) by Broadcom / Symantec with detailed answer rationales." }
    ]
  },
  {
    id: "tableau",
    name: "Tableau (Desktop & Data Analyst)",
    provider: "Tableau / Salesforce",
    category: "data_ai",
    categoryLabel: "Data, AI & Analytics",
    role: "Tableau Certified Data Analyst",
    examCount: 3,
    description: "Data visualization, Level of Detail (LOD) calculations, parameters, table calculations, and dashboards.",
    vendorUrl: "https://www.tableau.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/tableau/",
    freeResources: [
      {
            "name": "Official Tableau / Salesforce Documentation & Blueprint",
            "url": "https://www.tableau.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Tableau / Salesforce"
      },
      {
            "name": "Tableau (Desktop & Data Analyst) Community Reference & Guides",
            "url": "https://www.tableau.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Tableau (Desktop & Data Analyst)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Tableau / Salesforce blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Tableau (Desktop & Data Analyst) from Tableau / Salesforce: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Tableau (Desktop & Data Analyst) with official vendor Tableau / Salesforce, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Tableau (Desktop & Data Analyst)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Tableau (Desktop & Data Analyst) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Tableau (Desktop & Data Analyst) by Tableau / Salesforce with detailed answer rationales." }
    ]
  },
  {
    id: "talend",
    name: "Talend (Data Integration Developer)",
    provider: "Qlik / Talend",
    category: "data_ai",
    categoryLabel: "Data, AI & Analytics",
    role: "Talend Data Integration Certified Developer",
    examCount: 2,
    description: "ETL workflow design, component configurations, context variables, and big data connectors.",
    vendorUrl: "https://www.talend.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/talend/",
    freeResources: [
      {
            "name": "Official Qlik / Talend Documentation & Blueprint",
            "url": "https://www.talend.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Qlik / Talend"
      },
      {
            "name": "Talend (Data Integration Developer) Community Reference & Guides",
            "url": "https://www.talend.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Talend (Data Integration Developer)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Qlik / Talend blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Talend (Data Integration Developer) from Qlik / Talend: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Talend (Data Integration Developer) with official vendor Qlik / Talend, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Talend (Data Integration Developer)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Talend (Data Integration Developer) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Talend (Data Integration Developer) by Qlik / Talend with detailed answer rationales." }
    ]
  },
  {
    id: "teradata",
    name: "Teradata Vantage Database Admin",
    provider: "Teradata",
    category: "data_ai",
    categoryLabel: "Data, AI & Analytics",
    role: "Teradata Vantage Certified Associate",
    examCount: 2,
    description: "Teradata parallel architecture (AMPs, PEs), primary index selection, and enterprise SQL tuning.",
    vendorUrl: "https://www.teradata.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/teradata/",
    freeResources: [
      {
            "name": "Official Teradata Documentation & Blueprint",
            "url": "https://www.teradata.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Teradata"
      },
      {
            "name": "Teradata Vantage Database Admin Community Reference & Guides",
            "url": "https://www.teradata.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Teradata Vantage Database Admin"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Teradata blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Teradata Vantage Database Admin from Teradata: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Teradata Vantage Database Admin with official vendor Teradata, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Teradata Vantage Database Admin?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Teradata Vantage Database Admin on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Teradata Vantage Database Admin by Teradata with detailed answer rationales." }
    ]
  },
  {
    id: "test-prep",
    name: "Test Prep (Admissions & Academic)",
    provider: "Test Prep Boards",
    category: "mgmt_business",
    categoryLabel: "Project & Management",
    role: "Academic & Professional Candidate",
    examCount: 68,
    description: "Graduate and professional admissions test preparation across standard academic disciplines.",
    vendorUrl: "https://www.ets.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/test-prep/",
    freeResources: [
      {
            "name": "Official Test Prep Boards Documentation & Blueprint",
            "url": "https://www.ets.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Test Prep Boards"
      },
      {
            "name": "Test Prep (Admissions & Academic) Community Reference & Guides",
            "url": "https://www.ets.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Test Prep (Admissions & Academic)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Test Prep Boards blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Test Prep (Admissions & Academic) from Test Prep Boards: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Test Prep (Admissions & Academic) with official vendor Test Prep Boards, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Test Prep (Admissions & Academic)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Test Prep (Admissions & Academic) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Test Prep (Admissions & Academic) by Test Prep Boards with detailed answer rationales." }
    ]
  },
  {
    id: "the-open-group",
    name: "The Open Group (TOGAF 9/10 Architect)",
    provider: "The Open Group",
    category: "mgmt_business",
    categoryLabel: "Project & Management",
    role: "TOGAF Certified Enterprise Architect",
    examCount: 13,
    description: "Architecture Development Method (ADM), enterprise continuum, architecture governance, and views.",
    vendorUrl: "https://www.opengroup.org/certifications",
    examTopicsUrl: "https://www.examtopics.com/exams/the-open-group/",
    freeResources: [
      {
            "name": "Official The Open Group Documentation & Blueprint",
            "url": "https://www.opengroup.org/certifications",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from The Open Group"
      },
      {
            "name": "The Open Group (TOGAF 9/10 Architect) Community Reference & Guides",
            "url": "https://www.opengroup.org/certifications",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for The Open Group (TOGAF 9/10 Architect)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official The Open Group blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for The Open Group (TOGAF 9/10 Architect) from The Open Group: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for The Open Group (TOGAF 9/10 Architect) with official vendor The Open Group, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for The Open Group (TOGAF 9/10 Architect)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass The Open Group (TOGAF 9/10 Architect) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for The Open Group (TOGAF 9/10 Architect) by The Open Group with detailed answer rationales." }
    ]
  },
  {
    id: "tibco",
    name: "TIBCO (BusinessWorks & Spotfire)",
    provider: "TIBCO / Cloud Software Group",
    category: "dev_software",
    categoryLabel: "Software & Development",
    role: "TIBCO Certified Professional",
    examCount: 2,
    description: "Enterprise service bus, messaging architectures, API integration, and Spotfire analytics.",
    vendorUrl: "https://www.tibco.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/tibco/",
    freeResources: [
      {
            "name": "Official TIBCO / Cloud Software Group Documentation & Blueprint",
            "url": "https://www.tibco.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from TIBCO / Cloud Software Group"
      },
      {
            "name": "TIBCO (BusinessWorks & Spotfire) Community Reference & Guides",
            "url": "https://www.tibco.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for TIBCO (BusinessWorks & Spotfire)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official TIBCO / Cloud Software Group blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for TIBCO (BusinessWorks & Spotfire) from TIBCO / Cloud Software Group: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for TIBCO (BusinessWorks & Spotfire) with official vendor TIBCO / Cloud Software Group, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for TIBCO (BusinessWorks & Spotfire)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass TIBCO (BusinessWorks & Spotfire) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for TIBCO (BusinessWorks & Spotfire) by TIBCO / Cloud Software Group with detailed answer rationales." }
    ]
  },
  {
    id: "uipath",
    name: "UiPath (Certified RPA Developer)",
    provider: "UiPath",
    category: "dev_software",
    categoryLabel: "Software & Development",
    role: "UiPath Certified Automation Developer",
    examCount: 15,
    description: "UiPath Studio, Robotic Enterprise Framework (REFramework), Orchestrator, and selectors.",
    vendorUrl: "https://www.uipath.com/learning/certification",
    examTopicsUrl: "https://www.examtopics.com/exams/uipath/",
    freeResources: [
      {
            "name": "Official UiPath Documentation & Blueprint",
            "url": "https://www.uipath.com/learning/certification",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from UiPath"
      },
      {
            "name": "UiPath (Certified RPA Developer) Community Reference & Guides",
            "url": "https://www.uipath.com/learning/certification",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for UiPath (Certified RPA Developer)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official UiPath blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for UiPath (Certified RPA Developer) from UiPath: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for UiPath (Certified RPA Developer) with official vendor UiPath, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for UiPath (Certified RPA Developer)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass UiPath (Certified RPA Developer) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for UiPath (Certified RPA Developer) by UiPath with detailed answer rationales." }
    ]
  },
  {
    id: "usgbc",
    name: "USGBC (LEED Green Associate & AP)",
    provider: "USGBC / GBCI",
    category: "trades",
    categoryLabel: "Skilled Trades & Engineering",
    role: "LEED AP Building Design + Construction",
    examCount: 1,
    description: "Green building rating systems, energy modeling, sustainable materials, and water efficiency.",
    vendorUrl: "https://www.usgbc.org/credentials",
    examTopicsUrl: "https://www.examtopics.com/exams/usgbc/",
    freeResources: [
      {
            "name": "Official USGBC / GBCI Documentation & Blueprint",
            "url": "https://www.usgbc.org/credentials",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from USGBC / GBCI"
      },
      {
            "name": "USGBC (LEED Green Associate & AP) Community Reference & Guides",
            "url": "https://www.usgbc.org/credentials",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for USGBC (LEED Green Associate & AP)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official USGBC / GBCI blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for USGBC (LEED Green Associate & AP) from USGBC / GBCI: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for USGBC (LEED Green Associate & AP) with official vendor USGBC / GBCI, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for USGBC (LEED Green Associate & AP)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass USGBC (LEED Green Associate & AP) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for USGBC (LEED Green Associate & AP) by USGBC / GBCI with detailed answer rationales." }
    ]
  },
  {
    id: "veeam",
    name: "Veeam (VMCE Certified Engineer)",
    provider: "Veeam Software",
    category: "cloud",
    categoryLabel: "Cloud & Infrastructure",
    role: "Veeam Certified Engineer (VMCE)",
    examCount: 4,
    description: "Veeam Backup & Replication, repository configuration, scale-out backup repos, and instant VM recovery.",
    vendorUrl: "https://www.veeam.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/veeam/",
    freeResources: [
      {
            "name": "Official Veeam Software Documentation & Blueprint",
            "url": "https://www.veeam.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Veeam Software"
      },
      {
            "name": "Veeam (VMCE Certified Engineer) Community Reference & Guides",
            "url": "https://www.veeam.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Veeam (VMCE Certified Engineer)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Veeam Software blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Veeam (VMCE Certified Engineer) from Veeam Software: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Veeam (VMCE Certified Engineer) with official vendor Veeam Software, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Veeam (VMCE Certified Engineer)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Veeam (VMCE Certified Engineer) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Veeam (VMCE Certified Engineer) by Veeam Software with detailed answer rationales." }
    ]
  },
  {
    id: "veritas",
    name: "Veritas (NetBackup Administration)",
    provider: "Veritas Technologies",
    category: "cloud",
    categoryLabel: "Cloud & Infrastructure",
    role: "Veritas Certified Specialist (NetBackup)",
    examCount: 13,
    description: "NetBackup master server architecture, media servers, storage lifecycles, and cloud tiering.",
    vendorUrl: "https://www.veritas.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/veritas/",
    freeResources: [
      {
            "name": "Official Veritas Technologies Documentation & Blueprint",
            "url": "https://www.veritas.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Veritas Technologies"
      },
      {
            "name": "Veritas (NetBackup Administration) Community Reference & Guides",
            "url": "https://www.veritas.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Veritas (NetBackup Administration)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Veritas Technologies blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Veritas (NetBackup Administration) from Veritas Technologies: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Veritas (NetBackup Administration) with official vendor Veritas Technologies, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Veritas (NetBackup Administration)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Veritas (NetBackup Administration) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Veritas (NetBackup Administration) by Veritas Technologies with detailed answer rationales." }
    ]
  },
  {
    id: "versa-networks",
    name: "Versa Networks (SD-WAN & SASE)",
    provider: "Versa Networks",
    category: "network",
    categoryLabel: "Networking & Telco",
    role: "Versa Certified SD-WAN Associate (VNX)",
    examCount: 3,
    description: "Software-defined WAN, Versa Director, multi-tenant VNF, and next-generation firewall routing.",
    vendorUrl: "https://versa-networks.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/versa-networks/",
    freeResources: [
      {
            "name": "Official Versa Networks Documentation & Blueprint",
            "url": "https://versa-networks.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Versa Networks"
      },
      {
            "name": "Versa Networks (SD-WAN & SASE) Community Reference & Guides",
            "url": "https://versa-networks.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Versa Networks (SD-WAN & SASE)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Versa Networks blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Versa Networks (SD-WAN & SASE) from Versa Networks: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Versa Networks (SD-WAN & SASE) with official vendor Versa Networks, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Versa Networks (SD-WAN & SASE)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Versa Networks (SD-WAN & SASE) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Versa Networks (SD-WAN & SASE) by Versa Networks with detailed answer rationales." }
    ]
  },
  {
    id: "vmedu",
    name: "VMEdu (Project & Quality Leadership)",
    provider: "VMEdu",
    category: "mgmt_business",
    categoryLabel: "Project & Management",
    role: "Certified Scrum / Project Specialist",
    examCount: 1,
    description: "Project management, sales marketing, and scrum credential verification tracks.",
    vendorUrl: "https://www.vmedu.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/vmedu/",
    freeResources: [
      {
            "name": "Official VMEdu Documentation & Blueprint",
            "url": "https://www.vmedu.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from VMEdu"
      },
      {
            "name": "VMEdu (Project & Quality Leadership) Community Reference & Guides",
            "url": "https://www.vmedu.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for VMEdu (Project & Quality Leadership)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official VMEdu blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for VMEdu (Project & Quality Leadership) from VMEdu: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for VMEdu (Project & Quality Leadership) with official vendor VMEdu, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for VMEdu (Project & Quality Leadership)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass VMEdu (Project & Quality Leadership) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for VMEdu (Project & Quality Leadership) by VMEdu with detailed answer rationales." }
    ]
  },
  {
    id: "watchguard",
    name: "WatchGuard (Network Security Essentials)",
    provider: "WatchGuard Technologies",
    category: "cyber",
    categoryLabel: "Cybersecurity",
    role: "WatchGuard Certified Network Security Admin",
    examCount: 2,
    description: "Fireware OS, branch office VPNs, Dimension reporting, and gateway antivirus policies.",
    vendorUrl: "https://www.watchguard.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/watchguard/",
    freeResources: [
      {
            "name": "Official WatchGuard Technologies Documentation & Blueprint",
            "url": "https://www.watchguard.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from WatchGuard Technologies"
      },
      {
            "name": "WatchGuard (Network Security Essentials) Community Reference & Guides",
            "url": "https://www.watchguard.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for WatchGuard (Network Security Essentials)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official WatchGuard Technologies blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for WatchGuard (Network Security Essentials) from WatchGuard Technologies: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for WatchGuard (Network Security Essentials) with official vendor WatchGuard Technologies, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for WatchGuard (Network Security Essentials)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass WatchGuard (Network Security Essentials) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for WatchGuard (Network Security Essentials) by WatchGuard Technologies with detailed answer rationales." }
    ]
  },
  {
    id: "wgu-university",
    name: "WGU University Assessments",
    provider: "Western Governors University",
    category: "mgmt_business",
    categoryLabel: "Project & Management",
    role: "Competency-Based Degree Candidate",
    examCount: 1,
    description: "Western Governors University competency-based assessments and collegiate certification tracks.",
    vendorUrl: "https://www.wgu.edu/",
    examTopicsUrl: "https://www.examtopics.com/exams/wgu-university/",
    freeResources: [
      {
            "name": "Official Western Governors University Documentation & Blueprint",
            "url": "https://www.wgu.edu/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Western Governors University"
      },
      {
            "name": "WGU University Assessments Community Reference & Guides",
            "url": "https://www.wgu.edu/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for WGU University Assessments"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Western Governors University blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for WGU University Assessments from Western Governors University: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for WGU University Assessments with official vendor Western Governors University, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for WGU University Assessments?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass WGU University Assessments on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for WGU University Assessments by Western Governors University with detailed answer rationales." }
    ]
  },
  {
    id: "wireshark",
    name: "Wireshark (WCNA Network Analyst)",
    provider: "Wireshark Foundation",
    category: "network",
    categoryLabel: "Networking & Telco",
    role: "Wireshark Certified Network Analyst (WCNA)",
    examCount: 1,
    description: "Packet capture analysis, TCP handshake analysis, latency troubleshooting, and protocol dissecting.",
    vendorUrl: "https://www.wiresharktraining.com/wcna.html",
    examTopicsUrl: "https://www.examtopics.com/exams/wireshark/",
    freeResources: [
      {
            "name": "Official Wireshark Foundation Documentation & Blueprint",
            "url": "https://www.wiresharktraining.com/wcna.html",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Wireshark Foundation"
      },
      {
            "name": "Wireshark (WCNA Network Analyst) Community Reference & Guides",
            "url": "https://www.wiresharktraining.com/wcna.html",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Wireshark (WCNA Network Analyst)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Wireshark Foundation blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Wireshark (WCNA Network Analyst) from Wireshark Foundation: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Wireshark (WCNA Network Analyst) with official vendor Wireshark Foundation, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Wireshark (WCNA Network Analyst)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Wireshark (WCNA Network Analyst) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Wireshark (WCNA Network Analyst) by Wireshark Foundation with detailed answer rationales." }
    ]
  },
  {
    id: "workday",
    name: "Workday (HCM & Financials Pro)",
    provider: "Workday",
    category: "mgmt_business",
    categoryLabel: "Project & Management",
    role: "Workday Pro HCM & Integration Specialist",
    examCount: 11,
    description: "Enterprise HCM business processes, custom report writer, calculated fields, and EIB integration.",
    vendorUrl: "https://www.workday.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/workday/",
    freeResources: [
      {
            "name": "Official Workday Documentation & Blueprint",
            "url": "https://www.workday.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Workday"
      },
      {
            "name": "Workday (HCM & Financials Pro) Community Reference & Guides",
            "url": "https://www.workday.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Workday (HCM & Financials Pro)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Workday blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Workday (HCM & Financials Pro) from Workday: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Workday (HCM & Financials Pro) with official vendor Workday, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Workday (HCM & Financials Pro)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Workday (HCM & Financials Pro) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Workday (HCM & Financials Pro) by Workday with detailed answer rationales." }
    ]
  },
  {
    id: "worldatwork",
    name: "WorldatWork (Compensation CCP)",
    provider: "WorldatWork",
    category: "mgmt_business",
    categoryLabel: "Project & Management",
    role: "Certified Compensation Professional (CCP)",
    examCount: 3,
    description: "Job analysis, salary surveys, executive compensation, sales incentives, and regulatory compliance.",
    vendorUrl: "https://www.worldatwork.org/",
    examTopicsUrl: "https://www.examtopics.com/exams/worldatwork/",
    freeResources: [
      {
            "name": "Official WorldatWork Documentation & Blueprint",
            "url": "https://www.worldatwork.org/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from WorldatWork"
      },
      {
            "name": "WorldatWork (Compensation CCP) Community Reference & Guides",
            "url": "https://www.worldatwork.org/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for WorldatWork (Compensation CCP)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official WorldatWork blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for WorldatWork (Compensation CCP) from WorldatWork: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for WorldatWork (Compensation CCP) with official vendor WorldatWork, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for WorldatWork (Compensation CCP)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass WorldatWork (Compensation CCP) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for WorldatWork (Compensation CCP) by WorldatWork with detailed answer rationales." }
    ]
  },
  {
    id: "zend",
    name: "Zend (Certified PHP Engineer)",
    provider: "Zend / Perforce",
    category: "dev_software",
    categoryLabel: "Software & Development",
    role: "Zend Certified PHP Engineer",
    examCount: 2,
    description: "PHP 8 syntax, object-oriented design, security best practices, and database manipulation.",
    vendorUrl: "https://www.zend.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/zend/",
    freeResources: [
      {
            "name": "Official Zend / Perforce Documentation & Blueprint",
            "url": "https://www.zend.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Zend / Perforce"
      },
      {
            "name": "Zend (Certified PHP Engineer) Community Reference & Guides",
            "url": "https://www.zend.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Zend (Certified PHP Engineer)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Zend / Perforce blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Zend (Certified PHP Engineer) from Zend / Perforce: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Zend (Certified PHP Engineer) with official vendor Zend / Perforce, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Zend (Certified PHP Engineer)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Zend (Certified PHP Engineer) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Zend (Certified PHP Engineer) by Zend / Perforce with detailed answer rationales." }
    ]
  },
  {
    id: "zscaler",
    name: "Zscaler (ZCCA, ZCCP Zero Trust)",
    provider: "Zscaler",
    category: "cyber",
    categoryLabel: "Cybersecurity",
    role: "Zscaler Certified Cloud Administrator (ZCCA)",
    examCount: 2,
    description: "Zero Trust Exchange, Zscaler Internet Access (ZIA), and Zscaler Private Access (ZPA) architecture.",
    vendorUrl: "https://www.zscaler.com/",
    examTopicsUrl: "https://www.examtopics.com/exams/zscaler/",
    freeResources: [
      {
            "name": "Official Zscaler Documentation & Blueprint",
            "url": "https://www.zscaler.com/",
            "type": "official_free",
            "description": "Official candidate guide, blueprint objectives, and exam syllabus from Zscaler"
      },
      {
            "name": "Zscaler (ZCCA, ZCCP Zero Trust) Community Reference & Guides",
            "url": "https://www.zscaler.com/",
            "type": "open_textbook",
            "description": "Structured study outlines, open whitepapers, and implementation guides"
      },
      {
            "name": "Open Video Learning & Architecture Walkthroughs",
            "url": "https://www.youtube.com/",
            "type": "video_course",
            "description": "High-yield video lectures and lab walkthroughs for Zscaler (ZCCA, ZCCP Zero Trust)"
      }
],
    howToPassTTP: {
      "tactics": "Structured 8-week review focusing on high-weight domains outlined in the official Zscaler blueprint. Complete at least 800+ scenario practice questions.",
      "techniques": "Process of elimination: identify whether question demands cost optimization, high availability, or strict compliance. Eliminate distractors with incorrect CLI flags or unsupported SKUs.",
      "procedures": "Score >=80% on 2 consecutive timed practice exams before scheduling test day. Review official documentation on unfamiliar exam domains."
},
    samplePrompts: [
      { label: "Exam Blueprint & Syllabus", prompt: "Provide a comprehensive syllabus and exam blueprint review for Zscaler (ZCCA, ZCCP Zero Trust) from Zscaler: topic weightings, passing score, and critical concepts." },
      { label: "Official Vendor Portal", prompt: "Where do I register for Zscaler (ZCCA, ZCCP Zero Trust) with official vendor Zscaler, and what are the prerequisites?" },
      { label: "Free Study Resources", prompt: "What free resources, documentation, and practice labs can I use to study for Zscaler (ZCCA, ZCCP Zero Trust)?" },
      { label: "How to Pass (TTPs)", prompt: "What are the key tactics, techniques, and procedures (TTPs) to pass Zscaler (ZCCA, ZCCP Zero Trust) on the first attempt?" },
      { label: "10-Q Practice Simulation", prompt: "Generate 10 realistic practice questions for Zscaler (ZCCA, ZCCP Zero Trust) by Zscaler with detailed answer rationales." }
    ]
  },
  // ==========================================
  // LAW & LEGAL PRACTICE EXAMINATIONS
  // ==========================================
  {
    id: "ube-bar",
    name: "Uniform Bar Examination (UBE - MBE, MEE, MPT)",
    provider: "National Conference of Bar Examiners (NCBE)",
    category: "law",
    categoryLabel: "Law & Legal Practice",
    role: "Licensed Attorney at Law / Counselor",
    examCount: 3,
    description: "Standardized bar examination adopted by 40+ US jurisdictions evaluating legal reasoning, common law doctrine, and practical lawyering skills.",
    vendorUrl: "https://www.ncbex.org/exams/ube/",
    popularExams: ["MBE (Multistate Bar Examination)", "MEE (Multistate Essay Examination)", "MPT (Multistate Performance Test)"],
    freeResources: [
      {
        name: "Official NCBE UBE Subject Matter Outlines",
        url: "https://www.ncbex.org/exams/ube/",
        type: "official_free",
        description: "Official scope and subject outlines for Constitutional Law, Contracts, Evidence, Real Property, Torts, and Civil Procedure"
      },
      {
        name: "Legal Information Institute (LII) - Cornell Law",
        url: "https://www.law.cornell.edu/",
        type: "textbook",
        description: "Comprehensive open-access federal statutes, uniform commercial code (UCC), and legal doctrine repository"
      },
      {
        name: "Oyez Supreme Court Audio & Case Database",
        url: "https://www.oyez.org/",
        type: "community",
        description: "Free multimedia archive of landmark Supreme Court oral arguments and constitutional case summaries"
      }
    ],
    howToPassTTP: {
      tactics: "Target 65%+ on the MBE (50% of total score). Complete 1,500+ licensed NCBE questions. Master high-frequency MEE topics: Civ Pro, Contracts, Torts, Evidence, Real Property, and Criminal Law.",
      techniques: "Use the IRAC method (Issue, Rule, Application, Conclusion) with clear headings. Pre-allocate 30 minutes strictly per essay. On MPT, spend 45 minutes reading the file/library and 45 minutes drafting.",
      procedures: "Follow a strict 10-week 400-hour study regimen. Complete two full timed 200-question MBE mock exams under test conditions before test week."
    },
    samplePrompts: [
      { label: "High-Yield UBE Blueprint", prompt: "Provide a comprehensive high-yield UBE study blueprint: MBE question breakdown, MEE high-frequency topics, and MPT time-management pacing." },
      { label: "5 MBE Practice Questions", prompt: "Generate 5 challenging MBE-style practice questions spanning Federal Civil Procedure, Evidence, and Real Property with detailed rule analysis." },
      { label: "MEE Essay IRAC Formula", prompt: "Explain the strict IRAC structural breakdown for scoring 5+ on an MEE Contracts and Sales essay question." }
    ]
  },
  {
    id: "california-bar",
    name: "California Bar Examination (CalBar)",
    provider: "State Bar of California",
    category: "law",
    categoryLabel: "Law & Legal Practice",
    role: "California Licensed Attorney at Law",
    examCount: 3,
    description: "Rigorous 2-day general bar exam consisting of 5 one-hour essay questions, one 90-minute California Performance Test (CPT), and the 200-question MBE.",
    vendorUrl: "https://www.calbar.ca.gov/Admissions/Examinations/California-Bar-Examination",
    popularExams: ["California Written Essays (5 Questions)", "California Performance Test (CPT)", "Multistate Bar Examination (MBE)"],
    freeResources: [
      {
        name: "California State Bar Past Exams & Model Answers",
        url: "https://www.calbar.ca.gov/Admissions/Examinations/California-Bar-Examination/Past-Exams",
        type: "official_free",
        description: "Official published questions and benchmark model passing answers from past administrations"
      },
      {
        name: "California Legislative Information & Codes",
        url: "https://leginfo.legislature.ca.gov/",
        type: "textbook",
        description: "Full text of California Evidence Code, Civil Procedure, Community Property, and Penal Code"
      }
    ],
    howToPassTTP: {
      tactics: "Write at least 60 full past California bar essays under timed conditions. Memorize California-specific distinctions for Evidence (CEC vs FRE) and Civil Procedure.",
      techniques: "Spot every minor sub-issue; California essays reward exhaustive issue-spotting and distinct rule headings. Pre-allocate 60 minutes strictly per essay.",
      procedures: "12-week study plan with at least 500 hours total preparation. Review top-scoring benchmark model answers published by the State Bar."
    },
    samplePrompts: [
      { label: "CalBar Essay Strategy", prompt: "What are the most frequent California-specific essay topics and distinctions tested on the California Bar Examination?" },
      { label: "California Evidence CEC vs FRE", prompt: "Compare the key distinctions between the California Evidence Code (CEC) and Federal Rules of Evidence (FRE) tested on CalBar." }
    ]
  },
  {
    id: "new-york-bar",
    name: "New York Bar Examination (NYBOLE - UBE & NYLE)",
    provider: "New York State Board of Law Examiners",
    category: "law",
    categoryLabel: "Law & Legal Practice",
    role: "New York State Licensed Attorney",
    examCount: 3,
    description: "Admission to the New York State Bar requiring passage of the Uniform Bar Exam (UBE), the New York Law Course (NYLC), and the New York Law Exam (NYLE).",
    vendorUrl: "https://www.nybarexam.org/",
    popularExams: ["Uniform Bar Examination (UBE - 266 Passing Score)", "New York Law Exam (NYLE - 50 Qs)", "New York Law Course (NYLC)"],
    freeResources: [
      {
        name: "NYBOLE Course Materials & NYLE Outlines",
        url: "https://www.nybarexam.org/nyle.html",
        type: "official_free",
        description: "Official comprehensive New York law course outline for NYLE preparation"
      },
      {
        name: "New York State Unified Court System Law Repository",
        url: "https://www.nycourts.gov/",
        type: "textbook",
        description: "New York Civil Practice Law and Rules (CPLR) and Court of Appeals case precedent"
      }
    ],
    howToPassTTP: {
      tactics: "Score >=266 on the UBE. Review the NYBOLE course materials thoroughly with indexed tabs for rapid open-book NYLE navigation.",
      techniques: "Time management: 50 NYLE questions in 120 minutes (2.4 minutes per question). Eliminate incorrect answers based on New York statutory thresholds.",
      procedures: "Complete the 17-hour NYLC video lectures, print and tab the 200-page NYLE outline, and take practice questions."
    },
    samplePrompts: [
      { label: "NYLE Preparation Guide", prompt: "Explain the format, registration rules, and high-yield topics for the New York Law Exam (NYLE) and NYLC." },
      { label: "NY CPLR High-Yield Rules", prompt: "Summarize the highest-yield New York Civil Practice Law and Rules (CPLR) concepts tested on the NYLE." }
    ]
  },
  {
    id: "mpre-ethics",
    name: "MPRE (Multistate Professional Responsibility Examination)",
    provider: "National Conference of Bar Examiners (NCBE)",
    category: "law",
    categoryLabel: "Law & Legal Practice",
    role: "Ethics-Certified Legal Practitioner",
    examCount: 1,
    description: "Two-hour, 60-question multiple-choice ethics examination measuring familiarity with the ABA Model Rules of Professional Conduct and Code of Judicial Conduct.",
    vendorUrl: "https://www.ncbex.org/exams/mpre/",
    popularExams: ["Client-Lawyer Relationship", "Conflicts of Interest", "Litigation & Advocacy Ethics", "Competence & Confidentiality"],
    freeResources: [
      {
        name: "ABA Model Rules of Professional Conduct",
        url: "https://www.americanbar.org/groups/professional_responsibility/publications/model_rules_of_professional_conduct/",
        type: "official_free",
        description: "Complete official text of the ABA Model Rules and official comments"
      },
      {
        name: "Official NCBE MPRE Subject Matter Outline",
        url: "https://www.ncbex.org/exams/mpre/",
        type: "official_free",
        description: "Official scope and percentage weighting across all professional responsibility topics"
      }
    ],
    howToPassTTP: {
      tactics: "Master Conflicts of Interest (Rules 1.7 - 1.10), which accounts for over 18% of exam questions. Distinguish between mandatory withdrawal and permissive withdrawal.",
      techniques: "Choose the answer choice that reflects the ABA Model Rule standard, not personal moral intuition or extreme punitive extremes.",
      procedures: "Dedicate 20-30 focused study hours over 2 weeks. Complete at least 200 practice questions and review full explanations."
    },
    samplePrompts: [
      { label: "MPRE High-Yield Conflicts", prompt: "Explain concurrent client conflicts (Rule 1.7) and former client conflicts (Rule 1.9) with screening requirements for the MPRE." },
      { label: "Mandatory vs Permissive Withdrawal", prompt: "When MUST an attorney withdraw from representation vs when MAY they withdraw under ABA Model Rule 1.16?" }
    ]
  },
  {
    id: "patent-bar",
    name: "USPTO Patent Bar (Registration Examination for Patent Practice)",
    provider: "United States Patent and Trademark Office (USPTO)",
    category: "law",
    categoryLabel: "Law & Legal Practice",
    role: "Registered Patent Attorney / Patent Agent",
    examCount: 1,
    description: "Specialized 100-question computer-delivered examination testing the Manual of Patent Examining Procedure (MPEP), 35 U.S.C., and 37 C.F.R.",
    vendorUrl: "https://www.uspto.gov/learning-and-resources/patent-and-trademark-practitioners/becoming-patent-practitioner",
    popularExams: ["35 U.S.C. 101/102/103 Patentability", "PCT International Applications", "Post-Grant Review & Reexamination", "Appeal & Interference Practice"],
    freeResources: [
      {
        name: "USPTO Manual of Patent Examining Procedure (MPEP Online)",
        url: "https://www.uspto.gov/web/offices/pac/mpep/",
        type: "official_free",
        description: "Complete searchable database of the MPEP used in the live electronic exam"
      },
      {
        name: "USPTO General Requirements Bulletin",
        url: "https://www.uspto.gov/",
        type: "official_free",
        description: "Official technical eligibility criteria (Category A, B, C degrees) and candidate handbook"
      }
    ],
    howToPassTTP: {
      tactics: "Master MPEP chapters 2100 (Patentability), 700 (Examination), 600 (Parts of Application), and 1200 (Appeals). Know 35 U.S.C. 102 AIA prior art exceptions inside-out.",
      techniques: "Electronic MPEP search speed is paramount. Practice searching exact regulatory phrases, statutory sections, and rule numbers in 60-90 seconds.",
      procedures: "150-200 study hours. Complete 600+ past USPTO exam questions and practice using the PDF search interface."
    },
    samplePrompts: [
      { label: "AIA 35 U.S.C. 102 Framework", prompt: "Explain the America Invents Act (AIA) 35 U.S.C. 102(a)(1), 102(a)(2), and 102(b) exceptions for the Patent Bar." },
      { label: "MPEP Chapters 2100 & 700", prompt: "Summarize the most heavily tested patent examination rules in MPEP Chapter 700 and 2100." }
    ]
  },
  {
    id: "sqe-uk",
    name: "SQE (Solicitors Qualifying Examination - UK)",
    provider: "Solicitors Regulation Authority (SRA)",
    category: "law",
    categoryLabel: "Law & Legal Practice",
    role: "Solicitor of the Senior Courts of England and Wales",
    examCount: 2,
    description: "Centralized national assessment for qualifying as a solicitor in England and Wales: Functioning Legal Knowledge (SQE1) and practical legal skills (SQE2).",
    vendorUrl: "https://sqe.sra.org.uk/",
    popularExams: ["SQE1: FLK1 (Business Law, Dispute Resolution, Contract, Tort, Legal System)", "SQE1: FLK2 (Property Practice, Wills, Criminal Law, Solicitors Accounts)", "SQE2: Client Interviewing, Advocacy, Legal Research, Drafting"],
    freeResources: [
      {
        name: "SRA Official SQE Assessment Specifications & Sample Questions",
        url: "https://sqe.sra.org.uk/",
        type: "official_free",
        description: "Official candidate blueprint, FLK domain syllabus, and licensed multiple-choice sample questions"
      },
      {
        name: "UK Legislation & Case Law Archive",
        url: "https://www.legislation.gov.uk/",
        type: "textbook",
        description: "Official United Kingdom statutory repository and judgment database"
      }
    ],
    howToPassTTP: {
      tactics: "FLK1 and FLK2 require high-speed application of substantive English law across 360 multiple-choice questions (1.7 minutes/question).",
      techniques: "Single best answer technique: identify the specific rule of English common law or statute before reading the distractors. Memorize Solicitors Accounts Rules.",
      procedures: "15-20 weeks of intensive study (300-400 hours). Complete at least 2,000 FLK questions and timed mock exams."
    },
    samplePrompts: [
      { label: "SQE1 FLK High-Yield Breakdown", prompt: "Break down the core legal domains tested in SQE1 FLK1 and FLK2 with passing thresholds and sample question style." },
      { label: "SQE2 Practical Skills Mastery", prompt: "What are the assessment criteria for SQE2 client interviewing, legal drafting, and oral advocacy?" }
    ]
  },
  {
    id: "uk-barrister-bpc",
    name: "BPC (Bar Practice Course & Centralized Bar Exams - UK)",
    provider: "Bar Standards Board (BSB)",
    category: "law",
    categoryLabel: "Law & Legal Practice",
    role: "Barrister of England and Wales / Court Advocate",
    examCount: 2,
    description: "Vocational bar qualification testing Civil Litigation and Evidence, Criminal Litigation and Sentencing, and Professional Ethics for court advocacy rights.",
    vendorUrl: "https://www.barstandardsboard.org.uk/",
    popularExams: ["BSB Civil Litigation & Dispute Resolution", "BSB Criminal Litigation, Evidence & Sentencing", "Oral Advocacy & Examination-in-Chief"],
    freeResources: [
      {
        name: "Bar Standards Board Candidate Syllabi",
        url: "https://www.barstandardsboard.org.uk/",
        type: "official_free",
        description: "Official centralized assessment outlines for civil litigation and criminal procedure"
      },
      {
        name: "Crown Prosecution Service (CPS) Legal Guidance",
        url: "https://www.cps.gov.uk/legal-guidance",
        type: "textbook",
        description: "Comprehensive guidance on criminal offenses, charging standards, and sentencing guidelines"
      }
    ],
    howToPassTTP: {
      tactics: "Master the White Book (Civil Procedure Rules) and Blackstone's Criminal Practice. Memorize strict time limits, disclosure rules, and hearsay exceptions.",
      techniques: "In ethics scenarios, always prioritize the court's administration of justice over client instructions (Core Duty 1 overrides Core Duty 2).",
      procedures: "Follow the structured BPC timetable, practice drafting statements of case under timed conditions, and conduct mock witness examinations."
    },
    samplePrompts: [
      { label: "BSB Civil Litigation Rules", prompt: "Explain Part 36 offers, summary judgment standards, and CPR disclosure rules for the BSB Civil Litigation exam." }
    ]
  },
  {
    id: "nca-canada",
    name: "NCA (National Committee on Accreditation - Canada)",
    provider: "Federation of Law Societies of Canada (FLSC)",
    category: "law",
    categoryLabel: "Law & Legal Practice",
    role: "Canadian Barrister & Solicitor Candidate",
    examCount: 5,
    description: "Mandatory accreditation examinations for internationally trained law graduates assessing 5 core Canadian substantive legal subjects.",
    vendorUrl: "https://nca.legal/",
    popularExams: ["Canadian Constitutional Law", "Canadian Administrative Law", "Canadian Criminal Law", "Foundations of Canadian Law", "Canadian Professional Responsibility"],
    freeResources: [
      {
        name: "NCA Official Exam Syllabi & Guidelines",
        url: "https://nca.legal/",
        type: "official_free",
        description: "Official reading lists, learning objectives, and candidate rules for all mandatory subjects"
      },
      {
        name: "CanLII (Canadian Legal Information Institute)",
        url: "https://www.canlii.org/",
        type: "textbook",
        description: "Free full-text access to Supreme Court of Canada judgments, provincial statutes, and regulations"
      }
    ],
    howToPassTTP: {
      tactics: "Exams are open-book, 3-hour essay formats. Prepare well-indexed summary notes and decision trees for rapid issue retrieval.",
      techniques: "In Administrative Law, apply the Vavilov standard of review framework rigorously. In Constitutional Law, master the Section 1 Oakes test.",
      procedures: "Review 3-5 years of past NCA exams, write full outline responses, and verify against CanLII precedent."
    },
    samplePrompts: [
      { label: "Vavilov Standard of Review", prompt: "Explain how to apply the Supreme Court of Canada Vavilov framework for administrative reasonableness review on an NCA exam." }
    ]
  },
  {
    id: "lsat",
    name: "LSAT (Law School Admission Test)",
    provider: "Law School Admission Council (LSAC)",
    category: "law",
    categoryLabel: "Law & Legal Practice",
    role: "Juris Doctor (JD) Law School Candidate",
    examCount: 1,
    description: "Premier standardized examination evaluating logical reasoning, reading comprehension, and analytical argument evaluation for law school admissions.",
    vendorUrl: "https://www.lsac.org/lsat",
    popularExams: ["Logical Reasoning (Flaws, Assumptions, Inferences)", "Reading Comprehension (Comparative & Single Passages)", "LSAT Writing"],
    freeResources: [
      {
        name: "Khan Academy Official LSAT Prep",
        url: "https://www.khanacademy.org/prep/lsat",
        type: "official_free",
        description: "Free official full-length practice tests, diagnostic tools, and step-by-step video lessons in partnership with LSAC"
      },
      {
        name: "LSAC LawHub Free Practice Material",
        url: "https://www.lsac.org/lawhub",
        type: "practice_bank",
        description: "Official digital testing interface with free authentic practice exams"
      }
    ],
    howToPassTTP: {
      tactics: "Target 165+ for top law schools. Identify argument flaws immediately (necessary vs sufficient confusion, correlation vs causation, scope shift).",
      techniques: "Read actively: identify the author's main conclusion, underlying premises, and unstated assumptions before looking at options. Prephrase answers.",
      procedures: "12-16 week study plan. Complete at least 25 full-length timed PrepTests under strict digital exam conditions."
    },
    samplePrompts: [
      { label: "Logical Reasoning Flaws", prompt: "Explain the top 10 most common logical reasoning fallacies tested on the LSAT with concrete examples." },
      { label: "Reading Comprehension Strategy", prompt: "What are the most effective strategies for breaking down difficult LSAT comparative reading passages?" }
    ]
  },
  {
    id: "nala-cp",
    name: "NALA Certified Paralegal (CP & Advanced CP)",
    provider: "NALA - The Paralegal Association",
    category: "law",
    categoryLabel: "Law & Legal Practice",
    role: "Certified Paralegal (CP) / Advanced Certified Paralegal",
    examCount: 2,
    description: "Nationally accredited paralegal certification evaluating legal research, writing, civil litigation, contracts, torts, and professional ethics.",
    vendorUrl: "https://nala.org/certification/",
    popularExams: ["Knowledge Exam (Federal Law, Procedure, Ethics)", "Skills Exam (Written Legal Memorandum & Analysis)", "Advanced Certified Paralegal (ACP Specialties)"],
    freeResources: [
      {
        name: "NALA Candidate Information Handbook",
        url: "https://nala.org/certification/",
        type: "official_free",
        description: "Official blueprint, exam domains, eligibility rules, and recertification guidelines"
      },
      {
        name: "Legal Information Institute (LII)",
        url: "https://www.law.cornell.edu/",
        type: "textbook",
        description: "Open legal repository for federal civil procedure and evidence rules"
      }
    ],
    howToPassTTP: {
      tactics: "Pass the Knowledge Exam before taking the Skills Exam. Review the Federal Rules of Civil Procedure (FRCP) and ABA Model Rules for paralegals.",
      techniques: "On the Skills Exam, write a concise, professional legal memorandum using standard FIRAC or IRAC format with objective legal tone.",
      procedures: "8-12 weeks study. Complete mock practice tests and practice drafting interoffice legal memoranda within the 2-hour limit."
    },
    samplePrompts: [
      { label: "NALA CP Knowledge Exam Blueprint", prompt: "What subjects and percentage weights are covered on the NALA Certified Paralegal Knowledge Exam?" }
    ]
  },
  {
    id: "aceds-ceds",
    name: "CEDS (Certified E-Discovery Specialist)",
    provider: "Association of Certified E-Discovery Specialists (ACEDS)",
    category: "law",
    categoryLabel: "Law & Legal Practice",
    role: "E-Discovery Specialist / Legal Technology Counsel",
    examCount: 1,
    description: "Industry-standard certification spanning the Electronic Discovery Reference Model (EDRM), litigation holds, preservation, search analytics, and Fed. R. Civ. P.",
    vendorUrl: "https://aceds.org/",
    popularExams: ["EDRM Lifecycle & Litigation Holds", "Data Collection & Forensics", "Search Analytics & Technology-Assisted Review (TAR)", "Production & Privilege Logs"],
    freeResources: [
      {
        name: "EDRM Official Framework & Resources",
        url: "https://edrm.net/",
        type: "official_free",
        description: "Official Electronic Discovery Reference Model standards, diagram, and whitepapers"
      },
      {
        name: "The Sedona Conference Publications",
        url: "https://thesedonaconference.org/",
        type: "textbook",
        description: "Non-partisan legal principles on electronic document management and proportionality in discovery"
      }
    ],
    howToPassTTP: {
      tactics: "Master FRCP Rules 26(b)(1) proportionality, 37(e) spoliation sanctions, and 34 production requests. Understand native vs TIFF/PDF production formats.",
      techniques: "Distinguish between keyword search syntax, conceptual indexing, and Technology-Assisted Review (continuous active learning).",
      procedures: "40-60 study hours. Review the ACEDS study manual, master EDRM stage handoffs, and complete practice simulations."
    },
    samplePrompts: [
      { label: "FRCP Rule 37(e) Spoliation", prompt: "Explain the requirements for spoliation sanctions under Federal Rule of Civil Procedure 37(e) for E-Discovery." }
    ]
  },
  {
    id: "ccep-compliance",
    name: "CCEP (Certified Compliance & Ethics Professional)",
    provider: "Compliance Certification Board (CCB & SCCE)",
    category: "law",
    categoryLabel: "Law & Legal Practice",
    role: "Chief Compliance Officer / Corporate Legal Counsel",
    examCount: 1,
    description: "Professional certification assessing corporate compliance governance, internal investigations, DOJ evaluation metrics, and whistleblower programs.",
    vendorUrl: "https://www.corporatecompliance.org/",
    popularExams: ["Standards, Policies & Procedures", "Compliance Governance & Oversight", "Auditing & Monitoring", "Investigations, Remediation & Discipline"],
    freeResources: [
      {
        name: "U.S. Department of Justice Evaluation of Corporate Compliance Programs",
        url: "https://www.justice.gov/criminal-fraud/page/file/937501/dl",
        type: "official_free",
        description: "Official federal benchmark document for evaluating corporate compliance effectiveness"
      },
      {
        name: "SCCE Candidate Handbook",
        url: "https://www.corporatecompliance.org/",
        type: "official_free",
        description: "Official blueprint, exam domains, and ethics standards for compliance professionals"
      }
    ],
    howToPassTTP: {
      tactics: "Study the 7 Federal Sentencing Guidelines elements for an effective compliance program. Emphasize risk assessment and continuous auditing.",
      techniques: "In investigation questions, ensure attorney-client privilege protection, prompt remediation, and non-retaliation policies.",
      procedures: "50-70 hours study. Review the DOJ Criminal Division compliance evaluation criteria and complete practice questions."
    },
    samplePrompts: [
      { label: "7 Elements of Effective Compliance", prompt: "Explain the 7 essential elements of an effective compliance and ethics program under the U.S. Federal Sentencing Guidelines." }
    ]
  },
  {
    id: "iapp-cipp-us",
    name: "CIPP/US (Certified Information Privacy Professional - US Law)",
    provider: "International Association of Privacy Professionals (IAPP)",
    category: "law",
    categoryLabel: "Law & Legal Practice",
    role: "Privacy Attorney / Data Protection Officer (DPO)",
    examCount: 1,
    description: "Premier legal credential in US private-sector privacy law, FTC Section 5 enforcement, HIPAA, GLBA, FCRA, and state privacy statutes (CCPA/CPRA).",
    vendorUrl: "https://iapp.org/certify/cippus/",
    popularExams: ["U.S. Privacy Environment & FTC Enforcement", "Health & Financial Privacy (HIPAA / GLBA)", "Workplace Privacy & Surveillance", "State Comprehensive Privacy Laws (CCPA / CPRA)"],
    freeResources: [
      {
        name: "IAPP CIPP/US Examination Blueprint & Body of Knowledge",
        url: "https://iapp.org/certify/cippus/",
        type: "official_free",
        description: "Official domain competencies, topic percentage weightings, and candidate guide"
      },
      {
        name: "FTC Privacy & Security Enforcement Actions",
        url: "https://www.ftc.gov/news-events/topics/protecting-consumer-privacy-security",
        type: "textbook",
        description: "Official FTC consent decrees, Section 5 unfair/deceptive practices enforcement history"
      }
    ],
    howToPassTTP: {
      tactics: "State comprehensive privacy laws (CCPA/CPRA) and FTC Section 5 represent the highest-yield domains. Master consumer rights (opt-out of sale/share, deletion).",
      techniques: "Differentiate between opt-in vs opt-out requirements across statutes (e.g. COPPA requires verifiable parental consent; GLBA requires opt-out notice).",
      procedures: "60-80 hours study. Read the official IAPP textbook, memorize statutory acronyms and enforcement bodies, and complete practice exams."
    },
    samplePrompts: [
      { label: "CCPA vs CPRA Key Differences", prompt: "What are the major enhancements introduced by the CPRA to California consumer privacy law (sensitive data, audit requirements)?" }
    ]
  },
  {
    id: "florida-bar",
    name: "Florida Bar Examination",
    provider: "Florida Board of Bar Examiners",
    category: "law",
    categoryLabel: "Law & Legal Practice",
    role: "Florida Licensed Attorney at Law",
    examCount: 2,
    description: "Two-day examination consisting of Part A (3 Florida essay questions and 100 Florida multiple-choice questions) and Part B (the 200-question MBE).",
    vendorUrl: "https://www.floridabarexam.org/",
    popularExams: ["Part A: Florida Essays & Florida Multiple Choice", "Part B: Multistate Bar Examination (MBE)"],
    freeResources: [
      {
        name: "Florida Board of Bar Examiners Study Guides & Past Exams",
        url: "https://www.floridabarexam.org/",
        type: "official_free",
        description: "Official past exam essay questions and benchmark sample answers"
      }
    ],
    howToPassTTP: {
      tactics: "Master Florida-specific distinctions: Florida Homestead exemption, Florida Constitutional Law, Florida Civil Procedure, and Florida Rules of Professional Conduct.",
      techniques: "Florida multiple-choice questions test precise statutory rules (e.g. Wills, Trusts, Business Entities, Florida Criminal Law). Memorize exact deadlines and execution formalities.",
      procedures: "10-12 weeks study (400-500 hours). Write at least 40 timed Florida essays and 800+ Florida multiple-choice practice questions."
    },
    samplePrompts: [
      { label: "Florida Homestead Exemption", prompt: "Explain the Florida Constitution Homestead protection against forced sale, acreage limitations, and devise restrictions." }
    ]
  },
  {
    id: "texas-bar",
    name: "Texas Bar Examination (BLE Texas)",
    provider: "Texas Board of Law Examiners",
    category: "law",
    categoryLabel: "Law & Legal Practice",
    role: "Texas Licensed Attorney at Law",
    examCount: 2,
    description: "Administration of the Uniform Bar Exam (UBE) with Texas-specific Law Component (TLC) governing licensure for trial advocacy and energy practice.",
    vendorUrl: "https://ble.texas.gov/",
    popularExams: ["Uniform Bar Examination (UBE - 270 Passing Score)", "Texas Law Component (TLC Online Course)"],
    freeResources: [
      {
        name: "Texas Board of Law Examiners Candidate Information",
        url: "https://ble.texas.gov/",
        type: "official_free",
        description: "Official candidate handbook, scoring standards, and TLC requirements"
      }
    ],
    howToPassTTP: {
      tactics: "Texas requires a 270 score on the UBE. Focus heavily on MBE scoring efficiency (target >=140 scaled MBE score).",
      techniques: "Complete the Texas Law Component (TLC) modular outline carefully. The TLC is an online course covering Texas-specific criminal, civil, oil & gas, and family law.",
      procedures: "Follow standard UBE 10-week preparation, complete 1,500+ practice questions, and complete TLC before swearing in."
    },
    samplePrompts: [
      { label: "Texas Bar Admission Requirements", prompt: "What are the passing score thresholds, character and fitness rules, and TLC requirements for admission to the State Bar of Texas?" }
    ]
  },

];

/**
 * Searches exams by query string and optional category filter
 */
export function searchBoardExams(query: string, categoryFilter?: string): BoardExam[] {
  const q = query.trim().toLowerCase();
  
  return BOARD_EXAMS.filter((exam) => {
    // Category match
    if (categoryFilter && categoryFilter !== "all") {
      if (categoryFilter === "health_all") {
        if (!exam.category.startsWith("health_")) return false;
      } else if (exam.category !== categoryFilter) {
        return false;
      }
    }

    if (!q) return true;

    // Text match
    const inName = exam.name.toLowerCase().includes(q);
    const inProvider = exam.provider.toLowerCase().includes(q);
    const inRole = exam.role.toLowerCase().includes(q);
    const inDesc = exam.description.toLowerCase().includes(q);
    const inPopular = exam.popularExams?.some((e) => e.toLowerCase().includes(q)) ?? false;

    return inName || inProvider || inRole || inDesc || inPopular;
  });
}

/**
 * Returns the next three logical exams or credentials for career progression
 */
export function getNextThreeExams(exam: BoardExam): NextStep[] {
  if (exam.nextThree && exam.nextThree.length >= 3) {
    return exam.nextThree.slice(0, 3);
  }

  // Deduce next 3 logical steps based on category & exam id
  switch (exam.category) {
    case "health_doctor":
      if (exam.id === "usmle") {
        return [
          {
            name: "USMLE Step 3 & State Licensure",
            provider: "FSMB & NBME",
            role: "Independent Licensed Attending Physician",
            why: "Final step in the USMLE series required for unrestricted clinical practice and state medical board licensing.",
          },
          {
            name: "Specialty Board Certification (ABMS / ABIM / ABS)",
            provider: "American Board of Medical Specialties",
            role: "Board-Certified Medical Specialist",
            why: "Demonstrates comprehensive clinical mastery in your designated medical or surgical specialty post-residency.",
          },
          {
            name: "Subspecialty Fellowship & CAQ (e.g. Cardiology / Critical Care)",
            provider: "Accredited Specialty Board",
            role: "Subspecialist / Fellowship Director",
            why: "Deep specialization in tertiary clinical subspecialties, advanced procedural interventions, and department leadership.",
          },
        ];
      }
      return [
        {
          name: "Subspecialty Fellowship Certification",
          provider: exam.provider || "ABMS Member Board",
          role: "Advanced Subspecialty Attending",
          why: "Elevates clinical credentials to tertiary referral care and complex patient management in specialized domains.",
        },
        {
          name: "State Unrestricted Medical Licensure & DEA Renewal",
          provider: "State Medical Licensing Board",
          role: "Licensed Practitioner",
          why: "Maintains full legal authority for prescriptive practice and hospital staff privileges.",
        },
        {
          name: "Clinical Department Leadership / Fellowship Director",
          provider: "ACGME / Hospital Medical Executive Committee",
          role: "Chief Medical Officer / Division Chief",
          why: "Transition into hospital system governance, clinical quality oversight, and medical education leadership.",
        },
      ];

    case "health_nurse":
      return [
        {
          name: "AACN CCRN / CEN Specialty Certification",
          provider: "American Association of Critical-Care Nurses",
          role: "Critical Care / Emergency Certified RN",
          why: "Validates advanced bedside critical thinking, hemodynamics, and resuscitation protocols.",
        },
        {
          name: "ANCC Nurse Practitioner (FNP-BC / AGACNP / PMHNP)",
          provider: "American Nurses Credentialing Center",
          role: "Advanced Practice Registered Nurse (APRN / NP)",
          why: "Grants diagnostic, prescriptive, and autonomous patient care authority across inpatient and outpatient clinics.",
        },
        {
          name: "Doctor of Nursing Practice (DNP) or CRNA (NBCRNA)",
          provider: "Council on Accreditation / NBCRNA",
          role: "Clinical Director / Nurse Anesthetist",
          why: "Peak clinical practice tier in nursing with exceptional autonomy, procedural leadership, and highest compensation.",
        },
      ];

    case "health_pharmacy":
      return [
        {
          name: "MPJE (Multistate Pharmacy Jurisprudence Examination)",
          provider: "NABP",
          role: "Licensed Pharmacist (RPh)",
          why: "Mandatory state-specific federal and state pharmacy law credential required for dispensing and clinical practice.",
        },
        {
          name: "BPS Board Certified Pharmacotherapy Specialist (BCPS)",
          provider: "Board of Pharmacy Specialties",
          role: "Clinical Specialist Pharmacist",
          why: "Premier benchmark for clinical rounding, drug regimen review, and therapeutic drug monitoring in acute hospitals.",
        },
        {
          name: "BPS Oncology (BCOP) or Ambulatory Care (BCACP)",
          provider: "Board of Pharmacy Specialties",
          role: "Advanced Oncology / Ambulatory Pharmacy Lead",
          why: "High-acuity outpatient and clinical oncology specialization managing complex biologic and immunotherapy protocols.",
        },
      ];


    case "law":
      if (exam.id === "lsat") {
        return [
          {
            name: "Juris Doctor (JD) Degree & Law Review",
            provider: "ABA-Accredited Law School",
            role: "JD Candidate / Judicial Intern",
            why: "Primary professional doctorate degree required for admission to the bar in almost all US jurisdictions.",
          },
          {
            name: "MPRE (Multistate Professional Responsibility Exam)",
            provider: "National Conference of Bar Examiners (NCBE)",
            role: "Ethics-Certified Bar Candidate",
            why: "Mandatory professional ethics prerequisite taken during 2L/3L year prior to bar admission.",
          },
          {
            name: "Uniform Bar Examination (UBE / State Bar Exam)",
            provider: "NCBE & State Board of Law Examiners",
            role: "Licensed Attorney at Law",
            why: "Comprehensive multi-component exam granting licensure to represent clients and appear in court.",
          },
        ];
      }
      if (exam.id === "patent-bar") {
        return [
          {
            name: "State Bar Examination Licensure",
            provider: "State Board of Law Examiners",
            role: "Dual Licensed Patent Attorney",
            why: "Expands patent prosecution practice to full federal litigation, IP licensing, and courtroom advocacy.",
          },
          {
            name: "PTAB Oral Advocacy & Reexamination Specialist",
            provider: "USPTO & Federal Circuit Bar Association",
            role: "Lead PTAB Trial Counsel",
            why: "Specialized representation in Inter Partes Review (IPR) and Post-Grant Review (PGR) proceedings.",
          },
          {
            name: "U.S. Court of Appeals for the Federal Circuit (CAFC) Bar",
            provider: "Federal Judiciary",
            role: "Appellate Patent Litigator",
            why: "Direct appellate practice reviewing decisions of the USPTO and federal district courts nationwide.",
          },
        ];
      }
      if (exam.id === "sqe-uk") {
        return [
          {
            name: "Two Years Qualifying Work Experience (QWE)",
            provider: "Solicitors Regulation Authority (SRA)",
            role: "Trainee / Qualified Solicitor",
            why: "Mandatory practice requirement across at least two legal disciplines to gain admission to the roll.",
          },
          {
            name: "Higher Rights of Audience (Solicitor Advocate)",
            provider: "SRA / Senior Courts of England and Wales",
            role: "Solicitor Advocate (Civil & Criminal)",
            why: "Grants equal rights of audience alongside barristers in the Crown Court, High Court, Court of Appeal, and Supreme Court.",
          },
          {
            name: "Law Firm Partner & Compliance Officer (COLP/COFA)",
            provider: "SRA Regulatory Framework",
            role: "Partner / Compliance Officer for Legal Practice",
            why: "Senior equity partnership and regulatory leadership directing firm governance and risk management.",
          },
        ];
      }
      return [
        {
          name: "Federal District & Circuit Court Bar Admission",
          provider: "U.S. Federal Courts & Circuit Court of Appeals",
          role: "Federal Trial & Appellate Litigator",
          why: "Expands courtroom authority to federal civil rights, commercial disputes, and constitutional litigation.",
        },
        {
          name: "State Bar Board Certification in Legal Specialty",
          provider: "State Bar Board of Legal Specialization / ABA",
          role: "Board-Certified Legal Specialist (Trial, Tax, IP, Criminal)",
          why: "Recognized apex standard of competence, peer review, and ethics in a focused area of legal practice.",
        },
        {
          name: "Managing Partner / General Counsel / Judiciary Appointment",
          provider: "Judicial Nominating Commission / Corporate Board",
          role: "Managing Partner / General Counsel / Judge",
          why: "Transition to senior organizational governance, chief legal officer directorship, or the bench.",
        },
      ];


    case "law":
      if (exam.id === "lsat") {
        return [
          {
            name: "Juris Doctor (JD) Degree & Law Review",
            provider: "ABA-Accredited Law School",
            role: "JD Candidate / Judicial Intern",
            why: "Primary professional doctorate degree required for admission to the bar in almost all US jurisdictions.",
          },
          {
            name: "MPRE (Multistate Professional Responsibility Exam)",
            provider: "National Conference of Bar Examiners (NCBE)",
            role: "Ethics-Certified Bar Candidate",
            why: "Mandatory professional ethics prerequisite taken during 2L/3L year prior to bar admission.",
          },
          {
            name: "Uniform Bar Examination (UBE / State Bar Exam)",
            provider: "NCBE & State Board of Law Examiners",
            role: "Licensed Attorney at Law",
            why: "Comprehensive multi-component exam granting licensure to represent clients and appear in court.",
          },
        ];
      }
      if (exam.id === "patent-bar") {
        return [
          {
            name: "State Bar Examination Licensure",
            provider: "State Board of Law Examiners",
            role: "Dual Licensed Patent Attorney",
            why: "Expands patent prosecution practice to full federal litigation, IP licensing, and courtroom advocacy.",
          },
          {
            name: "PTAB Oral Advocacy & Reexamination Specialist",
            provider: "USPTO & Federal Circuit Bar Association",
            role: "Lead PTAB Trial Counsel",
            why: "Specialized representation in Inter Partes Review (IPR) and Post-Grant Review (PGR) proceedings.",
          },
          {
            name: "U.S. Court of Appeals for the Federal Circuit (CAFC) Bar",
            provider: "Federal Judiciary",
            role: "Appellate Patent Litigator",
            why: "Direct appellate practice reviewing decisions of the USPTO and federal district courts nationwide.",
          },
        ];
      }
      if (exam.id === "sqe-uk") {
        return [
          {
            name: "Two Years Qualifying Work Experience (QWE)",
            provider: "Solicitors Regulation Authority (SRA)",
            role: "Trainee / Qualified Solicitor",
            why: "Mandatory practice requirement across at least two legal disciplines to gain admission to the roll.",
          },
          {
            name: "Higher Rights of Audience (Solicitor Advocate)",
            provider: "SRA / Senior Courts of England and Wales",
            role: "Solicitor Advocate (Civil & Criminal)",
            why: "Grants equal rights of audience alongside barristers in the Crown Court, High Court, Court of Appeal, and Supreme Court.",
          },
          {
            name: "Law Firm Partner & Compliance Officer (COLP/COFA)",
            provider: "SRA Regulatory Framework",
            role: "Partner / Compliance Officer for Legal Practice",
            why: "Senior equity partnership and regulatory leadership directing firm governance and risk management.",
          },
        ];
      }
      return [
        {
          name: "Federal District & Circuit Court Bar Admission",
          provider: "U.S. Federal Courts & Circuit Court of Appeals",
          role: "Federal Trial & Appellate Litigator",
          why: "Expands courtroom authority to federal civil rights, commercial disputes, and constitutional litigation.",
        },
        {
          name: "State Bar Board Certification in Legal Specialty",
          provider: "State Bar Board of Legal Specialization / ABA",
          role: "Board-Certified Legal Specialist (Trial, Tax, IP, Criminal)",
          why: "Recognized apex standard of competence, peer review, and ethics in a focused area of legal practice.",
        },
        {
          name: "Managing Partner / General Counsel / Judiciary Appointment",
          provider: "Judicial Nominating Commission / Corporate Board",
          role: "Managing Partner / General Counsel / Judge",
          why: "Transition to senior organizational governance, chief legal officer directorship, or the bench.",
        },
      ];

    case "health_allied":
      return [
        {
          name: "Advanced Modality Credential (ARRT CT/MRI or ARDMS Vascular)",
          provider: exam.provider || "Allied Health Credentialing Body",
          role: "Senior Advanced Diagnostic Technologist",
          why: "Expands imaging/diagnostic competencies into multi-slice CT, 3T MRI, or neurovascular diagnostics.",
        },
        {
          name: "Healthcare Quality & Compliance Specialist (CPHQ)",
          provider: "National Association for Healthcare Quality",
          role: "Clinical Quality & Accreditation Lead",
          why: "Oversees Joint Commission readiness, diagnostic quality assurance, and patient safety compliance.",
        },
        {
          name: "Diagnostic Services Department Manager",
          provider: "American College of Healthcare Executives",
          role: "Clinical Laboratory / Imaging Operations Director",
          why: "Direct operations, capital equipment budgeting, and staffing across hospital diagnostic departments.",
        },
      ];

    case "cloud":
      return [
        {
          name: "Solutions Architect Professional (AWS / Azure / GCP)",
          provider: exam.provider || "Major Cloud Provider",
          role: "Principal Cloud Architect",
          why: "Advanced multi-region high availability, enterprise disaster recovery, and hybrid infrastructure governance.",
        },
        {
          name: "Certified Kubernetes Administrator (CKA / CKS)",
          provider: "Cloud Native Computing Foundation & Linux Foundation",
          role: "Cloud-Native Infrastructure & Security Engineer",
          why: "Industry-standard container orchestration, pod security admission, and cluster hardening mastery.",
        },
        {
          name: "FinOps Certified Practitioner & Cloud Security Architect",
          provider: "FinOps Foundation & (ISC)2 (CCSP)",
          role: "Enterprise Cloud Governance Director",
          why: "Optimizes multi-million cloud spend, compliance posture, and zero trust identity federation.",
        },
      ];

    case "cyber":
      return [
        {
          name: "CISSP (Certified Information Systems Security Professional)",
          provider: "(ISC)2",
          role: "Chief Information Security Officer / Security Architect",
          why: "Gold standard credential covering all 8 security domains, enterprise risk, and security governance.",
        },
        {
          name: "CISM / CRISC (Security Management & Risk)",
          provider: "ISACA",
          role: "Director of Information Security & Risk",
          why: "Bridges technical security controls with executive board risk mitigation and business alignment.",
        },
        {
          name: "Offensive Security Certified Professional (OSCP) or GSE",
          provider: "OffSec / GIAC",
          role: "Lead Penetration Tester / Principal Red Teamer",
          why: "Hands-on adversarial exploit development, active directory compromise, and offensive operations.",
        },
      ];

    case "network":
      return [
        {
          name: "CCNP Enterprise / Service Provider Core & Concentration",
          provider: "Cisco Systems",
          role: "Senior Network Engineer",
          why: "Deep dual-stack routing (BGP, OSPF), SD-WAN, VXLAN EVPN, and enterprise campus architecture.",
        },
        {
          name: "CCIE Enterprise Infrastructure (Written + 8-hr Lab)",
          provider: "Cisco Systems",
          role: "Principal Network Architect / Fellow",
          why: "Apex networking credential demonstrating world-class design, troubleshooting, and optimization under pressure.",
        },
        {
          name: "Cisco DevNet Professional / Network Automation Lead",
          provider: "Cisco Systems",
          role: "Network Automation & NetDevOps Lead",
          why: "Programmatic infrastructure management via Python, Ansible, Terraform, and RESTCONF/NETCONF APIs.",
        },
      ];

    case "data_ai":
      return [
        {
          name: "Databricks Certified Data Engineer Professional",
          provider: "Databricks",
          role: "Staff Data Engineer / Lakehouse Architect",
          why: "Production Delta Lake optimization, streaming architectures, and distributed Apache Spark performance tuning.",
        },
        {
          name: "Snowflake SnowPro Advanced Architect",
          provider: "Snowflake",
          role: "Enterprise Data Warehouse Architect",
          why: "Multi-cluster warehouse partitioning, data mesh architectures, and cross-cloud secure data sharing.",
        },
        {
          name: "Generative AI Systems & Large Language Model Architect",
          provider: "NVIDIA / DeepLearning.AI",
          role: "Lead AI Engineer / MLOps Architect",
          why: "Fine-tuning foundational models, vector search RAG pipelines, and low-latency inference serving.",
        },
      ];

    case "mgmt_business":
      return [
        {
          name: "PMI-PMP (Project Management Professional)",
          provider: "Project Management Institute",
          role: "Senior Project Manager / Program Manager",
          why: "Globally recognized standard for predictive, agile, and hybrid lifecycle execution.",
        },
        {
          name: "PMI-ACP / Scaled Agile Framework (SAFe Practice Consultant)",
          provider: "Project Management Institute & Scaled Agile",
          role: "Agile Coach / Enterprise Transformation Lead",
          why: "Scaling agile methodologies across multi-team release trains and large product organizations.",
        },
        {
          name: "PgMP (Program Management Professional)",
          provider: "Project Management Institute",
          role: "Portfolio Director / Chief of Staff",
          why: "Strategic alignment of interrelated project portfolios with organizational ROI and corporate targets.",
        },
      ];

    case "finance":
      return [
        {
          name: "CFA Level II / Level III (Chartered Financial Analyst)",
          provider: "CFA Institute",
          role: "Portfolio Manager / Senior Equity Analyst",
          why: "Rigorous valuation, asset pricing, quantitative methods, and institutional portfolio management.",
        },
        {
          name: "CAMS (Certified Anti-Money Laundering Specialist)",
          provider: "ACAMS",
          role: "Head of Financial Crimes & AML Compliance",
          why: "International standard for financial intelligence, sanctions screening, and regulatory enforcement.",
        },
        {
          name: "FRM (Financial Risk Manager)",
          provider: "Global Association of Risk Professionals (GARP)",
          role: "Market Risk & Credit Risk Director",
          why: "Specialized quantification of market risk, Basel regulatory capital requirements, and counterparty stress testing.",
        },
      ];

    default:
      return [
        {
          name: `Advanced Specialist Track in ${exam.name}`,
          provider: exam.provider,
          role: `Senior ${exam.role}`,
          why: "Validates high-complexity troubleshooting, enterprise architectural patterns, and production reliability.",
        },
        {
          name: "Enterprise Architecture & System Engineering",
          provider: "International Standards Body",
          role: "Lead Systems Architect",
          why: "Bridges multi-disciplinary competencies, compliance, and enterprise scalability.",
        },
        {
          name: "Executive Leadership & Practice Direction",
          provider: "Executive Credentialing Council",
          role: "Director of Practice / Department Head",
          why: "Focuses on strategic direction, organizational governance, and high-impact decision making.",
        },
      ];
  }
}

/**
 * Returns a 12-week structured master study roadmap for the exam
 */
export function getExamRoadmap(exam: BoardExam): RoadmapPhase[] {
  if (exam.roadmap && exam.roadmap.length >= 4) {
    return exam.roadmap;
  }

  return [
    {
      phase: "Phase 1: Blueprint Foundations & Core Domain Syllabus",
      timeframe: "Weeks 1 - 4",
      objective: `Master the official candidate handbook and syllabus domains established by ${exam.provider}.`,
      weeklyTarget: "15-20 hours/week (2-3 hours daily) systematically reviewing primary textbook chapters and lecture notes.",
      benchmark: "Complete diagnostic baseline exam; aim for >=55-60% raw diagnostic score to map domain weaknesses.",
    },
    {
      phase: "Phase 2: High-Yield Question Bank Application & Spaced Recall",
      timeframe: "Weeks 5 - 8",
      objective: "Active recall immersion: complete 800-1,200 board-style vignette practice questions in timed blocks.",
      weeklyTarget: "20-25 hours/week. Dedicate 50% of time to thorough review of rationales for both correct answers and distractors.",
      benchmark: "Achieve >=70% rolling average on un-seen practice question sets.",
    },
    {
      phase: "Phase 3: Timed Full-Length Simulations & Targeted Remediation",
      timeframe: "Weeks 9 - 11",
      objective: "Simulate exact test-day conditions with 2-3 full-length timed mock exams to calibrate cognitive pacing.",
      weeklyTarget: "20 hours/week focusing specifically on bottom-quartile syllabus topics identified in mock reports.",
      benchmark: "Score >=80-85% on 2 consecutive full-length practice exams with zero time overrun.",
    },
    {
      phase: "Phase 4: High-Yield Consolidation, Taper & Exam Day Protocol",
      timeframe: "Week 12",
      objective: "Consolidate critical high-yield formulas, algorithms, and key mnemonics. Taper cognitive workload 48 hours prior.",
      weeklyTarget: "8-10 hours light review; ensure full sleep hygiene; verify identification and testing center logistics.",
      benchmark: "100% operational readiness: test center confirmation, permitted IDs, and confidence calibration.",
    },
  ];
}
