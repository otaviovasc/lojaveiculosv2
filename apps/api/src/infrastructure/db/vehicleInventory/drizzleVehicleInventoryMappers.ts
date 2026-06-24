import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
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

export class VehicleInventoryDrizzleScopeError extends Error {
  constructor(fieldName: "storeId" | "tenantId") {
    super(`DB-backed vehicle inventory requires a non-null ${fieldName}`);
    this.name = "VehicleInventoryDrizzleScopeError";
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
    id: row.id,
    manufactureYear: row.manufactureYear,
    modelYear: row.modelYear,
    plate: units[0]?.plate ?? null,
    priceCents: row.askingPriceCents,
    status: toDomainListingStatus(row.status),
    storeId: row.storeId,
    tenantId: row.tenantId,
    title: row.title,
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
  switch (status) {
    case "available":
      return "published";
    case "draft":
      return "draft";
    case "inactive":
      return "unpublished";
    case "reserved":
      return "reserved";
    case "sold":
      return "sold_out";
  }
}

export function toDbUnitStatus(
  status: VehicleUnitStatus,
): InsertVehicleUnitRow["status"] {
  switch (status) {
    case "available":
      return "available";
    case "reserved":
      return "reserved";
    case "retired":
      return "inactive";
    case "sold":
      return "sold";
  }
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
): VehicleListingStatus {
  switch (status) {
    case "draft":
      return "draft";
    case "published":
      return "available";
    case "reserved":
      return "reserved";
    case "sold_out":
      return "sold";
    case "unpublished":
      return "inactive";
    case "archived":
      throw new VehicleInventoryDrizzleMappingError(
        "DB listing status archived has no VehicleService equivalent",
      );
  }
}

function toDomainUnitStatus(
  status: VehicleUnitRow["status"],
): VehicleUnitStatus {
  switch (status) {
    case "available":
      return "available";
    case "reserved":
      return "reserved";
    case "sold":
      return "sold";
    case "inactive":
      return "retired";
    case "acquired":
    case "delivered":
    case "in_preparation":
      throw new VehicleInventoryDrizzleMappingError(
        `DB unit status ${status} has no VehicleService equivalent`,
      );
  }
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
