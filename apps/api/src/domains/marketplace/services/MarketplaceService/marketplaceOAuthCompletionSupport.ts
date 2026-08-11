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
      requireScopes(scopes, ["basic_user_info", "autoupload"]);
    const providerAccount = await gateway.checkAccount({ token });
    if (transaction.provider === "olx" && !providerAccount.accountId)
      throw new MarketplaceProviderRuntimeError(
        "OLX account identity could not be verified.",
      );
    const crmMissingScopes = ["autoservice", "chat"].filter(
      (scope) => !scopes.includes(scope),
    );
    const crmConnection =
      transaction.provider === "olx" && crmMissingScopes.length === 0
        ? await onboardOlx(
            context,
            transaction,
            token.accessToken,
            providerAccount.accountId ?? token.providerAccountId,
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
          olxCrm:
            transaction.provider === "olx"
              ? {
                  missingScopes: crmMissingScopes,
                  ...(crmConnection
                    ? { connectionId: crmConnection.connectionId }
                    : {}),
                  status: crmMissingScopes.length
                    ? "blocked"
                    : crmConnection?.status,
                }
              : undefined,
        },
        credentials: {
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
        },
      },
      provider: transaction.provider,
      status: "active",
      storeId: transaction.storeId as never,
      tenantId: transaction.tenantId as never,
    });
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
    return { account, kind: "connected" as const };
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

function onboardOlx(
  context: ServiceContext,
  transaction: MarketplaceOAuthTransaction,
  accessToken: string,
  providerAccountId: string | null,
  scopes: string[],
  ports: MarketplaceServicePorts,
) {
  if (!ports.olxCrmOnboarding)
    throw new MarketplaceProviderRuntimeError(
      "OLX CRM onboarding is unavailable.",
    );
  return ports.olxCrmOnboarding.onboard(context, {
    accessToken,
    providerAccountId,
    scopes,
    storeId: transaction.storeId,
    tenantId: transaction.tenantId,
  });
}
function normalizedScopes(value: string | null): string[] {
  return [
    ...new Set(
      (value ?? "")
        .split(/[\s,]+/u)
        .map((scope) => scope.trim().toLowerCase())
        .filter(Boolean),
    ),
  ].sort();
}
function requireScopes(scopes: readonly string[], required: readonly string[]) {
  const missing = required.filter((scope) => !scopes.includes(scope));
  if (missing.length)
    throw new MarketplaceProviderRuntimeError(
      `OLX OAuth is missing required scopes: ${missing.join(", ")}.`,
    );
}
