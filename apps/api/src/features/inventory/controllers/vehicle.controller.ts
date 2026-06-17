import { Hono, type Context } from "hono";
import { z } from "zod";
import { AuthorizationError } from "../../../shared/authorization.js";
import { createPlaceholderServiceContext } from "../../../infrastructure/http/createPlaceholderServiceContext.js";
import {
  inventoryListingServices,
  listingStatuses,
  type InventoryListingServices,
} from "./listingServices.js";

export type { InventoryListingServices } from "./listingServices.js";

const createListingSchema = z.object({
  description: z.string().trim().min(1).nullable().optional(),
  plate: z.string().trim().min(1).nullable().default(null),
  priceCents: z.number().int().nonnegative().nullable().optional(),
  status: z.enum(listingStatuses).optional(),
  title: z.string().trim().min(1),
});

const descriptionSchema = z.object({
  description: z.string().trim().min(1),
});

const priceSchema = z.object({
  priceCents: z.number().int().nonnegative().nullable(),
});

const attachUnitSchema = z.object({
  plate: z.string().trim().min(1).nullable().optional(),
  stockNumber: z.string().trim().min(1).nullable().optional(),
  vin: z.string().trim().min(1).nullable().optional(),
});

const statusSchema = z.object({
  status: z.enum(listingStatuses),
});

export function createInventoryFeature(
  services: InventoryListingServices = inventoryListingServices,
) {
  const inventoryFeature = new Hono();

  inventoryFeature.post("/listings", async (context) =>
    handle(context, async () => {
      const input = await parseJson(context, createListingSchema);
      const serviceContext = createPlaceholderServiceContext(context);
      const result = await services.createListing(serviceContext, input);

      return context.json(result, 201);
    }),
  );

  inventoryFeature.get("/listings/:listingId", async (context) =>
    handle(context, async () => {
      const serviceContext = createPlaceholderServiceContext(context);
      const result = await services.getListing(serviceContext, {
        listingId: context.req.param("listingId"),
      });

      return context.json(result);
    }),
  );

  inventoryFeature.patch("/listings/:listingId/description", async (context) =>
    handle(context, async () => {
      const input = await parseJson(context, descriptionSchema);
      const serviceContext = createPlaceholderServiceContext(context);
      const result = await services.updateListingDescription(serviceContext, {
        ...input,
        listingId: context.req.param("listingId"),
      });

      return context.json(result);
    }),
  );

  inventoryFeature.patch("/listings/:listingId/price", async (context) =>
    handle(context, async () => {
      const input = await parseJson(context, priceSchema);
      const serviceContext = createPlaceholderServiceContext(context);
      const result = await services.updateListingPrice(serviceContext, {
        ...input,
        listingId: context.req.param("listingId"),
      });

      return context.json(result);
    }),
  );

  inventoryFeature.put("/listings/:listingId/unit", async (context) =>
    handle(context, async () => {
      const input = await parseJson(context, attachUnitSchema);
      const serviceContext = createPlaceholderServiceContext(context);
      const result = await services.attachListingUnit(serviceContext, {
        ...input,
        listingId: context.req.param("listingId"),
      });

      return context.json(result);
    }),
  );

  inventoryFeature.patch("/listings/:listingId/status", async (context) =>
    handle(context, async () => {
      const input = await parseJson(context, statusSchema);
      const serviceContext = createPlaceholderServiceContext(context);
      const result = await services.changeListingStatus(serviceContext, {
        ...input,
        listingId: context.req.param("listingId"),
      });

      return context.json(result);
    }),
  );

  return inventoryFeature;
}

export const vehicleFeature = createInventoryFeature();

async function parseJson<Schema extends z.ZodType>(
  context: Context,
  schema: Schema,
): Promise<z.infer<Schema>> {
  let body: unknown;

  try {
    body = await context.req.json();
  } catch {
    throw new RequestValidationError("Request body must be valid JSON.");
  }

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    throw new RequestValidationError("Request body is invalid.");
  }

  return parsed.data;
}

async function handle(
  context: Context,
  action: () => Promise<Response>,
): Promise<Response> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return context.json({ message: error.message }, 400);
    }

    if (error instanceof AuthorizationError) {
      return context.json({ message: error.message }, 403);
    }

    context.error = error instanceof Error ? error : new Error(String(error));

    return context.json({ message: "Internal server error." }, 500);
  }
}

class RequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RequestValidationError";
  }
}
