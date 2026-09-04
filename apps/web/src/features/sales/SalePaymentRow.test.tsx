// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  localDateInputValue,
  PaymentRow,
  newPayment,
  paymentMethodsForRow,
} from "./SalePaymentRow";

describe("PaymentRow", () => {
  afterEach(cleanup);

  it("shows the date and method-specific installments for credit card", () => {
    const payment = {
      ...newPayment(250000, 0),
      installments: 3,
      method: "credit_card" as const,
    };

    render(
      <PaymentRow
        index={0}
        onChange={vi.fn()}
        onRemove={vi.fn()}
        payment={payment}
      />,
    );

    expect(
      screen.getByRole("button", { name: /^Primeiro vencimento:/ }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Quantidade de parcelas")).toHaveValue(3);
    expect(payment.dueAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("uses local calendar parts without converting through UTC", () => {
    const localDate = {
      getDate: () => 31,
      getFullYear: () => 2026,
      getMonth: () => 11,
    };

    expect(localDateInputValue(localDate)).toBe("2026-12-31");
  });

  it("keeps the trade-in panel as creator while preserving an existing row", () => {
    expect(paymentMethodsForRow("pix")).not.toContain("trade_in");
    expect(paymentMethodsForRow("trade_in")).toContain("trade_in");
  });
});
