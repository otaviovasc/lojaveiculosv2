// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DocumentationSellerTiersCard } from "./DocumentationSellerTiersCard";
import type { AutoEntryRule, AutoEntryRuleMutation } from "./types";

afterEach(cleanup);

describe("DocumentationSellerTiersCard", () => {
  it("routes removal of a persisted tier through the deactivation flow", async () => {
    const rule = documentationTierRule();
    const onDelete = vi.fn<(rule: AutoEntryRule) => void>();
    const onSave = vi.fn<
      (mutations: readonly AutoEntryRuleMutation[]) => Promise<void>
    >(async () => undefined);
    const user = userEvent.setup();

    render(
      <DocumentationSellerTiersCard
        canManage
        isSaving={false}
        onDelete={onDelete}
        onSave={onSave}
        rules={[rule]}
        sellers={[
          {
            detail: "Vendedor",
            id: "seller_1",
            label: "Ana",
            role: "salesman",
          },
        ]}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Vendedor da origem" }),
    );
    await user.click(screen.getByRole("option", { name: "Ana · Vendedor" }));
    await waitFor(() =>
      expect(screen.getByLabelText("Mínimo (R$)")).toHaveValue("650"),
    );

    await user.click(screen.getByRole("button", { name: "Remover faixa 1" }));

    expect(onDelete).toHaveBeenCalledOnce();
    expect(onDelete).toHaveBeenCalledWith(rule);
    expect(onSave).not.toHaveBeenCalled();
  });
});

function documentationTierRule(): AutoEntryRule {
  return {
    calculation: { amountCents: 2_500, kind: "fixed" },
    category: "Comissão",
    conditions: {
      basisRange: {
        basis: "documentation",
        maxCents: 74_999,
        minCents: 65_000,
      },
    },
    createdAt: "2026-07-13T12:00:00.000Z",
    event: "transfer_documentation_charged",
    family: "transfer.seller",
    id: "documentation_tier_1",
    metadata: { policy: { product: "transfer" } },
    name: "Comissão do vendedor na documentação",
    outputType: "commission",
    priority: 0,
    recipient: { kind: "event_seller" },
    resolution: "seller_override",
    ruleKey: "transfer.seller.65000",
    sellerUserId: "seller_1",
    status: "active",
    timing: { kind: "same_day" },
    updatedAt: "2026-07-13T12:00:00.000Z",
  };
}
