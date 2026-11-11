# Noctis response-origin route attribution (development, 2026-11-11)

## Intent
Extend draft PR #4's **model gateway** provenance with explicitly identified Noctis Desk short-circuits. This is application routing metadata, not an independently attested model identity or claim of intelligence improvement. No customer learning-submission feature is required.

## New contract
`src/lib/noctis-route-provenance.mjs` reports `protocol: noctis.route.v1`, a fixed `route_id`, a corresponding `source_kind`, and `model_gateway_attribution: not_available`. Route IDs are hardcoded allowlisted identifiers, never derived from prompts, patient records, CVEs, file names, user IDs, URLs or credentials. The parser rejects contradictory protocol, route ID and source kind and discards extra fields. Do not treat a specialist route as proof that no internal model was involved.

The original `noctis.gateway.v1` contract remains intact for provider-backed model replies and the local-native gateway fallback. They are mutually exclusive response contracts.

## Coverage (verified by code-level tests, not actual network invocations)
- `source_retrieval_report`: local retrieval report returned before model inference.
- `science_formula_solver`: targeted science solver.
- `inline_math`, `calculation_engine`: explicit computation branches (English calculator path).
- `cve_intelligence`: specific vulnerability resolver.
- `approved_qa_memory`: known Q&A / cached-answer retrieval paths. Stored Q&A is **not** neural model training.
- `science_lab`: targeted science laboratory handler.
- `knowledge_card`: saved curated knowledge fallback.
- `missing_source_response`, `missing_chapter_response`: explicit inability to substantiate the requested material.

## Known remaining gaps
Many Noctis Desk handlers, delegated research/tutor/career paths, translated calculator responses, plugin synthesis, and other specialist APIs still do not report route-level origins. Some delegated handlers may internally call a model; they must not be mislabeled deterministic until traced. The evaluation runner now reports `gateway_origin_reported`, `route_origin_reported`, and `origin_not_reported` separately, with unknown remaining unknown. API response metadata is not a cryptographic attestation of provider identity.

## Validation and gates
Run `node --test scripts/noctis-route-provenance.test.mjs scripts/noctis-model-provenance.test.mjs scripts/noctis-live-eval.test.mjs`, then `npm run typecheck`, `npm test`, `npm run build:dev` via GitHub CI. Never run `npm run build` for this review: it initiates database migrations.

No live paid evaluation, private-data transfer, model-weight training, cloud provisioning, database migration, deployment, or production changes are part of this PR. PRs #1–#4 are stacked and remain draft/unmerged. M3 MicroVM implementation and simulated-control-plane tests are unchanged. The next priority is to trace and classify delegated handlers without inventing provenance, then run consented real-model baselines against approved infrastructure.
