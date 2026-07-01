import { inventorySchemas, jsonRequest } from "./inventoryOpenApiSchemas.js";
import { inventoryAcquisitionPaths } from "./inventoryAcquisitionOpenApi.js";
import { inventoryFinancePaths } from "./inventoryFinanceOpenApi.js";
import { inventoryChecklistPaths } from "./inventoryChecklistOpenApi.js";
import { inventoryWorkflowPaths } from "./inventoryWorkflowOpenApi.js";
import { inventoryMediaPaths } from "./inventoryMediaOpenApi.js";
import {
  authResponses,
  detailResponse,
  listingIdParameter,
  listResponse,
  queryParameter,
  unitListResponse,
  unitIdParameter,
  validationResponse,
} from "./inventoryOpenApiParts.js";

export const inventoryPaths = {
  "/api/v1/inventory/units": {
    get: {
      tags: ["Inventory"],
      summary: "List inventory units",
      description:
        "Returns one inventory row per vehicle unit. Listings remain the commercial grouping; units are the stock objects shown on the inventory page.",
      operationId: "listInventoryUnits",
      security: [{ bearerAuth: ["inventory.read"] }],
      parameters: [
        queryParameter("search"),
        queryParameter("status"),
        queryParameter("limit"),
        queryParameter("offset"),
      ],
      responses: {
        "200": unitListResponse,
        ...validationResponse,
        ...authResponses,
      },
    },
  },
  "/api/v1/inventory/listings": {
    get: {
      tags: ["Inventory"],
      summary: "List inventory listing groups",
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
  "/api/v1/inventory/listings/{listingId}/publish": {
    post: {
      tags: ["Inventory"],
      summary: "Publish listing",
      description:
        "Publishes a listing to the public storefront with an explicit or generated public slug, visible flag, status history, and audit evidence.",
      operationId: "publishInventoryListing",
      security: [{ bearerAuth: ["inventory.update_status"] }],
      parameters: [listingIdParameter],
      requestBody: jsonRequest("PublishListingRequest"),
      responses: {
        "200": detailResponse,
        ...validationResponse,
        ...authResponses,
      },
    },
  },
  "/api/v1/inventory/listings/{listingId}/unpublish": {
    post: {
      tags: ["Inventory"],
      summary: "Unpublish listing",
      description:
        "Removes a listing from the public storefront while preserving its slug for later republish.",
      operationId: "unpublishInventoryListing",
      security: [{ bearerAuth: ["inventory.update_status"] }],
      parameters: [listingIdParameter],
      requestBody: jsonRequest("UnpublishListingRequest"),
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
  "/api/v1/inventory/units/{unitId}": {
    patch: {
      tags: ["Inventory"],
      summary: "Update inventory unit",
      operationId: "updateInventoryUnit",
      security: [{ bearerAuth: ["inventory.update_unit"] }],
      parameters: [unitIdParameter],
      requestBody: jsonRequest("UpdateVehicleUnitRequest"),
      responses: {
        "200": detailResponse,
        ...validationResponse,
        ...authResponses,
      },
    },
  },
  ...inventoryAcquisitionPaths,
  ...inventoryMediaPaths,
  ...inventoryChecklistPaths,
  ...inventoryFinancePaths,
  ...inventoryWorkflowPaths,
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
