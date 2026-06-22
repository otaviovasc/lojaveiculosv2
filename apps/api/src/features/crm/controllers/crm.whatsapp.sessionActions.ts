import type { Context, Hono } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  whatsappAssignSessionSchema,
  whatsappCloseSessionSchema,
  whatsappMarkUnreadSchema,
} from "./crm.controller.schemas.js";
import { whatsappAudit } from "./crm.whatsapp.audit.js";
import { readOptionalConnectionId } from "./crm.whatsapp.connectionScope.js";
import {
  assertWhatsappWrite,
  createRepassesAuth,
  handleWhatsapp,
  parseWhatsappJson,
  recordWhatsappMutation,
  readNumericParam,
} from "./crm.whatsapp.controller.support.js";
import type { CrmServices } from "./crmServices.js";

type RegisterSessionActionsOptions = {
  createContext: (context: Context) => Promise<ServiceContext>;
  services: CrmServices;
};

export function registerSessionActions(
  crmFeature: Hono,
  { createContext, services }: RegisterSessionActionsOptions,
) {
  crmFeature.post("/whatsapp/sessions/:sessionId/read", async (context) =>
    handleWhatsapp(context, async () => {
      const serviceContext = await createContext(context);
      const permission = assertWhatsappWrite(serviceContext);
      const sessionId = readNumericParam(context, "sessionId");
      const connectionId = readOptionalConnectionId(context);
      const audit = whatsappAudit.markRead(permission, sessionId);
      const result = await recordWhatsappMutation(serviceContext, audit, () =>
        services.repassesCrm.markSessionAsRead(
          createRepassesAuth(context, serviceContext, connectionId),
          sessionId,
        ),
      );
      return context.json(result);
    }),
  );

  crmFeature.post("/whatsapp/sessions/:sessionId/unread", async (context) =>
    handleWhatsapp(context, async () => {
      const input = await parseWhatsappJson(context, whatsappMarkUnreadSchema);
      const serviceContext = await createContext(context);
      const permission = assertWhatsappWrite(serviceContext);
      const sessionId = readNumericParam(context, "sessionId");
      const audit = whatsappAudit.markUnread(permission, sessionId, input);
      const { connectionId, ...repassesInput } = input;
      const result = await recordWhatsappMutation(serviceContext, audit, () =>
        services.repassesCrm.markSessionAsUnread(
          createRepassesAuth(context, serviceContext, connectionId),
          { ...repassesInput, sessionId },
        ),
      );
      return context.json(result);
    }),
  );

  crmFeature.post("/whatsapp/sessions/:sessionId/assign", async (context) =>
    handleWhatsapp(context, async () => {
      const input = await parseWhatsappJson(
        context,
        whatsappAssignSessionSchema,
      );
      const serviceContext = await createContext(context);
      const permission = assertWhatsappWrite(serviceContext);
      const sessionId = readNumericParam(context, "sessionId");
      const audit = whatsappAudit.assignSession(
        permission,
        sessionId,
        input.agentId,
      );
      const session = await recordWhatsappMutation(serviceContext, audit, () =>
        services.repassesCrm.assignSession(
          createRepassesAuth(context, serviceContext, input.connectionId),
          { agentId: input.agentId, sessionId },
        ),
      );
      return context.json(session);
    }),
  );

  crmFeature.post("/whatsapp/sessions/:sessionId/close", async (context) =>
    handleWhatsapp(context, async () => {
      const input = await parseWhatsappJson(
        context,
        whatsappCloseSessionSchema,
      );
      const serviceContext = await createContext(context);
      const permission = assertWhatsappWrite(serviceContext);
      const sessionId = readNumericParam(context, "sessionId");
      const audit = whatsappAudit.closeSession(
        permission,
        sessionId,
        input.mode,
      );
      const session = await recordWhatsappMutation(serviceContext, audit, () =>
        services.repassesCrm.closeSession(
          createRepassesAuth(context, serviceContext, input.connectionId),
          { mode: input.mode, sessionId },
        ),
      );
      return context.json(session);
    }),
  );

  crmFeature.post(
    "/whatsapp/sessions/:sessionId/toggle-intervention",
    async (context) =>
      handleWhatsapp(context, async () => {
        const serviceContext = await createContext(context);
        const permission = assertWhatsappWrite(serviceContext);
        const sessionId = readNumericParam(context, "sessionId");
        const connectionId = readOptionalConnectionId(context);
        const audit = whatsappAudit.toggleIntervention(permission, sessionId);
        const session = await recordWhatsappMutation(
          serviceContext,
          audit,
          () =>
            services.repassesCrm.toggleIntervention(
              createRepassesAuth(context, serviceContext, connectionId),
              sessionId,
            ),
        );
        return context.json(session);
      }),
  );
}
