# Noctis Phase A — Learning Pipeline Integration Gap Register

**Branch:** noctis/phase-a-learning-integration  
**Baseline:** noctis/training-foundation at 5916b0dc708b693446ab25722a9fd059c2650564  
**Scope:** Repository audit plus a first code change for atomic source registration. No database or model changes.

## Executive finding

The training-governance foundation is materially stronger, but the canonical governed repository is not yet the sole application write path. The next work must integrate source registration, review authorization, candidate submission, and dataset approval with authenticated server handlers before any training export or provider job is considered.

## Verified integration gaps

### A1. Legacy training endpoint remains active

src/routes/api/noctis.ts still handles body.train by calling trainPair(...) from src/lib/noctis-train.server.ts. It does not call submitNoctisTrainingExample(...) from src/lib/noctis-training-data-persistence.server.ts.

**Risk:** A legacy write path can continue to create records outside the canonical tenant-scoped, source-bound submission contract. The new repository therefore cannot yet be treated as the authoritative learning pipeline.

**Required change:** Replace or explicitly deprecate the legacy write path. Route submissions through an authenticated server composition layer that derives tenant and actor identity from the verified session, not request-body fields. Preserve a compatibility response only if it does not bypass quarantine and audit.

### A2. Source ingestion atomicity — implementation committed; verification pending

`src/lib/noctis-source-ingestion.server.ts` now inserts the source row, every chunk, and the audit event inside one `getSql().transaction(...)`. Any insertion or audit failure rolls the complete transaction back. The unique `(content_hash, domain)` index arbitrates concurrent duplicate submissions; a losing submission reads and returns the winning source without creating chunks or a second audit event. The submitter ID is normalized and required before persistence.

**Remaining verification:** Add/execute focused database tests for rollback on chunk/audit failure, concurrent duplicate submissions, and replay behavior on both supported database backends. No such tests have yet been run for this commit.

### A3. Source registration and review lack tenant-scoped persistence

Migration 0014_noctis_learning_governance.sql defines noctis_learning_source and related source chunks without tenant ownership columns. The later 0016_noctis_training_data_pipeline.sql adds tenant_id to vibe_training_pair, but does not add tenant ownership to the source registry or source chunks.

**Risk:** The candidate repository is tenant-scoped while the source lifecycle is not consistently tenant-scoped. This weakens isolation and makes cross-tenant source authorization difficult to prove.

**Required change:** Design an additive migration for source tenant ownership and tenant-aware uniqueness/foreign-key constraints. Backfill legacy records to a controlled system tenant only after an explicit data review; do not silently assign ownership. Add tenant filters to source listing, review, retrieval, and candidate binding.

### A4. Reviewer identity is passed as a function argument

reviewNoctisSource(...) accepts reviewerId from its caller. The function itself does not verify the reviewer's role, active MFA, tenant membership, or authorization.

**Risk:** A caller-supplied identifier is not proof of reviewer authorization.

**Required change:** Add an authenticated server handler that derives actor and tenant from server-side identity, checks owner/domain-reviewer role and MFA policy, then passes trusted context into a transaction-backed repository. Keep authorization outside the pure persistence adapter, but make bypassing the authorized composition path impossible from public routes.

### A5. Dataset approval checks current source state but needs revocation policy

Dataset snapshot creation and approval check that examples are approved and source hashes/licenses still match. The readiness audit also identifies missing post-approval source revocation/supersession behavior.

**Risk:** A source withdrawn after dataset approval could remain eligible for later training export or provider-job submission unless downstream consumers revalidate source state.

**Required change:** Add source revocation/supersession states and an explicit policy for already-approved snapshots. Before export and again before training-job submission, revalidate all snapshot members against current source status, hash, license, jurisdiction, and tenant. Record a blocked/revoked outcome rather than silently rewriting immutable snapshots.

### A6. Database tenant setting is not authentication

The training repository sets app.tenant_id transaction-locally. Its own design notes correctly state that the application must supply trusted tenant and actor context and production must enforce RLS using restricted roles.

**Risk:** A transaction-local setting supplied by application code does not independently authenticate a tenant.

**Required change:** Verify authenticated composition-root derivation, database role grants, RLS policies, connection-pool behavior, and cross-tenant negative tests before production use.

## Required Phase A implementation order

1. [In progress] Add source tenant ownership and migration/backfill policy.
2. [Partially complete] Source registration is transaction-backed; review/revoke still need tenant-aware repository methods.
3. Add authenticated source and reviewer server handlers with role/MFA checks.
4. Route all candidate submissions through the canonical governed repository; close legacy bypasses.
5. Add dataset export eligibility checks and post-approval source revocation handling.
6. Add integration tests covering tenant isolation, unauthorized reviewers, audit rollback, duplicate source replay, failed persistence, source revocation, and legacy endpoint bypass.
7. Run typecheck, focused tests, full tests, and build; report only commands actually executed and their results.

## Acceptance criteria

- No public or internal API can create an active training example through the legacy trainPair path.
- Source, chunks, and audit commit atomically or not at all.
- Source reads and writes are tenant-scoped.
- Reviewer and approver identity comes from authenticated server context and is role-authorized.
- Duplicate source submissions are idempotent under concurrency.
- Revoked or superseded sources cannot enter a new export or training run.
- Dataset snapshots remain immutable; revocation is represented by a separate audited state/event.
- Cross-tenant and unauthenticated tests fail closed.
- No model training is claimed until a real provider job and artifact lineage are recorded.

## Safety boundary

This branch contains this gap register only. No production database was accessed, no migration was applied, no model provider was called, no training job was started, and no branch was merged or deployed.
