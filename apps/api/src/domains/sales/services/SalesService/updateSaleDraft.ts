import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  SalePaymentLine,
  SaleRecord,
  SaveSalePaymentInput,
  UpdateSaleDraftInput,
} from "../../ports/salesRepository.js";
import {
  auditSalesServiceEvent,
  findScopedSale,
  getSalesRepository,
  logSalesServiceEvent,
  requireSaleScope,
  type SalesServicePorts,
} from "./serviceSupport.js";

export async function updateSaleDraft(
  context: ServiceContext,
  saleId: string,
  input: UpdateSaleDraftInput,
  ports?: SalesServicePorts,
) {
  const repository = getSalesRepository(ports);
  const scope = requireSaleScope(context);
  const current = await findScopedSale(repository, scope, saleId);
  const permission =
    current.status === "closed" ? "sale.correct" : "sale.draft";
  assertPermission(context, permission);

  logSalesServiceEvent(context, "sale.draft.update.started", {
    saleId,
    status: current.status,
  });

  const sale = await repository.updateDraft(
    scope,
    saleId,
    updateInputForStatus(current, input),
  );

  await auditSalesServiceEvent(context, {
    action: current.status === "closed" ? "sale.correct" : "sale.draft.update",
    category: "data_change",
    entityId: sale.id,
    metadata: { status: sale.status },
    permission,
    summary: "Updated sale draft",
  });

  return sale;
}

function updateInputForStatus(
  current: SaleRecord,
  input: UpdateSaleDraftInput,
): UpdateSaleDraftInput {
  if (current.status === "draft") return input;
  if (current.status === "pending") {
    return preservePendingPaymentRows(current.payments, input);
  }
  return omitPaymentUpdates(input);
}

function omitPaymentUpdates(input: UpdateSaleDraftInput): UpdateSaleDraftInput {
  const { payments: _payments, ...safeInput } = input;
  return safeInput;
}

function preservePendingPaymentRows(
  currentPayments: readonly SalePaymentLine[],
  input: UpdateSaleDraftInput,
): UpdateSaleDraftInput {
  if (!input.payments) return input;
  const payments = input.payments.map((payment, index) => {
    const current = currentPayments[index];
    if (!current) return payment;
    return index === 0
      ? toSavePaymentInput(current)
      : { ...payment, id: current.id };
  });
  return {
    ...input,
    payments: [
      ...payments,
      ...currentPayments.slice(payments.length).map(toSavePaymentInput),
    ],
  };
}

function toSavePaymentInput(payment: SalePaymentLine): SaveSalePaymentInput {
  return {
    amountCents: payment.amountCents,
    dueAt: payment.dueAt,
    extraCents: payment.extraCents,
    id: payment.id,
    installments: payment.installments,
    metadata: payment.metadata,
    method: payment.method,
    paidAt: payment.paidAt,
    principalCents: payment.principalCents,
    providerPaymentId: payment.providerPaymentId,
    status: payment.status,
  };
}
