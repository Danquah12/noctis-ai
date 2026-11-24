/**
 * Noctis Persistent Routed Chat Response Store
 *
 * Establishes durable archival and retrieval for every routed Noctis Chat answer:
 * - Retrieve by response ID: `GET /api/noctis?responseId=RSP-...` or `/noctis?response=RSP-...`
 * - Query/filter by engine or keyword: `GET /api/noctis?responses=1&engine=rmf_grc&q=NIST`
 * - Uses PostgreSQL (Neon) / PGlite via `ensureForgeSchema()` + in-memory ring buffer fallback.
 * - Fail-closed classification safety: never stores raw classified prompts/bodies on gate blocks.
 *
 * Uses pure relative `.ts` imports so it runs under Vite SSR, tsx, and `node --experimental-strip-types --test`.
 */

import { sha256Sync } from "./universal-crypto.ts";
import { ensureForgeSchema } from "./forge/forge-persistence.server.ts";
import {
  isValidNoctisPanelId,
  parseRouteStamp,
  type NoctisPanelId,
  type NoctisRouteEngineId,
} from "./noctis-capability-registry.ts";

export interface RoutedChatResponseRecord {
  id: string;
  routeId: NoctisRouteEngineId;
  routeLabel: string;
  targetPanel: NoctisPanelId;
  confidence: number;
  override: boolean;
  command?: string;
  prompt: string;
  responseText: string;
  summary: string;
  latencyMs: number;
  createdAt: string;
}

const MAX_MEM_RESPONSES = 100;
const memResponses: RoutedChatResponseRecord[] = [];
let responseSchemaReady: Promise<void> | null = null;

async function ensureResponseStoreSchema() {
  const { sql, dbSource } = await ensureForgeSchema();
  if (!responseSchemaReady) {
    responseSchemaReady = (async () => {
      await sql.query(`
        CREATE TABLE IF NOT EXISTS enterprise.noctis_chat_responses (
          id TEXT PRIMARY KEY,
          route_id TEXT NOT NULL,
          route_label TEXT NOT NULL,
          target_panel TEXT NOT NULL,
          confidence INTEGER NOT NULL DEFAULT 90,
          is_override BOOLEAN NOT NULL DEFAULT FALSE,
          command TEXT,
          prompt TEXT NOT NULL,
          response_text TEXT NOT NULL,
          summary TEXT NOT NULL,
          latency_ms INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      await sql.query(`
        CREATE INDEX IF NOT EXISTS idx_noctis_chat_responses_created
          ON enterprise.noctis_chat_responses (created_at DESC)
      `);
      await sql.query(`
        CREATE INDEX IF NOT EXISTS idx_noctis_chat_responses_route
          ON enterprise.noctis_chat_responses (route_id, created_at DESC)
      `);
    })().catch((err) => {
      responseSchemaReady = null;
      throw err;
    });
  }
  await responseSchemaReady;
  return { sql, dbSource };
}

function sanitizeResponseForStorage(rawPrompt: string, rawText: string) {
  const cleanBody = parseRouteStamp(
    String(rawText || "")
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      .trim(),
  ).cleanText;

  if (/FAIL_CLOSED_BLOCK|FAIL CLOSED|HARD GATE 0 VETO/i.test(cleanBody)) {
    return {
      prompt: "[REDACTED — Classification Boundary Gate]",
      responseText: "Blocked by Noctis Fail-Closed Classification Boundary Gate.",
      summary: "Blocked by Fail-Closed Classification Boundary Gate.",
    };
  }

  const prompt = String(rawPrompt || "").trim().slice(0, 4000);
  const responseText = cleanBody.slice(0, 32000);
  const firstMeaningfulLine =
    cleanBody
      .split(/\r?\n/)
      .map((line) => line.replace(/^#+\s*/, "").replace(/\*\*/g, "").trim())
      .find((line) => line.length >= 12 && !line.startsWith("```") && !line.startsWith("Target:")) ||
    cleanBody;
  const summary = firstMeaningfulLine.replace(/\s+/g, " ").trim().slice(0, 180);

  return { prompt, responseText, summary };
}

function recordFromRow(row: any): RoutedChatResponseRecord {
  const rawCreated = row?.created_at instanceof Date ? row.created_at.toISOString() : String(row?.created_at || new Date().toISOString());
  return {
    id: String(row.id),
    routeId: String(row.route_id) as NoctisRouteEngineId,
    routeLabel: String(row.route_label),
    targetPanel: isValidNoctisPanelId(row.target_panel) ? row.target_panel : "chat",
    confidence: Number(row.confidence ?? 90),
    override: Boolean(row.is_override),
    ...(row.command ? { command: String(row.command) } : {}),
    prompt: String(row.prompt || ""),
    responseText: String(row.response_text || ""),
    summary: String(row.summary || ""),
    latencyMs: Number(row.latency_ms ?? 0),
    createdAt: rawCreated,
  };
}

function pushMemRecord(record: RoutedChatResponseRecord) {
  const existingIdx = memResponses.findIndex((r) => r.id === record.id);
  if (existingIdx >= 0) {
    memResponses.splice(existingIdx, 1);
  }
  memResponses.unshift(record);
  if (memResponses.length > MAX_MEM_RESPONSES) {
    memResponses.length = MAX_MEM_RESPONSES;
  }
}

export async function saveRoutedChatResponse(input: {
  routeId: NoctisRouteEngineId;
  routeLabel: string;
  targetPanel: NoctisPanelId;
  confidence: number;
  override: boolean;
  command?: string;
  prompt: string;
  rawText: string;
  latencyMs?: number;
}): Promise<RoutedChatResponseRecord> {
  const clean = sanitizeResponseForStorage(input.prompt, input.rawText);
  const entropy = `${Date.now()}:${Math.random().toString(16).slice(2)}:${input.routeId}:${clean.prompt}`;
  const id = `RSP-${sha256Sync(entropy).slice(0, 10).toUpperCase()}`;
  const createdAt = new Date().toISOString();

  const record: RoutedChatResponseRecord = {
    id,
    routeId: input.routeId,
    routeLabel: input.routeLabel,
    targetPanel: input.targetPanel,
    confidence: Math.round(input.confidence || 90),
    override: Boolean(input.override),
    ...(input.command ? { command: input.command } : {}),
    prompt: clean.prompt,
    responseText: clean.responseText,
    summary: clean.summary,
    latencyMs: Math.max(0, Math.round(input.latencyMs || 0)),
    createdAt,
  };

  pushMemRecord(record);

  try {
    const { sql } = await ensureResponseStoreSchema();
    await sql.query(
      `INSERT INTO enterprise.noctis_chat_responses
        (id, route_id, route_label, target_panel, confidence, is_override, command, prompt, response_text, summary, latency_ms, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::timestamptz)
       ON CONFLICT (id) DO NOTHING`,
      [
        record.id,
        record.routeId,
        record.routeLabel,
        record.targetPanel,
        record.confidence,
        record.override,
        record.command || null,
        record.prompt,
        record.responseText,
        record.summary,
        record.latencyMs,
        record.createdAt,
      ],
    );
  } catch {
    /* In-memory ring buffer preserves immediate retrieval even if DB is unavailable */
  }

  return record;
}

export async function getRoutedChatResponseById(id: string): Promise<RoutedChatResponseRecord | null> {
  const normalized = String(id || "").trim();
  if (!normalized) return null;

  const memHit = memResponses.find((r) => r.id === normalized);
  if (memHit) return memHit;

  try {
    const { sql } = await ensureResponseStoreSchema();
    const rows = await sql.query<any>(
      `SELECT id, route_id, route_label, target_panel, confidence, is_override, command, prompt, response_text, summary, latency_ms, created_at
       FROM enterprise.noctis_chat_responses
       WHERE id = $1
       LIMIT 1`,
      [normalized],
    );
    const row = Array.isArray(rows) ? rows[0] : (rows as any)?.rows?.[0];
    if (!row) return null;
    const record = recordFromRow(row);
    pushMemRecord(record);
    return record;
  } catch {
    return null;
  }
}

export async function listRoutedChatResponses(opts?: {
  engine?: string;
  q?: string;
  limit?: number;
}): Promise<RoutedChatResponseRecord[]> {
  const limit = Math.max(1, Math.min(50, Math.round(opts?.limit || 20)));
  const engineFilter = (opts?.engine || "").trim().toLowerCase();
  const qFilter = (opts?.q || "").trim().toLowerCase();

  let dbRows: RoutedChatResponseRecord[] = [];
  try {
    const { sql } = await ensureResponseStoreSchema();
    const clauses: string[] = [];
    const params: any[] = [];
    if (engineFilter) {
      params.push(engineFilter);
      clauses.push(`LOWER(route_id) = $${params.length}`);
    }
    if (qFilter) {
      params.push(`%${qFilter}%`);
      const p = `$${params.length}`;
      clauses.push(`(LOWER(id) LIKE ${p} OR LOWER(prompt) LIKE ${p} OR LOWER(summary) LIKE ${p} OR LOWER(response_text) LIKE ${p})`);
    }
    params.push(limit);
    const whereSql = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const rows = await sql.query<any>(
      `SELECT id, route_id, route_label, target_panel, confidence, is_override, command, prompt, response_text, summary, latency_ms, created_at
       FROM enterprise.noctis_chat_responses
       ${whereSql}
       ORDER BY created_at DESC
       LIMIT $${params.length}`,
      params,
    );
    const rawList = Array.isArray(rows) ? rows : Array.isArray((rows as any)?.rows) ? (rows as any).rows : [];
    dbRows = rawList.map(recordFromRow);
  } catch {
    dbRows = [];
  }

  const byId = new Map<string, RoutedChatResponseRecord>();
  for (const row of dbRows) {
    byId.set(row.id, row);
  }
  for (const mem of memResponses) {
    if (engineFilter && mem.routeId.toLowerCase() !== engineFilter) continue;
    if (qFilter) {
      const hay = `${mem.id} ${mem.prompt} ${mem.summary} ${mem.responseText} ${mem.routeLabel}`.toLowerCase();
      if (!hay.includes(qFilter)) continue;
    }
    if (!byId.has(mem.id)) {
      byId.set(mem.id, mem);
    }
  }

  return Array.from(byId.values())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export async function getRoutedResponseStats(): Promise<{ totalSaved: number; storage: string }> {
  try {
    const { sql, dbSource } = await ensureResponseStoreSchema();
    const rows = await sql.query<{ cnt: number }>(`SELECT COUNT(*)::int AS cnt FROM enterprise.noctis_chat_responses`);
    const first = Array.isArray(rows) ? rows[0] : (rows as any)?.rows?.[0];
    const cnt = Number(first?.cnt ?? 0);
    return {
      totalSaved: Math.max(cnt, memResponses.length),
      storage: dbSource || "postgres",
    };
  } catch {
    return {
      totalSaved: memResponses.length,
      storage: "memory-fallback",
    };
  }
}
