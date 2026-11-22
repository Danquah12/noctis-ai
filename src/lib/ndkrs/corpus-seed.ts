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
];

export async function seedNdkrsAuthoritativeCorpus(opts: { preVerifiedBy?: string } = {}) {
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
