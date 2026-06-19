import { Hono } from "hono";
import { vi } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import {
  createInventoryFeature,
  type InventoryContextFactory,
  type InventoryListingServices,
} from "./vehicle.controller.js";

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
    attachListingUnit: vi.fn(async () => listingDetailResult()),
    attachVehicleDocument: vi.fn(async () => listingDetailResult()),
    changeListingStatus: vi.fn(async () => listingDetailResult()),
    createListing: vi.fn(async () => listingDetailResult()),
    createMedia: vi.fn(async () => ({
      listingId: "listing_1",
      mediaId: "media_1",
      storageKey:
        "tenants/tenant_1/stores/store_1/listings/listing_1/front.jpg",
      status: "created" as const,
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
      referenceMonth: "junho de 2026",
      source: "fipe" as const,
      vehicleType: "cars" as const,
      yearCode: "2024-1",
      yearName: "2024 Gasolina",
    })),
    getListing: vi.fn(async () => listingDetailResult()),
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
      items: [
        {
          listing: listingDto(),
          mediaCount: 1,
          primaryMediaUrl: "https://cdn.local/front.jpg",
          primaryUnit: unitDto(),
        },
      ],
      total: 1,
    })),
    reorderMedia: vi.fn(async () => listingDetailResult()),
    requestDocumentUpload: vi.fn(async () => ({
      expiresAt: new Date("2026-01-01T00:15:00.000Z"),
      publicUrl: "https://cdn.local/document.pdf",
      storageKey:
        "tenants/tenant_1/stores/store_1/listings/listing_1/document.pdf",
      uploadHeaders: { "content-type": "application/pdf" },
      uploadMethod: "PUT" as const,
      uploadUrl: "https://upload.local/document.pdf",
    })),
    requestMediaUpload: vi.fn(async () => ({
      expiresAt: new Date("2026-01-01T00:15:00.000Z"),
      publicUrl: "https://cdn.local/front.jpg",
      storageKey:
        "tenants/tenant_1/stores/store_1/listings/listing_1/front.jpg",
      uploadHeaders: { "content-type": "image/jpeg" },
      uploadMethod: "PUT" as const,
      uploadUrl: "https://upload.local/front.jpg",
    })),
    reserveListing: vi.fn(async () => listingDetailResult()),
    sellListing: vi.fn(async () => listingDetailResult()),
    updateListingDescription: vi.fn(async () => listingDetailResult()),
    updateListingDetails: vi.fn(async () => listingDetailResult()),
    updateListingPrice: vi.fn(async () => listingDetailResult()),
    updateListingUnit: vi.fn(async () => listingDetailResult()),
    updateMedia: vi.fn(async () => listingDetailResult()),
  };
}

export function listingDetailResult() {
  return {
    costs: [],
    documents: [
      {
        createdAt: "2026-01-01T00:00:00.000Z",
        fileName: "document.pdf",
        fileSizeBytes: 4096,
        id: "document_1",
        kind: "vehicle_registration" as const,
        linkRole: "primary",
        metadata: {},
        mimeType: "application/pdf",
        status: "draft" as const,
        storageKey:
          "tenants/tenant_1/stores/store_1/listings/listing_1/document.pdf",
        storeId: "store_1",
        targetId: "listing_1",
        targetType: "vehicle_listing" as const,
        tenantId: "tenant_1",
        title: "Registration",
        updatedAt: "2026-01-01T00:00:00.000Z",
        uploadedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    listing: listingDto(),
    media: [
      {
        altText: "Front photo",
        createdAt: "2026-01-01T00:00:00.000Z",
        displayOrder: 0,
        id: "media_1",
        isPublic: true,
        kind: "photo" as const,
        listingId: "listing_1",
        storageKey:
          "tenants/tenant_1/stores/store_1/listings/listing_1/front.jpg",
        storeId: "store_1",
        tenantId: "tenant_1",
        updatedAt: "2026-01-01T00:00:00.000Z",
        url: "https://cdn.local/front.jpg",
      },
    ],
    priceHistory: [],
    status: "ready" as const,
    statusHistory: [],
    units: [unitDto()],
  };
}

function listingDto() {
  return {
    catalog: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    description: "Clean vehicle",
    id: "listing_1",
    manufactureYear: null,
    modelYear: null,
    plate: "ABC1D23",
    priceCents: 12000000,
    status: "available" as const,
    storeId: "store_1",
    tenantId: "tenant_1",
    title: "Fiat Toro",
    trimName: null,
    unitIds: ["unit_1"],
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function unitDto() {
  return {
    createdAt: "2026-01-01T00:00:00.000Z",
    id: "unit_1",
    listingId: "listing_1",
    plate: "ABC1D23",
    status: "available" as const,
    stockNumber: "stock_1",
    storeId: "store_1",
    tenantId: "tenant_1",
    updatedAt: "2026-01-01T00:00:00.000Z",
    vin: "vin_1",
  };
}

export async function createUserContext() {
  return createServiceContext({
    actor: { id: "user_1", kind: "user" },
    permissions: [
      "inventory.create",
      "inventory.document_attach",
      "inventory.media_delete",
      "inventory.media_update",
      "inventory.read",
      "inventory.update_description",
      "inventory.update_price",
      "inventory.update_status",
      "inventory.update_unit",
    ],
    request: { requestId: "req_1" },
    storeId: "store_1",
    tenantId: "tenant_1",
  });
}
