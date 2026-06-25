import { describe, expect, it } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { createFinanceServices } from "./financeServices.js";

describe("finance services", () => {
  it("creates finance entries with optional draft document uploads", async () => {
    const services = createFinanceServices();
    const context = createContext([
      "finance.attach_document",
      "finance.create",
      "finance.read",
    ]);

    const result = await services.createEntry(context, {
      ...entry("Entrada com recibo", "pending"),
      documentUpload: {
        contentType: "application/pdf",
        fileName: "recibo.pdf",
        metadata: { source: "counter" },
        sizeBytes: 2048,
        title: "Recibo da entrada",
      },
    });
    const detail = await services.getEntry(context, {
      entryId: result.entry.id,
    });

    expect(result.documentUpload?.storageKey).toContain(result.entry.id);
    expect(result.documents).toHaveLength(1);
    expect(detail.documents).toMatchObject([
      {
        fileName: "recibo.pdf",
        kind: "finance_receipt",
        linkRole: "receipt",
        targetId: result.entry.id,
        targetType: "finance_entry",
        title: "Recibo da entrada",
      },
    ]);
  });

  it("paginates finance entries and preserves type/status/target filters", async () => {
    const services = createFinanceServices();
    const context = createContext(["finance.create", "finance.read"]);

    await services.createEntry(context, entry("Primeira", "pending"));
    await services.createEntry(context, entry("Segunda", "pending"));
    await services.createEntry(context, entry("Terceira", "pending"));
    await services.createEntry(context, entry("Paga", "paid"));
    await services.createEntry(context, {
      ...entry("Outra origem", "pending"),
      links: [{ targetId: "sale_other", targetType: "sale" }],
    });

    const firstPage = await services.listEntries(context, {
      limit: 2,
      offset: 0,
      status: "pending",
      targetId: "sale_1",
      targetType: "sale",
      type: "commission",
    });
    const secondPage = await services.listEntries(context, {
      limit: 2,
      offset: firstPage.nextOffset ?? 0,
      status: "pending",
      targetId: "sale_1",
      targetType: "sale",
      type: "commission",
    });

    expect(firstPage).toMatchObject({
      hasMore: true,
      nextOffset: 2,
    });
    expect(firstPage.entries.map((item) => item.name)).toEqual([
      "Primeira",
      "Segunda",
    ]);
    expect(secondPage).toMatchObject({
      hasMore: false,
      nextOffset: null,
    });
    expect(secondPage.entries.map((item) => item.name)).toEqual(["Terceira"]);
  });

  it("replaces entry links on update", async () => {
    const services = createFinanceServices();
    const context = createContext(["finance.create", "finance.update"]);
    const created = await services.createEntry(
      context,
      entry("Comissao", "pending"),
    );

    const updated = await services.updateEntry(context, {
      entryId: created.entry.id,
      links: [{ targetId: "sale_2", targetType: "sale" }],
    });

    expect(updated.links).toHaveLength(1);
    expect(updated.links[0]).toMatchObject({
      entryId: created.entry.id,
      targetId: "sale_2",
      targetType: "sale",
    });
  });
});

function createContext(permissions: string[]) {
  return createServiceContext({
    actor: { id: "user_1", kind: "user" },
    permissions,
    request: { requestId: "req_1" },
    storeId: "store_1",
    tenantId: "tenant_1",
  });
}

function entry(name: string, status: "paid" | "pending") {
  return {
    amountCents: 10000,
    category: "Comissao",
    dueAt: null,
    links: [{ targetId: "sale_1", targetType: "sale" as const }],
    metadata: {},
    name,
    paidAt: status === "paid" ? new Date("2026-06-22T12:00:00.000Z") : null,
    sellerUserId: "seller_1",
    status,
    type: "commission" as const,
  };
}
