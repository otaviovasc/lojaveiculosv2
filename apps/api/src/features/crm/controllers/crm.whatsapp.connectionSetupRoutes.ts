import type { Context, Hono } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import { whatsappComposioSenderSchema } from "./crm.controller.schemas.js";
import { whatsappZapiPairingCodeSchema } from "./crm.whatsapp.connectionSchemas.js";
import { parseWhatsappJson } from "./crm.whatsapp.controller.support.js";
import {
  CrmWhatsappValidationError,
  handleWhatsapp,
} from "./crm.whatsapp.errors.js";
import type { CrmServices } from "./crmServices.js";

type ConnectionSetupRouteOptions = {
  createContext: (context: Context) => Promise<ServiceContext>;
  services: CrmServices;
};

export function registerCrmWhatsappConnectionSetupRoutes(
  crmFeature: Hono,
  { createContext, services }: ConnectionSetupRouteOptions,
) {
  crmFeature.post(
    "/whatsapp/connections/:connectionId/zapi/pairing/qr",
    async (context) =>
      handleWhatsapp(context, async () => {
        const connectionId = readConnectionId(
          context.req.param("connectionId"),
        );
        const serviceContext = await createContext(context);
        return context.json(
          await services.requestZapiPairingQr(serviceContext, { connectionId }),
        );
      }),
  );

  crmFeature.post(
    "/whatsapp/connections/:connectionId/zapi/pairing/code",
    async (context) =>
      handleWhatsapp(context, async () => {
        const connectionId = readConnectionId(
          context.req.param("connectionId"),
        );
        const input = await parseWhatsappJson(
          context,
          whatsappZapiPairingCodeSchema,
        );
        const serviceContext = await createContext(context);
        return context.json(
          await services.requestZapiPairingCode(serviceContext, {
            connectionId,
            phone: input.phone,
          }),
        );
      }),
  );

  crmFeature.post(
    "/whatsapp/connections/:connectionId/composio/authorize",
    async (context) =>
      handleWhatsapp(context, async () => {
        const connectionId = readConnectionId(
          context.req.param("connectionId"),
        );
        const serviceContext = await createContext(context);
        return context.json(
          await services.authorizeComposioWhatsappConnection(serviceContext, {
            connectionId,
          }),
        );
      }),
  );

  crmFeature.post(
    "/whatsapp/connections/:connectionId/composio/complete",
    async (context) =>
      handleWhatsapp(context, async () => {
        const connectionId = readConnectionId(
          context.req.param("connectionId"),
        );
        const serviceContext = await createContext(context);
        return context.json(
          await services.completeComposioWhatsappConnection(serviceContext, {
            connectionId,
          }),
        );
      }),
  );

  crmFeature.post(
    "/whatsapp/connections/:connectionId/composio/sender",
    async (context) =>
      handleWhatsapp(context, async () => {
        const connectionId = readConnectionId(
          context.req.param("connectionId"),
        );
        const input = await parseWhatsappJson(
          context,
          whatsappComposioSenderSchema,
        );
        const serviceContext = await createContext(context);
        return context.json(
          await services.selectComposioWhatsappSender(serviceContext, {
            connectionId,
            senderId: input.senderId,
          }),
        );
      }),
  );
}

function readConnectionId(value: string | undefined) {
  if (!value) {
    throw new CrmWhatsappValidationError(
      "Route param connectionId is invalid.",
    );
  }
  return value;
}
