import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { observabilitySchemas } from "../../shared/observabilityOntology.js";
import { readHttpRequestId } from "./requestMetadata.js";
import { sanitizeHttpPath } from "./sanitizeHttpPath.js";

export const httpErrorMetadataContextKey = "httpErrorMetadata";

export type ApiErrorDetails = Record<string, unknown>;

export type ApiErrorResponseInput = {
  code: string;
  details?: ApiErrorDetails;
  error?: unknown;
  message: string;
  status: ContentfulStatusCode;
};

export type HttpErrorMetadata = {
  code: string;
  errorName?: string;
  message: string;
  status: number;
};

export function jsonApiError(context: Context, input: ApiErrorResponseInput) {
  const requestId = readHttpRequestId(context) ?? crypto.randomUUID();
  const errorName = readErrorName(input.error);

  context.set(httpErrorMetadataContextKey, {
    code: input.code,
    ...(errorName ? { errorName } : {}),
    message: input.message,
    status: input.status,
  } satisfies HttpErrorMetadata);

  if (input.status >= 500) {
    const normalizedError = normalizeError(input.error);
    context.error = normalizedError;
    logInternalApiError(context, input, requestId, normalizedError);
  }

  return context.json(
    {
      message: input.message,
      code: input.code,
      requestId,
      ...(input.details ? { details: input.details } : {}),
    },
    input.status,
  );
}

export function readHttpErrorMetadata(
  context: Context,
): HttpErrorMetadata | null {
  return (
    (context.get(httpErrorMetadataContextKey) as
      HttpErrorMetadata | undefined) ?? null
  );
}

function readErrorName(error: unknown): string | undefined {
  if (error instanceof Error) return error.name;
  return undefined;
}

function normalizeError(error: unknown) {
  if (error instanceof Error) return error;
  return new Error(error === undefined ? "Unknown error" : String(error));
}

// Internal (5xx) errors need a dedicated line because the request-completion
// middleware can be disabled for noise control. Log the stack here (the single
// choke point for every formatted API error) so failures remain diagnosable from
// Railway logs. The client response is unchanged.
function logInternalApiError(
  context: Context,
  input: ApiErrorResponseInput,
  requestId: string,
  error: Error,
) {
  console.error(
    JSON.stringify({
      component: "http",
      correlationId: context.req.header("x-correlation-id") ?? requestId,
      event: "request.internal_error",
      code: input.code,
      level: "error",
      method: context.req.method,
      path: sanitizeHttpPath(context.req.path),
      requestId,
      schema: observabilitySchemas.httpLog,
      service: "api",
      status: input.status,
      timestamp: new Date().toISOString(),
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack ?? null,
    }),
  );
}
