import {
  completeMarketplaceConnection,
  receiveMarketplaceOAuthCallback,
} from "../../../domains/marketplace/services/MarketplaceService/completeMarketplaceConnection.js";
import type {
  CompleteMarketplaceConnectionInput,
  CompleteMarketplaceConnectionResult,
  ReceiveMarketplaceOAuthCallbackInput,
  ReceiveMarketplaceOAuthCallbackResult,
} from "../../../domains/marketplace/services/MarketplaceService/completeMarketplaceConnection.js";
import { createMarketplaceConnectUrl } from "../../../domains/marketplace/services/MarketplaceService/createMarketplaceConnectUrl.js";
import type {
  CreateMarketplaceConnectUrlInput,
  MarketplaceConnectUrl,
} from "../../../domains/marketplace/services/MarketplaceService/createMarketplaceConnectUrl.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import { createMarketplaceSyncJob } from "../../../domains/marketplace/services/MarketplaceService/createMarketplaceSyncJob.js";
import type { CreateMarketplaceSyncJobServiceInput } from "../../../domains/marketplace/services/MarketplaceService/createMarketplaceSyncJob.js";
import { listMarketplaceOverview } from "../../../domains/marketplace/services/MarketplaceService/listMarketplaceOverview.js";
import { runMarketplaceSyncJob } from "../../../domains/marketplace/services/MarketplaceService/runMarketplaceSyncJob.js";
import type { RunMarketplaceSyncJobInput } from "../../../domains/marketplace/services/MarketplaceService/runMarketplaceSyncJob.js";
import {
  previewMarketplaceStockSync,
  runMarketplaceStockSync,
} from "../../../domains/marketplace/services/MarketplaceService/runMarketplaceStockSync.js";
import type {
  MarketplaceStockSyncPreviewInput,
  MarketplaceStockSyncPreviewResult,
  MarketplaceStockSyncRunInput,
  MarketplaceStockSyncRunResult,
} from "../../../domains/marketplace/services/MarketplaceService/runMarketplaceStockSync.js";
import { retryMarketplaceSyncJob } from "../../../domains/marketplace/services/MarketplaceService/retryMarketplaceSyncJob.js";
import type {
  RetryMarketplaceSyncJobInput,
  RetryMarketplaceSyncJobResult,
} from "../../../domains/marketplace/services/MarketplaceService/retryMarketplaceSyncJob.js";
import { upsertMarketplaceAccount } from "../../../domains/marketplace/services/MarketplaceService/upsertMarketplaceAccount.js";
import type { UpsertMarketplaceAccountServiceInput } from "../../../domains/marketplace/services/MarketplaceService/upsertMarketplaceAccount.js";
import type {
  MarketplaceAccount,
  MarketplaceJob,
  MarketplaceOverview,
} from "../../../domains/marketplace/ports/marketplaceRepository.js";
import type { MarketplaceServicePorts } from "../../../domains/marketplace/services/MarketplaceService/serviceSupport.js";
import {
  createDrizzleMarketplaceRepository,
  type DrizzleMarketplaceClient,
} from "../../../infrastructure/db/marketplace/drizzleMarketplaceRepository.js";
import { createMemoryMarketplaceRepository } from "../adapters/memory/marketplaceRepository.js";
import { createMemoryMarketplaceOAuthStateStore } from "../adapters/memory/marketplaceOAuthStateStore.js";

export type MarketplaceServices = {
  completeConnection: (
    context: ServiceContext,
    input: CompleteMarketplaceConnectionInput,
  ) => Promise<CompleteMarketplaceConnectionResult>;
  createConnectUrl: (
    context: ServiceContext,
    input: CreateMarketplaceConnectUrlInput,
  ) => Promise<MarketplaceConnectUrl>;
  createSyncJob: (
    context: ServiceContext,
    input: CreateMarketplaceSyncJobServiceInput,
  ) => Promise<MarketplaceJob>;
  listOverview: (context: ServiceContext) => Promise<MarketplaceOverview>;
  previewStockSync: (
    context: ServiceContext,
    input: MarketplaceStockSyncPreviewInput,
  ) => Promise<MarketplaceStockSyncPreviewResult>;
  retrySyncJob: (
    context: ServiceContext,
    input: RetryMarketplaceSyncJobInput,
  ) => Promise<RetryMarketplaceSyncJobResult>;
  receiveOAuthCallback: (
    context: ServiceContext,
    input: ReceiveMarketplaceOAuthCallbackInput,
  ) => Promise<ReceiveMarketplaceOAuthCallbackResult>;
  runStockSync: (
    context: ServiceContext,
    input: MarketplaceStockSyncRunInput,
  ) => Promise<MarketplaceStockSyncRunResult>;
  runSyncJob: (
    context: ServiceContext,
    input: RunMarketplaceSyncJobInput,
  ) => Promise<MarketplaceJob>;
  upsertAccount: (
    context: ServiceContext,
    input: UpsertMarketplaceAccountServiceInput,
  ) => Promise<MarketplaceAccount>;
};

export type CreateMarketplaceServicesOptions =
  | { drizzleClient?: never; ports?: MarketplaceServicePorts }
  | {
      drizzleClient: DrizzleMarketplaceClient;
      gatewayRegistry?: MarketplaceServicePorts["gatewayRegistry"];
      oauthRedirectUri?: MarketplaceServicePorts["oauthRedirectUri"];
      oauthStateStore?: MarketplaceServicePorts["oauthStateStore"];
      olxCrmOnboarding?: MarketplaceServicePorts["olxCrmOnboarding"];
      ports?: never;
    };

export function createMarketplaceServices(
  options: CreateMarketplaceServicesOptions = {},
): MarketplaceServices {
  const ports = resolvePorts(options);

  return {
    completeConnection: (context, input) =>
      completeMarketplaceConnection(context, input, ports),
    createConnectUrl: (context, input) =>
      createMarketplaceConnectUrl(context, input, ports),
    createSyncJob: (context, input) =>
      createMarketplaceSyncJob(context, input, ports),
    listOverview: (context) => listMarketplaceOverview(context, ports),
    previewStockSync: (context, input) =>
      previewMarketplaceStockSync(context, input, ports),
    retrySyncJob: (context, input) =>
      retryMarketplaceSyncJob(context, input, ports),
    receiveOAuthCallback: (context, input) =>
      receiveMarketplaceOAuthCallback(context, input, ports),
    runStockSync: (context, input) =>
      runMarketplaceStockSync(context, input, ports),
    runSyncJob: (context, input) =>
      runMarketplaceSyncJob(context, input, ports),
    upsertAccount: (context, input) =>
      upsertMarketplaceAccount(context, input, ports),
  };
}

function resolvePorts(
  options: CreateMarketplaceServicesOptions,
): MarketplaceServicePorts {
  if ("ports" in options && options.ports) return options.ports;
  if ("drizzleClient" in options && options.drizzleClient) {
    return {
      ...(options.gatewayRegistry
        ? { gatewayRegistry: options.gatewayRegistry }
        : {}),
      ...(options.oauthRedirectUri
        ? { oauthRedirectUri: options.oauthRedirectUri }
        : {}),
      ...(options.oauthStateStore
        ? { oauthStateStore: options.oauthStateStore }
        : {}),
      ...(options.olxCrmOnboarding
        ? { olxCrmOnboarding: options.olxCrmOnboarding }
        : {}),
      marketplaceRepository: createDrizzleMarketplaceRepository(
        options.drizzleClient,
      ),
    };
  }

  return {
    marketplaceRepository: createMemoryMarketplaceRepository(),
    oauthRedirectUri: () => "http://localhost:3000/marketplaces/oauth/callback",
    oauthStateStore: createMemoryMarketplaceOAuthStateStore(),
  };
}

export const marketplaceServices = createMarketplaceServices();
