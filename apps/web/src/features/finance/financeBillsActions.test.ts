import { describe, expect, it, vi } from "vitest";
import type { FinanceApi } from "./apiClient";
import {
  buildFinanceCsv,
  mergeEntryMetadata,
  updateEntryFromDraft,
} from "./financeBillsActions";
import { createEntryDraft } from "./financeBillsModel";
import type { FinanceEntry } from "./types";

describe("finance bills actions", () => {
  it("preserves existing integration metadata when editing notes", () => {
    expect(
      mergeEntryMetadata(
        {
          integrationId: "mkp-1",
          source: "marketplace",
          vehicleUnitId: "unit-1",
        },
        { notes: "Despesa revisada", source: "finance_bills_slice" },
      ),
    ).toEqual({
      integrationId: "mkp-1",
      notes: "Despesa revisada",
      source: "marketplace",
      vehicleUnitId: "unit-1",
    });
  });

  it("exports localized commission context without leaking internal ids", () => {
    const entry: FinanceEntry = {
      amountCents: 219750,
      category: "sales_commission",
      dueAt: "2026-07-16T12:00:00.000Z",
      id: "entry_1",
      metadata: { saleId: "sale_internal_123" },
      name: '=HYPERLINK("https://example.invalid")',
      paidAt: null,
      sellerUserId: "99999999-aaaa-bbbb-cccc-dddddddddddd",
      status: "pending",
      type: "commission",
    };

    const csv = buildFinanceCsv([entry]);

    expect(csv).toContain(
      '"tipo";"nome";"categoria";"status";"vencimento";"valor_reais";"vendedor";"referencia"',
    );
    expect(csv).toContain('"Comissão"');
    expect(csv).toContain('"Comissão de venda"');
    expect(csv).toContain('"2197,50"');
    expect(csv).toContain('"Vendedor não identificado"');
    expect(csv).toContain('"Venda vinculada"');
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).not.toContain("sale_internal_123");
    expect(csv).not.toContain("99999999");
    expect(csv).not.toContain("219750");
  });

  it("replaces the vehicle association while preserving unrelated links", async () => {
    const entry: FinanceEntry = {
      amountCents: 85_000,
      category: "Manutenção",
      dueAt: "2026-08-22T12:00:00.000Z",
      id: "entry_1",
      links: [
        { entryId: "entry_1", targetId: "sale_1", targetType: "sale" },
        {
          entryId: "entry_1",
          targetId: "unit_old",
          targetType: "vehicle_unit",
        },
      ],
      name: "Revisão",
      paidAt: null,
      sellerUserId: null,
      status: "pending",
      type: "expense",
    };
    const updateEntry = vi.fn(async () => ({ entry, links: [] }));
    const api = { updateEntry } as unknown as FinanceApi;

    await updateEntryFromDraft(api, entry, {
      ...createEntryDraft("expense"),
      amount: "850",
      category: "Manutenção",
      name: "Revisão",
      vehicleUnitId: "unit_new",
    });

    expect(updateEntry).toHaveBeenCalledWith(
      "entry_1",
      expect.objectContaining({
        links: [
          { targetId: "sale_1", targetType: "sale" },
          { targetId: "unit_new", targetType: "vehicle_unit" },
        ],
      }),
    );
  });
});
