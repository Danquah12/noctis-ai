/**
 * ============================================================================
 * NOCTIS UNIFIED INTELLIGENCE TOOL ORCHESTRATOR (Milestone 1)
 * File: src/lib/noctis-tool-orchestrator.ts
 * Subsystem: NOCTIS-ORCHESTRATOR-DISPATCH
 * 
 * Provides natural-language tool selection, parameter extraction with unit
 * parsing, deterministic engine execution, and explicit uncertainty handling.
 * ============================================================================
 */

import {
  SOVEREIGN_TOOLS,
  type SovereignToolDefinition,
  type ToolParamSpec
} from "./noctis-tool-registry.ts";

export interface ToolMatchResult {
  tool: SovereignToolDefinition;
  confidence: number;
  matchedKeywords: string[];
}

export interface ExtractionResult {
  params: Record<string, any>;
  extractedKeys: string[];
  assumedKeys: string[];
  missingRequiredKeys: string[];
}

export interface OrchestrationResult {
  handled: boolean;
  status: "SUCCESS" | "UNCERTAIN_MISSING_INPUTS" | "NOT_MATCHED" | "EXECUTION_ERROR";
  toolId?: string;
  toolTitle?: string;
  domainName?: string;
  extractedParams?: Record<string, any>;
  missingParams?: string[];
  assumedParams?: string[];
  rawResult?: any;
  formattedMarkdown?: string;
  error?: string;
}

/**
 * Evaluates a user natural language query against the 16 registered sovereign tools.
 */
export function matchSovereignTool(query: string): ToolMatchResult | null {
  const q = query.toLowerCase();

  // High-assurance safety exclusion: Do not route acute clinical/medical emergencies to physical engineering tools
  const isClinicalEncounter =
    /\b(patient|female|male|years?-old|yo|y\/o|triage|resuscitation|symptom|presents? with|blood pressure|\b(?:bp|hr|rr|spo2)\b|cardiac|ecg|troponin|chest pain|cough|fever|dyspnea|hypotension|tachycardia|bradycardia|potassium|hyperkalemia|sodium|hyponatremia|magnesium|calcium|creatinine|egfr|ckd|stroke|sepsis|shock|infection)\b/i.test(query);

  if (isClinicalEncounter) {
    // Only allow sovereign physical tool if query specifically requests that engineering domain
    const hasExplicitPhysicalEngineIntent =
      /\b(tokamak|hypersonic|fay-riddell|stellarator|orbital rendezvous|clohessy|water hammer|joukowsky|cryogenic propellant|boil-off|insar|interferogram|deep space optical|neuromorphic|rydberg|otec|ocean thermal|directional drilling|vlbi)\b/i.test(query);
    if (!hasExplicitPhysicalEngineIntent) {
      return null;
    }
  }

  let bestMatch: ToolMatchResult | null = null;
  let highestScore = 0;

  for (const tool of SOVEREIGN_TOOLS) {
    const matched = tool.keywords.filter((kw) => {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`\\b${escaped}\\b`, "i").test(q);
    });
    if (matched.length === 0) continue;

    // Base score for any keyword match: at least 0.35 + proportional keyword bonus
    let score = 0.35 + (matched.length / tool.keywords.length) * 0.65;
    if (q.includes(tool.title.toLowerCase())) score += 0.5;
    if (q.includes(tool.domainName.toLowerCase().replace(/_/g, " "))) score += 0.4;

    // Boost if query explicitly mentions domain-specific symbols
    if (tool.id === "sovereign_tokamak_mhd" && (q.includes("tokamak") || q.includes("q95") || q.includes("kruskal") || q.includes("troyon") || q.includes("mhd"))) score += 0.5;
    if (tool.id === "sovereign_battery_electrochemistry" && (q.includes("battery") || q.includes("plating") || q.includes("dendrite") || q.includes("sei"))) score += 0.5;
    if (tool.id === "sovereign_hypersonic_aero" && (q.includes("hypersonic") || q.includes("mach") || q.includes("fay-riddell") || q.includes("shock"))) score += 0.5;
    if (tool.id === "sovereign_hydro_water_hammer" && (q.includes("hydro") || q.includes("water hammer") || q.includes("joukowsky") || q.includes("penstock"))) score += 0.5;
    if (tool.id === "sovereign_fission_kinetics" && (q.includes("fission") || q.includes("reactor") || q.includes("k_eff") || q.includes("reactivity") || q.includes("prompt critical"))) score += 0.5;
    if (tool.id === "sovereign_cryo_rocket" && (q.includes("cryo") || q.includes("boil-off") || q.includes("zbo") || q.includes("lh2") || q.includes("liquid hydrogen"))) score += 0.5;

    if (score > highestScore && score >= 0.15) {
      highestScore = score;
      bestMatch = {
        tool,
        confidence: Math.min(1.0, score),
        matchedKeywords: matched,
      };
    }
  }

  return bestMatch;
}

/**
 * Extracts parameters from a natural-language query using regex specifications.
 */
export function extractToolParameters(tool: SovereignToolDefinition, query: string): ExtractionResult {
  const params: Record<string, any> = {};
  const extractedKeys: string[] = [];
  const assumedKeys: string[] = [];
  const missingRequiredKeys: string[] = [];

  for (const spec of tool.parameters) {
    let extractedValue: any = null;

    for (const pat of spec.patterns) {
      const match = query.match(pat);
      if (match && match[1] !== undefined) {
        if (spec.type === "number") {
          const cleanNum = match[1].replace(/,/g, "");
          const val = parseFloat(cleanNum);
          if (!isNaN(val)) {
            extractedValue = val;
            break;
          }
        } else if (spec.type === "boolean") {
          extractedValue = /true|active|enabled|yes/i.test(match[1]);
          break;
        } else {
          extractedValue = match[1].trim();
          break;
        }
      }
    }

    if (extractedValue !== null) {
      params[spec.name] = extractedValue;
      extractedKeys.push(spec.name);
    } else if (spec.default !== undefined) {
      params[spec.name] = spec.default;
      assumedKeys.push(spec.name);
    } else if (spec.required) {
      missingRequiredKeys.push(spec.name);
    }
  }

  return { params, extractedKeys, assumedKeys, missingRequiredKeys };
}

/**
 * Orchestrates a user question end-to-end:
 * 1. Matches tool
 * 2. Extracts parameters
 * 3. Enforces uncertainty handling on missing inputs
 * 4. Executes deterministic calculation
 * 5. Returns grounded markdown
 */
export function orchestrateSovereignQuery(query: string): OrchestrationResult {
  const match = matchSovereignTool(query);
  if (!match) {
    return { handled: false, status: "NOT_MATCHED" };
  }

  const { tool } = match;
  const { params, extractedKeys, assumedKeys, missingRequiredKeys } = extractToolParameters(tool, query);

  // Uncertainty Handling: If critical inputs are missing without defaults, do not guess!
  if (missingRequiredKeys.length > 0) {
    const missingDescriptions = missingRequiredKeys.map((k) => {
      const spec = tool.parameters.find((p) => p.name === k);
      return `- **${k}** (${spec?.description || "Required parameter"}, unit: ${spec?.unit || "none"})`;
    }).join("\n");

    const uncertainMarkdown = `
### Sovereign Tool Dispatch: ${tool.title}
**STATUS: UNCERTAIN (INSUFFICIENT_EVIDENCE)**

Noctis identified that this query requires deterministic derivation via the **${tool.domainName}** engine (#${tool.domainId}). However, the following required physical parameters are missing from your request:

${missingDescriptions}

*To compute an exact deterministic solution and verify safety invariants without hallucination, please specify the missing variables above.*
`;
    return {
      handled: true,
      status: "UNCERTAIN_MISSING_INPUTS",
      toolId: tool.id,
      toolTitle: tool.title,
      domainName: tool.domainName,
      extractedParams: params,
      missingParams: missingRequiredKeys,
      assumedParams: assumedKeys,
      formattedMarkdown: uncertainMarkdown.trim(),
    };
  }

  try {
    const rawResult = tool.execute(params);
    const engineMarkdown = tool.formatMarkdown(params, rawResult);

    // Build parameter provenance table
    const provenanceRows = tool.parameters.map((p) => {
      const isExtracted = extractedKeys.includes(p.name);
      const val = params[p.name];
      const source = isExtracted ? "Parsed from User Query" : "Baseline Standard Default";
      return `| \`${p.name}\` | **${val} ${p.unit || ""}** | ${source} |`;
    }).join("\n");

    const finalMarkdown = `
${engineMarkdown.trim()}

#### Parameter Provenance & Invariant Audit
| Variable | Value Used | Source Provenance |
|---|---|---|
${provenanceRows}

*Generated via Noctis Sovereign Intelligence Orchestrator (Deterministic Mathematical Derivation).*
`.trim();

    return {
      handled: true,
      status: "SUCCESS",
      toolId: tool.id,
      toolTitle: tool.title,
      domainName: tool.domainName,
      extractedParams: params,
      assumedParams: assumedKeys,
      rawResult,
      formattedMarkdown: finalMarkdown,
    };
  } catch (err: any) {
    return {
      handled: true,
      status: "EXECUTION_ERROR",
      toolId: tool.id,
      toolTitle: tool.title,
      domainName: tool.domainName,
      error: err?.message || String(err),
      formattedMarkdown: `[!] Sovereign Engine Error (${tool.domainName}): ${err?.message || String(err)}`,
    };
  }
}
