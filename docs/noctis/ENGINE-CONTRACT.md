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
- Claims use row-level locking with `SKIP LOCKED`; dependency checks are restricted to tasks in the same workflow.
- Evidence and approval fields are gating references only. They are not proof that evidence is authentic or that an approval is valid.
- Claim, attempt creation and audit-event insertion are one transaction.
- Completion requires a matching tenant, worker, lease token and unexpired lease.
- Expired attempts are marked `timed_out`; tasks are retried only while `attempt_count < max_attempts`, otherwise they fail.
- Retry timestamps, identifiers and event correlation values are explicit inputs.
- This adapter is not wired to routes, schedulers or workers and does not execute specialist engines.

Before runtime enablement, add authoritative approval/evidence resolution, idempotent workflow creation, database row-level security, stale-lease operational scheduling, concurrency/load tests, audit retention and authenticated integration tests.
