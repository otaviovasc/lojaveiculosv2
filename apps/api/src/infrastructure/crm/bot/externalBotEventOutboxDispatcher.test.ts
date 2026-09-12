import { expect, it, vi } from "vitest";
import { dispatchNextExternalBotEvent } from "./externalBotEventOutboxDispatcher.js";
import type { ExternalBotEvent } from "../../../domains/crm/bot/externalBotModels.js";
import {
  createMemoryExternalBotNonceStore,
  verifyExternalBotEventSignature,
} from "./botEventHmac.js";
import { createHttpExternalBotEventSender } from "./httpExternalBotEventSender.js";

it("retries missing document content without sending, then signs the recovered download link", async () => {
  const now = new Date();
  const event = {
    id: "event",
    type: "message_received",
    payload: { messageRef: "message" },
    grantExpiresAt: new Date(now.getTime() + 90_000),
  } as ExternalBotEvent;
  const outbox = {
    enqueue: vi.fn(),
    claim: vi.fn(async () => event),
    markDelivered: vi.fn(),
    markDeadLetter: vi.fn(),
    release: vi.fn(),
  };
  const send = vi.fn(async (_request: { body: string }) => ({
    kind: "delivered" as const,
  }));
  const prepare = vi
    .fn()
    .mockResolvedValueOnce({
      kind: "failed",
      code: "document_media_unavailable",
      retryable: true,
    })
    .mockResolvedValueOnce({
      kind: "ready",
      event: {
        ...event,
        document: {
          messageRef: "message",
          downloadUrl: "https://storage.test/signed",
          expiresAt: event.grantExpiresAt.toISOString(),
          contentType: "application/pdf",
        },
      },
    });
  const input = {
    now,
    clock: () => now,
    outbox,
    sender: { send },
    secret: "test",
    prepare,
  };
  expect(await dispatchNextExternalBotEvent(input)).toMatchObject({
    kind: "retry_scheduled",
  });
  expect(send).not.toHaveBeenCalled();
  expect(outbox.release).toHaveBeenCalledWith(
    "event",
    new Date(now.getTime() + 5_000),
    "document_media_unavailable",
  );
  expect(await dispatchNextExternalBotEvent(input)).toMatchObject({
    kind: "delivered",
  });
  expect(JSON.parse(send.mock.calls[0]?.[0]?.body ?? "{}")).toMatchObject({
    id: "event",
    document: { downloadUrl: "https://storage.test/signed" },
  });
});

it("dead-letters when the store delivery config is missing", async () => {
  const now = new Date();
  const event = {
    id: "event-no-config",
    type: "human_attendance_changed",
    payload: {},
    grantExpiresAt: new Date(now.getTime() + 90_000),
  } as ExternalBotEvent;
  const outbox = {
    enqueue: vi.fn(),
    claim: vi.fn(async () => event),
    markDelivered: vi.fn(),
    markDeadLetter: vi.fn(),
    release: vi.fn(),
  };
  const send = vi.fn();

  const result = await dispatchNextExternalBotEvent({
    now,
    clock: () => now,
    outbox,
    resolveDelivery: async () => ({
      code: "integration_not_configured",
      kind: "undeliverable",
      retryable: false,
    }),
  });

  expect(result).toMatchObject({ kind: "dead_letter" });
  expect(outbox.markDeadLetter).toHaveBeenCalledWith(
    "event-no-config",
    "integration_not_configured",
  );
  expect(send).not.toHaveBeenCalled();
});

it("signs and sends with the per-event resolved delivery", async () => {
  const now = new Date();
  const event = {
    id: "event-resolved",
    type: "human_attendance_changed",
    payload: {},
    grantExpiresAt: new Date(now.getTime() + 90_000),
  } as ExternalBotEvent;
  const outbox = {
    enqueue: vi.fn(),
    claim: vi.fn(async () => event),
    markDelivered: vi.fn(),
    markDeadLetter: vi.fn(),
    release: vi.fn(),
  };
  const send = vi.fn(
    async (_request: { body: string; headers: Record<string, string> }) => ({
      kind: "delivered" as const,
    }),
  );
  const resolveDelivery = vi.fn(async () => ({
    kind: "ready" as const,
    secret: "store-secret",
    sender: { send },
  }));

  const result = await dispatchNextExternalBotEvent({
    now,
    clock: () => now,
    outbox,
    resolveDelivery,
  });

  expect(result).toMatchObject({ kind: "delivered" });
  expect(resolveDelivery).toHaveBeenCalledWith(
    expect.objectContaining({ id: "event-resolved" }),
  );
  expect(outbox.markDelivered).toHaveBeenCalledWith("event-resolved");
  expect(send.mock.calls[0]?.[0]?.headers["x-crm-bot-signature"]).toMatch(
    /^v1=/u,
  );
});

it("delivers a signed event that a mock bot verifies and rejects on replay", async () => {
  const now = new Date("2026-08-12T12:00:00.000Z");
  const event = {
    id: "event-http-round-trip",
    type: "human_attendance_changed",
    payload: { humanAttendanceActive: false },
    grantExpiresAt: new Date(now.getTime() + 90_000),
  } as ExternalBotEvent;
  const outbox = {
    enqueue: vi.fn(),
    claim: vi.fn(async () => event),
    markDelivered: vi.fn(),
    markDeadLetter: vi.fn(),
    release: vi.fn(),
  };
  let received:
    { body: string; headers: Readonly<Record<string, string>> } | undefined;
  const fetchMock = vi.fn<typeof fetch>(async (_url, init) => {
    received = {
      body: String(init?.body),
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
    };
    return new Response(null, { status: 204 });
  });
  const sender = createHttpExternalBotEventSender({
    fetch: fetchMock,
    url: "https://mock-bot.test/events",
  });

  const result = await dispatchNextExternalBotEvent({
    now,
    clock: () => now,
    outbox,
    sender,
    secret: "mock-bot-secret",
  });

  expect(result).toMatchObject({ kind: "delivered" });
  expect(fetchMock).toHaveBeenCalledWith(
    "https://mock-bot.test/events",
    expect.objectContaining({ method: "POST" }),
  );
  expect(received).toBeDefined();
  if (!received) throw new Error("Mock bot did not receive the event.");
  const request = received;
  expect(request.headers["content-type"]).toBe("application/json");
  const nonceStore = createMemoryExternalBotNonceStore();
  const verificationInput = {
    body: request.body,
    headers: request.headers,
    nonceStore,
    now,
    secret: "mock-bot-secret",
  };
  expect(await verifyExternalBotEventSignature(verificationInput)).toEqual({
    kind: "verified",
  });
  expect(await verifyExternalBotEventSignature(verificationInput)).toEqual({
    kind: "replay",
  });
  expect(outbox.markDelivered).toHaveBeenCalledWith("event-http-round-trip");
});
