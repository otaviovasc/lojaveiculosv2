import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  auditSalesServiceEvent,
  findScopedSale,
  getSalesRepository,
  logSalesServiceEvent,
  requireSaleScope,
  SaleDraftDeletionStateError,
  type SalesServicePorts,
} from "./serviceSupport.js";

const permission = "sale.draft";

export async function deleteSaleDraft(
  context: ServiceContext,
  saleId: string,
  ports?: SalesServicePorts,
) {
  assertPermission(context, permission);
  const scope = requireSaleScope(context);
  const repository = getSalesRepository(ports);
  const current = await findScopedSale(repository, scope, saleId);
  if (current.status !== "draft") {
    throw new SaleDraftDeletionStateError(current.status);
  }

  logSalesServiceEvent(context, "sale.draft.delete.started", {
    saleId,
    status: current.status,
  });

  const sale = await repository.deleteDraft(scope, saleId);

  await auditSalesServiceEvent(context, {
    action: "sale.draft.delete",
    category: "data_change",
    entityId: sale.id,
    metadata: { status: sale.status },
    permission,
    summary: "Deleted sale draft",
  });

  return sale;
}
