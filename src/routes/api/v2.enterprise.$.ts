import { createFileRoute } from "@tanstack/react-router";
import { handleEnterpriseV2Request } from "@/lib/enterprise/api-handler.server";

export const Route = createFileRoute("/api/v2/enterprise/$")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => handleEnterpriseV2Request(request),
      GET: async ({ request }) => handleEnterpriseV2Request(request),
      POST: async ({ request }) => handleEnterpriseV2Request(request),
    },
  },
});
