import { createFileRoute } from "@tanstack/react-router";
import { executeV1HealthHttpRequest } from "@/lib/noctis-health-engine";

export const Route = createFileRoute("/api/v1/health")({
  server: {
    handlers: {
      GET: async ({ request }) => executeV1HealthHttpRequest(request),
      POST: async ({ request }) => executeV1HealthHttpRequest(request),
    },
  },
});
