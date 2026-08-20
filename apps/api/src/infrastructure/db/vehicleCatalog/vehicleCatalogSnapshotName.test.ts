import { describe, expect, it } from "vitest";
import { vehicleCatalogSnapshotModelName } from "./vehicleCatalogSnapshotName.js";

describe("vehicle catalog snapshot model name", () => {
  it("prefers the original FIPE provider name when available", () => {
    expect(
      vehicleCatalogSnapshotModelName({
        familyName: "Tiggo 7",
        providerName: "Tiggo 7 TXS 1.5 16V Turbo Flex Aut.",
        versionName: "TXS 1.5 16V Turbo Flex Aut.",
      }),
    ).toBe("Tiggo 7 TXS 1.5 16V Turbo Flex Aut.");
  });

  it("rebuilds the full FIPE identity after catalog normalization", () => {
    expect(
      vehicleCatalogSnapshotModelName({
        familyName: "Tiggo 7",
        providerName: null,
        versionName: "TXS 1.5 16V Turbo Flex Aut.",
      }),
    ).toBe("Tiggo 7 TXS 1.5 16V Turbo Flex Aut.");
  });

  it("does not duplicate a family already present in the version name", () => {
    expect(
      vehicleCatalogSnapshotModelName({
        familyName: "BIZ 125+",
        providerName: null,
        versionName: "BIZ 125+",
      }),
    ).toBe("BIZ 125+");
  });
});
