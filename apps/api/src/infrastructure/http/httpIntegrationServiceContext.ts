import type { AuditSink } from "@lojaveiculosv2/audit";
import type { PermissionKey } from "@lojaveiculosv2/shared";
import type { Context } from "hono";
import { createServiceContext } from "../../shared/serviceContext.js";
import type {
  ServiceContext,
  ServiceLogger,
} from "../../shared/serviceContext.js";
import { createConsoleServiceLogger } from "../../shared/serviceLogger.js";
import { readHttpRequestHeaders } from "./requestMetadata.js";

export function createHttpIntegrationServiceContext(
  context: Context,
  input: {
    actorId: string;
    displayName?: string;
    permissions: readonly PermissionKey[];
    storeId?: string | null;
    tenantId?: string | null;
  },
  options: { audit?: AuditSink; logger?: ServiceLogger } = {},
): ServiceContext {
  const request = readHttpRequestHeaders(context);
  const logger =
    options.logger ??
    createConsoleServiceLogger({
      correlationId: request.correlationId,
      requestId: request.requestId,
    });

  return createServiceContext({
    actor: {
      ...(input.displayName ? { displayName: input.displayName } : {}),
      id: input.actorId,
      kind: "integration",
    },
    ...(options.audit ? { audit: options.audit } : {}),
    logger,
    permissions: input.permissions,
    request,
    source: { component: "http-webhook", service: "api" },
    storeId: input.storeId ?? null,
    tenantId: input.tenantId ?? null,
  });
}
