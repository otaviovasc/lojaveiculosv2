import { describe, expect, it, vi } from "vitest";
import { createFinanceApi, financeRoutes } from "./apiClient";

describe("finance api client", () => {
  it("builds the finance entry routes", () => {
    expect(financeRoutes.entries()).toBe("/api/v1/finance/entries");
    expect(financeRoutes.entries(undefined, "expense")).toBe(
      "/api/v1/finance/entries?type=expense",
    );
    expect(
      financeRoutes.entries(undefined, {
        limit: 50,
        offset: 100,
        status: "pending",
        type: "commission",
      }),
    ).toBe(
      "/api/v1/finance/entries?limit=50&offset=100&status=pending&type=commission",
    );
    expect(financeRoutes.documentUploads("entry 1")).toBe(
      "/api/v1/finance/entries/entry%201/documents/uploads",
    );
    expect(financeRoutes.documents("entry 1")).toBe(
      "/api/v1/finance/entries/entry%201/documents",
    );
    expect(financeRoutes.payEntry("entry 1")).toBe(
      "/api/v1/finance/entries/entry%201/pay",
    );
    expect(financeRoutes.cancelEntry("entry 1")).toBe(
      "/api/v1/finance/entries/entry%201/cancel",
    );
    expect(financeRoutes.entryDocumentContent("entry 1", "doc 1")).toBe(
      "/api/v1/finance/entries/entry%201/documents/doc%201/content",
    );
    expect(financeRoutes.recurringEntries()).toBe(
      "/api/v1/finance/recurring-entries",
    );
    expect(financeRoutes.recurringEntry("rec 1")).toBe(
      "/api/v1/finance/recurring-entries/rec%201",
    );
    expect(financeRoutes.materializeRecurringEntries()).toBe(
      "/api/v1/finance/recurring-entries/materialize",
    );
    expect(financeRoutes.commissionRules()).toBe(
      "/api/v1/finance/commission-rules",
    );
    expect(financeRoutes.commissionSettlement()).toBe(
      "/api/v1/finance/commissions/settlements",
    );
    expect(
      financeRoutes.commissionWorkspace(undefined, {
        from: "2026-07-01T00:00:00.000Z",
        to: "2026-07-31T23:59:59.999Z",
      }),
    ).toContain("/api/v1/finance/commissions/workspace?");
  });

  it("creates an entry and attaches an optional uploaded document", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({ entry: { id: "entry_1" }, links: [] }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          storageKey: "finance/entry_1/receipt.pdf",
          uploadUrl: "https://upload.local/receipt.pdf",
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ id: "document_1" }))
      .mockResolvedValueOnce(
        jsonResponse({
          entry: {
            id: "entry_1",
            metadata: {
              receipt: {
                fileName: "receipt.pdf",
                title: "receipt.pdf",
              },
            },
          },
          links: [],
        }),
      );
    const api = createFinanceApi({ fetch: fetchMock });
    const file = new File(["receipt"], "receipt.pdf", {
      type: "application/pdf",
    });

    await api.createEntryFlow({
      amountCents: 12500,
      category: "Despesa",
      documentFile: file,
      name: "Despachante",
      status: "pending",
      type: "expense",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/v1/finance/entries",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/v1/finance/entries/entry_1/documents/uploads",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/v1/finance/entries/entry_1/documents",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "/api/v1/finance/entries/entry_1",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(JSON.parse(String(fetchMock.mock.calls[3]?.[1]?.body))).toEqual({
      metadata: {
        receipt: {
          fileName: "receipt.pdf",
          title: "receipt.pdf",
        },
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("calls lifecycle and finance-core endpoints", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({ entry: { id: "entry_1" }, links: [] }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ entry: { id: "entry_1" }, links: [] }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ entry: { id: "entry_1" }, links: [] }),
      );
    const api = createFinanceApi({ fetch: fetchMock });

    await api.payEntry("entry_1");
    await api.cancelEntry("entry_1", "duplicado");
    await api.updateEntry("entry_1", { name: "Novo nome" });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/v1/finance/entries/entry_1/pay",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/v1/finance/entries/entry_1/cancel",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/v1/finance/entries/entry_1",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("loads every finance entry page for aggregate workspaces", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          entries: [{ id: "entry_1" }, { id: "entry_2" }],
          hasMore: true,
          nextOffset: 2,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          entries: [{ id: "entry_3" }],
          hasMore: false,
          nextOffset: null,
        }),
      );
    const api = createFinanceApi({ fetch: fetchMock });

    const entries = await api.listAllEntries("commission");

    expect(entries.map((entry) => entry.id)).toEqual([
      "entry_1",
      "entry_2",
      "entry_3",
    ]);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/v1/finance/entries?limit=200&offset=0&type=commission",
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/v1/finance/entries?limit=200&offset=2&type=commission",
      expect.any(Object),
    );
  });

  it("loads the sale-first workspace and settles commissions in one request", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          adjustments: [],
          generatedAt: "2026-07-14T12:00:00.000Z",
          reconciliation: [],
          sales: [],
          sellerNames: {},
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ totalCents: 10000, updatedCount: 1 }),
      );
    const api = createFinanceApi({ fetch: fetchMock });

    await api.getCommissionWorkspace({
      from: "2026-07-01T00:00:00.000Z",
      to: "2026-07-31T23:59:59.999Z",
    });
    await api.settleCommissionEntries({
      entryIds: ["entry_1"],
      paidAt: "2026-07-14T12:00:00.000Z",
      sellerUserId: "seller_1",
    });

    expect(fetchMock.mock.calls[0]?.[0]).toContain(
      "/api/v1/finance/commissions/workspace?",
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/v1/finance/commissions/settlements",
      expect.objectContaining({ method: "POST" }),
    );
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      entryIds: ["entry_1"],
      paidAt: "2026-07-14T12:00:00.000Z",
      sellerUserId: "seller_1",
    });
  });

  it("loads the entry detail with linked documents", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      jsonResponse({
        documents: [
          {
            fileName: "receipt.pdf",
            id: "document_1",
            kind: "finance_receipt",
            mimeType: "application/pdf",
            title: "Comprovante",
          },
        ],
        entry: { id: "entry_1" },
        links: [],
      }),
    );
    const api = createFinanceApi({ fetch: fetchMock });

    const detail = await api.getEntryDetail("entry_1");

    expect(detail.documents).toHaveLength(1);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/v1/finance/entries/entry_1",
      expect.any(Object),
    );
  });

  it("materializes, updates, and cancels recurring entries", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ generatedEntries: [] }))
      .mockResolvedValueOnce(jsonResponse({ id: "rec_1", name: "Aluguel" }))
      .mockResolvedValueOnce(
        jsonResponse({ id: "rec_1", status: "cancelled" }),
      );
    const api = createFinanceApi({ fetch: fetchMock });

    const materialized = await api.materializeRecurringEntries();
    await api.updateRecurringEntry("rec_1", {
      amountCents: 90000,
      dayOfMonth: null,
      name: "Aluguel",
    });
    await api.cancelRecurringEntry("rec_1", "duplicado");

    expect(materialized.generatedEntries).toEqual([]);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/v1/finance/recurring-entries/materialize",
      expect.objectContaining({ method: "POST" }),
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({});
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/v1/finance/recurring-entries/rec_1",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      amountCents: 90000,
      dayOfMonth: null,
      name: "Aluguel",
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/v1/finance/recurring-entries/rec_1?reason=duplicado",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("omits the cancel reason query when none is provided", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ id: "rec_1" }));
    const api = createFinanceApi({ fetch: fetchMock });

    await api.cancelRecurringEntry("rec_1");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/v1/finance/recurring-entries/rec_1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("fetches entry document content as a blob with finance headers", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(new Blob(["%PDF-1.4"]), {
        headers: { "Content-Type": "application/pdf" },
        status: 200,
      }),
    );
    const api = createFinanceApi({
      auth: { accessToken: "token_1" },
      fetch: fetchMock,
    });

    const blob = await api.openEntryDocument("entry_1", "document_1");

    expect(await blob.text()).toBe("%PDF-1.4");
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(
      "/api/v1/finance/entries/entry_1/documents/document_1/content",
    );
    expect((init?.headers as Record<string, string>).Authorization).toBe(
      "Bearer token_1",
    );
  });
});

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
}
