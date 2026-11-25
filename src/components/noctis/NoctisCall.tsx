import { useEffect, useRef, useState, type ClipboardEvent } from "react";
import { Link } from "@tanstack/react-router";
import { BookmarkPlus, Check, ChevronDown, Copy, Delete, Globe, Info, Link2, MessageSquare, Mic, MicOff, Phone, PhoneOff, Plus, Search, Share2, Smartphone, Trash2, UserPlus, Users, Video, X } from "lucide-react";
import { StudyCall, type CallToolbarActions } from "@/components/learn/StudyCall";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { studyClearRing, studyInvite, studyJoined, studyOpenCall, studyRing, studyRings, studyRoom } from "@/lib/study-group-api";
import { voipReady, voipToken } from "@/lib/voip-api";
import type { VoipStatus } from "@/lib/voip.server";
import {
  clearWorldPhoneProfile,
  createTabPeerId,
  deleteWorldCallGroup,
  getOrCreateWorldDeviceId,
  getRecentWorldCalls,
  getSavedWorldPhoneProfile,
  getWorldCallGroups,
  getWorldContacts,
  recordWorldCall,
  removeWorldContact,
  saveWorldCallGroup,
  saveWorldContact,
  saveWorldPhoneProfile,
  subscribeDeviceToWebPush,
  type RecentWorldCall,
  type WorldCallGroup,
  type WorldContact,
  type WorldPhoneProfile,
} from "@/lib/world-call-client";
import {
  buildSmsCallInviteUrl,
  buildWhatsAppCallInviteUrl,
  detectDefaultCountryIso,
  findCountryByIso,
  formatInternationalDisplay,
  normalizeWorldE164,
  searchWorldCountries,
  WORLD_DIAL_CODES,
} from "@/lib/world-dial-codes";

type Person = {
  userId: string;
  name: string;
  phone: string;
  live: boolean;
  groupId: string;
  groupTitle: string;
};

type Live = {
  groupId: string;
  title: string;
  video: boolean;
  name: string;
  userId: string;
  transport: "study" | "world";
  targetE164?: string;
  joinUrl?: string;
  directRingId?: number;
  directRingName?: string;
  groupRingCount?: number;
  groupLabel?: string;
};
type Ring = { id: number; groupId: string; from: string; title: string; interest: string };
type Line = { hangup: () => void; mute: (on: boolean) => void; sendDigits?: (digits: string) => void };
type Pstn = { number: string; line: Line };
type DirectoryHit = { e164: string; registered: boolean; displayName: string; online: boolean; pushReady?: boolean };

const KEYS: [string, string][] = [
  ["1", ""],
  ["2", "ABC"],
  ["3", "DEF"],
  ["4", "GHI"],
  ["5", "JKL"],
  ["6", "MNO"],
  ["7", "PQRS"],
  ["8", "TUV"],
  ["9", "WXYZ"],
  ["*", ""],
  ["0", "+"],
  ["#", ""],
];

const DTMF_FREQS: Record<string, [number, number]> = {
  "1": [697, 1209],
  "2": [697, 1336],
  "3": [697, 1477],
  "4": [770, 1209],
  "5": [770, 1336],
  "6": [770, 1477],
  "7": [852, 1209],
  "8": [852, 1336],
  "9": [852, 1477],
  "*": [941, 1209],
  "0": [941, 1336],
  "#": [941, 1477],
};

function digitsOf(value: string) {
  return value.replace(/\D/g, "");
}

function samePhone(a: string, b: string) {
  const left = digitsOf(a);
  const right = digitsOf(b);
  if (left.length < 7 || right.length < 7) return false;
  return left.endsWith(right.slice(-10)) || right.endsWith(left.slice(-10));
}

function clock(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function NoctisCall({
  onClose,
  onVibe,
  startVideo = false,
  join = "",
  openRegister = false,
  onRecorded,
  callActions,
}: {
  onClose: () => void;
  onVibe: () => void;
  startVideo?: boolean;
  join?: string;
  openRegister?: boolean;
  onRecorded?: (url: string) => void;
  callActions?: CallToolbarActions;
}) {
  const { user } = useCurrentUserState();
  const [worldPeerId] = useState(() => createTabPeerId());
  const [people, setPeople] = useState<Person[]>([]);
  const [countryIso, setCountryIso] = useState<string>(() => detectDefaultCountryIso());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [countryQuery, setCountryQuery] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);
  const [myPhoneOpen, setMyPhoneOpen] = useState(
    () => openRegister || (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("register") === "1"),
  );
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [myPhoneProfile, setMyPhoneProfile] = useState<WorldPhoneProfile | null>(() => getSavedWorldPhoneProfile());
  const [myPhoneInput, setMyPhoneInput] = useState(() => getSavedWorldPhoneProfile()?.phoneE164 ?? "");
  const [myNameInput, setMyNameInput] = useState(() => getSavedWorldPhoneProfile()?.displayName ?? "");
  const [myPhoneBusy, setMyPhoneBusy] = useState(false);
  const [myPhoneNote, setMyPhoneNote] = useState<string | null>(null);
  const [copiedSetup, setCopiedSetup] = useState(false);
  const [contacts, setContacts] = useState<WorldContact[]>(() => getWorldContacts());
  const [recents, setRecents] = useState<RecentWorldCall[]>(() => getRecentWorldCalls());
  const [groups, setGroups] = useState<WorldCallGroup[]>(() => getWorldCallGroups());
  const [groupNameInput, setGroupNameInput] = useState("");
  const [groupPhoneDraft, setGroupPhoneDraft] = useState("");
  const [groupMembersDraft, setGroupMembersDraft] = useState<{ phoneE164: string; name: string }[]>([]);
  const [groupNote, setGroupNote] = useState<string | null>(null);
  const [savingContact, setSavingContact] = useState(false);
  const [contactNameInput, setContactNameInput] = useState("");
  const [dirLookup, setDirLookup] = useState<DirectoryHit | null>(null);
  const [number, setNumber] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [video, setVideo] = useState(startVideo);
  const [live, setLive] = useState<Live | null>(null);
  const [ring, setRing] = useState<Ring | null>(null);
  const [pstn, setPstn] = useState<Pstn | null>(null);
  const [pstnKeypad, setPstnKeypad] = useState(false);
  const [voipDetails, setVoipDetails] = useState<VoipStatus | null>(null);
  const [internet, setInternet] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [adding, setAdding] = useState(false);
  const activeRingIdsRef = useRef<number[]>([]);
  const tone = useRef<AudioContext | null>(null);
  const dtmfCtx = useRef<AudioContext | null>(null);
  const zeroHoldTimer = useRef<number | null>(null);
  const zeroHeldPlus = useRef(false);
  const deviceRef = useRef<{ destroy: () => void } | null>(null);

  const selectedCountry = findCountryByIso(countryIso) ?? WORLD_DIAL_CODES[0]!;
  const normalized = normalizeWorldE164(number, selectedCountry.dial);
  const matched = people.find((person) => samePhone(normalized.e164 || number, person.phone));
  const savedContactMatch = normalized.valid ? contacts.find((c) => c.phoneE164 === normalized.e164) : undefined;
  const filteredCountries = searchWorldCountries(countryQuery);

  function playDtmf(key: string) {
    const pair = DTMF_FREQS[key];
    if (!pair || typeof window === "undefined") return;
    try {
      const Ctx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      if (!dtmfCtx.current || dtmfCtx.current.state === "closed") {
        dtmfCtx.current = new Ctx();
      }
      const ctx = dtmfCtx.current;
      if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
      gain.connect(ctx.destination);
      for (const freq of pair) {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.connect(gain);
        osc.start();
        osc.stop(ctx.currentTime + 0.095);
      }
    } catch {
      /* AudioContext unavailable */
    }
  }

  useEffect(() => {
    if (!normalized.valid || !normalized.e164) {
      setDirLookup(null);
      setSavingContact(false);
      return;
    }
    const targetE164 = normalized.e164;
    let stop = false;
    const timer = window.setTimeout(() => {
      void fetch(`/api/call-room?lookup=${encodeURIComponent(targetE164)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((hit: { registered?: boolean; phoneE164?: string; displayName?: string; online?: boolean; pushReady?: boolean } | null) => {
          if (stop || !hit) return;
          setDirLookup({
            e164: hit.phoneE164 || targetE164,
            registered: Boolean(hit.registered),
            displayName: hit.displayName || "",
            online: Boolean(hit.online),
            pushReady: Boolean(hit.pushReady),
          });
        })
        .catch(() => undefined);
    }, 250);
    return () => {
      stop = true;
      window.clearTimeout(timer);
    };
  }, [normalized.valid, normalized.e164]);

  useEffect(() => {
    let stop = false;
    void voipReady()
      .then((row) => {
        if (stop) return;
        setVoipDetails(row ?? null);
        setInternet(Boolean(row?.ready));
      })
      .catch(() => undefined);
    return () => {
      stop = true;
      deviceRef.current?.destroy();
      dtmfCtx.current?.close().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    if (!join) return;
    let stop = false;
    void fetch(`/api/call-room?roomId=${encodeURIComponent(join)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((room: { exists?: boolean; title?: string; mode?: string; targetE164?: string } | null) => {
        if (stop) return;
        if (room?.exists) {
          const isVid = startVideo || room.mode === "video";
          setVideo(isVid);
          setLive({
            groupId: join,
            title: room.title || "Global internet call",
            video: isVid,
            name: room.targetE164 || room.title || "Global internet call",
            userId: "",
            transport: "world",
            targetE164: room.targetE164 || "",
            joinUrl: callLink(join, isVid ? "video" : "voice"),
          });
          return;
        }
        if (!user?.id) return;
        setLive({
          groupId: join,
          title: "Noctis meeting",
          video: true,
          name: "Noctis meeting",
          userId: "",
          transport: "study",
          joinUrl: callLink(join, "video"),
        });
        void studyRoom({ data: { groupId: join } })
          .then((study) => {
            if (stop) return;
            const other = study.people.find((person) => person.userId !== user?.id);
            setLive({
              groupId: join,
              title: "Noctis meeting",
              video: true,
              name: other?.name || "Noctis meeting",
              userId: other?.userId ?? "",
              transport: "study",
              joinUrl: callLink(join, "video"),
            });
          })
          .catch(() => undefined);
      })
      .catch(() => undefined);
    return () => {
      stop = true;
    };
  }, [join, user?.id, startVideo]);

  useEffect(() => {
    if (!user?.id) return;
    let stop = false;
    void studyJoined()
      .then(async (groups) => {
        const rooms = await Promise.all(
          groups.slice(0, 12).map(async (group) => {
            try {
              const room = await studyRoom({ data: { groupId: group.id } });
              return room.people.map((person) => ({
                userId: person.userId,
                name: person.name,
                phone: person.phone,
                live: person.live,
                groupId: group.id,
                groupTitle: group.title,
              }));
            } catch {
              return [];
            }
          }),
        );
        if (stop) return;
        const seen = new Set<string>();
        const next: Person[] = [];
        for (const row of rooms.flat()) {
          if (seen.has(row.userId)) continue;
          seen.add(row.userId);
          next.push(row);
        }
        setPeople(next);
      })
      .catch(() => undefined);
    return () => {
      stop = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (live || !user?.id) return;
    let stop = false;
    async function look() {
      try {
        const rows = await studyRings();
        if (!stop) setRing(rows[0] ?? null);
      } catch {
        if (!stop) setRing(null);
      }
    }
    void look();
    const timer = window.setInterval(() => void look(), 3000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [live, user?.id]);

  useEffect(() => {
    if (!ring) {
      tone.current?.close().catch(() => undefined);
      tone.current = null;
      return;
    }
    const Ctx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    tone.current = ctx;
    let on = false;
    const pulse = () => {
      if (ctx.state === "closed") return;
      on = !on;
      if (!on) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 440;
      gain.gain.value = 0.05;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    };
    pulse();
    const timer = window.setInterval(pulse, 1400);
    return () => {
      window.clearInterval(timer);
      void ctx.close().catch(() => undefined);
      if (tone.current === ctx) tone.current = null;
    };
  }, [ring]);

  useEffect(() => {
    if (!live || live.transport !== "study") return;
    setSeconds(0);
    setConnected(false);
    const tick = window.setInterval(() => setSeconds((n) => n + 1), 1000);
    let stop = false;
    const watch = window.setInterval(() => {
      void studyRoom({ data: { groupId: live.groupId } })
        .then((room) => {
          if (stop) return;
          const them = room.people.find((person) => person.userId === live.userId);
          if (them?.live) setConnected(true);
        })
        .catch(() => undefined);
    }, 2000);
    return () => {
      stop = true;
      window.clearInterval(tick);
      window.clearInterval(watch);
    };
  }, [live]);

  useEffect(() => {
    if (!pstn) return;
    setSeconds(0);
    const tick = window.setInterval(() => setSeconds((n) => n + 1), 1000);
    return () => window.clearInterval(tick);
  }, [pstn]);

  useEffect(() => {
    pstn?.line.mute(muted);
  }, [muted, pstn]);

  function press(key: string) {
    setNote(null);
    playDtmf(key);
    setNumber((now) => {
      if (key === "+" && now.includes("+")) return now;
      return (now + key).slice(0, 22);
    });
  }

  function handleZeroDown() {
    zeroHeldPlus.current = false;
    if (zeroHoldTimer.current) window.clearTimeout(zeroHoldTimer.current);
    zeroHoldTimer.current = window.setTimeout(() => {
      zeroHeldPlus.current = true;
      setNote(null);
      setNumber((now) => (now ? now : "+"));
    }, 450);
  }

  function handleZeroUp() {
    if (zeroHoldTimer.current) {
      window.clearTimeout(zeroHoldTimer.current);
      zeroHoldTimer.current = null;
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const pasted = event.clipboardData.getData("text").replace(/[^0-9+*#()\-\s]/g, "").trim();
    if (!pasted) return;
    event.preventDefault();
    setNote(null);
    setNumber(pasted.slice(0, 22));
  }

  useEffect(() => {
    if (live || ring || pstn || pickerOpen || myPhoneOpen || groupsOpen || savingContact) return;
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (/^[0-9*#]$/.test(event.key) || event.key === "+") {
        event.preventDefault();
        press(event.key);
      } else if (event.key === "Backspace") {
        event.preventDefault();
        setNumber((now) => now.slice(0, -1));
      } else if (event.key === "Enter") {
        event.preventDefault();
        place();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  async function saveMyNumber() {
    const raw = myPhoneInput.trim();
    const norm = normalizeWorldE164(raw, selectedCountry.dial);
    if (!norm.valid || !norm.e164) {
      setMyPhoneNote("Enter a valid global phone number (7–15 digits).");
      return;
    }
    setMyPhoneBusy(true);
    setMyPhoneNote(null);
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        void Notification.requestPermission().catch(() => undefined);
      }
      const deviceId = getOrCreateWorldDeviceId();
      const displayName = myNameInput.trim() || user?.displayName?.trim() || "Noctis User";
      const res = await fetch("/api/call-room", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "register_phone",
          phoneE164: norm.e164,
          deviceId,
          displayName,
          countryIso: norm.country?.iso ?? selectedCountry.iso,
          defaultDial: selectedCountry.dial,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        phoneE164?: string;
        displayName?: string;
        countryIso?: string;
      };
      if (!res.ok || !json.ok || !json.phoneE164) {
        throw new Error(json.error || "Could not register phone number");
      }
      const nextProfile: WorldPhoneProfile = {
        deviceId,
        phoneE164: json.phoneE164,
        displayName: json.displayName || displayName,
        countryIso: json.countryIso || selectedCountry.iso,
      };
      saveWorldPhoneProfile(nextProfile);
      setMyPhoneProfile(nextProfile);
      setMyPhoneInput(nextProfile.phoneE164);
      setMyNameInput(nextProfile.displayName);

      const pushRes = await subscribeDeviceToWebPush(nextProfile.phoneE164, deviceId, nextProfile.displayName);
      if (pushRes.ok) {
        setMyPhoneNote(`Registered ${nextProfile.phoneE164} · Background Web Push & open-tab ringing active ($0)!`);
      } else {
        setMyPhoneNote(`Registered ${nextProfile.phoneE164} · Open-tab ringing active (${pushRes.reason || "grant notifications for background push"}).`);
      }
    } catch (caught) {
      setMyPhoneNote(caught instanceof Error ? caught.message : "Registration failed");
    } finally {
      setMyPhoneBusy(false);
    }
  }

  async function copySetupLink() {
    if (typeof window === "undefined") return;
    const link = `${window.location.origin}/noctis?register=1`;
    await navigator.clipboard?.writeText(link).catch(() => undefined);
    setCopiedSetup(true);
    window.setTimeout(() => setCopiedSetup(false), 2400);
  }

  function handleSaveSpeedContact() {
    if (!normalized.valid || !normalized.e164) return;
    const name =
      contactNameInput.trim() ||
      (dirLookup?.e164 === normalized.e164 && dirLookup.displayName) ||
      normalized.country?.name ||
      normalized.e164;
    const next = saveWorldContact({
      phoneE164: normalized.e164,
      name: name.slice(0, 40),
      countryIso: normalized.country?.iso || selectedCountry.iso,
    });
    setContacts(next);
    setSavingContact(false);
    setContactNameInput("");
  }

  function addMemberPhoneToGroup() {
    const norm = normalizeWorldE164(groupPhoneDraft, selectedCountry.dial);
    if (!norm.valid || !norm.e164) {
      setGroupNote("Enter a full 7–15 digit international phone number.");
      return;
    }
    setGroupNote(null);
    if (groupMembersDraft.some((m) => m.phoneE164 === norm.e164)) {
      setGroupPhoneDraft("");
      return;
    }
    const existingContact = contacts.find((c) => c.phoneE164 === norm.e164);
    setGroupMembersDraft((prev) => [
      ...prev,
      { phoneE164: norm.e164, name: existingContact?.name || norm.e164 },
    ]);
    setGroupPhoneDraft("");
  }

  function toggleContactInGroup(contact: WorldContact) {
    setGroupNote(null);
    setGroupMembersDraft((prev) =>
      prev.some((m) => m.phoneE164 === contact.phoneE164)
        ? prev.filter((m) => m.phoneE164 !== contact.phoneE164)
        : [...prev, { phoneE164: contact.phoneE164, name: contact.name }],
    );
  }

  function saveNewCallGroup() {
    const name = groupNameInput.trim();
    if (!name) {
      setGroupNote("Enter a group name (e.g. Family or Ops Team).");
      return;
    }
    if (!groupMembersDraft.length) {
      setGroupNote("Add at least 1 phone number or contact to the group.");
      return;
    }
    const next = saveWorldCallGroup({ name, members: groupMembersDraft });
    setGroups(next);
    setGroupNameInput("");
    setGroupPhoneDraft("");
    setGroupMembersDraft([]);
    setGroupNote(`Saved group "${name}" (${groupMembersDraft.length} members).`);
  }

  async function startGroupCall(group: WorldCallGroup, withVideo: boolean) {
    setNote(null);
    setGroupsOpen(false);
    setVideo(withVideo);
    const hostName = myPhoneProfile?.displayName || user?.displayName?.trim() || "Noctis Caller";
    try {
      const res = await fetch("/api/call-room", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "create",
          title: `${group.name} (${group.members.length})`,
          mode: withVideo ? "video" : "voice",
          hostPeerId: worldPeerId,
          hostName,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; id?: string; error?: string };
      if (!res.ok || !json.id) throw new Error(json.error || "Could not start the group call");

      const ringRes = await fetch("/api/call-room", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "ring_group",
          roomId: json.id,
          groupName: group.name,
          fromPhoneE164: myPhoneProfile?.phoneE164,
          fromName: hostName,
          memberPhones: group.members.map((m) => m.phoneE164),
          mode: withVideo ? "video" : "voice",
        }),
      });
      const ringJson = (await ringRes.json()) as {
        ok?: boolean;
        rung?: { ringId: number; phoneE164: string; displayName: string }[];
        notRegistered?: string[];
      };
      const ringIds = (ringJson.rung ?? []).map((r) => r.ringId);
      activeRingIdsRef.current = ringIds;

      const link = callLink(json.id, withVideo ? "video" : "voice");
      void navigator.clipboard?.writeText(link).catch(() => undefined);
      setMuted(false);
      setLive({
        groupId: json.id,
        title: `${group.name} (${group.members.length})`,
        video: withVideo,
        name: group.name,
        userId: "",
        transport: "world",
        joinUrl: link,
        directRingId: ringIds[0],
        directRingName: group.name,
        groupRingCount: ringIds.length,
        groupLabel: group.name,
      });
    } catch (caught) {
      setNote(caught instanceof Error ? caught.message : "Could not start the group call");
    }
  }

  async function startWorldCall(targetE164: string, withVideo: boolean) {
    setNote(null);
    const label = targetE164
      ? `${selectedCountry.flag} ${targetE164}`
      : number.trim()
        ? formatInternationalDisplay(number, selectedCountry.dial)
        : withVideo
          ? "Global Video Call"
          : "Global Voice Call";
    const hostName = myPhoneProfile?.displayName || user?.displayName?.trim() || "Noctis Caller";
    if (targetE164) {
      setRecents(
        recordWorldCall({
          phoneE164: targetE164,
          name: savedContactMatch?.name || dirLookup?.displayName || targetE164,
          mode: withVideo ? "video" : "voice",
        }),
      );
    }
    try {
      const res = await fetch("/api/call-room", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "create",
          title: label,
          mode: withVideo ? "video" : "voice",
          targetE164,
          hostPeerId: worldPeerId,
          hostName,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; id?: string; error?: string };
      if (!res.ok || !json.id) throw new Error(json.error || "Could not start the internet call");

      let directRingId: number | undefined;
      let directRingName: string | undefined;
      activeRingIdsRef.current = [];
      if (targetE164) {
        const hit =
          dirLookup && dirLookup.e164 === targetE164
            ? dirLookup
            : await fetch(`/api/call-room?lookup=${encodeURIComponent(targetE164)}`)
                .then((r) => (r.ok ? r.json() : null))
                .catch(() => null);
        if (hit?.registered) {
          const ringRes = await fetch("/api/call-room", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              action: "ring_phone",
              roomId: json.id,
              fromPhoneE164: myPhoneProfile?.phoneE164,
              fromName: hostName,
              toPhoneE164: targetE164,
              mode: withVideo ? "video" : "voice",
            }),
          });
          const ringJson = (await ringRes.json()) as { ok?: boolean; ringId?: number; toDisplayName?: string };
          if (ringRes.ok && ringJson.ok && ringJson.ringId) {
            directRingId = ringJson.ringId;
            directRingName = ringJson.toDisplayName || targetE164;
            activeRingIdsRef.current = [ringJson.ringId];
          }
        }
      }

      const link = callLink(json.id, withVideo ? "video" : "voice");
      void navigator.clipboard?.writeText(link).catch(() => undefined);
      setMuted(false);
      setLive({
        groupId: json.id,
        title: label,
        video: withVideo,
        name: directRingName || savedContactMatch?.name || targetE164 || label,
        userId: "",
        transport: "world",
        targetE164,
        joinUrl: link,
        directRingId,
        directRingName,
      });
    } catch (caught) {
      setNote(caught instanceof Error ? caught.message : "Could not start the call");
    }
  }

  async function startRoom(title = "Video call") {
    if (!user?.id || user.isDevFallback) {
      await startWorldCall("", video);
      return;
    }
    setNote(null);
    try {
      const room = await studyOpenCall({ data: { title: title.slice(0, 60) } });
      setMuted(false);
      setVideo(true);
      setLive({
        groupId: room.id,
        title: room.title,
        video: true,
        name: title,
        userId: "",
        transport: "study",
        joinUrl: callLink(room.id, "video"),
      });
    } catch {
      await startWorldCall("", video);
    }
  }

  async function start(person: Person, withVideo: boolean) {
    setNote(null);
    if (withVideo) {
      try {
        const room = await studyOpenCall({ data: { title: person.name } });
        await studyInvite({ data: { groupId: room.id, to: person.userId } });
        setMuted(false);
        setLive({
          groupId: room.id,
          title: room.title,
          video: true,
          name: person.name,
          userId: person.userId,
          transport: "study",
          joinUrl: callLink(room.id, "video"),
        });
      } catch (caught) {
        setNote(caught instanceof Error ? caught.message : "Could not start the video call");
      }
      return;
    }
    try {
      await studyRing({ data: { groupId: person.groupId, to: person.userId } });
    } catch (caught) {
      setNote(caught instanceof Error ? caught.message : "Could not ring them");
      return;
    }
    setMuted(false);
    setLive({
      groupId: person.groupId,
      title: person.groupTitle,
      video: false,
      name: person.name,
      userId: person.userId,
      transport: "study",
      joinUrl: callLink(person.groupId, "voice"),
    });
  }

  function place() {
    if (normalized.emergency) {
      window.location.href = `tel:${normalized.national}`;
      return;
    }
    if (matched) {
      void start(matched, video);
      return;
    }
    if (number.trim() && !normalized.valid) {
      setNote(normalized.reason || "Enter a full 7 to 15 digit international phone number.");
      return;
    }
    if (normalized.valid && internet && !video) {
      void placeVoip(normalized.e164);
      return;
    }
    void startWorldCall(normalized.valid ? normalized.e164 : "", video);
  }

  async function placeVoip(to: string) {
    setNote(null);
    setMuted(false);
    setConnected(false);
    setSeconds(0);
    setPstnKeypad(false);
    try {
      const { Device } = await import("@twilio/voice-sdk");
      const minted = await voipToken();
      deviceRef.current?.destroy();
      const device = new Device(minted.token, { closeProtection: true });
      deviceRef.current = device;
      const call = await device.connect({ params: { To: to, CountryDial: selectedCountry.dial } });
      call.on("accept", () => setConnected(true));
      call.on("disconnect", () => setPstn(null));
      call.on("cancel", () => setPstn(null));
      call.on("error", (err: { message?: string }) => {
        setPstn(null);
        setNote(err?.message || "The call did not connect.");
      });
      setPstn({
        number: to,
        line: {
          hangup: () => call.disconnect(),
          mute: (on) => call.mute(on),
          sendDigits: (d) => call.sendDigits?.(d),
        },
      });
    } catch (caught) {
      setNote(caught instanceof Error ? caught.message : "Carrier call failed — opening WebRTC call instead.");
      void startWorldCall(to, video);
    }
  }

  function answer() {
    if (!ring || !user) return;
    const next = ring;
    setRing(null);
    void studyClearRing({ data: { id: next.id } });
    const person = people.find((row) => row.groupId === next.groupId);
    setLive({
      groupId: next.groupId,
      title: next.title,
      video,
      name: next.from,
      userId: person?.userId ?? "",
      transport: "study",
      joinUrl: callLink(next.groupId, video ? "video" : "voice"),
    });
  }

  function decline() {
    if (!ring) return;
    void studyClearRing({ data: { id: ring.id } });
    setRing(null);
  }

  const shown = matched?.name || (number ? formatInternationalDisplay(number, selectedCountry.dial) || number : "");

  if (ring && !live) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center bg-[#0c0c0c] px-6 py-8 text-zinc-100">
        <p className="text-sm text-zinc-400">Incoming call</p>
        <p className="mt-3 text-center text-3xl font-semibold tracking-tight">{ring.from}</p>
        <p className="mt-1 text-sm text-zinc-500">{ring.title}</p>
        <div className="mt-auto flex w-full max-w-xs items-end justify-between pb-6">
          <button type="button" onClick={decline} className="grid gap-2 justify-items-center text-xs text-zinc-300">
            <span className="grid size-16 place-items-center rounded-full bg-[#ff3b30] text-white">
              <PhoneOff className="size-7" />
            </span>
            Decline
          </button>
          <button type="button" onClick={answer} className="grid gap-2 justify-items-center text-xs text-zinc-300">
            <span className="grid size-16 place-items-center rounded-full bg-[#34c759] text-white">
              <Phone className="size-7" />
            </span>
            Accept
          </button>
        </div>
      </div>
    );
  }

  if (pstn) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center bg-[#0c0c0c] px-6 py-8 text-zinc-100">
        <p className="text-sm text-zinc-400">{connected ? clock(seconds) : "Calling…"}</p>
        <p className="mt-3 max-w-full truncate text-center text-3xl font-semibold tracking-tight">
          {formatInternationalDisplay(pstn.number)}
        </p>
        <p className="mt-1 text-sm text-zinc-500">Global Internet + Carrier PSTN Call</p>
        {pstnKeypad ? (
          <div className="mx-auto mt-6 grid w-full max-w-[16rem] grid-cols-3 gap-3">
            {KEYS.map(([key]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  playDtmf(key);
                  pstn.line.sendDigits?.(key);
                }}
                className="grid size-14 place-items-center justify-self-center rounded-full bg-white/10 text-xl font-medium hover:bg-white/20"
              >
                {key}
              </button>
            ))}
          </div>
        ) : null}
        <div className="mt-auto flex w-full max-w-xs items-end justify-between pb-6">
          <button type="button" onClick={() => setMuted((on) => !on)} className="grid gap-2 justify-items-center text-xs text-zinc-300">
            <span className={`grid size-14 place-items-center rounded-full ${muted ? "bg-white text-black" : "bg-white/10 text-white"}`}>
              {muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
            </span>
            {muted ? "Unmute" : "Mute"}
          </button>
          <button
            type="button"
            aria-label="End call"
            onClick={() => {
              pstn.line.hangup();
              setPstn(null);
            }}
            className="grid size-16 place-items-center rounded-full bg-[#ff3b30] text-white"
          >
            <PhoneOff className="size-7" />
          </button>
          <button type="button" onClick={() => setPstnKeypad((v) => !v)} className="grid gap-2 justify-items-center text-xs text-zinc-300">
            <span className={`grid size-14 place-items-center rounded-full text-sm font-semibold ${pstnKeypad ? "bg-white text-black" : "bg-white/10 text-white"}`}>
              #
            </span>
            Keypad
          </button>
        </div>
      </div>
    );
  }

  if (live) {
    const activeSelfId = live.transport === "world" ? worldPeerId : user?.id && !user.isDevFallback ? user.id : worldPeerId;
    const callerDisplayName = myPhoneProfile?.displayName || user?.displayName || "Noctis Caller";
    return (
      <div className="relative h-full min-h-0 bg-black">
        <StudyCall
          console={live.video || live.transport === "world"}
          groupId={live.groupId}
          title={live.name || live.title}
          selfId={activeSelfId}
          video={live.video}
          muted={muted}
          transport={live.transport}
          targetE164={live.targetE164}
          joinUrl={live.joinUrl}
          peerName={callerDisplayName}
          directRingId={live.directRingId}
          directRingName={live.directRingName}
          groupRingCount={live.groupRingCount}
          groupLabel={live.groupLabel}
          callActions={callActions}
          onAdd={() => setAdding(true)}
          onShare={() => shareCallLink(live.groupId, live.video ? "video" : "voice")}
          onRecorded={onRecorded}
          onClose={() => {
            const ids = [...new Set([...activeRingIdsRef.current, ...(live.directRingId ? [live.directRingId] : [])])];
            if (ids.length) {
              void fetch("/api/call-room", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ action: "cancel_rings", ringIds: ids }),
              }).catch(() => undefined);
            }
            activeRingIdsRef.current = [];
            setAdding(false);
            setLive(null);
            onClose();
          }}
        />
        {adding ? (
          <InviteSheet
            roomId={live.groupId}
            mode={live.video ? "video" : "voice"}
            transport={live.transport}
            defaultDial={selectedCountry.dial}
            callerPhone={myPhoneProfile?.phoneE164}
            callerName={callerDisplayName}
            contacts={contacts}
            groups={groups}
            people={user ? people.filter((person) => person.userId !== user.id) : []}
            onRingsAdded={(ids) => {
              activeRingIdsRef.current = [...new Set([...activeRingIdsRef.current, ...ids])];
            }}
            onClose={() => setAdding(false)}
          />
        ) : null}
      </div>
    );
  }

  if (join && !live) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 bg-[#0c0c0c] px-6 text-zinc-100">
        <p className="text-sm text-zinc-400">Connecting to your global internet call…</p>
      </div>
    );
  }

  const quickEntries: { phoneE164: string; label: string; isContact: boolean }[] = [
    ...contacts.map((c) => ({ phoneE164: c.phoneE164, label: c.name, isContact: true })),
    ...recents
      .filter((r) => !contacts.some((c) => c.phoneE164 === r.phoneE164))
      .slice(0, 6)
      .map((r) => ({ phoneE164: r.phoneE164, label: r.name, isContact: false })),
  ].slice(0, 8);

  return (
    <div
      onPaste={handlePaste}
      className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden text-zinc-100"
      style={{ background: "radial-gradient(120% 70% at 50% 18%, #4a3420 0%, #1a140f 46%, #0c0c0c 100%)" }}
    >
      <img src="/media/meet-loft.jpg" alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-80" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-black/20 to-black/70" />
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-between gap-2 px-4 py-3">
          <button type="button" onClick={onVibe} className="text-sm text-zinc-300 hover:text-white">
            Vibe
          </button>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link
              to="/connect"
              data-testid="vibe-connect-pill"
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/35 bg-emerald-500/15 px-3 py-1 text-[11px] font-medium text-emerald-200 backdrop-blur-sm transition hover:bg-emerald-500/25"
            >
              <MessageSquare className="size-3.5 text-emerald-400" />
              Vibe Connect
            </Link>
            <button
              type="button"
              data-testid="call-groups-trigger"
              onClick={() => {
                setPickerOpen(false);
                setInfoOpen(false);
                setMyPhoneOpen(false);
                setGroupsOpen((v) => !v);
              }}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium backdrop-blur-sm transition ${
                groupsOpen
                  ? "border-white bg-white text-black"
                  : "border-white/15 bg-black/45 text-zinc-200 hover:bg-black/65"
              }`}
            >
              <Users className="size-3.5" />
              Groups{groups.length ? ` (${groups.length})` : ""}
            </button>
            <button
              type="button"
              data-testid="my-number-trigger"
              onClick={() => {
                setPickerOpen(false);
                setInfoOpen(false);
                setGroupsOpen(false);
                if (!myPhoneInput && normalized.valid && normalized.e164) {
                  setMyPhoneInput(normalized.e164);
                }
                setMyPhoneOpen((v) => !v);
              }}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium backdrop-blur-sm transition ${
                myPhoneProfile
                  ? "border-emerald-400/35 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25"
                  : "border-[#e4b86a]/40 bg-black/50 text-[#e4b86a] hover:bg-black/70"
              }`}
            >
              <Smartphone className="size-3.5" />
              {myPhoneProfile ? `My Number: ${myPhoneProfile.phoneE164}` : "My Number ($0 Ring)"}
            </button>
            <button
              type="button"
              onClick={() => setInfoOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/45 px-3 py-1 text-[11px] font-medium text-zinc-200 backdrop-blur-sm hover:bg-black/65"
            >
              <Globe className="size-3.5 text-emerald-400" />
              {internet
                ? `Global PSTN + WebRTC (${voipDetails?.countriesSupported ?? WORLD_DIAL_CODES.length}+)`
                : `Free WebRTC · ${voipDetails?.countriesSupported ?? WORLD_DIAL_CODES.length}+ Countries`}
              <Info className="size-3 text-zinc-400" />
            </button>
            <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full text-zinc-300 hover:bg-white/10">
              <X className="size-4" />
            </button>
          </div>
        </div>

        {groupsOpen ? (
          <div
            data-testid="call-groups-drawer"
            className="mx-auto mb-2 max-h-[68vh] w-[min(27rem,calc(100%-2rem))] overflow-y-auto rounded-2xl border border-white/15 bg-[#12141a]/95 p-3.5 text-xs text-zinc-200 shadow-2xl backdrop-blur-md"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-white">Call Groups · Ring Everyone Simultaneously ($0)</p>
              <button type="button" onClick={() => setGroupsOpen(false)} aria-label="Close groups" className="text-zinc-400 hover:text-white">
                <X className="size-3.5" />
              </button>
            </div>
            <div className="mt-2.5 space-y-2 rounded-xl border border-white/10 bg-black/40 p-2.5">
              <input
                value={groupNameInput}
                onChange={(e) => setGroupNameInput(e.target.value)}
                placeholder="New group name (e.g. Family, Medical Team)"
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-xs text-white outline-none placeholder:text-zinc-500"
              />
              {contacts.length > 0 ? (
                <div>
                  <p className="mb-1 text-[10px] uppercase tracking-wider text-zinc-400">Tap contacts to include:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {contacts.map((c) => {
                      const picked = groupMembersDraft.some((m) => m.phoneE164 === c.phoneE164);
                      return (
                        <button
                          key={c.phoneE164}
                          type="button"
                          onClick={() => toggleContactInGroup(c)}
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition ${
                            picked
                              ? "border-emerald-400 bg-emerald-500/20 text-emerald-200"
                              : "border-white/15 bg-white/5 text-zinc-300 hover:bg-white/10"
                          }`}
                        >
                          {picked ? <Check className="size-3" /> : <Plus className="size-3" />}
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              <div className="flex gap-1.5">
                <input
                  value={groupPhoneDraft}
                  onChange={(e) => setGroupPhoneDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addMemberPhoneToGroup();
                    }
                  }}
                  placeholder={`Add phone (+${selectedCountry.dial} ...)`}
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-xs text-white outline-none placeholder:text-zinc-500"
                />
                <button
                  type="button"
                  onClick={addMemberPhoneToGroup}
                  className="shrink-0 rounded-lg bg-white/15 px-3 py-2 text-xs font-semibold text-white hover:bg-white/25"
                >
                  Add
                </button>
              </div>
              {groupMembersDraft.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {groupMembersDraft.map((m) => (
                    <span
                      key={m.phoneE164}
                      className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] text-zinc-100"
                    >
                      {m.name}
                      <button
                        type="button"
                        aria-label={`Remove ${m.name}`}
                        onClick={() => setGroupMembersDraft((prev) => prev.filter((x) => x.phoneE164 !== m.phoneE164))}
                        className="text-zinc-400 hover:text-white"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
              <button
                type="button"
                data-testid="save-call-group-btn"
                onClick={saveNewCallGroup}
                className="w-full rounded-xl bg-emerald-500 py-2 text-xs font-semibold text-black hover:bg-emerald-400"
              >
                Save Call Group ({groupMembersDraft.length})
              </button>
              {groupNote ? <p className="text-[11px] text-[#e4b86a]">{groupNote}</p> : null}
            </div>

            {groups.length > 0 ? (
              <div className="mt-3 space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-zinc-400">Saved Groups</p>
                {groups.map((grp) => (
                  <div key={grp.id} className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-white">{grp.name}</p>
                      <p className="truncate text-[11px] text-zinc-400">
                        {grp.members.length} members · {grp.members.map((m) => m.name).join(", ")}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        title="Voice Call Group"
                        aria-label={`Voice call ${grp.name}`}
                        onClick={() => void startGroupCall(grp, false)}
                        className="grid size-8 place-items-center rounded-full bg-[#34c759] text-white hover:brightness-105"
                      >
                        <Phone className="size-4" />
                      </button>
                      <button
                        type="button"
                        title="Video Call Group"
                        aria-label={`Video call ${grp.name}`}
                        onClick={() => void startGroupCall(grp, true)}
                        className="grid size-8 place-items-center rounded-full bg-white text-black hover:bg-zinc-200"
                      >
                        <Video className="size-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${grp.name}`}
                        onClick={() => setGroups(deleteWorldCallGroup(grp.id))}
                        className="grid size-8 place-items-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-rose-300"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {myPhoneOpen ? (
          <div
            data-testid="my-number-drawer"
            className="mx-auto mb-2 w-[min(25rem,calc(100%-2rem))] rounded-2xl border border-emerald-400/30 bg-[#12141a]/95 p-3 text-xs text-zinc-200 shadow-2xl backdrop-blur-md"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-white">Register This Device ($0 WhatsApp-Style)</p>
              <button
                type="button"
                onClick={() => setMyPhoneOpen(false)}
                aria-label="Close registration"
                className="text-zinc-400 hover:text-white"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <p className="mt-1 text-[11px] text-zinc-400">
              Save your phone number on this phone or laptop to receive free $0 Noctis rings (with background Web Push notifications).
            </p>
            <div className="mt-2.5 space-y-2">
              <input
                value={myNameInput}
                onChange={(e) => setMyNameInput(e.target.value)}
                placeholder="Your name (shown when calling)"
                className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-xs text-white outline-none placeholder:text-zinc-500"
              />
              <input
                value={myPhoneInput}
                onChange={(e) => setMyPhoneInput(e.target.value)}
                placeholder={`Phone e.g. +${selectedCountry.dial} ${selectedCountry.example}`}
                className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-xs text-white outline-none placeholder:text-zinc-500"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="save-my-number-btn"
                  disabled={myPhoneBusy}
                  onClick={() => void saveMyNumber()}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-black hover:bg-emerald-400 disabled:opacity-50"
                >
                  <Check className="size-3.5" />
                  {myPhoneBusy ? "Saving…" : "Save & Enable Ringing"}
                </button>
                <button
                  type="button"
                  onClick={() => void copySetupLink()}
                  className="inline-flex items-center gap-1 rounded-xl bg-white/10 px-2.5 py-2 text-[11px] text-zinc-200 hover:bg-white/20"
                  title="Copy 1-tap setup link for your phone"
                >
                  <Copy className="size-3.5" />
                  {copiedSetup ? "Copied" : "Phone link"}
                </button>
                {myPhoneProfile ? (
                  <button
                    type="button"
                    onClick={() => {
                      clearWorldPhoneProfile();
                      setMyPhoneProfile(null);
                      setMyPhoneNote("Removed this device from the Noctis directory.");
                    }}
                    className="rounded-xl bg-white/10 px-2.5 py-2 text-xs text-zinc-300 hover:bg-white/20"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
              {myPhoneNote ? <p className="text-[11px] text-emerald-300">{myPhoneNote}</p> : null}
            </div>
          </div>
        ) : null}

        {infoOpen ? (
          <div className="mx-auto mb-2 w-[min(26rem,calc(100%-2rem))] rounded-2xl border border-white/15 bg-[#121318]/95 p-3 text-xs text-zinc-300 shadow-xl backdrop-blur-md">
            <p className="font-semibold text-white">Worldwide $0 Internet Calling</p>
            <p className="mt-1 text-[11px] text-zinc-400">
              100% free WebRTC voice & video across all {voipDetails?.countriesSupported ?? WORLD_DIAL_CODES.length}+ countries. Register {"\"My Number\""} on any phone or laptop for direct WhatsApp-style ringing + background push notifications.
            </p>
            {internet ? (
              <p className="mt-1.5 text-[11px] text-emerald-300">
                Direct carrier cellular/landline gateway active (Caller ID {voipDetails?.callerIdMasked || "verified"}).
              </p>
            ) : (
              <p className="mt-1.5 text-[11px] text-[#e4b86a]">
                Optional SIM/landline PSTN carrier calling requires Twilio ({voipDetails?.missing?.join(", ") || "TWILIO_*"} in Vercel). Internet calls cost $0 forever.
              </p>
            )}
          </div>
        ) : null}

        <div className="relative mx-auto flex shrink-0 items-center justify-center gap-2 px-4 pt-1">
          <button
            type="button"
            data-testid="world-country-picker-trigger"
            onClick={() => setPickerOpen((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/50 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur-md hover:bg-black/70"
          >
            <span className="text-base leading-none">{selectedCountry.flag}</span>
            <span>{selectedCountry.name}</span>
            <span className="text-zinc-300">+{selectedCountry.dial}</span>
            <ChevronDown className="size-3.5 text-zinc-400" />
          </button>
          <button
            type="button"
            onClick={() => press("+")}
            aria-label="Insert international plus prefix"
            className="rounded-full border border-white/15 bg-black/50 px-2.5 py-1.5 text-xs font-semibold text-zinc-200 backdrop-blur-md hover:bg-black/70"
          >
            +
          </button>
        </div>

        {pickerOpen ? (
          <div className="mx-auto mt-2 w-[min(22rem,calc(100%-2rem))] rounded-2xl border border-white/15 bg-[#121318]/95 p-2 shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-2 rounded-xl bg-black/50 px-3 py-2">
              <Search className="size-3.5 text-zinc-400" />
              <input
                value={countryQuery}
                onChange={(event) => setCountryQuery(event.target.value)}
                placeholder="Search country, ISO (GH, GB, IN), or +code"
                autoFocus
                className="w-full bg-transparent text-xs text-white outline-none placeholder:text-zinc-500"
              />
            </div>
            <div className="mt-1.5 max-h-48 overflow-y-auto">
              {filteredCountries.slice(0, 60).map((c) => (
                <button
                  key={`${c.iso}-${c.dial}`}
                  type="button"
                  onClick={() => {
                    setCountryIso(c.iso);
                    setPickerOpen(false);
                    setCountryQuery("");
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs hover:bg-white/10 ${
                    c.iso === selectedCountry.iso ? "bg-white/10 text-white" : "text-zinc-200"
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span className="text-base leading-none">{c.flag}</span>
                    <span className="truncate">{c.name}</span>
                    <span className="text-[10px] text-zinc-400">{c.iso}</span>
                  </span>
                  <span className="shrink-0 font-mono text-zinc-300">+{c.dial}</span>
                </button>
              ))}
              {filteredCountries.length === 0 ? (
                <p className="px-3 py-2 text-xs text-zinc-500">No matching country.</p>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="flex min-h-[4.25rem] shrink-0 flex-col items-center justify-end px-6">
          <p className="max-w-full truncate text-center text-3xl font-light tracking-wide sm:text-4xl">{shown || " "}</p>
          {matched ? (
            <p className="mt-1 text-xs text-emerald-300">In the app · {matched.groupTitle}</p>
          ) : normalized.emergency ? (
            <p className="mt-1 text-xs text-amber-300">Emergency service · opens device dialer</p>
          ) : number ? (
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
              {dirLookup && dirLookup.e164 === normalized.e164 && dirLookup.registered ? (
                <p className="text-xs font-medium text-emerald-300">
                  On Noctis ({dirLookup.displayName}){dirLookup.online ? " · Online" : dirLookup.pushReady ? " · Push Ready" : ""} · Free Direct Ring ($0)
                </p>
              ) : (
                <p className="text-xs text-zinc-300">
                  {normalized.country?.flag ?? selectedCountry.flag}{" "}
                  {normalized.country?.name ?? selectedCountry.name}
                  {normalized.valid ? ` · Ready (${normalized.e164} · $0 Link Call)` : " · Enter 7–15 digits"}
                </p>
              )}
              {normalized.valid && !savedContactMatch ? (
                <button
                  type="button"
                  data-testid="add-speed-contact-btn"
                  onClick={() => {
                    setContactNameInput(dirLookup?.displayName || "");
                    setSavingContact((v) => !v);
                  }}
                  className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-100 hover:bg-white/25"
                >
                  <BookmarkPlus className="size-3" />
                  Save contact
                </button>
              ) : null}
            </div>
          ) : (
            <p className="mt-1 text-[11px] text-zinc-400">
              Hold 0 for + · Example: +{selectedCountry.dial} {selectedCountry.example}
            </p>
          )}
          {savingContact && normalized.valid ? (
            <div className="mt-2 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/70 px-3 py-1 backdrop-blur-md">
              <input
                value={contactNameInput}
                onChange={(e) => setContactNameInput(e.target.value)}
                placeholder="Contact name"
                autoFocus
                className="w-32 bg-transparent text-xs text-white outline-none placeholder:text-zinc-500"
              />
              <button
                type="button"
                data-testid="confirm-save-contact-btn"
                onClick={handleSaveSpeedContact}
                className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-[11px] font-semibold text-black hover:bg-emerald-400"
              >
                Save
              </button>
            </div>
          ) : null}
          {note ? <p className="mt-1 text-center text-xs text-[#e4b86a]">{note}</p> : null}
        </div>

        {groups.length > 0 || quickEntries.length > 0 ? (
          <div data-testid="speed-dial-strip" className="mx-auto mt-2 flex max-w-md shrink-0 flex-wrap items-center justify-center gap-1.5 px-4">
            {groups.map((grp) => (
              <button
                key={grp.id}
                type="button"
                onClick={() => void startGroupCall(grp, video)}
                className="inline-flex items-center gap-1 rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-emerald-200 backdrop-blur-sm hover:bg-emerald-500/25"
              >
                <Users className="size-3" />
                {grp.name} ({grp.members.length})
              </button>
            ))}
            {quickEntries.map((item) => (
              <div key={item.phoneE164} className="inline-flex items-center rounded-full border border-white/15 bg-black/50 pl-2.5 pr-1.5 py-1 text-[11px] text-zinc-200 backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => {
                    setNote(null);
                    setNumber(item.phoneE164);
                  }}
                  className="hover:text-white"
                >
                  {item.label}
                </button>
                {item.isContact ? (
                  <button
                    type="button"
                    aria-label={`Remove ${item.label}`}
                    onClick={() => setContacts(removeWorldContact(item.phoneE164))}
                    className="ml-1.5 text-zinc-500 hover:text-zinc-200"
                  >
                    <X className="size-3" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {people.length ? (
          <div className="mt-2 flex shrink-0 gap-3 overflow-x-auto px-4 pb-1">
            {people.map((person) => (
              <button
                key={person.userId}
                type="button"
                onClick={() => void start(person, video)}
                className="flex w-16 shrink-0 flex-col items-center gap-1"
              >
                <span className="grid size-12 place-items-center rounded-full bg-white/10 text-sm font-semibold">
                  {person.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="w-full truncate text-center text-[11px] text-zinc-400">{person.name.split(" ")[0]}</span>
              </button>
            ))}
          </div>
        ) : null}

        {video ? (
          <button
            type="button"
            onClick={() => void startRoom()}
            className="mx-auto mt-3 inline-flex shrink-0 items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-zinc-100 backdrop-blur-sm hover:bg-white/20"
          >
            <Link2 className="size-4" />
            Start a global call and send a link
          </button>
        ) : null}

        <div className="mx-auto mt-auto grid w-full max-w-xs shrink-0 grid-cols-3 gap-x-6 gap-y-3 px-4 pt-4">
          {KEYS.map(([key, letters]) => (
            <button
              key={key}
              type="button"
              onPointerDown={key === "0" ? handleZeroDown : undefined}
              onPointerUp={key === "0" ? handleZeroUp : undefined}
              onPointerLeave={key === "0" ? handleZeroUp : undefined}
              onClick={() => {
                if (key === "0" && zeroHeldPlus.current) {
                  zeroHeldPlus.current = false;
                  return;
                }
                press(key);
              }}
              className="flex h-[4.25rem] flex-col items-center justify-center rounded-full bg-black/45 backdrop-blur-sm active:bg-black/60"
            >
              <span className="text-2xl leading-none">{key}</span>
              <span className="mt-0.5 h-3 text-[9px] tracking-[0.18em] text-zinc-400">{letters}</span>
            </button>
          ))}
        </div>

        <div className="mx-auto grid w-full max-w-xs shrink-0 grid-cols-3 items-center gap-x-6 px-4 py-5">
          <button
            type="button"
            onClick={() => setVideo((on) => !on)}
            aria-label={video ? "Switch to Voice call" : "Switch to Video call"}
            className={`grid size-14 place-items-center justify-self-center rounded-full ${video ? "bg-white text-black" : "bg-white/10 text-zinc-100"}`}
          >
            <Video className="size-5" />
          </button>
          <button
            type="button"
            onClick={place}
            aria-label="Call"
            data-testid="world-dial-call-button"
            className="grid size-16 place-items-center justify-self-center rounded-full bg-[#34c759] text-white hover:brightness-105"
          >
            <Phone className="size-7" />
          </button>
          <button
            type="button"
            onClick={() => setNumber((now) => now.slice(0, -1))}
            aria-label="Delete"
            className="grid size-14 place-items-center justify-self-center text-zinc-200 disabled:opacity-0"
            disabled={!number}
          >
            <Delete className="size-6" />
          </button>
        </div>
      </div>
    </div>
  );
}

function InviteSheet({
  roomId,
  mode,
  transport,
  defaultDial,
  callerPhone,
  callerName,
  contacts,
  groups,
  people,
  onRingsAdded,
  onClose,
}: {
  roomId: string;
  mode: "voice" | "video";
  transport: "study" | "world";
  defaultDial: string;
  callerPhone?: string;
  callerName: string;
  contacts: WorldContact[];
  groups: WorldCallGroup[];
  people: Person[];
  onRingsAdded?: (ringIds: number[]) => void;
  onClose: () => void;
}) {
  const [note, setNote] = useState<string | null>(null);
  const [phoneDraft, setPhoneDraft] = useState("");
  const [busyPhone, setBusyPhone] = useState<string | null>(null);
  const [unregE164, setUnregE164] = useState<string | null>(null);
  const link = callLink(roomId, mode);

  async function ringNumber(rawPhone: string, label?: string) {
    const norm = normalizeWorldE164(rawPhone, defaultDial);
    if (!norm.valid || !norm.e164) {
      setNote("Enter a valid international phone number (7–15 digits).");
      return;
    }
    if (transport === "study") {
      setUnregE164(norm.e164);
      setNote(`Share the meeting link with ${label || norm.e164} below.`);
      return;
    }
    setBusyPhone(norm.e164);
    setNote(null);
    setUnregE164(null);
    try {
      const lookRes = await fetch(`/api/call-room?lookup=${encodeURIComponent(norm.e164)}`);
      const hit = (lookRes.ok ? await lookRes.json() : null) as { registered?: boolean; displayName?: string } | null;
      if (hit?.registered) {
        const ringRes = await fetch("/api/call-room", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "ring_phone",
            roomId,
            fromPhoneE164: callerPhone,
            fromName: callerName,
            toPhoneE164: norm.e164,
            mode,
          }),
        });
        const ringJson = (await ringRes.json()) as { ok?: boolean; ringId?: number; toDisplayName?: string; error?: string };
        if (ringRes.ok && ringJson.ok && ringJson.ringId) {
          onRingsAdded?.([ringJson.ringId]);
          setNote(`Ringing ${ringJson.toDisplayName || label || norm.e164} into this call ($0)!`);
          setPhoneDraft("");
          return;
        }
      }
      setUnregE164(norm.e164);
      setNote(`${norm.e164} is not registered on Noctis yet — send them the link below via WhatsApp or SMS.`);
    } catch {
      setNote("Could not ring right now — share the join link below.");
    } finally {
      setBusyPhone(null);
    }
  }

  async function ringGroupIntoCall(grp: WorldCallGroup) {
    if (transport === "study") {
      void shareCallLink(roomId, mode).then(() => setNote(`Copied link to invite ${grp.name}.`));
      return;
    }
    setBusyPhone(grp.id);
    setNote(null);
    try {
      const res = await fetch("/api/call-room", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "ring_group",
          roomId,
          groupName: grp.name,
          fromPhoneE164: callerPhone,
          fromName: callerName,
          memberPhones: grp.members.map((m) => m.phoneE164),
          mode,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        rung?: { ringId: number; displayName: string }[];
        notRegistered?: string[];
      };
      const ids = (json.rung ?? []).map((r) => r.ringId);
      if (ids.length) onRingsAdded?.(ids);
      setNote(
        ids.length
          ? `Ringing ${ids.length} in "${grp.name}" (${json.notRegistered?.length ? `${json.notRegistered.length} via link` : "all direct"}).`
          : `No members in "${grp.name}" registered yet — copy or WhatsApp the call link.`,
      );
    } catch {
      setNote("Could not ring group — share the join link below.");
    } finally {
      setBusyPhone(null);
    }
  }

  return (
    <div data-testid="in-call-add-people-sheet" className="absolute inset-0 z-30 flex flex-col bg-[#0c0c0c] text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <p className="text-sm font-semibold">Add people to this call</p>
          <p className="text-[11px] text-zinc-400">Ring anyone worldwide ($0) or share join link</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full text-zinc-400 hover:bg-white/10">
          <X className="size-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-3">
        <button
          type="button"
          onClick={() => {
            void shareCallLink(roomId, mode).then((result) => {
              if (result === "copied") setNote("Call link copied. Send to anyone worldwide.");
              if (result === "failed") setNote(link);
            });
          }}
          className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black hover:bg-zinc-200"
        >
          <Link2 className="size-3.5" />
          Copy link
        </button>
        <a
          href={buildWhatsAppCallInviteUrl("", link, callerName)}
          target="_blank"
          rel="noreferrer"
          style={{ backgroundColor: "#25D366", color: "#07140c" }}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold hover:opacity-90"
        >
          <Share2 className="size-3.5" />
          WhatsApp
        </a>
        <a
          href={buildSmsCallInviteUrl("", link)}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
        >
          <MessageSquare className="size-3.5" />
          SMS
        </a>
      </div>

      <div className="border-b border-white/10 px-4 py-3">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Add by phone number</p>
        <div className="flex gap-2">
          <input
            value={phoneDraft}
            onChange={(e) => setPhoneDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void ringNumber(phoneDraft);
              }
            }}
            placeholder={`Enter number (e.g. +${defaultDial} ...)`}
            className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white outline-none placeholder:text-zinc-500"
          />
          <button
            type="button"
            disabled={!phoneDraft.trim() || busyPhone !== null}
            onClick={() => void ringNumber(phoneDraft)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-black hover:bg-emerald-400 disabled:opacity-50"
          >
            <UserPlus className="size-3.5" />
            Ring
          </button>
        </div>
        {unregE164 ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <a
              href={buildWhatsAppCallInviteUrl(unregE164, link, callerName)}
              target="_blank"
              rel="noreferrer"
              style={{ backgroundColor: "#25D366", color: "#07140c" }}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold"
            >
              WhatsApp {unregE164}
            </a>
            <a
              href={buildSmsCallInviteUrl(unregE164, link)}
              className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white"
            >
              SMS {unregE164}
            </a>
          </div>
        ) : null}
      </div>

      {note ? <p className="px-4 pt-3 text-xs font-medium text-[#e4b86a]">{note}</p> : null}

      <div className="mt-2 min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-6">
        {groups.length > 0 ? (
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Call Groups (Ring All at Once)</p>
            <div className="space-y-1.5">
              {groups.map((grp) => (
                <button
                  key={grp.id}
                  type="button"
                  disabled={busyPhone !== null}
                  onClick={() => void ringGroupIntoCall(grp)}
                  className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-3 text-left hover:bg-emerald-500/20 disabled:opacity-50"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{grp.name}</span>
                    <span className="block truncate text-[11px] text-zinc-400">{grp.members.map((m) => m.name).join(", ")}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-semibold text-black">
                    Ring All
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {contacts.length > 0 ? (
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Saved Contacts</p>
            <div className="space-y-1">
              {contacts.map((c) => (
                <button
                  key={c.phoneE164}
                  type="button"
                  disabled={busyPhone !== null}
                  onClick={() => void ringNumber(c.phoneE164, c.name)}
                  className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 text-left hover:bg-white/10 disabled:opacity-50"
                >
                  <span className="grid size-9 place-items-center rounded-full bg-white/10 text-xs font-semibold">
                    {c.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{c.name}</span>
                    <span className="block truncate text-[11px] text-zinc-400">{c.phoneE164}</span>
                  </span>
                  <span className="text-xs font-semibold text-emerald-300">Ring</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {people.length > 0 ? (
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">App Members</p>
            <div className="space-y-1">
              {people.map((person) => (
                <button
                  key={person.userId}
                  type="button"
                  onClick={() => {
                    void studyInvite({ data: { groupId: roomId, to: person.userId } })
                      .then(() => setNote(`Calling ${person.name}`))
                      .catch((caught: unknown) => setNote(caught instanceof Error ? caught.message : "Could not add them"));
                  }}
                  className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 text-left hover:bg-white/10"
                >
                  <span className="grid size-9 place-items-center rounded-full bg-white/10 text-xs font-semibold">
                    {person.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">{person.name}</span>
                  <span className="text-xs text-zinc-400">Add</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function callLink(groupId: string, mode: "voice" | "video" = "video") {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/noctis?join=${groupId}&mode=${mode}`;
}

async function shareCallLink(groupId: string, mode: "voice" | "video" = "video") {
  const link = callLink(groupId, mode);
  try {
    await navigator.clipboard.writeText(link);
    return "copied" as const;
  } catch {
    return "failed" as const;
  }
}
