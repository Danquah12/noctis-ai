import React, { useState, useEffect, useMemo } from "react";
import {
  Share2,
  ThumbsUp,
  Repeat2,
  MessageSquare,
  Send,
  Download,
  Copy,
  Check,
  Sparkles,
  Stethoscope,
  GraduationCap,
  Cpu,
  Shield,
  Globe,
  ExternalLink,
  Search,
  Key,
  CheckCircle2,
  Plus,
  X,
  FileText,
  Layers,
  Activity,
  Award,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import {
  listNoctisSocialHubPosts,
  publishNoctisSocialPost,
  engageNoctisSocialPost,
  buildSocialChannelIntentUrl,
  buildCuratedNoctisSocialCatalog,
  type SocialFeedPostItem,
  type SocialChannelId,
  type SocialContentSourceType,
  type SocialApiConnectorConfig,
  type ChannelDispatchResult,
} from "@/lib/noctis-social-hub";

interface NoctisSocialHubTabProps {
  onSendToChat?: (prompt: string) => void;
  onClose?: () => void;
  initialDraftTitle?: string;
  initialDraftBody?: string;
  initialDraftCategory?: string;
}

const CHANNEL_META: Array<{
  id: SocialChannelId;
  label: string;
  badge: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
}> = [
  {
    id: "linkedin",
    label: "LinkedIn",
    badge: "in",
    bgClass: "bg-[#0a66c2]/20 hover:bg-[#0a66c2]/30",
    borderClass: "border-[#0a66c2]/50",
    textClass: "text-[#60a5fa]",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    badge: "WA",
    bgClass: "bg-emerald-500/20 hover:bg-emerald-500/30",
    borderClass: "border-emerald-500/50",
    textClass: "text-emerald-300",
  },
  {
    id: "instagram",
    label: "Instagram",
    badge: "IG",
    bgClass: "bg-pink-500/20 hover:bg-pink-500/30",
    borderClass: "border-pink-500/50",
    textClass: "text-pink-300",
  },
  {
    id: "facebook",
    label: "Facebook",
    badge: "FB",
    bgClass: "bg-blue-600/20 hover:bg-blue-600/30",
    borderClass: "border-blue-500/50",
    textClass: "text-blue-300",
  },
  {
    id: "x",
    label: "X / Twitter",
    badge: "X",
    bgClass: "bg-zinc-700/40 hover:bg-zinc-700/60",
    borderClass: "border-zinc-500/50",
    textClass: "text-zinc-200",
  },
  {
    id: "connectin",
    label: "ConnectIn",
    badge: "CI",
    bgClass: "bg-amber-500/20 hover:bg-amber-500/30",
    borderClass: "border-amber-500/50",
    textClass: "text-amber-300",
  },
];

const SOURCE_FILTERS: Array<{
  id: "ALL" | SocialContentSourceType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "ALL", label: "All Noctis Content", icon: Layers },
  { id: "HEALTH_500_CLINICAL_CASE", label: "Health 500 Clinical Cases", icon: Stethoscope },
  { id: "MEDICAL_BENCHMARK_130", label: "Medical Questions (130 / 1000)", icon: Activity },
  { id: "BOARD_EXAM_VIGNETTE", label: "Board Exam Vignettes", icon: GraduationCap },
  { id: "FRONTIER_CHALLENGE", label: "Frontier & Tox/Burn/MTP", icon: Zap },
  { id: "CONTINUOUS_DAEMON", label: "Continuous Daemon (2,158)", icon: Cpu },
  { id: "SOVEREIGN_SUITE", label: "16 Sovereign Suites", icon: Shield },
];

const CONNECTOR_STORAGE_KEY = "noctis-social-api-connectors-v1";

async function renderSocialCardFile(post: {
  title: string;
  categoryBadge: string;
  body: string;
  clinicalPearlOrInvariant?: string;
  guidelineOrStandard?: string;
  authorName: string;
}): Promise<File | null> {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Deep Sovereign Background
  ctx.fillStyle = "#0b1220";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Top Gold Accent Bar
  ctx.fillStyle = "#e4b86a";
  ctx.fillRect(0, 0, canvas.width, 14);

  // Header Badge Box
  ctx.fillStyle = "#162238";
  ctx.fillRect(64, 54, 952, 92);
  ctx.strokeStyle = "rgba(228,184,106,0.45)";
  ctx.lineWidth = 2;
  ctx.strokeRect(64, 54, 952, 92);

  ctx.fillStyle = "#e4b86a";
  ctx.font = "700 22px sans-serif";
  ctx.fillText(post.categoryBadge.toUpperCase().slice(0, 62), 92, 94);

  ctx.fillStyle = "#cbd5e1";
  ctx.font = "500 20px sans-serif";
  ctx.fillText(post.authorName.slice(0, 64), 92, 126);

  // Title Wrapping
  ctx.fillStyle = "#f8fafc";
  ctx.font = "700 34px Georgia, serif";
  const wrapLines = (text: string, maxWidth: number, maxRows: number): string[] => {
    const words = text.replace(/\s+/g, " ").trim().split(" ");
    const lines: string[] = [];
    let current = "";
    for (const w of words) {
      const candidate = current ? `${current} ${w}` : w;
      if (ctx.measureText(candidate).width > maxWidth && current) {
        lines.push(current);
        current = w;
        if (lines.length >= maxRows - 1) break;
      } else {
        current = candidate;
      }
    }
    if (current && lines.length < maxRows) lines.push(current);
    return lines;
  };

  const titleLines = wrapLines(post.title, 952, 3);
  let y = 205;
  for (const line of titleLines) {
    ctx.fillText(line, 64, y);
    y += 46;
  }

  // Divider
  ctx.fillStyle = "rgba(228,184,106,0.35)";
  ctx.fillRect(64, y + 4, 952, 2);
  y += 44;

  // Body Paragraphs
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "500 24px sans-serif";
  const paragraphs = post.body
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 12);

  for (const para of paragraphs) {
    const pLines = wrapLines(para, 952, 3);
    for (const pl of pLines) {
      if (y > 980) break;
      ctx.fillText(pl, 64, y);
      y += 36;
    }
    y += 10;
    if (y > 980) break;
  }

  // Pearl / Invariant Callout Box at Bottom
  if (post.clinicalPearlOrInvariant) {
    ctx.fillStyle = "#14261c";
    ctx.fillRect(64, 1020, 952, 160);
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 2;
    ctx.strokeRect(64, 1020, 952, 160);

    ctx.fillStyle = "#34d399";
    ctx.font = "700 20px sans-serif";
    ctx.fillText("VERIFIED CLINICAL PEARL / SAFETY INVARIANT", 90, 1058);

    ctx.fillStyle = "#f1f5f9";
    ctx.font = "500 22px sans-serif";
    const pearlLines = wrapLines(post.clinicalPearlOrInvariant, 900, 3);
    let py = 1094;
    for (const pl of pearlLines) {
      ctx.fillText(pl, 90, py);
      py += 32;
    }
  }

  // Footer
  ctx.fillStyle = "#e4b86a";
  ctx.font = "700 24px Georgia, serif";
  ctx.fillText("NOCTIS SOVEREIGN AI · dstrike.app/noctis", 64, 1275);
  if (post.guidelineOrStandard) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "500 18px sans-serif";
    ctx.fillText(`Authority: ${post.guidelineOrStandard.slice(0, 75)}`, 64, 1310);
  }

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92)
  );
  return blob ? new File([blob], "noctis-social-card.jpg", { type: "image/jpeg" }) : null;
}

export function NoctisSocialHubTab({
  onSendToChat,
  onClose,
  initialDraftTitle = "",
  initialDraftBody = "",
  initialDraftCategory = "Noctis Medical & Sovereign Insight",
}: NoctisSocialHubTabProps) {
  const user = useCurrentUser();
  const defaultAuthor = user?.displayName || "Dr. Kwesi Asiedu @ Noctis";

  const [posts, setPosts] = useState<SocialFeedPostItem[]>(() => buildCuratedNoctisSocialCatalog());
  const [sourceFilter, setSourceFilter] = useState<"ALL" | SocialContentSourceType>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChannels, setSelectedChannels] = useState<SocialChannelId[]>([
    "linkedin",
    "whatsapp",
    "instagram",
    "facebook",
  ]);

  // Composer State
  const [composerOpen, setComposerOpen] = useState<boolean>(Boolean(initialDraftBody));
  const [draftTitle, setDraftTitle] = useState(initialDraftTitle);
  const [draftCategory, setDraftCategory] = useState(initialDraftCategory);
  const [draftBody, setDraftBody] = useState(initialDraftBody);
  const [draftPearl, setDraftPearl] = useState("");
  const [draftGuideline, setDraftGuideline] = useState(
    "FDA Jan 2026 Non-Device CDS (21 U.S.C. § 360j(o)(1)(E)) & Noctis SQDEC P1"
  );
  const [publishing, setPublishing] = useState(false);
  const [lastDispatches, setLastDispatches] = useState<ChannelDispatchResult[]>([]);
  const [statusBanner, setStatusBanner] = useState<string>("");

  // Per-post interactive states (likes, reposts, comment boxes)
  const [likedIds, setLikedIds] = useState<Record<string, boolean>>({});
  const [repostedIds, setRepostedIds] = useState<Record<string, boolean>>({});
  const [openCommentsId, setOpenCommentsId] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentChannel, setCommentChannel] = useState<SocialChannelId | "noctis">("linkedin");
  const [copiedId, setCopiedId] = useState<string>("");

  // Optional Direct API Connector Modal
  const [connectorModalOpen, setConnectorModalOpen] = useState(false);
  const [connectorConfig, setConnectorConfig] = useState<SocialApiConnectorConfig>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(CONNECTOR_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as SocialApiConnectorConfig) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    void listNoctisSocialHubPosts()
      .then((rows) => {
        if (rows && rows.length) setPosts(rows);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (initialDraftBody) {
      setDraftTitle(initialDraftTitle || "Noctis Sovereign Clinical & Technical Insight");
      setDraftBody(initialDraftBody);
      setComposerOpen(true);
    }
  }, [initialDraftBody, initialDraftTitle]);

  const saveConnectors = (next: SocialApiConnectorConfig) => {
    setConnectorConfig(next);
    try {
      localStorage.setItem(CONNECTOR_STORAGE_KEY, JSON.stringify(next));
      setStatusBanner("Saved Direct API Connector credentials for LinkedIn, WhatsApp, Instagram, and Facebook.");
    } catch {}
    setConnectorModalOpen(false);
  };

  const toggleChannel = (id: SocialChannelId) => {
    setSelectedChannels((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      if (sourceFilter !== "ALL" && p.sourceType !== sourceFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.body.toLowerCase().includes(q) ||
        p.categoryBadge.toLowerCase().includes(q) ||
        (p.clinicalPearlOrInvariant && p.clinicalPearlOrInvariant.toLowerCase().includes(q)) ||
        (p.guidelineOrStandard && p.guidelineOrStandard.toLowerCase().includes(q))
      );
    });
  }, [posts, sourceFilter, searchQuery]);

  // Publish new post or syndicate existing item across LinkedIn, WhatsApp, Instagram, Facebook
  const handlePublishOrSyndicate = async (item: {
    sourceType?: SocialContentSourceType;
    sourceId?: string;
    categoryBadge: string;
    title: string;
    summary?: string;
    body: string;
    clinicalPearl?: string;
    guideline?: string;
    openTabsImmediately?: boolean;
    specificChannel?: SocialChannelId;
  }) => {
    const channelsToUse: SocialChannelId[] = item.specificChannel
      ? [item.specificChannel]
      : selectedChannels.length
      ? selectedChannels
      : ["linkedin", "whatsapp", "instagram", "facebook"];

    setPublishing(true);
    setStatusBanner("");
    const origin =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "https://dstrike.app";

    try {
      const res = await publishNoctisSocialPost({
        data: {
          sourceType: item.sourceType || "NOCTIS_CHAT_INSIGHT",
          sourceId: item.sourceId || `noctis-${Date.now()}`,
          categoryBadge: item.categoryBadge,
          title: item.title,
          summary: item.summary || item.body.slice(0, 260),
          body: item.body,
          clinicalPearl: item.clinicalPearl || "",
          guideline: item.guideline || "",
          authorName: defaultAuthor,
          channels: channelsToUse,
          origin,
          connectorConfig,
        },
      });

      setPosts((prev) => [res.post, ...prev.filter((p) => p.id !== res.post.id)]);
      setLastDispatches(res.dispatches);

      const clipboardText = `${item.title}\n\n${item.body}\n\n🔗 Interactive Card & Full Dossier: ${res.shareUrl}`;
      void navigator.clipboard.writeText(clipboardText).catch(() => undefined);

      // Mobile native share with 1080x1350 image card if on mobile
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function" &&
        /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
      ) {
        const cardFile = await renderSocialCardFile({
          title: item.title,
          categoryBadge: item.categoryBadge,
          body: item.body,
          clinicalPearlOrInvariant: item.clinicalPearl,
          guidelineOrStandard: item.guideline,
          authorName: defaultAuthor,
        });
        if (cardFile) {
          const shareData: ShareData = {
            files: [cardFile],
            title: item.title,
            text: clipboardText,
          };
          if (typeof navigator.canShare !== "function" || navigator.canShare(shareData)) {
            await navigator.share(shareData).catch(() => undefined);
          }
        }
      }

      if (item.openTabsImmediately !== false) {
        for (const d of res.dispatches) {
          if (d.mode === "UNIVERSAL_WEB_INTENT") {
            window.open(d.intentUrl, "_blank", "noopener,noreferrer");
          }
        }
      }

      setStatusBanner(
        `Published "${item.title.slice(0, 64)}" to ${channelsToUse
          .map((c) => c.toUpperCase())
          .join(", ")} · Short link ${res.shareUrl} copied to clipboard.`
      );
    } catch (err) {
      setStatusBanner(err instanceof Error ? err.message : "Could not syndicate post.");
    } finally {
      setPublishing(false);
    }
  };

  const handleLike = async (post: SocialFeedPostItem) => {
    const already = Boolean(likedIds[post.id]);
    setLikedIds((prev) => ({ ...prev, [post.id]: !already }));
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, likesCount: p.likesCount + (already ? -1 : 1) }
          : p
      )
    );
    if (!already) {
      await engageNoctisSocialPost({
        data: { postId: post.id, shareCode: post.shareCode, action: "like", authorName: defaultAuthor },
      }).catch(() => undefined);
    }
  };

  const handleRepost = async (post: SocialFeedPostItem, targetChannel?: SocialChannelId) => {
    setRepostedIds((prev) => ({ ...prev, [post.id]: true }));
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, repostsCount: p.repostsCount + 1, sharesCount: p.sharesCount + 1 }
          : p
      )
    );
    await engageNoctisSocialPost({
      data: {
        postId: post.id,
        shareCode: post.shareCode,
        action: "repost",
        authorName: defaultAuthor,
        channel: targetChannel || "linkedin",
      },
    }).catch(() => undefined);

    await handlePublishOrSyndicate({
      sourceType: post.sourceType,
      sourceId: post.sourceId,
      categoryBadge: `Repost · ${post.categoryBadge}`,
      title: `🔁 Repost: ${post.title}`,
      summary: post.summary,
      body: post.body,
      clinicalPearl: post.clinicalPearlOrInvariant,
      guideline: post.guidelineOrStandard,
      specificChannel: targetChannel,
    });
  };

  const handleAddComment = async (post: SocialFeedPostItem, syndicateCommentToChannel?: SocialChannelId) => {
    const text = (commentDrafts[post.id] || "").trim();
    if (!text) return;

    const res = await engageNoctisSocialPost({
      data: {
        postId: post.id,
        shareCode: post.shareCode,
        action: "comment",
        commentBody: text,
        authorName: defaultAuthor,
        authorHandle: `@${(user?.displayName || "kwesi").toLowerCase().replace(/\s+/g, "")}`,
        channel: syndicateCommentToChannel || commentChannel,
      },
    }).catch(() => null);

    const newComment = res?.comment || {
      id: `cmt-${Date.now()}`,
      postId: post.id,
      authorName: defaultAuthor,
      authorHandle: "@kwesi",
      authorAvatar: "/media/avatars/kwesi.jpg",
      body: text,
      channel: syndicateCommentToChannel || commentChannel,
      createdAt: new Date().toISOString(),
      likes: 1,
    };

    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? {
              ...p,
              commentsCount: p.commentsCount + 1,
              comments: [...p.comments, newComment],
            }
          : p
      )
    );
    setCommentDrafts((prev) => ({ ...prev, [post.id]: "" }));

    if (syndicateCommentToChannel) {
      const origin =
        typeof window !== "undefined" && window.location?.origin
          ? window.location.origin
          : "https://dstrike.app";
      const shareUrl = `${origin}/s?c=${post.shareCode}`;
      const intentUrl = buildSocialChannelIntentUrl(syndicateCommentToChannel, {
        title: `💬 Comment on ${post.title}`,
        body: `${text}\n\n— Regarding: ${post.summary}`,
        shareUrl,
      });
      window.open(intentUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleDownloadCard = async (post: SocialFeedPostItem) => {
    const file = await renderSocialCardFile({
      title: post.title,
      categoryBadge: post.categoryBadge,
      body: post.body,
      clinicalPearlOrInvariant: post.clinicalPearlOrInvariant,
      guidelineOrStandard: post.guidelineOrStandard,
      authorName: post.authorName,
    });
    if (!file) return;
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${post.sourceId.toLowerCase()}-social-card.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    setStatusBanner(`Downloaded 1080×1350 Instagram/LinkedIn card (${post.sourceId.toLowerCase()}-social-card.jpg).`);
  };

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-[#0b0f17] p-4 md:p-6 text-zinc-100 font-sans">
      {/* Top Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Share2 className="size-6 text-[#e4b86a]" />
            <h1 className="text-xl font-bold tracking-tight text-white">
              Noctis Omnichannel Social Command & Syndication Hub
            </h1>
            <span className="rounded-full bg-[#e4b86a]/20 border border-[#e4b86a]/40 px-2.5 py-0.5 text-[11px] font-bold text-[#e4b86a]">
              LinkedIn · WhatsApp · Instagram · Facebook · X · ConnectIn
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Post, repost, comment, like, and generate 1080×1350 visual cards for every Noctis Medical Benchmark question, Health 500 clinical case, Board Exam vignette, Frontier challenge, and Sovereign Suite.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setComposerOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#e4b86a] hover:bg-[#d6a95b] px-3.5 py-2 text-xs font-bold text-[#1a1408] transition shadow-sm"
          >
            <Plus className="size-4" />
            <span>{composerOpen ? "Hide Post Composer" : "Compose Custom Social Post"}</span>
          </button>
          <button
            type="button"
            onClick={() => setConnectorModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-300 transition"
          >
            <Key className="size-3.5" />
            <span>API Connectors (LinkedIn / Meta / WA)</span>
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-white/10"
            >
              Return to Chat
            </button>
          )}
        </div>
      </div>

      {/* Status Notification Banner */}
      {statusBanner && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-[#e4b86a]/40 bg-[#e4b86a]/10 px-4 py-2.5 text-xs text-[#e4b86a]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{statusBanner}</span>
          </div>
          <button type="button" onClick={() => setStatusBanner("")} className="text-zinc-400 hover:text-white">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Recent Dispatch Receipts */}
      {lastDispatches.length > 0 && (
        <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#e4b86a]">
              Latest Multi-Platform Syndication Links & Intents
            </span>
            <button
              type="button"
              onClick={() => setLastDispatches([])}
              className="text-[11px] text-zinc-400 hover:text-white"
            >
              Clear
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {lastDispatches.map((d, i) => (
              <a
                key={`${d.channel}-${i}`}
                href={d.intentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs hover:border-[#e4b86a]/50 transition"
              >
                <div>
                  <span className="font-bold uppercase text-white">{d.channel}</span>
                  <span className="ml-2 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                    {d.mode === "DIRECT_REST_API" ? "API PUBLISHED" : "OPEN & POST ↗"}
                  </span>
                  <p className="text-[10px] text-zinc-400 truncate max-w-[200px] mt-0.5">{d.shareUrl}</p>
                </div>
                <ExternalLink className="size-3.5 text-[#e4b86a] shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Channel Target Selector Bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#121826] p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-zinc-300 mr-1">Target Networks:</span>
          {CHANNEL_META.map((ch) => {
            const active = selectedChannels.includes(ch.id);
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => toggleChannel(ch.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition",
                  active
                    ? `${ch.bgClass} ${ch.borderClass} ${ch.textClass} ring-1 ring-white/20`
                    : "border-white/10 bg-white/5 text-zinc-400 hover:text-zinc-200"
                )}
              >
                <span className="rounded bg-black/40 px-1.5 py-0.2 text-[10px] font-mono font-bold">
                  {ch.badge}
                </span>
                <span>{ch.label}</span>
                {active && <Check className="size-3" />}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 size-3.5 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search medical cases, USMLE, tox, SMR..."
            className="w-full rounded-full border border-white/10 bg-black/40 py-1.5 pl-8 pr-3 text-xs text-zinc-100 placeholder-zinc-500 focus:border-[#e4b86a] focus:outline-none"
          />
        </div>
      </div>

      {/* Custom Post Composer Drawer */}
      {composerOpen && (
        <div className="mb-6 rounded-2xl border border-[#e4b86a]/40 bg-[#141b2d] p-4 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#e4b86a] flex items-center gap-2">
              <Sparkles className="size-4" />
              <span>Compose & Syndicate Noctis Post to LinkedIn, WhatsApp, Instagram & Facebook</span>
            </h2>
            <button
              type="button"
              onClick={() => setComposerOpen(false)}
              className="text-zinc-400 hover:text-white"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Post Headline / Clinical Vignette Title</label>
              <input
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="e.g., Acute Ischemic Stroke LVO Protocol & Safety Invariants"
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:border-[#e4b86a] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Category Badge</label>
              <input
                type="text"
                value={draftCategory}
                onChange={(e) => setDraftCategory(e.target.value)}
                placeholder="e.g., Health 500 · Neurology"
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:border-[#e4b86a] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
              Post Body (Medical Case, Question & Options, Rationale, or Sovereign Report)
            </label>
            <textarea
              rows={5}
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
              placeholder="Write or paste any medical question, clinical case vignette, board exam pearl, or Noctis analysis..."
              className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white leading-relaxed focus:border-[#e4b86a] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                High-Yield Clinical Pearl / Mathematical Safety Invariant (Optional)
              </label>
              <input
                type="text"
                value={draftPearl}
                onChange={(e) => setDraftPearl(e.target.value)}
                placeholder="e.g., Stat non-contrast head CT < 20 min before IV thrombolysis"
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:border-[#e4b86a] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                Guideline / Regulatory Authority
              </label>
              <input
                type="text"
                value={draftGuideline}
                onChange={(e) => setDraftGuideline(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:border-[#e4b86a] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={publishing || !draftBody.trim()}
              onClick={() =>
                void handlePublishOrSyndicate({
                  sourceType: "NOCTIS_CHAT_INSIGHT",
                  categoryBadge: draftCategory,
                  title: draftTitle || "Noctis Clinical & Sovereign Brief",
                  body: draftBody,
                  clinicalPearl: draftPearl,
                  guideline: draftGuideline,
                })
              }
              className="inline-flex items-center gap-2 rounded-xl bg-[#e4b86a] hover:bg-[#d6a95b] px-4 py-2 text-xs font-bold text-[#1a1408] transition disabled:opacity-50"
            >
              <Send className="size-3.5" />
              <span>
                {publishing
                  ? "Publishing & Building Card..."
                  : `Post & Syndicate to ${selectedChannels.map((c) => c.toUpperCase()).join(" + ")}`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Category Filter Pills */}
      <div className="mb-5 flex items-center gap-2 overflow-x-auto pb-1">
        {SOURCE_FILTERS.map((f) => {
          const Icon = f.icon;
          const active = sourceFilter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setSourceFilter(f.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition border",
                active
                  ? "bg-[#e4b86a] text-[#1a1408] border-[#e4b86a] shadow-sm"
                  : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
              )}
            >
              <Icon className="size-3.5" />
              <span>{f.label}</span>
            </button>
          );
        })}
      </div>

      {/* Feed Cards Grid */}
      <div className="space-y-4">
        {filteredPosts.map((post) => {
          const isLiked = Boolean(likedIds[post.id]);
          const isReposted = Boolean(repostedIds[post.id]);
          const commentsOpen = openCommentsId === post.id;
          const origin =
            typeof window !== "undefined" && window.location?.origin
              ? window.location.origin
              : "https://dstrike.app";
          const shareUrl = `${origin}/s?c=${post.shareCode}`;

          return (
            <article
              key={post.id}
              className="rounded-2xl border border-white/10 bg-[#131926] p-4 sm:p-5 shadow-lg transition hover:border-[#e4b86a]/40"
            >
              {/* Author & Category Header */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                  <img
                    src={post.authorAvatar}
                    alt={post.authorName}
                    className="size-10 rounded-full object-cover ring-2 ring-[#e4b86a]/60"
                  />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-white">{post.authorName}</span>
                      <span className="rounded-full bg-[#e4b86a]/15 border border-[#e4b86a]/30 px-2.5 py-0.5 text-[10px] font-bold text-[#e4b86a]">
                        {post.categoryBadge}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400">{post.authorRole}</p>
                  </div>
                </div>

                {/* Direct 1-Click Channel Post Buttons */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {CHANNEL_META.map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() =>
                        void handlePublishOrSyndicate({
                          sourceType: post.sourceType,
                          sourceId: post.sourceId,
                          categoryBadge: post.categoryBadge,
                          title: post.title,
                          summary: post.summary,
                          body: post.body,
                          clinicalPearl: post.clinicalPearlOrInvariant,
                          guideline: post.guidelineOrStandard,
                          specificChannel: ch.id,
                        })
                      }
                      title={`Post directly to ${ch.label}`}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-bold transition",
                        ch.bgClass,
                        ch.borderClass,
                        ch.textClass
                      )}
                    >
                      <span>Post {ch.badge}</span>
                      <ExternalLink className="size-3" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Post Title & Full Body */}
              <div className="mt-3.5 space-y-2.5">
                <h3 className="text-base font-bold text-amber-100">{post.title}</h3>
                <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 font-sans text-xs sm:text-sm leading-relaxed text-zinc-200 whitespace-pre-line">
                  {post.body}
                </div>

                {post.clinicalPearlOrInvariant && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs">
                    <span className="font-bold text-emerald-300 uppercase tracking-wider">
                      🛡️ Verified Clinical Pearl / Invariant:{" "}
                    </span>
                    <span className="text-zinc-200">{post.clinicalPearlOrInvariant}</span>
                  </div>
                )}

                {post.guidelineOrStandard && (
                  <p className="text-[11px] text-zinc-400 font-mono">
                    Authority / Standard: <span className="text-zinc-300">{post.guidelineOrStandard}</span>
                  </p>
                )}
              </div>

              {/* Social Engagement Action Bar: Like, Repost, Comment, Copy Link, Download Card, Open in Chat */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Like */}
                  <button
                    type="button"
                    onClick={() => void handleLike(post)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                      isLiked
                        ? "border-sky-400 bg-sky-500/20 text-sky-300"
                        : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
                    )}
                  >
                    <ThumbsUp className={cn("size-3.5", isLiked && "fill-current")} />
                    <span>Like ({post.likesCount})</span>
                  </button>

                  {/* Repost */}
                  <button
                    type="button"
                    onClick={() => void handleRepost(post)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                      isReposted
                        ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                        : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
                    )}
                  >
                    <Repeat2 className="size-3.5" />
                    <span>Repost ({post.repostsCount})</span>
                  </button>

                  {/* Comment */}
                  <button
                    type="button"
                    onClick={() => setOpenCommentsId(commentsOpen ? null : post.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                      commentsOpen
                        ? "border-[#e4b86a] bg-[#e4b86a]/20 text-[#e4b86a]"
                        : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
                    )}
                  >
                    <MessageSquare className="size-3.5" />
                    <span>Comments ({post.commentsCount})</span>
                  </button>

                  {/* Syndicate to All Selected */}
                  <button
                    type="button"
                    onClick={() =>
                      void handlePublishOrSyndicate({
                        sourceType: post.sourceType,
                        sourceId: post.sourceId,
                        categoryBadge: post.categoryBadge,
                        title: post.title,
                        summary: post.summary,
                        body: post.body,
                        clinicalPearl: post.clinicalPearlOrInvariant,
                        guideline: post.guidelineOrStandard,
                      })
                    }
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#e4b86a] hover:bg-[#d6a95b] px-3.5 py-1.5 text-xs font-bold text-[#1a1408] transition"
                  >
                    <Share2 className="size-3.5" />
                    <span>Blast to Selected ({selectedChannels.length})</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => void handleDownloadCard(post)}
                    className="inline-flex items-center gap-1 rounded-full border border-pink-500/40 bg-pink-500/10 hover:bg-pink-500/20 px-3 py-1.5 text-xs font-semibold text-pink-300 transition"
                    title="Download 1080×1350 visual card for Instagram, LinkedIn, Facebook, or WhatsApp"
                  >
                    <Download className="size-3.5" />
                    <span>IG/LI Card (.jpg)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(`${post.title}\n\n${post.body}\n\n${shareUrl}`);
                      setCopiedId(post.id);
                      setTimeout(() => setCopiedId((c) => (c === post.id ? "" : c)), 2000);
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs text-zinc-300"
                  >
                    {copiedId === post.id ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                    <span>{copiedId === post.id ? "Copied" : "Copy Text & Link"}</span>
                  </button>

                  {onSendToChat && (
                    <button
                      type="button"
                      onClick={() => onSendToChat(`Expand on this Noctis clinical/technical post and prepare a detailed LinkedIn & WhatsApp thread:\n\n${post.title}\n${post.body}`)}
                      className="inline-flex items-center gap-1 rounded-full border border-violet-500/40 bg-violet-500/10 hover:bg-violet-500/20 px-3 py-1.5 text-xs font-semibold text-violet-300"
                    >
                      <Sparkles className="size-3.5" />
                      <span>Ask Noctis</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Comments Drawer */}
              {commentsOpen && (
                <div className="mt-4 rounded-xl border border-white/10 bg-black/50 p-3.5 space-y-3">
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {post.comments.length === 0 ? (
                      <p className="text-xs text-zinc-500">No comments yet. Add the first clinical or technical comment below.</p>
                    ) : (
                      post.comments.map((c) => (
                        <div
                          key={c.id}
                          className="rounded-lg border border-white/5 bg-white/[0.03] p-2.5 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white">{c.authorName}</span>
                              <span className="text-[10px] text-zinc-400">{c.authorHandle}</span>
                              <span className="rounded bg-[#e4b86a]/15 px-1.5 py-0.2 text-[9px] font-bold uppercase text-[#e4b86a]">
                                via {c.channel}
                              </span>
                            </div>
                            <span className="text-[10px] text-zinc-500">
                              {new Date(c.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="text-zinc-200 leading-relaxed">{c.body}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* New Comment Input + Cross-Post Comment to LinkedIn/WhatsApp/FB */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                    <select
                      value={commentChannel}
                      onChange={(e) => setCommentChannel(e.target.value as SocialChannelId)}
                      className="rounded-xl border border-white/10 bg-[#141b2d] px-2.5 py-2 text-xs text-zinc-200 focus:border-[#e4b86a] focus:outline-none"
                    >
                      <option value="linkedin">Tag: LinkedIn</option>
                      <option value="whatsapp">Tag: WhatsApp</option>
                      <option value="instagram">Tag: Instagram</option>
                      <option value="facebook">Tag: Facebook</option>
                      <option value="connectin">Tag: ConnectIn</option>
                    </select>
                    <input
                      type="text"
                      value={commentDrafts[post.id] || ""}
                      onChange={(e) =>
                        setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleAddComment(post);
                      }}
                      placeholder="Write a comment, clinical pearl, or peer review note..."
                      className="flex-1 rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-[#e4b86a] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => void handleAddComment(post)}
                      className="rounded-xl bg-[#e4b86a] hover:bg-[#d6a95b] px-3.5 py-2 text-xs font-bold text-[#1a1408] transition"
                    >
                      Post Comment
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleAddComment(post, commentChannel === "noctis" ? "linkedin" : commentChannel)}
                      className="rounded-xl border border-[#e4b86a]/50 bg-[#e4b86a]/10 hover:bg-[#e4b86a]/20 px-3 py-2 text-xs font-semibold text-[#e4b86a] transition"
                      title="Save comment and open selected social platform with your comment pre-filled"
                    >
                      Comment + Share to {commentChannel.toUpperCase()} ↗
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Direct API Connector Credentials Modal */}
      {connectorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-white/15 bg-[#111726] p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Key className="size-4 text-emerald-400" />
                  <span>Direct Social Graph API Connectors (Optional)</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Universal Web Intents & 1080×1350 Image Cards work immediately with zero keys. Add tokens below for 1-click background REST API publishing.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConnectorModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1 text-xs">
              <div className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-2">
                <p className="font-bold text-[#60a5fa]">1. LinkedIn Community Management / UGC API</p>
                <input
                  type="text"
                  value={connectorConfig.linkedinAuthorUrn || ""}
                  onChange={(e) => setConnectorConfig({ ...connectorConfig, linkedinAuthorUrn: e.target.value })}
                  placeholder="Author URN (e.g., urn:li:person:abc123 or urn:li:organization:456)"
                  className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-1.5 text-white"
                />
                <input
                  type="password"
                  value={connectorConfig.linkedinAccessToken || ""}
                  onChange={(e) => setConnectorConfig({ ...connectorConfig, linkedinAccessToken: e.target.value })}
                  placeholder="LinkedIn OAuth 2.0 Access Token (w_member_social)"
                  className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-1.5 text-white"
                />
              </div>

              <div className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-2">
                <p className="font-bold text-emerald-300">2. Meta WhatsApp Business Cloud API</p>
                <input
                  type="text"
                  value={connectorConfig.whatsappPhoneNumberId || ""}
                  onChange={(e) => setConnectorConfig({ ...connectorConfig, whatsappPhoneNumberId: e.target.value })}
                  placeholder="WhatsApp Phone Number ID"
                  className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-1.5 text-white"
                />
                <input
                  type="text"
                  value={connectorConfig.whatsappRecipientPhone || ""}
                  onChange={(e) => setConnectorConfig({ ...connectorConfig, whatsappRecipientPhone: e.target.value })}
                  placeholder="Default Recipient / Group Phone (e.g., +14105550199)"
                  className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-1.5 text-white"
                />
                <input
                  type="password"
                  value={connectorConfig.whatsappAccessToken || ""}
                  onChange={(e) => setConnectorConfig({ ...connectorConfig, whatsappAccessToken: e.target.value })}
                  placeholder="WhatsApp Cloud Permanent Access Token"
                  className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-1.5 text-white"
                />
              </div>

              <div className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-2">
                <p className="font-bold text-blue-300">3. Facebook Pages Graph API</p>
                <input
                  type="text"
                  value={connectorConfig.facebookPageId || ""}
                  onChange={(e) => setConnectorConfig({ ...connectorConfig, facebookPageId: e.target.value })}
                  placeholder="Facebook Page ID"
                  className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-1.5 text-white"
                />
                <input
                  type="password"
                  value={connectorConfig.facebookPageAccessToken || ""}
                  onChange={(e) => setConnectorConfig({ ...connectorConfig, facebookPageAccessToken: e.target.value })}
                  placeholder="Facebook Page Access Token (pages_manage_posts)"
                  className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-1.5 text-white"
                />
              </div>

              <div className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-2">
                <p className="font-bold text-pink-300">4. Instagram Business Graph API</p>
                <input
                  type="text"
                  value={connectorConfig.instagramBusinessAccountId || ""}
                  onChange={(e) =>
                    setConnectorConfig({ ...connectorConfig, instagramBusinessAccountId: e.target.value })
                  }
                  placeholder="Instagram Business Account ID"
                  className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-1.5 text-white"
                />
                <input
                  type="password"
                  value={connectorConfig.instagramAccessToken || ""}
                  onChange={(e) => setConnectorConfig({ ...connectorConfig, instagramAccessToken: e.target.value })}
                  placeholder="Instagram Graph Access Token (instagram_content_publish)"
                  className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-1.5 text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-white/10 pt-3">
              <button
                type="button"
                onClick={() => setConnectorModalOpen(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => saveConnectors(connectorConfig)}
                className="rounded-xl bg-[#e4b86a] px-4 py-2 text-xs font-bold text-[#1a1408]"
              >
                Save API Connectors
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
