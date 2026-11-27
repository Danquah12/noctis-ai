/**
 * NOCTIS UNIFIED KNOWLEDGE ROUTER & TABLE FORMATTER
 *
 * Pure TypeScript retrieval, BM25-weighted scoring, Reciprocal Rank Fusion (RRF),
 * and Markdown table synthesis over:
 *   1. All 25 Open Technical Curriculum Tracks (300 subtopics, 100 standards, 100 invariants, 100 anti-patterns)
 *   2. External Neon Postgres / seed `vibe_training_pair` records
 *   3. Continuous 200-domain subsystem summaries
 *
 * Pure TS with relative `.ts` imports only — zero `node:*`, zero `@/` aliases, zero `*.server.ts`.
 */

import {
  generateCurriculumSftRecord,
  getOpenCurriculumStats,
  OPEN_CURRICULUM_TRACKS,
  type CurriculumTrack,
} from "./noctis-open-curriculum-1m.ts";

export type KnowledgeSourceKind =
  | "postgres_training"
  | "open_curriculum"
  | "curriculum_subtopic"
  | "training_domain"
  | "seed_corpus";

export interface KnowledgeRecord {
  id: string;
  source: KnowledgeSourceKind;
  domain: string;
  trackId?: string;
  trackName?: string;
  title: string;
  summary: string;
  content: string;
  standards?: string[];
  invariants?: string[];
  antiPatterns?: string[];
  model?: string;
  hits?: number;
  score: number;
  matchedTerms: string[];
}

export interface KnowledgeSearchOptions {
  track?: string;
  domain?: string;
  source?: "all" | "db" | "curriculum" | "domains";
  limit?: number;
  format?: "json" | "markdown" | "table";
}

export interface KnowledgeSearchResponse {
  ok: true;
  query: string;
  normalizedQuery: string;
  tableRequested: boolean;
  totalIndexedTracks: number;
  totalSubtopics: number;
  totalMatches: number;
  sourcesUsed: string[];
  results: KnowledgeRecord[];
  markdownTable: string;
  markdownReport: string;
  latencyMs: number;
}

export interface ExternalTrainingPairInput {
  id?: string;
  question: string;
  answer: string;
  domain?: string;
  model?: string;
  hits?: number;
  at?: string;
}

export interface ExternalDomainSummaryInput {
  domain: string;
  scenariosCount: number;
  invariantsPassed: number;
  status: string;
}

const ROUTER_STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into", "your", "about",
  "what", "when", "where", "which", "would", "could", "should", "please", "how",
  "why", "can", "are", "was", "were", "have", "has", "had", "does", "did",
  "tell", "give", "show", "make", "put", "list", "use", "using", "based",
  "explain", "describe", "summarize", "summary", "table", "format", "markdown",
  "noctis", "training", "knowledge", "curriculum", "library", "all", "everything",
]);

const TABLE_INTENT_RE =
  /^\s*\/table\b|\b(?:on\s+a\s+table|in\s+a\s+table|as\s+a\s+table|into\s+a\s+table|table\s+format|markdown\s+table|comparison\s+table|matrix\s+table|summary\s+table|tabulate|tabular|side[- ]by[- ]side\s+table|on\s+table|table\s+of\s+(?:tracks|topics|standards|invariants|training|domains|pairs|results))\b/i;

const TRACK_DIRECTORY_RE =
  /^\s*(?:list|show|all|tracks?|curriculum|directory|overview|index)\s*$/i;

export function isTableFormatRequested(query: string): boolean {
  return TABLE_INTENT_RE.test(String(query || ""));
}

export function isTrackDirectoryRequested(query: string): boolean {
  const clean = String(query || "")
    .replace(/^\/(?:knowledge|library|curriculum|table)\s*/i, "")
    .trim();
  if (!clean) return true;
  if (TRACK_DIRECTORY_RE.test(clean)) return true;
  return /\b(?:all\s+25|25\s+(?:open\s+)?(?:technical\s+)?tracks|list\s+(?:all\s+)?(?:curriculum\s+)?tracks|entire\s+curriculum)\b/i.test(clean);
}

export function normalizeKnowledgeQuery(query: string): string {
  return String(query || "")
    .replace(/^\/(?:knowledge|library|curriculum|table)\b\s*/i, "")
    .replace(/\b(?:put|show|display|render|format|present|list)\s+(?:this|it|that|all|these|them|the\s+results?)?\s*(?:on|in|as|into)\s+(?:a\s+)?(?:markdown\s+)?table\b/gi, " ")
    .replace(/\b(?:on|in|as|into)\s+(?:a\s+)?(?:markdown\s+)?table\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenizeKnowledgeQuery(text: string): string[] {
  const raw = String(text || "")
    .toLowerCase()
    .replace(/c\+\+/g, " cpp ")
    .replace(/c#/g, " csharp ")
    .replace(/[^a-z0-9.+-]+/g, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^[.+-]+|[.+-]+$/g, ""))
    .filter((t) => t.length >= 2 && !ROUTER_STOP_WORDS.has(t));
  return [...new Set(raw)];
}

function escapeCell(value: string, maxLen = 140): string {
  const singleLine = String(value || "")
    .replace(/\|/g, "\\|")
    .replace(/[\r\n]+/g, " ")
    .replace(/`+/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  if (!singleLine) return "—";
  if (singleLine.length <= maxLen) return singleLine;
  return `${singleLine.slice(0, maxLen - 1).trimEnd()}…`;
}

function scoreTextFields(
  query: string,
  tokens: string[],
  fields: Array<{ text: string; weight: number }>,
): { score: number; matchedTerms: string[] } {
  const normalizedQ = normalizeKnowledgeQuery(query).toLowerCase();
  if (!normalizedQ && tokens.length === 0) {
    return { score: 0, matchedTerms: [] };
  }

  let totalScore = 0;
  const matched = new Set<string>();

  for (const field of fields) {
    const hay = field.text.toLowerCase();
    if (!hay) continue;

    if (normalizedQ.length >= 5 && hay.includes(normalizedQ)) {
      totalScore += 18 * field.weight;
    }

    for (const tok of tokens) {
      if (hay.includes(tok)) {
        // Whole-word match gets a stronger boost than substring match
        const wordRe = new RegExp(`(?:^|[^a-z0-9])${tok.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|[^a-z0-9])`);
        totalScore += (wordRe.test(hay) ? 4.5 : 2.2) * field.weight;
        matched.add(tok);
      } else if (tok.length >= 5 && hay.includes(tok.slice(0, 5))) {
        totalScore += 1.4 * field.weight;
        matched.add(tok);
      }
    }
  }

  if (tokens.length > 1 && matched.size > 0) {
    const coverage = matched.size / tokens.length;
    totalScore *= 0.65 + coverage * 0.7;
  }

  return { score: Number(totalScore.toFixed(3)), matchedTerms: [...matched] };
}

function buildTrackRecord(
  track: CurriculumTrack,
  trackIdx: number,
  score: number,
  matchedTerms: string[],
): KnowledgeRecord {
  const content =
    `### ${track.name} (\`${track.id}\` · ${track.domain})\n` +
    `${track.summary}\n\n` +
    `- **Subtopics (${track.subtopics.length}):** ${track.subtopics.join(" · ")}\n` +
    `- **Open Standards:** ${track.standards.join(" | ")}\n` +
    `- **Non-Negotiable Invariants:**\n  - ${track.invariants.join("\n  - ")}\n` +
    `- **Anti-Patterns Rejected:**\n  - ${track.antiPatterns.join("\n  - ")}`;

  return {
    id: `curriculum-track:${track.id}`,
    source: "open_curriculum",
    domain: track.domain,
    trackId: track.id,
    trackName: track.name,
    title: track.name,
    summary: track.summary,
    content,
    standards: [...track.standards],
    invariants: [...track.invariants],
    antiPatterns: [...track.antiPatterns],
    model: "noctis-open-curriculum-1m",
    hits: trackIdx + 1,
    score,
    matchedTerms,
  };
}

function buildSubtopicRecord(
  track: CurriculumTrack,
  trackIdx: number,
  subtopic: string,
  subtopicIdx: number,
  score: number,
  matchedTerms: string[],
): KnowledgeRecord {
  // Deterministic index matching this exact track & subtopic inside the 1M coordinate space
  const coordIndex = subtopicIdx * OPEN_CURRICULUM_TRACKS.length + trackIdx;
  const synthesized = generateCurriculumSftRecord(coordIndex);
  const assistantText = synthesized.messages[2]?.content || track.summary;

  return {
    id: synthesized.id,
    source: "curriculum_subtopic",
    domain: track.domain,
    trackId: track.id,
    trackName: track.name,
    title: `${track.name} — ${subtopic}`,
    summary: `${track.summary} Standard: ${track.standards[subtopicIdx % track.standards.length] || track.standards[0]}`,
    content: assistantText,
    standards: [...track.standards],
    invariants: [...track.invariants],
    antiPatterns: [...track.antiPatterns],
    model: "noctis-open-curriculum-1m",
    score,
    matchedTerms,
  };
}

export function searchCurriculumKnowledge(
  query: string,
  opts: KnowledgeSearchOptions = {},
): KnowledgeRecord[] {
  const normalized = normalizeKnowledgeQuery(query);
  const tokens = tokenizeKnowledgeQuery(normalized || query);
  const trackFilter = opts.track?.trim().toLowerCase();
  const domainFilter = opts.domain?.trim().toLowerCase();
  const limit = Math.max(1, Math.min(50, opts.limit ?? 10));

  const candidates: KnowledgeRecord[] = [];

  for (let tIdx = 0; tIdx < OPEN_CURRICULUM_TRACKS.length; tIdx += 1) {
    const track = OPEN_CURRICULUM_TRACKS[tIdx]!;
    if (trackFilter && track.id.toLowerCase() !== trackFilter && !track.name.toLowerCase().includes(trackFilter)) {
      continue;
    }
    if (domainFilter && track.domain.toLowerCase() !== domainFilter) {
      continue;
    }

    if (!tokens.length && !normalized) {
      candidates.push(buildTrackRecord(track, tIdx, 100 - tIdx, []));
      continue;
    }

    const trackScored = scoreTextFields(normalized || query, tokens, [
      { text: `${track.id} ${track.name}`, weight: 3.0 },
      { text: track.summary, weight: 2.0 },
      { text: track.standards.join(" "), weight: 2.2 },
      { text: track.subtopics.join(" "), weight: 1.5 },
      { text: track.invariants.join(" "), weight: 1.3 },
      { text: track.antiPatterns.join(" "), weight: 1.0 },
    ]);

    if (trackScored.score > 0 || trackFilter) {
      const baseScore = trackFilter ? Math.max(trackScored.score, 25) : trackScored.score;
      candidates.push(buildTrackRecord(track, tIdx, baseScore, trackScored.matchedTerms));
    }

    // Score individual subtopics so pinpoint lookups retrieve exact subtopic blueprints
    for (let sIdx = 0; sIdx < track.subtopics.length; sIdx += 1) {
      const subtopic = track.subtopics[sIdx]!;
      const subScored = scoreTextFields(normalized || query, tokens, [
        { text: subtopic, weight: 3.6 },
        { text: track.standards[sIdx % track.standards.length] || "", weight: 2.2 },
        { text: `${track.name} ${track.invariants[sIdx % track.invariants.length] || ""}`, weight: 1.2 },
      ]);
      if (subScored.score >= 8 || (trackFilter && subScored.score > 0)) {
        candidates.push(buildSubtopicRecord(track, tIdx, subtopic, sIdx, subScored.score, subScored.matchedTerms));
      }
    }
  }

  return candidates
    .sort((a, b) => b.score - a.score || (a.source === "open_curriculum" ? -1 : 1))
    .slice(0, limit);
}

export function scoreExternalTrainingPairs(
  query: string,
  pairs: readonly ExternalTrainingPairInput[],
  opts: { domain?: string; limit?: number; defaultSource?: KnowledgeSourceKind } = {},
): KnowledgeRecord[] {
  const normalized = normalizeKnowledgeQuery(query);
  const tokens = tokenizeKnowledgeQuery(normalized || query);
  const domainFilter = opts.domain?.trim().toLowerCase();
  const limit = Math.max(1, Math.min(50, opts.limit ?? 10));
  const sourceKind = opts.defaultSource || "postgres_training";

  const scored: KnowledgeRecord[] = [];

  for (let i = 0; i < pairs.length; i += 1) {
    const pair = pairs[i]!;
    const pairDomain = (pair.domain || "general").toLowerCase();
    if (domainFilter && pairDomain !== domainFilter) continue;

    if (!tokens.length && !normalized) {
      const hitsBoost = Math.min(10, Math.log10((pair.hits ?? 1) + 1) * 3);
      scored.push({
        id: pair.id || `pair-${i}`,
        source: sourceKind,
        domain: pairDomain,
        title: pair.question,
        summary: escapeCell(pair.answer, 180),
        content: pair.answer,
        model: pair.model,
        hits: pair.hits,
        score: Number((10 + hitsBoost).toFixed(3)),
        matchedTerms: [],
      });
      continue;
    }

    const res = scoreTextFields(normalized || query, tokens, [
      { text: pair.question, weight: 3.2 },
      { text: pair.answer.slice(0, 2400), weight: 1.4 },
      { text: pairDomain, weight: 1.1 },
    ]);

    if (res.score <= 0) continue;

    // Prioritize explicitly taught / seed / curriculum answers over ephemeral logs
    const modelBoost =
      pair.model === "user-taught"
        ? 4.0
        : pair.model === "noctis-open-curriculum-1m" || pair.model === "api-trained"
          ? 2.2
          : pair.model === "vibe-seed"
            ? 1.8
            : 0;
    const hitsBoost = Math.min(3.5, Math.log10(Math.max(1, pair.hits ?? 1)) * 1.4);

    // Extract first invariant/standard-like bullets when present
    const lines = pair.answer.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const summaryLine =
      lines.find((l) => !l.startsWith("#") && !l.startsWith("|") && l.length > 20) ||
      pair.answer.slice(0, 180);

    scored.push({
      id: pair.id || `pair-${i}`,
      source: sourceKind,
      domain: pairDomain,
      title: pair.question,
      summary: summaryLine.replace(/^\*+|\*+$/g, "").slice(0, 220),
      content: pair.answer,
      model: pair.model,
      hits: pair.hits,
      score: Number((res.score + modelBoost + hitsBoost).toFixed(3)),
      matchedTerms: res.matchedTerms,
    });
  }

  return scored
    .sort((a, b) => b.score - a.score || (b.hits ?? 0) - (a.hits ?? 0))
    .slice(0, limit);
}

export function scoreExternalDomainSummaries(
  query: string,
  domains: readonly ExternalDomainSummaryInput[],
  opts: { limit?: number } = {},
): KnowledgeRecord[] {
  const normalized = normalizeKnowledgeQuery(query);
  const tokens = tokenizeKnowledgeQuery(normalized || query);
  const limit = Math.max(1, Math.min(30, opts.limit ?? 6));
  const out: KnowledgeRecord[] = [];

  for (let i = 0; i < domains.length; i += 1) {
    const d = domains[i]!;
    const res =
      tokens.length > 0
        ? scoreTextFields(normalized || query, tokens, [{ text: d.domain, weight: 2.8 }])
        : { score: 5, matchedTerms: [] };

    if (res.score <= 0) continue;

    out.push({
      id: `domain-200:${i + 1}`,
      source: "training_domain",
      domain: "continuous-training",
      title: d.domain,
      summary: `${d.scenariosCount} scenarios audited · ${d.invariantsPassed} invariants verified · Gate: ${d.status}`,
      content: `### Continuous Training Subsystem: ${d.domain}\n- **Scenarios Audited:** ${d.scenariosCount}\n- **Invariants Verified:** ${d.invariantsPassed}\n- **Gate Status:** ${d.status}`,
      standards: ["NOCTIS-CONT-TRAIN-001 (200-Domain Zero-Violation Audit)"],
      invariants: [`${d.invariantsPassed}/${d.scenariosCount} invariants verified (${d.status})`],
      score: res.score,
      matchedTerms: res.matchedTerms,
    });
  }

  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Reciprocal Rank Fusion (RRF, k = 60) with normalized title deduplication so DB Q&As,
 * Open Curriculum tracks, subtopics, and 200-domain subsystem checks combine seamlessly.
 */
export function fuseRankedResults(
  rankedLists: ReadonlyArray<readonly KnowledgeRecord[]>,
  limit = 10,
): KnowledgeRecord[] {
  const k = 60;
  const byKey = new Map<
    string,
    {
      record: KnowledgeRecord;
      rrf: number;
      matchedTerms: Set<string>;
    }
  >();

  for (const list of rankedLists) {
    for (let rank = 0; rank < list.length; rank += 1) {
      const item = list[rank]!;
      const normKey = `${item.source === "open_curriculum" ? "track" : "item"}:${item.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 72)}`;
      const rrfIncrement = 1 / (k + rank + 1) + Math.min(0.015, item.score * 0.00025);
      const existing = byKey.get(normKey);
      if (existing) {
        existing.rrf += rrfIncrement;
        for (const t of item.matchedTerms) existing.matchedTerms.add(t);
        if (item.score > existing.record.score && item.source === "postgres_training") {
          existing.record = item;
        }
      } else {
        byKey.set(normKey, {
          record: item,
          rrf: rrfIncrement,
          matchedTerms: new Set(item.matchedTerms),
        });
      }
    }
  }

  return [...byKey.values()]
    .sort((a, b) => b.rrf - a.rrf || b.record.score - a.record.score)
    .slice(0, limit)
    .map((entry) => ({
      ...entry.record,
      matchedTerms: [...entry.matchedTerms],
      score: Number((entry.record.score + entry.rrf * 100).toFixed(2)),
    }));
}

export function formatCurriculumTracksTableMarkdown(domainFilter?: string): string {
  const filter = domainFilter?.trim().toLowerCase();
  const tracks = filter
    ? OPEN_CURRICULUM_TRACKS.filter((t) => t.domain.toLowerCase() === filter)
    : OPEN_CURRICULUM_TRACKS;

  if (!tracks.length) {
    return `No Open Technical Curriculum tracks matched domain \`${domainFilter}\`.`;
  }

  const lines = [
    "| # | Track ID | Subject Track | Domain | Subtopics | Governing Open Standards | Primary Architectural Invariant |",
    "| :---: | :--- | :--- | :---: | :---: | :--- | :--- |",
  ];
  tracks.forEach((t, idx) => {
    lines.push(
      `| ${idx + 1} | \`${t.id}\` | **${escapeCell(t.name, 48)}** | \`${t.domain}\` | ${t.subtopics.length} | ${escapeCell(t.standards.slice(0, 2).join("; "), 75)} | ${escapeCell(t.invariants[0] || t.summary, 95)} |`,
    );
  });
  return lines.join("\n");
}

function sourceBadge(source: KnowledgeSourceKind): string {
  switch (source) {
    case "postgres_training":
      return "Neon DB Pair";
    case "open_curriculum":
      return "25-Track Core";
    case "curriculum_subtopic":
      return "1M Blueprint";
    case "training_domain":
      return "200D Audit";
    case "seed_corpus":
      return "Seed Corpus";
  }
}

export function formatKnowledgeTableMarkdown(
  query: string,
  results: readonly KnowledgeRecord[],
  opts: { includeTrackDirectory?: boolean; domainFilter?: string } = {},
): string {
  if (opts.includeTrackDirectory || (isTrackDirectoryRequested(query) && results.length === 0)) {
    return formatCurriculumTracksTableMarkdown(opts.domainFilter);
  }
  if (!results.length) {
    return `No direct matches found for "${escapeCell(query, 80)}". Showing all ${OPEN_CURRICULUM_TRACKS.length} Open Technical Curriculum tracks:\n\n${formatCurriculumTracksTableMarkdown(opts.domainFilter)}`;
  }

  const lines = [
    "| # | Source | Domain / Track | Topic / Question | Governing Standard / Key Answer | Core Invariant / Guardrail |",
    "| :---: | :--- | :--- | :--- | :--- | :--- |",
  ];

  results.forEach((r, idx) => {
    const scopeLabel = r.trackName ? `${r.domain} · ${escapeCell(r.trackName, 28)}` : r.domain;
    const standardOrAnswer = r.standards?.length
      ? `${escapeCell(r.standards.slice(0, 2).join("; "), 85)}`
      : escapeCell(r.summary, 105);
    const invariantOrModel = r.invariants?.length
      ? escapeCell(r.invariants[0]!, 95)
      : r.antiPatterns?.length
        ? escapeCell(`Avoid: ${r.antiPatterns[0]}`, 95)
        : escapeCell(r.summary, 95);

    lines.push(
      `| ${idx + 1} | \`${sourceBadge(r.source)}\` | ${escapeCell(scopeLabel, 38)} | **${escapeCell(r.title, 68)}** | ${standardOrAnswer} | ${invariantOrModel} |`,
    );
  });

  return lines.join("\n");
}

export function formatKnowledgeReportMarkdown(
  query: string,
  results: readonly KnowledgeRecord[],
  meta: {
    dbTotalPairs: number;
    dbConnected: boolean;
    tableRequested: boolean;
    tracksMatched: number;
    totalSubtopics?: number;
    continuousDomainsCount?: number;
  },
): string {
  const stats = getOpenCurriculumStats();
  const normalized = normalizeKnowledgeQuery(query) || "All Open Technical Curriculum Tracks";
  const showDirectory = isTrackDirectoryRequested(query);

  const tableMd = formatKnowledgeTableMarkdown(query, results, {
    includeTrackDirectory: showDirectory,
  });

  const parts: string[] = [];
  parts.push(`### Noctis Unified Knowledge & Table Router`);
  parts.push(
    `**Query:** \`${escapeCell(normalized, 120)}\` · **Training Store:** \`${meta.dbTotalPairs} pairs (${meta.dbConnected ? "Neon Postgres" : "Local Hydrated"})\` · **Open Curriculum:** \`${stats.trackCount} tracks / ${meta.totalSubtopics ?? stats.totalSubtopics} subtopics (1M shard space)\` · **Audited Domains:** \`${meta.continuousDomainsCount ?? 200}\``,
  );

  parts.push(`\n#### Retrieved Knowledge Table (${showDirectory ? stats.trackCount : results.length} rows)\n${tableMd}`);

  if (!showDirectory && results.length > 0) {
    const deepDiveCount = meta.tableRequested ? 2 : 3;
    const topItems = results.slice(0, deepDiveCount);
    const details = topItems.map((item, idx) => {
      const blocks: string[] = [`#### ${idx + 1}. ${item.title} (\`${sourceBadge(item.source)}\` · score \`${item.score}\`)`];
      if (item.standards?.length) {
        blocks.push(`- **Governing Standards:** ${item.standards.join(" | ")}`);
      }
      if (item.invariants?.length) {
        blocks.push(`- **Core Invariants:** ${item.invariants.slice(0, 3).join(" · ")}`);
      }
      if (item.antiPatterns?.length) {
        blocks.push(`- **Anti-Patterns Rejected:** ${item.antiPatterns.slice(0, 2).join(" · ")}`);
      }
      // Include concise grounded answer excerpt for DB / subtopic hits
      const cleanBody = item.content.replace(/\n{3,}/g, "\n\n").trim();
      blocks.push(cleanBody.length > 900 ? `${cleanBody.slice(0, 900).trimEnd()}…` : cleanBody);
      return blocks.join("\n");
    });

    parts.push(`\n### Grounded Reference Blueprints\n${details.join("\n\n---\n\n")}`);
  }

  parts.push(
    `\n> **Direct API Routes:** \`GET /api/noctis/knowledge?q=${encodeURIComponent(normalized)}&format=table\` · \`GET /api/noctis?curriculum=1\` · Chat slash overrides: \`/knowledge\`, \`/table\`, \`/curriculum\``,
  );

  return parts.join("\n\n");
}
