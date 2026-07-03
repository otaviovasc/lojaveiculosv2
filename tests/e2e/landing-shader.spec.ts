import { expect, test } from "@playwright/test";
import { saveQaScreenshot } from "./support/artifacts";
import {
  collectPageDiagnostics,
  expectNoPageCrashes,
} from "./support/diagnostics";

test.describe("public landing shader", () => {
  test("renders the Paper shader layer or fallback without breaking the hero", async ({
    page,
  }, testInfo) => {
    const diagnostics = collectPageDiagnostics(page);

    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 1, name: "Loja Veiculos" }),
    ).toBeVisible();

    const shader = page.getByTestId("landing-hero-shader");
    await expect(shader).toBeVisible();
    await expect(shader).toHaveAttribute(
      "data-shader-state",
      /^(fallback|webgl)$/,
    );

    const shaderBox = await shader.boundingBox();
    expect(shaderBox?.width ?? 0).toBeGreaterThan(300);
    expect(shaderBox?.height ?? 0).toBeGreaterThan(300);

    if ((await shader.getAttribute("data-shader-state")) === "webgl") {
      await expect(shader.locator("canvas")).toHaveCount(1);
    }

    expectNoPageCrashes(diagnostics);
    await saveQaScreenshot(page, testInfo, "landing-paper-shader");
  });
});
