import { createServerFn } from "@tanstack/react-start";

export type ShareNote = { code: string; name: string; avatar: string; body: string };

export const SHARED_THREAD_PREFIX = "NOCTIS_THREAD_V1:";

export interface SharedThreadPayload {
  title: string;
  sharedAt: string;
  turns: Array<{ role: "user" | "assistant"; content: string }>;
}

export function encodeSharedThread(payload: SharedThreadPayload): string {
  const safeTurns = (payload.turns || [])
    .slice(0, 40)
    .map((t) => ({
      role: t.role === "user" ? ("user" as const) : ("assistant" as const),
      content: String(t.content || "").slice(0, 8000),
    }));
  const json = JSON.stringify({
    title: String(payload.title || "Shared Noctis Conversation").slice(0, 120),
    sharedAt: payload.sharedAt || new Date().toISOString(),
    turns: safeTurns,
  });
  return `${SHARED_THREAD_PREFIX}${json}`;
}

export function decodeSharedThread(rawBody: string | null | undefined): SharedThreadPayload | null {
  if (!rawBody || !rawBody.startsWith(SHARED_THREAD_PREFIX)) return null;
  try {
    const parsed = JSON.parse(rawBody.slice(SHARED_THREAD_PREFIX.length)) as SharedThreadPayload;
    if (!parsed || !Array.isArray(parsed.turns)) return null;
    return parsed;
  } catch {
    return null;
  }
}

const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

function cleanCode(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").slice(0, 12).toLowerCase();
}

async function db() {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  await sql.query(`create table if not exists share_link (
    code text primary key,
    name text not null,
    avatar text not null default '',
    body text not null,
    created_at timestamptz not null default now()
  )`);
  return sql;
}

function freshCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("");
}

export const saveShareLink = createServerFn({ method: "POST" })
  .validator((input: { name?: string; avatar?: string; body?: string }) => ({
    name: String(input?.name ?? "Noctis").replace(/\s+/g, " ").trim().slice(0, 80) || "Noctis",
    avatar: String(input?.avatar ?? "").startsWith("https://") ? String(input.avatar).slice(0, 800) : "",
    body: String(input?.body ?? "").trim().slice(0, 48000),
  }))
  .handler(async ({ data }): Promise<ShareNote> => {
    const sql = await db();
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const code = freshCode();
      try {
        await sql`insert into share_link (code, name, avatar, body) values (${code}, ${data.name}, ${data.avatar}, ${data.body})`;
        return { code, name: data.name, avatar: data.avatar, body: data.body };
      } catch {
        /* another code if this one is already used */
      }
    }
    throw new Error("Could not save a short link.");
  });

export const readShareLink = createServerFn({ method: "GET" })
  .validator((input: { code?: string }) => ({ code: cleanCode(String(input?.code ?? "")) }))
  .handler(async ({ data }): Promise<ShareNote | null> => {
    if (!data.code) return null;
    const sql = await db();
    const rows = await sql<ShareNote>`select code, name, avatar, body from share_link where code = ${data.code} limit 1`;
    return rows[0] ?? null;
  });
