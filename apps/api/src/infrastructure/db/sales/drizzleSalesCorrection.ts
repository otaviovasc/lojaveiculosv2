import { salePayments, sales } from "@lojaveiculosv2/db";
import { and, eq } from "drizzle-orm";
import type {
  CreateSaleCorrectionRevisionInput,
  SaleRecord,
  SaleScope,
  SaveSalePaymentInput,
} from "../../../domains/sales/ports/salesRepository.js";
import type { DrizzleSalesClient } from "./drizzleSalesRepository.js";
import {
  toInsertPayment,
  toInsertSale,
  toSaleRecord,
} from "./drizzleSalesMappers.js";

export async function createDrizzleSaleCorrection(
  db: DrizzleSalesClient,
  scope: SaleScope,
  input: CreateSaleCorrectionRevisionInput,
): Promise<SaleRecord | null> {
  return db.transaction((transaction) =>
    createCorrectionInTransaction(
      transaction as DrizzleSalesClient,
      scope,
      input,
    ),
  );
}

async function createCorrectionInTransaction(
  db: DrizzleSalesClient,
  scope: SaleScope,
  input: CreateSaleCorrectionRevisionInput,
): Promise<SaleRecord | null> {
  const [original] = await db
    .update(sales)
    .set({ isCurrentRevision: false })
    .where(
      and(
        eq(sales.id, input.saleId),
        eq(sales.storeId, scope.storeId),
        eq(sales.tenantId, scope.tenantId),
        eq(sales.status, "closed"),
        eq(sales.isCurrentRevision, true),
        eq(sales.revision, input.expectedRevision),
      ),
    )
    .returning();
  if (!original) return null;

  const [row] = await db
    .insert(sales)
    .values({
      ...toInsertSale(scope, input),
      correctionOfSaleId: input.correctionOfSaleId,
      isCurrentRevision: true,
      overrideReason: input.reason,
      revision: original.revision + 1,
    })
    .returning();
  if (!row) throw new Error("Drizzle adapter did not return correction.");
  const freshPayments = sanitizeCorrectionPayments(input.payments ?? []);
  const paymentRows = freshPayments.length
    ? await db
        .insert(salePayments)
        .values(
          freshPayments.map((payment) =>
            toInsertPayment(scope, row.id, payment),
          ),
        )
        .returning()
    : [];
  return toSaleRecord(row, paymentRows);
}

function sanitizeCorrectionPayments(
  payments: readonly SaveSalePaymentInput[],
): readonly SaveSalePaymentInput[] {
  return payments.map((payment) => ({
    amountCents: payment.amountCents,
    dueAt: payment.dueAt ?? null,
    extraCents: payment.extraCents ?? 0,
    installments: payment.installments ?? null,
    metadata: payment.metadata ?? {},
    method: payment.method,
    paidAt: null,
    principalCents: payment.principalCents ?? payment.amountCents,
    providerPaymentId: null,
    status: "pending",
  }));
}
