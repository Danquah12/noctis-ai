/**
 * Authoritative NIST SP 800-Series, SP 800-37 Rev. 2 Tasks, and SP 800-60 Information Types Catalog
 *
 * Pure TypeScript module (zero `node:*`, zero `@/` aliases, zero `*.server.ts`).
 * Safe for both client-side helpers, pure Node unit tests, server RMF grounding,
 * continuous open ingestion (`nist-csrc-rmf`), and `/knowledge` Markdown table synthesis.
 */

export interface NistRmfTask {
  taskId: string;
  stepNumber: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  stepCode: "PREPARE" | "CATEGORIZE" | "SELECT" | "IMPLEMENT" | "ASSESS" | "AUTHORIZE" | "MONITOR";
  level: "organization" | "system";
  title: string;
  primaryRoles: string[];
  supportingRoles: string[];
  expectedOutputs: string[];
  governingPubs: string[];
  description: string;
}

export type NistImpactLevel = "LOW" | "MODERATE" | "HIGH";

export interface Sp80060InfoType {
  code: string;
  category: "Mission-Based" | "Management & Support";
  name: string;
  confidentiality: NistImpactLevel;
  integrity: NistImpactLevel;
  availability: NistImpactLevel;
  highWatermark: NistImpactLevel;
  tailoringNotes: string;
}

export interface NistSpSection {
  id: string;
  heading: string;
  content: string;
  citation: string;
}

export interface NistSpPublication {
  sourceId: string;
  docNumber: string;
  title: string;
  version: string;
  releaseDate: string;
  issuer: "NIST";
  category: string;
  officialUrl: string;
  rmfSteps: number[];
  summary: string;
  keyConcepts: string[];
  deliverables: string[];
  invariants: string[];
  crossReferences: string[];
  sections: NistSpSection[];
}

export interface NistSpSearchHit {
  kind: "publication" | "rmf_task" | "sp800_60_info_type";
  id: string;
  title: string;
  score: number;
  matchedTerms: string[];
  publication?: NistSpPublication;
  task?: NistRmfTask;
  infoType?: Sp80060InfoType;
}

export interface NistSpTrainingPair {
  id: string;
  canonicalRef: string;
  domain: "cybersecurity";
  systemPrompt: string;
  question: string;
  answer: string;
  url: string;
}

/**
 * Complete 47 official tasks from NIST SP 800-37 Rev. 2 (Risk Management Framework
 * for Information Systems and Organizations: A System Life Cycle Approach for Security and Privacy):
 *   - Step 0 Prepare: P-1..P-7 (Organization) + P-8..P-18 (System) = 18 tasks
 *   - Step 1 Categorize: C-1..C-3 = 3 tasks
 *   - Step 2 Select: S-1..S-6 = 6 tasks
 *   - Step 3 Implement: I-1..I-2 = 2 tasks
 *   - Step 4 Assess: A-1..A-6 = 6 tasks
 *   - Step 5 Authorize: R-1..R-5 = 5 tasks
 *   - Step 6 Monitor: M-1..M-7 = 7 tasks
 */
export const NIST_SP_800_37_TASKS: readonly NistRmfTask[] = [
  // Step 0: PREPARE — Organization Level (P-1..P-7)
  {
    taskId: "P-1",
    stepNumber: 0,
    stepCode: "PREPARE",
    level: "organization",
    title: "Risk Management Roles",
    primaryRoles: ["Head of Agency", "Risk Executive (Function)"],
    supportingRoles: ["CISO", "Senior Agency Official for Privacy (SAOP)", "Authorizing Official (AO)"],
    expectedOutputs: ["RMF role assignments (AO, CISO, SAOP, ISSM, ISSO, SCA, System Owner)", "Segregation-of-duties charter"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task P-1)", "NIST SP 800-39"],
    description: "Identify and assign key individuals to specific risk management roles (AO, CISO, SAOP, Control Assessors, System Owners, ISSO/ISSM) and establish independence boundaries.",
  },
  {
    taskId: "P-2",
    stepNumber: 0,
    stepCode: "PREPARE",
    level: "organization",
    title: "Risk Management Strategy",
    primaryRoles: ["Risk Executive (Function)", "Head of Agency"],
    supportingRoles: ["CISO", "SAOP", "Authorizing Official (AO)"],
    expectedOutputs: ["Organizational Risk Management Strategy", "Risk tolerance & risk framing statement"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task P-2)", "NIST SP 800-39 (Tier 1)"],
    description: "Establish an organization-wide risk management strategy including explicit risk tolerance, acceptable methodologies, assumptions, constraints, and risk framing.",
  },
  {
    taskId: "P-3",
    stepNumber: 0,
    stepCode: "PREPARE",
    level: "organization",
    title: "Risk Assessment – Organization",
    primaryRoles: ["CISO", "SAOP", "Risk Executive (Function)"],
    supportingRoles: ["ISSM", "Threat Intelligence Lead"],
    expectedOutputs: ["Organization-level security & privacy risk assessment results"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task P-3)", "NIST SP 800-30 Rev. 1"],
    description: "Conduct and continuously update organization-wide risk assessments (Tier 1/2) covering mission threats, systemic vulnerabilities, and privacy risk.",
  },
  {
    taskId: "P-4",
    stepNumber: 0,
    stepCode: "PREPARE",
    level: "organization",
    title: "Organizationally-Tailored Control Baselines and Cybersecurity Framework Profiles",
    primaryRoles: ["CISO", "SAOP", "Mission/Business Owner"],
    supportingRoles: ["Enterprise Architect", "ISSM", "Risk Executive (Function)"],
    expectedOutputs: ["Organizationally-tailored control baselines", "NIST CSF Organizational Profiles", "Agency overlays"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task P-4)", "NIST SP 800-53B", "NIST CSF 2.0"],
    description: "Establish organizationally-tailored control baselines and/or Cybersecurity Framework Profiles aligned to mission needs and legal/regulatory overlays.",
  },
  {
    taskId: "P-5",
    stepNumber: 0,
    stepCode: "PREPARE",
    level: "organization",
    title: "Common Control Identification",
    primaryRoles: ["CISO", "SAOP", "Common Control Provider"],
    supportingRoles: ["Authorizing Official (AO)", "System Owner", "ISSM"],
    expectedOutputs: ["Published Common Control Catalog", "Inheritance & Shared Responsibility matrix"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task P-5)", "NIST SP 800-53 Rev. 5"],
    description: "Identify, document, assess, and publish organization-wide common (inheritable) controls available to system owners across enclaves and cloud boundaries.",
  },
  {
    taskId: "P-6",
    stepNumber: 0,
    stepCode: "PREPARE",
    level: "organization",
    title: "Impact-Level Prioritization",
    primaryRoles: ["Risk Executive (Function)", "Head of Agency"],
    supportingRoles: ["CISO", "SAOP", "Authorizing Official (AO)"],
    expectedOutputs: ["Prioritized system inventory by FIPS 199 impact level"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task P-6)", "FIPS 199"],
    description: "Prioritize organizational systems with the same FIPS 199 impact level so higher-mission-criticality assets receive deeper assessment rigor and resources.",
  },
  {
    taskId: "P-7",
    stepNumber: 0,
    stepCode: "PREPARE",
    level: "organization",
    title: "Continuous Monitoring Strategy – Organization",
    primaryRoles: ["CISO", "SAOP", "Risk Executive (Function)"],
    supportingRoles: ["Authorizing Official (AO)", "Security Control Assessor (SCA)"],
    expectedOutputs: ["Organization-wide ISCM Strategy", "Metric & telemetry reporting cadence"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task P-7)", "NIST SP 800-137"],
    description: "Develop and implement an organization-wide Information Security Continuous Monitoring (ISCM) strategy governing automated metrics, frequencies, and ongoing authorization.",
  },
  // Step 0: PREPARE — System Level (P-8..P-18)
  {
    taskId: "P-8",
    stepNumber: 0,
    stepCode: "PREPARE",
    level: "system",
    title: "Mission or Business Focus",
    primaryRoles: ["Mission/Business Owner"],
    supportingRoles: ["System Owner", "Enterprise Architect"],
    expectedOutputs: ["Mission/business process definition", "SDLC alignment artifacts"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task P-8)", "NIST SP 800-160 Vol. 1"],
    description: "Identify the missions, business functions, and business processes the system is intended to support before engineering and categorization.",
  },
  {
    taskId: "P-9",
    stepNumber: 0,
    stepCode: "PREPARE",
    level: "system",
    title: "System Stakeholders",
    primaryRoles: ["Mission/Business Owner", "System Owner"],
    supportingRoles: ["Information Owner/Steward", "Privacy Officer", "ISSO"],
    expectedOutputs: ["System stakeholder register", "System-level protection needs"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task P-9)", "NIST SP 800-160 Vol. 1"],
    description: "Identify stakeholders having an interest in the system (owners, stewards, users, operators, privacy leads) and capture their security and privacy needs.",
  },
  {
    taskId: "P-10",
    stepNumber: 0,
    stepCode: "PREPARE",
    level: "system",
    title: "Asset Identification",
    primaryRoles: ["System Owner", "System Administrator"],
    supportingRoles: ["ISSO", "ISSM", "Information Owner/Steward"],
    expectedOutputs: ["Hardware/software/firmware inventory", "Data asset register"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task P-10)", "NIST SP 800-53 (CM-8)"],
    description: "Identify stakeholder assets (hardware, software, firmware, interfaces, and high-value data) requiring protection throughout the system life cycle.",
  },
  {
    taskId: "P-11",
    stepNumber: 0,
    stepCode: "PREPARE",
    level: "system",
    title: "Authorization Boundary",
    primaryRoles: ["Authorizing Official (AO)", "System Owner"],
    supportingRoles: ["ISSM", "ISSO", "Enterprise Architect", "System Security Engineer"],
    expectedOutputs: ["Approved Authorization Boundary diagram", "System interconnections & data flow documentation"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task P-11)", "NIST SP 800-18 Rev. 1"],
    description: "Determine and document the exact authorization boundary of the system, including all components under direct management control, SaaS/IaaS dependencies, and ISA/MOU interconnections.",
  },
  {
    taskId: "P-12",
    stepNumber: 0,
    stepCode: "PREPARE",
    level: "system",
    title: "Information Types",
    primaryRoles: ["Information Owner/Steward", "System Owner"],
    supportingRoles: ["SAOP", "ISSO", "Privacy Officer"],
    expectedOutputs: ["Cataloged system information types mapped to NIST SP 800-60", "PII/CUI flags"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task P-12)", "NIST SP 800-60 Vol. 1 & 2"],
    description: "Identify all information types processed, stored, or transmitted by the system (including PII and CUI) to prepare for FIPS 199 categorization.",
  },
  {
    taskId: "P-13",
    stepNumber: 0,
    stepCode: "PREPARE",
    level: "system",
    title: "Information Life Cycle",
    primaryRoles: ["Information Owner/Steward", "Privacy Officer"],
    supportingRoles: ["System Owner", "ISSO", "Records Manager"],
    expectedOutputs: ["Information life cycle & PII data-flow mapping (collection through disposal)"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task P-13)", "NIST SP 800-53 (PT family)"],
    description: "Identify and understand all stages of the information life cycle (creation, collection, processing, dissemination, storage, retention, disposal) for each information type.",
  },
  {
    taskId: "P-14",
    stepNumber: 0,
    stepCode: "PREPARE",
    level: "system",
    title: "Risk Assessment – System",
    primaryRoles: ["System Owner", "ISSO", "Privacy Officer"],
    supportingRoles: ["CISO", "System Security Engineer", "ISSM"],
    expectedOutputs: ["Initial System-Level Risk Assessment (Tier 3)", "Privacy Impact Assessment (PTA/PIA)"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task P-14)", "NIST SP 800-30 Rev. 1"],
    description: "Conduct a system-level security and privacy risk assessment (Tier 3) or update an existing assessment to inform categorization, control tailoring, and engineering.",
  },
  {
    taskId: "P-15",
    stepNumber: 0,
    stepCode: "PREPARE",
    level: "system",
    title: "Requirements Definition",
    primaryRoles: ["Mission/Business Owner", "System Owner"],
    supportingRoles: ["System Security Engineer", "Privacy Officer", "ISSO", "Acquisition Lead"],
    expectedOutputs: ["System Security and Privacy Requirements Specification"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task P-15)", "NIST SP 800-160 Vol. 1"],
    description: "Define security and privacy protection requirements for the system and its operating environment derived from stakeholder needs, statutes, policies, and risk assessments.",
  },
  {
    taskId: "P-16",
    stepNumber: 0,
    stepCode: "PREPARE",
    level: "system",
    title: "Enterprise Architecture",
    primaryRoles: ["Enterprise Architect", "System Security Engineer"],
    supportingRoles: ["CISO", "SAOP", "System Owner"],
    expectedOutputs: ["Segment/Solution Architecture placement", "Zero Trust / enclave placement alignment"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task P-16)", "NIST SP 800-160", "NIST SP 800-207"],
    description: "Determine the placement of the system within the enterprise architecture (enclave, cloud VPC, Zero Trust PEP/PE boundaries) to optimize inherited protections.",
  },
  {
    taskId: "P-17",
    stepNumber: 0,
    stepCode: "PREPARE",
    level: "system",
    title: "Requirements Allocation",
    primaryRoles: ["System Owner", "System Security Engineer"],
    supportingRoles: ["ISSM", "ISSO", "Privacy Officer"],
    expectedOutputs: ["Allocation of security & privacy requirements across system elements & environment"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task P-17)", "NIST SP 800-160 Vol. 1"],
    description: "Allocate security and privacy requirements to the system components, external providers, and operational environment before selecting specific controls.",
  },
  {
    taskId: "P-18",
    stepNumber: 0,
    stepCode: "PREPARE",
    level: "system",
    title: "System Registration",
    primaryRoles: ["System Owner"],
    supportingRoles: ["ISSM", "ISSO", "Authorizing Official (AO)"],
    expectedOutputs: ["Registered system record in GRC/eMASS/FISMA inventory"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task P-18)"],
    description: "Register the system with organizational tracking, GRC, or FISMA/eMASS management repositories for visibility across oversight and authorization workflows.",
  },

  // Step 1: CATEGORIZE (C-1..C-3)
  {
    taskId: "C-1",
    stepNumber: 1,
    stepCode: "CATEGORIZE",
    level: "system",
    title: "System Description",
    primaryRoles: ["System Owner", "System Security Engineer"],
    supportingRoles: ["ISSO", "ISSM", "Enterprise Architect"],
    expectedOutputs: ["System characteristics description (Section 1–8 of SSP)", "Data flows & interconnections"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task C-1)", "NIST SP 800-18 Rev. 1"],
    description: "Document the characteristics of the system (purpose, architecture, operating environment, boundary, interconnections, users) in the System Security Plan.",
  },
  {
    taskId: "C-2",
    stepNumber: 1,
    stepCode: "CATEGORIZE",
    level: "system",
    title: "Security Categorization",
    primaryRoles: ["System Owner", "Information Owner/Steward"],
    supportingRoles: ["CISO", "SAOP", "ISSO", "Privacy Officer"],
    expectedOutputs: ["FIPS 199 Security Categorization {(C, impact), (I, impact), (A, impact)}", "High-watermark determination & rationale"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task C-2)", "FIPS 199", "FIPS 200", "NIST SP 800-60"],
    description: "Categorize the system using FIPS 199 and NIST SP 800-60 information types, applying the high-watermark principle across Confidentiality, Integrity, and Availability with documented rationale.",
  },
  {
    taskId: "C-3",
    stepNumber: 1,
    stepCode: "CATEGORIZE",
    level: "system",
    title: "Security Categorization Review and Approval",
    primaryRoles: ["Authorizing Official (AO)"],
    supportingRoles: ["CISO", "SAOP", "Risk Executive (Function)"],
    expectedOutputs: ["Signed AO Security Categorization Approval Decision"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task C-3)", "FIPS 199"],
    description: "Submit the security categorization decision and supporting rationale for review and formal written approval by the Authorizing Official (or designated representative).",
  },

  // Step 2: SELECT (S-1..S-6)
  {
    taskId: "S-1",
    stepNumber: 2,
    stepCode: "SELECT",
    level: "system",
    title: "Control Selection",
    primaryRoles: ["System Owner", "Common Control Provider"],
    supportingRoles: ["ISSM", "ISSO", "System Security Engineer", "Privacy Officer"],
    expectedOutputs: ["Initial baseline control set (NIST SP 800-53B Low/Moderate/High/Privacy or FedRAMP/CNSSI 1253)"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task S-1)", "NIST SP 800-53B", "FIPS 200"],
    description: "Select the initial control baseline for the system (and privacy baseline if PII is processed) commensurate with the approved FIPS 199 high-watermark categorization.",
  },
  {
    taskId: "S-2",
    stepNumber: 2,
    stepCode: "SELECT",
    level: "system",
    title: "Control Tailoring",
    primaryRoles: ["System Owner", "Common Control Provider"],
    supportingRoles: ["ISSM", "ISSO", "Authorizing Official (AO)", "Privacy Officer"],
    expectedOutputs: ["Tailored control set", "Scoping decisions, compensating controls & ODP values"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task S-2)", "NIST SP 800-53 Rev. 5", "NIST SP 800-53B"],
    description: "Tailor the initial control baseline using scoping guidance, compensating control justifications, and Organization-Defined Parameters (ODPs) aligned with risk assessment findings.",
  },
  {
    taskId: "S-3",
    stepNumber: 2,
    stepCode: "SELECT",
    level: "system",
    title: "Control Allocation",
    primaryRoles: ["System Owner", "Common Control Provider"],
    supportingRoles: ["ISSM", "ISSO", "System Security Engineer"],
    expectedOutputs: ["Control Designation Matrix (System-Specific, Hybrid, Inherited/Common)"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task S-3)", "NIST SP 800-53 Rev. 5"],
    description: "Allocate each tailored control as system-specific, hybrid, or common/inherited across system components and external cloud/shared-service providers.",
  },
  {
    taskId: "S-4",
    stepNumber: 2,
    stepCode: "SELECT",
    level: "system",
    title: "Documentation of Planned Control Implementations",
    primaryRoles: ["System Owner", "Common Control Provider"],
    supportingRoles: ["ISSO", "ISSM", "System Security Engineer", "Privacy Officer"],
    expectedOutputs: ["System Security Plan (SSP) & Privacy Plan with control implementation statements & Customer Responsibility Matrix"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task S-4)", "NIST SP 800-18 Rev. 1"],
    description: "Document planned control implementations in the Security and Privacy Plans, including inputs, expected behaviors, outputs, roles, and Customer Responsibility Matrix (CRM) mappings.",
  },
  {
    taskId: "S-5",
    stepNumber: 2,
    stepCode: "SELECT",
    level: "system",
    title: "Continuous Monitoring Strategy – System",
    primaryRoles: ["System Owner", "Common Control Provider"],
    supportingRoles: ["ISSM", "ISSO", "CISO", "Security Control Assessor (SCA)"],
    expectedOutputs: ["System-Level Continuous Monitoring (ConMon/ISCM) Plan"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task S-5)", "NIST SP 800-137"],
    description: "Develop a system-level monitoring strategy specifying control assessment frequencies, ongoing automated scanning/telemetry feeds, and criteria for triggering reauthorization.",
  },
  {
    taskId: "S-6",
    stepNumber: 2,
    stepCode: "SELECT",
    level: "system",
    title: "Plan Review and Approval",
    primaryRoles: ["Authorizing Official (AO)"],
    supportingRoles: ["CISO", "SAOP", "Security Control Assessor (SCA)"],
    expectedOutputs: ["AO-approved Security Plan, Privacy Plan, and System ConMon Strategy"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task S-6)", "NIST SP 800-18 Rev. 1"],
    description: "Review and formally approve the Security and Privacy Plans and system-level Continuous Monitoring Strategy before production implementation/assessment.",
  },

  // Step 3: IMPLEMENT (I-1..I-2)
  {
    taskId: "I-1",
    stepNumber: 3,
    stepCode: "IMPLEMENT",
    level: "system",
    title: "Control Implementation",
    primaryRoles: ["System Owner", "Common Control Provider"],
    supportingRoles: ["System Security Engineer", "System Administrator", "ISSO", "Developer"],
    expectedOutputs: ["Configured and deployed security & privacy controls", "DISA STIG / CIS hardened builds", "Operational SOPs"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task I-1)", "NIST SP 800-53 Rev. 5", "NIST SP 800-160 Vol. 1"],
    description: "Implement the controls specified in the approved Security and Privacy Plans using sound systems security and privacy engineering practices across infrastructure, code, and operations.",
  },
  {
    taskId: "I-2",
    stepNumber: 3,
    stepCode: "IMPLEMENT",
    level: "system",
    title: "Update Control Implementation Information",
    primaryRoles: ["System Owner", "Common Control Provider"],
    supportingRoles: ["ISSO", "ISSM", "System Security Engineer"],
    expectedOutputs: ["As-built SSP / Privacy Plan with implementation statuses, roles, and artifact references"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task I-2)", "NIST SP 800-18 Rev. 1"],
    description: "Update the control implementation descriptions in the Security and Privacy Plans to reflect the actual as-built configuration, deviations, and operational procedures.",
  },

  // Step 4: ASSESS (A-1..A-6)
  {
    taskId: "A-1",
    stepNumber: 4,
    stepCode: "ASSESS",
    level: "system",
    title: "Assessor Selection",
    primaryRoles: ["Authorizing Official (AO)"],
    supportingRoles: ["CISO", "SAOP", "3PAO / Independent Verification Lead"],
    expectedOutputs: ["Appointed independent Security Control Assessor (SCA / 3PAO)", "Independence attestation"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task A-1)", "NIST SP 800-53A Rev. 5"],
    description: "Select an assessor or assessment team (e.g., independent SCA or FedRAMP 3PAO) and verify required technical competence and organizational independence.",
  },
  {
    taskId: "A-2",
    stepNumber: 4,
    stepCode: "ASSESS",
    level: "system",
    title: "Assessment Plan",
    primaryRoles: ["Security Control Assessor (SCA)"],
    supportingRoles: ["System Owner", "ISSM", "ISSO", "Authorizing Official (AO)"],
    expectedOutputs: ["Approved Security Assessment Plan (SAP) & Privacy Assessment Plan"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task A-2)", "NIST SP 800-53A Rev. 5"],
    description: "Develop, review, and approve the Security/Privacy Assessment Plan (SAP) defining scope, SP 800-53A assessment objectives, Examine/Interview/Test procedures, rules of engagement, and schedule.",
  },
  {
    taskId: "A-3",
    stepNumber: 4,
    stepCode: "ASSESS",
    level: "system",
    title: "Control Assessments",
    primaryRoles: ["Security Control Assessor (SCA)"],
    supportingRoles: ["System Owner", "ISSO", "System Administrator"],
    expectedOutputs: ["Executed SP 800-53A Examine/Interview/Test evidence matrix", "Vulnerability & STIG scan verification"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task A-3)", "NIST SP 800-53A Rev. 5"],
    description: "Execute the Security Assessment Plan using Examine, Interview, and Test procedures to determine whether controls are implemented correctly, operating as intended, and meeting objectives.",
  },
  {
    taskId: "A-4",
    stepNumber: 4,
    stepCode: "ASSESS",
    level: "system",
    title: "Assessment Reports",
    primaryRoles: ["Security Control Assessor (SCA)"],
    supportingRoles: ["ISSM", "Privacy Officer"],
    expectedOutputs: ["Security Assessment Report (SAR)", "Privacy Assessment Report", "Raw findings & Risk Exposure Table"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task A-4)", "NIST SP 800-53A Rev. 5"],
    description: "Prepare the Security/Privacy Assessment Report (SAR) documenting control determinations (Satisfied / Other Than Satisfied), evidence gaps, and recommended corrective actions.",
  },
  {
    taskId: "A-5",
    stepNumber: 4,
    stepCode: "ASSESS",
    level: "system",
    title: "Remediation Actions",
    primaryRoles: ["System Owner", "Common Control Provider"],
    supportingRoles: ["ISSO", "ISSM", "Security Control Assessor (SCA)"],
    expectedOutputs: ["Evidence of remediated findings", "SCA re-assessment / SAR addendum", "Updated SSP"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task A-5)", "NIST SP 800-53A Rev. 5"],
    description: "Conduct initial remediation actions on selected SAR deficiencies, verify fixes with the SCA, and update the Security and Privacy Plans.",
  },
  {
    taskId: "A-6",
    stepNumber: 4,
    stepCode: "ASSESS",
    level: "system",
    title: "Plan of Action and Milestones",
    primaryRoles: ["System Owner", "Common Control Provider"],
    supportingRoles: ["ISSO", "ISSM", "Authorizing Official (AO)"],
    expectedOutputs: ["Plan of Action and Milestones (POA&M) with milestones, resources & target closure dates"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task A-6)", "FedRAMP POA&M Completion Guide"],
    description: "Prepare a Plan of Action and Milestones (POA&M) for all remaining un-remediated weaknesses, detailing root cause, compensating controls, milestones, and scheduled completion dates.",
  },

  // Step 5: AUTHORIZE (R-1..R-5)
  {
    taskId: "R-1",
    stepNumber: 5,
    stepCode: "AUTHORIZE",
    level: "system",
    title: "Authorization Package",
    primaryRoles: ["System Owner", "Common Control Provider"],
    supportingRoles: ["ISSM", "ISSO", "Security Control Assessor (SCA)", "Privacy Officer"],
    expectedOutputs: ["Complete Authorization Package (Executive Summary, SSP, SAR, POA&M, Risk Assessment)"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task R-1)"],
    description: "Assemble the executive summary, Security and Privacy Plans, Security/Privacy Assessment Report (SAR), and POA&M into a complete authorization package for the AO.",
  },
  {
    taskId: "R-2",
    stepNumber: 5,
    stepCode: "AUTHORIZE",
    level: "system",
    title: "Risk Analysis and Determination",
    primaryRoles: ["Authorizing Official (AO)"],
    supportingRoles: ["Risk Executive (Function)", "CISO", "SAOP", "Security Control Assessor (SCA)"],
    expectedOutputs: ["AO Risk Determination based on Threat x Likelihood x Impact & residual risk"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task R-2)", "NIST SP 800-30 Rev. 1", "NIST SP 800-39"],
    description: "Analyze the authorization package and supporting risk factors (residual vulnerabilities, CISA KEVs, operational need) to determine the risk to organizational operations, assets, and individuals.",
  },
  {
    taskId: "R-3",
    stepNumber: 5,
    stepCode: "AUTHORIZE",
    level: "system",
    title: "Risk Response",
    primaryRoles: ["Authorizing Official (AO)", "System Owner"],
    supportingRoles: ["CISO", "SAOP", "Risk Executive (Function)"],
    expectedOutputs: ["Documented Risk Responses (Accept, Mitigate, Share/Transfer, Avoid)"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task R-3)", "NIST SP 800-39"],
    description: "Identify and implement risk responses for determined residual risks (mitigate via POA&M, accept with signed AO justification, share/transfer, or avoid/decommission).",
  },
  {
    taskId: "R-4",
    stepNumber: 5,
    stepCode: "AUTHORIZE",
    level: "system",
    title: "Authorization Decision",
    primaryRoles: ["Authorizing Official (AO)"],
    supportingRoles: ["CISO", "SAOP", "Authorizing Official Designated Representative (AODR)"],
    expectedOutputs: ["Signed Authorization to Operate (ATO), Interim ATO/IATT, or Denial of Authorization (DATO)"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task R-4)"],
    description: "Determine whether risk is acceptable and issue a formal written authorization decision (ATO, authorization with conditions, or DATO) explicitly stating terms, termination date, and ongoing monitoring conditions.",
  },
  {
    taskId: "R-5",
    stepNumber: 5,
    stepCode: "AUTHORIZE",
    level: "system",
    title: "Authorization Reporting",
    primaryRoles: ["Authorizing Official (AO)"],
    supportingRoles: ["CISO", "SAOP", "ISSM", "Risk Executive (Function)"],
    expectedOutputs: ["Organization-wide authorization reporting record", "OMB/FISMA/eMASS status sync"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task R-5)"],
    description: "Report the authorization decision and significant security/privacy risk posture findings to senior organizational officials and oversight registries.",
  },

  // Step 6: MONITOR (M-1..M-7)
  {
    taskId: "M-1",
    stepNumber: 6,
    stepCode: "MONITOR",
    level: "system",
    title: "System and Environment Changes",
    primaryRoles: ["System Owner", "Common Control Provider"],
    supportingRoles: ["ISSM", "ISSO", "Change Control Board (CCB)"],
    expectedOutputs: ["Security Impact Analysis (SIA) for proposed changes", "Configuration/boundary delta logs"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task M-1)", "NIST SP 800-137"],
    description: "Monitor the system and its environment of operation on an ongoing basis, evaluating every hardware, software, firmware, interconnection, or threat change via a formal Security Impact Analysis (SIA).",
  },
  {
    taskId: "M-2",
    stepNumber: 6,
    stepCode: "MONITOR",
    level: "system",
    title: "Ongoing Assessments",
    primaryRoles: ["Security Control Assessor (SCA)", "ISSO"],
    supportingRoles: ["System Owner", "ISSM", "Continuous Monitoring Team"],
    expectedOutputs: ["Continuous assessment evidence (annual subset controls, vuln/STIG/telemetry metrics)"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task M-2)", "NIST SP 800-137", "NIST SP 800-53A Rev. 5"],
    description: "Assess selected controls continuously on a rolling schedule defined by the ConMon strategy (e.g., annual core/tailored control rotation plus monthly vulnerability/configuration scans).",
  },
  {
    taskId: "M-3",
    stepNumber: 6,
    stepCode: "MONITOR",
    level: "system",
    title: "Ongoing Risk Response",
    primaryRoles: ["Authorizing Official (AO)", "System Owner"],
    supportingRoles: ["ISSO", "ISSM", "CISO"],
    expectedOutputs: ["Updated Risk Assessment & POA&M closures", "Emergency/KEV mitigation tracking"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task M-3)", "NIST SP 800-137", "CISA BOD 22-01"],
    description: "Respond continuously to risks uncovered by ongoing monitoring, vulnerability feeds (NVD/CISA KEV), security incidents, or Security Impact Analyses.",
  },
  {
    taskId: "M-4",
    stepNumber: 6,
    stepCode: "MONITOR",
    level: "system",
    title: "Authorization Package Updates",
    primaryRoles: ["System Owner", "Common Control Provider"],
    supportingRoles: ["ISSO", "ISSM", "Privacy Officer"],
    expectedOutputs: ["Updated SSP, SAR addendum, and POA&M reflecting current posture"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task M-4)", "NIST SP 800-18 Rev. 1"],
    description: "Update the Security and Privacy Plans, Assessment Reports, and POA&Ms based on ongoing monitoring, change management, and remediation closures.",
  },
  {
    taskId: "M-5",
    stepNumber: 6,
    stepCode: "MONITOR",
    level: "system",
    title: "Security and Privacy Reporting",
    primaryRoles: ["System Owner", "Common Control Provider"],
    supportingRoles: ["ISSO", "ISSM", "CISO", "SAOP"],
    expectedOutputs: ["Monthly/Quarterly ConMon posture briefings to AO & oversight leadership"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task M-5)", "NIST SP 800-137"],
    description: "Report the current security and privacy posture of the system to the Authorizing Official and designated organizational oversight bodies on the defined ConMon cadence.",
  },
  {
    taskId: "M-6",
    stepNumber: 6,
    stepCode: "MONITOR",
    level: "system",
    title: "Ongoing Authorization",
    primaryRoles: ["Authorizing Official (AO)"],
    supportingRoles: ["CISO", "SAOP", "Risk Executive (Function)"],
    expectedOutputs: ["Ongoing ATO Affirmation or Significant-Change Reauthorization Trigger"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task M-6)", "NIST SP 800-137"],
    description: "Review ConMon reports and SIA triggers on an ongoing basis to determine whether the risk to organizational operations remains acceptable or requires reauthorization.",
  },
  {
    taskId: "M-7",
    stepNumber: 6,
    stepCode: "MONITOR",
    level: "system",
    title: "System Disposal",
    primaryRoles: ["System Owner"],
    supportingRoles: ["ISSO", "ISSM", "Information Owner/Steward", "Privacy Officer", "Records Manager"],
    expectedOutputs: ["Media Sanitization Certificates (SP 800-88)", "Closed/Decommissioned System Record", "Data archival/migration log"],
    governingPubs: ["NIST SP 800-37 Rev. 2 (Task M-7)", "NIST SP 800-88 Rev. 1"],
    description: "Implement a formal system disposal strategy and execute media sanitization (Clear/Purge/Destroy per SP 800-88), key revocation, and decommissioning documentation when retiring a system.",
  },
];

/**
 * Authoritative NIST SP 800-60 Vol. 2 Rev. 1 Guide for Mapping Types of Information
 * and Information Systems to Security Categories (Mission-Based + Management & Support).
 */
export const NIST_SP_800_60_INFO_TYPES: readonly Sp80060InfoType[] = [
  // Management & Support Information Types (C.2.x & C.3.x)
  {
    code: "C.2.1.1",
    category: "Management & Support",
    name: "Administrative Management",
    confidentiality: "LOW",
    integrity: "LOW",
    availability: "LOW",
    highWatermark: "LOW",
    tailoringNotes: "Raise Confidentiality/Integrity to MODERATE if sensitive personnel or executive memos are included.",
  },
  {
    code: "C.2.2.1",
    category: "Management & Support",
    name: "Budget Formulation and Execution",
    confidentiality: "LOW",
    integrity: "MODERATE",
    availability: "LOW",
    highWatermark: "MODERATE",
    tailoringNotes: "Provisional C=L, I=M, A=L; pre-decisional budget/classified programs elevate Confidentiality to MODERATE/HIGH.",
  },
  {
    code: "C.2.2.2",
    category: "Management & Support",
    name: "Accounting and Financial Management",
    confidentiality: "LOW",
    integrity: "MODERATE",
    availability: "LOW",
    highWatermark: "MODERATE",
    tailoringNotes: "Unauthorized ledger alteration impacts public trust/auditability; Integrity is MODERATE (or HIGH for Treasury disbursement).",
  },
  {
    code: "C.2.3.1",
    category: "Management & Support",
    name: "Human Resources Management (HR & PII)",
    confidentiality: "MODERATE",
    integrity: "MODERATE",
    availability: "LOW",
    highWatermark: "MODERATE",
    tailoringNotes: "Contains PII/SSN/medical leave; trigger Privacy Baseline (SP 800-53B) alongside Moderate baseline.",
  },
  {
    code: "C.2.4.1",
    category: "Management & Support",
    name: "Procurement and Acquisition",
    confidentiality: "MODERATE",
    integrity: "MODERATE",
    availability: "LOW",
    highWatermark: "MODERATE",
    tailoringNotes: "Source-selection & proprietary bid data require MODERATE Confidentiality/Integrity under FAR rules.",
  },
  {
    code: "C.2.5.1",
    category: "Management & Support",
    name: "Public Affairs & External Communications",
    confidentiality: "LOW",
    integrity: "LOW",
    availability: "LOW",
    highWatermark: "LOW",
    tailoringNotes: "Public websites may elevate Integrity/Availability to MODERATE to guard against defacement or crisis outage.",
  },
  {
    code: "C.2.6.1",
    category: "Management & Support",
    name: "Information and Technology Management (General IT)",
    confidentiality: "LOW",
    integrity: "MODERATE",
    availability: "LOW",
    highWatermark: "MODERATE",
    tailoringNotes: "Elevate to match the highest impact level of the mission systems managed by the IT plane.",
  },
  {
    code: "C.2.8.1",
    category: "Management & Support",
    name: "System Development & Lifecycle Management",
    confidentiality: "LOW",
    integrity: "MODERATE",
    availability: "LOW",
    highWatermark: "MODERATE",
    tailoringNotes: "CI/CD, source code, and signing pipelines protect production integrity; elevate to HIGH for critical/NSS systems.",
  },
  {
    code: "C.2.8.3",
    category: "Management & Support",
    name: "System & Network Monitoring / Security Operations",
    confidentiality: "MODERATE",
    integrity: "MODERATE",
    availability: "MODERATE",
    highWatermark: "MODERATE",
    tailoringNotes: "SIEM/EDR/audit logs expose topology & vulnerabilities; Confidentiality/Integrity often elevated to HIGH on High systems.",
  },
  {
    code: "C.2.8.12",
    category: "Management & Support",
    name: "Information Security & Identity/PKI Management",
    confidentiality: "MODERATE",
    integrity: "MODERATE",
    availability: "LOW",
    highWatermark: "MODERATE",
    tailoringNotes: "Cryptographic keys, PIV/CAC credentials, and IdP directories commonly require HIGH Confidentiality & Integrity.",
  },
  {
    code: "C.3.1.1",
    category: "Management & Support",
    name: "Supply Chain & Logistics Management",
    confidentiality: "LOW",
    integrity: "MODERATE",
    availability: "MODERATE",
    highWatermark: "MODERATE",
    tailoringNotes: "Defense/critical infrastructure supply-chain provenance maps to SR family and SP 800-161.",
  },
  {
    code: "C.3.5.1",
    category: "Management & Support",
    name: "Continuity of Operations & Disaster Recovery (COOP)",
    confidentiality: "LOW",
    integrity: "MODERATE",
    availability: "HIGH",
    highWatermark: "HIGH",
    tailoringNotes: "COOP/mission-essential failover plans carry HIGH Availability; protect topology confidentiality at MODERATE.",
  },

  // Mission-Based Information Types (D.x)
  {
    code: "D.1.1",
    category: "Mission-Based",
    name: "Defense & National Security Operational Readiness",
    confidentiality: "HIGH",
    integrity: "HIGH",
    availability: "HIGH",
    highWatermark: "HIGH",
    tailoringNotes: "National Security Systems (NSS) trigger CNSSI 1253 overlays and DoD IL5/IL6.",
  },
  {
    code: "D.1.2",
    category: "Mission-Based",
    name: "Export-Controlled / ITAR / Technical Defense Data",
    confidentiality: "HIGH",
    integrity: "MODERATE",
    availability: "LOW",
    highWatermark: "HIGH",
    tailoringNotes: "CUI Specified / ITAR data requires CONUS U.S.-Person access controls, FIPS 140-3 validated crypto, and SP 800-171/172.",
  },
  {
    code: "D.2.1",
    category: "Mission-Based",
    name: "Foreign Relations & Diplomatic Operations",
    confidentiality: "HIGH",
    integrity: "MODERATE",
    availability: "LOW",
    highWatermark: "HIGH",
    tailoringNotes: "Sensitive cables/negotiations elevate Confidentiality to HIGH.",
  },
  {
    code: "D.3.1",
    category: "Mission-Based",
    name: "Homeland Security & Critical Infrastructure Protection",
    confidentiality: "MODERATE",
    integrity: "HIGH",
    availability: "HIGH",
    highWatermark: "HIGH",
    tailoringNotes: "SCADA/ICS telemetry and emergency alerts require HIGH Integrity and Availability.",
  },
  {
    code: "D.4.1",
    category: "Mission-Based",
    name: "Intelligence Operations & Tradecraft",
    confidentiality: "HIGH",
    integrity: "HIGH",
    availability: "MODERATE",
    highWatermark: "HIGH",
    tailoringNotes: "Governed by ICD 503 / CNSSI 1253 (Confidentiality/Integrity HIGH; SCI compartments require air-gapped/cross-domain guards).",
  },
  {
    code: "D.5.1",
    category: "Mission-Based",
    name: "Disaster Management & Emergency Response Dispatch",
    confidentiality: "LOW",
    integrity: "HIGH",
    availability: "HIGH",
    highWatermark: "HIGH",
    tailoringNotes: "Life-safety dispatch and triage systems tolerate zero integrity corruption or outage (I=H, A=H).",
  },
  {
    code: "D.6.1",
    category: "Mission-Based",
    name: "Criminal Investigation, Apprehension & Law Enforcement",
    confidentiality: "MODERATE",
    integrity: "HIGH",
    availability: "MODERATE",
    highWatermark: "HIGH",
    tailoringNotes: "Evidence chain-of-custody, NCIC/CJIS data require HIGH Integrity and CJIS/MODERATE+ Confidentiality.",
  },
  {
    code: "D.7.1",
    category: "Mission-Based",
    name: "Judicial / Litigation & Legal Case Files",
    confidentiality: "MODERATE",
    integrity: "HIGH",
    availability: "MODERATE",
    highWatermark: "HIGH",
    tailoringNotes: "Sealed filings, witness records, and evidentiary integrity require MODERATE/HIGH controls.",
  },
  {
    code: "D.10.1",
    category: "Mission-Based",
    name: "Energy, Grid & Nuclear Regulatory Telemetry",
    confidentiality: "MODERATE",
    integrity: "HIGH",
    availability: "HIGH",
    highWatermark: "HIGH",
    tailoringNotes: "Bulk electric/nuclear operational integrity requires HIGH I/A + NERC CIP / SP 800-82 overlays.",
  },
  {
    code: "D.11.1",
    category: "Mission-Based",
    name: "Environmental Monitoring & Weather Forecasting",
    confidentiality: "LOW",
    integrity: "MODERATE",
    availability: "MODERATE",
    highWatermark: "MODERATE",
    tailoringNotes: "Severe-weather alerting components require HIGH Availability during storms.",
  },
  {
    code: "D.14.1",
    category: "Mission-Based",
    name: "Banking, Taxation & Revenue Collection",
    confidentiality: "MODERATE",
    integrity: "HIGH",
    availability: "MODERATE",
    highWatermark: "HIGH",
    tailoringNotes: "Federal tax data (FTI / IRS Pub 1075) requires MODERATE+ Confidentiality and HIGH Integrity.",
  },
  {
    code: "D.15.1",
    category: "Mission-Based",
    name: "Regulatory Rulemaking, Inspections & Compliance Audits",
    confidentiality: "LOW",
    integrity: "MODERATE",
    availability: "LOW",
    highWatermark: "MODERATE",
    tailoringNotes: "Elevate Confidentiality to MODERATE when inspection records contain proprietary trade secrets.",
  },
  {
    code: "D.18.1",
    category: "Mission-Based",
    name: "Healthcare Delivery, Clinical EHR & Protected Health Info (PHI)",
    confidentiality: "MODERATE",
    integrity: "HIGH",
    availability: "HIGH",
    highWatermark: "HIGH",
    tailoringNotes: "Patient clinical safety depends on accurate medication/allergy records (I=H) and uninterrupted access (A=H); triggers HIPAA + Privacy baseline.",
  },
  {
    code: "D.18.2",
    category: "Mission-Based",
    name: "Health Research, Genomics & Epidemiological Surveillance",
    confidentiality: "MODERATE",
    integrity: "MODERATE",
    availability: "LOW",
    highWatermark: "MODERATE",
    tailoringNotes: "Identifiable genomic cohorts elevate Confidentiality to HIGH.",
  },
  {
    code: "D.19.1",
    category: "Mission-Based",
    name: "Income Security, Benefits Disbursement & Social Services",
    confidentiality: "MODERATE",
    integrity: "MODERATE",
    availability: "MODERATE",
    highWatermark: "MODERATE",
    tailoringNotes: "High-volume PII and benefit eligibility calculations require strong audit/reconciliation controls.",
  },
  {
    code: "D.21.1",
    category: "Mission-Based",
    name: "Aviation, Maritime & Surface Transportation Safety",
    confidentiality: "LOW",
    integrity: "HIGH",
    availability: "HIGH",
    highWatermark: "HIGH",
    tailoringNotes: "Real-time navigation/ATC data integrity and availability directly impact human safety.",
  },
  {
    code: "D.23.1",
    category: "Mission-Based",
    name: "Basic & Applied Scientific Research (CUI / Controlled Tech)",
    confidentiality: "MODERATE",
    integrity: "MODERATE",
    availability: "LOW",
    highWatermark: "MODERATE",
    tailoringNotes: "Fundamental public research is LOW; dual-use/controlled research maps to SP 800-171 Rev. 3.",
  },
  {
    code: "D.26.1",
    category: "Mission-Based",
    name: "Cybersecurity Threat & Vulnerability Sharing (ISAC/CISA)",
    confidentiality: "MODERATE",
    integrity: "HIGH",
    availability: "MODERATE",
    highWatermark: "HIGH",
    tailoringNotes: "TLP:AMBER/RED indicators and KEV advisories require HIGH Integrity against poisoning.",
  },
  {
    code: "D.27.1",
    category: "Mission-Based",
    name: "Controlled Unclassified Information (CUI Basic / Specified)",
    confidentiality: "MODERATE",
    integrity: "MODERATE",
    availability: "LOW",
    highWatermark: "MODERATE",
    tailoringNotes: "Minimum Federal Moderate baseline for federal systems, or NIST SP 800-171 Rev. 3 / SP 800-172 for nonfederal contractors.",
  },
  {
    code: "D.28.1",
    category: "Mission-Based",
    name: "Personally Identifiable Information (Sensitive PII / High-Impact)",
    confidentiality: "MODERATE",
    integrity: "MODERATE",
    availability: "LOW",
    highWatermark: "MODERATE",
    tailoringNotes: "Large-scale SSN/biometric/credential PII pools escalate Confidentiality to HIGH per OMB M-17-12 and SP 800-122.",
  },
];

/**
 * Authoritative Registry of 19 NIST SP & FIPS RMF Publications
 */
export const NIST_SP_PUBLICATIONS: readonly NistSpPublication[] = [
  {
    sourceId: "FIPS-199",
    docNumber: "FIPS 199",
    title: "Standards for Security Categorization of Federal Information and Information Systems",
    version: "February 2004",
    releaseDate: "2004-02-01",
    issuer: "NIST",
    category: "Categorization Standard",
    officialUrl: "https://csrc.nist.gov/pubs/fips/199/final",
    rmfSteps: [0, 1],
    summary: "Establishes mandatory LOW, MODERATE, and HIGH impact definitions across Confidentiality, Integrity, and Availability using the high-watermark rule.",
    keyConcepts: ["Security Objectives (C/I/A)", "Potential Impact (Limited/Serious/Severe)", "High-Watermark Principle", "Security Categorization Formula SC = {(C, impact), (I, impact), (A, impact)}"],
    deliverables: ["FIPS 199 Security Categorization Worksheet", "AO Categorization Sign-Off (C-3)"],
    invariants: ["System overall impact MUST equal max(Confidentiality, Integrity, Availability) — never average or lower below the highest information-type impact."],
    crossReferences: ["FIPS 200", "NIST SP 800-60", "NIST SP 800-37 Rev. 2 (Step 1)"],
    sections: [
      {
        id: "FIPS-199-SEC-3",
        heading: "Security Objectives & Potential Impact Scale (Low, Moderate, High)",
        content: "FIPS 199 defines three security objectives—Confidentiality, Integrity, and Availability—and three potential impact levels if compromised: LOW (limited adverse effect), MODERATE (serious adverse effect such as significant financial loss, degradation of mission capability, or significant harm not involving loss of life), and HIGH (severe or catastrophic adverse effect including loss of life, life-threatening injury, major asset loss, or severe national security damage). Not-Applicable (N/A) is permitted ONLY for Confidentiality on purely public information—never for Integrity or Availability.",
        citation: "FIPS 199 Section 3–4",
      },
      {
        id: "FIPS-199-SEC-4",
        heading: "High-Watermark Formula Across Multiple Information Types",
        content: "For a system processing multiple information types T_1..T_n, each objective's system impact is max_i(impact(T_i)), and the overall system security category equals max(C, I, A). Example: if a clinical portal stores Public Education info (L/L/L) and Clinical PHI (M/H/H), the overall FIPS 199 high-watermark is HIGH (C=Moderate, I=High, A=High).",
        citation: "FIPS 199 Section 4",
      },
    ],
  },
  {
    sourceId: "FIPS-200",
    docNumber: "FIPS 200",
    title: "Minimum Security Requirements for Federal Information and Information Systems",
    version: "March 2006",
    releaseDate: "2006-03-01",
    issuer: "NIST",
    category: "Minimum Security Standard",
    officialUrl: "https://csrc.nist.gov/pubs/fips/200/final",
    rmfSteps: [1, 2],
    summary: "Mandates minimum security requirements across 17 security-related areas (now 20 families in SP 800-53 Rev. 5) and binds FIPS 199 categories to SP 800-53/800-53B baselines.",
    keyConcepts: ["Minimum Security Requirements", "17 Core Security Areas", "Mandatory Baseline Selection"],
    deliverables: ["Baseline Control Binding Statement"],
    invariants: ["Agencies MUST meet FIPS 200 minimum requirements by selecting and tailoring the SP 800-53B baseline matching their FIPS 199 categorization."],
    crossReferences: ["FIPS 199", "NIST SP 800-53B", "NIST SP 800-53 Rev. 5"],
    sections: [
      {
        id: "FIPS-200-SEC-3",
        heading: "Mandatory Binding Between FIPS 199 Categorization and SP 800-53 Baselines",
        content: "FIPS 200 requires federal agencies to categorize systems under FIPS 199 and then apply the corresponding Low, Moderate, or High baseline controls in NIST SP 800-53 / 800-53B as tailored by organizational overlays and risk assessments.",
        citation: "FIPS 200 Section 3",
      },
    ],
  },
  {
    sourceId: "SP-800-18r1",
    docNumber: "NIST SP 800-18 Rev. 1",
    title: "Guide for Developing Security Plans for Federal Information Systems",
    version: "Rev. 1 (February 2006)",
    releaseDate: "2006-02-01",
    issuer: "NIST",
    category: "Authorization Package Guide",
    officialUrl: "https://csrc.nist.gov/pubs/sp/800/18/r1/final",
    rmfSteps: [0, 1, 2, 3, 5, 6],
    summary: "Defines the required structure, content, boundary diagrams, and control implementation documentation for a System Security Plan (SSP).",
    keyConcepts: ["Authorization Boundary", "System Interconnections (ISA/MOU)", "Control Implementation Statements (Responsible Role / Implementation Status / How Implemented)", "Common Control Inheritance"],
    deliverables: ["System Security Plan (SSP)", "Network & Data-Flow Boundary Diagram", "Hardware/Software Inventory"],
    invariants: ["Every control in the tailored baseline MUST explicitly identify its implementation status (Implemented, Partially Implemented, Planned, Alternative, N/A) and origination (System-Specific, Hybrid, Inherited)."],
    crossReferences: ["NIST SP 800-37 Rev. 2 (Tasks P-11, C-1, S-4, I-2)", "NIST SP 800-47"],
    sections: [
      {
        id: "SP-800-18-SSP",
        heading: "Required Elements of a Complete System Security Plan (SSP)",
        content: "An SP 800-18 Rev. 1 SSP captures: (1) System Identification, AO, System Owner, ISSO; (2) System Categorization (FIPS 199 + SP 800-60 info types); (3) System Operational Status & Type (General Support System vs. Major Application); (4) System Environment, Hardware/Software Inventory, and explicit Authorization Boundary diagram; (5) External System Interconnections with ISA/MOU agreements; (6) Minimum Security Control Implementation Statements detailing responsible role, implementation status, inheritance/CRM source, and technical mechanism.",
        citation: "NIST SP 800-18 Rev. 1 Section 3–4",
      },
    ],
  },
  {
    sourceId: "SP-800-30r1",
    docNumber: "NIST SP 800-30 Rev. 1",
    title: "Guide for Conducting Risk Assessments",
    version: "Rev. 1 (September 2012)",
    releaseDate: "2012-09-17",
    issuer: "NIST",
    category: "Risk Assessment Methodology",
    officialUrl: "https://csrc.nist.gov/pubs/sp/800/30/r1/final",
    rmfSteps: [0, 2, 4, 5, 6],
    summary: "Provides the authoritative 4-step Risk Assessment process (Prepare, Conduct, Communicate, Maintain) and qualitative/semi-quantitative threat-event likelihood x impact scoring.",
    keyConcepts: ["Threat Source & Capability/Intent/Targeting", "Threat Event vs. Vulnerability/Predisposing Condition", "Likelihood of Initiation x Likelihood of Adverse Impact", "Level of Risk Matrix (Very Low to Very High)", "Tiers 1, 2, 3 Risk Framing"],
    deliverables: ["Security & Privacy Risk Assessment Report (SAR/RA)", "Risk Matrix & Adversarial Threat Table"],
    invariants: ["Risk is NEVER determined by vulnerability severity alone; it combines Threat Source Capability/Intent, Vulnerability Exposure, Pervasiveness of Mitigations, and Mission Impact."],
    crossReferences: ["NIST SP 800-39", "NIST SP 800-37 Rev. 2 (Tasks P-3, P-14, R-2)"],
    sections: [
      {
        id: "SP-800-30-PROCESS",
        heading: "4-Step Risk Assessment Process (Prepare, Conduct, Communicate, Maintain)",
        content: "Step 1 (Prepare): establish purpose, scope, assumptions, risk models, and analytic scales from Tier 1 SP 800-39 framing. Step 2 (Conduct): identify threat sources (adversarial TTPs & non-adversarial hazards), map threat events, identify vulnerabilities and predisposing conditions, determine overall Likelihood = f(Initiation, Adverse Impact), determine Impact magnitude, and compute Risk = Likelihood x Impact on the 5-level scale (Very Low, Low, Moderate, High, Very High). Step 3 (Communicate): brief AO/executives with decision-ready findings. Step 4 (Maintain): update continuously from ISCM and ConMon triggers.",
        citation: "NIST SP 800-30 Rev. 1 Chapter 3",
      },
      {
        id: "SP-800-30-SCALE",
        heading: "Adversarial vs. Non-Adversarial Assessment Scales & Predisposing Conditions",
        content: "Adversarial initiation likelihood is assessed via Adversary Capability, Intent, and Targeting (Appendices D–F), whereas non-adversarial threat likelihood uses historical frequency/probability. Predisposing conditions (e.g., cloud multi-tenancy, remote access, legacy OS) amplify or dampen exposure before control evaluation.",
        citation: "NIST SP 800-30 Rev. 1 Appendices D–I",
      },
    ],
  },
  {
    sourceId: "SP-800-34r1",
    docNumber: "NIST SP 800-34 Rev. 1",
    title: "Contingency Planning Guide for Federal Information Systems",
    version: "Rev. 1 (May 2010, updated Nov 2010)",
    releaseDate: "2010-11-11",
    issuer: "NIST",
    category: "Contingency & Resilience",
    officialUrl: "https://csrc.nist.gov/pubs/sp/800/34/r1/final",
    rmfSteps: [0, 2, 3, 4, 6],
    summary: "Establishes the 7-step contingency planning process, Business Impact Analysis (BIA), and quantitative RTO, RPO, and MTD recovery objectives aligned to the CP control family.",
    keyConcepts: ["Business Impact Analysis (BIA)", "Maximum Tolerable Downtime (MTD)", "Recovery Time Objective (RTO)", "Recovery Point Objective (RPO)", "Alternate Sites (Cold/Warm/Hot/Mirror)", "CP-2 / CP-4 / CP-9 / CP-10 Alignment"],
    deliverables: ["Business Impact Analysis (BIA)", "Information System Contingency Plan (ISCP)", "Tabletop & Functional Failover Test Report"],
    invariants: ["RTO + Work Recovery Time MUST remain strictly <= Maximum Tolerable Downtime (MTD); backup encryption & offline/immutable copies MUST satisfy CP-9 before ATO."],
    crossReferences: ["NIST SP 800-53 (CP Family)", "FIPS 199 Availability Impact"],
    sections: [
      {
        id: "SP-800-34-BIA",
        heading: "Business Impact Analysis (BIA) & RTO / RPO / MTD Metrics",
        content: "The BIA (Phase 2 of SP 800-34's 7-step lifecycle) determines critical mission processes, outage impacts over time, Maximum Tolerable Downtime (MTD), Recovery Time Objective (RTO — maximum acceptable time to restore system function), and Recovery Point Objective (RPO — maximum acceptable data-loss window).",
        citation: "NIST SP 800-34 Rev. 1 Section 3.2",
      },
    ],
  },
  {
    sourceId: "SP-800-37r2",
    docNumber: "NIST SP 800-37 Rev. 2",
    title: "Risk Management Framework for Information Systems and Organizations",
    version: "Rev. 2 (December 2018)",
    releaseDate: "2018-12-20",
    issuer: "NIST",
    category: "Core RMF Lifecycle",
    officialUrl: "https://csrc.nist.gov/pubs/sp/800/37/r2/final",
    rmfSteps: [0, 1, 2, 3, 4, 5, 6],
    summary: "Governs the end-to-end 7-step Federal Risk Management Framework (Prepare, Categorize, Select, Implement, Assess, Authorize, Monitor) with 47 tasks unifying security, privacy, and supply-chain risk.",
    keyConcepts: ["Step 0 Prepare (P-1..P-18)", "Step 1 Categorize (C-1..C-3)", "Step 2 Select (S-1..S-6)", "Step 3 Implement (I-1..I-2)", "Step 4 Assess (A-1..A-6)", "Step 5 Authorize (R-1..R-5)", "Step 6 Monitor (M-1..M-7)", "Ongoing Authorization"],
    deliverables: ["Authorization Package (SSP, SAR, POA&M, Risk Assessment)", "ATO / DATO Decision Letter", "ISCM Strategy"],
    invariants: ["Only the Authorizing Official (AO) — never an AI, vendor, or CSP PA alone — can issue an ATO or accept residual risk."],
    crossReferences: ["NIST SP 800-39", "NIST SP 800-53 Rev. 5", "NIST SP 800-53A Rev. 5", "NIST SP 800-53B", "NIST SP 800-137"],
    sections: [
      {
        id: "SP-800-37-LIFECYCLE",
        heading: "7-Step RMF Lifecycle & Organization vs. System Integration",
        content: "Revision 2 added Step 0 (Prepare: 7 Organization-level tasks P-1..P-7 + 11 System-level tasks P-8..P-18) so executive risk strategy, common controls, baselines, and CSF Profiles precede Categorize (C-1..C-3), Select (S-1..S-6), Implement (I-1..I-2), Assess (A-1..A-6), Authorize (R-1..R-5), and Monitor (M-1..M-7).",
        citation: "NIST SP 800-37 Rev. 2 Chapter 3",
      },
      {
        id: "SP-800-37-ROLES",
        heading: "Core RMF Roles & Segregation of Duties",
        content: "SP 800-37 defines distinct authorities: Head of Agency, Risk Executive Function, CISO, Senior Agency Official for Privacy (SAOP), Authorizing Official (AO — senior official with budget/mission authority who assumes residual risk), System Owner, Information Owner/Steward, Common Control Provider, ISSM/ISSO (manages day-to-day posture), and Security Control Assessor (SCA — MUST maintain independence from system design/operation).",
        citation: "NIST SP 800-37 Rev. 2 Section 2.3 & Appendix D",
      },
    ],
  },
  {
    sourceId: "SP-800-39",
    docNumber: "NIST SP 800-39",
    title: "Managing Information Security Risk: Organization, Mission, and Information System View",
    version: "March 2011",
    releaseDate: "2011-03-01",
    issuer: "NIST",
    category: "Enterprise Risk Governance",
    officialUrl: "https://csrc.nist.gov/pubs/sp/800/39/final",
    rmfSteps: [0, 5, 6],
    summary: "Establishes the three-tier enterprise risk management hierarchy (Tier 1 Organization, Tier 2 Mission/Business Processes, Tier 3 Information Systems) and the 4-component risk cycle (Frame, Assess, Respond, Monitor).",
    keyConcepts: ["Tier 1 (Organization Governance)", "Tier 2 (Mission/Business Processes)", "Tier 3 (Information Systems)", "Frame / Assess / Respond / Monitor", "Trust Models (Validated, Direct Historical, Mediated, Mandated, Hybrid)"],
    deliverables: ["Enterprise Risk Management Strategy", "Risk Governance Charter"],
    invariants: ["System-level Tier 3 authorizations MUST align with Tier 1 organizational risk tolerance and Tier 2 mission processes."],
    crossReferences: ["NIST SP 800-37 Rev. 2", "NIST SP 800-30 Rev. 1"],
    sections: [
      {
        id: "SP-800-39-TIERS",
        heading: "Three-Tier Risk Architecture (Organization, Mission, System)",
        content: "Tier 1 establishes risk framing, governance structures, and enterprise risk tolerance. Tier 2 translates governance into enterprise architecture, common controls, and mission-process protections. Tier 3 executes RMF at the individual system level and feeds risk posture back up to Tiers 1–2.",
        citation: "NIST SP 800-39 Section 2.2",
      },
    ],
  },
  {
    sourceId: "SP-800-53r5",
    docNumber: "NIST SP 800-53 Rev. 5",
    title: "Security and Privacy Controls for Information Systems and Organizations",
    version: "Rev. 5.2.0 (OSCAL Compiled)",
    releaseDate: "2024-09-24",
    issuer: "NIST",
    category: "Control Catalog",
    officialUrl: "https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final",
    rmfSteps: [2, 3, 4, 6],
    summary: "Comprehensive catalog of 20 integrated security and privacy control families (324 base controls, 872 enhancements) plus Organization-Defined Parameters (ODPs).",
    keyConcepts: ["20 Control Families (AC..SR including PT Privacy & SR Supply Chain)", "Base Controls vs. Enhancements", "Withdrawn Control Lineage", "Outcome-Based Control Language"],
    deliverables: ["Control Implementation Matrix", "ODP Values Specification"],
    invariants: ["Never cite withdrawn Rev. 4/Rev. 5 controls (e.g., AC-13, AU-15, CM-4(1)) without explicitly citing their Rev. 5 replacements."],
    crossReferences: ["NIST SP 800-53A Rev. 5", "NIST SP 800-53B", "FedRAMP Rev. 5"],
    sections: [
      {
        id: "SP-800-53-FAMILIES",
        heading: "20 Integrated Security, Privacy (PT) & Supply Chain (SR) Control Families",
        content: "Rev. 5 unified security and privacy into 20 families: AC, AT, AU, CA, CM, CP, IA, IR, MA, MP, PE, PL, PM, PS, PT (PII Processing and Transparency), RA, SA, SC, SI, and SR (Supply Chain Risk Management), using system/organization-agnostic outcome-based statements.",
        citation: "NIST SP 800-53 Rev. 5 Chapter 2–3",
      },
    ],
  },
  {
    sourceId: "SP-800-53Ar5",
    docNumber: "NIST SP 800-53A Rev. 5",
    title: "Assessing Security and Privacy Controls in Information Systems and Organizations",
    version: "Rev. 5.2.0 (OSCAL Compiled)",
    releaseDate: "2022-01-25",
    issuer: "NIST",
    category: "Assessment Procedures",
    officialUrl: "https://csrc.nist.gov/pubs/sp/800/53/a/r5/final",
    rmfSteps: [4, 6],
    summary: "Provides 2,110 granular assessment objectives and Examine, Interview, and Test procedures to verify every SP 800-53 Rev. 5 control and enhancement.",
    keyConcepts: ["Assessment Objectives", "Examine Method (artifacts/configs)", "Interview Method (roles/staff)", "Test Method (automated/manual execution)", "Depth & Coverage Attributes (Basic/Focused/Comprehensive)"],
    deliverables: ["Security Assessment Plan (SAP)", "Evidence Traceability Matrix", "Security Assessment Report (SAR)"],
    invariants: ["Control effectiveness CANNOT be marked Satisfied without verified objective evidence covering applicable Examine, Interview, and Test methods."],
    crossReferences: ["NIST SP 800-53 Rev. 5", "NIST SP 800-37 Rev. 2 (Step 4)"],
    sections: [
      {
        id: "SP-800-53A-METHODS",
        heading: "Examine, Interview, and Test Rigor & Assessment Depth/Coverage",
        content: "SP 800-53A structures every control into lettered/numbered Determination Statements paired with explicit potential assessment methods (EXAMINE specifications/logs/SOPs; INTERVIEW personnel/operators; TEST authentication/scanning/failover) and tailorable Basic, Focused, and Comprehensive depth/coverage attributes.",
        citation: "NIST SP 800-53A Rev. 5 Chapter 2",
      },
    ],
  },
  {
    sourceId: "SP-800-53B",
    docNumber: "NIST SP 800-53B",
    title: "Control Baselines for Information Systems and Organizations",
    version: "October 2020 (Updated Dec 2020)",
    releaseDate: "2020-12-10",
    issuer: "NIST",
    category: "Control Baselines",
    officialUrl: "https://csrc.nist.gov/pubs/sp/800/53/b/final",
    rmfSteps: [0, 2],
    summary: "Separates the Low (149), Moderate (287), High (370), and Privacy (96) control baselines plus official tailoring rules from the main SP 800-53 Rev. 5 catalog.",
    keyConcepts: ["Low/Moderate/High Baselines", "Privacy Control Baseline", "Scoping Considerations", "Compensating Controls", "ODP Assignment Rules"],
    deliverables: ["Tailored Baseline Rationale", "Compensating Control Justification"],
    invariants: ["Privacy controls apply whenever a system processes PII—even on a FIPS 199 LOW system."],
    crossReferences: ["NIST SP 800-53 Rev. 5", "FIPS 200", "FedRAMP Rev. 5"],
    sections: [
      {
        id: "SP-800-53B-TAILOR",
        heading: "Official Tailoring Rules: Scoping, Compensating Controls & ODPs",
        content: "Tailoring permits: (1) Common control identification; (2) Applying scoping considerations (technology/operational-related, N/A public info, physical/environmental); (3) Selecting compensating controls ONLY when a baseline control cannot be implemented cleanly due to legitimate technical/business constraints and an equivalent risk mitigation is verified; (4) Assigning ODPs.",
        citation: "NIST SP 800-53B Section 2.2",
      },
    ],
  },
  {
    sourceId: "SP-800-60v1v2",
    docNumber: "NIST SP 800-60 Vol. 1 & 2 Rev. 1",
    title: "Guide for Mapping Types of Information and Information Systems to Security Categories",
    version: "Rev. 1 (August 2008)",
    releaseDate: "2008-08-01",
    issuer: "NIST",
    category: "Information-Type Categorization",
    officialUrl: "https://csrc.nist.gov/pubs/sp/800/60/v1/r1/final",
    rmfSteps: [0, 1],
    summary: "Maps 100+ federal mission-based and management/support information types to provisional FIPS 199 Confidentiality, Integrity, and Availability impact levels with tailoring rationale.",
    keyConcepts: ["Mission-Based Information Types", "Management & Support Information Types", "Provisional Impact Levels", "Context-Driven Impact Adjustment"],
    deliverables: ["SP 800-60 Information-Type Mapping Table", "System Categorization Rationale"],
    invariants: ["Provisional C/I/A impacts in Vol. 2 are starting points; adjust upward or downward ONLY with mission-specific impact justification approved by the AO."],
    crossReferences: ["FIPS 199", "NIST SP 800-37 Rev. 2 (Tasks P-12, C-2)"],
    sections: [
      {
        id: "SP-800-60-METHOD",
        heading: "Provisional Categorization & Context Adjustment Factors",
        content: "Volume 1 defines the 4-step mapping method: (1) Identify information types; (2) Assign provisional C/I/A levels from Volume 2; (3) Adjust C/I/A for aggregation, trade secrets, life safety, legal compliance, or critical dependencies; (4) Compute system FIPS 199 high-watermark.",
        citation: "NIST SP 800-60 Vol. 1 Section 3–4",
      },
    ],
  },
  {
    sourceId: "SP-800-61r3",
    docNumber: "NIST SP 800-61 Rev. 3",
    title: "Incident Response Recommendations and Considerations for Cybersecurity Risk Management",
    version: "Rev. 3 (April 2025)",
    releaseDate: "2025-04-03",
    issuer: "NIST",
    category: "Incident Response & IR Family",
    officialUrl: "https://csrc.nist.gov/pubs/sp/800/61/r3/final",
    rmfSteps: [3, 4, 6],
    summary: "Modernizes NIST incident response around the 6 NIST CSF 2.0 Functions (Govern, Identify, Protect, Detect, Respond, Recover), replacing standalone lifecycle silos with continuous ERM integration.",
    keyConcepts: ["CSF 2.0 Govern/Identify/Protect/Detect/Respond/Recover Integration", "Incident Triage & Forensic Preservation", "Eradication & Lessons Learned -> RMF M-3/M-4 Updates", "CISA/US-CERT Reporting SLAs"],
    deliverables: ["Incident Response Plan (IRP)", "Post-Incident Lessons Learned & RMF SIA"],
    invariants: ["Every confirmed security incident MUST trigger Step 6 Monitor updates (M-1/M-3/M-4) to re-evaluate risk, close detection gaps, and notify the AO."],
    crossReferences: ["NIST CSF 2.0", "NIST SP 800-53 (IR Family)", "CISA BOD 22-01"],
    sections: [
      {
        id: "SP-800-61R3-CSF",
        heading: "SP 800-61 Rev. 3 Alignment with NIST CSF 2.0 Six Functions",
        content: "SP 800-61 Rev. 3 embeds incident response across all six CSF 2.0 functions: GOVERN (incident roles/authorities), IDENTIFY (asset/risk posture), PROTECT (preventive guardrails), DETECT (telemetry/triage), RESPOND (containment/eradication/reporting), and RECOVER (restoration & lessons-learned feedback into RMF Step 6).",
        citation: "NIST SP 800-61 Rev. 3 Section 2–3",
      },
    ],
  },
  {
    sourceId: "SP-800-63-4",
    docNumber: "NIST SP 800-63-4 (Suite: 63A / 63B / 63C)",
    title: "Digital Identity Guidelines (IAL, AAL, FAL Assurance Levels)",
    version: "4th Revision (July 2025)",
    releaseDate: "2025-07-31",
    issuer: "NIST",
    category: "Digital Identity & IA Family",
    officialUrl: "https://csrc.nist.gov/pubs/sp/800/63/4/final",
    rmfSteps: [2, 3, 4],
    summary: "Defines Identity Assurance Levels (IAL1–3), Authentication Assurance Levels (AAL1–3), and Federation Assurance Levels (FAL1–3), phishing-resistant MFA (WebAuthn/FIDO2/PIV), and continuous evaluation.",
    keyConcepts: ["IAL1 / IAL2 / IAL3 (Identity Proofing)", "AAL1 / AAL2 / AAL3 (Phishing-Resistant Hardware Cryptographic MFA)", "FAL1 / FAL2 / FAL3 (SAML/OIDC Federation)", "Synced Passkeys vs. Device-Bound Hardware Keys (AAL3)"],
    deliverables: ["Digital Identity Risk Assessment (DIRA)", "IA-2 / IA-5 Assurance Mapping"],
    invariants: ["AAL3 requires hardware-backed, device-bound, verifier-impersonation-resistant (phishing-resistant) cryptographic authenticators (e.g., PIV/CAC or FIDO2 hardware security key) with FIPS 140-validated crypto."],
    crossReferences: ["NIST SP 800-53 (IA-2, IA-5, IA-8)", "OMB M-22-09", "NIST SP 800-207"],
    sections: [
      {
        id: "SP-800-63-AAL",
        heading: "AAL1, AAL2, and AAL3 Phishing-Resistant Authenticator Requirements",
        content: "AAL1 permits single- or multi-factor auth; AAL2 requires multi-factor authentication with replay resistance and >=1 phishing-resistant option available to subscribers; AAL3 strictly requires hardware-based, device-bound, phishing-resistant cryptographic authentication (PIV or FIPS-validated FIDO2/WebAuthn hardware token) — SMS/voice/TOTP/push codes CANNOT satisfy AAL3.",
        citation: "NIST SP 800-63B-4 Section 4",
      },
      {
        id: "SP-800-63-IAL-FAL",
        heading: "Identity Proofing (IAL1–3) & Federation (FAL1–3)",
        content: "IAL1 uses self-asserted attributes; IAL2 validates identity evidence remotely or in-person; IAL3 mandates in-person or supervised remote biometric/document verification by a trained operator. FAL1–FAL3 govern signed/encrypted assertions (SAML/OIDC) and holder-of-key cryptographic binding for federated enterprise SSO.",
        citation: "NIST SP 800-63A-4 & 63C-4",
      },
    ],
  },
  {
    sourceId: "SP-800-137",
    docNumber: "NIST SP 800-137 & SP 800-137A",
    title: "Information Security Continuous Monitoring (ISCM) for Federal Information Systems and Organizations",
    version: "September 2011 (137A: May 2020)",
    releaseDate: "2011-09-01",
    issuer: "NIST",
    category: "Continuous Monitoring (Step 6)",
    officialUrl: "https://csrc.nist.gov/pubs/sp/800/137/final",
    rmfSteps: [0, 2, 5, 6],
    summary: "Establishes the 6-step ISCM program (Define, Establish, Implement, Analyze & Report, Respond, Review & Update) powering Ongoing Authorization and automated ConMon telemetry.",
    keyConcepts: ["6-Step ISCM Process", "Control Volatility & Threat-Driven Frequencies", "Automated Security Telemetry Feeds", "Ongoing Authorization (OA) Criteria", "Security Impact Analysis (SIA)"],
    deliverables: ["Org & System ISCM Strategy", "Monthly/Quarterly ConMon Dashboard", "Security Impact Analysis (SIA) Triggers"],
    invariants: ["Continuous monitoring frequencies MUST reflect control volatility (vulnerability/config posture automated hourly–monthly; policy/IR drills annually or on significant change)."],
    crossReferences: ["NIST SP 800-37 Rev. 2 (Tasks P-7, S-5, M-1..M-6)", "FedRAMP ConMon Strategy Guide"],
    sections: [
      {
        id: "SP-800-137-CYCLE",
        heading: "6-Step ISCM Process & Ongoing Authorization Triggers",
        content: "ISCM executes: (1) Define strategy aligned to risk tolerance; (2) Establish program metrics, frequencies & automation architecture; (3) Implement collection & analysis; (4) Analyze data & report security status; (5) Respond to findings via risk mitigation/acceptance/avoidance; (6) Review & update strategy. Reauthorization triggers include material boundary/architecture changes, new high-severity unmitigated threats, or failed ConMon SLAs.",
        citation: "NIST SP 800-137 Section 3",
      },
    ],
  },
  {
    sourceId: "SP-800-160",
    docNumber: "NIST SP 800-160 Vol. 1 Rev. 1 & Vol. 2 Rev. 1",
    title: "Engineering Trustworthy Secure Systems & Developing Cyber-Resilient Systems",
    version: "Vol. 1 (Nov 2022) / Vol. 2 (Dec 2021)",
    releaseDate: "2022-11-29",
    issuer: "NIST",
    category: "Systems Security Engineering",
    officialUrl: "https://csrc.nist.gov/pubs/sp/800/160/v1/r1/final",
    rmfSteps: [0, 2, 3],
    summary: "Provides ISO/IEC/IEEE 15288 systems security engineering processes (Vol. 1) and 14 cyber-resiliency techniques—anticipate, withstand, recover, adapt—against advanced persistent threats (Vol. 2).",
    keyConcepts: ["Stakeholder Protection Needs", "Loss-Driven Systems Engineering", "Anticipate / Withstand / Recover / Adapt", "14 Cyber-Resiliency Techniques (Segmentation, Diversity, Redundancy, Non-Persistence, Deception)"],
    deliverables: ["System Security Requirements Spec (Task P-15)", "Resiliency Architecture Allocation (Task P-17)"],
    invariants: ["Security & resiliency requirements MUST be engineered from stakeholder loss scenarios during Step 0 Prepare—not bolted on after Step 3 Implement."],
    crossReferences: ["NIST SP 800-37 Rev. 2 (Tasks P-8..P-17, I-1)", "NIST SP 800-172"],
    sections: [
      {
        id: "SP-800-160-RESILIENCE",
        heading: "Cyber Resiliency Goals & Architectural Techniques (Vol. 2)",
        content: "Vol. 2 defines four overarching cyber-resiliency goals—Anticipate, Withstand, Recover, and Adapt—implemented via concrete engineering techniques: Adaptive Response, Analytic Monitoring, Contextual Awareness, Coordinated Protection, Deception, Diversity, Dynamic Positioning, Dynamic Representation, Non-Persistence, Privilege Restriction, Realignment, Redundancy, Segmentation, and Substantiated Integrity.",
        citation: "NIST SP 800-160 Vol. 2 Rev. 1 Chapter 2–3",
      },
    ],
  },
  {
    sourceId: "SP-800-171r3",
    docNumber: "NIST SP 800-171 Rev. 3 & SP 800-171A Rev. 3",
    title: "Protecting Controlled Unclassified Information (CUI) in Nonfederal Systems and Assessing CUI Requirements",
    version: "Rev. 3 (May 2024)",
    releaseDate: "2024-05-14",
    issuer: "NIST",
    category: "CUI / Defense Industrial Base",
    officialUrl: "https://csrc.nist.gov/pubs/sp/800/171/r3/final",
    rmfSteps: [1, 2, 3, 4],
    summary: "Establishes all CUI protection requirements (aligned to SP 800-53 Rev. 5 with ODP values and assessment procedures in 800-171A Rev. 3) for contractors, CMMC, and DFARS compliance.",
    keyConcepts: ["17 CUI Security Families (incl. SR & PL in Rev. 3)", "CUI Basic vs. CUI Specified", "SP 800-171A Assessment Procedures", "ODP Alignment & CMMC SPRS Scoring"],
    deliverables: ["CUI System Security Plan", "SPRS Assessment Score & CUI POA&M"],
    invariants: ["SPRS scoring starts at +110 and deducts 5/3/1 weighted points per unmet requirement down to -203; critical 5-point/non-POA&M gates block CMMC certification."],
    crossReferences: ["NIST SP 800-53 Rev. 5", "NIST SP 800-172", "32 CFR Part 170 (CMMC 2.0)"],
    sections: [
      {
        id: "SP-800-171A-ASSESS",
        heading: "SP 800-171A Rev. 3 Assessment Procedures for CUI Systems",
        content: "SP 800-171A Rev. 3 mirrors SP 800-53A by decomposing every CUI requirement (03.01.01 through 03.17.03) into discrete Assessment Objectives paired with Examine, Interview, and Test evidence objects—providing the exact audit rubric for DIBCAC and C3PAO assessors.",
        citation: "NIST SP 800-171A Rev. 3 Section 2–3",
      },
    ],
  },
  {
    sourceId: "SP-800-172",
    docNumber: "NIST SP 800-172 & SP 800-172A",
    title: "Enhanced Security Requirements for Protecting Controlled Unclassified Information (APT Supplement)",
    version: "February 2021 (172A: March 2022)",
    releaseDate: "2021-02-01",
    issuer: "NIST",
    category: "Enhanced CUI / CMMC Level 3",
    officialUrl: "https://csrc.nist.gov/pubs/sp/800/172/final",
    rmfSteps: [2, 3, 4],
    summary: "Supplements SP 800-171 with 35 enhanced requirements across three defense-in-depth strategies—penetration-resistant architecture, damage-limiting operations, and cyber-resilient design—for High-Value Assets / CMMC Level 3.",
    keyConcepts: ["24–35 Enhanced CUI Requirements (3.x.xe)", "Penetration-Resistant Architecture", "Damage-Limiting Operations (Zero Trust/Micro-segmentation)", "APT Threat Emulation & SOC 24/7 Hunting"],
    deliverables: ["CMMC Level 3 Enhanced Security Supplement", "Cyber-Resiliency Threat Traceability"],
    invariants: ["SP 800-172 enhances—never replaces—full SP 800-171 implementation for designated Critical Programs/Technologies."],
    crossReferences: ["NIST SP 800-171 Rev. 3", "NIST SP 800-160 Vol. 2", "CMMC 2.0 Level 3"],
    sections: [
      {
        id: "SP-800-172-THREE-PILLARS",
        heading: "Three Enhanced Defense Strategies Against Advanced Persistent Threats (APTs)",
        content: "SP 800-172 organizes enhanced protections around: (1) Penetration-Resistant Architecture (dual-authorization, automated malware/behavioral sandboxing, cryptographically signed software); (2) Damage-Limiting Operations (network isolation, credential compartmentalization, non-persistent execution); and (3) Cyber-Resilient Systems (continuous threat hunting, deception, and rapid reconstitution).",
        citation: "NIST SP 800-172 Chapter 2–3",
      },
    ],
  },
  {
    sourceId: "SP-800-207",
    docNumber: "NIST SP 800-207 & SP 800-207A",
    title: "Zero Trust Architecture (ZTA)",
    version: "August 2020 (207A: Sep 2023)",
    releaseDate: "2020-08-11",
    issuer: "NIST",
    category: "Zero Trust Architecture",
    officialUrl: "https://csrc.nist.gov/pubs/sp/800/207/final",
    rmfSteps: [0, 2, 3, 6],
    summary: "Defines the 7 Zero Trust tenets and the logical Control Plane / Data Plane components—Policy Engine (PE), Policy Administrator (PA), and Policy Enforcement Point (PEP)—eliminating implicit network trust.",
    keyConcepts: ["Policy Engine (PE) & Policy Administrator (PA)", "Policy Enforcement Point (PEP)", "Per-Session Dynamic Access Evaluation", "Micro-Segmentation & Software-Defined Perimeter", "Continuous Telemetry & Device Posture"],
    deliverables: ["Zero Trust Target Boundary Architecture (Task P-11/P-16)", "PEP/PE/PA Control Mapping"],
    invariants: ["Network location (being on corporate LAN or VPN) MUST NEVER grant implicit authorization; every request requires dynamic identity + device-posture + risk verification at the PEP."],
    crossReferences: ["OMB M-22-09", "NIST SP 800-63-4", "DoD Zero Trust Strategy"],
    sections: [
      {
        id: "SP-800-207-TENETS",
        heading: "7 Core Zero Trust Tenets & Logical Components (PE / PA / PEP)",
        content: "ZTA enforces: (1) All data sources and computing services are resources; (2) All communication is secured regardless of network location; (3) Access is granted per-session on least-privilege; (4) Access is governed by dynamic policy combining client identity, asset state, and behavioral telemetry; (5) Continuous monitoring of owned/non-owned asset integrity; (6) Dynamic, strict authentication/authorization before access; (7) Continuous asset/traffic telemetry feeds back into the Policy Engine (PE) -> Policy Administrator (PA) -> Policy Enforcement Point (PEP).",
        citation: "NIST SP 800-207 Section 2–3",
      },
    ],
  },
  {
    sourceId: "NIST-AI-100-1",
    docNumber: "NIST AI 100-1 (AI RMF 1.0) & AI 600-1",
    title: "Artificial Intelligence Risk Management Framework (AI RMF 1.0) & Generative AI Profile",
    version: "1.0 (January 2023; GenAI 600-1 July 2024)",
    releaseDate: "2024-07-26",
    issuer: "NIST",
    category: "AI Risk Management",
    officialUrl: "https://csrc.nist.gov/pubs/ai/100/1/final",
    rmfSteps: [0, 1, 2, 3, 4, 5, 6],
    summary: "Applies risk management to AI/LLM systems through four core functions—GOVERN, MAP, MEASURE, and MANAGE—paired with 7 trustworthiness characteristics and GenAI hallucination/data-privacy mitigations.",
    keyConcepts: ["GOVERN / MAP / MEASURE / MANAGE", "7 Trustworthy AI Characteristics (Valid & Reliable, Safe, Secure & Resilient, Accountable & Transparent, Explainable, Privacy-Enhanced, Fair)", "AI 600-1 GenAI Risks (Confabulation, CBRN, Data Poisoning, Prompt Injection)"],
    deliverables: ["AI System Impact Assessment", "TEVV (Test, Evaluation, Verification, Validation) Evidence Bundle"],
    invariants: ["AI systems operating inside Federal RMF boundaries MUST maintain deterministic safety guardrails, traceable provenance, and explicit human-in-the-loop authorization gates."],
    crossReferences: ["NIST SP 800-37 Rev. 2", "NIST CSF 2.0", "OMB M-24-10 / M-25-21"],
    sections: [
      {
        id: "NIST-AI-RMF-CORE",
        heading: "GOVERN, MAP, MEASURE, MANAGE Core Functions & Trustworthiness Criteria",
        content: "AI RMF 1.0 structures AI lifecycle risk across GOVERN (culture, roles, accountability, legal mapping — runs continuously across all stages), MAP (context, intended use, stakeholder impact, system boundaries), MEASURE (quantitative TEVV benchmarks, red-teaming, bias/hallucination metrics), and MANAGE (risk prioritization, incident/drift mitigation, decommissioning).",
        citation: "NIST AI 100-1 Section 3–5",
      },
    ],
  },
];

export function normalizeRmfTaskId(raw: string): string | null {
  const s = (raw || "").trim().toUpperCase().replace(/\s+/g, "");
  const m = s.match(/^(P|C|S|I|A|R|M)-?0*(\d{1,2})$/);
  if (!m) return null;
  const canon = `${m[1]}-${Number(m[2])}`;
  return NIST_SP_800_37_TASKS.some((t) => t.taskId === canon) ? canon : null;
}

export function lookupRmfTask(taskId: string): NistRmfTask | null {
  const canon = normalizeRmfTaskId(taskId);
  if (!canon) return null;
  return NIST_SP_800_37_TASKS.find((t) => t.taskId === canon) ?? null;
}

export function listRmfTasksByStep(stepNumber: number): NistRmfTask[] {
  return NIST_SP_800_37_TASKS.filter((t) => t.stepNumber === stepNumber);
}

export function lookupSp80060InfoType(codeOrQuery: string): Sp80060InfoType | null {
  const clean = (codeOrQuery || "").trim().toLowerCase();
  if (!clean) return null;
  const exact = NIST_SP_800_60_INFO_TYPES.find((it) => it.code.toLowerCase() === clean);
  if (exact) return exact;
  return NIST_SP_800_60_INFO_TYPES.find((it) => it.name.toLowerCase().includes(clean)) ?? null;
}

export function lookupNistPublication(idOrQuery: string): NistSpPublication | null {
  const clean = (idOrQuery || "").trim().toLowerCase();
  if (!clean) return null;
  const norm = clean.replace(/[^a-z0-9]+/g, "");
  for (const pub of NIST_SP_PUBLICATIONS) {
    const srcNorm = pub.sourceId.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const docNorm = pub.docNumber.toLowerCase().replace(/[^a-z0-9]+/g, "");
    if (srcNorm === norm || docNorm === norm || docNorm.includes(norm)) {
      return pub;
    }
  }
  return null;
}

const CATALOG_STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into", "your", "about",
  "what", "when", "where", "which", "would", "could", "should", "please", "how",
  "why", "can", "are", "was", "were", "have", "has", "nist", "system", "security",
  "information", "management", "table", "put", "list", "explain", "all",
]);

function extractSearchTerms(query: string): string[] {
  const raw = String(query || "")
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^[.-]+|[.-]+$/g, ""))
    .filter((t) => t.length >= 2 && !CATALOG_STOP_WORDS.has(t));
  return [...new Set(raw)];
}

export function searchNistSpCatalog(query: string, limit = 8): NistSpSearchHit[] {
  const q = String(query || "").trim();
  const qLow = q.toLowerCase();
  const terms = extractSearchTerms(q);
  const hits: NistSpSearchHit[] = [];

  // 1. Score explicit SP 800-37 Task IDs (e.g. P-1..P-18, C-1..C-3, S-1..S-6, I-1..I-2, A-1..A-6, R-1..R-5, M-1..M-7)
  const explicitTasks = new Set<string>();
  for (const m of q.match(/\b(P|C|S|I|A|R|M)-?0*(\d{1,2})\b/gi) || []) {
    const canon = normalizeRmfTaskId(m);
    if (canon) explicitTasks.add(canon);
  }

  // Handle ranges like "P-1 through P-7" or "P-1 to P-7"
  const rangeRe = /\b(P|C|S|I|A|R|M)-?0*(\d{1,2})\s*(?:through|thru|to|-|–)\s*\1?-?0*(\d{1,2})\b/gi;
  let rangeMatch: RegExpExecArray | null;
  while ((rangeMatch = rangeRe.exec(q)) !== null) {
    const letter = rangeMatch[1]!.toUpperCase();
    const startNum = Math.min(Number(rangeMatch[2]), Number(rangeMatch[3]));
    const endNum = Math.min(18, Math.max(Number(rangeMatch[2]), Number(rangeMatch[3])));
    for (let n = startNum; n <= endNum; n += 1) {
      const canon = normalizeRmfTaskId(`${letter}-${n}`);
      if (canon) explicitTasks.add(canon);
    }
  }

  for (const task of NIST_SP_800_37_TASKS) {
    let score = 0;
    const matchedTerms: string[] = [];
    if (explicitTasks.has(task.taskId)) {
      score += 48;
      matchedTerms.push(task.taskId);
    }
    const hay = `${task.taskId} ${task.stepCode} ${task.title} ${task.description} ${task.primaryRoles.join(" ")} ${task.expectedOutputs.join(" ")}`.toLowerCase();
    if (qLow.includes(task.title.toLowerCase())) {
      score += 24;
      matchedTerms.push(task.title);
    }
    if (new RegExp(`\\b${task.stepCode}\\b`, "i").test(q) && /\btask|800-37|step|roles?|deliverables?\b/i.test(qLow)) {
      score += 9;
      matchedTerms.push(task.stepCode);
    }
    for (const term of terms) {
      if (hay.includes(term)) {
        score += term.length >= 5 ? 3.5 : 2;
        if (!matchedTerms.includes(term)) matchedTerms.push(term);
      }
    }
    if (score >= 11) {
      hits.push({
        kind: "rmf_task",
        id: task.taskId,
        title: `SP 800-37 Task ${task.taskId}: ${task.title} (Step ${task.stepNumber} · ${task.stepCode})`,
        score: Number(score.toFixed(2)),
        matchedTerms,
        task,
      });
    }
  }

  // 2. Score NIST SP & FIPS Publications
  for (const pub of NIST_SP_PUBLICATIONS) {
    let score = 0;
    const matchedTerms: string[] = [];

    // Direct doc-number match (e.g. "800-30", "800-137", "800-207", "FIPS 199", "AI 100-1", "AI RMF")
    const numTokens = pub.docNumber.toLowerCase().match(/(?:800-\d+[a-z0-9-]*|fips\s*\d+|ai\s*100-1)/gi) || [];
    for (const nt of numTokens) {
      const compactNt = nt.replace(/\s+/g, "");
      const compactQ = qLow.replace(/\s+/g, "");
      if (qLow.includes(nt) || compactQ.includes(compactNt)) {
        score += 42;
        matchedTerms.push(pub.docNumber);
      }
    }
    // Partial prefix like "800-63" matching "800-63-4", or "ai rmf" matching NIST AI 100-1
    if (/\b800-63(?:-[1-4]|[abc])?\b/i.test(qLow) && pub.sourceId === "SP-800-63-4") {
      score += 40;
      matchedTerms.push("SP 800-63-4");
    }
    if (/\bai\s+rmf\b|\bai\s+600-1\b/i.test(qLow) && pub.sourceId === "NIST-AI-100-1") {
      score += 40;
      matchedTerms.push("AI RMF 1.0");
    }
    if (/\bzero\s+trust\b|\bzta\b/i.test(qLow) && pub.sourceId === "SP-800-207") {
      score += 30;
      matchedTerms.push("Zero Trust");
    }
    if (/\bbia\b|\brto\b|\brpo\b|\bcontingency\b/i.test(qLow) && pub.sourceId === "SP-800-34r1") {
      score += 24;
      matchedTerms.push("Contingency/BIA");
    }
    if (/\brisk\s+assessment\b|\blike?lihood\b|\bthreat\s+event\b/i.test(qLow) && pub.sourceId === "SP-800-30r1") {
      score += 24;
      matchedTerms.push("Risk Assessment");
    }
    if (/\biscm\b|\bcontinuous\s+monitoring\b|\bconmon\b/i.test(qLow) && pub.sourceId === "SP-800-137") {
      score += 24;
      matchedTerms.push("ISCM");
    }
    if (/\bcyber[- ]?resilien\w*\b|\bsystems?\s+security\s+engineering\b/i.test(qLow) && pub.sourceId === "SP-800-160") {
      score += 24;
      matchedTerms.push("Systems Security Engineering");
    }

    const hay = `${pub.docNumber} ${pub.title} ${pub.summary} ${pub.keyConcepts.join(" ")} ${pub.deliverables.join(" ")} ${pub.sections.map((s) => `${s.heading} ${s.content}`).join(" ")}`.toLowerCase();
    for (const term of terms) {
      if (hay.includes(term)) {
        score += term.length >= 6 ? 4 : 2.5;
        if (!matchedTerms.includes(term)) matchedTerms.push(term);
      }
    }

    if (score >= 9) {
      hits.push({
        kind: "publication",
        id: pub.sourceId,
        title: `${pub.docNumber}: ${pub.title}`,
        score: Number(score.toFixed(2)),
        matchedTerms,
        publication: pub,
      });
    }
  }

  // 3. Score NIST SP 800-60 Information Types
  const wants80060 = /\b800-60\b|\binformation\s+types?\b|\bfips\s*199\b|\bcategoriz\w*\b|\bprovisional\s+impact\b/i.test(qLow);
  for (const it of NIST_SP_800_60_INFO_TYPES) {
    let score = 0;
    const matchedTerms: string[] = [];
    if (qLow.includes(it.code.toLowerCase())) {
      score += 45;
      matchedTerms.push(it.code);
    }
    const hay = `${it.code} ${it.name} ${it.category} ${it.tailoringNotes}`.toLowerCase();
    let termMatches = 0;
    for (const term of terms) {
      if (hay.includes(term)) {
        termMatches += 1;
        score += 4;
        if (!matchedTerms.includes(term)) matchedTerms.push(term);
      }
    }
    if (wants80060 && termMatches >= 1) score += 6;
    if (score >= 10) {
      hits.push({
        kind: "sp800_60_info_type",
        id: it.code,
        title: `SP 800-60 ${it.code}: ${it.name} (C:${it.confidentiality}/I:${it.integrity}/A:${it.availability} → ${it.highWatermark})`,
        score: Number(score.toFixed(2)),
        matchedTerms,
        infoType: it,
      });
    }
  }

  return hits
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, Math.max(1, limit));
}

/**
 * Generates clean, self-contained, US Gov Public Domain Q&A training records
 * covering all 19 NIST SP publications (and detailed sections), all 7 RMF step
 * task rosters (47 tasks), and SP 800-60 information types.
 */
export function buildNistSpTrainingPairs(): NistSpTrainingPair[] {
  const pairs: NistSpTrainingPair[] = [];

  // 1. One comprehensive pair per NIST SP / FIPS publication + one pair per key section
  for (const pub of NIST_SP_PUBLICATIONS) {
    pairs.push({
      id: `NIST-PUB-${pub.sourceId}`,
      canonicalRef: pub.docNumber,
      domain: "cybersecurity",
      systemPrompt: `You are Noctis Federal RMF Intelligence grounded strictly in ${pub.docNumber} (${pub.officialUrl}).`,
      question: `Summarize ${pub.docNumber} (${pub.title}), its RMF lifecycle steps, deliverables, and mandatory compliance invariants.`,
      answer:
        `### ${pub.docNumber}: ${pub.title}\n` +
        `- **Version / Release:** ${pub.version} · **Official NIST URL:** ${pub.officialUrl}\n` +
        `- **RMF Steps Covered:** ${pub.rmfSteps.map((s) => `Step ${s}`).join(", ")}\n` +
        `- **Core Scope:** ${pub.summary}\n` +
        `- **Key Concepts:** ${pub.keyConcepts.join(" · ")}\n` +
        `- **Primary Deliverables:** ${pub.deliverables.join("; ")}\n` +
        `- **Mandatory Invariants:** ${pub.invariants.join(" ")}`,
      url: pub.officialUrl,
    });

    for (const sec of pub.sections) {
      pairs.push({
        id: `NIST-SEC-${sec.id}`,
        canonicalRef: sec.citation,
        domain: "cybersecurity",
        systemPrompt: `You are Noctis Federal RMF Intelligence citing ${sec.citation} (${pub.officialUrl}).`,
        question: `In ${pub.docNumber}, explain ${sec.heading}.`,
        answer:
          `### ${pub.docNumber} — ${sec.heading}\n` +
          `- **Authoritative Citation:** ${sec.citation} · **URL:** ${pub.officialUrl}\n` +
          `- **Technical Specification:** ${sec.content}\n` +
          `- **Cross-References:** ${pub.crossReferences.join(", ")}`,
        url: pub.officialUrl,
      });
    }
  }

  // 2. One task-matrix pair per RMF Step (0..6) covering all 47 SP 800-37 Rev. 2 tasks
  const stepNames: Record<number, string> = {
    0: "Step 0: Prepare (P-1 through P-18)",
    1: "Step 1: Categorize (C-1 through C-3)",
    2: "Step 2: Select (S-1 through S-6)",
    3: "Step 3: Implement (I-1 through I-2)",
    4: "Step 4: Assess (A-1 through A-6)",
    5: "Step 5: Authorize (R-1 through R-5)",
    6: "Step 6: Monitor (M-1 through M-7)",
  };

  for (let step = 0; step <= 6; step += 1) {
    const tasks = listRmfTasksByStep(step);
    const taskLines = tasks.map(
      (t) => `- **${t.taskId} (${t.title}, ${t.level})** — Roles: ${t.primaryRoles.join(", ")} | Outputs: ${t.expectedOutputs.join("; ")}`,
    );
    pairs.push({
      id: `NIST-800-37-STEP-${step}`,
      canonicalRef: `SP 800-37 Rev. 2 Step ${step}`,
      domain: "cybersecurity",
      systemPrompt: "You are Noctis Federal RMF Intelligence grounded in NIST SP 800-37 Rev. 2.",
      question: `List all official NIST SP 800-37 Rev. 2 tasks, primary roles, and deliverables for RMF ${stepNames[step]}.`,
      answer:
        `### NIST SP 800-37 Rev. 2 — ${stepNames[step]} (${tasks.length} Tasks)\n` +
        `- **Official URL:** https://csrc.nist.gov/pubs/sp/800/37/r2/final\n` +
        taskLines.join("\n"),
      url: "https://csrc.nist.gov/pubs/sp/800/37/r2/final",
    });
  }

  // 3. Individual high-frequency RMF Task pairs (47 tasks grouped compactly or individually)
  for (const t of NIST_SP_800_37_TASKS) {
    pairs.push({
      id: `NIST-TASK-${t.taskId}`,
      canonicalRef: `SP 800-37 ${t.taskId}`,
      domain: "cybersecurity",
      systemPrompt: "You are Noctis Federal RMF Intelligence grounded in NIST SP 800-37 Rev. 2.",
      question: `What is NIST SP 800-37 Rev. 2 Task ${t.taskId} (${t.title}), who is responsible, and what outputs are required?`,
      answer:
        `### NIST SP 800-37 Rev. 2 Task ${t.taskId}: ${t.title}\n` +
        `- **RMF Step:** Step ${t.stepNumber} (${t.stepCode}) · **Level:** ${t.level}\n` +
        `- **Primary Roles:** ${t.primaryRoles.join(", ")} · **Supporting Roles:** ${t.supportingRoles.join(", ")}\n` +
        `- **Expected Outputs:** ${t.expectedOutputs.join("; ")}\n` +
        `- **Governing Publications:** ${t.governingPubs.join(", ")}\n` +
        `- **Task Specification:** ${t.description}`,
      url: "https://csrc.nist.gov/pubs/sp/800/37/r2/final",
    });
  }

  // 4. SP 800-60 Information Type Groupings (4 thematic pairs covering all 32 cataloged info types)
  const chunkSize = 8;
  for (let i = 0; i < NIST_SP_800_60_INFO_TYPES.length; i += chunkSize) {
    const slice = NIST_SP_800_60_INFO_TYPES.slice(i, i + chunkSize);
    const groupIdx = Math.floor(i / chunkSize) + 1;
    const summaryNames = slice.map((x) => `${x.code} ${x.name}`).slice(0, 4).join(", ");
    const rows = slice.map(
      (x) => `- **${x.code} (${x.name})** [${x.category}]: C=${x.confidentiality}, I=${x.integrity}, A=${x.availability} -> High-Watermark **${x.highWatermark}**. ${x.tailoringNotes}`,
    );
    pairs.push({
      id: `NIST-800-60-GRP-${groupIdx}`,
      canonicalRef: `SP 800-60 Vol. 2 Group ${groupIdx}`,
      domain: "cybersecurity",
      systemPrompt: "You are Noctis Federal RMF Intelligence grounded in NIST SP 800-60 Vol. 1 & 2 Rev. 1.",
      question: `What are the NIST SP 800-60 Vol. 2 provisional FIPS 199 C/I/A impact levels for ${summaryNames}?`,
      answer:
        `### NIST SP 800-60 Vol. 2 Rev. 1 Provisional Categorization (Batch ${groupIdx})\n` +
        `- **Official URL:** https://csrc.nist.gov/pubs/sp/800/60/v1/r1/final\n` +
        rows.join("\n"),
      url: "https://csrc.nist.gov/pubs/sp/800/60/v1/r1/final",
    });
  }

  return pairs;
}
