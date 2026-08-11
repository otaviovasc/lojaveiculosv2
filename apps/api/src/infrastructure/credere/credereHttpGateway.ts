import type {
  FinancingGatewayAuthConfig,
  FinancingProviderGateway,
  FinancingTokenSet,
} from "../../domains/financing/ports/financingProviderGateway.js";
import { FinancingProviderGatewayError } from "../../domains/financing/ports/financingProviderGateway.js";
import {
  createCredereAuthorizationUrl,
  exchangeCredereAuthorizationCode,
  refreshCredereToken,
  revokeCredereToken,
} from "./credereAuth.js";
import {
  isUsableCredereBank,
  mapIntegratedBanks,
  mapLead,
  mapRequiredFields,
  mapSimulation,
  mapStores,
  mapVehicleModel,
  simulationPayload,
} from "./credereDtoMappers.js";
import {
  bearerHeaders,
  credereApiUrl,
  fetchWithReadRetry,
  networkError,
  parseSafeJson,
  providerError,
} from "./credereHttpSupport.js";
import { leadPayload } from "./credereLeadPayload.js";
import { mapSellers } from "./credereSellerMappers.js";
import { mapCredereFipeModels } from "./credereFipeModels.js";

export type CredereHttpGatewayOptions = {
  auth?: FinancingGatewayAuthConfig;
  fetch?: typeof fetch;
};

export function createCredereHttpGateway(
  options: CredereHttpGatewayOptions = {},
): FinancingProviderGateway {
  const fetchImpl = options.fetch ?? fetch;
  const auth = readAuth(options);

  return {
    createAuthorizationUrl: async (input) =>
      createCredereAuthorizationUrl(auth, input),
    createLead: async (input) =>
      mapLead(
        await writeJson(fetchImpl, "/banks_api/leads", input, {
          body: leadPayload(input.lead),
          method: "POST",
        }),
      ),
    createSimulation: async (input) => {
      const response = await writeJsonResponse(
        fetchImpl,
        "/banks_api/simulations",
        input,
        {
          body: simulationPayload(input.simulation),
          indeterminateOnFailure: true,
          method: "POST",
        },
      );
      return mapSimulation(
        await parseSafeJson(response),
        response.headers.get("x-request-id"),
      );
    },
    exchangeAuthorizationCode: (input) =>
      exchangeCredereAuthorizationCode(fetchImpl, auth, input),
    getLead: async (input) => {
      const response = await read(fetchImpl, leadPath(input.cpfCnpj), input);
      if (response.status === 404) return null;
      if (!response.ok) throw providerError(response);
      return mapLead(await parseSafeJson(response));
    },
    getRequiredFields: async (input) =>
      mapRequiredFields(
        await readJson(
          fetchImpl,
          `${leadPath(input.cpfCnpj)}/required_fields`,
          input,
        ),
      ),
    getSimulation: async (input) => {
      const response = await read(
        fetchImpl,
        `/banks_api/simulations/${encodeURIComponent(input.uuid)}`,
        input,
      );
      if (!response.ok) throw providerError(response);
      return mapSimulation(
        await parseSafeJson(response),
        response.headers.get("x-request-id"),
      );
    },
    listIntegratedBanks: async (input) =>
      mapIntegratedBanks(
        await readJson(
          fetchImpl,
          `/stores/${encodeURIComponent(input.credereStoreId)}/integrated_banks`,
          input,
          { storeHeader: false },
        ),
      ).filter(isUsableCredereBank),
    listSellers: async (input) =>
      mapSellers(
        await readJson(fetchImpl, "/users/proposals_filter_list", input, {
          query: { store_id: input.credereStoreId },
          storeHeader: false,
        }),
      ),
    listStores: async (input) =>
      mapStores(await readJson(fetchImpl, "/stores", input)),
    listVehicleModelsByFipe: async (input) =>
      mapCredereFipeModels(
        await readJson(fetchImpl, "/vehicle_models", input, {
          query: {
            fipe_code: input.fipeCode,
            per_page: "100",
            year_end_greater_than_or_equal_to: String(input.modelYear),
            year_start_less_than_or_equal_to: String(input.modelYear),
          },
          storeHeader: false,
        }),
      ),
    lookupVehicleModel: async (input) =>
      mapVehicleModel(
        await readJson(fetchImpl, "/vehicle_models/search", input, {
          query: {
            manufacture_year: String(input.manufactureYear),
            model_year: String(input.modelYear),
            q: input.query,
          },
          storeHeader: false,
        }),
      ),
    provider: "credere",
    refreshToken: (refreshToken) =>
      refreshCredereToken(fetchImpl, auth, refreshToken),
    revokeToken: (accessToken) => revokeCredereToken(fetchImpl, accessToken),
    updateLead: async (input) =>
      mapLead(
        await writeJson(fetchImpl, leadPath(input.cpfCnpj), input, {
          body: leadPayload(input.lead),
          method: "PUT",
        }),
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

async function readJson(
  fetchImpl: typeof fetch,
  path: string,
  input: { credereStoreId?: string; token: FinancingTokenSet },
  options: { query?: Record<string, string>; storeHeader?: boolean } = {},
) {
  const response = await read(fetchImpl, path, input, options);
  if (!response.ok) throw providerError(response);
  return parseSafeJson(response);
}

async function read(
  fetchImpl: typeof fetch,
  path: string,
  input: { credereStoreId?: string; token: FinancingTokenSet },
  options: { query?: Record<string, string>; storeHeader?: boolean } = {},
) {
  return fetchWithReadRetry(fetchImpl, credereApiUrl(path, options.query), {
    headers: bearerHeaders(
      input.token.accessToken,
      options.storeHeader === false ? undefined : input.credereStoreId,
    ),
    method: "GET",
  });
}

async function writeJson(
  fetchImpl: typeof fetch,
  path: string,
  input: { credereStoreId: string; token: FinancingTokenSet },
  options: { body: unknown; method: "POST" | "PUT" },
) {
  const response = await writeJsonResponse(fetchImpl, path, input, options);
  return parseSafeJson(response);
}

async function writeJsonResponse(
  fetchImpl: typeof fetch,
  path: string,
  input: { credereStoreId: string; token: FinancingTokenSet },
  options: {
    body: unknown;
    indeterminateOnFailure?: boolean;
    method: "POST" | "PUT";
  },
) {
  let response: Response;
  try {
    response = await fetchImpl(credereApiUrl(path), {
      body: JSON.stringify(stripUndefined(options.body)),
      headers: bearerHeaders(input.token.accessToken, input.credereStoreId),
      method: options.method,
    });
  } catch {
    throw networkError(options.indeterminateOnFailure === true);
  }
  if (!response.ok) {
    if (options.indeterminateOnFailure && response.status >= 500) {
      throw networkError(true);
    }
    throw providerError(response);
  }
  return response;
}

function leadPath(cpfCnpj: string) {
  return `/banks_api/leads/${encodeURIComponent(cpfCnpj.replace(/\D/g, ""))}`;
}

function stripUndefined(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .map(([key, entry]) => [key, stripUndefined(entry)]),
  );
}
