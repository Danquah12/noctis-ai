# Noctis model response origin — development checkpoint (2026-11-10)

## Purpose
Improve Noctis's existing model gateway and assistant pipeline without creating a user-submitted training-material workflow. This is a **response-routing transparency** feature, not a new model, model fine-tune, or a claim of frontier-model parity.

## Implementation
- Model gateway: `src/lib/video-mind.server.ts` (`modelChat`) instruments seven responding provider branches and the deterministic / retrieved-answer `vibeNativeComplete` fallback.
- Pure privacy-minimal contract: `src/lib/noctis-model-provenance.mjs`. A result includes `source_kind`, `requested_provider`, `responding_provider`, `attempted_model`, `provider_reported_model`, `fallback_used` and `model_identity_independently_verified: false`.
- Chat flow: `src/lib/noctis-desk.server.ts` preserves this optional metadata for ordinary and complex gateway answers, plus selected plugin and document responses; it does not invent a model identity for non-gateway handlers.
- Nonproduction evaluation: `scripts/noctis-live-eval.mjs` records a **whitelisted application-reported** origin alongside response hashes and mechanical checks. The model identity remains unverified, because an HTTPS response from a provider is not independently attested model provenance.
- Tests: `scripts/noctis-model-provenance.test.mjs` covers provider and model retry reporting, local-native fallback, whitelisting, sensitive-label rejection, integration return branches and response propagation.

## Interpretation
A successful provider API call establishes which Noctis **network route** returned response text. `attempted_model` is the model string sent by Noctis, not independently verified served weights. `provider_reported_model` is present only when the provider returns a usable label, and remains unverified. The fallback flag indicates repeated attempted calls, a response from another provider than the explicitly selected one, or use of the local-native answer constructor. No secrets, endpoints, document text or raw prompts are stored in provenance.

A missing `provenance` field on deterministic, stored, research or specialist short-circuit responses means **unclassified/uninstrumented path**, not a confirmed neural response. There is also no provenance if the model gateway returns an error before a response. More handler-level classification and an end-to-end test harness are necessary.

## Evidence and release gates
This change uses no paid model calls and does not alter data or security policy. Source-contract tests can demonstrate that the application code forwards metadata but **cannot** validate actual model identity, task accuracy, research citations, or inference provider availability. No actual SFT/DPO training job, model-weight update, checkpoint, adapter, cloud deployment, or live MicroVM isolation test is claimed. M3 adapter remains untouched and was previously exercised only against a simulated control plane.

Before a release, require exact-head clean GitHub CI (`npm ci`, inventory, integration audit, typecheck, `npm test`, migration-free `npm run build:dev`), security review for existing authentication and network egress concerns, then specifically authorized live-model tests using nonprivate synthetic held-out prompts. Do not run the production `npm run build` command for validation because it performs migrations.

## Next steps
1. Distinguish top-level deterministic, retrieval, stored-answer and specialist-engine short circuits using a similarly minimal typed origin contract, without attributing a model that did not answer.
2. Add independent end-to-end assertions that the selected provider, configured fallback chain and returned provenance agree in a controlled mocked server.
3. After explicit approval for any paid inference, run the held-out 12-case real-model baseline with response-origin reporting and independently checked coding, research, tool and domain tasks.
4. Reuse existing curriculum and governed permitted datasets for a reproducible model-training backend only when trainable weights, licensing, compute and explicit authorization are ready.
