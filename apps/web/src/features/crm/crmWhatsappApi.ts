import { createProductCrmHeaders } from "./productCrmApi";
import type { ProductCrmAuth } from "./productCrmTypes";
import { createCrmEndpoint } from "./apiClient";
import type {
  CrmWhatsappAgent,
  CrmWhatsappConnection,
  CrmWhatsappMessage,
  CrmWhatsappSendTextInput,
  CrmWhatsappSession,
  CrmWhatsappSessionQuery,
} from "./crmWhatsappTypes";

export type CrmWhatsappBootstrap = {
  agents: { agents: CrmWhatsappAgent[] } | CrmWhatsappAgent[];
  connections:
    | { connections: CrmWhatsappConnection[] }
    | CrmWhatsappConnection[];
};

export type CrmWhatsappApi = {
  assignSession: (
    sessionId: number,
    agentId: number | null,
  ) => Promise<CrmWhatsappSession>;
  bootstrap: () => Promise<CrmWhatsappBootstrap>;
  closeSession: (
    sessionId: number,
    mode: "default" | "immediate",
  ) => Promise<CrmWhatsappSession>;
  createSession: (input: {
    connectionId?: number;
    message?: string;
    name?: string;
    phone: string;
  }) => Promise<{ scheduled?: boolean; session?: CrmWhatsappSession }>;
  listMessages: (
    sessionId: number,
    query?: { limit?: number; offset?: number },
  ) => Promise<CrmWhatsappMessage[]>;
  listSessions: (
    query?: CrmWhatsappSessionQuery,
  ) => Promise<CrmWhatsappSession[]>;
  markSessionAsRead: (sessionId: number) => Promise<unknown>;
  markSessionAsUnread: (
    sessionId: number,
    lastReadAt?: string | null,
  ) => Promise<unknown>;
  sendText: (input: CrmWhatsappSendTextInput) => Promise<CrmWhatsappMessage>;
  toggleIntervention: (sessionId: number) => Promise<CrmWhatsappSession>;
};

export type CreateCrmWhatsappApiOptions = {
  auth?: ProductCrmAuth;
  baseUrl?: string;
  fetch: typeof fetch;
};

type JsonBody = Record<string, unknown>;

export function createCrmWhatsappApi({
  auth = {},
  baseUrl,
  fetch,
}: CreateCrmWhatsappApiOptions): CrmWhatsappApi {
  const getJson = <T>(route: string) =>
    fetch(route, {
      headers: createProductCrmHeaders(auth),
      method: "GET",
    }).then(readJson<T>);
  const postJson = <T>(route: string, body: JsonBody = {}) =>
    fetch(route, {
      body: JSON.stringify(cleanJson(body)),
      headers: createProductCrmHeaders(auth),
      method: "POST",
    }).then(readJson<T>);

  return {
    assignSession: (sessionId, agentId) =>
      postJson(crmWhatsappRoutes.assignSession(sessionId, baseUrl), {
        agentId,
      }),
    bootstrap: () => getJson(crmWhatsappRoutes.bootstrap(baseUrl)),
    closeSession: (sessionId, mode) =>
      postJson(crmWhatsappRoutes.closeSession(sessionId, baseUrl), { mode }),
    createSession: (input) =>
      postJson(crmWhatsappRoutes.sessions(baseUrl), input),
    listMessages: (sessionId, query) =>
      getJson(
        withQuery(crmWhatsappRoutes.messages(sessionId, baseUrl), [
          createCrmWhatsappMessageQuery(query),
        ]),
      ),
    listSessions: (query) =>
      getJson(
        withQuery(crmWhatsappRoutes.sessions(baseUrl), [
          createCrmWhatsappSessionQuery(query),
        ]),
      ),
    markSessionAsRead: (sessionId) =>
      postJson(crmWhatsappRoutes.markRead(sessionId, baseUrl)),
    markSessionAsUnread: (sessionId, lastReadAt) =>
      postJson(crmWhatsappRoutes.markUnread(sessionId, baseUrl), {
        lastReadAt,
      }),
    sendText: (input) => postJson(crmWhatsappRoutes.sendText(baseUrl), input),
    toggleIntervention: (sessionId) =>
      postJson(crmWhatsappRoutes.toggleIntervention(sessionId, baseUrl)),
  };
}

export const crmWhatsappRoutes = {
  assignSession: (sessionId: number, baseUrl?: string) =>
    createCrmEndpoint(`/crm/whatsapp/sessions/${sessionId}/assign`, baseUrl),
  bootstrap: (baseUrl?: string) =>
    createCrmEndpoint("/crm/whatsapp/bootstrap", baseUrl),
  closeSession: (sessionId: number, baseUrl?: string) =>
    createCrmEndpoint(`/crm/whatsapp/sessions/${sessionId}/close`, baseUrl),
  markRead: (sessionId: number, baseUrl?: string) =>
    createCrmEndpoint(`/crm/whatsapp/sessions/${sessionId}/read`, baseUrl),
  markUnread: (sessionId: number, baseUrl?: string) =>
    createCrmEndpoint(`/crm/whatsapp/sessions/${sessionId}/unread`, baseUrl),
  messages: (sessionId: number, baseUrl?: string) =>
    createCrmEndpoint(`/crm/whatsapp/messages/${sessionId}`, baseUrl),
  sendText: (baseUrl?: string) =>
    createCrmEndpoint("/crm/whatsapp/send/text", baseUrl),
  sessions: (baseUrl?: string) =>
    createCrmEndpoint("/crm/whatsapp/sessions", baseUrl),
  toggleIntervention: (sessionId: number, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/whatsapp/sessions/${sessionId}/toggle-intervention`,
      baseUrl,
    ),
} as const;

export function createCrmWhatsappSessionQuery(
  query: CrmWhatsappSessionQuery = {},
) {
  const params = new URLSearchParams();
  addOptionalParam(params, "connectionId", query.connectionId);
  addOptionalParam(params, "limit", query.limit);
  addOptionalParam(params, "offset", query.offset);
  addOptionalParam(params, "search", query.search);
  addOptionalParam(params, "sessionId", query.sessionId);
  return params;
}

function createCrmWhatsappMessageQuery(
  query: { limit?: number; offset?: number } = {},
) {
  const params = new URLSearchParams();
  addOptionalParam(params, "limit", query.limit);
  addOptionalParam(params, "offset", query.offset);
  return params;
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as { message?: string };
  if (!response.ok) {
    throw new Error(payload.message ?? `CRM request failed: ${response.status}`);
  }
  return payload as T;
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
  value: number | string | undefined,
) {
  if (value !== undefined && value !== "") params.set(key, String(value));
}

function cleanJson(body: JsonBody) {
  return Object.fromEntries(
    Object.entries(body).filter(([, value]) => value !== undefined),
  );
}
