import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { lifecycleColumns, softDeleteColumns } from "../_shared.js";
import { storeMemberships, stores, tenants, users } from "../identity.js";
import { vehicleListings, vehicleUnits } from "../inventory.js";
import {
  acquisitionSource,
  contactIdentityKind,
  contactIdentityState,
  messagingChannel,
  opportunityState,
  transportProvider,
} from "./enums.js";
import { revisionCheck, revisionColumn } from "./revision.js";
import { scopedStoreForeignKey } from "./scoped.js";

export const contacts = pgTable(
  "contacts",
  {
    ...lifecycleColumns,
    ...softDeleteColumns,
    displayName: varchar("display_name", { length: 191 }),
    primaryEmail: varchar("primary_email", { length: 254 }),
    primaryPhone: varchar("primary_phone", { length: 40 }),
    metadata: jsonb("metadata").notNull().default({}),
    mergedIntoContactId: uuid("merged_into_contact_id"),
    revision: revisionColumn(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    scopedStoreForeignKey(table, "contacts_store_tenant_fk"),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.mergedIntoContactId],
      foreignColumns: [table.tenantId, table.storeId, table.id],
      name: "contacts_scoped_merge_target_fk",
    }),
    check(
      "contacts_not_merged_into_self",
      sql`${table.mergedIntoContactId} IS NULL OR ${table.mergedIntoContactId} <> ${table.id}`,
    ),
    revisionCheck(table.revision, "contacts_revision_nonnegative"),
    uniqueIndex("contacts_scope_id_unique").on(
      table.tenantId,
      table.storeId,
      table.id,
    ),
    index("contacts_store_name_idx").on(table.storeId, table.displayName),
  ],
);

export const contactIdentities = pgTable(
  "contact_identities",
  {
    ...lifecycleColumns,
    channel: messagingChannel("channel"),
    contactId: uuid("contact_id").references(() => contacts.id),
    identityKind: contactIdentityKind("identity_kind").notNull(),
    normalizedValue: varchar("normalized_value", { length: 320 }).notNull(),
    observedAt: timestamp("observed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    provider: transportProvider("provider"),
    revision: revisionColumn(),
    state: contactIdentityState("state").notNull().default("observed"),
    supersededByIdentityId: uuid("superseded_by_identity_id"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    scopedStoreForeignKey(table, "contact_identities_store_tenant_fk"),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.contactId],
      foreignColumns: [contacts.tenantId, contacts.storeId, contacts.id],
      name: "contact_identities_scoped_contact_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.supersededByIdentityId],
      foreignColumns: [table.tenantId, table.storeId, table.id],
      name: "contact_identities_scoped_superseded_by_fk",
    }),
    check(
      "contact_identities_verified_at_check",
      sql`${table.state} <> 'verified' OR ${table.verifiedAt} IS NOT NULL`,
    ),
    check(
      "contact_identities_superseded_check",
      sql`(${table.state} = 'superseded') = (${table.supersededByIdentityId} IS NOT NULL)`,
    ),
    revisionCheck(table.revision, "contact_identities_revision_nonnegative"),
    uniqueIndex("contact_identities_scope_id_unique").on(
      table.tenantId,
      table.storeId,
      table.id,
    ),
    uniqueIndex("contact_identities_contact_id_unique").on(
      table.tenantId,
      table.storeId,
      table.id,
      table.contactId,
    ),
    uniqueIndex("contact_identities_verified_value_unique")
      .on(
        table.tenantId,
        table.storeId,
        table.identityKind,
        table.normalizedValue,
      )
      .where(sql`${table.state} = 'verified'`),
    index("contact_identities_contact_idx").on(table.contactId, table.state),
  ],
);

export const opportunities = pgTable(
  "opportunities",
  {
    ...lifecycleColumns,
    ...softDeleteColumns,
    assignedUserId: uuid("assigned_user_id").references(() => users.id),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id),
    lastInteractionAt: timestamp("last_interaction_at", { withTimezone: true }),
    legacyLeadId: uuid("legacy_lead_id"),
    metadata: jsonb("metadata").notNull().default({}),
    revision: revisionColumn(),
    source: acquisitionSource("source").notNull(),
    stageKey: varchar("stage_key", { length: 120 }).notNull().default("new"),
    state: opportunityState("state").notNull().default("open"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    scopedStoreForeignKey(table, "opportunities_store_tenant_fk"),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.assignedUserId],
      foreignColumns: [
        storeMemberships.tenantId,
        storeMemberships.storeId,
        storeMemberships.userId,
      ],
      name: "opportunities_scoped_assignee_membership_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.contactId],
      foreignColumns: [contacts.tenantId, contacts.storeId, contacts.id],
      name: "opportunities_scoped_contact_fk",
    }),
    revisionCheck(table.revision, "opportunities_revision_nonnegative"),
    uniqueIndex("opportunities_scope_id_unique").on(
      table.tenantId,
      table.storeId,
      table.id,
    ),
    uniqueIndex("opportunities_legacy_lead_unique").on(
      table.tenantId,
      table.storeId,
      table.legacyLeadId,
    ),
    index("opportunities_store_state_idx").on(table.storeId, table.state),
  ],
);

export const vehicleInterests = pgTable(
  "vehicle_interests",
  {
    ...lifecycleColumns,
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => vehicleListings.id),
    opportunityId: uuid("opportunity_id")
      .notNull()
      .references(() => opportunities.id),
    revision: revisionColumn(),
    unitId: uuid("unit_id").references(() => vehicleUnits.id),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    scopedStoreForeignKey(table, "vehicle_interests_store_tenant_fk"),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.contactId],
      foreignColumns: [contacts.tenantId, contacts.storeId, contacts.id],
      name: "vehicle_interests_scoped_contact_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.opportunityId],
      foreignColumns: [
        opportunities.tenantId,
        opportunities.storeId,
        opportunities.id,
      ],
      name: "vehicle_interests_scoped_opportunity_fk",
    }),
    revisionCheck(table.revision, "vehicle_interests_revision_nonnegative"),
    uniqueIndex("vehicle_interests_scope_id_unique").on(
      table.tenantId,
      table.storeId,
      table.id,
    ),
    uniqueIndex("vehicle_interests_opportunity_vehicle_unique").on(
      table.opportunityId,
      table.listingId,
      table.unitId,
    ),
  ],
);
