import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it } from "vitest";
import type { CrmConnectionRepository } from "../../../domains/crm/ports/crmConnectionRepository.js";
import { createDrizzleCrmConnectionRepository } from "./drizzleCrmConnectionRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

describe("Drizzle CRM connection repository", () => {
  it("types bound Z-API webhook lease values", async () => {
    expectTypedLeaseValues(
      await captureMetadataUpdate((repository) =>
        repository.claimZapiWebhookSetup(claimInput),
      ),
    );
  });

  it("types bound OLX webhook lease values", async () => {
    expectTypedLeaseValues(
      await captureMetadataUpdate((repository) =>
        repository.claimOlxWebhookSetup!(claimInput),
      ),
    );
  });
});

const claimInput = {
  allowConfigured: true,
  connectionId: "00000000-0000-4000-8000-000000000001",
  leaseExpiresAt: new Date("2026-08-12T23:11:44.000Z"),
  leaseOwner: "request-1",
  now: new Date("2026-08-12T23:10:44.000Z"),
  storeId: "00000000-0000-4000-8000-000000000002" as StoreId,
  tenantId: "00000000-0000-4000-8000-000000000003" as TenantId,
};

async function captureMetadataUpdate(
  runClaim: (repository: CrmConnectionRepository) => Promise<unknown>,
) {
  let metadataUpdate: SQL | undefined;
  const db = {
    update: () => ({
      set: (values: { metadata: SQL }) => {
        metadataUpdate = values.metadata;
        return { where: () => ({ returning: async () => [] }) };
      },
    }),
  } as unknown as DrizzleCrmClient;
  await runClaim(createDrizzleCrmConnectionRepository(db));
  if (!metadataUpdate) throw new Error("CRM metadata update was not captured.");
  return new PgDialect().sqlToQuery(metadataUpdate).sql.replace(/\s+/g, " ");
}

function expectTypedLeaseValues(sql: string) {
  expect(sql).toContain("'leaseExpiresAt', $1::text");
  expect(sql).toContain("'leaseOwner', $2::text");
  expect(sql).toContain("'updatedAt', $3::text");
}
