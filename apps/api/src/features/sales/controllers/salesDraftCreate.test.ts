import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { createMemorySalesRepository } from "../adapters/memory/salesRepository.js";
import { createSalesFeature } from "./sales.controller.js";
import { createSalesServices } from "./salesServices.js";

const storeId = "store-1";
const tenantId = "tenant-1";

describe("sales draft creation idempotency", () => {
  it("resumes the existing open draft instead of duplicating it for a lead", async () => {
    const app = createTestApp();
    const firstResponse = await requestJson(app, "/sales/drafts", {
      buyerSnapshot: { name: "Maria" },
      leadId: "lead-1",
    });
    const first = await readJson<TestSale>(firstResponse);

    const secondResponse = await requestJson(app, "/sales/drafts", {
      buyerSnapshot: { name: "Maria" },
      leadId: "lead-1",
    });
    expect(secondResponse.status).toBe(201);
    const second = await readJson<TestSale>(secondResponse);
    expect(second.id).toBe(first.id);

    const listResponse = await app.request("/sales");
    const payload = await readJson<TestSaleList>(listResponse);
    expect(payload.sales).toHaveLength(1);
  });

  it("allows a new draft for a lead once the previous sale is cancelled", async () => {
    const app = createTestApp();
    const firstResponse = await requestJson(app, "/sales/drafts", {
      leadId: "lead-1",
    });
    const first = await readJson<TestSale>(firstResponse);
    await requestJson(app, `/sales/${first.id}/cancel`, {});

    const secondResponse = await requestJson(app, "/sales/drafts", {
      leadId: "lead-1",
    });
    const second = await readJson<TestSale>(secondResponse);
    expect(second.id).not.toBe(first.id);
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
          entitlements: ["sales"],
          permissions: [
            "sale.cancel",
            "sale.close",
            "sale.draft",
            "sale.read",
            "sale.reserve",
          ],
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
  leadId: string | null;
  status: string;
};

type TestSaleList = {
  sales: TestSale[];
};
