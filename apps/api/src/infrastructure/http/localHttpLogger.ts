import type { MiddlewareHandler } from "hono";
import {
  sanitizeDiagnosticString,
  toSafeErrorMetadata,
} from "../../shared/errors/errorDescriptor.js";
import { observabilitySchemas } from "../../shared/observabilityOntology.js";
import { readHttpErrorMetadata } from "./apiErrorResponse.js";
import { readHttpRequestId } from "./requestMetadata.js";
import { sanitizeHttpPath } from "./sanitizeHttpPath.js";

export function createLocalHttpLogger(): MiddlewareHandler {
  return async (context, next) => {
    if (!shouldLogHttpRequests()) {
      await next();
      return;
    }

    const startedAt = performance.now();
    const requestId = readHttpRequestId(context) ?? crypto.randomUUID();

    try {
      await next();
    } catch (error) {
      logHttpRequest({
        context,
        error,
        requestId,
        startedAt,
        status: 500,
      });
      throw error;
    }

    logHttpRequest({
      context,
      requestId,
      startedAt,
      status: context.res.status,
    });
  };
}

function shouldLogHttpRequests(): boolean {
  if (process.env.LOG_HTTP_REQUESTS === "false") return false;
  if (process.env.LOG_HTTP_REQUESTS === "true") return true;
  return process.env.APP_ENV !== "test";
}

function logHttpRequest({
  context,
  error,
  requestId,
  startedAt,
  status,
}: {
  context: Parameters<MiddlewareHandler>[0];
  error?: unknown;
  requestId: string;
  startedAt: number;
  status: number;
}) {
  const metadata = readHttpErrorMetadata(context);
  const failed = status >= 400;
  const normalizedError = error ?? context.error;
  const correlationId = context.req.header("x-correlation-id") ?? requestId;
  const causationId = context.req.header("x-causation-id");
  const idempotencyKey = context.req.header("idempotency-key");
  const diagnostics =
    metadata?.diagnostics ??
    (normalizedError === undefined
      ? {}
      : toSafeErrorMetadata(normalizedError, {
          boundary: "http",
          code: metadata?.code ?? `HTTP_${status}`,
          httpStatus: status,
        }));
  const payload = {
    component: "http",
    correlationId,
    ...(causationId ? { causationId } : {}),
    event: failed ? "request.failed" : "request.completed",
    level: status >= 500 ? "error" : failed ? "warn" : "info",
    method: context.req.method,
    path: sanitizeHttpPath(context.req.path),
    requestId,
    ...(idempotencyKey ? { idempotencyKey } : {}),
    schema: observabilitySchemas.httpLog,
    service: "api",
    status,
    timestamp: new Date().toISOString(),
    tookMs: Math.round(performance.now() - startedAt),
    ...(failed ? { code: metadata?.code ?? `HTTP_${status}` } : {}),
    ...diagnostics,
    ...(metadata?.errorName ? { errorName: metadata.errorName } : {}),
    ...(normalizedError instanceof Error
      ? {
          errorMessage: sanitizeDiagnosticString(normalizedError.message),
          errorName: normalizedError.name,
        }
      : {}),
  };

  const line = JSON.stringify(payload);
  if (status >= 500) {
    console.error(line);
  } else if (failed) {
    console.warn(line);
  } else {
    console.info(line);
  }
}
