import { Hono } from "hono";
import { billingPaths, billingSchemas } from "./billingOpenApi.js";
import { analyticsPaths, analyticsSchemas } from "./analyticsOpenApi.js";
import { automationPaths, automationSchemas } from "./automationOpenApi.js";
import { compliancePaths, complianceSchemas } from "./complianceOpenApi.js";
import {
  documentOperationPaths,
  documentOperationSchemas,
} from "./documentOperationsOpenApi.js";
import { documentsPaths, documentsSchemas } from "./documentsOpenApi.js";
import { externalApiPaths, externalApiSchemas } from "./externalApiOpenApi.js";
import {
  externalApiDocsMarkdown,
  externalApiDocsPaths,
  externalApiLlmsText,
  externalApiOpenApiDocument,
} from "./externalApiDocs.js";
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
import { openApiScopes } from "./docsScopes.js";
import {
  storefrontLeadPaths,
  storefrontLeadSchemas,
} from "./storefrontLeadOpenApi.js";
import { storefrontPaths, storefrontSchemas } from "./storefrontOpenApi.js";
import { openApiTags } from "./openApiTags.js";
import { openApiSecuritySchemes } from "./openApiSecuritySchemes.js";
export { llmsText } from "./llmsText.js";
export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Loja Veiculos API",
    version: "0.1.0",
    summary: "AI-friendly metadata for the Loja Veiculos backend API.",
    description:
      "Current API surface exposes canonical V2 inventory DTOs, public storefront reads, and scoped external API routes for AI agents and partner integrations.",
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
    ...automationPaths,
    ...compliancePaths,
    ...documentsPaths,
    ...documentOperationPaths,
    ...externalApiDocsPaths,
    ...externalApiPaths,
    ...internalMonitoringPaths,
    ...marketplacePaths,
    ...inventoryPaths,
    ...storefrontLeadPaths,
  },
  components: {
    securitySchemes: openApiSecuritySchemes,
    schemas: {
      ...inventorySchemas,
      ...billingSchemas,
      ...financeSchemas,
      ...fiscalSchemas,
      ...analyticsSchemas,
      ...automationSchemas,
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
        required: ["message", "code", "requestId"],
        properties: {
          message: { type: "string" },
          code: { type: "string" },
          requestId: { type: "string" },
          details: {
            type: "object",
            additionalProperties: true,
          },
        },
      },
    },
  },
  "x-authentication": {
    header: "Authorization: Bearer <token> or x-api-key: lv2_...",
    currentStatus:
      "Protected routes resolve Clerk identity plus store membership or scoped external API keys; public storefront routes use host-based store scope.",
  },
  "x-scopes": openApiScopes,
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
    linkTargets: [
      "sale",
      "sale_payment",
      "vehicle_cost",
      "vehicle_listing",
      "vehicle_unit",
    ],
  },
  "x-external-api-safety-limits": [
    "Tenant and store scoping required for every external request.",
    "Least-privilege external client scopes required; operator roles are not exposed to integrations.",
    "API-key mutations use Idempotency-Key for duplicate rejection; reused keys return 409 and do not replay prior responses.",
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

docsFeature.get("/api/v1/external-api/docs", (context) =>
  context.text(externalApiDocsMarkdown, 200, {
    "Content-Type": "text/markdown; charset=utf-8",
  }),
);

docsFeature.get("/api/v1/external-api/docs.md", (context) =>
  context.text(externalApiDocsMarkdown, 200, {
    "Content-Type": "text/markdown; charset=utf-8",
  }),
);

docsFeature.get("/api/v1/external-api/llms.txt", (context) =>
  context.text(externalApiLlmsText, 200, {
    "Content-Type": "text/plain; charset=utf-8",
  }),
);

docsFeature.get("/api/v1/external-api/openapi.json", (context) =>
  context.json(externalApiOpenApiDocument),
);
