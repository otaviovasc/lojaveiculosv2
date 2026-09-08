import type { ExternalBotEventPreparer } from "../../../domains/crm/bot/ports/externalBotEventPreparation.js";
import type { ExternalBotEventOutbox } from "../../../domains/crm/bot/ports/externalBotPorts.js";
import { signExternalBotEvent } from "./botEventHmac.js";

export interface ExternalBotEventSender {
  send(input: {
    body: string;
    headers: Readonly<Record<string, string>>;
  }): Promise<
    { kind: "delivered" } | { kind: "failed"; code: string; retryable: boolean }
  >;
}

export async function dispatchNextExternalBotEvent(input: {
  now: Date;
  prepare?: ExternalBotEventPreparer;
  clock?: () => Date;
  outbox: ExternalBotEventOutbox;
  secret: string;
  sender: ExternalBotEventSender;
}) {
  const event = await input.outbox.claim(input.now);
  if (!event) return { kind: "idle" } as const;
  const preparation = input.prepare
    ? await input.prepare(event).catch(() => ({
        kind: "failed" as const,
        code: "media_preparation_failed",
        retryable: true,
      }))
    : event.type === "message_received"
      ? {
          kind: "failed" as const,
          code: "media_preparation_unavailable",
          retryable: true,
        }
      : { kind: "ready" as const, event };
  const now = (input.clock ?? (() => new Date()))();
  if (event.grantExpiresAt <= now) {
    await input.outbox.markDeadLetter(event.id, "grant_expired");
    return { eventId: event.id, kind: "dead_letter" } as const;
  }
  if (preparation.kind === "failed") {
    if (!preparation.retryable) {
      await input.outbox.markDeadLetter(event.id, preparation.code);
      return { eventId: event.id, kind: "dead_letter" } as const;
    }
    await input.outbox.release(
      event.id,
      new Date(now.getTime() + 5_000),
      preparation.code,
    );
    return { eventId: event.id, kind: "retry_scheduled" } as const;
  }
  const signed = signExternalBotEvent({
    body: JSON.stringify(preparation.event),
    now,
    secret: input.secret,
  });
  const result = await input.sender.send(signed);
  if (result.kind === "delivered") {
    await input.outbox.markDelivered(event.id);
    return { eventId: event.id, kind: "delivered" } as const;
  }
  if (!result.retryable) {
    await input.outbox.markDeadLetter(event.id, result.code);
    return { eventId: event.id, kind: "dead_letter" } as const;
  }
  await input.outbox.release(
    event.id,
    new Date(now.getTime() + 30_000),
    result.code,
  );
  return { eventId: event.id, kind: "retry_scheduled" } as const;
}
