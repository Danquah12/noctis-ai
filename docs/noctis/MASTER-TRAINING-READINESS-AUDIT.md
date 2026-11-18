# Noctis Master Training Readiness Audit and Completion Program

**Branch:** `noctis/training-foundation`  
**Status:** Baseline code audit; not a claim that model training or production readiness is complete.  
**Scope:** Universal intelligence, specialist domains, learning/data operations, evaluation, and safe deployment.

## 1. Executive finding

Noctis already contains substantial foundations for knowledge ingestion, structured training-example storage, specialist routing/registry, deterministic workflow orchestration, evidence handling, and static evaluation content. These are useful foundations, but they are not equivalent to training model weights or demonstrating reliable competence across every registered profession.

The next program must turn the existing pieces into a measurable, reproducible learning system. We will not add engines merely to increase the count. Existing engines should be strengthened first; a new engine is justified only by a documented capability gap and a measurable acceptance test.

## 2. What the current code actually does

| Area | Existing implementation | Accurate status |
|---|---|---|
| Specification ingestion | `scripts/ingest-noctis-specs.ts` extracts specification sections and calls `trainNoctisFromRawDocument` | Ingestion and lesson/pair creation |
| Raw-document training | `src/lib/noctis-train.server.ts` creates overview and section Q&A entries, then calls the existing answer-memory path | Knowledge-memory updates; not gradient-based model training |
| User-submitted pairs | `trainPair` validates basic text lengths and stores a pair through the existing memory path | Example capture; independent quality approval is a separate concern |
| Autonomous 20-area trainer | `src/lib/noctis-autonomous-trainer.ts` contains predefined scenarios, chosen/rejected responses, rubric values, and boolean verification flags | Seed-corpus and rule-generation framework; its suite checks the supplied scenario fields, not a live model's answers |
| Cognitive sandbox | `src/lib/noctis-cognitive-sandbox.ts` contains six fixed benchmark cases and two fixed preference pairs; benchmark values are calculated from those constants | Demonstration/synthetic benchmark, not measured model performance |
| 400-question evaluation | `src/lib/noctis-eval-suite.ts` contains 400 authored questions, but `evaluateSingleQuestion` synthesizes a response from the expected answer/signals and scores that synthesized text | Dataset/rubric scaffolding; not an evaluation of a live model response |
| Engine registry | `src/lib/noctis-engine-registry.ts` describes engine identities, capabilities, scopes, dependencies, lifecycle, and review requirements | Registry metadata; registration does not prove integration or validated competence |
| M3 execution foundation | Workflow, evidence, approvals, runtime admission, audit, reconciliation, and provider-neutral microVM contracts | Important control-plane foundations; cloud runtime/provider remains unconnected |

### Consequence

Current acceptance numbers from the synthetic trainer or self-referential evaluator must not be reported as measured model accuracy, calibration, or training completion. Likewise, JSONL export is a dataset artifact—not proof that an SFT/DPO job ran or changed model weights.

## 3. Target learning architecture

1. **Source and dataset registry** — source owner, license/terms, jurisdiction, publication/version date, content hash, provenance, sensitivity classification, retention, and allowed use.
2. **Ingestion and normalization** — document parsing, OCR where needed, chunking, metadata extraction, deduplication, quality checks, PII/PHI detection, prompt-injection quarantine, and reproducible source lineage.
3. **Knowledge layer** — lexical and vector retrieval, knowledge graph, temporal supersession, source authority, contradiction tracking, and citation-level evidence.
4. **Training-example lifecycle** — candidate → quarantined → reviewed → approved → dataset-versioned → exported; rejected and withdrawn records remain traceable and excluded from training.
5. **Model adapter layer** — provider-neutral interfaces for model identity, inference, embeddings, supervised fine-tuning, preference optimization, job status, artifact retrieval, and rollback. A provider must be selected before implementing a concrete training adapter.
6. **Evaluation and release gate** — held-out tests, domain-specific rubrics, adversarial suites, calibration, contamination checks, safety/security gates, human sign-off, and model-version promotion.
7. **Runtime and observability** — model registry, prompt/tool versions, dataset/model lineage, telemetry, cost/latency, drift monitoring, incident rollback, and tenant-aware access control.

Deterministic calculations, policy decisions, authorization, and safety invariants should remain in validated code wherever feasible. A language model may explain and coordinate those controls; it must not replace them.

## 4. Training lifecycle and required artifacts

Every training release must be reproducible from immutable identifiers:

- Dataset manifest and version, source manifest, license/usage decision, content hashes, and exclusions.
- Train/validation/test split manifest with deduplication and contamination checks.
- Training configuration: base model and revision, tokenizer, adapter method, hyperparameters, seed, hardware, code commit, and run ID.
- Job logs, resource/cost metrics, checkpoint/artifact hashes, and failure status.
- Evaluation report against a frozen baseline and held-out suite.
- Approval record, release decision, model card, known limitations, and rollback target.

No raw user interaction should silently become training data. User feedback must enter a controlled review workflow; sensitive data must be excluded or handled under an explicit, approved policy.

## 5. Work plan — execution order

### Phase A — Complete and stabilize the current M3 checkpoint
- Resolve the current reconciliation persistence test failure.
- Require exact-head GitHub Actions success for install, inventory, integration audit, typecheck/test suite, and development build.
- Keep PR #1 open and do not merge into `main`.
- Continue provider-neutral implementation until cloud vendor and region are selected.
- Do not claim operational microVM isolation until a real provider, guest image, attestation verification, resource enforcement, and adversarial isolation evidence exist.

### Phase B — Training inventory and data governance
- Inventory all training stores, schemas, APIs, seed corpora, approval states, export routes, and write paths.
- Verify whether each store is durable, tenant-scoped, backed up, and auditable.
- Define a canonical dataset/source schema and approval state machine.
- Add license, provenance, version, sensitivity, retention, and revocation enforcement.
- Reconcile legacy training pairs/rules into explicit review states; no silent promotion.

### Phase C — Make evaluation genuinely model-facing
- Preserve the existing 400 authored questions as candidate test content, but replace the self-answering evaluator.
- Send each prompt to a selected model/runtime adapter and capture its actual response.
- Grade against independently authored rubrics, deterministic calculations, primary-source checks, and blinded human review where needed.
- Add held-out and adversarial splits; test for memorization, leakage, prompt injection, citation fabrication, unsafe tool use, and cross-tenant leakage.
- Report per-domain sample counts and confidence intervals; calculate calibration only from actual predictions and outcomes.
- Never assign a default high score to a domain with no test observations.

### Phase D — Establish the baseline model and real training adapters
- Benchmark candidate foundation models before deciding whether to fine-tune or train from scratch.
- Select a model/provider based on quality, data controls, deployment constraints, latency, cost, and licensing.
- Implement a provider-neutral job contract first; then one concrete adapter after selection.
- Start with supervised fine-tuning on reviewed, high-quality examples; add preference optimization only after pair quality and safety review.
- Compare each candidate against the frozen baseline and reject regressions.

### Phase E — Specialist curriculum and capability validation
- Build curriculum coverage from the existing 15 knowledge divisions, professional taxonomy, and registered engines.
- Map every lesson and evaluation to a capability, evidence standard, risk tier, and engine.
- Prioritize cybersecurity, RMF/governance, engineering/science, research, and health decision support; maintain distinct safety gates for clinical, legal, and financial domains.
- Expand to other professions when there is a real user need or coverage gap.
- A specialist engine is accepted only with source-backed scope, typed inputs/outputs, required permissions, tests, evidence behavior, failure modes, and domain benchmark results.

### Phase F — Controlled learning loop and production release
- Collect feedback and expert corrections as quarantined candidates.
- Review, label, deduplicate, and version approved examples.
- Run scheduled offline training/evaluation; never change production weights directly from a live conversation.
- Canary a signed model artifact, monitor quality/safety/cost, and promote or roll back with an auditable approval.
- Complete security, privacy, reliability, operational, and domain-owner sign-off before production claims.

## 6. Initial completion gates

| Gate | Evidence required to pass |
|---|---|
| G1 — Data governance | Source/license registry, provenance, sensitivity handling, deduplication, versioning, revocation, and approval tests |
| G2 — Dataset quality | Reviewed examples, leakage-resistant splits, quality reports, and traceable exclusions |
| G3 — Real inference evaluation | Actual model responses evaluated against frozen held-out tests; no synthesized self-answering |
| G4 — Real training run | Reproducible SFT run (and DPO only if justified), signed artifact, complete lineage, and successful restore |
| G5 — Measured improvement | Statistically defensible improvement over baseline with no unacceptable safety/domain regression |
| G6 — Specialist readiness | Per-domain evidence, minimum sample thresholds, uncertainty reporting, and human approval for high-impact domains |
| G7 — Operational release | Access controls, tenant isolation, monitoring, incident response, rollback, and independent security review |

No gate is passed merely because a registry entry exists, a lesson was stored, a synthetic test suite passed, or a training file was exported.

## 7. Engine expansion policy

Before adding an engine, document:
- The capability gap not already covered by an existing engine.
- Target users and supported tasks; explicit exclusions and risk tier.
- Authoritative data sources and licensing.
- Typed contract, permissions, evidence requirements, and dependencies.
- At least one deterministic or expert-reviewed acceptance benchmark.
- Integration owner, lifecycle status, monitoring, and maintenance plan.

If an existing engine can cover the gap safely, improve it instead of creating a duplicate. Registry lifecycle must reflect reality: registered, implemented, integrated, validated, operational, or deprecated.

## 8. Immediate next deliverables

1. Stabilize M3 reconciliation CI.
2. Produce a training-store and approval-flow inventory, including all persistent write paths.
3. Define canonical source, dataset, example, training-run, evaluation-run, and model-artifact contracts.
4. Replace self-referential evaluation with live model evaluation through a model adapter.
5. Establish a frozen baseline benchmark and report actual domain coverage.
6. Implement the first provider-neutral training job contract; defer provider-specific fine-tuning until model/provider selection.

**Definition of done:** Noctis is considered trained for a domain only when a versioned model has completed a reproducible training or adaptation process (if needed), passed independent held-out evaluation for that domain, met safety and evidence thresholds, and has an approved release record. The platform may use a strong foundation model without fine-tuning where evidence shows that retrieval, tools, and deterministic controls achieve the required performance; this decision must be measured, not assumed.


## 9. Additional findings from the training-store path

The current training store has a useful quarantine/review concept, but its write semantics need hardening before it can be the authoritative dataset pipeline:

- `rememberAnswer` immediately adds a candidate to process memory with `approvalStatus: "quarantined"`, then starts database writes in a detached async task. Database failures are swallowed, so callers cannot know whether the persistent write and audit event succeeded.
- `trainNoctisFromRawDocument` increments and returns `trainedPairsCount` after calling that in-memory path. That count currently means candidate lesson entries generated/submitted, not durable database commits and not model-weight updates.
- `hydrateFromDb` loads approved rows and seeds the legacy corpus as approved when the database count is below the seed-corpus size. Seed provenance and review policy should be made explicit in the canonical dataset registry.
- `reviewTrainingSubmission` writes reviewer identity, decision, reason, and an audit row. The route/service boundary must still prove that the reviewer identity is authenticated and authorized; a caller-supplied reviewer ID is not itself authorization.
- `recallTrainedAnswer` and `lessonBlock` retrieve approved examples using lexical similarity. This is retrieval from a memory store, not learned model parameters or semantic vector search.

### Required correction

Replace fire-and-forget writes with awaited transactional repository operations. A submission API must return distinct outcomes for candidate-created, durable, quarantined, approved, rejected, or failed. If persistence or audit fails, the caller must receive a failure and the system must not report a durable training submission. Keep candidate capture separate from activation and model-training jobs.


## 10. Training data governance implementation — first milestone

Implemented on the training branch:

- `migrations/0016_noctis_training_data_pipeline.sql` adds tenant-scoped dataset roots, immutable dataset versions, immutable dataset membership, training-run lineage, and artifact metadata.
- `src/lib/noctis-training-data-persistence.server.ts` adds transaction-backed candidate submission, source-verified human review, deterministic dataset splitting, immutable snapshot creation, and one-time dataset-version approval.
- `src/lib/noctis-training-data-persistence.server.test.ts` exercises durable candidate creation/replay, source mismatch rejection, review/audit atomicity, snapshot creation, snapshot immutability, and source revocation before dataset approval.
- CI scripts now include this suite in typecheck, stress, and full test runs.

### Important behavior

1. Candidate examples are persisted as quarantined and audited in the same transaction.
2. A source-backed example can only be approved if its source is approved and the stored source hash and license match exactly.
3. Dataset snapshots include only approved examples with currently approved, licensed sources. Membership records capture a digest and deterministic train/validation/test split.
4. Snapshot content and membership cannot be rewritten. A one-time approval/rejection decision is permitted without changing the snapshot digest.
5. Revoking or deprecating a source before dataset approval blocks release of that snapshot.
6. Tenant and actor values are injected into the repository as trusted context. The application route must derive them from authenticated server-side identity; this repository is not an authentication provider.
7. The training-run and artifact tables are lineage contracts only. No model provider, fine-tuning job, checkpoint upload, or model-weight update is implemented by this milestone.

### Remaining work in this track

- Connect source ingestion and review routes to the new durable repository instead of detached, best-effort writes.
- Add authenticated authorization checks for reviewer and dataset approver roles.
- Add dataset revocation/supersession policy for sources withdrawn after a dataset has already been approved.
- Add reproducible training-run lifecycle methods and provider-neutral model-job adapter contracts.
- Replace synthetic evaluation with real model responses before accepting any training run as an improvement.
