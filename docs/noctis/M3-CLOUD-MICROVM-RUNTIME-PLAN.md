# Noctis M3 — Cloud MicroVM Runtime Integration Plan

**Selected deployment direction:** Cloud-hosted microVMs  
**Implementation status:** Provider-neutral adapter contract and unit tests added; no cloud provider or runtime is connected yet.  
**Branch:** `noctis/training-foundation`

## 1. Objective and safety boundary

M3 will move Noctis from an isolation-admission contract toward a real, independently isolated execution service for explicitly authorized workloads. The target is a cloud control plane that provisions or selects a trusted microVM runtime, launches one bounded workload, collects a signed runtime attestation, and confirms termination plus resource reclamation.

The current adapter is an integration seam only. It does not start a VM, create a container, invoke a cloud API, authenticate to a provider, or enforce kernel/hypervisor controls. Do not describe it as an operational sandbox.

Untrusted source code must not be sent to `noctis-wasm-runner.ts`, `new Function`, the application server process, or a shared worker process.

## 2. Current code delivered

- `src/lib/noctis-isolation-contract.ts`: validates the admission decision and binds the successful decision to provider, runtime, workload, tenant, digest, and actual resource ceilings.
- `src/lib/noctis-cloud-microvm-provider.ts`: provider-neutral adapter that delegates to an injected cloud control-plane client.
- `src/lib/noctis-cloud-microvm-provider.test.ts`: verifies admission binding, fixed isolation settings, runtime identity mismatch cleanup, and stop/reap failure behavior.

The adapter refuses to launch unless it receives a successful admission result that exactly matches the workload, tenant, digest, provider, runtime, and limits. It hard-codes network-disabled, ephemeral-only filesystem, and unprivileged execution in the control-plane request.

## 3. Target architecture

1. **Noctis workflow controller** — creates an authorized execution request and retains tenant, actor, trace, classification, and approval context.
2. **Admission gateway** — validates policy and provider-signed attestation using a trusted key registry. Admission must happen before workload submission.
3. **Cloud microVM adapter** — maps the Noctis execution contract to one provider's API. It has no generic URL fetch, shell, Docker socket, or ambient application credentials.
4. **Cloud control plane** — provisions/allocates a microVM from a signed immutable image and returns a provider execution ID.
5. **Isolated guest agent** — receives a short-lived, workload-scoped capability; verifies the workload digest; starts only the approved entry point; streams bounded output and lifecycle events.
6. **Runtime monitor** — enforces wall-clock, CPU, memory, PID, disk, and output quotas; monitors health and lease expiry.
7. **Termination and reaper** — terminates the VM, confirms stop, deletes ephemeral storage and credentials, and records cleanup outcome.
8. **Audit/evidence service** — stores append-only launch, attestation, output, timeout, stop, reap, and failure events.

## 4. Cloud runtime security requirements

- Prefer a dedicated microVM boundary for arbitrary untrusted workloads; do not treat a regular application container as equivalent isolation.
- No inbound access from the public internet. No egress by default. Any required egress must use a separately approved proxy with destination and protocol allowlists.
- Use a read-only, signed base image; ephemeral per-execution scratch storage; no host mounts; no shared writable cache between tenants.
- Run guest processes as non-root; drop unnecessary capabilities; apply seccomp and mandatory access controls where applicable.
- Enforce CPU, memory, PID, disk, wall-clock, output, and concurrency limits at the provider/host boundary, not only inside the guest.
- Use workload identity or short-lived scoped credentials for adapter-to-control-plane calls. No static cloud keys in source code, browser bundles, logs, or workload payloads.
- Sign runtime attestations and bind them to provider ID, runtime ID, image digest, workload digest, tenant, limits, isolation controls, and validity window. Verify signatures against a trusted, rotatable key registry.
- Pin runtime image digests; generate SBOM and build provenance; scan images before promotion; maintain revocation and rollback capability.
- Isolate tenant metadata, workspaces, keys, caches, logs, and object-storage prefixes. Authorize every read/write server-side.
- Treat guest output as untrusted input: enforce byte limits, schema validation, content classification, and provenance before it enters Noctis evidence or model context.
- Emit auditable lifecycle events with actor, tenant, workload digest, image digest, provider execution ID, timestamps, limits, trace ID, and cleanup status. Never log secrets.

## 5. Provider-specific implementation phases

### M3.1 — Provider selection and threat model
- Select cloud provider, region, microVM technology, image pipeline, control-plane API, key management, network boundary, and operational owner.
- Confirm whether the provider offers signed instance/runtime attestation suitable for binding image and workload identity.
- Document provider service limits, startup latency, availability zones, quotas, pricing, data residency, and incident response.
- Threat-model malicious code, guest escape, compromised guest agent, confused deputy, cross-tenant access, forged attestation, stale credentials, metadata-service abuse, egress bypass, resource exhaustion, and incomplete cleanup.

### M3.2 — Authenticated control-plane client
- Implement provider SDK/API calls behind `NoctisCloudMicrovmControlPlane`.
- Authenticate using workload identity; scope permissions to create/read/stop/delete only the required runtime resources.
- Validate every provider response and bind the execution to the admitted runtime identity.
- Use idempotency tokens for launch and cleanup; reconcile orphaned executions after worker or control-plane restarts.
- Add bounded retries only for idempotent provider operations, with backoff and a hard overall deadline.

### M3.3 — Image and guest bootstrap
- Build a minimal, signed guest image with immutable root filesystem and a narrow guest agent.
- Verify signed workload manifest and digest before execution.
- Do not allow arbitrary package installation, privileged helpers, shell access to host resources, or persistent guest state.
- Return structured, size-bounded output with execution metadata.

### M3.4 — Runtime monitor and cleanup
- Enforce provider-side resource ceilings and lease expiration.
- On timeout/cancel, stop the entire microVM/process group and revoke workload credentials.
- Delete scratch disks, snapshots, temporary object storage, and ephemeral keys.
- Report `processStopped` and `resourcesReaped` independently; incomplete cleanup must remain visible and block automatic reuse.
- Add orphan sweeper and reconciliation against provider inventory.

### M3.5 — Production hardening and rollout
- Run adversarial isolation tests in a dedicated non-production cloud account/project.
- Validate logging, alerting, incident runbooks, quotas, backup/restore boundaries, cost controls, and service-level objectives.
- Begin with analysis-only, low-risk workloads and a small tenant allowlist. Expand only after independent security review and explicit approval.

## 6. Required runtime security test matrix

1. Forged, expired, revoked, or wrong-key attestation is rejected.
2. Workload digest, tenant, runtime, image, or provider mismatch is rejected.
3. Provider response returning a different runtime ID triggers cleanup and a failed launch.
4. Infinite loop is terminated at wall-clock deadline.
5. CPU and memory exhaustion are contained to the microVM.
6. PID/fork exhaustion cannot impact host or neighboring tenants.
7. Filesystem traversal and host-path access fail.
8. Network egress, DNS, metadata-service access, and lateral access are blocked by default.
9. Cross-tenant filesystem, object-store, cache, and credential reads fail.
10. Output flooding is truncated/rejected without unbounded memory or storage use.
11. Cancellation terminates the guest and revokes credentials.
12. Provider outage and worker crash trigger reconciliation and orphan cleanup.
13. Stop failure and reap failure are separately observable; neither is reported as successful cleanup.
14. Duplicate launch and cleanup requests are idempotent.
15. Audit events cover every state transition without exposing secrets.
16. Key rotation and revocation work without accepting stale signatures.
17. Image signature, digest, SBOM, and provenance are checked before runtime admission.
18. Concurrent workload and per-tenant quotas are enforced at the provider boundary.

## 7. Production acceptance gates

- **Gate A — Contract:** current adapter tests, admission tests, typecheck, full CI, and build pass.
- **Gate B — Provider integration:** real provider API in a dedicated test account; workload identity; idempotency; signed attestation; provider response validation.
- **Gate C — Isolation:** adversarial test matrix passes with evidence from provider/host telemetry, not mocked booleans.
- **Gate D — Operations:** orphan reaper, dashboards, alerts, runbooks, quotas, cost controls, and incident ownership approved.
- **Gate E — Security approval:** independent review of hypervisor boundary, guest image, key management, tenant isolation, network controls, and evidence handling.

No production or customer workload may run until Gates B–E are independently validated. Unit tests and provider-supplied booleans alone are not proof of isolation.

## 8. Decisions still required

The deployment direction is cloud microVM, but the cloud vendor and concrete runtime are not yet selected. That choice affects attestation, region, identity, API semantics, quotas, networking, image lifecycle, and cost. Keep the adapter provider-neutral until the cloud provider, target region, and runtime service are confirmed.

## 9. Current status

**Delivered:** provider-neutral cloud microVM adapter interface, admission-bound launch contract, stop/reap behavior, and automated unit tests.  
**Not delivered:** cloud SDK client, provisioned microVMs, signed runtime attestation source, guest image, guest agent, provider-enforced quotas, network controls, orphan reaper, or production deployment.

This distinction is mandatory in product, engineering, and security status reporting.


## 10. Runtime audit event contract (implemented; sink not connected)

Added `src/lib/noctis-runtime-audit.ts` and focused tests. The contract standardizes lifecycle event identity, UTC timestamp, tenant/actor/request/correlation IDs, workload digest, provider/runtime/execution identity, outcome, and scalar structured details. The append helper validates the event, freezes the submitted envelope, and requires the sink to confirm durable persistence with a sequence identifier.

The sink is an injected append-only interface. No production database, tamper-evident ledger, retention policy, access-control policy, key/signature mechanism, or operational dashboard is connected. A frozen JavaScript object is not immutable storage, and a successful mocked sink test is not proof of durable audit integrity. Production acceptance still requires a real append-only store, collision/idempotency handling, tenant-scoped read access, tamper-evidence, retention/legal-hold controls, and failure-injection tests.


## 11. Lifecycle supervisor contract (implemented; infrastructure adapters remain external)

Added `src/lib/noctis-runtime-lifecycle.ts` with a deterministic lifecycle coordinator and tests. It verifies the successful admission is bound to the supplied tenant, workload and digest; requires pre-launch audit persistence; then requests launch, delegates completion observation to an injected monitor, and always attempts termination plus resource reaping after a confirmed launch. It distinguishes launch failure, execution failure, timeout/cancellation observations, audit blocking, and incomplete cleanup. A post-launch audit failure does not suppress cleanup.

The supervisor does not run guest code, implement cloud polling, enforce deadlines by itself, or provide durable storage. The monitor must enforce and report the provider-backed deadline and cancellation semantics. The provider adapter must be backed by an authenticated real cloud control plane. The audit sink must be a durable append-only implementation. If audit persistence fails after cleanup, the result is marked audit-incomplete while preserving the actual stop/reap booleans.

**Validation boundary:** current tests exercise injected fakes and state transitions only. They do not demonstrate real cloud launch, hypervisor isolation, runtime monitoring, termination, or durable audit integrity.


### 11.1 Provider identity mismatch cleanup hardening

The lifecycle supervisor now treats a returned execution ID with an unexpected runtime identity as a possible live resource: it attempts termination and reaping before returning. If either operation is unconfirmed, it returns a distinct `launch_cleanup_incomplete` result rather than hiding the orphan risk inside a generic launch failure. Tests cover both successful cleanup and unresolved cleanup. A provider call that throws after the cloud service accepted a launch but before returning its execution ID still requires provider-side idempotency and orphan reconciliation; the supervisor cannot clean up an identifier it never received.
