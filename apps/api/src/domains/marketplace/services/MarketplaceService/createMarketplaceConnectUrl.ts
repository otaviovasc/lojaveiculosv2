import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { MarketplaceProvider } from "../../ports/marketplaceRepository.js";
import {
  MarketplaceProviderRuntimeError,
  requireMarketplaceScope,
  type MarketplaceServicePorts,
} from "./serviceSupport.js";

export type CreateMarketplaceConnectUrlInput = {
  provider: MarketplaceProvider;
  redirectUri: string;
};

export type MarketplaceConnectUrl = {
  authorizationUrl: string;
  provider: MarketplaceProvider;
};

export async function createMarketplaceConnectUrl(
  context: ServiceContext,
  input: CreateMarketplaceConnectUrlInput,
  ports: MarketplaceServicePorts,
): Promise<MarketplaceConnectUrl> {
  assertPermission(context, "marketplace.manage");
  const scope = requireMarketplaceScope(context);
  const gateway = ports.gatewayRegistry?.getGateway(input.provider);
  if (!gateway) throw new MarketplaceProviderRuntimeError("Gateway missing.");

  const state = JSON.stringify({
    provider: input.provider,
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
  const authorizationUrl = await gateway.createAuthorizationUrl({
    redirectUri: input.redirectUri,
    state,
  });

  context.logger.info(
    "marketplace.connect_url.create",
    createServiceLogMetadata(context, { provider: input.provider }),
  );

  await context.audit.record({
    action: "marketplace.connect_url.create",
    actor: context.actor,
    category: "authorization",
    entityId: scope.storeId,
    entityType: "marketplace_account",
    metadata: { permission: "marketplace.manage", provider: input.provider },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Created marketplace OAuth authorization URL",
  });

  return { authorizationUrl, provider: input.provider };
}
