import type { CrmAgent, CrmConversation, CrmSseStatus } from "./types";

export const crmFixtureAgent: CrmAgent = {
  email: "atendimento@lojaveiculos.local",
  id: "agent-demo-01",
  name: "Marina Costa",
  role: "owner",
};

export const crmFixtureToken = "demo.crm.session.token";

export const crmFixtureSseStatus: CrmSseStatus = "disabled";

export const crmConversations: CrmConversation[] = [
  {
    agentId: "agent-demo-01",
    contactName: "Rafael Almeida",
    id: "conv-1001",
    lastMessage: "Tenho interesse no Corolla, aceita troca?",
    status: "open",
    unreadCount: 3,
    vehicle: "Toyota Corolla XEi 2022",
  },
  {
    agentId: null,
    contactName: "Beatriz Ramos",
    id: "conv-1002",
    lastMessage: "Pode enviar o laudo cautelar?",
    status: "waiting",
    unreadCount: 1,
    vehicle: "Honda HR-V Touring 2021",
  },
  {
    agentId: "agent-demo-01",
    contactName: "Grupo Repasse Sul",
    id: "conv-1003",
    lastMessage: "Reserva confirmada para vistoria.",
    status: "closed",
    unreadCount: 0,
    vehicle: "Jeep Compass Limited 2020",
  },
];
