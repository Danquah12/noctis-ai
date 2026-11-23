import { createFileRoute } from "@tanstack/react-router";
import { handleCatalog260V2Request } from "@/lib/catalog260/api-handler.server";

export const Route = createFileRoute("/api/v2/catalog/$")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => handleCatalog260V2Request(request),
      GET: async ({ request }) => handleCatalog260V2Request(request),
      POST: async ({ request }) => handleCatalog260V2Request(request),
    },
  },
});
