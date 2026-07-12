// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CommissionRulesPanel,
  FinanceRecurringPanel,
} from "./FinanceCorePanels";

describe("FinanceRecurringPanel", () => {
  afterEach(() => cleanup());

  it("does not submit a recurrence without the required next date", () => {
    const onCreate = vi.fn();
    const { container } = render(
      <FinanceRecurringPanel items={[]} onCreate={onCreate} />,
    );

    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    expect(onCreate).not.toHaveBeenCalled();
  });
});

describe("CommissionRulesPanel", () => {
  afterEach(() => cleanup());

  it("rejects percentages outside the valid business range", async () => {
    const onCreate = vi.fn();
    const { container } = render(
      <CommissionRulesPanel items={[]} onCreate={onCreate} />,
    );
    fillRuleForm(container, "101");

    fireEvent.submit(container.querySelector("form")!);

    expect(onCreate).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Informe um percentual entre 0,01% e 100%.",
    );
  });

  it("shows a localized error when rule creation fails", async () => {
    const onCreate = vi.fn().mockRejectedValue(new Error("network"));
    const { container } = render(
      <CommissionRulesPanel items={[]} onCreate={onCreate} />,
    );
    fillRuleForm(container, "1.5");

    fireEvent.submit(container.querySelector("form")!);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível criar a regra de comissão.",
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Criar regra" })).toBeEnabled(),
    );
  });
});

function fillRuleForm(container: HTMLElement, percentage: string) {
  fireEvent.change(container.querySelector('input[name="name"]')!, {
    target: { value: "Comissão padrão" },
  });
  fireEvent.change(container.querySelector('input[name="category"]')!, {
    target: { value: "Venda" },
  });
  fireEvent.change(container.querySelector('input[name="percent"]')!, {
    target: { value: percentage },
  });
}
