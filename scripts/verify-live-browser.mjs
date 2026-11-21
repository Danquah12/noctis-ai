import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

async function runLiveBrowserSmokeTest() {
  console.log("============================================================================");
  console.log("LAUNCHING LIVE HEADLESS PLAYWRIGHT SMOKE TEST ON https://www.dstrike.app");
  console.log("============================================================================\n");

  const artifactDir = "artifacts/browser_evidence";
  mkdirSync(artifactDir, { recursive: true });

  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  page.on("console", (msg) => {
    console.log(`[Browser Console ${msg.type()}]`, msg.text());
  });

  page.on("pageerror", (err) => {
    console.error("[Browser Page Error]", err.message);
  });

  try {
    console.log("[1/5] Navigating to https://www.dstrike.app/noctis...");
    await page.goto("https://www.dstrike.app/noctis", { waitUntil: "networkidle", timeout: 30000 });
    console.log("    Navigated to:", page.url());

    // Check if authentication gate is shown
    const guestButton = page.locator("button:has-text('Instant Guest Access')");
    if (await guestButton.isVisible({ timeout: 4000 }).catch(() => false)) {
      console.log("    [+] Authentication gate detected. Clicking 'Instant Guest Access'...");
      await guestButton.click();
      console.log("    [+] Waiting for page to transition after sign in...");
      await page.waitForTimeout(3000);
      console.log("    Post-login URL:", page.url());
    }

    // Wait for Noctis Desk
    console.log("[2/5] Waiting for Noctis Sovereign Systems Desk to hydrate...");
    await page.screenshot({ path: join(artifactDir, "step2_before_hydrate.png") });
    
    // Look for Noctis Desk elements
    await page.waitForSelector("button:has-text('Noctis Health (P3)'), button:has-text('Diagnose'), button:has-text('Health (P3)'), div:has-text('Noctis Sovereign Systems Desk')", { timeout: 20000 });
    console.log("    [PASS] Noctis Sovereign Systems Desk hydrated successfully.");
    await page.screenshot({ path: join(artifactDir, "step2_hydrated.png") });

    // Open Diagnosis Modal
    console.log("[3/5] Opening Patient Diagnostic CDS Clinical Diagnostic Modal...");
    const cdsButton = page.locator("button:has-text('Patient Diagnostic CDS')").first();
    await cdsButton.click();

    // Verify modal is open
    await page.waitForSelector("button:has-text('Tri-Specialist Consensus')", { timeout: 15000 });
    console.log("    [PASS] NoctisPatientDiagnosisModal chunk loaded and mounted on demand.");

    // Check tabs
    console.log("[4/5] Testing clinical capability tabs within modal...");
    
    // Tab 1: Tri-Specialist Consensus
    const consensusTab = page.locator("button:has-text('Tri-Specialist Consensus')").first();
    await consensusTab.click();
    console.log("    [+] Clicked Tri-Specialist Consensus tab.");
    
    // Check that pre-flight certificate and shock diagnosis are rendered
    await page.waitForSelector("text=PRE-FLIGHT SELF-HEALING CERTIFICATE", { timeout: 8000 });
    await page.waitForSelector("text=Multi-System Shock & Cardiotoxic Polypharmacy Emergency", { timeout: 8000 });
    console.log("    [PASS] Pre-Flight Self-Healing Certificate & Sovereign Shock Diagnosis verified.");

    // Scroll down inside the modal body to reveal specialist opinions
    const modalBody = page.locator(".overflow-y-auto").last();
    await modalBody.evaluate((el) => el.scrollTo({ top: 600, behavior: "instant" }));
    await page.waitForTimeout(1000);

    // Verify specialist panels
    await page.waitForSelector("text=Critical Care Intensivist", { timeout: 8000 });
    await page.waitForSelector("text=Nephrologist & Acid-Base", { timeout: 8000 });
    await page.waitForSelector("text=Toxicology & Pharmacovigilance", { timeout: 8000 });
    console.log("    [PASS] Tri-Specialist Consensus Panels rendered (Intensivist, Nephrologist, Toxicologist).");

    // Screenshot capture of specialists
    console.log("[5/5] Capturing live production verification screenshot of Tri-Specialist Consensus...");
    const screenshotPath = join(artifactDir, "live_production_consensus_tab.png");
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`    [PASS] Screenshot saved to ${screenshotPath}`);

    console.log("\n============================================================================");
    console.log("LIVE PRODUCTION BROWSER SMOKE TEST PASSED COMPLETELY (100%)");
    console.log("============================================================================");

  } catch (err) {
    console.error("Test failed:", err.message);
    await page.screenshot({ path: join(artifactDir, "error_screenshot.png") }).catch(() => {});
    throw err;
  } finally {
    await browser.close();
  }
}

runLiveBrowserSmokeTest().catch(() => process.exit(1));
