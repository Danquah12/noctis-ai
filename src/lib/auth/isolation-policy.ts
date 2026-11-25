/**
 * Pure request-isolation predicate used by `isolation.server.ts`.
 *
 * Kept dependency-free so unit tests can import it directly under Node without
 * loading `@tanstack/react-start/server`.
 */
function matchesHost(urlStr: string, hostOnly: string): boolean {
  if (!hostOnly) return false;
  try {
    const u = new URL(urlStr);
    if (u.hostname.toLowerCase() !== hostOnly) return false;
    return (
      u.protocol === "https:" ||
      hostOnly === "localhost" ||
      hostOnly === "127.0.0.1" ||
      hostOnly === "[::1]"
    );
  } catch {
    return false;
  }
}

/**
 * Determine whether an incoming request passes Fetch-Metadata / origin checks.
 *
 * Allows direct/same-origin requests, top-level GET navigations, and
 * same-origin fetches/posts sent from inside an embedded cross-site iframe.
 */
export function isAllowedSameSiteRequest(request: Request): boolean {
  const h = request.headers;
  const site = h.get("sec-fetch-site");
  // Non-browser client (no header), the app's own origin, or a direct
  // (address-bar/bookmark) load are all fine.
  if (!site || site === "same-origin" || site === "none") return true;

  // A top-level GET navigation (e.g. the broker's OAuth callback redirect) is
  // fine even when it's cross-site; scripted requests never set navigate mode.
  const dest = h.get("sec-fetch-dest");
  const isTopLevelGet =
    h.get("sec-fetch-mode") === "navigate" &&
    request.method === "GET" &&
    dest !== "object" &&
    dest !== "embed";
  if (isTopLevelGet) return true;

  // Inside a cross-site iframe (e.g. ConnectLn 360 -> www.dstrike.app/noctis),
  // browsers send `Sec-Fetch-Site: cross-site` even on same-origin calls,
  // while sending `Origin` (on POST) or same-origin `Referer` (on GET/HEAD).
  const hostOnly =
    (h.get("x-forwarded-host") ?? h.get("host") ?? "")
      .split(",")[0]
      ?.trim()
      .toLowerCase()
      .replace(/:\d+$/, "") ?? "";
  if (!hostOnly) return false;

  const origin = h.get("origin");
  if (origin) {
    return matchesHost(origin, hostOnly);
  }

  const referer = h.get("referer");
  if ((request.method === "GET" || request.method === "HEAD") && referer) {
    return matchesHost(referer, hostOnly);
  }

  return false;
}
