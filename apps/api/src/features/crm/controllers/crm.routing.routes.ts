import type { Context, Hono } from "hono";
import {
  crmRoutingPolicyPatchSchema,
  crmRoutingPolicyReadSchema,
  type CrmRoutingPolicyReadDto,
} from "@lojaveiculosv2/shared";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmRoutingPolicyReadModel } from "../../../domains/crm/services/CrmRoutingService/routingReadModels.js";
import type { CrmServices } from "./crmServices.js";
import {
  CrmMessagingValidationError,
  handleCrmMessaging,
} from "./crm.messaging.errors.js";

export function registerCrmRoutingRoutes(
  crmFeature: Hono,
  options: {
    createContext: (context: Context) => Promise<ServiceContext>;
    services: CrmServices;
  },
) {
  crmFeature.get("/routing-policy", async (context) =>
    handleCrmMessaging(context, async () => {
      const serviceContext = await options.createContext(context);
      const policy = await options.services.getRoutingPolicy(serviceContext);
      return context.json(toRoutingPolicyDto(policy));
    }),
  );

  crmFeature.patch("/routing-policy", async (context) =>
    handleCrmMessaging(context, async () => {
      const body = await readJson(context);
      const parsed = crmRoutingPolicyPatchSchema.safeParse(body);
      if (!parsed.success) {
        throw new CrmMessagingValidationError(
          "CRM routing policy payload is invalid.",
        );
      }
      const serviceContext = await options.createContext(context);
      const policy = await options.services.updateRoutingPolicy(
        serviceContext,
        {
          bot: {
            connectionId: parsed.data.externalBotConnectionId,
            mode: parsed.data.externalBotMode,
          },
          channel: parsed.data.channel,
          defaultConnectionId: parsed.data.defaultConnectionId,
        },
      );
      return context.json(toRoutingPolicyDto(policy));
    }),
  );
}

function toRoutingPolicyDto(
  policy: CrmRoutingPolicyReadModel,
): CrmRoutingPolicyReadDto {
  return crmRoutingPolicyReadSchema.parse({
    channels: policy.channels.map(({ bot, ...channel }) => ({
      ...channel,
      externalBot: bot,
    })),
    storeId: policy.storeId,
    tenantId: policy.tenantId,
  });
}

async function readJson(context: Context): Promise<unknown> {
  try {
    return await context.req.json();
  } catch {
    throw new CrmMessagingValidationError("Request body must be valid JSON.");
  }
}
