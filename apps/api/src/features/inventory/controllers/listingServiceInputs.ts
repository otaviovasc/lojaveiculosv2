import type { AttachVehicleUnitInput } from "../../../domains/vehicle/services/VehicleService/attachVehicleUnit.js";
import type { CreateVehicleListingInput } from "../../../domains/vehicle/services/VehicleService/createVehicleListing.js";
import type { CreateVehicleMediaInput } from "../../../domains/vehicle/services/VehicleService/createVehicleMedia.js";
import type { UpdateVehicleListingDetailsInput } from "../../../domains/vehicle/services/VehicleService/updateVehicleListingDetails.js";
import type { UpdateVehicleUnitInput } from "../../../domains/vehicle/services/VehicleService/updateVehicleUnit.js";
import type { InventoryListingServices } from "./listingServices.js";

export function cleanAttachInput(
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

export function cleanCreateInput(
  input: Parameters<InventoryListingServices["createListing"]>[1],
): CreateVehicleListingInput {
  const result: CreateVehicleListingInput = {
    plate: input.plate,
    title: input.title,
  };

  if (input.catalog !== undefined) result.catalog = input.catalog;
  if (input.description !== undefined) result.description = input.description;
  if (input.manufactureYear !== undefined) {
    result.manufactureYear = input.manufactureYear;
  }
  if (input.modelYear !== undefined) result.modelYear = input.modelYear;
  if (input.priceCents !== undefined) result.priceCents = input.priceCents;
  if (input.status !== undefined) result.status = input.status;
  if (input.trimName !== undefined) result.trimName = input.trimName;

  return result;
}

export function cleanCreateMediaInput(
  input: CreateVehicleMediaInput,
): CreateVehicleMediaInput {
  const result: CreateVehicleMediaInput = {
    kind: input.kind,
    listingId: input.listingId,
    storageKey: input.storageKey,
  };

  if (input.altText !== undefined) result.altText = input.altText;
  if (input.displayOrder !== undefined)
    result.displayOrder = input.displayOrder;

  return result;
}

export function cleanUpdateListingInput(
  input: UpdateVehicleListingDetailsInput,
): UpdateVehicleListingDetailsInput {
  const result: UpdateVehicleListingDetailsInput = {
    listingId: input.listingId,
  };

  if (input.catalog !== undefined) result.catalog = input.catalog;
  if (input.description !== undefined) result.description = input.description;
  if (input.manufactureYear !== undefined) {
    result.manufactureYear = input.manufactureYear;
  }
  if (input.modelYear !== undefined) result.modelYear = input.modelYear;
  if (input.priceCents !== undefined) result.priceCents = input.priceCents;
  if (input.status !== undefined) result.status = input.status;
  if (input.title !== undefined) result.title = input.title;
  if (input.trimName !== undefined) result.trimName = input.trimName;

  return result;
}

export function cleanUpdateUnitInput(
  input: UpdateVehicleUnitInput,
): UpdateVehicleUnitInput {
  const result: UpdateVehicleUnitInput = {
    listingId: input.listingId,
    unitId: input.unitId,
  };

  if (input.plate !== undefined) result.plate = input.plate;
  if (input.status !== undefined) result.status = input.status;
  if (input.stockNumber !== undefined) result.stockNumber = input.stockNumber;
  if (input.vin !== undefined) result.vin = input.vin;

  return result;
}
