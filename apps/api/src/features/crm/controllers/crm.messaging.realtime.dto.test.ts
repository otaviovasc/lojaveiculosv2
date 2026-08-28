import { describe, expect, it } from "vitest";
import type { CrmMessage } from "../../../domains/crm/ports/crmConversationRepositoryModels.js";
import { createTestCrmConversationCycle } from "../../../domains/crm/testSupportWhatsapp.js";
import { createCrmRealtimeBroker } from "../../../infrastructure/crm/crmRealtimeBroker.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createTestApp } from "./crm.controller.testSupport.js";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const connectionId = "24000000-0000-4000-8000-000000000101";

describe("CRM realtime DTO", () => {
  it("serializes domain events with the public DTO contract", async () => {
    const broker = createCrmRealtimeBroker();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmRealtimeBroker: broker,
    });
    await broker.publish({
      connectionId,
      phone: null,
      status: "cursor",
      storeId,
      tenantId,
      type: "connection_status",
    });
    const [cursor] = await broker.replay({
      connectionId,
      queueVisibility: { kind: "global" },
      sinceEventId: "0-0",
      storeId,
      tenantId,
    });
    await broker.publish(serializeEvent(createMessageEvent()));
    const ticketResponse = await app.request("/api/v1/crm/events/ticket", {
      body: JSON.stringify({ connectionId, lastEventId: cursor!.id }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const ticket = (await ticketResponse.json()) as { ticket: string };
    const streamResponse = await app.request("/api/v1/crm/events", {
      headers: { "X-CRM-SSE-Ticket": ticket.ticket },
    });
    const stream = await readSseUntil(streamResponse, "message-1");
    const event = readSseData(stream, "message");

    expect(event).toMatchObject({
      connectionId,
      conversationCycle: { channel: "whatsapp" },
      message: { channel: "whatsapp", id: "message-1" },
      type: "message",
    });
    expect(event).not.toHaveProperty("storeId");
    expect(event).not.toHaveProperty("tenantId");
    expect(event.message).not.toHaveProperty("channelMessageId");
    expect(event.message).not.toHaveProperty("storeId");
    expect(event.message).not.toHaveProperty("tenantId");
    expect(event.conversationCycle).not.toHaveProperty("channelMetadata");
    expect(event.conversationCycle).not.toHaveProperty("storeId");
    expect(event.conversationCycle).not.toHaveProperty("tenantId");
  });
});

function serializeEvent<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createZapiConnection() {
  return {
    broker: "direct" as const,
    channel: "whatsapp" as const,
    credentialsRef: {},
    displayName: "ZAPI Test Connection",
    externalConnectionId: null,
    externalInstanceId: null,
    id: connectionId,
    metadata: {},
    phone: null,
    provider: "zapi" as const,
    status: "sandbox" as const,
    storeId,
    tenantId,
    webhookUrl: null,
  };
}

function createMessageEvent() {
  const now = new Date("2026-08-24T12:00:00.000Z");
  const message: CrmMessage = {
    channel: "WHATSAPP",
    channelMessageId: "domain-only-message-id",
    connectionId,
    content: "Ola",
    createdAt: now,
    cycleId: "cycle-1",
    deletedAt: null,
    direction: "INBOUND",
    externalId: "external-1",
    id: "message-1",
    mediaType: null,
    mediaUrl: null,
    metadata: {},
    providerTimestamp: now,
    senderOrigin: "customer",
    senderType: "CUSTOMER",
    status: "DELIVERED",
    storeId,
    tenantId,
    type: "TEXT",
    updatedAt: now,
  };
  return {
    connectionId,
    conversationCycle: createTestCrmConversationCycle({
      channel: "WHATSAPP",
      connectionId,
      id: "cycle-1",
      storeId,
      tenantId,
    }),
    message,
    storeId,
    tenantId,
    type: "message" as const,
  };
}

function readSseData(stream: string, eventName: string) {
  const frame = stream
    .split("\n\n")
    .find((candidate) => candidate.includes(`event: ${eventName}\n`));
  expect(frame).toBeDefined();
  const data = frame
    ?.split("\n")
    .find((line) => line.startsWith("data: "))
    ?.slice("data: ".length);
  expect(data).toBeDefined();
  return JSON.parse(data!) as Record<string, unknown>;
}

async function readSseUntil(response: Response, expected: string) {
  const reader = response.body?.getReader();
  expect(reader).toBeDefined();
  const decoder = new TextDecoder();
  let text = "";
  for (let attempt = 0; attempt < 4 && !text.includes(expected); attempt += 1) {
    const chunk = await Promise.race([
      reader!.read(),
      new Promise<ReadableStreamReadResult<Uint8Array>>((_, reject) =>
        setTimeout(() => reject(new Error("Timed out reading SSE.")), 1_000),
      ),
    ]);
    if (chunk.done) break;
    text += decoder.decode(chunk.value);
  }
  await reader!.cancel();
  return text;
}
