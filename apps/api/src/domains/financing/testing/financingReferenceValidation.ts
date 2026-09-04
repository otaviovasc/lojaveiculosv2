import type { FinancingRepository } from "../ports/financingRepository.js";
import type { MemoryFinancingRepositoryState } from "./financingRepositoryState.js";

export function validateInquiryReferences(
  state: MemoryFinancingRepositoryState,
  input: Parameters<FinancingRepository["validateInquiryReferences"]>[0],
): Awaited<ReturnType<FinancingRepository["validateInquiryReferences"]>> {
  const activeInScope = (reference: {
    deletedAt?: Date | null;
    isDeleted?: boolean;
    storeId: string;
    tenantId: string;
  }) =>
    reference.storeId === input.storeId &&
    reference.tenantId === input.tenantId &&
    reference.isDeleted !== true &&
    !reference.deletedAt;

  if (
    input.leadId &&
    !state.leads.some(
      (reference) => reference.id === input.leadId && activeInScope(reference),
    )
  ) {
    return { reason: "lead_not_found", valid: false };
  }

  if (
    input.listingId &&
    !state.listings.some(
      (reference) =>
        reference.id === input.listingId && activeInScope(reference),
    )
  ) {
    return { reason: "listing_not_found", valid: false };
  }

  if (input.unitId) {
    const unit = state.units.find(
      (reference) => reference.id === input.unitId && activeInScope(reference),
    );
    if (!unit) return { reason: "unit_not_found", valid: false };
    const unitListing = state.listings.find(
      (reference) =>
        reference.id === unit.listingId && activeInScope(reference),
    );
    if (!unitListing) return { reason: "unit_not_found", valid: false };
    if (input.listingId && unit.listingId !== input.listingId) {
      return { reason: "unit_listing_mismatch", valid: false };
    }
    return { valid: true, vehicleAuthority: toVehicleAuthority(unitListing) };
  }

  const listing = input.listingId
    ? state.listings.find(
        (reference) =>
          reference.id === input.listingId && activeInScope(reference),
      )
    : null;
  return {
    valid: true,
    vehicleAuthority: listing ? toVehicleAuthority(listing) : null,
  };
}

function toVehicleAuthority(
  listing: MemoryFinancingRepositoryState["listings"][number],
) {
  return {
    assetValueCents: listing.assetValueCents ?? null,
    fipeCode: listing.fipeCode?.trim() || null,
    listingId: listing.id,
    manufactureYear: listing.manufactureYear ?? null,
    modelYear: listing.modelYear ?? null,
    zeroKm: listing.zeroKm ?? false,
  };
}
