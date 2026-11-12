# Noctis API response-origin bridge — 2026-11-12

## Scope and discovered gap

The nonproduction `/api/noctis` POST general chat response previously generated `model` from the requested configuration, then serialized `text`, `model`, `usage`, `created`, `status` while dropping the response's already-generated `provenance` property. Meanwhile `scripts/noctis-live-eval.mjs` expects an optional top-level `provenance`, so it would classify these genuine model- or specialist-origin responses as unattributed even when internal Noctis Desk had the metadata. A client-requested model label is not the actual responding model.

## Change

Forward **only** the validated, whitelisted optional provenance object in the general chat success response via `sanitizeNoctisPublicResponseProvenance`. Accepted existing contracts are `noctis.gateway.v1` and `noctis.route.v1`; extra values and unexpected shapes are dropped. No prompts, provider keys, endpoints, documents, raw responses, or arbitrary model-specific fields enter this metadata. Existing `text`, `model`, `usage`, `created`, `status`, and error schemas are unchanged; missing attribution is omitted (never fabricated). This is a response-contract bridge; it does not establish trusted model identity or prove any neural inference actually occurred.

## Verification and limitations

- Run `node --test scripts/noctis-public-response-provenance.test.mjs` (network-free).
- Verify clean project CI against the exact new commit, including typecheck, test, and migration-free build: `npm run build:dev` (**not** `npm run build`, which applies migrations).
- No model/provider requests or new trained weights. No production deployment or database changes.
- The public `/api/noctis` endpoint has separate authorization, CORS, rate-limiting and privacy concerns. This change does not approve that endpoint for sensitive data or external benchmarking.
- Many deterministic/specialist paths remain unattributed; `noctis.route.v1` only records the specific handler that returned, not the internal subcalls.
- The evaluation runner still needs explicit approval for any live model requests, including possible paid provider usage. No intelligence score is claimed by source tests or metadata changes.
- Keep work on a new development branch/stacked draft PR and preserve existing M3 cloud microVM adapter.
