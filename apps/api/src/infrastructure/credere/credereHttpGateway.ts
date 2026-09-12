import type {
  FinancingGatewayAuthConfig,
  FinancingProviderGateway,
} from "../../domains/financing/ports/financingProviderGateway.js";
import { FinancingProviderGatewayError } from "../../domains/financing/ports/financingProviderGateway.js";
import {
  createCredereAuthorizationUrl,
  exchangeCredereAuthorizationCode,
  refreshCredereToken,
  revokeCredereToken,
} from "./credereAuth.js";
import {
  mapIntegratedBanks,
  mapLead,
  mapRequiredFields,
  mapSimulation,
  mapStores,
  mapVehicleModel,
  simulationPayload,
} from "./credereDtoMappers.js";
import { mapDomainOptions } from "./credereDomainMappers.js";
import { parseSafeJson, providerError } from "./credereHttpSupport.js";
import {
  readCredere,
  readCredereJson,
  writeCredereJson,
  writeCredereJsonResponse,
} from "./credereJsonTransport.js";
import { leadPayload } from "./credereLeadPayload.js";
import { mapSellers } from "./credereSellerMappers.js";
import { mapCredereFipeModels } from "./credereFipeModels.js";
import { listCredereSimulationCandidates } from "./credereSimulationReconciliation.js";

export type CredereHttpGatewayOptions = {
  apiRoot?: string;
  auth?: FinancingGatewayAuthConfig;
  fetch?: typeof fetch;
};

export function createCredereHttpGateway(
  options: CredereHttpGatewayOptions = {},
): FinancingProviderGateway {
  const fetchImpl = options.fetch ?? fetch;
  const auth = readAuth(options);
  const apiRoot = options.apiRoot;

  return {
    createAuthorizationUrl: async (input) =>
      createCredereAuthorizationUrl(auth, input, apiRoot),
    createLead: async (input) =>
      mapLead(
        await writeCredereJson(
          fetchImpl,
          "/banks_api/leads",
          input,
          { body: leadPayload(input.lead), method: "POST" },
          apiRoot,
        ),
      ),
    createSimulation: async (input) => {
      const response = await writeCredereJsonResponse(
        fetchImpl,
        "/banks_api/simulations",
        input,
        {
          body: simulationPayload(input.simulation),
          indeterminateOnFailure: true,
          method: "POST",
        },
        apiRoot,
      );
      return mapSimulation(
        await parseSafeJson(response),
        response.headers.get("x-request-id"),
      );
    },
    exchangeAuthorizationCode: (input) =>
      exchangeCredereAuthorizationCode(fetchImpl, auth, input, apiRoot),
    getLead: async (input) => {
      const response = await readCredere(
        fetchImpl,
        leadPath(input.cpfCnpj),
        input,
        {},
        apiRoot,
      );
      if (response.status === 404) return null;
      if (!response.ok) throw providerError(response);
      return mapLead(await parseSafeJson(response));
    },
    getRequiredFields: async (input) =>
      mapRequiredFields(
        await readCredereJson(
          fetchImpl,
          `${leadPath(input.cpfCnpj)}/required_fields`,
          input,
          {},
          apiRoot,
        ),
      ),
    getSimulation: async (input) => {
      const response = await readCredere(
        fetchImpl,
        `/banks_api/simulations/${encodeURIComponent(input.uuid)}`,
        input,
        {},
        apiRoot,
      );
      if (!response.ok) throw providerError(response);
      return mapSimulation(
        await parseSafeJson(response),
        response.headers.get("x-request-id"),
      );
    },
    listIntegratedBanks: async (input) =>
      mapIntegratedBanks(
        await readCredereJson(
          fetchImpl,
          `/stores/${encodeURIComponent(input.credereStoreId)}/integrated_banks`,
          input,
          { storeHeader: false },
          apiRoot,
        ),
      ),
    listDomainOptions: async (input) => {
      const entries = await Promise.all(
        input.types.map(async (type) => ({
          options: mapDomainOptions(
            await readCredereJson(
              fetchImpl,
              "/banks_api/domains",
              input,
              { query: { types: type } },
              apiRoot,
            ),
            type,
          ),
          type,
        })),
      );
      const optionsByType: Record<string, (typeof entries)[number]["options"]> =
        {};
      for (const entry of entries) optionsByType[entry.type] = entry.options;
      return optionsByType;
    },
    listSimulationCandidates: (input) =>
      listCredereSimulationCandidates(fetchImpl, input, apiRoot),
    listSellers: async (input) =>
      mapSellers(
        await readCredereJson(
          fetchImpl,
          "/users/proposals_filter_list",
          input,
          {
            query: { store_id: input.credereStoreId },
            storeHeader: false,
          },
          apiRoot,
        ),
      ),
    listStores: async (input) =>
      mapStores(
        await readCredereJson(fetchImpl, "/stores", input, {}, apiRoot),
      ),
    listVehicleModelsByFipe: async (input) =>
      mapCredereFipeModels(
        await readCredereJson(
          fetchImpl,
          "/vehicle_models",
          input,
          {
            query: {
              fipe_code: input.fipeCode,
              per_page: "100",
              year_end_greater_than_or_equal_to: String(input.modelYear),
              year_start_less_than_or_equal_to: String(input.modelYear),
            },
            storeHeader: false,
          },
          apiRoot,
        ),
      ),
    lookupVehicleModel: async (input) =>
      mapVehicleModel(
        await readCredereJson(
          fetchImpl,
          "/vehicle_models/search",
          input,
          {
            query: {
              manufacture_year: String(input.manufactureYear),
              model_year: String(input.modelYear),
              q: input.query,
            },
            storeHeader: false,
          },
          apiRoot,
        ),
      ),
    provider: "credere",
    refreshToken: (refreshToken) =>
      refreshCredereToken(fetchImpl, auth, refreshToken, apiRoot),
    revokeToken: (accessToken) =>
      revokeCredereToken(fetchImpl, accessToken, apiRoot),
    updateLead: async (input) =>
      mapLead(
        await writeCredereJson(
          fetchImpl,
          leadPath(input.cpfCnpj),
          input,
          { body: leadPayload(input.lead), method: "PUT" },
          apiRoot,
        ),
      ),
  };
}

function readAuth(options: CredereHttpGatewayOptions) {
  if (!options.auth?.clientId || !options.auth.clientSecret) {
    throw new FinancingProviderGatewayError(
      "not_configured",
      "Credere OAuth credentials are not configured.",
      500,
    );
  }
  return options.auth;
}

function leadPath(cpfCnpj: string) {
  return `/banks_api/leads/${encodeURIComponent(cpfCnpj.replace(/\D/g, ""))}`;
}
