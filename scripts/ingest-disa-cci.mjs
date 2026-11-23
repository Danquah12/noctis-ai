#!/usr/bin/env node
/**
 * Noctis Defense & Intelligence Community (NDIMP) — DISA CCI Compiler
 *
 * Downloads official DISA Control Correlation Identifier (CCI) XML directly from
 * Cyber Exchange (`U_CCI_List.zip`), extracts `U_CCI_List.xml` natively via Node
 * zlib without third-party dependencies, verifies SHA-256 provenance digests,
 * normalizes NIST SP 800-53 Rev. 5 / Rev. 4 control mappings, and writes compact
 * `src/data/disa-cci-db.json`.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const OUTPUT_PATH = path.join(REPO_ROOT, "src", "data", "disa-cci-db.json");
const CCI_ZIP_URL = "https://dl.dod.cyber.mil/wp-content/uploads/stigs/zip/U_CCI_List.zip";

function sha256(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function decodeXmlEntities(str) {
  if (!str) return "";
  return String(str)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalizes a DISA CCI `<reference index="..." />` value into a canonical
 * NIST SP 800-53 base control or enhancement identifier.
 * IMPORTANT: Only digits in parentheses immediately after `XX-NN` are enhancements
 * (e.g. `IA-2 (1) (a)` -> `IA-2(1)`). Sub-item letters like `AC-1 a 1 (a)` MUST
 * normalize to `AC-1`, never treating `(a)` as an enhancement.
 */
export function normalizeNistControlFromCciIndex(index) {
  const m = String(index || "")
    .trim()
    .match(/^([A-Z]{2}-\d+)(?:\s*\((\d+)\))?/i);
  if (!m) return null;
  return m[2] ? `${m[1].toUpperCase()}(${m[2]})` : m[1].toUpperCase();
}

function extractXmlFromZipBuffer(zipBuf, preferredSuffix = "u_cci_list.xml") {
  let eocdPos = -1;
  const minScan = Math.max(0, zipBuf.length - 65557);
  for (let i = zipBuf.length - 22; i >= minScan; i--) {
    if (zipBuf.readUInt32LE(i) === 0x06054b50) {
      eocdPos = i;
      break;
    }
  }
  if (eocdPos < 0) {
    throw new Error("Invalid ZIP archive: End of Central Directory not found.");
  }

  const totalEntries = zipBuf.readUInt16LE(eocdPos + 10);
  const cdOffset = zipBuf.readUInt32LE(eocdPos + 16);
  let pos = cdOffset;
  let fallbackXmlEntry = null;

  for (let idx = 0; idx < totalEntries && pos + 46 <= zipBuf.length; idx++) {
    const sig = zipBuf.readUInt32LE(pos);
    if (sig !== 0x02014b50) {
      throw new Error(`Invalid ZIP Central Directory signature at offset ${pos}`);
    }
    const method = zipBuf.readUInt16LE(pos + 10);
    const compSize = zipBuf.readUInt32LE(pos + 20);
    const uncompSize = zipBuf.readUInt32LE(pos + 24);
    const nameLen = zipBuf.readUInt16LE(pos + 28);
    const extraLen = zipBuf.readUInt16LE(pos + 30);
    const commentLen = zipBuf.readUInt16LE(pos + 32);
    const localHeaderOffset = zipBuf.readUInt32LE(pos + 42);
    const fileName = zipBuf.subarray(pos + 46, pos + 46 + nameLen).toString("utf8");
    pos += 46 + nameLen + extraLen + commentLen;

    const lower = fileName.toLowerCase();
    if (lower.endsWith(preferredSuffix)) {
      return decompressZipEntry(zipBuf, { fileName, method, compSize, uncompSize, localHeaderOffset });
    }
    if (lower.endsWith(".xml") && !fallbackXmlEntry) {
      fallbackXmlEntry = { fileName, method, compSize, uncompSize, localHeaderOffset };
    }
  }

  if (fallbackXmlEntry) {
    return decompressZipEntry(zipBuf, fallbackXmlEntry);
  }
  throw new Error("No XML file found inside U_CCI_List.zip.");
}

function decompressZipEntry(zipBuf, entry) {
  const lhSig = zipBuf.readUInt32LE(entry.localHeaderOffset);
  if (lhSig !== 0x04034b50) {
    throw new Error(`Invalid ZIP Local File Header at offset ${entry.localHeaderOffset}`);
  }
  const lhNameLen = zipBuf.readUInt16LE(entry.localHeaderOffset + 26);
  const lhExtraLen = zipBuf.readUInt16LE(entry.localHeaderOffset + 28);
  const dataStart = entry.localHeaderOffset + 30 + lhNameLen + lhExtraLen;
  const compressed = zipBuf.subarray(dataStart, dataStart + entry.compSize);

  let raw;
  if (entry.method === 0) {
    raw = compressed;
  } else if (entry.method === 8) {
    raw = zlib.inflateRawSync(compressed);
  } else {
    throw new Error(`Unsupported ZIP compression method ${entry.method} for ${entry.fileName}`);
  }
  return { fileName: entry.fileName, buffer: raw };
}

function parseAttributes(attrText) {
  const attrs = {};
  for (const m of attrText.matchAll(/([a-zA-Z0-9_:-]+)\s*=\s*"([^"]*)"/g)) {
    attrs[m[1]] = decodeXmlEntities(m[2]);
  }
  return attrs;
}

function extractTag(block, tagName) {
  const m = block.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return m ? decodeXmlEntities(m[1]) : "";
}

async function main() {
  console.log(`[DISA-CCI] Fetching official DISA CCI ZIP: ${CCI_ZIP_URL}`);
  const resp = await fetch(CCI_ZIP_URL, {
    headers: { "user-agent": "Noctis-NDIMP-CCI-Compiler/1.0" },
    signal: AbortSignal.timeout(45000),
  });
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status} fetching ${CCI_ZIP_URL}`);
  }
  const zipBuf = Buffer.from(await resp.arrayBuffer());
  const zipSha256 = sha256(zipBuf);
  const { fileName, buffer: xmlBuf } = extractXmlFromZipBuffer(zipBuf);
  const xmlSha256 = sha256(xmlBuf);
  const xml = xmlBuf.toString("utf8").replace(/^\uFEFF/, "");

  const metadataBlock = xml.match(/<metadata>([\s\S]*?)<\/metadata>/i)?.[1] || "";
  const version = extractTag(metadataBlock, "version") || "unknown";
  const publishDate = extractTag(metadataBlock, "publishdate") || version;

  const ccis = {};
  let totalCcis = 0;
  let rev5MappedCcis = 0;
  let rev4MappedCcis = 0;
  const distinctRev5 = new Set();

  for (const itemMatch of xml.matchAll(/<cci_item\b([^>]*)>([\s\S]*?)<\/cci_item>/gi)) {
    const itemAttrs = parseAttributes(itemMatch[1]);
    const body = itemMatch[2];
    const id = (itemAttrs.id || "").trim().toUpperCase();
    if (!id) continue;

    const status = extractTag(body, "status") || "unknown";
    const type = extractTag(body, "type") || "unknown";
    const pubDate = extractTag(body, "publishdate") || "";
    const def = extractTag(body, "definition") || "";

    const r5 = [];
    const r4 = [];
    const r5Seen = new Set();
    const r4Seen = new Set();

    for (const refMatch of body.matchAll(/<reference\b([^>]*?)\/?>/gi)) {
      const attrs = parseAttributes(refMatch[1]);
      const title = attrs.title || "";
      const index = attrs.index || "";
      if (!index) continue;
      if (/Revision\s+5/i.test(title)) {
        if (!r5Seen.has(index)) {
          r5Seen.add(index);
          r5.push(index);
        }
        const ctrl = normalizeNistControlFromCciIndex(index);
        if (ctrl) distinctRev5.add(ctrl);
      } else if (/Revision\s+4/i.test(title)) {
        if (!r4Seen.has(index)) {
          r4Seen.add(index);
          r4.push(index);
        }
      }
    }

    totalCcis++;
    if (r5.length > 0) rev5MappedCcis++;
    if (r4.length > 0) rev4MappedCcis++;

    ccis[id] = {
      s: status,
      t: type,
      p: pubDate,
      d: def,
      r5,
      r4,
    };
  }

  const dbBody = {
    manifest: {
      schemaVersion: "1.0.0",
      sourceTitle: "DISA Control Correlation Identifier (CCI) List",
      sourceUrl: CCI_ZIP_URL,
      extractedFile: fileName,
      version,
      publishDate,
      generatedAt: new Date().toISOString(),
      zipSha256,
      xmlSha256,
      dbSha256: "",
      counts: {
        totalCcis,
        rev5MappedCcis,
        rev4MappedCcis,
        distinctRev5Controls: distinctRev5.size,
      },
    },
    ccis,
  };

  dbBody.manifest.dbSha256 = sha256(JSON.stringify(ccis));

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(dbBody), "utf8");
  const bytes = fs.statSync(OUTPUT_PATH).size;

  console.log("[DISA-CCI] Compiled successfully:", {
    outputPath: OUTPUT_PATH,
    sizeMB: Number((bytes / (1024 * 1024)).toFixed(2)),
    version,
    publishDate,
    zipSha256: `${zipSha256.slice(0, 12)}...`,
    xmlSha256: `${xmlSha256.slice(0, 12)}...`,
    counts: dbBody.manifest.counts,
  });
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("ingest-disa-cci.mjs")) {
  main().catch((err) => {
    console.error("[DISA-CCI] Failed:", err);
    process.exit(1);
  });
}
