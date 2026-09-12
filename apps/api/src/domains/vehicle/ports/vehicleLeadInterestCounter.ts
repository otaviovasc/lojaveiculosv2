export type CountLeadsByListingIdsInput = {
  listingIds: readonly string[];
  storeId: string | null;
  tenantId: string | null;
};

/**
 * Cross-domain ACL port into the CRM domain.
 *
 * Counts, per vehicle listing, the DISTINCT non-archived, non-deleted leads
 * linked through `lead_vehicle_interests`, scoped to the same tenant/store.
 * This mirrors the CRM lead board filters (which exclude archived and
 * soft-deleted leads), so the inventory "Leads" count matches the leads the
 * kanban shows for the same vehicle.
 */
export type VehicleLeadInterestCounter = {
  countLeadsByListingIds: (
    input: CountLeadsByListingIdsInput,
  ) => Promise<ReadonlyMap<string, number>>;
};
