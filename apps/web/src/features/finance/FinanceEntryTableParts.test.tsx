// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EntryActions } from "./FinanceEntryTableParts";
import type { FinanceEntry } from "./types";

describe("EntryActions receipt access", () => {
  afterEach(cleanup);

  it("shows an existing-receipt action with read-only access", () => {
    const onReceipt = vi.fn();
    render(
      <EntryActions
        canGenerateReceipt={false}
        canOpenReceipt
        canUpdate={false}
        entry={entry}
        onCancel={vi.fn()}
        onEdit={vi.fn()}
        onReceipt={onReceipt}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Abrir recibo existente" }),
    );

    expect(onReceipt).toHaveBeenCalledWith(entry);
    expect(
      screen.queryByRole("button", { name: "Editar lançamento" }),
    ).not.toBeInTheDocument();
  });
});

const entry: FinanceEntry = {
  amountCents: 150_000,
  category: "Aluguel",
  dueAt: "2026-08-22T12:00:00.000Z",
  id: "entry_1",
  name: "Aluguel",
  paidAt: null,
  sellerUserId: null,
  status: "pending",
  type: "expense",
};
