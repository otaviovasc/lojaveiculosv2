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

const productRoutes = [
  { name: "dashboard", path: "/dashboard" },
  { name: "inventory", path: "/inventory" },
  { name: "sales", path: "/sales" },
  { name: "customers", path: "/customers" },
  { name: "whatsapp", path: "/crm" },
  { name: "billing", path: "/billing" },
  { name: "documents", path: "/documents" },
  { name: "simulations", path: "/simulations" },
  { name: "automatic-entries", path: "/auto-entries" },
  { name: "reports", path: "/reports" },
  { name: "expenses", path: "/expenses" },
  { name: "commissions", path: "/commissions" },
  { name: "fiscal", path: "/fiscal" },
  { name: "marketplaces", path: "/marketplaces" },
  { name: "storefront-design", path: "/customize" },
  { name: "storefront-pages", path: "/custom-pages" },
  { name: "public-api", path: "/public-api" },
  { name: "settings", path: "/settings" },
  { name: "checklists", path: "/checklists" },
  { name: "paid-traffic", path: "/paid-traffic" },
] as const;

const viewports = ["desktop", "mobile"] satisfies QaViewport[];

test.describe("product UI quality", () => {
  for (const route of productRoutes) {
    test.describe(route.name, () => {
      for (const viewport of viewports) {
        test(`${viewport} is accessible and viewport-safe`, async ({
          page,
        }, testInfo) => {
          await loginAs(page, qaPersonas.owner);
          await page.emulateMedia({ reducedMotion: "reduce" });
          await setQaViewport(page, viewport);
          await page.goto(route.path);
          await expect
            .soft(
              viewport === "desktop"
                ? page.getByRole("navigation", { name: "Modulos" })
                : page.getByRole("button", { name: "Abrir Menu" }),
            )
            .toBeVisible();
          await waitForSettledWorkspace(page);
          await expectViewportSafe(page);
          await expectAccessible(page);
          await saveQaScreenshot(
            page,
            testInfo,
            `product-${route.name}-${viewport}`,
          );
        });
      }
    });
  }
});
