/**
 * Noctis Universal Assistant v1.0 REST API Handler (`/api/v2/assistant/*`)
 */

import { resolveDodIcCallerContext } from "../dod-ic/rbac.server.ts";
import { sha256Sync } from "../universal-crypto.ts";
import {
  deleteUserMemory,
  listUserMemory,
  saveUserMemory,
} from "../catalog260/persistence.server.ts";
import { enforcePrivacyPolicy } from "../catalog260/dependability-suite.server.ts";
import {
  ADDITIONAL_12_CATEGORIES,
  FIVE_ADVANCED_STUDIOS,
  NOCTIS_100_CAPABILITY_PARITY_MATRIX,
  filterParityMatrix,
  getParityMatrixSummary,
  renderParityMatrixMarkdown,
} from "./parity-matrix.ts";
import {
  approveWorkflowRun,
  createScheduledTask,
  createWorkspace,
  deleteCustomAssistant,
  getAssistantSqlStats,
  listAnswerPassports,
  listBenchmarkRuns,
  listCustomAssistants,
  listScheduledTasks,
  listWorkflowRuns,
  listWorkspaceDocuments,
  listWorkspaces,
  runScheduledTaskNow,
  saveWorkspaceDocumentRevision,
  syncParityMatrixToSql,
  updateUserMemory,
  upsertCustomAssistant,
} from "./persistence.server.ts";
import {
  buildDocxDocumentBuffer,
  buildPdfDocumentBuffer,
  buildPptxPresentationBuffer,
  buildXlsxWorkbookBuffer,
  compareTwoDocuments,
  editDocumentSectionPreservingFormat,
  parseUploadedTabularFile,
} from "./document-studio.server.ts";
import {
  analyzeTabularDataset,
  buildInteractiveChartSpec,
  planGeographicMapAndRoute,
} from "./data-analysis-studio.server.ts";
import {
  analyzeWorkspaceRepository,
  diagnoseFailureTrace,
  executeSafeCodeSandbox,
  generateCodingAgentProposal,
  generateOrAuditCiCdPipeline,
  generateSafeSqlMigration,
  generateUnitTestScaffold,
  profileCodeOrQuery,
  verifyDeploymentHealth,
} from "./coding-agent.server.ts";
import {
  analyzeAcademicPaper,
  analyzePublicPatent,
  buildManagedContextWindow,
  compareRegulatoryStandards,
  fetchWebPageVerified,
  runDeepResearchAgent,
} from "./research-agent.server.ts";
import {
  analyzeAudioTranscript,
  analyzeVisionImage,
  createCalendarEventAndIcs,
  draftOrSendEmail,
  generateOrEditImage,
  listConnectedAppsStatus,
  prepareMeetingBrief,
  prepareVoiceResponseSpec,
  proposeComputerUsePlan,
  runAutonomousWorkflow,
  suggestNextActionsFromWorkspace,
  summarizeMeetingTranscript,
  translateText,
} from "./connectors-and-workflows.server.ts";
import {
  analyzeCausalityVsCorrelation,
  checkStalePassportsAgainstFreshness,
  classifyReasoningBudget,
  convertFailureToFixTicket,
  detectAndQueueKnowledgeGap,
  evaluateDomainCertificationGate,
  evaluatePlanTradeoffs,
  getModelQualityObservatory,
  issueAnswerPassport,
  issueExecutionPassport,
  replayAnswerPassport,
  resolveSourceConflictByJurisdiction,
  runCounterfactualAnalysis,
} from "./distinctive-moat.server.ts";
import { run100TaskBenchmark } from "./benchmark-100.server.ts";
import { resolveHumanNeuralVoice } from "../noctis-voice.ts";
import type { NdkrsDomain } from "../ndkrs/types.ts";

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "access-control-allow-headers": "Content-Type, Authorization, X-Noctis-Key, X-Tenant-Id, X-Noctis-Role",
};

function jsonRes(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { "cache-control": "no-store", ...CORS_HEADERS },
  });
}

export async function handleAssistantV2Request(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(request.url);
  const subPath = url.pathname.replace(/^\/api\/v2\/assistant\/?/, "").replace(/\/+$/, "");
  const caller = await resolveDodIcCallerContext(request);

  let body: Record<string, unknown> = {};
  if (request.method === "POST" || request.method === "PATCH") {
    body = ((await request.json().catch(() => ({}))) as Record<string, unknown>) || {};
  }

  if (!subPath || subPath === "status") {
    const [sqlStats, connectors] = await Promise.all([
      getAssistantSqlStats(),
      Promise.resolve(listConnectedAppsStatus()),
    ]);
    return jsonRes({
      platform: "Noctis Universal Assistant v1.0",
      version: "1.0.0",
      caller: { actorId: caller.actorId, tenantId: caller.tenantId, rbacRole: caller.rbacRole },
      paritySummary: getParityMatrixSummary(),
      sqlStats,
      connectors: connectors.connectors,
    });
  }

  if (subPath === "parity") {
    const status = url.searchParams.get("status") || "ALL";
    const priority = url.searchParams.get("priority") || "ALL";
    const group = url.searchParams.get("group") || "ALL";
    const q = url.searchParams.get("q") || "";
    const items = filterParityMatrix({ status, priority, group, search: q });
    return jsonRes({
      summary: getParityMatrixSummary(),
      fiveStudios: FIVE_ADVANCED_STUDIOS,
      additional12Categories: ADDITIONAL_12_CATEGORIES,
      count: items.length,
      totalCataloged: NOCTIS_100_CAPABILITY_PARITY_MATRIX.length,
      items,
      markdown: renderParityMatrixMarkdown(),
    });
  }

  if (subPath === "parity/sync") {
    if (request.method !== "POST") return jsonRes({ error: "Use POST /api/v2/assistant/parity/sync." }, 405);
    const synced = await syncParityMatrixToSql();
    return jsonRes({ ok: true, syncedCount: synced });
  }

  // --- RESEARCH AGENT & BROWSER FETCH ---
  if (subPath === "research") {
    const query = typeof body.query === "string" ? body.query.trim() : "";
    if (!query) return jsonRes({ error: "Missing query." }, 400);
    return jsonRes(
      await runDeepResearchAgent({
        query,
        maxSources: typeof body.maxSources === "number" ? body.maxSources : 8,
        includeLiveWeb: body.includeLiveWeb !== false,
        includeNdkrs: body.includeNdkrs !== false,
      }),
    );
  }
  if (subPath === "research/paper") {
    return jsonRes(analyzeAcademicPaper(String(body.text || "")));
  }
  if (subPath === "research/patent") {
    return jsonRes(analyzePublicPatent(String(body.text || body.query || "")));
  }
  if (subPath === "research/standards") {
    return jsonRes(compareRegulatoryStandards(String(body.standardA || "NIST 800-53"), String(body.standardB || "ISO 27001")));
  }
  if (subPath === "context/manage") {
    const turns = Array.isArray(body.turns)
      ? body.turns.map((t) => ({ role: String((t as Record<string, unknown>)?.role || "user"), content: String((t as Record<string, unknown>)?.content || "") }))
      : [];
    return jsonRes(
      buildManagedContextWindow({
        turns,
        memorySnippets: Array.isArray(body.memorySnippets) ? body.memorySnippets.map(String) : undefined,
        projectInstructions: typeof body.projectInstructions === "string" ? body.projectInstructions : undefined,
      }),
    );
  }
  if (subPath === "browser/fetch") {
    const targetUrl = typeof body.url === "string" ? body.url.trim() : "";
    if (!targetUrl) return jsonRes({ error: "Missing url." }, 400);
    const res = await fetchWebPageVerified(targetUrl);
    return jsonRes(res, res.ssrfBlocked ? 403 : 200);
  }

  // --- CODING AGENT & SANDBOX ---
  if (subPath === "code/analyze-repo") {
    return jsonRes(
      analyzeWorkspaceRepository({
        subdir: typeof body.subdir === "string" ? body.subdir : "src",
        query: typeof body.query === "string" ? body.query : undefined,
      }),
    );
  }
  if (subPath === "code/execute") {
    const code = typeof body.code === "string" ? body.code : "";
    const lang = (typeof body.language === "string" ? body.language : "auto") as "javascript" | "typescript" | "python" | "auto";
    return jsonRes(await executeSafeCodeSandbox({ code, language: lang }));
  }
  if (subPath === "code/propose-pr") {
    return jsonRes(
      generateCodingAgentProposal({
        title: String(body.title || "Noctis PR Proposal"),
        filePath: String(body.filePath || "src/index.ts"),
        originalCode: String(body.originalCode || ""),
        patchedCode: String(body.patchedCode || ""),
        summary: typeof body.summary === "string" ? body.summary : undefined,
      }),
    );
  }
  if (subPath === "code/generate-tests") {
    return jsonRes(
      generateUnitTestScaffold({
        moduleName: String(body.moduleName || "target.ts"),
        exportNames: Array.isArray(body.exportNames) ? body.exportNames.map(String) : ["runTarget"],
      }),
    );
  }
  if (subPath === "code/debug") {
    return jsonRes(diagnoseFailureTrace(String(body.stack || body.error || "")));
  }
  if (subPath === "code/generate-migration") {
    const cols = Array.isArray(body.columns)
      ? body.columns.map((c) => {
          const obj = (c && typeof c === "object" ? c : {}) as Record<string, unknown>;
          return { name: String(obj.name || "title"), sqlType: String(obj.sqlType || "TEXT"), notNull: Boolean(obj.notNull) };
        })
      : [{ name: "title", sqlType: "TEXT", notNull: true }];
    return jsonRes(generateSafeSqlMigration({ tableName: String(body.tableName || "enterprise.custom_items"), columns: cols, allowDestructive: body.allowDestructive === true }));
  }
  if (subPath === "code/profile") {
    return jsonRes(profileCodeOrQuery(String(body.code || "")));
  }
  if (subPath === "code/cicd") {
    return jsonRes(generateOrAuditCiCdPipeline(typeof body.yaml === "string" ? body.yaml : undefined));
  }
  if (subPath === "code/verify-deploy") {
    return jsonRes(
      await verifyDeploymentHealth({
        modelId: typeof body.modelId === "string" ? body.modelId : "noctis-core-v1",
        observedAccuracyPct: typeof body.observedAccuracyPct === "number" ? body.observedAccuracyPct : 99.1,
        criticalSafetyFailures: typeof body.criticalSafetyFailures === "number" ? body.criticalSafetyFailures : 0,
      }),
    );
  }

  // --- DATA ANALYSIS, CHARTS & MAPS ---
  if (subPath === "data/analyze") {
    return jsonRes(
      analyzeTabularDataset({
        rawText: String(body.rawText || "Dept,Spend\nCyber,12000\nCloud,18000\nAI,22000\nAnomaly,95000"),
        filename: typeof body.filename === "string" ? body.filename : "dataset.csv",
        filterColumn: typeof body.filterColumn === "string" ? body.filterColumn : undefined,
        filterValue: typeof body.filterValue === "string" ? body.filterValue : undefined,
        groupByColumn: typeof body.groupByColumn === "string" ? body.groupByColumn : undefined,
        valueColumn: typeof body.valueColumn === "string" ? body.valueColumn : undefined,
      }),
    );
  }
  if (subPath === "charts/build") {
    const labels = Array.isArray(body.labels) ? body.labels.map(String) : ["Q1", "Q2", "Q3", "Q4"];
    const series = Array.isArray(body.series)
      ? body.series.map((s) => {
          const o = (s && typeof s === "object" ? s : {}) as Record<string, unknown>;
          return { name: String(o.name || "Metric"), data: Array.isArray(o.data) ? o.data.map(Number) : [10, 20, 30, 40] };
        })
      : [{ name: "Metric", data: [10, 20, 30, 40] }];
    return jsonRes(
      buildInteractiveChartSpec({
        title: String(body.title || "Noctis Chart"),
        chartType: (typeof body.chartType === "string" ? body.chartType : "bar") as "bar" | "line" | "area" | "scatter" | "pie",
        labels,
        series,
      }),
    );
  }
  if (subPath === "maps/plan") {
    const locations = Array.isArray(body.locations) ? body.locations.map(String) : ["Washington", "London", "Accra"];
    const mode = (typeof body.mode === "string" ? body.mode : "flight") as "flight" | "drive" | "maritime";
    return jsonRes(planGeographicMapAndRoute({ locations, mode }));
  }

  // --- DOCUMENT STUDIO (.xlsx, .docx, .pdf, .pptx, uploads, compare, edit-section) ---
  if (subPath === "documents/generate") {
    const format = String(body.format || "pdf").toLowerCase();
    const title = String(body.title || "Noctis Executive Deliverable");
    const sections = Array.isArray(body.sections)
      ? body.sections.map((s) => {
          const o = (s && typeof s === "object" ? s : {}) as Record<string, unknown>;
          return {
            heading: String(o.heading || "Summary"),
            paragraphs: Array.isArray(o.paragraphs) ? o.paragraphs.map(String) : [String(o.content || "Generated cleanly.")],
          };
        })
      : [{ heading: "Executive Summary", paragraphs: [String(body.content || "Generated cleanly with verifiable metadata by Noctis Document Studio.")] }];

    let buf: Buffer;
    let mime: string;
    let ext: string;
    if (format === "xlsx") {
      const sheets = Array.isArray(body.sheets)
        ? body.sheets.map((s) => {
            const o = (s && typeof s === "object" ? s : {}) as Record<string, unknown>;
            return {
              name: String(o.name || "Data"),
              headers: Array.isArray(o.headers) ? o.headers.map(String) : ["Item", "Value"],
              rows: Array.isArray(o.rows) ? (o.rows as (string | number)[][]) : [["Status", "Verified"]],
            };
          })
        : [{ name: "Summary", headers: ["Section", "Excerpt"], rows: sections.map((s) => [s.heading, s.paragraphs[0] || ""]) }];
      buf = buildXlsxWorkbookBuffer(sheets);
      mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      ext = "xlsx";
    } else if (format === "docx") {
      buf = buildDocxDocumentBuffer({ title, author: caller.actorId, sections });
      mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      ext = "docx";
    } else if (format === "pptx") {
      const slides = Array.isArray(body.slides)
        ? body.slides.map((s) => {
            const o = (s && typeof s === "object" ? s : {}) as Record<string, unknown>;
            return { title: String(o.title || title), bullets: Array.isArray(o.bullets) ? o.bullets.map(String) : [String(o.content || "Key point")] };
          })
        : sections.map((s) => ({ title: s.heading, bullets: s.paragraphs }));
      buf = buildPptxPresentationBuffer({ title, author: caller.actorId, slides });
      mime = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
      ext = "pptx";
    } else {
      buf = buildPdfDocumentBuffer({ title, author: caller.actorId, sections });
      mime = "application/pdf";
      ext = "pdf";
    }

    const filename = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 32) || "noctis-doc"}.${ext}`;
    if (body.download === true || url.searchParams.get("download") === "true") {
      return new Response(new Uint8Array(buf), {
        status: 200,
        headers: {
          "content-type": mime,
          "content-disposition": `attachment; filename="${filename}"`,
          "cache-control": "no-store",
          ...CORS_HEADERS,
        },
      });
    }
    return jsonRes({
      ok: true,
      format: ext,
      filename,
      mimeType: mime,
      byteLength: buf.length,
      sha256: sha256Sync(buf.toString("base64")),
      base64: buf.toString("base64"),
    });
  }
  if (subPath === "documents/compare") {
    return jsonRes(
      compareTwoDocuments({
        titleA: String(body.titleA || "Document A"),
        textA: String(body.textA || ""),
        titleB: String(body.titleB || "Document B"),
        textB: String(body.textB || ""),
      }),
    );
  }
  if (subPath === "documents/edit-section") {
    return jsonRes(
      editDocumentSectionPreservingFormat({
        markdown: String(body.markdown || ""),
        targetHeading: String(body.targetHeading || "Summary"),
        replacementBody: String(body.replacementBody || ""),
      }),
    );
  }
  if (subPath === "files/analyze") {
    return jsonRes(parseUploadedTabularFile(String(body.filename || "data.csv"), String(body.content || "")));
  }

  // --- IMAGES, VISION, VOICE, TRANSLATION ---
  if (subPath === "images/generate" || subPath === "images/edit") {
    return jsonRes(
      generateOrEditImage({
        mode: subPath.endsWith("edit") ? "EDIT" : "GENERATE",
        prompt: String(body.prompt || "Noctis Architecture Concept"),
        overlayCaption: typeof body.overlayCaption === "string" ? body.overlayCaption : undefined,
        accentHex: typeof body.accentHex === "string" ? body.accentHex : undefined,
      }),
    );
  }
  if (subPath === "vision/analyze") {
    return jsonRes(
      analyzeVisionImage({
        base64OrDataUri: typeof body.image === "string" ? body.image : undefined,
        notesOrErrorText: typeof body.notes === "string" ? body.notes : undefined,
      }),
    );
  }
  if (subPath === "voice/transcribe") {
    return jsonRes(analyzeAudioTranscript({ transcript: String(body.transcript || ""), language: typeof body.language === "string" ? body.language : "en-US" }));
  }
  if (subPath === "voice/speak") {
    const spec = prepareVoiceResponseSpec({
      text: String(body.text || ""),
      personaId: typeof body.personaId === "string" ? body.personaId : "maple",
      languageCode: typeof body.languageCode === "string" ? body.languageCode : "en-US",
    });
    if (body.synthesize === false || spec.speakableText.length < 2) {
      return jsonRes({ ...spec, voiceEngine: "spec-only" });
    }
    const { neuralVoice, instructions: defaultInstructions } = resolveHumanNeuralVoice(
      spec.personaId,
      spec.languageCode,
    );
    const { vibeSayBinary } = await import("../noctis-desk.server.ts");
    const audioRes = await vibeSayBinary(spec.speakableText, {
      keyOverride: typeof body.apiKey === "string" ? body.apiKey : "",
      voice: neuralVoice,
      speed: typeof body.speed === "number" ? body.speed : undefined,
      instructions:
        typeof body.instructions === "string" && body.instructions.trim()
          ? body.instructions.trim()
          : defaultInstructions,
    });
    if ("buffer" in audioRes) {
      if (body.binary === true) {
        return new Response(new Uint8Array(audioRes.buffer), {
          status: 200,
          headers: {
            "content-type": audioRes.contentType,
            "cache-control": "no-store",
            "x-noctis-voice-model": audioRes.model,
            "x-noctis-voice-name": audioRes.voice,
            ...CORS_HEADERS,
          },
        });
      }
      return jsonRes({
        ...spec,
        voiceEngine: "openai-gpt4o-mini-tts-human",
        model: audioRes.model,
        neuralVoice: audioRes.voice,
        byteLength: audioRes.buffer.byteLength,
        audio: `data:audio/mpeg;base64,${Buffer.from(audioRes.buffer).toString("base64")}`,
      });
    }
    return jsonRes({
      ...spec,
      voiceEngine: "fallback-unavailable",
      neuralVoice,
      audio: null,
      error: audioRes.error,
    });
  }
  if (subPath === "translate") {
    return jsonRes(await translateText({ text: String(body.text || ""), targetLang: String(body.targetLang || "es") }));
  }

  // --- MEMORY (Save, List, Correct/Update, Delete) ---
  if (subPath === "memory") {
    if (request.method === "GET") {
      const records = await listUserMemory(url.searchParams.get("userId") || undefined, 25);
      return jsonRes({ count: records.length, records });
    }
    if (request.method === "PATCH") {
      const id = String(body.id || "");
      const content = String(body.content || "");
      if (!id || !content) return jsonRes({ error: "Missing id and content." }, 400);
      const pol = enforcePrivacyPolicy({ text: content, purpose: "memory_correction", consentGranted: true });
      return jsonRes(await updateUserMemory(id, pol.redactedText));
    }
    if (request.method === "DELETE") {
      const id = String(url.searchParams.get("id") || body.id || "");
      return jsonRes(await deleteUserMemory(id));
    }
    const content = String(body.content || "");
    const pol = enforcePrivacyPolicy({ text: content, purpose: String(body.purpose || "user_preference"), consentGranted: body.consentGranted === true });
    if (!pol.compliant) return jsonRes({ saved: false, policy: pol }, 422);
    return jsonRes(await saveUserMemory({ userId: String(body.userId || caller.actorId), tenantId: caller.tenantId, purpose: String(body.purpose || "user_preference"), contentRedacted: pol.redactedText, consentGranted: true }));
  }

  // --- CUSTOM ASSISTANTS (#37) ---
  if (subPath === "custom-assistants") {
    if (request.method === "GET") {
      const assistants = await listCustomAssistants();
      return jsonRes({ count: assistants.length, assistants });
    }
    if (request.method === "DELETE") {
      return jsonRes(await deleteCustomAssistant(String(url.searchParams.get("id") || "")));
    }
    return jsonRes(
      await upsertCustomAssistant({
        id: typeof body.id === "string" ? body.id : undefined,
        name: String(body.name || "Domain Specialist"),
        tagline: String(body.tagline || "Verified assistant"),
        specialistEngine: String(body.specialistEngine || "NOCTIS-CORE-001"),
        systemInstructions: String(body.systemInstructions || "Follow deterministic sources and Safety Gate."),
        enabledTools: Array.isArray(body.enabledTools) ? body.enabledTools.map(String) : ["research", "documents", "verify"],
        createdBy: caller.actorId,
      }),
    );
  }

  // --- WORKSPACES & REVISION DOCUMENTS (#38, #59, #77) ---
  if (subPath === "workspaces") {
    if (request.method === "GET") {
      const workspaces = await listWorkspaces();
      return jsonRes({ count: workspaces.length, workspaces });
    }
    return jsonRes(
      await createWorkspace({
        id: typeof body.id === "string" ? body.id : undefined,
        name: String(body.name || "Default Project Workspace"),
        description: String(body.description || "Shared project space"),
        ownerId: caller.actorId,
        projectInstructions: typeof body.projectInstructions === "string" ? body.projectInstructions : undefined,
      }),
    );
  }
  if (subPath === "workspaces/documents") {
    if (request.method === "GET") {
      const docs = await listWorkspaceDocuments(url.searchParams.get("workspaceId") || undefined);
      return jsonRes({ count: docs.length, documents: docs });
    }
    return jsonRes(
      await saveWorkspaceDocumentRevision({
        workspaceId: String(body.workspaceId || "WS-DEFAULT"),
        title: String(body.title || "Untitled Research Notebook"),
        docFormat: typeof body.docFormat === "string" ? body.docFormat : "markdown",
        contentMarkdown: String(body.contentMarkdown || ""),
        updatedBy: caller.actorId,
      }),
    );
  }

  // --- SCHEDULED TASKS (#26, #60, #72) ---
  if (subPath === "schedules") {
    if (request.method === "GET") {
      const tasks = await listScheduledTasks();
      return jsonRes({ count: tasks.length, tasks });
    }
    return jsonRes(
      await createScheduledTask({
        title: String(body.title || "Source Freshness & Research Watch"),
        taskType: (typeof body.taskType === "string" ? body.taskType : "RESEARCH_WATCH") as "RESEARCH_WATCH",
        cronOrIso: String(body.cronOrIso || "0 8 * * 1"),
        payload: (body.payload && typeof body.payload === "object" ? body.payload : {}) as Record<string, unknown>,
        createdBy: caller.actorId,
      }),
    );
  }
  if (subPath === "schedules/run") {
    return jsonRes(await runScheduledTaskNow(String(body.id || "SCH-DEFAULT"), String(body.summary || "Executed verification scan: all checks fresh.")));
  }

  // --- CONNECTORS, EMAIL, CALENDAR, PRODUCTIVITY, WORKFLOWS, COMPUTER USE ---
  if (subPath === "connectors") return jsonRes(listConnectedAppsStatus());
  if (subPath === "connectors/email") {
    return jsonRes(
      draftOrSendEmail({
        to: String(body.to || "team@example.com"),
        subject: String(body.subject || "Noctis Brief"),
        body: String(body.body || "Prepared draft."),
        action: (typeof body.action === "string" ? body.action : "DRAFT") as "DRAFT" | "TRIAGE" | "SEND_REQUEST",
        humanApproved: body.humanApproved === true,
      }),
    );
  }
  if (subPath === "connectors/calendar") {
    return jsonRes(
      await createCalendarEventAndIcs({
        title: String(body.title || "Project Sync"),
        startIso: String(body.startIso || new Date(Date.now() + 86400_000).toISOString()),
        durationMinutes: typeof body.durationMinutes === "number" ? body.durationMinutes : 45,
        attendees: Array.isArray(body.attendees) ? body.attendees.map(String) : [],
      }),
    );
  }
  if (subPath === "productivity/meeting-prep") return jsonRes(prepareMeetingBrief({ topic: String(body.topic || "Sprint Sync") }));
  if (subPath === "productivity/meeting-summary") return jsonRes(summarizeMeetingTranscript(String(body.transcript || "")));
  if (subPath === "productivity/next-steps") return jsonRes(await suggestNextActionsFromWorkspace());
  if (subPath === "workflows") {
    if (request.method === "GET") {
      const runs = await listWorkflowRuns();
      return jsonRes({ count: runs.length, runs });
    }
    return jsonRes(
      await runAutonomousWorkflow({
        workflowName: String(body.workflowName || "Research & Draft Pipeline"),
        objective: String(body.objective || "Verify standards compliance"),
        externalWriteRequested: body.externalWriteRequested === true,
        actorId: caller.actorId,
      }),
    );
  }
  if (subPath === "workflows/approve") {
    const res = await approveWorkflowRun(String(body.id || ""), String(body.approver || ""));
    return jsonRes(res, res.approved ? 200 : 403);
  }
  if (subPath === "computer-use/propose") {
    return jsonRes(proposeComputerUsePlan(String(body.task || "")));
  }

  // --- REASONING (#41, #47, #49, #50) & DISTINCTIVE MOAT (#91-#100) ---
  if (subPath === "reasoning/budget") return jsonRes(classifyReasoningBudget(String(body.query || "")));
  if (subPath === "reasoning/causal") return jsonRes(analyzeCausalityVsCorrelation(String(body.statement || "")));
  if (subPath === "reasoning/counterfactual") {
    return jsonRes(
      runCounterfactualAnalysis({
        scenarioName: String(body.scenarioName || "Capacity Stress"),
        baselineCostUsd: typeof body.baselineCostUsd === "number" ? body.baselineCostUsd : undefined,
        baselineCapacity: typeof body.baselineCapacity === "number" ? body.baselineCapacity : undefined,
        baselineDemand: typeof body.baselineDemand === "number" ? body.baselineDemand : undefined,
        demandGrowthPct: typeof body.demandGrowthPct === "number" ? body.demandGrowthPct : undefined,
        efficiencyGainPct: typeof body.efficiencyGainPct === "number" ? body.efficiencyGainPct : undefined,
      }),
    );
  }
  if (subPath === "reasoning/optimize") {
    const opts = Array.isArray(body.options) ? (body.options as { name: string; safetyScore: number; speedScore: number; costEfficiencyScore: number }[]) : [];
    return jsonRes(evaluatePlanTradeoffs(opts));
  }
  if (subPath === "moat/passport") {
    if (request.method === "GET") return jsonRes({ passports: await listAnswerPassports() });
    return jsonRes(
      await issueAnswerPassport({
        domain: String(body.domain || "general"),
        promptText: String(body.promptText || ""),
        inputs: (body.inputs && typeof body.inputs === "object" ? body.inputs : {}) as Record<string, unknown>,
        answerSummary: String(body.answerSummary || ""),
        sourceVersions: Array.isArray(body.sourceVersions) ? (body.sourceVersions as { sourceId: string; version: string }[]) : [],
        calculationTrace: Array.isArray(body.calculationTrace) ? (body.calculationTrace as { step: string; formula: string; result: string | number }[]) : [],
        createdBy: caller.actorId,
      }),
    );
  }
  if (subPath === "moat/replay") return jsonRes(await replayAnswerPassport(String(body.passportId || "")));
  if (subPath === "moat/knowledge-gap") return jsonRes(await detectAndQueueKnowledgeGap({ query: String(body.query || ""), domain: (String(body.domain || "general") as NdkrsDomain) }));
  if (subPath === "moat/failure-to-fix") {
    return jsonRes(
      await convertFailureToFixTicket({
        defectId: String(body.defectId || "DEF-001"),
        domain: String(body.domain || "general"),
        promptSample: String(body.promptSample || "Sample failure"),
        filePath: String(body.filePath || "src/target.ts"),
        originalCode: String(body.originalCode || "const x = 1;"),
        patchedCode: String(body.patchedCode || "const x = 2;"),
        summary: String(body.summary || "Fix edge case"),
      }),
    );
  }
  if (subPath === "moat/resolve-conflict") {
    return jsonRes(
      resolveSourceConflictByJurisdiction({
        context: (typeof body.context === "string" ? body.context : "COMMERCIAL_GENERAL") as "COMMERCIAL_GENERAL",
        authorityA: (body.authorityA as { name: string; level: "STATUTE_REGULATION"; position: string }) || { name: "Statute", level: "STATUTE_REGULATION", position: "Mandatory" },
        authorityB: (body.authorityB as { name: string; level: "BLOG"; position: string }) || { name: "Blog", level: "BLOG", position: "Informal" },
      }),
    );
  }
  if (subPath === "moat/certification-gate") return jsonRes(await evaluateDomainCertificationGate((String(body.domain || "assistant") as "assistant")));
  if (subPath === "moat/execution-passport") return jsonRes(await issueExecutionPassport(typeof body.workflowRunId === "string" ? body.workflowRunId : undefined));
  if (subPath === "moat/freshness-check") return jsonRes(await checkStalePassportsAgainstFreshness());
  if (subPath === "moat/observatory") return jsonRes(await getModelQualityObservatory());

  // --- 100-TASK REAL BENCHMARK ---
  if (subPath === "benchmark-100" || subPath === "benchmark-100/run") {
    if (request.method === "GET") {
      const runs = await listBenchmarkRuns(5);
      return jsonRes({ runs });
    }
    return jsonRes(await run100TaskBenchmark({ persist: body.persist !== false, executedBy: caller.actorId }));
  }

  return jsonRes({ error: "Unknown /api/v2/assistant route", subPath }, 404);
}
