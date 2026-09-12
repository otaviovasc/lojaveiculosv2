import {
  foreignKey,
  index,
  pgTable,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { lifecycleColumns } from "../_shared.js";
import { stores, tenants } from "../identity.js";
import { contactIdentities, contacts } from "./contacts.js";
import { scopedStoreForeignKey } from "./scoped.js";

/**
 * Persisted, non-authoritative suggestions for linking an observed identity.
 * A candidate is deliberately separate from contact_identities.contact_id:
 * its presence must never auto-link or merge a contact.
 */
export const contactIdentityCandidates = pgTable(
  "contact_identity_candidates",
  {
    ...lifecycleColumns,
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id),
    identityId: uuid("identity_id")
      .notNull()
      .references(() => contactIdentities.id),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    scopedStoreForeignKey(table, "contact_identity_candidates_store_tenant_fk"),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.identityId],
      foreignColumns: [
        contactIdentities.tenantId,
        contactIdentities.storeId,
        contactIdentities.id,
      ],
      name: "contact_identity_candidates_scoped_identity_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.contactId],
      foreignColumns: [contacts.tenantId, contacts.storeId, contacts.id],
      name: "contact_identity_candidates_scoped_contact_fk",
    }),
    uniqueIndex("contact_identity_candidates_scope_id_unique").on(
      table.tenantId,
      table.storeId,
      table.id,
    ),
    uniqueIndex("contact_identity_candidates_identity_contact_unique").on(
      table.tenantId,
      table.storeId,
      table.identityId,
      table.contactId,
    ),
    index("contact_identity_candidates_contact_idx").on(
      table.storeId,
      table.contactId,
    ),
  ],
);
