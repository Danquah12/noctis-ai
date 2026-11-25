export interface WorldPhoneProfile {
  deviceId: string;
  phoneE164: string;
  displayName: string;
  countryIso: string;
}

const DEVICE_ID_KEY = "noctis_world_device_id";
const PROFILE_KEY = "noctis_world_phone_profile";
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
