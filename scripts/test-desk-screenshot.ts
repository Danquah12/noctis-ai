import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto("https://www.dstrike.app/noctis", { waitUntil: "networkidle" });
  const guestButton = page.locator("button:has-text('Instant Guest Access')");
  if (await guestButton.isVisible({ timeout: 4000 }).catch(() => false)) {
    await guestButton.click();
    await page.waitForTimeout(3000);
  }

  await page.waitForSelector("div:has-text('Noctis Sovereign Systems Desk')", { timeout: 20000 });
  await page.waitForTimeout(1000);

  // Take screenshot of desk
  await page.screenshot({ path: "C:/Users/asied/.gemini/antigravity/brain/8e7475a1-537a-4f42-ac96-19cba9c2e14e/noctis_desk_capture.png" });

  // Evaluate computed styles of buttons and aside
  const styles = await page.evaluate(() => {
    const aside = document.querySelector("aside");
    const button = document.querySelector("button");
    const link = document.querySelector("link[rel='stylesheet']");
    return {
      asideDisplay: aside ? window.getComputedStyle(aside).display : null,
      asideWidth: aside ? window.getComputedStyle(aside).width : null,
      buttonBg: button ? window.getComputedStyle(button).backgroundColor : null,
      buttonBorder: button ? window.getComputedStyle(button).border : null,
      stylesheetLoaded: link ? (link as HTMLLinkElement).sheet !== null : false,
      stylesheetRules: link && (link as HTMLLinkElement).sheet ? (link as HTMLLinkElement).sheet!.cssRules.length : 0,
    };
  });

  console.log("STYLES EVALUATION:", styles);
  await browser.close();
}

main().catch(console.error);
