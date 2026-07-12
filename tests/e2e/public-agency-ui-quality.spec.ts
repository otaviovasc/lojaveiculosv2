import { expect, test, type Page } from "@playwright/test";
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

const publicRoutes = [
  { name: "landing", path: "/" },
  { name: "sign-in", path: "/sign-in" },
  { name: "sign-up", path: "/sign-up" },
  { name: "session-entry", path: "/auth/session" },
  { name: "storefront", path: "/test-store" },
] as const;

const agencyRoutes = [
  { name: "agency-dashboard", path: "/agency/admin" },
  { name: "agency-stats", path: "/agency/admin/stats" },
  { name: "agency-billing", path: "/agency/admin/unified-billing" },
  { name: "agency-create-store", path: "/agency/admin/create-store" },
] as const;

const viewports = ["desktop", "mobile"] satisfies QaViewport[];

type LocalSessionFixture = {
  email: string;
  name: string;
  needsOnboarding: boolean;
  platformAdmin: boolean;
  userId: string;
};

async function installLocalSessionFixture(
  page: Page,
  fixture: LocalSessionFixture,
) {
  await page.addInitScript((userId) => {
    window.localStorage.setItem("lojaveiculosv2:local-auth-user-id", userId);
  }, fixture.userId);
  await page.route("**/api/v1/session/bootstrap", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        defaultStore: null,
        needsOnboarding: fixture.needsOnboarding,
        platformAdmin: fixture.platformAdmin,
        stores: [],
        tenantMemberships: [],
        user: {
          clerkUserId: fixture.userId,
          email: fixture.email,
          id: fixture.userId.replace(/^clerk_/, "user_"),
          name: fixture.name,
        },
      }),
      headers: { "content-type": "application/json" },
      status: 200,
    });
  });
}

test.describe("public and agency UI quality", () => {
  test("renders owner onboarding under the supported local-auth bypass", async ({
    page,
  }, testInfo) => {
    await installLocalSessionFixture(page, {
      email: "new.owner@local.test",
      name: "Novo proprietário",
      needsOnboarding: true,
      platformAdmin: false,
      userId: "clerk_new_owner",
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await setQaViewport(page, "mobile");

    await page.goto("/onboarding");

    await expect(
      page.getByRole("heading", { name: "Criar sua primeira loja" }),
    ).toBeVisible();
    await expectViewportSafe(page);
    await expectAccessible(page);
    await saveQaScreenshot(page, testInfo, "owner-onboarding-mobile");
  });

  test.describe("platform admin", () => {
    for (const viewport of viewports) {
      test(`${viewport} is explicit and viewport-safe`, async ({
        page,
      }, testInfo) => {
        await installLocalSessionFixture(page, {
          email: "platform.admin@local.test",
          name: "Platform Admin",
          needsOnboarding: false,
          platformAdmin: true,
          userId: "clerk_platform_admin",
        });
        await page.emulateMedia({ reducedMotion: "reduce" });
        await setQaViewport(page, viewport);
        await page.goto("/platform/admin");
        await expect(
          page.getByRole("heading", { name: "Admin de contas" }),
        ).toBeVisible();
        await expectViewportSafe(page);
        await expectAccessible(page);
        await saveQaScreenshot(page, testInfo, `platform-admin-${viewport}`);
      });
    }
  });

  test.describe("public acquisition", () => {
    for (const route of publicRoutes) {
      for (const viewport of viewports) {
        test(`${route.name} · ${viewport} is accessible and viewport-safe`, async ({
          page,
        }, testInfo) => {
          await page.emulateMedia({ reducedMotion: "reduce" });
          await setQaViewport(page, viewport);
          await page.goto(route.path);
          await expect.soft(page.locator("main").first()).toBeVisible();
          await waitForSettledWorkspace(page);
          await expectViewportSafe(page);
          await expectAccessible(page);
          await saveQaScreenshot(page, testInfo, `${route.name}-${viewport}`);
        });
      }
    }
  });

  test.describe("agency workspaces", () => {
    for (const route of agencyRoutes) {
      for (const viewport of viewports) {
        test(`${route.name} · ${viewport} is accessible and viewport-safe`, async ({
          page,
        }, testInfo) => {
          await loginAs(page, qaPersonas.agency);
          await page.emulateMedia({ reducedMotion: "reduce" });
          await setQaViewport(page, viewport);
          await page.goto(route.path);
          await expect
            .soft(
              viewport === "desktop"
                ? page.getByRole("navigation", { name: "Menu Principal" })
                : page.getByRole("button", { name: "Abrir menu da agência" }),
            )
            .toBeVisible();
          await waitForSettledWorkspace(page);
          await expectViewportSafe(page);
          await expectAccessible(page);
          await saveQaScreenshot(page, testInfo, `${route.name}-${viewport}`);
        });
      }
    }
  });
});
