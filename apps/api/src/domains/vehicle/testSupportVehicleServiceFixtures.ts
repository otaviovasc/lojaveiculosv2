import { vi } from "vitest";
import type { ServiceContext } from "../../shared/serviceContext.js";
import type { VehicleListing } from "./ports/vehicleInventoryRepository.js";

export const testNow = new Date("2026-01-01T00:00:00.000Z");

export function createContext(permissions: string[]): ServiceContext {
  return {
    actor: { id: "user_1", kind: "user" },
    audit: { record: vi.fn(async () => undefined) },
    logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
    permissions: [...permissions],
    requestId: "req_1",
    storeId: "store_1",
    tenantId: "tenant_1",
  };
}

export function createListing(
  input: Partial<VehicleListing> = {},
): VehicleListing {
  return {
    catalog: null,
    commercialTags: [],
    createdAt: testNow,
    description: null,
    doors: null,
    engineAspiration: null,
    engineDisplacement: null,
    fuelType: null,
    id: "listing_1",
    internalNotes: null,
    isVisibleOnPublicSite: false,
    manufactureYear: null,
    mileageKm: null,
    modelYear: null,
    plate: "ABC1D23",
    priceCents: 9500000,
    publicSlug: null,
    resaleAnalysis: null,
    status: "draft",
    storeId: "store_1",
    tenantId: "tenant_1",
    title: "Vehicle",
    transmission: null,
    trimName: null,
    unitIds: [],
    updatedAt: testNow,
    videoUrl: null,
    ...input,
  };
}
