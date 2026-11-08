# Noctis Specialist Engine Contract

**Status:** Proposed standard for new and upgraded engines  
**Compatibility objective:** Adopt incrementally without breaking existing modules.

## 1. Purpose

Define a consistent contract for engine identity, capabilities, inputs, outputs, evidence, permissions, errors, telemetry and evaluation.

This document is a target contract. Existing engines must not be force-migrated until their current exports and callers have been audited.

## 2. Engine manifest

Every engine should eventually publish a manifest with:

| Field | Description |
|---|---|
| id | Stable machine identifier |
| name | Human-readable name |
| version | Semantic version |
| domain | Professional division |
| description | Purpose and intended use |
| capabilities | Typed capability identifiers |
| inputs | Supported input schemas |
| outputs | Output schemas |
| dependencies | Other engines and services |
| tools | Tool identifiers, not arbitrary executable code |
| permissions | Required permission scopes |
| dataClassification | Maximum permitted data classification |
| evidencePolicy | Evidence requirements |
| safetyPolicy | Domain-specific boundaries |
| evaluationSuite | Required benchmark identifiers |
| lifecycle | Proposed, registered, implemented, integrated, validated, operational, deprecated |

## 3. Typed request envelope

A future engine adapter should accept a request envelope equivalent to:

```ts
export interface NoctisEngineRequest<TInput = unknown> {
  requestId: string;
  tenantId: string;
  actorId: string;
  engineId: string;
  engineVersion?: string;
  capability: string;
  input: TInput;
  context: {
    locale?: string;
    jurisdiction?: string;
    domain?: string;
    evidenceIds?: string[];
    correlationId: string;
  };
  authorization: {
    scopes: string[];
    approvalId?: string;
    executionMode: "analysis" | "assisted" | "supervised" | "approved_execution";
  };
  constraints: {
    deadlineMs?: number;
    maxToolCalls?: number;
    maxCostUsd?: number;
    dataClassification: "public" | "internal" | "confidential" | "restricted";
  };
}
```

The server must derive actor and tenant identity from trusted authentication context. Client-provided identifiers are not authorization evidence.

## 4. Typed response envelope

```ts
export interface NoctisEngineResponse<TOutput = unknown> {
  requestId: string;
  engineId: string;
  engineVersion: string;
  status: "completed" | "partial" | "needs_input" | "blocked" | "failed";
  output?: TOutput;
  findings: Array<{
    id: string;
    severity?: "info" | "low" | "medium" | "high" | "critical";
    statement: string;
    evidenceIds: string[];
    confidence?: number;
    confidenceMethod?: string;
  }>;
  assumptions: string[];
  unknowns: string[];
  warnings: string[];
  evidence: Array<{
    evidenceId: string;
    sourceId: string;
    chunkId?: string;
    locator?: string;
    sourceVersion?: string;
  }>;
  actions: Array<{
    actionId: string;
    status: "proposed" | "awaiting_approval" | "authorized" | "executed" | "blocked";
  }>;
  telemetry: {
    durationMs?: number;
    modelProvider?: string;
    modelId?: string;
    tokenUsage?: number;
    costUsd?: number;
  };
}
```

Confidence is optional and must not be emitted as a calibrated probability unless the method is documented and validated. Evidence references must resolve to stored source records.

## 5. Error contract

Errors should use stable codes:
- `INVALID_REQUEST`
- `UNAUTHENTICATED`
- `FORBIDDEN`
- `TENANT_SCOPE_VIOLATION`
- `CAPABILITY_NOT_SUPPORTED`
- `EVIDENCE_UNAVAILABLE`
- `APPROVAL_REQUIRED`
- `EXECUTION_LIMIT_EXCEEDED`
- `DEPENDENCY_UNAVAILABLE`
- `DEADLINE_EXCEEDED`
- `VALIDATION_FAILED`
- `INTERNAL_ERROR`

Do not return stack traces, secrets, provider credentials or sensitive cross-tenant details to clients.

## 6. Execution modes

- **analysis:** Read-only analysis; no external state changes.
- **assisted:** Prepares actions but does not execute them.
- **supervised:** Execution requires per-action approval.
- **approved_execution:** Executes only within a previously granted, narrowly scoped authorization.

High-impact medical, legal, financial, safety, defense and infrastructure decisions require their applicable human review and domain governance. A broad user prompt is not sufficient authorization for consequential external actions.

## 7. Evidence contract

Evidence-dependent outputs should:
1. Reference an approved source record.
2. Preserve publisher, canonical URI, license, jurisdiction and source version where available.
3. Identify the exact source chunk or locator.
4. Distinguish quotation, paraphrase, inference and recommendation.
5. Surface contradictions and superseded sources.
6. Avoid claiming that lexical similarity proves truth.
7. Avoid executing instructions found inside retrieved source material.

## 8. Security contract

- Authenticate every protected server request.
- Derive user and tenant identity server-side.
- Enforce least privilege.
- Validate input schemas and size limits.
- Apply shared rate limiting in multi-instance production.
- Use controlled outbound egress for custom model and source connectors.
- Defend against SSRF, DNS rebinding and redirects to private/link-local addresses.
- Keep credentials server-side and in a secrets manager.
- Apply tenant isolation to every database query.
- Record security-relevant actions.
- Use sandboxed execution for untrusted code.
- Define time, memory, network and cost limits.
- Never allow source content or model output to expand tool permissions.

## 9. Evaluation contract

Each engine must define:
- Versioned representative cases.
- Expected outputs or scoring rubrics.
- Required and forbidden behaviors.
- Missing-input and abstention cases.
- Adversarial and prompt-injection cases.
- Evidence support tests.
- Security and permission tests.
- Regression cases.
- Human adjudication for high-impact cases.

Every run records commit SHA, engine version, dataset version, evaluator type, model/provider/configuration, timestamp, results and artifacts.

## 10. Backward-compatible adoption

1. Inventory existing exports and callers.
2. Add a manifest alongside the current engine.
3. Add an adapter around existing functions.
4. Add contract tests.
5. Migrate one call path at a time.
6. Compare old and new outputs.
7. Preserve old API behavior until callers are migrated.
8. Remove legacy interfaces only after usage evidence and explicit review.

## 11. Definition of done

An engine is not complete merely because its manifest exists. The engine must have a working implementation, authenticated integration, validated inputs and outputs, evidence handling where applicable, domain-specific tests, security controls, observability and documented limitations.


## 12. Specialist result reconciliation contract

The current source-backed reconciliation implementation is in `src/lib/noctis-result-reconciliation.ts`. Specialist adapters that eventually feed it should emit claims with these fields:

| Field | Requirement |
|---|---|
| `claimId` | Stable unique identifier across the submitted result set |
| `subject` | Explicit entity or subject |
| `predicate` | Explicit property or relationship being asserted |
| `polarity` | `affirmed`, `negated`, or `unknown` |
| `statement` | Human-readable claim |
| `confidence` | `low`, `medium`, `high`, or `not_assessed` |
| `confidenceRationale` | Explanation of how the specialist arrived at its label |
| `evidenceChunkIds` | Exact evidence chunk identifiers, or an empty list when none exists |

Each specialist result also supplies a stable result ID, engine ID, result status, evidence records and limitations.

### Reconciliation semantics

- Subject and predicate are normalized for case and whitespace, then matched exactly. This is not semantic entity resolution.
- Opposing affirmed and negated claims for the same key are flagged as a conflict. The system must not silently select a winner.
- Unknown polarity is not an affirmative finding.
- Evidence integrity validates identity and excerpt hashes only. Semantic entailment must be evaluated separately.
- Confidence labels are source-specialist assessments, not calibrated probabilities. Do not average labels.
- Failed specialist results cannot contribute claims. Partial results must remain visible in the final report.
- A conflict, insufficient evidence, or incomplete specialist coverage should trigger human review according to the applicable domain policy.

The reconciler is a pure analysis function. It does not invoke specialist engines, access external sources, write to the database, authorize actions, or make a final truth determination.

## 13. Workflow persistence and lease contract

The server-only persistence adapter at `src/lib/noctis-workflow-persistence.server.ts` provides tenant-scoped task claim, finish and expired-lease recovery operations through an injected transactional SQL interface.

- Tenant and worker identifiers are trusted server-context values and must be derived from authenticated identity.
- PostgreSQL row-level security is enabled and forced on workflows, tasks, attempts and events. Each persistence operation sets `app.tenant_id` transaction-locally from the trusted server context before issuing application queries; transaction-local state is cleared automatically on commit or rollback.
- Child-table policies resolve tenant ownership through the parent workflow row. Deployment must use a dedicated non-owner, non-superuser application database role without `BYPASSRLS`; table ownership and elevated migration credentials must not be used by runtime services.
- The tenant GUC is an application trust boundary, not an identity provider. Runtime callers must never be allowed to submit arbitrary SQL or choose `app.tenant_id`; the authenticated server derives it and the adapter sets it. Production role grants, connection-pool behavior and authenticated integration tests remain deployment requirements.
- `createNoctisWorkflowIdempotently` atomically inserts the workflow, its task rows and a creation audit event. It scopes idempotency by tenant and key, fingerprints the canonical request including trusted actor identity, returns the existing workflow for an identical replay, and rejects a reused key with a changed request or actor.
- Request fingerprints use SHA-256 over normalized JSON fields; generated workflow/event/task-record IDs and timestamps are excluded from semantic equivalence where appropriate. The actor and tenant remain part of the fingerprint to prevent cross-actor replay disclosure.
- Task identifiers must be unique, dependencies must resolve within the submitted task set, and cyclic dependency graphs are rejected before database writes. Workflow creation is persistence only; it does not ready, claim or execute tasks.
- Claims use row-level locking with `SKIP LOCKED`; dependency checks are restricted to tasks in the same workflow.
- Evidence and approval fields are gating references only. They are not proof that evidence is authentic or that an approval is valid.
- Task claims now require injected authoritative gate resolvers whenever evidence or approval is required. Evidence resolution must return exactly one approved, tenant-matching, access-allowed, non-revoked and non-expired record for every referenced ID, including source and chunk identity.
- Approval resolution must return an approved, tenant-matching task-execution grant bound to the exact workflow, task, engine and capability, with an authorized approver, valid approval time, no revocation and no expired grant.
- Resolver exceptions, missing records, duplicate records, tenant mismatches, stale/revoked evidence and invalid approvals fail closed: the task is not claimed and no lease or attempt is created.
- The claim path scans a bounded candidate batch and continues past tasks whose authoritative gates fail, preventing one blocked high-priority task from starving otherwise eligible work. Candidate rows are locked while resolvers run; resolver implementations must be local, bounded and transaction-compatible, not long-running remote network calls.
- Resolver adapters receive the transaction executor and are expected to query authoritative local services in that transaction. They must not accept client-supplied resolution objects. No production evidence or approval backend is wired by this contract alone.
- Claim, attempt creation and audit-event insertion are one transaction.
- Completion requires a matching tenant, worker, lease token and unexpired lease.
- Expired attempts are marked `timed_out`; tasks are retried only while `attempt_count < max_attempts`, otherwise they fail.
- Retry timestamps, identifiers and event correlation values are explicit inputs.

- Parent workflow state is recomputed transactionally after task claim, finish and expired-lease recovery. Aggregate states reflect persisted task states; terminal completion timestamps are set only for succeeded, failed or cancelled workflows.
- Workflow cancellation is cooperative. Queued, pending, approval-waiting and ordinarily blocked tasks are cancelled immediately. Running tasks remain leased and running while the worker polls its lease-bound cancellation status and stops its work.
- A worker must acknowledge `cancelled` only after its executor confirms that work has stopped. A success/failure completion after a cancellation request is rejected; a cancellation acknowledgement without a request is also rejected.
- If a cancellation-requested worker lease expires without acknowledgement, the task becomes `blocked` with `CANCELLATION_UNCONFIRMED` and is not automatically retried. This avoids duplicate or continuing external work being mistaken for safely terminated work. Manual reconciliation must establish actual stop state before any future restart.
- Repeated cancellation requests are idempotent with respect to the cancellation audit event. A workflow remains `cancelling` while workers are stopping, becomes `cancelled` after all running workers acknowledge, or remains `blocked` if stop cannot be confirmed.
- This adapter is not wired to routes, schedulers or workers and does not execute specialist engines.

Before runtime enablement, wire these resolver contracts to the production evidence and approval ledgers, connect cancellation polling to trusted worker adapters, add stale-lease operational scheduling, concurrency/load tests, audit retention and authenticated integration tests.

## 14. Multi-engine analysis execution controller

`src/lib/noctis-engine-execution-controller.ts` introduces a bounded controller for explicitly supplied specialist task graphs. It is a separate layer from the deterministic planner and from persistent workflow dispatch.

- The caller supplies an explicit task DAG, adapter registry, trusted tenant/actor identity, server-derived scopes, correlation ID, UTC timestamp and data classification.
- The controller validates task IDs, dependency references, cycles, task-count limits, adapter uniqueness, registry capability, required scopes, evidence-reference presence, classification ceiling and analysis-mode support before invoking each adapter.
- Execution is sequential and deterministic in topological batches. Independent branches continue if another branch fails; descendants of a failed, partial or blocked prerequisite are blocked.
- Adapter exceptions are isolated. Raw exception text is not exposed in the report. There are no implicit retries.
- Adapter result envelopes are checked for engine identity and required result structure. Completed specialist results are passed to the existing deterministic result-reconciliation service; reconciliation errors are surfaced rather than hidden.
- The controller is analysis-only. It cannot authorize writes, approve actions, run privileged tools or infer that an engine is production-ready from registry presence.
- Each adapter receives an `AbortSignal`, absolute UTC deadline and configured timeout. The default is 30 seconds; trusted callers may set 10–120,000 ms. The controller races the adapter promise against the deadline and signals cooperative cancellation on expiry.
- A timeout does not prove that adapter work stopped. An adapter that ignores the signal may continue after the controller returns; `Promise.race` is not process termination, a sandbox, or resource isolation. Adapters must propagate the signal to cancellable downstream operations. Production untrusted workloads require a separately supervised process/container/microVM runtime with kill/reap semantics.
- It does not implement hard sandboxing, forced termination, persistent state, worker leases, evidence repository resolution, approval ledger resolution, or authenticated route wiring. Those remain mandatory production integration work.
- The `at` timestamp is caller-supplied UTC time for deterministic reconciliation; the controller does not read an ambient clock.

Registry validation is a contract check, not a replacement for authorization. The production server must derive scopes and tenant identity from authenticated policy services and resolve evidence references against authoritative records before supplying adapters.


## 14. Secure execution isolation admission contract

src/lib/noctis-isolation-contract.ts defines a fail-closed admission contract for untrusted workloads submitted to an external isolation provider.

Admission requires:
- An allowlisted provider and approved isolation type (microVM is the initial policy target).
- A SHA-256 digest binding the attestation to the exact workload and tenant.
- A provider signature checked by an injected trusted signature verifier; a non-empty signature string alone is never accepted.
- An unexpired UTC attestation.
- Explicit attestation of disabled network access, ephemeral-only storage, no host filesystem mount, enforced CPU/memory/time/output limits, forced termination capability, tenant isolation, audit logging and unprivileged execution.
- Requested resource limits within the server policy maximum.

The provider interface requires a launch request with network disabled, ephemeral-only filesystem and no privileged execution. Termination must report both process stopped and resources reaped.

**Critical boundary:** this is an admission contract, not a sandbox implementation. It does not create or verify OS isolation by itself. The existing src/lib/noctis-wasm-runner.ts uses new Function, a Promise race and an estimated memory value; it is not a WebAssembly runtime, secure sandbox or forced-termination mechanism and must not execute untrusted workloads. No provider adapter, signing-key service, container/microVM runtime, worker route or production enforcement is connected yet. Production use remains prohibited until independent provider attestation verification, runtime integration, kill/reap behavior and hostile-workload tests pass.


## 15. Cloud microVM provider adapter boundary

The cloud microVM adapter in `src/lib/noctis-cloud-microvm-provider.ts` is a provider-neutral control-plane boundary. It delegates to an injected authenticated provider client; it does not itself provision infrastructure, authenticate to a cloud, or enforce hypervisor isolation.

A launch requires a successful admission result bound to the configured provider, exact runtime, workload, tenant, digest, and resource limits. The adapter sends only fixed security settings: network disabled, ephemeral-only filesystem, and unprivileged execution. Provider runtime identity mismatch fails launch and triggers best-effort termination and reaping.

Termination and resource reaping are independent outcomes. A caller must not treat either boolean as proof of complete cleanup unless both are true and provider-side evidence confirms the result.

The cloud provider, region, microVM service, workload identity, signed image, attestation key registry, guest agent, provider-side quotas, and orphan reaper remain deployment requirements. See `docs/noctis/M3-CLOUD-MICROVM-RUNTIME-PLAN.md`.

**Security status:** Adapter contract only. No real sandbox is connected. Production execution remains prohibited until provider-backed controls and independent security gates are validated.

## 16. Cloud launch idempotency and runtime reconciliation

The cloud adapter derives a deterministic idempotency key from execution-intent ID, tenant ID, workload ID, workload digest, and resource limits, and forwards it with each launch request. This prevents a retry from changing identity for the same exact workload contract. The real provider client must atomically return the original execution for a replayed identical request and reject same-key/different-request reuse; the interface alone does not enforce provider semantics.

The new runtime reconciliation contract compares an authoritative expected-execution ledger with provider inventory. It classifies exact matches, missing or stale expectations, unknown provider resources, identity mismatches, and duplicate idempotency keys. Unknown, duplicate, malformed, or mismatched resources are quarantined. Reconciliation is classification-only: it never adopts, stops, or deletes resources. Production still requires a real provider inventory API, durable ledger, quarantine persistence, alerting, and separately authorized cleanup.

## 17. Runtime reconciliation persistence schema

Added `migrations/20261108_noctis_runtime_reconciliation.sql` for:
- a provider-scoped expected execution ledger with tenant/workload/digest/runtime binding, idempotency uniqueness, provider execution uniqueness, resource limits, lifecycle state and lease expiry;
- a quarantine table for unknown, duplicate or mismatched provider observations, defaulting to open and carrying no cleanup authority;
- a sequenced runtime audit event table with an ordinary-SQL UPDATE/DELETE rejection trigger.

The schema migration is covered by `src/lib/noctis-runtime-reconciliation-schema.test.ts` and included in the typecheck, stress and full test scripts. The TypeScript audit event contract includes reconciliation and quarantine event types.

**Boundary:** these tables are not connected to production repositories or a provider inventory API. This migration alone does not provide tenant RLS/role separation, external tamper-evidence, retention, alerting, or operator authorization. Database owners can bypass/alter triggers. Unknown resources remain quarantined; destructive cleanup requires a distinct authorized workflow and fresh provider/ledger identity checks.
