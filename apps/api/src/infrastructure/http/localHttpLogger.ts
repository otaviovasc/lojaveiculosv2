import type { MiddlewareHandler } from "hono";
import { readHttpRequestId } from "./requestMetadata.js";

export function createLocalHttpLogger(): MiddlewareHandler {
  return async (context, next) => {
    if (!shouldLogHttpRequests()) {
      await next();
      return;
    }

    const startedAt = performance.now();
    const requestId = readHttpRequestId(context) ?? crypto.randomUUID();

    await next();

    console.info(
      JSON.stringify({
        component: "http",
        event: "request.completed",
        method: context.req.method,
        path: context.req.path,
        requestId,
        status: context.res.status,
        tookMs: Math.round(performance.now() - startedAt),
      }),
    );
  };
}

function shouldLogHttpRequests(): boolean {
  return process.env.APP_ENV === "local";
}
