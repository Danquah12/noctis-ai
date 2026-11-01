import { useEffect } from "react";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/noctis", replace: true });
  },
  component: RedirectToNoctis,
});

function RedirectToNoctis() {
  const router = useRouter();
  useEffect(() => {
    void router.navigate({ to: "/noctis", replace: true });
  }, [router]);
  return (
    <main className="grid min-h-dvh place-items-center bg-[#0b1220] px-6 text-[#f6e7c8]">
      <p className="text-sm font-sans tracking-wide">Opening Noctis Clinic…</p>
    </main>
  );
}
