import { describe, expect, it } from "vitest";
import { CrmPipelineDuplicateNameError } from "../../../domains/crm/services/CrmService/serviceSupport.js";
import {
  activeCrmPipelineNameConstraint,
  createDrizzleCrmPipelineRepository,
} from "./drizzleCrmPipelineRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

describe("Drizzle CRM pipeline constraint mapping", () => {
  it("maps a wrapped active-name violation to the domain conflict", async () => {
    const postgresError = constraintError(activeCrmPipelineNameConstraint);
    const repository = createDrizzleCrmPipelineRepository(
      rejectingInsertDb(new Error("Query failed", { cause: postgresError })),
    );

    await expect(repository.createPipeline(pipelineInput())).rejects.toEqual(
      new CrmPipelineDuplicateNameError("Vendas"),
    );
  });

  it("does not map a different unique constraint", async () => {
    const postgresError = constraintError("another_unique_index");
    const repository = createDrizzleCrmPipelineRepository(
      rejectingInsertDb(postgresError),
    );

    await expect(repository.createPipeline(pipelineInput())).rejects.toBe(
      postgresError,
    );
  });
});

function pipelineInput() {
  return {
    isDefault: false,
    name: "Vendas",
    stages: [],
    storeId: "store_1" as never,
    tenantId: "tenant_1" as never,
  };
}

function rejectingInsertDb(error: Error): DrizzleCrmClient {
  return {
    insert: () => ({
      values: () => ({
        returning: async () => Promise.reject(error),
      }),
    }),
  } as unknown as DrizzleCrmClient;
}

function constraintError(constraintName: string) {
  return Object.assign(new Error("duplicate key value violates unique index"), {
    code: "23505",
    constraint_name: constraintName,
  });
}
