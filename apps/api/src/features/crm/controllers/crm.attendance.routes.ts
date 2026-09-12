import type { Context, Hono } from "hono";
import { z } from "zod";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import { crmLeadOutcomeLossReasons } from "../../../domains/crm/ports/crmOutcomeRepository.js";
import {
  assertConversationManage,
  parseCrmMessagingJson,
} from "./crm.messaging.controller.support.js";
import { handleCrmMessaging } from "./crm.messaging.errors.js";
import type { CrmServices } from "./crmServices.js";
import { toConversationCycleCommandDto } from "./crm.conversationCycle.dto.js";

const commandId = z.string().trim().min(1).max(191);

export const crmAttendanceConclusionSchema = z.discriminatedUnion("outcome", [
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
]);

export function registerCrmAttendanceRoutes(
  crmFeature: Hono,
  options: {
    createContext: (context: Context) => Promise<ServiceContext>;
    services: CrmServices;
  },
) {
  crmFeature.post(
    "/conversation-cycles/:cycleId/attendance/conclusion",
    async (context) =>
      handleCrmMessaging(context, async () => {
        const input = await parseCrmMessagingJson(
          context,
          crmAttendanceConclusionSchema,
        );
        const serviceContext = await options.createContext(context);
        assertConversationManage(serviceContext);
        const cycleId = context.req.param("cycleId");
        const command =
          input.outcome === "follow_up"
            ? {
                commandId: input.commandId,
                outcome: input.outcome,
                ...(input.reminder ? { reminder: input.reminder } : {}),
                cycleId,
              }
            : {
                commandId: input.commandId,
                ...(input.note ? { note: input.note } : {}),
                outcome: input.outcome,
                reason: input.reason,
                cycleId,
              };
        const result = await options.services.concludeCrmAttendance(
          serviceContext,
          command,
        );
        return context.json(toConversationCycleCommandDto(result));
      }),
  );
}
