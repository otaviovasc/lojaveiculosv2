import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  foreignKey,
  index,
  pgEnum,
  pgTable,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { lifecycleColumns } from "./_shared.js";
import { stores, tenants } from "./identity.js";
import { crmWhatsappSessions } from "./crmWhatsapp.js";

export const crmWhatsappSessionCommandResult = pgEnum(
  "crm_whatsapp_session_command_result",
  ["applied", "already_applied", "superseded"],
);

export const crmWhatsappSessionCommandReceipts = pgTable(
  "crm_whatsapp_session_command_receipts",
  {
    ...lifecycleColumns,
    commandId: uuid("command_id").notNull(),
    commandType: varchar("command_type", { length: 40 }).notNull(),
    requestFingerprint: varchar("request_fingerprint", {
      length: 64,
    }).notNull(),
    result: crmWhatsappSessionCommandResult("result"),
    sessionId: uuid("session_id").notNull(),
    sessionRevision: bigint("session_revision", { mode: "number" }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    check(
      "crm_whatsapp_session_command_receipts_completion_consistent",
      sql`(${table.result} IS NULL AND ${table.sessionRevision} IS NULL) OR (${table.result} IS NOT NULL AND ${table.sessionRevision} IS NOT NULL)`,
    ),
    check(
      "crm_whatsapp_session_command_receipts_revision_nonnegative",
      sql`${table.sessionRevision} IS NULL OR ${table.sessionRevision} >= 0`,
    ),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.sessionId],
      foreignColumns: [
        crmWhatsappSessions.tenantId,
        crmWhatsappSessions.storeId,
        crmWhatsappSessions.id,
      ],
      name: "crm_whatsapp_session_command_receipts_scoped_session_fk",
    }),
    uniqueIndex(
      "crm_whatsapp_session_command_receipts_scope_command_unique",
    ).on(table.tenantId, table.storeId, table.commandId),
    index("crm_whatsapp_session_command_receipts_session_created_idx").on(
      table.tenantId,
      table.storeId,
      table.sessionId,
      table.createdAt,
    ),
  ],
);
