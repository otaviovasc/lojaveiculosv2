import { Hono } from "hono";
import { expect, vi } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import {
  createInventoryFeature,
  type InventoryContextFactory,
  type InventoryListingServices,
} from "./vehicle.controller.js";
import {
  listingDetailResult,
  listingDto,
  unitDto,
} from "./vehicle.controller.testFixtures.js";
import {
  acquisitionResult,
  supplierResult,
} from "./vehicle.acquisition.controller.fixtures.js";

export { listingDetailResult } from "./vehicle.controller.testFixtures.js";

type ApiErrorBody = {
  code: string;
  details?: Record<string, unknown>;
  message: string;
  requestId: string;
};

export type ListingDetailBody = {
  listing?: { id?: string };
  status?: string;
};

export async function expectApiError(
  response: Response,
  expected: Omit<ApiErrorBody, "requestId">,
) {
  const body = (await response.json()) as ApiErrorBody;
  expect(body).toMatchObject(expected);
  expect(body.requestId).toEqual(expect.any(String));
  return body;
}

export function createInventoryTestApp(
  services: InventoryListingServices,
  contextFactory: InventoryContextFactory = createUserContext,
) {
  const app = new Hono();
  app.route(
    "/api/v1/inventory",
    createInventoryFeature({ contextFactory, services }),
  );

  return app;
}

export function createInventoryTestServices(): InventoryListingServices {
  return {
    addVehicleCost: vi.fn(async () => listingDetailResult()),
    analyzeListingResale: vi.fn(async () => listingDetailResult()),
    archiveVehicleSupplier: vi.fn(async () => supplierResult()),
    approveAiStudioImage: vi.fn(async () => listingDetailResult()),
    attachListingUnit: vi.fn(async () => listingDetailResult()),
    attachVehicleDocument: vi.fn(async () => listingDetailResult()),
    changeListingStatus: vi.fn(async () => listingDetailResult()),
    createChecklist: vi.fn(async () => listingDetailResult()),
    createListing: vi.fn(async () => listingDetailResult()),
    deleteListing: vi.fn(async () => undefined),
    createVehicleSupplier: vi.fn(async () => supplierResult()),
    createMedia: vi.fn(async () => ({
      mediaId: "media_1",
      storageKey: "tenants/tenant_1/stores/store_1/units/unit_1/front.jpg",
      status: "created" as const,
      unitId: "unit_1",
      url: "https://cdn.local/front.jpg",
    })),
    deleteMedia: vi.fn(async () => listingDetailResult()),
    getCatalogSnapshot: vi.fn(async () => ({
      brandCode: "21",
      brandName: "Fiat",
      fipeCode: "001267-0",
      fuel: "Flex",
      modelCode: "4828",
      modelName: "Toro Volcano",
      modelYear: 2024,
      priceCents: 12690000,
      referenceMonth: "junho de 2026",
      source: "fipe" as const,
      vehicleType: "cars" as const,
      yearCode: "2024-1",
      yearName: "2024 Gasolina",
    })),
    getCatalogPriceHistory: vi.fn(async () => ({
      brandName: "Fiat",
      entries: [
        {
          priceCents: 12690000,
          priceLabel: "R$ 126.900,00",
          referenceCode: "334",
          referenceMonth: "junho/2026",
        },
      ],
      fipeCode: "001267-0",
      fuel: "Flex",
      modelName: "Toro Volcano",
      modelYear: 2024,
      source: "fipe" as const,
      vehicleType: "cars" as const,
      yearCode: "2024-1",
    })),
    getListing: vi.fn(async () => listingDetailResult()),
    generateAiStudioImage: vi.fn(async () => ({
      beforeUrl: "https://cdn.local/front.jpg",
      credits: 4,
      generatedStorageKey:
        "tenants/tenant_1/stores/store_1/units/unit_1/ai-studio/output.png",
      generatedUrl: "https://cdn.local/output.png",
      guidance: 0.75,
      mediaId: "media_1",
      model: "flux_2_pro" as const,
      providerGenerationId: "hedra_generation_1",
      sourceStorageKey:
        "tenants/tenant_1/stores/store_1/units/unit_1/photo/front.jpg",
      strength: 0.75,
      templateId: "premium_studio" as const,
      unitId: "unit_1",
    })),
    getVehicleUnitAcquisition: vi.fn(async () => acquisitionResult()),
    listChecklists: vi.fn(async () => [
      {
        completedAt: null,
        completedByUserId: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        id: "checklist_1",
        items: [
          {
            id: "item_1",
            label: "Manual",
            notes: null,
            status: "passed" as const,
          },
        ],
        name: "Entrega",
        status: "in_progress" as const,
        storeId: "store_1",
        tenantId: "tenant_1",
        unitId: "unit_1",
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]),
    listCatalogBrands: vi.fn(async () => [{ code: "21", name: "Fiat" }]),
    listCatalogModels: vi.fn(async () => [{ code: "toro", name: "Toro" }]),
    listCatalogVersions: vi.fn(async () => [
      {
        code: "4828",
        modelFamilyCode: "toro",
        modelFamilyName: "Toro",
        name: "Toro Volcano",
      },
    ]),
    listCatalogYears: vi.fn(async () => [
      { code: "2024-1", fuelCode: "1", modelYear: 2024, name: "2024 Gasolina" },
    ]),
    listListings: vi.fn(async () => ({
      hasMore: false,
      items: [
        {
          listing: listingDto(),
          mediaCount: 1,
          primaryPublicMediaUrl: "https://cdn.local/front.jpg",
          primaryMediaUrl: "https://cdn.local/front.jpg",
          publicMediaCount: 1,
          primaryUnit: unitDto(),
          units: [unitDto()],
        },
      ],
      nextOffset: null,
      total: 1,
    })),
    listListingAuditEvents: vi.fn(async () => []),
    listUnits: vi.fn(async () => ({
      hasMore: false,
      items: [
        {
          listing: listingDto(),
          mediaCount: 1,
          primaryMediaUrl: "https://cdn.local/front.jpg",
          primaryUnit: unitDto(),
          unit: unitDto(),
          units: [unitDto()],
        },
      ],
      nextOffset: null,
      total: 1,
    })),
    listVehicleSuppliers: vi.fn(async () => [supplierResult()]),
    publishListing: vi.fn(async () => listingDetailResult()),
    reorderMedia: vi.fn(async () => listingDetailResult()),
    requestDocumentUpload: vi.fn(async () => ({
      expiresAt: new Date("2026-01-01T00:15:00.000Z"),
      publicUrl: "https://cdn.local/document.pdf",
      storageKey: "tenants/tenant_1/stores/store_1/units/unit_1/document.pdf",
      uploadHeaders: { "content-type": "application/pdf" },
      uploadMethod: "PUT" as const,
      uploadUrl: "https://upload.local/document.pdf",
    })),
    requestMediaUpload: vi.fn(async () => ({
      expiresAt: new Date("2026-01-01T00:15:00.000Z"),
      publicUrl: "https://cdn.local/front.jpg",
      storageKey: "tenants/tenant_1/stores/store_1/units/unit_1/front.jpg",
      uploadHeaders: { "content-type": "image/jpeg" },
      uploadMethod: "PUT" as const,
      uploadUrl: "https://upload.local/front.jpg",
    })),
    reserveUnit: vi.fn(async () => listingDetailResult()),
    releaseUnitReservation: vi.fn(async () => listingDetailResult()),
    sellUnit: vi.fn(async () => listingDetailResult()),
    updateListingDescription: vi.fn(async () => listingDetailResult()),
    updateListingDetails: vi.fn(async () => listingDetailResult()),
    updateChecklist: vi.fn(async () => listingDetailResult()),
    updateListingPrice: vi.fn(async () => listingDetailResult()),
    updateListingUnit: vi.fn(async () => listingDetailResult()),
    updateVehicleSupplier: vi.fn(async () => supplierResult()),
    upsertVehicleUnitAcquisition: vi.fn(async () => acquisitionResult()),
    updateMedia: vi.fn(async () => listingDetailResult()),
    unpublishListing: vi.fn(async () => listingDetailResult()),
  };
}

export async function createUserContext() {
  return createServiceContext({
    actor: { id: "user_1", kind: "user" },
    permissions: [
      "inventory.create",
      "inventory.ai_studio_generate",
      "inventory.checklist_read",
      "inventory.checklist_update",
      "inventory.document_attach",
      "inventory.media_delete",
      "inventory.media_update",
      "inventory.read",
      "inventory.update_commercial_tags",
      "inventory.update_description",
      "inventory.update_internal_notes",
      "inventory.update_price",
      "inventory.update_status",
      "inventory.update_unit",
      "inventory.update_video",
    ],
    request: { requestId: "req_1" },
    storeId: "store_1",
    tenantId: "tenant_1",
  });
}
