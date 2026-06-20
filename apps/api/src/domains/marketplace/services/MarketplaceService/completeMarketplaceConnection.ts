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

export type CompleteMarketplaceConnectionInput = {
  code: string;
  provider: MarketplaceProvider;
  redirectUri: string;
};

export async function completeMarketplaceConnection(
  context: ServiceContext,
  input: CompleteMarketplaceConnectionInput,
  ports: MarketplaceServicePorts,
) {
  assertPermission(context, "marketplace.manage");
  const scope = requireMarketplaceScope(context);
  const gateway = ports.gatewayRegistry?.getGateway(input.provider);
  if (!gateway) throw new MarketplaceProviderRuntimeError("Gateway missing.");

  const token = await gateway.exchangeAuthorizationCode({
    code: input.code,
    redirectUri: input.redirectUri,
  });
  const account = await ports.marketplaceRepository.upsertAccount({
    config: {
      connection: {
        connectedAt: new Date().toISOString(),
        expiresAt: token.expiresAt?.toISOString() ?? null,
        providerAccountId: token.providerAccountId,
        scope: token.scope,
        tokenType: token.tokenType,
      },
      credentials: {
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
      },
    },
    provider: input.provider,
    status: "active",
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });

  context.logger.info(
    "marketplace.connection.complete",
    createServiceLogMetadata(context, { provider: input.provider }),
  );

  await context.audit.record({
    action: "marketplace.connection.complete",
    actor: context.actor,
    category: "authorization",
    entityId: account.id,
    entityType: "marketplace_account",
    metadata: {
      hasRefreshToken: Boolean(token.refreshToken),
      permission: "marketplace.manage",
      provider: input.provider,
      providerAccountId: token.providerAccountId,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Completed marketplace OAuth connection",
  });

  return account;
}
