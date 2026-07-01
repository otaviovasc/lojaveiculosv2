import type { MiddlewareHandler } from "hono";
import { readHttpErrorMetadata } from "./apiErrorResponse.js";
import { readHttpRequestId } from "./requestMetadata.js";

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
  return process.env.APP_ENV === "local";
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
  const payload = {
    component: "http",
    event: failed ? "request.failed" : "request.completed",
    method: context.req.method,
    path: context.req.path,
    requestId,
    status,
    tookMs: Math.round(performance.now() - startedAt),
    ...(failed ? { code: metadata?.code ?? `HTTP_${status}` } : {}),
    ...(metadata?.errorName ? { errorName: metadata.errorName } : {}),
    ...(error instanceof Error ? { errorName: error.name } : {}),
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
