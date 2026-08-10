import type { Context } from "hono";
import type { z } from "zod";
import type { TenantId } from "@lojaveiculosv2/shared";
import type { HttpAccountContext } from "../../../infrastructure/http/createHttpAccountContext.js";
import { HttpContextAuthenticationError } from "../../../infrastructure/http/createHttpServiceContext.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import { BillingRequestValidationError } from "../../billing/controllers/billing.controller.errors.js";

export type AgencyAccountContextFactory = (
  context: Context,
  scope: { tenantId: TenantId },
) => Promise<HttpAccountContext>;

export async function createAgencyContext(
  context: Context,
  contextFactory: AgencyAccountContextFactory,
  tenantId: TenantId,
): Promise<ServiceContext> {
  const account = await contextFactory(context, { tenantId });
  if (account.serviceContext.actor.kind !== "user") {
    throw new HttpContextAuthenticationError(
      "Agency routes require user context.",
    );
  }

  return {
    ...account.serviceContext,
    billingManagedBy: "agency",
    tenantId,
  };
}

export async function parseJson<Schema extends z.ZodType>(
  context: Context,
  schema: Schema,
): Promise<z.infer<Schema>> {
  try {
    return schema.parse(await context.req.json());
  } catch {
    throw new BillingRequestValidationError("Request body is invalid.");
  }
}

export function parseParams<Schema extends z.ZodType>(
  context: Context,
  schema: Schema,
): z.infer<Schema> {
  try {
    return schema.parse(context.req.param());
  } catch {
    throw new BillingRequestValidationError("Route parameters are invalid.");
  }
}

export const parseDateOrNull = (value: string | null): Date | null =>
  value ? new Date(value) : null;
