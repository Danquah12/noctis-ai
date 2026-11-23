/**
 * Noctis Sigma YAML / YARA Parser & MITRE ATT&CK Navigator v4.5 Exporter
 *
 * Parses Sigma detection rules and YARA signatures deterministically, validates
 * detection hygiene, extracts ATT&CK technique IDs (`Txxxx`), and generates a valid
 * MITRE ATT&CK Navigator v4.5 JSON layer (`DoDI 8530.03` / `ICD 502` / DCO SOC coverage).
 */

import { sha256Sync } from "../universal-crypto.ts";

export interface ParsedSigmaRule {
  title: string | null;
  id: string | null;
  status: string | null;
  level: string | null;
  logsource: Record<string, string>;
  detectionCondition: string | null;
  tags: string[];
  attackTechniques: string[];
  warnings: string[];
  valid: boolean;
}

/** Deterministically parses a Sigma YAML rule and checks detection engineering hygiene. */
export function parseSigmaYamlRule(yamlText: string): ParsedSigmaRule {
  const text = (yamlText || "").replace(/\r\n/g, "\n");
  const getScalar = (key: string): string | null => {
    const m = text.match(new RegExp(`^${key}\\s*:\\s*['"]?([^\\n'"]+)['"]?`, "mi"));
    return m ? m[1]!.trim() : null;
  };

  const title = getScalar("title");
  const id = getScalar("id");
  const status = getScalar("status");
  const level = getScalar("level");

  const logsource: Record<string, string> = {};
  const lsMatch = text.match(/^logsource:\s*\n((?:[ \t]+[^\n]+\n?)*)/im);
  if (lsMatch && lsMatch[1]) {
    for (const line of lsMatch[1].split("\n")) {
      const kv = line.match(/^\s+([a-z0-9_]+)\s*:\s*['"]?([^\s'"#]+)/i);
      if (kv) logsource[kv[1]!.toLowerCase()] = kv[2]!.trim();
    }
  }

  const condMatch = text.match(/^\s+condition\s*:\s*([^\n]+)/im);
  const detectionCondition = condMatch ? condMatch[1]!.trim() : null;

  const tags: string[] = [];
  const tagLines = text.match(/^[ \t]*-\s*(attack\.[a-z0-9_.]+)/gim) || [];
  for (const tl of tagLines) {
    const cleaned = tl.replace(/^[ \t]*-\s*/, "").trim();
    if (cleaned) tags.push(cleaned);
  }

  const techSet = new Set<string>();
  for (const m of text.matchAll(/\b(T1\d{3}(?:\.\d{3})?)\b/gi)) {
    techSet.add(m[1]!.toUpperCase());
  }

  const warnings: string[] = [];
  if (!title) warnings.push("Missing Sigma `title` header.");
  if (Object.keys(logsource).length === 0) warnings.push("Missing `logsource` (product/category/service) prevents SIEM compilation.");
  if (!detectionCondition) warnings.push("Missing `detection.condition` boolean logic.");
  if (techSet.size === 0) warnings.push("No `attack.tXXXX` ATT&CK technique tags declared.");
  if (/\|\s*(?:contains|endswith)\s*:\s*['"]?\*['"]?/.test(text)) {
    warnings.push("Overbroad standalone `*` wildcard in detection selection may cause excessive false positives.");
  }

  return {
    title,
    id,
    status,
    level,
    logsource,
    detectionCondition,
    tags,
    attackTechniques: [...techSet],
    warnings,
    valid: Boolean(title && Object.keys(logsource).length > 0 && detectionCondition),
  };
}

export interface ParsedYaraRule {
  ruleName: string | null;
  meta: Record<string, string>;
  stringsCount: number;
  condition: string | null;
  attackTechniques: string[];
  warnings: string[];
  valid: boolean;
}

/** Deterministically parses a YARA rule and validates condition/meta hygiene. */
export function parseYaraRule(yaraText: string): ParsedYaraRule {
  const text = (yaraText || "").replace(/\r\n/g, "\n");
  const ruleMatch = text.match(/rule\s+([A-Za-z_][A-Za-z0-9_]*)\b/);
  const ruleName = ruleMatch ? ruleMatch[1]! : null;

  const meta: Record<string, string> = {};
  const metaMatch = text.match(/\bmeta:\s*\n([\s\S]*?)(?:\bstrings:|\bcondition:|\})/i);
  if (metaMatch && metaMatch[1]) {
    for (const line of metaMatch[1].split("\n")) {
      const kv = line.match(/^\s*([a-z0-9_]+)\s*=\s*"([^"]*)"/i);
      if (kv) meta[kv[1]!] = kv[2]!;
    }
  }

  const strMatch = text.match(/\bstrings:\s*\n([\s\S]*?)\bcondition:/i);
  const stringsCount = strMatch && strMatch[1] ? (strMatch[1].match(/^\s*\$[A-Za-z0-9_]*\s*=/gm) || []).length : 0;

  const condMatch = text.match(/\bcondition:\s*\n?([\s\S]*?)\}/i);
  const condition = condMatch ? condMatch[1]!.trim() : null;

  const attackTechniques = [...new Set([...text.matchAll(/\b(T1\d{3}(?:\.\d{3})?)\b/gi)].map((m) => m[1]!.toUpperCase()))];
  const warnings: string[] = [];
  if (!ruleName) warnings.push("Missing `rule <name>` declaration.");
  if (Object.keys(meta).length === 0) warnings.push("Missing YARA `meta:` attribution/TLP block.");
  if (!condition) warnings.push("Missing `condition:` block.");
  if (condition && /^true$/i.test(condition.trim())) warnings.push("Tautology `condition: true` would match every scanned binary.");

  return {
    ruleName,
    meta,
    stringsCount,
    condition,
    attackTechniques,
    warnings,
    valid: Boolean(ruleName && condition && !/^true$/i.test(condition.trim())),
  };
}

export interface NavigatorTechniqueInput {
  techniqueId: string;
  coverageStatus: "DETECTED" | "PARTIAL" | "BLIND_SPOT";
  comment?: string;
}

/** Exports an official MITRE ATT&CK Navigator v4.5 JSON layer (`versions.layer = "4.5"`). */
export function buildAttackNavigatorLayer(input: {
  name?: string;
  description?: string;
  techniques: NavigatorTechniqueInput[];
}) {
  const colorByStatus: Record<NavigatorTechniqueInput["coverageStatus"], { color: string; score: number }> = {
    DETECTED: { color: "#10b981", score: 100 },
    PARTIAL: { color: "#f59e0b", score: 50 },
    BLIND_SPOT: { color: "#ef4444", score: 0 },
  };

  const layer = {
    name: input.name || "Noctis DCO / DoDI 8530.03 Detection Coverage",
    versions: {
      attack: "16",
      navigator: "4.9.1",
      layer: "4.5",
    },
    domain: "enterprise-attack",
    description: input.description || "Deterministic ATT&CK coverage layer generated by Noctis NDIMP DCO & Sigma/YARA Engine.",
    sorting: 3,
    layout: {
      layout: "side",
      showID: true,
      showName: true,
    },
    techniques: input.techniques.map((t) => {
      const cfg = colorByStatus[t.coverageStatus];
      return {
        techniqueID: t.techniqueId.toUpperCase(),
        score: cfg.score,
        color: cfg.color,
        enabled: true,
        comment: t.comment || `Coverage: ${t.coverageStatus}`,
      };
    }),
    gradient: {
      colors: ["#ef4444", "#f59e0b", "#10b981"],
      minValue: 0,
      maxValue: 100,
    },
    metadata: [
      { name: "generator", value: "Noctis-NDIMP-DCO-Engine-v4" },
      { name: "generatedAt", value: new Date().toISOString() },
    ],
  };

  return {
    layer,
    sha256: sha256Sync(JSON.stringify(layer)),
    techniqueCount: layer.techniques.length,
  };
}
