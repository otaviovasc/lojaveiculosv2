import { mutation, operation, query } from "./financeOpenApiParts.js";
import { objectSchema } from "./inventoryOpenApiSchemaParts.js";

const ruleIdParameter = {
  description: "Automatic finance entry rule identifier.",
  in: "path",
  name: "ruleId",
  required: true,
  schema: { minLength: 1, type: "string" },
} as const;

const calculationSchema = {
  oneOf: [
    objectSchema(["amountCents", "kind"], {
      amountCents: { maximum: 2_147_483_647, minimum: 1, type: "integer" },
      kind: { const: "fixed", type: "string" },
    }),
    objectSchema(["basis", "basisPoints", "kind"], {
      basis: {
        enum: [
          "commission",
          "consortium",
          "documentation",
          "financing",
          "insurance_commission",
          "premium",
          "sale",
        ],
        type: "string",
      },
      basisPoints: { maximum: 10_000, minimum: 1, type: "integer" },
      kind: { const: "percentage", type: "string" },
    }),
    objectSchema(["basis", "kind", "ratePpm"], {
      basis: {
        enum: [
          "commission",
          "consortium",
          "documentation",
          "financing",
          "insurance_commission",
          "premium",
          "sale",
        ],
        type: "string",
      },
      kind: { const: "rate_ppm", type: "string" },
      ratePpm: { maximum: 1_000_000, minimum: 1, type: "integer" },
    }),
  ],
} as const;

const timingSchema = {
  oneOf: [
    objectSchema(["kind"], { kind: { const: "same_day", type: "string" } }),
    objectSchema(["days", "kind"], {
      days: { maximum: 365, minimum: 1, type: "integer" },
      kind: { const: "days_after", type: "string" },
    }),
    objectSchema(["day", "kind"], {
      day: { maximum: 31, minimum: 1, type: "integer" },
      kind: { const: "day_of_month", type: "string" },
    }),
    objectSchema(["day", "kind"], {
      day: { maximum: 31, minimum: 1, type: "integer" },
      kind: { const: "next_month_day", type: "string" },
    }),
  ],
} as const;

const ruleProperties = {
  calculation: calculationSchema,
  category: { type: ["string", "null"], minLength: 1, maxLength: 120 },
  conditions: {
    additionalProperties: false,
    properties: {
      basisRange: {
        additionalProperties: false,
        properties: {
          basis: { type: "string" },
          maxCents: { type: ["integer", "null"], minimum: 0 },
          minCents: { type: "integer", minimum: 0 },
        },
        required: ["basis"],
        type: "object",
      },
      financingRank: {
        enum: ["R1", "R2", "R3", "R4", "R5"],
        type: "string",
      },
      standardCommissionEnabled: { type: "boolean" },
      transferHasLien: { type: "boolean" },
    },
    type: "object",
  },
  event: {
    enum: [
      "vehicle_sale_closed",
      "financing_approved",
      "insurance_issued",
      "transfer_documentation_charged",
      "consortium_sold",
    ],
    type: "string",
  },
  family: { type: ["string", "null"], minLength: 1, maxLength: 160 },
  metadata: { additionalProperties: true, type: "object" },
  name: { type: ["string", "null"], minLength: 1, maxLength: 191 },
  outputType: {
    enum: ["expense", "revenue", "commission"],
    type: "string",
  },
  priority: { maximum: 100, minimum: 0, type: "integer" },
  recipient: {
    oneOf: [
      objectSchema(["kind"], {
        kind: { const: "event_seller", type: "string" },
      }),
      objectSchema(["kind", "userId"], {
        kind: { const: "fixed_user", type: "string" },
        userId: { format: "uuid", type: "string" },
      }),
      objectSchema(["kind"], {
        kind: { const: "none", type: "string" },
      }),
    ],
  },
  resolution: {
    enum: ["additive", "seller_override"],
    type: "string",
  },
  ruleKey: { type: ["string", "null"], minLength: 1, maxLength: 160 },
  sellerUserId: { format: "uuid", type: ["string", "null"] },
  status: { enum: ["active", "inactive"], type: "string" },
  timing: timingSchema,
} as const;

export const financeAutoEntrySchemas = {
  CreateFinanceAutoEntryRuleRequest: objectSchema(
    ["calculation", "event", "outputType", "timing"],
    ruleProperties,
  ),
  FinanceAutoEntryRule: objectSchema(
    [
      "calculation",
      "category",
      "conditions",
      "event",
      "family",
      "id",
      "name",
      "outputType",
      "priority",
      "recipient",
      "resolution",
      "ruleKey",
      "status",
      "timing",
    ],
    {
      ...ruleProperties,
      category: { type: "string" },
      id: { type: "string" },
      name: { type: "string" },
    },
  ),
  FinanceAutoEntryRuleListResponse: objectSchema(["rules"], {
    rules: {
      items: { $ref: "#/components/schemas/FinanceAutoEntryRule" },
      type: "array",
    },
  }),
  FinanceAutoEntryRuleResponse: objectSchema(["rule"], {
    rule: { $ref: "#/components/schemas/FinanceAutoEntryRule" },
  }),
  UpdateFinanceAutoEntryRuleRequest: objectSchema([], ruleProperties),
} as const;

export const financeAutoEntryPaths = {
  "/api/v1/finance/auto-entry-rules": {
    get: {
      ...operation(
        "finance.read",
        "List automatic finance entry rules",
        "listFinanceAutoEntryRules",
        "FinanceAutoEntryRuleListResponse",
      ),
      parameters: [
        query("event", "string"),
        query("limit", "integer"),
        query("sellerUserId", "string"),
        query("status", "string"),
      ],
    },
    post: mutation(
      "finance.auto_entries.manage",
      "Create automatic finance entry rule",
      "createFinanceAutoEntryRule",
      "CreateFinanceAutoEntryRuleRequest",
      "FinanceAutoEntryRuleResponse",
      201,
    ),
  },
  "/api/v1/finance/auto-entry-rules/{ruleId}": {
    delete: {
      ...operation(
        "finance.auto_entries.manage",
        "Archive automatic finance entry rule",
        "archiveFinanceAutoEntryRule",
        "FinanceAutoEntryRuleResponse",
      ),
      parameters: [ruleIdParameter],
    },
    patch: {
      ...mutation(
        "finance.auto_entries.manage",
        "Update automatic finance entry rule",
        "updateFinanceAutoEntryRule",
        "UpdateFinanceAutoEntryRuleRequest",
        "FinanceAutoEntryRuleResponse",
      ),
      parameters: [ruleIdParameter],
    },
  },
} as const;
