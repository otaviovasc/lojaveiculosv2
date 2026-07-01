import { readApiJson } from "../../lib/apiErrors";
import type {
  CrmAgentLoginResponse,
  CrmAuthState,
  CrmBridgeResponse,
  CrmMessage,
  CrmMessageQuery,
  CrmRequestHeaders,
  CrmSession,
  CrmSessionQuery,
  CrmSseTicket,
} from "./types";

export type ReadOnlyCrmApi = {
  bridge: (bridgeToken: string) => Promise<CrmBridgeResponse>;
  listMessages: (
    sessionId: number,
    query?: CrmMessageQuery,
  ) => Promise<CrmMessage[]>;
  listSessions: (query?: CrmSessionQuery) => Promise<CrmSession[]>;
  login: (email: string, password: string) => Promise<CrmAgentLoginResponse>;
  requestSseTicket: (token: string) => Promise<CrmSseTicket>;
};

export type CreateReadOnlyCrmApiOptions = {
  auth: CrmAuthState;
  baseUrl?: string;
  fetch: typeof fetch;
};

type HttpMethod = "GET" | "POST";

type JsonBody = Record<string, unknown>;

export function createReadOnlyCrmApi({
  auth,
  baseUrl,
  fetch,
}: CreateReadOnlyCrmApiOptions): ReadOnlyCrmApi {
  const request = <T>(
    route: string,
    options: {
      body?: JsonBody;
      includeAuth?: boolean;
      method: HttpMethod;
      token?: string | null;
    },
  ) =>
    fetch(route, {
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
      headers: createJsonHeaders(
        options.includeAuth === false
          ? { accessToken: null, agent: null }
          : { ...auth, accessToken: options.token ?? auth.accessToken },
      ),
      method: options.method,
    }).then(readJson<T>);

  return {
    bridge: (bridgeToken) =>
      request(readOnlyCrmRoutes.bridge(baseUrl), {
        body: { bridgeToken },
        includeAuth: false,
        method: "POST",
      }),
    listMessages: (sessionId, query) =>
      request(
        withQuery(readOnlyCrmRoutes.listMessages(sessionId, baseUrl), [
          createCrmMessagesQuery(query),
        ]),
        { method: "GET" },
      ),
    listSessions: (query) =>
      request(
        withQuery(readOnlyCrmRoutes.listSessions(baseUrl), [
          createCrmSessionsQuery(query),
        ]),
        { method: "GET" },
      ),
    login: (email, password) =>
      request(readOnlyCrmRoutes.login(baseUrl), {
        body: { email, password },
        includeAuth: false,
        method: "POST",
      }),
    requestSseTicket: (token) =>
      request(readOnlyCrmRoutes.sseTicket(baseUrl), {
        body: { _authToken: token },
        method: "POST",
        token,
      }),
  };
}

export function createCrmRequestHeaders(auth: CrmAuthState): CrmRequestHeaders {
  const headers: CrmRequestHeaders = {};

  if (auth.accessToken) {
    headers.Authorization = `Bearer ${auth.accessToken}`;
  }

  if (auth.agent?.id) {
    headers["x-crm-agent-id"] = auth.agent.id;
  }

  return headers;
}

export function describeCrmHeaderContract(auth: CrmAuthState) {
  const headers = createCrmRequestHeaders(auth);

  return [
    {
      key: "Authorization",
      state: headers.Authorization ? "ready" : "waiting",
      value: headers.Authorization ? "Bearer <token>" : "missing token",
    },
    {
      key: "x-crm-agent-id",
      state: headers["x-crm-agent-id"] ? "ready" : "waiting",
      value: headers["x-crm-agent-id"] ?? "missing agent",
    },
  ] as const;
}

export function createCrmEndpoint(path: string, baseUrl = "/api/v1"): string {
  const normalizedBase = baseUrl.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${normalizedBase}${normalizedPath}`;
}

export function createCrmSessionsQuery(query: CrmSessionQuery = {}) {
  const params = new URLSearchParams();
  addOptionalParam(params, "agentId", query.agentId);
  addOptionalParam(params, "filterByAgent", query.filterByAgent);
  addOptionalParam(params, "connectionId", query.connectionId);
  addOptionalParam(params, "limit", query.limit);
  addOptionalParam(params, "offset", query.offset);
  addOptionalParam(params, "search", query.search);
  addOptionalParam(params, "sessionId", query.sessionId);
  addOptionalParam(params, "tagMatchMode", query.tagMatchMode);

  for (const tagId of query.tagIds ?? []) {
    params.append("tagIds", String(tagId));
  }

  return params;
}

export function createCrmMessagesQuery(query: CrmMessageQuery = {}) {
  const params = new URLSearchParams();
  addOptionalParam(params, "limit", query.limit);
  addOptionalParam(params, "offset", query.offset);

  return params;
}

export const readOnlyCrmRoutes = {
  bridge: (baseUrl?: string) => createCrmEndpoint("/auth/bridge", baseUrl),
  listMessages: (sessionId: number, baseUrl?: string) =>
    createCrmEndpoint(`/crm/chat/messages/${sessionId}`, baseUrl),
  listSessions: (baseUrl?: string) =>
    createCrmEndpoint("/crm/chat/sessions", baseUrl),
  login: (baseUrl?: string) => createCrmEndpoint("/crm/agents/login", baseUrl),
  sse: (ticket: string, baseUrl?: string) =>
    createCrmEndpoint(`/crm/sse?ticket=${ticket}`, baseUrl),
  sseTicket: (baseUrl?: string) =>
    createCrmEndpoint("/crm/sse/ticket", baseUrl),
} as const;

function createJsonHeaders(auth: CrmAuthState): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...createCrmRequestHeaders(auth),
  };
}

async function readJson<T>(response: Response): Promise<T> {
  return readApiJson<T>(response, { feature: "CRM" });
}

function withQuery(route: string, params: URLSearchParams[]) {
  const query = params
    .map((param) => param.toString())
    .filter(Boolean)
    .join("&");

  return query ? `${route}?${query}` : route;
}

function addOptionalParam(
  params: URLSearchParams,
  key: string,
  value: boolean | number | string | undefined,
) {
  if (value !== undefined && value !== "") {
    params.set(key, String(value));
  }
}
