import { expect, type Page, type TestInfo } from "@playwright/test";
import { saveQaScreenshot } from "./artifacts";
import { loginAs } from "./auth";
import { qaPersonas } from "./personas";
import {
  createEditableVehicleFixture,
  deleteVehicleFixture,
} from "./vehicleFixtures";

export async function verifyPersistedVehicleEdit(
  page: Page,
  testInfo: TestInfo,
) {
  await loginAs(page, qaPersonas.owner, testInfo);
  const fixture = await createEditableVehicleFixture(page);

  try {
    await page.goto("/inventory");
    await expect(page.getByText(fixture.title).first()).toBeVisible();
    await page.getByText(fixture.title).first().click();

    await page.getByRole("button", { name: "Editar especificações" }).click();
    const editor = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Editar veículo" }),
    });
    await editor.getByLabel("Quilometragem").fill("54321");
    await editor.getByLabel("Portas").fill("4");

    const updateResponse = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/v1/inventory/listings/${fixture.id}`) &&
        response.request().method() === "PATCH" &&
        response.status() === 200,
    );
    await editor.getByRole("button", { name: "Salvar alterações" }).click();
    await updateResponse;
    await expect(page.getByText("54.321 km").first()).toBeVisible();

    await page.reload();
    await expect(page.getByText(fixture.title).first()).toBeVisible();
    await page.getByText(fixture.title).first().click();
    await expect(
      page.getByRole("navigation", { name: "Abas do veículo" }),
    ).toBeVisible();
    await expect(page.getByText("54.321 km").first()).toBeVisible();
    await saveQaScreenshot(
      page,
      testInfo,
      "admin-detail-edit-persisted-after-reload",
    );
  } finally {
    await deleteVehicleFixture(page, fixture.id);
  }
}
