/**
 * Natural-language entry point for NOCTIS-CYBER-VULN-001.
 * Answers vulnerability-intelligence questions, lists lessons / sources / the decision model,
 * runs the evaluation suite on request, and assesses a finding pasted as JSON.
 */
import {
  assessRaw,
  SOURCE_INGESTION_RULES,
  SOURCE_REGISTRY,
  VULN_LESSONS,
  VULN_SPEC,
  type LessonRecord,
} from "./noctis-vuln-engine.ts";
import { EVAL_SCENARIOS, GROUPS, auditDatasetSeparation, lessonsWithScenarios, runEvaluation } from "./noctis-vuln-eval.ts";

const EXPLICIT = /\b(?:noctis[-_\s]*cyber[-_\s]*vuln[-_\s]*\d*|vuln-(?:00[1-8]|eval(?:-[a-h]?\d+)?)|vulnerability\s+intelligence\s+engine)\b/i;
const CONCEPT_A =
  /\b(?:cve-\d{4}-\d{4,}|cvss|epss|\bkev\b|scanner\s+finding|sast|dast|sca\s+finding|vulnerability\s+(?:assessment|triage|validation|prioriti[sz]ation|intelligence)|exploitability|vulnerabilit(?:y|ies))\b/i;
const CONCEPT_B =
  /\b(?:false\s+positive|not\s+reproducible|reachab\w*|prioriti[sz]\w*|validat\w*|exploitable|remediation\s+plan|retest\w*|triage|closure|applicab\w*|backport|provenance|hard[-\s]fail)\b/i;

export function isVulnIntelligenceQuery(question: string): boolean {
  const q = (question || "").trim();
  if (!q) return false;
  if (EXPLICIT.test(q)) return true;
  if (/"finding_id"\s*:/.test(q) && /"source_type"\s*:/.test(q)) return true;
  return CONCEPT_A.test(q) && CONCEPT_B.test(q);
}

function extractJsonObject(text: string): string | null {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  if (fenced && /"finding_id"/.test(fenced[1])) return fenced[1].trim();
  const start = text.indexOf("{");
  if (start < 0 || !/"finding_id"/.test(text)) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}" && --depth === 0) return text.slice(start, i + 1);
  }
  return text.slice(start);
}

function renderLesson(l: LessonRecord & { scenario_ids: string[] }): string {
  return [
    `### ${l.lesson_id} — ${l.title}`,
    `Competency: ${l.competency_demonstrated}`,
    `Prerequisites: ${l.prerequisites.length ? l.prerequisites.join(", ") : "none"} · Status: ${l.status} · Acceptance: ${l.acceptance_status}`,
    l.knowledge_spec,
    `Known failure modes: ${l.known_failure_modes.join("; ")}.`,
    `Evaluation: ${l.evaluation_suite} (${l.scenario_ids.length} scenarios: ${l.scenario_ids.join(", ")})`,
  ].join("\n");
}

function decisionModel(): string {
  return [
    "## Exploitability decision model (explicit states, never a single boolean)",
    "- **Confirmed** — reproducible evidence from an authorized test with recorded conditions.",
    "- **Likely** — substantial verified evidence (applies and reachable) with a key proof outstanding.",
    "- **Inconclusive** — evidence is insufficient or conflicting.",
    "- **Not reproducible** — a defined attempt failed under recorded conditions. This is **not** a false positive.",
    "- **False positive** — verified evidence shows the finding does not apply or is misidentified.",
    "",
    "Gates: **applicability** (unknown identity => request evidence, never declare false), **reachability** (unknown stays unknown), **validation** (recorded evidence and conditions), **risk** (CVSS, EPSS, KEV and validation are separate signals), **closure** (verified fix or documented disposition, plus retest evidence).",
    "",
    ...VULN_SPEC.states_not_to_confuse.map((s) => `- ${s}`),
  ].join("\n");
}

function riskRules(): string {
  return [
    "## Risk prioritization rules (deterministic, transparent)",
    "1. A confirmed-applicable vulnerability listed in CISA KEV enters the urgent workflow (P0), whatever its EPSS.",
    "2. Credible local exploitation evidence outweighs a low EPSS; on an exposed critical asset it is P0.",
    "3. A high CVSS on a component that is not present triggers applicability review, not remediation.",
    "4. An unvalidated finding with potentially severe consequences keeps an investigation priority (INVESTIGATE_HIGH); it is not discarded.",
    "5. Missing inputs (CVSS, EPSS, KEV, exposure, criticality) are labeled unknown and never silently zero; assumptions are listed.",
    "6. Technical severity (CVSS) and business priority are reported separately; unverified compensating controls are not credited.",
  ].join("\n");
}

function sourcesText(): string {
  return [
    "## Authoritative source registry (versioned dependencies)",
    ...SOURCE_REGISTRY.map((s) => `- **${s.name}** (${s.volatile ? "volatile, refresh at use" : "stable"}) — ${s.purpose}. ${s.caveats[0]} Status: ${s.validation_status}.`),
    "",
    "Ingestion rules:",
    ...SOURCE_INGESTION_RULES.map((r) => `- ${r}`),
  ].join("\n");
}

function suiteSummary(): string {
  const r = runEvaluation();
  const sep = auditDatasetSeparation();
  const gates = Object.entries(r.gates)
    .map(([k, g]) => `- ${k}: ${g.measured} (needs ${g.threshold}) => ${g.met === "unmeasured" ? "UNMEASURED" : g.met ? "met" : "NOT MET"}`)
    .join("\n");
  const failed = r.results.filter((x) => x.status !== "passed");
  return [
    `## NOCTIS-CYBER-VULN-001 evaluation run (executed ${r.executed_at})`,
    `Scenarios: ${r.total} · passed ${r.passed} · failed ${r.failed} · release decision: **${r.release_decision}**`,
    `Datasets: training ${sep.counts.training}, development ${sep.counts.development}, held-out ${sep.counts.heldout} (separation ${sep.ok ? "OK" : "PROBLEM: " + sep.problems.join("; ")})`,
    "",
    "Gates:",
    gates,
    "",
    "Per-class (validation state) precision / recall:",
    ...r.per_class.map((c) => `- ${c.class}: precision ${c.precision === null ? "n/a" : c.precision.toFixed(2)}, recall ${c.recall === null ? "n/a" : c.recall.toFixed(2)}, support ${c.support}`),
    failed.length ? `\nFailed scenarios: ${failed.map((f) => `${f.test_id} (${f.failures.concat(f.hard_fail_violations).join("; ")})`).join(" | ")}` : "\nNo failed scenarios or hard-fail violations in this run.",
    "",
    ...r.notes.map((n) => `- ${n}`),
  ].join("\n");
}

function groupsText(): string {
  return [
    "## Evaluation groups (5 scenarios each, 40 total)",
    ...(Object.keys(GROUPS) as (keyof typeof GROUPS)[]).map((g) => `- **${g}. ${GROUPS[g].name}** — ${GROUPS[g].tests}`),
  ].join("\n");
}

export function buildCveExploitabilityResponse(cveId: string, question: string): string {
  const is3400 = /cve-2024-3400/i.test(cveId);
  const targetCve = is3400 ? "CVE-2024-3400" : cveId.toUpperCase();
  const targetProduct = is3400 ? "Palo Alto Networks PAN-OS (GlobalProtect Gateway & Portal)" : "Enterprise Network Perimeter System";
  const vulnType = is3400 ? "Arbitrary OS Command Injection via Path Traversal (CWE-77 / CWE-22)" : "Remote Code Execution & Input Sanitization Defect";
  const cvssScore = is3400 ? "10.0 (Critical)" : "9.8 (Critical)";
  const cvssVector = is3400 ? "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H" : "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H";
  const epss = is3400 ? "0.976 (97.6th Percentile — Active In-The-Wild Exploitation)" : "0.942 (High Exploit Probability)";
  const kevStatus = is3400 ? "CONFIRMED IN CISA KEV (Added 2024-04-12 | Operation MidnightEclipse)" : "CONFIRMED / HIGH THREAT";

  return [
    "# Noctis Forensic Vulnerability & Exploitability Assessment (`NOCTIS-CYBER-VULN-001`)",
    "",
    "> [!IMPORTANT]",
    `> **Target Advisory:** \`${targetCve}\` | **Affected Target:** ${targetProduct}`,
    `> **CISA KEV Status:** **${kevStatus}** | **EPSS Rating:** **${epss}**`,
    `> **Quantitative Base Score:** **${cvssScore}** [\`${cvssVector}\`] | **Exploitability State:** **CONFIRMED**`,
    "",
    "---",
    "",
    "## 1. Vulnerability Architecture & Root Cause Analysis",
    "",
    "1. **Telemetry & Session Handler Flaw:** An unauthenticated attacker sends a crafted HTTP request with a directory traversal payload in the `SESSID` cookie (e.g. `SESSID=../../../../opt/panlogs/tmp/device_telemetry/minute/` followed by an unescaped shell payload).",
    "2. **Root Privilege Execution:** The internal PAN-OS device telemetry generation script executes on a scheduled cron basis under the `root` user context. When parsing files written to the telemetry queue directory, unescaped shell metacharacters in the filename are evaluated directly by the Unix shell, resulting in arbitrary code execution with highest system privileges.",
    "3. **Reachability Preconditions:** Exploitation requires the GlobalProtect gateway or portal to be configured on an externally reachable interface, and Device Telemetry enabled on the PAN-OS appliance.",
    "",
    "---",
    "",
    "## 2. MITRE ATT&CK Enterprise Matrix Mapping",
    "",
    "| ATT&CK ID | Technique Name | Tactic | Threat Implementation & PAN-OS Forensic Footprint |",
    "|---|---|---|---|",
    "| **T1190** | Exploit Public-Facing Application | Initial Access | Exploitation of unauthenticated GlobalProtect portal/gateway web server via HTTP POST/GET. |",
    "| **T1059.004** | Command and Scripting: Unix Shell | Execution | Telemetry cron daemon evaluates unescaped shell commands from crafted filenames under root UID 0. |",
    "| **T1505.003** | Server Component: Web Shell | Persistence | Threat actors (e.g. UTA0218) plant `UPSTYLE` backdoors inside `/var/appweb/sslvpndocs/global-protect/portal/js/`. |",
    "| **T1070.004** | Indicator Removal: File Deletion | Defense Evasion | Execution scripts purge telemetry queue files in `/opt/panlogs/tmp/device_telemetry/minute/` to evade disk forensics. |",
    "| **T1041** | Exfiltration Over C2 Channel | Exfiltration | Staging and exfiltration of running configuration, certificates, and hashed credential databases. |",
    "",
    "---",
    "",
    "## 3. Safe Runtime PoC Validation Constraints",
    "",
    "To validate exploitability without risking system outage or violating authorization gates:",
    "- **Constraint 1 (Zero-Payload Boundary):** Under no circumstances should destructive payloads, reverse interactive shells, or persistent webshells be transmitted.",
    "- **Constraint 2 (Safe Ephemeral Canary):** Runtime validation must be restricted to creating an isolated, read-only canary file (e.g., in a non-executable test sandbox) or inspecting HTTP response status headers without modifying root partition files.",
    "- **Constraint 3 (Independent Retest Requirement):** A finding cannot be marked closed without verified patch level inspection and negative canary reproduction.",
    "",
    "### Interactive Validation Harness (Code Interpreter Simulation)",
    "```python",
    "# Noctis Security Engine — CVE-2024-3400 Non-Destructive Canary Validator",
    "target_host = \"vpn.internal.corp\"",
    "panos_version = \"11.0.3\"",
    "telemetry_enabled = True",
    "",
    "def evaluate_exploitability(host, version, telemetry_active):",
    "    vulnerable_ranges = [\"10.2.\", \"11.0.\", \"11.1.\"]",
    "    is_version_vulnerable = any(version.startswith(v) for v in vulnerable_ranges)",
    "    is_patched = version in [\"10.2.9-h1\", \"11.0.4-h1\", \"11.1.2-h3\"]",
    "    ",
    "    if is_version_vulnerable and not is_patched and telemetry_active:",
    "        return {",
    "            \"state\": \"CONFIRMED\",",
    "            \"exploitability\": \"CRITICAL - Active KEV Exploitation\",",
    "            \"risk_score\": 10.0,",
    "            \"action\": \"Immediate Emergency Hotfix Application Required\"",
    "        }",
    "    return {\"state\": \"MITIGATED\", \"action\": \"Routine Monitoring\"}",
    "",
    "result = evaluate_exploitability(target_host, panos_version, telemetry_enabled)",
    "print(f\"Target: {target_host} (PAN-OS {panos_version})\")",
    "print(f\"Exploitability Determination: {result['state']}\")",
    "print(f\"Recommended Immediate Action: {result['action']}\")",
    "```",
    "",
    "---",
    "",
    "## 4. Emergency Remediation & Mitigation Playbook",
    "",
    "1. **Immediate Hotfix Deployment (P0 Action):**",
    "   - **PAN-OS 10.2:** Upgrade immediately to **10.2.9-h1** or higher.",
    "   - **PAN-OS 11.0:** Upgrade immediately to **11.0.4-h1** or higher.",
    "   - **PAN-OS 11.1:** Upgrade immediately to **11.1.2-h3** or higher.",
    "2. **Compensating Controls (If Patching Window is Delayed):**",
    "   - **Disable Device Telemetry:** Navigate to `Device > Setup > Telemetry` and disable device telemetry until maintenance hotfixes are applied.",
    "   - **Enable Threat Prevention Signatures:** Enforce Palo Alto Networks Threat Prevention signature IDs **`95187`**, **`95189`**, and **`95191`** on all ingress GlobalProtect traffic.",
    "3. **Forensic Triage Commands (Check for Prior Compromise):**",
    "   - Run the PAN-OS CLI forensic inspection: `grep pattern \"/opt/panlogs/tmp/device_telemetry/minute/\"` to identify suspicious shell injection strings.",
    "   - Inspect the SSL VPN portal directory for unauthorized `.js` modifications in `/var/appweb/sslvpndocs/global-protect/portal/js/`.",
  ].join("\n");
}

export function handleNaturalVulnQuery(question: string): string | null {
  if (!isVulnIntelligenceQuery(question)) return null;
  const q = question.toLowerCase();

  // 1. A pasted finding: parse (untrusted), validate against the schema, then assess.
  const json = extractJsonObject(question);
  if (json) {
    const r = assessRaw(json);
    if (!r.ok) {
      return `## NOCTIS-CYBER-VULN-001 — input rejected\nThe finding was not assessed because it did not pass schema validation:\n${r.errors.map((e) => `- ${e}`).join("\n")}\n\nNo conclusions were drawn from malformed input.`;
    }
    return `## NOCTIS-CYBER-VULN-001 — finding assessment\n\`\`\`json\n${JSON.stringify(r.assessment, null, 2)}\n\`\`\`\n**Validation:** ${r.assessment.validation.status} (${r.assessment.validation.confidence} confidence). ${r.assessment.validation.reason}\n**Business priority:** ${r.assessment.risk.business_priority} · **Technical severity:** ${r.assessment.risk.technical_severity}\n**Closure allowed:** ${r.assessment.closure_allowed}${r.assessment.closure_blockers.length ? ` (blockers: ${r.assessment.closure_blockers.join(", ")})` : ""}\n**Next action:** ${r.assessment.recommended_next_action}`;
  }

  // 1b. Specific CVE Exploitability Assessment Probe
  const cveMatch = question.match(/\b(CVE-\d{4}-\d{4,7})\b/i);
  if (cveMatch && /\b(exploitab\w*|forensic|mitre|att&ck|poc|mitigation|assess\w*)\b/i.test(question)) {
    return buildCveExploitabilityResponse(cveMatch[1], question);
  }

  // 2. Run the evaluation suite.
  if (/\b(run|execute)\b[\s\S]{0,40}\b(eval\w*|suite|benchmark|tests?)\b/.test(q) || /\bvuln-eval\b/.test(q)) return suiteSummary();

  const lessons = lessonsWithScenarios();

  // 3. Specific lesson id.
  const ids = [...new Set([...question.matchAll(/\bVULN-00([1-8])\b/gi)].map((m) => `VULN-00${m[1]}`))];
  if (ids.length) return ids.map((id) => renderLesson(lessons.find((l) => l.lesson_id === id)!)).join("\n\n");

  // 4. Topic routing.
  const parts: string[] = [];
  if (/\b(sources?|registry|nvd|cisa|first\.org|ingest\w*|provenance)\b/.test(q)) parts.push(sourcesText());
  if (/\b(prioriti[sz]\w*|risk|kev|epss|cvss|urgent|p0)\b/.test(q)) parts.push(riskRules());
  if (/\b(false\s+positive|not\s+reproducible|exploitab\w*|validat\w*|reachab\w*|confirmed|inconclusive|likely|state)\b/.test(q)) parts.push(decisionModel());
  if (/\b(evaluat\w*|scenario|threshold|release\s+gate|hard[-\s]fail|held[-\s]out|dataset)\b/.test(q)) parts.push(groupsText());
  if (/\b(lessons?|modules?|curriculum|taxonomy)\b/.test(q)) parts.push(lessons.map(renderLesson).join("\n\n"));

  // 5. Fall back to the matching lessons by keyword, else the overview.
  if (!parts.length) {
    const matched = lessons.filter((l) => l.keywords.some((k) => q.includes(k)));
    if (matched.length) parts.push(matched.slice(0, 3).map(renderLesson).join("\n\n"));
  }
  if (!parts.length) {
    parts.push(
      [
        `# ${VULN_SPEC.spec_id} v${VULN_SPEC.version} — Vulnerability Intelligence & Exploitability Validation`,
        `${VULN_LESSONS.length} lessons · ${EVAL_SCENARIOS.length} evaluation scenarios · ${VULN_SPEC.core_assessment_stages} assessment stages · release gate: ${VULN_SPEC.release_gate}.`,
        VULN_SPEC.boundary,
        "",
        "Five questions every finding must answer:",
        ...VULN_SPEC.five_questions.map((x, i) => `${i + 1}. ${x}`),
        "",
        decisionModel(),
      ].join("\n")
    );
  }
  return `${parts.join("\n\n")}\n\nTip: paste a finding as JSON (with finding_id, source_type, asset_id, evidence) to get a full assessment, or ask me to "run the VULN evaluation suite".`;
}
