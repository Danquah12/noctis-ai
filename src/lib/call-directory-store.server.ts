import { getSql } from "@/lib/db";
import { normalizeWorldE164 } from "@/lib/world-dial-codes";

export interface StoredCallContact {
  phoneE164: string;
  name: string;
  countryIso: string;
  updatedAt: string;
}

export interface StoredCallGroup {
  id: string;
  name: string;
  members: { phoneE164: string; name: string }[];
  updatedAt: string;
}

export type CallDirectoryBackend = "mongodb" | "postgres";

const globalMongo = globalThis as typeof globalThis & {
  __noctisMongoClientPromise__?: Promise<import("mongodb").MongoClient>;
  __noctisMongoIndexed__?: boolean;
};

function getMongoUri(): string {
  return (typeof process !== "undefined" ? process.env.MONGODB_URI : undefined)?.trim() || "";
}

export function getCallDirectoryBackend(): CallDirectoryBackend {
  return getMongoUri() ? "mongodb" : "postgres";
}

function cleanOwnerKey(raw: unknown): string {
  const clean = String(raw ?? "").trim().slice(0, 96);
  if (!clean) throw new Error("ownerKey is required");
  return clean;
}

function cleanName(raw: unknown, fallback = "Contact"): string {
  const s = String(raw ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  return s || fallback;
}

function cleanPhone(raw: unknown): string {
  const val = String(raw ?? "").trim();
  const norm = normalizeWorldE164(val);
  if (norm.valid && norm.e164) return norm.e164;
  return /^\+[0-9]{7,15}$/.test(val) ? val : "";
}

async function getMongoDb() {
  const uri = getMongoUri();
  if (!uri) throw new Error("MONGODB_URI is not set");
  if (!globalMongo.__noctisMongoClientPromise__) {
    globalMongo.__noctisMongoClientPromise__ = (async () => {
      const { MongoClient } = await import("mongodb");
      // Serverless connection pool parameters tuned for Vercel Fluid Compute invocations:
      // - maxPoolSize: 5 caps per-lambda connections; minPoolSize: 0 avoids idle holds
      // - short timeouts fail fast on network stalls & prune idle sockets promptly
      const client = new MongoClient(uri, {
        maxPoolSize: 5,
        minPoolSize: 0,
        maxIdleTimeMS: 15_000,
        connectTimeoutMS: 5_000,
        socketTimeoutMS: 15_000,
        serverSelectionTimeoutMS: 5_000,
      });
      await client.connect();
      return client;
    })().catch((err) => {
      globalMongo.__noctisMongoClientPromise__ = undefined;
      throw err;
    });
  }
  const client = await globalMongo.__noctisMongoClientPromise__;
  const dbName = (typeof process !== "undefined" ? process.env.MONGODB_DB : undefined)?.trim() || "noctis_calls";
  const db = client.db(dbName);
  if (!globalMongo.__noctisMongoIndexed__) {
    globalMongo.__noctisMongoIndexed__ = true;
    await Promise.all([
      db.collection("call_contacts").createIndex({ ownerKey: 1, phoneE164: 1 }, { unique: true }),
      db.collection("call_groups").createIndex({ ownerKey: 1, id: 1 }, { unique: true }),
    ]).catch(() => {
      globalMongo.__noctisMongoIndexed__ = false;
    });
  }
  return db;
}

async function ensurePgDirectoryTables() {
  const sql = await getSql();
  await sql.query(`create table if not exists world_call_contact (
    owner_key text not null,
    phone_e164 text not null,
    name text not null,
    country_iso text not null default '',
    updated_at timestamptz not null default now(),
    primary key (owner_key, phone_e164)
  )`);
  await sql.query(`create table if not exists world_call_group (
    owner_key text not null,
    id text not null,
    name text not null,
    members_json jsonb not null default '[]'::jsonb,
    updated_at timestamptz not null default now(),
    primary key (owner_key, id)
  )`);
  return sql;
}

export async function listCallDirectoryEntries(
  ownerKeyRaw: string,
  queryRaw = "",
): Promise<{
  backend: CallDirectoryBackend;
  contacts: StoredCallContact[];
  groups: StoredCallGroup[];
}> {
  const ownerKey = cleanOwnerKey(ownerKeyRaw);
  const q = queryRaw.trim().toLowerCase();

  if (getMongoUri()) {
    const db = await getMongoDb();
    const contactFilter: Record<string, unknown> = { ownerKey };
    const groupFilter: Record<string, unknown> = { ownerKey };
    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(escaped, "i");
      contactFilter.$or = [{ name: re }, { phoneE164: re }];
      groupFilter.name = re;
    }
    const [contactDocs, groupDocs] = await Promise.all([
      db.collection("call_contacts").find(contactFilter).sort({ name: 1 }).limit(150).toArray(),
      db.collection("call_groups").find(groupFilter).sort({ updatedAt: -1 }).limit(80).toArray(),
    ]);
    return {
      backend: "mongodb",
      contacts: contactDocs.map((d) => ({
        phoneE164: String(d.phoneE164 ?? ""),
        name: String(d.name ?? ""),
        countryIso: String(d.countryIso ?? ""),
        updatedAt: String(d.updatedAt ?? ""),
      })),
      groups: groupDocs.map((g) => ({
        id: String(g.id ?? ""),
        name: String(g.name ?? ""),
        members: Array.isArray(g.members)
          ? (g.members as { phoneE164?: string; name?: string }[]).map((m) => ({
              phoneE164: String(m.phoneE164 ?? ""),
              name: String(m.name ?? ""),
            }))
          : [],
        updatedAt: String(g.updatedAt ?? ""),
      })),
    };
  }

  const sql = await ensurePgDirectoryTables();
  const [contactRows, groupRows] = await Promise.all([
    sql.query(
      `select phone_e164, name, country_iso, updated_at
       from world_call_contact
       where owner_key = $1
       order by name asc
       limit 150`,
      [ownerKey],
    ) as Promise<{ phone_e164: string; name: string; country_iso: string; updated_at: string }[]>,
    sql.query(
      `select id, name, members_json, updated_at
       from world_call_group
       where owner_key = $1
       order by updated_at desc
       limit 80`,
      [ownerKey],
    ) as Promise<{ id: string; name: string; members_json: unknown; updated_at: string }[]>,
  ]);

  const contacts = contactRows
    .map((r) => ({
      phoneE164: String(r.phone_e164),
      name: String(r.name),
      countryIso: String(r.country_iso ?? ""),
      updatedAt: String(r.updated_at),
    }))
    .filter((c) => !q || c.name.toLowerCase().includes(q) || c.phoneE164.toLowerCase().includes(q));

  const groups = groupRows
    .map((g) => {
      const membersRaw = Array.isArray(g.members_json)
        ? g.members_json
        : typeof g.members_json === "string"
          ? (() => {
              try {
                return JSON.parse(g.members_json);
              } catch {
                return [];
              }
            })()
          : [];
      return {
        id: String(g.id),
        name: String(g.name),
        members: Array.isArray(membersRaw)
          ? (membersRaw as { phoneE164?: string; name?: string }[]).map((m) => ({
              phoneE164: String(m.phoneE164 ?? ""),
              name: String(m.name ?? ""),
            }))
          : [],
        updatedAt: String(g.updated_at),
      };
    })
    .filter((g) => !q || g.name.toLowerCase().includes(q));

  return { backend: "postgres", contacts, groups };
}

export async function upsertCallContact(input: {
  ownerKey: string;
  phoneE164: string;
  name: string;
  countryIso?: string;
}) {
  const ownerKey = cleanOwnerKey(input.ownerKey);
  const phoneE164 = cleanPhone(input.phoneE164);
  if (!phoneE164) throw new Error("Valid E.164 phone number required");
  const name = cleanName(input.name, phoneE164);
  const countryIso = String(input.countryIso ?? "").trim().toUpperCase().slice(0, 4);
  const nowIso = new Date().toISOString();

  if (getMongoUri()) {
    const db = await getMongoDb();
    await db.collection("call_contacts").updateOne(
      { ownerKey, phoneE164 },
      { $set: { ownerKey, phoneE164, name, countryIso, updatedAt: nowIso } },
      { upsert: true },
    );
    return { ok: true as const, backend: "mongodb" as const, contact: { phoneE164, name, countryIso, updatedAt: nowIso } };
  }

  const sql = await ensurePgDirectoryTables();
  await sql.query(
    `insert into world_call_contact (owner_key, phone_e164, name, country_iso, updated_at)
     values ($1, $2, $3, $4, now())
     on conflict (owner_key, phone_e164) do update set
       name = excluded.name,
       country_iso = excluded.country_iso,
       updated_at = now()`,
    [ownerKey, phoneE164, name, countryIso],
  );
  return { ok: true as const, backend: "postgres" as const, contact: { phoneE164, name, countryIso, updatedAt: nowIso } };
}

export async function deleteCallContact(ownerKeyRaw: string, phoneE164Raw: string) {
  const ownerKey = cleanOwnerKey(ownerKeyRaw);
  const phoneE164 = cleanPhone(phoneE164Raw);
  if (!phoneE164) return { ok: true as const };

  if (getMongoUri()) {
    const db = await getMongoDb();
    await db.collection("call_contacts").deleteOne({ ownerKey, phoneE164 });
    return { ok: true as const, backend: "mongodb" as const };
  }

  const sql = await ensurePgDirectoryTables();
  await sql.query(`delete from world_call_contact where owner_key = $1 and phone_e164 = $2`, [ownerKey, phoneE164]);
  return { ok: true as const, backend: "postgres" as const };
}

export async function upsertCallGroup(input: {
  ownerKey: string;
  id?: string;
  name: string;
  members: { phoneE164: string; name: string }[];
}) {
  const ownerKey = cleanOwnerKey(input.ownerKey);
  const id =
    String(input.id ?? "").trim().slice(0, 64) ||
    `grp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const name = cleanName(input.name, "Call Group");
  const members = (Array.isArray(input.members) ? input.members : [])
    .map((m) => ({
      phoneE164: cleanPhone(m.phoneE164),
      name: cleanName(m.name, m.phoneE164),
    }))
    .filter((m) => Boolean(m.phoneE164))
    .slice(0, 50);
  if (!members.length) throw new Error("At least 1 valid member phone is required");
  const nowIso = new Date().toISOString();

  if (getMongoUri()) {
    const db = await getMongoDb();
    await db.collection("call_groups").updateOne(
      { ownerKey, id },
      { $set: { ownerKey, id, name, members, updatedAt: nowIso } },
      { upsert: true },
    );
    return { ok: true as const, backend: "mongodb" as const, group: { id, name, members, updatedAt: nowIso } };
  }

  const sql = await ensurePgDirectoryTables();
  await sql.query(
    `insert into world_call_group (owner_key, id, name, members_json, updated_at)
     values ($1, $2, $3, $4::jsonb, now())
     on conflict (owner_key, id) do update set
       name = excluded.name,
       members_json = excluded.members_json,
       updated_at = now()`,
    [ownerKey, id, name, JSON.stringify(members)],
  );
  return { ok: true as const, backend: "postgres" as const, group: { id, name, members, updatedAt: nowIso } };
}

export async function deleteCallGroup(ownerKeyRaw: string, groupIdRaw: string) {
  const ownerKey = cleanOwnerKey(ownerKeyRaw);
  const groupId = String(groupIdRaw ?? "").trim().slice(0, 64);
  if (!groupId) return { ok: true as const };

  if (getMongoUri()) {
    const db = await getMongoDb();
    await db.collection("call_groups").deleteOne({ ownerKey, id: groupId });
    return { ok: true as const, backend: "mongodb" as const };
  }

  const sql = await ensurePgDirectoryTables();
  await sql.query(`delete from world_call_group where owner_key = $1 and id = $2`, [ownerKey, groupId]);
  return { ok: true as const, backend: "postgres" as const };
}

export async function lookupCallContactByNumber(ownerKeyRaw: string, phoneRaw: string) {
  const ownerKey = cleanOwnerKey(ownerKeyRaw);
  const phoneE164 = cleanPhone(phoneRaw);
  if (!phoneE164) return { ok: true as const, contact: null as StoredCallContact | null, backend: getCallDirectoryBackend() };

  if (getMongoUri()) {
    const db = await getMongoDb();
    const doc = await db.collection("call_contacts").findOne({ ownerKey, phoneE164 });
    return {
      ok: true as const,
      backend: "mongodb" as const,
      contact: doc
        ? {
            phoneE164: String(doc.phoneE164),
            name: String(doc.name),
            countryIso: String(doc.countryIso ?? ""),
            updatedAt: String(doc.updatedAt ?? ""),
          }
        : null,
    };
  }

  const sql = await ensurePgDirectoryTables();
  const rows = (await sql.query(
    `select phone_e164, name, country_iso, updated_at
     from world_call_contact
     where owner_key = $1 and phone_e164 = $2
     limit 1`,
    [ownerKey, phoneE164],
  )) as { phone_e164: string; name: string; country_iso: string; updated_at: string }[];
  return {
    ok: true as const,
    backend: "postgres" as const,
    contact: rows[0]
      ? {
          phoneE164: String(rows[0].phone_e164),
          name: String(rows[0].name),
          countryIso: String(rows[0].country_iso ?? ""),
          updatedAt: String(rows[0].updated_at),
        }
      : null,
  };
}
