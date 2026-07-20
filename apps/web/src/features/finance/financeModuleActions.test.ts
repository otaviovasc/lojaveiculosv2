import { describe, expect, it, vi } from "vitest";
import type { FinanceApi } from "./apiClient";
import { recurringEntryToDraft } from "./financeEntryDraftModel";
import {
  cancelFinanceRecurringEntry,
  submitFinanceDraft,
} from "./financeModuleActions";
import type { FinanceRecurringEntry } from "./types";

describe("submitFinanceDraft", () => {
  it("updates the recurring template when a recurring edit is submitted", async () => {
    const recurring = createRecurringEntry({
      metadata: { generatedCount: 2, notes: "Antiga", occurrences: 5 },
    });
    const api = createActionsApi();
    const refresh = vi.fn();
    const setToast = vi.fn();
    const draft = {
      ...recurringEntryToDraft(recurring),
      name: "Aluguel revisado",
      recurrenceOccurrences: "8",
    };

    await submitFinanceDraft(
      {
        api,
        modalEntry: null,
        modalRecurringEntry: recurring,
        refresh,
        setToast,
      },
      draft,
    );

    expect(api.updateRecurringEntry).toHaveBeenCalledOnce();
    const [id, input] = api.updateRecurringEntry.mock.calls[0] ?? [];
    expect(id).toBe("rec_1");
    expect(input).toMatchObject({
      amountCents: 123450,
      category: "Aluguel",
      dayOfMonth: 10,
      frequency: "monthly",
      name: "Aluguel revisado",
      sellerUserId: null,
    });
    expect(input).not.toHaveProperty("type");
    expect(input).not.toHaveProperty("status");
    expect(input?.metadata).toMatchObject({
      generatedCount: 2,
      notes: "Antiga",
      occurrences: 8,
    });
    expect(api.createEntryFlow).not.toHaveBeenCalled();
    expect(api.createRecurringEntry).not.toHaveBeenCalled();
    expect(setToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Recorrência salva" }),
    );
    expect(refresh).toHaveBeenCalledOnce();
  });
});

describe("cancelFinanceRecurringEntry", () => {
  it("cancels the template and refreshes with a success toast", async () => {
    const recurring = createRecurringEntry();
    const api = createActionsApi();
    const refresh = vi.fn();
    const setToast = vi.fn();

    await cancelFinanceRecurringEntry({ api, refresh, setToast }, recurring);

    expect(api.cancelRecurringEntry).toHaveBeenCalledWith(
      "rec_1",
      "Cancelado pela tela de gastos.",
    );
    expect(setToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Recorrência cancelada" }),
    );
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("surfaces an error toast instead of throwing when the cancel fails", async () => {
    const recurring = createRecurringEntry();
    const api = createActionsApi();
    api.cancelRecurringEntry.mockRejectedValueOnce(new Error("network"));
    const refresh = vi.fn();
    const setToast = vi.fn();

    await cancelFinanceRecurringEntry({ api, refresh, setToast }, recurring);

    expect(setToast).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "error", title: "Erro ao cancelar" }),
    );
    expect(refresh).not.toHaveBeenCalled();
  });
});

function createActionsApi() {
  const api = {
    cancelRecurringEntry: vi.fn(async (_id: string, _reason?: string) =>
      createRecurringEntry(),
    ),
    createEntryFlow: vi.fn(),
    createRecurringEntry: vi.fn(),
    updateRecurringEntry: vi.fn(
      async (_id: string, _input: Record<string, unknown>) =>
        createRecurringEntry(),
    ),
  };
  return api as unknown as FinanceApi & {
    [K in keyof typeof api]: (typeof api)[K];
  };
}

function createRecurringEntry(
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
