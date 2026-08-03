import { describe, expect, it } from "vitest";
import {
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
