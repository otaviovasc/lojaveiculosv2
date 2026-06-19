import { jsonRequest } from "./inventoryOpenApiSchemas.js";
import {
  authResponses,
  listingIdParameter,
  validationResponse,
} from "./inventoryOpenApiParts.js";

export const inventoryFinancePaths = {
  "/api/v1/inventory/listings/{listingId}/costs": {
    post: {
      tags: ["Inventory"],
      summary: "Create vehicle cost",
      description:
        "Creates a vehicle cost and a finance_entries expense linked through finance_entry_links to vehicle_cost, vehicle_listing, and vehicle_unit when available.",
      operationId: "createInventoryListingCost",
      security: [{ bearerAuth: ["inventory.cost_create"] }],
      parameters: [listingIdParameter],
      requestBody: jsonRequest("CreateVehicleCostRequest"),
      responses: {
        "201": {
          description: "Vehicle cost and linked finance entry created.",
        },
        ...validationResponse,
        ...authResponses,
      },
    },
  },
} as const;
