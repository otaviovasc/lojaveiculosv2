// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FinanceiroNotasFiscaisSection } from "./FinanceiroNotasFiscaisSection";

describe("FinanceiroNotasFiscaisSection", () => {
  it("hands off to the audited fiscal flow without fabricated invoice data", () => {
    render(<FinanceiroNotasFiscaisSection />);

    expect(screen.getByRole("link", { name: "Abrir Fiscal" })).toHaveAttribute(
      "href",
      "#/fiscal",
    );
    expect(
      screen.getByText(/Este detalhe não cria notas ou valores locais/i),
    ).toBeVisible();
    expect(screen.queryByText("R$ 145.000")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /lançar nota fiscal/i }),
    ).not.toBeInTheDocument();
  });
});
