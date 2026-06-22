import {
  RepassesCrmRequestError,
  RepassesCrmUnavailableError,
  type CreateHttpRepassesCrmClientOptions,
  type RepassesCrmAuth,
  type RepassesCrmAuthContext,
  type RepassesCrmClient,
  type RepassesCrmMessageQuery,
  type RepassesCrmSessionQuery,
} from "./repassesCrmTypes.js";

export {
  RepassesCrmAuthError,
  RepassesCrmRequestError,
  RepassesCrmUnavailableError,
  type CreateHttpRepassesCrmClientOptions,
  type RepassesCrmAuth,
  type RepassesCrmAuthContext,
  type RepassesCrmClient,
  type RepassesCrmMessageQuery,
  type RepassesCrmSessionQuery,
} from "./repassesCrmTypes.js";

type RepassesBridgeClerkResponse = {
  connection?: {
    id?: number;
  };
  token?: string;
};

type RequestOptions = {
  auth: RepassesCrmAuth;
  body?: Record<string, unknown>;
  connectionId?: number;
  method?: "DELETE" | "GET" | "PATCH" | "POST" | "PUT";
  query?: URLSearchParams;
};

export function createHttpRepassesCrmClient({
  baseUrl,
  fetch: fetchImpl = fetch,
}: CreateHttpRepassesCrmClientOptions): RepassesCrmClient {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");

  async function exchangeClerkToken(
    auth: RepassesCrmAuth,
  ): Promise<RepassesBridgeClerkResponse> {
    const response = await fetchImpl(`${normalizedBaseUrl}/auth/bridge/clerk`, {
      body: JSON.stringify({ clerkSessionToken: auth.clerkSessionToken }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const payload = (await readJson(response)) as RepassesBridgeClerkResponse;

    if (!payload.token) {
      throw new RepassesCrmRequestError(
        "Repasses CRM bridge did not return an access token.",
        502,
      );
    }

    return payload;
  }

  async function requestJson(path: string, options: RequestOptions) {
    const bridge = await exchangeClerkToken(options.auth);
    const url = new URL(`${normalizedBaseUrl}${path}`);
    options.query?.forEach((value, key) => url.searchParams.append(key, value));

    const headers: Record<string, string> = {
      Authorization: `Bearer ${bridge.token}`,
      "Content-Type": "application/json",
    };
    const connectionId =
      options.connectionId ?? options.auth.repassesConnectionId;
    if (connectionId) {
      headers["x-crm-connection-id"] = String(connectionId);
    }

    const response = await fetchImpl(url.toString(), {
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
      headers,
      method: options.method ?? "GET",
    });

    return readJson(response);
  }

  return {
    assignSession: (auth, input) =>
      requestJson(`/crm/chat/sessions/${input.sessionId}/assign`, {
        auth,
        body: { agentId: input.agentId },
        method: "POST",
      }),
    closeSession: (auth, input) =>
      requestJson(`/crm/sessions/${input.sessionId}/close`, {
        auth,
        body: { mode: input.mode },
        method: "POST",
      }),
    createSession: (auth, input) =>
      requestJson("/crm/chat/sessions/create", {
        auth,
        body: input,
        ...(input.connectionId ? { connectionId: input.connectionId } : {}),
        method: "POST",
      }),
    getAgents: (auth) => requestJson("/crm/agents", { auth }),
    getAuthContext: async (auth) => {
      const bridge = await exchangeClerkToken(auth);
      return {
        canAssignSessions:
          Boolean(bridge.connection?.id) &&
          (!auth.repassesConnectionId ||
            bridge.connection?.id === auth.repassesConnectionId),
        connectionId: bridge.connection?.id ?? null,
      };
    },
    getConnections: (auth) => requestJson("/crm/connections", { auth }),
    getConversation: async () => {
      throw new RepassesCrmRequestError(
        "Conversation ACL is not available for V2 WhatsApp inbox.",
        501,
      );
    },
    listMessages: (auth, sessionId, query) =>
      requestJson(`/crm/chat/messages/${sessionId}`, {
        auth,
        query: createMessageQuery(query),
      }),
    listSessions: (auth, query) =>
      requestJson("/crm/chat/sessions", {
        auth,
        query: createSessionQuery(query),
      }),
    markSessionAsRead: (auth, sessionId) =>
      requestJson(`/crm/chat/sessions/${sessionId}/read`, {
        auth,
        method: "POST",
      }),
    markSessionAsUnread: (auth, input) =>
      requestJson(`/crm/chat/sessions/${input.sessionId}/unread`, {
        auth,
        body: { lastReadAt: input.lastReadAt },
        method: "POST",
      }),
    sendText: (auth, input) =>
      requestJson("/crm/chat/send/text", {
        auth,
        body: input,
        method: "POST",
      }),
    toggleIntervention: (auth, sessionId) =>
      requestJson("/crm/chat/toggle-intervention", {
        auth,
        body: { sessionId },
        method: "POST",
      }),
  };
}

export function createDisabledRepassesCrmClient(): RepassesCrmClient {
  const unavailable = async () => {
    throw new RepassesCrmUnavailableError(
      "REPASSES_CRM_API_URL is not configured for CRM WhatsApp.",
    );
  };

  return {
    assignSession: unavailable,
    closeSession: unavailable,
    createSession: unavailable,
    getAgents: unavailable,
    getAuthContext: unavailable,
    getConnections: unavailable,
    getConversation: unavailable,
    listMessages: unavailable,
    listSessions: unavailable,
    markSessionAsRead: unavailable,
    markSessionAsUnread: unavailable,
    sendText: unavailable,
    toggleIntervention: unavailable,
  };
}

function createSessionQuery(query: RepassesCrmSessionQuery = {}) {
  const params = new URLSearchParams();
  addOptionalParam(params, "agentId", query.agentId);
  addOptionalParam(params, "connectionId", query.connectionId);
  addOptionalParam(params, "filterByAgent", query.filterByAgent);
  addOptionalParam(params, "limit", query.limit);
  addOptionalParam(params, "offset", query.offset);
  addOptionalParam(params, "search", query.search);
  addOptionalParam(params, "sessionId", query.sessionId);
  addOptionalParam(params, "tagMatchMode", query.tagMatchMode);
  if (query.tagIds?.length) params.set("tagIds", query.tagIds.join(","));
  return params;
}

function createMessageQuery(query: RepassesCrmMessageQuery = {}) {
  const params = new URLSearchParams();
  addOptionalParam(params, "limit", query.limit);
  addOptionalParam(params, "offset", query.offset);
  return params;
}

function addOptionalParam(
  params: URLSearchParams,
  key: string,
  value: boolean | number | string | undefined,
) {
  if (value !== undefined && value !== "") params.set(key, String(value));
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  const payload: unknown = text ? (JSON.parse(text) as unknown) : {};

  if (!response.ok) {
    const errorPayload = payload as { error?: string; message?: string };
    throw new RepassesCrmRequestError(
      errorPayload.error ??
        errorPayload.message ??
        "Repasses CRM request failed.",
      response.status,
    );
  }

  return payload;
}
