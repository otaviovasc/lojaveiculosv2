import { completeMarketplaceConnection } from "../../../domains/marketplace/services/MarketplaceService/completeMarketplaceConnection.js";
import type { CompleteMarketplaceConnectionInput } from "../../../domains/marketplace/services/MarketplaceService/completeMarketplaceConnection.js";
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

export type MarketplaceServices = {
  completeConnection: (
    context: ServiceContext,
    input: CompleteMarketplaceConnectionInput,
  ) => Promise<MarketplaceAccount>;
  createConnectUrl: (
    context: ServiceContext,
    input: CreateMarketplaceConnectUrlInput,
  ) => Promise<MarketplaceConnectUrl>;
  createSyncJob: (
    context: ServiceContext,
    input: CreateMarketplaceSyncJobServiceInput,
  ) => Promise<MarketplaceJob>;
  listOverview: (context: ServiceContext) => Promise<MarketplaceOverview>;
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
      marketplaceRepository: createDrizzleMarketplaceRepository(
        options.drizzleClient,
      ),
    };
  }

  return { marketplaceRepository: createMemoryMarketplaceRepository() };
}

export const marketplaceServices = createMarketplaceServices();
