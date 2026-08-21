// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SaleServicesPaymentsSection } from "./SaleServicesPaymentsSection";
import type { SaleRecord } from "./types";

afterEach(cleanup);

describe("SaleServicesPaymentsSection", () => {
  it("shows overpayment as a blocking warning instead of paid success", () => {
    render(
      <SaleServicesPaymentsSection
        sale={
          {
            payments: [
              {
                amountCents: 110_000,
                dueAt: "2026-08-21",
                extraCents: 0,
                id: "payment_1",
                installments: null,
                metadata: {},
                method: "pix",
                paidAt: null,
                principalCents: 110_000,
                providerPaymentId: null,
                status: "pending",
              },
            ],
            salePriceCents: 100_000,
            saleSourceSnapshot: {},
            status: "draft",
          } as unknown as SaleRecord
        }
        update={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Excede o preço em R$ 100,00",
    );
    expect(screen.queryByText("Valor Total Coberto")).not.toBeInTheDocument();
    expect(screen.getByText("Total lançado: 1 lançamento")).toBeInTheDocument();
  });
});
