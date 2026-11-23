/**
 * Capability #9 — Noctis Digital Evidence Chain of Custody
 *
 * Preserves cryptographic provenance, custodial transfers, and tamper detection
 * across assessment evidence, incident forensics (NIST SP 800-86), and clinical/RMF artifacts.
 */

import { sha256Sync } from "../universal-crypto.ts";
import { appendCustodyEvent, listCustodyEvents } from "./persistence.server.ts";
import type { CustodyEventRecord } from "./types.ts";

export async function sealCustodyArtifact(input: {
  artifactId?: string;
  artifactType: string;
  payload: unknown;
  custodianId: string;
  custodianRole: string;
  tenantId?: string;
  notes?: string;
}): Promise<CustodyEventRecord> {
  const serialized = typeof input.payload === "string" ? input.payload : JSON.stringify(input.payload ?? {});
  const artifactSha256 = sha256Sync(serialized);
  const artifactId = input.artifactId?.trim() || `CUST-${artifactSha256.slice(0, 10).toUpperCase()}`;

  return appendCustodyEvent({
    artifactId,
    artifactType: input.artifactType || "FORENSIC_EVIDENCE",
    custodyState: "COLLECTED_SEALED",
    custodianId: input.custodianId || "system-collector",
    custodianRole: input.custodianRole || "ISSO",
    tenantId: input.tenantId || "tenant:public-sandbox",
    artifactSha256,
    notes: input.notes || "Initial SHA-256 intake & cryptographic sealing.",
  });
}

export async function transferCustodyArtifact(input: {
  artifactId: string;
  artifactType?: string;
  custodyState: "IN_REVIEW" | "VERIFIED_BY_SCA" | "ARCHIVED" | "QUARANTINED";
  custodianId: string;
  custodianRole: string;
  tenantId?: string;
  artifactSha256: string;
  notes: string;
}): Promise<CustodyEventRecord> {
  return appendCustodyEvent({
    artifactId: input.artifactId,
    artifactType: input.artifactType || "FORENSIC_EVIDENCE",
    custodyState: input.custodyState,
    custodianId: input.custodianId,
    custodianRole: input.custodianRole,
    tenantId: input.tenantId || "tenant:public-sandbox",
    artifactSha256: input.artifactSha256,
    notes: input.notes,
  });
}

export function verifyCustodyEventsList(events: CustodyEventRecord[], candidatePayload?: unknown): {
  artifactId: string;
  eventsCount: number;
  chainIntact: boolean;
  payloadHashMatches: boolean | null;
  brokenAtSeq: number | null;
  latestState: string | null;
  reason: string;
} {
  if (!events.length) {
    return {
      artifactId: "",
      eventsCount: 0,
      chainIntact: false,
      payloadHashMatches: null,
      brokenAtSeq: null,
      latestState: null,
      reason: "No custody events found for artifact.",
    };
  }

  let expectedPrev = "GENESIS_CUSTODY";
  for (const ev of events) {
    if (ev.prevHash !== expectedPrev) {
      return {
        artifactId: ev.artifactId,
        eventsCount: events.length,
        chainIntact: false,
        payloadHashMatches: null,
        brokenAtSeq: ev.seq,
        latestState: events[events.length - 1]!.custodyState,
        reason: `Broken custody prevHash linkage at seq=${ev.seq}.`,
      };
    }
    const recomputed = sha256Sync(
      JSON.stringify({
        prevHash: ev.prevHash,
        artifactId: ev.artifactId,
        artifactType: ev.artifactType,
        custodyState: ev.custodyState,
        custodianId: ev.custodianId,
        custodianRole: ev.custodianRole,
        tenantId: ev.tenantId,
        artifactSha256: ev.artifactSha256,
        notes: ev.notes,
      }),
    );
    if (recomputed !== ev.entryHash) {
      return {
        artifactId: ev.artifactId,
        eventsCount: events.length,
        chainIntact: false,
        payloadHashMatches: null,
        brokenAtSeq: ev.seq,
        latestState: events[events.length - 1]!.custodyState,
        reason: `Tampered custody entry hash detected at seq=${ev.seq}.`,
      };
    }
    expectedPrev = ev.entryHash;
  }

  const latest = events[events.length - 1]!;
  let payloadHashMatches: boolean | null = null;
  if (candidatePayload !== undefined) {
    const serialized = typeof candidatePayload === "string" ? candidatePayload : JSON.stringify(candidatePayload ?? {});
    payloadHashMatches = sha256Sync(serialized) === latest.artifactSha256;
  }

  const intact = payloadHashMatches === null ? true : payloadHashMatches;
  return {
    artifactId: latest.artifactId,
    eventsCount: events.length,
    chainIntact: intact,
    payloadHashMatches,
    brokenAtSeq: null,
    latestState: latest.custodyState,
    reason: intact
      ? `All ${events.length} custody link(s) cryptographically verified under NIST SP 800-86 / FRE 901.`
      : "Payload SHA-256 diverges from sealed custody digest (artifact modified post-collection).",
  };
}

export async function verifyArtifactCustodyChain(artifactId: string, candidatePayload?: unknown) {
  const events = await listCustodyEvents(artifactId);
  return {
    ...verifyCustodyEventsList(events, candidatePayload),
    events,
  };
}
