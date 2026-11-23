/**
 * Noctis Deep Research Agent (`Studio 4`) & Safe Web Reader
 * Capabilities #3 (Web research), #4 (Deep research), #28 (Verified URL reader), #34 (Citations), #35 (Context manager),
 * and #51-#60 (Literature review, Source ranking, Citation verification, Paper/Patent/Standards analysis).
 */

import { sha256Sync } from "../universal-crypto.ts";
import { performLiveWebSearch } from "../noctis-live-search.server.ts";
import { validateSafeSourceAcquisition } from "../noctis-deep-research.ts";
import { hybridSearchNdkrs } from "../ndkrs/hybrid-retrieval.server.ts";
import {
  analyzeTemporalSequence,
  calibrateEpistemicConfidence,
  detectCrossSourceContradictions,
} from "../catalog260/dependability-suite.server.ts";

const PRIVATE_OR_METADATA_HOST_RE =
  /^(?:localhost|0\.0\.0\.0|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|169\.254\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[0-1])\.\d+\.\d+|\[?::1\]?|\[?fe80:.*|.*\.local|.*\.internal)$/i;

export function isUrlSafeFromSsrf(rawUrl: string): { safe: boolean; reason?: string; parsedUrl?: URL } {
  let u: URL;
  try {
    u = new URL(rawUrl.trim());
  } catch {
    return { safe: false, reason: "Invalid URL syntax." };
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") {
    return { safe: false, reason: `Blocked disallowed scheme '${u.protocol}'. Only http/https allowed.` };
  }
  if (PRIVATE_OR_METADATA_HOST_RE.test(u.hostname)) {
    return { safe: false, reason: `SSRF guard blocked private/loopback/metadata host '${u.hostname}'.` };
  }
  return { safe: true, parsedUrl: u };
}

function stripHtmlTags(html: string): { title: string; cleanText: string; links: string[] } {
  const titleM = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = (titleM?.[1] || "").replace(/\s+/g, " ").trim().slice(0, 140);
  const links = [...html.matchAll(/href=["'](https?:\/\/[^"']+)["']/gi)].map((m) => m[1]!).slice(0, 15);
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  return { title, cleanText: body.slice(0, 12000), links };
}

/** #3 / #28 SSRF-Protected Live Web Page Reader & Prompt-Injection Quarantine */
export async function fetchWebPageVerified(rawUrl: string) {
  const guard = isUrlSafeFromSsrf(rawUrl);
  if (!guard.safe || !guard.parsedUrl) {
    return {
      ok: false as const,
      ssrfBlocked: true,
      url: rawUrl,
      error: guard.reason || "Blocked URL.",
    };
  }

  try {
    const res = await fetch(guard.parsedUrl.toString(), {
      method: "GET",
      headers: { "user-agent": "Noctis-Verified-Research-Reader/1.0" },
      signal: AbortSignal.timeout(4500),
    });
    const rawText = (await res.text()).slice(0, 250_000);
    const extracted = /<html|<body|<p\b/i.test(rawText)
      ? stripHtmlTags(rawText)
      : { title: guard.parsedUrl.hostname, cleanText: rawText.slice(0, 12000), links: [] };

    const acq = validateSafeSourceAcquisition(
      guard.parsedUrl.toString(),
      extracted.cleanText,
      "sovereign-tenant",
      "public",
    );

    return {
      ok: res.ok,
      ssrfBlocked: false,
      httpStatus: res.status,
      url: guard.parsedUrl.toString(),
      title: extracted.title || guard.parsedUrl.hostname,
      excerpt: acq.sanitizedText.slice(0, 3500),
      linksFound: extracted.links,
      quarantinedInjections: acq.quarantinedInjection ? 1 : 0,
      contentSha256: sha256Sync(acq.sanitizedText),
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      ok: false as const,
      ssrfBlocked: false,
      url: guard.parsedUrl.toString(),
      error: err instanceof Error ? err.message : "Network fetch failed.",
    };
  }
}

async function fetchWikipediaSummary(query: string) {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query.slice(0, 100))}&limit=3&format=json`,
      { signal: AbortSignal.timeout(3000) },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as [string, string[], string[], string[]];
    const titles = Array.isArray(data[1]) ? data[1] : [];
    const descs = Array.isArray(data[2]) ? data[2] : [];
    const urls = Array.isArray(data[3]) ? data[3] : [];
    return titles.map((t, i) => ({
      title: t,
      url: urls[i] || `https://en.wikipedia.org/wiki/${encodeURIComponent(t)}`,
      snippet: descs[i] || t,
      authorityScore: 72,
      tier: "Tier-2-Encyclopedic",
    }));
  } catch {
    return [];
  }
}

/** #4 / #51 / #52 / #53 / #54 / #58 Multi-Step Deep Research Agent */
export async function runDeepResearchAgent(input: {
  query: string;
  maxSources?: number;
  includeLiveWeb?: boolean;
  includeNdkrs?: boolean;
}) {
  const q = (input.query || "").trim();
  const researchPlan = [
    `1. Clarify core question and sub-claims for: "${q.slice(0, 120)}"`,
    "2. Query verified internal NDKRS hybrid semantic + BM25 knowledge store",
    "3. Corroborate via public live web & encyclopedic APIs (if enabled)",
    "4. Rank sources by authority/relevance/freshness, detect contradictions (#253), and calibrate confidence (#254)",
  ];

  const [ndkrsHits, webHits, wikiHits] = await Promise.all([
    input.includeNdkrs !== false ? hybridSearchNdkrs(q, { limit: 6 }).catch(() => []) : Promise.resolve([]),
    input.includeLiveWeb !== false ? performLiveWebSearch(q).catch(() => []) : Promise.resolve([]),
    input.includeLiveWeb !== false ? fetchWikipediaSummary(q) : Promise.resolve([]),
  ]);

  const seenUrls = new Set<string>();
  const rankedSources: {
    index: number;
    title: string;
    url: string;
    tier: string;
    authorityScore: number;
    snippet: string;
    sha256: string;
  }[] = [];

  for (const h of ndkrsHits) {
    const url = h.sourceUri || `ndkrs://${h.canonicalKey}`;
    if (seenUrls.has(url)) continue;
    seenUrls.add(url);
    rankedSources.push({
      index: rankedSources.length + 1,
      title: `${h.title} (${h.citationLabel || h.canonicalKey})`,
      url,
      tier: `Tier-1-NDKRS-${h.domain}`,
      authorityScore: 95,
      snippet: h.excerpt.slice(0, 260),
      sha256: sha256Sync(h.excerpt),
    });
  }

  for (const w of webHits) {
    if (seenUrls.has(w.url)) continue;
    seenUrls.add(w.url);
    rankedSources.push({
      index: rankedSources.length + 1,
      title: w.title,
      url: w.url,
      tier: w.sourceTier,
      authorityScore: w.sourceTier === "Tier-1-Authoritative" ? 90 : w.sourceTier === "Tier-2-Vendor-Primary" ? 78 : 65,
      snippet: w.snippet.slice(0, 260),
      sha256: sha256Sync(w.snippet),
    });
  }

  for (const wk of wikiHits) {
    if (seenUrls.has(wk.url)) continue;
    seenUrls.add(wk.url);
    rankedSources.push({
      index: rankedSources.length + 1,
      title: wk.title,
      url: wk.url,
      tier: wk.tier,
      authorityScore: wk.authorityScore,
      snippet: wk.snippet.slice(0, 260),
      sha256: sha256Sync(wk.snippet),
    });
  }

  const bounded = rankedSources
    .sort((a, b) => b.authorityScore - a.authorityScore)
    .slice(0, Math.max(1, Math.min(12, input.maxSources || 8)))
    .map((s, idx) => ({ ...s, index: idx + 1 }));

  const passages = bounded.map((s) => `[${s.index}] ${s.title}: ${s.snippet}`);
  const contradictions = detectCrossSourceContradictions(passages);
  const temporal = analyzeTemporalSequence(`${q}\n${passages.join("\n")}`);
  const confidence = calibrateEpistemicConfidence(passages.join(" ") || q, bounded.length);

  const reportMarkdown = [
    `## Deep Research Synthesis — ${q.slice(0, 90)}`,
    `- **Sources Corroborated:** ${bounded.length} · **Confidence (#254):** \`${confidence.calibratedConfidence}\` band \`${confidence.confidenceBand}\` · **Contradictions (#253):** \`${contradictions.status}\``,
    "",
    "### Research Execution Plan",
    ...researchPlan.map((step) => `- ${step}`),
    "",
    "### Evidence-Grounded Findings & Inline Citations",
    ...(bounded.length > 0
      ? bounded.map((s) => `- **[${s.index}] ${s.title}** (\`${s.tier}\`, score ${s.authorityScore}/100): ${s.snippet} [Source](${s.url})`)
      : ["- No verified external or NDKRS passages matched directly; widen query terms or ingest authoritative primary source."]),
    "",
    "### Uncertainty & Contradiction Check",
    `- ${temporal.temporalGuardNote}`,
    ...(contradictions.conflicts.length > 0
      ? contradictions.conflicts.map((c) => `- **Conflict (${c.topic}):** ${c.reason}`)
      : ["- No direct normative or numeric unit contradictions observed across gathered snippets."]),
  ].join("\n");

  return {
    query: q,
    researchPlan,
    sourcesCount: bounded.length,
    rankedSources: bounded,
    contradictions,
    temporalAnalysis: temporal,
    epistemicConfidence: confidence,
    reportMarkdown,
    auditSha256: sha256Sync(reportMarkdown),
  };
}

/** #55 Structured Academic Paper Extractor */
export function analyzeAcademicPaper(paperText: string) {
  const sentences = (paperText || "").split(/(?<=[.!?])\s+|\r?\n+/).map((s) => s.trim()).filter(Boolean);
  const extract = (re: RegExp) => sentences.filter((s) => re.test(s)).slice(0, 4);
  return {
    sentenceCount: sentences.length,
    hypothesisOrObjective: extract(/\b(hypothes|objective|aim|we investigate|we examine|study evaluates)\b/i),
    methods: extract(/\b(method|cohort|randomized|controlled|sample|protocol|p\s*[<>=]|n\s*=)\b/i),
    results: extract(/\b(result|found|significant|increase|decrease|accuracy|ci\b|hazard ratio|odds ratio)\b/i),
    limitations: extract(/\b(limitation|caveat|bias|small sample|retrospective|future work|confound)\b/i),
  };
}

/** #56 Public Patent Claim & CPC Focus Analyzer */
export function analyzePublicPatent(patentTextOrTopic: string) {
  const claims = [...patentTextOrTopic.matchAll(/(?:^|\n)\s*(\d+)\.\s+([^\n]+)/g)].map((m) => ({
    claimNumber: Number(m[1]),
    isIndependent: !/\bof\s+claim\s+\d+|according\s+to\s+claim\b/i.test(m[2]!),
    preview: m[2]!.slice(0, 180),
  }));
  const cpcHint = /\b(ai|neural|language\s+model|transformer)\b/i.test(patentTextOrTopic)
    ? "G06N 3/08 / G06F 40/00 (AI & NLP)"
    : /\b(security|encrypt|auth|firewall|zero\s+trust)\b/i.test(patentTextOrTopic)
      ? "H04L 9/00 / G06F 21/00 (Cybersecurity)"
      : "G06Q / G06F (Computing Systems)";
  return {
    claimsExtracted: claims,
    suggestedCpcClassification: cpcHint,
    priorArtSearchQueries: [
      `${patentTextOrTopic.slice(0, 50)} site:patents.google.com`,
      `${patentTextOrTopic.slice(0, 50)} USPTO prior art classification`,
    ],
  };
}

/** #57 Regulatory & Technical Standards Comparison */
export function compareRegulatoryStandards(stdA: string, stdB: string) {
  const a = stdA.trim();
  const b = stdB.trim();
  return {
    standardA: a,
    standardB: b,
    crosswalkSummary: `Jurisdictional & technical comparison between ${a} and ${b}.`,
    comparisonAxes: [
      { axis: "Governance Authority", standardA: a, standardB: b, note: "Enforce stricter statutory/regulatory mandate when boundaries overlap (SQDEC Safety > Compliance)." },
      { axis: "Control Granularity & Evidence", standardA: "Baseline controls + ODP parameters", standardB: "Assessment objective evidence & continuous monitoring", note: "Map shared control families without conflating distinct approving authorities (e.g., FedRAMP != DoD AO != IC AO)." },
    ],
  };
}

/** #35 Long-Conversation Context Window Manager */
export function buildManagedContextWindow(input: {
  turns: { role: string; content: string }[];
  memorySnippets?: string[];
  projectInstructions?: string;
  maxChars?: number;
}) {
  const cap = Math.max(800, Math.min(24000, input.maxChars || 6000));
  const pinned: string[] = [];
  if (input.projectInstructions) pinned.push(`[PROJECT INSTRUCTIONS] ${input.projectInstructions}`);
  if (input.memorySnippets?.length) pinned.push(`[USER MEMORY] ${input.memorySnippets.join(" | ")}`);

  const recentTurns = input.turns.slice(-6);
  const olderTurns = input.turns.slice(0, Math.max(0, input.turns.length - 6));
  const condensedOlder =
    olderTurns.length > 0
      ? `[SUMMARY OF ${olderTurns.length} EARLIER TURNS] Topics discussed: ${olderTurns
          .map((t) => t.content.slice(0, 60))
          .join(" ; ")
          .slice(0, 600)}`
      : "";

  const assembled = [
    ...pinned,
    ...(condensedOlder ? [condensedOlder] : []),
    ...recentTurns.map((t) => `${t.role.toUpperCase()}: ${t.content}`),
  ]
    .join("\n")
    .slice(0, cap);

  return {
    totalInputTurns: input.turns.length,
    olderTurnsCondensed: olderTurns.length,
    recentTurnsPreserved: recentTurns.length,
    pinnedMemoryCount: input.memorySnippets?.length || 0,
    assembledChars: assembled.length,
    contextPrompt: assembled,
  };
}
