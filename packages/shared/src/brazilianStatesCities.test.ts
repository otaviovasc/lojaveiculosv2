import { describe, expect, it } from "vitest";
import {
  BRAZILIAN_STATES,
  getAllStateCodes,
  getAllStateNames,
  getCitiesByStateCode,
  getStateByCode,
  getStateByName,
} from "./brazilianStatesCities.js";

describe("Brazilian states and cities catalog", () => {
  it("exposes the complete IBGE catalog", () => {
    expect(BRAZILIAN_STATES).toHaveLength(27);
    expect(
      BRAZILIAN_STATES.reduce((total, state) => total + state.cities.length, 0),
    ).toBe(5_571);
  });

  it("looks states up by code", () => {
    expect(getStateByCode("SP")).toMatchObject({
      code: "SP",
      name: "São Paulo",
    });
    expect(getStateByCode("XX")).toBeUndefined();
  });

  it("looks states up by case-insensitive name or code", () => {
    expect(getStateByName("são paulo")?.code).toBe("SP");
    expect(getStateByName("sp")?.name).toBe("São Paulo");
    expect(getStateByName("estado inexistente")).toBeUndefined();
  });

  it("returns canonical cities or an empty list for an unknown state", () => {
    expect(getCitiesByStateCode("SP")).toContain("São Paulo");
    expect(getCitiesByStateCode("XX")).toEqual([]);
  });

  it("lists every state code and name", () => {
    expect(getAllStateCodes()).toEqual(
      BRAZILIAN_STATES.map((state) => state.code),
    );
    expect(getAllStateNames()).toEqual(
      BRAZILIAN_STATES.map((state) => state.name),
    );
  });
});
