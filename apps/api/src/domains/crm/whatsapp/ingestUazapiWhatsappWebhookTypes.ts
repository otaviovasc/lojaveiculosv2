import type {
  CrmMessage,
  CrmConversationCycle,
} from "../ports/crmConversationRepository.js";

export type IngestUazapiWhatsappWebhookInput = {
  connectionId: string;
  payload: Record<string, unknown>;
};

export type IngestUazapiWhatsappWebhookResult =
  | { eventId: string; status: "duplicate" }
  | {
      reason: "connection_not_found" | "not_processable";
      status: "ignored";
    }
  | { conversationCycle: CrmConversationCycle; status: "captured" }
  | {
      message: CrmMessage;
      conversationCycle: CrmConversationCycle;
      status: "duplicate" | "stored";
    };
