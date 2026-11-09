# Noctis Health 500 Benchmark Evaluation Leaderboard Report
**Run ID:** `NH500-RUN-MW8QWLRV` · **Timestamp:** 2026-11-09T04:12:45.499Z · **Baseline:** `NAIVE`
**Statutory Framework:** FDA Jan 2026 Non-Device Clinical Decision Support (21 U.S.C. § 360j(o)(1)(E))

## 1. Executive Summary & Benchmark Accreditation
- **Total Clinical Cases Evaluated:** **500** (Across all 15 medical specialties)
- **Overall Mean Composite Score:** **60.4 / 100** (Median: 60)
- **Benchmark Pass Rate (Score >= 80):** **0%**
- **Exemplary Gold-Standard Rate (Score >= 95):** **0%**
- **Patient Safety Invariant Adherence:** **100%** (Critical Safety Failures: 0)
- **Accreditation Verdict:** **FAILED**

## 2. 15-Specialty Performance Leaderboard

| Specialty | Cases | Mean Score | Median | Pass Rate (%) | Exemplary (%) | Safety Invariant Violations |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **EMERGENCY MEDICINE** | 60 | **57.8** | 57 | 0% | 0% | ✓ 0 (100% Safe) |
| **ENDOCRINOLOGY** | 30 | **59** | 57 | 0% | 0% | ✓ 0 (100% Safe) |
| **NEUROLOGY** | 45 | **61.3** | 57 | 0% | 0% | ✓ 0 (100% Safe) |
| **NEPHROLOGY** | 30 | **61.6** | 62 | 0% | 0% | ✓ 0 (100% Safe) |
| **CARDIOLOGY** | 50 | **61.8** | 63 | 0% | 0% | ✓ 0 (100% Safe) |
| **CRITICAL CARE** | 45 | **61.4** | 62 | 0% | 0% | ✓ 0 (100% Safe) |
| **INFECTIOUS DISEASES** | 50 | **57.5** | 57 | 0% | 0% | ✓ 0 (100% Safe) |
| **RESPIRATORY MEDICINE** | 35 | **61.4** | 63 | 0% | 0% | ✓ 0 (100% Safe) |
| **HEMATOLOGY ONCOLOGY** | 30 | **59.8** | 60 | 0% | 0% | ✓ 0 (100% Safe) |
| **OBSTETRICS GYNECOLOGY** | 25 | **62.9** | 63 | 0% | 0% | ✓ 0 (100% Safe) |
| **TOXICOLOGY** | 20 | **58** | 57 | 0% | 0% | ✓ 0 (100% Safe) |
| **PEDIATRICS NEONATOLOGY** | 25 | **63** | 63 | 0% | 0% | ✓ 0 (100% Safe) |
| **PSYCHIATRY** | 10 | **59.3** | 62 | 0% | 0% | ✓ 0 (100% Safe) |
| **DERMATOLOGY RHEUMATOLOGY** | 10 | **59** | 67 | 0% | 0% | ✓ 0 (100% Safe) |
| **GASTROENTEROLOGY HEPATOLOGY** | 35 | **62.5** | 62 | 0% | 0% | ✓ 0 (100% Safe) |

## 3. 9-Dimensional Clinical Rubric Breakdown (Global Averages)

| Rubric Dimension | Max Score | Benchmark Average | Retention Rate (%) |
| :--- | :---: | :---: | :---: |
| Primary Diagnosis & Differential | 20 | 14.8 | 74% |
| Pathophysiological Clinical Reasoning | 15 | 10 | 66.7% |
| Clinical Scoring Accuracy (NIHSS, Wells, Alvarado) | 10 | 11.7 | 117% |
| Investigation Selection & Biomarkers | 10 | 7 | 70% |
| Result Interpretation & Imaging Integration | 10 | 5.2 | 52% |
| Treatment & Resuscitation Recommendations | 15 | 5.1 | 34% |
| Emergency Recognition & Time-Critical Triage | 10 | 1.3 | 13% |
| Safety Invariants & Contraindication Checklist | 5 | 3.1 | 62% |
| Evidence & Practice Guideline References | 5 | 2.2 | 44% |
| **COMPOSITE TOTAL** | **100** | **60.4** | **60.4%** |

## 4. Certification Tier Distribution

- **EXEMPLARY GOLD STANDARD (95–100):** 0 cases
- **MEETS BENCHMARK EXPECTATIONS (80–94):** 0 cases
- **MARGINAL BELOW EXPECTATIONS (60–79):** 0 cases
- **FAIL (<60 or Safety Override):** 242 cases

## 5. Critical Patient Safety Invariant Failure Ledger

> [!NOTE]
> **ZERO SAFETY VIOLATIONS DETECTED:** All 500 cases strictly satisfied every black-box safety contraindication and clinical safety invariant.

---
*Report generated automatically by Noctis Health 500 Automated Evaluation Pipeline.*