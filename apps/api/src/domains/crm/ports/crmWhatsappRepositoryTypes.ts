export type CrmWhatsappChannel =
  "OLX_CHAT" | "WEB_CHAT" | "WHATSAPP" | "INSTAGRAM";
export type CrmWhatsappSessionStatus =
  "ACTIVE" | "COMPLETED" | "EXPIRED" | "HUMAN_TAKEOVER" | "MINIBOT_ACTIVE";
export type CrmWhatsappHumanAttendanceState =
  "WAITING_HUMAN" | "IN_HUMAN_SERVICE";
export type CrmWhatsappInterventionActorKind =
  "bot" | "provider" | "support" | "system" | "user";
export type CrmWhatsappMessageDirection = "INBOUND" | "OUTBOUND";
export type CrmWhatsappMessageStatus =
  "DELIVERED" | "FAILED" | "PENDING" | "READ" | "SENT";
export type CrmWhatsappMessageSenderType =
  "AI" | "CUSTOMER" | "HUMAN" | "SYSTEM";
export type CrmWhatsappMessageSenderOrigin =
  | "bot_api"
  | "customer"
  | "human_crm"
  | "human_whatsapp"
  | "system"
  | "unknown";
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
