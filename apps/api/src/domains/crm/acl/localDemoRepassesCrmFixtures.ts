export type DemoAgent = {
  activeChatCount: number;
  email: string;
  id: number;
  isActive: boolean;
  name: string;
  role: "AGENT" | "OWNER";
  seeUnassignedChats: boolean;
};

export type DemoConnection = {
  id: number;
  name: string;
  phone: string;
  provider: string;
  status: "CONNECTED";
};

export type DemoSession = {
  assignedAgent: Pick<DemoAgent, "email" | "id" | "name" | "role"> | null;
  assignedAgentId: number | null;
  buyerName: string;
  buyerPhone: string;
  channel: "WHATSAPP";
  connection: DemoConnection;
  humanTakeoverAt: string | null;
  id: number;
  lastMessageAt: string;
  lastMessageContent: string;
  lastReadAt: string | null;
  sessionTags: Array<{ color: string; id: number; name: string }>;
  status: "ACTIVE" | "COMPLETED" | "HUMAN_TAKEOVER" | "MINIBOT_ACTIVE";
  unreadCount: number;
  uuid: string;
  vehicle: { id: number; mainPhotoUrl: null; title: string };
};

export type DemoMessage = {
  content: string;
  createdAt: string;
  direction: "INBOUND" | "OUTBOUND";
  id: number;
  metadata?: Record<string, unknown>;
  senderType: "AI" | "CUSTOMER" | "HUMAN" | "SYSTEM";
  status: "DELIVERED" | "READ" | "SENT";
  type: "TEXT";
};

export function createLocalDemoRepassesCrmState() {
  const connection: DemoConnection = {
    id: 10,
    name: "WhatsApp Loja Centro",
    phone: "+55 11 99999-0101",
    provider: "evolution",
    status: "CONNECTED",
  };
  const agents: DemoAgent[] = [
    {
      activeChatCount: 3,
      email: "ana@lojaveiculos.test",
      id: 1,
      isActive: true,
      name: "Ana Souza",
      role: "OWNER",
      seeUnassignedChats: true,
    },
    {
      activeChatCount: 1,
      email: "bruno@lojaveiculos.test",
      id: 2,
      isActive: true,
      name: "Bruno Lima",
      role: "AGENT",
      seeUnassignedChats: false,
    },
  ];
  const sessions = createDemoSessions(connection, agents);
  const messages = createDemoMessages();

  return { agents, connection, messages, sessions };
}

function createDemoSessions(
  connection: DemoConnection,
  agents: DemoAgent[],
): DemoSession[] {
  const primaryAgent = agents.find((agent) => agent.id === 1) ?? null;

  return [
    {
      assignedAgent: primaryAgent,
      assignedAgentId: 1,
      buyerName: "Marina Oliveira",
      buyerPhone: "+55 11 98888-4411",
      channel: "WHATSAPP",
      connection,
      humanTakeoverAt: "2026-06-22T12:09:00.000Z",
      id: 42,
      lastMessageAt: "2026-06-22T12:15:00.000Z",
      lastMessageContent: "Pode reservar o Civic para visita hoje?",
      lastReadAt: null,
      sessionTags: [{ color: "#16a34a", id: 8, name: "Teste drive" }],
      status: "HUMAN_TAKEOVER",
      unreadCount: 2,
      uuid: "demo-session-42",
      vehicle: {
        id: 101,
        mainPhotoUrl: null,
        title: "Honda Civic Touring 2023",
      },
    },
    {
      assignedAgent: null,
      assignedAgentId: null,
      buyerName: "Carlos Mendes",
      buyerPhone: "+55 21 97777-2323",
      channel: "WHATSAPP",
      connection,
      humanTakeoverAt: null,
      id: 43,
      lastMessageAt: "2026-06-22T11:20:00.000Z",
      lastMessageContent: "Esse Compass aceita troca?",
      lastReadAt: "2026-06-22T11:30:00.000Z",
      sessionTags: [{ color: "#f59e0b", id: 9, name: "Troca" }],
      status: "ACTIVE",
      unreadCount: 0,
      uuid: "demo-session-43",
      vehicle: {
        id: 102,
        mainPhotoUrl: null,
        title: "Jeep Compass Limited 2022",
      },
    },
  ] satisfies DemoSession[];
}

function createDemoMessages() {
  return new Map<number, DemoMessage[]>([
    [
      42,
      [
        {
          content: "Bom dia, o Civic ainda esta disponivel?",
          createdAt: "2026-06-22T12:02:00.000Z",
          direction: "INBOUND",
          id: 1001,
          senderType: "CUSTOMER",
          status: "DELIVERED",
          type: "TEXT",
        },
        {
          content: "Esta sim. Posso separar para voce ver hoje.",
          createdAt: "2026-06-22T12:06:00.000Z",
          direction: "OUTBOUND",
          id: 1002,
          metadata: { senderAgentName: "Ana Souza" },
          senderType: "HUMAN",
          status: "READ",
          type: "TEXT",
        },
        {
          content: "Pode reservar o Civic para visita hoje?",
          createdAt: "2026-06-22T12:15:00.000Z",
          direction: "INBOUND",
          id: 1003,
          senderType: "CUSTOMER",
          status: "DELIVERED",
          type: "TEXT",
        },
      ],
    ],
    [
      43,
      [
        {
          content: "Esse Compass aceita troca?",
          createdAt: "2026-06-22T11:20:00.000Z",
          direction: "INBOUND",
          id: 2001,
          senderType: "CUSTOMER",
          status: "DELIVERED",
          type: "TEXT",
        },
      ],
    ],
  ]);
}
