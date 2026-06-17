import type { Context } from "hono";
import { createNoopAuditSink } from "../../shared/auditSink.js";
import {
  createServiceContext,
  type ServiceContext,
} from "../../shared/serviceContext.js";
import { createConsoleServiceLogger } from "../../shared/serviceLogger.js";

export function createPlaceholderServiceContext(
  context: Context,
): ServiceContext {
  const requestId = context.req.header("x-request-id") ?? crypto.randomUUID();
  const correlationId = context.req.header("x-correlation-id") ?? requestId;
  const ipAddress =
    context.req.header("x-forwarded-for") ?? context.req.header("x-real-ip");
  const userAgent = context.req.header("user-agent");

  return createServiceContext({
    actor: { id: "public", kind: "public" },
    audit: createNoopAuditSink(),
    logger: createConsoleServiceLogger({ correlationId, requestId }),
    permissions: ["public"],
    request: {
      correlationId,
      method: context.req.method,
      path: context.req.path,
      requestId,
      ...(ipAddress ? { ipAddress } : {}),
      ...(userAgent ? { userAgent } : {}),
    },
    source: {
      component: "http",
      service: "api",
    },
    storeId: null,
    tenantId: null,
  });
}
