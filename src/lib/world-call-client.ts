export interface WorldPhoneProfile {
  deviceId: string;
  phoneE164: string;
  displayName: string;
  countryIso: string;
}

export interface WorldContact {
  phoneE164: string;
  name: string;
  countryIso: string;
  createdAt: number;
}

export interface RecentWorldCall {
  phoneE164: string;
  name: string;
  mode: "voice" | "video";
  timestamp: number;
}

export interface WorldCallGroup {
  id: string;
  name: string;
  members: { phoneE164: string; name: string }[];
  createdAt: number;
}

const DEVICE_ID_KEY = "noctis_world_device_id";
const PROFILE_KEY = "noctis_world_phone_profile";
const CONTACTS_KEY = "noctis_world_contacts";
const RECENTS_KEY = "noctis_world_recent_calls";
const GROUPS_KEY = "noctis_world_call_groups";
const CHANGE_EVENT = "noctis-world-phone-changed";

export function getOrCreateWorldDeviceId(): string {
  if (typeof window === "undefined") return "server-device";
  try {
    const existing = window.localStorage.getItem(DEVICE_ID_KEY)?.trim();
    if (existing) return existing;
    const created =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? `dev-${crypto.randomUUID().slice(0, 12)}`
        : `dev-${Math.random().toString(36).slice(2, 14)}`;
    window.localStorage.setItem(DEVICE_ID_KEY, created);
    return created;
  } catch {
    return "device-fallback";
  }
}

/**
 * Distinct per-tab peer ID so two devices (or two browser tabs) signed into the same
 * Noctis account never collide on `peer_id` inside WebRTC rooms.
 */
export function createTabPeerId(): string {
  const rand =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 6)
      : Math.random().toString(36).slice(2, 8);
  return `${getOrCreateWorldDeviceId()}-${rand}`.slice(0, 64);
}

export function getSavedWorldPhoneProfile(): WorldPhoneProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WorldPhoneProfile>;
    if (!parsed || typeof parsed.phoneE164 !== "string" || !parsed.phoneE164.startsWith("+")) return null;
    return {
      deviceId: typeof parsed.deviceId === "string" && parsed.deviceId ? parsed.deviceId : getOrCreateWorldDeviceId(),
      phoneE164: parsed.phoneE164,
      displayName: typeof parsed.displayName === "string" ? parsed.displayName : "Noctis User",
      countryIso: typeof parsed.countryIso === "string" ? parsed.countryIso : "",
    };
  } catch {
    return null;
  }
}

export function saveWorldPhoneProfile(profile: WorldPhoneProfile): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DEVICE_ID_KEY, profile.deviceId);
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {
    /* ignore storage quota failures */
  }
}

export function clearWorldPhoneProfile(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PROFILE_KEY);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {
    /* ignore */
  }
}

export function subscribeWorldPhoneProfile(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => onChange();
  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function getWorldContacts(): WorldContact[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CONTACTS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as WorldContact[]).filter((c) => c && typeof c.phoneE164 === "string") : [];
  } catch {
    return [];
  }
}

export function saveWorldContact(contact: Omit<WorldContact, "createdAt">): WorldContact[] {
  const existing = getWorldContacts().filter((c) => c.phoneE164 !== contact.phoneE164);
  const next = [{ ...contact, createdAt: Date.now() }, ...existing].slice(0, 30);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(CONTACTS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }
  return next;
}

export function removeWorldContact(phoneE164: string): WorldContact[] {
  const next = getWorldContacts().filter((c) => c.phoneE164 !== phoneE164);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(CONTACTS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }
  return next;
}

export function getRecentWorldCalls(): RecentWorldCall[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as RecentWorldCall[]) : [];
  } catch {
    return [];
  }
}

export function recordWorldCall(call: Omit<RecentWorldCall, "timestamp">): RecentWorldCall[] {
  const next = [
    { ...call, timestamp: Date.now() },
    ...getRecentWorldCalls().filter((r) => r.phoneE164 !== call.phoneE164),
  ].slice(0, 20);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }
  return next;
}

export function getWorldCallGroups(): WorldCallGroup[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(GROUPS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr)
      ? (arr as WorldCallGroup[]).filter((g) => g && typeof g.id === "string" && Array.isArray(g.members))
      : [];
  } catch {
    return [];
  }
}

export function saveWorldCallGroup(group: {
  id?: string;
  name: string;
  members: { phoneE164: string; name: string }[];
}): WorldCallGroup[] {
  const id =
    group.id ||
    (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `grp-${Date.now()}`);
  const nextGroup: WorldCallGroup = {
    id,
    name: group.name.trim().slice(0, 40) || "Call Group",
    members: group.members.slice(0, 30),
    createdAt: Date.now(),
  };
  const next = [nextGroup, ...getWorldCallGroups().filter((g) => g.id !== id)].slice(0, 20);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(GROUPS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }
  return next;
}

export function deleteWorldCallGroup(id: string): WorldCallGroup[] {
  const next = getWorldCallGroups().filter((g) => g.id !== id);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(GROUPS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }
  return next;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeDeviceToWebPush(
  phoneE164: string,
  deviceId: string,
  displayName?: string,
): Promise<{ ok: boolean; reason?: string }> {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    return { ok: false, reason: "Browser does not support background Web Push" };
  }
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "denied") {
      return { ok: false, reason: "Notifications blocked — allow notifications for background ringing" };
    }
    const reg = await navigator.serviceWorker.register("/sw-push.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    const vapidRes = await fetch("/api/call-room?vapid=1");
    const vapidJson = (await vapidRes.json()) as { ok?: boolean; publicKey?: string };
    if (!vapidRes.ok || !vapidJson.publicKey) {
      return { ok: false, reason: "Push key unavailable" };
    }
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidJson.publicKey),
      });
    }
    const saveRes = await fetch("/api/call-room", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "save_push",
        phoneE164,
        deviceId,
        displayName,
        subscription: sub.toJSON(),
      }),
    });
    if (!saveRes.ok) return { ok: false, reason: "Could not save push endpoint" };
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "Push registration skipped" };
  }
}

const SILENCE_UNKNOWN_KEY = "noctis_silence_unknown_callers";

export function getSilenceUnknownCallers(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SILENCE_UNKNOWN_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSilenceUnknownCallers(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SILENCE_UNKNOWN_KEY, enabled ? "1" : "0");
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {
    /* ignore storage errors */
  }
}
