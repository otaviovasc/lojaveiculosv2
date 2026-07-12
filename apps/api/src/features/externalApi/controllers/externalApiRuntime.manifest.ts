import {
  externalApiContractVersion,
  externalApiRuntimeOperations,
  externalApiRuntimeScopes,
} from "@lojaveiculosv2/shared";

export function createExternalApiManifest(baseUrl: string) {
  return {
    aiNative: {
      docs: `${baseUrl}/api/v1/external-api/docs`,
      llmsTxt: `${baseUrl}/api/v1/external-api/llms.txt`,
      markdownDocs: `${baseUrl}/api/v1/external-api/docs.md`,
      openApi: `${baseUrl}/api/v1/external-api/openapi.json`,
      toolDefinitions: `${baseUrl}/api/v1/external-api/ai-tools`,
    },
    auth: {
      headers: ["x-api-key: lv2_...", "Authorization: Bearer lv2_..."],
      mutationDeduplication:
        "API-key mutations require Idempotency-Key. A reused key is rejected with 409; the earlier response is not replayed.",
      rateLimit:
        "Default 120 requests per minute per API client. The deployment can override this limit.",
    },
    baseUrl,
    operations: externalApiRuntimeOperations,
    scopes: externalApiRuntimeScopes,
    version: externalApiContractVersion,
  } as const;
}

export function createExternalApiTools(baseUrl: string) {
  return {
    baseUrl,
    tools: externalApiTools,
    usage: {
      auth: "Send x-api-key with a scoped key created in Admin > Public API.",
      mutationDeduplication:
        "Send Idempotency-Key with every API-key mutation. Reuse is rejected with 409 and never replays the earlier response.",
    },
  } as const;
}

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
