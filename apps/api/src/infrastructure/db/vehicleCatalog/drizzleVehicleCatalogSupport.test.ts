import { describe, expect, it } from "vitest";
import { slugify } from "./drizzleVehicleCatalogSupport.js";

describe("vehicle catalog slugify", () => {
  it("preserves plus as a distinct slug token", () => {
    expect(slugify("Ka")).toBe("ka");
    expect(slugify("Ka+")).toBe("ka-plus");
    expect(slugify("Ka+ Sedan")).toBe("ka-plus-sedan");
  });
});
