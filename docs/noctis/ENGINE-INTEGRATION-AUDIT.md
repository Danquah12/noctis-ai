# Noctis Engine Integration Audit

**Branch:** `noctis/training-foundation`  
**Audit command:** `npm run audit:noctis-integrations`  
**CI gate:** `.github/workflows/ci.yml`  
**Status:** Static import-graph validation is automated; per-engine runtime integration certification remains open.

## Purpose

The registry is descriptive and does not dispatch engines. This audit checks whether each registered source path exists, whether registry identifiers are unique, and whether source imports connect the registered module to application entrypoints.

It deliberately does **not** equate an import with a function call, a reachable module with a working workflow, or a passing build with production readiness.

## Current repository inventory

The CI audit on the current workstream scans 822 source files and identifies 128 `src/lib/noctis-*` implementation modules, of which 11 are represented by the curated registry. The remaining 117 are not automatically labeled missing engines: the set includes supporting libraries, adapters, data modules, orchestration helpers and specialist modules that still need taxonomy review.

The initial integration-graph pass established:
- 11 registry entries.
- 0 missing registered source paths.
- 0 duplicate registry IDs.
- 0 registered entries without a non-test/non-script runtime importer.
- 117 Noctis-prefixed source modules outside the curated 11-entry registry.

A route-only graph initially marked four modules as not reachable because the framework's server-function boundary was not represented as a normal route import. The audit roots were expanded to include the Noctis Desk UI and its server-side `vibeReply` entrypoint. The updated CI run is the authoritative result for application-entrypoint reachability.

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
2. Resolve the four route-only reachability candidates using verified server/UI entrypoint paths, not forced lifecycle promotion.
3. Classify the 117 non-registry Noctis modules as engine, service, helper, adapter, data or deprecated artifact.
4. Add typed engine adapters and a trusted execution controller only after actor/tenant/scope, evidence and approval services are authoritative.
5. Add integration tests proving the route-to-engine call path and its safety boundaries.
