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

        if (url.searchParams.get("stats") === "true") {
          return Response.json(getIngestStatistics(), { headers: CORS_HEADERS });
        }

        const limit = parseInt(url.searchParams.get("limit") || "20", 10);
        const stream = getRecentIngestedStream(isNaN(limit) ? 20 : limit);
        const stats = getIngestStatistics();

        return Response.json(
          {
            status: "active",
            gateway: "Noctis Universal Ingestion Streamer (Phase 3)",
            bufferCount: stream.length,
            statistics: stats,
            recentStream: stream,
          },
          { headers: CORS_HEADERS }
        );
      },

      POST: async ({ request }) => {
        const contentType = request.headers.get("content-type") || "";
        const url = new URL(request.url);
        const pluginHint = url.searchParams.get("plugin") || undefined;

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

        const result = ingestUniversalTelemetry(rawPayload, {
          pluginHint,
          sourceIp: request.headers.get("x-forwarded-for") || undefined,
          userAgent: request.headers.get("user-agent") || undefined,
        });

        return Response.json(result, {
          status: result.criticalAlertCount > 0 ? 201 : 200,
          headers: CORS_HEADERS,
        });
      },
    },
  },
});
