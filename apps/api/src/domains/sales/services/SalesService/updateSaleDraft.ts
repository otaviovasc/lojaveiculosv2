import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { assertStoreSalesActor } from "../../authorization/storeSalesActor.js";
import type {
  SalePaymentLine,
  SaleRecord,
  SaveSalePaymentInput,
  UpdateSaleDraftInput,
} from "../../ports/salesRepository.js";
import {
  findReservationSignalPayment,
  markDraftReservationSignal,
} from "../../salePaymentSignals.js";
import { assertSalePaymentAmounts } from "../../salePaymentAmounts.js";
import {
  auditSalesServiceEvent,
  findScopedSale,
  getSalesRepository,
  logSalesServiceEvent,
  requireSaleScope,
  SaleDraftUpdateStateError,
  SalePaymentIdentityError,
  SalePendingUnitChangeError,
  type SalesServicePorts,
} from "./serviceSupport.js";

export async function updateSaleDraft(
  context: ServiceContext,
  saleId: string,
  input: UpdateSaleDraftInput,
  ports?: SalesServicePorts,
) {
  const permission = "sale.draft" as const;
  assertPermission(context, permission);
  assertStoreSalesActor(context);
  const repository = getSalesRepository(ports);
  const scope = requireSaleScope(context);
  const current = await findScopedSale(repository, scope, saleId);
  if (current.status === "closed" || current.status === "cancelled") {
    throw new SaleDraftUpdateStateError(current.status);
  }

  logSalesServiceEvent(context, "sale.draft.update.started", {
    saleId,
    status: current.status,
  });

  const updateInput = updateInputForStatus(current, input);
  assertSalePaymentAmounts(updateInput.payments);
  const sale = await repository.updateDraft(
    scope,
    saleId,
    updateInput,
    current.status,
  );

  await auditSalesServiceEvent(context, {
    action: "sale.draft.update",
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
  if (current.status === "draft") {
    if (input.payments) {
      assertKnownUniquePaymentIds(current.payments, input.payments);
    }
    return markDraftReservationSignal(input);
  }
  if (current.status === "pending") {
    assertPendingUnitUnchanged(current, input);
    return preservePendingPaymentRows(current.payments, input);
  }
  throw new SaleDraftUpdateStateError(current.status);
}

function preservePendingPaymentRows(
  currentPayments: readonly SalePaymentLine[],
  input: UpdateSaleDraftInput,
): UpdateSaleDraftInput {
  if (!input.payments) return input;
  assertKnownUniquePaymentIds(currentPayments, input.payments);
  const signalPayment = findReservationSignalPayment(currentPayments);
  const payments = input.payments.map((payment) => {
    const current = payment.id
      ? currentPayments.find((item) => item.id === payment.id)
      : undefined;
    return current && current.id === signalPayment?.id
      ? toSavePaymentInput(current, true)
      : withoutReservationSignal(payment, current?.id);
  });
  if (
    signalPayment &&
    !payments.some((payment) => payment.id === signalPayment.id)
  ) {
    payments.unshift(toSavePaymentInput(signalPayment, true));
  }
  return {
    ...input,
    payments,
  };
}

function withoutReservationSignal(
  payment: SaveSalePaymentInput,
  id?: string,
): SaveSalePaymentInput {
  return {
    ...payment,
    ...(id ? { id } : {}),
    metadata: { ...(payment.metadata ?? {}), reservationSignal: false },
  };
}

function assertKnownUniquePaymentIds(
  currentPayments: readonly SalePaymentLine[],
  payments: readonly SaveSalePaymentInput[],
): void {
  const currentIds = new Set(currentPayments.map((payment) => payment.id));
  const seen = new Set<string>();
  for (const payment of payments) {
    if (!payment.id) continue;
    if (seen.has(payment.id)) {
      throw new SalePaymentIdentityError(payment.id, "duplicate");
    }
    if (!currentIds.has(payment.id)) {
      throw new SalePaymentIdentityError(payment.id, "unknown");
    }
    seen.add(payment.id);
  }
}

function assertPendingUnitUnchanged(
  current: SaleRecord,
  input: UpdateSaleDraftInput,
): void {
  if (input.unitId !== undefined && input.unitId !== current.unitId) {
    throw new SalePendingUnitChangeError();
  }
}

function toSavePaymentInput(
  payment: SalePaymentLine,
  reservationSignal = false,
): SaveSalePaymentInput {
  return {
    amountCents: payment.amountCents,
    dueAt: payment.dueAt,
    extraCents: payment.extraCents,
    id: payment.id,
    installments: payment.installments,
    metadata: reservationSignal
      ? { ...payment.metadata, reservationSignal: true }
      : payment.metadata,
    method: payment.method,
    paidAt: payment.paidAt,
    principalCents: payment.principalCents,
    providerPaymentId: payment.providerPaymentId,
    status: payment.status,
  };
}
