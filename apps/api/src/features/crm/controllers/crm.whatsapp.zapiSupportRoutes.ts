import type { Context, Hono } from "hono";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  whatsappZapiSupportCredentialsSchema,
  whatsappZapiSupportPairingCodeSchema,
  whatsappZapiSupportScopeSchema,
} from "./crm.whatsapp.connectionSchemas.js";
import { parseWhatsappJson } from "./crm.whatsapp.controller.support.js";
import { handleWhatsapp } from "./crm.whatsapp.errors.js";
import { readWebhookRequestBase } from "./crm.whatsapp.webhookRequestBase.js";
import type { CrmServices } from "./crmServices.js";

export function registerCrmWhatsappZapiSupportRoutes(
  crmFeature: Hono,
  options: {
    createSupportContext: (context: Context) => Promise<ServiceContext>;
    services: CrmServices;
  },
) {
  crmFeature.post("/whatsapp/support/zapi/connections", async (context) =>
    handleWhatsapp(context, async () => {
      const input = await parseWhatsappJson(
        context,
        whatsappZapiSupportCredentialsSchema,
      );
      const serviceContext = await options.createSupportContext(context);
      return context.json(
        await options.services.createZapiConnectionAsSupport(serviceContext, {
          ...supportScope(input),
          instanceId: input.instanceId,
          instanceToken: input.instanceToken,
          displayName: input.displayName ?? "Z-API",
          ...readWebhookRequestBase(context),
        }),
        201,
      );
    }),
  );

  crmFeature.patch(
    "/whatsapp/support/zapi/connections/:connectionId/credentials",
    async (context) =>
      handleWhatsapp(context, async () => {
        const input = await parseWhatsappJson(
          context,
          whatsappZapiSupportCredentialsSchema.omit({ displayName: true }),
        );
        const serviceContext = await options.createSupportContext(context);
        return context.json(
          await options.services.updateZapiCredentialsAsSupport(
            serviceContext,
            {
              ...supportScope(input),
              instanceId: input.instanceId,
              instanceToken: input.instanceToken,
              connectionId: context.req.param("connectionId"),
              ...readWebhookRequestBase(context),
            },
          ),
        );
      }),
  );

  crmFeature.post(
    "/whatsapp/support/zapi/connections/:connectionId/webhooks/configure",
    async (context) =>
      handleWhatsapp(context, async () => {
        const input = await parseWhatsappJson(
          context,
          whatsappZapiSupportScopeSchema,
        );
        const serviceContext = await options.createSupportContext(context);
        return context.json(
          await options.services.configureZapiWebhooksAsSupport(
            serviceContext,
            {
              ...supportScope(input),
              connectionId: context.req.param("connectionId"),
              ...readWebhookRequestBase(context),
            },
          ),
        );
      }),
  );

  crmFeature.post(
    "/whatsapp/support/zapi/connections/:connectionId/webhooks/reset",
    async (context) =>
      handleWhatsapp(context, async () => {
        const input = await parseWhatsappJson(
          context,
          whatsappZapiSupportScopeSchema,
        );
        const serviceContext = await options.createSupportContext(context);
        return context.json(
          await options.services.configureZapiWebhooksAsSupport(
            serviceContext,
            {
              ...supportScope(input),
              connectionId: context.req.param("connectionId"),
              mode: "reset",
              ...readWebhookRequestBase(context),
            },
          ),
        );
      }),
  );

  crmFeature.post(
    "/whatsapp/support/zapi/connections/:connectionId/pairing/qr",
    async (context) =>
      handleWhatsapp(context, async () => {
        const input = await parseWhatsappJson(
          context,
          whatsappZapiSupportScopeSchema,
        );
        const serviceContext = await options.createSupportContext(context);
        return context.json(
          await options.services.requestZapiPairingQrAsSupport(serviceContext, {
            ...supportScope(input),
            connectionId: context.req.param("connectionId"),
          }),
        );
      }),
  );

  crmFeature.post(
    "/whatsapp/support/zapi/connections/:connectionId/pairing/code",
    async (context) =>
      handleWhatsapp(context, async () => {
        const input = await parseWhatsappJson(
          context,
          whatsappZapiSupportPairingCodeSchema,
        );
        const serviceContext = await options.createSupportContext(context);
        return context.json(
          await options.services.requestZapiPairingCodeAsSupport(
            serviceContext,
            {
              ...supportScope(input),
              connectionId: context.req.param("connectionId"),
              phone: input.phone,
            },
          ),
        );
      }),
  );
}

function supportScope(input: { storeId: string; tenantId: string }) {
  return {
    storeId: input.storeId as StoreId,
    tenantId: input.tenantId as TenantId,
  };
}
