import { index, jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { auditLifecycleColumns } from "./_shared.js";

export const auditRequests = pgTable(
  "audit_requests",
  {
    ...auditLifecycleColumns,
    causationId: varchar("causation_id", { length: 191 }),
    correlationId: varchar("correlation_id", { length: 191 }),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    idempotencyKey: varchar("idempotency_key", { length: 191 }),
    ipAddress: varchar("ip_address", { length: 80 }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    metadata: jsonb("metadata").notNull().default({}),
    method: varchar("method", { length: 16 }),
    path: varchar("path", { length: 1024 }),
    requestId: varchar("request_id", { length: 191 }).notNull(),
    sourceService: varchar("source_service", { length: 120 }),
    userAgent: varchar("user_agent", { length: 1024 }),
  },
  (table) => [
    index("audit_requests_correlation_id_idx").on(table.correlationId),
    index("audit_requests_last_seen_at_idx").on(table.lastSeenAt),
    index("audit_requests_request_id_idx").on(table.requestId),
  ],
);
