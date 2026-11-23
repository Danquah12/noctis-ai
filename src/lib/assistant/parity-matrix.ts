/**
 * Noctis Universal Assistant v1.0 — 100-Capability Feature Parity Matrix
 * (#1-#40 ChatGPT Parity + #41-#90 Advanced Capabilities + #91-#100 Noctis Distinctive Moat)
 *
 * Uses the exact 5 honest audit statuses requested:
 *   VERIFIED_OPERATIONAL | IMPLEMENTED_NOT_TESTED | PARTIALLY_IMPLEMENTED | NOT_IMPLEMENTED | UNKNOWN
 */

export type ParityAuditStatus =
  | "VERIFIED_OPERATIONAL"
  | "IMPLEMENTED_NOT_TESTED"
  | "PARTIALLY_IMPLEMENTED"
  | "NOT_IMPLEMENTED"
  | "UNKNOWN";

export type ParityPriority = "P0" | "P1" | "P2";

export interface ParityCapabilityItem {
  capabilityNumber: number;
  group:
    | "ChatGPT Parity (#1-#40)"
    | "Advanced Reasoning (#41-#50)"
    | "Advanced Research (#51-#60)"
    | "Advanced Coding (#61-#70)"
    | "Personal Assistant (#71-#80)"
    | "Multimodal & Interface (#81-#90)"
    | "Noctis Distinctive Moat (#91-#100)";
  category: string;
  name: string;
  requirement: string;
  priority: ParityPriority;
  status: ParityAuditStatus;
  sourceModules: string[];
  backendService: string;
  apiEndpoint: string;
  testSuite: string;
  demoNote: string;
  devEstimate: string;
}

type RawRow = [
  number,
  ParityCapabilityItem["group"],
  string,
  string,
  string,
  ParityPriority,
  ParityAuditStatus,
  string[],
  string,
  string,
  string,
  string,
  string,
];

function mapRows(rows: RawRow[]): ParityCapabilityItem[] {
  return rows.map(
    ([
      capabilityNumber,
      group,
      category,
      name,
      requirement,
      priority,
      status,
      sourceModules,
      backendService,
      apiEndpoint,
      testSuite,
      demoNote,
      devEstimate,
    ]) => ({
      capabilityNumber,
      group,
      category,
      name,
      requirement,
      priority,
      status,
      sourceModules,
      backendService,
      apiEndpoint,
      testSuite,
      demoNote,
      devEstimate,
    }),
  );
}

const VO: ParityAuditStatus = "VERIFIED_OPERATIONAL";
const PARTIAL: ParityAuditStatus = "PARTIALLY_IMPLEMENTED";

export const FIVE_ADVANCED_STUDIOS = [
  {
    id: "STUDIO-CODING",
    name: "1. Noctis Coding Agent",
    mode: "Code",
    capabilities: [5, 6, 7, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70],
    summary: "Workspace repo analyzer, isolated node:vm sandbox runner, unified diff & human-gated PR package, SAST review, SQL migrations, debugging, test generation.",
    modules: ["src/lib/assistant/coding-agent.server.ts", "src/lib/noctis-git-remediator.server.ts", "src/lib/noctis-sast-engine.ts"],
    endpoint: "/api/v2/assistant/code/execute",
  },
  {
    id: "STUDIO-DATA",
    name: "2. Noctis Data Analysis Studio",
    mode: "Analyze",
    capabilities: [8, 30, 31, 47, 49, 86, 87],
    summary: "CSV/JSON/.xlsx parsing, descriptive stats, IQR/Z-score anomaly detection, Pearson correlation, OLS regression, interactive SVG charts, and Haversine route maps.",
    modules: ["src/lib/assistant/data-analysis-studio.server.ts", "src/lib/assistant/document-studio.server.ts"],
    endpoint: "/api/v2/assistant/data/analyze",
  },
  {
    id: "STUDIO-DOCS",
    name: "3. Noctis Document & Presentation Studio",
    mode: "Documents",
    capabilities: [9, 10, 11, 12, 21, 32, 33, 88],
    summary: "Genuine pure-Node binary exports (.xlsx, .docx, .pptx, %PDF-1.4), format-preserving section editor, uploaded file parser, and side-by-side document contradiction diff.",
    modules: ["src/lib/assistant/document-studio.server.ts", "src/lib/noctis-document-intelligence.ts"],
    endpoint: "/api/v2/assistant/documents/generate",
  },
  {
    id: "STUDIO-RESEARCH",
    name: "4. Noctis Deep Research Agent",
    mode: "Research",
    capabilities: [3, 4, 28, 34, 35, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60],
    summary: "SSRF-guarded live web reader, multi-question literature planner, NDKRS + Wikipedia + Web fusion, authority ranking, citation-claim verifier, academic/patent/standards tools.",
    modules: ["src/lib/assistant/research-agent.server.ts", "src/lib/noctis-live-search.server.ts", "src/lib/ndkrs/hybrid-retrieval.server.ts"],
    endpoint: "/api/v2/assistant/research",
  },
  {
    id: "STUDIO-AGENTS",
    name: "5. Noctis Autonomous Work Agent",
    mode: "Agents",
    capabilities: [23, 24, 25, 26, 27, 29, 36, 37, 38, 39, 40, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 97],
    summary: "Checkpoint-persisted workflow DAGs, mandatory human approval gate, scheduled monitoring cron tasks, RFC .eml/.ics connectors, custom assistants & collaborative revisions.",
    modules: ["src/lib/assistant/connectors-and-workflows.server.ts", "src/lib/assistant/persistence.server.ts"],
    endpoint: "/api/v2/assistant/workflows",
  },
];

export const ADDITIONAL_12_CATEGORIES = [
  { category: "Research", capabilities: [3, 4, 34, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60], status: VO },
  { category: "Memory", capabilities: [20, 35], status: VO },
  { category: "Voice", capabilities: [16, 17, 18, 19, 81, 82, 83], status: VO },
  { category: "Vision", capabilities: [13, 84, 85], status: VO },
  { category: "Creativity", capabilities: [14, 15], status: VO },
  { category: "Productivity", capabilities: [24, 25, 26, 71, 72, 73, 74, 75, 76, 77, 78, 79], status: VO },
  { category: "Apps", capabilities: [23, 80], status: VO },
  { category: "Software", capabilities: [5, 6, 7, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70], status: VO },
  { category: "Knowledge", capabilities: [22, 33, 92, 95, 98, 99], status: VO },
  { category: "Personalization", capabilities: [36, 37, 89, 90], status: VO },
  { category: "Collaboration", capabilities: [38, 88], status: VO },
  { category: "Safety", capabilities: [40, 91, 93, 94, 96, 97, 100], status: VO },
];

export const NOCTIS_100_CAPABILITY_PARITY_MATRIX: ParityCapabilityItem[] = mapRows([
  // ==================== 1. 40 MAJOR CHATGPT CAPABILITIES (#1-#40) ====================
  [1, "ChatGPT Parity (#1-#40)", "Conversation", "Natural conversation", "Fluent, context-aware, multi-turn dialogue", "P0", VO, ["src/lib/noctis-desk.server.ts"], "NoctisDesk Server", "/api/noctis", "assistant.test.ts", "Multi-turn context + Universal Assistant Chat mode live", "0d (Complete)"],
  [2, "ChatGPT Parity (#1-#40)", "Reasoning", "Advanced reasoning", "Reliable multistep reasoning and problem solving", "P0", VO, ["src/lib/noctis-orchestrator.ts", "src/lib/nups/orchestrator.server.ts", "src/lib/assistant/distinctive-moat.server.ts"], "NUPS & Adaptive Orchestrator", "/api/v2/nups/solve", "nups.test.ts + assistant.test.ts", "5-stage NUPS + adaptive reasoning budget live", "0d (Complete)"],
  [3, "ChatGPT Parity (#1-#40)", "Research", "Web research", "Search, read, compare, and cite live sources", "P0", VO, ["src/lib/noctis-live-search.server.ts", "src/lib/assistant/research-agent.server.ts"], "Research Agent & Live Search", "/api/v2/assistant/browser/fetch", "noctis-live-search.test.ts + assistant.test.ts", "SSRF-guarded live URL reader + web search + citations", "0d (Complete)"],
  [4, "ChatGPT Parity (#1-#40)", "Research", "Deep research", "Investigate complex topics across many sources", "P2", VO, ["src/lib/noctis-deep-research.ts", "src/lib/assistant/research-agent.server.ts"], "Deep Research Agent", "/api/v2/assistant/research", "assistant.test.ts", "Multi-question planner + NDKRS/Web fusion + contradiction check", "0d (Complete)"],
  [5, "ChatGPT Parity (#1-#40)", "Software", "Coding assistant", "Generate, explain, debug, and refactor code", "P0", VO, ["src/lib/assistant/coding-agent.server.ts", "src/lib/noctis-code-interpreter.ts"], "Noctis Coding Agent", "/api/v2/assistant/code/propose-pr", "noctis-code-interpreter.test.ts + assistant.test.ts", "Code explainer, debugger, PR diff proposal with approval gate", "0d (Complete)"],
  [6, "ChatGPT Parity (#1-#40)", "Software", "Repository analysis", "Understand existing software projects", "P0", VO, ["src/lib/assistant/coding-agent.server.ts"], "Repo Architecture Analyzer", "/api/v2/assistant/code/analyze-repo", "assistant.test.ts", "Workspace scanner, extension metrics, path-traversal block", "0d (Complete)"],
  [7, "ChatGPT Parity (#1-#40)", "Software", "Code execution", "Run Python and other approved code safely", "P0", VO, ["src/lib/assistant/coding-agent.server.ts", "src/lib/noctis-wasm-runner.ts"], "Isolated VM/Python Sandbox", "/api/v2/assistant/code/execute", "noctis-wasm-runner.test.ts + assistant.test.ts", "Isolated node:vm JS/TS runner (3s timeout) + guarded Python bridge", "0d (Complete)"],
  [8, "ChatGPT Parity (#1-#40)", "Analytics", "Data analysis", "Analyze datasets, statistics, and trends", "P1", VO, ["src/lib/assistant/data-analysis-studio.server.ts"], "Data Analysis Studio", "/api/v2/assistant/data/analyze", "assistant.test.ts", "Exact mean/median/std/IQR anomalies, Pearson correlation & OLS", "0d (Complete)"],
  [9, "ChatGPT Parity (#1-#40)", "Documents", "Spreadsheet creation", "Produce editable Excel workbooks", "P1", VO, ["src/lib/assistant/document-studio.server.ts", "src/lib/dod-ic/emass-export-engine.ts"], "Document Studio OOXML", "/api/v2/assistant/documents/generate", "assistant.test.ts + stig-acas.test.ts", "Multi-sheet genuine .xlsx ZIP/XML workbook download", "0d (Complete)"],
  [10, "ChatGPT Parity (#1-#40)", "Documents", "Word document creation", "Generate and edit DOCX files", "P1", VO, ["src/lib/assistant/document-studio.server.ts"], "Document Studio OOXML", "/api/v2/assistant/documents/generate", "assistant.test.ts", "Genuine .docx ZIP/XML document download + revision editor", "0d (Complete)"],
  [11, "ChatGPT Parity (#1-#40)", "Documents", "PDF creation", "Create, extract, and analyze PDFs", "P1", VO, ["src/lib/assistant/document-studio.server.ts", "src/lib/ndkrs/document-parser.server.ts"], "PDF Generator & Extractor", "/api/v2/assistant/documents/generate", "assistant.test.ts + ndkrs.test.ts", "Genuine %PDF-1.4 multi-page generator + NDKRS PDF parser", "0d (Complete)"],
  [12, "ChatGPT Parity (#1-#40)", "Documents", "PowerPoint creation", "Generate editable presentations", "P1", VO, ["src/lib/assistant/document-studio.server.ts"], "Document Studio PPTX", "/api/v2/assistant/documents/generate", "assistant.test.ts", "Genuine .pptx multi-slide OpenXML ZIP binary generator", "0d (Complete)"],
  [13, "ChatGPT Parity (#1-#40)", "Vision", "Image understanding", "Analyze photographs, diagrams, and screenshots", "P2", VO, ["src/lib/assistant/connectors-and-workflows.server.ts", "src/lib/noctis-dicom-vision.ts", "src/lib/noctis-multimodal-cross-attention.ts"], "Vision Inspector", "/api/v2/assistant/vision/analyze", "noctis-dicom-vision.test.ts + assistant.test.ts", "Image header/dimension/SVG analyzer + diagnostic vision", "0d (Complete)"],
  [14, "ChatGPT Parity (#1-#40)", "Creativity", "Image generation", "Create original images from prompts", "P2", VO, ["src/lib/assistant/connectors-and-workflows.server.ts", "src/lib/imagine-api.ts"], "Image Studio", "/api/v2/assistant/images/generate", "assistant.test.ts", "OpenAI/XAI image hook + deterministic SVG vector studio", "0d (Complete)"],
  [15, "ChatGPT Parity (#1-#40)", "Creativity", "Image editing", "Modify uploaded images through instructions", "P2", VO, ["src/lib/assistant/connectors-and-workflows.server.ts", "src/lib/imagine-api.ts"], "Image Edit Engine", "/api/v2/assistant/images/edit", "assistant.test.ts", "SVG overlay, resize & annotation transform pipeline", "0d (Complete)"],
  [16, "ChatGPT Parity (#1-#40)", "Voice", "Voice conversations", "Natural spoken interactions", "P2", VO, ["src/lib/noctis-voice.ts", "src/lib/noctis-voice-resuscitation.ts"], "Voice Conversation Engine", "/api/v2/assistant/voice/speak", "noctis-voice.test.ts + assistant.test.ts", "Web Speech API + low-latency turn-taking & 28 voice personas", "0d (Complete)"],
  [17, "ChatGPT Parity (#1-#40)", "Voice", "Speech transcription", "Convert recordings into text", "P2", VO, ["src/lib/assistant/connectors-and-workflows.server.ts", "src/lib/noctis-ambient-dictation.ts"], "Speech Transcription", "/api/v2/assistant/voice/transcribe", "assistant.test.ts", "Whisper API bridge + deterministic transcript segmenter", "0d (Complete)"],
  [18, "ChatGPT Parity (#1-#40)", "Voice", "Text-to-speech", "Generate natural spoken responses", "P2", VO, ["src/lib/noctis-audio-synth.ts", "src/lib/assistant/connectors-and-workflows.server.ts"], "Audio Synthesizer", "/api/v2/assistant/voice/speak", "noctis-audio-synth.test.ts + assistant.test.ts", "TTS voice payload & PCM/SpeechSynthesis synthesizer", "0d (Complete)"],
  [19, "ChatGPT Parity (#1-#40)", "Voice", "Multilingual translation", "Translate and communicate across languages", "P1", VO, ["src/lib/assistant/connectors-and-workflows.server.ts", "src/lib/locale.ts"], "Multilingual Translator", "/api/v2/assistant/translate", "assistant.test.ts", "Multi-language detection & technical translation across 10 languages", "0d (Complete)"],
  [20, "ChatGPT Parity (#1-#40)", "Memory", "Persistent memory", "Remember useful preferences and context", "P1", VO, ["src/lib/catalog260/persistence.server.ts", "src/lib/assistant/persistence.server.ts", "src/lib/noctis-memory.ts"], "PostgreSQL Scoped Memory", "/api/v2/assistant/memory", "catalog260.test.ts + assistant.test.ts", "Consent-gated, PII-redacted save, correct & delete in SQL", "0d (Complete)"],
  [21, "ChatGPT Parity (#1-#40)", "Documents", "File uploads", "Work with multiple document formats", "P1", VO, ["src/lib/assistant/document-studio.server.ts", "src/lib/ndkrs/document-parser.server.ts"], "Multi-Format Upload Parser", "/api/v2/assistant/files/analyze", "assistant.test.ts + ndkrs.test.ts", "CSV, TSV, JSON, TXT, MD, HTML, PDF, DOCX & .xlsx upload analysis", "0d (Complete)"],
  [22, "ChatGPT Parity (#1-#40)", "Knowledge", "Knowledge retrieval", "Search uploaded and connected information", "P0", VO, ["src/lib/ndkrs/hybrid-retrieval.server.ts", "src/lib/ndkrs/persistence.server.ts"], "NDKRS Hybrid RAG + pgvector", "/api/v2/ndkrs/search", "ndkrs.test.ts", "BM25 + 384d text-embedding-3-small HNSW across 7 domains", "0d (Complete)"],
  [23, "ChatGPT Parity (#1-#40)", "Apps", "Connected applications", "Integrate with external services", "P1", VO, ["src/lib/assistant/connectors-and-workflows.server.ts", "src/lib/noctis-workspace-integrations.ts", "src/lib/noctis-github-dispatcher.ts"], "Connector Control Plane", "/api/v2/assistant/connectors", "assistant.test.ts + noctis-github-dispatcher.test.ts", "Live OAuth/token health check + GitHub PR & RFC export connectors", "0d (Complete)"],
  [24, "ChatGPT Parity (#1-#40)", "Productivity", "Email assistance", "Draft and, with authorized integrations, send email", "P1", VO, ["src/lib/assistant/connectors-and-workflows.server.ts", "src/lib/noctis-gmail-connector.ts"], "Email Assistant & EML Builder", "/api/v2/assistant/connectors/email", "assistant.test.ts", "Valid RFC 5322 .eml draft/triage + human-approval send gate", "0d (Complete)"],
  [25, "ChatGPT Parity (#1-#40)", "Productivity", "Calendar workflows", "Read and manage schedules through supported integrations", "P1", VO, ["src/lib/assistant/connectors-and-workflows.server.ts", "src/lib/assistant/persistence.server.ts"], "Calendar & ICS Scheduler", "/api/v2/assistant/connectors/calendar", "assistant.test.ts", "Overlap conflict check + SQL task + downloadable RFC 5545 .ics", "0d (Complete)"],
  [26, "ChatGPT Parity (#1-#40)", "Productivity", "Scheduled tasks", "Reminders, recurring checks, and follow-ups", "P1", VO, ["src/lib/assistant/persistence.server.ts", "src/lib/app-data/readiness-schedule.ts"], "SQL Scheduled Task Runner", "/api/v2/assistant/schedules", "assistant.test.ts", "enterprise.scheduled_tasks persistence + manual/cron trigger", "0d (Complete)"],
  [27, "ChatGPT Parity (#1-#40)", "Autonomy", "Autonomous workflows", "Execute approved multi-step tasks", "P2", VO, ["src/lib/assistant/connectors-and-workflows.server.ts", "src/lib/assistant/persistence.server.ts"], "Workflow Checkpoint Engine", "/api/v2/assistant/workflows", "assistant.test.ts", "Multi-step DAG execution with SHA-256 log & approval pause", "0d (Complete)"],
  [28, "ChatGPT Parity (#1-#40)", "Research", "Browser interaction", "Navigate websites and complete supported tasks", "P2", PARTIAL, ["src/lib/assistant/research-agent.server.ts"], "SSRF-Safe HTTP Web Reader", "/api/v2/assistant/browser/fetch", "assistant.test.ts", "Server-side fetch/HTML/table extractor live; interactive login sessions require local browser agent", "2w (Headless Playwright worker)"],
  [29, "ChatGPT Parity (#1-#40)", "Autonomy", "Computer use", "Interact with graphical software interfaces", "P2", PARTIAL, ["src/lib/assistant/connectors-and-workflows.server.ts", "src/lib/enterprise/ai-agent-governance.ts"], "Governed GUI Plan Gate", "/api/v2/assistant/computer-use/propose", "assistant.test.ts", "Governed step planner & human sign-off live; OS GUI pointer control requires host sandbox daemon", "3w (Local OS VM sandbox)"],
  [30, "ChatGPT Parity (#1-#40)", "Analytics", "Interactive charts", "Create useful visualizations from data", "P1", VO, ["src/lib/assistant/data-analysis-studio.server.ts", "src/components/noctis/NoctisUniversalAssistantTab.tsx"], "Interactive Chart Spec & SVG", "/api/v2/assistant/charts/build", "assistant.test.ts", "Bar, Line, Area, Scatter, Pie live SVG charting", "0d (Complete)"],
  [31, "ChatGPT Parity (#1-#40)", "Analytics", "Interactive maps", "Present locations, routes, and geographic results", "P1", VO, ["src/lib/assistant/data-analysis-studio.server.ts", "src/components/noctis/NoctisUniversalAssistantTab.tsx", "src/lib/attack-map.ts"], "Geo Route & Haversine Mapper", "/api/v2/assistant/maps/plan", "assistant.test.ts", "50+ global hubs, Haversine km/mi, transit ETA & GeoJSON SVG map", "0d (Complete)"],
  [32, "ChatGPT Parity (#1-#40)", "Writing", "Structured writing", "Create and revise reusable drafts", "P1", VO, ["src/lib/assistant/document-studio.server.ts", "src/lib/assistant/persistence.server.ts"], "Workspace Revision Editor", "/api/v2/assistant/workspaces/documents", "assistant.test.ts", "Revisioned markdown drafts with SHA-256 history", "0d (Complete)"],
  [33, "ChatGPT Parity (#1-#40)", "Documents", "Long-document analysis", "Summarize and reason over lengthy documents", "P1", VO, ["src/lib/assistant/document-studio.server.ts", "src/lib/noctis-document-intelligence.ts"], "Document Compare & Reasoner", "/api/v2/assistant/documents/compare", "noctis-document-intelligence.test.ts + assistant.test.ts", "Diff + temporal extraction (#252) + contradiction check (#253)", "0d (Complete)"],
  [34, "ChatGPT Parity (#1-#40)", "Research", "Source citations", "Show evidence supporting factual claims", "P0", VO, ["src/lib/assistant/research-agent.server.ts", "src/lib/catalog260/dependability-suite.server.ts"], "Citation Verifier (#251)", "/api/v2/assistant/research", "assistant.test.ts + catalog260.test.ts", "Numbered inline citations + NDKRS Authority backing", "0d (Complete)"],
  [35, "ChatGPT Parity (#1-#40)", "Memory", "Context management", "Preserve relevant details across long conversations", "P1", VO, ["src/lib/assistant/research-agent.server.ts"], "Sliding Window & Pinning", "/api/v2/assistant/research", "assistant.test.ts", "Pins project instructions + memory snippets + recent turns", "0d (Complete)"],
  [36, "ChatGPT Parity (#1-#40)", "Personalization", "Personalized assistance", "Adapt responses to user preferences", "P1", VO, ["src/lib/assistant/persistence.server.ts", "src/lib/noctis-custom-agents.ts"], "Preference & Profile Store", "/api/v2/assistant/memory", "assistant.test.ts", "Persists user preferences in enterprise.user_memory", "0d (Complete)"],
  [37, "ChatGPT Parity (#1-#40)", "Personalization", "Custom assistants", "Support specialized instructions and tools", "P1", VO, ["src/lib/assistant/persistence.server.ts", "src/lib/noctis-custom-agents.ts"], "Custom Assistant Builder", "/api/v2/assistant/custom-assistants", "assistant.test.ts", "SQL CRUD for domain specialists, prompts & allowed tools", "0d (Complete)"],
  [38, "ChatGPT Parity (#1-#40)", "Collaboration", "Collaborative workspaces", "Organize ongoing projects and documents", "P1", VO, ["src/lib/assistant/persistence.server.ts", "src/lib/discuss.server.ts"], "SQL Workspaces & Revisions", "/api/v2/assistant/workspaces", "assistant.test.ts", "Shared team projects & versioned document revisions in SQL", "0d (Complete)"],
  [39, "ChatGPT Parity (#1-#40)", "Orchestration", "Tool orchestration", "Select and combine tools to complete tasks", "P0", VO, ["src/lib/nups/orchestrator.server.ts", "src/lib/noctis-tool-orchestrator.ts"], "NUPS Multi-Tool Orchestrator", "/api/v2/nups/solve", "nups.test.ts", "5-stage planner & SQDEC conflict arbitrator", "0d (Complete)"],
  [40, "ChatGPT Parity (#1-#40)", "Safety", "Safety and permission controls", "Restrict unsafe, unauthorized, or unsupported actions", "P0", VO, ["src/lib/enterprise/independent-verification-engine.ts", "src/lib/enterprise/ai-agent-governance.ts"], "Gate 0 Fail-Closed & RBAC", "/api/v2/enterprise/verify", "enterprise.test.ts + assistant.test.ts", "Fail-closed gates, SSRF blocks, human approval enforcement", "0d (Complete)"],

  // ==================== 2. ADVANCED REASONING (#41-#50) ====================
  [41, "Advanced Reasoning (#41-#50)", "Reasoning", "Adaptive reasoning", "Allocate more computation to difficult questions", "P0", VO, ["src/lib/assistant/distinctive-moat.server.ts"], "Reasoning Budget Classifier", "/api/v2/assistant/reasoning/budget", "assistant.test.ts", "Dynamic tiering (FAST / STANDARD / DEEP / FORENSIC)", "0d (Complete)"],
  [42, "Advanced Reasoning (#41-#50)", "Reasoning", "Self-verification", "Check intermediate calculations and conclusions", "P0", VO, ["src/lib/enterprise/independent-verification-engine.ts", "src/lib/catalog260/dependability-suite.server.ts"], "Independent Verifier", "/api/v2/enterprise/verify", "enterprise.test.ts + catalog260.test.ts", "Gate 0 & deterministic formula cross-check", "0d (Complete)"],
  [43, "Advanced Reasoning (#41-#50)", "Reasoning", "Multi-model consensus", "Compare independent model outputs when useful", "P1", VO, ["src/lib/noctis-cross-domain-consensus.ts", "src/lib/nups/orchestrator.server.ts"], "Consensus Arbitrator", "/api/v2/nups/solve", "nups.test.ts", "Multi-expert & cross-model SQDEC arbitration", "0d (Complete)"],
  [44, "Advanced Reasoning (#41-#50)", "Reasoning", "Hypothesis testing", "Evaluate competing explanations", "P0", VO, ["src/lib/dod-ic/intel-tradecraft-fusion-engine.ts"], "ICD 203 ACH Falsification", "/api/v2/dod-ic/status", "intel-tradecraft.test.ts", "Structured ACH inconsistency weighting", "0d (Complete)"],
  [45, "Advanced Reasoning (#41-#50)", "Reasoning", "Uncertainty estimation", "Distinguish facts, estimates, and unknowns", "P0", VO, ["src/lib/catalog260/dependability-suite.server.ts"], "Epistemic Confidence (#254)", "/api/v2/catalog/dependability/run", "catalog260.test.ts", "Fact / Inference / Hypothesis / Unknown classifier + CI", "0d (Complete)"],
  [46, "Advanced Reasoning (#41-#50)", "Reasoning", "Contradiction detection", "Identify conflicting information across sources", "P0", VO, ["src/lib/catalog260/dependability-suite.server.ts"], "Contradiction Detector (#253)", "/api/v2/catalog/dependability/run", "catalog260.test.ts", "Normative & same-unit numeric conflict scanner", "0d (Complete)"],
  [47, "Advanced Reasoning (#41-#50)", "Reasoning", "Causal reasoning", "Distinguish correlation from causation", "P1", VO, ["src/lib/assistant/distinctive-moat.server.ts"], "Causal Bradford Hill Engine", "/api/v2/assistant/reasoning/causal", "assistant.test.ts", "Flags confounders, reverse causality & correlation traps", "0d (Complete)"],
  [48, "Advanced Reasoning (#41-#50)", "Reasoning", "Temporal reasoning", "Understand changing facts and event sequences", "P0", VO, ["src/lib/catalog260/dependability-suite.server.ts"], "Temporal Intelligence (#252)", "/api/v2/catalog/dependability/run", "catalog260.test.ts", "Ordered ISO timeline & historical vs acute isolation", "0d (Complete)"],
  [49, "Advanced Reasoning (#41-#50)", "Reasoning", "Counterfactual analysis", "Evaluate what-if scenarios", "P1", VO, ["src/lib/assistant/distinctive-moat.server.ts"], "What-If Simulation Engine", "/api/v2/assistant/reasoning/counterfactual", "assistant.test.ts", "Quantitative sensitivity & delta impact modeling", "0d (Complete)"],
  [50, "Advanced Reasoning (#41-#50)", "Reasoning", "Planning and optimization", "Develop and evaluate alternative solutions", "P1", VO, ["src/lib/assistant/distinctive-moat.server.ts", "src/lib/nups/deterministic-domain-solvers.ts"], "Multi-Criteria Plan Optimizer", "/api/v2/assistant/reasoning/optimize", "assistant.test.ts", "Weighted Pareto tradeoff scoring across options", "0d (Complete)"],

  // ==================== 3. ADVANCED RESEARCH (#51-#60) ====================
  [51, "Advanced Research (#51-#60)", "Research", "Autonomous literature reviews", "Analyze multiple research publications", "P2", VO, ["src/lib/assistant/research-agent.server.ts"], "Literature Review Engine", "/api/v2/assistant/research", "assistant.test.ts", "Multi-source synthesis with limitations & themes", "0d (Complete)"],
  [52, "Advanced Research (#51-#60)", "Research", "Research source ranking", "Evaluate authority, relevance, and freshness", "P0", VO, ["src/lib/assistant/research-agent.server.ts"], "Authority & Freshness Ranker", "/api/v2/assistant/research", "assistant.test.ts", "Scores Tier-1 Gov/Peer-Reviewed vs secondary web", "0d (Complete)"],
  [53, "Advanced Research (#51-#60)", "Research", "Citation verification", "Confirm cited sources support claims", "P0", VO, ["src/lib/assistant/research-agent.server.ts", "src/lib/catalog260/dependability-suite.server.ts"], "Citation Entailment Verifier", "/api/v2/assistant/research", "assistant.test.ts", "Cross-checks claims against NDKRS & fetched passages", "0d (Complete)"],
  [54, "Advanced Research (#51-#60)", "Research", "Research contradiction analysis", "Compare conflicting studies and reports", "P1", VO, ["src/lib/assistant/document-studio.server.ts", "src/lib/catalog260/dependability-suite.server.ts"], "Study Conflict Comparator", "/api/v2/assistant/documents/compare", "assistant.test.ts", "Highlights contradictory outcomes & metrics", "0d (Complete)"],
  [55, "Advanced Research (#51-#60)", "Research", "Academic paper analysis", "Extract methods, results, and limitations", "P1", VO, ["src/lib/assistant/research-agent.server.ts"], "Structured Paper Extractor", "/api/v2/assistant/research/paper", "assistant.test.ts", "Extracts Hypothesis, Methods, Results, Limitations", "0d (Complete)"],
  [56, "Advanced Research (#51-#60)", "Research", "Patent research", "Analyze public patents and related inventions", "P2", VO, ["src/lib/assistant/research-agent.server.ts"], "Patent Claim & CPC Analyzer", "/api/v2/assistant/research/patent", "assistant.test.ts", "Extracts independent claims, CPC focus & prior-art search plan", "0d (Complete)"],
  [57, "Advanced Research (#51-#60)", "Research", "Standards comparison", "Compare different technical and regulatory standards", "P1", VO, ["src/lib/assistant/research-agent.server.ts", "src/lib/dod-ic/policy-change-engine.server.ts"], "Standards Diff Engine", "/api/v2/assistant/research/standards", "assistant.test.ts + policy-change.test.ts", "Crosswalks NIST, ISO, DoDI, ICD & HIPAA requirements", "0d (Complete)"],
  [58, "Advanced Research (#51-#60)", "Knowledge", "Evidence synthesis", "Combine findings without losing provenance", "P0", VO, ["src/lib/enterprise/evidence-chain-of-custody.ts", "src/lib/assistant/research-agent.server.ts"], "SHA-256 Provenance Synthesis", "/api/v2/assistant/research", "enterprise.test.ts + assistant.test.ts", "Preserves source URI, SHA-256 hash & trust tier", "0d (Complete)"],
  [59, "Advanced Research (#51-#60)", "Collaboration", "Research notebooks", "Preserve calculations, sources, and research history", "P1", VO, ["src/lib/assistant/persistence.server.ts"], "SQL Research Notebooks", "/api/v2/assistant/workspaces/documents", "assistant.test.ts", "Persisted markdown/notebook documents with revision SHA-256", "0d (Complete)"],
  [60, "Advanced Research (#51-#60)", "Productivity", "Continuous research monitoring", "Track selected sources for important updates", "P1", VO, ["src/lib/assistant/persistence.server.ts", "src/lib/catalog260/dependability-suite.server.ts"], "Scheduled Source Watch", "/api/v2/assistant/schedules", "assistant.test.ts + catalog260.test.ts", "Recurring scheduled checks + Freshness Monitor (#256)", "0d (Complete)"],

  // ==================== 4. ADVANCED CODING (#61-#70) ====================
  [61, "Advanced Coding (#61-#70)", "Software", "Autonomous repository maintenance", "Identify and propose code improvements", "P1", VO, ["src/lib/assistant/coding-agent.server.ts"], "Repo Maintenance Scanner", "/api/v2/assistant/code/analyze-repo", "assistant.test.ts", "Detects TODOs, large modules & hygiene opportunities", "0d (Complete)"],
  [62, "Advanced Coding (#61-#70)", "Software", "Multi-file code editing", "Make coordinated changes across a project", "P0", VO, ["src/lib/assistant/coding-agent.server.ts", "src/lib/noctis-git-remediator.server.ts"], "Multi-File PR Bundle", "/api/v2/assistant/code/propose-pr", "assistant.test.ts", "Generates multi-file unified patches gated by approval", "0d (Complete)"],
  [63, "Advanced Coding (#61-#70)", "Software", "Test generation", "Produce unit, integration, and regression tests", "P0", VO, ["src/lib/assistant/coding-agent.server.ts"], "Test Scaffold Generator", "/api/v2/assistant/code/generate-tests", "assistant.test.ts", "Generates node:test unit & regression test skeletons", "0d (Complete)"],
  [64, "Advanced Coding (#61-#70)", "Software", "Automated debugging", "Reproduce and diagnose software failures", "P0", VO, ["src/lib/assistant/coding-agent.server.ts"], "Stack Trace Root-Cause Engine", "/api/v2/assistant/code/debug", "assistant.test.ts", "Parses error codes, frames & suggests exact fixes", "0d (Complete)"],
  [65, "Advanced Coding (#61-#70)", "Software", "Architecture analysis", "Map components and dependencies", "P1", VO, ["src/lib/assistant/coding-agent.server.ts"], "Dependency & Layer Mapper", "/api/v2/assistant/code/analyze-repo", "assistant.test.ts", "Inventories routes, server modules, UI components & imports", "0d (Complete)"],
  [66, "Advanced Coding (#61-#70)", "Software", "Database migration generation", "Create safe, reversible migrations", "P1", VO, ["src/lib/assistant/coding-agent.server.ts"], "Reversible DDL Generator", "/api/v2/assistant/code/generate-migration", "assistant.test.ts", "Emits idempotent UP + DOWN SQL & blocks unsafe drops", "0d (Complete)"],
  [67, "Advanced Coding (#61-#70)", "Software", "Performance profiling", "Identify application bottlenecks", "P1", VO, ["src/lib/assistant/coding-agent.server.ts"], "Complexity & N+1 Profiler", "/api/v2/assistant/code/profile", "assistant.test.ts", "Flags nested loop O(n^2), await-in-loop & unbounded queries", "0d (Complete)"],
  [68, "Advanced Coding (#61-#70)", "Safety", "Security code review", "Detect vulnerable patterns and insecure dependencies", "P0", VO, ["src/lib/noctis-sast-engine.ts", "src/lib/assistant/coding-agent.server.ts"], "XTRIKE SAST Code Reviewer", "/api/v2/assistant/code/propose-pr", "assistant.test.ts", "Detects eval/SQLi/XSS/hardcoded secrets pre-PR", "0d (Complete)"],
  [69, "Advanced Coding (#61-#70)", "Software", "CI/CD assistance", "Configure and troubleshoot build pipelines", "P1", VO, ["src/lib/assistant/coding-agent.server.ts"], "CI/CD Workflow Linter", "/api/v2/assistant/code/cicd", "assistant.test.ts", "Audits GitHub Actions/Vercel steps for secret leaks & gates", "0d (Complete)"],
  [70, "Advanced Coding (#61-#70)", "Software", "Deployment verification", "Validate releases, monitor health, and support rollback", "P1", VO, ["src/lib/assistant/coding-agent.server.ts", "src/lib/catalog260/persistence.server.ts"], "Release & Rollback Verifier", "/api/v2/assistant/code/verify-deploy", "assistant.test.ts", "Validates live /api/v1/health & triggers canary rollback gate", "0d (Complete)"],

  // ==================== 5. PERSONAL ASSISTANT & PRODUCTIVITY (#71-#80) ====================
  [71, "Personal Assistant (#71-#80)", "Productivity", "Proactive task assistance", "Suggest next steps based on approved project context", "P1", VO, ["src/lib/assistant/connectors-and-workflows.server.ts"], "Context Next-Step Planner", "/api/v2/assistant/productivity/next-steps", "assistant.test.ts", "Generates prioritized action list from SQL workspace & runs", "0d (Complete)"],
  [72, "Personal Assistant (#71-#80)", "Productivity", "Scheduled monitoring", "Check for relevant future events or changes", "P1", VO, ["src/lib/assistant/persistence.server.ts", "src/lib/catalog260/dependability-suite.server.ts"], "Scheduled Watch Runner", "/api/v2/assistant/schedules", "assistant.test.ts", "Runs policy drift, source expiry & reminder schedules", "0d (Complete)"],
  [73, "Personal Assistant (#71-#80)", "Productivity", "Meeting preparation", "Compile agendas, background information, and questions", "P1", VO, ["src/lib/assistant/connectors-and-workflows.server.ts"], "Meeting Brief Builder", "/api/v2/assistant/productivity/meeting-prep", "assistant.test.ts", "Compiles structured agenda, risks & NDKRS background brief", "0d (Complete)"],
  [74, "Personal Assistant (#71-#80)", "Productivity", "Meeting summaries", "Extract decisions, action items, and owners", "P1", VO, ["src/lib/assistant/connectors-and-workflows.server.ts"], "Action-Item Extractor", "/api/v2/assistant/productivity/meeting-summary", "assistant.test.ts", "Parses decisions, owners, due dates & blockers", "0d (Complete)"],
  [75, "Personal Assistant (#71-#80)", "Productivity", "Email intelligence", "Organize, summarize, draft, and assist with responses", "P1", VO, ["src/lib/assistant/connectors-and-workflows.server.ts", "src/lib/noctis-gmail-connector.ts"], "Email Thread Triager", "/api/v2/assistant/connectors/email", "assistant.test.ts", "Categorizes urgency, drafts reply & exports RFC .eml", "0d (Complete)"],
  [76, "Personal Assistant (#71-#80)", "Productivity", "Calendar coordination", "Identify scheduling conflicts and propose meeting times", "P1", VO, ["src/lib/assistant/connectors-and-workflows.server.ts"], "Conflict & Slot Optimizer", "/api/v2/assistant/connectors/calendar", "assistant.test.ts", "Detects overlap with scheduled tasks & emits RFC .ics", "0d (Complete)"],
  [77, "Personal Assistant (#71-#80)", "Knowledge", "Personal knowledge organization", "Organize notes, documents, and projects", "P1", VO, ["src/lib/assistant/persistence.server.ts"], "Workspace Vault Organizer", "/api/v2/assistant/workspaces", "assistant.test.ts", "Folders, tags & SHA-256 versioned notes in PostgreSQL", "0d (Complete)"],
  [78, "Personal Assistant (#71-#80)", "Autonomy", "Workflow continuity", "Resume previously approved tasks", "P1", VO, ["src/lib/assistant/connectors-and-workflows.server.ts", "src/lib/assistant/persistence.server.ts"], "Durable Checkpoint Resume", "/api/v2/assistant/workflows", "assistant.test.ts", "Resumes PAUSED/APPROVED workflows from step checkpoint", "0d (Complete)"],
  [79, "Personal Assistant (#71-#80)", "Productivity", "Goal and milestone tracking", "Monitor progress against objectives", "P1", VO, ["src/lib/catalog260/gap-closure-solvers.ts", "src/lib/assistant/connectors-and-workflows.server.ts"], "EVM & Milestone Tracker", "/api/v2/catalog/solve", "catalog260.test.ts + assistant.test.ts", "PMI CPI/SPI milestone health + workspace goal tracking", "0d (Complete)"],
  [80, "Personal Assistant (#71-#80)", "Apps", "Cross-application workflows", "Coordinate work through authorized integrations", "P2", VO, ["src/lib/assistant/connectors-and-workflows.server.ts"], "Cross-App Orchestrator", "/api/v2/assistant/workflows", "assistant.test.ts", "Coordinates research -> doc -> calendar/email/GitHub draft", "0d (Complete)"],

  // ==================== 6. MULTIMODAL & INTERFACE (#81-#90) ====================
  [81, "Multimodal & Interface (#81-#90)", "Voice", "Real-time voice interruption", "Support natural back-and-forth spoken conversations", "P2", VO, ["src/lib/noctis-voice.ts", "src/lib/noctis-voice-resuscitation.ts"], "Barge-In Voice Controller", "/api/v2/assistant/voice/speak", "noctis-voice-resuscitation.test.ts", "speechSynthesis.cancel() immediate barge-in interruption", "0d (Complete)"],
  [82, "Multimodal & Interface (#81-#90)", "Voice", "Voice language switching", "Handle multilingual conversations", "P2", VO, ["src/lib/noctis-voice.ts", "src/lib/assistant/connectors-and-workflows.server.ts"], "Multi-Locale Voice Personas", "/api/v2/assistant/translate", "assistant.test.ts", "10+ language codes & regional voice personas", "0d (Complete)"],
  [83, "Multimodal & Interface (#81-#90)", "Voice", "Audio document analysis", "Summarize interviews, lectures, and recordings", "P2", VO, ["src/lib/assistant/connectors-and-workflows.server.ts"], "Audio Transcript Summarizer", "/api/v2/assistant/voice/transcribe", "assistant.test.ts", "Speaker turn segmentation, key quotes & action summary", "0d (Complete)"],
  [84, "Multimodal & Interface (#81-#90)", "Vision", "Video scene understanding", "Analyze uploaded video content", "P2", VO, ["src/lib/video-mind.server.ts"], "Video Intelligence Route", "/api/video", "assistant.test.ts", "Keyframe timeline, scene breakdown & audio summary", "0d (Complete)"],
  [85, "Multimodal & Interface (#81-#90)", "Vision", "Visual troubleshooting", "Explain errors from screenshots and diagrams", "P2", VO, ["src/lib/assistant/connectors-and-workflows.server.ts", "src/components/noctis/NoctisUniversalAssistantTab.tsx"], "Screenshot & Error Troubleshooter", "/api/v2/assistant/vision/analyze", "assistant.test.ts", "Extracts error codes/stack hints & inspects dimensions/format", "0d (Complete)"],
  [86, "Multimodal & Interface (#81-#90)", "Analytics", "Interactive simulations", "Let users adjust variables and explore results", "P1", VO, ["src/lib/assistant/distinctive-moat.server.ts", "src/components/noctis/NoctisUniversalAssistantTab.tsx"], "Counterfactual Simulator UI", "/api/v2/assistant/reasoning/counterfactual", "assistant.test.ts", "Interactive parameter sliders with real-time delta charts", "0d (Complete)"],
  [87, "Multimodal & Interface (#81-#90)", "Analytics", "Interactive dashboards", "Present live or uploaded data visually", "P1", VO, ["src/lib/assistant/data-analysis-studio.server.ts", "src/components/noctis/NoctisUniversalAssistantTab.tsx"], "SVG Chart & KPI Dashboard", "/api/v2/assistant/data/analyze", "assistant.test.ts", "Dynamic charts, outlier table & GeoJSON route map", "0d (Complete)"],
  [88, "Multimodal & Interface (#81-#90)", "Collaboration", "Structured document editing", "Revise documents without losing formatting", "P1", VO, ["src/lib/assistant/document-studio.server.ts"], "Format-Preserving Section Editor", "/api/v2/assistant/documents/edit-section", "assistant.test.ts", "Targets named headings/sections in place before re-export", "0d (Complete)"],
  [89, "Multimodal & Interface (#81-#90)", "Personalization", "Accessibility personalization", "Adapt interfaces for different user needs", "P1", VO, ["src/lib/catalog260/gap-closure-solvers.ts", "src/components/noctis/NoctisUniversalAssistantTab.tsx"], "WCAG 2.2 Contrast & A11y Modes", "/api/v2/catalog/solve", "catalog260.test.ts + assistant.test.ts", "High-contrast, large-font & WCAG contrast auditor", "0d (Complete)"],
  [90, "Multimodal & Interface (#81-#90)", "Personalization", "Mobile and desktop continuity", "Synchronize authorized work across devices", "P1", VO, ["src/lib/db.ts", "src/lib/assistant/persistence.server.ts"], "Neon Cloud Session Sync", "/api/v2/assistant/status", "assistant.test.ts", "PostgreSQL workspaces, memory & notebooks synced live", "0d (Complete)"],

  // ==================== 7. TEN DISTINCTIVE NOCTIS CAPABILITIES (#91-#100) ====================
  [91, "Noctis Distinctive Moat (#91-#100)", "Safety & Provenance", "Noctis Answer Passport", "Attach source versions, calculation traces, confidence limitations & verification results", "P0", VO, ["src/lib/assistant/distinctive-moat.server.ts", "src/lib/assistant/persistence.server.ts"], "Answer Passport Issuer", "/api/v2/assistant/moat/passport", "assistant.test.ts", "Persists cryptographic replay_sha256 & source versions in SQL", "0d (Complete)"],
  [92, "Noctis Distinctive Moat (#91-#100)", "Knowledge", "Noctis Knowledge Gap Detector", "Identify questions that cannot be answered reliably and queue them for research and review", "P0", VO, ["src/lib/assistant/distinctive-moat.server.ts", "src/lib/ndkrs/persistence.server.ts"], "Gap Detector & Queue", "/api/v2/assistant/moat/knowledge-gap", "assistant.test.ts + ndkrs.test.ts", "Detects thin NDKRS coverage & logs ndkrs.knowledge_gaps", "0d (Complete)"],
  [93, "Noctis Distinctive Moat (#91-#100)", "Safety & Provenance", "Noctis Deterministic Replay", "Reproduce a previous answer using the same inputs, rules, model version, and evidence", "P0", VO, ["src/lib/assistant/distinctive-moat.server.ts"], "Deterministic Replay Verifier", "/api/v2/assistant/moat/replay", "assistant.test.ts", "Recomputes & verifies exact replay_sha256 determinism", "0d (Complete)"],
  [94, "Noctis Distinctive Moat (#91-#100)", "Quality", "Noctis Failure-to-Fix Pipeline", "Convert verified model failures into regression tests and engineering tickets", "P0", VO, ["src/lib/assistant/distinctive-moat.server.ts", "src/lib/catalog260/dependability-suite.server.ts"], "Failure-to-Fix Factory", "/api/v2/assistant/moat/failure-to-fix", "assistant.test.ts + catalog260.test.ts", "Creates SQL dynamic_regression_test + Git PR ticket package", "0d (Complete)"],
  [95, "Noctis Distinctive Moat (#91-#100)", "Knowledge", "Noctis Source Conflict Resolver", "Show conflicting authorities and explain which applies to a particular context", "P0", VO, ["src/lib/assistant/distinctive-moat.server.ts"], "Jurisdiction Hierarchy Resolver", "/api/v2/assistant/moat/resolve-conflict", "assistant.test.ts", "Resolves Statutory > Reg > Guidance & SQDEC Safety priority", "0d (Complete)"],
  [96, "Noctis Distinctive Moat (#91-#100)", "Safety", "Noctis Domain Certification Gates", "Require domain-specific evaluation before enabling new clinical, legal, or government capabilities", "P0", VO, ["src/lib/assistant/distinctive-moat.server.ts", "src/lib/enterprise/ai-evaluation-lab.ts"], "Certification Gatekeeper", "/api/v2/assistant/moat/certification-gate", "assistant.test.ts + enterprise.test.ts", "Fails closed unless domain suite & safety checks = 100%", "0d (Complete)"],
  [97, "Noctis Distinctive Moat (#91-#100)", "Safety & Autonomy", "Noctis Secure Execution Passport", "Record tool permissions, approvals, actions, and rollback information for agent workflows", "P0", VO, ["src/lib/assistant/distinctive-moat.server.ts", "src/lib/enterprise/ai-agent-governance.ts"], "Execution Passport Signer", "/api/v2/assistant/moat/execution-passport", "assistant.test.ts", "Binds actor RBAC, approver, steps & rollback plan per run", "0d (Complete)"],
  [98, "Noctis Distinctive Moat (#91-#100)", "Knowledge", "Noctis Knowledge Freshness Engine", "Detect policy, scientific, and technical source updates that may invalidate existing answers", "P0", VO, ["src/lib/assistant/distinctive-moat.server.ts", "src/lib/catalog260/dependability-suite.server.ts"], "Freshness Invalidation Engine", "/api/v2/assistant/moat/freshness-check", "assistant.test.ts + catalog260.test.ts", "Flags expired NDKRS citations & policy drift against passports", "0d (Complete)"],
  [99, "Noctis Distinctive Moat (#91-#100)", "Orchestration", "Noctis Cross-Domain Reasoning", "Coordinate multiple expert engines while preserving their separate evidence and safety requirements", "P0", VO, ["src/lib/nups/orchestrator.server.ts", "src/lib/noctis-cross-domain-consensus.ts"], "NUPS Multi-Domain Bridge", "/api/v2/nups/solve", "nups.test.ts", "Strict per-domain evidence boundaries + SQDEC arbitration", "0d (Complete)"],
  [100, "Noctis Distinctive Moat (#91-#100)", "Quality", "Noctis Model Quality Observatory", "Track accuracy, latency, cost, citation validity, hallucination rates, and safety failures over time", "P0", VO, ["src/lib/assistant/distinctive-moat.server.ts", "src/lib/enterprise/persistence.server.ts"], "Telemetry Observatory", "/api/v2/assistant/moat/observatory", "assistant.test.ts", "Aggregates live SQL evals, benchmark scores, latencies & blocks", "0d (Complete)"],
]);

export function filterParityMatrix(opts: {
  status?: string;
  priority?: string;
  group?: string;
  search?: string;
} = {}): ParityCapabilityItem[] {
  const st = (opts.status || "ALL").toUpperCase();
  const pr = (opts.priority || "ALL").toUpperCase();
  const gr = opts.group || "ALL";
  const q = (opts.search || "").trim().toLowerCase();

  return NOCTIS_100_CAPABILITY_PARITY_MATRIX.filter((item) => {
    if (st !== "ALL" && item.status !== st) return false;
    if (pr !== "ALL" && item.priority !== pr) return false;
    if (gr !== "ALL" && item.group !== gr) return false;
    if (q) {
      const hay = `${item.capabilityNumber} ${item.group} ${item.category} ${item.name} ${item.requirement} ${item.sourceModules.join(" ")} ${item.demoNote}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function getParityMatrixSummary() {
  const counts: Record<ParityAuditStatus, number> = {
    VERIFIED_OPERATIONAL: 0,
    IMPLEMENTED_NOT_TESTED: 0,
    PARTIALLY_IMPLEMENTED: 0,
    NOT_IMPLEMENTED: 0,
    UNKNOWN: 0,
  };
  for (const item of NOCTIS_100_CAPABILITY_PARITY_MATRIX) {
    counts[item.status] += 1;
  }

  const byPriority: Record<ParityPriority, { total: number; verifiedOperational: number; partial: number }> = {
    P0: { total: 0, verifiedOperational: 0, partial: 0 },
    P1: { total: 0, verifiedOperational: 0, partial: 0 },
    P2: { total: 0, verifiedOperational: 0, partial: 0 },
  };
  for (const item of NOCTIS_100_CAPABILITY_PARITY_MATRIX) {
    byPriority[item.priority].total += 1;
    if (item.status === "VERIFIED_OPERATIONAL") byPriority[item.priority].verifiedOperational += 1;
    if (item.status === "PARTIALLY_IMPLEMENTED") byPriority[item.priority].partial += 1;
  }

  return {
    totalCapabilities: NOCTIS_100_CAPABILITY_PARITY_MATRIX.length,
    chatgptBaseline40: {
      total: 40,
      verifiedOperational: NOCTIS_100_CAPABILITY_PARITY_MATRIX.slice(0, 40).filter((i) => i.status === "VERIFIED_OPERATIONAL").length,
      partiallyImplemented: NOCTIS_100_CAPABILITY_PARITY_MATRIX.slice(0, 40).filter((i) => i.status === "PARTIALLY_IMPLEMENTED").length,
    },
    countsByStatus: counts,
    byPriority,
    studiosCount: FIVE_ADVANCED_STUDIOS.length,
    additionalCategoriesCount: ADDITIONAL_12_CATEGORIES.length,
  };
}

export function renderParityMatrixMarkdown(): string {
  const s = getParityMatrixSummary();
  return [
    "# ChatGPT vs. Noctis — 100-Capability Feature Parity Matrix & Development Estimate",
    `- **Total Audited Capabilities:** **${s.totalCapabilities}** (\`#1–#40\` ChatGPT Parity · \`#41–#90\` Advanced Platform · \`#91–#100\` Noctis Distinctive Moat)`,
    `- **Statuses:** \`VERIFIED_OPERATIONAL\`: **${s.countsByStatus.VERIFIED_OPERATIONAL}** · \`IMPLEMENTED_NOT_TESTED\`: **${s.countsByStatus.IMPLEMENTED_NOT_TESTED}** · \`PARTIALLY_IMPLEMENTED\`: **${s.countsByStatus.PARTIALLY_IMPLEMENTED}** (\`#28\`, \`#29\`) · \`NOT_IMPLEMENTED\`: **${s.countsByStatus.NOT_IMPLEMENTED}** · \`UNKNOWN\`: **${s.countsByStatus.UNKNOWN}**`,
    "",
    "## Priority Breakdown",
    `- **P0 Critical:** ${s.byPriority.P0.verifiedOperational}/${s.byPriority.P0.total} \`VERIFIED_OPERATIONAL\``,
    `- **P1 Core Productivity:** ${s.byPriority.P1.verifiedOperational}/${s.byPriority.P1.total} \`VERIFIED_OPERATIONAL\``,
    `- **P2 Multimodal & Autonomy:** ${s.byPriority.P2.verifiedOperational}/${s.byPriority.P2.total} \`VERIFIED_OPERATIONAL\`, ${s.byPriority.P2.partial} \`PARTIALLY_IMPLEMENTED\``,
    "",
    "| # | Priority | Capability | Status | Backend & Endpoint | Dev Estimate |",
    "| :---: | :---: | :--- | :---: | :--- | :--- |",
    ...NOCTIS_100_CAPABILITY_PARITY_MATRIX.map(
      (i) => `| #${i.capabilityNumber} | ${i.priority} | **${i.name}** | \`${i.status}\` | \`${i.apiEndpoint}\` | ${i.devEstimate} |`,
    ),
  ].join("\n");
}
