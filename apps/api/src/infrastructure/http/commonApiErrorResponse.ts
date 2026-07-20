import type { Context } from "hono";
import { AuthorizationError } from "../../shared/authorization.js";
import {
  jsonApiError,
  type ApiErrorResponseInput,
} from "./apiErrorResponse.js";
import {
  HttpContextAuthenticationError,
  HttpContextAuthorizationError,
  HttpContextRequestPolicyError,
} from "./createHttpServiceContext.js";

export type ControllerErrorMapper = (
  error: unknown,
) => ApiErrorResponseInput | null;

export function apiErrorInput(
  error: Error,
  code: string,
  status: ApiErrorResponseInput["status"],
): ApiErrorResponseInput {
  return { code, error, message: error.message, status };
}

export async function handleControllerAction(
  context: Context,
  action: () => Promise<Response>,
  mapError: ControllerErrorMapper,
): Promise<Response> {
  try {
    return await action();
  } catch (error) {
    const mappedError = mapError(error) ?? commonApiErrorInput(error);
    if (mappedError) return jsonApiError(context, mappedError);

    return jsonApiError(context, {
      code: "INTERNAL_SERVER_ERROR",
      error,
      message: "Internal server error.",
      status: 500,
    });
  }
}

export function commonApiErrorResponse(
  context: Context,
  error: unknown,
): Response | null {
  const mappedError = commonApiErrorInput(error);
  return mappedError ? jsonApiError(context, mappedError) : null;
}

function commonApiErrorInput(error: unknown): ApiErrorResponseInput | null {
  if (error instanceof HttpContextAuthenticationError) {
    return {
      code: "HTTP_AUTHENTICATION_REQUIRED",
      error,
      message: error.message,
      status: 401,
    };
  }
  if (
    error instanceof AuthorizationError ||
    error instanceof HttpContextAuthorizationError
  ) {
    return {
      code: "AUTHORIZATION_DENIED",
      error,
      message: error.message,
      status: 403,
    };
  }
  if (error instanceof HttpContextRequestPolicyError) {
    return {
      code: "HTTP_REQUEST_POLICY_ERROR",
      error,
      message: error.message,
      status: error.statusCode,
    };
  }
  return null;
}
