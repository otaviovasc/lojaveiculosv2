import * as schema from "@lojaveiculosv2/db";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { describe, expect, it } from "vitest";
import { loadLocalEnv } from "../../config/loadLocalEnv.js";
import { claimDrizzleCrmRetentionAuditOutbox } from "./drizzleCrmRetentionAuditOutbox.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

loadLocalEnv();

const runRawDb = process.env.RUN_RAW_CRM_DB_TESTS === "true";

describe.skipIf(!runRawDb)("CRM retention Postgres adapter", () => {
  it("binds audit-outbox timestamps through postgres-js", async () => {
    expect(
      process.env.DATABASE_URL,
      "DATABASE_URL is required for raw CRM database validation",
    ).toBeTruthy();

    const sqlClient = postgres(process.env.DATABASE_URL ?? "", { max: 1 });
    const db = drizzle(sqlClient, { schema });
    const rollback = Symbol("rollback CRM retention validation");

    try {
      await db.transaction(async (transaction) => {
        await expect(
          claimDrizzleCrmRetentionAuditOutbox(
            transaction as unknown as DrizzleCrmClient,
            {
              leaseExpiresAt: new Date("2026-08-12T15:15:00.000Z"),
              leaseOwner: "retention_raw_db_test",
              limit: 1,
              now: new Date("2026-08-12T15:00:00.000Z"),
            },
          ),
        ).resolves.toEqual(expect.any(Array));
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    } finally {
      await sqlClient.end();
    }
  });
});
