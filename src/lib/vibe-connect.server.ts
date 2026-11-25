import { getSql } from "@/lib/db";
import {
  DEFAULT_VIBE_CONNECT_FLAGS,
  mergeVibeConnectFlags,
  type VibeConnectFeatureFlags,
} from "@/lib/vibe-connect-flags";
import { computeExpiresAtIso, normalizeUsername } from "@/lib/vibe-connect-helpers";

function makeId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 14)
      : Math.random().toString(36).slice(2, 16);
  return `${prefix}_${rand}`;
}

function safeJsonParse<T>(raw: unknown, fallback: T): T {
  if (raw !== null && raw !== undefined && typeof raw === "object") return raw as T;
  if (typeof raw !== "string" || !raw.trim()) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function cleanText(raw: unknown, maxLen: number): string {
  return String(raw ?? "").trim().slice(0, maxLen);
}

function uniqueStrings(arr: unknown, limit = 100): string[] {
  if (!Array.isArray(arr)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of arr) {
    const v = String(item ?? "").trim();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
    if (out.length >= limit) break;
  }
  return out;
}

async function ready() {
  const sql = await getSql();
  await sql.query(`create table if not exists vc_profile (
    actor_id text primary key,
    phone_e164 text,
    username text,
    display_name text not null,
    bio text not null default '',
    avatar_url text not null default '',
    public_key_jwk text not null default '',
    privacy_json jsonb not null default '{"lastSeen":"everyone","online":"everyone","photo":"everyone","readReceipts":true,"groupInvite":"everyone","silenceUnknown":false}'::jsonb,
    last_seen_at timestamptz not null default now(),
    created_at timestamptz not null default now()
  )`);
  await sql.query(`create table if not exists vc_device (
    device_id text primary key,
    actor_id text not null,
    label text not null,
    platform text not null default 'web',
    last_active_at timestamptz not null default now(),
    revoked boolean not null default false,
    created_at timestamptz not null default now()
  )`);
  await sql.query(`create table if not exists vc_thread (
    id text primary key,
    kind text not null default 'direct',
    title text not null,
    description text not null default '',
    community_id text,
    e2ee_enabled boolean not null default true,
    disappearing_ttl text not null default 'off',
    admin_only_post boolean not null default false,
    require_approval boolean not null default false,
    invite_code text not null default '',
    shared_note text not null default '',
    created_by text not null,
    members_json jsonb not null default '[]'::jsonb,
    admins_json jsonb not null default '[]'::jsonb,
    pending_json jsonb not null default '[]'::jsonb,
    archived_by_json jsonb not null default '[]'::jsonb,
    pinned_by_json jsonb not null default '[]'::jsonb,
    favorite_by_json jsonb not null default '[]'::jsonb,
    updated_at timestamptz not null default now(),
    created_at timestamptz not null default now()
  )`);
  await sql.query(`alter table vc_thread add column if not exists shared_note text not null default ''`);
  await sql.query(`create table if not exists vc_message (
    id serial primary key,
    thread_id text not null,
    client_msg_id text,
    sender_id text not null,
    sender_name text not null,
    msg_type text not null default 'text',
    body text not null,
    encrypted boolean not null default false,
    ciphertext text not null default '',
    media_url text not null default '',
    media_name text not null default '',
    media_mime text not null default '',
    view_once boolean not null default false,
    viewed_by_json jsonb not null default '[]'::jsonb,
    reply_to_id integer,
    forwarded boolean not null default false,
    edited_at timestamptz,
    deleted_for_everyone boolean not null default false,
    deleted_for_json jsonb not null default '[]'::jsonb,
    starred_by_json jsonb not null default '[]'::jsonb,
    pinned boolean not null default false,
    reactions_json jsonb not null default '{}'::jsonb,
    delivered_to_json jsonb not null default '[]'::jsonb,
    read_by_json jsonb not null default '[]'::jsonb,
    deliver_at timestamptz,
    expires_at timestamptz,
    meta_json jsonb,
    created_at timestamptz not null default now()
  )`);
  await sql.query(
    `create unique index if not exists vc_message_thread_client_idx on vc_message (thread_id, client_msg_id) where client_msg_id is not null`,
  );
  await sql.query(`create table if not exists vc_presence (
    thread_id text not null,
    actor_id text not null,
    actor_name text not null,
    state text not null default 'online',
    updated_at timestamptz not null default now(),
    primary key (thread_id, actor_id)
  )`);
  await sql.query(`create table if not exists vc_task (
    id text primary key,
    thread_id text not null,
    title text not null,
    assignee text not null default '',
    status text not null default 'open',
    due_at text not null default '',
    source_msg_id integer,
    created_by text not null,
    created_at timestamptz not null default now()
  )`);
  await sql.query(`create table if not exists vc_community (
    id text primary key,
    name text not null,
    description text not null default '',
    created_by text not null,
    announce_thread_id text not null default '',
    group_ids_json jsonb not null default '[]'::jsonb,
    invite_code text not null default '',
    created_at timestamptz not null default now()
  )`);
  await sql.query(`create table if not exists vc_poll (
    id text primary key,
    thread_id text not null,
    question text not null,
    options_json jsonb not null default '[]'::jsonb,
    votes_json jsonb not null default '{}'::jsonb,
    created_by text not null,
    created_at timestamptz not null default now()
  )`);
  await sql.query(`create table if not exists vc_event (
    id text primary key,
    thread_id text not null,
    title text not null,
    starts_at text not null,
    location text not null default '',
    description text not null default '',
    rsvps_json jsonb not null default '{}'::jsonb,
    created_by text not null,
    created_at timestamptz not null default now()
  )`);
  await sql.query(`create table if not exists vc_status (
    id text primary key,
    actor_id text not null,
    actor_name text not null,
    kind text not null default 'text',
    content text not null,
    media_url text not null default '',
    bg_color text not null default '#134e4a',
    privacy text not null default 'everyone',
    viewers_json jsonb not null default '[]'::jsonb,
    reactions_json jsonb not null default '{}'::jsonb,
    expires_at timestamptz not null,
    created_at timestamptz not null default now()
  )`);
  await sql.query(`create table if not exists vc_channel (
    id text primary key,
    name text not null,
    handle text not null,
    description text not null default '',
    verified boolean not null default false,
    premium boolean not null default false,
    owner_id text not null,
    subscribers_json jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now()
  )`);
  await sql.query(`create table if not exists vc_channel_post (
    id serial primary key,
    channel_id text not null,
    author_name text not null,
    body text not null,
    media_url text not null default '',
    poll_json jsonb,
    reactions_json jsonb not null default '{}'::jsonb,
    views integer not null default 0,
    created_at timestamptz not null default now()
  )`);
  await sql.query(`create table if not exists vc_business (
    id text primary key,
    owner_id text not null,
    name text not null,
    category text not null default 'General',
    description text not null default '',
    verified boolean not null default true,
    hours_text text not null default 'Mon-Fri 9:00-18:00',
    greeting_msg text not null default 'Welcome! How can we help you today?',
    away_msg text not null default 'We are currently away and will reply as soon as we open.',
    quick_replies_json jsonb not null default '[]'::jsonb,
    labels_json jsonb not null default '["Lead","VIP","Support","Paid"]'::jsonb,
    team_agents_json jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now()
  )`);
  await sql.query(`create table if not exists vc_product (
    id text primary key,
    business_id text not null,
    name text not null,
    price_cents integer not null,
    currency text not null default 'USD',
    description text not null default '',
    image_url text not null default '',
    in_stock boolean not null default true,
    created_at timestamptz not null default now()
  )`);
  await sql.query(`create table if not exists vc_order (
    id text primary key,
    business_id text not null,
    customer_id text not null,
    customer_name text not null,
    items_json jsonb not null default '[]'::jsonb,
    total_cents integer not null default 0,
    status text not null default 'pending',
    assigned_agent text not null default '',
    customer_label text not null default 'Lead',
    appointment_at text not null default '',
    notes text not null default '',
    created_at timestamptz not null default now()
  )`);
  await sql.query(`create table if not exists vc_block (
    blocker_id text not null,
    blocked_id text not null,
    created_at timestamptz not null default now(),
    primary key (blocker_id, blocked_id)
  )`);
  await sql.query(`create table if not exists vc_report (
    id serial primary key,
    reporter_id text not null,
    target_id text not null,
    reason text not null,
    status text not null default 'open',
    created_at timestamptz not null default now()
  )`);
  await sql.query(`create table if not exists vc_flag (
    flag_key text primary key,
    enabled boolean not null,
    updated_at timestamptz not null default now()
  )`);
  return sql;
}

export class ConnectError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 400, code = "CONNECT_ERROR") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function getFlags(): Promise<VibeConnectFeatureFlags> {
  const sql = await ready();
  const rows = (await sql.query(`select flag_key, enabled from vc_flag`)) as {
    flag_key: string;
    enabled: boolean;
  }[];
  const overrides: Record<string, boolean> = {};
  for (const row of rows) {
    overrides[row.flag_key] = Boolean(row.enabled);
  }
  return mergeVibeConnectFlags(DEFAULT_VIBE_CONNECT_FLAGS, overrides);
}

export async function setFlag(flagKey: string, enabled: boolean) {
  const cleanKey = cleanText(flagKey, 64);
  if (!(cleanKey in DEFAULT_VIBE_CONNECT_FLAGS)) {
    throw new ConnectError("Unknown feature flag key", 400, "UNKNOWN_FLAG");
  }
  const sql = await ready();
  await sql.query(
    `insert into vc_flag (flag_key, enabled, updated_at)
     values ($1, $2, now())
     on conflict (flag_key) do update set enabled = excluded.enabled, updated_at = now()`,
    [cleanKey, Boolean(enabled)],
  );
  return { ok: true as const, flags: await getFlags() };
}

export async function registerProfile(input: {
  actorId: string;
  phoneE164?: string;
  username?: string;
  displayName?: string;
  bio?: string;
  publicKeyJwk?: string;
  deviceId?: string;
  deviceLabel?: string;
}) {
  const actorId = cleanText(input.actorId, 80);
  if (!actorId) throw new ConnectError("actorId is required", 400);
  const phoneE164 = cleanText(input.phoneE164, 24);
  const username = input.username ? normalizeUsername(input.username) : "";
  const displayName = cleanText(input.displayName, 80) || username || phoneE164 || "Vibe User";
  const bio = cleanText(input.bio, 240);
  const publicKeyJwk = cleanText(input.publicKeyJwk, 2000);
  const sql = await ready();

  await sql.query(
    `insert into vc_profile (actor_id, phone_e164, username, display_name, bio, public_key_jwk, last_seen_at)
     values ($1, $2, $3, $4, $5, $6, now())
     on conflict (actor_id) do update set
       phone_e164 = case when excluded.phone_e164 <> '' then excluded.phone_e164 else vc_profile.phone_e164 end,
       username = case when excluded.username <> '' then excluded.username else vc_profile.username end,
       display_name = case when excluded.display_name <> '' then excluded.display_name else vc_profile.display_name end,
       bio = case when excluded.bio <> '' then excluded.bio else vc_profile.bio end,
       public_key_jwk = case when excluded.public_key_jwk <> '' then excluded.public_key_jwk else vc_profile.public_key_jwk end,
       last_seen_at = now()`,
    [actorId, phoneE164, username, displayName, bio, publicKeyJwk],
  );

  if (input.deviceId) {
    const devId = cleanText(input.deviceId, 80);
    const label = cleanText(input.deviceLabel, 80) || "Web Browser";
    await sql.query(
      `insert into vc_device (device_id, actor_id, label, platform, last_active_at, revoked)
       values ($1, $2, $3, 'web', now(), false)
       on conflict (device_id) do update set
         actor_id = excluded.actor_id,
         label = excluded.label,
         last_active_at = now()`,
      [devId, actorId, label],
    );
  }

  // Ensure Saved Messages self-thread exists for instant zero-friction use
  const selfThreadId = `self_${actorId}`;
  await sql.query(
    `insert into vc_thread (id, kind, title, description, e2ee_enabled, created_by, members_json, admins_json)
     values ($1, 'self', 'Saved Messages', 'Personal encrypted notepad, drafts, bookmarks & call minutes', true, $2, $3::jsonb, $3::jsonb)
     on conflict (id) do nothing`,
    [selfThreadId, actorId, JSON.stringify([actorId])],
  );

  const profileRows = (await sql.query(
    `select actor_id, phone_e164, username, display_name, bio, avatar_url, public_key_jwk, privacy_json, last_seen_at
     from vc_profile where actor_id = $1 limit 1`,
    [actorId],
  )) as Record<string, unknown>[];

  return { ok: true as const, profile: mapProfileRow(profileRows[0]!), selfThreadId };
}

function mapProfileRow(r: Record<string, unknown>) {
  return {
    actorId: String(r.actor_id ?? ""),
    phoneE164: String(r.phone_e164 ?? ""),
    username: String(r.username ?? ""),
    displayName: String(r.display_name ?? ""),
    bio: String(r.bio ?? ""),
    avatarUrl: String(r.avatar_url ?? ""),
    publicKeyJwk: String(r.public_key_jwk ?? ""),
    privacy: safeJsonParse<Record<string, unknown>>(r.privacy_json, {
      lastSeen: "everyone",
      online: "everyone",
      photo: "everyone",
      readReceipts: true,
      groupInvite: "everyone",
      silenceUnknown: false,
    }),
    lastSeenAt: String(r.last_seen_at ?? ""),
  };
}

export async function updatePrivacy(actorIdRaw: string, privacyPatch: Record<string, unknown>) {
  const actorId = cleanText(actorIdRaw, 80);
  if (!actorId) throw new ConnectError("actorId is required", 400);
  const sql = await ready();
  const rows = (await sql.query(`select privacy_json from vc_profile where actor_id = $1 limit 1`, [actorId])) as {
    privacy_json: unknown;
  }[];
  if (!rows.length) throw new ConnectError("Profile not found", 404);
  const current = safeJsonParse<Record<string, unknown>>(rows[0]!.privacy_json, {});
  const next = { ...current, ...privacyPatch };
  await sql.query(`update vc_profile set privacy_json = $2::jsonb where actor_id = $1`, [
    actorId,
    JSON.stringify(next),
  ]);
  return { ok: true as const, privacy: next };
}

export async function registerDevice(input: { actorId: string; deviceId: string; label?: string; platform?: string }) {
  const actorId = cleanText(input.actorId, 80);
  const deviceId = cleanText(input.deviceId, 80) || makeId("dev");
  const label = cleanText(input.label, 80) || "Linked Companion";
  const platform = cleanText(input.platform, 32) || "web";
  if (!actorId) throw new ConnectError("actorId is required", 400);
  const sql = await ready();
  await sql.query(
    `insert into vc_device (device_id, actor_id, label, platform, last_active_at, revoked)
     values ($1, $2, $3, $4, now(), false)
     on conflict (device_id) do update set label = excluded.label, platform = excluded.platform, last_active_at = now(), revoked = false`,
    [deviceId, actorId, label, platform],
  );
  return { ok: true as const, devices: await listDevices(actorId) };
}

export async function listDevices(actorIdRaw: string) {
  const actorId = cleanText(actorIdRaw, 80);
  const sql = await ready();
  const rows = (await sql.query(
    `select device_id, actor_id, label, platform, last_active_at, revoked, created_at
     from vc_device where actor_id = $1 order by last_active_at desc limit 25`,
    [actorId],
  )) as Record<string, unknown>[];
  return rows.map((r) => ({
    deviceId: String(r.device_id),
    actorId: String(r.actor_id),
    label: String(r.label),
    platform: String(r.platform),
    lastActiveAt: String(r.last_active_at),
    revoked: Boolean(r.revoked),
    createdAt: String(r.created_at),
  }));
}

export async function revokeDevice(actorIdRaw: string, deviceIdRaw: string) {
  const actorId = cleanText(actorIdRaw, 80);
  const deviceId = cleanText(deviceIdRaw, 80);
  const sql = await ready();
  await sql.query(`update vc_device set revoked = true where actor_id = $1 and device_id = $2`, [actorId, deviceId]);
  return { ok: true as const, devices: await listDevices(actorId) };
}

export async function isBlockedBetween(
  sql: Awaited<ReturnType<typeof getSql>>,
  aRaw: string,
  bRaw: string,
): Promise<boolean> {
  const a = cleanText(aRaw, 80);
  const b = cleanText(bRaw, 80);
  if (!a || !b || a === b) return false;
  const rows = (await sql.query(
    `select 1 as hit from vc_block
     where (blocker_id = $1 and blocked_id = $2)
        or (blocker_id = $2 and blocked_id = $1)
     limit 1`,
    [a, b],
  )) as { hit: number }[];
  return rows.length > 0;
}

export async function blockUser(blockerIdRaw: string, blockedIdRaw: string) {
  const blockerId = cleanText(blockerIdRaw, 80);
  const blockedId = cleanText(blockedIdRaw, 80);
  if (!blockerId || !blockedId || blockerId === blockedId) {
    throw new ConnectError("Valid blockerId and blockedId required", 400);
  }
  const sql = await ready();
  await sql.query(
    `insert into vc_block (blocker_id, blocked_id) values ($1, $2) on conflict do nothing`,
    [blockerId, blockedId],
  );
  return { ok: true as const, blocks: await listBlocks(blockerId) };
}

export async function unblockUser(blockerIdRaw: string, blockedIdRaw: string) {
  const blockerId = cleanText(blockerIdRaw, 80);
  const blockedId = cleanText(blockedIdRaw, 80);
  const sql = await ready();
  await sql.query(`delete from vc_block where blocker_id = $1 and blocked_id = $2`, [blockerId, blockedId]);
  return { ok: true as const, blocks: await listBlocks(blockerId) };
}

export async function listBlocks(blockerIdRaw: string) {
  const blockerId = cleanText(blockerIdRaw, 80);
  const sql = await ready();
  const rows = (await sql.query(
    `select blocked_id, created_at from vc_block where blocker_id = $1 order by created_at desc`,
    [blockerId],
  )) as { blocked_id: string; created_at: string }[];
  return rows.map((r) => ({ blockedId: r.blocked_id, createdAt: r.created_at }));
}

export async function reportUser(input: { reporterId: string; targetId: string; reason: string }) {
  const reporterId = cleanText(input.reporterId, 80);
  const targetId = cleanText(input.targetId, 80);
  const reason = cleanText(input.reason, 400);
  if (!reporterId || !targetId || !reason) throw new ConnectError("reporterId, targetId and reason are required", 400);
  const sql = await ready();
  const rows = (await sql.query(
    `insert into vc_report (reporter_id, target_id, reason, status) values ($1, $2, $3, 'open') returning id`,
    [reporterId, targetId, reason],
  )) as { id: number }[];
  return { ok: true as const, reportId: Number(rows[0]!.id) };
}

export async function createThread(input: {
  id?: string;
  kind?: string;
  title?: string;
  description?: string;
  communityId?: string;
  e2eeEnabled?: boolean;
  disappearingTtl?: string;
  adminOnlyPost?: boolean;
  requireApproval?: boolean;
  createdBy: string;
  members?: string[];
}) {
  const createdBy = cleanText(input.createdBy, 80);
  if (!createdBy) throw new ConnectError("createdBy is required", 400);
  const kind = cleanText(input.kind, 32) || "direct";
  const members = uniqueStrings([createdBy, ...(Array.isArray(input.members) ? input.members : [])], 120);
  const sql = await ready();

  // Reuse existing direct thread between 2 members if id not explicitly forced
  if (kind === "direct" && members.length === 2 && !input.id) {
    const existing = (await sql.query(
      `select * from vc_thread
       where kind = 'direct'
         and members_json @> $1::jsonb
         and jsonb_array_length(members_json) = 2
       limit 1`,
      [JSON.stringify(members)],
    )) as Record<string, unknown>[];
    if (existing.length) {
      return { ok: true as const, thread: mapThreadRow(existing[0]!, createdBy) };
    }
  }

  const id = cleanText(input.id, 80) || makeId("thr");
  const title = cleanText(input.title, 100) || (kind === "direct" ? "Direct Chat" : "Vibe Group");
  const description = cleanText(input.description, 400);
  const communityId = cleanText(input.communityId, 80) || null;
  const e2eeEnabled = input.e2eeEnabled !== false;
  const disappearingTtl = cleanText(input.disappearingTtl, 16) || "off";
  const adminOnlyPost = Boolean(input.adminOnlyPost);
  const requireApproval = Boolean(input.requireApproval);
  const inviteCode = makeId("inv");
  const admins = [createdBy];

  await sql.query(
    `insert into vc_thread (
       id, kind, title, description, community_id, e2ee_enabled, disappearing_ttl,
       admin_only_post, require_approval, invite_code, created_by, members_json, admins_json
     ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13::jsonb)
     on conflict (id) do update set updated_at = now()`,
    [
      id,
      kind,
      title,
      description,
      communityId,
      e2eeEnabled,
      disappearingTtl,
      adminOnlyPost,
      requireApproval,
      inviteCode,
      createdBy,
      JSON.stringify(members),
      JSON.stringify(admins),
    ],
  );

  const created = (await sql.query(`select * from vc_thread where id = $1 limit 1`, [id])) as Record<string, unknown>[];
  return { ok: true as const, thread: mapThreadRow(created[0]!, createdBy) };
}

function mapThreadRow(r: Record<string, unknown>, viewerId: string, unreadCount = 0, lastMessagePreview = "") {
  const archived = safeJsonParse<string[]>(r.archived_by_json, []);
  const pinned = safeJsonParse<string[]>(r.pinned_by_json, []);
  const favorite = safeJsonParse<string[]>(r.favorite_by_json, []);
  return {
    id: String(r.id),
    kind: String(r.kind),
    title: String(r.title),
    description: String(r.description ?? ""),
    communityId: r.community_id ? String(r.community_id) : null,
    e2eeEnabled: Boolean(r.e2ee_enabled),
    disappearingTtl: String(r.disappearing_ttl ?? "off"),
    adminOnlyPost: Boolean(r.admin_only_post),
    requireApproval: Boolean(r.require_approval),
    inviteCode: String(r.invite_code ?? ""),
    sharedNote: String(r.shared_note ?? ""),
    createdBy: String(r.created_by),
    members: safeJsonParse<string[]>(r.members_json, []),
    admins: safeJsonParse<string[]>(r.admins_json, []),
    pending: safeJsonParse<string[]>(r.pending_json, []),
    isArchived: archived.includes(viewerId),
    isPinned: pinned.includes(viewerId),
    isFavorite: favorite.includes(viewerId),
    unreadCount,
    lastMessagePreview,
    updatedAt: String(r.updated_at),
    createdAt: String(r.created_at),
  };
}

export async function listThreads(actorIdRaw: string) {
  const actorId = cleanText(actorIdRaw, 80);
  const sql = await ready();
  const rows = (await sql.query(
    `select t.*,
       (select m.body from vc_message m where m.thread_id = t.id and m.deleted_for_everyone = false order by m.id desc limit 1) as last_body,
       (select count(*)::int from vc_message m where m.thread_id = t.id and m.sender_id <> $1 and m.deleted_for_everyone = false and not (m.read_by_json @> $2::jsonb)) as unread_count
     from vc_thread t
     where t.members_json @> $2::jsonb
     order by t.updated_at desc
     limit 100`,
    [actorId, JSON.stringify([actorId])],
  )) as Record<string, unknown>[];

  return rows.map((r) =>
    mapThreadRow(r, actorId, Number(r.unread_count ?? 0), String(r.last_body ?? "")),
  );
}

export async function updateThread(input: {
  threadId: string;
  actorId: string;
  title?: string;
  description?: string;
  disappearingTtl?: string;
  adminOnlyPost?: boolean;
  requireApproval?: boolean;
  e2eeEnabled?: boolean;
  toggleArchive?: boolean;
  togglePin?: boolean;
  toggleFavorite?: boolean;
}) {
  const threadId = cleanText(input.threadId, 80);
  const actorId = cleanText(input.actorId, 80);
  const sql = await ready();
  const rows = (await sql.query(`select * from vc_thread where id = $1 limit 1`, [threadId])) as Record<string, unknown>[];
  if (!rows.length) throw new ConnectError("Thread not found", 404);
  const row = rows[0]!;
  const admins = safeJsonParse<string[]>(row.admins_json, []);

  const archived = safeJsonParse<string[]>(row.archived_by_json, []);
  const pinned = safeJsonParse<string[]>(row.pinned_by_json, []);
  const fav = safeJsonParse<string[]>(row.favorite_by_json, []);

  const toggleItem = (list: string[], doToggle?: boolean) => {
    if (!doToggle || !actorId) return list;
    return list.includes(actorId) ? list.filter((x) => x !== actorId) : [...list, actorId];
  };

  const nextArchived = toggleItem(archived, input.toggleArchive);
  const nextPinned = toggleItem(pinned, input.togglePin);
  const nextFav = toggleItem(fav, input.toggleFavorite);

  const isAdmin = admins.includes(actorId) || String(row.kind) === "self";
  const nextTitle = isAdmin && input.title !== undefined ? cleanText(input.title, 100) || String(row.title) : String(row.title);
  const nextDesc = isAdmin && input.description !== undefined ? cleanText(input.description, 400) : String(row.description ?? "");
  const nextTtl = input.disappearingTtl !== undefined ? cleanText(input.disappearingTtl, 16) : String(row.disappearing_ttl ?? "off");
  const nextAdminOnly = isAdmin && input.adminOnlyPost !== undefined ? Boolean(input.adminOnlyPost) : Boolean(row.admin_only_post);
  const nextApproval = isAdmin && input.requireApproval !== undefined ? Boolean(input.requireApproval) : Boolean(row.require_approval);
  const nextE2ee = input.e2eeEnabled !== undefined ? Boolean(input.e2eeEnabled) : Boolean(row.e2ee_enabled);

  await sql.query(
    `update vc_thread set
       title = $2,
       description = $3,
       disappearing_ttl = $4,
       admin_only_post = $5,
       require_approval = $6,
       e2ee_enabled = $7,
       archived_by_json = $8::jsonb,
       pinned_by_json = $9::jsonb,
       favorite_by_json = $10::jsonb,
       updated_at = now()
     where id = $1`,
    [
      threadId,
      nextTitle,
      nextDesc,
      nextTtl,
      nextAdminOnly,
      nextApproval,
      nextE2ee,
      JSON.stringify(nextArchived),
      JSON.stringify(nextPinned),
      JSON.stringify(nextFav),
    ],
  );
  const updated = (await sql.query(`select * from vc_thread where id = $1 limit 1`, [threadId])) as Record<string, unknown>[];
  return { ok: true as const, thread: mapThreadRow(updated[0]!, actorId) };
}

export async function updateSharedNote(threadIdRaw: string, actorIdRaw: string, sharedNoteRaw: string) {
  const threadId = cleanText(threadIdRaw, 80);
  const actorId = cleanText(actorIdRaw, 80);
  const sharedNote = String(sharedNoteRaw ?? "").slice(0, 12_000);
  const sql = await ready();
  const rows = (await sql.query(`select members_json from vc_thread where id = $1 limit 1`, [threadId])) as {
    members_json: unknown;
  }[];
  if (!rows.length) throw new ConnectError("Thread not found", 404);
  const members = safeJsonParse<string[]>(rows[0]!.members_json, []);
  if (!members.includes(actorId)) throw new ConnectError("Not a member of this thread", 403);
  await sql.query(`update vc_thread set shared_note = $2, updated_at = now() where id = $1`, [threadId, sharedNote]);
  return { ok: true as const, threadId, sharedNote };
}

export async function joinByInvite(inviteCodeRaw: string, actorIdRaw: string) {
  const inviteCode = cleanText(inviteCodeRaw, 80);
  const actorId = cleanText(actorIdRaw, 80);
  if (!inviteCode || !actorId) throw new ConnectError("inviteCode and actorId are required", 400);
  const sql = await ready();
  const rows = (await sql.query(`select * from vc_thread where invite_code = $1 limit 1`, [inviteCode])) as Record<string, unknown>[];
  if (!rows.length) throw new ConnectError("Invite link expired or not found", 404);
  const row = rows[0]!;
  const members = safeJsonParse<string[]>(row.members_json, []);
  const pending = safeJsonParse<string[]>(row.pending_json, []);
  if (members.includes(actorId)) {
    return { ok: true as const, status: "joined" as const, thread: mapThreadRow(row, actorId) };
  }
  if (row.require_approval) {
    const nextPending = uniqueStrings([...pending, actorId], 200);
    await sql.query(`update vc_thread set pending_json = $2::jsonb where id = $1`, [row.id, JSON.stringify(nextPending)]);
    return { ok: true as const, status: "pending_approval" as const, threadId: String(row.id) };
  }
  const nextMembers = uniqueStrings([...members, actorId], 200);
  await sql.query(`update vc_thread set members_json = $2::jsonb, updated_at = now() where id = $1`, [
    row.id,
    JSON.stringify(nextMembers),
  ]);
  const updated = (await sql.query(`select * from vc_thread where id = $1 limit 1`, [row.id])) as Record<string, unknown>[];
  return { ok: true as const, status: "joined" as const, thread: mapThreadRow(updated[0]!, actorId) };
}

export async function approveMember(input: { threadId: string; adminId: string; targetActorId: string; approve: boolean }) {
  const sql = await ready();
  const rows = (await sql.query(`select * from vc_thread where id = $1 limit 1`, [cleanText(input.threadId, 80)])) as Record<string, unknown>[];
  if (!rows.length) throw new ConnectError("Thread not found", 404);
  const row = rows[0]!;
  const admins = safeJsonParse<string[]>(row.admins_json, []);
  if (!admins.includes(input.adminId)) throw new ConnectError("Admin permission required", 403);
  const pending = safeJsonParse<string[]>(row.pending_json, []).filter((id) => id !== input.targetActorId);
  const members = input.approve
    ? uniqueStrings([...safeJsonParse<string[]>(row.members_json, []), input.targetActorId], 200)
    : safeJsonParse<string[]>(row.members_json, []);
  await sql.query(
    `update vc_thread set pending_json = $2::jsonb, members_json = $3::jsonb, updated_at = now() where id = $1`,
    [row.id, JSON.stringify(pending), JSON.stringify(members)],
  );
  const updated = (await sql.query(`select * from vc_thread where id = $1 limit 1`, [row.id])) as Record<string, unknown>[];
  return { ok: true as const, thread: mapThreadRow(updated[0]!, input.adminId) };
}

function mapMessageRow(r: Record<string, unknown>, viewerId: string) {
  const viewedBy = safeJsonParse<string[]>(r.viewed_by_json, []);
  const deletedForEveryone = Boolean(r.deleted_for_everyone);
  const viewOnce = Boolean(r.view_once);
  const burnedForViewer = viewOnce && viewedBy.includes(viewerId) && String(r.sender_id) !== viewerId;

  return {
    id: Number(r.id),
    threadId: String(r.thread_id),
    clientMsgId: r.client_msg_id ? String(r.client_msg_id) : null,
    senderId: String(r.sender_id),
    senderName: String(r.sender_name),
    msgType: String(r.msg_type),
    body: deletedForEveryone
      ? "This message was deleted"
      : burnedForViewer
        ? "Burned after viewing"
        : String(r.body ?? ""),
    encrypted: Boolean(r.encrypted) && !deletedForEveryone && !burnedForViewer,
    ciphertext: deletedForEveryone || burnedForViewer ? "" : String(r.ciphertext ?? ""),
    mediaUrl: deletedForEveryone || burnedForViewer ? "" : String(r.media_url ?? ""),
    mediaName: String(r.media_name ?? ""),
    mediaMime: String(r.media_mime ?? ""),
    viewOnce,
    viewedBy,
    burned: burnedForViewer,
    replyToId: r.reply_to_id ? Number(r.reply_to_id) : null,
    forwarded: Boolean(r.forwarded),
    editedAt: r.edited_at ? String(r.edited_at) : null,
    deletedForEveryone,
    deletedFor: safeJsonParse<string[]>(r.deleted_for_json, []),
    starredBy: safeJsonParse<string[]>(r.starred_by_json, []),
    pinned: Boolean(r.pinned),
    reactions: safeJsonParse<Record<string, string[]>>(r.reactions_json, {}),
    deliveredTo: safeJsonParse<string[]>(r.delivered_to_json, []),
    readBy: safeJsonParse<string[]>(r.read_by_json, []),
    deliverAt: r.deliver_at ? String(r.deliver_at) : null,
    expiresAt: r.expires_at ? String(r.expires_at) : null,
    meta: safeJsonParse<Record<string, unknown> | null>(r.meta_json, null),
    createdAt: String(r.created_at),
  };
}

export async function sendMessage(input: {
  threadId: string;
  clientMsgId?: string;
  senderId: string;
  senderName?: string;
  msgType?: string;
  body?: string;
  encrypted?: boolean;
  ciphertext?: string;
  mediaUrl?: string;
  mediaName?: string;
  mediaMime?: string;
  viewOnce?: boolean;
  replyToId?: number | null;
  forwarded?: boolean;
  deliverAt?: string | null;
  meta?: Record<string, unknown> | null;
}) {
  const threadId = cleanText(input.threadId, 80);
  const senderId = cleanText(input.senderId, 80);
  const senderName = cleanText(input.senderName, 80) || senderId;
  const clientMsgId = cleanText(input.clientMsgId, 96) || null;
  if (!threadId || !senderId) throw new ConnectError("threadId and senderId are required", 400);

  const sql = await ready();
  const threadRows = (await sql.query(`select * from vc_thread where id = $1 limit 1`, [threadId])) as Record<string, unknown>[];
  if (!threadRows.length) throw new ConnectError("Thread not found", 404);
  const thread = threadRows[0]!;
  const members = safeJsonParse<string[]>(thread.members_json, []);
  const admins = safeJsonParse<string[]>(thread.admins_json, []);

  if (!members.includes(senderId)) {
    throw new ConnectError("You are not a member of this thread", 403, "NOT_MEMBER");
  }
  if (thread.admin_only_post && !admins.includes(senderId)) {
    throw new ConnectError("Only group admins can post here", 403, "ADMIN_ONLY");
  }
  if (String(thread.kind) === "direct") {
    for (const m of members) {
      if (m !== senderId && (await isBlockedBetween(sql, senderId, m))) {
        throw new ConnectError("Message blocked by privacy settings", 403, "USER_BLOCKED");
      }
    }
  }

  // Idempotency deduplication by clientMsgId
  if (clientMsgId) {
    const existing = (await sql.query(
      `select * from vc_message where thread_id = $1 and client_msg_id = $2 limit 1`,
      [threadId, clientMsgId],
    )) as Record<string, unknown>[];
    if (existing.length) {
      return { ok: true as const, deduplicated: true, message: mapMessageRow(existing[0]!, senderId) };
    }
  }

  const encrypted = Boolean(input.encrypted);
  const ciphertext = encrypted ? String(input.ciphertext ?? "").slice(0, 32_000) : "";
  if (encrypted && !ciphertext) {
    throw new ConnectError("ciphertext is required when encrypted is true", 400);
  }
  // Never store plaintext body on the server when E2EE is enabled
  const storedBody = encrypted ? "[Encrypted message]" : String(input.body ?? "").slice(0, 8000);
  const expiresAt = computeExpiresAtIso(String(thread.disappearing_ttl ?? "off"));
  const deliverAt = input.deliverAt && !Number.isNaN(Date.parse(input.deliverAt)) ? input.deliverAt : null;

  const inserted = (await sql.query(
    `insert into vc_message (
       thread_id, client_msg_id, sender_id, sender_name, msg_type, body,
       encrypted, ciphertext, media_url, media_name, media_mime, view_once,
       reply_to_id, forwarded, delivered_to_json, read_by_json, deliver_at, expires_at, meta_json
     ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::jsonb, $15::jsonb, $16, $17, $18::jsonb)
     returning *`,
    [
      threadId,
      clientMsgId,
      senderId,
      senderName,
      cleanText(input.msgType, 32) || "text",
      storedBody,
      encrypted,
      ciphertext,
      String(input.mediaUrl ?? "").slice(0, 260_000),
      cleanText(input.mediaName, 160),
      cleanText(input.mediaMime, 96),
      Boolean(input.viewOnce),
      input.replyToId ?? null,
      Boolean(input.forwarded),
      JSON.stringify([senderId]),
      deliverAt,
      expiresAt,
      input.meta ? JSON.stringify(input.meta) : null,
    ],
  )) as Record<string, unknown>[];

  await sql.query(`update vc_thread set updated_at = now() where id = $1`, [threadId]);
  return { ok: true as const, deduplicated: false, message: mapMessageRow(inserted[0]!, senderId) };
}

export async function listMessages(input: { threadId: string; actorId: string; search?: string }) {
  const threadId = cleanText(input.threadId, 80);
  const actorId = cleanText(input.actorId, 80);
  const search = cleanText(input.search, 120).toLowerCase();
  const sql = await ready();

  // Clean expired disappearing messages on read
  await sql.query(`delete from vc_message where thread_id = $1 and expires_at is not null and expires_at <= now()`, [
    threadId,
  ]);

  const rows = (await sql.query(
    `select * from vc_message
     where thread_id = $1
       and (deliver_at is null or deliver_at <= now() or sender_id = $2)
       and not (deleted_for_json @> $3::jsonb)
     order by id asc
     limit 250`,
    [threadId, actorId, JSON.stringify([actorId])],
  )) as Record<string, unknown>[];

  const mapped = rows.map((r) => mapMessageRow(r, actorId));
  const filtered = search
    ? mapped.filter(
        (m) =>
          m.body.toLowerCase().includes(search) ||
          m.mediaName.toLowerCase().includes(search) ||
          m.senderName.toLowerCase().includes(search),
      )
    : mapped;

  const presence = (await sql.query(
    `select actor_id, actor_name, state from vc_presence
     where thread_id = $1 and actor_id <> $2 and updated_at > now() - interval '12 seconds'`,
    [threadId, actorId],
  )) as { actor_id: string; actor_name: string; state: string }[];

  const polls = (await sql.query(`select * from vc_poll where thread_id = $1 order by created_at desc limit 20`, [
    threadId,
  ])) as Record<string, unknown>[];
  const events = (await sql.query(`select * from vc_event where thread_id = $1 order by created_at desc limit 20`, [
    threadId,
  ])) as Record<string, unknown>[];

  return {
    ok: true as const,
    messages: filtered,
    presence: presence.map((p) => ({ actorId: p.actor_id, actorName: p.actor_name, state: p.state })),
    polls: polls.map((p) => ({
      id: String(p.id),
      threadId: String(p.thread_id),
      question: String(p.question),
      options: safeJsonParse<string[]>(p.options_json, []),
      votes: safeJsonParse<Record<string, string[]>>(p.votes_json, {}),
      createdBy: String(p.created_by),
      createdAt: String(p.created_at),
    })),
    events: events.map((e) => ({
      id: String(e.id),
      threadId: String(e.thread_id),
      title: String(e.title),
      startsAt: String(e.starts_at),
      location: String(e.location ?? ""),
      description: String(e.description ?? ""),
      rsvps: safeJsonParse<Record<string, string>>(e.rsvps_json, {}),
      createdBy: String(e.created_by),
      createdAt: String(e.created_at),
    })),
  };
}

export async function editMessage(input: {
  messageId: number;
  actorId: string;
  body: string;
  encrypted?: boolean;
  ciphertext?: string;
}) {
  const sql = await ready();
  const rows = (await sql.query(`select * from vc_message where id = $1 limit 1`, [Number(input.messageId)])) as Record<
    string,
    unknown
  >[];
  if (!rows.length) throw new ConnectError("Message not found", 404);
  if (String(rows[0]!.sender_id) !== input.actorId) throw new ConnectError("Only sender can edit", 403);
  const encrypted = Boolean(input.encrypted);
  const body = encrypted ? "[Encrypted message]" : String(input.body ?? "").slice(0, 8000);
  const ciphertext = encrypted ? String(input.ciphertext ?? "").slice(0, 32_000) : "";
  await sql.query(
    `update vc_message set body = $2, encrypted = $3, ciphertext = $4, edited_at = now() where id = $1`,
    [Number(input.messageId), body, encrypted, ciphertext],
  );
  return { ok: true as const };
}

export async function deleteMessage(input: { messageId: number; actorId: string; forEveryone?: boolean }) {
  const sql = await ready();
  const rows = (await sql.query(`select * from vc_message where id = $1 limit 1`, [Number(input.messageId)])) as Record<
    string,
    unknown
  >[];
  if (!rows.length) throw new ConnectError("Message not found", 404);
  const msg = rows[0]!;
  if (input.forEveryone) {
    if (String(msg.sender_id) !== input.actorId) {
      throw new ConnectError("Only the sender can delete for everyone", 403);
    }
    await sql.query(
      `update vc_message set deleted_for_everyone = true, body = 'This message was deleted', ciphertext = '', media_url = '' where id = $1`,
      [Number(input.messageId)],
    );
  } else {
    const next = uniqueStrings([...safeJsonParse<string[]>(msg.deleted_for_json, []), input.actorId], 200);
    await sql.query(`update vc_message set deleted_for_json = $2::jsonb where id = $1`, [
      Number(input.messageId),
      JSON.stringify(next),
    ]);
  }
  return { ok: true as const };
}

export async function reactMessage(input: { messageId: number; actorId: string; emoji: string }) {
  const emoji = cleanText(input.emoji, 16);
  if (!emoji) throw new ConnectError("emoji required", 400);
  const sql = await ready();
  const rows = (await sql.query(`select reactions_json from vc_message where id = $1 limit 1`, [Number(input.messageId)])) as {
    reactions_json: unknown;
  }[];
  if (!rows.length) throw new ConnectError("Message not found", 404);
  const map = safeJsonParse<Record<string, string[]>>(rows[0]!.reactions_json, {});
  const current = Array.isArray(map[emoji]) ? map[emoji]! : [];
  map[emoji] = current.includes(input.actorId)
    ? current.filter((x) => x !== input.actorId)
    : [...current, input.actorId];
  if (!map[emoji]!.length) delete map[emoji];
  await sql.query(`update vc_message set reactions_json = $2::jsonb where id = $1`, [
    Number(input.messageId),
    JSON.stringify(map),
  ]);
  return { ok: true as const, reactions: map };
}

export async function toggleStarMessage(messageId: number, actorId: string) {
  const sql = await ready();
  const rows = (await sql.query(`select starred_by_json from vc_message where id = $1 limit 1`, [Number(messageId)])) as {
    starred_by_json: unknown;
  }[];
  if (!rows.length) throw new ConnectError("Message not found", 404);
  const arr = safeJsonParse<string[]>(rows[0]!.starred_by_json, []);
  const next = arr.includes(actorId) ? arr.filter((x) => x !== actorId) : [...arr, actorId];
  await sql.query(`update vc_message set starred_by_json = $2::jsonb where id = $1`, [
    Number(messageId),
    JSON.stringify(next),
  ]);
  return { ok: true as const, starredBy: next };
}

export async function togglePinMessage(messageId: number) {
  const sql = await ready();
  const rows = (await sql.query(`select pinned from vc_message where id = $1 limit 1`, [Number(messageId)])) as {
    pinned: boolean;
  }[];
  if (!rows.length) throw new ConnectError("Message not found", 404);
  const next = !rows[0]!.pinned;
  await sql.query(`update vc_message set pinned = $2 where id = $1`, [Number(messageId), next]);
  return { ok: true as const, pinned: next };
}

export async function markThreadRead(threadId: string, actorId: string) {
  const sql = await ready();
  await sql.query(
    `update vc_message
     set read_by_json = read_by_json || $2::jsonb,
         delivered_to_json = case when not (delivered_to_json @> $2::jsonb) then delivered_to_json || $2::jsonb else delivered_to_json end
     where thread_id = $1 and sender_id <> $3 and not (read_by_json @> $2::jsonb)`,
    [cleanText(threadId, 80), JSON.stringify([actorId]), actorId],
  );
  return { ok: true as const };
}

export async function markViewOnce(messageId: number, actorId: string) {
  const sql = await ready();
  const rows = (await sql.query(`select * from vc_message where id = $1 limit 1`, [Number(messageId)])) as Record<
    string,
    unknown
  >[];
  if (!rows.length) throw new ConnectError("Message not found", 404);
  const row = rows[0]!;
  const viewedBy = uniqueStrings([...safeJsonParse<string[]>(row.viewed_by_json, []), actorId], 200);
  await sql.query(`update vc_message set viewed_by_json = $2::jsonb where id = $1`, [
    Number(messageId),
    JSON.stringify(viewedBy),
  ]);
  return { ok: true as const, message: mapMessageRow(row, actorId), viewedBy };
}

export async function setPresence(input: { threadId: string; actorId: string; actorName?: string; state: string }) {
  const sql = await ready();
  await sql.query(
    `insert into vc_presence (thread_id, actor_id, actor_name, state, updated_at)
     values ($1, $2, $3, $4, now())
     on conflict (thread_id, actor_id) do update set actor_name = excluded.actor_name, state = excluded.state, updated_at = now()`,
    [
      cleanText(input.threadId, 80),
      cleanText(input.actorId, 80),
      cleanText(input.actorName, 80) || input.actorId,
      cleanText(input.state, 24) || "online",
    ],
  );
  return { ok: true as const };
}

export async function listTasks(threadIdRaw: string) {
  const threadId = cleanText(threadIdRaw, 80);
  const sql = await ready();
  const rows = (await sql.query(`select * from vc_task where thread_id = $1 order by created_at desc limit 100`, [
    threadId,
  ])) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: String(r.id),
    threadId: String(r.thread_id),
    title: String(r.title),
    assignee: String(r.assignee ?? ""),
    status: String(r.status ?? "open"),
    dueAt: String(r.due_at ?? ""),
    sourceMsgId: r.source_msg_id ? Number(r.source_msg_id) : null,
    createdBy: String(r.created_by),
    createdAt: String(r.created_at),
  }));
}

export async function createTask(input: {
  threadId: string;
  title: string;
  assignee?: string;
  dueAt?: string;
  sourceMsgId?: number | null;
  createdBy: string;
}) {
  const id = makeId("tsk");
  const title = cleanText(input.title, 220);
  if (!title) throw new ConnectError("Task title is required", 400);
  const sql = await ready();
  await sql.query(
    `insert into vc_task (id, thread_id, title, assignee, status, due_at, source_msg_id, created_by)
     values ($1, $2, $3, $4, 'open', $5, $6, $7)`,
    [
      id,
      cleanText(input.threadId, 80),
      title,
      cleanText(input.assignee, 80),
      cleanText(input.dueAt, 48),
      input.sourceMsgId ?? null,
      cleanText(input.createdBy, 80),
    ],
  );
  return { ok: true as const, tasks: await listTasks(input.threadId) };
}

export async function updateTaskStatus(taskIdRaw: string, statusRaw: string) {
  const id = cleanText(taskIdRaw, 80);
  const status = ["open", "in_progress", "done"].includes(statusRaw) ? statusRaw : "done";
  const sql = await ready();
  const rows = (await sql.query(`update vc_task set status = $2 where id = $1 returning thread_id`, [id, status])) as {
    thread_id: string;
  }[];
  if (!rows.length) throw new ConnectError("Task not found", 404);
  return { ok: true as const, tasks: await listTasks(rows[0]!.thread_id) };
}

export async function deleteTask(taskIdRaw: string) {
  const id = cleanText(taskIdRaw, 80);
  const sql = await ready();
  const rows = (await sql.query(`delete from vc_task where id = $1 returning thread_id`, [id])) as {
    thread_id: string;
  }[];
  return { ok: true as const, tasks: rows.length ? await listTasks(rows[0]!.thread_id) : [] };
}

export async function saveCallNotes(input: {
  actorId: string;
  actorName?: string;
  roomId?: string;
  title?: string;
  notes: string;
}) {
  const actorId = cleanText(input.actorId, 80) || "guest";
  const selfThreadId = `self_${actorId}`;
  await registerProfile({ actorId, displayName: input.actorName || "Noctis Caller" });
  const body = `📞 Call Minutes (${cleanText(input.title, 80) || "Noctis Call"}${input.roomId ? ` · Room ${input.roomId.slice(0, 8)}` : ""}):\n${String(input.notes ?? "").slice(0, 6000)}`;
  const res = await sendMessage({
    threadId: selfThreadId,
    senderId: actorId,
    senderName: input.actorName || "Noctis Caller",
    msgType: "text",
    body,
    encrypted: false,
    meta: { source: "noctis_call_minutes", roomId: input.roomId ?? "" },
  });
  return { ok: true as const, threadId: selfThreadId, message: res.message };
}

export async function createPoll(input: { threadId: string; question: string; options: string[]; createdBy: string }) {
  const id = makeId("pol");
  const options = uniqueStrings(input.options, 10);
  if (!cleanText(input.question, 240) || options.length < 2) {
    throw new ConnectError("Question and at least 2 options are required", 400);
  }
  const sql = await ready();
  await sql.query(
    `insert into vc_poll (id, thread_id, question, options_json, votes_json, created_by)
     values ($1, $2, $3, $4::jsonb, '{}'::jsonb, $5)`,
    [id, cleanText(input.threadId, 80), cleanText(input.question, 240), JSON.stringify(options), cleanText(input.createdBy, 80)],
  );
  return { ok: true as const, pollId: id };
}

export async function votePoll(pollIdRaw: string, actorIdRaw: string, optionIndex: number) {
  const pollId = cleanText(pollIdRaw, 80);
  const actorId = cleanText(actorIdRaw, 80);
  const sql = await ready();
  const rows = (await sql.query(`select votes_json from vc_poll where id = $1 limit 1`, [pollId])) as {
    votes_json: unknown;
  }[];
  if (!rows.length) throw new ConnectError("Poll not found", 404);
  const votes = safeJsonParse<Record<string, string[]>>(rows[0]!.votes_json, {});
  for (const key of Object.keys(votes)) {
    votes[key] = (votes[key] ?? []).filter((id) => id !== actorId);
  }
  const k = String(optionIndex);
  votes[k] = uniqueStrings([...(votes[k] ?? []), actorId], 500);
  await sql.query(`update vc_poll set votes_json = $2::jsonb where id = $1`, [pollId, JSON.stringify(votes)]);
  return { ok: true as const, votes };
}

export async function createEvent(input: {
  threadId: string;
  title: string;
  startsAt: string;
  location?: string;
  description?: string;
  createdBy: string;
}) {
  const id = makeId("evt");
  const title = cleanText(input.title, 160);
  if (!title) throw new ConnectError("Event title is required", 400);
  const sql = await ready();
  await sql.query(
    `insert into vc_event (id, thread_id, title, starts_at, location, description, rsvps_json, created_by)
     values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)`,
    [
      id,
      cleanText(input.threadId, 80),
      title,
      cleanText(input.startsAt, 64) || new Date().toISOString(),
      cleanText(input.location, 160),
      cleanText(input.description, 400),
      JSON.stringify({ [input.createdBy]: "going" }),
      cleanText(input.createdBy, 80),
    ],
  );
  return { ok: true as const, eventId: id };
}

export async function rsvpEvent(eventIdRaw: string, actorIdRaw: string, statusRaw: string) {
  const eventId = cleanText(eventIdRaw, 80);
  const actorId = cleanText(actorIdRaw, 80);
  const status = ["going", "maybe", "declined"].includes(statusRaw) ? statusRaw : "going";
  const sql = await ready();
  const rows = (await sql.query(`select rsvps_json from vc_event where id = $1 limit 1`, [eventId])) as {
    rsvps_json: unknown;
  }[];
  if (!rows.length) throw new ConnectError("Event not found", 404);
  const rsvps = safeJsonParse<Record<string, string>>(rows[0]!.rsvps_json, {});
  rsvps[actorId] = status;
  await sql.query(`update vc_event set rsvps_json = $2::jsonb where id = $1`, [eventId, JSON.stringify(rsvps)]);
  return { ok: true as const, rsvps };
}

export async function createCommunity(input: { name: string; description?: string; createdBy: string }) {
  const id = makeId("com");
  const name = cleanText(input.name, 100);
  if (!name) throw new ConnectError("Community name required", 400);
  const createdBy = cleanText(input.createdBy, 80);
  const inviteCode = makeId("cinv");
  const announce = await createThread({
    kind: "community_announce",
    title: `${name} · Announcements`,
    description: input.description || "Official community broadcast updates",
    communityId: id,
    e2eeEnabled: false,
    adminOnlyPost: true,
    createdBy,
  });
  const sql = await ready();
  await sql.query(
    `insert into vc_community (id, name, description, created_by, announce_thread_id, group_ids_json, invite_code)
     values ($1, $2, $3, $4, $5, '[]'::jsonb, $6)`,
    [id, name, cleanText(input.description, 400), createdBy, announce.thread.id, inviteCode],
  );
  return { ok: true as const, communityId: id, announceThreadId: announce.thread.id, communities: await listCommunities() };
}

export async function listCommunities() {
  const sql = await ready();
  const rows = (await sql.query(`select * from vc_community order by created_at desc limit 50`)) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    description: String(r.description ?? ""),
    createdBy: String(r.created_by),
    announceThreadId: String(r.announce_thread_id ?? ""),
    groupIds: safeJsonParse<string[]>(r.group_ids_json, []),
    inviteCode: String(r.invite_code ?? ""),
    createdAt: String(r.created_at),
  }));
}

export async function createStatus(input: {
  actorId: string;
  actorName?: string;
  kind?: string;
  content: string;
  mediaUrl?: string;
  bgColor?: string;
  privacy?: string;
}) {
  const id = makeId("sts");
  const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  const sql = await ready();
  await sql.query(
    `insert into vc_status (id, actor_id, actor_name, kind, content, media_url, bg_color, privacy, expires_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      id,
      cleanText(input.actorId, 80),
      cleanText(input.actorName, 80) || input.actorId,
      cleanText(input.kind, 16) || "text",
      cleanText(input.content, 1000),
      String(input.mediaUrl ?? "").slice(0, 260_000),
      cleanText(input.bgColor, 32) || "#134e4a",
      cleanText(input.privacy, 24) || "everyone",
      expiresAt,
    ],
  );
  return { ok: true as const, statusId: id, statuses: await listStatuses() };
}

export async function listStatuses() {
  const sql = await ready();
  await sql.query(`delete from vc_status where expires_at <= now()`);
  const rows = (await sql.query(`select * from vc_status where expires_at > now() order by created_at desc limit 60`)) as Record<
    string,
    unknown
  >[];
  return rows.map((r) => ({
    id: String(r.id),
    actorId: String(r.actor_id),
    actorName: String(r.actor_name),
    kind: String(r.kind),
    content: String(r.content),
    mediaUrl: String(r.media_url ?? ""),
    bgColor: String(r.bg_color ?? "#134e4a"),
    privacy: String(r.privacy ?? "everyone"),
    viewers: safeJsonParse<string[]>(r.viewers_json, []),
    reactions: safeJsonParse<Record<string, string[]>>(r.reactions_json, {}),
    expiresAt: String(r.expires_at),
    createdAt: String(r.created_at),
  }));
}

export async function viewStatus(statusId: string, actorId: string) {
  const sql = await ready();
  const rows = (await sql.query(`select viewers_json from vc_status where id = $1 limit 1`, [cleanText(statusId, 80)])) as {
    viewers_json: unknown;
  }[];
  if (!rows.length) throw new ConnectError("Status expired or not found", 404);
  const next = uniqueStrings([...safeJsonParse<string[]>(rows[0]!.viewers_json, []), actorId], 500);
  await sql.query(`update vc_status set viewers_json = $2::jsonb where id = $1`, [statusId, JSON.stringify(next)]);
  return { ok: true as const, viewers: next };
}

export async function reactStatus(statusId: string, actorId: string, emoji: string) {
  const sql = await ready();
  const rows = (await sql.query(`select reactions_json from vc_status where id = $1 limit 1`, [cleanText(statusId, 80)])) as {
    reactions_json: unknown;
  }[];
  if (!rows.length) throw new ConnectError("Status not found", 404);
  const map = safeJsonParse<Record<string, string[]>>(rows[0]!.reactions_json, {});
  map[emoji] = uniqueStrings([...(map[emoji] ?? []), actorId], 500);
  await sql.query(`update vc_status set reactions_json = $2::jsonb where id = $1`, [statusId, JSON.stringify(map)]);
  return { ok: true as const, reactions: map };
}

export async function createChannel(input: {
  name: string;
  handle?: string;
  description?: string;
  verified?: boolean;
  premium?: boolean;
  ownerId: string;
}) {
  const id = makeId("chn");
  const name = cleanText(input.name, 100);
  if (!name) throw new ConnectError("Channel name required", 400);
  const handle = normalizeUsername(input.handle || name) || `@${id}`;
  const ownerId = cleanText(input.ownerId, 80);
  const sql = await ready();
  await sql.query(
    `insert into vc_channel (id, name, handle, description, verified, premium, owner_id, subscribers_json)
     values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
    [
      id,
      name,
      handle,
      cleanText(input.description, 400),
      Boolean(input.verified),
      Boolean(input.premium),
      ownerId,
      JSON.stringify([ownerId]),
    ],
  );
  return { ok: true as const, channelId: id, channels: await listChannels() };
}

export async function subscribeChannel(channelId: string, actorId: string) {
  const sql = await ready();
  const rows = (await sql.query(`select subscribers_json from vc_channel where id = $1 limit 1`, [cleanText(channelId, 80)])) as {
    subscribers_json: unknown;
  }[];
  if (!rows.length) throw new ConnectError("Channel not found", 404);
  const subs = safeJsonParse<string[]>(rows[0]!.subscribers_json, []);
  const next = subs.includes(actorId) ? subs.filter((x) => x !== actorId) : [...subs, actorId];
  await sql.query(`update vc_channel set subscribers_json = $2::jsonb where id = $1`, [channelId, JSON.stringify(next)]);
  return { ok: true as const, subscribers: next };
}

export async function postChannel(input: { channelId: string; authorName: string; body: string; mediaUrl?: string }) {
  const sql = await ready();
  const rows = (await sql.query(
    `insert into vc_channel_post (channel_id, author_name, body, media_url, views)
     values ($1, $2, $3, $4, 1) returning *`,
    [
      cleanText(input.channelId, 80),
      cleanText(input.authorName, 80) || "Publisher",
      cleanText(input.body, 4000),
      String(input.mediaUrl ?? "").slice(0, 260_000),
    ],
  )) as Record<string, unknown>[];
  return { ok: true as const, post: rows[0]!, channels: await listChannels() };
}

export async function reactChannelPost(postId: number, emoji: string, actorId: string) {
  const sql = await ready();
  const rows = (await sql.query(`select reactions_json from vc_channel_post where id = $1 limit 1`, [Number(postId)])) as {
    reactions_json: unknown;
  }[];
  if (!rows.length) throw new ConnectError("Channel post not found", 404);
  const map = safeJsonParse<Record<string, string[]>>(rows[0]!.reactions_json, {});
  map[emoji] = uniqueStrings([...(map[emoji] ?? []), actorId], 500);
  await sql.query(`update vc_channel_post set reactions_json = $2::jsonb, views = views + 1 where id = $1`, [
    Number(postId),
    JSON.stringify(map),
  ]);
  return { ok: true as const, reactions: map };
}

export async function listChannels() {
  const sql = await ready();
  const channels = (await sql.query(`select * from vc_channel order by created_at desc limit 50`)) as Record<string, unknown>[];
  const posts = (await sql.query(`select * from vc_channel_post order by id desc limit 120`)) as Record<string, unknown>[];
  return channels.map((c) => ({
    id: String(c.id),
    name: String(c.name),
    handle: String(c.handle),
    description: String(c.description ?? ""),
    verified: Boolean(c.verified),
    premium: Boolean(c.premium),
    ownerId: String(c.owner_id),
    subscribers: safeJsonParse<string[]>(c.subscribers_json, []),
    posts: posts
      .filter((p) => String(p.channel_id) === String(c.id))
      .slice(0, 15)
      .map((p) => ({
        id: Number(p.id),
        channelId: String(p.channel_id),
        authorName: String(p.author_name),
        body: String(p.body),
        mediaUrl: String(p.media_url ?? ""),
        reactions: safeJsonParse<Record<string, string[]>>(p.reactions_json, {}),
        views: Number(p.views ?? 0),
        createdAt: String(p.created_at),
      })),
    createdAt: String(c.created_at),
  }));
}

export async function upsertBusiness(input: {
  id?: string;
  ownerId: string;
  name: string;
  category?: string;
  description?: string;
  hoursText?: string;
  greetingMsg?: string;
  awayMsg?: string;
  quickReplies?: string[];
  teamAgents?: string[];
}) {
  const id = cleanText(input.id, 80) || makeId("biz");
  const name = cleanText(input.name, 100);
  if (!name) throw new ConnectError("Business name is required", 400);
  const sql = await ready();
  await sql.query(
    `insert into vc_business (id, owner_id, name, category, description, verified, hours_text, greeting_msg, away_msg, quick_replies_json, team_agents_json)
     values ($1, $2, $3, $4, $5, true, $6, $7, $8, $9::jsonb, $10::jsonb)
     on conflict (id) do update set
       name = excluded.name,
       category = excluded.category,
       description = excluded.description,
       hours_text = excluded.hours_text,
       greeting_msg = excluded.greeting_msg,
       away_msg = excluded.away_msg,
       quick_replies_json = excluded.quick_replies_json,
       team_agents_json = excluded.team_agents_json`,
    [
      id,
      cleanText(input.ownerId, 80),
      name,
      cleanText(input.category, 60) || "General",
      cleanText(input.description, 400),
      cleanText(input.hoursText, 120) || "Mon-Fri 9:00-18:00",
      cleanText(input.greetingMsg, 300) || "Welcome! How can we help you today?",
      cleanText(input.awayMsg, 300) || "We are away right now and will respond shortly.",
      JSON.stringify(uniqueStrings(input.quickReplies ?? [], 20)),
      JSON.stringify(uniqueStrings(input.teamAgents ?? [], 20)),
    ],
  );
  return { ok: true as const, businessId: id, ...(await listBusinesses()) };
}

export async function addProduct(input: {
  businessId: string;
  name: string;
  priceCents: number;
  currency?: string;
  description?: string;
}) {
  const id = makeId("prd");
  const sql = await ready();
  await sql.query(
    `insert into vc_product (id, business_id, name, price_cents, currency, description, in_stock)
     values ($1, $2, $3, $4, $5, $6, true)`,
    [
      id,
      cleanText(input.businessId, 80),
      cleanText(input.name, 120),
      Math.max(0, Math.round(Number(input.priceCents || 0))),
      cleanText(input.currency, 8) || "USD",
      cleanText(input.description, 400),
    ],
  );
  return { ok: true as const, productId: id, ...(await listBusinesses()) };
}

export async function createOrder(input: {
  businessId: string;
  customerId: string;
  customerName?: string;
  items: { productId: string; name: string; qty: number; priceCents: number }[];
  appointmentAt?: string;
  notes?: string;
}) {
  const id = makeId("ord");
  const items = Array.isArray(input.items) ? input.items.slice(0, 30) : [];
  const totalCents = items.reduce((acc, it) => acc + Math.max(0, Number(it.priceCents || 0)) * Math.max(1, Number(it.qty || 1)), 0);
  const sql = await ready();
  await sql.query(
    `insert into vc_order (id, business_id, customer_id, customer_name, items_json, total_cents, status, customer_label, appointment_at, notes)
     values ($1, $2, $3, $4, $5::jsonb, $6, 'pending', 'Lead', $7, $8)`,
    [
      id,
      cleanText(input.businessId, 80),
      cleanText(input.customerId, 80),
      cleanText(input.customerName, 80) || "Customer",
      JSON.stringify(items),
      totalCents,
      cleanText(input.appointmentAt, 64),
      cleanText(input.notes, 400),
    ],
  );
  return { ok: true as const, orderId: id, ...(await listBusinesses()) };
}

export async function updateOrder(input: { orderId: string; status?: string; assignedAgent?: string; customerLabel?: string }) {
  const sql = await ready();
  const rows = (await sql.query(`select * from vc_order where id = $1 limit 1`, [cleanText(input.orderId, 80)])) as Record<
    string,
    unknown
  >[];
  if (!rows.length) throw new ConnectError("Order not found", 404);
  const cur = rows[0]!;
  await sql.query(
    `update vc_order set status = $2, assigned_agent = $3, customer_label = $4 where id = $1`,
    [
      cur.id,
      cleanText(input.status, 32) || String(cur.status),
      input.assignedAgent !== undefined ? cleanText(input.assignedAgent, 80) : String(cur.assigned_agent ?? ""),
      input.customerLabel !== undefined ? cleanText(input.customerLabel, 40) : String(cur.customer_label ?? "Lead"),
    ],
  );
  return { ok: true as const, ...(await listBusinesses()) };
}

export async function listBusinesses() {
  const sql = await ready();
  const businesses = (await sql.query(`select * from vc_business order by created_at desc limit 30`)) as Record<string, unknown>[];
  const products = (await sql.query(`select * from vc_product order by created_at desc limit 120`)) as Record<string, unknown>[];
  const orders = (await sql.query(`select * from vc_order order by created_at desc limit 100`)) as Record<string, unknown>[];
  return {
    businesses: businesses.map((b) => ({
      id: String(b.id),
      ownerId: String(b.owner_id),
      name: String(b.name),
      category: String(b.category),
      description: String(b.description ?? ""),
      verified: Boolean(b.verified),
      hoursText: String(b.hours_text ?? ""),
      greetingMsg: String(b.greeting_msg ?? ""),
      awayMsg: String(b.away_msg ?? ""),
      quickReplies: safeJsonParse<string[]>(b.quick_replies_json, []),
      labels: safeJsonParse<string[]>(b.labels_json, ["Lead", "VIP", "Support", "Paid"]),
      teamAgents: safeJsonParse<string[]>(b.team_agents_json, []),
    })),
    products: products.map((p) => ({
      id: String(p.id),
      businessId: String(p.business_id),
      name: String(p.name),
      priceCents: Number(p.price_cents ?? 0),
      currency: String(p.currency ?? "USD"),
      description: String(p.description ?? ""),
      inStock: Boolean(p.in_stock),
    })),
    orders: orders.map((o) => ({
      id: String(o.id),
      businessId: String(o.business_id),
      customerId: String(o.customer_id),
      customerName: String(o.customer_name),
      items: safeJsonParse<Record<string, unknown>[]>(o.items_json, []),
      totalCents: Number(o.total_cents ?? 0),
      status: String(o.status ?? "pending"),
      assignedAgent: String(o.assigned_agent ?? ""),
      customerLabel: String(o.customer_label ?? "Lead"),
      appointmentAt: String(o.appointment_at ?? ""),
      notes: String(o.notes ?? ""),
      createdAt: String(o.created_at),
    })),
  };
}

export async function listCallHistory(phoneE164Raw?: string) {
  const sql = await ready();
  const phone = cleanText(phoneE164Raw, 24);
  try {
    const rows = (await sql.query(
      phone
        ? `select id, room_id, from_phone_e164, from_name, to_phone_e164, mode, status, created_at
           from world_call_ring
           where from_phone_e164 = $1 or to_phone_e164 = $1
           order by id desc limit 40`
        : `select id, room_id, from_phone_e164, from_name, to_phone_e164, mode, status, created_at
           from world_call_ring
           order by id desc limit 40`,
      phone ? [phone] : [],
    )) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: Number(r.id),
      roomId: String(r.room_id),
      fromPhoneE164: String(r.from_phone_e164 ?? ""),
      fromName: String(r.from_name ?? ""),
      toPhoneE164: String(r.to_phone_e164 ?? ""),
      mode: String(r.mode ?? "voice"),
      status: String(r.status ?? "ringing"),
      direction: phone && String(r.from_phone_e164 ?? "") === phone ? "outgoing" : "incoming",
      createdAt: String(r.created_at),
    }));
  } catch {
    return [];
  }
}

export async function getAdminTelemetry() {
  const sql = await ready();
  const qCount = async (tableSql: string): Promise<number> => {
    try {
      const r = (await sql.query(tableSql)) as { cnt: number | string }[];
      return Number(r[0]?.cnt ?? 0);
    } catch {
      return 0;
    }
  };
  const [
    profiles,
    devices,
    threads,
    messages,
    encryptedMessages,
    tasks,
    communities,
    statuses,
    channels,
    businesses,
    orders,
    openReports,
    recentCallRings,
    missedCallRings,
  ] = await Promise.all([
    qCount(`select count(*)::int as cnt from vc_profile`),
    qCount(`select count(*)::int as cnt from vc_device where revoked = false`),
    qCount(`select count(*)::int as cnt from vc_thread`),
    qCount(`select count(*)::int as cnt from vc_message`),
    qCount(`select count(*)::int as cnt from vc_message where encrypted = true`),
    qCount(`select count(*)::int as cnt from vc_task`),
    qCount(`select count(*)::int as cnt from vc_community`),
    qCount(`select count(*)::int as cnt from vc_status where expires_at > now()`),
    qCount(`select count(*)::int as cnt from vc_channel`),
    qCount(`select count(*)::int as cnt from vc_business`),
    qCount(`select count(*)::int as cnt from vc_order`),
    qCount(`select count(*)::int as cnt from vc_report where status = 'open'`),
    qCount(`select count(*)::int as cnt from world_call_ring`),
    qCount(`select count(*)::int as cnt from world_call_ring where status = 'missed'`),
  ]);

  const reportQueue = (await sql.query(
    `select id, target_id, reason, status, created_at from vc_report order by id desc limit 20`,
  )) as Record<string, unknown>[];

  // Zero private plaintext bodies or ciphertext returned! Aggregate counts & metadata only.
  return {
    ok: true as const,
    privacyNotice: "Aggregate telemetry only. Zero private message plaintext or E2EE keys exposed.",
    metrics: {
      profiles,
      devices,
      threads,
      messages,
      encryptedMessages,
      tasks,
      communities,
      statuses,
      channels,
      businesses,
      orders,
      openReports,
      recentCallRings,
      missedCallRings,
    },
    reports: reportQueue.map((r) => ({
      id: Number(r.id),
      targetId: String(r.target_id),
      reason: String(r.reason),
      status: String(r.status),
      createdAt: String(r.created_at),
    })),
    flags: await getFlags(),
  };
}

export async function exportActorBackup(actorIdRaw: string) {
  const actorId = cleanText(actorIdRaw, 80);
  const sql = await ready();
  const [profileRows, threads, blocks] = await Promise.all([
    sql.query(`select * from vc_profile where actor_id = $1 limit 1`, [actorId]),
    listThreads(actorId),
    listBlocks(actorId),
  ]);
  const msgRows = (await sql.query(
    `select m.* from vc_message m
     join vc_thread t on t.id = m.thread_id
     where t.members_json @> $1::jsonb
     order by m.id desc limit 400`,
    [JSON.stringify([actorId])],
  )) as Record<string, unknown>[];

  return {
    exportedAt: new Date().toISOString(),
    actorId,
    profile: (profileRows as Record<string, unknown>[])[0] ? mapProfileRow((profileRows as Record<string, unknown>[])[0]!) : null,
    threads,
    blocks,
    messages: msgRows.map((m) => mapMessageRow(m, actorId)),
  };
}

export async function bootstrapConnect(actorIdRaw: string, phoneE164Raw?: string) {
  const actorId = cleanText(actorIdRaw, 80);
  const sql = await ready();
  const [flags, threads, statuses, communities, channels, biz, callHistory, directoryRows, devices, blocks] = await Promise.all([
    getFlags(),
    actorId ? listThreads(actorId) : Promise.resolve([]),
    listStatuses(),
    listCommunities(),
    listChannels(),
    listBusinesses(),
    listCallHistory(phoneE164Raw),
    sql.query(`select actor_id, phone_e164, username, display_name, bio, public_key_jwk, last_seen_at from vc_profile order by last_seen_at desc limit 80`),
    actorId ? listDevices(actorId) : Promise.resolve([]),
    actorId ? listBlocks(actorId) : Promise.resolve([]),
  ]);
  return {
    ok: true as const,
    flags,
    threads,
    statuses,
    communities,
    channels,
    businesses: biz.businesses,
    products: biz.products,
    orders: biz.orders,
    callHistory,
    directory: (directoryRows as Record<string, unknown>[]).map((r) => ({
      actorId: String(r.actor_id),
      phoneE164: String(r.phone_e164 ?? ""),
      username: String(r.username ?? ""),
      displayName: String(r.display_name ?? ""),
      bio: String(r.bio ?? ""),
      publicKeyJwk: String(r.public_key_jwk ?? ""),
      lastSeenAt: String(r.last_seen_at ?? ""),
    })),
    devices,
    blocks,
  };
}
