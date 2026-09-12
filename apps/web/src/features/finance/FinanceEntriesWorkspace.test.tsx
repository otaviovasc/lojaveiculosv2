// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFinanceApi } from "./apiClient";
import { FinanceEntriesWorkspace } from "./FinanceEntriesWorkspace";

describe("FinanceEntriesWorkspace", () => {
  afterEach(() => cleanup());

  it("keeps finance health and KPIs unknown while the initial load is pending", async () => {
    const loadGate = deferred<void>();
    const api = createFinanceApi({
      fetch: createWorkspaceFetch(async () => loadGate.promise),
    });

    render(<FinanceEntriesWorkspace api={api} onNavigate={undefined} />);

    expect(screen.getByText("Carregando fluxo")).toBeVisible();
    expect(screen.getAllByText("Carregando valor")).toHaveLength(4);
    expect(screen.queryByText("R$ 0,00")).not.toBeInTheDocument();
    expect(screen.queryByText("Fluxo em dia")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Mostrar lançamentos em aberto" }),
    ).toBeDisabled();

    await act(async () => loadGate.resolve());

    expect(await screen.findByText("Fluxo em dia")).toBeVisible();
    expect(screen.getAllByText("R$ 1.000,00").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: "Mostrar lançamentos em aberto" }),
    ).toBeEnabled();
  });

  it("shows unavailable KPIs after failure and recovers through retry", async () => {
    let shouldFail = true;
    const recoveryGate = deferred<void>();
    const api = createFinanceApi({
      fetch: createWorkspaceFetch(
        async () => {
          if (shouldFail) return;
          await recoveryGate.promise;
        },
        () => shouldFail,
      ),
    });

    render(<FinanceEntriesWorkspace api={api} onNavigate={undefined} />);

    expect(
      await screen.findByText("Dados financeiros indisponíveis"),
    ).toBeVisible();
    expect(screen.getAllByText("Indisponível")).toHaveLength(4);
    expect(screen.queryByText("R$ 0,00")).not.toBeInTheDocument();
    expect(screen.queryByText("Fluxo em dia")).not.toBeInTheDocument();

    shouldFail = false;
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByText("Carregando fluxo")).toBeVisible();
    expect(screen.queryByText("Indisponível")).not.toBeInTheDocument();

    await act(async () => recoveryGate.resolve());

    expect(await screen.findByText("Fluxo em dia")).toBeVisible();
    expect(
      screen.queryByText("Dados financeiros indisponíveis"),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("R$ 1.000,00").length).toBeGreaterThan(0);
  });
});

function createWorkspaceFetch(
  beforeSuccess: () => Promise<void>,
  shouldFail: () => boolean = () => false,
) {
  return vi.fn<typeof fetch>(async (input) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

    if (url.endsWith("/api/v1/finance/recurring-entries/materialize")) {
      return jsonResponse({ generatedEntries: [] });
    }

    await beforeSuccess();
    if (shouldFail()) {
      return jsonResponse(
        {
          code: "FINANCE_UNAVAILABLE",
          message: "O serviço financeiro não respondeu.",
          requestId: "req-finance-test",
        },
        503,
      );
    }

    if (url.endsWith("/api/v1/finance/recurring-entries")) {
      return jsonResponse({ recurringEntries: [] });
    }
    if (url.endsWith("/api/v1/finance/commission-rules")) {
      return jsonResponse({ commissionRules: [] });
    }
    if (url.includes("type=revenue")) {
      return jsonResponse({
        entries: [revenueEntry],
        hasMore: false,
        nextOffset: null,
      });
    }
    return jsonResponse({ entries: [], hasMore: false, nextOffset: null });
  });
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

const revenueEntry = {
  amountCents: 100_000,
  category: "sale",
  dueAt: "2026-08-22T12:00:00.000Z",
  id: "revenue-1",
  name: "Receita de venda",
  paidAt: "2026-08-22T12:00:00.000Z",
  sellerUserId: null,
  status: "paid",
  type: "revenue",
} as const;
