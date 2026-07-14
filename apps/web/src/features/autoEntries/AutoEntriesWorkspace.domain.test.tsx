// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
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

    expect(await screen.findByText("Bônus fixo")).toBeVisible();
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
});

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
