import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { DoorBoard } from "@/components/layout/DoorBoard";
import { isDoorId, rememberDoor, type DoorId } from "@/lib/door-board";

export const Route = createFileRoute("/start")({
  validateSearch: (search: Record<string, unknown>): { door?: DoorId } => {
    return { door: isDoorId(search.door) ? search.door : undefined };
  },
  component: StartPage,
});

function StartPage() {
  const { door } = Route.useSearch();
  const navigate = Route.useNavigate();
  useEffect(() => {
    if (door) rememberDoor(door);
  }, [door]);
  return (
    <AppShell>
      <DoorBoard door={door} onDoor={(next) => void navigate({ search: { door: next }, replace: true })} />
    </AppShell>
  );
}