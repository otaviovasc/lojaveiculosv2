import { describe, expect, it } from "vitest";
import {
  formatPublicVehicleMileage,
  formatPublicVehiclePrice,
  splitVehicleTitle,
} from "./publicVehicleFormatters";

describe("public vehicle formatters", () => {
  it("splits the leading vehicle brand from the display title", () => {
    expect(splitVehicleTitle("Audi A4 Prestige Plus")).toEqual({
      brand: "Audi",
      restTitle: "A4 Prestige Plus",
    });
    expect(splitVehicleTitle("Compass")).toEqual({
      brand: "Compass",
      restTitle: "",
    });
  });

  it("formats public price and mileage fallbacks consistently", () => {
    expect(formatPublicVehiclePrice(18990000).replace(/\s/g, " ")).toBe(
      "R$ 189.900",
    );
    expect(formatPublicVehiclePrice(null)).toBe("Sob consulta");
    expect(formatPublicVehicleMileage(32000)).toBe("32.000 km");
    expect(formatPublicVehicleMileage(null)).toBe("-");
  });
});
