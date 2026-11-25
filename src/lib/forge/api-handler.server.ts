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
  listForgeSubmissions,
  saveForgeSubmission,
} from "./forge-persistence.server.ts";
import { runForgeProjectInSandbox } from "./sandbox-runner.server.ts";
import { evaluateChallenge001ForProject } from "./challenge-001-evaluator.server.ts";
import {
  NASEE_28_ENGINES,
  executeNaseeAutonomousPipeline,
  runNaseeCapabilityDiscovery,
} from "./nasee-engine.server.ts";
import {
  NOCTIS_API_ROUTES,
  NOCTIS_CHAT_RETRIEVAL_ENDPOINTS,
  NOCTIS_PANELS,
  NOCTIS_SLASH_ROUTES,
} from "../noctis-capability-registry.ts";
import {
  getRoutedResponseStats,
  listRoutedChatResponses,
} from "../noctis-response-store.server.ts";
import { classifyNoctisIntent } from "../noctis-intent-router.server.ts";
import type { BlueprintVisualPatch } from "./website-blueprint-engine.ts";

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

  if (subPath === "platform-routes") {
    const [projects, recentResponses] = await Promise.all([
      listForgeProjectRecords(20).catch(() => []),
      listRoutedChatResponses({ limit: 12 }).catch(() => []),
    ]);

    const includeHealth = url.searchParams.get("health") === "1";
    let health:
      | {
          checkedAt: string;
          overallStatus: "healthy" | "degraded";
          dbSource: string;
          sandboxReady: boolean;
          totalOk: number;
          totalRoutes: number;
          routes: Array<{ id: string; ok: boolean; latencyMs: number; detail: string }>;
        }
      | undefined;

    if (includeHealth) {
      const probe = async (id: string, fn: () => Promise<string>) => {
        const started = Date.now();
        try {
          const detail = await fn();
          return { id, ok: true, latencyMs: Math.max(1, Date.now() - started), detail };
        } catch (err) {
          return {
            id,
            ok: false,
            latencyMs: Math.max(1, Date.now() - started),
            detail: err instanceof Error ? err.message : "probe failed",
          };
        }
      };

      const envInfo = validateDevelopmentEnvironment();
      let resolvedDbSource = process.env.DATABASE_URL ? "neon-postgres" : "pglite";

      const routes = await Promise.all([
        probe("forge", async () => {
          const stats = await getForgeSqlStats();
          return `${stats.forgeProjects} projects · ${stats.forgeRevisions} revisions (${resolvedDbSource})`;
        }),
        probe("platform-routes", async () => `${NOCTIS_PANELS.length} panels · ${NOCTIS_SLASH_ROUTES.length} slash routes`),
        probe("noctis", async () => {
          const stats = await getRoutedResponseStats();
          const check = classifyNoctisIntent("/weather Laurel MD");
          return `${stats.totalSaved} archived responses · router=${check.routeId}`;
        }),
        probe("rmf", async () => {
          const mod = await import("../noctis-rmf-engine.ts");
          return typeof mod.isRmfGrcQuery === "function" ? "NIST 800-53 engine ready" : "unavailable";
        }),
        probe("dod-ic", async () => {
          const mod = await import("../dod-ic/dod-ic-reasoning.server.ts");
          return typeof mod.isDodIcQuery === "function" ? "NDIMP DoD/IC engine ready" : "unavailable";
        }),
        probe("enterprise", async () => {
          const mod = await import("../enterprise/chat-bridge.server.ts");
          return typeof mod.isEnterpriseChatQuery === "function" ? "Enterprise command engine ready" : "unavailable";
        }),
        probe("ndkrs", async () => {
          const mod = await import("../ndkrs/chat-bridge.server.ts");
          return typeof mod.tryHandlePlatformStatusOrLedgerQuery === "function" ? "NDKRS Fact-Lock ready" : "unavailable";
        }),
        probe("nups", async () => {
          const mod = await import("../nups/chat-bridge.server.ts");
          return typeof mod.isNupsChatQuery === "function" ? "NUPS 40-engine solver ready" : "unavailable";
        }),
        probe("catalog", async () => {
          const mod = await import("../catalog260/chat-bridge.server.ts");
          return typeof mod.isCatalog260ChatQuery === "function" ? "Catalog 260 suite ready" : "unavailable";
        }),
        probe("assistant", async () => {
          const mod = await import("../assistant/chat-bridge.server.ts");
          return typeof mod.isAssistantChatQuery === "function" ? "Universal Assistant v1.0 ready" : "unavailable";
        }),
        probe("space", async () => {
          const mod = await import("../noctis-space-universe.server.ts");
          return typeof mod.executeSpaceUniverseQuery === "function" ? "Space/SWPC/JPL/ISS telemetry ready" : "unavailable";
        }),
        probe("earth", async () => {
          const mod = await import("../noctis-earth-hazards.server.ts");
          return typeof mod.executeEarthHazardsQuery === "function" ? "USGS/EONET/AQI hazards engine ready" : "unavailable";
        }),
        probe("nav", async () => {
          const mod = await import("../noctis-global-nav.server.ts");
          return typeof mod.executeGlobalNavQuery === "function" ? "METAR/Great-Circle nav engine ready" : "unavailable";
        }),
        probe("architect", async () => {
          const mod = await import("../noctis-architect-engine.ts");
          return typeof mod.buildArchitecturalIntelligenceReport === "function"
            ? "NOCTIS-ARCH-001 IFC/CAD/IDS engine ready"
            : "unavailable";
        }),
        probe("legal", async () => {
          const mod = await import("../noctis-legal-engine.ts");
          return typeof mod.handleNaturalLegalQuery === "function"
            ? "NOCTIS-LEGAL-001 Attorney/Lex engine ready"
            : "unavailable";
        }),
        probe("invest", async () => {
          const mod = await import("../noctis-investment-engine.ts");
          return typeof mod.handleNaturalInvestmentQuery === "function"
            ? "NOCTIS-INVEST-001 Valuation/Research engine ready"
            : "unavailable";
        }),
        probe("auto", async () => {
          const mod = await import("../noctis-automotive-engine.ts");
          return typeof mod.automotiveDiagnosticGadget === "function"
            ? "NOCTIS-AUTO-001 OBD-II diagnostic engine ready"
            : "unavailable";
        }),
        probe("bible", async () => {
          const mod = await import("../noctis-bible-engine.ts");
          return typeof mod.handleNaturalBibleQuery === "function"
            ? "NOCTIS-BIBLE-001 Exegesis/Study engine ready"
            : "unavailable";
        }),
        probe("energy", async () => {
          const mod = await import("../noctis-energy-grid.ts");
          return typeof mod.handleNaturalEnergyQuery === "function"
            ? "NOCTIS-ENERGY-GRID-001 BESS/Droop engine ready"
            : "unavailable";
        }),
        probe("career", async () => {
          const mod = await import("../noctis-career-query.ts");
          return typeof mod.handleNaturalCareerQuery === "function"
            ? "NOCTIS-CAREERS-001 Pathway repository ready"
            : "unavailable";
        }),
        probe("research", async () => {
          const mod = await import("../noctis-ric.ts");
          return typeof mod.buildRicIntelligenceReport === "function"
            ? "NOCTIS-RIC-001 Deep Evidence/RIC ready"
            : "unavailable";
        }),
        probe("omni", async () => {
          const mod = await import("../noctis-universal-life-router.ts");
          return typeof mod.executeOmniSolverQuery === "function"
            ? "NOCTIS-OMNI-ROUTER-001 81 STEM solvers ready"
            : "unavailable";
        }),
      ]);

      const totalOk = routes.filter((r) => r.ok).length;
      health = {
        checkedAt: new Date().toISOString(),
        overallStatus: totalOk === routes.length ? "healthy" : "degraded",
        dbSource: resolvedDbSource,
        sandboxReady: Boolean((envInfo as any)?.ready ?? true),
        totalOk,
        totalRoutes: routes.length,
        routes,
      };
    }

    return jsonRes({
      ok: true,
      panels: NOCTIS_PANELS,
      slashRoutes: NOCTIS_SLASH_ROUTES,
      apiRoutes: NOCTIS_API_ROUTES,
      retrievalEndpoints: NOCTIS_CHAT_RETRIEVAL_ENDPOINTS,
      recentProjects: projects.map((p: any) => ({
        id: String(p.id),
        name: String(p.name || p.id),
        category: String(p.category || "Web App"),
        status: String(p.status || "READY"),
        currentRevision: Number(p.current_revision || 1),
        deepLink: `/noctis?panel=forge&project=${encodeURIComponent(String(p.id))}`,
        previewUrl: `/api/v2/forge/preview?projectId=${encodeURIComponent(String(p.id))}`,
      })),
      recentResponses: recentResponses.map((r) => ({
        id: r.id,
        routeId: r.routeId,
        routeLabel: r.routeLabel,
        targetPanel: r.targetPanel,
        prompt: r.prompt,
        summary: r.summary,
        createdAt: r.createdAt,
        deepLink: `/noctis?response=${encodeURIComponent(r.id)}`,
        retrievalUrl: `/api/noctis?responseId=${encodeURIComponent(r.id)}`,
      })),
      ...(health ? { health } : {}),
    });
  }

  if (subPath === "nasee/capabilities") {
    const capabilities = await runNaseeCapabilityDiscovery();
    return jsonRes({
      ok: true,
      engineCount: NASEE_28_ENGINES.length,
      engines: NASEE_28_ENGINES,
      capabilities,
    });
  }

  if (subPath === "nasee/execute") {
    if (request.method !== "POST") return jsonRes({ error: "Use POST." }, 405);
    const prompt = typeof body.prompt === "string" && body.prompt.trim()
      ? body.prompt.trim()
      : "Execute Directive 002 for OmniSphere 20-screen foundation and 30-module ecosystem.";
    const report = await executeNaseeAutonomousPipeline({
      prompt,
      persist: body.persist !== false,
      actorId: caller?.actorId || "nasee-api-caller",
      originUrl: url.origin,
      preferredBackend:
        body.preferredBackend === "vercel-sandbox" || body.preferredBackend === "local-isolated"
          ? body.preferredBackend
          : "auto",
    });
    const { generatedFiles: _files, ...rest } = report;
    return jsonRes({ ...rest, fileNames: Object.keys(_files) }, report.ok ? 200 : 422);
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
    const instruction = String(body.instruction || "").trim();
    const visualPatch =
      body.visualPatch && typeof body.visualPatch === "object"
        ? (body.visualPatch as BlueprintVisualPatch)
        : undefined;
    if (!projectId || (!instruction && !visualPatch)) {
      return jsonRes({ error: "Missing projectId or instruction/visualPatch." }, 400);
    }
    const out = await editForgeProjectConversationally({
      projectId,
      instruction,
      accentHex: typeof body.accentHex === "string" ? body.accentHex : undefined,
      addEntity: typeof body.addEntity === "string" ? body.addEntity : undefined,
      visualPatch,
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
      dispatchExternal: Boolean(body.dispatchExternal),
    });
    return jsonRes(out, out.approved ? 200 : 403);
  }

  if (subPath === "live" || subPath.startsWith("live/")) {
    const id = (url.searchParams.get("id") || (subPath.startsWith("live/") ? subPath.slice("live/".length) : "")).trim();
    if (!id) {
      return new Response("<!doctype html><html><body><h1>Missing project id</h1></body></html>", {
        status: 400,
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", ...CORS_HEADERS },
      });
    }
    const proj = await getForgeProjectRecord(id);
    const files = (proj?.files_json && typeof proj.files_json === "object" ? proj.files_json : {}) as Record<string, string>;
    const html = files["index.html"] || "";
    if (!proj || !html) {
      return new Response("<!doctype html><html><body><h1>Live Forge site not found</h1></body></html>", {
        status: 404,
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", ...CORS_HEADERS },
      });
    }
    return new Response(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "x-content-type-options": "nosniff",
        "cache-control": "no-store",
        ...CORS_HEADERS,
      },
    });
  }

  if (subPath === "submissions") {
    if (request.method === "GET") {
      const projectId = (url.searchParams.get("projectId") || "").trim();
      if (!projectId) return jsonRes({ error: "Missing projectId." }, 400);
      const limit = Number(url.searchParams.get("limit") || 50);
      const submissions = await listForgeSubmissions(projectId, limit);
      return jsonRes({ ok: true, projectId, submissions });
    }
    if (request.method === "POST") {
      const projectId = String(body.projectId || "").trim();
      if (!projectId) return jsonRes({ error: "Missing projectId." }, 400);
      const submissionType = String(body.submissionType || "INQUIRY").trim().slice(0, 32);
      const customerName = typeof body.customerName === "string" ? body.customerName.trim().slice(0, 120) : "Guest";
      const customerEmail = typeof body.customerEmail === "string" ? body.customerEmail.trim().slice(0, 160) : "";
      const amountCents = Math.max(0, Math.round(Number(body.amountCents || 0)));
      const paymentStatus = String(body.paymentStatus || "RECORDED").trim().slice(0, 32);
      const payload = (body.payload && typeof body.payload === "object" ? body.payload : body) as Record<string, unknown>;
      const saved = await saveForgeSubmission({
        projectId,
        submissionType,
        customerName,
        customerEmail,
        payload,
        amountCents,
        paymentStatus,
      });
      return jsonRes(
        {
          ok: true,
          submission: {
            id: saved.id,
            project_id: projectId,
            submission_type: saved.submissionType,
            customer_name: customerName,
            customer_email: customerEmail,
            amount_cents: amountCents,
            payment_status: saved.paymentStatus,
            payload_json: payload,
            created_at: new Date().toISOString(),
          },
        },
        201,
      );
    }
    return jsonRes({ error: "Method not allowed." }, 405);
  }

  if (subPath === "checkout") {
    if (request.method !== "POST") return jsonRes({ error: "Use POST." }, 405);
    const projectId = String(body.projectId || "").trim();
    if (!projectId) return jsonRes({ error: "Missing projectId." }, 400);
    const itemTitle = String(body.itemTitle || body.service || "Custom Booking & Deposit").trim().slice(0, 160);
    const amountCents = Math.max(100, Math.round(Number(body.amountCents || 4900)));
    const currency = (typeof body.currency === "string" ? body.currency : "usd").toLowerCase().replace(/[^a-z]/g, "").slice(0, 3) || "usd";
    const customerName = typeof body.customerName === "string" ? body.customerName.trim().slice(0, 120) : "Guest";
    const customerEmail = typeof body.customerEmail === "string" ? body.customerEmail.trim().slice(0, 160) : "";
    const payload = (body.payload && typeof body.payload === "object" ? body.payload : { itemTitle, currency }) as Record<string, unknown>;

    const stripeKey = process.env.STRIPE_SECRET_KEY || "";
    if (stripeKey) {
      try {
        const origin = url.origin || "https://www.dstrike.app";
        const form = new URLSearchParams();
        form.set("mode", "payment");
        form.set("success_url", `${origin}/api/v2/forge/live?id=${encodeURIComponent(projectId)}&checkout=success`);
        form.set("cancel_url", `${origin}/api/v2/forge/live?id=${encodeURIComponent(projectId)}&checkout=cancelled`);
        form.set("line_items[0][price_data][currency]", currency);
        form.set("line_items[0][price_data][unit_amount]", String(amountCents));
        form.set("line_items[0][price_data][product_data][name]", itemTitle);
        form.set("line_items[0][quantity]", "1");
        if (customerEmail && customerEmail.includes("@")) {
          form.set("customer_email", customerEmail);
        }
        const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
          method: "POST",
          headers: {
            authorization: `Bearer ${stripeKey}`,
            "content-type": "application/x-www-form-urlencoded",
          },
          body: form.toString(),
        });
        const stripeData = (await stripeRes.json().catch(() => ({}))) as { id?: string; url?: string; error?: { message?: string } };
        if (stripeRes.ok && stripeData.url) {
          const saved = await saveForgeSubmission({
            projectId,
            submissionType: "CHECKOUT",
            customerName,
            customerEmail,
            payload: { ...payload, itemTitle, stripeSessionId: stripeData.id },
            amountCents,
            paymentStatus: "STRIPE_SESSION_CREATED",
          });
          return jsonRes({
            ok: true,
            mode: "STRIPE_LIVE",
            checkoutUrl: stripeData.url,
            sessionId: stripeData.id,
            paymentStatus: "STRIPE_SESSION_CREATED",
            amountCents,
            currency,
            submission: {
              id: saved.id,
              project_id: projectId,
              submission_type: "CHECKOUT",
              customer_name: customerName,
              customer_email: customerEmail,
              amount_cents: amountCents,
              payment_status: "STRIPE_SESSION_CREATED",
              created_at: new Date().toISOString(),
            },
          });
        }
      } catch {
        // Fall back cleanly to sandbox booking receipt below
      }
    }

    const saved = await saveForgeSubmission({
      projectId,
      submissionType: "CHECKOUT",
      customerName,
      customerEmail,
      payload: { ...payload, itemTitle, currency },
      amountCents,
      paymentStatus: "TEST_SANDBOX_PAID",
    });
    return jsonRes({
      ok: true,
      mode: "SANDBOX_MODE",
      receiptId: saved.id,
      paymentStatus: "TEST_SANDBOX_PAID",
      amountCents,
      currency,
      submission: {
        id: saved.id,
        project_id: projectId,
        submission_type: "CHECKOUT",
        customer_name: customerName,
        customer_email: customerEmail,
        amount_cents: amountCents,
        payment_status: "TEST_SANDBOX_PAID",
        payload_json: { ...payload, itemTitle, currency },
        created_at: new Date().toISOString(),
      },
    });
  }

  if (subPath === "projects/sandbox-run") {
    const projectId = String(body.projectId || "").trim();
    if (!projectId) return jsonRes({ error: "Missing projectId." }, 400);
    const preferred =
      body.preferredBackend === "vercel-sandbox" || body.preferredBackend === "local-isolated"
        ? body.preferredBackend
        : "auto";
    const out = await runForgeProjectInSandbox(projectId, {
      preferredBackend: preferred,
      autoRepair: body.autoRepair !== false,
    });
    return jsonRes(out, out.ok ? 200 : out.error === "Project not found." ? 404 : 422);
  }

  if (subPath === "projects/evaluate-challenge") {
    const projectId = String(body.projectId || "").trim();
    if (!projectId) return jsonRes({ error: "Missing projectId." }, 400);
    const sandboxExecution = body.runSandbox === true
      ? await runForgeProjectInSandbox(projectId, { autoRepair: true })
      : undefined;
    const scorecard = await evaluateChallenge001ForProject(projectId, {
      sandboxExecution: sandboxExecution ?? undefined,
    });
    return jsonRes({ ok: scorecard.ok, scorecard, sandboxExecution: sandboxExecution ?? null }, 200);
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
