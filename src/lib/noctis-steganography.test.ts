import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  embedWatermark,
  scanForensicWatermark,
  stripZeroWidth,
  formatForensicScanMarkdown,
  handleNaturalSteganographyQuery,
} from "./noctis-steganography.ts";

describe("Noctis Sovereign Steganographic Forensic Watermark Vault (NOCTIS-STAG-001)", () => {
  test("embeds invisible zero-width watermark into text preserving visual readability", () => {
    const originalText = "Top secret enterprise acquisition dossier for Q4 review.";
    const { watermarkedText, payload, cryptographicSeal } = embedWatermark(originalText, {
      sessionId: "STAG-TEST-001",
      operatorBadge: "SEC-DIR-44",
    });

    // The stripped text should exactly match original
    assert.equal(stripZeroWidth(watermarkedText), originalText);
    // The watermarked text should have zero-width characters embedded
    assert.equal(watermarkedText.length > originalText.length, true);
    assert.equal(payload.sessionId, "STAG-TEST-001");
    assert.equal(cryptographicSeal.length, 64);
  });

  test("scans watermarked text and validates authentic unaltered status", () => {
    const originalText = "Critical infrastructure OT SCADA network segmentation plan.";
    const { watermarkedText } = embedWatermark(originalText);

    const scan = scanForensicWatermark(watermarkedText);
    assert.equal(scan.watermarkPresent, true);
    assert.equal(scan.tamperStatus, "AUTHENTIC_UNALTERED");
    assert.equal(scan.diagnostic.includes("VERIFIED"), true);
    assert.notEqual(scan.extractedPayload, null);
  });

  test("detects tampering when watermarked text is modified post-signing", () => {
    const originalText = "Board authorization granted for $500,000 disbursement.";
    const { watermarkedText } = embedWatermark(originalText);

    // Attacker modifies $500,000 to $9,000,000 while leaving invisible zero-width characters in place
    const tamperedText = watermarkedText.replace("$500,000", "$9,000,000");

    const scan = scanForensicWatermark(tamperedText);
    assert.equal(scan.watermarkPresent, true);
    assert.equal(scan.tamperStatus, "TAMPERED_MODIFIED");
    assert.equal(scan.diagnostic.includes("TAMPER ALERT"), true);
  });

  test("returns NO_WATERMARK_FOUND for regular unwatermarked text", () => {
    const plainText = "Ordinary public documentation with zero hidden bits.";
    const scan = scanForensicWatermark(plainText);

    assert.equal(scan.watermarkPresent, false);
    assert.equal(scan.tamperStatus, "NO_WATERMARK_FOUND");
    assert.equal(scan.extractedPayload, null);
  });

  test("formats audited Markdown dossier with provenance table and seal", () => {
    const originalText = "Classified intelligence brief.";
    const { watermarkedText } = embedWatermark(originalText);
    const scan = scanForensicWatermark(watermarkedText);
    const md = formatForensicScanMarkdown(scan);

    assert.equal(md.includes("# Noctis Steganographic Forensic Provenance Audit"), true);
    assert.equal(md.includes("AUTHENTIC_UNALTERED"), true);
    assert.equal(md.includes(scan.cryptographicSeal), true);
  });

  test("accurately routes natural language steganography queries", () => {
    const query = "Run forensic watermark scan to verify chain of custody on confidential leak";
    const res = handleNaturalSteganographyQuery(query);

    assert.notEqual(res, null);
    assert.equal(res?.includes("# Noctis Steganographic Forensic"), true);

    const unrelated = "How many ounces in a gallon?";
    assert.equal(handleNaturalSteganographyQuery(unrelated), null);
  });
});
