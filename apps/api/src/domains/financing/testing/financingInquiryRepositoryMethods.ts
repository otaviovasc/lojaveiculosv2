import type {
  FinancingInquiry,
  FinancingRepository,
  ReserveSimulationOperationInput,
  ReserveSimulationOperationResult,
} from "../ports/financingRepository.js";
import { FinancingInquiryReferenceError } from "../ports/financingRepository.js";
import {
  nextId,
  requireInquiry,
  toCondition,
  updateInquiryStatus,
} from "./financingRepositorySupport.js";
import { validateInquiryReferences } from "./financingReferenceValidation.js";
import type { MemoryFinancingRepositoryState } from "./financingRepositoryState.js";

type InquiryMethods = Pick<
  FinancingRepository,
  | "completeInquiry"
  | "createInquiry"
  | "failInquiry"
  | "findInquiryById"
  | "listActiveOkayBankCredentials"
  | "listInquiries"
  | "markInquiryIndeterminate"
  | "readStoreBankPolicy"
  | "reserveSimulationOperation"
  | "validateInquiryReferences"
>;

export function createInquiryRepositoryMethods(
  state: MemoryFinancingRepositoryState,
): InquiryMethods {
  return {
    async completeInquiry(input) {
      const inquiry = requireInquiry(state.inquiries, input);
      const conditions = input.conditions.map((condition) =>
        toCondition(condition, input.inquiryId),
      );
      state.inquiries = state.inquiries.map((item) =>
        item.id === inquiry.id
          ? {
              ...item,
              completedAt:
                input.status === "submitted" ? null : input.completedAt,
              conditions,
              providerInquiryId: input.providerInquiryId,
              providerRequestId: input.providerRequestId,
              reason: input.reason,
              status: input.status,
              success: input.success,
              updatedAt: input.completedAt,
            }
          : item,
      );
      return requireInquiry(state.inquiries, input);
    },
    async createInquiry(input) {
      const references = validateInquiryReferences(state, input);
      if (!references.valid) {
        throw new FinancingInquiryReferenceError(references.reason);
      }
      const inquiry = createInquiry(input, nextId(state, "financing_inquiry"));
      state.inquiries = [inquiry, ...state.inquiries];
      state.operations = state.operations.map((operation) =>
        operation.id === input.operationId
          ? { ...operation, inquiryId: inquiry.id }
          : operation,
      );
      return inquiry;
    },
    async failInquiry(input) {
      return updateInquiryStatus(state, input, "failed", {
        errorCode: input.errorCode,
        errorMessage: input.errorMessage,
      });
    },
    async findInquiryById(input) {
      return (
        state.inquiries.find(
          (item) =>
            item.id === input.inquiryId &&
            item.storeId === input.storeId &&
            item.tenantId === input.tenantId,
        ) ?? null
      );
    },
    async listActiveOkayBankCredentials(input) {
      return state.bankCredentials
        .filter(
          (item) =>
            (!item.providerStoreId ||
              item.providerStoreId === input.providerStoreId) &&
            (!item.storeId || item.storeId === input.storeId) &&
            (!item.tenantId || item.tenantId === input.tenantId),
        )
        .map(({ code, name }) => ({ code, name }));
    },
    async listInquiries(input) {
      return state.inquiries
        .filter(
          (item) =>
            item.storeId === input.storeId && item.tenantId === input.tenantId,
        )
        .slice(0, input.limit ?? 50);
    },
    async markInquiryIndeterminate(input) {
      return updateInquiryStatus(state, input, "indeterminate", {
        providerInquiryId: input.providerInquiryId,
        reason: input.reason,
      });
    },
    async readStoreBankPolicy() {
      return state.bankPolicy === undefined ? null : state.bankPolicy;
    },
    async reserveSimulationOperation(input) {
      return reserveSimulationOperation(state, input);
    },
    async validateInquiryReferences(input) {
      return validateInquiryReferences(state, input);
    },
  };
}

function createInquiry(
  input: Parameters<FinancingRepository["createInquiry"]>[0],
  id: string,
): FinancingInquiry {
  const now = new Date();
  return {
    amountCents: input.amountCents,
    bankCodes: [...input.bankCodes],
    completedAt: null,
    conditions: [],
    consentEvidence: input.consentEvidence,
    createdAt: now,
    customerDocumentHash: input.customerDocumentHash,
    customerDocumentLast4: input.customerDocumentLast4,
    downPaymentCents: input.downPaymentCents,
    id,
    idempotencyKey: input.idempotencyKey,
    installments: input.installments,
    leadId: input.leadId,
    listingId: input.listingId,
    metadata: input.metadata,
    operationId: input.operationId,
    provider: input.provider,
    providerInquiryId: null,
    providerRequestId: null,
    providerStoreId: input.providerStoreId,
    reason: null,
    requestedByUserId: input.requestedByUserId ?? null,
    status: "requested",
    storeId: input.storeId,
    success: null,
    tenantId: input.tenantId,
    unitId: input.unitId,
    updatedAt: now,
  };
}

function reserveSimulationOperation(
  state: MemoryFinancingRepositoryState,
  input: ReserveSimulationOperationInput,
): ReserveSimulationOperationResult {
  const existing = state.operations.find(
    (item) =>
      item.idempotencyKey === input.idempotencyKey &&
      item.storeId === input.storeId &&
      item.tenantId === input.tenantId,
  );
  if (existing?.requestFingerprint === input.requestFingerprint) {
    return {
      inquiryId: existing.inquiryId,
      kind: "duplicate",
      operationId: existing.id,
    };
  }
  if (existing) {
    return {
      kind: "conflict",
      operationId: existing.id,
      requestFingerprint: existing.requestFingerprint,
    };
  }
  const operation = {
    id: nextId(state, "financing_operation"),
    idempotencyKey: input.idempotencyKey,
    inquiryId: null,
    requestFingerprint: input.requestFingerprint,
    storeId: input.storeId,
    tenantId: input.tenantId,
  };
  state.operations = [operation, ...state.operations];
  return { kind: "created", operationId: operation.id };
}
