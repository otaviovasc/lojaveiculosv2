export type CrmWhatsappChannel = "OLX_CHAT" | "WEB_CHAT" | "WHATSAPP";
export type CrmWhatsappSessionStatus =
  "ACTIVE" | "COMPLETED" | "EXPIRED" | "HUMAN_TAKEOVER" | "MINIBOT_ACTIVE";
export type CrmWhatsappMessageDirection = "INBOUND" | "OUTBOUND";
export type CrmWhatsappMessageStatus =
  "DELIVERED" | "FAILED" | "PENDING" | "READ" | "SENT";
export type CrmWhatsappMessageSenderType =
  "AI" | "CUSTOMER" | "HUMAN" | "SYSTEM";
export type CrmWhatsappMessageType =
  | "AUDIO"
  | "CATALOG"
  | "CONTACT"
  | "DOCUMENT"
  | "IMAGE"
  | "INTERACTIVE"
  | "LOCATION"
  | "STICKER"
  | "TEMPLATE"
  | "TEXT"
  | "VIDEO";
