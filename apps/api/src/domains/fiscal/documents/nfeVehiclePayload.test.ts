import { describe, expect, it } from "vitest";
import { FiscalValidationError } from "../domain/fiscalErrors.js";
import { buildNfeVehicleProviderPayload } from "./nfeVehiclePayload.js";

describe("nfeVehiclePayload", () => {
  it("builds a structured vehicle product payload", () => {
    const payload = buildNfeVehicleProviderPayload({
      buyer: { document: "123.456.789-09", name: "Cliente Teste" },
      fiscal: { cfop: "5102", cst: "00", ncm: "87032310", origin: "0" },
      operation: { type: "new_vehicle_sale" },
      sale: { id: "sale_1", price: 120000 },
      vehicle: {
        brand: "Marca",
        chassis: "9bwtest1234567890",
        condition: "new",
        cylinderCapacity: "1998",
        engineNumber: "ENG-123",
        fuelType: "02",
        grossWeight: "1850.5",
        id: "vehicle_1",
        model: "Modelo",
        modelYear: 2026,
        netWeight: 1520,
        power: "150",
      },
    });

    expect(payload).toMatchObject({
      item: {
        cfop: 5102,
        code: "vehicle_1",
        ncm: "87032310",
        specificProduct: {
          vehicle: {
            chassis: "9BWTEST1234567890",
            cylinderCapacity: "1998",
            engineNumber: "ENG-123",
            grossWeight: 1850.5,
            netWeight: 1520,
            power: "150",
          },
        },
      },
      receiver: { federalTaxNumber: "12345678909" },
    });
  });

  it("requires chassis for new vehicle NF-e", () => {
    expect(() =>
      buildNfeVehicleProviderPayload({
        buyer: { document: "12345678909", name: "Cliente Teste" },
        fiscal: { cfop: "5102", csosn: "102", ncm: "87032310", origin: "0" },
        operation: { type: "new_vehicle_sale" },
        sale: { price: 120000 },
        vehicle: {
          brand: "Marca",
          condition: "new",
          id: "vehicle_1",
          model: "Modelo",
          modelYear: 2026,
        },
      }),
    ).toThrowError(FiscalValidationError);
  });
});
