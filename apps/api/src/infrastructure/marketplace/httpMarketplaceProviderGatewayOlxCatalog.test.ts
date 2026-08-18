import { describe, expect, it, vi } from "vitest";
import { previewMarketplaceStockSync } from "../../domains/marketplace/services/MarketplaceService/runMarketplaceStockSync.js";
import { createTestMarketplaceRepository } from "../../domains/marketplace/testSupportMarketplaceRepository.js";
import {
  marketplaceContext,
  readyListing,
} from "../../domains/marketplace/testSupportMarketplaceStockPlan.js";
import { createOlxTestGateway } from "./httpMarketplaceProviderGatewayOlxTestSupport.js";
import {
  jsonResponse,
  tokenSet,
} from "./httpMarketplaceProviderGatewayTestSupport.js";
import {
  ix35Catalog,
  ix35CatalogFetch,
  resolveIx35Catalog,
  seedOlxAccount,
} from "./httpMarketplaceProviderGatewayOlxCatalog.testSupport.js";

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

  it("does not use a near-prefix OLX model name", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        jsonResponse({ data: { HYUNDAI: 28 }, status: "ok" }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ data: { IX3: 236 }, status: "ok" }),
      );

    const resolution = await resolveIx35Catalog(fetch);

    expect(resolution).toMatchObject({
      providerModelCode: null,
      status: "unresolved",
      unresolvedReason: "provider_model_not_found",
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("fails closed when the OLX version catalog has no match", async () => {
    const fetch = ix35CatalogFetch({
      "GLS 2.0 16V 2WD FLEX AUT.": 2,
    });

    const resolution = await resolveIx35Catalog(fetch, {
      ...ix35Catalog(),
      modelName: "ix35 Limited 2.0 16V 2WD Flex Aut.",
    });

    expect(resolution).toMatchObject({
      providerTrimCode: null,
      status: "unresolved",
      unresolvedReason: "provider_version_not_found",
    });
  });

  it.each([
    {
      name: "duplicate normalized version entries",
      versions: {
        "GLS 2.0 16V 2WD FLEX AUT.": 2,
        "GLS-2.0 16V 2WD FLEX AUT.": 3,
      },
    },
    {
      name: "full-name and split-name version entries",
      versions: {
        "ix35 GLS 2.0 16V 2WD Flex Aut.": 1,
        "GLS 2.0 16V 2WD FLEX AUT.": 2,
      },
    },
  ])("fails closed for $name", async ({ versions }) => {
    const resolution = await resolveIx35Catalog(ix35CatalogFetch(versions));

    expect(resolution).toMatchObject({
      providerTrimCode: null,
      status: "unresolved",
      unresolvedReason: "provider_version_not_found",
    });
  });

  it("previews the exact Hyundai ix35 FIPE identity when OLX separates model and version", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        jsonResponse({ user_email: "seller@example.test" }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ data: { HYUNDAI: 28 }, status: "ok" }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ data: { IX35: 237 }, status: "ok" }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            "2.0 16V 170CV 2WD/4WD AUT.": 1,
            "GLS 2.0 16V 2WD FLEX AUT.": 2,
          },
          status: "ok",
        }),
      );
    const repository = createTestMarketplaceRepository();
    await seedOlxAccount(repository);

    const preview = await previewMarketplaceStockSync(
      marketplaceContext(),
      { provider: "olx" },
      {
        gatewayRegistry: {
          getGateway: () => createOlxTestGateway(fetch),
        },
        marketplaceRepository: {
          ...repository,
          findCatalogMapping: async () => null,
          listListingProjections: async () => [
            readyListing({
              catalog: {
                brandCode: "26",
                brandName: "Hyundai",
                fipeCode: "015086-0",
                fuel: "Flex",
                modelCode: "5931",
                modelName: "ix35 GLS 2.0 16V 2WD Flex Aut.",
                modelYear: 2015,
                referenceMonth: "julho de 2026",
                source: "fipe",
                vehicleType: "cars",
                yearCode: "2015-5",
                yearName: "2015 Flex",
              },
              modelYear: 2015,
              title: "Hyundai GLS 2.0 16V Flex Aut. 2015",
            }),
          ],
        },
      },
    );

    expect(preview.plan).toMatchObject({ blocked: 0, publish: 1, total: 1 });
    expect(preview.plan.items[0]?.providerMapping).toEqual({
      providerBrandCode: "28",
      providerModelCode: "237",
      providerTrimCode: "2",
      providerYearCode: null,
    });
  });

  it("blocks provider publish planning when the OLX mapping is unresolved", async () => {
    const fetch = ix35CatalogFetch(
      {
        "GLS 2.0 16V 2WD FLEX AUT.": 2,
        "GLS-2.0 16V 2WD FLEX AUT.": 3,
      },
      true,
    );
    const repository = createTestMarketplaceRepository();
    await seedOlxAccount(repository);

    const preview = await previewMarketplaceStockSync(
      marketplaceContext(),
      { provider: "olx" },
      {
        gatewayRegistry: {
          getGateway: () => createOlxTestGateway(fetch),
        },
        marketplaceRepository: {
          ...repository,
          findCatalogMapping: async () => null,
          listListingProjections: async () => [
            readyListing({ catalog: ix35Catalog() }),
          ],
        },
      },
    );

    expect(preview.plan).toMatchObject({ blocked: 1, publish: 0, total: 1 });
    expect(preview.plan.items[0]).toMatchObject({
      decision: "blocked",
      jobType: null,
      providerMapping: null,
    });
    expect(preview.plan.items[0]?.blockers).toContainEqual(
      expect.objectContaining({ code: "MARKETPLACE_LISTING_MAPPING_REQUIRED" }),
    );
  });
});
