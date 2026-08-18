import type { PermissionKey, StoreId, TenantId } from "@lojaveiculosv2/shared";
import { expect, vi } from "vitest";
import type { CrmConversationRepository } from "../../../domains/crm/ports/crmConversationRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmRoutingRepositories } from "../adapters/memory/crmRoutingRepository.js";
import {
  createConfiguredZapiTestConnection,
  withTestZapiWebhookToken,
} from "./crm.channelConnections.testSupport.js";
import { createTestApp } from "./crm.controller.testSupport.js";

export const campaignConnectionId = "24000000-0000-4000-8000-000000000101";
export const campaignStoreId = "store_1" as StoreId;
export const campaignTenantId = "tenant_1" as TenantId;

export function createCampaignTestApp(
  conversationRepository: CrmConversationRepository,
  permissions?: PermissionKey[],
) {
  const connections = createMemoryCrmConnectionRepository([
    createZapiConnection(),
  ]);
  const routing = createMemoryCrmRoutingRepositories({
    policies: [
      {
        externalBotConnectionId: null,
        externalBotMode: "disabled",
        channel: "whatsapp",
        defaultConnectionId: campaignConnectionId,
        id: "campaign-whatsapp-default",
        storeId: campaignStoreId,
        tenantId: campaignTenantId,
      },
    ],
  });
  return createTestApp({
    crmConnectionRepository: connections,
    crmRoutingConnectionRepository: connections.routingConnectionRepository,
    crmRoutingPolicyRepository: routing.policyRepository,
    crmMessagingGateway: { sendText: createSendTextSpy() },
    crmConversationRepository: conversationRepository,
    ...(permissions ? { permissions } : {}),
  });
}

export async function createCampaign(
  app: ReturnType<typeof createTestApp>,
  overrides: Record<string, unknown>,
) {
  const { recipients, ...bodyOverrides } = overrides;
  const response = await app.request(
    "/api/v1/crm/campaigns",
    jsonPost(createCampaignBody(recipients as string[], bodyOverrides)),
  );
  expect(response.status).toBe(201);
  return (await response.json()) as { id: string };
}

export function createCampaignBody(
  cycleIds: readonly string[],
  overrides: Record<string, unknown> = {},
) {
  return {
    content: "Ola {nome}, ainda esta procurando veiculo?",
    intervalMinutes: 1,
    name: "Campanha Julho",
    recipients: cycleIds.map((cycleId) => ({
      cycleId,
      variables: { nome: "Ana" },
    })),
    scheduledStartAt: "2030-01-01T10:00:00.000Z",
    ...overrides,
  };
}

export async function processDue(app: ReturnType<typeof createTestApp>) {
  const response = await app.request(
    "/api/v1/crm/scheduled-messages/process-due",
    jsonPost({ dueAt: "2030-01-01T10:05:00.000Z" }),
  );
  expect(response.status).toBe(200);
}

export async function expectCampaign(
  repository: CrmConversationRepository,
  campaignId: string,
  expected: Record<string, unknown>,
) {
  const campaign = await repository.findCampaignById({
    campaignId,
    storeId: campaignStoreId,
    tenantId: campaignTenantId,
  });
  expect(campaign).toMatchObject(expected);
}

export async function expectScheduledCount(
  repository: CrmConversationRepository,
  campaignId: string,
  status: "cancelled" | "pending",
  count: number,
) {
  const messages = await repository.listScheduledMessages({
    campaignId,
    limit: 10,
    status,
    storeId: campaignStoreId,
    tenantId: campaignTenantId,
  });
  expect(messages).toHaveLength(count);
}

export function seedCycle(
  repository: CrmConversationRepository,
  customerPhone: string,
) {
  return repository.ingestMessage({
    customerDisplayName: "Ana",
    customerPhone,
    channel: "WHATSAPP",
    connectionId: campaignConnectionId,
    content: "Oi",
    direction: "INBOUND",
    externalId: `seed-${customerPhone}`,
    metadata: {},
    providerTimestamp: new Date("2026-07-02T19:00:00.000Z"),
    senderOrigin: "customer",
    senderType: "CUSTOMER",
    status: "DELIVERED",
    storeId: campaignStoreId,
    tenantId: campaignTenantId,
    type: "TEXT",
  });
}

export function createTag(repository: CrmConversationRepository, name: string) {
  return repository.createTag({
    color: "#64748b",
    name,
    storeId: campaignStoreId,
    tenantId: campaignTenantId,
  });
}

export function postZapiReply(
  app: ReturnType<typeof createTestApp>,
  phone: string,
  input: { content?: string; messageId?: string } = {},
) {
  return app.request(
    `/api/v1/crm/whatsapp/webhooks/zapi/${campaignConnectionId}/received`,
    jsonPost(
      {
        messageId: input.messageId ?? `reply-${phone}`,
        phone,
        senderName: "Ana",
        text: { message: input.content ?? "Tenho interesse" },
        timestamp: 1893492300,
      },
      withTestZapiWebhookToken(),
    ),
  );
}

export function jsonPost(
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
) {
  return {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...headers },
    method: "POST",
  };
}

function createSendTextSpy() {
  return vi.fn(async () => ({
    externalId: "zapi-campaign-outbound",
    providerTimestamp: new Date("2030-01-01T10:01:00.000Z"),
    raw: { messageId: "zapi-campaign-outbound" },
  }));
}

function createZapiConnection() {
  return createConfiguredZapiTestConnection({
    id: campaignConnectionId,
    overrides: { metadata: { providerConnected: true } },
    storeId: campaignStoreId,
    tenantId: campaignTenantId,
  });
}
