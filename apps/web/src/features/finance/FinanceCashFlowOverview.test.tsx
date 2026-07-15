// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FinanceCashFlowOverview } from "./FinanceCashFlowOverview";
import type { FinanceEntry } from "./types";

describe("FinanceCashFlowOverview", () => {
  afterEach(() => cleanup());

  it("keeps the tinted commission hierarchy and exposes ledger shortcuts", () => {
    const onShowOverdue = vi.fn();
    const onShowPending = vi.fn();
    const { container } = render(
      <FinanceCashFlowOverview
        entries={entries}
        onShowOverdue={onShowOverdue}
        onShowPending={onShowPending}
      />,
    );

    expect(container.querySelectorAll(".feature-stat-card")).toHaveLength(4);
    expect(screen.getByText("Entradas")).toBeVisible();
    expect(screen.getByText("Saídas")).toBeVisible();
    expect(screen.getByText("Saldo planejado")).toBeVisible();
    expect(screen.getByText("Saldo real")).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", { name: "Mostrar lançamentos em aberto" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Mostrar lançamentos vencidos" }),
    );

    expect(onShowPending).toHaveBeenCalledOnce();
    expect(onShowOverdue).toHaveBeenCalledOnce();
  });
});

const entries: FinanceEntry[] = [
  {
    amountCents: 100_000,
    category: "sale",
    dueAt: "2026-07-14T12:00:00.000Z",
    id: "revenue-1",
    name: "Receita de venda",
    paidAt: "2026-07-14T12:00:00.000Z",
    sellerUserId: null,
    status: "paid",
    type: "revenue",
  },
  {
    amountCents: 25_000,
    category: "maintenance",
    dueAt: "2026-07-20T12:00:00.000Z",
    id: "expense-1",
    name: "Preparação do veículo",
    paidAt: null,
    sellerUserId: null,
    status: "pending",
    type: "expense",
  },
];
