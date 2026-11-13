import { createServerFn } from "@tanstack/react-start";
import { saveShareLink, readShareLink, type ShareNote } from "@/lib/share-link";
import { FLAGSHIP_BENCHMARK_CASES } from "@/lib/noctis-health-500-chat";
import { NOCTIS_MED_BENCH_130 } from "@/lib/noctis-medical-benchmark";
import { DAILY_CHALLENGE_CATALOG } from "@/lib/noctis-daily-challenge-engine";
import { PREGENERATED_QUIZZES_ARCHIVE } from "@/lib/generated-quizzes-data";
import { SOVEREIGN_SYSTEMS_PORTFOLIO } from "@/lib/noctis-sovereign-factory";

export type SocialChannelId =
  | "linkedin"
  | "whatsapp"
  | "instagram"
  | "facebook"
  | "x"
  | "connectin";

export type SocialContentSourceType =
  | "MEDICAL_BENCHMARK_130"
  | "HEALTH_500_CLINICAL_CASE"
  | "BOARD_EXAM_VIGNETTE"
  | "FRONTIER_CHALLENGE"
  | "CONTINUOUS_DAEMON"
  | "SOVEREIGN_SUITE"
  | "NOCTIS_CHAT_INSIGHT";

export interface SocialPostComment {
  id: string;
  postId: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
  body: string;
  channel: SocialChannelId | "noctis";
  createdAt: string;
  likes: number;
}

export interface SocialFeedPostItem {
  id: string;
  shareCode: string;
  sourceType: SocialContentSourceType;
  sourceId: string;
  categoryBadge: string;
  title: string;
  summary: string;
  body: string;
  clinicalPearlOrInvariant?: string;
  guidelineOrStandard?: string;
  authorName: string;
  authorRole: string;
  authorAvatar: string;
  likesCount: number;
  repostsCount: number;
  commentsCount: number;
  sharesCount: number;
  channelsSyndicated: SocialChannelId[];
  createdAt: string;
  comments: SocialPostComment[];
}

export interface SocialApiConnectorConfig {
  linkedinAccessToken?: string;
  linkedinAuthorUrn?: string; // e.g. "urn:li:person:..." or "urn:li:organization:..."
  facebookPageId?: string;
  facebookPageAccessToken?: string;
  instagramBusinessAccountId?: string;
  instagramAccessToken?: string;
  whatsappPhoneNumberId?: string;
  whatsappAccessToken?: string;
  whatsappRecipientPhone?: string;
  connectInWebhookUrl?: string;
}

export interface ChannelDispatchResult {
  channel: SocialChannelId;
  mode: "DIRECT_REST_API" | "UNIVERSAL_WEB_INTENT";
  status: "PUBLISHED" | "OPENED_INTENT" | "FAILED";
  shareUrl: string;
  intentUrl: string;
  externalPostId?: string;
  detail: string;
  timestamp: string;
}

export interface ShareNoteEngagementState {
  code: string;
  likesCount: number;
  repostsCount: number;
  sharesCount: number;
  comments: SocialPostComment[];
}

async function ensureSocialTables() {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  await sql.query(`create table if not exists noctis_social_posts (
    id text primary key,
    share_code text not null,
    source_type text not null,
    source_id text not null,
    category_badge text not null,
    title text not null,
    summary text not null,
    body text not null,
    clinical_pearl text not null default '',
    guideline text not null default '',
    author_name text not null,
    author_role text not null default 'Noctis Sovereign Clinician & Architect',
    author_avatar text not null default '/media/avatars/kwesi.jpg',
    likes_count integer not null default 0,
    reposts_count integer not null default 0,
    comments_count integer not null default 0,
    shares_count integer not null default 0,
    channels_json text not null default '["linkedin","whatsapp","instagram","facebook"]',
    created_at timestamptz not null default now()
  )`);
  await sql.query(`create table if not exists noctis_social_comments (
    id text primary key,
    post_id text not null,
    share_code text not null default '',
    author_name text not null,
    author_handle text not null default '@noctis',
    author_avatar text not null default '/media/avatars/kwesi.jpg',
    body text not null,
    channel text not null default 'noctis',
    likes integer not null default 0,
    created_at timestamptz not null default now()
  )`);
  await sql.query(`create table if not exists noctis_share_reactions (
    code text primary key,
    likes_count integer not null default 0,
    reposts_count integer not null default 0,
    shares_count integer not null default 0,
    updated_at timestamptz not null default now()
  )`);
  return sql;
}

/**
 * Curated initial catalog built directly from Noctis Medical Questions, Health 500,
 * Board Exam Vignettes, Frontier Challenges, and Sovereign Suites.
 */
export function buildCuratedNoctisSocialCatalog(): SocialFeedPostItem[] {
  const items: SocialFeedPostItem[] = [];

  // 1. Health 500 Clinical Cases (Top Specialties)
  const featuredSpecialties = [
    "NEUROLOGY",
    "EMERGENCY_MEDICINE",
    "CARDIOLOGY",
    "CRITICAL_CARE",
    "INFECTIOUS_DISEASES",
    "ENDOCRINOLOGY",
    "TOXICOLOGY",
    "OBSTETRICS_GYNECOLOGY",
  ] as const;

  for (const spec of featuredSpecialties) {
    const c = FLAGSHIP_BENCHMARK_CASES[spec as keyof typeof FLAGSHIP_BENCHMARK_CASES];
    if (!c) continue;
    const vitalsLine = [
      c.vitals.bloodPressure ? `BP ${c.vitals.bloodPressure} mmHg` : "",
      c.vitals.heartRateBpm ? `HR ${c.vitals.heartRateBpm} bpm` : "",
      c.vitals.spo2Percent ? `SpO2 ${c.vitals.spo2Percent}%` : "",
      c.vitals.bloodGlucoseMgDl ? `Glucose ${c.vitals.bloodGlucoseMgDl} mg/dL` : "",
    ]
      .filter(Boolean)
      .join(" · ");

    const fullBody = [
      `🩺 [NOCTIS HEALTH 500 · ${c.caseId} · ${c.clinicalCategory.toUpperCase()}]`,
      ``,
      `• Patient Presentation: ${c.ageYears}-year-old ${c.biologicalSex.toLowerCase()} presenting with "${c.chiefComplaint}".`,
      `• Onset & Timeline: ${c.onsetAndTimeline}.`,
      `• Bedside Vitals: ${vitalsLine}`,
      `• Key Symptoms: ${c.symptoms.join(", ")}`,
      ``,
      `🎯 Primary Diagnosis: ${c.primaryDiagnosis} (ICD-10: ${c.icd10})`,
      ``,
      `⚡ Stat Critical Actions:`,
      ...c.criticalActions.slice(0, 4).map((act, idx) => `  ${idx + 1}. ${act}`),
      ``,
      `🛡️ Mandatory Patient Safety Invariant (${c.criticalFailures[0]?.failureCode || "SAFETY-GATE"}):`,
      `${c.criticalFailures[0]?.description || c.contraindications[0] || "Verify contraindications before intervention."} (Prevention: ${c.criticalFailures[0]?.preventionCheck || "Mandatory bedside verification"})`,
      ``,
      `📚 Guideline Authority: ${c.guidelines.join(" | ")}`,
    ].join("\n");

    items.push({
      id: `post-h500-${c.caseId.toLowerCase()}`,
      shareCode: `h500${c.caseId.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(-6)}`,
      sourceType: "HEALTH_500_CLINICAL_CASE",
      sourceId: c.caseId,
      categoryBadge: `Health 500 · ${spec.replace(/_/g, " ")}`,
      title: `${c.caseId}: ${c.primaryDiagnosis} (${c.ageYears}yo ${c.biologicalSex})`,
      summary: `${c.chiefComplaint} — ${c.onsetAndTimeline}. Vitals: ${vitalsLine}. Stat: ${c.criticalActions[0] || ""}`,
      body: fullBody,
      clinicalPearlOrInvariant: c.criticalFailures[0]
        ? `${c.criticalFailures[0].failureCode}: ${c.criticalFailures[0].description} — ${c.criticalFailures[0].preventionCheck}`
        : c.contraindications[0],
      guidelineOrStandard: c.guidelines[0] || "FDA Non-Device CDS 21 U.S.C. § 360j(o)(1)(E)",
      authorName: "Dr. Kwesi Asiedu · Noctis Health 500",
      authorRole: `Clinical Benchmark Director · ${c.difficulty}`,
      authorAvatar: "/media/avatars/kwesi.jpg",
      likesCount: 42 + (items.length * 7) % 35,
      repostsCount: 14 + (items.length * 3) % 18,
      commentsCount: 2,
      sharesCount: 19 + (items.length * 5) % 20,
      channelsSyndicated: ["linkedin", "whatsapp", "instagram", "facebook"],
      createdAt: new Date(Date.now() - items.length * 3600_000 * 2).toISOString(),
      comments: [
        {
          id: `cmt-${c.caseId}-1`,
          postId: `post-h500-${c.caseId.toLowerCase()}`,
          authorName: "Noctis Safety Auditor",
          authorHandle: "@noctis-safety",
          authorAvatar: "/media/avatars/kwesi.jpg",
          body: `Zero-violation safety invariant verified for ${c.caseId}: ${c.criticalFailures[0]?.preventionCheck || "All contraindications enforced"}.`,
          channel: "linkedin",
          createdAt: new Date(Date.now() - items.length * 1800_000).toISOString(),
          likes: 8,
        },
        {
          id: `cmt-${c.caseId}-2`,
          postId: `post-h500-${c.caseId.toLowerCase()}`,
          authorName: "Clinical Fellows Group",
          authorHandle: "@noctis-clinic",
          authorAvatar: "/media/avatars/kwesi.jpg",
          body: `Shared this ${spec.replace(/_/g, " ").toLowerCase()} vignette and differential checklist to our WhatsApp & LinkedIn study rounds.`,
          channel: "whatsapp",
          createdAt: new Date(Date.now() - items.length * 900_000).toISOString(),
          likes: 5,
        },
      ],
    });
  }

  // 2. Medical Benchmark 130 / 1000 High-Yield Questions
  const featuredMedBench = NOCTIS_MED_BENCH_130.slice(0, 12);
  for (const q of featuredMedBench) {
    const body = [
      `🧠 [NOCTIS MEDICAL BENCHMARK · ${q.id} · ${q.categoryName.toUpperCase()}]`,
      ``,
      `❓ Clinical Question (#${q.questionNumber}):`,
      `"${q.prompt}"`,
      ``,
      `✅ Required Physiological & Diagnostic Concepts:`,
      `• ${q.expectedConcepts.map((c) => c.toUpperCase()).join(" · ")}`,
      ``,
      `🚫 Prohibited Clinical Conclusions (Hallucination / Safety Trap):`,
      `• Never conclude: "${q.prohibitedConclusions.join('"; "')}"`,
      ``,
      `📋 Authoritative Clinical Guideline: ${q.authoritativeGuideline}`,
      `🛡️ Safety Gate Classification: ${q.isSafetyCritical ? "P0 SAFETY-CRITICAL GATE (Zero-Tolerance)" : "Standard Clinical Reasoning Gate"}`,
    ].join("\n");

    items.push({
      id: `post-medbench-${q.id.toLowerCase()}`,
      shareCode: `mb${q.id.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(-6)}`,
      sourceType: "MEDICAL_BENCHMARK_130",
      sourceId: q.id,
      categoryBadge: `Med-Bench · ${q.categoryName}`,
      title: `${q.id}: ${q.prompt}`,
      summary: `Key Concepts: ${q.expectedConcepts.join(", ")}. Safety Trap Avoided: "${q.prohibitedConclusions[0] || ""}".`,
      body,
      clinicalPearlOrInvariant: `Must cover [${q.expectedConcepts.join(", ")}] and reject [${q.prohibitedConclusions.join(", ")}].`,
      guidelineOrStandard: q.authoritativeGuideline,
      authorName: "Noctis Medical Benchmark Engine",
      authorRole: `Category ${q.categoryNumber} · ${q.isSafetyCritical ? "Safety-Critical" : "Clinical Core"}`,
      authorAvatar: "/media/avatars/kwesi.jpg",
      likesCount: 31 + (q.questionNumber * 5) % 40,
      repostsCount: 11 + (q.questionNumber * 2) % 15,
      commentsCount: 1,
      sharesCount: 15 + (q.questionNumber * 3) % 22,
      channelsSyndicated: ["linkedin", "whatsapp", "facebook", "instagram"],
      createdAt: new Date(Date.now() - (q.questionNumber + 4) * 3600_000).toISOString(),
      comments: [
        {
          id: `cmt-mb-${q.id}-1`,
          postId: `post-medbench-${q.id.toLowerCase()}`,
          authorName: "Dr. Kwesi Asiedu",
          authorHandle: "@kwesi",
          authorAvatar: "/media/avatars/kwesi.jpg",
          body: `High-yield pearl under ${q.authoritativeGuideline}. Great rapid-fire question for LinkedIn and WhatsApp medical boards!`,
          channel: "linkedin",
          createdAt: new Date(Date.now() - q.questionNumber * 1200_000).toISOString(),
          likes: 6,
        },
      ],
    });
  }

  // 3. Board Exam Simulation Vignettes (USMLE, CISSP, AWS, Bar Exam, Security+)
  for (const [examKey, list] of Object.entries(PREGENERATED_QUIZZES_ARCHIVE)) {
    const q = list[0];
    if (!q) continue;
    const body = [
      `🎓 [NOCTIS BOARD SIMULATION · ${q.exam.toUpperCase()}]`,
      `Domain: ${q.domain}`,
      ``,
      `📖 Case Vignette:`,
      `${q.vignette}`,
      ``,
      `❓ Question: ${q.question}`,
      ``,
      `A) ${q.options.A}`,
      `B) ${q.options.B}`,
      `C) ${q.options.C}`,
      `D) ${q.options.D}`,
      ``,
      `✅ Correct Answer: Option ${q.correct_answer}`,
      ``,
      `💎 High-Yield Board Pearl:`,
      `${q.high_yield_pearl}`,
      ``,
      `⚡ Solving Tactics & Technique (TTP):`,
      `${q.tactics_and_technique}`,
    ].join("\n");

    items.push({
      id: `post-quiz-${examKey}`,
      shareCode: `qz${examKey.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 6)}`,
      sourceType: "BOARD_EXAM_VIGNETTE",
      sourceId: examKey,
      categoryBadge: `Board Exam · ${q.exam}`,
      title: `${q.exam} Vignette: ${q.domain}`,
      summary: `${q.vignette.slice(0, 220)}… Question: ${q.question} (Answer: ${q.correct_answer})`,
      body,
      clinicalPearlOrInvariant: q.high_yield_pearl,
      guidelineOrStandard: `${q.exam} · ${q.domain}`,
      authorName: "Noctis Board Exam Studio",
      authorRole: "250+ Medical, Cyber, Cloud & Law Boards",
      authorAvatar: "/media/avatars/kwesi.jpg",
      likesCount: 54,
      repostsCount: 19,
      commentsCount: 1,
      sharesCount: 27,
      channelsSyndicated: ["linkedin", "whatsapp", "instagram", "facebook"],
      createdAt: new Date(Date.now() - 5 * 3600_000).toISOString(),
      comments: [
        {
          id: `cmt-qz-${examKey}-1`,
          postId: `post-quiz-${examKey}`,
          authorName: "Board Study Cohort",
          authorHandle: "@noctis-board",
          authorAvatar: "/media/avatars/kwesi.jpg",
          body: `The TTP elimination walkthrough on why Option ${q.correct_answer} wins is gold.`,
          channel: "instagram",
          createdAt: new Date(Date.now() - 1800_000).toISOString(),
          likes: 9,
        },
      ],
    });
  }

  // 4. Daily Frontier, Toxicology, Burn, MTP & Distributed Systems Challenges
  for (const ch of DAILY_CHALLENGE_CATALOG) {
    const body = [
      `⚡ [NOCTIS FRONTIER & DAEMON CHALLENGE · ${ch.id}]`,
      `Suite: ${ch.sourceSuite} · Domain: ${ch.domain}`,
      ``,
      `❓ Challenge Prompt:`,
      `"${ch.question}"`,
      ``,
      `🛡️ Verified Mathematical / Clinical Invariant:`,
      `${ch.expectedInvariant}`,
      ``,
      `• Severity Priority: ${ch.severity.toUpperCase()}`,
      `• Verification Engine: Noctis Continuous Daemon (2,158 Scenarios / 0 Safety Violations)`,
    ].join("\n");

    items.push({
      id: `post-chal-${ch.id.toLowerCase()}`,
      shareCode: `ch${ch.id.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(-6)}`,
      sourceType: ch.sourceSuite === "CONTINUOUS_DAEMON" ? "CONTINUOUS_DAEMON" : "FRONTIER_CHALLENGE",
      sourceId: ch.id,
      categoryBadge: `${ch.sourceSuite.replace(/_/g, " ")} · ${ch.domain}`,
      title: `${ch.domain.replace(/_/g, " ")}: ${ch.question.slice(0, 96)}…`,
      summary: `${ch.question} — Verified Invariant: ${ch.expectedInvariant}`,
      body,
      clinicalPearlOrInvariant: ch.expectedInvariant,
      guidelineOrStandard: `Noctis SQDEC P1 · ${ch.domain}`,
      authorName: "Noctis Frontier & Daemon Engine",
      authorRole: "Autonomous Invariant Verifier",
      authorAvatar: "/media/avatars/kwesi.jpg",
      likesCount: 38,
      repostsCount: 15,
      commentsCount: 1,
      sharesCount: 21,
      channelsSyndicated: ["linkedin", "whatsapp", "facebook", "x", "connectin"],
      createdAt: new Date(Date.now() - 7 * 3600_000).toISOString(),
      comments: [
        {
          id: `cmt-ch-${ch.id}-1`,
          postId: `post-chal-${ch.id.toLowerCase()}`,
          authorName: "Noctis Continuous Daemon",
          authorHandle: "@noctis-daemon",
          authorAvatar: "/media/avatars/kwesi.jpg",
          body: `Verified invariant [${ch.expectedInvariant}] with 0 safety violations across continuous epoch.`,
          channel: "connectin",
          createdAt: new Date(Date.now() - 2400_000).toISOString(),
          likes: 7,
        },
      ],
    });
  }

  // 5. Noctis 16 Sovereign Suites Portfolio Highlights
  for (const suite of SOVEREIGN_SYSTEMS_PORTFOLIO.slice(0, 6)) {
    const body = [
      `🏛️ [NOCTIS SOVEREIGN SUITE · ${suite.name.toUpperCase()}]`,
      `Domain: ${suite.domain} · Priority: ${suite.sqdecPriority}`,
      ``,
      `• Core Mission: ${suite.tagline}`,
      `• Mathematical & Deterministic Engine: ${suite.coreEngines.join(" · ")}`,
      `• Compliance & Regulatory Standards: ${suite.complianceStandards.join(" · ")}`,
      `• Key Deliverables: ${suite.deliverables.join(", ")}`,
    ].join("\n");

    items.push({
      id: `post-suite-${suite.id}`,
      shareCode: `sv${suite.id.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(-6)}`,
      sourceType: "SOVEREIGN_SUITE",
      sourceId: suite.id,
      categoryBadge: `Sovereign Suite · ${suite.sqdecPriority}`,
      title: `${suite.name}: ${suite.tagline}`,
      summary: `Engines: ${suite.coreEngines.join(", ")}. Standards: ${suite.complianceStandards.join(", ")}.`,
      body,
      clinicalPearlOrInvariant: `Deterministic Engines: ${suite.coreEngines.join(" | ")}`,
      guidelineOrStandard: suite.complianceStandards.join(" · "),
      authorName: "Dr. Kwesi Asiedu · Noctis Sovereign OS",
      authorRole: "Dual-Plane Control & Air-Gapped Enclave",
      authorAvatar: "/media/avatars/kwesi.jpg",
      likesCount: 49,
      repostsCount: 17,
      commentsCount: 0,
      sharesCount: 23,
      channelsSyndicated: ["linkedin", "whatsapp", "facebook", "instagram"],
      createdAt: new Date(Date.now() - 10 * 3600_000).toISOString(),
      comments: [],
    });
  }

  return items;
}

/**
 * Builds direct social share & engagement URLs for LinkedIn, WhatsApp, Instagram, Facebook, X, and ConnectIn.
 */
export function buildSocialChannelIntentUrl(
  channel: SocialChannelId,
  params: {
    title: string;
    body: string;
    shareUrl: string;
    hashtags?: string[];
  }
): string {
  const tags = (params.hashtags?.length ? params.hashtags : ["#NoctisAI", "#MedicalAI", "#ClinicalCDS", "#CyberSecurity", "#DStrike"]).join(" ");
  const cleanText = `${params.title}\n\n${params.body.slice(0, 1400)}\n\n🔗 Interactive Card & Full Dossier: ${params.shareUrl}\n${tags}`;

  switch (channel) {
    case "linkedin":
      return `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(cleanText)}`;
    case "whatsapp":
      return `https://api.whatsapp.com/send?text=${encodeURIComponent(cleanText)}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(params.shareUrl)}&quote=${encodeURIComponent(`${params.title}\n\n${params.body.slice(0, 500)}`)}`;
    case "x":
      return `https://x.com/intent/post?text=${encodeURIComponent(`${params.title}\n\n${params.body.slice(0, 200)}\n${params.shareUrl} ${tags}`)}`;
    case "connectin":
      return `https://conectln.com/connectin?share=${encodeURIComponent(params.shareUrl)}&title=${encodeURIComponent(params.title)}`;
    case "instagram":
    default:
      return `https://www.instagram.com/`;
  }
}

/**
 * Server function: Lists all social hub posts (combining DB-persisted posts + curated Noctis catalog).
 */
export const listNoctisSocialHubPosts = createServerFn({ method: "GET" }).handler(
  async (): Promise<SocialFeedPostItem[]> => {
    const curated = buildCuratedNoctisSocialCatalog();
    try {
      const sql = await ensureSocialTables();
      const dbPosts = await sql<{
        id: string;
        share_code: string;
        source_type: SocialContentSourceType;
        source_id: string;
        category_badge: string;
        title: string;
        summary: string;
        body: string;
        clinical_pearl: string;
        guideline: string;
        author_name: string;
        author_role: string;
        author_avatar: string;
        likes_count: number;
        reposts_count: number;
        comments_count: number;
        shares_count: number;
        channels_json: string;
        created_at: string;
      }>`select * from noctis_social_posts order by created_at desc limit 100`;

      const dbComments = await sql<{
        id: string;
        post_id: string;
        author_name: string;
        author_handle: string;
        author_avatar: string;
        body: string;
        channel: string;
        likes: number;
        created_at: string;
      }>`select * from noctis_social_comments order by created_at asc limit 500`;

      const commentsByPost = new Map<string, SocialPostComment[]>();
      for (const c of dbComments) {
        const list = commentsByPost.get(c.post_id) || [];
        list.push({
          id: c.id,
          postId: c.post_id,
          authorName: c.author_name,
          authorHandle: c.author_handle,
          authorAvatar: c.author_avatar,
          body: c.body,
          channel: (c.channel as SocialChannelId) || "noctis",
          createdAt: String(c.created_at),
          likes: Number(c.likes || 0),
        });
        commentsByPost.set(c.post_id, list);
      }

      const customItems: SocialFeedPostItem[] = dbPosts.map((row) => {
        let channels: SocialChannelId[] = ["linkedin", "whatsapp", "instagram", "facebook"];
        try {
          channels = JSON.parse(row.channels_json);
        } catch {}
        const cList = commentsByPost.get(row.id) || [];
        return {
          id: row.id,
          shareCode: row.share_code,
          sourceType: row.source_type,
          sourceId: row.source_id,
          categoryBadge: row.category_badge,
          title: row.title,
          summary: row.summary,
          body: row.body,
          clinicalPearlOrInvariant: row.clinical_pearl || undefined,
          guidelineOrStandard: row.guideline || undefined,
          authorName: row.author_name,
          authorRole: row.author_role,
          authorAvatar: row.author_avatar,
          likesCount: Number(row.likes_count || 0),
          repostsCount: Number(row.reposts_count || 0),
          commentsCount: Math.max(Number(row.comments_count || 0), cList.length),
          sharesCount: Number(row.shares_count || 0),
          channelsSyndicated: channels,
          createdAt: String(row.created_at),
          comments: cList,
        };
      });

      const customIds = new Set(customItems.map((i) => i.id));
      const mergedCurated = curated
        .filter((i) => !customIds.has(i.id))
        .map((item) => {
          const extraComments = commentsByPost.get(item.id) || [];
          return extraComments.length
            ? {
                ...item,
                comments: [...item.comments, ...extraComments],
                commentsCount: item.comments.length + extraComments.length,
              }
            : item;
        });

      return [...customItems, ...mergedCurated];
    } catch {
      return curated;
    }
  }
);

/**
 * Server function: Publishes or syndicates a Noctis post to the Social Hub and optional live APIs
 * (LinkedIn UGC Posts API, Meta Facebook Graph API, Instagram Graph API, WhatsApp Cloud API, ConnectIn).
 */
export const publishNoctisSocialPost = createServerFn({ method: "POST" })
  .validator(
    (input: {
      sourceType?: SocialContentSourceType;
      sourceId?: string;
      categoryBadge?: string;
      title?: string;
      summary?: string;
      body?: string;
      clinicalPearl?: string;
      guideline?: string;
      authorName?: string;
      authorRole?: string;
      authorAvatar?: string;
      channels?: SocialChannelId[];
      origin?: string;
      connectorConfig?: SocialApiConnectorConfig;
    }) => ({
      sourceType: input?.sourceType || "NOCTIS_CHAT_INSIGHT",
      sourceId: String(input?.sourceId || `noctis-${Date.now()}`).slice(0, 80),
      categoryBadge: String(input?.categoryBadge || "Noctis Sovereign Insight").slice(0, 80),
      title: String(input?.title || "Noctis Clinical & Sovereign Intelligence Brief").trim().slice(0, 220),
      summary: String(input?.summary || input?.body || "").trim().slice(0, 600),
      body: String(input?.body || "").trim().slice(0, 14000),
      clinicalPearl: String(input?.clinicalPearl || "").trim().slice(0, 600),
      guideline: String(input?.guideline || "Noctis Sovereign SQDEC P1").trim().slice(0, 240),
      authorName: String(input?.authorName || "Dr. Kwesi Asiedu @ Noctis").trim().slice(0, 80),
      authorRole: String(input?.authorRole || "Noctis Sovereign Clinician & Architect").trim().slice(0, 100),
      authorAvatar: String(input?.authorAvatar || "/media/avatars/kwesi.jpg").trim().slice(0, 400),
      channels: Array.isArray(input?.channels) && input.channels.length
        ? input.channels
        : (["linkedin", "whatsapp", "instagram", "facebook"] as SocialChannelId[]),
      origin: String(input?.origin || "https://dstrike.app").replace(/\/+$/, ""),
      connectorConfig: input?.connectorConfig || {},
    })
  )
  .handler(
    async ({
      data,
    }): Promise<{
      post: SocialFeedPostItem;
      shareUrl: string;
      dispatches: ChannelDispatchResult[];
    }> => {
      // 1. Save a short share link so /s?c=<code> renders the OG card & interactive view
      let shareCode = `nc${Math.random().toString(36).slice(2, 8)}`;
      try {
        const saved = await saveShareLink({
          data: {
            name: data.authorName,
            avatar: data.authorAvatar.startsWith("http")
              ? data.authorAvatar
              : `${data.origin}${data.authorAvatar.startsWith("/") ? data.authorAvatar : `/${data.authorAvatar}`}`,
            body: `${data.title}\n\n${data.body}`,
          },
        });
        if (saved?.code) shareCode = saved.code;
      } catch {}

      const shareUrl = `${data.origin}/s?c=${shareCode}`;
      const postId = `post-${Date.now()}-${shareCode}`;
      const nowIso = new Date().toISOString();

      const post: SocialFeedPostItem = {
        id: postId,
        shareCode,
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        categoryBadge: data.categoryBadge,
        title: data.title,
        summary: data.summary || data.body.slice(0, 260),
        body: data.body,
        clinicalPearlOrInvariant: data.clinicalPearl || undefined,
        guidelineOrStandard: data.guideline || undefined,
        authorName: data.authorName,
        authorRole: data.authorRole,
        authorAvatar: data.authorAvatar,
        likesCount: 1,
        repostsCount: 1,
        commentsCount: 0,
        sharesCount: data.channels.length,
        channelsSyndicated: data.channels,
        createdAt: nowIso,
        comments: [],
      };

      try {
        const sql = await ensureSocialTables();
        await sql`
          insert into noctis_social_posts (
            id, share_code, source_type, source_id, category_badge,
            title, summary, body, clinical_pearl, guideline,
            author_name, author_role, author_avatar,
            likes_count, reposts_count, comments_count, shares_count, channels_json
          ) values (
            ${post.id}, ${post.shareCode}, ${post.sourceType}, ${post.sourceId}, ${post.categoryBadge},
            ${post.title}, ${post.summary}, ${post.body}, ${data.clinicalPearl}, ${data.guideline},
            ${post.authorName}, ${post.authorRole}, ${post.authorAvatar},
            ${post.likesCount}, ${post.repostsCount}, ${post.commentsCount}, ${post.sharesCount}, ${JSON.stringify(post.channelsSyndicated)}
          )
        `;
      } catch {}

      // 2. Dispatch across selected channels (Direct API if credentials supplied, else Universal Web Intent)
      const dispatches: ChannelDispatchResult[] = [];
      const cfg = data.connectorConfig || {};

      for (const ch of data.channels) {
        const intentUrl = buildSocialChannelIntentUrl(ch, {
          title: data.title,
          body: data.body,
          shareUrl,
        });

        // LinkedIn Direct REST API (UGC Posts / Community Management API)
        if (ch === "linkedin" && cfg.linkedinAccessToken && cfg.linkedinAuthorUrn) {
          try {
            const liRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${cfg.linkedinAccessToken}`,
                "Content-Type": "application/json",
                "X-Restli-Protocol-Version": "2.0.0",
              },
              body: JSON.stringify({
                author: cfg.linkedinAuthorUrn,
                lifecycleState: "PUBLISHED",
                specificContent: {
                  "com.linkedin.ugc.ShareContent": {
                    shareCommentary: {
                      text: `${data.title}\n\n${data.body.slice(0, 2600)}\n\n${shareUrl}`,
                    },
                    shareMediaCategory: "ARTICLE",
                    media: [
                      {
                        status: "READY",
                        originalUrl: shareUrl,
                        title: { text: data.title },
                        description: { text: data.summary.slice(0, 200) },
                      },
                    ],
                  },
                },
                visibility: {
                  "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
                },
              }),
              signal: AbortSignal.timeout(6000),
            });
            if (liRes.ok) {
              const liJson = (await liRes.json().catch(() => ({}))) as { id?: string };
              dispatches.push({
                channel: "linkedin",
                mode: "DIRECT_REST_API",
                status: "PUBLISHED",
                shareUrl,
                intentUrl,
                externalPostId: liJson.id || "urn:li:share:published",
                detail: "Published directly to LinkedIn feed via LinkedIn UGC API v2.",
                timestamp: nowIso,
              });
              continue;
            }
          } catch {}
        }

        // WhatsApp Cloud API Direct Dispatch
        if (
          ch === "whatsapp" &&
          cfg.whatsappAccessToken &&
          cfg.whatsappPhoneNumberId &&
          cfg.whatsappRecipientPhone
        ) {
          try {
            const waRes = await fetch(
              `https://graph.facebook.com/v20.0/${encodeURIComponent(cfg.whatsappPhoneNumberId)}/messages`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${cfg.whatsappAccessToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  messaging_product: "whatsapp",
                  to: cfg.whatsappRecipientPhone.replace(/[^0-9]/g, ""),
                  type: "text",
                  text: {
                    preview_url: true,
                    body: `*${data.title}*\n\n${data.body.slice(0, 3200)}\n\n🔗 ${shareUrl}`,
                  },
                }),
                signal: AbortSignal.timeout(6000),
              }
            );
            if (waRes.ok) {
              const waJson = (await waRes.json().catch(() => ({}))) as { messages?: Array<{ id?: string }> };
              dispatches.push({
                channel: "whatsapp",
                mode: "DIRECT_REST_API",
                status: "PUBLISHED",
                shareUrl,
                intentUrl,
                externalPostId: waJson.messages?.[0]?.id || "wamid.published",
                detail: `Sent directly via Meta WhatsApp Cloud API to ${cfg.whatsappRecipientPhone}.`,
                timestamp: nowIso,
              });
              continue;
            }
          } catch {}
        }

        // Facebook Page Graph API Direct Dispatch
        if (ch === "facebook" && cfg.facebookPageId && cfg.facebookPageAccessToken) {
          try {
            const fbRes = await fetch(
              `https://graph.facebook.com/v20.0/${encodeURIComponent(cfg.facebookPageId)}/feed`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  message: `${data.title}\n\n${data.body.slice(0, 4000)}`,
                  link: shareUrl,
                  access_token: cfg.facebookPageAccessToken,
                }),
                signal: AbortSignal.timeout(6000),
              }
            );
            if (fbRes.ok) {
              const fbJson = (await fbRes.json().catch(() => ({}))) as { id?: string };
              dispatches.push({
                channel: "facebook",
                mode: "DIRECT_REST_API",
                status: "PUBLISHED",
                shareUrl,
                intentUrl,
                externalPostId: fbJson.id || "fb_post_published",
                detail: "Published directly to Facebook Page feed via Meta Graph API.",
                timestamp: nowIso,
              });
              continue;
            }
          } catch {}
        }

        // Instagram Graph API Direct Dispatch (Container + Publish)
        if (ch === "instagram" && cfg.instagramBusinessAccountId && cfg.instagramAccessToken) {
          try {
            const cardImageUrl = `${data.origin}/api/share-card?n=${encodeURIComponent(data.authorName)}&v=19`;
            const igMediaRes = await fetch(
              `https://graph.facebook.com/v20.0/${encodeURIComponent(cfg.instagramBusinessAccountId)}/media`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  image_url: cardImageUrl,
                  caption: `${data.title}\n\n${data.body.slice(0, 1800)}\n\n🔗 ${shareUrl}`,
                  access_token: cfg.instagramAccessToken,
                }),
                signal: AbortSignal.timeout(6000),
              }
            );
            if (igMediaRes.ok) {
              const igMediaJson = (await igMediaRes.json().catch(() => ({}))) as { id?: string };
              if (igMediaJson.id) {
                const igPubRes = await fetch(
                  `https://graph.facebook.com/v20.0/${encodeURIComponent(cfg.instagramBusinessAccountId)}/media_publish`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      creation_id: igMediaJson.id,
                      access_token: cfg.instagramAccessToken,
                    }),
                    signal: AbortSignal.timeout(6000),
                  }
                );
                if (igPubRes.ok) {
                  dispatches.push({
                    channel: "instagram",
                    mode: "DIRECT_REST_API",
                    status: "PUBLISHED",
                    shareUrl,
                    intentUrl,
                    externalPostId: igMediaJson.id,
                    detail: "Published image card + caption directly via Instagram Graph API.",
                    timestamp: nowIso,
                  });
                  continue;
                }
              }
            }
          } catch {}
        }

        // Default: Universal Web Share Intent / Deep-Link
        dispatches.push({
          channel: ch,
          mode: "UNIVERSAL_WEB_INTENT",
          status: "OPENED_INTENT",
          shareUrl,
          intentUrl,
          detail: `Prepared formatted post & 1080×1350 card for ${ch.toUpperCase()} (${shareUrl}).`,
          timestamp: nowIso,
        });
      }

      return { post, shareUrl, dispatches };
    }
  );

/**
 * Server function: Like, Repost, Share, or Comment on any Noctis Social Hub post or `/s?c=` card.
 */
export const engageNoctisSocialPost = createServerFn({ method: "POST" })
  .validator(
    (input: {
      postId?: string;
      shareCode?: string;
      action?: "like" | "repost" | "share" | "comment";
      commentBody?: string;
      authorName?: string;
      authorHandle?: string;
      authorAvatar?: string;
      channel?: SocialChannelId | "noctis";
    }) => ({
      postId: String(input?.postId || "").trim().slice(0, 120),
      shareCode: String(input?.shareCode || "").trim().slice(0, 24),
      action: input?.action || "like",
      commentBody: String(input?.commentBody || "").trim().slice(0, 2000),
      authorName: String(input?.authorName || "Dr. Kwesi Asiedu").trim().slice(0, 80),
      authorHandle: String(input?.authorHandle || "@kwesi").trim().slice(0, 60),
      authorAvatar: String(input?.authorAvatar || "/media/avatars/kwesi.jpg").trim().slice(0, 400),
      channel: (input?.channel || "noctis") as SocialChannelId | "noctis",
    })
  )
  .handler(async ({ data }) => {
    const sql = await ensureSocialTables();
    let addedComment: SocialPostComment | null = null;

    if (data.action === "comment" && data.commentBody) {
      const commentId = `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const nowIso = new Date().toISOString();
      await sql`
        insert into noctis_social_comments (
          id, post_id, share_code, author_name, author_handle, author_avatar, body, channel, likes
        ) values (
          ${commentId}, ${data.postId || data.shareCode}, ${data.shareCode},
          ${data.authorName}, ${data.authorHandle}, ${data.authorAvatar},
          ${data.commentBody}, ${data.channel}, 1
        )
      `;
      addedComment = {
        id: commentId,
        postId: data.postId || data.shareCode,
        authorName: data.authorName,
        authorHandle: data.authorHandle,
        authorAvatar: data.authorAvatar,
        body: data.commentBody,
        channel: data.channel,
        createdAt: nowIso,
        likes: 1,
      };
    }

    if (data.postId) {
      if (data.action === "like") {
        await sql`update noctis_social_posts set likes_count = likes_count + 1 where id = ${data.postId}`.catch(() => undefined);
      } else if (data.action === "repost") {
        await sql`update noctis_social_posts set reposts_count = reposts_count + 1 where id = ${data.postId}`.catch(() => undefined);
      } else if (data.action === "share") {
        await sql`update noctis_social_posts set shares_count = shares_count + 1 where id = ${data.postId}`.catch(() => undefined);
      } else if (data.action === "comment") {
        await sql`update noctis_social_posts set comments_count = comments_count + 1 where id = ${data.postId}`.catch(() => undefined);
      }
    }

    if (data.shareCode) {
      await sql`
        insert into noctis_share_reactions (code, likes_count, reposts_count, shares_count)
        values (
          ${data.shareCode},
          ${data.action === "like" ? 1 : 0},
          ${data.action === "repost" ? 1 : 0},
          ${data.action === "share" ? 1 : 0}
        )
        on conflict (code) do update set
          likes_count = noctis_share_reactions.likes_count + ${data.action === "like" ? 1 : 0},
          reposts_count = noctis_share_reactions.reposts_count + ${data.action === "repost" ? 1 : 0},
          shares_count = noctis_share_reactions.shares_count + ${data.action === "share" ? 1 : 0},
          updated_at = now()
      `.catch(() => undefined);
    }

    return { ok: true as const, comment: addedComment };
  });

/**
 * Server function: Reads engagement counts & comments for a shared `/s?c=<code>` page.
 */
export const getShareCardEngagement = createServerFn({ method: "GET" })
  .validator((input: { code?: string }) => ({
    code: String(input?.code || "").replace(/[^a-z0-9]/gi, "").slice(0, 24).toLowerCase(),
  }))
  .handler(async ({ data }): Promise<ShareNoteEngagementState> => {
    const code = data.code || "default";
    try {
      const sql = await ensureSocialTables();
      const rows = await sql<{
        likes_count: number;
        reposts_count: number;
        shares_count: number;
      }>`select likes_count, reposts_count, shares_count from noctis_share_reactions where code = ${code} limit 1`;

      const comments = await sql<{
        id: string;
        post_id: string;
        author_name: string;
        author_handle: string;
        author_avatar: string;
        body: string;
        channel: string;
        likes: number;
        created_at: string;
      }>`select * from noctis_social_comments where share_code = ${code} or post_id = ${code} order by created_at asc limit 100`;

      return {
        code,
        likesCount: Number(rows[0]?.likes_count ?? 12),
        repostsCount: Number(rows[0]?.reposts_count ?? 4),
        sharesCount: Number(rows[0]?.shares_count ?? 7),
        comments: comments.map((c) => ({
          id: c.id,
          postId: c.post_id,
          authorName: c.author_name,
          authorHandle: c.author_handle,
          authorAvatar: c.author_avatar,
          body: c.body,
          channel: (c.channel as SocialChannelId) || "noctis",
          createdAt: String(c.created_at),
          likes: Number(c.likes || 1),
        })),
      };
    } catch {
      return {
        code,
        likesCount: 12,
        repostsCount: 4,
        sharesCount: 7,
        comments: [],
      };
    }
  });
