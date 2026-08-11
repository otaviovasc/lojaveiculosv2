import type { ServiceContext } from "../../../shared/serviceContext.js";
import { CredereFinancingConfigurationError } from "./credereFinancing.errors.js";

export type CredereFinancingServices = {
  agency: {
    deleteConnection: (context: ServiceContext) => Promise<unknown>;
    deleteStoreMapping: (
      context: ServiceContext,
      input: { storeId: string },
    ) => Promise<unknown>;
    getConnection: (context: ServiceContext) => Promise<unknown>;
    listProviderStores: (context: ServiceContext) => Promise<unknown>;
    startOAuth: (context: ServiceContext) => Promise<unknown>;
    upsertStoreMapping: (
      context: ServiceContext,
      input: { externalStoreId: string; storeId: string },
    ) => Promise<unknown>;
  };
  oauth: {
    completeCallback: (input: {
      code: string;
      state: string;
    }) => Promise<unknown>;
  };
  store: {
    createSimulation: (
      context: ServiceContext,
      input: { idempotencyKey: string; payload: unknown },
    ) => Promise<unknown>;
    getRequiredFields: (
      context: ServiceContext,
      input: { document: string },
    ) => Promise<unknown>;
    getSimulation: (
      context: ServiceContext,
      input: { inquiryId: string },
    ) => Promise<unknown>;
    getStatus: (context: ServiceContext) => Promise<unknown>;
    listSimulations: (context: ServiceContext) => Promise<unknown>;
    refreshSimulation: (
      context: ServiceContext,
      input: { inquiryId: string },
    ) => Promise<unknown>;
    resolveFipeVehicle: (
      context: ServiceContext,
      input: {
        fipeCode: string;
        modelYear: number;
        selectedModelId?: string;
        selectedMolicarCode?: string;
      },
    ) => Promise<unknown>;
  };
};

export const credereFinancingServices: CredereFinancingServices =
  createUnavailableCredereFinancingServices();

export function createUnavailableCredereFinancingServices(): CredereFinancingServices {
  const unavailable = async (): Promise<never> => {
    throw new CredereFinancingConfigurationError(
      "Credere financing runtime is not configured.",
    );
  };

  return {
    agency: {
      deleteConnection: unavailable,
      deleteStoreMapping: unavailable,
      getConnection: unavailable,
      listProviderStores: unavailable,
      startOAuth: unavailable,
      upsertStoreMapping: unavailable,
    },
    oauth: {
      completeCallback: unavailable,
    },
    store: {
      createSimulation: unavailable,
      getRequiredFields: unavailable,
      getSimulation: unavailable,
      getStatus: unavailable,
      listSimulations: unavailable,
      refreshSimulation: unavailable,
      resolveFipeVehicle: unavailable,
    },
  };
}
