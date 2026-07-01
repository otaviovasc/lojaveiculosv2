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
    context.error = normalizeError(input.error);
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
