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
    expect(financeRoutes.summary()).toBe("/api/v1/finance/summary");
    expect(financeRoutes.recurringEntries()).toBe(
      "/api/v1/finance/recurring-entries",
    );
    expect(financeRoutes.commissionRules()).toBe(
      "/api/v1/finance/commission-rules",
    );
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
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(jsonResponse({ id: "document_1" }));
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
      "https://upload.local/receipt.pdf",
      expect.objectContaining({ body: file, method: "PUT" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "/api/v1/finance/entries/entry_1/documents",
      expect.objectContaining({ method: "POST" }),
    );
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
});

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
}
