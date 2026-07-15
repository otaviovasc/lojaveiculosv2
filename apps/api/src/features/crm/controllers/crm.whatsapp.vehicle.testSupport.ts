import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type {
  VehicleListing,
  VehicleMedia,
  VehicleUnit,
} from "../../../domains/vehicle/ports/vehicleInventoryRepository.js";
import { testNow } from "../../../domains/vehicle/testSupportVehicleServiceFixtures.js";
import { createInMemoryVehiclePorts } from "../../../domains/vehicle/testSupportVehicleServiceInventoryPorts.js";
import type { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";

export const storeId = "store_1" as StoreId;
export const tenantId = "tenant_1" as TenantId;
export const connectionId = "24000000-0000-4000-8000-000000000101";
export const vehicleListingId = "10000000-0000-4000-8000-000000000001";
export const vehicleUnitId = "11000000-0000-4000-8000-000000000001";

export function createVehicleInventory(
  mediaItems: Array<{ displayOrder: number; id: string; url: string }>,
) {
  const vehiclePorts = createInMemoryVehiclePorts([createVehicleListing()]);
  vehiclePorts.units.set(vehicleUnitId, createVehicleUnit());
  for (const item of mediaItems) {
    vehiclePorts.media.set(item.id, createVehicleMedia(item));
  }
  return vehiclePorts;
}

export function seedSession(
  whatsappRepository: ReturnType<typeof createMemoryCrmWhatsappRepository>,
  suffix: string,
) {
  return whatsappRepository.ingestMessage({
    buyerName: "Ana",
    buyerPhone: "5511999999999",
    channel: "WHATSAPP",
    connectionId,
    content: "Ola",
    direction: "INBOUND",
    externalId: `inbound-vehicle-${suffix}`,
    metadata: {},
    providerTimestamp: new Date("2026-07-02T20:00:00.000Z"),
    senderType: "CUSTOMER",
    status: "DELIVERED",
    storeId,
    tenantId,
    type: "TEXT",
  });
}

export function createZapiConnection(
  overrides: Partial<CrmConnection> = {},
): CrmConnection {
  return {
    credentialsRef: {},
    displayName: "ZAPI Test Connection",
    externalConnectionId: null,
    externalInstanceId: null,
    id: connectionId,
    metadata: {},
    phone: null,
    provider: "zapi",
    status: "sandbox",
    storeId,
    tenantId,
    webhookUrl: null,
    ...overrides,
  };
}

function createVehicleListing(): VehicleListing {
  return {
    catalog: null,
    commercialTags: [],
    createdAt: testNow,
    description: "Sedan preto com revisoes em dia.",
    doors: 4,
    engineAspiration: null,
    engineDisplacement: "2.0",
    fuelType: "gasoline",
    id: vehicleListingId,
    internalNotes: null,
    isVisibleOnPublicSite: true,
    manufactureYear: 2021,
    mileageKm: 32000,
    modelYear: 2022,
    plate: "ABC1D23",
    priceCents: 18990000,
    publicSlug: "audi-a4-prestige-plus-2022",
    resaleAnalysis: null,
    status: "published",
    storeId,
    tenantId,
    title: "Audi A4 Prestige Plus 2022",
    transmission: "automatic",
    trimName: "Prestige Plus",
    unitIds: [vehicleUnitId],
    updatedAt: testNow,
    videoUrl: null,
  };
}

function createVehicleUnit(): VehicleUnit {
  return {
    colorName: "black",
    createdAt: testNow,
    id: vehicleUnitId,
    listingId: vehicleListingId,
    plate: "ABC1D23",
    status: "available",
    stockNumber: "LV-A4-PRETO",
    storeId,
    tenantId,
    updatedAt: testNow,
    vin: null,
  };
}

function createVehicleMedia(input: {
  displayOrder: number;
  id: string;
  url: string;
}): VehicleMedia {
  return {
    altText: null,
    createdAt: testNow,
    displayOrder: input.displayOrder,
    id: input.id,
    isPublic: true,
    kind: "photo",
    storageKey: `seed/${input.id}.jpg`,
    storeId,
    tenantId,
    unitId: vehicleUnitId,
    updatedAt: testNow,
    url: input.url,
  };
}
