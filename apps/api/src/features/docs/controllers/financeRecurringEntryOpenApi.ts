import {
  mutation,
  operation,
  query,
  recurringEntryIdParameter,
} from "./financeOpenApiParts.js";
import { objectSchema } from "./inventoryOpenApiSchemaParts.js";

export const financeRecurringEntryPaths = {
  "/api/v1/finance/recurring-entries/materialize": {
    post: mutation(
      "finance.create",
      "Materialize recurring finance entries",
      "materializeFinanceRecurringEntries",
      "MaterializeFinanceRecurringEntriesRequest",
      "MaterializeFinanceRecurringEntriesResponse",
    ),
  },
  "/api/v1/finance/recurring-entries/{recurringEntryId}": {
    patch: {
      ...mutation(
        "finance.update",
        "Update recurring finance entry",
        "updateFinanceRecurringEntry",
        "UpdateFinanceRecurringEntryRequest",
        "FinanceRecurringEntry",
      ),
      parameters: [recurringEntryIdParameter],
    },
    delete: {
      ...operation(
        "finance.update",
        "Cancel recurring finance entry",
        "cancelFinanceRecurringEntry",
        "FinanceRecurringEntry",
      ),
      parameters: [recurringEntryIdParameter, query("reason", "string")],
    },
  },
} as const;

export const financeRecurringEntrySchemas = {
  MaterializeFinanceRecurringEntriesRequest: objectSchema([], {
    asOf: { type: "string", format: "date-time" },
  }),
  MaterializeFinanceRecurringEntriesResponse: objectSchema(
    ["generatedEntries"],
    {
      generatedEntries: {
        type: "array",
        items: { $ref: "#/components/schemas/FinanceEntry" },
      },
    },
  ),
  UpdateFinanceRecurringEntryRequest: objectSchema([], {
    amountCents: { type: "integer", minimum: 1 },
    category: { type: "string", minLength: 1, maxLength: 120 },
    dayOfMonth: { type: ["integer", "null"], minimum: 1, maximum: 31 },
    frequency: { type: "string", enum: ["monthly", "weekly", "yearly"] },
    metadata: { type: "object", additionalProperties: true },
    name: { type: "string", minLength: 1, maxLength: 191 },
    nextDueAt: { type: "string", format: "date-time" },
    sellerUserId: { type: ["string", "null"], minLength: 1 },
  }),
} as const;
