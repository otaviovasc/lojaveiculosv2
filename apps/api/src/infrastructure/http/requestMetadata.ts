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

export function readHttpRequestHeaders(context: Context) {
  const requestId = readHttpRequestId(context) ?? randomUUID();
  const correlationId = context.req.header("x-correlation-id") ?? requestId;
  const idempotencyKey = context.req.header("idempotency-key");
  const ipAddress =
    context.req.header("x-forwarded-for") ?? context.req.header("x-real-ip");
  const userAgent = context.req.header("user-agent");

  return {
    correlationId,
    method: context.req.method,
    path: context.req.path,
    requestId,
    ...(idempotencyKey ? { idempotencyKey } : {}),
    ...(ipAddress ? { ipAddress } : {}),
    ...(userAgent ? { userAgent } : {}),
  };
}

export function ensureHttpRequestId(context: Context) {
  const requestId = readHttpRequestId(context) ?? randomUUID();
  context.set(requestIdContextKey, requestId);
  context.header("X-Request-Id", requestId);
  return requestId;
}
