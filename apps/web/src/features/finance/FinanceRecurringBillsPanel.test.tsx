// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FinanceRecurringBillsPanel } from "./FinanceRecurringBillsPanel";
import type { FinanceRecurringEntry } from "./types";

describe("FinanceRecurringBillsPanel", () => {
  afterEach(() => cleanup());

  it("shows the exhausted badge and the occurrences progress", () => {
    render(
      <FinanceRecurringBillsPanel
        items={[
          recurringEntry({
            metadata: {
              exhaustedAt: "2026-07-01T00:00:00.000Z",
              generatedCount: 2,
              occurrences: 5,
            },
          }),
        ]}
      />,
    );

    expect(screen.getByText("Concluída")).toBeInTheDocument();
    expect(screen.queryByText("Pendente")).not.toBeInTheDocument();
    expect(screen.getByText("2 de 5 gerados")).toBeInTheDocument();
  });

  it("fires edit and cancel callbacks from the row actions", () => {
    const onEdit = vi.fn();
    const onCancel = vi.fn();
    render(
      <FinanceRecurringBillsPanel
        canUpdate
        items={[recurringEntry()]}
        onCancel={onCancel}
        onEdit={onEdit}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Editar recorrência Aluguel do pátio",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Cancelar recorrência Aluguel do pátio",
      }),
    );

    expect(onEdit).toHaveBeenCalledWith(
      expect.objectContaining({ id: "rec_1" }),
    );
    expect(onCancel).toHaveBeenCalledWith(
      expect.objectContaining({ id: "rec_1" }),
    );
  });

  it("hides the row actions for read-only viewers", () => {
    render(
      <FinanceRecurringBillsPanel
        canUpdate={false}
        items={[recurringEntry()]}
        onCancel={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", {
        name: "Editar recorrência Aluguel do pátio",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Cancelar recorrência Aluguel do pátio",
      }),
    ).not.toBeInTheDocument();
  });
});

function recurringEntry(
  overrides: Partial<FinanceRecurringEntry> = {},
): FinanceRecurringEntry {
  return {
    amountCents: 123450,
    category: "Aluguel",
    dayOfMonth: 10,
    frequency: "monthly",
    id: "rec_1",
    name: "Aluguel do pátio",
    nextDueAt: "2026-07-10T12:00:00.000Z",
    sellerUserId: null,
    status: "pending",
    type: "expense",
    ...overrides,
  };
}
