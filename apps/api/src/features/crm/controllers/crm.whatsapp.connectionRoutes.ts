import type { Context, Hono } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  whatsappCreateConnectionSchema,
  whatsappUpdateConnectionSchema,
} from "./crm.controller.schemas.js";
import {
  assertWhatsappList,
  parseWhatsappJson,
} from "./crm.whatsapp.controller.support.js";
import {
  CrmWhatsappValidationError,
  handleWhatsapp,
} from "./crm.whatsapp.errors.js";
import type { CrmServices } from "./crmServices.js";
import { registerCrmWhatsappConnectionSetupRoutes } from "./crm.whatsapp.connectionSetupRoutes.js";
import { readWebhookRequestBase } from "./crm.whatsapp.webhookRequestBase.js";

type RegisterCrmWhatsappConnectionRoutesOptions = {
  createContext: (context: Context) => Promise<ServiceContext>;
  services: CrmServices;
};

export function registerCrmWhatsappConnectionRoutes(
  crmFeature: Hono,
  { createContext, services }: RegisterCrmWhatsappConnectionRoutesOptions,
) {
  crmFeature.get("/channel-connections", async (context) =>
    handleWhatsapp(context, async () => {
      const serviceContext = await createContext(context);
      assertWhatsappList(serviceContext);
      const overview =
        await services.getWhatsappConnectionOverview(serviceContext);
      return context.json({
        ...overview,
        connections: overview.connections,
      });
    }),
  );

  crmFeature.post("/channel-connections", async (context) =>
    handleWhatsapp(context, async () => {
      const input = await parseWhatsappJson(
        context,
        whatsappCreateConnectionSchema,
      );
      const serviceContext = await createContext(context);
      const connection = await services.createWhatsappConnection(
        serviceContext,
        input.provider === "zapi"
          ? {
              displayName: input.displayName ?? "Z-API",
              instanceId: input.instanceId,
              instanceToken: input.instanceToken,
              provider: "zapi",
              webhookSetupTarget: readWebhookRequestBase(context),
            }
          : {
              displayName:
                input.displayName ??
                (input.provider === "composio_instagram"
                  ? "Instagram Oficial"
                  : "WhatsApp Oficial"),
              provider: input.provider,
            },
      );
      return context.json(connection, 201);
    }),
  );

  crmFeature.patch("/channel-connections/:connectionId", async (context) =>
    handleWhatsapp(context, async () => {
      const connectionId = context.req.param("connectionId");
      if (!connectionId) {
        throw new CrmWhatsappValidationError(
          "Route param connectionId is invalid.",
        );
      }
      const input = await parseWhatsappJson(
        context,
        whatsappUpdateConnectionSchema,
      );
      const serviceContext = await createContext(context);
      const connection = await services.updateWhatsappConnection(
        serviceContext,
        {
          ...(input.catalogPhone !== undefined
            ? { catalogPhone: input.catalogPhone }
            : {}),
          connectionId,
          ...(input.displayName ? { displayName: input.displayName } : {}),
          ...(input.purpose !== undefined ? { purpose: input.purpose } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
        },
      );
      return context.json(connection);
    }),
  );

  registerCrmWhatsappConnectionSetupRoutes(crmFeature, {
    createContext,
    services,
  });
}
