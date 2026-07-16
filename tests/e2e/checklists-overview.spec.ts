import { expect, test } from "@playwright/test";
import { saveQaScreenshot } from "./support/artifacts";
import { installLocalSession } from "./support/auth";
import {
  expectAccessible,
  expectViewportSafe,
  waitForSettledWorkspace,
} from "./support/uiQuality";
import { setQaViewport } from "./support/viewports";

test.describe("vehicle checklist overview", () => {
  test("keeps fleet metrics, editing and mobile layout aligned", async ({
    page,
  }, testInfo) => {
    await installLocalSession(page, {
      permissions: [
        "inventory.checklist_read",
        "inventory.checklist_update",
        "inventory.read",
      ],
    });
    await page.route("**/api/v1/inventory/checklists/overview**", (route) =>
      route.fulfill({
        body: JSON.stringify(overviewFixture),
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );

    await setQaViewport(page, "desktop");
    await page.goto("/checklists");
    await expect(
      page.getByRole("heading", { name: "Checklists de veículos" }),
    ).toBeVisible();
    await expect(page.getByText("Conclusão real")).toBeVisible();
    await expect(page.getByText("Com reprovação").first()).toBeVisible();
    await page.getByRole("button", { name: "Editar checklist" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByLabel("Situação de Manual")).toContainText(
      "Reprovado",
    );
    await expect(page.getByLabel("Observações de Manual")).toHaveValue(
      "Não localizado",
    );
    await expectAccessible(page);
    await expectViewportSafe(page);
    await saveQaScreenshot(page, testInfo, "checklists-overview-desktop");

    await page.getByRole("button", { exact: true, name: "Fechar" }).click();
    await setQaViewport(page, "mobile");
    await page.goto("/checklists");
    await waitForSettledWorkspace(page);
    const mobileVehicleCard = page
      .locator("article")
      .filter({ hasText: "Fiat Toro Volcano" });
    await mobileVehicleCard.scrollIntoViewIfNeeded();
    await expect(mobileVehicleCard).toBeVisible();
    await expectAccessible(page);
    await expectViewportSafe(page);
    await saveQaScreenshot(page, testInfo, "checklists-overview-mobile");
  });
});

const overviewFixture = {
  generatedAt: "2026-07-15T12:00:00.000Z",
  items: [
    {
      checklists: [
        {
          completedAt: null,
          completedByUserId: null,
          createdAt: "2026-07-15T10:00:00.000Z",
          id: "checklist_1",
          items: [
            {
              id: "item_1",
              label: "Manual",
              notes: "Não localizado",
              status: "failed",
            },
          ],
          name: "Checklist de entrega",
          status: "failed",
          storeId: "store_1",
          tenantId: "tenant_1",
          unitId: "unit_1",
          updatedAt: "2026-07-15T11:00:00.000Z",
        },
      ],
      listing: {
        id: "listing_1",
        manufactureYear: 2024,
        modelYear: 2025,
        status: "published",
        title: "Fiat Toro Volcano",
      },
      metrics: {
        checklistCount: 1,
        failedItemCount: 1,
        itemCount: 1,
        pendingItemCount: 0,
        progressPercent: 0,
        resolvedItemCount: 0,
        waivedItemCount: 0,
      },
      status: "failed",
      unit: {
        colorName: "white",
        id: "unit_1",
        plate: "ABC1D23",
        status: "available",
        stockNumber: "42",
        vin: null,
      },
      updatedAt: "2026-07-15T11:00:00.000Z",
    },
  ],
  summary: {
    attentionUnitCount: 1,
    checklistCount: 1,
    failedItemCount: 1,
    itemCount: 1,
    missingChecklistUnitCount: 0,
    pendingItemCount: 0,
    progressPercent: 0,
    resolvedItemCount: 0,
    unitCount: 1,
    waivedItemCount: 0,
  },
};
