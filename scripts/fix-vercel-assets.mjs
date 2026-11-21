import { readFileSync, writeFileSync, copyFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

// 1. Locate built stylesheet
const staticDir = ".vercel/output/static";
const staticAssetsDir = join(staticDir, "assets");
let latestCssFile = null;

if (existsSync(staticAssetsDir)) {
  const files = readdirSync(staticAssetsDir);
  for (const f of files) {
    if (f.startsWith("styles-") && f.endsWith(".css")) {
      latestCssFile = f;
      break;
    }
  }
}

if (latestCssFile) {
  const srcCss = join(staticAssetsDir, latestCssFile);
  // Copy to stable, un-hashed endpoints
  copyFileSync(srcCss, join(staticDir, "styles.css"));
  copyFileSync(srcCss, join(staticAssetsDir, "styles.css"));
  // Copy to recent known hashes for seamless rollout compatibility
  copyFileSync(srcCss, join(staticAssetsDir, "styles-CU7W2fa2.css"));
  copyFileSync(srcCss, join(staticAssetsDir, "styles-CffTlOh3.css"));
  console.log(`[vercel-assets] Copied ${latestCssFile} to /styles.css and legacy rollout aliases`);
}

// 2. Configure Vercel routes
const file = ".vercel/output/config.json";
if (existsSync(file)) {
  const config = JSON.parse(readFileSync(file, "utf8"));
  const routes = Array.isArray(config.routes) ? config.routes : [];

  const styleFallback = {
    src: "/assets/styles-.*\\.css",
    dest: "/styles.css",
    headers: {
      "content-type": "text/css; charset=utf-8",
      "cache-control": "public, max-age=3600"
    }
  };

  const miss = {
    src: "/assets/(.*)",
    status: 404,
    headers: { "cache-control": "no-store", "content-type": "text/plain; charset=utf-8" },
  };

  const next = [];
  let placed = false;
  for (const route of routes) {
    if (route?.src === "/assets/(.*)" && route?.status === 404) {
      continue; // replace existing 404 handler
    }
    if (route?.src === "/(.*)" && route?.dest === "/__server" && !placed) {
      next.push(styleFallback);
      next.push(miss);
      placed = true;
    }
    next.push(route);
  }
  if (!placed) {
    next.push(styleFallback);
    next.push(miss);
  }
  config.routes = next;
  writeFileSync(file, JSON.stringify(config, null, 2) + "\n");
  console.log("[vercel-assets] Added resilient CSS fallback and missing assets 404 rules");
}
