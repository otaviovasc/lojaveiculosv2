import type { ExternalBotEventPreparer } from "../../../domains/crm/bot/ports/externalBotEventPreparation.js";
import type { ExternalBotEventOutbox } from "../../../domains/crm/bot/ports/externalBotPorts.js";
import {
  dispatchNextExternalBotEvent,
  type ExternalBotEventSender,
} from "./externalBotEventOutboxDispatcher.js";

export async function runExternalBotEventWorkerOnce(input: {
  eventSigningKey: string;
  prepare: ExternalBotEventPreparer;
  now?: Date;
  outbox: ExternalBotEventOutbox;
  sender: ExternalBotEventSender;
}) {
  if (!input.eventSigningKey.trim()) {
    throw new Error("CRM external bot event signing key is required.");
  }
  return dispatchNextExternalBotEvent({
    prepare: input.prepare,
    now: input.now ?? new Date(),
    outbox: input.outbox,
    secret: input.eventSigningKey,
    sender: input.sender,
  });
}
