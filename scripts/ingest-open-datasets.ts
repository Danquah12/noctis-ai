/**
 * Permissive Open-Dataset Ingestion Connector (Zero Credentials Required)
 *
 * Fetches real, permissively licensed educational, research, and open-standards technical corpora
 * across all core computer science, engineering, cloud, AI/ML, database, networking, and security tracks:
 *   1. HuggingFace Datasets Server — `HuggingFaceTB/cosmopedia` (`openstax` & `stanford`, Apache-2.0)
 *   2. HuggingFace Datasets Server — `HuggingFaceFW/fineweb-edu` (`sample-10BT`, ODC-By 1.0, tech-filtered)
 *   3. arXiv Open-Access Atom API (`cs.SE`, `cs.DC`, `cs.CR`, `cs.AI`, `cs.DB`, `cs.NI`, `cs.OS`, CC-BY / Open Archive)
 *   4. IETF Datatracker Public API (Published RFC abstracts & specifications, IETF Trust / Public Standards)
 *
 * Writes deduplicated, validation-isolated ChatML JSONL.GZ to `data/open-datasets/noctis-open-datasets-sft.jsonl.gz`
 * plus `data/open-datasets/manifest.json`.
 *
 * Usage:
 *   npm run ingest:open-datasets
 *   node --experimental-strip-types scripts/ingest-open-datasets.ts --hf-limit=300 --arxiv-limit=200 --rfc-limit=100 --sync-db --db-limit=50
 */
import { createHash } from "node:crypto";
import { once } from "node:events";
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createGzip } from "node:zlib";
import pg from "pg";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const DATA_DIR = path.join(ROOT, "data");
const OUT_DIR = path.join(DATA_DIR, "open-datasets");

interface OpenIngestedRecord {
  id: string;
  source: string;
  license: string;
  domain: string;
  url: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
}

const TECH_FILTER_REGEX =
  /\b(algorithm|architecture|kubernetes|docker|distributed|consensus|raft|database|postgres|sql|python|typescript|rust|golang|kernel|ebpf|linux|network|tcp|quic|tls|cryptograph|security|owasp|vulnerability|machine learning|transformer|neural|llm|compiler|concurrency|memory|api|http|microservices|cloud|observability|telemetry|latency|cache|encryption|rfc)\b/i;

function parseIntArg(name: string, fallback: number): number {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  if (!hit) return fallback;
  const parsed = Number.parseInt(hit.slice(prefix.length), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function loadEnvLocalIfMissing() {
  if (process.env.DATABASE_URL?.trim()) return;
  const envPath = path.join(ROOT, ".env.local");
  if (!existsSync(envPath)) return;
  for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function classifyTechDomain(text: string): string {
  const lower = text.toLowerCase();
  if (/\b(cve|owasp|cryptograph|tls|auth|vulnerability|malware|attack|zero trust|nist 800-53)\b/.test(lower)) {
    return "cybersecurity";
  }
  if (/\b(transformer|neural|llm|machine learning|deep learning|diffusion|reinforcement)\b/.test(lower)) {
    return "science";
  }
  if (/\b(finance|accounting|risk|ledger|pricing|arbitrage|portfolio)\b/.test(lower)) {
    return "finance";
  }
  return "engineering";
}

function loadHeldOutPrompts(): Set<string> {
  const out = new Set<string>();
  const valPath = path.join(DATA_DIR, "noctis-cot-validation-250.jsonl");
  if (!existsSync(valPath)) return out;
  for (const line of readFileSync(valPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as { messages?: Array<{ role?: string; content?: string }> };
      const u = parsed.messages?.find((m) => m.role === "user")?.content?.trim().toLowerCase();
      if (u) out.add(u);
    } catch {
      /* ignore malformed */
    }
  }
  return out;
}

async function fetchJsonWithTimeout<T>(url: string, timeoutMs = 20_000): Promise<T> {
  const res = await fetch(url, {
    headers: { "User-Agent": "NoctisOpenDatasetIngestor/1.0 (+https://www.dstrike.app)" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

async function fetchTextWithTimeout(url: string, timeoutMs = 20_000): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "NoctisOpenDatasetIngestor/1.0 (+https://www.dstrike.app)" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  return await res.text();
}

async function ingestHuggingFaceCosmopedia(limit: number): Promise<OpenIngestedRecord[]> {
  const records: OpenIngestedRecord[] = [];
  const configs: Array<{ config: string; target: number }> = [
    { config: "openstax", target: Math.ceil(limit / 2) },
    { config: "stanford", target: Math.floor(limit / 2) },
  ];

  for (const { config, target } of configs) {
    let offset = 0;
    let collected = 0;
    while (collected < target && offset < target * 4) {
      const length = Math.min(100, target - collected + 20);
      const url = `https://datasets-server.huggingface.co/rows?dataset=HuggingFaceTB%2Fcosmopedia&config=${encodeURIComponent(config)}&split=train&offset=${offset}&length=${length}`;
      const data = await fetchJsonWithTimeout<{
        rows?: Array<{ row_idx: number; row?: { prompt?: string; text?: string; audience?: string } }>;
      }>(url);
      const rows = data.rows || [];
      if (rows.length === 0) break;

      for (const item of rows) {
        if (collected >= target) break;
        const prompt = (item.row?.prompt || "").trim();
        const text = (item.row?.text || "").trim();
        if (prompt.length < 25 || text.length < 150) continue;
        if (!TECH_FILTER_REGEX.test(`${prompt}\n${text.slice(0, 600)}`)) continue;

        const domain = classifyTechDomain(`${prompt} ${text.slice(0, 400)}`);
        records.push({
          id: `HF-COSMO-${config.toUpperCase()}-${item.row_idx}`,
          source: `HuggingFaceTB/cosmopedia:${config}`,
          license: "Apache-2.0",
          domain,
          url: `https://huggingface.co/datasets/HuggingFaceTB/cosmopedia`,
          messages: [
            {
              role: "system",
              content: `You are Noctis Sovereign Intelligence (${domain}) trained on open educational corpora.`,
            },
            { role: "user", content: prompt.slice(0, 1200) },
            { role: "assistant", content: text.slice(0, 6000) },
          ],
        });
        collected++;
      }
      offset += rows.length;
    }
  }
  return records;
}

async function ingestHuggingFaceFinewebEdu(limit: number): Promise<OpenIngestedRecord[]> {
  const records: OpenIngestedRecord[] = [];
  let offset = 0;
  while (records.length < limit && offset < limit * 5) {
    const length = 100;
    const url = `https://datasets-server.huggingface.co/rows?dataset=HuggingFaceFW%2Ffineweb-edu&config=sample-10BT&split=train&offset=${offset}&length=${length}`;
    const data = await fetchJsonWithTimeout<{
      rows?: Array<{ row_idx: number; row?: { text?: string; url?: string; score?: number } }>;
    }>(url);
    const rows = data.rows || [];
    if (rows.length === 0) break;

    for (const item of rows) {
      if (records.length >= limit) break;
      const text = (item.row?.text || "").trim();
      if (text.length < 250) continue;
      if (!TECH_FILTER_REGEX.test(text.slice(0, 1000))) continue;

      const firstSentence = text.split(/(?<=[.!?])\s+/)[0]?.slice(0, 180) || "Technical Systems Reference";
      const domain = classifyTechDomain(text.slice(0, 600));
      records.push({
        id: `HF-FINEWEB-EDU-${item.row_idx}`,
        source: "HuggingFaceFW/fineweb-edu:sample-10BT",
        license: "ODC-By-1.0",
        domain,
        url: item.row?.url || "https://huggingface.co/datasets/HuggingFaceFW/fineweb-edu",
        messages: [
          {
            role: "system",
            content: `You are Noctis Sovereign Intelligence (${domain}) synthesizing open educational engineering material.`,
          },
          {
            role: "user",
            content: `Summarize key technical concepts and engineering takeaways regarding: ${firstSentence}`,
          },
          { role: "assistant", content: text.slice(0, 6000) },
        ],
      });
    }
    offset += rows.length;
  }
  return records;
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

async function ingestArxivComputerScience(limit: number): Promise<OpenIngestedRecord[]> {
  if (limit <= 0) return [];
  const query = encodeURIComponent("cat:cs.SE OR cat:cs.DC OR cat:cs.CR OR cat:cs.AI OR cat:cs.DB OR cat:cs.NI OR cat:cs.OS");
  const maxResults = Math.min(250, limit);
  const url = `https://export.arxiv.org/api/query?search_query=${query}&start=0&max_results=${maxResults}&sortBy=submittedDate&sortOrder=descending`;
  const xml = await fetchTextWithTimeout(url, 25_000);

  const records: OpenIngestedRecord[] = [];
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
  for (const entry of entries) {
    const idMatch = entry.match(/<id>([\s\S]*?)<\/id>/);
    const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
    const summaryMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/);
    const rawUrl = idMatch?.[1]?.trim() || "";
    const title = decodeXmlEntities(titleMatch?.[1] || "");
    const summary = decodeXmlEntities(summaryMatch?.[1] || "");
    if (!title || summary.length < 80) continue;

    const arxivId = rawUrl.split("/abs/")[1] || createHash("sha256").update(title).digest("hex").slice(0, 12);
    const domain = classifyTechDomain(`${title} ${summary}`);
    records.push({
      id: `ARXIV-${arxivId.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
      source: "arXiv-CS-OpenArchive",
      license: "arXiv-Open-Access-Abstract",
      domain,
      url: rawUrl || "https://arxiv.org",
      messages: [
        {
          role: "system",
          content: `You are Noctis Research Intelligence (${domain}) citing primary open-access computer science research.`,
        },
        {
          role: "user",
          content: `Explain the technical research problem, method, and engineering implications of "${title}" (${arxivId}).`,
        },
        {
          role: "assistant",
          content:
            `### ${title} (${arxivId})\n` +
            `- **Primary Open-Access Source:** ${rawUrl || "https://arxiv.org"}\n` +
            `- **Abstract & Core Findings:**\n${summary}\n\n` +
            `- **Engineering Application:** Evaluate reproducibility bounds, threat/failure assumptions, and measurable system benchmarks before production rollout.`,
        },
      ],
    });
  }
  return records;
}

async function ingestIetfRfcs(limit: number): Promise<OpenIngestedRecord[]> {
  if (limit <= 0) return [];
  const batchSize = Math.min(100, limit);
  const url = `https://datatracker.ietf.org/api/v1/doc/document/?type=rfc&format=json&limit=${batchSize}`;
  const data = await fetchJsonWithTimeout<{
    objects?: Array<{
      name?: string;
      rfc_number?: number;
      title?: string;
      abstract?: string;
      std_level?: string;
    }>;
  }>(url, 25_000);

  const records: OpenIngestedRecord[] = [];
  for (const doc of data.objects || []) {
    const title = (doc.title || "").trim();
    const abs = (doc.abstract || "").trim().replace(/\s+/g, " ");
    const rfcNum = doc.rfc_number;
    const name = (doc.name || (rfcNum ? `rfc${rfcNum}` : "")).toUpperCase();
    if (!title || abs.length < 60) continue;

    const rfcLabel = rfcNum ? `RFC ${rfcNum}` : name;
    const rfcUrl = rfcNum ? `https://www.rfc-editor.org/rfc/rfc${rfcNum}.html` : "https://datatracker.ietf.org/";
    const domain = classifyTechDomain(`${title} ${abs}`);
    records.push({
      id: `IETF-${name}`,
      source: "IETF-Datatracker-RFC",
      license: "IETF-Open-Standards",
      domain,
      url: rfcUrl,
      messages: [
        {
          role: "system",
          content: `You are Noctis Protocol Engineering (${domain}) grounded in published IETF RFC specifications.`,
        },
        {
          role: "user",
          content: `Summarize the technical scope and protocol requirements defined by **${rfcLabel}: ${title}**.`,
        },
        {
          role: "assistant",
          content:
            `### ${rfcLabel}: ${title}\n` +
            `- **Specification URL:** ${rfcUrl}\n` +
            `- **Abstract & Protocol Scope:**\n${abs}\n\n` +
            `- **Implementation Invariant:** Enforce strict wire-format parsing, explicit timeout bounds, and backward-compatibility checks per ${rfcLabel}.`,
        },
      ],
    });
  }
  return records;
}

async function main() {
  loadEnvLocalIfMissing();
  mkdirSync(OUT_DIR, { recursive: true });

  const hfLimit = parseIntArg("hf-limit", 250);
  const arxivLimit = parseIntArg("arxiv-limit", 150);
  const rfcLimit = parseIntArg("rfc-limit", 100);
  const syncDb = hasFlag("sync-db");
  const dbLimit = parseIntArg("db-limit", 50);

  const heldOutPrompts = loadHeldOutPrompts();
  const sourceStats: Array<{ source: string; license: string; fetched: number; kept: number; error?: string }> = [];
  const allCandidates: OpenIngestedRecord[] = [];

  const pipelines: Array<{ name: string; license: string; fn: () => Promise<OpenIngestedRecord[]> }> = [
    { name: "HuggingFaceTB/cosmopedia", license: "Apache-2.0", fn: () => ingestHuggingFaceCosmopedia(hfLimit) },
    { name: "HuggingFaceFW/fineweb-edu", license: "ODC-By-1.0", fn: () => ingestHuggingFaceFinewebEdu(hfLimit) },
    { name: "arXiv-CS-OpenArchive", license: "arXiv-Open-Access", fn: () => ingestArxivComputerScience(arxivLimit) },
    { name: "IETF-Datatracker-RFC", license: "IETF-Open-Standards", fn: () => ingestIetfRfcs(rfcLimit) },
  ];

  for (const pipe of pipelines) {
    try {
      const items = await pipe.fn();
      allCandidates.push(...items);
      sourceStats.push({ source: pipe.name, license: pipe.license, fetched: items.length, kept: 0 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      sourceStats.push({ source: pipe.name, license: pipe.license, fetched: 0, kept: 0, error: msg });
    }
  }

  const seenPrompts = new Set<string>();
  const kept: OpenIngestedRecord[] = [];
  let heldOutSkipped = 0;

  for (const rec of allCandidates) {
    const userPrompt = rec.messages[1]?.content?.trim().toLowerCase() || "";
    if (!userPrompt) continue;
    if (heldOutPrompts.has(userPrompt)) {
      heldOutSkipped++;
      continue;
    }
    const hash = createHash("sha256").update(userPrompt).digest("hex");
    if (seenPrompts.has(hash)) continue;
    seenPrompts.add(hash);
    kept.push(rec);

    const stat = sourceStats.find((s) => rec.source.startsWith(s.source));
    if (stat) stat.kept++;
  }

  if (kept.length === 0) {
    console.error("[ingest-open-datasets] All public sources returned 0 usable records:", JSON.stringify(sourceStats));
    process.exit(1);
  }

  const outFile = path.join(OUT_DIR, "noctis-open-datasets-sft.jsonl.gz");
  const fileStream = createWriteStream(outFile);
  const gzip = createGzip({ level: 3 });
  const hash = createHash("sha256");
  let bytes = 0;
  gzip.on("data", (chunk: Buffer) => {
    bytes += chunk.length;
    hash.update(chunk);
  });
  gzip.pipe(fileStream);

  for (const rec of kept) {
    const line = `${JSON.stringify(rec)}\n`;
    if (!gzip.write(line)) {
      await once(gzip, "drain");
    }
  }
  const finished = once(fileStream, "finish");
  gzip.end();
  await finished;

  const manifest = {
    generatedAt: new Date().toISOString(),
    outputFile: path.relative(ROOT, outFile),
    totalKeptRows: kept.length,
    heldOutSkipped,
    compressedBytes: bytes,
    sha256: hash.digest("hex"),
    sources: sourceStats,
  };
  writeFileSync(path.join(OUT_DIR, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  let postgresUpserted = 0;
  if (syncDb && process.env.DATABASE_URL?.trim()) {
    const databaseUrl = process.env.DATABASE_URL.trim();
    const pool = new pg.Pool({
      connectionString: databaseUrl,
      ssl: /localhost|127\.0\.0\.1/.test(databaseUrl) ? undefined : { rejectUnauthorized: false },
    });
    const stripNull = (s: string) => s.replace(/\u0000/g, "");
    try {
      const client = await pool.connect();
      try {
        for (const rec of kept.slice(0, dbLimit)) {
          const q = stripNull(rec.messages[1]!.content);
          const a = stripNull(rec.messages[2]!.content);
          const id = `open-${createHash("sha256").update(q.toLowerCase()).digest("hex").slice(0, 20)}`;
          await client.query(
            `INSERT INTO public.vibe_training_pair (id, question, answer, domain, model, hits, updated_at)
             VALUES ($1, $2, $3, $4, $5, 10, NOW())
             ON CONFLICT (id) DO UPDATE SET
               answer = EXCLUDED.answer,
               domain = EXCLUDED.domain,
               updated_at = NOW()`,
            [id, q, a, rec.domain, rec.source],
          );
          postgresUpserted++;
        }
      } finally {
        client.release();
      }
    } finally {
      await pool.end();
    }
  }

  console.log(
    JSON.stringify({
      status: "ok",
      totalKeptRows: kept.length,
      heldOutSkipped,
      compressedBytes: bytes,
      postgresUpserted,
      sources: sourceStats,
    }),
  );
}

main().catch((err) => {
  console.error("[ingest-open-datasets] error:", err);
  process.exit(1);
});
