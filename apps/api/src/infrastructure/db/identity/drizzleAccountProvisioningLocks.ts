import { sql } from "drizzle-orm";
import type { DrizzleAccountProvisioningClient } from "./drizzleAccountProvisioningSupport.js";

export async function lockUserProvisioning(
  db: DrizzleAccountProvisioningClient,
  userId: string,
) {
  await db.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${userId}, 0))`,
  );
}
