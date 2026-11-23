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
  "ICD-705-SCIF": {
    id: "ICD-705-SCIF",
    jurisdiction: "IC",
    title: "Sensitive Compartmented Information Facilities (ICD 705 / ICS 705-1 / IC Tech Spec v1.5.1)",
    version: "ICD 705 (May 26, 2010) / ICS 705-1 (Sept 17, 2010) / Tech Spec v1.5.1 (July 2021)",
    effectiveDate: "2010-05-26",
    supersededVersion: "DCID 6/9 Physical Security Standards for SCIFs",
    issuingAuthority: "Office of the Director of National Intelligence (ODNI)",
    url: "https://www.dni.gov/index.php/what-we-do/ic-related-menus/ic-related-links/intelligence-community-directives",
    classification: "UNCLASSIFIED",
    scope:
      "Establishes physical, acoustic, RF shielding, Intrusion Detection System (IDS), access control, Fixed Facility Checklist (FFC), and accreditation requirements for facilities storing, processing, or discussing SCI.",
    keyRequirements: [
      "Formal written SCIF accreditation must be granted by the Cognizant Security Authority (CSA) / Accrediting Official (AO) using an up-to-date Fixed Facility Checklist (FFC) and TEMPEST/acoustic certification.",
      "Unauthorized Portable Electronic Devices (PEDs) including smartphones, Bluetooth devices, smartwatches, and wireless transmitters are strictly prohibited inside accredited SCIF boundaries.",
      "Continuous UL 2050-compliant IDS alarm monitoring, positive access control, visitor escorting, and formal co-utilization agreements are mandatory.",
    ],
    exceptions: "Emergency or mission PED waivers require formal written AO approval and compensating technical/physical controls.",
    distinctBoundaryNote:
      "Only the designated CSA / Accrediting Official grants SCIF accreditation; Noctis models UNCLASSIFIED public ICD 705 governance and never fabricates classified site attenuation parameters.",
  },
  "DODI-8523.01-CNSSI-4005": {
    id: "DODI-8523.01-CNSSI-4005",
    jurisdiction: "CNSS",
    title: "DoDI 8523.01 Communications Security (COMSEC) & CNSSI 4005 Safeguarding COMSEC Material",
    version: "DoDI 8523.01 (Jan 6, 2021) / CNSSI 4005 (Aug 22, 2011; Updated May 2024)",
    effectiveDate: "2021-01-06",
    supersededVersion: "Legacy DoDI 8523.01 (April 2008)",
    issuingAuthority: "DoD CIO / Committee on National Security Systems (CNSS)",
    url: "https://www.esd.whs.mil/DD/",
    classification: "UNCLASSIFIED",
    scope:
      "Governs COMSEC doctrine, NSA-certified Type 1 cryptographic equipment, Key Management Infrastructure (KMI) / EKMS accounting, Two-Person Integrity (TPI), COMSEC Custodian responsibilities, and emergency zeroization.",
    keyRequirements: [
      "NSA Type 1 encryption (or formally approved NSA CSfC dual-layer package) required to protect classified information in transit across non-protected links.",
      "Strict Two-Person Integrity (TPI) mandatory for designated Top Secret / COMSEC key material, KMI accounting, and appointed COMSEC Custodian oversight.",
      "Verified emergency zeroization procedures and immediate COMSEC incident reporting to NSA/Component COMSEC authority on suspected compromise.",
    ],
    exceptions: "Tactical DDIL/expeditionary key fill waivers require Component COMSEC / NSA authorization.",
    distinctBoundaryNote:
      "Standard commercial FIPS 140 cryptography alone does NOT constitute Type 1 COMSEC protection for classified NSS transport.",
  },
  "CNSSP-15-CNSA-2.0-CSFC": {
    id: "CNSSP-15-CNSA-2.0-CSFC",
    jurisdiction: "CNSS",
    title: "CNSSP 15 CNSA 2.0 Post-Quantum Standards & NSA Commercial Solutions for Classified (CSfC)",
    version: "CNSSP 15 (Released March 4, 2025; Signed Feb 28, 2025) & NSA CSfC Framework",
    effectiveDate: "2025-03-04",
    supersededVersion: "CNSSP 15 CNSA 1.0 (2015 / 2022 Advisory Transition)",
    issuingAuthority: "Committee on National Security Systems (CNSS) / NSA",
    url: "https://www.cnss.gov/",
    classification: "UNCLASSIFIED",
    scope:
      "Establishes mandatory National Security System (NSS) post-quantum cryptographic suite CNSA 2.0 (AES-256, ML-KEM-1024, ML-DSA-87, LMS/XMSS) with transition deadlines (Jan 1, 2027 new acquisitions; Dec 31, 2030 phase-out; Dec 31, 2031 mandatory), plus NSA CSfC dual-layer encryption architecture.",
    keyRequirements: [
      "CNSA 2.0 algorithms: AES-256 (FIPS 197) symmetric, ML-KEM-1024 (FIPS 203) key establishment, ML-DSA-87 (FIPS 204) digital signatures, and LMS/XMSS (NIST SP 800-208) software/firmware signing; classical RSA/ECDH/ECDSA deprecated.",
      "NSS transition milestones: new NSS acquisitions compliant by Jan 1, 2027; legacy non-CNSA 2.0 phase-out by Dec 31, 2030; mandatory operational protocol enforcement by Dec 31, 2031.",
      "NSA CSfC classified transit requires TWO independent layers of commercial encryption from distinct vendors/implementations on the NSA CSfC Components List, independent key management, a registered Capability Package, and AO approval.",
    ],
    exceptions: "NSA-approved transition waivers prior to Dec 31, 2030/2031 operational cutoffs must track PO&M/mitigation to CNSA 2.0.",
    distinctBoundaryNote:
      "A single layer of commercial VPN or TLS NEVER satisfies NSA CSfC requirements for classified traffic, regardless of AES-256 key strength.",
  },
  "CNSSAM-TEMPEST-01-13": {
    id: "CNSSAM-TEMPEST-01-13",
    jurisdiction: "CNSS",
    title: "CNSSAM TEMPEST/01-13 RED/BLACK Installation Guidance (EMSEC)",
    version: "January 2014 Issuance",
    effectiveDate: "2014-01-01",
    supersededVersion: "NSTISSAM TEMPEST/2-95 (December 12, 1995)",
    issuingAuthority: "Committee on National Security Systems (CNSS)",
    url: "https://www.cnss.gov/",
    classification: "UNCLASSIFIED",
    scope:
      "Governs compromising emanations (EMSEC/TEMPEST), RED (unencrypted classified) vs. BLACK (encrypted/unclassified) wiring/power/ground separation, Protected Distribution Systems (PDS), and Certified TEMPEST Technical Authority (CTTA) site assessments.",
    keyRequirements: [
      "Physical and electrical separation between RED (classified unencrypted) equipment/cabling and BLACK (encrypted/unclassified) lines, power, and grounding.",
      "Unshielded wireless/RF transmitters (Wi-Fi, Bluetooth, cellular) are prohibited near RED classified processing equipment.",
      "Accredited Protected Distribution Systems (PDS) required for unencrypted classified cabling outside an inspectable SCIF boundary; formal CTTA inspection required.",
    ],
    exceptions: "Classified facility TEMPEST zoning, dB attenuation figures, and exact site separation measurements are CTTA determinations governed within accredited classified channels.",
    distinctBoundaryNote:
      "Noctis NEVER fabricates or stores classified site-specific TEMPEST separation distances or dB shielding specs; CTTA site engineering determines exact classified parameters.",
  },
  "NIST-SP-800-88-R2": {
    id: "NIST-SP-800-88-R2",
    jurisdiction: "FEDERAL",
    title: "NIST SP 800-88 Rev. 2 Guidelines for Media Sanitization & DoDM 5200.01 Spillage",
    version: "NIST SP 800-88 Rev. 2 (September 2025)",
    effectiveDate: "2025-09-01",
    supersededVersion: "NIST SP 800-88 Rev. 1 (December 2014)",
    issuingAuthority: "National Institute of Standards and Technology (NIST) / DoD USD(I&S)",
    url: "https://csrc.nist.gov/pubs/sp/800/88/r2/final",
    classification: "UNCLASSIFIED",
    scope:
      "Establishes media sanitization categories (Clear, Purge, Destroy), verification testing, and Certificate of Sanitization/Destruction requirements aligned with DoDM 5200.01 classified media handling and spillage response.",
    keyRequirements: [
      "Clear (logical OS formatting/overwrite) NEVER sanitizes classified media leaving an accredited boundary for unclassified release.",
      "Magnetic degaussing does NOT erase solid-state drives (SSDs) or NAND flash memory.",
      "Top Secret / SCI media released outside accredited custody requires NSA/CSS Evaluated Products List (EPL) physical destruction (disintegration, incineration, melting, or high-security cross-cut/particle shredding) with a Certificate of Destruction.",
    ],
    exceptions: "Same-enclave media reuse inside an accredited enclave may use AO-approved Purge/re-keying; classified spillage requires forensic containment before sanitization.",
    distinctBoundaryNote:
      "Degaussing does not sanitize SSD/flash storage, and Clear/formatting never declassifies TS/SCI or SECRET media for unclassified disposal.",
  },
  "DODI-5205.16-EO-13587": {
    id: "DODI-5205.16-EO-13587",
    jurisdiction: "DOD",
    title: "DoDI 5205.16 The DoD Insider Threat Program & EO 13587 Classified Network Reforms",
    version: "DoDI 5205.16 (Dec 20, 2024) / EO 13587 (Oct 7, 2011)",
    effectiveDate: "2024-12-20",
    supersededVersion: "DoDD 5205.16 (September 30, 2014)",
    issuingAuthority: "DoD USD(I&S) / White House",
    url: "https://www.esd.whs.mil/DD/",
    classification: "UNCLASSIFIED",
    scope:
      "Establishes DoD Component Insider Threat Hubs, User Activity Monitoring (UAM) across classified/sensitive networks, multi-disciplinary threat referrals, and mandatory legal, privacy, and civil-liberties oversight.",
    keyRequirements: [
      "Maintain a centralized Component Insider Threat Hub fusing HR, security, counterintelligence, and User Activity Monitoring (UAM) indicators.",
      "Deploy UAM on classified networks capable of detecting unauthorized bulk exfiltration, anomalous removable media writes, and off-hours privilege abuse.",
      "Enforce mandatory legal, privacy, and civil-liberties oversight and human investigator adjudication prior to administrative or disciplinary action.",
    ],
    exceptions: "Unilateral automated AI punitive personnel action without human/legal review is prohibited.",
    distinctBoundaryNote:
      "Insider threat monitoring must balance classified safeguarding under EO 13587 / DoDI 5205.16 with strict privacy/civil-liberties and human adjudication oversight.",
  },
  "NIST-SP-800-86-FORENSICS": {
    id: "NIST-SP-800-86-FORENSICS",
    jurisdiction: "FEDERAL",
    title: "NIST SP 800-86 Guide to Integrating Forensic Techniques into Incident Response",
    version: "August 2006 Publication",
    effectiveDate: "2006-08-01",
    supersededVersion: null,
    issuingAuthority: "National Institute of Standards and Technology (NIST)",
    url: "https://csrc.nist.gov/pubs/sp/800/86/final",
    classification: "UNCLASSIFIED",
    scope:
      "Governs digital forensic readiness, volatile memory-first order of volatility acquisition, hardware write-blocking, SHA-256 cryptographic hashing, UTC/NTP timeline correlation, and formal chain of custody alongside DoDI 8530.03 and DCO/SOC detection.",
    keyRequirements: [
      "Capture volatile RAM/network connections BEFORE rebooting, wiping, or re-imaging compromised hosts.",
      "Use verified hardware/software write-blockers and compute cryptographic hashes immediately upon disk/artifact acquisition.",
      "Preserve continuous chain-of-custody records and NTP-synchronized UTC timestamps before asserting no intrusion or closing SOC investigations.",
    ],
    exceptions: "Life-safety/active ransomware containment may isolate hosts at network layer first while still preserving RAM snapshots before re-image.",
    distinctBoundaryNote:
      "Absence of SOC/EDR telemetry is NOT evidence of absence of intrusion; missing logs block clean-bill-of-health DCO assertions.",
  },
  "NIST-SP-800-218-SSDF": {
    id: "NIST-SP-800-218-SSDF",
    jurisdiction: "DOD",
    title: "NIST SP 800-218 v1.1 SSDF, DoD Enterprise DevSecOps (cATO/CtF) & Container/K8s Hardening",
    version: "NIST SP 800-218 v1.1 (Feb 2022) & DoD cATO / NSA-CISA K8s Guide",
    effectiveDate: "2022-02-01",
    supersededVersion: "NIST SP 800-218 v1.0 (2020 Draft)",
    issuingAuthority: "NIST / DoD CIO / NSA / CISA",
    url: "https://csrc.nist.gov/pubs/sp/800/218/final",
    classification: "UNCLASSIFIED",
    scope:
      "Defines Secure Software Development Framework (SSDF) practices, DoD Continuous ATO (cATO) / Certificate to Field (CtF) CI/CD gates, signed SBOMs/SLSA provenance, and NSA/CISA Kubernetes & DISA Container STIG hardening.",
    keyRequirements: [
      "Continuous automated SAST, DAST, dependency/KEV gating, signed SBOMs (CycloneDX/SPDX), and SLSA provenance verification prior to production promotion.",
      "Continuous runtime monitoring and active DevSecOps security team oversight required for DoD cATO — a one-time scan never qualifies for cATO.",
      "Kubernetes/container workloads MUST prohibit privileged containers, UID 0 root execution, and hostNetwork/hostPID sharing per NSA/CISA & DISA STIG guidance.",
    ],
    exceptions: "Mission-critical legacy container waivers require explicit AO risk acceptance and compensating admission-controller isolation.",
    distinctBoundaryNote:
      "Under DoD CC SRG, inheriting a DISA Provisional Authorization (PA) or FedRAMP High authorization NEVER grants an application's DoD Mission Owner ATO or Continuous ATO automatically.",
  },
  "DODD-3000.09-RAI": {
    id: "DODD-3000.09-RAI",
    jurisdiction: "DOD",
    title: "DoDD 3000.09 Autonomy in Weapon Systems & DoD Responsible AI Ethical Principles",
    version: "DoDD 3000.09 (Jan 25, 2023) & DoD RAI Strategy (June 2022)",
    effectiveDate: "2023-01-25",
    supersededVersion: "DoDD 3000.09 (November 21, 2012)",
    issuingAuthority: "Office of the Secretary of Defense (DoD)",
    url: "https://www.esd.whs.mil/DD/",
    classification: "UNCLASSIFIED",
    scope:
      "Governs design, testing, Senior Review, and operational employment of autonomous/semi-autonomous weapon systems under DoDD 3000.09 plus the 5 DoD Responsible AI Principles (Responsible, Equitable, Traceable, Reliable, Governable).",
    keyRequirements: [
      "Autonomous and semi-autonomous systems MUST allow commanders and operators to exercise appropriate levels of human judgment over the use of force.",
      "Formal Senior Review (USD(P)/USD(R&E)/VCJCS) and rigorous V&V/T&E required prior to formal development and fielding of covered autonomous weapon systems.",
      "All DoD AI capabilities must enforce Responsible, Equitable, Traceable, Reliable, and Governable controls including human override / disengagement mechanisms.",
    ],
    exceptions: "Specific defensive human-supervised systems remain explicitly governed by DoDD 3000.09 Enclosure Senior Review protocols.",
    distinctBoundaryNote:
      "Fully unsupervised autonomous lethal targeting without appropriate human judgment and Senior Review violates DoDD 3000.09 (Jan 25, 2023).",
  },
  "NIST-AI-RMF-600-1": {
    id: "NIST-AI-RMF-600-1",
    jurisdiction: "FEDERAL",
    title: "NIST AI 100-1 AI RMF 1.0, NIST AI 600-1 GenAI Profile & OWASP LLM/Agentic Adversarial Assurance",
    version: "AI 100-1 (Jan 26, 2023) & AI 600-1 GenAI Profile (July 26, 2024)",
    effectiveDate: "2024-07-26",
    supersededVersion: "NIST AI RMF 1.0 Baseline only (Jan 2023)",
    issuingAuthority: "National Institute of Standards and Technology (NIST)",
    url: "https://www.nist.gov/itl/ai-risk-management-framework",
    classification: "UNCLASSIFIED",
    scope:
      "Provides GOVERN, MAP, MEASURE, and MANAGE risk management functions plus generative/agentic AI safeguards (prompt injection resistance, confabulation/hallucination grounding, data/classification boundary protection, signed model supply chain, red teaming).",
    keyRequirements: [
      "Execute GOVERN, MAP, MEASURE, and MANAGE controls continuously across training data, model weights, tool/agent invocation, and deployment monitoring.",
      "Test and block direct/indirect prompt injection, unauthorized tool execution, classification boundary leakage, and autonomous policy self-approval.",
      "Pair generative AI outputs with deterministic verification, source grounding, and reproducible audit logging.",
    ],
    exceptions: "Sandboxed non-production red-team exercises must still keep classified data outside commercial endpoints.",
    distinctBoundaryNote:
      "Defense AI agents may never autonomously approve security policy rollouts or override human Authorizing Officials.",
  },
  "ICD-203-206-ANALYTIC": {
    id: "ICD-203-206-ANALYTIC",
    jurisdiction: "IC",
    title: "ODNI ICD 203 Analytic Standards & ICD 206 Sourcing Requirements (ACH & NATO 6x6)",
    version: "ICD 203 / ICD 206 (Jan 2, 2015; Tech Amend Jan 2022; Revalidated June 2023)",
    effectiveDate: "2015-01-02",
    supersededVersion: "ICD 203 (June 21, 2007) / ICD 206 (Oct 17, 2007)",
    issuingAuthority: "Office of the Director of National Intelligence (ODNI)",
    url: "https://www.dni.gov/index.php/what-we-do/ic-related-menus/ic-related-links/intelligence-community-directives",
    classification: "UNCLASSIFIED",
    scope:
      "Mandates rigorous IC analytic tradecraft standards: objectivity, independence from political consideration, structured analysis of alternatives (e.g., Analysis of Competing Hypotheses - ACH), explicit key assumptions, calibrated confidence/likelihood language, and ICD 206 source characterization using NATO/Admiralty 6x6 reliability/credibility ratings.",
    keyRequirements: [
      "Distinguish underlying intelligence reporting from analyst judgments/assumptions and clearly evaluate plausible alternative hypotheses using ACH disconfirming evidence.",
      "Express uncertainty with calibrated likelihood terms and explicitly justify Confidence Levels (High, Moderate, Low) against source reliability and corroboration.",
      "Single-source uncorroborated reporting graded E/F or 5/6 (e.g., F6 'cannot be judged') CANNOT justify a High Confidence judgment.",
    ],
    exceptions: "Time-sensitive current warning caveats must explicitly annotate preliminary single-source nature and low confidence.",
    distinctBoundaryNote:
      "In ICD 203 tradecraft and ACH falsification, hypotheses are evaluated by disconfirming (INCONSISTENT) evidence — high confidence on F6 single-source intel violates ICD 203/206.",
  },
  "MULTI-INT-FUSION-GOV": {
    id: "MULTI-INT-FUSION-GOV",
    jurisdiction: "IC",
    title: "UNCLASSIFIED / Synthetic Multi-INT Fusion (OSINT/GEOINT/SIGINT) & Counterintelligence Standards",
    version: "2023 Public Multi-INT Tradecraft Baseline",
    effectiveDate: "2023-01-01",
    supersededVersion: null,
    issuingAuthority: "DoD / ODNI Public Tradecraft & Synthetic Range Governance",
    url: "https://www.dni.gov/",
    classification: "UNCLASSIFIED",
    scope:
      "Governs unclassified/synthetic cross-discipline correlation across OSINT provenance/deception checks, GEOINT WGS-84 spatial coordinate correlation (Haversine delta), public ITU RF spectrum band mapping for SIGINT metadata, and counterintelligence anomaly checks.",
    keyRequirements: [
      "Enforce strict Gate 0 boundary: commercial/unclassified fusion instances accept ONLY UNCLASSIFIED or synthetic training data.",
      "Require independent multi-INT corroboration before elevating findings to verified ground truth; uncorroborated single-INT OSINT or unverified imagery alone fails ground-truth validation.",
      "Verify geospatial alignment (Haversine distance within sensor tolerance) and source provenance to surface spoofing or adversary deception.",
    ],
    exceptions: "Operational classified Multi-INT fusion executes strictly inside accredited JWICS/NSANet SCIF enclaves.",
    distinctBoundaryNote:
      "Uncorroborated single-source OSINT never equals Multi-INT verified ground truth.",
  },
  "DODI-3020.45-DODD-3020.40": {
    id: "DODI-3020.45-DODD-3020.40",
    jurisdiction: "DOD",
    title: "DoDI 3020.45 Mission Assurance Construct & DoDD 3020.40 Mission Assurance (MEF/DCIP)",
    version: "DoDI 3020.45 (Aug 14, 2018; Ch. 1 May 2, 2022) & DoDD 3020.40 (Nov 29, 2016; Ch. 1 Sept 11, 2018)",
    effectiveDate: "2018-08-14",
    supersededVersion: "DoDI 3020.45 (April 21, 2008)",
    issuingAuthority: "DoD USD(Policy)",
    url: "https://www.esd.whs.mil/DD/",
    classification: "UNCLASSIFIED",
    scope:
      "Establishes the DoD Mission Assurance Construct mapping Primary Mission Essential Functions (PMEFs) and MEFs to Defense/Task Critical Assets (DCAs/TCAs), cyber/power/comms dependencies, Single Points of Failure (SPOFs), and continuity resilience.",
    keyRequirements: [
      "Map end-to-end dependency graphs linking MEFs/PMEFs to supporting IT, OT/ICS, energy, communications, and supply assets.",
      "Identify Single Points of Failure (SPOFs) and calculate mission blast radius for non-redundant Task Critical Assets.",
      "Track continuity, backup failover, and risk mitigation across mission owners and Combatant Commands.",
    ],
    exceptions: "Accepted mission risk on unmitigated SPOFs requires Combatant Commander / Component Mission Owner sign-off.",
    distinctBoundaryNote:
      "System-level cyber ATO compliance alone does NOT validate Mission Assurance if a non-redundant power/comms/host SPOF threatens critical MEFs.",
  },
  "CMMC-32CFR-170-DFARS": {
    id: "CMMC-32CFR-170-DFARS",
    jurisdiction: "DOD",
    title: "32 CFR Part 170 (CMMC Final Rule), 48 CFR Part 204 / DFARS 252.204-7012/7019/7020/7021 & FAR 52.204-21",
    version: "32 CFR Part 170 (Dec 16, 2024) & 48 CFR Part 204 DFARS Acquisition Rule (Nov 10, 2025)",
    effectiveDate: "2024-12-16",
    supersededVersion: "CMMC 1.0 Interim Model (2020)",
    issuingAuthority: "DoD CIO / Federal Register",
    url: "https://www.ecfr.gov/current/title-32/subtitle-A/chapter-I/subchapter-G/part-170",
    classification: "UNCLASSIFIED",
    scope:
      "Governs Defense Industrial Base (DIB) CMMC Levels 1–3 certification, SPRS scoring, conditional POA&M eligibility (32 CFR § 170.21: >=80% requirements met, zero 5-pt/non-POA&M controls open, 180-day closeout), DFARS 252.204-7012 72-hour DIBNet cyber reporting, and NIST SP 800-171 Rev. 2 vs. Rev. 3 contract alignment.",
    keyRequirements: [
      "CMMC Level 2 Conditional Status allows POA&Ms ONLY when score is >= 80% (>= 88/110), zero high-weighted 5-point/excluded controls remain open, and ALL POA&M items close within 180 days.",
      "DFARS 252.204-7012 mandates FedRAMP Moderate (or equivalent) security for external cloud CUI processors and cyber incident reporting to DoD (DIBNet) within 72 hours of discovery.",
      "DFARS 252.204-7019/7020/7021 mandate current SPRS assessment scores and required CMMC level prior to contract award/option exercise.",
    ],
    exceptions: "32 CFR § 170.21 limits which SP 800-171 controls are POA&M-eligible; FIPS-validated crypto and critical access/audit items cannot be deferred indefinitely.",
    distinctBoundaryNote:
      "CMMC Level 2 POA&Ms exceeding 180 days or scoring below 80% (< 88/110) fail Conditional Certification under 32 CFR § 170.21.",
  },
  "NISPOM-32CFR-117-FOCI": {
    id: "NISPOM-32CFR-117-FOCI",
    jurisdiction: "DOD",
    title: "32 CFR Part 117 National Industrial Security Program Operating Manual (NISPOM) & FOCI",
    version: "February 24, 2021 Final Rule",
    effectiveDate: "2021-02-24",
    supersededVersion: "DoD 5220.22-M NISPOM Manual (2006)",
    issuingAuthority: "DoD USD(I&S) / Defense Counterintelligence and Security Agency (DCSA)",
    url: "https://www.ecfr.gov/current/title-32/subtitle-A/chapter-I/subchapter-D/part-117",
    classification: "UNCLASSIFIED",
    scope:
      "Codifies Facility Clearance (FCL), Personnel Clearance (PCL), Foreign Ownership, Control, or Influence (FOCI) mitigation instruments (Board Resolution, SCA, SSA, Proxy Agreement, Voting Trust), Insider Threat, and industrial Supply Chain Risk Management (SCRM).",
    keyRequirements: [
      "Cleared Defense Contractors subject to FOCI CANNOT hold an active Facility Clearance (FCL) without an executed DCSA-approved FOCI mitigation instrument (SSA, Proxy Agreement, Voting Trust, SCA, or Board Resolution as permitted).",
      "Mandatory reporting of material ownership/control changes, foreign subcontracts, and adverse insider/cyber events to DCSA.",
    ],
    exceptions: "Limited NID (National Interest Determination) exceptions required under SSA for proscribed information.",
    distinctBoundaryNote:
      "Unmitigated Foreign Ownership, Control, or Influence (FOCI) blocks Facility Clearance eligibility under 32 CFR § 117.11.",
  },
  "SPD-5-DODI-4650.01-5000.97": {
    id: "SPD-5-DODI-4650.01-5000.97",
    jurisdiction: "DOD",
    title: "Space Policy Directive-5 (SPD-5), DoDI 4650.01 Spectrum Management & DoDI 5000.97 Digital Engineering",
    version: "SPD-5 (Sept 4, 2020) / DoDI 4650.01 (Jan 9, 2009; Ch.1 2017) / DoDI 5000.97 (Dec 21, 2023)",
    effectiveDate: "2023-12-21",
    supersededVersion: "Legacy paper-centric DoD acquisition modeling prior to DoDI 5000.97",
    issuingAuthority: "White House / DoD CIO / USD(R&E)",
    url: "https://www.esd.whs.mil/DD/",
    classification: "UNCLASSIFIED",
    scope:
      "Integrates space vehicle cybersecurity (SPD-5 encrypted/authenticated TT&C command links, anti-jam/anti-spoof, CNSSI 1253 Space Overlay), Electromagnetic Spectrum certification/host-nation coordination (DoDI 4650.01), Model-Based Systems Engineering Authoritative Source of Truth (DoDI 5000.97), and operational readiness/availability (Ao = MTBF/(MTBF+MTTR)).",
    keyRequirements: [
      "Space system Telemetry, Tracking, and Commanding (TT&C) links MUST enforce end-to-end encryption and strong authentication to prevent unauthorized spacecraft commanding.",
      "RF-emitting defense systems require formal spectrum certification and host-nation coordination per DoDI 4650.01 before operational deployment.",
      "DoDI 5000.97 mandates authoritative digital engineering MBSE models with end-to-end requirements/verification traceability and operational availability (Ao) tracking.",
    ],
    exceptions: "Emergency operational waivers for spectrum deconfliction require Combatant Command J6/J3 spectrum authority.",
    distinctBoundaryNote:
      "Unencrypted space TT&C command links violate Space Policy Directive-5 (Sept 4, 2020) and CNSSI 1253 Space Overlay regardless of orbit regime.",
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
  if (/\b(?:scif\b|icd\s*705|ics\s*705|fixed\s+facility\s+checklist|\bffc\b|\bpeds?\b|portable\s+electronic\s+device|ul\s*2050|ids\s+alarm)\b/i.test(q)) {
    hits.push(DOD_IC_POLICY_REGISTRY["ICD-705-SCIF"]!);
  }
  if (/\b(?:comsec\b|dodi?\s*8523|cnssi?\s*4005|type\s*1\s+(?:crypto|encrypt\w*)|two[- ]person\s+integrity|\btpi\b|kmi\b|ekms\b|zeroiz\w*)\b/i.test(q)) {
    hits.push(DOD_IC_POLICY_REGISTRY["DODI-8523.01-CNSSI-4005"]!);
  }
  if (/\b(?:csfc\b|commercial\s+solutions\s+for\s+classified|cnssp\s*15|cnsa\s*2\.0|ml-?kem|ml-?dsa|\blms\b|\bxmss\b|dual[- ]layer\s+encrypt\w*)\b/i.test(q)) {
    hits.push(DOD_IC_POLICY_REGISTRY["CNSSP-15-CNSA-2.0-CSFC"]!);
  }
  if (/\b(?:tempest\b|red\/?black|ctta\b|emsec\b|protected\s+distribution\s+system|\bpds\b)\b/i.test(q)) {
    hits.push(DOD_IC_POLICY_REGISTRY["CNSSAM-TEMPEST-01-13"]!);
  }
  if (/\b(?:800-88|media\s+sanitiz\w*|degauss\w*|nsa\/css\s+epl|certificate\s+of\s+destruction|ssd\s+flash)\b/i.test(q)) {
    hits.push(DOD_IC_POLICY_REGISTRY["NIST-SP-800-88-R2"]!);
  }
  if (/\b(?:5205\.16|eo\s*13587|insider\s+threat|user\s+activity\s+monitoring|\buam\b)\b/i.test(q)) {
    hits.push(DOD_IC_POLICY_REGISTRY["DODI-5205.16-EO-13587"]!);
  }
  if (/\b(?:800-86|forensic\w*|chain\s+of\s+custody|write[- ]?block\w*|volatile\s+memory|dco\b|soc\s+telemetry|sigma\s+rule|yara\s+rule)\b/i.test(q)) {
    hits.push(DOD_IC_POLICY_REGISTRY["NIST-SP-800-86-FORENSICS"]!);
  }
  if (/\b(?:800-218|ssdf\b|devsecops\b|cato\b|continuous\s+ato|certificate\s+to\s+field|\bctf\b|slsa\b|kubernetes\s+(?:stig|harden\w*)|k8s\s+(?:stig|harden\w*)|privileged\s+container)\b/i.test(q)) {
    hits.push(DOD_IC_POLICY_REGISTRY["NIST-SP-800-218-SSDF"]!);
  }
  if (/\b(?:3000\.09|responsible\s+ai|\brai\b|autonomous\s+weapon|lethal\s+autonom\w*|human\s+judgment)\b/i.test(q)) {
    hits.push(DOD_IC_POLICY_REGISTRY["DODD-3000.09-RAI"]!);
  }
  if (/\b(?:ai\s*100-1|ai\s*600-1|nist\s+ai\s+rmf|genai\s+profile|owasp\s+llm|red[- ]?team\w*|prompt\s+injection)\b/i.test(q)) {
    hits.push(DOD_IC_POLICY_REGISTRY["NIST-AI-RMF-600-1"]!);
  }
  if (/\b(?:icd\s*203|icd\s*206|competing\s+hypothes|\bach\b|admiralty|nato\s+6x6|analytic\s+standard|\bf6\b)\b/i.test(q)) {
    hits.push(DOD_IC_POLICY_REGISTRY["ICD-203-206-ANALYTIC"]!);
  }
  if (/\b(?:multi[- ]?int|osint\b|geoint\b|sigint\b|masint\b|haversine|counterintelligence)\b/i.test(q)) {
    hits.push(DOD_IC_POLICY_REGISTRY["MULTI-INT-FUSION-GOV"]!);
  }
  if (/\b(?:3020\.45|3020\.40|mission\s+assurance|\bmef\b|\bpmef\b|single\s+point\s+of\s+failure|\bspof\b|defense\s+critical\s+asset)\b/i.test(q)) {
    hits.push(DOD_IC_POLICY_REGISTRY["DODI-3020.45-DODD-3020.40"]!);
  }
  if (/\b(?:32\s+cfr\s*(?:part\s*)?170|\bcmmc\b|dfars\s*252\.204|48\s+cfr\s*(?:part\s*)?204|far\s*52\.204-21|dibnet|sprs\b)\b/i.test(q)) {
    hits.push(DOD_IC_POLICY_REGISTRY["CMMC-32CFR-170-DFARS"]!);
  }
  if (/\b(?:32\s+cfr\s*(?:part\s*)?117|nispom|\bfoci\b|facility\s+clearance|\bfcl\b|proxy\s+agreement|voting\s+trust)\b/i.test(q)) {
    hits.push(DOD_IC_POLICY_REGISTRY["NISPOM-32CFR-117-FOCI"]!);
  }
  if (/\b(?:spd-?5|space\s+policy\s+directive|4650\.01|5000\.97|digital\s+engineering|\bmbse\b|tt&c\b|mtbf\b|mttr\b|operational\s+availability)\b/i.test(q)) {
    hits.push(DOD_IC_POLICY_REGISTRY["SPD-5-DODI-4650.01-5000.97"]!);
  }
  const uniqueHits = [...new Map(hits.map((p) => [p.id, p])).values()];
  if (uniqueHits.length === 0) {
    return [DOD_IC_POLICY_REGISTRY["DODI-8510.01"]!, DOD_IC_POLICY_REGISTRY["ICD-503"]!, DOD_IC_POLICY_REGISTRY["CNSSI-1253"]!];
  }
  return uniqueHits;
}
