import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import postgres from "postgres";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../migrations/0057_canonical_crm_connection_foreign_keys.sql",
    import.meta.url,
  ),
  "utf8",
);
const runRawDb =
  process.env.RUN_RAW_CANONICAL_CRM_CONNECTION_FK_TESTS === "true";

describe.skipIf(!runRawDb)(
  "canonical CRM connection foreign keys on Postgres",
  () => {
    it("migrates populated campaign, tag, recipient, and intervention references", async () => {
      expect(
        process.env.DATABASE_URL,
        "DATABASE_URL is required for canonical CRM connection FK validation",
      ).toBeTruthy();

      const sql = postgres(process.env.DATABASE_URL ?? "", {
        max: 1,
        prepare: false,
      });
      const rollback = new Error("rollback canonical CRM connection FK test");

      try {
        await sql.begin(async (transaction) => {
          const tenantId = randomUUID();
          const storeId = randomUUID();
          const connectionId = randomUUID();
          const sessionId = randomUUID();
          const campaignId = randomUUID();

          await transaction`
            INSERT INTO tenants (id, legal_name, slug, trading_name)
            VALUES (
              ${tenantId},
              'Canonical FK test tenant',
              ${`canonical-fk-${tenantId}`},
              'Canonical FK test tenant'
            )
          `;
          await transaction`
            INSERT INTO stores (id, public_slug, tenant_id, trading_name)
            VALUES (
              ${storeId},
              ${`canonical-fk-${storeId}`},
              ${tenantId},
              'Canonical FK test store'
            )
          `;
          await transaction`
            INSERT INTO crm_connections (
              id, display_name, provider, store_id, tenant_id
            ) VALUES (
              ${connectionId}, 'Legacy FK test route', 'zapi', ${storeId}, ${tenantId}
            )
          `;
          await transaction`
            INSERT INTO crm_channel_connections (
              id, broker, channel, display_name, provider, state, store_id, tenant_id
            ) VALUES (
              ${connectionId}, 'direct', 'whatsapp', 'Canonical FK test route',
              'zapi', 'active', ${storeId}, ${tenantId}
            )
          `;
          await transaction`
            INSERT INTO crm_whatsapp_sessions (
              id, buyer_phone, connection_id, revision, store_id, tenant_id
            ) VALUES (${sessionId}, '+5511999999999', ${connectionId}, 1, ${storeId}, ${tenantId})
          `;
          await transaction`
            INSERT INTO crm_tags (connection_id, name, store_id, tenant_id)
            VALUES (${connectionId}, 'Canonical FK test', ${storeId}, ${tenantId})
          `;
          await transaction`
            INSERT INTO crm_whatsapp_campaigns (
              id, content, name, scheduled_end_at, scheduled_start_at,
              selected_connection_id, store_id, tenant_id
            ) VALUES (
              ${campaignId}, 'Test', 'Canonical FK test', now() + interval '1 hour',
              now(), ${connectionId}, ${storeId}, ${tenantId}
            )
          `;
          await transaction`
            INSERT INTO crm_whatsapp_campaign_recipients (
              campaign_id, connection_id, phone, sequence, session_id, store_id, tenant_id
            ) VALUES (
              ${campaignId}, ${connectionId}, '+5511999999999', 1,
              ${sessionId}, ${storeId}, ${tenantId}
            )
          `;
          await transaction`
            INSERT INTO crm_whatsapp_intervention_ledger (
              actor_id, actor_kind, connection_id, idempotency_key,
              intervention_id, next_state, reason, request_fingerprint,
              session_id, session_revision, source, store_id, tenant_id
            ) VALUES (
              'canonical-fk-test', 'system', ${connectionId}, ${randomUUID()},
              ${randomUUID()}, 'WAITING_HUMAN', 'Canonical FK test', ${randomUUID()},
              ${sessionId}, 1, 'migration-test', ${storeId}, ${tenantId}
            )
          `;
          await transaction.unsafe("SET CONSTRAINTS ALL IMMEDIATE");

          await transaction.unsafe(migration);

          const constraints = await transaction<
            { constraint_name: string; target_table: string }[]
          >`
            SELECT conname AS constraint_name, confrelid::regclass::text AS target_table
            FROM pg_constraint
            WHERE conname IN (
              'crm_tags_connection_fk',
              'crm_tags_scoped_connection_fk',
              'crm_whatsapp_campaigns_selected_connection_fk',
              'crm_whatsapp_campaigns_scoped_connection_fk',
              'crm_whatsapp_campaign_recipients_connection_fk',
              'crm_whatsapp_campaign_recipients_scoped_connection_fk',
              'crm_whatsapp_intervention_ledger_scoped_connection_fk'
            )
            ORDER BY conname
          `;

          expect(constraints).toHaveLength(7);
          expect(
            new Set(constraints.map(({ target_table }) => target_table)),
          ).toEqual(new Set(["crm_channel_connections"]));

          throw rollback;
        });
      } catch (error) {
        if (error !== rollback) throw error;
      } finally {
        await sql.end();
      }
    });
  },
);
