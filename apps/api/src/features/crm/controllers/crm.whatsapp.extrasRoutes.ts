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
  assertWhatsappRead,
  assertWhatsappSend,
  parseWhatsappJson,
} from "./crm.whatsapp.controller.support.js";
import {
  CrmWhatsappValidationError,
  handleWhatsapp,
} from "./crm.whatsapp.errors.js";
import { registerCrmWhatsappQuickMessageRoutes } from "./crm.whatsapp.quickMessageRoutes.js";
import { registerCrmWhatsappTagRoutes } from "./crm.whatsapp.tagRoutes.js";
import type { CrmServices } from "./crmServices.js";

type RegisterCrmWhatsappExtrasRoutesOptions = {
  createContext: (context: Context) => Promise<ServiceContext>;
  services: CrmServices;
};

export function registerCrmWhatsappExtrasRoutes(
  crmFeature: Hono,
  { createContext, services }: RegisterCrmWhatsappExtrasRoutesOptions,
) {
  registerCrmWhatsappQuickMessageRoutes(crmFeature, {
    createContext,
    services,
  });
  registerCrmWhatsappTagRoutes(crmFeature, { createContext, services });

  crmFeature.get("/whatsapp/catalog/products", async (context) =>
    handleWhatsapp(context, async () => {
      const input = whatsappCatalogProductsQuerySchema.safeParse(
        context.req.query(),
      );
      if (!input.success) throw new CrmWhatsappValidationError();
      const serviceContext = await createContext(context);
      assertWhatsappRead(serviceContext);
      const products = await services.listWhatsappCatalogProducts(
        serviceContext,
        {
          ...(input.data.catalogPhone
            ? { catalogPhone: input.data.catalogPhone }
            : {}),
          ...(input.data.nextCursor
            ? { nextCursor: input.data.nextCursor }
            : {}),
          sessionId: input.data.sessionId,
        },
      );
      return context.json(products);
    }),
  );

  crmFeature.post("/whatsapp/send/location", async (context) =>
    handleWhatsapp(context, async () => {
      const input = await parseWhatsappJson(
        context,
        whatsappSendLocationSchema,
      );
      const serviceContext = await createContext(context);
      assertWhatsappSend(serviceContext);
      const message = await services.sendWhatsappLocation(serviceContext, {
        ...(input.address ? { address: input.address } : {}),
        latitude: input.latitude,
        longitude: input.longitude,
        ...(input.name ? { name: input.name } : {}),
        sessionId: input.sessionId,
        ...(input.url ? { url: input.url } : {}),
      });
      return context.json(message, 201);
    }),
  );

  crmFeature.post("/whatsapp/send/catalog", async (context) =>
    handleWhatsapp(context, async () => {
      const input = await parseWhatsappJson(context, whatsappSendCatalogSchema);
      const serviceContext = await createContext(context);
      assertWhatsappSend(serviceContext);
      const message = await services.sendWhatsappCatalog(serviceContext, {
        ...(input.catalogDescription
          ? { catalogDescription: input.catalogDescription }
          : {}),
        ...(input.catalogPhone ? { catalogPhone: input.catalogPhone } : {}),
        ...(input.catalogUrl ? { catalogUrl: input.catalogUrl } : {}),
        ...(input.message ? { message: input.message } : {}),
        sessionId: input.sessionId,
        ...(input.title ? { title: input.title } : {}),
      });
      return context.json(message, 201);
    }),
  );

  crmFeature.post("/whatsapp/send/catalog/product", async (context) =>
    handleWhatsapp(context, async () => {
      const input = await parseWhatsappJson(
        context,
        whatsappSendCatalogProductSchema,
      );
      const serviceContext = await createContext(context);
      assertWhatsappSend(serviceContext);
      const message = await services.sendWhatsappCatalogProduct(
        serviceContext,
        {
          ...(input.catalogPhone ? { catalogPhone: input.catalogPhone } : {}),
          productId: input.productId,
          ...(input.productName ? { productName: input.productName } : {}),
          sessionId: input.sessionId,
        },
      );
      return context.json(message, 201);
    }),
  );

  crmFeature.post("/whatsapp/send/vehicle", async (context) =>
    handleWhatsapp(context, async () => {
      const input = await parseWhatsappJson(context, whatsappSendVehicleSchema);
      const serviceContext = await createContext(context);
      assertWhatsappSend(serviceContext);
      const message = await services.sendWhatsappVehicle(serviceContext, {
        ...(input.description ? { description: input.description } : {}),
        ...(input.listingId ? { listingId: input.listingId } : {}),
        ...(input.mediaLimit !== undefined
          ? { mediaLimit: input.mediaLimit }
          : {}),
        ...(input.mileageLabel ? { mileageLabel: input.mileageLabel } : {}),
        ...(input.priceLabel ? { priceLabel: input.priceLabel } : {}),
        sessionId: input.sessionId,
        ...(input.thumbnailUrl ? { thumbnailUrl: input.thumbnailUrl } : {}),
        ...(input.title ? { title: input.title } : {}),
        ...(input.unitId ? { unitId: input.unitId } : {}),
        ...(input.url ? { url: input.url } : {}),
        ...(input.year ? { year: input.year } : {}),
      });
      return context.json(message, 201);
    }),
  );
}
