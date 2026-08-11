import { describe, expect, it } from "vitest";
import {
  getCredereReasonGuidance,
  groupRepeatedRefusals,
  simulationStatusLabel,
} from "./simulationPresentation";
import type { CredereSimulationCondition } from "./types";

describe("Credere simulation presentation", () => {
  it("groups repeated bank refusals without losing affected terms", () => {
    const grouped = groupRepeatedRefusals([
      condition({ installments: 48 }),
      condition({ installments: 24 }),
      condition({ installments: 48 }),
    ]);

    expect(grouped).toHaveLength(1);
    expect(grouped[0]).toMatchObject({
      affectedInstallments: [24, 48],
      occurrences: 3,
    });
  });

  it("explains the provider reasons that need operator action or patience", () => {
    expect(
      getCredereReasonGuidance("Pré-análise em andamento para este CPF"),
    ).toMatchObject({ title: "Pré-análise já em andamento" });
    expect(
      getCredereReasonGuidance("Código Molicar inválido para o ano"),
    ).toMatchObject({ title: "Veículo não validado na base Molicar" });
  });

  it("does not expose unknown provider enums as product copy", () => {
    expect(simulationStatusLabel("provider_new_state")).toBe(
      "Status informado pelo provedor",
    );
  });
});

function condition(
  overrides: Partial<CredereSimulationCondition>,
): CredereSimulationCondition {
  return {
    bankCode: "655",
    bankName: "Banco BV",
    installments: 36,
    reason: "Pré-análise em andamento",
    status: "rejected",
    summary: null,
    totalAmountCents: null,
    ...overrides,
  };
}
