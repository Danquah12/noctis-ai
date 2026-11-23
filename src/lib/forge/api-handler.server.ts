/**
 * Noctis Forge v1.0 REST API Handler (`/api/v2/forge/*`)
 */

import { resolveDodIcCallerContext } from "../dod-ic/rbac.server.ts";
import {
  FORGE_12_AGENTS,
  FORGE_35_CAPABILITIES,
  FORGE_40_CATEGORIES,
  FORGE_COMPLEX_PLATFORMS,
  FORGE_STACK_PRESETS,
} from "./forge-catalog.ts";
import {
  convertScreenshotOrFigmaToCode,
  editForgeProjectConversationally,
  exportForgeProjectZipBuffer,
  generateForgeProject,
  prepareForgeGitHubPr,
  requestOrApproveForgeDeploy,
  restoreForgeProjectRevision,
  validateDevelopmentEnvironment,
} from "./forge-engine.server.ts";
import {
  getForgeProjectRecord,
  getForgeSqlStats,
  listForgeProjectRecords,
  listForgeProjectRevisions,
} from "./forge-persistence.server.ts";

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "Content-Type, Authorization, X-Noctis-Key, X-Tenant-Id, X-Noctis-Role",
};

function jsonRes(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { "cache-control": "no-store", ...CORS_HEADERS },
  });
}

export async function handleForgeV2Request(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(request.url);
  const subPath = url.pathname.replace(/^\/api\/v2\/forge\/?/, "").replace(/\/+$/, "");
  const caller = await resolveDodIcCallerContext(request);

  let body: Record<string, unknown> = {};
  if (request.method === "POST") {
    body = ((await request.json().catch(() => ({}))) as Record<string, unknown>) || {};
  }

  if (!subPath || subPath === "status") {
    const [sqlStats, projects] = await Promise.all([
      getForgeSqlStats(),
      listForgeProjectRecords(15),
    ]);
    return jsonRes({
      platform: "Noctis Forge — AI Website, Application & Software Factory v1.0",
      version: "1.0.0",
      categoriesCount: FORGE_40_CATEGORIES.length,
      capabilitiesCount: FORGE_35_CAPABILITIES.length,
      agentsCount: FORGE_12_AGENTS.length,
      sqlStats,
      projects,
    });
  }

  if (subPath === "catalog") {
    return jsonRes({
      categories40: FORGE_40_CATEGORIES,
      capabilities35: FORGE_35_CAPABILITIES,
      agents12: FORGE_12_AGENTS,
      stackPresets: FORGE_STACK_PRESETS,
      complexPlatforms: FORGE_COMPLEX_PLATFORMS,
    });
  }

  if (subPath === "environment") {
    return jsonRes(validateDevelopmentEnvironment());
  }

  if (subPath === "projects") {
    const id = url.searchParams.get("id");
    if (id) {
      const [proj, revisions] = await Promise.all([
        getForgeProjectRecord(id),
        listForgeProjectRevisions(id, 20),
      ]);
      if (!proj) return jsonRes({ error: "Project not found" }, 404);
      return jsonRes({ project: proj, revisions });
    }
    const projects = await listForgeProjectRecords(25);
    return jsonRes({ count: projects.length, projects });
  }

  if (subPath === "projects/generate") {
    if (request.method !== "POST") return jsonRes({ error: "Use POST." }, 405);
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt) return jsonRes({ error: "Missing non-empty 'prompt'." }, 400);
    return jsonRes(
      await generateForgeProject({
        prompt,
        category: typeof body.category === "string" ? body.category : undefined,
        stack: typeof body.stack === "string" ? body.stack : undefined,
        projectName: typeof body.projectName === "string" ? body.projectName : undefined,
        accentHex: typeof body.accentHex === "string" ? body.accentHex : undefined,
        actorId: caller.actorId,
        persist: body.persist !== false,
        useAi: body.useAi !== false,
      }),
    );
  }

  if (subPath === "projects/edit") {
    if (request.method !== "POST") return jsonRes({ error: "Use POST." }, 405);
    const projectId = String(body.projectId || "");
    const instruction = String(body.instruction || "");
    if (!projectId || !instruction) return jsonRes({ error: "Missing projectId or instruction." }, 400);
    const out = await editForgeProjectConversationally({
      projectId,
      instruction,
      accentHex: typeof body.accentHex === "string" ? body.accentHex : undefined,
      addEntity: typeof body.addEntity === "string" ? body.addEntity : undefined,
      actorId: caller.actorId,
      useAi: body.useAi !== false,
    });
    return jsonRes(out, out.ok ? 200 : 404);
  }

  if (subPath === "projects/restore") {
    const projectId = String(body.projectId || "");
    const rev = Number(body.revisionNumber || 1);
    const out = await restoreForgeProjectRevision(projectId, rev, caller.actorId);
    return jsonRes(out, out.ok ? 200 : 404);
  }

  if (subPath === "projects/export-zip") {
    const projectId = url.searchParams.get("id") || String(body.projectId || "");
    if (!projectId) return jsonRes({ error: "Missing projectId." }, 400);
    const zipped = await exportForgeProjectZipBuffer(projectId);
    if (!zipped) return jsonRes({ error: "Project not found." }, 404);
    if (url.searchParams.get("download") === "true" || body.download === true) {
      return new Response(new Uint8Array(zipped.zipBuffer), {
        status: 200,
        headers: {
          "content-type": "application/zip",
          "content-disposition": `attachment; filename="${zipped.filename}"`,
          "cache-control": "no-store",
          ...CORS_HEADERS,
        },
      });
    }
    return jsonRes({
      ok: true,
      projectId: zipped.projectId,
      filename: zipped.filename,
      fileCount: zipped.fileCount,
      byteLength: zipped.zipBuffer.length,
      sha256: zipped.sha256,
      base64: zipped.zipBuffer.toString("base64"),
    });
  }

  if (subPath === "projects/github-pr") {
    const out = await prepareForgeGitHubPr(String(body.projectId || ""), typeof body.repo === "string" ? body.repo : undefined);
    return jsonRes(out, out.ok ? 200 : 404);
  }

  if (subPath === "projects/deploy") {
    const out = await requestOrApproveForgeDeploy({
      projectId: String(body.projectId || ""),
      target: (body.target === "PRODUCTION" ? "PRODUCTION" : "STAGING"),
      approver: typeof body.approver === "string" ? body.approver : undefined,
    });
    return jsonRes(out, out.approved ? 200 : 403);
  }

  if (subPath === "convert-design") {
    return jsonRes(
      convertScreenshotOrFigmaToCode({
        mode: body.mode === "FIGMA_TO_CODE" ? "FIGMA_TO_CODE" : "SCREENSHOT_TO_CODE",
        title: String(body.title || "Generated Design Component"),
        description: String(body.description || "Responsive UI layout reconstructed safely"),
        paletteHex: typeof body.paletteHex === "string" ? body.paletteHex : undefined,
        sections: Array.isArray(body.sections) ? body.sections.map(String) : undefined,
      }),
    );
  }

  return jsonRes({ error: "Unknown /api/v2/forge route", subPath }, 404);
}
