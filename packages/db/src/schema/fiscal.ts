import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { stores, tenants } from "./identity.js";
import { lifecycleColumns } from "./_shared.js";

export const fiscalDocumentStatus = pgEnum("fiscal_document_status", [
  "draft",
  "issued",
  "cancelled",
  "failed",
]);

export const fiscalLinkTarget = pgEnum("fiscal_link_target", [
  "sale",
  "lead",
  "finance_entry",
  "store_event",
]);

export const fiscalDocuments = pgTable(
  "fiscal_documents",
  {
    ...lifecycleColumns,
    accessKey: varchar("access_key", { length: 120 }),
    documentType: varchar("document_type", { length: 80 }).notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    metadata: jsonb("metadata").notNull().default({}),
    provider: varchar("provider", { length: 80 }).notNull().default("spedy"),
    providerDocumentId: varchar("provider_document_id", { length: 191 }),
    status: fiscalDocumentStatus("status").notNull().default("draft"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    index("fiscal_documents_store_status_idx").on(table.storeId, table.status),
    uniqueIndex("fiscal_documents_provider_document_unique").on(
      table.provider,
      table.providerDocumentId,
    ),
  ],
);

export const fiscalDocumentLinks = pgTable(
  "fiscal_document_links",
  {
    ...lifecycleColumns,
    fiscalDocumentId: uuid("fiscal_document_id")
      .notNull()
      .references(() => fiscalDocuments.id),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    targetId: uuid("target_id").notNull(),
    targetType: fiscalLinkTarget("target_type").notNull(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    index("fiscal_document_links_document_id_idx").on(table.fiscalDocumentId),
    index("fiscal_document_links_target_idx").on(
      table.targetType,
      table.targetId,
    ),
  ],
);

export const fiscalEvents = pgTable(
  "fiscal_events",
  {
    ...lifecycleColumns,
    eventType: varchar("event_type", { length: 120 }).notNull(),
    fiscalDocumentId: uuid("fiscal_document_id")
      .notNull()
      .references(() => fiscalDocuments.id),
    metadata: jsonb("metadata").notNull().default({}),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    index("fiscal_events_document_id_idx").on(table.fiscalDocumentId),
    index("fiscal_events_store_id_idx").on(table.storeId),
  ],
);
