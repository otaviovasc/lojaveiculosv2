import type { PermissionKey } from "@lojaveiculosv2/shared";
import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { ExternalApiClient } from "../../ports/externalApiRepository.js";
import { generateExternalApiKey } from "../../crypto/apiKeyCrypto.js";
import {
  assertExternalApiAssignableScopes,
  requireExternalApiScope,
  type ExternalApiServicePorts,
} from "./serviceSupport.js";

export type CreateExternalApiClientServiceInput = {
  name: string;
  scopes: readonly PermissionKey[];
};

export type CreatedExternalApiClient = {
  apiKey: string;
  client: ExternalApiClient;
};

export async function createExternalApiClient(
  context: ServiceContext,
  input: CreateExternalApiClientServiceInput,
  ports: ExternalApiServicePorts,
): Promise<CreatedExternalApiClient> {
  assertPermission(context, "external_api.manage");
  assertExternalApiAssignableScopes(input.scopes);
  const scope = requireExternalApiScope(context);
  const key = generateExternalApiKey();

  context.logger.info(
    "external_api.client.create.started",
    createServiceLogMetadata(context, {
      scopeCount: input.scopes.length,
    }),
  );

  const client = await ports.externalApiRepository.createClient({
    keyHash: key.keyHash,
    keyPrefix: key.keyPrefix,
    name: input.name,
    scopes: [...new Set(input.scopes)].sort(),
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });

  await context.audit.record({
    action: "external_api.client.create",
    actor: context.actor,
    category: "authorization",
    criticality: "high",
    entityId: client.id,
    entityType: "api_client",
    metadata: {
      keyPrefix: key.keyPrefix,
      scopes: client.scopes,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Created external API client",
  });

  return {
    apiKey: key.plaintextKey,
    client,
  };
}
