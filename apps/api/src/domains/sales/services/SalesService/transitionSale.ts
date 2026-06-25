import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { SaleStatus } from "../../ports/salesRepository.js";
import {
  auditSalesServiceEvent,
  collectMissingSaleFields,
  findScopedSale,
  getSalesRepository,
  logSalesServiceEvent,
  requireSaleScope,
  validateSaleReadiness,
  type SalesServicePorts,
} from "./serviceSupport.js";

export type TransitionSaleServiceInput = {
  overrideReason?: string | null;
  overrideRequiredFields?: boolean;
  saleId: string;
  status: Exclude<SaleStatus, "draft">;
};

export async function transitionSale(
  context: ServiceContext,
  input: TransitionSaleServiceInput,
  ports?: SalesServicePorts,
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

  if (input.status !== "cancelled") {
    const missingFields = collectMissingSaleFields(current);
    if (missingFields.length && !input.overrideRequiredFields) {
      validateSaleReadiness(current);
    }
    if (missingFields.length && input.overrideRequiredFields) {
      assertPermission(context, "sale.override_required_fields");
    }
  }

  const sale = await repository.transition({
    ...scope,
    closedAt: input.status === "closed" ? new Date() : null,
    overrideReason: input.overrideReason ?? null,
    overrideRequiredFields: input.overrideRequiredFields ?? false,
    saleId: input.saleId,
    status: input.status,
  });

  await auditSalesServiceEvent(context, {
    action: `sale.${input.status}`,
    category: "data_change",
    entityId: sale.id,
    metadata: {
      overrideRequiredFields: sale.overrideRequiredFields,
      status: sale.status,
    },
    permission,
    summary: "Transitioned sale lifecycle",
  });

  return sale;
}

function permissionForStatus(
  status: Exclude<SaleStatus, "draft">,
): "sale.cancel" | "sale.close" | "sale.reserve" {
  if (status === "pending") return "sale.reserve";
  if (status === "closed") return "sale.close";
  return "sale.cancel";
}
