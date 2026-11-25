import { getSql } from "@/lib/db";

export type WorldCallMode = "voice" | "video";
export type WorldSignalKind = "offer" | "answer" | "ice" | "stage" | "mark";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const E164_RE = /^\+[0-9]{7,15}$/;
const ALLOWED_KINDS = new Set<WorldSignalKind>(["offer", "answer", "ice", "stage", "mark"]);

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
