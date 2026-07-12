const nullableString = {
  anyOf: [{ type: "string" }, { type: "null" }],
} as const;
const nullableInteger = {
  anyOf: [{ type: "integer" }, { type: "null" }],
} as const;

const vehicleProperties = {
  availability: {
    type: "object",
    additionalProperties: false,
    required: ["availableUnits", "reservedUnits", "unitCount"],
    properties: {
      availableUnits: { type: "integer", minimum: 0 },
      reservedUnits: { type: "integer", minimum: 0 },
      unitCount: { type: "integer", minimum: 0 },
    },
  },
  catalog: {
    anyOf: [{ type: "object", additionalProperties: true }, { type: "null" }],
  },
  colors: {
    type: "array",
    items: {
      type: "object",
      additionalProperties: false,
      required: ["name", "quantity"],
      properties: {
        name: { type: "string" },
        quantity: { type: "integer", minimum: 1 },
      },
    },
  },
  createdAt: { type: "string", format: "date-time" },
  description: nullableString,
  id: { type: "string" },
  mileageKm: nullableInteger,
  object: { type: "string", const: "vehicle" },
  priceCents: nullableInteger,
  specs: { type: "object", additionalProperties: true },
  status: { type: "string" },
  title: { type: "string" },
  trimName: nullableString,
  updatedAt: { type: "string", format: "date-time" },
  years: {
    type: "object",
    additionalProperties: false,
    required: ["manufacture", "model"],
    properties: {
      manufacture: nullableInteger,
      model: nullableInteger,
    },
  },
} as const;

const vehicleRequired = [
  "availability",
  "catalog",
  "colors",
  "createdAt",
  "description",
  "id",
  "media",
  "mileageKm",
  "object",
  "priceCents",
  "specs",
  "status",
  "title",
  "trimName",
  "updatedAt",
  "years",
] as const;

export const externalApiVehicleSchemas = {
  ExternalApiVehicleListItem: {
    type: "object",
    additionalProperties: false,
    required: vehicleRequired,
    properties: {
      ...vehicleProperties,
      media: {
        type: "object",
        additionalProperties: false,
        required: ["count", "primaryImageUrl"],
        properties: {
          count: { type: "integer", minimum: 0 },
          primaryImageUrl: nullableString,
        },
      },
    },
  },
  ExternalApiVehicleDetail: {
    type: "object",
    additionalProperties: false,
    required: [...vehicleRequired, "priceHistory", "statusHistory", "units"],
    properties: {
      ...vehicleProperties,
      media: {
        type: "array",
        items: { type: "object", additionalProperties: true },
      },
      priceHistory: {
        type: "array",
        items: { type: "object", additionalProperties: true },
      },
      statusHistory: {
        type: "array",
        items: { type: "object", additionalProperties: true },
      },
      units: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["colorName", "id", "status", "stockNumber"],
          properties: {
            colorName: nullableString,
            id: { type: "string" },
            status: { type: "string" },
            stockNumber: nullableString,
          },
        },
      },
    },
  },
  ExternalApiVehicleListResponse: {
    type: "object",
    additionalProperties: false,
    required: ["data", "meta", "pagination"],
    properties: {
      data: {
        type: "array",
        items: { $ref: "#/components/schemas/ExternalApiVehicleListItem" },
      },
      meta: {
        type: "object",
        additionalProperties: false,
        required: ["contract", "filtersAppliedInEnvelope"],
        properties: {
          contract: {
            type: "string",
            const: "external-api.vehicle-list.v1",
          },
          filtersAppliedInEnvelope: { type: "boolean" },
        },
      },
      pagination: { $ref: "#/components/schemas/ExternalApiPagination" },
    },
  },
  ExternalApiVehicleResponse: {
    type: "object",
    additionalProperties: false,
    required: ["data"],
    properties: {
      data: { $ref: "#/components/schemas/ExternalApiVehicleDetail" },
    },
  },
} as const;
