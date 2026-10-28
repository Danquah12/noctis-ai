export interface SastRepoFileEntry {
  path: string;
  layer: "App Route" | "Engine Core" | "UI Component" | "Data & Benchmarks" | "Types & Schema";
  summary: string;
  keyExports: string[];
}

export interface SastRuleSummary {
  ruleId: string;
  pluginRange: string;
  cwe: string;
  title: string;
  languages: string[];
  severity: "Critical" | "High" | "Medium" | "Low";
  cvss: number;
  mitre: string;
  defaultProofState: string;
  sourcePattern: string;
  sinkPattern: string;
  sanitizerGuard: string;
  remediationPattern: string;
}

export const XTRIKE_SAST_PLATFORM_METADATA = {
  platformId: "PLATFORM-05-SAST",
  name: "XTRIKE SAST Desk — Proof-Driven Static Application Security Testing & Hybrid AST Engine",
  productionUrl: "https://05-sast-platform.vercel.app",
  noctisBrainUrl: "https://dstrike.app/noctis",
  githubRepo: "https://github.com/Danquah12/expedite-consults/tree/main/platforms/05-sast-platform",
  engines: [
    {
      id: "ENG-XQL",
      name: "XTRIKE XQL",
      role: "AST Query & Best-Fix-Location (BFL) Dominance Engine",
      description: "Executes structural AST queries across 8 languages and pinpoints the Best Fix Location (BFL) along the call graph.",
    },
    {
      id: "ENG-DEEPFLOW",
      name: "XTRIKE DeepFlow",
      role: "Intra/Inter-Procedural SSA Taint & Dataflow Engine",
      description: "Traces untrusted sources (HTTP parameters, headers, body, CLI args) through variable assignments and string builders into sensitive execution sinks.",
    },
    {
      id: "ENG-STRUCTSCA",
      name: "XTRIKE StructSCA",
      role: "7-Kingdom Structural & Configuration Analyzer",
      description: "Classifies weaknesses into Input Validation & Representation, API Abuse, Security Features, Time & State, Errors, Code Quality, and Encapsulation.",
    },
    {
      id: "ENG-ASTQUERY",
      name: "XTRIKE AST-Query / PatternGuard",
      role: "401-Plugin Multi-Standard Token-Indexed Dispatcher",
      description: "Single-pass token-indexed rule dispatcher enforcing language-strict matching across OWASP Top 10, ASVS v4.0.3, CWE Top 25, NIST 800-53, PCI DSS v4.0, ISO 27001, and SEI CERT.",
    },
  ],
  canonicalProofStates: [
    {
      state: "PROVEN_EXPLOITABLE",
      meaning: "Controlled runtime sandbox replay executed and verified behavioral impact (e.g., SQL AST structure change or command execution).",
      releaseGateImpact: "BLOCKS RELEASE GATE (Immediate P0)",
    },
    {
      state: "DATAFLOW_CONFIRMED",
      meaning: "Static AST & dataflow analysis confirmed an unbroken source-to-sink taint path with 0 sanitizers in scope, but live runtime sandbox execution has not been run (Runtime: NOT_RUN).",
      releaseGateImpact: "BLOCKS RELEASE GATE (Requires Parameterization/Sanitizer or Runtime Retest)",
    },
    {
      state: "DETECTED_STATIC",
      meaning: "Dangerous API, cryptographic weakness (MD5/SHA-1/ECB/weak PRNG), or partial taint path identified statically; exploitability depends on surrounding configuration or downstream sinks.",
      releaseGateImpact: "WARNING / REVIEW REQUIRED",
    },
    {
      state: "NEEDS_MANUAL_VALIDATION",
      meaning: "Sink API identified (such as JavaCompiler.getTask(...) in BlindScript.java or a candidate hardcoded secret), but untrusted input flow, task.call() execution, or live production scope is not established by the excerpt.",
      releaseGateImpact: "MANUAL TRIAGE REQUIRED (Never overstated as proven RCE)",
    },
    {
      state: "MITIGATED_BY_GUARD",
      meaning: "Upstream parameterization (PreparedStatement.setString), strict allowlist, canonical path check, or sanitizer neutralized the taint flow.",
      releaseGateImpact: "PASSES RELEASE GATE",
    },
  ],
  sixStageValidationPipeline: [
    "1. Preflight Gate: Lock deterministic repository commit SHA, file hash, and language parser.",
    "2. Static Assessment (XTRIKE XQL + StructSCA): Identify candidate AST sources, sinks, and structural kingdoms.",
    "3. Taint-Flow Plan (XTRIKE DeepFlow): Select CWE-specific validator and trace intra/inter-procedural call graph.",
    "4. Control & Sanitizer Evaluation: Check for PreparedStatement binding, ObjectInputFilter (JEP 290), -proc:none, or canonical path guards.",
    "5. Canonical Proof State Assignment: Distinguish static detection (DATAFLOW_CONFIRMED / DETECTED_STATIC / NEEDS_MANUAL_VALIDATION) from runtime proof (PROVEN_EXPLOITABLE).",
    "6. Mitigation Retest & Release Gate Synthesis: Apply language-matched remediation diff and replay deterministic test case (e.g., TC-SQLI-089-001 or TC-CODEI-094-001).",
  ],
};

export const XTRIKE_SAST_REPOSITORY_FILES: SastRepoFileEntry[] = [
  {
    path: "app/page.tsx",
    layer: "App Route",
    summary: "Front Desk (P05) landing page with live KPIs, 4-engine overview, compliance mapping, and quick-launch scan bar.",
    keyExports: ["HomePage"],
  },
  {
    path: "app/scan/page.tsx",
    layer: "App Route",
    summary: "Interactive Scan Workspace supporting live GitHub URL scanning, 82 pre-integrated SAST/DAST vulnerable benchmark repositories, custom code paste scanning, and automatic state clearing before every new scan.",
    keyExports: ["ScanPage"],
  },
  {
    path: "app/api/scan/route.ts",
    layer: "App Route",
    summary: "Serverless scan endpoint that fetches live repository trees and source files from GitHub API (with benchmark seed fallback) and executes the 4-engine SAST & 6-stage validation pipeline.",
    keyExports: ["POST", "GET"],
  },
  {
    path: "app/api/noctis/route.ts",
    layer: "App Route",
    summary: "Bridge endpoint connecting the XTRIKE SAST Platform ('Ask Noctis') directly to the Noctis AI brain at https://dstrike.app/api/noctis with full SAST repository & active finding telemetry.",
    keyExports: ["POST", "GET"],
  },
  {
    path: "app/validation-engine/page.tsx",
    layer: "App Route",
    summary: "6-Stage Proof-Driven Finding Validation Workbench displaying the 6-Point Proof Contract, SARIF traces, and 12-Test Audit Acceptance Suite (AT-01 through AT-12).",
    keyExports: ["ValidationEnginePage"],
  },
  {
    path: "app/dashboard/page.tsx",
    layer: "App Route",
    summary: "Split-screen Triage Desk with severity/CWE/proof-state filtering, risk gauges, and deduplicated sink clusters.",
    keyExports: ["DashboardPage"],
  },
  {
    path: "app/finding/[id]/page.tsx",
    layer: "App Route",
    summary: "Comprehensive Finding Detail Dossier containing FindingHeader, EvidencePanel, AttackPath, ExploitabilityScore, DeepExploitabilityPanel, ChallengeAgent, DiffRemediation, and ComplianceMapping.",
    keyExports: ["FindingDetailPage"],
  },
  {
    path: "app/reports/page.tsx",
    layer: "App Route",
    summary: "Audit-ready PDF/Print Report Engine with truthful Release Gate status, Canonical Proof State breakdown, and compliance matrices.",
    keyExports: ["ReportsPage"],
  },
  {
    path: "app/fusion-engine/page.tsx",
    layer: "App Route",
    summary: "4-Engine Hybrid AST & Dataflow Fusion console correlating XTRIKE XQL, DeepFlow, StructSCA, and AST-Query.",
    keyExports: ["FusionEnginePage"],
  },
  {
    path: "app/taint-graph/page.tsx",
    layer: "App Route",
    summary: "Interactive Source -> Propagation -> Sanitizer Gate -> Sink Taint Graph visualizer.",
    keyExports: ["TaintGraphPage"],
  },
  {
    path: "app/ai-bom/page.tsx",
    layer: "App Route",
    summary: "AI Bill of Materials (AI-BOM) & LLM supply-chain security inspector.",
    keyExports: ["AiBomPage"],
  },
  {
    path: "app/developer-assist/page.tsx",
    layer: "App Route",
    summary: "Ask Noctis Developer Assist & 1-Click Automated Remediation Pull Request Generator.",
    keyExports: ["DeveloperAssistPage"],
  },
  {
    path: "lib/enterprise-sast-engine.ts",
    layer: "Engine Core",
    summary: "Core multi-language AST & taint analysis engine implementing 15 primary CWE rules, language-strict 401-plugin dispatch (pluginSupportsLanguage), constant-literal output suppression (AT-05), function+CWE deduplication (AT-12), and 6-Stage Java Dynamic Compilation analysis (AT-PLG046-01 to 08).",
    keyExports: [
      "ENTERPRISE_SAST_RULES",
      "scanFilesWithEnterpriseEngines",
      "deriveFindingAuditMetadata",
      "pluginSupportsLanguage",
      "isConstantLiteralOutputCall",
    ],
  },
  {
    path: "lib/sast-400-plugins.ts",
    layer: "Engine Core",
    summary: "401 specialized SAST detection plugins mapped to OWASP Top 10, ASVS v4.0.3, NIST 800-53, PCI DSS v4.0, ISO 27001:2022, and CERT standards, including PLG-046 (CODEI-PY-EXEC for Python) and PLG-054 (CODEI-JAVA-COMPILER for Java).",
    keyExports: ["SAST_400_PLUGINS", "COMPILED_400_PLUGINS"],
  },
  {
    path: "lib/validation-engine.ts",
    layer: "Engine Core",
    summary: "6-Stage Proof-Driven Validation Engine and 12-Test Audit Acceptance Suite (AT-01 to AT-12) verifying ID joins, CWE-to-taxonomy correlation integrity, language-matched remediation, and proof-state honesty.",
    keyExports: ["VALIDATION_FINDINGS", "runSastAuditAcceptanceSuite", "computeValidationMetrics"],
  },
  {
    path: "lib/deep-enumeration-engine.ts",
    layer: "Engine Core",
    summary: "7-Phase Deep Enumeration & Exploitability Dossier builder mapping CWEs to OWASP ASVS/WSTG/CAPEC taxonomies without fabricated CVEs or uncontextualized repo counts.",
    keyExports: ["buildDeepExploitabilityDossier", "executeDeepEnumerationAndPenTest"],
  },
  {
    path: "components/DeveloperAssistAgent.tsx",
    layer: "UI Component",
    summary: "Floating 'Ask Noctis · AI AppSec & SAST Agent' copilot drawer connected live to Noctis (https://dstrike.app/noctis).",
    keyExports: ["DeveloperAssistAgent"],
  },
  {
    path: "components/finding/DiffRemediation.tsx",
    layer: "UI Component",
    summary: "Stateful side-by-side Vulnerable vs. Verified Remediation diff viewer with post-fix retest simulator (TC-SQLI-089-001, TC-CODEI-094-001) ensuring vulnerable code never leaks into the fixed block.",
    keyExports: ["DiffRemediation"],
  },
  {
    path: "components/finding/EvidencePanel.tsx",
    layer: "UI Component",
    summary: "Source-to-Sink Taint Trace Simulator & Proof Artifact Console distinguishing static AST trace steps from live runtime exploit execution.",
    keyExports: ["EvidencePanel"],
  },
  {
    path: "app/cyber-monitoring/page.tsx",
    layer: "App Route",
    summary: "Editorial XTRIKE SAST Posture Ledger, Code-to-Runtime Sink Sensors, 710-Repository Mesh Topology & xtrike-sast-cli v4.2.0 Provisioning Desk.",
    keyExports: ["CyberMonitoringPage"],
  },
  {
    path: "lib/cyber-monitoring-data.ts",
    layer: "Data & Benchmarks",
    summary: "XTRIKE SAST Posture KPIs (16.8K Open SAST Findings, 6.4K Reachable SCA CVEs, 1.3K Verified AST Fixes), Code-to-Runtime Sink Sensors (213 Sink Triggers, 32 Halted, 84/100 Gate Score, 1,765 Nodes), 710-Repo Mesh (15,808 Policy Gates), and xtrike-sast-cli v4.2.0 package catalog.",
    keyExports: ["CYBER_VULN_KPI_SUMMARY", "ANTIVIRUS_PERFORMANCE_KPIS", "XTRIKE_FLEET_OVERVIEW", "XTRIKE_DISTRO_ACCORDION_GROUPS", "XTRIKE_CLI_RUNTIME_SPEC", "buildCyberMonitoringNoctisSummary"],
  },
  {
    path: "data/benchmark-repos.ts",
    layer: "Data & Benchmarks",
    summary: "Catalog of 82 integrated SAST & DAST vulnerable repositories (OWASP Benchmark, WebGoat, Juice Shop, DVWA, NodeGoat, PyGoat, RailsGoat, crAPI, CloudGoat, PortSwigger Labs, Semgrep, CodeQL, XTRIKE Telemetry & Sensor Agent Suite, etc.) with authentic multi-language seed files.",
    keyExports: ["BENCHMARK_REPOS", "BENCHMARK_CATEGORIES"],
  },
];

export const XTRIKE_SAST_CORE_RULES: SastRuleSummary[] = [
  {
    ruleId: "RULE-SQLI-089",
    pluginRange: "PLG-001 to PLG-025",
    cwe: "CWE-89",
    title: "SQL Injection via Unparameterized String Concatenation",
    languages: ["Java", "Python", "Node.js", "TypeScript", "PHP", "Go", "C#"],
    severity: "Critical",
    cvss: 9.8,
    mitre: "T1190 — Exploit Public-Facing Application",
    defaultProofState: "DATAFLOW_CONFIRMED (Runtime: NOT_RUN)",
    sourcePattern: "@RequestParam / request.getParameter / req.query / req.body / $_GET",
    sinkPattern: "Statement.executeQuery(query) / cursor.execute(f\"...\") / db.query(`...${input}`)",
    sanitizerGuard: "PreparedStatement.setString(1, param) / parameterized bind variables (?, $1, %s)",
    remediationPattern: "Replace string concatenation with parameterized PreparedStatement / bound parameters.",
  },
  {
    ruleId: "RULE-CMDI-078",
    pluginRange: "PLG-026 to PLG-044",
    cwe: "CWE-78",
    title: "OS Command Injection via Unsanitized Shell Invocation",
    languages: ["Java", "Python", "Node.js", "PHP", "Go"],
    severity: "Critical",
    cvss: 9.8,
    mitre: "T1059 — Command and Scripting Interpreter",
    defaultProofState: "DATAFLOW_CONFIRMED (Runtime: NOT_RUN)",
    sourcePattern: "HTTP header / query / body parameter",
    sinkPattern: "Runtime.getRuntime().exec(\"sh -c \" + input) / subprocess.Popen(..., shell=True) / child_process.exec()",
    sanitizerGuard: "ProcessBuilder(List.of(binary, arg)) / execFile() with shell=False + strict regex allowlist",
    remediationPattern: "Never invoke a shell interpreter (sh -c / shell=True) on user input; pass tokenized argument arrays and enforce a strict allowlist.",
  },
  {
    ruleId: "RULE-CODEI-094 / PLG-046 (Python) / PLG-054 (Java)",
    pluginRange: "PLG-045 to PLG-060",
    cwe: "CWE-94",
    title: "Improper Control of Generation of Code (Language-Strict Dynamic Execution & Compilation)",
    languages: ["Python", "Java", "Node.js", "PHP"],
    severity: "Medium",
    cvss: 5.3,
    mitre: "Python: T1059.006 | JS: T1059.007 | Java Compiler API: N/A (Compilation alone does not establish T1059 execution)",
    defaultProofState: "NEEDS_MANUAL_VALIDATION (for JavaCompiler.getTask excerpt) / DATAFLOW_CONFIRMED (when untrusted input + execution proven)",
    sourcePattern: "Request parameter / body / JavaFileObject source",
    sinkPattern: "Python: exec() / 3-arg compile() | JS: eval() / new Function() | Java: JavaCompiler.getTask() / ScriptEngine.eval()",
    sanitizerGuard: "Java: Jackson ObjectMapper typed DTO + schema/allowlist or isolated sandbox with List.of(\"-proc:none\") | Python: json.loads() / ast.literal_eval() + Pydantic",
    remediationPattern: "Treat input as data using a typed DTO + strict schema/allowlist validation. If Java source must be compiled, isolate in an external disposable sandbox with -proc:none and zero access to secrets.",
  },
  {
    ruleId: "RULE-DESER-502",
    pluginRange: "PLG-061 to PLG-085",
    cwe: "CWE-502",
    title: "Deserialization of Untrusted Data",
    languages: ["Java", "Python", "PHP", "Node.js", "C#"],
    severity: "Critical",
    cvss: 9.8,
    mitre: "T1059 / T1203 — Exploitation for Execution (Contingent on Classpath Gadgets)",
    defaultProofState: "DATAFLOW_CONFIRMED (Runtime Gadget Check: NOT_RUN)",
    sourcePattern: "HTTP input stream / cookie / queue payload",
    sinkPattern: "ObjectInputStream.readObject() / pickle.loads() / yaml.load() / unserialize()",
    sanitizerGuard: "JEP 290 ObjectInputFilter.Config.createFilter(\"maxarray=1000;maxdepth=5;!*\") / yaml.safe_load() / JSON DTO",
    remediationPattern: "Migrate to structured JSON DTOs or enforce JEP 290 ObjectInputFilter allowlists before readObject().",
  },
  {
    ruleId: "RULE-XSS-079",
    pluginRange: "PLG-086 to PLG-115",
    cwe: "CWE-79",
    title: "Cross-Site Scripting (XSS) via Unencoded Response Output",
    languages: ["Java", "Node.js", "TypeScript", "Python", "PHP"],
    severity: "High",
    cvss: 7.2,
    mitre: "T1189 / T1059.007 — Client Browser Script Execution",
    defaultProofState: "DATAFLOW_CONFIRMED (Constant literals suppressed via AT-05)",
    sourcePattern: "Request parameter / query / path",
    sinkPattern: "response.getWriter().println(tainted) / res.send(tainted) / dangerouslySetInnerHTML",
    sanitizerGuard: "OWASP Java Encoder Encode.forHtml(input) / DOMPurify.sanitize() / text/plain Content-Type",
    remediationPattern: "Apply context-aware HTML output encoding (Encode.forHtml) and strict Content-Security-Policy headers.",
  },
  {
    ruleId: "RULE-PATH-022",
    pluginRange: "PLG-116 to PLG-140",
    cwe: "CWE-22",
    title: "Improper Limitation of a Pathname to a Restricted Directory (Path Traversal)",
    languages: ["Java", "Python", "Node.js", "Go", "PHP"],
    severity: "High",
    cvss: 7.5,
    mitre: "T1083 / T1005 — Data from Local System",
    defaultProofState: "DATAFLOW_CONFIRMED (Requires paired File I/O sink via AT-07)",
    sourcePattern: "Filename query/form parameter or archive entry",
    sinkPattern: "Files.readAllBytes(target.toPath()) / new FileInputStream() / fs.readFileSync() / send_file()",
    sanitizerGuard: "baseDir.resolve(input).normalize().toRealPath(LinkOption.NOFOLLOW_LINKS).startsWith(baseDir)",
    remediationPattern: "Resolve against a fixed base directory, normalize with toRealPath(NOFOLLOW_LINKS), and verify startsWith(baseDir) before any file I/O.",
  },
  {
    ruleId: "RULE-XXE-611",
    pluginRange: "PLG-141 to PLG-165",
    cwe: "CWE-611",
    title: "Improper Restriction of XML External Entity Reference (XXE)",
    languages: ["Java", "Python", "C#", "PHP"],
    severity: "High",
    cvss: 8.2,
    mitre: "T1005 / T1190 — Local File Disclosure & SSRF via XML DTD",
    defaultProofState: "DATAFLOW_CONFIRMED",
    sourcePattern: "XML request body / SAML assertion / SOAP payload",
    sinkPattern: "DocumentBuilderFactory.newInstance().newDocumentBuilder().parse() / SAXParser / lxml.etree",
    sanitizerGuard: "dbf.setFeature(\"http://apache.org/xml/features/disallow-doctype-decl\", true)",
    remediationPattern: "Enable disallow-doctype-decl=true and disable external-general-entities and external-parameter-entities.",
  },
  {
    ruleId: "RULE-SSRF-918",
    pluginRange: "PLG-166 to PLG-195",
    cwe: "CWE-918",
    title: "Server-Side Request Forgery (SSRF)",
    languages: ["Java", "Python", "Node.js", "Go"],
    severity: "High",
    cvss: 8.6,
    mitre: "T1190 / T1552.005 — Cloud Instance Metadata API (IMDS)",
    defaultProofState: "DATAFLOW_CONFIRMED",
    sourcePattern: "Webhook URL / callback URL / avatar URL parameter",
    sinkPattern: "new URL(target).openConnection() / HttpClient.send() / requests.get() / fetch()",
    sanitizerGuard: "HTTPS scheme pinning + hostname allowlist + post-DNS RFC1918/loopback/169.254.169.254 block",
    remediationPattern: "Pin scheme to HTTPS, validate hostname against an explicit allowlist, resolve DNS and block loopback/RFC1918/link-local IPs, and disable HTTP redirects.",
  },
  {
    ruleId: "RULE-SEC-798",
    pluginRange: "PLG-196 to PLG-225",
    cwe: "CWE-798",
    title: "Use of Hard-coded Credentials / API Keys",
    languages: ["Java", "Python", "Node.js", "Go", "C#", "PHP"],
    severity: "High",
    cvss: 7.5,
    mitre: "T1552.001 — Unsecured Credentials: Credentials In Files",
    defaultProofState: "NEEDS_MANUAL_VALIDATION (AT-10: Verify whether key is live or a benchmark/test fixture)",
    sourcePattern: "Source code string literal assigned to password/secret/apiKey/privateKey",
    sinkPattern: "DriverManager.getConnection(..., \"hardcoded\") / JWT signing secret literal / AWS key literal",
    sanitizerGuard: "System.getenv() / Vault / AWS Secrets Manager / Kubernetes mounted secret",
    remediationPattern: "Verify whether credential is active in production before rotating; load secrets from a managed secret store at runtime.",
  },
  {
    ruleId: "RULE-JWT-347",
    pluginRange: "PLG-280 to PLG-310",
    cwe: "CWE-347",
    title: "Improper Verification of Cryptographic Signature (JWT Decode Without Verify)",
    languages: ["Java", "Node.js", "Python", "Go"],
    severity: "Critical",
    cvss: 9.1,
    mitre: "T1550.001 — Use Alternate Authentication Material",
    defaultProofState: "DATAFLOW_CONFIRMED",
    sourcePattern: "Authorization Bearer token",
    sinkPattern: "Base64.getUrlDecoder().decode(jwt.split('.')[1]) / jwt.decode(token) / alg: none",
    sanitizerGuard: "Jwts.parserBuilder().setSigningKey(publicKey).requireIssuer(...).build().parseClaimsJws(token)",
    remediationPattern: "Verify cryptographic signatures using parseClaimsJws / jwt.verify with pinned asymmetric algorithms (RS256/ES256).",
  },
];

export const XTRIKE_SAST_BENCHMARK_SUMMARY = [
  "OWASP/Benchmark & OWASP/BenchmarkJava (Java Servlet SAST Calibration Suite — 2,740+ test cases)",
  "OWASP/WebGoat & WebGoat/WebGoat (Java Spring Boot — SqlInjectionLesson5a.java, BlindScript.java, SimpleXXE.java)",
  "juice-shop/juice-shop & OWASP/juice-shop (Node.js / TypeScript / Express / Angular)",
  "digininja/DVWA & ethicalhack3r/DVWA (PHP / MySQL — SQLi, Command Injection, File Inclusion, XSS)",
  "OWASP/NodeGoat (Node.js / Express / MongoDB)",
  "OWASP/pygoat (Python / Django)",
  "OWASP/railsgoat (Ruby on Rails)",
  "OWASP/Mutillidae & OWASP/SecurityShepherd (PHP / Java Web & Mobile)",
  "OWASP/crAPI (Completely Ridiculous API — Go / Python / Java / Postgres microservices)",
  "OWASP/CloudGoat & Bridgecrew/TerraGoat & Checkov (AWS / Terraform / Cloud IaC)",
  "OWASP/WrongSecrets (Secrets Management Benchmark across Docker/K8s/Vault/Cloud)",
  "PortSwigger/web-security-academy & snoopysecurity/Vulnerable-Code-Snippets",
  "erev0s/VAmPI & doleVf/Damn-Vulnerable-GraphQL-Application (REST & GraphQL APIs)",
  "vulhub/vulhub & appsecco/vulnerable-apps (CVE & Container Reproduction Environments)",
  "semgrep/semgrep-rules, github/codeql, spotbugs/spotbugs, PyCQA/bandit, securego/gosec, zricethezav/gitleaks",
];

export function getSastRepositoryOverviewPayload() {
  return {
    metadata: XTRIKE_SAST_PLATFORM_METADATA,
    repositoryFiles: XTRIKE_SAST_REPOSITORY_FILES,
    coreRules: XTRIKE_SAST_CORE_RULES,
    benchmarkSuitesCount: 82,
    pluginsCount: 401,
    featuredBenchmarks: XTRIKE_SAST_BENCHMARK_SUMMARY,
  };
}

export function buildCompleteSastKnowledgeReport(question = ""): string {
  const q = question.toLowerCase();

  // Specific query about PLG-046 / PLG-054 / BlindScript.java / JavaCompiler.getTask
  if (/plg-046|plg-054|blindscript|javacompiler|gettask|codei-py-exec|codei-java-compiler/i.test(q)) {
    return [
      `## Noctis SAST Audit Dossier — \`PLG-046\` vs \`PLG-054\` (\`BlindScript.java\` / \`JavaCompiler.getTask\`)`,
      `**Direct Answer:** In the XTRIKE SAST Platform (\`https://05-sast-platform.vercel.app\`), Python dynamic execution (\`PLG-046: CODEI-PY-EXEC\`) and Java dynamic compilation (\`PLG-054: CODEI-JAVA-COMPILER\`) are strictly separated by language via \`pluginSupportsLanguage()\` in \`lib/enterprise-sast-engine.ts\`. When \`compiler.getTask(...)\` is matched in \`BlindScript.java\` without established untrusted input into \`fileObjects\`, \`task.call()\`, or post-compilation \`ClassLoader\` invocation in the excerpt, it is classified as **Disposition: Needs validation** (\`NEEDS_MANUAL_VALIDATION\`, Provisional \`CVSS 5.3 Medium\`, \`EPSS: N/A\`)—never overstated as confirmed RCE.`,
      `### 1. Language-Strict Rule & Taxonomy Separation`,
      `| Dossier Field | Python Rule (\`PLG-046\`) | Java Dynamic Compilation Rule (\`PLG-054\`) |`,
      `| :--- | :--- | :--- |`,
      `| **Rule ID** | \`PLG-046: CODEI-PY-EXEC\` | \`PLG-054: CODEI-JAVA-COMPILER\` |`,
      `| **Target Language** | \`Python\` (\`exec()\`, 3-arg \`compile()\`) | \`Java\` (\`javax.tools.JavaCompiler.getTask()\`) |`,
      `| **CWE Mapping** | \`CWE-94\` (Improper Control of Generation of Code) | \`CWE-94\` (Candidate — requires input provenance check) |`,
      `| **MITRE ATT&CK** | \`T1059.006\` (Python Interpreter) | \`N/A — Java Dynamic Compilation API (Compilation alone does not establish T1059 execution)\` |`,
      `| **EPSS Score** | \`N/A (0.0 — First-Party Code, No CVE)\` | \`N/A (0.0 — First-Party Code, No CVE)\` |`,
      `### 2. 6-Stage Java Dynamic Compilation Verification (\`lib/enterprise-sast-engine.ts\`)`,
      `1. **Source of \`fileObjects\`:** Trace where \`JavaFileObject\` / \`SimpleJavaFileObject\` is constructed (e.g., inspect \`BlindScript.java\` lines 300–380) and whether untrusted request input reaches it.`,
      `2. **Task Creation vs. Execution:** \`compiler.getTask(...)\` only creates a \`CompilationTask\`; compilation does not run unless \`task.call()\` is invoked.`,
      `3. **Annotation Processors (\`-proc:none\`):** Check whether compiler options include \`List.of("-proc:none")\` because Java annotation processors can execute during compilation.`,
      `4. **Post-Compilation Invocation:** Check whether compiled bytecode is loaded via \`ClassLoader.loadClass(...)\` and executed via \`newInstance()\` or \`Method.invoke(...)\`.`,
      `5. **Process Isolation Boundary:** Verify whether compilation runs in the main application JVM or an external disposable sandbox with restricted CPU, memory, filesystem, network, and zero secrets.`,
      `6. **Section 6 Assessment Summary for \`BlindScript.java\`:**\n   - **Disposition:** \`Needs validation\`\n   - **Static evidence:** \`Java compiler API identified\`\n   - **Untrusted input flow:** \`Not established by excerpt\`\n   - **Runtime code execution:** \`Not demonstrated\`\n   - **Actual impact:** \`Unconfirmed\`\n   - **CVSS / EPSS:** \`Reassessment required\``,
      `### 3. Verified Java Remediation Patterns (\`components/finding/DiffRemediation.tsx\`)`,
      `\`\`\`java\n// ✅ PREFERRED PATTERN 1 (Java): Treat input as data via Jackson ObjectMapper into a typed DTO + strict allowlist\nObjectMapper mapper = new ObjectMapper();\nCalculationRequest dto = mapper.readValue(request.getParameter("payload"), CalculationRequest.class);\nif (!ALLOWED_OPERATIONS.contains(dto.getOperation()) || dto.getOperand() < 0 || dto.getOperand() > 10_000) {\n    throw new IllegalArgumentException("Rejected by strict DTO schema & business-rule allowlist");\n}\nint result = SafeMathService.evaluate(dto.getOperation(), dto.getOperand());\n\n// ✅ PATTERN 2 (If user Java source must be compiled): Isolate in external disposable sandbox with -proc:none\nList<String> safeCompilerOptions = List.of("-proc:none", "-implicit:none");\n\`\`\``,
    ].join("\n\n");
  }

  // Specific query about SQL Injection / SqlInjectionLesson5a.java / Proof Engine
  if (/sql\s*injection|sqli|cwe-89|sqlinjectionlesson5a|preparedstatement/i.test(q)) {
    return [
      `## Noctis SAST Dossier — \`CWE-89\` SQL Injection & Proof Engine Validation`,
      `**Direct Answer:** In the XTRIKE SAST Platform, SQL Injection (\`RULE-SQLI-089\` / \`CWE-89\`) is detected when untrusted input (such as \`@RequestParam String account\` at line 8 of \`SqlInjectionLesson5a.java\`) is concatenated into a SQL string (\`line 10\`) and passed to \`statement.executeQuery(query)\` (\`line 12\`) without \`PreparedStatement\` parameter binding.`,
      `### 1. Static Detection vs. Runtime Proof Distinction`,
      `- **Canonical Proof State:** \`DATAFLOW_CONFIRMED\` (Static Intra-Procedural Source-to-Sink Taint Confirmed; Runtime Sandbox Exploit: \`NOT_RUN\`).`,
      `- **Prerequisite Honesty:** \`@PostMapping\` alone does **not** prove authentication is absent (\`Spring SecurityFilterChain\` must be checked), and \`Statement.executeQuery(SELECT ...)\` does **not** prove database write privileges or RCE.`,
      `- **EPSS Handling:** \`N/A — First-Party Source Code Weakness (No CVE Assigned)\`.`,
      `### 2. Verified Java Parameterized Remediation (\`TC-SQLI-089-001\`)`,
      `\`\`\`java\n// ❌ VULNERABLE (SqlInjectionLesson5a.java:10-12)\nString query = "SELECT * FROM user_data WHERE first_name = 'John' AND last_name = '" + account + "'";\nStatement statement = connection.createStatement();\nResultSet results = statement.executeQuery(query);\n\n// ✅ FIXED (Parameterized PreparedStatement)\nString sql = "SELECT * FROM user_data WHERE first_name = 'John' AND last_name = ?";\ntry (PreparedStatement statement = connection.prepareStatement(sql)) {\n    statement.setString(1, account);\n    try (ResultSet results = statement.executeQuery()) {\n        return results.toString();\n    }\n}\n\`\`\``,
    ].join("\n\n");
  }

  // Specific query about XTRIKE SAST Posture KPIs, Sink Sensors, 710-Repo Mesh, or xtrike-sast-cli v4.2.0 installer
  if (
    /posture|cyber\s*kpi|cyber\s*monitor|16\.8k|6\.4k|1\.3k|sink\s*sensor|sink\s*trigger|213\s*active|84\/100|1,?765\s*nodes|710\s*repo|710\s*node|710\s*host|15,?808|release-gate|payment-settlement-core|identity-oauth-gateway|graphql-mobile-bff|order-fulfillment-api|dynamic-rule-compiler|webhook-event-broker|xtrike-sast-cli|4\.2\.0|ptes-nist-800-115|daemon\s+start/i.test(
      q
    )
  ) {
    return [
      `## Noctis — XTRIKE SAST Posture Ledger, Sink Sensors, 710-Repo Mesh & CLI (\`/cyber-monitoring\`)`,
      `### 1. Ledger 01 — SAST & Reachable CVE Posture Summary`,
      `- **Open SAST Findings:** \`16.8K\` (\`+12.3%\` across 82 repositories & 4 AST engines: \`XQL\`, \`DeepFlow\`, \`StructSCA\`, \`AST-Query\`)`,
      `- **Reachable SCA CVEs:** \`6.4K\` (\`-6.2%\` verified call-graph reachability) · **Verified AST Fixes:** \`1.3K\` (\`+18.4%\` passed post-fix retest suite)`,
      `- **5 Canonical Proof States Breakdown:** Critical \`1.4K\` (\`PROVEN_EXPLOITABLE / DATAFLOW_CONFIRMED\`), High \`6.0K\` (\`DATAFLOW_CONFIRMED\`), Medium \`7.1K\` (\`DETECTED_STATIC\`), Low \`1.3K\` (\`NEEDS_MANUAL_VALIDATION\`), Guarded \`265\` (\`MITIGATED_BY_GUARD\`)`,
      `- **Findings by Service Tier:** Payment & Ledger Core (\`3.4K · CWE-89\`), Identity & OAuth Gateway (\`3.3K · CWE-347\`), GraphQL & Mobile BFF (\`2.8K · CWE-918\`), Order Fulfillment API (\`2.6K · CWE-502\`), Dynamic Rule Compiler (\`2.5K · CWE-94\`), Terraform & EKS IaC (\`1.2K · CWE-798\`), Webhook & Event Broker (\`843 · CWE-78\`), AI-BOM & RAG Pipeline (\`314 · CWE-22\`)`,
      `### 2. Ledger 02 — Code-to-Runtime Sink Sensors & Build Runner Fleet`,
      `- **Sensor KPIs:** Active Sink Triggers \`213\` (\`+18%\`) · Exploit Probes Halted \`32\` (\`+14%\`) · Unauth Taint Routes \`26\` (\`-11%\`) · Manual Proof Queue \`26\` · AST Diffs Verified \`73\` (\`+29%\`) · Release Gate Score \`84/100\` (\`+6 pts\`)`,
      `- **Instrumented Build & Runtime Fleet (\`1,765\` Total Nodes):** Linux x86_64 (\`468\`), Kubernetes / EKS Pods (\`406\`), GitHub Actions / GitLab CI Runners (\`320\`), macOS IDE Workstations (\`249\`), Windows Server / .NET (\`122\`), ARM64 Graviton (\`100\`), Serverless & Edge Functions (\`100\`)`,
      `### 3. Ledger 03 — XTRIKE Repository & Microservice Mesh (\`710\` Nodes · \`15,808\` Policy Gates)`,
      `- **Mesh State:** \`709 Online\`, \`0 Offline\`, \`1 Quarantined\` · **Policy Gates:** \`14,839 Passing\`, \`691 Warning\`, \`67 Needs Triage\`, \`210 Release-Blocking\` · **24h Taint Trace Events:** \`1,001\``,
      `- **Priority Release-Gate Violators:** \`payment-settlement-core\` (\`CWE-89 SQLi · 116 gates\`), \`identity-oauth-gateway\` (\`CWE-347 JWT · 97 gates\`), \`graphql-mobile-bff\` (\`CWE-918 SSRF · 85 gates\`), \`order-fulfillment-api\` (\`CWE-502 Deser · 68 gates\`), \`dynamic-rule-compiler\` (\`CWE-94 CodeGen · 58 gates\`), \`webhook-event-broker\` (\`CWE-78 CmdInj · 48 gates\`)`,
      `### 4. Ledger 04 — \`xtrike-sast-cli v4.2.0-enterprise\` Installation & Engine Startup`,
      `- **Ubuntu / Debian APT:**\n  - \`curl -fsSL https://05-sast-platform.vercel.app/api/xtrike-package?pkg=xtrike-sast-cli_4.2.0_amd64.deb -o xtrike-sast-cli_4.2.0_amd64.deb\`\n  - \`sudo apt install ./xtrike-sast-cli_4.2.0_amd64.deb\`\n  - **SHA-256:** \`3da7fe4b86a9e606b6a55bfba08a3b42fc4ac4e72df742989e89f9ef7c0e3282\``,
      `- **Initialize PTES / NIST 800-115 Profile & Start All 4 AST Engines:**\n  \`\`\`bash\n  xtrike-sast --version\n  xtrike-sast init --profile ptes-nist-800-115\n  xtrike-sast daemon start --engines xql,deepflow,structsca,ast-query\n  # Starting xtrike-xql-parser...[OK] | xtrike-deepflow-ssa...[OK] | xtrike-structsca-7k...[OK] | xtrike-ast-dispatcher...[OK] | xtrike-proof-sandbox...[OK] | xtrike-mcp-bridge...[OK] | xtrike-noctis-sync...[OK]\n  \`\`\``,
    ].join("\n\n");
  }

  const dashboardPayload = {
    title: "XTRIKE SAST Platform (Platform 05) — Repository & Engine Telemetry",
    subtitle: "Connected to Noctis Brain (https://dstrike.app/noctis) · 4 AST Engines · 401 Plugins · 82 Benchmark Repos",
    riskLevel: "low",
    kpis: [
      { label: "Hybrid SAST Engines", value: "4 Engines", sub: "XQL · DeepFlow · StructSCA · AST-Query" },
      { label: "Language-Strict Plugins", value: "401 Rules", sub: "OWASP · ASVS · CWE · NIST · PCI · CERT" },
      { label: "Integrated Test Repos", value: "82 Repos", sub: "OWASP Benchmark · WebGoat · JuiceShop · DVWA" },
      { label: "Validation Pipeline", value: "6 Stages", sub: "5 Canonical Proof States · 20 Audit Gates" },
    ],
    bars: {
      title: "XTRIKE SAST 5 Canonical Proof States (Evidence-Gated Triage)",
      items: [
        { label: "PROVEN_EXPLOITABLE (Controlled Sandbox Replay Verified)", value: 100, max: 100, display: "Runtime Exploit Reproduced", tone: "rose" },
        { label: "DATAFLOW_CONFIRMED (Static Source-to-Sink Taint Verified)", value: 85, max: 100, display: "AST Taint Confirmed · Runtime NOT_RUN", tone: "amber" },
        { label: "DETECTED_STATIC (Dangerous API / Crypto Pattern)", value: 60, max: 100, display: "Context-Dependent Weakness", tone: "amber" },
        { label: "NEEDS_MANUAL_VALIDATION (Unestablished Source/Exec)", value: 45, max: 100, display: "Needs Manual Code Inspection", tone: "cyan" },
        { label: "MITIGATED_BY_GUARD (Parameterized / Sanitized)", value: 100, max: 100, display: "Safe · Guard Verified in AST", tone: "emerald" },
      ],
    },
  };

  return [
    `# XTRIKE SAST Platform — Complete Architecture, Repository & SAST Intelligence Guide`,
    `**Direct Answer:** **SAST (Static Application Security Testing)** analyzes source code, bytecode, or configuration files without executing the program by parsing code into an **Abstract Syntax Tree (AST)**, building a **Control-Flow Graph (CFG)** and **Static Single Assignment (SSA) Dataflow Graph**, and tracing whether untrusted **sources** reach dangerous **sinks** without passing through a dominating **sanitizer or parameterization guard**. The **XTRIKE SAST Platform** (\`https://05-sast-platform.vercel.app\`) is fully integrated into **Noctis** (\`https://dstrike.app/noctis\`).`,
    `\`\`\`noctis-dashboard\n${JSON.stringify(dashboardPayload)}\n\`\`\``,
    `## 1. How the XTRIKE 4-Engine Hybrid SAST Architecture Works`,
    `| Engine | Role in Pipeline | What It Detects & Verifies |`,
    `| :--- | :--- | :--- |`,
    ...XTRIKE_SAST_PLATFORM_METADATA.engines.map(
      (e) => `| **${e.name}** (\`${e.id}\`) | ${e.role} | ${e.description} |`
    ),
    `## 2. The 5 Canonical Proof States (Distinguishing Static Detection from Proven Exploitability)`,
    `| Canonical Proof State | Technical Meaning | Release Gate Action |`,
    `| :--- | :--- | :--- |`,
    ...XTRIKE_SAST_PLATFORM_METADATA.canonicalProofStates.map(
      (s) => `| \`${s.state}\` | ${s.meaning} | **${s.releaseGateImpact}** |`
    ),
    `## 3. Complete XTRIKE SAST Platform Repository Map (\`platforms/05-sast-platform\`)`,
    `| File Path | Layer | Responsibility & Key Exports |`,
    `| :--- | :--- | :--- |`,
    ...XTRIKE_SAST_REPOSITORY_FILES.map(
      (f) => `| \`${f.path}\` | ${f.layer} | ${f.summary} (\`${f.keyExports.join("`, `")}\`) |`
    ),
    `## 4. Core Enterprise SAST Rules & Remediation Matrix (\`lib/enterprise-sast-engine.ts\` & \`lib/sast-400-plugins.ts\`)`,
    `| Rule / Plugin ID | CWE | Vulnerability Class | Languages | Default Proof State | Verified Sanitizer / Fix |`,
    `| :--- | :--- | :--- | :--- | :--- | :--- |`,
    ...XTRIKE_SAST_CORE_RULES.map(
      (r) =>
        `| \`${r.ruleId}\` (${r.pluginRange}) | \`${r.cwe}\` | **${r.title}** | ${r.languages.join(", ")} | \`${r.defaultProofState}\` | ${r.sanitizerGuard} |`
    ),
    `## 5. 82 Pre-Integrated SAST & DAST Vulnerable Benchmark Repositories (\`data/benchmark-repos.ts\`)`,
    XTRIKE_SAST_BENCHMARK_SUMMARY.map((b) => `- ${b}`).join("\n"),
  ].join("\n\n");
}

export function sastIntelligenceGadget(question: string): string | null {
  const q = question.trim();
  if (!q) return null;

  const isSastQuery =
    /\b(what\s+is\s+sast|how\s+does\s+sast\s+work|explain\s+sast|xtrike\s+sast|05-sast-platform|sast\s+platform|sast\s+desk|sast\s+repo|sast\s+repository|sast\s+engine|sast\s+plugin|plg-046|plg-054|codei-py-exec|codei-java-compiler|blindscript\.java|sqlinjectionlesson5a|taint\s+graph|canonical\s+proof\s+state|proof\s+engine|xtrike\s+xql|xtrike\s+deepflow|xtrike\s+structsca|sast\s+vs\s+dast|static\s+application\s+security\s+testing|posture\s*kpi|posture\s*ledger|cyber\s*kpi|cyber\s*monitor|16\.8k|6\.4k|sink\s*sensor|sink\s*trigger|710\s*repo|710\s*node|15,?808|xtrike-sast-cli|4\.2\.0|ptes-nist-800-115)\b/i.test(
      q
    );

  if (!isSastQuery) return null;
  return buildCompleteSastKnowledgeReport(q);
}

export function buildNoctisSastTrainingPairs(): {
  question: string;
  answer: string;
  domain: string;
  model: string;
  hits: number;
  at: string;
}[] {
  const fullReport = buildCompleteSastKnowledgeReport("");
  const plg046Report = buildCompleteSastKnowledgeReport("PLG-046 PLG-054 BlindScript.java JavaCompiler.getTask");
  const sqliReport = buildCompleteSastKnowledgeReport("SQL Injection SqlInjectionLesson5a.java CWE-89 Proof Engine");

  return [
    {
      question: "What is SAST and how does the XTRIKE SAST Platform repository work?",
      answer: fullReport,
      domain: "cybersecurity",
      model: "vibe-seed",
      hits: 25,
      at: "2026-10-28T00:00:00.000Z",
    },
    {
      question: "Explain the XTRIKE SAST Desk repository architecture, 4 AST engines, 401 plugins, 5 canonical proof states, and 82 benchmark repositories",
      answer: fullReport,
      domain: "cybersecurity",
      model: "vibe-seed",
      hits: 25,
      at: "2026-10-28T00:00:00.000Z",
    },
    {
      question: "Explain PLG-046 vs PLG-054, BlindScript.java, and how XTRIKE SAST analyzes JavaCompiler.getTask()",
      answer: plg046Report,
      domain: "cybersecurity",
      model: "vibe-seed",
      hits: 25,
      at: "2026-10-28T00:00:00.000Z",
    },
    {
      question: "How does the XTRIKE SAST Proof Engine validate SQL Injection in SqlInjectionLesson5a.java (CWE-89)?",
      answer: sqliReport,
      domain: "cybersecurity",
      model: "vibe-seed",
      hits: 25,
      at: "2026-10-28T00:00:00.000Z",
    },
  ];
}
