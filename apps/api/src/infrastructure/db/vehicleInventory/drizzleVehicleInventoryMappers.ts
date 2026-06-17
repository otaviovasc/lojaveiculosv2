import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type { vehicleListings, vehicleUnits } from "@lojaveiculosv2/db";
import type {
  VehicleListing,
  VehicleListingStatus,
  VehicleUnit,
  VehicleUnitStatus,
} from "../../../domains/vehicle/ports/vehicleInventoryRepository.js";

export type VehicleListingRow = InferSelectModel<typeof vehicleListings>;
export type InsertVehicleListingRow = InferInsertModel<typeof vehicleListings>;
export type UpdateVehicleListingRow = Partial<InsertVehicleListingRow>;

export type VehicleUnitRow = InferSelectModel<typeof vehicleUnits>;
export type InsertVehicleUnitRow = InferInsertModel<typeof vehicleUnits>;
export type UpdateVehicleUnitRow = Partial<InsertVehicleUnitRow>;

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
    createdAt: row.createdAt,
    description: row.description,
    id: row.id,
    plate: units[0]?.plate ?? null,
    priceCents: row.askingPriceCents,
    status: toDomainListingStatus(row.status),
    storeId: row.storeId,
    tenantId: row.tenantId,
    title: row.title,
    unitIds: units.map((unit) => unit.id),
    updatedAt: row.updatedAt,
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
    vin: row.vin,
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
