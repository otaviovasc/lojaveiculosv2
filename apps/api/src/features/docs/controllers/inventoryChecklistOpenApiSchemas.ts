import { objectSchema } from "./inventoryOpenApiSchemaParts.js";

const checklistStatuses = [
  "failed",
  "in_progress",
  "passed",
  "pending",
  "waived",
] as const;

const checklistItemStatuses = [
  "failed",
  "passed",
  "pending",
  "waived",
] as const;

export const inventoryChecklistSchemas = {
  CreateVehicleChecklistRequest: objectSchema(["items", "name"], {
    items: {
      type: "array",
      minItems: 1,
      items: { $ref: "#/components/schemas/VehicleChecklistItemInput" },
    },
    name: { type: "string", minLength: 1, maxLength: 120 },
    status: { $ref: "#/components/schemas/VehicleChecklistStatus" },
  }),
  UpdateVehicleChecklistRequest: objectSchema([], {
    items: {
      type: "array",
      minItems: 1,
      items: { $ref: "#/components/schemas/VehicleChecklistItemInput" },
    },
    name: { type: "string", minLength: 1, maxLength: 120 },
    status: { $ref: "#/components/schemas/VehicleChecklistStatus" },
  }),
  VehicleChecklist: objectSchema(["id", "items", "name", "status", "unitId"], {
    completedAt: { type: ["string", "null"], format: "date-time" },
    completedByUserId: { type: ["string", "null"] },
    createdAt: { type: "string", format: "date-time" },
    id: { type: "string" },
    items: {
      type: "array",
      items: { $ref: "#/components/schemas/VehicleChecklistItem" },
    },
    name: { type: "string" },
    status: { $ref: "#/components/schemas/VehicleChecklistStatus" },
    unitId: { type: "string" },
    updatedAt: { type: "string", format: "date-time" },
  }),
  VehicleChecklistItem: objectSchema(["id", "label", "notes", "status"], {
    id: { type: "string" },
    label: { type: "string" },
    notes: { type: ["string", "null"] },
    status: { $ref: "#/components/schemas/VehicleChecklistItemStatus" },
  }),
  VehicleChecklistItemInput: objectSchema(["label"], {
    id: { type: "string", minLength: 1 },
    label: { type: "string", minLength: 1, maxLength: 160 },
    notes: { type: ["string", "null"], minLength: 1, maxLength: 500 },
    status: {
      $ref: "#/components/schemas/VehicleChecklistItemStatus",
      default: "pending",
    },
  }),
  VehicleChecklistItemStatus: {
    type: "string",
    enum: checklistItemStatuses,
  },
  VehicleChecklistList: objectSchema(["checklists"], {
    checklists: {
      type: "array",
      items: { $ref: "#/components/schemas/VehicleChecklist" },
    },
  }),
  VehicleChecklistStatus: {
    type: "string",
    enum: checklistStatuses,
  },
} as const;
