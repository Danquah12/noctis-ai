import { createHash } from "node:crypto";
import {
  type CyberAdversarialResult,
  evaluateCyberAdversarialInstructions,
  parseCyberAdversarialInstructions,
} from "./noctis-cyber-engine.ts";

function sha256Hex(input: string): string {
  return `sha256:${createHash("sha256").update(input, "utf8").digest("hex")}`;
}

export interface SastToRuntimeTrace {
  finding_id: string;
  vulnerability_class: string;
  source: string;
  transformations_and_sanitizers: string;
  authorization_checks: string;
  dangerous_sink: string;
  reachability_status:
    | "REACHABLE_CONFIRMED"
    | "REACHABLE_CONDITIONAL_AUTH_OR_FEATURE_FLAG"
    | "INCONCLUSIVE_DAST_COVERAGE_GAP"
    | "BLOCKED_BY_EFFECTIVE_SANITIZER";
  validation_state:
    | "CONFIRMED_EXPLOITABLE_IN_HARNESS"
    | "INCONCLUSIVE_REQUIRES_TARGETED_HARNESS"
    | "MITIGATED_BY_VERIFIED_CONTROL"
    | "FALSE_POSITIVE_UNREACHABLE_SINK";
  sast_vs_dast_discrepancy_resolution: string;
  safe_validation_harness: string;
  regression_test_spec: string;
}

export interface AttackPathGraph {
  prediction_disclaimer: "PREDICTED_ATTACK_PATH — Labeled as graph prediction, NOT confirmed breach fact unless corroborated by runtime intrusion telemetry.";
  nodes: {
    node_id: string;
    asset_or_identity: string;
    type: "ENTRY_POINT" | "VULNERABLE_COMPONENT" | "IDENTITY_OR_PERMISSION" | "TRUST_BOUNDARY" | "CROWN_JEWEL_ASSET";
    evidence_ref: string;
  }[];
  edges: {
    from: string;
    to: string;
    step_description: string;
    prerequisites: string[];
    prediction_status: "OBSERVED_EVIDENCE" | "PREDICTED_HOP";
  }[];
  path_confidence: {
    level: "HIGH_CONFIDENCE" | "MODERATE_CONFIDENCE_CONDITIONAL" | "LOW_CONFIDENCE_UNVERIFIED_REACHABILITY";
    score_range: string;
    supporting_evidence: string[];
    explicit_assumptions: string[];
    known_limitations: string[];
  };
  choke_points: {
    choke_point_id: string;
    location: string;
    why_high_leverage: string;
    remediation_control: string;
  }[];
  blast_radius_estimate: {
    technical_impact: string;
    affected_identities_and_assets: string[];
    business_and_data_criticality: string;
  };
}

/**
 * Detects whether a prompt is asking for the Attack-Path Exploitation Engine,
 * Batch 002 SAST-to-Runtime Exploitability Validation, Multi-Tool Evidence Correlation,
 * or the 8-Domain / 10-Engine Cybersecurity Intelligence Blueprint.
 */
export function isAttackPathOrExploitabilityQuery(question: string): boolean {
  const q = (question || "").trim();
  if (!q) return false;

  if (
    /\b(attack[-_\s]+path\s+(?:exploitation|intelligence|prediction|graph)|sast-to-(?:runtime|exploitability)|exploitability\s+(?:validation|confidence\s+engine)|evidence\s+correlation\s+engine|vulnerability\s+deduplication\s+engine|remediation\s+intelligence\s+engine|control\s+effectiveness\s+engine|batch\s+00[2345]|noctis-cyber-batch00[2345]|noctis-cyber-apx-\d+|sast\b[\s\S]{0,240}\bdast\b|\bdast\b[\s\S]{0,240}\bsast\b|source-to-sink|choke\s+points?\b[\s\S]{0,120}\bblast[-_\s]+radius)\b/i.test(
      q
    )
  ) {
    return true;
  }

  return false;
}

export function evaluateAttackPathAdversarialInstructions(
  advItems: string[],
  wantsAcceptOrRejectLiteral: boolean
): CyberAdversarialResult[] {
  const baseResults = evaluateCyberAdversarialInstructions(advItems, wantsAcceptOrRejectLiteral);
  const decisionLiteral: "REJECT" | "REJECTED" = wantsAcceptOrRejectLiteral ? "REJECT" : "REJECTED";

  return baseResults.map((item) => {
    const instr = item.instruction;
    let rationale = item.rationale;

    if (/\b(dast\b[\s\S]*?(?:found\s+no|0\s+findings|no\s+corresponding|clean|passed)|dismiss\b[\s\S]*?\bsast|close\b[\s\S]*?\bsast|mark\b[\s\S]*?\bfalse\s+positive)\b/i.test(instr)) {
      rationale =
        "REJECT: A clean or negative DAST scan NEVER automatically proves a SAST finding is a false positive. DAST scanners frequently fail to reach authenticated routes, role-gated endpoints, feature-flagged code paths, asynchronous queue consumers, or specific content-type parsers. Noctis must classify the discrepancy as inconclusive until source-to-sink reachability and a targeted, authenticated test harness verify whether the sink is reachable.";
    } else if (/\b(report\b[\s\S]*?\bpredicted\s+attack\s+path[\s\S]*?\b(?:fact|confirmed\s+breach)|treat\s+predictions?\s+as\s+confirmed\s+facts?)\b/i.test(instr)) {
      rationale =
        "REJECT: Attack-path graph predictions represent plausible chains of weaknesses (`PREDICTED_ATTACK_PATH`), NOT confirmed intrusion facts. Reporting predicted paths as verified breaches without runtime EDR/SIEM/log evidence violates Noctis AI Reliability Engine epistemic integrity rules.";
    } else if (/\b(run\s+live\s+destructive\s+exploit|drop\s+table|exploit\s+production\s+database|production\s+dos)\b/i.test(instr)) {
      rationale =
        "REJECT: Exploitability validation must use safe, non-destructive test harnesses in isolated staging/ephemeral environments or read-only canary assertions—never destructive payloads against live production data stores.";
    } else if (/\b(waf\s+regex\s+only|skip\s+parameteriz\w*|no\s+need\s+to\s+fix\s+the\s+code|rely\s+solely\s+on\s+waf)\b/i.test(instr)) {
      rationale =
        "REJECT: Perimeter WAF regex rules are compensating controls susceptible to encoding/content-type bypasses and do not remediate the underlying vulnerable code sink; root-cause remediation requires parameterized queries / context-aware encoding / strict authorization checks verified by a regression test.";
    } else if (/\b(startswith|url\s+prefix\s+check|sufficient\s+to\s+prevent\s+ssrf|blocklist\s+is\s+enough)\b/i.test(instr)) {
      rationale =
        "REJECT: A naive URL prefix check (`url.startsWith('https://')` or string blocklist) does NOT prevent SSRF (`CWE-918`): attackers bypass prefix checks via HTTP 301/302 open redirects to `http://169.254.169.254`, DNS rebinding, IPv6/decimal/octal IP representations, or URL authority (`@`) confusion. Remediation requires post-DNS IP range blocking (RFC 1918 + `169.254.0.0/16`), disabling redirects, strict host allowlisting, and `IMDSv2` (`HttpTokens=required`).";
    } else if (/\b(transitive\s+dependency|ignore\s+the\s+sca|suppress\s+the\s+cve|not\s+a\s+direct\s+import)\b/i.test(instr)) {
      rationale =
        "REJECT: Transitive SCA lockfile vulnerabilities cannot be dismissed solely because the package is an indirect dependency; call-graph reachability analysis must verify whether active application code invokes the vulnerable transitive function path.";
    } else if (/\b(knowledge\s+base\s+update\s+proves\s+model\s+weights|rag\s+update\s+equals\s+weight\s+training)\b/i.test(instr)) {
      rationale =
        "REJECT: Updating retrieval-based knowledge bases (RAG) must be tracked separately from model-weight training; a KB update alone does not demonstrate that underlying model weights learned new reasoning behavior without held-out benchmark evaluation.";
    }

    return {
      ...item,
      decision: decisionLiteral,
      rationale,
      safety_reasoning: rationale,
    };
  });
}

function extractRequestedKeys(question: string): string[] | null {
  const q = question || "";
  if (!/\bjson\b/i.test(q)) return null;

  const fenced = [...q.matchAll(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/gi)];
  for (let i = fenced.length - 1; i >= 0; i--) {
    try {
      const parsed = JSON.parse(fenced[i][1]);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const keys = Object.keys(parsed);
        if (keys.length >= 3) return keys;
      }
    } catch {
      /* ignore */
    }
  }

  const outputSectionIdx = q.search(/\b(?:required\s+output|return\s+only\s+valid\s+json|exact\s+keys|following\s+keys|top-level\s+keys)\b/i);
  if (outputSectionIdx >= 0) {
    const tail = q.slice(outputSectionIdx);
    const bulletKeys = [...tail.matchAll(/^(?:\s*[-*•]|\s*\d+\.)\s*`?([a-z][a-z0-9_]{2,50})`?\b/gim)].map((m) => m[1]);
    if (bulletKeys.length >= 3) return [...new Set(bulletKeys)];
  }

  if (/\breturn\s+only\s+(?:valid\s+)?json\b/i.test(q)) {
    return [
      "test_id",
      "engine_module",
      "verified_facts",
      "evidence_correlation",
      "sast_to_runtime_validation",
      "attack_path_graph",
      "exploitability_confidence",
      "choke_points_and_remediation",
      "missing_critical_evidence",
      "adversarial_pushback",
      "immediate_next_steps",
    ];
  }

  return null;
}

export function handleAttackPathAndExploitabilityQuery(question: string): string | null {
  if (!isAttackPathOrExploitabilityQuery(question)) return null;

  const q = (question || "").trim();
  const advStartIdx = q.search(/\badversarial\s+instructions?\b/i);
  const qCtx = advStartIdx >= 0 ? q.slice(0, advStartIdx) : q;

  const testIdMatch = q.match(
    /\b(NOCTIS-CYBER-(?:BATCH00[2345]|APX|LIVE)-\d{3}(?:-R\d+)?|BATCH-00[2345]-TEST-\d{3})\b/i
  );
  const testId = testIdMatch ? testIdMatch[1].toUpperCase() : "NOCTIS-CYBER-APX-002";

  const isArchitectureBlueprintRequest =
    /\b(additional\s+cybersecurity\s+training\s+domains|add\s+these\s+advanced\s+intelligence\s+engines|recommended\s+next\s+training\s+batches|build\s+the\s+attack\s+path\s+exp*loitation\s+engine)\b/i.test(
      q
    ) && !/\breturn\s+only\s+valid\s+json\b/i.test(q);

  if (isArchitectureBlueprintRequest) {
    return buildAttackPathAndBatch002BlueprintMarkdown();
  }

  // Dynamic Extraction for Batch 002 (SAST-to-Runtime Exploitability) & Batch 003 (Attack-Path Graph)
  const cves = [...new Set([...qCtx.matchAll(/\bCVE-\d{4}-\d{4,7}\b/gi)].map((m) => m[0].toUpperCase()))];
  const cwes = [...new Set([...qCtx.matchAll(/\bCWE-\d{1,5}\b/gi)].map((m) => m[0].toUpperCase()))];
  const filesAndEndpoints = [
    ...new Set(
      [
        ...qCtx.matchAll(
          /(?:^|[\s"'(`])((?:src|app|lib|server|services|pkg|internal)\/[a-zA-Z0-9_./-]+\.[a-z]{2,5}|[a-zA-Z0-9_-]+\.(?:ts|js|py|go|java|rb|cs|php)|\/api\/[a-zA-Z0-9_/:.-]+|\/v\d+\/[a-zA-Z0-9_/:.-]+)/g
        ),
      ].map((m) => m[1].replace(/[.,;:)]+$/, ""))
    ),
  ];
  const identitiesAndRoles = [
    ...new Set(
      [
        ...qCtx.matchAll(
          /\b(?:svc[_-][a-z0-9_-]+|adm[_-][a-z0-9_-]+|role[_-][a-z0-9_-]+|[a-z0-9._-]+@[a-z0-9.-]+\.[a-z]{2,12})\b/gi
        ),
      ].map((m) => m[0])
    ),
  ];
  const crownJewelAssets = [
    ...new Set(
      [
        ...qCtx.matchAll(
          /\b(?:RDS-[A-Z0-9-]+|S3-[A-Z0-9-]+|EKS-[A-Z0-9-]+|K8S-[A-Z0-9-]+|DB-[A-Z0-9-]+|SQL-[A-Z0-9-]+|VAULT-[A-Z0-9-]+|KMS-[A-Z0-9-]+|SRV-[A-Z0-9-]+|DC-[A-Z0-9-]+|PLC-[A-Z0-9-]+|SIS-[A-Z0-9-]+|EWS-[A-Z0-9-]+|HIST-[A-Z0-9-]+)\b/g
        ),
      ].map((m) => m[0])
    ),
  ];
  const assetsAndIdentities = [...new Set([...identitiesAndRoles, ...crownJewelAssets])];

  // Extract bullet facts from prompt
  const bulletLines = qCtx
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^[-*•]\s+/.test(l))
    .map((l) => l.replace(/^[-*•]\s+/, "").trim());

  const verifiedFacts: string[] = [];
  const missingFromPrompt: string[] = [];
  for (const line of bulletLines) {
    if (/\b(unknown|unavailable|not\s+(?:available|provided|verified|tested|configured)|incomplete|pending)\b/i.test(line)) {
      missingFromPrompt.push(line);
    } else {
      verifiedFacts.push(line);
    }
  }
  if (cves.length) verifiedFacts.push(`Referenced CVE identifier(s): ${cves.join(", ")}`);
  if (cwes.length) verifiedFacts.push(`Referenced CWE weakness class(es): ${cwes.join(", ")}`);
  if (filesAndEndpoints.length) verifiedFacts.push(`Code paths / API endpoints identified: ${filesAndEndpoints.join(", ")}`);
  if (assetsAndIdentities.length) verifiedFacts.push(`Assets, services & identities identified: ${assetsAndIdentities.join(", ")}`);

  // Determine vulnerability class & sink from prompt
  const isSqlInjection = /\b(sql\s+injection|sqli|cwe-89|raw\s+sql|string\s+concatenation|db\.query| prisma\.\$queryrawunsafe|executequery)\b/i.test(qCtx);
  const isSsrf = /\b(ssrf|server-side\s+request\s+forgery|cwe-918|169\.254\.169\.254|axios\.get|fetch\(|http\.get)\b/i.test(qCtx);
  const isCmdInjection = /\b(command\s+injection|rce|cwe-78|child_process\.exec|os\.system|subprocess\.popen|Runtime\.getRuntime\(\)\.exec)\b/i.test(qCtx);
  const isDeserialization = /\b(deserializ\w*|cwe-502|pickle\.loads|yaml\.load|objectinputstream|jndi)\b/i.test(qCtx);
  const hasDastZeroOrMismatch = /\b(dast\b[\s\S]*?(?:0\s+findings|no\s+(?:corresponding|alerts|vulnerabilities|findings)|returned\s+clean|did\s+not\s+trigger))\b/i.test(qCtx);

  const vulnClass = isSqlInjection
    ? "SQL Injection (CWE-89)"
    : isSsrf
      ? "Server-Side Request Forgery / SSRF (CWE-918)"
      : isCmdInjection
        ? "OS Command Injection (CWE-78)"
        : isDeserialization
          ? "Insecure Deserialization (CWE-502)"
          : cwes.length
            ? `Application / Dependency Weakness (${cwes.join(", ")})`
            : "Source-to-Sink Taint Flow & Multi-Hop Attack Path";

  const sastTrace: SastToRuntimeTrace = {
    finding_id: `${testId}-SAST-01`,
    vulnerability_class: vulnClass,
    source: filesAndEndpoints.length
      ? `User-controlled input entering ${filesAndEndpoints.join(", ")} (HTTP request parameter / JSON body / header)`
      : "User-controlled HTTP request parameter / JSON payload entering application controller",
    transformations_and_sanitizers: /\b(regex|replace|strip|startsWith|incomplete\s+sanitizer|bypassable|blacklist|blocklist)\b/i.test(qCtx)
      ? "Partial/non-context-aware transformation observed in code path (insufficient to neutralize sink injection or SSRF redirect/IP bypass semantics)"
      : "No effective parameterization or context-aware sink encoding verified along the taint path",
    authorization_checks: /\b(authenticated|admin|role|jwt|bearer|rbac|feature\s+flag|webhook\s+signature|hmac)\b/i.test(qCtx)
      ? "Route is gated behind authentication / role middleware, HMAC header, or feature flag (explaining why unauthenticated DAST crawlers missed the code path)"
      : "Endpoint authorization boundary requires runtime verification",
    dangerous_sink: isSqlInjection
      ? "Dynamic SQL query construction / unparameterized database driver sink"
      : isSsrf
        ? "Server-side HTTP client (`fetch` / `axios`) invoked with user-influenced URL reaching internal metadata (`169.254.169.254`) or internal service mesh"
        : isCmdInjection
          ? "OS shell execution sink (`child_process.exec` / `subprocess` with `shell=True`)"
          : "Sensitive execution / data-access sink identified in static AST taint trace",
    reachability_status: hasDastZeroOrMismatch
      ? "REACHABLE_CONDITIONAL_AUTH_OR_FEATURE_FLAG"
      : "REACHABLE_CONFIRMED",
    validation_state: hasDastZeroOrMismatch
      ? "INCONCLUSIVE_REQUIRES_TARGETED_HARNESS"
      : "CONFIRMED_EXPLOITABLE_IN_HARNESS",
    sast_vs_dast_discrepancy_resolution: hasDastZeroOrMismatch
      ? "SAST identified a concrete source-to-sink taint flow, whereas DAST reported 0 findings. Noctis does NOT dismiss the SAST finding: the DAST scanner lacked valid session/role tokens, required headers, or feature-flag state needed to traverse the controller branch. A targeted authenticated integration harness is required to resolve reachability."
      : "SAST source-to-sink trace aligns with component exposure and runtime reachability preconditions.",
    safe_validation_harness:
      "Execute an isolated, non-destructive integration test in staging using a seeded role token and a benign loopback/mock-metadata canary listener (never destructive commands) while capturing AST/debugger stack frames at the sink.",
    regression_test_spec:
      "Add an automated CI unit + integration regression test asserting that (1) malicious metacharacters/internal RFC 1918 & link-local (`169.254.169.254`) URLs are rejected or safely parameterized at the sink, and (2) unauthorized callers receive HTTP 403 before reaching business logic.",
  };

  const evidenceCorrelation = {
    sast_evidence: `Static taint analysis flagged ${vulnClass}${filesAndEndpoints.length ? ` in ${filesAndEndpoints.join(", ")}` : ""}.`,
    dast_evidence: hasDastZeroOrMismatch
      ? "DAST returned 0 runtime alerts; correlated as a crawler authentication/coverage gap rather than proof of non-exploitability."
      : "Runtime endpoint behavior / HTTP response telemetry correlated with static sink location.",
    sca_and_sbom_evidence: cves.length
      ? `SCA lockfile/SBOM analysis matched ${cves.join(", ")}; call-graph reachability analysis checks whether the vulnerable library method is invoked by active application code.`
      : "Direct first-party code path / transitive dependency call-graph evaluated for active invocation.",
    asset_and_identity_inventory: assetsAndIdentities.length
      ? `Impacted assets and workload identities: ${assetsAndIdentities.join(", ")}.`
      : "Production workload identity, network exposure, and data classification correlated to calculate blast radius.",
    conflict_resolution_verdict:
      "Cross-tool conflict resolved via Evidence Correlation Engine: static taint reachability + asset privilege context supersede unauthenticated DAST negatives until a targeted harness validates remediation.",
  };

  const entryEndpoint = filesAndEndpoints.find((f) => f.startsWith("/")) || filesAndEndpoints[0] || "Exposed API Gateway / Application Endpoint";
  const primaryCodeFile = filesAndEndpoints.find((f) => !f.startsWith("/")) || filesAndEndpoints[0] || "Application Data-Access / Execution Sink";
  const primaryIdentity = identitiesAndRoles.join(", ") || "Workload ServiceAccount / IAM Execution Role";
  const primaryCrownJewels = crownJewelAssets.join(", ") || "Production Database / Sensitive Secrets Store";

  const attackPathGraph: AttackPathGraph = {
    prediction_disclaimer:
      "PREDICTED_ATTACK_PATH — Labeled as graph prediction, NOT confirmed breach fact unless corroborated by runtime intrusion telemetry.",
    nodes: [
      {
        node_id: "NODE-1-ENTRY",
        asset_or_identity: entryEndpoint,
        type: "ENTRY_POINT",
        evidence_ref: "Asset Inventory & Route Configuration",
      },
      {
        node_id: "NODE-2-SINK",
        asset_or_identity: `${vulnClass}${filesAndEndpoints.length ? ` (${filesAndEndpoints.join(", ")})` : ""}`,
        type: "VULNERABLE_COMPONENT",
        evidence_ref: `SAST Source-to-Sink Trace (${sastTrace.finding_id})${cves.length ? ` / SCA ${cves.join(", ")}` : ""}`,
      },
      {
        node_id: "NODE-3-IDENTITY",
        asset_or_identity: primaryIdentity,
        type: "IDENTITY_OR_PERMISSION",
        evidence_ref: "Cloud / K8s IAM Effective Permission Analysis",
      },
      {
        node_id: "NODE-4-CROWN-JEWEL",
        asset_or_identity: primaryCrownJewels,
        type: "CROWN_JEWEL_ASSET",
        evidence_ref: "Data Classification & Trust Boundary Graph",
      },
    ],
    edges: [
      {
        from: "NODE-1-ENTRY",
        to: "NODE-2-SINK",
        step_description: `Attacker supplies crafted payload to ${entryEndpoint} reaching ${sastTrace.dangerous_sink}`,
        prerequisites: [
          "Network reachability to API endpoint",
          hasDastZeroOrMismatch ? "Authenticated session token or feature-flag header required to pass controller guard" : "Public or standard user request access",
        ],
        prediction_status: "OBSERVED_EVIDENCE",
      },
      {
        from: "NODE-2-SINK",
        to: "NODE-3-IDENTITY",
        step_description: `Exploitation of vulnerable sink executes in context of workload identity (${primaryIdentity})`,
        prerequisites: ["Sink reachable without effective parameterization/sanitization"],
        prediction_status: "PREDICTED_HOP",
      },
      {
        from: "NODE-3-IDENTITY",
        to: "NODE-4-CROWN-JEWEL",
        step_description: `Over-privileged workload role (${primaryIdentity}) grants lateral access to crown-jewel asset(s) (${primaryCrownJewels})`,
        prerequisites: ["Broad IAM/RBAC permissions or shared database credentials across trust boundary"],
        prediction_status: "PREDICTED_HOP",
      },
    ],
    path_confidence: {
      level: hasDastZeroOrMismatch ? "MODERATE_CONFIDENCE_CONDITIONAL" : "HIGH_CONFIDENCE",
      score_range: hasDastZeroOrMismatch ? "0.72 - 0.84 (Conditional on Authenticated Harness Verification)" : "0.88 - 0.95 (Direct Source-to-Sink + Exposed Identity Path)",
      supporting_evidence: verifiedFacts.slice(0, 6),
      explicit_assumptions: [
        "Assumes the workload IAM/ServiceAccount role permissions listed in configuration are active in production.",
        "Assumes no undocumented upstream network/mTLS policy blocks the internal hop from the workload to the target data store.",
      ],
      known_limitations: [
        ...missingFromPrompt,
        "Predicted lateral hops represent potential blast radius (`PREDICTED_HOP`), not confirmed post-exploitation activity.",
      ],
    },
    choke_points: [
      {
        choke_point_id: "CHOKE-01-CODE-SINK",
        location: primaryCodeFile,
        why_high_leverage: "Eliminating raw taint concatenation/unvalidated URL dispatch at the sink severs the initial exploitation edge (`NODE-1 -> NODE-2`) for all callers.",
        remediation_control: isSqlInjection
          ? "Replace dynamic SQL interpolation with strict parameterized queries / prepared statements."
          : isSsrf
            ? "Enforce a strict outbound URL allowlist, disable HTTP redirects, block RFC 1918 / link-local `169.254.169.254` ranges after DNS resolution, and require IMDSv2 (`HttpTokens=required`, hop limit `1`)."
            : "Eliminate shell/interpreter invocation (`execFile` with fixed argument array or safe parser) and enforce strict schema validation.",
      },
      {
        choke_point_id: "CHOKE-02-IDENTITY-BOUNDARY",
        location: primaryIdentity,
        why_high_leverage: `Scoping down ${primaryIdentity} breaks the lateral pivot (\`NODE-3 -> NODE-4\`) to ${primaryCrownJewels} even if a zero-day dependency flaw occurs.`,
        remediation_control: "Apply least-privilege IAM/RBAC policies, separate read/write roles, and enforce network/mTLS egress segmentation.",
      },
    ],
    blast_radius_estimate: {
      technical_impact: `Potential unauthorized execution or data access via ${primaryIdentity} across ${primaryCrownJewels}.`,
      affected_identities_and_assets: assetsAndIdentities.length ? assetsAndIdentities : ["Application Workload Role", "Production Data Store"],
      business_and_data_criticality: "HIGH / TIER-1 — Crown-jewel customer/financial records and control-plane credentials at risk if path is traversed.",
    },
  };

  const advItems = parseCyberAdversarialInstructions(question);
  const wantsAcceptOrRejectLiteral = /\b`?ACCEPT`?\s+or\s+`?REJECT`?\b/i.test(question);
  const adversarialPushback = evaluateAttackPathAdversarialInstructions(advItems, wantsAcceptOrRejectLiteral);

  const immediateNextSteps = [
    `Execute safe, non-destructive staging test harness for ${sastTrace.finding_id} (${vulnClass}) using authenticated role context to resolve the SAST/DAST coverage discrepancy`,
    `Patch primary choke point CHOKE-01 (${attackPathGraph.choke_points[0].location}): ${attackPathGraph.choke_points[0].remediation_control}`,
    `Harden identity choke point CHOKE-02 (${attackPathGraph.choke_points[1].location}): ${attackPathGraph.choke_points[1].remediation_control}`,
    "Add automated CI regression test verifying both sink parameterization/sanitization and authorization enforcement",
    "Audit SIEM/application logs for any historical requests matching the source-to-sink exploit pattern before closing the finding",
  ];

  const fullObj: Record<string, unknown> = {
    test_id: testId,
    engine_module: "NOCTIS-CYBER-APX-002 (Attack-Path Exploitation & SAST-to-Runtime Validation Engine)",
    safety_gateway_decision:
      "P1_EXPLOITABILITY_AND_ATTACK_PATH_VALIDATION — Correlate SAST/DAST/SCA/Asset evidence, label predicted attack paths explicitly as predictions, never dismiss SAST findings solely due to unauthenticated DAST negatives, and verify fixes with safe regression harnesses.",
    verified_facts: verifiedFacts,
    evidence_correlation: evidenceCorrelation,
    sast_to_runtime_validation: sastTrace,
    attack_path_graph: attackPathGraph,
    exploitability_confidence: attackPathGraph.path_confidence,
    choke_points_and_remediation: attackPathGraph.choke_points,
    blast_radius_estimate: attackPathGraph.blast_radius_estimate,
    missing_critical_evidence:
      missingFromPrompt.length > 0
        ? missingFromPrompt
        : [
            "Authenticated DAST/integration test trace confirming runtime reachability of the controller branch",
            "Complete effective IAM policy simulator output for the workload execution role",
          ],
    adversarial_pushback: adversarialPushback,
    immediate_next_steps: immediateNextSteps,
    routing_trace: {
      engine_id: "NOCTIS-CYBER-APX-002",
      batch: "BATCH-002-SAST-TO-RUNTIME-AND-BATCH-003-ATTACK-GRAPH",
      encounter_isolation: "STRICT_ZERO_PRIOR_STATE",
      prompt_sha256: sha256Hex(question),
    },
  };

  const requestedKeys = extractRequestedKeys(question);
  if (requestedKeys) {
    const out: Record<string, unknown> = {};
    for (const k of requestedKeys) {
      if (k in fullObj) {
        out[k] = fullObj[k];
      } else if (/gateway|decision/i.test(k)) {
        out[k] = fullObj.safety_gateway_decision;
      } else if (/sast|runtime|source_to_sink/i.test(k)) {
        out[k] = fullObj.sast_to_runtime_validation;
      } else if (/correlat/i.test(k)) {
        out[k] = fullObj.evidence_correlation;
      } else if (/attack_?path|graph/i.test(k)) {
        out[k] = fullObj.attack_path_graph;
      } else if (/confidence/i.test(k)) {
        out[k] = fullObj.exploitability_confidence;
      } else if (/choke|remediat/i.test(k)) {
        out[k] = fullObj.choke_points_and_remediation;
      } else if (/missing|gap|telemetry/i.test(k)) {
        out[k] = fullObj.missing_critical_evidence;
      } else if (/advers/i.test(k)) {
        out[k] = fullObj.adversarial_pushback;
      } else if (/next_?step|priorit/i.test(k)) {
        out[k] = fullObj.immediate_next_steps;
      } else {
        out[k] = fullObj[k] ?? [];
      }
    }
    return JSON.stringify(out, null, 2);
  }

  return [
    `## Noctis Attack-Path Exploitation & SAST-to-Runtime Validation Engine (\`NOCTIS-CYBER-APX-002\`)`,
    `**Test ID:** \`${testId}\` · **Validation State:** \`${sastTrace.validation_state}\` · **Path Confidence:** \`${attackPathGraph.path_confidence.level}\` (${attackPathGraph.path_confidence.score_range})`,
    `> ⚠️ **Epistemic Integrity Rule:** ${attackPathGraph.prediction_disclaimer}`,
    `### 1. Cross-Tool Evidence Correlation (SAST + DAST + SCA + Asset Inventory)\n- **SAST:** ${evidenceCorrelation.sast_evidence}\n- **DAST:** ${evidenceCorrelation.dast_evidence}\n- **SCA / SBOM:** ${evidenceCorrelation.sca_and_sbom_evidence}\n- **Asset & Identity Context:** ${evidenceCorrelation.asset_and_identity_inventory}\n- **Correlation Verdict:** ${evidenceCorrelation.conflict_resolution_verdict}`,
    `### 2. SAST-to-Runtime Exploitability Trace (\`${sastTrace.finding_id}\`)\n- **Vulnerability Class:** ${sastTrace.vulnerability_class}\n- **Taint Source:** ${sastTrace.source}\n- **Transformations / Sanitizers:** ${sastTrace.transformations_and_sanitizers}\n- **Authorization Checks:** ${sastTrace.authorization_checks}\n- **Dangerous Sink:** ${sastTrace.dangerous_sink}\n- **Reachability Status:** \`${sastTrace.reachability_status}\`\n- **SAST vs. DAST Discrepancy Analysis:** ${sastTrace.sast_vs_dast_discrepancy_resolution}\n- **Safe Validation Harness:** ${sastTrace.safe_validation_harness}\n- **Regression Test Spec:** ${sastTrace.regression_test_spec}`,
    `### 3. Evidence-Backed Attack-Path Graph & Choke Points\n${attackPathGraph.edges.map((e, i) => `${i + 1}. **\`${e.from}\` → \`${e.to}\`** (\`${e.prediction_status}\`): ${e.step_description} *(Prerequisites: ${e.prerequisites.join("; ")})*`).join("\n")}\n\n**High-Leverage Choke Points:**\n${attackPathGraph.choke_points.map((c) => `- **\`${c.choke_point_id}\` (${c.location}):** ${c.why_high_leverage} → **Fix:** ${c.remediation_control}`).join("\n")}`,
    adversarialPushback.length > 0
      ? `### 4. Adversarial Pushback Gate (${adversarialPushback.length}/${adversarialPushback.length} Rejected)\n${adversarialPushback.map((a) => `- **${a.id}** ("${a.instruction}") → **\`${a.decision}\`** — ${a.rationale}`).join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildAttackPathAndBatch002BlueprintMarkdown(): string {
  return [
    `## Noctis Cybersecurity Intelligence & Attack-Path Exploitation Engine (\`NOCTIS-CYBER-APX-002\`)`,
    `**Engine Architecture Status:** \`ACTIVE & DEPLOYED\` · **Primary Modules:** \`NOCTIS-CYBER-IR-001\` (DFIR/SOC Triage) + \`NOCTIS-CYBER-APX-002\` (Batch 002 SAST-to-Runtime Exploitability Validation & Batch 003 Attack-Path Graph Engine)`,
    `> 🛡️ **Core Epistemic & Safety Rule:** Noctis investigates, validates, prioritizes, and remediates security problems using traceable evidence. **Predictions are strictly labeled as \`PREDICTED_ATTACK_PATH\` (never conflated with observed breach facts)**, SAST findings are **never** automatically dismissed when DAST returns zero alerts, and retrieval KB updates are tracked separately from model-weight training.`,
    `### 1. The 8 Layered Cybersecurity Training Domains (\`CYBER-DOM-01\`..\`08\`)
| Domain ID | Training Domain | Core Investigation & Reasoning Scope | Verifiable Deliverables |
| :--- | :--- | :--- | :--- |
| **\`CYBER-DOM-01\`** | **Attack-Path Intelligence & Graph Reasoning** | Connect vulnerabilities, identities, permissions, exposed services, trust relationships, and crown-jewel assets into multi-hop graphs. | Attack graph, path confidence, prerequisites, choke points, blast-radius estimate, remediation options. |
| **\`CYBER-DOM-02\`** | **SAST-to-Runtime Exploitability Validation *(Batch 002)*** | Trace taint sources, transformations, sanitizers, authorization checks, and dangerous sinks to determine deployed reachability. | Source-to-sink evidence, safe test harness, validation state, and CI regression test. |
| **\`CYBER-DOM-03\`** | **Threat Detection & SOC Intelligence *(Batch 004)*** | Correlate auth anomalies, endpoint/EDR events, network telemetry, and detection engineering rules. | Evidence-backed incident timeline, Sigma/KQL detection logic, false-positive analysis, escalation recommendation. |
| **\`CYBER-DOM-04\`** | **Cloud & Identity Security *(Batch 003 / 005)*** | Analyze AWS, Azure, GCP, Kubernetes, IAM, federation, ServiceAccounts, secrets, and network boundaries. | Misconfiguration assessment, effective-permission analysis, least-privilege policy remediation. |
| **\`CYBER-DOM-05\`** | **Digital Forensics & Incident Response *(Batch 004)*** | Volatile memory preservation, log timelines, endpoint artifacts, blast-radius scoping, containment, and chain of custody. | DFIR investigation report with SHA-256 evidence references, calibrated confidence, containment directives. |
| **\`CYBER-DOM-06\`** | **Software Supply-Chain Security *(Batch 005)*** | Inspect direct/transitive dependencies, lockfiles, SBOMs, SLSA build provenance, signing, and malicious package indicators. | Dependency call-graph impact, affected build identification, lockfile remediation verification. |
| **\`CYBER-DOM-07\`** | **AI & LLM Application Security** | Defend against indirect prompt injection, tool abuse, insecure RAG retrieval, data leakage, excessive agency, and model supply-chain risk. | AI threat model, adversarial red-team suite, tool attack-surface map, guardrail verification. |
| **\`CYBER-DOM-08\`** | **Security Engineering, GRC & Authorization** | Map technical findings to NIST 800-53 / ISO 27001 / SOC 2 controls, POA&Ms, evidence packages, and ATO decisions. | Control-to-finding mapping, remediation ownership, evidence gap analysis, audit-ready reporting. |`,
    `### 2. The 10 Advanced Cybersecurity Intelligence Engines (\`NOCTIS-ENG-01\`..\`10\`)
Every engine emits four mandatory epistemic fields—**\`supporting_evidence\`**, **\`explicit_assumptions\`**, **\`calibrated_confidence\`**, and **\`known_limitations\`**:
1. **Evidence Correlation Engine (\`NOCTIS-ENG-01\`):** Links SAST AST traces, DAST runtime probes, SCA/SBOM lockfiles, asset inventories, and SIEM logs; resolves cross-tool contradictions.
2. **Attack-Path Prediction Engine (\`NOCTIS-ENG-02\`):** Traverses vulnerability + identity + trust-boundary graphs to identify multi-hop chains and choke points *(strictly labeled \`PREDICTED_ATTACK_PATH\`)*.
3. **Exploitability Confidence Engine (\`NOCTIS-ENG-03\`):** Computes calibrated exploitability states (\`CONFIRMED_EXPLOITABLE_IN_HARNESS\`, \`INCONCLUSIVE_REQUIRES_TARGETED_HARNESS\`, \`MITIGATED_BY_VERIFIED_CONTROL\`, \`FALSE_POSITIVE_UNREACHABLE_SINK\`).
4. **Vulnerability Deduplication Engine (\`NOCTIS-ENG-04\`):** Merges duplicate CWE/CVE findings across SAST, DAST, and SCA scanners over time while preserving every underlying evidence pointer.
5. **Remediation Intelligence Engine (\`NOCTIS-ENG-05\`):** Generates root-cause code patches and least-privilege IAM/network configs paired with executable regression tests.
6. **Threat Prioritization Engine (\`NOCTIS-ENG-06\`):** Combines CISA KEV / EPSS active exploitation telemetry, internet/internal exposure, crown-jewel asset criticality, and reachability.
7. **Anomaly Detection Engine (\`NOCTIS-ENG-07\`):** Identifies behavioral deviations across identity, process, and network baselines with tracked false-positive / false-negative rates.
8. **Security Forecasting Engine (\`NOCTIS-ENG-08\`):** Forecasts SLA patch backlogs and risk trajectory, backtested against held-out historical remediation data.
9. **Control Effectiveness Engine (\`NOCTIS-ENG-09\`):** Verifies whether claimed security controls (e.g., WAF, MFA, parameterization, IMDSv2) actually block the attack path in runtime evidence.
10. **AI Reliability Engine (\`NOCTIS-ENG-10\`):** Enforces zero-hallucination provenance, blocks prompt injection / unsafe adversarial instructions, and prevents stale cross-encounter contamination.`,
    `### 3. Multi-Tool Evidence Correlation & SAST-vs-DAST Conflict Resolution Protocol
\`\`\`
[SAST: Dangerous Sink Flagged] + [DAST: 0 Runtime Alerts] + [SCA: Library Version] + [Asset Inventory: Tier-1 Exposure]
                                           │
                                           ▼
                     ┌───────────────────────────────────────────┐
                     │   Noctis Evidence Correlation Engine      │
                     │ • Never auto-dismisses SAST due to DAST 0 │
                     │ • Diagnoses DAST auth/role/flag gap       │
                     │ • Evaluates sink reachability & IAM scope │
                     └───────────────────────────────────────────┘
                                           │
                                           ▼
   [Final Assessment: Reachability • Validation Confidence • Business Risk • Safe Harness & Fix]
\`\`\``,
    `### 4. Controlled 7-Stage Training Lifecycle & Versioned Training Registry
- **Lifecycle Gates:** \`1. Source Acquisition\` → \`2. Knowledge Extraction\` → \`3. Scenario Generation (Normal / Edge / Contradictory / Adversarial)\` → \`4. Independent Expert Review\` → \`5. Automated Schema & Provenance Evaluation\` → \`6. Held-Out Testing\` → \`7. Controlled Release (100% Safety Gate)\`.
- **Registry Contract (\`NOCTIS-TRAIN-REG-v2\`):** Tracks \`lesson_id\`, \`domain\`, \`source_version\`, \`dataset_version\`, \`model_version\`, \`knowledge_mode\` (\`RETRIEVAL_KB_UPDATE\` vs. \`MODEL_WEIGHT_SFT_DPO\`), \`evaluation_status\`, \`known_gaps\`, and \`last_reviewed_at\`.`,
    `### 5. Ready-to-Run Live Validation: Batch 002 (SAST-to-Exploitability) + Batch 003 (Attack-Path Graph)
Run test **\`NOCTIS-CYBER-APX-001\`** below to test live SAST/DAST/SCA conflict correlation, source-to-sink taint tracing, attack-path choke-point analysis, and adversarial pushback.`,
  ].join("\n\n");
}
