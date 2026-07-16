import { describe, expect, it } from "vitest";
import {
  BRAZILIAN_STATES,
  getAllStateCodes,
  getAllStateNames,
  getCitiesByStateCode,
  getStateByCode,
  getStateByName,
} from "./brazilian-states-cities";

describe("Brazilian state and city catalog", () => {
  it("publishes every state and city with unique state codes and names", () => {
    const codes = getAllStateCodes();
    const names = getAllStateNames();
    const cityCount = BRAZILIAN_STATES.reduce(
      (total, state) => total + state.cities.length,
      0,
    );

    expect(BRAZILIAN_STATES).toHaveLength(27);
    expect(codes).toHaveLength(27);
    expect(names).toHaveLength(27);
    expect(new Set(codes).size).toBe(27);
    expect(new Set(names).size).toBe(27);
    expect(codes).toContain("SP");
    expect(names).toContain("São Paulo");
    expect(cityCount).toBe(5_571);
  });

  it("resolves a state by name or case-insensitive code", () => {
    expect(getStateByCode("SP")).toMatchObject({
      code: "SP",
      name: "São Paulo",
    });
    expect(getStateByCode("XX")).toBeUndefined();
    expect(getStateByName("São Paulo")?.code).toBe("SP");
    expect(getStateByName("são paulo")?.code).toBe("SP");
    expect(getStateByName("sp")?.name).toBe("São Paulo");
    expect(getStateByName("unknown")).toBeUndefined();
  });

  it("returns cities for a valid state and an empty list otherwise", () => {
    expect(getCitiesByStateCode("SP")).toContain("São Paulo");
    expect(getCitiesByStateCode("XX")).toEqual([]);
  });
});
