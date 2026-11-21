const res = await fetch("https://www.dstrike.app/");
console.log("Root / status:", res.status);
console.log("Root / url:", res.url);
const html = await res.text();
const cssMatches = [...html.matchAll(/href="([^"]+\.css[^"]*)"/g)];
console.log("Root CSS links:", cssMatches.map(m => m[1]));
for (const href of cssMatches.map(m => m[1])) {
  const url = href.startsWith("http") ? href : new URL(href, "https://www.dstrike.app").href;
  const cssRes = await fetch(url);
  console.log(`Root CSS ${url} -> status ${cssRes.status}`);
}
