import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import QRCode from "qrcode";
import {
  Archive,
  Ban,
  BookmarkCheck,
  CalendarPlus,
  Check,
  CheckCheck,
  CheckSquare,
  Clock,
  Copy,
  Edit3,
  Eye,
  EyeOff,
  FileText,
  Flame,
  Forward,
  Image as ImageIcon,
  Languages,
  ListTodo,
  Lock,
  MapPin,
  Mic,
  Paperclip,
  Phone,
  Pin,
  Plus,
  QrCode,
  Reply,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Square,
  Star,
  Trash2,
  UserCheck,
  Video,
  X,
} from "lucide-react";
import {
  computeSafetyNumber,
  decryptE2EEMessage,
  encryptE2EEMessage,
} from "@/lib/vibe-connect-crypto";
import type { VibeConnectFeatureFlags } from "@/lib/vibe-connect-flags";
import {
  dedupeMessagesByClientId,
  enqueueOfflineMessage,
  formatSafetyNumberBlocks,
  readOfflineQueue,
  removeOfflineMessage,
} from "@/lib/vibe-connect-helpers";
import { createTabPeerId } from "@/lib/world-call-client";
import {
  connectGet,
  connectPost,
  type ConnectEvent,
  type ConnectMessage,
  type ConnectPoll,
  type ConnectProfile,
  type ConnectTask,
  type ConnectThread,
} from "./types";

const AI_LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "Twi (Akan)",
  "Yoruba",
  "Swahili",
  "Arabic",
  "Hindi",
  "Mandarin Chinese",
  "Portuguese",
  "German",
  "Japanese",
];

type SpeechRec = {
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export function ChatConversationPane({
  actorId,
  actorName,
  actorPhone,
  myPublicKeyJwk,
  myPrivateKeyJwk,
  thread,
  allThreads,
  directory,
  flags,
  onThreadUpdated,
  onToast,
}: {
  actorId: string;
  actorName: string;
  actorPhone: string;
  myPublicKeyJwk: string;
  myPrivateKeyJwk: string;
  thread: ConnectThread | null;
  allThreads: ConnectThread[];
  directory: ConnectProfile[];
  flags: VibeConnectFeatureFlags;
  onThreadUpdated: () => void;
  onToast: (msg: string) => void;
}) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ConnectMessage[]>([]);
  const [decryptedMap, setDecryptedMap] = useState<Record<number, string>>({});
  const [polls, setPolls] = useState<ConnectPoll[]>([]);
  const [events, setEvents] = useState<ConnectEvent[]>([]);
  const [presence, setPresence] = useState<{ actorId: string; actorName: string; state: string }[]>([]);
  const [tasks, setTasks] = useState<ConnectTask[]>([]);

  const [draft, setDraft] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [replyTo, setReplyTo] = useState<ConnectMessage | null>(null);
  const [editingMsg, setEditingMsg] = useState<ConnectMessage | null>(null);
  const [forwardingMsg, setForwardingMsg] = useState<ConnectMessage | null>(null);
  const [viewOnceSend, setViewOnceSend] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");
  const [attachOpen, setAttachOpen] = useState(false);

  // Drawers & Modals inside Chat
  const [padOpen, setPadOpen] = useState(false);
  const [sharedNoteDraft, setSharedNoteDraft] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [safetyModalOpen, setSafetyModalOpen] = useState(false);
  const [safetyDigits, setSafetyDigits] = useState<string[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [aiTargetLang, setAiTargetLang] = useState("English");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiOutput, setAiOutput] = useState("");
  const [pinLocked, setPinLocked] = useState(false);
  const [pinInput, setPinInput] = useState("");

  // Poll / Event builder modals
  const [pollOpen, setPollOpen] = useState(false);
  const [pollQ, setPollQ] = useState("");
  const [pollOpts, setPollOpts] = useState("Yes\nNo\nNeed more details");
  const [eventOpen, setEventOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventWhen, setEventWhen] = useState("");
  const [eventLoc, setEventLoc] = useState("");

  // Media recording (Voice Note + Live Transcript, Video Note)
  const [recordingMode, setRecordingMode] = useState<null | "voice" | "video">(null);
  const [liveVoiceTranscript, setLiveVoiceTranscript] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const speechRef = useRef<SpeechRec | null>(null);
  const mediaFileRef = useRef<HTMLInputElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const peerMemberId = thread?.members.find((m) => m !== actorId) ?? actorId;
  const peerProfile = directory.find((p) => p.actorId === peerMemberId);
  const peerPublicKeyJwk = peerMemberId === actorId ? myPublicKeyJwk : peerProfile?.publicKeyJwk || myPublicKeyJwk;

  // Persist & restore draft per thread + check optional Chat Lock PIN
  useEffect(() => {
    if (!thread) return;
    setSharedNoteDraft(thread.sharedNote ?? "");
    try {
      const savedDraft = window.localStorage.getItem(`vc_draft_${thread.id}`) ?? "";
      setDraft(savedDraft);
      const lockPin = window.localStorage.getItem(`vc_chat_pin_${thread.id}`) ?? "";
      setPinLocked(Boolean(lockPin));
      setPinInput("");
    } catch {
      /* ignore */
    }
  }, [thread?.id]);

  useEffect(() => {
    if (!thread) return;
    try {
      window.localStorage.setItem(`vc_draft_${thread.id}`, draft);
    } catch {
      /* ignore */
    }
  }, [draft, thread?.id]);

  // Compute Safety Number when modal opens
  useEffect(() => {
    if (!safetyModalOpen || !myPublicKeyJwk || !peerPublicKeyJwk) return;
    void computeSafetyNumber(myPublicKeyJwk, peerPublicKeyJwk)
      .then((sn) => setSafetyDigits(formatSafetyNumberBlocks(sn)))
      .catch(() => setSafetyDigits([]));
  }, [safetyModalOpen, myPublicKeyJwk, peerPublicKeyJwk]);

  // Generate QR code for group/thread invite
  useEffect(() => {
    if (!settingsOpen || !thread?.inviteCode || typeof window === "undefined") {
      setQrDataUrl("");
      return;
    }
    const url = `${window.location.origin}/connect?invite=${encodeURIComponent(thread.inviteCode)}`;
    void QRCode.toDataURL(url, { width: 180, margin: 1 })
      .then((d) => setQrDataUrl(d))
      .catch(() => setQrDataUrl(""));
  }, [settingsOpen, thread?.inviteCode]);

  // Load messages + tasks + mark read
  const refreshThreadData = async () => {
    if (!thread) return;
    try {
      const [msgRes, taskRes] = await Promise.all([
        connectGet<{
          messages: ConnectMessage[];
          polls: ConnectPoll[];
          events: ConnectEvent[];
          presence: { actorId: string; actorName: string; state: string }[];
        }>(
          `action=messages&threadId=${encodeURIComponent(thread.id)}&actorId=${encodeURIComponent(actorId)}&search=${encodeURIComponent(searchQuery)}`,
        ),
        connectGet<{ tasks: ConnectTask[] }>(`action=tasks&threadId=${encodeURIComponent(thread.id)}`),
      ]);
      setMessages(dedupeMessagesByClientId(msgRes.messages ?? []));
      setPolls(msgRes.polls ?? []);
      setEvents(msgRes.events ?? []);
      setPresence(msgRes.presence ?? []);
      setTasks(taskRes.tasks ?? []);
      if (thread.unreadCount > 0) {
        void connectPost({ action: "mark_read", threadId: thread.id, actorId }).catch(() => undefined);
      }
    } catch {
      /* retry next cycle */
    }
  };

  useEffect(() => {
    if (!thread) return;
    void refreshThreadData();
    const timer = window.setInterval(() => void refreshThreadData(), 3000);
    return () => window.clearInterval(timer);
  }, [thread?.id, searchQuery]);

  // Flush offline queue automatically when online
  useEffect(() => {
    const flushQueue = async () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      const queued = readOfflineQueue();
      if (!queued.length) return;
      for (const item of queued) {
        try {
          await connectPost({ action: "send_message", ...item });
          removeOfflineMessage(item.clientMsgId);
        } catch {
          break;
        }
      }
      void refreshThreadData();
    };
    window.addEventListener("online", () => void flushQueue());
    void flushQueue();
    return () => window.removeEventListener("online", () => void flushQueue());
  }, [thread?.id]);

  // Client-side E2EE decryption pass
  useEffect(() => {
    if (!messages.length || !myPrivateKeyJwk) return;
    let stop = false;
    void (async () => {
      const next: Record<number, string> = {};
      for (const msg of messages) {
        if (!msg.encrypted || !msg.ciphertext || msg.deletedForEveryone || msg.burned) continue;
        try {
          const senderPub = directory.find((p) => p.actorId === msg.senderId)?.publicKeyJwk || peerPublicKeyJwk;
          const plain = await decryptE2EEMessage(msg.ciphertext, myPrivateKeyJwk, senderPub);
          next[msg.id] = plain;
        } catch {
          next[msg.id] = "[Encrypted on another keypair]";
        }
      }
      if (!stop) setDecryptedMap(next);
    })();
    return () => {
      stop = true;
    };
  }, [messages, myPrivateKeyJwk, peerPublicKeyJwk]);

  function readableText(msg: ConnectMessage): string {
    if (msg.deletedForEveryone || msg.burned) return msg.body;
    if (msg.encrypted) return decryptedMap[msg.id] ?? "Decrypting…";
    return msg.body;
  }

  async function sendPayload(opts: {
    msgType: string;
    body: string;
    mediaUrl?: string;
    mediaName?: string;
    mediaMime?: string;
    meta?: Record<string, unknown>;
  }) {
    if (!thread) return;
    if (editingMsg && opts.msgType === "text") {
      const useE2ee = Boolean(thread.e2eeEnabled && flags.e2ee && myPrivateKeyJwk && peerPublicKeyJwk && thread.kind !== "community_announce");
      const ciphertext = useE2ee
        ? await encryptE2EEMessage(opts.body, myPrivateKeyJwk, peerPublicKeyJwk, myPublicKeyJwk)
        : "";
      await connectPost({
        action: "edit_message",
        messageId: editingMsg.id,
        actorId,
        body: opts.body,
        encrypted: useE2ee,
        ciphertext,
      });
      setEditingMsg(null);
      setDraft("");
      await refreshThreadData();
      return;
    }

    const clientMsgId = `cm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const useE2ee = Boolean(
      thread.e2eeEnabled &&
        flags.e2ee &&
        myPrivateKeyJwk &&
        peerPublicKeyJwk &&
        thread.kind !== "community_announce" &&
        opts.msgType === "text" &&
        !opts.mediaUrl,
    );
    const ciphertext = useE2ee
      ? await encryptE2EEMessage(opts.body, myPrivateKeyJwk, peerPublicKeyJwk, myPublicKeyJwk)
      : "";

    const payload = {
      threadId: thread.id,
      clientMsgId,
      senderId: actorId,
      senderName: actorName,
      msgType: opts.msgType,
      body: opts.body,
      encrypted: useE2ee,
      ciphertext,
      mediaUrl: opts.mediaUrl ?? "",
      mediaName: opts.mediaName ?? "",
      mediaMime: opts.mediaMime ?? "",
      viewOnce: viewOnceSend,
      replyToId: replyTo?.id ?? null,
      deliverAt: scheduleAt ? new Date(scheduleAt).toISOString() : null,
      meta: opts.meta ?? null,
    };

    setDraft("");
    setReplyTo(null);
    setViewOnceSend(false);
    setScheduleAt("");
    setScheduleOpen(false);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      enqueueOfflineMessage({ ...payload, queuedAt: Date.now() });
      onToast("Offline: queued to auto-send when back online");
      return;
    }

    try {
      await connectPost({ action: "send_message", ...payload });
      await refreshThreadData();
      onThreadUpdated();
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not send message");
    }
  }

  async function startCallFromThread(mode: "voice" | "video") {
    if (!thread) return;
    try {
      const hostPeerId = createTabPeerId();
      const targetPhone = peerProfile?.phoneE164 || "";
      const created = await fetch("/api/call-room", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "create",
          title: thread.title,
          mode,
          targetE164: targetPhone,
          hostPeerId,
          hostName: actorName,
        }),
      }).then((r) => r.json() as Promise<{ ok?: boolean; roomId?: string }>);
      if (!created.roomId) throw new Error("Could not create call room");

      const groupPhones = thread.members
        .filter((m) => m !== actorId)
        .map((m) => directory.find((p) => p.actorId === m)?.phoneE164 ?? "")
        .filter(Boolean);
      if (groupPhones.length) {
        await fetch("/api/call-room", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "ring_group",
            roomId: created.roomId,
            groupName: thread.title,
            fromPhoneE164: actorPhone,
            fromName: actorName,
            memberPhones: groupPhones,
            mode,
          }),
        }).catch(() => undefined);
      }

      // Drop-in Live Huddle Card inside the thread (Beyond WhatsApp)
      await connectPost({
        action: "send_message",
        threadId: thread.id,
        senderId: actorId,
        senderName: actorName,
        msgType: "call_invite",
        body: `Started a live ${mode} huddle: ${thread.title}`,
        encrypted: false,
        meta: { roomId: created.roomId, mode },
      }).catch(() => undefined);

      void navigate({ to: "/noctis", search: { join: created.roomId, mode } as Record<string, string> });
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not start call");
    }
  }

  async function startRecording(kind: "voice" | "video") {
    if (recordingMode) {
      recorderRef.current?.stop();
      speechRef.current?.stop();
      setRecordingMode(null);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        kind === "video" ? { audio: true, video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } } : { audio: true },
      );
      const chunks: Blob[] = [];
      const rec = new MediaRecorder(stream);
      let transcriptText = "";
      if (kind === "voice" && typeof window !== "undefined") {
        const w = window as Window & {
          SpeechRecognition?: new () => SpeechRec;
          webkitSpeechRecognition?: new () => SpeechRec;
        };
        const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
        if (Ctor) {
          const sp = new Ctor();
          sp.continuous = true;
          sp.interimResults = true;
          sp.onresult = (ev) => {
            const parts: string[] = [];
            for (let i = 0; i < ev.results.length; i += 1) {
              const t = ev.results[i]?.[0]?.transcript;
              if (t) parts.push(t);
            }
            transcriptText = parts.join(" ").trim();
            setLiveVoiceTranscript(transcriptText);
          };
          try {
            sp.start();
            speechRef.current = sp;
          } catch {
            /* ignore speech permission fallback */
          }
        }
      }
      rec.ondataavailable = (ev) => {
        if (ev.data.size) chunks.push(ev.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: kind === "video" ? "video/webm" : "audio/webm" });
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = typeof reader.result === "string" ? reader.result : "";
          if (dataUrl.length > 240_000) {
            onToast("Clip too large for inline DB preview — keep notes concise (~15s).");
            return;
          }
          void sendPayload({
            msgType: kind,
            body: kind === "voice" ? transcriptText || "Voice message" : "Video note",
            mediaUrl: dataUrl,
            mediaName: kind === "voice" ? "voice-note.webm" : "video-note.webm",
            mediaMime: kind === "video" ? "video/webm" : "audio/webm",
            meta: transcriptText ? { transcript: transcriptText } : undefined,
          });
          setLiveVoiceTranscript("");
        };
        reader.readAsDataURL(blob);
      };
      rec.start();
      recorderRef.current = rec;
      setRecordingMode(kind);
      void connectPost({
        action: "set_presence",
        threadId: thread?.id ?? "",
        actorId,
        actorName,
        state: "recording",
      }).catch(() => undefined);
    } catch {
      onToast(`Allow ${kind === "video" ? "camera & mic" : "microphone"} access to record`);
    }
  }

  async function runOptInNoctisAi(task: "summarize" | "actions" | "translate" | "reply" | "scam", specificText?: string) {
    if (!flags.noctisAiOptIn) {
      onToast("Opt-in Noctis AI is turned off in Feature Flags");
      return;
    }
    setAiDrawerOpen(true);
    setAiBusy(true);
    try {
      const contextLines = specificText
        ? specificText
        : messages
            .slice(-15)
            .map((m) => `${m.senderName}: ${readableText(m)}`)
            .join("\n");
      const prompts: Record<typeof task, string> = {
        summarize: `Summarize this conversation cleanly in bullet points with key decisions:\n\n${contextLines}`,
        actions: `Extract concrete action items and owners from these messages:\n\n${contextLines}`,
        translate: `Translate the following into natural ${aiTargetLang}. Preserve tone and names:\n\n${contextLines}`,
        reply: `Draft 3 concise, helpful reply options for the latest message:\n\n${contextLines}`,
        scam: `Evaluate whether the following message contains phishing, impersonation, urgency manipulation, or scam indicators. Respond clearly with Risk Level (Low/Medium/High) and why:\n\n${contextLines}`,
      };
      const res = await fetch("/api/noctis", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompts[task] }],
        }),
      });
      const text = await res.text();
      setAiOutput(text.slice(0, 2400) || "Noctis AI could not generate a response right now.");
    } catch {
      setAiOutput("Could not reach Noctis AI right now.");
    } finally {
      setAiBusy(false);
    }
  }

  if (!thread) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-[#0a0f12] p-8 text-center text-zinc-400">
        <div className="mb-3 grid size-14 place-items-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-400">
          <Lock className="size-6" />
        </div>
        <h3 className="text-base font-semibold text-zinc-100">Vibe Connect · $0 End-to-End Workspace</h3>
        <p className="mt-1 max-w-md text-xs text-zinc-400">
          Select a conversation or start a new encrypted chat, group, call huddle, or Saved Messages note on the left.
        </p>
      </div>
    );
  }

  const savedPin = typeof window !== "undefined" ? window.localStorage.getItem(`vc_chat_pin_${thread.id}`) ?? "" : "";
  if (pinLocked && savedPin) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-[#0a0f12] p-6 text-zinc-100">
        <div className="w-full max-w-xs rounded-2xl border border-white/10 bg-[#11181c] p-5 text-center">
          <Lock className="mx-auto size-8 text-emerald-400" />
          <h3 className="mt-3 text-sm font-semibold">Locked Conversation</h3>
          <p className="mt-1 text-xs text-zinc-400">Enter your Chat PIN to unlock {thread.title}</p>
          <input
            type="password"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            placeholder="Enter Chat PIN"
            className="mt-3 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-center text-sm text-white outline-none"
          />
          <button
            type="button"
            onClick={() => {
              if (pinInput === savedPin) setPinLocked(false);
              else onToast("Incorrect Chat PIN");
            }}
            className="mt-3 w-full rounded-xl bg-emerald-500 py-2 text-xs font-semibold text-black hover:bg-emerald-400"
          >
            Unlock Chat
          </button>
        </div>
      </div>
    );
  }

  const pinnedMessages = messages.filter((m) => m.pinned && !m.deletedForEveryone);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-[#0a0f12] text-zinc-100">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-[#10181c] px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-300">
            {thread.title.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-semibold text-white">{thread.title}</p>
              {thread.e2eeEnabled && flags.e2ee ? (
                <button
                  type="button"
                  onClick={() => setSafetyModalOpen(true)}
                  title="Verified E2EE — click to inspect Safety Number"
                  className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300"
                >
                  <Lock className="size-2.5" />
                  E2EE
                </button>
              ) : null}
              {thread.disappearingTtl !== "off" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-300">
                  <Flame className="size-2.5" />
                  {thread.disappearingTtl}
                </span>
              ) : null}
            </div>
            <p className="truncate text-[11px] text-zinc-400">
              {presence.length
                ? `${presence.map((p) => `${p.actorName} is ${p.state === "recording" ? "recording audio" : "typing"}…`).join(", ")}`
                : `${thread.members.length} participant${thread.members.length === 1 ? "" : "s"} · ${thread.kind.replace("_", " ")}`}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => void startCallFromThread("voice")}
            title="Start free voice call"
            className="grid size-8 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-200 hover:bg-emerald-500/20 hover:text-emerald-300"
          >
            <Phone className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => void startCallFromThread("video")}
            title="Start free video call"
            className="grid size-8 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-200 hover:bg-emerald-500/20 hover:text-emerald-300"
          >
            <Video className="size-3.5" />
          </button>
          {flags.beyondWorkspace ? (
            <button
              type="button"
              data-testid="vc-pad-tasks-toggle"
              onClick={() => setPadOpen((v) => !v)}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                padOpen ? "border-emerald-400 bg-emerald-500/20 text-emerald-200" : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
              }`}
            >
              <ListTodo className="size-3.5" />
              Pad & Tasks{tasks.length ? ` (${tasks.filter((t) => t.status !== "done").length})` : ""}
            </button>
          ) : null}
          {flags.noctisAiOptIn ? (
            <button
              type="button"
              onClick={() => setAiDrawerOpen((v) => !v)}
              title="Opt-In Noctis AI Copilot"
              className={`grid size-8 place-items-center rounded-full border ${
                aiDrawerOpen ? "border-[#e4b86a] bg-[#e4b86a]/20 text-[#e4b86a]" : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
              }`}
            >
              <Sparkles className="size-3.5" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            title="Search conversation"
            className="grid size-8 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
          >
            <Search className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen((v) => !v)}
            title="Privacy, Disappearing & Group Settings"
            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-200 hover:bg-white/10"
          >
            <QrCode className="size-3.5" />
            Info
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {searchOpen ? (
        <div className="flex items-center gap-2 border-b border-white/10 bg-black/40 px-4 py-2">
          <Search className="size-3.5 text-zinc-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages, files, senders..."
            className="flex-1 bg-transparent text-xs text-white outline-none placeholder:text-zinc-500"
          />
          {searchQuery ? (
            <button type="button" onClick={() => setSearchQuery("")} className="text-xs text-zinc-400 hover:text-white">
              Clear
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Pinned Banner */}
      {pinnedMessages.length > 0 ? (
        <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-emerald-950/30 px-4 py-1.5 text-xs">
          <span className="inline-flex min-w-0 items-center gap-1.5 truncate text-emerald-200">
            <Pin className="size-3 shrink-0" />
            Pinned: {readableText(pinnedMessages[pinnedMessages.length - 1]!)}
          </span>
        </div>
      ) : null}

      {/* Beyond WhatsApp: Live Collaborative Pad & Thread Action Tasks Drawer */}
      {padOpen && flags.beyondWorkspace ? (
        <div data-testid="vc-pad-tasks-drawer" className="grid gap-3 border-b border-white/10 bg-[#0f171c] p-3 text-xs sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-emerald-300">Shared Live Pad</span>
              <button
                type="button"
                onClick={() =>
                  void connectPost({
                    action: "update_shared_note",
                    threadId: thread.id,
                    actorId,
                    sharedNote: sharedNoteDraft,
                  }).then(() => {
                    onToast("Shared pad saved");
                    onThreadUpdated();
                  })
                }
                className="rounded-lg bg-emerald-500 px-2.5 py-1 text-[11px] font-semibold text-black hover:bg-emerald-400"
              >
                Save Pad
              </button>
            </div>
            <textarea
              value={sharedNoteDraft}
              onChange={(e) => setSharedNoteDraft(e.target.value)}
              rows={3}
              placeholder="Shared agenda, links, notes everyone in this chat can co-edit..."
              className="w-full rounded-xl border border-white/10 bg-black/50 p-2 text-xs text-zinc-100 outline-none"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="font-semibold text-emerald-300">Action Tasks ({tasks.length})</span>
            <div className="flex gap-1.5">
              <input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Add task or convert any chat message..."
                className="flex-1 rounded-xl border border-white/10 bg-black/50 px-2.5 py-1.5 text-xs text-white outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newTaskTitle.trim()) return;
                  void connectPost<{ tasks: ConnectTask[] }>({
                    action: "create_task",
                    threadId: thread.id,
                    title: newTaskTitle.trim(),
                    createdBy: actorId,
                  }).then((r) => {
                    setTasks(r.tasks);
                    setNewTaskTitle("");
                  });
                }}
                className="rounded-xl bg-white/10 px-2.5 py-1.5 font-semibold text-white hover:bg-white/20"
              >
                Add
              </button>
            </div>
            <div className="max-h-24 space-y-1 overflow-y-auto">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between gap-2 rounded-lg bg-black/40 px-2 py-1">
                  <button
                    type="button"
                    onClick={() =>
                      void connectPost<{ tasks: ConnectTask[] }>({
                        action: "update_task",
                        taskId: task.id,
                        status: task.status === "done" ? "open" : "done",
                      }).then((r) => setTasks(r.tasks))
                    }
                    className={`flex min-w-0 flex-1 items-center gap-1.5 text-left ${task.status === "done" ? "line-through text-zinc-500" : "text-zinc-200"}`}
                  >
                    <CheckSquare className="size-3.5 shrink-0 text-emerald-400" />
                    <span className="truncate">{task.title}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void connectPost<{ tasks: ConnectTask[] }>({ action: "delete_task", taskId: task.id }).then((r) =>
                        setTasks(r.tasks),
                      )
                    }
                    className="text-zinc-500 hover:text-rose-400"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Thread Settings & QR Invite Drawer */}
      {settingsOpen ? (
        <div className="border-b border-white/10 bg-[#121a20] p-3 text-xs">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-zinc-400">Disappearing:</label>
                {(["off", "24h", "7d", "90d"] as const).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() =>
                      void connectPost({
                        action: "update_thread",
                        threadId: thread.id,
                        actorId,
                        disappearingTtl: preset,
                      }).then(() => {
                        onToast(`Disappearing messages: ${preset}`);
                        onThreadUpdated();
                      })
                    }
                    className={`rounded-lg px-2 py-1 ${thread.disappearingTtl === preset ? "bg-emerald-500 text-black font-semibold" : "bg-white/10 text-zinc-200"}`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    void connectPost({ action: "update_thread", threadId: thread.id, actorId, toggleArchive: true }).then(() =>
                      onThreadUpdated(),
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 hover:bg-white/20"
                >
                  <Archive className="size-3" />
                  {thread.isArchived ? "Unarchive" : "Archive"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void connectPost({ action: "update_thread", threadId: thread.id, actorId, toggleFavorite: true }).then(() =>
                      onThreadUpdated(),
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 hover:bg-white/20"
                >
                  <Star className="size-3 text-amber-400" />
                  {thread.isFavorite ? "Unfavorite" : "Favorite"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const pin = window.prompt("Set a Chat PIN (leave blank to remove Chat Lock):") ?? "";
                    if (pin.trim()) window.localStorage.setItem(`vc_chat_pin_${thread.id}`, pin.trim());
                    else window.localStorage.removeItem(`vc_chat_pin_${thread.id}`);
                    onToast(pin.trim() ? "Chat Lock PIN enabled" : "Chat Lock removed");
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 hover:bg-white/20"
                >
                  <Lock className="size-3" />
                  Chat Lock PIN
                </button>
                {thread.kind === "direct" && peerMemberId !== actorId ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        void connectPost({ action: "block_user", blockerId: actorId, blockedId: peerMemberId }).then(() =>
                          onToast("User blocked from messaging & ringing you"),
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-lg bg-rose-500/20 px-2.5 py-1 text-rose-200 hover:bg-rose-500/30"
                    >
                      <Ban className="size-3" />
                      Block
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void connectPost({
                          action: "report_user",
                          reporterId: actorId,
                          targetId: peerMemberId,
                          reason: "Abuse / Spam reported from Vibe Connect",
                        }).then(() => onToast("Report submitted to moderation queue"))
                      }
                      className="inline-flex items-center gap-1 rounded-lg bg-amber-500/20 px-2.5 py-1 text-amber-200"
                    >
                      <ShieldAlert className="size-3" />
                      Report
                    </button>
                  </>
                ) : null}
              </div>
            </div>
            {qrDataUrl ? (
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 p-2">
                <img src={qrDataUrl} alt="Thread invite QR code" className="size-16 rounded-lg bg-white p-1" />
                <div className="space-y-1">
                  <p className="font-semibold text-white">Invite QR</p>
                  <button
                    type="button"
                    onClick={() => {
                      const u = `${window.location.origin}/connect?invite=${encodeURIComponent(thread.inviteCode)}`;
                      void navigator.clipboard?.writeText(u);
                      onToast("Invite link copied");
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-[11px] hover:bg-white/20"
                  >
                    <Copy className="size-3" />
                    Copy Invite Link
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Explicit Opt-In Noctis AI Copilot Drawer */}
      {aiDrawerOpen && flags.noctisAiOptIn ? (
        <div className="border-b border-[#e4b86a]/30 bg-[#151510] p-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-semibold text-[#e4b86a]">Noctis AI Copilot (Explicit Opt-In)</span>
              <span className="ml-2 text-[11px] text-zinc-400">Private chats are never sent to AI unless you click an action below.</span>
            </div>
            <button type="button" onClick={() => setAiDrawerOpen(false)} className="text-zinc-400 hover:text-white">
              <X className="size-3.5" />
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <button type="button" onClick={() => void runOptInNoctisAi("summarize")} className="rounded-lg bg-white/10 px-2.5 py-1 hover:bg-white/20">
              Summarize
            </button>
            <button type="button" onClick={() => void runOptInNoctisAi("actions")} className="rounded-lg bg-white/10 px-2.5 py-1 hover:bg-white/20">
              Action Items
            </button>
            <button type="button" onClick={() => void runOptInNoctisAi("reply")} className="rounded-lg bg-white/10 px-2.5 py-1 hover:bg-white/20">
              Smart Replies
            </button>
            <button type="button" onClick={() => void runOptInNoctisAi("scam")} className="rounded-lg bg-amber-500/20 px-2.5 py-1 text-amber-200 hover:bg-amber-500/30">
              Scam Check
            </button>
            <div className="inline-flex items-center gap-1 rounded-lg bg-black/50 px-2 py-0.5">
              <Languages className="size-3 text-emerald-400" />
              <select
                value={aiTargetLang}
                onChange={(e) => setAiTargetLang(e.target.value)}
                className="bg-transparent text-xs text-white outline-none"
              >
                {AI_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang} className="bg-[#111]">
                    {lang}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => void runOptInNoctisAi("translate")} className="rounded bg-emerald-500 px-2 py-0.5 text-[11px] font-semibold text-black">
                Translate
              </button>
            </div>
          </div>
          {aiBusy ? <p className="mt-2 text-zinc-400">Noctis AI analyzing opted-in excerpt…</p> : null}
          {aiOutput ? (
            <div className="mt-2 rounded-xl border border-white/10 bg-black/50 p-2.5 text-zinc-200">
              <p className="whitespace-pre-wrap leading-relaxed">{aiOutput}</p>
              <button
                type="button"
                onClick={() => setDraft((d) => (d ? `${d}\n${aiOutput}` : aiOutput))}
                className="mt-2 rounded-lg bg-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/30"
              >
                Insert into reply box
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Main Message Timeline + Polls & Events */}
      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
        {events.map((ev) => {
          const myRsvp = ev.rsvps[actorId] ?? "";
          return (
            <div key={ev.id} className="mx-auto max-w-md rounded-2xl border border-emerald-500/25 bg-[#111c21] p-3 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-300">
                <CalendarPlus className="size-3.5" />
                Event: {ev.title}
              </div>
              <p className="mt-1 text-zinc-300">
                {new Date(ev.startsAt).toLocaleString()} {ev.location ? `· ${ev.location}` : ""}
              </p>
              <div className="mt-2 flex gap-1.5">
                {(["going", "maybe", "declined"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() =>
                      void connectPost({ action: "rsvp_event", eventId: ev.id, actorId, status }).then(() =>
                        refreshThreadData(),
                      )
                    }
                    className={`rounded-lg px-2.5 py-1 capitalize ${myRsvp === status ? "bg-emerald-500 text-black font-semibold" : "bg-white/10 text-zinc-200"}`}
                  >
                    {status} ({Object.values(ev.rsvps).filter((v) => v === status).length})
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        {polls.map((poll) => {
          const totalVotes = Object.values(poll.votes).reduce((acc, arr) => acc + arr.length, 0);
          return (
            <div key={poll.id} className="mx-auto max-w-md rounded-2xl border border-white/15 bg-[#12191e] p-3 text-xs">
              <p className="font-semibold text-white">Poll: {poll.question}</p>
              <div className="mt-2 space-y-1.5">
                {poll.options.map((opt, idx) => {
                  const voters = poll.votes[String(idx)] ?? [];
                  const pct = totalVotes ? Math.round((voters.length / totalVotes) * 100) : 0;
                  const voted = voters.includes(actorId);
                  return (
                    <button
                      key={`${poll.id}-${idx}`}
                      type="button"
                      onClick={() =>
                        void connectPost({ action: "vote_poll", pollId: poll.id, actorId, optionIndex: idx }).then(() =>
                          refreshThreadData(),
                        )
                      }
                      className={`flex w-full items-center justify-between rounded-xl border px-3 py-1.5 text-left ${
                        voted ? "border-emerald-400 bg-emerald-500/20 text-emerald-200" : "border-white/10 bg-black/30 text-zinc-200"
                      }`}
                    >
                      <span>{opt}</span>
                      <span className="text-[11px] text-zinc-400">
                        {voters.length} ({pct}%)
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {messages.map((msg) => {
          const mine = msg.senderId === actorId;
          const text = readableText(msg);
          const replySource = msg.replyToId ? messages.find((m) => m.id === msg.replyToId) : null;
          const scheduledFuture = msg.deliverAt && Date.parse(msg.deliverAt) > Date.now();
          const metaRoomId = typeof msg.meta?.roomId === "string" ? msg.meta.roomId : "";
          const metaTranscript = typeof msg.meta?.transcript === "string" ? msg.meta.transcript : "";
          const unrevealedViewOnce = msg.viewOnce && !msg.burned && !msg.viewedBy.includes(actorId) && !mine;

          return (
            <div key={msg.id} className={`group flex flex-col ${mine ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-xs shadow-sm ${
                  mine
                    ? "rounded-tr-sm bg-[#0b4b3c] text-emerald-50"
                    : "rounded-tl-sm border border-white/10 bg-[#151e24] text-zinc-100"
                }`}
              >
                {!mine ? <p className="mb-0.5 text-[10px] font-semibold text-emerald-300">{msg.senderName}</p> : null}
                {replySource ? (
                  <div className="mb-1.5 rounded-lg border-l-2 border-emerald-400 bg-black/25 px-2 py-1 text-[11px] text-zinc-300">
                    <span className="font-semibold">{replySource.senderName}: </span>
                    <span className="line-clamp-1">{readableText(replySource)}</span>
                  </div>
                ) : null}
                {msg.forwarded ? <p className="mb-1 text-[10px] italic text-zinc-300">Forwarded</p> : null}

                {unrevealedViewOnce ? (
                  <button
                    type="button"
                    onClick={() =>
                      void connectPost({ action: "mark_view_once", messageId: msg.id, actorId }).then(() =>
                        refreshThreadData(),
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl bg-black/35 px-3 py-2 font-semibold text-amber-300 hover:bg-black/50"
                  >
                    <Eye className="size-3.5" />
                    Tap to view burn-after-reading secret once
                  </button>
                ) : (
                  <>
                    {msg.msgType === "call_invite" && metaRoomId ? (
                      <div className="rounded-xl border border-emerald-400/35 bg-black/35 p-2.5">
                        <p className="font-semibold text-white">{text}</p>
                        <button
                          type="button"
                          onClick={() =>
                            void navigate({
                              to: "/noctis",
                              search: { join: metaRoomId, mode: msg.meta?.mode === "video" ? "video" : "voice" } as Record<string, string>,
                            })
                          }
                          className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-black hover:bg-emerald-400"
                        >
                          <Phone className="size-3" />
                          Join Live Call ($0)
                        </button>
                      </div>
                    ) : msg.msgType === "voice" && msg.mediaUrl ? (
                      <div className="space-y-1.5">
                        <audio controls src={msg.mediaUrl} className="h-8 max-w-[240px]" />
                        {metaTranscript ? (
                          <p className="rounded-lg bg-black/25 px-2 py-1 text-[11px] text-emerald-100">
                            Transcript: {metaTranscript}
                          </p>
                        ) : null}
                      </div>
                    ) : msg.msgType === "video" && msg.mediaUrl ? (
                      <video controls src={msg.mediaUrl} className="max-h-56 rounded-xl bg-black" />
                    ) : msg.msgType === "image" && msg.mediaUrl ? (
                      <div className="space-y-1">
                        <img src={msg.mediaUrl} alt={msg.mediaName || "Shared image"} className="max-h-60 rounded-xl object-contain" />
                        {text ? <p className="whitespace-pre-wrap leading-relaxed">{text}</p> : null}
                      </div>
                    ) : msg.mediaUrl ? (
                      <a
                        href={msg.mediaUrl}
                        download={msg.mediaName || "attachment"}
                        className="inline-flex items-center gap-2 rounded-xl bg-black/30 px-3 py-2 font-medium text-emerald-200 hover:bg-black/45"
                      >
                        <FileText className="size-4" />
                        {msg.mediaName || "Download file"}
                      </a>
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
                    )}
                  </>
                )}

                <div className="mt-1 flex flex-wrap items-center justify-end gap-1.5 text-[10px] text-zinc-300/80">
                  {msg.encrypted ? <Lock className="size-2.5 text-emerald-300" /> : null}
                  {scheduledFuture ? (
                    <span className="inline-flex items-center gap-0.5 text-amber-300">
                      <Clock className="size-2.5" />
                      Scheduled
                    </span>
                  ) : null}
                  {msg.editedAt ? <span>edited</span> : null}
                  {msg.starredBy.includes(actorId) ? <Star className="size-2.5 fill-amber-400 text-amber-400" /> : null}
                  <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  {mine ? (
                    msg.readBy.length > 1 ? (
                      <CheckCheck className="size-3 text-sky-300" />
                    ) : (
                      <Check className="size-3" />
                    )
                  ) : null}
                </div>

                {Object.keys(msg.reactions).length > 0 ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {Object.entries(msg.reactions).map(([emoji, users]) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() =>
                          void connectPost({ action: "react_message", messageId: msg.id, actorId, emoji }).then(() =>
                            refreshThreadData(),
                          )
                        }
                        className="rounded-full bg-black/35 px-1.5 py-0.5 text-[10px]"
                      >
                        {emoji} {users.length}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Hover/Tap Action Bar */}
              {!msg.deletedForEveryone ? (
                <div className="mt-0.5 flex flex-wrap items-center gap-1 opacity-70 transition group-hover:opacity-100">
                  {["👍", "❤️", "😂", "🔥"].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() =>
                        void connectPost({ action: "react_message", messageId: msg.id, actorId, emoji }).then(() =>
                          refreshThreadData(),
                        )
                      }
                      className="rounded-full px-1 text-[11px] hover:bg-white/10"
                    >
                      {emoji}
                    </button>
                  ))}
                  <button type="button" onClick={() => setReplyTo(msg)} title="Reply" className="p-1 text-zinc-400 hover:text-white">
                    <Reply className="size-3" />
                  </button>
                  <button type="button" onClick={() => setForwardingMsg(msg)} title="Forward" className="p-1 text-zinc-400 hover:text-white">
                    <Forward className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void connectPost({ action: "toggle_star", messageId: msg.id, actorId }).then(() => refreshThreadData())}
                    title="Star"
                    className="p-1 text-zinc-400 hover:text-amber-300"
                  >
                    <Star className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void connectPost({ action: "toggle_pin", messageId: msg.id }).then(() => refreshThreadData())}
                    title="Pin"
                    className="p-1 text-zinc-400 hover:text-emerald-300"
                  >
                    <Pin className="size-3" />
                  </button>
                  {flags.beyondWorkspace ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPadOpen(true);
                        void connectPost<{ tasks: ConnectTask[] }>({
                          action: "create_task",
                          threadId: thread.id,
                          title: text.slice(0, 120),
                          sourceMsgId: msg.id,
                          createdBy: actorId,
                        }).then((r) => {
                          setTasks(r.tasks);
                          onToast("Added message as Action Task");
                        });
                      }}
                      title="Convert message to Task"
                      className="p-1 text-zinc-400 hover:text-emerald-300"
                    >
                      <CheckSquare className="size-3" />
                    </button>
                  ) : null}
                  {flags.noctisAiOptIn ? (
                    <button
                      type="button"
                      onClick={() => void runOptInNoctisAi("translate", text)}
                      title="Opt-In Translate with Noctis AI"
                      className="p-1 text-zinc-400 hover:text-[#e4b86a]"
                    >
                      <Languages className="size-3" />
                    </button>
                  ) : null}
                  {mine ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMsg(msg);
                        setDraft(text);
                      }}
                      title="Edit"
                      className="p-1 text-zinc-400 hover:text-white"
                    >
                      <Edit3 className="size-3" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() =>
                      void connectPost({
                        action: "delete_message",
                        messageId: msg.id,
                        actorId,
                        forEveryone: mine,
                      }).then(() => refreshThreadData())
                    }
                    title={mine ? "Delete for everyone" : "Delete for me"}
                    className="p-1 text-zinc-400 hover:text-rose-400"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-white/10 bg-[#10181c] p-3">
        {replyTo ? (
          <div className="mb-2 flex items-center justify-between rounded-xl border-l-2 border-emerald-400 bg-black/40 px-3 py-1.5 text-xs">
            <span className="truncate text-zinc-300">
              Replying to <b>{replyTo.senderName}</b>: {readableText(replyTo)}
            </span>
            <button type="button" onClick={() => setReplyTo(null)} className="text-zinc-400 hover:text-white">
              <X className="size-3.5" />
            </button>
          </div>
        ) : null}
        {editingMsg ? (
          <div className="mb-2 flex items-center justify-between rounded-xl bg-amber-500/10 px-3 py-1 text-xs text-amber-200">
            <span>Editing message</span>
            <button
              type="button"
              onClick={() => {
                setEditingMsg(null);
                setDraft("");
              }}
            >
              Cancel
            </button>
          </div>
        ) : null}
        {scheduleOpen ? (
          <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl bg-black/40 px-3 py-1.5 text-xs">
            <Clock className="size-3.5 text-amber-300" />
            <span>Schedule send:</span>
            <input
              type="datetime-local"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
              className="rounded border border-white/15 bg-black/60 px-2 py-0.5 text-xs text-white"
            />
            <button type="button" onClick={() => setScheduleOpen(false)} className="text-zinc-400 hover:text-white">
              Close
            </button>
          </div>
        ) : null}
        {recordingMode ? (
          <div className="mb-2 flex items-center justify-between rounded-xl bg-rose-500/15 px-3 py-2 text-xs text-rose-200">
            <span>
              Recording {recordingMode} note… {liveVoiceTranscript ? `"${liveVoiceTranscript}"` : ""}
            </span>
            <button
              type="button"
              onClick={() => void startRecording(recordingMode)}
              className="inline-flex items-center gap-1 rounded-lg bg-rose-500 px-2.5 py-1 font-semibold text-white"
            >
              <Square className="size-3" />
              Stop & Send
            </button>
          </div>
        ) : null}

        {attachOpen ? (
          <div className="mb-2 flex flex-wrap gap-1.5 rounded-xl border border-white/10 bg-black/50 p-2 text-xs">
            <button
              type="button"
              onClick={() => mediaFileRef.current?.click()}
              className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 hover:bg-white/20"
            >
              <ImageIcon className="size-3.5 text-sky-300" />
              Photo / Doc / File
            </button>
            <button
              type="button"
              onClick={() => {
                setAttachOpen(false);
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    (pos) =>
                      void sendPayload({
                        msgType: "location",
                        body: `📍 Shared location: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)} (https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude})`,
                      }),
                    () => onToast("Allow location permission to share coordinates"),
                  );
                }
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 hover:bg-white/20"
            >
              <MapPin className="size-3.5 text-emerald-400" />
              Share Location
            </button>
            <button
              type="button"
              onClick={() => {
                setAttachOpen(false);
                void sendPayload({
                  msgType: "contact",
                  body: `👤 Contact Card: ${actorName} (${actorPhone || actorId})`,
                });
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 hover:bg-white/20"
            >
              <UserCheck className="size-3.5 text-purple-300" />
              Share My Contact Card
            </button>
            <button
              type="button"
              onClick={() => {
                setAttachOpen(false);
                setPollOpen(true);
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 hover:bg-white/20"
            >
              <BookmarkCheck className="size-3.5 text-amber-300" />
              Create Poll
            </button>
            <button
              type="button"
              onClick={() => {
                setAttachOpen(false);
                setEventOpen(true);
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 hover:bg-white/20"
            >
              <CalendarPlus className="size-3.5 text-emerald-300" />
              Create Event
            </button>
          </div>
        ) : null}

        <input
          ref={mediaFileRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 180_000) {
              onToast("Demo attachment limit is 180 KB for instant Postgres preview.");
              return;
            }
            const reader = new FileReader();
            reader.onload = () => {
              const url = typeof reader.result === "string" ? reader.result : "";
              void sendPayload({
                msgType: file.type.startsWith("image/") ? "image" : "file",
                body: file.name,
                mediaUrl: url,
                mediaName: file.name,
                mediaMime: file.type,
              });
              setAttachOpen(false);
            };
            reader.readAsDataURL(file);
          }}
        />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim()) return;
            void sendPayload({ msgType: "text", body: draft.trim() });
          }}
          className="flex items-center gap-1.5"
        >
          <button
            type="button"
            onClick={() => setAttachOpen((v) => !v)}
            title="Attach media, poll, event, location or contact card"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-white/5 text-zinc-300 hover:bg-white/10"
          >
            <Paperclip className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewOnceSend((v) => !v)}
            title="Burn after reading (View-once secret)"
            className={`grid size-9 shrink-0 place-items-center rounded-full ${
              viewOnceSend ? "bg-amber-500 text-black" : "bg-white/5 text-zinc-300 hover:bg-white/10"
            }`}
          >
            {viewOnceSend ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
          <button
            type="button"
            onClick={() => setScheduleOpen((v) => !v)}
            title="Schedule send"
            className={`grid size-9 shrink-0 place-items-center rounded-full ${
              scheduleAt ? "bg-amber-500 text-black" : "bg-white/5 text-zinc-300 hover:bg-white/10"
            }`}
          >
            <Clock className="size-4" />
          </button>

          <input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (e.target.value.trim()) {
                void connectPost({
                  action: "set_presence",
                  threadId: thread.id,
                  actorId,
                  actorName,
                  state: "typing",
                }).catch(() => undefined);
              }
            }}
            placeholder={viewOnceSend ? "Write burn-after-reading secret..." : "Write encrypted message..."}
            className="min-w-0 flex-1 rounded-full border border-white/10 bg-black/50 px-4 py-2 text-xs text-white outline-none placeholder:text-zinc-500 focus:border-emerald-400/50"
          />

          {flags.voiceVideoNotes ? (
            <>
              <button
                type="button"
                onClick={() => void startRecording("voice")}
                title="Record Voice Note + Live Transcript"
                className="grid size-9 shrink-0 place-items-center rounded-full bg-white/5 text-zinc-300 hover:bg-white/10"
              >
                <Mic className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => void startRecording("video")}
                title="Record Video Note"
                className="grid size-9 shrink-0 place-items-center rounded-full bg-white/5 text-zinc-300 hover:bg-white/10"
              >
                <Video className="size-4" />
              </button>
            </>
          ) : null}

          <button
            type="submit"
            aria-label="Send message"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-500 text-black hover:bg-emerald-400"
          >
            <Send className="size-4" />
          </button>
        </form>
      </div>

      {/* Safety Number Modal */}
      {safetyModalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-emerald-400/30 bg-[#11181c] p-5 text-xs text-zinc-200">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-300">
                <ShieldCheck className="size-4" />
                E2EE Safety Number Verification
              </span>
              <button type="button" onClick={() => setSafetyModalOpen(false)}>
                <X className="size-4" />
              </button>
            </div>
            <p className="mt-2 text-zinc-400">
              Messages use client-side ECDH P-256 + AES-GCM 256 encryption. Verify these 60 digits match your contact:
            </p>
            <div className="mt-3 grid grid-cols-4 gap-2 rounded-xl border border-white/10 bg-black/50 p-3 text-center font-mono text-sm text-emerald-300">
              {safetyDigits.map((blk, i) => (
                <span key={`${blk}-${i}`}>{blk}</span>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Forward Message Modal */}
      {forwardingMsg ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#11181c] p-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">Forward Message</span>
              <button type="button" onClick={() => setForwardingMsg(null)}>
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-3 max-h-60 space-y-1.5 overflow-y-auto">
              {allThreads.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    const txt = readableText(forwardingMsg);
                    void connectPost({
                      action: "send_message",
                      threadId: t.id,
                      senderId: actorId,
                      senderName: actorName,
                      msgType: "text",
                      body: txt,
                      forwarded: true,
                    }).then(() => {
                      setForwardingMsg(null);
                      onToast(`Forwarded to ${t.title}`);
                      onThreadUpdated();
                    });
                  }}
                  className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-left hover:border-emerald-400/40"
                >
                  <span className="font-medium text-white">{t.title}</span>
                  <Plus className="size-3.5 text-emerald-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Create Poll Modal */}
      {pollOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4">
          <div className="w-full max-w-sm space-y-2.5 rounded-2xl border border-white/15 bg-[#11181c] p-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">Create Group Poll</span>
              <button type="button" onClick={() => setPollOpen(false)}>
                <X className="size-4" />
              </button>
            </div>
            <input
              value={pollQ}
              onChange={(e) => setPollQ(e.target.value)}
              placeholder="Poll question..."
              className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-white outline-none"
            />
            <textarea
              value={pollOpts}
              onChange={(e) => setPollOpts(e.target.value)}
              rows={4}
              placeholder="One option per line"
              className="w-full rounded-xl border border-white/10 bg-black/50 p-2.5 text-white outline-none"
            />
            <button
              type="button"
              onClick={() =>
                void connectPost({
                  action: "create_poll",
                  threadId: thread.id,
                  question: pollQ,
                  options: pollOpts.split("\n").map((s) => s.trim()).filter(Boolean),
                  createdBy: actorId,
                }).then(() => {
                  setPollOpen(false);
                  setPollQ("");
                  void refreshThreadData();
                })
              }
              className="w-full rounded-xl bg-emerald-500 py-2 font-semibold text-black hover:bg-emerald-400"
            >
              Launch Poll
            </button>
          </div>
        </div>
      ) : null}

      {/* Create Event Modal */}
      {eventOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4">
          <div className="w-full max-w-sm space-y-2.5 rounded-2xl border border-white/15 bg-[#11181c] p-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">Create Group Event & RSVP</span>
              <button type="button" onClick={() => setEventOpen(false)}>
                <X className="size-4" />
              </button>
            </div>
            <input
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              placeholder="Event title..."
              className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-white outline-none"
            />
            <input
              type="datetime-local"
              value={eventWhen}
              onChange={(e) => setEventWhen(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-white outline-none"
            />
            <input
              value={eventLoc}
              onChange={(e) => setEventLoc(e.target.value)}
              placeholder="Location or Noctis Call Room..."
              className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-white outline-none"
            />
            <button
              type="button"
              onClick={() =>
                void connectPost({
                  action: "create_event",
                  threadId: thread.id,
                  title: eventTitle,
                  startsAt: eventWhen || new Date().toISOString(),
                  location: eventLoc,
                  createdBy: actorId,
                }).then(() => {
                  setEventOpen(false);
                  setEventTitle("");
                  void refreshThreadData();
                })
              }
              className="w-full rounded-xl bg-emerald-500 py-2 font-semibold text-black hover:bg-emerald-400"
            >
              Create Event
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
