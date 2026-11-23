import { createFileRoute } from "@tanstack/react-router";

const CORS_HEADERS = {
  "cache-control": "no-store",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "Content-Type, Authorization, X-Noctis-Key, X-Hub-Signature-256, Stripe-Signature",
};

export const Route = createFileRoute("/api/noctis/ingest")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),

      GET: async ({ request }) => {
        const url = new URL(request.url);
        const { getRecentIngestedStream, getIngestStatistics } = await import("@/lib/noctis-universal-ingestor");
        const { getPersistedTelemetryStats, listPersistedTelemetryEvents } = await import(
          "@/lib/enterprise/persistence.server"
        );

        const persistedStats = await getPersistedTelemetryStats();
        const stats = getIngestStatistics();
        const mergedStats = {
          ...stats,
          totalIngestedCount: Math.max(stats.totalIngestedCount, persistedStats.totalPersisted),
          criticalAlertsTotal: Math.max(stats.criticalAlertsTotal, persistedStats.criticalCount),
          lastIngestedTimestamp: stats.lastIngestedTimestamp ?? persistedStats.latestIngestedAt,
          persistedTotalCount: persistedStats.totalPersisted,
          persistedCriticalCount: persistedStats.criticalCount,
          latestPersistedAt: persistedStats.latestIngestedAt,
        };

        if (url.searchParams.get("stats") === "true") {
          return Response.json(mergedStats, { headers: CORS_HEADERS });
        }

        const limit = parseInt(url.searchParams.get("limit") || "20", 10);
        const boundedLimit = isNaN(limit) ? 20 : limit;
        const stream = getRecentIngestedStream(boundedLimit);
        const persistedRecentEvents = stream.length === 0 ? await listPersistedTelemetryEvents(boundedLimit) : [];

        return Response.json(
          {
            status: "active",
            gateway: "Noctis Universal Ingestion Streamer (Phase 3)",
            bufferCount: stream.length,
            statistics: mergedStats,
            recentStream: stream,
            persistedRecentEvents,
          },
          { headers: CORS_HEADERS }
        );
      },

      POST: async ({ request }) => {
        const contentType = request.headers.get("content-type") || "";
        const url = new URL(request.url);
        const pluginHint = url.searchParams.get("plugin") || request.headers.get("x-noctis-plugin") || undefined;

        let rawPayload: unknown = null;

        if (contentType.includes("application/json") || contentType.includes("application/fhir+json")) {
          rawPayload = await request.json().catch(() => null);
        } else {
          rawPayload = await request.text().catch(() => null);
        }

        if (!rawPayload) {
          return Response.json(
            { error: "Empty or unparseable telemetry payload. Provide JSON, Syslog, or Webhook string." },
            { status: 400, headers: CORS_HEADERS }
          );
        }

        const { ingestUniversalTelemetry } = await import("@/lib/noctis-universal-ingestor");
        const { persistTelemetryEvents } = await import("@/lib/enterprise/persistence.server");

        const result = ingestUniversalTelemetry(rawPayload, {
          pluginHint,
          sourceIp: request.headers.get("x-forwarded-for") || undefined,
          userAgent: request.headers.get("user-agent") || undefined,
        });

        let persistedCount = 0;
        try {
          persistedCount = await persistTelemetryEvents(result.ingestId, result.events);
        } catch {
          persistedCount = 0;
        }

        return Response.json(
          { ...result, persistedCount },
          {
            status: result.criticalAlertCount > 0 ? 201 : 200,
            headers: CORS_HEADERS,
          }
        );
      },
    },
  },
});
