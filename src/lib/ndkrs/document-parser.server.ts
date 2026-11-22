/**
 * NDKRS Server-Side Multi-Format Document Extractor
 *
 * Extracts clean UTF-8 text from `.md`, `.txt`, `.json`, `.csv`, `.html`, `.xml`,
 * `.docx` (ZIP + `node:zlib` inflateRaw), and `.pdf` (`/FlateDecode` zlib text streams + fallback)
 * without browser/Vite `?url` worker dependencies.
 */

import { inflateRawSync, inflateSync } from "node:zlib";

function decodePdfStringLiteral(body: string): string {
  const bytes: number[] = [];
  for (let i = 0; i < body.length; i += 1) {
    if (body[i] !== "\\") {
      bytes.push(body.charCodeAt(i) & 255);
      continue;
    }
    const next = body[(i += 1)];
    if (!next) break;
    if (next === "n") bytes.push(10);
    else if (next === "r") bytes.push(13);
    else if (next === "t") bytes.push(9);
    else if (next === "b") bytes.push(8);
    else if (next === "f") bytes.push(12);
    else if (next === "(" || next === ")" || next === "\\") bytes.push(next.charCodeAt(0));
    else if (next >= "0" && next <= "7") {
      let oct = next;
      for (let k = 0; k < 2 && body[i + 1] >= "0" && body[i + 1] <= "7"; k += 1) {
        oct += body[(i += 1)];
      }
      bytes.push(Number.parseInt(oct, 8));
    } else {
      bytes.push(next.charCodeAt(0));
    }
  }
  return Buffer.from(bytes).toString("latin1");
}

function pullPdfTextOperators(streamText: string): string {
  const parts: string[] = [];
  const re = /\(((?:\\[0-7]{1,3}|\\.|[^\\)])*)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(streamText)) && parts.length < 8000) {
    const cleaned = decodePdfStringLiteral(m[1] || "").replace(/\s+/g, " ").trim();
    if (/[A-Za-z0-9]/.test(cleaned)) parts.push(cleaned);
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function extractPdfBytes(bytes: Uint8Array): string {
  const buf = Buffer.from(bytes);
  const raw = buf.toString("latin1");
  const parts: string[] = [];
  const streamRegex = /\/FlateDecode\b[\s\S]{0,400}?stream\r?\n/g;
  let match: RegExpExecArray | null;
  while ((match = streamRegex.exec(raw)) && parts.length < 120) {
    const start = match.index + match[0].length;
    const end = raw.indexOf("endstream", start);
    if (end < 0) break;
    let slice = buf.subarray(start, end);
    if (slice.at(-1) === 0x0a) slice = slice.subarray(0, -1);
    if (slice.at(-1) === 0x0d) slice = slice.subarray(0, -1);
    try {
      const opened = inflateSync(slice).toString("latin1");
      if (/Tj|TJ|'|"/.test(opened)) {
        const pulled = pullPdfTextOperators(opened);
        if (pulled) parts.push(pulled);
      }
    } catch {
      // Skip compressed non-text binary objects cleanly
    }
  }
  if (parts.length > 0) {
    return parts.join("\n\n").slice(0, 100_000);
  }
  return pullPdfTextOperators(raw).slice(0, 100_000);
}

function extractDocxBytes(bytes: Uint8Array): string {
  const buf = Buffer.from(bytes);
  let offset = 0;
  let xml = "";
  while (offset + 30 < buf.length && buf.readUInt32LE(offset) === 0x04034b50) {
    const method = buf.readUInt16LE(offset + 8);
    const compressedSize = buf.readUInt32LE(offset + 18);
    const nameLen = buf.readUInt16LE(offset + 26);
    const extraLen = buf.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const name = buf.subarray(nameStart, nameStart + nameLen).toString("utf8");
    const dataStart = nameStart + nameLen + extraLen;
    const payload = buf.subarray(dataStart, dataStart + compressedSize);

    if (name === "word/document.xml") {
      xml =
        method === 0
          ? payload.toString("utf8")
          : method === 8
          ? inflateRawSync(payload).toString("utf8")
          : "";
      break;
    }
    offset = dataStart + Math.max(0, compressedSize);
  }

  if (!xml) return "";
  return xml
    .replace(/<w:tab\/>/g, " ")
    .replace(/<w:br\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 100_000);
}

export function extractDocumentText(input: {
  filename: string;
  mimeType?: string;
  bytes: Uint8Array;
}): { text: string; format: "pdf" | "docx" | "html" | "text"; byteSize: number } {
  const lower = (input.filename || "").toLowerCase();
  const mime = (input.mimeType || "").toLowerCase();
  const byteSize = input.bytes.byteLength;

  if (lower.endsWith(".pdf") || mime.includes("pdf")) {
    return { text: extractPdfBytes(input.bytes), format: "pdf", byteSize };
  }
  if (lower.endsWith(".docx") || mime.includes("wordprocessingml")) {
    return { text: extractDocxBytes(input.bytes), format: "docx", byteSize };
  }

  const utf8 = Buffer.from(input.bytes).toString("utf8");
  if (lower.endsWith(".html") || lower.endsWith(".htm") || mime.includes("html")) {
    const stripped = utf8
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 100_000);
    return { text: stripped, format: "html", byteSize };
  }

  return { text: utf8.trim().slice(0, 100_000), format: "text", byteSize };
}
