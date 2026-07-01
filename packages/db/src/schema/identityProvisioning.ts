import { sql } from "drizzle-orm";
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
import { lifecycleColumns } from "./_shared.js";
import {
  membershipStatus,
  roleTemplates,
  stores,
  tenants,
  users,
} from "./identity.js";

export const identityInvitationStatus = pgEnum("identity_invitation_status", [
  "pending",
  "sent",
  "accepted",
  "revoked",
  "expired",
  "send_failed",
]);

export const tenantMemberships = pgTable(
  "tenant_memberships",
  {
    ...lifecycleColumns,
    roleTemplateId: uuid("role_template_id")
      .notNull()
      .references(() => roleTemplates.id),
    status: membershipStatus("status").notNull().default("active"),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
  },
  (table) => [
    index("tenant_memberships_role_template_id_idx").on(table.roleTemplateId),
    index("tenant_memberships_tenant_id_idx").on(table.tenantId),
    uniqueIndex("tenant_memberships_tenant_user_unique").on(
      table.tenantId,
      table.userId,
    ),
  ],
);

export const platformAdminMemberships = pgTable(
  "platform_admin_memberships",
  {
    ...lifecycleColumns,
    status: membershipStatus("status").notNull().default("active"),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
  },
  (table) => [
    index("platform_admin_memberships_status_idx").on(table.status),
    uniqueIndex("platform_admin_memberships_user_unique").on(table.userId),
  ],
);

export const identityInvitations = pgTable(
  "identity_invitations",
  {
    ...lifecycleColumns,
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    clerkInvitationId: varchar("clerk_invitation_id", { length: 191 }),
    email: varchar("email", { length: 254 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    invitedByUserId: uuid("invited_by_user_id").references(() => users.id),
    metadata: jsonb("metadata").notNull().default({}),
    roleTemplateId: uuid("role_template_id")
      .notNull()
      .references(() => roleTemplates.id),
    status: identityInvitationStatus("status").notNull().default("pending"),
    storeId: uuid("store_id").references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    index("identity_invitations_email_idx").on(table.email),
    index("identity_invitations_status_idx").on(table.status),
    index("identity_invitations_store_id_idx").on(table.storeId),
    index("identity_invitations_tenant_id_idx").on(table.tenantId),
    uniqueIndex("identity_invitations_active_store_unique")
      .on(table.tenantId, table.storeId, table.email, table.roleTemplateId)
      .where(
        sql`${table.status} in ('pending', 'sent') and ${table.storeId} is not null`,
      ),
    uniqueIndex("identity_invitations_active_tenant_unique")
      .on(table.tenantId, table.email, table.roleTemplateId)
      .where(
        sql`${table.status} in ('pending', 'sent') and ${table.storeId} is null`,
      ),
  ],
);
