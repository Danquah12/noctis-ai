# Noctis Engine Integration Audit

**Branch:** `noctis/training-foundation`  
**Audit command:** `npm run audit:noctis-integrations`  
**CI gate:** `.github/workflows/ci.yml`  
**Status:** Static import-graph validation passes in CI; per-engine runtime integration certification remains open.
**Latest validated graph:** CI run `42432825019`, commit `0214f61c60ff2f728f28a54b106902bd08cf4910`.

## Purpose

The registry is descriptive and does not dispatch engines. This audit checks whether each registered source path exists, whether registry identifiers are unique, and whether source imports connect the registered module to application entrypoints.

It deliberately does **not** equate an import with a function call, a reachable module with a working workflow, or a passing build with production readiness.

## Current repository inventory

The CI audit on the current workstream scans 822 source files and identifies 128 `src/lib/noctis-*` implementation modules, of which 11 are represented by the curated registry. The remaining 117 are not automatically labeled missing engines: the set includes supporting libraries, adapters, data modules, orchestration helpers and specialist modules that still need taxonomy review.

The latest validated integration-graph pass established:
- 822 source files scanned.
- 128 Noctis-prefixed implementation modules found.
- 11 registry entries.
- 0 missing registered source paths.
- 0 duplicate registry IDs.
- 0 registered entries without a non-test/non-script runtime importer.
- 0 registered engines outside the modeled application-entrypoint graph.
- 117 Noctis-prefixed source modules outside the curated 11-entry registry. These are unclassified modules, not automatically missing engines.

The application-entrypoint graph includes route files, the primary `NoctisDesk.tsx` UI root and the `noctis-desk.server.ts` server-function entrypoint. The server entrypoint is explicit because the framework boundary cannot be inferred reliably from client imports alone.

## How the audit works

`scripts/noctis-engine-integration-audit.mjs`:
1. Scans TypeScript/JavaScript source under `src/` and `scripts/`.
2. Resolves relative imports and the `@/` source alias.
3. Builds a static source-import graph.
4. Uses route files, `NoctisDesk.tsx`, and `noctis-desk.server.ts` as application entrypoints. The server-function entrypoint is included because TanStack server-function execution crosses a framework boundary.
5. Reports direct importers by category (route, UI, server, library, test and script).
6. Reports missing source paths, duplicate registry IDs, registered modules with no runtime importers, modules not reachable from the modeled application entrypoints, and Noctis-prefixed modules outside the curated registry.

The script is read-only and is part of CI. It fails on missing registered source paths or duplicate IDs. Reachability gaps are reported for review rather than treated as build failures.

## Registry lifecycle policy

All initial registry entries remain `registered`. They must not be promoted to `integrated`, `validated`, `operational` or `production-approved` based only on this static graph.

Promotion requires a separate engine-level audit confirming:
- The exact exported function or adapter used by the workflow.
- A reachable route, server function or job handler that invokes it.
- Server-derived identity, tenant and permission enforcement.
- Evidence and approval references resolved by authoritative services.
- Input/output schema validation and stable error handling.
- Domain-specific safety gates and human review.
- Focused unit, integration, authorization and adversarial tests.
- Runtime telemetry, failure behavior and deployment evidence where applicable.

## Known limits

- Regex-based import parsing is a static approximation, not a TypeScript compiler AST or bundler module graph.
- It cannot prove that a function is invoked, that a branch is selected, or that a UI action succeeds.
- Framework-generated routing, plugin discovery, reflection and runtime-loaded modules may not be represented.
- Type-only imports can appear as source dependencies; treat counts as review signals, not execution evidence.
- The audit does not yet reconcile every module with the historical 42 profession categories, specialist-engine taxonomy, or runtime capability registry.
- The audit does not authorize execution and is not an authorization control.

## Next engineering work

1. Complete per-engine call-site and workflow audits for the 11 registry entries.
2. Complete per-engine function-call and route workflow audits; static reachability is not proof that the intended function is invoked.
3. Classify the 117 non-registry Noctis modules as engine, service, helper, adapter, data or deprecated artifact.
4. Add typed engine adapters and a trusted execution controller only after actor/tenant/scope, evidence and approval services are authoritative.
5. Add integration tests proving the route-to-engine call path and its safety boundaries.
