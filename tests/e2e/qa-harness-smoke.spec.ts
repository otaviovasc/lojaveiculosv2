import { expect, test } from "@playwright/test";
import { saveQaScreenshot } from "./support/artifacts";
import { loginAs } from "./support/auth";
import {
  collectPageDiagnostics,
  expectNoPageCrashes,
} from "./support/diagnostics";
import { accountHeaders, qaPersonas } from "./support/personas";
import { setQaViewport } from "./support/viewports";

test.use({ baseURL: process.env.QA_BASE_URL ?? "http://127.0.0.1:5173" });

test.describe("QA harness smoke", () => {
  test("logs in as seeded owner and captures a stable baseline", async ({
    page,
    request,
  }, testInfo) => {
    const diagnostics = collectPageDiagnostics(page);

    await setQaViewport(page, "desktop");
    await loginAs(page, qaPersonas.owner, testInfo);

    await expect(page).toHaveURL(qaPersonas.owner.expectedPath);
    await expect(
      page.getByRole("navigation", { name: "Modulos" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Início" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Dashboard Gerencial" }),
    ).toBeVisible();
    await saveQaScreenshot(page, testInfo, "qa-harness-owner-dashboard");
    expectNoPageCrashes(diagnostics);

    const bootstrap = await request.get("/api/v1/session/bootstrap", {
      headers: accountHeaders(qaPersonas.owner),
    });
    expect(bootstrap.status()).toBe(200);
    expect(await bootstrap.json()).toMatchObject({
      needsOnboarding: false,
    });
  });
});
