import type { WhatsappMessage, WhatsappSession } from "./whatsappModels.js";

export type IngestZapiWhatsappWebhookInput = {
  connectionId: string;
  payload: Record<string, unknown>;
};

export type IngestZapiWhatsappWebhookResult =
  | { eventId: string; status: "duplicate" }
  | {
      reason: "connection_not_found" | "not_processable";
      status: "ignored";
    }
  | { session: WhatsappSession; status: "captured" }
  | {
      message: WhatsappMessage;
      session: WhatsappSession;
      status: "duplicate" | "stored";
    };
