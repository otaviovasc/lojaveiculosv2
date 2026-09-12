import { createHash } from "node:crypto";
import { demoScenariosA } from "./crm-ui-demo-scenarios-a.mjs";
import { demoScenariosB } from "./crm-ui-demo-scenarios-b.mjs";

export const CRM_UI_DEMO_NAMESPACE = "crm-ui-demo-v1";

const MEDIA_URLS = {
  audio:
    "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3",
  document: "/downloads/contrato-consignacao.pdf",
  image: "/images/storefront/vehicle-photo-pending.webp",
  imageAlt: "/marketing/hero-app-shot.jpg",
  sticker: "/icons/lv-logo-red.svg",
  video:
    "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
};

const scenarios = [...demoScenariosA, ...demoScenariosB];

export function deterministicFixtureId(storeId, key) {
  const bytes = createHash("sha256")
    .update(`${CRM_UI_DEMO_NAMESPACE}:${storeId}:${key}`)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function buildCrmUiDemoFixtures(input) {
  const at = (minutesAgo) =>
    new Date(input.now.getTime() - minutesAgo * 60_000);
  const id = (key) => deterministicFixtureId(input.storeId, key);
  const connection = {
    id: id("connection"),
    broker: "composio",
    channel: "whatsapp",
    displayName: "WhatsApp ficticio para demo de UI",
    metadata: {
      ...fixtureMetadata("connection"),
      purpose: "crm_ui_demo",
    },
    provider: "meta_cloud",
    state: "sandbox",
  };
  const result = {
    connection,
    contacts: [],
    leads: [],
    opportunities: [],
    threads: [],
    cycles: [],
    attendances: [],
    messages: [],
  };

  for (const scenario of scenarios) {
    const leadId = id(`lead:${scenario.key}`);
    const contactId = id(`contact:${scenario.key}`);
    const threadId = id(`thread:${scenario.key}`);
    const cycleId = id(`cycle:${scenario.key}`);
    const assignedUserId = scenario.assigned ? input.userId : null;
    const messages = scenario.messages.map((message, index) =>
      buildMessage({
        at,
        connectionId: connection.id,
        cycleId,
        id: id(`message:${scenario.key}:${index}`),
        message,
        threadId,
      }),
    );
    const lastMessage = messages.at(-1);
    const firstMessage = messages[0];
    const firstUnread = scenario.unread ? messages.at(-scenario.unread) : null;
    const closedAt = scenario.completed
      ? at(scenario.messages.at(-1)[0] - 5)
      : null;
    const stageId = input.stageIds[scenario.status] ?? input.fallbackStageId;

    result.contacts.push({
      id: contactId,
      displayName: scenario.name,
      primaryEmail: `${scenario.key}@example.test`,
      primaryPhone: demoPhone(result.contacts.length + 1),
      metadata: fixtureMetadata(scenario.key),
      createdAt: firstMessage.createdAt,
    });
    result.leads.push({
      id: leadId,
      assignedUserId,
      buyerEmail: `${scenario.key}@example.test`,
      buyerName: scenario.name,
      buyerPhone: demoPhone(result.leads.length + 1),
      lastInteractionAt: lastMessage.occurredAt,
      metadata: fixtureMetadata(scenario.key),
      pipelineId: input.pipelineId,
      pipelineStageId: stageId,
      source: scenario.leadSource,
      status: scenario.status,
      createdAt: firstMessage.createdAt,
    });
    result.opportunities.push({
      id: id(`opportunity:${scenario.key}`),
      assignedUserId,
      contactId,
      lastInteractionAt: lastMessage.occurredAt,
      legacyLeadId: leadId,
      metadata: fixtureMetadata(scenario.key),
      source: scenario.opportunitySource,
      stageKey: scenario.status,
      state:
        scenario.status === "won"
          ? "won"
          : scenario.status === "lost"
            ? "lost"
            : "open",
      createdAt: firstMessage.createdAt,
    });
    result.threads.push({
      id: threadId,
      channel: "whatsapp",
      channelMetadata: fixtureMetadata(scenario.key),
      contactId,
      customerChatId: `demo:${scenario.key}`,
      customerDisplayName: scenario.name,
      customerPhone: demoPhone(result.threads.length + 1),
      externalThreadId: `demo:${scenario.key}`,
      lastMessageAt: lastMessage.occurredAt,
      metadata: fixtureMetadata(scenario.key),
      profilePhotoUrl: null,
      providerConnectionId: connection.id,
      source: scenario.leadSource,
      state: scenario.completed ? "resolved" : "open",
      createdAt: firstMessage.createdAt,
    });
    result.cycles.push({
      id: cycleId,
      assignedUserId,
      closedAt,
      firstHandledAt: scenario.fresh ? null : at(scenario.messages[0][0] - 10),
      freshLeadAt: firstMessage.occurredAt,
      lastCustomerReadAt: scenario.unread ? null : input.now,
      lastMessageAt: lastMessage.occurredAt,
      lastMessageContent: lastMessage.content,
      lastReadAt: firstUnread
        ? new Date(firstUnread.occurredAt.getTime() - 60_000)
        : input.now,
      messageCount: messages.length,
      metadata: {
        ...fixtureMetadata(scenario.key),
        leadId,
        cycleMetadata: fixtureMetadata(scenario.key),
      },
      opportunityId: result.opportunities.at(-1).id,
      state: scenario.completed ? "completed" : "active",
      threadId,
      createdAt: firstMessage.createdAt,
    });
    result.attendances.push({
      id: id(`attendance:${scenario.key}`),
      assignedAt: assignedUserId ? firstMessage.occurredAt : null,
      assignedUserId,
      changedAt: firstMessage.occurredAt,
      cycleId,
      handlingStartedAt:
        scenario.attendance === "human_active"
          ? at(scenario.messages[0][0] - 10)
          : null,
      historyStartedAt: firstMessage.occurredAt,
      state: scenario.attendance,
      stateVersion: scenario.attendance === "bot_active" ? 0 : 1,
      threadId,
      createdAt: firstMessage.createdAt,
    });
    result.messages.push(...messages);
  }
  return result;
}

function buildMessage({ at, connectionId, cycleId, id, message, threadId }) {
  const [
    minutesAgo,
    direction,
    type,
    content,
    mediaKey,
    mediaType,
    explicitStatus,
  ] = message;
  const mediaUrl = mediaKey ? MEDIA_URLS[mediaKey] : null;
  const media = mediaUrl
    ? {
        caption: content,
        fileName: type === "document" ? "contrato-demo.pdf" : undefined,
        mimeType: mediaType,
      }
    : undefined;
  const providerMetadata = {
    fixture: true,
    ...(media ? { media } : {}),
    ...(type === "location"
      ? {
          location: {
            address: "Avenida Exemplo, 1000",
            latitude: -23.55,
            longitude: -46.63,
          },
        }
      : {}),
    ...(type === "contact"
      ? { contact: { name: "Avaliador ficticio", phone: "+550000000099" } }
      : {}),
  };
  return {
    id,
    content,
    createdAt: at(minutesAgo),
    cycleId,
    direction,
    mediaType: mediaType ?? null,
    mediaUrl,
    messageType: type,
    metadata: { ...fixtureMetadata("message"), providerMetadata },
    occurredAt: at(minutesAgo),
    provider: "meta_cloud",
    providerConnectionId: connectionId,
    sender: direction === "inbound" ? "customer" : "human",
    senderOrigin: direction === "inbound" ? "customer" : "human_crm",
    status: explicitStatus ?? (direction === "inbound" ? "delivered" : "read"),
    threadId,
  };
}

function demoPhone(index) {
  return `5500000000${String(index).padStart(2, "0")}`;
}

function fixtureMetadata(scenario) {
  return {
    fixture: true,
    fixtureNamespace: CRM_UI_DEMO_NAMESPACE,
    officialOperation: false,
    dispatchEnabled: false,
    scenario,
  };
}
