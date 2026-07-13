import { sql } from "drizzle-orm";
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
import { leads } from "./leads.js";
import { stores, tenants, users } from "./identity.js";
import { vehicleUnits } from "./inventory.js";
import { lifecycleColumns, softDeleteColumns } from "./_shared.js";

export const saleStatus = pgEnum("sale_status", [
  "draft",
  "pending",
  "closed",
  "cancelled",
]);

export const salePaymentStatus = pgEnum("sale_payment_status", [
  "pending",
  "paid",
  "refunded",
  "cancelled",
]);

export const sales = pgTable(
  "sales",
  {
    ...lifecycleColumns,
    ...softDeleteColumns,
    buyerSnapshot: jsonb("buyer_snapshot").notNull().default({}),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    correctionOfSaleId: uuid("correction_of_sale_id"),
    documentPolicySnapshot: jsonb("document_policy_snapshot")
      .notNull()
      .default({}),
    isCurrentRevision: boolean("is_current_revision").notNull().default(true),
    leadId: uuid("lead_id").references(() => leads.id),
    listingSnapshot: jsonb("listing_snapshot").notNull().default({}),
    overrideReason: text("override_reason"),
    overrideRequiredFields: boolean("override_required_fields")
      .notNull()
      .default(false),
    revision: integer("revision").notNull().default(1),
    salePriceCents: integer("sale_price_cents"),
    saleSourceSnapshot: jsonb("sale_source_snapshot").notNull().default({}),
    selectedDocumentKinds: jsonb("selected_document_kinds")
      .notNull()
      .default([]),
    sellerUserId: uuid("seller_user_id").references(() => users.id),
    status: saleStatus("status").notNull().default("draft"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    unitId: uuid("unit_id").references(() => vehicleUnits.id),
  },
  (table) => [
    index("sales_closed_at_idx").on(table.closedAt),
    index("sales_lead_id_idx").on(table.leadId),
    index("sales_seller_user_id_idx").on(table.sellerUserId),
    index("sales_store_status_idx").on(table.storeId, table.status),
    index("sales_unit_id_idx").on(table.unitId),
    uniqueIndex("sales_current_unit_unique")
      .on(table.unitId)
      .where(
        sql`${table.unitId} is not null
          and ${table.isCurrentRevision} = true
          and ${table.isDeleted} = false
          and ${table.deletedAt} is null
          and ${table.status} <> 'cancelled'`,
      ),
  ],
);

export const saleItems = pgTable(
  "sale_items",
  {
    ...lifecycleColumns,
    amountCents: integer("amount_cents").notNull(),
    itemType: varchar("item_type", { length: 80 }).notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    saleId: uuid("sale_id")
      .notNull()
      .references(() => sales.id),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    index("sale_items_sale_id_idx").on(table.saleId),
    index("sale_items_store_id_idx").on(table.storeId),
  ],
);

export const salePayments = pgTable(
  "sale_payments",
  {
    ...lifecycleColumns,
    amountCents: integer("amount_cents").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    extraCents: integer("extra_cents").notNull().default(0),
    installments: integer("installments"),
    metadata: jsonb("metadata").notNull().default({}),
    method: varchar("method", { length: 80 }).notNull(),
    principalCents: integer("principal_cents").notNull().default(0),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    providerPaymentId: varchar("provider_payment_id", { length: 191 }),
    saleId: uuid("sale_id")
      .notNull()
      .references(() => sales.id),
    status: salePaymentStatus("status").notNull().default("pending"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    index("sale_payments_sale_id_idx").on(table.saleId),
    index("sale_payments_status_idx").on(table.status),
  ],
);
