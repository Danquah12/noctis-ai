# Noctis End-to-End Implementation Plan

**Programme:** Noctis governed learning and model-quality programme  
**Repository:** `Danquah12/noctis-ai`  
**Delivery branch:** `noctis/training-foundation`  
**Status:** Implementation plan; phases are not represented as completed until their exit evidence exists.

## 1. Programme objective

Turn Noctis from a collection of specialist engines, retrieval paths, user-taught examples, deterministic rules, and model-provider fallbacks into a measurable, auditable learning platform. The programme must improve answer quality without corrupting existing knowledge, exposing private data, or weakening domain-specific safeguards.

The programme covers:
- Learning governance and source provenance
- Safe ingestion and domain-aware knowledge management
- Retrieval and evidence-grounded answer generation
- Provider/model routing and response provenance
- Independent live-model evaluation
- Domain-specific quality and safety gates
- Optional fine-tuning based on measured need
- Production operations, monitoring, rollback, and governance

It does **not** assume that adding Q&A pairs changes model weights. Knowledge-base updates, retrieval improvements, prompt/rule changes, and fine-tuning are tracked as distinct interventions.

## 2. Operating principles

1. Preserve `main`; all work happens on reviewed feature branches.
2. Read-only baseline before any data migration, ingestion, dependency installation, or production change.
3. Additive, reversible database migrations; no startup-time deletion of training records.
4. No source becomes approved solely because a model, parser, user, or automated test supplied it.
5. Separate source material, extracted claims, approved knowledge, feedback, evaluation data, and fine-tuning datasets.
6. Separate domain and jurisdiction boundaries; apply least privilege to sensitive domains.
7. Keep private conversations, secrets, credentials, and evaluation answer keys out of training exports.
8. Every material change must have tests, provenance, an owner, and rollback instructions.
9. Do not claim live-model accuracy from deterministic rubric checks.
10. Human review remains mandatory for high-impact clinical, legal, defense, and security decisions.

## 3. Workstreams and deliverables

### Workstream A — Repository baseline and safety review

**Tasks**
- Record default branch SHA, dependency lockfile, runtime versions, migration inventory, environment-variable names (never values), and current scripts.
- Map all training writes, reads, exports, ingestion entry points, and model invocation paths.
- Inspect full database hydration logic and identify any deletion or overwrite behavior.
- Trace authentication, authorization, rate limiting, CSRF protections, and ownership checks for every training mutation route.
- Review custom model endpoint validation for SSRF, redirect, DNS rebinding, private-network and metadata-service access.
- Verify whether provider/API keys are logged, persisted, returned, or exposed across users.
- Establish a backup and restore test for training data before any schema changes.

**Deliverables**
- Architecture/data-flow diagram
- Threat model and prioritized findings
- Baseline inventory and reproducible command log
- Migration/rollback plan

**Exit gate**
- Every write path is identified; destructive paths are either proven safe or disabled/fixed.
- Authentication and authorization behavior is evidenced, not assumed.
- Baseline can be reproduced without production writes.

### Workstream B — Learning Governance Engine

**Tasks**
- Add additive schema for source documents, source versions, extracted claims, knowledge items, approvals, dataset versions, training runs, evaluation runs, and audit events.
- Define lifecycle states: discovered, quarantined, parsed, review-required, approved, rejected, deprecated.
- Keep retrieval approval separate from fine-tuning eligibility.
- Record actor, timestamp, rationale, source hash, content version, license, domain, jurisdiction, and classification.
- Add reviewer roles and domain-specific approval policy.
- Implement immutable audit events and explicit rollback.
- Add retention, deletion, and privacy rules for personal data.

**Deliverables**
- Versioned migrations
- Typed data models and repository layer
- Governance service/API
- Reviewer workflow
- Audit and rollback utilities

**Exit gate**
- State transitions are enforced server-side.
- Unauthorized users cannot approve or publish knowledge.
- Re-ingesting the same source is idempotent.
- Rejected/quarantined items never appear in production retrieval.
- Migration and rollback tests pass.

### Workstream C — Safe ingestion and document processing

**Tasks**
- Require explicit domain, source identity, license, and classification at ingestion.
- Remove silent domain defaults; reject unknown or missing domain metadata.
- Parse files into source-linked chunks with exact page/section/paragraph locators.
- Store checksums and parser versions.
- Extract claims separately from raw source text.
- Detect duplicates, stale versions, superseded documents, and possible conflicts.
- Quarantine low-confidence extraction and malformed/untrusted input.
- Defend against prompt injection in documents: treat document instructions as data, never as system instructions.
- Add size, type, decompression, malware-scanning, and resource limits.

**Deliverables**
- Ingestion API/worker
- Parser adapters
- Deduplication and versioning
- Claim extraction and quarantine queue
- Ingestion test corpus

**Exit gate**
- Every extracted claim links to an exact source locator.
- Malicious document instructions cannot override system policy.
- Duplicate ingestion creates no duplicate active knowledge.
- No content is published without the required approval.

### Workstream D — Retrieval and evidence-grounded answering

**Tasks**
- Build hybrid lexical/vector retrieval with domain, jurisdiction, classification, and approval filters.
- Rank by relevance, authority, freshness, jurisdiction, and source quality.
- Resolve superseded sources and expose conflicting claims.
- Return citations with exact locators.
- Add an evidence sufficiency check and calibrated abstention.
- Keep retrieval trace: source IDs, source versions, scores, filters, and index version.
- Prevent user-taught and generated answers from bypassing approved evidence rules.
- Add feature flags and domain-by-domain rollout.

**Deliverables**
- Retrieval service
- Domain taxonomy and policy filters
- Evidence pack / citation renderer
- Conflict and freshness handling
- Retrieval diagnostics

**Exit gate**
- Tests prove domain isolation and rejection of quarantined sources.
- Citations resolve to the exact source version and locator.
- Conflicting evidence is surfaced, not silently suppressed.
- Unanswerable questions trigger appropriate abstention.

### Workstream E — Model/provider gateway and answer provenance

**Tasks**
- Centralize provider selection, credential resolution, request policy, timeouts, retries, and fallback.
- Restrict custom endpoints and block unsafe network destinations.
- Record actual provider/model used, including fallback, model version where available, prompt version, specialist engines, and token/latency/error metadata.
- Never log credentials or sensitive prompt content unnecessarily.
- Make provider failure explicit; do not misattribute fallback answers to the requested model.
- Add per-user and per-provider budgets, concurrency controls, and abuse protection.
- Normalize provider errors and response schemas.

**Deliverables**
- Provider gateway
- Safe endpoint validation
- Secret-handling policy
- Response provenance trace
- Operational metrics and alert definitions

**Exit gate**
- Integration tests verify provider identity and fallback trace.
- SSRF and credential-handling tests pass.
- No secrets appear in logs, traces, or client responses.

### Workstream F — Independent evaluation and quality gates

**Tasks**
- Retain existing deterministic suite as a rubric/logic consistency suite, with accurate labeling.
- Build a held-out benchmark across the existing 15 divisions and all active specialist engines.
- Author independent prompts, expected claims, citations, acceptable alternatives, and abstention expectations.
- Include adversarial, ambiguous, unanswerable, conflicting-source, stale-source, privacy, prompt-injection, and out-of-domain cases.
- Execute through the actual production answer path and record the actual provider/model.
- Use blinded human review for high-impact domains.
- Keep benchmark data and answer keys isolated from training exports.
- Establish regression thresholds and release gates.

**Metrics**
- Factual correctness
- Evidence support and citation precision
- Completeness
- Calibration and appropriate abstention
- Domain-boundary compliance
- Privacy leakage
- Unsafe/prohibited output rate
- Robustness to prompt injection
- Latency, cost, availability, and regression rate

**Deliverables**
- Held-out benchmark dataset and governance
- Live evaluation runner
- Scoring and human-review workflow
- Baseline report and release gates

**Exit gate**
- Baseline and post-change runs are reproducible.
- The live evaluation calls the deployed answer path, not a synthesized expected answer.
- High-impact domain release gates are approved by designated reviewers.

### Workstream G — Specialist domain readiness

Each domain gets its own evidence policy, test set, reviewer role, and release gate.

| Domain | Initial focus | Mandatory guardrail |
|---|---|---|
| Cybersecurity | SAST validation, vulnerability analysis, defensive/offensive testing | Explicit authorization, safe execution sandbox, scope and rate limits |
| Risk & compliance | NIST RMF, control mapping, evidence, POA&M, continuous monitoring | Citation to authoritative control versions; human sign-off |
| Healthcare | Records, labs, pathology, imaging, clinician decision support | Clinical validation, patient privacy, clinician review; no autonomous diagnosis/treatment |
| Science | Literature review, methods, calculations, reproducibility | Primary-source evidence, uncertainty and reproducibility |
| Engineering | Requirements, calculations, design review, simulation | Units, assumptions, safety factors, independent calculation checks |
| Legal | Issue analysis, statutes, regulations, case law, contracts | Jurisdiction/date, primary authority, attorney review |
| Defense | Defensive intelligence, protection, resilience, analyst workflows | Classification controls, authorized data, analyst decision authority |
| Finance | Analysis, budgets, forecasting, risk | Data provenance, assumptions, no unsupported personalized advice |
| Education | Study, tutoring, assessment | Age-appropriate controls, source quality, assessment integrity |
| General | Everyday knowledge and assistance | Evidence freshness and uncertainty labeling |

### Workstream H — Fine-tuning and model adaptation (conditional)

Fine-tuning is not the first step. It proceeds only when live evaluations identify a repeatable gap that retrieval, prompt engineering, rules, or specialist tools cannot adequately address.

**Tasks**
- Define target behavior and measurable hypothesis.
- Create licensed, privacy-screened, approved dataset with deduplication.
- Split train/validation/test before training; keep test data inaccessible to training.
- Remove secrets, personal data, benchmark leakage, and unlicensed content.
- Version dataset, tokenizer/format, provider, base model, hyperparameters, and job.
- Run a small pilot; compare against the unchanged baseline.
- Check regressions across all domains, not just the target domain.
- Promote only when held-out metrics improve and safety does not regress.

**Exit gate**
- Reproducible training run and artifacts exist.
- Independent held-out evaluation demonstrates measurable improvement.
- Rollback to the previous model/configuration is tested.

### Workstream I — Production operations and governance

**Tasks**
- Add dashboards for ingestion, approvals, retrieval quality, model provenance, evaluations, cost, latency, failures, and safety events.
- Add alerts for unusual training writes, approval spikes, ingestion failures, retrieval drift, and provider changes.
- Define data retention, deletion, access review, incident response, and disaster recovery.
- Establish release checklist, change management, and periodic source freshness review.
- Add domain-owner sign-off and periodic model/system review.
- Document user-facing limitations and escalation paths.

**Deliverables**
- Operations dashboard and runbooks
- Incident and rollback playbooks
- Governance/RACI matrix
- Release checklist and review calendar

**Exit gate**
- Operational owner and escalation path exist.
- Backup/restore and rollback have been exercised.
- Audit logs are queryable and protected.

## 4. Proposed delivery sequence

| Phase | Scope | Relative estimate | Output |
|---|---|---:|---|
| 0 | Baseline, security and data-flow audit | 1 sprint | Verified baseline and risk register |
| 1 | Learning governance schema and APIs | 1–2 sprints | Quarantine, approvals, audit, versioning |
| 2 | Safe ingestion and claim extraction | 1–2 sprints | Idempotent, provenance-preserving ingestion |
| 3 | Retrieval and answer provenance | 1–2 sprints | Evidence-grounded responses |
| 4 | Live-model evaluation | 1–2 sprints | Held-out benchmark and baseline metrics |
| 5 | Pilot one low-risk domain | 1 sprint | Measured controlled rollout |
| 6 | Expand specialist domains | Iterative | Domain-by-domain validated capability |
| 7 | Fine-tuning, only if justified | Conditional | Evaluated model adaptation |
| 8 | Production hardening and governance | Continuous | Operable, auditable learning system |

Estimates are planning ranges, not commitments. They depend on repository condition, test coverage, database/provider access, reviewer availability, and deployment environment.

## 5. Acceptance test plan

The first implementation should include at least these tests:

1. Unauthenticated user cannot create, approve, reject, export, or publish training data.
2. User from one tenant cannot read or mutate another tenant's sources or knowledge.
3. A user-taught answer enters quarantine and is not automatically marked verified.
4. A model-generated answer cannot self-approve.
5. A duplicate source ingestion is idempotent.
6. A changed source version creates a new version and preserves the old version.
7. A rejected source cannot be retrieved.
8. A quarantined claim cannot be retrieved in production mode.
9. A knowledge item requires the designated domain reviewer to be published.
10. Every approved claim has a valid source and exact locator.
11. An unknown domain is rejected.
12. A source with an incompatible license cannot enter fine-tuning export.
13. A document prompt injection cannot change system policy or invoke tools.
14. A private/link-local/metadata endpoint is blocked by the model gateway.
15. Redirects cannot bypass endpoint restrictions.
16. Provider fallback is recorded accurately.
17. Credentials are absent from logs and client responses.
18. Retrieval respects domain and jurisdiction filters.
19. Conflicting authoritative claims are surfaced.
20. Superseded knowledge is excluded or clearly marked.
21. Every answer trace records the source/index/prompt/model versions available.
22. Evaluation answer keys are excluded from training exports.
23. The live evaluation runner calls the real answer path.
24. A failing quality gate blocks promotion.
25. Rollback restores the previous approved dataset and model configuration.
26. Startup/hydration never deletes existing training records.
27. Migration failure leaves existing records intact.
28. Backup restore is verified before production migration.
29. Sensitive healthcare records are inaccessible to unauthorized roles.
30. High-impact outputs show limitations and require the appropriate human review.

## 6. Execution rules and autonomy

Proceed without asking the user to approve every routine step:
- Inspect and document repository state.
- Create isolated feature branches.
- Make additive, reversible changes.
- Add tests and documentation.
- Run local/static checks only when dependencies and environment are available.
- Open draft pull requests with exact test status and remaining risks.
- Continue to the next safe task after each completed step.

Stop and request explicit authorization only when a step would:
- access, export, or process real patient, customer, employee, classified, or other sensitive data;
- connect to or modify a production database or external model account;
- incur material costs or start a paid fine-tuning job;
- install or upgrade dependencies in the user's environment;
- deploy, merge, publish, or change production behavior;
- delete, overwrite, or irreversibly migrate data;
- expand testing beyond systems the user is authorized to assess.

When blocked, do not ask a broad question. State the exact missing access or decision, why it blocks the next action, and the single action needed. Keep a running implementation log so the user receives milestone updates rather than a prompt at every step.

## 7. Reporting format

For each milestone report:
- Completed (with branch, commit, PR, and changed files)
- Tests actually run and results
- Not run / blocked, with reason
- Security and data impact
- Next autonomous step

Never report a plan as completed work. Never report a test as passed unless it was executed. Never report model training unless a training job completed and its artifacts and evaluation are recorded.

## 8. Immediate next actions

1. Finish the read-only baseline review of training hydration/deletion, mutation authorization, ingestion and provider gateway.
2. Add the database governance migration and typed models on the feature branch.
3. Add service-level lifecycle enforcement and tests.
4. Add a dry-run-only ingestion path and provenance report.
5. Build the live-model evaluation harness.
6. Open/update draft PRs with measured results and continue in small reviewable commits.

**Current state:** only the training-foundation documentation PR has been created. No application code, database, model, or training dataset has been changed by this programme yet.
