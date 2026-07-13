import { randomUUID } from "node:crypto";
import { expect, type Page } from "@playwright/test";
import { accountHeaders, qaPersonas } from "./personas";

export type DisposableSaleContext = {
  listingId: string;
  plate: string;
  query: string;
  salePriceCents: number;
  unitId: string;
  unitLabel: string;
};

export async function createDisposableSaleContext(
  page: Page,
): Promise<DisposableSaleContext> {
  const unique = randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
  const salePriceCents = 18_990_000;
  const listingResponse = await page.request.post(
    "/api/v1/inventory/listings",
    {
      data: {
        description: "Veículo descartável para opções de venda E2E.",
        fuelType: "flex",
        mileageKm: 12000,
        modelYear: 2024,
        plate: null,
        priceCents: salePriceCents,
        status: "published",
        title: `QA Sales Options ${unique}`,
        transmission: "automatic",
      },
      headers: qaHeaders(),
    },
  );
  expect(listingResponse.status()).toBe(201);
  const listingPayload = (await listingResponse.json()) as {
    listing: { id: string; title: string };
  };
  const plate = `Q${unique.slice(0, 6)}`;
  const unitLabel = `QA-OPTIONS-${unique}`;
  const unitResponse = await page.request.put(
    `/api/v1/inventory/listings/${listingPayload.listing.id}/unit`,
    {
      data: { colorName: "black", plate, stockNumber: unitLabel, vin: null },
      headers: qaHeaders(),
    },
  );
  expect(unitResponse.ok()).toBe(true);
  const unitPayload = (await unitResponse.json()) as {
    units: { id: string }[];
  };
  const unitId = unitPayload.units.at(-1)?.id;
  expect(unitId).toBeTruthy();

  const query = new URLSearchParams({
    buyerEmail: "qa.sales.options@example.test",
    buyerName: "Cliente QA Opções",
    buyerPhone: "(11) 96666-0000",
    colorName: "black",
    leadId: "20000000-0000-4000-8000-000000000001",
    listingId: listingPayload.listing.id,
    listingTitle: listingPayload.listing.title,
    plate,
    priceCents: String(salePriceCents),
    unitId: unitId!,
    unitLabel,
  });
  return {
    listingId: listingPayload.listing.id,
    plate,
    query: query.toString(),
    salePriceCents,
    unitId: unitId!,
    unitLabel,
  };
}

export async function expectCancelledReservationPersistence(
  page: Page,
  context: DisposableSaleContext,
  reason: string,
) {
  await expect
    .poll(() => loadSaleForUnit(page, context.unitId))
    .toMatchObject({ overrideReason: reason, status: "cancelled" });
  const cancelledSale = await loadSaleForUnit(page, context.unitId);
  expect(cancelledSale).toBeTruthy();
  expect(
    cancelledSale!.payments.some((payment) => payment.status === "cancelled"),
  ).toBe(true);

  await expect
    .poll(async () => {
      const response = await page.request.get(
        `/api/v1/inventory/units?status=available&search=${context.plate}`,
        { headers: qaHeaders() },
      );
      if (!response.ok()) return false;
      const payload = (await response.json()) as {
        items: { unit?: { id: string } | null }[];
      };
      return payload.items.some((item) => item.unit?.id === context.unitId);
    })
    .toBe(true);

  await expect
    .poll(async () => {
      const response = await page.request.get(
        `/api/v1/finance/entries?targetType=sale&targetId=${cancelledSale!.id}`,
        { headers: qaHeaders() },
      );
      if (!response.ok()) return [];
      const payload = (await response.json()) as {
        entries: { category: string; status: string }[];
      };
      return payload.entries
        .filter((entry) => entry.category === "vehicle_reservation_signal")
        .map((entry) => entry.status);
    })
    .toEqual(["cancelled"]);

  return cancelledSale!;
}

export async function expectSaleOptionsPersisted(
  page: Page,
  context: DisposableSaleContext,
) {
  await expect
    .poll(() => loadSaleForUnit(page, context.unitId))
    .toMatchObject({
      payments: [
        { method: "pix", principalCents: 2_000_000 },
        { method: "financing", principalCents: 16_990_000 },
      ],
      saleSourceSnapshot: {
        commission: {
          amountValueCents: 150_000,
          notes: "Liberar após entrega",
          ruleType: "fixed",
        },
        financing: {
          bankName: "Banco QA",
          financedAmountCents: 10_000_000,
          installmentsCount: 48,
          status: "approved",
        },
        insurance: {
          brokerName: "Corretora QA",
          companyName: "Seguradora QA",
          premiumCents: 250_000,
          status: "issued",
        },
      },
      selectedDocumentKinds: [
        "sale_contract",
        "sale_receipt",
        "delivery_term",
        "power_of_attorney",
      ],
    });
}

export async function cleanupDisposableListing(page: Page, listingId: string) {
  const response = await page.request.delete(
    `/api/v1/inventory/listings/${listingId}`,
    { headers: qaHeaders() },
  );
  expect([204, 404]).toContain(response.status());
}

async function loadSaleForUnit(page: Page, unitId: string) {
  const response = await page.request.get(
    `/api/v1/sales?status=all&unitId=${unitId}`,
    { headers: qaHeaders() },
  );
  if (!response.ok()) return null;
  const payload = (await response.json()) as { sales: PersistedSale[] };
  return payload.sales[0] ?? null;
}

function qaHeaders() {
  return {
    ...accountHeaders(qaPersonas.owner),
    "x-store-slug": qaPersonas.owner.storeSlug ?? "test-store",
  };
}

type PersistedSale = {
  id: string;
  overrideReason: string | null;
  payments: { method: string; principalCents: number; status: string }[];
  saleSourceSnapshot: Record<string, unknown>;
  selectedDocumentKinds: string[];
  status: string;
};
