import { Hono, type Context } from "hono";
import { z } from "zod";
import { AuthorizationError } from "../../../shared/authorization.js";
import {
  createHttpServiceContext,
  HttpContextAuthenticationError,
  HttpContextAuthorizationError,
} from "../../../infrastructure/http/createHttpServiceContext.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  inventoryListingServices,
  listingStatuses,
  type InventoryListingServices,
} from "./listingServices.js";

export type { InventoryListingServices } from "./listingServices.js";

export type InventoryContextFactory = (
  context: Context,
) => Promise<ServiceContext>;

export type CreateInventoryFeatureOptions = {
  contextFactory?: InventoryContextFactory;
  services?: InventoryListingServices;
};

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
  input: CreateInventoryFeatureOptions | InventoryListingServices = {},
) {
  const inventoryFeature = new Hono();
  const options = normalizeFeatureOptions(input);
  const services = options.services ?? inventoryListingServices;
  const contextFactory =
    options.contextFactory ?? ((context) => createHttpServiceContext(context));
  const createContext = (context: Context) =>
    createProtectedServiceContext(context, contextFactory);

  inventoryFeature.post("/listings", async (context) =>
    handle(context, async () => {
      const input = await parseJson(context, createListingSchema);
      const serviceContext = await createContext(context);
      const result = await services.createListing(serviceContext, input);

      return context.json(result, 201);
    }),
  );

  inventoryFeature.get("/listings/:listingId", async (context) =>
    handle(context, async () => {
      const serviceContext = await createContext(context);
      const result = await services.getListing(serviceContext, {
        listingId: context.req.param("listingId"),
      });

      return context.json(result);
    }),
  );

  inventoryFeature.patch("/listings/:listingId/description", async (context) =>
    handle(context, async () => {
      const input = await parseJson(context, descriptionSchema);
      const serviceContext = await createContext(context);
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
      const serviceContext = await createContext(context);
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
      const serviceContext = await createContext(context);
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
      const serviceContext = await createContext(context);
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

function normalizeFeatureOptions(
  input: CreateInventoryFeatureOptions | InventoryListingServices,
): CreateInventoryFeatureOptions {
  if ("createListing" in input) return { services: input };
  return input;
}

async function createProtectedServiceContext(
  context: Context,
  contextFactory: InventoryContextFactory,
): Promise<ServiceContext> {
  const serviceContext = await contextFactory(context);

  if (serviceContext.actor.kind !== "user") {
    throw new AuthenticationError(
      "Inventory routes require authenticated user context.",
    );
  }

  return serviceContext;
}

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

    if (error instanceof AuthenticationError) {
      return context.json({ message: error.message }, 401);
    }

    if (error instanceof HttpContextAuthenticationError) {
      return context.json({ message: error.message }, 401);
    }

    if (error instanceof HttpContextAuthorizationError) {
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

class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}
