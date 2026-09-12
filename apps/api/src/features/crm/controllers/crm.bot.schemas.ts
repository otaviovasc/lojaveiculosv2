import { z } from "zod";
import { crmChannels, crmProviders } from "@lojaveiculosv2/shared";
import type { ExternalBotCommand } from "../../../domains/crm/bot/externalBotModels.js";

type CommandPayload<Action extends ExternalBotCommand["action"]> = Extract<
  ExternalBotCommand,
  { action: Action }
>["payload"];

const id = z.string().trim().min(1).max(128);
const scope = {
  connectionId: id,
  integrationId: id,
  storeId: id,
  tenantId: id,
  threadId: id,
  channel: z.enum(crmChannels),
  provider: z.enum(crmProviders),
  modelVersion: id,
};

const commandSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("message.send_text"),
      payload: z.object({ text: z.string().trim().min(1).max(4_096) }).strict(),
    })
    .strict(),
  z
    .object({
      action: z.literal("message.send_media"),
      payload: z
        .object({
          mediaType: z.string().trim().min(1).max(80),
          mediaUrl: z.string().url().max(2_000),
          caption: z.string().trim().max(4_096).optional(),
        })
        .strict()
        .transform((payload): CommandPayload<"message.send_media"> => ({
          mediaType: payload.mediaType,
          mediaUrl: payload.mediaUrl,
          ...(payload.caption === undefined
            ? {}
            : { caption: payload.caption }),
        })),
    })
    .strict(),
  z
    .object({
      action: z.literal("message.send_template"),
      payload: z
        .object({
          language: z.literal("pt_BR"),
          templateName: z.string().trim().min(1).max(160),
          variables: z.record(z.string(), z.string()).default({}),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      action: z.literal("fact.record"),
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
      action: z.literal("vehicle_interest.record"),
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
      action: z.literal("appointment.create"),
      payload: z
        .object({
          startsAt: z.string().datetime({ offset: true }),
          summary: z.string().trim().max(1_000).optional(),
        })
        .strict()
        .transform((payload): CommandPayload<"appointment.create"> => ({
          startsAt: payload.startsAt,
          ...(payload.summary === undefined
            ? {}
            : { summary: payload.summary }),
        })),
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
        .strict()
        .transform((payload): CommandPayload<"task.create"> => ({
          ...(payload.dueAt === undefined ? {} : { dueAt: payload.dueAt }),
          title: payload.title,
        })),
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
    expectedAttendanceRevision: z.number().int().nonnegative(),
    expectedRevision: z.number().int().nonnegative(),
    idempotencyKey: z.string().trim().min(8).max(128),
    requestDigest: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
