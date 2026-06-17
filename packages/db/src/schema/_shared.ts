import { sql } from "drizzle-orm";
import {
  boolean,
  timestamp,
  uuid,
  varchar,
  type PgColumnBuilderBase,
} from "drizzle-orm/pg-core";

export const idColumn = () => uuid("id").primaryKey().defaultRandom();

export const lifecycleColumns = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  id: idColumn(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => sql`now()`),
};

export const softDeleteColumns = {
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  isDeleted: boolean("is_deleted").notNull().default(false),
};

export const externalReference = (name: string): PgColumnBuilderBase =>
  varchar(name, { length: 191 });
