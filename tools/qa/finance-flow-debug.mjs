// Debug reproduction for flow failures.
import { chromium } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5173";
const browser = await chromium.launch();
const context = await browser.newContext({
  baseURL,
  viewport: { height: 900, width: 1440 },
});
const page = await context.newPage();
page.on("console", (msg) => {
  if (msg.type() === "error") console.log("[console.error]", msg.text());
});
page.on("pageerror", (err) => console.log("[pageerror]", err.message));

await page.goto("/sign-in");
await page.evaluate(() => localStorage.clear());
await page.reload();
await page
  .getByRole("button", { name: /^Seed Owner\b/ })
  .click({ timeout: 15_000 });
await page.waitForURL(/\/dashboard$/, { timeout: 15_000 });

// 1. expenses: select Período = Todos and count rows
await page.goto("/expenses", { waitUntil: "networkidle" });
await page.waitForTimeout(1800);
const field = page.locator("label").filter({ hasText: "Período" }).first();
console.log("period labels:", await field.count());
await field.getByRole("button", { name: "Período" }).click();
await page.waitForTimeout(400);
const options = await page.getByRole("option").allTextContents();
console.log("options visible:", JSON.stringify(options));
await page.getByRole("option", { name: "Todos", exact: true }).click();
await page.waitForTimeout(1200);
const rows = await page.getByRole("row").allTextContents();
console.log("row count:", rows.length);
console.log("audi rows:", rows.filter((r) => r.includes("Audi")).length);

// 2. auto-entries: click Personalizadas tab and check Nova regra
await page.goto("/auto-entries", { waitUntil: "networkidle" });
await page.waitForTimeout(1800);
const tab = page.getByRole("tab", { exact: true, name: "Personalizadas" });
console.log("personalizadas tabs:", await tab.count());
await tab.click();
await page.waitForTimeout(800);
const novaRegra = page.getByRole("button", { name: "Nova regra" });
console.log("nova regra buttons:", await novaRegra.count());
await novaRegra.click();
await page.waitForTimeout(800);
const dialog = page.getByRole("dialog", { name: "Nova regra automática" });
console.log("dialog visible:", await dialog.isVisible());

await browser.close();
console.log("done");
