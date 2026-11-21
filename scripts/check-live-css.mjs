async function main() {
  const res = await fetch("https://www.dstrike.app/");
  const html = await res.text();
  console.log("HTML status:", res.status, "HTML length:", html.length);
  const linkMatches = html.match(/<link[^>]+>/g) || [];
  console.log("Links found:");
  for (const link of linkMatches) {
    if (link.includes("stylesheet") || link.includes(".css")) {
      console.log(" ", link);
      const m = link.match(/href="([^"]+)"/);
      if (m) {
        const href = m[1];
        const url = href.startsWith("http") ? href : "https://www.dstrike.app" + href;
        try {
          const cssRes = await fetch(url);
          console.log("   -> FETCH:", url, "STATUS:", cssRes.status, "BYTES:", (await cssRes.text()).length);
        } catch (e) {
          console.error("   -> ERROR fetching", url, e);
        }
      }
    }
  }
}
main();
