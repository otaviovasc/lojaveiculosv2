import type { Context } from "hono";
import type { AuditRequestContext, AuditSink } from "@lojaveiculosv2/audit";
import { createNoopAuditSink } from "../../shared/auditSink.js";
import {
  createServiceContext,
  type ServiceContext,
} from "../../shared/serviceContext.js";
import {
  createConsoleServiceLogger,
  type ServiceLogger,
} from "../../shared/serviceLogger.js";
import { sanitizeHttpPath } from "./sanitizeHttpPath.js";

export function createPlaceholderServiceContext(
  context: Context,
  options: {
    audit?: AuditSink;
    logger?: ServiceLogger;
    request?: AuditRequestContext;
  } = {},
): ServiceContext {
  const request =
    options.request ??
    (() => {
      const requestId =
        context.req.header("x-request-id") ?? crypto.randomUUID();
      const correlationId = context.req.header("x-correlation-id") ?? requestId;
      const ipAddress =
        context.req.header("x-forwarded-for") ??
        context.req.header("x-real-ip");
      const userAgent = context.req.header("user-agent");

      return {
        correlationId,
        method: context.req.method,
        path: sanitizeHttpPath(context.req.path),
        requestId,
        ...(ipAddress ? { ipAddress } : {}),
        ...(userAgent ? { userAgent } : {}),
      };
    })();

  return createServiceContext({
    actor: { id: "public", kind: "public" },
    audit: options.audit ?? createNoopAuditSink(),
    logger:
      options.logger ??
      createConsoleServiceLogger({
        correlationId: request.correlationId ?? request.requestId,
        requestId: request.requestId,
        service: "api",
      }),
    permissions: [
      "public",
      "public_storefront.lead_create",
      "public_storefront.read",
    ],
    request,
    source: {
      component: "http",
      environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? "unknown",
      service: "api",
    },
    storeId: null,
    tenantId: null,
  });
}
