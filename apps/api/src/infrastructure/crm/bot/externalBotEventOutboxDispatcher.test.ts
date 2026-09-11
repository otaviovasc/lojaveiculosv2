import { expect, it, vi } from "vitest";
import { dispatchNextExternalBotEvent } from "./externalBotEventOutboxDispatcher.js";
import type { ExternalBotEvent } from "../../../domains/crm/bot/externalBotModels.js";

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
