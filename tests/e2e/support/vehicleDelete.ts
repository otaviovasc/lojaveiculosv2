import { expect, type Page, type TestInfo } from "@playwright/test";
import { saveQaScreenshot } from "./artifacts";
import { loginAs } from "./auth";
import { qaPersonas } from "./personas";
import {
  createEditableVehicleFixture,
  deleteVehicleFixture,
  inventoryRequestHeaders,
} from "./vehicleFixtures";

export async function verifyVehicleDeletion(page: Page, testInfo: TestInfo) {
  await loginAs(page, qaPersonas.owner, testInfo);
  const fixture = await createEditableVehicleFixture(page);
  let deleted = false;

  try {
    await page.goto("/inventory");
    await expect(page.getByText(fixture.title).first()).toBeVisible();
    await page.getByText(fixture.title).first().click();
    await page.getByRole("button", { exact: true, name: "Excluir" }).click();

    const dialog = page.getByRole("dialog", { name: "Excluir veiculo" });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByText(/removido do estoque por soft delete/i),
    ).toBeVisible();

    const deletionResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname ===
          `/api/v1/inventory/listings/${fixture.id}` &&
        response.request().method() === "DELETE",
    );
    await dialog
      .getByRole("button", { exact: true, name: "Excluir veiculo" })
      .click();
    expect((await deletionResponse).status()).toBe(204);
    deleted = true;

    await expect(page.getByText(fixture.title)).toHaveCount(0);
    const detailResponse = await page.request.get(
      `/api/v1/inventory/listings/${fixture.id}`,
      { headers: inventoryRequestHeaders() },
    );
    expect(detailResponse.status()).toBe(404);
    await saveQaScreenshot(page, testInfo, "admin-detail-delete-persisted");
  } finally {
    if (!deleted) await deleteVehicleFixture(page, fixture.id);
  }
}
