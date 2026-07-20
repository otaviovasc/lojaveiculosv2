// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AutoEntryRulesApi } from "./apiClient";
import { AutoEntriesWorkspace } from "./AutoEntriesWorkspace";
import type { AutoEntryRule } from "./types";

afterEach(cleanup);

describe("AutoEntriesWorkspace domain rules", () => {
  it("keeps family rules out of custom editing and confirms extra commission deletion", async () => {
    const extraRule = autoEntryRule();
    const api = autoEntryApi(extraRule);
    const user = userEvent.setup();
    render(
      <AutoEntriesWorkspace
        api={api}
        grantedPermissions={["finance.read", "finance.auto_entries.manage"]}
        sellerOptions={[
          {
            detail: "Vendedor",
            id: "seller_1",
            label: "Ana",
            role: "salesman",
          },
        ]}
      />,
    );

    expect(await screen.findAllByText("Bônus fixo")).toHaveLength(2);
    await user.click(screen.getByRole("tab", { name: "Personalizadas" }));
    expect(screen.getByText("Nenhuma regra configurada")).toBeVisible();
    expect(screen.queryByText("Bônus fixo")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Venda" }));
    await user.click(
      screen.getByRole("button", { name: "Excluir comissão extra Bônus fixo" }),
    );
    expect(
      screen.getByRole("heading", { name: "Excluir Bônus fixo?" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Excluir regra" }));
    await waitFor(() =>
      expect(api.deleteRule).toHaveBeenCalledWith("extra_rule"),
    );
    expect(screen.queryByText("Bônus fixo")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Financiamento" }));
    expect(screen.getByText("Matriz da loja")).toBeVisible();
    await user.click(screen.getByRole("tab", { name: "Documentação" }));
    expect(screen.getByText("Custos e receita da loja")).toBeVisible();
    await user.click(screen.getByRole("tab", { name: "Seguro" }));
    expect(
      screen.getByText("Política V1 aplicada pela seguradora"),
    ).toBeVisible();
    await user.click(screen.getByRole("tab", { name: "Consórcio" }));
    expect(screen.getByText("Divisão do consórcio")).toBeVisible();
  });

  it("lists the configured rules of each tab with beneficiary, value and status", async () => {
    const extraRule = autoEntryRule();
    const pausedRule: AutoEntryRule = {
      ...extraRule,
      calculation: { amountCents: 40_000, kind: "fixed" },
      id: "paused_rule",
      name: "Bônus pausado",
      recipient: { kind: "fixed_user", userId: "seller_ghost" },
      status: "inactive",
    };
    const financingRule: AutoEntryRule = {
      ...extraRule,
      calculation: { basis: "financing", kind: "rate_ppm", ratePpm: 5_400 },
      category: "Comissão",
      conditions: { financingRank: "R3" },
      event: "financing_approved",
      family: "financing.seller",
      id: "financing_rule",
      name: "Comissão do vendedor no financiamento R3",
      recipient: { kind: "event_seller" },
      resolution: "seller_override",
      ruleKey: "financing.seller.R3",
      sellerUserId: "seller_1",
    };
    const api = autoEntryApiWith([extraRule, pausedRule, financingRule]);
    const user = userEvent.setup();
    render(
      <AutoEntriesWorkspace
        api={api}
        grantedPermissions={["finance.read", "finance.auto_entries.manage"]}
        sellerOptions={[
          {
            detail: "Vendedor",
            id: "seller_1",
            label: "Ana",
            role: "salesman",
          },
        ]}
      />,
    );

    const saleOverview = within(await overviewSection());
    expect(saleOverview.getByText("Bônus fixo")).toBeVisible();
    expect(saleOverview.getByText("Bônus pausado")).toBeVisible();
    expect(saleOverview.getByText("Ana")).toBeVisible();
    expect(saleOverview.getByText("Vendedor não encontrado")).toBeVisible();
    expect(saleOverview.getByText("R$ 250,00")).toBeVisible();
    expect(saleOverview.getByText("R$ 400,00")).toBeVisible();
    expect(saleOverview.getByText("Ativa")).toBeVisible();
    expect(saleOverview.getByText("Pausada")).toBeVisible();

    await user.click(screen.getByRole("tab", { name: "Financiamento" }));
    const financingOverview = within(await overviewSection());
    expect(
      financingOverview.getByText("Comissão do vendedor no financiamento R3"),
    ).toBeVisible();
    expect(
      financingOverview.getByText("0,54% sobre o valor financiado"),
    ).toBeVisible();
    expect(financingOverview.getAllByText("Vendedor da origem")).toHaveLength(
      2,
    );
    expect(financingOverview.getByText("Ana")).toBeVisible();
    expect(financingOverview.queryByText("Bônus fixo")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Seguro" }));
    expect(
      await screen.findByText(
        "Nenhuma regra desta origem foi configurada ainda.",
      ),
    ).toBeVisible();

    await user.click(screen.getByRole("tab", { name: "Personalizadas" }));
    expect(
      screen.queryByRole("heading", { name: "Visão geral das regras" }),
    ).not.toBeInTheDocument();
  });
});

async function overviewSection() {
  const heading = await screen.findByRole("heading", {
    name: "Visão geral das regras",
  });
  const section = heading.closest("section");
  expect(section).not.toBeNull();
  return section as HTMLElement;
}

function autoEntryApiWith(rules: AutoEntryRule[]): AutoEntryRulesApi {
  const api = autoEntryApi(rules[0] ?? autoEntryRule());
  vi.mocked(api.listRules).mockResolvedValue(rules);
  return api;
}

function autoEntryApi(rule: AutoEntryRule): AutoEntryRulesApi {
  return {
    createRule: vi.fn<AutoEntryRulesApi["createRule"]>(async (input) => ({
      ...rule,
      ...input,
      id: "created",
    })),
    deleteRule: vi.fn<AutoEntryRulesApi["deleteRule"]>(async () => ({
      ...rule,
      status: "inactive" as const,
    })),
    listRules: vi
      .fn<AutoEntryRulesApi["listRules"]>()
      .mockResolvedValue([rule]),
    updateRule: vi.fn<AutoEntryRulesApi["updateRule"]>(async (id, input) => ({
      ...rule,
      ...input,
      id,
    })),
  };
}

function autoEntryRule(): AutoEntryRule {
  return {
    calculation: { amountCents: 25_000, kind: "fixed" },
    category: "Comissão extra",
    conditions: {},
    createdAt: "2026-07-13T12:00:00.000Z",
    event: "vehicle_sale_closed",
    family: "sale.extra_commission",
    id: "extra_rule",
    metadata: {},
    name: "Bônus fixo",
    outputType: "commission",
    priority: 0,
    recipient: { kind: "fixed_user", userId: "seller_1" },
    resolution: "additive",
    ruleKey: null,
    sellerUserId: null,
    status: "active",
    timing: { kind: "same_day" },
    updatedAt: "2026-07-13T12:00:00.000Z",
  };
}
