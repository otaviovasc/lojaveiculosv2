import type * as schema from "@lojaveiculosv2/db";
import { billingCatalogVersions } from "@lojaveiculosv2/db";
import { and, eq, lte } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

type BillingCatalogReadClient = PostgresJsDatabase<typeof schema>;

export async function findActiveBillingCatalogVersion(
  db: BillingCatalogReadClient,
): Promise<string | null> {
  const [row] = await db
    .select({ version: billingCatalogVersions.version })
    .from(billingCatalogVersions)
    .where(
      and(
        eq(billingCatalogVersions.status, "active"),
        lte(billingCatalogVersions.publishedAt, new Date()),
      ),
    )
    .limit(1);
  return row?.version ?? null;
}
