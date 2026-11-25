import { useEffect } from "react";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: ({ location }) => {
    throw redirect({
      to: "/noctis",
      search: location.search as Record<string, unknown>,
      replace: true,
    });
  },
  component: RedirectToNoctis,
});

function RedirectToNoctis() {
  const router = useRouter();
  useEffect(() => {
    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const join = params?.get("join") ?? undefined;
    const mode = params?.get("mode") ?? undefined;
    const register = params?.get("register") ?? undefined;
    const search: Record<string, string> = {};
    if (join) search.join = join;
    if (mode) search.mode = mode;
    if (register) search.register = register;
    void router.navigate({ to: "/noctis", search, replace: true });
  }, [router]);
  return (
    <main className="grid min-h-dvh place-items-center bg-[#0b1220] px-6 text-[#f6e7c8]">
      <p className="text-sm font-sans tracking-wide">Opening Noctis Clinic…</p>
    </main>
  );
}
