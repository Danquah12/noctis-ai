/**
 * Noctis Universal Assistant v1.0 & Noctis Forge Chat Bridge (`noctis-desk.server.ts`)
 *
 * Strictly excludes clinical, DoD/IC STIG, FedRAMP RMF, Enterprise Command Center,
 * NUPS, and Catalog 260 queries so zero existing domains are disrupted.
 */

import { isEnterpriseChatQuery } from "../enterprise/chat-bridge.server.ts";
import { isNupsChatQuery } from "../nups/chat-bridge.server.ts";
import { isCatalog260ChatQuery } from "../catalog260/chat-bridge.server.ts";
import { renderParityMatrixMarkdown } from "./parity-matrix.ts";
import { run100TaskBenchmark } from "./benchmark-100.server.ts";
import { runDeepResearchAgent } from "./research-agent.server.ts";
import { generateForgeProject, validateDevelopmentEnvironment } from "../forge/forge-engine.server.ts";

const EXCLUSION_RE =
  /\b(?:crit-\d{3}|patient\s+[ab]|\d{1,3}-year-old\s+(?:male|female)|chief\s+complaint|creatinine\s+of|serum\s+lipase|troponin|kdigo|hyperkalemia|septic\s+shock|rhel\s+9\s+stig|v-\d{5,6}|dodi\s+85(?:00|10)|icd\s+503|fedramp\s+(?:high|moderate)\s+system\s+uses|nist\s+800-53\s+rmf)\b/i;

const ASSISTANT_PARITY_OR_BENCHMARK_RE =
  /\b(?:chatgpt\s+(?:vs|to|parity)|feature\s+parity\s+matrix|100-?task\s+benchmark|universal\s+assistant\s+v1|distinctive\s+moat|answer\s+passport|deterministic\s+replay|model\s+quality\s+observatory)\b/i;

const FORGE_BUILDER_CHAT_RE =
  /\b(?:noctis\s+forge|website\s+builder|build\s+(?:a|an)\s+(?:website|web\s+app|portal|platform|saas|marketplace|store|dashboard)|software\s+factory|validate\s+(?:the\s+)?noctis\s+development\s+environment)\b/i;

const DEEP_RESEARCH_CHAT_RE =
  /\b(?:deep\s+research\s+(?:report|synthesis|agent)|verified\s+web\s+research)\b/i;

export function isAssistantChatQuery(question: string): boolean {
  const q = (question || "").trim();
  if (!q) return false;
  if (EXCLUSION_RE.test(q)) return false;
  if (isEnterpriseChatQuery(q) || isNupsChatQuery(q) || isCatalog260ChatQuery(q)) return false;

  return (
    ASSISTANT_PARITY_OR_BENCHMARK_RE.test(q) ||
    FORGE_BUILDER_CHAT_RE.test(q) ||
    DEEP_RESEARCH_CHAT_RE.test(q)
  );
}

export async function tryHandleAssistantChatQuery(question: string): Promise<string | null> {
  const q = (question || "").trim();
  if (!isAssistantChatQuery(q)) return null;

  if (/\b(?:100-?task\s+benchmark|run\s+benchmark)\b/i.test(q)) {
    const res = await run100TaskBenchmark({ persist: true, executedBy: "noctis-chat" });
    return [
      `## Noctis 100-Task Application-Component Check (\`${res.runId}\`)`,
      `- **Evidence boundary:** In-process deterministic function checks only; **no selected-model inference**, **no held-out evaluation**, **no verified model-intelligence score**.`,
      `- **Model release gate:** \`${res.releaseGate}\` · **Model quality score:** not measured`,
      `- **Component pass rate:** **${res.passRatePct}%** (\`PASS\`: **${res.passedTasks}**, \`PARTIAL\`: **${res.partialTasks}**, \`FAIL\`: **${res.failedTasks}** across **${res.totalTasks}** component checks in ${res.elapsedMs}ms)`,
      "",
      "| Category | Pass | Partial | Fail | Total |",
      "| :--- | :---: | :---: | :---: | :---: |",
      ...Object.entries(res.categoryScores).map(([cat, sc]) => `| **${cat}** | ${sc.pass} | ${sc.partial} | ${sc.fail} | ${sc.total} |`),
    ].join("\n");
  }

  if (ASSISTANT_PARITY_OR_BENCHMARK_RE.test(q)) {
    return renderParityMatrixMarkdown();
  }

  if (/\bvalidate\s+(?:the\s+)?noctis\s+development\s+environment\b/i.test(q)) {
    const env = validateDevelopmentEnvironment();
    return [
      `## Noctis Forge — Development Environment Verification`,
      `- **Live in Repo:** ${env.summary.liveInRepo} · **Requires Env Token:** ${env.summary.envCredentialRequired} · **External MicroVM Boundary:** ${env.summary.externalMicroVmBoundary}`,
      ...env.checks.map((c) => `- **${c.component}** (\`${c.status}\`): ${c.detail}`),
    ].join("\n");
  }

  if (FORGE_BUILDER_CHAT_RE.test(q)) {
    const proj = await generateForgeProject({ prompt: q, actorId: "noctis-chat-forge", persist: true });
    return [
      `## Noctis Forge 12-Agent Application Generated: ${proj.name} (\`${proj.projectId}\`)`,
      `- **Category:** ${proj.category.name} · **Stack:** \`${proj.stack}\` · **QA/SAST:** \`${proj.qaSecurity.checksPassed}/${proj.qaSecurity.checksTotal}\` checks passing · **WCAG Contrast:** \`${proj.qaSecurity.wcagContrastRatio}:1\``,
      proj.category.specialistAdvisory ? `- **Compliance Gate:** ${proj.category.specialistAdvisory}` : "",
      `- **Generated Full-Stack Files (${proj.fileNames.length}):** ${proj.fileNames.map((f) => `\`${f}\``).join(", ")}`,
      `- **Preview & Download:** Open **Noctis Forge -> Builder Studio** or download full-stack source ZIP at \`/api/v2/forge/projects/export-zip?id=${proj.projectId}&download=true\`.`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  const dr = await runDeepResearchAgent({ query: q, includeLiveWeb: true, includeNdkrs: true });
  return dr.reportMarkdown;
}
