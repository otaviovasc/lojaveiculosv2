import { describe, expect, it } from "vitest";
import {
  coerceVehicleColor,
  getVehicleColorLabel,
  getVehicleColorSwatch,
  isVehicleColor,
  normalizeVehicleColor,
  vehicleColorOptions,
  vehicleColorValues,
} from "./vehicleColors.js";
import {
  getVehicleEngineAspirationLabel,
  normalizeVehicleEngineAspiration,
  normalizeVehicleEngineDisplacement,
} from "./vehicleTechnicalSpecs.js";

describe("vehicle colors", () => {
  it("keeps values and options as a one-to-one contract", () => {
    expect(vehicleColorOptions.map(({ value }) => value)).toEqual(
      vehicleColorValues,
    );
    expect(new Set(vehicleColorValues).size).toBe(vehicleColorValues.length);
  });

  it.each([
    ["Branca", "white"],
    ["AZUL MARINHO", "navy"],
    ["pérola", "pearl"],
    ["cinzento", "gray"],
  ] as const)("normalizes %s to %s", (input, expected) => {
    expect(normalizeVehicleColor(input)).toBe(expected);
    expect(isVehicleColor(expected)).toBe(true);
  });

  it("distinguishes blank, unknown, and known color values", () => {
    expect(coerceVehicleColor("  ")).toBeNull();
    expect(coerceVehicleColor("custom metallic")).toBe("other");
    expect(getVehicleColorLabel(" Branca ")).toBe("Branco");
    expect(getVehicleColorLabel("custom metallic")).toBe("custom metallic");
    expect(getVehicleColorSwatch("preta")).toBe("#1a1a1a");
    expect(getVehicleColorSwatch("unknown")).toBeNull();
  });
});

describe("vehicle technical normalization", () => {
  it.each([
    ["1.0 turbo", "1.0"],
    ["1998 cc", "2.0"],
    [1598, "1.6"],
    ["3,5L", "3.5"],
    ["outro", "other"],
  ] as const)("normalizes displacement %s to %s", (input, expected) => {
    expect(normalizeVehicleEngineDisplacement(input)).toBe(expected);
  });

  it.each([null, "", "electric", "0", "9.9"])(
    "rejects unsupported displacement %s",
    (input) => {
      expect(normalizeVehicleEngineDisplacement(input)).toBeNull();
    },
  );

  it.each([
    ["aspirado", "aspirated"],
    ["turbo", "turbo"],
    ["compressor mecânico", "supercharged"],
    ["turbo + supercharger", "twincharged"],
  ] as const)("normalizes aspiration %s to %s", (input, expected) => {
    expect(normalizeVehicleEngineAspiration(input)).toBe(expected);
  });

  it("returns a known label while preserving unknown text", () => {
    expect(getVehicleEngineAspirationLabel("Turbo")).toBe("Turbo");
    expect(getVehicleEngineAspirationLabel(" elétrica ")).toBe("elétrica");
  });
});
