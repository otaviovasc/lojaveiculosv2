import type {
  RepassesCrmAuth,
  RepassesCrmClient,
  RepassesCrmMessageQuery,
  RepassesCrmSessionQuery,
} from "./repassesCrmTypes.js";
import {
  createLocalDemoRepassesCrmState,
  type DemoMessage,
  type DemoSession,
} from "./localDemoRepassesCrmFixtures.js";

export function createLocalDemoRepassesCrmClient(): RepassesCrmClient {
  const { agents, connection, messages, sessions } =
    createLocalDemoRepassesCrmState();

  return {
    assignSession: async (_auth, input) => {
      const session = requireDemoSession(sessions, input.sessionId);
      const agent = agents.find((item) => item.id === input.agentId) ?? null;
      session.assignedAgentId = agent?.id ?? null;
      session.assignedAgent = agent;
      return session;
    },
    closeSession: async (_auth, input) => {
      const session = requireDemoSession(sessions, input.sessionId);
      session.status = "COMPLETED";
      return session;
    },
    createSession: async (_auth, input) => {
      const now = new Date().toISOString();
      const session: DemoSession = {
        assignedAgent: null,
        assignedAgentId: null,
        buyerName: input.name ?? input.phone,
        buyerPhone: input.phone,
        channel: "WHATSAPP",
        connection,
        humanTakeoverAt: null,
        id: Math.max(...sessions.map((item) => item.id)) + 1,
        lastMessageAt: now,
        lastMessageContent: input.message ?? "Conversa criada no V2.",
        lastReadAt: now,
        sessionTags: [],
        status: "ACTIVE",
        unreadCount: 0,
        uuid: `demo-session-${Date.now()}`,
        vehicle: { id: 0, mainPhotoUrl: null, title: "Atendimento avulso" },
      };
      sessions.unshift(session);
      messages.set(session.id, []);
      return { scheduled: false, session };
    },
    getAgents: async (auth) => withDemoAuth(auth, agents),
    getConnections: async (auth) => withDemoAuth(auth, [connection]),
    getConversation: async () => ({}),
    listMessages: async (_auth, sessionId, query) =>
      paginate(messages.get(sessionId) ?? [], query),
    listSessions: async (_auth, query) =>
      paginate(filterSessions(sessions, query), query),
    markSessionAsRead: async (_auth, sessionId) => {
      const session = requireDemoSession(sessions, sessionId);
      session.lastReadAt = new Date().toISOString();
      session.unreadCount = 0;
      return { ok: true };
    },
    markSessionAsUnread: async (_auth, input) => {
      const session = requireDemoSession(sessions, input.sessionId);
      session.lastReadAt = input.lastReadAt ?? null;
      session.unreadCount = Math.max(session.unreadCount, 1);
      return { ok: true };
    },
    sendText: async (_auth, input) => {
      const session = requireDemoSession(sessions, input.sessionId);
      const message = createTextMessage(input.text);
      const nextMessages = messages.get(input.sessionId) ?? [];
      nextMessages.push(message);
      messages.set(input.sessionId, nextMessages);
      session.lastMessageAt = message.createdAt;
      session.lastMessageContent = `Eu: ${input.text}`;
      session.status = "HUMAN_TAKEOVER";
      return message;
    },
    toggleIntervention: async (_auth, sessionId) => {
      const session = requireDemoSession(sessions, sessionId);
      session.status =
        session.status === "HUMAN_TAKEOVER" ? "ACTIVE" : "HUMAN_TAKEOVER";
      session.humanTakeoverAt =
        session.status === "HUMAN_TAKEOVER" ? new Date().toISOString() : null;
      return session;
    },
  };
}

function createTextMessage(text: string): DemoMessage {
  return {
    content: text,
    createdAt: new Date().toISOString(),
    direction: "OUTBOUND",
    id: Date.now(),
    metadata: { senderAgentName: "Atendente V2" },
    senderType: "HUMAN",
    status: "SENT",
    type: "TEXT",
  };
}

function withDemoAuth<T>(auth: RepassesCrmAuth, value: T): T {
  if (!auth.clerkSessionToken) throw new Error("Missing demo Clerk token.");
  return value;
}

function filterSessions(
  sessions: DemoSession[],
  query: RepassesCrmSessionQuery = {},
) {
  let result = sessions;
  if (query.sessionId) {
    result = result.filter((session) => session.id === query.sessionId);
  }
  if (query.search) {
    const needle = query.search.toLowerCase();
    result = result.filter((session) =>
      [
        session.buyerName,
        session.buyerPhone,
        session.lastMessageContent,
        session.vehicle.title,
      ].some((value) => value.toLowerCase().includes(needle)),
    );
  }
  if (query.connectionId) {
    result = result.filter(
      (session) => session.connection.id === query.connectionId,
    );
  }
  if (query.agentId) {
    result = result.filter(
      (session) => session.assignedAgentId === query.agentId,
    );
  }
  return result;
}

function paginate<T>(
  values: readonly T[],
  query: RepassesCrmMessageQuery | RepassesCrmSessionQuery = {},
) {
  const offset = query.offset ?? 0;
  const limit = query.limit ?? values.length;
  return values.slice(offset, offset + limit);
}

function requireDemoSession(sessions: DemoSession[], sessionId: number) {
  const session = sessions.find((item) => item.id === sessionId);
  if (!session)
    throw new Error(`Demo WhatsApp session ${sessionId} not found.`);
  return session;
}
