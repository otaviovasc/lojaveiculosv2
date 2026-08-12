import { describe, expect, it } from "vitest";
import { canonicalizeLicensingLocation } from "./licensingLocation.js";

describe("canonicalizeLicensingLocation", () => {
  it.each([
    {
      city: "sao paulo",
      expectedCity: "São Paulo",
      expectedUf: "SP",
      uf: "sp",
    },
    {
      city: "  sao   jose dos campos  ",
      expectedCity: "São José dos Campos",
      expectedUf: "SP",
      uf: " SP ",
    },
    {
      city: "fortaleza",
      expectedCity: "Fortaleza",
      expectedUf: "CE",
      uf: "ce",
    },
  ])(
    "returns the IBGE spelling for $city/$uf",
    ({ city, expectedCity, expectedUf, uf }) => {
      expect(canonicalizeLicensingLocation(city, uf)).toEqual({
        licensingCity: expectedCity,
        licensingUf: expectedUf,
      });
    },
  );

  it("rejects a city that belongs to a different UF", () => {
    expect(() => canonicalizeLicensingLocation("Campinas", "RJ")).toThrow(
      "Licensing city does not belong to the submitted UF.",
    );
  });

  it("rejects an unknown UF", () => {
    expect(() => canonicalizeLicensingLocation("São Paulo", "XX")).toThrow(
      "Licensing UF is not valid.",
    );
  });
});
