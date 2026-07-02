import { describe, expect, it, vi } from "vitest";
import {
  createServiceContext,
  type ServiceContext,
} from "../../../shared/serviceContext.js";
import { createCrmServices } from "../../crm/controllers/crmServices.js";
import { createMemoryCrmRepository } from "../../crm/adapters/memory/crmRepository.js";
import { createInventoryTestServices } from "../../inventory/controllers/vehicle.controller.testSupport.js";
import {
  listingDto,
  unitDto,
} from "../../inventory/controllers/vehicle.controller.testFixtures.js";
import { createExternalApiFeature } from "./externalApi.controller.js";

describe("external API runtime routes", () => {
  it("serves AI-native manifest and tool discovery without tenant data", async () => {
    const app = createExternalApiFeature();

    const [manifestResponse, toolsResponse] = await Promise.all([
      app.request("https://api.local/manifest"),
      app.request("https://api.local/ai-tools"),
    ]);

    expect(manifestResponse.status).toBe(200);
    expect(toolsResponse.status).toBe(200);
    const manifest = await readJson<ManifestJson>(manifestResponse);
    const tools = await readJson<ToolsJson>(toolsResponse);
    expect(manifest.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "/api/v1/external-api/vehicles" }),
        expect.objectContaining({ path: "/api/v1/external-api/leads" }),
      ]),
    );
    expect(manifest.aiNative).toMatchObject({
      docs: "https://api.local/api/v1/external-api/docs",
      llmsTxt: "https://api.local/api/v1/external-api/llms.txt",
      openApi: "https://api.local/api/v1/external-api/openapi.json",
    });
    expect(tools.tools.at(0)?.function.name).toBe("search_vehicles");
    expect(JSON.stringify(manifest)).not.toContain("tenant_");
  });

  it("lists clean public vehicle DTOs behind integration auth", async () => {
    const inventory = createInventoryTestServices();
    vi.mocked(inventory.listListings).mockResolvedValueOnce({
      hasMore: false,
      items: [
        {
          listing: {
            ...listingDto(),
            catalog: {
              brandCode: "21",
              brandName: "Fiat",
              fipeCode: "001267-0",
              fuel: "Flex",
              modelCode: "4828",
              modelName: "Toro",
              modelYear: 2024,
              priceCents: 12690000,
              referenceMonth: "junho de 2026",
              source: "fipe",
              vehicleType: "cars",
              yearCode: "2024-1",
              yearName: "2024 Gasolina",
            },
            fuelType: "flex",
            modelYear: 2024,
            priceCents: 12690000,
          },
          mediaCount: 2,
          primaryPublicMediaUrl: "https://cdn.local/public-front.jpg",
          primaryMediaUrl: "https://cdn.local/private-front.jpg",
          publicMediaCount: 1,
          primaryUnit: { ...unitDto(), colorName: "white" },
          units: [{ ...unitDto(), colorName: "white" }],
        },
      ],
      nextOffset: null,
      total: 1,
    });
    const app = createExternalApiFeature({
      contextFactory: async () => integrationContext(["inventory.read"]),
      runtimeServices: { inventory },
    });

    const response = await app.request(
      "/vehicles/search?q=toro&available=true&minPrice=100000&color=white",
      { headers: { "x-api-key": "lv2_test_secret" } },
    );

    expect(response.status).toBe(200);
    const firstListCall = vi.mocked(inventory.listListings).mock.calls[0];
    expect(firstListCall?.[0].actor.kind).toBe("integration");
    expect(firstListCall?.[1]).toMatchObject({
      search: "toro",
      status: "published",
    });
    const json = await readJson<VehicleListJson>(response);
    const firstVehicle = json.data[0]!;
    expect(firstVehicle).toMatchObject({
      catalog: { brand: { name: "Fiat" }, model: { name: "Toro" } },
      colors: [{ name: "white", quantity: 1 }],
      id: "listing_1",
      priceCents: 12690000,
    });
    expect(firstVehicle.media).toEqual({
      count: 1,
      primaryImageUrl: "https://cdn.local/public-front.jpg",
    });
    expect(JSON.stringify(firstVehicle)).not.toContain("tenant_1");
    expect(JSON.stringify(firstVehicle)).not.toContain("ABC1D23");
    expect(JSON.stringify(firstVehicle)).not.toContain("private-front.jpg");
  });

  it("returns vehicle detail without VIN or full plate fields", async () => {
    const inventory = createInventoryTestServices();
    const app = createExternalApiFeature({
      contextFactory: async () => integrationContext(["inventory.read"]),
      runtimeServices: { inventory },
    });

    const response = await app.request("/vehicles/listing_1", {
      headers: { "x-api-key": "lv2_test_secret" },
    });

    expect(response.status).toBe(200);
    const json = await readJson<VehicleDetailJson>(response);
    expect(json.data.media[0]).toMatchObject({
      kind: "photo",
      url: "https://cdn.local/front.jpg",
    });
    expect(json.data.units[0]).not.toHaveProperty("vin");
    expect(json.data.units[0]).not.toHaveProperty("plate");
    expect(inventory.getListing).toHaveBeenCalledWith(expect.anything(), {
      listingId: "listing_1",
    });
  });

  it("creates leads with V1-compatible field aliases", async () => {
    const crmRepository = createMemoryCrmRepository();
    const crm = createCrmServices({ ports: { crmRepository } });
    const app = createExternalApiFeature({
      contextFactory: async () => integrationContext(["lead.create"]),
      runtimeServices: { crm },
    });

    const response = await app.request("/leads", {
      body: JSON.stringify({
        email: "ana@example.com",
        message: "Quero simular financiamento",
        name: "Ana Compradora",
        phone: "+55 11 99999-0000",
        vehicleId: "listing_1",
      }),
      headers: {
        "content-type": "application/json",
        "idempotency-key": "lead_1",
        "x-api-key": "lv2_test_secret",
      },
      method: "POST",
    });

    expect(response.status).toBe(201);
    const json = await readJson<LeadDetailJson>(response);
    expect(json.data).toMatchObject({
      buyer: {
        email: "ana@example.com",
        name: "Ana Compradora",
        phone: "+55 11 99999-0000",
      },
      listingId: "listing_1",
      metadata: { message: "Quero simular financiamento" },
      source: "external_api",
    });
  });

  it("rejects runtime data routes without integration context", async () => {
    const app = createExternalApiFeature({
      contextFactory: async () => userContext(),
    });

    const response = await app.request("/vehicles", {
      headers: { "x-clerk-user-id": "user_1" },
    });

    expect(response.status).toBe(401);
    const body = await readJson<Record<string, unknown>>(response);
    expect(body).toMatchObject({
      code: "HTTP_AUTHENTICATION_REQUIRED",
      message: "External API runtime routes require a scoped API key.",
    });
    expect(typeof body.requestId).toBe("string");
  });
});

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

function userContext(): ServiceContext {
  return createServiceContext({
    actor: { id: "user_1", kind: "user" },
    permissions: ["inventory.read"],
    request: { requestId: "req_user" },
    storeId: "store_1",
    tenantId: "tenant_1",
  });
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as unknown as T;
}

type ManifestJson = {
  aiNative: Record<string, string>;
  operations: Array<{ path: string }>;
};

type ToolsJson = {
  tools: Array<{ function: { name: string } }>;
};

type VehicleListJson = {
  data: Array<Record<string, unknown>>;
};

type VehicleDetailJson = {
  data: {
    media: Array<Record<string, unknown>>;
    units: Array<Record<string, unknown>>;
  };
};

type LeadDetailJson = {
  data: Record<string, unknown>;
};
