import { describe, expect, it } from "vitest";
import {
  conditionResultRenderKey,
  getCredereReasonGuidance,
  groupRepeatedRefusals,
  simulationSnapshotsEqual,
  simulationStatusLabel,
} from "./simulationPresentation";
import type { CredereSimulation, CredereSimulationCondition } from "./types";

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

  it("builds semantic render keys that survive condition reordering", () => {
    const bv24 = condition({ installments: 24, totalAmountCents: 72_000_00 });
    const bv48 = condition({ installments: 48, totalAmountCents: 81_000_00 });

    expect(conditionResultRenderKey([bv24, bv48], 0)).toBe(
      conditionResultRenderKey([bv48, bv24], 1),
    );
    expect(conditionResultRenderKey([bv24, bv48], 1)).toBe(
      conditionResultRenderKey([bv48, bv24], 0),
    );
  });

  it("disambiguates genuinely duplicated condition keys by occurrence", () => {
    const duplicate = condition({ installments: 48 });
    const conditions = [duplicate, { ...duplicate }];

    expect(conditionResultRenderKey(conditions, 0)).not.toBe(
      conditionResultRenderKey(conditions, 1),
    );
  });

  it("recognizes unchanged polling snapshots without hiding real changes", () => {
    const previous = simulation({
      conditions: [condition({ installments: 48 })],
    });

    expect(simulationSnapshotsEqual(previous, structuredClone(previous))).toBe(
      true,
    );
    expect(
      simulationSnapshotsEqual(previous, simulation({ status: "completed" })),
    ).toBe(false);
    expect(simulationSnapshotsEqual(null, previous)).toBe(false);
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

function simulation(overrides: Partial<CredereSimulation>): CredereSimulation {
  return {
    conditions: [],
    createdAt: "2026-08-11T12:00:00.000Z",
    id: "simulation_1",
    providerRequestId: null,
    reason: null,
    status: "processing",
    success: null,
    ...overrides,
  };
}
