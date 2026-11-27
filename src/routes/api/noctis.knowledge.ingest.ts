import { createFileRoute } from "@tanstack/react-router";
import {
  computeDailyOffsetSeed,
  getIngestionTelemetryFromDb,
  OPEN_INGESTION_SOURCE_SPECS,
  runContinuousOpenKnowledgeIngestion,
  type OpenIngestionSourceId,
} from "@/lib/noctis-open-ingestion.server";
import { getNoctisKnowledgeStats } from "@/lib/noctis-knowledge-retrieval.server";

const CORS_HEADERS = {
  "cache-control": "no-store",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "Content-Type, Authorization",
};

const VALID_SOURCES = new Set<OpenIngestionSourceId>([
  "cosmopedia",
  "fineweb-edu",
  "arxiv",
  "ietf-rfc",
  "cisa-kev",
  "pubmed",
  "mitre-attack",
  "owasp-cheatsheets",
  "nist-nvd",
  "world-bank",
  "open-tech-docs",
]);

function parseSources(raw: string | string[] | null | undefined): OpenIngestionSourceId[] | undefined {
  if (!raw) return undefined;
  const parts = Array.isArray(raw) ? raw : String(raw).split(",");
  const filtered = parts
    .map((s) => s.trim().toLowerCase() as OpenIngestionSourceId)
    .filter((s) => VALID_SOURCES.has(s));
  return filtered.length ? filtered : undefined;
}

function isAuthorizedToTrigger(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const requiredKey = process.env.NOCTIS_API_KEY?.trim();
  if (request.headers.get("x-vercel-cron") === "1") return true;

  const authHeader = request.headers.get("authorization") || "";
  const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (cronSecret && bearer === cronSecret) return true;
  if (requiredKey && (bearer === requiredKey || request.headers.get("x-noctis-key") === requiredKey)) return true;

  const site = request.headers.get("sec-fetch-site");
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (site === "same-origin") return true;
  if (origin && host) {
    try {
      if (new URL(origin).host === host) return true;
    } catch {
      /* ignore malformed origin */
    }
  }
  return !cronSecret && !requiredKey;
}

export const Route = createFileRoute("/api/noctis/knowledge/ingest")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const isCron = url.searchParams.get("cron") === "1";
        const isRun = url.searchParams.get("run") === "1";

        if (!isCron && !isRun) {
          const [stats, telemetry] = await Promise.all([
            getNoctisKnowledgeStats(),
            getIngestionTelemetryFromDb(),
          ]);
          return Response.json(
            {
              ok: true,
              cronSchedule: "0 8 * * * (Daily 08:00 UTC)",
              nextDailyOffsetSeed: computeDailyOffsetSeed(),
              sources: OPEN_INGESTION_SOURCE_SPECS,
              knowledgeStats: stats,
              telemetry,
            },
            { headers: CORS_HEADERS },
          );
        }

        if (!isCron && !isAuthorizedToTrigger(request)) {
          return Response.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
        }

        const limitRaw = Number(url.searchParams.get("limit") || 15);
        const perSourceLimit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(25, limitRaw)) : 15;
        const offsetRaw = url.searchParams.get("offset");
        const offsetSeed = offsetRaw !== null && Number.isFinite(Number(offsetRaw)) ? Number(offsetRaw) : undefined;
        const dryRun = url.searchParams.get("dryRun") === "1";

        const result = await runContinuousOpenKnowledgeIngestion({
          sources: parseSources(url.searchParams.get("sources")),
          perSourceLimit,
          offsetSeed,
          dryRun,
        });

        return Response.json(result, { headers: CORS_HEADERS });
      },
      POST: async ({ request }) => {
        if (!isAuthorizedToTrigger(request)) {
          return Response.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
        }
        const body = (await request.json().catch(() => null)) as {
          sources?: string[] | string;
          perSourceLimit?: number;
          offset?: number;
          dryRun?: boolean;
        } | null;

        const limitRaw = typeof body?.perSourceLimit === "number" ? body.perSourceLimit : 15;
        const perSourceLimit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(50, limitRaw)) : 15;
        const offsetSeed = typeof body?.offset === "number" && Number.isFinite(body.offset) ? body.offset : undefined;

        const result = await runContinuousOpenKnowledgeIngestion({
          sources: parseSources(body?.sources),
          perSourceLimit,
          offsetSeed,
          dryRun: Boolean(body?.dryRun),
        });

        return Response.json(result, { headers: CORS_HEADERS });
      },
    },
  },
});
