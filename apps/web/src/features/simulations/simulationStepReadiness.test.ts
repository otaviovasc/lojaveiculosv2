import { describe, expect, it } from "vitest";
import {
  formatSimulationCurrency,
  simulationFinancedAmount,
  simulationStepReadiness,
  type SimulationStepSnapshot,
} from "./simulationStepReadiness";

const readySnapshot: SimulationStepSnapshot = {
  additionalFieldsReady: true,
  bankCount: 1,
  consent: true,
  cpfCnpj: "529.982.247-25",
  credereVehicleModelId: "credere_model_1",
  downPayment: 10_000,
  fipeCode: "005340-6",
  licensingCity: "São Paulo",
  licensingUf: "SP",
  manufactureYear: "2022",
  modelYear: "2023",
  molicarCode: "01906108-0",
  name: "Ana Souza",
  phone: "(11) 98765-4321",
  preflightReady: true,
  unsupportedFieldCount: 0,
  vehicleValue: 50_000,
};

describe("simulationStepReadiness", () => {
  it("requires confirmed years before leaving the vehicle step", () => {
    const result = simulationStepReadiness("vehicle", {
      ...readySnapshot,
      modelYear: "",
    });
    expect(result).toEqual({
      ready: false,
      reason: "Selecione o veículo e confirme os anos.",
    });
  });

  it("requires a confirmed FIPE/Molicar version on the vehicle step", () => {
    const result = simulationStepReadiness("vehicle", {
      ...readySnapshot,
      credereVehicleModelId: "",
      molicarCode: "",
    });
    expect(result).toEqual({
      ready: false,
      reason: "Confirme a versão FIPE/Molicar antes de continuar.",
    });
  });

  it("requires licensing UF and city on the vehicle step", () => {
    const result = simulationStepReadiness("vehicle", {
      ...readySnapshot,
      licensingCity: "",
    });
    expect(result).toEqual({
      ready: false,
      reason: "Informe a UF e a cidade de licenciamento do veículo.",
    });
  });

  it("accepts a complete vehicle step", () => {
    expect(simulationStepReadiness("vehicle", readySnapshot)).toEqual({
      ready: true,
    });
  });

  it("requires name and phone on the applicant step", () => {
    const result = simulationStepReadiness("applicant", {
      ...readySnapshot,
      phone: "",
    });
    expect(result).toEqual({
      ready: false,
      reason: "Informe nome e telefone do proponente.",
    });
  });

  it("rejects an invalid CPF before the preflight check", () => {
    const result = simulationStepReadiness("applicant", {
      ...readySnapshot,
      cpfCnpj: "529.982.247-24",
    });
    expect(result).toEqual({
      ready: false,
      reason: "Informe um CPF/CNPJ válido.",
    });
  });

  it("requires the Credere preflight before leaving the applicant step", () => {
    const result = simulationStepReadiness("applicant", {
      ...readySnapshot,
      preflightReady: false,
    });
    expect(result).toEqual({
      ready: false,
      reason: "Confira o cadastro do proponente no Credere.",
    });
  });

  it("blocks unsupported provider fields before review", () => {
    expect(
      simulationStepReadiness("applicant", {
        ...readySnapshot,
        unsupportedFieldCount: 1,
      }),
    ).toMatchObject({ ready: false });
  });

  it("requires bank selection and consent on review", () => {
    expect(
      simulationStepReadiness("review", {
        ...readySnapshot,
        consent: false,
      }),
    ).toEqual({
      ready: false,
      reason: "Registre o consentimento do proponente antes de simular.",
    });
  });

  it("rejects a down payment that is missing or not below the vehicle value", () => {
    expect(
      simulationStepReadiness("terms", { ...readySnapshot, downPayment: null }),
    ).toEqual({
      ready: false,
      reason: "Informe uma entrada válida e menor que o veículo.",
    });
    expect(
      simulationStepReadiness("terms", {
        ...readySnapshot,
        downPayment: 50_000,
      }),
    ).toEqual({
      ready: false,
      reason: "Informe uma entrada válida e menor que o veículo.",
    });
  });

  it("never blocks the review step", () => {
    expect(
      simulationStepReadiness("review", {
        ...readySnapshot,
        downPayment: null,
      }),
    ).toEqual({ ready: true });
  });
});

describe("simulationFinancedAmount", () => {
  it("computes vehicle value minus down payment when valid", () => {
    expect(simulationFinancedAmount(50_000, 10_000)).toBe(40_000);
  });

  it("returns null when the down payment is missing or invalid", () => {
    expect(simulationFinancedAmount(50_000, null)).toBeNull();
    expect(simulationFinancedAmount(null, 10_000)).toBeNull();
    expect(simulationFinancedAmount(50_000, 50_000)).toBeNull();
    expect(simulationFinancedAmount(50_000, 0)).toBeNull();
  });
});

describe("formatSimulationCurrency", () => {
  it("formats values as BRL and keeps null pending", () => {
    expect(formatSimulationCurrency(40_000)).toBe("R$ 40.000,00");
    expect(formatSimulationCurrency(null)).toBeNull();
  });
});
