import {
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { lifecycleColumns } from "./_shared.js";
import {
  fiscalServiceInvoiceTemplates,
  fiscalServiceRecipients,
} from "./fiscalCatalog.js";
import { stores, tenants } from "./identity.js";

export const fiscalDocumentKind = pgEnum("fiscal_document_kind", [
  "nfe",
  "nfse",
]);

export const fiscalDocumentStatus = pgEnum("fiscal_document_status", [
  "draft",
  "queued",
  "processing",
  "issued",
  "authorized",
  "rejected",
  "cancelled",
  "failed",
  "error",
]);

export const fiscalLinkTarget = pgEnum("fiscal_link_target", [
  "sale",
  "lead",
  "finance_entry",
  "store_event",
]);

export const fiscalConnectionStatus = pgEnum("fiscal_connection_status", [
  "not_configured",
  "pending_review",
  "ready",
  "error",
]);

export const fiscalDefaultsStatus = pgEnum("fiscal_defaults_status", [
  "missing",
  "unconfirmed",
  "confirmed",
]);

export const fiscalProviderConnections = pgTable(
  "fiscal_provider_connections",
  {
    ...lifecycleColumns,
    capabilities: jsonb("capabilities").notNull().default({}),
    certificateExpiresAt: timestamp("certificate_expires_at", {
      withTimezone: true,
    }),
    companyId: varchar("company_id", { length: 191 }),
    credentialCiphertext: text("credential_ciphertext"),
    defaultsConfirmedAt: timestamp("defaults_confirmed_at", {
      withTimezone: true,
    }),
    defaultsConfirmedBy: varchar("defaults_confirmed_by", { length: 191 }),
    defaultsStatus: fiscalDefaultsStatus("defaults_status")
      .notNull()
      .default("missing"),
    issuerProfile: jsonb("issuer_profile").notNull().default({}),
    lastErrorCode: varchar("last_error_code", { length: 120 }),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    provider: varchar("provider", { length: 80 }).notNull().default("spedy"),
    status: fiscalConnectionStatus("status")
      .notNull()
      .default("not_configured"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    taxDefaults: jsonb("tax_defaults").notNull().default({}),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    webhookRegisteredAt: timestamp("webhook_registered_at", {
      withTimezone: true,
    }),
  },
  (table) => [
    foreignKey({
      columns: [table.storeId, table.tenantId],
      foreignColumns: [stores.id, stores.tenantId],
      name: "fiscal_provider_connections_store_scope_fk",
    }),
    uniqueIndex("fiscal_provider_connections_store_provider_unique").on(
      table.storeId,
      table.provider,
    ),
    uniqueIndex("fiscal_provider_connections_company_provider_unique").on(
      table.companyId,
      table.provider,
    ),
    index("fiscal_provider_connections_tenant_store_idx").on(
      table.tenantId,
      table.storeId,
    ),
  ],
);

export const fiscalDocuments = pgTable(
  "fiscal_documents",
  {
    ...lifecycleColumns,
    accessKey: varchar("access_key", { length: 120 }),
    documentKind: fiscalDocumentKind("document_kind").notNull().default("nfe"),
    documentType: varchar("document_type", { length: 80 }).notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    metadata: jsonb("metadata").notNull().default({}),
    provider: varchar("provider", { length: 80 }).notNull().default("spedy"),
    providerDocumentId: varchar("provider_document_id", { length: 191 }),
    recipientId: uuid("recipient_id").references(
      () => fiscalServiceRecipients.id,
    ),
    status: fiscalDocumentStatus("status").notNull().default("draft"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    templateId: uuid("template_id").references(
      () => fiscalServiceInvoiceTemplates.id,
    ),
    templateVersion: integer("template_version"),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    foreignKey({
      columns: [table.storeId, table.tenantId],
      foreignColumns: [stores.id, stores.tenantId],
      name: "fiscal_documents_store_scope_fk",
    }),
    foreignKey({
      columns: [table.recipientId, table.tenantId, table.storeId],
      foreignColumns: [
        fiscalServiceRecipients.id,
        fiscalServiceRecipients.tenantId,
        fiscalServiceRecipients.storeId,
      ],
      name: "fiscal_documents_recipient_scope_fk",
    }),
    foreignKey({
      columns: [table.templateId, table.tenantId, table.storeId],
      foreignColumns: [
        fiscalServiceInvoiceTemplates.id,
        fiscalServiceInvoiceTemplates.tenantId,
        fiscalServiceInvoiceTemplates.storeId,
      ],
      name: "fiscal_documents_template_scope_fk",
    }),
    index("fiscal_documents_store_status_idx").on(table.storeId, table.status),
    uniqueIndex("fiscal_documents_id_scope_unique").on(
      table.id,
      table.tenantId,
      table.storeId,
    ),
    uniqueIndex("fiscal_documents_provider_document_unique").on(
      table.storeId,
      table.provider,
      table.providerDocumentId,
    ),
  ],
);

export const fiscalDocumentSnapshots = pgTable(
  "fiscal_document_snapshots",
  {
    ...lifecycleColumns,
    actorId: varchar("actor_id", { length: 191 }),
    fiscalDocumentId: uuid("fiscal_document_id")
      .notNull()
      .references(() => fiscalDocuments.id),
    providerPayload: jsonb("provider_payload").notNull().default({}),
    providerResponse: jsonb("provider_response").notNull().default({}),
    renderedDescription: text("rendered_description"),
    snapshotType: varchar("snapshot_type", { length: 80 }).notNull(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    foreignKey({
      columns: [table.storeId, table.tenantId],
      foreignColumns: [stores.id, stores.tenantId],
      name: "fiscal_document_snapshots_store_scope_fk",
    }),
    foreignKey({
      columns: [table.fiscalDocumentId, table.tenantId, table.storeId],
      foreignColumns: [
        fiscalDocuments.id,
        fiscalDocuments.tenantId,
        fiscalDocuments.storeId,
      ],
      name: "fiscal_document_snapshots_document_scope_fk",
    }),
    index("fiscal_document_snapshots_document_id_idx").on(
      table.fiscalDocumentId,
    ),
    index("fiscal_document_snapshots_store_id_idx").on(table.storeId),
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
    foreignKey({
      columns: [table.storeId, table.tenantId],
      foreignColumns: [stores.id, stores.tenantId],
      name: "fiscal_document_links_store_scope_fk",
    }),
    foreignKey({
      columns: [table.fiscalDocumentId, table.tenantId, table.storeId],
      foreignColumns: [
        fiscalDocuments.id,
        fiscalDocuments.tenantId,
        fiscalDocuments.storeId,
      ],
      name: "fiscal_document_links_document_scope_fk",
    }),
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
    foreignKey({
      columns: [table.storeId, table.tenantId],
      foreignColumns: [stores.id, stores.tenantId],
      name: "fiscal_events_store_scope_fk",
    }),
    foreignKey({
      columns: [table.fiscalDocumentId, table.tenantId, table.storeId],
      foreignColumns: [
        fiscalDocuments.id,
        fiscalDocuments.tenantId,
        fiscalDocuments.storeId,
      ],
      name: "fiscal_events_document_scope_fk",
    }),
    index("fiscal_events_document_id_idx").on(table.fiscalDocumentId),
    index("fiscal_events_store_id_idx").on(table.storeId),
  ],
);
