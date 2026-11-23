import { createFileRoute } from "@tanstack/react-router";
import { handleNupsV2Request } from "@/lib/nups/api-handler.server";

export const Route = createFileRoute("/api/v2/nups/$")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => handleNupsV2Request(request),
      GET: async ({ request }) => handleNupsV2Request(request),
      POST: async ({ request }) => handleNupsV2Request(request),
    },
  },
});
