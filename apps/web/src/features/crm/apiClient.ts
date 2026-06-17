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
  bridge: () => createCrmEndpoint("/auth/bridge"),
  listMessages: (sessionId: number) =>
    createCrmEndpoint(`/crm/chat/messages/${sessionId}`),
  listSessions: () => createCrmEndpoint("/crm/chat/sessions"),
  login: () => createCrmEndpoint("/crm/agents/login"),
  sse: (ticket: string) => createCrmEndpoint(`/crm/sse?ticket=${ticket}`),
  sseTicket: () => createCrmEndpoint("/crm/sse/ticket"),
} as const;

function addOptionalParam(
  params: URLSearchParams,
  key: string,
  value: boolean | number | string | undefined,
) {
  if (value !== undefined && value !== "") {
    params.set(key, String(value));
  }
}
