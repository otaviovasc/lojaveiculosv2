export function createExternalApiManifest(baseUrl: string) {
  return {
    aiNative: {
      llmsTxt: `${baseUrl}/llms.txt`,
      openApi: `${baseUrl}/api/v1/openapi.json`,
      toolDefinitions: `${baseUrl}/api/v1/external-api/ai-tools`,
    },
    auth: {
      headers: ["x-api-key: lv2_...", "Authorization: Bearer lv2_..."],
      idempotency:
        "POST, PUT, PATCH, and DELETE requests require Idempotency-Key.",
      rateLimit:
        "Default 120 requests per minute per API client. The deployment can override this limit.",
    },
    baseUrl,
    operations: externalApiOperations,
    scopes: externalApiRuntimeScopes,
    version: "2026-06-30",
  } as const;
}

export function createExternalApiTools(baseUrl: string) {
  return {
    baseUrl,
    tools: externalApiTools,
    usage: {
      auth: "Send x-api-key with a scoped key created in Admin > Public API.",
      mutationHeaders:
        "Send Idempotency-Key with every mutation. Reuse never means retry; duplicate keys are rejected after the first accepted request.",
    },
  } as const;
}

export const externalApiRuntimeScopes = [
  {
    description: "Read the clean external vehicle list and vehicle detail.",
    key: "inventory.read",
  },
  {
    description: "Create leads from forms, agents, marketplaces, or chatbots.",
    key: "lead.create",
  },
  {
    description: "Read CRM leads created by any channel.",
    key: "lead.read",
  },
  {
    description: "Update lead status or buyer contact fields.",
    key: "lead.update",
  },
] as const;

const externalApiOperations = [
  {
    method: "GET",
    path: "/api/v1/external-api/vehicles",
    scope: "inventory.read",
    summary: "List vehicles with pagination and V1-compatible filters.",
  },
  {
    method: "GET",
    path: "/api/v1/external-api/vehicles/search",
    scope: "inventory.read",
    summary:
      "Search vehicles by query, price, year, mileage, color, fuel, and transmission.",
  },
  {
    method: "GET",
    path: "/api/v1/external-api/vehicles/{listingId}",
    scope: "inventory.read",
    summary:
      "Read one vehicle detail without tenant, store, VIN, or full plate fields.",
  },
  {
    method: "GET",
    path: "/api/v1/external-api/leads",
    scope: "lead.read",
    summary:
      "List CRM leads with status, source, phone, listing, and text search filters.",
  },
  {
    method: "POST",
    path: "/api/v1/external-api/leads",
    scope: "lead.create",
    summary:
      "Create a lead from an external site, agent, marketplace, or custom app.",
  },
  {
    method: "GET",
    path: "/api/v1/external-api/leads/{leadId}",
    scope: "lead.read",
    summary: "Read one lead detail.",
  },
  {
    method: "PATCH",
    path: "/api/v1/external-api/leads/{leadId}",
    scope: "lead.update",
    summary: "Update lead status and buyer contact fields.",
  },
] as const;

const externalApiTools = [
  {
    function: {
      description: "Find vehicles that match buyer intent.",
      name: "search_vehicles",
      parameters: {
        additionalProperties: false,
        properties: {
          maxPrice: { description: "Maximum price in BRL.", type: "number" },
          maxYear: { type: "integer" },
          minPrice: { description: "Minimum price in BRL.", type: "number" },
          minYear: { type: "integer" },
          q: {
            description: "Buyer query, brand, model, color, or title.",
            type: "string",
          },
          sort: {
            enum: ["recent", "price_asc", "price_desc", "year_desc", "km_asc"],
            type: "string",
          },
        },
        type: "object",
      },
    },
    type: "function",
  },
  {
    function: {
      description: "Create a CRM lead for a buyer interested in a vehicle.",
      name: "create_vehicle_lead",
      parameters: {
        additionalProperties: false,
        properties: {
          buyerEmail: { type: "string" },
          buyerName: { type: "string" },
          buyerPhone: { type: "string" },
          listingId: { type: "string" },
          message: { type: "string" },
        },
        required: ["buyerName"],
        type: "object",
      },
    },
    type: "function",
  },
] as const;
