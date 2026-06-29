import { describe, expect, it } from "vitest";
import {
  formatPublicVehicleEngine,
  formatPublicVehicleFuel,
  formatPublicVehicleMileage,
  formatPublicVehiclePrice,
  formatPublicVehicleTransmission,
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

  it("formats public vehicle specs from backend enum values", () => {
    expect(formatPublicVehicleFuel("flex")).toBe("Flex");
    expect(formatPublicVehicleTransmission("automatic")).toBe("Automatico");
    expect(
      formatPublicVehicleEngine({
        aspiration: "aspirated",
        displacement: "1.8",
      }),
    ).toBe("1.8 Aspirado");
    expect(
      formatPublicVehicleEngine({
        aspiration: "turbo",
        displacement: "2.0",
      }),
    ).toBe("2.0 Turbo");
    expect(
      formatPublicVehicleEngine({
        aspiration: "twincharged",
        displacement: "1.4",
      }),
    ).toBe("1.4 Twincharged");
    expect(
      formatPublicVehicleEngine({ aspiration: null, displacement: null }),
    ).toBe("-");
  });
});
