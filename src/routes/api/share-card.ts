import { createFileRoute } from "@tanstack/react-router";
import jpeg from "jpeg-js";
import { KWESI_AVATAR, OG_LOGO } from "@/lib/og-logo";

function safePhoto(raw: string) {
  try {
    const url = new URL(raw);
    const host = url.hostname;
    const blocked = url.protocol !== "https:" || host === "localhost" || host.endsWith(".local") || /^(10\.|127\.|192\.168\.|169\.254\.|0\.0\.0\.0)/.test(host);
    return blocked ? "" : url.toString().slice(0, 800);
  } catch {
    return "";
  }
}

function isJpeg(bytes: Uint8Array) {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8;
}

function setPx(base: Uint8Array, width: number, height: number, x: number, y: number, r: number, g: number, b: number, a = 1) {
  const ix = Math.round(x);
  const iy = Math.round(y);
  if (ix < 0 || iy < 0 || ix >= width || iy >= height) return;
  const di = (iy * width + ix) * 4;
  if (a >= 1) {
    base[di] = r;
    base[di + 1] = g;
    base[di + 2] = b;
    base[di + 3] = 255;
  } else {
    base[di] = Math.round(base[di]! * (1 - a) + r * a);
    base[di + 1] = Math.round(base[di + 1]! * (1 - a) + g * a);
    base[di + 2] = Math.round(base[di + 2]! * (1 - a) + b * a);
    base[di + 3] = 255;
  }
}

function fillRect(base: Uint8Array, width: number, height: number, x0: number, y0: number, w: number, h: number, r: number, g: number, b: number, a = 1) {
  const xStart = Math.max(0, Math.round(x0));
  const yStart = Math.max(0, Math.round(y0));
  const xEnd = Math.min(width, Math.round(x0 + w));
  const yEnd = Math.min(height, Math.round(y0 + h));
  for (let y = yStart; y < yEnd; y++) {
    for (let x = xStart; x < xEnd; x++) {
      setPx(base, width, height, x, y, r, g, b, a);
    }
  }
}

function fillCircle(base: Uint8Array, width: number, height: number, cx: number, cy: number, rad: number, r: number, g: number, b: number) {
  const r2 = rad * rad;
  for (let dy = -rad; dy <= rad; dy++) {
    for (let dx = -rad; dx <= rad; dx++) {
      if (dx * dx + dy * dy <= r2) {
        setPx(base, width, height, cx + dx, cy + dy, r, g, b, 1);
      }
    }
  }
}

function drawThickLine(base: Uint8Array, width: number, height: number, x1: number, y1: number, x2: number, y2: number, thickness: number, r: number, g: number, b: number) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1) * 2;
  const rad = Math.max(1, Math.round(thickness / 2));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    fillCircle(base, width, height, x, y, rad, r, g, b);
  }
}

function paintCharts(base: Uint8Array, width: number, height: number, trendVals: number[], barVals: number[]) {
  // Left Panel: Trend Line Graph (X=380..745, Y=330..580)
  const lx = 380;
  const ly = 330;
  const lw = 365;
  const lh = 250;
  fillRect(base, width, height, lx, ly, lw, lh, 12, 19, 31, 1);
  // Top accent bar on left panel
  fillRect(base, width, height, lx, ly, lw, 5, 0, 102, 255, 1);
  // Subtle horizontal grid lines
  for (let g = 1; g <= 3; g++) {
    const gy = ly + 45 + g * 48;
    fillRect(base, width, height, lx + 24, gy, lw - 48, 1, 255, 255, 255, 0.12);
  }

  const pts = trendVals.length >= 2 ? trendVals.slice(0, 8) : [58, 62, 60, 66, 70, 68, 72];
  const minV = Math.min(...pts);
  const maxV = Math.max(...pts);
  const span = Math.max(maxV - minV, 1);
  const plotX = lx + 30;
  const plotY = ly + 48;
  const plotW = lw - 60;
  const plotH = lh - 82;

  const coords = pts.map((v, i) => ({
    x: plotX + (i / (pts.length - 1)) * plotW,
    y: plotY + plotH - ((v - minV) / span) * plotH,
  }));

  // Shaded area under trend line
  for (let i = 0; i < coords.length - 1; i++) {
    const c1 = coords[i]!;
    const c2 = coords[i + 1]!;
    const xStart = Math.round(c1.x);
    const xEnd = Math.round(c2.x);
    for (let x = xStart; x <= xEnd; x++) {
      const t = xEnd === xStart ? 0 : (x - xStart) / (xEnd - xStart);
      const yTop = Math.round(c1.y + (c2.y - c1.y) * t);
      const yBot = plotY + plotH;
      for (let y = yTop; y <= yBot; y++) {
        const alpha = 0.32 * (1 - (y - yTop) / Math.max(yBot - yTop, 1));
        setPx(base, width, height, x, y, 0, 118, 255, alpha);
      }
    }
  }

  // Connect trend line
  for (let i = 0; i < coords.length - 1; i++) {
    drawThickLine(base, width, height, coords[i]!.x, coords[i]!.y, coords[i + 1]!.x, coords[i + 1]!.y, 5, 0, 140, 255);
  }
  // Draw nodes
  for (const c of coords) {
    fillCircle(base, width, height, c.x, c.y, 7, 255, 255, 255);
    fillCircle(base, width, height, c.x, c.y, 4, 0, 102, 255);
  }

  // Right Panel: Comparative Bar Chart (X=765..1140, Y=330..580)
  const rx = 765;
  const ry = 330;
  const rw = 375;
  const rh = 250;
  fillRect(base, width, height, rx, ry, rw, rh, 12, 19, 31, 1);
  fillRect(base, width, height, rx, ry, rw, 5, 228, 184, 106, 1);

  const bars = barVals.length >= 1 ? barVals.slice(0, 5) : [78, 64, 86, 52, 91];
  const barTrackX = rx + 28;
  const barTrackW = rw - 56;
  bars.forEach((v, idx) => {
    const by = ry + 42 + idx * 40;
    // Track background
    fillRect(base, width, height, barTrackX, by, barTrackW, 18, 255, 255, 255, 0.12);
    // Filled bar
    const pct = Math.max(0.08, Math.min(1, v / 100));
    const fillW = Math.round(barTrackW * pct);
    if (idx % 2 === 0) {
      fillRect(base, width, height, barTrackX, by, fillW, 18, 0, 118, 255, 1);
    } else {
      fillRect(base, width, height, barTrackX, by, fillW, 18, 228, 184, 106, 1);
    }
  });
}

function paintFace(base: Uint8Array, width: number, height: number, face: Uint8Array, fw: number, fh: number) {
  const r = 150;
  const cx = 190;
  const cy = Math.round(height / 2);
  for (let y = -r - 6; y <= r + 6; y += 1) {
    for (let x = -r - 6; x <= r + 6; x += 1) {
      const dist = x * x + y * y;
      const dx = cx + x;
      const dy = cy + y;
      if (dx < 0 || dy < 0 || dx >= width || dy >= height) continue;
      const di = (dy * width + dx) * 4;
      if (dist > r * r) {
        if (dist <= (r + 6) * (r + 6)) {
          base[di] = 0;
          base[di + 1] = 102;
          base[di + 2] = 255;
          base[di + 3] = 255;
        }
        continue;
      }
      const sx = Math.min(fw - 1, Math.max(0, Math.floor(((x + r) / (r * 2)) * fw)));
      const sy = Math.min(fh - 1, Math.max(0, Math.floor(((y + r) / (r * 2)) * fh)));
      const si = (sy * fw + sx) * 4;
      base[di] = face[si];
      base[di + 1] = face[si + 1];
      base[di + 2] = face[si + 2];
      base[di + 3] = 255;
    }
  }
}

function parseNumList(raw: string | null): number[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n));
}

function jpegResponse(bytes: Uint8Array) {
  return new Response(new Uint8Array(bytes), {
    headers: { "content-type": "image/jpeg", "cache-control": "public, max-age=300" },
  });
}

export const Route = createFileRoute("/api/share-card")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const logoBytes = Buffer.from(OG_LOGO, "base64");
        try {
          const url = new URL(request.url);
          const logo = jpeg.decode(logoBytes, { useTArray: true, formatAsRGBA: true });
          const requestedPhoto = safePhoto(url.searchParams.get("a") || "");
          const trendVals = parseNumList(url.searchParams.get("tr"));
          const barVals = parseNumList(url.searchParams.get("br"));
          let painted = false;
          if (requestedPhoto && !requestedPhoto.endsWith("/media/avatars/kwesi.jpg")) {
            try {
              const res = await fetch(requestedPhoto, { signal: AbortSignal.timeout(8000) });
              const bytes = Buffer.from(await res.arrayBuffer());
              if (res.ok && isJpeg(bytes)) {
                const face = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true });
                paintFace(logo.data, logo.width, logo.height, face.data, face.width, face.height);
                painted = true;
              }
            } catch {
              /* fall back to built-in Kwesi avatar */
            }
          }
          if (!painted) {
            const kwesiBytes = Buffer.from(KWESI_AVATAR, "base64");
            const face = jpeg.decode(kwesiBytes, "base64" ? { useTArray: true, formatAsRGBA: true } : undefined);
            paintFace(logo.data, logo.width, logo.height, face.data, face.width, face.height);
          }
          paintCharts(logo.data, logo.width, logo.height, trendVals, barVals);
          const encoded = jpeg.encode({ data: logo.data, width: logo.width, height: logo.height }, 88);
          return jpegResponse(encoded.data);
        } catch {
          return jpegResponse(logoBytes);
        }
      },
    },
  },
});
