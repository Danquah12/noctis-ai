import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Phone, PhoneOff, Video } from "lucide-react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useFeedStore } from "@/lib/feed-store";
import { studyClearRing, studyRings } from "@/lib/study-group-api";
import {
  getSavedWorldPhoneProfile,
  subscribeWorldPhoneProfile,
  type WorldPhoneProfile,
} from "@/lib/world-call-client";

type Ring = { id: number; groupId: string; from: string; title: string; interest: string };
type WorldRing = {
  id: number;
  roomId: string;
  fromName: string;
  fromPhoneE164: string;
  mode: "voice" | "video";
  createdAt: string;
};

/** Incoming study + WhatsApp-style global internet call receiver, active on every tab. */
export function StudyRingBar() {
  const { user } = useCurrentUserState();
  const navigate = useNavigate();
  const [ring, setRing] = useState<Ring | null>(null);
  const [worldRing, setWorldRing] = useState<WorldRing | null>(null);
  const [profile, setProfile] = useState<WorldPhoneProfile | null>(() => getSavedWorldPhoneProfile());
  const heard = useRef(0);
  const heardWorld = useRef(0);

  useEffect(() => {
    setProfile(getSavedWorldPhoneProfile());
    return subscribeWorldPhoneProfile(() => {
      setProfile(getSavedWorldPhoneProfile());
    });
  }, []);

  useEffect(() => {
    if (!profile?.phoneE164) {
      setWorldRing(null);
      return;
    }
    let stop = false;
    async function lookWorld() {
      if (!profile?.phoneE164) return;
      try {
        const res = await fetch("/api/call-room", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "poll_rings",
            phoneE164: profile.phoneE164,
            deviceId: profile.deviceId,
          }),
        });
        if (!res.ok) return;
        const json = (await res.json()) as { ok?: boolean; rings?: WorldRing[] };
        const next = json.rings?.[0] ?? null;
        if (!stop) setWorldRing(next);
        if (next && next.id !== heardWorld.current) {
          heardWorld.current = next.id;
          try {
            navigator.vibrate?.([300, 180, 300]);
          } catch {
            /* ignore vibrate restriction */
          }
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification(`Incoming Noctis ${next.mode === "video" ? "Video" : "Voice"} Call`, {
              body: `${next.fromName}${next.fromPhoneE164 ? ` (${next.fromPhoneE164})` : ""} · Free Internet Call`,
            });
          }
        }
      } catch {
        /* next poll retries */
      }
    }
    void lookWorld();
    const onVisible = () => {
      if (document.visibilityState === "visible") void lookWorld();
    };
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(() => void lookWorld(), 2500);
    return () => {
      stop = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [profile?.phoneE164, profile?.deviceId]);

  useEffect(() => {
    if (!worldRing || typeof window === "undefined") return;
    const Ctx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    let ctx: AudioContext | null = null;
    try {
      ctx = new Ctx();
    } catch {
      return;
    }
    const pulse = () => {
      if (!ctx || ctx.state === "closed") return;
      if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
      const t = ctx.currentTime;
      for (const [offset, freq] of [[0, 523.25], [0.18, 659.25]] as const) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, t + offset);
        gain.gain.setValueAtTime(0.06, t + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t + offset);
        osc.stop(t + offset + 0.36);
      }
    };
    pulse();
    const timer = window.setInterval(pulse, 1800);
    return () => {
      window.clearInterval(timer);
      void ctx?.close().catch(() => undefined);
    };
  }, [worldRing?.id]);

  useEffect(() => {
    if (!user) return;
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      void Notification.requestPermission().catch(() => undefined);
    }
    let stop = false;
    async function look() {
      try {
        const rows = await studyRings();
        const next = rows[0] ?? null;
        if (!stop) setRing(next);
        if (next && next.id !== heard.current && typeof Notification !== "undefined" && Notification.permission === "granted") {
          heard.current = next.id;
          new Notification(`${next.from} is calling`, { body: next.title });
        }
      } catch {
        if (!stop) setRing(null);
      }
    }
    void look();
    const timer = window.setInterval(() => void look(), 4000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [user]);

  if (worldRing) {
    return (
      <div
        data-testid="world-incoming-ring-card"
        className="fixed top-4 right-4 left-4 z-[90] mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border border-emerald-400/35 bg-[#12151c]/95 px-4 py-3 text-white shadow-2xl backdrop-blur-xl"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
            Free Noctis {worldRing.mode === "video" ? "Video" : "Voice"} Call
          </p>
          <p className="truncate text-base font-semibold">{worldRing.fromName}</p>
          {worldRing.fromPhoneE164 ? (
            <p className="truncate text-xs text-zinc-400">{worldRing.fromPhoneE164}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label="Decline call"
            onClick={() => {
              const id = worldRing.id;
              setWorldRing(null);
              void fetch("/api/call-room", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ action: "respond_ring", ringId: id, status: "declined" }),
              }).catch(() => undefined);
            }}
            className="grid size-11 place-items-center rounded-full bg-[#ff3b30] text-white hover:brightness-105"
          >
            <PhoneOff className="size-5" />
          </button>
          <button
            type="button"
            aria-label="Accept call"
            onClick={() => {
              const next = worldRing;
              setWorldRing(null);
              void fetch("/api/call-room", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ action: "respond_ring", ringId: next.id, status: "accepted" }),
              }).catch(() => undefined);
              useFeedStore.getState().openModal({
                type: "phone",
                video: next.mode === "video",
                join: next.roomId,
              });
            }}
            className="grid size-11 place-items-center rounded-full bg-[#34c759] text-white hover:brightness-105"
          >
            {worldRing.mode === "video" ? <Video className="size-5" /> : <Phone className="size-5" />}
          </button>
        </div>
      </div>
    );
  }

  if (!ring) return null;

  return (
    <div className="sticky top-0 z-[60] flex flex-wrap items-center justify-between gap-2 border-b border-border bg-primary px-3 py-2 text-primary-fg">
      <p className="min-w-0 text-sm">
        <span className="font-semibold">{ring.from}</span> is calling you into {ring.title}.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          className="min-h-11 rounded-full bg-bg px-3 text-xs font-semibold text-fg"
          onClick={() => {
            const next = ring;
            setRing(null);
            void studyClearRing({ data: { id: next.id } });
            void navigate({
              to: "/study",
              search: { desk: next.interest, group: next.groupId, family: undefined, step: undefined },
            });
          }}
        >
          Join the call
        </button>
        <button
          type="button"
          className="min-h-11 rounded-full bg-primary-fg/15 px-3 text-xs font-semibold"
          onClick={() => {
            void studyClearRing({ data: { id: ring.id } });
            setRing(null);
          }}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
