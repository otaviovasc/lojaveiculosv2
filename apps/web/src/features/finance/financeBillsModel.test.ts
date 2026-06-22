import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createEntryDraft,
  filterEntries,
  toEntryInput,
  toRecurringInput,
} from "./financeBillsModel";
import type { FinanceEntry } from "./types";

describe("finance bills model", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-22T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("maps a paid draft to the V2 create entry flow payload", () => {
    const draft = {
      ...createEntryDraft("expense"),
      amount: "123.45",
      category: "Aluguel",
      dueAt: "2026-06-22",
      name: "Aluguel do patio",
      paidAt: "2026-06-22",
      status: "paid" as const,
    };

    expect(toEntryInput(draft)).toMatchObject({
      amountCents: 12345,
      category: "Aluguel",
      documentKind: "finance_receipt",
      name: "Aluguel do patio",
      paidAt: new Date("2026-06-22T12:00:00").toISOString(),
      status: "paid",
      type: "expense",
    });
  });

  it("maps recurrence settings to the V2 recurring entry contract", () => {
    const draft = {
      ...createEntryDraft("expense"),
      amount: "800",
      category: "Operacional",
      dueAt: "2026-06-25",
      name: "Ferramenta mensal",
      recurrence: "recurring" as const,
      recurrenceDay: "25",
      recurrenceOccurrences: "12",
    };

    expect(toRecurringInput(draft)).toMatchObject({
      amountCents: 80000,
      dayOfMonth: 25,
      frequency: "monthly",
      metadata: { occurrences: 12, source: "finance_bills_slice" },
      name: "Ferramenta mensal",
      nextDueAt: new Date("2026-06-25T12:00:00").toISOString(),
      type: "expense",
    });
  });

  it("filters entries by status, due window, and search query", () => {
    const entries = [
      entry("1", "Aluguel", "Operacional", "pending", "2026-06-25"),
      entry("2", "Seguro", "Veiculo", "paid", "2026-06-25"),
      entry("3", "Marketing", "Marketing", "pending", "2026-08-01"),
    ];

    expect(
      filterEntries(entries, {
        query: "aluguel",
        status: "pending",
        window: "next30",
      }).map((item) => item.id),
    ).toEqual(["1"]);
  });
});

function entry(
  id: string,
  name: string,
  category: string,
  status: FinanceEntry["status"],
  dueAt: string,
): FinanceEntry {
  return {
    amountCents: 10000,
    category,
    dueAt: `${dueAt}T15:00:00.000Z`,
    id,
    name,
    paidAt: null,
    sellerUserId: null,
    status,
    type: "expense",
  };
}
