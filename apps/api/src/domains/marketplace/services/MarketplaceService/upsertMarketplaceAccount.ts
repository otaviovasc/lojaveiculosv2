import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import { assertPermission } from "../../../../shared/authorization.js";
import type {
  MarketplaceAccount,
  MarketplaceAccountStatus,
  MarketplaceProvider,
} from "../../ports/marketplaceRepository.js";
import {
  requireMarketplaceScope,
  type MarketplaceServicePorts,
} from "./serviceSupport.js";

export type UpsertMarketplaceAccountServiceInput = {
  config?: Record<string, unknown>;
  provider: MarketplaceProvider;
  status: MarketplaceAccountStatus;
};

export async function upsertMarketplaceAccount(
  context: ServiceContext,
  input: UpsertMarketplaceAccountServiceInput,
  ports: MarketplaceServicePorts,
): Promise<MarketplaceAccount> {
  assertPermission(context, "marketplace.manage");
  const scope = requireMarketplaceScope(context);

  context.logger.info(
    "marketplace.account.upsert.started",
    createServiceLogMetadata(context, {
      provider: input.provider,
      status: input.status,
    }),
  );

  const account = await ports.marketplaceRepository.upsertAccount({
    config: sanitizeConfig(input.config ?? {}),
    provider: input.provider,
    status: input.status,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });

  await context.audit.record({
    action: "marketplace.account.upsert",
    actor: context.actor,
    category: "data_change",
    entityId: account.id,
    entityType: "marketplace_account",
    metadata: {
      permission: "marketplace.manage",
      provider: input.provider,
      status: input.status,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Updated marketplace account configuration",
  });

  return account;
}

function sanitizeConfig(config: Record<string, unknown>) {
  const safeConfig = { ...config };
  delete safeConfig.accessToken;
  delete safeConfig.refreshToken;
  delete safeConfig.clientSecret;
  return safeConfig;
}
