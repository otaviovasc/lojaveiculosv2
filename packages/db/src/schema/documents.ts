import {
  boolean,
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
import { stores, tenants, users } from "./identity.js";
import { lifecycleColumns, softDeleteColumns } from "./_shared.js";

export const documentKind = pgEnum("document_kind", [
  "delivery_term",
  "finance_receipt",
  "invoice",
  "vehicle_registration",
  "inspection",
  "power_of_attorney",
  "reservation_receipt",
  "sale_receipt",
  "sale_contract",
  "test_drive",
  "buyer_document",
  "internal",
  "other",
]);

export const documentStatus = pgEnum("document_status", [
  "draft",
  "pending_signature",
  "signed",
  "issued",
  "voided",
  "archived",
]);

export const documentLinkTarget = pgEnum("document_link_target", [
  "store",
  "vehicle_listing",
  "vehicle_unit",
  "lead",
  "sale",
  "sale_payment",
  "finance_entry",
  "financing_inquiry",
  "fiscal_document",
]);

export const documents = pgTable(
  "documents",
  {
    ...lifecycleColumns,
    ...softDeleteColumns,
    createdByUserId: uuid("created_by_user_id").references(() => users.id),
    fileName: varchar("file_name", { length: 191 }).notNull(),
    fileSizeBytes: integer("file_size_bytes"),
    kind: documentKind("kind").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    mimeType: varchar("mime_type", { length: 120 }),
    status: documentStatus("status").notNull().default("draft"),
    storageKey: text("storage_key").notNull(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    title: varchar("title", { length: 191 }).notNull(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("documents_created_by_user_id_idx").on(table.createdByUserId),
    index("documents_kind_idx").on(table.kind),
    index("documents_status_idx").on(table.status),
    index("documents_store_id_idx").on(table.storeId),
    index("documents_tenant_id_idx").on(table.tenantId),
  ],
);

export const documentLinks = pgTable(
  "document_links",
  {
    ...lifecycleColumns,
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id),
    linkRole: varchar("link_role", { length: 80 }).notNull().default("primary"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    targetId: uuid("target_id").notNull(),
    targetType: documentLinkTarget("target_type").notNull(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    index("document_links_document_id_idx").on(table.documentId),
    index("document_links_store_id_idx").on(table.storeId),
    index("document_links_target_idx").on(table.targetType, table.targetId),
    index("document_links_tenant_id_idx").on(table.tenantId),
    uniqueIndex("document_links_unique").on(
      table.documentId,
      table.targetType,
      table.targetId,
      table.linkRole,
    ),
  ],
);

export const documentVersions = pgTable(
  "document_versions",
  {
    ...lifecycleColumns,
    createdByUserId: uuid("created_by_user_id").references(() => users.id),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id),
    fileName: varchar("file_name", { length: 191 }).notNull(),
    fileSizeBytes: integer("file_size_bytes"),
    metadata: jsonb("metadata").notNull().default({}),
    mimeType: varchar("mime_type", { length: 120 }),
    storageKey: text("storage_key").notNull(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    versionNumber: integer("version_number").notNull(),
  },
  (table) => [
    index("document_versions_document_id_idx").on(table.documentId),
    index("document_versions_store_id_idx").on(table.storeId),
    index("document_versions_tenant_id_idx").on(table.tenantId),
    uniqueIndex("document_versions_document_number_unique").on(
      table.documentId,
      table.versionNumber,
    ),
  ],
);

export const documentTemplates = pgTable(
  "document_templates",
  {
    ...lifecycleColumns,
    clauses: jsonb("clauses").notNull().default([]),
    isEnabled: boolean("is_enabled").notNull().default(true),
    kind: documentKind("kind").notNull(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    title: varchar("title", { length: 191 }).notNull(),
    updatedByUserId: uuid("updated_by_user_id").references(() => users.id),
  },
  (table) => [
    index("document_templates_kind_idx").on(table.kind),
    index("document_templates_store_id_idx").on(table.storeId),
    index("document_templates_tenant_id_idx").on(table.tenantId),
    uniqueIndex("document_templates_store_kind_unique").on(
      table.storeId,
      table.kind,
    ),
  ],
);
