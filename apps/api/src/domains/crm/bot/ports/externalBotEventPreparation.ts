import type { ExternalBotEvent } from "../externalBotModels.js";

/** Generated at delivery time; never accepted from a caller's free-form payload. */
export type ExternalBotDocumentAccess = {
  messageRef: string;
  downloadUrl: string;
  expiresAt: string;
  contentType: string | null;
};
export type PreparedExternalBotEvent = ExternalBotEvent & {
  document?: ExternalBotDocumentAccess;
};
export type ExternalBotEventPreparationResult =
  | { kind: "ready"; event: PreparedExternalBotEvent }
  | { kind: "failed"; code: string; retryable: boolean };
export type ExternalBotEventPreparer = (
  event: ExternalBotEvent,
) => Promise<ExternalBotEventPreparationResult>;
