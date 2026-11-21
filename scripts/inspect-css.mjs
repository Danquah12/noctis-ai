const res = await fetch("https://www.dstrike.app/assets/styles-CffTlOh3.css");
const css = await res.text();
console.log("CSS total size:", css.length);
console.log("Has .flex:", css.includes(".flex{"));
console.log("Has .hidden:", css.includes(".hidden{"));
console.log("Has .rounded:", css.includes(".rounded"));
console.log("Has .bg-zinc:", css.includes("bg-zinc"));
console.log("First 500 chars of CSS:\n", css.slice(0, 500));
console.log("Button styles in CSS:\n", css.match(/button[^{]*\{[^}]*\}/g)?.slice(0, 5));
