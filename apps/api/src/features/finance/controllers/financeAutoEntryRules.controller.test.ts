import { describe, expect, it } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { createFinanceFeature } from "./finance.controller.js";
import { createFinanceServices } from "./financeServices.js";

describe("finance auto-entry rule routes", () => {
  it("uses canonical envelopes and soft-deactivates scoped rules", async () => {
    const feature = createFeature();
    const createResponse = await request(feature, "/auto-entry-rules", {
      body: {
        calculation: { basis: "sale", basisPoints: 250, kind: "percentage" },
        category: "Comissão",
        conditions: { standardCommissionEnabled: true },
        event: "vehicle_sale_closed",
        name: "Comissão da venda",
        outputType: "commission",
        priority: 20,
        timing: { days: 2, kind: "days_after" },
      },
      method: "POST",
      storeId: "store_a",
    });
    expect(createResponse.status).toBe(201);
    const created = await json<{
      rule: { id: unknown; [key: string]: unknown };
    }>(createResponse);
    expect(Object.keys(created)).toEqual(["rule"]);
    expect(created.rule).toMatchObject({
      conditions: { standardCommissionEnabled: true },
      event: "vehicle_sale_closed",
      priority: 20,
      status: "active",
      storeId: "store_a",
    });

    const ruleId = String(created.rule.id);
    const pausedResponse = await request(feature, "/auto-entry-rules", {
      body: {
        calculation: { amountCents: 500, kind: "fixed" },
        event: "vehicle_sale_closed",
        outputType: "commission",
        status: "inactive",
        timing: { kind: "same_day" },
      },
      method: "POST",
      storeId: "store_a",
    });
    const paused = await json<{
      rule: { category: string; id: unknown; name: string };
    }>(pausedResponse);
    expect(paused.rule.category).toBe("Comissão");
    expect(paused.rule.name.length).toBeGreaterThan(0);
    const updateResponse = await request(
      feature,
      `/auto-entry-rules/${ruleId}`,
      { body: { priority: 80 }, method: "PATCH", storeId: "store_a" },
    );
    expect(await json(updateResponse)).toMatchObject({
      rule: { id: ruleId, priority: 80 },
    });

    const otherStoreResponse = await request(feature, "/auto-entry-rules", {
      method: "GET",
      storeId: "store_b",
    });
    const otherStore = await json<{
      rules: Array<{ metadata: { systemDefault?: boolean }; storeId: string }>;
    }>(otherStoreResponse);
    expect(otherStore.rules).toHaveLength(13);
    expect(
      otherStore.rules.some(
        (rule) =>
          rule.storeId === "store_b" && rule.metadata.systemDefault === true,
      ),
    ).toBe(true);

    const deleteResponse = await request(
      feature,
      `/auto-entry-rules/${ruleId}`,
      { method: "DELETE", storeId: "store_a" },
    );
    expect(deleteResponse.status).toBe(200);
    expect(await json(deleteResponse)).toMatchObject({
      rule: { id: ruleId, status: "inactive" },
    });

    const afterDelete = await request(feature, "/auto-entry-rules", {
      method: "GET",
      storeId: "store_a",
    });
    const afterDeleteBody = await json<{
      rules: Array<{ id: unknown; status: string }>;
    }>(afterDelete);
    expect(afterDeleteBody.rules).toHaveLength(14);
    expect(afterDeleteBody.rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: paused.rule.id, status: "inactive" }),
      ]),
    );
  });

  it("requires manage permission for mutations but finance.read for GET", async () => {
    const feature = createFeature();
    const denied = await request(feature, "/auto-entry-rules", {
      body: {
        calculation: { amountCents: 1000, kind: "fixed" },
        event: "insurance_issued",
        outputType: "revenue",
        timing: { kind: "same_day" },
      },
      method: "POST",
      mode: "read_only",
      storeId: "store_a",
    });
    expect(denied.status).toBe(403);

    const list = await request(feature, "/auto-entry-rules", {
      method: "GET",
      mode: "read_only",
      storeId: "store_a",
    });
    expect(list.status).toBe(200);
    expect(
      (
        await json<{ rules: Array<{ metadata: { systemDefault?: boolean } }> }>(
          list,
        )
      ).rules,
    ).toHaveLength(13);
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
            : ["finance.auto_entries.manage", "finance.read"],
        request: { requestId: "request_1" },
        storeId: context.req.header("x-store-id") ?? "store_a",
        tenantId: "tenant_1",
      }),
    services,
  });
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
