import { mutation, operation } from "./financeOpenApiParts.js";
import { objectSchema } from "./inventoryOpenApiSchemaParts.js";

export const commissionWorkspacePaths = {
  "/api/v1/finance/commissions/workspace": {
    get: {
      ...operation(
        "finance.read",
        "Read sale-first commission workspace",
        "getCommissionWorkspace",
        "CommissionWorkspace",
      ),
      parameters: [dateQuery("from"), dateQuery("to")],
    },
  },
  "/api/v1/finance/commissions/settlements": {
    post: mutation(
      "finance.update",
      "Settle seller commissions atomically",
      "settleCommissionEntries",
      "SettleCommissionEntriesRequest",
      "CommissionSettlementResult",
    ),
  },
} as const;

export const commissionWorkspaceSchemas = {
  CommissionReconciliationIssue: objectSchema(
    ["code", "entryId", "saleId", "severity"],
    {
      code: {
        type: "string",
        enum: [
          "cancelled_sale",
          "missing_commission",
          "missing_sale",
          "missing_vehicle",
          "reverted_sale",
          "seller_mismatch",
        ],
      },
      entryId: { type: ["string", "null"] },
      saleId: { type: ["string", "null"] },
      severity: { type: "string", enum: ["critical", "warning"] },
    },
  ),
  CommissionSettlementResult: objectSchema(
    ["entryIds", "paidAt", "sellerUserId", "totalCents", "updatedCount"],
    {
      entryIds: { type: "array", items: { type: "string" } },
      paidAt: { type: "string", format: "date-time" },
      sellerUserId: { type: "string" },
      totalCents: { type: "integer" },
      updatedCount: { type: "integer" },
    },
  ),
  CommissionWorkspace: objectSchema(
    ["adjustments", "generatedAt", "reconciliation", "sales", "sellerNames"],
    {
      adjustments: financeEntryArray(),
      generatedAt: { type: "string", format: "date-time" },
      reconciliation: {
        type: "array",
        items: { $ref: "#/components/schemas/CommissionReconciliationIssue" },
      },
      sales: {
        type: "array",
        items: { $ref: "#/components/schemas/CommissionWorkspaceSale" },
      },
      sellerNames: {
        type: "object",
        additionalProperties: { type: "string" },
      },
    },
  ),
  CommissionWorkspaceSale: objectSchema(
    [
      "closedAt",
      "entries",
      "id",
      "listingSnapshot",
      "salePriceCents",
      "sellerUserId",
      "standardCommissionEnabled",
      "status",
    ],
    {
      closedAt: { type: ["string", "null"], format: "date-time" },
      entries: financeEntryArray(),
      id: { type: "string" },
      listingSnapshot: { type: "object", additionalProperties: true },
      salePriceCents: { type: ["integer", "null"] },
      sellerUserId: { type: ["string", "null"] },
      standardCommissionEnabled: { type: "boolean" },
      status: {
        type: "string",
        enum: ["cancelled", "closed", "draft", "pending"],
      },
      unitId: { type: ["string", "null"] },
    },
  ),
  SettleCommissionEntriesRequest: objectSchema(
    ["entryIds", "paidAt", "sellerUserId"],
    {
      entryIds: {
        type: "array",
        minItems: 1,
        maxItems: 500,
        items: { type: "string", minLength: 1 },
      },
      paidAt: { type: "string", format: "date-time" },
      sellerUserId: { type: "string", minLength: 1 },
    },
  ),
} as const;

function dateQuery(name: string) {
  return {
    name,
    in: "query",
    required: true,
    schema: { type: "string", format: "date-time" },
  } as const;
}

function financeEntryArray() {
  return {
    type: "array",
    items: { $ref: "#/components/schemas/FinanceEntry" },
  } as const;
}
