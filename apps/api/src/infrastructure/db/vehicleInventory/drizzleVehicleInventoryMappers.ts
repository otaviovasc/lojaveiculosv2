import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  coerceVehicleColor,
  normalizeVehicleEngineAspiration,
  normalizeVehicleEngineDisplacement,
} from "@lojaveiculosv2/shared";
import type {
  documentLinks,
  documents,
  vehicleListings,
  vehicleMedia,
  vehicleUnits,
} from "@lojaveiculosv2/db";
import type {
  VehicleListingCatalog,
  VehicleMedia,
  VehicleListing,
  VehicleListingStatus,
  VehicleUnit,
  VehicleUnitStatus,
} from "../../../domains/vehicle/ports/vehicleInventoryRepository.js";

export type VehicleListingRow = InferSelectModel<typeof vehicleListings>;
export type InsertVehicleListingRow = InferInsertModel<typeof vehicleListings>;
export type UpdateVehicleListingRow = Partial<InsertVehicleListingRow>;

export type VehicleDocumentRow = InferSelectModel<typeof documents>;
export type InsertDocumentRow = InferInsertModel<typeof documents>;
export type VehicleDocumentLinkRow = InferSelectModel<typeof documentLinks>;
export type InsertDocumentLinkRow = InferInsertModel<typeof documentLinks>;
export type VehicleUnitRow = InferSelectModel<typeof vehicleUnits>;
export type InsertVehicleUnitRow = InferInsertModel<typeof vehicleUnits>;
export type UpdateVehicleUnitRow = Partial<InsertVehicleUnitRow>;
export type VehicleMediaRow = InferSelectModel<typeof vehicleMedia>;
export type InsertVehicleMediaRow = InferInsertModel<typeof vehicleMedia>;

export class VehicleInventoryDrizzleMappingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VehicleInventoryDrizzleMappingError";
  }
}

export function toVehicleListing(
  row: VehicleListingRow,
  units: readonly VehicleUnit[],
): VehicleListing {
  return {
    catalog: readListingCatalog(row.metadata),
    createdAt: row.createdAt,
    description: row.description,
    doors: row.doors,
    engineAspiration: normalizeVehicleEngineAspiration(row.engineAspiration),
    engineDisplacement: normalizeVehicleEngineDisplacement(
      row.engineDisplacement,
    ),
    fuelType: row.fuelType,
    id: row.id,
    internalNotes: row.internalNotes,
    manufactureYear: row.manufactureYear,
    mileageKm: row.mileageKm,
    modelYear: row.modelYear,
    plate: units[0]?.plate ?? null,
    priceCents: row.askingPriceCents,
    status: toDomainListingStatus(row.status, units),
    storeId: row.storeId,
    tenantId: row.tenantId,
    title: row.title,
    transmission: row.transmission,
    trimName: row.trimName,
    unitIds: units.map((unit) => unit.id),
    updatedAt: row.updatedAt,
  };
}

export function createListingMetadata(
  catalog: VehicleListingCatalog | null,
): Record<string, unknown> {
  return catalog ? { catalog } : {};
}

function readListingCatalog(metadata: unknown): VehicleListingCatalog | null {
  if (!isRecord(metadata) || !isRecord(metadata.catalog)) return null;
  const catalog = metadata.catalog;
  return {
    brandCode: readString(catalog.brandCode),
    brandLogoUrl: readString(catalog.brandLogoUrl),
    brandName: readString(catalog.brandName),
    fipeCode: readString(catalog.fipeCode),
    fuel: readString(catalog.fuel),
    modelCode: readString(catalog.modelCode),
    modelName: readString(catalog.modelName),
    modelYear: readNumber(catalog.modelYear),
    priceCents: readNumber(catalog.priceCents),
    referenceMonth: readString(catalog.referenceMonth),
    source: catalog.source === "fipe" ? "fipe" : null,
    vehicleType: readVehicleType(catalog.vehicleType),
    yearCode: readString(catalog.yearCode),
    yearName: readString(catalog.yearName),
  };
}

export function toVehicleUnit(row: VehicleUnitRow): VehicleUnit {
  return {
    colorName: coerceVehicleColor(row.colorName),
    createdAt: row.createdAt,
    id: row.id,
    listingId: row.listingId,
    plate: row.plate,
    status: toDomainUnitStatus(row.status),
    stockNumber: row.stockNumber,
    storeId: row.storeId,
    tenantId: row.tenantId,
    updatedAt: row.updatedAt,
    vin: row.vin,
  };
}

export function toVehicleMedia(row: VehicleMediaRow): VehicleMedia {
  return {
    altText: row.altText,
    createdAt: row.createdAt,
    displayOrder: row.displayOrder,
    id: row.id,
    isPublic: row.isPublic,
    kind: row.kind,
    listingId: row.listingId,
    storageKey: row.storageKey,
    storeId: row.storeId,
    tenantId: row.tenantId,
    updatedAt: row.updatedAt,
    url: row.url,
  };
}

export function toDbListingStatus(
  status: VehicleListingStatus,
): InsertVehicleListingRow["status"] {
  const map: Record<VehicleListingStatus, InsertVehicleListingRow["status"]> = {
    available: "published",
    draft: "draft",
    inactive: "unpublished",
    in_preparation: "in_preparation",
    reserved: "reserved",
    sold: "sold_out",
  };
  return map[status];
}

export function toDbUnitStatus(
  status: VehicleUnitStatus,
): InsertVehicleUnitRow["status"] {
  const map: Record<VehicleUnitStatus, InsertVehicleUnitRow["status"]> = {
    available: "available",
    reserved: "reserved",
    retired: "inactive",
    sold: "sold",
    in_preparation: "in_preparation",
  };
  return map[status];
}

export function requireReturnedRow<Row>(
  row: Row | undefined,
  operation: string,
): Row {
  if (!row) {
    throw new VehicleInventoryDrizzleMappingError(
      `Drizzle adapter did not receive a returned row for ${operation}`,
    );
  }
  return row;
}

function toDomainListingStatus(
  status: VehicleListingRow["status"],
  units: readonly VehicleUnit[],
): VehicleListingStatus {
  if (status === "in_preparation") return "in_preparation";
  if (status === "unpublished") {
    return units.some((u) => u.status === "in_preparation")
      ? "in_preparation"
      : "inactive";
  }
  const map: Record<
    Exclude<
      VehicleListingRow["status"],
      "unpublished" | "archived" | "in_preparation"
    >,
    VehicleListingStatus
  > = {
    draft: "draft",
    published: "available",
    reserved: "reserved",
    sold_out: "sold",
  };
  if (status === "archived") {
    throw new VehicleInventoryDrizzleMappingError(
      "DB listing status archived has no VehicleService equivalent",
    );
  }
  return map[status];
}

function toDomainUnitStatus(
  status: VehicleUnitRow["status"],
): VehicleUnitStatus {
  const map: Partial<Record<VehicleUnitRow["status"], VehicleUnitStatus>> = {
    available: "available",
    reserved: "reserved",
    sold: "sold",
    inactive: "retired",
    in_preparation: "in_preparation",
  };
  const mapped = map[status];
  if (!mapped) {
    throw new VehicleInventoryDrizzleMappingError(
      `DB unit status ${status} has no VehicleService equivalent`,
    );
  }
  return mapped;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readVehicleType(value: unknown): VehicleListingCatalog["vehicleType"] {
  return value === "cars" || value === "motorcycles" || value === "trucks"
    ? value
    : null;
}
