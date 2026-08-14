import type { Context, Hono } from "hono";
import { z } from "zod";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import { crmLeadOutcomeLossReasons } from "../../../domains/crm/ports/crmOutcomeRepository.js";
import {
  assertWhatsappClose,
  parseWhatsappJson,
} from "./crm.whatsapp.controller.support.js";
import { handleWhatsapp } from "./crm.whatsapp.errors.js";
import type { CrmServices } from "./crmServices.js";

const commandId = z.string().trim().min(1).max(191);

export const whatsappAttendanceConclusionSchema = z.discriminatedUnion(
  "outcome",
  [
    z
      .object({
        commandId,
        outcome: z.literal("follow_up"),
        reminder: z
          .object({ dueAt: z.iso.datetime({ offset: true }) })
          .strict()
          .optional(),
      })
      .strict(),
    z
      .object({
        commandId,
        note: z.string().trim().max(2000).optional(),
        outcome: z.literal("lost"),
        reason: z.enum(crmLeadOutcomeLossReasons),
      })
      .strict()
      .superRefine((value, context) => {
        if (value.reason === "other" && !value.note?.trim()) {
          context.addIssue({
            code: "custom",
            message: "note is required when reason is other",
            path: ["note"],
          });
        }
      }),
  ],
);

export function registerCrmWhatsappConclusionRoutes(
  crmFeature: Hono,
  options: {
    createContext: (context: Context) => Promise<ServiceContext>;
    services: CrmServices;
  },
) {
  crmFeature.post("/whatsapp/sessions/:sessionId/conclusion", async (context) =>
    handleWhatsapp(context, async () => {
      const input = await parseWhatsappJson(
        context,
        whatsappAttendanceConclusionSchema,
      );
      const serviceContext = await options.createContext(context);
      assertWhatsappClose(serviceContext);
      const sessionId = context.req.param("sessionId");
      const command =
        input.outcome === "follow_up"
          ? {
              commandId: input.commandId,
              outcome: input.outcome,
              ...(input.reminder ? { reminder: input.reminder } : {}),
              sessionId,
            }
          : {
              commandId: input.commandId,
              ...(input.note ? { note: input.note } : {}),
              outcome: input.outcome,
              reason: input.reason,
              sessionId,
            };
      const result = await options.services.concludeWhatsappAttendance(
        serviceContext,
        command,
      );
      return context.json(result);
    }),
  );
}
