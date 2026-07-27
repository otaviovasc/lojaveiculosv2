import { eq } from "drizzle-orm";
import {
  financingInquiries,
  financingOperationRequests,
} from "@lojaveiculosv2/db";
import { toInquiry } from "./drizzleFinancingMappers.js";
import {
  findInquiryById,
  inquiryScope,
  readConditions,
} from "./drizzleFinancingInquiryQueries.js";
import type { DrizzleFinancingClient } from "./drizzleFinancingRepository.js";

export async function failInquiry(
  db: DrizzleFinancingClient,
  input: {
    errorCode: string;
    errorMessage: string;
    inquiryId: string;
    storeId: string;
    tenantId: string;
  },
) {
  return updateInquiryStatus(db, input, "failed", {
    errorCode: input.errorCode,
    errorMessage: input.errorMessage,
  });
}

export async function markInquiryIndeterminate(
  db: DrizzleFinancingClient,
  input: {
    inquiryId: string;
    providerInquiryId: string | null;
    reason: string;
    storeId: string;
    tenantId: string;
  },
) {
  return updateInquiryStatus(db, input, "indeterminate", {
    providerInquiryId: input.providerInquiryId,
    reason: input.reason,
  });
}

async function updateInquiryStatus(
  db: DrizzleFinancingClient,
  input: { inquiryId: string; storeId: string; tenantId: string },
  status: string,
  metadata: Record<string, unknown>,
) {
  return db.transaction(async (transaction) => {
    const client = transaction as DrizzleFinancingClient;
    const existing = await findInquiryById(client, input);
    const message =
      typeof metadata.errorMessage === "string"
        ? metadata.errorMessage
        : typeof metadata.reason === "string"
          ? metadata.reason
          : null;
    const [row] = await client
      .update(financingInquiries)
      .set({
        failedAt: status === "failed" ? new Date() : null,
        metadata: { ...(existing?.metadata ?? {}), ...metadata },
        providerInquiryId:
          typeof metadata.providerInquiryId === "string"
            ? metadata.providerInquiryId
            : undefined,
        providerResultCode: status,
        providerResultMessage: message,
        providerResultSummary: {
          reason: message,
          success: status === "failed" ? false : null,
        },
        status,
      })
      .where(inquiryScope(input))
      .returning();
    if (!row) throw new Error("Credere inquiry status update failed.");
    if (row.operationRequestId) {
      await client
        .update(financingOperationRequests)
        .set({
          errorCode:
            typeof metadata.errorCode === "string"
              ? metadata.errorCode
              : status,
          errorMessage: message,
          resultCode: status,
          resultMessage: message,
          status: status === "failed" ? "failed" : "submitted",
        })
        .where(eq(financingOperationRequests.id, row.operationRequestId));
    }
    return toInquiry(row, await readConditions(client, row.id));
  });
}
