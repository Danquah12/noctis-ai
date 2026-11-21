import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage();
  const logs: string[] = [];
  const errors: string[] = [];
  page.on("console", (msg) => logs.push(`${msg.type()}: ${msg.text()}`));
  page.on("pageerror", (err) => errors.push(err.message));
  const failedRequests: string[] = [];
  page.on("requestfailed", (req) => failedRequests.push(`${req.url()} (${req.failure()?.errorText})`));

  await page.goto("https://www.dstrike.app/noctis", { waitUntil: "networkidle" });
  await page.screenshot({ path: "C:/Users/asied/.gemini/antigravity/brain/8e7475a1-537a-4f42-ac96-19cba9c2e14e/current_live_check.png", fullPage: true });
  console.log("Errors:", errors);
  console.log("Failed reqs:", failedRequests);
  console.log("Page title:", await page.title());
  console.log("Logs:", logs.slice(0, 10));
  await browser.close();
}

main().catch(console.error);
