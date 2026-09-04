import { describe, expect, it, vi } from "vitest";
import {
  createServiceContext,
  type ServiceContext,
} from "../../../shared/serviceContext.js";
import { createInventoryTestServices } from "../../inventory/controllers/vehicle.controller.testSupport.js";
import {
  listingDetailResult,
  listingDto,
  unitDto,
} from "../../inventory/controllers/vehicle.controller.testFixtures.js";
import { createExternalApiFeature } from "./externalApi.controller.js";
import { publicStorefrontRepository } from "./externalApiRuntime.publicStorefront.testSupport.js";

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
      runtimeServices: {
        inventory,
        publicStorefront: publicStorefrontRepository({
          listing_1: 9_000_000,
          listing_101: 15_000_000,
        }),
      },
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

  it("honors the public hidden-price projection", async () => {
    const inventory = createInventoryTestServices();
    const app = createExternalApiFeature({
      contextFactory: async () => integrationContext(["inventory.read"]),
      runtimeServices: {
        inventory,
        publicStorefront: publicStorefrontRepository({ listing_1: null }),
      },
    });

    const response = await app.request("/vehicles/listing_1", {
      headers: { "x-api-key": "lv2_test_secret" },
    });

    expect(response.status).toBe(200);
    const json = await readJson<{ data: Record<string, unknown> }>(response);
    expect(json.data.priceCents).toBeNull();
    expect(json.data.priceHistory).toEqual([]);
    expect(JSON.stringify(json.data)).not.toContain("12000000");
  });

  it("redacts internal unit identifiers and operational history reasons", async () => {
    const inventory = createInventoryTestServices();
    const detail = listingDetailResult();
    vi.mocked(inventory.getListing).mockResolvedValueOnce({
      ...detail,
      priceHistory: [priceHistoryEntry()],
      statusHistory: [statusHistoryEntry()],
      units: [
        detail.units[0]!,
        {
          ...detail.units[0]!,
          colorName: "black",
          id: "unit_sold_internal",
          status: "sold",
          stockNumber: "stock_private",
        },
      ],
    });
    const app = createExternalApiFeature({
      contextFactory: async () => integrationContext(["inventory.read"]),
      runtimeServices: {
        inventory,
        publicStorefront: publicStorefrontRepository(),
      },
    });

    const response = await app.request("/vehicles/listing_1", {
      headers: { "x-api-key": "lv2_test_secret" },
    });

    const json = await readJson<{ data: Record<string, unknown> }>(response);
    const serialized = JSON.stringify(json.data);
    expect(response.status).toBe(200);
    expect(serialized).not.toContain("Margem interna");
    expect(serialized).not.toContain("Aprovado pelo gestor");
    expect(serialized).not.toContain("unit_sold_internal");
    expect(serialized).not.toContain("stock_private");
    expect(serialized).not.toContain('"stockNumber"');
  });
});

function priceHistoryEntry() {
  return {
    actorUserId: "user_internal",
    changedAt: "2026-01-02T00:00:00.000Z",
    createdAt: "2026-01-02T00:00:00.000Z",
    id: "price_history_internal",
    listingId: "listing_1",
    newPriceCents: 12_000_000,
    oldPriceCents: 12_500_000,
    reason: "Margem interna negociada",
    storeId: "store_1",
    tenantId: "tenant_1",
    updatedAt: "2026-01-02T00:00:00.000Z",
  };
}

function statusHistoryEntry() {
  return {
    actorUserId: "user_internal",
    changedAt: "2026-01-02T00:00:00.000Z",
    createdAt: "2026-01-02T00:00:00.000Z",
    fromStatus: "draft",
    id: "status_history_internal",
    listingId: "listing_1",
    reason: "Aprovado pelo gestor interno",
    storeId: "store_1",
    target: "listing" as const,
    tenantId: "tenant_1",
    toStatus: "published",
    unitId: null,
    updatedAt: "2026-01-02T00:00:00.000Z",
  };
}

function summary(
  listingId: string,
  unitId: string,
  colorName: "blue" | "red",
  priceCents: number,
) {
  return {
    leadsCount: 0,
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
