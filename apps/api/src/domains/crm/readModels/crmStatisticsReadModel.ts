export type CrmStatisticsBreakdownItem = {
  count: number;
  key: string;
  label: string;
};

export type CrmStatisticsDailyItem = {
  conversationsCreated: number;
  date: string;
  externalAiOutboundMessages: number;
  humanOutboundMessages: number;
  inboundMessages: number;
  internalAutomationOutboundMessages: number;
  otherOutboundMessages: number;
};

export type CrmStatisticsAgentItem = {
  active: boolean;
  agentId: string;
  averageFirstResponseMs: number | null;
  email: string;
  handledConversations: number;
  humanOutboundMessages: number;
  name: string;
  openAssignments: number;
  role: string;
};

export type CrmStatisticsSnapshot = {
  agents: readonly CrmStatisticsAgentItem[];
  attribution: "current_assignee";
  byChannel: readonly CrmStatisticsBreakdownItem[];
  bySource: readonly CrmStatisticsBreakdownItem[];
  connection: {
    channel: string;
    id: string;
    name: string;
    provider: string;
    status: string;
  } | null;
  daily: readonly CrmStatisticsDailyItem[];
  messages: {
    externalAiOutbound: number;
    humanOutbound: number;
    inbound: number;
    internalAutomationOutbound: number;
    otherOutbound: number;
    total: number;
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

export type LoadCrmStatisticsInput = {
  connectionId?: string;
  from: Date;
  storeId: string;
  tenantId: string;
  toExclusive: Date;
};

export type CrmStatisticsReadModel = {
  load: (input: LoadCrmStatisticsInput) => Promise<CrmStatisticsSnapshot>;
};

export function emptyCrmStatisticsSnapshot(): CrmStatisticsSnapshot {
  return {
    agents: [],
    attribution: "current_assignee",
    byChannel: [],
    bySource: [],
    connection: null,
    daily: [],
    messages: {
      externalAiOutbound: 0,
      humanOutbound: 0,
      inbound: 0,
      internalAutomationOutbound: 0,
      otherOutbound: 0,
      total: 0,
    },
    queues: {
      assigned: 0,
      completed: 0,
      fresh: 0,
      inHumanService: 0,
      unassigned: 0,
      waitingHuman: 0,
    },
    summary: {
      activeConversations: 0,
      automatedHandledConversations: 0,
      averageFirstResponseMs: null,
      completedConversations: 0,
      conversationsCreated: 0,
      firstResponseSamples: 0,
      humanHandledConversations: 0,
      scheduledVisits: 0,
      wonLeads: 0,
    },
  };
}
