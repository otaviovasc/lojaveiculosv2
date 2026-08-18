import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { lifecycleColumns } from "./_shared.js";
import { stores, tenants, users } from "./identity.js";

export const crmWhatsappQuickMessageKind = pgEnum(
  "crm_whatsapp_quick_message_kind",
  ["AUDIO", "IMAGE", "TEXT"],
);

export const crmWhatsappQuickMessages = pgTable(
  "crm_whatsapp_quick_messages",
  {
    ...lifecycleColumns,
    content: text("content").notNull().default(""),
    createdByUserId: uuid("created_by_user_id").references(() => users.id),
    isActive: boolean("is_active").notNull().default(true),
    kind: crmWhatsappQuickMessageKind("kind").notNull().default("TEXT"),
    mediaType: varchar("media_type", { length: 120 }),
    mediaUrl: text("media_url"),
    shortcut: varchar("shortcut", { length: 50 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    storageKey: text("storage_key"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    title: varchar("title", { length: 160 }).notNull(),
  },
  (table) => [
    index("crm_whatsapp_quick_messages_store_idx").on(
      table.storeId,
      table.sortOrder,
    ),
    uniqueIndex("crm_whatsapp_quick_messages_store_shortcut_unique").on(
      table.storeId,
      table.shortcut,
    ),
  ],
);
