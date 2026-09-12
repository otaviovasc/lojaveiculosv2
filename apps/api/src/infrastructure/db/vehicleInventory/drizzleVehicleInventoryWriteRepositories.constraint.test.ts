import { describe, expect, it } from "vitest";
import { VehicleUnitIdentifierConflictError } from "../../../domains/vehicle/services/VehicleService/serviceSupport.js";
import {
  createDrizzleVehicleUnitRepository,
  type DrizzleVehicleUnitClient,
  vehicleUnitIdentifierConstraints,
} from "./drizzleVehicleInventoryWriteRepositories.js";

describe("Drizzle vehicle unit constraint mapping", () => {
  it("maps a wrapped duplicate identifier violation to a domain conflict", async () => {
    const postgresError = constraintError(
      vehicleUnitIdentifierConstraints.stockNumber,
    );
    const repository = createDrizzleVehicleUnitRepository(
      rejectingInsertDb(new Error("Query failed", { cause: postgresError })),
    );

    await expect(repository.create(unitInput())).rejects.toEqual(
      new VehicleUnitIdentifierConflictError("stockNumber"),
    );
  });

  it("does not map an unrelated unique constraint", async () => {
    const postgresError = constraintError("another_unique_index");
    const repository = createDrizzleVehicleUnitRepository(
      rejectingInsertDb(postgresError),
    );

    await expect(repository.create(unitInput())).rejects.toBe(postgresError);
  });
});

function unitInput() {
  return {
    listingId: "listing_1",
    plate: null,
    status: "inactive" as const,
    stockNumber: "stock_1",
    storeId: "store_1",
    tenantId: "tenant_1",
    vin: null,
  };
}

function rejectingInsertDb(error: Error): DrizzleVehicleUnitClient {
  return {
    insert: () => ({
      values: () => ({
        returning: async () => Promise.reject(error),
      }),
    }),
  } as unknown as DrizzleVehicleUnitClient;
}

function constraintError(constraintName: string) {
  return Object.assign(new Error("duplicate key value violates unique index"), {
    code: "23505",
    constraint_name: constraintName,
  });
}
