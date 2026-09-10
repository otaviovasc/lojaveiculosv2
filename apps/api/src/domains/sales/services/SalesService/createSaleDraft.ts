import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  SaleRecord,
  SaleScope,
  SalesRepository,
  SaveSaleDraftInput,
} from "../../ports/salesRepository.js";
import { assertSalePaymentAmounts } from "../../salePaymentAmounts.js";
import { markDraftReservationSignal } from "../../salePaymentSignals.js";
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

  assertSalePaymentAmounts(input.payments);
  const repository = getSalesRepository(ports);
  if (input.leadId) {
    const resumable = await findResumableLeadSale(
      repository,
      scope,
      input.leadId,
    );
    if (resumable) {
      logSalesServiceEvent(context, "sale.draft.create.resumed_existing", {
        leadId: input.leadId,
        saleId: resumable.id,
        status: resumable.status,
      });
      await auditSalesServiceEvent(context, {
        action: "sale.draft.create",
        category: "data_change",
        entityId: resumable.id,
        metadata: { resumedExisting: true, status: resumable.status },
        permission,
        summary: "Resumed existing open sale draft for lead",
      });
      return resumable;
    }
  }
  const sale = await repository.createDraft(
    scope,
    markDraftReservationSignal(input),
  );

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

async function findResumableLeadSale(
  repository: SalesRepository,
  scope: SaleScope,
  leadId: string,
): Promise<SaleRecord | null> {
  const sales = await repository.list({
    ...scope,
    leadId,
    limit: 50,
    offset: 0,
    status: "all",
  });
  return (
    sales.find(
      (sale) =>
        sale.isCurrentRevision &&
        (sale.status === "draft" || sale.status === "pending"),
    ) ?? null
  );
}
