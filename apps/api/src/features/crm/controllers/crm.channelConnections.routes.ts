import type { Context, Hono } from "hono";
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
import { toChannelConnectionOverviewItem } from "./crm.channelConnection.dto.js";

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
        connections: overview.connections.map(toChannelConnectionOverviewItem),
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
              clientToken: input.clientToken,
              displayName: input.displayName ?? "WhatsApp",
              instanceId: input.instanceId,
              instanceToken: input.instanceToken,
              provider: "zapi",
              webhookSetupTarget: readWebhookRequestBase(context),
            }
          : input.provider === "uazapi"
            ? {
                channel: "whatsapp",
                ...(input.connectionPhoneNumber
                  ? { connectionPhoneNumber: input.connectionPhoneNumber }
                  : {}),
                displayName: input.displayName ?? "WhatsApp",
                provider: "uazapi",
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
      return context.json(toChannelConnectionOverviewItem(connection), 201);
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
      return context.json(toChannelConnectionOverviewItem(connection));
    }),
  );

  crmFeature.get(
    "/channel-connections/:connectionId/members",
    async (context) =>
      handleCrmMessaging(context, async () => {
        const serviceContext = await createContext(context);
        const members = await services.listConnectionMembers(serviceContext, {
          connectionId: readConnectionRouteParam(context),
        });
        return context.json(members.map(toConnectionMemberDto));
      }),
  );

  crmFeature.put(
    "/channel-connections/:connectionId/members/:userId",
    async (context) =>
      handleCrmMessaging(context, async () => {
        const serviceContext = await createContext(context);
        await services.grantConnectionMember(serviceContext, {
          connectionId: readConnectionRouteParam(context),
          userId: readMemberUserIdRouteParam(context),
        });
        return context.body(null, 204);
      }),
  );

  crmFeature.delete(
    "/channel-connections/:connectionId/members/:userId",
    async (context) =>
      handleCrmMessaging(context, async () => {
        const serviceContext = await createContext(context);
        const result = await services.revokeConnectionMember(serviceContext, {
          connectionId: readConnectionRouteParam(context),
          userId: readMemberUserIdRouteParam(context),
        });
        return context.json(result);
      }),
  );

  registerCrmChannelConnectionSetupRoutes(crmFeature, {
    createContext,
    services,
  });
}

function readConnectionRouteParam(context: Context) {
  const connectionId = context.req.param("connectionId");
  if (!connectionId) {
    throw new CrmMessagingValidationError(
      "Route param connectionId is invalid.",
    );
  }
  return connectionId;
}

function readMemberUserIdRouteParam(context: Context) {
  const userId = context.req.param("userId");
  if (!userId) {
    throw new CrmMessagingValidationError("Route param userId is invalid.");
  }
  return userId;
}

function toConnectionMemberDto(member: {
  createdAt: Date;
  grantedBy: string | null;
  userId: string;
}) {
  return {
    createdAt: member.createdAt.toISOString(),
    grantedBy: member.grantedBy,
    userId: member.userId,
  };
}
