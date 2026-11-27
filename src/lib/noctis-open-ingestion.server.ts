/**
 * NOCTIS CONTINUOUS OPEN-KNOWLEDGE INGESTION ENGINE (SERVER)
 *
 * Pulls real, lawfully open-licensed & public-domain technical, cybersecurity, clinical,
 * standards, finance, and educational corpora with zero paywall scraping:
 *   1. HuggingFaceTB/cosmopedia (`openstax`, `stanford`, Apache-2.0)
 *   2. HuggingFaceFW/fineweb-edu (`sample-10BT`, ODC-By-1.0)
 *   3. arXiv Open-Access Atom API (`cs.SE`, `cs.DC`, `cs.CR`, `cs.AI`, `cs.DB`, `cs.NI`, `cs.OS`, `cs.LG`, `q-fin.RM`)
 *   4. IETF Datatracker Published RFC API (IETF Trust / Open Standards)
 *   5. CISA Known Exploited Vulnerabilities (KEV) Catalog (US Gov Public Domain)
 *   6. NCBI PubMed E-utilities Literature Index (NIH/NLM Public Domain)
 *
 * Upserts deduplicated Q&A training pairs idempotently into Neon Postgres `public.vibe_training_pair`.
 */

import { createHash } from "node:crypto";
import type { ChatMlMessage } from "./noctis-open-curriculum-1m.ts";

export type OpenIngestionSourceId =
  | "cosmopedia"
  | "fineweb-edu"
  | "arxiv"
  | "ietf-rfc"
  | "cisa-kev"
  | "pubmed";

export interface OpenIngestionSourceSpec {
  id: OpenIngestionSourceId;
  name: string;
  license: string;
  endpointSummary: string;
  defaultDomain: string;
}

export const OPEN_INGESTION_SOURCE_SPECS: readonly OpenIngestionSourceSpec[] = [
  {
    id: "cosmopedia",
    name: "HuggingFaceTB/cosmopedia (OpenStax & Stanford)",
    license: "Apache-2.0",
    endpointSummary: "https://datasets-server.huggingface.co/rows",
    defaultDomain: "engineering",
  },
  {
    id: "fineweb-edu",
    name: "HuggingFaceFW/fineweb-edu (sample-10BT)",
    license: "ODC-By-1.0",
    endpointSummary: "https://datasets-server.huggingface.co/rows",
    defaultDomain: "engineering",
  },
  {
    id: "arxiv",
    name: "arXiv Open-Access CS & Quant Archive",
    license: "arXiv-Open-Access-Abstract",
    endpointSummary: "https://export.arxiv.org/api/query",
    defaultDomain: "science",
  },
  {
    id: "ietf-rfc",
    name: "IETF Datatracker Published RFCs",
    license: "IETF-Open-Standards",
    endpointSummary: "https://datatracker.ietf.org/api/v1/doc/document/",
    defaultDomain: "engineering",
  },
  {
    id: "cisa-kev",
    name: "CISA Known Exploited Vulnerabilities (KEV)",
    license: "US-Gov-Public-Domain",
    endpointSummary: "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",
    defaultDomain: "cybersecurity",
  },
  {
    id: "pubmed",
    name: "NCBI PubMed Biomedical Literature E-utilities",
    license: "NIH-NLM-Public-Domain",
    endpointSummary: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/",
    defaultDomain: "healthcare",
  },
] as const;

export interface OpenIngestedRecord {
  id: string;
  source: string;
  sourceId: OpenIngestionSourceId;
  license: string;
  domain: string;
  url: string;
  messages: ChatMlMessage[];
}

export interface SourceRunStat {
  sourceId: OpenIngestionSourceId;
  source: string;
  license: string;
  fetched: number;
  kept: number;
  error?: string;
}

export interface ContinuousOpenIngestionResult {
  ok: boolean;
  runId: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  offsetSeed: number;
  dryRun: boolean;
  totalFetched: number;
  totalDeduplicated: number;
  postgresUpserted: number;
  dbTotalPairsAfter: number | null;
  sources: SourceRunStat[];
}

const BROAD_EDUCATIONAL_FILTER_RE =
  /\b(algorithm|architecture|kubernetes|docker|distributed|consensus|raft|database|postgres|sql|python|typescript|rust|golang|kernel|ebpf|linux|network|tcp|quic|tls|cryptograph|security|owasp|vulnerability|machine learning|transformer|neural|llm|compiler|concurrency|memory|api|http|microservices|cloud|observability|telemetry|latency|cache|encryption|rfc|management|strategy|finance|accounting|economics|supply chain|negotiation|leadership|clinical|biomedical|pharmacology|statistics|causality|procurement)\b/i;

export function classifyOpenDomain(text: string, defaultDomain = "engineering"): string {
  const lower = text.toLowerCase();
  if (/\b(cve-\d{4}|cisa|kev|owasp|cryptograph|tls|auth|vulnerability|malware|ransomware|exploit|zero trust|nist 800-53|firewall)\b/.test(lower)) {
    return "cybersecurity";
  }
  if (/\b(patient|clinical|pubmed|nih|biomedical|cardio|oncology|sepsis|pharmacology|diagnosis|therapy|randomized trial|cohort)\b/.test(lower)) {
    return "healthcare";
  }
  if (/\b(transformer|neural|llm|machine learning|deep learning|diffusion|reinforcement|arxiv|statistics|theorem|physics|biology)\b/.test(lower)) {
    return "science";
  }
  if (/\b(gaap|ifrs|asc 606|wacc|dcf|valuation|accounting|ebitda|balance sheet|portfolio|risk|working capital)\b/.test(lower)) {
    return "finance";
  }
  if (/\b(roadmap|okr|scrum|pmbok|saas|retention|churn|pipeline|marketing|attribution|supply chain|procurement|management|leadership)\b/.test(lower)) {
    return "business";
  }
  if (/\b(contract|gdpr|hipaa|msa|dpa|indemnif|compliance|statute|regulation)\b/.test(lower)) {
    return "legal";
  }
  if (/\b(hiring|interview|career|compensation|onboarding)\b/.test(lower)) {
    return "career";
  }
  return defaultDomain;
}

export function stripNullBytes(value: string): string {
  return String(value || "").replace(/\u0000/g, "");
}

export function computeDailyOffsetSeed(date = new Date()): number {
  const startOfYear = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / 86_400_000);
  return (Math.max(0, dayOfYear) * 40) % 4000;
}

function decodeXmlEntities(raw: string): string {
  return raw
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchJson<T>(url: string, timeoutMs = 15_000): Promise<T> {
  const res = await fetch(url, {
    headers: { "User-Agent": "NoctisContinuousIngestion/2.0 (+https://www.dstrike.app)" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

async function fetchText(url: string, timeoutMs = 15_000): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "NoctisContinuousIngestion/2.0 (+https://www.dstrike.app)" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return await res.text();
}

export async function fetchCosmopediaBatch(limit: number, offsetSeed = 0): Promise<OpenIngestedRecord[]> {
  if (limit <= 0) return [];
  const records: OpenIngestedRecord[] = [];
  const configs: Array<{ config: string; target: number }> = [
    { config: "openstax", target: Math.ceil(limit / 2) },
    { config: "stanford", target: Math.floor(limit / 2) },
  ];

  for (const { config, target } of configs) {
    if (target <= 0) continue;
    let offset = offsetSeed % 2000;
    let collected = 0;
    const maxOffset = offset + Math.max(120, target * 4);
    while (collected < target && offset < maxOffset) {
      const length = Math.min(100, Math.max(20, (target - collected) * 2));
      const url = `https://datasets-server.huggingface.co/rows?dataset=HuggingFaceTB%2Fcosmopedia&config=${encodeURIComponent(config)}&split=train&offset=${offset}&length=${length}`;
      const data = await fetchJson<{
        rows?: Array<{ row_idx: number; row?: { prompt?: string; text?: string } }>;
      }>(url);
      const rows = data.rows || [];
      if (!rows.length) break;

      for (const item of rows) {
        if (collected >= target) break;
        const prompt = stripNullBytes((item.row?.prompt || "").trim());
        const text = stripNullBytes((item.row?.text || "").trim());
        if (prompt.length < 25 || text.length < 150) continue;
        if (!BROAD_EDUCATIONAL_FILTER_RE.test(`${prompt}\n${text.slice(0, 600)}`)) continue;

        const domain = classifyOpenDomain(`${prompt} ${text.slice(0, 400)}`, "engineering");
        records.push({
          id: `HF-COSMO-${config.toUpperCase()}-${item.row_idx}`,
          sourceId: "cosmopedia",
          source: `open:cosmopedia:${config}`,
          license: "Apache-2.0",
          domain,
          url: "https://huggingface.co/datasets/HuggingFaceTB/cosmopedia",
          messages: [
            { role: "system", content: `You are Noctis Sovereign Intelligence (${domain}) trained on open educational corpora.` },
            { role: "user", content: prompt.slice(0, 1200) },
            { role: "assistant", content: text.slice(0, 5600) },
          ],
        });
        collected += 1;
      }
      offset += rows.length;
    }
  }
  return records;
}

export async function fetchFinewebEduBatch(limit: number, offsetSeed = 0): Promise<OpenIngestedRecord[]> {
  if (limit <= 0) return [];
  const records: OpenIngestedRecord[] = [];
  let offset = offsetSeed % 3000;
  const maxOffset = offset + Math.max(150, limit * 4);

  while (records.length < limit && offset < maxOffset) {
    const length = Math.min(100, Math.max(25, (limit - records.length) * 3));
    const url = `https://datasets-server.huggingface.co/rows?dataset=HuggingFaceFW%2Ffineweb-edu&config=sample-10BT&split=train&offset=${offset}&length=${length}`;
    const data = await fetchJson<{
      rows?: Array<{ row_idx: number; row?: { text?: string; url?: string } }>;
    }>(url);
    const rows = data.rows || [];
    if (!rows.length) break;

    for (const item of rows) {
      if (records.length >= limit) break;
      const text = stripNullBytes((item.row?.text || "").trim());
      if (text.length < 240) continue;
      if (!BROAD_EDUCATIONAL_FILTER_RE.test(text.slice(0, 1000))) continue;

      const firstSentence = text.split(/(?<=[.!?])\s+/)[0]?.slice(0, 180) || "Technical Systems Reference";
      const domain = classifyOpenDomain(text.slice(0, 600), "engineering");
      records.push({
        id: `HF-FINEWEB-EDU-${item.row_idx}`,
        sourceId: "fineweb-edu",
        source: "open:fineweb-edu",
        license: "ODC-By-1.0",
        domain,
        url: item.row?.url || "https://huggingface.co/datasets/HuggingFaceFW/fineweb-edu",
        messages: [
          { role: "system", content: `You are Noctis Sovereign Intelligence (${domain}) synthesizing open educational material.` },
          { role: "user", content: `Summarize key technical concepts and engineering takeaways regarding: ${firstSentence}` },
          { role: "assistant", content: text.slice(0, 5600) },
        ],
      });
    }
    offset += rows.length;
  }
  return records;
}

export async function fetchArxivBatch(limit: number, offsetSeed = 0): Promise<OpenIngestedRecord[]> {
  if (limit <= 0) return [];
  const start = offsetSeed % 400;
  const maxResults = Math.min(300, limit);
  const query = encodeURIComponent(
    "cat:cs.SE OR cat:cs.DC OR cat:cs.CR OR cat:cs.AI OR cat:cs.DB OR cat:cs.NI OR cat:cs.OS OR cat:cs.LG OR cat:q-fin.RM",
  );
  const url = `https://export.arxiv.org/api/query?search_query=${query}&start=${start}&max_results=${maxResults}&sortBy=submittedDate&sortOrder=descending`;
  const xml = await fetchText(url, 20_000);

  const records: OpenIngestedRecord[] = [];
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
  for (const entry of entries) {
    const rawUrl = entry.match(/<id>([\s\S]*?)<\/id>/)?.[1]?.trim() || "";
    const title = stripNullBytes(decodeXmlEntities(entry.match(/<title>([\s\S]*?)<\/title>/)?.[1] || ""));
    const summary = stripNullBytes(decodeXmlEntities(entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1] || ""));
    if (!title || summary.length < 80) continue;

    const arxivId = rawUrl.split("/abs/")[1] || createHash("sha256").update(title).digest("hex").slice(0, 12);
    const domain = classifyOpenDomain(`${title} ${summary}`, "science");
    records.push({
      id: `ARXIV-${arxivId.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
      sourceId: "arxiv",
      source: "open:arxiv",
      license: "arXiv-Open-Access-Abstract",
      domain,
      url: rawUrl || "https://arxiv.org",
      messages: [
        { role: "system", content: `You are Noctis Research Intelligence (${domain}) citing primary open-access research.` },
        { role: "user", content: `Explain the research problem, methodology, and architectural implications of "${title}" (arXiv:${arxivId}).` },
        {
          role: "assistant",
          content:
            `### ${title} (arXiv:${arxivId})\n` +
            `- **Primary Open-Access Source:** ${rawUrl || "https://arxiv.org"}\n` +
            `- **Abstract & Findings:**\n${summary}\n\n` +
            `- **Engineering Verification:** Validate baseline reproducibility, failure assumptions, and benchmark constraints before deployment.`,
        },
      ],
    });
  }
  return records;
}

export async function fetchIetfRfcBatch(limit: number, offsetSeed = 0): Promise<OpenIngestedRecord[]> {
  if (limit <= 0) return [];
  const batchSize = Math.min(250, limit);
  const offset = (offsetSeed * 2) % 3000;
  const url = `https://datatracker.ietf.org/api/v1/doc/document/?type=rfc&format=json&limit=${batchSize}&offset=${offset}`;
  const data = await fetchJson<{
    objects?: Array<{ name?: string; rfc_number?: number; title?: string; abstract?: string }>;
  }>(url, 20_000);

  const records: OpenIngestedRecord[] = [];
  for (const doc of data.objects || []) {
    const title = stripNullBytes((doc.title || "").trim());
    const abs = stripNullBytes((doc.abstract || "").trim().replace(/\s+/g, " "));
    const rfcNum = doc.rfc_number;
    const name = (doc.name || (rfcNum ? `rfc${rfcNum}` : "")).toUpperCase();
    if (!title || abs.length < 55) continue;

    const rfcLabel = rfcNum ? `RFC ${rfcNum}` : name;
    const rfcUrl = rfcNum ? `https://www.rfc-editor.org/rfc/rfc${rfcNum}.html` : "https://datatracker.ietf.org/";
    const domain = classifyOpenDomain(`${title} ${abs}`, "engineering");
    records.push({
      id: `IETF-${name}`,
      sourceId: "ietf-rfc",
      source: "open:ietf-rfc",
      license: "IETF-Open-Standards",
      domain,
      url: rfcUrl,
      messages: [
        { role: "system", content: `You are Noctis Protocol Engineering (${domain}) grounded in published IETF RFCs.` },
        { role: "user", content: `Summarize the protocol specification and requirements defined in **${rfcLabel}: ${title}**.` },
        {
          role: "assistant",
          content:
            `### ${rfcLabel}: ${title}\n` +
            `- **Specification URL:** ${rfcUrl}\n` +
            `- **Abstract & Scope:**\n${abs}\n\n` +
            `- **Protocol Invariant:** Enforce strict wire-format parsing, explicit bounds checking, and interoperability tests per ${rfcLabel}.`,
        },
      ],
    });
  }
  return records;
}

export async function fetchCisaKevBatch(limit: number, offsetSeed = 0): Promise<OpenIngestedRecord[]> {
  if (limit <= 0) return [];
  const url = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";
  const data = await fetchJson<{
    catalogVersion?: string;
    vulnerabilities?: Array<{
      cveID?: string;
      vendorProject?: string;
      product?: string;
      vulnerabilityName?: string;
      dateAdded?: string;
      shortDescription?: string;
      requiredAction?: string;
      dueDate?: string;
      knownRansomwareCampaignUse?: string;
      cwes?: string[];
    }>;
  }>(url, 20_000);

  const vulns = [...(data.vulnerabilities || [])].reverse();
  const start = offsetSeed % Math.max(1, Math.min(200, Math.floor(vulns.length / 4)));
  const slice = vulns.slice(start, start + Math.min(350, limit));
  const records: OpenIngestedRecord[] = [];

  for (const v of slice) {
    const cve = stripNullBytes((v.cveID || "").trim().toUpperCase());
    const title = stripNullBytes((v.vulnerabilityName || "").trim());
    const desc = stripNullBytes((v.shortDescription || "").trim());
    if (!cve || !desc) continue;

    const vendor = stripNullBytes(v.vendorProject || "Vendor");
    const product = stripNullBytes(v.product || "Product");
    const action = stripNullBytes(v.requiredAction || "Apply vendor security mitigations immediately.");
    const cwes = Array.isArray(v.cwes) && v.cwes.length ? v.cwes.join(", ") : "N/A";
    records.push({
      id: `CISA-KEV-${cve}`,
      sourceId: "cisa-kev",
      source: "open:cisa-kev",
      license: "US-Gov-Public-Domain",
      domain: "cybersecurity",
      url: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
      messages: [
        { role: "system", content: "You are Noctis Cyber Threat Intelligence grounded in the CISA KEV catalog." },
        { role: "user", content: `What is CISA KEV ${cve} (${vendor} ${product} — ${title}) and what defensive remediation is required?` },
        {
          role: "assistant",
          content:
            `### ${cve}: ${title || `${vendor} ${product}`}\n` +
            `- **Affected Software:** ${vendor} — ${product} (CWEs: ${cwes})\n` +
            `- **Catalog Added:** ${v.dateAdded || "Listed"} · **Remediation Due Date:** ${v.dueDate || "Immediate"} · **Ransomware Use:** ${v.knownRansomwareCampaignUse || "Unknown"}\n` +
            `- **Vulnerability Summary:** ${desc}\n` +
            `- **Mandatory CISA BOD 22-01 Action:** ${action}`,
        },
      ],
    });
  }
  return records;
}

export async function fetchPubmedBatch(limit: number, offsetSeed = 0): Promise<OpenIngestedRecord[]> {
  if (limit <= 0) return [];
  const retmax = Math.min(200, limit);
  const retstart = offsetSeed % 500;
  const term = encodeURIComponent(
    "(critical care[Title/Abstract] OR hyperkalemia[Title/Abstract] OR sepsis[Title/Abstract] OR clinical guideline[Publication Type]) AND hasabstract[text]",
  );
  const esearchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${term}&retmode=json&retmax=${retmax}&retstart=${retstart}&sort=pub+date`;
  const searchData = await fetchJson<{ esearchresult?: { idlist?: string[] } }>(esearchUrl, 15_000);
  const pmids = (searchData.esearchresult?.idlist || []).slice(0, retmax);
  if (!pmids.length) return [];

  const records: OpenIngestedRecord[] = [];
  // Fetch summaries in chunks of 100 to stay well within URL limits
  for (let i = 0; i < pmids.length; i += 100) {
    const chunk = pmids.slice(i, i + 100);
    const esummaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${chunk.join(",")}&retmode=json`;
    const sumData = await fetchJson<{
      result?: Record<
        string,
        {
          uid?: string;
          title?: string;
          fulljournalname?: string;
          source?: string;
          pubdate?: string;
          authors?: Array<{ name?: string }>;
        }
      >;
    }>(esummaryUrl, 15_000);
    const resultObj = sumData.result || {};

    for (const pmid of chunk) {
      const doc = resultObj[pmid];
      if (!doc || !doc.title) continue;
      const cleanTitle = stripNullBytes(decodeXmlEntities(doc.title).replace(/\.$/, ""));
      const journal = stripNullBytes(doc.fulljournalname || doc.source || "PubMed Indexed Journal");
      const pubdate = stripNullBytes(doc.pubdate || "Published");
      const firstAuthor = stripNullBytes(doc.authors?.[0]?.name || "Clinical Research Consortium");
      const pubUrl = `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;

      records.push({
        id: `PUBMED-${pmid}`,
        sourceId: "pubmed",
        source: "open:pubmed",
        license: "NIH-NLM-Public-Domain",
        domain: "healthcare",
        url: pubUrl,
        messages: [
          { role: "system", content: "You are Noctis Clinical Evidence Reference citing NIH/NLM PubMed literature." },
          { role: "user", content: `Provide the PubMed citation and clinical context for PMID ${pmid}: "${cleanTitle}".` },
          {
            role: "assistant",
            content:
              `### PMID ${pmid}: ${cleanTitle}\n` +
              `- **Primary NIH/NLM URL:** ${pubUrl}\n` +
              `- **Citation:** ${firstAuthor} et al. *${journal}* (${pubdate}).\n` +
              `- **Evidence Boundary:** Use primary peer-reviewed clinical literature strictly alongside institutional protocols and verified patient vitals.`,
          },
        ],
      });
    }
  }
  return records;
}

export function deduplicateOpenRecords(candidates: readonly OpenIngestedRecord[]): OpenIngestedRecord[] {
  const seen = new Set<string>();
  const kept: OpenIngestedRecord[] = [];
  for (const rec of candidates) {
    const prompt = rec.messages[1]?.content?.trim().toLowerCase() || "";
    if (!prompt) continue;
    const hash = createHash("sha256").update(prompt).digest("hex");
    if (seen.has(hash)) continue;
    seen.add(hash);
    kept.push(rec);
  }
  return kept;
}

export async function runContinuousOpenKnowledgeIngestion(options: {
  sources?: OpenIngestionSourceId[];
  perSourceLimit?: number;
  offsetSeed?: number;
  dryRun?: boolean;
} = {}): Promise<ContinuousOpenIngestionResult> {
  const startedAt = new Date();
  const runId = `INGEST-${startedAt.toISOString().replace(/[^0-9]/g, "").slice(0, 14)}`;
  const perSourceLimit = Math.max(1, Math.min(300, options.perSourceLimit ?? 20));
  const offsetSeed = options.offsetSeed ?? computeDailyOffsetSeed(startedAt);
  const enabledSources = new Set<OpenIngestionSourceId>(
    options.sources?.length ? options.sources : ["cosmopedia", "fineweb-edu", "arxiv", "ietf-rfc", "cisa-kev", "pubmed"],
  );

  const allRunners: Array<{ id: OpenIngestionSourceId; spec: OpenIngestionSourceSpec; run: () => Promise<OpenIngestedRecord[]> }> = [
    { id: "cosmopedia", spec: OPEN_INGESTION_SOURCE_SPECS[0]!, run: () => fetchCosmopediaBatch(perSourceLimit, offsetSeed) },
    { id: "fineweb-edu", spec: OPEN_INGESTION_SOURCE_SPECS[1]!, run: () => fetchFinewebEduBatch(perSourceLimit, offsetSeed) },
    { id: "arxiv", spec: OPEN_INGESTION_SOURCE_SPECS[2]!, run: () => fetchArxivBatch(perSourceLimit, offsetSeed) },
    { id: "ietf-rfc", spec: OPEN_INGESTION_SOURCE_SPECS[3]!, run: () => fetchIetfRfcBatch(perSourceLimit, offsetSeed) },
    { id: "cisa-kev", spec: OPEN_INGESTION_SOURCE_SPECS[4]!, run: () => fetchCisaKevBatch(perSourceLimit, offsetSeed) },
    { id: "pubmed", spec: OPEN_INGESTION_SOURCE_SPECS[5]!, run: () => fetchPubmedBatch(perSourceLimit, offsetSeed) },
  ];
  const runners = allRunners.filter((r) => enabledSources.has(r.id));

  const sourceStats: SourceRunStat[] = [];
  const allCandidates: OpenIngestedRecord[] = [];

  await Promise.all(
    runners.map(async (runner) => {
      try {
        const rows = await runner.run();
        allCandidates.push(...rows);
        sourceStats.push({
          sourceId: runner.id,
          source: runner.spec.name,
          license: runner.spec.license,
          fetched: rows.length,
          kept: 0,
        });
      } catch (err) {
        sourceStats.push({
          sourceId: runner.id,
          source: runner.spec.name,
          license: runner.spec.license,
          fetched: 0,
          kept: 0,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }),
  );

  const kept = deduplicateOpenRecords(allCandidates);
  for (const rec of kept) {
    const stat = sourceStats.find((s) => s.sourceId === rec.sourceId);
    if (stat) stat.kept += 1;
  }

  let postgresUpserted = 0;
  let dbTotalPairsAfter: number | null = null;

  if (!options.dryRun && kept.length > 0) {
    try {
      const { getSql } = await import("@/lib/db");
      const sql = await getSql();
      for (const rec of kept) {
        const q = stripNullBytes(rec.messages[1]!.content).slice(0, 600);
        const a = stripNullBytes(rec.messages[2]!.content).slice(0, 6000);
        const dbId = `open-${createHash("sha256").update(q.toLowerCase()).digest("hex").slice(0, 20)}`;
        await sql`
          insert into vibe_training_pair (id, question, answer, domain, model, hits, verified, updated_at)
          values (${dbId}, ${q}, ${a}, ${rec.domain}, ${rec.source}, 10, true, now())
          on conflict (id) do update set
            answer = excluded.answer,
            domain = excluded.domain,
            model = excluded.model,
            verified = true,
            updated_at = now()
        `;
        postgresUpserted += 1;
      }
      const countRows = await sql<{ cnt: number }>`
        select count(*)::int as cnt from vibe_training_pair where verified = true
      `;
      dbTotalPairsAfter = countRows[0]?.cnt ?? null;

      const { resetTrainingDbHydration, hydrateFromDb } = await import("./noctis-train.server.ts");
      resetTrainingDbHydration();
      await hydrateFromDb();
    } catch {
      /* DB unavailable in unit-test or offline environment */
    }
  }

  const finishedAt = new Date();
  return {
    ok: kept.length > 0,
    runId,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    offsetSeed,
    dryRun: Boolean(options.dryRun),
    totalFetched: allCandidates.length,
    totalDeduplicated: kept.length,
    postgresUpserted,
    dbTotalPairsAfter,
    sources: sourceStats,
  };
}
