import type { ExternalBotEventOutbox } from "../../../domains/crm/bot/ports/externalBotPorts.js";
import {
  dispatchNextExternalBotEvent,
  type ExternalBotEventSender,
} from "./externalBotEventOutboxDispatcher.js";

export async function runExternalBotEventWorkerOnce(input: {
  eventSigningKey: string;
  now?: Date;
  outbox: ExternalBotEventOutbox;
  sender: ExternalBotEventSender;
}) {
  if (!input.eventSigningKey.trim()) {
    throw new Error("CRM external bot event signing key is required.");
  }
  return dispatchNextExternalBotEvent({
    now: input.now ?? new Date(),
    outbox: input.outbox,
    secret: input.eventSigningKey,
    sender: input.sender,
  });
}
