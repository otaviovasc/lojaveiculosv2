import { describe, expect, it } from "vitest";
import { splitVehicleCatalogName } from "./catalogNameNormalization.js";

describe("splitVehicleCatalogName", () => {
  it.each([
    ["500 Cabrio Flex 1.4 8V Mec.", "500", "Cabrio Flex 1.4 8V Mec."],
    ["Tempra SW SLX 2.0 i.e.", "Tempra", "SW SLX 2.0 i.e."],
    [
      "Idea Advent./ Adv.LOCKER 1.8 mpi Flex 5p",
      "Idea",
      "Advent./ Adv.LOCKER 1.8 mpi Flex 5p",
    ],
    ["Escort SW GL 1.6 MPI", "Escort", "SW GL 1.6 MPI"],
    [
      "118iA/ Urban/Sport 1.6 TB 16V 170cv 5p",
      "118iA",
      "Urban/Sport 1.6 TB 16V 170cv 5p",
    ],
    ["Ka+ Sedan 1.5 SEL 16V Flex 4p", "Ka+", "Sedan 1.5 SEL 16V Flex 4p"],
    [
      "Song Pro GS 1.5 16V Aut. (Hibrido)",
      "Song Pro",
      "GS 1.5 16V Aut. (Hibrido)",
    ],
    ["Avant RS2", "RS2", "Avant"],
  ])("splits %s", (providerName, family, version) => {
    expect(splitVehicleCatalogName(providerName)).toEqual({
      modelFamilyName: family,
      versionName: version,
    });
  });
});
