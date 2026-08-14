import type {
  MarketplaceAccount,
  MarketplaceJob,
  MarketplaceOverview,
  MarketplaceProvider,
} from "../../../domains/marketplace/ports/marketplaceRepository.js";
import { readMarketplaceProviderCapabilities } from "../../../domains/marketplace/readModels/marketplaceProviderCapabilities.js";

export function buildProviderStates(input: {
  accounts: readonly MarketplaceAccount[];
  jobs: readonly MarketplaceJob[];
  providers: readonly MarketplaceProvider[];
}): MarketplaceOverview["providerStates"] {
  return input.providers.map((provider) => {
    const account = input.accounts.find((item) => item.provider === provider);
    return {
      accountId: account?.id ?? null,
      capabilities: readMarketplaceProviderCapabilities(provider, account),
      connectionStatus: accountStatusToConnectionStatus(account?.status),
      lastSyncSummary: summarizeStockSyncJobs(
        input.jobs.filter((job) => job.accountId === account?.id),
      ),
      provider,
      requirements:
        account?.status === "active"
          ? []
          : [
              {
                code: "MARKETPLACE_ACCOUNT_NOT_CONNECTED",
                message: "Marketplace account is not connected.",
                severity: "blocked",
                userAction: "Connect the marketplace account before syncing.",
              },
            ],
    };
  });
}

function accountStatusToConnectionStatus(
  status: MarketplaceAccount["status"] | undefined,
): MarketplaceOverview["providerStates"][number]["connectionStatus"] {
  if (status === "active") return "connected";
  if (status === "error") return "degraded";
  if (status === "inactive") return "paused";
  return "not_configured";
}

function summarizeStockSyncJobs(
  jobs: readonly MarketplaceJob[],
): MarketplaceOverview["providerStates"][number]["lastSyncSummary"] {
  const stockJobs = jobs.filter((job) => job.metadata.stockSync === true);
  if (!stockJobs.length) return null;
  const batchId = readString(stockJobs[0]?.metadata.batchId);
  const batchJobs = batchId
    ? stockJobs.filter((job) => readString(job.metadata.batchId) === batchId)
    : [stockJobs[0]!];
  return {
    batchId,
    blocked: countByDecision(batchJobs, "blocked"),
    failed: batchJobs.filter((job) => job.status === "failed").length,
    noOp: countByDecision(batchJobs, "no_op"),
    publish: countByDecision(batchJobs, "publish"),
    queued: batchJobs.filter((job) =>
      ["queued", "running", "submitted"].includes(job.status),
    ).length,
    succeeded: batchJobs.filter((job) => job.status === "succeeded").length,
    total: batchJobs.length,
    unpublish: countByDecision(batchJobs, "unpublish"),
    update: countByDecision(batchJobs, "update"),
  };
}

function countByDecision(jobs: readonly MarketplaceJob[], decision: string) {
  return jobs.filter((job) => job.metadata.planDecision === decision).length;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
