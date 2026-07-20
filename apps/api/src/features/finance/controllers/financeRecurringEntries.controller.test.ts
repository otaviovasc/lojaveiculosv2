import { describe, expect, it } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { createFinanceFeature } from "./finance.controller.js";
import { createFinanceServices } from "./financeServices.js";

describe("finance recurring entry routes", () => {
  it("updates a recurring template and returns the bare entry", async () => {
    const feature = createFeature();
    const created = await createRecurring(feature);

    const updateResponse = await request(
      feature,
      `/recurring-entries/${created.id}`,
      {
        body: { amountCents: 22000, name: "Aluguel reajustado" },
        method: "PATCH",
        storeId: "store_a",
      },
    );

    expect(updateResponse.status).toBe(200);
    const updated = await json<Record<string, unknown>>(updateResponse);
    expect(updated).toMatchObject({
      amountCents: 22000,
      category: "Aluguel",
      frequency: "monthly",
      id: created.id,
      name: "Aluguel reajustado",
      status: "pending",
      storeId: "store_a",
      tenantId: "tenant_1",
    });
    expect(updated.entry).toBeUndefined();

    const listResponse = await request(feature, "/recurring-entries", {
      method: "GET",
      storeId: "store_a",
    });
    const list = await json<{
      recurringEntries: Array<{ id: string; name: string }>;
    }>(listResponse);
    expect(list.recurringEntries).toEqual([
      expect.objectContaining({ id: created.id, name: "Aluguel reajustado" }),
    ]);
  });

  it("returns 404 when updating an unknown recurring template", async () => {
    const feature = createFeature();

    const response = await request(feature, "/recurring-entries/missing", {
      body: { name: "Nao existe" },
      method: "PATCH",
      storeId: "store_a",
    });

    expect(response.status).toBe(404);
    expect(await json(response)).toMatchObject({
      code: "FINANCE_RECURRING_ENTRY_NOT_FOUND",
    });
  });

  it("cancels a recurring template with an optional reason", async () => {
    const feature = createFeature();
    const created = await createRecurring(feature);

    const cancelResponse = await request(
      feature,
      `/recurring-entries/${created.id}?reason=Contrato%20encerrado`,
      { method: "DELETE", storeId: "store_a" },
    );

    expect(cancelResponse.status).toBe(200);
    expect(await json(cancelResponse)).toMatchObject({
      id: created.id,
      metadata: { cancelledReason: "Contrato encerrado", occurrences: 12 },
      status: "cancelled",
    });

    const withoutReason = await request(
      feature,
      `/recurring-entries/${created.id}`,
      { method: "DELETE", storeId: "store_a" },
    );
    expect(await json(withoutReason)).toMatchObject({
      metadata: { cancelledReason: "deleted" },
      status: "cancelled",
    });
  });

  it("materializes due occurrences idempotently", async () => {
    const feature = createFeature();
    const created = await createRecurring(feature, {
      metadata: {},
      nextDueAt: "2026-01-10T00:00:00.000Z",
    });

    const materializeResponse = await request(
      feature,
      "/recurring-entries/materialize",
      {
        body: { asOf: "2026-02-15T00:00:00.000Z" },
        method: "POST",
        storeId: "store_a",
      },
    );

    expect(materializeResponse.status).toBe(200);
    const materialized = await json<{
      generatedEntries: Array<{
        dueAt: string;
        metadata: Record<string, unknown>;
        status: string;
      }>;
    }>(materializeResponse);
    expect(materialized.generatedEntries).toHaveLength(2);
    expect(materialized.generatedEntries.map((entry) => entry.dueAt)).toEqual([
      "2026-01-10T00:00:00.000Z",
      "2026-02-10T00:00:00.000Z",
    ]);
    expect(materialized.generatedEntries[0]).toMatchObject({
      metadata: {
        recurringEntryId: created.id,
        source: "finance_recurring",
      },
      status: "pending",
    });

    const rerun = await request(feature, "/recurring-entries/materialize", {
      body: { asOf: "2026-02-15T00:00:00.000Z" },
      method: "POST",
      storeId: "store_a",
    });
    expect(await json(rerun)).toEqual({ generatedEntries: [] });
  });

  it("accepts an empty object body when nothing is due", async () => {
    const feature = createFeature();

    const response = await request(feature, "/recurring-entries/materialize", {
      body: {},
      method: "POST",
      storeId: "store_a",
    });

    expect(response.status).toBe(200);
    expect(await json(response)).toEqual({ generatedEntries: [] });
  });

  it("requires finance.update for template mutations and finance.create to materialize", async () => {
    const feature = createFeature();
    const created = await createRecurring(feature);

    const deniedUpdate = await request(
      feature,
      `/recurring-entries/${created.id}`,
      {
        body: { name: "Sem permissao" },
        method: "PATCH",
        mode: "read_only",
        storeId: "store_a",
      },
    );
    expect(deniedUpdate.status).toBe(403);

    const deniedCancel = await request(
      feature,
      `/recurring-entries/${created.id}`,
      { method: "DELETE", mode: "read_only", storeId: "store_a" },
    );
    expect(deniedCancel.status).toBe(403);

    const deniedMaterialize = await request(
      feature,
      "/recurring-entries/materialize",
      { body: {}, method: "POST", mode: "read_only", storeId: "store_a" },
    );
    expect(deniedMaterialize.status).toBe(403);
  });
});

function createFeature() {
  const services = createFinanceServices();
  return createFinanceFeature({
    contextFactory: async (context) =>
      createServiceContext({
        actor: { id: "user_1", kind: "user" },
        permissions:
          context.req.header("x-mode") === "read_only"
            ? ["finance.read"]
            : ["finance.create", "finance.read", "finance.update"],
        request: { requestId: "request_1" },
        storeId: context.req.header("x-store-id") ?? "store_a",
        tenantId: "tenant_1",
      }),
    services,
  });
}

async function createRecurring(
  feature: ReturnType<typeof createFinanceFeature>,
  overrides: Record<string, unknown> = {},
): Promise<{ id: string }> {
  const response = await request(feature, "/recurring-entries", {
    body: {
      amountCents: 15000,
      category: "Aluguel",
      dayOfMonth: 10,
      frequency: "monthly",
      metadata: { occurrences: 12 },
      name: "Aluguel",
      nextDueAt: "2026-08-10T00:00:00.000Z",
      type: "expense",
      ...overrides,
    },
    method: "POST",
    storeId: "store_a",
  });
  expect(response.status).toBe(201);
  return json<{ id: string }>(response);
}

async function request(
  feature: ReturnType<typeof createFinanceFeature>,
  path: string,
  input: {
    body?: Record<string, unknown>;
    method: "DELETE" | "GET" | "PATCH" | "POST";
    mode?: "read_only";
    storeId: string;
  },
) {
  return feature.request(path, {
    ...(input.body ? { body: JSON.stringify(input.body) } : {}),
    headers: {
      "content-type": "application/json",
      "x-store-id": input.storeId,
      ...(input.mode ? { "x-mode": input.mode } : {}),
    },
    method: input.method,
  });
}

async function json<T = Record<string, unknown>>(
  response: Response,
): Promise<T> {
  return (await response.json()) as T;
}
