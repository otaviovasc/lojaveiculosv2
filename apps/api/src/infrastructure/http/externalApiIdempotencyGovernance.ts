import { externalApiRuntimeOperations } from "@lojaveiculosv2/shared";
import type { ExternalApiRepository } from "../../domains/externalApi/ports/externalApiRepository.js";
import type { ServiceRequestContext } from "../../shared/serviceContext.js";
import { ExternalApiIdempotencyReplay } from "./externalApiIdempotencyReplay.js";
import { HttpContextRequestPolicyError } from "./httpContextErrors.js";

export async function enforceExternalApiGovernance(input: {
  clientId: string;
  repository: ExternalApiRepository;
  request: ServiceRequestContext;
  requestFingerprint?: string;
  storeId: string;
  tenantId: string;
}): Promise<string | null> {
  const limit = Number(process.env.EXTERNAL_API_RATE_LIMIT_PER_MINUTE ?? 120);
  const recentRequests = await input.repository.countRecentRequests({
    clientId: input.clientId,
    since: new Date(Date.now() - 60_000),
  });
  if (recentRequests >= limit) {
    throw new HttpContextRequestPolicyError(
      "External API rate limit exceeded.",
      429,
    );
  }

  const method = input.request.method ?? "GET";
  if (!requiresIdempotencyKey(method, input.request.path ?? "/")) return null;
  const idempotencyKey = input.request.idempotencyKey;
  if (!idempotencyKey) {
    throw new HttpContextRequestPolicyError(
      "External API mutations require Idempotency-Key header.",
      400,
    );
  }
  if (!input.requestFingerprint) {
    throw new HttpContextRequestPolicyError(
      "External API mutations require a validated request fingerprint.",
      400,
    );
  }

  const requestFingerprint = createRequestFingerprint(
    input.request,
    input.requestFingerprint,
  );
  const reservation = await input.repository.reserveIdempotencyKey({
    clientId: input.clientId,
    idempotencyKey,
    method,
    path: input.request.path ?? "/",
    requestFingerprint,
    requestId: input.request.requestId,
    storeId: input.storeId as never,
    tenantId: input.tenantId as never,
  });

  if (reservation.kind === "conflict") {
    throw new HttpContextRequestPolicyError(
      "Idempotency-Key was already used for a different request.",
      409,
    );
  }
  if (reservation.kind === "replay") {
    throw new ExternalApiIdempotencyReplay(
      reservation.body,
      reservation.contentType,
      reservation.statusCode,
    );
  }
  if (reservation.kind === "in_flight") {
    throw new HttpContextRequestPolicyError(
      "An identical request with this Idempotency-Key is still in progress.",
      409,
    );
  }
  if (reservation.kind === "failed") {
    throw new HttpContextRequestPolicyError(
      "The previous request with this Idempotency-Key failed; retry with a new key.",
      409,
    );
  }
  return requestFingerprint;
}

function createRequestFingerprint(
  request: ServiceRequestContext,
  validatedPayloadFingerprint: string,
): string {
  return [
    request.method ?? "GET",
    request.path ?? "/",
    validatedPayloadFingerprint,
  ].join(":");
}

const nonMutatingExternalApiPostPaths = new Set<string>(
  externalApiRuntimeOperations
    .filter(
      (operation) =>
        operation.method === "POST" && operation.scope.endsWith(".read"),
    )
    .map((operation) => operation.path),
);

function requiresIdempotencyKey(method: string, path: string): boolean {
  const normalizedMethod = method.toUpperCase();
  if (
    normalizedMethod === "POST" &&
    nonMutatingExternalApiPostPaths.has(path)
  ) {
    return false;
  }
  return ["DELETE", "PATCH", "POST", "PUT"].includes(normalizedMethod);
}
