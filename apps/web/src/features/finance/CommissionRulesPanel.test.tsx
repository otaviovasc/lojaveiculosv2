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
  commissionRuleValue,
} from "./CommissionRulesPanel";
import type { CommissionRule } from "./types";

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

  it("collapses the onboarding form when persisted rules finish loading", () => {
    const { rerender } = render(
      <CommissionRulesPanel items={[]} onCreate={vi.fn()} />,
    );

    expect(screen.getByLabelText("Nome")).toBeVisible();
    rerender(
      <CommissionRulesPanel items={[commissionRule()]} onCreate={vi.fn()} />,
    );

    expect(screen.queryByLabelText("Nome")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Gerenciar (1)" }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("formats every supported rule type without inventing a percentage", () => {
    expect(commissionRuleValue(commissionRule())).toBe("1,25%");
    expect(
      commissionRuleValue(
        commissionRule({
          fixedAmountCents: 50_000,
          percentageBasisPoints: null,
          type: "fixed_amount",
        }),
      ),
    ).toContain("500,00");
    expect(
      commissionRuleValue(
        commissionRule({
          percentageBasisPoints: null,
          type: "manual",
        }),
      ),
    ).toBe("Manual");
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

function commissionRule(
  overrides: Partial<CommissionRule> = {},
): CommissionRule {
  return {
    category: "Venda",
    fixedAmountCents: null,
    id: "rule-1",
    name: "Comissão padrão",
    percentageBasisPoints: 125,
    sellerUserId: null,
    status: "active",
    type: "percentage",
    ...overrides,
  };
}
