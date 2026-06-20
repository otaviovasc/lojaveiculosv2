import type { integrationAccounts, integrationJobs } from "@lojaveiculosv2/db";
import type {
  MarketplaceAccount,
  MarketplaceJob,
  MarketplaceProvider,
} from "../../../domains/marketplace/ports/marketplaceRepository.js";

export function toAccount(
  row: typeof integrationAccounts.$inferSelect,
  mapConfig: (config: Record<string, unknown>) => Record<string, unknown>,
): MarketplaceAccount {
  return {
    config: mapConfig(toRecord(row.config)),
    createdAt: row.createdAt,
    id: row.id,
    provider: row.provider as MarketplaceProvider,
    status: row.status,
    storeId: row.storeId as never,
    tenantId: row.tenantId as never,
    updatedAt: row.updatedAt,
  };
}

export function toJob(
  row: typeof integrationJobs.$inferSelect,
  provider: MarketplaceProvider,
): MarketplaceJob {
  return {
    accountId: row.accountId,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    errorMessage: row.errorMessage,
    id: row.id,
    jobType: row.jobType as never,
    metadata: toRecord(row.metadata),
    provider,
    status: row.status,
  };
}

export function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
