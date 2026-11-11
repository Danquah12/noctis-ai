import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { ClientChrome } from "@/components/ui/client-chrome";
import appCss from "../styles.css?url";

const APP_NAME = "Noctis Clinic";
const APP_BLURB = "Watch a Spark. Pass a drill. Take the stamp.";

const fetchSessionUser = createServerFn({ method: "GET" }).handler(async () => {
  const { getSessionUser } = await import("@/lib/auth/verify.server");
  const u = await getSessionUser();
  if (!u) return null;
  const { ensurePerson } = await import("@/lib/people.server");
  await ensurePerson(u);
  return { id: u.id, email: u.email, name: u.name };
});

const publicOrigin = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { getRequest } = await import("@tanstack/react-start/server");
    const req = getRequest();
    const forwarded = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || "";
    const proto = (req.headers.get("x-forwarded-proto") || "https").split(",")[0]?.trim() || "https";
    if (forwarded && !/vercel\.app$/i.test(forwarded) && !/localhost|127\.0\.0\.1/.test(forwarded)) {
      return `${proto}://${forwarded}`;
    }
    return new URL(req.url).origin;
  } catch {
    return "";
  }
});

export const Route = createRootRoute({
  beforeLoad: async () => ({ sessionUser: await fetchSessionUser(), origin: await publicOrigin() }),
  head: ({ match, matches }) => {
    const origin = typeof match.context.origin === "string" ? match.context.origin : "";
    const image = origin ? `${origin}/og.jpg` : "/og.jpg";
    const blurb = APP_BLURB;
    const sharing = matches.some((row) => row.pathname === "/s");
    const card = sharing
      ? []
      : [
          { name: "description", content: blurb },
          { property: "og:site_name", content: "Noctis" },
          { property: "og:title", content: APP_NAME },
          { property: "og:description", content: blurb },
          { property: "og:image", content: image },
          { property: "og:image:alt", content: "Noctis Clinic" },
          { property: "og:type", content: "website" },
          { name: "twitter:card", content: "summary_large_image" },
          { name: "twitter:title", content: "Noctis Clinic" },
          { name: "twitter:description", content: blurb },
          { name: "twitter:image", content: image },
        ];
    return {
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content" },
      { title: APP_NAME },
      ...card,
      { name: "theme-color", content: "#0b1220" },
      { name: "color-scheme", content: "dark light" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-orientations", content: "portrait-landscape" },
      { name: "screen-orientation", content: "any" },
      { name: "x5-orientation", content: "auto" },
      { name: "format-detection", content: "telephone=no" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      { rel: "preconnect", href: "https://www.youtube-nocookie.com" },
      { rel: "preconnect", href: "https://i.ytimg.com" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Syne:wght@500;600;700;800&display=swap",
      },
    ],
    };
  },
  component: RootDocument,
});

function RootDocument() {
  return (
    <html lang="en" className="dark antialiased clinic-canvas" suppressHydrationWarning>
      <head>
        <HeadContent assetCrossOrigin={{ script: "anonymous" }} />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body {
                background-color: #0b1220;
                color: #f4f4f5;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                margin: 0;
                padding: 0;
                height: 100%;
                overflow: hidden;
              }
              img { max-width: 100%; height: auto; }
              button { font-family: inherit; }
              .hidden { display: none !important; }
              @media (min-width: 768px) {
                .md\\:flex { display: flex !important; }
                .md\\:hidden { display: none !important; }
              }
              @media (min-width: 640px) {
                .sm\\:inline { display: inline !important; }
                .sm\\:hidden { display: none !important; }
              }
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("vibetok-theme");if(t==="black"||t==="night"||t==="day")t="midnight";else if(t==="ink")t="nordic";else if(t==="paper")t="white";else if(t==="ember")t="sand";if(t!=="midnight"&&t!=="white"&&t!=="nordic"&&t!=="emerald"&&t!=="sand")t="midnight";var r=document.documentElement;r.dataset.theme=t;if(t==="white"||t==="sand")r.classList.remove("dark");else r.classList.add("dark");var c={midnight:"#0b1220",white:"#f7f8fa",nordic:"#071525",emerald:"#06140f",sand:"#e9dcc8"};var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",c[t]||c.midnight);var l=localStorage.getItem("vibetok-lang");if(l){r.lang=l==="zh"?"zh-Hans":l;r.dir=l==="ar"?"rtl":"ltr";}}catch(e){}})();(function(){try{if("serviceWorker" in navigator){navigator.serviceWorker.getRegistrations().then(function(regs){for(var r of regs)r.unregister();});}if("caches" in window){caches.keys().then(function(keys){for(var k of keys)caches.delete(k);});}}catch(e){}})();(function(){var k="vt-preload-15";function moduleFail(msg){return /dynamically imported module|module script failed|Importing a module script failed|error loading dynamically imported module/i.test(msg);}function again(){try{if(sessionStorage.getItem(k))return false;sessionStorage.setItem(k,"1");}catch(e){return false;}var u=new URL(location.href);u.searchParams.set("v",String(Date.now()));location.replace(u.toString());return true;}window.addEventListener("vite:preloadError",function(e){var msg=String((e.payload&&(e.payload.message||e.payload))||"");if(!moduleFail(msg)){e.preventDefault();return;}if(again())e.preventDefault();});window.addEventListener("unhandledrejection",function(e){var msg=String((e.reason&&(e.reason.message||e.reason))||"");if(!moduleFail(msg))return;if(again())e.preventDefault();});window.addEventListener("error",function(e){var el=e&&e.target;if(el&&el.tagName==="LINK"&&el.rel==="stylesheet"){try{if(!sessionStorage.getItem("noctis_css_heal")){sessionStorage.setItem("noctis_css_heal","1");location.reload();}}catch(err){location.reload();}}},true);})();`,
          }}
        />
      </head>
      <body className="bg-bg text-fg h-dvh w-screen overflow-hidden">
        <PreviewHostBridge />
        <AuthProvider>
          <ClientChrome>
            <Outlet />
          </ClientChrome>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
