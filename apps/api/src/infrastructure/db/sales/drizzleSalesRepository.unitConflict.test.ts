import { describe, expect, it } from "vitest";
import {
  activeSaleUnitConstraintName,
  SaleUnitConflictError,
} from "../../../domains/sales/saleUnitConflict.js";
import {
  createDrizzleSalesRepository,
  type DrizzleSalesClient,
} from "./drizzleSalesRepository.js";

describe("Drizzle sales active-unit conflict mapping", () => {
  it("maps a wrapped violation of the active-unit index", async () => {
    const postgresError = constraintError(activeSaleUnitConstraintName);
    const repository = createDrizzleSalesRepository(
      rejectingInsertDb(new Error("Query failed", { cause: postgresError })),
    );

    await expect(
      repository.createDraft(
        { storeId: "store_1", tenantId: "tenant_1" },
        { unitId: "unit_1" },
      ),
    ).rejects.toBeInstanceOf(SaleUnitConflictError);
  });

  it("does not map a different unique index violation", async () => {
    const postgresError = constraintError("another_unique_index");
    const repository = createDrizzleSalesRepository(
      rejectingInsertDb(postgresError),
    );

    await expect(
      repository.createDraft(
        { storeId: "store_1", tenantId: "tenant_1" },
        { unitId: "unit_1" },
      ),
    ).rejects.toBe(postgresError);
  });
});

function rejectingInsertDb(error: Error): DrizzleSalesClient {
  return {
    insert: () => ({
      values: () => ({
        returning: async () => Promise.reject(error),
      }),
    }),
  } as unknown as DrizzleSalesClient;
}

function constraintError(constraintName: string) {
  return Object.assign(new Error("duplicate key value violates unique index"), {
    code: "23505",
    constraint_name: constraintName,
  });
}
