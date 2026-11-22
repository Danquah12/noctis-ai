import { createFileRoute } from "@tanstack/react-router";
import { handleRmfV2Request } from "@/lib/rmf-v2/api-handler.server";

export const Route = createFileRoute("/api/v2/rmf/$")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => handleRmfV2Request(request),
      GET: async ({ request }) => handleRmfV2Request(request),
      POST: async ({ request }) => handleRmfV2Request(request),
    },
  },
});
