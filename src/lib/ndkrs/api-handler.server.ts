/**
 * NDKRS Enterprise REST API Dispatcher (`/api/v2/ndkrs/*`, Server-Side)
 */

import { storeEncryptedClinicalEnclaveRecord } from "./enclave-crypto.server.ts";
import { validateCrossDomainFactLock, verifyCertificateSignature } from "./fact-lock-validator.server.ts";
import { decideReviewItem, listReviewQueue, scanStaleKnowledgeRecords } from "./governance.server.ts";
import { hybridSearchNdkrs } from "./hybrid-retrieval.server.ts";
import { ingestKnowledgeDocument } from "./ingestion.server.ts";
import {
  checkDistributedRateLimit,
  ensureNdkrsSchema,
  getNdkrsStatusSummary,
  listDeterministicRules,
  listKnowledgeGaps,
  listValidationCertificates,
} from "./persistence.server.ts";
import { routeNdkrsQuery } from "./router.server.ts";
import { evaluateDeterministicRule, NDKRS_RULE_CATALOG } from "./rules-engine.server.ts";
import type { NdkrsDomain, TrustTier, ValidationCertificateRecord } from "./types.ts";

const CORS_HEADERS = {
  "cache-control": "no-store",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "Content-Type, Authorization, X-Noctis-Key",
};

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: CORS_HEADERS });
}

export async function handleNdkrsV2Request(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const caller = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const rl = await checkDistributedRateLimit(`ndkrs:${caller}`, 120, 60_000);
    if (!rl.allowed) {
      return json({ error: "RATE_LIMIT_EXCEEDED", rateLimitBackend: rl.backend }, 429);
    }

    const url = new URL(request.url);
    const subPath = url.pathname.replace(/^\/api\/v2\/ndkrs\/?/, "").replace(/\/+$/, "");
    await ensureNdkrsSchema();

    if (request.method === "GET") {
      if (!subPath || subPath === "status") {
        const status = await getNdkrsStatusSummary();
        return json({ ...status, rateLimitBackend: rl.backend });
      }
      if (subPath === "review-queue") {
        const filterStatus = url.searchParams.get("status") as
          | "PENDING_REVIEW"
          | "APPROVED"
          | "REJECTED"
          | null;
        const items = await listReviewQueue(filterStatus || undefined);
        return json({ count: items.length, items });
      }
      if (subPath === "rules") {
        const domain = url.searchParams.get("domain") as NdkrsDomain | null;
        const dbRules = await listDeterministicRules(domain || undefined);
        return json({
          count: dbRules.length > 0 ? dbRules.length : NDKRS_RULE_CATALOG.length,
          rules: dbRules.length > 0 ? dbRules : NDKRS_RULE_CATALOG,
        });
      }
      if (subPath === "certificates") {
        const limit = Number(url.searchParams.get("limit") || 25);
        const certificates = await listValidationCertificates(Number.isFinite(limit) ? limit : 25);
        return json({ count: certificates.length, certificates });
      }
      if (subPath === "gaps") {
        const limit = Number(url.searchParams.get("limit") || 25);
        const gaps = await listKnowledgeGaps(Number.isFinite(limit) ? limit : 25);
        return json({ count: gaps.length, gaps });
      }
      if (subPath === "staleness") {
        const days = Number(url.searchParams.get("warningDays") || 30);
        const report = await scanStaleKnowledgeRecords(Number.isFinite(days) ? days : 30);
        return json(report);
      }
      if (subPath === "enclave/status") {
        const status = await getNdkrsStatusSummary();
        return json({
          encryptionCipher: "AES-256-GCM",
          keyMode: process.env.NOCTIS_ENCLAVE_KEY ? "prod-enclave-v1" : "dev-enclave-fallback-v1",
          isolatedTable: "ndkrs.clinical_enclave_records",
          recordCount: status.counts.encryptedClinicalEnclaveRecords,
        });
      }
      return json({ error: `Unknown NDKRS GET endpoint: /api/v2/ndkrs/${subPath}` }, 404);
    }

    if (request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

      if (subPath === "search") {
        const query = String(body.query || "").trim();
        if (!query) return json({ error: "query is required" }, 400);
        const domain = body.domain ? (String(body.domain) as NdkrsDomain) : undefined;
        const limit = body.limit ? Number(body.limit) : 5;
        const routerDecision = routeNdkrsQuery(query);
        const hits = await hybridSearchNdkrs(query, {
          domain,
          limit,
          includePending: Boolean(body.includePending),
        });
        return json({ query, routerDecision, count: hits.length, hits });
      }

      if (subPath === "route") {
        const query = String(body.query || "").trim();
        if (!query) return json({ error: "query is required" }, 400);
        return json({ query, decision: routeNdkrsQuery(query) });
      }

      if (subPath === "ingest") {
        const domain = (String(body.domain || "general") as NdkrsDomain);
        const canonicalKey = String(body.canonicalKey || "").trim();
        const title = String(body.title || "").trim();
        const content = String(body.content || "").trim();
        const sourceUri = String(body.sourceUri || "").trim();
        if (!canonicalKey || !title || !content || !sourceUri) {
          return json(
            { error: "canonicalKey, title, content, and sourceUri are required." },
            400,
          );
        }
        const res = await ingestKnowledgeDocument({
          domain,
          canonicalKey,
          title,
          summary: String(body.summary || content.slice(0, 320)),
          content,
          sourceUri,
          trustTier: (body.trustTier ? String(body.trustTier) : "USER_SUBMITTED") as TrustTier,
          version: String(body.version || "1.0.0"),
          citationLabel: body.citationLabel ? String(body.citationLabel) : undefined,
          expiresAt: body.expiresAt ? String(body.expiresAt) : null,
          proposedBy: String(body.proposedBy || "api-caller"),
          proposedByType:
            (body.proposedByType as "HUMAN" | "AGENT" | "INGESTION_WORKER" | "API") || "API",
        });
        return json(res, 201);
      }

      if (subPath === "review-queue/decide") {
        const queueId = String(body.queueId || "").trim();
        const decision = String(body.decision || "").toUpperCase();
        const reviewerId = String(body.reviewerId || "").trim();
        const reviewerRole = String(body.reviewerRole || "HUMAN_REVIEWER").trim();
        if (!queueId || (decision !== "APPROVE" && decision !== "REJECT")) {
          return json({ error: "queueId and decision ('APPROVE' | 'REJECT') are required." }, 400);
        }
        const updated = await decideReviewItem({
          queueId,
          decision,
          reviewerId,
          reviewerRole,
          notes: body.notes ? String(body.notes) : undefined,
        });
        return json({ ok: true, item: updated });
      }

      if (subPath === "rules/evaluate") {
        const ruleId = String(body.ruleId || "").trim();
        if (!ruleId) return json({ error: "ruleId is required" }, 400);
        const inputs =
          typeof body.inputs === "object" && body.inputs !== null
            ? (body.inputs as Record<string, unknown>)
            : {};
        const result = evaluateDeterministicRule(ruleId, inputs);
        return json(result, result.ok ? 200 : 400);
      }

      if (subPath === "fact-lock/verify") {
        const result = await validateCrossDomainFactLock({
          domain: (String(body.domain || "general") as NdkrsDomain),
          requestId: String(body.requestId || `NDKRS-REQ-${Date.now()}`),
          rawPrompt: String(body.rawPrompt || ""),
          candidateText: String(body.candidateText || ""),
          lockedClaims: Array.isArray(body.lockedClaims) ? body.lockedClaims : [],
          verifiedCitations: Array.isArray(body.verifiedCitations)
            ? body.verifiedCitations.map(String)
            : [],
          expectedVerdict: body.expectedVerdict ? String(body.expectedVerdict) : undefined,
          strictCitations: Boolean(body.strictCitations),
        });
        return json(result, result.passed ? 200 : 422);
      }

      if (subPath === "certificates/verify") {
        const cert = body.certificate as ValidationCertificateRecord | undefined;
        if (cert && cert.hmacSignature && cert.requestId) {
          return json({
            certificateId: cert.id,
            signatureValid: verifyCertificateSignature(cert),
            keyMode: cert.keyMode,
          });
        }
        const certId = String(body.certificateId || "").trim();
        if (!certId) {
          return json({ error: "Provide certificate object or certificateId." }, 400);
        }
        const certs = await listValidationCertificates(100);
        const found = certs.find((c) => c.id === certId);
        if (!found) return json({ error: `Certificate ${certId} not found.` }, 404);
        return json({
          certificateId: found.id,
          signatureValid: verifyCertificateSignature(found),
          certificate: found,
        });
      }

      if (subPath === "enclave/store") {
        const tenantId = String(body.tenantId || "default-tenant").trim();
        const encounterId = String(body.encounterId || "").trim();
        const payload =
          typeof body.payload === "object" && body.payload !== null
            ? (body.payload as Record<string, unknown>)
            : null;
        if (!encounterId || !payload) {
          return json({ error: "encounterId and payload object are required." }, 400);
        }
        const stored = await storeEncryptedClinicalEnclaveRecord({ tenantId, encounterId, payload });
        return json({ ok: true, ...stored }, 201);
      }

      return json({ error: `Unknown NDKRS POST endpoint: /api/v2/ndkrs/${subPath}` }, 404);
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = /FORBIDDEN|NOT_FOUND/i.test(message) ? 403 : 500;
    return json({ error: message }, status);
  }
}
