import { Hono } from "hono";
import { billingPaths, billingSchemas } from "./billingOpenApi.js";
import { analyticsPaths, analyticsSchemas } from "./analyticsOpenApi.js";
import { compliancePaths, complianceSchemas } from "./complianceOpenApi.js";
import {
  documentOperationPaths,
  documentOperationSchemas,
} from "./documentOperationsOpenApi.js";
import { documentsPaths, documentsSchemas } from "./documentsOpenApi.js";
import { externalApiPaths, externalApiSchemas } from "./externalApiOpenApi.js";
import { financePaths, financeSchemas } from "./financeOpenApi.js";
import { fiscalPaths, fiscalSchemas } from "./fiscalOpenApi.js";
import { identityPaths, identitySchemas } from "./identityOpenApi.js";
import {
  identityProvisioningPaths,
  identityProvisioningSchemas,
} from "./identityProvisioningOpenApi.js";
import {
  internalMonitoringPaths,
  internalMonitoringSchemas,
} from "./internalMonitoringOpenApi.js";
import { inventoryPaths, inventorySchemas } from "./inventoryOpenApi.js";
import { llmsText } from "./llmsText.js";
import { marketplacePaths, marketplaceSchemas } from "./marketplaceOpenApi.js";
import {
  storefrontLeadPaths,
  storefrontLeadSchemas,
} from "./storefrontLeadOpenApi.js";
import { storefrontPaths, storefrontSchemas } from "./storefrontOpenApi.js";
import { openApiTags } from "./openApiTags.js";

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
  tags: openApiTags,
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
    ...identityProvisioningPaths,
    ...billingPaths,
    ...financePaths,
    ...fiscalPaths,
    ...analyticsPaths,
    ...compliancePaths,
    ...documentsPaths,
    ...documentOperationPaths,
    ...externalApiPaths,
    ...internalMonitoringPaths,
    ...marketplacePaths,
    ...inventoryPaths,
    ...storefrontLeadPaths,
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
      ...financeSchemas,
      ...fiscalSchemas,
      ...analyticsSchemas,
      ...complianceSchemas,
      ...documentsSchemas,
      ...documentOperationSchemas,
      ...externalApiSchemas,
      ...identitySchemas,
      ...identityProvisioningSchemas,
      ...internalMonitoringSchemas,
      ...marketplaceSchemas,
      ...storefrontSchemas,
      ...storefrontLeadSchemas,
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
    "analytics.read": "Read commercial analytics dashboards.",
    "compliance.manage": "Read and operate LGPD/security posture controls.",
    "fiscal.manage": "Operate fiscal provider and NF-e document lifecycle.",
    "finance.read": "Read finance entries, summaries, and rules.",
    "finance.create": "Create finance entries, recurring entries, and rules.",
    "finance.update": "Update, pay, cancel, and void finance entries.",
    "finance.attach_document":
      "Request uploads and attach documents to finance entries.",
    "inventory.read": "Read vehicle inventory.",
    "inventory.create": "Create vehicle inventory records.",
    "inventory.update_description": "Edit descriptive vehicle fields.",
    "inventory.update_internal_notes": "Edit internal vehicle notes.",
    "inventory.update_price": "Edit vehicle pricing.",
    "inventory.update_status": "Edit vehicle listing lifecycle status.",
    "inventory.update_unit": "Edit physical/unit inventory fields.",
    "inventory.media_update": "Reorder media and edit media visibility.",
    "inventory.media_delete": "Delete vehicle media and cleanup objects.",
    "inventory.cost_create": "Create vehicle costs and linked finance entries.",
    "inventory.checklist_read": "Read vehicle readiness checklists.",
    "inventory.checklist_update":
      "Create and update vehicle readiness checklists.",
    "inventory.reserve":
      "Reserve, release, cancel, or expire vehicle unit reservations.",
    "inventory.sell": "Sell vehicle units and emit sale document bundles.",
    "inventory.delete": "Delete vehicle inventory records.",
    "documents.read": "Read shared store-scoped documents.",
    "documents.download": "Generate scoped document download descriptors.",
    "documents.preview": "Render scoped document previews.",
    "documents.regenerate": "Regenerate scoped operational documents.",
    "documents.update_links": "Change scoped document store/unit links.",
    "documents.void": "Void scoped documents.",
    "marketplace.read": "Read OLX/Mercado Livre account and sync status.",
    "marketplace.manage": "Connect or pause marketplace accounts.",
    "marketplace.inventory_sync": "Queue marketplace inventory sync jobs.",
    "marketplace.lead_sync": "Queue marketplace lead import jobs.",
    "marketplace.listing_publish": "Queue listing publish jobs.",
    "marketplace.listing_update": "Queue listing update jobs.",
    "marketplace.listing_unpublish": "Queue listing unpublish jobs.",
  },
  "x-finance-side-effects": {
    "vehicle-cost":
      "POST /api/v1/inventory/units/{unitId}/costs creates an expense finance_entries row linked to vehicle_cost plus unit context.",
    reserve:
      "POST /api/v1/inventory/units/{unitId}/reserve creates finance_entries linked to reservation sale/payment context.",
    release:
      "POST /api/v1/inventory/units/{unitId}/reservation/release cancels pending reservation finance_entries linked to sale_payment context.",
    cancel:
      "POST /api/v1/inventory/units/{unitId}/reservation/cancel cancels pending reservation finance_entries linked to sale_payment context.",
    expire:
      "POST /api/v1/inventory/units/{unitId}/reservation/expire cancels pending reservation finance_entries linked to sale_payment context.",
    sell: "POST /api/v1/inventory/units/{unitId}/sell creates finance_entries linked to sale and sale_payment context.",
    linkTargets: ["sale", "sale_payment", "vehicle_cost", "vehicle_unit"],
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
