export interface VibeConnectFeatureFlags {
  messaging: boolean;
  e2ee: boolean;
  voiceVideoNotes: boolean;
  communities: boolean;
  statusStories: boolean;
  channels: boolean;
  businessWorkspace: boolean;
  noctisAiOptIn: boolean;
  adminTelemetry: boolean;
  enhancedCallControls: boolean;
  beyondWorkspace: boolean;
}

export const DEFAULT_VIBE_CONNECT_FLAGS: VibeConnectFeatureFlags = {
  messaging: true,
  e2ee: true,
  voiceVideoNotes: true,
  communities: true,
  statusStories: true,
  channels: true,
  businessWorkspace: true,
  noctisAiOptIn: true,
  adminTelemetry: true,
  enhancedCallControls: true,
  beyondWorkspace: true,
};

export interface VibeConnectFlagMeta {
  key: keyof VibeConnectFeatureFlags;
  label: string;
  description: string;
}

export const VIBE_CONNECT_FLAG_META: VibeConnectFlagMeta[] = [
  { key: "messaging", label: "Core Messaging", description: "1:1, Group, Saved Messages, replies, reactions, disappearing & scheduled messages." },
  { key: "e2ee", label: "End-to-End Encryption", description: "Client-side ECDH P-256 + AES-GCM 256 message encryption & safety numbers." },
  { key: "voiceVideoNotes", label: "Voice & Video Notes", description: "Audio and short video recording notes plus multimedia file sharing." },
  { key: "communities", label: "Communities & Polls", description: "Multi-group communities, announcement broadcasts, polls, events & QR invites." },
  { key: "statusStories", label: "24h Status & Stories", description: "Auto-expiring text, photo, video & voice status updates with viewer tracking." },
  { key: "channels", label: "Channels & Broadcasts", description: "Public/verified one-to-many channels, subscriptions, reactions & analytics." },
  { key: "businessWorkspace", label: "Vibe Business", description: "Business profile, product catalog, carts, orders, CRM labels & quick replies." },
  { key: "noctisAiOptIn", label: "Opt-In Noctis AI", description: "Explicit user-triggered summaries, translations, action items & scam checks." },
  { key: "adminTelemetry", label: "Admin Telemetry", description: "Aggregate platform health, call stats & abuse queue without private plaintext access." },
  { key: "enhancedCallControls", label: "Enhanced Call Controls", description: "Camera flip, Picture-in-Picture, low-bandwidth bitrate mode & silence unknown callers." },
  { key: "beyondWorkspace", label: "Beyond WhatsApp", description: "Shared Live Pad, Action Tasks, Burn-After-Reading secrets & Live Call Huddles." },
];

const LOCAL_FLAGS_KEY = "vibe_connect_feature_flags_v1";

export function mergeVibeConnectFlags(
  base: VibeConnectFeatureFlags,
  overrides?: Partial<Record<string, boolean>> | null,
): VibeConnectFeatureFlags {
  const next: VibeConnectFeatureFlags = { ...base };
  if (!overrides || typeof overrides !== "object") return next;
  (Object.keys(base) as Array<keyof VibeConnectFeatureFlags>).forEach((key) => {
    const val = overrides[key];
    if (typeof val === "boolean") {
      next[key] = val;
    }
  });
  return next;
}

export function loadLocalVibeConnectFlags(): VibeConnectFeatureFlags {
  if (typeof window === "undefined") return { ...DEFAULT_VIBE_CONNECT_FLAGS };
  try {
    const raw = window.localStorage.getItem(LOCAL_FLAGS_KEY);
    if (!raw) return { ...DEFAULT_VIBE_CONNECT_FLAGS };
    const parsed = JSON.parse(raw) as Partial<Record<string, boolean>>;
    return mergeVibeConnectFlags(DEFAULT_VIBE_CONNECT_FLAGS, parsed);
  } catch {
    return { ...DEFAULT_VIBE_CONNECT_FLAGS };
  }
}

export function saveLocalVibeConnectFlags(flags: VibeConnectFeatureFlags): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_FLAGS_KEY, JSON.stringify(flags));
  } catch {
    /* ignore quota errors */
  }
}
