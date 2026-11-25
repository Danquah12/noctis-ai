import { getSql } from "@/lib/db";
import { normalizeWorldE164 } from "@/lib/world-dial-codes";

export type WorldCallMode = "voice" | "video";
export type WorldSignalKind = "offer" | "answer" | "ice" | "stage" | "mark";
export type WorldRingResponseStatus = "accepted" | "declined" | "cancelled";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const E164_RE = /^\+[0-9]{7,15}$/;
const ALLOWED_KINDS = new Set<WorldSignalKind>(["offer", "answer", "ice", "stage", "mark"]);
const ALLOWED_RING_RESPONSES = new Set<WorldRingResponseStatus>(["accepted", "declined", "cancelled"]);

async function ready() {
  const sql = await getSql();
  await sql.query(`create table if not exists world_call_room (
    id text primary key,
    title text not null,
    mode text not null default 'voice',
    target_e164 text,
    host_peer_id text not null,
    host_name text not null,
    created_at timestamptz not null default now()
  )`);
  await sql.query(`create table if not exists world_call_peer (
    room_id text not null references world_call_room (id) on delete cascade,
    peer_id text not null,
    name text not null,
    seen_at timestamptz not null default now(),
    primary key (room_id, peer_id)
  )`);
  await sql.query(`create table if not exists world_call_signal (
    id serial primary key,
    room_id text not null references world_call_room (id) on delete cascade,
    from_id text not null,
    to_id text not null,
    kind text not null,
    payload text not null,
    created_at timestamptz not null default now()
  )`);
  await sql.query(`create table if not exists world_call_directory (
    phone_e164 text primary key,
    device_id text not null,
    display_name text not null,
    country_iso text,
    last_seen_at timestamptz not null default now(),
    created_at timestamptz not null default now()
  )`);
  await sql.query(`create table if not exists world_call_ring (
    id serial primary key,
    room_id text not null references world_call_room (id) on delete cascade,
    from_phone_e164 text,
    from_name text not null,
    to_phone_e164 text not null,
    mode text not null default 'voice',
    status text not null default 'ringing',
    created_at timestamptz not null default now()
  )`);
  return sql;
}

function cleanRoomId(raw: unknown): string {
  const id = String(raw ?? "").trim();
  if (!UUID_RE.test(id)) throw new Error("Invalid call room ID");
  return id;
}

function cleanPeerId(raw: unknown): string {
  const peer = String(raw ?? "").trim().slice(0, 80);
  if (!peer) throw new Error("Invalid caller peer ID");
  return peer;
}

function cleanName(raw: unknown, fallback = "Guest"): string {
  const name = String(raw ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  return name || fallback;
}

function cleanPhoneE164(raw: unknown, defaultDial?: string): string {
  const value = String(raw ?? "").trim();
  if (E164_RE.test(value)) return value;
  const norm = normalizeWorldE164(value, defaultDial);
  return norm.valid ? norm.e164 : "";
}

async function sweepStaleRooms(sql: Awaited<ReturnType<typeof getSql>>) {
  await sql`
    delete from world_call_room r
    where r.created_at < now() - interval '8 hours'
    and not exists (
      select 1 from world_call_peer p
      where p.room_id = r.id and p.seen_at > now() - interval '8 hours'
    )
  `;
}

export async function createWorldCallRoom(input: {
  title?: string;
  mode?: string;
  targetE164?: string;
  hostPeerId: string;
  hostName?: string;
}) {
  const sql = await ready();
  await sweepStaleRooms(sql);
  const id = crypto.randomUUID();
  const mode: WorldCallMode = input.mode === "video" ? "video" : "voice";
  const targetRaw = String(input.targetE164 ?? "").trim();
  const targetE164 = E164_RE.test(targetRaw) ? targetRaw : "";
  const title = cleanName(input.title, targetE164 || "Global internet call").slice(0, 80);
  const hostPeerId = cleanPeerId(input.hostPeerId);
  const hostName = cleanName(input.hostName, "Caller");

  await sql`
    insert into world_call_room (id, title, mode, target_e164, host_peer_id, host_name)
    values (${id}, ${title}, ${mode}, ${targetE164 || null}, ${hostPeerId}, ${hostName})
  `;
  await sql`
    insert into world_call_peer (room_id, peer_id, name, seen_at)
    values (${id}, ${hostPeerId}, ${hostName}, now())
    on conflict (room_id, peer_id) do update set name = excluded.name, seen_at = now()
  `;

  return {
    id,
    title,
    mode,
    targetE164,
    hostPeerId,
    hostName,
  };
}

export async function getWorldCallRoom(roomIdRaw: string) {
  const roomId = cleanRoomId(roomIdRaw);
  const sql = await ready();
  const rows = await sql<{
    id: string;
    title: string;
    mode: string;
    target_e164: string | null;
    host_peer_id: string;
    host_name: string;
  }>`
    select id, title, mode, target_e164, host_peer_id, host_name
    from world_call_room
    where id = ${roomId}
    limit 1
  `;
  if (!rows.length) return null;
  const row = rows[0]!;
  const peerRows = await sql<{ n: number }>`
    select count(*)::int as n from world_call_peer
    where room_id = ${roomId} and seen_at > now() - interval '45 seconds'
  `;
  return {
    exists: true as const,
    roomId: row.id,
    title: row.title,
    mode: (row.mode === "video" ? "video" : "voice") as WorldCallMode,
    targetE164: row.target_e164 ?? "",
    hostPeerId: row.host_peer_id,
    hostName: row.host_name,
    activePeers: Number(peerRows[0]?.n ?? 0),
  };
}

export async function beatWorldCallRoom(input: {
  roomId: string;
  peerId: string;
  name?: string;
  cursor?: number;
}) {
  const roomId = cleanRoomId(input.roomId);
  const peerId = cleanPeerId(input.peerId);
  const name = cleanName(input.name, "Guest");
  const cursor = Math.max(0, Number(input.cursor) || 0);
  const sql = await ready();

  const rooms = await sql<{
    id: string;
    title: string;
    mode: string;
    target_e164: string | null;
    host_peer_id: string;
  }>`
    select id, title, mode, target_e164, host_peer_id
    from world_call_room
    where id = ${roomId}
    limit 1
  `;
  if (!rooms.length) throw new Error("That call room has ended");
  const room = rooms[0]!;

  await sql`
    insert into world_call_peer (room_id, peer_id, name, seen_at)
    values (${roomId}, ${peerId}, ${name}, now())
    on conflict (room_id, peer_id) do update set name = excluded.name, seen_at = now()
  `;
  await sql`delete from world_call_peer where room_id = ${roomId} and seen_at < now() - interval '45 seconds'`;
  await sql`delete from world_call_signal where room_id = ${roomId} and created_at < now() - interval '3 minutes'`;

  const peers = await sql<{ peer_id: string; name: string }>`
    select peer_id, name from world_call_peer
    where room_id = ${roomId} and seen_at > now() - interval '45 seconds'
  `;
  const stageRows = await sql<{ payload: string }>`
    select payload from world_call_signal
    where room_id = ${roomId} and kind = 'stage'
    order by id desc
    limit 1
  `;
  const signals = await sql<{ id: number; from_id: string; kind: string; payload: string }>`
    select id, from_id, kind, payload from world_call_signal
    where room_id = ${roomId} and to_id = ${peerId} and id > ${cursor}
    order by id asc
    limit 400
  `;
  const nextCursor = signals.length ? Number(signals[signals.length - 1]!.id) : cursor;

  return {
    cursor: nextCursor,
    seats: peers.map((p) => ({ userId: p.peer_id, name: p.name })),
    hostId: room.host_peer_id,
    mode: (room.mode === "video" ? "video" : "voice") as WorldCallMode,
    targetE164: room.target_e164 ?? "",
    title: room.title,
    stage: stageRows[0]?.payload ?? "",
    signals: signals.map((s) => ({
      id: Number(s.id),
      from: s.from_id,
      kind: s.kind,
      payload: s.payload,
    })),
  };
}

export async function pushWorldCallSignal(input: {
  roomId: string;
  fromId: string;
  toId: string;
  kind: string;
  payload: string;
}) {
  const roomId = cleanRoomId(input.roomId);
  const fromId = cleanPeerId(input.fromId);
  const toId = cleanPeerId(input.toId);
  const kind = input.kind as WorldSignalKind;
  const payload = String(input.payload ?? "");
  if (!ALLOWED_KINDS.has(kind)) throw new Error("Unsupported signal kind");
  if (payload.length < 2 || payload.length > 20_000) throw new Error("Signal payload out of range");

  const sql = await ready();
  const room = await sql`select 1 as ok from world_call_room where id = ${roomId} limit 1`;
  if (!room.length) throw new Error("That call room has ended");

  await sql`
    insert into world_call_signal (room_id, from_id, to_id, kind, payload)
    values (${roomId}, ${fromId}, ${toId}, ${kind}, ${payload})
  `;
  return { ok: true as const };
}

export async function leaveWorldCallRoom(input: { roomId: string; peerId: string }) {
  const roomId = cleanRoomId(input.roomId);
  const peerId = cleanPeerId(input.peerId);
  const sql = await ready();
  await sql`delete from world_call_peer where room_id = ${roomId} and peer_id = ${peerId}`;
  return { ok: true as const };
}

export async function registerWorldPhone(input: {
  phoneE164: string;
  deviceId: string;
  displayName?: string;
  countryIso?: string;
  defaultDial?: string;
}) {
  const phoneE164 = cleanPhoneE164(input.phoneE164, input.defaultDial);
  if (!phoneE164) throw new Error("Enter a valid global phone number (7 to 15 digits)");
  const deviceId = cleanPeerId(input.deviceId);
  const displayName = cleanName(input.displayName, "Noctis User");
  const countryIso = String(input.countryIso ?? "").trim().toUpperCase().slice(0, 4);
  const sql = await ready();

  await sql`
    insert into world_call_directory (phone_e164, device_id, display_name, country_iso, last_seen_at)
    values (${phoneE164}, ${deviceId}, ${displayName}, ${countryIso || null}, now())
    on conflict (phone_e164) do update set
      device_id = excluded.device_id,
      display_name = excluded.display_name,
      country_iso = excluded.country_iso,
      last_seen_at = now()
  `;

  return {
    ok: true as const,
    phoneE164,
    displayName,
    countryIso,
  };
}

export async function lookupWorldPhone(phoneRaw: string, defaultDial?: string) {
  const phoneE164 = cleanPhoneE164(phoneRaw, defaultDial);
  if (!phoneE164) {
    return {
      ok: true as const,
      registered: false,
      phoneE164: "",
      displayName: "",
      countryIso: "",
      online: false,
    };
  }
  const sql = await ready();
  const rows = await sql<{
    phone_e164: string;
    display_name: string;
    country_iso: string | null;
    online: boolean;
  }>`
    select
      phone_e164,
      display_name,
      country_iso,
      (last_seen_at > now() - interval '90 seconds') as online
    from world_call_directory
    where phone_e164 = ${phoneE164}
    limit 1
  `;
  if (!rows.length) {
    return {
      ok: true as const,
      registered: false,
      phoneE164,
      displayName: "",
      countryIso: "",
      online: false,
    };
  }
  const row = rows[0]!;
  return {
    ok: true as const,
    registered: true,
    phoneE164: row.phone_e164,
    displayName: row.display_name,
    countryIso: row.country_iso ?? "",
    online: Boolean(row.online),
  };
}

export async function ringWorldPhone(input: {
  roomId: string;
  fromPhoneE164?: string;
  fromName?: string;
  toPhoneE164: string;
  mode?: string;
}) {
  const roomId = cleanRoomId(input.roomId);
  const toPhoneE164 = cleanPhoneE164(input.toPhoneE164);
  if (!toPhoneE164) throw new Error("Valid target E.164 phone number is required");
  const fromPhoneE164 = input.fromPhoneE164 ? cleanPhoneE164(input.fromPhoneE164) : "";
  const fromName = cleanName(input.fromName, fromPhoneE164 || "Noctis Caller");
  const mode: WorldCallMode = input.mode === "video" ? "video" : "voice";
  const sql = await ready();

  const room = await sql`select 1 as ok from world_call_room where id = ${roomId} limit 1`;
  if (!room.length) throw new Error("Call room does not exist");

  const target = await sql<{
    display_name: string;
    online: boolean;
  }>`
    select display_name, (last_seen_at > now() - interval '90 seconds') as online
    from world_call_directory
    where phone_e164 = ${toPhoneE164}
    limit 1
  `;
  if (!target.length) {
    throw new Error("Target phone number is not registered on Noctis yet");
  }

  await sql`delete from world_call_ring where created_at < now() - interval '5 minutes'`;
  const inserted = await sql<{ id: number }>`
    insert into world_call_ring (room_id, from_phone_e164, from_name, to_phone_e164, mode, status)
    values (${roomId}, ${fromPhoneE164 || null}, ${fromName}, ${toPhoneE164}, ${mode}, 'ringing')
    returning id
  `;

  return {
    ok: true as const,
    ringId: Number(inserted[0]!.id),
    toDisplayName: target[0]!.display_name,
    online: Boolean(target[0]!.online),
  };
}

export async function pollWorldRings(input: { phoneE164: string; deviceId?: string }) {
  const phoneE164 = cleanPhoneE164(input.phoneE164);
  if (!phoneE164) return { ok: true as const, rings: [] };
  const deviceId = String(input.deviceId ?? "").trim().slice(0, 80);
  const sql = await ready();

  if (deviceId) {
    await sql`
      update world_call_directory
      set last_seen_at = now()
      where phone_e164 = ${phoneE164} and device_id = ${deviceId}
    `;
  } else {
    await sql`
      update world_call_directory
      set last_seen_at = now()
      where phone_e164 = ${phoneE164}
    `;
  }

  await sql`
    update world_call_ring
    set status = 'missed'
    where status = 'ringing' and created_at < now() - interval '75 seconds'
  `;

  const rows = await sql<{
    id: number;
    room_id: string;
    from_name: string;
    from_phone_e164: string | null;
    mode: string;
    created_at: string;
  }>`
    select id, room_id, from_name, from_phone_e164, mode, created_at
    from world_call_ring
    where to_phone_e164 = ${phoneE164}
      and status = 'ringing'
      and created_at > now() - interval '75 seconds'
    order by id desc
    limit 5
  `;

  return {
    ok: true as const,
    rings: rows.map((r) => ({
      id: Number(r.id),
      roomId: r.room_id,
      fromName: r.from_name,
      fromPhoneE164: r.from_phone_e164 ?? "",
      mode: (r.mode === "video" ? "video" : "voice") as WorldCallMode,
      createdAt: r.created_at,
    })),
  };
}

export async function respondWorldRing(input: { ringId: number; status: string }) {
  const ringId = Number(input.ringId);
  if (!Number.isInteger(ringId) || ringId < 1) throw new Error("Invalid ring ID");
  const status = String(input.status ?? "").trim() as WorldRingResponseStatus;
  if (!ALLOWED_RING_RESPONSES.has(status)) throw new Error("Invalid ring status");
  const sql = await ready();

  await sql`
    update world_call_ring
    set status = ${status}
    where id = ${ringId}
  `;

  return { ok: true as const, ringId, status };
}

export async function getWorldRingStatus(ringIdRaw: number) {
  const ringId = Number(ringIdRaw);
  if (!Number.isInteger(ringId) || ringId < 1) throw new Error("Invalid ring ID");
  const sql = await ready();
  const rows = await sql<{
    id: number;
    status: string;
    room_id: string;
    to_phone_e164: string;
  }>`
    select id, status, room_id, to_phone_e164
    from world_call_ring
    where id = ${ringId}
    limit 1
  `;
  if (!rows.length) return { ok: true as const, ringId, status: "expired", roomId: "", toPhoneE164: "" };
  const row = rows[0]!;
  return {
    ok: true as const,
    ringId: Number(row.id),
    status: row.status,
    roomId: row.room_id,
    toPhoneE164: row.to_phone_e164,
  };
}
