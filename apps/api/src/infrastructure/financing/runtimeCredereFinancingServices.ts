import type { CredereFinancingServices } from "../../features/financing/controllers/credereFinancingServices.js";
import {
  disconnectFinancingProvider,
  getFinancingConnectionOverview,
} from "../../domains/financing/services/FinancingService/connectionOverviewService.js";
import {
  completeFinancingOAuthCallbackFromState,
  startFinancingOAuthTransaction,
} from "../../domains/financing/services/FinancingService/oauthConnectionService.js";
import { getCredereRequiredFields } from "../../domains/financing/services/FinancingService/requiredFieldsService.js";
import { getFinancingReadiness } from "../../domains/financing/services/FinancingService/readinessService.js";
import { createCredereSimulation } from "../../domains/financing/services/FinancingService/simulationCreateService.js";
import { resolveCredereFipeVehicle } from "../../domains/financing/services/FinancingService/fipeResolutionService.js";
import {
  getCredereSimulation,
  listCredereSimulations,
  pollCredereSimulation,
} from "../../domains/financing/services/FinancingService/simulationService.js";
import { syncCredereSimulations } from "../../domains/financing/services/FinancingService/simulationSyncService.js";
import {
  discoverCredereProviderStores,
  mapCredereStore,
  unmapCredereStore,
} from "../../domains/financing/services/FinancingService/storeMappingService.js";
import { createDrizzleFinancingRepository } from "../db/financing/drizzleFinancingRepository.js";
import type { DrizzleFinancingClient } from "../db/financing/drizzleFinancingRepository.js";
import { createCredereHttpGateway } from "../credere/credereHttpGateway.js";
import { resolveRuntimeCredereFinancingConfig } from "./runtimeCredereFinancingConfig.js";
import { toCredereSimulationInput } from "./runtimeCredereSimulationInput.js";
import { createCredereCredentialCodec } from "./credereCredentialCodec.js";

export function createRuntimeCredereFinancingServices(
  db: unknown,
  env: Record<string, string | undefined>,
): CredereFinancingServices | undefined {
  const config = resolveRuntimeCredereFinancingConfig(env);
  if (!config) return undefined;
  const ports = {
    gateway: createCredereHttpGateway({
      apiRoot: config.apiRoot,
      auth: {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        scope: config.scope,
      },
    }),
    oauthRedirectUri: config.redirectUri,
    repository: createDrizzleFinancingRepository(db as DrizzleFinancingClient, {
      bankPolicyCodes: config.bankPolicyCodes,
      codec: createCredereCredentialCodec(env),
      environment: config.environment,
      redirectUri: config.redirectUri,
    }),
  };

  return {
    agency: {
      deleteConnection: (context) =>
        disconnectFinancingProvider(context, ports),
      deleteStoreMapping: (context, input) =>
        unmapCredereStore(context, input, ports),
      getConnection: (context) =>
        getFinancingConnectionOverview(context, ports),
      listProviderStores: async (context) => ({
        stores: await discoverCredereProviderStores(context, ports),
      }),
      startOAuth: (context) => startFinancingOAuthTransaction(context, ports),
      upsertStoreMapping: (context, input) =>
        mapCredereStore(
          context,
          { providerStoreId: input.externalStoreId, storeId: input.storeId },
          ports,
        ),
    },
    oauth: {
      completeCallback: (context, input) =>
        completeFinancingOAuthCallbackFromState(context, input, ports),
    },
    store: {
      createSimulation: (context, input) =>
        createCredereSimulation(
          context,
          toCredereSimulationInput(input.payload, input.idempotencyKey),
          ports,
        ),
      getRequiredFields: (context, input) =>
        getCredereRequiredFields(context, input, ports),
      getSimulation: (context, input) =>
        getCredereSimulation(context, input, ports),
      getStatus: (context) => getFinancingReadiness(context, ports),
      listSimulations: (context) => listCredereSimulations(context, {}, ports),
      refreshSimulation: (context, input) =>
        pollCredereSimulation(context, input, ports),
      resolveFipeVehicle: (context, input) =>
        resolveCredereFipeVehicle(context, input, ports),
      syncSimulations: (context) => syncCredereSimulations(context, {}, ports),
    },
  };
}
