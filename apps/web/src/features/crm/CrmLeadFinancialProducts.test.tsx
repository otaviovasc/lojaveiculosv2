// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CrmLeadFinancialProducts } from "./CrmLeadFinancialProducts";
import type { CreateLeadFinancialProductInput } from "./productCrmTypes";

vi.mock("../sales/saleContextOptions", () => ({
  loadSellerOptions: vi.fn(async () => [
    {
      detail: "Vendedor",
      id: "22222222-2222-4222-8222-222222222222",
      label: "Ana Vendedora",
      role: "salesperson",
    },
  ]),
}));

afterEach(cleanup);

describe("CrmLeadFinancialProducts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("submits V1 insurance inputs with a stable idempotency key", async () => {
    const createFinancialProduct = vi.fn(
      async (_leadId: string, _input: CreateLeadFinancialProductInput) => ({
        activity: {},
        entries: [
          { created: true, entry: {} },
          { created: true, entry: {} },
        ],
      }),
    );
    const user = userEvent.setup();
    render(
      <CrmLeadFinancialProducts
        api={{ createFinancialProduct: createFinancialProduct as never }}
        defaultSellerUserId="22222222-2222-4222-8222-222222222222"
        leadId="11111111-1111-4111-8111-111111111111"
      />,
    );

    await user.type(screen.getByPlaceholderText("0,00"), "5000");
    await user.click(screen.getByRole("button", { name: "Registrar produto" }));

    await waitFor(() => expect(createFinancialProduct).toHaveBeenCalledOnce());
    const [submittedLeadId, submittedProduct] =
      createFinancialProduct.mock.calls[0] ?? [];
    expect(submittedLeadId).toBe("11111111-1111-4111-8111-111111111111");
    expect(submittedProduct).toMatchObject({
      appliedCommissionBasisPoints: 1_000,
      premiumCents: 500_000,
      sellerUserId: "22222222-2222-4222-8222-222222222222",
      type: "insurance",
    });
    expect(typeof submittedProduct?.idempotencyKey).toBe("string");
    expect(
      screen.getByText("Seguro registrado com 2 lançamento(s)."),
    ).toBeVisible();
  });
});
