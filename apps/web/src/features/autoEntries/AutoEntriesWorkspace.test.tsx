// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AutoEntryRulesApi } from "./apiClient";
import { AutoEntriesWorkspace } from "./AutoEntriesWorkspace";
import type { AutoEntryRule } from "./types";

const loadSellerOptions = vi.hoisted(() => vi.fn());

vi.mock("../sales/saleContextOptions", async (importOriginal) => ({
  ...(await importOriginal()),
  loadSellerOptions,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AutoEntriesWorkspace", () => {
  it("shows the returned standard commission without inventing a numeric default", async () => {
    const rule = standardCommissionRule();
    const api = autoEntryApi([rule]);

    render(
      <AutoEntriesWorkspace
        api={api}
        grantedPermissions={["finance.read", "finance.auto_entries.manage"]}
        sellerOptions={[]}
      />,
    );

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Lançamentos automáticos",
      }),
    ).toBeVisible();
    expect(screen.getByText("Receita da venda preservada")).toBeVisible();
    expect(screen.getByText("Comissão padrão da venda")).toBeVisible();
    expect(
      screen.getByText("100% sobre a comissão informada na venda"),
    ).toBeVisible();
    expect(screen.getByText("Exceção por vendedor")).toBeVisible();
  });

  it("keeps a paused rule visible and an archived rule absent after refresh", async () => {
    const activeRule = autoEntryRule();
    const pausedRule = { ...activeRule, status: "inactive" as const };
    const api = autoEntryApi([activeRule]);
    vi.mocked(api.listRules)
      .mockResolvedValueOnce([activeRule])
      .mockResolvedValueOnce([pausedRule])
      .mockResolvedValue([]);
    vi.mocked(api.updateRule).mockResolvedValue(pausedRule);
    const user = userEvent.setup();

    render(
      <AutoEntriesWorkspace
        api={api}
        grantedPermissions={["finance.read", "finance.auto_entries.manage"]}
        sellerOptions={[]}
      />,
    );

    await user.click(
      await screen.findByRole("tab", { name: "Personalizadas" }),
    );

    await user.click(
      await screen.findByRole("switch", {
        name: "Ativar regra Comissão padrão",
      }),
    );
    expect(await screen.findByText("Pausada", { exact: true })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Atualizar regras" }));
    expect(await screen.findByText("Pausada", { exact: true })).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "Excluir regra Comissão padrão" }),
    );
    await user.click(screen.getByRole("button", { name: "Excluir regra" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Comissão padrão" }),
      ).not.toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: "Atualizar regras" }));
    expect(await screen.findByText("Nenhuma regra configurada")).toBeVisible();
  });

  it("renders an explicit read-only state from effective permissions", async () => {
    const api = autoEntryApi([autoEntryRule()]);
    const user = userEvent.setup();

    render(
      <AutoEntriesWorkspace api={api} grantedPermissions={["finance.read"]} />,
    );

    expect(await screen.findByText("Somente leitura")).toBeVisible();
    await user.click(screen.getByRole("tab", { name: "Personalizadas" }));
    expect(
      screen.queryByRole("button", { name: "Nova regra" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: "Ativar regra Comissão padrão" }),
    ).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Editar regra Comissão padrão" }),
    ).not.toBeInTheDocument();
    expect(loadSellerOptions).not.toHaveBeenCalled();
  });

  it("protects a dirty create dialog before discarding changes", async () => {
    const user = userEvent.setup();
    render(
      <AutoEntriesWorkspace
        api={autoEntryApi([])}
        grantedPermissions={["finance.read", "finance.auto_entries.manage"]}
        sellerOptions={[]}
      />,
    );

    await user.click(
      await screen.findByRole("tab", { name: "Personalizadas" }),
    );

    const createButtons = await screen.findAllByRole("button", {
      name: /Nova regra|Criar primeira regra/,
    });
    await user.click(createButtons[0]!);
    await user.type(screen.getByLabelText("Nome da regra"), "Nova comissão");
    await user.click(screen.getByRole("button", { name: "Fechar" }));

    expect(
      screen.getByRole("heading", { name: "Descartar alterações?" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("dialog")).toHaveLength(2);
  });
});

function autoEntryApi(rules: AutoEntryRule[]): AutoEntryRulesApi {
  return {
    createRule: vi.fn<AutoEntryRulesApi["createRule"]>(async (input) => ({
      ...autoEntryRule(),
      ...input,
      id: "created_rule",
    })),
    deleteRule: vi.fn<AutoEntryRulesApi["deleteRule"]>(async () => ({
      ...autoEntryRule(),
      status: "inactive" as const,
    })),
    listRules: vi.fn<AutoEntryRulesApi["listRules"]>().mockResolvedValue(rules),
    updateRule: vi.fn<AutoEntryRulesApi["updateRule"]>(async (id, input) => ({
      ...autoEntryRule(),
      ...input,
      id,
    })),
  };
}

function autoEntryRule(): AutoEntryRule {
  return {
    calculation: { amountCents: 50000, kind: "fixed" },
    category: "Comissão de venda",
    createdAt: "2026-07-13T12:00:00.000Z",
    event: "vehicle_sale_closed",
    id: "rule_1",
    metadata: {},
    name: "Comissão padrão",
    outputType: "commission",
    priority: 80,
    sellerUserId: null,
    status: "active",
    timing: { kind: "same_day" },
    updatedAt: "2026-07-13T12:00:00.000Z",
  };
}

function standardCommissionRule(): AutoEntryRule {
  return {
    ...autoEntryRule(),
    calculation: {
      basis: "commission",
      basisPoints: 10_000,
      kind: "percentage",
    },
    conditions: {
      basisRange: { basis: "commission", minCents: 1 },
      standardCommissionEnabled: true,
    },
    family: "sale.standard_commission",
    name: "Comissão padrão da venda",
    recipient: { kind: "event_seller" },
    resolution: "seller_override",
    ruleKey: "sale.standard_commission",
  };
}
