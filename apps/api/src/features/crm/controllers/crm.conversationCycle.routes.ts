import type { Context, Hono } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  crmAssignConversationCycleSchema,
  crmConversationCycleCommandSchema,
  crmSetConversationAttendanceSchema,
} from "./crm.controller.schemas.js";
import {
  assertConversationAssign,
  assertConversationManage,
  assertConversationRead,
  parseCrmMessagingJson,
} from "./crm.messaging.controller.support.js";
import {
  CrmMessagingValidationError,
  handleCrmMessaging,
} from "./crm.messaging.errors.js";
import type { CrmServices } from "./crmServices.js";
import { toConversationCycleCommandDto } from "./crm.conversationCycle.dto.js";

export type RegisterCrmConversationCycleRoutesOptions = {
  createContext: (context: Context) => Promise<ServiceContext>;
  services: CrmServices;
};

export function registerCrmConversationCycleRoutes(
  crmFeature: Hono,
  { createContext, services }: RegisterCrmConversationCycleRoutesOptions,
) {
  crmFeature.post(
    "/conversation-cycles/:cycleId/actions/assign",
    async (context) =>
      handleCrmMessaging(context, async () => {
        const input = await parseCrmMessagingJson(
          context,
          crmAssignConversationCycleSchema,
        );
        const serviceContext = await createContext(context);
        assertConversationAssign(serviceContext);
        const cycleId = context.req.param("cycleId");
        const command = await services.assignConversationCycle(serviceContext, {
          assignedUserId: input.assignedUserId,
          commandId: input.commandId,
          cycleId,
        });
        return context.json(toConversationCycleCommandDto(command));
      }),
  );

  crmFeature.post(
    "/conversation-cycles/:cycleId/actions/close",
    async (context) =>
      handleCrmMessaging(context, async () => {
        const serviceContext = await createContext(context);
        assertConversationManage(serviceContext);
        const input = await parseCrmMessagingJson(
          context,
          crmConversationCycleCommandSchema,
        );
        const cycleId = context.req.param("cycleId");
        const command = await services.closeConversationCycle(serviceContext, {
          commandId: input.commandId,
          cycleId,
        });
        return context.json(toConversationCycleCommandDto(command));
      }),
  );

  crmFeature.post(
    "/conversation-cycles/:cycleId/actions/read",
    async (context) =>
      handleCrmMessaging(context, async () =>
        setReadState(context, createContext, services, false),
      ),
  );

  crmFeature.post(
    "/conversation-cycles/:cycleId/actions/unread",
    async (context) =>
      handleCrmMessaging(context, async () =>
        setReadState(context, createContext, services, true),
      ),
  );

  crmFeature.post(
    "/conversation-cycles/:cycleId/actions/archive",
    async (context) =>
      handleCrmMessaging(context, async () =>
        runLifecycleAction(context, createContext, services, "archive"),
      ),
  );

  crmFeature.post(
    "/conversation-cycles/:cycleId/actions/pin",
    async (context) =>
      handleCrmMessaging(context, async () =>
        runLifecycleAction(context, createContext, services, "pin"),
      ),
  );

  crmFeature.post(
    "/conversation-cycles/:cycleId/actions/delete",
    async (context) =>
      handleCrmMessaging(context, async () =>
        runLifecycleAction(context, createContext, services, "delete"),
      ),
  );

  crmFeature.post("/conversation-cycles/:cycleId/attendance", async (context) =>
    handleCrmMessaging(context, async () => {
      const input = await parseCrmMessagingJson(
        context,
        crmSetConversationAttendanceSchema,
      );
      const serviceContext = await createContext(context);
      assertConversationManage(serviceContext);
      const command = await services.setConversationAttendance(serviceContext, {
        enabled: input.enabled,
        commandId: input.commandId,
        cycleId: context.req.param("cycleId"),
      });
      return context.json(toConversationCycleCommandDto(command));
    }),
  );
}

async function runLifecycleAction(
  context: Context,
  createContext: (context: Context) => Promise<ServiceContext>,
  services: CrmServices,
  action: "archive" | "delete" | "pin",
) {
  const serviceContext = await createContext(context);
  assertConversationManage(serviceContext);
  const input = await parseCrmMessagingJson(
    context,
    crmConversationCycleCommandSchema,
  );
  const cycleId = context.req.param("cycleId");
  if (!cycleId) throw new CrmMessagingValidationError();
  const commandInput = { commandId: input.commandId, cycleId };
  const command =
    action === "archive"
      ? await services.archiveConversationCycle(serviceContext, commandInput)
      : action === "pin"
        ? await services.pinConversationCycle(serviceContext, commandInput)
        : await services.deleteConversationCycle(serviceContext, commandInput);
  return context.json(toConversationCycleCommandDto(command));
}

async function setReadState(
  context: Context,
  createContext: (context: Context) => Promise<ServiceContext>,
  services: CrmServices,
  unread: boolean,
) {
  const serviceContext = await createContext(context);
  assertConversationRead(serviceContext);
  const input = await parseCrmMessagingJson(
    context,
    crmConversationCycleCommandSchema,
  );
  const cycleId = context.req.param("cycleId");
  if (!cycleId) throw new CrmMessagingValidationError();
  const command = await services.markConversationCycleReadState(
    serviceContext,
    { commandId: input.commandId, cycleId, unread },
  );
  return context.json(toConversationCycleCommandDto(command));
}
