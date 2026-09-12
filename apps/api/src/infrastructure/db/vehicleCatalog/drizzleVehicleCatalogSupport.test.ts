import { describe, expect, it } from "vitest";
import {
  mapVehicleCatalogSnapshot,
  preserveVehicleBrandLogoUrl,
  slugify,
} from "./drizzleVehicleCatalogSupport.js";

describe("vehicle catalog slugify", () => {
  it("preserves plus as a distinct slug token", () => {
    expect(slugify("Ka")).toBe("ka");
    expect(slugify("Ka+")).toBe("ka-plus");
    expect(slugify("Ka+ Sedan")).toBe("ka-plus-sedan");
  });
});

describe("preserveVehicleBrandLogoUrl", () => {
  it("keeps an existing logo when an import has no replacement", () => {
    expect(
      preserveVehicleBrandLogoUrl(undefined, "https://cdn.example/fiat.svg"),
    ).toBe("https://cdn.example/fiat.svg");
    expect(
      preserveVehicleBrandLogoUrl(null, "https://cdn.example/fiat.svg"),
    ).toBe("https://cdn.example/fiat.svg");
  });

  it("uses a resolved replacement and leaves new unresolved brands empty", () => {
    expect(
      preserveVehicleBrandLogoUrl(
        "https://cdn.example/new-fiat.svg",
        "https://cdn.example/old-fiat.svg",
      ),
    ).toBe("https://cdn.example/new-fiat.svg");
    expect(preserveVehicleBrandLogoUrl(undefined, null)).toBeNull();
  });
});

describe("mapVehicleCatalogSnapshot", () => {
  const input = {
    brand: {
      fipeCode: "59",
      logoUrl: null,
      name: "Volvo",
      vehicleType: "cars" as const,
    },
    modelFamily: { name: "V40", slug: "v40" },
    version: {
      fipeCode: "2344",
      name: "V40 T-4 2.0 Aut./Mec.",
      providerName: null,
    },
    year: {
      fipeCode: "029039-4",
      fipeYearCode: "2013-1",
      fuel: "Gasolina",
      modelYear: 2013,
      name: "2013 Gasolina",
      priceCents: 6552600,
      referenceMonth: "agosto de 2026",
    },
  };

  it("copies exact model-family identity from the version relation", () => {
    expect(mapVehicleCatalogSnapshot(input)).toMatchObject({
      modelCode: "2344",
      modelFamilyCode: "v40",
      modelFamilyName: "V40",
      modelName: "V40 T-4 2.0 Aut./Mec.",
    });
  });

  it("keeps family fields nullable for incomplete historical relations", () => {
    expect(
      mapVehicleCatalogSnapshot({ ...input, modelFamily: null }),
    ).toMatchObject({
      modelFamilyCode: null,
      modelFamilyName: null,
    });
  });

  it("rebuilds the full provider model name from family and version", () => {
    expect(
      mapVehicleCatalogSnapshot({
        ...input,
        modelFamily: { name: "Tiggo 7", slug: "tiggo-7" },
        version: {
          fipeCode: "1234",
          name: "TXS 1.5 16V Turbo Flex Aut.",
          providerName: null,
        },
      }),
    ).toMatchObject({
      modelFamilyCode: "tiggo-7",
      modelFamilyName: "Tiggo 7",
      modelName: "Tiggo 7 TXS 1.5 16V Turbo Flex Aut.",
    });
  });
});
