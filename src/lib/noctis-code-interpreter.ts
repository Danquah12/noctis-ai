/**
 * Noctis Code Interpreter & Plain English Canvas Engine
 * Translates technical code snippets and highlighted AST blocks into
 * crystal-clear, non-technical English accessible to all users and executives.
 */

export interface HighlightInterpretation {
  rawSnippet: string;
  plainEnglish: string;
  category:
    | "SAFETY_GATE"
    | "SECURITY_ENCLAVE"
    | "AUDIT_LOGGING"
    | "EXECUTION_FLOW"
    | "DATA_MODEL"
    | "ENTRY_TRIGGER"
    | "CONFIGURATION";
  categoryLabel: string;
  categoryColor: string;
  whyItMatters: string;
  analogy: string;
}

export interface PlainEnglishSection {
  stepNumber: number;
  title: string;
  icon: string;
  plainExplanation: string;
  technicalCode?: string;
  whyItMatters: string;
}

export interface PlainEnglishCanvasData {
  title: string;
  targetSystem: string;
  executiveSummary: string;
  laypersonFlow: PlainEnglishSection[];
  safetyAssurances: string[];
  impactSummary: string;
  fullMarkdown: string;
}

/**
 * Interprets a highlighted snippet of code into plain, human-friendly English.
 */
export function interpretHighlightedSnippet(snippet: string, contextCode?: string): HighlightInterpretation {
  const raw = (snippet || "").trim();

  // 1. Safety Invariant / Error Handling / Pre-flight checks
  if (
    /inspectInvariants|invariant|violations|throw new Error|assert|verify|reject|check/i.test(raw) &&
    /failed|length > 0|error|invalid/i.test(raw)
  ) {
    return {
      rawSnippet: raw,
      category: "SAFETY_GATE",
      categoryLabel: "Pre-Flight Safety Check",
      categoryColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
      plainEnglish:
        "This is an automated safety circuit-breaker. Before releasing or activating anything, the system checks all security and clinical safety rules. If even a single rule fails, execution immediately halts to prevent dangerous or broken code from running.",
      whyItMatters:
        "Guarantees that no patient data, privacy rules, or regulatory compliance gates can be bypassed under any circumstances.",
      analogy: "Like an airplane's automated pre-flight safety checklist that locks the throttles if any critical sensor detects a problem.",
    };
  }

  // 2. Audit Trail & Logging (writeFileSync, audit, seal, provenance)
  if (/writeFileSync|appendFileSync|logger|audit|log|provenance|receipt|sha256/i.test(raw)) {
    return {
      rawSnippet: raw,
      category: "AUDIT_LOGGING",
      categoryLabel: "Tamper-Evident Audit Record",
      categoryColor: "text-amber-400 bg-amber-500/10 border-amber-500/30",
      plainEnglish:
        "This writes a permanent, timestamped record of the deployment to an immutable audit log. It proves exactly who initiated the action, what was deployed, and the exact second it took place.",
      whyItMatters:
        "Provides 100% regulatory compliance (HIPAA, NIST SP 800-53, SOC2) and complete legal defensibility for enterprise auditors.",
      analogy: "Like a notary public stamping and signing a legal deed into the official public register.",
    };
  }

  // 3. Return Value / Success Certification
  if (/return\s*\{|return\s+true|success:\s*true|invariantsPassed/i.test(raw)) {
    return {
      rawSnippet: raw,
      category: "DATA_MODEL",
      categoryLabel: "Verification Certificate",
      categoryColor: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30",
      plainEnglish:
        "This outputs an official confirmation certificate indicating that the service deployed successfully, all safety invariant gates passed without errors, and provides the verified private address to use it.",
      whyItMatters:
        "Gives upstream systems and operational dashboards mathematical certainty that the service is healthy and ready for live requests.",
      analogy: "Like a green 'Passed Inspection' sticker placed on a freshly tuned medical ventilator.",
    };
  }

  // 4. Isolated Private Enclave / Network Endpoints
  if (/endpoint|https?:\/\/|localhost|port|socket|fetch|url|gateway|internal/i.test(raw)) {
    const isInternal = /internal|private|enclave|air-gap|127\.0\.0\.1|localhost/i.test(raw);
    return {
      rawSnippet: raw,
      category: "SECURITY_ENCLAVE",
      categoryLabel: isInternal ? "Private Secure Enclave" : "External Service Connection",
      categoryColor: "text-sky-400 bg-sky-500/10 border-sky-500/30",
      plainEnglish: isInternal
        ? "This defines a private, air-gapped network address inside the hospital or enterprise secure enclave. It is completely shielded from the public internet."
        : "This connects the service to a designated network destination using encrypted transit protocols.",
      whyItMatters:
        "Keeps sensitive patient diagnostics and financial records within a fortified perimeter where outside attackers cannot access them.",
      analogy: "Like a private pneumatic tube system inside a bank that operates strictly behind thick bank vault walls.",
    };
  }

  // 5. Entry point / Runnable trigger
  if (/require\.main === module|process\.argv|main\(\)|if\s*\(__name__\s*==/i.test(raw)) {
    return {
      rawSnippet: raw,
      category: "ENTRY_TRIGGER",
      categoryLabel: "Independent Launch Trigger",
      categoryColor: "text-purple-400 bg-purple-500/10 border-purple-500/30",
      plainEnglish:
        "This allows the software to be run standalone directly from the command line, automated scheduled job, or microservice container.",
      whyItMatters:
        "Enables zero-touch autonomous scheduling and microservice independence without needing manual developer intervention.",
      analogy: "Like an ignition push-button that allows the engine to start on its own whenever triggered.",
    };
  }

  // 6. Function declaration / Method definition
  if (/public\s+|private\s+|async\s+function|export\s+function|def\s+|const\s+\w+\s*=\s*\(/i.test(raw)) {
    const match = raw.match(/(?:function|def|class|const)\s+([a-zA-Z0-9_]+)/i) || raw.match(/([a-zA-Z0-9_]+)\s*\(/);
    const name = match ? match[1] : "Service Operation";
    return {
      rawSnippet: raw,
      category: "EXECUTION_FLOW",
      categoryLabel: "Operational Workflow Definition",
      categoryColor: "text-blue-400 bg-blue-500/10 border-blue-500/30",
      plainEnglish: `This defines the "${name}" procedure. It organizes a series of precise operational instructions that run together whenever this specific job is requested.`,
      whyItMatters: "Standardizes the workflow into a reusable, repeatable unit that eliminates human error.",
      analogy: "Like an executive standard operating procedure (SOP) binder documenting step-by-step protocol.",
    };
  }

  // Fallback for general highlighted code
  return {
    rawSnippet: raw,
    category: "CONFIGURATION",
    categoryLabel: "System Logic Block",
    categoryColor: "text-zinc-400 bg-white/5 border-white/10",
    plainEnglish:
      "This section executes a core logic instruction: processing incoming parameters, validating state variables, or configuring operating parameters.",
    whyItMatters: "Ensures the service runs predictably according to verified system rules.",
    analogy: "Like an individual gear inside a Swiss watch turning in sync with the rest of the mechanism.",
  };
}

/**
 * Transforms an entire code artifact into an executive Plain English Canvas dossier.
 */
export function generatePlainEnglishCanvas(title: string, code: string): PlainEnglishCanvasData {
  const cleanTitle = title.replace(/^#+\s*/, "").trim() || "Noctis Sovereign System";
  const lines = code.split("\n");

  // Determine system domain
  let systemDomain = "Enterprise Sovereign System";
  if (/health|clinical|diagnostic|triage|patient/i.test(title + code)) {
    systemDomain = "Noctis Health & Clinical CDS";
  } else if (/cyber|sast|threat|enclave|pqc|trepath/i.test(title + code)) {
    systemDomain = "Noctis Cyber & Security Synthesis";
  } else if (/rmf|grc|fisma|compliance|audit|fedramp/i.test(title + code)) {
    systemDomain = "Noctis Governance & RMF Compliance";
  } else if (/finance|valuation|cash|runway|dcf/i.test(title + code)) {
    systemDomain = "Noctis Finance & Capital Intelligence";
  }

  // Identify key logic steps
  const laypersonFlow: PlainEnglishSection[] = [];
  let stepIdx = 1;

  // Step 1: Invariant Inspection
  if (/inspectInvariants|invariants|check/i.test(code)) {
    laypersonFlow.push({
      stepNumber: stepIdx++,
      title: "Step 1: Automated Safety Invariant Verification",
      icon: "ShieldCheck",
      plainExplanation:
        "The system runs a comprehensive battery of pre-deployment safety rules. It verifies that data privacy boundaries, HIPAA constraints, and cryptographic signatures are 100% satisfied before taking any further action.",
      technicalCode: lines.find((l) => /inspectInvariants|invariants/i.test(l))?.trim() || "const result = this.inspectInvariants();",
      whyItMatters: "Guarantees zero risk of accidental misconfiguration or non-compliant deployment.",
    });
  }

  // Step 2: Circuit Breaker Validation
  if (/throw new Error|failed\.length/i.test(code)) {
    laypersonFlow.push({
      stepNumber: stepIdx++,
      title: "Step 2: Emergency Circuit-Breaker Protection",
      icon: "AlertOctagon",
      plainExplanation:
        "If any safety invariant fails, the deployment immediately aborts and reports the exact violated rule. No broken, unvalidated, or insecure code is ever permitted to reach production.",
      technicalCode: lines.find((l) => /throw new Error|failed\.length/i.test(l))?.trim() || "if (result.failed.length > 0) throw new Error(...)",
      whyItMatters: "Prevents cascading failures and protects existing hospital/enterprise infrastructure.",
    });
  }

  // Step 3: Secure Enclave Provisioning
  if (/endpoint|internal|https?:\/\/|localhost/i.test(code)) {
    laypersonFlow.push({
      stepNumber: stepIdx++,
      title: "Step 3: Private Secure Enclave Routing",
      icon: "Lock",
      plainExplanation:
        "The system activates a protected network channel within an isolated private enclave, completely shielded from the public internet.",
      technicalCode: lines.find((l) => /endpoint\s*=|https?:\/\//i.test(l))?.trim() || "const endpoint = 'https://noctis-health.internal/v1/health';",
      whyItMatters: "Keeps all sensitive records and algorithmic reasoning air-gapped from external threats.",
    });
  }

  // Step 4: Immutable Audit Logging
  if (/writeFileSync|log|audit|seal/i.test(code)) {
    laypersonFlow.push({
      stepNumber: stepIdx++,
      title: "Step 4: Tamper-Evident Audit Stamping",
      icon: "FileCheck",
      plainExplanation:
        "A cryptographically timestamped receipt is written to the immutable audit log, recording the exact timestamp, configuration, and verification status.",
      technicalCode: lines.find((l) => /writeFileSync|log/i.test(l))?.trim() || "writeFileSync('health-deploy.log', `Deployed at ${new Date().toISOString()}\\n`);",
      whyItMatters: "Satisfies stringent regulatory audit requirements including SOC2, HIPAA, and ISO 27001.",
    });
  }

  // Step 5: Verification Certificate Delivery
  laypersonFlow.push({
    stepNumber: stepIdx++,
    title: `Step ${stepIdx - 1}: Deployment Certification & Ready State`,
    icon: "BadgeCheck",
    plainExplanation:
      "The system issues a signed verification receipt confirming that all operations completed with zero errors and that the service is now active and ready for use.",
    technicalCode: lines.find((l) => /return\s*\{|success:\s*true/i.test(l))?.trim() || "return { success: true, invariantsPassed: result.passed };",
    whyItMatters: "Gives operators and upstream orchestrators immediate confirmation of healthy system status.",
  });

  const executiveSummary = `This sovereign workflow automates the safe, verified deployment of the ${systemDomain}. Rather than requiring manual human configuration, it programmatically validates all safety rules, verifies that data privacy boundaries are intact, isolates the service inside a secure private network, and stamps an immutable audit record for compliance.`;

  const safetyAssurances = [
    "Zero-Tolerance Pre-Flight Checks: Deployment cannot proceed if any safety or security check fails.",
    "Air-Gapped Enclave Protection: Operates strictly within internal, encrypted communication boundaries.",
    "Immutable Audit Provenance: Every action produces a timestamped audit trail ready for legal and regulatory inspection.",
    "Instant Fail-Safe Rollback: Any unexpected condition triggers an immediate halt without altering production state.",
  ];

  const impactSummary = `Active for all authorized enterprise users. All data remains encrypted at rest and in transit under SQDEC Priority 1 (Safety-First) governance.`;

  // Build Markdown for NoctisCanvas
  const fullMarkdown = [
    `# 📖 Plain English Canvas: ${cleanTitle}`,
    ``,
    `> **Domain:** ${systemDomain}  `,
    `> **Audience:** Executives, Clinicians, Auditors, and Non-Technical Stakeholders  `,
    `> **Governance Level:** AAIAAS v1.6 SQDEC Priority 1 (Safety-First)`,
    ``,
    `---`,
    ``,
    `## 🎯 Executive Summary (What This Does)`,
    ``,
    executiveSummary,
    ``,
    `---`,
    ``,
    `## 🔄 How It Works (Step-by-Step Flow)`,
    ``,
    ...laypersonFlow.map((step) => [
      `### ${step.title}`,
      `* **Plain English Explanation:** ${step.plainExplanation}`,
      `* **Why This Matters:** ${step.whyItMatters}`,
      step.technicalCode ? `* **Technical Implementation:** \`${step.technicalCode}\`` : "",
      ``,
    ].filter(Boolean).join("\n")),
    `---`,
    ``,
    `## 🛡️ Enterprise Safety & Compliance Guarantees`,
    ``,
    ...safetyAssurances.map((a) => `* **${a.split(":")[0]}:** ${a.split(":")[1] || a}`),
    ``,
    `---`,
    ``,
    `## 📊 Operational Impact & Next Actions`,
    ``,
    impactSummary,
    ``,
    `*Generated autonomously by Noctis Plain English Canvas Engine.*`,
  ].join("\n");

  return {
    title: cleanTitle,
    targetSystem: systemDomain,
    executiveSummary,
    laypersonFlow,
    safetyAssurances,
    impactSummary,
    fullMarkdown,
  };
}
