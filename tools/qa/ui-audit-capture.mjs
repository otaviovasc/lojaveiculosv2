// Capture UI audit screenshots (before/after) across key admin + public pages.
// Usage: node tools/qa/ui-audit-capture.mjs <label>   (label = before | after)
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const label = process.argv[2] ?? "before";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5173";
const outDir = `reports/ui-polish/${label}`;
mkdirSync(outDir, { recursive: true });

const viewports = [
  { height: 900, name: "desktop", width: 1440 },
  { height: 844, name: "mobile", width: 390 },
];

const pages = [
  { name: "dashboard", path: "/dashboard" },
  { name: "inventory", path: "/inventory" },
  { name: "sales", path: "/sales" },
  { name: "customers", path: "/customers" },
  { name: "crm", path: "/crm" },
  { name: "expenses", path: "/expenses" },
  { name: "commissions", path: "/commissions" },
  { name: "auto-entries", path: "/auto-entries" },
  { name: "documents", path: "/documents" },
  { name: "checklists", path: "/checklists" },
  { name: "marketplaces", path: "/marketplaces" },
  { name: "reports", path: "/reports" },
  { name: "billing", path: "/billing" },
  { name: "settings", path: "/settings" },
  { name: "public-site", path: "/public-site" },
  { name: "fiscal", path: "/fiscal" },
  { name: "automation", path: "/autobot" },
  { name: "public-api", path: "/public-api" },
];

const publicPages = [
  { name: "landing", path: "/" },
  { name: "storefront", path: "/test-store" },
];

const browser = await chromium.launch();

for (const viewport of viewports) {
  const context = await browser.newContext({
    baseURL,
    viewport: { height: viewport.height, width: viewport.width },
  });
  const page = await context.newPage();

  // Local auth: pick seed owner on the profile selector.
  await page.goto("/sign-in");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page
    .getByRole("button", { name: /^Seed Owner\b/ })
    .click({ timeout: 15_000 });
  await page.waitForURL(/\/dashboard$/, { timeout: 15_000 });

  for (const target of pages) {
    await capture(page, target, viewport);
  }

  const publicContext = await browser.newContext({
    baseURL,
    viewport: { height: viewport.height, width: viewport.width },
  });
  const publicPage = await publicContext.newPage();
  for (const target of publicPages) {
    await capture(publicPage, target, viewport);
  }
  await publicContext.close();
  await context.close();
}

await browser.close();
console.log(`Screenshots saved to ${outDir}`);

async function capture(page, target, viewport) {
  try {
    await page.goto(target.path, { waitUntil: "networkidle" });
  } catch {
    await page.goto(target.path).catch(() => {});
  }
  await page.waitForTimeout(1800);
  const overflow = await page.evaluate(() => {
    const clientWidth = document.documentElement.clientWidth;
    const offenders = [...document.querySelectorAll("body *")]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          className: element.className.toString().slice(0, 100),
          right: Math.round(rect.right),
          left: Math.round(rect.left),
          tag: element.tagName.toLowerCase(),
          width: Math.round(rect.width),
        };
      })
      .filter(
        ({ left, right, width }) =>
          width > 0 && (left < -1 || right > clientWidth + 1),
      )
      .slice(0, 8);
    return {
      clientWidth,
      offenders,
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
  if (
    overflow.scrollWidth > overflow.clientWidth + 1 ||
    overflow.offenders.length > 0
  ) {
    console.log(
      `[overflow] ${target.name} @${viewport.name}: scroll=${overflow.scrollWidth} client=${overflow.clientWidth}`,
    );
    for (const offender of overflow.offenders) {
      console.log(
        `  ${offender.tag}.${offender.className} left=${offender.left} right=${offender.right} width=${offender.width}`,
      );
    }
  }
  await page.screenshot({
    fullPage: true,
    path: `${outDir}/${target.name}-${viewport.name}.png`,
  });
}
