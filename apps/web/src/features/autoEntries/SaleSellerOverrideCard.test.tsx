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
      timing: { kind: "same_day" },
    });
  });

  it("allows changing the timing tab in Momento do lançamento", async () => {
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
    await user.type(screen.getByPlaceholderText("Ex.: 1,5"), "2,0");

    // Click "Dias depois" tab in Momento do lançamento
    await user.click(screen.getByRole("button", { name: "Dias depois" }));
    expect(screen.getByLabelText("Quantidade de dias")).toBeVisible();
    await user.type(screen.getByLabelText("Quantidade de dias"), "10");

    await user.click(
      screen.getByRole("button", { name: "Salvar configuração" }),
    );

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(onSave.mock.calls[0]?.[0]?.[0]?.input).toMatchObject({
      timing: { days: 10, kind: "days_after" },
    });
  });

  it.each([
    {
      expectedTiming: { day: 15, kind: "day_of_month" },
      mode: "Dia do mês",
      picker: "Escolher dia do mês",
    },
    {
      expectedTiming: { day: 22, kind: "next_month_day" },
      mode: "Próx. mês",
      picker: "Escolher dia do próximo mês",
    },
  ] as const)(
    "lets the user choose a day for $mode",
    async ({ expectedTiming, mode, picker }) => {
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
      await user.type(screen.getByPlaceholderText("Ex.: 1,5"), "2,0");
      await user.click(
        within(
          screen.getByRole("group", { name: "Momento do lançamento" }),
        ).getByRole("button", { name: mode }),
      );
      await user.click(screen.getByRole("button", { name: picker }));
      await user.click(
        screen.getByRole("option", { name: String(expectedTiming.day) }),
      );
      await user.click(
        screen.getByRole("button", { name: "Salvar configuração" }),
      );

      await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
      expect(onSave.mock.calls[0]?.[0]?.[0]?.input).toMatchObject({
        timing: expectedTiming,
      });
    },
  );
});
