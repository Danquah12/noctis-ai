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
  computeSemanticEmbedding256,
  formatKnowledgeReportMarkdown,
  formatKnowledgeTableMarkdown,
  formatVectorLiteral,
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
import {
  NIST_SP_800_37_TASKS,
  NIST_SP_800_60_INFO_TYPES,
  NIST_SP_PUBLICATIONS,
  searchNistSpCatalog,
} from "./noctis-nist-sp-catalog.ts";
import { buildRmfGroundingPacket, getRmfDbManifest } from "./noctis-rmf-db.ts";
import { searchTrainingPairsInDb, trainingStatus } from "./noctis-train.server.ts";

export interface UnifiedKnowledgeResult extends KnowledgeSearchResponse {
  dbTotalPairs: number;
  dbConnected: boolean;
  continuousDomainsCount: number;
}

const RMF_QUERY_SIGNAL_RE =
  /\b(?:rmf|nist|800-\d+|fips\s*199|fips\s*200|fedramp|ato|poa&?m|iscm|conmon|oscal|cui|csf\s*2|cmmc|sprs|zero\s+trust|zta|high[- ]?watermark|authorization\s+boundary|system\s+security\s+plan|\bssp\b|\bsar\b|\bsap\b|(?:AC|AT|AU|CA|CM|CP|IA|IR|MA|MP|PE|PL|PM|PS|PT|RA|SA|SC|SI|SR)-\d{1,2}|\b(?:P-(?:1[0-8]|[1-9])|C-[1-3]|S-[1-6]|I-[1-2]|A-[1-6]|R-[1-5]|M-[1-7])\b)\b/i;

function searchRmfDatabaseRecords(
  query: string,
  opts: { domain?: string; limit: number; forceInclude?: boolean },
): KnowledgeRecord[] {
  if (opts.domain && !/^(?:cyber|cybersecurity|security|compliance|rmf|gov|defense)$/i.test(opts.domain)) {
    return [];
  }
  const hasRmfSignal = opts.forceInclude || RMF_QUERY_SIGNAL_RE.test(query);
  const spHits = searchNistSpCatalog(query, Math.max(8, opts.limit));
  if (!hasRmfSignal && spHits.length === 0) {
    return [];
  }

  const out: KnowledgeRecord[] = [];
  const seenIds = new Set<string>();

  for (const hit of spHits) {
    if (seenIds.has(hit.id)) continue;
    seenIds.add(hit.id);
    if (hit.kind === "rmf_task" && hit.task) {
      const t = hit.task;
      out.push({
        id: `rmf-task-${t.taskId}`,
        source: "nist_rmf_db",
        domain: "cybersecurity",
        trackName: "NIST SP 800-37 Rev. 2",
        title: `Task ${t.taskId}: ${t.title} (Step ${t.stepNumber} · ${t.stepCode})`,
        summary: `${t.level} task · Roles: ${t.primaryRoles.join(", ")} · ${t.description}`,
        content:
          `### NIST SP 800-37 Rev. 2 Task ${t.taskId}: ${t.title}\n` +
          `- **Step:** Step ${t.stepNumber} (${t.stepCode}) · **Level:** ${t.level}\n` +
          `- **Primary Roles:** ${t.primaryRoles.join(", ")}\n` +
          `- **Expected Outputs:** ${t.expectedOutputs.join("; ")}\n` +
          `- **Description:** ${t.description}`,
        standards: t.governingPubs,
        invariants: t.expectedOutputs.slice(0, 2),
        score: hit.score + 8,
        matchedTerms: hit.matchedTerms,
      });
    } else if (hit.kind === "publication" && hit.publication) {
      const p = hit.publication;
      out.push({
        id: `rmf-pub-${p.sourceId}`,
        source: "nist_rmf_db",
        domain: "cybersecurity",
        trackName: "NIST SP 800-Series",
        title: `${p.docNumber}: ${p.title}`,
        summary: `${p.version} — ${p.summary}`,
        content:
          `### ${p.docNumber}: ${p.title}\n` +
          `- **URL:** ${p.officialUrl} · **RMF Steps:** ${p.rmfSteps.map((s) => `Step ${s}`).join(", ")}\n` +
          `- **Summary:** ${p.summary}\n` +
          p.sections.map((s) => `- **${s.heading} (${s.citation}):** ${s.content}`).join("\n"),
        standards: [p.docNumber, ...p.crossReferences.slice(0, 1)],
        invariants: p.invariants,
        score: hit.score + 8,
        matchedTerms: hit.matchedTerms,
      });
    } else if (hit.kind === "sp800_60_info_type" && hit.infoType) {
      const it = hit.infoType;
      out.push({
        id: `rmf-80060-${it.code}`,
        source: "nist_rmf_db",
        domain: "cybersecurity",
        trackName: "NIST SP 800-60 Vol. 2",
        title: `SP 800-60 ${it.code}: ${it.name}`,
        summary: `C=${it.confidentiality}, I=${it.integrity}, A=${it.availability} -> High-Watermark ${it.highWatermark}. ${it.tailoringNotes}`,
        content:
          `### NIST SP 800-60 ${it.code}: ${it.name}\n` +
          `- **Category:** ${it.category} · **Provisional Impact:** C=${it.confidentiality}, I=${it.integrity}, A=${it.availability} (Overall High-Watermark: **${it.highWatermark}**)\n` +
          `- **Tailoring Guidance:** ${it.tailoringNotes}`,
        standards: [`NIST SP 800-60 ${it.code}`, "FIPS 199"],
        invariants: [it.tailoringNotes],
        score: hit.score + 6,
        matchedTerms: hit.matchedTerms,
      });
    }
  }

  if (hasRmfSignal) {
    const packet = buildRmfGroundingPacket(query);
    for (const ctrl of packet.controls.slice(0, 6)) {
      const cid = `rmf-ctrl-${ctrl.id}`;
      if (seenIds.has(cid)) continue;
      seenIds.add(cid);
      const baselinesStr = ctrl.baselines.length ? ctrl.baselines.join(", ") : ctrl.withdrawn ? `WITHDRAWN -> ${ctrl.withdrawnInto.join(", ")}` : "Supplemental";
      out.push({
        id: cid,
        source: "nist_rmf_db",
        domain: "cybersecurity",
        trackName: `SP 800-53 Rev. 5 (${ctrl.family})`,
        title: `${ctrl.id}: ${ctrl.title}`,
        summary: ctrl.statement ? `${ctrl.statement.slice(0, 220)}${ctrl.statement.length > 220 ? "…" : ""}` : `${ctrl.familyTitle} (${baselinesStr})`,
        content:
          `### ${ctrl.id} — ${ctrl.title} (${ctrl.familyTitle})\n` +
          `- **Baselines:** ${baselinesStr}${ctrl.fedrampOdp ? ` · **FedRAMP ODP (High):** ${ctrl.fedrampOdp.high}` : ""}\n` +
          `- **Control Statement:** ${ctrl.statement || "Withdrawn / incorporated into replacement control(s)."}\n` +
          (ctrl.objectives.length ? `- **800-53A Objectives (${ctrl.objectives.length}):** ${ctrl.objectives.slice(0, 3).join(" | ")}\n` : "") +
          (ctrl.guidance ? `- **Guidance:** ${ctrl.guidance.slice(0, 500)}` : ""),
        standards: [`NIST SP 800-53 ${ctrl.id}`, `Baselines: ${baselinesStr}`],
        invariants: [
          ctrl.fedrampOdp?.high ||
            (ctrl.withdrawn
              ? `Withdrawn in Rev. 5; replaced by ${ctrl.withdrawnInto.join(", ") || "N/A"}`
              : `Verify via 800-53A Examine / Interview / Test (${ctrl.objectives.length} objectives)`),
        ],
        score: 52,
        matchedTerms: [ctrl.id],
      });
    }

    for (const cui of packet.cuiRequirements.slice(0, 3)) {
      const kid = `rmf-171-${cui.id}`;
      if (seenIds.has(kid)) continue;
      seenIds.add(kid);
      out.push({
        id: kid,
        source: "nist_rmf_db",
        domain: "cybersecurity",
        trackName: "NIST SP 800-171 Rev. 3",
        title: `CUI ${cui.id} (${cui.shortId}): ${cui.title}`,
        summary: cui.statement.slice(0, 220),
        content: `### NIST SP 800-171 Rev. 3 ${cui.id} (${cui.shortId}) — ${cui.title}\n- **Family:** ${cui.familyTitle}\n- **Requirement:** ${cui.statement}`,
        standards: [`NIST SP 800-171 Rev. 3 ${cui.id}`],
        invariants: [`CUI Requirement ${cui.id} (${cui.familyTitle})`],
        score: 48,
        matchedTerms: [cui.id, cui.shortId],
      });
    }
  }

  return out.sort((a, b) => b.score - a.score).slice(0, opts.limit);
}

export async function searchRmfPdfChunksInDb(
  query: string,
  opts: { domain?: string; limit: number; forceInclude?: boolean },
): Promise<KnowledgeRecord[]> {
  if (opts.domain && !/^(?:cyber|cybersecurity|security|compliance|rmf|gov|defense)$/i.test(opts.domain)) {
    return [];
  }
  const hasRmfSignal = opts.forceInclude || RMF_QUERY_SIGNAL_RE.test(query);
  if (!hasRmfSignal || query.trim().length < 3) return [];

  try {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const vecLit = formatVectorLiteral(computeSemanticEmbedding256(query));
    const lim = Math.max(4, Math.min(12, opts.limit));

    const [ftsRows, vecRows] = await Promise.all([
      sql<{
        chunk_id: string;
        source_id: string;
        doc_number: string;
        page_start: number;
        page_end: number;
        section_heading: string;
        content: string;
        rank_score: number;
      }>`
        select chunk_id, source_id, doc_number, page_start, page_end, section_heading, content,
               ts_rank(to_tsvector('english', doc_number || ' ' || section_heading || ' ' || content),
                       websearch_to_tsquery('english', ${query}))::float as rank_score
        from rmf_pdf_chunks
        where to_tsvector('english', doc_number || ' ' || section_heading || ' ' || content)
              @@ websearch_to_tsquery('english', ${query})
        order by rank_score desc
        limit ${lim}
      `.catch(() => []),
      sql<{
        chunk_id: string;
        source_id: string;
        doc_number: string;
        page_start: number;
        page_end: number;
        section_heading: string;
        content: string;
        cos_sim: number;
      }>`
        select chunk_id, source_id, doc_number, page_start, page_end, section_heading, content,
               (1.0 - (embedding <=> ${vecLit}::vector))::float as cos_sim
        from rmf_pdf_chunks
        where embedding is not null
        order by embedding <=> ${vecLit}::vector asc
        limit ${lim}
      `.catch(() => []),
    ]);

    const merged = new Map<string, KnowledgeRecord>();
    for (const r of ftsRows) {
      merged.set(r.chunk_id, {
        id: `pdf-${r.chunk_id}`,
        source: "nist_rmf_db",
        domain: "cybersecurity",
        trackName: `${r.doc_number} (pp. ${r.page_start}–${r.page_end})`,
        title: `${r.doc_number} p.${r.page_start}: ${r.section_heading || "Official NIST Text"}`,
        summary: r.content.slice(0, 220),
        content: `### ${r.doc_number} (pp. ${r.page_start}–${r.page_end}) — ${r.section_heading}\n\n${r.content}`,
        standards: [`${r.doc_number} (pp. ${r.page_start}–${r.page_end})`],
        invariants: [`Verbatim NIST Public Domain Text · Page ${r.page_start}`],
        score: Number((46 + Math.min(20, (Number(r.rank_score) || 0) * 35)).toFixed(2)),
        matchedTerms: [r.doc_number],
      });
    }
    for (const r of vecRows) {
      const cos = Number(r.cos_sim) || 0;
      if (cos < 0.28) continue;
      const existing = merged.get(r.chunk_id);
      if (existing) {
        existing.score = Number((existing.score + cos * 22).toFixed(2));
      } else {
        merged.set(r.chunk_id, {
          id: `pdf-${r.chunk_id}`,
          source: "nist_rmf_db",
          domain: "cybersecurity",
          trackName: `${r.doc_number} (pp. ${r.page_start}–${r.page_end})`,
          title: `${r.doc_number} p.${r.page_start}: ${r.section_heading || "Official NIST Text"}`,
          summary: r.content.slice(0, 220),
          content: `### ${r.doc_number} (pp. ${r.page_start}–${r.page_end}) — ${r.section_heading}\n\n${r.content}`,
          standards: [`${r.doc_number} (pp. ${r.page_start}–${r.page_end})`],
          invariants: [`Verbatim NIST Public Domain Text · Page ${r.page_start}`],
          score: Number((34 + cos * 26).toFixed(2)),
          matchedTerms: [r.doc_number],
        });
      }
    }

    return [...merged.values()].sort((a, b) => b.score - a.score).slice(0, opts.limit);
  } catch {
    return [];
  }
}

export async function getNoctisKnowledgeStats() {
  const [trainStats, contStatus] = await Promise.all([
    trainingStatus(),
    Promise.resolve(getContinuousTrainingStatus()),
  ]);
  let verbatimPdfChunks = 0;
  let deterministicRulesInSql = 0;
  try {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const [pdfCnt, ruleCnt] = await Promise.all([
      sql<{ cnt: number }>`select count(*)::int as cnt from rmf_pdf_chunks`.catch(() => [{ cnt: 0 }]),
      sql<{ cnt: number }>`select count(*)::int as cnt from rmf_deterministic_rules`.catch(() => [{ cnt: 0 }]),
    ]);
    verbatimPdfChunks = pdfCnt[0]?.cnt ?? 0;
    deterministicRulesInSql = ruleCnt[0]?.cnt ?? 0;
  } catch {
    /* non-fatal fallback in unit test mode */
  }
  const curriculumStats = getOpenCurriculumStats();
  const rmfManifest = getRmfDbManifest();
  const latestEpoch = contStatus.history[0];

  return {
    ok: true as const,
    dbConnected: trainStats.dbConnected,
    dbTotalPairs: trainStats.totalPairs,
    userTaughtPairs: trainStats.userTaughtPairs,
    rulesCount: trainStats.rulesCount,
    pairsByDomain: trainStats.byDomain,
    curriculum: curriculumStats,
    rmfCatalog: {
      nistVersion: rmfManifest.nistVersion,
      fedrampVersion: rmfManifest.fedrampVersion,
      controlsAndEnhancements: rmfManifest.counts.totalControlsAndEnhancements ?? 1196,
      sp80037Tasks: NIST_SP_800_37_TASKS.length,
      nistPublications: NIST_SP_PUBLICATIONS.length,
      sp80060InfoTypes: NIST_SP_800_60_INFO_TYPES.length,
      cui800171Requirements: rmfManifest.counts.cui800171Requirements ?? 130,
      csf2Items: rmfManifest.counts.csf2Items ?? 225,
      mitreAttackEdges: rmfManifest.counts.mitreAttackEdges ?? 5314,
      verbatimPdfChunks,
      deterministicRulesInSql,
    },
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

  const [dbHits, trainStats, pdfChunkHits] = await Promise.all([
    sourceFilter === "all" || sourceFilter === "db"
      ? searchTrainingPairsInDb(normalizedQuery || query, {
          domain: opts.domain,
          limit: Math.max(limit * 2, 16),
        })
      : Promise.resolve([] as KnowledgeRecord[]),
    trainingStatus(),
    sourceFilter === "all" || sourceFilter === "rmf"
      ? searchRmfPdfChunksInDb(normalizedQuery || query, {
          domain: opts.domain,
          limit: Math.min(8, limit),
          forceInclude: sourceFilter === "rmf",
        })
      : Promise.resolve([] as KnowledgeRecord[]),
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

  const rmfHits =
    sourceFilter === "all" || sourceFilter === "rmf"
      ? searchRmfDatabaseRecords(normalizedQuery || query, {
          domain: opts.domain,
          limit: Math.max(limit * 2, 16),
          forceInclude: sourceFilter === "rmf",
        })
      : [];

  const directoryRequested = isTrackDirectoryRequested(query) && !opts.track && sourceFilter !== "rmf";
  const fused = directoryRequested
    ? []
    : fuseRankedResults([rmfHits, pdfChunkHits, dbHits, curriculumHits, domainHits], limit);

  const sourcesUsed: string[] = [];
  if (rmfHits.length > 0) sourcesUsed.push("nist_sp_rmf_db");
  if (pdfChunkHits.length > 0) sourcesUsed.push("nist_pdf_chunks");
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
