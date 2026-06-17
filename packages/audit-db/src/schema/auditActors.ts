import { index, jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { auditLifecycleColumns } from "./_shared.js";
import { auditActorKind } from "./auditEvents.js";

export const auditActors = pgTable(
  "audit_actors",
  {
    ...auditLifecycleColumns,
    actorId: varchar("actor_id", { length: 191 }).notNull(),
    actorKind: auditActorKind("actor_kind").notNull(),
    displayName: varchar("display_name", { length: 191 }),
    externalId: varchar("external_id", { length: 191 }),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    metadata: jsonb("metadata").notNull().default({}),
  },
  (table) => [
    index("audit_actors_actor_idx").on(table.actorKind, table.actorId),
    index("audit_actors_external_id_idx").on(table.externalId),
    index("audit_actors_last_seen_at_idx").on(table.lastSeenAt),
  ],
);
