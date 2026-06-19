import { Hono, type Context } from "hono";
import type { z } from "zod";
import { AuthorizationError } from "../../../shared/authorization.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  createHttpServiceContext,
  HttpContextAuthenticationError,
  HttpContextAuthorizationError,
} from "../../../infrastructure/http/createHttpServiceContext.js";
import {
  StoreSettingsNotFoundError,
  StoreSettingsScopeError,
} from "../../../domains/settings/services/StoreSettingsService/serviceSupport.js";
import { StoreSettingsValidationError } from "../../../domains/settings/validation/settingsValidation.js";
import type { UpdateStoreSettingsServiceInput } from "../../../domains/settings/services/StoreSettingsService/updateStoreSettings.js";
import { updateStoreSettingsSchema } from "./settings.controller.schemas.js";
import { settingsServices, type SettingsServices } from "./settingsServices.js";

export type SettingsContextFactory = (
  context: Context,
) => Promise<ServiceContext>;

export type CreateSettingsFeatureOptions = {
  contextFactory?: SettingsContextFactory;
  services?: SettingsServices;
};

export function createSettingsFeature(
  options: CreateSettingsFeatureOptions = {},
) {
  const settingsFeature = new Hono();
  const services = options.services ?? settingsServices;
  const contextFactory =
    options.contextFactory ?? ((context) => createHttpServiceContext(context));
  const createContext = (context: Context) =>
    createProtectedServiceContext(context, contextFactory);

  settingsFeature.get("/store", async (context) =>
    handleSettings(context, async () => {
      const serviceContext = await createContext(context);
      return context.json(await services.getStoreSettings(serviceContext));
    }),
  );

  settingsFeature.patch("/store", async (context) =>
    handleSettings(context, async () => {
      const input = await parseJson(context, updateStoreSettingsSchema);
      const serviceContext = await createContext(context);
      const settings = await services.updateStoreSettings(
        serviceContext,
        cleanUpdateInput(input),
      );
      return context.json(settings);
    }),
  );

  return settingsFeature;
}

async function createProtectedServiceContext(
  context: Context,
  contextFactory: SettingsContextFactory,
): Promise<ServiceContext> {
  const serviceContext = await contextFactory(context);
  if (serviceContext.actor.kind !== "user") {
    throw new HttpContextAuthenticationError(
      "Settings routes require authenticated user context.",
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
    throw new SettingsRequestValidationError(
      "Request body must be valid JSON.",
    );
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new SettingsRequestValidationError("Request body is invalid.");
  }
  return parsed.data;
}

async function handleSettings(
  context: Context,
  action: () => Promise<Response>,
): Promise<Response> {
  try {
    return await action();
  } catch (error) {
    if (
      error instanceof SettingsRequestValidationError ||
      error instanceof StoreSettingsValidationError ||
      error instanceof StoreSettingsScopeError
    ) {
      return context.json({ message: error.message }, 400);
    }
    if (error instanceof HttpContextAuthenticationError) {
      return context.json({ message: error.message }, 401);
    }
    if (
      error instanceof AuthorizationError ||
      error instanceof HttpContextAuthorizationError
    ) {
      return context.json({ message: error.message }, 403);
    }
    if (error instanceof StoreSettingsNotFoundError) {
      return context.json({ message: error.message }, 404);
    }
    context.error = error instanceof Error ? error : new Error(String(error));
    return context.json({ message: "Internal server error." }, 500);
  }
}

function cleanUpdateInput(
  input: z.infer<typeof updateStoreSettingsSchema>,
): UpdateStoreSettingsServiceInput {
  return {
    ...(input.identity ? { identity: cleanObject(input.identity) } : {}),
    ...(input.profile ? { profile: cleanObject(input.profile) } : {}),
    ...(input.publicSite ? { publicSite: cleanObject(input.publicSite) } : {}),
  } as UpdateStoreSettingsServiceInput;
}

function cleanObject(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  );
}

export class SettingsRequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SettingsRequestValidationError";
  }
}
