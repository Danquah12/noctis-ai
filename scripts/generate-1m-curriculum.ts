/**
 * Streaming 1,000,000-Example Open Technical Curriculum Shard Generator
 *
 * Writes gzipped ChatML SFT shards + DPO shard + strictly disjoint held-out validation shard
 * with streaming backpressure (`drain`) and per-shard SHA-256 checksums into `data/shards/`.
 *
 * Usage:
 *   npm run generate:1m-curriculum
 *   node --experimental-strip-types scripts/generate-1m-curriculum.ts --count=1000000 --dpo=50000 --val=2500
 */
import { createHash } from "node:crypto";
import { once } from "node:events";
import { createWriteStream, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createGzip } from "node:zlib";
import {
  generateCurriculumDpoRecord,
  generateCurriculumSftRecord,
  getOpenCurriculumStats,
} from "../src/lib/noctis-open-curriculum-1m.ts";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");

interface ShardInfo {
  file: string;
  split: "sft" | "dpo" | "validation";
  rows: number;
  bytes: number;
  sha256: string;
}

function parseIntArg(name: string, fallback: number): number {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  if (!hit) return fallback;
  const parsed = Number.parseInt(hit.slice(prefix.length), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function parseStrArg(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

async function openGzipShardWriter(filePath: string) {
  const hash = createHash("sha256");
  let compressedBytes = 0;
  const fileStream = createWriteStream(filePath);
  const gzip = createGzip({ level: 1 });

  gzip.on("data", (chunk: Buffer) => {
    compressedBytes += chunk.length;
    hash.update(chunk);
  });

  gzip.pipe(fileStream);

  async function writeLine(line: string) {
    if (!gzip.write(line)) {
      await once(gzip, "drain");
    }
  }

  async function close(): Promise<{ bytes: number; sha256: string }> {
    const done = once(fileStream, "finish");
    gzip.end();
    await done;
    return {
      bytes: compressedBytes,
      sha256: hash.digest("hex"),
    };
  }

  return { writeLine, close };
}

async function main() {
  const stats = getOpenCurriculumStats();
  const sftTarget = parseIntArg("count", stats.defaultTargetSftRows);
  const dpoTarget = parseIntArg("dpo", stats.defaultTargetDpoRows);
  const valTarget = parseIntArg("val", stats.defaultHeldOutValRows);
  const shardSize = Math.max(1000, parseIntArg("shard-size", 50_000));
  const outDirRel = parseStrArg("out-dir", "data/shards");
  const outDir = path.isAbsolute(outDirRel) ? outDirRel : path.join(ROOT, outDirRel);

  mkdirSync(outDir, { recursive: true });
  const t0 = performance.now();
  const shards: ShardInfo[] = [];
  const trackDistribution: Record<string, number> = {};

  // 1. Stream SFT ChatML Shards (indices [0 .. sftTarget - 1])
  let sftWritten = 0;
  let shardIdx = 1;
  while (sftWritten < sftTarget) {
    const fileName = `noctis-1m-sft-shard-${String(shardIdx).padStart(3, "0")}.jsonl.gz`;
    const filePath = path.join(outDir, fileName);
    const writer = await openGzipShardWriter(filePath);
    const end = Math.min(sftTarget, sftWritten + shardSize);
    let rowsInShard = 0;

    for (let i = sftWritten; i < end; i++) {
      const rec = generateCurriculumSftRecord(i);
      trackDistribution[rec.trackId] = (trackDistribution[rec.trackId] ?? 0) + 1;
      await writer.writeLine(`${JSON.stringify(rec)}\n`);
      rowsInShard++;
    }

    const { bytes, sha256 } = await writer.close();
    shards.push({ file: fileName, split: "sft", rows: rowsInShard, bytes, sha256 });
    sftWritten = end;
    shardIdx++;
  }

  // 2. Stream DPO Preference Shards (indices [0 .. dpoTarget - 1])
  let dpoWritten = 0;
  let dpoShardIdx = 1;
  while (dpoWritten < dpoTarget) {
    const fileName = `noctis-1m-dpo-shard-${String(dpoShardIdx).padStart(3, "0")}.jsonl.gz`;
    const filePath = path.join(outDir, fileName);
    const writer = await openGzipShardWriter(filePath);
    const end = Math.min(dpoTarget, dpoWritten + shardSize);
    let rowsInShard = 0;

    for (let i = dpoWritten; i < end; i++) {
      const rec = generateCurriculumDpoRecord(i);
      await writer.writeLine(`${JSON.stringify(rec)}\n`);
      rowsInShard++;
    }

    const { bytes, sha256 } = await writer.close();
    shards.push({ file: fileName, split: "dpo", rows: rowsInShard, bytes, sha256 });
    dpoWritten = end;
    dpoShardIdx++;
  }

  // 3. Stream Strictly Disjoint Held-Out Validation Shard (indices [2_000_000 .. 2_000_000 + valTarget - 1])
  if (valTarget > 0) {
    const valFileName = "noctis-1m-val-heldout.jsonl.gz";
    const writer = await openGzipShardWriter(path.join(outDir, valFileName));
    const VAL_OFFSET = 2_000_000;
    for (let i = 0; i < valTarget; i++) {
      const rec = generateCurriculumSftRecord(VAL_OFFSET + i);
      await writer.writeLine(`${JSON.stringify(rec)}\n`);
    }
    const { bytes, sha256 } = await writer.close();
    shards.push({ file: valFileName, split: "validation", rows: valTarget, bytes, sha256 });
  }

  const totalCompressedBytes = shards.reduce((acc, s) => acc + s.bytes, 0);
  const durationSec = Math.round(((performance.now() - t0) / 1000) * 100) / 100;
  const manifest = {
    generatedAt: new Date().toISOString(),
    license: "CC0-1.0-Noctis-Open-Curriculum",
    durationSec,
    trackCount: stats.trackCount,
    combinatorialCapacity: stats.combinatorialCapacity,
    sftTotalRows: sftWritten,
    dpoTotalRows: dpoWritten,
    valTotalRows: valTarget,
    totalCompressedBytes,
    trackDistribution,
    shards,
  };

  writeFileSync(path.join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify({
      status: "ok",
      outDir: path.relative(ROOT, outDir),
      sftTotalRows: sftWritten,
      dpoTotalRows: dpoWritten,
      valTotalRows: valTarget,
      shardCount: shards.length,
      totalCompressedMb: Math.round((totalCompressedBytes / (1024 * 1024)) * 100) / 100,
      durationSec,
    }),
  );
}

main().catch((err) => {
  console.error("[generate-1m-curriculum] error:", err);
  process.exit(1);
});
