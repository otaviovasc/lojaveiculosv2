import { createHash } from "node:crypto";
import type { EntitlementKey } from "@lojaveiculosv2/shared";
import type { Context } from "hono";
import type { z } from "zod";
import { assertEntitlement } from "../../../shared/authorization.js";
import type {
  ServiceContext,
  StoreScopedServiceContext,
} from "../../../shared/serviceContext.js";
import { HttpContextAuthenticationError } from "../../../infrastructure/http/createHttpServiceContext.js";
import { ExternalApiIdempotencyReplay } from "../../../infrastructure/http/externalApiIdempotencyReplay.js";
import { externalApiRequestFingerprintContextKey } from "../../../infrastructure/http/externalApiRequestContext.js";
import type { ApiErrorResponseInput } from "../../../infrastructure/http/apiErrorResponse.js";
import {
  apiErrorInput,
  handleControllerAction,
} from "../../../infrastructure/http/commonApiErrorResponse.js";
import {
  CrmLeadNotFoundError,
  CrmScopeError,
} from "../../../domains/crm/services/CrmService/serviceSupport.js";
import { VehicleListingNotFoundError } from "../../../domains/vehicle/services/VehicleService/serviceSupport.js";
import { ExternalRuntimeValidationError } from "./externalApiRuntime.support.js";
import { mapCredereFinancingError } from "../../financing/controllers/credereFinancing.errors.js";

export type RuntimeContextFactory = (
  context: Context,
) => Promise<ServiceContext>;

export async function createIntegrationContext(
  context: Context,
  contextFactory: RuntimeContextFactory,
) {
  const serviceContext = await contextFactory(context);
  if (serviceContext.actor.kind !== "integration") {
    throw new HttpContextAuthenticationError(
      "External API runtime routes require a scoped API key.",
    );
  }
  if (!serviceContext.storeId || !serviceContext.tenantId) {
    throw new HttpContextAuthenticationError(
      "External API runtime routes require store and tenant scope.",
    );
  }
  if (
    !("entitlements" in serviceContext) ||
    !Array.isArray(serviceContext.entitlements)
  ) {
    throw new HttpContextAuthenticationError(
      "External API runtime routes require entitlement scope.",
    );
  }
  return serviceContext as StoreScopedServiceContext;
}

export function assertExternalRuntimeEntitlement(
  context: StoreScopedServiceContext,
  entitlement: EntitlementKey,
) {
  assertEntitlement(context, entitlement);
}

export function bindValidatedExternalApiRequest(
  context: Context,
  payload: unknown,
) {
  const canonicalPayload =
    JSON.stringify(payload, (_key, value: unknown) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        return value;
      }
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).sort(
          ([left], [right]) => left.localeCompare(right),
        ),
      );
    }) ?? "null";
  context.set(
    externalApiRequestFingerprintContextKey,
    createHash("sha256").update(canonicalPayload).digest("hex"),
  );
}

export async function parseJson<Schema extends z.ZodType>(
  context: Context,
  schema: Schema,
): Promise<z.infer<Schema>> {
  try {
    return schema.parse(await context.req.json());
  } catch {
    throw new ExternalRuntimeValidationError("Request body is invalid.");
  }
}

export function parseQuery<Schema extends z.ZodType>(
  context: Context,
  schema: Schema,
): z.infer<Schema> {
  const parsed = schema.safeParse(context.req.query());
  if (!parsed.success) {
    throw new ExternalRuntimeValidationError("Request query is invalid.");
  }
  return parsed.data;
}

export function parseParams<Schema extends z.ZodType>(
  context: Context,
  schema: Schema,
): z.infer<Schema> {
  const parsed = schema.safeParse(context.req.param());
  if (!parsed.success) {
    throw new ExternalRuntimeValidationError("Request path is invalid.");
  }
  return parsed.data;
}

export async function handleRuntime(
  context: Context,
  action: () => Promise<Response>,
): Promise<Response> {
  return handleControllerAction(
    context,
    async () => {
      try {
        return await action();
      } catch (error) {
        if (!(error instanceof ExternalApiIdempotencyReplay)) throw error;
        return new Response(JSON.stringify(error.body), {
          headers: {
            "content-type": error.contentType,
            "idempotency-replayed": "true",
          },
          status: error.statusCode,
        });
      }
    },
    runtimeErrorResponse,
  );
}

function runtimeErrorResponse(error: unknown): ApiErrorResponseInput | null {
  const financingError = mapCredereFinancingError(error);
  if (financingError) return financingError;
  if (error instanceof ExternalRuntimeValidationError) {
    return apiErrorInput(error, "EXTERNAL_API_RUNTIME_REQUEST_ERROR", 400);
  }
  if (
    error instanceof CrmLeadNotFoundError ||
    error instanceof VehicleListingNotFoundError
  ) {
    return apiErrorInput(error, "EXTERNAL_API_RUNTIME_NOT_FOUND", 404);
  }
  if (error instanceof CrmScopeError) {
    return apiErrorInput(error, "EXTERNAL_API_RUNTIME_SCOPE_ERROR", 400);
  }
  return null;
}
