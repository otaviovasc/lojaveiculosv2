import type { MiddlewareHandler } from "hono";
import type { ExternalApiRepository } from "../../domains/externalApi/ports/externalApiRepository.js";
import {
  externalApiContextKey,
  type ExternalApiHttpContextMetadata,
} from "./externalApiHttpContext.js";

export function createExternalApiRequestLogger(
  repository?: ExternalApiRepository,
): MiddlewareHandler {
  return async (context, next) => {
    await next();
    if (!repository) return;

    const metadata = context.get(externalApiContextKey) as
      ExternalApiHttpContextMetadata | undefined;
    if (!metadata) return;

    await repository.recordRequest({
      clientId: metadata.clientId,
      method: metadata.method,
      path: metadata.path,
      requestId: metadata.requestId,
      responseMs: Date.now() - metadata.startedAt,
      statusCode: context.res.status,
      storeId: metadata.storeId as never,
      tenantId: metadata.tenantId as never,
      ...(metadata.idempotencyKey
        ? { idempotencyKey: metadata.idempotencyKey }
        : {}),
    });
  };
}
