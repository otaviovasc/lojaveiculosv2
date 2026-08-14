import { describe, expect, it, vi } from "vitest";
import { createOlxTestGateway } from "./httpMarketplaceProviderGatewayOlxTestSupport.js";
import {
  jsonResponse,
  tokenSet,
} from "./httpMarketplaceProviderGatewayTestSupport.js";

describe("OLX catalog resolver", () => {
  it("resolves an exact FIPE Volvo against the current OLX catalog", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        jsonResponse({ data: { BMW: 7, VOLVO: 59 }, status: "ok" }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ data: { S40: 10, V40: 11 }, status: "ok" }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            "V40 T-4 2.0 AUT./MEC.": 27,
            "V40 T5 R-DESIGN 2.0 AUT.": 28,
          },
          status: "ok",
        }),
      );

    const resolution = await createOlxTestGateway(
      fetch,
    ).resolveCatalogMapping?.({
      catalog: {
        brandCode: "59",
        brandName: "Volvo",
        fipeCode: "029039-4",
        fuel: "Gasolina",
        modelCode: "2344",
        modelName: "V40 T-4 2.0 Aut./Mec.",
        modelYear: 2013,
        referenceMonth: "agosto de 2026",
        source: "fipe",
        vehicleType: "cars",
        yearCode: "2013-1",
        yearName: "2013 Gasolina",
      },
      token: tokenSet(),
    });

    expect(resolution).toEqual({
      providerBrandCode: "59",
      providerModelCode: "11",
      providerTrimCode: "27",
      providerYearCode: null,
      status: "resolved",
      unresolvedReason: null,
    });
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      "https://apps.olx.test/autoupload/car_info",
      "https://apps.olx.test/autoupload/car_info/59",
      "https://apps.olx.test/autoupload/car_info/59/11",
    ]);
  });
});
