export const externalBotActionNames = [
  "message.send",
  "fact.propose",
  "vehicle_interest.propose",
  "opportunity.open",
  "task.create",
  "appointment.propose",
  "handoff.request",
  "conversation.summarize",
] as const;

export type ExternalBotActionName = (typeof externalBotActionNames)[number];

export type ExternalBotScope = {
  channel: "instagram" | "olx_chat" | "whatsapp";
  tenantId: string;
  storeId: string;
  integrationId: string;
  connectionId: string;
  threadId: string;
  provider: "meta_cloud" | "olx" | "zapi";
  actionClass: "effect" | "proposal";
  modelVersion: string;
};

export type ExternalBotCommand =
  | { action: "message.send"; payload: { text: string } }
  | {
      action: "fact.propose";
      payload: { classification: string; summary: string };
    }
  | {
      action: "vehicle_interest.propose";
      payload: { interestLevel: "high" | "low" | "medium"; vehicleRef: string };
    }
  | { action: "opportunity.open"; payload: { summary: string } }
  | { action: "task.create"; payload: { dueAt?: string; title: string } }
  | {
      action: "appointment.propose";
      payload: { startsAt: string; summary?: string };
    }
  | { action: "handoff.request"; payload: { reason: string } }
  | { action: "conversation.summarize"; payload: { summary: string } };

export type ExternalBotActionStatus =
  | "accepted"
  | "authorized"
  | "claimed"
  | "executing"
  | "provider_succeeded"
  | "completed"
  | "retryable_failed"
  | "indeterminate"
  | "dead_letter"
  | "cancelled";

export type ExternalBotActionRecord = ExternalBotScope & {
  id: string;
  command: ExternalBotCommand;
  expectedRevision: number;
  idempotencyKey: string;
  requestDigest: string;
  status: ExternalBotActionStatus;
  createdAt: Date;
  updatedAt: Date;
  failureCode?: string;
};

export type ExternalBotEventType =
  | "connection_state_changed"
  | "human_attendance_changed"
  | "message_received"
  | "thread_state_changed";

export type ExternalBotEventPayload = {
  channel: ExternalBotScope["channel"];
  classification?: string;
  connectionState?: string;
  contactRef?: string;
  direction?: "inbound" | "outbound";
  humanAttendanceActive?: boolean;
  messageRef?: string;
  summary?: string;
  threadState?: string;
  vehicleRef?: string;
};

export type ExternalBotEvent = ExternalBotScope & {
  authorizedRequestDigest: string;
  id: string;
  type: ExternalBotEventType;
  occurredAt: Date;
  payload: ExternalBotEventPayload;
  grant: string;
  grantExpiresAt: Date;
};

export type ExternalBotKillSwitchLevel =
  | "global"
  | "tenant"
  | "store"
  | "integration"
  | "connection"
  | "thread"
  | "provider"
  | "action"
  | "action_class"
  | "pii_export"
  | "model_version";
