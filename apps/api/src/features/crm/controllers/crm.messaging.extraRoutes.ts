import type { Context, Hono } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  whatsappCatalogProductsQuerySchema,
  whatsappSendCatalogSchema,
  whatsappSendCatalogProductSchema,
  whatsappSendLocationSchema,
  whatsappSendVehicleSchema,
} from "./crm.controller.schemas.js";
import {
  assertConversationRead,
  assertMessageSend,
  parseCrmMessagingJson,
} from "./crm.messaging.controller.support.js";
import {
  CrmMessagingValidationError,
  handleCrmMessaging,
} from "./crm.messaging.errors.js";
import { registerCrmQuickMessageRoutes } from "./crm.quickMessages.routes.js";
import { registerCrmTagRoutes } from "./crm.tags.routes.js";
import type { CrmServices } from "./crmServices.js";
import { toCrmMessageDto } from "./crm.message.dto.js";

type RegisterCrmMessagingExtraRoutesOptions = {
  createContext: (context: Context) => Promise<ServiceContext>;
  services: CrmServices;
};

export function registerCrmMessagingExtraRoutes(
  crmFeature: Hono,
  { createContext, services }: RegisterCrmMessagingExtraRoutesOptions,
) {
  registerCrmQuickMessageRoutes(crmFeature, {
    createContext,
    services,
  });
  registerCrmTagRoutes(crmFeature, { createContext, services });

  crmFeature.get("/whatsapp/catalog/products", async (context) =>
    handleCrmMessaging(context, async () => {
      const input = whatsappCatalogProductsQuerySchema.safeParse(
        context.req.query(),
      );
      if (!input.success) throw new CrmMessagingValidationError();
      const serviceContext = await createContext(context);
      assertConversationRead(serviceContext);
      const products = await services.listWhatsappCatalogProducts(
        serviceContext,
        {
          ...(input.data.catalogPhone
            ? { catalogPhone: input.data.catalogPhone }
            : {}),
          ...(input.data.nextCursor
            ? { nextCursor: input.data.nextCursor }
            : {}),
          cycleId: input.data.cycleId,
        },
      );
      return context.json(products);
    }),
  );

  crmFeature.post("/whatsapp/send/location", async (context) =>
    handleCrmMessaging(context, async () => {
      const input = await parseCrmMessagingJson(
        context,
        whatsappSendLocationSchema,
      );
      const serviceContext = await createContext(context);
      assertMessageSend(serviceContext);
      const message = await services.sendWhatsappLocation(serviceContext, {
        ...(readIdempotencyKey(context)
          ? { idempotencyKey: readIdempotencyKey(context)! }
          : {}),
        ...(input.address ? { address: input.address } : {}),
        latitude: input.latitude,
        longitude: input.longitude,
        ...(input.name ? { name: input.name } : {}),
        cycleId: input.cycleId,
        ...(input.url ? { url: input.url } : {}),
      });
      return context.json(toCrmMessageDto(message), 201);
    }),
  );

  crmFeature.post("/whatsapp/send/catalog", async (context) =>
    handleCrmMessaging(context, async () => {
      const input = await parseCrmMessagingJson(
        context,
        whatsappSendCatalogSchema,
      );
      const serviceContext = await createContext(context);
      assertMessageSend(serviceContext);
      const message = await services.sendWhatsappCatalog(serviceContext, {
        ...(readIdempotencyKey(context)
          ? { idempotencyKey: readIdempotencyKey(context)! }
          : {}),
        ...(input.catalogDescription
          ? { catalogDescription: input.catalogDescription }
          : {}),
        ...(input.catalogPhone ? { catalogPhone: input.catalogPhone } : {}),
        ...(input.catalogUrl ? { catalogUrl: input.catalogUrl } : {}),
        ...(input.message ? { message: input.message } : {}),
        cycleId: input.cycleId,
        ...(input.title ? { title: input.title } : {}),
      });
      return context.json(toCrmMessageDto(message), 201);
    }),
  );

  crmFeature.post("/whatsapp/send/catalog/product", async (context) =>
    handleCrmMessaging(context, async () => {
      const input = await parseCrmMessagingJson(
        context,
        whatsappSendCatalogProductSchema,
      );
      const serviceContext = await createContext(context);
      assertMessageSend(serviceContext);
      const message = await services.sendWhatsappCatalogProduct(
        serviceContext,
        {
          ...(readIdempotencyKey(context)
            ? { idempotencyKey: readIdempotencyKey(context)! }
            : {}),
          ...(input.catalogPhone ? { catalogPhone: input.catalogPhone } : {}),
          productId: input.productId,
          ...(input.productName ? { productName: input.productName } : {}),
          cycleId: input.cycleId,
        },
      );
      return context.json(toCrmMessageDto(message), 201);
    }),
  );

  crmFeature.post("/whatsapp/send/vehicle", async (context) =>
    handleCrmMessaging(context, async () => {
      const input = await parseCrmMessagingJson(
        context,
        whatsappSendVehicleSchema,
      );
      const serviceContext = await createContext(context);
      assertMessageSend(serviceContext);
      const message = await services.sendWhatsappVehicle(serviceContext, {
        ...(readIdempotencyKey(context)
          ? { idempotencyKey: readIdempotencyKey(context)! }
          : {}),
        ...(input.description ? { description: input.description } : {}),
        ...(input.listingId ? { listingId: input.listingId } : {}),
        ...(input.mediaLimit !== undefined
          ? { mediaLimit: input.mediaLimit }
          : {}),
        ...(input.mileageLabel ? { mileageLabel: input.mileageLabel } : {}),
        ...(input.priceLabel ? { priceLabel: input.priceLabel } : {}),
        cycleId: input.cycleId,
        ...(input.thumbnailUrl ? { thumbnailUrl: input.thumbnailUrl } : {}),
        ...(input.title ? { title: input.title } : {}),
        ...(input.unitId ? { unitId: input.unitId } : {}),
        ...(input.url ? { url: input.url } : {}),
        ...(input.year ? { year: input.year } : {}),
      });
      return context.json(toCrmMessageDto(message), 201);
    }),
  );
}

function readIdempotencyKey(context: Context) {
  return context.req.header("Idempotency-Key")?.trim() || undefined;
}
