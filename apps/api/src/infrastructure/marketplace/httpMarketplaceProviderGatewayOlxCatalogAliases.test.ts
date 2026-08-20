import { describe, expect, it } from "vitest";
import {
  cheryCatalogFetch,
  resolveCheryCatalog,
} from "./httpMarketplaceProviderGatewayOlxCatalog.testSupport.js";

describe("OLX catalog aliases", () => {
  it("resolves FIPE brand aliases and abbreviated automatic transmission names", async () => {
    const resolution = await resolveCheryCatalog(cheryCatalogFetch());

    expect(resolution).toEqual({
      providerBrandCode: "161",
      providerModelCode: "8587",
      providerTrimCode: "1",
      providerYearCode: null,
      status: "resolved",
      unresolvedReason: null,
    });
  });
});
