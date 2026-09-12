import type {
  FinancingInquiry,
  FinancingRepository,
} from "../ports/financingRepository.js";
import { nextId, toCondition } from "./financingRepositorySupport.js";
import type { MemoryFinancingRepositoryState } from "./financingRepositoryState.js";

type UpsertProviderInquiryInput = Parameters<
  FinancingRepository["upsertProviderInquiry"]
>[0];

export async function upsertProviderInquiry(
  state: MemoryFinancingRepositoryState,
  input: UpsertProviderInquiryInput,
) {
  const existing = state.inquiries.find(
    (item) =>
      item.provider === input.provider &&
      item.providerInquiryId === input.providerInquiryId &&
      item.storeId === input.storeId &&
      item.tenantId === input.tenantId,
  );
  if (existing) return updateProviderInquiry(state, existing, input);

  const now = new Date();
  const inquiry: FinancingInquiry = {
    amountCents: input.amountCents,
    bankCodes: [...input.bankCodes],
    completedAt: input.status === "submitted" ? null : input.completedAt,
    conditions: [],
    consentEvidence: null,
    createdAt: input.createdAt,
    customerDocumentHash: input.customerDocumentHash,
    customerDocumentLast4: input.customerDocumentLast4 ?? "",
    downPaymentCents: input.downPaymentCents,
    id: nextId(state, "financing_inquiry"),
    idempotencyKey: `credere-backfill:${input.providerInquiryId}`,
    installments: input.installments,
    leadId: null,
    listingId: null,
    metadata: {
      ...input.metadata,
      amountCents: input.amountCents,
      bankCodes: [...input.bankCodes],
      downPaymentCents: input.downPaymentCents,
      installments: input.installments,
      providerStoreId: input.providerStoreId,
    },
    operationId: "",
    provider: input.provider,
    providerInquiryId: input.providerInquiryId,
    providerRequestId: input.providerRequestId,
    providerStoreId: input.providerStoreId,
    reason: input.reason,
    requestedByUserId: null,
    status: input.status,
    storeId: input.storeId,
    success: input.success,
    tenantId: input.tenantId,
    unitId: null,
    updatedAt: now,
  };
  inquiry.conditions = input.conditions.map((condition) =>
    toCondition(condition, inquiry.id),
  );
  state.inquiries = [inquiry, ...state.inquiries];
  return { created: true, inquiry };
}

function updateProviderInquiry(
  state: MemoryFinancingRepositoryState,
  existing: FinancingInquiry,
  input: UpsertProviderInquiryInput,
) {
  const updated: FinancingInquiry = {
    ...existing,
    completedAt: input.status === "submitted" ? null : input.completedAt,
    conditions: input.conditions.map((condition) =>
      toCondition(condition, existing.id),
    ),
    providerRequestId: input.providerRequestId,
    reason: input.reason,
    status: input.status,
    success: input.success,
    updatedAt: new Date(),
  };
  state.inquiries = state.inquiries.map((item) =>
    item.id === existing.id ? updated : item,
  );
  return { created: false, inquiry: updated };
}
