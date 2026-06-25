import type { InventoryListingServices } from "./listingServices.js";

export function cleanCreateMediaRequest(
  listingId: string,
  input: {
    altText?: string | null | undefined;
    displayOrder?: number | undefined;
    kind: "document_preview" | "photo" | "video";
    storageKey: string;
  },
): Parameters<InventoryListingServices["createMedia"]>[1] {
  const result: Parameters<InventoryListingServices["createMedia"]>[1] = {
    kind: input.kind,
    listingId,
    storageKey: input.storageKey,
  };

  if (input.altText !== undefined) result.altText = input.altText;
  if (input.displayOrder !== undefined)
    result.displayOrder = input.displayOrder;

  return result;
}

export function cleanAttachDocumentRequest(
  listingId: string,
  input: {
    fileName: string;
    fileSizeBytes?: number | null | undefined;
    kind: Parameters<
      InventoryListingServices["attachVehicleDocument"]
    >[1]["kind"];
    linkRole?: string | undefined;
    mimeType?: string | null | undefined;
    storageKey: string;
    targetId?: string | undefined;
    targetType?: "vehicle_listing" | "vehicle_unit" | undefined;
    title: string;
  },
): Parameters<InventoryListingServices["attachVehicleDocument"]>[1] {
  const result: Parameters<
    InventoryListingServices["attachVehicleDocument"]
  >[1] = {
    fileName: input.fileName,
    kind: input.kind,
    listingId,
    storageKey: input.storageKey,
    title: input.title,
  };

  if (input.fileSizeBytes !== undefined) {
    result.fileSizeBytes = input.fileSizeBytes;
  }
  if (input.linkRole !== undefined) result.linkRole = input.linkRole;
  if (input.mimeType !== undefined) result.mimeType = input.mimeType;
  if (input.targetId !== undefined) result.targetId = input.targetId;
  if (input.targetType !== undefined) result.targetType = input.targetType;

  return result;
}

export function cleanListListingsQuery(input: {
  limit?: number | undefined;
  offset?: number | undefined;
  search?: string | undefined;
  status?:
    | "available"
    | "draft"
    | "inactive"
    | "reserved"
    | "sold"
    | "in_preparation"
    | undefined;
}): Parameters<InventoryListingServices["listListings"]>[1] {
  const result: Parameters<InventoryListingServices["listListings"]>[1] = {};

  if (input.limit !== undefined) result.limit = input.limit;
  if (input.offset !== undefined) result.offset = input.offset;
  if (input.search !== undefined) result.search = input.search;
  if (input.status !== undefined) result.status = input.status;

  return result;
}

export function cleanRequestDocumentUploadRequest(
  listingId: string,
  input: {
    contentType: string;
    fileName: string;
    kind: Parameters<
      InventoryListingServices["requestDocumentUpload"]
    >[1]["kind"];
    sizeBytes: number;
    targetId?: string | undefined;
    targetType?: "vehicle_listing" | "vehicle_unit" | undefined;
  },
): Parameters<InventoryListingServices["requestDocumentUpload"]>[1] {
  const result: Parameters<
    InventoryListingServices["requestDocumentUpload"]
  >[1] = {
    contentType: input.contentType,
    fileName: input.fileName,
    kind: input.kind,
    listingId,
    sizeBytes: input.sizeBytes,
  };

  if (input.targetId !== undefined) result.targetId = input.targetId;
  if (input.targetType !== undefined) result.targetType = input.targetType;

  return result;
}

export function cleanUpdateMediaRequest(
  listingId: string,
  mediaId: string,
  input: {
    altText?: string | null | undefined;
    displayOrder?: number | undefined;
    isPublic?: boolean | undefined;
  },
): Parameters<InventoryListingServices["updateMedia"]>[1] {
  const result: Parameters<InventoryListingServices["updateMedia"]>[1] = {
    listingId,
    mediaId,
  };

  if (input.altText !== undefined) result.altText = input.altText;
  if (input.displayOrder !== undefined)
    result.displayOrder = input.displayOrder;
  if (input.isPublic !== undefined) result.isPublic = input.isPublic;

  return result;
}

export function cleanUpdateListingRequest(
  listingId: string,
  input: {
    catalog?: Parameters<
      InventoryListingServices["updateListingDetails"]
    >[1]["catalog"];
    description?: string | null | undefined;
    doors?: number | null | undefined;
    engineAspiration?: Parameters<
      InventoryListingServices["updateListingDetails"]
    >[1]["engineAspiration"];
    engineDisplacement?: Parameters<
      InventoryListingServices["updateListingDetails"]
    >[1]["engineDisplacement"];
    fuelType?: Parameters<
      InventoryListingServices["updateListingDetails"]
    >[1]["fuelType"];
    internalNotes?: string | null | undefined;
    manufactureYear?: number | null | undefined;
    mileageKm?: number | null | undefined;
    modelYear?: number | null | undefined;
    priceCents?: number | null | undefined;
    status?:
      | "available"
      | "draft"
      | "inactive"
      | "reserved"
      | "sold"
      | "in_preparation"
      | undefined;
    title?: string | undefined;
    transmission?: Parameters<
      InventoryListingServices["updateListingDetails"]
    >[1]["transmission"];
    trimName?: string | null | undefined;
  },
): Parameters<InventoryListingServices["updateListingDetails"]>[1] {
  const result: Parameters<
    InventoryListingServices["updateListingDetails"]
  >[1] = { listingId };

  if (input.catalog !== undefined) result.catalog = input.catalog;
  if (input.description !== undefined) result.description = input.description;
  if (input.doors !== undefined) result.doors = input.doors;
  if (input.engineAspiration !== undefined) {
    result.engineAspiration = input.engineAspiration;
  }
  if (input.engineDisplacement !== undefined) {
    result.engineDisplacement = input.engineDisplacement;
  }
  if (input.fuelType !== undefined) result.fuelType = input.fuelType;
  if (input.internalNotes !== undefined) {
    result.internalNotes = input.internalNotes;
  }
  if (input.manufactureYear !== undefined) {
    result.manufactureYear = input.manufactureYear;
  }
  if (input.mileageKm !== undefined) result.mileageKm = input.mileageKm;
  if (input.modelYear !== undefined) result.modelYear = input.modelYear;
  if (input.priceCents !== undefined) result.priceCents = input.priceCents;
  if (input.status !== undefined) result.status = input.status;
  if (input.title !== undefined) result.title = input.title;
  if (input.transmission !== undefined) {
    result.transmission = input.transmission;
  }
  if (input.trimName !== undefined) result.trimName = input.trimName;

  return result;
}

export function cleanUpdateUnitRequest(
  listingId: string,
  unitId: string,
  input: {
    colorName?: Parameters<
      InventoryListingServices["updateListingUnit"]
    >[1]["colorName"];
    plate?: string | null | undefined;
    status?:
      | "available"
      | "reserved"
      | "retired"
      | "sold"
      | "in_preparation"
      | undefined;
    stockNumber?: string | null | undefined;
    vin?: string | null | undefined;
  },
): Parameters<InventoryListingServices["updateListingUnit"]>[1] {
  const result: Parameters<InventoryListingServices["updateListingUnit"]>[1] = {
    listingId,
    unitId,
  };

  if (input.colorName !== undefined) result.colorName = input.colorName;
  if (input.plate !== undefined) result.plate = input.plate;
  if (input.status !== undefined) result.status = input.status;
  if (input.stockNumber !== undefined) result.stockNumber = input.stockNumber;
  if (input.vin !== undefined) result.vin = input.vin;

  return result;
}
