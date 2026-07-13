import type { PermissionKey, StoreId, TenantId } from "@lojaveiculosv2/shared";
import { expect, vi } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type { CrmWhatsappRepository } from "../../../domains/crm/ports/crmWhatsappRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createTestApp } from "./crm.whatsapp.controller.testSupport.js";

export const campaignConnectionId = "24000000-0000-4000-8000-000000000101";
export const campaignStoreId = "store_1" as StoreId;
export const campaignTenantId = "tenant_1" as TenantId;

export function createCampaignTestApp(
  whatsappRepository: CrmWhatsappRepository,
  permissions?: PermissionKey[],
) {
  return createTestApp({
    crmConnectionRepository: createMemoryCrmConnectionRepository([
      createZapiConnection(),
    ]),
    crmWhatsappGateway: { sendText: createSendTextSpy() },
    crmWhatsappRepository: whatsappRepository,
    ...(permissions ? { permissions } : {}),
  });
}

export async function createCampaign(
  app: ReturnType<typeof createTestApp>,
  overrides: Record<string, unknown>,
) {
  const { recipients, ...bodyOverrides } = overrides;
  const response = await app.request(
    "/api/v1/crm/whatsapp/campaigns",
    jsonPost(createCampaignBody(recipients as string[], bodyOverrides)),
  );
  expect(response.status).toBe(201);
  return (await response.json()) as { id: string };
}

export function createCampaignBody(
  sessionIds: readonly string[],
  overrides: Record<string, unknown> = {},
) {
  return {
    content: "Ola {nome}, ainda esta procurando veiculo?",
    intervalMinutes: 1,
    name: "Campanha Julho",
    recipients: sessionIds.map((sessionId) => ({
      sessionId,
      variables: { nome: "Ana" },
    })),
    scheduledStartAt: "2030-01-01T10:00:00.000Z",
    ...overrides,
  };
}

export async function processDue(app: ReturnType<typeof createTestApp>) {
  const response = await app.request(
    "/api/v1/crm/whatsapp/scheduled-messages/process-due",
    jsonPost({ dueAt: "2030-01-01T10:05:00.000Z" }),
  );
  expect(response.status).toBe(200);
}

export async function expectCampaign(
  repository: CrmWhatsappRepository,
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
  repository: CrmWhatsappRepository,
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

export function seedSession(
  repository: CrmWhatsappRepository,
  buyerPhone: string,
) {
  return repository.ingestMessage({
    buyerName: "Ana",
    buyerPhone,
    channel: "WHATSAPP",
    connectionId: campaignConnectionId,
    content: "Oi",
    direction: "INBOUND",
    externalId: `seed-${buyerPhone}`,
    metadata: {},
    providerTimestamp: new Date("2026-07-02T19:00:00.000Z"),
    senderType: "CUSTOMER",
    status: "DELIVERED",
    storeId: campaignStoreId,
    tenantId: campaignTenantId,
    type: "TEXT",
  });
}

export function createTag(repository: CrmWhatsappRepository, name: string) {
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
    jsonPost({
      messageId: input.messageId ?? `reply-${phone}`,
      phone,
      senderName: "Ana",
      text: { message: input.content ?? "Tenho interesse" },
      timestamp: 1893492300,
    }),
  );
}

export function jsonPost(body: Record<string, unknown>) {
  return {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
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

function createZapiConnection(): CrmConnection {
  return {
    credentialsRef: {},
    displayName: "ZAPI Test Connection",
    externalConnectionId: null,
    externalInstanceId: null,
    id: campaignConnectionId,
    metadata: {},
    phone: null,
    provider: "zapi",
    status: "sandbox",
    storeId: campaignStoreId,
    tenantId: campaignTenantId,
    webhookUrl: null,
  };
}
