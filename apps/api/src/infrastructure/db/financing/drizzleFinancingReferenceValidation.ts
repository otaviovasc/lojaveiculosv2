import { and, eq, isNull } from "drizzle-orm";
import { leads, vehicleListings, vehicleUnits } from "@lojaveiculosv2/db";
import type {
  FinancingInquiryReferenceInput,
  FinancingInquiryReferenceValidation,
} from "../../../domains/financing/ports/financingRepository.js";
import type { DrizzleFinancingClient } from "./drizzleFinancingRepository.js";

export async function validateInquiryReferences(
  db: DrizzleFinancingClient,
  input: FinancingInquiryReferenceInput,
): Promise<FinancingInquiryReferenceValidation> {
  if (input.leadId) {
    const [lead] = await db
      .select({ id: leads.id })
      .from(leads)
      .where(
        and(
          eq(leads.id, input.leadId),
          eq(leads.storeId, input.storeId),
          eq(leads.tenantId, input.tenantId),
          eq(leads.isDeleted, false),
          isNull(leads.deletedAt),
        ),
      )
      .limit(1);
    if (!lead) return { reason: "lead_not_found", valid: false };
  }

  if (input.listingId) {
    const [listing] = await db
      .select({ id: vehicleListings.id })
      .from(vehicleListings)
      .where(
        and(
          eq(vehicleListings.id, input.listingId),
          eq(vehicleListings.storeId, input.storeId),
          eq(vehicleListings.tenantId, input.tenantId),
          eq(vehicleListings.isDeleted, false),
          isNull(vehicleListings.deletedAt),
        ),
      )
      .limit(1);
    if (!listing) return { reason: "listing_not_found", valid: false };
  }

  if (input.unitId) {
    const [unit] = await db
      .select({ id: vehicleUnits.id, listingId: vehicleUnits.listingId })
      .from(vehicleUnits)
      .innerJoin(
        vehicleListings,
        eq(vehicleUnits.listingId, vehicleListings.id),
      )
      .where(
        and(
          eq(vehicleUnits.id, input.unitId),
          eq(vehicleUnits.storeId, input.storeId),
          eq(vehicleUnits.tenantId, input.tenantId),
          eq(vehicleUnits.isDeleted, false),
          isNull(vehicleUnits.deletedAt),
          eq(vehicleListings.storeId, input.storeId),
          eq(vehicleListings.tenantId, input.tenantId),
          eq(vehicleListings.isDeleted, false),
          isNull(vehicleListings.deletedAt),
        ),
      )
      .limit(1);
    if (!unit) return { reason: "unit_not_found", valid: false };
    if (input.listingId && unit.listingId !== input.listingId) {
      return { reason: "unit_listing_mismatch", valid: false };
    }
  }

  return { valid: true };
}
