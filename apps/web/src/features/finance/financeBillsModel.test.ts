import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppApiError } from "../../lib/apiErrors";
import type { FinanceApi } from "./apiClient";
import {
  createEntryDraft,
  filterEntries,
  filterOperationalCashEntries,
  initialFinanceFilters,
  loadFinanceWorkspace,
  recurringEntryToDraft,
  toEntryInput,
  toRecurringInput,
} from "./financeBillsModel";
import { formatFinanceCategory } from "./financeBillsFormat";
import type { FinanceEntry, FinanceRecurringEntry } from "./types";

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

  it("maps a recurring entry back to an editable draft", () => {
    const draft = recurringEntryToDraft(
      recurringEntry({
        dayOfMonth: 10,
        frequency: "yearly",
        metadata: {
          generatedCount: 2,
          notes: "Revisão anual",
          occurrences: 5,
        },
        nextDueAt: "2026-07-10T12:00:00.000Z",
        sellerUserId: "seller_1",
      }),
    );

    expect(draft).toMatchObject({
      amount: "1234.5",
      category: "Aluguel",
      dueAt: "2026-07-10",
      name: "Aluguel do pátio",
      notes: "Revisão anual",
      recurrence: "recurring",
      recurrenceDay: "10",
      recurrenceFrequency: "yearly",
      recurrenceOccurrences: "5",
      sellerUserId: "seller_1",
      status: "pending",
      type: "expense",
    });
  });

  it("maps recurring entries without an occurrence cap to blank fields", () => {
    const draft = recurringEntryToDraft(
      recurringEntry({ dayOfMonth: null, metadata: { occurrences: null } }),
    );

    expect(draft.recurrenceDay).toBe("");
    expect(draft.recurrenceOccurrences).toBe("");
    expect(draft.notes).toBe("");
  });

  it("filters entries by status, due window, and search query", () => {
    const entries = [
      entry("1", "Aluguel", "Operacional", "pending", "2026-06-25"),
      entry("2", "Seguro", "Veículo", "paid", "2026-06-25"),
      entry("3", "Marketing", "Marketing", "pending", "2026-08-01"),
    ];

    expect(
      filterEntries(entries, {
        ...initialFinanceFilters,
        query: "aluguel",
        status: "pending",
      }).map((item) => item.id),
    ).toEqual(["1"]);
  });

  it("keeps operational cash inputs independent from date filters", () => {
    const entries = [
      entry("overdue", "Aluguel", "Operacional", "pending", "2026-06-01"),
      entry("upcoming", "Seguro", "Operacional", "pending", "2026-06-25"),
    ];

    expect(
      filterOperationalCashEntries(entries, initialFinanceFilters).map(
        (item) => item.id,
      ),
    ).toEqual(["overdue", "upcoming"]);
  });

  it("matches raw backend categories by their localized display label", () => {
    const entries = [
      entry("1", "Revisao Audi A4", "preparation", "paid", "2026-06-25"),
      entry(
        "2",
        "Midia performance estoque",
        "traffic",
        "pending",
        "2026-06-25",
      ),
    ];

    expect(
      filterEntries(entries, {
        ...initialFinanceFilters,
        datePreset: "all",
        query: "preparação",
        status: "all",
      }).map((item) => item.id),
    ).toEqual(["1"]);
    expect(
      filterEntries(entries, {
        ...initialFinanceFilters,
        datePreset: "all",
        query: "tráfego",
        status: "all",
      }).map((item) => item.id),
    ).toEqual(["2"]);
  });

  it("formats vehicle cost categories created by inventory workflows", () => {
    expect(formatFinanceCategory("vehicle_preparation")).toBe("Preparação");
    expect(formatFinanceCategory("vehicle_acquisition")).toBe("Aquisição");
    expect(formatFinanceCategory("vehicle_repair")).toBe("Reparo");
    expect(formatFinanceCategory("vehicle_transport")).toBe("Transporte");
    expect(formatFinanceCategory("vehicle_fee")).toBe("Taxas");
    expect(formatFinanceCategory("vehicle_tax")).toBe("Impostos");
    expect(formatFinanceCategory("vehicle_other")).toBe("Outros");

    expect(formatFinanceCategory("vehicle_maintenance")).toBe("Manutenção");
    expect(formatFinanceCategory("vehicle_inspection")).toBe("Inspeção");
    expect(formatFinanceCategory("vehicle_unknown_custom")).toBe(
      "vehicle_unknown_custom",
    );
  });

  it("matches vehicle cost categories by localized labels and raw unknown values", () => {
    const entries = [
      entry(
        "1",
        "Custo de veiculo - Audi A4",
        "vehicle_preparation",
        "paid",
        "2026-06-25",
      ),
      entry(
        "2",
        "Custo de veiculo - Corolla",
        "vehicle_repair",
        "paid",
        "2026-06-25",
      ),
      entry(
        "3",
        "Custo de veiculo - Compass",
        "vehicle_unknown_custom",
        "paid",
        "2026-06-25",
      ),
    ];

    expect(
      filterEntries(entries, {
        ...initialFinanceFilters,
        datePreset: "all",
        query: "preparação",
        status: "all",
      }).map((item) => item.id),
    ).toEqual(["1"]);
    expect(
      filterEntries(entries, {
        ...initialFinanceFilters,
        datePreset: "all",
        query: "reparo",
        status: "all",
      }).map((item) => item.id),
    ).toEqual(["2"]);
    expect(
      filterEntries(entries, {
        ...initialFinanceFilters,
        datePreset: "all",
        query: "vehicle_unknown_custom",
        status: "all",
      }).map((item) => item.id),
    ).toEqual(["3"]);
  });

  it("keeps undated entries out of date-window filters", () => {
    const entries = [
      entry("dated", "Aluguel", "Operacional", "pending", "2026-06-25"),
      {
        ...entry(
          "undated",
          "Despesa sem vencimento",
          "Outros",
          "pending",
          "2026-06-25",
        ),
        dueAt: null,
      },
    ];

    expect(
      filterEntries(entries, {
        ...initialFinanceFilters,
        query: "",
        status: "all",
      }).map((item) => item.id),
    ).toEqual(["dated"]);
    expect(
      filterEntries(entries, {
        ...initialFinanceFilters,
        datePreset: "all",
        query: "",
        status: "all",
      }).map((item) => item.id),
    ).toEqual(["dated", "undated"]);
  });
});

describe("loadFinanceWorkspace", () => {
  it("loads entries, recurring rules, and commission rules without a summary", async () => {
    const api = createWorkspaceApi();

    const payload = await loadFinanceWorkspace(api);

    expect(api.materializeRecurringEntries).not.toHaveBeenCalled();
    expect(payload).not.toHaveProperty("summary");
    expect(payload.entriesByType.expense.map((item) => item.id)).toEqual([
      "expense_1",
    ]);
    expect(payload.recurringEntries.map((item) => item.id)).toEqual(["rec_1"]);
    expect(payload.commissionRules).toEqual([]);
  });

  it("materializes recurring entries before listing when requested", async () => {
    const api = createWorkspaceApi();

    await loadFinanceWorkspace(api, { materializeRecurring: true });

    expect(api.materializeRecurringEntries).toHaveBeenCalledOnce();
    const materializeOrder =
      api.materializeRecurringEntries.mock.invocationCallOrder[0] ?? 0;
    const listOrder = api.listAllEntries.mock.invocationCallOrder[0] ?? 0;
    expect(materializeOrder).toBeLessThan(listOrder);
  });

  it("ignores auth failures from materialize for read-only viewers", async () => {
    const api = createWorkspaceApi();
    api.materializeRecurringEntries.mockRejectedValueOnce(
      new AppApiError({ message: "forbidden", status: 403 }),
    );

    const payload = await loadFinanceWorkspace(api, {
      materializeRecurring: true,
    });

    expect(payload.recurringEntries).toHaveLength(1);
  });

  it("propagates unexpected materialize failures", async () => {
    const api = createWorkspaceApi();
    api.materializeRecurringEntries.mockRejectedValueOnce(
      new AppApiError({ message: "boom", status: 500 }),
    );

    await expect(
      loadFinanceWorkspace(api, { materializeRecurring: true }),
    ).rejects.toMatchObject({ status: 500 });
    expect(api.listAllEntries).not.toHaveBeenCalled();
  });
});

function createWorkspaceApi() {
  const api = {
    listAllEntries: vi.fn(async (type: FinanceEntry["type"]) => [
      entry(`${type}_1`, "Lançamento", "Operacional", "pending", "2026-06-25"),
    ]),
    listCommissionRules: vi.fn(async () => []),
    listRecurringEntries: vi.fn(async () => [recurringEntry({ id: "rec_1" })]),
    materializeRecurringEntries: vi.fn(async () => ({ generatedEntries: [] })),
  };
  return api as unknown as FinanceApi & {
    [K in keyof typeof api]: (typeof api)[K];
  };
}

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
