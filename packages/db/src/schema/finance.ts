import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { leads } from "./leads.js";
import { sales } from "./sales.js";
import { stores, tenants, users } from "./identity.js";
import { vehicleListings, vehicleUnits } from "./inventory.js";
import { lifecycleColumns } from "./_shared.js";

export const financeEntryType = pgEnum("finance_entry_type", [
  "expense",
  "revenue",
  "commission",
]);

export const financeEntryStatus = pgEnum("finance_entry_status", [
  "pending",
  "paid",
  "cancelled",
]);

export const financeRecurrenceFrequency = pgEnum(
  "finance_recurrence_frequency",
  ["monthly", "weekly", "yearly"],
);

export const commissionRuleType = pgEnum("commission_rule_type", [
  "fixed_amount",
  "manual",
  "percentage",
]);

export const commissionRuleStatus = pgEnum("commission_rule_status", [
  "active",
  "inactive",
]);

export const financeLinkTarget = pgEnum("finance_link_target", [
  "document",
  "lead",
  "sale",
  "sale_payment",
  "vehicle_cost",
  "vehicle_listing",
  "vehicle_unit",
]);

export const financeEntries = pgTable(
  "finance_entries",
  {
    ...lifecycleColumns,
    amountCents: integer("amount_cents").notNull(),
    category: varchar("category", { length: 120 }).notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    metadata: jsonb("metadata").notNull().default({}),
    name: varchar("name", { length: 191 }).notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    sellerUserId: uuid("seller_user_id").references(() => users.id),
    status: financeEntryStatus("status").notNull().default("pending"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    type: financeEntryType("type").notNull(),
  },
  (table) => [
    index("finance_entries_due_at_idx").on(table.dueAt),
    index("finance_entries_seller_user_id_idx").on(table.sellerUserId),
    index("finance_entries_store_status_idx").on(table.storeId, table.status),
    index("finance_entries_type_idx").on(table.type),
  ],
);

export const financeEntryLinks = pgTable(
  "finance_entry_links",
  {
    ...lifecycleColumns,
    entryId: uuid("entry_id")
      .notNull()
      .references(() => financeEntries.id),
    targetId: uuid("target_id").notNull(),
    targetType: financeLinkTarget("target_type").notNull(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    index("finance_entry_links_entry_id_idx").on(table.entryId),
    index("finance_entry_links_target_idx").on(
      table.targetType,
      table.targetId,
    ),
  ],
);

export const financeRecurringEntries = pgTable(
  "finance_recurring_entries",
  {
    ...lifecycleColumns,
    amountCents: integer("amount_cents").notNull(),
    category: varchar("category", { length: 120 }).notNull(),
    dayOfMonth: integer("day_of_month"),
    frequency: financeRecurrenceFrequency("frequency").notNull(),
    lastGeneratedAt: timestamp("last_generated_at", { withTimezone: true }),
    metadata: jsonb("metadata").notNull().default({}),
    name: varchar("name", { length: 191 }).notNull(),
    nextDueAt: timestamp("next_due_at", { withTimezone: true }).notNull(),
    sellerUserId: uuid("seller_user_id").references(() => users.id),
    status: financeEntryStatus("status").notNull().default("pending"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    type: financeEntryType("type").notNull(),
  },
  (table) => [
    index("finance_recurring_entries_next_due_at_idx").on(table.nextDueAt),
    index("finance_recurring_entries_store_type_idx").on(
      table.storeId,
      table.type,
    ),
  ],
);

export const commissionRules = pgTable(
  "commission_rules",
  {
    ...lifecycleColumns,
    category: varchar("category", { length: 120 }).notNull(),
    fixedAmountCents: integer("fixed_amount_cents"),
    metadata: jsonb("metadata").notNull().default({}),
    name: varchar("name", { length: 191 }).notNull(),
    percentageBasisPoints: integer("percentage_basis_points"),
    sellerUserId: uuid("seller_user_id").references(() => users.id),
    status: commissionRuleStatus("status").notNull().default("active"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    type: commissionRuleType("type").notNull(),
  },
  (table) => [
    index("commission_rules_seller_user_id_idx").on(table.sellerUserId),
    index("commission_rules_store_status_idx").on(table.storeId, table.status),
  ],
);

export const commissions = pgTable(
  "commissions",
  {
    ...lifecycleColumns,
    amountCents: integer("amount_cents").notNull(),
    entryId: uuid("entry_id").references(() => financeEntries.id),
    metadata: jsonb("metadata").notNull().default({}),
    saleId: uuid("sale_id").references(() => sales.id),
    sellerUserId: uuid("seller_user_id")
      .notNull()
      .references(() => users.id),
    status: financeEntryStatus("status").notNull().default("pending"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    index("commissions_sale_id_idx").on(table.saleId),
    index("commissions_seller_user_id_idx").on(table.sellerUserId),
  ],
);

export const financingInquiries = pgTable(
  "financing_inquiries",
  {
    ...lifecycleColumns,
    completedAt: timestamp("completed_at", { withTimezone: true }),
    leadId: uuid("lead_id").references(() => leads.id),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => vehicleListings.id),
    metadata: jsonb("metadata").notNull().default({}),
    provider: varchar("provider", { length: 80 }).notNull(),
    providerInquiryId: varchar("provider_inquiry_id", { length: 191 }),
    status: varchar("status", { length: 80 }).notNull().default("requested"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    unitId: uuid("unit_id").references(() => vehicleUnits.id),
  },
  (table) => [
    index("financing_inquiries_lead_id_idx").on(table.leadId),
    index("financing_inquiries_listing_id_idx").on(table.listingId),
    index("financing_inquiries_store_status_idx").on(
      table.storeId,
      table.status,
    ),
  ],
);

export const financingConditions = pgTable(
  "financing_conditions",
  {
    ...lifecycleColumns,
    bankName: varchar("bank_name", { length: 120 }).notNull(),
    inquiryId: uuid("inquiry_id")
      .notNull()
      .references(() => financingInquiries.id),
    installments: integer("installments").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    status: varchar("status", { length: 80 }).notNull(),
    summary: text("summary"),
    totalAmountCents: integer("total_amount_cents"),
  },
  (table) => [index("financing_conditions_inquiry_id_idx").on(table.inquiryId)],
);
