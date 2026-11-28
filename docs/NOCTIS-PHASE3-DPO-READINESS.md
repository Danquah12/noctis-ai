# Noctis — Phase 3 DPO readiness and evidence reconciliation (2026-11-21)

## Scope and current evidence

Observed `main` at `5a0db6fdef79655f6cc7a1caebda59943be738f1` (2026-11-21 13:55:42 UTC). PRs #12 and #15 have already been merged; draft PR #16 audits earlier Phase 2 artifact integrity and is not superseded here. The earlier internal source-review/SFT-integrity stack (#7–#14) is still open and must be reconciled, not deleted. PRs #1 and #2 include user-submission/reviewer functionality that is *not* a prerequisite for Noctis's general-assistant objective.

The current main tree includes `scripts/train_unsloth_sft.py` and `scripts/train_clinical_dpo.py` with neural-parameter optimization paths; `scripts/eval-noctis.ts` runs application/specialist checks, not a proven independent live-model benchmark. `src/lib/video-mind.server.ts` can route requests to local Ollama/vLLM/Noctis endpoints and external providers (including xAI, Gemini, OpenAI and Groq), with fallback. Successful application logic, API responses, JSONL output and synthetic safety cases are not proof of trained Noctis weights.

Newly added reports and `MODEL_CARD.md` assert H100 DPO, model performance (including 99.9/100 Health 500), streaming throughput, and other clinical outcomes. The reports describe 504 DPO pairs, while the current dataset generator and GPU guide describe 1,004; the model card references v3.0 while the run script targets v3.1. These are **unreconciled assertions**, not validated by this change. No v3 trained adapter, immutable execution log, post-training reload output, blinded independent clinical adjudication, or paired live-model replay was verified during this run. Untracked/external artifacts may exist.

The existing M3 MicroVM adapter was previously located on an older development branch; its simulated-control-plane unit tests do not establish live cloud isolation. This PR does not touch it or change production deployment.

## Changes in this draft

* The GPU DPO trainer now requires the explicit `--push-to-hub` flag to take its publication path. Simply setting `HF_TOKEN` no longer triggers an automatic outward model upload. The flag is a technical condition, **not** permission to publish: operator approval, weights provenance, data rights and release review are still required.
* New standard-library-only `scripts/noctis-dpo-readiness.mjs` performs **read-only, offline** corpus and evaluation preflight: source file hashes, parseable JSONL, unique IDs and prompts, nonidentical chosen/rejected completions, exact/near lexical held-out prompt overlap, and byte-pinned internal approval attestations. Failures are coded without exposing patient-like input text. It refuses symlink inputs, path escapes and files over 64 MB. It does not contact a provider or schedule training.
* New targeted tests cover corpus structure, exact/near leakage, stale approval fingerprints, missing review, unsafe paths and the explicit publishing guard.
* By default the offline preflight reports `blocked` until actual internally reviewed source permissions, factual quality and privacy controls are recorded; there is **no customer training-material submission portal** or use of private conversations.

## Running the safe preflight

```bash
node --test scripts/noctis-dpo-readiness.test.mjs
node scripts/noctis-dpo-readiness.mjs
# Once independently approved internal records exist, in a secure checkout:
node scripts/noctis-dpo-readiness.mjs --approval internal/approved-dpo-v1.json
```

The optional internal manifest is a local JSON object with `schema_version: "noctis-dpo-approval-v1"`, byte-exact `dataset_sha256` and `heldout_sha256`, and `review` fields: `source_rights: "approved"`, `privacy: "approved"`, `clinical_accuracy: "independently_reviewed"`, a nonempty `reviewer`, and `source_register_sha256`. The manifest itself is an **attestation**, not a cryptographic signature or independently authenticated source-license/clinical review. Source register, per-example traceability and actual review evidence must be separately verified. Do not create approval metadata just to make this test pass.

`file_integrity_and_review_attestation_only` is intentionally **not** called `trained`, `production_ready` or `approved_for_training`. Near-duplicate matching is lexical, can miss paraphrases and may flag reused safety templates. It does not validate answer correctness. The trainer does **not** yet enforce this preflight automatically; integrate it into an authorized, versioned train-job wrapper after a compatibility/rights review.

## Next actionable work

1. Independently confirm permissible licensed sources and review the current synthetically generated clinical DPO pairs with domain experts; lock an approved source register, holdout bytes and per-pair validation evidence. Exclude patient records and conversations without explicit authorization.
2. Reconcile the draft #14 governed SFT split manifest with the merged SFT trainer, and wire a mandatory preflight into the DPO launch path before any paid job. Audit trainer library-version compatibility and the actual selected base model/revision.
3. Securely obtain real adapter/checkpoint and H100 job artifacts (if they exist). Apply PR #16 integrity controls and independently reproduce both base/candidate outputs on the same held-out tasks. Clinical scores require qualified adjudication.
4. Return to the **general assistant** baseline: context, instruction following, math, coding, research/citations, tool calls, and existing specialist/multimodal behavior. Do not assert performance parity with ChatGPT, Gemini or Grok without comparable live evaluation.

No GPU job, provider call, data upload, merge, production change, migration, or paid provisioning was authorized or performed by this PR.
