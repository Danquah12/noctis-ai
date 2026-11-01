// ============================================================================
// NOCTIS SOVEREIGN PLUGIN SCENARIOS & ENTERPRISE USE CASES
// Proprietary first-principles workflows for Noctis Plugins & Systems
// Zero copied generic placeholders; tailored for high-assurance environments.
// ============================================================================

export interface PluginScenarioDetail {
  pluginId: string;
  name: string;
  publisher: string;
  category: string;
  tagline: string;
  description: string;
  protocol: "OAuth 2.0" | "REST API / MCP" | "Zero-Knowledge Enclave" | "WebRTC Low-Latency" | "GraphQL";
  authType: "OAuth (1-Click)" | "API Token / Key" | "Native Platform Engine";
  capabilities: string[];
  apps: { name: string; description: string }[];
  skills: { name: string; description: string }[];
  prompts: {
    title: string;
    description: string;
    prompt: string;
  }[];
  apiConfig: {
    requiresKey: boolean;
    keyLabel?: string;
    placeholder?: string;
    helpText: string;
    oauthProvider?: string;
  };
}

export const SOVEREIGN_PLUGIN_SCENARIOS: Record<string, PluginScenarioDetail> = {
  gmail: {
    pluginId: "gmail",
    name: "Gmail",
    publisher: "Google Workspace & Noctis Bridge",
    category: "Communication",
    tagline: "Triage, search, and manage enterprise Gmail inboxes with sovereign cryptographic assurance.",
    description:
      "Connect your Google Workspace or personal Gmail inbox to triage urgent security disclosures, summarize executive correspondence, draft compliance responses, and extract actionable deliverables with end-to-end data isolation.",
    protocol: "OAuth 2.0",
    authType: "OAuth (1-Click)",
    capabilities: ["Interactive", "Read", "Write", "Draft", "AI Triage"],
    apps: [
      { name: "Gmail Inbox Engine", description: "Real-time thread synthesis, labeling, and email drafting." },
    ],
    skills: [
      { name: "Sovereign Email Triage", description: "Classifies emails by urgency, financial impact, and security priority." },
      { name: "Compliance Drafting", description: "Drafts formal replies adhering to corporate governance and regulatory requirements." },
    ],
    prompts: [
      {
        title: "Security & Zero-Day Incident Triage",
        description: "Surface critical vulnerability disclosures, CVE advisories, and infrastructure alarms from the last 24 hours.",
        prompt: "Scan my Gmail inbox for security advisories, vulnerability disclosures, and critical infrastructure alerts from the last 24 hours. Group by severity and summarize required action items.",
      },
      {
        title: "Compliance & Audit Response Draft",
        description: "Draft an authoritative, cryptographically referenced response to auditors regarding SOC 2 and ISO 27001 controls.",
        prompt: "Draft an authoritative, professional reply to our compliance auditor's latest request regarding SOC 2 and ISO 27001 continuous control verification, with a detailed bulleted list of evidence attachments.",
      },
      {
        title: "Executive Decision & CAPEX Extraction",
        description: "Extract pending board approvals, contract sign-offs, and budget milestones across all ongoing threads.",
        prompt: "Analyze my recent executive email threads and construct a prioritized decision tracker with decision makers, deadlines, CAPEX budget implications, and follow-up items.",
      },
    ],
    apiConfig: {
      requiresKey: false,
      oauthProvider: "Google OAuth 2.0 (gmail.modify)",
      helpText: "Authorize Noctis via Google OAuth 2.0 or test instantly in the Sovereign Air-Gapped Sandbox.",
    },
  },

  health: {
    pluginId: "health",
    name: "Health & Clinical Reasoning",
    publisher: "Noctis Clinical Systems (NH-PHYSICIAN-DX)",
    category: "Platform Systems",
    tagline: "Longitudinal biomarker analysis, FHIR R4 clinical reasoning, and medication toxicity verification.",
    description:
      "Deep clinical reasoning engine aligned with HL7 FHIR R4, US Core v9.0.0, and 2021 CKD-EPI standards. Analyzes longitudinal lab results, models renal function deterioration, reconciles multi-drug contraindications, and prepares structured physician handoff summaries.",
    protocol: "Zero-Knowledge Enclave",
    authType: "Native Platform Engine",
    capabilities: ["Clinical Reasoning", "FHIR R4", "Differential Dx", "Biomarker Auditing", "E2EE Privacy"],
    apps: [
      { name: "Noctis Physician Dx-001", description: "Differential clinical diagnostic synthesis and emergency severity triage." },
      { name: "FHIR R4 Diagnostic Parser", description: "Compliant HL7/FHIR observation, medication statement, and lab panel parsing." },
    ],
    skills: [
      { name: "Renal Function Trajectory (CKD-EPI)", description: "Computes eGFR changes, creatinine deltas, and AKI staging." },
      { name: "Adversarial Lab Reconciliation", description: "Cross-checks spurious values (e.g. in-vitro hemolysis vs true hyperkalemia)." },
    ],
    prompts: [
      {
        title: "Longitudinal Renal Biomarker Deterioration",
        description: "Calculate eGFR changes across serial tests and evaluate acute-on-chronic kidney injury.",
        prompt: "Analyze longitudinal renal function metrics (Serum Creatinine, eGFR 2021 CKD-EPI) across the patient's record. Flag acute deterioration trends, evaluate AKI staging, and reconcile baseline renal reserve.",
      },
      {
        title: "Emergency Medication & Potassium Toxicity Audit",
        description: "Cross-reference ACE inhibitors and potassium-sparing diuretics against acute lab abnormalities.",
        prompt: "Review current medications (e.g., Lisinopril, Spironolactone, NSAIDs) against a potassium level of 6.4 mmol/L and BP 96/60. Identify immediate cardiotoxicity risks, differentiate pseudohyperkalemia (hemolysis), and formulate prioritized clinical interventions.",
      },
      {
        title: "FHIR R4 Structured Clinical Handoff",
        description: "Generate a compliant HL7 FHIR R4 summary with SHA-256 cryptographic provenance for hospital admission.",
        prompt: "Generate a complete FHIR R4 compliant diagnostic assessment for emergency hospital handoff including subjective history, objective vitals, active problems, reconciliation rationale, and pending diagnostic tests.",
      },
    ],
    apiConfig: {
      requiresKey: false,
      helpText: "Runs directly on the Noctis Sovereign Clinical Engine with client-side Zero-Knowledge encryption.",
    },
  },

  github: {
    pluginId: "github",
    name: "GitHub",
    publisher: "GitHub & Noctis SecOps",
    category: "Developer Tools",
    tagline: "Autonomous repository auditing, automated XTRIKE SAST patches, and CI/CD security validation.",
    description:
      "Triage pull requests, inspect commit history, execute continuous AST security verification, and audit GitHub Actions workflows for supply-chain integrity, unpinned SHA references, and secret exfiltration vectors.",
    protocol: "REST API / MCP",
    authType: "API Token / Key",
    capabilities: ["Interactive", "Read", "Write", "PR Triage", "AST Patch Generation"],
    apps: [
      { name: "GitHub Repo & PR Manager", description: "Direct PR inspection, branch convergence, and commit history exploration." },
    ],
    skills: [
      { name: "XTRIKE SAST Integration", description: "Automated vulnerability detection across 710 codebases." },
      { name: "Supply-Chain Guard", description: "Verifies dependency locks, SBOM integrity, and action pinning." },
    ],
    prompts: [
      {
        title: "Autonomous SAST Vulnerability Patching",
        description: "Scan open pull requests for SQLi, XSS, and memory boundaries, generating drop-in verified diffs.",
        prompt: "Run an XTRIKE SAST security audit on all open pull requests in our core repository. Identify high-severity vulnerabilities, and generate parameterized prepared statement patches with accompanying unit tests.",
      },
      {
        title: "CI/CD Supply Chain & Secret Exposure Audit",
        description: "Inspect GitHub Actions workflow configurations for runner vulnerabilities and unpinned actions.",
        prompt: "Audit all .github/workflows for unpinned third-party actions, runner permission leaks, and potential environment variable exfiltration risks. Provide hardened workflow recommendations.",
      },
      {
        title: "Release Milestone Velocity & Blocker Digest",
        description: "Synthesize commit velocity, open bug severity, and release gate readiness across team branches.",
        prompt: "Summarize sprint pull request velocity, identify aging unreviewed branches, and flag critical blocking issues against the upcoming production release milestone.",
      },
    ],
    apiConfig: {
      requiresKey: true,
      keyLabel: "GitHub Personal Access Token (PAT)",
      placeholder: "ghp_xxxxxxxxxxxxxxxxxxxx",
      helpText: "Enter a GitHub token with repo scopes, or use the interactive local simulation mode.",
      oauthProvider: "GitHub OAuth",
    },
  },

  supabase: {
    pluginId: "supabase",
    name: "Supabase & PostgreSQL",
    publisher: "Supabase & Sovereign Data Mesh",
    category: "Developer Tools",
    tagline: "PostgreSQL telemetry, Row-Level Security (RLS) validation, and query performance optimization.",
    description:
      "Inspect databases, execute parameterized SQL queries, benchmark query execution plans, and enforce zero-trust Row-Level Security policies to ensure absolute multi-tenant data segregation.",
    protocol: "REST API / MCP",
    authType: "API Token / Key",
    capabilities: ["SQL Execution", "RLS Auditing", "Schema Inspection", "Performance Telemetry"],
    apps: [
      { name: "Supabase Query Runner", description: "Interactive SQL console with execution timing and plan analysis." },
    ],
    skills: [
      { name: "Row-Level Security Verification", description: "Validates tenant isolation rules on sensitive tables." },
      { name: "Index & Query Bottleneck Analyzer", description: "Detects sequential scans, lock contention, and connection pool saturation." },
    ],
    prompts: [
      {
        title: "Row-Level Security (RLS) Leak Audit",
        description: "Verify that all public and private tables have active RLS policies preventing cross-tenant leakage.",
        prompt: "Audit all tables in our PostgreSQL database for Row-Level Security (RLS) enforcement. Identify any tables missing policies, and verify tenant_id isolation for multi-tenant organizations.",
      },
      {
        title: "Connection Pool & Query Latency Telemetry",
        description: "Inspect active connections, slow sequential scans, and unindexed foreign keys.",
        prompt: "Query pg_stat_activity and pg_stat_statements to identify the top 5 slowest queries by mean execution time, missing indexes on foreign keys, and connection pool saturation points.",
      },
      {
        title: "Zero-Downtime Schema Migration Plan",
        description: "Generate safe database migration DDL with non-blocking index creation and rollback scripts.",
        prompt: "Generate an idempotent, zero-downtime PostgreSQL migration script to add encrypted metadata columns to the accounts table, including CREATE INDEX CONCURRENTLY and safety verification rollback blocks.",
      },
    ],
    apiConfig: {
      requiresKey: true,
      keyLabel: "Supabase Service Role / Anon Key",
      placeholder: "eyJh...",
      helpText: "Provide your Supabase URL & Key to query live instances, or test with our local PostgreSQL mock runner.",
    },
  },

  google_drive: {
    pluginId: "google_drive",
    name: "Google Drive",
    publisher: "Google Workspace & Noctis Bridge",
    category: "Productivity",
    tagline: "Zero-trust file inspection, architectural document synthesis, and access permission auditing.",
    description:
      "Access, read, and summarize Docs, Sheets, and Slides in real-time. Audit external document sharing links for data loss prevention (DLP), and extract structured financial data from spreadsheets.",
    protocol: "OAuth 2.0",
    authType: "OAuth (1-Click)",
    capabilities: ["Document Extraction", "Spreadsheet Parsing", "DLP Link Auditing", "Semantic Indexing"],
    apps: [
      { name: "Sovereign Drive Explorer", description: "Inspect folders, view file metadata, and synthesize contents." },
    ],
    skills: [
      { name: "Enterprise DLP Audit", description: "Identifies documents shared externally or containing sensitive PII/secrets." },
      { name: "Multi-Document Synthesis", description: "Cross-analyzes technical design specs and contracts into a unified brief." },
    ],
    prompts: [
      {
        title: "Public Link & Data Loss Prevention (DLP) Audit",
        description: "Detect shared files with 'Anyone with the link can view' permissions containing sensitive terms.",
        prompt: "Scan our Google Drive repository for any files with public or external link sharing enabled that contain sensitive keywords like 'credentials', 'confidential', or 'financial forecast'. Generate an immediate quarantine list.",
      },
      {
        title: "Technical Specification & Architecture Synthesis",
        description: "Read multiple engineering design docs and synthesize a coherent architectural specification.",
        prompt: "Synthesize all design documents in the 'Platform Architecture 2026' folder into an executive architectural overview, highlighting consensus points, open technical debates, and proposed API endpoints.",
      },
      {
        title: "Financial Model & DCF Assumption Extraction",
        description: "Extract line items, revenue projections, and discount rates from financial spreadsheets.",
        prompt: "Inspect our 5-year budget spreadsheet, extract revenue growth assumptions, COGS trajectories, and headcount plans, and verify internal formula consistency across all forecast quarters.",
      },
    ],
    apiConfig: {
      requiresKey: false,
      oauthProvider: "Google OAuth 2.0 (drive.readonly)",
      helpText: "Connect with Google OAuth 2.0 or browse files in the local encrypted workspace sandbox.",
    },
  },

  xtrike_sast: {
    pluginId: "xtrike_sast",
    name: "XTRIKE SAST Core",
    publisher: "DStrike Sovereign Security",
    category: "Platform Systems",
    tagline: "Autonomous static analysis, OWASP Top 10:2025 compliance, and memory boundary defense.",
    description:
      "Continuous polyglot static application security analysis engine. Indexes 710 repositories, detects complex taint-flow vulnerabilities, evaluates CWE risk scores, and generates verified AST code fixes.",
    protocol: "Zero-Knowledge Enclave",
    authType: "Native Platform Engine",
    capabilities: ["Polyglot SAST", "AST Fix Synthesis", "OWASP Top 10", "Zero-Touch Remediation"],
    apps: [
      { name: "XTRIKE Core Engine", description: "Real-time vulnerability analyzer and memory model verifier." },
    ],
    skills: [
      { name: "Taint Flow Tracker", description: "Follows untrusted user inputs across function call boundaries." },
      { name: "Remediation Synthesizer", description: "Creates exact diffs using parameterized constructs and bounds checks." },
    ],
    prompts: [
      {
        title: "Full Repository Surface Vulnerability Scan",
        description: "Scan multi-language codebase for SQL injection, SSRF, IDOR, and broken access controls.",
        prompt: "Execute an XTRIKE SAST deep scan across the repository. Identify all injection vectors, unvalidated redirects, and insecure deserialization flaws with precise file and line references.",
      },
      {
        title: "Automated CWE Remediation Patch Generation",
        description: "Generate verified, drop-in replacement code for detected high-severity vulnerabilities.",
        prompt: "Review the top 3 high-severity SAST findings in our authentication controller and generate clean, type-safe replacement code using parameterized queries and cryptographic hashing.",
      },
      {
        title: "OWASP Top 10:2025 & Compliance Verification",
        description: "Compile an executive compliance attestation report mapped to OWASP and NIST standards.",
        prompt: "Generate an OWASP Top 10:2025 compliance attestation report for the current build artifact, documenting passing tests, verified invariant boundaries, and zero critical CVE status.",
      },
    ],
    apiConfig: {
      requiresKey: false,
      helpText: "Built natively into the DStrike platform core. No external API keys required.",
    },
  },

  crowdstrike_falcon: {
    pluginId: "crowdstrike_falcon",
    name: "CrowdStrike Falcon X",
    publisher: "CrowdStrike & Noctis SecOps",
    category: "Security",
    tagline: "Live endpoint telemetry, adversary IOC correlation, and zero-day threat hunting.",
    description:
      "Enterprise threat hunting and telemetry bridge. Correlates live endpoint behavioral indicators (IOAs), tracks nation-state adversary campaigns, queries global IOC feeds, and orchestrates rapid quarantine containment.",
    protocol: "REST API / MCP",
    authType: "API Token / Key",
    capabilities: ["Threat Hunting", "IOC Lookup", "Host Containment", "Adversary Attribution"],
    apps: [
      { name: "Falcon Telemetry Stream", description: "Real-time process execution, kernel audit, and network sensor ingestion." },
    ],
    skills: [
      { name: "Adversary Campaign Attribution", description: "Maps active exploits to known threat actor MITRE TTPs." },
      { name: "Sovereign Host Isolation", description: "Remotely air-gaps compromised nodes while maintaining telemetry." },
    ],
    prompts: [
      {
        title: "Active Adversary Campaign & IOC Hunt",
        description: "Search corporate endpoints for newly published zero-day file hashes and lateral movement signatures.",
        prompt: "Query CrowdStrike Falcon for any endpoint detections matching emerging zero-day CVE advisories from the past 72 hours. Correlate parent process execution trees and flag any compromised domain controller hosts.",
      },
      {
        title: "Emergency Host Isolation & Network Containment",
        description: "Quarantine a compromised endpoint while preserving live memory for volatile forensic analysis.",
        prompt: "Generate an automated Falcon containment workflow for host 'srv-auth-prod-02' exhibiting anomalous Kerberos ticket-granting activity, preserving memory triage dumps for forensic extraction.",
      },
      {
        title: "Executive SOC Incident Timeline & Root Cause",
        description: "Synthesize hundreds of alert telemetry events into a clean chronological incident brief.",
        prompt: "Synthesize all high-severity alerts from the last 12 hours into an executive root-cause timeline with initial access vector, lateral movement trajectory, affected assets, and remediation status.",
      },
    ],
    apiConfig: {
      requiresKey: true,
      keyLabel: "CrowdStrike API Client ID & Secret",
      placeholder: "falcon_client_id:secret",
      helpText: "Connect to the Falcon OAuth2 streaming API or analyze offline telemetry logs in the local sandbox.",
    },
  },

  wiz_cloud: {
    pluginId: "wiz_cloud",
    name: "Wiz Cloud Security",
    publisher: "Wiz & Noctis Cloud Governance",
    category: "Security",
    tagline: "CNAPP cloud risk graph, toxic combinations, and multi-cloud attack surface mapping.",
    description:
      "Agentless Cloud-Native Application Protection Platform (CNAPP). Analyzes AWS, Azure, and GCP infrastructure graphs to uncover toxic combinations of vulnerabilities, network exposures, overly permissive IAM roles, and unencrypted sensitive data.",
    protocol: "REST API / MCP",
    authType: "API Token / Key",
    capabilities: ["Cloud Risk Graph", "Toxic Combination Analysis", "IAM Exposure", "Multi-Cloud Posture"],
    apps: [
      { name: "Wiz Risk Graph Engine", description: "Multi-cloud infrastructure topology and exposure path modeler." },
    ],
    skills: [
      { name: "Toxic Combination Triage", description: "Flags exploitable paths where public ingress meets admin IAM and CVEs." },
    ],
    prompts: [
      {
        title: "Critical Toxic Combinations Audit",
        description: "Surface cloud resources that combine public internet exposure, critical CVEs, and administrative IAM roles.",
        prompt: "Query Wiz for all high-risk 'Toxic Combinations' across our AWS and GCP production accounts where an internet-facing workload has a high-severity RCE vulnerability and write permissions to S3/Cloud Storage.",
      },
      {
        title: "Cloud IAM Blast Radius & Privilege Escalation",
        description: "Detect identity paths capable of assuming administrator privileges across cloud accounts.",
        prompt: "Analyze Wiz identity graphs to find any service accounts with inactive or wildcard permissions capable of privilege escalation to cloud admin. Provide least-privilege remediation policies.",
      },
      {
        title: "Unencrypted Cloud Data & Secrets Discovery",
        description: "Identify public or unencrypted storage buckets containing API keys, private keys, or PII.",
        prompt: "Identify any unencrypted cloud databases or object buckets flagged with potential secrets exposure or public access in Wiz, and generate Terraform remediation blocks to enforce encryption and private endpoints.",
      },
    ],
    apiConfig: {
      requiresKey: true,
      keyLabel: "Wiz API Service Account Token",
      placeholder: "wiz_token_...",
      helpText: "Provide your Wiz GraphQL API token or explore simulated cloud risk topologies in the sandbox.",
    },
  },

  nvidia_enterprise: {
    pluginId: "nvidia_enterprise",
    name: "NVIDIA DGX & NeMo",
    publisher: "NVIDIA & Noctis Neural Systems",
    category: "Developer Tools",
    tagline: "Enterprise GPU cluster orchestration, LLM fine-tuning pipelines, and TensorRT acceleration.",
    description:
      "Interface directly with enterprise NVIDIA DGX Cloud, H100/H200 cluster telemetry, and NeMo fine-tuning pipelines. Benchmark inference latency with TensorRT-LLM, profile FP8/FP16 quantization, and monitor thermal/power efficiency.",
    protocol: "REST API / MCP",
    authType: "API Token / Key",
    capabilities: ["GPU Cluster Telemetry", "TensorRT-LLM Benchmarking", "NeMo Training", "FP8 Quantization"],
    apps: [
      { name: "NVIDIA Cluster Manager", description: "Real-time GPU VRAM, compute utilization, and NVLink interconnect telemetry." },
    ],
    skills: [
      { name: "TensorRT Compilation", description: "Generates optimized engine plans for sub-millisecond LLM inference." },
    ],
    prompts: [
      {
        title: "H100/H200 GPU Cluster Utilization & Thermal Profiling",
        description: "Inspect distributed node health, compute utilization, NVLink bandwidth, and throttling bottlenecks.",
        prompt: "Query NVIDIA DGX cluster metrics to report average GPU compute utilization, VRAM allocation, NVLink interconnect bandwidth, and identify any worker nodes exhibiting thermal throttling or memory ECC errors.",
      },
      {
        title: "TensorRT-LLM Sub-Millisecond Latency Benchmark",
        description: "Profile time-to-first-token (TTFT) and token generation throughput under FP8 quantization.",
        prompt: "Run a TensorRT-LLM inference benchmark on our fine-tuned 70B sovereign model comparing BF16 against FP8 quantization. Calculate speedup in TTFT, throughput in tokens/sec, and GPU memory footprint reduction.",
      },
      {
        title: "NeMo Sovereign Model Alignment & DPO Job",
        description: "Deploy a distributed Direct Preference Optimization (DPO) run across 8x H100 nodes.",
        prompt: "Configure an NVIDIA NeMo training job for Direct Preference Optimization (DPO) using our verified sovereign alignment dataset, setting learning rate 5e-7, LoRA rank 64, and gradient checkpointing.",
      },
    ],
    apiConfig: {
      requiresKey: true,
      keyLabel: "NVIDIA NGC API Key",
      placeholder: "nvapi-...",
      helpText: "Enter your NVIDIA NGC / DGX Cloud API key or profile local GPU accelerators in the workspace.",
    },
  },

  bloomberg_terminal: {
    pluginId: "bloomberg_terminal",
    name: "Bloomberg Enterprise & B-PIPE",
    publisher: "Bloomberg L.P. & Noctis Financial AI",
    category: "Finance",
    tagline: "Real-time sovereign macro bond yields, FX swap curves, credit default swaps, and commodity orders.",
    description:
      "Enterprise market data integration delivering institutional-grade Bloomberg B-PIPE telemetry. Stream sovereign yield curves, credit default swap (CDS) spreads, foreign exchange forward points, and real-time macroeconomic indicators.",
    protocol: "REST API / MCP",
    authType: "API Token / Key",
    capabilities: ["Macro Data", "Bond Yield Curves", "CDS Spreads", "FX Arbitrage", "Institutional Order Flow"],
    apps: [
      { name: "Bloomberg B-PIPE Feed", description: "Real-time tick-by-tick financial market data and consensus estimates." },
    ],
    skills: [
      { name: "Sovereign Yield Curve Inversion", description: "Calculates 2Y/10Y Treasury spreads and recession probability." },
    ],
    prompts: [
      {
        title: "Global Sovereign Bond Yield Curve Spread Analysis",
        description: "Compare US Treasuries, German Bunds, and UK Gilts across 2Y, 5Y, 10Y, and 30Y tenors.",
        prompt: "Pull current sovereign bond yield curves for US Treasuries, German Bunds, and UK Gilts via Bloomberg B-PIPE. Calculate curve steepness, 2Y/10Y inversion spreads, and real yield deltas after adjusting for CPI.",
      },
      {
        title: "Credit Default Swap (CDS) Risk & Sovereign Debt Stress",
        description: "Track 5-year senior CDS spreads across emerging market sovereigns and tier-1 financial institutions.",
        prompt: "Query 5-year senior Credit Default Swap (CDS) spreads across G20 sovereign debt and primary global banks. Flag any issuers with >25 bps spread widening in the past 30 days and analyze counterparty risk.",
      },
      {
        title: "Cross-Currency Basis Swap & Liquidity Arbitrage",
        description: "Analyze EUR/USD and JPY/USD cross-currency basis swaps to detect offshore dollar funding tightness.",
        prompt: "Analyze 3-month and 1-year EUR/USD and JPY/USD cross-currency basis swap curves. Evaluate whether offshore dollar funding premia indicate liquidity strain in foreign central bank swap lines.",
      },
    ],
    apiConfig: {
      requiresKey: true,
      keyLabel: "Bloomberg B-PIPE Session Token / Terminal ID",
      placeholder: "bbg_session_token_...",
      helpText: "Connect to institutional Bloomberg B-PIPE or analyze curated macroeconomic datasets in the sandbox.",
    },
  },

  linear_app: {
    pluginId: "linear_app",
    name: "Linear Enterprise",
    publisher: "Linear & Noctis DevSecOps",
    category: "Developer Tools",
    tagline: "High-velocity issue tracking, Git branch automation, sprint cycles, and engineering roadmap execution.",
    description:
      "Fast, purposeful issue tracking built for modern engineering teams. Automate sprint cycle planning, link Git pull requests to tickets, track milestone velocity, and sync architectural decisions across distributed teams.",
    protocol: "GraphQL",
    authType: "OAuth (1-Click)",
    capabilities: ["Interactive", "Read", "Write", "Cycle Planning", "Git Sync"],
    apps: [
      { name: "Linear Project Board", description: "Bi-directional sync of tasks, active cycles, and release milestones." },
    ],
    skills: [
      { name: "Engineering Velocity Predictor", description: "Forecasts cycle completion dates using historical throughput." },
    ],
    prompts: [
      {
        title: "Sprint Cycle Scope & Blocker Synthesis",
        description: "Analyze active cycle progress, flag stalled issues, and calculate projected completion dates.",
        prompt: "Review our current Linear sprint cycle. Identify all issues that have been in 'In Progress' for >4 days without PR activity, summarize open blockers, and evaluate whether current velocity will meet the cycle target.",
      },
      {
        title: "Automated Ticket Creation from Security Audit",
        description: "Turn XTRIKE/SAST vulnerabilities into structured, prioritized Linear engineering tickets.",
        prompt: "Extract the top 3 unpatched vulnerabilities from our latest SAST audit and create detailed Linear issues with severity labels, reproduction steps, recommended remediation diffs, and project milestone assignment.",
      },
      {
        title: "Quarterly Roadmap Milestone Progress Brief",
        description: "Compile an executive engineering brief tracking progress across Q1/Q2 platform deliverables.",
        prompt: "Generate an executive engineering status report from Linear across all active roadmap projects. Detail completed milestones, at-risk initiatives, and cross-team dependencies for the upcoming board review.",
      },
    ],
    apiConfig: {
      requiresKey: false,
      oauthProvider: "Linear OAuth",
      helpText: "Authorize via Linear OAuth 2.0 or test with local mock team workspaces in the sandbox.",
    },
  },
};

/**
 * Fallback generator for plugins not explicitly specified in the dictionary above
 */
export function getPluginScenarioDetail(pluginId: string, name: string, category: string, description: string): PluginScenarioDetail {
  if (SOVEREIGN_PLUGIN_SCENARIOS[pluginId]) {
    return SOVEREIGN_PLUGIN_SCENARIOS[pluginId];
  }

  return {
    pluginId,
    name,
    publisher: "Noctis Sovereign Integration Network",
    category,
    tagline: `${name}: Integrated sovereign workflow connector for ${category.toLowerCase()}.`,
    description: description || `Access, query, and automate ${name} operations securely through the Noctis platform.`,
    protocol: "REST API / MCP",
    authType: "OAuth (1-Click)",
    capabilities: ["Interactive", "Read", "Write", "Autonomous Actions"],
    apps: [
      { name: `${name} Connector`, description: `Interface directly with ${name} endpoints, events, and data objects.` },
    ],
    skills: [
      { name: `${name} Workflow Automation`, description: `Execute multi-step tasks and structured operations inside ${name}.` },
    ],
    prompts: [
      {
        title: `Priority ${name} Intelligence Audit`,
        description: `Extract critical alerts, recent changes, and high-impact events from ${name}.`,
        prompt: `Query ${name} for high-priority updates, pending actions, and anomalous events from the past 24 hours. Summarize with actionable next steps.`,
      },
      {
        title: `Automated ${name} Enterprise Workflow`,
        description: `Execute a structured enterprise action inside ${name} with verification.`,
        prompt: `Use ${name} to synthesize our latest project status and coordinate operational updates with team stakeholders.`,
      },
      {
        title: `Compliance & Data Health Check`,
        description: `Verify data integrity, access permissions, and governance hygiene in ${name}.`,
        prompt: `Perform an automated health check on ${name} to verify active permissions, integration status, and record consistency.`,
      },
    ],
    apiConfig: {
      requiresKey: true,
      keyLabel: `${name} API Key / Token`,
      placeholder: `Enter your ${name} credentials or use local sandbox...`,
      helpText: `Connect your live ${name} account via API token or test seamlessly in the Noctis Sovereign Sandbox.`,
      oauthProvider: `${name} OAuth`,
    },
  };
}
