import { jsonRequest } from "./inventoryOpenApiSchemas.js";
import {
  authResponses,
  unitIdParameter,
  validationResponse,
} from "./inventoryOpenApiParts.js";

const costIdParameter = {
  in: "path",
  name: "costId",
  required: true,
  schema: { type: "string" },
} as const;

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
  "/api/v1/inventory/units/{unitId}/costs/{costId}": {
    patch: {
      tags: ["Inventory"],
      summary: "Correct vehicle cost",
      description:
        "Corrects an active vehicle cost and its linked finance entry while preserving audit history.",
      operationId: "updateInventoryUnitCost",
      security: [{ bearerAuth: ["inventory.cost_update"] }],
      parameters: [unitIdParameter, costIdParameter],
      requestBody: jsonRequest("UpdateVehicleCostRequest"),
      responses: {
        "200": { description: "Vehicle cost corrected." },
        "409": { description: "Vehicle cost is no longer active." },
        ...validationResponse,
        ...authResponses,
      },
    },
  },
  "/api/v1/inventory/units/{unitId}/costs/{costId}/void": {
    post: {
      tags: ["Inventory"],
      summary: "Void vehicle cost",
      description:
        "Voids an active vehicle cost, cancels its linked finance entry, and preserves the row and reason for audit history.",
      operationId: "voidInventoryUnitCost",
      security: [{ bearerAuth: ["inventory.cost_void"] }],
      parameters: [unitIdParameter, costIdParameter],
      requestBody: jsonRequest("VoidVehicleCostRequest"),
      responses: {
        "200": { description: "Vehicle cost voided." },
        "409": { description: "Vehicle cost is no longer active." },
        ...validationResponse,
        ...authResponses,
      },
    },
  },
} as const;
