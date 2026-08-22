// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FinanceApi } from "./apiClient";
import { openFinanceEntryReceipt } from "./financeReceiptAction";
import type { FinanceEntry } from "./types";

afterEach(() => {
  vi.unstubAllGlobals();
  const urlStatics = URL as unknown as Record<string, unknown>;
  delete urlStatics.createObjectURL;
  delete urlStatics.revokeObjectURL;
});

describe("openFinanceEntryReceipt", () => {
  it("opens an existing persisted receipt without generating another", async () => {
    const api = receiptApi([
      { id: "document_existing", kind: "finance_receipt", title: "Recibo" },
    ]);
    stubDocumentOpen();

    const result = await openFinanceEntryReceipt(api, entry(), {
      canGenerate: false,
    });

    expect(result).toMatchObject({ generated: false, kind: "opened" });
    expect(api.generateEntryReceipt).not.toHaveBeenCalled();
    expect(api.openEntryDocument).toHaveBeenCalledWith(
      "entry_1",
      "document_existing",
    );
  });

  it("generates only when attach-backed generation is allowed", async () => {
    const api = receiptApi([]);
    stubDocumentOpen();

    const result = await openFinanceEntryReceipt(api, entry(), {
      canGenerate: true,
    });

    expect(result).toMatchObject({ generated: true, kind: "opened" });
    expect(api.generateEntryReceipt).toHaveBeenCalledWith("entry_1");
    expect(api.openEntryDocument).toHaveBeenCalledWith(
      "entry_1",
      "document_generated",
    );
  });

  it("reports no existing receipt without attempting read-only generation", async () => {
    const api = receiptApi([]);

    const result = await openFinanceEntryReceipt(api, entry(), {
      canGenerate: false,
    });

    expect(result).toEqual({ kind: "missing" });
    expect(api.generateEntryReceipt).not.toHaveBeenCalled();
    expect(api.openEntryDocument).not.toHaveBeenCalled();
  });
});

function receiptApi(documents: readonly unknown[]): FinanceApi {
  return {
    generateEntryReceipt: vi.fn(async () => ({
      document: {
        id: "document_generated",
        kind: "finance_receipt",
        title: "Recibo gerado",
      },
      generated: true,
    })),
    getEntryDetail: vi.fn(async () => ({
      documents,
      entry: entry(),
      links: [],
    })),
    openEntryDocument: vi.fn(async () => new Blob(["%PDF-1.4"])),
  } as unknown as FinanceApi;
}

function stubDocumentOpen() {
  vi.stubGlobal(
    "open",
    vi.fn(() => ({})),
  );
  Object.assign(URL, {
    createObjectURL: vi.fn(() => "blob:receipt"),
    revokeObjectURL: vi.fn(),
  });
}

function entry(): FinanceEntry {
  return {
    amountCents: 250_000,
    category: "Operacional",
    dueAt: "2026-08-22T12:00:00.000Z",
    id: "entry_1",
    name: "Aluguel",
    paidAt: null,
    sellerUserId: null,
    status: "pending",
    type: "expense",
  };
}
