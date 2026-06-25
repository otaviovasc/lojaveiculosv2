import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { SaveSaleDraftInput } from "../../ports/salesRepository.js";
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
  input: SaveSaleDraftInput,
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

  const sale = await repository.updateDraft(scope, saleId, input);

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
