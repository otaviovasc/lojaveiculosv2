export type CrmMessagingChannel = "OLX_CHAT" | "WHATSAPP" | "INSTAGRAM";
export type CrmConversationCycleStatus =
  "ACTIVE" | "COMPLETED" | "EXPIRED" | "HUMAN_TAKEOVER" | "MINIBOT_ACTIVE";
export type CrmHumanAttendanceState = "WAITING_HUMAN" | "IN_HUMAN_SERVICE";
export type CrmInterventionActorKind =
  "bot" | "provider" | "support" | "system" | "user";
export type CrmMessageDirection = "INBOUND" | "OUTBOUND";
export type CrmMessageStatus =
  "DELIVERED" | "FAILED" | "PENDING" | "READ" | "SENT";
export type CrmMessageSenderType = "AI" | "CUSTOMER" | "HUMAN" | "SYSTEM";
export type CrmMessageSenderOrigin =
  | "external_bot"
  | "customer"
  | "human_crm"
  | "human_channel"
  | "system"
  | "unknown";
export type CrmMessageType =
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
