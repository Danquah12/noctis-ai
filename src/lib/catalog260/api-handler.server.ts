/**
 * Noctis Master Capability Catalog v1.0 & Dependability REST API Handler (`/api/v2/catalog/*`)
 */

import { resolveDodIcCallerContext } from "../dod-ic/rbac.server.ts";
import {
  CATALOG_260_ITEMS,
  filterCatalog260,
  getCatalog260Summary,
  renderCatalog260GapAuditMarkdown,
} from "./catalog-260-registry.ts";
import {
  auditSourceFreshness,
  calibrateEpistemicConfidence,
  deduplicateAndVerifyTrainingDataset,
  enforcePrivacyPolicy,
  generateRegressionFromDefect,
  runDynamicRegressionFactory,
  runUnifiedDependabilityAudit,
  verifyClaimAgainstAuthority,
} from "./dependability-suite.server.ts";
import { solveCatalog260GapQuery } from "./gap-closure-solvers.ts";
import {
  deleteUserMemory,
  evaluateCanaryRollbackGate,
  getCatalog260SqlStats,
  listDynamicRegressionTests,
  listModelRegistry,
  listUserMemory,
  registerModelVersion,
  saveUserMemory,
  syncCatalog260ToSql,
} from "./persistence.server.ts";

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "Content-Type, Authorization, X-Noctis-Key, X-Tenant-Id, X-Noctis-Role",
};

function jsonRes(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      "cache-control": "no-store",
      ...CORS_HEADERS,
    },
  });
}

export async function handleCatalog260V2Request(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(request.url);
  const subPath = url.pathname.replace(/^\/api\/v2\/catalog\/?/, "").replace(/\/+$/, "");
  const caller = await resolveDodIcCallerContext(request);

  let body: Record<string, unknown> = {};
  if (request.method === "POST") {
    body = ((await request.json().catch(() => ({}))) as Record<string, unknown>) || {};
  }

  if (!subPath || subPath === "status") {
    const [summary, sqlStats, freshness] = await Promise.all([
      Promise.resolve(getCatalog260Summary()),
      getCatalog260SqlStats(),
      auditSourceFreshness(),
    ]);
    return jsonRes({
      platform: "Noctis Master Capability Catalog v1.0 & Dependability Suite",
      version: "1.0.0",
      rbacCaller: {
        actorId: caller.actorId,
        tenantId: caller.tenantId,
        rbacRole: caller.rbacRole,
        authMethod: caller.authMethod,
      },
      summary,
      sqlStats,
      freshness,
      endpoints: [
        "/api/v2/catalog/status",
        "/api/v2/catalog/summary",
        "/api/v2/catalog/items",
        "/api/v2/catalog/dependability/run",
        "/api/v2/catalog/freshness",
        "/api/v2/catalog/eval-factory",
        "/api/v2/catalog/memory",
        "/api/v2/catalog/memory/delete",
        "/api/v2/catalog/models",
        "/api/v2/catalog/models/canary-check",
        "/api/v2/catalog/dataset/dedup",
        "/api/v2/catalog/solve",
        "/api/v2/catalog/sync",
      ],
    });
  }

  if (subPath === "summary") {
    const [summary, sqlStats] = await Promise.all([
      Promise.resolve(getCatalog260Summary()),
      getCatalog260SqlStats(),
    ]);
    return jsonRes({
      ...summary,
      sqlStats,
      markdownAudit: renderCatalog260GapAuditMarkdown(),
    });
  }

  if (subPath === "items") {
    const division = url.searchParams.get("division") || "ALL";
    const status = url.searchParams.get("status") || "ALL";
    const stage = url.searchParams.get("stage") || "ALL";
    const search = url.searchParams.get("q") || "";
    const items = filterCatalog260({ division, status, stage, search });
    return jsonRes({
      summary: getCatalog260Summary(),
      count: items.length,
      totalCataloged: CATALOG_260_ITEMS.length,
      items,
    });
  }

  if (subPath === "dependability/run") {
    if (request.method !== "POST") {
      return jsonRes({ error: "Use POST /api/v2/catalog/dependability/run with { text, statements?, claimToVerify?, persistMemoryUser? }." }, 405);
    }
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) {
      return jsonRes({ error: "Missing non-empty 'text' string in JSON body." }, 400);
    }
    const statements = Array.isArray(body.statements) ? body.statements.map(String) : undefined;
    const claimToVerify = typeof body.claimToVerify === "string" ? body.claimToVerify : undefined;
    const persistMemoryUser = typeof body.persistMemoryUser === "string" ? body.persistMemoryUser : undefined;

    const audit = await runUnifiedDependabilityAudit({
      text,
      statements,
      claimToVerify,
      persistMemoryUser,
    });
    return jsonRes(audit);
  }

  if (subPath === "freshness") {
    const freshness = await auditSourceFreshness();
    return jsonRes(freshness);
  }

  if (subPath === "eval-factory") {
    if (request.method === "POST") {
      const defectSource = typeof body.defectSource === "string" ? body.defectSource.trim() : "";
      const domain = typeof body.domain === "string" ? body.domain.trim() : "general";
      const promptSample = typeof body.promptSample === "string" ? body.promptSample.trim() : "";
      const mustInclude = Array.isArray(body.mustInclude) ? body.mustInclude.map(String) : [];
      const mustNotInclude = Array.isArray(body.mustNotInclude) ? body.mustNotInclude.map(String) : [];
      if (defectSource && promptSample) {
        const created = await generateRegressionFromDefect({
          defectSource,
          domain,
          promptSample,
          mustInclude,
          mustNotInclude,
          createdBy: caller.actorId,
        });
        const run = await runDynamicRegressionFactory();
        return jsonRes({ created, factoryRun: run });
      }
      const run = await runDynamicRegressionFactory();
      return jsonRes({ factoryRun: run });
    }
    const [tests, run] = await Promise.all([
      listDynamicRegressionTests(30),
      runDynamicRegressionFactory(),
    ]);
    return jsonRes({ tests, factoryRun: run });
  }

  if (subPath === "memory") {
    if (request.method === "GET") {
      const userId = url.searchParams.get("userId") || undefined;
      const limit = parseInt(url.searchParams.get("limit") || "25", 10);
      const records = await listUserMemory(userId, Number.isFinite(limit) ? limit : 25);
      return jsonRes({ count: records.length, records });
    }
    if (request.method === "POST") {
      const userId = typeof body.userId === "string" ? body.userId.trim() : caller.actorId;
      const purpose = typeof body.purpose === "string" ? body.purpose.trim() : "session_preference";
      const content = typeof body.content === "string" ? body.content.trim() : "";
      const consentGranted = body.consentGranted === true;
      const retentionDays = typeof body.retentionDays === "number" ? body.retentionDays : 30;
      if (!content) {
        return jsonRes({ error: "Missing non-empty 'content' string." }, 400);
      }
      const policy = enforcePrivacyPolicy({ text: content, purpose, consentGranted, retentionDays });
      if (!policy.compliant) {
        return jsonRes({ saved: false, policy }, 422);
      }
      const memory = await saveUserMemory({
        userId,
        tenantId: caller.tenantId,
        purpose,
        contentRedacted: policy.redactedText,
        consentGranted: true,
        retentionDays,
      });
      return jsonRes({ saved: memory.saved, policy, memory });
    }
    return jsonRes({ error: "Method not allowed" }, 405);
  }

  if (subPath === "memory/delete") {
    if (request.method !== "POST") {
      return jsonRes({ error: "Use POST /api/v2/catalog/memory/delete with { id }." }, 405);
    }
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) {
      return jsonRes({ error: "Missing 'id' string." }, 400);
    }
    const deleted = await deleteUserMemory(id);
    return jsonRes(deleted);
  }

  if (subPath === "models") {
    if (request.method === "GET") {
      const models = await listModelRegistry();
      return jsonRes({ count: models.length, models });
    }
    if (request.method === "POST") {
      const modelId = typeof body.modelId === "string" ? body.modelId.trim() : "";
      const version = typeof body.version === "string" ? body.version.trim() : "";
      const evalAccuracyPct = typeof body.evalAccuracyPct === "number" ? body.evalAccuracyPct : 99.0;
      const canaryTrafficPct = typeof body.canaryTrafficPct === "number" ? body.canaryTrafficPct : 5;
      const status = (typeof body.status === "string" ? body.status : "STAGED") as
        | "ACTIVE_PROD"
        | "CANARY"
        | "ROLLED_BACK"
        | "STAGED";
      const rollbackTarget = typeof body.rollbackTarget === "string" ? body.rollbackTarget : null;
      if (!modelId || !version) {
        return jsonRes({ error: "Missing 'modelId' and 'version'." }, 400);
      }
      const registered = await registerModelVersion({
        modelId,
        version,
        evalAccuracyPct,
        canaryTrafficPct,
        status,
        rollbackTarget,
      });
      return jsonRes(registered);
    }
    return jsonRes({ error: "Method not allowed" }, 405);
  }

  if (subPath === "models/canary-check") {
    if (request.method !== "POST") {
      return jsonRes({ error: "Use POST /api/v2/catalog/models/canary-check with { modelId, observedAccuracyPct, criticalSafetyFailures }." }, 405);
    }
    const modelId = typeof body.modelId === "string" ? body.modelId.trim() : "";
    const observedAccuracyPct = typeof body.observedAccuracyPct === "number" ? body.observedAccuracyPct : 0;
    const criticalSafetyFailures = typeof body.criticalSafetyFailures === "number" ? body.criticalSafetyFailures : 0;
    if (!modelId) {
      return jsonRes({ error: "Missing 'modelId'." }, 400);
    }
    const gate = await evaluateCanaryRollbackGate({
      modelId,
      observedAccuracyPct,
      criticalSafetyFailures,
    });
    return jsonRes(gate);
  }

  if (subPath === "dataset/dedup") {
    if (request.method !== "POST") {
      return jsonRes({ error: "Use POST /api/v2/catalog/dataset/dedup with { samples, declaredLicense? }." }, 405);
    }
    const rawSamples = Array.isArray(body.samples) ? body.samples : [];
    const samples = rawSamples.map((s) => {
      const obj = (s && typeof s === "object" ? s : {}) as Record<string, unknown>;
      return {
        id: typeof obj.id === "string" ? obj.id : undefined,
        prompt: String(obj.prompt ?? ""),
        completion: String(obj.completion ?? ""),
        sourceLicense: typeof obj.sourceLicense === "string" ? obj.sourceLicense : undefined,
      };
    });
    const declaredLicense = typeof body.declaredLicense === "string" ? body.declaredLicense : "Apache-2.0 / Public-Gov";
    const result = deduplicateAndVerifyTrainingDataset(samples, declaredLicense);
    return jsonRes(result);
  }

  if (subPath === "solve") {
    if (request.method !== "POST") {
      return jsonRes({ error: "Use POST /api/v2/catalog/solve with { query }." }, 405);
    }
    const query = typeof body.query === "string" ? body.query.trim() : "";
    if (!query) {
      return jsonRes({ error: "Missing non-empty 'query' string in JSON body." }, 400);
    }
    const solverResult = solveCatalog260GapQuery(query);
    const authorityVerification = await verifyClaimAgainstAuthority(
      `${solverResult.title} ${solverResult.authorities.join(" ")}`,
    );
    const epistemicConfidence = calibrateEpistemicConfidence(
      solverResult.findings.join(" "),
      authorityVerification.supportingHits.length,
    );
    return jsonRes({
      solverResult,
      authorityVerification,
      epistemicConfidence,
    });
  }

  if (subPath === "sync") {
    if (request.method !== "POST") {
      return jsonRes({ error: "Use POST /api/v2/catalog/sync." }, 405);
    }
    const syncedCount = await syncCatalog260ToSql();
    return jsonRes({ ok: true, syncedCount, totalCataloged: CATALOG_260_ITEMS.length });
  }

  return jsonRes({ error: "Unknown /api/v2/catalog route", subPath }, 404);
}
