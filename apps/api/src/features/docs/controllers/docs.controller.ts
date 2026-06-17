import { Hono } from "hono";
import { inventoryPaths, inventorySchemas } from "./inventoryOpenApi.js";
import { storefrontPaths, storefrontSchemas } from "./storefrontOpenApi.js";

export const llmsText = `# Loja Veiculos API

## API entry points
- OpenAPI document: /api/v1/openapi.json
- Health check: /health
- Public storefront listings: GET /api/v1/public/storefront/listings
- Create listing: POST /api/v1/inventory/listings
- Get listing: GET /api/v1/inventory/listings/{listingId}
- Update listing description: PATCH /api/v1/inventory/listings/{listingId}/description
- Update listing price: PATCH /api/v1/inventory/listings/{listingId}/price
- Attach listing unit: PUT /api/v1/inventory/listings/{listingId}/unit
- Change listing status: PATCH /api/v1/inventory/listings/{listingId}/status

## Authentication
- API clients should send a bearer token in the Authorization header.
- Public storefront requests resolve store scope from the Host or x-forwarded-host subdomain and do not require bearer auth.
- Protected inventory requests require Clerk user identity and store membership context.
- Every tenant-scoped request is expected to resolve tenantId, storeId, actor, permissions, requestId, logger, and audit sink before domain services run.

## Scopes
- inventory.read: required to read vehicle inventory.
- inventory.create: reserved for vehicle creation workflows.
- inventory.update_description: reserved for descriptive inventory edits.
- inventory.update_price: reserved for price edits.
- inventory.update_status: reserved for listing lifecycle edits.
- inventory.delete: reserved for vehicle deletion workflows.

## Current inventory endpoints
- GET /api/v1/public/storefront/listings: lists published, visible vehicles for storename.lojaveiculos.com.br.
- POST /api/v1/inventory/listings: creates a listing scaffold; requires inventory.create.
- GET /api/v1/inventory/listings/{listingId}: returns a listing scaffold; requires inventory.read.
- PATCH /api/v1/inventory/listings/{listingId}/description: updates descriptive fields; requires inventory.update_description.
- PATCH /api/v1/inventory/listings/{listingId}/price: updates price; requires inventory.update_price.
- PUT /api/v1/inventory/listings/{listingId}/unit: attaches an operational unit; requires inventory.create.
- PATCH /api/v1/inventory/listings/{listingId}/status: changes lifecycle status; requires inventory.update_status.

## Planned external API safety limits
- External write/import APIs must be tenant and store scoped.
- External clients must use least-privilege scopes instead of operator roles.
- Mutations must be idempotent where possible and include request identifiers for audit correlation.
- Rate limits, payload size limits, and pagination caps must be enforced before public external API launch.
- Destructive operations must require explicit delete scopes and audit records.
`;

export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Loja Veiculos API",
    version: "0.1.0",
    summary: "AI-friendly metadata for the Loja Veiculos backend API.",
    description:
      "Current API surface is intentionally small. Inventory read endpoints are scaffolded and external API safety limits are documented as planned constraints.",
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
      name: "Public Storefront",
      description: "Public vehicle stock endpoints resolved from store host.",
    },
    {
      name: "External API Safety",
      description:
        "Planned guardrails for future partner and automation-facing APIs.",
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
    },
    schemas: {
      ...inventorySchemas,
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
    header: "Authorization: Bearer <token>",
    currentStatus:
      "Protected routes resolve Clerk identity plus store membership; public storefront routes use host-based store scope.",
  },
  "x-scopes": {
    "inventory.read": "Read vehicle inventory.",
    "inventory.create": "Create vehicle inventory records.",
    "inventory.update_description": "Edit descriptive vehicle fields.",
    "inventory.update_price": "Edit vehicle pricing.",
    "inventory.update_status": "Edit vehicle listing lifecycle status.",
    "inventory.delete": "Delete vehicle inventory records.",
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
