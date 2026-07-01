import { externalApiPaths, externalApiSchemas } from "./externalApiOpenApi.js";

export const externalApiDocsPaths = {
  "/api/v1/external-api/docs": docsPath("getExternalApiDocs"),
  "/api/v1/external-api/docs.md": docsPath("getExternalApiDocsMarkdown"),
  "/api/v1/external-api/llms.txt": {
    get: {
      tags: ["External API"],
      summary: "Return the Public API llms.txt index",
      operationId: "getExternalApiLlmsTxt",
      responses: {
        "200": { description: "LLM-friendly Public API documentation index." },
      },
    },
  },
  "/api/v1/external-api/openapi.json": {
    get: {
      tags: ["External API"],
      summary: "Return the scoped Public API OpenAPI document",
      operationId: "getExternalApiOpenApi",
      responses: {
        "200": { description: "OpenAPI document for Public API consumers." },
      },
    },
  },
} as const;

export const externalApiOpenApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Loja Veiculos Public API",
    version: "2026-07-01",
    summary: "Scoped external API for dealership inventory and CRM leads.",
    description:
      "Clean partner and AI-agent contract for public vehicle discovery and lead workflows. Private tenant, store, VIN, and full plate fields are intentionally excluded from runtime DTOs.",
  },
  servers: [{ url: "/", description: "Current deployment origin" }],
  tags: [
    {
      name: "External API",
      description:
        "Scoped API-key routes for partner apps, AI agents, custom websites, and CRM integrations.",
    },
  ],
  paths: {
    ...externalApiDocsPaths,
    ...externalApiPaths,
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Store user token for API client management routes.",
      },
      externalApiKey: {
        type: "apiKey",
        in: "header",
        name: "x-api-key",
        description:
          "Scoped Public API key. Authorization: Bearer lv2_... is also accepted.",
      },
    },
    schemas: {
      ...externalApiSchemas,
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
  "x-ai-native": {
    docs: "/api/v1/external-api/docs",
    llmsTxt: "/api/v1/external-api/llms.txt",
    manifest: "/api/v1/external-api/manifest",
    markdownDocs: "/api/v1/external-api/docs.md",
    openApi: "/api/v1/external-api/openapi.json",
    toolDefinitions: "/api/v1/external-api/ai-tools",
  },
} as const;

export const externalApiDocsMarkdown = `# Loja Veiculos Public API Docs

> Public API contract for dealership-safe vehicle discovery and CRM lead workflows. Use this route when an agent, SDK generator, or partner developer needs the canonical external API map without the full internal backend surface.

The Public API is tenant and store scoped by API key. Runtime DTOs intentionally omit private inventory identifiers such as tenant ids, store ids, VIN, and full plate fields.

## Canonical Resources
- [Public API llms.txt](/api/v1/external-api/llms.txt): Token-light index for LLMs and coding agents.
- [Public API OpenAPI](/api/v1/external-api/openapi.json): Scoped OpenAPI 3.1 document for external routes only.
- [Public API manifest](/api/v1/external-api/manifest): Capability manifest with auth, scopes, operations, and AI-native URLs.
- [Public API tool definitions](/api/v1/external-api/ai-tools): OpenAI-style function metadata for vehicle search and lead creation.
- [Markdown docs](/api/v1/external-api/docs.md): Markdown alias for this document.

## Authentication
- Send x-api-key: lv2_... or Authorization: Bearer lv2_....
- Use least-privilege scopes. Vehicle read routes require inventory.read. Lead create/read/update routes require lead.create, lead.read, or lead.update.
- Send Idempotency-Key with POST, PUT, PATCH, and DELETE requests.

## Core Endpoints
- GET /api/v1/external-api/vehicles: List clean external vehicle DTOs with pagination.
- GET /api/v1/external-api/vehicles/search: Search by q/search, price, year, mileage, color, fuel, transmission, and sort aliases.
- GET /api/v1/external-api/vehicles/{listingId}: Read one vehicle detail with public media only.
- GET /api/v1/external-api/leads: List CRM leads by status, source, phone, listingId, text query, page, and limit.
- POST /api/v1/external-api/leads: Create a lead from an external site, chatbot, marketplace, or custom app.
- GET /api/v1/external-api/leads/{leadId}: Read one CRM lead.
- PATCH /api/v1/external-api/leads/{leadId}: Update lead status or buyer contact fields.

## Safety Notes
- Do not expect VIN, full plate, tenant id, store id, private photos, or internal notes in public responses.
- Public media URLs are filtered to media marked public.
- Mutations are audited and idempotency-aware.
- Pagination caps are part of the public contract; agents should request more pages instead of assuming full inventory fits in one response.

## Optional
- [Global backend llms.txt](/llms.txt): Broader internal/backend API index. Use this only when you need the full V2 backend surface, not just Public API integration.
- [Global OpenAPI](/api/v1/openapi.json): Full backend OpenAPI document including authenticated operator routes.
`;

export const externalApiLlmsText = `# Loja Veiculos Public API

> AI-native Public API index for safe vehicle discovery and CRM lead workflows. Prefer this file over the global backend index when building partner apps, AI agents, custom dealer sites, or integrations that use scoped API keys.

This is a concise Markdown map. Fetch the scoped OpenAPI document for schemas. Fetch the manifest for live capability metadata. Fetch tool definitions when configuring function-calling agents.

## Canonical Documentation
- [Public API docs](/api/v1/external-api/docs): Human and agent-readable Markdown guide for auth, routes, safety, and usage.
- [Public API OpenAPI](/api/v1/external-api/openapi.json): OpenAPI 3.1 document containing only Public API and API-client management routes.
- [Public API manifest](/api/v1/external-api/manifest): Machine-readable capability manifest with scopes, operations, auth rules, and AI-native URLs.
- [Public API tool definitions](/api/v1/external-api/ai-tools): Function metadata for vehicle search and lead creation.

## Core Runtime Routes
- [List vehicles](/api/v1/external-api/vehicles): Requires inventory.read. Returns clean vehicle DTOs with public media summary.
- [Search vehicles](/api/v1/external-api/vehicles/search): Requires inventory.read. Supports q/search, available/status, price, mileage, year, color/cor, fuel, transmission, and sort.
- [Vehicle detail](/api/v1/external-api/vehicles/{listingId}): Requires inventory.read. Returns public media, safe unit refs, price history, and status history.
- [List leads](/api/v1/external-api/leads): Requires lead.read and CRM entitlement. Supports q/search, phone, source, status, listingId, page, and limit.
- [Create lead](/api/v1/external-api/leads): Requires lead.create and Idempotency-Key. Accepts V2 buyer fields and V1 aliases name/email/phone/message/vehicleId.
- [Lead detail](/api/v1/external-api/leads/{leadId}): Requires lead.read.
- [Update lead](/api/v1/external-api/leads/{leadId}): Requires lead.update and Idempotency-Key.

## Authentication And Safety
- Send x-api-key: lv2_... or Authorization: Bearer lv2_....
- Use least-privilege scopes: inventory.read, lead.create, lead.read, and lead.update.
- Responses omit tenant ids, store ids, VIN, full plate fields, private photos, and internal inventory notes.
- Public media URLs are filtered to media marked public.
- Mutations require Idempotency-Key and are audit-correlated by request id.

## Optional
- [Global Loja Veiculos API llms.txt](/llms.txt): Full backend API index. It is larger and includes operator-only routes.
- [Global backend OpenAPI](/api/v1/openapi.json): Full V2 backend OpenAPI surface.
`;

function docsPath(operationId: string) {
  return {
    get: {
      tags: ["External API"],
      summary: "Return the Public API Markdown documentation",
      operationId,
      responses: {
        "200": { description: "Markdown Public API documentation." },
      },
    },
  } as const;
}
