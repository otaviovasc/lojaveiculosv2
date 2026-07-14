import { Hono, type Context } from "hono";
import type { z } from "zod";
import type { PermissionKey } from "@lojaveiculosv2/shared";
import { AuthorizationError } from "../../../shared/authorization.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  createHttpServiceContext,
  HttpContextAuthenticationError,
  HttpContextAuthorizationError,
} from "../../../infrastructure/http/createHttpServiceContext.js";
import { jsonApiError } from "../../../infrastructure/http/apiErrorResponse.js";
import {
  RoleManagementPolicyError,
  RoleManagementScopeError,
  RoleMembershipNotFoundError,
} from "../../../domains/identity/services/RoleService/serviceSupport.js";
import { updateMembershipAccessSchema } from "./roles.controller.schemas.js";
import { roleServices, type RoleServices } from "./roleServices.js";

export type RolesContextFactory = (context: Context) => Promise<ServiceContext>;

export type CreateRolesFeatureOptions = {
  contextFactory?: RolesContextFactory;
  services?: RoleServices;
};

export function createRolesFeature(options: CreateRolesFeatureOptions = {}) {
  const feature = new Hono();
  const services = options.services ?? roleServices;
  const contextFactory =
    options.contextFactory ?? ((context) => createHttpServiceContext(context));

  feature.get("/roles", async (context) =>
    handleRoles(context, async () => {
      const serviceContext = await createProtectedContext(
        context,
        contextFactory,
      );
      return context.json(
        await services.listRoleManagement(serviceContext, services),
      );
    }),
  );

  feature.get("/member-options", async (context) =>
    handleRoles(context, async () => {
      const serviceContext = await createProtectedContext(
        context,
        contextFactory,
      );
      return context.json(
        await services.listStoreMemberOptions(serviceContext, services),
      );
    }),
  );

  feature.patch("/memberships/:membershipId/access", async (context) =>
    handleRoles(context, async () => {
      const input = await parseJson(context, updateMembershipAccessSchema);
      const serviceContext = await createProtectedContext(
        context,
        contextFactory,
      );
      const result = await services.updateMembershipAccess(
        serviceContext,
        {
          membershipId: context.req.param("membershipId"),
          overrides: input.overrides.map((override) => ({
            allowed: override.allowed,
            permission: override.permission as PermissionKey,
            reason: override.reason ?? null,
          })),
          role: input.role,
        },
        services,
      );
      return context.json(result);
    }),
  );

  return feature;
}

async function createProtectedContext(
  context: Context,
  contextFactory: RolesContextFactory,
) {
  const serviceContext = await contextFactory(context);
  if (serviceContext.actor.kind !== "user") {
    throw new HttpContextAuthenticationError("Roles require user context.");
  }
  return serviceContext;
}

async function parseJson<Schema extends z.ZodType>(
  context: Context,
  schema: Schema,
): Promise<z.infer<Schema>> {
  try {
    return schema.parse(await context.req.json());
  } catch {
    throw new RolesRequestValidationError("Request body is invalid.");
  }
}

async function handleRoles(
  context: Context,
  action: () => Promise<Response>,
): Promise<Response> {
  try {
    return await action();
  } catch (error) {
    if (
      error instanceof RolesRequestValidationError ||
      error instanceof RoleManagementPolicyError ||
      error instanceof RoleManagementScopeError
    ) {
      return jsonApiError(context, {
        code: "ROLES_REQUEST_ERROR",
        error,
        message: error.message,
        status: 400,
      });
    }
    if (error instanceof HttpContextAuthenticationError) {
      return jsonApiError(context, {
        code: "HTTP_AUTHENTICATION_REQUIRED",
        error,
        message: error.message,
        status: 401,
      });
    }
    if (
      error instanceof AuthorizationError ||
      error instanceof HttpContextAuthorizationError
    ) {
      return jsonApiError(context, {
        code: "AUTHORIZATION_DENIED",
        error,
        message: error.message,
        status: 403,
      });
    }
    if (error instanceof RoleMembershipNotFoundError) {
      return jsonApiError(context, {
        code: "ROLE_MEMBERSHIP_NOT_FOUND",
        error,
        message: error.message,
        status: 404,
      });
    }
    return jsonApiError(context, {
      code: "INTERNAL_SERVER_ERROR",
      error,
      message: "Internal server error.",
      status: 500,
    });
  }
}

class RolesRequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RolesRequestValidationError";
  }
}
