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
  outbox: ExternalBotEventOutbox;
  secret: string;
  sender: ExternalBotEventSender;
}) {
  const event = await input.outbox.claim(input.now);
  if (!event) return { kind: "idle" } as const;
  const signed = signExternalBotEvent({
    body: JSON.stringify(event),
    now: input.now,
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
    new Date(input.now.getTime() + 30_000),
    result.code,
  );
  return { eventId: event.id, kind: "retry_scheduled" } as const;
}
