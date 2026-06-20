import { relations } from "drizzle-orm";
import {
  index,
  boolean,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { lifecycleColumns, softDeleteColumns } from "./_shared.js";

export const membershipStatus = pgEnum("membership_status", [
  "active",
  "invited",
  "suspended",
]);

export const entitlementStatus = pgEnum("entitlement_status", [
  "active",
  "inactive",
  "trialing",
  "suspended",
]);

export const roleTemplateKey = pgEnum("role_template_key", [
  "agency",
  "admin",
  "investor",
  "owner",
  "salesman",
  "supervisor",
]);

export const tenants = pgTable(
  "tenants",
  {
    ...lifecycleColumns,
    ...softDeleteColumns,
    legalName: varchar("legal_name", { length: 191 }).notNull(),
    slug: varchar("slug", { length: 80 }).notNull(),
    tradingName: varchar("trading_name", { length: 191 }).notNull(),
  },
  (table) => [uniqueIndex("tenants_slug_unique").on(table.slug)],
);

export const stores = pgTable(
  "stores",
  {
    ...lifecycleColumns,
    ...softDeleteColumns,
    legalName: varchar("legal_name", { length: 191 }),
    primaryDomain: varchar("primary_domain", { length: 191 }),
    publicSlug: varchar("public_slug", { length: 80 }).notNull(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    tradingName: varchar("trading_name", { length: 191 }).notNull(),
  },
  (table) => [
    index("stores_tenant_id_idx").on(table.tenantId),
    uniqueIndex("stores_public_slug_unique").on(table.publicSlug),
  ],
);

export const users = pgTable(
  "users",
  {
    ...lifecycleColumns,
    ...softDeleteColumns,
    clerkUserId: varchar("clerk_user_id", { length: 191 }).notNull(),
    email: varchar("email", { length: 254 }).notNull(),
    name: text("name"),
    tenantId: uuid("tenant_id").references(() => tenants.id),
  },
  (table) => [
    index("users_tenant_id_idx").on(table.tenantId),
    uniqueIndex("users_clerk_user_id_unique").on(table.clerkUserId),
    uniqueIndex("users_email_unique").on(table.email),
  ],
);

export const roleTemplates = pgTable(
  "role_templates",
  {
    ...lifecycleColumns,
    description: text("description"),
    isSystem: boolean("is_system").notNull().default(true),
    name: varchar("name", { length: 120 }).notNull(),
    roleKey: roleTemplateKey("role_key").notNull(),
  },
  (table) => [uniqueIndex("role_templates_role_key_unique").on(table.roleKey)],
);

export const roleTemplatePermissions = pgTable(
  "role_template_permissions",
  {
    ...lifecycleColumns,
    permissionKey: varchar("permission_key", { length: 120 }).notNull(),
    roleTemplateId: uuid("role_template_id")
      .notNull()
      .references(() => roleTemplates.id),
  },
  (table) => [
    index("role_template_permissions_permission_key_idx").on(
      table.permissionKey,
    ),
    uniqueIndex("role_template_permissions_unique").on(
      table.roleTemplateId,
      table.permissionKey,
    ),
  ],
);

export const storeMemberships = pgTable(
  "store_memberships",
  {
    ...lifecycleColumns,
    roleTemplateId: uuid("role_template_id")
      .notNull()
      .references(() => roleTemplates.id),
    status: membershipStatus("status").notNull().default("active"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
  },
  (table) => [
    index("store_memberships_role_template_id_idx").on(table.roleTemplateId),
    index("store_memberships_tenant_id_idx").on(table.tenantId),
    uniqueIndex("store_memberships_store_user_unique").on(
      table.storeId,
      table.userId,
    ),
  ],
);

export const membershipPermissionOverrides = pgTable(
  "membership_permission_overrides",
  {
    ...lifecycleColumns,
    allowed: boolean("allowed").notNull(),
    membershipId: uuid("membership_id")
      .notNull()
      .references(() => storeMemberships.id),
    permissionKey: varchar("permission_key", { length: 120 }).notNull(),
    reason: text("reason"),
  },
  (table) => [
    index("membership_permission_overrides_membership_id_idx").on(
      table.membershipId,
    ),
    uniqueIndex("membership_permission_overrides_unique").on(
      table.membershipId,
      table.permissionKey,
    ),
  ],
);

export const storeEntitlements = pgTable(
  "store_entitlements",
  {
    ...lifecycleColumns,
    endsAt: timestamp("ends_at", { withTimezone: true }),
    featureKey: varchar("feature_key", { length: 80 }).notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    source: varchar("source", { length: 80 }).notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    status: entitlementStatus("status").notNull().default("active"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    index("store_entitlements_feature_key_idx").on(table.featureKey),
    index("store_entitlements_store_id_idx").on(table.storeId),
    uniqueIndex("store_entitlements_store_feature_unique").on(
      table.storeId,
      table.featureKey,
    ),
  ],
);

export const tenantRelations = relations(tenants, ({ many }) => ({
  stores: many(stores),
}));
