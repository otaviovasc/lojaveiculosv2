import { objectSchema } from "./inventoryOpenApiSchemaParts.js";

export const entryIdParameter = {
  name: "entryId",
  in: "path",
  required: true,
  schema: { type: "string", minLength: 1 },
  description: "Finance entry identifier.",
} as const;

export const recurringEntryIdParameter = {
  name: "recurringEntryId",
  in: "path",
  required: true,
  schema: { type: "string", minLength: 1 },
  description: "Recurring finance entry identifier.",
} as const;

export const financeDocumentIdParameter = {
  name: "documentId",
  in: "path",
  required: true,
  schema: { type: "string", minLength: 1 },
  description: "Finance entry document identifier.",
} as const;

export const entryLinkTargetEnum = [
  "document",
  "lead",
  "sale",
  "sale_payment",
  "vehicle_cost",
  "vehicle_listing",
  "vehicle_unit",
] as const;

export const financeDocumentKindEnum = [
  "buyer_document",
  "delivery_term",
  "finance_receipt",
  "inspection",
  "internal",
  "invoice",
  "other",
  "power_of_attorney",
  "reservation_receipt",
  "sale_contract",
  "sale_receipt",
  "test_drive",
  "vehicle_registration",
] as const;

export function financeEntryInputProperties(
  extra: Record<string, unknown> = {},
) {
  return {
    amountCents: { type: "integer", minimum: 1 },
    category: { type: "string", minLength: 1, maxLength: 120 },
    dueAt: { type: ["string", "null"], format: "date-time" },
    links: {
      type: "array",
      items: objectSchema(["targetId", "targetType"], {
        targetId: { type: "string", minLength: 1 },
        targetType: { type: "string", enum: entryLinkTargetEnum },
      }),
    },
    metadata: { type: "object", additionalProperties: true },
    name: { type: "string", minLength: 1, maxLength: 191 },
    paidAt: { type: ["string", "null"], format: "date-time" },
    sellerUserId: { type: ["string", "null"], minLength: 1 },
    status: { type: "string", enum: ["cancelled", "paid", "pending"] },
    type: { type: "string", enum: ["commission", "expense", "revenue"] },
    ...extra,
  };
}

export function entryMutation(
  summary: string,
  operationId: string,
  requestSchema: string,
) {
  return {
    ...mutation(
      "finance.update",
      summary,
      operationId,
      requestSchema,
      "FinanceEntryBundle",
    ),
    parameters: [entryIdParameter],
  } as const;
}

export function mutation(
  scope: string,
  summary: string,
  operationId: string,
  requestSchema: string,
  responseSchema: string,
  status = 200,
) {
  return {
    ...operation(scope, summary, operationId, responseSchema, status),
    requestBody: jsonRequest(requestSchema),
  } as const;
}

export function operation(
  scope: string,
  summary: string,
  operationId: string,
  responseSchema: string,
  status = 200,
) {
  return {
    tags: ["Finance"],
    summary,
    operationId,
    security: [{ bearerAuth: [scope] }],
    responses: {
      [String(status)]: jsonResponse(responseSchema),
      "400": { description: "Request body or query is invalid." },
      "401": { description: "Authentication is required." },
      "403": { description: `${scope} permission is required.` },
      "404": { description: "Finance entry was not found." },
    },
  } as const;
}

export function query(name: string, type: "integer" | "string") {
  return {
    name,
    in: "query",
    required: false,
    schema: { type },
  } as const;
}

function jsonRequest(schemaName: string) {
  return {
    required: true,
    content: {
      "application/json": {
        schema: { $ref: `#/components/schemas/${schemaName}` },
      },
    },
  } as const;
}

function jsonResponse(schemaName: string) {
  return {
    description: "Finance response.",
    content: {
      "application/json": {
        schema: { $ref: `#/components/schemas/${schemaName}` },
      },
    },
  } as const;
}
