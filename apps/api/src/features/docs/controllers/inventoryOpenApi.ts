import { inventorySchemas, jsonRequest } from "./inventoryOpenApiSchemas.js";
import { inventoryFinancePaths } from "./inventoryFinanceOpenApi.js";
import {
  authResponses,
  detailResponse,
  listingIdParameter,
  listResponse,
  mediaCreatedResponse,
  mediaUploadResponse,
  queryParameter,
  unitIdParameter,
  validationResponse,
} from "./inventoryOpenApiParts.js";

export const inventoryPaths = {
  "/api/v1/inventory/listings": {
    get: {
      tags: ["Inventory"],
      summary: "List inventory stock",
      operationId: "listInventoryListings",
      security: [{ bearerAuth: ["inventory.read"] }],
      parameters: [
        queryParameter("search"),
        queryParameter("status"),
        queryParameter("limit"),
        queryParameter("offset"),
      ],
      responses: {
        "200": listResponse,
        ...validationResponse,
        ...authResponses,
      },
    },
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
        "201": detailResponse,
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
        "200": detailResponse,
        ...authResponses,
      },
    },
    patch: {
      tags: ["Inventory"],
      summary: "Update listing details",
      operationId: "updateInventoryListingDetails",
      security: [
        {
          bearerAuth: [
            "inventory.update_description",
            "inventory.update_internal_notes",
            "inventory.update_price",
            "inventory.update_status",
          ],
        },
      ],
      parameters: [listingIdParameter],
      requestBody: jsonRequest("UpdateListingDetailsRequest"),
      responses: {
        "200": detailResponse,
        ...validationResponse,
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
        "200": detailResponse,
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
        "200": detailResponse,
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
        "200": detailResponse,
        ...validationResponse,
        ...authResponses,
      },
    },
  },
  "/api/v1/inventory/listings/{listingId}/units/{unitId}": {
    patch: {
      tags: ["Inventory"],
      summary: "Update listing unit",
      operationId: "updateInventoryListingUnit",
      security: [{ bearerAuth: ["inventory.update_unit"] }],
      parameters: [listingIdParameter, unitIdParameter],
      requestBody: jsonRequest("UpdateListingUnitRequest"),
      responses: {
        "200": detailResponse,
        ...validationResponse,
        ...authResponses,
      },
    },
  },
  "/api/v1/inventory/listings/{listingId}/media/uploads": {
    post: {
      tags: ["Inventory"],
      summary: "Request media upload URL",
      operationId: "requestInventoryListingMediaUpload",
      security: [{ bearerAuth: ["inventory.create"] }],
      parameters: [listingIdParameter],
      requestBody: jsonRequest("RequestVehicleMediaUploadRequest"),
      responses: {
        "201": mediaUploadResponse,
        ...validationResponse,
        ...authResponses,
      },
    },
  },
  "/api/v1/inventory/listings/{listingId}/media": {
    post: {
      tags: ["Inventory"],
      summary: "Attach uploaded media to listing",
      operationId: "createInventoryListingMedia",
      security: [{ bearerAuth: ["inventory.create"] }],
      parameters: [listingIdParameter],
      requestBody: jsonRequest("CreateVehicleMediaRequest"),
      responses: {
        "201": mediaCreatedResponse,
        ...validationResponse,
        ...authResponses,
      },
    },
  },
  ...inventoryFinancePaths,
  "/api/v1/inventory/listings/{listingId}/reserve": {
    post: {
      tags: ["Inventory"],
      summary: "Reserve listing",
      description:
        "Reserves a listing unit, records buyer/signal payment data, emits reservation_receipt, and creates linked finance_entries.",
      operationId: "reserveInventoryListing",
      security: [{ bearerAuth: ["inventory.reserve"] }],
      parameters: [listingIdParameter],
      requestBody: jsonRequest("ReserveVehicleListingRequest"),
      responses: {
        "201": detailResponse,
        ...validationResponse,
        ...authResponses,
      },
    },
  },
  "/api/v1/inventory/listings/{listingId}/sell": {
    post: {
      tags: ["Inventory"],
      summary: "Sell listing",
      description:
        "Sells a listing unit, emits sale documents, and creates linked finance_entries for sale/payment accounting.",
      operationId: "sellInventoryListing",
      security: [{ bearerAuth: ["inventory.sell"] }],
      parameters: [listingIdParameter],
      requestBody: jsonRequest("SellVehicleListingRequest"),
      responses: {
        "201": detailResponse,
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
        "200": detailResponse,
        ...validationResponse,
        ...authResponses,
      },
    },
  },
} as const;

export { inventorySchemas };
