import { expect } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import type { createCrmFeature } from "./crm.controller.js";

export const FULL_PERMISSIONS = [
  "finance.create",
  "lead.create",
  "lead.read",
  "lead.update",
];

export function createCrmTestContext(permissions: string[]) {
  return Object.assign(
    createServiceContext({
      actor: { id: "user_1", kind: "user" },
      permissions: permissions as never,
      request: { requestId: "req_1" },
      storeId: "store_1",
      tenantId: "tenant_1",
    }),
    { entitlements: ["crm"] },
  );
}

export async function createLead(
  feature: ReturnType<typeof createCrmFeature>,
  name: string,
) {
  const response = await feature.request("/leads", {
    body: JSON.stringify({ buyerName: name, source: "manual" }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  expect(response.status).toBe(201);
  return (await response.json()) as { id: string };
}

export function postFinancialProduct(
  feature: ReturnType<typeof createCrmFeature>,
  leadId: string,
  body: Record<string, unknown>,
) {
  return feature.request(`/leads/${leadId}/financial-products`, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}
