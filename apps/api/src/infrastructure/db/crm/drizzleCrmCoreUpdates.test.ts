import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import type { opportunities } from "@lojaveiculosv2/db";
import type { DrizzleCrmCoreClient } from "./drizzleCrmCoreRepository.js";
import {
  opportunityMetadataPatch,
  updateDrizzleCrmCore,
} from "./drizzleCrmCoreUpdates.js";

const scope = {
  storeId: "00000000-0000-4000-8000-000000000002",
  tenantId: "00000000-0000-4000-8000-000000000003",
};

describe("Drizzle CRM core opportunity updates", () => {
  it("merges a partial pipeline update into persisted metadata", async () => {
    const { db, updatedValues } = opportunityDb();

    await updateDrizzleCrmCore(db, {
      ...scope,
      expectedRevision: 0,
      id: opportunityRow.id,
      patch: { pipelineStageId: null },
      resource: "opportunities",
    });

    const metadataSql = updatedValues().metadata;
    expect(metadataSql).toBeDefined();
    const query = new PgDialect().sqlToQuery(metadataSql as never);
    expect(query.sql).toContain("coalesce");
    expect(query.sql).toContain(" || ");
    expect(query.params).toEqual([JSON.stringify({ pipelineStageId: null })]);
  });

  it("keeps omitted metadata fields out while preserving explicit clearing", () => {
    const interests = [
      { kind: "listing", referenceId: "vehicle-2", title: "Vehicle 2" },
    ] as const;

    expect(opportunityMetadataPatch({ interests })).toEqual({ interests });
    expect(
      opportunityMetadataPatch({ pipelineId: null, pipelineStageId: null }),
    ).toEqual({ pipelineId: null, pipelineStageId: null });
  });
});

const opportunityRow: typeof opportunities.$inferSelect = {
  assignedUserId: null,
  contactId: "00000000-0000-4000-8000-000000000004",
  createdAt: new Date("2026-08-12T00:00:00.000Z"),
  deletedAt: null,
  id: "00000000-0000-4000-8000-000000000001",
  isDeleted: false,
  lastInteractionAt: null,
  legacyLeadId: null,
  metadata: {
    interests: [{ vehicleId: "vehicle-1" }],
    pipelineId: "00000000-0000-4000-8000-000000000005",
    pipelineStageId: "00000000-0000-4000-8000-000000000006",
    sourceEvidence: "preserve-me",
  },
  revision: 0,
  source: "manual",
  stageKey: "new",
  state: "open",
  ...scope,
  updatedAt: new Date("2026-08-12T00:00:00.000Z"),
};

function opportunityDb(): {
  db: DrizzleCrmCoreClient;
  updatedValues: () => Record<string, unknown>;
} {
  let values: Record<string, unknown> = {};
  const db = {
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => ({ limit: async () => [opportunityRow] }),
        }),
      }),
    }),
    update: () => ({
      set: (nextValues: Record<string, unknown>) => {
        values = nextValues;
        return {
          where: () => ({ returning: async () => [{ id: opportunityRow.id }] }),
        };
      },
    }),
  } as unknown as DrizzleCrmCoreClient;
  return { db, updatedValues: () => values };
}
