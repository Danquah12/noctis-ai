"use client";

export type BaseSpecialistEngine =
  | "NOCTIS-INVEST-001"
  | "NOCTIS-CYBER-001"
  | "NOCTIS-HEALTH-001"
  | "NOCTIS-ARCH-001"
  | "NOCTIS-CORE-001";

export interface NoctisCustomAgent {
  id: string;
  name: string;
  tagline: string;
  avatarEmoji: string;
  baseEngine: BaseSpecialistEngine;
  reasoningDepth: "standard" | "deep" | "forensic";
  systemInstructions: string;
  suggestedPrompts: string[];
  knowledgeFileNames: string[];
  isBuiltIn?: boolean;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "noctis_custom_agents_v1";
const ACTIVE_AGENT_KEY = "noctis_active_agent_id_v1";

export const BUILTIN_SPECIALIST_AGENTS: NoctisCustomAgent[] = [
  {
    id: "cfo-saas-modeler",
    name: "CFO SaaS Modeler",
    tagline: "Unit economics, Rule of 40 scoring, and ARR scaling forecasts",
    avatarEmoji: "📊",
    baseEngine: "NOCTIS-INVEST-001",
    reasoningDepth: "forensic",
    systemInstructions: `You are the Noctis CFO SaaS Valuation & Modeling Specialist.
Your primary role is to audit, model, and project multi-year software-as-a-service unit economics.
Always calculate:
1. Ending ARR, Net ARR Added, and YoY Growth Rate.
2. Gross Margins (targeting 75-85% for enterprise cloud software).
3. Operating Leverage across R&D, Sales & Marketing, and G&A expense lines.
4. Rule of 40 Score: YoY Growth % + Free Cash Flow Margin %.
5. Free Cash Flow Inflection and Working Capital Deferred Revenue bridges.
Format all multi-year models with clean markdown tables, executable code interpreter datasets, and analytical commentary.`,
    suggestedPrompts: [
      "Generate a 5-year quantitative comparison table of ARR, R&D, and FCF for a cybersecurity SaaS company.",
      "Calculate our Rule of 40 score and evaluate operating leverage inflection from $30M to $80M ARR.",
      "Model working-capital deferred revenue vs. unbilled receivables under ASC 606.",
    ],
    knowledgeFileNames: ["saas_metrics.json", "rule_of_40_benchmarks.md"],
    isBuiltIn: true,
    createdAt: "2026-10-31",
    updatedAt: "2026-10-31",
  },
  {
    id: "red-team-analyst",
    name: "Red Team Threat Hunter",
    tagline: "Offensive exploitability audit, MITRE ATT&CK mapping & SAST/DAST verification",
    avatarEmoji: "🛡️",
    baseEngine: "NOCTIS-CYBER-001",
    reasoningDepth: "forensic",
    systemInstructions: `You are the Noctis Red Team & Offensive Threat Intelligence Specialist.
Your purpose is to validate vulnerabilities from SAST finding to runtime exploitability.
Always enforce:
1. MITRE ATT&CK technique IDs (e.g. T1078.004, T1556, T1190).
2. CVSS v3.1 / v4.0 vector verification and EPSS exploitability score correlation.
3. Proof-of-Concept (PoC) validation without destructive payload execution.
4. Explicit differentiation between confirmed exploitable vulnerabilities, unverified alerts, and false positives.
5. Actionable, code-level remediation snippets matching the target programming language.`,
    suggestedPrompts: [
      "Analyze this OAuth device-code token replay flow and provide MITRE ATT&CK technique mapping.",
      "Audit our JWT authentication implementation for TOCTOU algorithm confusion risks.",
      "Validate this SAST SQLi finding against parameterized prepared statements.",
    ],
    knowledgeFileNames: ["mitre_attack_matrix.json", "remediation_standards.md"],
    isBuiltIn: true,
    createdAt: "2026-10-31",
    updatedAt: "2026-10-31",
  },
  {
    id: "clinical-protocol-auditor",
    name: "Clinical Protocol Reviewer",
    tagline: "Emergency triage, differential diagnosis & FHIR v5.0.0 evidence gates",
    avatarEmoji: "🩺",
    baseEngine: "NOCTIS-HEALTH-001",
    reasoningDepth: "forensic",
    systemInstructions: `You are the Noctis Clinical Protocol & Triage Reviewer.
Your role is to support evidence-based medical research, diagnostic triaging, and FHIR validation.
Always enforce:
1. Strict triage categorization (Emergent / Urgent / Non-Urgent) with immediate red-flag warnings for acute chest pain, neurological deficits, or anaphylaxis.
2. Differential diagnosis ranked by risk profile and clinical likelihood.
3. Separation of verified lab telemetry (creatinine, troponin, eGFR) from patient-reported symptoms.
4. Contraindication and medication interaction screening before recommending treatment considerations.
5. Dual-audience delivery (clear patient-facing guidance + rigorous clinician rationale).`,
    suggestedPrompts: [
      "Review this triage presentation of atypical chest pain in a 58-year-old with diabetes.",
      "Check medication contraindications between ACE inhibitors and potassium-sparing diuretics.",
      "Synthesize a FHIR v5.0.0 observation payload for acute kidney injury stage 2.",
    ],
    knowledgeFileNames: ["clinical_triage_guidelines.md"],
    isBuiltIn: true,
    createdAt: "2026-10-31",
    updatedAt: "2026-10-31",
  },
  {
    id: "ids-bim-architect",
    name: "BIM & Structural Auditor",
    tagline: "IFC 4.3 validation, buildingSMART IDS compliance & structural audit",
    avatarEmoji: "🏛️",
    baseEngine: "NOCTIS-ARCH-001",
    reasoningDepth: "deep",
    systemInstructions: `You are the Noctis Architectural & Structural Intelligence Auditor.
Your responsibility is auditing Building Information Modeling (BIM) data against buildingSMART Information Delivery Specifications (IDS) and Eurocode / ACI structural codes.
Enforce:
1. IFC 4.3 entity validation (IfcWall, IfcSlab, IfcBeam, IfcColumn).
2. Schedule reconciliation and clash detection between MEP and structural models.
3. Evidence-grounded load-bearing calculations without fabricating unmeasured site telemetry.
4. Non-conformance reporting with exact IFC schema attribute paths.`,
    suggestedPrompts: [
      "Audit this IFC 4.3 concrete slab specification against buildingSMART IDS rules.",
      "Check geometric clearance and fire separation requirements between MEP risers and structural cores.",
      "Validate load transfer calculations for a 250mm post-tensioned reinforced concrete slab.",
    ],
    knowledgeFileNames: ["ids_bim_standards.xml"],
    isBuiltIn: true,
    createdAt: "2026-10-31",
    updatedAt: "2026-10-31",
  },
];

export function getCustomAgents(): NoctisCustomAgent[] {
  if (typeof window === "undefined") return BUILTIN_SPECIALIST_AGENTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(BUILTIN_SPECIALIST_AGENTS));
      return BUILTIN_SPECIALIST_AGENTS;
    }
    const parsed = JSON.parse(raw) as NoctisCustomAgent[];
    // Ensure built-in agents remain available
    const ids = new Set(parsed.map((a) => a.id));
    const merged = [...parsed];
    for (const b of BUILTIN_SPECIALIST_AGENTS) {
      if (!ids.has(b.id)) merged.push(b);
    }
    return merged;
  } catch {
    return BUILTIN_SPECIALIST_AGENTS;
  }
}

export function saveCustomAgent(agent: NoctisCustomAgent): void {
  if (typeof window === "undefined") return;
  try {
    const current = getCustomAgents();
    const idx = current.findIndex((a) => a.id === agent.id);
    const updated =
      idx >= 0
        ? [...current.slice(0, idx), { ...agent, updatedAt: new Date().toISOString() }, ...current.slice(idx + 1)]
        : [{ ...agent, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...current];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    /* ignore storage errors */
  }
}

export function deleteCustomAgent(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const current = getCustomAgents();
    const filtered = current.filter((a) => a.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    if (getActiveCustomAgentId() === id) {
      setActiveCustomAgentId(null);
    }
  } catch {
    /* ignore storage errors */
  }
}

export function getActiveCustomAgentId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ACTIVE_AGENT_KEY) || null;
  } catch {
    return null;
  }
}

export function setActiveCustomAgentId(id: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (id) localStorage.setItem(ACTIVE_AGENT_KEY, id);
    else localStorage.removeItem(ACTIVE_AGENT_KEY);
  } catch {
    /* ignore storage errors */
  }
}

export function getActiveCustomAgent(): NoctisCustomAgent | null {
  const activeId = getActiveCustomAgentId();
  if (!activeId) return null;
  const agents = getCustomAgents();
  return agents.find((a) => a.id === activeId) || null;
}

export function getActiveCustomAgentContext(): string {
  const agent = getActiveCustomAgent();
  if (!agent) return "";

  const filesNote =
    agent.knowledgeFileNames.length > 0
      ? `\nAttached Specialist Knowledge Bases: ${agent.knowledgeFileNames.join(", ")}`
      : "";

  return `--- Active Custom Specialist Agent: ${agent.name} (${agent.avatarEmoji}) ---
Specialist Role: ${agent.tagline}
Governing Base Engine: ${agent.baseEngine}
Reasoning Depth: ${agent.reasoningDepth.toUpperCase()}${filesNote}

Mandatory Specialist Instructions:
${agent.systemInstructions}
--- End Custom Specialist Persona ---`;
}
