import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { SaleRecord, SaleStatus } from "../../ports/salesRepository.js";
import { assertSalePaymentsLocallyReversible } from "../../salePaymentCompensation.js";
import { requireSaleAccountingFacts } from "../../saleAccountingFacts.js";
import {
  auditSalesServiceEvent,
  collectMissingSaleFields,
  findScopedSale,
  getSalesRepository,
  logSalesServiceEvent,
  requireSaleScope,
  SaleTransitionStateError,
  validateSaleReadiness,
  type SalesServicePorts,
} from "./serviceSupport.js";

export type TransitionSaleServiceInput = {
  overrideReason?: string | null;
  overrideRequiredFields?: boolean;
  saleId: string;
  status: Exclude<SaleStatus, "draft">;
};

export type TransitionSaleServiceHooks = {
  afterTransition?: (sale: SaleRecord) => Promise<void>;
};

export async function transitionSale(
  context: ServiceContext,
  input: TransitionSaleServiceInput,
  ports?: SalesServicePorts,
  hooks: TransitionSaleServiceHooks = {},
) {
  const permission = permissionForStatus(input.status);
  assertPermission(context, permission);
  const scope = requireSaleScope(context);
  const repository = getSalesRepository(ports);
  const current = await findScopedSale(repository, scope, input.saleId);

  logSalesServiceEvent(context, "sale.transition.started", {
    saleId: input.saleId,
    status: input.status,
  });

  assertTransitionAllowed(current.status, input.status);

  if (input.status === "cancelled") {
    assertSalePaymentsLocallyReversible(current.payments);
  } else {
    if (input.status === "closed") requireSaleAccountingFacts(current);
    const readinessPurpose = input.status === "pending" ? "reserve" : "close";
    const missingFields = collectMissingSaleFields(current, readinessPurpose);
    if (missingFields.length && !input.overrideRequiredFields) {
      validateSaleReadiness(current, readinessPurpose);
    }
    if (missingFields.length && input.overrideRequiredFields) {
      assertPermission(context, "sale.override_required_fields");
    }
  }

  const sale = await repository.transition({
    ...scope,
    closedAt: input.status === "closed" ? new Date() : null,
    expectedStatus: current.status,
    overrideReason: input.overrideReason ?? null,
    overrideRequiredFields: input.overrideRequiredFields ?? false,
    saleId: input.saleId,
    status: input.status,
  });

  if (hooks.afterTransition) {
    await hooks.afterTransition(sale);
  }

  await auditSalesServiceEvent(context, {
    action: `sale.${input.status}`,
    category: "data_change",
    criticality: "critical",
    entityId: sale.id,
    failureTier: "required",
    metadata: {
      overrideRequiredFields: sale.overrideRequiredFields,
      status: sale.status,
    },
    permission,
    summary: "Transitioned sale lifecycle",
  });

  return sale;
}

function assertTransitionAllowed(
  currentStatus: SaleStatus,
  nextStatus: Exclude<SaleStatus, "draft">,
): asserts currentStatus is Extract<SaleStatus, "draft" | "pending"> {
  const allowedTransitions: Record<SaleStatus, readonly SaleStatus[]> = {
    cancelled: [],
    closed: [],
    draft: ["cancelled", "closed", "pending"],
    pending: ["cancelled", "closed"],
  };
  if (!allowedTransitions[currentStatus].includes(nextStatus)) {
    throw new SaleTransitionStateError(currentStatus, nextStatus);
  }
}

function permissionForStatus(
  status: Exclude<SaleStatus, "draft">,
): "sale.cancel" | "sale.close" | "sale.reserve" {
  if (status === "pending") return "sale.reserve";
  if (status === "closed") return "sale.close";
  return "sale.cancel";
}
