import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { readHttpRequestId } from "./requestMetadata.js";

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

// Internal (5xx) errors are otherwise invisible in staging/production: the
// per-request HTTP logger only runs when APP_ENV === "local", so a 500 leaves no
// server-side trace to pair with the requestId returned to the client. Log the
// stack here (the single choke point for every formatted API error) so failures
// are diagnosable from Railway logs. The client response is unchanged.
function logInternalApiError(
  context: Context,
  input: ApiErrorResponseInput,
  requestId: string,
  error: Error,
) {
  console.error(
    JSON.stringify({
      component: "http",
      event: "request.internal_error",
      code: input.code,
      method: context.req.method,
      path: context.req.path,
      requestId,
      status: input.status,
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack ?? null,
    }),
  );
}
