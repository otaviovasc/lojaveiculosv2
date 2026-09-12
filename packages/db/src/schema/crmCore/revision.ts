import { sql } from "drizzle-orm";
import { check, integer, type AnyPgColumn } from "drizzle-orm/pg-core";

export const revisionColumn = () => integer("revision").notNull().default(0);
export const revisionCheck = (revision: AnyPgColumn, name: string) =>
  check(name, sql`${revision} >= 0`);
