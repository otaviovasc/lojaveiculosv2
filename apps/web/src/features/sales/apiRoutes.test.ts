import { describe, expect, it } from "vitest";
import { salesRoutes } from "./apiRoutes";

describe("salesRoutes", () => {
  it("uses the default API base without double-prefixing", () => {
    expect(salesRoutes.list(undefined, { status: "all" })).toBe(
      "/api/v1/sales?status=all",
    );
  });

  it("honors an explicit API base without appending another prefix", () => {
    expect(salesRoutes.drafts("/api/v1")).toBe("/api/v1/sales/drafts");
  });

  it("builds the dedicated sale reversal endpoint", () => {
    expect(salesRoutes.revert("sale 1", "/api/v1")).toBe(
      "/api/v1/sales/sale 1/revert",
    );
  });
});
