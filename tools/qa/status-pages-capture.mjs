// Capture status/empty/error state screenshots (before/after) at the two
// visual-gate viewports from docs/ui-ux-visual-quality.md (1440x900 + 390x844).
// Usage: node tools/qa/status-pages-capture.mjs <label>   (label = before | after)
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const label = process.argv[2] ?? "before";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5173";
const outDir = `reports/ui-polish/status-${label}`;
mkdirSync(outDir, { recursive: true });

const viewports = [
  { height: 900, name: "desktop", width: 1440 },
  { height: 844, name: "mobile", width: 390 },
];

const jsonHeaders = { "content-type": "application/json" };

const browser = await chromium.launch();

for (const viewport of viewports) {
  // --- Authenticated owner context ---
  const ownerContext = await browser.newContext({
    baseURL,
    viewport: { height: viewport.height, width: viewport.width },
  });
  const ownerPage = await ownerContext.newPage();
  await signIn(ownerPage, "Seed Owner");

  await capture(
    ownerPage,
    { name: "unknown-url-authed", path: "/nao-existe/nada" },
    viewport,
  );

  await ownerPage.route("**/api/v1/inventory/listings**", async (route) => {
    await route.fulfill({
      body: JSON.stringify({ listings: [] }),
      headers: jsonHeaders,
      status: 200,
    });
  });
  await capture(
    ownerPage,
    { name: "inventory-empty-state", path: "/inventory" },
    viewport,
  );
  await ownerPage.unroute("**/api/v1/inventory/listings**");

  await ownerPage.route("**/api/v1/settings/store", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        code: "AUTHORIZATION_DENIED",
        message: "Missing permission: store_profile.manage",
        requestId: "req_pw_status_capture",
      }),
      headers: { ...jsonHeaders, "x-request-id": "req_pw_status_capture" },
      status: 403,
    });
  });
  await ownerPage.route("**/api/v1/identity/roles", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        actor: {
          canManageRoles: false,
          membershipId: "membership_1",
          role: "owner",
        },
        memberships: [],
        pendingInvitations: [],
        permissionGroups: [],
        roles: [],
      }),
      headers: jsonHeaders,
      status: 200,
    });
  });
  await capture(
    ownerPage,
    { name: "settings-alert-403", path: "/settings" },
    viewport,
  );
  await ownerContext.close();

  // --- Authenticated salesman context (permission-restricted probe) ---
  const salesContext = await browser.newContext({
    baseURL,
    viewport: { height: viewport.height, width: viewport.width },
  });
  const salesPage = await salesContext.newPage();
  await signIn(salesPage, "Seed Salesman");
  await capture(
    salesPage,
    { name: "billing-restricted", path: "/billing" },
    viewport,
  );
  await salesContext.close();

  // --- Public context ---
  const publicContext = await browser.newContext({
    baseURL,
    viewport: { height: viewport.height, width: viewport.width },
  });
  const publicPage = await publicContext.newPage();

  await capture(
    publicPage,
    { name: "storefront-ready", path: "/test-store" },
    viewport,
  );
  await capture(
    publicPage,
    { name: "storefront-not-found", path: "/loja-que-nao-existe" },
    viewport,
  );
  await capture(
    publicPage,
    { name: "unknown-url-public", path: "/nao-existe/nada" },
    viewport,
  );

  await publicPage.route("**/api/v1/public/storefront/**", async (route) => {
    await route.abort();
  });
  await capture(
    publicPage,
    { name: "storefront-error", path: "/test-store" },
    viewport,
  );
  await publicPage.unroute("**/api/v1/public/storefront/**");

  await publicPage.route(
    "**/api/v1/public/storefront/listings**",
    async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          listings: [],
          store: { name: "Loja Teste", slug: "test-store" },
        }),
        headers: jsonHeaders,
        status: 200,
      });
    },
  );
  await capture(
    publicPage,
    { name: "storefront-empty", path: "/test-store" },
    viewport,
  );
  await publicContext.close();
}

await browser.close();
console.log(`Status-page screenshots saved to ${outDir}`);

async function signIn(page, accountName) {
  await page.goto("/sign-in");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page
    .getByRole("button", { name: new RegExp(`^${accountName}\\b`) })
    .click({ timeout: 15_000 });
  await page.waitForURL(/\/dashboard$/, { timeout: 15_000 });
}

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
