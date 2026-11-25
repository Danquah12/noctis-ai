import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env.server.ts";
import { normalizeWorldE164, WORLD_DIAL_CODES } from "./world-dial-codes.ts";

const REQUIRED_TWILIO_KEYS = [
  "TWILIO_ACCOUNT_SID",
  "TWILIO_API_KEY",
  "TWILIO_API_SECRET",
  "TWILIO_TWIML_APP_SID",
  "TWILIO_CALLER_ID",
  "TWILIO_AUTH_TOKEN",
] as const;

function required() {
  return {
    account: env("TWILIO_ACCOUNT_SID"),
    key: env("TWILIO_API_KEY"),
    secret: env("TWILIO_API_SECRET"),
    app: env("TWILIO_TWIML_APP_SID"),
    caller: env("TWILIO_CALLER_ID"),
    auth: env("TWILIO_AUTH_TOKEN"),
  };
}

export function voipConfigured() {
  const row = required();
  return Boolean(row.account && row.key && row.secret && row.app && row.caller && row.auth);
}

export interface VoipStatus {
  ready: boolean;
  provider: "twilio" | "webrtc";
  callerIdMasked: string;
  missing: string[];
  globalWebRtcReady: true;
  countriesSupported: number;
}

export function voipStatus(): VoipStatus {
  const missing = REQUIRED_TWILIO_KEYS.filter((key) => !env(key));
  const caller = env("TWILIO_CALLER_ID") ?? "";
  const digits = caller.replace(/\D/g, "");
  const callerIdMasked = digits.length >= 4 ? `••••${digits.slice(-4)}` : "";
  const ready = missing.length === 0;
  return {
    ready,
    provider: ready ? "twilio" : "webrtc",
    callerIdMasked,
    missing: [...missing],
    globalWebRtcReady: true,
    countriesSupported: WORLD_DIAL_CODES.length,
  };
}

function b64url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function mintVoiceToken(userId: string) {
  const row = required();
  if (!row.account || !row.key || !row.secret || !row.app) return "";
  const identity = userId.replace(/[^A-Za-z0-9_]/g, "_").slice(0, 80) || "member";
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT", cty: "twilio-fpa;v=1" }));
  const payload = b64url(
    JSON.stringify({
      jti: `${row.key}-${now}`,
      iss: row.key,
      sub: row.account,
      exp: now + 3600,
      grants: {
        identity,
        voice: {
          outgoing: { application_sid: row.app },
          incoming: { allow: true },
        },
      },
    }),
  );
  const body = `${header}.${payload}`;
  const sig = createHmac("sha256", row.secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function toE164(raw: string, defaultDial?: string) {
  const norm = normalizeWorldE164(raw, defaultDial);
  return norm.valid ? norm.e164 : "";
}

export function voiceTwiml(to: string, defaultDial?: string) {
  const caller = env("TWILIO_CALLER_ID") ?? "";
  const dest = toE164(to, defaultDial);
  const from = toE164(caller);
  if (!dest || !from) {
    return `<?xml version="1.0" encoding="UTF-8"?><Response><Say>That number cannot be called.</Say></Response>`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Dial callerId="${escapeXml(from)}" answerOnBridge="true" timeout="35"><Number>${escapeXml(dest)}</Number></Dial></Response>`;
}

export function twilioSigned(url: string, params: Record<string, string>, signature: string) {
  const token = env("TWILIO_AUTH_TOKEN");
  if (!token || !signature) return false;
  const data = url + Object.keys(params).sort().map((key) => key + (params[key] ?? "")).join("");
  const expected = createHmac("sha1", token).update(data).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
