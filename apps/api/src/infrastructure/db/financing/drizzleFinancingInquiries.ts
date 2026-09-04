import { and, eq, sql } from "drizzle-orm";
import {
  financingConditions,
  financingCustomerConsents,
  financingInquiries,
  financingOperationRequests,
  financingProviderAccounts,
  financingProviderStoreMappings,
} from "@lojaveiculosv2/db";
import { FinancingInquiryReferenceError } from "../../../domains/financing/ports/financingRepository.js";
import type {
  CompleteFinancingInquiryInput,
  CreateFinancingInquiryInput,
} from "../../../domains/financing/ports/financingRepository.js";
import { toInquiry } from "./drizzleFinancingMappers.js";
import {
  findInquiryById,
  inquiryScope,
} from "./drizzleFinancingInquiryQueries.js";
import type { DrizzleFinancingClient } from "./drizzleFinancingRepository.js";
import { validateInquiryReferences } from "./drizzleFinancingReferenceValidation.js";

export {
  findInquiryById,
  listInquiries,
} from "./drizzleFinancingInquiryQueries.js";
export {
  failInquiry,
  markInquiryIndeterminate,
} from "./drizzleFinancingInquiryStatus.js";

export async function createInquiry(
  db: DrizzleFinancingClient,
  input: CreateFinancingInquiryInput,
) {
  return db.transaction(async (transaction) => {
    const client = transaction as DrizzleFinancingClient;
    const references = await validateInquiryReferences(client, input);
    if (!references.valid) {
      throw new FinancingInquiryReferenceError(references.reason);
    }
    const mapping = await findMapping(client, input);
    if (!mapping) throw new Error("Credere store mapping was not found.");
    const [consent] = await client
      .insert(financingCustomerConsents)
      .values({
        applicantDocumentHash: input.customerDocumentHash,
        applicantDocumentLast4: input.customerDocumentLast4,
        consentVersion: input.consentEvidence.termsVersion,
        grantedAt: input.consentEvidence.acceptedAt,
        grantedByUserId: input.requestedByUserId,
        leadId: input.leadId,
        purpose: "financing_simulation",
        status: "granted",
        storeId: input.storeId,
        tenantId: input.tenantId,
      })
      .returning();
    const [row] = await client
      .insert(financingInquiries)
      .values({
        accountId: mapping.accountId,
        applicantDocumentHash: input.customerDocumentHash,
        applicantDocumentLast4: input.customerDocumentLast4,
        consentId: consent?.id,
        idempotencyKey: input.idempotencyKey,
        leadId: input.leadId,
        listingId: input.listingId,
        metadata: inquiryMetadata(input),
        operationRequestId: input.operationId,
        provider: input.provider,
        requestedByUserId: input.requestedByUserId,
        status: "requested",
        storeId: input.storeId,
        storeMappingId: mapping.id,
        tenantId: input.tenantId,
        unitId: input.unitId,
      })
      .returning();
    if (!row) throw new Error("Credere inquiry insert failed.");
    await client
      .update(financingOperationRequests)
      .set({
        accountId: mapping.accountId,
        consentId: consent?.id,
        inquiryId: row.id,
        leaseExpiresAt: null,
        mappingId: mapping.id,
        status: "submitted",
        submittedAt: new Date(),
      })
      .where(eq(financingOperationRequests.id, input.operationId));
    return toInquiry(row, [], consent ?? null);
  });
}

export async function completeInquiry(
  db: DrizzleFinancingClient,
  input: CompleteFinancingInquiryInput,
) {
  return db.transaction(async (transaction) => {
    const client = transaction as DrizzleFinancingClient;
    const terminal = input.status !== "submitted";
    const [row] = await client
      .update(financingInquiries)
      .set({
        completedAt: terminal ? input.completedAt : null,
        failedAt: input.status === "failed" ? input.completedAt : null,
        providerInquiryId: input.providerInquiryId,
        providerOperationId: input.providerRequestId,
        providerResultCode: input.status,
        providerResultMessage: input.reason,
        providerResultSummary: {
          reason: input.reason,
          success: input.success,
        },
        status: input.status,
        submittedAt: sql`coalesce(
          ${financingInquiries.submittedAt},
          ${sql.param(input.completedAt, financingInquiries.submittedAt)}
        )`,
      })
      .where(inquiryScope(input))
      .returning();
    if (!row) throw new Error("Credere inquiry complete failed.");
    await client
      .delete(financingConditions)
      .where(eq(financingConditions.inquiryId, input.inquiryId));
    if (input.conditions.length) {
      await client.insert(financingConditions).values(
        input.conditions.map((condition) => ({
          bankFebrabanCode: condition.bankCode,
          bankName: condition.bankName,
          inquiryId: input.inquiryId,
          installments: condition.installments,
          metadata: condition.metadata,
          provider: "credere" as const,
          status: condition.status,
          storeId: input.storeId,
          summary: condition.summary,
          tenantId: input.tenantId,
          totalAmountCents: condition.totalAmountCents,
        })),
      );
    }
    if (row.operationRequestId) {
      await client
        .update(financingOperationRequests)
        .set({
          errorCode: input.status === "failed" ? "provider_failed" : null,
          errorMessage: input.status === "failed" ? input.reason : null,
          providerOperationId: input.providerRequestId,
          resultCode: input.status,
          resultMessage: input.reason,
          resultSummary: { success: input.success },
          status:
            input.status === "completed"
              ? "succeeded"
              : input.status === "failed"
                ? "failed"
                : "submitted",
        })
        .where(eq(financingOperationRequests.id, row.operationRequestId));
    }
    const item = await findInquiryById(client, input);
    if (!item) throw new Error("Credere inquiry readback failed.");
    return item;
  });
}

async function findMapping(
  db: DrizzleFinancingClient,
  input: CreateFinancingInquiryInput,
) {
  const [row] = await db
    .select()
    .from(financingProviderStoreMappings)
    .innerJoin(
      financingProviderAccounts,
      eq(
        financingProviderStoreMappings.accountId,
        financingProviderAccounts.id,
      ),
    )
    .where(
      and(
        eq(financingProviderStoreMappings.id, input.storeMappingId),
        eq(financingProviderStoreMappings.storeId, input.storeId),
        eq(financingProviderStoreMappings.tenantId, input.tenantId),
        eq(financingProviderStoreMappings.status, "active"),
        eq(financingProviderAccounts.provider, input.provider),
        eq(financingProviderAccounts.status, "active"),
      ),
    )
    .limit(1);
  return row?.financing_provider_store_mappings ?? null;
}

function inquiryMetadata(input: CreateFinancingInquiryInput) {
  return {
    amountCents: input.amountCents,
    bankCodes: [...input.bankCodes],
    downPaymentCents: input.downPaymentCents,
    installments: input.installments,
    providerStoreId: input.providerStoreId,
    ...input.metadata,
  };
}
