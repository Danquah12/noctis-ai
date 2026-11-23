import { createFileRoute } from "@tanstack/react-router";
import { handleAssistantV2Request } from "@/lib/assistant/api-handler.server";

export const Route = createFileRoute("/api/v2/assistant/$")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => handleAssistantV2Request(request),
      GET: async ({ request }) => handleAssistantV2Request(request),
      POST: async ({ request }) => handleAssistantV2Request(request),
      PATCH: async ({ request }) => handleAssistantV2Request(request),
      DELETE: async ({ request }) => handleAssistantV2Request(request),
    },
  },
});
