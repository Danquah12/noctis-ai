import { createFileRoute } from "@tanstack/react-router";
import { handleNdkrsV2Request } from "@/lib/ndkrs/api-handler.server";

export const Route = createFileRoute("/api/v2/ndkrs/$")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => handleNdkrsV2Request(request),
      GET: async ({ request }) => handleNdkrsV2Request(request),
      POST: async ({ request }) => handleNdkrsV2Request(request),
    },
  },
});
