import { readApiJson } from "../../lib/apiErrors";
import {
  buildCreateSimulationBody,
  type CredereSimulationBody,
} from "./requestBuilder";
import {
  parseConnection,
  parseOauthStart,
  parseProviderStores,
  parseRequiredFields,
  parseSimulation,
  parseSimulationList,
  parseSimulationSync,
  parseStoreStatus,
  parseStoreMapping,
} from "./apiParsers";
import type {
  CredereAuth,
  CredereConnectionSummary,
  CredereFipeResolution,
  CredereOAuthStart,
  CredereProviderStore,
  CredereRequiredFields,
  CredereSimulation,
  CredereSimulationDraft,
  CredereSimulationSync,
  CredereStoreMapping,
  CredereStoreStatus,
} from "./types";
import { parseFipeResolution } from "./fipeResolution";

export { parseStoreStatus } from "./apiParsers";

export type CreateCredereSimulationOptions = {
  idempotencyKey: string;
};

export type CredereApi = {
  createSimulation: (
    draft: CredereSimulationDraft,
    options: CreateCredereSimulationOptions,
  ) => Promise<CredereSimulation>;
  disconnectConnection: () => Promise<unknown>;
  getRequiredFields: (input: {
    bankCodes?: readonly string[] | undefined;
    cpfCnpj: string;
  }) => Promise<CredereRequiredFields>;
  getConnection: () => Promise<CredereConnectionSummary>;
  getSimulation: (simulationId: string) => Promise<CredereSimulation>;
  getStatus: () => Promise<CredereStoreStatus>;
  listProviderStores: () => Promise<CredereProviderStore[]>;
  listSimulations: () => Promise<CredereSimulation[]>;
  mapStore: (externalStoreId: string) => Promise<CredereStoreMapping>;
  refreshSimulation: (simulationId: string) => Promise<CredereSimulation>;
  resolveFipeVehicle: (input: {
    fipeCode: string;
    modelYear: number;
    selectedModelId?: string;
    selectedMolicarCode?: string;
  }) => Promise<CredereFipeResolution>;
  startOAuth: () => Promise<CredereOAuthStart>;
  syncSimulations: () => Promise<CredereSimulationSync>;
  unmapStore: () => Promise<unknown>;
};

export type CreateCredereApiOptions = {
  auth?: CredereAuth;
  baseUrl?: string;
  fetch: typeof fetch;
};

export function createCredereApi({
  auth = {},
  baseUrl,
  fetch,
}: CreateCredereApiOptions): CredereApi {
  return {
    createSimulation: (draft, options) =>
      fetch(credereRoutes.simulations(baseUrl), {
        body: JSON.stringify(buildCreateSimulationBody(draft)),
        headers: createCredereHeaders(auth, {
          "Idempotency-Key": options.idempotencyKey,
        }),
        method: "POST",
      })
        .then((response) => readJson<unknown>(response))
        .then(parseSimulation),
    disconnectConnection: () =>
      fetch(credereRoutes.connection(baseUrl), {
        headers: createCredereHeaders(auth),
        method: "DELETE",
      }).then((response) => readJson<unknown>(response)),
    getRequiredFields: (input) =>
      fetch(credereRoutes.requiredFields(baseUrl), {
        body: JSON.stringify({
          document: input.cpfCnpj.replace(/\D/g, ""),
          ...(input.bankCodes?.length
            ? { bankCodes: [...input.bankCodes] }
            : {}),
        }),
        headers: createCredereHeaders(auth),
        method: "POST",
      })
        .then((response) => readJson<unknown>(response))
        .then(parseRequiredFields),
    getConnection: () =>
      fetch(credereRoutes.connection(baseUrl), {
        headers: createCredereHeaders(auth),
      })
        .then((response) => readJson<unknown>(response))
        .then(parseConnection),
    getSimulation: (simulationId) =>
      fetch(credereRoutes.simulation(simulationId, baseUrl), {
        headers: createCredereHeaders(auth),
      })
        .then((response) => readJson<unknown>(response))
        .then(parseSimulation),
    getStatus: () =>
      fetch(credereRoutes.status(baseUrl), {
        headers: createCredereHeaders(auth),
      })
        .then((response) => readJson<unknown>(response))
        .then(parseStoreStatus),
    listProviderStores: () =>
      fetch(credereRoutes.providerStores(baseUrl), {
        headers: createCredereHeaders(auth),
      })
        .then((response) => readJson<unknown>(response))
        .then(parseProviderStores),
    listSimulations: () =>
      fetch(credereRoutes.simulations(baseUrl), {
        headers: createCredereHeaders(auth),
      })
        .then((response) => readJson<unknown>(response))
        .then(parseSimulationList),
    mapStore: (externalStoreId) =>
      fetch(credereRoutes.storeMapping(baseUrl), {
        body: JSON.stringify({ externalStoreId }),
        headers: createCredereHeaders(auth),
        method: "PUT",
      })
        .then((response) => readJson<unknown>(response))
        .then(parseStoreMapping),
    refreshSimulation: (simulationId) =>
      fetch(credereRoutes.refreshSimulation(simulationId, baseUrl), {
        body: JSON.stringify({}),
        headers: createCredereHeaders(auth),
        method: "POST",
      })
        .then((response) => readJson<unknown>(response))
        .then(parseSimulation),
    resolveFipeVehicle: (input) =>
      fetch(credereRoutes.resolveFipeVehicle(baseUrl), {
        body: JSON.stringify(input),
        headers: createCredereHeaders(auth),
        method: "POST",
      })
        .then((response) => readJson<unknown>(response))
        .then(parseFipeResolution),
    startOAuth: () =>
      fetch(credereRoutes.oauthStart(baseUrl), {
        body: JSON.stringify({}),
        headers: createCredereHeaders(auth),
        method: "POST",
      })
        .then((response) => readJson<unknown>(response))
        .then(parseOauthStart),
    syncSimulations: () =>
      fetch(credereRoutes.syncSimulations(baseUrl), {
        body: JSON.stringify({}),
        headers: createCredereHeaders(auth),
        method: "POST",
      })
        .then((response) => readJson<unknown>(response))
        .then(parseSimulationSync),
    unmapStore: () =>
      fetch(credereRoutes.storeMapping(baseUrl), {
        headers: createCredereHeaders(auth),
        method: "DELETE",
      }).then((response) => readJson<unknown>(response)),
  };
}

export const credereRoutes = {
  connection: (baseUrl?: string) =>
    endpoint("/financing/credere/connection", baseUrl),
  oauthStart: (baseUrl?: string) =>
    endpoint("/financing/credere/oauth/start", baseUrl),
  providerStores: (baseUrl?: string) =>
    endpoint("/financing/credere/provider-stores", baseUrl),
  refreshSimulation: (simulationId: string, baseUrl?: string) =>
    endpoint(
      `/financing/credere/simulations/${encodeURIComponent(simulationId)}/refresh`,
      baseUrl,
    ),
  requiredFields: (baseUrl?: string) =>
    endpoint("/financing/credere/required-fields", baseUrl),
  resolveFipeVehicle: (baseUrl?: string) =>
    endpoint("/financing/credere/vehicle-models/resolve-fipe", baseUrl),
  simulation: (simulationId: string, baseUrl?: string) =>
    endpoint(
      `/financing/credere/simulations/${encodeURIComponent(simulationId)}`,
      baseUrl,
    ),
  simulations: (baseUrl?: string) =>
    endpoint("/financing/credere/simulations", baseUrl),
  status: (baseUrl?: string) => endpoint("/financing/credere/status", baseUrl),
  storeMapping: (baseUrl?: string) =>
    endpoint("/financing/credere/store-mapping", baseUrl),
  syncSimulations: (baseUrl?: string) =>
    endpoint("/financing/credere/simulations/sync", baseUrl),
} as const;

function createCredereHeaders(
  auth: CredereAuth,
  extra: Record<string, string> = {},
): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extra,
  };
  if (auth.accessToken) headers.Authorization = `Bearer ${auth.accessToken}`;
  if (auth.clerkUserId) headers["x-clerk-user-id"] = auth.clerkUserId;
  if (auth.storeSlug) headers["x-store-slug"] = auth.storeSlug;
  if (auth.userEmail) headers["x-user-email"] = auth.userEmail;
  if (auth.userName) headers["x-user-name"] = auth.userName;
  return headers;
}

function endpoint(path: string, baseUrl = "/api/v1") {
  const normalizedBase = baseUrl.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

async function readJson<T>(response: Response): Promise<T> {
  return readApiJson<T>(response, { feature: "Financiamento" });
}

export type { CredereSimulationBody };
