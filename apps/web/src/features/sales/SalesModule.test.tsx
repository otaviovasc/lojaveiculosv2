// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppApiError } from "../../lib/apiErrors";
import { SalesModule } from "./SalesModule";
import type { SalesApi } from "./apiClient";
import {
  emptySaleContextOptions,
  type SaleContextOptionsState,
} from "./saleContextOptions";
import type { SaleRecord } from "./types";

vi.mock("./saleContextOptions", async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>;
  return {
    ...original,
    loadSaleContextOptions: vi.fn(
      async (): Promise<SaleContextOptionsState> => ({
        kind: "ready",
        options: emptySaleContextOptions,
      }),
    ),
  };
});

describe("SalesModule start context", () => {
  afterEach(() => {
    cleanup();
    window.location.hash = "";
  });

  it("opens the created draft in the workspace even when the initial list resolves afterwards", async () => {
    window.location.hash =
      "#/sales?listingId=listing_1&unitId=unit_1&priceCents=18990000";
    const listDeferred = deferred<readonly SaleRecord[]>();
    const draft = saleRecord({
      id: "sale_new",
      listingId: "listing_1",
      unitId: "unit_1",
    });
    const api = salesApi({
      createDraft: vi.fn(async () => draft),
      list: vi.fn(() => listDeferred.promise),
    });

    render(<SalesModule api={api} />);

    // While the draft is being prepared the user must not see the bare list.
    expect(screen.getByText("Preparando a venda")).toBeInTheDocument();

    // The list resolves stale: it was requested before the draft existed.
    listDeferred.resolve([]);

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Fechar Venda" }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByText("Nenhuma venda selecionada"),
    ).not.toBeInTheDocument();
    expect(api.createDraft).toHaveBeenCalledOnce();
    expect(api.createDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        listingId: "listing_1",
        salePriceCents: 18990000,
        unitId: "unit_1",
      }),
    );
    // Params were consumed: a refresh must not create a duplicate draft.
    expect(window.location.hash).toBe("#/sales");
  });

  it("stays on the list without a start context", async () => {
    window.location.hash = "#/sales";
    const api = salesApi();

    render(<SalesModule api={api} />);

    await waitFor(() => expect(api.list).toHaveBeenCalled());
    expect(api.createDraft).not.toHaveBeenCalled();
    expect(screen.queryByText("Preparando a venda")).not.toBeInTheDocument();
  });

  it("resumes the existing sale when the unit already has a current sale", async () => {
    window.location.hash = "#/sales?listingId=listing_1&unitId=unit_1";
    const existing = saleRecord({
      id: "sale_existing",
      listingId: "listing_1",
      unitId: "unit_1",
    });
    const api = salesApi({
      createDraft: vi.fn(async () => {
        throw new AppApiError({
          code: "SALE_UNIT_CONFLICT",
          message: "Vehicle unit already has a current sale.",
          status: 409,
        });
      }),
      list: vi.fn(async () => [existing]),
    });

    render(<SalesModule api={api} />);

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Fechar Venda" }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByText("Nenhuma venda selecionada"),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/venda em andamento/)).toBeInTheDocument();
    expect(window.location.hash).toBe("#/sales");
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function salesApi(overrides: Partial<SalesApi> = {}): SalesApi {
  const draft = saleRecord({ id: "sale_new" });
  return {
    cancel: vi.fn(async () => draft),
    close: vi.fn(async () => draft),
    createDraft: vi.fn(async () => draft),
    delete: vi.fn(async () => undefined),
    list: vi.fn(async () => []),
    reserve: vi.fn(async () => draft),
    revert: vi.fn(async () => draft),
    updateDraft: vi.fn(async () => draft),
    ...overrides,
  };
}

function saleRecord(overrides: Partial<SaleRecord> = {}): SaleRecord {
  return {
    buyerSnapshot: { name: "Cliente QA" },
    closedAt: null,
    correctionOfSaleId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    documentPolicySnapshot: {
      requiredDocumentKinds: [
        "sale_contract",
        "sale_receipt",
        "delivery_term",
        "power_of_attorney",
      ],
    },
    id: "sale_1",
    isCurrentRevision: true,
    leadId: "lead_1",
    listingId: null,
    listingSnapshot: { title: "Audi A4" },
    overrideReason: null,
    overrideRequiredFields: false,
    payments: [],
    revision: 1,
    salePriceCents: 18990000,
    saleSourceSnapshot: { source: "lead" },
    selectedDocumentKinds: [
      "sale_contract",
      "sale_receipt",
      "delivery_term",
      "power_of_attorney",
    ],
    sellerUserId: "seller_1",
    status: "draft",
    unitId: "unit_1",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}
