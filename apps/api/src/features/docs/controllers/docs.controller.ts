import { Hono } from "hono";

export const llmsText = `# Loja Veiculos API

## API entry points
- OpenAPI document: /api/v1/openapi.json
- Health check: /health
- Inventory vehicle lookup: GET /api/v1/inventory/vehicles/{vehicleId}

## Authentication
- API clients should send a bearer token in the Authorization header.
- Current local scaffolding uses placeholder service context until identity resolution is wired into HTTP.
- Every tenant-scoped request is expected to resolve tenantId, storeId, actor, permissions, requestId, logger, and audit sink before domain services run.

## Scopes
- inventory.read: required to read vehicle inventory.
- inventory.create: reserved for vehicle creation workflows.
- inventory.update_description: reserved for descriptive inventory edits.
- inventory.update_price: reserved for price edits.
- inventory.delete: reserved for vehicle deletion workflows.

## Current inventory endpoints
- GET /api/v1/inventory/vehicles/{vehicleId}: returns the requested vehicle id with status "not_implemented"; requires inventory.read.

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
    "/api/v1/inventory/vehicles/{vehicleId}": {
      get: {
        tags: ["Inventory"],
        summary: "Get vehicle",
        description:
          'Returns the requested vehicle id with status "not_implemented" while inventory persistence is being built.',
        operationId: "getInventoryVehicle",
        security: [{ bearerAuth: ["inventory.read"] }],
        parameters: [
          {
            name: "vehicleId",
            in: "path",
            required: true,
            schema: { type: "string", minLength: 1 },
            description: "Vehicle identifier.",
          },
        ],
        responses: {
          "200": {
            description: "Vehicle lookup scaffold response.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/VehicleLookup" },
                examples: {
                  scaffold: {
                    value: {
                      vehicleId: "vehicle_1",
                      status: "not_implemented",
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Authentication is missing or invalid.",
          },
          "403": {
            description: "Authenticated actor lacks inventory.read.",
          },
        },
      },
    },
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
      VehicleLookup: {
        type: "object",
        additionalProperties: false,
        required: ["vehicleId", "status"],
        properties: {
          vehicleId: { type: "string" },
          status: { type: "string", enum: ["not_implemented"] },
        },
      },
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
      "HTTP identity resolution is scaffolded; domain services already enforce permission checks through ServiceContext.",
  },
  "x-scopes": {
    "inventory.read": "Read vehicle inventory.",
    "inventory.create": "Create vehicle inventory records.",
    "inventory.update_description": "Edit descriptive vehicle fields.",
    "inventory.update_price": "Edit vehicle pricing.",
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
