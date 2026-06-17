import {
  attachVehicleUnit,
  type AttachVehicleUnitInput,
} from "../../../domains/vehicle/services/VehicleService/attachVehicleUnit.js";
import { changeVehicleStatus } from "../../../domains/vehicle/services/VehicleService/changeVehicleStatus.js";
import {
  createVehicleListing,
  type CreateVehicleListingInput,
} from "../../../domains/vehicle/services/VehicleService/createVehicleListing.js";
import { getVehicleListing } from "../../../domains/vehicle/services/VehicleService/getVehicleListing.js";
import { updateVehicleDescription } from "../../../domains/vehicle/services/VehicleService/updateVehicleDescription.js";
import { updateVehiclePrice } from "../../../domains/vehicle/services/VehicleService/updateVehiclePrice.js";
import type { VehicleListingStatus } from "../../../domains/vehicle/ports/vehicleInventoryRepository.js";
import type { VehicleInventoryServicePorts } from "../../../domains/vehicle/services/VehicleService/serviceSupport.js";
import {
  createDrizzleVehicleInventoryRepositories,
  type DrizzleVehicleInventoryClient,
} from "../../../infrastructure/db/vehicleInventory/drizzleVehicleInventoryRepository.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import { createMemoryVehicleInventoryPorts } from "./memoryVehicleInventoryPorts.js";

export const listingStatuses = [
  "available",
  "draft",
  "inactive",
  "reserved",
  "sold",
] as const;

export type ListingScaffoldResult = {
  listingId: string;
  status: "not_implemented";
};

export type InventoryListingServices = {
  attachListingUnit: (
    context: ServiceContext,
    input: {
      listingId: string;
      plate?: string | null | undefined;
      stockNumber?: string | null | undefined;
      vin?: string | null | undefined;
    },
  ) => Promise<ListingScaffoldResult>;
  changeListingStatus: (
    context: ServiceContext,
    input: { listingId: string; status: VehicleListingStatus },
  ) => Promise<ListingScaffoldResult>;
  createListing: (
    context: ServiceContext,
    input: {
      description?: string | null | undefined;
      plate: string | null;
      priceCents?: number | null | undefined;
      status?: VehicleListingStatus | undefined;
      title: string;
    },
  ) => Promise<ListingScaffoldResult>;
  getListing: (
    context: ServiceContext,
    input: { listingId: string },
  ) => Promise<ListingScaffoldResult>;
  updateListingDescription: (
    context: ServiceContext,
    input: { description: string | null; listingId: string },
  ) => Promise<ListingScaffoldResult>;
  updateListingPrice: (
    context: ServiceContext,
    input: { listingId: string; priceCents: number | null },
  ) => Promise<ListingScaffoldResult>;
};

export type DrizzleVehicleInventoryAdapter = (
  client: DrizzleVehicleInventoryClient,
) => VehicleInventoryServicePorts;

export type CreateInventoryListingServicesOptions =
  | {
      drizzleAdapter?: never;
      drizzleClient?: never;
      ports?: VehicleInventoryServicePorts;
    }
  | {
      drizzleAdapter?: DrizzleVehicleInventoryAdapter;
      drizzleClient: DrizzleVehicleInventoryClient;
      ports?: never;
    };

export function createInventoryListingServices(
  options: CreateInventoryListingServicesOptions = {},
): InventoryListingServices {
  const ports = resolveVehicleInventoryPorts(options);

  return {
    async attachListingUnit(context, input) {
      const unit = await attachVehicleUnit(
        context,
        cleanAttachInput(input),
        ports,
      );

      return plannedListingResult(unit.listingId);
    },
    async changeListingStatus(context, input) {
      const listing = await changeVehicleStatus(context, input, ports);

      return plannedListingResult(listing.id);
    },
    async createListing(context, input) {
      const listing = await createVehicleListing(
        context,
        cleanCreateInput(input),
        ports,
      );

      return plannedListingResult(listing.id);
    },
    async getListing(context, input) {
      const listing = await getVehicleListing(context, input, ports);

      return plannedListingResult(listing.id);
    },
    async updateListingDescription(context, input) {
      const listing = await updateVehicleDescription(context, input, ports);

      return plannedListingResult(listing.id);
    },
    async updateListingPrice(context, input) {
      const listing = await updateVehiclePrice(context, input, ports);

      return plannedListingResult(listing.id);
    },
  };
}

export const inventoryListingServices = createInventoryListingServices();

function resolveVehicleInventoryPorts(
  options: CreateInventoryListingServicesOptions,
): VehicleInventoryServicePorts {
  if ("ports" in options && options.ports) return options.ports;

  if ("drizzleClient" in options) {
    const adapter =
      options.drizzleAdapter ?? createDrizzleVehicleInventoryRepositories;
    return adapter(options.drizzleClient);
  }

  return createMemoryVehicleInventoryPorts();
}

function cleanAttachInput(
  input: Parameters<InventoryListingServices["attachListingUnit"]>[1],
): AttachVehicleUnitInput {
  const result: AttachVehicleUnitInput = {
    listingId: input.listingId,
  };

  if (input.plate !== undefined) result.plate = input.plate;
  if (input.stockNumber !== undefined) result.stockNumber = input.stockNumber;
  if (input.vin !== undefined) result.vin = input.vin;

  return result;
}

function cleanCreateInput(
  input: Parameters<InventoryListingServices["createListing"]>[1],
): CreateVehicleListingInput {
  const result: CreateVehicleListingInput = {
    plate: input.plate,
    title: input.title,
  };

  if (input.description !== undefined) result.description = input.description;
  if (input.priceCents !== undefined) result.priceCents = input.priceCents;
  if (input.status !== undefined) result.status = input.status;

  return result;
}

function plannedListingResult(listingId: string): ListingScaffoldResult {
  return {
    listingId,
    status: "not_implemented",
  };
}
