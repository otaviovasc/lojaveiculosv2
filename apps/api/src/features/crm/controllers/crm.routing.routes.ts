import type { Context, Hono } from "hono";
import { z } from "zod";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmServices } from "./crmServices.js";
import {
  CrmWhatsappValidationError,
  handleWhatsapp,
} from "./crm.whatsapp.errors.js";

const routingChannelSchema = z.enum(["whatsapp", "instagram", "olx_chat"]);
const botRouteSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("disabled") }).strict(),
  z.object({ mode: z.literal("inherit_store_default") }).strict(),
  z
    .object({
      connectionId: z.string().uuid(),
      mode: z.literal("explicit_connection"),
    })
    .strict(),
]);
const updateRoutingPolicySchema = z
  .object({
    bot: botRouteSchema,
    channel: routingChannelSchema,
    defaultConnectionId: z.string().uuid().nullable(),
  })
  .strict();

export function registerCrmRoutingRoutes(
  crmFeature: Hono,
  options: {
    createContext: (context: Context) => Promise<ServiceContext>;
    services: CrmServices;
  },
) {
  crmFeature.get("/routing-policy", async (context) =>
    handleWhatsapp(context, async () => {
      const serviceContext = await options.createContext(context);
      return context.json(
        await options.services.getRoutingPolicy(serviceContext),
      );
    }),
  );

  crmFeature.patch("/routing-policy", async (context) =>
    handleWhatsapp(context, async () => {
      const body = await readJson(context);
      const parsed = updateRoutingPolicySchema.safeParse(body);
      if (!parsed.success) {
        throw new CrmWhatsappValidationError(
          "CRM routing policy payload is invalid.",
        );
      }
      const serviceContext = await options.createContext(context);
      return context.json(
        await options.services.updateRoutingPolicy(serviceContext, parsed.data),
      );
    }),
  );
}

async function readJson(context: Context): Promise<unknown> {
  try {
    return await context.req.json();
  } catch {
    throw new CrmWhatsappValidationError("Request body must be valid JSON.");
  }
}
