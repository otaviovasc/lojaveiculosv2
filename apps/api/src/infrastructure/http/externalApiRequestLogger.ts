import type { MiddlewareHandler } from "hono";
import { observabilitySchemas } from "../../shared/observabilityOntology.js";
import type { ExternalApiRepository } from "../../domains/externalApi/ports/externalApiRepository.js";
import {
  externalApiContextKey,
  type ExternalApiHttpContextMetadata,
} from "./externalApiHttpContext.js";

export function createExternalApiRequestLogger(
  repository?: ExternalApiRepository,
): MiddlewareHandler {
  return async (context, next) => {
    let failed = false;
    try {
      await next();
    } catch (error) {
      failed = true;
      throw error;
    } finally {
      const metadata = context.get(externalApiContextKey) as
        ExternalApiHttpContextMetadata | undefined;
      if (repository && metadata) {
        try {
          await repository.recordRequest({
            clientId: metadata.clientId,
            method: metadata.method,
            path: metadata.path,
            requestId: metadata.requestId,
            responseMs: Date.now() - metadata.startedAt,
            statusCode: failed ? 500 : context.res.status,
            storeId: metadata.storeId as never,
            tenantId: metadata.tenantId as never,
            ...(metadata.idempotencyKey
              ? { idempotencyKey: metadata.idempotencyKey }
              : {}),
          });
        } catch (recordError) {
          console.error(
            JSON.stringify({
              component: "external_api",
              errorMessage:
                recordError instanceof Error
                  ? recordError.message
                  : String(recordError),
              errorName:
                recordError instanceof Error ? recordError.name : "Error",
              event: "external_api.request_log_failed",
              level: "error",
              requestId: metadata.requestId,
              schema: observabilitySchemas.serviceLog,
              service: "api",
              timestamp: new Date().toISOString(),
            }),
          );
        }
      }
    }
  };
}
