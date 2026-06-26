import { jsonRequest } from "./inventoryOpenApiSchemas.js";
import {
  authResponses,
  checklistIdParameter,
  detailResponse,
  unitIdParameter,
  validationResponse,
} from "./inventoryOpenApiParts.js";

const checklistListResponse = {
  description: "Unit checklists.",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/VehicleChecklistList" },
    },
  },
} as const;

export const inventoryChecklistPaths = {
  "/api/v1/inventory/units/{unitId}/checklists": {
    get: {
      tags: ["Inventory"],
      summary: "List unit checklists",
      operationId: "listInventoryUnitChecklists",
      security: [{ bearerAuth: ["inventory.checklist_read"] }],
      parameters: [unitIdParameter],
      responses: {
        "200": checklistListResponse,
        ...authResponses,
      },
    },
    post: {
      tags: ["Inventory"],
      summary: "Create unit checklist",
      operationId: "createInventoryUnitChecklist",
      security: [{ bearerAuth: ["inventory.checklist_update"] }],
      parameters: [unitIdParameter],
      requestBody: jsonRequest("CreateVehicleChecklistRequest"),
      responses: {
        "201": detailResponse,
        ...validationResponse,
        ...authResponses,
      },
    },
  },
  "/api/v1/inventory/units/{unitId}/checklists/{checklistId}": {
    patch: {
      tags: ["Inventory"],
      summary: "Update unit checklist",
      operationId: "updateInventoryUnitChecklist",
      security: [{ bearerAuth: ["inventory.checklist_update"] }],
      parameters: [unitIdParameter, checklistIdParameter],
      requestBody: jsonRequest("UpdateVehicleChecklistRequest"),
      responses: {
        "200": detailResponse,
        ...validationResponse,
        ...authResponses,
      },
    },
  },
} as const;
