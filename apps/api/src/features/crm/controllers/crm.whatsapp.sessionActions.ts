import type { Context, Hono } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  whatsappAssignSessionSchema,
  whatsappCloseSessionSchema,
  whatsappMarkUnreadSchema,
} from "./crm.controller.schemas.js";
import { whatsappAudit } from "./crm.whatsapp.audit.js";
import {
  readOptionalConnectionId,
  resolveWhatsappConnectionScope,
} from "./crm.whatsapp.connectionScope.js";
import {
  assertWhatsappAssign,
  assertWhatsappClose,
  assertWhatsappRead,
  assertWhatsappToggleIntervention,
  parseWhatsappJson,
  recordWhatsappMutation,
  readNumericParam,
} from "./crm.whatsapp.controller.support.js";
import { handleWhatsapp } from "./crm.whatsapp.errors.js";
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
      const permission = assertWhatsappRead(serviceContext);
      const sessionId = readNumericParam(context, "sessionId");
      const connectionId = readOptionalConnectionId(context);
      const audit = whatsappAudit.markRead(permission, sessionId);
      const scope = await resolveWhatsappConnectionScope({
        context,
        repassesCrm: services.repassesCrm,
        requestedConnectionId: connectionId,
        serviceContext,
      });
      const result = await recordWhatsappMutation(serviceContext, audit, () =>
        services.repassesCrm.markSessionAsRead(scope.auth, sessionId),
      );
      return context.json(result);
    }),
  );

  crmFeature.post("/whatsapp/sessions/:sessionId/unread", async (context) =>
    handleWhatsapp(context, async () => {
      const input = await parseWhatsappJson(context, whatsappMarkUnreadSchema);
      const serviceContext = await createContext(context);
      const permission = assertWhatsappRead(serviceContext);
      const sessionId = readNumericParam(context, "sessionId");
      const audit = whatsappAudit.markUnread(permission, sessionId, input);
      const { connectionId, ...repassesInput } = input;
      const scope = await resolveWhatsappConnectionScope({
        context,
        repassesCrm: services.repassesCrm,
        requestedConnectionId: connectionId,
        serviceContext,
      });
      const result = await recordWhatsappMutation(serviceContext, audit, () =>
        services.repassesCrm.markSessionAsUnread(scope.auth, {
          ...repassesInput,
          sessionId,
        }),
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
      const permission = assertWhatsappAssign(serviceContext);
      const sessionId = readNumericParam(context, "sessionId");
      const audit = whatsappAudit.assignSession(
        permission,
        sessionId,
        input.agentId,
      );
      const scope = await resolveWhatsappConnectionScope({
        context,
        repassesCrm: services.repassesCrm,
        requestedConnectionId: input.connectionId,
        serviceContext,
      });
      const session = await recordWhatsappMutation(serviceContext, audit, () =>
        services.repassesCrm.assignSession(scope.auth, {
          agentId: input.agentId,
          sessionId,
        }),
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
      const permission = assertWhatsappClose(serviceContext);
      const sessionId = readNumericParam(context, "sessionId");
      const audit = whatsappAudit.closeSession(
        permission,
        sessionId,
        input.mode,
      );
      const scope = await resolveWhatsappConnectionScope({
        context,
        repassesCrm: services.repassesCrm,
        requestedConnectionId: input.connectionId,
        serviceContext,
      });
      const session = await recordWhatsappMutation(serviceContext, audit, () =>
        services.repassesCrm.closeSession(scope.auth, {
          mode: input.mode,
          sessionId,
        }),
      );
      return context.json(session);
    }),
  );

  crmFeature.post(
    "/whatsapp/sessions/:sessionId/toggle-intervention",
    async (context) =>
      handleWhatsapp(context, async () => {
        const serviceContext = await createContext(context);
        const permission = assertWhatsappToggleIntervention(serviceContext);
        const sessionId = readNumericParam(context, "sessionId");
        const connectionId = readOptionalConnectionId(context);
        const audit = whatsappAudit.toggleIntervention(permission, sessionId);
        const scope = await resolveWhatsappConnectionScope({
          context,
          repassesCrm: services.repassesCrm,
          requestedConnectionId: connectionId,
          serviceContext,
        });
        const session = await recordWhatsappMutation(
          serviceContext,
          audit,
          () => services.repassesCrm.toggleIntervention(scope.auth, sessionId),
        );
        return context.json(session);
      }),
  );
}
