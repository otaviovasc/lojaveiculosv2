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
