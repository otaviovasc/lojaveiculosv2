export type RepassesCrmSessionQuery = {
  agentId?: number | undefined;
  connectionId?: number | undefined;
  filterByAgent?: boolean | number | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
  search?: string | undefined;
  sessionId?: number | undefined;
  tagIds?: number[] | undefined;
  tagMatchMode?: "AND" | "OR" | undefined;
};

export type RepassesCrmMessageQuery = {
  limit?: number | undefined;
  offset?: number | undefined;
};

export type RepassesCrmAuth = {
  clerkSessionToken: string;
  repassesConnectionId?: number;
  storeId?: string;
  storeSlug?: string;
  tenantId?: string;
};

export type RepassesCrmAuthContext = {
  canAssignSessions: boolean;
  connectionId: number | null;
};

export type RepassesCrmClient = {
  assignSession: (
    auth: RepassesCrmAuth,
    input: { agentId: number | null; sessionId: number },
  ) => Promise<unknown>;
  closeSession: (
    auth: RepassesCrmAuth,
    input: { mode: "default" | "immediate"; sessionId: number },
  ) => Promise<unknown>;
  createSession: (
    auth: RepassesCrmAuth,
    input: {
      connectionId?: number | undefined;
      message?: string | undefined;
      name?: string | undefined;
      phone: string;
      scheduledAt?: string | undefined;
    },
  ) => Promise<unknown>;
  getAgents: (auth: RepassesCrmAuth) => Promise<unknown>;
  getAuthContext: (auth: RepassesCrmAuth) => Promise<RepassesCrmAuthContext>;
  getConnections: (auth: RepassesCrmAuth) => Promise<unknown>;
  getConversation: (input: {
    conversationId: string;
    storeId: string;
  }) => Promise<unknown>;
  listMessages: (
    auth: RepassesCrmAuth,
    sessionId: number,
    query?: RepassesCrmMessageQuery,
  ) => Promise<unknown>;
  listSessions: (
    auth: RepassesCrmAuth,
    query?: RepassesCrmSessionQuery,
  ) => Promise<unknown>;
  markSessionAsRead: (
    auth: RepassesCrmAuth,
    sessionId: number,
  ) => Promise<unknown>;
  markSessionAsUnread: (
    auth: RepassesCrmAuth,
    input: { lastReadAt?: string | null | undefined; sessionId: number },
  ) => Promise<unknown>;
  sendText: (
    auth: RepassesCrmAuth,
    input: {
      quotedMessageId?: number | string | undefined;
      quotedMessageText?: string | undefined;
      sessionId: number;
      text: string;
    },
  ) => Promise<unknown>;
  toggleIntervention: (
    auth: RepassesCrmAuth,
    sessionId: number,
  ) => Promise<unknown>;
};

export type CreateHttpRepassesCrmClientOptions = {
  baseUrl: string;
  fetch?: typeof fetch;
};

export class RepassesCrmAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RepassesCrmAuthError";
  }
}

export class RepassesCrmRequestError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "RepassesCrmRequestError";
  }
}

export class RepassesCrmUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RepassesCrmUnavailableError";
  }
}
