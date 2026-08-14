import type { Context } from "hono";
import type { z } from "zod";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import { HttpContextAuthenticationError } from "../../../infrastructure/http/createHttpServiceContext.js";
import {
  marketplaceErrorResponse,
  MarketplaceRequestValidationError,
} from "./marketplaceErrorResponses.js";

export async function createProtectedMarketplaceContext(
  context: Context,
  contextFactory: (context: Context) => Promise<ServiceContext>,
) {
  const serviceContext = await contextFactory(context);
  if (serviceContext.actor.kind !== "user") {
    throw new HttpContextAuthenticationError(
      "Marketplace requires user context.",
    );
  }
  return serviceContext;
}

export async function parseMarketplaceJson<Schema extends z.ZodType>(
  context: Context,
  schema: Schema,
): Promise<z.infer<Schema>> {
  let payload: unknown;
  try {
    payload = await context.req.json();
  } catch {
    throw new MarketplaceRequestValidationError("Request body is invalid.");
  }
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new MarketplaceRequestValidationError("Request body is invalid.", {
      issues: result.error.issues.map((issue) => ({
        code: issue.code,
        path: issue.path.join("."),
      })),
    });
  }
  return result.data;
}

export async function handleMarketplace(
  context: Context,
  action: () => Promise<Response>,
): Promise<Response> {
  try {
    return await action();
  } catch (error) {
    return marketplaceErrorResponse(context, error);
  }
}
