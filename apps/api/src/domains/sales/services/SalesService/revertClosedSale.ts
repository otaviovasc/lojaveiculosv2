import {
  assertPermission,
  AuthorizationError,
} from "../../../../shared/authorization.js";
import { isActiveSalePaymentStatus } from "@lojaveiculosv2/shared";
import { assertStoreSalesActor } from "../../authorization/storeSalesActor.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type {
  SaleRecord,
  SaveSalePaymentInput,
} from "../../ports/salesRepository.js";
import { assertSalePaymentsLocallyReversible } from "../../salePaymentCompensation.js";
import {
  auditSalesServiceEvent,
  findScopedSale,
  getSalesRepository,
  logSalesServiceEvent,
  requireSaleScope,
  SaleReversionConflictError,
  SaleReversionReasonError,
  SaleReversionStateError,
  SaleReversionUnsupportedError,
  type SalesServicePorts,
} from "./serviceSupport.js";

export type RevertClosedSaleInput = {
  reason: string;
  saleId: string;
};

export type RevertClosedSaleHooks = {
  compensate: (sale: SaleRecord, reason: string) => Promise<void>;
};

export async function revertClosedSale(
  context: ServiceContext,
  input: RevertClosedSaleInput,
  ports: SalesServicePorts,
  hooks: RevertClosedSaleHooks,
): Promise<SaleRecord> {
  const permission = "sale.correct" as const;

  try {
    assertPermission(context, permission);
    assertStoreSalesActor(context);
    const repository = getSalesRepository(ports);
    const scope = requireSaleScope(context);
    const reason = requireReason(input.reason);
    const current = await findScopedSale(repository, scope, input.saleId);
    assertRevertible(current);
    assertNoUncompensatedAcquisition(current);
    assertSalePaymentsLocallyReversible(current.payments);

    logSalesServiceEvent(context, "sale.revert.started", {
      saleId: current.id,
      revision: current.revision,
    });

    await hooks.compensate(current, reason);
    const correction = await repository.createCorrectionRevision(scope, {
      buyerSnapshot: current.buyerSnapshot,
      correctionOfSaleId: current.correctionOfSaleId ?? current.id,
      documentPolicySnapshot: current.documentPolicySnapshot,
      expectedRevision: current.revision,
      leadId: current.leadId,
      listingSnapshot: current.listingSnapshot,
      payments: freshPayments(current),
      reason,
      saleId: current.id,
      salePriceCents: current.salePriceCents,
      saleSourceSnapshot: current.saleSourceSnapshot,
      selectedDocumentKinds: current.selectedDocumentKinds,
      sellerUserId: current.sellerUserId,
      unitId: current.unitId,
    });
    if (!correction) throw new SaleReversionConflictError();

    await auditSalesServiceEvent(context, {
      action: "sale.revert",
      category: "data_change",
      criticality: "critical",
      entityId: correction.id,
      failureTier: "required",
      metadata: {
        originalSaleId: current.id,
        reasonProvided: true,
        revision: correction.revision,
        status: correction.status,
      },
      permission,
      relatedEntities: [{ id: current.id, type: "sale" }],
      summary: "Reverted closed sale into a correction revision",
    });
    logSalesServiceEvent(context, "sale.revert.completed", {
      correctionSaleId: correction.id,
      originalSaleId: current.id,
      revision: correction.revision,
    });
    return correction;
  } catch (error) {
    context.logger.warn(
      "sale.revert.rejected",
      createServiceLogMetadata(context, {
        errorName: error instanceof Error ? error.name : "UnknownError",
        saleId: input.saleId,
      }),
    );
    await auditSalesServiceEvent(context, {
      action: "sale.revert.rejected",
      category: "data_change",
      criticality: "critical",
      entityId: input.saleId,
      failureTier: "required",
      metadata: {
        errorName: error instanceof Error ? error.name : "UnknownError",
        reasonProvided: input.reason.trim().length > 0,
      },
      outcome: error instanceof AuthorizationError ? "denied" : "failed",
      permission,
      summary: "Rejected sale reversion",
    });
    throw error;
  }
}

function requireReason(value: string): string {
  const reason = value.trim();
  if (!reason) throw new SaleReversionReasonError();
  return reason;
}

function assertRevertible(sale: SaleRecord): void {
  if (sale.status !== "closed" || !sale.isCurrentRevision) {
    throw new SaleReversionStateError(sale.status, sale.isCurrentRevision);
  }
}

function assertNoUncompensatedAcquisition(sale: SaleRecord): void {
  if (isEnabledSnapshot(sale.saleSourceSnapshot.tradeIn)) {
    throw new SaleReversionUnsupportedError("trade_in_acquisition");
  }
  if (
    isEnabledSnapshot(sale.saleSourceSnapshot.acquisition) ||
    isEnabledSnapshot(sale.saleSourceSnapshot.tradeInAcquisition)
  ) {
    throw new SaleReversionUnsupportedError("acquisition_snapshot");
  }
}

function isEnabledSnapshot(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const snapshot = value as Record<string, unknown>;
  return snapshot.enabled !== false && Object.keys(snapshot).length > 0;
}

function freshPayments(sale: SaleRecord): readonly SaveSalePaymentInput[] {
  return sale.payments
    .filter((payment) => isActiveSalePaymentStatus(payment.status))
    .map((payment) => ({
      amountCents: payment.amountCents,
      dueAt: payment.dueAt,
      extraCents: payment.extraCents,
      installments: payment.installments,
      metadata: payment.metadata,
      method: payment.method,
      paidAt: null,
      principalCents: payment.principalCents,
      providerPaymentId: null,
      status: "pending",
    }));
}
