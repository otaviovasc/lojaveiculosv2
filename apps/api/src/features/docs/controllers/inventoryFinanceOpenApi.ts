import { jsonRequest } from "./inventoryOpenApiSchemas.js";
import {
  authResponses,
  unitIdParameter,
  validationResponse,
} from "./inventoryOpenApiParts.js";

export const inventoryFinancePaths = {
  "/api/v1/inventory/units/{unitId}/costs": {
    post: {
      tags: ["Inventory"],
      summary: "Create vehicle cost",
      description:
        "Creates a vehicle cost and a finance_entries expense linked through finance_entry_links to vehicle_cost and vehicle_unit.",
      operationId: "createInventoryUnitCost",
      security: [{ bearerAuth: ["inventory.cost_create"] }],
      parameters: [unitIdParameter],
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
