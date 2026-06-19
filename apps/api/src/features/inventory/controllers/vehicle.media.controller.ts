import type { Context, Hono } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { InventoryListingServices } from "./listingServices.js";
import { handle, parseJson } from "./vehicle.controller.http.js";
import {
  attachDocumentSchema,
  createMediaSchema,
  documentUploadSchema,
  mediaUploadSchema,
  reorderMediaSchema,
  updateMediaSchema,
} from "./vehicle.controller.schemas.js";
import {
  cleanAttachDocumentRequest,
  cleanCreateMediaRequest,
  cleanRequestDocumentUploadRequest,
  cleanUpdateMediaRequest,
} from "./vehicle.controller.cleaners.js";

type CreateContext = (context: Context) => Promise<ServiceContext>;

export function registerInventoryMediaRoutes(
  inventoryFeature: Hono,
  services: InventoryListingServices,
  createContext: CreateContext,
) {
  inventoryFeature.post("/listings/:listingId/media/uploads", async (context) =>
    handle(context, async () => {
      const input = await parseJson(context, mediaUploadSchema);
      const serviceContext = await createContext(context);
      const result = await services.requestMediaUpload(serviceContext, {
        ...input,
        listingId: context.req.param("listingId"),
      });

      return context.json(result, 201);
    }),
  );

  inventoryFeature.post("/listings/:listingId/media", async (context) =>
    handle(context, async () => {
      const input = await parseJson(context, createMediaSchema);
      const serviceContext = await createContext(context);
      const result = await services.createMedia(
        serviceContext,
        cleanCreateMediaRequest(context.req.param("listingId"), input),
      );

      return context.json(result, 201);
    }),
  );

  inventoryFeature.patch(
    "/listings/:listingId/media/reorder",
    async (context) =>
      handle(context, async () => {
        const input = await parseJson(context, reorderMediaSchema);
        const serviceContext = await createContext(context);
        const result = await services.reorderMedia(serviceContext, {
          items: input.items,
          listingId: context.req.param("listingId"),
        });

        return context.json(result);
      }),
  );

  inventoryFeature.patch(
    "/listings/:listingId/media/:mediaId",
    async (context) =>
      handle(context, async () => {
        const input = await parseJson(context, updateMediaSchema);
        const serviceContext = await createContext(context);
        const result = await services.updateMedia(
          serviceContext,
          cleanUpdateMediaRequest(
            context.req.param("listingId"),
            context.req.param("mediaId"),
            input,
          ),
        );

        return context.json(result);
      }),
  );

  inventoryFeature.delete(
    "/listings/:listingId/media/:mediaId",
    async (context) =>
      handle(context, async () => {
        const serviceContext = await createContext(context);
        const result = await services.deleteMedia(serviceContext, {
          listingId: context.req.param("listingId"),
          mediaId: context.req.param("mediaId"),
        });

        return context.json(result);
      }),
  );

  inventoryFeature.post(
    "/listings/:listingId/documents/uploads",
    async (context) =>
      handle(context, async () => {
        const input = await parseJson(context, documentUploadSchema);
        const serviceContext = await createContext(context);
        const result = await services.requestDocumentUpload(
          serviceContext,
          cleanRequestDocumentUploadRequest(
            context.req.param("listingId"),
            input,
          ),
        );

        return context.json(result, 201);
      }),
  );

  inventoryFeature.post("/listings/:listingId/documents", async (context) =>
    handle(context, async () => {
      const input = await parseJson(context, attachDocumentSchema);
      const serviceContext = await createContext(context);
      const result = await services.attachVehicleDocument(
        serviceContext,
        cleanAttachDocumentRequest(context.req.param("listingId"), input),
      );

      return context.json(result, 201);
    }),
  );
}
