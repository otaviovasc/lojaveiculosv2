import { describe, expect, it, vi } from "vitest";
import {
  createServiceContext,
  type ServiceContext,
} from "../../../shared/serviceContext.js";
import { createInventoryTestServices } from "../../inventory/controllers/vehicle.controller.testSupport.js";
import {
  listingDto,
  unitDto,
} from "../../inventory/controllers/vehicle.controller.testFixtures.js";
import { createExternalApiFeature } from "./externalApi.controller.js";

describe("external API vehicle search runtime", () => {
  it("loads every inventory page before applying local filters", async () => {
    const inventory = createInventoryTestServices();
    vi.mocked(inventory.listListings)
      .mockResolvedValueOnce({
        hasMore: true,
        items: [summary("listing_1", "unit_1", "red", 9000000)],
        nextOffset: 100,
        total: 100,
      })
      .mockResolvedValueOnce({
        hasMore: false,
        items: [summary("listing_101", "unit_101", "blue", 15000000)],
        nextOffset: null,
        total: 101,
      });
    const app = createExternalApiFeature({
      contextFactory: async () => integrationContext(["inventory.read"]),
      runtimeServices: { inventory },
    });

    const response = await app.request(
      "/vehicles?color=blue&limit=10&sort=price_desc",
      { headers: { "x-api-key": "lv2_test_secret" } },
    );

    expect(response.status).toBe(200);
    const calls = vi.mocked(inventory.listListings).mock.calls;
    expect(calls[0]?.[1]).toMatchObject({ limit: 100, offset: 0 });
    expect(calls[1]?.[1]).toMatchObject({ limit: 100, offset: 100 });
    const json = await readJson<VehicleListJson>(response);
    expect(json.data).toHaveLength(1);
    expect(json.data[0]).toMatchObject({
      colors: [{ name: "blue", quantity: 1 }],
      id: "listing_101",
      priceCents: 15000000,
    });
    expect(json.pagination.hasMore).toBe(false);
  });
});

function summary(
  listingId: string,
  unitId: string,
  colorName: "blue" | "red",
  priceCents: number,
) {
  return {
    listing: {
      ...listingDto(),
      id: listingId,
      priceCents,
      title: `Fiat Toro ${colorName}`,
    },
    mediaCount: 1,
    primaryPublicMediaUrl: `https://cdn.local/${colorName}.jpg`,
    primaryMediaUrl: `https://cdn.local/${colorName}.jpg`,
    publicMediaCount: 1,
    primaryUnit: { ...unitDto(), colorName, id: unitId, listingId },
    units: [{ ...unitDto(), colorName, id: unitId, listingId }],
  };
}

function integrationContext(permissions: string[]): ServiceContext {
  return {
    ...createServiceContext({
      actor: { id: "api_client_1", kind: "integration" },
      permissions,
      request: { requestId: "req_api" },
      storeId: "store_1",
      tenantId: "tenant_1",
    }),
    entitlements: ["crm", "external_api"],
  } as ServiceContext;
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as unknown as T;
}

type VehicleListJson = {
  data: Array<Record<string, unknown>>;
  pagination: { hasMore: boolean };
};
