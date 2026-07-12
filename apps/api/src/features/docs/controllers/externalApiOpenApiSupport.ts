import { listingStatuses } from "../../inventory/controllers/vehicle.controller.statuses.js";

const leadSources = [
  "public_site",
  "crm",
  "external_api",
  "manual",
  "olx",
  "whatsapp",
  "other",
] as const;
const leadStatuses = [
  "new",
  "contacted",
  "qualified",
  "negotiating",
  "won",
  "lost",
  "archived",
] as const;

export const externalRuntimeSecurity = [
  { externalApiKey: [] },
  { externalApiBearer: [] },
] as const;
export const managementSecurity = [{ bearerAuth: [] }] as const;

export const idempotencyKeyParameter = {
  in: "header",
  name: "Idempotency-Key",
  required: true,
  description:
    "Mutation deduplication key. Reuse is rejected with 409; the earlier response is not replayed.",
  schema: { type: "string", minLength: 1 },
} as const;

export const listingIdParameter = pathParameter(
  "listingId",
  "Canonical V2 listing identifier.",
);
export const leadIdParameter = pathParameter(
  "leadId",
  "Canonical V2 CRM lead identifier.",
);

export const vehicleQueryParameters = [
  booleanQuery("available", "Limit results to published vehicle listings."),
  stringQuery("color", "Vehicle color filter."),
  stringQuery("cor", "V1-compatible alias for color."),
  stringQuery("fuel", "V1-compatible fuel filter."),
  stringQuery("fuelType", "Fuel type filter."),
  limitQuery(),
  integerQuery("maxKm", 0),
  integerQuery("maxMileageKm", 0),
  numberQuery("maxPrice", 0),
  numberQuery("maxPriceCents", 0),
  integerQuery("maxYear", 1900, 2200),
  integerQuery("minKm", 0),
  integerQuery("minMileageKm", 0),
  numberQuery("minPrice", 0),
  numberQuery("minPriceCents", 0),
  integerQuery("minYear", 1900, 2200),
  integerQuery("offset", 0),
  pageQuery(),
  stringQuery("q", "V1-compatible vehicle search query."),
  stringQuery("search", "Vehicle title, brand, or model search query."),
  enumQuery(
    "sort",
    [
      "highlight",
      "km_asc",
      "km_desc",
      "price_asc",
      "price_desc",
      "recent",
      "year_asc",
      "year_desc",
    ],
    "recent",
  ),
  enumQuery("status", listingStatuses),
  stringQuery("transmission", "Transmission filter."),
] as const;

export const leadQueryParameters = [
  limitQuery(),
  stringQuery("listingId", "Filter leads by listing identifier."),
  integerQuery("offset", 0),
  pageQuery(),
  stringQuery("phone", "Search buyer phone."),
  stringQuery("q", "V1-compatible lead search query."),
  stringQuery("search", "Lead text search query."),
  enumQuery("source", leadSources),
  enumQuery("status", leadStatuses),
] as const;

export const protectedErrorResponses = {
  "400": errorResponse("Invalid request or missing deduplication key."),
  "401": errorResponse("Missing or invalid authentication."),
  "403": errorResponse("The authenticated actor lacks the required scope."),
  "429": errorResponse("External API rate limit exceeded."),
  "500": errorResponse("Unexpected server error."),
} as const;

export function jsonResponse(description: string, schemaName: string) {
  return {
    description,
    content: {
      "application/json": {
        schema: { $ref: `#/components/schemas/${schemaName}` },
      },
    },
  } as const;
}

export function requestBody(schemaName: string) {
  return {
    required: true,
    content: {
      "application/json": {
        schema: { $ref: `#/components/schemas/${schemaName}` },
      },
    },
  } as const;
}

export function errorResponse(description: string) {
  return jsonResponse(description, "ApiError");
}

function pathParameter(name: string, description: string) {
  return {
    in: "path",
    name,
    required: true,
    description,
    schema: { type: "string", minLength: 1 },
  } as const;
}

function stringQuery(name: string, description: string) {
  return parameter(name, { type: "string", minLength: 1 }, description);
}

function booleanQuery(name: string, description: string) {
  return parameter(name, { type: "boolean" }, description);
}

function integerQuery(name: string, minimum: number, maximum?: number) {
  return parameter(name, {
    type: "integer",
    minimum,
    ...(maximum === undefined ? {} : { maximum }),
  });
}

function numberQuery(name: string, minimum: number) {
  return parameter(name, { type: "number", minimum });
}

function enumQuery(
  name: string,
  values: readonly string[],
  defaultValue?: string,
) {
  return parameter(name, {
    type: "string",
    enum: values,
    ...(defaultValue ? { default: defaultValue } : {}),
  });
}

function limitQuery() {
  return parameter("limit", {
    type: "integer",
    minimum: 1,
    maximum: 100,
    default: 50,
  });
}

function pageQuery() {
  return parameter("page", { type: "integer", minimum: 1, default: 1 });
}

function parameter(
  name: string,
  schema: Record<string, unknown>,
  description?: string,
) {
  return {
    in: "query",
    name,
    ...(description ? { description } : {}),
    schema,
  } as const;
}
