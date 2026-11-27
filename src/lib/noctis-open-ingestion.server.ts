/**
 * NOCTIS CONTINUOUS OPEN-KNOWLEDGE INGESTION ENGINE (SERVER)
 *
 * Pulls real, lawfully open-licensed & public-domain corpora across 11 verified sources:
 *   1. HuggingFaceTB/cosmopedia (`openstax`, `stanford`, Apache-2.0)
 *   2. HuggingFaceFW/fineweb-edu (`sample-10BT`, ODC-By-1.0)
 *   3. arXiv Open-Access Atom API (`cs.*`, `q-fin.RM`)
 *   4. IETF Datatracker Published RFC API (IETF Open Standards)
 *   5. CISA Known Exploited Vulnerabilities (KEV) Catalog (US Gov Public Domain)
 *   6. NCBI PubMed E-utilities Biomedical Abstracts (NIH/NLM Public Domain)
 *   7. MITRE ATT&CK Enterprise STIX Data (Apache-2.0)
 *   8. OWASP Cheat Sheet Series (CC-BY-SA 4.0)
 *   9. NIST NVD CVE API v2.0 (US Gov Public Domain)
 *  10. World Bank Open Development Indicators API v2 (CC-BY-4.0)
 *  11. Open Engineering Docs (`kubernetes/website`, `rust-lang/book`, Apache-2.0/MIT)
 *
 * Persists per-source SQL cursors (`knowledge_source_cursor`), run telemetry (`knowledge_ingestion_run`),
 * 256-dim semantic embeddings (`vibe_training_pair.embedding vector(256)`), and supersession tracking.
 */

import { createHash } from "node:crypto";
import { computeSemanticEmbedding256, formatVectorLiteral } from "./noctis-knowledge-router.ts";
import type { ChatMlMessage } from "./noctis-open-curriculum-1m.ts";

export type OpenIngestionSourceId =
  | "cosmopedia"
  | "fineweb-edu"
  | "arxiv"
  | "ietf-rfc"
  | "cisa-kev"
  | "pubmed"
  | "mitre-attack"
  | "owasp-cheatsheets"
  | "nist-nvd"
  | "world-bank"
  | "open-tech-docs";

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
  {
    id: "mitre-attack",
    name: "MITRE ATT&CK Enterprise STIX 2.1",
    license: "Apache-2.0",
    endpointSummary: "https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/enterprise-attack/enterprise-attack.json",
    defaultDomain: "cybersecurity",
  },
  {
    id: "owasp-cheatsheets",
    name: "OWASP Cheat Sheet Series",
    license: "CC-BY-SA-4.0",
    endpointSummary: "https://raw.githubusercontent.com/OWASP/CheatSheetSeries/master/cheatsheets/",
    defaultDomain: "cybersecurity",
  },
  {
    id: "nist-nvd",
    name: "NIST National Vulnerability Database (NVD API v2.0)",
    license: "US-Gov-Public-Domain",
    endpointSummary: "https://services.nvd.nist.gov/rest/json/cves/2.0",
    defaultDomain: "cybersecurity",
  },
  {
    id: "world-bank",
    name: "World Bank Open Indicators API v2",
    license: "CC-BY-4.0",
    endpointSummary: "https://api.worldbank.org/v2/indicator",
    defaultDomain: "finance",
  },
  {
    id: "open-tech-docs",
    name: "Open Engineering Docs (Kubernetes & Rust Book)",
    license: "CC-BY-4.0 / Apache-2.0 / MIT",
    endpointSummary: "https://raw.githubusercontent.com/{kubernetes/website,rust-lang/book}/",
    defaultDomain: "engineering",
  },
] as const;

export interface OpenIngestedRecord {
  id: string;
  source: string;
  sourceId: OpenIngestionSourceId;
  license: string;
  domain: string;
  url: string;
  canonicalRef?: string;
  messages: ChatMlMessage[];
}

export interface SourceRunStat {
  sourceId: OpenIngestionSourceId;
  source: string;
  license: string;
  cursorUsed: number;
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
  embeddingsWritten: number;
  staleSuperseded: number;
  dbTotalPairsAfter: number | null;
  sources: SourceRunStat[];
}

const BROAD_EDUCATIONAL_FILTER_RE =
  /\b(algorithm|architecture|kubernetes|docker|distributed|consensus|raft|database|postgres|sql|python|typescript|rust|golang|kernel|ebpf|linux|network|tcp|quic|tls|cryptograph|security|owasp|vulnerability|machine learning|transformer|neural|llm|compiler|concurrency|memory|api|http|microservices|cloud|observability|telemetry|latency|cache|encryption|rfc|management|strategy|finance|accounting|economics|supply chain|negotiation|leadership|clinical|biomedical|pharmacology|statistics|causality|procurement|mitre|attack)\b/i;

export function classifyOpenDomain(text: string, defaultDomain = "engineering"): string {
  const lower = text.toLowerCase();
  if (/\b(cve-\d{4}|cisa|kev|owasp|mitre|att&ck|cryptograph|tls|auth|vulnerability|malware|ransomware|exploit|zero trust|nist 800-53|firewall)\b/.test(lower)) {
    return "cybersecurity";
  }
  if (/\b(patient|clinical|pubmed|nih|biomedical|cardio|oncology|sepsis|pharmacology|diagnosis|therapy|randomized trial|cohort)\b/.test(lower)) {
    return "healthcare";
  }
  if (/\b(transformer|neural|llm|machine learning|deep learning|diffusion|reinforcement|arxiv|statistics|theorem|physics|biology)\b/.test(lower)) {
    return "science";
  }
  if (/\b(gaap|ifrs|asc 606|wacc|dcf|valuation|accounting|ebitda|balance sheet|portfolio|risk|working capital|gdp|world bank|inflation)\b/.test(lower)) {
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
    headers: { "User-Agent": "NoctisContinuousIngestion/3.0 (+https://www.dstrike.app)" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

async function fetchText(url: string, timeoutMs = 15_000): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "NoctisContinuousIngestion/3.0 (+https://www.dstrike.app)" },
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
  const start = offsetSeed % 500;
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
      canonicalRef: rfcLabel,
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
      canonicalRef: cve,
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

export async function fetchMitreAttackBatch(limit: number, offsetSeed = 0): Promise<OpenIngestedRecord[]> {
  if (limit <= 0) return [];
  const stixUrl = "https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/enterprise-attack/enterprise-attack.json";
  const bundle = await fetchJson<{
    objects?: Array<{
      type?: string;
      name?: string;
      description?: string;
      revoked?: boolean;
      x_mitre_deprecated?: boolean;
      kill_chain_phases?: Array<{ phase_name?: string }>;
      external_references?: Array<{ source_name?: string; external_id?: string; url?: string }>;
    }>;
  }>(stixUrl, 25_000);

  const techniques = (bundle.objects || []).filter(
    (obj) =>
      obj.type === "attack-pattern" &&
      !obj.revoked &&
      !obj.x_mitre_deprecated &&
      obj.name &&
      obj.description &&
      (obj.external_references || []).some((r) => r.source_name === "mitre-attack" && r.external_id),
  );

  const start = offsetSeed % Math.max(1, techniques.length);
  const wrapped = [...techniques.slice(start), ...techniques.slice(0, start)].slice(0, Math.min(300, limit));
  const records: OpenIngestedRecord[] = [];

  for (const tech of wrapped) {
    const ref = (tech.external_references || []).find((r) => r.source_name === "mitre-attack");
    const tid = stripNullBytes(ref?.external_id || "");
    const name = stripNullBytes(tech.name || "");
    const desc = stripNullBytes((tech.description || "").replace(/\s+/g, " ").trim().slice(0, 1800));
    if (!tid || !name || !desc) continue;

    const tactics = (tech.kill_chain_phases || []).map((p) => p.phase_name).filter(Boolean).join(", ") || "enterprise";
    const techUrl = ref?.url || `https://attack.mitre.org/techniques/${tid.replace(".", "/")}/`;

    records.push({
      id: `MITRE-${tid}`,
      sourceId: "mitre-attack",
      source: "open:mitre-attack",
      license: "Apache-2.0",
      domain: "cybersecurity",
      url: techUrl,
      canonicalRef: tid,
      messages: [
        { role: "system", content: "You are Noctis Defensive Security Intelligence grounded in MITRE ATT&CK STIX." },
        { role: "user", content: `Explain MITRE ATT&CK ${tid} (${name}), affected tactics (${tactics}), and defensive detection invariants.` },
        {
          role: "assistant",
          content:
            `### MITRE ATT&CK ${tid}: ${name}\n` +
            `- **Tactics:** ${tactics} · **Primary Reference:** ${techUrl}\n` +
            `- **Technique Behavior:** ${desc}\n` +
            `- **Defensive Detection & Mitigation:** Collect process/auth/network telemetry mapped to ${tid} and enforce least-privilege preventive guardrails before remediation closure.`,
        },
      ],
    });
  }
  return records;
}

const OWASP_CHEATSHEET_SLUGS: readonly string[] = [
  "Authentication_Cheat_Sheet.md",
  "Authorization_Cheat_Sheet.md",
  "Cross_Site_Scripting_Prevention_Cheat_Sheet.md",
  "Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.md",
  "SQL_Injection_Prevention_Cheat_Sheet.md",
  "Server_Side_Request_Forgery_Prevention_Cheat_Sheet.md",
  "Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.md",
  "JSON_Web_Token_for_Java_Cheat_Sheet.md",
  "Password_Storage_Cheat_Sheet.md",
  "Session_Management_Cheat_Sheet.md",
  "Transport_Layer_Security_Cheat_Sheet.md",
  "REST_Security_Cheat_Sheet.md",
  "GraphQL_Cheat_Sheet.md",
  "Kubernetes_Security_Cheat_Sheet.md",
  "Docker_Security_Cheat_Sheet.md",
  "Secrets_Management_Cheat_Sheet.md",
  "Input_Validation_Cheat_Sheet.md",
  "HTTP_Headers_Cheat_Sheet.md",
  "Cryptographic_Storage_Cheat_Sheet.md",
  "Content_Security_Policy_Cheat_Sheet.md",
  "Multifactor_Authentication_Cheat_Sheet.md",
  "OAuth2_Cheat_Sheet.md",
  "Supply_Chain_Security_Cheat_Sheet.md",
  "Logging_Cheat_Sheet.md",
] as const;

export async function fetchOwaspCheatsheetsBatch(limit: number, offsetSeed = 0): Promise<OpenIngestedRecord[]> {
  if (limit <= 0) return [];
  const cap = Math.min(OWASP_CHEATSHEET_SLUGS.length, limit);
  const start = offsetSeed % OWASP_CHEATSHEET_SLUGS.length;
  const selected = [...OWASP_CHEATSHEET_SLUGS.slice(start), ...OWASP_CHEATSHEET_SLUGS.slice(0, start)].slice(0, cap);

  const records: OpenIngestedRecord[] = [];
  await Promise.all(
    selected.map(async (slug) => {
      try {
        const rawUrl = `https://raw.githubusercontent.com/OWASP/CheatSheetSeries/master/cheatsheets/${slug}`;
        const md = stripNullBytes(await fetchText(rawUrl, 12_000));
        if (md.length < 150) return;
        const cleanTitle = slug.replace(/\.md$/i, "").replace(/_/g, " ").replace(/-/g, " ");
        const excerpt = md.replace(/\n{3,}/g, "\n\n").slice(0, 3200);
        records.push({
          id: `OWASP-CS-${slug.replace(/\.md$/i, "")}`,
          sourceId: "owasp-cheatsheets",
          source: "open:owasp-cheatsheets",
          license: "CC-BY-SA-4.0",
          domain: "cybersecurity",
          url: `https://cheatsheetseries.owasp.org/cheatsheets/${slug.replace(/\.md$/i, ".html")}`,
          messages: [
            { role: "system", content: "You are Noctis Application Security Intelligence grounded in OWASP Cheat Sheet Series." },
            { role: "user", content: `What are the OWASP ${cleanTitle} defensive implementation controls and invariants?` },
            {
              role: "assistant",
              content: `### OWASP ${cleanTitle}\n- **Source:** https://cheatsheetseries.owasp.org/cheatsheets/${slug.replace(/\.md$/i, ".html")}\n\n${excerpt}`,
            },
          ],
        });
      } catch {
        /* skip single sheet error cleanly */
      }
    }),
  );
  return records;
}

export async function fetchNistNvdBatch(limit: number, offsetSeed = 0): Promise<OpenIngestedRecord[]> {
  if (limit <= 0) return [];
  const resultsPerPage = Math.min(100, limit);
  const startIndex = (offsetSeed * 2) % 250000;
  const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=${resultsPerPage}&startIndex=${startIndex}`;
  const data = await fetchJson<{
    vulnerabilities?: Array<{
      cve?: {
        id?: string;
        published?: string;
        vulnStatus?: string;
        descriptions?: Array<{ lang?: string; value?: string }>;
        metrics?: {
          cvssMetricV31?: Array<{ cvssData?: { baseScore?: number; baseSeverity?: string; vectorString?: string } }>;
        };
        weaknesses?: Array<{ description?: Array<{ value?: string }> }>;
      };
    }>;
  }>(url, 20_000);

  const records: OpenIngestedRecord[] = [];
  for (const item of data.vulnerabilities || []) {
    const cve = item.cve;
    const id = stripNullBytes((cve?.id || "").trim().toUpperCase());
    const desc = stripNullBytes((cve?.descriptions?.find((d) => d.lang === "en")?.value || cve?.descriptions?.[0]?.value || "").trim());
    if (!id || desc.length < 40) continue;

    const metric = cve?.metrics?.cvssMetricV31?.[0]?.cvssData;
    const scoreStr = metric?.baseScore ? `${metric.baseScore} (${metric.baseSeverity || "N/A"}) · ${metric.vectorString || ""}` : "Pending CVSS scoring";
    const cwe = cve?.weaknesses?.[0]?.description?.[0]?.value || "N/A";

    records.push({
      id: `NIST-NVD-${id}`,
      sourceId: "nist-nvd",
      source: "open:nist-nvd",
      license: "US-Gov-Public-Domain",
      domain: "cybersecurity",
      url: `https://nvd.nist.gov/vuln/detail/${id}`,
      canonicalRef: id,
      messages: [
        { role: "system", content: "You are Noctis Vulnerability Intelligence grounded in NIST NVD CVE API v2.0." },
        { role: "user", content: `Analyze NIST NVD ${id} CVSS severity, weakness classification, and remediation posture.` },
        {
          role: "assistant",
          content:
            `### NIST NVD ${id}\n` +
            `- **NVD Reference:** https://nvd.nist.gov/vuln/detail/${id}\n` +
            `- **CVSS v3.1:** ${scoreStr} · **Weakness:** ${cwe} · **Status:** ${cve?.vulnStatus || "Analyzed"}\n` +
            `- **Description:** ${desc}\n` +
            `- **Remediation Guidance:** Verify affected dependency versions against vendor advisories and validate compensating controls before exposure closure.`,
        },
      ],
    });
  }
  return records;
}

export async function fetchWorldBankIndicatorsBatch(limit: number, offsetSeed = 0): Promise<OpenIngestedRecord[]> {
  if (limit <= 0) return [];
  const perPage = Math.min(150, limit);
  const page = 1 + (offsetSeed % 25);
  const url = `https://api.worldbank.org/v2/indicator?format=json&per_page=${perPage}&page=${page}`;
  const payload = await fetchJson<
    [
      unknown,
      Array<{
        id?: string;
        name?: string;
        sourceNote?: string;
        sourceOrganization?: string;
        topics?: Array<{ value?: string }>;
      }>,
    ]
  >(url, 20_000);

  const items = Array.isArray(payload) && Array.isArray(payload[1]) ? payload[1] : [];
  const records: OpenIngestedRecord[] = [];
  for (const ind of items) {
    const id = stripNullBytes((ind.id || "").trim());
    const name = stripNullBytes((ind.name || "").trim());
    const note = stripNullBytes((ind.sourceNote || "").replace(/\s+/g, " ").trim());
    if (!id || !name || note.length < 40) continue;

    const topic = ind.topics?.[0]?.value || "Macroeconomics & Development";
    records.push({
      id: `WB-IND-${id.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
      sourceId: "world-bank",
      source: "open:world-bank",
      license: "CC-BY-4.0",
      domain: "finance",
      url: `https://data.worldbank.org/indicator/${encodeURIComponent(id)}`,
      messages: [
        { role: "system", content: "You are Noctis Macroeconomics & Finance Intelligence grounded in World Bank Open Data." },
        { role: "user", content: `Define World Bank indicator "${name}" (${id}) including methodology and primary source caveats.` },
        {
          role: "assistant",
          content:
            `### World Bank Indicator: ${name} (\`${id}\`)\n` +
            `- **Topic:** ${topic} · **Source Org:** ${stripNullBytes(ind.sourceOrganization || "World Bank")} · **URL:** https://data.worldbank.org/indicator/${encodeURIComponent(id)}\n` +
            `- **Methodology & Definition:** ${note.slice(0, 2400)}`,
        },
      ],
    });
  }
  return records;
}

const OPEN_TECH_DOC_PATHS: ReadonlyArray<{ title: string; track: string; rawUrl: string; domain: string }> = [
  {
    title: "Kubernetes Concepts: Pod Security Standards",
    track: "cloud-kubernetes",
    rawUrl: "https://raw.githubusercontent.com/kubernetes/website/main/content/en/docs/concepts/security/pod-security-standards.md",
    domain: "engineering",
  },
  {
    title: "Kubernetes Concepts: Network Policies",
    track: "cloud-kubernetes",
    rawUrl: "https://raw.githubusercontent.com/kubernetes/website/main/content/en/docs/concepts/services-networking/network-policies.md",
    domain: "engineering",
  },
  {
    title: "Kubernetes Tasks: Configure Liveness, Readiness and Startup Probes",
    track: "cloud-kubernetes",
    rawUrl: "https://raw.githubusercontent.com/kubernetes/website/main/content/en/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes.md",
    domain: "engineering",
  },
  {
    title: "Rust Book: Understanding Ownership",
    track: "rust-systems",
    rawUrl: "https://raw.githubusercontent.com/rust-lang/book/main/src/ch04-01-what-is-ownership.md",
    domain: "engineering",
  },
  {
    title: "Rust Book: References and Borrowing",
    track: "rust-systems",
    rawUrl: "https://raw.githubusercontent.com/rust-lang/book/main/src/ch04-02-references-and-borrowing.md",
    domain: "engineering",
  },
  {
    title: "Rust Book: Fearless Concurrency with Threads and Channels",
    track: "rust-systems",
    rawUrl: "https://raw.githubusercontent.com/rust-lang/book/main/src/ch16-01-threads.md",
    domain: "engineering",
  },
  {
    title: "Rust Book: Unsafe Rust & FFI Safety",
    track: "rust-systems",
    rawUrl: "https://raw.githubusercontent.com/rust-lang/book/main/src/ch20-01-unsafe-rust.md",
    domain: "engineering",
  },
] as const;

export async function fetchOpenTechDocsBatch(limit: number, offsetSeed = 0): Promise<OpenIngestedRecord[]> {
  if (limit <= 0) return [];
  const cap = Math.min(OPEN_TECH_DOC_PATHS.length, limit);
  const start = offsetSeed % OPEN_TECH_DOC_PATHS.length;
  const selected = [...OPEN_TECH_DOC_PATHS.slice(start), ...OPEN_TECH_DOC_PATHS.slice(0, start)].slice(0, cap);

  const records: OpenIngestedRecord[] = [];
  await Promise.all(
    selected.map(async (item) => {
      try {
        const text = stripNullBytes(await fetchText(item.rawUrl, 12_000));
        if (text.length < 150) return;
        const body = text.replace(/^---[\s\S]*?---\s*/m, "").replace(/\n{3,}/g, "\n\n").slice(0, 3200);
        records.push({
          id: `DOCS-${createHash("sha256").update(item.rawUrl).digest("hex").slice(0, 12)}`,
          sourceId: "open-tech-docs",
          source: `open:docs:${item.track}`,
          license: "CC-BY-4.0 / Apache-2.0 / MIT",
          domain: item.domain,
          url: item.rawUrl,
          messages: [
            { role: "system", content: "You are Noctis Systems Engineering grounded in official open-source documentation." },
            { role: "user", content: `Summarize the technical rules and examples from official open documentation: "${item.title}".` },
            { role: "assistant", content: `### ${item.title}\n- **Official Source:** ${item.rawUrl}\n\n${body}` },
          ],
        });
      } catch {
        /* ignore single doc fetch failure */
      }
    }),
  );
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

/**
 * Supersession & Staleness Sweeper:
 * When multiple verified records describe the same canonical CVE (NVD vs CISA KEV) or RFC,
 * prefers CISA KEV (mandatory remediation action) or most-recent timestamp and marks older duplicates stale.
 */
export async function runSupersessionSweeper(sql: {
  <T = Record<string, unknown>>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]>;
}): Promise<number> {
  try {
    const rows = await sql<{ id: string }>`
      with ranked_cves as (
        select
          id,
          (regexp_match(id, '(CVE-[0-9]{4}-[0-9]{4,7})'))[1] as canonical_cve,
          case when id like 'CISA-KEV-%' then 2 else 1 end as priority,
          updated_at
        from vibe_training_pair
        where verified = true
          and coalesce(stale, false) = false
          and (id like 'CISA-KEV-CVE-%' or id like 'NIST-NVD-CVE-%')
      ),
      losers as (
        select r1.id as loser_id,
               first_value(r1.id) over (
                 partition by r1.canonical_cve
                 order by r1.priority desc, r1.updated_at desc
               ) as winner_id,
               row_number() over (
                 partition by r1.canonical_cve
                 order by r1.priority desc, r1.updated_at desc
               ) as rn
        from ranked_cves r1
        where r1.canonical_cve is not null
      ),
      updated as (
        update vibe_training_pair v
        set stale = true, superseded_by = l.winner_id
        from losers l
        where v.id = l.loser_id
          and l.rn > 1
          and l.winner_id <> l.loser_id
        returning v.id
      )
      select id from updated
    `;
    return rows.length;
  } catch {
    return 0;
  }
}

export async function backfillMissingEmbeddings(
  sql: {
    <T = Record<string, unknown>>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]>;
  },
  batchSize = 200,
): Promise<number> {
  try {
    const rows = await sql<{ id: string; question: string; answer: string }>`
      select id, question, answer
      from vibe_training_pair
      where verified = true and embedding is null
      order by updated_at desc
      limit ${batchSize}
    `;
    let updated = 0;
    for (const r of rows) {
      const vecLit = formatVectorLiteral(computeSemanticEmbedding256(`${r.question} ${r.answer.slice(0, 1200)}`));
      await sql`
        update vibe_training_pair set embedding = ${vecLit}::vector where id = ${r.id}
      `;
      updated += 1;
    }
    return updated;
  } catch {
    return 0;
  }
}

export async function getIngestionTelemetryFromDb(): Promise<{
  recentRuns: Array<{
    runId: string;
    startedAt: string;
    durationMs: number;
    status: string;
    totalFetched: number;
    postgresUpserted: number;
    dbTotalAfter: number | null;
  }>;
  cursors: Array<{
    sourceId: string;
    nextOffset: number;
    totalIngested: number;
    lastRunAt: string | null;
    lastError: string | null;
  }>;
  vectorIndexedCount: number;
  staleSupersededCount: number;
}> {
  try {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const [runs, cursors, counts] = await Promise.all([
      sql<{
        run_id: string;
        started_at: string;
        duration_ms: number;
        status: string;
        total_fetched: number;
        postgres_upserted: number;
        db_total_after: number | null;
      }>`
        select run_id, started_at::text as started_at, duration_ms, status, total_fetched, postgres_upserted, db_total_after
        from knowledge_ingestion_run
        order by started_at desc
        limit 8
      `.catch(() => []),
      sql<{
        source_id: string;
        next_offset: number;
        total_ingested: number;
        last_run_at: string | null;
        last_error: string | null;
      }>`
        select source_id, next_offset, total_ingested, last_run_at::text as last_run_at, last_error
        from knowledge_source_cursor
        order by source_id asc
      `.catch(() => []),
      sql<{ vec_cnt: number; stale_cnt: number }>`
        select
          count(*) filter (where embedding is not null)::int as vec_cnt,
          count(*) filter (where coalesce(stale, false) = true)::int as stale_cnt
        from vibe_training_pair
      `.catch(() => [{ vec_cnt: 0, stale_cnt: 0 }]),
    ]);

    return {
      recentRuns: runs.map((r) => ({
        runId: r.run_id,
        startedAt: r.started_at,
        durationMs: Number(r.duration_ms) || 0,
        status: r.status,
        totalFetched: Number(r.total_fetched) || 0,
        postgresUpserted: Number(r.postgres_upserted) || 0,
        dbTotalAfter: r.db_total_after,
      })),
      cursors: cursors.map((c) => ({
        sourceId: c.source_id,
        nextOffset: Number(c.next_offset) || 0,
        totalIngested: Number(c.total_ingested) || 0,
        lastRunAt: c.last_run_at,
        lastError: c.last_error,
      })),
      vectorIndexedCount: counts[0]?.vec_cnt ?? 0,
      staleSupersededCount: counts[0]?.stale_cnt ?? 0,
    };
  } catch {
    return {
      recentRuns: [],
      cursors: [],
      vectorIndexedCount: 0,
      staleSupersededCount: 0,
    };
  }
}

export async function runContinuousOpenKnowledgeIngestion(options: {
  sources?: OpenIngestionSourceId[];
  perSourceLimit?: number;
  offsetSeed?: number;
  dryRun?: boolean;
} = {}): Promise<ContinuousOpenIngestionResult> {
  const startedAt = new Date();
  const runId = `INGEST-${startedAt.toISOString().replace(/[^0-9]/g, "").slice(0, 14)}`;
  const perSourceLimit = Math.max(1, Math.min(300, options.perSourceLimit ?? 15));
  const defaultSeed = options.offsetSeed ?? computeDailyOffsetSeed(startedAt);

  const enabledSources = new Set<OpenIngestionSourceId>(
    options.sources?.length
      ? options.sources
      : (OPEN_INGESTION_SOURCE_SPECS.map((s) => s.id) as OpenIngestionSourceId[]),
  );

  // Load persisted SQL cursors per source so cron runs increment deterministically with zero re-scans
  const persistedCursorMap = new Map<OpenIngestionSourceId, number>();
  let dbSql: Awaited<ReturnType<typeof import("@/lib/db")["getSql"]>> | null = null;
  if (!options.dryRun) {
    try {
      const { getSql } = await import("@/lib/db");
      dbSql = await getSql();
      const cursorRows = await dbSql<{ source_id: string; next_offset: number }>`
        select source_id, next_offset from knowledge_source_cursor
      `.catch(() => []);
      for (const r of cursorRows) {
        persistedCursorMap.set(r.source_id as OpenIngestionSourceId, Number(r.next_offset) || 0);
      }
    } catch {
      dbSql = null;
    }
  }

  const cursorFor = (id: OpenIngestionSourceId) =>
    options.offsetSeed !== undefined ? options.offsetSeed : (persistedCursorMap.get(id) ?? defaultSeed);

  const allRunners: Array<{
    id: OpenIngestionSourceId;
    spec: OpenIngestionSourceSpec;
    run: (cursor: number) => Promise<OpenIngestedRecord[]>;
  }> = [
    { id: "cosmopedia", spec: OPEN_INGESTION_SOURCE_SPECS[0]!, run: (c) => fetchCosmopediaBatch(perSourceLimit, c) },
    { id: "fineweb-edu", spec: OPEN_INGESTION_SOURCE_SPECS[1]!, run: (c) => fetchFinewebEduBatch(perSourceLimit, c) },
    { id: "arxiv", spec: OPEN_INGESTION_SOURCE_SPECS[2]!, run: (c) => fetchArxivBatch(perSourceLimit, c) },
    { id: "ietf-rfc", spec: OPEN_INGESTION_SOURCE_SPECS[3]!, run: (c) => fetchIetfRfcBatch(perSourceLimit, c) },
    { id: "cisa-kev", spec: OPEN_INGESTION_SOURCE_SPECS[4]!, run: (c) => fetchCisaKevBatch(perSourceLimit, c) },
    { id: "pubmed", spec: OPEN_INGESTION_SOURCE_SPECS[5]!, run: (c) => fetchPubmedBatch(perSourceLimit, c) },
    { id: "mitre-attack", spec: OPEN_INGESTION_SOURCE_SPECS[6]!, run: (c) => fetchMitreAttackBatch(perSourceLimit, c) },
    { id: "owasp-cheatsheets", spec: OPEN_INGESTION_SOURCE_SPECS[7]!, run: (c) => fetchOwaspCheatsheetsBatch(Math.min(12, perSourceLimit), c) },
    { id: "nist-nvd", spec: OPEN_INGESTION_SOURCE_SPECS[8]!, run: (c) => fetchNistNvdBatch(perSourceLimit, c) },
    { id: "world-bank", spec: OPEN_INGESTION_SOURCE_SPECS[9]!, run: (c) => fetchWorldBankIndicatorsBatch(perSourceLimit, c) },
    { id: "open-tech-docs", spec: OPEN_INGESTION_SOURCE_SPECS[10]!, run: (c) => fetchOpenTechDocsBatch(Math.min(7, perSourceLimit), c) },
  ];
  const runners = allRunners.filter((r) => enabledSources.has(r.id));

  const sourceStats: SourceRunStat[] = [];
  const allCandidates: OpenIngestedRecord[] = [];

  await Promise.all(
    runners.map(async (runner) => {
      const usedCursor = cursorFor(runner.id);
      try {
        const rows = await runner.run(usedCursor);
        allCandidates.push(...rows);
        sourceStats.push({
          sourceId: runner.id,
          source: runner.spec.name,
          license: runner.spec.license,
          cursorUsed: usedCursor,
          fetched: rows.length,
          kept: 0,
        });
      } catch (err) {
        sourceStats.push({
          sourceId: runner.id,
          source: runner.spec.name,
          license: runner.spec.license,
          cursorUsed: usedCursor,
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
  let embeddingsWritten = 0;
  let staleSuperseded = 0;
  let dbTotalPairsAfter: number | null = null;

  if (!options.dryRun && dbSql) {
    try {
      for (const rec of kept) {
        const q = stripNullBytes(rec.messages[1]!.content).slice(0, 600);
        const a = stripNullBytes(rec.messages[2]!.content).slice(0, 6000);
        const dbId = `open-${createHash("sha256").update(q.toLowerCase()).digest("hex").slice(0, 20)}`;
        const vecLit = formatVectorLiteral(computeSemanticEmbedding256(`${q} ${a.slice(0, 1200)}`));

        const withVecOk = await dbSql`
          insert into vibe_training_pair (id, question, answer, domain, model, hits, verified, stale, embedding, updated_at)
          values (${dbId}, ${q}, ${a}, ${rec.domain}, ${rec.source}, 10, true, false, ${vecLit}::vector, now())
          on conflict (id) do update set
            answer = excluded.answer,
            domain = excluded.domain,
            model = excluded.model,
            verified = true,
            stale = false,
            embedding = excluded.embedding,
            updated_at = now()
        `.then(() => true).catch(() => false);

        if (withVecOk) {
          embeddingsWritten += 1;
        } else {
          await dbSql`
            insert into vibe_training_pair (id, question, answer, domain, model, hits, verified, updated_at)
            values (${dbId}, ${q}, ${a}, ${rec.domain}, ${rec.source}, 10, true, now())
            on conflict (id) do update set
              answer = excluded.answer,
              domain = excluded.domain,
              model = excluded.model,
              verified = true,
              updated_at = now()
          `;
        }
        postgresUpserted += 1;
      }

      // Backfill up to 100 missing embeddings + run supersession sweeper
      embeddingsWritten += await backfillMissingEmbeddings(dbSql, 100);
      staleSuperseded = await runSupersessionSweeper(dbSql);

      // Persist per-source cursors
      for (const stat of sourceStats) {
        const nextCursor = stat.cursorUsed + Math.max(stat.fetched, stat.error ? 0 : perSourceLimit);
        await dbSql`
          insert into knowledge_source_cursor (source_id, next_offset, total_ingested, last_run_at, last_error, updated_at)
          values (${stat.sourceId}, ${nextCursor}, ${stat.kept}, now(), ${stat.error || null}, now())
          on conflict (source_id) do update set
            next_offset = excluded.next_offset,
            total_ingested = knowledge_source_cursor.total_ingested + excluded.total_ingested,
            last_run_at = now(),
            last_error = excluded.last_error,
            updated_at = now()
        `.catch(() => undefined);
      }

      const countRows = await dbSql<{ cnt: number }>`
        select count(*)::int as cnt from vibe_training_pair where verified = true and coalesce(stale, false) = false
      `.catch(async () => dbSql!< { cnt: number }>`select count(*)::int as cnt from vibe_training_pair where verified = true`);
      dbTotalPairsAfter = countRows[0]?.cnt ?? null;

      const finishNow = new Date();
      await dbSql`
        insert into knowledge_ingestion_run (
          run_id, started_at, finished_at, duration_ms, status, offset_seed,
          total_fetched, total_deduplicated, postgres_upserted, db_total_after, sources_json
        )
        values (
          ${runId}, ${startedAt.toISOString()}, ${finishNow.toISOString()},
          ${finishNow.getTime() - startedAt.getTime()}, ${kept.length > 0 ? "ok" : "partial"},
          ${defaultSeed}, ${allCandidates.length}, ${kept.length}, ${postgresUpserted},
          ${dbTotalPairsAfter}, ${JSON.stringify(sourceStats)}::jsonb
        )
      `.catch(() => undefined);

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
    offsetSeed: defaultSeed,
    dryRun: Boolean(options.dryRun),
    totalFetched: allCandidates.length,
    totalDeduplicated: kept.length,
    postgresUpserted,
    embeddingsWritten,
    staleSuperseded,
    dbTotalPairsAfter,
    sources: sourceStats,
  };
}
