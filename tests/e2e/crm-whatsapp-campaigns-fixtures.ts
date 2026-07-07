export const campaignConnectionId = "24000000-0000-4000-8000-000000000101";
export const campaignId = "c3b4e6c1-a0fb-43f4-b6dc-fc0807400c15";
export const repliedTagId = "9d42160d-2174-48c9-bd34-4c506d2f5f1d";
export const warmTagId = "7d42160d-2174-48c9-bd34-4c506d2f5f1d";

export function createCampaignBootstrap() {
  const effectivePermissions = [
    "crm.whatsapp.assign",
    "crm.whatsapp.campaigns.manage",
    "crm.whatsapp.campaigns.read",
    "crm.whatsapp.close",
    "crm.whatsapp.connection.manage",
    "crm.whatsapp.integrations.manage",
    "crm.whatsapp.list",
    "crm.whatsapp.read",
    "crm.whatsapp.schedules.cancel",
    "crm.whatsapp.schedules.create",
    "crm.whatsapp.schedules.process",
    "crm.whatsapp.schedules.read",
    "crm.whatsapp.send",
    "crm.whatsapp.tags.assign",
    "crm.whatsapp.tags.manage",
    "crm.whatsapp.toggle_intervention",
    "crm.visits.manage",
    "crm.visits.read",
  ];
  return {
    defaultStore: {
      effectivePermissions,
      role: "OWNER",
      status: "active",
      storeId: "50000000-0000-4000-8000-000000000001",
      storeName: "Loja Teste",
      storeSlug: "test-store",
      tenantId: "60000000-0000-4000-8000-000000000001",
      tenantName: "Tenant Teste",
    },
    needsOnboarding: false,
    platformAdmin: false,
    stores: [],
    tenantMemberships: [],
    user: {
      clerkUserId: "clerk_seed_owner",
      email: "owner@example.com",
      id: "70000000-0000-4000-8000-000000000001",
      name: "Seed Owner",
    },
  };
}

export function createCampaignConnection() {
  return {
    displayName: "ZAPI E2E",
    externalConnectionId: null,
    externalInstanceId: null,
    id: campaignConnectionId,
    live: {
      checkedAt: "2026-07-07T12:00:00.000Z",
      connected: true,
      connectedPhone: "5518996469432",
      providerStatus: "connected",
      smartphoneConnected: true,
    },
    phone: "5518996469432",
    provider: "zapi",
    status: "active",
    webhookUrl: null,
  };
}

export function createCampaignSessionCounts() {
  return {
    filters: { all: 2, fresh: 2, mine: 0, others: 0, unassigned: 2 },
    statuses: {
      ACTIVE: 2,
      COMPLETED: 0,
      EXPIRED: 0,
      HUMAN_TAKEOVER: 0,
      MINIBOT_ACTIVE: 0,
    },
    total: 2,
    unread: 0,
  };
}

export function createCampaignSessions() {
  return [
    createSession({
      buyerName: "Ana Premium",
      buyerPhone: "5518996469432",
      id: "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
    }),
    createSession({
      buyerName: "Bruno Retorno",
      buyerPhone: "5518996469400",
      id: "5e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
    }),
  ];
}

export function createCampaign() {
  return {
    content: "Ola {nome}, temos uma condicao exclusiva para voce.",
    createdAt: "2026-07-07T12:00:00.000Z",
    failedCount: 1,
    id: campaignId,
    initialTagId: warmTagId,
    intervalMinutes: 3,
    name: "Black Friday Premium",
    repliedCount: 1,
    replyRate: 0.5,
    replyTagId: repliedTagId,
    scheduledCount: 2,
    scheduledEndAt: "2026-07-07T12:03:00.000Z",
    scheduledStartAt: "2026-07-07T12:00:00.000Z",
    secondaryContent: "Obrigado pelo retorno, {nome}. Posso te ligar agora?",
    secondaryDelayMinutes: 15,
    secondarySentCount: 1,
    sentCount: 1,
    status: "scheduled",
    totalRecipients: 2,
    updatedAt: "2026-07-07T12:05:00.000Z",
  };
}

export function createCampaignRecipients() {
  return [
    {
      campaignId,
      connectionId: campaignConnectionId,
      createdAt: "2026-07-07T12:00:00.000Z",
      errorMessage: null,
      id: "11b4e6c1-a0fb-43f4-b6dc-fc0807400c15",
      initialScheduledMessageId: "21b4e6c1-a0fb-43f4-b6dc-fc0807400c15",
      initialSentAt: "2026-07-07T12:00:30.000Z",
      leadId: "0b6ec94e-3bd8-4782-a8bb-7de0f0afae6f",
      phone: "5518996469432",
      replyContentPreview: "Tenho interesse",
      replyMessageId: "msg-reply-1",
      replyReceivedAt: "2026-07-07T12:02:00.000Z",
      secondaryScheduledMessageId: "31b4e6c1-a0fb-43f4-b6dc-fc0807400c15",
      secondarySentAt: "2026-07-07T12:17:00.000Z",
      sentMessageId: "msg-sent-1",
      sequence: 0,
      sessionId: "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
      status: "secondary_sent",
      updatedAt: "2026-07-07T12:17:00.000Z",
      variables: { nome: "Ana Premium" },
    },
    {
      campaignId,
      connectionId: campaignConnectionId,
      createdAt: "2026-07-07T12:00:00.000Z",
      errorMessage: "Provider throttled the send",
      id: "12b4e6c1-a0fb-43f4-b6dc-fc0807400c15",
      initialScheduledMessageId: "22b4e6c1-a0fb-43f4-b6dc-fc0807400c15",
      initialSentAt: null,
      leadId: null,
      phone: "5518996469400",
      replyContentPreview: null,
      replyMessageId: null,
      replyReceivedAt: null,
      secondaryScheduledMessageId: null,
      secondarySentAt: null,
      sentMessageId: null,
      sequence: 1,
      sessionId: "5e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
      status: "failed",
      updatedAt: "2026-07-07T12:04:00.000Z",
      variables: { nome: "Bruno Retorno" },
    },
  ];
}

function createSession(input: {
  buyerName: string;
  buyerPhone: string;
  id: string;
}) {
  return {
    buyerName: input.buyerName,
    buyerPhone: input.buyerPhone,
    channel: "WHATSAPP",
    connection: {
      id: campaignConnectionId,
      name: "ZAPI E2E",
      phone: "5518996469432",
      provider: "zapi",
      status: "active",
    },
    id: input.id,
    lastMessageContent: "Tenho interesse no Civic.",
    lastMessageAt: "2026-07-07T12:00:00.000Z",
    leadId: "0b6ec94e-3bd8-4782-a8bb-7de0f0afae6f",
    sessionTags: [{ id: warmTagId, name: "Oferta enviada" }],
    status: "ACTIVE",
    unreadCount: 0,
    uuid: input.id,
  };
}
