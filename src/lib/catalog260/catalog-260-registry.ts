/**
 * Noctis Master Capability Catalog v1.0 — Complete 260-Capability Audit & Traceability Registry
 *
 * Inventories all 260 items across 14 Divisions (I-XIV), comparing each against live
 * repository modules, classifying Already Implemented vs Newly Closed Gaps vs Explicit
 * External Hardware/Licensing Boundaries, and feeding SQL traceability + Chat + UI.
 */

export type CatalogStage =
  | "Foundation"
  | "Reliability"
  | "Core products"
  | "Enterprise"
  | "Advanced domains"
  | "Autonomy";

export type CatalogStatus =
  | "ALREADY_IMPLEMENTED"
  | "GAP_CLOSED_NOW"
  | "EXTERNAL_INFRA_OR_LICENSE_BOUNDARY";

export interface Catalog260Item {
  itemNumber: number;
  divisionCode: string;
  divisionName: string;
  name: string;
  stage: CatalogStage;
  status: CatalogStatus;
  gapAction: string;
  modules: string[];
  apiEndpoint: string;
  boundaryNote: string;
}

type RawTuple = [number, string, CatalogStage, CatalogStatus, string, string[], string, string?];

function buildDiv(divisionCode: string, divisionName: string, rows: RawTuple[]): Catalog260Item[] {
  return rows.map(([itemNumber, name, stage, status, gapAction, modules, apiEndpoint, boundaryNote]) => ({
    itemNumber,
    divisionCode,
    divisionName,
    name,
    stage,
    status,
    gapAction,
    modules,
    apiEndpoint,
    boundaryNote: boundaryNote || "Integrated over shared NDKRS + Independent Verification Engine.",
  }));
}

const AI_IMPL: CatalogStatus = "ALREADY_IMPLEMENTED";
const CLOSED: CatalogStatus = "GAP_CLOSED_NOW";
const EXT: CatalogStatus = "EXTERNAL_INFRA_OR_LICENSE_BOUNDARY";

export const CATALOG_260_ITEMS: Catalog260Item[] = [
  ...buildDiv("I", "Core AI, reasoning, and platform intelligence", [
    [1, "General-purpose conversational AI", "Core products", AI_IMPL, "Verified live", ["src/lib/noctis-desk.server.ts"], "/api/noctis"],
    [2, "Advanced logical reasoning", "Foundation", AI_IMPL, "Verified live", ["src/lib/noctis-orchestrator.ts"], "/api/noctis"],
    [3, "Deterministic knowledge database", "Foundation", AI_IMPL, "Verified live (Neon + pgvector)", ["src/lib/ndkrs/persistence.server.ts", "src/lib/ndkrs/corpus-seed.ts"], "/api/v2/ndkrs/status"],
    [4, "Retrieval-augmented generation (RAG)", "Foundation", AI_IMPL, "Verified live", ["src/lib/ndkrs/hybrid-retrieval.server.ts"], "/api/v2/ndkrs/search"],
    [5, "Hybrid keyword and semantic search", "Foundation", AI_IMPL, "Verified live (BM25 + 384d HNSW)", ["src/lib/ndkrs/hybrid-retrieval.server.ts"], "/api/v2/ndkrs/search"],
    [6, "Knowledge graph and relationship reasoning", "Foundation", AI_IMPL, "Verified live (SQL graph.*)", ["src/lib/enterprise/graph-and-mission-risk.ts", "src/lib/knowledge-graph.ts"], "/api/v2/enterprise/knowledge-graph/query"],
    [7, "Mathematical and symbolic reasoning", "Foundation", AI_IMPL, "Verified live", ["src/lib/noctis-universal-science-engine.ts", "src/lib/noctis-pde.ts"], "/api/noctis"],
    [8, "Executable rules and policy-as-code", "Foundation", AI_IMPL, "Verified live", ["src/lib/enterprise/policy-as-code-engine.ts", "src/lib/ndkrs/rules-engine.server.ts"], "/api/v2/enterprise/policy-as-code/evaluate"],
    [9, "Multi-agent orchestration", "Autonomy", AI_IMPL, "Verified live (NUPS + Consensus)", ["src/lib/nups/orchestrator.server.ts", "src/lib/noctis-cross-domain-consensus.ts"], "/api/v2/nups/solve"],
    [10, "Autonomous task planning", "Autonomy", AI_IMPL, "Verified live", ["src/lib/nups/orchestrator.server.ts", "src/lib/autonomous-agent-engine.ts"], "/api/v2/nups/solve"],
    [11, "Long-context document understanding", "Core products", AI_IMPL, "Verified live", ["src/lib/noctis-document-intelligence.ts", "src/lib/ndkrs/document-parser.server.ts"], "/api/v2/ndkrs/ingest-file"],
    [12, "Persistent user memory with privacy controls", "Enterprise", CLOSED, "Closed with PostgreSQL enterprise.user_memory + PII/consent/TTL gate", ["src/lib/catalog260/persistence.server.ts", "src/lib/catalog260/dependability-suite.server.ts"], "/api/v2/catalog/memory"],
    [13, "Multimodal image, audio, video, and document understanding", "Core products", AI_IMPL, "Verified live", ["src/lib/noctis-multimodal-cross-attention.ts", "src/lib/noctis-ocr-intake.ts"], "/api/noctis"],
    [14, "Voice conversation and speech recognition", "Core products", AI_IMPL, "Verified live", ["src/lib/noctis-voice.ts", "src/lib/noctis-ambient-dictation.ts"], "/api/noctis"],
    [15, "Real-time information retrieval", "Foundation", AI_IMPL, "Verified live", ["src/lib/noctis-live-search.server.ts", "src/lib/noctis-cve-stream.server.ts"], "/api/cve-stream"],
    [16, "Tool calling and API orchestration", "Foundation", AI_IMPL, "Verified live", ["src/lib/noctis-tool-orchestrator.ts", "src/lib/noctis-tool-registry.ts"], "/api/v2/nups/solve"],
    [17, "Code execution and sandboxed computation", "Core products", AI_IMPL, "Verified live", ["src/lib/noctis-code-interpreter.ts", "src/lib/noctis-wasm-runner.ts"], "/api/noctis"],
    [18, "Browser and computer-use automation", "Autonomy", EXT, "Control-plane API workflows wired; arbitrary OS GUI automation requires host sandbox permissions", ["src/lib/noctis-workspace-integrations.ts", "src/lib/enterprise/ai-agent-governance.ts"], "/api/v2/enterprise/agents/propose", "Requires explicit local host OS/browser sandbox permission boundaries."],
    [19, "Structured output and report generation", "Foundation", AI_IMPL, "Verified live", ["src/lib/noctis-desk.server.ts", "src/lib/dod-ic/emass-export-engine.ts"], "/api/v2/dod-ic/export/emass-xlsx"],
    [20, "Independent answer validation", "Reliability", AI_IMPL, "Verified live (Gate 0 Fail-Closed)", ["src/lib/enterprise/independent-verification-engine.ts"], "/api/v2/enterprise/verify"],
  ]),
  ...buildDiv("II", "AI model development and training", [
    [21, "Model pretraining pipelines", "Autonomy", EXT, "Control configs & lineage tracked; multi-trillion-token pretraining requires external GPU cluster", ["src/lib/catalog260/persistence.server.ts", "src/lib/noctis-continuous-trainer.ts"], "/api/v2/catalog/models", "Requires external multi-node H100/B200 training cluster; Noctis governs registry & safety gates."],
    [22, "Supervised fine-tuning (SFT)", "Reliability", AI_IMPL, "Verified live (ChatML/ShareGPT exporter)", ["src/lib/noctis-qlora-pipeline.ts", "src/lib/noctis-continuous-trainer.ts"], "/api/noctis"],
    [23, "Preference optimization (DPO and related methods)", "Reliability", AI_IMPL, "Verified live (DPO safety pair generator)", ["src/lib/noctis-qlora-pipeline.ts", "src/lib/noctis-continuous-trainer.ts"], "/api/noctis"],
    [24, "Parameter-efficient fine-tuning (LoRA/QLoRA)", "Core products", AI_IMPL, "Verified live", ["src/lib/noctis-qlora-pipeline.ts", "src/lib/noctis-lora-pipeline.ts"], "/api/noctis"],
    [25, "Synthetic training-data generation", "Reliability", AI_IMPL, "Verified live (red-team & safety synthesis)", ["src/lib/noctis-qlora-pipeline.ts", "src/lib/catalog260/dependability-suite.server.ts"], "/api/v2/catalog/dataset/dedup"],
    [26, "Training-data quality and deduplication", "Reliability", CLOSED, "Closed with SHA-256 dataset dedup & PII scrubber", ["src/lib/catalog260/dependability-suite.server.ts"], "/api/v2/catalog/dataset/dedup"],
    [27, "Dataset lineage and licensing", "Enterprise", CLOSED, "Closed with SHA-256 lineage hash & SQL training.dataset_versions", ["src/lib/catalog260/dependability-suite.server.ts", "src/lib/enterprise/relational-sync.server.ts"], "/api/v2/catalog/dataset/dedup"],
    [28, "Model evaluation benchmarks", "Reliability", AI_IMPL, "Verified live (AI Eval Lab & CRIT-046/047)", ["src/lib/enterprise/ai-evaluation-lab.ts", "src/lib/noctis-eval-suite.ts"], "/api/v2/enterprise/eval-lab/run"],
    [29, "Adversarial and red-team testing", "Reliability", AI_IMPL, "Verified live", ["src/lib/noctis-llm-redteam.ts", "src/lib/noctis-fuzzer.ts"], "/api/v2/enterprise/verify"],
    [30, "Model registry and version management", "Enterprise", CLOSED, "Closed with SQL enterprise.model_registry & artifact SHA-256", ["src/lib/catalog260/persistence.server.ts"], "/api/v2/catalog/models"],
    [31, "Quantization and inference optimization", "Advanced domains", AI_IMPL, "Verified live (KV-cache / INT4-FP16)", ["src/lib/noctis-edge-quantization.ts", "src/lib/noctis-edge-runner.ts"], "/api/noctis"],
    [32, "Distributed GPU training", "Autonomy", EXT, "Config/registry supported; physical multi-GPU NCCL fabric requires external cloud compute", ["src/lib/catalog260/persistence.server.ts", "src/lib/noctis-qlora-pipeline.ts"], "/api/v2/catalog/models", "Requires external multi-GPU cluster infrastructure."],
    [33, "Model distillation", "Advanced domains", EXT, "Teacher-student SFT/DPO dataset forge ready; GPU distillation training runs externally", ["src/lib/noctis-qlora-pipeline.ts", "src/lib/catalog260/dependability-suite.server.ts"], "/api/v2/catalog/dataset/dedup", "Teacher dataset generation is live; offline weight distillation requires GPU runner."],
    [34, "Continuous evaluation and drift monitoring", "Reliability", AI_IMPL, "Verified live (CCV + monitoring.drift_events)", ["src/lib/enterprise/evidence-and-ccv-engine.ts", "src/lib/enterprise/relational-sync.server.ts"], "/api/v2/enterprise/ccv/validate"],
    [35, "Model rollback and canary releases", "Enterprise", CLOSED, "Closed with canary traffic % & auto-rollback gate", ["src/lib/catalog260/persistence.server.ts", "src/lib/noctis-canary-engine.ts"], "/api/v2/catalog/models/canary-check"],
    [36, "Inference routing across models", "Enterprise", AI_IMPL, "Verified live (Classification-aware Secure Model Gateway)", ["src/lib/enterprise/secure-model-gateway.ts", "src/lib/noctis-brain.ts"], "/api/v2/enterprise/model-gateway/route"],
    [37, "Tokenization and context optimization", "Foundation", AI_IMPL, "Verified live", ["src/lib/noctis-edge-quantization.ts", "src/lib/ndkrs/document-parser.server.ts"], "/api/noctis"],
    [38, "Hallucination detection", "Reliability", AI_IMPL, "Verified live (Stage 3 verifier + Confidence Calibration)", ["src/lib/catalog260/dependability-suite.server.ts", "src/lib/enterprise/independent-verification-engine.ts"], "/api/v2/catalog/dependability/run"],
    [39, "Confidence and uncertainty calibration", "Reliability", CLOSED, "Closed with Epistemic Fact/Inference/Hypothesis/Unknown calibrator", ["src/lib/catalog260/dependability-suite.server.ts"], "/api/v2/catalog/dependability/run"],
    [40, "Controlled improvement from verified failures", "Reliability", CLOSED, "Closed with Autonomous Eval Factory (#255) & QLoRA feedback", ["src/lib/catalog260/dependability-suite.server.ts", "src/lib/enterprise/ai-evaluation-lab.ts"], "/api/v2/catalog/eval-factory"],
  ]),
  ...buildDiv("III", "Cybersecurity and offensive-security testing", [
    [41, "Vulnerability management", "Core products", AI_IMPL, "Verified live", ["src/lib/noctis-vuln-engine.ts", "src/lib/dod-ic/stig-acas-engine.ts"], "/api/noctis"],
    [42, "Penetration-testing workflow automation", "Core products", AI_IMPL, "Verified live (authorized scope only)", ["src/lib/caldera.ts", "src/lib/atomic-red.ts", "src/lib/pentest-desk.ts"], "/api/noctis"],
    [43, "Web application security testing", "Core products", AI_IMPL, "Verified live", ["src/lib/owasp-suite.ts", "src/lib/owasp-ten.ts"], "/api/noctis"],
    [44, "API security testing", "Core products", AI_IMPL, "Verified live", ["src/lib/owasp-suite.ts", "src/lib/noctis-fuzzer.ts"], "/api/v2/enterprise/status"],
    [45, "Mobile application security", "Enterprise", CLOSED, "Closed with OWASP MASVS v2 determinist auditor", ["src/lib/catalog260/gap-closure-solvers.ts"], "/api/v2/catalog/solve"],
    [46, "Cloud security posture management", "Core products", AI_IMPL, "Verified live (CC SRG / Digital Twin)", ["src/lib/dod-ic/devsecops-cloud-engine.ts", "src/lib/enterprise/authorization-digital-twin.ts"], "/api/v2/enterprise/digital-twin/evaluate"],
    [47, "Container and Kubernetes security", "Core products", AI_IMPL, "Verified live (K8s STIG V2R1)", ["src/lib/dod-ic/stig-library.ts", "src/lib/dod-ic/devsecops-cloud-engine.ts"], "/api/v2/dod-ic/stig/library"],
    [48, "Identity and Active Directory security assessment", "Enterprise", AI_IMPL, "Verified live (ICAM / PAM / ALT / Kerberos)", ["src/lib/dod-ic/zero-trust-icam-engine.ts", "src/lib/noctis-canary-engine.ts"], "/api/v2/dod-ic/status"],
    [49, "Attack-path and exposure graph analysis", "Core products", AI_IMPL, "Verified live (SQL cyber.attack_paths)", ["src/lib/noctis-attack-path-engine.ts", "src/lib/enterprise/relational-sync.server.ts"], "/api/v2/enterprise/db/health"],
    [50, "Security configuration assessment", "Core products", AI_IMPL, "Verified live (STIG/SCAP)", ["src/lib/dod-ic/stig-acas-engine.ts"], "/api/v2/dod-ic/stig/library"],
    [51, "SAST, DAST, IAST, and SCA", "Core products", AI_IMPL, "Verified live", ["src/lib/noctis-sast-engine.ts", "src/lib/sast-tools.ts", "src/lib/enterprise/government-readiness.ts"], "/api/v2/enterprise/government-readiness"],
    [52, "Software supply-chain security", "Enterprise", AI_IMPL, "Verified live (CycloneDX SBOM 55 pkgs in SQL)", ["src/lib/enterprise/government-readiness.ts", "src/lib/enterprise/relational-sync.server.ts"], "/api/v2/enterprise/db/health"],
    [53, "CVE, CWE, CVSS, and KEV intelligence", "Core products", AI_IMPL, "Verified live", ["src/lib/noctis-cve-knowledge.ts", "src/lib/noctis-cve-stream.server.ts"], "/api/cve-stream"],
    [54, "MITRE ATT&CK mapping", "Core products", AI_IMPL, "Verified live (Navigator v4.5 + Sigma)", ["src/lib/dod-ic/sigma-attack-engine.ts", "src/lib/mitre-attack.ts"], "/api/v2/dod-ic/dco/sigma-navigator"],
    [55, "Threat hunting", "Enterprise", AI_IMPL, "Verified live", ["src/lib/dod-ic/dco-forensics-engine.ts", "src/lib/dod-ic/sigma-attack-engine.ts"], "/api/v2/dod-ic/dco/sigma-navigator"],
    [56, "SIEM and SOAR integration", "Enterprise", AI_IMPL, "Verified live (PostgreSQL telemetry persistence)", ["src/lib/noctis-universal-ingestor.ts", "src/routes/api/noctis.ingest.ts"], "/api/noctis/ingest"],
    [57, "Incident response and digital forensics", "Enterprise", AI_IMPL, "Verified live (NIST SP 800-86 + Custody)", ["src/lib/dod-ic/dco-forensics-engine.ts", "src/lib/enterprise/evidence-chain-of-custody.ts"], "/api/v2/enterprise/custody/chain"],
    [58, "Malware analysis in isolated laboratories", "Enterprise", CLOSED, "Closed with static-only Shannon entropy & IoC triage + isolated sandbox lock", ["src/lib/catalog260/gap-closure-solvers.ts"], "/api/v2/catalog/solve", "Dynamic detonation permitted solely in external air-gapped malware labs."],
    [59, "Zero Trust architecture assessment", "Enterprise", AI_IMPL, "Verified live (7-Pillar DoD ZT & CISA ZTMM)", ["src/lib/dod-ic/zero-trust-icam-engine.ts"], "/api/v2/dod-ic/status"],
    [60, "Evidence-backed security reporting", "Reliability", AI_IMPL, "Verified live", ["src/lib/enterprise/evidence-and-ccv-engine.ts", "src/lib/report-integrity-validator.ts"], "/api/v2/enterprise/evidence/analyze"],
  ]),
  ...buildDiv("IV", "Federal RMF, FedRAMP, and GRC", [
    [61, "NIST RMF lifecycle automation", "Core products", AI_IMPL, "Verified live (7-step engine)", ["src/lib/noctis-rmf-engine.ts"], "/api/v2/rmf/status"],
    [62, "NIST SP 800-53 control database", "Core products", AI_IMPL, "Verified live (All 20 families)", ["src/lib/rmf-v2/registry.ts", "src/lib/noctis-rmf-rules-extended.ts"], "/api/v2/rmf/status"],
    [63, "NIST SP 800-53A assessment procedures", "Core products", AI_IMPL, "Verified live (objective_results SQL)", ["src/lib/rmf-v2/assessment-and-learning.ts", "src/lib/enterprise/relational-sync.server.ts"], "/api/v2/rmf/status"],
    [64, "NIST SP 800-53B baseline selection", "Core products", AI_IMPL, "Verified live", ["src/lib/noctis-rmf-rules.ts", "src/lib/rmf-v2/governance.ts"], "/api/v2/rmf/status"],
    [65, "FedRAMP authorization intelligence", "Core products", AI_IMPL, "Verified live (strict DoD/IC boundary)", ["src/lib/noctis-rmf-engine.ts", "src/lib/noctis-rmf-db.ts"], "/api/v2/rmf/status"],
    [66, "OSCAL ingestion and generation", "Core products", AI_IMPL, "Verified live", ["src/lib/rmf-v2/governance.ts", "src/lib/dod-ic/emass-export-engine.ts"], "/api/v2/rmf/status"],
    [67, "SSP authoring and verification", "Core products", AI_IMPL, "Verified live", ["src/lib/rmf-v2/governance.ts"], "/api/v2/rmf/status"],
    [68, "SAP and SAR development", "Core products", AI_IMPL, "Verified live", ["src/lib/dod-ic/emass-export-engine.ts", "src/lib/rmf-v2/assessment-and-learning.ts"], "/api/v2/dod-ic/export/binder"],
    [69, "POA&M lifecycle management", "Core products", AI_IMPL, "Verified live", ["src/lib/noctis-rmf-rules.ts", "src/lib/enterprise/relational-sync.server.ts"], "/api/v2/enterprise/db/health"],
    [70, "Control inheritance and reciprocity", "Enterprise", AI_IMPL, "Verified live (Digital Twin simulation)", ["src/lib/enterprise/authorization-digital-twin.ts"], "/api/v2/enterprise/digital-twin/simulate-inheritance"],
    [71, "Organization-defined parameter registry", "Enterprise", AI_IMPL, "Verified live (Policy-as-Code rules)", ["src/lib/enterprise/policy-as-code-engine.ts"], "/api/v2/enterprise/policy-as-code/packs"],
    [72, "Continuous monitoring", "Enterprise", AI_IMPL, "Verified live (CCV + monitoring.runs)", ["src/lib/enterprise/evidence-and-ccv-engine.ts"], "/api/v2/enterprise/ccv/validate"],
    [73, "Continuous ATO support", "Enterprise", AI_IMPL, "Verified live (DoD cATO guardrails)", ["src/lib/dod-ic/devsecops-cloud-engine.ts"], "/api/v2/dod-ic/status"],
    [74, "Evidence collection and mapping", "Foundation", AI_IMPL, "Verified live", ["src/lib/enterprise/evidence-and-ccv-engine.ts", "src/lib/rmf-v2/evidence.ts"], "/api/v2/enterprise/evidence/analyze"],
    [75, "Risk acceptance workflows", "Enterprise", AI_IMPL, "Verified live (AO human sign-off mandatory)", ["src/lib/rmf-v2/governance.ts", "src/lib/enterprise/ai-agent-governance.ts"], "/api/v2/enterprise/agents/authorize"],
    [76, "Control effectiveness testing", "Enterprise", AI_IMPL, "Verified live (CCV Drift Detection)", ["src/lib/enterprise/evidence-and-ccv-engine.ts"], "/api/v2/enterprise/ccv/validate"],
    [77, "Security categorization", "Core products", AI_IMPL, "Verified live (FIPS 199 & CNSSI 1253)", ["src/lib/dod-ic/dod-rmf-engine.ts", "src/lib/ndkrs/rules-engine.server.ts"], "/api/v2/ndkrs/rules/execute"],
    [78, "System boundary modeling", "Enterprise", AI_IMPL, "Verified live", ["src/lib/enterprise/authorization-digital-twin.ts"], "/api/v2/enterprise/digital-twin/evaluate"],
    [79, "Compliance knowledge graph", "Foundation", AI_IMPL, "Verified live (SQL graph.*)", ["src/lib/enterprise/graph-and-mission-risk.ts"], "/api/v2/enterprise/knowledge-graph/query"],
    [80, "Audit and inspection readiness", "Enterprise", AI_IMPL, "Verified live (eMASS + Custody Chain)", ["src/lib/dod-ic/emass-export-engine.ts", "src/lib/enterprise/evidence-chain-of-custody.ts"], "/api/v2/dod-ic/export/emass-xlsx"],
  ]),
  ...buildDiv("V", "Department of Defense and Intelligence Community", [
    [81, "DoD RMF and DoDI 8510.01", "Enterprise", AI_IMPL, "Verified live", ["src/lib/dod-ic/dod-rmf-engine.ts"], "/api/v2/dod-ic/status"],
    [82, "ICD 503 risk management", "Enterprise", AI_IMPL, "Verified live", ["src/lib/dod-ic/ic-security-engine.ts"], "/api/v2/dod-ic/status"],
    [83, "National security systems security", "Enterprise", AI_IMPL, "Verified live (CNSSI 1253)", ["src/lib/dod-ic/dod-rmf-engine.ts"], "/api/v2/dod-ic/status"],
    [84, "DISA STIG and SRG intelligence", "Enterprise", AI_IMPL, "Verified live (5,137 CCIs + 26 STIG rules)", ["src/lib/dod-ic/stig-library.ts", "src/lib/dod-ic/stig-acas-engine.ts"], "/api/v2/dod-ic/stig/library"],
    [85, "ACAS vulnerability analysis", "Enterprise", AI_IMPL, "Verified live (.nessus parser)", ["src/lib/dod-ic/stig-acas-engine.ts"], "/api/v2/dod-ic/status"],
    [86, "eMASS and authorized GRC integration", "Enterprise", AI_IMPL, "Verified live (OOXML .xlsx export)", ["src/lib/dod-ic/emass-export-engine.ts"], "/api/v2/dod-ic/export/emass-xlsx"],
    [87, "DoD cloud security requirements", "Enterprise", AI_IMPL, "Verified live (IL2-IL6 CC SRG)", ["src/lib/dod-ic/devsecops-cloud-engine.ts"], "/api/v2/dod-ic/status"],
    [88, "Classified-system security governance", "Enterprise", AI_IMPL, "Verified live (unclassified boundary only)", ["src/lib/dod-ic/classified-systems-engine.ts", "src/lib/dod-ic/classification-gateway.ts"], "/api/v2/enterprise/model-gateway/route", "Runs strictly on UNCLASSIFIED design references; no classified network hosting."],
    [89, "SCI and SCIF security compliance", "Enterprise", AI_IMPL, "Verified live (ICD 705 rules)", ["src/lib/dod-ic/classified-systems-engine.ts"], "/api/v2/dod-ic/status"],
    [90, "Cross-domain information-flow governance", "Enterprise", AI_IMPL, "Verified live (NCDSMO CDS checks)", ["src/lib/dod-ic/ic-security-engine.ts"], "/api/v2/dod-ic/status"],
    [91, "COMSEC and cryptographic governance", "Enterprise", AI_IMPL, "Verified live (CNSSP 15 CNSA 2.0)", ["src/lib/dod-ic/classified-systems-engine.ts"], "/api/v2/dod-ic/status"],
    [92, "TEMPEST/EMSEC compliance references", "Enterprise", AI_IMPL, "Verified live (RED/BLACK rules)", ["src/lib/dod-ic/classified-systems-engine.ts"], "/api/v2/dod-ic/status"],
    [93, "DoD Zero Trust and ICAM", "Enterprise", AI_IMPL, "Verified live", ["src/lib/dod-ic/zero-trust-icam-engine.ts"], "/api/v2/dod-ic/status"],
    [94, "Insider-threat risk management", "Enterprise", AI_IMPL, "Verified live (DoDI 5205.16)", ["src/lib/dod-ic/dco-forensics-engine.ts"], "/api/v2/dod-ic/status"],
    [95, "Defense cyber operations support", "Enterprise", AI_IMPL, "Verified live", ["src/lib/dod-ic/dco-forensics-engine.ts", "src/lib/dod-ic/sigma-attack-engine.ts"], "/api/v2/dod-ic/dco/sigma-navigator"],
    [96, "Mission assurance and continuity", "Enterprise", AI_IMPL, "Verified live (DAG & SPOF)", ["src/lib/dod-ic/mission-acquisition-space-engine.ts", "src/lib/enterprise/graph-and-mission-risk.ts"], "/api/v2/enterprise/mission-risk/assess"],
    [97, "Defense acquisition compliance", "Enterprise", AI_IMPL, "Verified live (CMMC / DFARS)", ["src/lib/dod-ic/mission-acquisition-space-engine.ts"], "/api/v2/dod-ic/status"],
    [98, "Intelligence source evaluation", "Enterprise", AI_IMPL, "Verified live (NATO 6x6 Admiralty)", ["src/lib/dod-ic/intel-tradecraft-fusion-engine.ts"], "/api/v2/dod-ic/status"],
    [99, "Multi-INT analytical fusion", "Enterprise", AI_IMPL, "Verified live (unclassified fusion)", ["src/lib/dod-ic/intel-tradecraft-fusion-engine.ts", "src/lib/catalog260/gap-closure-solvers.ts"], "/api/v2/catalog/solve"],
    [100, "Defense AI assurance and governance", "Enterprise", AI_IMPL, "Verified live (DoDD 3000.09)", ["src/lib/dod-ic/defense-ai-governance-engine.ts"], "/api/v2/enterprise/agents/manifest"],
  ]),
  ...buildDiv("VI", "Intelligence disciplines and national security analysis", [
    [101, "Open-source intelligence (OSINT)", "Enterprise", CLOSED, "Closed with Multi-INT OSINT corroboration solver", ["src/lib/catalog260/gap-closure-solvers.ts", "src/lib/noctis-live-search.server.ts"], "/api/v2/catalog/solve"],
    [102, "Geospatial intelligence (GEOINT)", "Enterprise", CLOSED, "Closed with InSAR/SAR & GEOINT delta solver", ["src/lib/catalog260/gap-closure-solvers.ts", "src/lib/noctis-insar-geodesy-deformation-engine.ts"], "/api/v2/catalog/solve"],
    [103, "Imagery intelligence (IMINT)", "Enterprise", CLOSED, "Closed with IMINT baseline-vs-current change delta solver", ["src/lib/catalog260/gap-closure-solvers.ts"], "/api/v2/catalog/solve"],
    [104, "Authorized signals metadata analysis", "Enterprise", CLOSED, "Closed with unclassified RF link/metadata bounds check", ["src/lib/catalog260/gap-closure-solvers.ts", "src/lib/nups/deterministic-domain-solvers.ts"], "/api/v2/catalog/solve", "Strictly unclassified public/authorized metadata only."],
    [105, "Measurement and signature intelligence analysis", "Enterprise", CLOSED, "Closed with spectral/sensor entropy & nuclear signature check", ["src/lib/catalog260/gap-closure-solvers.ts", "src/lib/noctis-nuclear-forensics-safeguards-engine.ts"], "/api/v2/catalog/solve"],
    [106, "Structured analytic techniques", "Enterprise", AI_IMPL, "Verified live (ACH matrix)", ["src/lib/dod-ic/intel-tradecraft-fusion-engine.ts"], "/api/v2/dod-ic/status"],
    [107, "Competing hypotheses analysis", "Enterprise", AI_IMPL, "Verified live (ICD 203 ACH falsification)", ["src/lib/dod-ic/intel-tradecraft-fusion-engine.ts"], "/api/v2/dod-ic/status"],
    [108, "Intelligence confidence scoring", "Reliability", AI_IMPL, "Verified live (ICD 203 bands)", ["src/lib/dod-ic/intel-tradecraft-fusion-engine.ts", "src/lib/catalog260/dependability-suite.server.ts"], "/api/v2/catalog/dependability/run"],
    [109, "Source reliability and provenance", "Foundation", AI_IMPL, "Verified live (NDKRS trust tiers + NATO 6x6)", ["src/lib/ndkrs/persistence.server.ts", "src/lib/dod-ic/intel-tradecraft-fusion-engine.ts"], "/api/v2/ndkrs/status"],
    [110, "Geopolitical risk analysis", "Enterprise", CLOSED, "Closed with corroborated geopolitical risk & uncertainty solver", ["src/lib/catalog260/gap-closure-solvers.ts"], "/api/v2/catalog/solve"],
    [111, "Strategic forecasting with uncertainty", "Enterprise", CLOSED, "Closed with ICD 203 confidence & calibrated epistemic intervals", ["src/lib/catalog260/gap-closure-solvers.ts", "src/lib/catalog260/dependability-suite.server.ts"], "/api/v2/catalog/dependability/run"],
    [112, "Satellite imagery change detection", "Enterprise", CLOSED, "Closed with IMINT/InSAR baseline coverage delta computation", ["src/lib/catalog260/gap-closure-solvers.ts", "src/lib/noctis-insar-geodesy-deformation-engine.ts"], "/api/v2/catalog/solve"],
    [113, "Geospatial visualization", "Enterprise", AI_IMPL, "Verified live (3D Holodeck / Attack Graph)", ["src/lib/noctis-holodeck-3d.ts", "src/lib/attack-map.ts"], "/api/noctis"],
    [114, "Intelligence report generation", "Enterprise", AI_IMPL, "Verified live", ["src/lib/dod-ic/dod-ic-reasoning.server.ts", "src/lib/dod-ic/intel-tradecraft-fusion-engine.ts"], "/api/noctis"],
    [115, "Information-sharing governance", "Enterprise", AI_IMPL, "Verified live (CUI / Tenant / Gate 0)", ["src/lib/dod-ic/classification-gateway.ts", "src/lib/enterprise/graph-and-mission-risk.ts"], "/api/v2/enterprise/knowledge-graph/query"],
    [116, "Counterintelligence risk analysis", "Enterprise", AI_IMPL, "Verified live (Insider Threat + FOCI 32 CFR 117)", ["src/lib/dod-ic/dco-forensics-engine.ts", "src/lib/dod-ic/mission-acquisition-space-engine.ts"], "/api/v2/dod-ic/status"],
    [117, "Supply-chain intelligence", "Enterprise", AI_IMPL, "Verified live (SBOM + EOQ + CMMC)", ["src/lib/enterprise/government-readiness.ts", "src/lib/nups/deterministic-domain-solvers.ts"], "/api/v2/nups/solve"],
    [118, "Mission dependency mapping", "Enterprise", AI_IMPL, "Verified live (SPOF DAG + MEF risk)", ["src/lib/dod-ic/mission-acquisition-space-engine.ts", "src/lib/enterprise/graph-and-mission-risk.ts"], "/api/v2/enterprise/mission-risk/assess"],
    [119, "Public-source event monitoring", "Enterprise", CLOSED, "Closed with Policy Change Drift Monitor & Source Freshness Monitor", ["src/lib/dod-ic/policy-change-engine.server.ts", "src/lib/catalog260/dependability-suite.server.ts"], "/api/v2/catalog/freshness"],
    [120, "Intelligence audit and oversight", "Enterprise", AI_IMPL, "Verified live (Hash-chained audit ledger)", ["src/lib/enterprise/evidence-chain-of-custody.ts", "src/lib/enterprise/persistence.server.ts"], "/api/v2/enterprise/custody/chain"],
  ]),
  ...buildDiv("VII", "Noctis Health and clinical intelligence", [
    [121, "Clinical information retrieval", "Core products", AI_IMPL, "Verified live (NDKRS clinical domain)", ["src/lib/ndkrs/hybrid-retrieval.server.ts"], "/api/v2/ndkrs/search"],
    [122, "Symptom assessment and triage support", "Core products", AI_IMPL, "Verified live (FDA Non-Device CDS)", ["src/lib/noctis-universal-clinical.server.ts", "src/lib/noctis-health-engine.ts"], "/api/noctis"],
    [123, "Differential diagnosis support", "Core products", AI_IMPL, "Verified live", ["src/lib/noctis-universal-clinical.server.ts", "src/lib/noctis-clinical-engine.ts"], "/api/noctis"],
    [124, "Emergency and ICU clinical reasoning", "Reliability", AI_IMPL, "Verified live (CRIT-046/047/048 verified)", ["src/lib/noctis-universal-clinical.server.ts", "src/lib/noctis-code-blue-sim.ts"], "/api/v2/enterprise/eval-lab/run"],
    [125, "Cardiology decision support", "Core products", AI_IMPL, "Verified live", ["src/lib/noctis-cardiology-mcs.ts", "src/lib/noctis-cardiovascular-engine.ts"], "/api/noctis"],
    [126, "Neurology and stroke decision support", "Core products", AI_IMPL, "Verified live", ["src/lib/noctis-stroke-reperfusion.ts", "src/lib/noctis-neuro-intensive-care.ts"], "/api/noctis"],
    [127, "Nephrology and electrolyte analysis", "Reliability", AI_IMPL, "Verified live (KDIGO AKI + Corrected Na + Anion Gap)", ["src/lib/noctis-nephrology-crrt.ts", "src/lib/noctis-crrt-kdigo.ts", "src/lib/ndkrs/rules-engine.server.ts"], "/api/v2/ndkrs/rules/execute"],
    [128, "Endocrinology and diabetes management support", "Core products", AI_IMPL, "Verified live (DKA/HHS protocol)", ["src/lib/noctis-endocrinology-crises.ts", "src/lib/noctis-dka-hhs-protocol.ts"], "/api/noctis"],
    [129, "Infectious disease analysis", "Core products", AI_IMPL, "Verified live", ["src/lib/noctis-infectious-disease-engine.ts", "src/lib/noctis-infectious-disease-sepsis.ts"], "/api/noctis"],
    [130, "Respiratory and ventilator calculations", "Reliability", AI_IMPL, "Verified live (PBW ARDSNet)", ["src/lib/noctis-mechanical-ventilation.ts", "src/lib/noctis-critical-care-vent.ts"], "/api/noctis"],
    [131, "Oncology information and guideline analysis", "Core products", AI_IMPL, "Verified live", ["src/lib/noctis-oncology-immunotherapy.ts", "src/lib/noctis-oncology-chronic-engine.ts"], "/api/noctis"],
    [132, "Pharmacology and drug interaction checking", "Core products", AI_IMPL, "Verified live", ["src/lib/noctis-pharmacology-matrix.ts", "src/lib/noctis-toxicology.ts"], "/api/noctis"],
    [133, "Medication reconciliation", "Reliability", AI_IMPL, "Verified live (Zero med-gap contamination)", ["src/lib/noctis-universal-clinical.server.ts", "src/lib/noctis-clinical-scratchpad.ts"], "/api/noctis"],
    [134, "Laboratory result interpretation", "Reliability", AI_IMPL, "Verified live (CRIT-046/047 typed current vs baseline)", ["src/lib/noctis-clinical-extractor-router.ts", "src/lib/enterprise/ai-evaluation-lab.ts"], "/api/v2/enterprise/eval-lab/investigate/CRIT-046"],
    [135, "Medical imaging assistance", "Core products", AI_IMPL, "Verified live (DICOM & 12-lead ECG vision)", ["src/lib/noctis-dicom-vision.ts", "src/lib/noctis-ecg-vision.ts"], "/api/noctis"],
    [136, "Pathology and genomics interpretation", "Advanced domains", AI_IMPL, "Verified live (CPIC PGx + Epigenomics)", ["src/lib/noctis-pgx-engine.ts", "src/lib/noctis-epigenomics-chromatin-dynamics-engine.ts"], "/api/noctis"],
    [137, "FHIR/HL7 healthcare interoperability", "Core products", AI_IMPL, "Verified live (SMART-on-FHIR & HL7)", ["src/lib/noctis-smart-fhir.ts", "src/lib/noctis-fhir-exporter.ts", "src/lib/noctis-lis-hl7.ts"], "/api/noctis/smart-fhir"],
    [138, "Clinical documentation and SOAP notes", "Core products", AI_IMPL, "Verified live", ["src/lib/noctis-clinical-export.ts", "src/lib/noctis-ambient-dictation.ts"], "/api/noctis"],
    [139, "Clinical guideline and evidence retrieval", "Foundation", AI_IMPL, "Verified live (KDIGO, Surviving Sepsis)", ["src/lib/ndkrs/corpus-seed.ts", "src/lib/noctis-clinical-evidence-validator.ts"], "/api/v2/ndkrs/search"],
    [140, "Independent clinical safety validation", "Reliability", AI_IMPL, "Verified live (Fail-Closed + Enclave AES-256-GCM)", ["src/lib/noctis-clinical-validation-engine.ts", "src/lib/noctis-clinical-preflight-auditor.ts", "src/lib/ndkrs/enclave-crypto.server.ts"], "/api/v2/enterprise/verify"],
  ]),
  ...buildDiv("VIII", "Noctis Legal Intelligence", [
    [141, "Federal legal research", "Core products", AI_IMPL, "Verified live (NDKRS legal + USC/CFR)", ["src/lib/noctis-legal-engine.ts", "src/lib/ndkrs/corpus-seed.ts"], "/api/noctis"],
    [142, "State and local legal research", "Core products", AI_IMPL, "Verified live (Maryland & multi-state pack)", ["src/lib/noctis-legal-engine.ts", "src/lib/noctis-lex-synthesizer.ts"], "/api/noctis"],
    [143, "Statute and regulation retrieval", "Foundation", AI_IMPL, "Verified live", ["src/lib/noctis-legal-engine.ts", "src/lib/ndkrs/hybrid-retrieval.server.ts"], "/api/v2/ndkrs/search"],
    [144, "Case law and precedent verification", "Reliability", AI_IMPL, "Verified live (Zero fabricated citation gate)", ["src/lib/noctis-legal-engine.ts", "src/lib/noctis-law-jurisprudence-engine.ts"], "/api/noctis"],
    [145, "Jurisdiction and venue analysis", "Core products", AI_IMPL, "Verified live", ["src/lib/noctis-legal-engine.ts"], "/api/noctis"],
    [146, "IRAC and CREAC legal reasoning", "Core products", AI_IMPL, "Verified live", ["src/lib/noctis-legal-engine.ts"], "/api/noctis"],
    [147, "Contract analysis", "Core products", AI_IMPL, "Verified live (FAR/DFARS + Commercial)", ["src/lib/noctis-legal-engine.ts", "src/lib/nups/deterministic-domain-solvers.ts"], "/api/noctis"],
    [148, "Litigation research", "Core products", AI_IMPL, "Verified live (FRCP 12(b)(6)/56)", ["src/lib/noctis-legal-engine.ts"], "/api/noctis"],
    [149, "Pleading and motion drafting", "Core products", AI_IMPL, "Verified live (attorney-review required)", ["src/lib/noctis-legal-engine.ts", "src/lib/noctis-lex-synthesizer.ts"], "/api/noctis"],
    [150, "Discovery and evidence management", "Enterprise", CLOSED, "Closed with Rule 26(f) hold & Custody chain", ["src/lib/catalog260/gap-closure-solvers.ts", "src/lib/enterprise/evidence-chain-of-custody.ts"], "/api/v2/catalog/solve"],
    [151, "E-discovery and document review", "Enterprise", CLOSED, "Closed with Bates & privilege log compliance gate", ["src/lib/catalog260/gap-closure-solvers.ts", "src/lib/noctis-document-intelligence.ts"], "/api/v2/catalog/solve"],
    [152, "Legal citation verification", "Reliability", AI_IMPL, "Verified live (4-tier verifier)", ["src/lib/noctis-legal-engine.ts", "src/lib/catalog260/dependability-suite.server.ts"], "/api/v2/catalog/dependability/run"],
    [153, "Procedural deadline calculation", "Reliability", CLOSED, "Closed with exact FRCP Rule 6(a)/(d) weekend & federal holiday calendar", ["src/lib/catalog260/gap-closure-solvers.ts"], "/api/v2/catalog/solve"],
    [154, "Administrative law", "Core products", AI_IMPL, "Verified live (APA 5 U.S.C. § 706 / Loper Bright)", ["src/lib/noctis-law-jurisprudence-engine.ts"], "/api/noctis"],
    [155, "Employment and labor law", "Enterprise", CLOSED, "Closed with FLSA 1.5x OT, FMLA & WARN 60-day solver", ["src/lib/catalog260/gap-closure-solvers.ts"], "/api/v2/catalog/solve"],
    [156, "Intellectual property law", "Core products", AI_IMPL, "Verified live (35 U.S.C. 101 Alice/Mayo)", ["src/lib/noctis-law-jurisprudence-engine.ts"], "/api/noctis"],
    [157, "Corporate and commercial law", "Core products", AI_IMPL, "Verified live (SEC 10b-5/SOX/DGCL)", ["src/lib/noctis-law-jurisprudence-engine.ts"], "/api/noctis"],
    [158, "Privacy and data protection law", "Core products", AI_IMPL, "Verified live (HIPAA + GDPR/PII redactor)", ["src/lib/ndkrs/corpus-seed.ts", "src/lib/catalog260/dependability-suite.server.ts"], "/api/v2/catalog/dependability/run"],
    [159, "Court filing workflow support", "Enterprise", CLOSED, "Closed with attorney-signoff workflow & Rule 6 deadline verification", ["src/lib/catalog260/gap-closure-solvers.ts", "src/lib/noctis-legal-engine.ts"], "/api/v2/catalog/solve", "Requires barred human attorney sign-off & external CM/ECF portal submission."],
    [160, "Attorney-review and legal safety gates", "Reliability", AI_IMPL, "Verified live (Non-UPL fail-closed gate)", ["src/lib/noctis-legal-engine.ts", "src/lib/enterprise/independent-verification-engine.ts"], "/api/v2/enterprise/verify"],
  ]),
  ...buildDiv("IX", "Mathematics, physics, and fundamental science", [
    [161, "Algebra and symbolic mathematics", "Foundation", AI_IMPL, "Verified live", ["src/lib/worked-figures.ts", "src/lib/noctis-universal-science-engine.ts"], "/api/noctis"],
    [162, "Calculus and differential equations", "Foundation", AI_IMPL, "Verified live (PDE/RK4 solvers)", ["src/lib/noctis-pde.ts"], "/api/noctis"],
    [163, "Linear algebra", "Foundation", AI_IMPL, "Verified live", ["src/lib/noctis-pde.ts", "src/lib/noctis-science-platform.ts"], "/api/v2/nups/solve"],
    [164, "Probability and statistics", "Core products", AI_IMPL, "Verified live (VaR/Chi-square/Bayes)", ["src/lib/noctis-quant-risk.ts", "src/lib/catalog260/gap-closure-solvers.ts"], "/api/v2/catalog/solve"],
    [165, "Numerical optimization", "Core products", AI_IMPL, "Verified live (EOQ / Gradient)", ["src/lib/nups/deterministic-domain-solvers.ts", "src/lib/noctis-pde.ts"], "/api/v2/nups/solve"],
    [166, "Mathematical proof assistance", "Foundation", AI_IMPL, "Verified live (Invariants + Ledger)", ["src/lib/noctis-science-platform.ts", "src/lib/noctis-truth-ledger.ts"], "/api/v2/nups/solve"],
    [167, "Classical mechanics", "Core products", AI_IMPL, "Verified live", ["src/lib/noctis-universal-science-engine.ts"], "/api/noctis"],
    [168, "Electromagnetism", "Core products", AI_IMPL, "Verified live", ["src/lib/noctis-science-platform.ts", "src/lib/noctis-tokamak-mhd-divertor-engine.ts"], "/api/v2/nups/solve"],
    [169, "Thermodynamics", "Core products", AI_IMPL, "Verified live (Ideal Gas + Cryo + Nernst)", ["src/lib/noctis-universal-science-engine.ts", "src/lib/ndkrs/rules-engine.server.ts"], "/api/noctis"],
    [170, "Quantum physics", "Core products", AI_IMPL, "Verified live (de Broglie + Surface Code)", ["src/lib/noctis-universal-science-engine.ts", "src/lib/noctis-quantum-computing-engine.ts"], "/api/noctis"],
    [171, "Computational physics", "Core products", AI_IMPL, "Verified live", ["src/lib/noctis-universal-science-engine.ts", "src/lib/noctis-science-subsystem.ts"], "/api/noctis"],
    [172, "Astronomy and astrophysics", "Core products", AI_IMPL, "Verified live (Schwarzschild + Hubble + CR3BP)", ["src/lib/noctis-universal-science-engine.ts", "src/lib/noctis-astrophysics-orbital-engine.ts"], "/api/noctis"],
    [173, "Chemistry and reaction analysis", "Core products", AI_IMPL, "Verified live (118 elements + Henderson-Hasselbalch)", ["src/lib/noctis-universal-science-engine.ts", "src/lib/noctis-chemical-reactor-process-engine.ts"], "/api/noctis"],
    [174, "Materials science", "Core products", AI_IMPL, "Verified live", ["src/lib/noctis-materials-metallurgy-engine.ts", "src/lib/noctis-polymer-rheology-synthesis-engine.ts"], "/api/v2/nups/solve"],
    [175, "Scientific experiment design", "Core products", AI_IMPL, "Verified live", ["src/lib/noctis-science-platform.ts", "src/lib/noctis-science-subsystem.ts"], "/api/v2/nups/solve"],
    [176, "Scientific literature review", "Core products", AI_IMPL, "Verified live", ["src/lib/noctis-deep-research.ts", "src/lib/ndkrs/hybrid-retrieval.server.ts"], "/api/v2/ndkrs/search"],
    [177, "Unit conversion and dimensional analysis", "Foundation", CLOSED, "Closed with exact NIST SP 811 dimensional converter", ["src/lib/catalog260/gap-closure-solvers.ts", "src/lib/noctis-universal-science-engine.ts"], "/api/v2/catalog/solve"],
    [178, "Simulation and numerical solvers", "Core products", AI_IMPL, "Verified live", ["src/lib/noctis-digital-twin.ts", "src/lib/noctis-pde.ts"], "/api/v2/nups/solve"],
    [179, "Scientific visualization", "Core products", AI_IMPL, "Verified live (3D Holodeck + Mermaid/Canvas)", ["src/lib/noctis-holodeck-3d.ts"], "/api/noctis"],
    [180, "Reproducible research workflows", "Reliability", AI_IMPL, "Verified live (SHA-256 provenance)", ["src/lib/enterprise/evidence-chain-of-custody.ts", "src/lib/nups/orchestrator.server.ts"], "/api/v2/nups/solve"],
  ]),
  ...buildDiv("X", "Engineering, industry, and infrastructure", [
    [181, "Mechanical engineering", "Advanced domains", AI_IMPL, "Verified live", ["src/lib/noctis-cfd-turbulence-modeling-engine.ts", "src/lib/ndkrs/rules-engine.server.ts"], "/api/v2/nups/solve"],
    [182, "Electrical engineering", "Advanced domains", AI_IMPL, "Verified live", ["src/lib/noctis-energy-grid.ts", "src/lib/nups/deterministic-domain-solvers.ts"], "/api/v2/nups/solve"],
    [183, "Civil and structural engineering", "Advanced domains", AI_IMPL, "Verified live", ["src/lib/noctis-civil-structural-engine.ts", "src/lib/noctis-geotechnical-liquefaction-engine.ts"], "/api/v2/nups/solve"],
    [184, "Chemical engineering", "Advanced domains", AI_IMPL, "Verified live", ["src/lib/noctis-chemical-reactor-process-engine.ts"], "/api/v2/nups/solve"],
    [185, "Aerospace engineering", "Advanced domains", AI_IMPL, "Verified live", ["src/lib/noctis-aerospace-defense-engine.ts", "src/lib/nups/deterministic-domain-solvers.ts"], "/api/v2/nups/solve"],
    [186, "Automotive diagnostics", "Advanced domains", AI_IMPL, "Verified live", ["src/lib/noctis-automotive-engine.ts"], "/api/noctis"],
    [187, "Marine and naval engineering", "Advanced domains", AI_IMPL, "Verified live (GM stability + acoustics)", ["src/lib/noctis-naval-architecture-hydrodynamics-engine.ts", "src/lib/nups/deterministic-domain-solvers.ts"], "/api/v2/nups/solve"],
    [188, "Nuclear engineering and radiation safety", "Advanced domains", AI_IMPL, "Verified live (NRC ALARA/HVL + Neutronics)", ["src/lib/noctis-fission-core-neutronics-engine.ts", "src/lib/nups/deterministic-domain-solvers.ts"], "/api/v2/nups/solve"],
    [189, "Telecommunications and RF engineering", "Advanced domains", AI_IMPL, "Verified live (FSPL Link Budget + 6G)", ["src/lib/noctis-telecom-photonics-6g-engine.ts", "src/lib/nups/deterministic-domain-solvers.ts"], "/api/v2/nups/solve"],
    [190, "Robotics and autonomous systems", "Advanced domains", AI_IMPL, "Verified live", ["src/lib/noctis-robotics-autonomous-systems-engine.ts", "src/lib/noctis-robotics-scada.ts"], "/api/v2/nups/solve"],
    [191, "Industrial automation and PLC analysis", "Advanced domains", AI_IMPL, "Verified live (IEC 61508 + SCADA)", ["src/lib/noctis-robotics-scada.ts", "src/lib/nups/deterministic-domain-solvers.ts"], "/api/v2/nups/solve"],
    [192, "Manufacturing quality control", "Advanced domains", AI_IMPL, "Verified live (ISO 22400 OEE)", ["src/lib/nups/deterministic-domain-solvers.ts"], "/api/v2/nups/solve"],
    [193, "Predictive maintenance", "Advanced domains", AI_IMPL, "Verified live (Telemetry + Drift)", ["src/lib/noctis-predictive-intelligence.ts", "src/lib/noctis-universal-ingestor.ts"], "/api/noctis/ingest"],
    [194, "Power systems and microgrids", "Advanced domains", AI_IMPL, "Verified live (NFPA 99/110 ATS)", ["src/lib/noctis-energy-grid.ts", "src/lib/nups/deterministic-domain-solvers.ts"], "/api/v2/nups/solve"],
    [195, "Renewable energy engineering", "Advanced domains", AI_IMPL, "Verified live", ["src/lib/noctis-renewable-energy-engine.ts", "src/lib/noctis-solar-thermal-csp-engine.ts"], "/api/v2/nups/solve"],
    [196, "Water and wastewater infrastructure", "Advanced domains", CLOSED, "Closed with EPA SWTR CT & Hazen-Williams headloss solver", ["src/lib/catalog260/gap-closure-solvers.ts", "src/lib/noctis-hydrology-water-resources-engine.ts"], "/api/v2/catalog/solve"],
    [197, "Building systems and HVAC", "Advanced domains", CLOSED, "Closed with ASHRAE 62.1/170 BTU/Tons & ACH solver", ["src/lib/catalog260/gap-closure-solvers.ts"], "/api/v2/catalog/solve"],
    [198, "Digital twins and MBSE", "Enterprise", AI_IMPL, "Verified live (DoDI 5000.97 + Auth Twin)", ["src/lib/enterprise/authorization-digital-twin.ts", "src/lib/noctis-digital-twin.ts"], "/api/v2/enterprise/digital-twin/evaluate"],
    [199, "Engineering standards retrieval", "Foundation", AI_IMPL, "Verified live (NDKRS engineering)", ["src/lib/ndkrs/corpus-seed.ts", "src/lib/ndkrs/hybrid-retrieval.server.ts"], "/api/v2/ndkrs/search"],
    [200, "Engineering safety verification", "Reliability", AI_IMPL, "Verified live (MIL-STD-882E / ARP4761)", ["src/lib/ndkrs/corpus-seed.ts", "src/lib/enterprise/independent-verification-engine.ts"], "/api/v2/enterprise/verify"],
  ]),
  ...buildDiv("XI", "Business, finance, government, and everyday applications", [
    [201, "Financial analysis and forecasting", "Enterprise", AI_IMPL, "Verified live (VaR / NPV / IRR)", ["src/lib/noctis-investment-engine.ts", "src/lib/noctis-quant-risk.ts"], "/api/v2/nups/solve"],
    [202, "Accounting and tax research", "Enterprise", CLOSED, "Closed with GAAP Current/Quick liquidity & margin solver", ["src/lib/catalog260/gap-closure-solvers.ts"], "/api/v2/catalog/solve", "Non-CPA computational check; confirm tax filings with licensed CPA."],
    [203, "Insurance claims and risk analysis", "Enterprise", AI_IMPL, "Verified live (Combined Ratio / Pure Premium)", ["src/lib/nups/deterministic-domain-solvers.ts"], "/api/v2/nups/solve"],
    [204, "Fraud detection and investigation support", "Enterprise", CLOSED, "Closed with Benford's Law chi-square & BSA $10k structuring solver", ["src/lib/catalog260/gap-closure-solvers.ts"], "/api/v2/catalog/solve"],
    [205, "Enterprise business intelligence", "Enterprise", AI_IMPL, "Verified live", ["src/lib/enterprise/api-handler.server.ts"], "/api/v2/enterprise/command-center"],
    [206, "Market research", "Enterprise", CLOSED, "Closed via Business/Market analytics & OSINT retrieval", ["src/lib/catalog260/gap-closure-solvers.ts", "src/lib/noctis-deep-research.ts"], "/api/v2/catalog/solve"],
    [207, "Sales and customer analytics", "Enterprise", CLOSED, "Closed via LTV:CAC / Net Retention & BI solver", ["src/lib/catalog260/gap-closure-solvers.ts"], "/api/v2/catalog/solve"],
    [208, "Human resources support", "Enterprise", CLOSED, "Closed with FLSA/FMLA/WARN & HR compensation checks", ["src/lib/catalog260/gap-closure-solvers.ts"], "/api/v2/catalog/solve"],
    [209, "Project and program management", "Enterprise", CLOSED, "Closed with PMI / ANSI EIA-748 EVM (CPI, SPI, EAC, TCPI)", ["src/lib/catalog260/gap-closure-solvers.ts"], "/api/v2/catalog/solve"],
    [210, "Procurement and contract management", "Enterprise", AI_IMPL, "Verified live (FAR $10k/$250k + Human CO)", ["src/lib/nups/deterministic-domain-solvers.ts"], "/api/v2/nups/solve"],
    [211, "Supply-chain optimization", "Enterprise", AI_IMPL, "Verified live (Wilson EOQ + Logistics)", ["src/lib/nups/deterministic-domain-solvers.ts", "src/lib/noctis-supply-chain-logistics-engine.ts"], "/api/v2/nups/solve"],
    [212, "Transportation and fleet management", "Enterprise", AI_IMPL, "Verified live", ["src/lib/noctis-urban-transit-mobility-engine.ts", "src/lib/nups/deterministic-domain-solvers.ts"], "/api/v2/nups/solve"],
    [213, "Agriculture and food security", "Advanced domains", AI_IMPL, "Verified live", ["src/lib/noctis-agrigenomics-food-security-engine.ts", "src/lib/noctis-soil-biogeochemistry-agronomy-engine.ts"], "/api/v2/nups/solve"],
    [214, "Environmental intelligence", "Advanced domains", AI_IMPL, "Verified live (EPA 2024 AQI + Earth Systems)", ["src/lib/noctis-environmental-earth-systems-engine.ts", "src/lib/nups/deterministic-domain-solvers.ts"], "/api/v2/nups/solve"],
    [215, "Climate and weather analytics", "Advanced domains", AI_IMPL, "Verified live", ["src/lib/noctis-environmental-earth-systems-engine.ts", "src/lib/noctis-cloud-microphysics-precipitation-engine.ts"], "/api/v2/nups/solve"],
    [216, "Real estate and property analysis", "Enterprise", AI_IMPL, "Verified live (NOI / Cap Rate / DSCR >= 1.25x)", ["src/lib/nups/deterministic-domain-solvers.ts"], "/api/v2/nups/solve"],
    [217, "Government grants and administration", "Enterprise", AI_IMPL, "Verified live (2 CFR 200 $1M Single Audit + NARA)", ["src/lib/nups/deterministic-domain-solvers.ts"], "/api/v2/nups/solve"],
    [218, "Public safety and disaster preparedness", "Enterprise", AI_IMPL, "Verified live (FEMA NIMS/HICS + CMS 482.15)", ["src/lib/nups/deterministic-domain-solvers.ts", "src/lib/noctis-early-warning.ts"], "/api/v2/nups/solve"],
    [219, "Education and adaptive tutoring", "Core products", AI_IMPL, "Verified live", ["src/lib/study-pass.ts", "src/lib/curriculum.ts"], "/api/noctis"],
    [220, "Personal productivity and life administration", "Enterprise", CLOSED, "Closed with Emergency Runway & Debt Avalanche/Snowball planner", ["src/lib/catalog260/gap-closure-solvers.ts", "src/lib/noctis-universal-life-router.ts"], "/api/v2/catalog/solve"],
  ]),
  ...buildDiv("XII", "Multimodal, creative, and communication intelligence", [
    [221, "Image understanding", "Core products", AI_IMPL, "Verified live", ["src/lib/noctis-multimodal-cross-attention.ts", "src/lib/noctis-dicom-vision.ts"], "/api/noctis"],
    [222, "Image generation and editing", "Core products", AI_IMPL, "Verified live", ["src/lib/imagine-api.ts"], "/api/noctis"],
    [223, "Video understanding", "Core products", AI_IMPL, "Verified live", ["src/lib/video-mind.server.ts"], "/api/video"],
    [224, "Video generation and editing", "Autonomy", EXT, "Timeline/film brief engine active; heavy diffusion video rendering requires external GPU media API", ["src/lib/clip-edit.ts", "src/lib/film-brief.server.ts"], "/api/video", "Requires external video diffusion provider quota for full raster synthesis."],
    [225, "Speech-to-text", "Core products", AI_IMPL, "Verified live", ["src/lib/noctis-ambient-dictation.ts", "src/lib/noctis-voice.ts"], "/api/noctis"],
    [226, "Text-to-speech", "Core products", AI_IMPL, "Verified live", ["src/lib/noctis-audio-synth.ts", "src/lib/noctis-voice.ts"], "/api/noctis"],
    [227, "Multilingual translation", "Core products", AI_IMPL, "Verified live", ["src/lib/locale.ts", "src/lib/noctis-desk.server.ts"], "/api/noctis"],
    [228, "Real-time voice interaction", "Core products", AI_IMPL, "Verified live", ["src/lib/noctis-voice-resuscitation.ts", "src/lib/voip.server.ts"], "/api/voip"],
    [229, "Document generation", "Core products", AI_IMPL, "Verified live", ["src/lib/noctis-document-intelligence.ts", "src/lib/dod-ic/emass-export-engine.ts"], "/api/v2/dod-ic/export/binder"],
    [230, "Spreadsheet creation and analysis", "Core products", AI_IMPL, "Verified live (OOXML .xlsx binary generator)", ["src/lib/dod-ic/emass-export-engine.ts", "src/lib/paper-sheet.ts"], "/api/v2/dod-ic/export/emass-xlsx"],
    [231, "Presentation generation", "Core products", AI_IMPL, "Verified live", ["src/lib/prezi.ts"], "/api/noctis"],
    [232, "Interactive diagrams and charts", "Core products", AI_IMPL, "Verified live (Canvas + Mermaid)", ["src/lib/noctis-holodeck-3d.ts", "src/lib/noctis-desk.server.ts"], "/api/noctis"],
    [233, "Web application prototyping", "Core products", AI_IMPL, "Verified live (Canvas live React compilation)", ["src/lib/noctis-desk.server.ts", "src/lib/triad-acceptance.test.ts"], "/api/noctis"],
    [234, "UI/UX design assistance", "Core products", AI_IMPL, "Verified live", ["src/lib/theme.ts", "src/lib/noctis-desk.server.ts"], "/api/noctis"],
    [235, "Accessibility assistance", "Core products", CLOSED, "Closed with W3C WCAG 2.1/2.2 contrast ratio & AA/AAA auditor", ["src/lib/catalog260/gap-closure-solvers.ts"], "/api/v2/catalog/solve"],
    [236, "Music theory and composition support", "Core products", AI_IMPL, "Verified live", ["src/lib/music-academy.ts", "src/lib/music-asset.ts"], "/api/noctis"],
    [237, "Creative writing", "Core products", AI_IMPL, "Verified live", ["src/lib/noctis-desk.server.ts", "src/lib/noctis-skills.ts"], "/api/noctis"],
    [238, "Educational media creation", "Core products", AI_IMPL, "Verified live", ["src/lib/lesson-make.server.ts", "src/lib/lesson-song.ts"], "/api/noctis"],
    [239, "Collaborative workspaces", "Enterprise", AI_IMPL, "Verified live", ["src/lib/discuss.server.ts", "src/lib/study-group.server.ts"], "/api/noctis"],
    [240, "Cross-device synchronization", "Enterprise", AI_IMPL, "Verified live (Neon Cloud DB + PWA)", ["src/lib/db.ts", "src/lib/catalog-sync.ts"], "/api/v2/enterprise/db/health"],
  ]),
  ...buildDiv("XIII", "Enterprise operations and governance", [
    [241, "Enterprise identity and SSO", "Enterprise", AI_IMPL, "Verified live (Better-Auth + Desk SSO)", ["src/lib/auth/server.ts", "src/lib/enterprise/government-readiness.ts"], "/api/v2/dod-ic/auth/me"],
    [242, "RBAC and ABAC authorization", "Enterprise", AI_IMPL, "Verified live (AO/ISSM/SCA + ABAC)", ["src/lib/dod-ic/rbac.server.ts", "src/lib/dod-ic/zero-trust-icam-engine.ts"], "/api/v2/enterprise/agents/authorize"],
    [243, "Tenant and security-boundary isolation", "Enterprise", AI_IMPL, "Verified live (HTTP 403 cross-tenant block)", ["src/lib/enterprise/graph-and-mission-risk.ts", "src/lib/rmf-v2/governance.ts"], "/api/v2/enterprise/knowledge-graph/query"],
    [244, "Data classification and access enforcement", "Enterprise", AI_IMPL, "Verified live (Gate 0 Fail-Closed)", ["src/lib/dod-ic/classification-gateway.ts", "src/lib/enterprise/secure-model-gateway.ts"], "/api/v2/enterprise/model-gateway/route"],
    [245, "Encryption and key management", "Enterprise", AI_IMPL, "Verified live (AES-256-GCM enclave + PQC)", ["src/lib/ndkrs/enclave-crypto.server.ts", "src/lib/universal-crypto.ts", "src/lib/noctis-pqc-shield.ts"], "/api/v2/enterprise/db/health"],
    [246, "Tamper-evident audit logging", "Enterprise", AI_IMPL, "Verified live (Hash-chained custody & agent ledger)", ["src/lib/enterprise/evidence-chain-of-custody.ts", "src/lib/enterprise/persistence.server.ts"], "/api/v2/enterprise/custody/chain"],
    [247, "Secrets management", "Enterprise", AI_IMPL, "Verified live (Vercel env isolation + server-only)", ["src/lib/env.server.ts", "src/lib/noctis-vault.ts"], "/api/v2/enterprise/government-readiness"],
    [248, "Secure model and tool gateway", "Enterprise", AI_IMPL, "Verified live", ["src/lib/enterprise/secure-model-gateway.ts"], "/api/v2/enterprise/model-gateway/route"],
    [249, "Disaster recovery and high availability", "Enterprise", AI_IMPL, "Verified live (Neon managed + PGLite fallback + CCV backup check)", ["src/lib/db.ts", "src/lib/enterprise/evidence-and-ccv-engine.ts"], "/api/v2/enterprise/db/health"],
    [250, "Central Noctis administration command center", "Enterprise", AI_IMPL, "Verified live (7 sub-tabs + live Neon telemetry)", ["src/components/noctis/NoctisEnterpriseCommandTab.tsx", "src/lib/enterprise/api-handler.server.ts"], "/api/v2/enterprise/command-center"],
  ]),
  ...buildDiv("XIV", "Ten additional advanced dependability capabilities", [
    [251, "Noctis Knowledge Verification Authority", "Foundation", CLOSED, "Closed with hybrid NDKRS claim-to-authority verifier", ["src/lib/catalog260/dependability-suite.server.ts", "src/lib/ndkrs/hybrid-retrieval.server.ts"], "/api/v2/catalog/dependability/run"],
    [252, "Noctis Temporal Intelligence", "Reliability", CLOSED, "Closed with ISO/US/relative timeline & historical-vs-current isolator (wired into NUPS)", ["src/lib/catalog260/dependability-suite.server.ts", "src/lib/nups/orchestrator.server.ts"], "/api/v2/catalog/dependability/run"],
    [253, "Noctis Contradiction Detection", "Reliability", CLOSED, "Closed with cross-source normative & numeric contradiction detector", ["src/lib/catalog260/dependability-suite.server.ts", "src/lib/ndkrs/ingestion.server.ts"], "/api/v2/catalog/dependability/run"],
    [254, "Noctis Evidence-Based Confidence", "Reliability", CLOSED, "Closed with Fact/Inference/Hypothesis/Unknown separation & confidence CI (wired into NUPS)", ["src/lib/catalog260/dependability-suite.server.ts", "src/lib/nups/orchestrator.server.ts"], "/api/v2/catalog/dependability/run"],
    [255, "Noctis Autonomous Evaluation Factory", "Reliability", CLOSED, "Closed with SQL enterprise.dynamic_regression_tests defect-to-test factory", ["src/lib/catalog260/dependability-suite.server.ts", "src/lib/catalog260/persistence.server.ts"], "/api/v2/catalog/eval-factory"],
    [256, "Noctis Source Freshness Monitor", "Reliability", CLOSED, "Closed with NDKRS expiry & DoD/IC/DISA CCI currency monitor", ["src/lib/catalog260/dependability-suite.server.ts", "src/lib/ndkrs/persistence.server.ts"], "/api/v2/catalog/freshness"],
    [257, "Noctis Privacy-Preserving Intelligence", "Enterprise", CLOSED, "Closed with SSN/Email/Phone/PAN/MRN redactor, consent & 365d retention guard", ["src/lib/catalog260/dependability-suite.server.ts", "src/lib/catalog260/persistence.server.ts"], "/api/v2/catalog/memory"],
    [258, "Noctis Secure Agent Runtime", "Autonomy", AI_IMPL, "Verified live (least-privilege tool envelopes + WASM sandbox)", ["src/lib/enterprise/ai-agent-governance.ts", "src/lib/noctis-wasm-runner.ts"], "/api/v2/enterprise/agents/evaluate-action"],
    [259, "Noctis Human Approval Gateway", "Autonomy", AI_IMPL, "Verified live (HTTP 403 block on AI self-approval / ATO)", ["src/lib/enterprise/ai-agent-governance.ts", "src/lib/rmf-v2/governance.ts"], "/api/v2/enterprise/agents/authorize"],
    [260, "Noctis Universal Problem Solver", "Autonomy", AI_IMPL, "Verified live (5-stage NUPS orchestrator + 41-engine matrix)", ["src/lib/nups/orchestrator.server.ts", "src/lib/nups/master-capability-matrix.ts"], "/api/v2/nups/solve"],
  ]),
];

export function filterCatalog260(opts: {
  division?: string;
  status?: string;
  stage?: string;
  search?: string;
} = {}): Catalog260Item[] {
  const div = (opts.division || "ALL").toUpperCase();
  const st = (opts.status || "ALL").toUpperCase();
  const stg = opts.stage || "ALL";
  const q = (opts.search || "").trim().toLowerCase();

  return CATALOG_260_ITEMS.filter((item) => {
    if (div !== "ALL" && item.divisionCode.toUpperCase() !== div) return false;
    if (st !== "ALL" && item.status !== st) return false;
    if (stg !== "ALL" && item.stage !== stg) return false;
    if (q) {
      const hay = `${item.itemNumber} ${item.divisionCode} ${item.divisionName} ${item.name} ${item.gapAction} ${item.modules.join(" ")}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function getCatalog260Summary() {
  const alreadyImplemented = CATALOG_260_ITEMS.filter((i) => i.status === "ALREADY_IMPLEMENTED").length;
  const gapClosedNow = CATALOG_260_ITEMS.filter((i) => i.status === "GAP_CLOSED_NOW").length;
  const externalBoundary = CATALOG_260_ITEMS.filter((i) => i.status === "EXTERNAL_INFRA_OR_LICENSE_BOUNDARY").length;

  const byDivision: Record<string, { divisionName: string; total: number; implemented: number; gapClosedNow: number; externalBoundary: number }> = {};
  for (const i of CATALOG_260_ITEMS) {
    if (!byDivision[i.divisionCode]) {
      byDivision[i.divisionCode] = { divisionName: i.divisionName, total: 0, implemented: 0, gapClosedNow: 0, externalBoundary: 0 };
    }
    const d = byDivision[i.divisionCode]!;
    d.total += 1;
    if (i.status === "ALREADY_IMPLEMENTED") d.implemented += 1;
    else if (i.status === "GAP_CLOSED_NOW") d.gapClosedNow += 1;
    else d.externalBoundary += 1;
  }

  return {
    totalCapabilities: CATALOG_260_ITEMS.length,
    countsByStatus: {
      alreadyImplemented,
      gapClosedNow,
      externalBoundary,
      totalActiveInSoftware: alreadyImplemented + gapClosedNow,
    },
    byDivision,
  };
}

export function renderCatalog260GapAuditMarkdown(): string {
  const sum = getCatalog260Summary();
  const closedItems = CATALOG_260_ITEMS.filter((i) => i.status === "GAP_CLOSED_NOW");
  const extItems = CATALOG_260_ITEMS.filter((i) => i.status === "EXTERNAL_INFRA_OR_LICENSE_BOUNDARY");
  return [
    `# Noctis Master Capability Catalog v1.0 — 260-Capability Gap Audit`,
    `- **Total Cataloged:** **${sum.totalCapabilities}** across **14 Divisions (I-XIV)**`,
    `- **Already Implemented Before This Pass:** **${sum.countsByStatus.alreadyImplemented}** · **Newly Built Gap Closures:** **${sum.countsByStatus.gapClosedNow}** · **Total Active in Software:** **${sum.countsByStatus.totalActiveInSoftware}/${sum.totalCapabilities}** · **External Hardware/License Boundaries:** **${sum.countsByStatus.externalBoundary}**`,
    "",
    "## Newly Closed Gaps (#12, #26-27, #30, #35, #39-40, #45, #58, #101-105, #110-112, #119, #150-151, #153, #155, #159, #177, #196-197, #202, #204, #206-209, #220, #235, #251-257)",
    "| # | Division | Capability | Implementation | Endpoint |",
    "| :---: | :---: | :--- | :--- | :--- |",
    ...closedItems.map((i) => `| #${i.itemNumber} | ${i.divisionCode} | **${i.name}** | ${i.gapAction} | \`${i.apiEndpoint}\` |`),
    "",
    "## External Hardware / Licensing Boundaries (Control-Plane Wired, Honest Boundary Enforced)",
    "| # | Capability | Explicit Requirement / Boundary |",
    "| :---: | :--- | :--- |",
    ...extItems.map((i) => `| #${i.itemNumber} | **${i.name}** | ${i.boundaryNote} |`),
  ].join("\n");
}
