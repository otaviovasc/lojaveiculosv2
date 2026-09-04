import { z } from "zod";

/** Server-owned vocabulary shared by the API and CRM frontend. */
export const crmChannels = ["whatsapp", "instagram", "olx_chat"] as const;
export type CrmChannel = (typeof crmChannels)[number];

export const crmProviders = ["meta_cloud", "zapi", "uazapi", "olx"] as const;
export type CrmProvider = (typeof crmProviders)[number];

export const crmCredentialBrokers = ["direct", "composio"] as const;
export type CrmCredentialBroker = (typeof crmCredentialBrokers)[number];

export const crmConnectionStates = [
  "sandbox",
  "active",
  "paused",
  "disconnected",
  "error",
  "archived",
] as const;
export type CrmConnectionState = (typeof crmConnectionStates)[number];

export const crmConnectionPurposes = ["ui_demo"] as const;
export type CrmConnectionPurpose = (typeof crmConnectionPurposes)[number];

export const crmConnectionCapabilities = [
  "catalog",
  "delete",
  "inbound",
  "outbound",
  "reactions",
  "text",
  "media",
  "templates",
  "scheduling",
  "conversation_start",
] as const;
export type CrmConnectionCapability =
  (typeof crmConnectionCapabilities)[number];

export const crmConnectionReadinessReasonCodes = [
  "not_authorized",
  "pending_webhook",
  "disconnected",
  "paused",
  "provider_error",
  "missing_capability",
  "ready",
] as const;

export const crmConnectionRoutingStatuses = [
  "ready",
  "preserved",
  "deferred",
] as const;
export type CrmConnectionRoutingStatus =
  (typeof crmConnectionRoutingStatuses)[number];

export const crmConnectionReadinessSchema = z
  .object({
    ready: z.boolean(),
    reasonCode: z.enum(crmConnectionReadinessReasonCodes).nullable(),
    reason: z.string().nullable(),
  })
  .strict();
export type CrmConnectionReadiness = z.infer<
  typeof crmConnectionReadinessSchema
>;

export const crmChannelConnectionSchema = z
  .object({
    id: z.string().trim().min(1),
    channel: z.enum(crmChannels),
    provider: z.enum(crmProviders),
    revision: z.number().int().nonnegative().optional(),
    displayName: z.string().trim().min(1),
    state: z.enum(crmConnectionStates),
    readiness: crmConnectionReadinessSchema,
    capabilities: z.array(z.enum(crmConnectionCapabilities)).readonly(),
    isDefault: z.boolean(),
    phoneNumber: z.string().nullable().optional(),
    memberUserIds: z.array(z.string()).readonly().optional(),
    purpose: z.enum(crmConnectionPurposes).optional(),
    routingStatus: z.enum(crmConnectionRoutingStatuses).optional(),
  })
  .strict();
export type CrmChannelConnectionDto = z.infer<
  typeof crmChannelConnectionSchema
>;

export const externalBotActionRegistry = [
  "message.send_text",
  "message.send_media",
  "message.send_template",
  "conversation.summarize",
  "fact.record",
  "vehicle_interest.record",
  "handoff.request",
  "opportunity.open",
  "task.create",
  "appointment.create",
] as const;
export type ExternalBotAction = (typeof externalBotActionRegistry)[number];

export const externalBotPolicyModes = ["auto", "proposal", "disabled"] as const;
export type ExternalBotPolicyMode = (typeof externalBotPolicyModes)[number];

export type ExternalBotPolicyKey = {
  tenantId: string;
  storeId: string;
  channel: CrmChannel;
  action: ExternalBotAction;
};
