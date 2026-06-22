import { and, eq, ilike } from "drizzle-orm";
import { leadVehicleInterests, vehicleListings } from "@lojaveiculosv2/db";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

export async function findLeadIdsByVehicleTitle(
  db: DrizzleCrmClient,
  input: { search: string; storeId: string; tenantId: string },
) {
  const rows = await db
    .select({ leadId: leadVehicleInterests.leadId })
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
        ilike(vehicleListings.title, `%${input.search}%`),
      ),
    );

  return rows.map((row) => row.leadId);
}
