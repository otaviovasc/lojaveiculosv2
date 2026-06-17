const listingIdParameter = {
  name: "listingId",
  in: "path",
  required: true,
  schema: { type: "string", minLength: 1 },
  description: "Inventory listing identifier.",
} as const;

const scaffoldResponse = {
  description: "Listing scaffold response.",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/ListingScaffold" },
      examples: {
        scaffold: {
          value: {
            listingId: "listing_1",
            status: "not_implemented",
          },
        },
      },
    },
  },
} as const;

const authResponses = {
  "401": { description: "Authentication is missing or invalid." },
  "403": { description: "Authenticated actor lacks the required scope." },
} as const;

const validationResponse = {
  "400": {
    description: "Request body is invalid.",
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/ApiError" },
      },
    },
  },
} as const;

export const inventoryPaths = {
  "/api/v1/inventory/listings": {
    post: {
      tags: ["Inventory"],
      summary: "Create listing",
      description:
        "Creates an inventory listing through the planned createListing service boundary.",
      operationId: "createInventoryListing",
      security: [{ bearerAuth: ["inventory.create"] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/CreateListingRequest" },
          },
        },
      },
      responses: {
        "201": scaffoldResponse,
        ...validationResponse,
        ...authResponses,
      },
    },
  },
  "/api/v1/inventory/listings/{listingId}": {
    get: {
      tags: ["Inventory"],
      summary: "Get listing",
      description:
        "Returns a listing through the planned getListing service boundary.",
      operationId: "getInventoryListing",
      security: [{ bearerAuth: ["inventory.read"] }],
      parameters: [listingIdParameter],
      responses: {
        "200": scaffoldResponse,
        ...authResponses,
      },
    },
  },
  "/api/v1/inventory/listings/{listingId}/description": {
    patch: {
      tags: ["Inventory"],
      summary: "Update listing description",
      operationId: "updateInventoryListingDescription",
      security: [{ bearerAuth: ["inventory.update_description"] }],
      parameters: [listingIdParameter],
      requestBody: jsonRequest("UpdateListingDescriptionRequest"),
      responses: {
        "200": scaffoldResponse,
        ...validationResponse,
        ...authResponses,
      },
    },
  },
  "/api/v1/inventory/listings/{listingId}/price": {
    patch: {
      tags: ["Inventory"],
      summary: "Update listing price",
      operationId: "updateInventoryListingPrice",
      security: [{ bearerAuth: ["inventory.update_price"] }],
      parameters: [listingIdParameter],
      requestBody: jsonRequest("UpdateListingPriceRequest"),
      responses: {
        "200": scaffoldResponse,
        ...validationResponse,
        ...authResponses,
      },
    },
  },
  "/api/v1/inventory/listings/{listingId}/unit": {
    put: {
      tags: ["Inventory"],
      summary: "Attach unit to listing",
      operationId: "attachInventoryListingUnit",
      security: [{ bearerAuth: ["inventory.create"] }],
      parameters: [listingIdParameter],
      requestBody: jsonRequest("AttachListingUnitRequest"),
      responses: {
        "200": scaffoldResponse,
        ...validationResponse,
        ...authResponses,
      },
    },
  },
  "/api/v1/inventory/listings/{listingId}/status": {
    patch: {
      tags: ["Inventory"],
      summary: "Change listing status",
      operationId: "changeInventoryListingStatus",
      security: [{ bearerAuth: ["inventory.update_status"] }],
      parameters: [listingIdParameter],
      requestBody: jsonRequest("ChangeListingStatusRequest"),
      responses: {
        "200": scaffoldResponse,
        ...validationResponse,
        ...authResponses,
      },
    },
  },
} as const;

export const inventorySchemas = {
  AttachListingUnitRequest: objectSchema([], {
    plate: { type: ["string", "null"], minLength: 1 },
    stockNumber: { type: ["string", "null"], minLength: 1 },
    vin: { type: ["string", "null"], minLength: 1 },
  }),
  ChangeListingStatusRequest: objectSchema(["status"], {
    status: {
      type: "string",
      enum: ["draft", "available", "reserved", "sold", "inactive"],
    },
  }),
  CreateListingRequest: objectSchema(["title"], {
    description: { type: ["string", "null"], minLength: 1 },
    plate: { type: ["string", "null"], minLength: 1, default: null },
    priceCents: { type: ["integer", "null"], minimum: 0 },
    status: {
      type: "string",
      enum: ["draft", "available", "reserved", "sold", "inactive"],
    },
    title: { type: "string", minLength: 1 },
  }),
  ListingScaffold: objectSchema(["listingId", "status"], {
    listingId: { type: "string" },
    status: { type: "string", enum: ["not_implemented"] },
  }),
  UpdateListingDescriptionRequest: objectSchema(["description"], {
    description: { type: "string", minLength: 1 },
  }),
  UpdateListingPriceRequest: objectSchema(["priceCents"], {
    priceCents: { type: ["integer", "null"], minimum: 0 },
  }),
} as const;

function jsonRequest(schemaName: keyof typeof inventorySchemas) {
  return {
    required: true,
    content: {
      "application/json": {
        schema: { $ref: `#/components/schemas/${schemaName}` },
      },
    },
  } as const;
}

function objectSchema(
  required: readonly string[],
  properties: Record<string, unknown>,
) {
  return {
    type: "object",
    additionalProperties: false,
    required,
    properties,
  } as const;
}
