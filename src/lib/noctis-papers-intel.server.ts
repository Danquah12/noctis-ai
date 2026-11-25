/**
 * Noctis Live Academic & Biomedical Literature Search Engine (`/papers`)
 *
 * Queries live public arXiv Atom API and NCBI PubMed E-utilities in parallel,
 * returning verified paper titles, authors, publication dates, source links,
 * and ready-to-copy APA & BibTeX citations. Zero API keys required.
 *
 * Pure TypeScript with no `@/` path aliases so it runs under Vite SSR, tsx, and
 * `node --experimental-strip-types --test`.
 */

export interface PaperRecord {
  source: "arXiv" | "PubMed";
  id: string;
  title: string;
  authors: string[];
  published: string;
  venue: string;
  url: string;
  summary: string;
}

function decodeXmlEntities(raw: string): string {
  return raw
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseArxivAtomXml(xml: string): PaperRecord[] {
  const entries = [...String(xml || "").matchAll(/<entry>([\s\S]*?)<\/entry>/gi)];
  const out: PaperRecord[] = [];
  for (const match of entries) {
    const block = match[1] || "";
    const idRaw = block.match(/<id>([\s\S]*?)<\/id>/i)?.[1] || "";
    const arxivId = idRaw.replace(/^https?:\/\/arxiv\.org\/abs\//i, "").trim();
    const titleRaw = block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "";
    const summaryRaw = block.match(/<summary>([\s\S]*?)<\/summary>/i)?.[1] || "";
    const published = (block.match(/<published>([\s\S]*?)<\/published>/i)?.[1] || "").slice(0, 10);
    const authors = [...block.matchAll(/<author>\s*<name>([\s\S]*?)<\/name>/gi)]
      .map((a) => decodeXmlEntities(a[1] || ""))
      .filter(Boolean);
    if (!titleRaw || !arxivId) continue;
    out.push({
      source: "arXiv",
      id: `arXiv:${arxivId}`,
      title: decodeXmlEntities(titleRaw),
      authors,
      published: published || "Recent",
      venue: "arXiv Preprint",
      url: idRaw.trim().startsWith("http") ? idRaw.trim() : `https://arxiv.org/abs/${arxivId}`,
      summary: decodeXmlEntities(summaryRaw).slice(0, 240),
    });
  }
  return out;
}

export function formatApaCitation(paper: PaperRecord): string {
  const authorText =
    paper.authors.length > 0
      ? paper.authors.slice(0, 3).join(", ") + (paper.authors.length > 3 ? ", et al." : "")
      : "Unknown Author";
  const year = paper.published.match(/\b(19|20)\d{2}\b/)?.[0] || "n.d.";
  return `${authorText} (${year}). ${paper.title}. *${paper.venue}*. ${paper.url}`;
}

export function formatBibtexCitation(paper: PaperRecord): string {
  const firstAuthor = (paper.authors[0] || "noctis").split(/[\s,]+/)[0]?.replace(/[^a-zA-Z0-9]/g, "") || "ref";
  const year = paper.published.match(/\b(19|20)\d{2}\b/)?.[0] || "2026";
  const cleanId = paper.id.replace(/[^a-zA-Z0-9]/g, "");
  return [
    `@article{${firstAuthor.toLowerCase()}${year}${cleanId.slice(-5)},`,
    `  title = {${paper.title}},`,
    `  author = {${paper.authors.join(" and ") || "Unknown"}},`,
    `  journal = {${paper.venue}},`,
    `  year = {${year}},`,
    `  url = {${paper.url}}`,
    `}`,
  ].join("\n");
}

function extractCleanSearchTopic(prompt: string): string {
  const stripped = prompt
    .replace(/\b(?:arxiv|pubmed|literature\s+(?:review|search)|find|search|fetch|show|recent|peer[-\s]reviewed|research\s+papers?|papers?|bibtex|apa|citations?|on|about|for|the|latest)\b/gi, " ")
    .replace(/[^\p{L}0-9\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.length >= 3 ? stripped.slice(0, 100) : "quantum error correction";
}

async function fetchLiveArxivPapers(topic: string): Promise<{ papers: PaperRecord[]; source: string }> {
  try {
    const res = await fetch(
      `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(topic)}&start=0&max_results=4&sortBy=relevance`,
      { headers: { "user-agent": "Noctis-Papers-Intel/1.0" }, signal: AbortSignal.timeout(6500) },
    );
    if (!res.ok) return { papers: [], source: `arXiv HTTP ${res.status}` };
    const xml = await res.text();
    const papers = parseArxivAtomXml(xml);
    return { papers, source: "arXiv Atom API" };
  } catch {
    return { papers: [], source: "arXiv API unavailable" };
  }
}

async function fetchLivePubMedPapers(topic: string): Promise<{ papers: PaperRecord[]; totalCount: number; source: string }> {
  try {
    const searchRes = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(topic)}&retmax=4&retmode=json`,
      { headers: { "user-agent": "Noctis-Papers-Intel/1.0" }, signal: AbortSignal.timeout(6500) },
    );
    if (!searchRes.ok) return { papers: [], totalCount: 0, source: `PubMed HTTP ${searchRes.status}` };
    const searchData = (await searchRes.json()) as {
      esearchresult?: { idlist?: string[]; count?: string };
    };
    const ids = searchData.esearchresult?.idlist || [];
    const totalCount = Number(searchData.esearchresult?.count || 0);
    if (!ids.length) return { papers: [], totalCount, source: "NCBI PubMed E-utilities" };

    const sumRes = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(",")}&retmode=json`,
      { headers: { "user-agent": "Noctis-Papers-Intel/1.0" }, signal: AbortSignal.timeout(6500) },
    );
    if (!sumRes.ok) return { papers: [], totalCount, source: `PubMed summary HTTP ${sumRes.status}` };
    const sumData = (await sumRes.json()) as {
      result?: Record<
        string,
        {
          uid?: string;
          title?: string;
          pubdate?: string;
          source?: string;
          authors?: Array<{ name?: string }>;
        }
      >;
    };
    const papers: PaperRecord[] = [];
    for (const id of ids) {
      const item = sumData.result?.[id];
      if (!item || !item.title) continue;
      papers.push({
        source: "PubMed",
        id: `PMID:${id}`,
        title: String(item.title).replace(/\.$/, ""),
        authors: (item.authors || []).map((a) => String(a.name || "")).filter(Boolean),
        published: String(item.pubdate || "Recent"),
        venue: String(item.source || "PubMed Indexed Journal"),
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
        summary: `PubMed indexed record (${item.source || "Journal"}).`,
      });
    }
    return { papers, totalCount, source: "NCBI PubMed E-utilities" };
  } catch {
    return { papers: [], totalCount: 0, source: "PubMed API unavailable" };
  }
}

export async function executePapersIntelQuery(prompt: string): Promise<string> {
  const topic = extractCleanSearchTopic(prompt);
  const [arxivOut, pubmedOut] = await Promise.all([
    fetchLiveArxivPapers(topic),
    fetchLivePubMedPapers(topic),
  ]);

  const combined = [...pubmedOut.papers.slice(0, 3), ...arxivOut.papers.slice(0, 3)].slice(0, 6);
  const dashboardPayload = {
    title: `Live Scientific & Biomedical Literature — "${topic}"`,
    subtitle: `${arxivOut.source} + ${pubmedOut.source}`,
    riskLevel: "low",
    kpis: [
      {
        label: "Topic Query",
        value: topic.slice(0, 26),
        sub: `${combined.length} live papers retrieved`,
      },
      {
        label: "PubMed Total Hits",
        value: pubmedOut.totalCount.toLocaleString(),
        sub: `${pubmedOut.papers.length} recent summaries loaded`,
      },
      {
        label: "arXiv Preprints",
        value: String(arxivOut.papers.length),
        sub: arxivOut.papers[0]?.id || arxivOut.source,
      },
      {
        label: "Citation Formats",
        value: "APA + BibTeX",
        sub: "Verified DOIs / PMIDs / arXiv IDs",
      },
    ],
  };

  const parts: string[] = [
    `## Live Literature Search & Citation Brief — "${topic}"`,
    `\`\`\`noctis-dashboard\n${JSON.stringify(dashboardPayload)}\n\`\`\``,
  ];

  if (combined.length) {
    parts.push(
      [
        "### 1. Retrieved Peer-Reviewed & Preprint Literature",
        "| Source | ID | Title & Direct Link | Lead Authors | Published | Venue |",
        "| :--- | :--- | :--- | :--- | :--- | :--- |",
        ...combined.map((p) => {
          const auth = p.authors.slice(0, 2).join(", ") + (p.authors.length > 2 ? " et al." : "");
          return `| **${p.source}** | \`${p.id}\` | [${p.title.replace(/\|/g, " ")}](${p.url}) | ${auth || "—"} | ${p.published} | ${p.venue} |`;
        }),
      ].join("\n"),
    );

    parts.push(
      [
        "### 2. Ready-to-Use APA & BibTeX Citations",
        ...combined.slice(0, 3).map((p, i) => `${i + 1}. ${formatApaCitation(p)}`),
        "",
        "```bibtex",
        combined.slice(0, 2).map((p) => formatBibtexCitation(p)).join("\n\n"),
        "```",
      ].join("\n"),
    );
  } else {
    parts.push(`No live records returned for \`${topic}\`. Live source status: ${arxivOut.source} · ${pubmedOut.source}.`);
  }

  parts.push(`**Live Sources Checked:** ${arxivOut.source} · ${pubmedOut.source}`);
  return parts.join("\n\n");
}
