# Noctis model routing and evaluation baseline — 2026-11-09

**Goal:** Improve the existing general-purpose Noctis assistant (conversation, reasoning, coding, grounded research, tool use, multimodal and specialist engines) without introducing a customer training-material submission dependency.

**Development lineage:** `main` → `noctis/training-foundation` (draft PR #1) → `noctis/phase-a-learning-integration` (draft PR #2) → `noctis/model-routing-evaluation-foundation` (this branch). These are unmerged; test the final branch as a stacked change. Do not merge, migrate or deploy without authorization.

## Verified inference paths (source inspection, not live provider proof)

- `src/lib/noctis-api.ts`: `askNoctis` accepts user turns, optional images, task skill and optional selected brain; it delegates to `vibeReply`.
- `src/lib/noctis-desk.server.ts`: `vibeReply` / `composeVibeReply` may short-circuit on deterministic calculations, specialist responses, prior stored answers, study/retrieval or direct task handlers. Model-backed paths use `modelChat`. **This branch forwards `brain: style.brain` in the ordinary chat/coding path**, aligning it with the other general-response branch.
- `src/lib/video-mind.server.ts`: `modelChat` supports selected Gemini, OpenAI, Groq, xAI and custom OpenAI-compatible endpoints. If an attempt fails, it can try other configured providers; finally it may call `vibeNativeComplete`. A selected provider is therefore not a guaranteed actual responding provider.
- `src/lib/noctis-train.server.ts`: `vibeNativeComplete` is primarily deterministic/retrieval/stored-response composition. `executeZeroTouchAutonomous20AreaTraining` commits seed lessons and rules; it does not itself update neural model weights.
- `src/lib/noctis-autonomous-trainer.ts`: curriculum verification flags, predefined scores and SFT/DPO JSONL generation are not proof of a completed fine-tuning run.
- `scripts/eval-noctis.ts`: an existing evaluation/report entry point, not evidence by itself of sampled responses from a deployed model.
- Existing M3 MicroVM adapter/tests on the base development branch use a simulated control plane. Preserve these; do not describe them as live cloud isolation or deployment.

## Completed in this branch

- Fixed selected-model forwarding for ordinary chat/coding. No provider priority, credential handling, fallback policy, specialist routes, production resources or database behavior changed.
- Added `scripts/noctis-desk-model-routing.test.mjs`, a network-free, real-source ordinary-branch test. It verifies forwarding for five providers, coding/chat, keyless/default choices, conversation history, memory short-circuit, option preservation and error propagation.
- The test does **not** prove a live model was invoked, selected model actually served the response, or model intelligence improved.

## Next stage: provider/response provenance and live baseline

Add a structured, low-risk provenance contract **at the model gateway and response handlers**, recording actual origin rather than the requested provider alone: `source_kind` (model|specialist|retrieval|stored|deterministic|fallback), `requested_provider`, `actual_provider`, `actual_model`, `fallback_used`, `duration_ms`, `request_id` and diagnostic error code (without storing secrets, user prompts, sensitive documents or raw responses in telemetry by default). Make status visible without inventing a model name for deterministic/stored output.

Build on the existing evaluation entry point with a versioned, held-out question/task corpus covering general conversation, instructions, multi-turn context, math/reasoning, coding (sandboxed testable tasks), research (claim-to-source checks), tool use, visual input and existing specialist engines. Record raw evaluation responses in a restricted local artifact only when authorized, and preserve prompt/reference versions, actual response origin, test outcome, cost, latency and failure reason.

**No paid model calls, transmission of private data to external providers or training jobs without explicit authorization.** Start with no-network tests and synthetic/public permitted examples; only run true model baselines once a configured evaluation provider, consented data, budget and independent grading mechanism are available.

## Read-only baseline harness now available

- Project-authored, fixed **held-out V1 corpus**: `scripts/fixtures/noctis-general-assistant-baseline-v1.json`, 12 synthetic question sets spanning conversation, instruction-following, multi-turn memory, math, coding, research/citations, tool use, cyber, health, legal and engineering. No user chat or protected records are included. Multimodal task inputs require a later consented fixture and are **not** covered by V1.
- `node scripts/noctis-live-eval.mjs` performs **dry-run manifest inspection only** and makes zero model calls. `node --test scripts/noctis-live-eval.test.mjs scripts/noctis-desk-model-routing.test.mjs` runs network-free harness/routing checks.
- Live evaluation must be specifically authorized because a configured Noctis backend may use paid model providers. Example for a **previously approved nonproduction local** server: `NOCTIS_EVAL_AUTHORIZED=YES NOCTIS_EVAL_URL=http://127.0.0.1:8080/api/noctis node scripts/noctis-live-eval.mjs --execute`. Do not run this command without authorization and confirmation of the backend's actual provider/cost settings.
- Remote HTTPS evaluation additionally requires `NOCTIS_EVAL_ALLOW_REMOTE=YES`, explicit approval, and a legitimate owned evaluation endpoint. `NOCTIS_EVAL_API_KEY` supplies an HTTP bearer if needed. No credentials are written to reports.
- Reports default to restricted files in the OS temporary directory with response hashes, lengths, basic latency and a returned model label marked **unverified**. `NOCTIS_EVAL_STORE_RESPONSES=YES` explicitly enables raw response retention; leave off unless reviewed. Mechanical numeric/phrase checks are clearly labeled and cannot replace human or execution-based grading. No overall accuracy or cross-model parity figure is produced.
- Actual live requests remain **not run**, and response origin remains unverified until the model gateway and specialist handlers return trustworthy provider/route provenance.

## Model training: evidence requirements

A genuine training run requires a trainable base model and its rights documented, dataset source/license/provenance and privacy filters, distinct train/dev/held-out partitions, reproducible SFT or preference-optimization configuration, job logs, adapter or checkpoint artifacts, evaluation against the frozen baseline and explicit release approval. Do not describe seed-memory loading, JSONL exports, API inference, passing application tests or template scores as model-weight training.

## Release gates

1. Targeted routing tests pass against actual checkout source.
2. Full `npm run typecheck`, `npm test`, `npm run build:dev` and PR CI pass on **the exact commit**. Do not invoke `npm run build` for a validation-only run: it performs migrations.
3. Review fallback transparency, auth, custom endpoint egress/DNS risks, and previous PR #1/#2 migration/security issues separately.
4. Keep this branch and PR draft/unmerged until review and authorization.
