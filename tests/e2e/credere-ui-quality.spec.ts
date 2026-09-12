import { expect, test } from "@playwright/test";
import { saveQaScreenshot } from "./support/artifacts";
import { loginAs } from "./support/auth";
import { qaPersonas } from "./support/personas";
import {
  expectAccessible,
  expectViewportSafe,
  waitForSettledWorkspace,
} from "./support/uiQuality";
import { setQaViewport, type QaViewport } from "./support/viewports";

test.use({ baseURL: process.env.QA_BASE_URL ?? "http://127.0.0.1:5173" });

const viewports = ["desktop", "mobile"] satisfies QaViewport[];

test.describe("Credere UI quality", () => {
  for (const viewport of viewports) {
    test(`store workspace · ${viewport}`, async ({ page }, testInfo) => {
      await loginAs(page, qaPersonas.owner);
      await installOwnerCredereFixture(page);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await setQaViewport(page, viewport);
      await page.goto("/simulations");

      await expect(page.locator("main").first()).toBeVisible();
      await waitForSettledWorkspace(page);
      await expectViewportSafe(page);
      await expectAccessible(page);
      await saveQaScreenshot(page, testInfo, `credere-owner-${viewport}`);
    });

    test(`agency workspace · ${viewport}`, async ({ page }, testInfo) => {
      await loginAs(page, qaPersonas.agency);
      await installAgencyCredereFixture(page);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await setQaViewport(page, viewport);
      await page.goto("/agency/admin/credere");

      await expect(page.locator("main").first()).toBeVisible();
      await waitForSettledWorkspace(page);
      await expectViewportSafe(page);
      await expectAccessible(page);
      await saveQaScreenshot(page, testInfo, `credere-agency-${viewport}`);
    });
  }
});

async function installOwnerCredereFixture(
  page: import("@playwright/test").Page,
) {
  await page.route("**/api/v1/financing/credere/**", async (route) => {
    const { pathname } = new URL(route.request().url());
    if (pathname.endsWith("/status")) {
      await route.fulfill({
        json: {
          configured: true,
          mappedStoreAlias: "Credere Centro",
          usableBanks: [
            { code: "001", name: "Banco do Brasil", status: "okay" },
            { code: "341", name: "Itaú", status: "okay" },
          ],
        },
      });
      return;
    }
    if (pathname.endsWith("/connection")) {
      await route.fulfill({
        json: {
          configured: true,
          connected: true,
          storeMapping: {
            externalStoreAlias: "Credere Centro",
            externalStoreId: "external_1",
          },
        },
      });
      return;
    }
    if (pathname.endsWith("/simulations")) {
      await route.fulfill({ json: { simulations: [] } });
      return;
    }
    await route.fallback();
  });
}

async function installAgencyCredereFixture(
  page: import("@playwright/test").Page,
) {
  await page.route("**/api/v1/agency/tenants/**", async (route) => {
    const { pathname } = new URL(route.request().url());
    if (pathname.endsWith("/overview")) {
      await route.fulfill({
        json: {
          stores: [
            agencyStore("store_1", "Loja Centro"),
            agencyStore("store_2", "Loja Norte"),
          ],
        },
      });
      return;
    }
    if (pathname.endsWith("/financing/credere/provider-stores")) {
      await route.fulfill({
        json: {
          stores: [
            {
              document: "***1234",
              externalStoreId: "external_1",
              name: "Credere Centro",
              status: "active",
            },
          ],
        },
      });
      return;
    }
    if (pathname.endsWith("/financing/credere")) {
      await route.fulfill({
        json: {
          configured: true,
          connected: true,
          connection: {
            connected: true,
            connectedAt: "2026-08-11T12:00:00.000Z",
            status: "connected",
          },
          storeMappings: [
            {
              externalStoreAlias: "Credere Centro",
              externalStoreId: "external_1",
              storeId: "store_1",
            },
          ],
        },
      });
      return;
    }
    await route.fallback();
  });
}

function agencyStore(storeId: string, storeName: string) {
  return {
    activeEntitlementCount: 1,
    addonCount: 0,
    createdAt: "2026-08-11T12:00:00.000Z",
    entitlementCount: 1,
    entitlementMatrix: [],
    monthlyAmountCents: 0,
    planCode: null,
    planName: null,
    storeId,
    storeName,
    storeSlug: storeName.toLowerCase().replaceAll(" ", "-"),
    subscriptionStatus: null,
    vehicleCount: 0,
  };
}
