export type DisappearingTtlPreset = "off" | "24h" | "7d" | "90d";
export type ThreadFilterTab = "all" | "unread" | "favorites" | "groups" | "archived" | "business";

export interface OfflineQueuedMessage {
  clientMsgId: string;
  threadId: string;
  senderId: string;
  senderName: string;
  msgType: string;
  body: string;
  encrypted: boolean;
  ciphertext?: string;
  mediaUrl?: string;
  mediaName?: string;
  mediaMime?: string;
  viewOnce?: boolean;
  replyToId?: number | null;
  deliverAt?: string | null;
  meta?: Record<string, unknown> | null;
  queuedAt: number;
}

const OFFLINE_QUEUE_KEY = "vibe_connect_offline_queue_v1";

export function normalizeUsername(raw: string): string {
  const cleaned = String(raw ?? "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_.]/g, "");
  if (cleaned.length < 3) return "";
  return `@${cleaned.slice(0, 28)}`;
}

export function computeExpiresAtIso(
  ttlPreset: DisappearingTtlPreset | string,
  nowMs: number = Date.now(),
): string | null {
  const hoursMap: Record<string, number> = {
    "24h": 24,
    "7d": 24 * 7,
    "90d": 24 * 90,
  };
  const hours = hoursMap[ttlPreset];
  if (!hours) return null;
  return new Date(nowMs + hours * 3600 * 1000).toISOString();
}

export function isMessageVisibleNow(
  msg: {
    deliverAt?: string | null;
    expiresAt?: string | null;
    deletedForEveryone?: boolean;
    senderId?: string;
  },
  viewerId?: string,
  nowMs: number = Date.now(),
): boolean {
  if (msg.expiresAt) {
    const exp = Date.parse(msg.expiresAt);
    if (!Number.isNaN(exp) && exp <= nowMs) return false;
  }
  if (msg.deliverAt) {
    const del = Date.parse(msg.deliverAt);
    if (!Number.isNaN(del) && del > nowMs && msg.senderId !== viewerId) {
      return false;
    }
  }
  return true;
}

export function dedupeMessagesByClientId<
  T extends { id?: string | number; clientMsgId?: string | null },
>(messages: T[]): T[] {
  const seenClientIds = new Set<string>();
  const seenIds = new Set<string>();
  const result: T[] = [];
  for (const item of messages) {
    if (item.clientMsgId) {
      if (seenClientIds.has(item.clientMsgId)) continue;
      seenClientIds.add(item.clientMsgId);
    }
    if (item.id !== undefined && item.id !== null) {
      const idKey = String(item.id);
      if (seenIds.has(idKey)) continue;
      seenIds.add(idKey);
    }
    result.push(item);
  }
  return result;
}

export function readOfflineQueue(): OfflineQueuedMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OfflineQueuedMessage[]) : [];
  } catch {
    return [];
  }
}

export function enqueueOfflineMessage(item: OfflineQueuedMessage): OfflineQueuedMessage[] {
  const current = dedupeMessagesByClientId([...readOfflineQueue(), item]);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(current));
    } catch {
      /* ignore quota */
    }
  }
  return current;
}

export function removeOfflineMessage(clientMsgId: string): OfflineQueuedMessage[] {
  const next = readOfflineQueue().filter((m) => m.clientMsgId !== clientMsgId);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota */
    }
  }
  return next;
}

export function formatSafetyNumberBlocks(raw: string): string[] {
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export interface FilterableThread {
  id: string;
  kind: string;
  title: string;
  unreadCount?: number;
  isFavorite?: boolean;
  isArchived?: boolean;
  lastMessagePreview?: string;
}

export function filterThreadsByTab<T extends FilterableThread>(
  threads: T[],
  tab: ThreadFilterTab,
  query: string = "",
): T[] {
  const q = query.trim().toLowerCase();
  return threads.filter((t) => {
    if (tab === "archived") {
      if (!t.isArchived) return false;
    } else if (t.isArchived) {
      return false;
    }
    if (tab === "unread" && (!t.unreadCount || t.unreadCount <= 0)) return false;
    if (tab === "favorites" && !t.isFavorite) return false;
    if (tab === "groups" && t.kind !== "group" && t.kind !== "community_announce") return false;
    if (tab === "business" && t.kind !== "business") return false;
    if (!q) return true;
    return (
      t.title.toLowerCase().includes(q) ||
      (t.lastMessagePreview ?? "").toLowerCase().includes(q)
    );
  });
}
