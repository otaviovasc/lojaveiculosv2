import { expect, type Page } from "@playwright/test";
import { accountHeaders, qaPersonas } from "./personas";
import type { DisposableSaleContext } from "./salesOptions";

export type PersistedSaleRevision = {
  buyerSnapshot: Record<string, unknown>;
  correctionOfSaleId: string | null;
  id: string;
  isCurrentRevision: boolean;
  overrideReason: string | null;
  payments: {
    id: string;
    paidAt: string | null;
    providerPaymentId: string | null;
    status: string;
  }[];
  revision: number;
  saleSourceSnapshot: Record<string, unknown>;
  status: string;
};

export type SaleGeneratedDocument = {
  id: string;
  kind: string;
  metadata: Record<string, unknown>;
  status: string;
  title: string;
};

type FinanceEntry = {
  id: string;
  metadata: Record<string, unknown>;
  status: string;
};

export async function loadGeneratedSaleDocuments(
  page: Page,
  context: DisposableSaleContext,
  saleId: string,
) {
  const detail = await loadListingDetail(page, context.listingId);
  return detail.documents.filter(
    (document) => document.metadata.saleId === saleId,
  );
}

export async function expectClosedSaleArtifacts(
  page: Page,
  context: DisposableSaleContext,
  sale: PersistedSaleRevision,
) {
  expect(sale.saleSourceSnapshot).not.toHaveProperty("tradeIn");
  expect(sale.saleSourceSnapshot).not.toHaveProperty("acquisitionDetails");

  await expect
    .poll(() => loadGeneratedSaleDocuments(page, context, sale.id))
    .toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "sale_contract", status: "issued" }),
      ]),
    );
  const documents = await loadGeneratedSaleDocuments(page, context, sale.id);
  expect(documents).toHaveLength(4);

  await expect
    .poll(() => loadFinanceEntries(page, sale.id))
    .not.toHaveLength(0);
  const financeEntries = await loadFinanceEntries(page, sale.id);
  return { documents, financeEntries };
}

export async function expectSaleReversalPersistence(
  page: Page,
  context: DisposableSaleContext,
  original: PersistedSaleRevision,
  correctionId: string,
  editedBuyerName: string,
  reason: string,
  originalDocuments: readonly SaleGeneratedDocument[],
  originalFinanceEntries: readonly FinanceEntry[],
) {
  await expect
    .poll(async () => (await loadSaleRevisions(page, context.unitId)).length)
    .toBeGreaterThanOrEqual(2);
  const sales = await loadSaleRevisions(page, context.unitId);
  expect(sales.find((sale) => sale.id === original.id)).toMatchObject({
    isCurrentRevision: false,
    revision: original.revision,
    status: "closed",
  });
  const correction = sales.find((sale) => sale.id === correctionId);
  expect(correction).toMatchObject({
    buyerSnapshot: { name: editedBuyerName },
    correctionOfSaleId: original.id,
    isCurrentRevision: true,
    overrideReason: reason,
    revision: original.revision + 1,
    status: "draft",
  });
  expect(
    correction?.payments.every((payment) => payment.status === "pending"),
  ).toBe(true);
  expect(
    correction?.payments.every(
      (payment) =>
        payment.paidAt === null && payment.providerPaymentId === null,
    ),
  ).toBe(true);
  expect(correction?.payments.map((payment) => payment.id)).not.toEqual(
    original.payments.map((payment) => payment.id),
  );

  await expect
    .poll(async () => {
      const detail = await loadListingDetail(page, context.listingId);
      return {
        listingStatus: detail.listing.status,
        unitStatus: detail.units.find((unit) => unit.id === context.unitId)
          ?.status,
      };
    })
    .toEqual({ listingStatus: "published", unitStatus: "available" });

  await expect
    .poll(async () =>
      (await loadGeneratedSaleDocuments(page, context, original.id))
        .map((document) => ({ id: document.id, status: document.status }))
        .sort((left, right) => left.id.localeCompare(right.id)),
    )
    .toEqual(
      originalDocuments
        .map((document) => ({ id: document.id, status: "voided" }))
        .sort((left, right) => left.id.localeCompare(right.id)),
    );

  await expect
    .poll(() => loadFinanceEntries(page, original.id))
    .toEqual(
      expect.arrayContaining(
        originalFinanceEntries.map((entry) =>
          expect.objectContaining({
            id: entry.id,
            metadata: expect.objectContaining({
              revertedBySaleCorrection: true,
              revertedSaleId: original.id,
            }),
            status: "cancelled",
          }),
        ),
      ),
    );
}

async function loadSaleRevisions(page: Page, unitId: string) {
  const response = await page.request.get(
    `/api/v1/sales?status=all&unitId=${unitId}`,
    { headers: qaHeaders() },
  );
  expect(response.ok()).toBe(true);
  return ((await response.json()) as { sales: PersistedSaleRevision[] }).sales;
}

async function loadFinanceEntries(page: Page, saleId: string) {
  const response = await page.request.get(
    `/api/v1/finance/entries?targetType=sale&targetId=${saleId}`,
    { headers: qaHeaders() },
  );
  expect(response.ok()).toBe(true);
  return ((await response.json()) as { entries: FinanceEntry[] }).entries;
}

async function loadListingDetail(page: Page, listingId: string) {
  const response = await page.request.get(
    `/api/v1/inventory/listings/${listingId}`,
    { headers: qaHeaders() },
  );
  expect(response.ok()).toBe(true);
  return (await response.json()) as {
    documents: SaleGeneratedDocument[];
    listing: { status: string };
    units: { id: string; status: string }[];
  };
}

function qaHeaders() {
  return {
    ...accountHeaders(qaPersonas.owner),
    "x-store-slug": qaPersonas.owner.storeSlug ?? "test-store",
  };
}
