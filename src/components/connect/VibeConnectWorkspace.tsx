import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Briefcase,
  Lock,
  MessageSquare,
  Phone,
  Plus,
  Radio,
  Search,
  Shield,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { generateIdentityKeyPair } from "@/lib/vibe-connect-crypto";
import {
  DEFAULT_VIBE_CONNECT_FLAGS,
  loadLocalVibeConnectFlags,
  mergeVibeConnectFlags,
  type VibeConnectFeatureFlags,
} from "@/lib/vibe-connect-flags";
import { filterThreadsByTab, type ThreadFilterTab } from "@/lib/vibe-connect-helpers";
import { getOrCreateWorldDeviceId, getSavedWorldPhoneProfile } from "@/lib/world-call-client";
import { ChatConversationPane } from "./ChatConversationPane";
import {
  ConnectBusinessPanel,
  ConnectCallsPanel,
  ConnectCommunitiesChannelsPanel,
  ConnectSecurityAdminPanel,
  ConnectStatusPanel,
} from "./ConnectEcosystemPanels";
import {
  connectGet,
  connectPost,
  type ConnectBusiness,
  type ConnectCallRecord,
  type ConnectChannel,
  type ConnectCommunity,
  type ConnectDevice,
  type ConnectOrder,
  type ConnectProduct,
  type ConnectProfile,
  type ConnectStatusItem,
  type ConnectThread,
} from "./types";

type NavTab = "chats" | "calls" | "status" | "communities" | "business";

const E2EE_KEYS_STORAGE = "vibe_connect_e2ee_keys_v1";
const ACTOR_FALLBACK_KEY = "vibe_connect_actor_id_v1";

export function VibeConnectWorkspace({ initialInviteCode = "" }: { initialInviteCode?: string }) {
  const { user } = useCurrentUserState();
  const [actorId, setActorId] = useState<string>("");
  const [actorPhone, setActorPhone] = useState<string>("");
  const [actorNameOverride, setActorNameOverride] = useState<string>("");
  const actorName = actorNameOverride || user?.displayName || "Vibe User";

  const [keys, setKeys] = useState<{ publicKeyJwk: string; privateKeyJwk: string }>({
    publicKeyJwk: "",
    privateKeyJwk: "",
  });
  const [navTab, setNavTab] = useState<NavTab>("chats");
  const [filterTab, setFilterTab] = useState<ThreadFilterTab>("all");
  const [threadSearch, setThreadSearch] = useState("");
  const [toast, setToast] = useState("");

  const [flags, setFlags] = useState<VibeConnectFeatureFlags>(() => ({ ...DEFAULT_VIBE_CONNECT_FLAGS }));
  const [profile, setProfile] = useState<ConnectProfile | null>(null);
  const [threads, setThreads] = useState<ConnectThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>("");
  const [directory, setDirectory] = useState<ConnectProfile[]>([]);
  const [statuses, setStatuses] = useState<ConnectStatusItem[]>([]);
  const [communities, setCommunities] = useState<ConnectCommunity[]>([]);
  const [channels, setChannels] = useState<ConnectChannel[]>([]);
  const [businesses, setBusinesses] = useState<ConnectBusiness[]>([]);
  const [products, setProducts] = useState<ConnectProduct[]>([]);
  const [orders, setOrders] = useState<ConnectOrder[]>([]);
  const [callHistory, setCallHistory] = useState<ConnectCallRecord[]>([]);
  const [devices, setDevices] = useState<ConnectDevice[]>([]);
  const [blocks, setBlocks] = useState<{ blockedId: string; createdAt: string }[]>([]);

  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatMode, setNewChatMode] = useState<"direct" | "group" | "business">("direct");
  const [newTitle, setNewTitle] = useState("");
  const [newMemberId, setNewMemberId] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 3200);
  };

  // Hydrate browser identity deterministically on mount (zero SSR hydration mismatch)
  useEffect(() => {
    setFlags(loadLocalVibeConnectFlags());
    const savedProfile = getSavedWorldPhoneProfile();
    if (savedProfile?.displayName) setActorNameOverride(savedProfile.displayName);
    if (savedProfile?.phoneE164) {
      setActorPhone(savedProfile.phoneE164);
      setActorId(savedProfile.phoneE164);
      return;
    }
    const stored = window.localStorage.getItem(ACTOR_FALLBACK_KEY)?.trim();
    if (stored) {
      setActorId(stored);
      return;
    }
    const dev = getOrCreateWorldDeviceId();
    try {
      window.localStorage.setItem(ACTOR_FALLBACK_KEY, dev);
    } catch {
      /* ignore */
    }
    setActorId(dev);
  }, []);

  // Auto-generate E2EE keypair & register Vibe Connect identity once actorId resolves
  useEffect(() => {
    if (!actorId) return;
    let cancelled = false;
    async function init() {
      let pair: { publicKeyJwk: string; privateKeyJwk: string } | null = null;
      try {
        const raw = window.localStorage.getItem(E2EE_KEYS_STORAGE);
        if (raw) pair = JSON.parse(raw) as { publicKeyJwk: string; privateKeyJwk: string };
      } catch {
        /* regenerate */
      }
      if (!pair?.publicKeyJwk || !pair?.privateKeyJwk) {
        pair = await generateIdentityKeyPair();
        try {
          window.localStorage.setItem(E2EE_KEYS_STORAGE, JSON.stringify(pair));
        } catch {
          /* ignore */
        }
      }
      if (cancelled) return;
      setKeys(pair);

      const reg = await connectPost<{ profile: ConnectProfile; selfThreadId: string }>({
        action: "register_profile",
        actorId,
        phoneE164: actorPhone,
        displayName: actorName,
        publicKeyJwk: pair.publicKeyJwk,
        deviceId: getOrCreateWorldDeviceId(),
        deviceLabel: typeof navigator !== "undefined" ? navigator.platform || "Web Browser" : "Web Browser",
      });
      if (cancelled) return;
      setProfile(reg.profile);

      if (initialInviteCode) {
        await connectPost({ action: "join_invite", inviteCode: initialInviteCode, actorId }).catch(() => undefined);
      }

      await refreshAll(reg.selfThreadId);
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, [actorId]);

  async function refreshAll(preferThreadId?: string) {
    if (!actorId) return;
    try {
      const data = await connectGet<{
        flags: VibeConnectFeatureFlags;
        threads: ConnectThread[];
        statuses: ConnectStatusItem[];
        communities: ConnectCommunity[];
        channels: ConnectChannel[];
        businesses: ConnectBusiness[];
        products: ConnectProduct[];
        orders: ConnectOrder[];
        callHistory: ConnectCallRecord[];
        directory: ConnectProfile[];
        devices: ConnectDevice[];
        blocks: { blockedId: string; createdAt: string }[];
      }>(`action=bootstrap&actorId=${encodeURIComponent(actorId)}&phoneE164=${encodeURIComponent(actorPhone)}`);
      setFlags(mergeVibeConnectFlags(DEFAULT_VIBE_CONNECT_FLAGS, data.flags as unknown as Record<string, boolean>));
      setThreads(data.threads ?? []);
      setStatuses(data.statuses ?? []);
      setCommunities(data.communities ?? []);
      setChannels(data.channels ?? []);
      setBusinesses(data.businesses ?? []);
      setProducts(data.products ?? []);
      setOrders(data.orders ?? []);
      setCallHistory(data.callHistory ?? []);
      setDirectory(data.directory ?? []);
      setDevices(data.devices ?? []);
      setBlocks(data.blocks ?? []);
      if (preferThreadId) {
        setActiveThreadId(preferThreadId);
      } else if (!activeThreadId && data.threads?.length) {
        setActiveThreadId(data.threads[0]!.id);
      }
    } catch {
      /* next refresh retries */
    }
  }

  useEffect(() => {
    if (!actorId) return;
    const timer = window.setInterval(() => void refreshAll(), 6000);
    return () => window.clearInterval(timer);
  }, [actorId, activeThreadId]);

  const filteredThreads = filterThreadsByTab(threads, filterTab, threadSearch);
  const activeThread = threads.find((t) => t.id === activeThreadId) ?? null;

  return (
    <div data-testid="vibe-connect-workspace" className="flex h-dvh w-full flex-col overflow-hidden bg-[#090d10] text-zinc-100">
      {/* Compact Ecosystem Top Bar */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#0d1418] px-4 py-2">
        <div className="flex items-center gap-3">
          <Link
            to="/noctis"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-200 hover:bg-white/10"
          >
            <ArrowLeft className="size-3.5" />
            Noctis
          </Link>
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-emerald-500 text-xs font-bold text-black">VC</span>
            <div>
              <p className="text-sm font-semibold leading-tight text-white">Vibe Connect</p>
              <p className="text-[10px] text-emerald-300">Encrypted Communication Engine · $0</p>
            </div>
          </div>
        </div>

        {/* Reusable Engine Ecosystem Pills */}
        <div className="hidden items-center gap-1.5 text-[11px] md:flex">
          <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-0.5 text-emerald-200">Vibe</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-zinc-300">Desk Note</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-zinc-300">ConnectLn</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-[#e4b86a]/30 bg-[#e4b86a]/10 px-2.5 py-0.5 text-[#e4b86a]">
            <Sparkles className="size-3" /> Noctis AI
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="hidden text-zinc-400 sm:inline">
            {profile?.username || actorPhone || actorName}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] text-emerald-300">
            <Lock className="size-3" /> E2EE Active
          </span>
        </div>
      </header>

      {toast ? (
        <div className="fixed right-4 bottom-4 z-50 rounded-xl border border-emerald-400/40 bg-[#101c1a] px-4 py-2 text-xs font-medium text-emerald-200 shadow-2xl">
          {toast}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left Navigation Rail */}
        <nav className="flex w-16 shrink-0 flex-col items-center gap-2 border-r border-white/10 bg-[#0d1418] py-3">
          {[
            { id: "chats" as const, icon: MessageSquare, label: "Chats" },
            { id: "calls" as const, icon: Phone, label: "Calls" },
            { id: "status" as const, icon: Radio, label: "Status" },
            { id: "communities" as const, icon: Users, label: "Groups" },
            { id: "business" as const, icon: Briefcase, label: "Biz & Sec" },
          ].map((item) => {
            const Icon = item.icon;
            const active = navTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                data-testid={`vc-nav-${item.id}`}
                onClick={() => setNavTab(item.id)}
                className={`flex w-12 flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-medium transition ${
                  active ? "bg-emerald-500/20 text-emerald-300" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                }`}
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Active View */}
        {navTab === "chats" ? (
          <div className="flex min-h-0 flex-1 overflow-hidden">
            {/* Thread List Sidebar */}
            <aside className="flex w-80 shrink-0 flex-col border-r border-white/10 bg-[#0b1115]">
              <div className="space-y-2 border-b border-white/10 p-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-white">Conversations</h2>
                  <button
                    type="button"
                    data-testid="vc-new-chat-btn"
                    onClick={() => setNewChatOpen(true)}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1 text-[11px] font-semibold text-black hover:bg-emerald-400"
                  >
                    <Plus className="size-3.5" /> New
                  </button>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/45 px-2.5 py-1.5">
                  <Search className="size-3.5 text-zinc-400" />
                  <input
                    value={threadSearch}
                    onChange={(e) => setThreadSearch(e.target.value)}
                    placeholder="Search chats..."
                    className="flex-1 bg-transparent text-xs text-white outline-none placeholder:text-zinc-500"
                  />
                </div>
                <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
                  {(["all", "unread", "favorites", "groups", "business", "archived"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setFilterTab(tab)}
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium capitalize ${
                        filterTab === tab ? "bg-emerald-500 text-black font-semibold" : "bg-white/5 text-zinc-300 hover:bg-white/10"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="min-h-0 flex-1 divide-y divide-white/5 overflow-y-auto">
                {filteredThreads.map((t) => {
                  const selected = t.id === activeThreadId;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveThreadId(t.id)}
                      className={`flex w-full items-center gap-3 px-3.5 py-3 text-left transition ${
                        selected ? "bg-emerald-500/15" : "hover:bg-white/5"
                      }`}
                    >
                      <div className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-300">
                        {t.title.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate text-xs font-semibold text-white">{t.title}</span>
                          {t.unreadCount > 0 ? (
                            <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-black">
                              {t.unreadCount}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-zinc-400">
                          {t.lastMessagePreview || `${t.kind.replace("_", " ")} · End-to-end ready`}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            <ChatConversationPane
              actorId={actorId}
              actorName={actorName}
              actorPhone={actorPhone}
              myPublicKeyJwk={keys.publicKeyJwk}
              myPrivateKeyJwk={keys.privateKeyJwk}
              thread={activeThread}
              allThreads={threads}
              directory={directory}
              flags={flags}
              onThreadUpdated={() => void refreshAll()}
              onToast={showToast}
            />
          </div>
        ) : navTab === "calls" ? (
          <ConnectCallsPanel actorName={actorName} callHistory={callHistory} onToast={showToast} />
        ) : navTab === "status" ? (
          <ConnectStatusPanel
            actorId={actorId}
            actorName={actorName}
            statuses={statuses}
            onRefresh={() => void refreshAll()}
            onToast={showToast}
          />
        ) : navTab === "communities" ? (
          <ConnectCommunitiesChannelsPanel
            actorId={actorId}
            actorName={actorName}
            communities={communities}
            channels={channels}
            onOpenThread={(tid) => {
              setActiveThreadId(tid);
              setNavTab("chats");
            }}
            onRefresh={() => void refreshAll()}
            onToast={showToast}
          />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {flags.businessWorkspace ? (
              <ConnectBusinessPanel
                actorId={actorId}
                actorName={actorName}
                businesses={businesses}
                products={products}
                orders={orders}
                onRefresh={() => void refreshAll()}
                onToast={showToast}
              />
            ) : null}
            <ConnectSecurityAdminPanel
              actorId={actorId}
              profile={profile}
              devices={devices}
              blocks={blocks}
              flags={flags}
              onFlagsChange={setFlags}
              onRefresh={() => void refreshAll()}
              onToast={showToast}
            />
          </div>
        )}
      </div>

      {/* New Chat / Group Modal */}
      {newChatOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4">
          <div className="w-full max-w-sm space-y-3 rounded-2xl border border-white/15 bg-[#11181c] p-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">Start New Encrypted Conversation</span>
              <button type="button" onClick={() => setNewChatOpen(false)}>
                <X className="size-4" />
              </button>
            </div>
            <div className="flex gap-1.5">
              {(["direct", "group", "business"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setNewChatMode(m)}
                  className={`flex-1 rounded-lg py-1.5 capitalize ${newChatMode === m ? "bg-emerald-500 font-semibold text-black" : "bg-white/10 text-zinc-200"}`}
                >
                  {m}
                </button>
              ))}
            </div>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={newChatMode === "direct" ? "Contact name or title..." : "Group or Business chat title..."}
              className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-white outline-none"
            />
            <input
              value={newMemberId}
              onChange={(e) => setNewMemberId(e.target.value)}
              placeholder="Recipient phone (+1240...) or @handle (optional)"
              className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-white outline-none"
            />
            {directory.filter((d) => d.actorId !== actorId).length > 0 ? (
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-zinc-400">Or pick registered user:</p>
                <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto">
                  {directory
                    .filter((d) => d.actorId !== actorId)
                    .slice(0, 8)
                    .map((d) => (
                      <button
                        key={d.actorId}
                        type="button"
                        onClick={() => {
                          setNewMemberId(d.actorId);
                          if (!newTitle) setNewTitle(d.displayName);
                        }}
                        className="rounded-lg bg-white/10 px-2 py-1 text-[11px] hover:bg-emerald-500/20"
                      >
                        {d.displayName} {d.username || d.phoneE164}
                      </button>
                    ))}
                </div>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() =>
                void connectPost<{ thread: ConnectThread }>({
                  action: "create_thread",
                  kind: newChatMode,
                  title: newTitle.trim() || newMemberId.trim() || "New Conversation",
                  createdBy: actorId,
                  members: newMemberId.trim() ? [newMemberId.trim()] : [],
                }).then((res) => {
                  setNewChatOpen(false);
                  setNewTitle("");
                  setNewMemberId("");
                  void refreshAll(res.thread.id);
                })
              }
              className="w-full rounded-xl bg-emerald-500 py-2 font-semibold text-black hover:bg-emerald-400"
            >
              Create Encrypted Thread
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
