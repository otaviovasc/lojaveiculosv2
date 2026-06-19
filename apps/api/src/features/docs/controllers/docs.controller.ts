import { Hono } from "hono";
import { billingPaths, billingSchemas } from "./billingOpenApi.js";
import { externalApiPaths, externalApiSchemas } from "./externalApiOpenApi.js";
import { identityPaths, identitySchemas } from "./identityOpenApi.js";
import {
  internalMonitoringPaths,
  internalMonitoringSchemas,
} from "./internalMonitoringOpenApi.js";
import { inventoryPaths, inventorySchemas } from "./inventoryOpenApi.js";
import { llmsText } from "./llmsText.js";
import { storefrontPaths, storefrontSchemas } from "./storefrontOpenApi.js";

export { llmsText } from "./llmsText.js";

export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Loja Veiculos API",
    version: "0.1.0",
    summary: "AI-friendly metadata for the Loja Veiculos backend API.",
    description:
      "Current API surface exposes canonical V2 inventory DTOs and public storefront reads. External API safety limits are documented as planned constraints.",
  },
  servers: [
    {
      url: "/",
      description: "Current deployment origin",
    },
  ],
  tags: [
    {
      name: "System",
      description: "Operational endpoints.",
    },
    {
      name: "Inventory",
      description: "Vehicle inventory endpoints.",
    },
    {
      name: "Identity",
      description: "Store roles, permissions, and membership access.",
    },
    {
      name: "Billing",
      description: "Plans, subscriptions, and store feature entitlements.",
    },
    {
      name: "Public Storefront",
      description: "Public vehicle stock endpoints resolved from store host.",
    },
    {
      name: "External API Safety",
      description:
        "Scoped key management and guardrails for partner and automation-facing APIs.",
    },
    {
      name: "Internal Monitoring",
      description: "Scoped audit events, sink failures, and runtime health.",
    },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["System"],
        summary: "Health check",
        operationId: "getHealth",
        responses: {
          "200": {
            description: "Service is available.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  additionalProperties: false,
                  required: ["ok"],
                  properties: {
                    ok: { type: "boolean", const: true },
                  },
                },
              },
            },
          },
        },
      },
    },
    ...storefrontPaths,
    ...identityPaths,
    ...billingPaths,
    ...externalApiPaths,
    ...internalMonitoringPaths,
    ...inventoryPaths,
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description:
          "Bearer token representing an actor with tenant and store scoped permissions.",
      },
      externalApiKey: {
        type: "apiKey",
        in: "header",
        name: "x-api-key",
        description:
          "Scoped Loja Veiculos API key. Authorization: Bearer lv2_... is also accepted.",
      },
    },
    schemas: {
      ...inventorySchemas,
      ...billingSchemas,
      ...externalApiSchemas,
      ...identitySchemas,
      ...internalMonitoringSchemas,
      ...storefrontSchemas,
      ApiError: {
        type: "object",
        additionalProperties: true,
        properties: {
          message: { type: "string" },
          requestId: { type: "string" },
        },
      },
    },
  },
  "x-authentication": {
    header: "Authorization: Bearer <token> or x-api-key: lv2_...",
    currentStatus:
      "Protected routes resolve Clerk identity plus store membership or scoped external API keys; public storefront routes use host-based store scope.",
  },
  "x-scopes": {
    "inventory.read": "Read vehicle inventory.",
    "inventory.create": "Create vehicle inventory records.",
    "inventory.update_description": "Edit descriptive vehicle fields.",
    "inventory.update_price": "Edit vehicle pricing.",
    "inventory.update_status": "Edit vehicle listing lifecycle status.",
    "inventory.update_unit": "Edit physical/unit inventory fields.",
    "inventory.cost_create": "Create vehicle costs and linked finance entries.",
    "inventory.reserve":
      "Reserve vehicle listings and emit reservation receipts.",
    "inventory.sell": "Sell vehicle listings and emit sale document bundles.",
    "inventory.delete": "Delete vehicle inventory records.",
  },
  "x-finance-side-effects": {
    "vehicle-cost":
      "POST /api/v1/inventory/listings/{listingId}/costs creates an expense finance_entries row linked to vehicle_cost plus listing/unit context.",
    reserve:
      "POST /api/v1/inventory/listings/{listingId}/reserve creates finance_entries linked to reservation sale/payment context.",
    sell: "POST /api/v1/inventory/listings/{listingId}/sell creates finance_entries linked to sale and sale_payment context.",
    linkTargets: [
      "sale",
      "sale_payment",
      "vehicle_cost",
      "vehicle_listing",
      "vehicle_unit",
    ],
  },
  "x-planned-external-api-safety-limits": [
    "Tenant and store scoping required for every external request.",
    "Least-privilege external client scopes required; operator roles are not exposed to integrations.",
    "Idempotency keys required for import and mutation endpoints where possible.",
    "Request identifiers required for audit correlation.",
    "Rate limits, payload size limits, and pagination caps required before launch.",
    "Destructive operations require explicit delete scopes and audit records.",
  ],
} as const;

export const docsFeature = new Hono();

docsFeature.get("/llms.txt", (context) =>
  context.text(llmsText, 200, {
    "Content-Type": "text/plain; charset=utf-8",
  }),
);

docsFeature.get("/api/v1/openapi.json", (context) =>
  context.json(openApiDocument),
);
