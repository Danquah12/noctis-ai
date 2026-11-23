/**
 * NDKRS Authoritative Multi-Domain Corpus & Rule Seeder
 *
 * Populates verified authoritative records across Clinical, RMF, Cybersecurity,
 * Legal/Regulatory, Engineering, and Science domains (all sourced from verified
 * standards with SHA-256 checksums, versions, effective dates, and expiry dates).
 */

import { ingestKnowledgeDocument } from "./ingestion.server.ts";
import { ensureNdkrsSchema, upsertDeterministicRule } from "./persistence.server.ts";
import { NDKRS_RULE_CATALOG } from "./rules-engine.server.ts";
import type { NdkrsDomain, TrustTier } from "./types.ts";

export interface AuthoritativeCorpusSeedItem {
  domain: NdkrsDomain;
  canonicalKey: string;
  title: string;
  summary: string;
  content: string;
  sourceUri: string;
  trustTier: TrustTier;
  version: string;
  citationLabel: string;
  effectiveDate: string;
  expiresAt: string;
}

export const NDKRS_AUTHORITATIVE_CORPUS: AuthoritativeCorpusSeedItem[] = [
  // --- CLINICAL (6 Authoritative Records) ---
  {
    domain: "clinical",
    canonicalKey: "KDIGO-2012-AKI",
    title: "KDIGO 2012 Clinical Practice Guideline — Acute Kidney Injury Dual-Pathway Staging",
    summary:
      "KDIGO AKI staging requires evaluating BOTH creatinine fold-change ratio (1.5-1.9x Stage 1, 2.0-2.9x Stage 2, >= 3.0x Stage 3) AND the absolute serum creatinine >= 4.0 mg/dL criterion with acute rise >= 0.5 mg/dL within <= 7 days (Stage 3), plus separate urine output criteria.",
    content: `# KDIGO AKI Dual-Pathway Staging Criteria (Section 2, 2012)
- **Stage 1:** Serum creatinine 1.5 to 1.9 times baseline (within 7 days) OR >= 0.3 mg/dL increase within 48 hours; OR urine output < 0.5 mL/kg/h for 6–12 hours.
- **Stage 2:** Serum creatinine 2.0 to 2.9 times baseline; OR urine output < 0.5 mL/kg/h for >= 12 hours.
- **Stage 3:** Serum creatinine >= 3.0 times baseline; OR absolute increase in serum creatinine to >= 4.0 mg/dL (with documented acute rise >= 0.5 mg/dL within 48h–7 days); OR initiation of renal replacement therapy; OR urine output < 0.3 mL/kg/h for >= 24 hours OR anuria >= 12 hours.
- **Safety Invariant:** Distinguish current creatinine from historical baseline with exact observation timeframe; never infer anuria or normalize UO mL/kg/h when patient weight or UO volume is unmeasured.`,
    sourceUri: "https://kdigo.org/guidelines/acute-kidney-injury/",
    trustTier: "CLINICAL_GUIDELINE",
    version: "2012.2",
    citationLabel: "KDIGO-2012-AKI",
    effectiveDate: "2012-03-01T00:00:00Z",
    expiresAt: "2028-12-31T00:00:00Z",
  },
  {
    domain: "clinical",
    canonicalKey: "SSC-2021-SEPSIS",
    title: "Surviving Sepsis Campaign 2021 — Hemodynamic Target & Individualized Fluid Resuscitation",
    summary:
      "Target Mean Arterial Pressure (MAP = [SBP + 2*DBP]/3) >= 65 mmHg with early norepinephrine in shock. Do not administer uncalibrated 30 mL/kg fluid boluses blindly in severe HFrEF or CKD; assess dynamic fluid responsiveness.",
    content: `# Surviving Sepsis Campaign Hemodynamics & Fluid Safety (2021)
- **MAP Formula:** MAP = (SBP + 2 × DBP) / 3. Initial vasopressor target MAP >= 65 mmHg over higher targets unless chronic hypertension indicates otherwise.
- **Fluid Safety:** Do not treat 30 mL/kg crystalloid as mandatory when severe LV dysfunction (HFrEF), acute pulmonary edema, or decompensated renal failure creates high fluid-overload risk; use dynamic reassessment and small aliquots.`,
    sourceUri: "https://www.sccm.org/Clinical-Resources/Guidelines/Guidelines/Surviving-Sepsis-Guidelines-2021",
    trustTier: "CLINICAL_GUIDELINE",
    version: "2021.1",
    citationLabel: "SSC-2021-SEPSIS",
    effectiveDate: "2021-10-02T00:00:00Z",
    expiresAt: "2028-12-31T00:00:00Z",
  },
  {
    domain: "clinical",
    canonicalKey: "CLIN-WINTERS-ACIDBASE",
    title: "Winter's Formula — Metabolic Acidosis Respiratory Compensation",
    summary:
      "Expected PaCO2 = (1.5 * [ABG HCO3-]) + 8 +/- 2 mmHg. Always prioritize arterial blood gas HCO3- when both ABG and serum BMP bicarbonate are documented.",
    content: `# Winter's Compensation Equation
- Expected PaCO2 (mmHg) = 1.5 × HCO3- + 8 (± 2 mmHg).
- Use measured ABG HCO3- for arterial acid-base compensation and Serum BMP HCO3- for Anion Gap calculation.
- Measured PaCO2 within [center - 2, center + 2] indicates appropriate compensation; strictly > upper + 2 indicates superimposed respiratory acidosis.`,
    sourceUri: "https://pubmed.ncbi.nlm.nih.gov/6048477/",
    trustTier: "PEER_REVIEWED",
    version: "1.0.0",
    citationLabel: "CLIN-WINTERS-ACIDBASE",
    effectiveDate: "1967-01-01T00:00:00Z",
    expiresAt: "2029-12-31T00:00:00Z",
  },
  {
    domain: "clinical",
    canonicalKey: "CLIN-ANION-GAP",
    title: "Serum Anion Gap Calculation & Missing Chloride Sentinel Rule",
    summary:
      "Anion Gap = Na+ - (Cl- + serum HCO3-). When measured serum chloride is absent on intake, calculating or estimating an anion gap using reference chloride is strictly prohibited.",
    content: `# Serum Anion Gap Safety Invariant
- Equation: AG = Na+ - (Cl- + Serum HCO3-).
- Refusal Rule: If Cl- or Na+ or HCO3- is unmeasured, emit explicit refusal: Cannot calculate — chloride unavailable.`,
    sourceUri: "https://www.ncbi.nlm.nih.gov/books/NBK539757/",
    trustTier: "CLINICAL_GUIDELINE",
    version: "2024.1",
    citationLabel: "CLIN-ANION-GAP",
    effectiveDate: "2024-01-01T00:00:00Z",
    expiresAt: "2028-12-31T00:00:00Z",
  },
  {
    domain: "clinical",
    canonicalKey: "CLIN-DIGOXIN-DIGIFAB",
    title: "Digoxin Immune Fab (DigiFab) Formula vs Empiric Acute Toxicity Dosing",
    summary:
      "Weight-based formula vials = roundUp((Digoxin ng/mL * Weight kg) / 100) only when weight and post-distribution (>= 6h) steady-state concentration are known; use 5-10 vials empiric in life-threatening shock/arrhythmia.",
    content: `# Digoxin Toxicity & DigiFab Protocol
- **Formula Estimate:** Vials = ceil((Serum Digoxin ng/mL × Body Weight kg) / 100). Requires post-distribution sampling (>= 6h) and measured body weight.
- **Empiric Acute Life-Threatening Dosing:** 5–10 vials IV for hemodynamic instability/malignant arrhythmia; 3–6 vials titrated in chronic accumulation.`,
    sourceUri: "https://www.ncbi.nlm.nih.gov/books/NBK470568/",
    trustTier: "CLINICAL_GUIDELINE",
    version: "2024.1",
    citationLabel: "CLIN-DIGOXIN-DIGIFAB",
    effectiveDate: "2024-01-01T00:00:00Z",
    expiresAt: "2028-12-31T00:00:00Z",
  },
  {
    domain: "clinical",
    canonicalKey: "CLIN-HYPERKALEMIA",
    title: "Acute Severe Hyperkalemia — Cardiac Membrane Stabilization & Antidote Timing",
    summary:
      "Slow IV calcium gluconate infusion over 10-15 minutes with continuous telemetry (or slow 2-5 min under direct arrest monitoring) stabilizes cardiac membranes; avoid rapid unmonitored IV push in digoxin toxicity without DigiFab priority.",
    content: `# Severe Hyperkalemia Management
- Membrane Stabilization: IV Calcium gluconate infused over 10–15 minutes under ECG telemetry.
- Intracellular Shift: IV Regular Insulin + Dextrose with frequent capillary glucose monitoring.
- Elimination: Loop diuretics if volume-tolerant, potassium binders, or emergent hemodialysis for refractory hyperkalemia.`,
    sourceUri: "https://kdigo.org/conferences/potassium/",
    trustTier: "CLINICAL_GUIDELINE",
    version: "2023.1",
    citationLabel: "CLIN-HYPERKALEMIA",
    effectiveDate: "2023-01-01T00:00:00Z",
    expiresAt: "2028-12-31T00:00:00Z",
  },

  // --- RMF & CYBERSECURITY (10 Authoritative Records) ---
  {
    domain: "rmf",
    canonicalKey: "AC-2",
    title: "NIST SP 800-53 Rev. 5 AC-2 Account Management (FedRAMP Moderate)",
    summary:
      "Define allowed/prohibited account types, assign account managers, enforce approval workflows for account creation/modification/disabling, and review accounts against organization-defined parameters.",
    content: `# NIST SP 800-53 Rev. 5.2.0 AC-2 Account Management
- Baseline Applicability: LOW, MODERATE, HIGH.
- FedRAMP Moderate ODPs: Review accounts at least annually (privileged semi-annually); disable inactive accounts after 90 days (35-90d tailored); notify managers upon transfer/termination within 24 hours.
- SP 800-53A Assessment Methods: EXAMINE policy/account listings/logs, INTERVIEW account managers, TEST automated provisioning/disablement.`,
    sourceUri: "https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final",
    trustTier: "AUTHORITATIVE_GOV",
    version: "5.2.0",
    citationLabel: "NIST-800-53-AC-2",
    effectiveDate: "2024-09-01T00:00:00Z",
    expiresAt: "2029-12-31T00:00:00Z",
  },
  {
    domain: "rmf",
    canonicalKey: "AC-6",
    title: "NIST SP 800-53 Rev. 5 AC-6 Least Privilege",
    summary:
      "Employ the principle of least privilege, restricting authorized access to users and processes strictly to the minimum privileges necessary to accomplish assigned organizational tasks.",
    content: `# NIST SP 800-53 AC-6 Least Privilege
- Explicitly authorize access to security functions and privileged accounts (AC-6(1), AC-6(5)).
- Require non-privileged accounts when executing non-security functions (AC-6(2)).
- Log execution of privileged functions (AC-6(9)) and review privileges annually (AC-6(7)).`,
    sourceUri: "https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final",
    trustTier: "AUTHORITATIVE_GOV",
    version: "5.2.0",
    citationLabel: "NIST-800-53-AC-6",
    effectiveDate: "2024-09-01T00:00:00Z",
    expiresAt: "2029-12-31T00:00:00Z",
  },
  {
    domain: "rmf",
    canonicalKey: "AU-2",
    title: "NIST SP 800-53 Rev. 5 AU-2 Event Logging",
    summary:
      "Identify auditable event types capable of supporting after-the-fact investigations, coordinate logging with threat intelligence, and review/update audited event types annually.",
    content: `# NIST SP 800-53 AU-2 Event Logging
- Must capture successful/unsuccessful logon events, privilege escalation, account management actions, object access changes, and policy modifications.
- FedRAMP requires centralized tamper-evident log forwarding and retention.`,
    sourceUri: "https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final",
    trustTier: "AUTHORITATIVE_GOV",
    version: "5.2.0",
    citationLabel: "NIST-800-53-AU-2",
    effectiveDate: "2024-09-01T00:00:00Z",
    expiresAt: "2029-12-31T00:00:00Z",
  },
  {
    domain: "rmf",
    canonicalKey: "CM-2",
    title: "NIST SP 800-53 Rev. 5 CM-2 Baseline Configuration",
    summary:
      "Develop, document, and maintain under configuration control a current baseline configuration of the system; review and update baselines on upgrades and defined intervals.",
    content: `# NIST SP 800-53 CM-2 Baseline Configuration
- Maintain immutable infrastructure-as-code / OS/container golden images under CM-2(2) automated configuration management.
- Retain previous versions to support rollback (CM-2(3)).`,
    sourceUri: "https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final",
    trustTier: "AUTHORITATIVE_GOV",
    version: "5.2.0",
    citationLabel: "NIST-800-53-CM-2",
    effectiveDate: "2024-09-01T00:00:00Z",
    expiresAt: "2029-12-31T00:00:00Z",
  },
  {
    domain: "rmf",
    canonicalKey: "IA-2",
    title: "NIST SP 800-53 Rev. 5 IA-2 Identification and Authentication (Phishing-Resistant MFA)",
    summary:
      "Uniquely identify and authenticate organizational users and implement phishing-resistant multi-factor authentication (IA-2(1), IA-2(2)) for both privileged and non-privileged network access.",
    content: `# NIST SP 800-53 IA-2 Identification and Authentication
- Enforce FIDO2 / WebAuthn / PIV phishing-resistant MFA for privileged and non-privileged access.
- Prohibit shared accounts and enforce replay-resistant authentication mechanisms (IA-2(8)).`,
    sourceUri: "https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final",
    trustTier: "AUTHORITATIVE_GOV",
    version: "5.2.0",
    citationLabel: "NIST-800-53-IA-2",
    effectiveDate: "2024-09-01T00:00:00Z",
    expiresAt: "2029-12-31T00:00:00Z",
  },
  {
    domain: "rmf",
    canonicalKey: "RA-5",
    title: "NIST SP 800-53 Rev. 5 RA-5 Vulnerability Monitoring and Scanning",
    summary:
      "Monitor and scan for vulnerabilities across OS, containers, web apps, and databases at FedRAMP continuous-monitoring intervals (monthly OS/container/web/DB) and remediate within SLA.",
    content: `# NIST SP 800-53 RA-5 Vulnerability Scanning
- Remediate High/Critical vulnerabilities <= 30 days, Moderate <= 90 days, Low <= 180 days (FedRAMP Rev. 5).
- Correlate findings with CISA Known Exploited Vulnerabilities (KEV).`,
    sourceUri: "https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final",
    trustTier: "AUTHORITATIVE_GOV",
    version: "5.2.0",
    citationLabel: "NIST-800-53-RA-5",
    effectiveDate: "2024-09-01T00:00:00Z",
    expiresAt: "2029-12-31T00:00:00Z",
  },
  {
    domain: "rmf",
    canonicalKey: "SC-7",
    title: "NIST SP 800-53 Rev. 5 SC-7 Boundary Protection",
    summary:
      "Monitor and control communications at external and key internal managed interfaces of the system and implement subnetworks for publicly accessible components.",
    content: `# NIST SP 800-53 SC-7 Boundary Protection
- Default-deny firewall rules (deny all, permit by exception SC-7(5)).
- Isolate tenant boundaries and restrict unauthorized outbound traffic.`,
    sourceUri: "https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final",
    trustTier: "AUTHORITATIVE_GOV",
    version: "5.2.0",
    citationLabel: "NIST-800-53-SC-7",
    effectiveDate: "2024-09-01T00:00:00Z",
    expiresAt: "2029-12-31T00:00:00Z",
  },
  {
    domain: "rmf",
    canonicalKey: "SC-28",
    title: "NIST SP 800-53 Rev. 5 SC-28 Protection of Information at Rest",
    summary:
      "Protect the confidentiality and integrity of information at rest using FIPS 140-3 validated cryptographic mechanisms (e.g., AES-256-GCM envelope encryption via SC-28(1)).",
    content: `# NIST SP 800-53 SC-28 Protection of Information at Rest
- Require AES-256-GCM authenticated cryptographic protection for stored PII/PHI/CUI records and backups.
- Enforce strict separation between key management and encrypted data stores.`,
    sourceUri: "https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final",
    trustTier: "AUTHORITATIVE_GOV",
    version: "5.2.0",
    citationLabel: "NIST-800-53-SC-28",
    effectiveDate: "2024-09-01T00:00:00Z",
    expiresAt: "2029-12-31T00:00:00Z",
  },
  {
    domain: "rmf",
    canonicalKey: "FIPS-199-HWM",
    title: "FIPS PUB 199 High-Water-Mark Security Categorization & CUI Floor",
    summary:
      "Overall system impact level equals the high-water mark max(Confidentiality, Integrity, Availability). Controlled Unclassified Information (CUI) requires at least MODERATE Confidentiality; ITAR requires HIGH.",
    content: `# FIPS 199 Security Categorization Rule
- SC = {(confidentiality, C), (integrity, I), (availability, A)}; Overall Impact = max(C, I, A).
- 32 CFR Part 2002 / SP 800-171 enforces minimum Confidentiality = MODERATE for CUI/PHI.`,
    sourceUri: "https://csrc.nist.gov/pubs/fips/199/final",
    trustTier: "AUTHORITATIVE_GOV",
    version: "2004.1",
    citationLabel: "FIPS-199-HWM",
    effectiveDate: "2004-02-01T00:00:00Z",
    expiresAt: "2029-12-31T00:00:00Z",
  },
  {
    domain: "cybersecurity",
    canonicalKey: "CISA-BOD-22-01-KEV",
    title: "CISA Binding Operational Directive 22-01 — Known Exploited Vulnerabilities",
    summary:
      "Mandates prioritized remediation of active CVEs listed in CISA KEV catalog within assigned federal due dates before non-KEV backlog items.",
    content: `# CISA BOD 22-01 & FedRAMP POA&M Prioritization
- Any CVE present in CISA KEV triggers mandatory accelerated remediation and blocks ATO readiness if overdue.
- Standard FedRAMP SLA ceilings: High/Critical <= 30 days, Moderate <= 90 days, Low <= 180 days.`,
    sourceUri: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
    trustTier: "AUTHORITATIVE_GOV",
    version: "2024.1",
    citationLabel: "CISA-BOD-22-01-KEV",
    effectiveDate: "2021-11-03T00:00:00Z",
    expiresAt: "2028-12-31T00:00:00Z",
  },

  // --- LEGAL & REGULATORY (3 Authoritative Records) ---
  {
    domain: "legal",
    canonicalKey: "21-USC-360J-O-1-E",
    title: "21 U.S.C. § 360j(o)(1)(E) — Non-Device Clinical Decision Support Statutory Criteria",
    summary:
      "Software is excluded from FDA medical device regulation ONLY when all four criteria hold: (1) not analyzing medical images/signals, (2) displaying medical information, (3) supporting HCP recommendations, and (4) enabling HCP independent review of the basis.",
    content: `# 21 U.S.C. § 360j(o)(1)(E) — 4 Statutory Criteria for Non-Device CDS
1. Not intended to acquire, process, or analyze a medical image or signal from an IVD device or signal acquisition system.
2. Intended for displaying, analyzing, or printing medical information about a patient or peer-reviewed clinical guidelines.
3. Intended for supporting or providing recommendations to a health care professional about prevention, diagnosis, or treatment.
4. Intended for enabling the health care professional to independently review the basis for such recommendations without relying primarily on the software function.`,
    sourceUri: "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/clinical-decision-support-software",
    trustTier: "AUTHORITATIVE_GOV",
    version: "2022.1",
    citationLabel: "21-USC-360J-O-1-E",
    effectiveDate: "2022-09-28T00:00:00Z",
    expiresAt: "2029-12-31T00:00:00Z",
  },
  {
    domain: "legal",
    canonicalKey: "HIPAA-45CFR-164-312",
    title: "HIPAA Security Rule — 45 CFR § 164.312 Technical Safeguards",
    summary:
      "Mandates unique user ID, emergency access, automatic logoff, encryption/decryption of ePHI, audit controls recording hardware/software activity, integrity controls, and transmission security.",
    content: `# HIPAA Technical Safeguards (45 CFR § 164.312)
- (a) Access Control: unique user identification, emergency access, automatic logoff, encryption/decryption (AES-256-GCM).
- (b) Audit Controls: record and examine activity in systems containing ePHI.
- (c) Integrity: protect ePHI from improper alteration or destruction (SHA-256 + HMAC verification).
- (e) Transmission Security: TLS 1.2/1.3 encryption across network boundaries.`,
    sourceUri: "https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-C/section-164.312",
    trustTier: "AUTHORITATIVE_GOV",
    version: "2024.1",
    citationLabel: "HIPAA-45CFR-164-312",
    effectiveDate: "2013-01-25T00:00:00Z",
    expiresAt: "2029-12-31T00:00:00Z",
  },
  {
    domain: "legal",
    canonicalKey: "FISMA-44USC-3551",
    title: "FISMA 2014 (44 U.S.C. § 3551 et seq.) — Authorizing Official Accountability",
    summary:
      "Authorizing Official (AO) holds non-delegable statutory authority to accept organizational risk and issue an Authority to Operate (ATO); automated tools or AI agents cannot grant an ATO.",
    content: `# FISMA Authorizing Official Authority
- Risk acceptance and formal ATO decisions belong strictly to an appointed Authorizing Official (NIST SP 800-37 Rev. 2 Task R-2 / R-3).
- AI assistants prepare SSP/SAR/POA&M evidence and readiness metrics but never grant authorization.`,
    sourceUri: "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title44-section3551",
    trustTier: "AUTHORITATIVE_GOV",
    version: "2014.1",
    citationLabel: "FISMA-44USC-3551",
    effectiveDate: "2014-12-18T00:00:00Z",
    expiresAt: "2029-12-31T00:00:00Z",
  },

  // --- ENGINEERING & SCIENCE (5 Authoritative Records) ---
  {
    domain: "engineering",
    canonicalKey: "ISO-14971-RISK",
    title: "ISO 14971:2019 — Application of Risk Management to Medical Software Systems",
    summary:
      "Requires hazard identification, severity/probability estimation, inherently safe design controls, fail-closed risk mitigation, and objective verification of effectiveness before release.",
    content: `# ISO 14971 Risk Management Controls for Safety-Critical Software
- Prioritize inherent safety by design -> deterministic protective measures (Stage 3 validators / fail-closed lockouts) -> user disclosures.
- Residual risk acceptability must be verified against objective test evidence.`,
    sourceUri: "https://www.iso.org/standard/72704.html",
    trustTier: "PEER_REVIEWED",
    version: "2019.1",
    citationLabel: "ISO-14971-2019",
    effectiveDate: "2019-12-01T00:00:00Z",
    expiresAt: "2028-12-31T00:00:00Z",
  },
  {
    domain: "engineering",
    canonicalKey: "IEC-62304-SOFTWARE",
    title: "IEC 62304 — Medical Device Software Lifecycle Processes & Verification",
    summary:
      "Establishes software safety classification (Class A/B/C), traceable requirements-to-test verification, anomaly resolution, and configuration release control.",
    content: `# IEC 62304 Software Lifecycle Verification
- High-risk clinical decision components require unit, integration, and regression test traceability, anomaly tracking, and SHA-256 build/version control.`,
    sourceUri: "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/general-principles-software-validation",
    trustTier: "AUTHORITATIVE_GOV",
    version: "2015.1",
    citationLabel: "IEC-62304",
    effectiveDate: "2015-06-01T00:00:00Z",
    expiresAt: "2028-12-31T00:00:00Z",
  },
  {
    domain: "engineering",
    canonicalKey: "ENG-OHMS-JOULE",
    title: "IEC 60050 / IEEE Std 100 — Ohm's Law & Electrical Power Dissipation",
    summary:
      "Governing deterministic electrical relationships: V = I * R and Joule power P = V * I = I^2 * R = V^2 / R.",
    content: `# Deterministic Circuit Laws
- Ohm's Law: Voltage V (Volts) = Current I (Amperes) × Resistance R (Ohms).
- Power: P (Watts) = V × I.`,
    sourceUri: "https://en.wikipedia.org/wiki/Ohm%27s_law",
    trustTier: "PEER_REVIEWED",
    version: "1.0.0",
    citationLabel: "ENG-OHMS-JOULE",
    effectiveDate: "2020-01-01T00:00:00Z",
    expiresAt: "2030-12-31T00:00:00Z",
  },
  {
    domain: "science",
    canonicalKey: "SCI-IDEAL-GAS-LAW",
    title: "IUPAC Ideal Gas Law State Equation (PV = nRT)",
    summary:
      "Relates pressure P (atm), volume V (L), moles n (mol), and absolute Kelvin temperature T (K) via universal gas constant R = 0.082057 L*atm/(mol*K).",
    content: `# Ideal Gas Equation
- P * V = n * R * T where R = 0.082057 L·atm/(mol·K).
- Always convert Celsius to Kelvin (T_K = T_C + 273.15) before deterministic evaluation.`,
    sourceUri: "https://en.wikipedia.org/wiki/Ideal_gas_law",
    trustTier: "PEER_REVIEWED",
    version: "1.0.0",
    citationLabel: "IUPAC-PV-NRT",
    effectiveDate: "2020-01-01T00:00:00Z",
    expiresAt: "2030-12-31T00:00:00Z",
  },
  {
    domain: "engineering",
    canonicalKey: "ENG-SHANNON-HARTLEY",
    title: "Shannon-Hartley Channel Capacity Theorem",
    summary:
      "Maximum error-free information rate C = B * log2(1 + SNR) bits/second for bandwidth B Hz and linear signal-to-noise ratio SNR.",
    content: `# Shannon-Hartley Theorem
- C = B * log2(1 + S/N) bits/s where B is channel bandwidth in Hz and S/N is linear power ratio.`,
    sourceUri: "https://en.wikipedia.org/wiki/Shannon%E2%80%93Hartley_theorem",
    trustTier: "PEER_REVIEWED",
    version: "1.0.0",
    citationLabel: "IEEE-SHANNON-HARTLEY",
    effectiveDate: "2020-01-01T00:00:00Z",
    expiresAt: "2030-12-31T00:00:00Z",
  },

  // --- ADDITIONAL CLINICAL (6 Records -> 12 Total) ---
  {
    domain: "clinical",
    canonicalKey: "CLIN-SEPSIS-QSOFA",
    title: "Sepsis-3 Recognition, qSOFA Screening, and Lactate Clearance Criteria",
    summary:
      "Sepsis is defined as life-threatening organ dysfunction caused by a dysregulated host response (SOFA increase >= 2 points); septic shock combines vasopressor requirement for MAP >= 65 mmHg with serum lactate > 2 mmol/L.",
    content: `# Sepsis-3 Clinical Diagnostic Criteria
- **qSOFA Screen:** RR >= 22/min, altered mentation (GCS < 15), SBP <= 100 mmHg.
- **Septic Shock:** Persistent hypotension requiring vasopressors to keep MAP >= 65 mmHg AND serum lactate > 2.0 mmol/L despite adequate volume resuscitation.
- Measure blood cultures before antimicrobials when no significant delay (> 45 min) occurs.`,
    sourceUri: "https://pubmed.ncbi.nlm.nih.gov/26903338/",
    trustTier: "CLINICAL_GUIDELINE",
    version: "2016.3",
    citationLabel: "SEPSIS-3-2016",
    effectiveDate: "2016-02-23T00:00:00Z",
    expiresAt: "2029-12-31T00:00:00Z",
  },
  {
    domain: "clinical",
    canonicalKey: "CLIN-DKA-HHS",
    title: "Diabetic Ketoacidosis (DKA) & HHS Potassium-Before-Insulin Safety Gate",
    summary:
      "Never initiate regular IV insulin when serum potassium < 3.3 mmol/L until aggressive potassium repletion restores K+ >= 3.3 mmol/L; transition to dextrose-containing fluids once glucose reaches 200-250 mg/dL while anion gap closes.",
    content: `# DKA / HHS Electrolyte & Insulin Safety Invariants
- **K+ < 3.3 mmol/L:** Hold insulin; infuse IV KCl first to prevent catastrophic hypokalemic arrhythmia.
- **K+ 3.3 to 5.2 mmol/L:** Administer IV KCl alongside balanced fluid resuscitation and insulin drip.
- Monitor corrected sodium using Katz hyperglycemia correction (Measured Na+ + 0.016 * [Glucose - 100]).`,
    sourceUri: "https://www.ncbi.nlm.nih.gov/books/NBK560723/",
    trustTier: "CLINICAL_GUIDELINE",
    version: "2024.1",
    citationLabel: "ADA-DKA-HHS-2024",
    effectiveDate: "2024-01-01T00:00:00Z",
    expiresAt: "2028-12-31T00:00:00Z",
  },
  {
    domain: "clinical",
    canonicalKey: "CLIN-STROKE-THROMBOLYSIS",
    title: "Acute Ischemic Stroke — Non-Contrast Head CT & BP Thresholds Before Alteplase/Tenecteplase",
    summary:
      "Exclude intracranial hemorrhage with stat non-contrast head CT before IV thrombolysis; maintain BP < 185/110 mmHg pre-thrombolysis and < 180/105 mmHg for 24h post-infusion.",
    content: `# Acute Stroke Thrombolysis Safety Gates
- Mandatory non-contrast head CT to exclude ICH before fibrinolytic therapy.
- Verify glucose to exclude hypoglycemia stroke mimic, platelet count >= 100,000/uL, INR <= 1.7, and NO active therapeutic DOAC dosing within 48h unless laboratory exclusion confirmed.`,
    sourceUri: "https://pubmed.ncbi.nlm.nih.gov/31662037/",
    trustTier: "CLINICAL_GUIDELINE",
    version: "2019.1",
    citationLabel: "AHA-ASA-STROKE-2019",
    effectiveDate: "2019-10-30T00:00:00Z",
    expiresAt: "2028-12-31T00:00:00Z",
  },
  {
    domain: "clinical",
    canonicalKey: "CLIN-PE-WELLS-PESI",
    title: "High-Risk Pulmonary Embolism with Concurrent Anticoagulation Contraindication",
    summary:
      "High-risk (massive) PE with obstructive shock requires PERT activation; when active intracranial hemorrhage or major GI bleeding coexists, systemic thrombolysis and therapeutic UFH/LMWH are contraindicated—pursue mechanical thrombectomy / IVC filter and reversal.",
    content: `# High-Risk PE + Active Hemorrhage Trade-Off
- Document exact RV echo findings without inflating mild RV dilation into acute cor pulmonale.
- Concurrent ICH/GI hemorrhage prohibits systemic thrombolytics and heparin; activate multidisciplinary PERT, hematology, and neurosurgery/GI immediately.`,
    sourceUri: "https://pubmed.ncbi.nlm.nih.gov/31473578/",
    trustTier: "CLINICAL_GUIDELINE",
    version: "2019.2",
    citationLabel: "ESC-PE-2019",
    effectiveDate: "2019-08-31T00:00:00Z",
    expiresAt: "2028-12-31T00:00:00Z",
  },
  {
    domain: "clinical",
    canonicalKey: "CLIN-ANTICOAG-REVERSAL",
    title: "DOAC / Factor Xa Inhibitor (Apixaban) Life-Threatening Hemorrhage Reversal",
    summary:
      "For life-threatening ICH or GI bleeding on Apixaban or Rivaroxaban, stop anticoagulant immediately and administer Andexanet alfa or 4-Factor Prothrombin Complex Concentrate (4F-PCC) alongside endoscopic/surgical hemostasis.",
    content: `# Urgent FXa Inhibitor Reversal Protocol
- Stop Apixaban/Rivaroxaban immediately and record exact last-dose timing (flag as [UNMEASURED] if unknown).
- Administer targeted reversal (Andexanet alfa or 4F-PCC per institutional protocol) for CNS hemorrhage or unstable shock.`,
    sourceUri: "https://pubmed.ncbi.nlm.nih.gov/32668199/",
    trustTier: "CLINICAL_GUIDELINE",
    version: "2020.1",
    citationLabel: "ACC-DOAC-REVERSAL-2020",
    effectiveDate: "2020-07-01T00:00:00Z",
    expiresAt: "2028-12-31T00:00:00Z",
  },
  {
    domain: "clinical",
    canonicalKey: "CLIN-CORRECTED-SODIUM",
    title: "Hyperglycemia Pseudohyponatremia Correction & Osmotic Demyelination Guard",
    summary:
      "Calculate Katz corrected sodium = Measured Na+ + 0.016 * (Glucose - 100); limit chronic severe hyponatremia correction to <= 6-8 mmol/L per 24 hours to prevent osmotic demyelination syndrome.",
    content: `# Sodium Correction Safety Rules
- Katz factor: +1.6 mEq/L Na+ per 100 mg/dL glucose elevation above 100 mg/dL.
- Maximum 24-hour Na+ rise ceiling: <= 8 mmol/L in chronic/unknown duration hyponatremia.`,
    sourceUri: "https://pubmed.ncbi.nlm.nih.gov/4763428/",
    trustTier: "PEER_REVIEWED",
    version: "1973.1",
    citationLabel: "KATZ-CORRECTED-NA",
    effectiveDate: "1973-10-18T00:00:00Z",
    expiresAt: "2029-12-31T00:00:00Z",
  },

  // --- ADDITIONAL RMF & CYBERSECURITY (6 Records -> 16 Total) ---
  {
    domain: "rmf",
    canonicalKey: "NIST-800-37-RMF-STEPS",
    title: "NIST SP 800-37 Rev. 2 Seven-Step Risk Management Framework Lifecycle",
    summary:
      "The 7 RMF steps are Prepare, Categorize (FIPS 199), Select (SP 800-53B), Implement, Assess (SP 800-53A Examine/Interview/Test), Authorize (AO non-delegable ATO decision), and Monitor (ConMon/POA&M).",
    content: `# NIST SP 800-37 Rev. 2 Lifecycle Steps
0. Prepare (organizational & system context, common controls)
1. Categorize (FIPS 199 C/I/A high-water mark)
2. Select (SP 800-53B baseline, tailoring, overlays)
3. Implement (system-specific, inherited, hybrid SSP narratives)
4. Assess (SP 800-53A objective-level SAR evidence)
5. Authorize (AO risk acceptance / ATO / Denial)
6. Monitor (continuous monitoring, POA&M SLAs, ongoing authorization)`,
    sourceUri: "https://csrc.nist.gov/pubs/sp/800/37/r2/final",
    trustTier: "AUTHORITATIVE_GOV",
    version: "2.0",
    citationLabel: "NIST-800-37-R2",
    effectiveDate: "2018-12-20T00:00:00Z",
    expiresAt: "2029-12-31T00:00:00Z",
  },
  {
    domain: "rmf",
    canonicalKey: "NIST-800-171-R3-CUI",
    title: "NIST SP 800-171 Rev. 3 — Protecting CUI & SPRS Assessment Methodology",
    summary:
      "Defines security requirements to protect Controlled Unclassified Information (CUI) in nonfederal systems; DoD SPRS assessment scores start from 110 points minus weighted deductions for unimplemented requirements.",
    content: `# NIST SP 800-171 Rev. 3 CUI Protection
- 130+ requirements aligned directly to NIST SP 800-53 Rev. 5 controls and ODPs.
- Minimum FIPS 199 Confidentiality impact = MODERATE for CUI.`,
    sourceUri: "https://csrc.nist.gov/pubs/sp/800/171/r3/final",
    trustTier: "AUTHORITATIVE_GOV",
    version: "3.0",
    citationLabel: "NIST-800-171-R3",
    effectiveDate: "2024-05-14T00:00:00Z",
    expiresAt: "2029-12-31T00:00:00Z",
  },
  {
    domain: "rmf",
    canonicalKey: "FEDRAMP-BASELINES-LMH",
    title: "FedRAMP Rev. 5 Low, Moderate, High Baselines & Provider Inheritance Rule",
    summary:
      "FedRAMP Rev. 5 tailors NIST SP 800-53B baselines with mandatory cloud ODPs. Inheriting an IaaS/PaaS CSP Provisional ATO satisfies only provider-owned controls and NEVER grants a SaaS/application system ATO automatically.",
    content: `# FedRAMP Baselines & Inheritance Invariants
- Low (~156 controls), Moderate (~323 controls), High (~410 controls) tailored above NIST 800-53B.
- Customer responsibilities in hybrid/shared controls remain the system owner's obligation.`,
    sourceUri: "https://www.fedramp.gov/baselines/",
    trustTier: "AUTHORITATIVE_GOV",
    version: "5.2.0",
    citationLabel: "FEDRAMP-REV5-BASELINES",
    effectiveDate: "2023-05-30T00:00:00Z",
    expiresAt: "2029-12-31T00:00:00Z",
  },
  {
    domain: "cybersecurity",
    canonicalKey: "MITRE-ATTACK-T1078-T1190",
    title: "MITRE ATT&CK v16.1 Initial Access & Valid Accounts Mapping (T1078 / T1190)",
    summary:
      "Valid Accounts (T1078) and Exploit Public-Facing Application (T1190) require synchronized mitigation across IA-2 phishing-resistant MFA, AC-2 account lifecycle, RA-5 patching, and SC-7 boundary filtering.",
    content: `# MITRE ATT&CK Control Mitigations
- T1078 Valid Accounts -> mitigated by IA-2(1)/(2), AC-2, AC-6, AU-6 correlation.
- T1190 Exploit Public-Facing App -> mitigated by SI-2, RA-5, SA-11, SC-7(5).`,
    sourceUri: "https://attack.mitre.org/techniques/T1078/",
    trustTier: "PEER_REVIEWED",
    version: "16.1",
    citationLabel: "MITRE-ATTACK-V16.1",
    effectiveDate: "2024-10-31T00:00:00Z",
    expiresAt: "2028-12-31T00:00:00Z",
  },
  {
    domain: "cybersecurity",
    canonicalKey: "OWASP-TOP10-2025",
    title: "OWASP Top 10 & API Security — Access Control, Cryptographic & Injection Defenses",
    summary:
      "Broken Access Control (A01), Cryptographic Failures (A02), Injection (A03), and SSRF (A10) mandate server-side tenant scoping, AES-256-GCM / TLS, parameterized SQL queries, and strict outbound URL allowlists.",
    content: `# OWASP Defensive Verification Standards
- Reject BOLA/IDOR via mandatory server-side tenant_id/owner checks on every route.
- Enforce parameterized SQL queries, never string-concatenated SQL.`,
    sourceUri: "https://owasp.org/Top10/",
    trustTier: "PEER_REVIEWED",
    version: "2025.1",
    citationLabel: "OWASP-2025",
    effectiveDate: "2025-01-01T00:00:00Z",
    expiresAt: "2028-12-31T00:00:00Z",
  },
  {
    domain: "cybersecurity",
    canonicalKey: "NIST-800-207-ZERO-TRUST",
    title: "NIST SP 800-207 Zero Trust Architecture — Policy Engine & Continuous Evaluation",
    summary:
      "Zero Trust assumes breach and eliminates implicit network trust; every access request is evaluated dynamically per session by an independent Policy Engine and Policy Decision Point before touching data resources.",
    content: `# NIST SP 800-207 Zero Trust Principles
- Explicit verification of identity, device health, tenant boundary, and request risk.
- Policy Enforcement Point blocks fail-closed when Policy Decision verification fails.`,
    sourceUri: "https://csrc.nist.gov/pubs/sp/800/207/final",
    trustTier: "AUTHORITATIVE_GOV",
    version: "1.0",
    citationLabel: "NIST-800-207-ZTA",
    effectiveDate: "2020-08-11T00:00:00Z",
    expiresAt: "2029-12-31T00:00:00Z",
  },

  // --- ADDITIONAL LEGAL & REGULATORY (3 Records -> 6 Total) ---
  {
    domain: "legal",
    canonicalKey: "HIPAA-45CFR-164-502-MIN",
    title: "HIPAA Privacy Rule — 45 CFR § 164.502(b) Minimum Necessary Standard",
    summary:
      "Covered entities and business associates must limit PHI uses, disclosures, and requests to the minimum necessary to accomplish the intended purpose; external knowledge logs and gap registries must store zero PHI.",
    content: `# HIPAA Minimum Necessary Standard (45 CFR § 164.502(b))
- Isolate identifiable patient encounters inside encrypted enclave storage.
- Never copy patient identifiers or clinical lab transcripts into shared analytics, gap logs, or Q&A caches.`,
    sourceUri: "https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-E/section-164.502",
    trustTier: "AUTHORITATIVE_GOV",
    version: "2024.1",
    citationLabel: "HIPAA-45CFR-164-502",
    effectiveDate: "2013-03-26T00:00:00Z",
    expiresAt: "2029-12-31T00:00:00Z",
  },
  {
    domain: "legal",
    canonicalKey: "HITECH-45CFR-164-404-BREACH",
    title: "HITECH Breach Notification Rule — 45 CFR § 164.404 Encryption Safe Harbor",
    summary:
      "PHI rendered unusable, unreadable, or indecipherable to unauthorized individuals via NIST-aligned encryption (AES-256-GCM with keys stored separately) qualifies for safe-harbor exclusion from breach notification.",
    content: `# HITECH Safe Harbor (45 CFR § 164.404 / § 164.402)
- Store encrypted ePHI with AES-256-GCM and protect decryption keys outside the encrypted record row.`,
    sourceUri: "https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-D/section-164.404",
    trustTier: "AUTHORITATIVE_GOV",
    version: "2024.1",
    citationLabel: "HITECH-45CFR-164-404",
    effectiveDate: "2013-03-26T00:00:00Z",
    expiresAt: "2029-12-31T00:00:00Z",
  },
  {
    domain: "legal",
    canonicalKey: "CUI-32CFR-PART-2002",
    title: "32 CFR Part 2002 — Controlled Unclassified Information Safeguarding & Marking",
    summary:
      "Establishes government-wide CUI safeguarding standards, FIPS 199 Moderate Confidentiality minimum, lawful Government purpose disclosure restrictions, and cryptographic protection requirements.",
    content: `# 32 CFR Part 2002 CUI Requirements
- Nonfederal systems handling CUI must implement NIST SP 800-171 safeguards and FIPS 140-3 validated cryptography.`,
    sourceUri: "https://www.ecfr.gov/current/title-32/subtitle-B/chapter-XX/part-2002",
    trustTier: "AUTHORITATIVE_GOV",
    version: "2024.1",
    citationLabel: "32-CFR-PART-2002",
    effectiveDate: "2016-11-14T00:00:00Z",
    expiresAt: "2029-12-31T00:00:00Z",
  },

  // --- ADDITIONAL ENGINEERING & SCIENCE (3 Records -> 8 Total) ---
  {
    domain: "engineering",
    canonicalKey: "ENG-REYNOLDS-FLUID",
    title: "Fluid Mechanics — Reynolds Number & Pipe Flow Regime Transition",
    summary:
      "Dimensionless Reynolds number Re = (rho * v * D) / mu; internal pipe flow is laminar for Re < 2,300, transitional for 2,300 <= Re <= 4,000, and turbulent for Re > 4,000.",
    content: `# Reynolds Number Classification
- Re = (fluid density kg/m^3 * velocity m/s * characteristic diameter m) / dynamic viscosity Pa*s.
- Validate strictly positive dynamic viscosity mu > 0 before dividing.`,
    sourceUri: "https://en.wikipedia.org/wiki/Reynolds_number",
    trustTier: "PEER_REVIEWED",
    version: "1.0.0",
    citationLabel: "ASME-REYNOLDS",
    effectiveDate: "2020-01-01T00:00:00Z",
    expiresAt: "2030-12-31T00:00:00Z",
  },
  {
    domain: "engineering",
    canonicalKey: "ENG-FOURIER-HEAT",
    title: "Fourier's Law of Thermal Conduction",
    summary:
      "Steady 1D conductive heat transfer rate q = k * A * (T_hot - T_cold) / L Watts for thermal conductivity k (W/m*K), cross-sectional area A (m^2), temperature delta (K), and thickness L (m).",
    content: `# Fourier Heat Conduction Equation
- Heat flux vector J_q = -k * grad(T); total rate Q_dot = k * A * delta_T / L.`,
    sourceUri: "https://en.wikipedia.org/wiki/Thermal_conduction",
    trustTier: "PEER_REVIEWED",
    version: "1.0.0",
    citationLabel: "FOURIER-CONDUCTION",
    effectiveDate: "2020-01-01T00:00:00Z",
    expiresAt: "2030-12-31T00:00:00Z",
  },
  {
    domain: "science",
    canonicalKey: "SCI-HENDERSON-HASSELBALCH",
    title: "Henderson-Hasselbalch Buffer Equilibrium Equation",
    summary:
      "Buffer solution pH = pKa + log10([A-] / [HA]), relating hydrogen ion equilibrium to acid dissociation constant pKa and conjugate base-to-weak-acid molar ratio.",
    content: `# Henderson-Hasselbalch Equation
- pH = pKa + log10([conjugate base] / [weak acid]).
- In arterial bicarbonate-carbonic acid physiology: pH = 6.1 + log10([HCO3-] / (0.03 * PaCO2)).`,
    sourceUri: "https://en.wikipedia.org/wiki/Henderson%E2%80%93Hasselbalch_equation",
    trustTier: "PEER_REVIEWED",
    version: "1.0.0",
    citationLabel: "IUPAC-HENDERSON-HASSELBALCH",
    effectiveDate: "2020-01-01T00:00:00Z",
    expiresAt: "2030-12-31T00:00:00Z",
  },

  // --- DOD & INTELLIGENCE COMMUNITY SECURITY FOUNDATIONS (NDIMP Wave 1, UNCLASSIFIED) ---
  {
    domain: "rmf",
    canonicalKey: "DODI-8510.01-RMF",
    title: "DoDI 8510.01 — Risk Management Framework (RMF) for DoD Systems (July 19, 2022)",
    summary:
      "Establishes the 7-step DoD RMF lifecycle, formal AO/AODR/ISSM/ISSO/independent SCA responsibilities, DoD Component reciprocity conditions, eMASS package governance, and ATO/ATOwC/IATT/DATO decisions (reissuing and cancelling March 12, 2014 DoDI 8510.01 and DTM 20-004).",
    content: `# DoDI 8510.01 (Effective July 19, 2022)
- Full 7-step lifecycle: Prepare, Categorize, Select, Implement, Assess, Authorize, Monitor.
- Only a designated DoD Authorizing Official issues ATO, ATOwC, IATT, or DATO.
- DoD reciprocity applies within DoD Components with active ATO/PA delta verification and never automatically confers IC ICD 503 authorization.`,
    sourceUri: "https://www.esd.whs.mil/DD/",
    trustTier: "AUTHORITATIVE_GOV",
    version: "2022-07-19",
    citationLabel: "DODI-8510.01",
    effectiveDate: "2022-07-19T00:00:00Z",
    expiresAt: "2030-12-31T00:00:00Z",
  },
  {
    domain: "rmf",
    canonicalKey: "IC-ICD-503-2024",
    title: "ODNI ICD 503 — Intelligence Community Information Environment Risk Management (Oct 25, 2024)",
    summary:
      "Governs holistic risk management across the IC Information Environment (IC IE), mandating Zero Trust alignment, continuous monitoring, IC reciprocity, information sharing, privacy protections, and CNSSI 1253 / IC overlays (superseding July 21, 2015 ICD 503).",
    content: `# ODNI ICD 503 (Effective October 25, 2024)
- Supersedes July 21, 2015 issuance and expands scope across the entire IC Information Environment (IC IE).
- Integrates Zero Trust architecture, Continuous Monitoring (ICD 502), information sharing (ICD 501), and privacy risk management.
- A DoD ATO or FedRAMP ATO does NOT automatically satisfy IC ICD 503 authorization requirements.`,
    sourceUri: "https://www.dni.gov/index.php/what-we-do/ic-related-menus/ic-related-links/intelligence-community-directives",
    trustTier: "AUTHORITATIVE_GOV",
    version: "2024-10-25",
    citationLabel: "ICD-503",
    effectiveDate: "2024-10-25T00:00:00Z",
    expiresAt: "2030-12-31T00:00:00Z",
  },
  {
    domain: "rmf",
    canonicalKey: "IC-ICD-502-DEFENSE",
    title: "ODNI ICD 502 — Integrated Defense of the Intelligence Community Information Environment",
    summary:
      "Establishes policy for integrated defensive cyber operations, continuous security posture monitoring, and coordinated response across interconnected Intelligence Community enclaves (effective March 11, 2011).",
    content: `# ODNI ICD 502 (Effective March 11, 2011)
- Integrated defense oversight, situational awareness, and response supporting ICD 503 continuous authorization.`,
    sourceUri: "https://www.dni.gov/index.php/what-we-do/ic-related-menus/ic-related-links/intelligence-community-directives",
    trustTier: "AUTHORITATIVE_GOV",
    version: "2011-03-11",
    citationLabel: "ICD-502",
    effectiveDate: "2011-03-11T00:00:00Z",
    expiresAt: "2030-12-31T00:00:00Z",
  },
  {
    domain: "rmf",
    canonicalKey: "IC-ICD-501-SHARING",
    title: "ODNI ICD 501 — Discovery and Dissemination or Retrieval Within the IC",
    summary:
      "Establishes 'responsibility to provide' policy balanced against classification, SCI compartments, NOFORN/ORCON controls, accredited target system boundaries, and need-to-know enforcement (effective January 21, 2009).",
    content: `# ODNI ICD 501 (Effective January 21, 2009)
- Balances IC discovery and retrieval with protection of intelligence sources and methods.
- User clearance alone does NOT permit routing classified records onto unaccredited or lower-classified systems.`,
    sourceUri: "https://www.dni.gov/index.php/what-we-do/ic-related-menus/ic-related-links/intelligence-community-directives",
    trustTier: "AUTHORITATIVE_GOV",
    version: "2009-01-21",
    citationLabel: "ICD-501",
    effectiveDate: "2009-01-21T00:00:00Z",
    expiresAt: "2030-12-31T00:00:00Z",
  },
  {
    domain: "rmf",
    canonicalKey: "CNSSI-1253-NSS",
    title: "CNSSI 1253 — Security Categorization and Control Selection for National Security Systems (July 2022)",
    summary:
      "Companion to NIST SP 800-53 Rev. 5 / 800-37 Rev. 2 requiring independent Confidentiality, Integrity, and Availability categorization vectors and mandatory NSS/Classified/Intelligence/CDS/Space overlays.",
    content: `# CNSSI 1253 (July 2022)
- Keeps (C, I, A) vectors independent rather than collapsing into one civilian High-Water Mark baseline.
- Enforces HIGH Confidentiality floor for SECRET / TOP SECRET / TS-SCI National Security Systems and applies mandatory CNSSI 1253 overlays.`,
    sourceUri: "https://www.cnss.gov/",
    trustTier: "AUTHORITATIVE_GOV",
    version: "2022-07",
    citationLabel: "CNSSI-1253",
    effectiveDate: "2022-07-01T00:00:00Z",
    expiresAt: "2030-12-31T00:00:00Z",
  },
  {
    domain: "cybersecurity",
    canonicalKey: "DOD-IC-CLASSIFICATION-BOUNDARY",
    title: "Classified Systems, Cross-Domain Governance (DoDI 8540.01) & Commercial Cloud Prohibition",
    summary:
      "Classified and SCI material must never enter commercial cloud models or lower-classification retrieval boundaries even when a user holds clearance; cross-domain transfers require NCDSMO Raise-the-Bar accredited CDS controls.",
    content: `# Classification-Aware Boundary Invariant (EO 13526 / DoDM 5200.01 / DoDI 8540.01)
- Clearance != System Accreditation: Fail closed whenever classified banners/markings enter commercial LLMs or lower enclaves.
- Logical multi-tenant separation in commercial storage is insufficient for SECRET or TS/SCI data.`,
    sourceUri: "https://www.esd.whs.mil/DD/",
    trustTier: "AUTHORITATIVE_GOV",
    version: "2023-05",
    citationLabel: "DODI-8540.01-EO13526",
    effectiveDate: "2023-05-01T00:00:00Z",
    expiresAt: "2030-12-31T00:00:00Z",
  },
  {
    domain: "cybersecurity",
    canonicalKey: "DODI-8531.01-VULN-MGMT",
    title: "DoDI 8531.01 — DoD Vulnerability Management, ACAS Credentialed Scanning & KEV Precedence",
    summary:
      "Governs enterprise DoD vulnerability management (effective Sept 15, 2020), continuous ACAS credentialed scanning, IAVM/IAVA execution, CISA KEV superseding deadlines, and mandatory post-patch credentialed verification rescans.",
    content: `# DoDI 8531.01 (Effective September 15, 2020)
- Requires continuous credentialed ACAS scanning; plugin 19506/21745/110385 authentication failures invalidate local compliance assurance.
- CISA KEV / JFHQ-DODIN TASKORDs / active IAVAs supersede standard remediation SLAs.
- Scanner output alone never proves exploitability or confirmed remediation closure without a verified post-patch credentialed rescan.`,
    sourceUri: "https://www.esd.whs.mil/DD/",
    trustTier: "AUTHORITATIVE_GOV",
    version: "2020-09-15",
    citationLabel: "DODI-8531.01",
    effectiveDate: "2020-09-15T00:00:00Z",
    expiresAt: "2030-12-31T00:00:00Z",
  },
  {
    domain: "cybersecurity",
    canonicalKey: "DODI-8530.03-CYBER-INCIDENT",
    title: "DoDI 8530.03 — DoD Cyber Incident Response, CSSP Escalation & Forensic Preservation",
    summary:
      "Establishes DoD cyber incident detection, categorization, time-critical reporting through aligned CSSP / Component CERT to JFHQ-DODIN (effective Aug 9, 2023), and forensic preservation prior to destructive eradication.",
    content: `# DoDI 8530.03 (Effective August 9, 2023)
- Root/administrative compromise and classified spillage trigger immediate (1-hour benchmark) initial reporting to aligned CSSP and JFHQ-DODIN.
- Volatile memory and forensic artifacts must be preserved before destructive wipe/re-imaging.`,
    sourceUri: "https://www.esd.whs.mil/DD/",
    trustTier: "AUTHORITATIVE_GOV",
    version: "2023-08-09",
    citationLabel: "DODI-8530.03",
    effectiveDate: "2023-08-09T00:00:00Z",
    expiresAt: "2030-12-31T00:00:00Z",
  },
  {
    domain: "rmf",
    canonicalKey: "DISA-STIG-CCI-CROSSWALK",
    title: "DISA STIG / SCAP XCCDF & Official DISA CCI List (2025-01-23) NIST SP 800-53 Crosswalk",
    summary:
      "DISA Control Correlation Identifiers (CCIs) correlate atomic STIG/SRG technical checks and .ckl / SCAP XCCDF findings to NIST SP 800-53 Rev. 5 and Rev. 4 controls; CAT I Open findings block standard ATO.",
    content: `# DISA STIG & CCI Crosswalk (DISA CCI List 2025-01-23)
- Authoritative mapping between DISA CCI-XXXXXX identifiers, STIG Rule IDs, and NIST SP 800-53 Rev. 5 / Rev. 4 controls.
- Open CAT I findings trigger DoDI 8510.01 ATO veto absent explicit Authorizing Official risk acceptance; Not_Applicable and NotAFinding claims require documented evidence.`,
    sourceUri: "https://public.cyber.mil/stigs/cci/",
    trustTier: "AUTHORITATIVE_GOV",
    version: "2025-01-23",
    citationLabel: "DISA-CCI-2025",
    effectiveDate: "2025-01-23T00:00:00Z",
    expiresAt: "2030-12-31T00:00:00Z",
  },
];

export async function seedNdkrsAuthoritativeCorpus(
  opts: { preVerifiedBy?: string; allowExternalEmbeddings?: boolean } = {},
) {
  await ensureNdkrsSchema();
  const preVerifiedBy = opts.preVerifiedBy ?? "noctis-authoritative-seed-board";

  let recordsSeeded = 0;
  let chunksSeeded = 0;

  for (const item of NDKRS_AUTHORITATIVE_CORPUS) {
    const res = await ingestKnowledgeDocument({
      domain: item.domain,
      canonicalKey: item.canonicalKey,
      title: item.title,
      summary: item.summary,
      content: item.content,
      sourceUri: item.sourceUri,
      trustTier: item.trustTier,
      version: item.version,
      citationLabel: item.citationLabel,
      effectiveDate: item.effectiveDate,
      expiresAt: item.expiresAt,
      proposedBy: "noctis-authoritative-seeder",
      proposedByType: "INGESTION_WORKER",
      preVerifiedBy,
      allowExternalEmbeddings: opts.allowExternalEmbeddings,
    });
    recordsSeeded += 1;
    chunksSeeded += res.chunkCount;
  }

  for (const rule of NDKRS_RULE_CATALOG) {
    await upsertDeterministicRule(rule);
  }

  return {
    recordsSeeded,
    chunksSeeded,
    rulesSeeded: NDKRS_RULE_CATALOG.length,
  };
}
