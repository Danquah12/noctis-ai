import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import QRCode from "qrcode";
import {
  Activity,
  BadgeCheck,
  Briefcase,
  Check,
  Copy,
  Download,
  Eye,
  Heart,
  Laptop,
  Link2,
  Phone,
  Plus,
  QrCode,
  Radio,
  Shield,
  ShoppingBag,
  Sparkles,
  Trash2,
  Upload,
  Users,
  Video,
} from "lucide-react";
import { packEncryptedBackup, unpackEncryptedBackup } from "@/lib/vibe-connect-crypto";
import {
  VIBE_CONNECT_FLAG_META,
  saveLocalVibeConnectFlags,
  type VibeConnectFeatureFlags,
} from "@/lib/vibe-connect-flags";
import {
  createTabPeerId,
  getSilenceUnknownCallers,
  setSilenceUnknownCallers,
} from "@/lib/world-call-client";
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
} from "./types";

export function ConnectCallsPanel({
  actorName,
  callHistory,
  onToast,
}: {
  actorName: string;
  callHistory: ConnectCallRecord[];
  onToast: (msg: string) => void;
}) {
  const navigate = useNavigate();
  const [generatedLink, setGeneratedLink] = useState("");

  async function createCallLink(mode: "voice" | "video") {
    try {
      const res = await fetch("/api/call-room", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "create",
          title: `${actorName}'s Call Link`,
          mode,
          hostPeerId: createTabPeerId(),
          hostName: actorName,
        }),
      }).then((r) => r.json() as Promise<{ ok?: boolean; roomId?: string }>);
      if (!res.roomId) throw new Error("Could not create call link");
      const link = `${window.location.origin}/noctis?join=${res.roomId}&mode=${mode}`;
      setGeneratedLink(link);
      await navigator.clipboard?.writeText(link).catch(() => undefined);
      onToast("Shareable call link copied!");
    } catch {
      onToast("Failed to create call link");
    }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0f12] p-5 text-xs text-zinc-200">
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-400/25 bg-[#10191d] p-4">
          <div>
            <h2 className="text-base font-semibold text-white">Unified $0 Internet Calls</h2>
            <p className="mt-0.5 text-zinc-400">211-country WebRTC voice/video, shareable links, simultaneous groups & full call log.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void createCallLink("voice")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 font-semibold text-white hover:bg-white/20"
            >
              <Link2 className="size-3.5 text-emerald-400" />
              Create Voice Link
            </button>
            <button
              type="button"
              onClick={() => void createCallLink("video")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 font-semibold text-black hover:bg-emerald-400"
            >
              <Video className="size-3.5" />
              Create Video Link
            </button>
            <button
              type="button"
              onClick={() => void navigate({ to: "/noctis", search: { call: "1" } as Record<string, string> })}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/35 px-3 py-2 font-semibold text-emerald-300 hover:bg-emerald-500/15"
            >
              <Phone className="size-3.5" />
              Open Dialer
            </button>
          </div>
        </div>

        {generatedLink ? (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5">
            <span className="truncate font-mono text-emerald-200">{generatedLink}</span>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(generatedLink);
                onToast("Copied!");
              }}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1 font-semibold text-black"
            >
              <Copy className="size-3" />
              Copy
            </button>
          </div>
        ) : null}

        <div className="rounded-2xl border border-white/10 bg-[#10181c] p-4">
          <h3 className="text-sm font-semibold text-white">Recent Call History</h3>
          {callHistory.length === 0 ? (
            <p className="mt-2 text-zinc-400">No recorded internet calls yet. Dial any number or share a call link above.</p>
          ) : (
            <div className="mt-3 divide-y divide-white/5">
              {callHistory.map((row) => (
                <div key={row.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <p className="font-medium text-white">
                      {row.fromName || row.fromPhoneE164} → {row.toPhoneE164}
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      {row.direction} · {row.mode} · <span className={row.status === "missed" ? "text-rose-400" : "text-emerald-300"}>{row.status}</span> · {new Date(row.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      void navigate({
                        to: "/noctis",
                        search: { join: row.roomId, mode: row.mode === "video" ? "video" : "voice" } as Record<string, string>,
                      })
                    }
                    className="rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-semibold hover:bg-white/20"
                  >
                    Rejoin
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ConnectStatusPanel({
  actorId,
  actorName,
  statuses,
  onRefresh,
  onToast,
}: {
  actorId: string;
  actorName: string;
  statuses: ConnectStatusItem[];
  onRefresh: () => void;
  onToast: (msg: string) => void;
}) {
  const [content, setContent] = useState("");
  const [privacy, setPrivacy] = useState("everyone");
  const [bgColor, setBgColor] = useState("#0f766e");
  const [activeStatus, setActiveStatus] = useState<ConnectStatusItem | null>(null);

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0f12] p-5 text-xs text-zinc-200">
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="rounded-2xl border border-white/10 bg-[#10181c] p-4">
          <h2 className="text-base font-semibold text-white">24-Hour Status & Stories</h2>
          <p className="mt-0.5 text-zinc-400">Updates automatically expire after 24 hours with privacy controls and viewer counts.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share a 24h status update..."
              className="min-w-[220px] flex-1 rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-white outline-none"
            />
            <select
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value)}
              className="rounded-xl border border-white/10 bg-black/50 px-2.5 py-2 text-white outline-none"
            >
              <option value="everyone">Everyone</option>
              <option value="contacts">Contacts Only</option>
              <option value="private">Private</option>
            </select>
            <input
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              className="h-9 w-12 cursor-pointer rounded-xl border border-white/10 bg-black"
            />
            <button
              type="button"
              onClick={() => {
                if (!content.trim()) return;
                void connectPost({
                  action: "create_status",
                  actorId,
                  actorName,
                  kind: "text",
                  content: content.trim(),
                  bgColor,
                  privacy,
                }).then(() => {
                  setContent("");
                  onRefresh();
                  onToast("24h Status posted");
                });
              }}
              className="rounded-xl bg-emerald-500 px-4 py-2 font-semibold text-black hover:bg-emerald-400"
            >
              Publish Status
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {statuses.map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => {
                setActiveStatus(st);
                void connectPost({ action: "view_status", statusId: st.id, actorId }).then(() => onRefresh());
              }}
              style={{ backgroundColor: st.bgColor || "#0f766e" }}
              className="flex h-40 flex-col justify-between rounded-2xl border border-white/15 p-4 text-left text-white transition hover:scale-[1.01]"
            >
              <div className="flex items-center justify-between text-[11px] opacity-90">
                <span className="font-semibold">{st.actorName}</span>
                <span>{st.privacy}</span>
              </div>
              <p className="line-clamp-3 text-sm font-medium">{st.content}</p>
              <div className="flex items-center justify-between text-[10px] opacity-85">
                <span className="inline-flex items-center gap-1">
                  <Eye className="size-3" /> {st.viewers.length} views
                </span>
                <span>Expires {new Date(st.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </button>
          ))}
        </div>

        {activeStatus ? (
          <div className="rounded-2xl border border-emerald-400/35 bg-[#121e23] p-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">{activeStatus.actorName}'s Status</span>
              <button
                type="button"
                onClick={() =>
                  void connectPost({ action: "react_status", statusId: activeStatus.id, actorId, emoji: "❤️" }).then(() => {
                    onToast("Reacted ❤️");
                    onRefresh();
                  })
                }
                className="inline-flex items-center gap-1 rounded-lg bg-rose-500/20 px-3 py-1 text-rose-200"
              >
                <Heart className="size-3.5" /> Love ({Object.values(activeStatus.reactions).flat().length})
              </button>
            </div>
            <p className="mt-2 text-sm text-zinc-100">{activeStatus.content}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ConnectCommunitiesChannelsPanel({
  actorId,
  actorName,
  communities,
  channels,
  onOpenThread,
  onRefresh,
  onToast,
}: {
  actorId: string;
  actorName: string;
  communities: ConnectCommunity[];
  channels: ConnectChannel[];
  onOpenThread: (threadId: string) => void;
  onRefresh: () => void;
  onToast: (msg: string) => void;
}) {
  const [comName, setComName] = useState("");
  const [comDesc, setComDesc] = useState("");
  const [chanName, setChanName] = useState("");
  const [chanHandle, setChanHandle] = useState("");
  const [postBodies, setPostBodies] = useState<Record<string, string>>({});

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0f12] p-5 text-xs text-zinc-200">
      <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-2">
        {/* Communities */}
        <div className="space-y-3 rounded-2xl border border-white/10 bg-[#10181c] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Users className="size-4 text-emerald-400" />
            Communities (Churches · Schools · Teams)
          </div>
          <div className="space-y-2 rounded-xl bg-black/35 p-3">
            <input
              value={comName}
              onChange={(e) => setComName(e.target.value)}
              placeholder="Community name..."
              className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-1.5 text-white outline-none"
            />
            <input
              value={comDesc}
              onChange={(e) => setComDesc(e.target.value)}
              placeholder="Description..."
              className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-1.5 text-white outline-none"
            />
            <button
              type="button"
              onClick={() => {
                if (!comName.trim()) return;
                void connectPost({
                  action: "create_community",
                  name: comName.trim(),
                  description: comDesc.trim(),
                  createdBy: actorId,
                }).then(() => {
                  setComName("");
                  setComDesc("");
                  onRefresh();
                  onToast("Community & Announcement Channel created");
                });
              }}
              className="w-full rounded-lg bg-emerald-500 py-1.5 font-semibold text-black hover:bg-emerald-400"
            >
              Create Community
            </button>
          </div>
          <div className="space-y-2">
            {communities.map((c) => (
              <div key={c.id} className="rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-white">{c.name}</p>
                  {c.announceThreadId ? (
                    <button
                      type="button"
                      onClick={() => onOpenThread(c.announceThreadId)}
                      className="rounded-lg bg-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-300"
                    >
                      Open Announcements
                    </button>
                  ) : null}
                </div>
                {c.description ? <p className="mt-1 text-zinc-400">{c.description}</p> : null}
              </div>
            ))}
          </div>
        </div>

        {/* Channels & Broadcasts */}
        <div className="space-y-3 rounded-2xl border border-white/10 bg-[#10181c] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Radio className="size-4 text-emerald-400" />
            Public Channels & Broadcasts
          </div>
          <div className="space-y-2 rounded-xl bg-black/35 p-3">
            <div className="grid grid-cols-2 gap-2">
              <input
                value={chanName}
                onChange={(e) => setChanName(e.target.value)}
                placeholder="Channel name..."
                className="rounded-lg border border-white/10 bg-black/50 px-3 py-1.5 text-white outline-none"
              />
              <input
                value={chanHandle}
                onChange={(e) => setChanHandle(e.target.value)}
                placeholder="@handle"
                className="rounded-lg border border-white/10 bg-black/50 px-3 py-1.5 text-white outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                if (!chanName.trim()) return;
                void connectPost({
                  action: "create_channel",
                  name: chanName.trim(),
                  handle: chanHandle.trim() || chanName.trim(),
                  verified: true,
                  ownerId: actorId,
                }).then(() => {
                  setChanName("");
                  setChanHandle("");
                  onRefresh();
                  onToast("Channel created");
                });
              }}
              className="w-full rounded-lg bg-white/15 py-1.5 font-semibold text-white hover:bg-white/25"
            >
              Launch Broadcast Channel
            </button>
          </div>
          <div className="space-y-2.5">
            {channels.map((ch) => {
              const followed = ch.subscribers.includes(actorId);
              return (
                <div key={ch.id} className="space-y-2 rounded-xl border border-white/10 bg-black/30 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="inline-flex items-center gap-1 font-semibold text-white">
                        {ch.name}
                        {ch.verified ? <BadgeCheck className="size-3.5 text-emerald-400" /> : null}
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        {ch.handle} · {ch.subscribers.length} subscribers · {ch.posts.reduce((a, p) => a + p.views, 0)} views
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        void connectPost({ action: "subscribe_channel", channelId: ch.id, actorId }).then(() => onRefresh())
                      }
                      className={`rounded-lg px-2.5 py-1 font-semibold ${
                        followed ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-500 text-black"
                      }`}
                    >
                      {followed ? "Following" : "Follow"}
                    </button>
                  </div>
                  {ch.ownerId === actorId ? (
                    <div className="flex gap-1.5">
                      <input
                        value={postBodies[ch.id] ?? ""}
                        onChange={(e) => setPostBodies((prev) => ({ ...prev, [ch.id]: e.target.value }))}
                        placeholder="Broadcast update to followers..."
                        className="flex-1 rounded-lg border border-white/10 bg-black/50 px-2.5 py-1 text-white outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const txt = (postBodies[ch.id] ?? "").trim();
                          if (!txt) return;
                          void connectPost({
                            action: "post_channel",
                            channelId: ch.id,
                            authorName: actorName,
                            body: txt,
                          }).then(() => {
                            setPostBodies((prev) => ({ ...prev, [ch.id]: "" }));
                            onRefresh();
                          });
                        }}
                        className="rounded-lg bg-emerald-500 px-3 py-1 font-semibold text-black"
                      >
                        Post
                      </button>
                    </div>
                  ) : null}
                  {ch.posts.slice(0, 3).map((post) => (
                    <div key={post.id} className="rounded-lg bg-black/45 p-2 text-zinc-200">
                      <p>{post.body}</p>
                      <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-400">
                        <span>{post.views} views</span>
                        <button
                          type="button"
                          onClick={() =>
                            void connectPost({
                              action: "react_channel_post",
                              postId: post.id,
                              emoji: "👍",
                              actorId,
                            }).then(() => onRefresh())
                          }
                          className="rounded bg-white/10 px-1.5 py-0.5 text-zinc-200"
                        >
                          👍 {Object.values(post.reactions).flat().length}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ConnectBusinessPanel({
  actorId,
  actorName,
  businesses,
  products,
  orders,
  onRefresh,
  onToast,
}: {
  actorId: string;
  actorName: string;
  businesses: ConnectBusiness[];
  products: ConnectProduct[];
  orders: ConnectOrder[];
  onRefresh: () => void;
  onToast: (msg: string) => void;
}) {
  const [bizName, setBizName] = useState("");
  const [bizCategory, setBizCategory] = useState("Healthcare / Services");
  const [prodName, setProdName] = useState("");
  const [prodPrice, setProdPrice] = useState("25.00");
  const [cart, setCart] = useState<{ productId: string; name: string; priceCents: number; qty: number }[]>([]);
  const [apptAt, setApptAt] = useState("");

  const activeBiz = businesses[0] ?? null;

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0f12] p-5 text-xs text-zinc-200">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="grid gap-4 rounded-2xl border border-emerald-400/25 bg-[#10181c] p-4 sm:grid-cols-3">
          <div>
            <p className="font-semibold text-emerald-300">Customers</p>
            <p className="mt-0.5 text-zinc-400">CRM labels, team inbox assignment, greeting & away automation.</p>
          </div>
          <div>
            <p className="font-semibold text-emerald-300">Commerce</p>
            <p className="mt-0.5 text-zinc-400">Product catalogs, in-chat shopping cart, orders & appointment booking.</p>
          </div>
          <div>
            <p className="font-semibold text-emerald-300">Operations</p>
            <p className="mt-0.5 text-zinc-400">{businesses.length} verified storefronts · {orders.length} active orders.</p>
          </div>
        </div>

        {/* Storefront setup */}
        <div className="rounded-2xl border border-white/10 bg-[#10181c] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Briefcase className="size-4 text-emerald-400" />
            {activeBiz ? `${activeBiz.name} (${activeBiz.category})` : "Launch Your Vibe Business Profile"}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              value={bizName}
              onChange={(e) => setBizName(e.target.value)}
              placeholder="Business name..."
              className="flex-1 rounded-xl border border-white/10 bg-black/50 px-3 py-1.5 text-white outline-none"
            />
            <input
              value={bizCategory}
              onChange={(e) => setBizCategory(e.target.value)}
              placeholder="Category..."
              className="rounded-xl border border-white/10 bg-black/50 px-3 py-1.5 text-white outline-none"
            />
            <button
              type="button"
              onClick={() => {
                if (!bizName.trim()) return;
                void connectPost({
                  action: "upsert_business",
                  ownerId: actorId,
                  name: bizName.trim(),
                  category: bizCategory.trim(),
                  quickReplies: ["Thanks for contacting us!", "Your order is confirmed.", "How can we assist today?"],
                }).then(() => {
                  setBizName("");
                  onRefresh();
                  onToast("Business storefront saved");
                });
              }}
              className="rounded-xl bg-emerald-500 px-4 py-1.5 font-semibold text-black hover:bg-emerald-400"
            >
              Create / Update Business
            </button>
          </div>
        </div>

        {activeBiz ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Catalog & Cart */}
            <div className="space-y-3 rounded-2xl border border-white/10 bg-[#10181c] p-4">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
                <ShoppingBag className="size-4 text-emerald-400" />
                Product & Service Catalog
              </p>
              <div className="flex gap-2">
                <input
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="Product or service name..."
                  className="flex-1 rounded-xl border border-white/10 bg-black/50 px-3 py-1.5 text-white outline-none"
                />
                <input
                  value={prodPrice}
                  onChange={(e) => setProdPrice(e.target.value)}
                  placeholder="25.00"
                  className="w-24 rounded-xl border border-white/10 bg-black/50 px-2.5 py-1.5 text-white outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!prodName.trim()) return;
                    const cents = Math.round(Number(prodPrice || 0) * 100);
                    void connectPost({
                      action: "add_product",
                      businessId: activeBiz.id,
                      name: prodName.trim(),
                      priceCents: cents,
                    }).then(() => {
                      setProdName("");
                      onRefresh();
                    });
                  }}
                  className="rounded-xl bg-white/15 px-3 py-1.5 font-semibold text-white hover:bg-white/25"
                >
                  <Plus className="size-4" />
                </button>
              </div>
              <div className="space-y-1.5">
                {products
                  .filter((p) => p.businessId === activeBiz.id)
                  .map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-xl bg-black/35 px-3 py-2">
                      <div>
                        <p className="font-medium text-white">{p.name}</p>
                        <p className="text-emerald-300">
                          {p.currency} {(p.priceCents / 100).toFixed(2)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setCart((prev) => {
                            const existing = prev.find((x) => x.productId === p.id);
                            if (existing) {
                              return prev.map((x) => (x.productId === p.id ? { ...x, qty: x.qty + 1 } : x));
                            }
                            return [...prev, { productId: p.id, name: p.name, priceCents: p.priceCents, qty: 1 }];
                          })
                        }
                        className="rounded-lg bg-emerald-500/20 px-2.5 py-1 font-semibold text-emerald-300"
                      >
                        Add to Cart
                      </button>
                    </div>
                  ))}
              </div>
              {cart.length > 0 ? (
                <div className="space-y-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3">
                  <p className="font-semibold text-white">
                    Cart ({cart.reduce((a, b) => a + b.qty, 0)} items · $
                    {(cart.reduce((a, b) => a + b.priceCents * b.qty, 0) / 100).toFixed(2)})
                  </p>
                  <input
                    type="datetime-local"
                    value={apptAt}
                    onChange={(e) => setApptAt(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/50 px-2.5 py-1 text-white"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      void connectPost({
                        action: "create_order",
                        businessId: activeBiz.id,
                        customerId: actorId,
                        customerName: actorName,
                        items: cart,
                        appointmentAt: apptAt,
                      }).then(() => {
                        setCart([]);
                        setApptAt("");
                        onRefresh();
                        onToast("Order & booking submitted");
                      })
                    }
                    className="w-full rounded-xl bg-emerald-500 py-2 font-semibold text-black hover:bg-emerald-400"
                  >
                    Place Order / Book Appointment
                  </button>
                </div>
              ) : null}
            </div>

            {/* Orders & CRM Queue */}
            <div className="space-y-3 rounded-2xl border border-white/10 bg-[#10181c] p-4">
              <p className="text-sm font-semibold text-white">Team Inbox Orders & CRM</p>
              <div className="space-y-2">
                {orders.map((ord) => (
                  <div key={ord.id} className="space-y-1.5 rounded-xl bg-black/35 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">
                        {ord.customerName} · ${(ord.totalCents / 100).toFixed(2)}
                      </span>
                      <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] uppercase text-emerald-300">
                        {ord.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(["confirmed", "fulfilled"] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() =>
                            void connectPost({ action: "update_order", orderId: ord.id, status: st }).then(() => onRefresh())
                          }
                          className="rounded-lg bg-white/10 px-2 py-0.5 text-[11px] hover:bg-white/20"
                        >
                          Mark {st}
                        </button>
                      ))}
                      {(["VIP", "Paid", "Support"] as const).map((lbl) => (
                        <button
                          key={lbl}
                          type="button"
                          onClick={() =>
                            void connectPost({ action: "update_order", orderId: ord.id, customerLabel: lbl }).then(() =>
                              onRefresh(),
                            )
                          }
                          className={`rounded-lg px-2 py-0.5 text-[11px] ${
                            ord.customerLabel === lbl ? "bg-amber-400 text-black font-semibold" : "bg-white/5 text-zinc-300"
                          }`}
                        >
                          {lbl}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ConnectSecurityAdminPanel({
  actorId,
  profile,
  devices,
  blocks,
  flags,
  onFlagsChange,
  onRefresh,
  onToast,
}: {
  actorId: string;
  profile: ConnectProfile | null;
  devices: ConnectDevice[];
  blocks: { blockedId: string; createdAt: string }[];
  flags: VibeConnectFeatureFlags;
  onFlagsChange: (next: VibeConnectFeatureFlags) => void;
  onRefresh: () => void;
  onToast: (msg: string) => void;
}) {
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [username, setUsername] = useState(profile?.username ?? "");
  const [phone, setPhone] = useState(profile?.phoneE164 ?? "");
  const [silenceUnknown, setSilenceUnknown] = useState(() => getSilenceUnknownCallers());
  const [deviceQr, setDeviceQr] = useState("");
  const [backupPass, setBackupPass] = useState("");
  const [telemetry, setTelemetry] = useState<{
    privacyNotice?: string;
    metrics?: Record<string, number>;
    reports?: { id: number; targetId: string; reason: string; status: string }[];
  } | null>(null);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName);
    setUsername(profile.username);
    setPhone(profile.phoneE164);
  }, [profile]);

  useEffect(() => {
    const linkPayload = `${window.location.origin}/connect?linkActor=${encodeURIComponent(actorId)}`;
    void QRCode.toDataURL(linkPayload, { width: 150, margin: 1 })
      .then((d) => setDeviceQr(d))
      .catch(() => setDeviceQr(""));
    if (flags.adminTelemetry) {
      void connectGet<{
        privacyNotice: string;
        metrics: Record<string, number>;
        reports: { id: number; targetId: string; reason: string; status: string }[];
      }>("action=admin_metrics")
        .then((res) => setTelemetry(res))
        .catch(() => undefined);
    }
  }, [actorId, flags.adminTelemetry]);

  async function handleExportBackup() {
    if (backupPass.length < 4) {
      onToast("Enter at least a 4-character passphrase to encrypt your backup");
      return;
    }
    const res = await connectGet<{ backup: unknown }>(`action=export_backup&actorId=${encodeURIComponent(actorId)}`);
    const encryptedJson = await packEncryptedBackup(res.backup, backupPass);
    const blob = new Blob([encryptedJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vibe-connect-encrypted-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onToast("Encrypted PBKDF2 + AES-GCM backup downloaded");
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0f12] p-5 text-xs text-zinc-200">
      <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-2">
        {/* Account, Username Handle, Privacy */}
        <div className="space-y-3 rounded-2xl border border-white/10 bg-[#10181c] p-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
            <Shield className="size-4 text-emerald-400" />
            Identity, Privacy & Silence Unknown Callers
          </p>
          <div className="space-y-2">
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Display Name"
              className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-1.5 text-white outline-none"
            />
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="@username (optional privacy alternative to phone)"
              className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-1.5 text-white outline-none"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1240..."
              className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-1.5 text-white outline-none"
            />
            <button
              type="button"
              onClick={() =>
                void connectPost({
                  action: "register_profile",
                  actorId,
                  displayName,
                  username,
                  phoneE164: phone,
                  publicKeyJwk: profile?.publicKeyJwk ?? "",
                }).then(() => {
                  onRefresh();
                  onToast("Identity updated");
                })
              }
              className="w-full rounded-xl bg-emerald-500 py-2 font-semibold text-black hover:bg-emerald-400"
            >
              Save Identity Profile
            </button>
          </div>
          <label className="flex items-center justify-between rounded-xl bg-black/35 px-3 py-2">
            <span>Silence unknown callers (not in Contacts)</span>
            <input
              type="checkbox"
              checked={silenceUnknown}
              onChange={(e) => {
                setSilenceUnknown(e.target.checked);
                setSilenceUnknownCallers(e.target.checked);
                void connectPost({
                  action: "update_privacy",
                  actorId,
                  privacy: { silenceUnknown: e.target.checked },
                }).catch(() => undefined);
              }}
            />
          </label>
          {blocks.length > 0 ? (
            <div className="space-y-1">
              <p className="font-semibold text-zinc-300">Blocked Users ({blocks.length})</p>
              {blocks.map((b) => (
                <div key={b.blockedId} className="flex items-center justify-between rounded-lg bg-black/40 px-2.5 py-1.5">
                  <span>{b.blockedId}</span>
                  <button
                    type="button"
                    onClick={() =>
                      void connectPost({ action: "unblock_user", blockerId: actorId, blockedId: b.blockedId }).then(() =>
                        onRefresh(),
                      )
                    }
                    className="text-emerald-300 hover:underline"
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Linked Devices & Encrypted Backup */}
        <div className="space-y-3 rounded-2xl border border-white/10 bg-[#10181c] p-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
            <Laptop className="size-4 text-emerald-400" />
            Linked Devices & Encrypted Backup
          </p>
          <div className="flex items-center gap-3 rounded-xl bg-black/35 p-3">
            {deviceQr ? <img src={deviceQr} alt="Device link QR" className="size-20 rounded-lg bg-white p-1" /> : null}
            <div className="space-y-1">
              <p className="font-semibold text-white">Scan QR to Link Companion Device</p>
              <p className="text-[11px] text-zinc-400">Independent sessions work without the primary device staying online.</p>
            </div>
          </div>
          <div className="space-y-1.5">
            {devices.map((d) => (
              <div key={d.deviceId} className="flex items-center justify-between rounded-xl bg-black/35 px-3 py-2">
                <div>
                  <p className="font-medium text-white">
                    {d.label} {d.revoked ? <span className="text-rose-400">(Revoked)</span> : <span className="text-emerald-400">(Active)</span>}
                  </p>
                  <p className="text-[10px] text-zinc-400">{d.deviceId}</p>
                </div>
                {!d.revoked ? (
                  <button
                    type="button"
                    onClick={() =>
                      void connectPost({ action: "revoke_device", actorId, deviceId: d.deviceId }).then(() => onRefresh())
                    }
                    className="inline-flex items-center gap-1 rounded-lg bg-rose-500/20 px-2 py-1 text-rose-200"
                  >
                    <Trash2 className="size-3" />
                    Logout
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          <div className="space-y-2 rounded-xl border border-white/10 bg-black/35 p-3">
            <p className="font-semibold text-white">Encrypted Backup Export & Verify</p>
            <div className="flex gap-2">
              <input
                type="password"
                value={backupPass}
                onChange={(e) => setBackupPass(e.target.value)}
                placeholder="Backup passphrase (4+ chars)..."
                className="flex-1 rounded-lg border border-white/10 bg-black/50 px-2.5 py-1 text-white outline-none"
              />
              <button
                type="button"
                onClick={() => void handleExportBackup()}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1 font-semibold text-black"
              >
                <Download className="size-3.5" />
                Export
              </button>
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-white/10 px-3 py-1 font-semibold text-white hover:bg-white/20">
                <Upload className="size-3.5" />
                Verify File
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const r = new FileReader();
                    r.onload = () => {
                      void unpackEncryptedBackup<{ threads?: unknown[]; messages?: unknown[] }>(
                        String(r.result ?? ""),
                        backupPass,
                      )
                        .then((dec) =>
                          onToast(`Backup decrypted OK (${dec.threads?.length ?? 0} threads, ${dec.messages?.length ?? 0} msgs)`),
                        )
                        .catch(() => onToast("Wrong passphrase or invalid backup file"));
                    };
                    r.readAsText(f);
                  }}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Privacy-Preserving Admin Telemetry + Feature Flags */}
        {flags.adminTelemetry ? (
          <div className="space-y-3 rounded-2xl border border-emerald-400/25 bg-[#10181c] p-4 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
                <Activity className="size-4 text-emerald-400" />
                Admin & Telemetry Console (Aggregate Counts Only)
              </p>
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] text-emerald-300">
                {telemetry?.privacyNotice ?? "Zero private plaintext access"}
              </span>
            </div>
            {telemetry?.metrics ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7">
                {Object.entries(telemetry.metrics).map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-black/40 p-2.5 text-center">
                    <p className="text-base font-bold text-emerald-300">{v}</p>
                    <p className="truncate text-[10px] text-zinc-400">{k}</p>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {VIBE_CONNECT_FLAG_META.map((meta) => {
                const enabled = flags[meta.key];
                return (
                  <button
                    key={meta.key}
                    type="button"
                    onClick={() => {
                      const next = { ...flags, [meta.key]: !enabled };
                      saveLocalVibeConnectFlags(next);
                      onFlagsChange(next);
                      void connectPost({ action: "set_flag", flagKey: meta.key, enabled: !enabled }).catch(() => undefined);
                    }}
                    className={`flex items-start justify-between gap-2 rounded-xl border p-2.5 text-left ${
                      enabled ? "border-emerald-400/35 bg-emerald-500/10" : "border-white/10 bg-black/35 opacity-70"
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-white">{meta.label}</p>
                      <p className="mt-0.5 text-[10px] text-zinc-400">{meta.description}</p>
                    </div>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${enabled ? "bg-emerald-500 text-black" : "bg-zinc-700 text-zinc-200"}`}>
                      {enabled ? "ON" : "OFF"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
