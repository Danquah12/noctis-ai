import { createFileRoute } from "@tanstack/react-router";
import { readShareLink, type ShareNote } from "@/lib/share-link";
import { extractDashboardPayload, PredictionDashboardWidget } from "@/components/noctis/NoctisDesk";

function cleanSharedNote(raw: string): string {
  return raw
    .replace(/```noctis-dashboard[\s\S]*?```/gi, "")
    .replace(/```noctis-dashboard\s*\{[\s\S]*$/gi, "")
    .replace(/```(?:json|html)[\s\S]*?```/gi, "")
    .replace(/```/g, "")
    .replace(/#{1,6}\s*/g, "")
    .replace(/\*\*/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

export const Route = createFileRoute("/s")({
  validateSearch: (search: Record<string, unknown>) => {
    const out: { t?: string; n?: string; a?: string; v?: string; c?: string } = {};
    if (typeof search.t === "string" && search.t.trim()) out.t = cleanSharedNote(search.t).replace(/\s+/g, " ").trim().slice(0, 1800);
    if (typeof search.n === "string" && search.n.trim()) out.n = search.n.replace(/\s+/g, " ").trim().slice(0, 80);
    if (typeof search.a === "string" && search.a.startsWith("https://")) out.a = search.a.slice(0, 800);
    if (typeof search.v === "string" && search.v.trim()) out.v = search.v.replace(/[^\w.-]/g, "").slice(0, 12);
    if (typeof search.c === "string" && search.c.trim()) out.c = search.c.replace(/[^a-z0-9]/gi, "").slice(0, 12).toLowerCase();
    return out;
  },
  loaderDeps: ({ search }) => ({ c: search.c ?? "" }),
  loader: ({ deps }) => (deps.c ? readShareLink({ data: { code: deps.c } }) : Promise.resolve(null)),
  head: ({ match, loaderData }) => {
    const saved = loaderData as ShareNote | null;
    const who = saved?.name || match.search.n || "Asiedudanquah @ Noctis";
    const note = cleanSharedNote(saved?.body || match.search.t || who).replace(/\s+/g, " ").slice(0, 260);
    const dash = extractDashboardPayload(saved?.body || "");
    const origin =
      typeof match.context.origin === "string" && match.context.origin.startsWith("http")
        ? match.context.origin
        : "https://dstrike.app";
    const avatar = saved?.avatar || match.search.a || `${origin}/media/avatars/kwesi.jpg`;
    const query = new URLSearchParams();
    if (who) query.set("n", who);
    if (avatar.startsWith("https://")) query.set("a", avatar);
    if (dash?.trend?.points?.length) {
      query.set("tr", dash.trend.points.slice(0, 7).map((p) => Math.round(p.value)).join(","));
    }
    if (dash?.bars?.items?.length) {
      query.set(
        "br",
        dash.bars.items
          .slice(0, 5)
          .map((b) => Math.round((b.value / Math.max(b.max ?? 100, 1)) * 100))
          .join(","),
      );
    }
    query.set("v", match.search.v || "19");
    const tail = query.toString();
    const page = match.search.c
      ? `${origin}/s?c=${match.search.c}`
      : `${origin}/s${tail ? `?${tail}` : ""}`;
    const image = `${origin}/api/share-card${tail ? `?${tail}` : ""}`;
    return {
      meta: [
        { title: dash?.title ? `${dash.title} · ${who}` : who },
        { name: "description", content: note },
        { property: "og:site_name", content: "DSTRIKE · Noctis" },
        { property: "og:title", content: dash?.title ? `${dash.title} · ${who}` : who },
        { property: "og:description", content: note },
        { property: "og:url", content: page },
        { property: "og:image", content: image },
        { property: "og:image:secure_url", content: image },
        { property: "og:image:type", content: "image/jpeg" },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:image:alt", content: who },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: dash?.title ? `${dash.title} · ${who}` : who },
        { name: "twitter:description", content: note },
        { name: "twitter:image", content: image },
      ],
    };
  },
  component: ShareCard,
});

function ShareCard() {
  const { t, n, a } = Route.useSearch();
  const saved = Route.useLoaderData() as ShareNote | null;
  const who = saved?.name || n || "Asiedudanquah @ Noctis";
  const face = saved?.avatar || a || "/media/avatars/kwesi.jpg";
  const rawBody = saved?.body || t || who;
  const dash = extractDashboardPayload(rawBody);
  const words = cleanSharedNote(rawBody);
  const trParam = dash?.trend?.points?.length
    ? `&tr=${encodeURIComponent(dash.trend.points.slice(0, 7).map((p) => Math.round(p.value)).join(","))}`
    : "";
  const brParam = dash?.bars?.items?.length
    ? `&br=${encodeURIComponent(dash.bars.items.slice(0, 5).map((b) => Math.round((b.value / Math.max(b.max ?? 100, 1)) * 100)).join(","))}`
    : "";
  return (
    <main className="min-h-dvh bg-[#0b1220] text-[#f6f1e6]" data-card="photo">
      <img
        src={`/api/share-card?n=${encodeURIComponent(who)}&a=${encodeURIComponent(face)}${trParam}${brParam}&v=19`}
        alt="DSTRIKE · Noctis"
        className="mx-auto w-full max-w-3xl object-contain"
      />
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            {face ? <img src={face} alt="" className="size-12 shrink-0 rounded-full object-cover ring-2 ring-[#0066ff] sm:size-16" /> : null}
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-semibold text-[#e4b86a] sm:text-3xl">{who}</h1>
            </div>
          </div>
          <img src="/brand/dstrike-logo.png" alt="DSTRIKE" className="h-7 w-auto max-w-[96px] shrink-0 rounded-md bg-white p-0.5 object-contain shadow-sm sm:h-9 sm:max-w-[128px]" />
        </div>
        {dash ? (
          <div className="mt-6">
            <PredictionDashboardWidget data={dash} />
          </div>
        ) : null}
        <p className="mt-6 whitespace-pre-line font-mono text-sm leading-relaxed text-zinc-100 sm:text-base">{words}</p>
      </div>
    </main>
  );
}
