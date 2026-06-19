import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { ExternalApiClient } from "../../ports/externalApiRepository.js";
import {
  ExternalApiClientNotFoundError,
  requireExternalApiScope,
  type ExternalApiServicePorts,
} from "./serviceSupport.js";

export async function revokeExternalApiClient(
  context: ServiceContext,
  input: { clientId: string },
  ports: ExternalApiServicePorts,
): Promise<ExternalApiClient> {
  assertPermission(context, "external_api.manage");
  const scope = requireExternalApiScope(context);
  context.logger.info(
    "external_api.client.revoke.started",
    createServiceLogMetadata(context, { clientId: input.clientId }),
  );
  const client = await ports.externalApiRepository.revokeClient({
    clientId: input.clientId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });

  if (!client) throw new ExternalApiClientNotFoundError(input.clientId);

  await context.audit.record({
    action: "external_api.client.revoke",
    actor: context.actor,
    category: "authorization",
    criticality: "high",
    entityId: client.id,
    entityType: "api_client",
    metadata: {
      keyPrefixes: client.keyPrefixes,
      scopes: client.scopes,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Revoked external API client",
  });

  return client;
}
