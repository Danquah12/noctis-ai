/**
 * Noctis Defense & Intelligence Community (NDIMP) — Authoritative Policy Registry
 *
 * Stores verified, versioned, unclassified metadata for DoD Instructions,
 * Intelligence Community Directives (ICDs), CNSS Instructions, and federal
 * classification/cross-domain policies with explicit boundary separation rules.
 */

export type PolicyJurisdiction = "DOD" | "IC" | "CNSS" | "FEDERAL";

export interface DodIcPolicyRecord {
  id: string;
  jurisdiction: PolicyJurisdiction;
  title: string;
  version: string;
  effectiveDate: string;
  supersededVersion: string | null;
  issuingAuthority: string;
  url: string;
  classification: "UNCLASSIFIED";
  scope: string;
  keyRequirements: string[];
  exceptions: string;
  distinctBoundaryNote: string;
}

export const DOD_IC_POLICY_REGISTRY: Record<string, DodIcPolicyRecord> = {
  "DODI-8510.01": {
    id: "DODI-8510.01",
    jurisdiction: "DOD",
    title: "Risk Management Framework (RMF) for DoD Systems",
    version: "July 19, 2022 Issuance",
    effectiveDate: "2022-07-19",
    supersededVersion: "DoDI 8510.01 (March 12, 2014) & DTM 20-004",
    issuingAuthority: "DoD Chief Information Officer (DoD CIO)",
    url: "https://www.esd.whs.mil/DD/",
    classification: "UNCLASSIFIED",
    scope:
      "Establishes the DoD Risk Management Framework across all DoD IT, platform IT, weapon systems, cloud services, and connected systems throughout the full 7-step lifecycle (Prepare, Categorize, Select, Implement, Assess, Authorize, Monitor).",
    keyRequirements: [
      "Seven-step RMF execution aligned with NIST SP 800-37 Rev. 2 (adding Prepare) and NIST SP 800-53 Rev. 5 / CNSSI 1253.",
      "Formal role accountability across Component CIO, Authorizing Official (AO), AO Designated Representative (AODR), System Owner, ISSM, ISSO, and independent Security Control Assessor (SCA).",
      "Mandatory registration and package lifecycle tracking in an approved GRC repository (e.g., DoD eMASS).",
      "Authorization reciprocity among DoD Components requires verified unexpired ATO/PA, comparable categorization/IL, CAT I review, and receiving AO acceptance.",
      "Only a designated DoD Authorizing Official issues ATO, ATO with Conditions (ATOwC), Interim Authorization to Test (IATT), or Denial of Authorization (DATO).",
    ],
    exceptions:
      "National Security Systems (NSS) also follow CNSSI 1253; Intelligence Community systems under DoD/IC cognizance must additionally satisfy ODNI ICD 503.",
    distinctBoundaryNote:
      "DoDI 8510.01 governs DoD RMF authorization decisions and reciprocity within DoD. A DoD ATO does NOT automatically satisfy ODNI ICD 503 authorization requirements in the Intelligence Community.",
  },
  "ICD-503": {
    id: "ICD-503",
    jurisdiction: "IC",
    title: "Intelligence Community Information Environment Risk Management",
    version: "October 25, 2024 Revision",
    effectiveDate: "2024-10-25",
    supersededVersion: "ICD 503 (July 21, 2015)",
    issuingAuthority: "Office of the Director of National Intelligence (ODNI)",
    url: "https://www.dni.gov/index.php/what-we-do/ic-related-menus/ic-related-links/intelligence-community-directives",
    classification: "UNCLASSIFIED",
    scope:
      "Governs holistic risk management across the Intelligence Community Information Environment (IC IE), explicitly integrating RMF authorization, Zero Trust, Continuous Monitoring, IC Reciprocity, information sharing, and privacy protections.",
    keyRequirements: [
      "Risk management spans the entire IC Information Environment (IC IE), not merely isolated standalone IT systems.",
      "Mandates Zero Trust architecture alignment, continuous monitoring (linked with ICD 502), and information-sharing readiness (linked with ICD 501).",
      "Applies CNSSI 1253 security categorization plus IC-specific and SCI security overlays and agency-specific overlays.",
      "IC Reciprocity promotes reuse of IC authorization artifacts/assessments, subject to IC IE risk alignment, compartment/SCI checks, and receiving IC AO acceptance.",
      "Requires privacy and civil-liberties risk consideration alongside security control assessment.",
    ],
    exceptions:
      "Individual IC elements (CIA, NSA, NGA, NRO, DIA, etc.) may impose mission/SCI-specific overlays; DoD/FedRAMP ATOs do not confer automatic IC reciprocity without IC IE delta verification and receiving IC AO determination.",
    distinctBoundaryNote:
      "ODNI ICD 503 (Oct 25, 2024) is legally and architecturally distinct from DoDI 8510.01 and FedRAMP; external DoD or civilian authorizations require explicit IC gap assessment and IC AO approval.",
  },
  "ICD-502": {
    id: "ICD-502",
    jurisdiction: "IC",
    title: "Integrated Defense of the Intelligence Community Information Environment",
    version: "March 11, 2011 Issuance",
    effectiveDate: "2011-03-11",
    supersededVersion: null,
    issuingAuthority: "Office of the Director of National Intelligence (ODNI)",
    url: "https://www.dni.gov/index.php/what-we-do/ic-related-menus/ic-related-links/intelligence-community-directives",
    classification: "UNCLASSIFIED",
    scope:
      "Establishes policy for integrated defensive cyber operations, continuous monitoring, situational awareness, and coordinated incident response across the IC Information Environment to protect intelligence sources, methods, and system integrity.",
    keyRequirements: [
      "Integrated IC cyber defense coordination across IC element Computer Network Defense (CND) / SOC teams.",
      "Continuous security posture monitoring, telemetry sharing, and defensive risk management supporting ICD 503 ongoing authorization.",
      "Coordinated threat response and vulnerability remediation across interconnected IC enclaves.",
    ],
    exceptions: "Agency operational procedures are governed by respective IC element CIO/AO authorities.",
    distinctBoundaryNote:
      "ICD 502 operates alongside ICD 503 within IC defensive boundaries and does not permit exposing internal IC telemetry to unaccredited commercial platforms.",
  },
  "ICD-501": {
    id: "ICD-501",
    jurisdiction: "IC",
    title: "Discovery and Dissemination or Retrieval of Information Within the Intelligence Community",
    version: "January 21, 2009 Issuance",
    effectiveDate: "2009-01-21",
    supersededVersion: null,
    issuingAuthority: "Office of the Director of National Intelligence (ODNI)",
    url: "https://www.dni.gov/index.php/what-we-do/ic-related-menus/ic-related-links/intelligence-community-directives",
    classification: "UNCLASSIFIED",
    scope:
      "Establishes 'responsibility to provide' policy making intelligence information discoverable and accessible to authorized IC consumers while preserving classification, compartmentation, originator controls, and protection of sources and methods.",
    keyRequirements: [
      "Authorized IC personnel must be able to discover and retrieve mission-relevant intelligence across IC boundaries when access eligibility and need-to-know are satisfied.",
      "Balancing responsibility-to-provide against classification levels, SCI caveats, NOFORN, ORCON originator approvals, and accredited system boundary controls.",
      "Mandatory auditing and access-attribute enforcement on shared discovery services.",
    ],
    exceptions:
      "Discovery or retrieval MUST fail closed when a consumer lacks valid clearance/compartment access OR when the receiving system/enclave is accredited below the information's classification.",
    distinctBoundaryNote:
      "User clearance alone never satisfies ICD 501 dissemination to an unaccredited or lower-classification system; accredited target boundary AND need-to-know are both required.",
  },
  "CNSSI-1253": {
    id: "CNSSI-1253",
    jurisdiction: "CNSS",
    title: "Security Categorization and Control Selection for National Security Systems",
    version: "July 2022 Update",
    effectiveDate: "2022-07-01",
    supersededVersion: "CNSSI 1253 (March 2014)",
    issuingAuthority: "Committee on National Security Systems (CNSS)",
    url: "https://www.cnss.gov/",
    classification: "UNCLASSIFIED",
    scope:
      "Provides NSS security categorization and control selection procedures aligned with NIST SP 800-53 Rev. 5 and NIST SP 800-37 Rev. 2.",
    keyRequirements: [
      "Categorizes Confidentiality, Integrity, and Availability independently—does NOT automatically collapse to a single FIPS 199 High-Water Mark baseline.",
      "Applies mandatory CNSSI 1253 security overlays (Classified Information, Intelligence, Cross-Domain Solution, Privacy, Space Platform, Industrial Control) as tailored requirements.",
      "Establishes baseline control selections specifically calibrated for classified/NSS threat environments.",
    ],
    exceptions: "Overlays and CNSSI 1253 parameter values may be tailored by the AO with documented rationale and risk acceptance.",
    distinctBoundaryNote:
      "Civilian FIPS 199 / FedRAMP uses a single High-Water Mark overall baseline, whereas CNSSI 1253 keeps C/I/A impact vectors independent and layers mandatory NSS overlays.",
  },
  "DOD-CC-SRG": {
    id: "DOD-CC-SRG",
    jurisdiction: "DOD",
    title: "DoD Cloud Computing Security Requirements Guide (CC SRG)",
    version: "DoD CC SRG v1 (Active Baseline Series)",
    effectiveDate: "2022-07-19",
    supersededVersion: null,
    issuingAuthority: "Defense Information Systems Agency (DISA)",
    url: "https://public.cyber.mil/",
    classification: "UNCLASSIFIED",
    scope:
      "Defines DoD Impact Levels IL2, IL4, IL5, and IL6 for Cloud Service Offerings (CSOs), SCCA boundary protections, and DoD Provisional Authorization (PA) vs. Component Mission Owner ATO.",
    keyRequirements: [
      "IL2: Non-CUI public/non-critical DoD data; IL4: CUI and non-NSS mission data; IL5: Higher-sensitivity CUI and unclassified NSS (dedicated tenant isolation, US Persons/CONUS, CNSSI 1253/SCCA); IL6: Classified SECRET (SIPRNet).",
      "A DISA Provisional Authorization (PA) certifies the CSP infrastructure, but each DoD Mission Owner AO must still issue a system-level ATO for the hosted workload.",
      "SCCA boundary components (BCAP, VDSS, VDMS, TCCM) required for IL4/IL5 NIPRNet-connected enclaves.",
    ],
    exceptions: "Legacy/mission-specific waivers require Component CIO and DoD CIO/AO concurrence per DoDI 8510.01.",
    distinctBoundaryNote:
      "FedRAMP High Authorization does not equal DoD IL5 PA or DoD Mission ATO, nor does it authorize SECRET (IL6) or TS/SCI processing.",
  },
  "DODI-8540.01": {
    id: "DODI-8540.01",
    jurisdiction: "DOD",
    title: "Cross Domain (CD) Policy",
    version: "DoDI 8540.01 (NCDSMO Governance)",
    effectiveDate: "2023-05-01",
    supersededVersion: null,
    issuingAuthority: "DoD CIO / National Cross Domain Strategy and Management Office (NCDSMO)",
    url: "https://www.esd.whs.mil/DD/",
    classification: "UNCLASSIFIED",
    scope:
      "Establishes policy for authorizing, implementing, and operating Cross Domain Solutions (CDS) transferring information between different security domains (e.g., High-to-Low, Low-to-High, SECRET-to-UNCLASSIFIED).",
    keyRequirements: [
      "All automated transfers across distinct security classifications/domains require an NCDSMO/Raise-the-Bar compliant, accredited Cross Domain Solution (Transfer or Access CDS).",
      "Mandatory machine-readable security labeling, digital signatures/validation, content filtering, human or rule-based release authorization, and immutable audit logging.",
      "Strict prohibition against unaccredited scripts, dual-homed hosts, or manual copy-paste bypassing CDS controls.",
    ],
    exceptions: "Air-gapped manual media transfers remain strictly governed by accredited sanitization/DTA/CTO procedures (e.g., NSA/CSS / DoDM 5200.01).",
    distinctBoundaryNote:
      "Commercial cloud APIs, multi-tenant databases, and commercial LLM endpoints are NOT accredited Cross Domain Solutions.",
  },
  "EO-13526-DODM-5200.01": {
    id: "EO-13526-DODM-5200.01",
    jurisdiction: "FEDERAL",
    title: "Classified National Security Information & DoD Information Security Program",
    version: "EO 13526 / DoDM 5200.01 Vol. 1-4 / 32 CFR Part 2002 (CUI)",
    effectiveDate: "2009-12-29",
    supersededVersion: null,
    issuingAuthority: "White House / Information Security Oversight Office (ISOO) / DoD USD(I&S)",
    url: "https://www.archives.gov/isoo/policy-documents/cnsi-eo.html",
    classification: "UNCLASSIFIED",
    scope:
      "Governs original/derivative classification levels (CONFIDENTIAL, SECRET, TOP SECRET), SCI caveats, banner and portion markings, CUI safeguards, and classified spillage response.",
    keyRequirements: [
      "User security clearance and need-to-know NEVER authorize processing, storing, or transmitting classified/SCI material on unaccredited or lower-classification systems (such as commercial cloud SaaS or commercial AI endpoints).",
      "Classified markings (e.g., SECRET//NOFORN, TOP SECRET//SI//TK) or derivative classification blocks must remain confined strictly inside accredited networks/enclaves.",
      "Potential spillage onto an unclassified/commercial system requires immediate containment, isolation, security officer notification, and sanitization per DoDM 5200.01 / agency incident procedures.",
    ],
    exceptions: "Only formally declassified, redacted, or approved public-release UNCLASSIFIED content may reside in commercial unclassified systems.",
    distinctBoundaryNote:
      "Logical tenant isolation inside a commercial unclassified database is NOT sufficient to store or route SECRET, TOP SECRET, or SCI information.",
  },
  "DODI-8531.01": {
    id: "DODI-8531.01",
    jurisdiction: "DOD",
    title: "DoD Vulnerability Management",
    version: "September 15, 2020 Issuance",
    effectiveDate: "2020-09-15",
    supersededVersion: "DoDI 8531.01 (legacy DoD IAVM/VMS directives)",
    issuingAuthority: "DoD Chief Information Officer (DoD CIO)",
    url: "https://www.esd.whs.mil/DD/",
    classification: "UNCLASSIFIED",
    scope:
      "Establishes enterprise vulnerability management across DoD Information Networks (DODIN), governing continuous ACAS/Nessus credentialed scanning, IAVM/IAVA/IAVB/IAVT orders, risk-based prioritization, and POA&M remediation tracking.",
    keyRequirements: [
      "Continuous enterprise credentialed ACAS vulnerability scanning across DoD systems and enclaves with automated reporting into VMS / eMASS.",
      "Execution and tracking of DoD Information Assurance Vulnerability Management (IAVM) alerts/bulletins (IAVA, IAVB, IAVT), USCYBERCOM / JFHQ-DODIN TASKORDs, and CISA Known Exploited Vulnerabilities (KEV) superseding deadlines.",
      "Risk-based vulnerability remediation prioritization and POA&M tracking aligned to DoDI 8510.01 RMF continuous monitoring.",
      "Mandatory post-remediation credentialed verification rescan before closing vulnerabilities or POA&M milestones.",
    ],
    exceptions:
      "Active USCYBERCOM / JFHQ-DODIN TASKORDs, IAVAs, or CISA BOD 22-01 KEV due dates supersede standard baseline remediation windows.",
    distinctBoundaryNote:
      "Scanner output alone does NOT constitute independently validated exploitability or confirmed remediation closure; credentialed scan failures hide local patch/registry gaps, and CISA KEV or JFHQ-DODIN TASKORDs supersede baseline timelines.",
  },
  "DODI-8530.03": {
    id: "DODI-8530.03",
    jurisdiction: "DOD",
    title: "Cyber Incident Response",
    version: "August 9, 2023 Issuance",
    effectiveDate: "2023-08-09",
    supersededVersion: null,
    issuingAuthority: "DoD Chief Information Officer (DoD CIO)",
    url: "https://www.esd.whs.mil/DD/",
    classification: "UNCLASSIFIED",
    scope:
      "Establishes policy and responsibilities for standardized DoD cyber incident detection, categorization, reporting, containment, forensic preservation, and defensive coordination across DoD Components and aligned Cybersecurity Service Providers (CSSPs).",
    keyRequirements: [
      "Standardized cyber incident categorization and initial reporting through aligned CSSP / Component CERT to JFHQ-DODIN and USCYBERCOM.",
      "Time-critical escalation benchmarks (immediate / 1-hour initial notification benchmark for root/administrative compromise or classified spillage per DoD incident handling procedures).",
      "Preservation of volatile and disk forensic evidence prior to destructive eradication, re-imaging, or log rotation.",
      "Structured containment, eradication, recovery verification, and post-incident remediation feedback into RMF / DoDI 8531.01.",
    ],
    exceptions: "Classified spillage events also trigger DoDM 5200.01 security officer notification and sanitization governance.",
    distinctBoundaryNote:
      "DoDI 8530.03 governs DoD cyber incident response and CSSP/JFHQ-DODIN coordination; IC element cyber defense remains separately governed under ODNI ICD 502 and agency CSIRT charters.",
  },
  "DISA-STIG-CCI": {
    id: "DISA-STIG-CCI",
    jurisdiction: "DOD",
    title: "DISA Security Technical Implementation Guides (STIGs), SRGs & Control Correlation Identifiers (CCIs)",
    version: "DISA CCI List 2025-01-23",
    effectiveDate: "2025-01-23",
    supersededVersion: null,
    issuingAuthority: "Defense Information Systems Agency (DISA) Cyber Exchange",
    url: "https://public.cyber.mil/stigs/cci/",
    classification: "UNCLASSIFIED",
    scope:
      "Provides mandatory DoD configuration hardening baselines (STIGs/SRGs), SCAP XCCDF automated compliance checks, STIG Viewer checklists (.ckl), and the authoritative DISA CCI crosswalk mapping atomic technical requirements to NIST SP 800-53 Rev. 5 / Rev. 4 controls.",
    keyRequirements: [
      "CAT I (High — ATO blocker absent explicit AO risk acceptance), CAT II (Medium), and CAT III (Low) severity classification aligned to DoDI 8510.01 RMF packages.",
      "Authoritative CCI-to-NIST SP 800-53 Rev. 5 / Rev. 4 mapping via DISA U_CCI_List.xml.",
      "SCAP XCCDF automated scanning combined with manual STIG Viewer (.ckl) inspection for non-automatable checks.",
      "Documented technical evidence or compensating controls required for every Not_Applicable or NotAFinding assertion prior to SCA review.",
    ],
    exceptions: "Tailoring or mission-required deviations must be documented as STIG waivers / POA&Ms and accepted by the Authorizing Official.",
    distinctBoundaryNote:
      "SCAP automated scans cover only a subset of STIG checks; manual STIG review and documented SCA verification remain required before closing findings or issuing ATO recommendations.",
  },
  "DOD-ZT-STRATEGY-2022": {
    id: "DOD-ZT-STRATEGY-2022",
    jurisdiction: "DOD",
    title: "DoD Zero Trust Strategy & Capability Execution Roadmap",
    version: "November 2022 Issuance",
    effectiveDate: "2022-11-22",
    supersededVersion: null,
    issuingAuthority: "DoD Chief Information Officer (DoD CIO)",
    url: "https://dodcio.defense.gov/Zero-Trust/",
    classification: "UNCLASSIFIED",
    scope:
      "Establishes the DoD Zero Trust Architecture across 7 Pillars (User, Device, Applications & Workloads, Data, Network & Environment, Automation & Orchestration, Visibility & Analytics), 45 Capabilities, and 152 Activities across Target Level (91 activities mandatory by FY 2027) and Advanced Level (61 activities).",
    keyRequirements: [
      "91 Target Level Zero Trust activities across 7 Pillars and 45 Capabilities mandated across DoD Components by the end of FY 2027.",
      "Eliminate implicit network trust via continuous Policy Decision Point (PDP) / Policy Enforcement Point (PEP) evaluation, microsegmentation, and mTLS.",
      "Bind User phishing-resistant identity (DoDI 8520.03), Device health/EDR posture, Data tagging/encryption, and centralized SIEM/SOAR visibility into access decisions.",
    ],
    exceptions: "Advanced Level (61 additional activities, 152 total) represents the post-Target FY 2032 maturation tier.",
    distinctBoundaryNote:
      "DoD Zero Trust uses 7 Pillars and 91 Target / 61 Advanced (152 total) activities with a mandatory FY 2027 Target deadline; do not conflate DoD Target compliance with CISA ZTMM v2.0's 5-pillar civilian maturity stages.",
  },
  "DODI-8520.02": {
    id: "DODI-8520.02",
    jurisdiction: "DOD",
    title: "Public Key Infrastructure (PKI) and Public Key (PK) Enabling",
    version: "May 18, 2023 Issuance",
    effectiveDate: "2023-05-18",
    supersededVersion: "DoDI 8520.02 (May 24, 2011)",
    issuingAuthority: "DoD Chief Information Officer (DoD CIO)",
    url: "https://www.esd.whs.mil/DD/",
    classification: "UNCLASSIFIED",
    scope:
      "Governs DoD Public Key Infrastructure (PKI) issuance, trust anchor validation, certificate path verification, real-time revocation checking (OCSP/CRL), Non-Person Entity (NPE) service/device certificates, and PK-enabled applications.",
    keyRequirements: [
      "Strict certificate path validation anchored to authorized DoD Root CAs / ECA / approved Federal PKI cross-certified trust anchors.",
      "Mandatory real-time certificate revocation verification via OCSP and/or current CRLs configured to fail closed when revocation status indicates revoked or unverified.",
      "Issuance and lifecycle management of Non-Person Entity (NPE) certificates for workloads, network devices, and mTLS east-west service authentication.",
      "Cryptographic operations performed exclusively inside FIPS 140-validated modules.",
    ],
    exceptions: "Disconnected/DDIL tactical environments require pre-positioned CRL/responder caching approved by the DoD AO rather than blind fail-open overrides.",
    distinctBoundaryNote:
      "Disabling OCSP/CRL checks or configuring soft-fail / fail-open revocation validation violates DoDI 8520.02 because revoked or compromised certificates continue to authenticate.",
  },
  "DODI-8520.03": {
    id: "DODI-8520.03",
    jurisdiction: "DOD",
    title: "Identity Authentication for Information Systems",
    version: "May 19, 2023 Issuance",
    effectiveDate: "2023-05-19",
    supersededVersion: "DoDI 8520.03 (May 13, 2011)",
    issuingAuthority: "DoD Chief Information Officer (DoD CIO)",
    url: "https://www.esd.whs.mil/DD/",
    classification: "UNCLASSIFIED",
    scope:
      "Establishes mandatory authentication assurance policies across DoD information systems, requiring phishing-resistant hardware credentials (CAC, PIV, DoD PKI ALT tokens, or approved FIDO2), strict privileged account separation, and elimination of reusable password-only / SMS MFA.",
    keyRequirements: [
      "Phishing-resistant hardware MFA (CAC, PIV, DoD PKI ALT token, or approved FIDO2) required for interactive network access and privileged access.",
      "Privileged administrators MUST use dedicated, separate administrative accounts bound to privileged ALT tokens rather than reusing standard daily user CAC credentials.",
      "Passwords, SMS OTP codes, email tokens, and unassisted static SSH keys without upstream hardware MFA enforcement are insufficient.",
    ],
    exceptions: "Mission/technical exceptions require documented compensating controls, AO risk acceptance, and tracked POA&M milestones.",
    distinctBoundaryNote:
      "SMS/OTP, email codes, and unassisted static SSH keys or passwords do NOT satisfy DoDI 8520.03 phishing-resistant hardware MFA requirements.",
  },
  "NSM-8": {
    id: "NSM-8",
    jurisdiction: "FEDERAL",
    title: "National Security Memorandum 8 — Improving the Cybersecurity of National Security, DoD, and IC Systems",
    version: "January 19, 2022 Issuance",
    effectiveDate: "2022-01-19",
    supersededVersion: null,
    issuingAuthority: "The White House (National Manager for NSS: NSA)",
    url: "https://www.whitehouse.gov/",
    classification: "UNCLASSIFIED",
    scope:
      "Establishes mandatory cybersecurity modernization requirements across all National Security Systems (NSS) operated by DoD, the Intelligence Community, and federal agencies, designating the NSA Director as National Manager for NSS.",
    keyRequirements: [
      "Mandatory multifactor authentication (MFA) and data-at-rest / data-in-transit encryption across all National Security Systems.",
      "Accelerated Zero Trust Architecture implementation aligned to NIST SP 800-207 and CNSS directives.",
      "Endpoint Detection and Response (EDR) coverage, standardized event logging, and formal National Manager (NSA) exception governance.",
    ],
    exceptions: "Mission-unique NSS exceptions require formal Agency Head / National Manager authorization.",
    distinctBoundaryNote:
      "NSM-8 governs NSS across DoD and the IC under NSA National Manager authority; civilian FCEB agencies follow EO 14028 / OMB M-22-09.",
  },
  "CISA-ZTMM-2.0-OMB-M22-09": {
    id: "CISA-ZTMM-2.0-OMB-M22-09",
    jurisdiction: "FEDERAL",
    title: "CISA Zero Trust Maturity Model v2.0, OMB M-22-09 & FIPS 201-3",
    version: "CISA ZTMM v2.0 (Apr 2023) / OMB M-22-09 (Jan 26, 2022) / FIPS 201-3 (Jan 2022)",
    effectiveDate: "2023-04-11",
    supersededVersion: "CISA ZTMM v1.0 (2021)",
    issuingAuthority: "CISA / OMB / NIST",
    url: "https://www.cisa.gov/zero-trust-maturity-model",
    classification: "UNCLASSIFIED",
    scope:
      "Establishes federal civilian Zero Trust requirements across 5 Pillars (Identity, Devices, Networks, Applications & Workloads, Data), 3 Cross-Cutting Capabilities (Visibility & Analytics, Automation & Orchestration, Governance), 4 maturity stages (Traditional, Initial, Advanced, Optimal), and FIPS 201-3 PIV authentication.",
    keyRequirements: [
      "Phishing-resistant MFA (PIV / WebAuthn-FIDO2 per FIPS 201-3) for enterprise identities and privileged roles.",
      "Complete device inventory/telemetry, encrypted/isolated network traffic, continuous application authorization, and automated data categorization/DLP.",
      "Architecture grounded in NIST SP 800-207 Policy Decision Point (PDP) and Policy Enforcement Point (PEP) principles.",
    ],
    exceptions: "Applicable directly to civilian FCEB agencies via OMB M-22-09; cross-walked by Noctis alongside DoD's 7-Pillar Strategy.",
    distinctBoundaryNote:
      "CISA ZTMM v2.0 & OMB M-22-09 establish federal civilian Zero Trust baselines; DoD Components must meet DoD's 7-Pillar Target FY 2027 roadmap and IC elements must meet ODNI ICD 503 Zero Trust mandates.",
  },
};

export function lookupDodIcPolicy(id: string): DodIcPolicyRecord | null {
  const key = (id || "").trim().toUpperCase().replace(/\s+/g, "-");
  if (DOD_IC_POLICY_REGISTRY[key]) return DOD_IC_POLICY_REGISTRY[key]!;
  return (
    Object.values(DOD_IC_POLICY_REGISTRY).find(
      (p) => p.id.toUpperCase() === key || p.id.replace(/[^A-Z0-9]/g, "") === key.replace(/[^A-Z0-9]/g, ""),
    ) ?? null
  );
}

export function listDodIcPolicies(jurisdiction?: PolicyJurisdiction): DodIcPolicyRecord[] {
  const all = Object.values(DOD_IC_POLICY_REGISTRY);
  return jurisdiction ? all.filter((p) => p.jurisdiction === jurisdiction) : all;
}

export function searchDodIcPolicies(question: string): DodIcPolicyRecord[] {
  const q = (question || "").toLowerCase();
  const hits: DodIcPolicyRecord[] = [];
  if (/\b(?:dodi?\s*8510|emass|dod\s+rmf|dod\s+ato|dod\s+reciproc|iatt|dato|atowc)\b/i.test(q)) {
    hits.push(DOD_IC_POLICY_REGISTRY["DODI-8510.01"]!);
  }
  if (/\b(?:dodi?\s*8531|acas\b|nessus|iava\b|iavm\b|iavb\b|vulnerability\s+management|credentialed\s+scan|21745|19506|110385)\b/i.test(q)) {
    hits.push(DOD_IC_POLICY_REGISTRY["DODI-8531.01"]!);
  }
  if (/\b(?:dodi?\s*8530|cyber\s+incident\s+response|cssp\b|jfhq-?dodin|root\s+compromise|incident\s+reporting)\b/i.test(q)) {
    hits.push(DOD_IC_POLICY_REGISTRY["DODI-8530.03"]!);
  }
  if (/\b(?:disa\s+stig|stig\b|cci-\d{6}|scap\b|xccdf|\.ckl\b|checklist|cat\s*(?:i|ii|iii|1|2|3)\b)\b/i.test(q)) {
    hits.push(DOD_IC_POLICY_REGISTRY["DISA-STIG-CCI"]!);
  }
  if (/\b(?:zero\s+trust|7[- ]?pillars?|fy\s*2027|target\s+level\s+activit|microsegment|pdp|pep|800-207)\b/i.test(q)) {
    hits.push(DOD_IC_POLICY_REGISTRY["DOD-ZT-STRATEGY-2022"]!);
  }
  if (/\b(?:dodi?\s*8520\.02|dod\s+pki|\bpki\b|ocsp\b|\bcrl\b|revocation|npe\s+cert|mtls|root\s+ca)\b/i.test(q)) {
    hits.push(DOD_IC_POLICY_REGISTRY["DODI-8520.02"]!);
  }
  if (/\b(?:dodi?\s*8520\.03|\bicam\b|\bcac\b|\bpiv\b|alt\s+token|alternate\s+logon|fips\s*201|privileged\s+access|\bpam\b|\bjit\b|phishing[- ]resistant)\b/i.test(q)) {
    hits.push(DOD_IC_POLICY_REGISTRY["DODI-8520.03"]!);
  }
  if (/\b(?:nsm[- ]?8|national\s+security\s+memorandum\s*8|national\s+manager\s+for\s+nss)\b/i.test(q)) {
    hits.push(DOD_IC_POLICY_REGISTRY["NSM-8"]!);
  }
  if (/\b(?:ztmm|cisa\s+zero\s+trust|omb\s+m-?22-?09|m-22-09|fips\s*201-?3|800-207)\b/i.test(q)) {
    hits.push(DOD_IC_POLICY_REGISTRY["CISA-ZTMM-2.0-OMB-M22-09"]!);
  }
  if (/\b(?:icd\s*503|ic\s+rmf|ic\s+ie|ic\s+reciproc|ic\s+ato|ic\s+cloud|ic\s+overlay|intelligence\s+community\s+security)\b/i.test(q)) {
    hits.push(DOD_IC_POLICY_REGISTRY["ICD-503"]!);
  }
  if (/\b(?:icd\s*502|integrated\s+defense)\b/i.test(q)) {
    hits.push(DOD_IC_POLICY_REGISTRY["ICD-502"]!);
  }
  if (/\b(?:icd\s*501|responsibility\s+to\s+provide|ic\s+disseminat|ic\s+discovery|orcon|noforn)\b/i.test(q)) {
    hits.push(DOD_IC_POLICY_REGISTRY["ICD-501"]!);
  }
  if (/\b(?:cnssi\s*1253|national\s+security\s+system|nss\b|sci\s+overlay|intelligence\s+overlay)\b/i.test(q)) {
    hits.push(DOD_IC_POLICY_REGISTRY["CNSSI-1253"]!);
  }
  if (/\b(?:cc\s*srg|dod\s+il[2456]|il[456]\b|scca|provisional\s+authorization)\b/i.test(q)) {
    hits.push(DOD_IC_POLICY_REGISTRY["DOD-CC-SRG"]!);
  }
  if (/\b(?:8540|cross[- ]?domain|ncdsmo|\bcds\b|high[- ]to[- ]low|low[- ]to[- ]high)\b/i.test(q)) {
    hits.push(DOD_IC_POLICY_REGISTRY["DODI-8540.01"]!);
  }
  if (/\b(?:classified|spillage|secret|top\s*secret|ts\/?sci|dodm\s*5200|eo\s*13526|commercial\s+cloud)\b/i.test(q)) {
    hits.push(DOD_IC_POLICY_REGISTRY["EO-13526-DODM-5200.01"]!);
  }
  if (hits.length === 0) {
    return [DOD_IC_POLICY_REGISTRY["DODI-8510.01"]!, DOD_IC_POLICY_REGISTRY["ICD-503"]!, DOD_IC_POLICY_REGISTRY["CNSSI-1253"]!];
  }
  return hits;
}
