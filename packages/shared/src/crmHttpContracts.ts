import { z } from "zod";
import {
  crmChannelConnectionSchema,
  crmChannels,
  crmCredentialBrokers,
  crmProviders,
} from "./crmContracts.js";

const nonEmptyString = z.string().trim().min(1);
const nullableString = z.string().nullable();
const optionalNullableString = nullableString.optional();
const nonNegativeInteger = z.number().int().nonnegative();

export const crmConnectionLiveStatusSchema = z.union([
  z
    .object({
      checkedAt: nonEmptyString,
      connected: z.boolean(),
      connectedPhone: nullableString,
      providerStatus: z.enum(["connected", "disconnected", "unknown"]),
      smartphoneConnected: z.boolean().nullable(),
    })
    .strict(),
  z
    .object({
      checkedAt: nonEmptyString,
      connected: z.null(),
      connectedPhone: z.null(),
      errorMessage: nonEmptyString,
      providerStatus: z.literal("error"),
      smartphoneConnected: z.null(),
    })
    .strict(),
]);
export type CrmConnectionLiveStatus = z.infer<
  typeof crmConnectionLiveStatusSchema
>;

export const crmConnectionAllowanceSchema = z
  .object({
    limit: nonNegativeInteger,
    remaining: nonNegativeInteger,
    used: nonNegativeInteger,
  })
  .strict();
export type CrmConnectionAllowance = z.infer<
  typeof crmConnectionAllowanceSchema
>;

export const crmConnectionBillingStateSchema = z
  .object({
    code: z.literal("BILLING_CONTRACT_UNAVAILABLE").nullable(),
    status: z.enum(["available", "unavailable"]),
  })
  .strict();
export type CrmConnectionBillingState = z.infer<
  typeof crmConnectionBillingStateSchema
>;

export const crmAvailableSetupSchema = z
  .object({
    broker: z.enum(crmCredentialBrokers),
    channel: z.enum(crmChannels),
    provider: z.enum(crmProviders),
  })
  .strict();
export type CrmAvailableSetup = z.infer<typeof crmAvailableSetupSchema>;

export const crmWhatsappZapiSetupStateSchema = z
  .object({
    attemptCount: nonNegativeInteger,
    configuredAt: nullableString,
    lastErrorCode: nullableString,
    leaseExpiresAt: nullableString,
    leaseOwner: nullableString,
    requestedAt: nonEmptyString,
    requiredTypes: z.array(nonEmptyString).readonly(),
    status: z.enum(["configured", "configuring", "failed", "partial"]),
    succeededTypes: z.array(nonEmptyString).readonly(),
    supportCode: nonEmptyString,
    updatedAt: nonEmptyString,
    version: z.literal(2),
  })
  .strict();
export type CrmWhatsappZapiSetupState = z.infer<
  typeof crmWhatsappZapiSetupStateSchema
>;

export const crmConnectionOverviewItemSchema = crmChannelConnectionSchema
  .extend({
    live: crmConnectionLiveStatusSchema.optional(),
    setup: crmWhatsappZapiSetupStateSchema.nullable().optional(),
  })
  .strict();
export type CrmConnectionOverviewItem = z.infer<
  typeof crmConnectionOverviewItemSchema
>;

export const crmConnectionOverviewSchema = z
  .object({
    allowance: crmConnectionAllowanceSchema,
    availableSetups: z.array(crmAvailableSetupSchema),
    billingState: crmConnectionBillingStateSchema.optional(),
    connections: z.array(crmConnectionOverviewItemSchema),
  })
  .strict();
export type CrmConnectionOverview = z.infer<typeof crmConnectionOverviewSchema>;

export const crmConversationCycleStatuses = [
  "ACTIVE",
  "COMPLETED",
  "EXPIRED",
  "HUMAN_TAKEOVER",
  "MINIBOT_ACTIVE",
] as const;
export type CrmConversationCycleStatus =
  (typeof crmConversationCycleStatuses)[number];

export const crmHumanAttendanceStates = [
  "IN_HUMAN_SERVICE",
  "WAITING_HUMAN",
] as const;
export type CrmHumanAttendanceState = (typeof crmHumanAttendanceStates)[number];

export const crmMessageSenderOrigins = [
  "customer",
  "human_crm",
  "human_channel",
  "external_bot",
  "system",
  "unknown",
] as const;
export const crmMessageSenderOriginSchema = z.enum(crmMessageSenderOrigins);
export type CrmMessageSenderOrigin = z.infer<
  typeof crmMessageSenderOriginSchema
>;

export const crmTagDtoSchema = z
  .object({
    color: z.string(),
    emoji: optionalNullableString,
    id: nonEmptyString,
    name: nonEmptyString,
    sortOrder: nonNegativeInteger.optional(),
  })
  .strict();
export type CrmTagDto = z.infer<typeof crmTagDtoSchema>;

export const crmConversationCycleSchema = z
  .object({
    assignedMember: z
      .object({
        email: nullableString,
        id: z.union([nonEmptyString, nonNegativeInteger]),
        name: nonEmptyString,
        role: nonEmptyString,
      })
      .strict()
      .nullable()
      .optional(),
    assignedUserId: optionalNullableString,
    channel: z.enum(crmChannels),
    connection: crmChannelConnectionSchema.nullable().optional(),
    customerDisplayName: optionalNullableString,
    customerPhone: optionalNullableString,
    humanAttendanceChangedAt: optionalNullableString,
    humanAttendanceState: z
      .enum(crmHumanAttendanceStates)
      .nullable()
      .optional(),
    humanAttendanceStateVersion: nonNegativeInteger.nullable().optional(),
    humanHandlingStartedAt: optionalNullableString,
    id: nonEmptyString,
    interventionHistoryStartedAt: optionalNullableString,
    interventionId: optionalNullableString,
    lastCustomerReadAt: optionalNullableString,
    lastMessageAt: optionalNullableString,
    lastMessageContent: optionalNullableString,
    lastReadAt: optionalNullableString,
    leadId: optionalNullableString,
    metadata: z.record(z.string(), z.unknown()).optional(),
    profilePhotoUrl: optionalNullableString,
    revision: nonNegativeInteger,
    status: z.enum(crmConversationCycleStatuses),
    tags: z.array(crmTagDtoSchema).optional(),
    unreadCount: nonNegativeInteger.optional(),
    vehicle: z
      .object({
        id: z.union([nonEmptyString, nonNegativeInteger]).optional(),
        mainPhotoUrl: optionalNullableString,
        title: optionalNullableString,
      })
      .strict()
      .nullable()
      .optional(),
  })
  .strict();
export type CrmConversationCycleDto = z.infer<
  typeof crmConversationCycleSchema
>;

export const crmMessageDirections = ["INBOUND", "OUTBOUND"] as const;
export const crmMessageSenderTypes = [
  "AI",
  "CUSTOMER",
  "HUMAN",
  "SYSTEM",
] as const;
export const crmMessageStatuses = [
  "DELIVERED",
  "FAILED",
  "PENDING",
  "READ",
  "SENT",
] as const;
export const crmMessageTypes = [
  "AUDIO",
  "CATALOG",
  "CONTACT",
  "DOCUMENT",
  "IMAGE",
  "INTERACTIVE",
  "LOCATION",
  "STICKER",
  "TEMPLATE",
  "TEXT",
  "VIDEO",
] as const;

export const crmMessageSchema = z
  .object({
    channel: z.enum(crmChannels),
    clientRequestId: nonEmptyString.max(191).optional(),
    content: z.string(),
    createdAt: nonEmptyString,
    deletedAt: optionalNullableString,
    direction: z.enum(crmMessageDirections),
    externalId: optionalNullableString,
    id: nonEmptyString,
    mediaType: optionalNullableString,
    mediaUrl: optionalNullableString,
    metadata: z.record(z.string(), z.unknown()).optional(),
    providerTimestamp: optionalNullableString,
    senderOrigin: crmMessageSenderOriginSchema,
    senderType: z.enum(crmMessageSenderTypes),
    senderUser: z
      .object({ id: nonEmptyString, name: nonEmptyString })
      .strict()
      .optional(),
    status: z.enum(crmMessageStatuses),
    type: z.enum(crmMessageTypes),
  })
  .strict();
export type CrmMessageDto = z.infer<typeof crmMessageSchema>;

export const crmConversationCycleListResponseSchema = z.array(
  crmConversationCycleSchema,
);
export type CrmConversationCycleListResponse = z.infer<
  typeof crmConversationCycleListResponseSchema
>;

export const crmMessageListResponseSchema = z.array(crmMessageSchema);
export type CrmMessageListResponse = z.infer<
  typeof crmMessageListResponseSchema
>;

const crmConversationCycleFilterCountsSchema = z
  .object({
    all: nonNegativeInteger,
    fresh: nonNegativeInteger,
    mine: nonNegativeInteger,
    others: nonNegativeInteger,
    unassigned: nonNegativeInteger,
  })
  .strict();
const crmConversationCycleStatusCountsSchema = z
  .object({
    ACTIVE: nonNegativeInteger,
    COMPLETED: nonNegativeInteger,
    EXPIRED: nonNegativeInteger,
    HUMAN_TAKEOVER: nonNegativeInteger,
    MINIBOT_ACTIVE: nonNegativeInteger,
  })
  .strict();

export const crmConversationCycleCountsResponseSchema = z
  .object({
    assignees: z.array(
      z
        .object({
          assigneeId: nonEmptyString,
          count: nonNegativeInteger,
        })
        .strict(),
    ),
    filters: crmConversationCycleFilterCountsSchema,
    inHumanService: nonNegativeInteger,
    statuses: crmConversationCycleStatusCountsSchema,
    total: nonNegativeInteger,
    unread: nonNegativeInteger,
    waitingHuman: nonNegativeInteger,
  })
  .strict();
export type CrmConversationCycleCountsResponse = z.infer<
  typeof crmConversationCycleCountsResponseSchema
>;

/** Fields returned by every successful CRM command endpoint. */
export const crmHttpSuccessEnvelopeSchema = z
  .object({
    code: nonEmptyString,
    message: nonEmptyString,
    providerOperationId: nonEmptyString.nullable().optional(),
    requestId: nonEmptyString,
  })
  .strict();
export type CrmHttpSuccessEnvelope = z.infer<
  typeof crmHttpSuccessEnvelopeSchema
>;

/** Stable, safe error body shared by the CRM API and its clients. */
export const crmHttpErrorEnvelopeSchema = z
  .object({
    code: nonEmptyString,
    details: z.record(z.string(), z.unknown()).optional(),
    message: nonEmptyString,
    providerOperationId: nonEmptyString.nullable().optional(),
    requestId: nonEmptyString,
    retryable: z.boolean(),
  })
  .strict();
export type CrmHttpErrorEnvelope = z.infer<typeof crmHttpErrorEnvelopeSchema>;
