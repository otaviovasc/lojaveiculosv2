import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { integrationAccounts, integrationJobs } from "@lojaveiculosv2/db";
import type {
  MarketplaceOverview,
  MarketplaceProvider,
} from "../../../domains/marketplace/ports/marketplaceRepository.js";
import { createMarketplaceCredentialCodec } from "../../marketplace/marketplaceCredentialCodec.js";
import type { DrizzleMarketplaceClient } from "./drizzleMarketplaceRepository.js";
import { toAccount, toJob } from "./drizzleMarketplaceMappers.js";
import { buildProviderStates } from "./drizzleMarketplaceOverview.js";

const providers = ["olx", "mercado_livre"] satisfies MarketplaceProvider[];

export async function listOverview(
  db: DrizzleMarketplaceClient,
  input: { storeId: string; tenantId: string },
): Promise<MarketplaceOverview> {
  const [accountRows, jobRows] = await Promise.all([
    db
      .select()
      .from(integrationAccounts)
      .where(
        and(
          eq(integrationAccounts.storeId, input.storeId),
          eq(integrationAccounts.tenantId, input.tenantId),
          isNull(integrationAccounts.archivedAt),
        ),
      )
      .limit(50),
    db
      .select()
      .from(integrationJobs)
      .where(
        and(
          eq(integrationJobs.storeId, input.storeId),
          eq(integrationJobs.tenantId, input.tenantId),
        ),
      )
      .orderBy(desc(integrationJobs.createdAt))
      .limit(50),
  ]);
  const codec = createMarketplaceCredentialCodec(process.env);
  const accounts = accountRows.map((row) =>
    toAccount(row, codec.redactAccountConfig),
  );
  const jobAccountRows = jobRows.length
    ? await db
        .select({
          id: integrationAccounts.id,
          provider: integrationAccounts.provider,
        })
        .from(integrationAccounts)
        .where(
          and(
            inArray(
              integrationAccounts.id,
              jobRows.map(({ accountId }) => accountId),
            ),
            eq(integrationAccounts.storeId, input.storeId),
            eq(integrationAccounts.tenantId, input.tenantId),
          ),
        )
    : [];
  const jobProviders = new Map(
    jobAccountRows.map(
      (row) =>
        [
          row.id,
          row.provider === "mercado_livre" ? "mercado_livre" : "olx",
        ] as const,
    ),
  );
  const jobs = jobRows.map((row) => {
    const provider = jobProviders.get(row.accountId);
    if (!provider)
      throw new Error(`Marketplace overview job account not found: ${row.id}`);
    return toJob(row, provider);
  });
  return {
    accounts,
    jobs,
    providerStates: buildProviderStates({ accounts, jobs, providers }),
    providers,
    storeId: input.storeId as never,
    tenantId: input.tenantId as never,
  };
}
