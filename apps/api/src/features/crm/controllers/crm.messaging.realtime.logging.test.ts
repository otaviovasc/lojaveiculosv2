import type { PermissionKey, StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import { createCrmRealtimeBroker } from "../../../infrastructure/crm/crmRealtimeBroker.js";
import type { ServiceLogger } from "../../../shared/serviceLogger.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createTestApp } from "./crm.controller.testSupport.js";

const connectionId = "24000000-0000-4000-8000-000000000101";
const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;

describe("CRM realtime logging", () => {
  it("logs the stream lifecycle and cursor without message content", async () => {
    const broker = createCrmRealtimeBroker();
    const logger = {
      error: vi.fn<ServiceLogger["error"]>(),
      info: vi.fn<ServiceLogger["info"]>(),
      warn: vi.fn<ServiceLogger["warn"]>(),
    } satisfies ServiceLogger;
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmRealtimeBroker: broker,
      logger,
    });
    await broker.publish({
      connectionId,
      phone: null,
      status: "ready",
      storeId,
      tenantId,
      type: "connection_status",
    });
    const ticketResponse = await app.request("/api/v1/crm/events/ticket", {
      body: JSON.stringify({ connectionId, lastEventId: "0-0" }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const ticket = (await ticketResponse.json()) as { ticket: string };

    await readSseUntil(
      await app.request("/api/v1/crm/events", {
        headers: { "X-CRM-SSE-Ticket": ticket.ticket },
      }),
      "ready",
    );

    const events = logger.info.mock.calls.map(([event]) => event);
    expect(events).toEqual(
      expect.arrayContaining([
        "crm.realtime.ticket.issued",
        "crm.realtime.stream.open",
        "crm.realtime.frame.first",
        "crm.realtime.replay.started",
        "crm.realtime.last_event_id.advanced",
        "crm.realtime.replay.completed",
        "crm.realtime.stream.cancel",
      ]),
    );
    const replayLog = logger.info.mock.calls.find(
      ([event]) => event === "crm.realtime.replay.completed",
    );
    expect(replayLog?.[1]).toMatchObject({ eventCount: 1 });
    expect(typeof replayLog?.[1]?.lastEventId).toBe("string");
    expect(JSON.stringify(logger.info.mock.calls)).not.toContain("ready");
  });

  it("closes an existing stream after conversation read permission is revoked", async () => {
    const broker = createCrmRealtimeBroker();
    const permissions: PermissionKey[] = ["crm.conversations.read"];
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmRealtimeBroker: broker,
      permissions,
    });
    const ticketResponse = await app.request("/api/v1/crm/events/ticket", {
      body: JSON.stringify({ connectionId }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const ticket = (await ticketResponse.json()) as { ticket: string };
    const response = await app.request("/api/v1/crm/events", {
      headers: { "X-CRM-SSE-Ticket": ticket.ticket },
    });
    const reader = response.body!.getReader();
    await reader.read();

    permissions.splice(0);
    await broker.publish({
      connectionId,
      phone: null,
      status: "ready",
      storeId,
      tenantId,
      type: "connection_status",
    });

    await expect(readChunk(reader)).resolves.toMatchObject({ done: true });
  });
});

function createZapiConnection(): CrmConnection {
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
  };
}

async function readSseUntil(response: Response, expected: string) {
  const reader = response.body?.getReader();
  expect(reader).toBeDefined();
  const decoder = new TextDecoder();
  let text = "";
  for (let attempt = 0; attempt < 4 && !text.includes(expected); attempt += 1) {
    const chunk = await Promise.race([
      reader!.read(),
      new Promise<ReadableStreamReadResult<Uint8Array>>((_, reject) => {
        setTimeout(() => reject(new Error("Timed out reading SSE.")), 1_000);
      }),
    ]);
    if (chunk.done) break;
    text += decoder.decode(chunk.value);
  }
  await reader!.cancel();
}

function readChunk(reader: ReadableStreamDefaultReader<Uint8Array>) {
  return Promise.race([
    reader.read(),
    new Promise<ReadableStreamReadResult<Uint8Array>>((_, reject) => {
      setTimeout(() => reject(new Error("Timed out reading SSE.")), 1_000);
    }),
  ]);
}
