import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FinanceBillsSummary } from "./FinanceBillsSummary";
import type { FinanceEntry } from "./types";

describe("FinanceBillsSummary", () => {
  it("renders totals from the filtered entries shown by the bills workspace", () => {
    const html = renderToStaticMarkup(
      <FinanceBillsSummary
        entries={[
          entry("1", "Aluguel", "pending", 10000),
          entry("2", "Marketing", "paid", 5000),
        ]}
        onViewAll={() => undefined}
      />,
    );

    const normalized = html.replace(/\u00a0/g, " ");
    expect(normalized).toContain("R$ 150,00");
    expect(normalized).toContain("R$ 50,00");
    expect(normalized).toContain("R$ 100,00");
  });
});

function entry(
  id: string,
  name: string,
  status: FinanceEntry["status"],
  amountCents: number,
): FinanceEntry {
  return {
    amountCents,
    category: "Operacional",
    dueAt: "2026-06-25T15:00:00.000Z",
    id,
    name,
    paidAt: status === "paid" ? "2026-06-25T15:00:00.000Z" : null,
    sellerUserId: null,
    status,
    type: "expense",
  };
}
