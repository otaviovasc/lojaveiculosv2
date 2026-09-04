import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import postgres, { type TransactionSql } from "postgres";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../migrations/0066_fiscal_scope_integrity.sql", import.meta.url),
  "utf8",
);
const runRawDb = process.env.RUN_RAW_FISCAL_SCOPE_INTEGRITY_TESTS === "true";

describe.skipIf(!runRawDb)("fiscal scope integrity on Postgres", () => {
  it("repairs child scope and installs all composite constraints", async () => {
    expect(
      process.env.DATABASE_URL,
      "DATABASE_URL is required for raw fiscal scope validation",
    ).toBeTruthy();
    const sql = postgres(process.env.DATABASE_URL ?? "", {
      max: 1,
      prepare: false,
    });
    const rollback = new Error("rollback fiscal scope repair test");

    try {
      await sql.begin(async (transaction) => {
        const fixture = await createFixture(transaction);
        await transaction.unsafe(migration);

        const [mismatches] = await transaction<{ mismatch_count: number }[]>`
          SELECT count(*)::integer AS mismatch_count
          FROM (
            SELECT snapshot.store_id, snapshot.tenant_id, snapshot.fiscal_document_id
            FROM fiscal_document_snapshots AS snapshot
            WHERE snapshot.id = ${fixture.snapshotId}
            UNION ALL
            SELECT event.store_id, event.tenant_id, event.fiscal_document_id
            FROM fiscal_events AS event
            WHERE event.id = ${fixture.eventId}
            UNION ALL
            SELECT link.store_id, link.tenant_id, link.fiscal_document_id
            FROM fiscal_document_links AS link
            WHERE link.id = ${fixture.linkId}
          ) AS child
          INNER JOIN fiscal_documents AS document
            ON document.id = child.fiscal_document_id
          WHERE child.store_id IS DISTINCT FROM document.store_id
             OR child.tenant_id IS DISTINCT FROM document.tenant_id
        `;
        expect(mismatches?.mismatch_count).toBe(0);

        const [constraints] = await transaction<{ count: number }[]>`
          SELECT count(*)::integer AS count
          FROM pg_constraint
          WHERE conname IN (
            'fiscal_provider_connections_store_scope_fk',
            'fiscal_service_recipients_store_scope_fk',
            'fiscal_service_recipients_default_template_scope_fk',
            'fiscal_service_invoice_templates_store_scope_fk',
            'fiscal_service_invoice_templates_recipient_scope_fk',
            'fiscal_documents_store_scope_fk',
            'fiscal_documents_recipient_scope_fk',
            'fiscal_documents_template_scope_fk',
            'fiscal_document_snapshots_store_scope_fk',
            'fiscal_document_snapshots_document_scope_fk',
            'fiscal_events_store_scope_fk',
            'fiscal_events_document_scope_fk',
            'fiscal_document_links_store_scope_fk',
            'fiscal_document_links_document_scope_fk'
          )
        `;
        expect(constraints?.count).toBe(14);

        await expect(
          transaction.savepoint(async (savepoint) => {
            await savepoint`
              UPDATE fiscal_provider_connections
              SET tenant_id = ${fixture.alternate.tenantId}
              WHERE id = ${fixture.connectionId}
            `;
          }),
        ).rejects.toMatchObject({ code: "23503" });
        await expect(
          transaction.savepoint(async (savepoint) => {
            await savepoint`
              UPDATE fiscal_service_invoice_templates
              SET recipient_id = ${fixture.alternateRecipientId}
              WHERE id = ${fixture.templateId}
            `;
          }),
        ).rejects.toMatchObject({ code: "23503" });
        await expect(
          transaction.savepoint(async (savepoint) => {
            await savepoint`
              UPDATE fiscal_document_snapshots
              SET store_id = ${fixture.alternate.storeId},
                  tenant_id = ${fixture.alternate.tenantId}
              WHERE id = ${fixture.snapshotId}
            `;
          }),
        ).rejects.toMatchObject({ code: "23503" });
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    } finally {
      await sql.end();
    }
  });

  it("fails closed when a connection tenant differs from its store", async () => {
    expect(process.env.DATABASE_URL).toBeTruthy();
    const sql = postgres(process.env.DATABASE_URL ?? "", {
      max: 1,
      prepare: false,
    });
    try {
      await expect(
        sql.begin(async (transaction) => {
          const first = await createTenantStore(transaction, "first");
          const second = await createTenantStore(transaction, "second");
          await transaction`
            INSERT INTO fiscal_provider_connections (
              provider, status, store_id, tenant_id
            ) VALUES ('spedy', 'not_configured', ${first.storeId}, ${second.tenantId})
          `;
          await transaction.unsafe(migration);
        }),
      ).rejects.toThrow("Fiscal root scope integrity blocked");
    } finally {
      await sql.end();
    }
  });
});

async function createFixture(transaction: TransactionSql) {
  const primary = await createTenantStore(transaction, "primary");
  const alternate = await createTenantStore(transaction, "alternate");
  const connectionId = randomUUID();
  const recipientId = randomUUID();
  const alternateRecipientId = randomUUID();
  const templateId = randomUUID();
  const documentId = randomUUID();
  const snapshotId = randomUUID();
  const eventId = randomUUID();
  const linkId = randomUUID();

  await transaction`
    INSERT INTO fiscal_provider_connections (
      id, provider, status, store_id, tenant_id
    ) VALUES (${connectionId}, 'spedy', 'not_configured',
      ${primary.storeId}, ${primary.tenantId})
  `;
  await transaction`
    INSERT INTO fiscal_service_recipients (
      id, document_number, document_type, legal_name, store_id, tenant_id
    ) VALUES (${alternateRecipientId}, '98765432100', 'cpf', 'Alternate recipient',
      ${alternate.storeId}, ${alternate.tenantId})
  `;
  await transaction`
    INSERT INTO fiscal_service_recipients (
      id, document_number, document_type, legal_name, store_id, tenant_id
    ) VALUES (${recipientId}, '12345678901', 'cpf', 'Test recipient',
      ${primary.storeId}, ${primary.tenantId})
  `;
  await transaction`
    INSERT INTO fiscal_service_invoice_templates (
      id, description_template, name, recipient_id, service_national_code,
      store_id, tenant_id, use_case
    ) VALUES (${templateId}, 'Test service', 'Test template', ${recipientId},
      '010101', ${primary.storeId}, ${primary.tenantId}, 'other')
  `;
  await transaction`
    UPDATE fiscal_service_recipients
    SET default_service_template_id = ${templateId}
    WHERE id = ${recipientId}
  `;
  await transaction`
    INSERT INTO fiscal_documents (
      id, document_type, recipient_id, status, store_id, template_id, tenant_id
    ) VALUES (${documentId}, 'nfse_service', ${recipientId}, 'draft',
      ${primary.storeId}, ${templateId}, ${primary.tenantId})
  `;
  await transaction`
    INSERT INTO fiscal_document_snapshots (
      id, fiscal_document_id, snapshot_type, store_id, tenant_id
    ) VALUES (${snapshotId}, ${documentId}, 'test',
      ${alternate.storeId}, ${alternate.tenantId})
  `;
  await transaction`
    INSERT INTO fiscal_events (
      id, event_type, fiscal_document_id, occurred_at, store_id, tenant_id
    ) VALUES (${eventId}, 'test', ${documentId}, now(),
      ${alternate.storeId}, ${alternate.tenantId})
  `;
  await transaction`
    INSERT INTO fiscal_document_links (
      id, fiscal_document_id, store_id, target_id, target_type, tenant_id
    ) VALUES (${linkId}, ${documentId}, ${alternate.storeId}, ${randomUUID()},
      'sale', ${alternate.tenantId})
  `;
  return {
    alternate,
    alternateRecipientId,
    connectionId,
    eventId,
    linkId,
    snapshotId,
    templateId,
  };
}

async function createTenantStore(transaction: TransactionSql, label: string) {
  const tenantId = randomUUID();
  const storeId = randomUUID();
  await transaction`
    INSERT INTO tenants (id, legal_name, slug, trading_name)
    VALUES (${tenantId}, ${`Fiscal ${label}`}, ${`fiscal-${label}-${tenantId}`},
      ${`Fiscal ${label}`})
  `;
  await transaction`
    INSERT INTO stores (id, public_slug, tenant_id, trading_name)
    VALUES (${storeId}, ${`fiscal-${label}-${storeId}`}, ${tenantId},
      ${`Fiscal ${label}`})
  `;
  return { storeId, tenantId };
}
