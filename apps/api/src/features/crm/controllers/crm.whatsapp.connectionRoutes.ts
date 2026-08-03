import type { Context, Hono } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  buildWhatsappWebhookEndpoints,
  resolveWebhookBaseUrl,
} from "../../../domains/crm/whatsapp/whatsappWebhookEndpoints.js";
import { whatsappUpdateConnectionSchema } from "./crm.controller.schemas.js";
import {
  assertWhatsappList,
  parseWhatsappJson,
} from "./crm.whatsapp.controller.support.js";
import {
  CrmWhatsappValidationError,
  handleWhatsapp,
} from "./crm.whatsapp.errors.js";
import type { CrmServices } from "./crmServices.js";
import type { WhatsappConnection } from "../../../domains/crm/services/CrmWhatsapp/listWhatsappConnections.js";

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
      const connections =
        await services.listWhatsappConnections(serviceContext);
      return context.json({
        connections: withWebhookEndpoints(context, connections),
      });
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
          ...(input.connectedPhone !== undefined
            ? { connectedPhone: input.connectedPhone }
            : {}),
          ...(input.composioCredentials
            ? {
                composioCredentials: {
                  apiKeyEnv: input.composioCredentials.apiKeyEnv,
                  connectedAccountId:
                    input.composioCredentials.connectedAccountId,
                  ...(input.composioCredentials.graphVersion
                    ? {
                        graphVersion: input.composioCredentials.graphVersion,
                      }
                    : {}),
                },
              }
            : {}),
          connectionId,
          ...(input.credentialsEnv
            ? { credentialsEnv: input.credentialsEnv }
            : {}),
          ...(input.displayName ? { displayName: input.displayName } : {}),
          ...(input.externalConnectionId !== undefined
            ? { externalConnectionId: input.externalConnectionId }
            : {}),
          ...(input.externalInstanceId !== undefined
            ? { externalInstanceId: input.externalInstanceId }
            : {}),
          ...(input.instanceCredentials
            ? { instanceCredentials: input.instanceCredentials }
            : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.purpose !== undefined ? { purpose: input.purpose } : {}),
          ...(input.status ? { status: input.status } : {}),
          ...(input.webhookUrl !== undefined
            ? { webhookUrl: input.webhookUrl }
            : {}),
        },
      );
      return context.json(
        withWebhookEndpoints(context, [connection])[0] ?? connection,
      );
    }),
  );

  crmFeature.post(
    "/whatsapp/connections/:connectionId/webhooks/configure",
    async (context) =>
      handleWhatsapp(context, async () => {
        const connectionId = context.req.param("connectionId");
        if (!connectionId) {
          throw new CrmWhatsappValidationError(
            "Route param connectionId is invalid.",
          );
        }
        const serviceContext = await createContext(context);
        const { basePath, canonicalApiOrigin } =
          readWebhookRequestBase(context);
        const result = await services.configureWhatsappConnectionWebhooks(
          serviceContext,
          {
            basePath,
            canonicalApiOrigin,
            connectionId,
            webhookToken: readWebhookToken(),
          },
        );
        return context.json(result);
      }),
  );
}

function withWebhookEndpoints(
  context: Context,
  connections: readonly WhatsappConnection[],
) {
  const { basePath, canonicalApiOrigin } = readWebhookRequestBase(context);
  return connections.map((connection) => ({
    ...connection,
    // Displayed URLs intentionally omit the webhook token so it never reaches
    // the browser clipboard; the auto-configure flow appends it server-side.
    webhookEndpoints:
      connection.provider === "zapi"
        ? buildWhatsappWebhookEndpoints({
            baseUrl: resolveWebhookBaseUrl({
              basePath,
              requestOrigin: canonicalApiOrigin,
              webhookUrl: connection.webhookUrl,
            }),
            connectionId: connection.id,
          })
        : [],
    webhookTokenRequired:
      connection.provider === "zapi" && Boolean(readWebhookToken()),
  }));
}

function readWebhookRequestBase(context: Context): {
  basePath: string;
  canonicalApiOrigin: string;
} {
  const requestUrl = new URL(context.req.url);
  return {
    basePath: requestUrl.pathname.replace(/\/whatsapp\/connections.*$/, ""),
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

function readWebhookToken(): string | null {
  return process.env.CRM_ZAPI_WEBHOOK_TOKEN?.trim() || null;
}
