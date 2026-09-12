import { readFileSync } from "node:fs";
import { getTableConfig, type AnyPgTable } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  fiscalDocumentLinks,
  fiscalDocuments,
  fiscalDocumentSnapshots,
  fiscalEvents,
  fiscalProviderConnections,
  fiscalServiceInvoiceTemplates,
  fiscalServiceRecipients,
} from "./index.js";

const migrationSql = readFileSync(
  new URL("../migrations/0066_fiscal_scope_integrity.sql", import.meta.url),
  "utf8",
);

describe("fiscal scope integrity", () => {
  it("models exact store scope for every targeted fiscal root and child", () => {
    expectForeignKey(
      fiscalProviderConnections,
      "fiscal_provider_connections_store_scope_fk",
      ["store_id", "tenant_id"],
      ["id", "tenant_id"],
    );
    expectForeignKey(
      fiscalServiceRecipients,
      "fiscal_service_recipients_store_scope_fk",
      ["store_id", "tenant_id"],
      ["id", "tenant_id"],
    );
    expectForeignKey(
      fiscalServiceInvoiceTemplates,
      "fiscal_service_invoice_templates_store_scope_fk",
      ["store_id", "tenant_id"],
      ["id", "tenant_id"],
    );
    expectForeignKey(
      fiscalDocuments,
      "fiscal_documents_store_scope_fk",
      ["store_id", "tenant_id"],
      ["id", "tenant_id"],
    );
    for (const [table, name] of [
      [fiscalDocumentSnapshots, "fiscal_document_snapshots_store_scope_fk"],
      [fiscalEvents, "fiscal_events_store_scope_fk"],
      [fiscalDocumentLinks, "fiscal_document_links_store_scope_fk"],
    ] as const) {
      expectForeignKey(
        table,
        name,
        ["store_id", "tenant_id"],
        ["id", "tenant_id"],
      );
    }
  });

  it("models exact recipient and template scope references", () => {
    expectForeignKey(
      fiscalServiceRecipients,
      "fiscal_service_recipients_default_template_scope_fk",
      ["default_service_template_id", "tenant_id", "store_id"],
      ["id", "tenant_id", "store_id"],
    );
    expectForeignKey(
      fiscalServiceInvoiceTemplates,
      "fiscal_service_invoice_templates_recipient_scope_fk",
      ["recipient_id", "tenant_id", "store_id"],
      ["id", "tenant_id", "store_id"],
    );
    expectForeignKey(
      fiscalDocuments,
      "fiscal_documents_recipient_scope_fk",
      ["recipient_id", "tenant_id", "store_id"],
      ["id", "tenant_id", "store_id"],
    );
    expectForeignKey(
      fiscalDocuments,
      "fiscal_documents_template_scope_fk",
      ["template_id", "tenant_id", "store_id"],
      ["id", "tenant_id", "store_id"],
    );
  });

  it("models exact document scope for snapshots, events, and links", () => {
    for (const [table, name] of [
      [fiscalDocumentSnapshots, "fiscal_document_snapshots_document_scope_fk"],
      [fiscalEvents, "fiscal_events_document_scope_fk"],
      [fiscalDocumentLinks, "fiscal_document_links_document_scope_fk"],
    ] as const) {
      expectForeignKey(
        table,
        name,
        ["fiscal_document_id", "tenant_id", "store_id"],
        ["id", "tenant_id", "store_id"],
      );
    }
    expectScopedUniqueIndex(
      fiscalServiceRecipients,
      "fiscal_service_recipients_id_scope_unique",
    );
    expectScopedUniqueIndex(
      fiscalServiceInvoiceTemplates,
      "fiscal_service_invoice_templates_id_scope_unique",
    );
    expectScopedUniqueIndex(
      fiscalDocuments,
      "fiscal_documents_id_scope_unique",
    );
  });

  it("fails closed on ambiguous roots and repairs only parent-owned child scope", () => {
    expect(migrationSql).toContain("Fiscal root scope integrity blocked");
    expect(migrationSql).toContain(
      "Fiscal catalog reference integrity blocked",
    );
    expect(migrationSql).toContain(
      'LEFT JOIN "fiscal_service_invoice_templates" AS "template"',
    );
    expect(migrationSql).toContain(
      'LEFT JOIN "fiscal_service_recipients" AS "recipient"',
    );
    expect(migrationSql).not.toContain("DELETE FROM");

    for (const [tableName, constraintName] of [
      [
        "fiscal_document_snapshots",
        "fiscal_document_snapshots_document_scope_fk",
      ],
      ["fiscal_events", "fiscal_events_document_scope_fk"],
      ["fiscal_document_links", "fiscal_document_links_document_scope_fk"],
    ] as const) {
      const repairOffset = migrationSql.indexOf(`UPDATE "${tableName}"`);
      const constraintOffset = migrationSql.indexOf(
        `ADD CONSTRAINT "${constraintName}"`,
      );
      expect(repairOffset).toBeGreaterThan(-1);
      expect(constraintOffset).toBeGreaterThan(repairOffset);
    }
  });
});

function expectForeignKey(
  table: AnyPgTable,
  name: string,
  columns: string[],
  foreignColumns: string[],
) {
  const key = getTableConfig(table).foreignKeys.find(
    (entry) => entry.getName() === name,
  );
  expect(key?.reference().columns.map((column) => column.name)).toEqual(
    columns,
  );
  expect(key?.reference().foreignColumns.map((column) => column.name)).toEqual(
    foreignColumns,
  );
}

function expectScopedUniqueIndex(table: AnyPgTable, name: string) {
  const index = getTableConfig(table).indexes.find(
    ({ config }) => config.name === name,
  );
  expect(index?.config.unique).toBe(true);
  expect(
    index?.config.columns.map((column) =>
      "name" in column ? column.name : undefined,
    ),
  ).toEqual(["id", "tenant_id", "store_id"]);
}
