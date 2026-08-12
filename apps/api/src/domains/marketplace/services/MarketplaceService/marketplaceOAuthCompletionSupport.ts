import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import { assertPermission } from "../../../../shared/authorization.js";
import type { MarketplaceOAuthTransaction } from "../../ports/marketplaceOAuthStateStore.js";
import type { MarketplaceTokenSet } from "../../ports/marketplaceProviderGateway.js";
import {
  marketplaceNow,
  MarketplaceProviderRuntimeError,
  type MarketplaceServicePorts,
} from "./serviceSupport.js";
import {
  normalizedScopes,
  olxScopeState,
  resolveOlxCapabilities,
} from "../../marketplaceOlxCapabilitySupport.js";

export async function connectMarketplaceOAuthAccount(
  context: ServiceContext,
  transaction: MarketplaceOAuthTransaction,
  token: MarketplaceTokenSet,
  ports: MarketplaceServicePorts,
) {
  assertPermission(context, "marketplace.manage");
  const gateway = ports.gatewayRegistry?.getGateway(transaction.provider);
  if (!gateway) throw new MarketplaceProviderRuntimeError("Gateway missing.");
  try {
    const scopes = normalizedScopes(token.scope);
    if (transaction.provider === "olx")
      requireScopes(scopes, ["basic_user_info"]);
    const providerAccount = await gateway.checkAccount({ token });
    if (transaction.provider === "olx" && !providerAccount.accountId)
      throw new MarketplaceProviderRuntimeError(
        "OLX account identity could not be verified.",
      );
    const authoritativeProviderAccountId =
      providerAccount.accountId ?? token.providerAccountId;
    const previousAccount = await ports.marketplaceRepository.findAccount({
      provider: transaction.provider,
      storeId: transaction.storeId as never,
      tenantId: transaction.tenantId as never,
    });
    const olxCapabilities =
      transaction.provider === "olx"
        ? await resolveOlxCapabilities(
            context,
            transaction,
            token.accessToken,
            authoritativeProviderAccountId,
            scopes,
            ports,
          )
        : null;
    const account = await ports.marketplaceRepository.upsertAccount({
      config: {
        connection: {
          connectedAt: marketplaceNow(ports).toISOString(),
          expiresAt: token.expiresAt?.toISOString() ?? null,
          providerAccountId:
            providerAccount.accountId ?? token.providerAccountId,
          scope: scopes.join(" "),
          tokenType: token.tokenType,
          ...(olxCapabilities
            ? {
                olxAuthorization: {
                  externalAccountId:
                    providerAccount.accountId ?? token.providerAccountId,
                  grantedScopes: scopes,
                  provider: "olx",
                  scopeState: olxScopeState(olxCapabilities),
                },
                olxCapabilities: olxCapabilities.capabilities,
                olxCrm: {
                  ...(olxCapabilities.connectionId
                    ? { connectionId: olxCapabilities.connectionId }
                    : {}),
                  status: olxCapabilities.crmStatus,
                },
              }
            : {}),
        },
        credentials: {
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
        },
      },
      provider: transaction.provider,
      providerAccountId: authoritativeProviderAccountId,
      status: "active",
      storeId: transaction.storeId as never,
      tenantId: transaction.tenantId as never,
    });
    if (previousAccount && previousAccount.id !== account.id) {
      await context.audit.record({
        action: "marketplace.connection.identity_replaced",
        actor: context.actor,
        category: "authorization",
        entityId: account.id,
        entityType: "integration_account",
        metadata: {
          permission: "marketplace.manage",
          previousAuthorizationId: previousAccount.id,
          provider: transaction.provider,
        },
        outcome: "succeeded",
        requestId: context.requestId,
        storeId: transaction.storeId,
        summary:
          "Replaced marketplace authorization after provider identity changed",
        tenantId: transaction.tenantId,
      });
    }
    if (transaction.provider === "olx" && olxCapabilities) {
      await ports.olxCrmOnboarding?.persistCapabilities?.(context, {
        authorizationId: account.id,
        capabilities: olxCapabilities.capabilities,
        connectionId: olxCapabilities.connectionId,
        grantedScopes: scopes,
        providerAccountId: providerAccount.accountId ?? token.providerAccountId,
        requestedScopes: [
          "autoupload",
          "autoservice",
          "basic_user_info",
          "chat",
        ],
        storeId: transaction.storeId,
        tenantId: transaction.tenantId,
      });
    }
    context.logger.info(
      "marketplace.connection.complete",
      createServiceLogMetadata(context, {
        provider: transaction.provider,
        transactionId: transaction.id,
      }),
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
        provider: transaction.provider,
        providerAccountId: token.providerAccountId,
        transactionId: transaction.id,
      },
      outcome: "succeeded",
      requestId: context.requestId,
      storeId: transaction.storeId,
      tenantId: transaction.tenantId,
      summary: "Completed marketplace OAuth connection",
    });
    return {
      account,
      ...(olxCapabilities
        ? { capabilities: olxCapabilities.capabilities }
        : {}),
      kind: "connected" as const,
    };
  } catch (error) {
    await context.audit.record({
      action: "marketplace.connection.complete",
      actor: context.actor,
      category: "authorization",
      entityId: transaction.id,
      entityType: "marketplace_oauth_transaction",
      metadata: {
        permission: "marketplace.manage",
        provider: transaction.provider,
        transactionId: transaction.id,
      },
      outcome: "failed",
      requestId: context.requestId,
      storeId: transaction.storeId,
      tenantId: transaction.tenantId,
      summary: "Marketplace OAuth connection failed",
    });
    throw error;
  }
}

function requireScopes(scopes: readonly string[], required: readonly string[]) {
  const missing = required.filter((scope) => !scopes.includes(scope));
  if (missing.length)
    throw new MarketplaceProviderRuntimeError(
      `OLX OAuth is missing required scopes: ${missing.join(", ")}.`,
    );
}
