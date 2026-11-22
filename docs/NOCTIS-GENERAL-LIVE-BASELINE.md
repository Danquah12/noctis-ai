# Noctis general-assistant model-facing baseline — 2026-11-22

**State:** development-only, draft and unmerged. This milestone created an opt-in model-facing inference harness. No live-model requests, paid evaluation, GPU training, adapter publication or production migration occurred. The test data are **nine public synthetic smoke examples**, not held-out evaluation data.

## Actual repository audit

- Base main: `eef2795252c49f082298e444489e150d9ba4e882`; main GitHub Actions run [45027028758](https://github.com/Danquah12/noctis-ai/actions/runs/45027028758) completed successfully. Its `npm run typecheck` invokes a narrow pair of tests and its `npm run build` includes a database-migration command (skipped in CI when no database URL is configured); this is not the complete test suite.
- PRs [#1](https://github.com/Danquah12/noctis-ai/pull/1), [#2](https://github.com/Danquah12/noctis-ai/pull/2), and their development successors were reviewed. PRs #12 and #15 were already merged separately; PRs #16 (adapter evidence) and #17 (DPO preflight/publication guard) remain draft and separate.
- `src/lib/video-mind.server.ts:modelChat` uses client-selected providers, then may silently fall through to configured custom, xAI, Gemini, OpenAI, Groq and native response paths on errors. The explicit local providers are `ollama`, `vllm`, `noctis-local`. The live baseline does **not** call that routing stack: it calls **exactly one declared OpenAI-compatible endpoint** and records the model identifier returned by the server, with no automatic retries or fallback. A caller-declared model name does **not** establish ownership of weights or model revision.
- `src/lib/noctis-train.server.ts` stores question/answer memories; synthetic generators create data; JSONL export is only data preparation. The main Python SFT and DPO scripts contain neural optimization calls but do not prove that any particular training job produced weights. The claimed Phase 2 H100 adapter, later Phase 3 DPO results and benchmark scores require actual weights/checkpoints, run logs, immutable dataset and evaluation evidence, independent adjudication and replication. PR #16 tracks the earlier missing artifact evidence.
- The saved roadmap `docs/noctis/MASTER-TRAINING-READINESS-AUDIT.md` on the `noctis/training-foundation` branch explains that `runNoctisEvalSuite` evaluates a **constructed expected-response string**, not live model generations. Its self-check numbers are not model quality metrics.
- Existing M3 `src/lib/noctis-cloud-microvm-provider.ts` is present on the `noctis/training-foundation` development branch, not the inspected main tree. The simulated control-plane tests validate adapter behavior, **not** live microVM security or deployment. This branch does not touch M3.

## Implemented evaluation bridge

- `scripts/noctis-general-baseline.mjs`: dependency-free CLI with `inspect`, `live` and `score-file` modes; defaults to **inspect (no network)**.
- `data/noctis-general-smoke-v1.jsonl`: nine independent synthetic questions across conversational context, instruction following, reasoning/math, coding, research/citations, proposed tool calls, cybersecurity, clinical triage, and explicitly **unmeasured** image/vision capability. It is visible in Git and must not be used as a genuine held-out benchmark.
- Opt-in live mode sends bounded public synthetic prompts to an explicitly selected inference endpoint. Requests are capped at 25; temperature 0, max 256 output tokens, 30-second timeout, no redirects, no auto-fallback. Remote providers require HTTPS plus `--allow-remote`; credentials are taken from `NOCTIS_BASELINE_API_KEY` and not written into artifacts.
- A response artifact records the dataset SHA-256, exact prompt hashes, response hashes, declared provider/model/inference kind, server-advertised model, latency, response text, and hashed *proposed* tool-call arguments. It does **not** execute tools or authenticate the claimed weights. Existing output files cannot be overwritten.
- Only the exact-answer and JSON-object fixtures can receive automatic pass/fail verdicts. Conversation, coding, citations, tool execution and clinical safety require **independent adjudication**. A composite intelligence score is deliberately `null`; `held_out_validation=false` and `release_gate=not_established`.
- CI now runs nine self-contained mocked tests of validation, privacy-designation gates, single-provider routing, tool-call capture, integrity and fail-closed behavior. Mock test success is not evidence of live inference or training.

## How to operate (only with appropriate authorization)

Network-free fixture inspection and tests:

```bash
node scripts/noctis-general-baseline.mjs --mode inspect
node --test scripts/noctis-general-baseline.test.mjs
```

**Example only — do not run without explicit authorization for evaluation resources and any fees:**

```bash
node scripts/noctis-general-baseline.mjs --mode live \
  --execute-live --authorize-public-prompts \
  --endpoint http://127.0.0.1:8000/v1/chat/completions \
  --provider local-vllm --model approved-model-id \
  --inference-kind local_service --max-requests 8 \
  --output runs/noctis-general-baseline-local-001.json
```

Use `--allow-remote` only for a separately approved HTTPS provider. Stored responses may themselves contain sensitive information if the operator replaces synthetic prompts; the fixture metadata is not an automated privacy detector. Do not send user conversations, patient records or proprietary test data to external providers. The `runs/` folder is Git-ignored.

Offline, without a provider call, audit a saved artifact:

```bash
node scripts/noctis-general-baseline.mjs --mode score-file \
  --responses runs/noctis-general-baseline-local-001.json
```

## Measured limits and next task

No live inference, held-out scores, code-execution correctness, retrieval/citation entailment, image/audio understanding or authenticated tool execution have yet been measured. The next work is to assemble **independently validated, non-public held-out** evaluation cases with provenance and license/PII/leakage review; add reviewed rubrics and tool traces; then run the same authorized baseline against approved local/base/candidate model revisions. Capture actual checkpoint hashes and GPU job records before training claims. Maintain draft-only review, no customer training-material submission portal, and no unapproved merge or production release.
