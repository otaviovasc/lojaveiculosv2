// Dark-mode capture for the finance workspace redesign.
// Usage: node tools/qa/finance-workspace-capture-dark.mjs
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5173";
const outDir = "reports/ui-polish/after-dark";
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  baseURL,
  viewport: { height: 900, width: 1440 },
});
const page = await context.newPage();

await page.goto("/sign-in");
await page.evaluate(() => localStorage.clear());
await page.reload();
await page
  .getByRole("button", { name: /^Seed Owner\b/ })
  .click({ timeout: 15_000 });
await page.waitForURL(/\/dashboard$/, { timeout: 15_000 });

// Toggle dark theme via the sidebar control.
await page
  .getByRole("button", { name: /Tema Escuro|Mudar Tema/i })
  .first()
  .click();
await page.waitForTimeout(600);

for (const target of [
  { name: "expenses", path: "/expenses" },
  { name: "auto-entries", path: "/auto-entries" },
]) {
  try {
    await page.goto(target.path, { waitUntil: "networkidle" });
  } catch {
    await page.goto(target.path).catch(() => {});
  }
  await page.waitForTimeout(1500);
  await page.screenshot({
    fullPage: true,
    path: `${outDir}/${target.name}-desktop.png`,
  });
}

await browser.close();
console.log(`Screenshots saved to ${outDir}`);
