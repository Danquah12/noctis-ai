import { createServerFn } from "@tanstack/react-start";
import { noctisSkill, type NoctisSkillId } from "@/lib/noctis-skills";
import { clipTurn, retainSources } from "@/lib/noctis-hard";

export type VibeTurn = { role: "user" | "assistant"; content: string; images?: string[] };

function cleanImages(value: unknown) {
  if (!Array.isArray(value)) return [];
  const images: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    if (/^data:image\/(?:png|jpeg|jpg|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(item)) {
      if (item.length > 1_400_000) continue;
    } else if (!(/^https:\/\/\S+$/i.test(item) && item.length < 800 && !/\.(mp4|webm|mov)(\?|$)/i.test(item))) continue;
    images.push(item);
    if (images.length >= 2) break;
  }
  return images;
}

export const askNoctis = createServerFn({ method: "POST" })
  .validator((input: { turns?: VibeTurn[]; desk?: unknown; think?: unknown; code?: unknown; skill?: unknown; depth?: unknown; level?: unknown; context?: unknown; language?: unknown; brain?: unknown }) => {
    const turns: VibeTurn[] = [];
    if (Array.isArray(input?.turns)) {
      for (const turn of input.turns) {
        if (!turn || (turn.role !== "user" && turn.role !== "assistant") || typeof turn.content !== "string") continue;
        const content = clipTurn(turn.role, turn.content);
        const images = turn.role === "user" ? cleanImages(turn.images) : [];
        if (!content && !images.length) continue;
        turns.push({ role: turn.role, content: content || "Look at the uploaded image.", ...(images.length ? { images } : {}) });
      }
    }
    const picked = noctisSkill(typeof input?.skill === "string" ? input.skill : "talk");
    const levels = ["beginner", "intermediate", "advanced", "expert"] as const;
    const level = levels.find((item) => item === input?.level) ?? "beginner";
    return {
      turns: retainSources(turns),
      desk: input?.desk === "study" ? ("study" as const) : ("chat" as const),
      think: input?.think === true,
      code: input?.code === true,
      skill: picked.id as NoctisSkillId,
      depth: input?.depth === "deep" ? ("deep" as const) : ("plain" as const),
      level,
      context: typeof input?.context === "string" ? input.context.slice(0, 1800) : "",
      language: typeof input?.language === "string" ? input.language.trim().slice(0, 40) : "English",
      brain: input?.brain && typeof input.brain === "object" ? {
        provider: typeof (input.brain as any).provider === "string" ? (input.brain as any).provider : "gemini",
        apiKey: typeof (input.brain as any).apiKey === "string" ? (input.brain as any).apiKey.slice(0, 500) : "",
        model: typeof (input.brain as any).model === "string" ? (input.brain as any).model.slice(0, 100) : "",
        endpoint: typeof (input.brain as any).endpoint === "string" ? (input.brain as any).endpoint.slice(0, 500) : "",
      } : undefined,
    };
  })
  .handler(async ({ data }) => {
    if (!data.turns.some((turn) => turn.role === "user")) return { error: "Write a question first." };
    try {
      const { getSessionUser } = await import("@/lib/auth/verify.server");
      const who = await getSessionUser();
      const asked = [...data.turns].reverse().find((turn) => turn.role === "user");
      if (who && asked?.content) {
        const { recordActivity } = await import("@/lib/activity.server");
        await recordActivity({
          userId: who.id,
          action: "vibe",
          detail: asked.content.replace(/\s+/g, " ").trim().slice(0, 180),
          surface: data.desk,
        });
      }
    } catch {
      /* asking Vibe still works if the trail cannot be written */
    }
    const { vibeReply } = await import("@/lib/noctis-desk.server");
    const { callerKey, guardRate } = await import("@/lib/security.server");
    let whoId = "";
    try {
      const { getSessionUser } = await import("@/lib/auth/verify.server");
      whoId = (await getSessionUser())?.id || "";
    } catch {
      whoId = "";
    }
    await guardRate(`vibe:${callerKey(whoId)}`, 20, 10 * 60 * 1000);
    let baked = "";
    try {
      const keyMod = await import("virtual:openai-key");
      baked = typeof keyMod.OPENAI_API_KEY === "string" ? keyMod.OPENAI_API_KEY : "";
    } catch {
      baked = "";
    }
    return vibeReply(data.turns, baked, { desk: data.desk, think: data.think, code: data.code, skill: data.skill, depth: data.depth, level: data.level, context: data.context, language: data.language, brain: data.brain });
  });

async function bakedKey() {
  try {
    const keyMod = await import("virtual:openai-key");
    return typeof keyMod.OPENAI_API_KEY === "string" ? keyMod.OPENAI_API_KEY : "";
  } catch {
    return "";
  }
}

export const drawVibe = createServerFn({ method: "POST" })
  .validator((input: { prompt?: unknown }) => ({ prompt: typeof input?.prompt === "string" ? input.prompt.slice(0, 1000) : "" }))
  .handler(async ({ data }) => {
    const { vibeDraw } = await import("@/lib/noctis-desk.server");
    return vibeDraw(data.prompt, await bakedKey());
  });

export const hearVibe = createServerFn({ method: "POST" })
  .validator((input: { audio?: unknown }) => {
    const audio = typeof input?.audio === "string" ? input.audio : "";
    return { audio: audio.startsWith("data:audio/") && audio.length < 6_000_000 ? audio : "" };
  })
  .handler(async ({ data }) => {
    if (!data.audio) return { error: "That recording could not be read." };
    const { vibeHear } = await import("@/lib/noctis-desk.server");
    return vibeHear(data.audio, await bakedKey());
  });

export const sayVibe = createServerFn({ method: "POST" })
  .validator((input: { text?: unknown; voice?: unknown; speed?: unknown; keyOverride?: unknown }) => ({
    text: typeof input?.text === "string" ? input.text.slice(0, 4000) : "",
    voice: input?.voice === "onyx" || input?.voice === "nova" || input?.voice === "alloy" || input?.voice === "echo" || input?.voice === "fable" || input?.voice === "shimmer" ? input.voice : "alloy",
    speed: typeof input?.speed === "number" && input.speed >= 0.7 && input.speed <= 1.2 ? input.speed : 0,
    keyOverride: typeof input?.keyOverride === "string" ? input.keyOverride.trim() : "",
  }))
  .handler(async ({ data }) => {
    const { vibeSay } = await import("@/lib/noctis-desk.server");
    return vibeSay(data.text, data.keyOverride || (await bakedKey()), data.voice, data.speed);
  });

export const trainVibe = createServerFn({ method: "POST" })
  .validator((input: { action?: unknown; question?: unknown; answer?: unknown; rule?: unknown; kind?: unknown; id?: unknown; reason?: unknown }) => ({
    action: input?.action === "train" || input?.action === "rule" || input?.action === "export" || input?.action === "approve" || input?.action === "reject" || input?.action === "pending" ? input.action : ("status" as const),
    question: typeof input?.question === "string" ? input.question.trim().slice(0, 800) : "",
    answer: typeof input?.answer === "string" ? input.answer.trim().slice(0, 6000) : "",
    rule: typeof input?.rule === "string" ? input.rule.trim().slice(0, 320) : "",
    kind: (input?.kind === "pair" || input?.kind === "rule" ? input.kind : "pair") as "pair" | "rule",
    id: typeof input?.id === "string" ? input.id.trim().slice(0, 160) : "",
    reason: typeof input?.reason === "string" ? input.reason.trim().slice(0, 500) : "",
  }))
  .handler(async ({ data }) => {
    const { requireUserId } = await import("@/lib/auth/verify.server");
    const { callerKey, guardRate } = await import("@/lib/security.server");
    const userId = await requireUserId();
    await guardRate(`noctis-training:${callerKey(userId)}`, 10, 10 * 60 * 1000);
    const { rememberRule, trainingStatus, exportTrainingJsonl, reviewTrainingSubmission, pendingTrainingSubmissions } = await import("@/lib/noctis-train.server");
    if (data.action === "pending") {
      const { requireNoctisLearningReviewer } = await import("@/lib/admin-api");
      await requireNoctisLearningReviewer(userId);
      return { ok: true, pending: await pendingTrainingSubmissions(100, userId) };
    }
    if (data.action === "approve" || data.action === "reject") {
      const { requireNoctisLearningReviewer } = await import("@/lib/admin-api");
      await requireNoctisLearningReviewer(userId);
      const decision = data.action === "approve" ? "approved" : "rejected";
      if (data.kind === "pair") {
        const { getNoctisTrainingDatabase } = await import("@/lib/noctis-training-db-adapter.server");
        const { reviewNoctisTrainingExample } = await import("@/lib/noctis-training-data-persistence.server");
        const { randomUUID } = await import("node:crypto");
        const review = await reviewNoctisTrainingExample(await getNoctisTrainingDatabase(), {
          tenantId: userId, actorId: userId, pairId: data.id, decision, reason: data.reason,
          at: new Date().toISOString(), auditId: randomUUID(),
        });
        if (!review.ok) return { ok: false, reason: review.code, status: await trainingStatus() };
        return { ok: true, kind: "pair", id: data.id, decision, status: await trainingStatus() };
      }
      const review = await reviewTrainingSubmission({
        kind: "rule", id: data.id, decision, reviewerId: userId, reason: data.reason,
      });
      return { ...review, status: await trainingStatus() };
    }
    if (data.action === "train") {
      const { getNoctisTrainingDatabase } = await import("@/lib/noctis-training-db-adapter.server");
      const { submitNoctisTrainingExample } = await import("@/lib/noctis-training-data-persistence.server");
      const { randomUUID } = await import("node:crypto");
      const submissionId = randomUUID();
      const result = await submitNoctisTrainingExample(await getNoctisTrainingDatabase(), {
        tenantId: userId, actorId: userId, pairId: submissionId,
        question: data.question, answer: data.answer, domain: "general", model: "user-taught",
        at: new Date().toISOString(), auditId: randomUUID(),
      });
      const status = await trainingStatus();
      return result.ok
        ? { ok: true, reason: "Saved durably as a quarantined candidate. It is not active training data.", submissionId, status }
        : { ok: false, reason: result.code, submissionId: "", status };
    }
    if (data.action === "rule") {
      const res = await rememberRule(data.rule, "general", userId);
      const status = await trainingStatus();
      return { ok: res.ok, reason: res.reason || "", status };
    }
    if (data.action === "export") {
      const jsonl = await exportTrainingJsonl();
      const status = await trainingStatus();
      return { ok: true, jsonl, status };
    }
    const status = await trainingStatus();
    return { ok: true, status };
  });

export const testBrainConnection = createServerFn({ method: "POST" })
  .validator((input: { provider?: unknown; apiKey?: unknown; model?: unknown; endpoint?: unknown }) => {
    return {
      provider: typeof input?.provider === "string" ? input.provider : "gemini",
      apiKey: typeof input?.apiKey === "string" ? input.apiKey.trim() : "",
      model: typeof input?.model === "string" ? input.model.trim() : "",
      endpoint: typeof input?.endpoint === "string" ? input.endpoint.trim() : "",
    };
  })
  .handler(async ({ data }) => {
    const { requireUserId } = await import("@/lib/auth/verify.server");
    const userId = await requireUserId();
    const { callerKey, guardRate } = await import("@/lib/security.server");
    await guardRate(`noctis-model-test:${callerKey(userId)}`, 5, 10 * 60 * 1000);
    if (!data.apiKey && data.provider !== "custom") {
      return { ok: false, error: "Please enter an API key." };
    }
    const start = Date.now();
    try {
      const { modelChat } = await import("@/lib/video-mind.server");
      const res = await modelChat(
        [{ role: "user", content: "Reply with the single word: OK" }],
        { maxTokens: 16, temperature: 0, brain: data }
      );
      if ("error" in res) return { ok: false, error: res.error };
      const latencyMs = Date.now() - start;
      return { ok: true, latencyMs, model: data.model || data.provider, reply: res.text };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      return { ok: false, error: msg };
    }
  });

/**
 * Submit text as quarantined Noctis source material. No URL is fetched and no
 * content becomes active knowledge until an authorized reviewer approves it.
 */
export const submitNoctisSource = createServerFn({ method: "POST" })
  .validator((input: {
    title?: unknown; domain?: unknown; content?: unknown; canonicalUri?: unknown;
    publisher?: unknown; jurisdiction?: unknown; sourceVersion?: unknown; license?: unknown;
    classification?: unknown;
  }) => ({
    title: typeof input?.title === "string" ? input.title.slice(0, 240) : "",
    domain: typeof input?.domain === "string" ? input.domain.slice(0, 80) : "",
    content: typeof input?.content === "string" ? input.content.slice(0, 500_000) : "",
    canonicalUri: typeof input?.canonicalUri === "string" ? input.canonicalUri.slice(0, 1000) : "",
    publisher: typeof input?.publisher === "string" ? input.publisher.slice(0, 200) : "",
    jurisdiction: typeof input?.jurisdiction === "string" ? input.jurisdiction.slice(0, 120) : "",
    sourceVersion: typeof input?.sourceVersion === "string" ? input.sourceVersion.slice(0, 120) : "",
    license: typeof input?.license === "string" ? input.license.slice(0, 240) : "",
    classification: ["public", "internal", "confidential", "restricted"].includes(String(input?.classification))
      ? input.classification as "public" | "internal" | "confidential" | "restricted"
      : "public" as const,
  }))
  .handler(async ({ data }) => {
    const { requireUserId } = await import("@/lib/auth/verify.server");
    const { callerKey, guardRate } = await import("@/lib/security.server");
    const userId = await requireUserId();
    await guardRate(`noctis-source-submit:${callerKey(userId)}`, 5, 10 * 60 * 1000);
    const { registerNoctisTextSource } = await import("@/lib/noctis-source-ingestion.server");
    return registerNoctisTextSource(data, userId);
  });

/** Owner/MFA-only source review queue and approval/rejection actions. */
export const manageNoctisSources = createServerFn({ method: "POST" })
  .validator((input: { action?: unknown; sourceId?: unknown; reason?: unknown }) => ({
    action: input?.action === "approve" || input?.action === "reject" ? input.action : "pending",
    sourceId: typeof input?.sourceId === "string" ? input.sourceId.trim().slice(0, 160) : "",
    reason: typeof input?.reason === "string" ? input.reason.trim().slice(0, 500) : "",
  }))
  .handler(async ({ data }) => {
    const { requireUserId } = await import("@/lib/auth/verify.server");
    const userId = await requireUserId();
    const { requireNoctisLearningReviewer } = await import("@/lib/admin-api");
    await requireNoctisLearningReviewer(userId);
    const { pendingNoctisSources, reviewNoctisSource } = await import("@/lib/noctis-source-ingestion.server");
    if (data.action === "pending") return { ok: true, pending: await pendingNoctisSources() };
    return reviewNoctisSource({
      sourceId: data.sourceId,
      decision: data.action === "approve" ? "approved" : "rejected",
      reviewerId: userId,
      reason: data.reason,
    });
  });

/**
 * Evidence lookup for server-side Noctis workflows. This endpoint returns
 * citations/snippets only; callers must not represent lexical matches as
 * semantic relevance or as proof that a claim is true.
 */
export const retrieveNoctisEvidence = createServerFn({ method: "POST" })
  .validator((input: { query?: unknown; domain?: unknown; limit?: unknown }) => ({
    query: typeof input?.query === "string" ? input.query.trim().slice(0, 2000) : "",
    domain: typeof input?.domain === "string" ? input.domain.trim().slice(0, 80) : "",
    limit: typeof input?.limit === "number" && Number.isFinite(input.limit)
      ? Math.max(1, Math.min(10, Math.trunc(input.limit)))
      : 5,
  }))
  .handler(async ({ data }) => {
    const { requireUserId } = await import("@/lib/auth/verify.server");
    const { callerKey, guardRate } = await import("@/lib/security.server");
    const userId = await requireUserId();
    await guardRate(`noctis-evidence:${callerKey(userId)}`, 30, 10 * 60 * 1000);
    if (data.query.length < 3) throw new Error("Enter at least 3 characters to search evidence.");
    const { retrieveApprovedNoctisEvidence } = await import("@/lib/noctis-evidence-retrieval.server");
    return retrieveApprovedNoctisEvidence({
      query: data.query,
      domain: data.domain,
      userId,
      limit: data.limit,
    });
  });


/**
 * Return the descriptive engine registry to authenticated clients.
 * This endpoint exposes metadata only; it does not execute specialist engines.
 */
export const getNoctisEngineRegistry = createServerFn({ method: "GET" })
  .handler(async () => {
    const { requireUserId } = await import("@/lib/auth/verify.server");
    await requireUserId();
    const { listNoctisEngines } = await import("@/lib/noctis-engine-registry");
    return {
      engines: listNoctisEngines(),
      executionEnabled: false,
      note: "Registry metadata only. Engine execution is not enabled by this endpoint.",
    };
  });

