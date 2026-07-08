import type {
  MarketplaceAccount,
  MarketplaceJob,
  MarketplaceOverview,
  MarketplaceProvider,
} from "../../../domains/marketplace/ports/marketplaceRepository.js";

export function buildProviderStates(input: {
  accounts: readonly MarketplaceAccount[];
  jobs: readonly MarketplaceJob[];
  providers: readonly MarketplaceProvider[];
}): MarketplaceOverview["providerStates"] {
  return input.providers.map((provider) => {
    const account = input.accounts.find((item) => item.provider === provider);
    return {
      accountId: account?.id ?? null,
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
  return {
    batchId: readString(stockJobs[0]?.metadata.batchId),
    blocked: countByDecision(stockJobs, "blocked"),
    failed: stockJobs.filter((job) => job.status === "failed").length,
    noOp: countByDecision(stockJobs, "no_op"),
    publish: countByDecision(stockJobs, "publish"),
    queued: stockJobs.filter((job) => job.status === "queued").length,
    succeeded: stockJobs.filter((job) => job.status === "succeeded").length,
    total: stockJobs.length,
    unpublish: countByDecision(stockJobs, "unpublish"),
    update: countByDecision(stockJobs, "update"),
  };
}

function countByDecision(jobs: readonly MarketplaceJob[], decision: string) {
  return jobs.filter((job) => job.metadata.planDecision === decision).length;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
