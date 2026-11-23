import { createFileRoute } from "@tanstack/react-router";
import { handleForgeV2Request } from "@/lib/forge/api-handler.server";

export const Route = createFileRoute("/api/v2/forge/$")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => handleForgeV2Request(request),
      GET: async ({ request }) => handleForgeV2Request(request),
      POST: async ({ request }) => handleForgeV2Request(request),
    },
  },
});
