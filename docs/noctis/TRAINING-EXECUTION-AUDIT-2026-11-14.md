# Noctis inference, data and training execution reality check — 2026-11-14

## Commit scopes verified

- Development stack: PR #7 head `b60b5cbb9dbf60e7c1dc24d58203093b16a14947`; draft PR #8 extends that commit. PRs #1–#7 are unmerged and stacked. M3 provider-neutral MicroVM adapter and simulated control-plane tests are present in the development stack.
- Independently advanced default branch: `main` at `a00ef7a71d4480c5daebb06828bc22a3858f23a3` when checked. Compared to PR #7, GitHub reported divergence (**94 commits ahead and 482 behind** in the chosen compare direction); no automatic main rebase, merge, overwrite or deletion is safe.
- Previous exact PR #7 head CI completed successfully: run `43440810722`. Check PR #8 exact final head CI separately.

## Existing inference remains a mixed application pipeline

The development branch has a provider gateway (`src/lib/video-mind.server.ts`) with configured external API providers and fallback; Noctis response paths also use local deterministic engines, stored answers, retrieval and curated responses. Prior PRs #3–#6 instrument chosen model routing, gateway provenance, specialist-route provenance and API response provenance. These are application and inference operations, **not trained Noctis-owned neural weights**. Internally prewritten curriculum answers, exported SFT/DPO JSONL and green source-code tests are not live-model intelligence measurements.

## Newly discovered main-branch training script: real loader/exporter, no observed training loop

At the exact checked `main` commit, `scripts/train_noctis_lora.py` exists (blob `660f62ce43dd31f0371d7f42224785f9f65a438b`) along with `data/noctis-chatml-training.jsonl`. The script:
- Loads `data/vibe-training.json`, optional `src/lib/noctis-health-500-complete.json`, and hardcoded engineering questions/answers.
- Creates ChatML-formatted message examples and writes `data/noctis-chatml-training.jsonl` to the Git checkout even under `--dry-run`.
- Defaults a `--base-model` argument to `meta-llama/Llama-3.3-70B-Instruct`, and prints QLoRA, NF4 and LoRA parameters.
- **Does not** import/run PyTorch, PEFT or TRL; instantiate a trainer; call a training step; save an adapter/checkpoint; or record a training job. After printing configuration, its `main()` returns without a training loop.

Consequently, the existence of this script/dataset is **training preparation only**, not evidence of an executed fine-tune or selected/licensed base model. The default model argument has not been audited against usage rights, training hardware, memory requirements, model access or actual performance. The hardcoded medical/engineering outputs have not been independently verified as safe training truth. The provenance, privacy and reuse rights of `data/vibe-training.json` were **not established** in this review.

**Important safety risk:** Existing main `--dry-run` is not write-free; it exports into the public Git checkout. Do not run that script with potentially private data or treat its current JSONL output as reviewed/permissioned training data. Reconcile it with a truly private artifact path, independent data approval and verified train/development/heldout separation on a separate future development branch. Do not silently train on user conversations or health records.

## What this run did and did not do

The current draft PR adds a strictly scoped optional, approved, pinned public-source acquisition adapter. Only synthetic offline tests were executed locally; **no real dataset was fetched**, no network-using CLI invocation, inference call, paid training/evaluation, GPU provisioning, production deployment or weight update occurred. No actual LoRA weights or model checkpoints were verified in this run.

**Next checkpoint:** validate PR #8 exact-head CI, then reconcile the newer main training script in a non-destructive, separate review; gate any dataset generation on source permissions and independent validation. Finish the versioned training job and artifact contract before considering an authorized GPU/adapter training run. Run the same held-out model-facing evaluation before and after any candidate training. Preserve M3 and its isolation tests, but do not imply a live cloud deployment has been validated.
