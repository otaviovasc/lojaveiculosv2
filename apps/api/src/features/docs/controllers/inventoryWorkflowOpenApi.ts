import { jsonRequest } from "./inventoryOpenApiSchemas.js";
import {
  authResponses,
  detailResponse,
  unitIdParameter,
  validationResponse,
} from "./inventoryOpenApiParts.js";

export const inventoryWorkflowPaths = {
  "/api/v1/inventory/units/{unitId}/reserve": {
    post: {
      tags: ["Inventory"],
      summary: "Reserve unit",
      description:
        "Reserves a vehicle unit, records buyer/signal payment data, emits reservation_receipt, and creates linked finance_entries.",
      operationId: "reserveInventoryUnit",
      security: [{ bearerAuth: ["inventory.reserve"] }],
      parameters: [unitIdParameter],
      requestBody: jsonRequest("ReserveVehicleUnitRequest"),
      responses: {
        "201": detailResponse,
        ...validationResponse,
        ...authResponses,
      },
    },
  },
  "/api/v1/inventory/units/{unitId}/sell": {
    post: {
      tags: ["Inventory"],
      summary: "Sell unit",
      description:
        "Sells a vehicle unit, emits sale documents, and creates linked finance_entries for sale/payment accounting.",
      operationId: "sellInventoryUnit",
      security: [{ bearerAuth: ["inventory.sell"] }],
      parameters: [unitIdParameter],
      requestBody: jsonRequest("SellVehicleUnitRequest"),
      responses: {
        "201": detailResponse,
        ...validationResponse,
        ...authResponses,
      },
    },
  },
  "/api/v1/inventory/units/{unitId}/reservation/release": {
    post: {
      tags: ["Inventory"],
      summary: "Release unit reservation",
      description:
        "Releases a reserved vehicle unit, cancels the pending reservation sale/payment, cancels the pending signal finance entry, and writes audit evidence.",
      operationId: "releaseInventoryUnitReservation",
      security: [{ bearerAuth: ["inventory.reserve"] }],
      parameters: [unitIdParameter],
      requestBody: jsonRequest("ReleaseVehicleUnitReservationRequest"),
      responses: {
        "200": detailResponse,
        ...validationResponse,
        ...authResponses,
      },
    },
  },
  "/api/v1/inventory/units/{unitId}/reservation/cancel": {
    post: {
      tags: ["Inventory"],
      summary: "Cancel unit reservation",
      description:
        "Cancels a reserved vehicle unit, cancels the pending reservation sale/payment, cancels the pending signal finance entry, and writes cancellation audit evidence.",
      operationId: "cancelInventoryUnitReservation",
      security: [{ bearerAuth: ["inventory.reserve"] }],
      parameters: [unitIdParameter],
      requestBody: jsonRequest("ReleaseVehicleUnitReservationRequest"),
      responses: {
        "200": detailResponse,
        ...validationResponse,
        ...authResponses,
      },
    },
  },
  "/api/v1/inventory/units/{unitId}/reservation/expire": {
    post: {
      tags: ["Inventory"],
      summary: "Expire unit reservation",
      description:
        "Expires a reserved vehicle unit, cancels the pending reservation sale/payment, cancels the pending signal finance entry, and writes expiry audit evidence.",
      operationId: "expireInventoryUnitReservation",
      security: [{ bearerAuth: ["inventory.reserve"] }],
      parameters: [unitIdParameter],
      requestBody: jsonRequest("ReleaseVehicleUnitReservationRequest"),
      responses: {
        "200": detailResponse,
        ...validationResponse,
        ...authResponses,
      },
    },
  },
} as const;
