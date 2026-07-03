import type { Context, Hono } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  whatsappAssignSessionSchema,
  whatsappToggleInterventionSchema,
} from "./crm.controller.schemas.js";
import {
  assertWhatsappAssign,
  assertWhatsappClose,
  assertWhatsappRead,
  assertWhatsappToggleIntervention,
  parseWhatsappJson,
} from "./crm.whatsapp.controller.support.js";
import {
  CrmWhatsappValidationError,
  handleWhatsapp,
} from "./crm.whatsapp.errors.js";
import type { CrmServices } from "./crmServices.js";

export type RegisterCrmWhatsappSessionRoutesOptions = {
  createContext: (context: Context) => Promise<ServiceContext>;
  services: CrmServices;
};

export function registerCrmWhatsappSessionRoutes(
  crmFeature: Hono,
  { createContext, services }: RegisterCrmWhatsappSessionRoutesOptions,
) {
  crmFeature.post("/whatsapp/sessions/:sessionId/assign", async (context) =>
    handleWhatsapp(context, async () => {
      const input = await parseWhatsappJson(
        context,
        whatsappAssignSessionSchema,
      );
      const serviceContext = await createContext(context);
      assertWhatsappAssign(serviceContext);
      const sessionId = context.req.param("sessionId");
      const session = await services.assignWhatsappSession(serviceContext, {
        assignedUserId: input.assignedUserId,
        sessionId,
      });
      return context.json(session);
    }),
  );

  crmFeature.post("/whatsapp/sessions/:sessionId/close", async (context) =>
    handleWhatsapp(context, async () => {
      const serviceContext = await createContext(context);
      assertWhatsappClose(serviceContext);
      const sessionId = context.req.param("sessionId");
      const session = await services.closeWhatsappSession(serviceContext, {
        sessionId,
      });
      return context.json(session);
    }),
  );

  crmFeature.post("/whatsapp/sessions/:sessionId/read", async (context) =>
    handleWhatsapp(context, async () =>
      setReadState(context, createContext, services, false),
    ),
  );

  crmFeature.post("/whatsapp/sessions/:sessionId/unread", async (context) =>
    handleWhatsapp(context, async () =>
      setReadState(context, createContext, services, true),
    ),
  );

  crmFeature.post(
    "/whatsapp/sessions/:sessionId/intervention",
    async (context) =>
      handleWhatsapp(context, async () => {
        const input = await parseWhatsappJson(
          context,
          whatsappToggleInterventionSchema,
        );
        const serviceContext = await createContext(context);
        assertWhatsappToggleIntervention(serviceContext);
        const session = await services.toggleWhatsappIntervention(
          serviceContext,
          {
            enabled: input.enabled,
            sessionId: context.req.param("sessionId"),
          },
        );
        return context.json(session);
      }),
  );
}

async function setReadState(
  context: Context,
  createContext: (context: Context) => Promise<ServiceContext>,
  services: CrmServices,
  unread: boolean,
) {
  const serviceContext = await createContext(context);
  assertWhatsappRead(serviceContext);
  const sessionId = context.req.param("sessionId");
  if (!sessionId) throw new CrmWhatsappValidationError();
  const session = await services.markWhatsappSessionReadState(serviceContext, {
    sessionId,
    unread,
  });
  return context.json(session);
}
