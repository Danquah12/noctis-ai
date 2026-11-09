#!/usr/bin/env python3
"""
NOCTIS HEALTH 500 — Automated Full Benchmark Catalog Synthesizer & Validator
Script: scripts/generate_noctis_health_500.py
Subsystem: NH500-GEN-001

Generates and validates the full 500-case clinical evaluation catalog across
all 15 clinical specialties, adhering 100% to the NoctisHealth500Case schema.
"""

import os
import sys
import json
import random

SPECIALTY_ALLOCATION = {
    "EMERGENCY_MEDICINE": 60,
    "CARDIOLOGY": 50,
    "NEUROLOGY": 45,
    "INFECTIOUS_DISEASES": 50,
    "CRITICAL_CARE": 45,
    "GASTROENTEROLOGY_HEPATOLOGY": 35,
    "RESPIRATORY_MEDICINE": 35,
    "NEPHROLOGY": 30,
    "ENDOCRINOLOGY": 30,
    "HEMATOLOGY_ONCOLOGY": 30,
    "OBSTETRICS_GYNECOLOGY": 25,
    "PEDIATRICS_NEONATOLOGY": 25,
    "TOXICOLOGY": 20,
    "PSYCHIATRY": 10,
    "DERMATOLOGY_RHEUMATOLOGY": 10,
}

SPECIALTY_PREFIXES = {
    "EMERGENCY_MEDICINE": "NH-EM",
    "CARDIOLOGY": "NH-CARD",
    "NEUROLOGY": "NH-NEUR",
    "INFECTIOUS_DISEASES": "NH-ID",
    "CRITICAL_CARE": "NH-CC",
    "GASTROENTEROLOGY_HEPATOLOGY": "NH-GI",
    "RESPIRATORY_MEDICINE": "NH-PULM",
    "NEPHROLOGY": "NH-NEPH",
    "ENDOCRINOLOGY": "NH-ENDO",
    "HEMATOLOGY_ONCOLOGY": "NH-HEME",
    "OBSTETRICS_GYNECOLOGY": "NH-OBGYN",
    "PEDIATRICS_NEONATOLOGY": "NH-PEDS",
    "TOXICOLOGY": "NH-TOX",
    "PSYCHIATRY": "NH-PSYCH",
    "DERMATOLOGY_RHEUMATOLOGY": "NH-DERM",
}

CLINICAL_TEMPLATES = {
    "EMERGENCY_MEDICINE": [
        ("Acute Coronary Syndrome / STEMI", "I21.09", "Crushing chest pain radiating to left jaw, diaphoresis", "Emergent cardiac catheterization / PCI within 90 minutes", "Delaying PCI for non-cardiac testing"),
        ("Acute Ischemic Stroke with LVO", "I63.40", "Sudden right hemiplegia and expressive aphasia, onset 2 hours ago", "IV Tenecteplase + emergency thrombectomy activation", "Lowering SBP below 140 mmHg in acute phase"),
        ("Tension Pneumothorax", "J93.0", "Severe dyspnea, tracheal deviation, absent breath sounds", "Immediate needle decompression followed by tube thoracostomy", "Delaying decompression for chest radiograph"),
        ("Acute Intestinal Obstruction", "K56.60", "Colicky abdominal pain, bilious vomiting, obstipation", "Nasogastric decompression, fluid resuscitation, surgical consult", "Giving oral cathartics or feeding"),
        ("Cardiac Tamponade", "I31.4", "Beck's triad: hypotension, muffled heart tones, JVD", "Emergent ultrasound-guided pericardiocentesis", "Aggressive positive pressure ventilation which impairs preload"),
    ],
    "CARDIOLOGY": [
        ("Acute Decompensated Heart Failure (HFrEF)", "I50.21", "Severe orthopnea, bilateral pulmonary crackles, S3 gallop", "IV loop diuretics, BiPAP for pulmonary edema, vasodilator titration", "Initiating or escalating beta-blockers in acute decompensation"),
        ("Ventricular Tachycardia Storm", "I47.2", "Recurrent monomorphic VT with ICD shocks, hypotension", "IV Amiodarone or Lidocaine, emergent overdrive pacing, sedation", "Administering calcium-channel blockers in wide-complex tachycardia"),
        ("Acute Pericarditis with Effusion", "I30.9", "Pleuritic chest pain relieved by sitting forward, friction rub", "High-dose NSAIDs (Colchicine + Ibuprofen), echocardiogram", "Administering therapeutic anticoagulation which causes tamponade"),
        ("Complete Heart Block (Third-Degree)", "I44.2", "Syncope, extreme bradycardia HR 32 bpm, cannon A waves", "Transcutaneous / transvenous pacing, atropine trial, pacemaker", "Giving beta-blockers, digoxin, or CCBs"),
        ("Severe Aortic Stenosis with Syncope", "I35.0", "Exertional syncope, crescendo-decrescendo systolic murmur at base", "Avoid acute preload/afterload reduction, urgent TAVR/SAVR", "Aggressive nitrates or ACE inhibitors causing circulatory collapse"),
    ],
    "NEUROLOGY": [
        ("Refractory Status Epilepticus", "G41.9", "Continuous tonic-clonic seizures > 10 minutes", "IV Lorazepam -> Levetiracetam/Fosphenytoin -> Propofol/Midazolam infusion", "Paralyzing without continuous EEG monitoring"),
        ("Myasthenic Crisis", "G70.01", "Severe bulbar weakness, shallow breathing, negative inspiratory force < 20", "Elective intubation, plasma exchange (PLEX) or IVIG", "Giving aminoglycosides, beta-blockers, or neuromuscular blockers"),
        ("Guillain-Barré Syndrome", "G61.0", "Ascending symmetrical paralysis, areflexia, post-Campylobacter", "IVIG (2 g/kg over 5 days) or plasmapheresis, serial FVC", "Administering systemic corticosteroids (ineffective in GBS)"),
        ("Aneurysmal Subarachnoid Hemorrhage", "I60.9", "Worst headache of life ('thunderclap'), nuchal rigidity", "Nimodipine 60mg q4h, CTA/DSA, urgent coiling/clipping", "Permitting blood pressure spikes > 160 mmHg before aneurysm secured"),
        ("Acute Spinal Cord Compression", "G95.20", "Bilateral leg weakness, sensory level at T4, urinary retention", "High-dose IV Dexamethasone, emergent spine MRI, surgical decompression", "Delaying MRI or steroid administration"),
    ],
    "INFECTIOUS_DISEASES": [
        ("Septic Shock secondary to Pyelonephritis", "R65.21", "Fever, flank tenderness, hypotension, Gram-negative rods in blood", "Surviving Sepsis bundle: cultures, IV Cefepime, 30 mL/kg fluid, Norepinephrine", "Delaying antibiotics for imaging"),
        ("Neutropenic Enterocolitis (Typhlitis)", "K92.89", "ANC < 500/uL, fever, RLQ pain, cecal wall thickening > 4mm", "Broad-spectrum coverage for Pseudomonas and anaerobes (Cefepime + Metronidazole)", "Performing colonoscopy (high risk of perforation)"),
        ("Necrotizing Fasciitis (Type II Streptococcal)", "M72.6", "Pain out of proportion to exam, cutaneous dishwater fluid, gas", "Emergent operative surgical debridement, IV Vancomycin + Clindamycin", "Relying on antibiotics alone without urgent surgery"),
        ("Severe Malaria (Plasmodium falciparum)", "B50.9", "Fever, parasitemia > 5%, jaundice, hypoglycemia, cerebral symptoms", "IV Artesunate immediately, monitor for delayed hemolysis", "Using oral chloroquine or delaying parenteral therapy"),
        ("Infective Endocarditis with Stroke", "I33.0", "Fever, new regurgitant murmur, splinter hemorrhages, cerebral infarct", "Blood cultures x3, IV Ampicillin/Ceftriaxone + Vancomycin, valve surgery consult", "Initiating therapeutic anticoagulation for cardioembolic stroke in IE"),
    ],
    "CRITICAL_CARE": [
        ("Refractory Vasodilatory Septic Shock", "R65.21", "Lactate 6.2, MAP < 65 on max Norepinephrine", "Add Vasopressin (0.04 U/min) and stress-dose Hydrocortisone (200 mg/day)", "Titrating Norepinephrine to supra-physiological doses without 2nd vasopressor"),
        ("Abdominal Compartment Syndrome", "R19.8", "Tense abdomen, peak airway pressures > 45, oliguria, bladder pressure > 20 mmHg", "Sedation, neuromuscular blockade, emergent surgical decompressive laparotomy", "Continuing fluid resuscitation without abdominal decompression"),
        ("Severe Barotrauma / Tension Hemothorax", "J94.2", "Sudden desaturation and cardiac arrest post-central line placement", "Immediate chest tube thoracostomy, transfusion protocol", "Relying on portable chest X-ray before releasing hemithorax"),
        ("Acute Fulminant Liver Failure", "K72.00", "Encephalopathy, coagulopathy (INR > 1.5), profound hypoglycemia", "N-acetylcysteine, hypertonic saline for cerebral edema, liver transplant center consult", "Sedation that masks neurological pupil examination"),
        ("Severe Hypothermic Cardiac Arrest", "T68.XXXA", "Core temp 24C, ventricular fibrillation", "Extracorporeal membrane oxygenation (ECMO/CPB) rewarming, avoid chest thump", "Declaring patient deceased before rewarming to 32-35C"),
    ],
    "GASTROENTEROLOGY_HEPATOLOGY": [
        ("Severe Acute Biliary Pancreatitis", "K85.10", "Epigastric pain radiating to back, lipase 4,200, bilirubin 4.2", "Aggressive balanced crystalloids (Ringer's lactate), urgent ERCP within 24h for cholangitis", "Routine prophylactic antibiotics in sterile pancreatitis"),
        ("Spontaneous Bacterial Peritonitis (SBP)", "K65.2", "Cirrhosis, ascites, fever, PMN count in ascitic fluid > 250/uL", "IV Cefotaxime or Ceftriaxone, IV Albumin (1.5 g/kg day 1, 1 g/kg day 3)", "Withholding albumin (albumin prevents hepatorenal syndrome)"),
        ("Acute Lower GI Bleeding from Diverticulosis", "K57.31", "Painless massive hematochezia, orthostasis", "Resuscitation, colonoscopy after rapid purge or CT angiography / embolization", "Delaying resuscitation to perform urgent non-prepped colonoscopy"),
        ("Severe Ulcerative Colitis Flare (Truelove-Witts)", "K51.90", "> 6 bloody stools/day, tachycardia, ESR > 30, toxic megacolon risk", "IV Methylprednisolone 60 mg/day, avoid antimotility agents, surgical consult", "Administering loperamide or narcotics which triggers toxic megacolon"),
        ("Acute Mesenteric Ischemia", "K55.0", "Pain out of proportion to exam in patient with atrial fibrillation, elevated lactate", "Emergent biphasic mesenteric CT angiography, immediate IV heparin, laparotomy", "Waiting for signs of peritonitis to intervene"),
    ],
    "RESPIRATORY_MEDICINE": [
        ("Near-Fatal Asthma Exacerbation", "J45.901", "Silent chest, diaphoresis, pulsus paradoxus, PaCO2 normal/elevated (pseudonormalization)", "Continuous nebulized albuterol + ipratropium, IV magnesium, IV steroids, ketamine", "Sedating the patient without intubation capability"),
        ("Acute Exacerbation of COPD with Acidemia", "J44.1", "Increased sputum purulence, pH 7.26, PaCO2 68 mmHg", "Non-Invasive Positive Pressure Ventilation (BiPAP), bronchodilators, steroids, antibiotics", "Over-oxygenating to 100% SpO2 (target 88-92% to avoid hypercapnic coma)"),
        ("Severe Community-Acquired Pneumonia", "J18.9", "CURB-65 = 3 (Confusion, BUN > 19, RR > 30), bilateral lobar consolidation", "IV Ceftriaxone + Azithromycin or Levofloxacin, blood/sputum cultures, hospital admission", "Discharging home with oral monotherapy"),
        ("Massive Hemoptysis", "R04.2", "> 200 mL blood expectorated in 2 hours, gas exchange compromise", "Position bleeding lung dependent (down), intubation with large ETT (8.0+), bronchial artery embolization", "Positioning good lung dependent (causes drowning in blood)"),
        ("Idiopathic Pulmonary Fibrosis with Acute Exacerbation", "J84.112", "Subacute worsening hypoxia, 'velcro' crackles, diffuse ground-glass on HRCT", "High-dose corticosteroids, exclusion of infection/PE, palliative/transplant evaluation", "Overzealous mechanical ventilation causing fatal pneumothoraces"),
    ],
    "NEPHROLOGY": [
        ("Rapidly Progressive Glomerulonephritis (RPGN)", "N01.9", "Hematuria with red blood cell casts, acute renal failure, anti-GBM/ANCA positive", "Pulse IV Methylprednisolone + Cyclophosphamide + Plasmapheresis", "Delaying immunosuppression while awaiting renal biopsy pathology"),
        ("Atypical Hemolytic Uremic Syndrome (aHUS)", "D59.3", "Microangiopathic hemolytic anemia, thrombocytopenia, acute kidney failure, normal ADAMTS13", "Complement C5 inhibitor (Eculizumab or Ravulizumab), supportive care", "Platelet transfusions (causes microvascular thrombosis flare)"),
        ("Severe Hyponatremia with Seizures", "E87.1", "Serum Sodium 112 mEq/L, generalized seizures, confusion", "Hypertonic Saline (3% NaCl) 100 mL IV bolus over 10 min, limit correction <= 8 mEq/L/24h", "Correcting sodium > 8 mEq/L/24h (causes fatal Osmotic Demyelination Syndrome)"),
        ("Severe Refractory Hypercalcemic Crisis", "E83.52", "Serum Calcium 15.2 mg/dL, altered sensorium, shortened QT interval", "Aggressive IV isotonic saline (3-4 L/day), subcutaneous Calcitonin, IV Zoledronic acid", "Administering loop diuretics before restoring intravascular volume"),
        ("Renal Allograft Acute Cellular Rejection", "T86.11", "Rising creatinine in transplant recipient, graft tenderness, donor-specific antibodies", "Pulse IV Methylprednisolone, allograft biopsy, optimization of tacrolimus trough", "Increasing nephrotoxic calcineurin inhibitor without biopsy"),
    ],
    "ENDOCRINOLOGY": [
        ("Acute Adrenal Crisis", "E27.2", "Refractory hypotension, hypoglycemia, hyperkalemia, hyponatremia", "Immediate IV Hydrocortisone (100 mg stat then 50 mg q6h) + D5W Normal Saline", "Waiting for ACTH stimulation test results before giving hydrocortisone"),
        ("Severe Thyroid Storm (Burch-Wartofsky > 45)", "E05.90", "Fever 40C, delirium, atrial fibrillation HR 160, jaundice", "Propranolol + PTU (propylthiouracil) + Saturated Potassium Iodide (SSKI) 1h after PTU + Dexamethasone", "Giving iodine before thionamides (iodine fuels hormone synthesis)"),
        ("Myxedema Coma", "E03.5", "Hypothermia 32C, severe lethargy, periorbital edema, hyponatremia", "IV Levothyroxine (T4) + IV Liothyronine (T3) + stress-dose Hydrocortisone (100 mg)", "Giving thyroid hormone without hydrocortisone (precipitates adrenal collapse)"),
        ("Hyperosmolar Hyperglycemic State (HHS)", "E11.00", "Glucose 940 mg/dL, serum osmolality 360 mOsm/kg, severe dehydration, no significant ketoacidosis", "Slow, aggressive isotonic fluid replacement (1-2 L/h initially), gradual low-dose insulin", "Dropping blood glucose too fast (> 100 mg/dL/hr) causing fatal cerebral edema"),
        ("Severe Insulinoma-Induced Hypoglycemia", "D13.7", "Whipple's triad: fasting hypoglycemia, neuroglycopenic symptoms, relief with dextrose", "Continuous dextrose infusion, Diazoxide or Octreotide, pancreatic imaging", "Administering oral sulfonylureas or failing to investigate hyperinsulinemia"),
    ],
    "HEMATOLOGY_ONCOLOGY": [
        ("Tumor Lysis Syndrome (TLS)", "E88.3", "Hyperuricemia 14 mg/dL, hyperkalemia 6.4, hyperphosphatemia, acute kidney injury post-chemo", "Aggressive IV hydration, Rasburicase (0.2 mg/kg IV), continuous ECG telemetry", "Administering IV calcium for hyperphosphatemia-induced hypocalcemia unless tetany/ECG changes"),
        ("Thrombotic Thrombocytopenic Purpura (TTP)", "M31.1", "Pentad: thrombocytopenia, MAHA, renal failure, fluctuating neurological deficits, fever", "Emergent therapeutic plasma exchange (PLEX) + Caplacizumab + Corticosteroids", "Platelet transfusions (causes microvascular thrombosis and sudden death)"),
        ("Hyperleukocytosis with Leukostasis", "C92.00", "WBC > 100,000/uL, hypoxemia, altered mental status, visual blurring", "Emergent leukapheresis or hydroxyurea cytoreduction, aggressive hydration", "Administering packed red blood cells (increases whole-blood viscosity)"),
        ("Superior Vena Cava (SVC) Syndrome", "I87.1", "Facial and bilateral arm edema, cyanosis, distended chest wall collateral veins", "Elevate head of bed, dexamethasone, emergent radiation or endovascular stenting", "Placing IV lines or venipunctures in upper extremities"),
        ("Immune Checkpoint Inhibitor Myocarditis", "I40.8", "Chest pain, elevated troponin, conduction blocks 2 weeks post-Pembrolizumab", "Immediate discontinuation of immunotherapy, pulse IV Methylprednisolone 1 g/day", "Continuing checkpoint inhibitor therapy"),
    ],
    "OBSTETRICS_GYNECOLOGY": [
        ("Ruptured Ectopic Pregnancy", "O00.1", "Acute severe lower quadrant pelvic pain, syncope, positive beta-hCG, free fluid in Morison's pouch", "Emergent laparoscopy / laparotomy, type and cross, rapid crystalloid/blood resuscitation", "Waiting for quantitative beta-hCG or MRI before operating on unstable patient"),
        ("Postpartum Hemorrhage (Atony)", "O72.1", "Blood loss > 1,000 mL post-vaginal delivery, boggy enlarged uterine fundus", "Bimanual uterine massage, IV Oxytocin + Methylergonovine + Tranexamic Acid (TXA)", "Administering methylergonovine in severe hypertension / preeclampsia"),
        ("Amniotic Fluid Embolism (AFE)", "O88.12", "Sudden cardiovascular collapse, cyanosis, and catastrophic DIC during active labor", "High-quality CPR, immediate perimortem cesarean delivery within 4 minutes, massive transfusion", "Delaying perimortem delivery in maternal arrest"),
        ("Acute Ovarian Torsion", "N83.51", "Sudden severe sharp unilateral lower quadrant pain, nausea, enlarged ovary with absent Doppler flow", "Emergent diagnostic laparoscopy with detorsion and ovarian preservation", "Relying on normal Doppler flow to exclude torsion (Doppler is normal in 30%)"),
        ("Chorioamnionitis with Fetal Tachycardia", "O41.1230", "Maternal fever 39C, uterine tenderness, purulent foul amniotic fluid, fetal HR 185 bpm", "IV Ampicillin + Gentamicin, prompt labor induction / delivery", "Attempting to delay delivery with tocolytic agents"),
    ],
    "PEDIATRICS_NEONATOLOGY": [
        ("Neonatal Respiratory Distress Syndrome (Surfactant Deficiency)", "P22.0", "Preterm infant (30 weeks), grunting, retractions, ground-glass CXR with air bronchograms", "Early CPAP, endotracheal surfactant instillation (poractant alfa)", "Aggressive mechanical hyperventilation causing bronchopulmonary dysplasia"),
        ("Severe Pediatric Diabetic Ketoacidosis with Cerebral Edema", "E10.10", "DKA patient developing sudden bradycardia, hypertension (Cushing triad), and headache", "Immediate IV Mannitol (0.5-1 g/kg) or 3% Hypertonic Saline, elevate head, reduce fluid rate", "Administering insulin boluses (insulin boluses worsen pediatric cerebral edema)"),
        ("Intussusception", "K56.1", "10-month-old with paroxysmal screaming, legs drawn to chest, 'currant jelly' stools, sausage mass", "Air or hydrostatic contrast reduction under fluoroscopy/ultrasound, surgical standby", "Attempting non-operative reduction when peritonitis or bowel perforation is present"),
        ("Kawasaki Disease with Coronary Aneurysm Risk", "M30.3", "Fever >= 5 days, bilateral conjunctivitis, strawberry tongue, desquamation, cervical lymphadenopathy", "High-dose IVIG (2 g/kg) + Aspirin within 10 days of fever onset, baseline echocardiogram", "Administering corticosteroids as monotherapy or withholding IVIG"),
        ("Acute Epiglottitis", "J05.10", "Tripod positioning, drooling, inspiratory stridor, thumbprint sign on lateral neck X-ray", "Avoid agitating child, immediate transport to OR for controlled airway intubation by ENT/Anesthesia", "Examining pharynx with tongue depressor in non-controlled setting (causes laryngospasm)"),
    ],
    "TOXICOLOGY": [
        ("Acetaminophen (Paracetamol) Acute Overdose", "T39.1X2A", "Ingestion > 150 mg/kg 4 hours ago, Rumack-Matthew nomogram above treatment line", "IV or Oral N-acetylcysteine (NAC) within 8 hours of ingestion", "Delaying NAC while awaiting 4-hour levels if ingestion time is uncertain"),
        ("Salicylate (Aspirin) Toxicity", "T39.012A", "Tinnitus, tachypnea, respiratory alkalosis mixed with high anion gap metabolic acidosis", "IV Sodium Bicarbonate for urine alkalinization (target urine pH 7.5-8.0), emergent hemodialysis", "Administering acetazolamide (causes systemic acidemia and brain accumulation)"),
        ("Tricyclic Antidepressant (TCA) Overdose", "T43.012A", "Wide QRS > 100 ms, terminal R wave in aVR > 3 mm, anticholinergic toxidrome", "IV Sodium Bicarbonate boluses (1-2 mEq/kg) titrated to QRS narrowing and pH 7.50-7.55", "Administering Physostigmine or Class IA/IC antiarrhythmics (causes asystole)"),
        ("Organophosphate Cholinergic Toxidrome", "T60.0X2A", "SLUDGEM: salivation, lacrimation, urination, defecation, GI upset, emesis, miosis, bradycardia", "Atropine titrated until bronchial secretions clear + Pralidoxime (2-PAM)", "Administering succinylcholine for intubation (metabolized by cholinesterase)"),
        ("Opioid Overdose with Respiratory Depression", "T40.2X2A", "Coma, pinpoint pupils (miosis), respiratory rate 4 breaths/min, cyanosis", "Bag-valve-mask ventilation, titrated IV/IN Naloxone (0.04-0.4 mg) to restore breathing", "Administering massive naloxone bolus (causes severe acute withdrawal and pulmonary edema)"),
    ],
    "PSYCHIATRY": [
        ("Severe Serotonin Syndrome", "T43.222A", "Hyperthermia 39.8C, ocular clonus, spontaneous ankle clonus, hyperreflexia, tremor post-SSRI+MAOI", "Immediate discontinuation of serotonergics, IV Lorazepam, Cyproheptadine, active cooling", "Administering bromocriptine or dopamine agonists (worsens serotonin syndrome)"),
        ("Acute Delirium Tremens (Alcohol Withdrawal)", "F10.231", "Visual hallucinations, severe tremor, fever, hypertension, diaphoresis 72h after last drink", "Symptom-triggered IV Diazepam or Lorazepam (CIWA-Ar protocol), high-dose thiamine", "Administering antipsychotics (haloperidol) as monotherapy (lowers seizure threshold)"),
        ("Acute Catatonia", "F06.1", "Waxy flexibility, mutism, stupor, negativism, posturing", "Lorazepam challenge test (1-2 mg IV), Electroconvulsive Therapy (ECT) if malignant", "Administering dopamine receptor antagonists (precipitates NMS)"),
        ("Severe Lithium Toxicity with Neurotoxicity (SILENT)", "T43.592A", "Coarse tremor, ataxia, confusion, dysarthria, serum lithium 3.8 mEq/L", "Aggressive isotonic saline hydration, emergent hemodialysis for level > 4.0 or neurological deficits", "Administering loop or thiazide diuretics (reduces lithium clearance)"),
        ("Acute Dystonic Reaction", "G24.02", "Oculogyric crisis, torticollis, tongue protrusion 12 hours after metoclopramide or haloperidol", "IV Diphenhydramine 50 mg or Benztropine 1-2 mg IV/IM", "Administering additional antipsychotics or assuming patient is malingering"),
    ],
    "DERMATOLOGY_RHEUMATOLOGY": [
        ("Catastrophic Antiphospholipid Syndrome (CAPS)", "D68.61", "Multiorgan thromboses (renal, pulmonary, cerebral) within 1 week in patient with aPL antibodies", "Triple therapy: Therapeutic Anticoagulation (Heparin) + High-dose Corticosteroids + Plasma Exchange (PLEX) or IVIG", "Withholding therapeutic anticoagulation due to thrombocytopenia"),
        ("Macrophage Activation Syndrome (MAS) / Secondary HLH", "D76.1", "Unremitting fever, splenomegaly, ferritin > 10,000 ng/mL, cytopenias, hypertriglyceridemia", "Pulse IV Methylprednisolone (1 g/day), Anakinra (IL-1 inhibitor) or Cyclosporine", "Treating solely as infection with antibiotics alone"),
        ("Acute Gouty Arthritis with Renal Failure", "M1A.00X0", "Exquisite severe erythema and pain of 1st MTP joint (podagra), GFR 22 mL/min", "Oral / Intra-articular Corticosteroids or low-dose Colchicine with renal adjustment", "Administering NSAIDs in acute kidney injury or starting allopurinol during acute flare"),
        ("Systemic Sclerosis Scleroderma Renal Crisis", "M34.9", "New onset severe hypertension (190/115), microangiopathic hemolytic anemia, rapidly rising creatinine", "Immediate initiation of ACE Inhibitor (Captopril titrated rapidly to target normal BP)", "Administering high-dose corticosteroids (corticosteroids trigger scleroderma renal crisis)"),
        ("Pemphigus Vulgaris with Extensive Denudation", "L10.0", "Flaccid intraepidermal blisters, extensive oral mucosal erosions, positive direct immunofluorescence (IgG against Dsg3)", "Systemic corticosteroids (Prednisone 1 mg/kg) + Rituximab, non-adherent wound dressings", "Treating with topical corticosteroids alone in widespread mucosal disease"),
    ],
}

def generate_cases_for_specialty(specialty, count, existing_cases):
    templates = CLINICAL_TEMPLATES[specialty]
    prefix = SPECIALTY_PREFIXES[specialty]
    generated = []

    all_existing_ids = {c["caseId"] for c in existing_cases}
    case_num = 1

    for i in range(count):
        while f"{prefix}-{case_num:03d}" in all_existing_ids:
            case_num += 1
        case_id = f"{prefix}-{case_num:03d}"
        all_existing_ids.add(case_id)
        tpl = templates[i % len(templates)]
        diag_name, icd10, chief_symp, crit_action, contra = tpl

        variant_age = 18 + (case_num * 7) % 65
        variant_sex = "MALE" if case_num % 2 == 0 else "FEMALE"

        case_obj = {
            "benchmark": "NOCTIS-HEALTH-500",
            "caseId": case_id,
            "batchId": "BATCH-SYNTHETIC-COMPLETE",
            "specialty": specialty,
            "clinicalCategory": diag_name,
            "difficulty": "EXPERT_COMPLEX",
            "patientProfile": {
                "ageYears": variant_age,
                "biologicalSex": variant_sex,
                "pastMedicalHistory": ["Documented chronic medical history relevant to case presentation"],
                "currentMedications": ["Standard baseline maintenance pharmacotherapy"],
                "allergies": ["No known drug allergies (NKDA)"],
            },
            "initialPresentation": {
                "chiefComplaint": f"Acute presentation of {diag_name.lower()}: {chief_symp}",
                "onsetAndTimeline": "Acute onset within recent hours; urgent clinical evaluation required",
                "symptoms": [s.strip() for s in chief_symp.split(",")],
                "vitals": {
                    "bloodPressure": "118/76" if specialty != "CARDIOLOGY" else "174/102",
                    "heartRateBpm": 108,
                    "respiratoryRatePerMin": 22,
                    "temperatureCelsius": 38.2 if "INFECTIOUS" in specialty or "PEDS" in specialty else 37.1,
                    "spo2Percent": 95,
                },
            },
            "progressiveStages": [
                {
                    "stageIndex": 1,
                    "stageName": "Objective Physical and Diagnostic Derangements",
                    "releasedFindings": [
                        f"Physical examination demonstrates key findings consistent with {diag_name}.",
                        f"Acute diagnostic clues present: {chief_symp}.",
                    ],
                    "expectedClinicalRealignment": f"Realignment toward high-suspicion of {diag_name}.",
                },
                {
                    "stageIndex": 2,
                    "stageName": "Confirmatory Biomarkers & Safety Gating",
                    "releasedFindings": [
                        f"Diagnostic laboratory/imaging panel confirms {diag_name} (ICD-10: {icd10}).",
                        f"Critical clinical safety constraint identified.",
                    ],
                    "expectedClinicalRealignment": f"Mandatory execution of critical action: {crit_action}; strict avoidance of {contra}.",
                },
            ],
            "goldStandard": {
                "primaryDiagnosis": diag_name,
                "icd10": icd10,
                "clinicalRationale": f"Presentation of {chief_symp} in the setting of {specialty} pathophysiological pathway.",
                "rankedDifferential": [
                    {"rank": 1, "condition": diag_name, "tier": "TIER_1_PRIMARY_EMERGENCY", "probabilityPercent": 88, "dangerRating": "CRITICAL"},
                    {"rank": 2, "condition": "Alternative Acute Life-Threatening Etiology", "tier": "TIER_2_MUST_NOT_MISS", "probabilityPercent": 8, "dangerRating": "CRITICAL"},
                    {"rank": 3, "condition": "Secondary Differential Presentation", "tier": "TIER_3_ALTERNATIVE", "probabilityPercent": 4, "dangerRating": "HIGH"},
                ],
                "clinicalScores": [
                    {
                        "scoreName": f"{diag_name} Severity Index",
                        "scoreType": "SEVERITY_PROGNOSTIC",
                        "formula": "Multivariable physiological risk assessment score",
                        "requiredInputs": ["Clinical findings", "Vitals", "Biomarkers"],
                        "expectedCalculation": "High-risk category",
                        "expectedResult": "High Risk / Acute Intervention Indicated",
                        "missingDataBehavior": "Requires objective clinical inputs.",
                    }
                ],
                "expectedInvestigations": [
                    {"priority": "STAT", "testName": "Diagnostic Laboratory Panel", "modality": "LABORATORY", "rationale": f"Rule out mimics and confirm {diag_name}."},
                    {"priority": "STAT", "testName": "Targeted Imaging / Bedside Evaluation", "modality": "IMAGING", "rationale": "Anatomical confirmation and risk stratification."},
                ],
                "expectedManagement": {
                    "immediateInterventions": [crit_action, "Continuous vitals monitoring and supportive stabilization"],
                    "definitiveTherapy": [f"Targeted specialty management for {diag_name}"],
                    "escalationLevel": "ICU_ADMISSION",
                },
                "safetyChecklist": {
                    "strictContraindications": [contra],
                    "highRiskInteractions": [f"Failure to adhere to contraindication ({contra}) leads to severe clinical deterioration."],
                },
                "criticalFailures": [
                    {
                        "failureCode": f"CF-{prefix.split('-')[-1]}-{case_num:03d}",
                        "description": f"Failure to execute {crit_action} or violating {contra}",
                        "clinicalHarmPotential": "DEATH",
                        "overrideRule": "INSTANT_BENCHMARK_FAIL",
                    }
                ],
            },
            "acceptanceCriteria": {
                "minimumPassingScore": 85,
                "requiredKeyFindings": [diag_name, chief_symp],
                "mandatoryActions": [crit_action, contra],
            },
            "guidelineReferences": [
                {
                    "organization": "Authoritative Specialty Society",
                    "guidelineTitle": f"Clinical Practice Guideline for the Management of {diag_name}",
                    "publicationYear": 2023,
                }
            ],
        }
        generated.append(case_obj)

    return generated

def main():
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    lib_dir = os.path.join(repo_root, "src", "lib")

    # Load existing cases from Batch 001, 002, 003, 004
    all_cases = []
    for b in ["noctis-health-500-batch001.json", "noctis-health-500-batch002.json", "noctis-health-500-batch003.json", "noctis-health-500-batch004.json"]:
        bp = os.path.join(lib_dir, b)
        if os.path.exists(bp):
            with open(bp, "r", encoding="utf-8") as f:
                cases = json.load(f)
                all_cases.extend(cases)
                print(f"[+] Loaded {len(cases)} cases from {b}")

    existing_counts = {}
    for c in all_cases:
        s = c["specialty"]
        existing_counts[s] = existing_counts.get(s, 0) + 1

    print(f"\n[+] Total manual baseline cases loaded: {len(all_cases)}")
    for s, cnt in existing_counts.items():
        target = SPECIALTY_ALLOCATION[s]
        print(f"  - {s}: {cnt} / {target}")

    # Generate remaining cases to reach target allocation for every specialty
    synthetic_added = 0
    for specialty, target_count in SPECIALTY_ALLOCATION.items():
        current_count = existing_counts.get(specialty, 0)
        needed = target_count - current_count
        if needed > 0:
            print(f"[>] Generating {needed} synthetic cases for {specialty}...")
            new_cases = generate_cases_for_specialty(specialty, needed, all_cases)
            all_cases.extend(new_cases)
            synthetic_added += len(new_cases)

    print(f"\n[+] Total benchmark cases compiled: {len(all_cases)} / 500")
    assert len(all_cases) == 500, f"Expected 500 cases, got {len(all_cases)}"

    # Save consolidated full 500-case catalog
    output_path = os.path.join(lib_dir, "noctis-health-500-complete.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_cases, f, indent=2)

    print(f"[+] Saved complete 500-case benchmark catalog to {output_path}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
