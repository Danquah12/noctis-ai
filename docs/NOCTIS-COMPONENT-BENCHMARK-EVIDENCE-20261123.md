# Noctis application-component benchmark evidence boundary — 2026-11-23

**Status:** Proposed, development branch only. Does not authorize deployment, merges, paid evaluations, or production database updates.

## Evidence audited

- Base `main` commit `f91db12050324f4075a98e6446446b21d4636f4a` (2026-11-23 13:20:40 UTC). GitHub Actions main push run [45182991740](https://github.com/Danquah12/noctis-ai/actions/runs/45182991740) reports success for that exact commit. Its workflow executes `npm ci`, `npm run typecheck` (a narrow test subset), and `npm run build`. **It does not run all application tests or verify a trained model.**
- PRs [#1](https://github.com/Danquah12/noctis-ai/pull/1) and [#2](https://github.com/Danquah12/noctis-ai/pull/2) are still open and contain earlier governance/Phase A proposals. PRs [#12](https://github.com/Danquah12/noctis-ai/pull/12) and [#15](https://github.com/Danquah12/noctis-ai/pull/15) are merged but do not, by themselves, independently authenticate a checkpoint. PRs [#16](https://github.com/Danquah12/noctis-ai/pull/16), [#17](https://github.com/Danquah12/noctis-ai/pull/17), [#18](https://github.com/Danquah12/noctis-ai/pull/18) remain draft at audit time.
- The newer `src/lib/assistant/benchmark-100.server.ts` added on November 23 exercises 100 deterministic/in-process application checks. **It is not a selected-model live inference benchmark.** The `parity-matrix.ts` labels 98 entries `VERIFIED_OPERATIONAL` and two `PARTIALLY_IMPLEMENTED`, but these are declared application feature statuses and not comparative ChatGPT/Grok/Gemini evaluation results.
- The original `runSingle()` treated `"FAIL"` or `"ERROR"` returned as text as `PASS` unless an exception was thrown. The new small normalization helper interprets explicit negative sentinels and missing/invalid values as failures without changing descriptive legacy success evidence.
- `video-mind.server.ts` remains an API/provider-and-fallback inference path, not evidence of locally owned weights. The existing SFT and DPO Python files contain neural optimization code paths, yet live job, model-weight, and independent held-out evaluation artifacts were not verified here.
- The general model baseline in draft PR #18 uses explicit provider identity and synthetic public smoke prompts. It is a distinct, *unmerged* opt-in evaluator. Keep its results separate from application-component checks.
- The M3 adapter in `noctis/training-foundation` at `src/lib/noctis-cloud-microvm-provider.ts` remains untouched; its simulated control plane is not evidence of cloud isolation.

## Proposed changes

1. Add `benchmark-outcome.ts` with a fail-closed outcome classifier.
2. Correct `runSingle()` so explicit failure strings and missing results cannot inflate component pass counts.
3. Add non-breaking provenance fields to `run100TaskBenchmark()` output: `benchmarkScope`, `evidenceMethod`, `modelInferenceEvaluated=false`, `heldOutDatasetEvaluated=false`, `independentEvaluationVerified=false`, `modelQualityScore=null`, `releaseGate=not_established`.
4. Change the chat explanation to label the 100 tasks as application-component checks. Do not call this an intelligence score.
5. Add five offline regression tests and an explicit GitHub Actions step to run them.

## Limitations and follow-up

- A descriptive successful return value is still only a self-asserted in-process check; it does not independently establish correctness. More robust per-task reference outputs and independent graders are needed.
- The existing 98 `VERIFIED_OPERATIONAL` statuses, model cards, and declared benchmark statistics need separate evidence audits before any parity claim. This PR does not revise all marketing/UI claims.
- The proposed component benchmark is separate from the held-out model benchmark. Next: strengthen PR #18 with measured, one-provider live-model inference after consent and provider permission; prepare a source-licensed, independently validated train/dev/held-out corpus and a GPU-checkpoint provenance audit.
- The repository's main branch may continue advancing independently. Rebase and review before any eventual merge; do **not** merge automatically.
- No customer upload/reviewer feature, private training data transfer, GPU job, or paid model evaluation is part of this change.

## Validation

- Local isolated Node v22.16.0: `node --experimental-strip-types --test src/lib/assistant/benchmark-outcome.test.ts` — **5 passed** on the original candidate test file before GitHub commit. This only exercises the pure classifier and provenance constants, **not** the full application.
- Exact-commit GitHub Actions result must be recorded once the final branch commit has completed.
