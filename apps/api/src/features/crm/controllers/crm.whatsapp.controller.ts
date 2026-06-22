import type { Context, Hono } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  whatsappCreateSessionSchema,
  whatsappMessagesQuerySchema,
  whatsappSendTextSchema,
  whatsappSessionsQuerySchema,
} from "./crm.controller.schemas.js";
import { whatsappAudit } from "./crm.whatsapp.audit.js";
import {
  normalizeWhatsappConnections,
  selectScopedConnection,
} from "./crm.whatsapp.connectionScope.js";
import {
  assertWhatsappRead,
  assertWhatsappWrite,
  createRepassesAuth,
  CrmWhatsappValidationError,
  handleWhatsapp,
  parseWhatsappJson,
  recordWhatsappAudit,
  recordWhatsappMutation,
  readNumericParam,
} from "./crm.whatsapp.controller.support.js";
import { registerSessionActions } from "./crm.whatsapp.sessionActions.js";
import type { CrmServices } from "./crmServices.js";

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
      const auth = createRepassesAuth(context, serviceContext);
      const rawConnections = await services.repassesCrm.getConnections(auth);
      const connections = normalizeWhatsappConnections(rawConnections);
      const selectedConnection = selectScopedConnection(connections, context);
      const scopedAuth = createRepassesAuth(
        context,
        serviceContext,
        selectedConnection?.id,
      );
      const [authContext, agents] = selectedConnection
        ? await Promise.all([
            services.repassesCrm.getAuthContext(scopedAuth),
            services.repassesCrm.getAgents(scopedAuth),
          ])
        : [{ canAssignSessions: false, connectionId: null }, { agents: [] }];

      serviceContext.logger.info("crm.whatsapp.bootstrap", {
        actorId: serviceContext.actor.id,
        repassesConnectionId: selectedConnection?.id ?? null,
        requestId: serviceContext.requestId,
        storeId: serviceContext.storeId,
        tenantId: serviceContext.tenantId,
      });
      await recordWhatsappAudit(
        serviceContext,
        whatsappAudit.bootstrap(permission),
      );

      return context.json({
        agents,
        connections: selectedConnection ? [selectedConnection] : [],
        scope: {
          canAssignSessions:
            selectedConnection?.id === authContext.connectionId &&
            authContext.canAssignSessions,
          connectionId: selectedConnection?.id ?? null,
        },
      });
    }),
  );

  crmFeature.get("/whatsapp/sessions", async (context) =>
    handleWhatsapp(context, async () => {
      const parsed = whatsappSessionsQuerySchema.safeParse(context.req.query());
      if (!parsed.success) throw new CrmWhatsappValidationError();
      const serviceContext = await createContext(context);
      const permission = assertWhatsappRead(serviceContext);
      const sessions = await services.repassesCrm.listSessions(
        createRepassesAuth(context, serviceContext, parsed.data.connectionId),
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
      const input = await parseWhatsappJson(
        context,
        whatsappCreateSessionSchema,
      );
      const serviceContext = await createContext(context);
      const permission = assertWhatsappWrite(serviceContext);
      const audit = whatsappAudit.createSession(permission, input);
      const result = await recordWhatsappMutation(serviceContext, audit, () =>
        services.repassesCrm.createSession(
          createRepassesAuth(context, serviceContext, input.connectionId),
          input,
        ),
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
      const { connectionId, ...messageQuery } = parsed.data;
      const messages = await services.repassesCrm.listMessages(
        createRepassesAuth(context, serviceContext, connectionId),
        sessionId,
        messageQuery,
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
      const audit = whatsappAudit.sendText(
        permission,
        input.sessionId,
        input.text,
      );
      const { connectionId, ...repassesInput } = input;
      const message = await recordWhatsappMutation(serviceContext, audit, () =>
        services.repassesCrm.sendText(
          createRepassesAuth(context, serviceContext, connectionId),
          repassesInput,
        ),
      );
      return context.json(message, 201);
    }),
  );

  registerSessionActions(crmFeature, { createContext, services });
}
