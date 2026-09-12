import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import postgres from "postgres";
import { describe, expect, it } from "vitest";

const runRawDb = process.env.RUN_RAW_POSTGRES_TESTS === "true";
const migration = readFileSync(
  new URL("../migrations/0079_billing_audit_outbox.sql", import.meta.url),
  "utf8",
);

describe.skipIf(!runRawDb)("billing audit outbox migration", () => {
  it("is rerunnable and enforces tenant/store and payload boundaries", async () => {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
    const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
    try {
      await sql.begin(async (tx) => {
        await tx.unsafe(`
          SET LOCAL search_path = pg_temp, public;
          CREATE TEMP TABLE tenants (id uuid PRIMARY KEY);
          CREATE TEMP TABLE stores (
            id uuid PRIMARY KEY,
            tenant_id uuid NOT NULL,
            UNIQUE (id, tenant_id)
          );
        `);
        await tx.unsafe(migration);
        await tx.unsafe(migration);
        expect(migration).toContain("billing.plan_hire.activated");
        expect(migration).toContain("billing.plan_quote.requested");
        expect(migration).toContain("billing.plan_quote.approved");
        const tenantId = randomUUID();
        const otherTenantId = randomUUID();
        const storeId = randomUUID();
        await tx`INSERT INTO tenants (id) VALUES (${tenantId}), (${otherTenantId})`;
        await tx`INSERT INTO stores (id, tenant_id) VALUES (${storeId}, ${tenantId})`;
        await tx`
          INSERT INTO billing_audit_outbox (
            action, actor_id, actor_kind, audit_id, entity_id, entity_type,
            idempotency_key, metadata, request_id, store_id, tenant_id
          ) VALUES (
            'billing.plan_hire.created', 'user_1', 'user', ${randomUUID()},
            ${randomUUID()}, 'billing_plan_hire', 'audit:hire:1',
            ${tx.json({ planId: "plan_1" })}, 'request_1', ${storeId}, ${tenantId}
          )
        `;
        const [countRow] = await tx<Array<{ count: number }>>`
          SELECT count(*)::int AS count FROM billing_audit_outbox
        `;
        expect(countRow?.count).toBe(1);
        const constraints = await tx<Array<{ name: string }>>`
          SELECT conname AS name
          FROM pg_constraint
          WHERE conrelid = 'billing_audit_outbox'::regclass
        `;
        expect(constraints.map((row) => row.name)).toEqual(
          expect.arrayContaining([
            "billing_audit_outbox_metadata_check",
            "billing_audit_outbox_store_tenant_fk",
          ]),
        );
      });
    } finally {
      await sql.end();
    }
  });
});
