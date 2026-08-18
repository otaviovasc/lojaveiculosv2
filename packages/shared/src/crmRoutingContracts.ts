import { z } from "zod";
import {
  crmChannelConnectionSchema,
  crmChannels,
  crmConnectionCapabilities,
} from "./crmContracts.js";

export const crmExternalBotRouteModes = [
  "disabled",
  "inherit_store_default",
  "explicit_connection",
] as const;
export type CrmExternalBotRouteMode = (typeof crmExternalBotRouteModes)[number];

export const crmRoutingBlockedReasonCodes = [
  "capability_unsupported",
  "channel_incompatible",
  "connection_inactive",
  "connection_not_connected",
  "connection_not_found",
  "policy_not_configured",
  "route_disabled",
  "scope_mismatch",
] as const;
export type CrmRoutingBlockedReasonCode =
  (typeof crmRoutingBlockedReasonCodes)[number];

export const crmRoutingBlockedReasonSchema = z
  .object({
    code: z.enum(crmRoutingBlockedReasonCodes),
    message: z.string().trim().min(1),
    remediation: z.string().trim().min(1),
  })
  .strict();
export type CrmRoutingBlockedReason = z.infer<
  typeof crmRoutingBlockedReasonSchema
>;

export const crmRoutingConnectionSchema = crmChannelConnectionSchema
  .extend({
    active: z.boolean(),
    connected: z.boolean(),
  })
  .strict();
export type CrmRoutingConnectionDto = z.infer<
  typeof crmRoutingConnectionSchema
>;

export const crmResolvedRouteSchema = z
  .object({
    blocked: crmRoutingBlockedReasonSchema.nullable(),
    connection: crmRoutingConnectionSchema.nullable(),
    ready: z.boolean(),
    requiredCapabilities: z.array(z.enum(crmConnectionCapabilities)).readonly(),
  })
  .strict();
export type CrmResolvedRouteDto = z.infer<typeof crmResolvedRouteSchema>;

export const crmChannelRoutingSchema = z
  .object({
    channel: z.enum(crmChannels),
    externalBot: crmResolvedRouteSchema
      .extend({ mode: z.enum(crmExternalBotRouteModes) })
      .strict(),
    storeDefault: crmResolvedRouteSchema,
  })
  .strict();
export type CrmChannelRoutingDto = z.infer<typeof crmChannelRoutingSchema>;

export const crmRoutingPolicyReadSchema = z
  .object({
    channels: z.array(crmChannelRoutingSchema).readonly(),
    storeId: z.string().trim().min(1),
    tenantId: z.string().trim().min(1),
  })
  .strict();
export type CrmRoutingPolicyReadDto = z.infer<
  typeof crmRoutingPolicyReadSchema
>;

export const crmRoutingPolicyPatchSchema = z
  .object({
    channel: z.enum(crmChannels),
    defaultConnectionId: z.string().uuid().nullable(),
    externalBotConnectionId: z.string().uuid().nullable(),
    externalBotMode: z.enum(crmExternalBotRouteModes),
  })
  .strict()
  .superRefine((input, context) => {
    const explicit = input.externalBotMode === "explicit_connection";
    if (explicit === Boolean(input.externalBotConnectionId)) return;
    context.addIssue({
      code: "custom",
      message: explicit
        ? "externalBotConnectionId is required for explicit_connection mode"
        : "externalBotConnectionId is only allowed for explicit_connection mode",
      path: ["externalBotConnectionId"],
    });
  });
export type CrmRoutingPolicyPatchInput = z.infer<
  typeof crmRoutingPolicyPatchSchema
>;
