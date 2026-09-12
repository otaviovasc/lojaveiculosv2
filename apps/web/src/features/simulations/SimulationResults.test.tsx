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

  it("keeps partial offers non-terminal while the provider is processing", () => {
    renderResult({
      conditions: [acceptedCondition("Banco A", 48, 320_000)],
      status: "submitted",
      success: null,
    });

    expect(screen.getByText("Processando Simulação")).toBeVisible();
    expect(screen.getByText(/retornos parciais/i)).toBeVisible();
    expect(screen.queryByText("Simulação Finalizada")).toBeNull();
    expect(screen.queryByText(/concluída com sucesso/i)).toBeNull();
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

  it("ranks official offers by the lowest returned installment", () => {
    renderResult({
      conditions: [
        acceptedCondition("Banco A", 48, 320_000),
        acceptedCondition("Banco B", 36, 245_000),
      ],
      status: "completed",
      success: true,
    });

    const offers = screen.getAllByRole("listitem");
    expect(offers[0]).toHaveTextContent("Banco B");
    expect(offers[0]).toHaveTextContent("R$ 2.450,00");
    expect(screen.getByText("Melhor parcela")).toBeVisible();
    expect(screen.queryByText(/aprovação final concedida/i)).toBeNull();
  });

  it("keeps a single returned offer untagged and still shows the hero stat", () => {
    renderResult({
      conditions: [acceptedCondition("Banco Único", 36, 245_000)],
      status: "completed",
      success: true,
    });

    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.queryByText("Melhor parcela")).toBeNull();
    expect(screen.getByText("Menor parcela retornada")).toBeVisible();
    expect(screen.getAllByText("R$ 2.450,00").length).toBeGreaterThan(0);
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
        leadId: null,
        leadName: null,
        listingId: null,
        providerRequestId: null,
        reason: null,
        status: "completed",
        success: true,
        unitId: null,
        vehicleTitle: null,
        ...overrides,
      }}
    />,
  );
}

function condition(installments: number, bankName = "Banco BV") {
  return {
    bankCode: bankName === "Banco BV" ? "655" : "623",
    bankName,
    downPaymentCents: null,
    firstInstallmentCents: null,
    installments,
    preApprovalStatus: null,
    reason: "Pré-análise em andamento",
    reasonIdentifier: null,
    status: "rejected",
    summary: null,
    totalAmountCents: null,
  };
}

function acceptedCondition(
  bankName: string,
  installments: number,
  firstInstallmentCents: number,
) {
  return {
    ...condition(installments, bankName),
    firstInstallmentCents,
    reason: null,
    status: "available",
    totalAmountCents: 7_000_000,
  };
}
