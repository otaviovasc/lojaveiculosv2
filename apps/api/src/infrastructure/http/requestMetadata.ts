import { randomUUID } from "node:crypto";
import type { Context } from "hono";

export const requestIdContextKey = "requestId";

export function readHttpRequestId(context: Context) {
  return (
    (context.get(requestIdContextKey) as string | undefined) ??
    context.req.header("x-request-id") ??
    null
  );
}

export function ensureHttpRequestId(context: Context) {
  const requestId = readHttpRequestId(context) ?? randomUUID();
  context.set(requestIdContextKey, requestId);
  context.header("X-Request-Id", requestId);
  return requestId;
}
