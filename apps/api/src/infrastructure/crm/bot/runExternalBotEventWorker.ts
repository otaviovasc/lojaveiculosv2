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
  if (!input.resolveDelivery && !input.eventSigningKey?.trim()) {
    throw new Error("CRM external bot event signing key is required.");
  }
  return dispatchNextExternalBotEvent({
    prepare: input.prepare,
    now: input.now ?? new Date(),
    outbox: input.outbox,
    ...(input.resolveDelivery
      ? { resolveDelivery: input.resolveDelivery }
      : { secret: input.eventSigningKey ?? "", sender: input.sender! }),
  });
}
