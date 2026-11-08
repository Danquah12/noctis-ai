/**
 * Noctis cloud-runtime audit event contract.
 *
 * This defines the minimum structured event envelope and an append-only sink
 * boundary. It does not implement durable storage, immutability, signatures,
 * retention, or access control; production must supply and independently
 * validate those properties.
 */

export type NoctisRuntimeAuditEventType =
  | "admission_accepted"
  | "launch_requested"
  | "launch_succeeded"
  | "launch_failed"
  | "termination_requested"
  | "termination_completed"
  | "cleanup_incomplete"
  | "inventory_reconciled"
  | "resource_quarantined"
  | "cleanup_candidate_created"
  | "cleanup_authorized";

export type NoctisRuntimeAuditEvent = {
  schemaVersion: 1;
  eventId: string;
  eventType: NoctisRuntimeAuditEventType;
  occurredAt: string;
  requestId: string;
  correlationId: string;
  tenantId: string;
  actorId: string;
  workloadId: string;
  workloadDigest: string;
  providerId: string;
  runtimeId?: string;
  executionId?: string;
  outcome: "accepted" | "requested" | "succeeded" | "failed" | "incomplete" | "observed";
  details: Readonly<Record<string, string | number | boolean | null>>;
};

export interface NoctisAppendOnlyRuntimeAuditSink {
  /**
   * Implementations must durably append, reject eventId collisions with
   * different payloads, and never expose update/delete operations.
   */
  append(event: NoctisRuntimeAuditEvent): Promise<{ persisted: true; sequence: string }>;
}

export function validateNoctisRuntimeAuditEvent(
  event: NoctisRuntimeAuditEvent,
): { ok: true } | { ok: false; reason: string } {
  const required = [
    event.eventId, event.requestId, event.correlationId, event.tenantId,
    event.actorId, event.workloadId, event.workloadDigest, event.providerId,
  ];
  if (event.schemaVersion !== 1 || required.some((value) => typeof value !== "string" || !value.trim())) {
    return { ok: false, reason: "Required audit identity fields are missing." };
  }
  if (!/^sha256:[a-f0-9]{64}$/i.test(event.workloadDigest)) {
    return { ok: false, reason: "Audit workload digest must be a SHA-256 digest." };
  }
  if (!Number.isFinite(Date.parse(event.occurredAt)) || !/^\d{4}-\d{2}-\d{2}T.*Z$/.test(event.occurredAt)) {
    return { ok: false, reason: "Audit timestamp must be a valid UTC ISO-8601 timestamp." };
  }
  if (!event.eventType || !event.outcome || !event.details || typeof event.details !== "object" || Array.isArray(event.details)) {
    return { ok: false, reason: "Audit event type, outcome and details are required." };
  }
  if (Object.entries(event.details).some(([key, value]) =>
    !key.trim() || !(value === null || ["string", "number", "boolean"].includes(typeof value)) ||
    (typeof value === "number" && !Number.isFinite(value)))) {
    return { ok: false, reason: "Audit details must contain finite scalar values only." };
  }
  return { ok: true };
}

export async function appendNoctisRuntimeAuditEvent(
  sink: NoctisAppendOnlyRuntimeAuditSink,
  event: NoctisRuntimeAuditEvent,
): Promise<{ persisted: true; sequence: string }> {
  const validation = validateNoctisRuntimeAuditEvent(event);
  if (!validation.ok) throw new Error(`Runtime audit event rejected: ${validation.reason}`);
  if (!sink || typeof sink.append !== "function") {
    throw new Error("A durable append-only runtime audit sink is required.");
  }
  const result = await sink.append(Object.freeze({
    ...event,
    details: Object.freeze({ ...event.details }),
  }));
  if (result?.persisted !== true || typeof result.sequence !== "string" || !result.sequence.trim()) {
    throw new Error("Runtime audit sink did not confirm durable persistence.");
  }
  return result;
}
