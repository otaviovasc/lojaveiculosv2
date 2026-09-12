import type { Context } from "hono";
import type { z } from "zod";
import { AuthorizationError } from "../../../shared/authorization.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  HttpContextAuthenticationError,
  HttpContextAuthorizationError,
} from "../../../infrastructure/http/createHttpServiceContext.js";
import { jsonApiError } from "../../../infrastructure/http/apiErrorResponse.js";
import { AccountProvisioningConflictError } from "../../../domains/identity/ports/accountProvisioningRepository.js";
import {
  AccountProvisioningPolicyError,
  AccountProvisioningProviderError,
  AccountProvisioningScopeError,
} from "../../../domains/identity/services/AccountProvisioningService/serviceSupport.js";
import {
  RoleManagementPolicyError,
  RoleManagementScopeError,
  RoleMembershipNotFoundError,
} from "../../../domains/identity/services/RoleService/serviceSupport.js";
import { AgencyTeamAccessScopeError } from "../../../domains/agency/services/AgencyTeamAccessService/serviceSupport.js";
import {
  BillingContractUnavailableError,
  BillingQuotaExceededError,
} from "../../../domains/billing/ports/billingQuotaGuard.js";
import { InvitationSenderUnavailableError } from "../../identity/controllers/accountProvisioningServices.js";
import type { AgencyTeamAccessServices } from "./agencyTeamAccessServices.js";

export class AgencyTeamAccessStoreNotFoundError extends Error {
  constructor() {
    super("Store is not available in this agency tenant.");
    this.name = "AgencyTeamAccessStoreNotFoundError";
  }
}

export class AgencyTeamAccessRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgencyTeamAccessRequestError";
  }
}

export async function resolveAgencyTeamAccessStoreContext(
  context: ServiceContext,
  storeId: string,
  services: AgencyTeamAccessServices,
): Promise<ServiceContext> {
  const directory = await services.listStores(context, services);
  if (!directory.stores.some((store) => store.storeId === storeId)) {
    throw new AgencyTeamAccessStoreNotFoundError();
  }
  return {
    ...context,
    billingManagedBy: "agency",
    membershipRole: "agency",
    storeId,
  };
}

export function parseAgencyTeamAccessParams<Schema extends z.ZodType>(
  context: Context,
  schema: Schema,
): z.infer<Schema> {
  const result = schema.safeParse(context.req.param());
  if (!result.success) {
    throw new AgencyTeamAccessRequestError("Route parameters are invalid.");
  }
  return result.data;
}

export async function parseAgencyTeamAccessJson<Schema extends z.ZodType>(
  context: Context,
  schema: Schema,
): Promise<z.infer<Schema>> {
  let body: unknown;
  try {
    body = await context.req.json();
  } catch {
    throw new AgencyTeamAccessRequestError("Request body must be valid JSON.");
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new AgencyTeamAccessRequestError("Request body is invalid.");
  }
  return result.data;
}

export async function handleAgencyTeamAccess(
  context: Context,
  action: () => Promise<Response>,
): Promise<Response> {
  try {
    return await action();
  } catch (error) {
    return mapAgencyTeamAccessError(context, error);
  }
}

function mapAgencyTeamAccessError(context: Context, error: unknown): Response {
  if (
    error instanceof AgencyTeamAccessRequestError ||
    error instanceof RoleManagementScopeError ||
    error instanceof AgencyTeamAccessScopeError
  ) {
    return response(context, error, "AGENCY_TEAM_ACCESS_REQUEST_INVALID", 400);
  }
  if (error instanceof AgencyTeamAccessStoreNotFoundError) {
    return response(context, error, "AGENCY_TEAM_ACCESS_STORE_NOT_FOUND", 404);
  }
  if (error instanceof RoleMembershipNotFoundError) {
    return response(context, error, "ROLE_MEMBERSHIP_NOT_FOUND", 404);
  }
  if (error instanceof AccountProvisioningConflictError) {
    return response(context, error, "PROVISIONING_CONFLICT", 409);
  }
  if (error instanceof BillingQuotaExceededError) {
    return jsonApiError(context, {
      code: "BILLING_QUOTA_EXCEEDED",
      details: {
        current: error.current,
        limit: error.limit,
        quotaKey: error.quotaKey,
      },
      error,
      message: error.message,
      status: 409,
    });
  }
  if (error instanceof BillingContractUnavailableError) {
    return response(context, error, "BILLING_CONTRACT_REQUIRED", 402);
  }
  if (
    error instanceof RoleManagementPolicyError ||
    error instanceof AccountProvisioningPolicyError ||
    error instanceof AccountProvisioningScopeError ||
    error instanceof AuthorizationError ||
    error instanceof HttpContextAuthorizationError
  ) {
    return response(context, error, "AUTHORIZATION_DENIED", 403);
  }
  if (error instanceof HttpContextAuthenticationError) {
    return response(context, error, "HTTP_AUTHENTICATION_REQUIRED", 401);
  }
  if (
    error instanceof InvitationSenderUnavailableError ||
    error instanceof AccountProvisioningProviderError
  ) {
    return response(context, error, "PROVISIONING_PROVIDER_UNAVAILABLE", 503);
  }
  const internalError =
    error instanceof Error ? error : new Error("Unknown agency team error");
  return jsonApiError(context, {
    code: "INTERNAL_SERVER_ERROR",
    error: internalError,
    message: "Internal server error.",
    status: 500,
  });
}

function response(
  context: Context,
  error: Error,
  code: string,
  status: 400 | 401 | 402 | 403 | 404 | 409 | 503,
) {
  return jsonApiError(context, {
    code,
    error,
    message: error.message,
    status,
  });
}
