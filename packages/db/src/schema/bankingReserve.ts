import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { stores, tenants } from "./identity.js";
import { lifecycleColumns } from "./_shared.js";

export const paymentLinkStatus = pgEnum("payment_link_status", [
  "draft",
  "active",
  "paid",
  "cancelled",
  "expired",
]);

export const settlementStatus = pgEnum("settlement_status", [
  "pending",
  "held",
  "released",
  "cancelled",
]);

export const paymentLinks = pgTable(
  "payment_links",
  {
    ...lifecycleColumns,
    amountCents: integer("amount_cents").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    metadata: jsonb("metadata").notNull().default({}),
    provider: varchar("provider", { length: 80 }).notNull().default("asaas"),
    providerLinkId: varchar("provider_link_id", { length: 191 }),
    status: paymentLinkStatus("status").notNull().default("draft"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    index("payment_links_store_status_idx").on(table.storeId, table.status),
    index("payment_links_tenant_id_idx").on(table.tenantId),
  ],
);

export const settlements = pgTable(
  "settlements",
  {
    ...lifecycleColumns,
    feeAmountCents: integer("fee_amount_cents").notNull().default(0),
    grossAmountCents: integer("gross_amount_cents").notNull(),
    holdUntil: timestamp("hold_until", { withTimezone: true }),
    metadata: jsonb("metadata").notNull().default({}),
    netAmountCents: integer("net_amount_cents").notNull(),
    paymentLinkId: uuid("payment_link_id").references(() => paymentLinks.id),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    status: settlementStatus("status").notNull().default("pending"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    index("settlements_payment_link_id_idx").on(table.paymentLinkId),
    index("settlements_store_status_idx").on(table.storeId, table.status),
  ],
);
