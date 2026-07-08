import type {
  CreateMarketplaceJobInput,
  MarketplaceAccount,
  MarketplaceCatalogMapping,
  MarketplaceJob,
  MarketplaceListingProjection,
  MarketplaceProvider,
  MarketplaceProviderListing,
} from "./ports/marketplaceRepository.js";

export const testMarketplaceProviders = [
  "olx",
  "mercado_livre",
] satisfies MarketplaceProvider[];

export function createResolvedMarketplaceCatalogMapping(
  provider: MarketplaceProvider = "mercado_livre",
): MarketplaceCatalogMapping {
  return {
    fipeBrandCode: "21",
    fipeCode: "001267-0",
    fipeModelCode: "4828",
    fipeYearCode: "2024-1",
    provider,
    providerBrandCode: "provider_brand_21",
    providerModelCode: "provider_model_4828",
    providerTrimCode: "provider_trim_001267_0",
    providerYearCode: "provider_year_2024_1",
    status: "resolved",
    unresolvedReason: null,
    vehicleType: "cars",
  };
}

export function toTestMarketplaceListing(
  listingId: string,
): MarketplaceListingProjection {
  return {
    catalog: {
      brandCode: "21",
      brandName: "BMW",
      fipeCode: "001267-0",
      fuel: "Gasolina",
      modelCode: "4828",
      modelName: "M3 Competition M",
      modelYear: 2024,
      referenceMonth: "julho de 2026",
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
    mileageKm: 12000,
    modelYear: 2024,
    priceCents: 10000000,
    publicSlug: "veiculo-de-teste",
    selectedMedia: [
      {
        altText: "Frente do veiculo",
        url: "https://cdn.local/vehicle-front.jpg",
      },
    ],
    selectedUnitId: "unit_memory_1",
    status: "published",
    stockLabel: "LV-001",
    title: "Veiculo de teste",
    trimName: "Competition M",
    vehicleType: "cars",
  };
}

export function toTestMarketplaceJob(
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

export function upsertTestProviderListing(
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

export function assertScopedMarketplaceJob(
  jobs: MarketplaceJob[],
  accounts: MarketplaceAccount[],
  input: { jobId: string; storeId: string; tenantId: string },
) {
  if (findScopedMarketplaceJob(jobs, accounts, input)) return;
  throw new Error(`Marketplace job not found: ${input.jobId}`);
}

export function findScopedMarketplaceJob(
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

export function findMarketplaceJob(
  jobs: readonly MarketplaceJob[],
  jobId: string,
) {
  const job = jobs.find((item) => item.id === jobId);
  if (!job) throw new Error(`Marketplace job not found: ${jobId}`);
  return job;
}
