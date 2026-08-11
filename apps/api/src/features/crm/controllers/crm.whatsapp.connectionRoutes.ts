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

type RegisterCrmWhatsappConnectionRoutesOptions = {
  createContext: (context: Context) => Promise<ServiceContext>;
  services: CrmServices;
};

export function registerCrmWhatsappConnectionRoutes(
  crmFeature: Hono,
  { createContext, services }: RegisterCrmWhatsappConnectionRoutesOptions,
) {
  crmFeature.get("/whatsapp/connections", async (context) =>
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

  crmFeature.post("/whatsapp/connections", async (context) =>
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
              clientToken: input.clientToken,
              displayName: input.displayName ?? "Z-API",
              instanceId: input.instanceId,
              instanceToken: input.instanceToken,
              provider: "zapi",
            }
          : {
              displayName: input.displayName ?? "WhatsApp Oficial",
              provider: "composio_whatsapp",
            },
      );
      return context.json(connection, 201);
    }),
  );

  crmFeature.patch("/whatsapp/connections/:connectionId", async (context) =>
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

export function readWebhookRequestBase(context: Context): {
  basePath: string;
  canonicalApiOrigin: string;
} {
  const requestUrl = new URL(context.req.url);
  return {
    basePath: requestUrl.pathname.replace(
      /\/whatsapp\/(?:support\/zapi\/)?connections.*$/,
      "",
    ),
    canonicalApiOrigin: readCanonicalApiOrigin(requestUrl),
  };
}

function readCanonicalApiOrigin(requestUrl: URL): string {
  const configuredBaseUrl = process.env.API_BASE_URL?.trim();
  if (configuredBaseUrl) {
    try {
      const configuredUrl = new URL(configuredBaseUrl);
      if (
        configuredUrl.username ||
        configuredUrl.password ||
        (configuredUrl.protocol !== "https:" && !isLocalRuntime())
      ) {
        throw new Error("unsafe API base URL");
      }
      return configuredUrl.origin;
    } catch {
      throw new CrmWhatsappValidationError(
        "API_BASE_URL must be a valid public HTTPS URL.",
      );
    }
  }
  if (isLocalRuntime()) return requestUrl.origin;
  throw new CrmWhatsappValidationError(
    "API_BASE_URL is required before configuring provider webhooks.",
  );
}

function isLocalRuntime() {
  const environment = (
    process.env.APP_ENV ??
    process.env.NODE_ENV ??
    ""
  ).toLowerCase();
  return ["development", "local", "test"].includes(environment);
}
