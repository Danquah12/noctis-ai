# Noctis Phase 2 — training evidence reconciliation (2026-11-20)

## Scope and change boundary

This development branch starts at main commit `0e8a2c3414c570d705c00280e344b663e7041380`. PR #12 (training pilot) and PR #15 (sovereign orchestrator) were already merged into main by separate actions when inspected; their presence must not be treated as approval to perform new training, deployments, policy changes or migrations. The older governed source-to-SFT pipeline in draft PRs #1–#14 remains separate and is NOT deleted or rebased here.

The runtime previously documented on the development stack under `src/lib/noctis-cloud-microvm-provider.ts` remains preserved there. Passing fake-control-plane tests does not establish real cloud isolation.

## Observed repository evidence

- PR #15 and `data/noctis-benchmark-model-results.md` report a Qwen2.5-7B-Instruct fine-tune and improved held-out scores, and `deliverables/CHECKSUMS-PHASE2.sha256` names an adapter and model evaluation response files.
- The inspected **main Git tree** includes the checksum manifest and baseline/trained response JSONL files, but has **no tracked** `models/noctis-7b-v2.0-adapter/adapter_model.safetensors`, `adapter_config.json` or `deliverables/noctis-phase2-results-v2.0.tar.gz`. These files may be external artifacts; their existence, weights, provenance and reload behavior were not verified in this review. Do not conclude that training did not happen merely because they are untracked.
- `scripts/train_unsloth_sft.py` contains a neural-optimization path using `SFTTrainer` and LoRA save/reload code. Code is not evidence that it executed on an H100.
- Existing data reports contain different evaluation modes and sizes: a 50-case evaluation, a 250-case **reference self-check**, and a 250-case reported model comparison. Reference self-consistency is not live-model performance. The case-specific scoring rubric and independence of grades remain to be audited.
- The present checksum file does not pin the benchmark-source bytes. The new audit reports its SHA-256 but marks benchmark lock as false.

## Offline audit

Run `node scripts/noctis-training-evidence-audit.mjs` from any directory, or add `--root <checkout-or-evidence-directory>`. It reads only a fixed manifest and listed artifact paths; it makes no network/model requests, trains no weights, and writes nothing.

Checks include pinned SHA-256 file hashes, missing adapter/config files, the benchmark's 250 unique case IDs, and exact baseline/trained response ID coverage. It exits 2 on incomplete/invalid evidence and 0 only for **file integrity and case coverage**, never for independently validated training or intelligence gains. A complete audit requires placing appropriately authorized artifacts under the indicated locations in a local secure environment. Never commit private artifacts or private records merely to satisfy this audit.

Run tests with `node --test scripts/noctis-training-evidence-audit.test.mjs`. Synthetic mock weights and response records are used only to verify control flow. Passing synthetic tests proves no model performance.

## Required before verified training-performance claims

1. Establish lawful source and model license permissions and an immutable base-model revision.
2. Reconcile governed SFT split manifest from draft PR #14 with the now-merged trainer on a separate integration branch; do not silently train on conversations or private records.
3. Supply authorized adapter artifacts plus immutable training configuration, input fingerprints, actual training logs, checkpoint metadata, optimizer steps and post-training reload evidence.
4. Freeze and hash a held-out benchmark **before** training; independently review contamination controls and the scoring rubric, and record generation parameters, exact model/adapter revisions, response origins and complete raw outputs.
5. Reproduce the scores with the same held-out cases and grader for both base and candidate models; adjudicate specialist and high-stakes responses with appropriate expertise. Do not assert parity with external assistants from this comparison alone.

No paid GPU evaluation, model training, live API calls, security policy change, or production deployment is authorized by this branch.
