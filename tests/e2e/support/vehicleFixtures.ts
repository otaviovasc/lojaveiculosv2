import { expect, type Page } from "@playwright/test";
import { accountHeaders, qaPersonas } from "./personas";

export async function createEditableVehicleFixture(page: Page) {
  const token = crypto.randomUUID().replaceAll("-", "").toUpperCase();
  const unique = `${Date.now()}-${token.slice(0, 8)}`;
  const title = `QA Editable Vehicle ${unique}`;
  const listingResponse = await page.request.post(
    "/api/v1/inventory/listings",
    {
      data: {
        description: "Veículo descartável para validar edição persistida.",
        doors: 2,
        fuelType: "flex",
        mileageKm: 32000,
        modelYear: 2024,
        plate: null,
        priceCents: 15990000,
        status: "published",
        title,
        transmission: "automatic",
      },
      headers: inventoryRequestHeaders(),
    },
  );
  expect(listingResponse.status()).toBe(201);
  const listing = (await listingResponse.json()) as {
    listing: { id: string };
  };
  const unitResponse = await page.request.put(
    `/api/v1/inventory/listings/${listing.listing.id}/unit`,
    {
      data: {
        colorName: "black",
        plate: `QAE${token.slice(0, 4)}`,
        stockNumber: `QA-EDIT-${unique}`,
        vin: null,
      },
      headers: inventoryRequestHeaders(),
    },
  );
  expect(unitResponse.ok()).toBe(true);
  return { id: listing.listing.id, title };
}

export async function deleteVehicleFixture(page: Page, listingId: string) {
  const response = await page.request.delete(
    `/api/v1/inventory/listings/${listingId}`,
    {
      headers: inventoryRequestHeaders(),
    },
  );
  expect([204, 404]).toContain(response.status());
}

export function inventoryRequestHeaders() {
  return {
    ...accountHeaders(qaPersonas.owner),
    "x-store-slug": qaPersonas.owner.storeSlug ?? "test-store",
  };
}
