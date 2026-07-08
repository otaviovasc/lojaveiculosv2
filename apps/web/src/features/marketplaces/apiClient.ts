import { readApiJson } from "../../lib/apiErrors";
import type {
  CreateMarketplaceSyncJobInput,
  CompleteMarketplaceConnectionInput,
  CreateMarketplaceConnectUrlInput,
  MarketplaceAuth,
  MarketplaceConnectUrl,
  MarketplaceJob,
  MarketplaceOverview,
  MarketplaceProvider,
  MarketplaceStockSyncPreviewRequest,
  MarketplaceStockSyncPreviewResponse,
  MarketplaceStockSyncRunRequest,
  MarketplaceStockSyncRunResponse,
  MarketplaceSyncJobRetryRequest,
  MarketplaceSyncJobRetryResponse,
  UpsertMarketplaceAccountInput,
} from "./types";

export type MarketplaceApi = {
  completeConnection: (
    input: CompleteMarketplaceConnectionInput,
  ) => Promise<MarketplaceOverview["accounts"][number]>;
  createConnectUrl: (
    input: CreateMarketplaceConnectUrlInput,
  ) => Promise<MarketplaceConnectUrl>;
  createSyncJob: (
    provider: MarketplaceProvider,
    input: CreateMarketplaceSyncJobInput,
  ) => Promise<MarketplaceJob>;
  getOverview: () => Promise<MarketplaceOverview>;
  previewStockSync: (
    provider: MarketplaceProvider,
    input: MarketplaceStockSyncPreviewRequest,
  ) => Promise<MarketplaceStockSyncPreviewResponse>;
  retrySyncJob: (
    jobId: string,
    input?: MarketplaceSyncJobRetryRequest,
  ) => Promise<MarketplaceSyncJobRetryResponse>;
  runSyncJob: (jobId: string) => Promise<MarketplaceJob>;
  runStockSync: (
    provider: MarketplaceProvider,
    input: MarketplaceStockSyncRunRequest,
  ) => Promise<MarketplaceStockSyncRunResponse>;
  upsertAccount: (
    provider: MarketplaceProvider,
    input: UpsertMarketplaceAccountInput,
  ) => Promise<MarketplaceOverview["accounts"][number]>;
};

export type CreateMarketplaceApiOptions = {
  auth?: MarketplaceAuth;
  baseUrl?: string;
  fetch: typeof fetch;
};

export function createMarketplaceApi({
  auth = {},
  baseUrl,
  fetch,
}: CreateMarketplaceApiOptions): MarketplaceApi {
  return {
    completeConnection: (input) =>
      fetch(marketplaceRoutes.oauthComplete(baseUrl), {
        body: JSON.stringify(input),
        headers: createMarketplaceHeaders(auth),
        method: "POST",
      }).then(readJson<MarketplaceOverview["accounts"][number]>),
    createConnectUrl: (input) =>
      fetch(marketplaceRoutes.connectUrl(baseUrl), {
        body: JSON.stringify(input),
        headers: createMarketplaceHeaders(auth),
        method: "POST",
      }).then(readJson<MarketplaceConnectUrl>),
    createSyncJob: (provider, input) =>
      fetch(marketplaceRoutes.syncJobs(provider, baseUrl), {
        body: JSON.stringify(input),
        headers: createMarketplaceHeaders(auth),
        method: "POST",
      }).then(readJson<MarketplaceJob>),
    getOverview: () =>
      fetch(marketplaceRoutes.overview(baseUrl), {
        headers: createMarketplaceHeaders(auth),
      }).then(readJson<MarketplaceOverview>),
    previewStockSync: (provider, input) =>
      fetch(marketplaceRoutes.stockSyncPreview(provider, baseUrl), {
        body: JSON.stringify(input),
        headers: createMarketplaceHeaders(auth),
        method: "POST",
      }).then(readJson<MarketplaceStockSyncPreviewResponse>),
    retrySyncJob: (jobId, input = {}) =>
      fetch(marketplaceRoutes.retryJob(jobId, baseUrl), {
        body: JSON.stringify(input),
        headers: createMarketplaceHeaders(auth),
        method: "POST",
      }).then(readJson<MarketplaceSyncJobRetryResponse>),
    runSyncJob: (jobId) =>
      fetch(marketplaceRoutes.runJob(jobId, baseUrl), {
        headers: createMarketplaceHeaders(auth),
        method: "POST",
      }).then(readJson<MarketplaceJob>),
    runStockSync: (provider, input) =>
      fetch(marketplaceRoutes.stockSyncRun(provider, baseUrl), {
        body: JSON.stringify(input),
        headers: createMarketplaceHeaders(auth),
        method: "POST",
      }).then(readJson<MarketplaceStockSyncRunResponse>),
    upsertAccount: (provider, input) =>
      fetch(marketplaceRoutes.integration(provider, baseUrl), {
        body: JSON.stringify(input),
        headers: createMarketplaceHeaders(auth),
        method: "PUT",
      }).then(readJson<MarketplaceOverview["accounts"][number]>),
  };
}

export const marketplaceRoutes = {
  connectUrl: (baseUrl?: string) =>
    createMarketplaceEndpoint("/marketplaces/connect-url", baseUrl),
  integration: (provider: MarketplaceProvider, baseUrl?: string) =>
    createMarketplaceEndpoint(
      `/marketplaces/integrations/${provider}`,
      baseUrl,
    ),
  oauthComplete: (baseUrl?: string) =>
    createMarketplaceEndpoint("/marketplaces/oauth/complete", baseUrl),
  overview: (baseUrl?: string) =>
    createMarketplaceEndpoint("/marketplaces/overview", baseUrl),
  runJob: (jobId: string, baseUrl?: string) =>
    createMarketplaceEndpoint(`/marketplaces/sync-jobs/${jobId}/run`, baseUrl),
  retryJob: (jobId: string, baseUrl?: string) =>
    createMarketplaceEndpoint(
      `/marketplaces/sync-jobs/${jobId}/retry`,
      baseUrl,
    ),
  stockSyncPreview: (provider: MarketplaceProvider, baseUrl?: string) =>
    createMarketplaceEndpoint(
      `/marketplaces/integrations/${provider}/stock-sync/preview`,
      baseUrl,
    ),
  stockSyncRun: (provider: MarketplaceProvider, baseUrl?: string) =>
    createMarketplaceEndpoint(
      `/marketplaces/integrations/${provider}/stock-sync/run`,
      baseUrl,
    ),
  syncJobs: (provider: MarketplaceProvider, baseUrl?: string) =>
    createMarketplaceEndpoint(
      `/marketplaces/integrations/${provider}/sync-jobs`,
      baseUrl,
    ),
} as const;

function createMarketplaceHeaders(auth: MarketplaceAuth): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (auth.accessToken) headers.Authorization = `Bearer ${auth.accessToken}`;
  if (auth.clerkUserId) headers["x-clerk-user-id"] = auth.clerkUserId;
  if (auth.storeSlug) headers["x-store-slug"] = auth.storeSlug;
  return headers;
}

function createMarketplaceEndpoint(path: string, baseUrl = "/api/v1") {
  const normalizedBase = baseUrl.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

async function readJson<T>(response: Response): Promise<T> {
  return readApiJson<T>(response, { feature: "Marketplaces" });
}
