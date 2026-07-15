import type { AuditFieldChange } from "@lojaveiculosv2/audit";
import type { VehicleListing } from "./ports/vehicleInventoryRepository.js";
import type { UpdateVehicleListingDetailsInput } from "./services/VehicleService/updateVehicleListingDetails.js";

export function createListingChanges(
  listing: VehicleListing,
  input: UpdateVehicleListingDetailsInput,
): AuditFieldChange[] {
  return [
    arrayChangeFor(
      "commercialTags",
      listing.commercialTags,
      input.commercialTags,
    ),
    changeFor("title", listing.title, input.title),
    changeFor("description", listing.description, input.description),
    changeFor("doors", listing.doors, input.doors),
    changeFor(
      "engineAspiration",
      listing.engineAspiration,
      input.engineAspiration,
    ),
    changeFor(
      "engineDisplacement",
      listing.engineDisplacement,
      input.engineDisplacement,
    ),
    changeFor("fuelType", listing.fuelType, input.fuelType),
    redactedTextChangeFor(
      "internalNotes",
      listing.internalNotes,
      input.internalNotes,
    ),
    changeFor(
      "catalog.brandName",
      listing.catalog?.brandName ?? null,
      input.catalog?.brandName,
    ),
    changeFor(
      "catalog.modelName",
      listing.catalog?.modelName ?? null,
      input.catalog?.modelName,
    ),
    changeFor("mileageKm", listing.mileageKm, input.mileageKm),
    changeFor("modelYear", listing.modelYear, input.modelYear),
    changeFor("priceCents", listing.priceCents, input.priceCents),
    changeFor("status", listing.status, input.status),
    changeFor("transmission", listing.transmission, input.transmission),
    changeFor("trimName", listing.trimName, input.trimName),
    changeFor("videoUrl", listing.videoUrl, input.videoUrl),
  ].filter((change): change is AuditFieldChange => Boolean(change));
}

function arrayChangeFor(
  path: string,
  before: readonly string[],
  after: readonly string[] | undefined,
): AuditFieldChange | null {
  if (after === undefined || before.join("\u0000") === after.join("\u0000")) {
    return null;
  }
  return { after: [...after], before: [...before], path };
}

function changeFor(
  path: string,
  before: string | number | null,
  after: string | number | null | undefined,
): AuditFieldChange | null {
  if (after === undefined || before === after) return null;
  return { after, before, path };
}

function redactedTextChangeFor(
  path: string,
  before: string | null,
  after: string | null | undefined,
): AuditFieldChange | null {
  if (after === undefined || before === after) return null;
  return {
    after: after ? "[set]" : null,
    before: before ? "[set]" : null,
    path,
  };
}
