import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { ListSalesInput } from "../../ports/salesRepository.js";
import {
  auditSalesServiceEvent,
  getSalesRepository,
  logSalesServiceEvent,
  requireSaleScope,
  type SalesServicePorts,
} from "./serviceSupport.js";

const permission = "sale.read";

export async function listSales(
  context: ServiceContext,
  input: Omit<ListSalesInput, "storeId" | "tenantId">,
  ports?: SalesServicePorts,
) {
  assertPermission(context, permission);
  const scope = requireSaleScope(context);

  logSalesServiceEvent(context, "sale.list.read", {
    status: input.status ?? "all",
  });

  const sales = await getSalesRepository(ports).list({
    ...scope,
    ...input,
  });

  await auditSalesServiceEvent(context, {
    action: "sale.list",
    category: "data_access",
    entityId: scope.storeId,
    metadata: {
      count: sales.length,
      status: input.status ?? "all",
    },
    permission,
    summary: "Listed sales",
  });

  return sales;
}
