import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { SaveSaleDraftInput } from "../../ports/salesRepository.js";
import {
  auditSalesServiceEvent,
  getSalesRepository,
  logSalesServiceEvent,
  requireSaleScope,
  type SalesServicePorts,
} from "./serviceSupport.js";

const permission = "sale.draft";

export async function createSaleDraft(
  context: ServiceContext,
  input: SaveSaleDraftInput,
  ports?: SalesServicePorts,
) {
  assertPermission(context, permission);
  const scope = requireSaleScope(context);
  logSalesServiceEvent(context, "sale.draft.create.started", {
    leadId: input.leadId ?? null,
    unitId: input.unitId ?? null,
  });

  const sale = await getSalesRepository(ports).createDraft(scope, input);

  await auditSalesServiceEvent(context, {
    action: "sale.draft.create",
    category: "data_change",
    entityId: sale.id,
    metadata: { status: sale.status },
    permission,
    summary: "Created sale draft",
  });

  return sale;
}
