// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFinanceApi } from "./apiClient";
import { FinanceModule } from "./FinanceModule";

describe("FinanceModule", () => {
  afterEach(() => cleanup());

  it("switches between commissions and expenses without changing hook order", async () => {
    const api = createTestApi();
    const { rerender } = render(
      <FinanceModule api={api} defaultActiveType="commission" />,
    );

    expect(
      await screen.findByRole("heading", { name: "Comissões", level: 1 }),
    ).toBeVisible();

    rerender(<FinanceModule api={api} defaultActiveType="expense" />);

    expect(
      await screen.findByRole("heading", {
        name: "Fluxo de caixa",
        level: 1,
      }),
    ).toBeVisible();

    rerender(<FinanceModule api={api} defaultActiveType="commission" />);

    expect(
      await screen.findByRole("heading", { name: "Comissões", level: 1 }),
    ).toBeVisible();
  });
});

function createTestApi() {
  const fetchMock = vi.fn<typeof fetch>(async (input) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

    if (url.endsWith("/api/v1/finance/summary")) {
      return jsonResponse({
        cancelledAmountCents: 0,
        commissionAmountCents: 0,
        expenseAmountCents: 0,
        overdueAmountCents: 0,
        paidAmountCents: 0,
        pendingAmountCents: 0,
        revenueAmountCents: 0,
      });
    }
    if (url.endsWith("/api/v1/finance/recurring-entries")) {
      return jsonResponse({ recurringEntries: [] });
    }
    if (url.endsWith("/api/v1/finance/commission-rules")) {
      return jsonResponse({ commissionRules: [] });
    }
    if (url.includes("/api/v1/finance/commissions/workspace?")) {
      return jsonResponse({
        adjustments: [],
        generatedAt: "2026-07-14T12:00:00.000Z",
        reconciliation: [],
        sales: [],
        sellerNames: {},
      });
    }
    return jsonResponse({ entries: [], hasMore: false, nextOffset: null });
  });

  return createFinanceApi({ fetch: fetchMock });
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
}
