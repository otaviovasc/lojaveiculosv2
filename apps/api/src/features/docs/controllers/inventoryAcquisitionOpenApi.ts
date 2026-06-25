import { jsonRequest } from "./inventoryOpenApiSchemas.js";
import {
  authResponses,
  listingIdParameter,
  queryParameter,
  unitIdParameter,
  validationResponse,
} from "./inventoryOpenApiParts.js";

const supplierIdParameter = {
  name: "supplierId",
  in: "path",
  required: true,
  schema: { type: "string", minLength: 1 },
  description: "Vehicle supplier identifier.",
} as const;

const supplierResponse = {
  description: "Vehicle supplier record.",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/VehicleSupplier" },
    },
  },
} as const;

const suppliersResponse = {
  description: "Vehicle suppliers.",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/VehicleSuppliersResponse" },
    },
  },
} as const;

const acquisitionResponse = {
  description: "Vehicle unit acquisition source.",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/VehicleUnitAcquisitionResponse" },
    },
  },
} as const;

export const inventoryAcquisitionPaths = {
  "/api/v1/inventory/suppliers": {
    get: {
      tags: ["Inventory"],
      summary: "List vehicle suppliers",
      operationId: "listVehicleSuppliers",
      security: [{ bearerAuth: ["inventory.read"] }],
      parameters: [queryParameter("search"), queryParameter("limit")],
      responses: { "200": suppliersResponse, ...authResponses },
    },
    post: {
      tags: ["Inventory"],
      summary: "Create vehicle supplier",
      operationId: "createVehicleSupplier",
      security: [{ bearerAuth: ["inventory.update_unit"] }],
      requestBody: jsonRequest("CreateVehicleSupplierRequest"),
      responses: {
        "201": supplierResponse,
        ...validationResponse,
        ...authResponses,
      },
    },
  },
  "/api/v1/inventory/suppliers/{supplierId}": {
    patch: {
      tags: ["Inventory"],
      summary: "Update vehicle supplier",
      operationId: "updateVehicleSupplier",
      security: [{ bearerAuth: ["inventory.update_unit"] }],
      parameters: [supplierIdParameter],
      requestBody: jsonRequest("UpdateVehicleSupplierRequest"),
      responses: {
        "200": supplierResponse,
        ...validationResponse,
        ...authResponses,
      },
    },
    delete: {
      tags: ["Inventory"],
      summary: "Archive vehicle supplier",
      operationId: "archiveVehicleSupplier",
      security: [{ bearerAuth: ["inventory.update_unit"] }],
      parameters: [supplierIdParameter],
      responses: { "200": supplierResponse, ...authResponses },
    },
  },
  "/api/v1/inventory/listings/{listingId}/units/{unitId}/acquisition": {
    get: {
      tags: ["Inventory"],
      summary: "Get vehicle unit acquisition source",
      operationId: "getVehicleUnitAcquisition",
      security: [{ bearerAuth: ["inventory.read"] }],
      parameters: [listingIdParameter, unitIdParameter],
      responses: { "200": acquisitionResponse, ...authResponses },
    },
    put: {
      tags: ["Inventory"],
      summary: "Save vehicle unit acquisition source",
      operationId: "upsertVehicleUnitAcquisition",
      security: [{ bearerAuth: ["inventory.update_unit"] }],
      parameters: [listingIdParameter, unitIdParameter],
      requestBody: jsonRequest("UpsertVehicleUnitAcquisitionRequest"),
      responses: {
        "200": {
          description: "Vehicle unit acquisition record.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/VehicleUnitAcquisition" },
            },
          },
        },
        ...validationResponse,
        ...authResponses,
      },
    },
  },
} as const;
