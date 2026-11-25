export interface ConnectProfile {
  actorId: string;
  phoneE164: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl?: string;
  publicKeyJwk: string;
  privacy?: {
    lastSeen?: string;
    online?: string;
    photo?: string;
    readReceipts?: boolean;
    groupInvite?: string;
    silenceUnknown?: boolean;
  };
  lastSeenAt: string;
}

export interface ConnectThread {
  id: string;
  kind: string;
  title: string;
  description: string;
  communityId: string | null;
  e2eeEnabled: boolean;
  disappearingTtl: string;
  adminOnlyPost: boolean;
  requireApproval: boolean;
  inviteCode: string;
  sharedNote: string;
  createdBy: string;
  members: string[];
  admins: string[];
  pending: string[];
  isArchived: boolean;
  isPinned: boolean;
  isFavorite: boolean;
  unreadCount: number;
  lastMessagePreview: string;
  updatedAt: string;
  createdAt: string;
}

export interface ConnectMessage {
  id: number;
  threadId: string;
  clientMsgId: string | null;
  senderId: string;
  senderName: string;
  msgType: string;
  body: string;
  encrypted: boolean;
  ciphertext: string;
  mediaUrl: string;
  mediaName: string;
  mediaMime: string;
  viewOnce: boolean;
  viewedBy: string[];
  burned: boolean;
  replyToId: number | null;
  forwarded: boolean;
  editedAt: string | null;
  deletedForEveryone: boolean;
  deletedFor: string[];
  starredBy: string[];
  pinned: boolean;
  reactions: Record<string, string[]>;
  deliveredTo: string[];
  readBy: string[];
  deliverAt: string | null;
  expiresAt: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

export interface ConnectTask {
  id: string;
  threadId: string;
  title: string;
  assignee: string;
  status: string;
  dueAt: string;
  sourceMsgId: number | null;
  createdBy: string;
  createdAt: string;
}

export interface ConnectPoll {
  id: string;
  threadId: string;
  question: string;
  options: string[];
  votes: Record<string, string[]>;
  createdBy: string;
  createdAt: string;
}

export interface ConnectEvent {
  id: string;
  threadId: string;
  title: string;
  startsAt: string;
  location: string;
  description: string;
  rsvps: Record<string, string>;
  createdBy: string;
  createdAt: string;
}

export interface ConnectStatusItem {
  id: string;
  actorId: string;
  actorName: string;
  kind: string;
  content: string;
  mediaUrl: string;
  bgColor: string;
  privacy: string;
  viewers: string[];
  reactions: Record<string, string[]>;
  expiresAt: string;
  createdAt: string;
}

export interface ConnectCommunity {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  announceThreadId: string;
  groupIds: string[];
  inviteCode: string;
  createdAt: string;
}

export interface ConnectChannelPost {
  id: number;
  channelId: string;
  authorName: string;
  body: string;
  mediaUrl: string;
  reactions: Record<string, string[]>;
  views: number;
  createdAt: string;
}

export interface ConnectChannel {
  id: string;
  name: string;
  handle: string;
  description: string;
  verified: boolean;
  premium: boolean;
  ownerId: string;
  subscribers: string[];
  posts: ConnectChannelPost[];
  createdAt: string;
}

export interface ConnectBusiness {
  id: string;
  ownerId: string;
  name: string;
  category: string;
  description: string;
  verified: boolean;
  hoursText: string;
  greetingMsg: string;
  awayMsg: string;
  quickReplies: string[];
  labels: string[];
  teamAgents: string[];
}

export interface ConnectProduct {
  id: string;
  businessId: string;
  name: string;
  priceCents: number;
  currency: string;
  description: string;
  inStock: boolean;
}

export interface ConnectOrder {
  id: string;
  businessId: string;
  customerId: string;
  customerName: string;
  items: Record<string, unknown>[];
  totalCents: number;
  status: string;
  assignedAgent: string;
  customerLabel: string;
  appointmentAt: string;
  notes: string;
  createdAt: string;
}

export interface ConnectDevice {
  deviceId: string;
  actorId: string;
  label: string;
  platform: string;
  lastActiveAt: string;
  revoked: boolean;
  createdAt: string;
}

export interface ConnectCallRecord {
  id: number;
  roomId: string;
  fromPhoneE164: string;
  fromName: string;
  toPhoneE164: string;
  mode: string;
  status: string;
  direction: string;
  createdAt: string;
}

export async function connectGet<T>(query: string): Promise<T> {
  const res = await fetch(`/api/connect?${query}`);
  const data = (await res.json()) as T & { ok?: boolean; error?: string };
  if (!res.ok) throw new Error(data.error || "Connect request failed");
  return data;
}

export async function connectPost<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch("/api/connect", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as T & { ok?: boolean; error?: string };
  if (!res.ok) throw new Error(data.error || "Connect action failed");
  return data;
}
