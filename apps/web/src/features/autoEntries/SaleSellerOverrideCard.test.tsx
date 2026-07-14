// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SaleSellerOverrideCard } from "./SaleSellerOverrideCard";
import type { AutoEntryRuleMutation } from "./types";

afterEach(cleanup);

describe("SaleSellerOverrideCard", () => {
  it("creates seller overrides with the standard commission gate", async () => {
    const onSave = vi.fn<
      (mutations: readonly AutoEntryRuleMutation[]) => Promise<void>
    >(async () => undefined);
    const user = userEvent.setup();
    render(
      <SaleSellerOverrideCard
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

    await user.click(
      screen.getByRole("button", { name: "Vendedor da origem" }),
    );
    await user.click(screen.getByRole("option", { name: "Ana · Vendedor" }));
    await user.type(screen.getByPlaceholderText("Ex.: 1,5"), "1,5");
    await user.click(
      screen.getByRole("button", { name: "Salvar configuração" }),
    );

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(onSave.mock.calls[0]?.[0]?.[0]?.input).toMatchObject({
      conditions: { standardCommissionEnabled: true },
      family: "sale.standard_commission",
    });
  });
});
