import { and, eq, inArray } from "drizzle-orm";
import { leadVehicleInterests, vehicleListings } from "@lojaveiculosv2/db";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

export async function findLeadVehicleReferences(
  db: DrizzleCrmClient,
  input: {
    leadIds: readonly string[];
    storeId: string;
    tenantId: string;
  },
) {
  const references = new Map<
    string,
    { listingId: string | null; vehicleTitle: string | null }
  >();
  if (!input.leadIds.length) return references;

  const rows = await db
    .select({
      leadId: leadVehicleInterests.leadId,
      listingId: leadVehicleInterests.listingId,
      title: vehicleListings.title,
    })
    .from(leadVehicleInterests)
    .leftJoin(
      vehicleListings,
      and(
        eq(leadVehicleInterests.listingId, vehicleListings.id),
        eq(vehicleListings.storeId, input.storeId),
        eq(vehicleListings.tenantId, input.tenantId),
      ),
    )
    .where(
      and(
        eq(leadVehicleInterests.storeId, input.storeId),
        eq(leadVehicleInterests.tenantId, input.tenantId),
        inArray(leadVehicleInterests.leadId, [...input.leadIds]),
      ),
    );

  for (const row of rows) {
    references.set(row.leadId, {
      listingId: row.listingId,
      vehicleTitle: row.title ?? null,
    });
  }

  return references;
}

export async function findLeadVehicleReference(
  db: DrizzleCrmClient,
  input: { leadId: string; storeId: string; tenantId: string },
) {
  return (
    await findLeadVehicleReferences(db, {
      leadIds: [input.leadId],
      storeId: input.storeId,
      tenantId: input.tenantId,
    })
  ).get(input.leadId);
}

export async function findVehicleTitle(
  db: DrizzleCrmClient,
  input: {
    listingId: string | null | undefined;
    storeId: string;
    tenantId: string;
  },
) {
  if (!input.listingId) return null;
  const [row] = await db
    .select({ title: vehicleListings.title })
    .from(vehicleListings)
    .where(
      and(
        eq(vehicleListings.id, input.listingId),
        eq(vehicleListings.storeId, input.storeId),
        eq(vehicleListings.tenantId, input.tenantId),
      ),
    )
    .limit(1);
  if (!row) {
    throw new Error(`Scoped vehicle listing not found: ${input.listingId}`);
  }
  return row.title;
}
