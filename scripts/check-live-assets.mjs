const res = await fetch("https://www.dstrike.app/noctis");
const html = await res.text();
console.log("Status:", res.status);
const cssMatches = [...html.matchAll(/href="([^"]+\.css[^"]*)"/g)];
console.log("CSS links:", cssMatches.map(m => m[1]));
for (const href of cssMatches.map(m => m[1])) {
  const url = href.startsWith("http") ? href : new URL(href, "https://www.dstrike.app").href;
  const cssRes = await fetch(url);
  console.log(`CSS ${url} -> status ${cssRes.status}, content-type: ${cssRes.headers.get("content-type")}, size: ${(await cssRes.text()).length}`);
}
const jsMatches = [...html.matchAll(/src="([^"]+\.js[^"]*)"/g)];
console.log("JS scripts:", jsMatches.map(m => m[1]));
for (const src of jsMatches.map(m => m[1]).slice(0, 3)) {
  const url = src.startsWith("http") ? src : new URL(src, "https://www.dstrike.app").href;
  const jsRes = await fetch(url);
  console.log(`JS ${url} -> status ${jsRes.status}, content-type: ${jsRes.headers.get("content-type")}`);
}
