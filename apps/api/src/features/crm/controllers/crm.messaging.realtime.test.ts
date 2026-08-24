import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type { CrmMessage } from "../../../domains/crm/ports/crmConversationRepositoryModels.js";
import { createTestCrmConversationCycle } from "../../../domains/crm/testSupportWhatsapp.js";
import { createCrmRealtimeBroker } from "../../../infrastructure/crm/crmRealtimeBroker.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createTestApp } from "./crm.controller.testSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const connectionId = "24000000-0000-4000-8000-000000000101";

describe("CRM realtime", () => {
  it("opens a ticketed realtime stream", async () => {
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmRealtimeBroker: createCrmRealtimeBroker(),
    });

    const ticketResponse = await app.request("/api/v1/crm/events/ticket", {
      body: JSON.stringify({ connectionId }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    expect(ticketResponse.status).toBe(200);
    expect(ticketResponse.headers.get("cache-control")).toBe("no-store");
    expect(ticketResponse.headers.get("referrer-policy")).toBe("no-referrer");
    const ticket = (await ticketResponse.json()) as { ticket: string };

    const streamResponse = await app.request(
      `/api/v1/crm/events?ticket=${ticket.ticket}`,
    );
    expect(streamResponse.status).toBe(200);
    expect(streamResponse.headers.get("content-type")).toContain(
      "text/event-stream",
    );
    expect(streamResponse.headers.get("cache-control")).toBe("no-store");
    expect(streamResponse.headers.get("referrer-policy")).toBe("no-referrer");
    const reader = streamResponse.body?.getReader();
    expect(reader).toBeDefined();
    const chunk = await reader!.read();
    await reader!.cancel();
    expect(new TextDecoder().decode(chunk.value)).toContain(
      '"type":"connected"',
    );

    const reusedResponse = await app.request(
      `/api/v1/crm/events?ticket=${ticket.ticket}`,
    );
    expect(reusedResponse.status).toBe(401);
    expect(reusedResponse.headers.get("cache-control")).toBe("no-store");
    expect(reusedResponse.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("replays missed scoped events after the last received event id", async () => {
    const broker = createCrmRealtimeBroker();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmRealtimeBroker: broker,
    });
    await broker.publish(createConnectionStatusEvent("first"));
    const [first] = await broker.replay({
      connectionId,
      queueVisibility: { kind: "global" },
      sinceEventId: "0-0",
      storeId,
      tenantId,
    });
    expect(first).toBeDefined();

    await broker.publish(createConnectionStatusEvent("second"));
    await broker.publish(
      createConnectionStatusEvent("other", "other-connection"),
    );
    const [second] = await broker.replay({
      connectionId,
      queueVisibility: { kind: "global" },
      sinceEventId: first!.id,
      storeId,
      tenantId,
    });
    expect(second?.event).toMatchObject({ status: "second" });

    const ticketResponse = await app.request("/api/v1/crm/events/ticket", {
      body: JSON.stringify({
        connectionId,
        lastEventId: first!.id,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const ticket = (await ticketResponse.json()) as { ticket: string };
    const streamResponse = await app.request(
      `/api/v1/crm/events?ticket=${ticket.ticket}`,
    );
    const stream = await readSseUntil(streamResponse, "second");

    expect(stream).toContain(`id: ${second!.id}`);
    expect(stream).toContain("event: connection_status");
    expect(stream).toContain('"status":"second"');
    expect(stream).not.toContain('"status":"first"');
    expect(stream).not.toContain('"status":"other"');
  });
});

function createZapiConnection(
  overrides: Partial<CrmConnection> = {},
): CrmConnection {
  return {
    broker: "direct",
    channel: "whatsapp",
    credentialsRef: {},
    displayName: "ZAPI Test Connection",
    externalConnectionId: null,
    externalInstanceId: null,
    id: connectionId,
    metadata: {},
    phone: null,
    provider: "zapi",
    status: "sandbox",
    storeId,
    tenantId,
    webhookUrl: null,
    ...overrides,
  };
}

function createConnectionStatusEvent(
  status: string,
  eventConnectionId = connectionId,
) {
  return {
    connectionId: eventConnectionId,
    phone: null,
    status,
    storeId,
    tenantId,
    type: "connection_status" as const,
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
  return JSON.parse(data!) as Record<string, unknown> & {
    conversationCycle: Record<string, unknown>;
    message: Record<string, unknown>;
  };
}

async function readSseUntil(response: Response, expected: string) {
  const reader = response.body?.getReader();
  expect(reader).toBeDefined();
  const decoder = new TextDecoder();
  let text = "";
  for (let attempt = 0; attempt < 4 && !text.includes(expected); attempt += 1) {
    const chunk = await readChunk(reader!);
    if (chunk.done) break;
    text += decoder.decode(chunk.value);
  }
  await reader!.cancel();
  return text;
}

async function readChunk(reader: ReadableStreamDefaultReader<Uint8Array>) {
  return Promise.race([
    reader.read(),
    new Promise<ReadableStreamReadResult<Uint8Array>>((_, reject) => {
      setTimeout(() => reject(new Error("Timed out reading SSE.")), 1_000);
    }),
  ]);
}
