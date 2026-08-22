// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FinanceiroCustosSection } from "./FinanceiroCustosSection";
import type { CostItem } from "./FinanceiroCustosSectionModel";

const activeCost: CostItem = {
  account: "Pintura",
  date: "03/02/2026",
  dateIso: "2026-02-03",
  id: "cost_1",
  kind: "repair",
  kindLabel: "Reparo",
  status: "active",
  value: 10000,
};

const voidedCost: CostItem = {
  ...activeCost,
  account: "Guincho duplicado",
  id: "cost_2",
  kind: "transport",
  kindLabel: "Transporte",
  status: "voided",
  value: 5000,
  voidReason: "Nota lançada em duplicidade",
};

afterEach(cleanup);

describe("FinanceiroCustosSection", () => {
  it("keeps voided history visible but excludes it from the active total", () => {
    renderSection();

    expect(screen.getByText("1 ativos")).toBeVisible();
    expect(screen.getByText("1 estornados")).toBeVisible();
    expect(screen.getByText(/Nota lançada em duplicidade/)).toBeVisible();
    const total = screen.getByText("Soma dos custos ativos").parentElement;
    expect(total).not.toBeNull();
    expect(within(total!).getByText("R$ 100,00")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /Corrigir custo Guincho/ }),
    ).not.toBeInTheDocument();
  });

  it("opens fast correction and safe void flows for an active cost", async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(
      screen.getByRole("button", { name: "Corrigir custo Pintura" }),
    );
    expect(screen.getByText("Corrigir custo")).toBeVisible();
    expect(screen.getByDisplayValue("Pintura")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Voltar" }));

    await user.click(
      screen.getByRole("button", { name: "Estornar custo Pintura" }),
    );
    expect(screen.getByText("Estornar custo")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Confirmar estorno" }),
    ).toBeDisabled();
  });

  it("edits the cost date through the shared accessible date picker", async () => {
    const user = userEvent.setup();
    const onUpdateCost = vi.fn(async () => true);
    renderSection({ onUpdateCost });

    await user.click(
      screen.getByRole("button", { name: "Corrigir custo Pintura" }),
    );
    const dateTrigger = screen.getByRole("button", {
      name: "Data do custo:03/02/2026",
    });
    expect(dateTrigger).toHaveAttribute("aria-required", "true");
    expect(dateTrigger).not.toHaveAttribute("aria-invalid");
    expect(document.querySelector('input[type="date"]')).toBeNull();

    await user.click(dateTrigger);
    await user.click(
      screen.getByRole("button", {
        name: "quarta-feira, 4 de fevereiro de 2026",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Salvar correção" }));

    expect(onUpdateCost).toHaveBeenCalledWith(
      "cost_1",
      "Pintura",
      10000,
      "repair",
      "2026-02-04",
    );
  });

  it("renders an explicit read-only state when cost permissions are absent", () => {
    renderSection({ canCreate: false, canUpdate: false, canVoid: false });

    expect(screen.getByRole("button", { name: "Novo custo" })).toBeDisabled();
    expect(screen.getByText("Somente leitura")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /Corrigir custo/ }),
    ).not.toBeInTheDocument();
  });
});

function renderSection(
  overrides: Partial<React.ComponentProps<typeof FinanceiroCustosSection>> = {},
) {
  render(
    <FinanceiroCustosSection
      costs={[activeCost, voidedCost]}
      formatBRL={(cents) =>
        new Intl.NumberFormat("pt-BR", {
          currency: "BRL",
          style: "currency",
        }).format(cents / 100)
      }
      onAddCost={vi.fn(async () => true)}
      onUpdateCost={vi.fn(async () => true)}
      onVoidCost={vi.fn(async () => true)}
      {...overrides}
    />,
  );
}
