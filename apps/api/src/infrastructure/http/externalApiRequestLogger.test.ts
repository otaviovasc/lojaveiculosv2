import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { createMemoryExternalApiRepository } from "../../features/externalApi/adapters/memory/externalApiRepository.js";
import {
  externalApiContextKey,
  type ExternalApiHttpContextMetadata,
} from "./externalApiHttpContext.js";
import { createExternalApiRequestLogger } from "./externalApiRequestLogger.js";

describe("external API idempotency response persistence", () => {
  it("persists a bounded owner response for exact replay", async () => {
    const repository = createMemoryExternalApiRepository();
    const reservation = await repository.reserveIdempotencyKey(input());
    expect(reservation.kind).toBe("created");
    const app = appWithResponse(repository, metadata(true), {
      data: { id: "lead_1", status: "new" },
    });

    const response = await app.request("/api/v1/external-api/leads", {
      method: "POST",
    });

    expect(response.status).toBe(201);
    await expect(repository.reserveIdempotencyKey(input())).resolves.toEqual({
      body: { data: { id: "lead_1", status: "new" } },
      contentType: "application/json",
      kind: "replay",
      statusCode: 201,
    });
  });

  it("does not let an in-flight loser finalize the owner's reservation", async () => {
    const repository = createMemoryExternalApiRepository();
    await repository.reserveIdempotencyKey(input());
    const app = appWithResponse(
      repository,
      metadata(false),
      {
        code: "IDEMPOTENCY_IN_FLIGHT",
      },
      409,
    );

    expect(
      (await app.request("/api/v1/external-api/leads", { method: "POST" }))
        .status,
    ).toBe(409);
    await expect(repository.reserveIdempotencyKey(input())).resolves.toEqual({
      kind: "in_flight",
    });
  });

  it("preserves an oversized response and marks it non-replayable", async () => {
    const repository = createMemoryExternalApiRepository();
    await repository.reserveIdempotencyKey(input());
    const app = appWithResponse(repository, metadata(true), {
      data: "x".repeat(300_000),
    });

    const response = await app.request("/api/v1/external-api/leads", {
      method: "POST",
    });

    expect(response.status).toBe(201);
    const body = (await response.json()) as { data: string };
    expect(body.data).toHaveLength(300_000);
    await expect(repository.reserveIdempotencyKey(input())).resolves.toEqual({
      kind: "failed",
      statusCode: 201,
    });
  });
});

function appWithResponse(
  repository: ReturnType<typeof createMemoryExternalApiRepository>,
  requestMetadata: ExternalApiHttpContextMetadata,
  body: unknown,
  status: 201 | 409 = 201,
) {
  const app = new Hono<{
    Variables: {
      [externalApiContextKey]: ExternalApiHttpContextMetadata;
    };
  }>();
  app.use("/api/v1/*", createExternalApiRequestLogger(repository));
  app.post("/api/v1/external-api/leads", (context) => {
    context.set(externalApiContextKey, requestMetadata);
    return context.json(body, status);
  });
  return app;
}

function input() {
  return {
    clientId: "client_1",
    idempotencyKey: "lead-create-1",
    method: "POST",
    path: "/api/v1/external-api/leads",
    requestFingerprint: "POST:/api/v1/external-api/leads:body_digest",
    requestId: "request_1",
    storeId: "store_1" as never,
    tenantId: "tenant_1" as never,
  };
}

function metadata(
  ownsIdempotencyReservation: boolean,
): ExternalApiHttpContextMetadata {
  return {
    clientId: "client_1",
    idempotencyKey: "lead-create-1",
    method: "POST",
    ownsIdempotencyReservation,
    path: "/api/v1/external-api/leads",
    requestFingerprint: input().requestFingerprint,
    requestId: "request_1",
    startedAt: Date.now(),
    storeId: "store_1",
    tenantId: "tenant_1",
  };
}
