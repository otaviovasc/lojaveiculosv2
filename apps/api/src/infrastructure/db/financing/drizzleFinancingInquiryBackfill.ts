import { and, eq, sql } from "drizzle-orm";
import {
  financingConditions,
  financingInquiries,
  financingProviderStoreMappings,
} from "@lojaveiculosv2/db";
import type {
  UpsertProviderInquiryInput,
  UpsertProviderInquiryResult,
} from "../../../domains/financing/ports/financingRepository.js";
import {
  readConditions,
  readConsent,
} from "./drizzleFinancingInquiryQueries.js";
import { toInquiry } from "./drizzleFinancingMappers.js";
import type { DrizzleFinancingClient } from "./drizzleFinancingRepository.js";

export async function upsertProviderInquiry(
  db: DrizzleFinancingClient,
  input: UpsertProviderInquiryInput,
): Promise<UpsertProviderInquiryResult> {
  return db.transaction(async (transaction) => {
    const client = transaction as DrizzleFinancingClient;
    const terminal = input.status !== "submitted";
    const resultFields: ProviderResultFields = {
      completedAt: terminal ? input.completedAt : null,
      failedAt: input.status === "failed" ? input.completedAt : null,
      providerInquiryId: input.providerInquiryId,
      providerOperationId: input.providerRequestId,
      providerResultCode: input.status as string,
      providerResultMessage: input.reason,
      providerResultSummary: {
        reason: input.reason,
        success: input.success,
      },
      status: input.status as string,
    };
    const [existing] = await client
      .select()
      .from(financingInquiries)
      .where(providerInquiryScope(input))
      .limit(1);
    if (existing) {
      await client
        .update(financingInquiries)
        .set(resultFields)
        .where(eq(financingInquiries.id, existing.id));
      await replaceConditions(client, existing.id, input);
      const inquiry = await readBack(client, existing.id);
      return { created: false, inquiry };
    }
    const inserted = await insertBackfilledInquiry(client, input, resultFields);
    if (!inserted) {
      const [raced] = await client
        .select()
        .from(financingInquiries)
        .where(providerInquiryScope(input))
        .limit(1);
      if (!raced) throw new Error("Credere inquiry backfill conflict failed.");
      await client
        .update(financingInquiries)
        .set(resultFields)
        .where(eq(financingInquiries.id, raced.id));
      await replaceConditions(client, raced.id, input);
      const inquiry = await readBack(client, raced.id);
      return { created: false, inquiry };
    }
    await replaceConditions(client, inserted.id, input);
    const inquiry = await readBack(client, inserted.id);
    return { created: true, inquiry };
  });
}

type ProviderResultFields = {
  completedAt: Date | null;
  failedAt: Date | null;
  providerInquiryId: string;
  providerOperationId: string | null;
  providerResultCode: string;
  providerResultMessage: string | null;
  providerResultSummary: {
    reason: string | null;
    success: boolean | null;
  };
  status: string;
};

async function insertBackfilledInquiry(
  client: DrizzleFinancingClient,
  input: UpsertProviderInquiryInput,
  resultFields: ProviderResultFields,
) {
  const [mapping] = await client
    .select()
    .from(financingProviderStoreMappings)
    .where(
      and(
        eq(financingProviderStoreMappings.id, input.storeMappingId),
        eq(financingProviderStoreMappings.storeId, input.storeId),
        eq(financingProviderStoreMappings.tenantId, input.tenantId),
      ),
    )
    .limit(1);
  if (!mapping) throw new Error("Credere store mapping was not found.");
  const rows = await client
    .insert(financingInquiries)
    .values({
      accountId: mapping.accountId,
      applicantDocumentHash: input.customerDocumentHash || null,
      applicantDocumentLast4: input.customerDocumentLast4,
      createdAt: input.createdAt,
      idempotencyKey: `credere-backfill:${input.providerInquiryId}`,
      metadata: {
        ...input.metadata,
        amountCents: input.amountCents,
        bankCodes: [...input.bankCodes],
        downPaymentCents: input.downPaymentCents,
        installments: input.installments,
        providerStoreId: input.providerStoreId,
      },
      provider: input.provider,
      storeId: input.storeId,
      storeMappingId: input.storeMappingId,
      submittedAt: input.createdAt,
      tenantId: input.tenantId,
      ...resultFields,
    })
    .onConflictDoNothing({
      target: [
        financingInquiries.tenantId,
        financingInquiries.storeId,
        financingInquiries.provider,
        financingInquiries.idempotencyKey,
      ],
      where: sql`${financingInquiries.idempotencyKey} is not null`,
    })
    .returning();
  return rows[0] ?? null;
}

async function replaceConditions(
  client: DrizzleFinancingClient,
  inquiryId: string,
  input: UpsertProviderInquiryInput,
) {
  await client
    .delete(financingConditions)
    .where(eq(financingConditions.inquiryId, inquiryId));
  // financing_conditions.installments must be > 0; provider conditions
  // without installments cannot be persisted without fabricating data.
  const persistable = input.conditions.filter(
    (condition) => condition.installments > 0,
  );
  if (!persistable.length) return;
  await client.insert(financingConditions).values(
    persistable.map((condition) => ({
      bankFebrabanCode: condition.bankCode,
      bankName: condition.bankName,
      inquiryId,
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

async function readBack(client: DrizzleFinancingClient, inquiryId: string) {
  const [row] = await client
    .select()
    .from(financingInquiries)
    .where(eq(financingInquiries.id, inquiryId))
    .limit(1);
  if (!row) throw new Error("Credere inquiry backfill readback failed.");
  return toInquiry(
    row,
    await readConditions(client, row.id),
    await readConsent(client, row),
  );
}

function providerInquiryScope(input: UpsertProviderInquiryInput) {
  return and(
    eq(financingInquiries.tenantId, input.tenantId),
    eq(financingInquiries.storeId, input.storeId),
    eq(financingInquiries.provider, input.provider),
    eq(financingInquiries.providerInquiryId, input.providerInquiryId),
  );
}
