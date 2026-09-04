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
    ["XC 40 T-4 2.0 190cv FWD", "XC 40", "T-4 2.0 190cv FWD"],
    [
      "XC 60 T-8 R-DESIGN 2.0 AWD (Híbrido)",
      "XC 60",
      "T-8 R-DESIGN 2.0 AWD (Híbrido)",
    ],
    [
      "XC 90 D-5 MOMENTUM 2.0 235cv Diesel 5p",
      "XC 90",
      "D-5 MOMENTUM 2.0 235cv Diesel 5p",
    ],
    ["XC 40 Pure (Elétrico)", "XC 40", "Pure (Elétrico)"],
    ["iX 1 eDrive20 X-Line", "iX 1", "eDrive20 X-Line"],
    ["SF 90 STRADALE 4.0 V8", "SF 90", "STRADALE 4.0 V8"],
    ["Ora 03 GT (Elétrico)", "Ora 03", "GT (Elétrico)"],
    ["R 1250 GS Adventure Premium", "R 1250", "GS Adventure Premium"],
    ["F 850 GS Premium", "F 850", "GS Premium"],
    ["R 1200 Nine T", "R 1200", "Nine T"],
    ["S 1000 RR-M Carbon", "S 1000", "RR-M Carbon"],
    ["CG 160 TITAN 25 Anos Flex", "CG 160", "TITAN 25 Anos Flex"],
    ["CG 125 CARGO ESD", "CG 125", "CARGO ESD"],
    ["CBR 1000 RR Fireblade", "CBR 1000", "RR Fireblade"],
    ["XRE 190/ Flex", "XRE 190", "Flex"],
    ["BIZ 125+", "BIZ 125+", "BIZ 125+"],
    ["XT 660 R", "XT 660", "R"],
    ["LS 460 4.6 32V 347cv", "LS 460", "4.6 32V 347cv"],
    [
      "Ram 2500 LARAMIE 6.7 TDI CD 4x4 Dies",
      "Ram 2500",
      "LARAMIE 6.7 TDI CD 4x4 Dies",
    ],
    ["Wey 07 1.5 Turbo AWD", "Wey 07", "1.5 Turbo AWD"],
  ])("splits %s", (providerName, family, version) => {
    expect(splitVehicleCatalogName(providerName)).toEqual({
      modelFamilyName: family,
      versionName: version,
    });
  });
});
