import { createFileRoute } from "@tanstack/react-router";

const CORS_HEADERS = {
  "cache-control": "no-store",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "Content-Type, Authorization, X-Noctis-Key",
};

export const Route = createFileRoute("/api/noctis/consensus")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),

      GET: async ({ request }) => {
        const url = new URL(request.url);
        const {
          PREDEFINED_CROSS_DOMAIN_SCENARIOS,
          simulateCrossDomainScenario,
        } = await import("@/lib/noctis-cross-domain-consensus");

        const scenarioKey = url.searchParams.get("scenario");
        if (scenarioKey) {
          if (!PREDEFINED_CROSS_DOMAIN_SCENARIOS[scenarioKey]) {
            return Response.json(
              {
                error: `Unknown scenario '${scenarioKey}'.`,
                availableScenarios: Object.keys(PREDEFINED_CROSS_DOMAIN_SCENARIOS),
              },
              { status: 404, headers: CORS_HEADERS }
            );
          }
          const result = simulateCrossDomainScenario(scenarioKey);
          return Response.json(result, { headers: CORS_HEADERS });
        }

        return Response.json(
          {
            status: "active",
            protocol: "Noctis Autonomous Cross-Domain Consensus Swarm (Phase 4)",
            governance: "SQDEC (Safety > Quality > Delivery > Economics > Control)",
            deliberationPhases: [
              "Round 1: Independent Domain Analysis & Risk Assessment",
              "Round 2: Cross-Domain Collision & Conflict Detection",
              "Round 3: SQDEC Governance Reconciliation & Cryptographic Attestation",
            ],
            availableScenarios: Object.keys(PREDEFINED_CROSS_DOMAIN_SCENARIOS).map((key) => ({
              key,
              title: PREDEFINED_CROSS_DOMAIN_SCENARIOS[key].title,
              severity: PREDEFINED_CROSS_DOMAIN_SCENARIOS[key].severity,
              domains: PREDEFINED_CROSS_DOMAIN_SCENARIOS[key].domainsInvolved,
            })),
          },
          { headers: CORS_HEADERS }
        );
      },

      POST: async ({ request }) => {
        let body: any = null;
        try {
          body = await request.json();
        } catch {
          return Response.json(
            { error: "Invalid JSON body. Provide incident details or scenario key." },
            { status: 400, headers: CORS_HEADERS }
          );
        }

        const {
          runCrossDomainConsensus,
          simulateCrossDomainScenario,
          PREDEFINED_CROSS_DOMAIN_SCENARIOS,
        } = await import("@/lib/noctis-cross-domain-consensus");

        if (body.scenario) {
          if (!PREDEFINED_CROSS_DOMAIN_SCENARIOS[body.scenario]) {
            return Response.json(
              {
                error: `Unknown scenario '${body.scenario}'.`,
                availableScenarios: Object.keys(PREDEFINED_CROSS_DOMAIN_SCENARIOS),
              },
              { status: 404, headers: CORS_HEADERS }
            );
          }
          const result = simulateCrossDomainScenario(body.scenario);
          return Response.json(result, { status: 200, headers: CORS_HEADERS });
        }

        if (!body.title || !body.description || !body.severity) {
          return Response.json(
            { error: "Missing required fields: 'title', 'description', and 'severity' are required." },
            { status: 400, headers: CORS_HEADERS }
          );
        }

        const result = runCrossDomainConsensus(body);
        return Response.json(result, { status: 200, headers: CORS_HEADERS });
      },
    },
  },
});
