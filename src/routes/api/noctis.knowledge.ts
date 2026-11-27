import { createFileRoute } from "@tanstack/react-router";
import {
  formatCurriculumTracksTableMarkdown,
  isTableFormatRequested,
} from "@/lib/noctis-knowledge-router";
import {
  getNoctisKnowledgeStats,
  retrieveNoctisKnowledge,
} from "@/lib/noctis-knowledge-retrieval.server";
import { getOpenCurriculumStats, OPEN_CURRICULUM_TRACKS } from "@/lib/noctis-open-curriculum-1m";

const CORS_HEADERS = {
  "cache-control": "no-store",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "Content-Type, Authorization",
};

function parseFormat(raw: string | null | undefined, query: string): "json" | "markdown" | "table" {
  const f = (raw || "").toLowerCase().trim();
  if (f === "table" || f === "markdown" || f === "json") return f;
  return isTableFormatRequested(query) ? "table" : "json";
}

function parseSource(raw: string | null | undefined): "all" | "db" | "curriculum" | "domains" {
  const s = (raw || "").toLowerCase().trim();
  if (s === "db" || s === "curriculum" || s === "domains") return s;
  return "all";
}

export const Route = createFileRoute("/api/noctis/knowledge")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const domain = url.searchParams.get("domain") || undefined;
        const track = url.searchParams.get("track") || undefined;
        const rawOut = url.searchParams.get("raw") === "1" || url.searchParams.get("raw") === "true";

        if (url.searchParams.get("stats") === "1") {
          const stats = await getNoctisKnowledgeStats();
          return Response.json(stats, { headers: CORS_HEADERS });
        }

        if (url.searchParams.get("tracks") === "1") {
          const filtered = domain
            ? OPEN_CURRICULUM_TRACKS.filter((t) => t.domain.toLowerCase() === domain.toLowerCase())
            : OPEN_CURRICULUM_TRACKS;
          const markdownTable = formatCurriculumTracksTableMarkdown(domain);
          if (rawOut) {
            return new Response(markdownTable, {
              headers: { ...CORS_HEADERS, "content-type": "text/markdown; charset=utf-8" },
            });
          }
          return Response.json(
            {
              ok: true,
              stats: getOpenCurriculumStats(),
              totalTracks: filtered.length,
              tracks: filtered,
              markdownTable,
            },
            { headers: CORS_HEADERS },
          );
        }

        const q = url.searchParams.get("q") || url.searchParams.get("query") || "";
        if (!q.trim() && !track && !domain && !url.searchParams.get("source")) {
          const stats = await getNoctisKnowledgeStats();
          return Response.json(
            {
              ...stats,
              endpoints: {
                search: "/api/noctis/knowledge?q=<query>&format=table&limit=10",
                rawMarkdownTable: "/api/noctis/knowledge?q=<query>&format=table&raw=1",
                tracksDirectory: "/api/noctis/knowledge?tracks=1&format=table",
                stats: "/api/noctis/knowledge?stats=1",
                postQuery: "POST /api/noctis/knowledge { q, track, domain, source, format, limit }",
              },
            },
            { headers: CORS_HEADERS },
          );
        }

        const format = parseFormat(url.searchParams.get("format"), q);
        const source = parseSource(url.searchParams.get("source"));
        const limitNum = Number(url.searchParams.get("limit") || 10);
        const limit = Number.isFinite(limitNum) ? limitNum : 10;

        const result = await retrieveNoctisKnowledge(q || track || domain || "all", {
          track,
          domain,
          source,
          format,
          limit,
        });

        if (rawOut && (format === "table" || format === "markdown")) {
          return new Response(format === "table" ? result.markdownTable : result.markdownReport, {
            headers: { ...CORS_HEADERS, "content-type": "text/markdown; charset=utf-8" },
          });
        }

        return Response.json(result, { headers: CORS_HEADERS });
      },
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => null)) as {
          q?: string;
          query?: string;
          prompt?: string;
          track?: string;
          domain?: string;
          source?: string;
          format?: string;
          limit?: number;
        } | null;

        const q = String(body?.q || body?.query || body?.prompt || "").trim();
        const format = parseFormat(body?.format, q);
        const source = parseSource(body?.source);
        const limit = typeof body?.limit === "number" && Number.isFinite(body.limit) ? body.limit : 10;

        const result = await retrieveNoctisKnowledge(q || body?.track || body?.domain || "all", {
          track: body?.track,
          domain: body?.domain,
          source,
          format,
          limit,
        });

        return Response.json(result, { headers: CORS_HEADERS });
      },
    },
  },
});
