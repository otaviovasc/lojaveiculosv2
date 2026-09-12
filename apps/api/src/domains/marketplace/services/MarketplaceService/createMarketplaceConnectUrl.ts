import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { MarketplaceProvider } from "../../ports/marketplaceRepository.js";
import {
  marketplaceNow,
  MarketplaceProviderRuntimeError,
  requireMarketplaceOAuthPorts,
  requireMarketplaceScope,
  type MarketplaceServicePorts,
} from "./serviceSupport.js";

export type CreateMarketplaceConnectUrlInput = {
  provider: MarketplaceProvider;
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
  const oauth = requireMarketplaceOAuthPorts(ports);
  const now = marketplaceNow(ports);
  const redirectUri = oauth.redirectUri(input.provider);
  const transaction = await oauth.stateStore.issue({
    actorId: context.actor.id,
    expiresAt: new Date(now.getTime() + 10 * 60_000),
    provider: input.provider,
    requestId: context.requestId,
    redirectUri,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
  const authorizationUrl = await gateway.createAuthorizationUrl({
    redirectUri,
    state: transaction.state,
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
    metadata: {
      expiresAt: transaction.expiresAt.toISOString(),
      permission: "marketplace.manage",
      provider: input.provider,
      stateStoredAsHash: true,
      transactionId: transaction.id,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Created marketplace OAuth authorization URL",
  });

  return { authorizationUrl, provider: input.provider };
}
