import { createFileRoute } from "@tanstack/react-router";
import { handleDodIcV2Request } from "@/lib/dod-ic/api-handler.server";

export const Route = createFileRoute("/api/v2/dod-ic/$")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => handleDodIcV2Request(request),
      GET: async ({ request }) => handleDodIcV2Request(request),
      POST: async ({ request }) => handleDodIcV2Request(request),
    },
  },
});
