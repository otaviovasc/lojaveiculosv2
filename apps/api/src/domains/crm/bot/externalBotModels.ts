import { externalBotActionRegistry } from "@lojaveiculosv2/shared";

export const externalBotActionNames = [...externalBotActionRegistry] as const;

export type ExternalBotActionName = (typeof externalBotActionNames)[number];

export type ExternalBotScope = {
  channel: "instagram" | "olx_chat" | "whatsapp";
  tenantId: string;
  storeId: string;
  integrationId: string;
  connectionId: string;
  threadId: string;
  provider: "meta_cloud" | "olx" | "zapi";
  modelVersion: string;
};

export type ExternalBotCommand =
  | { action: "message.send_text"; payload: { text: string } }
  | {
      action: "message.send_media";
      payload: { mediaType: string; mediaUrl: string; caption?: string };
    }
  | {
      action: "message.send_template";
      payload: {
        language: "pt_BR";
        templateName: string;
        variables: Record<string, string>;
      };
    }
  | {
      action: "fact.record";
      payload: { classification: string; summary: string };
    }
  | {
      action: "vehicle_interest.record";
      payload: { interestLevel: "high" | "low" | "medium"; vehicleRef: string };
    }
  | {
      action: "appointment.create";
      payload: { startsAt: string; summary?: string };
    }
  | { action: "opportunity.open"; payload: { summary: string } }
  | { action: "task.create"; payload: { dueAt?: string; title: string } }
  | { action: "handoff.request"; payload: { reason: string } }
  | { action: "conversation.summarize"; payload: { summary: string } };

export type ExternalBotActionStatus =
  | "accepted"
  | "pending_approval"
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
  actionClass: "effect" | "proposal";
  id: string;
  command: ExternalBotCommand;
  expectedAttendanceRevision: number;
  expectedRevision: number;
  idempotencyKey: string;
  requestDigest: string;
  status: ExternalBotActionStatus;
  createdAt: Date;
  updatedAt: Date;
  failureCode?: string;
};

export type ExternalBotProposalDecision = "approved" | "pending" | "rejected";

export type ExternalBotProposalRecord = ExternalBotScope & {
  actionId: string;
  command: ExternalBotCommand;
  decision: ExternalBotProposalDecision;
  decidedAt?: Date;
  decidedByUserId?: string;
  id: string;
  idempotencyKey: string;
  revision: number;
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
  actionClass: "effect" | "proposal";
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
