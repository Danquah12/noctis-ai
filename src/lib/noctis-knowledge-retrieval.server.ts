/**
 * NOCTIS UNIFIED KNOWLEDGE RETRIEVAL ENGINE (SERVER)
 *
 * Bridges:
 *  - Live Neon Postgres `public.vibe_training_pair` (FTS + ILIKE + hydrated BM25 scoring)
 *  - 25-Track Open Technical Curriculum (300 subtopics, 12M shard coordinate space)
 *  - 200-Domain Continuous Training Subsystem Breakdown (`NOCTIS-CONT-TRAIN-001`)
 *
 * Exposes hybrid retrieval for `/api/noctis/knowledge`, `/api/noctis?knowledge=...`,
 * `/knowledge` & `/table` slash commands, and grounded chat context injection.
 */

import { getContinuousTrainingStatus } from "./noctis-continuous-trainer.ts";
import {
  formatKnowledgeReportMarkdown,
  formatKnowledgeTableMarkdown,
  fuseRankedResults,
  isTableFormatRequested,
  isTrackDirectoryRequested,
  normalizeKnowledgeQuery,
  scoreExternalDomainSummaries,
  searchCurriculumKnowledge,
  type KnowledgeRecord,
  type KnowledgeSearchOptions,
  type KnowledgeSearchResponse,
} from "./noctis-knowledge-router.ts";
import { getOpenCurriculumStats, OPEN_CURRICULUM_TRACKS } from "./noctis-open-curriculum-1m.ts";
import { searchTrainingPairsInDb, trainingStatus } from "./noctis-train.server.ts";

export interface UnifiedKnowledgeResult extends KnowledgeSearchResponse {
  dbTotalPairs: number;
  dbConnected: boolean;
  continuousDomainsCount: number;
}

export async function getNoctisKnowledgeStats() {
  const [trainStats, contStatus] = await Promise.all([
    trainingStatus(),
    Promise.resolve(getContinuousTrainingStatus()),
  ]);
  const curriculumStats = getOpenCurriculumStats();
  const latestEpoch = contStatus.history[0];

  return {
    ok: true as const,
    dbConnected: trainStats.dbConnected,
    dbTotalPairs: trainStats.totalPairs,
    userTaughtPairs: trainStats.userTaughtPairs,
    rulesCount: trainStats.rulesCount,
    pairsByDomain: trainStats.byDomain,
    curriculum: curriculumStats,
    totalTracks: curriculumStats.trackCount,
    totalSubtopics: curriculumStats.totalSubtopics,
    continuousDomains: latestEpoch?.totalDomainsAudited ?? 200,
    continuousScenariosEvaluated: latestEpoch?.totalScenariosEvaluated ?? 0,
    continuousAccuracyPercent: latestEpoch?.accuracyScorePercent ?? 100,
    tracks: OPEN_CURRICULUM_TRACKS.map((t) => ({
      id: t.id,
      name: t.name,
      domain: t.domain,
      subtopicCount: t.subtopics.length,
      standards: t.standards,
    })),
  };
}

export async function retrieveNoctisKnowledge(
  rawQuery: string,
  opts: KnowledgeSearchOptions = {},
): Promise<UnifiedKnowledgeResult> {
  const startedAt = Date.now();
  const query = String(rawQuery || "").trim();
  const normalizedQuery = normalizeKnowledgeQuery(query);
  const tableRequested = opts.format === "table" || isTableFormatRequested(query);
  const limit = Math.max(1, Math.min(30, opts.limit ?? 10));
  const sourceFilter = opts.source || "all";

  const contStatus = getContinuousTrainingStatus();
  const latestEpoch = contStatus.history[0];
  const domainBreakdown = latestEpoch?.domainBreakdown || [];
  const curriculumStats = getOpenCurriculumStats();

  const [dbHits, trainStats] = await Promise.all([
    sourceFilter === "all" || sourceFilter === "db"
      ? searchTrainingPairsInDb(normalizedQuery || query, {
          domain: opts.domain,
          limit: Math.max(limit * 2, 16),
        })
      : Promise.resolve([] as KnowledgeRecord[]),
    trainingStatus(),
  ]);

  const curriculumHits =
    sourceFilter === "all" || sourceFilter === "curriculum"
      ? searchCurriculumKnowledge(normalizedQuery || query, {
          track: opts.track,
          domain: opts.domain,
          limit: Math.max(limit * 2, 16),
        })
      : [];

  const domainHits =
    sourceFilter === "all" || sourceFilter === "domains"
      ? scoreExternalDomainSummaries(normalizedQuery || query, domainBreakdown, {
          limit: Math.min(8, limit),
        })
      : [];

  const directoryRequested = isTrackDirectoryRequested(query) && !opts.track;
  const fused = directoryRequested
    ? []
    : fuseRankedResults([dbHits, curriculumHits, domainHits], limit);

  const sourcesUsed: string[] = [];
  if (dbHits.length > 0) sourcesUsed.push(trainStats.dbConnected ? "neon_postgres" : "seed_corpus");
  if (curriculumHits.length > 0 || directoryRequested) sourcesUsed.push("open_curriculum_40_tracks");
  if (domainHits.length > 0) sourcesUsed.push("continuous_200_domains");

  const markdownTable = formatKnowledgeTableMarkdown(query, fused, {
    includeTrackDirectory: directoryRequested,
    domainFilter: opts.domain,
  });

  const markdownReport = formatKnowledgeReportMarkdown(query, fused, {
    dbTotalPairs: trainStats.totalPairs,
    dbConnected: trainStats.dbConnected,
    tableRequested,
    tracksMatched: curriculumHits.length,
    totalSubtopics: curriculumStats.totalSubtopics,
    continuousDomainsCount: latestEpoch?.totalDomainsAudited ?? 200,
  });

  return {
    ok: true,
    query,
    normalizedQuery,
    tableRequested,
    totalIndexedTracks: curriculumStats.trackCount,
    totalSubtopics: curriculumStats.totalSubtopics,
    totalMatches: directoryRequested ? curriculumStats.trackCount : fused.length,
    sourcesUsed,
    results: fused,
    markdownTable,
    markdownReport,
    dbTotalPairs: trainStats.totalPairs,
    dbConnected: trainStats.dbConnected,
    continuousDomainsCount: latestEpoch?.totalDomainsAudited ?? 200,
    latencyMs: Date.now() - startedAt,
  };
}

export async function buildChatKnowledgeGroundingBlock(
  query: string,
  opts: { limit?: number } = {},
): Promise<{
  systemBlock: string;
  tableRequested: boolean;
  matchCount: number;
  sourcesUsed: string[];
}> {
  const clean = String(query || "").trim();
  const tableRequested = isTableFormatRequested(clean);
  if (clean.length < 4) {
    return { systemBlock: "", tableRequested, matchCount: 0, sourcesUsed: [] };
  }

  try {
    const retrieved = await retrieveNoctisKnowledge(clean, {
      limit: opts.limit ?? 5,
      format: tableRequested ? "table" : "markdown",
    });

    if (!retrieved.results.length) {
      return {
        systemBlock: tableRequested
          ? "TABLE OUTPUT DIRECTIVE: Present the structured answer in a clean GitHub-flavored Markdown table with explicit columns and concise, grounded values."
          : "",
        tableRequested,
        matchCount: 0,
        sourcesUsed: retrieved.sourcesUsed,
      };
    }

    const lines: string[] = [
      `NOCTIS UNIFIED KNOWLEDGE CONTEXT (${retrieved.dbTotalPairs} trained DB pairs · ${retrieved.totalIndexedTracks} Open Curriculum tracks · Sources: ${retrieved.sourcesUsed.join(", ")}):`,
    ];

    for (const item of retrieved.results.slice(0, 4)) {
      const std = item.standards?.length ? ` | Standards: ${item.standards.slice(0, 2).join("; ")}` : "";
      const inv = item.invariants?.length ? ` | Invariant: ${item.invariants[0]}` : "";
      lines.push(`- [${item.source}] **${item.title}** (${item.domain})${std}${inv}\n  ${item.summary}`);
    }

    if (tableRequested) {
      lines.push(
        "\nTABULAR RESPONSE DIRECTIVE: The user asked to put this query on a table. Present a clean GitHub-flavored Markdown table comparing the retrieved standards, mechanics, invariants, and trade-offs, followed by concise verified takeaways.",
      );
    }

    const block = lines.join("\n").slice(0, 2600);
    return {
      systemBlock: block,
      tableRequested,
      matchCount: retrieved.results.length,
      sourcesUsed: retrieved.sourcesUsed,
    };
  } catch {
    return { systemBlock: "", tableRequested, matchCount: 0, sourcesUsed: [] };
  }
}
