import { createFileRoute } from "@tanstack/react-router";

const CORS_HEADERS = {
  "cache-control": "no-store",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "Content-Type, Authorization, X-Noctis-Key",
};

export const Route = createFileRoute("/api/noctis/benchmark")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),

      GET: async ({ request }) => {
        const url = new URL(request.url);
        const suite = url.searchParams.get("suite") || undefined;
        const { runSovereignBenchmarkSuite, SOVEREIGN_16_BENCHMARK_CASES } = await import(
          "@/lib/noctis-sovereign-benchmark"
        );

        if (url.searchParams.get("cases") === "list") {
          return Response.json(
            {
              totalCases: SOVEREIGN_16_BENCHMARK_CASES.length,
              cases: SOVEREIGN_16_BENCHMARK_CASES.map((c) => ({
                testId: c.testId,
                suiteId: c.suiteId,
                name: c.name,
                sqdecPillar: c.sqdecPillar,
                category: c.category,
              })),
            },
            { headers: CORS_HEADERS }
          );
        }

        const benchmarkResult = runSovereignBenchmarkSuite(suite);

        return Response.json(benchmarkResult, {
          status: benchmarkResult.certificationStatus === "CERTIFIED_SOVEREIGN" ? 200 : 206,
          headers: CORS_HEADERS,
        });
      },
    },
  },
});
