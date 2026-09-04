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
        "API-key mutations require Idempotency-Key. Identical completed requests replay the original bounded JSON response. Changed payloads and in-flight attempts return 409. Retry a 5xx attempt with a new key.",
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
        "Send Idempotency-Key with every API-key mutation. Identical completed requests replay the original bounded JSON status/body. Changed payloads and in-flight attempts return 409; retry 5xx attempts with a new key.",
    },
  } as const;
}

const externalApiTools = [
  {
    function: {
      description:
        "Check whether Credere is ready and which applicant fields or banks are required before a simulation.",
      name: "preflight_credere_simulation",
      parameters: {
        additionalProperties: false,
        properties: {
          bankCodes: { type: "array", items: { type: "string" } },
          document: { description: "Valid CPF or CNPJ.", type: "string" },
        },
        required: ["document"],
        type: "object",
      },
    },
    type: "function",
  },
  {
    function: {
      description:
        "Create an official Credere simulation after explicit personal-data and credit-simulation consent.",
      name: "create_credere_simulation",
      parameters: {
        additionalProperties: false,
        properties: {
          applicant: { type: "object" },
          consent: {
            description:
              "Must contain creditSimulation=true and personalData=true.",
            type: "object",
          },
          leadId: { type: "string" },
          listingId: { type: "string" },
          terms: { type: "object" },
          unitId: { type: "string" },
          vehicle: { type: "object" },
        },
        required: ["applicant", "consent", "terms", "vehicle"],
        type: "object",
      },
    },
    type: "function",
  },
  {
    function: {
      description:
        "Read the official Credere status and bank conditions for one inquiry.",
      name: "get_credere_simulation",
      parameters: {
        additionalProperties: false,
        properties: { inquiryId: { type: "string" } },
        required: ["inquiryId"],
        type: "object",
      },
    },
    type: "function",
  },
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
