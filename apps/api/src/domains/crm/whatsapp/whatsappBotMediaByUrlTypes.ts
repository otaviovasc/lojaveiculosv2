import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type { CrmWhatsappSession } from "../ports/crmWhatsappRepository.js";

export type SendWhatsappBotMediaByUrlInput = {
  buyerName?: string;
  caption?: string;
  connectionId?: string;
  fileName?: string;
  mediaType: "audio" | "document" | "image";
  mediaUrl: string;
  mimeType?: string;
  phone?: string;
  sessionId?: string;
};

export type BotMediaTarget = {
  buyerName?: string;
  connection: CrmConnection;
  phone: string;
  session: CrmWhatsappSession | null;
};
