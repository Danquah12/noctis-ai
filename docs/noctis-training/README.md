# Noctis Training Foundation

Status: proposed implementation baseline; not evidence that model weights have been trained.

## Purpose

Establish a governed learning pipeline for Noctis before adding new training material or changing production behavior. Noctis must distinguish source material, extracted claims, approved knowledge, user feedback, generated answers, evaluation examples, and model-training examples. These are different record types and must never be treated as interchangeable.

## Non-negotiable rules

1. Never mark a record verified merely because a user supplied it, a model generated it, an ingestion job parsed it, or a test passed.
2. Preserve source identity, source version, retrieval date, exact location (URL, page, section, or record ID), and content hash.
3. Keep generated answers in a quarantine/review state until independently checked.
4. Keep domains isolated by default. Cross-domain retrieval requires an explicit, logged reason.
5. Every approval, rejection, correction, export, and rollback must be attributable to an actor and timestamp.
6. Never use clinical, legal, defense, or security-sensitive content as approved training data without the relevant domain review and applicable authorization.
7. Do not fine-tune on evaluation questions, answer keys, private user conversations, secrets, or unlicensed material.
8. Make ingestion idempotent and non-destructive. Startup/hydration must never delete training records.
9. Preserve a complete audit trail and support rollback to a prior approved dataset version.
10. Label simulated, synthetic, inferred, stale, and externally sourced content accurately.

## Learning lifecycle

```text
SOURCE_DISCOVERED
  -> QUARANTINED
  -> PARSED
  -> CLAIMS_EXTRACTED
  -> DOMAIN_VALIDATION
  -> APPROVED | REJECTED | NEEDS_REVIEW
  -> VERSIONED_KNOWLEDGE
  -> RETRIEVAL_INDEX
  -> EVALUATION
  -> OPTIONAL_FINE_TUNING_EXPORT
```

A source can be approved for retrieval without being approved for model fine-tuning. Fine-tuning eligibility is a separate decision.

## Required records

### Source document
- id, canonical_uri, title, publisher/author, domain, jurisdiction
- published_at, retrieved_at, effective_from, effective_to
- version_label, content_hash, license, access_classification
- ingestion_status, parser_version, created_by, created_at

### Extracted claim
- id, source_document_id, exact_quote_or_extraction
- source_locator (page/section/paragraph/URL fragment)
- normalized_claim, domain, jurisdiction
- extraction_model, extraction_version, confidence
- validation_status, reviewer_id, reviewed_at, rationale

### Knowledge item
- id, claim_id, canonical_statement, domain, jurisdiction
- validity_start, validity_end, supersedes_id
- approval_status, approved_by, approved_at
- evidence_grade, limitations, tags, content_hash

### Training/evaluation run
- id, run_type, dataset_version, code_revision
- model_provider, model_name, model_version, prompt_version
- configuration_hash, started_at, completed_at
- metrics, artifacts, operator, status

### Audit event
- id, actor, action, target_type, target_id
- before_hash, after_hash, reason, timestamp, request_id

## Domain policy

Use a controlled domain taxonomy, not free-form inferred labels alone. Initial top-level domains:
- cybersecurity
- risk_and_compliance
- healthcare
- science
- engineering
- legal
- defense
- finance
- education
- general

Each domain must define allowed source classes, review roles, jurisdiction requirements, freshness rules, prohibited data, and evaluation criteria. A source tagged as engineering must not be silently ingested as engineering merely because the ingestion script has a hard-coded default.

## Retrieval requirements

- Hybrid lexical + embedding retrieval, with metadata filters applied before ranking.
- Mandatory domain filter unless cross-domain retrieval is explicitly justified.
- Rank by relevance, authority, freshness, jurisdiction, and approval status.
- Return source citations and exact locators with every evidence-backed answer.
- Do not treat absence from the index as evidence that a fact is false.
- Do not answer from quarantined or rejected material.
- Detect conflicting and superseded claims; surface conflicts instead of silently choosing one.
- Record retrieved source IDs and index version in the answer trace.

## Answer provenance

Every model response should record, internally:
- provider and model actually used (including fallback)
- model/version where available
- prompt and policy version
- specialist engine(s) invoked
- source IDs and locators retrieved
- whether the answer includes generated, inferred, simulated, or unverified content
- validation outcome and limitations

Provider fallback must be visible in the trace and must not silently imply that the originally selected model answered.

## Evaluation design

Keep existing deterministic acceptance checks, but label them as rubric/logic tests. They are not a measure of live model accuracy.

Add a separate held-out benchmark:
- independently authored questions and answer keys
- source-backed expected claims and acceptable alternatives
- adversarial, ambiguous, unanswerable, stale-source, conflicting-source, and out-of-domain cases
- blinded human review for high-impact domains
- actual calls through the same production answer path used by users
- record provider/model, latency, token use, citations, abstentions, and errors
- prevent benchmark items and answer keys from entering training exports

Measure at minimum:
- factual correctness
- evidence support and citation precision
- completeness
- calibration/appropriate abstention
- domain-boundary compliance
- harmful or prohibited output rate
- privacy leakage
- regression rate

A passing internal rubric suite must never be described as proof of factual accuracy.

## Immediate remediation gates

Before any production learning writes:
1. Review and remove destructive deletes from database hydration/startup.
2. Confirm authentication, authorization, CSRF protections where applicable, and rate limits on every training mutation route.
3. Validate and restrict custom model endpoints to prevent SSRF (schemes, DNS resolution, private/link-local/loopback/metadata IPs, redirects, and timeouts).
4. Stop marking user-taught and generated answers as verified by default.
5. Preserve rule domain metadata and enforce domain-scoped recall.
6. Make ingestion domain explicit and reject unknown domains rather than defaulting to engineering.
7. Add provenance and model/provider metadata to answer traces.
8. Add backup, migration, dry-run, idempotency, and rollback procedures.

## First controlled implementation sequence

1. Capture a read-only baseline: current branch/commit, schema, record counts, existing evaluation results, and configuration (never print secrets).
2. Implement additive schema migrations for sources, claims, approvals, dataset versions, runs, and audit events.
3. Add quarantine and review APIs; do not change the current answer path until tests pass.
4. Add non-destructive ingestion with explicit domain and source metadata.
5. Add domain-filtered hybrid retrieval behind a feature flag.
6. Add real-model held-out evaluation and publish baseline metrics.
7. Enable a small, reviewed pilot dataset in one low-risk domain.
8. Expand domain by domain only after passing acceptance gates.

## Definition of done

Noctis may claim that it has learned a new item only when it can identify the source, exact locator, domain, version, approval status, and retrieval behavior. Noctis may claim a model was fine-tuned only when a provider/model training job completed, its dataset and configuration are recorded, and an independent held-out evaluation demonstrates the resulting change.
