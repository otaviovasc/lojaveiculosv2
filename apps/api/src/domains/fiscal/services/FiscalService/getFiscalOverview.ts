import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { FiscalOverview } from "../../ports/fiscalRepository.js";
import {
  requireFiscalScope,
  type FiscalServicePorts,
} from "./serviceSupport.js";

export async function getFiscalOverview(
  context: ServiceContext,
  ports: FiscalServicePorts,
): Promise<FiscalOverview> {
  assertPermission(context, "fiscal.manage");
  const scope = requireFiscalScope(context);

  context.logger.info(
    "fiscal.overview.read.started",
    createServiceLogMetadata(context),
  );

  const overview = await ports.fiscalRepository.getOverview({
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
  const provider = await ports.fiscalProviderGateway.getProviderStatus();

  await context.audit.record({
    action: "fiscal.overview.read",
    actor: context.actor,
    category: "data_access",
    entityId: scope.storeId,
    entityType: "fiscal_account",
    metadata: {
      failed: overview.summary.failed,
      issued: overview.summary.issued,
      providerConfigured: provider.configured,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Read fiscal provider and document overview",
  });

  return { ...overview, provider };
}
