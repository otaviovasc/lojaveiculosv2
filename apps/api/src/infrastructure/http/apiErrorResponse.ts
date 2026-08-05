import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { SafeAuditMetadata } from "@lojaveiculosv2/audit";
import {
  sanitizeDiagnosticString,
  toSafeErrorMetadata,
} from "../../shared/errors/errorDescriptor.js";
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
  diagnostics?: SafeAuditMetadata;
  errorName?: string;
  message: string;
  status: number;
};

export function jsonApiError(context: Context, input: ApiErrorResponseInput) {
  const requestId = readHttpRequestId(context) ?? crypto.randomUUID();
  const errorName = readErrorName(input.error);
  const diagnostics =
    input.error === undefined
      ? undefined
      : toSafeErrorMetadata(input.error, {
          boundary: "http",
          code: input.code,
          httpStatus: input.status,
        });

  context.set(httpErrorMetadataContextKey, {
    code: input.code,
    ...(diagnostics ? { diagnostics } : {}),
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
      ...(context.req.header("x-causation-id")
        ? { causationId: context.req.header("x-causation-id") }
        : {}),
      event: "request.internal_error",
      code: input.code,
      ...(input.error === undefined
        ? {}
        : toSafeErrorMetadata(input.error, {
            boundary: "http",
            code: input.code,
            httpStatus: input.status,
          })),
      level: "error",
      method: context.req.method,
      path: sanitizeHttpPath(context.req.path),
      requestId,
      ...(context.req.header("idempotency-key")
        ? { idempotencyKey: context.req.header("idempotency-key") }
        : {}),
      schema: observabilitySchemas.httpLog,
      service: "api",
      status: input.status,
      timestamp: new Date().toISOString(),
      errorName: error.name,
      errorMessage: sanitizeDiagnosticString(error.message),
      stack: error.stack ? sanitizeDiagnosticString(error.stack, 8_000) : null,
    }),
  );
}
