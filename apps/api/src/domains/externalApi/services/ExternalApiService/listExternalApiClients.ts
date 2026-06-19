import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { ExternalApiClient } from "../../ports/externalApiRepository.js";
import {
  requireExternalApiScope,
  type ExternalApiServicePorts,
} from "./serviceSupport.js";

export async function listExternalApiClients(
  context: ServiceContext,
  ports: ExternalApiServicePorts,
): Promise<readonly ExternalApiClient[]> {
  assertPermission(context, "external_api.manage");
  const scope = requireExternalApiScope(context);
  context.logger.info(
    "external_api.client.list",
    createServiceLogMetadata(context),
  );
  await context.audit.record({
    action: "external_api.client.list",
    actor: context.actor,
    category: "data_access",
    entityId: scope.storeId,
    entityType: "api_client",
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Listed external API clients",
  });

  return ports.externalApiRepository.listClients(scope);
}
