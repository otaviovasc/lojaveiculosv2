import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { createSalesFeature } from "./sales.controller.js";

const storeId = "store-1";
const tenantId = "tenant-1";

describe("sales controller", () => {
  it("creates and lists sale drafts", async () => {
    const app = createTestApp();
    const createResponse = await requestJson(app, "/sales/drafts", {
      buyerSnapshot: { name: "Maria" },
      leadId: "lead-1",
    });

    expect(createResponse.status).toBe(201);
    const created = await readJson<TestSale>(createResponse);
    expect(created.status).toBe("draft");
    expect(created.leadId).toBe("lead-1");

    const listResponse = await app.request("/sales");
    expect(listResponse.status).toBe(200);
    const payload = await readJson<TestSaleList>(listResponse);
    expect(payload.sales).toHaveLength(1);
    const listed = payload.sales[0];
    if (!listed) throw new Error("Expected sale in list response.");
    expect(listed.id).toBe(created.id);
  });

  it("blocks reserve when required fields are missing", async () => {
    const app = createTestApp();
    const createResponse = await requestJson(app, "/sales/drafts", {
      salePriceCents: 5000000,
      unitId: "unit-1",
    });
    const created = await readJson<TestSale>(createResponse);

    const reserveResponse = await requestJson(
      app,
      `/sales/${created.id}/reserve`,
      {},
    );
    expect(reserveResponse.status).toBe(409);
    const payload = await readJson<TestReadinessError>(reserveResponse);
    expect(payload.missingFields).toContain("lead");
    expect(payload.missingFields).toContain("seller");
    expect(payload.missingFields).toContain("payment_principal_coverage");
  });

  it("reserves complete sale drafts", async () => {
    const app = createTestApp();
    const createResponse = await requestJson(app, "/sales/drafts", {
      documentPolicySnapshot: {
        requiredDocumentKinds: ["sale_contract"],
      },
      leadId: "lead-1",
      payments: [
        {
          amountCents: 5000000,
          method: "pix",
          principalCents: 5000000,
        },
      ],
      salePriceCents: 5000000,
      selectedDocumentKinds: ["sale_contract"],
      sellerUserId: "seller-1",
      unitId: "unit-1",
    });
    const created = await readJson<TestSale>(createResponse);

    const reserveResponse = await requestJson(
      app,
      `/sales/${created.id}/reserve`,
      {},
    );
    expect(reserveResponse.status).toBe(200);
    const reserved = await readJson<TestSale>(reserveResponse);
    expect(reserved.status).toBe("pending");
  });
});

function createTestApp() {
  const app = new Hono();
  app.route(
    "/sales",
    createSalesFeature({
      contextFactory: async () =>
        createServiceContext({
          actor: { id: "user-1", kind: "user" },
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

type TestReadinessError = {
  missingFields: string[];
};
