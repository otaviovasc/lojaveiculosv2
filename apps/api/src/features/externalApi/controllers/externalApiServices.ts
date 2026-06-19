import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { ExternalApiClient } from "../../../domains/externalApi/ports/externalApiRepository.js";
import { createExternalApiClient } from "../../../domains/externalApi/services/ExternalApiService/createExternalApiClient.js";
import type { CreatedExternalApiClient } from "../../../domains/externalApi/services/ExternalApiService/createExternalApiClient.js";
import { listExternalApiClients } from "../../../domains/externalApi/services/ExternalApiService/listExternalApiClients.js";
import { revokeExternalApiClient } from "../../../domains/externalApi/services/ExternalApiService/revokeExternalApiClient.js";
import type { CreateExternalApiClientServiceInput } from "../../../domains/externalApi/services/ExternalApiService/createExternalApiClient.js";
import type { ExternalApiServicePorts } from "../../../domains/externalApi/services/ExternalApiService/serviceSupport.js";
import {
  createDrizzleExternalApiRepository,
  type DrizzleExternalApiClient,
} from "../../../infrastructure/db/externalApi/drizzleExternalApiRepository.js";
import { createMemoryExternalApiRepository } from "../adapters/memory/externalApiRepository.js";

export type ExternalApiServices = {
  createClient: (
    context: ServiceContext,
    input: CreateExternalApiClientServiceInput,
  ) => Promise<CreatedExternalApiClient>;
  listClients: (
    context: ServiceContext,
  ) => Promise<readonly ExternalApiClient[]>;
  revokeClient: (
    context: ServiceContext,
    input: { clientId: string },
  ) => Promise<ExternalApiClient>;
};

export type CreateExternalApiServicesOptions =
  | { drizzleClient?: never; ports?: ExternalApiServicePorts }
  | { drizzleClient: DrizzleExternalApiClient; ports?: never };

export function createExternalApiServices(
  options: CreateExternalApiServicesOptions = {},
): ExternalApiServices {
  const ports = resolvePorts(options);

  return {
    createClient: (context, input) =>
      createExternalApiClient(context, input, ports),
    listClients: (context) => listExternalApiClients(context, ports),
    revokeClient: (context, input) =>
      revokeExternalApiClient(context, input, ports),
  };
}

function resolvePorts(
  options: CreateExternalApiServicesOptions,
): ExternalApiServicePorts {
  if ("ports" in options && options.ports) return options.ports;
  if ("drizzleClient" in options) {
    return {
      externalApiRepository: createDrizzleExternalApiRepository(
        options.drizzleClient,
      ),
    };
  }

  return { externalApiRepository: createMemoryExternalApiRepository() };
}

export const externalApiServices = createExternalApiServices();
