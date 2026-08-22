import type { MiddlewareHandler } from "hono";
import { observabilitySchemas } from "../../shared/observabilityOntology.js";
import type { ExternalApiRepository } from "../../domains/externalApi/ports/externalApiRepository.js";
import {
  externalApiContextKey,
  type ExternalApiHttpContextMetadata,
} from "./externalApiHttpContext.js";
import {
  ExternalApiReplaySnapshotError,
  readExternalApiReplaySnapshot,
} from "./externalApiReplaySnapshot.js";

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
        const responseMs = Date.now() - metadata.startedAt;
        if (metadata.ownsIdempotencyReservation) {
          if (failed || context.res.status >= 500) {
            await safelyFailIdempotency(repository, metadata, responseMs);
          } else {
            await completeIdempotency(
              repository,
              metadata,
              context.res,
              responseMs,
            );
          }
        }
        try {
          await repository.recordRequest({
            clientId: metadata.clientId,
            method: metadata.method,
            path: metadata.path,
            requestId: metadata.requestId,
            responseMs,
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

async function safelyFailIdempotency(
  repository: ExternalApiRepository,
  metadata: ExternalApiHttpContextMetadata,
  responseMs: number,
) {
  if (!metadata.idempotencyKey || !metadata.requestFingerprint) return;
  try {
    const failed = await repository.failIdempotencyKey({
      clientId: metadata.clientId,
      idempotencyKey: metadata.idempotencyKey,
      requestFingerprint: metadata.requestFingerprint,
      responseMs,
      statusCode: 500,
    });
    if (!failed) {
      throw new Error("External API idempotency failure was not persisted.");
    }
  } catch (error) {
    logIdempotencyError(
      metadata,
      error,
      "external_api.idempotency_fail_failed",
    );
  }
}

async function completeIdempotency(
  repository: ExternalApiRepository,
  metadata: ExternalApiHttpContextMetadata,
  response: Response,
  responseMs: number,
) {
  if (!metadata.idempotencyKey || !metadata.requestFingerprint) return;
  let replay: Awaited<ReturnType<typeof readExternalApiReplaySnapshot>>;
  try {
    replay = await readExternalApiReplaySnapshot(response);
  } catch (error) {
    if (!(error instanceof ExternalApiReplaySnapshotError)) throw error;
    const failed = await repository.failIdempotencyKey({
      clientId: metadata.clientId,
      idempotencyKey: metadata.idempotencyKey,
      requestFingerprint: metadata.requestFingerprint,
      responseMs,
      statusCode: response.status,
    });
    if (!failed) {
      throw new Error("Non-replayable response state was not persisted.");
    }
    logIdempotencyError(
      metadata,
      error,
      "external_api.idempotency_response_not_replayable",
    );
    return;
  }

  const completed = await repository.completeIdempotencyKey({
    ...replay,
    clientId: metadata.clientId,
    idempotencyKey: metadata.idempotencyKey,
    requestFingerprint: metadata.requestFingerprint,
    responseMs,
    statusCode: response.status,
  });
  if (!completed) {
    throw new Error("External API idempotency completion lost ownership.");
  }
}

function logIdempotencyError(
  metadata: ExternalApiHttpContextMetadata,
  error: unknown,
  event: string,
) {
  console.error(
    JSON.stringify({
      component: "external_api",
      errorMessage: error instanceof Error ? error.message : String(error),
      event,
      level: "error",
      requestId: metadata.requestId,
      schema: observabilitySchemas.serviceLog,
      service: "api",
      timestamp: new Date().toISOString(),
    }),
  );
}
