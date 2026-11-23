/**
 * Noctis Universal Problem Solver (NUPS) REST API Handler (`/api/v2/nups/*`)
 */

import { resolveDodIcCallerContext } from "../dod-ic/rbac.server.ts";
import {
  filterCapabilityMatrix,
  getMasterCapabilityMatrixSummary,
} from "./master-capability-matrix.ts";
import { solveUniversalProblem } from "./orchestrator.server.ts";
import {
  getNupsTelemetryStats,
  listNupsRuns,
  syncNupsCatalogToSql,
} from "./persistence.server.ts";
import type { NupsEngineCategory, NupsExpansionPhase } from "./types.ts";

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

export async function handleNupsV2Request(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(request.url);
  const subPath = url.pathname.replace(/^\/api\/v2\/nups\/?/, "").replace(/\/+$/, "");
  const caller = await resolveDodIcCallerContext(request);

  let body: Record<string, unknown> = {};
  if (request.method === "POST") {
    body = ((await request.json().catch(() => ({}))) as Record<string, unknown>) || {};
  }

  if (!subPath || subPath === "status") {
    const [summary, telemetry] = await Promise.all([
      Promise.resolve(getMasterCapabilityMatrixSummary()),
      getNupsTelemetryStats(),
    ]);
    return jsonRes({
      platform: "Noctis Universal Problem Solver (NUPS)",
      version: "1.0.0",
      rbacCaller: {
        actorId: caller.actorId,
        tenantId: caller.tenantId,
        rbacRole: caller.rbacRole,
        authMethod: caller.authMethod,
      },
      matrixSummary: summary,
      sqlTelemetry: telemetry,
      endpoints: [
        "/api/v2/nups/status",
        "/api/v2/nups/matrix",
        "/api/v2/nups/solve",
        "/api/v2/nups/runs",
        "/api/v2/nups/sync-catalog",
      ],
    });
  }

  if (subPath === "matrix") {
    const category = (url.searchParams.get("category") || "ALL") as NupsEngineCategory | "ALL";
    const phase = (url.searchParams.get("phase") || "ALL") as NupsExpansionPhase | "ALL";
    const search = url.searchParams.get("q") || "";
    const engines = filterCapabilityMatrix({ category, phase, search });
    return jsonRes({
      summary: getMasterCapabilityMatrixSummary(),
      count: engines.length,
      engines,
    });
  }

  if (subPath === "solve") {
    if (request.method !== "POST") {
      return jsonRes({ error: "Use POST /api/v2/nups/solve with { query }." }, 405);
    }
    const query = typeof body.query === "string" ? body.query.trim() : "";
    if (!query) {
      return jsonRes({ error: "Missing non-empty 'query' string in JSON body." }, 400);
    }
    const result = await solveUniversalProblem({
      query,
      actorId: caller.actorId,
      tenantId: caller.tenantId,
      persist: body.persist !== false,
    });
    return jsonRes(result, result.safetyValidation.failClosedTriggered ? 422 : 200);
  }

  if (subPath === "runs") {
    const limit = parseInt(url.searchParams.get("limit") || "20", 10);
    const runs = await listNupsRuns(isNaN(limit) ? 20 : limit);
    const stats = await getNupsTelemetryStats();
    return jsonRes({ stats, runs });
  }

  if (subPath === "sync-catalog") {
    if (request.method !== "POST") {
      return jsonRes({ error: "Use POST /api/v2/nups/sync-catalog." }, 405);
    }
    const synced = await syncNupsCatalogToSql();
    return jsonRes({ ok: true, catalogedEnginesSynced: synced });
  }

  return jsonRes({ error: "Unknown /api/v2/nups route", subPath }, 404);
}
