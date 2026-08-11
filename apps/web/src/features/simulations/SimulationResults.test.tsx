// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SimulationResults } from "./SimulationResults";
import type { CredereSimulation } from "./types";

describe("SimulationResults", () => {
  afterEach(cleanup);

  it("shows an explicit indeterminate outcome and invalid Molicar guidance", () => {
    renderResult({
      reason: "Código Molicar inválido para o ano informado",
      status: "completed",
      success: null,
    });

    expect(screen.getByText("Resultado indeterminado")).toBeVisible();
    expect(
      screen.getByText("Veículo não validado na base Molicar"),
    ).toBeVisible();
    expect(screen.queryByText(/aprovado com sucesso/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Atualizar status" }),
    ).toBeVisible();
  });

  it("offers a safe reconciliation action for an indeterminate provider result", () => {
    const onRefresh = vi.fn();
    renderResult(
      {
        providerRequestId: "internal-provider-id",
        status: "indeterminate",
        success: null,
      },
      undefined,
      onRefresh,
    );

    expect(screen.getAllByText("Resultado indeterminado")).toHaveLength(2);
    screen.getByRole("button", { name: "Atualizar status" }).click();
    expect(onRefresh).toHaveBeenCalledOnce();
    expect(screen.queryByText("internal-provider-id")).not.toBeInTheDocument();
  });

  it("surfaces polling exhaustion without claiming approval or refusal", () => {
    renderResult(
      { status: "processing", success: null },
      { isPolling: false, pollExhausted: true },
    );

    expect(screen.getByText("Atualização automática pausada")).toBeVisible();
    expect(
      screen.getByText(/não significa aprovação nem recusa/i),
    ).toBeVisible();
  });

  it("surfaces a degraded polling failure and keeps manual reconciliation", () => {
    renderResult(
      { status: "processing", success: null },
      {
        isPolling: false,
        pollError: "Não foi possível consultar a atualização automática.",
        pollExhausted: false,
      },
    );

    expect(
      screen.getByText("Atualização automática interrompida"),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Atualizar status" }),
    ).toBeVisible();
  });

  it("renders grouped refusals with all affected installment terms", () => {
    renderResult({
      conditions: [condition(24), condition(36), condition(48, "Outro banco")],
      status: "completed",
      success: false,
    });

    expect(
      screen.getByText("Ocorrências dos bancos (2 motivos)"),
    ).toBeVisible();
    expect(screen.getByText("24x, 36x")).toBeInTheDocument();
    expect(
      screen.getByText("Mesmo motivo em 2 condições."),
    ).toBeInTheDocument();
  });
});

function renderResult(
  overrides: Partial<CredereSimulation>,
  state: {
    isPolling: boolean;
    pollError?: string;
    pollExhausted: boolean;
  } = {
    isPolling: false,
    pollExhausted: false,
  },
  onRefresh = vi.fn(),
) {
  return render(
    <SimulationResults
      isPolling={state.isPolling}
      isRefreshing={false}
      onRefresh={onRefresh}
      pollError={state.pollError ?? null}
      pollExhausted={state.pollExhausted}
      simulation={{
        conditions: [],
        createdAt: "2026-08-11T12:00:00.000Z",
        id: "simulation_1",
        providerRequestId: null,
        reason: null,
        status: "completed",
        success: true,
        ...overrides,
      }}
    />,
  );
}

function condition(installments: number, bankName = "Banco BV") {
  return {
    bankCode: bankName === "Banco BV" ? "655" : "623",
    bankName,
    installments,
    reason: "Pré-análise em andamento",
    status: "rejected",
    summary: null,
    totalAmountCents: null,
  };
}
