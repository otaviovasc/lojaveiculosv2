import type { Context, Hono } from "hono";
import {
  crmExternalBotProfileAssignmentPatchSchema,
  crmExternalBotProfileCreateSchema,
  crmExternalBotProfilePatchSchema,
} from "@lojaveiculosv2/shared";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmServices } from "./crmServices.js";
import {
  handleExternalBot,
  parseBody,
  toExternalBotProfileAssignments,
  toExternalBotProfileList,
  toExternalBotProfileRead,
} from "./crm.bot.controllerSupport.js";

export type ExternalBotProfileRouteOptions = {
  createContext: (context: Context) => Promise<ServiceContext>;
  services: CrmServices;
};

export function registerExternalBotProfileRoutes(
  crmFeature: Hono,
  options: ExternalBotProfileRouteOptions,
) {
  crmFeature.get("/bot/profiles", async (context) =>
    handleExternalBot(context, async () => {
      const serviceContext = await options.createContext(context);
      const profiles =
        await options.services.listExternalBotProfiles(serviceContext);
      return context.json(toExternalBotProfileList(profiles));
    }),
  );

  crmFeature.post("/bot/profiles", async (context) =>
    handleExternalBot(context, async () => {
      const input = await parseBody(context, crmExternalBotProfileCreateSchema);
      const serviceContext = await options.createContext(context);
      const profile = await options.services.createExternalBotProfile(
        serviceContext,
        {
          name: input.name,
          enabled: input.enabled ?? false,
          ...(input.apiToken !== undefined ? { apiToken: input.apiToken } : {}),
          ...(input.webhookSecret !== undefined
            ? { webhookSecret: input.webhookSecret }
            : {}),
          ...(input.webhookUrl !== undefined
            ? { webhookUrl: input.webhookUrl }
            : {}),
        },
      );
      return context.json(toExternalBotProfileRead(profile), 201);
    }),
  );

  crmFeature.patch("/bot/profiles/:profileId", async (context) =>
    handleExternalBot(context, async () => {
      const input = await parseBody(context, crmExternalBotProfilePatchSchema);
      const serviceContext = await options.createContext(context);
      const profile = await options.services.updateExternalBotProfile(
        serviceContext,
        {
          profileId: context.req.param("profileId"),
          ...(input.apiToken !== undefined ? { apiToken: input.apiToken } : {}),
          ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
          ...(input.isDefault !== undefined
            ? { isDefault: input.isDefault }
            : {}),
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.webhookSecret !== undefined
            ? { webhookSecret: input.webhookSecret }
            : {}),
          ...(input.webhookUrl !== undefined
            ? { webhookUrl: input.webhookUrl }
            : {}),
        },
      );
      return context.json(toExternalBotProfileRead(profile));
    }),
  );

  crmFeature.get("/bot/profile-assignments", async (context) =>
    handleExternalBot(context, async () => {
      const serviceContext = await options.createContext(context);
      const assignments =
        await options.services.listExternalBotProfileAssignments(
          serviceContext,
        );
      return context.json(toExternalBotProfileAssignments(assignments));
    }),
  );

  crmFeature.patch("/bot/profile-assignments/:connectionId", async (context) =>
    handleExternalBot(context, async () => {
      const input = await parseBody(
        context,
        crmExternalBotProfileAssignmentPatchSchema,
      );
      const serviceContext = await options.createContext(context);
      await options.services.assignExternalBotProfileToConnection(
        serviceContext,
        {
          connectionId: context.req.param("connectionId"),
          profileId: input.profileId,
        },
      );
      return context.json({
        connectionId: context.req.param("connectionId"),
        profileId: input.profileId,
      });
    }),
  );
}
