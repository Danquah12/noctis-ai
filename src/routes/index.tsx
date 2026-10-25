import { useEffect } from "react";
import { createFileRoute, redirect, useRouter, useRouterState } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { FeedPage } from "@/components/feed/FeedPage";

export const Route = createFileRoute("/")({
  beforeLoad: ({ location }) => {
    if (location.href.includes("?") || location.href.includes("#feed")) return;
    throw redirect({ to: "/start", replace: true });
  },
  component: AcademyPage,
});

function AcademyPage() {
  const router = useRouter();
  const href = useRouterState({ select: (s) => s.location.href });
  const stay = href.includes("?") || href.includes("#feed");
  useEffect(() => {
    if (stay) return;
    void router.navigate({ to: "/start", replace: true });
  }, [router, stay]);
  if (stay) {
    return (
      <AppShell>
        <FeedPage />
      </AppShell>
    );
  }
  return (
    <main className="grid min-h-dvh place-items-center bg-[#f6f3ec] px-6 text-[#12151c]">
      <p className="text-sm">Opening Noctis…</p>
    </main>
  );
}