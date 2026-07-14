// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InsuranceRulesPanel } from "./InsuranceRulesPanel";
import type { AutoEntryRule, AutoEntryRuleMutation } from "./types";

afterEach(cleanup);

describe("InsuranceRulesPanel", () => {
  it("keeps the V1 applied-rate range informational and saves only the split", async () => {
    const onSave = vi.fn<
      (mutations: readonly AutoEntryRuleMutation[]) => Promise<void>
    >(async () => undefined);
    const user = userEvent.setup();
    render(
      <InsuranceRulesPanel
        canManage
        isSaving={false}
        onDelete={vi.fn()}
        onSave={onSave}
        rules={[insuranceStoreRule(), insuranceSellerRule()]}
        sellers={[]}
      />,
    );

    expect(screen.getAllByText("10%")).toHaveLength(2);
    expect(screen.getByText("20%")).toBeVisible();
    expect(
      screen.queryByLabelText("Comissão mínima (%)"),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Parcela da loja (%)")).toHaveValue("50");
    expect(screen.getByLabelText("Comissão do vendedor (%)")).toHaveValue(
      "0,75",
    );
    expect(screen.getByText("R$ 250,00")).toBeVisible();
    expect(screen.getByText("R$ 37,50")).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "Salvar configuração" }),
    );

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    const mutations = onSave.mock.calls[0]?.[0];
    expect(mutations?.[0]?.ruleId).toBe("insurance_store");
    expect(mutations?.[0]?.input.metadata).toMatchObject({
      policy: {
        appliedCommissionPercentage: { default: 10, max: 20, min: 10 },
        product: "insurance",
        storeSharePpm: 500_000,
      },
    });
    expect(mutations?.[1]?.ruleId).toBe("insurance_seller");
  });
});

function insuranceStoreRule(): AutoEntryRule {
  return rule({
    calculation: {
      basis: "insurance_commission",
      kind: "rate_ppm",
      ratePpm: 500_000,
    },
    family: "insurance.store",
    id: "insurance_store",
    metadata: {
      policy: {
        appliedCommissionPercentage: { default: 2, max: 3, min: 1 },
        product: "insurance",
        storeSharePpm: 500_000,
      },
    },
    name: "Receita da loja no seguro",
    outputType: "revenue",
    recipient: { kind: "none" },
    ruleKey: "insurance.store",
  });
}

function insuranceSellerRule(): AutoEntryRule {
  return rule({
    calculation: { basis: "premium", kind: "rate_ppm", ratePpm: 7_500 },
    family: "insurance.seller",
    id: "insurance_seller",
    name: "Comissão do vendedor no seguro",
    recipient: { kind: "event_seller" },
    resolution: "seller_override",
    ruleKey: "insurance.seller",
  });
}

function rule(overrides: Partial<AutoEntryRule>): AutoEntryRule {
  return {
    calculation: { amountCents: 1, kind: "fixed" },
    category: "Seguro",
    conditions: {},
    createdAt: "2026-07-13T12:00:00.000Z",
    event: "insurance_issued",
    family: null,
    id: "rule",
    metadata: {},
    name: "Regra de seguro",
    outputType: "commission",
    priority: 0,
    recipient: { kind: "none" },
    resolution: "additive",
    ruleKey: null,
    sellerUserId: null,
    status: "active",
    timing: { kind: "same_day" },
    updatedAt: "2026-07-13T12:00:00.000Z",
    ...overrides,
  };
}
