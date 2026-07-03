import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { createMemorySalesRepository } from "../adapters/memory/salesRepository.js";
import { createSalesFeature } from "./sales.controller.js";
import { createSalesServices } from "./salesServices.js";

const storeId = "store-1";
const tenantId = "tenant-1";

describe("sales controller delete", () => {
  it("deletes draft sales", async () => {
    const app = createTestApp();
    const createResponse = await requestJson(app, "/sales/drafts", {
      buyerSnapshot: { name: "Maria" },
      leadId: "lead-1",
    });
    const created = await readJson<TestSale>(createResponse);

    const deleteResponse = await app.request(`/sales/${created.id}`, {
      method: "DELETE",
    });

    expect(deleteResponse.status).toBe(204);
    const listResponse = await app.request("/sales");
    const payload = await readJson<TestSaleList>(listResponse);
    expect(payload.sales).toHaveLength(0);
  });

  it("rejects deleting sales that are no longer drafts", async () => {
    const app = createTestApp();
    const createResponse = await requestJson(app, "/sales/drafts", {
      buyerSnapshot: { name: "Maria" },
      leadId: "lead-1",
    });
    const created = await readJson<TestSale>(createResponse);
    await requestJson(app, `/sales/${created.id}/cancel`, {});

    const deleteResponse = await app.request(`/sales/${created.id}`, {
      method: "DELETE",
    });

    expect(deleteResponse.status).toBe(409);
    expect(await readJson<{ code: string }>(deleteResponse)).toMatchObject({
      code: "SALE_DRAFT_DELETE_STATE_ERROR",
    });
  });
});

function createTestApp() {
  const app = new Hono();
  const services = createSalesServices({
    ports: { salesRepository: createMemorySalesRepository() },
  });
  app.route(
    "/sales",
    createSalesFeature({
      contextFactory: async () =>
        createServiceContext({
          actor: { id: "user-1", kind: "user" },
          permissions: ["sale.cancel", "sale.draft", "sale.read"],
          request: { requestId: "test-request" },
          storeId,
          tenantId,
        }),
      services,
    }),
  );
  return app;
}

function requestJson(app: Hono, path: string, body: unknown) {
  return app.request(path, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

type TestSale = {
  id: string;
};

type TestSaleList = {
  sales: TestSale[];
};
