import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type {
  CreateFinancingInquiryInput,
  FinancingInquiryReferenceFailure,
  FinancingRepository,
  FinancingVehicleAuthority,
} from "../../ports/financingRepository.js";
import { FinancingInquiryReferenceError } from "../../ports/financingRepository.js";
import { FinancingValidationError } from "./serviceSupport.js";
import type { CreateCredereSimulationInput } from "./types.js";

const referenceMessages: Record<FinancingInquiryReferenceFailure, string> = {
  lead_not_found: "Lead reference is invalid for this store.",
  listing_not_found: "Listing reference is invalid for this store.",
  unit_listing_mismatch: "Unit reference does not belong to the listing.",
  unit_not_found: "Unit reference is invalid for this store.",
};

export async function assertValidInquiryReferences(
  input: Pick<CreateCredereSimulationInput, "leadId" | "listingId" | "unitId">,
  scope: { storeId: StoreId; tenantId: TenantId },
  repository: FinancingRepository,
): Promise<FinancingVehicleAuthority | null> {
  const result = await repository.validateInquiryReferences({
    leadId: input.leadId ?? null,
    listingId: input.listingId ?? null,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    unitId: input.unitId ?? null,
  });
  if (!result.valid) throw financingReferenceValidationError(result.reason);
  return result.vehicleAuthority;
}

export function financingReferenceValidationError(
  reason: FinancingInquiryReferenceFailure,
): FinancingValidationError {
  return new FinancingValidationError(referenceMessages[reason]);
}

export async function createValidatedInquiry(
  repository: FinancingRepository,
  input: CreateFinancingInquiryInput,
) {
  try {
    return await repository.createInquiry(input);
  } catch (error) {
    if (error instanceof FinancingInquiryReferenceError) {
      throw financingReferenceValidationError(error.reason);
    }
    throw error;
  }
}
