import type { Context, Hono } from "hono";
import type { CrmChannelConnectionDto } from "@lojaveiculosv2/shared";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  crmCreateChannelConnectionSchema,
  crmUpdateChannelConnectionSchema,
} from "./crm.controller.schemas.js";
import {
  assertConversationRead,
  parseCrmMessagingJson,
} from "./crm.messaging.controller.support.js";
import {
  CrmMessagingValidationError,
  handleCrmMessaging,
} from "./crm.messaging.errors.js";
import type { CrmServices } from "./crmServices.js";
import { registerCrmChannelConnectionSetupRoutes } from "./crm.channelConnections.setupRoutes.js";
import { readWebhookRequestBase } from "./crm.webhookRequestBase.js";

type RegisterCrmChannelConnectionRoutesOptions = {
  createContext: (context: Context) => Promise<ServiceContext>;
  services: CrmServices;
};

export function registerCrmChannelConnectionRoutes(
  crmFeature: Hono,
  { createContext, services }: RegisterCrmChannelConnectionRoutesOptions,
) {
  crmFeature.get("/channel-connections", async (context) =>
    handleCrmMessaging(context, async () => {
      const serviceContext = await createContext(context);
      assertConversationRead(serviceContext);
      const overview =
        await services.getChannelConnectionOverview(serviceContext);
      return context.json({
        allowance: overview.allowance,
        availableSetups: overview.availableSetups,
        connections: overview.connections.map(toChannelConnectionDto),
      });
    }),
  );

  crmFeature.post("/channel-connections", async (context) =>
    handleCrmMessaging(context, async () => {
      const input = await parseCrmMessagingJson(
        context,
        crmCreateChannelConnectionSchema,
      );
      const serviceContext = await createContext(context);
      const connection = await services.createChannelConnection(
        serviceContext,
        input.provider === "zapi"
          ? {
              channel: "whatsapp",
              displayName: input.displayName ?? "WhatsApp",
              instanceId: input.instanceId,
              instanceToken: input.instanceToken,
              provider: "zapi",
              webhookSetupTarget: readWebhookRequestBase(context),
            }
          : {
              channel: input.channel,
              displayName:
                input.displayName ??
                (input.channel === "instagram" ? "Instagram" : "WhatsApp"),
              provider: "meta_cloud",
            },
      );
      return context.json(toChannelConnectionDto(connection), 201);
    }),
  );

  crmFeature.patch("/channel-connections/:connectionId", async (context) =>
    handleCrmMessaging(context, async () => {
      const connectionId = context.req.param("connectionId");
      if (!connectionId) {
        throw new CrmMessagingValidationError(
          "Route param connectionId is invalid.",
        );
      }
      const input = await parseCrmMessagingJson(
        context,
        crmUpdateChannelConnectionSchema,
      );
      const serviceContext = await createContext(context);
      const connection = await services.updateChannelConnection(
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
      return context.json(toChannelConnectionDto(connection));
    }),
  );

  registerCrmChannelConnectionSetupRoutes(crmFeature, {
    createContext,
    services,
  });
}

function toChannelConnectionDto(
  connection: CrmChannelConnectionDto,
): CrmChannelConnectionDto {
  return {
    capabilities: connection.capabilities,
    channel: connection.channel,
    displayName: connection.displayName,
    id: connection.id,
    isDefault: connection.isDefault,
    provider: connection.provider,
    readiness: connection.readiness,
    state: connection.state,
  };
}
