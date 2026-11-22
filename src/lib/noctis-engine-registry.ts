export type NoctisEngineCategory = "frontier" | "specialist" | "workspace" | "suite";

export interface NoctisEngineProfile {
  id: string;
  name: string;
  category: NoctisEngineCategory;
  thinkingLabel: string;
  thinkingStages: readonly [string, string, string, string];
  thinkingDirective: string;
  preferredProviderHint?: "noctis" | "gemini" | "openai" | "groq" | "xai";
}

function buildDirective(domainFocus: string, verificationChecklist: string): string {
  return (
    `DEEP THINKING PROTOCOL (${domainFocus}): Before emitting your final answer, begin with a concise, high-signal <think>...</think> reasoning block where you: ` +
    `(1) decompose the objective, explicit constraints, and missing unknowns; ` +
    `(2) ${verificationChecklist}; and ` +
    `(3) audit your draft for zero fabrication, arithmetic accuracy, and internal consistency before closing </think> and delivering the complete response.`
  );
}

export const NOCTIS_ENGINE_REGISTRY: Record<string, NoctisEngineProfile> = {
  // ==========================================
  // FRONTIER & SOVEREIGN INTELLIGENCE ENGINES (8)
  // ==========================================
  "noctis-ultra": {
    id: "noctis-ultra",
    name: "Noctis Ultra",
    category: "frontier",
    thinkingLabel: "Noctis Ultra is deep thinking…",
    thinkingStages: [
      "Analyzing prompt structure & isolating authoritative facts…",
      "Cross-checking parameters, calculations & safety constraints…",
      "Running deep multi-step reasoning & differential synthesis…",
      "Running independent consistency & zero-fabrication audit…",
    ],
    thinkingDirective: buildDirective(
      "Noctis Ultra Sovereign Core",
      "verify all supplied quantities, timelines, calculations, and sovereign safety invariants step-by-step",
    ),
    preferredProviderHint: "noctis",
  },
  "noctis-o3-deep": {
    id: "noctis-o3-deep",
    name: "Noctis Deep Thinking",
    category: "frontier",
    thinkingLabel: "Noctis Deep Thinking is verifying proofs & counter-examples…",
    thinkingStages: [
      "Formalizing premises, axioms & boundary constraints…",
      "Executing multi-pass deductive proof & counter-example search…",
      "Stress-testing edge cases & alternative hypotheses…",
      "Auditing logical soundness & eliminating unsupported leaps…",
    ],
    thinkingDirective: buildDirective(
      "Noctis o1/o3 Deep Reasoning Engine",
      "derive formal multi-pass deductive proofs, search actively for counter-examples, and validate boundary cases",
    ),
    preferredProviderHint: "noctis",
  },
  "claude-3-7-sonnet": {
    id: "claude-3-7-sonnet",
    name: "Claude 3.7 Sonnet",
    category: "frontier",
    thinkingLabel: "Claude 3.7 Sonnet is running hybrid extended thinking…",
    thinkingStages: [
      "Parsing architectural context, requirements & nuanced intent…",
      "Executing extended hybrid reasoning across system trade-offs…",
      "Validating code paths, invariants & failure modes…",
      "Refining synthesis for structural clarity & precision…",
    ],
    thinkingDirective: buildDirective(
      "Claude 3.7 Sonnet Hybrid Reasoning",
      "weigh competing architectural trade-offs, verify interfaces and invariants, and trace failure modes cleanly",
    ),
    preferredProviderHint: "noctis",
  },
  "gpt-4o": {
    id: "gpt-4o",
    name: "ChatGPT / GPT-4o",
    category: "frontier",
    thinkingLabel: "ChatGPT / GPT-4o is synthesizing deep reasoning…",
    thinkingStages: [
      "Decomposing multimodal context & structured objectives…",
      "Running cross-domain verification & analytical checks…",
      "Synthesizing structured recommendations & actionable clarity…",
      "Checking completeness against every user requirement…",
    ],
    thinkingDirective: buildDirective(
      "GPT-4o Deep Reasoning Mode",
      "validate quantitative claims, cross-check domain facts, and verify every constraint in the prompt",
    ),
    preferredProviderHint: "openai",
  },
  "gemini-35-flash-lite": {
    id: "gemini-35-flash-lite",
    name: "Gemini 3.5 Flash-Lite",
    category: "frontier",
    thinkingLabel: "Gemini 3.5 Flash-Lite is running high thinkingConfig…",
    thinkingStages: [
      "Ingesting long-context evidence & schema contracts…",
      "Executing native high-level thinking pass & strict validation…",
      "Cross-checking API payloads, grounded facts & edge cases…",
      "Finalizing concise, verified structured response…",
    ],
    thinkingDirective: buildDirective(
      "Gemini 3.5 Flash-Lite High Thinking",
      "validate schema contracts, ground every factual claim in context, and verify numerical precision",
    ),
    preferredProviderHint: "gemini",
  },
  "grok-3": {
    id: "grok-3",
    name: "xAI Grok 3",
    category: "frontier",
    thinkingLabel: "xAI Grok 3 is executing deductive first-principles reasoning…",
    thinkingStages: [
      "Stripping assumptions down to first-principles telemetry…",
      "Running adversarial truth checks & hypothesis falsification…",
      "Cross-validating quantitative bounds & empirical evidence…",
      "Compiling direct, unhedged, fact-grounded conclusions…",
    ],
    thinkingDirective: buildDirective(
      "xAI Grok 3 Deductive Engine",
      "reason from first principles, challenge weak assumptions aggressively, and confirm empirical calculations",
    ),
    preferredProviderHint: "xai",
  },
  "deepseek-r1": {
    id: "deepseek-r1",
    name: "DeepSeek R1",
    category: "frontier",
    thinkingLabel: "DeepSeek R1 is running chain-of-thought verification…",
    thinkingStages: [
      "Breaking problem into verifiable sub-derivations…",
      "Testing intermediate equations & symbolic transitions…",
      "Self-critiquing reasoning chain for subtle contradictions…",
      "Verifying final answer alignment with checked derivation…",
    ],
    thinkingDirective: buildDirective(
      "DeepSeek R1 Chain-of-Thought Verifier",
      "check every intermediate derivation step, self-correct arithmetic errors, and test edge cases explicitly",
    ),
    preferredProviderHint: "noctis",
  },
  "llama-3-3-70b": {
    id: "llama-3-3-70b",
    name: "Llama 3.3 70B",
    category: "frontier",
    thinkingLabel: "Llama 3.3 70B is running structured Groq reasoning…",
    thinkingStages: [
      "Isolating core query constraints & factual inputs…",
      "Executing structured multi-step deduction & validation…",
      "Verifying code/logic soundness & missing-data boundaries…",
      "Auditing final response for accuracy & conciseness…",
    ],
    thinkingDirective: buildDirective(
      "Llama 3.3 70B Deep Reasoning",
      "walk through each premise deliberately and verify zero fabricated facts or skipped steps",
    ),
    preferredProviderHint: "groq",
  },

  // ==========================================
  // DOMAIN SPECIALIST ENGINES (5)
  // ==========================================
  "noctis-cyber-dfir": {
    id: "noctis-cyber-dfir",
    name: "XTRIKE Cyber DFIR",
    category: "specialist",
    thinkingLabel: "XTRIKE Cyber DFIR is auditing attack paths & SAST rules…",
    thinkingStages: [
      "Mapping attack surface, threat vectors & MITRE ATT&CK TTPs…",
      "Auditing CWE/OWASP Top 10 sinks, CVSS/EPSS & taint boundaries…",
      "Validating defensive containment & parameterized remediations…",
      "Checking evidence attribution & zero-fabrication security posture…",
    ],
    thinkingDirective: buildDirective(
      "XTRIKE Cyber DFIR Specialist",
      "evaluate threat vectors, CWE/OWASP controls, CVSS/EPSS context, and strictly defensive remediation boundaries",
    ),
    preferredProviderHint: "noctis",
  },
  "noctis-juris-law": {
    id: "noctis-juris-law",
    name: "Noctis Juris & Law",
    category: "specialist",
    thinkingLabel: "Noctis Juris & Law is synthesizing IRAC & statutory doctrine…",
    thinkingStages: [
      "Identifying governing jurisdiction, Issues & dispositive facts…",
      "Mapping controlling Rules, statutes, elements & exceptions…",
      "Executing element-by-element Application & counter-arguments…",
      "Auditing jurisdictional limits, ambiguities & Conclusion rigor…",
    ],
    thinkingDirective: buildDirective(
      "Noctis Juris & Law IRAC Engine",
      "analyze Issue, Rule, Application, and Conclusion systematically while distinguishing majority doctrine from exceptions and identifying missing facts",
    ),
    preferredProviderHint: "noctis",
  },
  "noctis-clinical-dx": {
    id: "noctis-clinical-dx",
    name: "Noctis Clinical DX",
    category: "specialist",
    thinkingLabel: "Noctis Clinical DX is running encounter-isolated clinical verification…",
    thinkingStages: [
      "Isolating documented patient demographics, vitals, labs & timelines…",
      "Verifying deterministic formulas (MAP, AG, Winter's, KDIGO, dosing)…",
      "Evaluating competing diagnoses, contraindications & life threats…",
      "Auditing missing data gaps & rejecting unsupported findings…",
    ],
    thinkingDirective: buildDirective(
      "Noctis Clinical DX Safety Engine",
      "isolate strictly documented patient parameters, verify every clinical equation and unit, surface missing data gaps, and reject any unsupported diagnosis or cross-patient finding",
    ),
    preferredProviderHint: "noctis",
  },
  "noctis-invest-alpha": {
    id: "noctis-invest-alpha",
    name: "Investment Alpha",
    category: "specialist",
    thinkingLabel: "Investment Alpha is auditing DCF, ASC 606 & capital sensitivities…",
    thinkingStages: [
      "Extracting GAAP/non-GAAP filings, margins & capital structure inputs…",
      "Verifying DCF, WACC, working capital & unit-economics math…",
      "Testing bear/base/bull sensitivity scenarios & downside risks…",
      "Checking assumption transparency & undisclosed risk factors…",
    ],
    thinkingDirective: buildDirective(
      "Investment Alpha Quantitative Finance Engine",
      "verify accounting definitions (ASC 606, FCF, WACC, multiples), reconcile every dollar figure, and state explicit valuation assumptions and sensitivity risks",
    ),
    preferredProviderHint: "noctis",
  },
  "noctis-theology-exegesis": {
    id: "noctis-theology-exegesis",
    name: "Bible & Exegesis",
    category: "specialist",
    thinkingLabel: "Bible & Exegesis is verifying textual, lexical & historical context…",
    thinkingStages: [
      "Checking canonical pericope, translation & literary genre…",
      "Analyzing original Greek/Hebrew lexical & grammatical morphology…",
      "Cross-referencing Scripture with Scripture & historical setting…",
      "Verifying faithful hermeneutical synthesis without eisegesis…",
    ],
    thinkingDirective: buildDirective(
      "Bible & Exegesis Hermeneutics Engine",
      "ground claims in exact biblical text citations, historical-grammatical syntax, lexical nuance, and canonical cross-references without inventing verse references",
    ),
    preferredProviderHint: "noctis",
  },

  // ==========================================
  // WORKSPACES & DESKS (4)
  // ==========================================
  "desk-forge": {
    id: "desk-forge",
    name: "Noctis Forge",
    category: "workspace",
    thinkingLabel: "Noctis Forge is architecting AST, invariants & unit tests…",
    thinkingStages: [
      "Decomposing repository scope, interfaces & dependency contracts…",
      "Designing architecture, failure handling & defensive boundaries…",
      "Verifying TypeScript types, edge cases & runnable unit tests…",
      "Running XTRIKE SAST & production readiness self-audit…",
    ],
    thinkingDirective: buildDirective(
      "Noctis Forge Autonomous Software Architect",
      "verify types, security boundaries, edge cases, and test coverage before emitting production code and tests",
    ),
    preferredProviderHint: "noctis",
  },
  "desk-console": {
    id: "desk-console",
    name: "Developer Console",
    category: "workspace",
    thinkingLabel: "Developer Console is running gateway deep thinking…",
    thinkingStages: [
      "Validating gateway payload schema, temperature & token bounds…",
      "Evaluating architectural correctness, security & edge cases…",
      "Cross-checking implementation details & failure recovery paths…",
      "Auditing gateway output for precision & zero hallucination…",
    ],
    thinkingDirective: buildDirective(
      "Developer Console Model Gateway",
      "verify API design, authentication/authorization invariants, edge cases, and concrete execution steps",
    ),
    preferredProviderHint: "noctis",
  },
  "desk-plugins": {
    id: "desk-plugins",
    name: "Plugins & Systems",
    category: "workspace",
    thinkingLabel: "Plugins & Systems is reasoning over connector telemetry…",
    thinkingStages: [
      "Authenticating connector context & isolating payload inputs…",
      "Correlating enterprise signals, alerts & operational dependencies…",
      "Evaluating priority risks, policy compliance & remediation actions…",
      "Verifying structured connector output against factual inputs…",
    ],
    thinkingDirective: buildDirective(
      "Plugins & Systems Connector Orchestrator",
      "correlate connector inputs strictly against supplied evidence, prioritize risks accurately, and surface concrete next actions",
    ),
    preferredProviderHint: "noctis",
  },
  "desk-redteam": {
    id: "desk-redteam",
    name: "AI Red Team & Threat Matrix",
    category: "workspace",
    thinkingLabel: "AI Red Team is analyzing adversarial vector & defense posture…",
    thinkingStages: [
      "Classifying prompt injection, jailbreak or OWASP GenAI vector…",
      "Tracing policy boundary, instruction hierarchy & leakage risk…",
      "Evaluating model resistance, ASR likelihood & guardrail response…",
      "Confirming strictly defensive evaluation & mitigation posture…",
    ],
    thinkingDirective: buildDirective(
      "AI Red Team & Threat Matrix",
      "assess OWASP LLM Top 10 attack surface defensively, uphold strict instruction hierarchy, and reject unsafe policy bypasses",
    ),
    preferredProviderHint: "noctis",
  },

  // ==========================================
  // SOVEREIGN SUITES (16 ENGINES)
  // ==========================================
  "suite-canary": {
    id: "suite-canary",
    name: "Canary Deception",
    category: "suite",
    thinkingLabel: "Canary Deception is verifying honeytoken telemetry & containment…",
    thinkingStages: [
      "Isolating tripwire beacon, credential type & attacker telemetry…",
      "Mapping reconnaissance actions to MITRE ATT&CK techniques…",
      "Evaluating zero-false-positive certainty & blast radius bounds…",
      "Auditing containment playbook & forensic seal integrity…",
    ],
    thinkingDirective: buildDirective(
      "Canary Deception Suite",
      "verify honeytoken tripwire telemetry, lateral-movement indicators, and non-disruptive containment actions",
    ),
  },
  "suite-war-room": {
    id: "suite-war-room",
    name: "War Room Sandbox",
    category: "suite",
    thinkingLabel: "War Room Sandbox is deliberating Red/Blue scenario & detections…",
    thinkingStages: [
      "Tracing adversarial kill chain & exploit preconditions…",
      "Cross-checking Blue Team mitigations against active attack vectors…",
      "Validating Sigma & KQL detection logic against telemetry fields…",
      "Auditing containment priority & residual breach risk…",
    ],
    thinkingDirective: buildDirective(
      "War Room Dual-Agent Sandbox",
      "reconcile Red Team exploit paths against Blue Team detections, Sigma/KQL rules, and containment readiness",
    ),
  },
  "suite-digital-twin": {
    id: "suite-digital-twin",
    name: "Digital Twin",
    category: "suite",
    thinkingLabel: "Digital Twin is modeling dependency graph & cascade risk…",
    thinkingStages: [
      "Ingesting infrastructure topology, node capacities & SLA bounds…",
      "Simulating failure propagation & cascading dependency bottlenecks…",
      "Evaluating blast-radius mitigation & failover headroom…",
      "Auditing forecast metrics & resilience recommendations…",
    ],
    thinkingDirective: buildDirective(
      "Digital Twin Infrastructure Simulator",
      "trace topology dependencies, compute capacity margins accurately, and identify single points of failure",
    ),
  },
  "suite-pqc": {
    id: "suite-pqc",
    name: "PQC Kyber Shield",
    category: "suite",
    thinkingLabel: "PQC Kyber Shield is auditing quantum-safe key migration…",
    thinkingStages: [
      "Inventorying asymmetric primitives (RSA/ECDH) & Harvest-Now exposure…",
      "Mapping ML-KEM (Kyber) & ML-DSA (Dilithium) NIST FIPS transitions…",
      "Evaluating hybrid TLS/enclave handshake latency & key sizes…",
      "Verifying cryptographic agility & compliance checklist integrity…",
    ],
    thinkingDirective: buildDirective(
      "Post-Quantum Cryptography Shield",
      "check NIST FIPS 203/204 parameter alignment, hybrid key exchange safety, and downgrade protection",
    ),
  },
  "suite-holodeck": {
    id: "suite-holodeck",
    name: "3D Holodeck",
    category: "suite",
    thinkingLabel: "3D Holodeck is synthesizing spatial topology & threat vectors…",
    thinkingStages: [
      "Correlating spatial network zones, ingress gateways & trust tiers…",
      "Inspecting lateral traversal paths & telemetry chokepoints…",
      "Cross-checking enclave isolation boundaries across regions…",
      "Verifying situational awareness dossier & remediation priorities…",
    ],
    thinkingDirective: buildDirective(
      "3D Holodeck Spatial Topology Suite",
      "analyze spatial network zones, lateral chokepoints, and isolation boundaries rigorously",
    ),
  },
  "suite-remediation": {
    id: "suite-remediation",
    name: "Auto-Remediation",
    category: "suite",
    thinkingLabel: "Auto-Remediation is verifying self-healing rollback & blast radius…",
    thinkingStages: [
      "Inspecting root-cause telemetry & vulnerable code/config artifact…",
      "Validating idempotent patch synthesis & regression safeguards…",
      "Assessing service blast radius & automated canary rollback gates…",
      "Auditing post-patch verification checks & compliance seal…",
    ],
    thinkingDirective: buildDirective(
      "Auto-Remediation Playbook Engine",
      "confirm idempotency, blast-radius safety, rollback triggers, and post-remediation verification assertions",
    ),
  },
  "suite-truth-ledger": {
    id: "suite-truth-ledger",
    name: "Truth Ledger",
    category: "suite",
    thinkingLabel: "Truth Ledger is verifying hash chain & evidentiary provenance…",
    thinkingStages: [
      "Inspecting statement claims, source bindings & hash chain anchors…",
      "Checking Merkle integrity & tamper-evident timestamp continuity…",
      "Evaluating unsupported assertions vs verified primary evidence…",
      "Confirming immutable audit trail consistency…",
    ],
    thinkingDirective: buildDirective(
      "Truth Ledger SHA-256 Audit Suite",
      "distinguish cryptographically attested evidence from unverified assertions and confirm hash-chain continuity",
    ),
  },
  "suite-zk-proof": {
    id: "suite-zk-proof",
    name: "Zero-Knowledge Proofs",
    category: "suite",
    thinkingLabel: "Zero-Knowledge Proofs is verifying statement soundness & zero leakage…",
    thinkingStages: [
      "Separating public inputs, private witness & circuit constraints…",
      "Checking completeness, soundness & zero-knowledge leakage risks…",
      "Validating proof verification transcript & commitment bindings…",
      "Confirming privacy preservation without exposing witness secrets…",
    ],
    thinkingDirective: buildDirective(
      "Zero-Knowledge Proof Verification Suite",
      "audit public vs private witness separation, soundness assumptions, and zero-leakage guarantees",
    ),
  },
  "suite-swarm": {
    id: "suite-swarm",
    name: "Swarm Orchestrator",
    category: "suite",
    thinkingLabel: "Swarm Orchestrator is verifying multi-agent decomposition & handoffs…",
    thinkingStages: [
      "Decomposing objective into bounded parallel specialist tasks…",
      "Assigning disjoint ownership boundaries & verification gates…",
      "Checking dependency ordering & conflicting state-mutation risks…",
      "Synthesizing consensus check across worker deliverables…",
    ],
    thinkingDirective: buildDirective(
      "Swarm Multi-Agent Orchestrator",
      "validate disjoint worker ownership, handoff contracts, and final cross-agent verification",
    ),
  },
  "suite-air-gap": {
    id: "suite-air-gap",
    name: "Air-Gap Protocol",
    category: "suite",
    thinkingLabel: "Air-Gap Protocol is auditing zero-egress perimeter & local inference…",
    thinkingStages: [
      "Scanning outbound DNS, HTTP, telemetry & covert channel vectors…",
      "Verifying offline model weights, deterministic tools & key isolation…",
      "Checking cryptographic transfer airlock & artifact provenance…",
      "Confirming strict zero-egress perimeter compliance…",
    ],
    thinkingDirective: buildDirective(
      "Air-Gap Zero-Egress Protocol",
      "audit every potential outbound channel, local model fallback, and offline key boundary",
    ),
  },
  "suite-circuit-breaker": {
    id: "suite-circuit-breaker",
    name: "Circuit Breaker",
    category: "suite",
    thinkingLabel: "Circuit Breaker is evaluating non-compensatory safety vetoes…",
    thinkingStages: [
      "Evaluating hard safety invariants & threshold triggers…",
      "Checking non-compensatory veto logic (no score averaging override)…",
      "Simulating fail-closed fallback state & operator escalation path…",
      "Auditing threshold hysteresis & false-trip protections…",
    ],
    thinkingDirective: buildDirective(
      "Circuit Breaker Safety Veto Suite",
      "enforce non-compensatory hard safety vetoes and verify fail-closed recovery paths",
    ),
  },
  "suite-enclave": {
    id: "suite-enclave",
    name: "Enclave Attestation",
    category: "suite",
    thinkingLabel: "Enclave Attestation is verifying hardware quote & TCB measurements…",
    thinkingStages: [
      "Inspecting hardware root of trust (SGX/SEV-SNP/TDX) & MRENCLAVE…",
      "Checking TCB firmware version, debug-mode bits & nonce freshness…",
      "Validating remote quote signature chain & key-release policy…",
      "Confirming confidential compute integrity & replay protection…",
    ],
    thinkingDirective: buildDirective(
      "Hardware Enclave Attestation Suite",
      "verify measurement digests, nonce freshness, debug-flag posture, and conditional key-release checks",
    ),
  },
  "suite-cognitive": {
    id: "suite-cognitive",
    name: "Cognitive Bias Sandbox",
    category: "suite",
    thinkingLabel: "Cognitive Bias Sandbox is auditing 24 epistemic traps & counter-arguments…",
    thinkingStages: [
      "Extracting core thesis, hidden premises & base-rate assumptions…",
      "Probing against anchoring, confirmation, survivorship & groupthink…",
      "Generating strongest steel-man counter-hypothesis & falsifiers…",
      "Calibrating confidence intervals & reversible decision steps…",
    ],
    thinkingDirective: buildDirective(
      "Cognitive Bias Epistemic Sandbox",
      "surface base-rate neglect, anchoring, confirmation bias, and construct concrete falsification tests",
    ),
  },
  "suite-crisis": {
    id: "suite-crisis",
    name: "Crisis Negotiation",
    category: "suite",
    thinkingLabel: "Crisis Negotiation is calibrating de-escalation & leverage tradeoffs…",
    thinkingStages: [
      "Assessing stakeholder constraints, urgency & emotional posture…",
      "Identifying shared safety objectives, BATNA & red-line boundaries…",
      "Evaluating tactical empathy options vs escalation triggers…",
      "Auditing communication clarity & verifiable commitment steps…",
    ],
    thinkingDirective: buildDirective(
      "Crisis Negotiation Behavioral Suite",
      "balance tactical de-escalation, clear red lines, verified commitments, and crisis contingency steps",
    ),
  },
  "suite-steganography": {
    id: "suite-steganography",
    name: "Steganography Forensics",
    category: "suite",
    thinkingLabel: "Steganography Forensics is inspecting LSB entropy & provenance marks…",
    thinkingStages: [
      "Analyzing carrier container headers, metadata & byte distribution…",
      "Checking LSB chi-square anomalies, spectral entropy & payload markers…",
      "Validating cryptographic watermark signature & chain of custody…",
      "Auditing forensic findings against tampering indicators…",
    ],
    thinkingDirective: buildDirective(
      "Steganography & Provenance Forensics",
      "evaluate statistical carrier anomalies, metadata integrity, and non-destructive forensic evidence extraction",
    ),
  },
  "suite-lex": {
    id: "suite-lex",
    name: "Lex Synthesizer",
    category: "suite",
    thinkingLabel: "Lex Synthesizer is reconciling cross-border regulatory conflicts…",
    thinkingStages: [
      "Mapping competing statutory mandates across US, EU, UK & APAC…",
      "Identifying direct compliance collisions & extraterritorial scope…",
      "Synthesizing strict-union safe-harbor & comity harmonization controls…",
      "Auditing penalty exposure bounds & residual legal counsel items…",
    ],
    thinkingDirective: buildDirective(
      "Lex Cross-Border Regulatory Synthesizer",
      "identify conflicting statutory obligations across jurisdictions, verify technical safe harbors, and flag items requiring qualified local counsel",
    ),
  },
};

export const NOCTIS_ENGINE_IDS = Object.keys(NOCTIS_ENGINE_REGISTRY);

const ENGINE_NAME_ALIASES: Array<[RegExp, string]> = [
  [/noctis[\s-]*o3|deep\s*thinking|o1\/o3/i, "noctis-o3-deep"],
  [/claude|sonnet/i, "claude-3-7-sonnet"],
  [/chatgpt|gpt-?4o|\bastra\b/i, "gpt-4o"],
  [/gemini|\bcortex\b|flash-?lite/i, "gemini-35-flash-lite"],
  [/grok|\bsentinel\b|\bxai\b/i, "grok-3"],
  [/deepseek|\br1\b/i, "deepseek-r1"],
  [/llama|\bvelocity\b|\bgroq\b/i, "llama-3-3-70b"],
  [/xtrike|cyber|dfir/i, "noctis-cyber-dfir"],
  [/juris|\blaw\b/i, "noctis-juris-law"],
  [/clinical|physician|\bdx\b/i, "noctis-clinical-dx"],
  [/invest|alpha|\bdcf\b/i, "noctis-invest-alpha"],
  [/theology|exegesis|bible/i, "noctis-theology-exegesis"],
  [/forge/i, "desk-forge"],
  [/console|gateway/i, "desk-console"],
  [/plugin/i, "desk-plugins"],
  [/red\s*team|threat\s*matrix/i, "desk-redteam"],
  [/canary/i, "suite-canary"],
  [/war[\s_-]*room/i, "suite-war-room"],
  [/digital[\s_-]*twin/i, "suite-digital-twin"],
  [/\bpqc\b|kyber/i, "suite-pqc"],
  [/holodeck/i, "suite-holodeck"],
  [/remediat/i, "suite-remediation"],
  [/truth[\s_-]*ledger/i, "suite-truth-ledger"],
  [/zk[\s_-]*proof|zero[\s-]*knowledge/i, "suite-zk-proof"],
  [/swarm/i, "suite-swarm"],
  [/air[\s_-]*gap/i, "suite-air-gap"],
  [/circuit[\s_-]*breaker/i, "suite-circuit-breaker"],
  [/enclave/i, "suite-enclave"],
  [/cognitive/i, "suite-cognitive"],
  [/crisis/i, "suite-crisis"],
  [/steganograph/i, "suite-steganography"],
  [/\blex\b|regulatory\s*harmoniz/i, "suite-lex"],
];

export function resolveNoctisEngine(engineIdOrName?: unknown): NoctisEngineProfile {
  const raw = typeof engineIdOrName === "string" ? engineIdOrName.trim() : "";
  if (!raw) return NOCTIS_ENGINE_REGISTRY["noctis-ultra"];

  const lower = raw.toLowerCase();
  if (NOCTIS_ENGINE_REGISTRY[lower]) {
    return NOCTIS_ENGINE_REGISTRY[lower];
  }

  for (const profile of Object.values(NOCTIS_ENGINE_REGISTRY)) {
    if (profile.name.toLowerCase() === lower) {
      return profile;
    }
  }

  for (const [pattern, targetId] of ENGINE_NAME_ALIASES) {
    if (pattern.test(raw) && NOCTIS_ENGINE_REGISTRY[targetId]) {
      return NOCTIS_ENGINE_REGISTRY[targetId];
    }
  }

  return NOCTIS_ENGINE_REGISTRY["noctis-ultra"];
}

export function mapWorkspaceModelToEngineId(label: string, fallbackWorkspaceId = "desk-console"): string {
  const clean = (label || "").trim();
  if (!clean) return resolveNoctisEngine(fallbackWorkspaceId).id;
  if (/cortex|gemini/i.test(clean)) return "gemini-35-flash-lite";
  if (/astra|gpt-?4o|openai/i.test(clean)) return "gpt-4o";
  if (/velocity|groq|llama/i.test(clean)) return "llama-3-3-70b";
  if (/sentinel|grok|xai/i.test(clean)) return "grok-3";
  if (/deep\s*thinking|o3/i.test(clean)) return "noctis-o3-deep";
  if (/claude|sonnet/i.test(clean)) return "claude-3-7-sonnet";
  if (/ultra/i.test(clean)) return "noctis-ultra";
  const matched = resolveNoctisEngine(clean);
  if (matched.id !== "noctis-ultra") return matched.id;
  return resolveNoctisEngine(fallbackWorkspaceId).id;
}

export function parseThinkEnvelope(raw: string): { thought: string; body: string } {
  const text = typeof raw === "string" ? raw : "";
  const match = text.match(/<think>([\s\S]*?)<\/think>/i);
  if (!match) return { thought: "", body: text.trim() };
  return {
    thought: match[1].trim(),
    body: text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim(),
  };
}

export function buildStructuredDeepThinkTrace(
  engineId: string,
  subject: string,
  routeSummary: string,
  evidenceSnippet?: string,
): string {
  const profile = resolveNoctisEngine(engineId);
  const cleanSubject = (subject || "Request objective")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);

  const headings: string[] = [];
  if (evidenceSnippet) {
    for (const line of evidenceSnippet.split(/\r?\n/)) {
      const cleaned = line
        .replace(/^#+\s*/, "")
        .replace(/\*\*/g, "")
        .replace(/`/g, "")
        .trim();
      if (cleaned.length >= 6 && cleaned.length <= 120 && !/^[-=|]+$/.test(cleaned)) {
        headings.push(cleaned);
        if (headings.length >= 3) break;
      }
    }
  }

  const lines = [
    `Engine: ${profile.name} (${profile.id}) — Deep Thinking Mode Active`,
    `Objective: ${cleanSubject}`,
    `1. ${profile.thinkingStages[0].replace(/…$/, "")} -> Bounded scope and explicit inputs isolated.`,
    `2. ${profile.thinkingStages[1].replace(/…$/, "")} -> ${routeSummary}.`,
    `3. ${profile.thinkingStages[2].replace(/…$/, "")}${headings.length ? ` -> Verified key findings: ${headings.join(" | ")}.` : " -> Synthesized domain analysis and constraints."}`,
    `4. ${profile.thinkingStages[3].replace(/…$/, "")} -> Confirmed internal consistency and zero fabricated claims before output.`,
  ];
  return lines.join("\n");
}

export function ensureDeepThinkEnvelope(
  rawOut: string,
  opts: {
    shouldThink: boolean;
    wantsRawJson?: boolean;
    engineId?: string;
    prompt: string;
    routeSummary: string;
  },
): string {
  const text = typeof rawOut === "string" ? rawOut : "";
  const trimmed = text.trim();
  if (
    !opts.shouldThink ||
    opts.wantsRawJson ||
    !trimmed ||
    /^<think>/i.test(trimmed) ||
    trimmed.startsWith("{") ||
    trimmed.startsWith("[") ||
    trimmed.startsWith("## Vibe ") ||
    /CLINICAL_VALIDATION_FAILED/i.test(trimmed)
  ) {
    return rawOut;
  }

  const parsed = parseThinkEnvelope(trimmed);
  if (parsed.thought) {
    return `<think>\n${parsed.thought}\n</think>\n\n${parsed.body}`;
  }

  const trace = buildStructuredDeepThinkTrace(
    opts.engineId || "noctis-ultra",
    opts.prompt,
    opts.routeSummary,
    trimmed.slice(0, 700),
  );
  return `<think>\n${trace}\n</think>\n\n${trimmed}`;
}
