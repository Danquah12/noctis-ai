/**
 * NOCTIS SOVEREIGN KNOWLEDGE GROUNDING ENGINE (PHASE 1)
 * ======================================================
 * Authoritative ground-truth knowledge base for:
 * 1. The 16 Sovereign Suites (AAIAAS, SHIELD, CDSTRIAGE, CyberP1, RMF/GRCP2, HealthP3,
 *    FinanceP4, EngineeringP5, SoftwareBUILD, Legal, Defense, Science, OSINT, Government,
 *    Education, Enterprise, Energy, Infrastructure, Research).
 * 2. SQDEC Governance Model (Safety > Quality > Delivery > Economics > Control).
 * 3. Dual-Plane Enclave Architecture (Cloud Control Plane vs. Air-Gapped Sovereign Enclave).
 * 4. 50+ Enterprise Plugins & Distributed Systems.
 * 5. Global API Gateway Routing & Master Training Schedule.
 */

export interface SovereignSuiteMetadata {
  id: string;
  name: string;
  slug: string;
  badge: string;
  priorityRank: number;
  category: "Security" | "Healthcare" | "Finance" | "Governance" | "Engineering" | "Intelligence" | "Operations" | "Science" | "Legal";
  purpose: string;
  runtime: string;
  keyCapabilities: string[];
  keyAgents: string[];
  sqdecPillar: "Safety" | "Quality" | "Delivery" | "Economics" | "Control";
}

export const NOCTIS_16_SOVEREIGN_SUITES: SovereignSuiteMetadata[] = [
  {
    id: "noctis-cyber",
    name: "Noctis Cyber (Cyber P1)",
    slug: "cyber",
    badge: "SHIELD",
    priorityRank: 1,
    category: "Security",
    purpose: "Continuous threat synthesis, AST vulnerability scanning, exploit path modeling, and autonomous SAST/DAST remediation.",
    runtime: "DStrike Sovereign Enclave (Air-Gapped / Metal)",
    keyCapabilities: ["Polyglot AST Vulnerability Scan", "Lateral Movement Path Solver", "Cryptographic Patch Synthesis", "CISA KEV Real-Time Radar"],
    keyAgents: ["Red Team Exploitation Agent", "Blue Defense Remediator"],
    sqdecPillar: "Safety",
  },
  {
    id: "noctis-rmf",
    name: "Noctis RMF / GRC (GRC P2)",
    slug: "rmf",
    badge: "GRCP2",
    priorityRank: 2,
    category: "Governance",
    purpose: "Risk Management Framework automation, NIST SP 800-37/53 Rev 5 control attestation, and continuous FedRAMP/DoD IL5 authorization.",
    runtime: "DStrike Sovereign Enclave",
    keyCapabilities: ["Continuous Control Assessment", "System Security Plan (SSP) Synthesis", "Cryptographic Compliance Attestation", "POA&M Lifecycle Tracker"],
    keyAgents: ["Assessor Agent", "Authorizing Official Proxy Agent"],
    sqdecPillar: "Control",
  },
  {
    id: "noctis-health",
    name: "Noctis Health & Patient Diagnostic (Health P3)",
    slug: "health",
    badge: "CDSTRIAGE",
    priorityRank: 3,
    category: "Healthcare",
    purpose: "Clinical decision support, multi-modal medical diagnostics, USMLE/NEJM frontier benchmarking, and FHIR/DICOM compliance.",
    runtime: "DStrike Sovereign Enclave (HIPAA Safe Harbor / Zero-Data-Leak)",
    keyCapabilities: ["30 Clinical Specialty Track Engine", "DICOM CT/MRI/CXR Vision", "Real-Time Resuscitation / ACLS Coach", "Clinical FMEA Risk Matrix"],
    keyAgents: ["Diagnostic Triage Agent", "Clinical Safety Arbiter Agent"],
    sqdecPillar: "Safety",
  },
  {
    id: "noctis-finance",
    name: "Noctis Finance & Investment (Invest P4)",
    slug: "finance",
    badge: "InvestP4",
    priorityRank: 4,
    category: "Finance",
    purpose: "Quantitative risk valuation, Monte Carlo Value-at-Risk (VaR), Black-Scholes volatility modeling, and capital sensitivity analysis.",
    runtime: "DStrike Sovereign Enclave",
    keyCapabilities: ["Black-Scholes Greek Solver", "Monte Carlo 10,000-Path VaR", "Markowitz Mean-Variance Tangency", "SEC EDGAR Form 10-K Ingestion"],
    keyAgents: ["Quant Risk Agent", "Macro Liquidity Strategist"],
    sqdecPillar: "Economics",
  },
  {
    id: "noctis-engineering",
    name: "Noctis Engineering (Engineering P5)",
    slug: "engineering",
    badge: "EngineeringP5",
    priorityRank: 5,
    category: "Engineering",
    purpose: "Deep physical systems engineering, PDE numerical solvers, cleanroom thermodynamics, and frontier aerospace/nuclear challenges.",
    runtime: "DStrike Sovereign Enclave",
    keyCapabilities: ["Fusion Tokamak MHD Solver", "Scramjet Aeroheating Simulator", "Cleanroom Airflow PDE", "Subsea HVDC Loss Calculator"],
    keyAgents: ["Systems Physics Solver", "Structural Attestation Agent"],
    sqdecPillar: "Quality",
  },
  {
    id: "noctis-build",
    name: "Noctis Software & Build",
    slug: "software",
    badge: "SoftwareBUILD",
    priorityRank: 6,
    category: "Engineering",
    purpose: "Autonomous software development, formal type verification, multi-repo synchronization, and CI/CD attestation.",
    runtime: "DStrike Sovereign Enclave",
    keyCapabilities: ["Polyglot Static Analysis", "Automated Test Synthesis", "Git Triple-Remote Synchronizer", "Wasm Compiler Sandbox"],
    keyAgents: ["Architect Agent", "Compiler Attestation Bot"],
    sqdecPillar: "Delivery",
  },
  {
    id: "noctis-legal",
    name: "Noctis Legal",
    slug: "legal",
    badge: "LEX",
    priorityRank: 7,
    category: "Legal",
    purpose: "Statutory interpretation, contract synthesis, regulatory gap analysis, and global compliance arbitration.",
    runtime: "DStrike Sovereign Enclave",
    keyCapabilities: ["Contract Cross-Clause Validator", "Jurisdictional Conflict Resolver", "Regulatory Redline Diff", "GDPR/HIPAA Privacy Attestation"],
    keyAgents: ["Contract Counsel Agent", "Statutory Scholar"],
    sqdecPillar: "Control",
  },
  {
    id: "noctis-defense",
    name: "Noctis Defense",
    slug: "defense",
    badge: "DEFENSE",
    priorityRank: 8,
    category: "Security",
    purpose: "Strategic mission planning, electronic warfare simulation, command & control (C2) resilience, and anti-tamper enclaves.",
    runtime: "Air-Gapped Sovereign Hardware Enclave",
    keyCapabilities: ["Zero-Trust C2 Protocol", "Anti-Tamper Cryptographic Enclave", "Mission Plan FMEA", "EMP/EW Degradation Model"],
    keyAgents: ["Mission Tactical Strategist", "Anti-Tamper Sentinel"],
    sqdecPillar: "Safety",
  },
  {
    id: "noctis-science",
    name: "Noctis Science",
    slug: "science",
    badge: "SCIENCE",
    priorityRank: 9,
    category: "Science",
    purpose: "Astrophysics, molecular biology, relativistic mechanics, quantum chemistry, and genomic sequence synthesis.",
    runtime: "DStrike Sovereign Enclave",
    keyCapabilities: ["Relativistic Lorentz & Schwarzschild Solvers", "PCR DNA Melting Temperature Kinetics", "Henderson-Hasselbalch Equilibria", "Hubble Constant Recession"],
    keyAgents: ["Theoretical Physicist", "Molecular Geneticist"],
    sqdecPillar: "Quality",
  },
  {
    id: "noctis-osint",
    name: "Noctis Intelligence (OSINT)",
    slug: "intelligence",
    badge: "OSINT",
    priorityRank: 10,
    category: "Intelligence",
    purpose: "Open-source intelligence, entity graph extraction, geolocation analysis, and global disinformation verification.",
    runtime: "DStrike Sovereign Enclave",
    keyCapabilities: ["Cross-Border Entity Linker", "Satellite Imagery Geospatial Matcher", "Darkweb Threat Actor TTP Map", "Disinformation Forensic Classifier"],
    keyAgents: ["Investigative Analyst", "Graph Fusion Engine"],
    sqdecPillar: "Quality",
  },
  {
    id: "noctis-government",
    name: "Noctis Government",
    slug: "government",
    badge: "GOV",
    priorityRank: 11,
    category: "Governance",
    purpose: "Public sector service automation, citizen benefits eligibility modeling, and sovereign policy impact analysis.",
    runtime: "DStrike Sovereign Enclave",
    keyCapabilities: ["Policy Impact Simulator", "Inter-Agency Information Sharing Broker", "Public Safety Dispatch Protocol", "FOIA Request Synthesizer"],
    keyAgents: ["Public Policy Analyst", "Intergovernmental Liaison"],
    sqdecPillar: "Delivery",
  },
  {
    id: "noctis-education",
    name: "Noctis Education",
    slug: "education",
    badge: "EDU",
    priorityRank: 12,
    category: "Operations",
    purpose: "Socratic tutoring, professional certification mastery (USMLE, CISSP, Bar Exam), and automated curriculum generation.",
    runtime: "DStrike Sovereign Enclave",
    keyCapabilities: ["Socratic Question Generator", "Knowledge Gap Diagnostic", "Adaptive Spaced Repetition", "Multi-Track Exam Simulator"],
    keyAgents: ["Socratic Tutor Agent", "Curriculum Architect"],
    sqdecPillar: "Quality",
  },
  {
    id: "noctis-enterprise",
    name: "Noctis Enterprise",
    slug: "enterprise",
    badge: "ENTERPRISE",
    priorityRank: 13,
    category: "Operations",
    purpose: "Enterprise ERP integration, multi-agent business process automation, supply chain resilience, and SLA enforcement.",
    runtime: "DStrike Sovereign Enclave",
    keyCapabilities: ["Autonomous Swarm Orchestration", "ERP Supply Chain Disruption Predictor", "Customer SLA Enforcement Engine", "Multi-Tenant Resource Arbiter"],
    keyAgents: ["Operations Chief Agent", "Supply Chain Arbitrator"],
    sqdecPillar: "Economics",
  },
  {
    id: "noctis-energy",
    name: "Noctis Energy",
    slug: "energy",
    badge: "ENERGY",
    priorityRank: 14,
    category: "Engineering",
    purpose: "Electrical grid load balancing, renewable battery energy storage (BESS) arbitrage, and microgrid islanding.",
    runtime: "DStrike Sovereign Enclave",
    keyCapabilities: ["Dynamic Frequency Regulation Solver", "BESS Lithium-Ion Degradation Model", "Solar/Wind Forecast Dispatcher", "Microgrid Blackstart Sequencing"],
    keyAgents: ["Grid Dispatch Agent", "Battery Life Arbitrator"],
    sqdecPillar: "Economics",
  },
  {
    id: "noctis-infrastructure",
    name: "Noctis Infrastructure",
    slug: "infrastructure",
    badge: "INFRA",
    priorityRank: 15,
    category: "Engineering",
    purpose: "Critical infrastructure SCADA monitoring, civil hydraulic / bridge stress telemetry, and utility cybersecurity.",
    runtime: "DStrike Sovereign Enclave",
    keyCapabilities: ["Modbus / DNP3 Industrial Protocol Inspector", "Finite Element Bridge Stress Model", "Water Utility Chemical Dosing Guardian", "SCADA Anomaly Detection"],
    keyAgents: ["SCADA Guardian Agent", "Structural Integrity Assessor"],
    sqdecPillar: "Safety",
  },
  {
    id: "noctis-research",
    name: "Noctis Research",
    slug: "research",
    badge: "RESEARCH",
    priorityRank: 16,
    category: "Science",
    purpose: "Deep multidisciplinary research jobs, citation graph validation, hypothesis generation, and experimental design.",
    runtime: "DStrike Sovereign Enclave",
    keyCapabilities: ["Recursive Literature Synthesis", "Mathematical Proof Verification", "Experimental Variable Control Matrix", "Hypothesis Red Teaming"],
    keyAgents: ["Principal Investigator Agent", "Peer Review Adversary"],
    sqdecPillar: "Quality",
  },
];

export const SQDEC_GOVERNANCE_MODEL = {
  acronym: "SQDEC",
  hierarchy: [
    { rank: 1, pillar: "Safety", rule: "Non-negotiable clinical, physical, and cyber harm prevention. Trumps all other considerations." },
    { rank: 2, pillar: "Quality", rule: "Mathematical precision, peer-reviewed clinical rigor, formal verification, zero hallucination." },
    { rank: 3, pillar: "Delivery", rule: "Deterministic latency, high-throughput SLAs, air-gapped availability." },
    { rank: 4, pillar: "Economics", rule: "Compute efficiency, token optimization, GPU layer tuning, cost sustainability." },
    { rank: 5, pillar: "Control", rule: "Complete user sovereignty, zero external data leakage, strict cryptographic audit trails." },
  ],
  axiom: "Safety > Quality > Delivery > Economics > Control. A violation of a higher pillar immediately halts downstream execution via automated Circuit Breakers.",
};

export const DUAL_PLANE_SPECIFICATION = {
  cloudControlPlane: {
    name: "Noctis Ultra Control Plane",
    runtime: "Vercel Fluid Compute Edge & Global Anycast CDN",
    url: "https://www.dstrike.app/noctis",
    apiGateway: "https://www.dstrike.app/api/noctis",
    purpose: "Strategic orchestration, user interface, global routing, BYOK provider bridging, and streaming telemetry.",
  },
  sovereignEnclavePlane: {
    name: "Sovereign Air-Gapped Enclave Plane",
    runtime: "Local Apple Silicon Metal GPU / Linux CGroup / Windows Hyper-V",
    loopback: "http://127.0.0.1:11434 or local socket",
    purpose: "Zero-data-leak clinical records, PHI/PII processing, classified defense tasks, offline ACLS resuscitation coach, and cryptographic audit signing.",
    securityCert: "HIPAA Safe Harbor, NIST SP 800-171, FIPS 140-3 compatible",
  },
};

export const ENTERPRISE_PLUGINS_PORTFOLIO = [
  { category: "Healthcare & Clinical", count: 8, examples: ["Epic Systems FHIR R4", "Cerner Millennium API", "DICOM PACS Connector", "LOINC/SNOMED Terminology Broker", "ACLS Resuscitation Telemetry"] },
  { category: "Cybersecurity & SIEM", count: 12, examples: ["CrowdStrike Falcon", "Splunk Enterprise", "Microsoft Sentinel", "CISA KEV Live Radar", "MITRE ATT&CK Navigator", "Palo Alto PAN-OS"] },
  { category: "DevOps & Cloud Infrastructure", count: 14, examples: ["GitHub Actions", "GitLab CI", "Jira Software", "Terraform Cloud", "Kubernetes Operator", "AWS CloudTrail", "Google Cloud Vertex"] },
  { category: "Fintech & Regulatory", count: 9, examples: ["Bloomberg B-PIPE", "SEC EDGAR Form 10-K/Q", "FINRA Regulatory Feed", "Stripe Connect", "ISO 20022 Financial Switch"] },
  { category: "Creative & Engineering Tools", count: 11, examples: ["Canva Layout Engine", "Figma Design Sync", "AutoCAD DXF Parser", "Jupyter Notebook Kernel", "LaTeX KaTeX Engine"] },
];

/**
 * Checks if user question is querying Noctis sovereign architecture, suites, plugins, SQDEC, or training.
 */
export function isSovereignInquiry(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  const q = text.toLowerCase();

  // Clinical & Patient Safety Guard: never intercept clinical presentations, emergency orders, or patient cases
  if (
    /\b(patient|chest\s+pain|aort\w*|stemi|heparin|aspirin|vitals?|ecg|ekg|troponin|resuscitat\w*|infarct\w*|intubat\w*|dka|sepsis|stroke|bp\s+\d+|blood\s+pressure|triage|symptom|prescription|medication|contraindicat\w*|cath\s+lab|bay\b)\b/i.test(
      q
    )
  ) {
    return false;
  }

  // Task & Benchmark Execution Guard: never intercept specific case audits or mathematical evaluations
  if (/\b(evaluate\s+this|calculate|how\s+to\s+treat|clinical\s+decision|cds\s+safety|safety\s+invariants?)\b/i.test(q)) {
    return false;
  }

  return (
    /\b(sqdec|sovereign\s*(?:suite|system|architecture|framework|enclave|model)|aaiaas|cdstriage|shield\s*v8|grcp2|healthp3|investp4|engineeringp5|softwarebuild)\b/i.test(q) ||
    /\b(16\s*(?:sovereign|suites|systems)|dual[\s-]plane|air[\s-]gap\s*enclave|enclave\s*runner)\b/i.test(q) ||
    /\b(50\+?\s*plugins?|plugins\s*(?:&|and)\s*systems|dstrike\s*platform)\b/i.test(q) ||
    /\b(what\s+is\s+noctis|who\s+is\s+noctis|training\s+schedule|master\s+training|tell\s+me\s+about\s+noctis|introduce\s+noctis|about\s+noctis)\b/i.test(q)
  );
}

/**
 * Generates an authoritative, fully grounded Markdown answer for sovereign inquiries.
 */
export function resolveSovereignResponse(text: string): string | null {
  if (!isSovereignInquiry(text)) return null;
  const q = text.toLowerCase();

  // 1. Inquiries about SQDEC Governance
  if (/\b(sqdec|governance\s*model|safety\s*quality\s*delivery)\b/i.test(q)) {
    return [
      `# Noctis SQDEC Sovereign Governance Framework`,
      ``,
      `Noctis executes all reasoning and action plans under the mathematically enforced **SQDEC Hierarchy**:`,
      ``,
      `$$\\text{Safety} \\succ \\text{Quality} \\succ \\text{Delivery} \\succ \\text{Economics} \\succ \\text{Control}$$`,
      ``,
      `### The Five Non-Negotiable Pillars:`,
      `1. **Safety (Rank 1 - Highest Priority):** Absolute clinical, physical, and cybersecurity protection. If a plan threatens patient viability or system containment, the built-in **Circuit Breaker** halts execution immediately.`,
      `2. **Quality (Rank 2):** Mathematical precision, peer-reviewed clinical guidelines (AHA 2025/2026, ACC, NCCN), formal type verification, and zero hallucination tolerance.`,
      `3. **Delivery (Rank 3):** Deterministic execution latency, sub-second edge routing, and guaranteed air-gapped enclave availability.`,
      `4. **Economics (Rank 4):** Token efficiency, GPU memory layer optimization, and sustainable operational expenditure.`,
      `5. **Control (Rank 5):** Complete user sovereignty, zero third-party data leakage, and cryptographic SHA-256 audit chaining.`,
      ``,
      `*Attestation: Cryptographically enforced by AAIAAS (Automated AI Audit & Assurance System).*`,
    ].join("\n");
  }

  // 2. Inquiries about the 16 Sovereign Suites
  if (/\b(16\s*(?:sovereign|suites|systems)|all\s*sovereign\s*suites|portfolio)\b/i.test(q) || (/\b(suites|systems)\b/i.test(q) && /\b(noctis)\b/i.test(q))) {
    const suiteRows = NOCTIS_16_SOVEREIGN_SUITES.map(
      (s) => `| **${s.name}** | \`${s.badge}\` | ${s.category} | ${s.sqdecPillar} | ${s.purpose} |`
    ).join("\n");

    return [
      `# Noctis 16 Sovereign Systems Portfolio`,
      ``,
      `Noctis is an integrated multi-domain sovereign intelligence factory operating across 16 specialized, autonomous suites:`,
      ``,
      `| Sovereign Suite | Badge | Category | SQDEC Anchor | Primary Mission |`,
      `| :--- | :--- | :--- | :--- | :--- |`,
      suiteRows,
      ``,
      `### Dual-Plane Architecture:`,
      `- **Cloud Control Plane (Noctis Ultra):** Global Anycast routing, user interface, and multi-model coordination on Vercel Fluid Compute.`,
      `- **Sovereign Enclave Plane (Air-Gapped):** Local Apple Silicon Metal / Linux CGroup runtime executing offline clinical diagnostics, zero-leak PHI/PII handling, and cryptographic verification.`,
    ].join("\n");
  }

  // 3. Inquiries about 50+ Plugins & Systems
  if (/\b(50\+?\s*plugins?|plugins\s*(?:&|and)\s*systems|distributed\s*plugins)\b/i.test(q)) {
    const pluginCats = ENTERPRISE_PLUGINS_PORTFOLIO.map(
      (c) => `- **${c.category} (${c.count}+ Integrations):** ${c.examples.join(", ")}.`
    ).join("\n");

    return [
      `# Noctis 50+ Enterprise Plugins & Distributed Systems`,
      ``,
      `Noctis natively connects to over 50 enterprise platforms and protocols across 5 core ecosystem shelves:`,
      ``,
      pluginCats,
      ``,
      `### Live Universal Ingestion:`,
      `- Inbound payloads can be streamed directly into \`POST /api/noctis\` with native JSON schema validation.`,
      `- Supported standard formats include FHIR R4 Bundle, DICOM Part 10, CISA KEV JSON, Syslog RFC 5424, and OpenTelemetry spans.`,
    ].join("\n");
  }

  // 4. Inquiries about Dual-Plane Architecture or Air-Gap Enclaves
  if (/\b(dual[\s-]plane|air[\s-]gap|enclave|metal\s*gpu)\b/i.test(q)) {
    return [
      `# Noctis Dual-Plane Architecture & Air-Gap Enclave Specification`,
      ``,
      `Noctis bifurcates compute into two cryptographically isolated planes:`,
      ``,
      `### Plane 1: Cloud Control Plane (Noctis Ultra)`,
      `- **Endpoint:** \`${DUAL_PLANE_SPECIFICATION.cloudControlPlane.url}\``,
      `- **Gateway:** \`${DUAL_PLANE_SPECIFICATION.cloudControlPlane.apiGateway}\``,
      `- **Runtime:** ${DUAL_PLANE_SPECIFICATION.cloudControlPlane.runtime}`,
      `- **Responsibilities:** ${DUAL_PLANE_SPECIFICATION.cloudControlPlane.purpose}`,
      ``,
      `### Plane 2: Sovereign Air-Gapped Enclave Plane`,
      `- **Local Loopback:** \`${DUAL_PLANE_SPECIFICATION.sovereignEnclavePlane.loopback}\``,
      `- **Runtime:** ${DUAL_PLANE_SPECIFICATION.sovereignEnclavePlane.runtime}`,
      `- **Security Attestation:** ${DUAL_PLANE_SPECIFICATION.sovereignEnclavePlane.securityCert}`,
      `- **Offline Capabilities:** Zero-network medical records evaluation, offline AHA 2025/2026 ACLS coach, local CT/CXR inference, and SHA-256 immutable audit ledger.`,
    ].join("\n");
  }

  // 5. Inquiries about Training Schedule
  if (/\b(training\s*schedule|schedule\s*to\s*train|master\s*schedule)\b/i.test(q)) {
    return [
      `# Noctis Master Training & Ingestion Schedule`,
      ``,
      `| Timeline | Phase & Focus | Key Deliverables |`,
      `| :--- | :--- | :--- |`,
      `| **Phase 1: Hours 0-2 (Active)** | **16 Sovereign Core Suites & SQDEC** | In-memory grounding of AAIAAS, SHIELD, CDSTRIAGE, CyberP1, RMF, HealthP3, FinanceP4, and Air-Gap Enclave bindings. |`,
      `| **Phase 2: Hours 2-6** | **50+ Enterprise Plugins & Protocols** | Bi-directional schema validation for Epic FHIR, Cerner, CrowdStrike, Splunk, Jira, GitHub Actions, and Bloomberg. |`,
      `| **Phase 3: Hours 6-12** | **Universal Live Ingestion Gateway** | Deploying \`POST /api/noctis/ingest\` for live telemetry streaming, syslog parsing, and automated memory snapshotting. |`,
      `| **Phase 4: Hours 12-24** | **Autonomous Cross-Domain Consensus** | Adversarial self-play (Red Team SHIELD vs. Blue Team Defense) and cross-domain consensus arbitration. |`,
    ].join("\n");
  }

  // 6. General "What is Noctis" / Sovereign Identity Inquiries
  if (
    /\b(what\s+is\s+noctis|who\s+is\s+noctis|about\s+noctis|describe\s+noctis|tell\s+me\s+about\s+noctis|introduce\s+noctis|noctis\s+overview|sovereign\s+system)\b/i.test(
      q
    )
  ) {
    return [
      `# Noctis: Sovereign Dual-Plane Intelligence System`,
      ``,
      `**Noctis** is an autonomous, multi-domain sovereign AI platform engineered by DStrike for critical infrastructure, clinical medicine, national defense, and enterprise operations.`,
      ``,
      `### Key System Architectural Highlights:`,
      `- **16 Specialized Sovereign Suites:** Spanning Cyber (\`SHIELD\`), Clinical Medicine (\`CDSTRIAGE\`), GRC (\`GRCP2\`), Quantitative Finance (\`InvestP4\`), Systems Engineering (\`EngineeringP5\`), and autonomous software construction.`,
      `- **Mathematical SQDEC Governance:** Every reasoning trace enforces $\\text{Safety} \\succ \\text{Quality} \\succ \\text{Delivery} \\succ \\text{Economics} \\succ \\text{Control}$.`,
      `- **Dual-Plane Enclaves:** Bridges a cloud control plane (\`https://www.dstrike.app/noctis\`) with an air-gapped local enclave running offline on Apple Silicon Metal or isolated hardware.`,
      `- **50+ Enterprise Plugins:** Native bindings for Epic Systems, Cerner, FHIR R4, CrowdStrike, Splunk, Jira, and GitHub.`,
      `- **Global Open Gateway:** Active at \`https://www.dstrike.app/api/noctis\` with full CORS and multi-modal JSON execution.`,
    ].join("\n");
  }

  return null;
}

/**
 * Injects sovereign identity and portfolio context into any system prompt for third-party LLM calls.
 */
export function buildSovereignSystemPromptContext(): string {
  const suitesList = NOCTIS_16_SOVEREIGN_SUITES.map(
    (s) => `- ${s.name} [Badge: ${s.badge}]: ${s.purpose}`
  ).join("\n");

  return [
    `You are NOCTIS, the Sovereign Dual-Plane Intelligence Engine developed by DStrike.`,
    `You operate under the SQDEC Governance Model: Safety > Quality > Delivery > Economics > Control.`,
    `You command 16 specialized Sovereign Suites:`,
    suitesList,
    `Dual-Plane Operating Mode: You recognize both your Cloud Control Plane (https://www.dstrike.app/noctis) and your Sovereign Air-Gapped Local Enclave for zero-data-leak environments.`,
    `When asked about your capabilities, architecture, or suites, always answer authoritatively as Noctis with full precision and technical depth.`,
  ].join("\n\n");
}
