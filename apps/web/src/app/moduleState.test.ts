// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  parseModuleHash,
  parseModuleLocation,
  parseModulePath,
} from "./moduleState";

describe("moduleState routing resolution", () => {
  it("resolves /relatorios and /reports path to reports module", () => {
    expect(parseModulePath("/relatorios")).toBe("reports");
    expect(parseModulePath("/reports")).toBe("reports");
    expect(parseModulePath("/relatorio")).toBe("reports");
  });

  it("resolves #/relatorios and #/reports hash to reports module", () => {
    expect(parseModuleHash("#/relatorios")).toBe("reports");
    expect(parseModuleHash("#/reports")).toBe("reports");
    expect(parseModuleHash("#/relatorio")).toBe("reports");
  });

  it("resolves location with pathname or hash", () => {
    expect(
      parseModuleLocation({
        hash: "#/relatorios",
        pathname: "/dashboard",
      }),
    ).toBe("reports");

    expect(
      parseModuleLocation({
        hash: "",
        pathname: "/relatorios",
      }),
    ).toBe("reports");
  });
});
