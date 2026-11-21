const res = await fetch("https://www.dstrike.app/noctis", {
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  }
});
console.log("HTML response status:", res.status);
console.log("Headers:", Object.fromEntries(res.headers.entries()));
const html = await res.text();
console.log("HTML length:", html.length);
console.log("First 1000 chars:\n", html.slice(0, 1000));
console.log("Head content:\n", html.slice(0, html.indexOf("</head>") + 7));
