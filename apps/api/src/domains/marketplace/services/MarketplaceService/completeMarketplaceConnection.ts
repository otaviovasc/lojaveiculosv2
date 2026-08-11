import { randomUUID } from "node:crypto";
import {
  assertEntitlement,
  assertPermission,
} from "../../../../shared/authorization.js";
import type {
  ServiceContext,
  StoreScopedServiceContext,
} from "../../../../shared/serviceContext.js";
import type {
  MarketplaceAccount,
  MarketplaceProvider,
} from "../../ports/marketplaceRepository.js";
import {
  marketplaceNow,
  MarketplaceOAuthStateInvalidError,
  MarketplaceProviderRuntimeError,
  requireMarketplaceOAuthPorts,
  requireMarketplaceScope,
  type MarketplaceServicePorts,
} from "./serviceSupport.js";
import { auditMarketplaceOAuthCallback } from "../../support/marketplaceOAuthAudit.js";
import { connectMarketplaceOAuthAccount } from "./marketplaceOAuthCompletionSupport.js";

export type CompleteMarketplaceConnectionInput = { transactionId: string };

export type CompleteMarketplaceConnectionResult =
  | { account: MarketplaceAccount; kind: "connected" }
  | { kind: "cancelled"; provider: MarketplaceProvider };

export type ReceiveMarketplaceOAuthCallbackInput =
  | { code: string; provider: MarketplaceProvider; state: string }
  | { error: string; provider: MarketplaceProvider; state: string };

export type ReceiveMarketplaceOAuthCallbackResult =
  | { kind: "cancelled"; provider: MarketplaceProvider }
  | {
      kind: "received";
      provider: MarketplaceProvider;
      transactionId: string;
    };

export async function completeMarketplaceConnection(
  context: ServiceContext,
  input: CompleteMarketplaceConnectionInput,
  ports: MarketplaceServicePorts,
): Promise<CompleteMarketplaceConnectionResult> {
  assertPermission(context, "marketplace.manage");
  const scope = requireMarketplaceScope(context);
  assertPermission(context, "crm.messaging.connection.setup");
  assertEntitlement(context as StoreScopedServiceContext, "crm");
  const oauth = requireMarketplaceOAuthPorts(ports);
  const binding = {
    actorId: context.actor.id,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  };
  const usedAt = marketplaceNow(ports);

  const leaseOwner = randomUUID();
  const transaction = await oauth.stateStore.claimReceived({
    binding,
    leaseExpiresAt: new Date(usedAt.getTime() + 60_000),
    leaseOwner,
    transactionId: input.transactionId,
    usedAt,
  });
  if (!transaction) throw new MarketplaceOAuthStateInvalidError();
  try {
    const gateway = ports.gatewayRegistry?.getGateway(transaction.provider);
    if (!gateway) throw new MarketplaceProviderRuntimeError("Gateway missing.");
    const token =
      transaction.exchangeToken ??
      (await gateway.exchangeAuthorizationCode({
        code: transaction.authorizationCode,
        redirectUri: transaction.redirectUri,
      }));
    if (
      !transaction.exchangeToken &&
      !(await oauth.stateStore.saveExchangeToken({
        leaseOwner,
        token,
        transactionId: transaction.id,
      }))
    )
      throw new MarketplaceOAuthStateInvalidError();
    const result = await connectMarketplaceOAuthAccount(
      context,
      transaction,
      token,
      ports,
    );
    await oauth.stateStore.finishExchange({
      leaseOwner,
      succeeded: true,
      transactionId: transaction.id,
      usedAt: marketplaceNow(ports),
    });
    context.logger.info("marketplace.oauth.exchange.complete", {
      provider: transaction.provider,
      requestId: context.requestId,
      storeId: transaction.storeId,
      tenantId: transaction.tenantId,
      transactionId: transaction.id,
    });
    await context.audit.record({
      action: "marketplace.oauth.exchange.complete",
      actor: context.actor,
      category: "authorization",
      entityId: transaction.id,
      entityType: "marketplace_oauth_transaction",
      metadata: { provider: transaction.provider },
      outcome: "succeeded",
      requestId: context.requestId,
      storeId: transaction.storeId,
      tenantId: transaction.tenantId,
      summary: "Consumed marketplace OAuth transaction",
    });
    return result;
  } catch (error) {
    await oauth.stateStore.finishExchange({
      leaseOwner,
      succeeded: false,
      transactionId: transaction.id,
      usedAt: marketplaceNow(ports),
    });
    throw error;
  }
}

export async function receiveMarketplaceOAuthCallback(
  context: ServiceContext,
  input: ReceiveMarketplaceOAuthCallbackInput,
  ports: MarketplaceServicePorts,
): Promise<ReceiveMarketplaceOAuthCallbackResult> {
  assertPermission(context, "marketplace.manage");
  const oauth = requireMarketplaceOAuthPorts(ports);
  const redirectUri = oauth.redirectUri(input.provider);
  const binding = { provider: input.provider, redirectUri };
  const usedAt = marketplaceNow(ports);

  if ("error" in input) {
    const transaction = await oauth.stateStore.cancelPending({
      binding,
      state: input.state,
      usedAt,
    });
    if (!transaction) throw new MarketplaceOAuthStateInvalidError();
    await auditMarketplaceOAuthCallback(context, transaction, "cancelled");
    return { kind: "cancelled", provider: transaction.provider };
  }

  const transaction = await oauth.stateStore.receiveCallback({
    authorizationCode: input.code,
    binding,
    receivedAt: usedAt,
    state: input.state,
  });
  if (!transaction) throw new MarketplaceOAuthStateInvalidError();
  await auditMarketplaceOAuthCallback(context, transaction, "received");
  return {
    kind: "received",
    provider: transaction.provider,
    transactionId: transaction.id,
  };
}
