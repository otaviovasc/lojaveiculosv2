import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../shared/serviceContext.js";
import type { MarketplaceOAuthTransaction } from "../ports/marketplaceOAuthStateStore.js";

export async function auditMarketplaceOAuthCancellation(
  context: ServiceContext,
  transaction: MarketplaceOAuthTransaction,
) {
  context.logger.info(
    "marketplace.connection.cancelled",
    createServiceLogMetadata(context, {
      provider: transaction.provider,
      transactionId: transaction.id,
    }),
  );
  await context.audit.record({
    action: "marketplace.connection.cancel",
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
    summary: "Marketplace OAuth authorization was cancelled",
  });
}

export async function auditMarketplaceOAuthCallback(
  context: ServiceContext,
  transaction: MarketplaceOAuthTransaction,
  outcome: "cancelled" | "received",
) {
  context.logger.info(
    `marketplace.oauth.callback.${outcome}`,
    createServiceLogMetadata(context, {
      provider: transaction.provider,
      storeId: transaction.storeId,
      tenantId: transaction.tenantId,
      transactionId: transaction.id,
    }),
  );
  await context.audit.record({
    action: `marketplace.oauth.callback.${outcome}`,
    actor: context.actor,
    category: "integration",
    entityId: transaction.id,
    entityType: "marketplace_oauth_transaction",
    metadata: {
      permission: "marketplace.manage",
      provider: transaction.provider,
      transactionId: transaction.id,
    },
    outcome: outcome === "received" ? "succeeded" : "failed",
    requestId: context.requestId,
    storeId: transaction.storeId,
    tenantId: transaction.tenantId,
    summary:
      outcome === "received"
        ? "Received marketplace OAuth callback"
        : "Marketplace OAuth callback was cancelled",
  });
}
