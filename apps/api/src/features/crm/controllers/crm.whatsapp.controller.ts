import type { Context, Hono } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import { whatsappAudit } from "./crm.whatsapp.audit.js";
import {
  whatsappAssignSessionSchema,
  whatsappCloseSessionSchema,
  whatsappCreateSessionSchema,
  whatsappMarkUnreadSchema,
  whatsappMessagesQuerySchema,
  whatsappSendTextSchema,
  whatsappSessionsQuerySchema,
} from "./crm.controller.schemas.js";
import type { CrmServices } from "./crmServices.js";
import {
  assertWhatsappRead,
  assertWhatsappWrite,
  createRepassesAuth,
  CrmWhatsappValidationError,
  handleWhatsapp,
  parseWhatsappJson,
  recordWhatsappAudit,
  readNumericParam,
} from "./crm.whatsapp.controller.support.js";

export type RegisterCrmWhatsappRoutesOptions = {
  createContext: (context: Context) => Promise<ServiceContext>;
  services: CrmServices;
};

export function registerCrmWhatsappRoutes(
  crmFeature: Hono,
  { createContext, services }: RegisterCrmWhatsappRoutesOptions,
) {
  crmFeature.get("/whatsapp/bootstrap", async (context) =>
    handleWhatsapp(context, async () => {
      const serviceContext = await createContext(context);
      const permission = assertWhatsappRead(serviceContext);
      const auth = createRepassesAuth(context);
      const [connections, agents] = await Promise.all([
        services.repassesCrm.getConnections(auth),
        services.repassesCrm.getAgents(auth),
      ]);

      serviceContext.logger.info("crm.whatsapp.bootstrap", {
        actorId: serviceContext.actor.id,
        requestId: serviceContext.requestId,
        storeId: serviceContext.storeId,
        tenantId: serviceContext.tenantId,
      });
      await recordWhatsappAudit(serviceContext, whatsappAudit.bootstrap(permission));

      return context.json({ agents, connections });
    }),
  );

  crmFeature.get("/whatsapp/sessions", async (context) =>
    handleWhatsapp(context, async () => {
      const parsed = whatsappSessionsQuerySchema.safeParse(context.req.query());
      if (!parsed.success) throw new CrmWhatsappValidationError();
      const serviceContext = await createContext(context);
      const permission = assertWhatsappRead(serviceContext);
      const sessions = await services.repassesCrm.listSessions(
        createRepassesAuth(context),
        parsed.data,
      );
      await recordWhatsappAudit(
        serviceContext,
        whatsappAudit.listSessions(permission, parsed.data),
      );
      return context.json(sessions);
    }),
  );

  crmFeature.post("/whatsapp/sessions", async (context) =>
    handleWhatsapp(context, async () => {
      const input = await parseWhatsappJson(context, whatsappCreateSessionSchema);
      const serviceContext = await createContext(context);
      const permission = assertWhatsappWrite(serviceContext);
      const result = await services.repassesCrm.createSession(
        createRepassesAuth(context),
        input,
      );
      await recordWhatsappAudit(
        serviceContext,
        whatsappAudit.createSession(permission, input),
      );
      return context.json(result, 201);
    }),
  );

  crmFeature.get("/whatsapp/messages/:sessionId", async (context) =>
    handleWhatsapp(context, async () => {
      const parsed = whatsappMessagesQuerySchema.safeParse(context.req.query());
      if (!parsed.success) throw new CrmWhatsappValidationError();
      const serviceContext = await createContext(context);
      const permission = assertWhatsappRead(serviceContext);
      const sessionId = readNumericParam(context, "sessionId");
      const messages = await services.repassesCrm.listMessages(
        createRepassesAuth(context),
        sessionId,
        parsed.data,
      );
      await recordWhatsappAudit(
        serviceContext,
        whatsappAudit.listMessages(permission, sessionId, parsed.data),
      );
      return context.json(messages);
    }),
  );

  crmFeature.post("/whatsapp/send/text", async (context) =>
    handleWhatsapp(context, async () => {
      const input = await parseWhatsappJson(context, whatsappSendTextSchema);
      const serviceContext = await createContext(context);
      const permission = assertWhatsappWrite(serviceContext);
      const message = await services.repassesCrm.sendText(
        createRepassesAuth(context),
        input,
      );
      await recordWhatsappAudit(
        serviceContext,
        whatsappAudit.sendText(permission, input.sessionId, input.text),
      );
      return context.json(message, 201);
    }),
  );

  registerSessionActions(crmFeature, { createContext, services });
}

function registerSessionActions(
  crmFeature: Hono,
  { createContext, services }: RegisterCrmWhatsappRoutesOptions,
) {
  crmFeature.post("/whatsapp/sessions/:sessionId/read", async (context) =>
    handleWhatsapp(context, async () => {
      const serviceContext = await createContext(context);
      const permission = assertWhatsappWrite(serviceContext);
      const sessionId = readNumericParam(context, "sessionId");
      const result = await services.repassesCrm.markSessionAsRead(
        createRepassesAuth(context),
        sessionId,
      );
      await recordWhatsappAudit(
        serviceContext,
        whatsappAudit.markRead(permission, sessionId),
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
      const result = await services.repassesCrm.markSessionAsUnread(
        createRepassesAuth(context),
        { ...input, sessionId },
      );
      await recordWhatsappAudit(
        serviceContext,
        whatsappAudit.markUnread(permission, sessionId, input),
      );
      return context.json(result);
    }),
  );

  crmFeature.post("/whatsapp/sessions/:sessionId/assign", async (context) =>
    handleWhatsapp(context, async () => {
      const input = await parseWhatsappJson(context, whatsappAssignSessionSchema);
      const serviceContext = await createContext(context);
      const permission = assertWhatsappWrite(serviceContext);
      const sessionId = readNumericParam(context, "sessionId");
      const session = await services.repassesCrm.assignSession(
        createRepassesAuth(context),
        { ...input, sessionId },
      );
      await recordWhatsappAudit(
        serviceContext,
        whatsappAudit.assignSession(permission, sessionId, input.agentId),
      );
      return context.json(session);
    }),
  );

  crmFeature.post("/whatsapp/sessions/:sessionId/close", async (context) =>
    handleWhatsapp(context, async () => {
      const input = await parseWhatsappJson(context, whatsappCloseSessionSchema);
      const serviceContext = await createContext(context);
      const permission = assertWhatsappWrite(serviceContext);
      const sessionId = readNumericParam(context, "sessionId");
      const session = await services.repassesCrm.closeSession(
        createRepassesAuth(context),
        { ...input, sessionId },
      );
      await recordWhatsappAudit(
        serviceContext,
        whatsappAudit.closeSession(permission, sessionId, input.mode),
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
        const session = await services.repassesCrm.toggleIntervention(
          createRepassesAuth(context),
          sessionId,
        );
        await recordWhatsappAudit(
          serviceContext,
          whatsappAudit.toggleIntervention(permission, sessionId),
        );
        return context.json(session);
      }),
  );
}
