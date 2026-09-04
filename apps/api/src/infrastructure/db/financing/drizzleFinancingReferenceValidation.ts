import { and, eq, isNull } from "drizzle-orm";
import { leads, vehicleListings, vehicleUnits } from "@lojaveiculosv2/db";
import type {
  FinancingInquiryReferenceInput,
  FinancingInquiryReferenceValidation,
  FinancingVehicleAuthority,
} from "../../../domains/financing/ports/financingRepository.js";
import type { DrizzleFinancingClient } from "./drizzleFinancingRepository.js";

export async function validateInquiryReferences(
  db: DrizzleFinancingClient,
  input: FinancingInquiryReferenceInput,
): Promise<FinancingInquiryReferenceValidation> {
  let vehicleAuthority: FinancingVehicleAuthority | null = null;
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
      .select({
        assetValueCents: vehicleListings.askingPriceCents,
        condition: vehicleListings.condition,
        id: vehicleListings.id,
        manufactureYear: vehicleListings.manufactureYear,
        metadata: vehicleListings.metadata,
        modelYear: vehicleListings.modelYear,
      })
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
    vehicleAuthority = toVehicleAuthority(listing);
  }

  if (input.unitId) {
    const [unit] = await db
      .select({
        assetValueCents: vehicleListings.askingPriceCents,
        condition: vehicleListings.condition,
        id: vehicleUnits.id,
        listingId: vehicleUnits.listingId,
        manufactureYear: vehicleListings.manufactureYear,
        metadata: vehicleListings.metadata,
        modelYear: vehicleListings.modelYear,
      })
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
    vehicleAuthority = toVehicleAuthority({ ...unit, id: unit.listingId });
  }

  return { valid: true, vehicleAuthority };
}

function toVehicleAuthority(input: {
  assetValueCents: number | null;
  condition: "certified_pre_owned" | "new" | "used";
  id: string;
  manufactureYear: number | null;
  metadata: unknown;
  modelYear: number | null;
}) {
  return {
    assetValueCents: input.assetValueCents,
    fipeCode: readCatalogFipeCode(input.metadata),
    listingId: input.id,
    manufactureYear: input.manufactureYear,
    modelYear: input.modelYear,
    zeroKm: input.condition === "new",
  };
}

function readCatalogFipeCode(metadata: unknown): string | null {
  if (!isRecord(metadata) || !isRecord(metadata.catalog)) return null;
  const value = metadata.catalog.fipeCode;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
