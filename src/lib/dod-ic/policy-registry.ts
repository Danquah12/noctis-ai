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
