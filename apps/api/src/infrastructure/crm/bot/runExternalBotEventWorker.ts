import type { ExternalBotEventPreparer } from "../../../domains/crm/bot/ports/externalBotEventPreparation.js";
import type { ExternalBotEventOutbox } from "../../../domains/crm/bot/ports/externalBotPorts.js";
import {
  dispatchNextExternalBotEvent,
  type ExternalBotDeliveryResolver,
  type ExternalBotEventSender,
} from "./externalBotEventOutboxDispatcher.js";

export async function runExternalBotEventWorkerOnce(input: {
  prepare: ExternalBotEventPreparer;
  eventSigningKey?: string;
  now?: Date;
  outbox: ExternalBotEventOutbox;
  resolveDelivery?: ExternalBotDeliveryResolver;
  sender?: ExternalBotEventSender;
}) {
  const signingKey = input.eventSigningKey?.trim();
  if (input.resolveDelivery) {
    return dispatchNextExternalBotEvent({
      prepare: input.prepare,
      now: input.now ?? new Date(),
      outbox: input.outbox,
      resolveDelivery: input.resolveDelivery,
    });
  }

  if (!signingKey) {
    throw new Error("CRM external bot event signing key is required.");
  }
  if (!input.sender) {
    throw new Error("CRM external bot event sender is required.");
  }
  return dispatchNextExternalBotEvent({
    prepare: input.prepare,
    now: input.now ?? new Date(),
    outbox: input.outbox,
    secret: signingKey,
    sender: input.sender,
  });
}
