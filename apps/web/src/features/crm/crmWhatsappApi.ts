import { readApiJson } from "../../lib/apiErrors";
import { createProductCrmHeaders } from "./productCrmApi";
import type { ProductCrmAuth } from "./productCrmTypes";
import { createCrmEndpoint } from "./apiClient";
import type {
  CrmWhatsappAgent,
  CrmWhatsappConnection,
  CrmWhatsappMessageQuery,
  CrmWhatsappMessage,
  CrmWhatsappScope,
  CrmWhatsappSendTextInput,
  CrmWhatsappSession,
  CrmWhatsappSessionQuery,
} from "./crmWhatsappTypes";

export type CrmWhatsappBootstrap = {
  agents: { agents: CrmWhatsappAgent[] } | CrmWhatsappAgent[];
  connections:
    { connections: CrmWhatsappConnection[] } | CrmWhatsappConnection[];
  scope?: CrmWhatsappScope;
};

export type CrmWhatsappApi = {
  assignSession: (
    sessionId: number,
    agentId: number | null,
    connectionId?: number | null,
  ) => Promise<CrmWhatsappSession>;
  bootstrap: () => Promise<CrmWhatsappBootstrap>;
  closeSession: (
    sessionId: number,
    mode: "default" | "immediate",
    connectionId?: number | null,
  ) => Promise<CrmWhatsappSession>;
  createSession: (input: {
    connectionId?: number;
    message?: string;
    name?: string;
    phone: string;
  }) => Promise<{ scheduled?: boolean; session?: CrmWhatsappSession }>;
  listMessages: (
    sessionId: number,
    query?: CrmWhatsappMessageQuery,
  ) => Promise<CrmWhatsappMessage[]>;
  listSessions: (
    query?: CrmWhatsappSessionQuery,
  ) => Promise<CrmWhatsappSession[]>;
  markSessionAsRead: (
    sessionId: number,
    connectionId?: number | null,
  ) => Promise<unknown>;
  markSessionAsUnread: (
    sessionId: number,
    lastReadAt?: string | null,
    connectionId?: number | null,
  ) => Promise<unknown>;
  sendText: (input: CrmWhatsappSendTextInput) => Promise<CrmWhatsappMessage>;
  toggleIntervention: (
    sessionId: number,
    connectionId?: number | null,
  ) => Promise<CrmWhatsappSession>;
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
    assignSession: (sessionId, agentId, connectionId) =>
      postJson(crmWhatsappRoutes.assignSession(sessionId, baseUrl), {
        agentId,
        connectionId,
      }),
    bootstrap: () => getJson(crmWhatsappRoutes.bootstrap(baseUrl)),
    closeSession: (sessionId, mode, connectionId) =>
      postJson(crmWhatsappRoutes.closeSession(sessionId, baseUrl), {
        connectionId,
        mode,
      }),
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
    markSessionAsRead: (sessionId, connectionId) =>
      postJson(
        withQuery(crmWhatsappRoutes.markRead(sessionId, baseUrl), [
          createCrmWhatsappConnectionQuery(connectionId),
        ]),
      ),
    markSessionAsUnread: (sessionId, lastReadAt, connectionId) =>
      postJson(crmWhatsappRoutes.markUnread(sessionId, baseUrl), {
        connectionId,
        lastReadAt,
      }),
    sendText: (input) => postJson(crmWhatsappRoutes.sendText(baseUrl), input),
    toggleIntervention: (sessionId, connectionId) =>
      postJson(
        withQuery(crmWhatsappRoutes.toggleIntervention(sessionId, baseUrl), [
          createCrmWhatsappConnectionQuery(connectionId),
        ]),
      ),
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

function createCrmWhatsappMessageQuery(query: CrmWhatsappMessageQuery = {}) {
  const params = new URLSearchParams();
  addOptionalParam(params, "connectionId", query.connectionId);
  addOptionalParam(params, "limit", query.limit);
  addOptionalParam(params, "offset", query.offset);
  return params;
}

function createCrmWhatsappConnectionQuery(connectionId?: number | null) {
  const params = new URLSearchParams();
  addOptionalParam(params, "connectionId", connectionId ?? undefined);
  return params;
}

async function readJson<T>(response: Response): Promise<T> {
  return readApiJson<T>(response, { feature: "CRM WhatsApp" });
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
