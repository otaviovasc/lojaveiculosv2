import {
  entryLinkTargetEnum,
  financeDocumentKindEnum,
  financeEntryInputProperties,
} from "./financeOpenApiParts.js";
import { objectSchema } from "./inventoryOpenApiSchemaParts.js";

export const financeSchemas = {
  AttachFinanceDocumentRequest: objectSchema(
    ["fileName", "storageKey", "title"],
    {
      fileName: { type: "string", minLength: 1, maxLength: 191 },
      fileSizeBytes: { type: ["integer", "null"], minimum: 1 },
      kind: { type: "string", enum: financeDocumentKindEnum },
      linkRole: { type: "string", minLength: 1, maxLength: 80 },
      mimeType: { type: ["string", "null"], minLength: 1, maxLength: 120 },
      storageKey: { type: "string", minLength: 1 },
      title: { type: "string", minLength: 1, maxLength: 191 },
    },
  ),
  CancelFinanceEntryRequest: objectSchema([], {
    reason: { type: ["string", "null"], minLength: 1 },
  }),
  CommissionRule: objectSchema(["id", "name", "status", "type"], {
    category: { type: "string" },
    fixedAmountCents: { type: ["integer", "null"] },
    id: { type: "string" },
    metadata: { type: "object", additionalProperties: true },
    name: { type: "string" },
    percentageBasisPoints: { type: ["integer", "null"] },
    sellerUserId: { type: ["string", "null"] },
    status: { type: "string", enum: ["active", "inactive"] },
    type: { type: "string", enum: ["fixed_amount", "manual", "percentage"] },
  }),
  CommissionRuleListResponse: objectSchema(["commissionRules"], {
    commissionRules: {
      type: "array",
      items: { $ref: "#/components/schemas/CommissionRule" },
    },
  }),
  CreateCommissionRuleRequest: objectSchema(["category", "name", "type"], {
    category: { type: "string", minLength: 1, maxLength: 120 },
    fixedAmountCents: { type: ["integer", "null"], minimum: 1 },
    metadata: { type: "object", additionalProperties: true },
    name: { type: "string", minLength: 1, maxLength: 191 },
    percentageBasisPoints: { type: ["integer", "null"], minimum: 1 },
    sellerUserId: { type: ["string", "null"], minLength: 1 },
    status: { type: "string", enum: ["active", "inactive"] },
    type: { type: "string", enum: ["fixed_amount", "manual", "percentage"] },
  }),
  CreateFinanceEntryRequest: objectSchema(
    ["amountCents", "category", "name", "type"],
    financeEntryInputProperties({
      documentUpload: {
        $ref: "#/components/schemas/CreateFinanceEntryDocumentUploadRequest",
      },
    }),
  ),
  CreateFinanceEntryDocumentUploadRequest: objectSchema(
    ["contentType", "fileName", "sizeBytes"],
    {
      contentType: { type: "string", minLength: 1, maxLength: 120 },
      fileName: { type: "string", minLength: 1, maxLength: 191 },
      kind: { type: "string", enum: financeDocumentKindEnum },
      linkRole: { type: "string", minLength: 1, maxLength: 80 },
      metadata: { type: "object", additionalProperties: true },
      sizeBytes: { type: "integer", minimum: 1, maximum: 26214400 },
      title: { type: "string", minLength: 1, maxLength: 191 },
    },
  ),
  CreateFinanceRecurringEntryRequest: objectSchema(
    ["amountCents", "category", "frequency", "name", "nextDueAt", "type"],
    financeEntryInputProperties({
      dayOfMonth: { type: ["integer", "null"], minimum: 1, maximum: 31 },
      frequency: { type: "string", enum: ["monthly", "weekly", "yearly"] },
      nextDueAt: { type: "string", format: "date-time" },
    }),
  ),
  FinanceDocument: objectSchema(
    ["fileName", "id", "kind", "linkRole", "status", "targetId", "title"],
    {
      fileName: { type: "string" },
      fileSizeBytes: { type: ["integer", "null"] },
      id: { type: "string" },
      kind: { type: "string", enum: financeDocumentKindEnum },
      linkRole: { type: "string" },
      metadata: { type: "object", additionalProperties: true },
      mimeType: { type: ["string", "null"] },
      status: { type: "string" },
      targetId: { type: "string" },
      targetType: { type: "string", const: "finance_entry" },
      title: { type: "string" },
    },
  ),
  FinanceEntry: objectSchema(
    ["amountCents", "category", "id", "name", "status", "type"],
    {
      amountCents: { type: "integer" },
      category: { type: "string" },
      dueAt: { type: ["string", "null"], format: "date-time" },
      id: { type: "string" },
      metadata: { type: "object", additionalProperties: true },
      name: { type: "string" },
      paidAt: { type: ["string", "null"], format: "date-time" },
      sellerUserId: { type: ["string", "null"] },
      status: { type: "string", enum: ["cancelled", "paid", "pending"] },
      type: { type: "string", enum: ["commission", "expense", "revenue"] },
    },
  ),
  FinanceEntryBundle: entryBundleSchema([]),
  FinanceEntryDetail: entryBundleSchema(["documents"]),
  FinanceEntryLink: objectSchema(["entryId", "id", "targetId", "targetType"], {
    entryId: { type: "string" },
    id: { type: "string" },
    targetId: { type: "string" },
    targetType: { type: "string", enum: entryLinkTargetEnum },
  }),
  FinanceEntryListResponse: objectSchema(["entries", "hasMore", "nextOffset"], {
    entries: {
      type: "array",
      items: { $ref: "#/components/schemas/FinanceEntry" },
    },
    hasMore: { type: "boolean" },
    nextOffset: { type: ["integer", "null"], minimum: 0 },
  }),
  FinanceEntryUploadResponse: entryBundleSchema(["documents"]),
  FinanceObjectUpload: objectSchema(
    [
      "expiresAt",
      "publicUrl",
      "storageKey",
      "uploadHeaders",
      "uploadMethod",
      "uploadUrl",
    ],
    {
      expiresAt: { type: "string", format: "date-time" },
      publicUrl: { type: "string" },
      storageKey: { type: "string" },
      uploadHeaders: {
        type: "object",
        additionalProperties: { type: "string" },
      },
      uploadMethod: { type: "string", enum: ["PUT"] },
      uploadUrl: { type: "string" },
    },
  ),
  FinanceRecurringEntry: objectSchema(["id", "name", "status", "type"], {
    amountCents: { type: "integer" },
    category: { type: "string" },
    dayOfMonth: { type: ["integer", "null"] },
    frequency: { type: "string", enum: ["monthly", "weekly", "yearly"] },
    id: { type: "string" },
    metadata: { type: "object", additionalProperties: true },
    name: { type: "string" },
    nextDueAt: { type: "string", format: "date-time" },
    sellerUserId: { type: ["string", "null"] },
    status: { type: "string", enum: ["cancelled", "paid", "pending"] },
    type: { type: "string", enum: ["commission", "expense", "revenue"] },
  }),
  FinanceRecurringEntryListResponse: objectSchema(["recurringEntries"], {
    recurringEntries: {
      type: "array",
      items: { $ref: "#/components/schemas/FinanceRecurringEntry" },
    },
  }),
  FinanceSummary: objectSchema(
    [
      "cancelledAmountCents",
      "commissionAmountCents",
      "expenseAmountCents",
      "overdueAmountCents",
      "paidAmountCents",
      "pendingAmountCents",
      "revenueAmountCents",
    ],
    {
      cancelledAmountCents: { type: "integer" },
      commissionAmountCents: { type: "integer" },
      expenseAmountCents: { type: "integer" },
      overdueAmountCents: { type: "integer" },
      paidAmountCents: { type: "integer" },
      pendingAmountCents: { type: "integer" },
      revenueAmountCents: { type: "integer" },
    },
  ),
  PayFinanceEntryRequest: objectSchema([], {
    paidAt: { type: ["string", "null"], format: "date-time" },
  }),
  RequestFinanceDocumentUploadRequest: objectSchema(
    ["contentType", "fileName", "sizeBytes"],
    {
      contentType: { type: "string", minLength: 1, maxLength: 120 },
      fileName: { type: "string", minLength: 1, maxLength: 191 },
      sizeBytes: { type: "integer", minimum: 1, maximum: 26214400 },
    },
  ),
  UpdateFinanceEntryRequest: objectSchema([], financeEntryInputProperties()),
} as const;

function entryBundleSchema(extraRequired: readonly string[]) {
  return objectSchema(["entry", "links", ...extraRequired], {
    documentUpload: { $ref: "#/components/schemas/FinanceObjectUpload" },
    documents: documentArray(),
    entry: { $ref: "#/components/schemas/FinanceEntry" },
    links: {
      type: "array",
      items: { $ref: "#/components/schemas/FinanceEntryLink" },
    },
  });
}

function documentArray() {
  return {
    type: "array",
    items: { $ref: "#/components/schemas/FinanceDocument" },
  } as const;
}
