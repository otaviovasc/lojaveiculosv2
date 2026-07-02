import { Hono, type Context } from "hono";
import { z } from "zod";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  createHttpServiceContext,
  HttpContextAuthenticationError,
} from "../../../infrastructure/http/createHttpServiceContext.js";
import {
  handleStorefrontMedia,
  StorefrontMediaRequestValidationError,
} from "./storefrontMedia.controller.errors.js";
import {
  storefrontMediaServices,
  type StorefrontMediaServices,
} from "./storefrontMediaServices.js";

const maxImageBytes = 15 * 1024 * 1024;
const mediaUploadSchema = z.object({
  contentType: z.string().trim().min(1).max(120),
  fileName: z.string().trim().min(1).max(191),
  height: z.number().int().min(1).max(12000).nullable().optional(),
  sizeBytes: z.number().int().min(1).max(maxImageBytes),
  width: z.number().int().min(1).max(12000).nullable().optional(),
});

export type StorefrontMediaContextFactory = (
  context: Context,
) => Promise<ServiceContext>;

export type CreateStorefrontMediaFeatureOptions = {
  contextFactory?: StorefrontMediaContextFactory;
  services?: StorefrontMediaServices;
};

export function createStorefrontMediaFeature(
  options: CreateStorefrontMediaFeatureOptions = {},
) {
  const feature = new Hono();
  const services = options.services ?? storefrontMediaServices;
  const contextFactory =
    options.contextFactory ?? ((context) => createHttpServiceContext(context));
  const createContext = (context: Context) =>
    createProtectedContext(context, contextFactory);

  feature.get("/media", (context) =>
    handleStorefrontMedia(context, async () => {
      const serviceContext = await createContext(context);
      const assets = await services.listAssets(serviceContext);
      return context.json({ assets });
    }),
  );

  feature.post("/media/uploads", (context) =>
    handleStorefrontMedia(context, async () => {
      const input = await parseJson(context, mediaUploadSchema);
      const serviceContext = await createContext(context);
      const upload = await services.requestUpload(
        serviceContext,
        cleanUploadInput(input),
      );
      return context.json(upload, 201);
    }),
  );

  return feature;
}

function cleanUploadInput(input: z.infer<typeof mediaUploadSchema>) {
  return {
    contentType: input.contentType,
    fileName: input.fileName,
    ...(input.height !== undefined ? { height: input.height } : {}),
    sizeBytes: input.sizeBytes,
    ...(input.width !== undefined ? { width: input.width } : {}),
  };
}

async function createProtectedContext(
  context: Context,
  contextFactory: StorefrontMediaContextFactory,
): Promise<ServiceContext> {
  const serviceContext = await contextFactory(context);
  if (serviceContext.actor.kind !== "user") {
    throw new HttpContextAuthenticationError(
      "Storefront media routes require authenticated user context.",
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
    throw new StorefrontMediaRequestValidationError(
      "Request body must be valid JSON.",
    );
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new StorefrontMediaRequestValidationError("Request body is invalid.");
  }
  return parsed.data;
}
