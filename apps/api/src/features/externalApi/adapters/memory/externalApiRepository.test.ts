import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryExternalApiRepository } from "./externalApiRepository.js";

describe("memory external API repository", () => {
  afterEach(() => vi.useRealTimers());

  it("reports the latest recorded request only for the scoped client", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-22T12:00:00.000Z"));
    const repository = createMemoryExternalApiRepository();
    const first = await createClient(repository, "tenant_1", "store_1");
    const other = await createClient(repository, "tenant_2", "store_2");

    vi.setSystemTime(new Date("2026-08-22T13:45:00.000Z"));
    await repository.recordRequest({
      clientId: first.id,
      method: "GET",
      path: "/api/v1/external-api/vehicles",
      requestId: "request_1",
      responseMs: 24,
      statusCode: 200,
      storeId: "store_1" as never,
      tenantId: "tenant_1" as never,
    });

    await expect(
      repository.listClients({
        storeId: "store_1" as never,
        tenantId: "tenant_1" as never,
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        id: first.id,
        lastUsedAt: new Date("2026-08-22T13:45:00.000Z"),
      }),
    ]);
    await expect(
      repository.listClients({
        storeId: "store_2" as never,
        tenantId: "tenant_2" as never,
      }),
    ).resolves.toEqual([
      expect.objectContaining({ id: other.id, lastUsedAt: null }),
    ]);
  });

  it("allows only one concurrent idempotency reservation", async () => {
    const repository = createMemoryExternalApiRepository();
    const input = {
      clientId: "client_1",
      idempotencyKey: "operation_1",
      method: "POST",
      path: "/api/v1/external-api/leads",
      requestFingerprint: "body_1",
      requestId: "request_1",
      storeId: "store_1" as never,
      tenantId: "tenant_1" as never,
    };

    const reservations = await Promise.all([
      repository.reserveIdempotencyKey(input),
      repository.reserveIdempotencyKey({ ...input, requestId: "request_2" }),
    ]);

    expect(reservations.map((result) => result.kind).sort()).toEqual([
      "created",
      "in_flight",
    ]);
  });

  it("finalizes only the matching owner and cannot overwrite a terminal replay", async () => {
    const repository = createMemoryExternalApiRepository();
    const reservation = idempotencyInput();
    await expect(
      repository.reserveIdempotencyKey(reservation),
    ).resolves.toEqual({ kind: "created" });

    await expect(
      repository.completeIdempotencyKey({
        body: { data: { id: "lead_1" } },
        clientId: reservation.clientId,
        contentType: "application/json",
        idempotencyKey: reservation.idempotencyKey,
        requestFingerprint: reservation.requestFingerprint,
        responseMs: 15,
        statusCode: 201,
      }),
    ).resolves.toBe(true);
    await expect(
      repository.failIdempotencyKey({
        clientId: reservation.clientId,
        idempotencyKey: reservation.idempotencyKey,
        requestFingerprint: reservation.requestFingerprint,
        responseMs: 20,
        statusCode: 500,
      }),
    ).resolves.toBe(false);
    await expect(
      repository.reserveIdempotencyKey(reservation),
    ).resolves.toEqual({
      body: { data: { id: "lead_1" } },
      contentType: "application/json",
      kind: "replay",
      statusCode: 201,
    });
  });
});

function idempotencyInput() {
  return {
    clientId: "client_1",
    idempotencyKey: "operation_1",
    method: "POST",
    path: "/api/v1/external-api/leads",
    requestFingerprint: "POST:/api/v1/external-api/leads:body_1",
    requestId: "request_1",
    storeId: "store_1" as never,
    tenantId: "tenant_1" as never,
  };
}

async function createClient(
  repository: ReturnType<typeof createMemoryExternalApiRepository>,
  tenantId: string,
  storeId: string,
) {
  return repository.createClient({
    keyHash: `hash_${storeId}`,
    keyPrefix: `lv2_${storeId}`,
    name: `Client ${storeId}`,
    scopes: ["inventory.read"],
    storeId: storeId as never,
    tenantId: tenantId as never,
  });
}
