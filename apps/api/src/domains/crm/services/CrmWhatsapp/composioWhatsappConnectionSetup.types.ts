import type { WhatsappConnection } from "../../whatsapp/whatsappConnectionModels.js";

export type AuthorizeComposioWhatsappInput = { connectionId: string };
export type SelectComposioWhatsappSenderInput =
  AuthorizeComposioWhatsappInput & { senderId: string };
export type CompleteComposioWhatsappResult = {
  connection: WhatsappConnection;
  nextAction: "select_sender" | null;
  senders: Array<{
    displayName: string | null;
    phone: string | null;
    senderId: string;
  }>;
};
