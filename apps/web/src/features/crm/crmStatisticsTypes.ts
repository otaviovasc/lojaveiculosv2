export type CrmStatisticsQuery = {
  connectionId?: string;
  from: string;
  toExclusive: string;
};

export type CrmStatisticsResponse = {
  agents: Array<{
    active: boolean;
    agentId: string;
    averageFirstResponseMs: number | null;
    email: string;
    handledConversations: number;
    humanOutboundMessages: number;
    name: string;
    openAssignments: number;
    role: string;
  }>;
  attribution: "current_assignee";
  byChannel: Array<{ count: number; key: string; label: string }>;
  bySource: Array<{ count: number; key: string; label: string }>;
  connection: {
    channel: string;
    id: string;
    name: string;
    provider: string;
    status: string;
  } | null;
  daily: Array<{
    conversationsCreated: number;
    date: string;
    externalAiOutboundMessages: number;
    humanOutboundMessages: number;
    inboundMessages: number;
    internalAutomationOutboundMessages: number;
    otherOutboundMessages: number;
  }>;
  messages: {
    externalAiOutbound: number;
    humanOutbound: number;
    inbound: number;
    internalAutomationOutbound: number;
    otherOutbound: number;
    total: number;
  };
  period: {
    from: string;
    timezone: "America/Sao_Paulo";
    toExclusive: string;
  };
  queues: {
    assigned: number;
    completed: number;
    fresh: number;
    inHumanService: number;
    unassigned: number;
    waitingHuman: number;
  };
  summary: {
    activeConversations: number;
    automatedHandledConversations: number;
    averageFirstResponseMs: number | null;
    completedConversations: number;
    conversationsCreated: number;
    firstResponseSamples: number;
    humanHandledConversations: number;
    scheduledVisits: number;
    wonLeads: number;
  };
};
