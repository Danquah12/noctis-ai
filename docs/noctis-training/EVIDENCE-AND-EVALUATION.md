# Noctis Evidence Ingestion and Live Evaluation — Milestone 2

## Purpose

This milestone establishes the persistence contract for source-grounded learning, auditable retrieval, provider provenance, and genuine live-model evaluation. It does not activate a source, alter model weights, or run an evaluation against a paid provider.

## 1. Source lifecycle

Every source must move through:

`submitted → quarantined → reviewed → approved → active → deprecated/rejected`

Approval is a human decision. An ingestion job may parse, hash, normalize, and chunk material, but it cannot activate it.

### Required source metadata

- Stable source ID and canonical URI (where applicable).
- Title, publisher/issuing authority, domain and jurisdiction.
- Published date, version/revision, retrieval timestamp.
- SHA-256 content hash and source locator scheme.
- License / terms of use and classification.
- Submitter, reviewer, review timestamp, and reason.
- Status and lifecycle audit event.

Do not assume that public accessibility grants a right to store or fine-tune on the content. The license must permit the intended use. If it is unclear, keep the source quarantined and exclude it from training exports.

### Chunk and claim rules

- Preserve page, section, paragraph, timestamp, or API-path locators.
- Each chunk has a stable ID, ordinal, content hash and exact source locator.
- Extracted claims retain a source ID and locator; claims are not facts merely because an LLM extracted them.
- Contradictions are represented as competing claims with their own source/version/date, not silently overwritten.
- A changed source version creates a new version/hash. It must not mutate historical evidence.
- Retrieval is allowed only from approved sources and approved claims. A database query must enforce that status; UI filtering alone is not a security boundary.
- Prompt-injection text inside documents is untrusted data, never instructions to the model or ingestion agent.

## 2. Evidence-aware response behavior

For each response, the runtime should retain:
- Request ID and user ID (subject to privacy and retention policy).
- Provider/model/model version actually used.
- Whether a fallback provider was used.
- Prompt and response hashes (not raw secrets or credentials).
- IDs of retrieved source chunks and their ranks/scores.
- Latency, token counts when available, timeout/error/abstention status.

The response should distinguish:
1. Source-supported statements with locators.
2. Model explanation or inference.
3. Missing evidence / uncertainty.
4. Conflicting sources and their dates/versions.

Never claim that a source was opened, searched, verified, or cited unless the system has a corresponding retrieval/evidence record. Do not fabricate URLs or page numbers.

## 3. Live-model evaluation protocol

The existing deterministic evaluation suite is useful for checking rubric consistency, but it is not proof of model performance if the tested response is synthesized from the expected answer. The live harness must call the configured model with the held-out prompt and score the returned answer independently.

### Dataset design

- Versioned, held-out prompts and answer keys.
- No answer-key text in the model prompt.
- Cases distributed across all 15 Noctis knowledge divisions.
- Include normal, ambiguous, adversarial, false-premise, missing-input, numerical, citation, and safety-gate cases.
- Keep a private test set separate from training examples to prevent leakage.
- Include expected decision, required evidence, forbidden claims, acceptable answer variants, and scoring rubric.
- Clinical, legal, financial, defense, and cyber cases must use domain-specific safety and authorization checks.

### Required metrics

- Factual correctness and evidence support.
- Citation precision and citation recall.
- Unsupported-claim rate.
- Correct abstention rate and unsafe-completion rate.
- Calculation accuracy where applicable.
- Domain-level pass rate, not only aggregate score.
- Provider error, fallback rate, latency and token usage.
- Calibration metrics only where the benchmark has suitable probabilistic labels.

A high aggregate score cannot compensate for a failed critical safety gate. Report both overall and per-domain results. Preserve raw model output hashes and evaluator versions for reproducibility.

### Evaluation acceptance gates

- Run ID, dataset version, evaluator version and provider/model recorded.
- Every prompt actually sent to the model and every response actually received.
- No expected-answer injection into the evaluated model context.
- Scoring is performed after generation by an independent evaluator.
- Repeated runs report variance where generation is nondeterministic.
- A release is blocked by any critical unsafe-completion or false-evidence regression.
- Baseline and candidate use the same held-out dataset and equivalent provider settings.

## 4. Database additions in migration 0015

- `noctis_source_chunk`: source-linked immutable text chunks and locators.
- `noctis_retrieval_trace`: request-level ranked retrieval evidence.
- `noctis_model_response_trace`: actual provider/model, fallback, hashes, latency and token telemetry.
- `noctis_evaluation_run`: versioned run metadata and aggregate metrics.
- `noctis_evaluation_case_result`: per-case live result, expected/actual decision, evidence and failure reason.

These tables are persistence contracts only. The application service layer must still enforce source approval, reviewer authorization, retention, privacy, and access scoping.

## 5. Implementation order

1. Implement source registration and content hashing with all new sources quarantined.
2. Add safe parser/chunker adapters with MIME/size limits, malware scanning, decompression limits, and parser timeouts.
3. Add claim extraction that stores source locators and extraction version.
4. Add owner/MFA review actions for sources and claims.
5. Add retrieval query that joins only approved sources/claims and returns locators.
6. Instrument the provider gateway to report the provider/model actually used and fallback behavior.
7. Build live evaluation runner with held-out cases, independent scoring, and run persistence.
8. Establish baseline before any model fine-tuning.
9. Fine-tune only on approved, licensed, deduplicated examples when evaluation demonstrates a measurable benefit.

## 6. Privacy and security

- Do not persist API keys, authorization headers, raw session tokens, or secrets in telemetry.
- Hash prompts/responses by default; raw content retention requires a documented purpose, access policy and retention window.
- Scope private source content by tenant/user and classification.
- Enforce server-side authorization for source review and evaluation administration.
- Validate source URLs against SSRF (private/link-local/metadata IP ranges, DNS rebinding, redirects, schemes and ports) before any future fetcher is enabled.
- Never fetch arbitrary URLs as a side effect of source registration.
- Enforce request size, file type, decompression, parsing, token and time budgets.
- Keep audit events append-only and protect reviewer identity fields.

## 7. Current status

- Migration 0015 is committed to the feature branch.
- No source content has been ingested.
- No source has been approved or activated.
- No provider telemetry has yet been wired into the live response path.
- No live-model evaluation or fine-tuning job has run.
- Migration 0015 has not been applied to any database.
