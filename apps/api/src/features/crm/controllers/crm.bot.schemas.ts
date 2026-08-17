import { z } from "zod";
import { externalBotActionNames } from "../../../domains/crm/bot/externalBotModels.js";

const id = z.string().trim().min(1).max(128);
const scope = {
  connectionId: id,
  integrationId: id,
  storeId: id,
  tenantId: id,
  threadId: id,
  channel: z.enum(["instagram", "olx_chat", "whatsapp"]),
  provider: z.enum(["meta_cloud", "olx", "zapi"]),
  actionClass: z.enum(["effect", "proposal"]),
  modelVersion: id,
};

const commandSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("message.send"),
      payload: z.object({ text: z.string().trim().min(1).max(4_096) }).strict(),
    })
    .strict(),
  z
    .object({
      action: z.literal("fact.propose"),
      payload: z
        .object({
          classification: z.string().trim().min(1).max(80),
          summary: z.string().trim().min(1).max(1_000),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      action: z.literal("vehicle_interest.propose"),
      payload: z
        .object({
          interestLevel: z.enum(["low", "medium", "high"]),
          vehicleRef: id,
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      action: z.literal("opportunity.open"),
      payload: z
        .object({ summary: z.string().trim().min(1).max(1_000) })
        .strict(),
    })
    .strict(),
  z
    .object({
      action: z.literal("task.create"),
      payload: z
        .object({
          dueAt: z.string().datetime({ offset: true }).optional(),
          title: z.string().trim().min(1).max(300),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      action: z.literal("appointment.propose"),
      payload: z
        .object({
          startsAt: z.string().datetime({ offset: true }),
          summary: z.string().trim().max(1_000).optional(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      action: z.literal("handoff.request"),
      payload: z.object({ reason: z.string().trim().min(1).max(500) }).strict(),
    })
    .strict(),
  z
    .object({
      action: z.literal("conversation.summarize"),
      payload: z
        .object({ summary: z.string().trim().min(1).max(2_000) })
        .strict(),
    })
    .strict(),
]);

export const externalBotActionSchema = z
  .object({
    ...scope,
    capabilityGrant: z.string().trim().min(32).max(512),
    command: commandSchema,
    expectedRevision: z.number().int().nonnegative(),
    idempotencyKey: z.string().trim().min(8).max(128),
    requestDigest: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();

export const externalBotEventSchema = z
  .object({
    connectionId: id,
    integrationId: id,
    threadId: id,
    channel: z.enum(["instagram", "olx_chat", "whatsapp"]),
    provider: z.enum(["meta_cloud", "olx", "zapi"]),
    actionClass: z.enum(["effect", "proposal"]),
    modelVersion: id,
    allowedAction: z.enum(externalBotActionNames),
    authorizedCommand: commandSchema,
    expectedRevision: z.number().int().nonnegative(),
    idempotencyKey: z.string().trim().min(8).max(128),
    payload: z.record(z.string(), z.unknown()),
    type: z.enum([
      "connection_state_changed",
      "human_attendance_changed",
      "message_received",
      "thread_state_changed",
    ]),
  })
  .strict();
