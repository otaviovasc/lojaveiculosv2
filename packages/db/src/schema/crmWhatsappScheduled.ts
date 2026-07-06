import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { crmConnections } from "./crm.js";
import { users, stores, tenants } from "./identity.js";
import { lifecycleColumns } from "./_shared.js";
import { crmWhatsappMessages, crmWhatsappSessions } from "./crmWhatsapp.js";

export const crmWhatsappScheduledMessageStatus = pgEnum(
  "crm_whatsapp_scheduled_message_status",
  ["cancelled", "failed", "pending", "sending", "sent"],
);

export const crmWhatsappScheduledMessages = pgTable(
  "crm_whatsapp_scheduled_messages",
  {
    ...lifecycleColumns,
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => crmConnections.id),
    createdByUserId: uuid("created_by_user_id").references(() => users.id),
    errorMessage: text("error_message"),
    metadata: jsonb("metadata").notNull().default({}),
    phone: varchar("phone", { length: 40 }).notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    sentMessageId: uuid("sent_message_id").references(
      () => crmWhatsappMessages.id,
    ),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => crmWhatsappSessions.id),
    status: crmWhatsappScheduledMessageStatus("status")
      .notNull()
      .default("pending"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    text: text("text").notNull(),
  },
  (table) => [
    index("crm_whatsapp_scheduled_messages_due_idx").on(
      table.storeId,
      table.status,
      table.scheduledAt,
    ),
    index("crm_whatsapp_scheduled_messages_session_idx").on(table.sessionId),
  ],
);
