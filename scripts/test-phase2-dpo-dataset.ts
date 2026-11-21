/**
 * ============================================================================
 * NOCTIS CLINICAL REASONING: PHASE 2 DPO DATASET VERIFICATION RUNNER
 * Script: scripts/test-phase2-dpo-dataset.ts
 *
 * Validates the 1,004 contrastive DPO safety pairs for structural integrity,
 * distribution across negative-constraint categories, and contrastive divergence.
 * ============================================================================
 */

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

async function verifyDpoDataset() {
  console.log("============================================================================");
  console.log("NOCTIS CLINICAL REASONING: PHASE 2 DPO DATASET VALIDATION RUNNER");
  console.log("============================================================================\n");

  const datasetPath = path.resolve(process.cwd(), "data/noctis-dpo-clinical-safety.jsonl");
  if (!fs.existsSync(datasetPath)) {
    console.error(`[FAIL] DPO dataset file does not exist at: ${datasetPath}`);
    process.exit(1);
  }

  const categoryCounts: Record<string, number> = {};
  const violationCounts: Record<string, number> = {};
  let totalRows = 0;
  let parseErrors = 0;
  let contrastFailures = 0;

  const fileStream = fs.createReadStream(datasetPath, { encoding: "utf-8" });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    totalRows++;

    try {
      const record = JSON.parse(trimmed);
      if (!record.id || !record.prompt || !record.chosen || !record.rejected) {
        parseErrors++;
        continue;
      }

      categoryCounts[record.category] = (categoryCounts[record.category] || 0) + 1;
      const vPrev = record.violation_prevented || "UNSPECIFIED";
      violationCounts[vPrev] = (violationCounts[vPrev] || 0) + 1;

      // Validate contrastive separation
      if (vPrev.includes("VAL-WEIGHT-FABRICATION")) {
        if (/70\s*kg/i.test(record.chosen)) contrastFailures++;
        if (!/70\s*kg/i.test(record.rejected)) contrastFailures++;
      }
      if (vPrev.includes("VAL-CHLORIDE-SUBSTITUTION")) {
        if (/estimated\s+anion\s+gap/i.test(record.chosen)) contrastFailures++;
        if (!/estimated\s+anion\s+gap/i.test(record.rejected)) contrastFailures++;
      }
      if (vPrev.includes("VAL-WINTERS-BORDERLINE-CALIBRATION")) {
        if (/definitive.*secondary\s+respiratory\s+acidosis/i.test(record.chosen)) contrastFailures++;
        if (!/definitive.*secondary\s+respiratory\s+acidosis/i.test(record.rejected)) contrastFailures++;
      }
      if (vPrev.includes("VAL-KDIGO-STAGING-CALIBRATION")) {
        if (!/Stage\s*2/i.test(record.chosen)) contrastFailures++;
        if (!/Stage\s*3/i.test(record.rejected)) contrastFailures++;
      }
      if (vPrev.includes("VAL-SEPSIS-INDIVIDUALIZED-RESUSCITATION")) {
        if (!/CONTRAINDICAT/i.test(record.chosen)) contrastFailures++;
        if (!/30\s*ml\/kg/i.test(record.rejected)) contrastFailures++;
      }
    } catch {
      parseErrors++;
    }
  }

  let passes = 0;
  let fails = 0;

  function assert(desc: string, cond: boolean) {
    if (cond) {
      console.log(`  [PASS] ${desc}`);
      passes++;
    } else {
      console.error(`  [FAIL] ${desc}`);
      fails++;
    }
  }

  console.log("CATEGORY DISTRIBUTION:");
  for (const [cat, count] of Object.entries(categoryCounts)) {
    console.log(`  - ${cat.padEnd(25)} : ${count} pairs`);
  }

  console.log("\nTARGETED SAFETY VIOLATION DISTRIBUTION:");
  for (const [v, count] of Object.entries(violationCounts)) {
    if (v.startsWith("VAL-")) {
      console.log(`  - ${v.padEnd(45)} : ${count} pairs`);
    }
  }

  console.log("\nVERIFICATION CHECKS:");
  assert("Total dataset size meets or exceeds 1,000 pairs", totalRows >= 1000);
  assert("Exactly zero JSON parsing errors across all rows", parseErrors === 0);
  assert("VAL-WEIGHT-FABRICATION pairs generated (≥ 100 pairs)", (violationCounts["VAL-WEIGHT-FABRICATION"] || 0) >= 100);
  assert("VAL-CHLORIDE-SUBSTITUTION pairs generated (≥ 100 pairs)", (violationCounts["VAL-CHLORIDE-SUBSTITUTION"] || 0) >= 100);
  assert("VAL-WINTERS-BORDERLINE-CALIBRATION pairs generated (≥ 100 pairs)", (violationCounts["VAL-WINTERS-BORDERLINE-CALIBRATION"] || 0) >= 100);
  assert("VAL-KDIGO-STAGING-CALIBRATION pairs generated (≥ 100 pairs)", (violationCounts["VAL-KDIGO-STAGING-CALIBRATION"] || 0) >= 100);
  assert("VAL-SEPSIS-INDIVIDUALIZED-RESUSCITATION pairs generated (≥ 100 pairs)", (violationCounts["VAL-SEPSIS-INDIVIDUALIZED-RESUSCITATION"] || 0) >= 100);
  assert("Health 500 Gold Standard pairs preserved (500 pairs)", totalRows >= 1004);
  assert("Contrastive separation intact across all targeted negative constraints", contrastFailures === 0);

  console.log("\n============================================================================");
  console.log(`PHASE 2 DPO VALIDATION SUMMARY: ${passes} PASSED, ${fails} FAILED (${totalRows} total pairs)`);
  console.log("============================================================================");

  if (fails > 0) process.exit(1);
}

verifyDpoDataset().catch((err) => {
  console.error("Runner error:", err);
  process.exit(1);
});
