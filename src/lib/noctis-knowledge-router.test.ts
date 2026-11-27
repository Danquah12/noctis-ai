import test from "node:test";
import assert from "node:assert/strict";
import {
  computeSemanticEmbedding256,
  cosineSimilarity,
  EMBEDDING_DIM,
  formatCurriculumTracksTableMarkdown,
  formatKnowledgeReportMarkdown,
  formatKnowledgeTableMarkdown,
  formatVectorLiteral,
  fuseRankedResults,
  isTableFormatRequested,
  scoreExternalTrainingPairs,
  searchCurriculumKnowledge,
  tokenizeKnowledgeQuery,
} from "./noctis-knowledge-router.ts";
import { classifyNoctisIntent } from "./noctis-intent-router.server.ts";
import { extractMultiSlashOverrides } from "./noctis-capability-registry.ts";
import { retrieveNoctisKnowledge, getNoctisKnowledgeStats } from "./noctis-knowledge-retrieval.server.ts";
import {
  classifyOpenDomain,
  computeDailyOffsetSeed,
  deduplicateOpenRecords,
  OPEN_INGESTION_SOURCE_SPECS,
  stripNullBytes,
} from "./noctis-open-ingestion.server.ts";

test("Open curriculum retrieval matches technical and professional tracks across all 40 tracks & 480 subtopics", () => {
  const cases: Array<{ query: string; expectedTrack: string }> = [
    { query: "Kubernetes Pod Security Standards non-root NetworkPolicy", expectedTrack: "cloud-kubernetes" },
    { query: "PostgreSQL MVCC vacuum B-tree partial index", expectedTrack: "databases-storage" },
    { query: "Raft leader election fencing tokens leases", expectedTrack: "distributed-systems" },
    { query: "LoRA 4-bit QLoRA DPO alignment KV-cache", expectedTrack: "ai-ml-llms" },
    { query: "BGP RPKI DNSSEC TLS 1.3 mTLS", expectedTrack: "networking-protocols" },
    { query: "Rust borrow checker ownership unsafe invariants", expectedTrack: "rust-systems" },
    { query: "PMBOK critical path Agile sprint velocity", expectedTrack: "project-program-delivery" },
    { query: "GAAP ASC 606 revenue recognition internal controls", expectedTrack: "accounting-audit-controls" },
    { query: "B2B SaaS net dollar retention cohort churn", expectedTrack: "customer-success-retention" },
    { query: "BATNA ZOPA BLUF executive memo negotiation", expectedTrack: "negotiation-stakeholder-comms" },
  ];

  for (const tc of cases) {
    const hits = searchCurriculumKnowledge(tc.query, { limit: 6 });
    assert.ok(hits.length > 0, `Expected matches for "${tc.query}"`);
    assert.equal(
      hits[0]!.trackId,
      tc.expectedTrack,
      `Expected top match track "${tc.expectedTrack}" for "${tc.query}", got "${hits[0]!.trackId}" (${hits[0]!.title})`,
    );
  }
});

test("External training pair scorer matches numbers cleanly and searches Q&A bodies", () => {
  const tokens = tokenizeKnowledgeQuery("PostgreSQL 16 MVCC RLS and C++");
  assert.ok(tokens.includes("postgresql"));
  assert.ok(tokens.includes("16"));
  assert.ok(tokens.includes("mvcc"));
  assert.ok(tokens.includes("cpp"));

  const pairs = [
    {
      id: "pg-1",
      question: "How does PostgreSQL MVCC prevent readers from blocking writers?",
      answer: "PostgreSQL stores tuple xmin/xmax transaction visibility metadata so snapshot reads avoid write locks and vacuum reclaims dead tuples.",
      domain: "databases",
      model: "user-taught",
      hits: 12,
    },
    {
      id: "dns-1",
      question: "What is DNS and how does resolution work?",
      answer: "DNS translates domain names to IP addresses via recursive, root, TLD, and authoritative resolvers under RFC 1034.",
      domain: "cybersecurity",
      model: "vibe-seed",
      hits: 25,
    },
  ];

  const scored = scoreExternalTrainingPairs("PostgreSQL 16 MVCC snapshot vacuum", pairs, { limit: 5 });
  assert.equal(scored.length, 1);
  assert.equal(scored[0]!.id, "pg-1");
  assert.equal(scored[0]!.source, "postgres_training");
});

test("Table intent detection & GitHub-flavored Markdown table rendering", () => {
  assert.equal(isTableFormatRequested("/table Raft fencing tokens"), true);
  assert.equal(isTableFormatRequested("Put Kubernetes security standards on a table"), true);
  assert.equal(isTableFormatRequested("Show PostgreSQL MVCC invariants in a table"), true);
  assert.equal(isTableFormatRequested("Explain PostgreSQL MVCC briefly"), false);

  const hits = searchCurriculumKnowledge("Kubernetes security | PodDisruptionBudget", { limit: 4 });
  const tableMd = formatKnowledgeTableMarkdown("/table Kubernetes security", hits);
  const rows = tableMd.split("\n").filter((l) => l.startsWith("|"));
  assert.ok(rows.length >= 3, "Markdown table must contain header, separator, and >= 1 data row");
  assert.ok(rows[1]!.includes("---"), "Second row must be Markdown table separator");

  const tracksTable = formatCurriculumTracksTableMarkdown();
  const trackRows = tracksTable.split("\n").filter((l) => l.startsWith("|"));
  assert.equal(trackRows.length, 42, "40 track rows + 1 header + 1 separator = 42 Markdown table rows");

  const report = formatKnowledgeReportMarkdown("Kubernetes security", hits, {
    dbTotalPairs: 736,
    dbConnected: true,
    tableRequested: true,
    tracksMatched: hits.length,
  });
  assert.ok(report.includes("### Noctis Unified Knowledge & Table Router"));
  assert.ok(report.includes("Retrieved Knowledge Table"));
  assert.ok(report.includes("736 pairs (Neon Postgres)"));
});

test("Intent router maps /knowledge, /library, /curriculum, /table & table prompts cleanly without regressions", () => {
  for (const [cmd, expectedCmd] of [
    ["/knowledge PostgreSQL MVCC", "/knowledge"],
    ["/library distributed systems", "/knowledge"],
    ["/curriculum ai-ml-llms", "/knowledge"],
    ["/table Kubernetes Pod Security", "/knowledge"],
  ] as const) {
    const d = classifyNoctisIntent(cmd);
    assert.equal(d.override, true);
    assert.equal(d.routeId, "knowledge_library");
    assert.equal(d.overrideCommand, expectedCmd);
    assert.equal(d.targetPanel, "training");
  }

  const batch = "/knowledge Raft fencing tokens\n\n/table Kubernetes security";
  assert.deepEqual(
    extractMultiSlashOverrides(batch).map((s) => s.routeId),
    ["knowledge_library", "knowledge_library"],
  );

  const natural = classifyNoctisIntent("Put Noctis's distributed systems and Kubernetes security standards on a table");
  assert.equal(natural.routeId, "knowledge_library");

  // Existing collision guard must stay untouched
  const unaffected = classifyNoctisIntent(
    "Compare PostgreSQL row-level security policies vs schema-per-tenant isolation for multi-tenant SaaS tradeoffs",
  );
  assert.equal(unaffected.routeId, "general_chat");
});

test("Unified server retrieval fuses DB/seed pairs + 40-track Open Curriculum + 200 continuous domains", async () => {
  const stats = await getNoctisKnowledgeStats();
  assert.equal(stats.ok, true);
  assert.equal(stats.totalTracks, 40);
  assert.equal(stats.totalSubtopics, 480);
  assert.equal(stats.continuousDomains, 200);
  assert.ok(stats.dbTotalPairs >= 100);

  const res = await retrieveNoctisKnowledge("Put Kubernetes security and PostgreSQL MVCC on a table", {
    limit: 8,
    format: "table",
  });
  assert.equal(res.ok, true);
  assert.equal(res.tableRequested, true);
  assert.ok(res.results.length >= 2);
  assert.ok(res.markdownTable.includes("| # | Source |"));
  assert.ok(res.markdownReport.includes("Retrieved Knowledge Table"));

  const fused = fuseRankedResults([
    res.results.slice(0, 3),
    res.results.slice(1, 4),
  ], 5);
  assert.ok(fused.length >= 2);
});

test("Open ingestion registry exposes 11 lawful public sources and deterministic deduplication", () => {
  assert.equal(OPEN_INGESTION_SOURCE_SPECS.length, 11);
  assert.equal(stripNullBytes("hello\u0000world"), "helloworld");
  assert.equal(classifyOpenDomain("CISA KEV CVE-2025-1234 MITRE ATT&CK T1059 zero trust"), "cybersecurity");
  assert.equal(classifyOpenDomain("ASC 606 GAAP revenue recognition WACC DCF"), "finance");
  assert.equal(classifyOpenDomain("PMBOK sprint OKR net dollar retention"), "business");
  assert.equal(classifyOpenDomain("PubMed randomized sepsis trial clinical guideline"), "healthcare");
  assert.ok(computeDailyOffsetSeed(new Date("2026-06-15T08:00:00Z")) >= 0);

  const deduped = deduplicateOpenRecords([
    {
      id: "1",
      source: "open:arxiv",
      sourceId: "arxiv",
      license: "arXiv-Open-Access-Abstract",
      domain: "science",
      url: "https://arxiv.org/abs/1",
      messages: [
        { role: "system", content: "sys" },
        { role: "user", content: "Duplicate prompt?" },
        { role: "assistant", content: "Ans 1" },
      ],
    },
    {
      id: "2",
      source: "open:arxiv",
      sourceId: "arxiv",
      license: "arXiv-Open-Access-Abstract",
      domain: "science",
      url: "https://arxiv.org/abs/2",
      messages: [
        { role: "system", content: "sys" },
        { role: "user", content: "duplicate prompt?" },
        { role: "assistant", content: "Ans 2" },
      ],
    },
  ]);
  assert.equal(deduped.length, 1);
});

test("Semantic 256-dim embeddings align paraphrased technical concepts via cosine similarity", () => {
  const q = computeSemanticEmbedding256("prevent database readers from blocking writers");
  const relevant = computeSemanticEmbedding256("PostgreSQL MVCC snapshot isolation avoids read locks");
  const unrelated = computeSemanticEmbedding256("acute hyperkalemia calcium gluconate insulin ECG potassium");

  assert.equal(q.length, EMBEDDING_DIM);
  const simRelevant = cosineSimilarity(q, relevant);
  const simUnrelated = cosineSimilarity(q, unrelated);
  assert.ok(simRelevant > 0.35, `Expected semantic similarity > 0.35, got ${simRelevant}`);
  assert.ok(simRelevant > simUnrelated + 0.2, `Relevant (${simRelevant}) must beat unrelated (${simUnrelated})`);
  assert.ok(formatVectorLiteral(q).startsWith("[") && formatVectorLiteral(q).endsWith("]"));
});
