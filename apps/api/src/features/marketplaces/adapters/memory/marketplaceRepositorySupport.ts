import type {
  CreateMarketplaceJobInput,
  MarketplaceAccount,
  MarketplaceJob,
  MarketplaceListingProjection,
  MarketplaceOverview,
  MarketplaceProvider,
  MarketplaceProviderListing,
} from "../../../../domains/marketplace/ports/marketplaceRepository.js";

export const memoryMarketplaceProviders = [
  "olx",
  "mercado_livre",
] satisfies MarketplaceProvider[];

export function toMemoryMarketplaceListing(
  listingId: string,
): MarketplaceListingProjection {
  return {
    catalog: {
      brandCode: "honda",
      brandName: "Honda",
      fipeCode: "001267-0",
      fuel: "Gasolina",
      modelCode: "civic",
      modelName: "Civic",
      modelYear: 2024,
      referenceMonth: null,
      source: "fipe",
      vehicleType: "cars",
      yearCode: "2024-1",
      yearName: "2024 Gasolina",
    },
    description: "Anuncio de teste para integracao.",
    doors: 4,
    fuelType: "gasoline",
    isVisibleOnPublicSite: true,
    listingId,
    mediaUrls: ["https://cdn.local/vehicle-front.jpg"],
    mileageKm: 1000,
    modelYear: 2024,
    priceCents: 10000000,
    publicSlug: `listing-${listingId}`,
    selectedMedia: [
      {
        altText: "Foto dianteira do veiculo",
        url: "https://cdn.local/vehicle-front.jpg",
      },
    ],
    selectedUnitId: null,
    status: "published",
    stockLabel: "Civic EXL",
    title: "Veiculo de teste",
    trimName: "EXL",
    vehicleType: "cars",
  };
}

export function toMemoryMarketplaceOverview(
  storeId: MarketplaceOverview["storeId"],
  tenantId: MarketplaceOverview["tenantId"],
  accounts: readonly MarketplaceAccount[],
  jobs: readonly MarketplaceJob[],
): MarketplaceOverview {
  const scopedAccounts = accounts.filter(
    (item) => item.storeId === storeId && item.tenantId === tenantId,
  );
  return {
    accounts: scopedAccounts,
    jobs: jobs.filter((item) =>
      scopedAccounts.some((account) => account.id === item.accountId),
    ),
    providerStates: memoryMarketplaceProviders.map((provider) => ({
      accountId:
        scopedAccounts.find((account) => account.provider === provider)?.id ??
        null,
      connectionStatus: scopedAccounts.some(
        (account) =>
          account.provider === provider && account.status === "active",
      )
        ? "connected"
        : "not_configured",
      lastSyncSummary: null,
      provider,
      requirements: [],
    })),
    providers: memoryMarketplaceProviders,
    storeId,
    tenantId,
  };
}

export function toMemoryMarketplaceJob(
  input: CreateMarketplaceJobInput,
  accountId: string,
  sequence: number,
): MarketplaceJob {
  return {
    accountId,
    completedAt: null,
    createdAt: new Date(),
    errorMessage: null,
    id: `marketplace_job_${sequence}`,
    jobType: input.jobType,
    metadata: input.metadata,
    provider: input.provider,
    status: "queued",
  };
}

export function upsertMemoryProviderListing(
  providerListings: readonly MarketplaceProviderListing[],
  providerListing: MarketplaceProviderListing,
): MarketplaceProviderListing[] {
  return [
    ...providerListings.filter(
      (item) =>
        item.accountId !== providerListing.accountId ||
        item.listingId !== providerListing.listingId,
    ),
    providerListing,
  ];
}

export function assertScopedMemoryJob(
  jobs: MarketplaceJob[],
  accounts: MarketplaceAccount[],
  input: { jobId: string; storeId: string; tenantId: string },
) {
  if (findScopedMemoryJob(jobs, accounts, input)) return;
  throw new Error(`Marketplace job not found: ${input.jobId}`);
}

export function findScopedMemoryJob(
  jobs: MarketplaceJob[],
  accounts: MarketplaceAccount[],
  input: { jobId: string; storeId: string; tenantId: string },
) {
  const job = jobs.find((item) => item.id === input.jobId);
  const account = job
    ? accounts.find((item) => item.id === job.accountId)
    : null;
  return account?.storeId === input.storeId &&
    account.tenantId === input.tenantId
    ? job
    : null;
}

export function findMemoryJob(jobs: readonly MarketplaceJob[], jobId: string) {
  const job = jobs.find((item) => item.id === jobId);
  if (!job) throw new Error(`Marketplace job not found: ${jobId}`);
  return job;
}
