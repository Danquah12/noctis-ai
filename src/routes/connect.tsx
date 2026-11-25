import { createFileRoute } from "@tanstack/react-router";
import { VibeConnectWorkspace } from "@/components/connect/VibeConnectWorkspace";

export const Route = createFileRoute("/connect")({
  validateSearch: (search: Record<string, unknown>): { invite?: string } => ({
    invite: typeof search.invite === "string" ? search.invite : undefined,
  }),
  component: ConnectPage,
});

function ConnectPage() {
  const { invite } = Route.useSearch();
  return <VibeConnectWorkspace initialInviteCode={invite ?? ""} />;
}
