import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { providerConnections } from "@lojaveiculosv2/db";
import { describe, expect, it } from "vitest";
import type { CrmConnectionRepository } from "../../../domains/crm/ports/crmConnectionRepository.js";
import { createDrizzleCrmConnectionRepository } from "./drizzleCrmConnectionRepository.js";
import { toCrmConnection } from "./drizzleCrmConnectionRepositorySupport.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

describe("Drizzle CRM connection repository", () => {
  it("maps canonical read facts directly from the channel row", () => {
    const mapped = toCrmConnection(
      canonicalRow({
        broker: "composio",
        channel: "instagram",
        metadata: {
          capabilities: { inbound: true, scheduling: false, templates: true },
          connected: true,
        },
        provider: "meta_cloud",
        state: "active",
      }),
    );

    expect(mapped.canonical).toEqual({
      broker: "composio",
      capabilities: ["inbound", "templates"],
      channel: "instagram",
      connected: true,
      degraded: false,
      errorCode: null,
      provider: "meta_cloud",
      readiness: { ready: true, reason: null, reasonCode: "ready" },
      state: "active",
    });
  });

  it("fails closed when canonical readiness and capability facts are absent", () => {
    const mapped = toCrmConnection(
      canonicalRow({
        broker: "direct",
        channel: "whatsapp",
        metadata: {},
        provider: "zapi",
        state: "active",
      }),
    );

    expect(mapped.canonical).toMatchObject({
      capabilities: [],
      connected: false,
      readiness: { ready: false, reasonCode: "disconnected" },
    });
  });

  it("creates setup connections in the canonical channel table", async () => {
    let insertedTable: unknown;
    const db = {
      insert: (table: unknown) => {
        insertedTable = table;
        return { values: () => ({ returning: async () => [] }) };
      },
    } as unknown as DrizzleCrmClient;

    await expect(
      createDrizzleCrmConnectionRepository(db).createConnection({
        displayName: "Canonical Z-API",
        provider: "zapi",
        storeId: claimInput.storeId,
        tenantId: claimInput.tenantId,
      }),
    ).rejects.toThrow("CRM channel connection insert returned no row");
    expect(insertedTable).toBe(providerConnections);
  });

  it("types bound Z-API webhook lease values", async () => {
    const { metadataSql, updatedTable } = await captureMetadataUpdate(
      (repository) => repository.claimZapiWebhookSetup(claimInput),
    );
    expect(updatedTable).toBe(providerConnections);
    expectTypedLeaseValues(metadataSql);
  });

  it("types bound OLX webhook lease values", async () => {
    const { metadataSql, updatedTable } = await captureMetadataUpdate(
      (repository) => repository.claimOlxWebhookSetup!(claimInput),
    );
    expect(updatedTable).toBe(providerConnections);
    expectTypedLeaseValues(metadataSql);
  });

  it("does not claim configured or indeterminate OLX webhook setup", async () => {
    const { whereSql } = await captureMetadataUpdate((repository) =>
      repository.claimOlxWebhookSetup!(claimInput),
    );

    expect(whereSql).toContain("not in ('configured', 'indeterminate')");
  });
});

function canonicalRow(
  input: Pick<
    Parameters<typeof toCrmConnection>[0],
    "broker" | "channel" | "metadata" | "provider" | "state"
  >,
): Parameters<typeof toCrmConnection>[0] {
  return {
    authorizationId: null,
    createdAt: new Date("2026-08-18T12:00:00.000Z"),
    displayName: "Canonical connection",
    externalConnectionId: null,
    externalInstanceId: null,
    id: "00000000-0000-4000-8000-000000000010",
    revision: 0,
    storeId: claimInput.storeId,
    tenantId: claimInput.tenantId,
    updatedAt: new Date("2026-08-18T12:00:00.000Z"),
    webhookUrl: null,
    ...input,
  };
}

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
  let whereClause: SQL | undefined;
  let updatedTable: unknown;
  const db = {
    update: (table: unknown) => ({
      set: (values: { metadata: SQL }) => {
        updatedTable = table;
        metadataUpdate = values.metadata;
        return {
          where: (where: SQL) => {
            whereClause = where;
            return { returning: async () => [] };
          },
        };
      },
    }),
  } as unknown as DrizzleCrmClient;
  await runClaim(createDrizzleCrmConnectionRepository(db));
  if (!metadataUpdate) throw new Error("CRM metadata update was not captured.");
  if (!whereClause) throw new Error("CRM claim predicate was not captured.");
  const dialect = new PgDialect();
  const metadataQuery = dialect.sqlToQuery(metadataUpdate);
  const whereQuery = dialect.sqlToQuery(whereClause);
  expect(whereQuery.sql.replace(/\s+/g, " ")).toMatch(
    /::timestamptz <= \$\d+::timestamptz/u,
  );
  expect(whereQuery.params.every((value) => !(value instanceof Date))).toBe(
    true,
  );
  return {
    metadataSql: metadataQuery.sql.replace(/\s+/g, " "),
    updatedTable,
    whereSql: whereQuery.sql.replace(/\s+/g, " "),
  };
}

function expectTypedLeaseValues(sql: string) {
  expect(sql).toContain("'leaseExpiresAt', $1::text");
  expect(sql).toContain("'leaseOwner', $2::text");
  expect(sql).toContain("'updatedAt', $3::text");
}
