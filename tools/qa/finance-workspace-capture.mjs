// Focused before/after capture for the finance workspace redesign.
// Usage: node tools/qa/finance-workspace-capture.mjs <label> [pageFilter]
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const label = process.argv[2] ?? "after";
const filter = process.argv[3] ?? "";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5173";
const outDir = `reports/ui-polish/${label}`;
mkdirSync(outDir, { recursive: true });

const viewports = [
  { height: 900, name: "desktop", width: 1440 },
  { height: 844, name: "mobile", width: 390 },
];

const pages = [
  { name: "expenses", path: "/expenses" },
  { name: "auto-entries", path: "/auto-entries" },
].filter((page) => page.name.includes(filter));

const browser = await chromium.launch();

for (const viewport of viewports) {
  const context = await browser.newContext({
    baseURL,
    viewport: { height: viewport.height, width: viewport.width },
  });
  const page = await context.newPage();

  await page.goto("/sign-in");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page
    .getByRole("button", { name: /^Seed Owner\b/ })
    .click({ timeout: 15_000 });
  await page.waitForURL(/\/dashboard$/, { timeout: 15_000 });

  for (const target of pages) {
    try {
      await page.goto(target.path, { waitUntil: "networkidle" });
    } catch {
      await page.goto(target.path).catch(() => {});
    }
    await page.waitForTimeout(1500);
    await page.screenshot({
      fullPage: true,
      path: `${outDir}/${target.name}-${viewport.name}.png`,
    });
  }
  await context.close();
}

await browser.close();
console.log(`Screenshots saved to ${outDir}`);
