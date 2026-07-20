// Capture expenses ledger with data (period filter = Todos).
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5173";
const outDir = "reports/ui-polish/after";
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

await page.goto("/expenses", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
const field = page.locator("label").filter({ hasText: "Período" }).first();
await field.getByRole("button", { name: "Período" }).click();
await page.getByRole("option", { name: "Todos", exact: true }).click();
await page.waitForTimeout(1200);
await page.screenshot({
  fullPage: true,
  path: `${outDir}/expenses-desktop-data.png`,
});

const mobile = await browser.newContext({
  baseURL,
  viewport: { height: 844, width: 390 },
});
const mpage = await mobile.newPage();
await mpage.goto("/sign-in");
await mpage.evaluate(() => localStorage.clear());
await mpage.reload();
await mpage
  .getByRole("button", { name: /^Seed Owner\b/ })
  .click({ timeout: 15_000 });
await mpage.waitForURL(/\/dashboard$/, { timeout: 15_000 });
await mpage.goto("/expenses", { waitUntil: "networkidle" });
await mpage.waitForTimeout(1500);
const mfield = mpage.locator("label").filter({ hasText: "Período" }).first();
await mfield.getByRole("button", { name: "Período" }).click();
await mpage.getByRole("option", { name: "Todos", exact: true }).click();
await mpage.waitForTimeout(1200);
await mpage.screenshot({
  fullPage: true,
  path: `${outDir}/expenses-mobile-data.png`,
});

await browser.close();
console.log("done");
