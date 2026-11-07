# Noctis Engine Evolution and Expansion Roadmap

**Status:** Proposed engineering program  
**Baseline:** `docs/noctis/MASTER-ENGINE-INVENTORY.md`  
**Branch:** `noctis/training-foundation`

## 1. Program mission

Upgrade and expand the existing Noctis engine ecosystem without discarding prior work. The program prioritizes capability depth, safe integration, measurable quality, and cross-engine collaboration over raw engine count.

## 2. Program principles

1. Preserve existing capabilities and public contracts.
2. Inspect before refactoring; measure before claiming improvement.
3. Separate shared platform services from specialist domain logic.
4. Treat source presence, test presence, integration, validation and production operation as distinct states.
5. Use deterministic code for calculations and policy checks when feasible.
6. Ground factual outputs in approved evidence and preserve provenance.
7. Require authorization and bounded permissions for every tool action.
8. Keep human review for high-impact decisions.
9. Version engines, knowledge sources, evaluation datasets and model configurations.
10. Release only after regression, security and operational gates pass.

## 3. Target capability architecture

### Layer A — Universal Intelligence Core

- Intent and domain classification.
- Task decomposition and planning.
- Model/provider selection and fallback.
- Context assembly and token budgeting.
- Structured output validation.
- Uncertainty and missing-input handling.
- Response integrity checks.
- User/task/tenant context boundaries.

### Layer B — Knowledge and Evidence Core

- Document and source ingestion.
- Source normalization and metadata extraction.
- Content hashing and deduplication.
- Quarantine and review.
- Lexical, semantic and hybrid retrieval.
- Knowledge graph and entity resolution.
- Claim extraction.
- Claim-to-evidence linking.
- Citation support/entailment checks.
- Contradiction and supersession detection.
- Source freshness and version awareness.
- Retrieval and response traceability.

### Layer C — Learning and Evaluation Core

- Governed dataset registry.
- License and usage-rights metadata.
- Human review and approval.
- Dataset versioning and lineage.
- Training job orchestration.
- Fine-tuning eligibility and export.
- Model registry and artifact provenance.
- Live-model evaluation.
- Deterministic test evaluation.
- Human adjudication.
- Regression and release gates.

### Layer D — Agent and Workflow Core

- Agent registry and manifests.
- Capability discovery.
- Task graph and dependency planning.
- Typed inter-agent messages.
- Shared evidence references.
- Tool permission grants.
- Approval gates.
- Sandboxed execution.
- Retries, timeouts and circuit breakers.
- Idempotency and compensation.
- Workflow audit and replay.

### Layer E — Specialist Professional Engines

Existing domains to strengthen first:
- Cybersecurity and digital defense.
- Risk, RMF, GRC and compliance.
- Health and clinical decision support.
- Science and research.
- Engineering and infrastructure.
- Defense and strategic defensive intelligence.
- Legal and regulatory intelligence.
- Business, finance and investment.
- Bible, humanities and education.
- Professional occupations, skilled trades and career intelligence.

### Layer F — Enterprise and Governance Core

- Identity, authentication and MFA.
- RBAC and ABAC.
- Tenant isolation.
- Data classification and policy enforcement.
- Encryption and key management.
- Secrets management.
- Audit trails.
- Retention and deletion.
- Privacy and consent.
- Model risk management.
- Observability, reliability and cost controls.

## 4. Shared intelligence services to build or complete

| Service | Required behavior | Dependencies |
|---|---|---|
| Evidence service | Return source-backed passages with provenance | Source intake, approvals, retrieval |
| Claim verification | Verify whether a cited passage supports a claim | Claim extraction, evidence references |
| Contradiction service | Surface conflicting or superseded evidence | Entity resolution, versioning |
| Knowledge graph | Maintain typed entities and relationships | Ingestion, identity, provenance |
| Hybrid retrieval | Combine lexical and embedding search | Approved corpus, embedding provider |
| Evaluation service | Run reproducible tests and persist results | Dataset registry, model adapter |
| Model registry | Track model/provider/configuration versions | Provider adapter, governance |
| Engine registry | Declare engine identity, version and capabilities | Standard engine manifest |
| Orchestrator | Route tasks across engines using typed contracts | Engine registry, workflow engine |
| Agent runtime | Execute bounded tasks with approval and audit | Identity, sandbox, tool policy |
| Artifact service | Generate and validate reports and deliverables | Templates, evidence, versioning |
| Telemetry service | Capture latency, errors, cost and outcomes | All runtime services |

## 5. Specialist engine improvement template

Every engine receives an individual improvement plan:

1. Current source files and exports.
2. Current callers and route/UI entry points.
3. Domain scope and exclusions.
4. Data inputs and validation rules.
5. Authoritative knowledge sources.
6. Deterministic calculators and algorithms.
7. Model dependencies and prompts.
8. Tools and permission requirements.
9. Output schema and report formats.
10. Evidence and citation requirements.
11. Safety and escalation requirements.
12. Unit, integration and benchmark tests.
13. Performance and cost measures.
14. Known limitations.
15. Versioning and release plan.

## 6. Priority engine upgrades

### P0 — Platform stabilization and inventory

- Resolve and classify TypeScript failures.
- Establish repeatable install, typecheck, test and build gates.
- Complete engine-to-route-to-test dependency map.
- Review Noctis API route security and authorization.
- Verify migration ordering and migration safety.
- Remove no code until dependency evidence is available.

### P1 — Evidence-grounded answer generation

- Integrate approved evidence retrieval into answer generation.
- Require citations to point to retrieved source chunks.
- Add claim extraction and citation support validation.
- Preserve source version, jurisdiction, publisher and license.
- Add contradiction and supersession reporting.
- Keep retrieval scores separate from truth confidence.
- Test prompt injection and untrusted source instructions.

### P2 — Engine registry and standard contracts

- Add a typed engine manifest.
- Record capability declarations and dependencies.
- Add engine health and version metadata.
- Standardize request, response, error and evidence references.
- Add compatibility checks.
- Generate inventory and documentation from source manifests.

### P3 — Evaluation and quality engineering

- Separate deterministic rubric tests from live model evaluations.
- Version datasets and expected outcomes.
- Store model/provider, prompt, configuration and run metadata.
- Add blinded human adjudication for high-impact domains.
- Track correctness, evidence support, abstention, safety, latency and cost.
- Block release on critical regression.

### P4 — Multi-engine orchestration

- Task graph and dependency planner.
- Capability-based engine discovery.
- Typed delegation contracts.
- Evidence-reference sharing.
- Conflict detection and adjudication.
- Bounded execution and approval.
- Traceable integrated deliverables.

### P5 — Domain engine deepening

Upgrade existing specialist engines in cohorts, starting with:
1. Cybersecurity / application security.
2. RMF / GRC / risk.
3. Health / clinical.
4. Science / research.
5. Engineering / architecture / digital twins.
6. Legal / regulatory.
7. Defense / resilience.
8. Business / finance / investment.
9. Bible / humanities / education.
10. Professions / trades / career intelligence.

### P6 — New specialist divisions

Only after registry, contracts, evidence, orchestration and evaluation are stable, assess additions:
- Agriculture and food systems.
- Environmental and climate intelligence.
- Supply chain and procurement.
- Manufacturing and industrial operations.
- Geospatial and remote sensing.
- Aerospace and aviation.
- Telecommunications and data-center infrastructure.
- Transportation and maritime.
- Construction and built environment.
- Public sector and humanitarian operations.
- Economics and policy.
- Education and workforce development.
- Language and localization.
- Media and creative production.

These are candidate divisions, not commitments to create duplicate engines where an existing engine already covers the capability.

## 7. Standard maturity model

| Level | State | Evidence required |
|---|---|---|
| M0 | Proposed | Approved problem statement and scope |
| M1 | Registered | Manifest, owner, version and capabilities |
| M2 | Implemented | Source implementation and unit tests |
| M3 | Integrated | Runtime caller, permissions and data contracts |
| M4 | Validated | Domain benchmark, regression and security tests pass |
| M5 | Operational | Deployment, monitoring, support and recovery demonstrated |
| M6 | Improving | Versioned feedback loop and controlled releases demonstrated |

No engine may skip levels based on a UI, a document, a demo or a self-reported score.

## 8. Initial 12-month planning horizon

| Period | Focus | Exit criteria |
|---|---|---|
| Month 1 | Inventory and stabilization | Verified registry, CI failure baseline, security review |
| Months 2–3 | Evidence and evaluation | Evidence-connected responses and reproducible evaluation |
| Months 3–4 | Contracts and registry | Typed manifests and compatibility tests |
| Months 4–6 | Orchestration | Cross-engine workflow scenarios pass |
| Months 5–8 | Specialist upgrades | Priority engines meet domain acceptance criteria |
| Months 7–10 | New divisions | New engines use standard contracts and tests |
| Months 10–12 | Operational maturity | Monitoring, reliability, cost, security and release gates |

## 9. Release gates

A release is blocked if any of the following is true:
- Typecheck or required tests fail.
- Critical security findings remain unresolved.
- Authorization boundaries are not tested.
- Evidence-dependent claims cannot be traced.
- High-impact domain safety requirements fail.
- Migrations are unreviewed or destructive.
- Cross-tenant data isolation is unverified.
- Rollback and recovery are undefined.
- Evaluation results are synthetic but presented as live model performance.

## 10. Program deliverables

- Master engine inventory.
- Engine manifests and registry.
- Engine dependency graph.
- Per-engine improvement specifications.
- Shared service architecture.
- API and data contracts.
- Evaluation dataset registry.
- Cross-engine workflow suite.
- Security threat model.
- Release readiness dashboard.
- Versioned implementation log.
