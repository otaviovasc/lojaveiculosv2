import { describe, expect, it } from "vitest";
import { buildFinanceCsv, mergeEntryMetadata } from "./financeBillsActions";
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
});
