// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PaymentRow, newPayment } from "./SalePaymentRow";

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
});
