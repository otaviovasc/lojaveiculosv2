import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { auditLifecycleColumns } from "./_shared.js";
import { auditFailureTier } from "./auditEvents.js";

export const auditSinkFailures = pgTable(
  "audit_sink_failures",
  {
    ...auditLifecycleColumns,
    attempts: integer("attempts").notNull().default(1),
    eventId: uuid("event_id"),
    failureTier: auditFailureTier("failure_tier").notNull(),
    lastError: text("last_error").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    requestId: varchar("request_id", { length: 191 }).notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    sinkName: varchar("sink_name", { length: 120 }).notNull(),
  },
  (table) => [
    index("audit_sink_failures_event_id_idx").on(table.eventId),
    index("audit_sink_failures_request_id_idx").on(table.requestId),
    index("audit_sink_failures_resolved_at_idx").on(table.resolvedAt),
    index("audit_sink_failures_sink_name_idx").on(table.sinkName),
  ],
);
