// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SaleExtraCommissionCard } from "./SaleExtraCommissionCard";
import type { AutoEntryRuleMutation } from "./types";

afterEach(cleanup);

describe("SaleExtraCommissionCard", () => {
  it("keeps the beneficiary select on its own row, outside the field group", () => {
    const onSave = vi.fn<
      (mutations: readonly AutoEntryRuleMutation[]) => Promise<void>
    >(async () => undefined);
    render(
      <SaleExtraCommissionCard
        canManage
        isSaving={false}
        onDelete={vi.fn()}
        onSave={onSave}
        rules={[]}
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

    const beneficiary = screen.getByRole("button", {
      name: "Beneficiário da comissão extra",
    });
    expect(beneficiary.closest("[class*='md:grid-cols-2']")).toBeNull();

    const name = screen.getByLabelText("Nome da comissão");
    expect(name.closest("[class*='md:grid-cols-2']")).not.toBeNull();
    const amount = screen.getByLabelText("Valor fixo (R$)");
    expect(amount.closest("[class*='md:grid-cols-2']")).not.toBeNull();
  });
});
